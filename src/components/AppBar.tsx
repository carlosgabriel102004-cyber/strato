import React from 'react';
import { RefreshCw, Settings } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Visão geral' },
  { id: 'extrato', label: 'Extrato' },
  { id: 'cartoes', label: 'Cartões' },
  { id: 'investimentos', label: 'Investimentos' },
  { id: 'resumo', label: 'Patrimônio' },
  { id: 'dividas', label: 'Devedores' },
  { id: 'metas', label: 'Metas' },
];

interface AppBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  selectedMonth: string;
  monthsList: string[];
  onMonthChange: (month: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
}

export const AppBar: React.FC<AppBarProps> = ({ activeTab, onSelectTab, selectedMonth, monthsList, onMonthChange, onRefresh, onAdd }) => {
  const months = monthsList.includes(selectedMonth) ? monthsList : [selectedMonth, ...monthsList];
  return (
    <div className="st st-bar">
      <span className="st-brand" onClick={() => onSelectTab('dashboard')}>Strato</span>
      <nav className="st-nav">
        {NAV.map((item) => (
          <button key={item.id} className={activeTab === item.id ? 'on' : ''} onClick={() => onSelectTab(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
      <span className="spacer" />
      <select className="st-select hide-sm" value={selectedMonth} onChange={(e) => onMonthChange(e.target.value)} aria-label="Mês">
        {months.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <button className="st-icon hide-sm" onClick={onRefresh} title="Sincronizar"><RefreshCw size={14} /></button>
      <button className={`st-icon hide-sm`} onClick={() => onSelectTab('configuracoes')} title="Configurações"><Settings size={14} /></button>
      <button className="st-primary" onClick={onAdd}>+ Adicionar</button>
    </div>
  );
};
