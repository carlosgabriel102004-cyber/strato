import React from 'react';
import { CreditCard, Wallet, X } from 'lucide-react';
import { PaymentReminder } from '../utils/paymentReminders';
import { formatCurrency } from '../utils/formatters';

interface PaymentRemindersModalProps {
  reminders: PaymentReminder[];
  onClose: () => void;
}

const getDueLabel = (daysUntilDue: number) => {
  if (daysUntilDue < 0) return `Atrasada há ${Math.abs(daysUntilDue)} ${Math.abs(daysUntilDue) === 1 ? 'dia' : 'dias'}`;
  if (daysUntilDue === 0) return 'Vence hoje';
  return `Vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'}`;
};

export const PaymentRemindersModal: React.FC<PaymentRemindersModalProps> = ({ reminders, onClose }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 glass-overlay" onClick={onClose}>
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-reminders-title"
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-lg glass-panel rounded-2xl"
    >
      <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[#11310C]/8">
        <div>
          <h2 id="payment-reminders-title" className="font-serif text-xl font-semibold text-[#11310C]">Lembretes de pagamento</h2>
          <p className="mt-0.5 text-xs text-[#11310C]/55">Contas e faturas pendentes deste mês.</p>
        </div>
        <button type="button" aria-label="Fechar lembretes" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#11310C]/5 cursor-pointer">
          <X className="h-4 w-4 text-[#11310C]/60" />
        </button>
      </header>

      <div className="max-h-[60vh] overflow-y-auto px-6 py-1 divide-y divide-[#11310C]/8">
        {reminders.map((reminder) => (
          <article key={reminder.id} className="flex items-center justify-between gap-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#11310C]/6 text-[#11310C]/70">
                {reminder.kind === 'Fatura de cartão' ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[13px] font-semibold text-[#11310C]">{reminder.name}</h3>
                <p className="text-[11px] text-[#11310C]/55">{reminder.kind} · vence {reminder.dueDate.split('-').reverse().join('/')}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[13px] font-semibold text-[#11310C]">{formatCurrency(reminder.amount)}</p>
              <p className={`text-[11px] font-medium ${reminder.daysUntilDue <= 1 ? 'text-[#E13513]' : 'text-[#11310C]/55'}`}>{getDueLabel(reminder.daysUntilDue)}</p>
            </div>
          </article>
        ))}
      </div>

      <footer className="flex justify-end px-6 py-4 border-t border-[#11310C]/8">
        <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg bg-[#11310C] text-[#FAFBF6] text-[13px] font-semibold cursor-pointer">Entendi</button>
      </footer>
    </section>
  </div>
);
