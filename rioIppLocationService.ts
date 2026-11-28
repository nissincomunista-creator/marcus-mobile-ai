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
  PREF: 'PREFEITO', REV: 'REVERENDO', CMTE: 'COMANDANTE', DESEMB: 'DESEMBARGADOR',
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

const NUM_WORDS_PT: Record<string, string> = {
  '1': 'PRIMEIRO', '1O': 'PRIMEIRO', '2': 'DOIS', '3': 'TRES', '4': 'QUATRO', '5': 'CINCO',
  '6': 'SEIS', '7': 'SETE', '8': 'OITO', '9': 'NOVE', '10': 'DEZ', '11': 'ONZE',
  '12': 'DOZE', '13': 'TREZE', '14': 'QUATORZE', '15': 'QUINZE', '16': 'DEZESSEIS',
  '17': 'DEZESSETE', '18': 'DEZOITO', '19': 'DEZENOVE', '20': 'VINTE', '21': 'VINTE UM',
  '22': 'VINTE DOIS', '23': 'VINTE TRES', '24': 'VINTE QUATRO', '25': 'VINTE CINCO',
  '26': 'VINTE SEIS', '27': 'VINTE SETE', '28': 'VINTE OITO', '29': 'VINTE NOVE',
  '30': 'TRINTA', '31': 'TRINTA UM',
};

const MONTHS_PT = new Set([
  'JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
]);

