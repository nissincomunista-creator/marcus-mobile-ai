import React, { useEffect, useRef, useState } from 'react';
import { AuctionProperty } from '../types.ts';
import { getPropertyCoordinates, CITY_COORDS } from '../utils/geoCoords.ts';
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
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const [mapMode, setMapMode] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const tileLayerRef = useRef<any>(null);

  // Format currency
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // Determine initial center based on selected city or default to Rio de Janeiro
  const getTargetCenterAndZoom = (): { center: [number, number]; zoom: number } => {
    const cityKey = (selectedCity || '').toLowerCase().trim();
    if (cityKey && CITY_COORDS[cityKey]) {
      return { center: CITY_COORDS[cityKey], zoom: 12 };
    }
    const stateKey = (selectedState || '').toUpperCase().trim();
    if (stateKey === 'MG') {
      return { center: [-21.7642, -43.3503], zoom: 12 }; // Juiz de Fora default
    }
    return { center: [-22.9068, -43.1729], zoom: 11 }; // Rio de Janeiro default
  };

  // Initialize Map
  useEffect(() => {
    if (isCollapsed) return;
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Clean existing instance if re-initializing
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const { center, zoom } = getTargetCenterAndZoom();

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial Tile Layer
    const tileUrl = mapMode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 18 });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Cluster group or layer group
    const markersGroup = L.markerClusterGroup
      ? L.markerClusterGroup({
          maxClusterRadius: 35,
          showCoverageOnHover: false,
          iconCreateFunction: (cluster: any) => {
            const count = cluster.getChildCount();
            return L.divIcon({
              html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 border-2 border-indigo-300 text-white font-black text-[11px] shadow-lg">${count > 99 ? '99+' : count}</div>`,
              className: 'custom-sidebar-cluster',
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });
          }
        })
      : L.layerGroup();

    markersGroup.addTo(map);
    markersGroupRef.current = markersGroup;

    // Force size calculation after container renders
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isCollapsed]);

  // Update tile layer when mapMode changes
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = mapMode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newLayer = L.tileLayer(tileUrl, { maxZoom: 18 });
    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapMode]);

  // Update markers when auctions list changes
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!L || !map || !group || isCollapsed) return;

    group.clearLayers();

    const sample = auctions.slice(0, 150); // Plot up to 150 for fluid sidebar performance

    sample.forEach((auc) => {
      const coords = getPropertyCoordinates(auc);
      if (!coords) return;

      const isCaixa = (auc.origin || '').toLowerCase().includes('caixa');
      const pinColor = isCaixa ? '#3b82f6' : '#10b981';

      const customIcon = L.divIcon({
        html: `<div style="background-color: ${pinColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 6px rgba(0,0,0,0.6); cursor: pointer;"></div>`,
        className: 'sidebar-mini-pin',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker(coords, { icon: customIcon });

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-slate-900 font-sans max-w-[200px] text-xs';
      popupContent.innerHTML = `
        <div style="font-weight: 800; font-size: 11px; line-height: 1.2; margin-bottom: 4px; color: #0f172a;">
          ${(auc.title || 'Imóvel em Leilão').slice(0, 50)}...
        </div>
        <div style="font-size: 10px; color: #475569; margin-bottom: 6px;">
          ${auc.neighborhood || ''} - ${auc.city || ''}
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 6px;">
          <span style="color: #2563eb;">${formatBRL(auc.auctionPrice)}</span>
          <span style="color: #059669;">ROI: ${auc.calculatedRoi ? `${auc.calculatedRoi.toFixed(0)}%` : '-'}</span>
        </div>
        <button id="btn-view-${auc.id}" style="width: 100%; background: #4f46e5; color: white; border: none; border-radius: 6px; padding: 4px 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
          Simular Imóvel →
        </button>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-view-${auc.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectProperty(auc);
          };
        }
      });

      group.addLayer(marker);
    });

    // Recenter map on selected city/state
    const { center, zoom } = getTargetCenterAndZoom();
    map.setView(center, zoom, { animate: true });
  }, [auctions, selectedCity, selectedState, isCollapsed]);

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
          {/* Botão de Alternar Satélite / Rua */}
          {!isCollapsed && (
            <button
              onClick={() => setMapMode(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={mapMode === 'roadmap' ? 'Mudar para Satélite' : 'Mudar para Mapa Padrão'}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Botão de Expandir Tela Cheia */}
          <button
            onClick={onOpenFullMap}
            className="p-1 rounded-md text-indigo-400 hover:text-white hover:bg-indigo-600 transition-colors cursor-pointer"
            title="Abrir Mapa Completo em Tela Cheia"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Botão de Recolher/Expandir */}
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
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

          {/* Overlay Rodapé com Ação Rápida */}
          <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
            <span className="text-[9.5px] font-bold bg-slate-950/90 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800 backdrop-blur-xs">
              📍 {selectedCity || selectedState || 'RJ · Niterói · JF'}
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
