
import React, { useState } from 'react';
import { SourceKey } from '../types';

interface SourceManagerProps {
  onClose: () => void;
  currentSources: Record<SourceKey, string>;
  onUpdate: (sources: Record<SourceKey, string>) => void;
  monthLabel: string;
}

const SourceManager: React.FC<SourceManagerProps> = ({ onClose, currentSources, onUpdate, monthLabel }) => {
  const [localSources, setLocalSources] = useState(currentSources);

  const sourcesList: { key: SourceKey; label: string; icon: string; color: string }[] = [
    { key: 'nubank_pj_pix', label: 'Nubank PJ (Pix)', icon: 'fas fa-business-time', color: 'text-purple-600' },
    { key: 'nubank_pf_pix', label: 'Nubank PF (Pix)', icon: 'fas fa-user', color: 'text-purple-500' },
    { key: 'nubank_cc', label: 'Nubank Cartão', icon: 'fas fa-credit-card', color: 'text-purple-700' },
    { key: 'picpay_pf_pix', label: 'PicPay PF (Pix)', icon: 'fas fa-wallet', color: 'text-emerald-500' },
    { key: 'picpay_pj_pix', label: 'PicPay PJ (Pix)', icon: 'fas fa-store', color: 'text-emerald-600' },
  ];

  const handleSave = () => {
    // onUpdate agora já dispara a sincronização internamente no App.tsx
    onUpdate(localSources);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Configurar Fontes</h3>
            <p className="text-sm text-slate-500">Links para o mês de {monthLabel}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-800 flex gap-3">
            <i className="fas fa-info-circle text-base mt-0.5"></i>
            <div>
              <p className="font-bold mb-1">Como usar:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Copie o link de "Exportar como CSV" da sua planilha.</li>
                <li>Certifique-se que o link está público ou compartilhado com acesso de leitura.</li>
                <li>O sistema atualizará todos os dados do mês automaticamente.</li>
              </ul>
            </div>
          </div>

          <div className="grid gap-4">
            {sourcesList.map((source) => (
              <div key={source.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:border-indigo-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center ${source.color}`}>
                    <i className={source.icon}></i>
                  </div>
                  <label className="text-sm font-bold text-slate-700">{source.label}</label>
                </div>
                <input 
                  type="url" 
                  placeholder="Link da Planilha (CSV)"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  value={localSources[source.key] || ''}
                  onChange={(e) => setLocalSources({...localSources, [source.key]: e.target.value})}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="flex-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-save"></i>
            Salvar e Sincronizar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SourceManager;