function expandStreetTokens(normStr: string): string {
  if (!normStr) return '';
  const tokens = normStr.split(' ').filter(Boolean);
  if (!tokens.length) return '';
  if (FIRST_TOKEN_ABBR[tokens[0]]) tokens[0] = FIRST_TOKEN_ABBR[tokens[0]];
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const nextIsMonth =
      (tokens[i + 1] && MONTHS_PT.has(tokens[i + 1])) ||
      (tokens[i + 1] === 'DE' && tokens[i + 2] && MONTHS_PT.has(tokens[i + 2]));
    if (nextIsMonth && NUM_WORDS_PT[t]) {
      out.push(...NUM_WORDS_PT[t].split(' '));
    } else if (i > 0 && WORD_ABBR[t]) {
      out.push(...WORD_ABBR[t].split(' '));
    } else {
      out.push(t);
    }
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

function phoneticStreetCore(core: string): string {
  return core
    .replace(/([A-Z])\1+/g, '$1')
    .replace(/PH/g, 'F')
    .replace(/[CT]H/g, (m) => (m === 'CH' ? 'X' : 'T'))
    .replace(/SH/g, 'X')
    .replace(/LH/g, 'L')
    .replace(/NH/g, 'N')
    .replace(/(?<![CLNX])H/g, '')
    .replace(/CK/g, 'K')
    .replace(/QU([EI])/g, 'K$1')
    .replace(/GU([EI])/g, 'G$1')
    .replace(/G([EIY])/g, 'J$1')
    .replace(/XC|SC(?=[EIY])|SS|C(?=[EIY])/g, 'S')
    .replace(/Z/g, 'S')
    .replace(/Y/g, 'I')
    .replace(/W/g, 'V')
    .replace(/([A-Z])\1+/g, '$1')
    .trim();
}

const BAIRRO_ALIASES: Record<string, string> = {
  'BRAZ DE PINA': 'BRAS DE PINA',
  'IMPERIAL DE SAO CRISTOVAO': 'SAO CRISTOVAO',
  'OSWALDO CRUZ': 'OSVALDO CRUZ',
  'CAVALCANTI': 'CAVALCANTE',
  'QUINTINO': 'QUINTINO BOCAIUVA',
  'JD GUANABARA': 'JARDIM GUANABARA',
  'JD AMERICA': 'JARDIM AMERICA',
  'JD BOTANICO': 'JARDIM BOTANICO',
  'JD CARIOCA': 'JARDIM CARIOCA',
  'JD SULACAP': 'JARDIM SULACAP',
  'FREGUESIA JACAREPAGUA': 'FREGUESIA',
  'FRE DE JACAREPAGUA': 'FREGUESIA',
  'FREGUESIA JPA': 'FREGUESIA',
  'FREGUESIA ILHA DO GOVERNADOR': 'FREGUESIA ILHA',
  'FREGUESIA DE SANTA C': 'SANTA CRUZ',
  'FRE DE CAMPO GRANDE': 'CAMPO GRANDE',
  'VILA VALQUEIRE': 'VL VALQUEIRE',
  'VL KOSMOS': 'VILA KOSMOS',
  'VILA DA PENHA': 'VL DA PENHA',
};

function normalizeBairro(raw?: string): string {
  const norm = normalizeText(raw).replace(/\bZ\b/g, 'S');
  if (BAIRRO_ALIASES[norm]) return BAIRRO_ALIASES[norm];
  return norm.replace(/\bJARDIM\b/g, 'JD').replace(/\bVILA\b/g, 'VL');
}

export function extractRioStreetAndNumber(rawAddr?: string, rawTitle?: string) {
  const candidates: string[] = [];
  if (rawAddr && String(rawAddr).trim().length >= 4) candidates.push(String(rawAddr));
  if (rawTitle && /(rua|avenida|av\.|estrada|estr\.|praça|praca|travessa|alameda|largo|rodovia|praia|caminho|ladeira)/i.test(rawTitle)) {
    candidates.push(String(rawTitle));
  }

  const parsedOptions: { street: string; numInt: number }[] = [];
  const seenOpts = new Set<string>();
  const pushOption = (street: string, numInt: number) => {
    const cleanS = street.replace(/,\s*n[ºo°.]?\s*$/i, '').replace(/[-–,\s]+$/, '').trim();
    if (cleanS.length < 3) return;
    const key = `${cleanS.toUpperCase()}|${numInt}`;
    if (seenOpts.has(key)) return;
    seenOpts.add(key);
    parsedOptions.push({ street: cleanS, numInt });
  };

  for (const cand of candidates) {
    const parenMatch = cand.match(/\(([^)]+)\)/);
    const cleaned = cand
      .replace(/\([^)]*\)/g, ' ')
      .replace(/([A-Za-zÀ-ú]{4,})[ée]dio\b/gi, '$1')
      .replace(/\bCONF\.?\s*ITBI.*$/i, '')
      .replace(/\bBAIRRO\s*:.*$/i, '')
      .replace(/\bCEP\s*:?[\s\d-]+/gi, '')
      .replace(/\bRio\s+de\s+Janeiro\s*[-/,]\s*RJ\b.*$/i, '')
      .replace(/\s*-\s*-\s*/g, ' - ')
      .replace(/\s*-\s*LADO\s+(?:PAR|IMPAR)\b/gi, '')
      .trim();

    const numRegex = /(?:,\s*|\s+)(?:N[ºO°.]?\s*:?\s*)(\d{1,5})\b|,\s*(\d{1,5})\b|\s+(\d{1,5})(?=\s*(?:,|APTO|APT|BL|CASA|SALA|LOJA|TERRENO|$))/i;
    const numM = cleaned.match(numRegex);
    let numInt = numM ? parseInt(numM[1] || numM[2] || numM[3], 10) : 0;

    let streetPart = numM && numM.index != null ? cleaned.slice(0, numM.index) : cleaned.split(',')[0];
    streetPart = streetPart
      .replace(/^(?:Pr[ée]dio\s+(?:comercial\s+)?(?:localizado|situado)\s+na|Apartamento\s+na|Casa\s+na|Im[óo]vel\s+na|Terreno\s+na|Sala\s+na|Loja\s+na)\s+/i, '')
      .replace(/\b(?:LT|LOTE|QD|QUADRA|BL|BLOCO)\s*[\d\/\w-]*$/i, '')
      .replace(/,\s*n[ºo°.]?\s*$/i, '')
      .replace(/[,\-]+$/g, '')
      .trim();

    if (!numInt) {
      const explicitN = cand.match(/\bN[ºO°.]\s*:?\s*(\d{1,5})\b/i);
      if (explicitN) numInt = parseInt(explicitN[1], 10);
    }

    // Se há prefixo de edifício/bairro ("Avenida Central, situado na Avenida Rio Branco", "PRAÇA SECA // RUA FRANCISCO")
    const nestedStreet = streetPart.match(/(?:situad[oa]\s+n[ao]|localizad[oa]\s+n[ao]|\/\/)\s+(.+)$/i);
    if (nestedStreet?.[1]) {
      pushOption(nestedStreet[1], numInt);
    }

    // Se há "ANTIGA RUA ...", tentar primeiro o nome atual e depois o antigo
    const antigaIdx = streetPart.search(/\bANTIG[AO]\s+/i);
    if (antigaIdx > 4) {
      pushOption(streetPart.slice(0, antigaIdx), numInt);
      pushOption(streetPart.slice(antigaIdx).replace(/^ANTIG[AO]\s+/i, ''), numInt);
    }

    pushOption(streetPart, numInt);

    // Fallback para logradouro explícito no texto completo ("Sala 822 ... Av. Rio Branco, 156")
    const embeddedMatch = cleaned.match(/\b((?:Rua|Avenida|Av\.?|Estrada|Estr\.?|Travessa|Praça|Praca|Largo|Alameda|Rodovia|Praia)\s+[A-Za-zÀ-ú0-9'\.\-\s]{3,55})(?:,\s*n?[ºo°.]?\s*(\d{1,5}))?/i);
    if (embeddedMatch?.[1]) {
      const embNum = embeddedMatch[2] ? parseInt(embeddedMatch[2], 10) : numInt;
      pushOption(embeddedMatch[1], embNum);
    }

    if (parenMatch?.[1] && parenMatch[1].length >= 5) {
      const altStreet = parenMatch[1].replace(/^ANTIG[AO]\s+/i, '').trim();
      if (altStreet.length >= 4) pushOption(altStreet, numInt);
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

type FuzzyEntry = {
  core: string;
  phon: string;
  tokens: string[];
  cls: string[];
};

type FuzzyIndex = {
  phoneticGlobal: Map<string, string[]>;
  phoneticBairro: Map<string, string[]>;
  byBairro: Map<string, FuzzyEntry[]>;
  globalByBucket: Map<string, FuzzyEntry[]>;
};

let cachedAuctionLocs: Record<string, RioIppResolution> | null = null;
let cachedStreetsIndex: StreetsIndex | null = null;
let cachedFuzzyIndex: FuzzyIndex | null = null;
const doorShardCache = new Map<string, Record<string, [number, number, number, string, string][]>>();
const resolvedMemo = new Map<string, RioIppResolution | null>();

function memoSet(key: string, val: RioIppResolution | null) {
  if (resolvedMemo.size >= 16000) {
    const oldest = resolvedMemo.keys().next().value;
    if (oldest !== undefined) resolvedMemo.delete(oldest);
  }
  resolvedMemo.set(key, val);
}

export function clearRioIppMemo() {
  resolvedMemo.clear();
}

export function releaseRioIppScratchCaches() {
  doorShardCache.clear();
  cachedFuzzyIndex = null;
  if (process.env.RENDER === 'true') {
    cachedStreetsIndex = null;
  }
}

const dpPrev = new Int32Array(256);
const dpCurr = new Int32Array(256);
const dpPrev2 = new Int32Array(256);

function damerauLevenshtein(a: string, b: string, maxDist = 2): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (a === b) return 0;
  if (la >= 250 || lb >= 250) return maxDist + 1;
  for (let j = 0; j <= lb; j++) dpPrev[j] = j;
  for (let i = 1; i <= la; i++) {
    dpCurr[0] = i;
    let rowMin = maxDist + 1;
    const ai = a.charCodeAt(i - 1);
    const aiPrev = i > 1 ? a.charCodeAt(i - 2) : -1;
    for (let j = 1; j <= lb; j++) {
      const bj = b.charCodeAt(j - 1);
      const cost = ai === bj ? 0 : 1;
      let val = dpPrev[j] + 1;
      const ins = dpCurr[j - 1] + 1;
      if (ins < val) val = ins;
      const sub = dpPrev[j - 1] + cost;
      if (sub < val) val = sub;
      if (i > 1 && j > 1 && ai === b.charCodeAt(j - 2) && aiPrev === bj) {
        const trans = dpPrev2[j - 2] + 1;
        if (trans < val) val = trans;
      }
      dpCurr[j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
    for (let j = 0; j <= lb; j++) {
      dpPrev2[j] = dpPrev[j];
      dpPrev[j] = dpCurr[j];
    }
  }
  return dpPrev[lb];
}

function getFuzzyIndex(idx: StreetsIndex): FuzzyIndex {
  if (cachedFuzzyIndex) return cachedFuzzyIndex;
  const phoneticGlobal = new Map<string, string[]>();
  const phoneticBairro = new Map<string, string[]>();
  const byBairro = new Map<string, FuzzyEntry[]>();
  const globalByBucket = new Map<string, FuzzyEntry[]>();

  for (const [coreKey, cls] of Object.entries(idx.coreMap)) {
    if (!coreKey || !cls.length) continue;
    const phon = phoneticStreetCore(coreKey);
    if (phon) {
      const prev = phoneticGlobal.get(phon);
      if (prev) {
        for (const c of cls) if (!prev.includes(c)) prev.push(c);
      } else {
        phoneticGlobal.set(phon, [...cls]);
      }
    }
    const entry: FuzzyEntry = { core: coreKey, phon, tokens: coreKey.split(' '), cls };
    const b1 = coreKey[0];
    const list1 = globalByBucket.get(b1) || [];
    list1.push(entry);
    globalByBucket.set(b1, list1);
    if (phon && phon[0] !== b1) {
      const list2 = globalByBucket.get(phon[0]) || [];
      list2.push(entry);
      globalByBucket.set(phon[0], list2);
    }
  }

  for (const [compositeKey, cls] of Object.entries(idx.coreBairro)) {
    const sep = compositeKey.lastIndexOf('|');
    if (sep <= 0) continue;
    const cKey = compositeKey.slice(0, sep);
    const bKey = compositeKey.slice(sep + 1);
    const phon = phoneticStreetCore(cKey);
    if (phon) {
      const pk = `${phon}|${bKey}`;
      const prev = phoneticBairro.get(pk);
      if (prev) {
        for (const c of cls) if (!prev.includes(c)) prev.push(c);
      } else {
        phoneticBairro.set(pk, [...cls]);
      }
    }
    const list = byBairro.get(bKey) || [];
    list.push({ core: cKey, phon, tokens: cKey.split(' '), cls });
    byBairro.set(bKey, list);
  }

  cachedFuzzyIndex = { phoneticGlobal, phoneticBairro, byBairro, globalByBucket };
  return cachedFuzzyIndex;
}

function findFuzzyStreetCls(core: string, nb: string, idx: StreetsIndex): string[] {
  if (!core || core.length < 4) return [];
  const fz = getFuzzyIndex(idx);
  const targetPhon = phoneticStreetCore(core);

  // 1. Correspondência fonética exata (mesmo bairro primeiro, depois cidade)
  if (nb && targetPhon) {
    const hitNb = fz.phoneticBairro.get(`${targetPhon}|${nb}`);
    if (hitNb?.length) return hitNb;
  }
  if (targetPhon.length >= 5) {
    const hitGlob = fz.phoneticGlobal.get(targetPhon);
    if (hitGlob?.length && hitGlob.length <= 6) return hitGlob;
  }

  // 2. Correção por distância de edição (Damerau-Levenshtein) e prefixo de tokens dentro do bairro
  const scanPool = (entries: FuzzyEntry[], strictSimilarity: number): string[] => {
    const qTokens = core.split(' ');
    const maxDist = core.length >= 9 ? 2 : 1;
    let bestScore = -1;
    let bestCls: string[] = [];

    for (const e of entries) {
      if (e.core.length < 4) continue;
      if (
        (core.length >= 5 && e.core.startsWith(core) && e.core.length <= core.length + 12) ||
        (qTokens.length === 1 && qTokens[0].length >= 5 && e.tokens[0] === qTokens[0]) ||
        (qTokens.length >= 2 && e.tokens.length === 1 && e.tokens[0].length >= 6 && qTokens[0] === e.tokens[0])
      ) {
        const sim = Math.min(core.length, e.core.length) / Math.max(core.length, e.core.length);
        const prefixScore = 0.75 + sim * 0.2;
        if (prefixScore > bestScore) {
          bestScore = prefixScore;
          bestCls = e.cls;
        }
      }

      if (Math.abs(core.length - e.core.length) > maxDist && (!targetPhon || Math.abs(targetPhon.length - e.phon.length) > maxDist)) {
        continue;
      }
      const dRaw = damerauLevenshtein(core, e.core, maxDist);
      const dPhon = targetPhon && e.phon ? damerauLevenshtein(targetPhon, e.phon, maxDist) : maxDist + 1;
      const dBest = Math.min(dRaw, dPhon);
      if (dBest <= maxDist) {
        const baseLen = Math.max(core.length, e.core.length);
        const sim = 1 - dBest / baseLen;
        if (sim >= strictSimilarity && sim > bestScore) {
          bestScore = sim;
          bestCls = e.cls;
        }
      }
    }
    return bestCls;
  };

  if (nb) {
    const nbEntries = fz.byBairro.get(nb);
    if (nbEntries?.length) {
      const nbHit = scanPool(nbEntries, 0.78);
      if (nbHit.length) return nbHit;
    }
  }

  // 3. Sem bairro válido ou rua escrita com erro: usa índice particionado pela letra inicial (~20x menor)
  if (core.length >= 5) {
    const bucket = fz.globalByBucket.get(core[0]) || [];
    const hit1 = scanPool(bucket, 0.84);
    if (hit1.length) return hit1;
    if (targetPhon && targetPhon[0] !== core[0]) {
      const bucket2 = fz.globalByBucket.get(targetPhon[0]) || [];
      return scanPool(bucket2, 0.84);
    }
  }
  return [];
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
      const maxShards = process.env.RENDER === 'true' ? 4 : 16;
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
}, options?: { preloadedOnly?: boolean }): RioIppResolution | null {
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
  if (options?.preloadedOnly) {
    return null;
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
    const desiredType = full.split(' ')[0];
    if (nb) addAll(idx.exactBairro[`${full}|${nb}`]);
    if (nb) addAll(idx.coreBairro[`${core}|${nb}`]);
    if (!cls.length) {
      addAll(idx.fullMap[full]);
      if (!cls.length) {
        const coreHits = (idx.coreMap[core] || []).filter((c) => {
          const candType = normalizeText(idx.clMeta[c]?.[0]).split(' ')[0];
          if ((desiredType === 'ESTRADA' || desiredType === 'RODOVIA') && candType === 'PRACA') return false;
          if (desiredType === 'PRACA' && (candType === 'ESTRADA' || candType === 'RODOVIA')) return false;
          return true;
        });
        addAll(coreHits);
      }
    }
    if (!cls.length) {
      const fuzzyHits = findFuzzyStreetCls(core, nb, idx).filter((c) => {
        if (nb && normalizeBairro(idx.clMeta[c]?.[1]) === nb) return true;
        const candType = normalizeText(idx.clMeta[c]?.[0]).split(' ')[0];
        if ((desiredType === 'ESTRADA' || desiredType === 'RODOVIA') && candType === 'PRACA') return false;
        if (desiredType === 'PRACA' && (candType === 'ESTRADA' || candType === 'RODOVIA')) return false;
        return true;
      });
      addAll(fuzzyHits);
    }
    if (!cls.length) continue;

    // Prioriza logradouros do mesmo tipo (ex.: AVENIDA vs RUA) e mesmo bairro
    if (cls.length > 1 && TYPE_PREFIXES.has(desiredType)) {
      cls.sort((a, b) => {
        const ma = idx.clMeta[a];
        const mb = idx.clMeta[b];
        const aType = normalizeText(ma?.[0]).split(' ')[0] === desiredType ? 1 : 0;
        const bType = normalizeText(mb?.[0]).split(' ')[0] === desiredType ? 1 : 0;
        if (aType !== bType) return bType - aType;
        if (nb) {
          const aNb = normalizeBairro(ma?.[1]) === nb ? 1 : 0;
          const bNb = normalizeBairro(mb?.[1]) === nb ? 1 : 0;
          if (aNb !== bNb) return bNb - aNb;
        }
        return 0;
      });
    }

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
