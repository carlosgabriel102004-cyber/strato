import React, { useState } from 'react';
import {
  CreditCard,
  Calendar,
  Sparkles,
  AlertTriangle,
  Tv,
  CheckCircle2,
  XCircle,
  Plus,
  ShieldCheck,
  Palette,
  Store,
  Bot,
  ShoppingBag,
  Music,
  Film,
  Code,
  Cloud,
  Dumbbell,
  Car,
  Zap,
  Edit2,
  Check,
} from 'lucide-react';
import { CreditCardSheet, Subscription, SubscriptionMonthPayment } from '../types';
import { formatCurrency } from '../utils/formatters';
import { getSubscriptionPaymentKey } from '../utils/subscriptions';
import { NewRecurringCharge } from '../types';

const getServiceIcon = (serviceName: string, category?: string) => {
  const name = (serviceName || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  if (name.includes('adobe') || name.includes('figma') || name.includes('canva') || name.includes('photoshop')) {
    return <Palette className="w-5 h-5" />;
  }
  if (name.includes('shopify') || name.includes('nuvemshop') || name.includes('e-commerce') || name.includes('loja')) {
    return <Store className="w-5 h-5" />;
  }
  if (name.includes('claude') || name.includes('openai') || name.includes('chatgpt') || name.includes('midjourney') || name.includes('anthropic')) {
    return <Bot className="w-5 h-5" />;
  }
  if (name.includes('meli') || name.includes('mercado livre') || name.includes('disney') || name.includes('netflix') || name.includes('prime') || name.includes('hbo') || name.includes('youtube')) {
    return <Tv className="w-5 h-5" />;
  }
  if (name.includes('spotify') || name.includes('deezer') || name.includes('apple music') || name.includes('music')) {
    return <Music className="w-5 h-5" />;
  }
  if (name.includes('github') || name.includes('vercel') || name.includes('aws') || name.includes('hosting')) {
    return <Code className="w-5 h-5" />;
  }
  if (name.includes('icloud') || name.includes('drive') || name.includes('dropbox') || name.includes('cloud')) {
    return <Cloud className="w-5 h-5" />;
  }
  if (name.includes('gym') || name.includes('smartfit') || name.includes('bodytech') || name.includes('academia')) {
    return <Dumbbell className="w-5 h-5" />;
  }
  if (name.includes('uber') || name.includes('99') || name.includes('carro')) {
    return <Car className="w-5 h-5" />;
  }

  if (cat.includes('design') || cat.includes('software')) return <Palette className="w-5 h-5" />;
  if (cat.includes('e-commerce') || cat.includes('plataforma')) return <Store className="w-5 h-5" />;
  if (cat.includes('inteligência') || cat.includes('ai')) return <Bot className="w-5 h-5" />;
  if (cat.includes('lazer') || cat.includes('streaming')) return <Tv className="w-5 h-5" />;

  return <Zap className="w-5 h-5" />;
};

const getTodayIsoDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

interface CartoesAssinaturasViewProps {
  creditCards: CreditCardSheet[];
  subscriptions: Subscription[];
  onOpenManualModal: () => void;
  onToggleSubscriptionStatus?: (id: string) => void;
  onUpdateCardLimit?: (cardId: string, newLimit: number) => void;
  onToggleCardPaid?: (cardId: string) => void;
  selectedMonth: string;
  subscriptionPayments: Record<string, SubscriptionMonthPayment>;
  onUpdateSubscriptionPayment?: (subscriptionId: string, month: string, update: Partial<SubscriptionMonthPayment>) => void;
  onAddRecurringCharge: (charge: NewRecurringCharge) => Promise<void>;
  addSubscriptionRequest?: number;
}

export const CartoesAssinaturasView: React.FC<CartoesAssinaturasViewProps> = ({
  creditCards,
  subscriptions,
  onOpenManualModal,
  onToggleSubscriptionStatus,
  onUpdateCardLimit,
  onToggleCardPaid,
  selectedMonth,
  subscriptionPayments,
  onUpdateSubscriptionPayment,
  onAddRecurringCharge,
  addSubscriptionRequest = 0,
}) => {
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState<string>('');
  const [paidDateDrafts, setPaidDateDrafts] = useState<Record<string, string>>({});
  const [contributionDateDrafts, setContributionDateDrafts] = useState<Record<string, string>>({});
  const [isAddSubscriptionOpen, setIsAddSubscriptionOpen] = useState(false);
  const [newSubscriptionName, setNewSubscriptionName] = useState('');
  const [newSubscriptionAmount, setNewSubscriptionAmount] = useState('');
  const [newSubscriptionMethod, setNewSubscriptionMethod] = useState('Pix');
  const [newSubscriptionDay, setNewSubscriptionDay] = useState('');
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [subscriptionFormError, setSubscriptionFormError] = useState('');
  React.useEffect(() => {
    if (addSubscriptionRequest > 0) { setSubscriptionFormError(''); setIsAddSubscriptionOpen(true); }
  }, [addSubscriptionRequest]);

  // Sort active subscriptions to the top
  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    const aActive = a.status === 'ativa' || a.active;
    const bActive = b.status === 'ativa' || b.active;
    return (bActive ? 1 : 0) - (aActive ? 1 : 0);
  });

  const activeSubs = sortedSubscriptions.filter((s) => s.status === 'ativa' || s.active);
  const pausedSubs = sortedSubscriptions.filter((s) => s.status === 'pausada' || !s.active);

  const totalInvoices = creditCards.reduce((acc, c) => acc + (c.isPaid ? 0 : c.currentInvoice), 0);
  const getPersonalMonthlyPrice = (sub: Subscription) => sub.personalMonthlyPrice ?? sub.monthlyPrice;
  const totalSubscriptionsMonthly = activeSubs.reduce((acc, s) => acc + getPersonalMonthlyPrice(s), 0);
  const totalPausedMonthly = pausedSubs.reduce((acc, s) => acc + getPersonalMonthlyPrice(s), 0);

  const handleStartEditLimit = (card: CreditCardSheet) => {
    setEditingCardId(card.id);
    setTempLimit(card.limit.toString());
  };

  const handleSaveEditLimit = (cardId: string) => {
    const num = parseFloat(tempLimit.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!isNaN(num) && num >= 0 && onUpdateCardLimit) {
      onUpdateCardLimit(cardId, num);
    }
    setEditingCardId(null);
  };

  const handleAddSubscription = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedAmount = newSubscriptionAmount.includes(',') && newSubscriptionAmount.includes('.')
      ? newSubscriptionAmount.replace(/\./g, '').replace(',', '.')
      : newSubscriptionAmount.replace(',', '.');
    const monthlyPrice = Number(normalizedAmount);
    const renewalDay = Number(newSubscriptionDay);
    if (!newSubscriptionName.trim() || !Number.isFinite(monthlyPrice) || monthlyPrice <= 0 || !Number.isInteger(renewalDay) || renewalDay < 1 || renewalDay > 31) {
      setSubscriptionFormError('Preencha nome, valor mensal e dia de cobrança (1 a 31).');
      return;
    }

    setIsSavingSubscription(true);
    setSubscriptionFormError('');
    try {
      await onAddRecurringCharge({
        serviceName: newSubscriptionName.trim(),
        monthlyPrice,
        paymentMethod: newSubscriptionMethod.trim() || 'Pix',
        renewalDay,
      });
      setNewSubscriptionName('');
      setNewSubscriptionAmount('');
      setNewSubscriptionMethod('Pix');
      setNewSubscriptionDay('');
      setIsAddSubscriptionOpen(false);
    } catch (error: any) {
      setSubscriptionFormError(error?.message || 'Não foi possível gravar na planilha.');
    } finally {
      setIsSavingSubscription(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 space-y-10 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 glass-card rounded-3xl p-8 border border-[#11310C]/06">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
            Faturas de <span className="font-serif italic font-bold text-3xl sm:text-4xl text-[#C4C240]">Cartões</span> & Assinaturas Fixas
          </h1>
        </div>

      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-7 border border-[#11310C]/06">
          <span className="text-[11px] font-bold text-[#11310C]/60 uppercase tracking-wider block mb-2">
            Total em Faturas Abertas
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
            {formatCurrency(totalInvoices)}
          </div>
          <p className="text-[11px] text-[#11310C]/60 mt-2 font-medium">Consolidado dos cartões pendentes</p>
        </div>

        <div className="glass-card rounded-3xl p-7 border border-[#11310C]/06">
          <span className="text-[11px] font-bold text-[#11310C]/60 uppercase tracking-wider block mb-2">
            Total Assinaturas Ativas
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
            {formatCurrency(totalSubscriptionsMonthly)}
          </div>
          <p className="text-[11px] text-[#11310C]/60 mt-2 font-medium">
            {activeSubs.length} assinaturas ativas ({pausedSubs.length} pausadas)
          </p>
        </div>

        <div className="glass-card rounded-3xl p-7 border border-[#11310C]/06">
          <span className="text-[11px] font-bold text-[#11310C]/60 uppercase tracking-wider block mb-2">
            Economia por Assinaturas Pausadas
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-800">
            {formatCurrency(totalPausedMonthly)} /mês
          </div>
          <p className="text-[11px] text-[#11310C]/60 mt-2 font-medium truncate">
            {pausedSubs.length > 0 ? `${pausedSubs.length} pausadas: ${pausedSubs.map(s => s.serviceName).join(', ')}` : 'Nenhuma assinatura pausada'}
          </p>
        </div>
      </div>

      {/* Credit Cards Invoice Cycle Section */}
      <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#11310C]/10">
          <div>
            <h3 className="text-lg font-extrabold text-[#11310C]">
              Ciclos de <span className="font-serif italic font-bold text-xl text-[#C4C240]">Abertura & Fechamento</span> dos Cartões
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#11310C]/10 text-[#11310C]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Dados Protegidos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {creditCards.map((card) => {
            const isPaid = card.isPaid;

            return (
              <div
                key={card.id}
                className={`p-5 rounded-3xl bg-white/90 border space-y-3 shadow-xs transition-all ${
                  isPaid ? 'border-[#11310C]/25 bg-[#11310C]/5' : 'border-[#11310C]/15 hover:border-[#C4C240]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#11310C] text-[#C4C240] flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#11310C]">{card.name}</h4>
                      <span className="text-[10px] font-semibold text-[#11310C]/60">
                        {card.bank} • Final {card.lastDigits || '****'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#11310C] text-[#C4C240] border border-[#C4C240]/30 shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-[#C4C240]" />
                        Fatura Paga
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#E13513]/15 text-[#E13513] border border-[#E13513]/30">
                        {card.status === 'fechada' ? 'Fatura Fechada' : 'Fatura Aberta'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#11310C]/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#11310C]">
                    <span>Fatura Atual:</span>
                    <span className={`text-sm font-extrabold ${isPaid ? 'text-[#11310C]/70 line-through' : 'text-[#11310C]'}`}>
                      {formatCurrency(card.currentInvoice)}
                    </span>
                  </div>
                  <div className="w-full bg-white h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPaid ? 'bg-[#11310C]/40' : 'bg-[#11310C]'}`}
                      style={{ width: `${Math.min(100, isPaid ? 0 : (card.currentInvoice / card.limit) * 100)}%` }}
                    />
                  </div>

                  {/* Limit Section with Editable Limit */}
                  <div className="flex items-center justify-between text-[10px] text-[#11310C]/70 font-semibold pt-1">
                    <span>Limite Total:</span>
                    {editingCardId === card.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempLimit}
                          onChange={(e) => setTempLimit(e.target.value)}
                          className="w-20 px-1.5 py-0.5 rounded border border-[#11310C]/30 bg-white text-xs font-extrabold text-[#11310C] focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveEditLimit(card.id)}
                          className="p-1 rounded bg-[#11310C] text-[#C4C240] hover:bg-[#11310C]/80 cursor-pointer"
                          title="Salvar Limite"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <strong className="text-[#11310C] font-extrabold">{formatCurrency(card.limit)}</strong>
                        <button
                          onClick={() => handleStartEditLimit(card)}
                          className="p-1 rounded-md text-[#11310C]/60 hover:text-[#11310C] hover:bg-[#11310C]/10 transition-colors cursor-pointer"
                          title="Mudar limite do cartão"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates & Mark Paid Action */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold pt-1">
                  <div className="p-2 rounded-xl bg-white border border-[#11310C]/10">
                    <span className="text-[10px] text-[#11310C]/60 uppercase block">Fechamento</span>
                    <span className="text-[#11310C]">Dia {card.closingDay} do mês</span>
                  </div>

                  <div className="p-2 rounded-xl bg-white border border-[#11310C]/10">
                    <span className="text-[10px] text-[#11310C]/60 uppercase block">Vencimento</span>
                    <span className="text-[#11310C]">Dia {card.dueDay} do mês</span>
                  </div>
                </div>

                {/* Mark as Paid Toggle Button */}
                {onToggleCardPaid && (
                  <button
                    onClick={() => onToggleCardPaid(card.id)}
                    className={`w-full py-2 px-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      isPaid
                        ? 'bg-[#11310C]/10 text-[#11310C] border border-[#11310C]/20 hover:bg-[#11310C]/20'
                        : 'bg-[#11310C] text-[#C4C240] hover:bg-[#11310C]/90 shadow-xs'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isPaid ? 'Fatura Paga (Clique para reabrir)' : 'Marcar Fatura como Paga'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscriptions Section */}
      <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#11310C]/10">
          <div>
            <h3 className="text-lg font-extrabold text-[#11310C]">
              Planilha de <span className="font-serif italic font-bold text-xl text-[#C4C240]">Assinaturas</span> & Cobranças Automáticas
            </h3>
            <p className="text-xs text-[#11310C]/60">
              Assinaturas com status <span className="font-bold text-emerald-800">Ativa</span> ficam priorizadas no topo e são cobradas no extrato. Assinaturas <span className="font-bold text-amber-800">Pausadas</span> ficam suspensas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-[#11310C]">
              Custo Fixo Ativo: {formatCurrency(totalSubscriptionsMonthly)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {sortedSubscriptions.map((sub) => {
            const isActive = sub.status === 'ativa' || sub.active;
            const paymentRecordKey = getSubscriptionPaymentKey(sub.serviceName, selectedMonth);
            const paymentRecord = subscriptionPayments[paymentRecordKey] || {};
            const personalMonthlyPrice = getPersonalMonthlyPrice(sub);
            const sharedMonthlyAmount = Math.max(0, sub.monthlyPrice - personalMonthlyPrice);

            return (
              <div
                key={sub.id}
                className={`p-5 rounded-3xl bg-white/90 border space-y-3 transition-all ${
                  isActive
                    ? 'border-[#11310C]/15 shadow-xs hover:border-[#C4C240]'
                    : 'border-amber-300/60 bg-amber-50/30 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                      isActive ? 'bg-[#11310C] text-[#C4C240]' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {getServiceIcon(sub.serviceName, sub.category)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#11310C]">{sub.serviceName}</h4>
                      <span className="text-[11px] font-semibold text-[#11310C]/60 block">
                        Cobrado no: <strong className="text-[#11310C]">{sub.paymentCard || 'Cartão Nubank'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-base text-[#11310C] block">
                      {formatCurrency(personalMonthlyPrice)}
                    </span>
                    <span className="text-[10px] text-[#11310C]/60 font-semibold">
                      {personalMonthlyPrice < sub.monthlyPrice ? `sua parte de ${formatCurrency(sub.monthlyPrice)}` : 'por mês'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1 border-t border-[#11310C]/10">
                  <div className="p-2.5 rounded-2xl bg-white border border-[#11310C]/10">
                    <span className="text-[10px] text-[#11310C]/60 uppercase block">Data Cobrança</span>
                    <span className="text-[#11310C]">Dia {sub.renewalDay} do mês</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white border border-[#11310C]/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#11310C]/60 uppercase block">Status</span>
                      <span className={isActive ? 'text-emerald-800 font-extrabold' : 'text-amber-800 font-extrabold'}>
                        {isActive ? 'Ativa' : 'Pausada'}
                      </span>
                    </div>

                    {onToggleSubscriptionStatus && (
                      <button
                        onClick={() => onToggleSubscriptionStatus(sub.id)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold cursor-pointer transition-all ${
                          isActive
                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                        }`}
                      >
                        {isActive ? 'Pausar' : 'Ativar'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-[#11310C]/10 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#11310C]">Pagamento de {selectedMonth}</span>
                    <span className={`text-[10px] font-extrabold uppercase ${paymentRecord.paidDate ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {paymentRecord.paidDate ? `Pago em ${paymentRecord.paidDate.split('-').reverse().join('/')}` : 'Ainda não pago'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      aria-label={`Data do pagamento de ${sub.serviceName}`}
                      value={paidDateDrafts[paymentRecordKey] ?? paymentRecord.paidDate ?? ''}
                      onChange={(e) => setPaidDateDrafts((prev) => ({ ...prev, [paymentRecordKey]: e.target.value }))}
                      className="min-w-0 flex-1 px-2.5 py-2 rounded-xl bg-white border border-[#11310C]/15 text-xs text-[#11310C]"
                    />
                    <button
                      type="button"
                      disabled={!onUpdateSubscriptionPayment}
                      onClick={() => {
                        if (paymentRecord.paidDate) {
                          onUpdateSubscriptionPayment?.(sub.serviceName, selectedMonth, { paidDate: undefined });
                          setPaidDateDrafts((prev) => ({ ...prev, [paymentRecordKey]: '' }));
                        } else {
                          onUpdateSubscriptionPayment?.(sub.serviceName, selectedMonth, {
                            paidDate: paidDateDrafts[paymentRecordKey] || getTodayIsoDate(),
                          });
                        }
                      }}
                      className={`shrink-0 px-3 py-2 rounded-xl text-[10px] font-extrabold cursor-pointer disabled:opacity-50 ${paymentRecord.paidDate ? 'bg-amber-100 text-amber-900' : 'bg-[#11310C] text-[#C4C240]'}`}
                    >
                      {paymentRecord.paidDate ? 'Desmarcar' : 'Marcar pago'}
                    </button>
                    {paymentRecord.paidDate && paidDateDrafts[paymentRecordKey] && paidDateDrafts[paymentRecordKey] !== paymentRecord.paidDate && (
                      <button
                        type="button"
                        onClick={() => onUpdateSubscriptionPayment?.(sub.serviceName, selectedMonth, { paidDate: paidDateDrafts[paymentRecordKey] })}
                        className="shrink-0 px-3 py-2 rounded-xl bg-white border border-[#11310C]/15 text-[10px] font-extrabold text-[#11310C] cursor-pointer"
                      >
                        Salvar data
                      </button>
                    )}
                  </div>

                  {sharedMonthlyAmount > 0 && (
                    <div className="rounded-2xl bg-[#11310C]/5 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#11310C]">
                          Ajuda das outras pessoas ({formatCurrency(sharedMonthlyAmount)})
                        </span>
                        <span className={`text-[10px] font-extrabold ${paymentRecord.contributionReceived ? 'text-emerald-800' : 'text-amber-800'}`}>
                          {paymentRecord.contributionReceived ? 'Recebida' : 'Pendente'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          aria-label={`Data em que recebeu a ajuda de ${sub.serviceName}`}
                          value={contributionDateDrafts[paymentRecordKey] ?? paymentRecord.contributionDate ?? ''}
                          onChange={(e) => setContributionDateDrafts((prev) => ({ ...prev, [paymentRecordKey]: e.target.value }))}
                          className="min-w-0 flex-1 px-2.5 py-2 rounded-xl bg-white border border-[#11310C]/15 text-xs text-[#11310C]"
                        />
                        <button
                          type="button"
                          disabled={!onUpdateSubscriptionPayment}
                          onClick={() => {
                            if (paymentRecord.contributionReceived) {
                              onUpdateSubscriptionPayment?.(sub.serviceName, selectedMonth, {
                                contributionReceived: false,
                                contributionDate: undefined,
                              });
                              setContributionDateDrafts((prev) => ({ ...prev, [paymentRecordKey]: '' }));
                            } else {
                              onUpdateSubscriptionPayment?.(sub.serviceName, selectedMonth, {
                                contributionReceived: true,
                                contributionDate: contributionDateDrafts[paymentRecordKey] || getTodayIsoDate(),
                              });
                            }
                          }}
                          className="shrink-0 px-3 py-2 rounded-xl bg-white border border-[#11310C]/15 text-[10px] font-extrabold text-[#11310C] cursor-pointer disabled:opacity-50"
                        >
                          {paymentRecord.contributionReceived ? 'Desmarcar' : 'Marcar recebida'}
                        </button>
                        {paymentRecord.contributionReceived && contributionDateDrafts[paymentRecordKey] && contributionDateDrafts[paymentRecordKey] !== paymentRecord.contributionDate && (
                          <button
                            type="button"
                            onClick={() => onUpdateSubscriptionPayment?.(sub.serviceName, selectedMonth, { contributionDate: contributionDateDrafts[paymentRecordKey] })}
                            className="shrink-0 px-3 py-2 rounded-xl bg-white border border-[#11310C]/15 text-[10px] font-extrabold text-[#11310C] cursor-pointer"
                          >
                            Salvar data
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {isAddSubscriptionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <form onSubmit={handleAddSubscription} className="w-full max-w-lg rounded-3xl bg-[#FAFBF6] p-6 sm:p-8 shadow-2xl space-y-5">
            <div>
              <h3 className="text-xl font-extrabold text-[#11310C]">Adicionar assinatura ou conta fixa</h3>
              <p className="mt-1 text-xs text-[#11310C]/65">Ao salvar, o app acrescenta a cobrança na planilha e ela passa a entrar nas previsões mensais.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-[11px] font-bold text-[#11310C]/70">
                Nome da conta
                <input required value={newSubscriptionName} onChange={(e) => setNewSubscriptionName(e.target.value)} placeholder="Ex.: Conta TIM" className="mt-1 w-full rounded-xl border border-[#11310C]/20 bg-white px-3 py-2.5 text-sm text-[#11310C]" />
              </label>
              <label className="text-[11px] font-bold text-[#11310C]/70">
                Valor mensal (R$)
                <input required type="text" inputMode="decimal" value={newSubscriptionAmount} onChange={(e) => setNewSubscriptionAmount(e.target.value)} placeholder="0,00" className="mt-1 w-full rounded-xl border border-[#11310C]/20 bg-white px-3 py-2.5 text-sm text-[#11310C]" />
              </label>
              <label className="text-[11px] font-bold text-[#11310C]/70">
                Forma de pagamento
                <input required value={newSubscriptionMethod} onChange={(e) => setNewSubscriptionMethod(e.target.value)} placeholder="Pix, cartão..." className="mt-1 w-full rounded-xl border border-[#11310C]/20 bg-white px-3 py-2.5 text-sm text-[#11310C]" />
              </label>
              <label className="text-[11px] font-bold text-[#11310C]/70">
                Dia de cobrança
                <input required type="number" min="1" max="31" step="1" value={newSubscriptionDay} onChange={(e) => setNewSubscriptionDay(e.target.value)} placeholder="1–31" className="mt-1 w-full rounded-xl border border-[#11310C]/20 bg-white px-3 py-2.5 text-sm text-[#11310C]" />
              </label>
            </div>

            {subscriptionFormError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{subscriptionFormError}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsAddSubscriptionOpen(false)} disabled={isSavingSubscription} className="px-4 py-2.5 rounded-xl border border-[#11310C]/20 text-xs font-extrabold text-[#11310C] cursor-pointer disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={isSavingSubscription} className="px-4 py-2.5 rounded-xl bg-[#11310C] text-[#C4C240] text-xs font-extrabold cursor-pointer disabled:opacity-50">
                {isSavingSubscription ? 'Salvando…' : 'Salvar na planilha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
