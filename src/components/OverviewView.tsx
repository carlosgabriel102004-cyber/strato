// Visão geral — responde: "quanto sobrou este mês, e quanto disso ainda vai sair?"
// Referências: gráfico de cascata (ponte) renda → sobra; DRE gerencial com análise
// horizontal (meses lado a lado + variação); IBCS (vermelho/verde só para variação).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { CreditCardSheet, CurrencyExchange, MonthSummaryData, Subscription, Transaction } from '../types';
import { getTransactionAllocatedMonthLabel } from '../utils/sheetParser';
import { getCardInvoicePaymentKey } from '../utils/subscriptions';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const monthKey = (label: string) => {
  const [name, year] = label.split(' ');
  return Number(year) * 12 + MONTHS.findIndex((m) => m.toLowerCase() === (name || '').toLowerCase());
};
const keyToLabel = (key: number) => `${MONTHS[key % 12]} ${Math.floor(key / 12)}`;
const short = (label: string) => label.slice(0, 3);

const brl = (v: number, digits = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const money = (v: number) => `R$ ${brl(v)}`;
const compact = (v: number) => (Math.abs(v) >= 10000 ? `R$ ${brl(v / 1000, 1)} mil` : money(v));
const pct = (v: number, digits = 0) => `${v >= 0 ? '+' : '−'}${brl(Math.abs(v), digits)}%`;
const dateBR = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
const isoToDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

interface Props {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  transactions: Transaction[];
  creditCards: CreditCardSheet[];
  subscriptions: Subscription[];
  cardInvoicePayments: Record<string, boolean>;
  allMonthsData: Record<string, MonthSummaryData>;
  investments: { currentValue: number; usdCurrent?: number }[];
  exchanges: CurrencyExchange[];
  usdRate: number;
}

interface Drawer { title: string; subtitle: string; total: number; items: Transaction[] }

export const OverviewView: React.FC<Props> = ({
  selectedMonth, onSelectMonth, transactions, creditCards, subscriptions, cardInvoicePayments, allMonthsData, investments, exchanges, usdRate,
}) => {
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const dreScroll = useRef<HTMLDivElement>(null);
  // no celular a tabela abre já mostrando o mês selecionado (última coluna)
  useEffect(() => { if (dreScroll.current) dreScroll.current.scrollLeft = dreScroll.current.scrollWidth; }, [selectedMonth]);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const selKey = monthKey(selectedMonth);

  // Lançamentos por mês de competência (cartão entra no mês do vencimento da fatura)
  const byMonth = useMemo(() => {
    const map = new Map<number, Transaction[]>();
    transactions.forEach((tx) => {
      const k = monthKey(getTransactionAllocatedMonthLabel(tx));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(tx);
    });
    return map;
  }, [transactions]);
  const totals = (k: number) => {
    const txs = byMonth.get(k) || [];
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, leftover: income - expense, txs };
  };

  const cur = totals(selKey);
  const prev = totals(selKey - 1);
  const history = Array.from({ length: 7 }, (_, i) => selKey - 6 + i).map((k) => ({ key: k, ...totals(k) }));
  const previousWithIncome = history.slice(0, -1).filter((h) => h.income > 0);
  const avgLeftover = previousWithIncome.length ? previousWithIncome.reduce((s, h) => s + h.leftover, 0) / previousWithIncome.length : 0;
  const leftoverDelta = cur.leftover - prev.leftover;

  // Cascata: renda → grupos de gasto → sobra
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    cur.txs.filter((t) => t.type === 'expense').forEach((t) => {
      const name = t.isCreditCard && t.cardName ? t.cardName.replace(/^Cart[aã]o\s+/i, '') : 'PIX e contas';
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(t);
    });
    const list = [...map.entries()].map(([name, items]) => ({ name, items, value: items.reduce((s, t) => s + t.amount, 0) }));
    list.sort((a, b) => b.value - a.value);
    if (list.length > 5) {
      const rest = list.splice(4);
      list.push({ name: 'Outros', items: rest.flatMap((g) => g.items), value: rest.reduce((s, g) => s + g.value, 0) });
    }
    return list;
  }, [cur.txs]);

  // A pagar: faturas e contas fixas (PIX) até 30 dias à frente
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const limit = new Date(todayMid.getTime() + 31 * 86400000);
  const nowKey = today.getFullYear() * 12 + today.getMonth();
  const payables = useMemo(() => {
    const items: { name: string; sub: string; due: Date; amount: number; paid: boolean; auto?: boolean; txs?: Transaction[] }[] = [];
    creditCards.forEach((card) => {
      [0, 1].forEach((offset) => {
        const k = nowKey + offset;
        const txs = (byMonth.get(k) || []).filter((t) => t.type === 'expense' && t.cardName === card.name);
        // a fatura mostra o valor cobrado pelo banco (cheio), não a "sua parte"
        const amount = txs.reduce((s, t) => s + ((t as any).fullAmount ?? t.amount), 0);
        if (amount <= 0) return;
        const due = new Date(Math.floor(k / 12), k % 12, card.dueDay);
        if (due > limit) return;
        const paid = Boolean(cardInvoicePayments[getCardInvoicePaymentKey(card.name, keyToLabel(k))]) || Boolean(card.autoPay && due <= todayMid);
        if (offset === 1 && paid) return;
        items.push({ name: `Fatura ${card.name.replace(/^Cart[aã]o\s+/i, '')}`, sub: `${card.autoPay ? 'débito automático · ' : ''}${txs.length} ${txs.length === 1 ? 'lançamento' : 'lançamentos'}`, due, amount, paid, auto: card.autoPay, txs });
      });
    });
    subscriptions.filter((s) => (s.status === 'ativa' || s.active) && s.renewalDay && !/cart[aã]o|cr[eé]dito/i.test(s.paymentCard || '')).forEach((s) => {
      [0, 1].forEach((offset) => {
        const k = nowKey + offset;
        const due = new Date(Math.floor(k / 12), k % 12, s.renewalDay);
        if (due > limit) return;
        const name = norm(s.serviceName);
        const prefix = `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
        const paidTx = transactions.find((t) => t.type === 'expense' && (t.purchaseDate || t.date || '').startsWith(prefix) && norm(t.description).split(/[^a-z0-9+]+/).includes(name));
        if (offset === 1 && !paidTx) {
          items.push({ name: s.serviceName, sub: 'conta fixa', due, amount: s.monthlyPrice, paid: false });
        } else if (offset === 0) {
          items.push({ name: s.serviceName, sub: paidTx ? 'paga' : 'conta fixa', due, amount: paidTx ? paidTx.amount : s.monthlyPrice, paid: Boolean(paidTx), txs: paidTx ? [paidTx] : undefined });
        }
      });
    });
    const open = items.filter((i) => !i.paid).sort((a, b) => a.due.getTime() - b.due.getTime());
    const done = items.filter((i) => i.paid).sort((a, b) => a.due.getTime() - b.due.getTime());
    return { open, done };
  }, [creditCards, subscriptions, byMonth, cardInvoicePayments, transactions]);
  const stillToPayThisMonth = payables.open.filter((p) => p.due.getFullYear() * 12 + p.due.getMonth() === selKey);

  // Patrimônio: último saldo lançado das contas + carteira de investimentos
  const snapshots = useMemo(() => {
    const first = (Object.values(allMonthsData) as MonthSummaryData[]).find((m) => Array.isArray((m as any).accountDetailsRows)) as any;
    return ((first?.accountDetailsRows as any[]) || []).filter((r) => !r.isProjected);
  }, [allMonthsData]);
  const lastSnap = snapshots[snapshots.length - 1];
  const prevSnap = snapshots[snapshots.length - 2];
  const invested = investments.reduce((s, i) => s + (i.currentValue || 0), 0);
  const usdTotal = investments.reduce((s, i) => s + (i.usdCurrent || 0), 0);
  const avgRate = (() => {
    const b = exchanges.reduce((s, e) => s + e.brlAmount, 0);
    const u = exchanges.reduce((s, e) => s + e.usdAmount, 0);
    return u > 0 ? b / u : 0;
  })();
  const accounts = lastSnap?.total || 0;
  const worth = accounts + invested;
  const accDelta = lastSnap && prevSnap ? lastSnap.total - prevSnap.total : 0;

  const open = (title: string, subtitle: string, items: Transaction[]) =>
    setDrawer({ title, subtitle, items: [...items].sort((a, b) => (b.purchaseDate || b.date).localeCompare(a.purchaseDate || a.date)), total: items.reduce((s, t) => s + t.amount, 0) });

  // ---------- Cascata (SVG desenhado à mão) ----------
  const steps = [
    { label: 'Renda', value: cur.income, kind: 'start' as const, items: cur.txs.filter((t) => t.type === 'income') },
    ...groups.map((g) => ({ label: g.name, value: -g.value, kind: 'step' as const, items: g.items })),
    { label: 'Sobra', value: cur.leftover, kind: 'end' as const, items: [] as Transaction[] },
  ];
  const W = 640, H = 250, padTop = 24, padBottom = 40;
  const max = Math.max(cur.income, cur.expense, 1);
  const y = (v: number) => padTop + (H - padTop - padBottom) * (1 - Math.max(0, v) / max);
  const colW = W / steps.length, barW = colW * 0.52;
  let running = 0;
  const bars = steps.map((s) => {
    let from = 0, to = 0;
    if (s.kind === 'start') { to = s.value; running = s.value; }
    else if (s.kind === 'end') { to = running; }
    else { from = running + s.value; to = running; running += s.value; }
    return { ...s, from, to, level: running };
  });

  const [unit, cents] = brl(cur.leftover).split(',');

  return (
    <div className="st">
      <div className="st-ov">
        {/* 1. Protagonista */}
        <section className="st-hero">
          <div className="label">Sobra de {selectedMonth.split(' ')[0].toLowerCase()}</div>
          <div className={`big ${cur.leftover < 0 ? 'down' : ''}`}>{cur.leftover < 0 ? '−' : ''}R$ {unit.replace('-', '')}<small>,{cents}</small></div>
          <dl className="st-ctx">
            <dt>Renda</dt><dd><button onClick={() => open('Renda', selectedMonth, cur.txs.filter((t) => t.type === 'income'))}>{money(cur.income)}</button></dd>
            <dt>Gastos (sua parte)</dt><dd><button onClick={() => open('Gastos', selectedMonth, cur.txs.filter((t) => t.type === 'expense'))}>− {money(cur.expense)}</button></dd>
          </dl>
          <dl className="st-ctx">
            <dt>vs. {short(keyToLabel(selKey - 1)).toLowerCase()} ({money(prev.leftover)})</dt>
            <dd className={leftoverDelta >= 0 ? 'up' : 'down'}>{leftoverDelta >= 0 ? '▲' : '▼'} {money(Math.abs(leftoverDelta))}{prev.leftover > 0 ? ` · ${pct((leftoverDelta / prev.leftover) * 100)}` : ''}</dd>
            <dt>Parte da renda que sobrou</dt><dd>{cur.income > 0 ? `${brl((cur.leftover / cur.income) * 100, 1)}%` : '—'}</dd>
            <dt>Média dos {previousWithIncome.length} meses anteriores</dt><dd>{money(avgLeftover)}</dd>
          </dl>
          {selKey === nowKey && (
            <div className="st-note">
              <span>Desses gastos, falta pagar</span>
              <span className="mono">{stillToPayThisMonth.length ? `${money(stillToPayThisMonth.reduce((s, p) => s + p.amount, 0))} · ${stillToPayThisMonth.map((p) => p.name.replace('Fatura ', '').replace(/\s*\(.*\)$/, '')).join(', ')}` : 'nada'}</span>
            </div>
          )}
        </section>

        {/* 2. Cascata */}
        <section className="st-wf">
          <h2>Da renda à sobra <span className="label">{selectedMonth.toLowerCase()} · clique numa barra para ver os lançamentos</span></h2>
          {cur.income === 0 && cur.expense === 0 ? (
            <p className="muted">Sem lançamentos neste mês.</p>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={hover ? 'hovering' : ''}>
              <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--st-ink-25)" />
              {bars.map((b, i) => {
                const x = i * colW + (colW - barW) / 2;
                const y1 = y(Math.max(b.from, b.to)), y2 = y(Math.min(b.from, b.to));
                const fill = b.kind === 'start' ? 'var(--st-ink)' : b.kind === 'end' ? (b.to >= 0 ? 'var(--st-accent)' : 'var(--st-neg)') : 'var(--st-ink-35)';
                const valueText = b.kind === 'step' ? `−${brl(-b.value, 0)}` : brl(b.kind === 'end' ? b.to : b.value, 0);
                const next = bars[i + 1];
                return (
                  <g key={b.label} className={`step ${hover?.i === i ? 'active' : ''}`}
                    onMouseEnter={() => setHover({ i, x: ((x + barW) / W) * 100, y: y1 })}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => b.items.length && open(b.label, selectedMonth, b.items)}>
                    <rect x={x} y={y1} width={barW} height={Math.max(1, y2 - y1)} fill={fill} />
                    <text x={x + barW / 2} y={y1 - 6} textAnchor="middle">{valueText}</text>
                    <text className="cat" x={x + barW / 2} y={H - 18} textAnchor="middle">{b.label}</text>
                    {b.kind === 'step' && cur.income > 0 && (
                      <text className="pct" x={x + barW / 2} y={H - 4} textAnchor="middle">{brl((-b.value / cur.income) * 100, 1)}% da renda</text>
                    )}
                    {next && (
                      <line x1={x + barW} x2={(i + 1) * colW + (colW - barW) / 2} y1={y(b.level)} y2={y(b.level)} stroke="var(--st-ink-45)" strokeDasharray="2 2" />
                    )}
                  </g>
                );
              })}
            </svg>
          )}
          {hover && bars[hover.i] && (
            <div className="st-tip" style={{ left: `min(${hover.x}%, calc(100% - 220px))`, top: 60 }}>
              <strong>{bars[hover.i].label}</strong>
              {bars[hover.i].kind === 'end' ? (
                <>
                  <div><span>Renda</span><span>{money(cur.income)}</span></div>
                  <div><span>Gastos</span><span>− {money(cur.expense)}</span></div>
                  <div><span>Sobra</span><span>{money(cur.leftover)}</span></div>
                </>
              ) : (
                <>
                  <div><span>Total</span><span>{money(Math.abs(bars[hover.i].value))}</span></div>
                  <div><span>Lançamentos</span><span>{bars[hover.i].items.length}</span></div>
                  {[...bars[hover.i].items].sort((a, b) => b.amount - a.amount).slice(0, 3).map((t) => (
                    <div key={t.id}><span>{t.description.length > 26 ? `${t.description.slice(0, 25)}…` : t.description}</span><span>{brl(t.amount)}</span></div>
                  ))}
                </>
              )}
            </div>
          )}
        </section>

        {/* 3. A pagar */}
        <section>
          <h2>A pagar <span className="label">próximos 30 dias</span></h2>
          <table>
            <thead><tr><th>Conta</th><th>Vence</th><th className="r">Valor</th></tr></thead>
            <tbody>
              {[...payables.open, ...payables.done].map((p) => {
                const days = Math.round((p.due.getTime() - todayMid.getTime()) / 86400000);
                const when = p.paid ? '' : days < 0 ? `atrasada ${-days}d` : days === 0 ? 'hoje' : days === 1 ? 'amanhã' : '';
                return (
                  <tr key={p.name + p.due.toISOString()} className={`${p.paid ? 'done' : ''} ${p.txs?.length ? 'click' : ''}`}
                    onClick={() => p.txs?.length && open(p.name, `vence ${dateBR(p.due)}`, p.txs)}>
                    <td>{p.name}{p.paid ? ' · paga' : ''}{!p.paid && <span className="sub">{p.sub}</span>}</td>
                    <td className="mono nw">{dateBR(p.due)}{when && <span className={`sub ${days <= 1 ? 'down' : ''}`}>{when}</span>}</td>
                    <td className="r">{brl(p.amount)}</td>
                  </tr>
                );
              })}
              {!payables.open.length && !payables.done.length && (
                <tr><td colSpan={3} className="muted">Nada a pagar nos próximos 30 dias.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 4. Mês a mês */}
        <section className="wide st-dre">
          <h2>Mês a mês <span className="label">análise horizontal · clique no mês para abri-lo</span></h2>
          <div className="scroll" ref={dreScroll}>
            <table>
              <thead>
                <tr>
                  <th />
                  {history.map((h) => (
                    <th key={h.key} className={`r ${h.key === selKey ? 'cur' : ''}`}>
                      <button onClick={() => onSelectMonth(keyToLabel(h.key))}>{short(keyToLabel(h.key))}</button>
                    </th>
                  ))}
                  <th className="r">vs. mês anterior</th>
                  <th className="r">tendência</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['Renda', history.map((h) => h.income), true, ''],
                  ['Gastos', history.map((h) => h.expense), false, ''],
                  ['Sobra', history.map((h) => h.leftover), true, 'total'],
                ] as [string, number[], boolean, string][]).map(([label, values, goodUp, cls]) => {
                  const a = values[values.length - 2], b = values[values.length - 1], d = b - a;
                  const good = goodUp ? d >= 0 : d <= 0;
                  return (
                    <tr key={label} className={cls}>
                      <td className="row-label">{label}</td>
                      {values.map((v, i) => <td key={i} className={`r ${history[i].key === selKey ? 'cur' : ''}`}>{brl(v)}</td>)}
                      <td className={`r ${good ? 'up' : 'down'}`}>{d >= 0 ? '▲' : '▼'} {brl(Math.abs(d))}{a ? ` · ${pct((d / Math.abs(a)) * 100)}` : ''}</td>
                      <td className="r"><Spark values={values} /></td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="row-label">% que sobrou</td>
                  {history.map((h) => <td key={h.key} className={`r ${h.key === selKey ? 'cur' : ''}`}>{h.income > 0 ? `${brl((h.leftover / h.income) * 100, 1)}%` : '—'}</td>)}
                  <td /><td />
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Patrimônio */}
        <section className="st-worth">
          <div className="label">Patrimônio{lastSnap ? ` · ${String(lastSnap.date).slice(0, 5)}` : ''}</div>
          <div className="big2">{compact(worth)}</div>
          {prevSnap && (
            <dl className="st-ctx" style={{ borderTop: 0, paddingTop: 0 }}>
              <dt>Contas vs. {String(prevSnap.date).slice(0, 5)}</dt>
              <dd className={accDelta >= 0 ? 'up' : 'down'}>{accDelta >= 0 ? '▲' : '▼'} {money(Math.abs(accDelta))} · {pct((accDelta / prevSnap.total) * 100, 1)}</dd>
            </dl>
          )}
          {worth > 0 && (
            <div className="st-split" title={`Contas ${money(accounts)} · Investimentos ${money(invested)}`}>
              <span style={{ width: `${(accounts / worth) * 100}%`, background: 'var(--st-ink)' }} />
              <span style={{ width: `${(invested / worth) * 100}%`, background: 'var(--st-accent)' }} />
            </div>
          )}
          <table>
            <tbody>
              <tr><td><span className="st-key" style={{ background: 'var(--st-ink)' }} />Contas e cofrinhos</td><td className="r">{brl(accounts)}</td></tr>
              <tr>
                <td><span className="st-key" style={{ background: 'var(--st-accent)' }} />Ações no exterior
                  <span className="sub">${brl(usdTotal, 0)}{avgRate ? ` · dólar médio ${brl(avgRate)}` : ''} · hoje {brl(usdRate)}</span>
                </td>
                <td className="r">{brl(invested, 0)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {drawer && (
        <>
          <div className="st-drawer-bg" onClick={() => setDrawer(null)} />
          <aside className="st st-drawer">
            <header>
              <div>
                <div className="label">{drawer.subtitle} · {drawer.items.length} lançamentos</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{drawer.title}</div>
                <div className="total num">{money(drawer.total)}</div>
              </div>
              <button className="st-icon" onClick={() => setDrawer(null)} aria-label="Fechar"><X size={14} /></button>
            </header>
            <div className="body">
              <table>
                <tbody>
                  {drawer.items.map((t) => (
                    <tr key={t.id}>
                      <td>{t.description}<span className="sub">{(t.purchaseDate || t.date).split('-').reverse().join('/')} · {t.paymentMethod}{t.account ? ` · ${t.account}` : ''}</span></td>
                      <td className="r">{brl(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

const Spark: React.FC<{ values: number[] }> = ({ values }) => {
  const w = 66, h = 18;
  const mx = Math.max(...values), mn = Math.min(...values);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - 2 - ((v - mn) / (mx - mn || 1)) * (h - 4)]);
  const last = pts[pts.length - 1];
  return (
    <svg width={w + 4} height={h} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--st-ink)" strokeWidth={1.2} />
      <circle cx={last[0]} cy={last[1]} r={2} fill="var(--st-ink)" />
    </svg>
  );
};
