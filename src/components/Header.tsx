import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  FileSpreadsheet,
  Calendar,
  ChevronDown,
  Search,
  Settings,
  X,
  TrendingUp,
  CreditCard,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { TomatoIcon } from './TomatoIcon';
import { Transaction, Investment, CreditCardSheet, Debtor, UserProfile } from '../types';
import { formatCurrency } from '../utils/formatters';
import { getCurrentMonthLabel } from '../utils/sheetParser';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  monthsList: string[];
  onOpenManualModal: () => void;
  onNavigateToTab: (tabId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  transactions?: Transaction[];
  investments?: Investment[];
  creditCards?: CreditCardSheet[];
  debtors?: Debtor[];
  googleUser?: UserProfile | null;
  isLoggingIn?: boolean;
  onGoogleLogin?: () => void;
  onRefreshSheets?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  onMonthChange,
  monthsList,
  onOpenManualModal,
  onNavigateToTab,
  searchQuery,
  onSearchChange,
  transactions = [],
  investments = [],
  creditCards = [],
  debtors = [],
  googleUser,
  isLoggingIn = false,
  onGoogleLogin,
  onRefreshSheets,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  const handleHeaderSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    if (onRefreshSheets) onRefreshSheets();
    setTimeout(() => setIsSyncing(false), 1200);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search filtering across all data items
  const query = searchQuery.trim().toLowerCase();
  const matchedTransactions = query
    ? transactions.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.paymentMethod.toLowerCase().includes(query)
      )
    : [];

  const matchedInvestments = query
    ? investments.filter(
        (i) => i.name.toLowerCase().includes(query) || i.category.toLowerCase().includes(query)
      )
    : [];

  const matchedCards = query
    ? creditCards.filter((c) => c.name.toLowerCase().includes(query) || c.bank.toLowerCase().includes(query))
    : [];

  const matchedDebtors = query
    ? debtors.filter((d) => d.borrowerName.toLowerCase().includes(query) || d.description.toLowerCase().includes(query))
    : [];

  const hasResults =
    matchedTransactions.length > 0 ||
    matchedInvestments.length > 0 ||
    matchedCards.length > 0 ||
    matchedDebtors.length > 0;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#F8F9F3]/90 border-b border-[#11310C]/10 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 relative">
        {/* Brand & Logo */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div
            onClick={() => onNavigateToTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Logo pill */}
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md shadow-[#11310C]/10 border border-[#11310C]/15 glaze-shine group-hover:scale-105 transition-all">
              <TomatoIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-black text-2xl tracking-tight text-[#11310C]">
                  Strato
                </span>
              </div>
            </div>
          </div>

          {/* Brand & Title */}
        </div>

        {/* Search & Month Filter & CTA & Settings */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Global Interactive Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#11310C]/40" />
            <input
              type="text"
              placeholder="Buscar em ativos, extrato, cartões..."
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-2xl text-xs font-medium bg-white/90 border border-[#11310C]/15 focus:outline-none focus:ring-2 focus:ring-[#C4C240] focus:border-transparent transition-all placeholder-[#11310C]/40 text-[#11310C]"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#11310C]/40 hover:text-[#11310C]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Interactive Search Results Popup */}
            {isSearchFocused && query && (
              <div className="absolute top-12 left-0 w-full sm:w-80 bg-white rounded-2xl border border-[#11310C]/15 shadow-2xl p-3 z-50 space-y-2 max-h-80 overflow-y-auto">
                {!hasResults ? (
                  <p className="text-xs text-[#11310C]/60 text-center py-4">
                    Nenhum resultado para "{searchQuery}"
                  </p>
                ) : (
                  <>
                    {/* Transactions */}
                    {matchedTransactions.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#11310C]/50 px-2 block mb-1">
                          Lançamentos / Extrato ({matchedTransactions.length})
                        </span>
                        {matchedTransactions.slice(0, 3).map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              onNavigateToTab('extrato');
                              setIsSearchFocused(false);
                            }}
                            className="p-2 hover:bg-[#F8F9F3] rounded-xl flex items-center justify-between cursor-pointer text-xs"
                          >
                            <span className="font-semibold text-[#11310C] truncate max-w-[170px]">{t.description}</span>
                            <span className={t.type === 'income' ? 'text-emerald-700 font-bold' : 'text-[#E13513] font-bold'}>
                              {formatCurrency(t.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Investments */}
                    {matchedInvestments.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#11310C]/50 px-2 block mb-1">
                          Investimentos ({matchedInvestments.length})
                        </span>
                        {matchedInvestments.slice(0, 3).map((i) => (
                          <div
                            key={i.id}
                            onClick={() => {
                              onNavigateToTab('investimentos');
                              setIsSearchFocused(false);
                            }}
                            className="p-2 hover:bg-[#F8F9F3] rounded-xl flex items-center justify-between cursor-pointer text-xs"
                          >
                            <span className="font-semibold text-[#11310C] truncate max-w-[170px]">{i.name}</span>
                            <span className="font-bold text-[#11310C]">{formatCurrency(i.currentValue)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cards */}
                    {matchedCards.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#11310C]/50 px-2 block mb-1">
                          Cartões ({matchedCards.length})
                        </span>
                        {matchedCards.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              onNavigateToTab('cartoes');
                              setIsSearchFocused(false);
                            }}
                            className="p-2 hover:bg-[#F8F9F3] rounded-xl flex items-center justify-between cursor-pointer text-xs"
                          >
                            <span className="font-semibold text-[#11310C]">{c.name}</span>
                            <span className="font-bold text-[#E13513]">{formatCurrency(c.currentInvoice)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Custom Styled Month Selector Pill */}
          <div className="relative inline-block" ref={monthDropdownRef}>
            <button
              type="button"
              onClick={() => setIsMonthOpen(!isMonthOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-white border border-[#11310C]/15 text-[#11310C] text-xs font-extrabold cursor-pointer transition-all shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-[#C4C240]" />
              <span>{selectedMonth}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#11310C]/60 transition-transform duration-200 ${isMonthOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMonthOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl border border-[#11310C]/15 shadow-2xl p-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95">
                {monthsList.map((m) => {
                  const isSelected = m === selectedMonth;
                  const isCurrent = m === getCurrentMonthLabel();
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        onMonthChange(m);
                        setIsMonthOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#11310C] text-[#FAFBF6]'
                          : 'text-[#11310C] hover:bg-[#F8F9F3]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{m}</span>
                        {isCurrent && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider ${
                            isSelected ? 'bg-[#C4C240] text-[#11310C]' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            Atual
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#C4C240]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Manual Sync Button */}
          <button
            onClick={handleHeaderSync}
            disabled={isSyncing}
            className="p-2.5 rounded-2xl bg-[#11310C] hover:bg-[#1A4713] text-[#FAFBF6] cursor-pointer transition-all shadow-xs disabled:opacity-50 flex items-center justify-center"
            title="Atualizar dados da planilha"
          >
            <RefreshCw className={`w-4 h-4 text-[#C4C240] ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => onNavigateToTab('configuracoes')}
            className="p-2 rounded-2xl bg-white/90 hover:bg-white border border-[#11310C]/15 text-[#11310C] shadow-xs cursor-pointer transition-all"
            title="Configurações"
          >
            <Settings className="w-4 h-4 text-[#11310C]" />
          </button>

          {/* Registro Manual Button */}
          <button
            onClick={onOpenManualModal}
            className="liquid-button flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-[#11310C] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">Novo Lançamento</span>
          </button>
        </div>
      </div>
    </header>
  );
};


