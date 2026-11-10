// Reads and writes Strato data in Supabase.
import { supabase } from './supabase';
import { loadQuotes } from './quotes';
import { buildFinanceData, SheetRowsById } from '../utils/sheetParser';
import { getCardInvoicePaymentKey } from '../utils/subscriptions';
import type { Transaction } from '../types';

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

async function selectAll<T = any>(table: string, order: string[] = ['sort_order', 'created_at']): Promise<T[]> {
  let query = supabase.from(table).select('*');
  for (const column of order) query = query.order(column, { ascending: true });
  const { data, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data || []) as T[];
}

/**
 * Loads everything from Supabase and shapes it exactly like the old Google Sheets
 * tabs, so the existing business rules (card invoice dates, projections...) apply unchanged.
 */
export async function loadFinanceData() {
  const [transactions, cards, subscriptions, accounts, snapshots, debtors, investments, invoicePayments, exchanges, quotes] = await Promise.all([
    selectAll('transactions'),
    selectAll('cards'),
    selectAll('subscriptions'),
    selectAll('balance_accounts'),
    selectAll('balance_snapshots', ['recorded_on']),
    selectAll('debtor_entries'),
    selectAll('investments'),
    selectAll('card_invoice_payments', ['paid_at']),
    selectAll('currency_exchanges', ['date']),
    loadQuotes(),
  ]);

  const rows: SheetRowsById = {};

  // Extrato: Data | Valor | Descrição | Conta | Tipo | Vencimento | Categoria | id | Natureza
  rows['sheet-extrato'] = [
    ['Data', 'Valor', 'Descrição', 'Conta', 'Tipo', 'Vencimento', 'Categoria', 'id', 'Natureza'],
    ...transactions.map((t) => [str(t.date), str(t.amount), str(t.description), str(t.account), str(t.payment_method), str(t.due_date), str(t.category), str(t.id), str(t.kind)]),
  ];

  // Cartões: Cartão | Fecha | Vence | Limite | id
  rows['sheet-cartoes'] = [
    ['Cartão', 'Fecha', 'Vence', 'Limite', 'id'],
    ...cards.map((c) => [str(c.name), str(c.closing_day), str(c.due_day), str(c.credit_limit), str(c.id)]),
  ];

  // Assinaturas: Status | Valor | Descrição | Cartão | Data de cobrança | id | Valor pessoal
  rows['sheet-assinaturas'] = [
    ['Status', 'Valor', 'Descrição', 'Cartão', 'Data de cobrança', 'id', 'Valor pessoal'],
    ...subscriptions.map((s) => [s.active ? 'Ativa' : 'Pausada', str(s.monthly_price), str(s.service_name), str(s.payment_method), s.renewal_day ? `dia ${s.renewal_day}` : '', str(s.id), str(s.personal_monthly_price)]),
  ];

  // Saldos: Data | Mês | <one column per account>
  const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const byDate = new Map<string, Map<string, number | null>>();
  for (const s of snapshots) {
    if (!byDate.has(s.recorded_on)) byDate.set(s.recorded_on, new Map());
    byDate.get(s.recorded_on)!.set(s.account_id, s.amount === null ? null : Number(s.amount));
  }
  rows['sheet-totais'] = [
    ['Data', 'Mês', ...accounts.map((a) => str(a.name))],
    ...[...byDate.keys()].sort().map((iso) => {
      const [y, m, d] = iso.split('-');
      const values = byDate.get(iso)!;
      return [`${d}/${m}/${y}`, monthNames[parseInt(m, 10) - 1], ...accounts.map((a) => str(values.get(a.id)))];
    }),
  ];

  // Devedores: Devedor | Descrição | valor | pagou / pegou | ... | id (col 7)
  rows['sheet-devedores'] = [
    ['Devedor', 'Descrição', 'valor', 'pagou / pegou', '', '', '', 'id'],
    ...debtors.map((d) => [str(d.borrower_name), str(d.description), str(d.amount), d.movement === 'pagou' ? 'Pagou' : 'Pegou', '', '', '', str(d.id)]),
  ];

  // Investimentos: TICKER | NAME | CLASSE | qtd | preço médio | preço atual | variação | % | aplicado | atual | (K1) | id
  rows['sheet-investimentos'] = [
    ['TICKER', 'NAME', 'CLASSE', '', '', '', '', '', '', '', quotes.usdRate ? String(quotes.usdRate) : '', 'id'],
    ...investments.map((i) => {
      const shares = Number(i.shares) || 0;
      const avg = Number(i.average_price_usd) || 0;
      const price = quotes.prices[String(i.ticker).toUpperCase()] ?? avg;
      const pct = avg > 0 ? ((price - avg) / avg) * 100 : 0;
      return [str(i.ticker), str(i.name), str(i.asset_class), String(shares), String(avg), String(price), String(price - avg), `${pct}%`, String(shares * avg), String(shares * price), '', str(i.id)];
    }),
  ];

  const data: any = buildFinanceData(rows, {
    usdRate: quotes.usdRate ?? undefined,
    sourceMessage: 'Sincronizado com o banco de dados (Supabase)',
  });
  applySharedSubscriptionShares(data);
  const autoPayIds = new Set(cards.filter((c) => c.auto_pay).map((c) => String(c.id)));
  data.cards = (data.cards || []).map((card: any) => ({ ...card, autoPay: autoPayIds.has(String(card.id)) }));
  data.balanceAccounts = accounts.map((a: any) => ({ id: String(a.id), name: str(a.name), archived: Boolean(a.archived) }));
  data.investmentPositions = investments.map((i: any) => ({ id: String(i.id), ticker: str(i.ticker), shares: Number(i.shares) || 0, averagePriceUsd: Number(i.average_price_usd) || 0 }));
  data.exchanges = exchanges.map((e: any) => ({
    id: String(e.id),
    date: String(e.date),
    brlAmount: Number(e.brl_amount) || 0,
    usdAmount: Number(e.usd_amount) || 0,
    feesBrl: Number(e.fees_brl) || 0,
    rate: e.rate === null ? null : Number(e.rate),
    provider: str(e.provider),
  }));
  data.cardInvoicePayments = Object.fromEntries(
    invoicePayments.map((p: any) => [getCardInvoicePaymentKey(p.card_name, p.month), true])
  );
  return data;
}

