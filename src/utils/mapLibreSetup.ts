import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

export type RioBuildingMetric = 'auctions' | 'm2' | 'liq' | 'spr';

export function getTypologyColor(propertyType?: string): string {
  const t = (propertyType || '').toLowerCase();
  if (t.includes('casa') || t.includes('sobrado')) return '#10b981';
  if (t.includes('comercial') || t.includes('loja') || t.includes('sala') || t.includes('galpao') || t.includes('predio')) return '#f59e0b';
  if (t.includes('terreno') || t.includes('lote') || t.includes('gleba')) return '#a855f7';
  return '#3b82f6';
}

export const OPENFREEMAP_DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';

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

export function getBuildingColorExpression(metric: RioBuildingMetric): any {
  if (metric === 'auctions') {
    return '#262d3a';
  }
  if (metric === 'liq') {
    return [
      'case',
      ['<=', ['coalesce', ['get', 'liq'], 0], 0],
      '#2a303c',
      [
        'interpolate',
        ['linear'],
        ['get', 'liq'],
        1, '#334155',
        3, '#1d4ed8',
        5, '#0284c7',
        7, '#06b6d4',
        9, '#10b981',
        10, '#34d399',
      ],
    ];
  }

  if (metric === 'spr') {
    return [
      'case',
      ['!', ['has', 'spr']],
      '#2a303c',
      [
        'interpolate',
        ['linear'],
        ['get', 'spr'],
        -25, '#10b981',
        -10, '#06b6d4',
        0, '#3b82f6',
        12, '#f59e0b',
        25, '#f43f5e',
      ],
    ];
  }

  // Default: R$/m² ITBI blue gradient (< 2.7k to > 12.5k, #2a303c when no ITBI history)
  return [
    'case',
    ['<=', ['coalesce', ['get', 'm2'], 0], 0],
    '#2a303c',
    [
      'step',
      ['get', 'm2'],
      '#1e3a8a', // < 2.700
      2700, '#1d4ed8', // 2.7k - 4.5k
      4500, '#2563eb', // 4.5k - 6.8k
      6800, '#0284c7', // 6.8k - 9.5k
      9500, '#0ea5e9', // 9.5k - 12.5k
      12500, '#38bdf8', // 12.5k - 18k
      18000, '#7dd3fc', // > 18k
    ],
  ];
}

export function upsertRio3DBuildingsLayer(
  map: maplibregl.Map,
  metric: RioBuildingMetric,
  options?: { opacity?: number; show3D?: boolean }
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
    if (idLower.includes('building') && idLower !== 'rio-edificacoes-3d' && idLower !== 'rio-edificacoes-itbi-flat') {
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
  const colorExpr = getBuildingColorExpression(metric);
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
