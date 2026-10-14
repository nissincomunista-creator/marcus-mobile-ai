import { canonicalStreet } from './streetMatching.ts';

export interface StreetSuggestion { street: string; transactionCount?: number }

/** Currency typed in the Brazilian input: dots group thousands, comma separates cents. */
export function parseCalculatorBRL(value: string): number {
  const clean = value.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d*)(?:,\d{0,2})?$/.test(clean)) return NaN;
  return Number(clean.replace(/\./g, '').replace(',', '.'));
}

export function filterStreetSuggestions(rows: StreetSuggestion[], query: string): StreetSuggestion[] {
  const key = canonicalStreet(query);
  return rows.filter(row => row?.street && (!key || canonicalStreet(row.street).includes(key)))
    .slice().sort((a, b) => a.street.localeCompare(b.street, 'pt-BR'));
}

export async function fetchCalculatorJson(url: string, signal?: AbortSignal): Promise<any> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('Resposta inválida do servidor ITBI');
  return response.json();
}
