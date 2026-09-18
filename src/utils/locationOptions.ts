export const normalizeLocationOption = (value?: string) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export function selectOfficialOption(value: string | undefined, options: string[]): string {
  const exact = options.filter(option => normalizeLocationOption(option) === normalizeLocationOption(value));
  return exact.length === 1 ? exact[0] : '';
}
export function locationOptions(rows: { state?: string; city?: string; neighborhood?: string }[], state = '', city = '') {
  const states = [...new Set(rows.map(r => r.state || '').filter(Boolean))].sort();
  const cities = [...new Set(rows.filter(r => normalizeLocationOption(r.state) === normalizeLocationOption(state)).map(r => r.city || '').filter(Boolean))].sort();
  const neighborhoods = [...new Set(rows.filter(r => normalizeLocationOption(r.state) === normalizeLocationOption(state) && normalizeLocationOption(r.city) === normalizeLocationOption(city)).map(r => r.neighborhood || '').filter(Boolean))].sort();
  return { states, cities, neighborhoods };
}
