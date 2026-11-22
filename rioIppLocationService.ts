import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const GIS_DIR = path.resolve('data/gis/rio_itbi_map');
const SHARDS_DIR = path.join(GIS_DIR, 'ipp_shards');
const STREETS_FILE = path.join(SHARDS_DIR, 'streets.json.gz');
const AUCTION_LOCS_FILE = path.join(GIS_DIR, 'rio_auction_locations.json');
const AUCTION_BUILDINGS_FILE = path.join(GIS_DIR, 'rio_auction_buildings.geojson');

export interface RioIppResolution {
  lat: number;
  lng: number;
  oid?: number | null;
  h?: number | null;
  cl: string;
  clnp?: string;
  matchedStreet: string;
  matchedNumber: string;
  bairro: string;
  method: string;
}

const FIRST_TOKEN_ABBR: Record<string, string> = {
  R: 'RUA', AV: 'AVENIDA', AVN: 'AVENIDA', AVDA: 'AVENIDA',
  EST: 'ESTRADA', ESTR: 'ESTRADA', PC: 'PRACA', PCA: 'PRACA', PR: 'PRACA',
  TV: 'TRAVESSA', TRV: 'TRAVESSA', TRAV: 'TRAVESSA', AL: 'ALAMEDA',
  LG: 'LARGO', LGO: 'LARGO', ROD: 'RODOVIA', CAM: 'CAMINHO',
  LAD: 'LADEIRA', VL: 'VILA', PQ: 'PARQUE', BCO: 'BECO',
  PAS: 'PASSAGEM', VIAD: 'VIADUTO', PTE: 'PONTE', TUN: 'TUNEL',
  PRQ: 'PARQUE', JD: 'JARDIM', SERV: 'SERVIDAO', BLV: 'BOULEVARD',
};

const WORD_ABBR: Record<string, string> = {
  STA: 'SANTA', STO: 'SANTO', DR: 'DOUTOR', DRA: 'DOUTORA',
  PROF: 'PROFESSOR', PROFA: 'PROFESSORA', PRES: 'PRESIDENTE', GEN: 'GENERAL',
  CEL: 'CORONEL', MAJ: 'MAJOR', CAP: 'CAPITAO', ALM: 'ALMIRANTE',
  BRIG: 'BRIGADEIRO', MAL: 'MARECHAL', DES: 'DESEMBARGADOR', SEN: 'SENADOR',
  GOV: 'GOVERNADOR', DEP: 'DEPUTADO', VER: 'VEREADOR', ENG: 'ENGENHEIRO',
  ARQ: 'ARQUITETO', PE: 'PADRE', MONS: 'MONSENHOR', VISC: 'VISCONDE',
  JORN: 'JORNALISTA', MIN: 'MINISTRO', TEN: 'TENENTE', SGT: 'SARGENTO',
  COM: 'COMENDADOR', SRA: 'SENHORA', SR: 'SENHOR', NSRA: 'NOSSA SENHORA',
  N: 'NOSSA', CONS: 'CONSELHEIRO', BAR: 'BARAO', EMB: 'EMBAIXADOR',
  PREF: 'PREFEITO', REV: 'REVERENDO',
};

const TYPE_PREFIXES = new Set([
  'RUA', 'AVENIDA', 'ESTRADA', 'PRACA', 'TRAVESSA', 'ALAMEDA', 'LARGO',
  'RODOVIA', 'CAMINHO', 'LADEIRA', 'VILA', 'PARQUE', 'BECO', 'PASSAGEM',
  'VIADUTO', 'PONTE', 'TUNEL', 'PRAIA', 'JARDIM', 'CONDOMINIO', 'SERVIDAO',
  'BOULEVARD', 'ESCADA', 'ESCADARIA', 'MORRO', 'ILHA', 'CAIS',
]);

