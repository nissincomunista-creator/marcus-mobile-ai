import fs from 'fs';
import path from 'path';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
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

let streetCoordsCache: Record<string, { lat: number; lng: number }> = {};
try {
  const scPath = path.join(process.cwd(), 'street_coords_cache.json');
  if (fs.existsSync(scPath)) {
    streetCoordsCache = JSON.parse(fs.readFileSync(scPath, 'utf-8'));
  }
} catch (e) {}

let streetCoordsData: Record<string, { lat: number; lng: number }> = {};
try {
  const sdPath = path.join(process.cwd(), 'src', 'utils', 'streetCoordsData.json');
  if (fs.existsSync(sdPath)) {
    streetCoordsData = JSON.parse(fs.readFileSync(sdPath, 'utf-8'));
  }
} catch (e) {}

export function getCachedCoords(address: string, neighborhood?: string, city?: string, state?: string): GeocodeResult | null {
  const normKey = cleanQuery(address);
  if (normKey && geocodeCache[normKey]) {
    return geocodeCache[normKey];
  }

  const { street } = cleanBrazilianAddress(address);
  if (street) {
    const streetKey = cleanQuery(street);
    if (geocodeCache[streetKey]) return geocodeCache[streetKey];

    if (neighborhood) {
      const neighKey = cleanQuery(`${street}, ${neighborhood}`);
      if (geocodeCache[neighKey]) return geocodeCache[neighKey];

      const fullKey = cleanQuery(`${street}, ${neighborhood}, ${city || 'Rio de Janeiro'} - ${state || 'RJ'}`);
      if (geocodeCache[fullKey]) return geocodeCache[fullKey];
    }

    // Check streetCoordsData and streetCoordsCache
    const uf = cleanQuery(state || 'rj');
    const c = cleanQuery(city || 'rio de janeiro');
    const n = cleanQuery(neighborhood || '');
    const s = streetKey.replace(/^r\.\s*/, 'rua ').replace(/^av\.\s*/, 'avn ').replace(/^est\.\s*/, 'etr ');
    const sFull = streetKey.replace(/^r\.\s*/, 'rua ').replace(/^av\.\s*/, 'avenida ').replace(/^est\.\s*/, 'estrada ');

    const keys = [
      `${uf}_${c}_${n}_${s}`,
      `${uf}_${c}_${n}_${sFull}`,
      `${uf}_${c}_${n}_${streetKey}`
    ];

    for (const k of keys) {
      const hit = streetCoordsCache[k] || streetCoordsData[k];
      if (hit && hit.lat && hit.lng && !(hit.lat === -22.90642 && hit.lng === -43.18223)) {
        return {
          lat: hit.lat,
          lng: hit.lng,
          displayName: `${street}, ${neighborhood || ''}`
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

async function queryPhoton(query: string, uf?: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MarcusAssessoriaApp/2.0'
      }
    });

    if (!response.ok) return null;

    const data: any = await response.json();
    if (data && data.features && data.features.length > 0) {
      const f = data.features[0];
      const lng = parseFloat(f.geometry.coordinates[0]);
      const lat = parseFloat(f.geometry.coordinates[1]);
      if (isCoordinateWithinState(lat, lng, uf)) {
        return {
          lat,
          lng,
          displayName: f.properties.name || query
        };
      }
    }
  } catch (err: any) {}
  return null;
}

async function queryNominatim(query: string, uf?: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MarcusAssessoriaApp/1.0 (imoveis@marcus.com.br)'
      }
    });

    if (!response.ok) return null;

    const data: any = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const hit = data[0];
      const lat = parseFloat(hit.lat);
      const lng = parseFloat(hit.lon);
      if (isCoordinateWithinState(lat, lng, uf)) {
        return {
          lat,
          lng,
          displayName: hit.display_name || query
        };
      }
    }
  } catch (err: any) {
    console.warn(`[Geocode Service] Nominatim request failed for "${query}":`, err.message);
  }
  return null;
}

export async function geocodeAddress(
  query: string,
  options?: { neighborhood?: string; city?: string; state?: string }
): Promise<GeocodeResult | null> {
  const normKey = cleanQuery(query);
  if (!normKey || normKey.length < 3) return null;

  const uf = (options?.state?.trim() || 'RJ').toUpperCase();

  // 1. Check in-memory / disk cache first (ensuring state boundary is valid)
  if (geocodeCache[normKey]) {
    const cached = geocodeCache[normKey];
    if (isCoordinateWithinState(cached.lat, cached.lng, uf)) {
      return cached;
    }
  }

  const { street, number } = cleanBrazilianAddress(query);
  const neigh = options?.neighborhood?.trim() || '';
  const city = options?.city?.trim() || 'Rio de Janeiro';

  // Tier 1: Try rooftop precision if number exists: "Street, Number, Neighborhood, City - State, Brasil"
  if (street && number) {
    const rooftopQuery = `${street}, ${number}, ${neigh ? neigh + ', ' : ''}${city} - ${uf}, Brasil`;
    const rooftopHit = await queryPhoton(rooftopQuery, uf) || await queryNominatim(rooftopQuery, uf);
    if (rooftopHit) {
      geocodeCache[normKey] = rooftopHit;
      saveGeocodeCache();
      return rooftopHit;
    }
  }

  // Tier 2: Try street level: "Street, Neighborhood, City - State, Brasil"
  if (street) {
    const streetQuery = `${street}, ${neigh ? neigh + ', ' : ''}${city} - ${uf}, Brasil`;
    const streetHit = await queryPhoton(streetQuery, uf) || await queryNominatim(streetQuery, uf);
    if (streetHit) {
      geocodeCache[normKey] = streetHit;
      saveGeocodeCache();
      return streetHit;
    }
  }

  // Tier 3: Try raw query cleaned with City and UF
  const rawHit = await queryPhoton(`${query}, ${city} - ${uf}, Brasil`, uf) || await queryNominatim(`${query}, ${city} - ${uf}, Brasil`, uf);
  if (rawHit) {
    geocodeCache[normKey] = rawHit;
    saveGeocodeCache();
    return rawHit;
  }

  // Tier 4: Fallback to Neighborhood level if provided
  if (neigh) {
    const neighQuery = `${neigh}, ${city} - ${uf}, Brasil`;
    const neighHit = await queryNominatim(neighQuery, uf);
    if (neighHit) {
      geocodeCache[normKey] = neighHit;
      saveGeocodeCache();
      return neighHit;
    }
  }

  return null;
}
