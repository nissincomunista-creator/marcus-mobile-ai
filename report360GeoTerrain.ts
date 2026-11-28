import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { contours } from 'd3-contour';

export interface TerrainContourLine {
  elev: number;
  isMaster: boolean;
  path: string;
  labelPt?: [number, number];
}

export interface TerrainGeoPayload {
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  nx: number;
  ny: number;
  gridSmooth: number[];
  minAlt: number;
  maxAlt: number;
  contours5m: TerrainContourLine[];
  handPolys: { highPath: string; medPath: string };
  flowLines: Array<{ path: string; weight: number }>;
  osmWaterways: Array<{ path: string; name?: string }>;
  officialFloodPaths: string[];
  handAtCenterM: number;
  nearestRealStreamM: number | null;
}

const CACHE_DIR_TILES = path.join(process.cwd(), '.cache', 'map-tiles');
const CACHE_DIR_TERRAIN = path.join(process.cwd(), '.cache', 'terrain-hydro');

function lngToTileXFloat(lng: number, z: number): number {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

function latToTileYFloat(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z);
}

async function fetchTerrariumTile(z: number, tx: number, ty: number): Promise<PNG | null> {
  const cacheFile = path.join(CACHE_DIR_TILES, `dem_${z}_${tx}_${ty}.png`);
  try {
    if (fs.existsSync(cacheFile)) {
      const buf = fs.readFileSync(cacheFile);
      if (buf.length > 200) return PNG.sync.read(buf);
    }
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null;
    try {
      fs.mkdirSync(CACHE_DIR_TILES, { recursive: true });
      fs.writeFileSync(cacheFile, buf);
    } catch {}
    return PNG.sync.read(buf);
  } catch {
    return null;
  }
}

function samplePngElev(png: PNG, px: number, py: number): number {
  const x = Math.max(0, Math.min(png.width - 1, Math.round(px)));
  const y = Math.max(0, Math.min(png.height - 1, Math.round(py)));
  const idx = (y * png.width + x) * 4;
  const r = png.data[idx];
  const g = png.data[idx + 1];
  const b = png.data[idx + 2];
  const raw = r * 256 + g + b / 256 - 32768;
  return Math.max(0, Math.min(1800, raw));
}

function multiPolygonCoordsToSvgPath(
  multiPolyCoords: number[][][][],
  nx: number,
  ny: number,
  w = 280,
  h = 175
): { path: string; bestLabelPt?: [number, number] } {
  const sx = w / (nx - 1);
  const sy = h / (ny - 1);
  let d = '';
  let bestLen = 0;
  let bestLabelPt: [number, number] | undefined;

  for (const poly of multiPolyCoords) {
    for (const ring of poly) {
      if (!ring || ring.length < 2) continue;
      if (ring.length > bestLen) {
        bestLen = ring.length;
        const mid = ring[Math.floor(ring.length / 2)];
        if (mid) bestLabelPt = [Number((mid[0] * sx).toFixed(1)), Number((mid[1] * sy).toFixed(1))];
      }
      for (let i = 0; i < ring.length; i++) {
        const pt = ring[i];
        const x = (pt[0] * sx).toFixed(1);
        const y = (pt[1] * sy).toFixed(1);
        d += i === 0 ? `M${x},${y}` : `L${x},${y}`;
      }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first && last && Math.hypot(first[0] - last[0], first[1] - last[1]) < 1.5) {
        d += 'Z';
      }
    }
  }
  return { path: d, bestLabelPt };
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const hydroMemCache = new Map<
  string,
  { osmWaterways: Array<{ coords: Array<[number, number]>; name?: string }>; officialFloodRings: Array<Array<[number, number]>> }
>();

