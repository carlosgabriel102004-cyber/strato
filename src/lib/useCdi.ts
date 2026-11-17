import { useEffect, useState } from 'react';
import type { CdiData } from './cdiYield';

const CACHE_KEY = 'strato:cdi';
let inflight: Promise<CdiData> | null = null;

const readCache = (): CdiData | null => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
};

const load = () => {
  if (!inflight) {
    inflight = fetch('/api/cdi')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error || 'CDI indisponível');
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(body)); } catch { /* sem cache */ }
        return body as CdiData;
      })
      .catch((e) => { inflight = null; throw e; });
  }
  return inflight;
};

/** CDI oficial (Banco Central), buscado uma vez por sessão e guardado no navegador. */
export function useCdi() {
  const [cdi, setCdi] = useState<CdiData | null>(() => readCache());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((d) => { if (alive) { setCdi(d); setError(null); } }).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);
  return { cdi, error };
}
