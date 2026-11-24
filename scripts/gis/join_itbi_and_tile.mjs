import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';
import RBush from 'rbush';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import { StreamingPMTilesWriter, verifyPMTilesArchive } from './pmtiles_writer.mjs';

const GIS_DIR = path.resolve('data/gis/rio_itbi_map');
const RAW_DIR = path.join(GIS_DIR, 'raw');
const GRID_DIR = path.join(GIS_DIR, 'grid');
const Z12_DIR = path.join(RAW_DIR, 'z12');
const TILES_OUT_DIR = path.resolve('public/tiles');
const PMTILES_PATH = path.join(TILES_OUT_DIR, 'rio_edificacoes.pmtiles');
const MATCHED_GEOJSON_PATH = path.join(GIS_DIR, 'rio_itbi_matched_buildings.geojson');
const SUMMARY_JSON_PATH = path.join(GIS_DIR, 'rio_gis_summary.json');

const TRECHOS_FILE = path.join(RAW_DIR, 'trechos_logradouros.ndjson');
const PORTAS_FILE = path.join(RAW_DIR, 'numeros_porta.ndjson');
const MAP_ITBI_FILE = path.resolve('map_itbi_2019_2026.json.gz');
const ITBI_FILE = fs.existsSync(MAP_ITBI_FILE) ? MAP_ITBI_FILE : path.resolve('itbi_store.json.gz');

const FIRST_TOKEN_ABBR = {
  R: 'RUA',
  AV: 'AVENIDA',
  AVN: 'AVENIDA',
  AVDA: 'AVENIDA',
  EST: 'ESTRADA',
  ESTR: 'ESTRADA',
  PC: 'PRACA',
  PCA: 'PRACA',
  PR: 'PRACA',
  TV: 'TRAVESSA',
  TRV: 'TRAVESSA',
  TRAV: 'TRAVESSA',
  AL: 'ALAMEDA',
  ALM: 'ALAMEDA',
  LG: 'LARGO',
  LGO: 'LARGO',
  ROD: 'RODOVIA',
  CAM: 'CAMINHO',
  LAD: 'LADEIRA',
  VL: 'VILA',
  PQ: 'PARQUE',
  BCO: 'BECO',
  PAS: 'PASSAGEM',
  VIAD: 'VIADUTO',
  PTE: 'PONTE',
  TUN: 'TUNEL',
  PRQ: 'PARQUE',
  JARD: 'JARDIM',
  JD: 'JARDIM',
  COND: 'CONDOMINIO',
  LOT: 'LOTEAMENTO',
  SERV: 'SERVIDAO',
  BLV: 'BOULEVARD',
};

const WORD_ABBR = {
  STA: 'SANTA',
  STO: 'SANTO',
  DR: 'DOUTOR',
  DRA: 'DOUTORA',
  PROF: 'PROFESSOR',
  PROFA: 'PROFESSORA',
  PRES: 'PRESIDENTE',
  GEN: 'GENERAL',
  CEL: 'CORONEL',
  MAJ: 'MAJOR',
  CAP: 'CAPITAO',
  ALM: 'ALMIRANTE',
  BRIG: 'BRIGADEIRO',
  MAL: 'MARECHAL',
  DES: 'DESEMBARGADOR',
  SEN: 'SENADOR',
  GOV: 'GOVERNADOR',
  DEP: 'DEPUTADO',
  VER: 'VEREADOR',
  ENG: 'ENGENHEIRO',
  ARQ: 'ARQUITETO',
  PE: 'PADRE',
  MONS: 'MONSENHOR',
  VISC: 'VISCONDE',
  JORN: 'JORNALISTA',
  MIN: 'MINISTRO',
  TEN: 'TENENTE',
  SGT: 'SARGENTO',
  COM: 'COMENDADOR',
  SRA: 'SENHORA',
  SR: 'SENHOR',
  NSRA: 'NOSSA SENHORA',
  N: 'NOSSA',
  CONS: 'CONSELHEIRO',
  BAR: 'BARAO',
  EMB: 'EMBAIXADOR',
  PREF: 'PREFEITO',
  REV: 'REVERENDO',
  FREI: 'FREI',
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
  if (tokens.length === 0) return '';
  if (FIRST_TOKEN_ABBR[tokens[0]]) {
    tokens[0] = FIRST_TOKEN_ABBR[tokens[0]];
  }
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i > 0 && WORD_ABBR[t]) {
      out.push(...WORD_ABBR[t].split(' '));
    } else {
      out.push(t);
    }
  }
  return out.join(' ');
}

