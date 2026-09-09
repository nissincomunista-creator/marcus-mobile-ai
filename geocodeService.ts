import fs from 'fs';
import path from 'path';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  // `rooftop` is a number/building match; `street` is a validated street axis.
  // Neighborhood/city centroids are intentionally never returned to the map.
  precision?: 'rooftop' | 'street';
  source?: 'nominatim' | 'photon' | 'local-cache';
  matchedCity?: string;
  matchedStreet?: string;
}

const GEOCODE_CACHE_PATH = path.join(process.cwd(), 'geocode_cache.json');
export let geocodeCache: Record<string, GeocodeResult> = {};

if (fs.existsSync(GEOCODE_CACHE_PATH)) {
  try {
    geocodeCache = JSON.parse(fs.readFileSync(GEOCODE_CACHE_PATH, 'utf-8'));
  } catch (e) {
    console.error('Error reading geocode_cache.json:', e);
  }
}

function saveGeocodeCache() {
  try {
    fs.writeFileSync(GEOCODE_CACHE_PATH, JSON.stringify(geocodeCache, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving geocode_cache.json:', e);
  }
}

let streetCoordsData: Record<string, { lat: number; lng: number }> = {};
try {
  const sdPath = path.join(process.cwd(), 'src', 'utils', 'streetCoordsData.json');
  if (fs.existsSync(sdPath)) {
    streetCoordsData = JSON.parse(fs.readFileSync(sdPath, 'utf-8'));
  }
} catch (e) {}

function normalizeForMatch(value: string | null | undefined): string {
  return cleanQuery(value || '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function streetCore(value: string | null | undefined): string {
  return normalizeForMatch(value)
    .replace(/^(rua|avenida|av|estrada|travessa|alameda|praca|rodovia|largo|beco|ladeira)\s+/, '')
    .replace(/\b(antiga|novo|nova)\s+rua\s+\d+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasLocationTextMatch(expected: string, candidate: string): boolean {
  const wanted = normalizeForMatch(expected);
  const actual = normalizeForMatch(candidate);
  if (!wanted || !actual) return false;
  if (actual.includes(wanted) || wanted.includes(actual)) return true;

  const tokens = wanted.split(' ').filter(token => token.length >= 3 && !['dos', 'das', 'de', 'do'].includes(token));
  if (tokens.length === 0) return false;
  const matches = tokens.filter(token => actual.split(' ').includes(token)).length;
  return matches >= Math.min(2, tokens.length) && matches / tokens.length >= 0.65;
}

function hasStreetMatch(expectedStreet: string, candidateStreet: string): boolean {
  const expected = streetCore(expectedStreet);
  const candidate = streetCore(candidateStreet);
  return hasLocationTextMatch(expected, candidate);
}

function hasCityMatch(expectedCity: string | undefined, candidateCity: string | undefined, displayName: string): boolean {
  const expected = normalizeForMatch(expectedCity);
  if (!expected) return true;

  // Prefer the structured municipality field. This avoids accepting a result
  // from Itaguai merely because its state display name contains "Rio de Janeiro".
  if (candidateCity) return hasLocationTextMatch(expected, candidateCity);

  return hasLocationTextMatch(expected, displayName);
}

function hasValidCoordinates(result: Partial<GeocodeResult> | undefined, state?: string): result is GeocodeResult {
  if (!result || !Number.isFinite(result.lat) || !Number.isFinite(result.lng)) return false;
  return isCoordinateWithinState(result.lat, result.lng, state);
}

function isResultForAddress(
  result: Partial<GeocodeResult>,
  address: string,
  neighborhood?: string,
  city?: string,
  state?: string
): result is GeocodeResult {
  if (!hasValidCoordinates(result, state)) return false;
  const { street } = cleanBrazilianAddress(address);
  if (!street || streetCore(street).length < 3) return false;

  const candidateStreet = `${result.matchedStreet || ''} ${result.displayName || ''}`;
  const candidateCity = result.matchedCity;
  return hasStreetMatch(street, candidateStreet) && hasCityMatch(city, candidateCity, result.displayName || '');
}

export function getCachedCoords(address: string, neighborhood?: string, city?: string, state?: string): GeocodeResult | null {
  const normKey = cleanQuery(address);
  const { street } = cleanBrazilianAddress(address);
  const cityName = city || 'Rio de Janeiro';
  const uf = state || 'RJ';

  // Accept a disk-cache item only when its returned address still agrees with
  // the requested city and street. Older cache entries had no precision field,
  // so they are conservatively treated as street-level matches.
  const cacheKeys = new Set<string>();
  if (normKey) cacheKeys.add(normKey);
  if (street) {
    const streetKey = cleanQuery(street);
    if (streetKey) cacheKeys.add(streetKey);

    if (neighborhood) {
      const neighKey = cleanQuery(`${street}, ${neighborhood}`);
      if (neighKey) cacheKeys.add(neighKey);

      const fullKey = cleanQuery(`${street}, ${neighborhood}, ${cityName} - ${uf}`);
      if (fullKey) cacheKeys.add(fullKey);
    }
  }

  for (const key of cacheKeys) {
    const cached = geocodeCache[key];
    if (isResultForAddress(cached, address, neighborhood, cityName, uf)) {
      return {
        ...cached,
        precision: cached.precision || 'street',
        source: cached.source || 'local-cache'
      };
    }
  }

  if (street) {
    // The local registry is keyed by state + city + neighborhood + street. Do
    // not loosen this lookup: a homonymous street in another neighborhood is
    // more harmful than an item waiting for review.
    const stateKey = cleanQuery(uf);
    const c = cleanQuery(cityName);
    const n = cleanQuery(neighborhood || '');
    const streetKey = cleanQuery(street);
    const s = streetKey.replace(/^r\.\s*/, 'rua ').replace(/^av\.\s*/, 'avn ').replace(/^est\.\s*/, 'etr ');
    const sFull = streetKey.replace(/^r\.\s*/, 'rua ').replace(/^av\.\s*/, 'avenida ').replace(/^est\.\s*/, 'estrada ');

    const keys = [
      `${stateKey}_${c}_${n}_${s}`,
      `${stateKey}_${c}_${n}_${sFull}`,
      `${stateKey}_${c}_${n}_${streetKey}`
    ];

    for (const k of keys) {
      // `street_coords_cache.json` also serves radial ITBI calculations and can
      // contain inferred coordinates. Only the checked-in street registry is
      // authoritative enough to place a property on the map.
      const hit = streetCoordsData[k];
      if (hit && hit.lat && hit.lng && !(hit.lat === -22.90642 && hit.lng === -43.18223)) {
        return {
          lat: hit.lat,
          lng: hit.lng,
          displayName: `${street}, ${neighborhood || ''}, ${cityName} - ${uf}`,
          precision: 'street',
          source: 'local-cache',
          matchedCity: cityName,
          matchedStreet: street
        };
      }
    }
  }

  return null;
}

export function cleanQuery(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Parses a raw Brazilian property address to extract clean street name and street number,
 * removing apartment/unit/block/subdivision noise that breaks Nominatim / Google Maps queries.
 */
export function cleanBrazilianAddress(raw: string): { street: string; number: string } {
  let text = (raw || '').trim();

  // Strip CEP
  text = text.replace(/cep:?\s*\d{5}-?\d{3}/gi, '');

  // Strip trailing municipal/state abbreviations like ',PE', ', PE', ',RJ', etc.
  text = text.replace(/,\s*(?:pe|rj|sp|mg|df|pr|sc|rs|es|ba|ce|go|ma|pb|am|rn|al|pi|mt|ms|se|ro|to|ac|ap|rr)\b/gi, '').trim();

  // Extract number if present: 'N. 6', 'Nº 6', ', 6', 'NUM 6', 'NRO 6', etc.
  let number = '';
  const numMatch = text.match(/(?:,\s*|\s+)(?:n[ºo°.]?|num(?:ero)?\.?|nro\.?)\s*(\d+[a-z]?)\b/i) ||
                   text.match(/,\s*(\d+[a-z]?)\b/i);
  if (numMatch) {
    number = numMatch[1];
  }

  // Extract street name before number or complement
  let street = text.split(/,\s*(?:n[ºo°.]?|num|\d)/i)[0].trim();
  
  // Remove unit/apartment/block/room text
  street = street.replace(/\b(apto|apt|ap|apartamento|bloco|bl|sala|loja|cobertura|cob|unidade|unid|andar|pavimento|fundos|fds|casa\s*\d+)\b[.\s#\d\w\/-]*/gi, '').trim();
  street = street.replace(/,\s*$/, '').trim();

  // Normalize common street prefixes
  street = street.replace(/^r\.\s*/i, 'Rua ')
                 .replace(/^av\.\s*/i, 'Avenida ')
                 .replace(/^est\.\s*/i, 'Estrada ')
                 .replace(/^tr\.\s*/i, 'Travessa ')
                 .replace(/^pca\.\s*/i, 'Praça ');

  return { street, number };
}

export function isCoordinateWithinState(lat: number, lng: number, state?: string): boolean {
  if (!state) return true;
  const uf = state.toUpperCase().trim();
  if (uf === 'RJ') {
    return lat >= -23.55 && lat <= -20.5 && lng >= -45.0 && lng <= -40.5;
  }
  if (uf === 'SP') {
    return lat >= -25.5 && lat <= -19.5 && lng >= -53.5 && lng <= -44.0;
  }
  if (uf === 'MG') {
    return lat >= -23.0 && lat <= -14.0 && lng >= -51.5 && lng <= -39.5;
  }
  return true;
}

interface GeocodeSearchContext {
  street: string;
  number: string;
  city: string;
  state: string;
}

function buildCandidate(
  lat: number,
  lng: number,
  displayName: string,
  source: 'nominatim' | 'photon',
  context: GeocodeSearchContext,
  matchedCity?: string,
  matchedStreet?: string,
  matchedNumber?: string
): GeocodeResult | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isCoordinateWithinState(lat, lng, context.state)) {
    return null;
  }

  if (!hasStreetMatch(context.street, `${matchedStreet || ''} ${displayName}`)) {
    return null;
  }
  if (!hasCityMatch(context.city, matchedCity, displayName)) {
    return null;
  }

  const exactNumber = context.number && normalizeForMatch(matchedNumber) === normalizeForMatch(context.number);
  return {
    lat,
    lng,
    displayName,
    precision: exactNumber ? 'rooftop' : 'street',
    source,
    matchedCity,
    matchedStreet
  };
}

async function queryPhoton(query: string, context: GeocodeSearchContext): Promise<GeocodeResult | null> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MarcusAssessoriaApp/2.0' }
    });
    if (!response.ok) return null;

    const data: any = await response.json();
    for (const feature of data?.features || []) {
      const properties = feature?.properties || {};
      const lng = parseFloat(feature?.geometry?.coordinates?.[0]);
      const lat = parseFloat(feature?.geometry?.coordinates?.[1]);
      const displayName = [
        properties.name,
        properties.street,
        properties.housenumber,
        properties.district,
        properties.city,
        properties.state,
        properties.country
      ].filter(Boolean).join(', ') || query;
      const result = buildCandidate(
        lat,
        lng,
        displayName,
        'photon',
        context,
        properties.city || properties.municipality || properties.locality,
        properties.street || properties.name,
        properties.housenumber
      );
      if (result) return result;
    }
  } catch (err: any) {}
  return null;
}

async function queryNominatim(query: string, context: GeocodeSearchContext): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=br&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MarcusAssessoriaApp/2.0 (imoveis@marcus.com.br)' }
    });
    if (!response.ok) return null;

    const data: any = await response.json();
    for (const hit of Array.isArray(data) ? data : []) {
      const address = hit.address || {};
      const result = buildCandidate(
        parseFloat(hit.lat),
        parseFloat(hit.lon),
        hit.display_name || query,
        'nominatim',
        context,
        address.city || address.town || address.village || address.municipality || address.county,
        address.road || address.pedestrian || address.residential || address.footway || address.place,
        address.house_number
      );
      if (result) return result;
    }
  } catch (err: any) {
    console.warn(`[Geocode Service] Nominatim request failed for "${query}":`, err.message);
  }
  return null;
}

