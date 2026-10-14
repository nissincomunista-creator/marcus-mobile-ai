import { locationAddress, addressUnits } from './src/utils/locationAddress.ts';
import { canonicalStreet } from './src/utils/streetMatching.ts';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cleanBrazilianAddress, geocodeAddress, getCachedCoords } from './geocodeService.ts';

type Address = { description?: string; id?: string; address?: string; city?: string; state?: string; neighborhood?: string };
export type OfficialLocation = Address & {
  status: 'located' | 'pending'; reason?: string; lat?: number; lng?: number;
  precision?: 'address'; source?: string; sourceUrl?: string;
  matchedStreet?: string; matchedNumber?: string; matchedLocality?: string;
  cnefeId?: string; geocodeLevel?: number; spreadMeters?: number;
  geocoderProvider?: 'nominatim' | 'photon';
  geocoderPrecision?: 'rooftop';
  matchedCity?: string;
  geocodeAttemptedAt?: string;
  geocodeAlgorithmVersion?: number;
  complements?: Record<string, string>;
  resolutionEvidence?: {
    method: 'ibge_sector_polygon_nearest_cnefe_cluster';
    sectorCode: string;
    sectorDescription: string;
    selectedBlock: string;
    selectedBoundaryDistanceMeters: number;
    alternateBlock: string;
    alternateBoundaryDistanceMeters: number;
  };
};
const EXACT_GEOCODE_ALGORITHM_VERSION = 2;
const file = path.join(process.cwd(), 'official_property_locations.json');
const normalize = (s?: string) => (s || '').normalize('NFC').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
const normalizeStreet = (s?: string) => normalize(cleanBrazilianAddress(s || '').street)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ')
  .replace(/^(rua|avenida|av|estrada|travessa|alameda|praca|rodovia|largo|beco)\s+/, '').trim();