function buildStreetKeys(rawStreet) {
  const expanded = expandStreetTokens(normalizeText(rawStreet));
  if (!expanded) return { full: '', core: '' };
  const tokens = expanded.split(' ');
  const noType = TYPE_PREFIXES.has(tokens[0]) ? tokens.slice(1) : tokens;
  const core = noType.filter((t) => !STOPWORDS.has(t)).join(' ') || expanded;
  return { full: expanded, core };
}

function normalizeBairro(raw) {
  const n = normalizeText(raw)
    .replace(/\bJARDIM\b/g, 'JD')
    .replace(/\bVILA\b/g, 'VL');
  return n;
}

function parseDoorNumber(raw) {
  if (raw == null) return 0;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function calcMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) * 0.5;
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
    if (!poly || !poly.length) continue;
    if (!pointInRing(lng, lat, poly[0])) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) {
      if (pointInRing(lng, lat, poly[h])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

function pointToSegmentDistMeters(px, py, ax, ay, bx, by, cosLat) {
  const mx = px * 111320 * cosLat;
  const my = py * 110540;
  const amx = ax * 111320 * cosLat;
  const amy = ay * 110540;
  const bmx = bx * 111320 * cosLat;
  const bmy = by * 110540;
  const vx = bmx - amx;
  const vy = bmy - amy;
  const wx = mx - amx;
  const wy = my - amy;
  const lenSq = vx * vx + vy * vy;
  let t = lenSq > 0 ? (wx * vx + wy * vy) / lenSq : 0;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const dx = mx - (amx + t * vx);
  const dy = my - (amy + t * vy);
  return Math.hypot(dx, dy);
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

function lngLatToTile(lng, lat, z) {
  const n = 1 << z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return [x, y];
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

async function loadTrechosIndex() {
  console.log('[Join 1/5] Carregando Trechos_Logradouros...');
  const exactBairro = new Map();
  const fullMap = new Map();
  const coreBairro = new Map();
  const coreMap = new Map();
  const clMeta = new Map();

  const add = (map, key, val) => {
    if (!key) return;
    let s = map.get(key);
    if (!s) {
      s = new Set();
      map.set(key, s);
    }
    s.add(val);
  };

  let count = 0;
  await readNdjson(TRECHOS_FILE, (row) => {
    count++;
    const cl = row.cl;
    if (!cl) return;
    const rawName = row.completo || `${row.tipo_ext || ''} ${row.nobreza || ''} ${row.prep || ''} ${row.nome || ''}`.trim();
    const { full, core } = buildStreetKeys(rawName);
    const nb = normalizeBairro(row.bairro || '');

    add(exactBairro, `${full}|${nb}`, cl);
    add(fullMap, full, cl);
    add(coreBairro, `${core}|${nb}`, cl);
    add(coreMap, core, cl);

    if (row.nome) {
      const k2 = buildStreetKeys(`${row.tipo_ext || ''} ${row.nome}`);
      add(exactBairro, `${k2.full}|${nb}`, cl);
      add(coreBairro, `${k2.core}|${nb}`, cl);
    }

    if (!clMeta.has(cl)) {
      clMeta.set(cl, { label: rawName, bairro: row.bairro || '' });
    }
  });

  console.log(`[Join 1/5] Trechos carregados: ${count} segmentos, ${clMeta.size} logradouros (CL).`);
  return { exactBairro, fullMap, coreBairro, coreMap, clMeta };
}

async function loadPortasIndex() {
  console.log('[Join 2/5] Carregando Números de Porta...');
  const clnpToDoor = new Map();
  const clAndNpToDoor = new Map();
  const clnpToPav = new Map();

  let count = 0;
  await readNdjson(PORTAS_FILE, (arr) => {
    count++;
    const [, lng, lat, cl, npInt, clnp, codLote, numPav] = arr;
    const rec = { lng, lat, cl, npInt, clnp, cod_lote: codLote, num_pav: numPav };
    if (clnp && !clnpToDoor.has(clnp)) {
      clnpToDoor.set(clnp, rec);
    }
    if (cl && npInt > 0) {
      const k = `${cl}|${npInt}`;
      if (!clAndNpToDoor.has(k)) {
        clAndNpToDoor.set(k, rec);
      }
    }
    if (clnp && numPav > 0 && !clnpToPav.has(clnp)) {
      clnpToPav.set(clnp, numPav);
    }
  });

  console.log(`[Join 2/5] Portas carregadas: ${count} pontos, ${clnpToDoor.size} CLNP únicos.`);
  return { clnpToDoor, clAndNpToDoor, clnpToPav };
}

function resolveDoorForItbi(tx, trechosIdx, portasIdx) {
  const numInt = parseDoorNumber(tx.number);
  const { full, core } = buildStreetKeys(tx.street || '');
  const nb = normalizeBairro(tx.neighborhood || '');

  const candidateCls = [];
  const pushSet = (s) => {
    if (!s) return;
    for (const c of s) {
      if (!candidateCls.includes(c)) candidateCls.push(c);
    }
  };

  pushSet(trechosIdx.exactBairro.get(`${full}|${nb}`));
  pushSet(trechosIdx.coreBairro.get(`${core}|${nb}`));
  if (candidateCls.length === 0) {
    pushSet(trechosIdx.fullMap.get(full));
    if (candidateCls.length === 0) {
      pushSet(trechosIdx.coreMap.get(core));
    }
  }

  if (numInt > 0 && candidateCls.length > 0) {
    // Prefer CL that actually has an official Numero de Porta matching npInt
    for (const cl of candidateCls) {
      const clnp = `${cl}${String(numInt).padStart(5, '0')}`;
      const door = portasIdx.clnpToDoor.get(clnp) || portasIdx.clAndNpToDoor.get(`${cl}|${numInt}`);
      if (door) {
        return {
          method: 'ipp_clnp',
          lng: door.lng,
          lat: door.lat,
          clnp: door.clnp || clnp,
          cod_lote: door.cod_lote || '',
          label: `${trechosIdx.clMeta.get(cl)?.label || tx.street}, ${numInt}`,
          bairro: trechosIdx.clMeta.get(cl)?.bairro || tx.neighborhood || '',
        };
      }
    }
  }

  // Fallback to exact verified coordinates already inside ITBI store
  if (tx.transactionLocationPrecision === 'exact_number' && Number.isFinite(tx.transactionLocationLat) && Number.isFinite(tx.transactionLocationLng)) {
    const lat = Number(tx.transactionLocationLat);
    const lng = Number(tx.transactionLocationLng);
    if (lat >= -23.10 && lat <= -22.72 && lng >= -43.82 && lng <= -43.08) {
      return {
        method: 'itbi_exact_xy',
        lng,
        lat,
        clnp: candidateCls[0] && numInt > 0 ? `${candidateCls[0]}${String(numInt).padStart(5, '0')}` : '',
        cod_lote: '',
        label: numInt > 0 ? `${tx.street}, ${numInt}` : tx.street,
        bairro: tx.neighborhood || '',
      };
    }
  }

  return null;
}

function buildDoorGroupsFromItbi(trechosIdx, portasIdx) {
  console.log('[Join 3/5] Lendo itbi_store.json.gz e geocodificando via Trechos + Números de Porta...');
  const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(ITBI_FILE)).toString('utf8'));
  const allRows = Array.isArray(raw) ? raw : (raw.transactions || Object.values(raw).flat());
  const rioRows = allRows.filter((r) => (r.city || '').toLowerCase().includes('rio de janeiro'));

  // Compute neighborhood medians across recent Rio ITBI samples (>= 2024; fallback all years if missing)
  const bairroRecentSamples = new Map();
  const bairroAllSamples = new Map();
  let validValuesCount = 0;
  for (const r of rioRows) {
    const valSqm = Number(r.unitValueSqm);
    if (!Number.isFinite(valSqm) || valSqm < 400 || valSqm > 75000) continue;
    validValuesCount++;
    const nb = normalizeBairro(r.neighborhood || '');
    if (!nb) continue;
    const txYear = Number(String(r.date || '').slice(0, 4)) || 2025;
    if (txYear >= 2024) {
      let arrR = bairroRecentSamples.get(nb);
      if (!arrR) { arrR = []; bairroRecentSamples.set(nb, arrR); }
      arrR.push(valSqm);
    }
    let arrA = bairroAllSamples.get(nb);
    if (!arrA) { arrA = []; bairroAllSamples.set(nb, arrA); }
    arrA.push(valSqm);
  }

  const bairroMedians = new Map();
  for (const [nb, vals] of bairroAllSamples.entries()) {
    const rec = bairroRecentSamples.get(nb);
    bairroMedians.set(nb, calcMedian(rec && rec.length >= 5 ? rec : vals));
  }
  const cityMedianSqm = calcMedian(Array.from(bairroRecentSamples.size ? bairroRecentSamples.values() : bairroAllSamples.values()).flat());

  const doorGroupsMap = new Map();
  let matchedByIpp = 0;
  let matchedByExactXy = 0;
  let skippedInvalidValue = 0;
  let unmatchedAddress = 0;

  for (const tx of rioRows) {
    const valSqm = Number(tx.unitValueSqm);
    if (!Number.isFinite(valSqm) || valSqm < 400 || valSqm > 75000) {
      skippedInvalidValue++;
      continue;
    }

    const resolved = resolveDoorForItbi(tx, trechosIdx, portasIdx);
    if (!resolved) {
      unmatchedAddress++;
      continue;
    }
    if (resolved.method === 'ipp_clnp') matchedByIpp++;
    else matchedByExactXy++;

    const groupKey = resolved.clnp
      ? `clnp:${resolved.clnp}`
      : `xy:${resolved.lat.toFixed(6)},${resolved.lng.toFixed(6)}`;

    let grp = doorGroupsMap.get(groupKey);
    if (!grp) {
      grp = {
        key: groupKey,
        lng: resolved.lng,
        lat: resolved.lat,
        clnp: resolved.clnp,
        cod_lote: resolved.cod_lote,
        label: resolved.label,
        bairro: resolved.bairro,
        normBairro: normalizeBairro(resolved.bairro || tx.neighborhood || ''),
        values: [],
        recentValues: [],
        txCount: 0,
        bestMatch: null, // { cellKey, objectid, rank, dist, area }
      };
      doorGroupsMap.set(groupKey, grp);
    }
    const txYear = Number(String(tx.date || '').slice(0, 4)) || 2025;
    if (txYear >= 2024) grp.recentValues.push(valSqm);
    grp.values.push(valSqm);
    grp.txCount++;
  }

  const doorGroups = Array.from(doorGroupsMap.values());
  console.log(
    `[Join 3/5] Rio ITBI=${rioRows.length} | válidas=${validValuesCount} | matched_ipp_clnp=${matchedByIpp} | matched_xy=${matchedByExactXy} | sem_match=${unmatchedAddress} | grupos_porta_unicos=${doorGroups.length}`
  );

  return {
    doorGroups,
    bairroMedians,
    cityMedianSqm,
    stats: {
      rioTotalRows: rioRows.length,
      validValueRows: validValuesCount,
      skippedInvalidValue,
      matchedByIppClnp: matchedByIpp,
      matchedByExactXy,
      unmatchedAddress,
      uniqueDoorGroups: doorGroups.length,
    },
  };
}

async function spatialJoinBuildings(doorGroups) {
  console.log('[Join 4/5] Executando Spatial Join (<= 15m + CLNP/Lote) contra 2.35M Edificações 2019...');

  const doorTree = new RBush();
  const treeItems = [];
  const clnpToGroups = new Map();
  const codLoteToGroups = new Map();

  for (let i = 0; i < doorGroups.length; i++) {
    const g = doorGroups[i];
    treeItems.push({ minX: g.lng, minY: g.lat, maxX: g.lng, maxY: g.lat, idx: i });
    if (g.clnp) {
      let arr = clnpToGroups.get(g.clnp);
      if (!arr) { arr = []; clnpToGroups.set(g.clnp, arr); }
      arr.push(i);
    }
    if (g.cod_lote) {
      let arr = codLoteToGroups.get(g.cod_lote);
      if (!arr) { arr = []; codLoteToGroups.set(g.cod_lote, arr); }
      arr.push(i);
    }
  }
  doorTree.load(treeItems);

  const cellFiles = fs.readdirSync(GRID_DIR).filter((f) => f.endsWith('.ndjson')).sort();
  let totalBuildingsScanned = 0;
  const PAD = 0.00016; // ~16-17 meters

  for (let cIdx = 0; cIdx < cellFiles.length; cIdx++) {
    const file = cellFiles[cIdx];
    const cellKey = file.replace('cell_', '').replace('.ndjson', '');
    await readNdjson(path.join(GRID_DIR, file), (b) => {
      totalBuildingsScanned++;
      const [objectid, altura, base, topo, clnp, codLote, area, bbox, isMulti, coords] = b;

      const candIndices = new Set();
      const spatialHits = doorTree.search({
        minX: bbox[0] - PAD,
        minY: bbox[1] - PAD,
        maxX: bbox[2] + PAD,
        maxY: bbox[3] + PAD,
      });
      for (const hit of spatialHits) candIndices.add(hit.idx);
      if (clnp && clnpToGroups.has(clnp)) {
        for (const i of clnpToGroups.get(clnp)) candIndices.add(i);
      }
      if (codLote && codLoteToGroups.has(codLote)) {
        for (const i of codLoteToGroups.get(codLote)) candIndices.add(i);
      }
      if (candIndices.size === 0) return;

      for (const gIdx of candIndices) {
        const g = doorGroups[gIdx];
        const exactClnp = Boolean(clnp && g.clnp && clnp === g.clnp);
        const exactLote = Boolean(codLote && g.cod_lote && codLote === g.cod_lote);
        const dist = pointToPolygonDistMeters(g.lng, g.lat, isMulti === 1, coords);

        let rank = 99;
        if (exactClnp && dist <= 80) rank = 0;
        else if (dist === 0) rank = 1;
        else if (exactLote && dist <= 35) rank = 2;
        else if (dist <= 15.0) rank = 3;
        else continue;

        // Slight penalty for tiny sub-16m² sheds when larger real buildings match
        const tinyPenalty = (area || 0) < 16 ? 1 : 0;
        const effectiveRank = rank * 10 + tinyPenalty;

        const prev = g.bestMatch;
        if (
          !prev ||
          effectiveRank < prev.effectiveRank ||
          (effectiveRank === prev.effectiveRank && (dist < prev.dist - 0.5 || (Math.abs(dist - prev.dist) <= 0.5 && area > prev.area)))
        ) {
          g.bestMatch = {
            cellKey,
            objectid,
            rank,
            effectiveRank,
            dist: Math.round(dist * 10) / 10,
            area: area || 0,
            method: exactClnp ? 'clnp' : dist === 0 ? 'inside' : exactLote ? 'cod_lote' : 'dist15m',
          };
        }
      }
    });

    if ((cIdx + 1) % 16 === 0 || cIdx + 1 === cellFiles.length) {
      console.log(`[Join 4/5] Spatial scan ${cIdx + 1}/${cellFiles.length} células (${totalBuildingsScanned} edifícios)`);
    }
  }

  // Aggregate matched doorGroups per building objectid
  const buildingItbiMap = new Map();
  let linkedGroups = 0;
  let linkedTx = 0;

  for (const g of doorGroups) {
    if (!g.bestMatch) continue;
    linkedGroups++;
    linkedTx += g.txCount;
    const oid = g.bestMatch.objectid;
    let agg = buildingItbiMap.get(oid);
    if (!agg) {
      agg = {
        values: [],
        recentValues: [],
        txCount: 0,
        labels: new Set(),
        bairro: g.bairro,
        normBairro: g.normBairro,
        methods: new Set(),
      };
      buildingItbiMap.set(oid, agg);
    }
    agg.values.push(...g.values);
    if (Array.isArray(g.recentValues) && g.recentValues.length) agg.recentValues.push(...g.recentValues);
    agg.txCount += g.txCount;
    if (g.label) agg.labels.add(g.label);
    if (!agg.bairro && g.bairro) {
      agg.bairro = g.bairro;
      agg.normBairro = g.normBairro;
    }
    agg.methods.add(g.bestMatch.method);
  }

  console.log(
    `[Join 4/5] Ligação concluída! ${buildingItbiMap.size} edificações 3D únicas vinculadas a ${linkedTx} transações ITBI (${linkedGroups}/${doorGroups.length} grupos de endereço).`
  );
  return { totalBuildingsScanned, buildingItbiMap, linkedGroups, linkedTx };
}

function enrichMetricForBuilding(agg, bairroMedians, cityMedianSqm) {
  const m2Pool = agg.recentValues && agg.recentValues.length ? agg.recentValues : agg.values;
  const m2 = Math.round(calcMedian(m2Pool));
  const refMed = bairroMedians.get(agg.normBairro) || cityMedianSqm || m2;
  const spr = refMed > 0 ? Math.round(((m2 - refMed) / refMed) * 100) : 0;
  const liq = Math.min(10, Math.max(1, Math.round(2.1 * Math.log2(agg.txCount + 1) + 1.5)));
  const addrArr = Array.from(agg.labels).slice(0, 3);
  return {
    m2,
    tx: agg.txCount,
    liq,
    spr,
    a: addrArr.join(' | ').slice(0, 80),
    b: String(agg.bairro || '').slice(0, 40),
  };
}

async function exportEnrichedAndBuildPMTiles(buildingItbiMap, portasIdx, bairroMedians, cityMedianSqm, joinStats) {
  console.log('[Join 5/5] Particionando Z12 e gerando rio_itbi_matched_buildings.geojson + PMTiles 3D...');
  fs.mkdirSync(Z12_DIR, { recursive: true });
  fs.mkdirSync(TILES_OUT_DIR, { recursive: true });

  // Clear previous Z12 files
  for (const f of fs.readdirSync(Z12_DIR)) {
    fs.unlinkSync(path.join(Z12_DIR, f));
  }

  const z12Streams = new Map();
  const matchedFeatures = [];
  const cellFiles = fs.readdirSync(GRID_DIR).filter((f) => f.endsWith('.ndjson')).sort();

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  let totalExportedToZ12 = 0;
  let droppedTiny = 0;

  const getZ12Stream = (tx, ty) => {
    const key = `${tx}_${ty}`;
    let ws = z12Streams.get(key);
    if (!ws) {
      ws = fs.createWriteStream(path.join(Z12_DIR, `z12_${key}.ndjson`), { encoding: 'utf8' });
      z12Streams.set(key, ws);
    }
    return ws;
  };

  for (const file of cellFiles) {
    await readNdjson(path.join(GRID_DIR, file), (b) => {
      const [objectid, alturaRaw, base, topo, clnp, codLote, area, bbox, isMulti, coords] = b;
      const agg = buildingItbiMap.get(objectid);
      const hasItbi = Boolean(agg);

      // Drop tiny un-attributed backyard sheds < 12m² to keep citywide vector tiles fast & < 90 MB
      if (!hasItbi && (area || 0) < 12) {
        droppedTiny++;
        return;
      }

      let h = Number(alturaRaw);
      if (!Number.isFinite(h) || h <= 0) {
        const pav = clnp ? portasIdx.clnpToPav.get(clnp) : 0;
        h = pav > 0 ? pav * 3.2 : 4.5;
      }
      h = Math.max(3.0, Math.round(h * 10) / 10);

      if (bbox[0] < minLon) minLon = bbox[0];
      if (bbox[1] < minLat) minLat = bbox[1];
      if (bbox[2] > maxLon) maxLon = bbox[2];
      if (bbox[3] > maxLat) maxLat = bbox[3];

      const props = hasItbi
        ? { id: objectid, h, ...enrichMetricForBuilding(agg, bairroMedians, cityMedianSqm) }
        : { h };

      const geomType = isMulti === 1 ? 'MultiPolygon' : 'Polygon';
      const feature = {
        type: 'Feature',
        properties: props,
        geometry: { type: geomType, coordinates: coords },
      };

      if (hasItbi) {
        matchedFeatures.push(feature);
      }

      // Assign to all overlapping Z12 buckets (with tiny margin)
      const [tx0, ty1] = lngLatToTile(bbox[0] - 0.0002, bbox[1] - 0.0002, 12);
      const [tx1, ty0] = lngLatToTile(bbox[2] + 0.0002, bbox[3] + 0.0002, 12);
      const line = JSON.stringify([Math.round(area || 0), hasItbi ? 1 : 0, feature]);

      for (let tx = tx0; tx <= tx1; tx++) {
        for (let ty = ty0; ty <= ty1; ty++) {
          getZ12Stream(tx, ty).write(line + '\n');
        }
      }
      totalExportedToZ12++;
    });
  }

  await Promise.all(Array.from(z12Streams.values()).map((ws) => new Promise((r) => ws.end(r))));
  console.log(`[Join 5/5] Z12 partições criadas (${z12Streams.size} buckets) | ${totalExportedToZ12} edifícios úteis (${droppedTiny} micro-anexos <12m² sem ITBI filtrados).`);

  // Save ITBI-matched buildings GeoJSON
  const matchedFc = {
    type: 'FeatureCollection',
    metadata: {
      source: 'IPP / DATA.RIO CadLog/Edificacoes_2019 + Numero_de_porta + Trechos_Logradouros',
      crs: 'EPSG:4326',
      generatedAt: new Date().toISOString(),
      matchedBuildings: matchedFeatures.length,
    },
    features: matchedFeatures,
  };
  fs.writeFileSync(MATCHED_GEOJSON_PATH, JSON.stringify(matchedFc));
  console.log(`[Join 5/5] Salvo ${MATCHED_GEOJSON_PATH} (${(fs.statSync(MATCHED_GEOJSON_PATH).size / 1024 / 1024).toFixed(2)} MB, ${matchedFeatures.length} prédios).`);

  // Build MVT PMTiles across Z12..Z15 (MapLibre overzooms Z15 seamlessly to Z22)
  await buildPMTilesFromZ12({
    minLon,
    minLat,
    maxLon,
    maxLat,
    existingSummary: {
      itbiStats: joinStats.itbiStats,
      spatialJoin: {
        buildingsScanned: joinStats.totalBuildingsScanned,
        buildingsExported: totalExportedToZ12,
        matchedBuildings: matchedFeatures.length,
        linkedDoorGroups: joinStats.linkedGroups,
        linkedTransactions: joinStats.linkedTx,
        cityMedianSqm: Math.round(cityMedianSqm),
      },
    },
  });
}

async function buildPMTilesFromZ12({ minLon, minLat, maxLon, maxLat, existingSummary }) {
  fs.mkdirSync(TILES_OUT_DIR, { recursive: true });
  const writer = new StreamingPMTilesWriter(PMTILES_PATH, {
    minZoom: 12,
    maxZoom: 15,
    minLon,
    minLat,
    maxLon,
    maxLat,
    centerZoom: 13,
    centerLon: -43.2096,
    centerLat: -22.9035,
  });

  const z12Files = fs.readdirSync(Z12_DIR).filter((f) => f.endsWith('.ndjson')).sort();
  let builtTiles = 0;
  let sampleTileZxy = null;

  for (let i = 0; i < z12Files.length; i++) {
    const file = z12Files[i];
    const m = file.match(/^z12_(\d+)_(\d+)\.ndjson$/);
    if (!m) continue;
    const z12x = Number(m[1]);
    const z12y = Number(m[2]);

    const coarseFeats = []; // Z12..Z13
    const midFeats = [];    // Z14
    const fineFeats = [];   // Z15

    await readNdjson(path.join(Z12_DIR, file), ([area, hasItbi, feat]) => {
      if (hasItbi || area >= 150 || (feat.properties?.h || 0) >= 14) coarseFeats.push(feat);
      if (hasItbi || area >= 65 || (feat.properties?.h || 0) >= 8) midFeats.push(feat);
      if (hasItbi || area >= 30 || (feat.properties?.h || 0) >= 5.5) fineFeats.push(feat);
    });

    const emitTile = (vtIndex, z, x, y) => {
      const tile = vtIndex.getTile(z, x, y);
      if (!tile || !tile.features || tile.features.length === 0) return;
      const pbf = vtpbf.fromGeojsonVt({ edificacoes: tile }, { version: 2, extent: 2048 });
      const gz = zlib.gzipSync(Buffer.from(pbf), { level: 9 });
      writer.addTile(z, x, y, gz);
      if (!sampleTileZxy && z >= 14) sampleTileZxy = [z, x, y];
      builtTiles++;
    };

    if (coarseFeats.length > 0) {
      const idxCoarse = new geojsonvt({ type: 'FeatureCollection', features: coarseFeats }, {
        maxZoom: 13,
        indexMaxZoom: 13,
        indexMaxPoints: 0,
        tolerance: 6,
        extent: 2048,
        buffer: 16,
      });
      emitTile(idxCoarse, 12, z12x, z12y);
      for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 2; dy++) {
          emitTile(idxCoarse, 13, z12x * 2 + dx, z12y * 2 + dy);
        }
      }
    }

    if (midFeats.length > 0) {
      const idxMid = new geojsonvt({ type: 'FeatureCollection', features: midFeats }, {
        maxZoom: 14,
        indexMaxZoom: 14,
        indexMaxPoints: 0,
        tolerance: 4,
        extent: 2048,
        buffer: 16,
      });
      for (let dx = 0; dx < 4; dx++) {
        for (let dy = 0; dy < 4; dy++) {
          emitTile(idxMid, 14, z12x * 4 + dx, z12y * 4 + dy);
        }
      }
    }

    if (fineFeats.length > 0) {
      const idxFine = new geojsonvt({ type: 'FeatureCollection', features: fineFeats }, {
        maxZoom: 15,
        indexMaxZoom: 15,
        indexMaxPoints: 0,
        tolerance: 3.5,
        extent: 2048,
        buffer: 16,
      });
      for (let dx = 0; dx < 8; dx++) {
        for (let dy = 0; dy < 8; dy++) {
          emitTile(idxFine, 15, z12x * 8 + dx, z12y * 8 + dy);
        }
      }
    }

    if ((i + 1) % 6 === 0 || i + 1 === z12Files.length) {
      console.log(`[PMTiles] Z12 bucket ${i + 1}/${z12Files.length} (${builtTiles} vector tiles gerados)`);
    }
  }

  const archiveRes = await writer.finalize({
    name: 'Rio de Janeiro Edificacoes 3D + ITBI',
    description: 'Edificacoes 3D oficiais IPP/DATA.RIO (2019) enriquecidas com ITBI georreferenciado',
    version: '1.0.0',
    vector_layers: [
      {
        id: 'edificacoes',
        description: 'Polígonos 3D das edificações com altura oficial e mediana R$/m² ITBI',
        minzoom: 12,
        maxzoom: 15,
        fields: {
          id: 'Number',
          h: 'Number',
          m2: 'Number',
          tx: 'Number',
          liq: 'Number',
          spr: 'Number',
          a: 'String',
          b: 'String',
        },
      },
    ],
  });

  const verification = await verifyPMTilesArchive(PMTILES_PATH, sampleTileZxy);
  const sizeMB = archiveRes.fileSize / 1024 / 1024;
  console.log(`[PMTiles] Archive gerado: ${PMTILES_PATH} (${sizeMB.toFixed(2)} MB, ${archiveRes.numAddressedTiles} tiles, sample=${JSON.stringify(sampleTileZxy)}:${verification.sampleBytes}B)`);

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceLayers: {
      edificacoes: 'IPP CadLog/Edificacoes_2019 (FeatureServer/0) -> EPSG:4326',
      numerosPorta: 'IPP CadLog/Numero_de_porta (FeatureServer/0) -> EPSG:4326',
      trechosLogradouros: 'IPP CadLog/Trechos_Logradouros (FeatureServer/0) -> EPSG:4326',
      edificacoes2013ReferenceId: '124f1607b57d4292af5c0dfc2ff8572c_0',
    },
    itbiStats: existingSummary.itbiStats,
    spatialJoin: existingSummary.spatialJoin,
    pmtiles: {
      path: 'public/tiles/rio_edificacoes.pmtiles',
      sizeMB: Math.round(sizeMB * 100) / 100,
      numTiles: archiveRes.numAddressedTiles,
      minZoom: 12,
      maxZoom: 15,
      bounds: [minLon, minLat, maxLon, maxLat],
    },
  };
  fs.writeFileSync(SUMMARY_JSON_PATH, JSON.stringify(summary, null, 2));
  console.log(`[Summary] Salvo ${SUMMARY_JSON_PATH}`);

  if (sizeMB > 95) {
    throw new Error(`PMTiles excedeu 95 MB (${sizeMB.toFixed(2)} MB) - excede limite GitHub!`);
  }
}

