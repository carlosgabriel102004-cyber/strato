import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  PieChart as PieIcon,
  DollarSign,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Bitcoin,
  Globe,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { CurrencyExchange, Investment } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface InvestimentosViewProps {
  investments: Investment[];
  usdRate?: number;
  netUsdRate?: number;
  exchanges?: CurrencyExchange[];
  onOpenManualModal: () => void;
}

const formatDateShort = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const COLORS = ['#11310C', '#C4C240', '#4D7C0F', '#15803D', '#22C55E', '#166534', '#CA8A04'];

const CustomPieTooltip = ({ active, payload, totalValue }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const pct = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : '0';
    return (
      <div className="bg-[#11310C] text-[#FAFBF6] border border-[#C4C240] px-3.5 py-2.5 rounded-2xl shadow-xl text-xs font-bold space-y-1 pointer-events-none z-50">
        <p className="text-[#C4C240] font-extrabold text-xs">{data.name}</p>
        <p className="text-white text-xs">
          {formatCurrency(Number(data.value))} ({pct}%)
        </p>
      </div>
    );
  }
  return null;
};

export const InvestimentosView: React.FC<InvestimentosViewProps> = ({
  investments,
  usdRate = 5.14,
  netUsdRate,
  exchanges = [],
  onOpenManualModal,
}) => {
  const [showAllExchanges, setShowAllExchanges] = useState(false);
  const exchangeSummary = useMemo(() => {
    const totalBrl = exchanges.reduce((acc, e) => acc + e.brlAmount, 0);
    const totalUsd = exchanges.reduce((acc, e) => acc + e.usdAmount, 0);
    const totalFees = exchanges.reduce((acc, e) => acc + e.feesBrl, 0);
    return { totalBrl, totalUsd, totalFees, averageRate: totalUsd > 0 ? totalBrl / totalUsd : 0 };
  }, [exchanges]);
  const sortedExchanges = useMemo(() => [...exchanges].sort((a, b) => b.date.localeCompare(a.date)), [exchanges]);
  const usdExchangeRateCommercial = usdRate || 5.14; // USD commercial rate dynamically fetched from Investimentos!K1
  const avenueRepatriationFeePercent = 1.8; // ~1.4% spread + 0.38% IOF
  const netUsdRateAvenue = netUsdRate || (usdExchangeRateCommercial * (1 - avenueRepatriationFeePercent / 100)); // Dynamic Net BRL/USD rate

  // Safe property extraction helper and filter zero assets as requested by user
  const safeInvestments = (investments || [])
    .filter((inv) => {
      const shares = inv.sharesCount || 0;
      const usdCur = inv.usdCurrent ?? (inv as any).dollarsCurrent ?? 0;
      const currVal = inv.currentValue || 0;
      return shares > 0 && (usdCur > 0 || currVal > 0);
    })
    .map((inv) => {
      const sharesCount = inv.sharesCount || 0;
      const averagePrice = inv.averagePrice ?? (inv as any).avgPrice ?? 0;
      const currentPrice = inv.currentPrice ?? (inv.currentValue && sharesCount ? inv.currentValue / sharesCount / usdExchangeRateCommercial : 0);
      const usdApplied = inv.usdApplied ?? (inv as any).dollarsApplied ?? (inv.amountInvested ? inv.amountInvested / usdExchangeRateCommercial : sharesCount * averagePrice);
      const usdCurrent = inv.usdCurrent ?? (inv as any).dollarsCurrent ?? (inv.currentValue ? inv.currentValue / usdExchangeRateCommercial : sharesCount * currentPrice);
      const usdChange = inv.usdChange ?? (inv as any).variationDollar ?? (usdCurrent - usdApplied);
      const percentChange = inv.percentChange ?? (inv as any).variationPercent ?? (inv.yieldPercent || (usdApplied > 0 ? ((usdCurrent - usdApplied) / usdApplied) * 100 : 0));
      
      // Calculate BRL amounts using netUsdRateAvenue (discounting 1.8% IOF/spread)
      const amountInvested = Math.round(usdApplied * netUsdRateAvenue);
      const currentValue = Math.round(usdCurrent * netUsdRateAvenue);
      const monthlyDividend = inv.monthlyDividend || 0;

      return {
        ...inv,
        ticker: inv.ticker || 'S/T',
        name: inv.name || inv.companyName || inv.ticker || 'Ativo',
        companyName: inv.companyName || inv.name || 'Empresa',
        assetClass: inv.assetClass || 'Internacional',
        sharesCount,
        averagePrice,
        currentPrice,
        usdApplied,
        usdCurrent,
        usdChange,
        percentChange,
        amountInvested,
        currentValue,
        monthlyDividend,
      };
    });

  const totalInvested = safeInvestments.reduce((acc, item) => acc + item.amountInvested, 0);
  const totalCurrentValue = safeInvestments.reduce((acc, item) => acc + item.currentValue, 0);
  const totalProfit = totalCurrentValue - totalInvested;
  const overallYield = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const totalMonthlyDividends = safeInvestments.reduce((acc, item) => acc + item.monthlyDividend, 0);
  const totalUsdValue = safeInvestments.reduce((acc, item) => acc + item.usdCurrent, 0);
  const totalBrlCommercial = totalUsdValue * usdExchangeRateCommercial;
  const totalBrlAvenueNet = totalUsdValue * netUsdRateAvenue;

  // Pie chart data by individual asset
  const pieData = safeInvestments.map((inv) => ({
    name: inv.name,
    value: inv.currentValue || 1,
  }));

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-3xl p-6 border border-white/90">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
            Meus <span className="font-serif italic font-bold text-3xl sm:text-4xl text-[#C4C240]">Investimentos</span> & Câmbio
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[#11310C]/5 text-[#11310C] border border-[#11310C]/10">
            <Globe className="w-4 h-4 text-[#C4C240]" />
            <span>Dólar Comercial: R$ {usdExchangeRateCommercial.toFixed(2)}</span>
          </div>

          <button
            onClick={onOpenManualModal}
            className="liquid-button flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-[#11310C] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Aporte</span>
          </button>
        </div>
      </div>

      {/* Top Investment Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Posição Intacta em Dólares (USD $) */}
        <div className="glass-card rounded-3xl p-5 border border-white/90 bg-gradient-to-br from-white via-white to-emerald-50/50">
          <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider mb-2 block">
            Valor bruto em USD ($)
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900">
            $ {totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-[#11310C]/70 mt-2">
            Valor mantido em carteira internacional
          </p>
        </div>

        {/* Card 2: Valor Bruto Convertido em R$ sem IOF */}
        <div className="glass-card rounded-3xl p-5 border border-white/90">
          <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider block mb-2">
            Valor bruto em R$ ({usdExchangeRateCommercial.toFixed(2)})
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
            {formatCurrency(totalBrlCommercial)}
          </div>
          <p className="text-[11px] font-medium text-[#11310C]/60 mt-2">
            Conversão direta sem descontos (100% Câmbio Comercial)
          </p>
        </div>

        {/* Card 3: Valor Líquido pós-IOF/Spread em R$ */}
        <div className="glass-card rounded-3xl p-5 border border-white/90 bg-gradient-to-br from-white via-white to-amber-50/40">
          <span className="text-xs font-bold text-[#11310C]/70 uppercase tracking-wider block mb-2">
            Líquido pós-IOF/Spread (R$)
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#11310C]">
            {formatCurrency(totalBrlAvenueNet)}
          </div>
          <p className="text-[11px] font-medium text-amber-900 mt-2">
            Descontando repatriação Avenue (1,8% IOF + Spread)
          </p>
        </div>

        {/* Card 4: Lucro Acumulado (Estética Dinheiro Total Consolidado) */}
        <div className="glass-dark-card rounded-3xl p-5 text-[#FAFBF6] space-y-3 relative overflow-hidden glaze-shine flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#C4C240] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#C4C240]" />
                Lucro Acumulado
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C4C240] text-[#11310C]">
                {formatPercent(overallYield)}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-2">
              {formatCurrency(totalProfit)}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-[#FAFBF6]/80 font-medium">
            <span>Renda Passiva:</span>
            <strong className="text-[#C4C240] font-extrabold">{formatCurrency(totalMonthlyDividends)}/mês</strong>
          </div>
        </div>
      </div>

      {/* Câmbio: dólar médio de todas as remessas */}
      {exchanges.length > 0 && (() => {
        const valueAtAverage = totalUsdValue * exchangeSummary.averageRate;
        const valueToday = totalUsdValue * usdExchangeRateCommercial;
        const fxGain = valueToday - valueAtAverage;
        const rateDiffPct = exchangeSummary.averageRate > 0 ? ((usdExchangeRateCommercial / exchangeSummary.averageRate) - 1) * 100 : 0;
        const visible = showAllExchanges ? sortedExchanges : sortedExchanges.slice(0, 5);
        return (
          <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#11310C]/10">
              <div>
                <h3 className="text-lg font-extrabold text-[#11310C]">
                  Meu <span className="font-serif italic font-bold text-xl text-[#C4C240]">Dólar Médio</span>
                </h3>
                <p className="text-xs text-[#11310C]/60">Calculado a partir de {exchanges.length} câmbios (reais enviados ÷ dólares recebidos)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-[#11310C] text-[#FAFBF6] p-4">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C4C240]">Dólar médio</span>
                <div className="text-2xl font-extrabold mt-1">R$ {exchangeSummary.averageRate.toFixed(4).replace('.', ',')}</div>
                <p className={`text-[11px] font-semibold mt-1 ${rateDiffPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  Hoje R$ {usdExchangeRateCommercial.toFixed(2).replace('.', ',')} ({rateDiffPct >= 0 ? '+' : ''}{rateDiffPct.toFixed(1).replace('.', ',')}%)
                </p>
              </div>
              <div className="rounded-2xl bg-[#11310C]/5 border border-[#11310C]/10 p-4">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#11310C]/60">Total enviado</span>
                <div className="text-xl font-extrabold text-[#11310C] mt-1">{formatCurrency(exchangeSummary.totalBrl)}</div>
                <p className="text-[11px] font-medium text-[#11310C]/60 mt-1">Taxas: {formatCurrency(exchangeSummary.totalFees)}</p>
              </div>
              <div className="rounded-2xl bg-[#11310C]/5 border border-[#11310C]/10 p-4">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#11310C]/60">Dólares comprados</span>
                <div className="text-xl font-extrabold text-emerald-900 mt-1">
                  $ {exchangeSummary.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] font-medium text-[#11310C]/60 mt-1">Carteira hoje: $ {totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-2xl bg-[#11310C]/5 border border-[#11310C]/10 p-4">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#11310C]/60">Ganho no câmbio</span>
                <div className={`text-xl font-extrabold mt-1 ${fxGain >= 0 ? 'text-emerald-800' : 'text-[#E13513]'}`}>
                  {fxGain >= 0 ? '+' : ''}{formatCurrency(fxGain)}
                </div>
                <p className="text-[11px] font-medium text-[#11310C]/60 mt-1">Carteira atual no dólar de hoje vs. no dólar médio</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#11310C]/50 font-extrabold border-b border-[#11310C]/10">
                    <th className="pb-2 text-left">Data</th>
                    <th className="pb-2 text-right">Enviado</th>
                    <th className="pb-2 text-right">Recebido</th>
                    <th className="pb-2 text-right">Cotação</th>
                    <th className="pb-2 text-right whitespace-nowrap">Taxas</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr key={e.id} className="border-b border-[#11310C]/5 font-semibold text-[#11310C]">
                      <td className="py-2 whitespace-nowrap">
                        {formatDateShort(e.date)}
                        {e.provider && <span className="ml-1.5 text-[10px] font-bold text-[#11310C]/50">{e.provider}</span>}
                      </td>
                      <td className="py-2 text-right">{formatCurrency(e.brlAmount)}</td>
                      <td className="py-2 text-right text-emerald-900">$ {e.usdAmount.toFixed(2)}</td>
                      <td className="py-2 text-right">{e.usdAmount > 0 ? (e.brlAmount / e.usdAmount).toFixed(4).replace('.', ',') : '—'}</td>
                      <td className="py-2 text-right text-[#11310C]/60">{formatCurrency(e.feesBrl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedExchanges.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllExchanges((v) => !v)}
                className="text-xs font-bold text-[#11310C] underline cursor-pointer"
              >
                {showAllExchanges ? 'Mostrar menos' : `Ver todos os ${sortedExchanges.length} câmbios`}
              </button>
            )}
          </div>
        );
      })()}

      {/* 1. Investment List Table (Full Width Top Block) */}
      <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#11310C]/10">
          <div>
            <h3 className="text-lg font-extrabold text-[#11310C]">
              Ativos em <span className="font-serif italic font-bold text-xl text-[#C4C240]">Carteira</span>
            </h3>
            <p className="text-xs text-[#11310C]/60">Sincronizado em R$ (BRL) e $ (USD)</p>
          </div>
          <span className="text-xs font-extrabold text-[#11310C] bg-[#11310C]/5 px-3 py-1 rounded-full border border-[#11310C]/10">
            {safeInvestments.length} Ativos
          </span>
        </div>

        {safeInvestments.length === 0 ? (
          <div className="p-8 text-center space-y-3 bg-white/60 rounded-2xl border border-[#11310C]/10">
            <Building2 className="w-8 h-8 text-[#11310C]/40 mx-auto" />
            <h4 className="font-extrabold text-sm text-[#11310C]">Nenhum Ativo Carregado</h4>
            <p className="text-xs text-[#11310C]/60 max-w-md mx-auto font-medium">
              Sua planilha de investimentos no Google Sheets é privada ou ainda não respondeu à conexão. Na aba <strong>Configurações</strong>, faça login com a conta Google dona da planilha para liberar a sincronização em tempo real.
            </p>
          </div>
        ) : (
          /* Table with clean headers and no line breaks */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#11310C] whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#11310C]/10 text-[10px] font-bold uppercase tracking-wider text-[#11310C]/60">
                  <th className="pb-2 whitespace-nowrap">Ticker</th>
                  <th className="pb-2 whitespace-nowrap">Nome</th>
                  <th className="pb-2 whitespace-nowrap">Classe</th>
                  <th className="pb-2 text-right whitespace-nowrap">Ações</th>
                  <th className="pb-2 text-right whitespace-nowrap">P. Médio</th>
                  <th className="pb-2 text-right whitespace-nowrap">P. Atual</th>
                  <th className="pb-2 text-right whitespace-nowrap">Var $</th>
                  <th className="pb-2 text-right whitespace-nowrap">Var %</th>
                  <th className="pb-2 text-right whitespace-nowrap">USD Aplicado</th>
                  <th className="pb-2 text-right whitespace-nowrap">USD Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#11310C]/5 font-semibold">
                {safeInvestments.map((inv) => {
                  const isPositive = inv.usdChange >= 0;

                  return (
                    <tr key={inv.id} className="hover:bg-white/60 transition-all">
                      <td className="py-3 font-mono font-extrabold text-[#11310C] whitespace-nowrap">
                        {inv.ticker}
                      </td>
                      <td className="py-3 font-bold text-[#11310C] whitespace-nowrap">
                        {inv.name}
                      </td>
                      <td className="py-3 text-[10px] whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-[#11310C]/10 text-[#11310C] font-bold whitespace-nowrap inline-block">
                          {inv.assetClass || 'Ação'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-extrabold whitespace-nowrap">
                        {inv.sharesCount % 1 === 0 ? inv.sharesCount : parseFloat(inv.sharesCount.toFixed(5))}
                      </td>
                      <td className="py-3 text-right text-[#11310C]/80 whitespace-nowrap">
                        ${inv.averagePrice.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-extrabold text-[#11310C] whitespace-nowrap">
                        ${inv.currentPrice.toFixed(2)}
                      </td>
                      <td className={`py-3 text-right font-extrabold whitespace-nowrap ${isPositive ? 'text-emerald-800' : 'text-[#E13513]'}`}>
                        {isPositive ? '+' : ''}${inv.usdChange.toFixed(2)}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap ${
                          isPositive ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                        }`}>
                          {isPositive ? '+' : ''}{inv.percentChange.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 text-right text-[#11310C]/70 whitespace-nowrap">
                        ${inv.usdApplied.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-extrabold text-emerald-900 whitespace-nowrap">
                        ${inv.usdCurrent.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Allocation Donut Chart (Moved Below Table, Legend on the Right) */}
      <div className="glass-card rounded-3xl p-6 border border-white/90 space-y-4">
        <div>
          <h3 className="text-lg font-extrabold text-[#11310C]">
            Alocação de <span className="font-serif italic font-bold text-xl text-[#C4C240]">Ativos</span>
          </h3>
          <p className="text-xs text-[#11310C]/60">Proporção por ativo individual</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 pt-2">
          {/* Donut Chart on the Left */}
          <div className="w-full md:w-72 h-64 flex items-center justify-center flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip totalValue={totalCurrentValue} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Asset Names Written Out in Full Side-by-Side on the Right */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 max-h-64 overflow-y-auto pr-2">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-bold p-2 rounded-xl bg-white/60 border border-[#11310C]/05">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-[#11310C] font-extrabold truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <span className="text-[#11310C] font-mono font-extrabold flex-shrink-0 bg-[#11310C]/5 px-2 py-0.5 rounded-lg">
                  {totalCurrentValue > 0 ? ((item.value / totalCurrentValue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

