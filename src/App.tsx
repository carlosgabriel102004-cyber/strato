import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { NavTabs } from './components/NavTabs';
import { ManualRegistrationModal } from './components/ManualRegistrationModal';
import { DashboardView } from './components/DashboardView';
import { ResumoView } from './components/ResumoView';
import { InvestimentosView } from './components/InvestimentosView';
import { CartoesAssinaturasView } from './components/CartoesAssinaturasView';
import { DividasView } from './components/DividasView';
import { MetasView } from './components/MetasView';
import { ConfiguracoesView } from './components/ConfiguracoesView';
import { ExtratoView } from './components/ExtratoView';
import { getTransactionAllocatedMonthLabel, getCurrentMonthLabel } from './utils/sheetParser';

import {
  MOCK_TRANSACTIONS,
  MOCK_MONTHS_SUMMARY,
  MOCK_CREDIT_CARDS,
  MOCK_INVESTMENTS,
  MOCK_DEBTS,
  MOCK_SUBSCRIPTIONS,
  MOCK_SPREADSHEETS,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_DEBTORS,
  INITIAL_FINANCIAL_GOALS,
} from './data/mockData';
import { Transaction, SpreadsheetConnection, FinancialGoal, Debtor, TaxSettings, MonthSummaryData, AuthErrorInfo, UserProfile, Subscription, SubscriptionMonthPayment, NewRecurringCharge } from './types';
import { initAuth, googleSignIn, logout, parseAuthError } from './lib/auth';
import { loadFinanceData, insertTransaction, insertSubscription, setSubscriptionActive, setCardLimit } from './lib/financeRepository';
import { LoginScreen } from './components/LoginScreen';
import { PaymentRemindersModal } from './components/PaymentRemindersModal';
import { buildPaymentReminders } from './utils/paymentReminders';
import { getCardInvoicePaymentKey, getSubscriptionPaymentKey } from './utils/subscriptions';

const getTabFromHash = (): string => {
  if (typeof window === 'undefined') return 'dashboard';
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  const validTabs = ['dashboard', 'resumo', 'investimentos', 'cartoes', 'dividas', 'metas', 'extrato', 'configuracoes'];
  return validTabs.includes(rawHash) ? rawHash : 'dashboard';
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
  }
  return fallback;
}

const FINANCE_CACHE_KEYS = [
  'strato_transactions', 'strato_months_data', 'strato_credit_cards', 'strato_investments',
  'strato_debtors', 'strato_subscriptions', 'strato_spreadsheets',
];

