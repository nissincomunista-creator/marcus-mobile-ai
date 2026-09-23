import { motion } from 'motion/react';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AuctionProperty } from '../types.ts';
import { 
  MapPin, Layers, Compass, Building, ExternalLink, X, Search, 
  ShieldAlert, Building2, Sparkles, ChevronRight, ArrowLeft, 
  ListFilter, Eye, CheckCircle2, TrendingUp
} from 'lucide-react';
import { getPropertyCoordinates } from '../utils/geoCoords.ts';
import { checkPropertyCommunityRisk } from '../utils/communityRisk.ts';
import PropertyThumbnail from './PropertyThumbnail.tsx';
import RealValueCalculator from './RealValueCalculator.tsx';
import { cleanDivergentNotice } from '../utils/auctionLocation.ts';


interface PropertyMapProps {
  auctions: AuctionProperty[];
  itbiStats?: any[];
  onUpdateProperty?: (updates: Partial<AuctionProperty>) => Promise<void> | void;
  initialFilteredAuctions?: AuctionProperty[];
  onSelectPropertyFromMap: (id: string) => void;
  initialSelectedPropertyId?: string;
  onClose?: () => void;
}

export default function PropertyMap({ 
  auctions, 
  itbiStats = [],
  onUpdateProperty,
  initialFilteredAuctions,
  onSelectPropertyFromMap,
  initialSelectedPropertyId,
  onClose
}: PropertyMapProps) {
  const [selectedPropId, setSelectedPropId] = useState<string>(initialSelectedPropertyId || '');
  const [mapMode, setMapMode] = useState<'satellite' | 'roadmap'>('roadmap');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [selectedTypologyFilter, setSelectedTypologyFilter] = useState<string | null>(null);
  const [showFactionsLayer, setShowFactionsLayer] = useState<boolean>(false);
  const [simulatingProperty, setSimulatingProperty] = useState<AuctionProperty | null>(null);
  const [activeTab, setActiveTab] = useState<'both' | 'map' | 'list'>(() => typeof window !== 'undefined' && window.innerWidth < 1024 ? 'map' : 'both');
  const [buildingClusterModal, setBuildingClusterModal] = useState<{ address: string; properties: AuctionProperty[] } | null>(null);
  const [showPendingDrawer, setShowPendingDrawer] = useState<boolean>(false);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<Record<string, [number, number]>>({});
  const clusterGroupRef = useRef<any>(null);
  const [locationError, setLocationError] = useState(false);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [visibleCardCount, setVisibleCardCount] = useState(100);
  const [inViewportCount, setInViewportCount] = useState<number>(0);
  const focusedLocationRef = useRef('');
  const initialFitRef = useRef('');
  const [locationRecords, setLocationRecords] = useState<Record<string, any>>({});
  const [mapReady, setMapReady] = useState(false);

  const getMapCoordinates = useCallback((property: AuctionProperty): [number, number] | null => {
    return getPropertyCoordinates({ ...property, mapLocation: locationRecords[property.id] || (property as any).mapLocation } as AuctionProperty);
  }, [locationRecords]);
  
  const pendingReviewProps = useMemo(() => {
    return auctions.filter(a => getMapCoordinates(a) === null);
  }, [auctions, getMapCoordinates]);
  
  const factionsGeoJsonRef = useRef<any>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const activeTileLayerRef = useRef<any>(null);

  const baseList = useMemo(() => {
    if (initialFilteredAuctions && initialFilteredAuctions.length > 0) {
      return initialFilteredAuctions;
    }
    return auctions;
  }, [initialFilteredAuctions, auctions]);

  const filteredList = useMemo(() => {
    return baseList.filter(a => {
      if (stateFilter && (a.state || 'RJ').toUpperCase() !== stateFilter.toUpperCase()) {
        return false;
      }
      if (selectedTypologyFilter) {
        const t = (a.propertyType || '').toLowerCase();
        if (selectedTypologyFilter === 'casa' && !t.includes('casa') && !t.includes('sobrado')) return false;
        if (selectedTypologyFilter === 'apartamento' && !t.includes('apartamento') && !t.includes('apto')) return false;
        if (selectedTypologyFilter === 'comercial' && !t.includes('comercial') && !t.includes('loja') && !t.includes('sala') && !t.includes('galpao') && !t.includes('predio')) return false;
        if (selectedTypologyFilter === 'terreno' && !t.includes('terreno') && !t.includes('lote') && !t.includes('gleba')) return false;
      }
      return true;
    });
  }, [baseList, stateFilter, selectedTypologyFilter]);

  const orderedList = useMemo(() => {
    const sorted = [...filteredList].sort((a, b) => (b.calculatedRoi || 0) - (a.calculatedRoi || 0));
    if (selectedPropId) {
      const sel = filteredList.find(p => p.id === selectedPropId);
      if (sel) {
        return [sel, ...sorted.filter(p => p.id !== selectedPropId)];
      }
    }
    return sorted;
  }, [filteredList, selectedPropId]);

  const displayedList = orderedList.slice(0, visibleCardCount);
  useEffect(() => { setVisibleCardCount(100); }, [stateFilter, selectedTypologyFilter]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    const DefaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    if (!mapRef.current) {
      let initialCenter: [number, number] = [-22.9068, -43.1729];
      let initialZoom = 12;

      if (initialSelectedPropertyId) {
        const found = auctions.find(a => a.id === initialSelectedPropertyId);
        if (found) {
          const c = getPropertyCoordinates(found);
          if (c) initialCenter = c;
          initialZoom = 15;
        }
      } else if (initialFilteredAuctions && initialFilteredAuctions.length > 0) {
        const c0 = getPropertyCoordinates(initialFilteredAuctions[0]);
        if (c0) initialCenter = c0;
        initialZoom = 13;
      }

      const map = L.map(mapContainerRef.current).setView(initialCenter, initialZoom);
      mapRef.current = map;
      setMapReady(true);

      const tileRoad = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      });
      tileRoad.addTo(map);
      activeTileLayerRef.current = tileRoad;

      // Stable Cluster Group Layer (L.markerClusterGroup with custom executive styling)
      let clusterGroup: any = null;
      if (L.markerClusterGroup) {
        clusterGroup = L.markerClusterGroup({
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          spiderfyOnMaxZoom: true,
          removeOutsideVisibleBounds: true,
          animate: true,
          animateAddingMarkers: false,
          maxClusterRadius: 42,
          iconCreateFunction: (cluster: any) => {
            const count = cluster.getChildCount();
            const countLabel = count > 999 ? `+${(count / 1000).toFixed(1)}k` : `+${count}`;
            const badgeClass = count > 100
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 border-indigo-200 text-white shadow-indigo-500/40'
              : (count > 25
                ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-200 text-white shadow-emerald-500/40'
                : 'bg-gradient-to-br from-slate-800 to-slate-950 border-slate-400 text-white shadow-slate-900/50');
            return L.divIcon({
              html: `<div class="executive-cluster-pin flex items-center justify-center w-10 h-10 rounded-full ${badgeClass} border-2 shadow-2xl ring-4 ring-black/25 font-mono font-black text-xs cursor-pointer hover:scale-110 transition-transform">${countLabel}</div>`,
              className: 'custom-executive-cluster',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            });
          }
        });
      } else {
        clusterGroup = L.layerGroup();
      }
      clusterGroup.addTo(map);
      clusterGroupRef.current = clusterGroup;

      const updateViewportCounter = () => {
        if (!mapRef.current) return;
        const bounds = mapRef.current.getBounds();
        const inView = (initialFilteredAuctions || auctions).filter(a => {
          const c = getPropertyCoordinates(a);
          return c && bounds.contains(c);
        }).length;
        setInViewportCount(inView);
      };

      map.on('moveend zoomend', updateViewportCounter);

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          updateViewportCounter();
        }
      }, 300);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 150);
    }
  }, [activeTab, isSidePanelOpen()]);

  function isSidePanelOpen() {
    return activeTab === 'both' || activeTab === 'list';
  }

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (activeTileLayerRef.current) {
      mapRef.current.removeLayer(activeTileLayerRef.current);
    }

    let layer: any;
    if (mapMode === 'satellite') {
      layer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
      });
    } else {
      layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      });
    }

    layer.addTo(mapRef.current);
    activeTileLayerRef.current = layer;
  }, [mapMode]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (!showFactionsLayer) {
      if (factionsGeoJsonRef.current) {
        mapRef.current.removeLayer(factionsGeoJsonRef.current);
        factionsGeoJsonRef.current = null;
      }
      return;
    }

    fetch('/faccoes_rj.json')
      .then(res => res.json())
      .then(geoJsonData => {
        if (!mapRef.current) return;
        if (factionsGeoJsonRef.current) {
          mapRef.current.removeLayer(factionsGeoJsonRef.current);
        }

        const getFactionColor = (f: string) => {
          switch ((f || '').toUpperCase()) {
            case 'CV': return '#ef4444';
            case 'TCP': return '#3b82f6';
            case 'ADA': return '#10b981';
            case 'MIL': return '#eab308';
            case 'LJ': return '#f97316';
            case 'MNI': return '#a855f7';
            default: return '#6b7280';
          }
        };

        const layer = L.geoJSON(geoJsonData, {
          style: (feature: any) => {
            const f = feature?.properties?.f || '';
            const color = getFactionColor(f);
            return { color: color, weight: 1.5, opacity: 0.85, fillColor: color, fillOpacity: 0.35 };
          },
          onEachFeature: (feature: any, l: any) => {
            const name = feature?.properties?.n || 'Área';
            const faction = feature?.properties?.f || 'Neutro/Em disputa';
            l.bindPopup(`<div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 140px;"><strong style="font-size: 13px; color: #0284c7;">${name}</strong><br/><span style="font-size: 11px; margin-top: 2px; display: block;">Controle/Facção: <strong style="color: #ef4444;">${faction}</strong></span><span style="font-size: 9.5px; color: #64748b; margin-top: 4px; display: block;">Fonte: dadosderiscos.com.br</span></div>`);
          }
        });

        layer.addTo(mapRef.current);
        factionsGeoJsonRef.current = layer;
      })
      .catch(err => console.error('Erro ao carregar faccoes_rj.json', err));
  }, [showFactionsLayer]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const token = localStorage.getItem('token');
    const headers: Record<string,string> = token ? { Authorization: `Bearer ${token}` } : {};
    const load = () => fetch('/api/map/locations', { headers, signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error(String(r.status));
      if (r.headers.get('X-Map-Refreshing') === '1' && !cancelled) timer = setTimeout(load, 15000);
      return r.json();
    }).then((locations: any[]) => {
      if (cancelled || !Array.isArray(locations)) return;
      const next: Record<string, [number, number]> = {};
      const records: Record<string, any> = {};
      const currentById = new Map(auctions.map(a => [a.id, a]));
      for (const location of locations) {
        const current = currentById.get(location.id);
        if (current) records[location.id] = location;
        if (current) { const point = getPropertyCoordinates({ ...current, mapLocation: location } as AuctionProperty); if (point) next[location.id] = point; }
      }
      setResolvedCoordinates(next);
      setLocationRecords(records);
      setLocationsLoaded(true);
      setLocationError(false);
    }).catch(err => { if (!cancelled) { setLocationError(true); setLocationsLoaded(true); } console.warn('Falha ao carregar localizações verificadas', err); });
    load();
    return () => { cancelled = true; controller.abort(); if (timer) clearTimeout(timer); };
  }, [auctions, initialSelectedPropertyId, initialFilteredAuctions]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !locationsLoaded) return;
    const key = initialSelectedPropertyId || 'initial';
    if (initialFitRef.current === key) return;
    const selected = initialSelectedPropertyId && resolvedCoordinates[initialSelectedPropertyId];
    const points = (initialFilteredAuctions || auctions).map(a => resolvedCoordinates[a.id]).filter(Boolean);
    if (selected) { mapRef.current.setView(selected, 18); initialFitRef.current = key; }
    else if (points.length) { mapRef.current.fitBounds(points, { padding: [35,35], maxZoom: 17 }); initialFitRef.current = key; }
  }, [mapReady, locationsLoaded, resolvedCoordinates, initialSelectedPropertyId, initialFilteredAuctions, auctions]);



  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !clusterGroupRef.current) return;

    const clusterGroup = clusterGroupRef.current;
    if (clusterGroup.clearLayers) {
      clusterGroup.clearLayers();
    }
    markersRef.current = {};

    const createCustomIcon = (prop: AuctionProperty, isSelected: boolean) => {
      const origin = prop.origin || (prop.id.includes('caixa') ? 'caixa' : 'judicial');

      let bg = 'bg-indigo-600 border-indigo-300 text-white';
      let iconEmoji = '⚖️';
      if (origin === 'caixa' || origin === 'extrajudicial') {
        bg = 'bg-emerald-600 border-emerald-300 text-white';
        iconEmoji = origin === 'caixa' ? '🏦' : '📜';
      } else if (origin === 'portal') {
        bg = 'bg-amber-500 border-amber-200 text-slate-950';
        iconEmoji = '✨';
      }

      const ringClass = isSelected ? 'ring-4 ring-white scale-125 z-50 shadow-2xl animate-pulse' : 'hover:scale-110 shadow-lg';

      return L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="flex items-center justify-center w-8 h-8 rounded-full ${bg} ${ringClass} font-black text-[12px] border-2 transition-all cursor-pointer shadow-md">${iconEmoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    };

    const buildingClusters: {
      key: string;
      address: string;
      coords: [number, number];
      properties: AuctionProperty[];
    }[] = [];

    const clusterMap: Record<string, {
      key: string;
      address: string;
      coords: [number, number];
      properties: AuctionProperty[];
    }> = {};

    const newMarkersList: any[] = [];

    filteredList.forEach(prop => {
      const baseCoords = getMapCoordinates(prop);
      if (!baseCoords) return;

      const addrClean = (prop.address || '').split(',')[0].trim().toLowerCase();
      const numMatch = (prop.address || '').match(/,\s*n[ºo°.]?\s*(\d+)/i) || (prop.address || '').match(/\b(\d{2,5})\b/);
      const numStr = numMatch ? numMatch[1] : '';
      const cleanNeigh = (prop.neighborhood || '').toLowerCase().trim();
      const cleanCity = (prop.city || '').toLowerCase().trim();

      // Only group into building multi-units if they genuinely share the same street name and building number!
      const hasSpecificNumber = numStr && numStr.length >= 1;
      const buildingKey = hasSpecificNumber 
        ? `${cleanCity}_${cleanNeigh}_${addrClean}_${numStr}`
        : `${prop.id}`;

      if (!clusterMap[buildingKey]) {
        clusterMap[buildingKey] = {
          key: buildingKey,
          address: prop.address || prop.title,
          coords: baseCoords,
          properties: []
        };
        buildingClusters.push(clusterMap[buildingKey]);
      }
      clusterMap[buildingKey].properties.push(prop);
    });

    buildingClusters.forEach(cluster => {
      const isMultiUnit = cluster.properties.length > 1;
      const isSelected = cluster.properties.some(p => p.id === selectedPropId);
      const firstProp = cluster.properties[0];

      let marker: any;

      if (isMultiUnit) {
        const count = cluster.properties.length;
        const ringClass = isSelected ? 'ring-4 ring-amber-400 scale-125 z-50 shadow-2xl' : 'hover:scale-115 shadow-xl';
        
        const clusterIcon = L.divIcon({
          className: 'custom-building-cluster',
          html: `
            <div class="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 border-2 border-indigo-200 text-white font-black text-sm ${ringClass} transition-all cursor-pointer shadow-xl">
              🏢
              <span class="absolute -top-2 -right-2 bg-amber-400 text-slate-950 text-[10.5px] font-black px-1.5 py-0.2 rounded-full border border-slate-950 shadow-md font-mono">
                ${count}
              </span>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        marker = L.marker(cluster.coords, { icon: clusterIcon });

        const minPrice = Math.min(...cluster.properties.map(p => p.auctionPrice));
        const maxRoi = Math.max(...cluster.properties.map(p => p.calculatedRoi || 0));

        const tooltipContent = `
          <div style="font-family: sans-serif; font-size: 11.5px; line-height: 1.35; padding: 4px 6px; min-width: 175px;">
            <div style="font-weight: 800; color: #4338ca; display: flex; align-items: center; gap: 4px; font-size: 12px;">
              🏢 ${count} Imóveis em Leilão neste Prédio
            </div>
            <div style="color: #334155; font-size: 10.5px; margin-top: 2px; font-weight: 600;">${cluster.address}</div>
            <div style="display: flex; justify-content: space-between; gap: 8px; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
              <span style="color: #0369a1;">A partir de ${formatBRL(minPrice)}</span>
              <span style="color: #15803d;">Top ROI: ${maxRoi.toFixed(0)}%</span>
            </div>
            <div style="font-size: 9.5px; color: #64748b; margin-top: 3px; text-align: center; font-weight: 600;">
              Clique para abrir as ${count} unidades
            </div>
          </div>
        `;
        marker.bindTooltip(tooltipContent, {
          direction: 'top',
          offset: [0, -20],
          opacity: 0.98
        });

        marker.on('click', (e: any) => {
          if (e && e.originalEvent) e.originalEvent.stopPropagation();
          setSelectedPropId(firstProp.id);
          setBuildingClusterModal({ address: cluster.address, properties: cluster.properties });
          mapRef.current.setView(cluster.coords, 18, { animate: true });
          const el = document.getElementById(`side-card-${firstProp.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });

        cluster.properties.forEach(p => {
          markersRef.current[p.id] = marker;
        });
        newMarkersList.push(marker);

      } else {
        const prop = firstProp;
        const icon = createCustomIcon(prop, isSelected);
        marker = L.marker(cluster.coords, { icon });

        const aptMatch = prop.address?.match(/\b(apto|apt|ap|casa|unidade|loja)\s*[\d\w]+/i);
        const unitLabel = aptMatch ? ` (${aptMatch[0].toUpperCase()})` : '';
        const tooltipContent = `
          <div style="font-family: sans-serif; font-size: 11.5px; line-height: 1.35; padding: 2px 4px; min-width: 160px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${prop.title}${unitLabel}</div>
            <div style="color: #64748b; font-size: 10.5px; margin-bottom: 4px;">${prop.address}</div>
            <div style="display: flex; justify-content: space-between; gap: 8px; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 3px;">
              <span style="color: #0369a1;">${prop.auctionPrice > 0 ? 'Lance: ' + formatBRL(prop.auctionPrice) : 'Aberto a Propostas'}</span>
              <span style="color: #15803d;">ROI: ${(prop.calculatedRoi || 0).toFixed(1)}%</span>
            </div>
          </div>
        `;
        marker.bindTooltip(tooltipContent, {
          direction: 'top',
          offset: [0, -18],
          opacity: 0.95
        });

        marker.on('click', () => {
          setSelectedPropId(prop.id);
          mapRef.current.setView(cluster.coords, 16, { animate: true });
          const el = document.getElementById(`side-card-${prop.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });

        markersRef.current[prop.id] = marker;
        newMarkersList.push(marker);
      }
    });

    if (clusterGroup.addLayers) {
      clusterGroup.addLayers(newMarkersList);
    } else {
      newMarkersList.forEach(m => clusterGroup.addLayer(m));
    }
  }, [filteredList, selectedPropId, getMapCoordinates]);


useEffect(() => {
  if (!selectedPropId || !mapRef.current) return;
  const target = baseList.find(a => a.id === selectedPropId) || auctions.find(a => a.id === selectedPropId);
  if (!target) return;
  const coords = getMapCoordinates(target);
  const focusKey = coords ? `${selectedPropId}:${coords.join(',')}` : '';
  if (coords && focusKey !== focusedLocationRef.current) {
    focusedLocationRef.current = focusKey;
    mapRef.current.invalidateSize();
    mapRef.current.setView(coords, 18, { animate: false });
  }
}, [selectedPropId, auctions, baseList, getMapCoordinates, mapReady]);

  const handleCardClick = (prop: AuctionProperty) => {
    setSelectedPropId(prop.id);
    const coords = getMapCoordinates(prop);
    if (coords && mapRef.current) {
      mapRef.current.setView(coords, 16, { animate: true });
    }
    if (window.innerWidth < 1024) {
      setActiveTab('map');
    }
  };

  const selectedProp = useMemo(() => {
    return baseList.find(a => a.id === selectedPropId) || auctions.find(a => a.id === selectedPropId) || null;
  }, [auctions, baseList, selectedPropId]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[88vh] sm:h-[90vh] lg:h-[92vh] relative w-full">
      <div className="bg-slate-950/95 border-b border-slate-800 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 z-10">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 sm:p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="font-black text-white text-sm sm:text-base tracking-tight flex items-center gap-2 flex-wrap">
              <span>Mapa Georreferenciado & Fichas</span>
              <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40">
                {filteredList.length} Imóveis Disponíveis {inViewportCount > 0 ? `• ${inViewportCount} no Enquadramento` : ''}
              </span>
              {locationsLoaded && pendingReviewProps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPendingDrawer(true)}
                  className="flex items-center gap-1.5 text-[10.5px] font-bold font-mono bg-amber-950/90 hover:bg-amber-900/90 text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-600/50 cursor-pointer shadow-sm transition-all"
                  title="Imóveis bloqueados no mapa por falta de validação cartográfica estrita de endereço (Evita centroides fictícios)"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>{pendingReviewProps.length} Pendentes de Revisão</span>
                </button>
              )}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
              {!locationsLoaded ? 'Carregando localizações…' : locationError ? 'Não foi possível carregar as localizações. Reabra o mapa para tentar novamente.' : `IBGE · Censo 2022 · ${auctions.length - pendingReviewProps.length} de ${auctions.length} endereços localizados. Pontos de acesso, sujeitos à precisão da coleta.`}
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

          <div className="flex items-center bg-slate-900 p-0.5 sm:p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMapMode('roadmap')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                mapMode === 'roadmap' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mapa
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
            onClick={() => setSelectedTypologyFilter(prev => prev === 'casa' ? null : 'casa')}
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
            onClick={() => setSelectedTypologyFilter(prev => prev === 'apartamento' ? null : 'apartamento')}
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
            onClick={() => setSelectedTypologyFilter(prev => prev === 'comercial' ? null : 'comercial')}
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
            onClick={() => setSelectedTypologyFilter(prev => prev === 'terreno' ? null : 'terreno')}
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
          onClick={() => setShowFactionsLayer(prev => !prev)}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            showFactionsLayer
              ? 'bg-rose-950/90 text-rose-300 border-rose-500 shadow-md shadow-rose-950/50'
              : 'bg-slate-900 text-slate-300 hover:text-white border-slate-750'
          }`}
          title="Camada de controle de facções RJ (dadosderiscos.com.br)"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Risco & Facções RJ</span>
          <span className="sm:hidden">Facções</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${showFactionsLayer ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {showFactionsLayer ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      <div className="relative flex-1 w-full h-full flex flex-col lg:flex-row overflow-hidden">
        <div className={`relative h-full transition-all duration-200 ${
          activeTab === 'list' ? 'hidden' : activeTab === 'map' ? 'w-full' : 'w-full lg:w-8/12 xl:w-[72%]'
        }`}>
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* BARRA FLUTUANTE ESTILO ZAP IMÓVEIS / AIRBNB */}
          <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-center gap-2 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-150">


            <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/95 text-slate-200 px-3.5 py-2 rounded-full border border-slate-750 text-xs font-bold shadow-2xl backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Alta Precisão Rooftop & Cluster Estável</span>
            </div>
          </div>

          {buildingClusterModal && (
            <div className="absolute top-14 left-3 right-3 sm:right-auto sm:w-96 max-h-[70vh] bg-slate-950/98 border border-slate-700 backdrop-blur-xl rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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

              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar max-h-[50vh]">
                {buildingClusterModal.properties.map(item => {
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
                        <span className="font-bold text-white font-mono">{unitLabel} • {item.sizeSqm}m²</span>
                        <span className="text-[10px] font-black text-emerald-400 font-mono">ROI: {(item.calculatedRoi || 0).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between items-center mt-1.5 text-[11px] font-mono">
                        <span className="text-slate-400">Lance: <strong className="text-emerald-300">{item.auctionPrice > 0 ? formatBRL(item.auctionPrice) : 'Aberto a Propostas'}</strong></span>
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

          {selectedProp && (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs bg-slate-950/95 border border-slate-800 backdrop-blur-md rounded-xl p-2.5 shadow-2xl z-20 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[8.5px] font-black uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                      {selectedProp.propertyType} • {selectedProp.sizeSqm}m²
                    </span>
                    {(() => {
                      const risk = checkPropertyCommunityRisk(selectedProp);
                      if (!risk.isRisk) return null;
                      return (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-rose-955/90 text-rose-300 border border-rose-800/70 font-mono" title={risk.communityName ? `Área: ${risk.communityName}` : 'Área de risco'}>
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
                    <span>{selectedProp.address || 'Endereço'}, {selectedProp.neighborhood}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPropId('')}
                  className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-850 text-xs font-mono">
                <div>
                  <span className="text-[8px] text-slate-500 block uppercase font-semibold">Lance</span>
                  <span className="font-black text-emerald-400 text-xs">
                    {selectedProp.auctionPrice > 0 ? formatBRL(selectedProp.auctionPrice) : 'Aberto a Propostas'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-slate-500 block uppercase font-semibold">ITBI</span>
                  <span className="font-black text-amber-400 text-xs">
                    {formatBRL(selectedProp.estimatedValue || 0)}
                  </span>
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

        <div className={`h-full bg-slate-950/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col z-20 relative transition-all duration-200 ${
          activeTab === 'map' ? 'hidden' : activeTab === 'list' ? 'w-full' : 'w-full lg:w-[450px] xl:w-[480px]'
        }`}>
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ListFilter className="w-4 h-4 text-indigo-400" />
              <span className="font-extrabold text-white text-xs sm:text-sm">
                Fichas no Enquadramento
              </span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-bold">
                {displayedList.length}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Clique para focar ou simular
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                <p className="font-bold text-slate-400">Nenhum imóvel neste enquadramento</p>
                <p className="text-[11px] text-slate-500">Mova o mapa ou clique em "Ver todos" para explorar mais regiões.</p>
              </div>
            ) : (
              displayedList.map(auc => {
                const isSelected = auc.id === selectedPropId;
                const totalCost = auc.auctionPrice + (auc.pendingDebts || 0) + (auc.estimatedRepair || 0) + (auc.otherCosts || 0);
                const isFeatured = (auc.calculatedRoi || 0) > 50;

                return (
                  <div
                    key={auc.id}
                    id={`side-card-${auc.id}`}
                    onClick={() => handleCardClick(auc)}
                    className={`bg-slate-900/90 rounded-2xl border transition-all cursor-pointer overflow-visible relative ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-950/50 bg-slate-900'
                        : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
                    }`}
                  >
                    <div className="p-3.5 space-y-2.5">
                      {/* Header Block with Typology and Left Badges, and Thumbnail on the Right */}
                      <div className="flex gap-2.5 items-start justify-between">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="bg-slate-800 text-slate-200 text-[10.5px] font-semibold px-2 py-0.5 rounded border border-slate-700">
                              {auc.propertyType} • {auc.sizeSqm > 0 ? `${auc.sizeApproximate ? '≈ ' : ''}${auc.sizeSqm} m²` : 'Área não confirmada'}
                              {auc.bedrooms ? ` • ${auc.bedrooms} qto${auc.bedrooms > 1 ? 's' : ''}` : ''}
                              {auc.parkingSpaces ? ` • ${auc.parkingSpaces} vg${auc.parkingSpaces > 1 ? 's' : ''}` : ''}
                            </span>

                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                              auc.riskLevel === 'Baixo' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                              auc.riskLevel === 'Médio' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                              'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            }`}>
                              Risco {auc.riskLevel}
                            </span>

                            {/* Alerta Crítico (<= 30m) */}
                            {auc.isCommunityRisk && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60 font-mono inline-flex items-center gap-1">
                                ⛔ {auc.communityName ? `${auc.communityName}` : 'Comunidade'} {auc.factionName ? `(${auc.factionName})` : ''}
                              </span>
                            )}

                            {/* Alerta Informativo de Proximidade (31-500m) */}
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
                              <span>{auc.address || 'Endereço'} ({auc.neighborhood} - {auc.state || 'RJ'})</span>
                            </p>
                            {cleanDivergentNotice(auc.divergentNeighborhoodNotice) && (
                              <div className="pt-0.5">
                                <span className="text-[9px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60 font-mono font-bold inline-flex items-center gap-1" title="Bairro cadastrado no edital difere do endereço real no mapa/cartório">
                                  <span>⚠️</span>
                                  <span>{cleanDivergentNotice(auc.divergentNeighborhoodNotice)}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Thumbnail na DIREITA */}
                        <div className="shrink-0 pt-0.5">
                          <PropertyThumbnail property={auc} size="sm" />
                        </div>
                      </div>

                      {/* Grid Linha 1 de Valores Principais (4 Colunas Perfeitamente Alinhadas) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 items-stretch">
                        {/* Col 1: Lance Mínimo */}
                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Lance Mínimo</span>
                          <span className="text-xs font-black text-white font-mono mt-0.5">{auc.auctionPrice > 0 ? formatBRL(auc.auctionPrice) : 'Aberto a Propostas'}</span>
                        </div>

                        {/* Col 2: Custo Total */}
                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Custo Total</span>
                          <span className="text-xs font-black text-slate-300 font-mono mt-0.5">{auc.auctionPrice > 0 ? formatBRL(totalCost) : 'Sob análise'}</span>
                        </div>

                        {/* Col 3: Lucro Líquido */}
                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Lucro Líquido</span>
                          <span className={`text-xs font-black font-mono mt-0.5 ${auc.hasMicroBenchmark === false ? 'text-slate-400' : (auc.calculatedProfit || 0) >= 0 ? 'text-white' : 'text-rose-400'}`}>
                            {auc.hasMicroBenchmark === false || auc.calculatedProfit === undefined ? 'Sob consulta' : formatBRL(auc.calculatedProfit || 0)}
                          </span>
                        </div>

                        {/* Col 4: Gabarito ITBI (Topo) */}
                        <div className="relative group/itbi bg-amber-950/30 p-1.5 rounded-lg border border-amber-500/40 shadow-xs flex flex-col justify-center cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-[8.5px] text-amber-400 block uppercase font-bold truncate">Gabarito ITBI</span>
                            <span className="text-[8px] text-amber-400/80 font-mono">ℹ️</span>
                          </div>
                          <span className="text-xs font-black text-amber-300 font-mono block mt-0.5">
                            {auc.hasMicroBenchmark === false || (!auc.estimatedValue && !auc.itbiStreetAvgSqm)
                              ? <span className="text-amber-400/90 font-mono text-[10px]">Sem amostragem</span>
                              : (auc.estimatedValue ? formatBRL(auc.estimatedValue) : (auc.itbiUnitValueAvg ? formatBRL(auc.itbiUnitValueAvg * auc.sizeSqm) : '-'))}
                          </span>

                          {/* Tooltip flutuante no hover */}
                          <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-slate-950/98 text-slate-200 rounded-xl border border-amber-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/itbi:opacity-100 transition-opacity z-50 text-left">
                            <div className="text-[10.5px] font-bold text-amber-300 mb-1">
                              🏛️ Gabarito Oficial de ITBI
                            </div>
                            <p className="text-[9.5px] text-slate-300 leading-relaxed font-sans">
                              Média pericial de escrituras públicas de cartório registradas nesta rua e bairro (NBR 14.653 com Chauvenet).
                            </p>
                            <div className="mt-1.5 pt-1 border-t border-slate-800 text-[9px] font-mono text-slate-400 flex justify-between">
                              <span>Unitário:</span>
                              <strong className="text-amber-300">R$ {(auc.itbiStreetAvgSqm || auc.itbiUnitValueAvg || 0).toLocaleString('pt-BR')}/m²</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Grid Linha 2: ROI, Avaliação, Liquidez & Flip Rápido (4 Colunas Perfeitamente Alinhadas) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 items-stretch text-left">
                        {/* Col 1: ROI Estimado */}
                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">ROI Estimado</span>
                          <span className={`text-xs font-black font-mono mt-0.5 ${
                            auc.hasMicroBenchmark === false ? 'text-slate-400' :
                            (auc.calculatedRoi || 0) > 40 ? 'text-emerald-400' : 'text-indigo-400'
                          }`}>
                            {auc.hasMicroBenchmark === false || auc.calculatedRoi === undefined ? 'Sob consulta' : `${auc.calculatedRoi.toLocaleString('pt-BR')}%`}
                          </span>
                        </div>

                        {/* Col 2: Avaliação Caixa */}
                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Avaliação Caixa</span>
                          <span className="text-xs font-black text-slate-300 font-mono mt-0.5">
                            {auc.evaluationPrice ? formatBRL(auc.evaluationPrice) : '-'}
                          </span>
                        </div>

                        {/* Col 3: Liquidez (Do Lado Esquerdo do Flip Rápido) */}
                        <div className="relative group/liq bg-slate-950/40 p-1.5 rounded-lg border border-slate-800 flex flex-col justify-center cursor-help">
                          {(() => {
                            const effScore = auc.liquidityScore || 5;
                            const streetCount = auc.itbiStreetCount || 0;
                            const roi = auc.calculatedRoi || 0;
                            const profit = auc.calculatedProfit || 0;
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-[8.5px] text-slate-400 font-medium block">Liquidez</span>
                                  <span className="text-[8px] text-slate-400 font-mono">ℹ️</span>
                                </div>
                                <span className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${
                                  effScore >= 7 ? 'text-emerald-400' : 'text-amber-400'
                                }`}>
                                  {effScore}/10
                                </span>

                                {/* Tooltip flutuante no hover */}
                                <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-slate-950/98 text-slate-200 rounded-xl border border-indigo-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/liq:opacity-100 transition-opacity z-50 text-left">
                                  <div className="text-[10.5px] font-bold text-indigo-300 mb-1">
                                    📊 Indicador de Liquidez ({effScore}/10)
                                  </div>
                                  <div className="text-[9px] text-slate-300 space-y-1 font-sans">
                                    <div className="flex justify-between border-b border-slate-850 pb-0.5">
                                      <span>Amostras na Via:</span>
                                      <strong className="font-mono text-slate-200">{streetCount} tx</strong>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-850 pb-0.5">
                                      <span>Margem de Retorno:</span>
                                      <strong className="font-mono text-emerald-400">ROI {roi}%</strong>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Col 4: Flip Rápido (60d) - EXATAMENTE EMBAIXO DO GABARITO ITBI */}
                        <div className="relative group/flip bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-500/40 shadow-xs flex flex-col justify-center cursor-help">
                          <div className="flex items-center justify-between">
                            <span className="text-[8.5px] text-emerald-400 block uppercase font-bold truncate" title="Flip Rápido (60d)">
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

                          {/* Tooltip flutuante no hover */}
                          <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-slate-950/98 text-slate-200 rounded-xl border border-emerald-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/flip:opacity-100 transition-opacity z-50 text-left">
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
                          🏛️ ITBI: {auc.itbiStreetAvgSqm ? `${formatBRL(auc.itbiStreetAvgSqm)}/m²` : (auc.itbiUnitValueAvg ? `${formatBRL(auc.itbiUnitValueAvg)}/m²` : 'Sem dados')}
                        </span>
                        {auc.streetPortalAvgSqm && (
                          <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-indigo-300">
                            🌐 Portais: {formatBRL(auc.streetPortalAvgSqm)}/m²
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded border ${
                          auc.occupied ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                        }`}>
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
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl border border-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
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
              <button type="button" onClick={() => setVisibleCardCount(count => count + 100)} className="w-full rounded-xl bg-slate-800 p-3 text-sm font-bold text-white hover:bg-slate-700">
                Mostrar mais fichas ({displayedList.length} de {orderedList.length})
              </button>
            )}
          </div>

                  </div>
      </div>

      {/* Simulator Side Drawer (Abre da direita para a esquerda ocupando 50% da tela) */}
      {simulatingProperty && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div 
            onClick={() => setSimulatingProperty(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
          />
          <div className="absolute inset-0 flex justify-end pointer-events-none">
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="pointer-events-auto w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
              <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Simulação de Viabilidade & Jurídico
                    </h3>
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
                    acquisitionRule: simulatingProperty.origin === 'caixa' || (simulatingProperty.id && simulatingProperty.id.includes('caixa')) ? 'caixa' : 'leilao',
                  }}
                  onUpdateProperty={async (updates) => {
                    setSimulatingProperty(prev => prev ? { ...prev, ...updates } : null);
                    if (onUpdateProperty) await onUpdateProperty({ ...updates, id: simulatingProperty.id });
                  }}
                  onClose={() => setSimulatingProperty(null)}
                />
              </div>
            </motion.div>
          </div>
        </div>, document.body
      )}
      {/* Pending Review Drawer / Modal (Regra de Ouro: Imóveis bloqueados para evitar falsa precisão) */}
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
                pendingReviewProps.map(item => (
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
                          {item.neighborhood || 'Bairro N/D'}, {item.city || 'Cidade não informada'} - {item.state || 'UF não informada'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                        Endereço: {item.address || 'Não informado no edital'}
                      </p>
                      <p className="text-xs text-amber-300 mt-1">{({ missing_number: 'Número não informado no endereço', address_not_found: 'Rua e número ainda não encontrados na base oficial', block_not_confirmed: 'Bloco do condomínio ainda não confirmado', multiple_address_points: 'Mais de um ponto corresponde ao endereço', no_original_coordinate: 'A base dispõe apenas de coordenada estimada', municipality_not_found: 'Município ainda não localizado na base', not_yet_matched: 'Endereço aguardando cruzamento com a base oficial' } as Record<string,string>)[locationRecords[item.id]?.reason] || 'Localização pendente de confirmação'}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300">
                        <span>Lance: <b className="text-emerald-400">{item.auctionPrice > 0 ? formatBRL(item.auctionPrice) : 'Aberto a Propostas'}</b></span>
                        {item.estimatedValue && <span>Avaliação: <b>{formatBRL(item.estimatedValue)}</b></span>}
                        {item.sizeSqm && <span>Área: <b>{item.sizeSqm}m²</b></span>}
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

      {/* Botão Flutuante Mobile QuintoAndar/Airbnb: Alternar entre Mapa e Lista */}
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
