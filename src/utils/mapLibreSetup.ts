import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

export type RioBuildingMetric = 'auctions' | 'm2' | 'liq' | 'spr';

export function getTypologyColor(propertyType?: string): string {
  const t = (propertyType || '').toLowerCase();
  if (t.includes('casa') || t.includes('sobrado')) return '#22c55e';
  if (t.includes('comercial') || t.includes('loja') || t.includes('sala') || t.includes('galpao') || t.includes('predio')) return '#facc15';
  if (t.includes('terreno') || t.includes('lote') || t.includes('gleba')) return '#c084fc';
  return '#38bdf8';
}

export const OPENFREEMAP_DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';
export const OPENFREEMAP_LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/positron';

let protocolRegistered = false;

export function ensureMapLibrePMTilesProtocol() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    maplibregl.setWorkerUrl(`${window.location.origin}/maplibre-gl-worker.mjs`);
  }
  if (!protocolRegistered) {
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    protocolRegistered = true;
  }
  return maplibregl;
}

/** Converts app internal [lat, lng] coordinates to MapLibre GeoJSON [lng, lat]. */
export function toLngLat(coords: [number, number]): [number, number] {
  return [coords[1], coords[0]];
}

export function getRioPMTilesUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `pmtiles://${window.location.origin}/tiles/rio_edificacoes.pmtiles`;
  }
  return 'pmtiles:///tiles/rio_edificacoes.pmtiles';
}

export function buildSatelliteStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    name: 'Satellite Hybrid',
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Tiles &copy; Esri',
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

export function getBuildingColorExpression(metric: RioBuildingMetric, isLightTheme = false): any {
  const defaultNeutral = isLightTheme ? '#cbd5e1' : '#262d3a';
  const missingNeutral = isLightTheme ? '#dbe3ec' : '#2a303c';
  if (metric === 'auctions') {
    return defaultNeutral;
  }
  if (metric === 'liq') {
    return [
      'case',
      ['<=', ['coalesce', ['get', 'liq'], 0], 0],
      missingNeutral,
      [
        'interpolate',
        ['linear'],
        ['get', 'liq'],
        1, '#f43f5e',
        3, '#f59e0b',
        5, '#4ade80',
        7, '#16a34a',
        9, '#1e3a8a',
        10, '#1e3a8a',
      ],
    ];
  }

  if (metric === 'spr') {
    return [
      'case',
      ['!', ['has', 'spr']],
      missingNeutral,
      [
        'interpolate',
        ['linear'],
        ['get', 'spr'],
        -25, '#f43f5e',
        -10, '#f59e0b',
        0, '#4ade80',
        15, '#16a34a',
        25, '#1e3a8a',
      ],
    ];
  }

  // Default: R$/m² ITBI blue gradient (< 2.7k light blue up to > 18k dark blue)
  return [
    'case',
    ['<=', ['coalesce', ['get', 'm2'], 0], 0],
    missingNeutral,
    [
      'step',
      ['get', 'm2'],
      '#7dd3fc', // < 2.700
      2700, '#38bdf8', // 2.7k - 4.5k
      4500, '#0ea5e9', // 4.5k - 6.8k
      6800, '#0284c7', // 6.8k - 9.5k
      9500, '#2563eb', // 9.5k - 12.5k
      12500, '#1d4ed8', // 12.5k - 18k
      18000, '#1e3a8a', // > 18k
    ],
  ];
}

export function upsertRio3DBuildingsLayer(
  map: maplibregl.Map,
  metric: RioBuildingMetric,
  options?: { opacity?: number; show3D?: boolean; isLightTheme?: boolean }
) {
  let style: any;
  try {
    style = map.getStyle();
  } catch {
    return;
  }
  if (!style || !Array.isArray(style.layers)) return;

  const styleLayers = style.layers;
  // Keep OpenFreeMap flat building footprints unobtrusive and avoid OSM 3D collisions
  for (const layer of styleLayers) {
    const idLower = layer.id.toLowerCase();
    if (
      idLower.includes('building') &&
      idLower !== 'rio-edificacoes-3d' &&
      idLower !== 'rio-edificacoes-itbi-flat' &&
      !idLower.startsWith('auctions-buildings')
    ) {
      try {
        if (layer.type === 'fill-extrusion') {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        } else if (layer.type === 'fill') {
          map.setPaintProperty(layer.id, 'fill-opacity', 0.25);
        }
      } catch {}
    }
  }

  if (!map.getSource('rio-edificacoes')) {
    map.addSource('rio-edificacoes', {
      type: 'vector',
      url: getRioPMTilesUrl(),
      minzoom: 12,
      maxzoom: 15,
    });
  }

  // Insert 3D buildings below road/neighborhood symbol labels for clean cartography
  const beforeSymbolLayer = styleLayers.find((l) => l.type === 'symbol')?.id;
  const colorExpr = getBuildingColorExpression(metric, Boolean(options?.isLightTheme));
  const show3D = options?.show3D !== false;
  const opacity = options?.opacity ?? 0.88;

  if (!map.getLayer('rio-edificacoes-3d')) {
    map.addLayer(
      {
        id: 'rio-edificacoes-3d',
        type: 'fill-extrusion',
        source: 'rio-edificacoes',
        'source-layer': 'edificacoes',
        minzoom: 12,
        paint: {
          'fill-extrusion-color': colorExpr,
          'fill-extrusion-height': show3D
            ? ['interpolate', ['linear'], ['zoom'], 12, ['*', ['coalesce', ['get', 'h'], 5], 0.35], 13.5, ['coalesce', ['get', 'h'], 5]]
            : 0.5,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': opacity,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      beforeSymbolLayer
    );
  } else {
    map.setPaintProperty('rio-edificacoes-3d', 'fill-extrusion-color', colorExpr);
    map.setPaintProperty(
      'rio-edificacoes-3d',
      'fill-extrusion-height',
      show3D
        ? ['interpolate', ['linear'], ['zoom'], 12, ['*', ['coalesce', ['get', 'h'], 5], 0.35], 13.5, ['coalesce', ['get', 'h'], 5]]
        : 0.5
    );
    map.setPaintProperty('rio-edificacoes-3d', 'fill-extrusion-opacity', opacity);
  }
}

export { maplibregl };