export async function setCardInvoicePaid(cardName: string, month: string, paid: boolean) {
  const { error } = paid
    ? await supabase.from('card_invoice_payments').upsert({ card_name: cardName, month }, { onConflict: 'user_id,card_name,month' })
    : await supabase.from('card_invoice_payments').delete().eq('card_name', cardName).eq('month', month);
  if (error) throw new Error(`Não foi possível salvar o pagamento da fatura: ${error.message}`);
}

const normalizeText = (value: string) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Shared subscriptions (e.g. Meli+ split with family) are charged at the full price,
 * but only the user's share is a real cost: the others pay back their part, which is
 * kept as 'reembolso' (control only). So the full charge counts as the user's share
 * everywhere in the app. Card invoices are computed before this and keep the full value.
 */
function applySharedSubscriptionShares(data: any) {
  const shared = (data.subscriptions || []).filter(
    (sub: any) => sub.personalMonthlyPrice !== undefined && sub.personalMonthlyPrice < sub.monthlyPrice
  );
  if (!shared.length) return;
  const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  data.transactions = (data.transactions || []).map((tx: any) => {
    if (tx.type !== 'expense') return tx;
    const description = normalizeText(tx.description);
    const sub = shared.find(
      (item: any) => description.includes(normalizeText(item.serviceName)) && Math.abs(tx.amount - item.monthlyPrice) <= 0.02
    );
    if (!sub) return tx;
    return {
      ...tx,
      amount: sub.personalMonthlyPrice,
      fullAmount: tx.amount,
      description: `${tx.description} (sua parte de ${brl(tx.amount)})`,
    };
  });
}

export async function insertTransaction(tx: Omit<Transaction, 'id'>) {
  const signed = tx.type === 'income' || tx.type === 'reembolso' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
  const { error } = await supabase.from('transactions').insert({
    date: tx.date,
    amount: signed,
    description: tx.description,
    account: tx.account || '',
    payment_method: tx.paymentMethod || '',
    due_date: tx.invoiceDueDateStr || null,
    category: tx.category || null,
    kind: tx.type === 'reembolso' ? 'reembolso' : tx.type === 'investment' ? 'aporte' : 'normal',
    sort_order: Math.floor(Date.now() / 1000),
  });
  if (error) throw new Error(`Não foi possível salvar o lançamento: ${error.message}`);
}

export interface SubscriptionInput {
  serviceName: string;
  monthlyPrice: number;
  paymentMethod: string;
  renewalDay: number | null;
  personalMonthlyPrice?: number | null;
}

const subscriptionRow = (sub: SubscriptionInput) => ({
  service_name: sub.serviceName,
  monthly_price: sub.monthlyPrice,
  payment_method: sub.paymentMethod,
  renewal_day: sub.renewalDay,
  personal_monthly_price: sub.personalMonthlyPrice ?? null,
});

export async function insertSubscription(sub: SubscriptionInput) {
  const { error } = await supabase.from('subscriptions').insert({ ...subscriptionRow(sub), active: true, sort_order: Math.floor(Date.now() / 1000) });
  if (error) throw new Error(`Não foi possível salvar a cobrança: ${error.message}`);
}

export async function updateSubscription(id: string, sub: SubscriptionInput) {
  const { error } = await supabase.from('subscriptions').update(subscriptionRow(sub)).eq('id', id);
  if (error) throw new Error(`Não foi possível atualizar a assinatura: ${error.message}`);
}

export async function deleteSubscription(id: string) {
  const { error } = await supabase.from('subscriptions').delete().eq('id', id);
  if (error) throw new Error(`Não foi possível excluir a assinatura: ${error.message}`);
}

