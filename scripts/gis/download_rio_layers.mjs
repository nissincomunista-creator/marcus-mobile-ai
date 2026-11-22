import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('data/gis/rio_itbi_map');
const RAW_DIR = path.join(OUT_DIR, 'raw');
const GRID_DIR = path.join(OUT_DIR, 'grid');
const CHECKPOINT_FILE = path.join(RAW_DIR, 'download_checkpoint.json');

const TRECHOS_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/FeatureServer/0/query';
const PORTAS_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Numero_de_porta/FeatureServer/0/query';
const EDIF2019_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Edificacoes_2019/FeatureServer/0/query';

// Rio de Janeiro bounding box divided into 8x8 spatial grid cells (64 cells)
export const GRID_BOUNDS = {
  minLng: -43.82,
  maxLng: -43.08,
  minLat: -23.10,
  maxLat: -22.73,
  nx: 8,
  ny: 8,
};

function ensureDirs() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(GRID_DIR, { recursive: true });
}

function getGridCell(lng, lat) {
  const ix = Math.max(0, Math.min(GRID_BOUNDS.nx - 1, Math.floor(((lng - GRID_BOUNDS.minLng) / (GRID_BOUNDS.maxLng - GRID_BOUNDS.minLng)) * GRID_BOUNDS.nx)));
  const iy = Math.max(0, Math.min(GRID_BOUNDS.ny - 1, Math.floor(((lat - GRID_BOUNDS.minLat) / (GRID_BOUNDS.maxLat - GRID_BOUNDS.minLat)) * GRID_BOUNDS.ny)));
  return `${ix}_${iy}`;
}

