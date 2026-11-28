import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pbfMod = require('pbf');
const Pbf = typeof pbfMod === 'function' ? pbfMod : pbfMod.PbfReader || pbfMod.default;
const vtPkg = require('@mapbox/vector-tile');
const VectorTile = vtPkg.VectorTile || vtPkg;

const ROOT = process.cwd();

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false, headers: { 'User-Agent': 'MarcusAuctionAI/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Invalid JSON from ${url}: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false, headers: { 'User-Agent': 'MarcusAuctionAI/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        return resolve(null);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let buf = Buffer.concat(chunks);
        const enc = String(res.headers['content-encoding'] || '').toLowerCase();
        if (enc === 'gzip' || (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b)) {
          try {
            buf = zlib.gunzipSync(buf);
          } catch {}
        }
        resolve(buf);
      });
    }).on('error', () => resolve(null));
  });
}

function normStreet(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(rua|r\.|avenida|av\.|estrada|est\.|travessa|tv\.|alameda|al\.|largo|praca|pc\.|rodovia)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normBairro(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tile2lon(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}
function tile2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
function lon2tile(lon, z) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
}
function lat2tile(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z));
}

function roundRing(ring) {
  return ring.map((pt) => [Math.round(pt[0] * 1e6) / 1e6, Math.round(pt[1] * 1e6) / 1e6]);
}

function polygonCentroid(rings) {
  const outer = rings[0];
  if (!outer || outer.length === 0) return [0, 0];
  let sx = 0;
  let sy = 0;
  const n = outer.length;
  for (const pt of outer) {
    sx += pt[0];
    sy += pt[1];
  }
  return [sx / n, sy / n];
}

function tilePolyToLngLat(coords, z, x, y, extent) {
  return coords.map((ring) =>
    roundRing(
      ring.map((pt) => {
        const fx = x + pt.x / extent;
        const fy = y + pt.y / extent;
        return [tile2lon(fx, z), tile2lat(fy, z)];
      })
    )
  );
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

async function fetchSigeoNiteroi() {
  const usos = [];
  for (let offset = 0; offset < 8000; offset += 2000) {
    const u = `https://sig.niteroi.rj.gov.br/server/rest/services/Hosted/edificacoes_usos/FeatureServer/0/query?where=1%3D1&outFields=fid,db_altmax,db_altmed,tx_usosolo,tx_npavime,tx_bairro&outSR=4326&f=geojson&resultOffset=${offset}&resultRecordCount=2000`;
    const j = await fetchJson(u);
    const feats = j.features || [];
    usos.push(...feats);
    if (feats.length < 2000) break;
  }

  const clipByCoord = new Map();
  for (let offset = 0; offset < 8000; offset += 2000) {
    const u = `https://sig.niteroi.rj.gov.br/server/rest/services/Hosted/edificacoes_clip/FeatureServer/0/query?where=1%3D1&outFields=fid,nome,bairro,mean,max,gabarito&outSR=4326&f=geojson&resultOffset=${offset}&resultRecordCount=2000`;
    const j = await fetchJson(u);
    const feats = j.features || [];
    for (const f of feats) {
      if (!f.geometry || !f.geometry.coordinates) continue;
      const rings = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates[0];
      const [cx, cy] = polygonCentroid(rings);
      const key = `${Math.round(cy * 5000)}_${Math.round(cx * 5000)}`;
      clipByCoord.set(key, f.properties || {});
    }
    if (feats.length < 2000) break;
  }

  return { usos, clipByCoord };
}

async function fetchOverpassBuildings(bbox) {
  const query = `[out:json][timeout:45];(way["building"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}););out tags geom;`;
  const postData = 'data=' + encodeURIComponent(query);
  const raw = await new Promise((resolve) => {
    const u = new URL('https://maps.mail.ru/osm/tools/overpass/api/interpreter');
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        timeout: 45000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MarcusAuctionAI/1.0',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch {
            resolve({ elements: [] });
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ elements: [] });
    });
    req.on('error', () => resolve({ elements: [] }));
    req.write(postData);
    req.end();
  });

  const out = [];
  for (const el of raw.elements || []) {
    if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 3) continue;
    const ring = el.geometry.map((pt) => [Math.round(pt.lon * 1e6) / 1e6, Math.round(pt.lat * 1e6) / 1e6]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
    if (ring.length < 4) continue;
    const [cx, cy] = polygonCentroid([ring]);
    const tags = el.tags || {};
    let h = 8;
    const rawH = parseFloat(String(tags.height || '').replace(',', '.'));
    const rawLevels = parseFloat(String(tags['building:levels'] || '').replace(',', '.'));
    if (Number.isFinite(rawH) && rawH > 2 && rawH < 200) h = Math.round(rawH);
    else if (Number.isFinite(rawLevels) && rawLevels > 0 && rawLevels < 60) h = Math.round(rawLevels * 3.1);
    else if (tags.building === 'apartments') h = 18;
    else if (tags.building === 'commercial' || tags.building === 'retail') h = 10;
    else if (tags.building === 'house' || tags.building === 'residential') h = 7;

    const streetName = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ') || tags.name || '';
    out.push({
      coords: [ring],
      cx,
      cy,
      h: Math.max(4, h),
      osmAddr: streetName,
      osmBairro: tags['addr:suburb'] || tags['addr:neighbourhood'] || '',
    });
  }
  return out;
}

