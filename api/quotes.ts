import { fetchQuotesFromSheet } from '../src/lib/quotes';

// Returns only tickers, live prices and the USD rate from the quotes sheet.
export default async function handler(_req: any, res: any) {
  try {
    const quotes = await fetchQuotesFromSheet();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(quotes);
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Falha ao ler a planilha de cotações' });
  }
}
