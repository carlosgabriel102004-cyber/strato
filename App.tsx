
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, AppState, SourceKey } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import SourceManager from './components/SourceManager';
import ManualEntryModal from './components/ManualEntryModal';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.EMPTY);
  
  // Persistência do Período Selecionado
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    const saved = localStorage.getItem('ff_selected_months');
    if (saved) return JSON.parse(saved);
    const d = new Date();
    return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`];
  });
  
  // Cache de transações de planilhas para carregamento offline/instantâneo
  const [spreadsheetTransactions, setSpreadsheetTransactions] = useState<Record<string, Transaction[]>>(() => {
    const saved = localStorage.getItem('ff_sheet_cache');
    return saved ? JSON.parse(saved) : {};
  });

  const [manualTransactions, setManualTransactions] = useState<Record<string, Transaction[]>>(() => {
    const saved = localStorage.getItem('ff_manual_txs');
    return saved ? JSON.parse(saved) : {};
  });

  const [ignoredIds, setIgnoredIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('ff_ignored_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const [monthConfigs, setMonthConfigs] = useState<Record<string, Record<SourceKey, string>>>(() => {
    const saved = localStorage.getItem('ff_month_configs');
    return saved ? JSON.parse(saved) : {};
  });

  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Efeitos de Persistência
  useEffect(() => { localStorage.setItem('ff_selected_months', JSON.stringify(selectedMonths)); }, [selectedMonths]);
  useEffect(() => { localStorage.setItem('ff_month_configs', JSON.stringify(monthConfigs)); }, [monthConfigs]);
  useEffect(() => { localStorage.setItem('ff_manual_txs', JSON.stringify(manualTransactions)); }, [manualTransactions]);
  useEffect(() => { localStorage.setItem('ff_ignored_ids', JSON.stringify(ignoredIds)); }, [ignoredIds]);
  useEffect(() => { localStorage.setItem('ff_sheet_cache', JSON.stringify(spreadsheetTransactions)); }, [spreadsheetTransactions]);

  const allSelectedTransactions = useMemo(() => {
    let combined: Transaction[] = [];
    selectedMonths.forEach(mId => {
      const sheetTxs = spreadsheetTransactions[mId] || [];
      const manuals = manualTransactions[mId] || [];
      combined = [...combined, ...sheetTxs, ...manuals];
    });
    
    return combined.sort((a, b) => {
      const parseDate = (d: string) => {
        const parts = d.split('/');
        if (parts.length < 3) return 0;
        const [day, month, year] = parts;
        return new Date(`${year}-${month}-${day}`).getTime();
      };
      return parseDate(b.date) - parseDate(a.date);
    });
  }, [spreadsheetTransactions, manualTransactions, selectedMonths]);

  const activeTransactions = useMemo(() => {
    return allSelectedTransactions.filter(t => !ignoredIds.includes(t.id));
  }, [allSelectedTransactions, ignoredIds]);

  const handleToggleIgnore = (id: string) => {
    setIgnoredIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const parseValue = (valStr: string): number => {
    if (!valStr) return NaN;
    let clean = valStr.toString().replace(/[R$\s"]/g, '').trim();
    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    return parseFloat(clean);
  };

  const processCSV = (text: string, source: SourceKey): Transaction[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const result: Transaction[] = [];
    if (lines.length === 0) return [];
    
    const separator = lines[0].includes(';') ? ';' : ',';
    const hasHeader = isNaN(parseValue(lines[0].split(separator)[1]));
    const startIdx = hasHeader ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(separator).map(p => p.replace(/^"|"$/g, '').trim());
      if (parts.length < 3) continue;
      const dateStr = parts[0];
      let amount = parseValue(parts[1]);
      const desc = parts[2];
      const cat = parts[3] || 'Geral';
      if (isNaN(amount) || !dateStr || !desc) continue;
      if (source === 'nubank_cc') {
        if (desc.toLowerCase().includes('pagamento recebido')) continue;
        amount = amount * -1;
      }
      result.push({
        id: `${source}-${dateStr}-${desc}-${amount}-${i}`,
        date: dateStr,
        description: desc,
        amount: amount,
        category: cat,
        type: amount >= 0 ? 'income' : 'expense',
        source: source
      });
    }
    return result;
  };

  const fetchAllData = useCallback(async (configsOverride?: Record<string, Record<SourceKey, string>>) => {
    if (selectedMonths.length === 0) return;
    setSyncing(true);
    setAppState(AppState.LOADING);
    const targetConfigs = configsOverride || monthConfigs;
    const newSpreadsheetData: Record<string, Transaction[]> = { ...spreadsheetTransactions };

    for (const mId of selectedMonths) {
      const sources = targetConfigs[mId] || {};
      const activeSources = (Object.entries(sources) as [SourceKey, string][])
        .filter(([key, url]) => key !== 'manual' && url && url.startsWith('http'));
      
      let monthTxs: Transaction[] = [];
      for (const [key, url] of activeSources) {
        try {
          let fetchUrl = url;
          if (url.includes('docs.google.com/spreadsheets')) {
            const idMatch = url.match(/\/d\/(.+?)(\/|$)/);
            if (idMatch) fetchUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
          }
          const response = await fetch(fetchUrl);
          if (response.ok) {
            const text = await response.text();
            monthTxs = [...monthTxs, ...processCSV(text, key)];
          }
        } catch (err) { console.error(`Erro ao buscar ${key}:`, err); }
      }
      newSpreadsheetData[mId] = monthTxs;
    }

    setSpreadsheetTransactions(newSpreadsheetData);
    setAppState(AppState.READY);
    setSyncing(false);
  }, [selectedMonths, monthConfigs, spreadsheetTransactions]);

  const handleUpdateSources = (newSources: Record<SourceKey, string>) => {
    if (selectedMonths.length === 0) return;
    const activeM = selectedMonths[0];
    const newConfigs = { ...monthConfigs, [activeM]: newSources };
    setMonthConfigs(newConfigs);
    fetchAllData(newConfigs);
  };

  const handleAddOrEditManual = (tx: Transaction) => {
    const parts = tx.date.split('/');
    if (parts.length < 3) return;
    const mId = `${parts[2]}-${parts[1]}`;

    setManualTransactions(prev => {
      const monthTxs = prev[mId] || [];
      const exists = monthTxs.find(t => t.id === tx.id);
      if (exists) {
        return { ...prev, [mId]: monthTxs.map(t => t.id === tx.id ? tx : t) };
      }
      return { ...prev, [mId]: [...monthTxs, tx] };
    });
    setAppState(AppState.READY);
    setEditingTransaction(null);
  };

  useEffect(() => {
    if (selectedMonths.length > 0 && !syncing) {
      fetchAllData();
    }
  }, [selectedMonths]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header 
        selectedMonths={selectedMonths}
        onMonthsChange={setSelectedMonths}
        onOpenSources={() => setIsSourceManagerOpen(true)}
        onOpenManual={() => setIsManualModalOpen(true)}
        isSyncing={syncing}
        onRefresh={() => fetchAllData()}
      />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl pb-32">
        {selectedMonths.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 text-3xl">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Selecione um período</h2>
            <p className="text-slate-500 max-w-sm mx-auto">Use o seletor no topo para visualizar seus dados.</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {syncing && (
               <div className="flex items-center justify-center py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 text-sm font-bold shadow-sm">
                  <i className="fas fa-circle-notch fa-spin mr-3"></i>
                  Sincronizando planilhas remotas...
               </div>
            )}
            <Dashboard transactions={activeTransactions} />
            <TransactionList 
              transactions={allSelectedTransactions} 
              ignoredIds={ignoredIds}
              onToggleIgnore={handleToggleIgnore}
              onEdit={(tx) => {
                setEditingTransaction(tx);
                setIsManualModalOpen(true);
              }}
            />
          </div>
        )}
      </main>

      {isSourceManagerOpen && selectedMonths.length > 0 && (
        <SourceManager 
          onClose={() => setIsSourceManagerOpen(false)} 
          currentSources={monthConfigs[selectedMonths[0]] || { manual: '' } as any}
          onUpdate={handleUpdateSources}
          monthLabel={selectedMonths.join(', ')}
        />
      )}

      {isManualModalOpen && (
        <ManualEntryModal 
          onClose={() => {
            setIsManualModalOpen(false);
            setEditingTransaction(null);
          }}
          onAdd={handleAddOrEditManual}
          editTransaction={editingTransaction}
        />
      )}
    </div>
  );
};

export default App;
