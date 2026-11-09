import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Sparkles,
  Car,
  PlusCircle,
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { QuickForm, parseMoney } from './QuickForm';
import { Pencil, Plus, Archive, ArchiveRestore, Trash2, X as CloseIcon, Wallet } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { MonthSummaryData, SpreadsheetConnection, Investment, FinancialGoal } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ResumoViewProps {
  currentMonthData: MonthSummaryData;
  allMonthsData: Record<string, MonthSummaryData>;
  totalMoneySheet?: SpreadsheetConnection;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  monthsList: string[];
  investments?: Investment[];
  goals?: FinancialGoal[];
  balanceAccounts?: { id: string; name: string; archived?: boolean }[];
  onSaveBalances?: (date: string, values: Record<string, number | null>, previousDate?: string) => Promise<void>;
  onCreateAccount?: (name: string) => Promise<void>;
  onUpdateAccount?: (id: string, changes: { name?: string; archived?: boolean }) => Promise<void>;
  onDeleteAccount?: (id: string) => Promise<void>;
}

// "cofrinho pj nu (100%)" -> { base: 'cofrinho pj nu', rate: '100' }
const splitAccountName = (name: string) => {
  const m = name.match(/^(.*?)\s*\((\d+(?:[.,]\d+)?)%\)\s*$/);
  if (m) return { base: m[1], rate: m[2] };
  const v = name.match(/^(.*?)\s*\((vari[aá]vel)\)\s*$/i);
  if (v) return { base: v[1], rate: 'variável' };
  return { base: name, rate: '0' };
};
const joinAccountName = (base: string, rate: string) => {
  const r = (rate || '').trim().toLowerCase();
  if (r.startsWith('vari')) return `${base.trim()} (variavel)`;
  const n = r.replace('%', '').replace(',', '.');
  return `${base.trim()} (${Number(n) ? Number(n).toString().replace('.', ',') : '0'}%)`;
};

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const brToIso = (br: string) => {
  const [d, m, y] = (br || '').split('/');
  return y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : '';
};
const moneyText = (v: number | undefined | null) =>
  v === undefined || v === null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CustomBarTooltip = ({ active, payload, label, liveInvestmentsTotal = 0, includeAportes = false }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const currentBarVal = Number(payload[0].value);
    const baseTotal = Number(data.baseTotalMoney ?? currentBarVal);
    const withAportesTotal = Number(data.withAportesTotalMoney ?? currentBarVal);

    const isProjected = !!data.isProjected;
    const monthName = (data.month || String(label || '').split(' ')[0] || '').toUpperCase();
    
    // Extract year reliably from data.year or data.monthKey or label
    const monthKeyStr = String(data.monthKey || label || '');
    const parts = monthKeyStr.trim().split(/\s+/);
    const yearStr = data.year || (parts.length > 1 ? parts[1] : (isProjected ? '2027' : '2026'));
    
    // Total Consolidado = Dinheiro Total do Mês (contas/previsão CDI) + Soma dos Investimentos de hoje
    const totalConsolidadoBase = baseTotal + liveInvestmentsTotal;
    const totalConsolidadoComAportes = withAportesTotal + liveInvestmentsTotal;

    return (
      <div className="bg-[#11310C] border border-[#C4C240] px-4 py-3.5 rounded-2xl shadow-2xl text-[#FAFBF6] space-y-2 z-50 min-w-[280px]">
        {/* Header line with Month and Year Badge */}
        <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-2">
          <p className="text-xs font-black text-[#C4C240] uppercase tracking-wider">{monthName}</p>
          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#C4C240]/20 text-[#C4C240] border border-[#C4C240]/30">
            {yearStr}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-semibold">
          {/* 1. Dinheiro Total */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/80">Dinheiro Total :</span>
            <span className="text-[#C4C240] font-black">{formatCurrency(baseTotal)}</span>
          </div>

          {/* 2. Total Consolidado (Dinheiro Total + Investimentos de Hoje) */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
            <span className="text-white/90 font-bold">Total Consolidado :</span>
            <span className="text-white font-black">{formatCurrency(totalConsolidadoBase)}</span>
          </div>
          <div className="text-[10px] text-white/60 font-normal italic leading-tight pl-1">
            (Contas do mês: {formatCurrency(baseTotal)} + Investimentos de hoje: {formatCurrency(liveInvestmentsTotal)})
          </div>

          {/* 3 & 4. Aportes & Consolidado com Aportes - Shown when includeAportes switch is active */}
          {includeAportes && (
            <>
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-3 text-[#C4C240]">
                <span className="font-bold">Com Aportes (+ Metas) :</span>
                <span className="font-black">{formatCurrency(withAportesTotal)}</span>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-3 text-emerald-300">
                <span className="font-bold">Consolidado com Aportes :</span>
                <span className="font-black">{formatCurrency(totalConsolidadoComAportes)}</span>
              </div>
              <div className="text-[10px] text-emerald-200/80 font-normal italic leading-tight pl-1">
                (Soma total: Contas/CDI + Aportes: {formatCurrency(withAportesTotal)} + Investimentos de hoje: {formatCurrency(liveInvestmentsTotal)})
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const ResumoView: React.FC<ResumoViewProps> = ({
  currentMonthData,
  allMonthsData,
  totalMoneySheet,
  selectedMonth,
  onSelectMonth,
  monthsList,
  investments = [],
  goals = [],
  balanceAccounts = [],
  onSaveBalances,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
}) => {
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<null | { id?: string; base: string; rate: string }>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const activeAccounts = balanceAccounts.filter((a) => !a.archived);
  const [includeAportes, setIncludeAportes] = useState<boolean>(false);
  const [balanceForm, setBalanceForm] = useState<null | { title: string; initial: Record<string, string>; previousDate?: string; accounts: { id: string; name: string }[] }>(null);

  // Live real-time investment total calculation
  const liveInvestmentsTotal =
    investments.length > 0
      ? investments.reduce((acc, item) => acc + item.currentValue, 0)
      : currentMonthData.totalInvestments;

  // Real-time consolidated total money
  const bankAccountsBalance = currentMonthData.totalMoney;
  const consolidatedTotalMoney = bankAccountsBalance + liveInvestmentsTotal;

  // Extract accounts matrix details if present or default list of columns
  const accountCols = currentMonthData.accountColumnsMeta && currentMonthData.accountColumnsMeta.length > 0
    ? currentMonthData.accountColumnsMeta
    : [
        { name: 'conta pj nubank (0%)', ratePct: 0 },
        { name: 'cofrinho pj nu (100%)', ratePct: 100 },
        { name: 'conta pf nu (0%)', ratePct: 0 },
        { name: 'investimento nu (variavel)', ratePct: 0 },
        { name: 'picpay pf (121%)', ratePct: 121 },
        { name: 'picpay pj (0%)', ratePct: 0 },
        { name: 'confrinho picpay pj (102%)', ratePct: 102 },
        { name: 'carro (0%)', ratePct: 0 },
        { name: 'mercado pago (105%)', ratePct: 105 },
        { name: 'cofrinho mercado pago (120%)', ratePct: 120 },
      ];

  const tableRows = currentMonthData.accountDetailsRows && currentMonthData.accountDetailsRows.length > 0
    ? currentMonthData.accountDetailsRows
    : Object.keys(allMonthsData).map((mKey) => {
        const item = allMonthsData[mKey];
        const lower = mKey.toLowerCase();
        // A month is only projected if explicitly set to true or if it's an unrecorded future month beyond September 2026
        const isProj = typeof item.isProjected === 'boolean'
          ? item.isProjected
          : (lower.includes('outubro 2026') || lower.includes('novembro 2026') || lower.includes('dezembro 2026') || lower.includes('2027'));
        return {
          date: '01/01/2026',
          monthLabel: mKey,
          balances: item.accountBalances || {},
          total: item.totalMoney,
          isProjected: isProj,
        };
      });

  // Matching helper for goals and accounts
  const matchAccountName = (goalAccount?: string, colName?: string): boolean => {
    if (!goalAccount || !colName) return false;
    const g = goalAccount.trim().toLowerCase();
    const c = colName.trim().toLowerCase();
    if (g === c) return true;

    const gClean = g.replace(/\(\d+%\)/g, '').replace(/cofrinho/g, '').replace(/confrinho/g, '').trim();
    const cClean = c.replace(/\(\d+%\)/g, '').replace(/cofrinho/g, '').replace(/confrinho/g, '').trim();

    if (gClean && cClean && (gClean === cClean || cClean.includes(gClean) || gClean.includes(cClean))) {
      return true;
    }
    return false;
  };

  const PORTUGUESE_MONTH_MAP: Record<string, number> = {
    janeiro: 1, jan: 1,
    fevereiro: 2, fev: 2,
    marco: 3, março: 3, mar: 3,
    abril: 4, abr: 4,
    maio: 5, mai: 5,
    junho: 6, jun: 6,
    julho: 7, jul: 7,
    agosto: 8, ago: 8,
    setembro: 9, set: 9,
    outubro: 10, out: 10,
    novembro: 11, nov: 11,
    dezembro: 12, dez: 12,
  };

  const parseYearMonthFromLabel = (label?: string, fallbackDate?: string): { year: number; month: number } | null => {
    if (label) {
      const tokens = label.toLowerCase().split(/\s+/);
      let month = 0;
      let year = 0;
      for (const token of tokens) {
        if (PORTUGUESE_MONTH_MAP[token]) {
          month = PORTUGUESE_MONTH_MAP[token];
        } else if (/^\d{4}$/.test(token)) {
          year = parseInt(token, 10);
        }
      }
      if (month > 0 && year > 0) return { year, month };
    }

    if (fallbackDate && fallbackDate.includes('/')) {
      const parts = fallbackDate.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (!isNaN(month) && !isNaN(year)) return { year, month };
      }
    }

    return null;
  };

  const parseGoalDeadlineYearMonth = (goal: FinancialGoal): { year: number; month: number } | null => {
    const dateStr = goal.deadline || goal.targetDate;
    if (!dateStr) return null;

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        if (!isNaN(year) && !isNaN(month)) return { year, month };
      }
    }

    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 2) {
        const month = parseInt(parts[0], 10);
        const year = parseInt(parts[1], 10);
        if (!isNaN(year) && !isNaN(month)) return { year, month };
      } else if (parts.length === 3) {
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month)) return { year, month };
      }
    }

    return null;
  };

  const isGoalActiveInMonth = (goal: FinancialGoal, rowYM: { year: number; month: number } | null): boolean => {
    if (!rowYM) return true;
    const goalYM = parseGoalDeadlineYearMonth(goal);
    if (!goalYM) return true;

    const rowVal = rowYM.year * 12 + rowYM.month;
    const goalVal = goalYM.year * 12 + goalYM.month;

    return rowVal <= goalVal;
  };

  // Total monthly contribution across all goals
  const activeTotalAporteMonthly = goals.reduce((acc, g) => acc + (g.monthlyContribution || 0), 0);

  // Compute rows WITH monthly aportes explicitly so both base and with-aporte values are available to chart tooltip
  const withAportesTableRows = useMemo(() => {
    const firstProjIndex = tableRows.findIndex((r) => r.isProjected);
    if (firstProjIndex <= 0) return tableRows;

    const newRows = tableRows.map((r) => ({ ...r, balances: { ...r.balances } }));
    let runningBalances = { ...newRows[firstProjIndex - 1].balances };

    for (let i = firstProjIndex; i < newRows.length; i++) {
      const row = newRows[i];
      const rowYM = parseYearMonthFromLabel(row.monthLabel, row.date);

      // Filter goals that are still active in this month
      const activeGoalsInMonth = goals.filter((g) => isGoalActiveInMonth(g, rowYM));

      // Find goals that don't specify a target account or don't match any column
      const unassignedAportes = activeGoalsInMonth
        .filter((g) => !g.targetAccount || !accountCols.some((col) => matchAccountName(g.targetAccount, col.name)))
        .reduce((sum, g) => sum + (g.monthlyContribution || 0), 0);

      const perColUnassigned = accountCols.length > 0 ? unassignedAportes / accountCols.length : 0;

      const newBalances: Record<string, number> = {};
      let newTotal = 0;

      for (const col of accountCols) {
        const prevVal = runningBalances[col.name] ?? 0;
        const ratePct = col.ratePct ?? 0;
        const cdiMonthly = ratePct > 0 ? 0.0085 * (ratePct / 100) : 0;
        const yielded = prevVal * (1 + cdiMonthly);

        const colAportes = activeGoalsInMonth
          .filter((g) => matchAccountName(g.targetAccount, col.name))
          .reduce((sum, g) => sum + (g.monthlyContribution || 0), 0);

        const finalVal = yielded + colAportes + perColUnassigned;

        newBalances[col.name] = finalVal;
        newTotal += finalVal;
      }

      runningBalances = newBalances;
      newRows[i] = {
        ...row,
        balances: newBalances,
        total: newTotal,
      };
    }

    return newRows;
  }, [tableRows, goals, accountCols]);

  const effectiveTableRows = includeAportes ? withAportesTableRows : tableRows;

  // Monthly total money chart data synced with effectiveTableRows & withAportesTableRows
  const monthlyTotalsChart = useMemo(() => {
    return tableRows.map((baseRow, idx) => {
      const mLabel = baseRow.monthLabel || '';
      const matchingWithAportesRow = withAportesTableRows[idx] || withAportesTableRows.find(
        (tr) => tr.monthLabel.toLowerCase() === mLabel.toLowerCase()
      );

      const baseTotal = baseRow.total;
      const withAportesTotal = matchingWithAportesRow ? matchingWithAportesRow.total : baseTotal;
      const displayTotal = includeAportes ? withAportesTotal : baseTotal;

      const isProj = !!baseRow.isProjected;

      // Extract month name and year accurately
      const parts = mLabel.trim().split(/\s+/);
      const monthOnly = parts[0] || mLabel;
      const yearOnly = parts.length > 1 ? parts[1] : (idx >= 8 ? '2027' : '2026');

      // Unique chart key for Recharts so XAxis never collides identical month names from different years (e.g. "Maio 2026" vs "Maio 2027")
      const uniqueKey = `${monthOnly} ${yearOnly}`;

      // Calculate sequential growth based on the actual base totals
      let computedGrowth = 0;
      if (idx > 0) {
        const prevRow = tableRows[idx - 1];
        const prevTotal = prevRow ? prevRow.total : 0;
        if (prevTotal > 0 && baseTotal > 0) {
          computedGrowth = parseFloat((((baseTotal - prevTotal) / prevTotal) * 100).toFixed(2));
        }
      }

      const isPositive = computedGrowth >= 0;
      const extraItem = allMonthsData[mLabel] || allMonthsData[uniqueKey] || allMonthsData[monthOnly];

      return {
        monthKey: uniqueKey,
        month: monthOnly,
        year: yearOnly,
        totalMoney: displayTotal,
        baseTotalMoney: baseTotal,
        withAportesTotalMoney: withAportesTotal,
        growth: computedGrowth,
        isPositive,
        isProjected: isProj,
        income: extraItem?.totalIncome || 0,
        expenses: extraItem?.totalExpenses || 0,
        leftover: extraItem?.leftover || 0,
      };
    });
  }, [tableRows, withAportesTableRows, includeAportes, allMonthsData]);

  const finalProjectedTotal = effectiveTableRows[effectiveTableRows.length - 1]?.total || consolidatedTotalMoney;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card rounded-3xl p-6 border border-white/90">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
            Total do <span className="font-serif italic font-bold text-3xl sm:text-4xl text-[#C4C240]">Dinheiro</span> do Mês
          </h1>
          <p className="text-xs text-[#11310C]/70 mt-1">
            Sua planilha de caixa central consolida o patrimônio total, saldos de contas e previsão de rendimentos.
          </p>
        </div>

        {/* Controls: Projeção Mode Toggle & Month Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Switch: Rendimento vs Com Aporte */}
          <div className="flex items-center p-1 rounded-2xl bg-[#11310C] text-[#FAFBF6] border border-[#11310C]/20 shadow-xs">
            <button
              type="button"
              onClick={() => setIncludeAportes(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                !includeAportes
                  ? 'bg-[#C4C240] text-[#11310C] shadow-xs'
                  : 'text-white/70 hover:text-white'
              }`}
              title="Apenas projeção de rendimento dos juros CDI"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Apenas Rendimento
            </button>
            <button
              type="button"
              onClick={() => setIncludeAportes(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                includeAportes
                  ? 'bg-[#C4C240] text-[#11310C] shadow-xs'
                  : 'text-white/70 hover:text-white'
              }`}
              title="Incluir depósitos/aportes mensais recorrentes das metas"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Com Aporte
            </button>
          </div>

          {/* Month Dropdown */}
          <CustomSelect
            value={selectedMonth}
            onChange={onSelectMonth}
            options={monthsList}
            icon={<Calendar className="w-4 h-4 text-[#C4C240]" />}
            labelPrefix="Mês do Resumo:"
            alignRight
          />
        </div>
      </div>

      {/* Main Metric Spotlight Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Saldo Total das Contas */}
        <div className="glass-card rounded-3xl p-6 border border-white/90 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-[#11310C]/60 uppercase tracking-wider block mb-1">
              Saldo das Contas Bancárias
            </span>
            <div className="text-3xl font-extrabold text-[#11310C]">
              {formatCurrency(bankAccountsBalance)}
            </div>
            <p className="text-xs text-[#11310C]/70 mt-1 font-medium">
              Soma total dos saldos nas contas bancárias ({selectedMonth})
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#11310C]/5 border border-[#11310C]/10 flex items-center justify-between text-xs font-bold">
            <span className="text-[#11310C]">Status de Caixa:</span>
            <span className="text-emerald-800 font-extrabold">Positivo</span>
          </div>
        </div>

        {/* Card 2: Valor Total de Investimentos */}
        <div className="glass-card rounded-3xl p-6 border border-white/90 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-[#11310C]/60 uppercase tracking-wider block mb-1">
              Soma dos Investimentos
            </span>
            <div className="text-3xl font-extrabold text-[#11310C]">
              {formatCurrency(liveInvestmentsTotal)}
            </div>
            <p className="text-xs text-[#11310C]/70 mt-1 font-medium">
              Calculado em tempo real somando cada ativo da carteira
            </p>
          </div>
          <div className="w-full bg-[#11310C]/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#C4C240] h-full rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  consolidatedTotalMoney > 0 ? (liveInvestmentsTotal / consolidatedTotalMoney) * 100 : 50
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Card 3: Total do Dinheiro Consolidado */}
        <div className="glass-dark-card rounded-3xl p-6 text-[#FAFBF6] space-y-3 relative overflow-hidden glaze-shine flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#C4C240]">
                Dinheiro Total Consolidado
              </span>
              <Sparkles className="w-5 h-5 text-[#C4C240]" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-2">
              {formatCurrency(consolidatedTotalMoney)}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                currentMonthData.monthlyGrowthPercent >= 0
                  ? 'bg-[#C4C240] text-[#11310C]'
                  : 'bg-[#E13513] text-white'
              }`}
            >
              {currentMonthData.monthlyGrowthPercent >= 0 ? '+' : ''}
              {currentMonthData.monthlyGrowthPercent}%
            </span>
            <span className="text-xs text-[#FAFBF6]/70">Contas + Investimentos ({selectedMonth})</span>
          </div>
        </div>
      </div>

      {/* Monthly Total Money Growth Chart */}
      <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#11310C]/10">
          <div>
            <h3 className="text-lg font-extrabold text-[#11310C]">
              Gráfico Mensal do <span className="font-serif italic font-bold text-xl text-[#C4C240]">Dinheiro Total</span> (Histórico & Previsão)
            </h3>
            <p className="text-xs text-[#11310C]/60">
              Acompanhe a evolução do seu dinheiro total com os valores reais da planilha e as projeções de rendimento CDI
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[#11310C]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#11310C]" /> Lançamento Real
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#E13513]" /> Mês em Queda
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#C4C240]" /> Previsão CDI
            </span>
          </div>
        </div>

        {/* Dynamic Mode Explanatory Indicator above Chart */}
        {includeAportes ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#C4C240]/20 border border-[#C4C240]/50 text-xs text-[#11310C]">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-xl bg-[#11310C] text-[#C4C240]">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <p className="font-extrabold text-xs">
                Gráfico refletindo Modo Com Aporte: Rendimento CDI + Depósitos de Metas (+{formatCurrency(activeTotalAporteMonthly)}/mês)
              </p>
            </div>
            <span className="text-xs font-black text-[#11310C]">
              Patrimônio Final em Dez/Proj: {formatCurrency(finalProjectedTotal)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#11310C]/5 border border-[#11310C]/10 text-xs text-[#11310C]">
            <span className="inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-lg bg-[#11310C] text-[#C4C240] text-[10px]">
              <TrendingUp className="w-3 h-3" />
              Apenas Rendimento
            </span>
            <span className="text-[11px] text-[#11310C]/80 font-medium">
              Gráfico aplicando simulação de juros compostos CDI sobre saldos atuais das contas.
            </span>
          </div>
        )}

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <BarChart data={monthlyTotalsChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#11310C" strokeOpacity={0.08} />
              <XAxis
                dataKey="monthKey"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#11310C', fontWeight: 600 }}
                tickFormatter={(v: string) => String(v).split(' ')[0]}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#11310C' }} tickFormatter={(v) => `R$${v/1000}k`} />
              <Tooltip content={<CustomBarTooltip liveInvestmentsTotal={liveInvestmentsTotal} includeAportes={includeAportes} />} />
              <Bar
                dataKey="totalMoney"
                radius={[12, 12, 0, 0]}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {monthlyTotalsChart.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isProjected ? '#C4C240' : entry.isPositive ? '#11310C' : '#E13513'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comprehensive Accounts & Yield Prediction Table */}
      <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#11310C]/10">
          <div>
            <h3 className="text-lg font-extrabold text-[#11310C]">
              Tabela de <span className="font-serif italic font-bold text-xl text-[#C4C240]">Contas & Previsão</span> de Rendimentos
            </h3>
            <p className="text-xs text-[#11310C]/60">
              Saldos reais das contas bancárias e simulação de crescimento em tempo real com acúmulo de juros compostos.
            </p>
          </div>
        </div>

        {/* Banner Explaining Current Projection Mode */}
        {includeAportes ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#C4C240]/20 border border-[#C4C240]/50 text-xs text-[#11310C] animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#11310C] text-[#C4C240]">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <p className="font-extrabold text-xs">
                  Modo Com Aporte Ativo: Rendimento CDI + Depósitos de Metas
                </p>
                <p className="text-[11px] text-[#11310C]/80 font-medium">
                  Injetando <strong>+{formatCurrency(activeTotalAporteMonthly)}/mês</strong> em aportes recorrentes de {goals.length} metas diretamente nas projeções.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#11310C]/60 block">Patrimônio Projetado no Final</span>
              <span className="text-sm font-black text-[#11310C]">{formatCurrency(finalProjectedTotal)}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-[#11310C]/5 border border-[#11310C]/10 text-xs text-[#11310C]">
            <span className="inline-flex items-center gap-1 font-extrabold px-2.5 py-1 rounded-xl bg-[#11310C] text-[#C4C240] text-[11px] shadow-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              Juros Compostos Ativos
            </span>
            <span className="font-semibold text-[#11310C]/80 text-[11px]">
              As previsões aplicam acúmulo exponencial mês a mês: <strong>M(t) = M(t-1) × (1 + R)</strong> com base na rentabilidade individual (+102% CDI, +120% CDI, +121% CDI).
            </span>
          </div>
        )}

        {onSaveBalances && balanceAccounts.length > 0 && (() => {
          const realRows = tableRows.filter((r: any) => !r.isProjected);
          const last = realRows[realRows.length - 1];
          const [lastName, lastYear] = (last?.monthLabel || '').split(' ');
          const idx = MONTHS_PT.findIndex((m) => m.toLowerCase() === (lastName || '').toLowerCase());
          const nextKey = idx >= 0 ? Number(lastYear) * 12 + idx + 1 : new Date().getFullYear() * 12 + new Date().getMonth();
          const nextLabel = `${MONTHS_PT[nextKey % 12]} ${Math.floor(nextKey / 12)}`;
          const today = new Date();
          const sameMonth = today.getFullYear() * 12 + today.getMonth() === nextKey;
          const defaultDate = sameMonth ? today.toISOString().slice(0, 10) : `${Math.floor(nextKey / 12)}-${String((nextKey % 12) + 1).padStart(2, '0')}-05`;
          const initial: Record<string, string> = { date: defaultDate };
          activeAccounts.forEach((a) => { initial[a.id] = moneyText(last?.balances?.[a.name]); });
          return (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[#11310C]/55">Último saldo lançado: <strong className="text-[#11310C]">{last ? `${last.monthLabel} (${last.date})` : '—'}</strong></p>
              <div className="flex items-center gap-2">
                {onUpdateAccount && (
                  <button
                    onClick={() => { setAccountError(null); setAccountsOpen(true); }}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#11310C]/15 text-[#11310C] text-xs font-semibold hover:bg-[#11310C]/5 cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" /> Contas e caixinhas
                  </button>
                )}
                <button
                  onClick={() => setBalanceForm({ title: `Saldos de ${nextLabel}`, initial, accounts: activeAccounts })}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#11310C] text-[#FAFBF6] text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Lançar saldos de {nextLabel.split(' ')[0].toLowerCase()}
                </button>
              </div>
            </div>
          );
        })()}

        <div className="overflow-x-auto rounded-2xl border border-[#11310C]/10 bg-white/80">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#11310C] text-[#FAFBF6] font-bold">
                <th className="p-3 sticky left-0 bg-[#11310C] z-10 border-b border-white/10 text-center">Mês</th>
                <th className="p-3 border-b border-white/10 text-center">Tipo</th>
                {accountCols.map((col) => (
                  <th key={col.name} className="p-2 border-b border-white/10 text-center">
                    {/* Compact Brand Logo / Badge Column Header */}
                    <div className="flex flex-col items-center justify-center">
                      {(() => {
                        const lower = col.name.toLowerCase();
                        const ratePct = col.ratePct;
                        const isVariable = lower.includes('variavel') || lower.includes('vari)avel');
                        const subText = ratePct > 0 ? `+${ratePct}% CDI` : isVariable ? 'variável' : '0% CDI';

                        if (lower.includes('nu') || lower.includes('nubank')) {
                          let suffix = 'PF';
                          let isPiggy = lower.includes('cofrinho');
                          let isInv = lower.includes('investimento');
                          if (lower.includes('pj')) suffix = 'PJ';

                          return (
                            <div className="flex flex-col items-center justify-center p-0.5">
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#820AD1] text-white font-black text-xs shadow-xs tracking-tight">
                                <span className="font-serif italic text-sm font-extrabold">nu</span>
                                <span className="text-[10px] font-bold opacity-90">
                                  {isPiggy ? '🐷' : isInv ? '📈' : suffix}
                                </span>
                              </div>
                              <span className={`text-[10px] font-extrabold mt-1 whitespace-nowrap ${ratePct > 0 ? 'text-[#C4C240]' : isVariable ? 'text-sky-300' : 'text-white/60'}`}>
                                {subText}
                              </span>
                            </div>
                          );
                        }

                        if (lower.includes('picpay')) {
                          let suffix = 'PF';
                          let isPiggy = lower.includes('cofrinho') || lower.includes('confrinho');
                          if (lower.includes('pj')) suffix = 'PJ';

                          return (
                            <div className="flex flex-col items-center justify-center p-0.5">
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#11C76F] text-white font-black text-xs shadow-xs tracking-tight">
                                <span className="font-sans font-black text-xs">P</span>
                                <span className="text-[10px] font-bold opacity-90">
                                  {isPiggy ? '🐷 PJ' : suffix}
                                </span>
                              </div>
                              <span className={`text-[10px] font-extrabold mt-1 whitespace-nowrap ${ratePct > 0 ? 'text-[#C4C240]' : 'text-white/60'}`}>
                                {subText}
                              </span>
                            </div>
                          );
                        }

                        if (lower.includes('mercado') || lower.includes('mp')) {
                          let isPiggy = lower.includes('cofrinho');

                          return (
                            <div className="flex flex-col items-center justify-center p-0.5">
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#009EE3] text-white font-black text-xs shadow-xs tracking-tight">
                                <span className="font-sans font-black text-xs">MP</span>
                                <span className="text-[10px] font-bold opacity-90">
                                  {isPiggy ? '🐷' : ''}
                                </span>
                              </div>
                              <span className={`text-[10px] font-extrabold mt-1 whitespace-nowrap ${ratePct > 0 ? 'text-[#C4C240]' : 'text-white/60'}`}>
                                {subText}
                              </span>
                            </div>
                          );
                        }

                        if (lower.includes('carro')) {
                          return (
                            <div className="flex flex-col items-center justify-center p-0.5">
                              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800 text-amber-300 font-black text-xs shadow-xs tracking-tight">
                                <Car className="w-3.5 h-3.5 text-amber-300" />
                                <span className="text-[10px] font-extrabold">Carro</span>
                              </div>
                              <span className="text-[10px] font-extrabold text-white/60 mt-1 whitespace-nowrap">
                                {subText}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-col items-center justify-center p-0.5">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#11310C] text-[#C4C240] font-black text-xs shadow-xs">
                              {col.name.split(' ')[0]}
                            </div>
                            <span className={`text-[10px] font-extrabold mt-1 whitespace-nowrap ${ratePct > 0 ? 'text-[#C4C240]' : 'text-white/60'}`}>
                              {subText}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </th>
                ))}
                <th className="p-3 border-b border-white/10 text-right font-black text-[#C4C240] whitespace-nowrap">
                  Total Geral
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#11310C]/10 font-medium text-[#11310C]">
              {effectiveTableRows.map((row) => {
                const isSelected = row.monthLabel === selectedMonth;

                return (
                  <tr
                    key={row.monthLabel}
                    onClick={() => onSelectMonth(row.monthLabel)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#C4C240]/25 font-bold'
                        : row.isProjected
                        ? 'bg-amber-50/40 hover:bg-amber-100/40'
                        : 'hover:bg-[#11310C]/5'
                    }`}
                  >
                    <td className="p-3 font-extrabold sticky left-0 bg-white/95 shadow-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {row.monthLabel}
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#11310C]" />}
                        {onSaveBalances && !row.isProjected && balanceAccounts.length > 0 && (
                          <button
                            title="Editar saldos deste mês"
                            onClick={(e) => {
                              e.stopPropagation();
                              const initial: Record<string, string> = { date: brToIso(row.date) };
                              balanceAccounts.forEach((a) => { initial[a.id] = moneyText(row.balances?.[a.name]); });
                              setBalanceForm({ title: `Editar saldos de ${row.monthLabel}`, initial, previousDate: brToIso(row.date), accounts: balanceAccounts });
                            }}
                            className="ml-1 p-1 rounded-md text-[#11310C]/40 hover:text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      {row.isProjected ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                          Previsão CDI
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Real / Planilha
                        </span>
                      )}
                    </td>

                    {accountCols.map((col) => {
                      const val = row.balances ? row.balances[col.name] || 0 : 0;
                      return (
                        <td key={col.name} className="p-3 text-right whitespace-nowrap">
                          {formatCurrency(val)}
                        </td>
                      );
                    })}

                    <td className="p-3 text-right font-black text-[#11310C] whitespace-nowrap bg-[#11310C]/5">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {accountsOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-[#11310C]/25" onClick={() => setAccountsOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-[#FCFCFA] rounded-2xl border border-[#11310C]/10 shadow-[0_24px_60px_-20px_rgba(17,49,12,0.35)]">
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#11310C]/8">
              <div>
                <h3 className="font-serif text-xl font-semibold text-[#11310C]">Contas e caixinhas</h3>
                <p className="text-xs text-[#11310C]/55 mt-0.5">O % do CDI é usado nas previsões de rendimento.</p>
              </div>
              <button onClick={() => setAccountsOpen(false)} className="p-1.5 rounded-lg hover:bg-[#11310C]/5 cursor-pointer" aria-label="Fechar">
                <CloseIcon className="w-4 h-4 text-[#11310C]/60" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-2 divide-y divide-[#11310C]/8">
              {balanceAccounts.map((a) => {
                const { base, rate } = splitAccountName(a.name);
                return (
                  <div key={a.id} className={`flex items-center gap-3 py-3 ${a.archived ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#11310C] truncate">{base}</p>
                      <p className="text-[11px] text-[#11310C]/55">{rate === 'variável' ? 'Rendimento variável' : `${rate}% do CDI`}{a.archived ? ' · arquivada' : ''}</p>
                    </div>
                    <button title="Editar nome e CDI" onClick={() => setAccountForm({ id: a.id, base, rate })} className="p-2 rounded-lg text-[#11310C]/50 hover:text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                    <button
                      title={a.archived ? 'Reativar' : 'Arquivar (some dos próximos lançamentos, mantém o histórico)'}
                      onClick={async () => { try { setAccountError(null); await onUpdateAccount!(a.id, { archived: !a.archived }); } catch (e: any) { setAccountError(e.message); } }}
                      className="p-2 rounded-lg text-[#11310C]/50 hover:text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer"
                    >
                      {a.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      title="Excluir de vez (apaga o histórico desta conta)"
                      onClick={async () => {
                        if (!window.confirm(`Excluir "${base}" de vez? Todo o histórico de saldos dela será apagado. Para só esconder dos próximos meses, use Arquivar.`)) return;
                        try { setAccountError(null); await onDeleteAccount!(a.id); } catch (e: any) { setAccountError(e.message); }
                      }}
                      className="p-2 rounded-lg text-[#11310C]/50 hover:text-[#E13513] hover:bg-[#E13513]/5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            {accountError && <p className="px-6 pb-2 text-xs font-medium text-[#E13513]">{accountError}</p>}
            <div className="flex justify-between items-center px-6 py-4 border-t border-[#11310C]/8">
              <button onClick={() => setAccountForm({ base: '', rate: '100' })} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#11310C] text-[#FAFBF6] text-xs font-semibold cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Nova caixinha
              </button>
              <button onClick={() => setAccountsOpen(false)} className="h-9 px-4 rounded-lg text-[13px] font-medium text-[#11310C]/70 hover:bg-[#11310C]/5 cursor-pointer">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <QuickForm
        open={Boolean(accountForm)}
        title={accountForm?.id ? 'Editar conta' : 'Nova caixinha'}
        initial={accountForm ? { base: accountForm.base, rate: accountForm.rate } : undefined}
        fields={[
          { name: 'base', label: 'Nome', required: true, placeholder: 'cofrinho inter' },
          { name: 'rate', label: '% do CDI', required: true, placeholder: '100', hint: 'Use 0 para conta sem rendimento, ou escreva "variável".' },
        ]}
        onClose={() => setAccountForm(null)}
        onSubmit={async (v) => {
          const name = joinAccountName(v.base, v.rate);
          if (accountForm?.id) await onUpdateAccount!(accountForm.id, { name });
          else await onCreateAccount!(name);
        }}
      />

      <QuickForm
        open={Boolean(balanceForm)}
        title={balanceForm?.title || ''}
        subtitle="Saldo de cada conta no dia. Deixe vazio o que não tiver."
        initial={balanceForm?.initial}
        submitLabel="Salvar saldos"
        fields={[
          { name: 'date', label: 'Data dos saldos', type: 'date', required: true },
          ...(balanceForm?.accounts || []).map((a) => ({ name: a.id, label: a.name, type: 'money' as const, half: true, placeholder: '0,00' })),
        ]}
        onClose={() => setBalanceForm(null)}
        onSubmit={async (v) => {
          const values: Record<string, number | null> = {};
          (balanceForm?.accounts || []).forEach((a) => {
            const raw = (v[a.id] || '').trim();
            values[a.id] = raw ? parseMoney(raw) : null;
          });
          await onSaveBalances!(v.date, values, balanceForm?.previousDate);
        }}
      />
    </div>
  );
};
