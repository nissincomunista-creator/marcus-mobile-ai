import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

type Address = { id?: string; address?: string; city?: string; state?: string; neighborhood?: string };
export type OfficialLocation = Address & {
  status: 'located' | 'pending'; reason?: string; lat?: number; lng?: number;
  precision?: 'address'; source?: string; sourceUrl?: string;
  matchedStreet?: string; matchedNumber?: string; matchedLocality?: string;
  cnefeId?: string; geocodeLevel?: number; spreadMeters?: number;
  complements?: Record<string, string>;
};
const file = path.join(process.cwd(), 'official_property_locations.json');
const normalize = (s?: string) => (s || '').normalize('NFC').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
// Full address, municipality and neighborhood are part of the identity. A changed address invalidates its old pin.
export const propertyLocationKey = (p: Address) => JSON.stringify([normalize(p.state), normalize(p.city), normalize(p.neighborhood), normalize(p.address)]);
export function validOfficialLocation(r: OfficialLocation): boolean {
  const states: Record<string, number[]> = { RJ: [-23.5,-20.7,-44.95,-40.8], MG: [-23,-14,-51.2,-39.7], SP: [-25.4,-19.7,-53.3,-44] };
  const bounds = states[(r.state || '').toUpperCase()];
  if (bounds && (r.lat! < bounds[0] || r.lat! > bounds[1] || r.lng! < bounds[2] || r.lng! > bounds[3])) return false;
  return r.status === 'located' && r.source === 'IBGE_CNEFE_2022' && [1, 2].includes(r.geocodeLevel!) &&
    r.precision === 'address' && !!r.cnefeId && !!r.matchedStreet && !!r.matchedNumber &&
    Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.lat! > -34 && r.lat! < 6 && r.lng! > -74 && r.lng! < -32 &&
    Number.isFinite(r.spreadMeters) && r.spreadMeters! >= 0 && r.spreadMeters! <= 20;
}
let stamp = -1;
let byAddress = new Map<string, OfficialLocation>();
let refreshing = false;
let lastRefreshKey = '';
export const isMapLocationRefreshRunning = () => refreshing;
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
export function getOfficialPropertyLocation(p: Address): OfficialLocation {
  refresh();
  const row = byAddress.get(propertyLocationKey(p));
  if (row && (row.status === 'pending' || validOfficialLocation(row))) return { ...row, id: p.id, address: p.address };
  return { ...p, status: 'pending', reason: row ? 'invalid_source_record' : 'not_yet_matched' };
}

// The source files stay local. New or changed addresses are matched in a worker;
// the last complete result remains available until an atomic replacement succeeds.
export function ensureOfficialLocationCoverage(properties: Address[]) {
  if (refreshing) return;
  refresh();
  if (!properties.some(p => !byAddress.has(propertyLocationKey(p)))) return;
  const inputs = properties.map(p => ({ id:p.id, address:p.address || '', city:p.city || '', state:p.state || '', neighborhood:p.neighborhood || '' }));
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
  });
}
