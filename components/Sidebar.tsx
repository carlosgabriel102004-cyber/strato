
import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonths: string[];
  onMonthToggle: (mId: string) => void;
  onSelectAll: (months: string[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, selectedMonths, onMonthToggle, onSelectAll }) => {
  const currentYear = new Date().getFullYear();
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const allYearMonths = months.map((_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`);

  return (
    <aside className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-white border-r border-slate-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-full px-3 py-4 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-6 px-2">
          <span className="text-xl font-black text-indigo-600">FinanceFlow</span>
          <button onClick={onClose} className="md:hidden p-2 text-slate-400">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 space-y-1">
          <button 
            onClick={() => onSelectAll(allYearMonths)}
            className="w-full flex items-center p-2 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors group mb-4 bg-indigo-50 border border-indigo-100"
          >
            <i className="fas fa-calendar-check text-indigo-600 mr-3"></i>
            Selecionar Tudo ({currentYear})
          </button>

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">MESES</div>
          {months.map((name, i) => {
            const mId = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
            const isSelected = selectedMonths.includes(mId);
            return (
              <button
                key={mId}
                onClick={() => onMonthToggle(mId)}
                className={`w-full flex items-center justify-between p-2.5 text-sm rounded-xl transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="flex items-center">
                  <i className={`fas fa-calendar-day mr-3 ${isSelected ? 'text-indigo-200' : 'text-slate-300'}`}></i>
                  {name}
                </span>
                {isSelected && <i className="fas fa-check-circle text-[10px]"></i>}
              </button>
            );
          })}
        </div>

        <div className="mt-auto p-2 bg-slate-50 rounded-xl">
          <p className="text-[10px] text-slate-400 font-medium text-center italic">Versão 2.0 • Pro</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
