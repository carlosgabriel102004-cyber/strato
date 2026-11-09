import React, { useState } from 'react';
import { X, CheckCircle2, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Sparkles } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { CustomSelect } from './CustomSelect';

interface ManualRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  selectedMonth: string;
  accountOptions?: string[];
  paymentOptions?: string[];
}

export const ManualRegistrationModal: React.FC<ManualRegistrationModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  selectedMonth,
  accountOptions = [],
  paymentOptions = ['PIX'],
}) => {
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [account, setAccount] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!description || isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onAddTransaction({
        date,
        description,
        category,
        amount: numAmount,
        type,
        paymentMethod,
        account: account.trim() || undefined,
        invoiceDueDateStr: dueDate ? dueDate : undefined,
        sourceSheet: 'Supabase',
        status: 'concluido',
        notes,
      });
    } catch (err: any) {
      setSubmitError(err?.message || 'Não foi possível salvar o lançamento.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      onClose();
      // reset form
      setDescription('');
      setAmount('');
      setNotes('');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all">
      <div className="relative w-full max-w-lg glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#11310C]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#11310C] flex items-center justify-center text-[#C4C240]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#11310C] leading-tight">
                Novo <span className="font-serif italic font-bold text-xl text-[#C4C240]">Lançamento</span> Manual
              </h3>
              <p className="text-xs text-[#11310C]/60">
                Sincronização imediata com a planilha de {selectedMonth}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 text-[#11310C]/60 hover:text-[#11310C] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showSuccessToast ? (
          <div className="py-12 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-[#11310C]">Lançamento Registrado!</h4>
            <p className="text-xs text-[#11310C]/70 max-w-xs">
              Lançamento salvo no banco de dados.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-[#11310C]">
            {/* Type selector toggle */}
            <div>
              <label className="block text-[11px] font-bold text-[#11310C]/70 uppercase tracking-wider mb-2">
                Tipo de Operação
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-[#11310C]/5 rounded-2xl border border-[#11310C]/10">
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    type === 'income'
                      ? 'bg-[#11310C] text-[#FAFBF6] shadow-xs'
                      : 'text-[#11310C]/70 hover:text-[#11310C]'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-[#C4C240]" />
                  <span>Entrada</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    type === 'expense'
                      ? 'bg-[#E13513] text-white shadow-xs'
                      : 'text-[#11310C]/70 hover:text-[#11310C]'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 text-white" />
                  <span>Saída</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('investment')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    type === 'investment'
                      ? 'bg-[#C4C240] text-[#11310C] shadow-xs'
                      : 'text-[#11310C]/70 hover:text-[#11310C]'
                  }`}
                >
                  <span>Aporte</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('reembolso')}
                  title="Dinheiro que só devolve parte de um custo (não conta como ganho)"
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                    type === 'reembolso'
                      ? 'bg-white text-[#11310C] shadow-xs'
                      : 'text-[#11310C]/70 hover:text-[#11310C]'
                  }`}
                >
                  <span>Reembolso</span>
                </button>
              </div>
            </div>

            {/* Description & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#11310C]/70 uppercase mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mercado St. Marche, Pro-Labore..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-[#11310C]/20 focus:outline-none focus:ring-2 focus:ring-[#C4C240] text-xs font-medium text-[#11310C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#11310C]/70 uppercase mb-1">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-[#11310C]/20 focus:outline-none focus:ring-2 focus:ring-[#C4C240] text-xs font-bold text-[#11310C]"
                />
              </div>
            </div>

            {/* Category & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#11310C]/70 uppercase mb-1">
                  Categoria
                </label>
                <CustomSelect
                  value={category}
                  onChange={setCategory}
                  className="w-full"
                  buttonClassName="w-full py-2.5 bg-white/90"
                  options={[
                    'Alimentação',
                    'Moradia',
                    'Salário & Renda',
                    'Investimentos',
                    'Lazer & Viagens',
                    'Assinaturas',
                    'Transporte',
                    'Saúde',
                    'Dívidas & Habitação',
                  ]}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#11310C]/70 uppercase mb-1">
                  Data Compra
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-[#11310C]/20 focus:outline-none focus:ring-2 focus:ring-[#C4C240] text-xs font-semibold text-[#11310C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#11310C]/70 uppercase mb-1 flex items-center justify-between">
                  <span>Vencimento</span>
                  <span className="text-[9px] text-[#11310C]/40 lowercase">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="Data de Vencimento"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-[#11310C]/20 focus:outline-none focus:ring-2 focus:ring-[#C4C240] text-xs font-semibold text-[#11310C]"
                />
              </div>
            </div>

            {/* Payment Method & Target Sheet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#11310C]/70 uppercase mb-1">
                  Forma de Pagamento
                </label>
                <input
                  type="text"
                  list="strato-payment-options"
                  placeholder="PIX, Cartão Nubank..."
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-[#11310C]/20 focus:outline-none focus:ring-2 focus:ring-[#C4C240] text-xs font-medium text-[#11310C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#11310C]/70 uppercase mb-1 flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#C4C240]" />
                  Conta
                </label>
                <input
                  type="text"
                  list="strato-account-options"
                  placeholder="Nubank PJ, Picpay PJ..."
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-[#11310C]/20 focus:outline-none focus:ring-2 focus:ring-[#C4C240] text-xs font-medium text-[#11310C]"
                />
                <datalist id="strato-account-options">
                  {accountOptions.map((option) => <option key={option} value={option} />)}
                </datalist>
                <datalist id="strato-payment-options">
                  {paymentOptions.map((option) => <option key={option} value={option} />)}
                </datalist>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-3">
              {submitError && (
                <p className="mb-2 text-[11px] font-semibold text-[#E8402A]">{submitError}</p>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl liquid-button font-extrabold text-xs text-[#11310C] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 text-[#11310C]" />
                    <span>Salvar Lançamento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