async function fetchOsmWaterwaysAndFlood(
  lat: number,
  lng: number,
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): Promise<{
  osmWaterways: Array<{ coords: Array<[number, number]>; name?: string }>;
  officialFloodRings: Array<Array<[number, number]>>;
}> {
  const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const memHit = hydroMemCache.get(key);
  if (memHit) return memHit;

  const cacheFile = path.join(CACHE_DIR_TERRAIN, `hydro_${key}.json`);
  try {
    if (fs.existsSync(cacheFile)) {
      const parsed = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      if (parsed && Array.isArray(parsed.osmWaterways)) {
        hydroMemCache.set(key, parsed);
        return parsed;
      }
    }
  } catch {}

  const osmWaterways: Array<{ coords: Array<[number, number]>; name?: string }> = [];
  const officialFloodRings: Array<Array<[number, number]>> = [];

  // Run Overpass waterways + Geo-Rio official flood polygons IN PARALLEL with tight timeouts
  const overpassTask = (async () => {
    try {
      const query = `[out:json][timeout:3];(way["waterway"~"^(river|stream|canal|drain|ditch)$"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}););out geom;`;
      const r = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(2200),
      });
      if (r.ok) {
        const json: any = await r.json();
        for (const el of json?.elements || []) {
          if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 2) {
            osmWaterways.push({
              name: el.tags?.name || el.tags?.waterway || undefined,
              coords: el.geometry.map((g: any) => [Number(g.lat), Number(g.lon)] as [number, number]),
            });
          }
        }
      }
    } catch {}
  })();

  const geoRioTask = (async () => {
    if (!(lat < -22.6 && lng < -43.05)) return;
    try {
      const envParam = encodeURIComponent(`${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`);
      const rioHydroUrl = `https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Georio/Alagamento_Enchentes/MapServer/0/query?geometry=${envParam}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&f=geojson&outFields=*`;
      const rr = await fetch(rioHydroUrl, { signal: AbortSignal.timeout(1800) });
      if (rr.ok) {
        const gj: any = await rr.json();
        for (const f of gj?.features || []) {
          const g = f?.geometry;
          if (g?.type === 'Polygon' && Array.isArray(g.coordinates?.[0])) {
            officialFloodRings.push(g.coordinates[0].map((c: number[]) => [c[1], c[0]]));
          } else if (g?.type === 'MultiPolygon') {
            for (const p of g.coordinates || []) {
              if (Array.isArray(p?.[0])) officialFloodRings.push(p[0].map((c: number[]) => [c[1], c[0]]));
            }
          }
        }
      }
    } catch {}
  })();

  await Promise.all([overpassTask, geoRioTask]);

  const result = { osmWaterways, officialFloodRings };
  hydroMemCache.set(key, result);
  try {
    fs.mkdirSync(CACHE_DIR_TERRAIN, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(result));
  } catch {}

  return result;
}

/**
 * Computes real 5m/25m Marching Squares contour lines, D8 surface flow lines, HAND flood bands,
 * and integrates OSM waterways + municipal flood GIS data over AWS Terrarium DEM tiles.
 */
