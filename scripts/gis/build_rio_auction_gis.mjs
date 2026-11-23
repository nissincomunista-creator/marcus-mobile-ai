import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';
import RBush from 'rbush';

const GIS_DIR = path.resolve('data/gis/rio_itbi_map');
const RAW_DIR = path.join(GIS_DIR, 'raw');
const GRID_DIR = path.join(GIS_DIR, 'grid');
const SHARDS_DIR = path.join(GIS_DIR, 'ipp_shards');
const TRECHOS_FILE = path.join(RAW_DIR, 'trechos_logradouros.ndjson');
const PORTAS_FILE = path.join(RAW_DIR, 'numeros_porta.ndjson');
const DATA_STORE_FILE = path.resolve('data_store.json');
const ITBI_STORE_FILE = path.resolve('itbi_store.json.gz');

const AUCTION_LOCATIONS_OUT = path.join(GIS_DIR, 'rio_auction_locations.json');
const AUCTION_BUILDINGS_OUT = path.join(GIS_DIR, 'rio_auction_buildings.geojson');
const STREETS_INDEX_OUT = path.join(SHARDS_DIR, 'streets.json.gz');

const FIRST_TOKEN_ABBR = {
  R: 'RUA', AV: 'AVENIDA', AVN: 'AVENIDA', AVDA: 'AVENIDA',
  EST: 'ESTRADA', ESTR: 'ESTRADA', PC: 'PRACA', PCA: 'PRACA', PR: 'PRACA',
  TV: 'TRAVESSA', TRV: 'TRAVESSA', TRAV: 'TRAVESSA', AL: 'ALAMEDA',
  LG: 'LARGO', LGO: 'LARGO', ROD: 'RODOVIA', CAM: 'CAMINHO',
  LAD: 'LADEIRA', VL: 'VILA', PQ: 'PARQUE', BCO: 'BECO',
  PAS: 'PASSAGEM', VIAD: 'VIADUTO', PTE: 'PONTE', TUN: 'TUNEL',
  PRQ: 'PARQUE', JD: 'JARDIM', SERV: 'SERVIDAO', BLV: 'BOULEVARD',
};

const WORD_ABBR = {
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

function normalizeText(str) {
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

function expandStreetTokens(normStr) {
  if (!normStr) return '';
  const tokens = normStr.split(' ').filter(Boolean);
  if (!tokens.length) return '';
  if (FIRST_TOKEN_ABBR[tokens[0]]) tokens[0] = FIRST_TOKEN_ABBR[tokens[0]];
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i > 0 && WORD_ABBR[t]) out.push(...WORD_ABBR[t].split(' '));
    else out.push(t);
  }
  return out.join(' ');
}

function buildStreetKeys(raw) {
  const expanded = expandStreetTokens(normalizeText(raw));
  if (!expanded) return { full: '', core: '' };
  const tokens = expanded.split(' ');
  const noType = TYPE_PREFIXES.has(tokens[0]) ? tokens.slice(1) : tokens;
  const core = noType.filter((t) => !STOPWORDS.has(t)).join(' ') || expanded;
  return { full: expanded, core };
}

function normalizeBairro(raw) {
  return normalizeText(raw).replace(/\bJARDIM\b/g, 'JD').replace(/\bVILA\b/g, 'VL');
}

