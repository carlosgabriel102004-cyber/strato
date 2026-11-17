import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Info } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useCdi } from '../lib/useCdi';
import { BANK_LABEL, BANK_NOTE, Bank, accountMonth, bankOf, brToIsoDate, computeYield, daysBetween, irRateFor, parseMonthLabel } from '../lib/cdiYield';
import { QuickForm, parseMoney } from './QuickForm';
import type { AccountMonthRow } from '../types';
import type { BalanceAccountInfo } from './ResumoView';
import type { BalanceAccountChanges } from '../lib/financeRepository';

interface Props {
  balanceAccounts: BalanceAccountInfo[];
  rows: AccountMonthRow[];
  onUpdateAccount?: (id: string, changes: BalanceAccountChanges) => Promise<void>;
}

// Cores das marcas, para reconhecer de onde vem cada parte.
const BANK_COLOR: Record<Bank, string> = { nubank: '#820AD1', picpay: '#1F9D55', mercadopago: '#009EE3', outro: '#11310C' };
const BANK_ORDER: Bank[] = ['nubank', 'picpay', 'mercadopago', 'outro'];
const bankName = (b: Bank) => BANK_LABEL[b] || 'Outros';
const pctOf = (name: string) => {
  const m = name.match(/\((\d+(?:[.,]\d+)?)%\)\s*$/);
  return m ? Number(m[1].replace(',', '.')) : 0;
};
const baseName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '');
const isoToBr = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const num = (v: number, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const ChartTip = ({ active, payload, label, mode }: any) => {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p: any) => Number(p.value) > 0);
  const total = items.reduce((s: number, p: any) => s + Number(p.value), 0);
  const projected = payload[0]?.payload?.projected;
  return (
    <div className="liquid-glass-tooltip p-3 rounded-2xl text-[#FAFBF6] min-w-[200px] space-y-1">
      <div className="flex justify-between gap-3 border-b border-white/15 pb-1.5">
        <span className="text-xs font-black text-[#C4C240] uppercase tracking-wider">{payload[0]?.payload?.title || label}</span>
        {projected && <span className="text-[10px] font-bold px-1.5 rounded bg-[#C4C240]/20 text-[#C4C240]">previsto</span>}
      </div>
      {items.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-white/80"><span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />{p.dataKey}</span>
          <span className="font-bold">{formatCurrency(Number(p.value))}</span>
        </div>
      ))}
      <div className="flex justify-between gap-3 text-xs pt-1 border-t border-white/10">
        <span className="text-white/80">Total {mode === 'liquido' ? 'se sacar' : 'bruto'}</span>
        <span className="font-extrabold text-[#C4C240]">{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

export const RendimentosView: React.FC<Props> = ({ balanceAccounts, rows, onUpdateAccount }) => {
  const { cdi, error } = useCdi();
  const [mode, setMode] = useState<'bruto' | 'liquido'>('bruto');
  const [editing, setEditing] = useState<BalanceAccountInfo | null>(null);
  const today = new Date().toLocaleDateString('sv-SE');
  const monthKey = today.slice(0, 7);
  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  const realRows = useMemo(() => rows.filter((r) => !r.isProjected && brToIsoDate(r.date)), [rows]);
  const lastRow = realRows[realRows.length - 1];

  const accounts = useMemo(
    () => balanceAccounts.filter((a) => !a.archived && pctOf(a.name) > 0).map((a) => ({
      ...a,
      pct: pctOf(a.name),
      bank: bankOf(a.name),
      ir: a.investedSince ? irRateFor(daysBetween(a.investedSince, today)) : 0.225,
    })),
    [balanceAccounts, today]
  );

  // Situação de hoje, por caixinha
  const now = useMemo(() => {
    if (!cdi || !lastRow) return [];
    return accounts
      .map((a) => {
        const bal = Number(lastRow.balances?.[a.name]) || 0;
        const y = computeYield({ id: a.id, name: a.name, pct: a.pct, balance: bal, balanceDate: brToIsoDate(lastRow.date), investedSince: a.investedSince, lastDepositOn: a.lastDepositOn, lastDepositAmount: a.lastDepositAmount }, cdi, today);
        const month = accountMonth(bal, a.pct, cdi, monthKey, today);
        return { acc: a, bal, y, month };
      })
      .filter((x) => x.bal > 0);
  }, [cdi, lastRow, accounts, today, monthKey]);

  const k = (v: number, ir: number) => (mode === 'liquido' ? v * (1 - ir) : v);
  const total = now.reduce(
    (t, x) => ({
      montante: t.montante + x.y.balanceEstimate,
      daily: t.daily + k(x.y.todayGross, x.acc.ir),
      month: t.month + k(x.month.full, x.acc.ir),
      toDate: t.toDate + k(x.month.toDate, x.acc.ir),
    }),
    { montante: 0, daily: 0, month: 0, toDate: 0 }
  );
  const banksPresent = BANK_ORDER.filter((b) => now.some((x) => x.acc.bank === b));

  // Dia a dia do mês corrente, empilhado por banco
  const dailyData = useMemo(() => {
    const byDate = new Map<string, any>();
    now.forEach((x) => x.month.days.forEach((d) => {
      const row = byDate.get(d.date) || { date: d.date, label: d.date.slice(8, 10), title: `${isoToBr(d.date)} · CDI do dia`, projected: d.projected };
      const key = bankName(x.acc.bank);
      row[key] = (row[key] || 0) + k(d.value, x.acc.ir);
      byDate.set(d.date, row);
    }));
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [now, mode]);

  // Histórico mensal, a partir do saldo lançado em cada mês
  const monthlyData = useMemo(() => {
    if (!cdi) return [];
    const first = cdi.daily[0]?.date.slice(0, 7) || monthKey;
    const out: any[] = [];
    const seen = new Set<string>();
    realRows.forEach((r) => {
      const ym = parseMonthLabel(r.monthLabel);
      if (!ym) return;
      const key = `${ym.y}-${String(ym.m).padStart(2, '0')}`;
      if (key < first || key > monthKey || seen.has(key)) return;
      seen.add(key);
      const row: any = { key, label: `${MONTHS_SHORT[ym.m - 1]}/${String(ym.y).slice(2)}`, title: r.monthLabel, projected: key === monthKey };
      accounts.forEach((a) => {
        const bal = Number(r.balances?.[a.name]) || 0;
        const v = accountMonth(bal, a.pct, cdi, key, today).full;
        if (v > 0) row[bankName(a.bank)] = (row[bankName(a.bank)] || 0) + k(v, a.ir);
      });
      out.push(row);
    });
    if (lastRow && !seen.has(monthKey)) {
      const row: any = { key: monthKey, label: `${MONTHS_SHORT[Number(monthKey.slice(5)) - 1]}/${monthKey.slice(2, 4)}`, title: `${monthName} (previsto)`, projected: true };
      now.forEach((x) => { row[bankName(x.acc.bank)] = (row[bankName(x.acc.bank)] || 0) + k(x.month.full, x.acc.ir); });
      out.push(row);
    }
    return out.slice(-12);
  }, [cdi, realRows, accounts, mode, today, monthKey, now, lastRow]);

  // Montante x rendimento: maior montante primeiro
  const ranking = [...now].sort((a, b) => b.y.balanceEstimate - a.y.balanceEstimate);
  const maxMontante = Math.max(1, ...ranking.map((x) => x.y.balanceEstimate));
  const last = cdi?.daily[cdi.daily.length - 1];

  const kpi = (label: string, value: string, sub?: React.ReactNode, accent = false) => (
    <div className={`p-5 ${accent ? 'bg-[#11310C] text-[#FAFBF6]' : ''}`}>
      <div className={`text-[11px] font-medium uppercase tracking-[0.12em] ${accent ? 'text-[#C4C240]' : 'text-[#11310C]/70'}`}>{label}</div>
      <div className={`font-serif text-3xl sm:text-[34px] font-semibold tracking-tight mt-3 ${accent ? 'text-white' : 'text-[#11310C]'}`}>{value}</div>
      {sub && <div className={`text-[11px] font-medium mt-2 ${accent ? 'text-[#FAFBF6]/80' : 'text-[#11310C]/70'}`}>{sub}</div>}
    </div>
  );

  const legend = (
    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#11310C]">
      {banksPresent.map((b) => (
        <span key={b} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: BANK_COLOR[b] }} />{bankName(b)}</span>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#11310C] tracking-tight">
            Rendimento <span className="italic">CDI</span>
          </h1>
          <p className="text-sm text-[#11310C]/70 mt-1">
            {last
              ? <>CDI de {num(cdi!.annual)}% ao ano · {num(last.rate, 4)}% por dia útil · Banco Central, {isoToBr(last.date)}</>
              : error ? `Não foi possível ler o CDI do Banco Central (${error}).` : 'Buscando o CDI do Banco Central…'}
          </p>
        </div>
        <div className="inline-flex p-1 rounded-lg bg-[#11310C]/6 self-start md:self-auto" role="group" aria-label="Valores">
          {([['bruto', 'Bruto'], ['liquido', 'Se sacar hoje']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
              className={`h-8 px-3 rounded-md text-[12.5px] font-medium cursor-pointer transition-colors ${mode === id ? 'bg-white text-[#11310C] shadow-sm' : 'text-[#11310C]/70 hover:text-[#11310C]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!lastRow && <p className="text-sm text-[#11310C]/70">Lance os saldos das contas no Resumo para ver os rendimentos.</p>}

      {now.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-[#11310C]/10 bg-white/55 overflow-hidden divide-y sm:divide-y-0 lg:divide-x divide-[#11310C]/10">
            {kpi('Montante nas caixinhas', formatCurrency(total.montante), `estimado desde o lançamento de ${isoToBr(brToIsoDate(lastRow!.date))}`)}
            {kpi('Por dia útil', formatCurrency(total.daily), `${formatCurrency(total.daily * 21)} a cada 21 dias úteis`)}
            {kpi(`Previsto em ${monthName}`, formatCurrency(total.month), `${formatCurrency(total.toDate)} já renderam`, true)}
            {kpi('Rende por mês', `${num(total.montante ? (total.month / total.montante) * 100 : 0)}%`, `${formatCurrency(total.montante ? (total.month / total.montante) * 1000 : 0)} a cada R$ 1.000`)}
          </div>

          <section className="rounded-2xl border border-[#11310C]/10 bg-white/55 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-[#11310C]">Dia a dia em <span className="font-serif italic font-bold text-xl">{monthName}</span></h3>
                <p className="text-xs text-[#11310C]/70">Quanto cada dia útil rendeu, por banco. As barras claras são a previsão dos dias que faltam.</p>
              </div>
              {legend}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart data={dailyData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#11310C" strokeOpacity={0.08} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#11310C' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#11310C' }} tickFormatter={(v) => `R$${num(v, 0)}`} />
                  <Tooltip content={<ChartTip mode={mode} />} cursor={{ fill: '#11310C', fillOpacity: 0.05 }} />
                  {banksPresent.map((b, i) => (
                    <Bar key={b} dataKey={bankName(b)} stackId="d" fill={BANK_COLOR[b]} radius={i === banksPresent.length - 1 ? [4, 4, 0, 0] : 0}>
                      {dailyData.map((d) => <Cell key={d.date} fillOpacity={d.projected ? 0.3 : 1} />)}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <section className="lg:col-span-3 rounded-2xl border border-[#11310C]/10 bg-white/55 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold text-[#11310C]">Mês a <span className="font-serif italic font-bold text-xl">mês</span></h3>
                  <p className="text-xs text-[#11310C]/70">Estimado com o saldo lançado em cada mês e o CDI do período.</p>
                </div>
                {legend}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
                  <BarChart data={monthlyData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#11310C" strokeOpacity={0.08} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#11310C' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#11310C' }} tickFormatter={(v) => `R$${num(v, 0)}`} />
                    <Tooltip content={<ChartTip mode={mode} />} cursor={{ fill: '#11310C', fillOpacity: 0.05 }} />
                    {banksPresent.map((b, i) => (
                      <Bar key={b} dataKey={bankName(b)} stackId="m" fill={BANK_COLOR[b]} radius={i === banksPresent.length - 1 ? [4, 4, 0, 0] : 0}>
                        {monthlyData.map((d) => <Cell key={d.key} fillOpacity={d.projected ? 0.55 : 1} />)}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="lg:col-span-2 rounded-2xl border border-[#11310C]/10 bg-white/55 p-5 space-y-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#11310C]">Montante × <span className="font-serif italic font-bold text-xl">rendimento</span></h3>
                <p className="text-xs text-[#11310C]/70">Quanto tem em cada caixinha e quanto ela devolve por mês.</p>
              </div>
              <ul className="space-y-3.5">
                {ranking.map((x) => {
                  const m = k(x.month.full, x.acc.ir);
                  return (
                    <li key={x.acc.id}>
                      <div className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="font-medium text-[#11310C] truncate">{baseName(x.acc.name)}</span>
                        <span className="tabular-nums font-semibold text-[#11310C] shrink-0">{formatCurrency(m)}<span className="text-[11px] font-normal text-[#11310C]/70">/mês</span></span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-[#11310C]/6 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(x.y.balanceEstimate / maxMontante) * 100}%`, background: BANK_COLOR[x.acc.bank] }} />
                      </div>
                      <div className="flex justify-between gap-3 mt-1 text-[11px] text-[#11310C]/70 tabular-nums">
                        <span>{formatCurrency(x.y.balanceEstimate)} · {num(x.acc.pct, 0)}% do CDI</span>
                        <span>{formatCurrency(x.y.balanceEstimate ? (m / x.y.balanceEstimate) * 1000 : 0)} a cada R$ 1.000</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <section className="rounded-2xl border border-[#11310C]/10 bg-white/55 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-lg font-extrabold text-[#11310C]">Por <span className="font-serif italic font-bold text-xl">caixinha</span></h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] min-w-[760px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.1em] text-[#11310C]/70 border-y border-[#11310C]/10">
                    <th className="font-medium px-5 py-2.5">Caixinha</th>
                    <th className="font-medium px-3 py-2.5 text-right">Montante</th>
                    <th className="font-medium px-3 py-2.5 text-right">Hoje</th>
                    <th className="font-medium px-3 py-2.5 text-right">No mês</th>
                    <th className="font-medium px-3 py-2.5 text-right">Ao ano</th>
                    <th className="font-medium px-5 py-2.5">Impostos se sacar hoje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#11310C]/8">
                  {ranking.map((x) => (
                    <tr key={x.acc.id} className="align-top">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 font-medium text-[#11310C]"><span className="w-2 h-2 rounded-full" style={{ background: BANK_COLOR[x.acc.bank] }} />{baseName(x.acc.name)}</div>
                        <div className="text-[11px] text-[#11310C]/70 pl-4">{[BANK_LABEL[x.acc.bank], `${num(x.acc.pct, 0)}% do CDI`].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(x.y.balanceEstimate)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <div className="font-semibold">{formatCurrency(x.y.todayGross)}</div>
                        <div className="text-[11px] text-[#11310C]/70">{formatCurrency(x.y.todayNet)} se sacar</div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <div className="font-semibold">{formatCurrency(x.month.full)}</div>
                        <div className="text-[11px] text-[#11310C]/70">{formatCurrency(x.month.full * (1 - x.acc.ir))} se sacar</div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{last ? `${num((Math.pow(1 + (last.rate / 100) * (x.acc.pct / 100), 252) - 1) * 100)}%` : '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#11310C]/10 text-[#11310C]">IR {num(x.acc.ir * 100, 1)}%</span>
                          {x.y.iofProvision > 0.005 && x.y.iofEndsOn && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEF3C7] text-[#78350F]">IOF {formatCurrency(x.y.iofProvision)} até {isoToBr(x.y.iofEndsOn)}</span>
                          )}
                        </div>
                        {onUpdateAccount && (
                          <button type="button" onClick={() => setEditing(x.acc)} className="mt-1 text-[11px] text-[#11310C]/70 underline underline-offset-2 hover:text-[#11310C] cursor-pointer">
                            {x.acc.investedSince ? 'Editar datas' : 'Informe desde quando está aplicado'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="px-5 py-4 border-t border-[#11310C]/10 space-y-1.5 text-[11px] text-[#11310C]/70">
              <p className="flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                Rende sobre o valor bruto, só em dia útil. O IR só é cobrado no saque (22,5% até 6 meses, 20% até 1 ano, 17,5% até 2 anos, 15% depois). O IOF só existe se sacar nos primeiros 30 dias de cada depósito. O montante parte do último saldo lançado no Resumo.
              </p>
              {banksPresent.filter((b) => BANK_NOTE[b]).map((b) => <p key={b} className="pl-5">{BANK_NOTE[b]}</p>)}
            </footer>
          </section>
        </>
      )}

      <QuickForm
        open={Boolean(editing)}
        title={editing ? `Datas de ${baseName(editing.name)}` : ''}
        subtitle="Usadas para o IR e o IOF de quando você sacar."
        initial={editing ? {
          investedSince: editing.investedSince || '',
          lastDepositOn: editing.lastDepositOn || '',
          lastDepositAmount: editing.lastDepositAmount ? num(editing.lastDepositAmount) : '',
        } : undefined}
        fields={[
          { name: 'investedSince', label: 'Aplicado desde', type: 'date', hint: 'Data do depósito mais antigo. Define a faixa do IR.' },
          { name: 'lastDepositOn', label: 'Último depósito', type: 'date', half: true },
          { name: 'lastDepositAmount', label: 'Valor', type: 'money', half: true, placeholder: '0,00' },
        ]}
        onClose={() => setEditing(null)}
        onSubmit={async (v) => {
          const amount = (v.lastDepositAmount || '').trim();
          await onUpdateAccount!(editing!.id, {
            investedSince: v.investedSince || null,
            lastDepositOn: v.lastDepositOn || null,
            lastDepositAmount: amount ? parseMoney(amount) : null,
          });
        }}
      />
    </div>
  );
};