function addressHouseUnit(address?: string): { number: string; suffix: string } | null {
  const match = (address || '').match(/\b(?:casa|cs)\s*[.:-]?\s*(\d+)\s*([a-z])?\b/i);
  return match ? { number: normalize(match[1]), suffix: normalize(match[2] || '') } : null;
}
// Full address, municipality and neighborhood are part of the identity. A changed address invalidates its old pin.
export const propertyLocationKey = (p: Address) => JSON.stringify([normalize(p.state), normalize(p.city), normalize(p.neighborhood), normalize(p.address)]);
export function validOfficialLocation(r: OfficialLocation): boolean {
  const states: Record<string, number[]> = { RJ: [-23.5,-20.7,-44.95,-40.8], MG: [-23,-14,-51.2,-39.7], SP: [-25.4,-19.7,-53.3,-44] };
  const bounds = states[(r.state || '').toUpperCase()];
  if (bounds && (r.lat! < bounds[0] || r.lat! > bounds[1] || r.lng! < bounds[2] || r.lng! > bounds[3])) return false;
  const requestedHouseUnit = addressHouseUnit(r.address);
  const cnefeHouseMatches = !requestedHouseUnit || (
    normalize(r.complements?.casa) === requestedHouseUnit.number &&
    (!requestedHouseUnit.suffix || normalize(r.complements?.outros) === requestedHouseUnit.suffix)
  );
  const requestedUnits = addressUnits(r.address || '');
  const blockMatches = !requestedUnits.bloco || r.complements?.bloco === requestedUnits.bloco;
  const hasCnefeEvidence = r.source === 'IBGE_CNEFE_2022' && [1, 2].includes(r.geocodeLevel!) && !!r.cnefeId && cnefeHouseMatches && blockMatches &&
    Number.isFinite(r.spreadMeters) && r.spreadMeters! >= 0 && r.spreadMeters! <= 20;
  const requestedNumber = cleanBrazilianAddress(r.address || '').number;
  const hasExactGeocoderEvidence = r.source === 'GEOCODE_NUMBER' && !requestedUnits.bloco &&
    ['nominatim', 'photon'].includes(String(r.geocoderProvider)) && r.geocoderPrecision === 'rooftop' &&
    !!requestedNumber && normalize(requestedNumber) === normalize(r.matchedNumber) &&
    !!r.city && normalize(r.city) === normalize(r.matchedCity) &&
    normalizeStreet(r.address) === normalizeStreet(r.matchedStreet);
  return r.status === 'located' && (hasCnefeEvidence || hasExactGeocoderEvidence) &&
    r.precision === 'address' && !!r.matchedStreet && !!r.matchedNumber &&
    Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.lat! > -34 && r.lat! < 6 && r.lng! > -74 && r.lng! < -32;
}
let stamp = -1;
let byAddress = new Map<string, OfficialLocation>();
let refreshing = false;
let geocodingPending = false;
let lastRefreshKey = '';
export const isMapLocationRefreshRunning = () => refreshing || geocodingPending;
function refresh() {
  let stat: fs.Stats;
  try { stat = fs.statSync(file); } catch { byAddress = new Map(); stamp = -1; return; }
  if (stat.mtimeMs === stamp) return;
  try {
    const rows: OfficialLocation[] = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(rows)) throw new Error('Expected an array of address records');
    const next = new Map<string, OfficialLocation>();
    for (const row of rows) next.set(propertyLocationKey(row), row);
    byAddress = next; stamp = stat.mtimeMs;
  } catch (error) { console.error('Não foi possível carregar as localizações oficiais:', error); }
}
type CachedCandidate = { lat: number; lng: number; level: string; street: string; number: string; locality: string; cnefeId: string; complements: Record<string, string> };
const candidateFiles = new Map<string, { stamp: number; candidates: Record<string, CachedCandidate[]> }>();
function resolveCachedNumber(p: Address): OfficialLocation | null {
  try {
    const root = path.join(process.cwd(), '.cache', 'map-cnefe');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    const municipality = manifest.find((m: any) => normalize(m.city) === normalize(p.city) && normalize(m.state) === normalize(p.state));
    if (!municipality) return null;
    const sourceFile = path.join(root, 'resolved', path.basename(municipality.name) + '.json');
    const mtime = fs.statSync(sourceFile).mtimeMs;
    let cached = candidateFiles.get(sourceFile);
    if (!cached || cached.stamp !== mtime) {
      cached = { stamp: mtime, candidates: JSON.parse(fs.readFileSync(sourceFile, 'utf8')).candidates || {} };
      candidateFiles.set(sourceFile, cached);
    }
    const parsed = cleanBrazilianAddress(p.address || '');
    const number = String(parsed.number || '').replace(/^0+(?=\d)/, '');
    const units = addressUnits(p.address || '');
    const rows = (cached.candidates[`${canonicalStreet(parsed.street)}|${number}`] || []).filter(c =>
      ['1', '2'].includes(String(c.level)) && canonicalStreet(c.street) === canonicalStreet(parsed.street) &&
      Object.entries(units).every(([key, value]) => String(c.complements?.[key] || '').toLowerCase().replace(/^0+(?=\d)/, '') === value));
    if (!rows.length) return null;
    const first = rows[0];
    const spread = Math.max(...rows.map(c => Math.hypot((c.lat - first.lat) * 111320,
      (c.lng - first.lng) * 111320 * Math.cos(first.lat * Math.PI / 180))));
    if (!Number.isFinite(spread) || spread > 20) return null;
    const result: OfficialLocation = { ...p, status: 'located', precision: 'address', source: 'IBGE_CNEFE_2022',
      sourceUrl: municipality.url, lat: first.lat, lng: first.lng, matchedStreet: first.street,
      matchedNumber: first.number, matchedLocality: first.locality, cnefeId: first.cnefeId,
      geocodeLevel: Number(first.level), spreadMeters: spread, complements: first.complements };
    return validOfficialLocation(result) ? result : null;
  } catch { return null; }
}
export function getOfficialPropertyLocation(p: Address): OfficialLocation {
  p = { ...p, address: locationAddress(p) };
  refresh();
  const row = byAddress.get(propertyLocationKey(p));
  if (row && validOfficialLocation(row)) return { ...row, id: p.id, address: p.address };
  const numbered = resolveCachedNumber(p);
  if (numbered) return numbered;
  // Reuse an already-verified numbered geocoder result even when the address
  // register has no matching unit/block row. Never promote street interpolation.
  const parsed = cleanBrazilianAddress(p.address || '');
  const cached = p.address ? getCachedCoords(p.address, p.neighborhood, p.city, p.state) : null;
  if (cached?.precision === 'rooftop' && parsed.number &&
      normalize(cached.matchedNumber) === normalize(parsed.number) &&
      normalizeStreet(cached.matchedStreet) === normalizeStreet(parsed.street) &&
      normalize(cached.matchedCity) === normalize(p.city) &&
      (cached.source === 'nominatim' || cached.source === 'photon')) {
    const fallback: OfficialLocation = {
      ...p,
      status: 'located',
      lat: cached.lat,
      lng: cached.lng,
      precision: 'address',
      source: 'GEOCODE_NUMBER',
      sourceUrl: cached.source === 'nominatim' ? 'https://nominatim.openstreetmap.org/' : 'https://photon.komoot.io/',
      geocoderProvider: cached.source,
      geocoderPrecision: 'rooftop',
      matchedStreet: cached.matchedStreet,
      matchedNumber: cached.matchedNumber,
      matchedCity: cached.matchedCity,
      matchedLocality: p.neighborhood,
      spreadMeters: 0
    };
    if (validOfficialLocation(fallback)) return fallback;
  }
  if (row?.status === 'pending') return { ...row, id: p.id, address: p.address };
  return { ...p, status: 'pending', reason: row ? 'invalid_source_record' : 'not_yet_matched' };
}

