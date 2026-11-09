import { FilterMenu } from './FilterMenu';
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Sparkles,
  CreditCard,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Edit3,
  X,
  Sliders,
  Check,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { MonthSummaryData, Transaction, CreditCardSheet, Subscription, AIRecommendation, TaxSettings } from '../types';
import { formatCurrency, formatPercent, formatDateBR } from '../utils/formatters';
import { getTransactionAllocatedMonthLabel, calculateEffectiveInvoiceDate } from '../utils/sheetParser';
import { Receipt } from 'lucide-react';

const MONTH_ORDER: Record<string, number> = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  março: 3, marco: 3, mar: 3,
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

const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const getMonthSortValue = (monthStr: string): number => {
  const parts = (monthStr || '').toLowerCase().trim().split(' ');
  const name = parts[0] || '';
  const year = parts[1] ? parseInt(parts[1], 10) : 2026;
  const monthNum = MONTH_ORDER[name] || 1;
  return year * 100 + monthNum;
};

const getNextMonthLabel = (monthStr: string): string => {
  const parts = (monthStr || '').trim().split(' ');
  const name = (parts[0] || '').toLowerCase();
  const year = parts[1] ? parseInt(parts[1], 10) : 2026;
  const monthNum = MONTH_ORDER[name] || 9; // 1..12
  if (monthNum >= 12) {
    return `Janeiro ${year + 1}`;
  }
  return `${MONTH_NAMES_FULL[monthNum]} ${year}`;
};