const STOPWORDS = new Set(['DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'A', 'O']);

function normalizeText(str?: string): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\bN\.?\s*SRA\.?\b/g, 'NOSSA SENHORA')
    .replace(/\bN\.?\s*S\.?\b/g, 'NOSSA SENHORA')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandStreetTokens(normStr: string): string {
  if (!normStr) return '';
  const tokens = normStr.split(' ').filter(Boolean);
  if (!tokens.length) return '';
  if (FIRST_TOKEN_ABBR[tokens[0]]) tokens[0] = FIRST_TOKEN_ABBR[tokens[0]];
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i > 0 && WORD_ABBR[t]) out.push(...WORD_ABBR[t].split(' '));
    else out.push(t);
  }
  return out.join(' ');
}

function buildStreetKeys(raw?: string) {
  const expanded = expandStreetTokens(normalizeText(raw));
  if (!expanded) return { full: '', core: '' };
  const tokens = expanded.split(' ');
  const noType = TYPE_PREFIXES.has(tokens[0]) ? tokens.slice(1) : tokens;
  const core = noType.filter((t) => !STOPWORDS.has(t)).join(' ') || expanded;
  return { full: expanded, core };
}

function normalizeBairro(raw?: string): string {
  return normalizeText(raw).replace(/\bJARDIM\b/g, 'JD').replace(/\bVILA\b/g, 'VL');
}

export function extractRioStreetAndNumber(rawAddr?: string, rawTitle?: string) {
  const candidates: string[] = [];
  if (rawAddr && String(rawAddr).trim().length >= 4) candidates.push(String(rawAddr));
  if (rawTitle && /(rua|avenida|av\.|estrada|estr\.|praça|praca|travessa|alameda|largo|rodovia|praia|caminho|ladeira)/i.test(rawTitle)) {
    candidates.push(String(rawTitle));
  }

  const parsedOptions: { street: string; numInt: number }[] = [];
  for (const cand of candidates) {
    const parenMatch = cand.match(/\(([^)]+)\)/);
    const cleaned = cand
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\bCONF\.?\s*ITBI.*$/i, '')
      .replace(/\bBAIRRO\s*:.*$/i, '')
      .replace(/\bCEP\s*:?[\s\d-]+/gi, '')
      .replace(/\bRio\s+de\s+Janeiro\s*[-/,]\s*RJ\b.*$/i, '')
      .trim();

    const numRegex = /(?:,\s*|\s+)(?:N[ºO°.]?\s*)(\d{1,5})\b|,\s*(\d{1,5})\b/i;
    const numM = cleaned.match(numRegex);
    let numInt = numM ? parseInt(numM[1] || numM[2], 10) : 0;

    let streetPart = numM && numM.index != null ? cleaned.slice(0, numM.index) : cleaned.split(',')[0];
    streetPart = streetPart
      .replace(/^(?:Pr[ée]dio\s+localizado\s+na|Apartamento\s+na|Casa\s+na|Im[óo]vel\s+na|Terreno\s+na|Sala\s+na|Loja\s+na)\s+/i, '')
      .replace(/[,\-]+$/g, '')
      .trim();

    if (!numInt) {
      const explicitN = cand.match(/\bN[ºO°.]\s*(\d{1,5})\b/i);
      if (explicitN) numInt = parseInt(explicitN[1], 10);
    }

    if (streetPart.length >= 3) parsedOptions.push({ street: streetPart, numInt });
    if (parenMatch?.[1] && parenMatch[1].length >= 5) {
      const altStreet = parenMatch[1].replace(/^ANTIG[AO]\s+/i, '').trim();
      if (altStreet.length >= 4) parsedOptions.push({ street: altStreet, numInt });
    }
  }
  return parsedOptions;
}

type StreetsIndex = {
  exactBairro: Record<string, string[]>;
  fullMap: Record<string, string[]>;
  coreBairro: Record<string, string[]>;
  coreMap: Record<string, string[]>;
  clMeta: Record<string, [string, string, number, number]>;
};

