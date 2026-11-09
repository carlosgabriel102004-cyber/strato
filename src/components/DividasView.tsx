import React from 'react';
import {
  Plus,
  Users,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { Debt, Debtor } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DividasViewProps {
  debts: Debt[];
  debtors?: Debtor[];
  onOpenManualModal: () => void;
}

export const DividasView: React.FC<DividasViewProps> = ({
  debts,
  debtors = [],
  onOpenManualModal,
}) => {
  const totalDebtsRemaining = debts.reduce((acc, d) => acc + d.remainingAmount, 0);
  const totalMonthlyDebtPayments = debts.reduce((acc, d) => acc + d.monthlyPayment, 0);

  // Calculate total pegou vs pagou directly from Col B, C, D, E entries
  const totalPegouOverall = debtors.reduce((acc, d) => acc + (d.movement === 'pegou' ? d.transactionAmount : 0), 0);
  const totalPagouOverall = debtors.reduce((acc, d) => acc + (d.movement === 'pagou' ? d.transactionAmount : 0), 0);
  const totalRestanteOverall = Math.max(0, totalPegouOverall - totalPagouOverall);

  // Group debtors by person to show total pegou, total pagou and restante per person
  const debtorGroups = React.useMemo(() => {
    const groups: Record<string, { borrowerName: string; totalPegou: number; totalPagou: number; itemsCount: number }> = {};
    
    debtors.forEach((d) => {
      const name = d.borrowerName || 'Sem Nome';
      if (!groups[name]) {
        groups[name] = { borrowerName: name, totalPegou: 0, totalPagou: 0, itemsCount: 0 };
      }
      groups[name].itemsCount += 1;
      if (d.movement === 'pagou') {
        groups[name].totalPagou += d.transactionAmount;
      } else {
        groups[name].totalPegou += d.transactionAmount;
      }
    });

    return Object.values(groups);
  }, [debtors]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-3xl p-6 border border-white/90">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
            Meus <span className="font-serif italic font-bold text-3xl sm:text-4xl text-[#C4C240]">Devedores</span> & Empréstimos Concedidos
          </h1>
        </div>

      </div>

      {/* Top Cards for Devedores Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Card 1: Total Pegou (Emprestado) */}
        <div className="glass-card rounded-3xl p-5 border border-white/90 bg-gradient-to-br from-white via-white to-amber-50/40">
          <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider block mb-2 flex items-center justify-between">
            <span>Total Emprestado (Pegou)</span>
            <ArrowDownRight className="w-4 h-4 text-amber-700" />
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-900">
            {formatCurrency(totalPegouOverall)}
          </div>
          <p className="text-[11px] text-[#11310C]/60 mt-2 font-medium">
            Soma de todos os empréstimos cedidos
          </p>
        </div>

        {/* Card 2: Total Pagou (Devolvido) */}
        <div className="glass-card rounded-3xl p-5 border border-white/90 bg-gradient-to-br from-white via-white to-emerald-50/50">
          <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider block mb-2 flex items-center justify-between">
            <span>Total Devolvido (Pagou)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-700" />
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-800">
            {formatCurrency(totalPagouOverall)}
          </div>
          <p className="text-[11px] text-[#11310C]/60 mt-2 font-medium">
            Soma dos pagamentos recebidos
          </p>
        </div>

        {/* Card 3: Saldo Restante a Receber */}
        <div className="glass-card rounded-3xl p-5 border border-[#C4C240]/60 bg-gradient-to-br from-white via-white to-[#F7F9E3]/50">
          <span className="text-xs font-bold text-[#11310C] uppercase tracking-wider block mb-2 flex items-center justify-between">
            <span>Falta Receber (Restante)</span>
            <Receipt className="w-4 h-4 text-[#11310C]" />
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
            {formatCurrency(totalRestanteOverall)}
          </div>
          <p className="text-[11px] text-[#11310C]/80 font-bold mt-2">
            Pegou emprestado (-) Pagou
          </p>
        </div>

        {/* Card 4: Dívidas Próprias Passivas */}
        <div className="glass-card rounded-3xl p-5 border border-white/90">
          <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider block mb-2 flex items-center justify-between">
            <span>Minhas Dívidas Próprias</span>
            <ArrowDownRight className="w-4 h-4 text-[#E13513]" />
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#E13513]">
            {formatCurrency(totalDebtsRemaining)}
          </div>
          <p className="text-[11px] text-[#11310C]/60 mt-2 font-medium">
            Parcela Mensal: {formatCurrency(totalMonthlyDebtPayments)}
          </p>
        </div>
      </div>

      {/* Resumo Consolidado por Devedor (Cards por Pessoa) */}
      {debtorGroups.length > 0 && (
        <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#11310C]/10">
            <div>
              <h3 className="text-lg font-extrabold text-[#11310C]">
                Resumo de Contas por <span className="font-serif italic font-bold text-xl text-[#C4C240]">Devedor</span>
              </h3>
            </div>
            <span className="text-xs font-extrabold text-[#11310C] bg-[#11310C]/5 px-2.5 py-1 rounded-full">
              {debtorGroups.length} pessoas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {debtorGroups.map((group) => {
              const restante = Math.max(0, group.totalPegou - group.totalPagou);
              const quitadoPercent = group.totalPegou > 0 ? Math.min(100, Math.round((group.totalPagou / group.totalPegou) * 100)) : 100;

              return (
                <div
                  key={group.borrowerName}
                  className="p-5 rounded-3xl bg-white/90 border border-[#11310C]/15 space-y-3 shadow-xs hover:border-[#C4C240] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#11310C]/10 flex items-center justify-center text-[#11310C]">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-[#11310C]">{group.borrowerName}</h4>
                        <span className="text-[11px] text-[#11310C]/60 font-medium">{group.itemsCount} lançamentos</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      restante <= 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {restante <= 0 ? 'Quitado' : `Falta ${formatCurrency(restante)}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold pt-2 border-t border-[#11310C]/10">
                    <div className="p-2 rounded-2xl bg-amber-50/50 border border-amber-200/50">
                      <span className="text-[10px] text-amber-800 uppercase block">Pegou</span>
                      <span className="text-amber-900 font-extrabold">{formatCurrency(group.totalPegou)}</span>
                    </div>

                    <div className="p-2 rounded-2xl bg-emerald-50/50 border border-emerald-200/50">
                      <span className="text-[10px] text-emerald-700 uppercase block">Pagou</span>
                      <span className="text-emerald-800 font-extrabold">{formatCurrency(group.totalPagou)}</span>
                    </div>

                    <div className="p-2 rounded-2xl bg-[#11310C]/5 border border-[#11310C]/10">
                      <span className="text-[10px] text-[#11310C]/70 uppercase block">Restante</span>
                      <span className="text-[#11310C] font-extrabold">{formatCurrency(restante)}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] font-bold text-[#11310C]/70">
                      <span>Quitação ({quitadoPercent}%)</span>
                      <span>{group.totalPegou > 0 ? `${formatCurrency(group.totalPagou)} / ${formatCurrency(group.totalPegou)}` : '100%'}</span>
                    </div>
                    <div className="w-full bg-[#11310C]/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-700 h-full rounded-full transition-all duration-500"
                        style={{ width: `${quitadoPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela de Lançamentos Individuais (29 Registros) */}
      <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#11310C]/10">
          <div>
            <h3 className="text-lg font-extrabold text-[#11310C]">
              Lançamentos Individuais de <span className="font-serif italic font-bold text-xl text-[#C4C240]">Devedores</span>
            </h3>
          </div>
          <span className="text-xs font-extrabold text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full">
            {debtors.length} registros no total
          </span>
        </div>

        <div className="overflow-x-auto">
          {debtors.length === 0 ? (
            <div className="p-8 text-center space-y-2 rounded-2xl bg-white/60 border border-[#11310C]/10">
              <Users className="w-8 h-8 text-[#11310C]/40 mx-auto" />
              <h4 className="font-extrabold text-sm text-[#11310C]">Planilha de Devedores Vazia ou Indisponível</h4>
              <p className="text-xs text-[#11310C]/60 font-medium max-w-sm mx-auto">
                Não foram encontrados registros na aba de devedores da sua planilha.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#11310C]/10 text-[11px] font-extrabold text-[#11310C]/60 uppercase tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Devedor</th>
                  <th className="py-3 px-3">Descrição</th>
                  <th className="py-3 px-3 text-right">Valor</th>
                  <th className="py-3 px-3 text-center">Movimento / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#11310C]/5 font-semibold text-xs">
                {debtors.map((debtor, idx) => {
                  const isPagou = debtor.movement === 'pagou';

                  return (
                    <tr key={debtor.id || idx} className="hover:bg-white/80 transition-all">
                      <td className="py-3.5 px-3 text-[#11310C]/50 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-[#11310C]">
                        {debtor.borrowerName}
                      </td>
                      <td className="py-3.5 px-3 text-[#11310C]/80 font-medium">
                        {debtor.description || 'Sem descrição'}
                      </td>
                      <td className={`py-3.5 px-3 text-right font-extrabold font-mono text-sm ${
                        isPagou ? 'text-emerald-800' : 'text-amber-900'
                      }`}>
                        {formatCurrency(debtor.transactionAmount)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          isPagou ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isPagou ? 'PAGOU (Devolvido)' : 'PEGOU (Emprestado)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Minhas Dívidas Próprias (Financiamentos / Passivos) */}
      {debts.length > 0 && (
        <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#11310C]/10">
            <div>
              <h3 className="text-lg font-extrabold text-[#11310C]">
                Minhas <span className="font-serif italic font-bold text-xl text-[#E13513]">Dívidas Próprias</span> & Financiamentos
              </h3>
              <p className="text-xs text-[#11310C]/60">Contratos ativos para quitação</p>
            </div>
            <span className="text-xs font-extrabold text-[#11310C] bg-[#11310C]/5 px-2.5 py-1 rounded-full">
              {debts.length} contratos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.map((debt) => {
              const paidAmount = debt.totalAmount - debt.remainingAmount;
              const progressPercent = Math.round((paidAmount / debt.totalAmount) * 100);

              return (
                <div
                  key={debt.id}
                  className="p-4 rounded-2xl bg-white/90 border border-[#11310C]/10 space-y-2.5 shadow-xs hover:border-[#E13513]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-[#11310C]">{debt.creditor}</h4>
                      <p className="text-xs text-[#11310C]/60 font-medium">
                        {debt.type} • Juros: {debt.interestRate}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-[#11310C]/50 uppercase block">
                        Saldo Restante
                      </span>
                      <span className="text-sm font-extrabold text-[#E13513]">
                        {formatCurrency(debt.remainingAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-[#11310C]/70">
                      <span>Progresso ({progressPercent}% pago)</span>
                      <span>Total: {formatCurrency(debt.totalAmount)}</span>
                    </div>
                    <div className="w-full bg-[#11310C]/10 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#11310C] h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-[#11310C]/10">
                    <span className="text-[#11310C]">
                      Parcela: <span className="font-extrabold">{formatCurrency(debt.monthlyPayment)}</span>
                    </span>
                    <span className="text-[#11310C]/70 text-[11px]">{debt.dueDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
