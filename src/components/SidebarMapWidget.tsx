import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AuctionProperty } from '../types.ts';
import { getPropertyCoordinates, CITY_COORDS } from '../utils/geoCoords.ts';
import {
  OPENFREEMAP_DARK_STYLE,
  buildSatelliteStyle,
  ensureMapLibrePMTilesProtocol,
  maplibregl,
  toLngLat,
  upsertRio3DBuildingsLayer,
} from '../utils/mapLibreSetup.ts';
import { Maximize2, MapPin, Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface SidebarMapWidgetProps {
  auctions: AuctionProperty[];
  selectedCity?: string;
  selectedState?: string;
  onOpenFullMap: () => void;
  onSelectProperty: (property: AuctionProperty) => void;
}

export default function SidebarMapWidget({
  auctions,
  selectedCity,
  selectedState,
  onOpenFullMap,
  onSelectProperty,
}: SidebarMapWidgetProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const styleReadyRef = useRef(false);
  const auctionsByIdRef = useRef<Map<string, AuctionProperty>>(new Map());
  const onSelectPropertyRef = useRef(onSelectProperty);
  onSelectPropertyRef.current = onSelectProperty;

  const [mapMode, setMapMode] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [locationsById, setLocationsById] = useState<Record<string, any>>({});
  const [styleVersion, setStyleVersion] = useState(0);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const getTargetCenterAndZoom = (): { center: [number, number]; zoom: number } => {
    const cityKey = (selectedCity || '').toLowerCase().trim();
    if (cityKey && CITY_COORDS[cityKey]) {
      return { center: toLngLat(CITY_COORDS[cityKey]), zoom: 12 };
    }
    const stateKey = (selectedState || '').toUpperCase().trim();
    if (stateKey === 'MG') {
      return { center: [-43.3503, -21.7642], zoom: 12 };
    }
    return { center: [-43.195, -22.9068], zoom: 11.2 };
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/map/locations', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!response.ok) return;
        const rows = await response.json();
        if (!cancelled && Array.isArray(rows)) {
          setLocationsById(Object.fromEntries(rows.map((row: any) => [row.id, row])));
          if (response.headers.get('X-Map-Refreshing') === '1') timer = setTimeout(load, 15000);
        }
      } catch (error) {
        if (!cancelled) console.warn('Falha ao carregar coordenadas verificadas do mapa lateral:', error);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [auctions.map((a) => a.id).join('|')]);

  const geojsonData = useMemo(() => {
    const mapById = new Map<string, AuctionProperty>();
    const features: any[] = [];
    const sample = auctions.slice(0, 400);

    for (const auc of sample) {
      mapById.set(auc.id, auc);
      const coords = getPropertyCoordinates({ ...auc, mapLocation: locationsById[auc.id] } as AuctionProperty);
      if (!coords) continue;
      const isCaixa = (auc.origin || '').toLowerCase().includes('caixa') || (auc.origin || '').toLowerCase().includes('extra');
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: toLngLat(coords) },
        properties: {
          id: auc.id,
          color: isCaixa ? '#10b981' : '#6366f1',
          title: (auc.title || 'Imóvel em Leilão').slice(0, 60),
          sub: `${auc.neighborhood || ''} - ${auc.city || ''}`,
          price: auc.auctionPrice > 0 ? formatBRL(auc.auctionPrice) : 'Aberto a Propostas',
          roi: auc.calculatedRoi ? `${auc.calculatedRoi.toFixed(0)}%` : '-',
        },
      });
    }
    auctionsByIdRef.current = mapById;
    return { type: 'FeatureCollection' as const, features };
  }, [auctions, locationsById]);

  const syncAuctionOverlay = (map: maplibregl.Map, data: typeof geojsonData) => {
    if (!styleReadyRef.current || !map.getStyle()) return;

    upsertRio3DBuildingsLayer(map, 'm2', { opacity: 0.78, show3D: true });

    const existing = map.getSource('sidebar-auctions') as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(data as any);
      return;
    }

    map.addSource('sidebar-auctions', {
      type: 'geojson',
      data: data as any,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 34,
    });

    map.addLayer({
      id: 'sidebar-clusters',
      type: 'circle',
      source: 'sidebar-auctions',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#4f46e5',
        'circle-radius': ['step', ['get', 'point_count'], 13, 25, 16, 100, 19],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#c7d2fe',
      },
    });

    map.addLayer({
      id: 'sidebar-cluster-count',
      type: 'symbol',
      source: 'sidebar-auctions',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 10,
      },
      paint: { 'text-color': '#ffffff' },
    });

    map.addLayer({
      id: 'sidebar-points',
      type: 'circle',
      source: 'sidebar-auctions',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 5.5,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
  };

  useEffect(() => {
    if (isCollapsed || !mapContainerRef.current) return;

    ensureMapLibrePMTilesProtocol();
    const { center, zoom } = getTargetCenterAndZoom();

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapMode === 'satellite' ? buildSatelliteStyle() : OPENFREEMAP_DARK_STYLE,
      center,
      zoom,
      pitch: 32,
      bearing: -10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapInstanceRef.current = map;

    map.on('style.load', () => {
      styleReadyRef.current = true;
      setStyleVersion((v) => v + 1);
    });

    map.on('click', 'sidebar-clusters', async (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const src = map.getSource('sidebar-auctions') as any;
      const clusterId = feat.properties?.cluster_id;
      if (src?.getClusterExpansionZoom && clusterId != null) {
        try {
          const z = await src.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: (feat.geometry as any).coordinates, zoom: z });
        } catch {}
      }
    });

    map.on('click', 'sidebar-points', (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const props = feat.properties || {};
      const coords = (feat.geometry as any).coordinates as [number, number];
      const auc = auctionsByIdRef.current.get(props.id);

      if (popupRef.current) popupRef.current.remove();

      const wrapper = document.createElement('div');
      wrapper.className = 'p-1 text-slate-900 font-sans max-w-[205px] text-xs';
      wrapper.innerHTML = `
        <div style="font-weight: 800; font-size: 11px; line-height: 1.2; margin-bottom: 4px; color: #0f172a;">
          ${props.title || 'Imóvel em Leilão'}
        </div>
        <div style="font-size: 10px; color: #475569; margin-bottom: 6px;">
          ${props.sub || ''}
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 6px;">
          <span style="color: #2563eb;">${props.price || '-'}</span>
          <span style="color: #059669;">ROI: ${props.roi || '-'}</span>
        </div>
        <button id="btn-view-${props.id}" style="width: 100%; background: #4f46e5; color: white; border: none; border-radius: 6px; padding: 4px 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
          Simular Imóvel →
        </button>
      `;

      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '220px' })
        .setLngLat(coords)
        .setDOMContent(wrapper)
        .addTo(map);
      popupRef.current = popup;

      const btn = wrapper.querySelector(`#btn-view-${CSS.escape(props.id)}`) as HTMLButtonElement | null;
      if (btn && auc) {
        btn.onclick = () => onSelectPropertyRef.current(auc);
      }
    });

    map.on('mouseenter', 'sidebar-points', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'sidebar-points', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'sidebar-clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'sidebar-clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      if (popupRef.current) popupRef.current.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isCollapsed]);

  const prevMapModeRef = useRef(mapMode);

  useEffect(() => {
    if (prevMapModeRef.current === mapMode) return;
    prevMapModeRef.current = mapMode;
    const map = mapInstanceRef.current;
    if (!map) return;
    styleReadyRef.current = false;
    map.setStyle(mapMode === 'satellite' ? buildSatelliteStyle() : OPENFREEMAP_DARK_STYLE);
  }, [mapMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isCollapsed || !styleReadyRef.current) return;
    syncAuctionOverlay(map, geojsonData);
  }, [geojsonData, styleVersion, isCollapsed]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isCollapsed) return;
    const { center, zoom } = getTargetCenterAndZoom();
    map.easeTo({ center, zoom, duration: 500 });
  }, [selectedCity, selectedState, isCollapsed]);

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all">
      {/* Header do Widget */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold text-xs text-white tracking-tight flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>Mapa Georreferenciado</span>
          </span>
          <span className="text-[10px] font-mono bg-indigo-950/80 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/40">
            {auctions.length} lotes
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {!isCollapsed && (
            <button
              onClick={() => setMapMode((prev) => (prev === 'roadmap' ? 'satellite' : 'roadmap'))}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={mapMode === 'roadmap' ? 'Mudar para Satélite' : 'Mudar para Mapa Vetorial 3D'}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenFullMap}
            className="p-1 rounded-md text-indigo-400 hover:text-white hover:bg-indigo-600 transition-colors cursor-pointer"
            title="Abrir Mapa Completo em Tela Cheia"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Exibir Mapa' : 'Ocultar Mapa'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Conteúdo do Mapa */}
      {!isCollapsed ? (
        <div className="relative">
          <div
            ref={mapContainerRef}
            className="h-52 w-full z-0 bg-slate-900"
            style={{ minHeight: '208px' }}
          />

          <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
            <span className="text-[9.5px] font-bold bg-slate-950/90 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800 backdrop-blur-xs">
              📍 {selectedCity || selectedState || 'RJ · Niterói · JF'} · 3D
            </span>

            <button
              type="button"
              onClick={onOpenFullMap}
              className="pointer-events-auto text-[10px] font-black bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg border border-indigo-400/30 shadow-md transition-transform hover:scale-105 cursor-pointer flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Expandir</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setIsCollapsed(false)}
          className="py-2 px-3 text-center text-xs font-semibold text-slate-400 hover:text-indigo-300 hover:bg-slate-850 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
          <span>Clique para reabrir o mapa ({auctions.length} lotes)</span>
        </div>
      )}
    </div>
  );
}
