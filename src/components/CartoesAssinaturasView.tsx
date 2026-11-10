import React, { useState } from 'react';
import { QuickForm, parseMoney } from './QuickForm';
import { Pencil, Trash2 } from 'lucide-react';
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
  onUpdateSubscription?: (id: string, charge: NewRecurringCharge) => Promise<void>;
  onDeleteSubscription?: (id: string) => Promise<void>;
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
  onUpdateSubscription,
  onDeleteSubscription,
}) => {
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState<string>('');
  const [paidDateDrafts, setPaidDateDrafts] = useState<Record<string, string>>({});
  const [contributionDateDrafts, setContributionDateDrafts] = useState<Record<string, string>>({});
  const [isAddSubscriptionOpen, setIsAddSubscriptionOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const paymentOptions = [{ value: 'PIX', label: 'PIX' }, ...creditCards.map((c) => ({ value: c.name, label: c.name }))];
  const moneyInput = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  React.useEffect(() => {
    if (addSubscriptionRequest > 0) { setEditingSubscription(null); setIsAddSubscriptionOpen(true); }
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


  return (
    <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 space-y-10 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-1">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#11310C] tracking-tight">
            Faturas de <span className="italic font-medium text-[#11310C]/70">Cartões</span> & Assinaturas Fixas
          </h1>
        </div>

      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-2xl border border-[#11310C]/10 bg-white/55 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[#11310C]/10">
        <div className="p-7">
          <span className="text-[11px] font-bold text-[#11310C]/60 uppercase tracking-wider block mb-2">
            Total em Faturas Abertas
          </span>
          <div className="font-serif text-3xl sm:text-[32px] font-semibold tracking-tight text-[#11310C]">
            {formatCurrency(totalInvoices)}
          </div>
          <p className="text-[11px] text-[#11310C]/60 mt-2 font-medium">Consolidado dos cartões pendentes</p>
        </div>

        <div className="p-7">
          <span className="text-[11px] font-bold text-[#11310C]/60 uppercase tracking-wider block mb-2">
            Total Assinaturas Ativas
          </span>
          <div className="font-serif text-3xl sm:text-[32px] font-semibold tracking-tight text-[#11310C]">
            {formatCurrency(totalSubscriptionsMonthly)}
          </div>
          <p className="text-[11px] text-[#11310C]/60 mt-2 font-medium">
            {activeSubs.length} assinaturas ativas ({pausedSubs.length} pausadas)
          </p>
        </div>

        <div className="p-7">
          <span className="text-[11px] font-bold text-[#11310C]/60 uppercase tracking-wider block mb-2">
            Economia por Assinaturas Pausadas
          </span>
          <div className="font-serif text-3xl sm:text-[32px] font-semibold tracking-tight text-amber-800">
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
          <span className="text-xs text-[#11310C]/55">{creditCards.length} cartões</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {creditCards.map((card) => {
            const isPaid = card.isPaid;

            return (
              <div
                key={card.id}
                className={`p-5 rounded-2xl border border-[#11310C]/10 bg-white/55 space-y-3 transition-colors ${isPaid ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#11310C]/50" />
                    <div>
                      <h4 className="font-semibold text-[13px] text-[#11310C]">{card.name}</h4>
                      <span className="text-[10px] font-semibold text-[#11310C]/60">
                        {card.bank} • Final {card.lastDigits || '****'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#11310C]/60">
                        <CheckCircle2 className="w-3 h-3" />
                        Paga
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#E13513]">
                        {card.autoPay ? 'Débito automático' : card.status === 'fechada' ? 'Fechada' : 'Aberta'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between text-xs text-[#11310C]/60">
                    <span>Fatura atual</span>
                    <span className={`font-serif text-2xl font-semibold tracking-tight ${isPaid ? 'text-[#11310C]/60 line-through' : 'text-[#11310C]'}`}>
                      {formatCurrency(card.currentInvoice)}
                    </span>
                  </div>
                  <div className="w-full bg-[#11310C]/8 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPaid ? 'bg-[#11310C]/40' : 'bg-[#11310C]'}`}
                      style={{ width: `${Math.min(100, isPaid ? 0 : (card.currentInvoice / card.limit) * 100)}%` }}
                    />
                  </div>

                  {/* Limit Section with Editable Limit */}
                  <div className="flex items-center justify-between text-[11px] text-[#11310C]/60">
                    <span>Limite</span>
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
                <div className="flex items-center justify-between text-[11px] text-[#11310C]/60 pt-2 border-t border-[#11310C]/8">
                  <span>Fecha dia <strong className="font-semibold text-[#11310C]">{card.closingDay}</strong></span>
                  <span>Vence dia <strong className="font-semibold text-[#11310C]">{card.dueDay}</strong></span>
                </div>

                {/* Mark as Paid Toggle Button */}
                {onToggleCardPaid && (
                  <button
                    onClick={() => onToggleCardPaid(card.id)}
                    className={`w-full h-9 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      isPaid
                        ? 'text-[#11310C]/60 hover:bg-[#11310C]/5'
                        : 'border border-[#11310C]/15 text-[#11310C] hover:bg-[#11310C]/5'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isPaid ? 'Reabrir fatura' : 'Marcar como paga'}</span>
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
              <span className="font-serif italic font-bold text-xl text-[#C4C240]">Assinaturas</span> & contas fixas
            </h3>
<p className="text-xs text-[#11310C]/60">Ativas primeiro. As pausadas não entram nas previsões.</p>
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
                className={`p-5 rounded-2xl border border-[#11310C]/10 bg-white/55 space-y-3 transition-colors ${isActive ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#11310C]/6 text-[#11310C]/70">
                      {getServiceIcon(sub.serviceName, sub.category)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#11310C]">{sub.serviceName}</h4>
                      <span className="text-[11px] text-[#11310C]/60 block">
                        {sub.paymentCard || 'PIX'}{sub.renewalDay ? ` · dia ${sub.renewalDay}` : ''} · <span className={isActive ? '' : 'font-semibold text-[#11310C]'}>{isActive ? 'ativa' : 'pausada'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-0.5 -mt-1 -mr-1 mb-0.5">
                      {onToggleSubscriptionStatus && (
                        <button onClick={() => onToggleSubscriptionStatus(sub.id)} className="h-7 px-2 rounded-lg text-[11px] font-medium text-[#11310C]/60 hover:text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer">
                          {isActive ? 'Pausar' : 'Ativar'}
                        </button>
                      )}
                      {onUpdateSubscription && (
                        <button title="Editar assinatura" onClick={() => { setEditingSubscription(sub); setIsAddSubscriptionOpen(true); }} className="p-1.5 rounded-lg text-[#11310C]/45 hover:text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteSubscription && (
                        <button
                          title="Excluir assinatura"
                          onClick={() => {
                            if (!window.confirm(`Excluir a assinatura "${sub.serviceName}"? Os lançamentos já feitos no extrato não são apagados.`)) return;
                            onDeleteSubscription(sub.id).catch((e) => window.alert(e.message));
                          }}
                          className="p-1.5 rounded-lg text-[#11310C]/45 hover:text-[#E13513] hover:bg-[#E13513]/5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <span className="font-serif font-semibold text-xl tracking-tight text-[#11310C] block">
                      {formatCurrency(personalMonthlyPrice)}
                    </span>
                    <span className="text-[10px] text-[#11310C]/60 font-semibold">
                      {personalMonthlyPrice < sub.monthlyPrice ? `sua parte de ${formatCurrency(sub.monthlyPrice)}` : 'por mês'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-[#11310C]/8 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#11310C]/60">Pagamento de {selectedMonth}</span>
                    <span className={`text-[11px] font-medium ${paymentRecord.paidDate ? 'text-emerald-800' : 'text-[#11310C]/60'}`}>
                      {paymentRecord.paidDate ? `Pago em ${paymentRecord.paidDate.split('-').reverse().join('/')}` : 'Ainda não pago'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      aria-label={`Data do pagamento de ${sub.serviceName}`}
                      value={paidDateDrafts[paymentRecordKey] ?? paymentRecord.paidDate ?? ''}
                      onChange={(e) => setPaidDateDrafts((prev) => ({ ...prev, [paymentRecordKey]: e.target.value }))}
                      className="min-w-0 flex-1 h-9 px-2.5 rounded-lg glass-field text-xs text-[#11310C]"
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
                      className={`shrink-0 h-9 px-3 rounded-lg text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${paymentRecord.paidDate ? 'text-[#11310C]/60 hover:bg-[#11310C]/5' : 'border border-[#11310C]/15 text-[#11310C] hover:bg-[#11310C]/5'}`}
                    >
                      {paymentRecord.paidDate ? 'Desmarcar' : 'Marcar pago'}
                    </button>
                    {paymentRecord.paidDate && paidDateDrafts[paymentRecordKey] && paidDateDrafts[paymentRecordKey] !== paymentRecord.paidDate && (
                      <button
                        type="button"
                        onClick={() => onUpdateSubscriptionPayment?.(sub.serviceName, selectedMonth, { paidDate: paidDateDrafts[paymentRecordKey] })}
                        className="shrink-0 h-9 px-3 rounded-lg border border-[#11310C]/15 text-[11px] font-semibold text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer"
                      >
                        Salvar data
                      </button>
                    )}
                  </div>

                  {sharedMonthlyAmount > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[#11310C]/60">
                          Ajuda das outras pessoas ({formatCurrency(sharedMonthlyAmount)})
                        </span>
                        <span className={`text-[11px] font-medium ${paymentRecord.contributionReceived ? 'text-emerald-800' : 'text-[#11310C]/60'}`}>
                          {paymentRecord.contributionReceived ? 'Recebida' : 'Pendente'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          aria-label={`Data em que recebeu a ajuda de ${sub.serviceName}`}
                          value={contributionDateDrafts[paymentRecordKey] ?? paymentRecord.contributionDate ?? ''}
                          onChange={(e) => setContributionDateDrafts((prev) => ({ ...prev, [paymentRecordKey]: e.target.value }))}
                          className="min-w-0 flex-1 h-9 px-2.5 rounded-lg glass-field text-xs text-[#11310C]"
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
                          className="shrink-0 h-9 px-3 rounded-lg border border-[#11310C]/15 text-[11px] font-semibold text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer disabled:opacity-50"
                        >
                          {paymentRecord.contributionReceived ? 'Desmarcar' : 'Marcar recebida'}
                        </button>
                        {paymentRecord.contributionReceived && contributionDateDrafts[paymentRecordKey] && contributionDateDrafts[paymentRecordKey] !== paymentRecord.contributionDate && (
                          <button
                            type="button"
                            onClick={() => onUpdateSubscriptionPayment?.(sub.serviceName, selectedMonth, { contributionDate: contributionDateDrafts[paymentRecordKey] })}
                            className="shrink-0 h-9 px-3 rounded-lg border border-[#11310C]/15 text-[11px] font-semibold text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer"
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
      <QuickForm
        open={isAddSubscriptionOpen}
        title={editingSubscription ? 'Editar assinatura' : 'Nova assinatura ou conta fixa'}
        subtitle="Entra nos lembretes e nas previsões do mês."
        initial={editingSubscription
          ? {
              name: editingSubscription.serviceName,
              amount: moneyInput(editingSubscription.monthlyPrice),
              personal: editingSubscription.personalMonthlyPrice !== undefined ? moneyInput(editingSubscription.personalMonthlyPrice) : '',
              method: paymentOptions.some((o) => o.value === editingSubscription.paymentCard) ? editingSubscription.paymentCard : 'PIX',
              day: editingSubscription.renewalDay ? String(editingSubscription.renewalDay) : '',
            }
          : { method: 'PIX' }}
        fields={[
          { name: 'name', label: 'Nome', required: true, placeholder: 'Ex.: Netflix' },
          { name: 'amount', label: 'Valor mensal (R$)', type: 'money', required: true, half: true, placeholder: '0,00' },
          { name: 'personal', label: 'Sua parte (R$)', type: 'money', half: true, placeholder: 'se for dividida' },
          { name: 'method', label: 'Forma de pagamento', type: 'select', half: true, options: paymentOptions },
          { name: 'day', label: 'Dia de cobrança', type: 'number', half: true, placeholder: '1–31' },
        ]}
        onClose={() => { setIsAddSubscriptionOpen(false); setEditingSubscription(null); }}
        onSubmit={async (v) => {
          const day = v.day ? Math.round(parseMoney(v.day)) : null;
          if (day !== null && !(day >= 1 && day <= 31)) throw new Error('O dia de cobrança deve ser entre 1 e 31.');
          const monthlyPrice = parseMoney(v.amount);
          const personal = v.personal ? parseMoney(v.personal) : null;
          if (personal !== null && personal > monthlyPrice) throw new Error('A sua parte não pode ser maior que o valor mensal.');
          const charge = { serviceName: v.name.trim(), monthlyPrice, paymentMethod: v.method || 'PIX', renewalDay: day, personalMonthlyPrice: personal };
          if (editingSubscription && onUpdateSubscription) await onUpdateSubscription(editingSubscription.id, charge);
          else await onAddRecurringCharge(charge);
        }}
      />
    </div>
  );
};
