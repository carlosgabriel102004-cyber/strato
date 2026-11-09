import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Download,
  Plus,
  LayoutList,
  Table as TableIcon,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { getTransactionAllocatedMonthLabel, getMonthLabelFromIsoDate, getCurrentMonthLabel } from '../utils/sheetParser';
import { CustomSelect } from './CustomSelect';

interface ExtratoViewProps {
  transactions: Transaction[];
  onOpenManualModal: () => void;
  selectedMonth: string;
  onMonthChange?: (month: string) => void;
  monthsList?: string[];
}

const DEFAULT_MONTHS_LIST = [
  'Janeiro 2026',
  'Fevereiro 2026',
  'Março 2026',
  'Abril 2026',
  'Maio 2026',
  'Junho 2026',
  'Julho 2026',
  'Agosto 2026',
  'Setembro 2026',
  'Outubro 2026',
  'Novembro 2026',
  'Dezembro 2026',
];

export const ExtratoView: React.FC<ExtratoViewProps> = ({
  transactions,
  onOpenManualModal,
  selectedMonth,
  onMonthChange,
  monthsList = DEFAULT_MONTHS_LIST,
}) => {
  const currentMonthLabel = getCurrentMonthLabel();

  // Automatically ensure ExtratoView initializes on the current month on mount
  useEffect(() => {
    if (onMonthChange && selectedMonth !== currentMonthLabel) {
      onMonthChange(currentMonthLabel);
    }
  }, []);

  // Persistent filter states via localStorage (only reference mode, month scope & view style persist)
  const [filterType, setFilterType] = useState<'todos' | TransactionType>('todos');
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [filterAccount, setFilterAccount] = useState<string>('todas');
  const [filterMethod, setFilterMethod] = useState<string>('todos');
  const [filterDay, setFilterDay] = useState<string>('todos');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [viewStyle, setViewStyle] = useState<'pluggy' | 'tabela'>(() => {
    return (localStorage.getItem('strato_extrato_view_style') as 'pluggy' | 'tabela') || 'pluggy';
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'fatura' | 'compra'>(() => {
    return (localStorage.getItem('strato_extrato_filter_mode') as 'fatura' | 'compra') || 'compra';
  });
  const [filterMonthScope, setFilterMonthScope] = useState<'selecionado' | 'todos'>(() => {
    return (localStorage.getItem('strato_extrato_month_scope') as 'selecionado' | 'todos') || 'selecionado';
  });

  // Sync ONLY reference mode, month scope & view style to localStorage
  useEffect(() => {
    localStorage.setItem('strato_extrato_view_style', viewStyle);
  }, [viewStyle]);

  useEffect(() => {
    localStorage.setItem('strato_extrato_filter_mode', filterMode);
  }, [filterMode]);

  useEffect(() => {
    localStorage.setItem('strato_extrato_month_scope', filterMonthScope);
  }, [filterMonthScope]);

  // Categories & Accounts lists
  const categories = Array.from(new Set(transactions.map((t) => t.category))).filter(Boolean);
  const accounts = Array.from(new Set(transactions.map((t) => t.account || 'Geral'))).filter(Boolean);
  const paymentMethods = Array.from(new Set(transactions.map((t) => t.paymentMethod || 'PIX'))).filter(Boolean);
  const daysInMonth = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const filteredTransactions = transactions.filter((tx) => {
    // Golden Rule Month Filter
    let matchesMonth = true;
    if (filterMonthScope === 'selecionado') {
      const allocatedMonth = getTransactionAllocatedMonthLabel(tx);
      const purchaseMonth = getMonthLabelFromIsoDate(tx.date);
      matchesMonth = filterMode === 'fatura' ? allocatedMonth === selectedMonth : purchaseMonth === selectedMonth;
    }

    const matchesType = filterType === 'todos' || tx.type === filterType;
    const matchesCategory = filterCategory === 'todas' || tx.category === filterCategory;
    const matchesAccount = filterAccount === 'todas' || (tx.account || 'Geral') === filterAccount;
    const matchesMethod = filterMethod === 'todos' || (tx.paymentMethod || '') === filterMethod;

    let matchesDay = true;
    const effectiveOrPurchaseDate = filterMode === 'fatura' && tx.effectiveExpenseDate ? tx.effectiveExpenseDate : tx.date;
    if (filterDay !== 'todos' && effectiveOrPurchaseDate) {
      const dayPart = effectiveOrPurchaseDate.split('-')[2] || effectiveOrPurchaseDate.split('/')[0];
      matchesDay = parseInt(dayPart, 10) === parseInt(filterDay, 10);
    }

    const matchesSearch =
      tx.description.toLowerCase().includes(localSearch.toLowerCase()) ||
      (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(localSearch.toLowerCase())) ||
      (tx.account && tx.account.toLowerCase().includes(localSearch.toLowerCase())) ||
      (tx.category && tx.category.toLowerCase().includes(localSearch.toLowerCase()));

    return matchesMonth && matchesType && matchesCategory && matchesAccount && matchesMethod && matchesDay && matchesSearch;
  });

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

  const getTxKeyDate = (tx: Transaction) => {
    if (filterMode === 'fatura' && tx.effectiveExpenseDate) {
      return tx.effectiveExpenseDate;
    }
    return tx.date || '';
  };

  const sortedFilteredTransactions = [...filteredTransactions].sort(
    (a, b) => parseDateMs(getTxKeyDate(b)) - parseDateMs(getTxKeyDate(a))
  );

  const totalIncomeInView = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenseInView = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // Group transactions by date for Pluggy layout
  const groupedTransactionsMap = sortedFilteredTransactions.reduce((acc, tx) => {
    const dateKey = getTxKeyDate(tx) || 'Sem Data';
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const groupedDateKeys = Object.keys(groupedTransactionsMap);

  const formatGroupHeaderDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'Sem Data') return { dayNum: '--', weekDay: 'Data não informada' };
    let dateObj: Date | null = null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    if (!dateObj || isNaN(dateObj.getTime())) {
      return { dayNum: '--', weekDay: dateStr };
    }

    const dayNum = dateObj.getDate().toString();
    const weekDayRaw = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const weekDayFormatted = weekDayRaw.charAt(0).toUpperCase() + weekDayRaw.slice(1);
    return { dayNum, weekDay: weekDayFormatted };
  };

  const formatPluggyMonthLabel = (monthStr: string) => {
    if (!monthStr) return '';
    const parts = monthStr.trim().split(' ');
    if (parts.length === 2) {
      const monthName = parts[0];
      const year = parts[1];
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();
      return `${capitalizedMonth} De ${year}`;
    }
    return monthStr;
  };

  const handlePrevMonth = () => {
    const list = monthsList.length > 0 ? monthsList : DEFAULT_MONTHS_LIST;
    const currentIndex = list.indexOf(selectedMonth);
    if (currentIndex > 0) {
      onMonthChange?.(list[currentIndex - 1]);
    } else if (currentIndex === -1 && list.length > 0) {
      onMonthChange?.(list[0]);
    }
  };

  const handleNextMonth = () => {
    const list = monthsList.length > 0 ? monthsList : DEFAULT_MONTHS_LIST;
    const currentIndex = list.indexOf(selectedMonth);
    if (currentIndex >= 0 && currentIndex < list.length - 1) {
      onMonthChange?.(list[currentIndex + 1]);
    }
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['Data', 'Descrição', 'Categoria', 'Valor', 'Tipo', 'Forma', 'Planilha Alvo'],
      ...filteredTransactions.map((t) => [
        t.date,
        `"${t.description}"`,
        t.category,
        t.amount.toString(),
        t.type,
        t.paymentMethod,
        t.sourceSheet,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Extrato_Strato_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 space-y-8 pb-16">
      {/* Top Banner / Header with Summary Indicators */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#11310C] tracking-tight">
              Extrato de <span className="italic font-medium text-[#11310C]/70">Transações</span>
            </h1>
          </div>
          <p className="text-xs text-[#11310C]/70 mt-1">
            Histórico consolidado de lançamentos organizados por fluxo diário.
          </p>
        </div>

        {/* Top Indicators & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Total Indicators */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-white/80 rounded-2xl border border-[#11310C]/10 text-xs font-bold shadow-xs">
            <span className="text-[#11310C]/70" title="Contagem total de lançamentos">
              <strong className="text-[#11310C]">{filteredTransactions.length}</strong> de <strong className="text-[#11310C]">{transactions.length}</strong> registros
            </span>
            <span className="text-[#11310C]/20">|</span>
            <span className="flex items-center gap-1 text-emerald-700" title="Total de Entradas">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              {formatCurrency(totalIncomeInView)}
            </span>
            <span className="text-[#11310C]/20">|</span>
            <span className="flex items-center gap-1 text-[#E13513]" title="Total de Saídas">
              <ArrowDownRight className="w-4 h-4 text-[#E13513]" />
              {formatCurrency(totalExpenseInView)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/90 border border-[#11310C]/20 text-xs font-bold text-[#11310C] hover:bg-white cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-[#C4C240]" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

          </div>
        </div>
      </div>

      {/* Main Search & Filters Toolbar */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-white/90 space-y-3.5">
        
        {/* ROW 1: Navigation, Search Input, and Layout/Config View Controls */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <div className="h-10 flex items-center justify-between gap-1 px-2 bg-[#11310C]/05 border border-[#11310C]/12 rounded-2xl flex-1 md:flex-initial">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-white text-[#11310C]/70 hover:text-[#11310C] transition-all cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-black text-[#11310C] px-3 text-center tracking-tight whitespace-nowrap min-w-[130px]">
                {formatPluggyMonthLabel(selectedMonth)}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-white text-[#11310C]/70 hover:text-[#11310C] transition-all cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Current Month badge or quick jump button */}
            {selectedMonth === currentMonthLabel ? (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 h-10 bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 rounded-2xl text-[11px] font-extrabold whitespace-nowrap select-none"
                title="Você está visualizando o mês atual"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Mês Atual</span>
              </div>
            ) : (
              <button
                onClick={() => onMonthChange?.(currentMonthLabel)}
                className="h-10 px-3 rounded-2xl bg-[#11310C] text-[#FAFBF6] hover:bg-[#11310C]/90 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title={`Voltar para o mês atual (${currentMonthLabel})`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#C4C240]" />
                <span>Mês Atual</span>
              </button>
            )}
          </div>

          {/* Search Field (Centered / Flex-1) */}
          <div className="relative flex-1 w-full h-10">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#11310C]/40" />
            <input
              type="text"
              placeholder="Buscar transação..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full h-full pl-10 pr-4 rounded-2xl bg-white/95 border border-[#11310C]/15 text-xs font-medium text-[#11310C] placeholder-[#11310C]/40 focus:outline-none focus:ring-2 focus:ring-[#C4C240] shadow-xs"
            />
          </div>

          {/* View Mode & Advanced Config Toggles */}
          <div className="h-10 flex items-center gap-1 p-1 bg-[#11310C]/05 border border-[#11310C]/12 rounded-2xl shrink-0 self-end md:self-auto">
            <button
              onClick={() => setViewStyle('pluggy')}
              title="Layout Pluggy (Agrupado por Data)"
              className={`h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                viewStyle === 'pluggy'
                  ? 'bg-[#11310C] text-[#FAFBF6]'
                  : 'text-[#11310C]/70 hover:text-[#11310C]'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewStyle('tabela')}
              title="Layout Tabela Tradicional"
              className={`h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                viewStyle === 'tabela'
                  ? 'bg-[#11310C] text-[#FAFBF6]'
                  : 'text-[#11310C]/70 hover:text-[#11310C]'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              title="Mais Configurações e Filtros Avançados"
              className={`h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showAdvancedFilters
                  ? 'bg-[#11310C] text-[#FAFBF6] shadow-xs'
                  : 'text-[#11310C]/70 hover:text-[#11310C]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ROW 2: Filter Controls (Accounts, Methods, Type Segmented Control) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Account Filter */}
            <CustomSelect
              value={filterAccount}
              onChange={setFilterAccount}
              buttonClassName="h-10 rounded-2xl"
              options={[
                { value: 'todas', label: 'Todas as Contas' },
                ...accounts.map((acc) => ({ value: acc, label: acc })),
              ]}
            />

            {/* Payment Method Filter */}
            <CustomSelect
              value={filterMethod}
              onChange={setFilterMethod}
              buttonClassName="h-10 rounded-2xl"
              options={[
                { value: 'todos', label: 'Todos os Métodos' },
                ...paymentMethods.map((pm) => ({ value: pm, label: pm })),
              ]}
            />

            {/* Quick Month Scope Toggle */}
            <div className="h-10 flex items-center gap-1 p-1 bg-[#11310C]/05 border border-[#11310C]/12 rounded-2xl shrink-0">
              <button
                onClick={() => setFilterMonthScope('selecionado')}
                className={`h-8 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                  filterMonthScope === 'selecionado'
                    ? 'bg-[#11310C] text-[#FAFBF6] shadow-xs'
                    : 'text-[#11310C]/70 hover:text-[#11310C]'
                }`}
                title="Mostrar apenas transações do mês selecionado"
              >
                Mês Selecionado
              </button>
              <button
                onClick={() => setFilterMonthScope('todos')}
                className={`h-8 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                  filterMonthScope === 'todos'
                    ? 'bg-[#11310C] text-[#FAFBF6] shadow-xs'
                    : 'text-[#11310C]/70 hover:text-[#11310C]'
                }`}
                title="Mostrar todas as transações de todas as datas"
              >
                Todos os Meses ({transactions.length})
              </button>
            </div>
          </div>

          {/* Type Segmented Control */}
          <div className="h-10 flex items-center gap-1 p-1 bg-[#11310C]/05 border border-[#11310C]/12 rounded-2xl shrink-0">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'income', label: 'Entradas' },
              { id: 'expense', label: 'Saídas' },
              { id: 'investment', label: 'Aportes' },
              { id: 'reembolso', label: 'Reembolsos' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id as any)}
                className={`h-8 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                  filterType === t.id
                    ? 'bg-[#11310C] text-[#FAFBF6] shadow-xs'
                    : 'text-[#11310C]/70 hover:text-[#11310C]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Extended Configuration Panel (Toggled via SlidersHorizontal icon) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-[#11310C]/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-[#11310C]/03 p-4 rounded-2xl border border-[#11310C]/08">
            {/* 1. Escopo de Meses */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#11310C]/70 block">Escopo de Meses</label>
              <div className="h-10 flex items-center gap-1 p-1 bg-white rounded-xl border border-[#11310C]/15">
                <button
                  onClick={() => setFilterMonthScope('selecionado')}
                  className={`flex-1 h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                    filterMonthScope === 'selecionado'
                      ? 'bg-[#11310C] text-[#FAFBF6]'
                      : 'text-[#11310C]/70 hover:text-[#11310C]'
                  }`}
                >
                  Mês Selecionado
                </button>
                <button
                  onClick={() => setFilterMonthScope('todos')}
                  className={`flex-1 h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                    filterMonthScope === 'todos'
                      ? 'bg-[#11310C] text-[#FAFBF6]'
                      : 'text-[#11310C]/70 hover:text-[#11310C]'
                  }`}
                >
                  Todos os Meses
                </button>
              </div>
            </div>

            {/* 2. Mês de Referência */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#11310C]/70 block">Mês de Referência</label>
              <div className="h-10 flex items-center gap-1 p-1 bg-white rounded-xl border border-[#11310C]/15">
                <button
                  onClick={() => setFilterMode('compra')}
                  className={`flex-1 h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                    filterMode === 'compra'
                      ? 'bg-[#11310C] text-[#FAFBF6]'
                      : 'text-[#11310C]/70 hover:text-[#11310C]'
                  }`}
                  title="Prioriza Mês em que a compra foi efetuada"
                >
                  Mês da Compra
                </button>
                <button
                  onClick={() => setFilterMode('fatura')}
                  className={`flex-1 h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
                    filterMode === 'fatura'
                      ? 'bg-[#11310C] text-[#FAFBF6]'
                      : 'text-[#11310C]/70 hover:text-[#11310C]'
                  }`}
                  title="Prioriza Mês do Vencimento/Fatura do Cartão"
                >
                  Mês Vencimento
                </button>
              </div>
            </div>

            {/* 3. Filtro de Categorias */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#11310C]/70 block">Categoria</label>
              <CustomSelect
                value={filterCategory}
                onChange={setFilterCategory}
                buttonClassName="w-full h-10 rounded-xl"
                options={[
                  { value: 'todas', label: 'Todas as Categorias' },
                  ...categories.map((cat) => ({ value: cat, label: cat })),
                ]}
              />
            </div>

            {/* 4. Filtro de Dias */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#11310C]/70 block">Dia do Mês</label>
              <CustomSelect
                value={filterDay}
                onChange={setFilterDay}
                buttonClassName="w-full h-10 rounded-xl"
                options={[
                  { value: 'todos', label: 'Todos os Dias' },
                  ...daysInMonth.map((d) => ({ value: String(d), label: `Dia ${d}` })),
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Extrato Content */}
      {viewStyle === 'pluggy' ? (
        /* PLUGGY GROUPED LAYOUT */
        <div className="space-y-6">
          {groupedDateKeys.length > 0 ? (
            groupedDateKeys.map((dateKey) => {
              const dayTxs = groupedTransactionsMap[dateKey];
              const { dayNum, weekDay } = formatGroupHeaderDate(dateKey);

              return (
                <div key={dateKey} className="space-y-2">
                  {/* Pluggy Day Header */}
                  <div className="flex items-baseline gap-2 px-1 pt-2">
                    <span className="text-xl sm:text-2xl font-black text-[#11310C] tracking-tight">
                      {dayNum}
                    </span>
                    <span className="text-xs font-bold text-[#11310C]/60 capitalize">
                      {weekDay}
                    </span>
                  </div>

                  {/* List of Transactions for this day */}
                  <div className="bg-white/90 rounded-3xl border border-[#11310C]/10 divide-y divide-[#11310C]/06 overflow-hidden shadow-xs">
                    {dayTxs.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-[#FAFBF6]/80 transition-all group"
                      >
                        {/* Left: Icon & Description & Subtitle Metadata */}
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                              tx.type === 'income'
                                ? 'bg-emerald-100/80 text-emerald-800'
                                : tx.type === 'expense'
                                ? 'bg-[#FDECE9] text-[#E13513]'
                                : 'bg-[#C4C240]/25 text-[#11310C]'
                            }`}
                          >
                            {tx.type === 'income' ? (
                              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                            ) : tx.type === 'expense' ? (
                              <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#E13513]" />
                            ) : (
                              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#11310C]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-extrabold text-xs sm:text-sm text-[#11310C] truncate">
                              {tx.description}
                            </div>
                            {/* Metadata Subtitle Tags */}
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10px] sm:text-[11px] text-[#11310C]/60 font-medium">
                              <span className="font-bold text-[#11310C] px-1.5 py-0.5 rounded bg-[#11310C]/08">
                                {tx.account || 'Geral'}
                              </span>
                              <span>·</span>
                              <span className="font-semibold text-[#11310C] px-1.5 py-0.5 rounded bg-[#C4C240]/25">
                                {tx.paymentMethod || 'PIX'}
                              </span>
                              <span>·</span>
                              <span className="text-[#11310C]/80 font-medium">
                                {tx.category}
                              </span>
                              {tx.isCreditCard && tx.invoiceDueDateStr && (
                                <>
                                  <span>·</span>
                                  <span className="text-[9px] font-extrabold text-[#11310C] bg-[#C4C240]/40 px-1.5 py-0.5 rounded border border-[#C4C240]/60">
                                    Fatura: {tx.invoiceDueDateStr} ({tx.effectiveMonthLabel})
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount */}
                        <div
                          className={`font-black text-sm sm:text-base whitespace-nowrap text-right ${
                            tx.type === 'income'
                              ? 'text-emerald-700'
                              : tx.type === 'expense'
                              ? 'text-[#E13513]'
                              : 'text-[#11310C]'
                          }`}
                        >
                          {tx.type === 'income' || tx.type === 'reembolso' ? '+' : ''}
                          {formatCurrency(tx.type === 'expense' ? -Math.abs(tx.amount) : tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center text-xs font-bold text-[#11310C]/60 border border-white/90">
              Nenhum lançamento encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      ) : (
        /* TRADITIONAL TABLE LAYOUT */
        <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#11310C]">
              <thead>
                <tr className="border-b border-[#11310C]/10 text-[10px] font-bold uppercase tracking-wider text-[#11310C]/60">
                  <th className="pb-3 px-2 whitespace-nowrap">Data</th>
                  <th className="pb-3 px-2 whitespace-nowrap">Descrição</th>
                  <th className="pb-3 px-2 whitespace-nowrap">Conta</th>
                  <th className="pb-3 px-2 whitespace-nowrap">Tipo / Cartão</th>
                  <th className="pb-3 px-2 whitespace-nowrap">Categoria</th>
                  <th className="pb-3 px-2 whitespace-nowrap text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#11310C]/5 font-semibold">
                {sortedFilteredTransactions.length > 0 ? (
                  sortedFilteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/80 transition-all">
                      <td className="py-3.5 px-2 text-[#11310C]/80 font-mono text-[11px] whitespace-nowrap">
                        <div>{formatDateBR(tx.date)}</div>
                        {tx.isCreditCard && tx.invoiceDueDateStr && (
                          <div className="mt-0.5">
                            <span className="inline-block whitespace-nowrap text-[9px] font-extrabold text-[#11310C] bg-[#C4C240]/30 px-1.5 py-0.5 rounded-md border border-[#C4C240]/60">
                              Fatura Venc.: {tx.invoiceDueDateStr} ({tx.effectiveMonthLabel})
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              tx.type === 'income'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.type === 'expense'
                                ? 'bg-[#FDECE9] text-[#E13513]'
                                : 'bg-[#C4C240]/25 text-[#11310C]'
                            }`}
                          >
                            {tx.type === 'income' ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700" />
                            ) : tx.type === 'expense' ? (
                              <ArrowDownRight className="w-3.5 h-3.5 text-[#E13513]" />
                            ) : (
                              <TrendingUp className="w-3.5 h-3.5 text-[#11310C]" />
                            )}
                          </div>
                          <span className="font-extrabold text-[#11310C]">{tx.description}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#11310C]/10 text-[#11310C] whitespace-nowrap inline-block">
                          {tx.account || 'Geral'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-[#C4C240]/20 text-[#11310C] border border-[#C4C240]/40 whitespace-nowrap inline-block">
                          {tx.paymentMethod || 'PIX'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#11310C]/60 bg-white px-2 py-0.5 rounded-md border border-[#11310C]/10 whitespace-nowrap">
                          {tx.category}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-2 text-right font-extrabold text-sm whitespace-nowrap ${
                          tx.type === 'income'
                            ? 'text-emerald-700'
                            : tx.type === 'expense'
                            ? 'text-[#E13513]'
                            : 'text-[#11310C]'
                        }`}
                      >
                        {tx.type === 'income' || tx.type === 'reembolso' ? '+' : ''}
                        {formatCurrency(tx.type === 'expense' ? -Math.abs(tx.amount) : tx.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#11310C]/60 font-bold">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
