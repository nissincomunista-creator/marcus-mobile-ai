import { motion } from 'motion/react';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AuctionProperty } from '../types.ts';
import {
  MapPin, Compass, ExternalLink, X, ShieldAlert, Building2,
  Sparkles, ChevronRight, ListFilter, Box, Layers, Eye, EyeOff
} from 'lucide-react';
import { getPropertyCoordinates } from '../utils/geoCoords.ts';
import { checkPropertyCommunityRisk } from '../utils/communityRisk.ts';
import PropertyThumbnail from './PropertyThumbnail.tsx';
import RealValueCalculator from './RealValueCalculator.tsx';
import { cleanDivergentNotice } from '../utils/auctionLocation.ts';
import { assessDataQuality } from '../utils/dataQuality.ts';
import {
  OPENFREEMAP_DARK_STYLE,
  RioBuildingMetric,
  buildSatelliteStyle,
  ensureMapLibrePMTilesProtocol,
  getBuildingColorExpression,
  maplibregl,
  toLngLat,
  upsertRio3DBuildingsLayer,
} from '../utils/mapLibreSetup.ts';

interface PropertyMapProps {
  auctions: AuctionProperty[];
  itbiStats?: any[];
  onUpdateProperty?: (updates: Partial<AuctionProperty>) => Promise<void> | void;
  initialFilteredAuctions?: AuctionProperty[];
  onSelectPropertyFromMap: (id: string) => void;
  initialSelectedPropertyId?: string;
  onClose?: () => void;
}

interface BuildingInspectorData {
  id?: number;
  address: string;
  bairro: string;
  altura: number;
  m2: number;
  tx: number;
  liq: number;
  spr: number;
  lngLat: [number, number];
  nearbyAuctions: AuctionProperty[];
}

const METRIC_LEGENDS: Record<
  RioBuildingMetric,
  {
    title: string;
    subtitle: string;
    stops: { color: string; label: string }[];
  }
> = {
  m2: {
    title: 'ITBI R$/m² por Prédio',
    subtitle: 'Mediana oficial IPP + ITBI',
    stops: [
      { color: '#7dd3fc', label: '> 18 mil' },
      { color: '#38bdf8', label: '12,5k – 18k' },
      { color: '#0ea5e9', label: '9,5k – 12,5k' },
      { color: '#0284c7', label: '6,8k – 9,5k' },
      { color: '#2563eb', label: '4,5k – 6,8k' },
      { color: '#1d4ed8', label: '2,7k – 4,5k' },
      { color: '#1e3a8a', label: '< 2,7 mil' },
      { color: '#2a303c', label: 'Sem histórico' },
    ],
  },
  liq: {
    title: 'Liquidez por Edificação',
    subtitle: 'Volume de escrituras ITBI',
    stops: [
      { color: '#34d399', label: '9 – 10 (Alta)' },
      { color: '#06b6d4', label: '6 – 8 (Boa)' },
      { color: '#0284c7', label: '4 – 5 (Média)' },
      { color: '#1d4ed8', label: '2 – 3 (Baixa)' },
      { color: '#334155', label: '1 (Pontual)' },
      { color: '#2a303c', label: 'Sem histórico' },
    ],
  },
  spr: {
    title: 'Spread vs Bairro (%)',
    subtitle: 'Edifício vs mediana local',
    stops: [
      { color: '#10b981', label: '≤ -20% (Deságio)' },
      { color: '#06b6d4', label: '-10% a -20%' },
      { color: '#3b82f6', label: 'Média (±5%)' },
      { color: '#f59e0b', label: '+10% a +20%' },
      { color: '#f43f5e', label: '> +20% (Ágio)' },
      { color: '#2a303c', label: 'Sem histórico' },
    ],
  },
};