async function main() {
  const t0 = Date.now();
  if (process.argv.includes('--tiles-only') && fs.existsSync(SUMMARY_JSON_PATH) && fs.existsSync(Z12_DIR)) {
    const prev = JSON.parse(fs.readFileSync(SUMMARY_JSON_PATH, 'utf8'));
    const [minLon, minLat, maxLon, maxLat] = prev.pmtiles?.bounds || [-43.8, -23.09, -43.09, -22.74];
    console.log('[GIS Pipeline] Modo --tiles-only ativado sobre buckets Z12 já processados...');
    await buildPMTilesFromZ12({ minLon, minLat, maxLon, maxLat, existingSummary: prev });
    console.log(`[GIS Pipeline] PMTiles reconstruído em ${((Date.now() - t0) / 1000).toFixed(1)}s!`);
    return;
  }
  const trechosIdx = await loadTrechosIndex();
  const portasIdx = await loadPortasIndex();
  const itbiData = buildDoorGroupsFromItbi(trechosIdx, portasIdx);
  const joinRes = await spatialJoinBuildings(itbiData.doorGroups);
  await exportEnrichedAndBuildPMTiles(
    joinRes.buildingItbiMap,
    portasIdx,
    itbiData.bairroMedians,
    itbiData.cityMedianSqm,
    {
      itbiStats: itbiData.stats,
      totalBuildingsScanned: joinRes.totalBuildingsScanned,
      linkedGroups: joinRes.linkedGroups,
      linkedTx: joinRes.linkedTx,
    }
  );
  console.log(`[GIS Pipeline] Tudo concluído com sucesso em ${((Date.now() - t0) / 1000).toFixed(1)}s!`);
}

main().catch((err) => {
  console.error('[GIS Pipeline Error]', err);
  process.exit(1);
});
