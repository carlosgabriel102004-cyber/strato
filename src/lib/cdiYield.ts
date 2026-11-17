// Rendimento das caixinhas atreladas ao CDI.
// Regra de CDB/RDB: rende sobre o valor bruto; IR só no resgate (tabela regressiva);
// IOF só em resgate nos primeiros 30 dias de cada depósito.

export interface CdiData {
  daily: { date: string; rate: number }[]; // % ao dia, dias úteis, do mais antigo ao mais novo
  annual: number; // % ao ano
  fetchedAt: string;
}

export type Bank = 'nubank' | 'picpay' | 'mercadopago' | 'outro';

export interface YieldAccount {
  id: string;
  name: string;
  pct: number; // % do CDI
  balance: number; // último saldo lançado
  balanceDate: string; // ISO
  investedSince?: string | null;
  lastDepositOn?: string | null;
  lastDepositAmount?: number | null;
}

export interface YieldRow {
  id: string;
  name: string;
  bank: Bank;
  pct: number;
  balanceEstimate: number; // saldo estimado hoje (bruto)
  balanceDate: string;
  todayGross: number; // rendimento do último dia útil
  monthGross: number; // rendimento bruto do mês corrente
  irRate: number; // fração (0,225 …)
  irKnown: boolean;
  todayNet: number; // se sacasse: sem IR
  monthNet: number;
  iofProvision: number; // IOF provisório do último depósito (se < 30 dias)
  iofEndsOn: string | null; // quando o IOF provisório some
}

const IOF_TABLE = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0];

export const bankOf = (name: string): Bank => {
  const n = name.toLowerCase();
  if (n.includes('picpay')) return 'picpay';
  if (n.includes('mercado pago') || n.includes('mercadopago')) return 'mercadopago';
  if (/\bnu\b|nubank/.test(n)) return 'nubank';
  return 'outro';
};

export const BANK_NOTE: Record<Bank, string> = {
  nubank: 'No app do Nubank aparece o bruto; o imposto vem à parte, em "Impostos no resgate".',
  picpay: 'No app do PicPay o rendimento já aparece sem IR e sem o IOF dos primeiros 30 dias de cada depósito.',
  mercadopago: 'No app do Mercado Pago o rendimento diário já aparece sem o IR.',
  outro: '',
};

export const BANK_LABEL: Record<Bank, string> = { nubank: 'Nubank', picpay: 'PicPay', mercadopago: 'Mercado Pago', outro: '' };

const DAY = 86400000;
const toDate = (iso: string) => new Date(`${iso}T12:00:00`);
const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);
const addDays = (iso: string, n: number) => new Date(toDate(iso).getTime() + n * DAY).toISOString().slice(0, 10);

/** Faixa do IR pela idade do dinheiro (dias corridos). */
export const irRateFor = (days: number) => (days <= 180 ? 0.225 : days <= 360 ? 0.2 : days <= 720 ? 0.175 : 0.15);

/** Fator acumulado entre duas datas: dias úteis do CDI com data > from e <= to. */
const factorBetween = (cdi: CdiData, pct: number, fromExclusive: string, toInclusive: string) =>
  cdi.daily
    .filter((d) => d.date > fromExclusive && d.date <= toInclusive)
    .reduce((f, d) => f * (1 + (d.rate / 100) * (pct / 100)), 1);

export function computeYield(acc: YieldAccount, cdi: CdiData, today: string): YieldRow {
  const last = cdi.daily[cdi.daily.length - 1];
  const r = last ? (last.rate / 100) * (acc.pct / 100) : 0;
  // saldo projetado do dia do lançamento até o último dia útil publicado
  const balanceEstimate = acc.balance * factorBetween(cdi, acc.pct, acc.balanceDate, last?.date || acc.balanceDate);
  const todayGross = balanceEstimate * r / (1 + r);
  const monthStart = `${today.slice(0, 7)}-00`;
  const monthFactor = factorBetween(cdi, acc.pct, monthStart, today);
  const monthGross = balanceEstimate - balanceEstimate / monthFactor;

  const irKnown = Boolean(acc.investedSince);
  const irRate = irKnown ? irRateFor(daysBetween(acc.investedSince!, today)) : 0.225;

  let iofProvision = 0;
  let iofEndsOn: string | null = null;
  if (acc.lastDepositOn && acc.lastDepositAmount) {
    const age = daysBetween(acc.lastDepositOn, today);
    if (age >= 0 && age < 30) {
      const gain = acc.lastDepositAmount * (factorBetween(cdi, acc.pct, acc.lastDepositOn, today) - 1);
      iofProvision = gain * ((IOF_TABLE[Math.max(age, 1) - 1] ?? 0) / 100);
      iofEndsOn = addDays(acc.lastDepositOn, 30);
    }
  }

  return {
    id: acc.id,
    name: acc.name,
    bank: bankOf(acc.name),
    pct: acc.pct,
    balanceEstimate,
    balanceDate: acc.balanceDate,
    todayGross,
    monthGross,
    irRate,
    irKnown,
    todayNet: todayGross * (1 - irRate),
    monthNet: monthGross * (1 - irRate),
    iofProvision,
    iofEndsOn,
  };
}