function persistLocationRows(rows: OfficialLocation[]) {
  try {
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(rows), 'utf8');
    try {
      fs.renameSync(temp, file);
    } catch (error: any) {
      // OneDrive and Windows file scanners can briefly hold the destination,
      // making an otherwise valid atomic replacement fail with EPERM. The temp
      // file is already complete; copy it as a fallback instead of losing the
      // entire geocoding batch at its final checkpoint.
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error?.code)) {
        console.warn('[Mapa] Falha no rename:', error?.message);
      }
      try {
        fs.copyFileSync(temp, file);
      } catch (copyErr: any) {
        console.warn('[Mapa] Aviso ao copiar arquivo de localização (travado por OneDrive/antivírus):', copyErr?.message);
      }
      try { fs.unlinkSync(temp); } catch {}
    }
    stamp = -1;
    refresh();
  } catch (err: any) {
    console.warn('[Mapa] Aviso na persistência de localizações oficiais:', err?.message || err);
  }
}

/**
 * Backfill only number-confirmed address geocodes. Street-centre results are
 * deliberately rejected; unresolved or ambiguous addresses stay off-map.
 * The work is sequential and cached so the public geocoders are not flooded.
 */
export async function geocodePendingPropertyLocations(properties: Address[]) {
  if (geocodingPending) return;
  geocodingPending = true;
  try {
    refresh();
    const rows: OfficialLocation[] = JSON.parse(fs.readFileSync(file, 'utf8'));
    const byId = new Map(rows.map((row, index) => [row.id, index] as const));
    const pending = properties.filter(property => {
      const index = property.id ? byId.get(property.id) : undefined;
      const current = index === undefined ? undefined : rows[index];
      if (current && validOfficialLocation(current)) return false;
      if (current?.geocodeAttemptedAt && current.geocodeAlgorithmVersion === EXACT_GEOCODE_ALGORITHM_VERSION) return false;
      const parsed = cleanBrazilianAddress(property.address || '');
      return !!property.id && !!parsed.street && !!parsed.number && !!property.city && !!property.state;
    });
    if (!pending.length) return;

    let lastNetworkStart = 0;
    let changed = 0;
    for (const property of pending) {
      const index = byId.get(property.id!);
      if (index === undefined) continue;
      const current = rows[index];
      const parsed = cleanBrazilianAddress(property.address || '');
      const cachedExact = getCachedCoords(property.address || '', property.neighborhood, property.city, property.state);
      const needsNetworkLookup = cachedExact?.precision !== 'rooftop';
      const elapsed = Date.now() - lastNetworkStart;
      if (needsNetworkLookup && lastNetworkStart && elapsed < 1200) {
        await new Promise(resolve => setTimeout(resolve, 1200 - elapsed));
      }
      if (needsNetworkLookup) lastNetworkStart = Date.now();

      let result = null;
      try {
        result = await geocodeAddress(property.address || '', {
          neighborhood: property.neighborhood,
          city: property.city,
          state: property.state,
          allowStreetFallback: false
        });
      } catch (error) {
        console.warn(`[Mapa] Geocodificação exata falhou para ${property.id}:`, error);
      }

      current.geocodeAttemptedAt = new Date().toISOString();
      current.geocodeAlgorithmVersion = EXACT_GEOCODE_ALGORITHM_VERSION;
      if (result?.precision === 'rooftop' && normalize(result.matchedNumber) === normalize(parsed.number)) {
        rows[index] = {
          ...current,
          ...property,
          status: 'located',
          reason: undefined,
          lat: result.lat,
          lng: result.lng,
          precision: 'address',
          source: 'GEOCODE_NUMBER',
          sourceUrl: result.source === 'nominatim' ? 'https://nominatim.openstreetmap.org/' : 'https://photon.komoot.io/',
          geocoderProvider: result.source === 'nominatim' || result.source === 'photon' ? result.source : undefined,
          geocoderPrecision: 'rooftop',
          matchedStreet: result.matchedStreet,
          matchedNumber: result.matchedNumber,
          matchedCity: result.matchedCity,
          matchedLocality: property.neighborhood,
          spreadMeters: 0
        };
      }
      changed++;
      if (changed % 10 === 0 || changed === pending.length) persistLocationRows(rows);
      if (changed % 100 === 0 || changed === pending.length) {
        console.info(`[Mapa] Geocodificação exata: ${changed}/${pending.length} endereços tentados.`);
      }
    }
    if (changed % 10 !== 0) persistLocationRows(rows);
    console.info(`[Mapa] Geocodificação de endereços concluída: ${changed} tentativas exatas.`);
  } finally {
    geocodingPending = false;
  }
}

