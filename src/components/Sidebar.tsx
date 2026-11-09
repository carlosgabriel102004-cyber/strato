import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { TABS } from './NavTabs';
import { TomatoIcon } from './TomatoIcon';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

/**
 * Menu lateral recolhível: fica só com os ícones e abre ao passar o mouse
 * (no celular, abre e fecha com um toque).
 */
export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const [open, setOpen] = useState(false);
  const items = [...TABS, { id: 'configuracoes', label: 'Configurações', icon: Settings }];

  const go = (id: string) => {
    onSelectTab(id);
    setOpen(false);
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-[55] bg-[#11310C]/10 md:hidden" onClick={() => setOpen(false)} />}
      <aside
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`fixed left-0 top-0 bottom-0 z-[60] flex flex-col bg-[#FCFCFA] border-r border-[#11310C]/10 transition-[width] duration-200 ease-out overflow-hidden ${
          open ? 'w-60 shadow-[8px_0_24px_-12px_rgba(17,49,12,0.18)]' : 'w-14'
        }`}
      >
        <button
          onClick={() => (open ? go('dashboard') : setOpen(true))}
          className="flex items-center gap-3 h-[60px] px-[14px] shrink-0 cursor-pointer border-b border-[#11310C]/8"
          title="Strato"
        >
          <TomatoIcon className="w-7 h-7 shrink-0" />
          <span className={`font-serif font-semibold text-xl tracking-tight text-[#11310C] whitespace-nowrap transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}>
            Strato
          </span>
        </button>

        <nav className="flex-1 flex flex-col gap-0.5 py-3 px-2">
          {items.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const isSettings = tab.id === 'configuracoes';
            return (
              <a
                key={tab.id}
                href={`#/${tab.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(tab.id);
                }}
                title={open ? undefined : tab.label}
                className={`relative flex items-center gap-3 h-10 px-[11px] rounded-lg text-[13px] whitespace-nowrap transition-colors ${
                  isSettings ? 'mt-auto' : ''
                } ${active ? 'bg-[#11310C] text-[#FAFBF6] font-semibold' : 'text-[#11310C]/70 hover:bg-[#11310C]/5 hover:text-[#11310C]'}`}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#C4C240]' : ''}`} />
                <span className={`transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}>
                  {tab.label}
                  {'italicWord' in tab && tab.italicWord ? <span className="font-serif italic ml-1">{tab.italicWord}</span> : null}
                </span>
                {'badge' in tab && tab.badge && open && (
                  <span className={`ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${active ? 'bg-[#C4C240] text-[#11310C]' : 'bg-[#11310C]/8 text-[#11310C]/70'}`}>
                    {tab.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
