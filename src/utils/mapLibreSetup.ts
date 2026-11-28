import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { SolarPositionInfo } from './solarShadows.ts';

export type RioBuildingMetric = 'auctions' | 'm2' | 'liq' | 'spr';

export function getTypologyColor(propertyType?: string): string {
  const t = (propertyType || '').toLowerCase();
  if (t.includes('casa') || t.includes('sobrado')) return '#22ff7a';
  if (t.includes('comercial') || t.includes('loja') || t.includes('sala') || t.includes('galpao') || t.includes('predio')) return '#ffe01b';
  if (t.includes('terreno') || t.includes('lote') || t.includes('gleba')) return '#d946ef';
  return '#00d4ff';
}

export const OPENFREEMAP_LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/positron';
export const OPENFREEMAP_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const TERRARIUM_TILES = ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'];

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
  const defaultNeutral = isLightTheme ? '#F4F5F7' : '#334866';
  const missingNeutral = isLightTheme ? '#F4F5F7' : '#3b5273';
  if (metric === 'auctions') {
    return defaultNeutral;
  }
  if (metric === 'liq') {
    return [
      'case',
      ['<=', ['coalesce', ['get', 'liq'], 0], 0],
      missingNeutral,
      [
        'step',
        ['get', 'liq'],
        '#A7F3D0', // 1 (Pontual)
        2, '#6EE7B7', // 2 - 3 (Baixa)
        4, '#10B981', // 4 - 5 (Média)
        6, '#059669', // 6 - 8 (Boa)
        9, '#047857', // 9 - 10 (Alta)
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
        -20, '#EF4444', // <= -20% (Abaixo da média)
        -10, '#F97316', // -10% a -20%
        0, '#94A3B8',   // Na média (±5%)
        10, '#38BDF8',  // +10% a +20%
        20, '#2563EB',  // > +20% (Acima da média)
      ],
    ];
  }

  // Default: R$/m² ITBI sequential blue gradient (< 2.7k light blue up to > 18k vibrant royal blue #2563EB)
  return [
    'case',
    ['<=', ['coalesce', ['get', 'm2'], 0], 0],
    missingNeutral,
    [
      'step',
      ['get', 'm2'],
      '#BAE6FD', // < 2.700
      2700, '#7DD3FC', // 2.7k - 4.5k
      4500, '#38BDF8', // 4.5k - 6.8k
      6800, '#0EA5E9', // 6.8k - 9.5k
      9500, '#0284C7', // 9.5k - 12.5k
      12500, '#3B82F6', // 12.5k - 18k
      18000, '#2563EB', // > 18k
    ],
  ];
}