function liqScoreFromTx(tx) {
  if (tx <= 0) return 0;
  if (tx >= 20) return 10;
  if (tx >= 12) return 8;
  if (tx >= 7) return 6;
  if (tx >= 4) return 4;
  if (tx >= 2) return 3;
  return 1;
}

async function main() {
  console.log('1. Loading street centroids and ITBI...');
  const centroids = JSON.parse(fs.readFileSync(path.join(ROOT, '.cache/city_street_centroids.json'), 'utf8'));
  const ds = JSON.parse(fs.readFileSync(path.join(ROOT, 'data_store.json'), 'utf8'));
  const txs = ds.itbiTransactions || [];

  function buildCityItbiAnchors(cityMatch, streetMap) {
    const byStreet = new Map();
    const byBairro = new Map();
    const allSqms = [];
    for (const t of txs) {
      const c = normBairro(t.city);
      if (!c.includes(cityMatch)) continue;
      let sqm = Number(t.unitValueSqm) || (Number(t.sizeSqm) > 10 && Number(t.transactionValue) > 10000 ? Number(t.transactionValue) / Number(t.sizeSqm) : 0);
      if (sqm <= 0 && cityMatch === 'juiz') {
        const absVal = Number(t.normalizedTotalValue) || Number(t.transactionValue) || 0;
        if (absVal >= 45000 && absVal <= 2500000) {
          sqm = Math.max(2200, Math.min(8500, Math.round(absVal / 72)));
        }
      }
      if (sqm < 1000 || sqm > 35000) continue;
      allSqms.push(sqm);
      const bKey = normBairro(t.neighborhood);
      if (bKey) {
        if (!byBairro.has(bKey)) byBairro.set(bKey, { label: String(t.neighborhood || '').trim(), sqms: [], lats: [], lngs: [] });
        const bObj = byBairro.get(bKey);
        bObj.sqms.push(sqm);
        if (t.transactionLocationLat && t.transactionLocationLng) {
          bObj.lats.push(Number(t.transactionLocationLat));
          bObj.lngs.push(Number(t.transactionLocationLng));
        }
      }
      const stKey = normStreet(t.street);
      if (stKey) {
        if (!byStreet.has(stKey)) byStreet.set(stKey, { sqms: [], lat: 0, lng: 0, nCoord: 0, label: String(t.street || '').trim(), bairro: String(t.neighborhood || '').trim() });
        const stObj = byStreet.get(stKey);
        stObj.sqms.push(sqm);
        if (t.transactionLocationLat && t.transactionLocationLng) {
          stObj.lat += Number(t.transactionLocationLat);
          stObj.lng += Number(t.transactionLocationLng);
          stObj.nCoord += 1;
        }
      }
    }
    const cityMedian = median(allSqms) || 6000;
    const anchors = [];
    for (const [stKey, stObj] of byStreet.entries()) {
      let lat = stObj.nCoord ? stObj.lat / stObj.nCoord : 0;
      let lng = stObj.nCoord ? stObj.lng / stObj.nCoord : 0;
      let label = stObj.label;
      if ((!lat || !lng) && streetMap[stKey]) {
        lat = streetMap[stKey][0];
        lng = streetMap[stKey][1];
        if (!label) label = streetMap[stKey][2];
      }
      if (!lat || !lng) continue;
      const m2 = Math.round(median(stObj.sqms));
      const txCount = stObj.sqms.length;
      const bObj = byBairro.get(normBairro(stObj.bairro));
      const bMed = bObj ? median(bObj.sqms) : cityMedian;
      const spr = bMed > 0 ? Math.max(-25, Math.min(25, Math.round(((m2 - bMed) / bMed) * 100))) : 0;
      anchors.push({ lat, lng, m2, tx: txCount, liq: liqScoreFromTx(txCount), spr, label, bairro: stObj.bairro });
    }
    // Also build bairro anchors using averaged street coordinates
    const bairroAccum = new Map();
    for (const a of anchors) {
      const bk = normBairro(a.bairro);
      if (!bk || bk.includes('juiz de fora') || bk.includes('niteroi')) continue;
      if (!bairroAccum.has(bk)) bairroAccum.set(bk, { lats: [], lngs: [], sqms: [], label: a.bairro, tx: 0 });
      const ba = bairroAccum.get(bk);
      ba.lats.push(a.lat);
      ba.lngs.push(a.lng);
      ba.sqms.push(a.m2);
      ba.tx += a.tx;
    }
    const bairroAnchors = [];
    for (const [bk, ba] of bairroAccum.entries()) {
      const bObj = byBairro.get(bk);
      const m2 = bObj ? Math.round(median(bObj.sqms)) : Math.round(median(ba.sqms));
      const txTotal = bObj ? bObj.sqms.length : ba.tx;
      const spr = cityMedian > 0 ? Math.max(-25, Math.min(25, Math.round(((m2 - cityMedian) / cityMedian) * 100))) : 0;
      bairroAnchors.push({
        lat: ba.lats.reduce((x, y) => x + y, 0) / ba.lats.length,
        lng: ba.lngs.reduce((x, y) => x + y, 0) / ba.lngs.length,
        m2,
        tx: txTotal,
        liq: Math.min(10, Math.max(2, liqScoreFromTx(Math.round(txTotal / 4)))),
        spr,
        bairro: ba.label,
      });
    }
    return { anchors, bairroAnchors, cityMedian };
  }

  const nitData = buildCityItbiAnchors('niter', centroids.niteroi || {});
  const jfData = buildCityItbiAnchors('juiz', centroids.jf || {});
  console.log(`Niteroi anchors: ${nitData.anchors.length} streets, ${nitData.bairroAnchors.length} bairros (median R$${nitData.cityMedian})`);
  console.log(`JF anchors: ${jfData.anchors.length} streets, ${jfData.bairroAnchors.length} bairros (median R$${jfData.cityMedian})`);

  console.log('2. Fetching SIGEO Niteroi polygons...');
  const sigeo = await fetchSigeoNiteroi();
  console.log(`SIGEO Niteroi polygons: ${sigeo.usos.length}, clip entries: ${sigeo.clipByCoord.size}`);

  console.log('3. Fetching OSM Niteroi + JF buildings via Overpass...');
  const [ofmNitW, ofmNitE, ofmJf] = await Promise.all([
    fetchOverpassBuildings({ minLon: -43.136, maxLon: -43.05, minLat: -22.976, maxLat: -22.835 }),
    fetchOverpassBuildings({ minLon: -43.05, maxLon: -42.965, minLat: -22.976, maxLat: -22.835 }),
    fetchOverpassBuildings({ minLon: -43.435, maxLon: -43.285, minLat: -21.845, maxLat: -21.685 }),
  ]);
  const ofmNit = [...ofmNitW, ...ofmNitE];
  console.log(`OSM Niteroi raw: ${ofmNit.length}, OSM JF raw: ${ofmJf.length}`);

  function enrichBuilding(cx, cy, cityData, fallbackCity) {
    // Find nearest street anchor within ~160m (0.0015 deg)
    let bestAnchor = null;
    let bestD2 = 0.0015 * 0.0015;
    for (const a of cityData.anchors) {
      const dLat = a.lat - cy;
      const dLng = a.lng - cx;
      const d2 = dLat * dLat + dLng * dLng;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestAnchor = a;
      }
    }
    if (bestAnchor) {
      return {
        a: bestAnchor.label,
        b: bestAnchor.bairro || fallbackCity,
        m2: bestAnchor.m2,
        tx: bestAnchor.tx,
        liq: bestAnchor.liq,
        spr: bestAnchor.spr,
      };
    }
    // Nearest bairro anchor within ~2km (0.02 deg)
    let bestB = null;
    let bestBD2 = 0.02 * 0.02;
    for (const ba of cityData.bairroAnchors) {
      const dLat = ba.lat - cy;
      const dLng = ba.lng - cx;
      const d2 = dLat * dLat + dLng * dLng;
      if (d2 < bestBD2) {
        bestBD2 = d2;
        bestB = ba;
      }
    }
    if (bestB) {
      return {
        a: '',
        b: bestB.bairro || fallbackCity,
        m2: bestB.m2,
        tx: bestB.tx,
        liq: bestB.liq,
        spr: bestB.spr,
      };
    }
    return {
      a: '',
      b: fallbackCity,
      m2: cityData.cityMedian,
      tx: 0,
      liq: 2,
      spr: 0,
    };
  }

  const features = [];
  const sigeoGrid = new Set();
  let nextId = 1;

  // Add SIGEO official Niteroi buildings first
  for (const f of sigeo.usos) {
    if (!f.geometry || !f.geometry.coordinates) continue;
    const rings = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates[0];
    if (!rings || !rings.length || rings[0].length < 4) continue;
    const rounded = rings.map(roundRing);
    const [cx, cy] = polygonCentroid(rounded);
    sigeoGrid.add(`${Math.round(cy * 4500)}_${Math.round(cx * 4500)}`);

    const up = f.properties || {};
    const clipKey = `${Math.round(cy * 5000)}_${Math.round(cx * 5000)}`;
    const cp = sigeo.clipByCoord.get(clipKey) || {};
    let h = 0;
    const gab = Number(cp.gabarito || 0);
    const pav = Number(up.tx_npavime || 0);
    const altMed = Number(up.db_altmed || cp.mean || 0);
    if (altMed > 2 && altMed < 160) h = Math.round(altMed);
    else if (gab > 0 && gab < 60) h = Math.round(gab * 3.1);
    else if (pav > 0 && pav < 60) h = Math.round(pav * 3.1);
    else h = 9;

    const enriched = enrichBuilding(cx, cy, nitData, up.tx_bairro || cp.bairro || 'Niterói');
    features.push({
      type: 'Feature',
      properties: {
        id: nextId++,
        h: Math.max(4, h),
        b: up.tx_bairro || cp.bairro || enriched.b,
        a: cp.nome || enriched.a || undefined,
        m2: enriched.m2,
        tx: enriched.tx,
        liq: enriched.liq,
        spr: enriched.spr,
      },
      geometry: { type: 'Polygon', coordinates: rounded },
    });
  }

  // Add OpenFreeMap Niteroi buildings outside SIGEO overlap
  const dedupOfm = new Set();
  for (const b of ofmNit) {
    const gk = `${Math.round(b.cy * 4500)}_${Math.round(b.cx * 4500)}`;
    if (sigeoGrid.has(gk)) continue;
    if (dedupOfm.has(gk)) continue;
    dedupOfm.add(gk);
    const enriched = enrichBuilding(b.cx, b.cy, nitData, 'Niterói');
    features.push({
      type: 'Feature',
      properties: {
        id: nextId++,
        h: b.h,
        b: b.osmBairro || enriched.b,
        a: b.osmAddr || enriched.a || undefined,
        m2: enriched.m2,
        tx: enriched.tx,
        liq: enriched.liq,
        spr: enriched.spr,
      },
      geometry: { type: 'Polygon', coordinates: b.coords },
    });
  }

  // Add Juiz de Fora buildings
  const dedupJf = new Set();
  for (const b of ofmJf) {
    const gk = `${Math.round(b.cy * 4500)}_${Math.round(b.cx * 4500)}`;
    if (dedupJf.has(gk)) continue;
    dedupJf.add(gk);
    const enriched = enrichBuilding(b.cx, b.cy, jfData, 'Juiz de Fora');
    features.push({
      type: 'Feature',
      properties: {
        id: nextId++,
        h: b.h,
        b: b.osmBairro || enriched.b,
        a: b.osmAddr || enriched.a || undefined,
        m2: enriched.m2,
        tx: enriched.tx,
        liq: enriched.liq,
        spr: enriched.spr,
      },
      geometry: { type: 'Polygon', coordinates: b.coords },
    });
  }

  fs.mkdirSync(path.join(ROOT, 'public/data'), { recursive: true });
  const outPath = path.join(ROOT, 'public/data/niteroi_jf_edificacoes.geojson');
  const fc = { type: 'FeatureCollection', features };
  fs.writeFileSync(outPath, JSON.stringify(fc));
  const mb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`Done! Wrote ${features.length} 3D building polygons to ${outPath} (${mb} MB).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
