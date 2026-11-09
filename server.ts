import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import quotesHandler from './api/quotes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Live prices (GOOGLEFINANCE) from the quotes sheet. Financial data itself lives in Supabase.
  app.get('/api/quotes', quotesHandler);

  // Smart fallback generator for when Gemini is rate-limited or unavailable
  function generateSmartFallback(payload: any) {
    const { month, leftover, totalDebts, activeSubscriptions } = payload || {};
    const formattedLeftover = typeof leftover === 'number' ? `R$ ${leftover.toLocaleString('pt-BR')}` : 'sua sobra atual';

    const recs = [];

    if (leftover && leftover > 0) {
      recs.push({
        type: 'investment',
        title: 'Aporte de Sobra Líquida',
        description: `Sua sobra de ${formattedLeftover} em ${month || 'agosto'} pode ser alocada 70% em Tesouro IPCA/CDB de liquidez e 30% em FIIs de dividendos.`,
        impact: '+12.8% a.a. estimado'
      });
    } else {
      recs.push({
        type: 'saving',
        title: 'Ajuste de Custos Variáveis',
        description: 'Suas despesas estão próximas da receita total. Revise saídas não essenciais para garantir uma margem de reserva de ao menos 15%.',
        impact: 'Meta: 15% de sobra'
      });
    }

    if (totalDebts && totalDebts > 0) {
      recs.push({
        type: 'debt',
        title: 'Amortização Estratégica de Dívidas',
        description: `Com o saldo de R$ ${totalDebts.toLocaleString('pt-BR')} em dívidas, utilize o método bola de neve priorizando os juros mais altos.`,
        impact: 'Redução drástica de juros'
      });
    } else {
      recs.push({
        type: 'saving',
        title: 'Otimização de Assinaturas',
        description: `Com ${activeSubscriptions || 3} assinaturas recorrentes ativas, revisar serviços com pouca utilização pode gerar economia imediata.`,
        impact: 'Economia est. R$ 120/mês'
      });
    }

    recs.push({
      type: 'alert',
      title: 'Monitoramento Semanal de Fluxo',
      description: 'Sua sincronização de planilhas está ativa. Mantenha os lançamentos semanais atualizados para manter previsibilidade de caixa.',
      impact: 'Controle total de caixa'
    });

    return recs;
  }

  // In-memory cache for AI recommendations to respect API rate limits
  const aiCache = new Map<string, { data: any; expiresAt: number }>();

  // AI Recommendation endpoint using Gemini SDK
  app.post('/api/ai-recommendations', async (req, res) => {
    const payload = req.body || {};
    const cacheKey = `${payload.month || 'default'}_${payload.totalIncome}_${payload.totalExpenses}_${payload.leftover}`;
    
    // Check cache (15-minute TTL)
    const cached = aiCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.data);
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const fallbackRes = { recommendations: generateSmartFallback(payload), source: 'smart_fallback' };
        aiCache.set(cacheKey, { data: fallbackRes, expiresAt: Date.now() + 15 * 60 * 1000 });
        return res.json(fallbackRes);
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Você é um consultor financeiro pessoal altamente qualificado e empático.
Analise os seguintes dados financeiros do usuário para o mês de ${payload.month || 'mês atual'}:
- Renda Total: R$ ${payload.totalIncome}
- Despesas Totais: R$ ${payload.totalExpenses}
- Sobra Mensal: R$ ${payload.leftover}
- Total em Investimentos: R$ ${payload.totalInvestments}
- Total em Dívidas: R$ ${payload.totalDebts}
- Número de Assinaturas Ativas: ${payload.activeSubscriptions}

Forneça exatamente 3 recomendações acionáveis, diretas e motivadoras no formato JSON puro com a seguinte estrutura de schema:
[
  {
    "type": "saving" | "investment" | "debt" | "alert",
    "title": "Título sucinto",
    "description": "Explicação detalhada e prática do que fazer em português (2-3 frases)",
    "impact": "Estimativa de impacto financeiro curto (ex: 'Economia de R$ 340/mês' ou '+12.5% a.a.')"
  }
]
Forneça apenas o array JSON válido sem markdown extra.`;

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });
        responseText = response.text || '';
      } catch (geminiError: any) {
        console.log('[AI Recommendations] Quota or API limit reached, serving smart fallback recommendations.');
        const fallbackRes = { recommendations: generateSmartFallback(payload), source: 'smart_fallback' };
        aiCache.set(cacheKey, { data: fallbackRes, expiresAt: Date.now() + 15 * 60 * 1000 });
        return res.json(fallbackRes);
      }

      let recommendations = [];
      try {
        recommendations = JSON.parse(responseText);
      } catch (parseErr) {
        recommendations = generateSmartFallback(payload);
      }

      const successRes = { recommendations, source: 'gemini' };
      aiCache.set(cacheKey, { data: successRes, expiresAt: Date.now() + 15 * 60 * 1000 });
      res.json(successRes);
    } catch (err: any) {
      console.log('[AI Recommendations] Endpoint handled request with fallback.');
      const fallbackRes = { recommendations: generateSmartFallback(payload), source: 'smart_fallback' };
      res.json(fallbackRes);
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
