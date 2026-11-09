// Client and server shared Google Sheets parser utility
export function parseCsvToRows(csvText: string): string[][] {
  if (!csvText) return [];
  const lines = csvText.split(/\r?\n/);
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    let delimiter = ',';
    if (!line.includes(',') && line.includes(';')) {
      delimiter = ';';
    } else if (!line.includes(',') && !line.includes(';') && line.includes('\t')) {
      delimiter = '\t';
    }

    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' || char === "'") {
        if (inQuotes && nextChar === char) {
          current += char;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());

    if (row.some((cell) => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

export function parseCleanNumber(val: string): number {
  if (!val) return 0;
  let s = val.replace(/["'$R%\s]/gi, '').trim();
  if (!s) return 0;

  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

const normalizeCardText = (value: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const CARD_NAME_STOP_WORDS = new Set(['cartao', 'credito', 'credit', 'de', 'do', 'da', 'banco']);

function matchCardForTransaction(accountName: string, paymentMethod: string, cards: any[]) {
  const sources = [accountName, paymentMethod]
    .map(normalizeCardText)
    .filter(Boolean);
  const candidates = cards.map((card) => {
    const normalizedName = normalizeCardText(card.name || '');
    const tokens = normalizedName.split(/\s+/).filter((token) => token.length > 1 && !CARD_NAME_STOP_WORDS.has(token));
    if (!tokens.length) return { card, score: 0 };
    const exactMatch = sources.some((source) => source === normalizedName || ` ${source} `.includes(` ${normalizedName} `));
    if (exactMatch) return { card, score: 2 };
    const matchingTokens = tokens.filter((token) => sources.some((source) => (` ${source} `).includes(` ${token} `)));
    return { card, score: matchingTokens.length / tokens.length };
  }).filter((candidate) => candidate.score > 0);
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length || candidates[0].score < 0.5) return undefined;
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) return undefined;
  return candidates[0].card;
}

function findCardColumn(headers: string[], aliases: string[]): number {
  const normalizedAliases = aliases.map(normalizeCardText);
  return headers.findIndex((header) => {
    const normalizedHeader = normalizeCardText(header);
    return normalizedAliases.some((alias) => normalizedHeader === alias || normalizedHeader.includes(alias));
  });
}

export const SHEETS_CONFIG = [
  {
    id: 'sheet-extrato',
    type: 'extrato',
    title: 'Extrato Bancário',
  },
  {
    id: 'sheet-cartoes',
    type: 'cartoes',
    title: 'Cartões & Fechamentos',
  },
  {
    id: 'sheet-assinaturas',
    type: 'assinaturas',
    title: 'Assinaturas Fixas',
  },
  {
    id: 'sheet-totais',
    type: 'total_mes',
    title: 'Total Mensal do Saldo das Contas',
  },
  {
    id: 'sheet-devedores',
    type: 'devedores',
    title: 'Registro de Devedores',
  },
  {
    id: 'sheet-investimentos',
    type: 'investimentos',
    title: 'Investimentos',
  },
];

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function getCurrentMonthLabel(): string {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return `${MONTH_NAMES_PT[m]} ${y}`;
}

export function getMonthLabelFromIsoDate(isoDateStr: string): string {
  if (!isoDateStr) return getCurrentMonthLabel();
  const parts = isoDateStr.split('-');
  if (parts.length >= 2) {
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    if (m >= 0 && m < 12) {
      return `${MONTH_NAMES_PT[m]} ${y}`;
    }
  }
  return getCurrentMonthLabel();
}

export function convertBrOrIsoToIsoDate(rawStr?: string): string | null {
  if (!rawStr) return null;
  let s = rawStr.trim();
  if (!s) return null;

  if (s.includes(' ')) s = s.split(' ')[0];
  if (s.includes('T')) s = s.split('T')[0];

  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const day = parts[0].trim().padStart(2, '0');
      const month = parts[1].trim().padStart(2, '0');
      let year = parts[2].trim();
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
  }
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      let p0 = parts[0].trim();
      let p1 = parts[1].trim().padStart(2, '0');
      let p2 = parts[2].trim().padStart(2, '0');
      if (p0.length === 4) {
        return `${p0}-${p1}-${p2}`;
      } else if (p2.length === 4) {
        return `${p2}-${p1}-${p0.padStart(2, '0')}`;
      } else if (p0.length === 2 && p2.length === 2) {
        return `20${p2}-${p1}-${p0.padStart(2, '0')}`;
      }
    }
  }
  return null;
}

export function getTransactionAllocatedMonthLabel(tx: {
  effectiveMonthLabel?: string;
  effectiveExpenseDate?: string;
  invoiceDueDateStr?: string;
  date?: string;
}): string {
  if (tx.effectiveMonthLabel) {
    return tx.effectiveMonthLabel;
  }
  if (tx.effectiveExpenseDate) {
    return getMonthLabelFromIsoDate(tx.effectiveExpenseDate);
  }
  if (tx.invoiceDueDateStr) {
    const isoFromDue = convertBrOrIsoToIsoDate(tx.invoiceDueDateStr);
    if (isoFromDue) {
      return getMonthLabelFromIsoDate(isoFromDue);
    }
  }
  if (tx.date) {
    return getMonthLabelFromIsoDate(tx.date);
  }
  return getCurrentMonthLabel();
}

export function calculateEffectiveInvoiceDate(
  purchaseDateStr: string, // YYYY-MM-DD
  accountName: string,
  paymentMethod: string,
  cards: any[] = [],
  explicitDueDateStr?: string // Data de Vencimento
) {
  const accountLower = (accountName || '').toLowerCase();
  const methodLower = (paymentMethod || '').toLowerCase();

  // If an explicit due date (Data de Vencimento) is provided, use it directly! (Golden Rule #1)
  if (explicitDueDateStr && explicitDueDateStr.trim()) {
    let cleanIso = '';
    let cleanBR = '';
    const raw = explicitDueDateStr.trim();
    if (raw.includes('/')) {
      const p = raw.split('/');
      if (p.length === 3) {
        const d = p[0].padStart(2, '0');
        const m = p[1].padStart(2, '0');
        const y = p[2].length === 2 ? `20${p[2]}` : p[2];
        cleanIso = `${y}-${m}-${d}`;
        cleanBR = `${d}/${m}/${y}`;
      }
    } else if (raw.includes('-')) {
      cleanIso = raw;
      const p = raw.split('-');
      if (p.length === 3) {
        cleanBR = `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
      }
    }

    if (cleanIso) {
      const matchedCard = matchCardForTransaction(accountName, paymentMethod, cards);

      return {
        isCreditCard: true,
        cardName: matchedCard ? matchedCard.name : undefined,
        purchaseDate: purchaseDateStr,
        effectiveExpenseDate: cleanIso,
        effectiveMonthLabel: getMonthLabelFromIsoDate(cleanIso),
        invoiceDueDateStr: cleanBR || explicitDueDateStr,
      };
    }
  }

  const isCreditCard =
    methodLower.includes('cartão') ||
    methodLower.includes('cartao') ||
    methodLower.includes('crédito') ||
    methodLower.includes('credito') ||
    accountLower.includes('cartão') ||
    accountLower.includes('cartao');

  if (!isCreditCard) {
    return {
      isCreditCard: false,
      cardName: undefined,
      purchaseDate: purchaseDateStr,
      effectiveExpenseDate: purchaseDateStr,
      effectiveMonthLabel: getMonthLabelFromIsoDate(purchaseDateStr),
      invoiceDueDateStr: undefined,
    };
  }

  // Find matching card in cards list or default to closing: 2, due: 8 (Mercado Livre pattern)
  const matchedCard = matchCardForTransaction(accountName, paymentMethod, cards);

  const closingDay = matchedCard?.closingDay || 2;
  const dueDay = matchedCard?.dueDay || 8;

  const parts = purchaseDateStr.split('-');
  let year = parseInt(parts[0], 10) || 2026;
  let monthIndex = (parseInt(parts[1], 10) || 8) - 1; // 0-indexed JS month
  const day = parseInt(parts[2], 10) || 1;

  // If purchase day is strictly after closing day of current month, it moves to next month's invoice!
  if (day > closingDay) {
    monthIndex += 1;
  }

  // If due day is earlier than closing day in calendar month (e.g., closes on 25th, due on 5th of next month)
  if (dueDay < closingDay) {
    monthIndex += 1;
  }

  const dueDateObj = new Date(year, monthIndex, dueDay);
  const dueY = dueDateObj.getFullYear();
  const dueM = String(dueDateObj.getMonth() + 1).padStart(2, '0');
  const dueD = String(dueDateObj.getDate()).padStart(2, '0');

  const effectiveExpenseDate = `${dueY}-${dueM}-${dueD}`;
  const effectiveMonthLabel = getMonthLabelFromIsoDate(effectiveExpenseDate);
  const invoiceDueDateStr = `${dueD}/${dueM}/${dueY}`;

  return {
    isCreditCard: true,
    cardName: matchedCard?.name,
    closingDay,
    dueDay,
    purchaseDate: purchaseDateStr,
    effectiveExpenseDate,
    effectiveMonthLabel,
    invoiceDueDateStr,
  };
}

export type SheetRowsById = Partial<Record<string, string[][]>>;

export interface BuildFinanceDataOptions {
  /** Commercial USD/BRL rate. Falls back to K1 of the investments rows, then 5.14. */
  usdRate?: number;
  /** Label used in the "sheets" status list (e.g. 'Sincronizado via Supabase'). */
  sourceMessage?: string;
}

/**
 * Turns sheet-shaped rows (header row + data rows, same column layout as the
 * original Google Sheets tabs) into the data structure the app consumes.
 */
export function buildFinanceData(rowsById: SheetRowsById, options: BuildFinanceDataOptions = {}) {
  const fetchResults: any[] = [];
  let parsedInvestments: any[] = [];
  let parsedExtratoTransactions: any[] = [];
  let parsedCards: any[] = [];
  let parsedSubscriptions: any[] = [];
  let parsedTotaisMatrix: any = null;
  let parsedDebtors: any[] = [];

  let liveTotalIncome = 0;
  let liveTotalExpenses = 0;

  let usdRateCommercial = options.usdRate && options.usdRate > 3 && options.usdRate < 10 ? options.usdRate : 5.14;
  const repatriationFeePercent = 1.8;
  let netUsdRate = usdRateCommercial * (1 - repatriationFeePercent / 100);

  let debtorsSummary = { pagouTotal: 0, pegouTotal: 0, restanteTotal: 0 };

  for (const sheet of SHEETS_CONFIG) {
    try {
      const rows = rowsById[sheet.id];
      if (!rows) continue;
      {
        if (rows.length < 2) {
          fetchResults.push({ ...sheet, status: 'conectado', message: options.sourceMessage || 'Sincronizado', linesCount: 0, httpCode: 200 });
          continue;
        }

        const dataRows = rows.slice(1);

        if (sheet.id === 'sheet-extrato') {
          let lastValidIsoDate = '2026-08-01';

          dataRows.forEach((cols, index) => {
            if (!cols || cols.length === 0) return;

            const rawDate = (cols[0] || '').trim();
            if (rawDate.toLowerCase().startsWith('data') || rawDate.toLowerCase().startsWith('date')) return;

            let isoDate = convertBrOrIsoToIsoDate(rawDate);
            if (!isoDate) {
              isoDate = lastValidIsoDate;
            } else {
              lastValidIsoDate = isoDate;
            }

            const rawValStr = cols[1] || '0';
            const rawAmount = parseCleanNumber(rawValStr);
            const description = (cols[2] || '').trim() || 'Sem descrição';

            // Skip line if completely empty
            if (!description && rawAmount === 0 && !rawDate) return;

            const account = (cols[3] || '').trim() || 'Geral';
            const paymentMethod = (cols[4] || '').trim() || 'PIX';
            const explicitDueDateStr = cols[5] ? cols[5].trim() : undefined;

            const isIncome = rawAmount > 0;
            const amount = Math.abs(rawAmount);

            if (isIncome) {
              liveTotalIncome += amount;
            } else if (amount > 0) {
              liveTotalExpenses += amount;
            }

            const descLower = description.toLowerCase();
            const explicitCategory = (cols[6] || '').trim();
            let category = explicitCategory || 'Geral';
            if (explicitCategory) {
              // keep category chosen by the user
            } else if (descLower.includes('salario') || descLower.includes('salário') || descLower.includes('comissão') || descLower.includes('payt')) {
              category = 'Salário & Renda';
            } else if (descLower.includes('gasolina') || descLower.includes('uber') || descLower.includes('pedagio') || descLower.includes('pedágio')) {
              category = 'Transporte';
            } else if (descLower.includes('mercado') || descLower.includes('fort') || descLower.includes('padaria') || descLower.includes('burguer') || descLower.includes('pizz')) {
              category = 'Alimentação';
            } else if (descLower.includes('tim') || descLower.includes('inter') || descLower.includes('luz')) {
              category = 'Moradia & Contas';
            } else if (descLower.includes('psicó') || descLower.includes('remédio') || descLower.includes('siso')) {
              category = 'Saúde & Bem-Estar';
            } else if (descLower.includes('meli+') || descLower.includes('disney') || descLower.includes('spotify') || descLower.includes('tv')) {
              category = 'Assinaturas & Lazer';
            }

            parsedExtratoTransactions.push({
              id: cols[7] || `tx-sheet-${index}`,
              date: isoDate,
              description,
              category,
              amount,
              type: isIncome ? 'income' : 'expense',
              account,
              paymentMethod,
              invoiceDueDateStr: explicitDueDateStr,
              sourceSheet: 'Banco de dados',
              status: 'concluido',
            });
          });
        }

        if (sheet.id === 'sheet-cartoes') {
          const headers = rows[0] || [];
          const nameColumn = findCardColumn(headers, ['cartao', 'nome do cartao', 'nome', 'descricao']);
          const closingColumn = findCardColumn(headers, ['fechamento', 'fecha', 'dia de fechamento', 'dia fechamento']);
          const dueColumn = findCardColumn(headers, ['vencimento', 'vence', 'dia de vencimento', 'dia vencimento']);
          const limitColumn = findCardColumn(headers, ['limite', 'limite total', 'limite do cartao', 'valor do limite']);
          const resolveColumn = (column: number, fallback: number) => column >= 0 ? column : fallback;
          const cardNameColumn = resolveColumn(nameColumn, 0);
          const cardClosingColumn = resolveColumn(closingColumn, 1);
          const cardDueColumn = resolveColumn(dueColumn, 2);
          const cardLimitColumn = resolveColumn(limitColumn, 3);

          dataRows.forEach((cols, index) => {
            const name = (cols[cardNameColumn] || '').trim();
            if (!name) return;
            const closingDay = parseInt((cols[cardClosingColumn] || '').replace(/\D/g, ''), 10) || 1;
            const dueDay = parseInt((cols[cardDueColumn] || '').replace(/\D/g, ''), 10) || 10;
            const limit = parseCleanNumber(cols[cardLimitColumn] || '');

            parsedCards.push({
              id: cols[4] || `card-sheet-${index}`,
              name,
              bank: /nubank/i.test(name) ? 'Nubank' : /picpay/i.test(name) ? 'PicPay' : /bradesco/i.test(name) ? 'Bradesco' : /amazon/i.test(name) ? 'Amazon' : 'Cartão',
              closingDay,
              dueDay,
              currentInvoice: 0,
              limit,
              status: 'aberta',
            });
          });
        }

        if (sheet.id === 'sheet-assinaturas') {
          dataRows.forEach((cols, index) => {
            if (!cols[1] && !cols[2]) return;
            const statusStr = (cols[0] || 'Ativa').trim();
            const isActive = statusStr.toLowerCase().includes('ativa');
            const monthlyPrice = parseCleanNumber(cols[1]);
            const serviceName = cols[2] || 'Assinatura';
            const paymentCard = cols[3] || 'Cartão';
            const renewalDayStr = cols[4] || '1';
            const renewalDay = parseInt(renewalDayStr.replace(/\D/g, '') || '1', 10);

            parsedSubscriptions.push({
              id: cols[5] || `sub-sheet-${index}`,
              status: isActive ? 'ativa' : 'pausada',
              serviceName,
              category: 'Recorrentes & Fixos',
              monthlyPrice,
              personalMonthlyPrice: cols[6] ? parseCleanNumber(cols[6]) : undefined,
              paymentCard,
              renewalDay,
              active: isActive,
              cancelRecommendation: !isActive,
            });
          });
        }

        if (sheet.id === 'sheet-totais') {
          const headers = rows[0] || [];
          const isRowPerMonth = (headers[0] || '').toLowerCase().includes('data') || (headers[1] || '').toLowerCase().includes('mês') || (headers[1] || '').toLowerCase().includes('mes');

          if (isRowPerMonth) {
            // New Resumo Total sheet format (Row per Month)
            const accountCols = headers.slice(2).map((h, i) => {
              const name = h.trim();
              let ratePct = 0;
              const match = name.match(/\((\d+)%\)/);
              if (match) {
                ratePct = parseFloat(match[1]);
              }
              return { index: i + 2, name, ratePct };
            });

            const MONTH_NAMES_PT = [
              'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
              'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ];

            const monthNameToIdx: Record<string, number> = {
              'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
              'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7, 'setembro': 8,
              'outubro': 9, 'novembro': 10, 'dezembro': 11
            };

            const actualRows: any[] = [];
            const totalsRowMap: Record<string, number> = {};
            let lastRecordedMonthIdx = 7; // default August
            let lastRecordedYear = 2026;
            let lastBalances: Record<string, number> = {};

            dataRows.forEach((cols) => {
              if (cols.length < 2 || !cols[0]) return;
              const rawDate = cols[0].trim();
              const rawMonthName = (cols[1] || '').trim().toLowerCase();
              if (!rawMonthName || rawMonthName === 'mês' || rawMonthName === 'mes') return;

              let yearStr = '2026';
              if (rawDate.includes('/')) {
                const parts = rawDate.split('/');
                if (parts.length === 3) yearStr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              }
              const yrNum = parseInt(yearStr, 10) || 2026;

              const mIdx = monthNameToIdx[rawMonthName] !== undefined ? monthNameToIdx[rawMonthName] : 7;
              const capMonth = MONTH_NAMES_PT[mIdx] || 'Agosto';
              const monthLabel = `${capMonth} ${yrNum}`;

              const balances: Record<string, number> = {};
              let rowTotal = 0;

              accountCols.forEach((col) => {
                const val = parseCleanNumber(cols[col.index] || '0');
                balances[col.name] = val;
                rowTotal += val;
              });

              if (rowTotal > 0) {
                totalsRowMap[monthLabel] = rowTotal;
                actualRows.push({
                  date: rawDate,
                  monthLabel,
                  rawMonthName,
                  balances,
                  total: rowTotal,
                  isProjected: false,
                });
                lastRecordedMonthIdx = mIdx;
                lastRecordedYear = yrNum;
                lastBalances = balances;
              }
            });

            // Project 8 future months from the last recorded month
            const projectedRows: any[] = [];
            let currentBalances = { ...lastBalances };

            for (let i = 1; i <= 8; i++) {
              let nextMonthIdx = lastRecordedMonthIdx + i;
              let yr = lastRecordedYear + Math.floor(nextMonthIdx / 12);
              let mIdx = nextMonthIdx % 12;
              let monthLabel = `${MONTH_NAMES_PT[mIdx]} ${yr}`;

              const nextBalances: Record<string, number> = {};
              let nextTotal = 0;

              accountCols.forEach((col) => {
                const prevVal = currentBalances[col.name] || 0;
                let multiplier = 1;
                if (col.ratePct > 0) {
                  // Monthly CDI benchmark ~0.85% (100% CDI)
                  multiplier = 1 + (0.0085 * (col.ratePct / 100));
                }
                const newB = prevVal * multiplier;
                nextBalances[col.name] = Math.round(newB * 100) / 100;
                nextTotal += nextBalances[col.name];
              });

              currentBalances = nextBalances;
              totalsRowMap[monthLabel] = Math.round(nextTotal * 100) / 100;

              projectedRows.push({
                date: `01/${(mIdx + 1).toString().padStart(2, '0')}/${yr}`,
                monthLabel,
                rawMonthName: MONTH_NAMES_PT[mIdx].toLowerCase(),
                balances: nextBalances,
                total: Math.round(nextTotal * 100) / 100,
                isProjected: true,
              });
            }

            const allAccountRows = [...actualRows, ...projectedRows];

            parsedTotaisMatrix = {
              isNewFormat: true,
              accountCols,
              actualRows,
              projectedRows,
              allRows: allAccountRows,
              months: allAccountRows.map((r) => r.monthLabel),
              totalsRowMap,
            };
          } else {
            // Legacy column format fallback
            const rawMonths = headers.slice(1).filter((h) => h && !h.toLowerCase().includes('meta'));
            const accountRows: any[] = [];
            const totalsRowMap: Record<string, number> = {};

            dataRows.forEach((cols) => {
              const accountName = (cols[0] || '').trim();
              if (!accountName || accountName.toLowerCase() === 'data') return;

              if (accountName.toLowerCase().startsWith('total')) {
                rawMonths.forEach((mName, idx) => {
                  const valStr = cols[idx + 1] || '0';
                  const parsedVal = parseCleanNumber(valStr);
                  if (parsedVal > 0) {
                    totalsRowMap[mName] = parsedVal;
                  }
                });
                return;
              }

              const balances: Record<string, number> = {};
              rawMonths.forEach((mName, idx) => {
                const valStr = cols[idx + 1] || '0';
                balances[mName] = parseCleanNumber(valStr);
              });

              accountRows.push({
                accountName,
                balances,
              });
            });

            parsedTotaisMatrix = {
              months: rawMonths,
              accounts: accountRows,
              totalsRowMap,
            };
          }
        }

        if (sheet.id === 'sheet-devedores') {
          let lastBorrowerName = '';
          let sumPegou = 0;
          let sumPagou = 0;

          dataRows.forEach((cols, index) => {
            let borrowerName = (cols[0] || '').trim();
            const description = (cols[1] || '').trim();
            const rawAmount = cols[2] || '';
            const transactionAmount = parseCleanNumber(rawAmount);
            const statusTag = (cols[3] || '').trim().toLowerCase();

            if (
              borrowerName.toLowerCase() === 'devedor' ||
              description.toLowerCase() === 'descrição' ||
              description.toLowerCase() === 'descricao'
            )
              return;

            if (!borrowerName && !description && transactionAmount === 0 && !statusTag) {
              return;
            }

            if (borrowerName) {
              lastBorrowerName = borrowerName;
            } else if (lastBorrowerName) {
              borrowerName = lastBorrowerName;
            } else {
              borrowerName = 'Outros';
            }

            const isPaid =
              statusTag.includes('pagou') ||
              statusTag === 'pago' ||
              statusTag.includes('devolveu') ||
              statusTag.includes('quitad');

            if (isPaid) {
              sumPagou += transactionAmount;
            } else {
              sumPegou += transactionAmount;
            }

            parsedDebtors.push({
              id: cols[7] || `debtor-sheet-${index}`,
              borrowerName,
              description,
              transactionAmount,
              movement: isPaid ? 'pagou' : 'pegou',
              totalPaid: isPaid ? transactionAmount : 0,
              totalBorrowed: isPaid ? 0 : transactionAmount,
              remainingAmount: isPaid ? 0 : transactionAmount,
              status: isPaid ? 'quitado' : 'pendente',
            });
          });

          debtorsSummary = {
            pagouTotal: sumPagou,
            pegouTotal: sumPegou,
            restanteTotal: Math.max(0, sumPegou - sumPagou),
          };
        }

        if (sheet.id === 'sheet-investimentos') {
          if (rows.length > 0 && rows[0] && rows[0][10]) {
            const k1Rate = parseCleanNumber(rows[0][10]);
            if (k1Rate > 0 && !options.usdRate) {
              usdRateCommercial = k1Rate;
              netUsdRate = usdRateCommercial * (1 - repatriationFeePercent / 100);
            }
          }

          dataRows.forEach((cols, index) => {
            if (!cols[0] || cols[0].toUpperCase() === 'TIKET' || cols[0].toUpperCase() === 'TICKER' || cols[0].toUpperCase() === 'NAME') return;
            const ticker = cols[0].trim();
            const name = (cols[1] || ticker).trim();
            const rawClass = (cols[2] || '').trim();
            const sharesCount = parseCleanNumber(cols[3]);
            const avgPriceApplied = parseCleanNumber(cols[4]);
            const currentPrice = parseCleanNumber(cols[5]);
            const usdVariation = parseCleanNumber(cols[6]);
            const percentChange = parseCleanNumber(cols[7]);
            const usdApplied = parseCleanNumber(cols[8]);
            const usdCurrent = parseCleanNumber(cols[9]);

            if (sharesCount <= 0 && usdApplied <= 0 && usdCurrent <= 0) return;

            let assetClass = 'Ação Internacional';
            if (rawClass.toUpperCase() === 'REIT') assetClass = 'FII / REIT';
            else if (rawClass.toUpperCase() === 'ETF') assetClass = 'ETF Internacional';
            else if (rawClass.toUpperCase() === 'STOCK') assetClass = 'Ação Internacional';

            const category = rawClass.toUpperCase() === 'REIT' || rawClass.toUpperCase() === 'ETF' || rawClass.toUpperCase() === 'STOCK' ? 'Internacional' : 'Ações BR';

            parsedInvestments.push({
              id: cols[11] || `inv-sheet-${index}`,
              ticker,
              companyName: name,
              name,
              assetClass,
              sharesCount,
              averagePrice: avgPriceApplied,
              currentPrice,
              yieldPercent: percentChange,
              usdChange: usdVariation,
              percentChange,
              usdApplied,
              usdCurrent,
              category,
              amountInvested: Math.round(usdApplied * netUsdRate),
              currentValue: Math.round(usdCurrent * netUsdRate),
              yieldTotal: Math.round((usdCurrent - usdApplied) * netUsdRate),
              monthlyDividend: 0,
            });
          });
        }

        fetchResults.push({
          ...sheet,
          status: 'conectado',
          message: options.sourceMessage || 'Sincronizado',
          linesCount: dataRows.length,
          httpCode: 200,
        });
      }
    } catch (sheetErr: any) {
      fetchResults.push({
        ...sheet,
        status: 'erro',
        message: sheetErr.message || 'Falha ao processar os dados',
        httpCode: 500,
      });
    }
  }

  // Post-processing: Attach credit card invoice dates to transactions
  // and compute credit card current invoices for active month
  let effectiveTotalExpensesCurrentMonth = 0;

  parsedExtratoTransactions = parsedExtratoTransactions.map((tx) => {
    const timing = calculateEffectiveInvoiceDate(
      tx.date,
      tx.account || 'Geral',
      tx.paymentMethod || 'PIX',
      parsedCards,
      tx.invoiceDueDateStr
    );

    const updatedTx = {
      ...tx,
      purchaseDate: tx.date,
      effectiveExpenseDate: timing.effectiveExpenseDate,
      effectiveMonthLabel: timing.effectiveMonthLabel,
      isCreditCard: timing.isCreditCard,
      cardName: timing.cardName,
      invoiceDueDateStr: timing.invoiceDueDateStr,
    };

    if (tx.type === 'expense') {
      // If effective expense month is the current active month, add to current month expense!
      if (timing.effectiveMonthLabel === getCurrentMonthLabel()) {
        effectiveTotalExpensesCurrentMonth += tx.amount;
      }
    }

    return updatedTx;
  });

  // Calculate current invoice sums for each credit card for current active month
  const currentMonthLabel = getCurrentMonthLabel();
  parsedCards = parsedCards.map((card) => {
    const cardInvoicesSum = parsedExtratoTransactions
      .filter((tx) => tx.type === 'expense' && tx.isCreditCard && tx.cardName === card.name && tx.effectiveMonthLabel === currentMonthLabel)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      ...card,
      currentInvoice: cardInvoicesSum,
    };
  });

  if (effectiveTotalExpensesCurrentMonth > 0) {
    liveTotalExpenses = effectiveTotalExpensesCurrentMonth;
  }

  return {
    success: true,
    sheets: fetchResults,
    transactions: parsedExtratoTransactions,
    cards: parsedCards,
    subscriptions: parsedSubscriptions,
    debtors: parsedDebtors,
    investments: parsedInvestments,
    totaisMatrix: parsedTotaisMatrix,
    currentMonthSummary: {
      totalIncome: liveTotalIncome,
      totalExpenses: liveTotalExpenses,
      leftover: liveTotalIncome - liveTotalExpenses,
    },
    usdRate: usdRateCommercial,
    repatriationFeePercent,
    netUsdRate,
    debtorsSummary,
  };
}
