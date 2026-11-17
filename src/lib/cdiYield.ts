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

/** Bancos cujo app já mostra o rendimento sem o IR: lá o que cai na conta é o líquido. */
export const SHOWS_NET: Record<Bank, boolean> = { nubank: false, picpay: true, mercadopago: true, outro: false };
/** Fator para chegar ao valor "como cai na conta": líquido no PicPay e Mercado Pago, bruto no Nubank. */
export const contaFactor = (bank: Bank, ir: number) => (SHOWS_NET[bank] ? 1 - ir : 1);

export const BANK_LABEL: Record<Bank, string> = { nubank: 'Nubank', picpay: 'PicPay', mercadopago: 'Mercado Pago', outro: '' };

const DAY = 86400000;
const toDate = (iso: string) => new Date(`${iso}T12:00:00`);
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);
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

// ---------- Rendimento por mês (Dashboard) ----------

const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Feriados nacionais (bolsa/CDI não corre). Fixos + móveis de 2026 e 2027.
const FIXED_HOLIDAYS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
const MOVABLE_HOLIDAYS = ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04', '2027-02-08', '2027-02-09', '2027-03-26', '2027-05-27'];
export const isBusinessDay = (iso: string) => {
  const wd = toDate(iso).getDay();
  return wd !== 0 && wd !== 6 && !FIXED_HOLIDAYS.includes(iso.slice(5)) && !MOVABLE_HOLIDAYS.includes(iso);
};

export const parseMonthLabel = (label: string) => {
  const [name, year] = (label || '').trim().toLowerCase().split(/\s+/);
  const m = MONTHS_PT.indexOf(name);
  return m >= 0 && Number(year) ? { y: Number(year), m: m + 1 } : null;
};
export const brToIsoDate = (br: string) => {
  if (/^\d{4}-\d{2}-\d{2}/.test(br)) return br.slice(0, 10);
  const [d, m, y] = (br || '').split('/');
  return y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : '';
};

export interface MonthYieldInput {
  rows: { date: string; monthLabel: string; balances: Record<string, number>; isProjected?: boolean }[];
  accounts: { name: string; ratePct: number; investedSince?: string | null }[];
}

export interface MonthYield {
  gross: number; // mês inteiro (no mês corrente, previsto)
  net: number;
  toDateGross: number; // só o que já rendeu
  toDateNet: number;
  dailyGross: number; // por dia útil, com o último CDI
  dailyNet: number;
  conta: number; // como cai na conta: líquido no PicPay/Mercado Pago, bruto no Nubank
  toDateConta: number;
  dailyConta: number;
  isPartial: boolean; // mês corrente: parte é previsão
}

/** Rendimento estimado das caixinhas num mês, a partir do saldo lançado naquele mês. */
export function monthYield(label: string, input: MonthYieldInput, cdi: CdiData, today: string): MonthYield | null {
  const ym = parseMonthLabel(label);
  if (!ym || !cdi.daily.length) return null;
  const monthKey = `${ym.y}-${String(ym.m).padStart(2, '0')}`;
  if (monthKey > today.slice(0, 7)) return null;
  const firstCdi = cdi.daily[0].date;
  if (`${monthKey}-01` < firstCdi) return null; // fora do histórico do CDI

  const realRows = input.rows.filter((r) => !r.isProjected && brToIsoDate(r.date));
  const row = realRows.find((r) => r.monthLabel.toLowerCase() === label.toLowerCase())
    || [...realRows].reverse().find((r) => brToIsoDate(r.date) <= `${monthKey}-31`);
  if (!row) return null;

  const lastCdi = cdi.daily[cdi.daily.length - 1];
  const monthDays = cdi.daily.filter((d) => d.date.startsWith(monthKey));
  // dias úteis do mês ainda sem CDI publicado (até o fim do mês), com a última taxa
  let remaining = 0;
  if (monthKey === today.slice(0, 7)) {
    const lastDay = new Date(ym.y, ym.m, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${monthKey}-${String(d).padStart(2, '0')}`;
      if (iso > lastCdi.date && isBusinessDay(iso)) remaining++;
    }
  }

  const out: MonthYield = { gross: 0, net: 0, toDateGross: 0, toDateNet: 0, dailyGross: 0, dailyNet: 0, conta: 0, toDateConta: 0, dailyConta: 0, isPartial: remaining > 0 };
  for (const acc of input.accounts) {
    if (!(acc.ratePct > 0)) continue;
    const bal = Number(row.balances?.[acc.name]) || 0;
    if (bal <= 0) continue;
    const ir = acc.investedSince ? irRateFor(daysBetween(acc.investedSince, today)) : 0.225;
    const f = monthDays.reduce((x, d) => x * (1 + (d.rate / 100) * (acc.ratePct / 100)), 1);
    const toDate = bal * (f - 1);
    const daily = bal * f * (lastCdi.rate / 100) * (acc.ratePct / 100);
    const full = toDate + daily * remaining;
    out.toDateGross += toDate;
    out.toDateNet += toDate * (1 - ir);
    out.gross += full;
    out.net += full * (1 - ir);
    out.dailyGross += daily;
    out.dailyNet += daily * (1 - ir);
    const cf = contaFactor(bankOf(acc.name), ir);
    out.conta += full * cf;
    out.toDateConta += toDate * cf;
    out.dailyConta += daily * cf;
  }
  return out;
}

export interface AccountMonth {
  toDate: number; // bruto já rendido no mês
  full: number; // bruto do mês inteiro (com previsão dos dias que faltam)
  daily: number; // bruto por dia útil com o último CDI
  days: { date: string; value: number; projected: boolean }[]; // bruto por dia útil do mês
}

/** Rendimento bruto de um saldo num mês (AAAA-MM), dia a dia, com previsão até o fim do mês corrente. */
export function accountMonth(balance: number, pct: number, cdi: CdiData, monthKey: string, today: string): AccountMonth {
  const out: AccountMonth = { toDate: 0, full: 0, daily: 0, days: [] };
  if (!(balance > 0) || !(pct > 0) || !cdi.daily.length) return out;
  const last = cdi.daily[cdi.daily.length - 1];
  let bal = balance;
  for (const d of cdi.daily) {
    if (!d.date.startsWith(monthKey)) continue;
    const v = bal * (d.rate / 100) * (pct / 100);
    out.days.push({ date: d.date, value: v, projected: false });
    out.toDate += v;
    bal += v;
  }
  out.daily = bal * (last.rate / 100) * (pct / 100);
  out.full = out.toDate;
  if (monthKey === today.slice(0, 7)) {
    const [y, m] = monthKey.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const iso = `${monthKey}-${String(day).padStart(2, '0')}`;
      if (iso > last.date && isBusinessDay(iso)) {
        const v = bal * (last.rate / 100) * (pct / 100);
        out.days.push({ date: iso, value: v, projected: true });
        out.full += v;
        bal += v;
      }
    }
  }
  return out;
}
