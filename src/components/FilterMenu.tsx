import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';

interface FilterOption { id: string; label: string }

interface FilterMenuProps {
  value: string;
  options: FilterOption[];
  onChange: (id: string) => void;
  /** texto mostrado quando o valor é 'personalizado' */
  customLabel?: string;
  onCustom?: () => void;
  toggle?: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void };
  align?: 'left' | 'right';
}

/** Filtro discreto: só o período atual em texto; as opções aparecem ao clicar. */
export const FilterMenu: React.FC<FilterMenuProps> = ({ value, options, onChange, customLabel = 'Personalizado', onCustom, toggle, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const current = value === 'personalizado' ? customLabel : options.find((o) => o.id === value)?.label || '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-medium text-[#11310C]/75 hover:text-[#11310C] hover:bg-[#11310C]/5 transition-colors cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>{current}</span>
        {toggle?.checked && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#C4C240]/30 text-[#11310C]">+ ciclo</span>}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute z-40 mt-1 w-56 rounded-xl bg-[#FCFCFA] border border-[#11310C]/10 shadow-[0_16px_40px_-16px_rgba(17,49,12,0.35)] p-1 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer"
            >
              {o.label}
              {value === o.id && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
          {onCustom && (
            <button
              type="button"
              onClick={() => { setOpen(false); onCustom(); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] text-[#11310C] hover:bg-[#11310C]/5 cursor-pointer"
            >
              Personalizar…
              {value === 'personalizado' && <Check className="w-3.5 h-3.5" />}
            </button>
          )}
          {toggle && (
            <label className="flex items-start gap-2.5 px-3 py-2.5 mt-1 border-t border-[#11310C]/8 cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-[#11310C]" checked={toggle.checked} onChange={(e) => toggle.onChange(e.target.checked)} />
              <span>
                <span className="block text-[13px] text-[#11310C]">{toggle.label}</span>
                {toggle.hint && <span className="block text-[11px] text-[#11310C]/50">{toggle.hint}</span>}
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
};
