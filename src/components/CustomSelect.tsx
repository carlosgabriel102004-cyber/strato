import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, CornerDownLeft, Plus, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  icon?: React.ReactNode;
  labelPrefix?: string;
  alignRight?: boolean;
  /** permite digitar um valor que não está na lista */
  creatable?: boolean;
}

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Seletor do Strato.
 * - A lista abre colada ao campo, por cima de tudo (não é cortada por pop-ups).
 * - Um realce desliza de uma opção para a outra seguindo o mouse ou as setas.
 * - Digitar filtra na hora; com `creatable`, Enter usa o texto digitado.
 * - Teclado: ↑ ↓ Home End Enter Esc.
 */
export const CustomSelect: React.FC<CustomSelectProps> = ({
  value, onChange, options, placeholder, className = '', buttonClassName = '', icon, labelPrefix, alignRight = false, creatable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean } | null>(null);
  const [bar, setBar] = useState<{ top: number; height: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const all: SelectOption[] = useMemo(() => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)), [options]);
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return q ? all.filter((o) => norm(o.label).includes(q)) : all;
  }, [all, query]);
  const canCreate = creatable && query.trim() !== '' && !all.some((o) => norm(o.label) === norm(query.trim()));
  const rows = canCreate ? [...filtered, { value: query.trim(), label: query.trim(), create: true } as SelectOption & { create?: boolean }] : filtered;
  const showSearch = creatable || all.length > 6;
  const selected = all.find((o) => o.value === value);

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, 190);
    const below = window.innerHeight - r.bottom;
    const up = below < 280 && r.top > below;
    const left = Math.min(Math.max(8, alignRight ? r.right - width : r.left), window.innerWidth - width - 8);
    setPos({ left, top: up ? r.top - 6 : r.bottom + 6, width, up });
  };

  const openMenu = () => {
    setQuery('');
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    place();
    setOpen(true);
  };
  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };
  const choose = (opt: SelectOption) => {
    onChange(opt.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    const onMove = () => place();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    if (showSearch) inputRef.current?.focus();
    else panelRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  // realce deslizante
  useLayoutEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    if (!el) { setBar(null); return; }
    setBar({ top: el.offsetTop, height: el.offsetHeight });
    el.scrollIntoView({ block: 'nearest' });
  }, [open, active, rows.length]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(rows.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(rows.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (rows[active]) choose(rows[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); openMenu(); } }}
        className={`group flex items-center justify-between gap-2 h-10 px-3 rounded-lg glass-field text-[13px] font-medium text-[#11310C] cursor-pointer transition-colors ${open ? '!border-[#11310C]/45 !bg-white/90' : ''} ${buttonClassName}`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {icon}
          {labelPrefix && <span className="text-[#11310C]/55 font-normal">{labelPrefix}</span>}
          <span className={`truncate ${selected || value ? '' : 'text-[#11310C]/40 font-normal'}`}>{selected?.label || value || placeholder || 'Selecione…'}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#11310C]/50 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onKey}
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width, transform: pos.up ? 'translateY(-100%)' : undefined, zIndex: 300 }}
          className="st-select-panel outline-none"
        >
          {showSearch && (
            <div className="flex items-center gap-2 px-3 h-10 border-b border-[#11310C]/8">
              <Search className="w-3.5 h-3.5 text-[#11310C]/40 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={creatable ? 'Buscar ou digitar novo…' : 'Buscar…'}
                className="w-full bg-transparent text-[13px] text-[#11310C] placeholder-[#11310C]/35 focus:outline-none"
              />
            </div>
          )}
          <div ref={listRef} className="relative max-h-60 overflow-y-auto p-1">
            {bar && <div className="st-select-bar" style={{ transform: `translateY(${bar.top}px)`, height: bar.height }} />}
            {rows.map((opt, i) => {
              const isSelected = opt.value === value;
              const isCreate = (opt as any).create;
              return (
                <button
                  key={(isCreate ? 'new:' : '') + opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-i={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(opt)}
                  className="relative w-full flex items-center gap-2.5 h-9 px-2.5 rounded-md text-left text-[13px] text-[#11310C] cursor-pointer"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isSelected ? 'bg-[#C4C240]' : 'bg-transparent'}`} />
                  {isCreate ? (
                    <span className="flex items-center gap-1.5 truncate"><Plus className="w-3.5 h-3.5 text-[#11310C]/50" />Usar “{opt.label}”</span>
                  ) : (
                    <span className={`truncate ${isSelected ? 'font-semibold' : ''}`}>{opt.label}</span>
                  )}
                  {i === active && <CornerDownLeft className="w-3 h-3 ml-auto text-[#11310C]/30 shrink-0" />}
                </button>
              );
            })}
            {rows.length === 0 && <p className="px-3 py-3 text-xs text-[#11310C]/50">Nada encontrado.</p>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