export function applyLightLandscapePalette(map: maplibregl.Map) {
  let style: any;
  try {
    style = map.getStyle();
  } catch {
    return;
  }
  if (!style || !Array.isArray(style.layers)) return;

  // Inject rich OpenMapTiles natural/cartographic sublayers (real vegetation, beaches, parks, water contours, plazas)
  // NOTE: OpenMapTiles `park` layer contains huge Brazilian APA / conservation / zona de amortecimento zoning overlays
  // that falsely cover dense residential neighborhoods (Tanque, Quintino, Piedade, Copacabana, Santa Teresa, etc.).
  // Therefore we HIDE `park` and render real physical greens solely from `landcover` and verified green `landuse` classes.
  const hasOmtSource = Boolean(style.sources && style.sources.openmaptiles);
  if (hasOmtSource) {
    const firstWaterOrTransport =
      style.layers.find((l: any) =>
        l['source-layer'] === 'water' ||
        l['source-layer'] === 'waterway' ||
        l['source-layer'] === 'transportation' ||
        l['source-layer'] === 'building' ||
        l.id === 'rio-edificacoes-3d' ||
        l.type === 'symbol'
      )?.id;
    const firstTransportOrBuilding =
      style.layers.find((l: any) =>
        l['source-layer'] === 'transportation' ||
        l['source-layer'] === 'building' ||
        l.id === 'rio-edificacoes-3d' ||
        l.type === 'symbol'
      )?.id;
    const beforePathLayer = style.layers.find((l: any) => l.id === 'highway_path')?.id || firstTransportOrBuilding;

    const addSafeLayer = (spec: any, beforeId?: string) => {
      try {
        if (!map.getLayer(spec.id)) {
          map.addLayer(spec, beforeId);
        }
      } catch {}
    };

    // Real hillside vegetation, scrubs, meadows & urban parks/gardens (strictly excludes APA/farmland)
    addSafeLayer(
      {
        id: 'landcover-grass-custom',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: [
          'all',
          ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
          ['match', ['get', 'class'], ['grass', 'shrub', 'scrub'], true, false],
        ],
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'subclass'], 'park'], '#96D87B',
            ['==', ['get', 'subclass'], 'garden'], '#A4E08B',
            '#8FCF73',
          ],
          'fill-opacity': 0.94,
        },
      },
      firstWaterOrTransport
    );

    // Wetlands / mangroves in muted marsh sage-teal
    addSafeLayer(
      {
        id: 'landcover-wetland-custom',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: [
          'all',
          ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
          ['==', ['get', 'class'], 'wetland'],
        ],
        paint: { 'fill-color': '#86C1A6', 'fill-opacity': 0.88 },
      },
      firstWaterOrTransport
    );

    // Exposed granite rock outcrops (Pão de Açúcar, Dois Irmãos, Pedra da Gávea)
    addSafeLayer(
      {
        id: 'landcover-rock-custom',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: [
          'all',
          ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
          ['==', ['get', 'class'], 'rock'],
        ],
        paint: { 'fill-color': '#DED8CC', 'fill-opacity': 0.9 },
      },
      firstWaterOrTransport
    );

    // Verified green landuse only (sports pitches, playgrounds, gardens, cemeteries, parks — never residential/commercial lots)
    addSafeLayer(
      {
        id: 'landuse-green-custom',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: [
          'all',
          ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
          ['match', ['get', 'class'], ['grass', 'cemetery', 'recreation_ground', 'village_green', 'park', 'forest', 'meadow', 'garden', 'pitch', 'playground'], true, false],
        ],
        paint: { 'fill-color': '#A5DC8B', 'fill-opacity': 0.9 },
      },
      firstWaterOrTransport
    );

    // Beaches painted warm golden sand + crisp shoreline contour
    addSafeLayer(
      {
        id: 'landcover-beach-custom',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['all', ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false], ['match', ['get', 'class'], ['sand', 'beach'], true, false]],
        paint: { 'fill-color': '#F4E4BA', 'fill-opacity': 1 },
      },
      firstWaterOrTransport
    );
    addSafeLayer(
      {
        id: 'landcover-beach-outline-custom',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['all', ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false], ['match', ['get', 'class'], ['sand', 'beach'], true, false]],
        paint: { 'line-color': '#C9AF6E', 'line-width': 1.6, 'line-opacity': 0.95 },
      },
      firstTransportOrBuilding
    );

    // Crisp outline ONLY on physical public parks/squares (never conservation/APA zoning overlays)
    addSafeLayer(
      {
        id: 'landcover-park-outline-custom',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: [
          'all',
          ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
          ['==', ['get', 'class'], 'grass'],
          ['==', ['get', 'subclass'], 'park'],
        ],
        paint: { 'line-color': '#5A9E44', 'line-width': 1.25, 'line-opacity': 0.88 },
      },
      firstTransportOrBuilding
    );

    // Deep marine shoreline contour (unmistakably water, completely distinct from #00d4ff / #38bdf8 / #2563eb buildings)
    addSafeLayer(
      {
        id: 'water-outline-custom',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'water',
        filter: ['all', ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false], ['!=', ['get', 'brunnel'], 'tunnel']],
        paint: { 'line-color': '#103D59', 'line-width': 1.5, 'line-opacity': 0.94 },
      },
      firstTransportOrBuilding
    );

    // Contour around plaza paths, parks walkways & beach promenades
    addSafeLayer(
      {
        id: 'highway-plaza-casing',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['match', ['get', 'class'], ['path', 'pedestrian'], true, false]],
        paint: {
          'line-color': '#BDC6B4',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.4, 15, 2.8, 17, 4.2],
          'line-opacity': 0.9,
        },
      },
      beforePathLayer
    );
  }

  for (const layer of style.layers) {
    const id = layer.id;
    const idLower = id.toLowerCase();
    const srcLayer = String(layer['source-layer'] || '').toLowerCase();
    if (id.endsWith('-custom') || id === 'highway-plaza-casing') continue;

    try {
      // Hide POIs, shields, airports AND Positron's `park` zoning overlay layer (APA/protected_area boundaries)
      if (
        srcLayer === 'poi' ||
        srcLayer === 'aerodrome_label' ||
        srcLayer === 'park' ||
        idLower.includes('poi') ||
        idLower.includes('airport') ||
        idLower.includes('shield')
      ) {
        map.setLayoutProperty(id, 'visibility', 'none');
        continue;
      }

      if (id === 'background' && layer.type === 'background') {
        map.setPaintProperty(id, 'background-color', '#F1EFEA');
      } else if (layer.type === 'symbol') {
        if (srcLayer === 'water_name' || idLower.includes('water_name')) {
          map.setPaintProperty(id, 'text-color', '#FFFFFF');
          map.setPaintProperty(id, 'text-halo-color', '#0F3A56');
          map.setPaintProperty(id, 'text-halo-width', 1.6);
        } else if (idLower.includes('waterway') && idLower.includes('label')) {
          map.setPaintProperty(id, 'text-color', '#0F3A56');
          map.setPaintProperty(id, 'text-halo-color', 'rgba(255,255,255,0.92)');
          map.setPaintProperty(id, 'text-halo-width', 1.6);
        }
      } else if (layer.type === 'fill') {
        if (srcLayer === 'water' || idLower.startsWith('water')) {
          // Deep Prussian-marine water & pools so water NEVER blends with bright cyan/sky/royal 3D buildings
          map.setPaintProperty(id, 'fill-color', ['case', ['==', ['get', 'class'], 'swimming_pool'], '#136F8A', '#1B5E86']);
          map.setPaintProperty(id, 'fill-opacity', 1);
        } else if (idLower.includes('wood') || idLower.includes('forest')) {
          map.setPaintProperty(id, 'fill-color', '#6AB356');
          map.setPaintProperty(id, 'fill-opacity', 0.96);
        } else if (idLower.includes('grass') || idLower.includes('garden') || idLower.includes('pitch') || idLower.includes('cemetery')) {
          map.setPaintProperty(id, 'fill-color', '#93D278');
          map.setPaintProperty(id, 'fill-opacity', 0.95);
        } else if (
          srcLayer === 'landuse' ||
          idLower.includes('residential') ||
          idLower.includes('pier') ||
          idLower.includes('aeroway')
        ) {
          map.setPaintProperty(id, 'fill-color', '#F1EFEA');
          if (idLower.includes('residential')) map.setPaintProperty(id, 'fill-opacity', 0.35);
        }
      } else if (layer.type === 'line') {
        if (srcLayer === 'waterway' || idLower.includes('waterway')) {
          map.setPaintProperty(id, 'line-color', '#144D70');
          map.setPaintProperty(id, 'line-width', ['interpolate', ['linear'], ['zoom'], 11, 1.6, 14, 3.0, 17, 4.6]);
          map.setPaintProperty(id, 'line-opacity', 0.96);
        } else if (idLower.includes('casing') || idLower.includes('railway')) {
          map.setPaintProperty(id, 'line-color', '#D5D2CA');
        } else if (
          srcLayer === 'transportation' ||
          srcLayer === 'aeroway' ||
          idLower.includes('highway') ||
          idLower.includes('tunnel') ||
          idLower.includes('road') ||
          idLower.includes('aeroway')
        ) {
          map.setPaintProperty(id, 'line-color', '#FFFFFF');
          map.setPaintProperty(id, 'line-opacity', 1);
        }
      }
    } catch {}
  }

  try {
    map.setLight({
      anchor: 'viewport',
      position: [1.15, 210, 38],
      color: '#ffffff',
      intensity: 0.38,
    });
  } catch {}
}

