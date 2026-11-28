import * as maplibregl from 'maplibre-gl';
import {
  OPENFREEMAP_LIGHT_STYLE,
  ensureMapLibrePMTilesProtocol,
  getBuildingColorExpression,
  upsertRio3DBuildingsLayer,
} from './mapLibreSetup.ts';
import { getOrAttachSolarShadowEngine } from '../map/SolarShadowEngine.ts';

export interface App3DReportCaptures {
  overview3dUrl: string;
  morning0700Url: string;
  afternoon1600Url: string;
  sqm3dUrl: string;
  spread3dUrl: string;
}

const captureCache = new Map<string, App3DReportCaptures>();

function waitFrames(n = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function waitForIdle(map: maplibregl.Map, timeoutMs = 6500): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    map.once('idle', finish);
    map.triggerRepaint();
  });
}

/**
 * Eliminates any race condition before snapshots:
 * waits for MapLibre `idle` AND confirms extruded 3D buildings actually finished loading,
 * then waits 2 extra `requestAnimationFrame` cycles before capturing `toDataURL('image/png')`.
 */
async function waitReadyAndSnapshot(map: maplibregl.Map, minBuildings = 8, maxAttempts = 3): Promise<string> {
  const bldLayers = ['rio-edificacoes-3d', 'cities-3d-edificacoes-3d'].filter((l) => Boolean(map.getLayer(l)));
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await waitForIdle(map, attempt === 0 ? 7500 : 3000);
    const feats = bldLayers.length ? map.queryRenderedFeatures({ layers: bldLayers }) : [];
    if (feats.length >= minBuildings && map.areTilesLoaded()) {
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  map.triggerRepaint();
  await waitFrames(2);
  return map.getCanvas().toDataURL('image/png');
}

/**
 * Captures 5 high-fidelity WebGL PNG screenshots directly from our 3D MapLibre renderer
 * (`preserveDrawingBuffer: true`, ShadeMap landscape palette, active terrain relief, zero UI overlays):
 * - Page 3 (`sqm3dUrl` & `spread3dUrl`): Wide ~250m tilted 3D framing matching the main map's `R$/m²` & `Spread` layers
 * - Page 6 (`overview3dUrl`, `morning0700Url`, `afternoon1600Url`): Tilted 3D massing + `SolarShadowEngine` Stencil shadows at 07:00 & 16:00
 */
export async function captureOwnApp3DViews(lat: number, lng: number): Promise<App3DReportCaptures | null> {
  if (typeof document === 'undefined' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const cacheKey = `v2|${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = captureCache.get(cacheKey);
  if (cached) return cached;

  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:0px;top:0px;width:920px;height:300px;pointer-events:none;opacity:0.015;z-index:-10;overflow:hidden;';
  document.body.appendChild(host);

  let map: maplibregl.Map | null = null;
  try {
    ensureMapLibrePMTilesProtocol();
    map = new maplibregl.Map({
      container: host,
      style: OPENFREEMAP_LIGHT_STYLE,
      center: [lng, lat],
      zoom: 14.85,
      pitch: 57,
      bearing: -15,
      pixelRatio: Math.min(2, window.devicePixelRatio || 1.5),
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true, stencil: true },
    } as any);

    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 7500);
      map!.on('load', () => {
        clearTimeout(t);
        resolve();
      });
    });

    // Attach 3D buildings + relief + landscape palette (zero POIs, clean streets)
    upsertRio3DBuildingsLayer(map, 'm2', {
      show3D: true,
      showRelief: true,
      opacity: 0.96,
      isLightTheme: true,
    });

    // Attach SolarShadowEngine right below extruded 3D buildings (starts OFF for Page 3 captures)
    const shadowEngine = getOrAttachSolarShadowEngine(map);
    shadowEngine.setEnabled(false);

    // Highlight ONLY the single target property pin (no cluster dots, no UI controls)
    map.addSource('report-target-pin', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }],
      },
    });
    map.addLayer({
      id: 'report-target-halo',
      type: 'circle',
      source: 'report-target-pin',
      paint: { 'circle-radius': 15, 'circle-color': '#facc15', 'circle-opacity': 0.45 },
    });
    map.addLayer({
      id: 'report-target-dot',
      type: 'circle',
      source: 'report-target-pin',
      paint: {
        'circle-radius': 7,
        'circle-color': '#ea580c',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2.5,
      },
    });

    // =========================================================================
    // 1. PÁGINA 3 — ITBI R$/m² por Prédio - Visão Ampla 3D (~250m escala)
    // =========================================================================
    const m2Ramp = getBuildingColorExpression('m2', true);
    if (map.getLayer('rio-edificacoes-3d')) map.setPaintProperty('rio-edificacoes-3d', 'fill-extrusion-color', m2Ramp);
    if (map.getLayer('cities-3d-edificacoes-3d')) map.setPaintProperty('cities-3d-edificacoes-3d', 'fill-extrusion-color', m2Ramp);
    const sqm3dUrl = await waitReadyAndSnapshot(map, 20, 4);

    // =========================================================================
    // 2. PÁGINA 3 — Spread vs Média do Bairro (%) - Visão Ampla 3D (~250m escala)
    // =========================================================================
    const sprRamp = getBuildingColorExpression('spr', true);
    if (map.getLayer('rio-edificacoes-3d')) map.setPaintProperty('rio-edificacoes-3d', 'fill-extrusion-color', sprRamp);
    if (map.getLayer('cities-3d-edificacoes-3d')) map.setPaintProperty('cities-3d-edificacoes-3d', 'fill-extrusion-color', sprRamp);
    const spread3dUrl = await waitReadyAndSnapshot(map, 20, 2);

    // =========================================================================
    // 3. PÁGINA 6 — Vista 3D Geométrica (Volumetria Predial & Relevo)
    // =========================================================================
    map.jumpTo({ center: [lng, lat], zoom: 15.45, pitch: 55, bearing: -16 });
    const neutralColor = '#cbd5e1';
    if (map.getLayer('rio-edificacoes-3d')) map.setPaintProperty('rio-edificacoes-3d', 'fill-extrusion-color', neutralColor);
    if (map.getLayer('cities-3d-edificacoes-3d')) map.setPaintProperty('cities-3d-edificacoes-3d', 'fill-extrusion-color', neutralColor);
    map.setLight({
      anchor: 'viewport',
      position: [1.3, 215, 38],
      color: '#ffffff',
      intensity: 0.62,
    });
    const overview3dUrl = await waitReadyAndSnapshot(map, 12, 3);

    // =========================================================================
    // 4 & 5. PÁGINA 6 — Sol da Manhã (07:00) e Sol da Tarde (16:00) com Stencil Engine
    // =========================================================================
    host.style.width = '560px';
    host.style.height = '330px';
    map.resize();
    map.jumpTo({ center: [lng, lat], zoom: 15.9, pitch: 40, bearing: -12 });
    await waitForIdle(map, 4500);

    // Rebuild shadows synchronously at 07:00 (East sun -> crisp West shadows) + 2 RAFs
    shadowEngine.rebuildFromMap(map, 7.0, true, false, true);
    map.triggerRepaint();
    await waitFrames(2);
    const morning0700Url = map.getCanvas().toDataURL('image/png');

    // Rebuild shadows synchronously at 16:00 (West sun -> crisp East shadows toward Botafogo Bay) + 2 RAFs
    shadowEngine.rebuildFromMap(map, 16.0, true, false, true);
    map.triggerRepaint();
    await waitFrames(2);
    const afternoon1600Url = map.getCanvas().toDataURL('image/png');

    const result: App3DReportCaptures = { overview3dUrl, morning0700Url, afternoon1600Url, sqm3dUrl, spread3dUrl };
    if (captureCache.size > 20) captureCache.clear();
    captureCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[App3DCapture] Offscreen snapshot skipped:', err);
    return null;
  } finally {
    try {
      map?.remove();
    } catch {}
    host.remove();
  }
}