export async function setSubscriptionActive(id: string, active: boolean) {
  const { error } = await supabase.from('subscriptions').update({ active }).eq('id', id);
  if (error) throw new Error(`Não foi possível atualizar a assinatura: ${error.message}`);
}

export async function setCardLimit(id: string, limit: number) {
  const { error } = await supabase.from('cards').update({ credit_limit: limit }).eq('id', id);
  if (error) throw new Error(`Não foi possível atualizar o limite: ${error.message}`);
}

const nextOrder = () => Math.floor(Date.now() / 1000);

export async function insertExchange(e: { date: string; brlAmount: number; usdAmount: number; feesBrl: number; provider: string }) {
  const { error } = await supabase.from('currency_exchanges').insert({
    date: e.date,
    brl_amount: e.brlAmount,
    brl_after_spread: e.brlAmount - e.feesBrl,
    usd_amount: e.usdAmount,
    fees_brl: e.feesBrl,
    rate: e.usdAmount > 0 ? (e.brlAmount - e.feesBrl) / e.usdAmount : null,
    provider: e.provider,
  });
  if (error) throw new Error(`Não foi possível salvar o câmbio: ${error.message}`);
}

/** Compra de ações: soma à posição existente (preço médio ponderado) ou cria uma nova. */
export async function addStockPurchase(p: { ticker: string; name: string; assetClass: string; shares: number; priceUsd: number }) {
  const ticker = p.ticker.trim().toUpperCase();
  const { data: existing, error: readError } = await supabase.from('investments').select('*').eq('ticker', ticker).maybeSingle();
  if (readError) throw new Error(`Não foi possível ler a carteira: ${readError.message}`);
  if (existing) {
    const oldShares = Number(existing.shares) || 0;
    const oldAvg = Number(existing.average_price_usd) || 0;
    const shares = oldShares + p.shares;
    const avg = shares > 0 ? (oldShares * oldAvg + p.shares * p.priceUsd) / shares : p.priceUsd;
    const { error } = await supabase.from('investments').update({ shares, average_price_usd: Number(avg.toFixed(4)) }).eq('id', existing.id);
    if (error) throw new Error(`Não foi possível atualizar a posição: ${error.message}`);
  } else {
    const { error } = await supabase.from('investments').insert({
      ticker, name: p.name || ticker, asset_class: p.assetClass, shares: p.shares, average_price_usd: p.priceUsd, sort_order: nextOrder(),
    });
    if (error) throw new Error(`Não foi possível salvar a compra: ${error.message}`);
  }
}

export async function insertDebtorEntry(d: { borrowerName: string; description: string; amount: number; movement: 'pegou' | 'pagou' }) {
  const { error } = await supabase.from('debtor_entries').insert({
    borrower_name: d.borrowerName, description: d.description, amount: d.amount, movement: d.movement, sort_order: nextOrder(),
  });
  if (error) throw new Error(`Não foi possível salvar o registro: ${error.message}`);
}

export async function insertCard(c: { name: string; closingDay: number; dueDay: number; limit: number }) {
  const { error } = await supabase.from('cards').insert({
    name: c.name, closing_day: c.closingDay, due_day: c.dueDay, credit_limit: c.limit, sort_order: nextOrder(),
  });
  if (error) throw new Error(`Não foi possível salvar o cartão: ${error.message}`);
}

/** Saldos das contas num dia (cria ou atualiza). values: id da conta -> valor (null = vazio). */
export async function saveBalanceSnapshot(date: string, values: Record<string, number | null>, previousDate?: string) {
  if (previousDate && previousDate !== date) {
    const { error } = await supabase.from('balance_snapshots').delete().eq('recorded_on', previousDate);
    if (error) throw new Error(`Não foi possível mover a data: ${error.message}`);
  }
  const rows = Object.entries(values).map(([accountId, amount]) => ({ account_id: accountId, recorded_on: date, amount }));
  const { error } = await supabase.from('balance_snapshots').upsert(rows, { onConflict: 'account_id,recorded_on' });
  if (error) throw new Error(`Não foi possível salvar os saldos: ${error.message}`);
}

export async function createBalanceAccount(name: string) {
  const { error } = await supabase.from('balance_accounts').insert({ name, sort_order: nextOrder() });
  if (error) throw new Error(`Não foi possível criar a conta: ${error.message}`);
}

export async function updateBalanceAccount(id: string, changes: { name?: string; archived?: boolean }) {
  const { error } = await supabase.from('balance_accounts').update(changes).eq('id', id);
  if (error) throw new Error(`Não foi possível atualizar a conta: ${error.message}`);
}

/** Apaga a conta e todo o histórico de saldos dela. */
export async function deleteBalanceAccount(id: string) {
  const { error } = await supabase.from('balance_accounts').delete().eq('id', id);
  if (error) throw new Error(`Não foi possível excluir a conta: ${error.message}`);
}
