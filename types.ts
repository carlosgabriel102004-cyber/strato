
export type SourceKey = 'nubank_pj_pix' | 'nubank_pf_pix' | 'nubank_cc' | 'picpay_pf_pix' | 'picpay_pj_pix' | 'manual';

export interface SourceConfig {
  id: SourceKey;
  label: string;
  icon: string;
  url: string;
  lastSynced?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  source: SourceKey;
  manualSourceLabel?: string; // Para distinguir se foi Dinheiro, Pix, etc
}

export interface AIInsights {
  summary: string;
  topCategories: { category: string; total: number }[];
  savingTips: string[];
  anomalies: string[];
}

export enum AppState {
  EMPTY = 'EMPTY',
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface MonthData {
  monthId: string; // Ex: "2024-03"
  sources: Record<SourceKey, string>;
}
