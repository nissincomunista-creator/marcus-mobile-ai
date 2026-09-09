import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

interface PropertyMapProps {
  auctions: AuctionProperty[];
  initialFilteredAuctions?: AuctionProperty[];
  onSelectPropertyFromMap: (id: string) => void;
  initialSelectedPropertyId?: string;
  onClose?: () => void;
}

export default function PropertyMap({ 
  auctions, 
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
  const [isViewportDirty, setIsViewportDirty] = useState<boolean>(false);
  const [isSearchingArea, setIsSearchingArea] = useState<boolean>(false);
  const [autoSearchOnMove, setAutoSearchOnMove] = useState<boolean>(true);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<Record<string, [number, number]>>({});
  const autoSearchOnMoveRef = useRef<boolean>(true);
  const autoSearchTimerRef = useRef<any>(null);
  const handleSearchInAreaRef = useRef<() => void>(() => {});
  const spiderfyLayerRef = useRef<any>(null);
  const geocodeAttemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    autoSearchOnMoveRef.current = autoSearchOnMove;
  }, [autoSearchOnMove]);

  const getMapCoordinates = useCallback((property: AuctionProperty): [number, number] | null => {
    return resolvedCoordinates[property.id] || getPropertyCoordinates(property);
  }, [resolvedCoordinates]);
  
  const pendingReviewProps = useMemo(() => {
    return auctions.filter(a => getMapCoordinates(a) === null);
  }, [auctions, getMapCoordinates]);
  
  const factionsGeoJsonRef = useRef<any>(null);
  const [areaFilteredProps, setAreaFilteredProps] = useState<AuctionProperty[] | null>(() => {
    if (initialSelectedPropertyId) {
      const found = auctions.find(a => a.id === initialSelectedPropertyId);
      return found ? [found] : null;
    }
    if (initialFilteredAuctions && initialFilteredAuctions.length !== auctions.length && initialFilteredAuctions.length > 0) {
      return initialFilteredAuctions;
    }
    return null;
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const activeTileLayerRef = useRef<any>(null);

  const baseList = areaFilteredProps !== null ? areaFilteredProps : auctions;

  const filteredList = useMemo(() => {
    return baseList.filter(a => {
      if (stateFilter && (a.state || 'SP').toUpperCase() !== stateFilter.toUpperCase()) {
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

  const displayedList = useMemo(() => {
    if (areaFilteredProps !== null) {
      if (selectedPropId) {
        const sel = filteredList.find(p => p.id === selectedPropId);
        const others = filteredList.filter(p => p.id !== selectedPropId);
        return sel ? [sel, ...others.slice(0, 199)] : filteredList.slice(0, 200);
      }
      return filteredList.slice(0, 200);
    }
    const sorted = [...filteredList].sort((a, b) => (b.calculatedRoi || 0) - (a.calculatedRoi || 0));
    const top = sorted.slice(0, 100);
    if (selectedPropId) {
      const sel = filteredList.find(p => p.id === selectedPropId);
      if (sel) {
        return [sel, ...top.filter(p => p.id !== selectedPropId)];
      }
    }
    return top;
  }, [filteredList, areaFilteredProps, selectedPropId]);

  const clearSpiderfy = () => {
    if (spiderfyLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(spiderfyLayerRef.current);
      spiderfyLayerRef.current = null;
    }
  };

  const applyVisualSpiderfy = (cluster: { address: string; coords: [number, number]; properties: AuctionProperty[] }) => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    clearSpiderfy();

    const spiderGroup = L.layerGroup();
    const count = cluster.properties.length;
    const [centerLat, centerLng] = cluster.coords;

    cluster.properties.forEach((prop, idx) => {
      const angle = (2.0 * Math.PI * idx) / count;
      const radiusMeters = Math.min(42.0, 16.0 + count * 2.8);
      const latDelta = radiusMeters / 111000.0;
      const lonDelta = radiusMeters / (111000.0 * Math.cos(centerLat * Math.PI / 180.0));

      const spiderLat = centerLat + latDelta * Math.sin(angle);
      const spiderLon = centerLng + lonDelta * Math.cos(angle);

      // Linha pontilhada conectando o centro físico ao marcador visual expandido
      const leg = L.polyline([[centerLat, centerLng], [spiderLat, spiderLon]], {
        color: '#818cf8',
        weight: 2,
        dashArray: '3, 4',
        opacity: 0.85
      });
      leg.addTo(spiderGroup);

      const aptMatch = prop.address?.match(/\b(apto|apt|ap|casa|unidade|loja)\s*[\d\w]+/i);
      const label = aptMatch ? aptMatch[0].toUpperCase() : `U${idx + 1}`;

      const spiderIcon = L.divIcon({
        className: 'custom-spider-marker',
        html: `
          <div class="flex items-center justify-center px-2 py-1 rounded-lg bg-indigo-950/95 border-2 border-amber-400 text-amber-300 font-mono font-black text-[10px] shadow-2xl hover:scale-125 transition-all cursor-pointer whitespace-nowrap">
            🏢 ${label}
          </div>
        `,
        iconSize: [52, 24],
        iconAnchor: [26, 12]
      });

      const spMarker = L.marker([spiderLat, spiderLon], { icon: spiderIcon }).addTo(spiderGroup);

      spMarker.bindTooltip(`
        <div style="font-family: sans-serif; font-size: 11px; padding: 2px 4px;">
          <strong>${prop.title}</strong><br/>
          <span style="color: #0284c7;">Lance: ${formatBRL(prop.auctionPrice)}</span> | 
          <span style="color: #16a34a;">ROI: ${(prop.calculatedRoi || 0).toFixed(0)}%</span>
        </div>
      `, { direction: 'top', offset: [0, -12] });

      spMarker.on('click', (e: any) => {
        if (e && e.originalEvent) e.originalEvent.stopPropagation();
        setSelectedPropId(prop.id);
        const el = document.getElementById(`side-card-${prop.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    spiderGroup.addTo(mapRef.current);
    spiderfyLayerRef.current = spiderGroup;
  };

  const handleSearchInArea = async () => {
    if (!mapRef.current) return;
    setIsSearchingArea(true);
    try {
      const bounds = mapRef.current.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      clearSpiderfy();

      let fetchedProps: AuctionProperty[] = [];
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/auctions/bbox?minLat=${sw.lat}&maxLat=${ne.lat}&minLon=${sw.lng}&maxLon=${ne.lng}`, { headers });
        if (res.ok) {
          const data = await res.json();
          fetchedProps = Array.isArray(data) ? data : (data.properties || []);
        }
      } catch (err) {
        console.warn('Fallback local para busca viewport:', err);
      }

      if (!fetchedProps || fetchedProps.length === 0) {
        fetchedProps = auctions.filter(a => {
          const coords = getMapCoordinates(a);
          return coords ? bounds.contains(coords) : false;
        });
      }

      setAreaFilteredProps(fetchedProps.slice(0, 150));
      setIsViewportDirty(false);
    } catch (e) {
      console.error('Erro na busca por viewport:', e);
    } finally {
      setIsSearchingArea(false);
    }
  };

  useEffect(() => {
    handleSearchInAreaRef.current = handleSearchInArea;
  });

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

      const tileRoad = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      });
      tileRoad.addTo(map);
      activeTileLayerRef.current = tileRoad;

      let syncTimer: any = null;
      const syncBounds = () => {
        if (!mapRef.current) return;
        const bounds = mapRef.current.getBounds();
        const inside: AuctionProperty[] = [];
        for (const a of auctions) {
          const coords = getPropertyCoordinates(a);
          if (coords && bounds.contains(coords)) {
            inside.push(a);
            if (inside.length >= 150) break;
          }
        }
        setAreaFilteredProps(inside);
      };

      map.on('moveend', () => {
        setIsViewportDirty(true);
        if (autoSearchOnMoveRef.current) {
          if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current);
          autoSearchTimerRef.current = setTimeout(() => {
            if (handleSearchInAreaRef.current) handleSearchInAreaRef.current();
          }, 450);
        }
      });
      map.on('zoomend', () => {
        setIsViewportDirty(true);
        if (autoSearchOnMoveRef.current) {
          if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current);
          autoSearchTimerRef.current = setTimeout(() => {
            if (handleSearchInAreaRef.current) handleSearchInAreaRef.current();
          }, 450);
        }
      });
      map.on('click', () => {
        clearSpiderfy();
      });

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          syncBounds();
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
    const unlocated = displayedList.filter(p => getMapCoordinates(p) === null);
    if (unlocated.length === 0) return;

    let isSubscribed = true;
    async function geocodeBatch() {
      // Requests are deliberately bounded and only accept an address-level
      // answer. A missing result remains in the review drawer instead of being
      // placed at a neighborhood/city centroid.
      for (const prop of unlocated.slice(0, 12)) {
        if (!isSubscribed) break;
        if (geocodeAttemptedRef.current.has(prop.id)) continue;

        const address = prop.address?.trim() || '';
        if (!address || !/^(?:rua|r\.|avenida|av\.|estrada|est\.|travessa|trav\.|alameda|al\.|praca|praça|pca\.|rodovia|rod\.|largo|beco|ladeira)\b/i.test(address)) {
          geocodeAttemptedRef.current.add(prop.id);
          continue;
        }

        geocodeAttemptedRef.current.add(prop.id);
        try {
          const params = new URLSearchParams({
            q: address,
            address,
            neighborhood: prop.neighborhood || '',
            city: prop.city || '',
            state: prop.state || 'RJ'
          });
          const res = await fetch(`/api/geocode?${params.toString()}`);
          if (res.ok) {
            const geo = await res.json();
            if (
              geo?.precision &&
              Number.isFinite(geo.lat) &&
              Number.isFinite(geo.lng) &&
              isSubscribed
            ) {
              setResolvedCoordinates(current => (
                current[prop.id]
                  ? current
                  : { ...current, [prop.id]: [geo.lat, geo.lng] }
              ));
            }
          }
        } catch (e) {}
      }
    }
    geocodeBatch();
    return () => { isSubscribed = false; };
  }, [displayedList, getMapCoordinates]);

  useEffect(() => {
    const L = (window as any).L;
  if (!L || !mapRef.current) return;

  Object.values(markersRef.current).forEach((m: any) => m.remove());
  markersRef.current = {};

  const createCustomIcon = (prop: AuctionProperty, isSelected: boolean) => {
    const typeStr = (prop.propertyType || '').toLowerCase();
    const isCaixa = prop.origin === 'caixa' || prop.id.includes('caixa');

    let bg = 'bg-blue-600 border-blue-300 text-white';
    if (typeStr.includes('casa') || typeStr.includes('sobrado')) {
      bg = 'bg-emerald-600 border-emerald-300 text-white';
    } else if (typeStr.includes('comercial') || typeStr.includes('loja') || typeStr.includes('sala') || typeStr.includes('galpao') || typeStr.includes('predio')) {
      bg = 'bg-amber-500 border-amber-200 text-slate-950';
    } else if (typeStr.includes('terreno') || typeStr.includes('lote') || typeStr.includes('gleba')) {
      bg = 'bg-purple-600 border-purple-300 text-white';
    }

    const ringClass = isSelected ? 'ring-4 ring-white scale-125 z-50 shadow-2xl' : 'hover:scale-110 shadow-lg';

    return L.divIcon({
      className: 'custom-map-marker',
      html: `<div class="flex items-center justify-center w-8 h-8 rounded-full ${bg} ${ringClass} font-black text-[12px] border-2 transition-all cursor-pointer">${isCaixa ? '🏦' : '⚖️'}</div>`,
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

  displayedList.forEach(prop => {
    const baseCoords = getMapCoordinates(prop);
    if (!baseCoords) return; // REGRA DE OURO: Bloqueio rigoroso de falsa precisão

    const addrClean = (prop.address || '').split(',')[0].trim().toLowerCase();
    const numMatch = (prop.address || '').match(/,\s*n[ºo°.]?\s*(\d+)/i) || (prop.address || '').match(/\b(\d{2,5})\b/);
    const numStr = numMatch ? numMatch[1] : '';
    const clusterKey = `${baseCoords[0].toFixed(4)}_${baseCoords[1].toFixed(4)}_${addrClean}_${numStr}`;

    if (!clusterMap[clusterKey]) {
      clusterMap[clusterKey] = {
        key: clusterKey,
        address: prop.address || prop.title,
        coords: baseCoords,
        properties: []
      };
      buildingClusters.push(clusterMap[clusterKey]);
    }
    clusterMap[clusterKey].properties.push(prop);
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

      marker = L.marker(cluster.coords, { icon: clusterIcon }).addTo(mapRef.current);

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
        applyVisualSpiderfy(cluster);
        setBuildingClusterModal({ address: cluster.address, properties: cluster.properties });
        mapRef.current.setView(cluster.coords, 16, { animate: true });
        const el = document.getElementById(`side-card-${firstProp.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      cluster.properties.forEach(p => {
        markersRef.current[p.id] = marker;
      });

    } else {
      const prop = firstProp;
      const icon = createCustomIcon(prop, isSelected);
      marker = L.marker(cluster.coords, { icon }).addTo(mapRef.current);

      const aptMatch = prop.address?.match(/\b(apto|apt|ap|casa|unidade|loja)\s*[\d\w]+/i);
      const unitLabel = aptMatch ? ` (${aptMatch[0].toUpperCase()})` : '';
      const tooltipContent = `
        <div style="font-family: sans-serif; font-size: 11.5px; line-height: 1.35; padding: 2px 4px; min-width: 160px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${prop.title}${unitLabel}</div>
          <div style="color: #64748b; font-size: 10.5px; margin-bottom: 4px;">${prop.address}</div>
          <div style="display: flex; justify-content: space-between; gap: 8px; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 3px;">
            <span style="color: #0369a1;">Lance: ${formatBRL(prop.auctionPrice)}</span>
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
    }
  });

  if (selectedPropId && markersRef.current[selectedPropId]) {
    const target = auctions.find(a => a.id === selectedPropId);
    if (target) {
      const coords = getMapCoordinates(target);
      if (coords) mapRef.current.setView(coords, 16, { animate: true });
    }
  }
}, [displayedList, selectedPropId, getMapCoordinates]);

useEffect(() => {
  if (!selectedPropId || !mapRef.current) return;
  const target = auctions.find(a => a.id === selectedPropId);
  if (!target) return;
  const coords = getMapCoordinates(target);
  if (coords) mapRef.current.setView(coords, 16, { animate: true });
}, [selectedPropId, auctions, getMapCoordinates]);

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
    return auctions.find(a => a.id === selectedPropId) || null;
  }, [auctions, selectedPropId]);

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
                {displayedList.length} Imóveis no Enquadramento
              </span>
              {pendingReviewProps.length > 0 && (
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
              Navegue pelo mapa ou consulte as fichas detalhadas ao lado
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
            {(!autoSearchOnMove && isViewportDirty) && (
              <button
                type="button"
                onClick={handleSearchInArea}
                disabled={isSearchingArea}
                className="pointer-events-auto bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border-2 border-indigo-300 cursor-pointer backdrop-blur-md transition-all hover:shadow-indigo-500/50"
              >
                <Search className={`w-3.5 h-3.5 text-amber-300 ${isSearchingArea ? 'animate-spin' : 'animate-bounce'}`} />
                <span>{isSearchingArea ? 'Buscando na área...' : '🔍 Buscar nesta área'}</span>
              </button>
            )}

            <label className="pointer-events-auto flex items-center gap-2 bg-slate-950/95 hover:bg-slate-900 text-slate-200 px-3.5 py-2 rounded-full border border-slate-750 text-xs font-bold shadow-2xl backdrop-blur-md cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={autoSearchOnMove}
                onChange={(e) => setAutoSearchOnMove(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-600 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className="hidden sm:inline">Buscar ao mover o mapa</span>
              <span className="sm:hidden">Auto-buscar</span>
            </label>

            {areaFilteredProps !== null && (
              <button
                onClick={() => setAreaFilteredProps(null)}
                className="pointer-events-auto bg-slate-900/95 hover:bg-slate-850 text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-slate-700 text-xs font-bold shadow-xl cursor-pointer backdrop-blur-md transition-all flex items-center gap-1.5"
                title="Limpar filtro de área e exibir todos os imóveis"
              >
                <X className="w-3.5 h-3.5" />
                <span>Ver todos ({auctions.length})</span>
              </button>
            )}
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
                        <span className="text-slate-400">Lance: <strong className="text-emerald-300">{formatBRL(item.auctionPrice)}</strong></span>
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
                    {formatBRL(selectedProp.auctionPrice)}
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
                              {auc.propertyType} • {auc.sizeSqm} m²
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
                            {auc.divergentNeighborhoodNotice && (
                              <div className="pt-0.5">
                                <span className="text-[9px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60 font-mono font-bold inline-flex items-center gap-1" title="Bairro cadastrado no edital difere do endereço real no mapa/cartório">
                                  <span>⚠️</span>
                                  <span>{auc.divergentNeighborhoodNotice}</span>
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
                          <span className="text-xs font-black text-white font-mono mt-0.5">{formatBRL(auc.auctionPrice)}</span>
                        </div>

                        {/* Col 2: Custo Total */}
                        <div className="flex flex-col justify-center">
                          <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Custo Total</span>
                          <span className="text-xs font-black text-slate-300 font-mono mt-0.5">{formatBRL(totalCost)}</span>
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
                                      <span>Risco Territorial:</span>
                                      <strong className={`font-mono ${auc.isCommunityRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        {auc.isCommunityRisk ? 'Comunidade (Teto 2)' : 'Sem risco crítico'}
                                      </strong>
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
          </div>

                  </div>
      </div>

      {/* Simulator Side Drawer (Abre da direita para a esquerda ocupando 50% da tela) */}
      {simulatingProperty && (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div 
            onClick={() => setSimulatingProperty(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10 pointer-events-none">
            <div className="pointer-events-auto w-screen max-w-full md:max-w-[50vw] lg:max-w-[50vw] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
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
                  prefillData={{
                    ...simulatingProperty,
                    purchasePrice: simulatingProperty.auctionPrice,
                    evaluationPrice: (simulatingProperty as any).evaluationPrice,
                    estimatedValue: simulatingProperty.estimatedValue,
                    vendaBaixaPrice: simulatingProperty.vendaBaixaPrice || Math.round((simulatingProperty.estimatedValue || 0) * 0.90),
                    vendaMediaPrice: simulatingProperty.vendaMediaPrice,
                    ageDepreciationPct: simulatingProperty.ageDepreciationPct,
                    acquisitionRule: simulatingProperty.origin === 'caixa' || (simulatingProperty.id && simulatingProperty.id.includes('caixa')) ? 'caixa' : 'leilao',
                  }}
                  onUpdateProperty={async (updates) => {
                    setAreaFilteredProps(prev => prev ? prev.map(a => a.id === simulatingProperty.id ? { ...a, ...updates } : a) : null);
                    setSimulatingProperty(prev => prev ? { ...prev, ...updates } : null);
                    try {
                      fetch(`/api/auctions/${simulatingProperty.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                      }).catch(() => {});
                    } catch (e) {}
                  }}
                  onClose={() => setSimulatingProperty(null)}
                />
              </div>
            </div>
          </div>
        </div>
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
                    Regra de Ouro Geoespacial: Bloqueio estrito de centroides fictícios para endereços sem validação cartográfica oficial.
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
                          {item.neighborhood || 'Bairro N/D'}, {item.city || 'Rio de Janeiro'} - {item.state || 'RJ'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                        Endereço Bruto: {item.address || 'Não informado no edital'}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300">
                        <span>Lance: <b className="text-emerald-400">{formatBRL(item.auctionPrice)}</b></span>
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
