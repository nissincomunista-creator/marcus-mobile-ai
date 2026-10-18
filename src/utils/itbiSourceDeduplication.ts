import type { ItbiTransaction } from '../types.ts';

function normalize(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function stableFacts(tx: ItbiTransaction): string {
  return [
    tx.date,
    Number(tx.transactionValue || 0).toFixed(2),
    Number(tx.normalizedTotalValue || 0).toFixed(2),
    normalize(tx.street),
    normalize(tx.number),
    normalize(tx.naturezaOperacao),
    Number(tx.percentualTransmitido || 0).toFixed(4)
  ].join('|');
}

function nonEmpty<T>(preferred: T | undefined, fallback: T | undefined): T | undefined {
  return preferred === undefined || preferred === null || preferred === '' ? fallback : preferred;
}

/**
 * Removes only byte-identical duplicate imports of a verified CSV row.
 * Conflicting records with the same source row are retained for investigation.
 */
export function deduplicateVerifiedItbiSourceRows<T extends ItbiTransaction>(rows: T[]): {
  transactions: T[];
  duplicatesRemoved: number;
  conflictingSourceRows: number;
} {
  const output: T[] = [];
  const bySourceAndFacts = new Map<string, number>();
  const sourceFacts = new Map<string, Set<string>>();
  let duplicatesRemoved = 0;
  let conflictingSourceRows = 0;

  for (const tx of rows) {
    const file = String(tx.sourceFile || '').trim();
    const row = Number(tx.sourceRow);
    if (tx.sourceVerified !== true || !file || !Number.isInteger(row) || row < 2) {
      output.push(tx);
      continue;
    }

    const sourceKey = `${normalize(file)}|${row}`;
    const facts = stableFacts(tx);
    const priorFacts = sourceFacts.get(sourceKey) || new Set<string>();
    if (priorFacts.has(facts)) {
      const priorIndex = bySourceAndFacts.get(`${sourceKey}|${facts}`);
      if (priorIndex !== undefined) {
        const prior = output[priorIndex];
        output[priorIndex] = {
          ...prior,
          ...Object.fromEntries(Object.keys(tx).filter(key => key !== 'id').map(key => [key, nonEmpty((tx as any)[key], (prior as any)[key])]))
        } as T;
        duplicatesRemoved++;
        continue;
      }
    } else if (priorFacts.size > 0) {
      conflictingSourceRows++;
    }

    priorFacts.add(facts);
    sourceFacts.set(sourceKey, priorFacts);
    bySourceAndFacts.set(`${sourceKey}|${facts}`, output.length);
    output.push(tx);
  }

  return { transactions: output, duplicatesRemoved, conflictingSourceRows };
}
