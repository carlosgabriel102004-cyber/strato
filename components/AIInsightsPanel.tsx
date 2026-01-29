
import React from 'react';
import { AIInsights } from '../types';

interface AIInsightsPanelProps {
  insights: AIInsights | null;
  isLoading: boolean;
  onGenerate: () => void;
  hasTransactions: boolean;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights, isLoading, onGenerate, hasTransactions }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24">
      <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-magic"></i>
          <h3 className="font-bold text-lg">AI Insights</h3>
        </div>
        <p className="text-indigo-100 text-sm">Análise inteligente dos seus hábitos financeiros usando Gemini.</p>
      </div>

      <div className="p-6">
        {!insights ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4 text-2xl">
              <i className="fas fa-brain"></i>
            </div>
            <p className="text-slate-600 text-sm mb-6">Pronto para analisar seus dados e dar dicas personalizadas?</p>
            <button 
              onClick={onGenerate}
              disabled={isLoading || !hasTransactions}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Analisando...
                </>
              ) : (
                <>
                  <i className="fas fa-bolt"></i>
                  Gerar Insights agora
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Resumo Executivo</h4>
              <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {insights.summary}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Top Gastos</h4>
              <div className="space-y-3">
                {insights.topCategories.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <span className="text-sm text-slate-600">{cat.category}</span>
                    <span className="text-sm font-bold text-slate-900">R$ {cat.total.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dicas de Economia</h4>
              <ul className="space-y-3">
                {insights.savingTips.map((tip, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-600">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] mt-0.5">
                      <i className="fas fa-check"></i>
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {insights.anomalies && insights.anomalies.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-3">Atenção</h4>
                <ul className="space-y-3">
                  {insights.anomalies.map((anom, i) => (
                    <li key={i} className="flex gap-3 text-sm text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <i className="fas fa-exclamation-triangle mt-0.5"></i>
                      {anom}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button 
              onClick={onGenerate}
              className="w-full text-center text-xs text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-widest mt-4"
            >
              Recalcular Análise
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsightsPanel;