export function extractAuctionStreetAndNumber(rawAddr, rawTitle) {
  const candidates = [];
  if (rawAddr && String(rawAddr).trim().length >= 4) candidates.push(String(rawAddr));
  if (rawTitle && /(rua|avenida|av\.|estrada|estr\.|praça|praca|travessa|alameda|largo|rodovia|praia|caminho|ladeira)/i.test(rawTitle)) {
    candidates.push(String(rawTitle));
  }

  const parsedOptions = [];
  for (const cand of candidates) {
    // Capture parenthetical alternative street (e.g. "(ANTIGA RUA PROJETADA 2)") as secondary option
    const parenMatch = cand.match(/\(([^)]+)\)/);
    const cleaned = cand
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\bCONF\.?\s*ITBI.*$/i, '')
      .replace(/\bBAIRRO\s*:.*$/i, '')
      .replace(/\bCEP\s*:?[\s\d-]+/gi, '')
      .replace(/\bRio\s+de\s+Janeiro\s*[-/,]\s*RJ\b.*$/i, '')
      .trim();

    // Extract number pattern: ", nº 17" | ", N. 285" | ", 4319" | "nº 17"
    const numRegex = /(?:,\s*|\s+)(?:N[ºO°.]?\s*)(\d{1,5})\b|,\s*(\d{1,5})\b/i;
    const numM = cleaned.match(numRegex);
    let numInt = numM ? parseInt(numM[1] || numM[2], 10) : 0;

    let streetPart = cleaned;
    if (numM && numM.index != null) {
      streetPart = cleaned.slice(0, numM.index);
    } else {
      streetPart = cleaned.split(',')[0];
    }
    streetPart = streetPart
      .replace(/^(?:Pr[ée]dio\s+localizado\s+na|Apartamento\s+na|Casa\s+na|Im[óo]vel\s+na|Terreno\s+na|Sala\s+na|Loja\s+na)\s+/i, '')
      .replace(/[,\-]+$/g, '')
      .trim();

    if (!numInt) {
      const explicitN = cand.match(/\bN[ºO°.]\s*(\d{1,5})\b/i);
      if (explicitN) numInt = parseInt(explicitN[1], 10);
    }

    if (streetPart.length >= 3) {
      parsedOptions.push({ street: streetPart, numInt });
    }
    if (parenMatch?.[1] && parenMatch[1].length >= 5) {
      const altStreet = parenMatch[1].replace(/^ANTIG[AO]\s+/i, '').trim();
      if (altStreet.length >= 4) parsedOptions.push({ street: altStreet, numInt });
    }
  }
  return parsedOptions;
}

async function readNdjson(filePath, onRow) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    await onRow(JSON.parse(line));
  }
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-18) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonGeometry(lng, lat, isMulti, coords) {
  const polys = isMulti ? coords : [coords];
  for (const poly of polys) {
    if (!poly?.length || !pointInRing(lng, lat, poly[0])) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) {
      if (pointInRing(lng, lat, poly[h])) { inHole = true; break; }
    }
    if (!inHole) return true;
  }
  return false;
}