export async function buildTerrainAndHydrologyPayload(
  lat: number,
  lng: number,
  fallbackElevM: number
): Promise<TerrainGeoPayload> {
  const nx = 44;
  const ny = 28;
  const halfLatSpan = 0.0038; // ~840m N-S
  const halfLngSpan = 0.0056; // ~1150m W-E
  const bbox = {
    minLat: lat - halfLatSpan,
    maxLat: lat + halfLatSpan,
    minLng: lng - halfLngSpan,
    maxLng: lng + halfLngSpan,
  };

  // Load Terrarium z=14 DEM tiles covering the bbox
  const z = 14;
  const txMin = Math.floor(lngToTileXFloat(bbox.minLng, z));
  const txMax = Math.floor(lngToTileXFloat(bbox.maxLng, z));
  const tyMin = Math.floor(latToTileYFloat(bbox.maxLat, z));
  const tyMax = Math.floor(latToTileYFloat(bbox.minLat, z));

  const tileCache = new Map<string, PNG>();
  const tilePromises: Promise<void>[] = [];
  for (let ty = tyMin; ty <= tyMax; ty++) {
    for (let tx = txMin; tx <= txMax; tx++) {
      tilePromises.push(
        fetchTerrariumTile(z, tx, ty).then((png) => {
          if (png) tileCache.set(`${tx}_${ty}`, png);
        })
      );
    }
  }

  const hydroPromise = fetchOsmWaterwaysAndFlood(lat, lng, bbox);
  await Promise.all([...tilePromises, hydroPromise]);
  const { osmWaterways, officialFloodRings } = await hydroPromise;

  const elevGrid = new Float64Array(nx * ny);
  let hasRealDem = tileCache.size > 0;

  for (let row = 0; row < ny; row++) {
    const cLat = bbox.maxLat - (row / (ny - 1)) * (bbox.maxLat - bbox.minLat);
    const tyF = latToTileYFloat(cLat, z);
    const ty = Math.floor(tyF);
    const py = (tyF - ty) * 255;

    for (let col = 0; col < nx; col++) {
      const cLng = bbox.minLng + (col / (nx - 1)) * (bbox.maxLng - bbox.minLng);
      const txF = lngToTileXFloat(cLng, z);
      const tx = Math.floor(txF);
      const px = (txF - tx) * 255;
      const png = tileCache.get(`${tx}_${ty}`);
      if (png) {
        elevGrid[row * nx + col] = samplePngElev(png, px, py);
      } else {
        hasRealDem = false;
        elevGrid[row * nx + col] = Math.max(2, fallbackElevM + (ny / 2 - row) * 0.8 + Math.abs(col - nx / 2) * 0.4);
      }
    }
  }

  // Subtle 3x3 Gaussian-like pass to eliminate minor radar DEM noise before Marching Squares
  const smoothGrid = new Float64Array(nx * ny);
  for (let r = 0; r < ny; r++) {
    for (let c = 0; c < nx; c++) {
      let sum = 0;
      let wSum = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = Math.max(0, Math.min(ny - 1, r + dr));
          const cc = Math.max(0, Math.min(nx - 1, c + dc));
          const w = dr === 0 && dc === 0 ? 4 : dr === 0 || dc === 0 ? 2 : 1;
          sum += elevGrid[rr * nx + cc] * w;
          wSum += w;
        }
      }
      smoothGrid[r * nx + c] = hasRealDem ? sum / wSum : elevGrid[r * nx + c];
    }
  }

  let minAlt = Infinity;
  let maxAlt = -Infinity;
  for (let i = 0; i < smoothGrid.length; i++) {
    if (smoothGrid[i] < minAlt) minAlt = smoothGrid[i];
    if (smoothGrid[i] > maxAlt) maxAlt = smoothGrid[i];
  }
  minAlt = Math.floor(minAlt);
  maxAlt = Math.ceil(Math.max(maxAlt, minAlt + 5));

  // Real 5m & 25m Marching Squares contour isolines
  const first5 = Math.ceil(minAlt / 5) * 5;
  const thresholds5: number[] = [];
  for (let v = first5; v <= maxAlt; v += 5) thresholds5.push(v);
  if (thresholds5.length > 36) {
    // Cap contour count on extreme mountain cliffs to keep SVG lightweight
    const step = thresholds5.length > 60 ? 10 : 5;
    thresholds5.length = 0;
    for (let v = first5; v <= maxAlt; v += step) thresholds5.push(v);
  }

  const gen = contours().size([nx, ny]).smooth(true).thresholds(thresholds5);
  const contourBands = gen(Array.from(smoothGrid));
  const contours5m: TerrainContourLine[] = [];
  for (const band of contourBands) {
    if (!band.coordinates || band.coordinates.length === 0) continue;
    const isMaster = band.value % 25 === 0 || (maxAlt - minAlt <= 25 && band.value % 10 === 0);
    const converted = multiPolygonCoordsToSvgPath(band.coordinates, nx, ny, 280, 175);
    if (!converted.path) continue;
    contours5m.push({
      elev: band.value,
      isMaster,
      path: converted.path,
      labelPt: isMaster ? converted.bestLabelPt : undefined,
    });
  }

  // Pit filling (mild 2-pass depression fill) before D8 flow accumulation
  const hydroElev = new Float64Array(smoothGrid);
  const nbrOffsets = [
    [-1, -1, 1.414], [-1, 0, 1], [-1, 1, 1.414],
    [0, -1, 1], [0, 1, 1],
    [1, -1, 1.414], [1, 0, 1], [1, 1, 1.414],
  ];
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 1; r < ny - 1; r++) {
      for (let c = 1; c < nx - 1; c++) {
        const idx = r * nx + c;
        let lowestNbr = Infinity;
        for (const [dr, dc] of nbrOffsets) {
          const nv = hydroElev[(r + dr) * nx + (c + dc)];
          if (nv < lowestNbr) lowestNbr = nv;
        }
        if (hydroElev[idx] < lowestNbr) hydroElev[idx] = lowestNbr + 0.05;
      }
    }
  }

  // Compute D8 steepest descent pointer
  const d8Target = new Int32Array(nx * ny).fill(-1);
  for (let r = 1; r < ny - 1; r++) {
    for (let c = 1; c < nx - 1; c++) {
      const idx = r * nx + c;
      const cur = hydroElev[idx];
      let bestSlope = 0;
      let bestIdx = -1;
      for (const [dr, dc, dist] of nbrOffsets) {
        const nIdx = (r + dr) * nx + (c + dc);
        const drop = (cur - hydroElev[nIdx]) / dist;
        if (drop > bestSlope) {
          bestSlope = drop;
          bestIdx = nIdx;
        }
      }
      d8Target[idx] = bestIdx;
    }
  }

  // Accumulate upstream flow high-to-low
  const acc = new Float64Array(nx * ny).fill(1);
  const order = Array.from({ length: nx * ny }, (_, i) => i).sort((a, b) => hydroElev[b] - hydroElev[a]);
  for (const idx of order) {
    const nxt = d8Target[idx];
    if (nxt >= 0) acc[nxt] += acc[idx];
  }

  // Mark drainage network cells (D8 streams + proximity to OSM waterways)
  const isChannel = new Uint8Array(nx * ny);
  const channelThreshold = 14;
  for (let i = 0; i < acc.length; i++) {
    if (acc[i] >= channelThreshold) isChannel[i] = 1;
  }

  // Map lat/lng -> SVG [280, 175]
  const geoToSvg = (pLat: number, pLng: number): [number, number] => [
    ((pLng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * 280,
    ((bbox.maxLat - pLat) / (bbox.maxLat - bbox.minLat)) * 175,
  ];

  // Mark cells along real OSM waterways as definite drainage channels too
  let nearestRealStreamM: number | null = null;
  const osmWaterwayPaths: Array<{ path: string; name?: string }> = [];
  for (const w of osmWaterways) {
    let pStr = '';
    for (let i = 0; i < w.coords.length; i++) {
      const [wLat, wLng] = w.coords[i];
      const distM = haversineMeters(lat, lng, wLat, wLng);
      if (nearestRealStreamM === null || distM < nearestRealStreamM) nearestRealStreamM = Math.round(distM);
      const col = Math.round(((wLng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * (nx - 1));
      const row = Math.round(((bbox.maxLat - wLat) / (bbox.maxLat - bbox.minLat)) * (ny - 1));
      if (row >= 0 && row < ny && col >= 0 && col < nx) isChannel[row * nx + col] = 1;
      const [sx, sy] = geoToSvg(wLat, wLng);
      pStr += i === 0 ? `M${sx.toFixed(1)},${sy.toFixed(1)}` : `L${sx.toFixed(1)},${sy.toFixed(1)}`;
    }
    if (pStr) osmWaterwayPaths.push({ path: pStr, name: w.name });
  }

  // Compute HAND (Height Above Nearest Drainage) via D8 trace down to channel / boundary sink
  const handGrid = new Float64Array(nx * ny);
  for (let i = 0; i < nx * ny; i++) {
    if (isChannel[i]) {
      handGrid[i] = 0;
      continue;
    }
    let cur = i;
    let steps = 0;
    while (cur >= 0 && !isChannel[cur] && steps < 64) {
      const nxt = d8Target[cur];
      if (nxt < 0) break;
      cur = nxt;
      steps++;
    }
    const drainElev = cur >= 0 ? smoothGrid[cur] : minAlt;
    handGrid[i] = Math.max(0, smoothGrid[i] - drainElev);
  }

  const centerRow = Math.floor(ny / 2);
  const centerCol = Math.floor(nx / 2);
  const handAtCenterM = Number(handGrid[centerRow * nx + centerCol].toFixed(1));

  // Generate smooth flood susceptibility bands from HAND: invert scale so d3-contour isolates <= 2m & <= 5m
  const invHand = Array.from(handGrid, (h) => Math.max(0, 10 - h));
  const handContours = contours().size([nx, ny]).smooth(true).thresholds([5, 8])(invHand); // inv >= 8 => HAND <= 2m; inv >= 5 => HAND <= 5m
  const medBand = handContours.find((c) => c.value === 5);
  const highBand = handContours.find((c) => c.value === 8);
  const medPath = medBand ? multiPolygonCoordsToSvgPath(medBand.coordinates, nx, ny, 280, 175).path : '';
  const highPath = highBand ? multiPolygonCoordsToSvgPath(highBand.coordinates, nx, ny, 280, 175).path : '';

  // Extract main D8 flowlines (polylines downstream across cells with acc >= 10)
  const flowLines: Array<{ path: string; weight: number }> = [];
  const sx = 280 / (nx - 1);
  const sy = 175 / (ny - 1);
  for (let r = 1; r < ny - 1; r++) {
    for (let c = 1; c < nx - 1; c++) {
      const idx = r * nx + c;
      if (acc[idx] < 10) continue;
      const nxt = d8Target[idx];
      if (nxt < 0) continue;
      const nr = Math.floor(nxt / nx);
      const nc = nxt % nx;
      const x1 = (c * sx).toFixed(1);
      const y1 = (r * sy).toFixed(1);
      const x2 = (nc * sx).toFixed(1);
      const y2 = (nr * sy).toFixed(1);
      flowLines.push({
        path: `M${x1},${y1} L${x2},${y2}`,
        weight: Math.min(3, 0.8 + Math.log10(acc[idx]) * 0.9),
      });
    }
  }

  // Official flood polygon SVG paths (Geo-Rio / CPRM)
  const officialFloodPaths: string[] = [];
  for (const ring of officialFloodRings) {
    if (ring.length < 3) continue;
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [px, py] = geoToSvg(ring[i][0], ring[i][1]);
      d += i === 0 ? `M${px.toFixed(1)},${py.toFixed(1)}` : `L${px.toFixed(1)},${py.toFixed(1)}`;
    }
    officialFloodPaths.push(d + 'Z');
  }

  // Distance to nearest DEM flow channel if no OSM named waterway
  if (nearestRealStreamM === null) {
    let minGridDist = Infinity;
    for (let r = 0; r < ny; r++) {
      for (let c = 0; c < nx; c++) {
        if (!isChannel[r * nx + c]) continue;
        const dMeters = Math.hypot((r - centerRow) * 30, (c - centerCol) * 26);
        if (dMeters < minGridDist) minGridDist = dMeters;
      }
    }
    if (Number.isFinite(minGridDist)) nearestRealStreamM = Math.max(25, Math.round(minGridDist));
  }

  return {
    bbox,
    nx,
    ny,
    gridSmooth: Array.from(smoothGrid, (v) => Number(v.toFixed(1))),
    minAlt,
    maxAlt,
    contours5m,
    handPolys: { highPath, medPath },
    flowLines,
    osmWaterways: osmWaterwayPaths,
    officialFloodPaths,
    handAtCenterM,
    nearestRealStreamM,
  };
}