function cacheResolvedAddress(result: GeocodeResult, query: string, street: string, neighborhood: string, city: string, state: string) {
  const keys = new Set([
    cleanQuery(query),
    cleanQuery(`${street}, ${neighborhood}, ${city} - ${state}`),
    cleanQuery(street)
  ]);
  for (const key of keys) {
    if (key) geocodeCache[key] = result;
  }
  saveGeocodeCache();
}

export async function geocodeAddress(
  query: string,
  options?: { neighborhood?: string; city?: string; state?: string; allowStreetFallback?: boolean }
): Promise<GeocodeResult | null> {
  const normKey = cleanQuery(query);
  if (!normKey || normKey.length < 3) return null;

  const state = (options?.state?.trim() || 'RJ').toUpperCase();
  const city = options?.city?.trim() || 'Rio de Janeiro';
  const neighborhood = options?.neighborhood?.trim() || '';
  const { street, number } = cleanBrazilianAddress(query);
  if (!street || streetCore(street).length < 3) return null;

  const cached = getCachedCoords(query, neighborhood, city, state);
  if (cached) return cached;

  const context: GeocodeSearchContext = { street, number, city, state };
  const exactQuery = `${street}${number ? `, ${number}` : ''}, ${neighborhood ? `${neighborhood}, ` : ''}${city} - ${state}, Brasil`;
  const exactHit = await queryNominatim(exactQuery, context) || await queryPhoton(exactQuery, context);
  if (exactHit) {
    cacheResolvedAddress(exactHit, query, street, neighborhood, city, state);
    return exactHit;
  }

  if (options?.allowStreetFallback === false) return null;

  const streetQuery = `${street}, ${neighborhood ? `${neighborhood}, ` : ''}${city} - ${state}, Brasil`;
  const streetHit = await queryNominatim(streetQuery, context) || await queryPhoton(streetQuery, context);
  if (streetHit) {
    cacheResolvedAddress({ ...streetHit, precision: 'street' }, query, street, neighborhood, city, state);
    return { ...streetHit, precision: 'street' };
  }

  // Deliberately no neighborhood/city fallback: an unverified property stays
  // out of the map instead of appearing in an arbitrary location.
  return null;
}
