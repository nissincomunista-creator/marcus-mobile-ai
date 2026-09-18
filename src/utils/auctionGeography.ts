import municipalities from '../data/auctionMunicipalities.json';

// IBGE Localidades, retrieved 2026-09-15. Collection coverage is independent of ITBI.
export const AUCTION_MUNICIPALITIES = municipalities;
export const AUCTION_STATES = [...new Set(municipalities.map(row => row.state))].sort();
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rowsByState = new Map(AUCTION_STATES.map(state => [state, municipalities.filter(row => row.state === state)]));
const patterns = new Map(AUCTION_STATES.map(state => {
 const names = rowsByState.get(state)!.map(row => normalize(row.city)).sort((a,b) => b.length-a.length);
 return [state, new RegExp(`(?:^|[^a-z])(${names.map(escape).join('|')})\\s*[,/–—-]\\s*${state.toLowerCase()}(?:$|[^a-z])`, 'g')];
}));
const cache = new Map<string, {city:string;state:string}|null>();
export function sourceAuctionLocation(text: string, state?: string): {city: string; state: string} | null {
 const key = (state || '') + ':' + text;
 if (cache.has(key)) return cache.get(key)!;
 const normalized = normalize(text);
 const locations = new Map<string, {city:string;state:string}>();
 for (const uf of state ? [state] : AUCTION_STATES) {
  const pattern = patterns.get(uf);
  if (!pattern) continue;
  for (const match of normalized.matchAll(pattern)) {
   const row = rowsByState.get(uf)!.find(row => normalize(row.city) === match[1])!;
   locations.set(row.city+'/'+uf, {city:row.city,state:uf});
  }
 }
 const location = locations.size === 1 ? [...locations.values()][0] : null;
 if (text.length < 500) {
  if (cache.size >= 12000) cache.delete(cache.keys().next().value!);
  cache.set(key,location);
 }
 return location;
}
export function municipalityId(city: string, state: string): string | undefined {
 return rowsByState.get(state)?.find(row => normalize(row.city) === normalize(city))?.id;
}