export default function PropertyMap({
  auctions,
  itbiStats = [],
  onUpdateProperty,
  initialFilteredAuctions,
  onSelectPropertyFromMap,
  initialSelectedPropertyId,
  onClose,
}: PropertyMapProps) {
  const [selectedPropId, setSelectedPropId] = useState<string>(initialSelectedPropertyId || '');
  const [mapMode, setMapMode] = useState<'satellite' | 'roadmap'>('roadmap');
  const [activeMetric, setActiveMetric] = useState<RioBuildingMetric>('m2');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [showAuctionsLayer, setShowAuctionsLayer] = useState<boolean>(true);
  const [legendCollapsed, setLegendCollapsed] = useState<boolean>(false);
  const [stateFilter, setStateFilter] = useState<string>('');
  const [selectedTypologyFilter, setSelectedTypologyFilter] = useState<string | null>(null);
  const [showFactionsLayer, setShowFactionsLayer] = useState<boolean>(false);
  const [simulatingProperty, setSimulatingProperty] = useState<AuctionProperty | null>(null);
  const [activeTab, setActiveTab] = useState<'both' | 'map' | 'list'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'map' : 'both'
  );
  const [buildingClusterModal, setBuildingClusterModal] = useState<{ address: string; properties: AuctionProperty[] } | null>(null);
  const [selectedBuildingInfo, setSelectedBuildingInfo] = useState<BuildingInspectorData | null>(null);
  const [showPendingDrawer, setShowPendingDrawer] = useState<boolean>(false);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<Record<string, [number, number]>>({});
  const [locationError, setLocationError] = useState(false);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [visibleCardCount, setVisibleCardCount] = useState(100);
  const [inViewportCount, setInViewportCount] = useState<number>(0);
  const focusedLocationRef = useRef('');
  const initialFitRef = useRef('');
  const [locationRecords, setLocationRecords] = useState<Record<string, any>>({});
  const [mapReady, setMapReady] = useState(false);
  const [styleVersion, setStyleVersion] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);

  const getMapCoordinates = useCallback(
    (property: AuctionProperty): [number, number] | null => {
      return getPropertyCoordinates({
        ...property,
        mapLocation: locationRecords[property.id] || (property as any).mapLocation,
      } as AuctionProperty);
    },
    [locationRecords]
  );

  const getMapCoordinatesRef = useRef(getMapCoordinates);
  getMapCoordinatesRef.current = getMapCoordinates;

  const pendingReviewProps = useMemo(() => {
    return auctions.filter((a) => getMapCoordinates(a) === null);
  }, [auctions, getMapCoordinates]);

  const baseList = useMemo(() => {
    if (initialFilteredAuctions && initialFilteredAuctions.length > 0) {
      return initialFilteredAuctions;
    }
    return auctions;
  }, [initialFilteredAuctions, auctions]);

  const filteredList = useMemo(() => {
    return baseList.filter((a) => {
      if (stateFilter && (a.state || 'RJ').toUpperCase() !== stateFilter.toUpperCase()) {
        return false;
      }
      if (selectedTypologyFilter) {
        const t = (a.propertyType || '').toLowerCase();
        if (selectedTypologyFilter === 'casa' && !t.includes('casa') && !t.includes('sobrado')) return false;
        if (selectedTypologyFilter === 'apartamento' && !t.includes('apartamento') && !t.includes('apto')) return false;
        if (
          selectedTypologyFilter === 'comercial' &&
          !t.includes('comercial') &&
          !t.includes('loja') &&
          !t.includes('sala') &&
          !t.includes('galpao') &&
          !t.includes('predio')
        )
          return false;
        if (selectedTypologyFilter === 'terreno' && !t.includes('terreno') && !t.includes('lote') && !t.includes('gleba')) return false;
      }
      return true;
    });
  }, [baseList, stateFilter, selectedTypologyFilter]);

  const filteredListRef = useRef(filteredList);
  filteredListRef.current = filteredList;

  const orderedList = useMemo(() => {
    const sorted = [...filteredList].sort((a, b) => (b.calculatedRoi || 0) - (a.calculatedRoi || 0));
    if (selectedPropId) {
      const sel = filteredList.find((p) => p.id === selectedPropId);
      if (sel) {
        return [sel, ...sorted.filter((p) => p.id !== selectedPropId)];
      }
    }
    return sorted;
  }, [filteredList, selectedPropId]);

  const displayedList = orderedList.slice(0, visibleCardCount);
  useEffect(() => {
    setVisibleCardCount(100);
  }, [stateFilter, selectedTypologyFilter]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // Group multi-unit properties into building clusters and prepare GeoJSON for MapLibre WebGL layer
  const { auctionGeoJson, buildingClusterByKey, propById } = useMemo(() => {
    const clusterMap: Record<
      string,
      {
        key: string;
        address: string;
        coords: [number, number];
        properties: AuctionProperty[];
      }
    > = {};
    const clusters: {
      key: string;
      address: string;
      coords: [number, number];
      properties: AuctionProperty[];
    }[] = [];
    const byId = new Map<string, AuctionProperty>();

    for (const prop of filteredList) {
      byId.set(prop.id, prop);
      const baseCoords = getMapCoordinates(prop);
      if (!baseCoords) continue;

      const addrClean = (prop.address || '').split(',')[0].trim().toLowerCase();
      const numMatch = (prop.address || '').match(/,\s*n[ºo°.]?\s*(\d+)/i) || (prop.address || '').match(/\b(\d{2,5})\b/);
      const numStr = numMatch ? numMatch[1] : '';
      const cleanNeigh = (prop.neighborhood || '').toLowerCase().trim();
      const cleanCity = (prop.city || '').toLowerCase().trim();

      const hasSpecificNumber = Boolean(numStr && numStr.length >= 1);
      const buildingKey = hasSpecificNumber ? `${cleanCity}_${cleanNeigh}_${addrClean}_${numStr}` : `${prop.id}`;

      if (!clusterMap[buildingKey]) {
        clusterMap[buildingKey] = {
          key: buildingKey,
          address: prop.address || prop.title,
          coords: baseCoords,
          properties: [],
        };
        clusters.push(clusterMap[buildingKey]);
      }
      clusterMap[buildingKey].properties.push(prop);
    }

    const features = clusters.map((cluster) => {
      const count = cluster.properties.length;
      const firstProp = cluster.properties[0];
      const origin = firstProp.origin || (firstProp.id.includes('caixa') ? 'caixa' : 'judicial');
      let pinColor = '#6366f1'; // judicial
      if (count > 1) pinColor = '#4338ca';
      else if (origin === 'caixa' || origin === 'extrajudicial') pinColor = '#10b981';
      else if (origin === 'portal') pinColor = '#f59e0b';

      const minPrice = Math.min(...cluster.properties.map((p) => p.auctionPrice || 0));
      const maxRoi = Math.max(...cluster.properties.map((p) => p.calculatedRoi || 0));

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: toLngLat(cluster.coords),
        },
        properties: {
          clusterKey: cluster.key,
          propId: firstProp.id,
          unitCount: count,
          isMulti: count > 1 ? 1 : 0,
          isSelected: cluster.properties.some((p) => p.id === selectedPropId) ? 1 : 0,
          color: pinColor,
          title: firstProp.title || 'Imóvel em Leilão',
          address: cluster.address || '',
          priceLabel:
            count > 1
              ? `A partir de ${formatBRL(minPrice)}`
              : firstProp.auctionPrice > 0
                ? formatBRL(firstProp.auctionPrice)
                : 'Aberto a Propostas',
          roiLabel: `${maxRoi.toFixed(0)}%`,
        },
      };
    });

    return {
      auctionGeoJson: { type: 'FeatureCollection' as const, features },
      buildingClusterByKey: clusterMap,
      propById: byId,
    };
  }, [filteredList, selectedPropId, getMapCoordinates]);

  const auctionGeoJsonRef = useRef(auctionGeoJson);
  auctionGeoJsonRef.current = auctionGeoJson;
  const buildingClusterByKeyRef = useRef(buildingClusterByKey);
  buildingClusterByKeyRef.current = buildingClusterByKey;
  const propByIdRef = useRef(propById);
  propByIdRef.current = propById;

  const updateViewportCounter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    const minLng = bounds.getWest();
    const maxLng = bounds.getEast();
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const inView = filteredListRef.current.filter((a) => {
      const c = getMapCoordinatesRef.current(a);
      return c && c[0] >= minLat && c[0] <= maxLat && c[1] >= minLng && c[1] <= maxLng;
    }).length;
    setInViewportCount(inView);
  }, []);

  // Initialize MapLibre GL JS Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    ensureMapLibrePMTilesProtocol();

    let initialCenter: [number, number] = [-43.195, -22.9068];
    let initialZoom = 12.2;

    if (initialSelectedPropertyId) {
      const found = auctions.find((a) => a.id === initialSelectedPropertyId);
      if (found) {
        const c = getPropertyCoordinates(found);
        if (c) initialCenter = toLngLat(c);
        initialZoom = 16;
      }
    } else if (initialFilteredAuctions && initialFilteredAuctions.length > 0) {
      const c0 = getPropertyCoordinates(initialFilteredAuctions[0]);
      if (c0) initialCenter = toLngLat(c0);
      initialZoom = 13;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapMode === 'satellite' ? buildSatelliteStyle() : OPENFREEMAP_DARK_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      pitch: is3DMode ? 48 : 0,
      bearing: is3DMode ? -14 : 0,
      maxPitch: 68,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-right');

    mapRef.current = map;

    map.on('load', () => {
      setMapReady(true);
      updateViewportCounter();
    });

    map.on('style.load', () => {
      setStyleVersion((v) => v + 1);
    });

    map.on('moveend', updateViewportCounter);
    map.on('zoomend', updateViewportCounter);

    // Click cluster bubble -> expand zoom smoothly
    map.on('click', 'auctions-clusters', async (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const src = map.getSource('auctions-source') as any;
      const clusterId = feat.properties?.cluster_id;
      if (src?.getClusterExpansionZoom && clusterId != null) {
        try {
          const z = await src.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: (feat.geometry as any).coordinates, zoom: Math.min(18, z + 0.5) });
        } catch {}
      }
    });

    // Click individual or multi-unit auction pin
    const handleAuctionFeatureClick = (e: any) => {
      e.originalEvent?.stopPropagation?.();
      const feat = e.features?.[0];
      if (!feat) return;
      const props = feat.properties || {};
      const coords = (feat.geometry as any).coordinates as [number, number];
      const cluster = buildingClusterByKeyRef.current[props.clusterKey];
      const auctionProp = propByIdRef.current.get(props.propId);

      setSelectedBuildingInfo(null);
      setSelectedPropId(props.propId);

      if (cluster && cluster.properties.length > 1) {
        setBuildingClusterModal({ address: cluster.address, properties: cluster.properties });
        map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 17.2), pitch: 52, duration: 550 });
      } else {
        setBuildingClusterModal(null);
        map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 16.2), duration: 450 });
      }

      if (auctionProp) {
        const el = document.getElementById(`side-card-${auctionProp.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    map.on('click', 'auctions-points', handleAuctionFeatureClick);
    map.on('click', 'auctions-multi-unit', handleAuctionFeatureClick);

    // Click any 3D IPP building polygon -> inspect ITBI metrics + height + nearby auctions
    map.on('click', 'rio-edificacoes-3d', (e) => {
      // Skip if an auction marker sits directly under the click
      const pinHits = map.queryRenderedFeatures(e.point, {
        layers: ['auctions-points', 'auctions-multi-unit', 'auctions-clusters'].filter((id) => Boolean(map.getLayer(id))),
      });
      if (pinHits.length > 0) return;

      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties || {};
      const clickLng = e.lngLat.lng;
      const clickLat = e.lngLat.lat;

      // Find auctions within ~45m of the clicked building
      const nearby = filteredListRef.current.filter((a) => {
        const c = getMapCoordinatesRef.current(a);
        if (!c) return false;
        const dLat = (c[0] - clickLat) * 110540;
        const dLng = (c[1] - clickLng) * 111320 * Math.cos((clickLat * Math.PI) / 180);
        return Math.hypot(dLat, dLng) <= 45;
      });

      setSelectedBuildingInfo({
        id: Number(p.id) || undefined,
        address: p.a || 'Edificação Cartográfica Oficial IPP',
        bairro: p.b || 'Rio de Janeiro',
        altura: Number(p.h) || 5,
        m2: Number(p.m2) || 0,
        tx: Number(p.tx) || 0,
        liq: Number(p.liq) || 0,
        spr: p.spr != null ? Number(p.spr) : 0,
        lngLat: [clickLng, clickLat],
        nearbyAuctions: nearby.slice(0, 6),
      });
    });

    // Hover tooltips on auction pins
    const showPinTooltip = (e: any) => {
      map.getCanvas().style.cursor = 'pointer';
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties || {};
      const coords = (feat.geometry as any).coordinates as [number, number];
      if (hoverPopupRef.current) hoverPopupRef.current.remove();

      const isMulti = Number(p.isMulti) === 1;
      const html = isMulti
        ? `<div style="font-family: sans-serif; font-size: 11.5px; line-height: 1.35; padding: 2px 4px; color: #0f172a; min-width: 170px;">
             <div style="font-weight: 800; color: #4338ca;">🏢 ${p.unitCount} Imóveis neste Prédio</div>
             <div style="color: #475569; font-size: 10.5px; margin-top: 2px;">${p.address}</div>
             <div style="display:flex; justify-content:space-between; margin-top:4px; font-weight:700;">
               <span style="color:#0369a1;">${p.priceLabel}</span>
               <span style="color:#15803d;">ROI: ${p.roiLabel}</span>
             </div>
           </div>`
        : `<div style="font-family: sans-serif; font-size: 11.5px; line-height: 1.35; padding: 2px 4px; color: #0f172a; min-width: 165px;">
             <div style="font-weight: 700;">${p.title}</div>
             <div style="color: #64748b; font-size: 10.5px; margin-bottom: 3px;">${p.address}</div>
             <div style="display:flex; justify-content:space-between; font-weight:700; border-top:1px solid #e2e8f0; padding-top:3px;">
               <span style="color:#0369a1;">${p.priceLabel}</span>
               <span style="color:#15803d;">ROI: ${p.roiLabel}</span>
             </div>
           </div>`;

      hoverPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        maxWidth: '240px',
      })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);
    };

    const hidePinTooltip = () => {
      map.getCanvas().style.cursor = '';
      if (hoverPopupRef.current) {
        hoverPopupRef.current.remove();
        hoverPopupRef.current = null;
      }
    };

    map.on('mouseenter', 'auctions-points', showPinTooltip);
    map.on('mouseleave', 'auctions-points', hidePinTooltip);
    map.on('mouseenter', 'auctions-multi-unit', showPinTooltip);
    map.on('mouseleave', 'auctions-multi-unit', hidePinTooltip);
    map.on('mouseenter', 'auctions-clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'auctions-clusters', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'rio-edificacoes-3d', () => {
      if (!map.getCanvas().style.cursor) map.getCanvas().style.cursor = 'crosshair';
    });
    map.on('mouseleave', 'rio-edificacoes-3d', () => {
      map.getCanvas().style.cursor = '';
    });

    // Faction popup
    map.on('click', 'factions-fill', (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties || {};
      new maplibregl.Popup({ maxWidth: '220px' })
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 140px;">
             <strong style="font-size: 13px; color: #0284c7;">${p.n || 'Área'}</strong><br/>
             <span style="font-size: 11px; margin-top: 2px; display: block;">Controle/Facção: <strong style="color: #ef4444;">${p.f || 'Em disputa'}</strong></span>
             <span style="font-size: 9.5px; color: #64748b; margin-top: 4px; display: block;">Fonte: dadosderiscos.com.br</span>
           </div>`
        )
        .addTo(map);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      if (hoverPopupRef.current) hoverPopupRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.resize(), 150);
    }
  }, [activeTab]);

  // Switch between OpenFreeMap Dark vector & Satellite
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(mapMode === 'satellite' ? buildSatelliteStyle() : OPENFREEMAP_DARK_STYLE);
  }, [mapMode]);

  // Update 3D tilt/pitch seamlessly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      pitch: is3DMode ? 48 : 0,
      bearing: is3DMode ? -14 : 0,
      duration: 500,
    });
    if (map.isStyleLoaded() && map.getLayer('rio-edificacoes-3d')) {
      upsertRio3DBuildingsLayer(map, activeMetric, { show3D: is3DMode, opacity: 0.88 });
    }
  }, [is3DMode]);

  // Update active building color ramp metric (R$/m², Liquidez, Spread)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer('rio-edificacoes-3d')) {
      map.setPaintProperty('rio-edificacoes-3d', 'fill-extrusion-color', getBuildingColorExpression(activeMetric));
    }
  }, [activeMetric]);

  // Re-attach Rio 3D buildings layer & auction WebGL layers whenever style loads or data updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    upsertRio3DBuildingsLayer(map, activeMetric, { show3D: is3DMode, opacity: 0.88 });

    const data = auctionGeoJsonRef.current;
    const existingSrc = map.getSource('auctions-source') as maplibregl.GeoJSONSource | undefined;

    if (existingSrc) {
      existingSrc.setData(data as any);
    } else {
      map.addSource('auctions-source', {
        type: 'geojson',
        data: data as any,
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 34,
      });

      map.addLayer({
        id: 'auctions-clusters',
        type: 'circle',
        source: 'auctions-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#1e293b', 25, '#059669', 100, '#4f46e5'],
          'circle-radius': ['step', ['get', 'point_count'], 15, 25, 19, 100, 23],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': ['step', ['get', 'point_count'], '#94a3b8', 25, '#a7f3d0', 100, '#c7d2fe'],
          'circle-opacity': 0.94,
        },
      });

      map.addLayer({
        id: 'auctions-cluster-count',
        type: 'symbol',
        source: 'auctions-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 11,
        },
        paint: { 'text-color': '#ffffff' },
      });

      map.addLayer({
        id: 'auctions-points',
        type: 'circle',
        source: 'auctions-source',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isMulti'], 0]],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['case', ['==', ['get', 'isSelected'], 1], 10, 6.5],
          'circle-stroke-width': ['case', ['==', ['get', 'isSelected'], 1], 3, 1.8],
          'circle-stroke-color': ['case', ['==', ['get', 'isSelected'], 1], '#fde047', '#ffffff'],
        },
      });

      map.addLayer({
        id: 'auctions-multi-unit',
        type: 'circle',
        source: 'auctions-source',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isMulti'], 1]],
        paint: {
          'circle-color': '#4338ca',
          'circle-radius': ['case', ['==', ['get', 'isSelected'], 1], 14, 11],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#fbbf24',
        },
      });

      map.addLayer({
        id: 'auctions-multi-count',
        type: 'symbol',
        source: 'auctions-source',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isMulti'], 1]],
        layout: {
          'text-field': ['to-string', ['get', 'unitCount']],
          'text-size': 10.5,
        },
        paint: { 'text-color': '#fef08a' },
      });
    }

    const vis = showAuctionsLayer ? 'visible' : 'none';
    for (const lid of ['auctions-clusters', 'auctions-cluster-count', 'auctions-points', 'auctions-multi-unit', 'auctions-multi-count']) {
      if (map.getLayer(lid)) map.setLayoutProperty(lid, 'visibility', vis);
    }

    updateViewportCounter();
  }, [auctionGeoJson, styleVersion, showAuctionsLayer, updateViewportCounter]);

  // Factions overlay inside MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (!showFactionsLayer) {
      if (map.getLayer('factions-fill')) map.setLayoutProperty('factions-fill', 'visibility', 'none');
      if (map.getLayer('factions-outline')) map.setLayoutProperty('factions-outline', 'visibility', 'none');
      return;
    }

    if (map.getSource('factions-rj')) {
      map.setLayoutProperty('factions-fill', 'visibility', 'visible');
      map.setLayoutProperty('factions-outline', 'visibility', 'visible');
      return;
    }

    fetch('/faccoes_rj.json')
      .then((res) => res.json())
      .then((geoJsonData) => {
        if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
        if (!mapRef.current.getSource('factions-rj')) {
          mapRef.current.addSource('factions-rj', {
            type: 'geojson',
            data: geoJsonData,
          });
          mapRef.current.addLayer(
            {
              id: 'factions-fill',
              type: 'fill',
              source: 'factions-rj',
              paint: {
                'fill-color': [
                  'match',
                  ['upcase', ['coalesce', ['get', 'f'], '']],
                  'CV', '#ef4444',
                  'TCP', '#3b82f6',
                  'ADA', '#10b981',
                  'MIL', '#eab308',
                  'LJ', '#f97316',
                  'MNI', '#a855f7',
                  '#6b7280',
                ],
                'fill-opacity': 0.34,
              },
            },
            mapRef.current.getLayer('auctions-clusters') ? 'auctions-clusters' : undefined
          );
          mapRef.current.addLayer(
            {
              id: 'factions-outline',
              type: 'line',
              source: 'factions-rj',
              paint: {
                'line-color': [
                  'match',
                  ['upcase', ['coalesce', ['get', 'f'], '']],
                  'CV', '#ef4444',
                  'TCP', '#3b82f6',
                  'ADA', '#10b981',
                  'MIL', '#eab308',
                  'LJ', '#f97316',
                  'MNI', '#a855f7',
                  '#6b7280',
                ],
                'line-width': 1.5,
              },
            },
            mapRef.current.getLayer('auctions-clusters') ? 'auctions-clusters' : undefined
          );
        }
      })
      .catch((err) => console.error('Erro ao carregar faccoes_rj.json', err));
  }, [showFactionsLayer, styleVersion]);

  // Fetch verified coordinates
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const load = () =>
      fetch('/api/map/locations', { headers, signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          if (r.headers.get('X-Map-Refreshing') === '1' && !cancelled) timer = setTimeout(load, 15000);
          return r.json();
        })
        .then((locations: any[]) => {
          if (cancelled || !Array.isArray(locations)) return;
          const next: Record<string, [number, number]> = {};
          const records: Record<string, any> = {};
          const currentById = new Map(auctions.map((a) => [a.id, a]));
          for (const location of locations) {
            const current = currentById.get(location.id);
            if (current) records[location.id] = location;
            if (current) {
              const point = getPropertyCoordinates({ ...current, mapLocation: location } as AuctionProperty);
              if (point) next[location.id] = point;
            }
          }
          setResolvedCoordinates(next);
          setLocationRecords(records);
          setLocationsLoaded(true);
          setLocationError(false);
        })
        .catch((err) => {
          if (!cancelled) {
            setLocationError(true);
            setLocationsLoaded(true);
          }
          console.warn('Falha ao carregar localizações verificadas', err);
        });
    load();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [auctions, initialSelectedPropertyId, initialFilteredAuctions]);

  // Initial fitBounds
  useEffect(() => {
    if (!mapReady || !mapRef.current || !locationsLoaded) return;
    const key = initialSelectedPropertyId || 'initial';
    if (initialFitRef.current === key) return;
    const targetProp = initialSelectedPropertyId ? auctions.find((a) => a.id === initialSelectedPropertyId) : null;
    const selected =
      (initialSelectedPropertyId && resolvedCoordinates[initialSelectedPropertyId]) ||
      (targetProp ? getMapCoordinates(targetProp) : null);
    const points = (initialFilteredAuctions || auctions)
      .map((a) => resolvedCoordinates[a.id] || getMapCoordinates(a))
      .filter((p): p is [number, number] => Boolean(p));

    if (selected) {
      mapRef.current.jumpTo({ center: toLngLat(selected), zoom: 17 });
      initialFitRef.current = key;
    } else if (points.length) {
      const bounds = new maplibregl.LngLatBounds();
      for (const p of points) bounds.extend(toLngLat(p));
      mapRef.current.fitBounds(bounds, { padding: 45, maxZoom: 16.5, duration: 500 });
      initialFitRef.current = key;
    }
  }, [mapReady, locationsLoaded, resolvedCoordinates, initialSelectedPropertyId, initialFilteredAuctions, auctions, getMapCoordinates]);

  // Focus when selectedPropId changes
  useEffect(() => {
    if (!selectedPropId || !mapRef.current) return;
    const target = baseList.find((a) => a.id === selectedPropId) || auctions.find((a) => a.id === selectedPropId);
    if (!target) return;
    const coords = getMapCoordinates(target);
    const focusKey = coords ? `${selectedPropId}:${coords.join(',')}` : '';
    if (coords && focusKey !== focusedLocationRef.current) {
      focusedLocationRef.current = focusKey;
      mapRef.current.resize();
      mapRef.current.easeTo({ center: toLngLat(coords), zoom: Math.max(mapRef.current.getZoom(), 16.8), duration: 500 });
    }
  }, [selectedPropId, auctions, baseList, getMapCoordinates, mapReady]);

  const handleCardClick = (prop: AuctionProperty) => {
    setSelectedPropId(prop.id);
    setSelectedBuildingInfo(null);
    const coords = getMapCoordinates(prop);
    if (coords && mapRef.current) {
      mapRef.current.easeTo({ center: toLngLat(coords), zoom: 16.8, pitch: is3DMode ? 48 : 0, duration: 550 });
    }
    if (window.innerWidth < 1024) {
      setActiveTab('map');
    }
  };

  const selectedProp = useMemo(() => {
    return baseList.find((a) => a.id === selectedPropId) || auctions.find((a) => a.id === selectedPropId) || null;
  }, [auctions, baseList, selectedPropId]);

  const locatedCount = useMemo(
    () => baseList.filter((a) => getMapCoordinates(a) !== null).length,
    [baseList, getMapCoordinates]
  );

  const currentLegend = METRIC_LEGENDS[activeMetric];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[88vh] sm:h-[90vh] lg:h-[92vh] relative w-full">
      <div className="bg-slate-950/95 border-b border-slate-800 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 z-10">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 sm:p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="font-black text-white text-sm sm:text-base tracking-tight flex items-center gap-2 flex-wrap">
              <span>Mapa Georreferenciado 3D & ITBI Rio</span>
              <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40">
                {filteredList.length} Lotes {inViewportCount > 0 ? `• ${inViewportCount} no Enquadramento` : ''}
              </span>
              {locationsLoaded && pendingReviewProps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPendingDrawer(true)}
                  className="flex items-center gap-1.5 text-[10.5px] font-bold font-mono bg-amber-950/90 hover:bg-amber-900/90 text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-600/50 cursor-pointer shadow-sm transition-all"
                  title="Imóveis bloqueados no mapa por falta de validação cartográfica estrita de endereço"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>{pendingReviewProps.length} Pendentes de Revisão</span>
                </button>
              )}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
              {!locationsLoaded
                ? 'Carregando endereços dos imóveis de leilão…'
                : locationError
                  ? 'Não foi possível carregar os endereços confirmados. Reabra o mapa para tentar novamente.'
                  : `${locatedCount} de ${auctions.length} lotes confirmados no mapa vetorial IPP 3D (OpenFreeMap Dark + Edificações 2019).`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex lg:hidden items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              Mapa
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              Fichas ({displayedList.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIs3DMode((v) => !v)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer border flex items-center gap-1 ${
              is3DMode
                ? 'bg-sky-600/20 text-sky-300 border-sky-500/60'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Alternar extrusão 3D pelas alturas oficiais (IPP ALTURA)"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{is3DMode ? '3D ON' : '2D'}</span>
          </button>

          <div className="flex items-center bg-slate-900 p-0.5 sm:p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMapMode('roadmap')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                mapMode === 'roadmap' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Escuro 3D
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                mapMode === 'satellite' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Satélite
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
              title="Fechar mapa"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-950/80 border-b border-slate-800 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 z-10 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-bold uppercase font-mono text-[10px] mr-1 hidden sm:inline">Tipologia:</span>
          <button
            type="button"
            onClick={() => setSelectedTypologyFilter(null)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border text-xs ${
              selectedTypologyFilter === null
                ? 'bg-slate-200 text-slate-950 border-white'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Todos ({baseList.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTypologyFilter((prev) => (prev === 'casa' ? null : 'casa'))}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
              selectedTypologyFilter === 'casa'
                ? 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400/50'
                : 'bg-emerald-950/30 text-emerald-400/80 border-emerald-800/40 hover:text-emerald-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span>🏡 Casa</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTypologyFilter((prev) => (prev === 'apartamento' ? null : 'apartamento'))}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
              selectedTypologyFilter === 'apartamento'
                ? 'bg-blue-600 text-white border-blue-300 ring-2 ring-blue-400/50'
                : 'bg-blue-950/30 text-blue-400/80 border-blue-800/40 hover:text-blue-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
            <span>🏢 Apartamento</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTypologyFilter((prev) => (prev === 'comercial' ? null : 'comercial'))}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
              selectedTypologyFilter === 'comercial'
                ? 'bg-amber-600 text-white border-amber-300 ring-2 ring-amber-400/50'
                : 'bg-amber-950/30 text-amber-400/80 border-amber-800/40 hover:text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            <span>🏬 Comercial</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTypologyFilter((prev) => (prev === 'terreno' ? null : 'terreno'))}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
              selectedTypologyFilter === 'terreno'
                ? 'bg-purple-600 text-white border-purple-300 ring-2 ring-purple-400/50'
                : 'bg-purple-950/30 text-purple-400/80 border-purple-800/40 hover:text-purple-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
            <span>📐 Terreno</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFactionsLayer((prev) => !prev)}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            showFactionsLayer
              ? 'bg-rose-950/90 text-rose-300 border-rose-500 shadow-md shadow-rose-950/50'
              : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
          }`}
          title="Camada de controle de facções RJ (dadosderiscos.com.br)"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Risco & Facções RJ</span>
          <span className="sm:hidden">Facções</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${showFactionsLayer ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {showFactionsLayer ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      <div className="relative flex-1 w-full h-full flex flex-col lg:flex-row overflow-hidden">
        <div
          className={`relative h-full transition-all duration-200 ${
            activeTab === 'list' ? 'hidden' : activeTab === 'map' ? 'w-full' : 'w-full lg:w-8/12 xl:w-[72%]'
          }`}
        >
          <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

          {/* Pill de status vetorial IPP 3D */}
          <div className="absolute top-3 left-3 z-20 pointer-events-none hidden sm:flex">
            <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/90 text-slate-200 px-3 py-1.5 rounded-full border border-slate-800 text-[11px] font-bold shadow-xl backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Cartografia IPP Rio 3D · PMTiles + OpenFreeMap</span>
            </div>
          </div>

          {/* Legenda Interativa Inferior Esquerda (Métricas MapaImóveisRio + Toggle Lotes) */}
          <div className="absolute bottom-3 left-3 z-20 bg-slate-950/95 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-2.5 w-60 sm:w-64 text-slate-200">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
              <div className="min-w-0">
                <div className="text-[11px] font-black text-white tracking-tight truncate">{currentLegend.title}</div>
                <div className="text-[9.5px] text-slate-400 truncate">{currentLegend.subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setLegendCollapsed((v) => !v)}
                className="text-[10px] font-mono text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
              >
                {legendCollapsed ? '+' : '−'}
              </button>
            </div>

            {!legendCollapsed && (
              <div className="pt-2 space-y-2">
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
                  {(
                    [
                      ['m2', 'R$/m²'],
                      ['liq', 'Liquidez'],
                      ['spr', 'Spread'],
                    ] as const
                  ).map(([metricKey, label]) => (
                    <button
                      key={metricKey}
                      type="button"
                      onClick={() => setActiveMetric(metricKey)}
                      className={`py-1 rounded-md transition-colors cursor-pointer ${
                        activeMetric === metricKey
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono">
                  {currentLegend.stops.map((stop) => (
                    <div key={stop.label} className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0 border border-white/15"
                        style={{ backgroundColor: stop.color }}
                      />
                      <span className="text-slate-300 truncate">{stop.label}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAuctionsLayer((v) => !v)}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-colors cursor-pointer ${
                      showAuctionsLayer
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {showAuctionsLayer ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>Lotes de Leilão</span>
                    </span>
                    <span className="font-mono text-[10px]">{locatedCount.toLocaleString('pt-BR')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {buildingClusterModal && (
            <div className="absolute top-14 left-3 right-3 sm:right-auto sm:w-96 max-h-[65vh] bg-slate-950/95 border border-slate-700 backdrop-blur-xl rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-indigo-950/80 border border-indigo-800/60 rounded-lg text-sm">🏢</span>
                  <div>
                    <h4 className="text-xs font-black text-white leading-tight">
                      {buildingClusterModal.properties.length} Imóveis em Leilão neste Prédio
                    </h4>
                    <p className="text-[10.5px] text-slate-400 truncate max-w-[220px]">
                      {buildingClusterModal.address}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBuildingClusterModal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar max-h-[48vh]">
                {buildingClusterModal.properties.map((item) => {
                  const aptMatch = item.address?.match(/\b(apto|apt|ap|casa|unidade|loja)\s*[\d\w]+/i);
                  const unitLabel = aptMatch ? aptMatch[0].toUpperCase() : 'Unidade';
                  const isCurSelected = selectedPropId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedPropId(item.id);
                        const el = document.getElementById(`side-card-${item.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isCurSelected
                          ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/40 shadow-sm'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-bold text-white font-mono">
                          {unitLabel}
                          {item.sizeSqm > 0 ? ` • ${item.sizeSqm}m²` : ''}
                        </span>
                        <span className="text-[10px] font-black text-emerald-400 font-mono">
                          ROI: {(item.calculatedRoi || 0).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1.5 text-[11px] font-mono">
                        <span className="text-slate-400">
                          Lance:{' '}
                          <strong className="text-emerald-300">
                            {item.auctionPrice > 0 ? formatBRL(item.auctionPrice) : 'Aberto a Propostas'}
                          </strong>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSimulatingProperty(item);
                          }}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10.5px] font-bold cursor-pointer"
                        >
                          Simular
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card de Edifício 3D Clicado (IPP + ITBI + Leilões no prédio) */}
          {selectedBuildingInfo && !selectedProp && (
            <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:w-80 bg-slate-950/95 border border-sky-700/60 backdrop-blur-md rounded-2xl p-3 shadow-2xl z-20 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase font-mono px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-700/50">
                    Edificação 3D IPP • {selectedBuildingInfo.altura.toFixed(1)}m (~{Math.max(1, Math.round(selectedBuildingInfo.altura / 3.1))} pav.)
                  </span>
                  <h4 className="font-extrabold text-white text-xs mt-1 truncate">{selectedBuildingInfo.address}</h4>
                  <p className="text-[10.5px] text-slate-400 truncate">{selectedBuildingInfo.bairro}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBuildingInfo(null)}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {selectedBuildingInfo.m2 > 0 ? (
                <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-2 rounded-xl border border-slate-800 text-[10.5px] font-mono">
                  <div>
                    <span className="text-[8.5px] text-slate-500 block uppercase">ITBI/m²</span>
                    <strong className="text-sky-300">{formatBRL(selectedBuildingInfo.m2)}</strong>
                  </div>
                  <div>
                    <span className="text-[8.5px] text-slate-500 block uppercase">Liquidez</span>
                    <strong className="text-emerald-400">
                      {selectedBuildingInfo.liq}/10 ({selectedBuildingInfo.tx}tx)
                    </strong>
                  </div>
                  <div>
                    <span className="text-[8.5px] text-slate-500 block uppercase">Spread</span>
                    <strong className={selectedBuildingInfo.spr <= 0 ? 'text-emerald-400' : 'text-amber-300'}>
                      {selectedBuildingInfo.spr > 0 ? `+${selectedBuildingInfo.spr}%` : `${selectedBuildingInfo.spr}%`}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="text-[10.5px] text-slate-400 bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  Edificação sem histórico recente de escrituras ITBI vinculadas.
                </div>
              )}

              {selectedBuildingInfo.nearbyAuctions.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-amber-300">
                    {selectedBuildingInfo.nearbyAuctions.length} lote(s) em leilão neste raio:
                  </div>
                  {selectedBuildingInfo.nearbyAuctions.slice(0, 2).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedBuildingInfo(null);
                        setSelectedPropId(item.id);
                      }}
                      className="w-full text-left px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10.5px] flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate text-slate-200 max-w-[170px]">{item.title}</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {item.auctionPrice > 0 ? formatBRL(item.auctionPrice) : 'Ver'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedProp && (
            <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:max-w-xs bg-slate-950/95 border border-slate-800 backdrop-blur-md rounded-xl p-2.5 shadow-2xl z-20 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[8.5px] font-black uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                      {selectedProp.propertyType}
                      {selectedProp.sizeSqm > 0 ? ` • ${selectedProp.sizeSqm}m²` : ''}
                    </span>
                    {(() => {
                      const risk = checkPropertyCommunityRisk(selectedProp);
                      if (!risk.isRisk) return null;
                      return (
                        <span
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-800/70 font-mono"
                          title={risk.communityName ? `Área: ${risk.communityName}` : 'Área de risco'}
                        >
                          {risk.badgeLabel || '⚠️ Área de Risco'}
                        </span>
                      );
                    })()}
                  </div>
                  <h3 className="font-extrabold text-white text-xs mt-0.5 truncate leading-tight">
                    {selectedProp.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                    <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                    <span>
                      {selectedProp.address || 'Endereço'}, {selectedProp.neighborhood}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPropId('')}
                  className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-[8px] text-slate-500 block uppercase font-semibold">Lance</span>
                  <span className="font-black text-emerald-400 text-xs">
                    {selectedProp.auctionPrice > 0 ? formatBRL(selectedProp.auctionPrice) : 'Aberto a Propostas'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-slate-500 block uppercase font-semibold">ITBI</span>
                  <span className="font-black text-amber-400 text-xs">{formatBRL(selectedProp.estimatedValue || 0)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  onClick={() => setSimulatingProperty(selectedProp)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-2 rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-md shadow-indigo-600/30"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Simular</span>
                </button>

                {selectedProp.auctionLink && (
                  <a
                    href={selectedProp.auctionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg border border-blue-500 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Página oficial na Caixa / Edital"
                  >
                    <Building2 className="w-3 h-3 text-blue-200" />
                    <span>{selectedProp.origin === 'caixa' ? 'Caixa' : 'Edital'}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className={`h-full bg-slate-950/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col z-20 relative transition-all duration-200 ${
            activeTab === 'map' ? 'hidden' : activeTab === 'list' ? 'w-full' : 'w-full lg:w-[450px] xl:w-[480px]'
          }`}
        >
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ListFilter className="w-4 h-4 text-indigo-400" />
              <span className="font-extrabold text-white text-xs sm:text-sm">Fichas no Enquadramento</span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-bold">
                {displayedList.length}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">Clique para focar ou simular</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                <p className="font-bold text-slate-400">Nenhum imóvel neste enquadramento</p>
                <p className="text-[11px] text-slate-500">Mova o mapa ou ajuste os filtros para explorar mais regiões.</p>
              </div>
            ) : (
              displayedList.map((auc) => {
                const isSelected = auc.id === selectedPropId;
                const totalCost =
                  auc.auctionPrice + (auc.pendingDebts || 0) + (auc.estimatedRepair || 0) + (auc.otherCosts || 0);
                const isFeatured = assessDataQuality(auc).canBeFeatured;

                return (
                  <div
                    key={auc.id}
                    id={`side-card-${auc.id}`}
                    onClick={() => handleCardClick(auc)}
                    className={`bg-slate-900/90 rounded-2xl border transition-all cursor-pointer overflow-visible relative ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-950/50 bg-slate-900'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="p-3.5 space-y-2.5">
                      <div className="flex gap-2.5 items-start justify-between">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="bg-slate-800 text-slate-200 text-[10.5px] font-semibold px-2 py-0.5 rounded border border-slate-700">
                              {auc.propertyType} •{' '}
                              {auc.sizeSqm > 0 ? `${auc.sizeApproximate ? '≈ ' : ''}${auc.sizeSqm} m²` : 'Área não confirmada'}
                              {auc.bedrooms ? ` • ${auc.bedrooms} qto${auc.bedrooms > 1 ? 's' : ''}` : ''}
                              {auc.parkingSpaces ? ` • ${auc.parkingSpaces} vg${auc.parkingSpaces > 1 ? 's' : ''}` : ''}
                            </span>

                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                auc.riskLevel === 'Baixo'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : auc.riskLevel === 'Médio'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              }`}
                            >
                              Risco {auc.riskLevel}
                            </span>

                            {auc.isCommunityRisk && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60 font-mono inline-flex items-center gap-1">
                                ⛔ {auc.communityName ? `${auc.communityName}` : 'Comunidade'}{' '}
                                {auc.factionName ? `(${auc.factionName})` : ''}
                              </span>
                            )}

                            {!auc.isCommunityRisk && auc.nearbyCommunityName && (
                              <span
                                className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/50 inline-flex items-center gap-1 cursor-help"
                                title={`Localizado a ~${auc.nearbyCommunityDistanceM || 300}m da comunidade ${auc.nearbyCommunityName}. Sem desvalorização forçada.`}
                              >
                                ⚠️ Próx. {auc.nearbyCommunityName} (~{auc.nearbyCommunityDistanceM || 300}m)
                              </span>
                            )}

                            {isFeatured && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                ★ Top ROI
                              </span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 hover:text-indigo-300 transition-colors">
                              {auc.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 line-clamp-1">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>
                                {auc.address || 'Endereço'} ({auc.neighborhood} - {auc.state || 'RJ'})
                              </span>
                            </p>
                            {cleanDivergentNotice(auc.divergentNeighborhoodNotice) && (
                              <div className="pt-0.5">
                                <span
                                  className="text-[9px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60 font-mono font-bold inline-flex items-center gap-1"
                                  title="Bairro cadastrado no edital difere do endereço real no mapa/cartório"
                                >
                                  <span>⚠️</span>
                                  <span>{cleanDivergentNotice(auc.divergentNeighborhoodNotice)}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 pt-0.5">
                          <PropertyThumbnail property={auc} size="sm" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 items-stretch">
                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Lance Mínimo</span>
                          <span className="text-xs font-black text-white font-mono mt-0.5">
                            {auc.auctionPrice > 0 ? formatBRL(auc.auctionPrice) : 'Aberto a Propostas'}
                          </span>
                        </div>

                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Custo Total</span>
                          <span className="text-xs font-black text-slate-300 font-mono mt-0.5">
                            {auc.auctionPrice > 0 ? formatBRL(totalCost) : 'Sob análise'}
                          </span>
                        </div>

                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Lucro Líquido</span>
                          <span
                            className={`text-xs font-black font-mono mt-0.5 ${
                              auc.hasMicroBenchmark === false
                                ? 'text-slate-400'
                                : (auc.calculatedProfit || 0) >= 0
                                  ? 'text-white'
                                  : 'text-rose-400'
                            }`}
                          >
                            {auc.hasMicroBenchmark === false || auc.calculatedProfit === undefined
                              ? 'Sob consulta'
                              : formatBRL(auc.calculatedProfit || 0)}
                          </span>
                        </div>

                        <div className="relative group/itbi bg-amber-950/30 p-1.5 rounded-lg border border-amber-500/40 shadow-xs flex flex-col justify-center cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-[8.5px] text-amber-400 block uppercase font-bold truncate">Gabarito ITBI</span>
                            <span className="text-[8px] text-amber-400/80 font-mono">ℹ️</span>
                          </div>
                          <span className="text-xs font-black text-amber-300 font-mono block mt-0.5">
                            {auc.hasMicroBenchmark === false || (!auc.estimatedValue && !auc.itbiStreetAvgSqm) ? (
                              <span className="text-amber-400/90 font-mono text-[10px]">Sem amostragem</span>
                            ) : auc.estimatedValue ? (
                              formatBRL(auc.estimatedValue)
                            ) : auc.itbiUnitValueAvg ? (
                              formatBRL(auc.itbiUnitValueAvg * auc.sizeSqm)
                            ) : (
                              '-'
                            )}
                          </span>

                          <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-slate-950/95 text-slate-200 rounded-xl border border-amber-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/itbi:opacity-100 transition-opacity z-50 text-left">
                            <div className="text-[10.5px] font-bold text-amber-300 mb-1">🏛️ Gabarito Oficial de ITBI</div>
                            <p className="text-[9.5px] text-slate-300 leading-relaxed font-sans">
                              Média pericial de escrituras públicas de cartório registradas nesta rua e bairro (NBR 14.653 com Chauvenet).
                            </p>
                            <div className="mt-1.5 pt-1 border-t border-slate-800 text-[9px] font-mono text-slate-400 flex justify-between">
                              <span>
                                {auc.itbiIsDerivedSqm
                                  ? 'Unitário Homogeneizado:'
                                  : auc.itbiIsAbsolutePricing
                                    ? 'Preço Médio ITBI:'
                                    : 'Unitário:'}
                              </span>
                              <strong className="text-amber-300">
                                {auc.itbiIsAbsolutePricing
                                  ? formatBRL(auc.itbiAbsoluteAvgPrice || auc.estimatedValue || 0)
                                  : `R$ ${(auc.itbiStreetAvgSqm || auc.itbiUnitValueAvg || 0).toLocaleString('pt-BR')}/m²`}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 items-stretch text-left">
                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">ROI Estimado</span>
                          <span
                            className={`text-xs font-black font-mono mt-0.5 ${
                              auc.hasMicroBenchmark === false
                                ? 'text-slate-400'
                                : (auc.calculatedRoi || 0) > 40
                                  ? 'text-emerald-400'
                                  : 'text-indigo-400'
                            }`}
                          >
                            {auc.hasMicroBenchmark === false || auc.calculatedRoi === undefined
                              ? 'Sob consulta'
                              : `${auc.calculatedRoi.toLocaleString('pt-BR')}%`}
                          </span>
                        </div>

                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Avaliação Caixa</span>
                          <span className="text-xs font-black text-slate-300 font-mono mt-0.5">
                            {auc.evaluationPrice ? formatBRL(auc.evaluationPrice) : '-'}
                          </span>
                        </div>

                        <div className="relative group/liq bg-slate-950/40 p-1.5 rounded-lg border border-slate-800 flex flex-col justify-center cursor-help">
                          {(() => {
                            const effScore =
                              !auc.itbiStreetCount || auc.itbiStreetCount === 0
                                ? 0
                                : Math.min(auc.liquidityScore ?? 0, assessDataQuality(auc).liquidityCeiling);
                            const streetCount = auc.itbiStreetCount || 0;
                            const roi = auc.calculatedRoi || 0;
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-[8.5px] text-slate-400 font-medium block">Liquidez</span>
                                  <span className="text-[8px] text-slate-400 font-mono">ℹ️</span>
                                </div>
                                <span
                                  className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${
                                    effScore >= 7 ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  {effScore}/10
                                </span>

                                <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-slate-950/95 text-slate-200 rounded-xl border border-indigo-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/liq:opacity-100 transition-opacity z-50 text-left">
                                  <div className="text-[10.5px] font-bold text-indigo-300 mb-1">
                                    📊 Indicador de Liquidez ({effScore}/10)
                                  </div>
                                  <div className="text-[9px] text-slate-300 space-y-1 font-sans">
                                    <div className="flex justify-between border-b border-slate-800 pb-0.5">
                                      <span>Amostras na Via:</span>
                                      <strong className="font-mono text-slate-200">{streetCount} tx</strong>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800 pb-0.5">
                                      <span>Margem de Retorno:</span>
                                      <strong className="font-mono text-emerald-400">ROI {roi}%</strong>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        <div className="relative group/flip bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-500/40 shadow-xs flex flex-col justify-center cursor-help">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-[8.5px] text-emerald-400 block uppercase font-bold truncate"
                              title="Flip Rápido (60d)"
                            >
                              Flip Rápido
                            </span>
                            <span className="text-[8px] text-emerald-400/80 font-mono">ℹ️</span>
                          </div>
                          <span className="text-xs font-black text-emerald-300 font-mono block mt-0.5">
                            {auc.hasMicroBenchmark === false || !auc.vendaBaixaPrice ? (
                              <span className="text-slate-400 font-mono text-[10px]">Sem amostragem</span>
                            ) : (
                              formatBRL(auc.vendaBaixaPrice)
                            )}
                          </span>

                          <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-slate-950/95 text-slate-200 rounded-xl border border-emerald-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/flip:opacity-100 transition-opacity z-50 text-left">
                            <div className="text-[10.5px] font-bold text-emerald-300 mb-1">
                              ⚡ Preço Sugerido p/ Revenda (60d)
                            </div>
                            <p className="text-[9.5px] text-slate-300 leading-relaxed font-sans">
                              85% ITBI (Piso Real de Cartório) + 15% Portais (Teto de Anúncios) calibrado para liquidez acelerada em até 60 dias.
                            </p>
                            {auc.ageDepreciationPct && auc.ageDepreciationPct > 0 ? (
                              <div className="mt-1.5 pt-1 border-t border-slate-800 text-[9px] font-mono text-amber-300 flex justify-between">
                                <span>Idade Ross-Heidecke:</span>
                                <strong>-{auc.ageDepreciationPct}%</strong>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          🏛️ ITBI:{' '}
                          {auc.itbiIsDerivedSqm
                            ? auc.itbiStreetAvgSqm || auc.itbiUnitValueAvg
                              ? `${formatBRL(auc.itbiStreetAvgSqm || auc.itbiUnitValueAvg)}/m² (${formatBRL(auc.estimatedValue || 0)})`
                              : 'Sem dados'
                            : auc.itbiIsAbsolutePricing
                              ? auc.estimatedValue
                                ? `${formatBRL(auc.estimatedValue)} (Preço Médio)`
                                : 'Sem dados'
                              : auc.itbiStreetAvgSqm
                                ? `${formatBRL(auc.itbiStreetAvgSqm)}/m²`
                                : auc.itbiUnitValueAvg
                                  ? `${formatBRL(auc.itbiUnitValueAvg)}/m²`
                                  : 'Sem dados'}
                        </span>
                        {(auc.m2MercadoPortal || auc.streetPortalAvgSqm) && (
                          <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-indigo-300 flex items-center gap-1">
                            <span>🌐 {auc.fontePortal || 'Portais'}:</span>
                            <span className="font-bold text-slate-100">
                              {formatBRL(auc.m2MercadoPortal || auc.streetPortalAvgSqm || 0)}/m²
                            </span>
                            {auc.valorSugeridoPortal && (
                              <span className="text-cyan-300">({formatBRL(auc.valorSugeridoPortal)})</span>
                            )}
                            <span className="text-[9px] text-slate-400">
                              [{auc.isBairroPortalFallback ? 'Bairro' : 'Rua'}]
                            </span>
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            auc.occupied
                              ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                              : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                          }`}
                        >
                          ● {auc.occupied ? 'Ocupado' : 'Desocupado'}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSimulatingProperty(auc);
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs py-1.5 px-2.5 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/30"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span>Simular Viabilidade</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(auc);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="Focar no mapa"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Focar</span>
                        </button>

                        {auc.auctionLink && (
                          <a
                            href={auc.auctionLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-xl border border-blue-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Acessar edital / Caixa oficial"
                          >
                            <Building2 className="w-3 h-3 text-blue-200" />
                            <span>{auc.origin === 'caixa' ? 'Caixa' : 'Edital'}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {displayedList.length < orderedList.length && (
              <button
                type="button"
                onClick={() => setVisibleCardCount((count) => count + 100)}
                className="w-full rounded-xl bg-slate-800 p-3 text-sm font-bold text-white hover:bg-slate-700 cursor-pointer"
              >
                Mostrar mais fichas ({displayedList.length} de {orderedList.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Simulator Side Drawer */}
      {simulatingProperty &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            <div
              onClick={() => setSimulatingProperty(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
            />
            <div className="absolute inset-0 flex justify-end pointer-events-none">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="pointer-events-auto w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden"
              >
                <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Simulação de Viabilidade & Jurídico</h3>
                      <p className="text-xs text-slate-400 truncate max-w-[320px]">
                        {simulatingProperty.title} • {simulatingProperty.neighborhood}, {simulatingProperty.city}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSimulatingProperty(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-950/50">
                  <RealValueCalculator
                    key={simulatingProperty.id}
                    itbiStats={itbiStats}
                    prefillData={{
                      ...simulatingProperty,
                      purchasePrice: simulatingProperty.auctionPrice,
                      evaluationPrice: (simulatingProperty as any).evaluationPrice,
                      estimatedValue: simulatingProperty.estimatedValue,
                      vendaBaixaPrice: simulatingProperty.vendaBaixaPrice,
                      vendaMediaPrice: simulatingProperty.vendaMediaPrice,
                      ageDepreciationPct: simulatingProperty.ageDepreciationPct,
                      acquisitionRule:
                        simulatingProperty.origin === 'caixa' ||
                        (simulatingProperty.id && simulatingProperty.id.includes('caixa'))
                          ? 'caixa'
                          : 'leilao',
                    }}
                    onUpdateProperty={async (updates) => {
                      setSimulatingProperty((prev) => (prev ? { ...prev, ...updates } : null));
                      if (onUpdateProperty) await onUpdateProperty({ ...updates, id: simulatingProperty.id });
                    }}
                    onClose={() => setSimulatingProperty(null)}
                  />
                </div>
              </motion.div>
            </div>
          </div>,
          document.body
        )}

      {/* Pending Review Drawer */}
      {showPendingDrawer && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span>Imóveis Pendentes de Revisão Cadastral</span>
                    <span className="text-xs font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800/50">
                      {pendingReviewProps.length} não plotados
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Estes anúncios continuam disponíveis. O ponto será exibido quando rua, número e localização puderem ser confirmados.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPendingDrawer(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar bg-slate-950/40">
              {pendingReviewProps.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Nenhum imóvel pendente de revisão. Todos os endereços possuem coordenadas cartográficas validadas.
                </div>
              ) : (
                pendingReviewProps.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                          PENDENTE_REVISAO
                        </span>
                        <span className="text-xs font-semibold text-slate-300 truncate">
                          {item.neighborhood || 'Bairro N/D'}, {item.city || 'Cidade não informada'} -{' '}
                          {item.state || 'UF não informada'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                        Endereço: {item.address || 'Não informado no edital'}
                      </p>
                      <p className="text-xs text-amber-300 mt-1">
                        {({
                          missing_number: 'Número não informado no endereço',
                          address_not_found: 'Rua e número ainda não encontrados na base oficial',
                          block_not_confirmed: 'Bloco do condomínio ainda não confirmado',
                          multiple_address_points: 'Mais de um ponto corresponde ao endereço',
                          no_original_coordinate: 'A base dispõe apenas de coordenada estimada',
                          municipality_not_found: 'Município ainda não localizado na base',
                          not_yet_matched: 'Endereço aguardando cruzamento com a base oficial',
                        } as Record<string, string>)[locationRecords[item.id]?.reason] ||
                          'Localização pendente de confirmação'}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300">
                        <span>
                          Lance:{' '}
                          <b className="text-emerald-400">
                            {item.auctionPrice > 0 ? formatBRL(item.auctionPrice) : 'Aberto a Propostas'}
                          </b>
                        </span>
                        {item.estimatedValue && (
                          <span>
                            Avaliação: <b>{formatBRL(item.estimatedValue)}</b>
                          </span>
                        )}
                        {item.sizeSqm && (
                          <span>
                            Área: <b>{item.sizeSqm}m²</b>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setShowPendingDrawer(false);
                          setSimulatingProperty(item);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/30"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Simular</span>
                      </button>
                      {item.auctionLink && (
                        <a
                          href={item.auctionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
                          title="Abrir edital"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="bg-slate-900 border-t border-slate-800 px-5 py-3 flex items-center justify-between text-xs text-slate-400">
              <span>Critério: Exige correspondência oficial de Prédio (Nível 1), Número (Nível 2) ou Eixo de Via (Nível 3).</span>
              <button
                onClick={() => setShowPendingDrawer(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão Flutuante Mobile */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center bg-slate-950/95 border border-indigo-500/50 rounded-full shadow-2xl p-1.5 backdrop-blur-xl pointer-events-auto">
        <button
          onClick={() => setActiveTab(activeTab === 'map' ? 'list' : 'map')}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-full shadow-lg shadow-indigo-600/40 transition-all cursor-pointer select-none"
        >
          {activeTab === 'map' ? (
            <>
              <ListFilter className="w-4 h-4 text-white" />
              <span>Ver Fichas ({displayedList.length})</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 text-emerald-300" />
              <span>Ver no Mapa</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
