// CDI oficial do Banco Central (SGS 12 = taxa diária em % ao dia; SGS 4389 = taxa anualizada).
const SGS = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

export interface CdiData {
  /** dias úteis mais recentes, do mais antigo para o mais novo: data ISO e taxa diária em % */
  daily: { date: string; rate: number }[];
  /** taxa anualizada mais recente, em % ao ano */
  annual: number;
  fetchedAt: string;
}

const brToIso = (br: string) => {
  const [d, m, y] = br.split('/');
  return `${y}-${m}-${d}`;
};

const brDate = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export async function fetchCdi(): Promise<CdiData> {
  const [dailyRes, annualRes] = await Promise.all([
    fetch(`${SGS}.12/dados?formato=json&dataInicial=${brDate(-75)}&dataFinal=${brDate(0)}`),
    fetch(`${SGS}.4389/dados/ultimos/1?formato=json`),
  ]);
  if (!dailyRes.ok) throw new Error(`Banco Central respondeu ${dailyRes.status}`);
  const daily = ((await dailyRes.json()) as { data: string; valor: string }[]).map((r) => ({ date: brToIso(r.data), rate: Number(r.valor) }));
  let annual = 0;
  if (annualRes.ok) {
    const a = (await annualRes.json()) as { valor: string }[];
    annual = Number(a[a.length - 1]?.valor) || 0;
  }
  if (!annual && daily.length) annual = (Math.pow(1 + daily[daily.length - 1].rate / 100, 252) - 1) * 100;
  return { daily, annual, fetchedAt: new Date().toISOString() };
}

export default async function handler(_req: any, res: any) {
  try {
    const data = await fetchCdi();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Falha ao ler o CDI do Banco Central' });
  }
}
