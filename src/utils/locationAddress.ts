import { parseCleanAddress } from './addressParser.ts';
import { canonicalStreet } from './streetMatching.ts';

export function addressUnits(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, label] of [['bloco', 'bloco|bl|blc'], ['apartamento', 'apartamento|apto|apt|ap'], ['casa', 'casa|cs']]) {
    const match = text.match(new RegExp(`\\b(?:${label})\\.?\\s*(?:n[º°o.]?\\s*)?[:.-]?\\s*(\\d+[a-z]?|[a-z])\\b`, 'i'));
    if (match) result[key] = match[1].toLowerCase().replace(/^0+(?=\d)/, '');
  }
  return result;
}

/** Recover explicit unit information only from a line naming this same street/number. */
export function locationAddress(p: { address?: string; description?: string }): string {
  const address = p.address || '';
  const base = parseCleanAddress(address);
  if (!base.number || !base.street) return address;
  const explicit = addressUnits(address);
  const candidates = (p.description || '').split(/[\r\n]+/).filter(line => {
    const parsed = parseCleanAddress(line);
    return parsed.number === base.number && canonicalStreet(parsed.street) === canonicalStreet(base.street);
  }).map(addressUnits).filter(unit => Object.keys(unit).length > 0);
  const merged = { ...explicit };
  for (const key of ['bloco', 'apartamento', 'casa']) {
    if (merged[key]) continue;
    const values = [...new Set(candidates.map(unit => unit[key]).filter(Boolean))];
    if (values.length > 1) return address;
    if (values.length === 1) merged[key] = values[0];
  }
  const additions = Object.entries(merged).filter(([key]) => !explicit[key]);
  return additions.length ? `${base.street}, ${base.number}, ${Object.entries(merged).map(([k, v]) => `${k} ${v}`).join(', ')}` : address;
}
