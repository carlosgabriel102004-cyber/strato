
import React, { useState } from 'react';
import { Transaction, SourceKey } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  ignoredIds: string[];
  onToggleIgnore: (id: string) => void;
  onEdit: (tx: Transaction) => void;
}

const SOURCE_LABELS: Record<SourceKey, string> = {
  nubank_pj_pix: 'Nubank PJ',
  nubank_pf_pix: 'Nubank PF',
  nubank_cc: 'Nubank CC',
  picpay_pf_pix: 'PicPay PF',
  picpay_pj_pix: 'PicPay PJ',
  manual: 'Manual'
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, ignoredIds, onToggleIgnore, onEdit }) => {
  const [filter, setFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(filter.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(filter.toLowerCase()))
  );

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val));
    return isNegative ? `-${formatted}` : formatted;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col relative">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-slate-800">Histórico de Lançamentos</h3>
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input 
            type="text" 
            placeholder="Filtrar lançamentos..."
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>
      
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Data</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Fonte</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Descrição</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-right">Valor</th>
              <th className="px-6 py-4 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? filtered.map((t, index) => {
              const isIgnored = ignoredIds.includes(t.id);
              const isLastRows = index >= filtered.length - 3 && filtered.length > 3;

              return (
                <tr 
                  key={t.id} 
                  className={`transition-colors relative group ${isIgnored ? 'bg-slate-50/40 italic' : 'hover:bg-slate-50/50'}`}
                >
                  <td className={`px-6 py-4 whitespace-nowrap text-[12px] font-medium ${isIgnored ? 'text-slate-400 opacity-50' : 'text-slate-600'}`}>
                    {t.date}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isIgnored ? 'opacity-40' : ''}`}>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-sm border ${
                      isIgnored 
                        ? 'bg-slate-100 text-slate-400 border-slate-200' 
                        : t.source === 'manual' 
                          ? 'bg-amber-50 text-amber-700 border-amber-100' 
                          : t.source.includes('nubank') 
                            ? 'bg-purple-50 text-purple-700 border-purple-100' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {t.source === 'manual' ? t.manualSourceLabel : SOURCE_LABELS[t.source]}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-medium max-w-xs truncate text-[13px] ${isIgnored ? 'text-slate-400 line-through opacity-50' : 'text-slate-700'}`}>
                    {t.description}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold text-[13px] ${isIgnored ? 'text-slate-300 line-through' : t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' && !isIgnored ? '+' : ''} {formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block text-left">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-all focus:outline-none opacity-100"
                      >
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                      
                      {openMenuId === t.id && (
                        <>
                          {/* O backdrop e o menu agora estão fora de qualquer container com opacidade reduzida */}
                          <div className="fixed inset-0 z-[60]" onClick={() => setOpenMenuId(null)}></div>
                          <div className={`absolute right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-[70] py-2 animate-in fade-in zoom-in-95 duration-150 opacity-100 ring-1 ring-black/5 ${isLastRows ? 'bottom-full mb-2' : 'mt-2'}`}>
                            <button 
                              onClick={() => {
                                onEdit(t);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                              <i className="fas fa-edit text-indigo-500 w-4"></i>
                              Editar Lançamento
                            </button>
                            <button 
                              onClick={() => {
                                onToggleIgnore(t.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-50 mt-1"
                            >
                              <i className={isIgnored ? "fas fa-check-circle text-emerald-500 w-4" : "fas fa-eye-slash text-slate-500 w-4"}></i>
                              {isIgnored ? 'Reconsiderar' : 'Desconsiderar'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic font-medium">
                  Nenhum lançamento encontrado para os meses e filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
