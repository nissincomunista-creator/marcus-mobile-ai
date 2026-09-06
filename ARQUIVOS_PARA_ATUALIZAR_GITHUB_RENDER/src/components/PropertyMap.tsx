import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuctionProperty } from '../types.ts';
import { MapPin, Layers, Compass, Building } from 'lucide-react';

interface PropertyMapProps {
  auctions: AuctionProperty[];
  onSelectPropertyFromMap: (id: string) => void;
}

// Coordinates mapping for common neighborhoods in RJ and SP
const neighborhoodCoords: Record<string, [number, number]> = {
  // Rio de Janeiro
  'copacabana': [-22.9698, -43.1864],
  'ipanema': [-22.9836, -43.2045],
  'leblon': [-22.9856, -43.2230],
  'barra da tijuca': [-23.0004, -43.3658],
  'botafogo': [-22.9519, -43.1856],
  'flamengo': [-22.9376, -43.1764],
  'tijuca': [-22.9329, -43.2386],
  'centro': [-22.9035, -43.1813],
  'lapa': [-22.9129, -43.1810],
  'santa teresa': [-22.9250, -43.1930],
  'recreio dos bandeirantes': [-23.0180, -43.4650],
  'humaita': [-22.9575, -43.2000],
  'laranjeiras': [-22.9333, -43.1917],
  'catete': [-22.9260, -43.1795],
  'gloria': [-22.9210, -43.1770],
  'urca': [-22.9554, -43.1647],
  'lagoa': [-22.9720, -43.2070],
  'jardim botanico': [-22.9680, -43.2260],
  'gavea': [-22.9790, -43.2340],
  'sao conrado': [-22.9920, -43.2680],
  'jacarepagua': [-22.9680, -43.3400],
  'meier': [-22.9010, -43.2800],
  'madureira': [-22.8760, -43.3360],
  'campo grande': [-22.8988, -43.5586],
  'bangu': [-22.8753, -43.4678],
  'ilha do governador': [-22.8130, -43.2010],
  'jardim guanabara': [-22.8058, -43.2042],

  // São Paulo
  'itaim bibi': [-23.5844, -46.6844],
  'pinheiros': [-23.5670, -46.7022],
  'jardins': [-23.5615, -46.6620],
  'moema': [-23.5997, -46.6622],
  'vila mariana': [-23.5896, -46.6346],
  'perdizes': [-23.5385, -46.6780],
  'santana': [-23.5020, -46.6250],
  'tatuape': [-23.5410, -46.5770],
  'morumbi': [-23.6015, -46.7200],
  'brooklin': [-23.6060, -46.6890]
};

function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getCoords(neighborhood: string, state?: string): [number, number] {
  const key = normalizeString(neighborhood);
  if (neighborhoodCoords[key]) {
    return neighborhoodCoords[key];
  }
  const st = (state || '').toUpperCase().trim();
  if (st === 'RJ') {
    return [-22.9068, -43.1729]; // RJ Center
  }
  return [-23.5505, -46.6333]; // SP Center
}

// Pseudo-random coordinate jittering to prevent markers from stacking perfectly on top of each other
function getPropertyCoords(prop: AuctionProperty): [number, number] {
  const base = getCoords(prop.neighborhood, prop.state);
  let hash = 0;
  const str = prop.address + prop.title + prop.id;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((hash & 0xFF) / 255 - 0.5) * 0.0015;
  const lngOffset = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.0015;
  return [base[0] + latOffset, base[1] + lngOffset];
}

