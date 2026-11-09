// Live prices still come from Google Sheets (GOOGLEFINANCE formulas).
// Only tickers, prices and the USD rate are read here; positions live in Supabase.
import { parseCsvToRows, parseCleanNumber } from '../utils/sheetParser';

const metaEnv = (import.meta as any)?.env || {};
const nodeEnv = typeof process !== 'undefined' ? process.env || {} : {};

export const QUOTES_SHEET_ID: string =
  metaEnv.VITE_QUOTES_SHEET_ID || nodeEnv.QUOTES_SHEET_ID || '1fv-MsaKURTBGIB8a3UWfLNKa5Yx6AfHXWTTYPZ1iB3c';
export const QUOTES_SHEET_GID: string = metaEnv.VITE_QUOTES_SHEET_GID || nodeEnv.QUOTES_SHEET_GID || '0';

export interface Quotes {
  usdRate: number | null;
  prices: Record<string, number>;
}

export function quotesCsvUrl(): string {
  return `https://docs.google.com/spreadsheets/d/${QUOTES_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${QUOTES_SHEET_GID}&_t=${Date.now()}`;
}

const norm = (v: string) => (v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

/**
 * Expected layout: column A = ticker, a price column (header PREÇO/PRICE/COTAÇÃO,
 * otherwise column F as in the original sheet) and the USD/BRL rate in K1.
 */
export function parseQuotesCsv(csvText: string): Quotes {
  const rows = parseCsvToRows(csvText);
  if (!rows.length) return { usdRate: null, prices: {} };

  const header = rows[0].map(norm);
  const tickerCol = Math.max(0, header.findIndex((h) => h === 'TICKER' || h === 'TIKET' || h === 'ATIVO'));
  const namedPriceCol = header.findIndex((h) => ['PRECO', 'PRECO ATUAL', 'PRICE', 'COTACAO', 'COTACAO ATUAL'].includes(h));
  const priceCol = namedPriceCol >= 0 ? namedPriceCol : 5;

  let usdRate: number | null = null;
  const k1 = parseCleanNumber(rows[0][10] || '');
  if (k1 > 3 && k1 < 10) usdRate = k1;

  const prices: Record<string, number> = {};
  for (const row of rows.slice(1)) {
    const ticker = norm(row[tickerCol] || '');
    const price = parseCleanNumber(row[priceCol] || '');
    if (ticker && price > 0) prices[ticker] = price;
  }
  return { usdRate, prices };
}

export async function fetchQuotesFromSheet(): Promise<Quotes> {
  const res = await fetch(quotesCsvUrl(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Planilha de cotações respondeu ${res.status}`);
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('Planilha de cotações não está acessível (privada?).');
  return parseQuotesCsv(text);
}

/** Browser: try the app's own API first (no CORS issues), then the sheet directly. */
export async function loadQuotes(): Promise<Quotes> {
  try {
    const res = await fetch('/api/quotes', { cache: 'no-store' });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      return (await res.json()) as Quotes;
    }
  } catch {
    // fall through to the direct sheet request
  }
  try {
    return await fetchQuotesFromSheet();
  } catch (err) {
    console.warn('Cotações indisponíveis:', err);
  }

  // Last resort for the dollar rate only
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const data = await res.json();
    const bid = parseFloat(data?.USDBRL?.bid);
    return { usdRate: bid > 3 && bid < 10 ? bid : null, prices: {} };
  } catch {
    return { usdRate: null, prices: {} };
  }
}
