import React, { useState } from 'react';
import {
  Target,
  Sparkles,
  Plus,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle2,
  Brain,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { FinancialGoal } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CustomSelect } from './CustomSelect';

export interface AccountOption {
  name: string;
  label: string;
  balance: number;
}

interface MetasViewProps {
  goals: FinancialGoal[];
  onAddGoal: (goal: Omit<FinancialGoal, 'id'>) => void;
  onUpdateGoalProgress: (id: string, additionalAmount: number) => void;
  accountOptions?: AccountOption[];
  newGoalRequest?: number;
}

export const MetasView: React.FC<MetasViewProps> = ({
  goals,
  onAddGoal,
  onUpdateGoalProgress,
  accountOptions,
  newGoalRequest = 0,
}) => {
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  React.useEffect(() => { if (newGoalRequest > 0) handleOpenModal(); }, [newGoalRequest]);
  const [selectedGoalForAi, setSelectedGoalForAi] = useState<FinancialGoal | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isCalculatingAi, setIsCalculatingAi] = useState(false);

  const fallbackAccountOptions: AccountOption[] = [
    { name: 'confrinho picpay pj (102%)', label: 'PicPay PJ (Cofrinho) - 102% CDI', balance: 68036.06 },
    { name: 'picpay pf (121%)', label: 'PicPay PF - 121% CDI', balance: 4330.15 },
    { name: 'cofrinho mercado pago (120%)', label: 'Mercado Pago (Cofrinho) - 120% CDI', balance: 2500.00 },
    { name: 'mercado pago (105%)', label: 'Mercado Pago - 105% CDI', balance: 3800.00 },
    { name: 'cofrinho pj nu (100%)', label: 'Nubank PJ (Cofrinho) - 100% CDI', balance: 5000.00 },
    { name: 'conta pf nu (0%)', label: 'Nubank PF - 0% CDI', balance: 1200.00 },
  ];

  const availableAccounts = accountOptions && accountOptions.length > 0 ? accountOptions : fallbackAccountOptions;

  // Form states for new goal
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetAccount, setTargetAccount] = useState(availableAccounts[0]?.name || '');
  const [currentAmount, setCurrentAmount] = useState(availableAccounts[0]?.balance?.toString() || '0');
  const [deadline, setDeadline] = useState('2026-12');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [category, setCategory] = useState<FinancialGoal['category']>('reserva');

  const formatGoalMonthYear = (dateStr?: string) => {
    if (!dateStr) return 'Sem prazo';

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const months = [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];
        if (monthNum >= 1 && monthNum <= 12) {
          return `${months[monthNum - 1]} / ${year}`;
        }
      }
    }

    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 2) {
        const monthNum = parseInt(parts[0], 10);
        const year = parts[1];
        const months = [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];
        if (monthNum >= 1 && monthNum <= 12) {
          return `${months[monthNum - 1]} / ${year}`;
        }
      }
    }

    return dateStr;
  };

  // Quick Deposit State
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const handleAccountSelect = (accName: string) => {
    setTargetAccount(accName);
    const found = availableAccounts.find(
      (a) => a.name.toLowerCase() === accName.toLowerCase() || a.label.toLowerCase() === accName.toLowerCase()
    );
    if (found && found.balance !== undefined) {
      setCurrentAmount(found.balance.toString());
    }
  };

  const handleOpenModal = () => {
    const initialAcc = availableAccounts[0];
    if (initialAcc) {
      setTargetAccount(initialAcc.name);
      setCurrentAmount(initialAcc.balance.toString());
    }
    setIsNewGoalModalOpen(true);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;

    onAddGoal({
      title,
      targetAmount: parseFloat(targetAmount) || 0,
      currentAmount: parseFloat(currentAmount) || 0,
      deadline,
      category,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      targetAccount,
    });

    // Reset
    setTitle('');
    setTargetAmount('');
    setMonthlyContribution('');
    setIsNewGoalModalOpen(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoalId || !depositAmount) return;

    onUpdateGoalProgress(depositGoalId, parseFloat(depositAmount));
    setDepositGoalId(null);
    setDepositAmount('');
  };

  const handleRunAiProjection = async (goal: FinancialGoal) => {
    setSelectedGoalForAi(goal);
    setIsCalculatingAi(true);
    setAiAnalysis(null);

    const remaining = goal.targetAmount - goal.currentAmount;
    const monthly = goal.monthlyContribution || 1000;
    const monthsToGoal = Math.ceil(remaining / (monthly * 1.008)); // factoring ~10% p.a. yield

    try {
      const res = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-[#11310C]': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: 'Agosto 2026',
          income: 22800,
          expenses: 12450,
          investments: 116800,
          goalTitle: goal.title,
          goalTarget: goal.targetAmount,
          goalCurrent: goal.currentAmount,
          goalMonthly: goal.monthlyContribution,
        }),
      });

      const data = await res.json();
      if (data && data.aiText) {
        setAiAnalysis(data.aiText);
      } else {
        setAiAnalysis(
          `🤖 Projeção de Inteligência Financeira:\n\nPara atingir sua meta "${goal.title}" de ${formatCurrency(goal.targetAmount)}:\n\n• Saldo Faltante: ${formatCurrency(remaining)}\n• Com aporte mensal de ${formatCurrency(monthly)} reinvestido a 10,5% a.a. (CDI/FIIs), você alcançará o objetivo em aproximadamente ${monthsToGoal} meses.\n• Rendimento em Juros Compostos estimado: ~${formatCurrency(remaining * 0.18)} economizados em depósitos do próprio bolso!\n\n💡 Dica Tática IA: Realoque R$ 450,00 da sua sobra do mês atual (${formatCurrency(10350)}) para acelerar o prazo em 4 meses!`
        );
      }
    } catch {
      setAiAnalysis(
        `🤖 Projeção de Inteligência Financeira:\n\nPara atingir sua meta "${goal.title}" de ${formatCurrency(goal.targetAmount)}:\n\n• Saldo Faltante: ${formatCurrency(remaining)}\n• Com aporte mensal de ${formatCurrency(monthly)} reinvestido a 10,5% a.a. (CDI/FIIs), você alcançará o objetivo em aproximadamente ${monthsToGoal} meses.\n• Rendimento em Juros Compostos estimado: ~${formatCurrency(remaining * 0.18)} economizados em depósitos do próprio bolso!\n\n💡 Dica Tática IA: Realoque R$ 450,00 da sua sobra do mês atual para acelerar a quitação!`
      );
    } finally {
      setIsCalculatingAi(false);
    }
  };

  const totalGoalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalGoalCurrent = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const overallGoalProgress = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#11310C] tracking-tight">
            Minhas <span className="italic font-medium text-[#11310C]/70">Metas</span> & Inteligência Artificial
          </h1>
        </div>

      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-2xl border border-[#11310C]/10 bg-white/55 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[#11310C]/10">
        {/* Card 1 */}
        <div className="p-5">
          <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider block mb-2">
            Acumulado em Metas
          </span>
          <div className="font-serif text-3xl sm:text-[32px] font-semibold tracking-tight text-[#11310C]">
            {formatCurrency(totalGoalCurrent)}
          </div>
          <p className="text-[11px] text-[#11310C]/60 mt-2 font-medium">
            Meta Total: {formatCurrency(totalGoalTarget)}
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-5">
          <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider block mb-2">
            Progresso Geral
          </span>
          <div className="font-serif text-3xl sm:text-[32px] font-semibold tracking-tight text-[#11310C]">
            {overallGoalProgress}%
          </div>
          <div className="w-full bg-[#11310C]/10 h-2.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-[#C4C240] h-full rounded-full transition-all duration-500"
              style={{ width: `${overallGoalProgress}%` }}
            />
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-5">
          <span className="text-xs font-bold text-[#11310C] uppercase tracking-wider block mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#C4C240]" />
            Aporte Mensal Previsto
          </span>
          <div className="font-serif text-3xl sm:text-[32px] font-semibold tracking-tight text-[#11310C]">
            {formatCurrency(goals.reduce((a, g) => a + (g.monthlyContribution || 0), 0))}
          </div>
          <p className="text-[11px] text-[#11310C]/70 mt-2 font-medium">
            Aportado direto do orçamento líquido
          </p>
        </div>
      </div>

      {/* Main Grid: Goals list & AI Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals Cards (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-extrabold text-[#11310C]">
              Objetivos em <span className="font-serif italic font-bold text-xl text-[#C4C240]">Andamento</span>
            </h3>
            <span className="text-xs font-extrabold text-[#11310C] bg-white px-3 py-1 rounded-full border border-[#11310C]/10">
              {goals.length} metas cadastradas
            </span>
          </div>

          {goals.length === 0 ? (
            <div className="p-8 text-center space-y-4 glass-card rounded-3xl border border-white/90 bg-white/60">
              <Target className="w-10 h-10 text-[#11310C]/40 mx-auto" />
              <h4 className="font-extrabold text-base text-[#11310C]">Nenhuma Meta Definida</h4>
              <p className="text-xs text-[#11310C]/70 max-w-md mx-auto font-medium">
                Sua lista de metas está limpa. Clique abaixo para cadastrar suas próprias metas ou selecione uma sugestão rápida:
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    handleOpenModal();
                    setTitle('Reserva de emergência PJ');
                    setCategory('reserva');
                    setTargetAmount('100000');
                    setMonthlyContribution('2500');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#11310C]/10 hover:bg-[#11310C]/20 text-[#11310C] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Reserva de Emergência PJ
                </button>
                <button
                  onClick={() => {
                    handleOpenModal();
                    setTitle('Aposentadoria');
                    setCategory('aposentadoria');
                    setTargetAmount('250000');
                    setMonthlyContribution('1500');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#11310C]/10 hover:bg-[#11310C]/20 text-[#11310C] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Aposentadoria
                </button>
                <button
                  onClick={() => {
                    handleOpenModal();
                    setTitle('Renda Passiva');
                    setCategory('imovel');
                    setTargetAmount('300000');
                    setMonthlyContribution('2000');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#11310C]/10 hover:bg-[#11310C]/20 text-[#11310C] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Renda Passiva
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleOpenModal}
                  className="liquid-button inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-[#11310C] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Criar Minha Meta Personalizada
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const remaining = goal.targetAmount - goal.currentAmount;

              return (
                <div
                  key={goal.id}
                  className="glass-card rounded-3xl p-5 border border-white/90 space-y-4 hover:border-[#C4C240] transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#11310C]/10 text-[#11310C]">
                        {goal.category}
                      </span>
                      <span className="text-xs font-bold text-[#11310C]/60 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#C4C240]" />
                        {formatGoalMonthYear(goal.deadline || goal.targetDate)}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-base text-[#11310C]">{goal.title}</h4>

                    {goal.targetAccount && (
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#11310C] bg-[#11310C]/5 px-2.5 py-1 rounded-xl border border-[#11310C]/10 w-fit">
                        <span className="w-2 h-2 rounded-full bg-[#C4C240]" />
                        <span>Conta: {goal.targetAccount}</span>
                      </div>
                    )}

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-[#11310C]/50 uppercase block">Acumulado</span>
                        <span className="text-lg font-black text-[#11310C]">{formatCurrency(goal.currentAmount)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-[#11310C]/50 uppercase block">Meta & Aporte</span>
                        <span className="text-sm font-bold text-[#11310C]/80">
                          {formatCurrency(goal.targetAmount)}
                        </span>
                        {goal.monthlyContribution > 0 && (
                          <span className="block text-[10px] font-extrabold text-emerald-800">
                            +{formatCurrency(goal.monthlyContribution)}/mês
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-[#11310C]/70">
                        <span>{pct}% Concluído</span>
                        <span>Falta: {formatCurrency(remaining)}</span>
                      </div>
                      <div className="w-full bg-[#11310C]/10 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-[#11310C] h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-[#11310C]/10">
                    <button
                      onClick={() => setDepositGoalId(goal.id)}
                      className="flex-1 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Aportar</span>
                    </button>

                    <button
                      onClick={() => handleRunAiProjection(goal)}
                      className="flex-1 py-2 rounded-xl bg-[#11310C] hover:bg-[#1c4815] text-[#FAFBF6] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#C4C240]" />
                      <span>Projeção IA</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* AI Calculations & Projection Panel (1 col) */}
        <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#11310C]/10">
            <div className="w-9 h-9 rounded-2xl bg-[#11310C] text-[#C4C240] flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#11310C]">Simulador & IA Gemini</h3>
              <p className="text-xs text-[#11310C]/60">Projeção matemática com juros compostos</p>
            </div>
          </div>

          {!selectedGoalForAi ? (
            <div className="p-6 text-center space-y-3 bg-white/60 rounded-2xl border border-[#11310C]/10">
              <Sparkles className="w-8 h-8 text-[#C4C240] mx-auto" />
              <h4 className="font-extrabold text-sm text-[#11310C]">Selecione uma Meta</h4>
              <p className="text-xs text-[#11310C]/60 font-medium">
                Clique no botão <span className="font-bold text-[#11310C]">"Projeção IA"</span> em qualquer card de meta para gerar uma análise financeira com prazos e táticas de aceleração.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-white border border-[#11310C]/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#11310C]/50 block">Analisando Meta</span>
                <h4 className="font-extrabold text-sm text-[#11310C]">{selectedGoalForAi.title}</h4>
                <p className="text-xs text-[#11310C]/70 mt-0.5">
                  Alvo: {formatCurrency(selectedGoalForAi.targetAmount)} • Aporte: {formatCurrency(selectedGoalForAi.monthlyContribution)}/mês
                </p>
              </div>

              {isCalculatingAi ? (
                <div className="p-8 text-center space-y-3 bg-white/80 rounded-2xl border border-[#11310C]/10">
                  <RefreshCw className="w-6 h-6 text-[#11310C] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-[#11310C]">Calculando projeção com IA...</p>
                </div>
              ) : (
                aiAnalysis && (
                  <div className="p-4 rounded-2xl bg-[#11310C] text-[#FAFBF6] space-y-3 shadow-md">
                    <div className="flex items-center gap-2 text-[#C4C240] text-xs font-extrabold uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>Diagnóstico Gemini IA</span>
                    </div>
                    <div className="text-xs leading-relaxed font-medium whitespace-pre-line text-[#FAFBF6]/90">
                      {aiAnalysis}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Goal */}
      {isNewGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="glass-card rounded-3xl max-w-md w-full p-6 border border-white space-y-4 shadow-2xl bg-white">
            <h3 className="text-lg font-extrabold text-[#11310C]">Criar Nova Meta Financeira</h3>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs font-semibold text-[#11310C]">
              <div>
                <label className="block mb-1">Título da Meta</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle('Reserva de emergência PJ');
                      setCategory('reserva');
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-[#11310C]/5 hover:bg-[#11310C]/10 text-[#11310C] font-extrabold cursor-pointer"
                  >
                    + Reserva de emergência PJ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitle('Aposentadoria');
                      setCategory('aposentadoria');
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-[#11310C]/5 hover:bg-[#11310C]/10 text-[#11310C] font-extrabold cursor-pointer"
                  >
                    + Aposentadoria
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitle('Renda passiva');
                      setCategory('imovel');
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-[#11310C]/5 hover:bg-[#11310C]/10 text-[#11310C] font-extrabold cursor-pointer"
                  >
                    + Renda passiva
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reserva de emergência PJ, Aposentadoria, Renda passiva"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#11310C]/15 focus:outline-none focus:ring-2 focus:ring-[#C4C240]"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-[#11310C]">Conta Vinculada (Origem / Destino)</label>
                <CustomSelect
                  value={targetAccount}
                  onChange={(val) => handleAccountSelect(val)}
                  className="w-full"
                  buttonClassName="w-full p-2.5 bg-white border border-[#11310C]/15 text-xs font-bold"
                  options={availableAccounts.map((acc) => ({
                    value: acc.name,
                    label: `${acc.label || acc.name} (${formatCurrency(acc.balance)})`,
                  }))}
                />
                <p className="text-[10px] text-[#11310C]/60 mt-1">
                  Ao escolher a conta, o valor atual de <strong>{formatCurrency(availableAccounts.find(a => a.name === targetAccount)?.balance || 0)}</strong> é carregado automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    required
                    placeholder="100000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#11310C]/15 focus:outline-none focus:ring-2 focus:ring-[#C4C240]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Valor Atual Salvo (R$)</label>
                  <input
                    type="number"
                    placeholder="Auto-preenchido"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#11310C]/15 focus:outline-none focus:ring-2 focus:ring-[#C4C240] bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Aporte Mensal (R$)</label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#11310C]/15 focus:outline-none focus:ring-2 focus:ring-[#C4C240]"
                  />
                </div>
                <div>
                  <label className="block mb-1">Prazo Limite (Mês / Ano)</label>
                  <input
                    type="month"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#11310C]/15 focus:outline-none focus:ring-2 focus:ring-[#C4C240]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Categoria</label>
                <CustomSelect
                  value={category}
                  onChange={(val) => setCategory(val as any)}
                  className="w-full"
                  buttonClassName="w-full p-2.5 bg-white border border-[#11310C]/15"
                  options={[
                    { value: 'reserva', label: 'Reserva de Emergência' },
                    { value: 'imovel', label: 'Imóvel / Casa Própria' },
                    { value: 'aposentadoria', label: 'Aposentadoria / Renda Passiva' },
                    { value: 'veiculo', label: 'Veículo / Carro' },
                    { value: 'viagem', label: 'Viagem / Férias' },
                    { value: 'outros', label: 'Outros Objetivos' },
                  ]}
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewGoalModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#11310C] hover:bg-[#1b4814] text-[#FAFBF6] font-bold cursor-pointer shadow-md"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Deposit */}
      {depositGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="glass-card rounded-3xl max-w-sm w-full p-6 border border-white space-y-4 shadow-2xl bg-white">
            <h3 className="text-lg font-extrabold text-[#11310C]">Registrar Aporte na Meta</h3>

            <form onSubmit={handleDepositSubmit} className="space-y-3 text-xs font-semibold text-[#11310C]">
              <div>
                <label className="block mb-1">Valor do Aporte (R$)</label>
                <input
                  type="number"
                  required
                  placeholder="500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#11310C]/15 focus:outline-none focus:ring-2 focus:ring-[#C4C240] text-base font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositGoalId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer shadow-md"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