export function applyTerrainRelief(map: maplibregl.Map, enabled: boolean) {
  try {
    if (!enabled) {
      map.setTerrain(null);
      if (map.getLayer('terrain-hillshade')) {
        map.setLayoutProperty('terrain-hillshade', 'visibility', 'none');
      }
      return;
    }

    if (!map.getSource('terrain-dem')) {
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: TERRARIUM_TILES,
        tileSize: 256,
        maxzoom: 13,
        encoding: 'terrarium',
      });
    }
    if (!map.getSource('hillshade-dem')) {
      map.addSource('hillshade-dem', {
        type: 'raster-dem',
        tiles: TERRARIUM_TILES,
        tileSize: 256,
        maxzoom: 13,
        encoding: 'terrarium',
      });
    }

    const styleLayers = map.getStyle()?.layers || [];
    const firstRoadOrBuildingLayer = styleLayers.find(
      (l) => /road|highway|bridge|tunnel|building|symbol/i.test(l.id) || l.type === 'symbol'
    )?.id;

    if (!map.getLayer('terrain-hillshade')) {
      map.addLayer(
        {
          id: 'terrain-hillshade',
          type: 'hillshade',
          source: 'hillshade-dem',
          layout: { visibility: 'visible' },
          paint: {
            'hillshade-exaggeration': 0.36,
            'hillshade-illumination-direction': 315,
            'hillshade-shadow-color': '#5E8A58',
            'hillshade-highlight-color': '#F5F9EE',
            'hillshade-accent-color': '#88C476',
          },
        },
        firstRoadOrBuildingLayer
      );
    } else {
      map.setLayoutProperty('terrain-hillshade', 'visibility', 'visible');
      map.setPaintProperty('terrain-hillshade', 'hillshade-exaggeration', 0.36);
      map.setPaintProperty('terrain-hillshade', 'hillshade-shadow-color', '#5E8A58');
      map.setPaintProperty('terrain-hillshade', 'hillshade-highlight-color', '#F5F9EE');
      map.setPaintProperty('terrain-hillshade', 'hillshade-accent-color', '#88C476');
    }

    map.setTerrain({ source: 'terrain-dem', exaggeration: 1.25 });
  } catch {}
}

