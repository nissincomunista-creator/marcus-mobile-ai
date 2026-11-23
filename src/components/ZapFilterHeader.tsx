import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  ChevronDown,
  Layers,
  Building2,
  Gavel,
  FileText,
  Check,
  SlidersHorizontal,
  RefreshCw,
  Bookmark,
  Search,
  X,
  ArrowUpDown,
  Flame,
  Sparkles,
  Map as MapIcon,
  List,
  ShieldAlert,
  BedDouble,
  Car,
  Home,
} from 'lucide-react';
import { BRAZIL_STATES, VALID_ITBI_CITIES_BY_STATE } from '../types.ts';

interface AuctioneerCountItem {
  name: string;
  count: number;
}

interface ZapFilterHeaderProps {
  mode: 'auctions' | 'portais';
  syncStatus?: {
    lastSyncTime: string;
    isSyncing: boolean;
    totalLots: number;
    onRefresh: () => void | Promise<void>;
  };
  // Location
  selectedStateFilter: string;
  setSelectedStateFilter: (val: string) => void;
  uniqueStates: string[];
  selectedCityFilter: string;
  setSelectedCityFilter: (val: string) => void;
  citySearchInput: string;
  setCitySearchInput: (val: string) => void;
  filteredCitiesTypeahead: string[];
  selectedNeighborhoods: string[];
  setSelectedNeighborhoods: (val: string[]) => void;
  setSelectedNeighborhoodFilter: (val: string) => void;
  neighborhoodSearch: string;
  setNeighborhoodSearch: (val: string) => void;
  visibleNeighborhoods: { name: string; count: number }[];
  handleToggleNeighborhood: (name: string) => void;
  handleSelectAllNeighborhoods: () => void;
  handleClearNeighborhoods: () => void;
  locationScopeText: string;
  // Origin & Auctioneers
  selectedOriginFilter: 'todos' | 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal';
  setSelectedOriginFilter: (val: 'todos' | 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal') => void;
  caixaSubModes: { vendaDireta: boolean; vendaOnline: boolean; licitacao: boolean; leilaoSfi: boolean };
  setCaixaSubModes: React.Dispatch<
    React.SetStateAction<{ vendaDireta: boolean; vendaOnline: boolean; licitacao: boolean; leilaoSfi: boolean }>
  >;
  caixaModalityCounts: { total: number; vendaDireta: number; vendaOnline: number; licitacao: number; leilaoSfi: number };
  selectedAuctioneerFilter: string;
  setSelectedAuctioneerFilter: React.Dispatch<React.SetStateAction<string>>;
  activeJudicialAuctioneers: AuctioneerCountItem[];
  activeExtrajudicialAuctioneers: AuctioneerCountItem[];
  // Portais (Flip House)
  advancedContextTab: 'comprar' | 'alugar' | 'novo';
  setAdvancedContextTab: (val: 'comprar' | 'alugar' | 'novo') => void;
  selectedPortals: string[];
  ALL_PORTALS: readonly string[];
  portalCounts: Record<string, number>;
  totalPortalCount: number;
  handleTogglePortal: (name: string) => void;
  handleToggleAllPortals: () => void;
  handleSelectAllPortals: () => void;
  handleClearPortals: () => void;
  onGarimparPortais: (
    city?: string,
    portals?: string[],
    neighborhoods?: string[],
    transactionType?: 'aluguel' | 'venda',
    isSilent?: boolean
  ) => void;
  // Condições & Ocupação
  onlyFinancing: boolean;
  setOnlyFinancing: React.Dispatch<React.SetStateAction<boolean>>;
  onlyInstallments: boolean;
  setOnlyInstallments: React.Dispatch<React.SetStateAction<boolean>>;
  onlyVacant: boolean;
  setOnlyVacant: React.Dispatch<React.SetStateAction<boolean>>;
  // Type / Rooms / Parking
  selectedTypeFilter: string;
  setSelectedTypeFilter: (val: string) => void;
  bedroomsFilter: number | null;
  setBedroomsFilter: (val: number | null) => void;
  parkingFilter: number | null;
  setParkingFilter: (val: number | null) => void;
  // Advanced & Presets
  activeAdvancedFiltersCount: number;
  onOpenAdvancedFilters: () => void;
  onOpenPresets: () => void;
  savedPresetsCount: number;
  onClearAllFilters: () => void;
  // Thin strip: counts, sort, viewMode, factions
  matchingCount: number;
  temporalSortMode: 'neutral' | 'urgent' | 'newest';
  setTemporalSortMode: (val: 'neutral' | 'urgent' | 'newest') => void;
  setSortBy: (val: string) => void;
  strategyFilters: {
    liquidity: boolean;
    roi: boolean;
    profit: boolean;
    spread: boolean;
    discount: boolean;
    lowestSqm: boolean;
    under250k: boolean;
    superCheap: boolean;
    lowestRent: boolean;
    lowestRentSqm: boolean;
    bestRentDiscount: boolean;
  };
  setStrategyFilters: React.Dispatch<
    React.SetStateAction<{
      liquidity: boolean;
      roi: boolean;
      profit: boolean;
      spread: boolean;
      discount: boolean;
      lowestSqm: boolean;
      under250k: boolean;
      superCheap: boolean;
      lowestRent: boolean;
      lowestRentSqm: boolean;
      bestRentDiscount: boolean;
    }>
  >;
  isMining: boolean;
  onSyncNow: () => void;
  viewMode: 'list' | 'map';
  setViewMode: (mode: 'list' | 'map') => void;
  onResetFocusedMapProp: () => void;
  showMapFactions: boolean;
  setShowMapFactions: React.Dispatch<React.SetStateAction<boolean>>;
}

type PopoverKey = null | 'location' | 'leiloes' | 'condicoes' | 'tipo' | 'quartos' | 'vagas' | 'sort';

export default function ZapFilterHeader(props: ZapFilterHeaderProps) {
  const {
    mode,
    syncStatus,
    selectedStateFilter,
    setSelectedStateFilter,
    uniqueStates,
    selectedCityFilter,
    setSelectedCityFilter,
    citySearchInput,
    setCitySearchInput,
    filteredCitiesTypeahead,
    selectedNeighborhoods,
    setSelectedNeighborhoods,
    setSelectedNeighborhoodFilter,
    neighborhoodSearch,
    setNeighborhoodSearch,
    visibleNeighborhoods,
    handleToggleNeighborhood,
    handleSelectAllNeighborhoods,
    handleClearNeighborhoods,
    selectedOriginFilter,
    setSelectedOriginFilter,
    caixaSubModes,
    setCaixaSubModes,
    caixaModalityCounts,
    selectedAuctioneerFilter,
    setSelectedAuctioneerFilter,
    activeJudicialAuctioneers,
    activeExtrajudicialAuctioneers,
    advancedContextTab,
    setAdvancedContextTab,
    selectedPortals,
    ALL_PORTALS,
    portalCounts,
    totalPortalCount,
    handleTogglePortal,
    handleToggleAllPortals,
    handleSelectAllPortals,
    handleClearPortals,
    onGarimparPortais,
    onlyFinancing,
    setOnlyFinancing,
    onlyInstallments,
    setOnlyInstallments,
    onlyVacant,
    setOnlyVacant,
    selectedTypeFilter,
    setSelectedTypeFilter,
    bedroomsFilter,
    setBedroomsFilter,
    parkingFilter,
    setParkingFilter,
    activeAdvancedFiltersCount,
    onOpenAdvancedFilters,
    onOpenPresets,
    savedPresetsCount,
    onClearAllFilters,
    matchingCount,
    temporalSortMode,
    setTemporalSortMode,
    setSortBy,
    strategyFilters,
    setStrategyFilters,
    isMining,
    onSyncNow,
    viewMode,
    setViewMode,
    onResetFocusedMapProp,
    showMapFactions,
    setShowMapFactions,
  } = props;

  const [openPopover, setOpenPopover] = useState<PopoverKey>(null);
  const [cityListVisible, setCityListVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPopover(null);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const togglePopover = (key: PopoverKey) => {
    setOpenPopover((prev) => (prev === key ? null : key));
  };

  const conditionsCount = (onlyFinancing ? 1 : 0) + (onlyInstallments ? 1 : 0) + (onlyVacant ? 1 : 0);

  const locationSummary = (() => {
    if (selectedNeighborhoods.length > 0) {
      return selectedNeighborhoods.length === 1
        ? `${selectedNeighborhoods[0]}${selectedCityFilter ? ` · ${selectedCityFilter}` : ''}`
        : `${selectedNeighborhoods.length} bairros${selectedCityFilter ? ` · ${selectedCityFilter}` : ''}`;
    }
    if (selectedCityFilter) {
      return `${selectedCityFilter}${selectedStateFilter ? ` (${selectedStateFilter})` : ''}`;
    }
    if (selectedStateFilter) {
      return `Estado: ${selectedStateFilter}`;
    }
    return 'Estado / Cidade / Bairros';
  })();

  const originLabel = (() => {
    if (mode === 'portais') {
      return advancedContextTab === 'alugar'
        ? `Alugar (${selectedPortals.length})`
        : `Portais (${selectedPortals.length})`;
    }
    if (selectedOriginFilter === 'caixa') return 'Imóveis Caixa';
    if (selectedOriginFilter === 'judicial') {
      return selectedAuctioneerFilter ? selectedAuctioneerFilter : 'Judiciais';
    }
    if (selectedOriginFilter === 'extrajudicial') {
      return selectedAuctioneerFilter ? selectedAuctioneerFilter : 'Extrajudiciais';
    }
    return 'Leilões';
  })();

  const pillBase =
    'px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap';
  const pillActive = 'bg-indigo-600/25 text-indigo-200 border-indigo-400 shadow-sm shadow-indigo-950/50';
  const pillIdle = 'bg-slate-950/90 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white';

  const PROPERTY_TYPES: { value: string; label: string }[] = [
    { value: '', label: 'Todos os Tipos' },
    { value: 'Apartamento', label: 'Apartamento' },
    { value: 'Casa', label: 'Casa' },
    { value: 'Comercial', label: 'Comercial / Sala / Loja' },
    { value: 'Terreno', label: 'Terreno' },
    { value: 'Lote', label: 'Lote' },
  ];

  const activeStrategyLabel = (() => {
    if (strategyFilters.profit) return 'Maior Lucro Real';
    if (strategyFilters.roi) return 'Maior ROI';
    if (strategyFilters.liquidity) return 'Maior Liquidez';
    if (strategyFilters.spread) return 'Maior Spread/m²';
    if (strategyFilters.discount) return 'Maior Desconto';
    if (strategyFilters.lowestSqm) return 'Menor Preço/m²';
    if (strategyFilters.under250k) return 'Até R$ 250k';
    if (strategyFilters.superCheap) return 'Super Barato';
    if (strategyFilters.bestRentDiscount) return 'Maior Desconto Aluguel';
    if (temporalSortMode === 'urgent') return mode === 'portais' ? 'Mais Antigos' : 'Próximas Praças';
    if (temporalSortMode === 'newest') return 'Inclusão Mais Recente';
    return 'Maior ROI';
  })();

  return (
    <div ref={barRef} className="space-y-2 relative z-30">
      {/* CAIXA PRINCIPAL DO CABEÇALHO DE FILTROS (ESTILO ZAP IMÓVEIS) */}
      <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl px-3.5 py-2.5 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        {/* CANTO ESQUERDO: Verificado + Botão Estado/Cidade/Bairros */}
        <div className="flex flex-wrap items-center gap-2">
          {syncStatus && (
            <button
              type="button"
              onClick={syncStatus.onRefresh}
              disabled={syncStatus.isSyncing}
              title="Clique para sincronizar e verificar fontes"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-[10.5px] font-mono text-slate-400 hover:text-slate-200 transition-all cursor-pointer group shrink-0"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  syncStatus.isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              {syncStatus.isSyncing ? (
                <span className="text-amber-300 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Atualizando…</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="text-emerald-400 font-semibold">Verificado</span>
                  <span className="text-slate-600">•</span>
                  <span>
                    Atualizado às <strong className="text-slate-200">{syncStatus.lastSyncTime}</strong>
                  </span>
                  <span className="text-slate-600">|</span>
                  <strong className="text-emerald-400">{syncStatus.totalLots}</strong>
                </span>
              )}
            </button>
          )}

          {/* BOTÃO LOCALIZAÇÃO (ESTADO -> CIDADE -> BAIRROS) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('location')}
              className={`${pillBase} ${
                selectedStateFilter || selectedCityFilter || selectedNeighborhoods.length > 0 || openPopover === 'location'
                  ? pillActive
                  : pillIdle
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="max-w-[200px] truncate">{locationSummary}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${openPopover === 'location' ? 'rotate-180' : ''}`}
              />
            </button>

            {openPopover === 'location' && (
              <div className="absolute left-0 top-full mt-2 w-[310px] sm:w-[350px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Estado, Cidade e Bairros</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Estado (UF) */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Estado (UF)</label>
                  <select
                    value={selectedStateFilter}
                    onChange={(e) => {
                      setSelectedStateFilter(e.target.value);
                      setSelectedCityFilter('');
                      setCitySearchInput('');
                      setSelectedNeighborhoods([]);
                      setSelectedNeighborhoodFilter('');
                    }}
                    className="w-full text-xs font-bold border border-slate-700 rounded-xl px-3 py-2 bg-slate-950 text-slate-100 focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="">Todos os Estados (RJ, MG)</option>
                    {uniqueStates.map((uf) => {
                      const stateObj = BRAZIL_STATES.find((s) => s.value === uf);
                      return (
                        <option key={uf} value={uf}>
                          {uf} {stateObj ? `- ${stateObj.label}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Cidade */}
                <div className="relative">
                  <label className="text-[10.5px] font-bold text-slate-400 block mb-1">Cidade</label>
                  {selectedCityFilter ? (
                    <div className="flex items-center justify-between bg-indigo-950/60 border border-indigo-600/50 px-3 py-2 rounded-xl text-xs text-indigo-200 font-bold">
                      <span className="truncate">{selectedCityFilter}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCityFilter('');
                          setCitySearchInput('');
                          setSelectedNeighborhoods([]);
                          setSelectedNeighborhoodFilter('');
                        }}
                        className="p-0.5 hover:text-white text-indigo-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Buscar cidade..."
                          value={citySearchInput}
                          onChange={(e) => {
                            setCitySearchInput(e.target.value);
                            setCityListVisible(true);
                          }}
                          onFocus={() => setCityListVisible(true)}
                          className="w-full text-xs border border-slate-700 rounded-xl pl-8 pr-3 py-2 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none"
                        />
                      </div>
                      {cityListVisible && filteredCitiesTypeahead.length > 0 && (
                        <div className="mt-1 bg-slate-950 border border-slate-800 rounded-xl max-h-36 overflow-y-auto p-1 space-y-0.5">
                          {filteredCitiesTypeahead.map((city) => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => {
                                setSelectedCityFilter(city);
                                setCitySearchInput('');
                                setCityListVisible(false);
                                setSelectedNeighborhoods([]);
                                setSelectedNeighborhoodFilter('');
                                for (const [st, cities] of Object.entries(VALID_ITBI_CITIES_BY_STATE)) {
                                  if (cities.includes(city)) {
                                    setSelectedStateFilter(st);
                                    break;
                                  }
                                }
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs text-slate-200 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors cursor-pointer truncate"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bairros */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold text-slate-400">
                      Bairros {selectedNeighborhoods.length > 0 ? `(${selectedNeighborhoods.length})` : ''}
                    </label>
                    <div className="text-[10px] space-x-2">
                      <button
                        type="button"
                        onClick={handleSelectAllNeighborhoods}
                        className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={handleClearNeighborhoods}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Filtrar bairro..."
                    value={neighborhoodSearch}
                    onChange={(e) => setNeighborhoodSearch(e.target.value)}
                    className="w-full text-xs border border-slate-700 rounded-xl px-3 py-1.5 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
                    {visibleNeighborhoods.length === 0 ? (
                      <div className="text-center py-3 text-[11px] text-slate-500">Nenhum bairro encontrado.</div>
                    ) : (
                      visibleNeighborhoods.map(({ name, count }) => {
                        const isChecked = selectedNeighborhoods.includes(name);
                        return (
                          <label
                            key={name}
                            className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-900 cursor-pointer select-none"
                          >
                            <div className="flex items-center space-x-2 truncate pr-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleNeighborhood(name)}
                                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer"
                              />
                              <span className={`truncate ${isChecked ? 'text-white font-bold' : 'text-slate-300'}`}>
                                {name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 rounded">
                              {count}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStateFilter('');
                      setSelectedCityFilter('');
                      setCitySearchInput('');
                      setSelectedNeighborhoods([]);
                      setSelectedNeighborhoodFilter('');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="flex-1 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CANTO DIREITO: FILTRO DE OPORTUNIDADES (BOTÕES ESTILO ZAP IMÓVEIS) */}
        <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
          {/* 1. LEILÕES (ou PORTAIS) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('leiloes')}
              className={`${pillBase} ${
                (mode === 'auctions' && selectedOriginFilter !== 'todos') || openPopover === 'leiloes'
                  ? pillActive
                  : pillIdle
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[140px] truncate">{originLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${openPopover === 'leiloes' ? 'rotate-180' : ''}`}
              />
            </button>

            {openPopover === 'leiloes' && (
              <div className="absolute left-0 xl:right-0 xl:left-auto top-full mt-2 w-[310px] sm:w-[340px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3.5 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 max-h-[78vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-xs font-black text-white">
                    {mode === 'portais' ? 'Portais & Finalidade' : 'Modalidades de Leilão'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {mode === 'portais' ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAdvancedContextTab('comprar')}
                        className={`py-1.5 rounded-lg font-bold cursor-pointer ${
                          advancedContextTab !== 'alugar'
                            ? 'bg-amber-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🏢 Comprar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdvancedContextTab('alugar');
                          setSelectedOriginFilter('portal');
                        }}
                        className={`py-1.5 rounded-lg font-bold cursor-pointer ${
                          advancedContextTab === 'alugar'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🔑 Alugar
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">Portais ({selectedPortals.length}/4)</span>
                      <div className="space-x-2">
                        <button type="button" onClick={handleSelectAllPortals} className="text-indigo-400 font-bold cursor-pointer">
                          Todos
                        </button>
                        <button type="button" onClick={handleClearPortals} className="text-slate-400 cursor-pointer">
                          Nenhum
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer">
                        <span className="flex items-center gap-2 text-slate-200 font-semibold">
                          <input
                            type="checkbox"
                            checked={selectedPortals.length === ALL_PORTALS.length}
                            onChange={handleToggleAllPortals}
                            className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Todos os 4 Portais</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{totalPortalCount}</span>
                      </label>
                      {ALL_PORTALS.map((portal) => (
                        <label key={portal} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer">
                          <span className="flex items-center gap-2 text-slate-300">
                            <input
                              type="checkbox"
                              checked={selectedPortals.includes(portal)}
                              onChange={() => handleTogglePortal(portal)}
                              className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                            />
                            <span>{portal}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{portalCounts[portal] || 0}</span>
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onGarimparPortais(
                          selectedCityFilter || undefined,
                          selectedPortals,
                          selectedNeighborhoods,
                          advancedContextTab === 'alugar' ? 'aluguel' : 'venda'
                        );
                        setOpenPopover(null);
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Buscar nos Portais
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {[
                      { id: 'todos', label: 'Todos os Leilões', icon: Layers, desc: 'Caixa + Judiciais + Extrajudiciais' },
                      { id: 'caixa', label: 'Imóveis Caixa', icon: Building2, desc: 'Venda Direta / Licitação / SFI' },
                      { id: 'judicial', label: 'Leilões Judiciais', icon: Gavel, desc: 'Varas Cíveis e Trabalhistas' },
                      { id: 'extrajudicial', label: 'Leilões Extrajudiciais', icon: FileText, desc: 'Alienação Fiduciária & Bancos' },
                    ].map((item) => {
                      const isSel = selectedOriginFilter === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedOriginFilter(item.id as any);
                            if (item.id === 'todos' || item.id === 'caixa') setSelectedAuctioneerFilter('');
                          }}
                          className={`w-full text-left p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSel
                              ? 'bg-indigo-600/20 border-indigo-400 text-white font-bold'
                              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                            <div>
                              <div className="text-xs font-bold">{item.label}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                            </div>
                          </div>
                          {isSel && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}

                    {selectedOriginFilter === 'caixa' && (
                      <div className="p-2.5 bg-slate-950 border border-blue-900/40 rounded-xl space-y-1.5 mt-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-blue-400 uppercase font-mono">
                            Caixa ({caixaModalityCounts.total})
                          </span>
                          <div className="space-x-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setCaixaSubModes({ vendaDireta: true, vendaOnline: true, licitacao: true, leilaoSfi: true })
                              }
                              className="text-indigo-400 hover:text-white cursor-pointer"
                            >
                              Todas
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCaixaSubModes({ vendaDireta: false, vendaOnline: false, licitacao: false, leilaoSfi: false })
                              }
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              Nenhuma
                            </button>
                          </div>
                        </div>
                        {(
                          [
                            ['vendaDireta', 'Venda Direta Online', caixaModalityCounts.vendaDireta],
                            ['vendaOnline', 'Venda Online', caixaModalityCounts.vendaOnline],
                            ['licitacao', 'Licitação Aberta', caixaModalityCounts.licitacao],
                            ['leilaoSfi', 'Leilão SFI (1º/2º)', caixaModalityCounts.leilaoSfi],
                          ] as const
                        ).map(([k, lbl, cnt]) => (
                          <label key={k} className="flex items-center justify-between p-1 rounded hover:bg-slate-900 cursor-pointer text-[11px]">
                            <span className="flex items-center gap-2 text-slate-200">
                              <input
                                type="checkbox"
                                checked={caixaSubModes[k]}
                                onChange={(e) => setCaixaSubModes((prev) => ({ ...prev, [k]: e.target.checked }))}
                                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                              />
                              <span>{lbl}</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{cnt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {(selectedOriginFilter === 'judicial' || selectedOriginFilter === 'extrajudicial') && (
                      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 mt-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-indigo-300 uppercase font-mono">
                            {selectedOriginFilter === 'judicial' ? 'Leiloeiros Judiciais' : 'Leiloeiros Extrajudiciais'}
                          </span>
                          {selectedAuctioneerFilter && (
                            <button
                              type="button"
                              onClick={() => setSelectedAuctioneerFilter('')}
                              className="text-indigo-400 hover:text-white cursor-pointer"
                            >
                              Ver todos
                            </button>
                          )}
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                          {(selectedOriginFilter === 'judicial'
                            ? activeJudicialAuctioneers
                            : activeExtrajudicialAuctioneers
                          ).map((item) => (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() =>
                                setSelectedAuctioneerFilter((prev) => (prev === item.name ? '' : item.name))
                              }
                              className={`w-full text-left px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-between cursor-pointer ${
                                selectedAuctioneerFilter === item.name
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="truncate">{item.name}</span>
                              <span className="text-[10px] font-mono opacity-80">{item.count}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setOpenPopover(null)}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. CONDIÇÕES & OCUPAÇÃO (Leilões) */}
          {mode !== 'portais' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => togglePopover('condicoes')}
                className={`${pillBase} ${conditionsCount > 0 || openPopover === 'condicoes' ? pillActive : pillIdle}`}
              >
                <span>Condições &amp; Ocupação</span>
                {conditionsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-mono">
                    {conditionsCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${openPopover === 'condicoes' ? 'rotate-180' : ''}`}
                />
              </button>

              {openPopover === 'condicoes' && (
                <div className="absolute left-0 xl:right-0 xl:left-auto top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="text-xs font-black text-white">Condições &amp; Ocupação</span>
                    <button
                      type="button"
                      onClick={() => setOpenPopover(null)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 cursor-pointer text-xs text-slate-200 font-semibold">
                    <span className="flex items-center gap-2">
                      <span>🏦</span>
                      <span>Aceita Financiamento</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={onlyFinancing}
                      onChange={() => setOnlyFinancing((v) => !v)}
                      className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 cursor-pointer text-xs text-slate-200 font-semibold">
                    <span className="flex items-center gap-2">
                      <span>💳</span>
                      <span>Aceita Parcelamento</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={onlyInstallments}
                      onChange={() => setOnlyInstallments((v) => !v)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 cursor-pointer text-xs text-slate-200 font-semibold">
                    <span className="flex items-center gap-2">
                      <span>🔑</span>
                      <span>Imóvel Desocupado</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={onlyVacant}
                      onChange={() => setOnlyVacant((v) => !v)}
                      className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. TIPO DE IMÓVEL (Abre estilo Zap Print 8) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('tipo')}
              className={`${pillBase} ${selectedTypeFilter || openPopover === 'tipo' ? pillActive : pillIdle}`}
            >
              <Home className="w-3.5 h-3.5 text-sky-400" />
              <span>{selectedTypeFilter || 'Tipo de imóvel'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${openPopover === 'tipo' ? 'rotate-180' : ''}`}
              />
            </button>

            {openPopover === 'tipo' && (
              <div className="absolute left-0 xl:right-0 xl:left-auto top-full mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-black text-slate-400 uppercase px-1 pb-1 border-b border-slate-800">
                  Tipologia do Imóvel
                </div>
                {PROPERTY_TYPES.map((opt) => {
                  const isSel = selectedTypeFilter === opt.value;
                  return (
                    <label
                      key={opt.value || 'all'}
                      onClick={() => {
                        setSelectedTypeFilter(opt.value);
                        setOpenPopover(null);
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                        isSel ? 'bg-indigo-600/20 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isSel ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-600 bg-slate-950'
                        }`}
                      >
                        {isSel && <Check className="w-3 h-3" />}
                      </span>
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. QUARTOS */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('quartos')}
              className={`${pillBase} ${bedroomsFilter || openPopover === 'quartos' ? pillActive : pillIdle}`}
            >
              <BedDouble className="w-3.5 h-3.5 text-slate-400" />
              <span>{bedroomsFilter ? `${bedroomsFilter}+ Quartos` : 'Quartos'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${openPopover === 'quartos' ? 'rotate-180' : ''}`}
              />
            </button>

            {openPopover === 'quartos' && (
              <div className="absolute left-0 xl:right-0 xl:left-auto top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-black text-slate-300">Quantidade de Quartos</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[null, 1, 2, 3, 4].map((n) => (
                    <button
                      key={n ?? 'any'}
                      type="button"
                      onClick={() => {
                        setBedroomsFilter(n);
                        setOpenPopover(null);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        bedroomsFilter === n
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {n === null ? 'Todos' : `${n}+`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. VAGAS */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('vagas')}
              className={`${pillBase} ${parkingFilter || openPopover === 'vagas' ? pillActive : pillIdle}`}
            >
              <Car className="w-3.5 h-3.5 text-slate-400" />
              <span>{parkingFilter ? `${parkingFilter}+ Vagas` : 'Vagas'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${openPopover === 'vagas' ? 'rotate-180' : ''}`}
              />
            </button>

            {openPopover === 'vagas' && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-black text-slate-300">Vagas de Garagem</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[null, 1, 2, 3, 4].map((n) => (
                    <button
                      key={n ?? 'any'}
                      type="button"
                      onClick={() => {
                        setParkingFilter(n);
                        setOpenPopover(null);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        parkingFilter === n
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {n === null ? 'Todas' : `${n}+`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 6. FILTROS (abre modal completo com preço, área, banheiros, ROI, busca) */}
          <button
            type="button"
            onClick={onOpenAdvancedFilters}
            className={`${pillBase} ${activeAdvancedFiltersCount > 0 ? pillActive : pillIdle}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Filtros</span>
            {activeAdvancedFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-mono">
                {activeAdvancedFiltersCount}
              </span>
            )}
          </button>

          {/* Presets & Limpar discretos */}
          <button
            type="button"
            onClick={onOpenPresets}
            title="Presets de Busca Salvos"
            className="px-2.5 py-1.5 rounded-full text-xs font-bold bg-slate-950/90 text-amber-300 border border-slate-700 hover:border-amber-500/60 flex items-center gap-1 cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px]">{savedPresetsCount}</span>
          </button>

          <button
            type="button"
            onClick={onClearAllFilters}
            title="Redefinir todos os filtros"
            className="px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-slate-950/90 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </div>
      </div>

      {/* SEGUNDA LINHA FINA: Contagem + Ordenar/Atualizar (esq) e Abrir no Mapa/Lista + Risco Facções (dir) */}
      <div className="bg-slate-900/85 border border-slate-800/80 rounded-xl px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="font-extrabold text-white">
            {matchingCount}{' '}
            <span className="font-semibold text-slate-400">
              {mode === 'portais' && advancedContextTab === 'alugar'
                ? 'imóveis para alugar'
                : 'oportunidades encontradas'}
            </span>
          </span>

          {/* Botão Ordenar / Estratégia compacto estilo Zap Print 7 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('sort')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpDown className="w-3 h-3 text-indigo-400" />
              <span>Ordenar: {activeStrategyLabel}</span>
            </button>

            {openPopover === 'sort' && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3.5 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ordenar por</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setTemporalSortMode('neutral');
                      setSortBy('roi');
                      setOpenPopover(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer ${
                      temporalSortMode === 'neutral' ? 'bg-indigo-600/20 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>📈 Padrão (Maior ROI)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemporalSortMode('urgent');
                      setOpenPopover(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer ${
                      temporalSortMode === 'urgent' ? 'bg-rose-600/20 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>{mode === 'portais' ? 'Mais Antigos' : 'Próximas Praças'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemporalSortMode('newest');
                      setOpenPopover(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer ${
                      temporalSortMode === 'newest' ? 'bg-blue-600/20 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Inclusão Mais Recente</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Estratégia</div>
                  {(mode === 'portais'
                    ? ([
                        ['discount', '🏷️ Maior Desconto ITBI'],
                        ['profit', '💰 Maior Lucro Flip'],
                        ['lowestSqm', '📉 Menor Preço/m²'],
                        ['under250k', '⚡ Até R$ 250k'],
                      ] as const)
                    : ([
                        ['liquidity', '💧 Maior Liquidez'],
                        ['roi', '📈 Maior ROI'],
                        ['profit', '💰 Maior Lucro Real'],
                        ['spread', '📐 Maior Spread/m²'],
                      ] as const)
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer text-xs text-slate-200"
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean((strategyFilters as any)[key])}
                        onChange={() =>
                          setStrategyFilters((prev) => ({ ...prev, [key]: !(prev as any)[key] }))
                        }
                        className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onSyncNow}
            disabled={isMining}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isMining ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">{isMining ? 'Sincronizando…' : 'Atualizar'}</span>
          </button>
        </div>

        {/* CANTO DIREITO DA LINHA FINA: Abrir no Mapa / Abrir em Lista + Risco & Facções */}
        <div className="flex items-center gap-2 ml-auto">
          {viewMode === 'list' ? (
            <button
              type="button"
              onClick={() => {
                onResetFocusedMapProp();
                setViewMode('map');
              }}
              className="px-3 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 hover:text-white border border-emerald-500/50 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Abrir no Mapa ({matchingCount})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-3 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 hover:text-white border border-indigo-500/50 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <List className="w-3.5 h-3.5 text-indigo-400" />
              <span>Abrir em Lista ({matchingCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowMapFactions((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showMapFactions
                ? 'bg-rose-950/90 text-rose-300 border-rose-500 shadow-xs'
                : 'bg-slate-950 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="Camada de controle de facções RJ (dadosderiscos.com.br)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Risco &amp; Facções RJ</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                showMapFactions ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {showMapFactions ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