let cachedAuctionLocs: Record<string, RioIppResolution> | null = null;
let cachedStreetsIndex: StreetsIndex | null = null;
const doorShardCache = new Map<string, Record<string, [number, number, number, string, string][]>>();
const resolvedMemo = new Map<string, RioIppResolution | null>();

function memoSet(key: string, val: RioIppResolution | null) {
  if (resolvedMemo.size >= 16000) {
    const oldest = resolvedMemo.keys().next().value;
    if (oldest !== undefined) resolvedMemo.delete(oldest);
  }
  resolvedMemo.set(key, val);
}

export function releaseRioIppScratchCaches() {
  doorShardCache.clear();
  if (process.env.RENDER === 'true') {
    cachedStreetsIndex = null;
  }
}

function loadAuctionLocationsMap(): Record<string, RioIppResolution> {
  if (cachedAuctionLocs) return cachedAuctionLocs;
  try {
    if (fs.existsSync(AUCTION_LOCS_FILE)) {
      cachedAuctionLocs = JSON.parse(fs.readFileSync(AUCTION_LOCS_FILE, 'utf8'));
      return cachedAuctionLocs!;
    }
  } catch (err) {
    console.warn('[RioIPP] Falha ao carregar rio_auction_locations.json:', err);
  }
  cachedAuctionLocs = {};
  return cachedAuctionLocs;
}

function loadStreetsIndex(): StreetsIndex | null {
  if (cachedStreetsIndex) return cachedStreetsIndex;
  try {
    if (fs.existsSync(STREETS_FILE)) {
      const buf = zlib.gunzipSync(fs.readFileSync(STREETS_FILE));
      cachedStreetsIndex = JSON.parse(buf.toString('utf8'));
      return cachedStreetsIndex;
    }
  } catch (err) {
    console.warn('[RioIPP] Falha ao carregar streets.json.gz:', err);
  }
  return null;
}

function loadDoorsForCl(cl: string): [number, number, number, string, string][] {
  let h = 0;
  for (let i = 0; i < cl.length; i++) h = (h * 31 + cl.charCodeAt(i)) & 0xf;
  const key = h.toString(16);

  let shard = doorShardCache.get(key);
  if (!shard) {
    const file = path.join(SHARDS_DIR, `doors_${key}.json.gz`);
    if (!fs.existsSync(file)) return [];
    try {
      shard = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
      // Bound shard cache (~8MB/shard, smaller on Render 512MB) to avoid V8 OOM
      const maxShards = process.env.RENDER === 'true' ? 2 : 4;
      if (doorShardCache.size >= maxShards) {
        const oldestKey = doorShardCache.keys().next().value;
        if (oldestKey !== undefined) doorShardCache.delete(oldestKey);
      }
      doorShardCache.set(key, shard!);
    } catch {
      return [];
    }
  }
  return shard[cl] || [];
}

