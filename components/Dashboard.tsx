
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, SourceKey } from '../types';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];

const SOURCE_LABELS: Record<SourceKey, string> = {
  nubank_pj_pix: 'Nubank PJ',
  nubank_pf_pix: 'Nubank PF',
  nubank_cc: 'Nubank Cartão',
  picpay_pf_pix: 'PicPay PF',
  picpay_pj_pix: 'PicPay PJ',
  manual: 'Manual'
};

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const stats = useMemo(() => {
    const isPix = (t: Transaction) => 
      t.source !== 'nubank_cc' && 
      (t.source.includes('pix') || (t.source === 'manual' && t.manualSourceLabel?.toLowerCase().includes('pix')));
    
    const isCredit = (t: Transaction) => t.source === 'nubank_cc';

    const income = transactions.filter(t => t.type === 'income');
    const incomeTotal = income.reduce((sum, t) => sum + t.amount, 0);
    const incomePix = income.filter(isPix).reduce((sum, t) => sum + t.amount, 0);
    const incomeCredit = income.filter(isCredit).reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions.filter(t => t.type === 'expense');
    const expensesTotal = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expensesPix = expenses.filter(isPix).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expensesCredit = expenses.filter(isCredit).reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const balance = incomeTotal - expensesTotal;
    const balancePix = incomePix - expensesPix;
    const balanceCredit = incomeCredit - expensesCredit;

    // Gastos por Fonte
    const sourceMap: Record<string, number> = {};
    expenses.forEach(t => {
      const label = t.source === 'manual' && t.manualSourceLabel ? t.manualSourceLabel : (SOURCE_LABELS[t.source] || 'Outros');
      sourceMap[label] = (sourceMap[label] || 0) + Math.abs(t.amount);
    });

    const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Gastos por Categoria
    const categoryMap: Record<string, number> = {};
    expenses.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + Math.abs(t.amount);
    });
    const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return { 
      incomeTotal, incomePix, incomeCredit,
      expensesTotal, expensesPix, expensesCredit,
      balance, balancePix, balanceCredit,
      sourceData, pieData 
    };
  }, [transactions]);

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val));
    return isNegative ? `-${formatted}` : formatted;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entradas Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entradas Consolidadas</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(stats.incomeTotal)}</p>
          <div className="mt-3 flex gap-3 border-t border-slate-50 pt-3">
            <div className="text-[10px]">
              <span className="text-slate-400 uppercase font-bold mr-1">Pix:</span>
              <span className="text-emerald-600 font-bold">{formatCurrency(stats.incomePix)}</span>
            </div>
            <div className="text-[10px]">
              <span className="text-slate-400 uppercase font-bold mr-1">Crédito:</span>
              <span className="text-emerald-600 font-bold">{formatCurrency(stats.incomeCredit)}</span>
            </div>
          </div>
        </div>

        {/* Saídas Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saídas Consolidadas</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(stats.expensesTotal)}</p>
          <div className="mt-3 flex gap-3 border-t border-slate-50 pt-3">
            <div className="text-[10px]">
              <span className="text-slate-400 uppercase font-bold mr-1">Pix:</span>
              <span className="text-rose-600 font-bold">{formatCurrency(stats.expensesPix)}</span>
            </div>
            <div className="text-[10px]">
              <span className="text-slate-400 uppercase font-bold mr-1">Crédito:</span>
              <span className="text-rose-600 font-bold">{formatCurrency(stats.expensesCredit)}</span>
            </div>
          </div>
        </div>

        {/* Saldo Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo do Mês</p>
          <p className={`text-2xl font-black mt-1 ${stats.balance >= 0 ? 'text-indigo-600' : 'text-rose-700'}`}>
            {formatCurrency(stats.balance)}
          </p>
          <div className="mt-3 flex gap-3 border-t border-slate-50 pt-3">
            <div className="text-[10px]">
              <span className="text-slate-400 uppercase font-bold mr-1">Pix:</span>
              <span className={`${stats.balancePix >= 0 ? 'text-indigo-600' : 'text-rose-600'} font-bold`}>{formatCurrency(stats.balancePix)}</span>
            </div>
            <div className="text-[10px]">
              <span className="text-slate-400 uppercase font-bold mr-1">Crédito:</span>
              <span className={`${stats.balanceCredit >= 0 ? 'text-indigo-600' : 'text-rose-600'} font-bold`}>{formatCurrency(stats.balanceCredit)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-chart-pie text-indigo-500"></i>
            Gastos por Fonte
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {stats.sourceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {stats.sourceData.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="truncate">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-800 ml-1">
                  {stats.expensesTotal > 0 ? Math.round((entry.value / stats.expensesTotal) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-list-ul text-indigo-500"></i>
            Principais Categorias
          </h3>
          <div className="space-y-4">
            {stats.pieData.length > 0 ? stats.pieData.slice(0, 5).map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(item.value)}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${stats.expensesTotal > 0 ? (item.value / stats.expensesTotal) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )) : (
              <p className="text-center py-12 text-slate-400 text-sm italic">Sem gastos registrados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
