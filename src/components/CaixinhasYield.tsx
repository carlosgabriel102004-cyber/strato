import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useCdi } from '../lib/useCdi';
import { BANK_LABEL, BANK_NOTE, Bank, CdiData, YieldAccount, computeYield } from '../lib/cdiYield';

interface Props {
  accounts: YieldAccount[];
  onEditAccount?: (id: string) => void;
}

const isoToBr = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const pctText = (v: number, digits = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Quanto cada caixinha rende hoje e no mês, com o CDI oficial do Banco Central. */
export const CaixinhasYield: React.FC<Props> = ({ accounts, onEditAccount }) => {
  const { cdi, error } = useCdi();

  const today = new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local
  const rows = useMemo(
    () => (cdi && cdi.daily.length ? accounts.filter((a) => a.pct > 0 && a.balance > 0).map((a) => computeYield(a, cdi, today)) : []),
    [cdi, accounts, today]
  );
  const total = rows.reduce(
    (t, r) => ({ todayGross: t.todayGross + r.todayGross, todayNet: t.todayNet + r.todayNet, monthGross: t.monthGross + r.monthGross, monthNet: t.monthNet + r.monthNet }),
    { todayGross: 0, todayNet: 0, monthGross: 0, monthNet: 0 }
  );
  const last = cdi?.daily[cdi.daily.length - 1];
  const banks: Bank[] = Array.from(new Set<Bank>(rows.map((r) => r.bank))).filter((b) => BANK_NOTE[b]);
  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <section className="rounded-2xl border border-[#11310C]/10 bg-white/55 overflow-hidden">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-5 pt-5 pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-[#11310C]">
            Rendimento das <span className="font-serif italic font-bold text-xl">caixinhas</span>
          </h3>
          <p className="text-xs text-[#11310C]/70 mt-0.5">
            {last
              ? <>CDI de {pctText(cdi!.annual)}% ao ano ({pctText(last.rate, 4)}% por dia útil) · Banco Central, {isoToBr(last.date)}</>
              : error ? `Não foi possível ler o CDI do Banco Central (${error}).` : 'Buscando o CDI do Banco Central…'}
          </p>
        </div>
      </header>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[#11310C]/10 divide-x divide-[#11310C]/10">
            {[
              { label: 'Hoje, bruto', value: total.todayGross },
              { label: 'Hoje, se sacar', value: total.todayNet },
              { label: `Em ${monthName}, bruto`, value: total.monthGross },
              { label: `Em ${monthName}, se sacar`, value: total.monthNet },
            ].map((m) => (
              <div key={m.label} className="px-5 py-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#11310C]/70">{m.label}</div>
                <div className="font-serif text-2xl font-semibold tracking-tight text-[#11310C] mt-1">{formatCurrency(m.value)}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] min-w-[720px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-[#11310C]/70">
                  <th className="font-medium px-5 py-2.5">Caixinha</th>
                  <th className="font-medium px-3 py-2.5 text-right">Saldo estimado</th>
                  <th className="font-medium px-3 py-2.5 text-right">Hoje</th>
                  <th className="font-medium px-3 py-2.5 text-right">No mês</th>
                  <th className="font-medium px-5 py-2.5">Impostos se sacar hoje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#11310C]/8">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-5 py-3">
                      <div className="font-medium text-[#11310C]">{r.name.replace(/\s*\([^)]*\)\s*$/, '')}</div>
                      <div className="text-[11px] text-[#11310C]/70">{[BANK_LABEL[r.bank], `${pctText(r.pct, 0)}% do CDI`].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <div className="text-[#11310C]">{formatCurrency(r.balanceEstimate)}</div>
                      <div className="text-[11px] text-[#11310C]/70">desde o lançamento de {isoToBr(r.balanceDate)}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <div className="font-semibold text-[#11310C]">{formatCurrency(r.todayGross)}</div>
                      <div className="text-[11px] text-[#11310C]/70">{formatCurrency(r.todayNet)} se sacar</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <div className="font-semibold text-[#11310C]">{formatCurrency(r.monthGross)}</div>
                      <div className="text-[11px] text-[#11310C]/70">{formatCurrency(r.monthNet)} se sacar</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#11310C]/10 text-[#11310C]">
                          IR {pctText(r.irRate * 100, 1)}%
                        </span>
                        {r.iofProvision > 0.005 && r.iofEndsOn && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEF3C7] text-[#78350F]">
                            IOF {formatCurrency(r.iofProvision)} até {isoToBr(r.iofEndsOn)}
                          </span>
                        )}
                      </div>
                      {!r.irKnown && (
                        <button
                          type="button"
                          onClick={() => onEditAccount?.(r.id)}
                          className="mt-1 text-[11px] text-[#11310C]/70 underline underline-offset-2 hover:text-[#11310C] cursor-pointer"
                        >
                          Informe desde quando o dinheiro está aplicado
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
              Rende sobre o valor bruto, só em dia útil. O IR só é cobrado no saque (22,5% até 6 meses, 20% até 1 ano, 17,5% até 2 anos, 15% depois). O IOF só existe se sacar nos primeiros 30 dias de cada depósito.
            </p>
            {banks.map((b) => <p key={b} className="pl-5">{BANK_NOTE[b]}</p>)}
          </footer>
        </>
      )}
    </section>
  );
};
