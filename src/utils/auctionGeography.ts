import municipalities from '../data/auctionMunicipalities.json';
import { CITY_ZONES } from './cityZones.ts';

// IBGE Localidades, retrieved 2026-09-15. Collection coverage is independent of ITBI.
export const AUCTION_MUNICIPALITIES = municipalities;
export const AUCTION_STATES = [...new Set(municipalities.map(row => row.state))].sort();
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TARGET_CITY_STATE = new Map([['rio de janeiro', 'RJ'], ['niteroi', 'RJ'], ['juiz de fora', 'MG']]);
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

// Some official lot pages omit the UF after the municipality, or print only
// a distinctive neighborhood followed by "RJ". Resolve those cases only in
// an address/lot fragment, never from a site's footer or surrounding page.
export function sourceTargetCityLocation(text: string): {city: string; state: string} | null {
 const normalized = normalize(text);
 if (!/\b(?:rua|avenida|av\.?|estrada|travessa|logradouro|endereco|bairro|apartamento|apto|casa|terreno)\b/.test(normalized)) return null;

 // "Niterói, Rio de Janeiro" means Niterói/RJ; the state name must not be
 // mistaken for the municipality Rio de Janeiro.
 if (/\bniteroi\s*[,/-]\s*rio de janeiro\b/.test(normalized)) return { city: 'Niterói', state: 'RJ' };

 const matches = [...TARGET_CITY_STATE.entries()].filter(([city]) =>
  new RegExp(`(?:^|[^a-z])${escape(city)}(?=$|[^a-z])`).test(normalized)
 );
 if (matches.length !== 1) return null;
 const [city, state] = matches[0];
 return { city: city === 'niteroi' ? 'Niterói' : city === 'juiz de fora' ? 'Juiz de Fora' : 'Rio de Janeiro', state };
}

export function sourceNeighborhoodLocation(text: string): {city: string; state: string} | null {
 const normalized = normalize(text);
 if (!/\b(?:rua|avenida|av\.?|estrada|travessa|logradouro|endereco|bairro|apartamento|apto|casa|terreno)\b/.test(normalized)) return null;

 const stateTokens = [...normalized.matchAll(/(?:^|[^a-z])(rj|mg|rio de janeiro|minas gerais)(?=$|[^a-z])/g)];
 for (const token of stateTokens) {
  const marker = token[1];
  const state = marker === 'rj' || marker === 'rio de janeiro' ? 'RJ' : 'MG';
  const markerIndex = token.index! + token[0].length;
  const addressTail = normalized.slice(Math.max(0, markerIndex - 100), markerIndex);
  const cities = state === 'RJ' ? ['Rio de Janeiro', 'Niterói'] : [];
  const matched = cities.filter(city => {
   const zones = CITY_ZONES[normalize(city)] || [];
   return zones.some(zone => zone.neighborhoods.some(name => {
    const escapedName = escape(normalize(name));
    return new RegExp(`(?:^|[^a-z])${escapedName}(?=$|[^a-z])`).test(addressTail);
   }));
  });
  if (matched.length === 1) return { city: matched[0], state };
 }
 return null;
}
export function municipalityId(city: string, state: string): string | undefined {
 return rowsByState.get(state)?.find(row => normalize(row.city) === normalize(city))?.id;
}
