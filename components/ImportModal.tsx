
import React, { useState } from 'react';
import { Transaction, SourceKey } from '../types';

interface ImportModalProps {
  onClose: () => void;
  onImport: (data: Transaction[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'link'>('csv');
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper to clean and parse numerical values
  const parseValue = (valStr: string): number => {
    if (!valStr) return NaN;
    // Remove currency symbols, spaces, and handle both . and , formats
    let clean = valStr.replace(/[R$\s"]/g, '').trim();
    
    // Handle Brazilian format: 1.234,56 or 1234,56
    if (clean.includes(',') && clean.includes('.')) {
      // 1.234,56 -> 1234.56
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      // 1234,56 -> 1234.56
      clean = clean.replace(',', '.');
    }
    return parseFloat(clean);
  };

  const processCSV = (text: string) => {
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(line => line.length > 0);
    if (rawLines.length === 0) return [];

    // Detect separator from the first non-empty line
    const separator = rawLines[0].includes(';') ? ';' : ',';

    // Default indices based on user specification: 
    // Coluna A (0) = Data, Coluna B (1) = Valor, Coluna C (2) = Descrição
    let indices = { date: 0, val: 1, desc: 2, cat: 3 };
    let headerRowIdx = -1;
    let foundHeaders = false;

    // Scan the first few lines to see if there's an explicit header row
    for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
      const parts = rawLines[i].split(separator).map(p => p.toLowerCase().trim().replace(/^"|"$/g, ''));
      
      const dIdx = parts.findIndex(p => p.includes('data'));
      const vIdx = parts.findIndex(p => p.includes('valor') || p.includes('montante') || p.includes('pago') || p.includes('recebido') || p.includes('quantia'));
      const deIdx = parts.findIndex(p => p.includes('desc') || p.includes('historico') || p.includes('detalhe') || p.includes('lançamento'));
      const cIdx = parts.findIndex(p => p.includes('cat'));

      // If we find at least Data and (Valor or Descrição), consider it a header row
      if (dIdx !== -1 && (vIdx !== -1 || deIdx !== -1)) {
        headerRowIdx = i;
        indices.date = dIdx;
        indices.val = vIdx !== -1 ? vIdx : indices.val;
        indices.desc = deIdx !== -1 ? deIdx : indices.desc;
        indices.cat = cIdx !== -1 ? cIdx : indices.cat;
        foundHeaders = true;
        break;
      }
    }

    // If no header found, we start from row 0 using the user's A=Date, B=Val, C=Desc mapping
    // If header found, we start from the row after the header
    const startIdx = foundHeaders ? headerRowIdx + 1 : 0;
    const result: Transaction[] = [];

    for (let i = startIdx; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      const parts = line.split(separator).map(p => p.replace(/^"|"$/g, '').trim());
      
      // Basic validation: must have at least the columns we need
      const maxNeededIdx = Math.max(indices.date, indices.val, indices.desc);
      if (parts.length <= maxNeededIdx) continue;

      const dateStr = parts[indices.date];
      const amount = parseValue(parts[indices.val]);
      const desc = parts[indices.desc];
      const cat = (indices.cat !== -1 && parts[indices.cat]) ? parts[indices.cat] : 'Geral';

      // Validation check
      if (isNaN(amount) || !dateStr || !desc) continue;
      
      // Skip if the "date" looks like a header (e.g. "Data")
      if (dateStr.toLowerCase().includes('data')) continue;

      // Add a default source key to satisfy the Transaction interface
      result.push({
        id: Math.random().toString(36).substr(2, 9),
        date: dateStr,
        description: desc,
        amount: amount,
        category: cat,
        type: amount >= 0 ? 'income' : 'expense',
        source: 'nubank_pf_pix' as SourceKey
      });
    }
    
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = processCSV(text);
      if (data.length > 0) {
        onImport(data);
      } else {
        alert("Não conseguimos identificar os dados. Verifique se o CSV está no formato: Coluna A (Data), Coluna B (Valor), Coluna C (Descrição).");
      }
      setLoading(false);
    };
    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleLinkImport = async () => {
    if (!sheetUrl) return;
    setLoading(true);
    
    try {
      let fetchUrl = sheetUrl;
      if (sheetUrl.includes('docs.google.com/spreadsheets')) {
        const idMatch = sheetUrl.match(/\/d\/(.+?)(\/|$)/);
        if (idMatch) {
          fetchUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
        }
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("O link parece não ser público ou acessível.");
      
      const text = await response.text();
      const data = processCSV(text);
      
      if (data.length === 0) {
        throw new Error("Não encontramos transações. Certifique-se que a Coluna A é a Data, B é o Valor e C é a Descrição.");
      }
      
      onImport(data);
    } catch (err: any) {
      alert(`Erro ao importar: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Importar Dados</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setActiveTab('csv')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'csv' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <i className="fas fa-file-csv mr-2"></i> CSV Upload
            </button>
            <button 
              onClick={() => setActiveTab('link')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'link' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <i className="fas fa-link mr-2"></i> Link Planilha
            </button>
          </div>

          {activeTab === 'csv' ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-300 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={loading}
                />
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4 text-xl">
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
                </div>
                <p className="font-semibold text-slate-700">{loading ? 'Processando...' : 'Arraste ou clique para enviar'}</p>
                <p className="text-sm text-slate-400 mt-1">
                  Formatos esperados: A (Data), B (Valor), C (Descrição)
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 flex gap-2">
                  <i className="fas fa-info-circle mt-0.5"></i>
                  <span>Processamos automaticamente colunas A=Data, B=Valor e C=Descrição.</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Link da Planilha (Google Sheets)</label>
                <input 
                  type="url" 
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-800 leading-relaxed">
                  <strong>Configuração:</strong> A planilha deve ter a <strong>Coluna A para Data</strong>, <strong>Coluna B para Valor</strong> e <strong>Coluna C para Descrição</strong>.
                </p>
              </div>
              <button 
                onClick={handleLinkImport}
                disabled={loading || !sheetUrl}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync"></i>}
                {loading ? 'Sincronizando...' : 'Sincronizar Dados'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
