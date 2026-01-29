
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AIInsights } from "../types";

// Initialize the Google GenAI SDK with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeTransactions = async (transactions: Transaction[]): Promise<AIInsights> => {
  const transactionData = transactions.map(t => ({
    date: t.date,
    desc: t.description,
    val: t.amount,
    cat: t.category
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analise o seguinte extrato bancário e forneça insights financeiros. 
    Dados: ${JSON.stringify(transactionData)}
    
    Por favor, retorne no formato JSON com:
    1. "summary": Um breve resumo do mês financeiro.
    2. "topCategories": Um array de objetos {category, total} com as 3 categorias onde mais se gastou.
    3. "savingTips": Um array com 3 dicas personalizadas para economizar baseadas nos dados.
    4. "anomalies": Um array com possíveis gastos estranhos ou assinaturas esquecidas.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          topCategories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                total: { type: Type.NUMBER }
              },
              required: ["category", "total"]
            }
          },
          savingTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          anomalies: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["summary", "topCategories", "savingTips", "anomalies"]
      }
    }
  });

  // Extract text content directly from the response object
  try {
    const text = response.text || '{}';
    return JSON.parse(text) as AIInsights;
  } catch (error) {
    console.error("Erro ao processar insights da AI:", error);
    throw new Error("Falha na análise da AI");
  }
};
