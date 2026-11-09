// Reads and writes Strato data in Supabase.
import { supabase } from './supabase';
import { loadQuotes } from './quotes';
import { buildFinanceData, SheetRowsById } from '../utils/sheetParser';
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
  const [transactions, cards, subscriptions, accounts, snapshots, debtors, investments, quotes] = await Promise.all([
    selectAll('transactions'),
    selectAll('cards'),
    selectAll('subscriptions'),
    selectAll('balance_accounts'),
    selectAll('balance_snapshots', ['recorded_on']),
    selectAll('debtor_entries'),
    selectAll('investments'),
    loadQuotes(),
  ]);

  const rows: SheetRowsById = {};

  // Extrato: Data | Valor | Descrição | Conta | Tipo | Vencimento | Categoria | id
  rows['sheet-extrato'] = [
    ['Data', 'Valor', 'Descrição', 'Conta', 'Tipo', 'Vencimento', 'Categoria', 'id'],
    ...transactions.map((t) => [str(t.date), str(t.amount), str(t.description), str(t.account), str(t.payment_method), str(t.due_date), str(t.category), str(t.id)]),
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

  return buildFinanceData(rows, {
    usdRate: quotes.usdRate ?? undefined,
    sourceMessage: 'Sincronizado com o banco de dados (Supabase)',
  });
}

export async function insertTransaction(tx: Omit<Transaction, 'id'>) {
  const signed = tx.type === 'income' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
  const { error } = await supabase.from('transactions').insert({
    date: tx.date,
    amount: signed,
    description: tx.description,
    account: tx.account || '',
    payment_method: tx.paymentMethod || '',
    due_date: tx.invoiceDueDateStr || null,
    category: tx.category || null,
    sort_order: Math.floor(Date.now() / 1000),
  });
  if (error) throw new Error(`Não foi possível salvar o lançamento: ${error.message}`);
}

export async function insertSubscription(sub: { serviceName: string; monthlyPrice: number; paymentMethod: string; renewalDay: number }) {
  const { error } = await supabase.from('subscriptions').insert({
    service_name: sub.serviceName,
    monthly_price: sub.monthlyPrice,
    payment_method: sub.paymentMethod,
    renewal_day: sub.renewalDay,
    active: true,
    sort_order: Math.floor(Date.now() / 1000),
  });
  if (error) throw new Error(`Não foi possível salvar a cobrança: ${error.message}`);
}

export async function setSubscriptionActive(id: string, active: boolean) {
  const { error } = await supabase.from('subscriptions').update({ active }).eq('id', id);
  if (error) throw new Error(`Não foi possível atualizar a assinatura: ${error.message}`);
}

export async function setCardLimit(id: string, limit: number) {
  const { error } = await supabase.from('cards').update({ credit_limit: limit }).eq('id', id);
  if (error) throw new Error(`Não foi possível atualizar o limite: ${error.message}`);
}
