import { canonicalStreet } from './streetMatching.ts';

export interface StreetSuggestion { street: string; transactionCount?: number }

/** Currency typed in the Brazilian input: dots group thousands, comma separates cents. */
export function parseCalculatorBRL(value: string): number {
  const clean = value.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d*)(?:,\d{0,2})?$/.test(clean)) return NaN;
  return Number(clean.replace(/\./g, '').replace(',', '.'));
}

export function filterStreetSuggestions(rows: StreetSuggestion[], query: string, limit = 15): StreetSuggestion[] {
  const key = canonicalStreet(query);
  if (!key) {
    return rows
      .filter((row) => row?.street)
      .slice()
      .sort((a, b) => a.street.localeCompare(b.street, 'pt-BR'))
      .slice(0, Math.max(limit, 40));
  }
  const starts: StreetSuggestion[] = [];
  const wordStarts: StreetSuggestion[] = [];
  const contains: StreetSuggestion[] = [];
  const wordNeedle = ` ${key}`;
  for (const row of rows) {
    if (!row?.street) continue;
    const norm = canonicalStreet(row.street);
    if (norm.startsWith(key)) starts.push(row);
    else if (norm.includes(wordNeedle)) wordStarts.push(row);
    else if (norm.includes(key)) contains.push(row);
  }
  const byTxOrAlpha = (a: StreetSuggestion, b: StreetSuggestion) =>
    (b.transactionCount || 0) - (a.transactionCount || 0) || a.street.localeCompare(b.street, 'pt-BR');
  starts.sort(byTxOrAlpha);
  wordStarts.sort(byTxOrAlpha);
  contains.sort(byTxOrAlpha);
  return [...starts, ...wordStarts, ...contains].slice(0, limit);
}

export async function fetchCalculatorJson(url: string, signal?: AbortSignal): Promise<any> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('Resposta inválida do servidor ITBI');
  return response.json();
}