const subscriptionIsAllocatedToMonth = (
  subscription: Subscription,
  targetMonth: string,
  creditCards: CreditCardSheet[]
): boolean => {
  const [monthName, yearText] = targetMonth.trim().split(/\s+/);
  const monthNumber = MONTH_ORDER[(monthName || '').toLowerCase()];
  const year = Number(yearText);
  if (!monthNumber || !Number.isFinite(year)) return false;

  // A card charge can land in its due month or as much as two months later
  // when the charge happens after the closing date and the due day is earlier.
  for (let monthsBack = 0; monthsBack <= 2; monthsBack++) {
    const chargeMonth = new Date(year, monthNumber - 1 - monthsBack, 1);
    const lastDayOfChargeMonth = new Date(chargeMonth.getFullYear(), chargeMonth.getMonth() + 1, 0).getDate();
    const chargeDay = Math.min(Math.max(Math.floor(subscription.renewalDay || 1), 1), lastDayOfChargeMonth);
    const purchaseDate = `${chargeMonth.getFullYear()}-${String(chargeMonth.getMonth() + 1).padStart(2, '0')}-${String(chargeDay).padStart(2, '0')}`;
    const timing = calculateEffectiveInvoiceDate(
      purchaseDate,
      subscription.paymentCard || 'Geral',
      subscription.paymentCard || 'PIX',
      creditCards
    );
    if (timing.effectiveMonthLabel.toLowerCase() === targetMonth.toLowerCase()) return true;
  }

  return false;
};

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const fullName = dataPoint?.fullName || label;
    const isCardCycleMonth = dataPoint?.isCardCycleMonth;
    const activeCardsInCycle: string[] = dataPoint?.activeCardsInCycle || [];
    const subscriptionsTotal: number = dataPoint?.subscriptionsTotal || 0;
    const subscriptionNames: string[] = dataPoint?.subscriptionNames || [];

    return (
      <div className="bg-[#11310C] border border-[#C4C240] p-3.5 rounded-2xl shadow-xl text-[#FAFBF6] space-y-1.5 z-50 min-w-[230px]">
        <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-1.5">
          <p className="text-xs font-black text-[#C4C240] uppercase tracking-wider">{fullName}</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#C4C240]/20 text-[#C4C240]">
            {isCardCycleMonth ? 'Ciclo do Cartão' : 'Visão Consolidada'}
          </span>
        </div>
        {isCardCycleMonth && activeCardsInCycle.length > 0 && (
          <p className="text-[10px] text-[#C4C240]/90 font-semibold leading-tight pb-1 border-b border-white/10">
            Compra 1x hoje cai aqui: {activeCardsInCycle.join(', ')}
          </p>
        )}
        <div className="space-y-1 pt-1">
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-semibold text-white flex items-center justify-between gap-3">
              <span className="text-white/80">{entry.name}:</span>
              <span className="font-extrabold text-[#C4C240]">{formatCurrency(Number(entry.value))}</span>
            </p>
          ))}
        </div>
        {subscriptionsTotal > 0 && (
          <div className="pt-1.5 mt-1 border-t border-white/10 text-[10px] text-white/75 flex items-center justify-between gap-2">
            <span>Assinaturas ({subscriptionNames.join(', ')}):</span>
            <span className="font-bold text-[#C4C240]">+{formatCurrency(subscriptionsTotal)}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

interface DashboardViewProps {
  currentMonthData: MonthSummaryData;
  allMonthsData: Record<string, MonthSummaryData>;
  recentTransactions: Transaction[];
  creditCards: CreditCardSheet[];
  subscriptions?: Subscription[];
  selectedMonth: string;
  onNavigateToTab: (tabId: string) => void;
  onOpenManualModal: () => void;
  onUpdateMonthData?: (monthKey: string, updated: Partial<MonthSummaryData>) => void;
  taxSettings?: TaxSettings;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentMonthData,
  allMonthsData,
  recentTransactions,
  creditCards,
  subscriptions = [],
  selectedMonth,
  onNavigateToTab,
  onOpenManualModal,
  onUpdateMonthData,
  taxSettings,
}) => {
  const [timeRange, setTimeRange] = useState<'este-mes' | 'semana' | '3-meses' | 'ano' | 'personalizado'>('este-mes');
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '2026-08-01', end: '2026-08-31' });
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Quick edit form state
  const [editIncome, setEditIncome] = useState(currentMonthData.totalIncome);
  const [editExpenses, setEditExpenses] = useState(currentMonthData.totalExpenses);
  const [editInvestments, setEditInvestments] = useState(currentMonthData.totalInvestments);

  useEffect(() => {
    setEditIncome(currentMonthData.totalIncome);
    setEditExpenses(currentMonthData.totalExpenses);
    setEditInvestments(currentMonthData.totalInvestments);
  }, [currentMonthData]);

  const handleSaveAdjustments = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateMonthData) {
      onUpdateMonthData(selectedMonth, {
        totalIncome: Number(editIncome) || 0,
        totalExpenses: Number(editExpenses) || 0,
        totalInvestments: Number(editInvestments) || 0,
      });
    }
    setIsAdjustModalOpen(false);
  };

  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Fetch AI Recommendations from server route
  const fetchAiInsights = async () => {
    setIsLoadingAi(true);
    try {
      const response = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          totalIncome: currentMonthData.totalIncome,
          totalExpenses: currentMonthData.totalExpenses,
          totalInvestments: currentMonthData.totalInvestments,
          totalDebts: currentMonthData.totalDebts,
          activeSubscriptions: currentMonthData.activeSubscriptionsCount,
          leftover: currentMonthData.leftover,
        }),
      });
      const data = await response.json();
      if (data.recommendations && Array.isArray(data.recommendations)) {
        setAiRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchAiInsights();
  }, [selectedMonth, currentMonthData.totalIncome, currentMonthData.totalExpenses]);

  // Ensure Setembro 2026 is always available in effectiveMonthsData
  const effectiveMonthsData = useMemo(() => {
    const map = { ...allMonthsData };
    if (!map['Setembro 2026']) {
      const prevTotal = map['Agosto 2026']?.totalMoney || 62798.77;
      map['Setembro 2026'] = {
        month: 'Setembro 2026',
        totalMoney: prevTotal,
        totalIncome: 0,
        totalExpenses: 0,
        leftover: 0,
        totalInvestments: map['Agosto 2026']?.totalInvestments || 0,
        totalDebts: 0,
        activeSubscriptionsCount: 4,
        monthlyGrowthPercent: 1.67,
        isProjected: false,
      };
    }
    return map;
  }, [allMonthsData]);

  const allChronologicalMonths = useMemo(() => {
    return Object.keys(effectiveMonthsData).sort((a, b) => getMonthSortValue(a) - getMonthSortValue(b));
  }, [effectiveMonthsData]);

  // Real recorded months up to present (including September 2026, which is the current active month)
  const realMonthsKeys = useMemo(() => {
    return allChronologicalMonths.filter((m) => {
      const lower = m.toLowerCase();
      // September 2026 is the current active month -> ALWAYS REAL
      if (lower.includes('setembro 2026')) return true;
      const item = effectiveMonthsData[m];
      if (typeof item?.isProjected === 'boolean') {
        return !item.isProjected;
      }
      // Filter out distant future projected months from the standard real list if unspecified
      if (lower.includes('2027') || lower.includes('outubro 2026') || lower.includes('novembro 2026') || lower.includes('dezembro 2026')) {
        return false;
      }
      return true;
    });
  }, [allChronologicalMonths, effectiveMonthsData]);

  // Chart-specific time range filter state (Affects ONLY the chart)
  const [chartTimeRange, setChartTimeRange] = useState<'todos' | '3-meses' | '6-meses' | 'ano' | 'personalizado'>('todos');
  const [includeNextMonth, setIncludeNextMonth] = useState(false);
  const [chartCustomMonths, setChartCustomMonths] = useState<string[]>([]);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [chartCustomStart, setChartCustomStart] = useState<string>('');
  const [chartCustomEnd, setChartCustomEnd] = useState<string>('');
  const [includeProjectedInChart, setIncludeProjectedInChart] = useState(false);

  // Determine all open invoice months where a 1x (non-installment) credit card purchase made TODAY would fall
  const cardCycleInfo = useMemo(() => {
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastReal = realMonthsKeys[realMonthsKeys.length - 1] || 'Setembro 2026';
    const lastRealSort = getMonthSortValue(lastReal);

    const activeCards =
      creditCards && creditCards.length > 0
        ? creditCards
        : [
            { name: 'Cartão ML', closingDay: 2, dueDay: 8 },
            { name: 'Cartão Picpay PJ', closingDay: 29, dueDay: 5 },
            { name: 'Cartão Nubank', closingDay: 3, dueDay: 10 },
          ];

    const byMonth: Record<string, string[]> = {};
    let maxTargetMonth = getNextMonthLabel(lastReal);
    let maxTargetSort = getMonthSortValue(maxTargetMonth);

    activeCards.forEach((card) => {
      const timing = calculateEffectiveInvoiceDate(
        todayIso,
        card.name,
        'Cartão de Crédito',
        activeCards
      );
      const targetMonth = timing.effectiveMonthLabel;
      if (targetMonth) {
        if (!byMonth[targetMonth]) {
          byMonth[targetMonth] = [];
        }
        if (!byMonth[targetMonth].includes(card.name)) {
          byMonth[targetMonth].push(card.name);
        }
        const sortVal = getMonthSortValue(targetMonth);
        if (sortVal > maxTargetSort) {
          maxTargetSort = sortVal;
          maxTargetMonth = targetMonth;
        }
      }
    });

    const monthsToAdd: string[] = [];
    let cursor = getNextMonthLabel(lastReal);
    let safety = 0;
    while (getMonthSortValue(cursor) <= maxTargetSort && safety < 6) {
      if (getMonthSortValue(cursor) > lastRealSort) {
        monthsToAdd.push(cursor);
      }
      cursor = getNextMonthLabel(cursor);
      safety++;
    }

    return {
      monthsToAdd,
      byMonth,
    };
  }, [creditCards, realMonthsKeys]);

  // Determine which months to display in the chart based on chartTimeRange and includeNextMonth
  const selectedChartMonthsKeys = useMemo(() => {
    const baseList = includeProjectedInChart ? allChronologicalMonths : realMonthsKeys;
    let result: string[] = baseList;

    if (chartTimeRange === '3-meses') {
      result = baseList.slice(-3);
    } else if (chartTimeRange === '6-meses') {
      result = baseList.slice(-6);
    } else if (chartTimeRange === 'ano') {
      result = baseList.filter(m => m.includes('2026'));
    } else if (chartTimeRange === 'personalizado') {
      if (chartCustomMonths.length > 0) {
        result = allChronologicalMonths.filter(m => chartCustomMonths.includes(m));
      } else if (chartCustomStart && chartCustomEnd) {
        const startVal = getMonthSortValue(chartCustomStart);
        const endVal = getMonthSortValue(chartCustomEnd);
        result = allChronologicalMonths.filter(m => {
          const v = getMonthSortValue(m);
          return v >= startVal && v <= endVal;
        });
      }
    }

    if (includeNextMonth && cardCycleInfo.monthsToAdd.length > 0) {
      const merged = [...result];
      cardCycleInfo.monthsToAdd.forEach((mKey) => {
        if (!merged.includes(mKey)) {
          merged.push(mKey);
        }
      });
      return merged;
    }

    return result;
  }, [chartTimeRange, includeNextMonth, cardCycleInfo, realMonthsKeys, allChronologicalMonths, includeProjectedInChart, chartCustomMonths, chartCustomStart, chartCustomEnd]);

  // Transform monthly data for chart with real-time transaction & active subscription integration
  const chartData = useMemo(() => {
    const activeSubs = (subscriptions || []).filter((s) => s.status === 'ativa' || s.active);

    return selectedChartMonthsKeys.map((m) => {
      const item = effectiveMonthsData[m] || {
        month: m,
        totalMoney: 0,
        totalIncome: 0,
        totalExpenses: 0,
        leftover: 0,
      };

      const isCardCycleMonth = cardCycleInfo.monthsToAdd.includes(m);

      // Calculate real-time income & expense from recentTransactions if not yet in summary
      let mIncome = item.totalIncome || 0;
      let mExpenses = item.totalExpenses || 0;
      const monthTransactions: Transaction[] = [];

      if (recentTransactions && recentTransactions.length > 0) {
        let txIncome = 0;
        let txExpenses = 0;
        let hasTx = false;
        recentTransactions.forEach((tx) => {
          const allocated = getTransactionAllocatedMonthLabel(tx);
          if (allocated === m) {
            hasTx = true;
            monthTransactions.push(tx);
            if (tx.type === 'income') txIncome += tx.amount;
            else if (tx.type === 'expense') txExpenses += tx.amount;
          }
        });
        if (hasTx) {
          mIncome = txIncome;
          mExpenses = txExpenses;
        }
      }

      // Add active subscriptions to every month their charge would belong to,
      // while avoiding duplicates already present in the transaction sheet.
      let subscriptionsTotal = 0;
      const subscriptionNames: string[] = [];
      activeSubs.forEach((sub) => {
        const subNameLower = (sub.serviceName || '').toLowerCase().trim();
        if (!subNameLower) return;

        const matchingTransactions = monthTransactions.filter(
          (tx) => tx.type === 'expense' && (tx.description || '').toLowerCase().includes(subNameLower)
        );
        const personalMonthlyPrice = sub.personalMonthlyPrice ?? sub.monthlyPrice;

        if (matchingTransactions.length > 0) {
          // Shared subscriptions are charged at the full price in the ledger;
          // show only the user's share when that full charge is recognizable.
          const matchingTotal = matchingTransactions.reduce((sum, tx) => sum + tx.amount, 0);
          if (
            personalMonthlyPrice < sub.monthlyPrice &&
            Math.abs(matchingTotal - sub.monthlyPrice) <= 0.02
          ) {
            mExpenses += personalMonthlyPrice - matchingTotal;
          }
          return;
        }

        if (personalMonthlyPrice > 0 && subscriptionIsAllocatedToMonth(sub, m, creditCards)) {
          subscriptionsTotal += personalMonthlyPrice;
          subscriptionNames.push(sub.serviceName);
        }
      });
      mExpenses += subscriptionsTotal;

      // If the month has no income registered yet (e.g. next month showing credit card expenses), keep leftover at 0
      const mLeftover =
        mIncome > 0
          ? mIncome - mExpenses
          : item.leftover && item.leftover > 0
          ? item.leftover
          : 0;

      return {
        name: m.split(' ')[0], // "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro"
        fullName: m,
        Patrimonio: item.totalMoney,
        Renda: mIncome,
        Gastos: mExpenses,
        Sobra: mLeftover,
        isCardCycleMonth,
        activeCardsInCycle: cardCycleInfo.byMonth[m] || [],
        subscriptionsTotal,
        subscriptionNames,
      };
    });
  }, [selectedChartMonthsKeys, effectiveMonthsData, recentTransactions, cardCycleInfo, subscriptions, creditCards]);

  // Date parsing helper for DD/MM/YYYY or YYYY-MM-DD
  const parseDateMs = (dateStr: string): number => {
    if (!dateStr) return 0;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      }
    }
    if (dateStr.includes('-')) {
      return new Date(dateStr).getTime();
    }
    return 0;
  };

  // Filter and sort transactions for the selected month according to Golden Rule month allocation
  const monthTransactions = recentTransactions.filter(
    (tx) => getTransactionAllocatedMonthLabel(tx) === selectedMonth
  );

  const sortedTransactions = [...monthTransactions].sort(
    (a, b) => parseDateMs(b.date) - parseDateMs(a.date)
  );

  // Group installment transactions so multi-installment purchases (e.g. Galaxy Tab 1/12 .. 12/12) appear as 1 grouped item with the first installment date
  const groupedTransactions = React.useMemo(() => {
    const map = new Map<string, Transaction & { minDateMs: number }>();
    const singles: Transaction[] = [];

    for (const tx of sortedTransactions) {
      const desc = (tx.description || '').trim();
      const match = desc.match(/^(.*?)\s*\(?(\d+)\/(\d+)\)?$/i);
      if (match) {
        const baseTitle = match[1].trim();
        const totalInst = parseInt(match[3], 10);
        const key = `${baseTitle.toLowerCase()}-${tx.type}-${tx.account || ''}`;
        const txMs = parseDateMs(tx.date);

        if (!map.has(key)) {
          map.set(key, {
            ...tx,
            id: `grouped-${key}`,
            description: `${baseTitle} (${totalInst}x de R$ ${tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
            minDateMs: txMs,
          });
        } else {
          const existing = map.get(key)!;
          if (txMs < existing.minDateMs) {
            existing.minDateMs = txMs;
            existing.date = tx.date; // Use date of first installment!
          }
        }
      } else {
        singles.push(tx);
      }
    }

    const merged = [...singles, ...Array.from(map.values()).map(({ minDateMs, ...rest }) => rest)];
    return merged.sort((a, b) => parseDateMs(b.date) - parseDateMs(a.date));
  }, [sortedTransactions]);

  // Dynamic values calculated based on timeRange filter
  let displayIncome = currentMonthData.totalIncome;
  let displayExpenses = currentMonthData.totalExpenses;
  let displayLeftover = currentMonthData.leftover;
  let periodLabel = 'do Mês';

  if (timeRange === 'semana') {
    periodLabel = 'na Semana';
    const latestMs = sortedTransactions.length > 0 ? parseDateMs(sortedTransactions[0].date) : Date.now();
    const sevenDaysAgoMs = latestMs - (7 * 24 * 60 * 60 * 1000);
    const weekTxs = sortedTransactions.filter(tx => {
      const ms = parseDateMs(tx.date);
      return ms >= sevenDaysAgoMs && ms <= latestMs;
    });
    displayIncome = weekTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    displayExpenses = weekTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    displayLeftover = displayIncome - displayExpenses;
  } else if (timeRange === '3-meses') {
    periodLabel = 'nos 3 Mêses';
    const monthList = realMonthsKeys.slice(-3).map(k => effectiveMonthsData[k] || allMonthsData[k]);
    displayIncome = monthList.reduce((sum: number, m) => sum + ((m as MonthSummaryData).totalIncome || 0), 0);
    displayExpenses = monthList.reduce((sum: number, m) => sum + ((m as MonthSummaryData).totalExpenses || 0), 0);
    displayLeftover = displayIncome - displayExpenses;
  } else if (timeRange === 'ano') {
    periodLabel = 'no Ano';
    const monthList = realMonthsKeys.map(k => effectiveMonthsData[k] || allMonthsData[k]);
    displayIncome = monthList.reduce((sum: number, m) => sum + ((m as MonthSummaryData).totalIncome || 0), 0);
    displayExpenses = monthList.reduce((sum: number, m) => sum + ((m as MonthSummaryData).totalExpenses || 0), 0);
    displayLeftover = displayIncome - displayExpenses;
  } else if (timeRange === 'personalizado') {
    periodLabel = 'no Período';
    const startMs = new Date(customRange.start).getTime();
    const endMs = new Date(customRange.end).getTime() + 86400000;
    const customTxs = sortedTransactions.filter(tx => {
      const ms = parseDateMs(tx.date);
      return ms >= startMs && ms <= endMs;
    });
    displayIncome = customTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    displayExpenses = customTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    displayLeftover = displayIncome - displayExpenses;
  }

  // Tax Calculations
  const taxPct = taxSettings?.percentage || 0;
  const isTaxActive = taxSettings?.enabled && taxPct > 0;
  const computedTaxAmount = isTaxActive ? displayIncome * (taxPct / 100) : 0;
  const computedNetIncome = isTaxActive ? displayIncome - computedTaxAmount : displayIncome;
  const computedNetLeftover = isTaxActive ? computedNetIncome - displayExpenses : displayLeftover;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 space-y-6 pb-12">
      {/* Abacaxi Pay Inspired Welcome & Range Selector */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-1">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#11310C] tracking-tight">
            Controle <span className="italic font-medium text-[#11310C]/70">Financeiro</span> de Alta Precisão
          </h1>
        </div>

        {/* Action Controls & Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterMenu
            value={timeRange}
            options={[
              { id: 'este-mes', label: 'Este mês' },
              { id: 'semana', label: 'Essa semana' },
              { id: '3-meses', label: 'Últimos 3 meses' },
              { id: 'ano', label: 'Anual' },
            ]}
            onChange={(id) => setTimeRange(id as any)}
            onCustom={() => { setTimeRange('personalizado'); setIsCalendarModalOpen(true); }}
          />
        </div>
      </div>

      {/* Primary Financial Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-[#11310C]/10 bg-white/55 overflow-hidden divide-y sm:divide-y-0 lg:divide-x divide-[#11310C]/10">
        {/* Metric 1: Ganho no Período */}
        <div className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-[#11310C]/60 uppercase tracking-[0.12em]">
              Ganhos {periodLabel}
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="font-serif text-3xl sm:text-[34px] font-semibold tracking-tight text-[#11310C]">
            {formatCurrency(displayIncome)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C4C240]/25 text-[#11310C]">
              Entradas
            </span>
            <span className="text-[11px] font-medium text-[#11310C]/60">período selecionado</span>
          </div>
        </div>

        {/* Metric 2: Gasto no Período (Chili Red) */}
        <div className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-[#11310C]/60 uppercase tracking-[0.12em]">
              Gastos {periodLabel}
            </span>
            <ArrowDownRight className="w-4 h-4 text-[#E13513]" />
          </div>
          <div className="font-serif text-3xl sm:text-[34px] font-semibold tracking-tight text-[#E13513]">
            {formatCurrency(displayExpenses)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FDECE9] text-[#E13513]">
              Saídas
            </span>
            <span className="text-[11px] font-medium text-[#11310C]/60">período selecionado</span>
          </div>
        </div>

        {/* Metric 3: Sobrou no Período (Estética Dinheiro Total Consolidado) */}
        <div className="bg-[#11310C] p-5 text-[#FAFBF6] space-y-3 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#C4C240] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#C4C240]" />
                Sobrou {periodLabel}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C4C240] text-[#11310C]">
                LÍQUIDO
              </span>
            </div>
            <div className="font-serif text-3xl sm:text-[34px] font-semibold tracking-tight tracking-tight text-white mt-2">
              {formatCurrency(displayLeftover)}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs text-[#FAFBF6]/80 font-medium">
            <span>Disponível para aportes & investimentos</span>
          </div>
        </div>

        {/* Metric 5: Total em Investimentos */}
        <div className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-[#11310C]/60 uppercase tracking-[0.12em]">
              Investimentos
            </span>
            <TrendingUp className="w-4 h-4 text-[#11310C]/60" />
          </div>
          <div className="font-serif text-3xl sm:text-[34px] font-semibold tracking-tight text-[#11310C]">
            {formatCurrency(currentMonthData.totalInvestments)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#11310C]/10 text-[#11310C]">
              +1.15% a.m.
            </span>
            <span className="text-[11px] font-medium text-[#11310C]/60">Rendimento médio</span>
          </div>
        </div>
      </div>

      {/* Tax Calculation Breakdown Card (When Enabled in Settings) */}
      {isTaxActive && (
        <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#11310C]/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#11310C] text-[#C4C240] flex items-center justify-center font-bold shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#11310C]">
                  Cálculo de Imposto sobre Renda ({taxPct}%)
                </h3>
                <p className="text-xs text-[#11310C]/70 font-medium">
                  Desconto de {taxPct}% aplicado sobre os ganhos totais {periodLabel}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-[#11310C] text-[#C4C240] uppercase tracking-wider self-start sm:self-auto shadow-xs">
              Imposto Ativo
            </span>
          </div>

          {/* 3 Centered Sub-cards: Imposto (Spending Style), Renda Líquida (Clear Green Style), Sobra Líquida (Sobra do Mês Style) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Card 1: Imposto (Mesmo estilo do container de Gastos) */}
            <div className="glass-card rounded-3xl p-5 border border-white/90 relative overflow-hidden group hover:border-[#E13513]/30 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider">
                    Imposto ({taxPct}%)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#FDECE9] text-[#E13513] flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4 text-[#E13513]" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#E13513]">
                  - {formatCurrency(computedTaxAmount)}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FDECE9] text-[#E13513]">
                  Desconto Renda
                </span>
                <span className="text-[11px] font-medium text-[#11310C]/60">{taxPct}% sobre ganhos</span>
              </div>
            </div>

            {/* Card 2: Renda Líquida (Mesmo estilo do container de Ganhos/Verde Claro) */}
            <div className="glass-card rounded-3xl p-5 border border-white/90 relative overflow-hidden group hover:border-[#C4C240]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider">
                    Renda Líquida
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
                  {formatCurrency(computedNetIncome)}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C4C240]/25 text-[#11310C]">
                  Pós-Impostos
                </span>
                <span className="text-[11px] font-medium text-[#11310C]/60">ganho efetivo</span>
              </div>
            </div>

            {/* Card 3: Sobra Líquida (Mesmo estilo do container da Sobra do Mês / Dark Green) */}
            <div className="glass-dark-card rounded-3xl p-5 text-[#FAFBF6] space-y-3 relative overflow-hidden glaze-shine flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#C4C240] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#C4C240]" />
                    Sobra Líquida
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C4C240] text-[#11310C]">
                    LÍQUIDO
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-2">
                  {formatCurrency(computedNetLeftover)}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs text-[#FAFBF6]/80 font-medium">
                <span>Após impostos e despesas {periodLabel}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Chart + AI Insights Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Wealth Chart (2 Cols) */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/90 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-[#11310C]/10">
            <div>
              <h3 className="text-lg font-extrabold text-[#11310C]">
                Evolução do <span className="font-serif italic font-bold text-xl text-[#C4C240]">Dinheiro Total</span> e Sobras
              </h3>
              <p className="text-xs text-[#11310C]/60">
                Histórico sincronizado das planilhas mensais
              </p>
            </div>

            {/* Filter of Months + Legend in header */}
            <div className="flex flex-wrap items-center gap-3">
              <FilterMenu
                value={chartTimeRange}
                options={[
                  { id: '3-meses', label: 'Últimos 3 meses' },
                  { id: '6-meses', label: 'Últimos 6 meses' },
                  { id: 'todos', label: 'Todos os meses' },
                ]}
                onChange={(id) => setChartTimeRange(id as any)}
                onCustom={() => setIsChartModalOpen(true)}
                toggle={{
                  label: 'Incluir ciclo do cartão',
                  hint: cardCycleInfo.monthsToAdd.length ? `Mostra ${cardCycleInfo.monthsToAdd.map((m) => m.split(' ')[0]).join(' e ')}, onde caem compras feitas hoje` : undefined,
                  checked: includeNextMonth,
                  onChange: setIncludeNextMonth,
                }}
              />

              <div className="h-4 w-px bg-[#11310C]/15 hidden sm:block" />

              <div className="flex items-center gap-3 text-xs font-bold text-[#11310C]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#11310C]" /> Renda
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C4C240]" /> Sobra
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E13513]" /> Gastos
                </span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSobra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C4C240" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#C4C240" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorRenda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#11310C" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#11310C" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E13513" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#E13513" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#11310C" strokeOpacity={0.08} />
                <XAxis
                  dataKey="fullName"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#11310C', fontWeight: 600 }}
                  tickFormatter={(v) => String(v).split(' ')[0]}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#11310C' }} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Renda"
                  stroke="#11310C"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRenda)"
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="Gastos"
                  stroke="#E13513"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorGastos)"
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="Sobra"
                  stroke="#C4C240"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSobra)"
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations Card (1 Col) */}
        <div className="glass-dark-card rounded-3xl p-6 text-[#FAFBF6] flex flex-col justify-between space-y-4 relative glaze-shine">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#C4C240] flex items-center justify-center text-[#11310C]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#FAFBF6]">
                    Recomendações <span className="font-serif italic font-bold text-base text-[#C4C240]">Gemini IA</span>
                  </h3>
                  <p className="text-[10px] text-[#FAFBF6]/60">Análise automática dos seus dados</p>
                </div>
              </div>

              <button
                onClick={fetchAiInsights}
                disabled={isLoadingAi}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#C4C240] transition-all cursor-pointer"
                title="Atualizar análise da IA"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* List of Recommendations */}
            <div className="space-y-3 mt-4">
              {isLoadingAi ? (
                <div className="py-8 text-center text-xs text-[#FAFBF6]/60 animate-pulse">
                  Gerando recomendações personalizadas com Gemini AI...
                </div>
              ) : aiRecommendations.length > 0 ? (
                aiRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md space-y-1 hover:bg-white/15 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#C4C240]">
                        {rec.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C4C240]/20 text-[#C4C240]">
                        {rec.impact}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#FAFBF6]/85 font-medium leading-snug">
                      {rec.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-3.5 rounded-2xl bg-white/10 text-xs font-medium text-[#FAFBF6]/70">
                  Sua saúde financeira está excelente! Mantenha a sobra de R$ {formatCurrency(currentMonthData.leftover)} investida.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('resumo')}
            className="w-full py-2.5 rounded-2xl bg-[#C4C240] text-[#11310C] font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-[#B5B333] transition-all cursor-pointer"
          >
            <span>Ver Balanço Geral Completo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secondary Grid: Recent Transactions + Cards Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List (2 Cols) */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/90 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#11310C]/10">
            <div>
              <h3 className="text-lg font-extrabold text-[#11310C]">
                Últimas <span className="font-serif italic font-bold text-xl text-[#C4C240]">Movimentações</span>
              </h3>
              <p className="text-xs text-[#11310C]/60">Entradas e saídas sincronizadas</p>
            </div>
            <button
              onClick={() => onNavigateToTab('extrato')}
              className="text-xs font-bold text-[#11310C] hover:text-[#C4C240] flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>Ver Extrato Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#11310C]/8">
            {groupedTransactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 px-1 hover:bg-[#11310C]/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      tx.type === 'income'
                        ? 'bg-emerald-100 text-emerald-800'
                        : tx.type === 'expense'
                        ? 'bg-[#FDECE9] text-[#E13513]'
                        : 'bg-[#C4C240]/25 text-[#11310C]'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                    ) : tx.type === 'expense' ? (
                      <ArrowDownRight className="w-4 h-4 text-[#E13513]" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-[#11310C]" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#11310C]">{tx.description}</h4>
                    <p className="text-[10px] font-medium text-[#11310C]/60">
                      {tx.category} • {formatDateBR(tx.date)} • {tx.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-extrabold text-xs ${
                      tx.type === 'income'
                        ? 'text-[#11310C]'
                        : tx.type === 'expense'
                        ? 'text-[#E13513]'
                        : 'text-[#11310C]'
                    }`}
                  >
                    {tx.type === 'income' || tx.type === 'reembolso' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </div>
                  <span className="text-[9px] font-semibold text-[#11310C]/50">
                    {tx.sourceSheet}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Cards Quick Invoice Widget (1 Col) */}
        <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#11310C]/10">
            <div>
              <h3 className="text-lg font-extrabold text-[#11310C]">
                Faturas dos <span className="font-serif italic font-bold text-xl text-[#C4C240]">Cartões</span>
              </h3>
              <p className="text-xs text-[#11310C]/60">Abertura e fechamento</p>
            </div>
            <button
              onClick={() => onNavigateToTab('cartoes')}
              className="p-1.5 rounded-xl bg-[#11310C]/5 hover:bg-[#11310C]/10 text-[#11310C] transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-[#11310C]/8">
            {creditCards.map((card) => (
              <div
                key={card.id}
                className="py-3 px-1 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#11310C]">{card.name}</span>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      card.status === 'fechada'
                        ? 'bg-[#E13513]/15 text-[#E13513]'
                        : 'bg-[#C4C240]/30 text-[#11310C]'
                    }`}
                  >
                    {card.status === 'fechada' ? 'Fatura Fechada' : 'Fatura Aberta'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-[10px] text-[#11310C]/60 font-semibold">Fatura Atual</p>
                    <p className="text-sm font-extrabold text-[#11310C]">
                      {formatCurrency(card.currentInvoice)}
                    </p>
                  </div>

                  <div className="text-right text-[10px] text-[#11310C]/70">
                    <p>Fechamento: Dia {card.closingDay}</p>
                    <p>Vencimento: Dia {card.dueDay}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Range Calendar Modal */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAFBF6] border border-[#11310C]/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#11310C]/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#11310C] text-[#C4C240] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-extrabold text-[#11310C]">
                  Personalizar Período
                </h3>
              </div>
              <button
                onClick={() => setIsCalendarModalOpen(false)}
                className="p-1.5 text-[#11310C]/60 hover:text-[#11310C] rounded-xl hover:bg-[#11310C]/5 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#11310C]/70">
              Escolha o intervalo de datas inicial e final para filtrar os indicadores e gráficos do seu painel:
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#11310C]/80">Data Inicial</label>
                <input
                  type="date"
                  value={customRange.start}
                  onChange={(e) => setCustomRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[#11310C]/15 rounded-xl text-xs font-bold text-[#11310C] focus:outline-none focus:border-[#C4C240]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#11310C]/80">Data Final</label>
                <input
                  type="date"
                  value={customRange.end}
                  onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[#11310C]/15 rounded-xl text-xs font-bold text-[#11310C] focus:outline-none focus:border-[#C4C240]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsCalendarModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#11310C]/70 hover:text-[#11310C] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setTimeRange('personalizado');
                  setIsCalendarModalOpen(false);
                }}
                className="px-5 py-2.5 bg-[#11310C] text-[#C4C240] rounded-xl text-xs font-extrabold shadow-md hover:bg-[#11310C]/90 transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Custom Months Selection Modal (Affects ONLY the chart) */}
      {isChartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11310C]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FAFBF6] border border-[#11310C]/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#11310C]/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#11310C]/5 text-[#11310C]">
                  <Calendar className="w-5 h-5 text-[#11310C]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#11310C]">Meses do Gráfico</h3>
                  <p className="text-[11px] text-[#11310C]/60">Filtro exclusivo para a evolução visual do gráfico</p>
                </div>
              </div>
              <button
                onClick={() => setIsChartModalOpen(false)}
                className="p-1 rounded-xl hover:bg-[#11310C]/5 text-[#11310C]/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick interval selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#11310C]/80">A partir de:</label>
                <select
                  value={chartCustomStart || allChronologicalMonths[0] || ''}
                  onChange={(e) => setChartCustomStart(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#11310C]/15 rounded-xl text-xs font-bold text-[#11310C] focus:outline-none focus:border-[#C4C240]"
                >
                  {allChronologicalMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#11310C]/80">Até o mês:</label>
                <select
                  value={chartCustomEnd || allChronologicalMonths[allChronologicalMonths.length - 1] || ''}
                  onChange={(e) => setChartCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#11310C]/15 rounded-xl text-xs font-bold text-[#11310C] focus:outline-none focus:border-[#C4C240]"
                >
                  {allChronologicalMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Individual month selection toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#11310C]/80">
                <span>Ou selecione meses específicos:</span>
                <button
                  type="button"
                  onClick={() => {
                    setChartCustomMonths([...allChronologicalMonths]);
                  }}
                  className="text-[11px] text-[#11310C] underline font-bold cursor-pointer hover:text-[#C4C240]"
                >
                  Marcar todos
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                {allChronologicalMonths.map((m) => {
                  const isChecked = chartCustomMonths.length > 0
                    ? chartCustomMonths.includes(m)
                    : selectedChartMonthsKeys.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        let updated: string[];
                        if (chartCustomMonths.length === 0) {
                          const base = [...selectedChartMonthsKeys];
                          if (base.includes(m)) {
                            updated = base.filter((x) => x !== m);
                          } else {
                            updated = [...base, m];
                          }
                        } else if (chartCustomMonths.includes(m)) {
                          updated = chartCustomMonths.filter((x) => x !== m);
                        } else {
                          updated = [...chartCustomMonths, m];
                        }
                        updated.sort((a, b) => getMonthSortValue(a) - getMonthSortValue(b));
                        setChartCustomMonths(updated);
                        setChartCustomStart('');
                        setChartCustomEnd('');
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-[#11310C] text-[#FAFBF6] border-[#11310C]'
                          : 'bg-white/80 text-[#11310C]/70 border-[#11310C]/15 hover:border-[#11310C]/40'
                      }`}
                    >
                      <span className="truncate">{m.split(' ')[0]}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-[#C4C240] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle to include future projected months */}
            <div className="pt-2 border-t border-[#11310C]/10 flex items-center justify-between">
              <label className="text-xs font-semibold text-[#11310C]/80 cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeProjectedInChart}
                  onChange={(e) => setIncludeProjectedInChart(e.target.checked)}
                  className="rounded text-[#11310C] focus:ring-[#C4C240]"
                />
                Incluir projeções futuras (+8 meses)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#11310C]/10">
              <button
                onClick={() => setIsChartModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#11310C]/70 hover:text-[#11310C] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setChartTimeRange('personalizado');
                  setIsChartModalOpen(false);
                }}
                className="px-5 py-2.5 bg-[#11310C] text-[#C4C240] rounded-xl text-xs font-extrabold shadow-md hover:bg-[#11310C]/90 transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Aplicar ao Gráfico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