function pointToSegmentDistMeters(px, py, ax, ay, bx, by, cosLat) {
  const mx = px * 111320 * cosLat, my = py * 110540;
  const amx = ax * 111320 * cosLat, amy = ay * 110540;
  const bmx = bx * 111320 * cosLat, bmy = by * 110540;
  const vx = bmx - amx, vy = bmy - amy;
  const wx = mx - amx, wy = my - amy;
  const lenSq = vx * vx + vy * vy;
  let t = lenSq > 0 ? (wx * vx + wy * vy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(mx - (amx + t * vx), my - (amy + t * vy));
}

function pointToPolygonDistMeters(lng, lat, isMulti, coords) {
  if (pointInPolygonGeometry(lng, lat, isMulti, coords)) return 0;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const polys = isMulti ? coords : [coords];
  let best = Infinity;
  for (const poly of polys) {
    const outer = poly?.[0];
    if (!outer || outer.length < 2) continue;
    for (let i = 0; i < outer.length - 1; i++) {
      const d = pointToSegmentDistMeters(lng, lat, outer[i][0], outer[i][1], outer[i + 1][0], outer[i + 1][1], cosLat);
      if (d < best) best = d;
      if (best <= 0.5) return best;
    }
  }
  return best;
}

async function main() {
  const t0 = Date.now();
  fs.mkdirSync(SHARDS_DIR, { recursive: true });

  console.log('[AuctionGIS 1/4] Indexando Trechos_Logradouros...');
  const exactBairro = new Map();
  const fullMap = new Map();
  const coreBairro = new Map();
  const coreMap = new Map();
  const clMeta = new Map(); // cl -> { label, bairro, pts: [[lng, lat], ...] }

  const addSet = (map, k, v) => {
    if (!k) return;
    let s = map.get(k);
    if (!s) { s = new Set(); map.set(k, s); }
    s.add(v);
  };

  await readNdjson(TRECHOS_FILE, (row) => {
    const cl = row.cl;
    if (!cl) return;
    const rawName = row.completo || `${row.tipo_ext || ''} ${row.nobreza || ''} ${row.prep || ''} ${row.nome || ''}`.trim();
    const { full, core } = buildStreetKeys(rawName);
    const nb = normalizeBairro(row.bairro || '');

    addSet(exactBairro, `${full}|${nb}`, cl);
    addSet(fullMap, full, cl);
    addSet(coreBairro, `${core}|${nb}`, cl);
    addSet(coreMap, core, cl);

    if (row.nome) {
      const k2 = buildStreetKeys(`${row.tipo_ext || ''} ${row.nome}`);
      addSet(exactBairro, `${k2.full}|${nb}`, cl);
      addSet(coreBairro, `${k2.core}|${nb}`, cl);
    }

    let meta = clMeta.get(cl);
    if (!meta) {
      meta = { label: rawName, bairro: row.bairro || '', sumLng: 0, sumLat: 0, n: 0 };
      clMeta.set(cl, meta);
    }
    if (Number.isFinite(row.lng) && Number.isFinite(row.lat) && row.lng !== 0) {
      meta.sumLng += row.lng;
      meta.sumLat += row.lat;
      meta.n++;
    }
  });

  console.log('[AuctionGIS 2/4] Carregando Números de Porta e gerando shards de busca...');
  // Group doors by cl -> sorted array of { np, lng, lat, clnp, lote }
  const clDoors = new Map();
  const clnpToDoor = new Map();
  await readNdjson(PORTAS_FILE, (arr) => {
    const [, lng, lat, cl, npInt, clnp, codLote] = arr;
    if (!cl) return;
    const rec = { np: npInt, lng, lat, clnp, lote: codLote };
    if (clnp && !clnpToDoor.has(clnp)) clnpToDoor.set(clnp, rec);
    let list = clDoors.get(cl);
    if (!list) { list = []; clDoors.set(cl, list); }
    list.push(rec);
  });

  // Sort each cl's door list by np ascending for fast binary/interpolation lookup
  for (const list of clDoors.values()) {
    list.sort((a, b) => a.np - b.np);
  }

  // Write compact streets index + 16 door shards so backend server can resolve any Rio street dynamically with tiny RAM
  const streetsObj = {
    exactBairro: Object.fromEntries(Array.from(exactBairro.entries()).map(([k, s]) => [k, Array.from(s)])),
    fullMap: Object.fromEntries(Array.from(fullMap.entries()).map(([k, s]) => [k, Array.from(s)])),
    coreBairro: Object.fromEntries(Array.from(coreBairro.entries()).map(([k, s]) => [k, Array.from(s)])),
    coreMap: Object.fromEntries(Array.from(coreMap.entries()).map(([k, s]) => [k, Array.from(s)])),
    clMeta: Object.fromEntries(
      Array.from(clMeta.entries()).map(([cl, m]) => [
        cl,
        [m.label, m.bairro, m.n > 0 ? Math.round((m.sumLng / m.n) * 1e6) / 1e6 : 0, m.n > 0 ? Math.round((m.sumLat / m.n) * 1e6) / 1e6 : 0],
      ])
    ),
  };
  fs.writeFileSync(STREETS_INDEX_OUT, zlib.gzipSync(JSON.stringify(streetsObj), { level: 9 }));

  const shardBuckets = Array.from({ length: 16 }, () => ({}));
  for (const [cl, list] of clDoors.entries()) {
    let h = 0;
    for (let i = 0; i < cl.length; i++) h = (h * 31 + cl.charCodeAt(i)) & 0xf;
    // Compact tuple: [np, lng, lat, clnp, lote]
    shardBuckets[h][cl] = list.map((d) => [d.np, d.lng, d.lat, d.clnp, d.lote]);
  }
  for (let i = 0; i < 16; i++) {
    fs.writeFileSync(path.join(SHARDS_DIR, `doors_${i.toString(16)}.json.gz`), zlib.gzipSync(JSON.stringify(shardBuckets[i]), { level: 9 }));
  }
  console.log(`[AuctionGIS 2/4] Shards IPP salvos em ${SHARDS_DIR} (${clDoors.size} logradouros com portas).`);

  function resolveRioAddress(rawAddr, rawNeighborhood, rawTitle) {
    const opts = extractAuctionStreetAndNumber(rawAddr, rawTitle);
    const nb = normalizeBairro(rawNeighborhood || '');

    for (const opt of opts) {
      const { full, core } = buildStreetKeys(opt.street);
      const cls = [];
      const addAll = (s) => {
        if (!s) return;
        for (const c of s) if (!cls.includes(c)) cls.push(c);
      };
      if (nb) addAll(exactBairro.get(`${full}|${nb}`));
      if (nb) addAll(coreBairro.get(`${core}|${nb}`));
      if (!cls.length) {
        addAll(fullMap.get(full));
        if (!cls.length) addAll(coreMap.get(core));
      }
      if (!cls.length) continue;

      const numInt = opt.numInt;
      if (numInt > 0) {
        // 1. Exact door match
        for (const cl of cls) {
          const clnp = `${cl}${String(numInt).padStart(5, '0')}`;
          const exact = clnpToDoor.get(clnp);
          if (exact) {
            const m = clMeta.get(cl);
            return {
              lng: exact.lng,
              lat: exact.lat,
              cl,
              clnp: exact.clnp,
              cod_lote: exact.lote,
              matchedStreet: m?.label || opt.street,
              matchedNumber: String(numInt),
              bairro: m?.bairro || rawNeighborhood || '',
              method: 'ipp_exact_door',
            };
          }
        }
        // 2. Same parity bracketing interpolation or nearest door within same street (cl)
        for (const cl of cls) {
          const doors = clDoors.get(cl);
          if (!doors || !doors.length) continue;
          const sameParity = doors.filter((d) => d.np > 0 && d.np % 2 === numInt % 2);
          const pool = sameParity.length >= 2 ? sameParity : doors.filter((d) => d.np > 0);
          if (!pool.length) continue;

          let lo = null, hi = null, best = pool[0], bestDiff = Math.abs(pool[0].np - numInt);
          for (const d of pool) {
            const diff = Math.abs(d.np - numInt);
            if (diff < bestDiff) { bestDiff = diff; best = d; }
            if (d.np < numInt && (!lo || d.np > lo.np)) lo = d;
            if (d.np > numInt && (!hi || d.np < hi.np)) hi = d;
          }
          let lng = best.lng, lat = best.lat, method = 'ipp_nearest_door';
          if (lo && hi && hi.np > lo.np && hi.np - lo.np <= 300) {
            const t = (numInt - lo.np) / (hi.np - lo.np);
            lng = lo.lng + t * (hi.lng - lo.lng);
            lat = lo.lat + t * (hi.lat - lo.lat);
            method = 'ipp_interpolated_door';
          }
          const m = clMeta.get(cl);
          return {
            lng: Math.round(lng * 1e6) / 1e6,
            lat: Math.round(lat * 1e6) / 1e6,
            cl,
            clnp: `${cl}${String(numInt).padStart(5, '0')}`,
            cod_lote: best.lote || '',
            matchedStreet: m?.label || opt.street,
            matchedNumber: String(numInt),
            bairro: m?.bairro || rawNeighborhood || '',
            method,
          };
        }
      }

      // 3. No door number in edital (or street lacks doors) -> street midpoint from Trechos (never neighborhood centroid!)
      const cl0 = cls[0];
      const m = clMeta.get(cl0);
      const doors = clDoors.get(cl0);
      if (doors && doors.length) {
        const mid = doors[Math.floor(doors.length / 2)];
        return {
          lng: mid.lng,
          lat: mid.lat,
          cl: cl0,
          clnp: '',
          cod_lote: mid.lote || '',
          matchedStreet: m?.label || opt.street,
          matchedNumber: '',
          bairro: m?.bairro || rawNeighborhood || '',
          method: 'ipp_street_axis',
        };
      }
      if (m && m.n > 0) {
        return {
          lng: Math.round((m.sumLng / m.n) * 1e6) / 1e6,
          lat: Math.round((m.sumLat / m.n) * 1e6) / 1e6,
          cl: cl0,
          clnp: '',
          cod_lote: '',
          matchedStreet: m.label || opt.street,
          matchedNumber: '',
          bairro: m.bairro || rawNeighborhood || '',
          method: 'ipp_trecho_midpoint',
        };
      }
    }
    return null;
  }

  console.log('[AuctionGIS 3/4] Geocodificando imóveis do Rio em data_store.json + associando polígonos 3D...');
  const ds = JSON.parse(fs.readFileSync(DATA_STORE_FILE, 'utf8'));
  const rioAuctions = ds.auctions.filter((a) => (a.city || '').toLowerCase().includes('rio de janeiro'));
  const resolvedTargets = [];
  const methodCounts = {};

  for (const auc of rioAuctions) {
    const res = resolveRioAddress(auc.address, auc.neighborhood, auc.title);
    if (!res) continue;
    methodCounts[res.method] = (methodCounts[res.method] || 0) + 1;
    resolvedTargets.push({ auc, res, bestBld: null });
  }
  console.log(`[AuctionGIS 3/4] Resolvidos ${resolvedTargets.length}/${rioAuctions.length} imóveis do Rio via IPP:`, methodCounts);

  // Spatial join resolved auction targets against Edificacoes_2019 (<= 25m + clnp + cod_lote)
  const tree = new RBush();
  const clnpToTarget = new Map();
  const loteToTarget = new Map();
  const items = [];
  for (let i = 0; i < resolvedTargets.length; i++) {
    const t = resolvedTargets[i];
    items.push({ minX: t.res.lng, minY: t.res.lat, maxX: t.res.lng, maxY: t.res.lat, idx: i });
    if (t.res.clnp) {
      let arr = clnpToTarget.get(t.res.clnp);
      if (!arr) { arr = []; clnpToTarget.set(t.res.clnp, arr); }
      arr.push(i);
    }
    if (t.res.cod_lote) {
      let arr = loteToTarget.get(t.res.cod_lote);
      if (!arr) { arr = []; loteToTarget.set(t.res.cod_lote, arr); }
      arr.push(i);
    }
  }
  tree.load(items);

  const cellFiles = fs.readdirSync(GRID_DIR).filter((f) => f.endsWith('.ndjson')).sort();
  const PAD = 0.00058; // ~60m search window so setback houses & wide avenues match their 3D building polygon
  const matchedBuildingGeoms = new Map(); // oid -> { oid, h, isMulti, coords }

  for (const file of cellFiles) {
    await readNdjson(path.join(GRID_DIR, file), (b) => {
      const [oid, alturaRaw, , , clnp, codLote, area, bbox, isMulti, coords] = b;
      const candIdx = new Set();
      for (const hit of tree.search({ minX: bbox[0] - PAD, minY: bbox[1] - PAD, maxX: bbox[2] + PAD, maxY: bbox[3] + PAD })) {
        candIdx.add(hit.idx);
      }
      if (clnp && clnpToTarget.has(clnp)) for (const i of clnpToTarget.get(clnp)) candIdx.add(i);
      if (codLote && loteToTarget.has(codLote)) for (const i of loteToTarget.get(codLote)) candIdx.add(i);
      if (!candIdx.size) return;

      for (const i of candIdx) {
        const tgt = resolvedTargets[i];
        const exactClnp = Boolean(clnp && tgt.res.clnp && clnp === tgt.res.clnp);
        const exactLote = Boolean(codLote && tgt.res.cod_lote && codLote === tgt.res.cod_lote);
        const dist = pointToPolygonDistMeters(tgt.res.lng, tgt.res.lat, isMulti === 1, coords);

        let rank = 99;
        if (exactClnp && dist <= 90) rank = 0;
        else if (dist === 0) rank = 1;
        else if (exactLote && dist <= 45) rank = 2;
        else if (dist <= 22) rank = 3;
        else if (dist <= 55) rank = 4;
        else continue;

        const candH = Math.max(3.5, Math.round((Number(alturaRaw) || 6) * 10) / 10);
        const effRank = rank * 10 + ((area || 0) < 16 ? 1 : 0);
        const prev = tgt.bestBld;
        const prefersTallerTower =
          prev &&
          rank <= 1 &&
          prev.rank <= 1 &&
          dist <= 15 &&
          prev.dist <= 15 &&
          candH > prev.h + 2;
        if (
          !prev ||
          effRank < prev.effRank ||
          prefersTallerTower ||
          (effRank === prev.effRank &&
            !(candH < prev.h - 2 && Math.abs(dist - prev.dist) <= 15) &&
            (dist < prev.dist - 0.5 ||
              (Math.abs(dist - prev.dist) <= 0.5 && (candH > prev.h + 1 || (Math.abs(candH - prev.h) <= 1 && area > prev.area)))))
        ) {
          tgt.bestBld = { oid, rank, effRank, dist: Math.round(dist * 10) / 10, area: area || 0, h: candH, clnp };
          if (!matchedBuildingGeoms.has(oid)) {
            matchedBuildingGeoms.set(oid, { oid, h: tgt.bestBld.h, isMulti, coords, area: area || 0 });
          }
        }
      }
    });
  }

  // Filter matchedBuildingGeoms to ONLY final winning OIDs
  const usedOids = new Set();
  const locationsOut = {};
  for (const tgt of resolvedTargets) {
    const oid = tgt.bestBld?.oid;
    if (oid) usedOids.add(oid);
    locationsOut[tgt.auc.id] = {
      lat: tgt.res.lat,
      lng: tgt.res.lng,
      oid: oid || null,
      h: tgt.bestBld?.h || null,
      cl: tgt.res.cl,
      clnp: tgt.res.clnp,
      matchedStreet: tgt.res.matchedStreet,
      matchedNumber: tgt.res.matchedNumber,
      bairro: tgt.res.bairro,
      method: tgt.res.method,
    };
  }

  const buildingFeatures = [];
  for (const oid of usedOids) {
    const g = matchedBuildingGeoms.get(oid);
    if (!g) continue;
    buildingFeatures.push({
      type: 'Feature',
      id: oid,
      properties: { oid, h: g.h },
      geometry: { type: g.isMulti === 1 ? 'MultiPolygon' : 'Polygon', coordinates: g.coords },
    });
  }

  fs.writeFileSync(AUCTION_LOCATIONS_OUT, JSON.stringify(locationsOut));
  fs.writeFileSync(AUCTION_BUILDINGS_OUT, JSON.stringify({ type: 'FeatureCollection', features: buildingFeatures }));
  console.log(`[AuctionGIS 3/4] Prédios 3D vinculados a imóveis do Rio: ${usedOids.size} polígonos únicos -> ${AUCTION_BUILDINGS_OUT} (${(fs.statSync(AUCTION_BUILDINGS_OUT).size / 1024 / 1024).toFixed(2)} MB)`);

  // Step 4: Enrich ITBI Rio transactions in itbi_store.json.gz with exact IPP coordinates for accurate radius math
  console.log('[AuctionGIS 4/4] Enriquecendo coordenadas exatas do ITBI Rio em itbi_store.json.gz...');
  const itbiRaw = JSON.parse(zlib.gunzipSync(fs.readFileSync(ITBI_STORE_FILE)).toString('utf8'));
  const itbiArr = Array.isArray(itbiRaw) ? itbiRaw : (itbiRaw.transactions || []);
  let itbiUpdated = 0;
  for (const tx of itbiArr) {
    if (!(tx.city || '').toLowerCase().includes('rio de janeiro')) continue;
    const addrWithNum = tx.number ? `${tx.street || ''}, ${tx.number}` : (tx.street || '');
    const hit = resolveRioAddress(addrWithNum, tx.neighborhood, '');
    if (hit && hit.method === 'ipp_exact_door') {
      if (tx.transactionLocationPrecision !== 'exact_number' || Math.abs((tx.transactionLocationLat || 0) - hit.lat) > 0.00025) {
        tx.transactionLocationLat = hit.lat;
        tx.transactionLocationLng = hit.lng;
        tx.transactionLocationPrecision = 'exact_number';
        tx.transactionLocationSpreadMeters = 5;
        itbiUpdated++;
      }
    } else if (hit && !Number.isFinite(tx.transactionLocationLat) && hit.method === 'ipp_interpolated_door') {
      tx.transactionLocationLat = hit.lat;
      tx.transactionLocationLng = hit.lng;
      tx.transactionLocationPrecision = 'exact_number';
      tx.transactionLocationSpreadMeters = 12;
      itbiUpdated++;
    }
  }
  const newItbiPayload = Array.isArray(itbiRaw) ? itbiArr : { ...itbiRaw, transactions: itbiArr };
  fs.writeFileSync(ITBI_STORE_FILE, zlib.gzipSync(JSON.stringify(newItbiPayload), { level: 9 }));
  console.log(`[AuctionGIS 4/4] itbi_store.json.gz atualizado com +${itbiUpdated} coordenadas IPP exatas! Tempo total: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

main().catch((e) => {
  console.error('[AuctionGIS Error]', e);
  process.exit(1);
});
