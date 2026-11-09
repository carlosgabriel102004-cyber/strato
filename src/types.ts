// 'reembolso': money that only offsets a shared cost (e.g. someone paying their part of a
// subscription). Kept in the statement for control, never counted as income or expense.
export type TransactionType = 'income' | 'expense' | 'investment' | 'reembolso';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD or DD/MM/YYYY
  description: string;
  category: string;
  amount: number;
  type: TransactionType;
  paymentMethod: string; // Coluna E: Pix, Cartão ML, Cartão Picpay PJ, Cartão Nubank
  account?: string; // Coluna D: Nubank PF, Nubank PJ, PicPay PF, PicPay PJ, Mercado Pago
  sourceSheet: string;
  status: 'concluido' | 'pendente';
  notes?: string;
  purchaseDate?: string; // Data da compra no carrinho (ex: 03/07/2026)
  effectiveExpenseDate?: string; // Data real de pagamento da fatura (ex: 08/08/2026)
  effectiveMonthLabel?: string; // Mês de competência da fatura (ex: "Agosto 2026")
  isCreditCard?: boolean;
  cardName?: string;
  invoiceDueDateStr?: string; // Data formatada do vencimento (ex: "08/08/2026")
}

export interface CreditCardSheet {
  id: string;
  name: string; // Coluna A: Cartão ML, Cartão PicPay PJ, Cartão Nubank
  bank: string;
  lastDigits?: string;
  closingDay: number; // Coluna B: Fecha (1, 2, 29, 3)
  dueDay: number; // Coluna C: Vence (8, 5, 10)
  currentInvoice: number; // Dynamic sum from Extrato for this card
  limit: number;
  status?: 'aberta' | 'fechada';
  isPaid?: boolean;
  autoPay?: boolean; // invoice paid by automatic debit: no payment reminder
}

export interface Subscription {
  id: string;
  status: 'ativa' | 'pausada'; // Coluna A: status
  serviceName: string; // Coluna C: descrição
  category: string;
  monthlyPrice: number; // Coluna B: valor
  paymentCard: string; // Coluna D: cartão cobrado
  renewalDay: number; // Coluna E: data de cobrança
  active: boolean; // Computed from status === 'ativa'
  cancelRecommendation?: boolean;
  personalMonthlyPrice?: number;
}

export interface SubscriptionMonthPayment {
  paidDate?: string;
  contributionReceived?: boolean;
  contributionDate?: string;
}

export interface Investment {
  id: string;
  ticker: string; // Coluna A: Tiket
  companyName: string; // Coluna B: Nome da Empresa
  assetClass: string; // Coluna C: Classe
  sharesCount: number; // Coluna D: Número de ações
  averagePrice: number; // Coluna E: Preço médio
  currentPrice: number; // Coluna F: Preço atual
  usdChange: number; // Coluna G: Variação em dólar
  percentChange: number; // Coluna H: Variação em porcentagem
  usdApplied: number; // Coluna I: Dólares aplicados
  usdCurrent: number; // Coluna J: Dólares atuais
  name: string; // Display title e.g. "Name (Ticker)"
  category?: 'Renda Fixa' | 'Ações' | 'FIIs' | 'Cripto' | 'Internacional' | string;
  amountInvested: number; // BRL or USD equivalent
  currentValue: number;
  yieldPercent: number;
  monthlyDividend: number;
}

export interface Debt {
  id: string;
  creditor: string;
  type: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: string;
  monthlyPayment: number;
  dueDate: string;
}

export interface SpreadsheetConnection {
  id: string;
  type: 'cartoes' | 'extrato' | 'investimentos' | 'dividas' | 'assinaturas' | 'total_mes' | 'devedores';
  title: string;
  description: string;
  lastSync: string;
  status: 'conectado' | 'pendente' | 'erro';
  recordsCount: number;
  sheetUrl?: string;
  fileName?: string;
}

export interface AccountBalanceRow {
  accountName: string;
  balances: Record<string, number>; // Month name e.g. "Maio 2026": 8036.06
}

export interface AccountColumnMeta {
  name: string;
  ratePct: number; // e.g. 0, 100, 121, 102, 105, 120
}

export interface TaxSettings {
  enabled: boolean;
  percentage: number;
}

export interface AccountMonthRow {
  date: string;
  monthLabel: string; // e.g. "Maio 2026"
  balances: Record<string, number>;
  total: number;
  isProjected: boolean;
}

export interface MonthSummaryData {
  month: string; // e.g. "Agosto 2026"
  totalMoney: number; // Total de dinheiro no mês de todas as contas
  totalIncome: number; // Renda / Ganhos do mês
  totalExpenses: number; // Gastos / Saídas do mês
  leftover: number; // Sobra (Income - Expenses)
  totalInvestments: number; // Investimentos acumulados
  totalDebts: number; // Dívidas pendentes
  activeSubscriptionsCount: number;
  monthlyGrowthPercent: number;
  accountBalances?: Record<string, number>; // Breakdown per account for this month
  accountDetailsRows?: AccountMonthRow[];
  accountColumnsMeta?: AccountColumnMeta[];
  isProjected?: boolean;
}

export interface AIRecommendation {
  type: 'saving' | 'investment' | 'debt' | 'alert';
  title: string;
  description: string;
  impact: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  balance: number;
  lastDigits?: string;
}

export interface Debtor {
  id: string;
  borrowerName: string; // Coluna B: Devedor
  description: string; // Coluna C: Descrição do pagamento/empréstimo
  transactionAmount: number; // Coluna D: Valor
  movement: 'pagou' | 'emprestado' | string; // Coluna E: Se a pessoa pagou ou pegou emprestado
  totalPaid: number; // Coluna G: Total pago
  totalBorrowed: number; // Coluna H: Total emprestado
  remainingAmount: number; // Coluna I: Saldo restante
  dueDate?: string;
  status: 'pendente' | 'parcial' | 'quitado';
  sheetUrl?: string;
  notes?: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  category: 'reserva' | 'imovel' | 'aposentadoria' | 'veiculo' | 'viagem' | 'outros' | 'Reserva' | 'Investimento' | 'Aquisição' | 'Viagem' | 'Aposentadoria' | 'Outros' | string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string; // YYYY-MM
  deadline?: string; // YYYY-MM-DD or date string
  monthlyContribution: number;
  targetAccount?: string; // Coluna de conta vinculada (ex: PicPay PJ Cofrinho)
  notes?: string;
}

export interface AuthErrorInfo {
  code: string;
  message: string;
  title: string;
  solution: string;
  isDomainError?: boolean;
  isPopupBlocked?: boolean;
  isIframeIssue?: boolean;
  currentDomain?: string;
  helpUrl?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isSimulated?: boolean;
}

export interface NewRecurringCharge {
  serviceName: string;
  monthlyPrice: number;
  paymentMethod: string;
  renewalDay: number;
}
