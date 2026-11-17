import React from 'react';
import {
  LayoutDashboard,
  PieChart,
  TrendingUp,
  CreditCard,
  Target,
  Sparkles,
  FileSpreadsheet,
  ReceiptText,
  Settings,
  Coins,
} from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  italicWord?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const TABS: TabItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'resumo',
    label: 'Resumo',
    italicWord: 'Total',
    icon: PieChart,
  },
  {
    id: 'rendimentos',
    label: 'Rendimentos',
    icon: Coins,
  },
  {
    id: 'investimentos',
    label: 'Investimentos',
    icon: TrendingUp,
  },
  {
    id: 'cartoes',
    label: 'Cartões & Assinaturas',
    icon: CreditCard,
  },
  {
    id: 'dividas',
    label: 'Devedores',
    icon: Target,
  },
  {
    id: 'metas',
    label: 'Metas & IA',
    icon: Sparkles,
    badge: 'Projeção',
  },
  {
    id: 'extrato',
    label: 'Extrato',
    icon: ReceiptText,
  },
];


interface NavTabsProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const NavTabs: React.FC<NavTabsProps> = ({ activeTab, onSelectTab }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 mt-4 mb-6">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 scrollbar-none no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <a
              key={tab.id}
              href={`#/${tab.id}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectTab(tab.id);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-[#11310C] text-[#FAFBF6] shadow-md shadow-[#11310C]/20 ring-1 ring-[#C4C240]/40'
                  : 'glass-pill text-[#11310C]/80 hover:text-[#11310C] hover:bg-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-[#C4C240]' : 'text-[#11310C]/60'
                }`}
              />
              <span>
                {tab.label}{' '}
                {tab.italicWord && (
                  <span className="font-serif italic font-bold text-sm ml-0.5 text-[#C4C240]">
                    {tab.italicWord}
                  </span>
                )}
              </span>

              {tab.badge && (
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? 'bg-[#C4C240] text-[#11310C]'
                      : 'bg-[#11310C]/10 text-[#11310C]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
};
