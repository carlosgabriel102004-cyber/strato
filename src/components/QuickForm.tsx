import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface QuickField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'money';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
  half?: boolean; // ocupa meia linha
}

interface QuickFormProps {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: QuickField[];
  initial?: Record<string, string>;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
}

export const parseMoney = (value: string) => {
  const s = (value || '').replace(/[R$\s]/g, '');
  if (!s) return NaN;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Number(normalized);
};

/** Formulário curto e padronizado para os cadastros do app. */
export const QuickForm: React.FC<QuickFormProps> = ({ open, title, subtitle, fields, initial, submitLabel = 'Salvar', onClose, onSubmit }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial || {});
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !(values[f.name] || '').trim()) {
        setError(`Preencha: ${f.label}`);
        return;
      }
      if ((f.type === 'money' || f.type === 'number') && values[f.name] && Number.isNaN(parseMoney(values[f.name]))) {
        setError(`Valor inválido em: ${f.label}`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full h-10 px-3 rounded-lg glass-field text-[13px] text-[#11310C] placeholder-[#11310C]/35 transition-colors';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 glass-overlay" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-panel rounded-2xl"
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#11310C]/8">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#11310C]">{title}</h3>
            {subtitle && <p className="text-xs text-[#11310C]/55 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#11310C]/5 cursor-pointer" aria-label="Fechar">
            <X className="w-4 h-4 text-[#11310C]/60" />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-x-3 gap-y-4 max-h-[65vh] overflow-y-auto">
          {fields.map((f) => (
            <label key={f.name} className={f.half ? 'col-span-1' : 'col-span-2'}>
              <span className="block text-[11px] font-medium uppercase tracking-[0.1em] text-[#11310C]/55 mb-1.5">{f.label}</span>
              {f.type === 'select' ? (
                <select
                  className={input}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                >
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={`${input} ${f.type === 'money' || f.type === 'number' ? 'text-right tabular-nums' : ''}`}
                  type={f.type === 'date' ? 'date' : 'text'}
                  inputMode={f.type === 'money' || f.type === 'number' ? 'decimal' : undefined}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              )}
              {f.hint && <span className="block text-[11px] text-[#11310C]/45 mt-1">{f.hint}</span>}
            </label>
          ))}
        </div>

        {error && <p className="px-6 -mt-1 pb-3 text-xs font-medium text-[#E13513]">{error}</p>}

        <div className="flex justify-end gap-2 px-6 pb-5">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg text-[13px] font-medium text-[#11310C]/70 hover:bg-[#11310C]/5 cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="h-10 px-5 rounded-lg bg-[#11310C] text-[#FAFBF6] text-[13px] font-semibold disabled:opacity-60 cursor-pointer">
            {saving ? 'Salvando…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};