function computeGeometryBBox(geometry) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  if (!geometry || !geometry.coordinates) return null;
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  for (const poly of polys) {
    const outer = poly[0];
    if (!outer) continue;
    for (const pt of outer) {
      const lng = pt[0], lat = pt[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  if (!Number.isFinite(minLng)) return null;
  return [
    Math.round(minLng * 1e6) / 1e6,
    Math.round(minLat * 1e6) / 1e6,
    Math.round(maxLng * 1e6) / 1e6,
    Math.round(maxLat * 1e6) / 1e6,
  ];
}

async function fetchJsonWithRetry(url, init = undefined, label = 'req') {
  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      const parsed = JSON.parse(text);
      if (parsed.error) {
        throw new Error(`ArcGIS error ${parsed.error.code}: ${parsed.error.message}`);
      }
      return parsed;
    } catch (err) {
      lastErr = err;
      const delay = Math.min(8000, 350 * Math.pow(2, attempt - 1));
      if (attempt >= 3) {
        console.warn(`[retry ${attempt}/6] ${label}: ${err?.message || err} (wait ${delay}ms)`);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`Failed ${label}: ${lastErr?.message || lastErr}`);
}

async function runPool(items, concurrency, workerFn) {
  let idx = 0;
  async function runner() {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      await workerFn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runner());
  await Promise.all(workers);
}

async function getStats(url, idField = 'objectid') {
  const s = JSON.stringify([
    { statisticType: 'min', onStatisticField: idField, outStatisticFieldName: 'minId' },
    { statisticType: 'max', onStatisticField: idField, outStatisticFieldName: 'maxId' },
    { statisticType: 'count', onStatisticField: idField, outStatisticFieldName: 'cnt' },
  ]);
  const data = await fetchJsonWithRetry(`${url}?where=1%3D1&outStatistics=${encodeURIComponent(s)}&f=json`, undefined, 'stats');
  const attrs = data.features?.[0]?.attributes || {};
  return {
    minId: Number(attrs.minid ?? attrs.minId ?? 1),
    maxId: Number(attrs.maxid ?? attrs.maxId ?? 1),
    count: Number(attrs.cnt ?? 0),
  };
}

async function downloadTrechos(checkpoint) {
  const target = path.join(RAW_DIR, 'trechos_logradouros.ndjson');
  if (checkpoint.trechosDone && fs.existsSync(target) && fs.statSync(target).size > 1_000_000) {
    console.log('[Trechos] Já baixado, pulando.');
    return;
  }

  const st = await getStats(TRECHOS_URL);
  console.log(`[Trechos] Range objectid: ${st.minId}..${st.maxId} (cnt=${st.count})`);

  const ranges = [];
  for (let start = st.minId; start <= st.maxId; start += 2000) {
    ranges.push([start, Math.min(st.maxId, start + 1999)]);
  }

  const ws = fs.createWriteStream(target, { encoding: 'utf8' });
  let totalWritten = 0;

  await runPool(ranges, 12, async ([s, e], bIdx) => {
    const q = new URLSearchParams({
      where: `objectid>=${s} AND objectid<=${e}`,
      outFields: 'objectid,cod_trecho,cl,np_ini_par,np_fin_par,np_ini_imp,np_fin_imp,tipo_logra_abr,tipo_logra_ext,nobreza,preposicao,nome_parcial,completo,nome_mapa,cod_bairro,bairro',
      outSR: '4326',
      geometryPrecision: '5',
      f: 'geojson',
    });
    const fc = await fetchJsonWithRetry(`${TRECHOS_URL}?${q.toString()}`, undefined, `trechos-${s}-${e}`);

    const lines = [];
    for (const f of fc.features || []) {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [];
      let midLng = 0, midLat = 0;
      if (coords.length > 0 && Array.isArray(coords[0])) {
        const midPt = coords[Math.floor(coords.length / 2)];
        if (Array.isArray(midPt) && midPt.length >= 2) {
          midLng = midPt[0];
          midLat = midPt[1];
        }
      }
      lines.push(JSON.stringify({
        cl: String(p.cl || '').trim(),
        cod_trecho: p.cod_trecho,
        np_ini_par: p.np_ini_par,
        np_fin_par: p.np_fin_par,
        np_ini_imp: p.np_ini_imp,
        np_fin_imp: p.np_fin_imp,
        tipo_ext: (p.tipo_logra_ext || '').trim(),
        nobreza: (p.nobreza || '').trim(),
        prep: (p.preposicao || '').trim(),
        nome: (p.nome_parcial || '').trim(),
        completo: (p.completo || '').trim(),
        mapa: (p.nome_mapa || '').trim(),
        bairro: (p.bairro || '').trim(),
        lng: midLng,
        lat: midLat,
      }));
    }
    if (lines.length) {
      ws.write(lines.join('\n') + '\n');
      totalWritten += lines.length;
    }
    if ((bIdx + 1) % 20 === 0 || bIdx + 1 === ranges.length) {
      console.log(`[Trechos] ${bIdx + 1}/${ranges.length} lotes (${totalWritten} trechos)`);
    }
  });

  await new Promise((r) => ws.end(r));
  checkpoint.trechosDone = true;
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  console.log(`[Trechos] Concluído: ${totalWritten} trechos -> ${target}`);
}

async function downloadPortas(checkpoint) {
  const target = path.join(RAW_DIR, 'numeros_porta.ndjson');
  if (checkpoint.portasDone && fs.existsSync(target) && fs.statSync(target).size > 20_000_000) {
    console.log('[Portas] Já baixado, pulando.');
    return;
  }

  const st = await getStats(PORTAS_URL);
  console.log(`[Portas] Range objectid: ${st.minId}..${st.maxId} (cnt=${st.count})`);
  const ranges = [];
  for (let start = st.minId; start <= st.maxId; start += 2000) {
    ranges.push([start, Math.min(st.maxId, start + 1999)]);
  }

  const ws = fs.createWriteStream(target, { encoding: 'utf8' });
  let totalWritten = 0;

  await runPool(ranges, 12, async ([s, e], idx) => {
    const q = new URLSearchParams({
      where: `objectid>=${s} AND objectid<=${e}`,
      outFields: 'objectid,cod_np,np,np_int,cl,clnp,compl_np,num_pavimentos,cod_lote,cod_trecho,cep',
      outSR: '4326',
      geometryPrecision: '6',
      f: 'geojson',
    });
    const fc = await fetchJsonWithRetry(`${PORTAS_URL}?${q.toString()}`, undefined, `portas-${s}-${e}`);
    const lines = [];
    for (const f of fc.features || []) {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      lines.push(JSON.stringify([
        p.objectid,
        coords[0],
        coords[1],
        String(p.cl || '').trim(),
        Number(p.np_int ?? parseInt(String(p.np || ''), 10)) || 0,
        String(p.clnp || '').trim(),
        String(p.cod_lote || '').trim(),
        Number(p.num_pavimentos || 0) || 0,
        String(p.cep || '').trim(),
      ]));
    }
    if (lines.length) {
      ws.write(lines.join('\n') + '\n');
      totalWritten += lines.length;
    }
    if ((idx + 1) % 50 === 0 || idx + 1 === ranges.length) {
      console.log(`[Portas] ${idx + 1}/${ranges.length} blocos (${totalWritten} pontos)`);
    }
  });

  await new Promise((r) => ws.end(r));
  checkpoint.portasDone = true;
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  console.log(`[Portas] Concluído: ${totalWritten} pontos -> ${target}`);
}

async function downloadEdificacoes2019(checkpoint) {
  if (checkpoint.edifDone) {
    console.log('[Edif2019] Já baixado, pulando.');
    return;
  }

  const st = await getStats(EDIF2019_URL);
  console.log(`[Edif2019] Range objectid: ${st.minId}..${st.maxId} (cnt=${st.count})`);

  const completedRanges = new Set(checkpoint.edifRangesDone || []);
  const ranges = [];
  for (let start = st.minId; start <= st.maxId; start += 2000) {
    const end = Math.min(st.maxId, start + 1999);
    const key = `${start}_${end}`;
    if (!completedRanges.has(key)) {
      ranges.push([start, end, key]);
    }
  }
  console.log(`[Edif2019] Blocos pendentes: ${ranges.length} (já concluídos: ${completedRanges.size})`);
  if (ranges.length === 0) {
    checkpoint.edifDone = true;
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
    return;
  }

  // Open 64 grid cell write streams (append mode if resuming)
  const isFresh = completedRanges.size === 0;
  const cellStreams = new Map();
  for (let ix = 0; ix < GRID_BOUNDS.nx; ix++) {
    for (let iy = 0; iy < GRID_BOUNDS.ny; iy++) {
      const k = `${ix}_${iy}`;
      const p = path.join(GRID_DIR, `cell_${k}.ndjson`);
      if (isFresh && fs.existsSync(p)) fs.unlinkSync(p);
      cellStreams.set(k, fs.createWriteStream(p, { flags: 'a', encoding: 'utf8' }));
    }
  }

  let totalWritten = checkpoint.edifWritten || 0;
  let blocksSinceSave = 0;

  await runPool(ranges, 12, async ([s, e, key], idx) => {
    const q = new URLSearchParams({
      where: `objectid>=${s} AND objectid<=${e}`,
      outFields: 'objectid,altura,base,topo,clnp,cod_lote,Shape__Area',
      outSR: '4326',
      geometryPrecision: '6',
      f: 'geojson',
    });
    const fc = await fetchJsonWithRetry(`${EDIF2019_URL}?${q.toString()}`, undefined, `edif-${s}-${e}`);

    const cellBuffers = new Map();
    let countInBlock = 0;
    for (const f of fc.features || []) {
      const p = f.properties || {};
      const geom = f.geometry;
      const bbox = computeGeometryBBox(geom);
      if (!bbox) continue;
      const cLng = (bbox[0] + bbox[2]) * 0.5;
      const cLat = (bbox[1] + bbox[3]) * 0.5;
      const cellKey = getGridCell(cLng, cLat);

      const isMulti = geom.type === 'MultiPolygon' ? 1 : 0;
      const row = JSON.stringify([
        p.objectid,
        p.altura != null ? Math.round(Number(p.altura) * 100) / 100 : null,
        p.base != null ? Math.round(Number(p.base) * 100) / 100 : 0,
        p.topo != null ? Math.round(Number(p.topo) * 100) / 100 : null,
        String(p.clnp || '').trim(),
        String(p.cod_lote || '').trim(),
        p.Shape__Area != null ? Math.round(Number(p.Shape__Area) * 10) / 10 : 0,
        bbox,
        isMulti,
        geom.coordinates,
      ]);

      let arr = cellBuffers.get(cellKey);
      if (!arr) {
        arr = [];
        cellBuffers.set(cellKey, arr);
      }
      arr.push(row);
      countInBlock++;
    }

    for (const [cellKey, lines] of cellBuffers.entries()) {
      const ws = cellStreams.get(cellKey);
      if (ws && lines.length) {
        ws.write(lines.join('\n') + '\n');
      }
    }

    totalWritten += countInBlock;
    completedRanges.add(key);
    blocksSinceSave++;

    if (blocksSinceSave >= 40) {
      blocksSinceSave = 0;
      checkpoint.edifRangesDone = Array.from(completedRanges);
      checkpoint.edifWritten = totalWritten;
      fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
    }

    if ((idx + 1) % 60 === 0 || idx + 1 === ranges.length) {
      console.log(`[Edif2019] ${idx + 1}/${ranges.length} blocos pendentes | total acumulado=${totalWritten}`);
    }
  });

  await Promise.all(Array.from(cellStreams.values()).map((ws) => new Promise((r) => ws.end(r))));
  checkpoint.edifRangesDone = Array.from(completedRanges);
  checkpoint.edifWritten = totalWritten;
  checkpoint.edifDone = true;
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  console.log(`[Edif2019] Concluído! Total polígonos gravados nos buckets espaciais: ${totalWritten}`);
}

async function main() {
  ensureDirs();
  let checkpoint = {};
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    } catch {}
  }

  const t0 = Date.now();
  await downloadTrechos(checkpoint);
  await downloadPortas(checkpoint);
  await downloadEdificacoes2019(checkpoint);
  console.log(`[GIS Download] Tudo pronto em ${((Date.now() - t0) / 1000).toFixed(1)}s!`);
}

main().catch((err) => {
  console.error('[GIS Download Error]', err);
  process.exit(1);
});
