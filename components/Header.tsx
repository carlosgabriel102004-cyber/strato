
import React, { useState } from 'react';

interface HeaderProps {
  selectedMonths: string[];
  onMonthsChange: (months: string[]) => void;
  onOpenSources: () => void;
  onOpenManual: () => void;
  isSyncing: boolean;
  onRefresh: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  selectedMonths, 
  onMonthsChange,
  onOpenSources, 
  onOpenManual,
  isSyncing, 
  onRefresh 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const toggleMonth = (mId: string) => {
    if (selectedMonths.includes(mId)) {
      onMonthsChange(selectedMonths.filter(m => m !== mId));
    } else {
      onMonthsChange([...selectedMonths, mId]);
    }
  };

  const selectAll = () => {
    const all = months.map((_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`);
    onMonthsChange(all);
  };

  const clearSelection = () => onMonthsChange([]);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
              <i className="fas fa-wallet"></i>
            </div>
            <h1 className="text-lg font-black text-slate-900 hidden xs:block tracking-tighter">FinanceFlow</h1>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 transition-all border border-slate-200"
            >
              <i className="far fa-calendar-alt text-indigo-500"></i>
              <span>Período</span>
              <span className="bg-indigo-600 text-white text-[10px] px-1.5 rounded-full ml-1">
                {selectedMonths.length}
              </span>
              <i className={`fas fa-chevron-down text-[10px] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                <div className="absolute top-12 left-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentYear}</span>
                    <button onClick={selectAll} className="text-[10px] font-bold text-indigo-600 hover:underline">Selecionar Tudo</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto mt-2">
                    {months.map((name, i) => {
                      const mId = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
                      const isSelected = selectedMonths.includes(mId);
                      return (
                        <button
                          key={mId}
                          onClick={() => toggleMonth(mId)}
                          className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <div className={`w-4 h-4 border rounded mr-3 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                            {isSelected && <i className="fas fa-check text-[8px] text-white"></i>}
                          </div>
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onRefresh}
            disabled={isSyncing}
            className={`p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all ${isSyncing ? 'animate-spin' : ''}`}
            title="Sincronizar dados"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
          
          <button 
            onClick={onOpenManual}
            className="hidden sm:flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg text-sm font-bold transition-all border border-indigo-100"
          >
            <i className="fas fa-plus"></i>
            Novo Lançamento
          </button>

          <button 
            onClick={onOpenSources}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md shadow-slate-200"
          >
            <i className="fas fa-cog"></i>
            <span className="hidden md:inline">Configurar Fontes</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
