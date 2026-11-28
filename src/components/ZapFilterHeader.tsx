import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Check,
  Search,
  X,
  ShieldAlert,
  MapPin,
  Layers,
  SlidersHorizontal,
  RefreshCw,
  ArrowUpDown,
  Map as MapIcon,
  List,
} from 'lucide-react';
import { BRAZIL_STATES, VALID_ITBI_CITIES_BY_STATE } from '../types.ts';

interface AuctioneerCountItem {
  name: string;
  count: number;
}

export interface ZapFilterHeaderProps {
  mode: 'auctions' | 'portais';
  embeddedInMap?: boolean;
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
  // Sub-row: counts, sort, viewMode, factions
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
    embeddedInMap = false,
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
    matchingCount,
    temporalSortMode,
    setTemporalSortMode,
    setSortBy,
    strategyFilters,
    setStrategyFilters,
    isMining,
    onSyncNow,
    setViewMode,
    onResetFocusedMapProp,
    showMapFactions,
    setShowMapFactions,
  } = props;

  const [openPopover, setOpenPopover] = useState<PopoverKey>(null);
  const [cityListVisible, setCityListVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocDown = (e: Event) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPopover(null);
    };
    document.addEventListener('pointerdown', onDocDown, true);
    document.addEventListener('mousedown', onDocDown, true);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('pointerdown', onDocDown, true);
      document.removeEventListener('mousedown', onDocDown, true);
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
        ? `${selectedNeighborhoods[0]}${selectedCityFilter ? `, ${selectedCityFilter}` : ''}`
        : `${selectedNeighborhoods.length} bairros${selectedCityFilter ? `, ${selectedCityFilter}` : ''}`;
    }
    if (selectedCityFilter) {
      return `${selectedCityFilter}${selectedStateFilter ? `, ${selectedStateFilter}` : ''}`;
    }
    if (selectedStateFilter) {
      return `Estado: ${selectedStateFilter}`;
    }
    return 'Localização';
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

  const pillSize = embeddedInMap ? 'px-3.5 py-2 text-[13px]' : 'px-4 py-2 text-[13.5px]';
  const pillBase = `${pillSize} rounded-full font-bold tracking-tight border transition-all flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap`;
  const pillActive = 'bg-indigo-600/20 text-indigo-200 border-indigo-400/80 shadow-xs';
  const pillIdle = 'bg-transparent text-slate-200 border-slate-700/80 hover:border-indigo-400/70 hover:bg-indigo-500/10 hover:text-indigo-200';

  const PROPERTY_TYPES: { value: string; label: string }[] = [
    { value: '', label: 'Todos os Tipos' },
    { value: 'Apartamento', label: 'Apartamento' },
    { value: 'Casa', label: 'Casa' },
    { value: 'Comercial', label: 'Comercial / Sala / Loja' },
    { value: 'Terreno', label: 'Terreno' },
    { value: 'Lote', label: 'Lote' },
  ];

  const filterPills = (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        embeddedInMap ? 'justify-start' : 'justify-start'
      }`}
    >
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
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="max-w-[140px] truncate">{originLabel}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 opacity-75 transition-transform ${openPopover === 'leiloes' ? 'rotate-180' : ''}`}
          />
        </button>

        {openPopover === 'leiloes' && (
          <div className="absolute left-0 top-full mt-2 w-[310px] sm:w-[340px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3.5 z-[60] space-y-2.5 animate-in fade-in zoom-in-95 duration-150 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-bold text-white">
                {mode === 'portais' ? 'Portais e Finalidade' : 'Modalidades de Leilão'}
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
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Comprar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedContextTab('alugar');
                      setSelectedOriginFilter('portal');
                    }}
                    className={`py-1.5 rounded-lg font-bold cursor-pointer ${
                      advancedContextTab === 'alugar'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Alugar
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono">Portais ({selectedPortals.length}/4)</span>
                  <div className="space-x-2">
                    <button type="button" onClick={handleSelectAllPortals} className="text-slate-200 font-bold cursor-pointer">
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
                        className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 cursor-pointer"
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
                          className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 cursor-pointer"
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
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  Buscar nos Portais
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                {[
                  { id: 'todos', label: 'Todos os Leilões', desc: 'Caixa + Judiciais + Extrajudiciais' },
                  { id: 'caixa', label: 'Imóveis Caixa', desc: 'Venda Direta / Licitação / SFI' },
                  { id: 'judicial', label: 'Leilões Judiciais', desc: 'Varas Cíveis e Trabalhistas' },
                  { id: 'extrajudicial', label: 'Leilões Extrajudiciais', desc: 'Alienação Fiduciária & Bancos' },
                ].map((item) => {
                  const isSel = selectedOriginFilter === item.id;
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
                          ? 'bg-indigo-500/15 border-indigo-400 text-white font-bold'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                      </div>
                      {isSel && <Check className="w-3.5 h-3.5 text-indigo-300 shrink-0" />}
                    </button>
                  );
                })}

                {selectedOriginFilter === 'caixa' && (
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 mt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-300 uppercase font-mono">
                        Caixa ({caixaModalityCounts.total})
                      </span>
                      <div className="space-x-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setCaixaSubModes({ vendaDireta: true, vendaOnline: true, licitacao: true, leilaoSfi: true })
                          }
                          className="text-slate-200 hover:text-white cursor-pointer"
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
                            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer"
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
                      <span className="font-bold text-slate-300 uppercase font-mono">
                        {selectedOriginFilter === 'judicial' ? 'Leiloeiros Judiciais' : 'Leiloeiros Extrajudiciais'}
                      </span>
                      {selectedAuctioneerFilter && (
                        <button
                          type="button"
                          onClick={() => setSelectedAuctioneerFilter('')}
                          className="text-slate-300 hover:text-white cursor-pointer"
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
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
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
              className={`w-3.5 h-3.5 opacity-75 transition-transform ${openPopover === 'condicoes' ? 'rotate-180' : ''}`}
            />
          </button>

          {openPopover === 'condicoes' && (
            <div className="absolute left-0 top-full mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-[60] space-y-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-xs font-bold text-white">Condições &amp; Ocupação</span>
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
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 cursor-pointer"
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
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 cursor-pointer"
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
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => setOpenPopover(null)}
                className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. TIPO DE IMÓVEL (Múltipla Seleção) */}
      {(() => {
        const selectedTypes = selectedTypeFilter
          ? selectedTypeFilter.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const typeLabel =
          selectedTypes.length === 0
            ? 'Tipo de imóvel'
            : selectedTypes.length === 1
              ? selectedTypes[0]
              : `${selectedTypes[0]} +${selectedTypes.length - 1}`;

        const toggleTypeOption = (val: string) => {
          if (!val) {
            setSelectedTypeFilter('');
            return;
          }
          const next = selectedTypes.includes(val)
            ? selectedTypes.filter((v) => v !== val)
            : [...selectedTypes, val];
          setSelectedTypeFilter(next.join(','));
        };

        return (
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('tipo')}
              className={`${pillBase} ${selectedTypes.length > 0 || openPopover === 'tipo' ? pillActive : pillIdle}`}
            >
              <span>{typeLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 opacity-75 transition-transform ${openPopover === 'tipo' ? 'rotate-180' : ''}`}
              />
            </button>

            {openPopover === 'tipo' && (
              <div className="absolute left-0 top-full mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-[60] space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-1 pb-1.5 border-b border-slate-800">
                  <span className="text-xs font-bold text-white">Tipologia do imóvel</span>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {PROPERTY_TYPES.map((opt) => {
                  const isSel = opt.value === '' ? selectedTypes.length === 0 : selectedTypes.includes(opt.value);
                  return (
                    <label
                      key={opt.value || 'all'}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleTypeOption(opt.value);
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                        isSel ? 'bg-indigo-500/15 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
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
        );
      })()}

      {/* 4. QUARTOS */}
      <div className="relative">
        <button
          type="button"
          onClick={() => togglePopover('quartos')}
          className={`${pillBase} ${bedroomsFilter || openPopover === 'quartos' ? pillActive : pillIdle}`}
        >
          <span>{bedroomsFilter ? `${bedroomsFilter}+ Quartos` : 'Quartos'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 opacity-75 transition-transform ${openPopover === 'quartos' ? 'rotate-180' : ''}`}
          />
        </button>

        {openPopover === 'quartos' && (
          <div className="absolute left-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2.5 z-[60] space-y-1 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-800">
              <span className="text-xs font-bold text-white">Quartos</span>
              <button
                type="button"
                onClick={() => setOpenPopover(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {[null, 1, 2, 3, 4].map((n) => (
              <button
                key={n ?? 'any'}
                type="button"
                onClick={() => {
                  setBedroomsFilter(n);
                  setOpenPopover(null);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                  bedroomsFilter === n
                    ? 'bg-indigo-600/20 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{n === null ? 'Todos' : `${n}+ ${n === 1 ? 'Quarto' : 'Quartos'}`}</span>
                {bedroomsFilter === n && <Check className="w-3.5 h-3.5 text-indigo-300" />}
              </button>
            ))}
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
          <span>{parkingFilter ? `${parkingFilter}+ Vagas` : 'Vagas'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 opacity-75 transition-transform ${openPopover === 'vagas' ? 'rotate-180' : ''}`}
          />
        </button>

        {openPopover === 'vagas' && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2.5 z-[60] space-y-1 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-800">
              <span className="text-xs font-bold text-white">Vagas de garagem</span>
              <button
                type="button"
                onClick={() => setOpenPopover(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {[null, 1, 2, 3, 4].map((n) => (
              <button
                key={n ?? 'any'}
                type="button"
                onClick={() => {
                  setParkingFilter(n);
                  setOpenPopover(null);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                  parkingFilter === n
                    ? 'bg-indigo-600/20 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{n === null ? 'Todas' : `${n}+ ${n === 1 ? 'Vaga' : 'Vagas'}`}</span>
                {parkingFilter === n && <Check className="w-3.5 h-3.5 text-indigo-300" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 6. FILTROS */}
      <button
        type="button"
        onClick={onOpenAdvancedFilters}
        className={`${pillBase} ${activeAdvancedFiltersCount > 0 ? pillActive : pillIdle}`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Filtros</span>
        {activeAdvancedFiltersCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-mono">
            {activeAdvancedFiltersCount}
          </span>
        )}
      </button>
    </div>
  );

  const locationButton = (
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
        <span className="max-w-[230px] truncate">{locationSummary}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-75 transition-transform ${openPopover === 'location' ? 'rotate-180' : ''}`}
        />
      </button>

      {openPopover === 'location' && (
        <div className="absolute left-0 top-full mt-2 w-[310px] sm:w-[350px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-[60] space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
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
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const outsideClickBackdrop = openPopover ? (
    <div
      aria-hidden="true"
      onMouseDown={(e) => {
        e.stopPropagation();
        setOpenPopover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setOpenPopover(null);
      }}
      className="fixed inset-0 z-[55] bg-transparent cursor-default"
    />
  ) : null;

  // Embedded strip inside Fullscreen Map (replaces old Tipologia bar)
  if (embeddedInMap) {
    return (
      <div ref={barRef} className="w-full flex flex-wrap items-center justify-between gap-2">
        {outsideClickBackdrop}
        <div className="flex flex-wrap items-center gap-2 relative z-[58]">
          {locationButton}
          {filterPills}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="btn-light-outline px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <List className="w-3.5 h-3.5 text-indigo-400" />
            <span>Abrir em Lista ({matchingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMapFactions((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
              showMapFactions
                ? 'bg-rose-950/90 text-rose-300 border-rose-500'
                : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="Camada de risco territorial RJ"
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
    );
  }

  return (
    <div
      ref={barRef}
      className="sticky top-[56px] -mt-[1px] z-30 sticky-bar-surface bg-[#111622] border-b border-slate-800/70 pt-2.5 pb-2 -mx-3 sm:-mx-5 px-3 sm:px-5 space-y-2.5"
    >
      {outsideClickBackdrop}
      {/* LINHA 1 LIMPA ESTILO ZAP IMÓVEIS: Localização (esq) | Filtros centralizados e afastados (centro) | Abrir no Mapa colado à direita */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-0.5 relative z-[58]">
        <div className="shrink-0">{locationButton}</div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 flex-1 min-w-0 px-3 lg:px-8">
          {filterPills}
        </div>
        <button
          type="button"
          onClick={() => {
            onResetFocusedMapProp();
            setViewMode('map');
          }}
          className="ml-auto w-[148px] h-9 px-3.5 rounded-full font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/60 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
        >
          <MapIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Abrir no Mapa</span>
        </button>
      </div>

      {/* LINHA 2 FINA (sem linha divisória): Contagem + Atualizar (esq) | Ordenar por mesmo padrão/tamanho (dir) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-slate-200 text-sm">
            {matchingCount}{' '}
            <span className="font-semibold text-slate-400">
              {mode === 'portais' && advancedContextTab === 'alugar'
                ? 'imóveis para alugar'
                : 'imóveis encontrados'}
            </span>
          </span>

          <button
            type="button"
            onClick={onSyncNow}
            disabled={isMining}
            className="btn-light-outline px-3 py-1 rounded-full bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isMining ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
            <span>{isMining ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* ORDENAR POR */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('sort')}
              className="btn-light-outline w-[148px] h-9 px-3.5 rounded-full bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Ordenar por</span>
              <ChevronDown
                className={`w-3.5 h-3.5 opacity-75 shrink-0 transition-transform ${openPopover === 'sort' ? 'rotate-180' : ''}`}
              />
            </button>

            {openPopover === 'sort' && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3.5 z-[60] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-xs font-bold text-white">Ordenar por</span>
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
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      temporalSortMode === 'neutral' ? 'bg-indigo-500/15 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Padrão</span>
                    {temporalSortMode === 'neutral' && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemporalSortMode('urgent');
                      setOpenPopover(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      temporalSortMode === 'urgent' ? 'bg-indigo-500/15 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{mode === 'portais' ? 'Mais Antigos' : 'Próximas Praças'}</span>
                    {temporalSortMode === 'urgent' && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemporalSortMode('newest');
                      setOpenPopover(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      temporalSortMode === 'newest' ? 'bg-indigo-500/15 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Inclusão Mais Recente</span>
                    {temporalSortMode === 'newest' && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Estratégia</div>
                  {(mode === 'portais'
                    ? ([
                        ['discount', 'Maior Desconto ITBI'],
                        ['profit', 'Maior Lucro Flip'],
                        ['lowestSqm', 'Menor Preço/m²'],
                        ['under250k', 'Até R$ 250k'],
                      ] as const)
                    : ([
                        ['liquidity', 'Maior Liquidez'],
                        ['roi', 'Maior ROI'],
                        ['profit', 'Maior Lucro Real'],
                        ['spread', 'Maior Spread/m²'],
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
        </div>
      </div>
    </div>
  );
}