export function resolveRioIppLocation(params: {
  id?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  description?: string;
  title?: string;
}): RioIppResolution | null {
  const cityNorm = normalizeText(params.city);
  const stateNorm = normalizeText(params.state);
  if (cityNorm && !cityNorm.includes('RIO DE JANEIRO')) return null;
  if (!cityNorm && stateNorm && stateNorm !== 'RJ') return null;

  if (params.id) {
    const pre = loadAuctionLocationsMap()[params.id];
    if (pre && Number.isFinite(pre.lat) && Number.isFinite(pre.lng)) {
      return pre;
    }
  }

  const nb = normalizeBairro(params.neighborhood);
  const memoKey = params.id
    ? `id:${params.id}:${normalizeText(params.address)}:${nb}`
    : `addr:${cityNorm}:${nb}:${normalizeText(params.address)}:${normalizeText(params.title)}`;
  if (resolvedMemo.has(memoKey)) {
    return resolvedMemo.get(memoKey) ?? null;
  }

  const opts = extractRioStreetAndNumber(params.address, params.title || params.description);
  if (!opts.length) {
    memoSet(memoKey, null);
    return null;
  }

  const idx = loadStreetsIndex();
  if (!idx) return null;

  for (const opt of opts) {
    const { full, core } = buildStreetKeys(opt.street);
    const cls: string[] = [];
    const addAll = (arr?: string[]) => {
      if (!arr) return;
      for (const c of arr) if (!cls.includes(c)) cls.push(c);
    };
    if (nb) addAll(idx.exactBairro[`${full}|${nb}`]);
    if (nb) addAll(idx.coreBairro[`${core}|${nb}`]);
    if (!cls.length) {
      addAll(idx.fullMap[full]);
      if (!cls.length) addAll(idx.coreMap[core]);
    }
    if (!cls.length) continue;

    const numInt = opt.numInt;
    if (numInt > 0) {
      for (const cl of cls.slice(0, 6)) {
        const doors = loadDoorsForCl(cl);
        if (!doors.length) continue;
        // Exact search on sorted door tuples [np, lng, lat, clnp, lote]
        const exact = doors.find((d) => d[0] === numInt);
        const m = idx.clMeta[cl];
        if (exact) {
          const hit: RioIppResolution = {
            lng: exact[1],
            lat: exact[2],
            cl,
            clnp: exact[3],
            matchedStreet: m?.[0] || opt.street,
            matchedNumber: String(numInt),
            bairro: m?.[1] || params.neighborhood || '',
            method: 'ipp_exact_door',
          };
          memoSet(memoKey, hit);
          return hit;
        }

        const sameParity = doors.filter((d) => d[0] > 0 && d[0] % 2 === numInt % 2);
        const pool = sameParity.length >= 2 ? sameParity : doors.filter((d) => d[0] > 0);
        if (!pool.length) continue;

        let lo: typeof pool[0] | null = null;
        let hi: typeof pool[0] | null = null;
        let best = pool[0];
        let bestDiff = Math.abs(pool[0][0] - numInt);
        for (const d of pool) {
          const diff = Math.abs(d[0] - numInt);
          if (diff < bestDiff) { bestDiff = diff; best = d; }
          if (d[0] < numInt && (!lo || d[0] > lo[0])) lo = d;
          if (d[0] > numInt && (!hi || d[0] < hi[0])) hi = d;
        }
        let lng = best[1];
        let lat = best[2];
        let method = 'ipp_nearest_door';
        if (lo && hi && hi[0] > lo[0] && hi[0] - lo[0] <= 300) {
          const t = (numInt - lo[0]) / (hi[0] - lo[0]);
          lng = lo[1] + t * (hi[1] - lo[1]);
          lat = lo[2] + t * (hi[2] - lo[2]);
          method = 'ipp_interpolated_door';
        }
        const hit: RioIppResolution = {
          lng: Math.round(lng * 1e6) / 1e6,
          lat: Math.round(lat * 1e6) / 1e6,
          cl,
          clnp: `${cl}${String(numInt).padStart(5, '0')}`,
          matchedStreet: m?.[0] || opt.street,
          matchedNumber: String(numInt),
          bairro: m?.[1] || params.neighborhood || '',
          method,
        };
        memoSet(memoKey, hit);
        return hit;
      }
    }

    const cl0 = cls[0];
    const m = idx.clMeta[cl0];
    if (m && m[2] && m[3]) {
      const hit: RioIppResolution = {
        lng: m[2],
        lat: m[3],
        cl: cl0,
        matchedStreet: m[0] || opt.street,
        matchedNumber: '',
        bairro: m[1] || params.neighborhood || '',
        method: 'ipp_trecho_midpoint',
      };
      memoSet(memoKey, hit);
      return hit;
    }
  }

  memoSet(memoKey, null);
  return null;
}

export function getRioAuctionBuildingsFilePath(): string | null {
  return fs.existsSync(AUCTION_BUILDINGS_FILE) ? AUCTION_BUILDINGS_FILE : null;
}