// Financial data is cached in the browser for a fast first paint; wipe it when nobody is signed in.
function clearCachedFinanceData() {
  try {
    FINANCE_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage unavailable: nothing to clear
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<string>(getTabFromHash);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthLabel());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Sync hash changes (URL back/forward and direct links)
  useEffect(() => {
    const handleHashChange = () => {
      const currentTab = getTabFromHash();
      if (currentTab !== activeTab) {
        setActiveTab(currentTab);
        if (currentTab === 'extrato') {
          setSelectedMonth(getCurrentMonthLabel());
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'extrato') {
      setSelectedMonth(getCurrentMonthLabel());
    }
    if (window.location.hash !== `#/${tabId}`) {
      window.location.hash = `#/${tabId}`;
    }
  };

  // App domain persistent state
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage('strato_transactions', MOCK_TRANSACTIONS)
  );
  const [monthsData, setMonthsData] = useState(() =>
    loadFromStorage('strato_months_data', MOCK_MONTHS_SUMMARY)
  );
  const [creditCards, setCreditCards] = useState(() =>
    loadFromStorage('strato_credit_cards', MOCK_CREDIT_CARDS)
  );
  const [investments, setInvestments] = useState(() =>
    loadFromStorage('strato_investments', MOCK_INVESTMENTS)
  );
  const [debts] = useState(MOCK_DEBTS);
  const [debtors, setDebtors] = useState<Debtor[]>(() =>
    loadFromStorage('strato_debtors', INITIAL_DEBTORS)
  );
  const [goals, setGoals] = useState<FinancialGoal[]>(() =>
    loadFromStorage('strato_goals', INITIAL_FINANCIAL_GOALS)
  );
  const [bankAccounts] = useState(INITIAL_BANK_ACCOUNTS);
  const [subscriptions, setSubscriptions] = useState(() =>
    loadFromStorage('strato_subscriptions', MOCK_SUBSCRIPTIONS)
  );
  const [subscriptionPayments, setSubscriptionPayments] = useState<Record<string, SubscriptionMonthPayment>>(() =>
    loadFromStorage('strato_subscription_payments', {})
  );
  const [cardInvoicePayments, setCardInvoicePayments] = useState<Record<string, boolean>>(() =>
    loadFromStorage('strato_card_invoice_payments', {})
  );
  const [didInitialSync, setDidInitialSync] = useState(false);
  const [showPaymentReminder, setShowPaymentReminder] = useState(false);
  const reminderShown = useRef(false);
  const cardInvoicePaymentsRef = useRef(cardInvoicePayments);
  cardInvoicePaymentsRef.current = cardInvoicePayments;
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetConnection[]>(() =>
    loadFromStorage('strato_spreadsheets', MOCK_SPREADSHEETS)
  );
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(() =>
    loadFromStorage('strato_tax_settings', { enabled: false, percentage: 6.0 })
  );
  const [usdRate, setUsdRate] = useState<number>(5.50);
  const [netUsdRate, setNetUsdRate] = useState<number>(5.401);

  // Auto-save effects for persistence across navigation/sessions
  useEffect(() => { localStorage.setItem('strato_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('strato_months_data', JSON.stringify(monthsData)); }, [monthsData]);
  
  // Ensure Setembro 2026 is present in monthsData if loaded from older storage cache
  useEffect(() => {
    setMonthsData((prev: any) => {
      if (prev && prev['Setembro 2026']) return prev;
      const baseMoney = prev?.['Agosto 2026']?.totalMoney || 62798.77;
      return {
        ...prev,
        'Setembro 2026': {
          month: 'Setembro 2026',
          totalMoney: baseMoney,
          totalIncome: 0,
          totalExpenses: 0,
          leftover: 0,
          totalInvestments: prev?.['Agosto 2026']?.totalInvestments || 0,
          totalDebts: 0,
          activeSubscriptionsCount: 4,
          monthlyGrowthPercent: 1.67,
          isProjected: false,
        },
      };
    });
  }, []);
  useEffect(() => { localStorage.setItem('strato_credit_cards', JSON.stringify(creditCards)); }, [creditCards]);
  useEffect(() => { localStorage.setItem('strato_investments', JSON.stringify(investments)); }, [investments]);
  useEffect(() => { localStorage.setItem('strato_debtors', JSON.stringify(debtors)); }, [debtors]);
  useEffect(() => { localStorage.setItem('strato_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('strato_subscriptions', JSON.stringify(subscriptions)); }, [subscriptions]);
  useEffect(() => { localStorage.setItem('strato_subscription_payments', JSON.stringify(subscriptionPayments)); }, [subscriptionPayments]);
  useEffect(() => { localStorage.setItem('strato_card_invoice_payments', JSON.stringify(cardInvoicePayments)); }, [cardInvoicePayments]);
  useEffect(() => { localStorage.setItem('strato_spreadsheets', JSON.stringify(spreadsheets)); }, [spreadsheets]);
  useEffect(() => { localStorage.setItem('strato_tax_settings', JSON.stringify(taxSettings)); }, [taxSettings]);

  // Auth state
  const [googleUser, setGoogleUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchLiveSheets = useCallback(async () => {
    try {
      const data: any = await loadFinanceData();
      setSyncError(null);

      if (data && data.success) {
        if (data.sheets && Array.isArray(data.sheets)) {
          setSpreadsheets((prev) =>
            prev.map((sheet) => {
              const found = data.sheets.find((s: any) => s.id === sheet.id);
              if (found) {
                return {
                  ...sheet,
                  status: found.status,
                  description: found.message || sheet.description,
                  recordsCount: found.linesCount !== undefined ? found.linesCount : sheet.recordsCount,
                  lastSync: found.status === 'conectado' ? 'Sincronizado com o banco de dados' : 'Erro ao sincronizar',
                };
              }
              return sheet;
            })
          );
        }

        if (data.investments && Array.isArray(data.investments) && data.investments.length > 0) {
          setInvestments(data.investments);
        } else if (data.investmentsUSD && Array.isArray(data.investmentsUSD) && data.investmentsUSD.length > 0) {
          setInvestments((prev) => {
            const nonUs = prev.filter((i) => i.category !== 'Internacional');
            return [...nonUs, ...data.investmentsUSD];
          });
        }

        if (data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0) {
          setTransactions(data.transactions);
        }

        if (data.cards && Array.isArray(data.cards) && data.cards.length > 0) {
          const month = getCurrentMonthLabel();
          setCreditCards(data.cards.map((card: any) => ({
            ...card,
            isPaid: Boolean(cardInvoicePaymentsRef.current[getCardInvoicePaymentKey(card.name, month)]),
          })));
        }

        if (data.subscriptions && Array.isArray(data.subscriptions) && data.subscriptions.length > 0) {
          const sheetSubscriptionNames = new Set(data.subscriptions.map((sub: Subscription) => sub.serviceName.trim().toLowerCase()));
          setSubscriptions((prev) => [
            ...data.subscriptions,
            ...prev.filter((sub) => sub.id.startsWith('sub-local-') && !sheetSubscriptionNames.has(sub.serviceName.trim().toLowerCase())),
          ]);
        }

        if (data.debtors && Array.isArray(data.debtors) && data.debtors.length > 0) {
          setDebtors(data.debtors);
        }

        if (data.usdRate) {
          setUsdRate(data.usdRate);
        }
        if (data.netUsdRate) {
          setNetUsdRate(data.netUsdRate);
        }

        if (data.totaisMatrix && data.totaisMatrix.months && Array.isArray(data.totaisMatrix.months)) {
          const { months, accounts, totalsRowMap, isNewFormat, accountCols, allRows } = data.totaisMatrix;
          const activeTxs = (data.transactions && Array.isArray(data.transactions)) ? data.transactions : transactions;

          const monthNumMap: Record<string, string> = {
            'maio': '05',
            'junho': '06',
            'julho': '07',
            'agosto': '08',
            'setembro': '09',
            'outubro': '10',
            'novembro': '11',
            'dezembro': '12',
          };

          const activeInvs = (data.investments && Array.isArray(data.investments)) ? data.investments : investments;
          const calcTotalInvestments = activeInvs.reduce((acc: number, inv: any) => acc + (inv.currentValue || 0), 0);
          const calcTotalDebts = data.debtorsSummary ? data.debtorsSummary.restanteTotal : 0;
          const calcSubscriptionsCount = (data.subscriptions && Array.isArray(data.subscriptions)) ? data.subscriptions.length : 3;

          const newMonthsData: Record<string, MonthSummaryData> = {};

          if (isNewFormat && Array.isArray(allRows)) {
            allRows.forEach((r: any) => {
              const mKey = r.monthLabel;
              let monthIncome = 0;
              let monthExpenses = 0;

              if (activeTxs) {
                activeTxs.forEach((tx: Transaction) => {
                  const allocatedMonth = getTransactionAllocatedMonthLabel(tx);
                  if (allocatedMonth === mKey) {
                    if (tx.type === 'income') monthIncome += tx.amount;
                    else if (tx.type === 'expense') monthExpenses += tx.amount;
                  }
                });
              }

              newMonthsData[mKey] = {
                month: mKey,
                totalMoney: r.total || 0,
                totalIncome: monthIncome,
                totalExpenses: monthExpenses,
                leftover: monthIncome - monthExpenses,
                monthlyGrowthPercent: 0,
                totalInvestments: calcTotalInvestments,
                totalDebts: calcTotalDebts,
                activeSubscriptionsCount: calcSubscriptionsCount,
                accountDetailsRows: allRows,
                accountColumnsMeta: accountCols,
                accountBalances: r.balances,
                isProjected: mKey.toLowerCase().includes('setembro 2026') ? false : !!r.isProjected,
              };
            });
          } else {
            months.forEach((mRaw: string) => {
              if (!mRaw) return;
              const lowerRaw = mRaw.trim().toLowerCase();
              const capRaw = lowerRaw.charAt(0).toUpperCase() + lowerRaw.slice(1);
              const mKey = capRaw.includes('202') ? capRaw : `${capRaw} 2026`;

              let totalMoney = totalsRowMap ? totalsRowMap[mRaw] || 0 : 0;
              if (!totalMoney && accounts) {
                accounts.forEach((acc: any) => {
                  totalMoney += (acc.balances && acc.balances[mRaw]) ? acc.balances[mRaw] : 0;
                });
              }

              if (totalMoney <= 0 && !mKey.toLowerCase().includes('setembro 2026')) return;

              let monthIncome = 0;
              let monthExpenses = 0;

              if (activeTxs) {
                activeTxs.forEach((tx: Transaction) => {
                  const allocatedMonth = getTransactionAllocatedMonthLabel(tx);
                  if (allocatedMonth === mKey) {
                    if (tx.type === 'income') monthIncome += tx.amount;
                    else if (tx.type === 'expense') monthExpenses += tx.amount;
                  }
                });
              }

              newMonthsData[mKey] = {
                month: mKey,
                totalMoney: totalMoney || 0,
                totalIncome: monthIncome,
                totalExpenses: monthExpenses,
                leftover: monthIncome - monthExpenses,
                monthlyGrowthPercent: 0,
                totalInvestments: calcTotalInvestments,
                totalDebts: calcTotalDebts,
                activeSubscriptionsCount: calcSubscriptionsCount,
                isProjected: false,
              };
            });
          }

          // Ensure Setembro 2026 is present in newMonthsData
          if (!newMonthsData['Setembro 2026']) {
            let sIncome = 0;
            let sExpenses = 0;
            if (activeTxs) {
              activeTxs.forEach((tx: Transaction) => {
                const allocated = getTransactionAllocatedMonthLabel(tx);
                if (allocated === 'Setembro 2026') {
                  if (tx.type === 'income') sIncome += tx.amount;
                  else if (tx.type === 'expense') sExpenses += tx.amount;
                }
              });
            }
            const prevTotal = newMonthsData['Agosto 2026']?.totalMoney || 62798.77;
            newMonthsData['Setembro 2026'] = {
              month: 'Setembro 2026',
              totalMoney: prevTotal + (sIncome - sExpenses),
              totalIncome: sIncome,
              totalExpenses: sExpenses,
              leftover: sIncome - sExpenses,
              monthlyGrowthPercent: 0,
              totalInvestments: calcTotalInvestments,
              totalDebts: calcTotalDebts,
              activeSubscriptionsCount: calcSubscriptionsCount,
              isProjected: false,
            };
          }

          // Calculate sequential growth percentage
          const mKeys = Object.keys(newMonthsData);
          mKeys.forEach((k, idx) => {
            if (idx > 0) {
              const prevVal = newMonthsData[mKeys[idx - 1]].totalMoney;
              const currVal = newMonthsData[k].totalMoney;
              if (prevVal > 0 && currVal > 0) {
                newMonthsData[k].monthlyGrowthPercent = parseFloat((((currVal - prevVal) / prevVal) * 100).toFixed(2));
              }
            }
          });

          if (mKeys.length > 0) {
            setMonthsData(newMonthsData);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load data from Supabase:', err);
      setSyncError(err?.message || 'Falha ao carregar os dados.');
    } finally {
      setDidInitialSync(true);
    }
  }, []);

  // Errors from the Google/Supabase redirect come back in the URL (e.g. sign-ups blocked)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const description = params.get('error_description') || hashParams.get('error_description');
    if (!description) return;
    const blocked = /saving new user|desativado/i.test(description);
    setAuthError({
      code: 'signup-blocked',
      title: blocked ? 'Esta conta não tem acesso ao Strato' : 'Não foi possível entrar',
      message: description,
      solution: blocked
        ? 'O cadastro de novas contas está desativado. Entre com a conta Google autorizada.'
        : description,
    });
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth((user) => {
      setGoogleUser(user);
      setAuthReady(true);
      if (user) {
        fetchLiveSheets();
      } else {
        clearCachedFinanceData();
      }
    });
    return () => unsubscribe();
  }, [fetchLiveSheets]);

  // Auto-refresh data as soon as the user opens/focuses the Chrome tab
  useEffect(() => {
    let lastAutoSync = 0;
    const handleTabActive = () => {
      if (document.visibilityState === 'visible' && googleUser) {
        const now = Date.now();
        if (now - lastAutoSync > 2500) {
          lastAutoSync = now;
          fetchLiveSheets();
        }
      }
    };

    window.addEventListener('focus', handleTabActive);
    document.addEventListener('visibilitychange', handleTabActive);

    return () => {
      window.removeEventListener('focus', handleTabActive);
      document.removeEventListener('visibilitychange', handleTabActive);
    };
  }, [fetchLiveSheets, googleUser]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await googleSignIn(); // redirects to Google and comes back signed in
    } catch (e: any) {
      console.error('Google Sign in failed:', e);
      setAuthError(parseAuthError(e));
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    clearCachedFinanceData();
    window.location.reload(); // drop everything held in memory
  };

  const handleAddGoal = (newGoal: Omit<FinancialGoal, 'id'>) => {
    const created: FinancialGoal = {
      ...newGoal,
      id: `goal-${Date.now()}`,
    };
    setGoals((prev) => [...prev, created]);
  };

  const handleUpdateGoalProgress = (id: string, additionalAmount: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, currentAmount: g.currentAmount + additionalAmount } : g))
    );
  };

  const monthsList = Object.keys(monthsData);
  const currentMonthSummary = monthsData[selectedMonth] || monthsData[getCurrentMonthLabel()] || monthsData['Setembro 2026'] || monthsData['Agosto 2026'];

  const paymentReminders = useMemo(
    () => buildPaymentReminders(new Date(), getCurrentMonthLabel(), subscriptions, subscriptionPayments, creditCards, cardInvoicePayments),
    [subscriptions, subscriptionPayments, creditCards, cardInvoicePayments]
  );
  useEffect(() => {
    if (didInitialSync && !reminderShown.current) {
      reminderShown.current = true;
      if (paymentReminders.length > 0) setShowPaymentReminder(true);
    }
  }, [didInitialSync, paymentReminders]);

  // Save a new transaction in Supabase, then reload so every total is recalculated
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    await insertTransaction(newTx);
    await fetchLiveSheets();
  };

  const handleUpdateMonthSummary = (monthKey: string, updated: Partial<MonthSummaryData>) => {
    setMonthsData((prev) => {
      const current = prev[monthKey] || prev['Agosto 2026'];
      const totalIncome = updated.totalIncome !== undefined ? updated.totalIncome : current.totalIncome;
      const totalExpenses = updated.totalExpenses !== undefined ? updated.totalExpenses : current.totalExpenses;
      const totalInvestments = updated.totalInvestments !== undefined ? updated.totalInvestments : current.totalInvestments;
      const leftover = totalIncome - totalExpenses;

      return {
        ...prev,
        [monthKey]: {
          ...current,
          ...updated,
          totalIncome,
          totalExpenses,
          totalInvestments,
          leftover,
        },
      };
    });
  };

  const handleUpdateCardLimit = (cardId: string, newLimit: number) => {
    const previous = creditCards;
    setCreditCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId ? { ...card, limit: newLimit } : card
      )
    );
    setCardLimit(cardId, newLimit).catch((err) => {
      console.error(err);
      setCreditCards(previous);
      window.alert(err.message);
    });
  };

  const handleToggleCardPaid = (cardId: string) => {
    const card = creditCards.find((item) => item.id === cardId);
    if (!card) return;
    const key = getCardInvoicePaymentKey(card.name, getCurrentMonthLabel());
    const nextPaid = !cardInvoicePayments[key];
    setCardInvoicePayments((prev) => ({ ...prev, [key]: nextPaid }));
    setCreditCards((prevCards) => prevCards.map((item) => item.id === cardId ? { ...item, isPaid: nextPaid } : item));
  };

  const handleToggleSubscriptionStatus = (subId: string) => {
    const target = subscriptions.find((sub) => sub.id === subId);
    if (target) {
      const nextActive = !(target.status === 'ativa' || target.active);
      setSubscriptionActive(subId, nextActive).catch((err) => {
        console.error(err);
        window.alert(err.message);
        fetchLiveSheets();
      });
    }
    setSubscriptions((prevSubs) =>
      prevSubs.map((sub) => {
        if (sub.id === subId) {
          const isAct = sub.status === 'ativa' || sub.active;
          const nextStatus = isAct ? 'pausada' : 'ativa';
          return { ...sub, status: nextStatus, active: !isAct };
        }
        return sub;
      })
    );
  };

  const handleUpdateSubscriptionPayment = (serviceName: string, month: string, update: Partial<SubscriptionMonthPayment>) => {
    const key = getSubscriptionPaymentKey(serviceName, month);
    setSubscriptionPayments((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...update },
    }));
  };

  const handleAddRecurringCharge = async (charge: NewRecurringCharge) => {
    await insertSubscription(charge);
    await fetchLiveSheets();
  };

  const handleAddSpreadsheet = (sheet: SpreadsheetConnection) => {
    setSpreadsheets((prev) => [sheet, ...prev]);
  };

  const handleImportCsvTransactions = (newTxs: Transaction[]) => {
    setTransactions((prev) => [...newTxs, ...prev]);
  };

  // Find total money sheet
  const totalMoneySheet = spreadsheets.find((s) => s.type === 'total_mes') || spreadsheets[0];

  if (!authReady || !googleUser) {
    return (
      <LoginScreen
        isLoading={!authReady}
        isLoggingIn={isLoggingIn}
        onGoogleLogin={handleGoogleLogin}
        authError={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9F3] text-[#11310C] font-sans selection:bg-[#C4C240] selection:text-[#11310C]">
      {syncError && (
        <div className="bg-[#E8402A] text-white text-xs font-semibold px-4 py-2 text-center">
          Não foi possível carregar seus dados: {syncError}{' '}
          <button className="underline font-bold" onClick={() => fetchLiveSheets()}>Tentar de novo</button>
        </div>
      )}
      {/* Header Bar */}
      <Header
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        monthsList={monthsList}
        onOpenManualModal={() => setIsManualModalOpen(true)}
        onNavigateToTab={handleSelectTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        transactions={transactions}
        investments={investments}
        creditCards={creditCards}
        debtors={debtors}
        googleUser={googleUser}
        isLoggingIn={isLoggingIn}
        onGoogleLogin={handleGoogleLogin}
        onRefreshSheets={() => fetchLiveSheets()}
      />

      {/* Main Navigation Tabs */}
      <NavTabs activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Main Content Area */}
      <main className="transition-all duration-300">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                currentMonthData={currentMonthSummary}
                allMonthsData={monthsData}
                recentTransactions={transactions}
                creditCards={creditCards.map((card) => ({
                  ...card,
                  isPaid: Boolean(cardInvoicePayments[getCardInvoicePaymentKey(card.name, getCurrentMonthLabel())]),
                }))}
                subscriptions={subscriptions}
                selectedMonth={selectedMonth}
                onNavigateToTab={handleSelectTab}
                onOpenManualModal={() => setIsManualModalOpen(true)}
                onUpdateMonthData={handleUpdateMonthSummary}
                taxSettings={taxSettings}
              />
            )}

            {activeTab === 'resumo' && (
              <ResumoView
                currentMonthData={currentMonthSummary}
                allMonthsData={monthsData}
                totalMoneySheet={totalMoneySheet}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                monthsList={monthsList}
                investments={investments}
                goals={goals}
              />
            )}

            {activeTab === 'investimentos' && (
              <InvestimentosView
                investments={investments}
                usdRate={usdRate}
                netUsdRate={netUsdRate}
                onOpenManualModal={() => setIsManualModalOpen(true)}
              />
            )}

            {activeTab === 'cartoes' && (
              <CartoesAssinaturasView
                creditCards={creditCards}
                subscriptions={subscriptions}
                onOpenManualModal={() => setIsManualModalOpen(true)}
                onToggleSubscriptionStatus={handleToggleSubscriptionStatus}
                onUpdateCardLimit={handleUpdateCardLimit}
                onToggleCardPaid={handleToggleCardPaid}
                selectedMonth={selectedMonth}
                subscriptionPayments={subscriptionPayments}
                onUpdateSubscriptionPayment={handleUpdateSubscriptionPayment}
                onAddRecurringCharge={handleAddRecurringCharge}
              />
            )}

            {activeTab === 'dividas' && (
              <DividasView
                debts={debts}
                debtors={debtors}
                onOpenManualModal={() => setIsManualModalOpen(true)}
              />
            )}

            {activeTab === 'metas' && (
              <MetasView
                goals={goals}
                onAddGoal={handleAddGoal}
                onUpdateGoalProgress={handleUpdateGoalProgress}
                accountOptions={
                  (currentMonthSummary.accountColumnsMeta && currentMonthSummary.accountColumnsMeta.length > 0)
                    ? currentMonthSummary.accountColumnsMeta.map((col) => ({
                        name: col.name,
                        label: col.name,
                        balance: currentMonthSummary.accountBalances ? (currentMonthSummary.accountBalances[col.name] || 0) : 0,
                      }))
                    : [
                        { name: 'confrinho picpay pj (102%)', label: 'PicPay PJ (Cofrinho) - 102% CDI', balance: 68036.06 },
                        { name: 'picpay pf (121%)', label: 'PicPay PF - 121% CDI', balance: 4330.15 },
                        { name: 'cofrinho mercado pago (120%)', label: 'Mercado Pago (Cofrinho) - 120% CDI', balance: 2500.00 },
                        { name: 'mercado pago (105%)', label: 'Mercado Pago - 105% CDI', balance: 3800.00 },
                        { name: 'cofrinho pj nu (100%)', label: 'Nubank PJ (Cofrinho) - 100% CDI', balance: 5000.00 },
                        { name: 'conta pf nu (0%)', label: 'Nubank PF - 0% CDI', balance: 1200.00 },
                      ]
                }
              />
            )}

            {activeTab === 'extrato' && (
              <ExtratoView
                transactions={transactions}
                onOpenManualModal={() => setIsManualModalOpen(true)}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                monthsList={monthsList}
              />
            )}

            {activeTab === 'configuracoes' && (
              <ConfiguracoesView
                googleUser={googleUser}
                isLoggingIn={isLoggingIn}
                onGoogleLogin={handleGoogleLogin}
                onGoogleLogout={handleGoogleLogout}
                spreadsheets={spreadsheets}
                onAddSpreadsheet={handleAddSpreadsheet}
                onImportCsvTransactions={handleImportCsvTransactions}
                onRefreshSheets={() => fetchLiveSheets()}
                taxSettings={taxSettings}
                onUpdateTaxSettings={setTaxSettings}
                authError={authError}
                onClearAuthError={() => setAuthError(null)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Manual Entry Registration Modal */}
      <ManualRegistrationModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        selectedMonth={selectedMonth}
        accountOptions={[...new Set(transactions.map((tx) => tx.account).filter((a): a is string => Boolean(a)))]}
        paymentOptions={['PIX', ...creditCards.map((card) => card.name)]}
      />

      {showPaymentReminder && (
        <PaymentRemindersModal reminders={paymentReminders} onClose={() => setShowPaymentReminder(false)} />
      )}

    </div>
  );
}

export default App;
