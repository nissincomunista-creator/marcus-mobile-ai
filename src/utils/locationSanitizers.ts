export function normalizeLocationLabel(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Rejects placeholders that can contaminate a location query. */
export function isUsableNeighborhoodLabel(value?: string | null): boolean {
  const normalized = normalizeLocationLabel(value);
  const compact = normalized.replace(/\s/g, '');
  if (compact.length < 2 || /^\d+$/.test(compact)) return false;

  return !new Set([
    'ns', 'sn', 'na', 'nao', 'naoinformado', 'sembairro', 'bairro',
    'desconhecido', 'ignorado', 'undefined', 'null', 'none', '-'
  ]).has(compact);
}

export function sanitizeNeighborhoodLabel(value?: string | null): string {
  return isUsableNeighborhoodLabel(value) ? String(value).trim() : '';
}