export function upsertRio3DBuildingsLayer(
  map: maplibregl.Map,
  metric: RioBuildingMetric,
  options?: { opacity?: number; show3D?: boolean; showRelief?: boolean; isLightTheme?: boolean; neutralDefaultColor?: string }
) {
  let style: any;
  try {
    style = map.getStyle();
  } catch {
    return;
  }
  if (!style || !Array.isArray(style.layers)) return;

  const styleLayers = style.layers;
  const show3D = options?.show3D !== false;
  const showRelief = options?.showRelief === true;
  const isLightTheme = options?.isLightTheme === true;
  const opacity = options?.opacity ?? 0.9;

  // Hide generic base buildings & 100% of POI/airport/shield layers
  for (const layer of styleLayers) {
    const idLower = layer.id.toLowerCase();
    const srcLayer = String(layer['source-layer'] || '').toLowerCase();
    const isOur3D =
      idLower === 'rio-edificacoes-3d' ||
      idLower === 'rio-edificacoes-itbi-flat' ||
      idLower === 'cities-3d-edificacoes-3d' ||
      idLower.startsWith('auctions-buildings');

    if (
      !isOur3D &&
      (idLower.includes('building') ||
        srcLayer === 'poi' ||
        srcLayer === 'aerodrome_label' ||
        idLower.includes('poi') ||
        idLower.includes('airport') ||
        idLower.includes('shield'))
    ) {
      try {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      } catch {}
    }
  }

  if (isLightTheme) {
    applyLightLandscapePalette(map);
  } else {
    for (const layer of styleLayers) {
      const idLower = layer.id.toLowerCase();
      const srcLayer = String(layer['source-layer'] || '').toLowerCase();
      try {
        if (layer.type === 'fill' && (srcLayer === 'water' || idLower === 'water')) {
          map.setPaintProperty(layer.id, 'fill-color', '#0E324D');
        } else if (layer.type === 'line' && (srcLayer === 'waterway' || idLower === 'waterway')) {
          map.setPaintProperty(layer.id, 'line-color', '#19547A');
          map.setPaintProperty(layer.id, 'line-width', ['interpolate', ['linear'], ['zoom'], 11, 1.4, 14, 2.6, 17, 4.0]);
        }
      } catch {}
    }
    try {
      map.setLight({
        anchor: 'viewport',
        position: [1.15, 210, 38],
        color: '#dbeafe',
        intensity: 0.58,
      });
    } catch {}
  }

  applyTerrainRelief(map, showRelief);

  if (!map.getSource('rio-edificacoes')) {
    map.addSource('rio-edificacoes', {
      type: 'vector',
      url: getRioPMTilesUrl(),
      minzoom: 12,
      maxzoom: 15,
    });
  }

  // Insert 3D buildings below symbol labels for clean cartography
  const beforeSymbolLayer = styleLayers.find((l) => l.type === 'symbol')?.id;

  const colorExpr =
    metric === 'auctions' && options?.neutralDefaultColor
      ? options.neutralDefaultColor
      : getBuildingColorExpression(metric, isLightTheme);

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

  // Niteroi & Juiz de Fora 3D extrusions served as vectorized MVT tiles with full ITBI metrics
  const citiesTileTemplate =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/map/cities-3d/{z}/{x}/{y}.pbf`
      : '/api/map/cities-3d/{z}/{x}/{y}.pbf';

  if (!map.getSource('cities-3d-edificacoes')) {
    map.addSource('cities-3d-edificacoes', {
      type: 'vector',
      tiles: [citiesTileTemplate],
      minzoom: 12,
      maxzoom: 15,
    });
  }

  if (map.getLayer('other-cities-3d-buildings')) {
    try {
      map.removeLayer('other-cities-3d-buildings');
    } catch {}
  }

  if (!map.getLayer('cities-3d-edificacoes-3d')) {
    map.addLayer(
      {
        id: 'cities-3d-edificacoes-3d',
        type: 'fill-extrusion',
        source: 'cities-3d-edificacoes',
        'source-layer': 'edificacoes',
        minzoom: 12,
        paint: {
          'fill-extrusion-color': colorExpr,
          'fill-extrusion-height': show3D
            ? ['interpolate', ['linear'], ['zoom'], 12, ['*', ['coalesce', ['get', 'h'], 6], 0.35], 13.5, ['coalesce', ['get', 'h'], 6]]
            : 0.5,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': opacity,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      beforeSymbolLayer
    );
  } else {
    map.setPaintProperty('cities-3d-edificacoes-3d', 'fill-extrusion-color', colorExpr);
    map.setPaintProperty(
      'cities-3d-edificacoes-3d',
      'fill-extrusion-height',
      show3D
        ? ['interpolate', ['linear'], ['zoom'], 12, ['*', ['coalesce', ['get', 'h'], 6], 0.35], 13.5, ['coalesce', ['get', 'h'], 6]]
        : 0.5
    );
    map.setPaintProperty('cities-3d-edificacoes-3d', 'fill-extrusion-opacity', opacity);
  }
}

export function applySolarIllumination(
  map: maplibregl.Map,
  solar: SolarPositionInfo,
  shadowsGeoJson: GeoJSON.FeatureCollection,
  enabled: boolean,
  isReliefEnabled = false
) {
  try {
    const src = map.getSource('solar-shadows-source') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(enabled ? shadowsGeoJson : { type: 'FeatureCollection', features: [] });
    }
    if (isReliefEnabled && map.getLayer('terrain-hillshade')) {
      map.setPaintProperty(
        'terrain-hillshade',
        'hillshade-illumination-direction',
        enabled ? solar.azimuthFromNorthDeg : 315
      );
      map.setPaintProperty(
        'terrain-hillshade',
        'hillshade-exaggeration',
        enabled ? (solar.isDaylight ? 0.35 : 0.2) : 0.35
      );
    }
    map.setLight({
      anchor: enabled ? 'map' : 'viewport',
      position: enabled
        ? [1.4, solar.azimuthFromNorthDeg, Math.max(15, 90 - Math.max(12, solar.altitudeDeg))]
        : [1.15, 210, 38],
      color: enabled ? '#fffbeb' : '#ffffff',
      intensity: enabled ? 0.5 : 0.44,
    });
  } catch {}
}

export { maplibregl };