// The source files stay local. New or changed addresses are matched in a worker;
// the last complete result remains available until an atomic replacement succeeds.
export function ensureOfficialLocationCoverage(properties: Address[]) {
  if (refreshing) return;
  refresh();
  const hasMissingLocationRecord = properties.some(p => !byAddress.has(propertyLocationKey({ ...p, address: locationAddress(p) })));
  if (!hasMissingLocationRecord) {
    void geocodePendingPropertyLocations(properties);
    return;
  }
  const inputs = properties.map(p => ({ id:p.id, address:locationAddress(p), city:p.city || '', state:p.state || '', neighborhood:p.neighborhood || '' }));
  const fingerprint = createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
  if (fingerprint === lastRefreshKey) return;
  const cache = path.join(process.cwd(), '.cache', 'map-cnefe');
  if (!fs.existsSync(path.join(cache, 'manifest.json'))) return;
  let config: { pythonExecutable?: string } = {};
  try { config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'map_sources_config.json'), 'utf8')); } catch {}
  const python = process.env.PYTHON_EXECUTABLE || config.pythonExecutable || 'python';
  const inputPath = path.join(cache, 'refresh_targets.json');
  fs.writeFileSync(inputPath, JSON.stringify(inputs));
  lastRefreshKey = fingerprint;
  refreshing = true;
  const child = spawn(python, [path.join(process.cwd(), 'scripts', 'refresh_map_locations.py'), inputPath], {
    cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, CNEFE_DIRECTORY: cache }
  });
  let failure = '';
  child.stderr.on('data', chunk => { failure = (failure + String(chunk)).slice(-3000); });
  child.once('error', error => { refreshing = false; console.error('[Mapa] Falha ao iniciar cruzamento:', error.message); });
  child.once('close', code => {
    refreshing = false;
    if (code !== 0) console.error('[Mapa] Falha no cruzamento de endereços:', failure);
    else refresh();
    void geocodePendingPropertyLocations(properties);
  });
}
