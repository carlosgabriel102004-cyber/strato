import { CreditCardSheet, Subscription, SubscriptionMonthPayment, Transaction } from '../types';
import { getCardInvoicePaymentKey, getSubscriptionPaymentKey } from './subscriptions';

export interface PaymentReminder {
  id: string;
  name: string;
  kind: 'Conta recorrente' | 'Fatura de cartão';
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

const normalize = (value: string) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** True when the statement already has an expense for this service in the given month. */
function isPaidInStatement(serviceName: string, today: Date, transactions: Transaction[]): boolean {
  const name = normalize(serviceName);
  if (!name) return false;
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const pattern = new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`);
  return transactions.some(
    (tx) => tx.type === 'expense' && (tx.purchaseDate || tx.date || '').startsWith(monthPrefix) && pattern.test(normalize(tx.description))
  );
}

function dueDateForDay(today: Date, day: number): Date {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(Math.floor(day), 1), lastDayOfMonth));
}

export function buildPaymentReminders(
  today: Date,
  currentMonth: string,
  subscriptions: Subscription[],
  subscriptionPayments: Record<string, SubscriptionMonthPayment>,
  cards: CreditCardSheet[],
  paidCardInvoices: Record<string, boolean>,
  transactions: Transaction[] = []
): PaymentReminder[] {
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const reminders: PaymentReminder[] = [];

  subscriptions.forEach((subscription) => {
    const isActive = subscription.status === 'ativa' || subscription.active;
    const paymentKey = getSubscriptionPaymentKey(subscription.serviceName, currentMonth);
    if (!isActive || subscription.monthlyPrice <= 0 || subscriptionPayments[paymentKey]?.paidDate) return;
    if (isPaidInStatement(subscription.serviceName, today, transactions)) return;
    // Charged on a credit card: it is part of that card's invoice, not a separate bill
    const method = normalize(subscription.paymentCard || '');
    if (/cartao|credito/.test(method) || cards.some((card) => normalize(card.name) === method)) return;

    const dueDate = dueDateForDay(today, subscription.renewalDay);
    reminders.push({
      id: `subscription:${paymentKey}`,
      name: subscription.serviceName,
      kind: 'Conta recorrente',
      amount: subscription.personalMonthlyPrice ?? subscription.monthlyPrice,
      dueDate: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`,
      daysUntilDue: Math.round((dueDate.getTime() - todayAtMidnight.getTime()) / 86400000),
    });
  });

  cards.forEach((card) => {
    const paymentKey = getCardInvoicePaymentKey(card.name, currentMonth);
    if (card.autoPay || card.currentInvoice <= 0 || paidCardInvoices[paymentKey]) return;

    const dueDate = dueDateForDay(today, card.dueDay);
    reminders.push({
      id: `card:${paymentKey}`,
      name: card.name,
      kind: 'Fatura de cartão',
      amount: card.currentInvoice,
      dueDate: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`,
      daysUntilDue: Math.round((dueDate.getTime() - todayAtMidnight.getTime()) / 86400000),
    });
  });

  return reminders.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