export default function PropertyMap({ auctions, onSelectPropertyFromMap }: PropertyMapProps) {
  const [selectedPropId, setSelectedPropId] = useState<string>('');
  const [mapMode, setMapMode] = useState<'satellite' | 'roadmap'>('roadmap');
  const [stateFilter, setStateFilter] = useState<string>('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const activeTileLayerRef = useRef<any>(null);

  const uniqueStates = useMemo(() => Array.from(new Set(auctions.map(a => a.state || 'SP'))), [auctions]);
  const selectedProp = useMemo(() => auctions.find(a => a.id === selectedPropId), [auctions, selectedPropId]);

  const filteredList = useMemo(() => {
    return auctions.filter(a => {
      if (stateFilter && (a.state || 'SP').toUpperCase() !== stateFilter.toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [auctions, stateFilter]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Define custom marker options to prevent broken images from CDN files
    const DefaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    const startCenter: [number, number] = [-22.9068, -43.1729]; // RJ Default center
    const map = L.map(mapContainerRef.current).setView(startCenter, 12);

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;
    activeTileLayerRef.current = tileLayer;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map tile layer when mapMode changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (activeTileLayerRef.current) {
      mapRef.current.removeLayer(activeTileLayerRef.current);
    }

    let newLayer;
    if (mapMode === 'satellite') {
      newLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, and the GIS User Community'
      });
    } else {
      newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      });
    }

    newLayer.addTo(mapRef.current);
    activeTileLayerRef.current = newLayer;
  }, [mapMode]);

  // Synchronize Markers
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add new markers
    filteredList.forEach(prop => {
      const coords = getPropertyCoords(prop);
      const marker = L.marker(coords).addTo(mapRef.current);

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = 'sans-serif';
      popupContent.style.fontSize = '12px';
      popupContent.style.width = '200px';
      popupContent.style.padding = '4px';

      popupContent.innerHTML = `
        <strong style="color: #1e293b; display: block; font-size: 13px; margin-bottom: 2px;">${prop.title}</strong>
        <span style="color: #64748b; font-size: 11px; display: block; margin-bottom: 8px;">${prop.address} (${prop.neighborhood})</span>
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px;">
          <span style="color: #2563eb;">${formatBRL(prop.auctionPrice)}</span>
          <span style="color: #10b981;">ROI: ${prop.calculatedRoi}%</span>
        </div>
        ${prop.auctionLink ? `
          <a href="${prop.auctionLink}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none; background: #6366f1; color: white; padding: 4px; font-size: 10px; border-radius: 4px; text-align: center; font-weight: bold; margin-bottom: 4px;">
            Acessar Leilão ↗
          </a>
        ` : ''}
        <button id="select-btn-${prop.id}" style="background: #2563eb; color: white; border: 0; padding: 4px; width: 100%; border-radius: 4px; font-weight: bold; cursor: pointer; text-align: center; font-size: 10px;">
          Abrir Simulador
        </button>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedPropId(prop.id);
      });

      marker.on('popupopen', () => {
        setSelectedPropId(prop.id);
        const btn = document.getElementById(`select-btn-${prop.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectPropertyFromMap(prop.id);
          };
        }
      });

      markersRef.current[prop.id] = marker;
    });

    // Zoom fit to markers
    if (filteredList.length > 0) {
      const points = filteredList.map(p => getPropertyCoords(p));
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [filteredList]);



  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col lg:flex-row h-[76vh]">
      {/* 1. Sidebar listings pane */}
      <div className="w-full lg:w-96 border-r border-gray-100 flex flex-col bg-slate-50 shrink-0 h-1/2 lg:h-full">
        {/* Header controller */}
        <div className="p-4 bg-white border-b border-gray-100 space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>Geolocalizador Urbanístico</span>
            </h3>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
              {filteredList.length} do leilão
            </span>
          </div>

          {/* Filter dropdown */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Estado:</span>
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  const matches = auctions.filter(a => !e.target.value || (a.state || 'SP').toLowerCase() === e.target.value.toLowerCase());
                  if (matches.length > 0) {
                    setSelectedPropId(matches[0].id);
                  }
                }}
                className="text-xs bg-slate-100 border border-gray-200 rounded p-1 hover:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
              >
                <option value="">Todos</option>
                {uniqueStates.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Map Mode Buttons */}
            <div className="flex items-center space-x-1 border border-gray-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
              <button
                onClick={() => setMapMode('satellite')}
                className={`px-2 py-1 text-[9px] font-bold rounded transition-colors flex items-center space-x-0.5 ${
                  mapMode === 'satellite' ? 'bg-slate-800 text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Alternar para Visão de Satélite"
              >
                <Layers className="w-3 h-3" />
                <span>Satélite</span>
              </button>
              <button
                onClick={() => setMapMode('roadmap')}
                className={`px-2 py-1 text-[9px] font-bold rounded transition-colors ${
                  mapMode === 'roadmap' ? 'bg-slate-800 text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Alternar para Mapa Urbano"
              >
                Urbano
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable list body */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">Nenhum imóvel nessa região.</p>
            </div>
          ) : (
            filteredList.map((prop) => {
              const isSelected = prop.id === selectedPropId;

              return (
                <div
                  key={prop.id}
                  onClick={() => {
                    setSelectedPropId(prop.id);
                    if (mapRef.current) {
                      const coords = getPropertyCoords(prop);
                      mapRef.current.setView(coords, 14);
                      const marker = markersRef.current[prop.id];
                      if (marker && !marker.isPopupOpen()) {
                        marker.openPopup();
                      }
                    }
                  }}
                  className={`p-3.5 cursor-pointer hover:bg-slate-100/75 transition-colors flex items-start space-x-3 text-left ${
                    isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200/60 text-slate-500'}`}>
                    <Building className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate" title={prop.title}>
                      {prop.title}
                    </h4>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5" title={prop.address}>
                      {prop.address} ({prop.neighborhood} - {prop.state || 'SP'})
                    </p>
                    
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-[10px] text-gray-400 font-mono">
                        Lote: <strong className="text-slate-700">{formatBRL(prop.auctionPrice)}</strong>
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 py-0.5 rounded font-mono">
                        ROI: {prop.calculatedRoi}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Map container */}
      <div className="flex-1 h-1/2 lg:h-full relative bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0"></div>
        
        {/* Helper overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-900/85 text-white rounded-lg px-3 py-1.5 text-[10px] z-10 flex items-center space-x-1.5 shadow backdrop-blur-xs font-mono max-w-sm border border-slate-700 pointer-events-none">
          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Arraste o mapa para explorar os pinos fixados nas localizações aproximadas.</span>
        </div>
      </div>
    </div>
  );
}
