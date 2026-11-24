import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AuctionProperty, BRAZIL_STATES, VALID_ITBI_CITIES_BY_STATE } from '../types.ts';
import { CaixaModality, normalizeCaixaModality, CAIXA_MODALITY_CONFIG, isCaixaAuction, getCaixaModality } from '../utils/caixaModality.ts';
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  AlertTriangle, 
  Eye, 
  Trash2, 
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Bookmark,
  Gavel,
  ArrowUpDown,
  ArrowUp,
  Gem,
  Gauge,
  X,
  Search,
  Check,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers,
  Clock,
  Flame,
  Info,
  Sliders,
  Wallet,
  Calendar,
  FileText,
  ShieldAlert,
  BedDouble,
  Car
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RealValueCalculator from './RealValueCalculator.tsx';
import PropertyMap from './PropertyMap.tsx';
import PropertyThumbnail from './PropertyThumbnail.tsx';
import ZapFilterHeader from './ZapFilterHeader.tsx';
import AdvancedFiltersModal from './AdvancedFiltersModal.tsx';
import LightboxModal from './LightboxModal.tsx';
import { getAvailableZonesForCity, isNeighborhoodInZone } from '../utils/cityZones.ts';
import { cleanDivergentNotice } from '../utils/auctionLocation.ts';
import { assessDataQuality } from '../utils/dataQuality.ts';
import { auctionCosts } from '../utils/flipCalculation.ts';

export function calculateSpreadSqm(auc: AuctionProperty): number {
  const area = Number(auc.sizeSqm) || 0;
  if (area <= 0) return 0;
  // O spread real de mercado exige preço de saída fático (Flip ITBI):
  const valorVenda = Number(auc.vendaBaixaPrice) || Number(auc.vendaMediaPrice) || 0;
  if (valorVenda <= 0) return 0;
  const costs = auctionCosts(auc);
  const custoTotal = costs.bid + costs.auctioneer + costs.itbi + costs.registry + costs.repair + costs.legal + costs.iptu + costs.condo + costs.custoCarregamento;
  const custoM2 = custoTotal / area;
  const vendaM2 = valorVenda / area;
  return Math.round(vendaM2 - custoM2);
}

interface DashboardProps {
  mode?: 'auctions' | 'portais';
  theme?: 'light' | 'dark';
  auctions: AuctionProperty[];
  selectedAuctionId: string | null;
  onSelectAuction: (id: string) => void;
  onDeleteAuction: (id: string) => void;
  onOpenAddModal: () => void;
  selectedNeighborhoodFilter: string;
  setSelectedNeighborhoodFilter: (val: string) => void;
  selectedCityFilter: string;
  setSelectedCityFilter: (val: string) => void;
  selectedZoneFilter?: string;
  setSelectedZoneFilter?: (val: string) => void;
  selectedTypeFilter: string;
  setSelectedTypeFilter: (val: string) => void;
  selectedStateFilter: string;
  setSelectedStateFilter: (val: string) => void;
  maxPriceFilter?: string;
  setMaxPriceFilter?: (val: string) => void;
  paymentFilter: string;
  setPaymentFilter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  isMining: boolean;
  itbiCount: number;
  onUpdateProperty: (updates: Partial<AuctionProperty>) => Promise<void>;
  onViewMap: () => void;
  onGarimparJudiciais: (city?: string) => void;
  onGarimparCaixa: (city?: string) => void;
  onGarimparPortais: (city?: string, portals?: string[], neighborhoods?: string[], transactionType?: 'aluguel' | 'venda', isSilent?: boolean) => void;
  selectedOriginFilter: 'todos' | 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal';
  setSelectedOriginFilter: (val: 'todos' | 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal') => void;
  onOpenLinkModal: () => void;
  onSyncAll?: () => void;
  onSyncCaixaAuto?: () => void;
  onSyncExtrajudiciaisAuto?: () => void;
  onSyncJudiciaisAuto?: () => void;
  itbiStats?: any[];
  onClearAll?: () => void;
  onOpenCapitalMatcher?: () => void;
  syncStatus?: {
    lastSyncTime: string;
    isSyncing: boolean;
    totalLots: number;
    onRefresh: () => void | Promise<void>;
  };
}

export default function Dashboard({
  mode = 'auctions',
  theme = 'dark',
  auctions,
  selectedAuctionId,
  onSelectAuction,
  onDeleteAuction,
  onOpenAddModal,
  selectedNeighborhoodFilter,
  setSelectedNeighborhoodFilter,
  selectedCityFilter,
  setSelectedCityFilter,
  selectedZoneFilter,
  setSelectedZoneFilter,
  selectedTypeFilter,
  setSelectedTypeFilter,
  selectedStateFilter,
  setSelectedStateFilter,
  maxPriceFilter,
  setMaxPriceFilter,
  paymentFilter,
  setPaymentFilter,
  sortBy,
  setSortBy,
  onGarimparJudiciais,
  onGarimparCaixa,
  onGarimparPortais,
  isMining,
  itbiCount,
  onUpdateProperty,
  onViewMap,
  selectedOriginFilter,
  setSelectedOriginFilter,
  onOpenLinkModal,
  onSyncAll,
  onSyncCaixaAuto,
  onSyncExtrajudiciaisAuto,
  onSyncJudiciaisAuto,
  itbiStats = [],
  onClearAll,
  onOpenCapitalMatcher,
  syncStatus
}: DashboardProps) {
  // Sidebar state
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(() => {
    return selectedNeighborhoodFilter ? [selectedNeighborhoodFilter] : [];
  });
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const [citySearchInput, setCitySearchInput] = useState('');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>(maxPriceFilter || '');
  const [minRoiFilter, setMinRoiFilter] = useState<number>(0);
  const [onlyHighReturn, setOnlyHighReturn] = useState(false);
  const [onlyAnalysisAboveEdital, setOnlyAnalysisAboveEdital] = useState(false);
  const [itbiConfidenceFilter, setItbiConfidenceFilter] = useState<'all' | 'verified'>('all');
  const [prestigeFilter, setPrestigeFilter] = useState<'all' | 'nobre' | 'prime'>('all');
  const [capitalBudget, setCapitalBudget] = useState<string>('');
  // Collapsible accordions state for sidebar
  const [isModalitiesOpen, setIsModalitiesOpen] = useState(true);
  const [isLocationOpen, setIsLocationOpen] = useState(true);
  const [isNeighborhoodsOpen, setIsNeighborhoodsOpen] = useState(false);
  const [isPortalsOpen, setIsPortalsOpen] = useState(mode === 'portais');

  // Advanced Filters Modal state (Estilo QuintoAndar)
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [advancedContextTab, setAdvancedContextTab] = useState<'comprar' | 'alugar' | 'novo'>('comprar');
  const [advancedSearchQuery, setAdvancedSearchQuery] = useState('');
  const [bedroomsFilter, setBedroomsFilter] = useState<number | null>(null);
  const [parkingFilter, setParkingFilter] = useState<number | null>(null);
  const [bathroomsFilter, setBathroomsFilter] = useState<number | null>(null);
  const [minAreaInput, setMinAreaInput] = useState<string>('');
  const [maxAreaInput, setMaxAreaInput] = useState<string>('');
  const [minDiscountFilter, setMinDiscountFilter] = useState<number>(0);
  const [onlyFinancing, setOnlyFinancing] = useState<boolean>(false);
  const [onlyInstallments, setOnlyInstallments] = useState<boolean>(false);
  const [onlyVacant, setOnlyVacant] = useState<boolean>(false);

  // Gerenciador de Presets de Busca (localStorage)
  interface SearchPreset {
    id: string;
    name: string;
    state: string;
    city: string;
    neighborhoods: string[];
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    roi?: number;
    searchQuery?: string;
    minArea?: string;
    maxArea?: string;
    minDiscount?: number;
    onlyFinancing?: boolean;
    onlyInstallments?: boolean;
    onlyVacant?: boolean;
    timestamp: string;
  }
  const [savedPresets, setSavedPresets] = useState<SearchPreset[]>(() => {
    try {
      const raw = localStorage.getItem('saved_search_presets');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [caixaSubModes, setCaixaSubModes] = useState<{
    vendaDireta: boolean;
    vendaOnline: boolean;
    licitacao: boolean;
    leilaoSfi: boolean;
  }>({
    vendaDireta: true,
    vendaOnline: true,
    licitacao: true,
    leilaoSfi: true
  });

  // Filtro de Portais Imobiliários (Apenas 4 portais oficiais)
  const ALL_PORTALS = useMemo(() => ['Zap Imóveis', 'Viva Real', 'QuintoAndar', 'Imovelweb'] as const, []);
  const [selectedPortals, setSelectedPortals] = useState<string[]>([
    'Zap Imóveis',
    'Viva Real',
    'QuintoAndar',
    'Imovelweb'
  ]);

  const portalCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Zap Imóveis': 0,
      'Viva Real': 0,
      'QuintoAndar': 0,
      'Imovelweb': 0
    };
    for (const a of auctions) {
      if (a.origin === 'portal') {
        const pName = a.portalName;
        if (pName && counts[pName] !== undefined) {
          counts[pName]++;
        }
      }
    }
    return counts;
  }, [auctions]);

  const totalPortalCount = useMemo(() => {
    return Object.values(portalCounts).reduce((acc, c) => acc + c, 0);
  }, [portalCounts]);

  const handleTogglePortal = (portalName: string) => {
    setSelectedPortals(prev => {
      if (prev.includes(portalName)) {
        return prev.filter(p => p !== portalName);
      } else {
        return [...prev, portalName];
      }
    });
  };

  const handleToggleAllPortals = () => {
    if (selectedPortals.length === ALL_PORTALS.length) {
      setSelectedPortals([]);
    } else {
      setSelectedPortals([...ALL_PORTALS]);
    }
  };

  const handleSelectAllPortals = () => setSelectedPortals([...ALL_PORTALS]);
  const handleClearPortals = () => setSelectedPortals([]);

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedTypeFilter) count++;
    if (advancedSearchQuery.trim()) count++;
    if (bedroomsFilter !== null && bedroomsFilter > 0) count++;
    if (parkingFilter !== null && parkingFilter > 0) count++;
    if (bathroomsFilter !== null && bathroomsFilter > 0) count++;
    if (minAreaInput && Number(minAreaInput) > 0) count++;
    if (maxAreaInput && Number(maxAreaInput) > 0) count++;
    if (minDiscountFilter > 0) count++;
    if (minPriceInput && Number(minPriceInput) > 0) count++;
    if (maxPriceInput && Number(maxPriceInput) > 0) count++;
    if (onlyHighReturn) count++;
    if (minRoiFilter > 0) count++;
    if (onlyAnalysisAboveEdital) count++;
    if (itbiConfidenceFilter !== 'all') count++;
    if (prestigeFilter !== 'all') count++;
    if (capitalBudget && Number(capitalBudget) > 0) count++;
    if (onlyFinancing) count++;
    if (onlyInstallments) count++;
    if (onlyVacant) count++;
    return count;
  }, [
    selectedTypeFilter,
    advancedSearchQuery,
    bedroomsFilter,
    parkingFilter,
    bathroomsFilter,
    minAreaInput,
    maxAreaInput,
    minDiscountFilter,
    minPriceInput,
    maxPriceInput,
    onlyHighReturn,
    minRoiFilter,
    onlyAnalysisAboveEdital,
    itbiConfidenceFilter,
    prestigeFilter,
    capitalBudget,
    onlyFinancing,
    onlyInstallments,
    onlyVacant
  ]);

  const handleClearAdvancedFilters = useCallback(() => {
    setSelectedTypeFilter('');
    setAdvancedSearchQuery('');
    setBedroomsFilter(null);
    setParkingFilter(null);
    setBathroomsFilter(null);
    setMinAreaInput('');
    setMaxAreaInput('');
    setMinDiscountFilter(0);
    setMinPriceInput('');
    setMaxPriceInput('');
    if (setMaxPriceFilter) setMaxPriceFilter('');
    setOnlyHighReturn(false);
    setMinRoiFilter(0);
    setOnlyAnalysisAboveEdital(false);
    setItbiConfidenceFilter('all');
    setPrestigeFilter('all');
    setCapitalBudget('');
    setOnlyFinancing(false);
    setOnlyInstallments(false);
    setOnlyVacant(false);
  }, [setMaxPriceFilter, setSelectedTypeFilter]);

  // Handlers para o Gerenciador de Presets de Busca
  const handleSaveCurrentPreset = useCallback((name?: string) => {
    const presetName = name?.trim() || presetNameInput.trim() || `Busca ${selectedCityFilter || 'Geral'} (${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`;
    const newPreset: SearchPreset = {
      id: `preset_${Date.now()}`,
      name: presetName,
      state: selectedStateFilter,
      city: selectedCityFilter,
      neighborhoods: [...selectedNeighborhoods],
      type: selectedTypeFilter,
      minPrice: minPriceInput,
      maxPrice: maxPriceInput,
      roi: minRoiFilter,
      searchQuery: advancedSearchQuery,
      minArea: minAreaInput,
      maxArea: maxAreaInput,
      minDiscount: minDiscountFilter,
      onlyFinancing,
      onlyInstallments,
      onlyVacant,
      timestamp: new Date().toISOString()
    };
    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    try {
      localStorage.setItem('saved_search_presets', JSON.stringify(updated));
    } catch (e) {}
    setPresetNameInput('');
    setSaveToastVisible(true);
    setTimeout(() => setSaveToastVisible(false), 3000);
  }, [
    presetNameInput,
    selectedCityFilter,
    selectedStateFilter,
    selectedNeighborhoods,
    selectedTypeFilter,
    minPriceInput,
    maxPriceInput,
    minRoiFilter,
    advancedSearchQuery,
    minAreaInput,
    maxAreaInput,
    minDiscountFilter,
    onlyFinancing,
    onlyInstallments,
    onlyVacant,
    savedPresets
  ]);

  const handleLoadPreset = useCallback((preset: SearchPreset) => {
    if (preset.state !== undefined) setSelectedStateFilter(preset.state);
    if (preset.city !== undefined) setSelectedCityFilter(preset.city);
    if (preset.neighborhoods) {
      setSelectedNeighborhoods(preset.neighborhoods);
      setSelectedNeighborhoodFilter(preset.neighborhoods.length === 1 ? preset.neighborhoods[0] : '');
    }
    if (preset.type !== undefined) setSelectedTypeFilter(preset.type);
    if (preset.minPrice !== undefined) setMinPriceInput(preset.minPrice);
    if (preset.maxPrice !== undefined) {
      setMaxPriceInput(preset.maxPrice);
      if (setMaxPriceFilter) setMaxPriceFilter(preset.maxPrice);
    }
    if (preset.roi !== undefined) setMinRoiFilter(preset.roi);
    if (preset.searchQuery !== undefined) setAdvancedSearchQuery(preset.searchQuery);
    if (preset.minArea !== undefined) setMinAreaInput(preset.minArea);
    if (preset.maxArea !== undefined) setMaxAreaInput(preset.maxArea);
    if (preset.minDiscount !== undefined) setMinDiscountFilter(preset.minDiscount);
    if (preset.onlyFinancing !== undefined) setOnlyFinancing(!!preset.onlyFinancing);
    if (preset.onlyInstallments !== undefined) setOnlyInstallments(!!preset.onlyInstallments);
    if (preset.onlyVacant !== undefined) setOnlyVacant(!!preset.onlyVacant);
    setIsPresetModalOpen(false);
    setSaveToastVisible(true);
    setTimeout(() => setSaveToastVisible(false), 2000);
  }, [setMaxPriceFilter, setSelectedCityFilter, setSelectedNeighborhoodFilter, setSelectedStateFilter, setSelectedTypeFilter]);

  const handleDeletePreset = useCallback((id: string) => {
    setSavedPresets(prev => {
      const updated = prev.filter(p => p.id !== id);
      try {
        localStorage.setItem('saved_search_presets', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  // Feed state
  const [temporalSortMode, setTemporalSortMode] = useState<'neutral' | 'urgent' | 'newest'>('neutral');
  const [strategyFilters, setStrategyFilters] = useState<{
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
  }>({
    liquidity: false,
    roi: false,
    profit: false,
    spread: false,
    discount: false,
    lowestSqm: false,
    under250k: false,
    superCheap: false,
    lowestRent: false,
    lowestRentSqm: false,
    bestRentDiscount: false,
  });
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [focusedMapPropId, setFocusedMapPropId] = useState<string | null>(null);
  const [showMapFactions, setShowMapFactions] = useState<boolean>(false);

  const [selectedLightboxProperty, setSelectedLightboxProperty] = useState<AuctionProperty | null>(null);
  const [simulatingAuction, setSimulatingAuction] = useState<AuctionProperty | null>(null);
  const [selectedAuctioneerFilter, setSelectedAuctioneerFilter] = useState<string>('');
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [visibleCount, setVisibleCount] = useState(16);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const normalizeAuctioneerDisplay = useCallback((rawName?: string, link?: string): string => {
    const lk = (link || '').toLowerCase();
    let name = (rawName || '').trim();
    if (/^emgea$/i.test(name) || lk.includes('emgeaimoveis')) return 'EMGEA Imóveis';
    if (/^fabiano\s+ayupp(?:\s+leiloeiro)?$/i.test(name) || lk.includes('fabianoayupp')) return 'Fabiano Ayupp';
    if (lk.includes('sold.com.br') || /^sold(?:\s+leil[oõ]es)?$/i.test(name)) return 'Sold Leilões';
    if (!name && lk) {
      if (lk.includes('portalzuk')) return 'Portal Zuk';
      if (lk.includes('megaleiloes')) return 'Mega Leilões';
      if (lk.includes('biasileiloes')) return 'Biasi Leilões';
      if (lk.includes('frazaoleiloes') || lk.includes('frazao')) return 'Frazão Leilões';
      if (lk.includes('santanderimoveis') || lk.includes('santander')) return 'Santander Imóveis';
      if (lk.includes('isaiasleiloes')) return 'Isaías Leilões';
      if (lk.includes('silasleiloeiro') || lk.includes('silas')) return 'Silas Leiloeiro';
      if (lk.includes('portellaleiloes')) return 'Portella Leilões';
      if (lk.includes('rioleiloes')) return 'Rio Leilões';
      if (lk.includes('alexandroleiloeiro')) return 'Alexandro Leiloeiro';
      if (lk.includes('paulobotelholeiloeiro')) return 'Paulo Botelho Leiloeiro';
      if (lk.includes('jvleiloes')) return 'JV Leilões';
      if (lk.includes('depaulaonline') || lk.includes('depaula')) return 'De Paula Leilões';
      if (lk.includes('rymerleiloes')) return 'Rymer Leilões';
      if (lk.includes('saraivaleiloes')) return 'Saraiva Leilões';
      if (lk.includes('schulmannleiloes')) return 'Schulmann Leilões';
      if (lk.includes('comprei.pgfn')) return 'Comprei PGFN';
      if (lk.includes('pestanaleiloes')) return 'Pestana Leilões';
      if (lk.includes('onildobastos')) return 'Onildo Bastos';
      if (lk.includes('gustavoleiloeiro')) return 'Gustavo Leiloeiro';
      if (lk.includes('mgl.com.br')) return 'MGL Leilões';
      if (lk.includes('leiloei.com')) return 'Leiloei';
      if (lk.includes('seuimovelbb')) return 'Seu Imóvel BB';
      if (lk.includes('vitrinebradesco')) return 'Vitrine Bradesco';
      if (lk.includes('ricartleiloes')) return 'Ricart Leilões';
      if (lk.includes('pamelaleiloeira')) return 'Pamela Leiloeira';
      if (lk.includes('facanhaleiloes')) return 'Façanha Leilões';
      if (lk.includes('leilaoimovel')) return 'Leilão Imóvel';
    }
    return name;
  }, []);

  // Dynamic Extrajudicial Auctioneers derivation
  const activeExtrajudicialAuctioneers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of auctions) {
      if (a.origin === 'extrajudicial') {
        const name = normalizeAuctioneerDisplay(a.auctioneerName || a.leiloeiro, a.auctionLink);
        if (name && name !== 'Caixa Econômica Federal' && name !== 'Caixa') {
          counts.set(name, (counts.get(name) || 0) + 1);
        }
      }
    }
    const list = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    const defaults = ['Portal Zuk', 'Mega Leilões', 'Biasi Leilões', 'Frazão Leilões', 'Santander Imóveis', 'Sold Leilões', 'EMGEA Imóveis', 'Vitrine Bradesco', 'Seu Imóvel BB', 'Pestana Leilões', 'MGL Leilões', 'Leiloei', 'Superbid', 'Leilão Imóvel'];
    for (const d of defaults) {
      if (!counts.has(d)) {
        list.push({ name: d, count: 0 });
      }
    }
    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [auctions, normalizeAuctioneerDisplay]);

  // Dynamic Judicial Auctioneers derivation
  const activeJudicialAuctioneers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of auctions) {
      if (a.origin === 'judicial') {
        const name = normalizeAuctioneerDisplay(a.auctioneerName || a.leiloeiro, a.auctionLink);
        if (name && name !== 'Caixa Econômica Federal' && name !== 'Caixa') {
          counts.set(name, (counts.get(name) || 0) + 1);
        }
      }
    }
    const list = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    const defaults = ['Portella Leilões', 'Rymer Leilões', 'Paulo Botelho Leiloeiro', 'Ricart Leilões', 'JV Leilões', 'Rio Leilões', 'Fabiano Ayupp', 'Schulmann Leilões', 'Lance Judicial', 'Isaías Leilões', 'Silas Leiloeiro', 'Onildo Bastos', 'Gustavo Leiloeiro', 'De Paula Leilões', 'Façanha Leilões', 'Saraiva Leilões', 'Pamela Leiloeira', 'Alexandro Leiloeiro'];
    for (const d of defaults) {
      if (!counts.has(d)) {
        list.push({ name: d, count: 0 });
      }
    }
    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [auctions, normalizeAuctioneerDisplay]);

  // Portal counts for backwards compatibility
  const zukAuctionsCount = useMemo(() => {
    return auctions.filter(a => a.leiloeiro === 'Portal Zuk' || (a.auctionLink && a.auctionLink.includes('portalzuk')) || (a.id && a.id.includes('portalzuk'))).length;
  }, [auctions]);

  const megaAuctionsCount = useMemo(() => {
    return auctions.filter(a => a.leiloeiro === 'Mega Leilões' || (a.auctionLink && a.auctionLink.includes('megaleiloes'))).length;
  }, [auctions]);

  const biasiAuctionsCount = useMemo(() => {
    return auctions.filter(a => a.leiloeiro === 'Biasi Leilões' || (a.auctionLink && a.auctionLink.includes('biasileiloes'))).length;
  }, [auctions]);

  const frazaoAuctionsCount = useMemo(() => {
    return auctions.filter(a => a.leiloeiro === 'Frazão Leilões' || (a.auctionLink && a.auctionLink.includes('frazao'))).length;
  }, [auctions]);

  // Portal search tracking
  const [portalSearchIds, setPortalSearchIds] = useState<Set<string>>(new Set());
  const autoPortalSearchIds = useRef<Set<string>>(new Set());

  // Available zones
  const availableZones = useMemo(() => {
    return getAvailableZonesForCity(selectedCityFilter);
  }, [selectedCityFilter]);

  const normalizeText = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';

  const checkOriginMatch = useCallback((a: AuctionProperty) => {
    if (advancedContextTab === 'alugar') {
      return a.transactionType === 'aluguel' || (a as any).tipoTransacao === 'aluguel' || (a as any).purpose === 'rent';
    }
    if (mode === 'portais') {
      return a.origin === 'portal';
    }
    if (mode === 'auctions' && a.origin === 'portal') {
      return false;
    }

    if (selectedAuctioneerFilter) {
      const q = selectedAuctioneerFilter.toLowerCase();
      const qClean = q.replace(/[^a-z0-9]/g, '');
      const displayName = normalizeAuctioneerDisplay(a.auctioneerName || a.leiloeiro, a.auctionLink).toLowerCase();
      const aucName = (a.auctioneerName || a.leiloeiro || '').toLowerCase();
      const aucLink = (a.auctionLink || '').toLowerCase();
      const srcLinks = (a.sourceLinks || []).join(' ').toLowerCase();
      const aucId = (a.id || '').toLowerCase();
      
      const matches = displayName === q ||
                      displayName.includes(q) ||
                      aucName.includes(q) || 
                      (qClean.length > 3 && (aucLink.includes(qClean) || srcLinks.includes(qClean) || aucId.includes(qClean)));
      if (!matches) return false;
    }

    const origin = a.origin || (a.id.startsWith('auc-caixa') ? 'caixa' : 'judicial');
    if (selectedOriginFilter === 'todos') {
      return origin !== 'portal';
    }
    if (selectedOriginFilter === 'caixa' || selectedOriginFilter === 'caixa_radar') {
      return origin === 'caixa' || origin === 'caixa_radar';
    }
    if (selectedOriginFilter === 'extrajudicial') {
      return origin === 'extrajudicial' || (!a.id.startsWith('auc-caixa') && origin !== 'caixa' && origin !== 'judicial');
    }
    if (selectedOriginFilter === 'judicial') {
      return origin === 'judicial';
    }
    if (selectedOriginFilter === 'portal') {
      return origin === 'portal';
    }
    return true;
  }, [mode, advancedContextTab, selectedAuctioneerFilter, selectedOriginFilter]);

  // Unique states from ITBI database (RJ, MG, SP etc)
  const uniqueStates = useMemo(() => Object.keys(VALID_ITBI_CITIES_BY_STATE).sort(), []);

  // Available cities for the current state or all
  const availableCities = useMemo(() => {
    if (selectedStateFilter) {
      return (VALID_ITBI_CITIES_BY_STATE[selectedStateFilter.toUpperCase()] || []).slice().sort();
    }
    return Object.values(VALID_ITBI_CITIES_BY_STATE).flat().slice().sort();
  }, [selectedStateFilter]);

  // Filtered cities according to typeahead input
  const filteredCitiesTypeahead = useMemo(() => {
    if (!citySearchInput.trim()) return availableCities.slice(0, 8);
    const query = normalizeText(citySearchInput);
    return availableCities.filter(c => normalizeText(c).includes(query)).slice(0, 10);
  }, [availableCities, citySearchInput]);

  // Extract unique neighborhoods from auctions matching origin, state and city
  const uniqueNeighborhoodsWithCount = useMemo(() => {
    let list = auctions.filter(checkOriginMatch);
    if (advancedContextTab === 'alugar') {
      list = list.filter(a => a.transactionType === 'aluguel' || (a as any).tipoTransacao === 'aluguel' || (a as any).purpose === 'rent');
    } else {
      list = list.filter(a => a.transactionType !== 'aluguel' && (a as any).tipoTransacao !== 'aluguel' && (a as any).purpose !== 'rent');
    }
    if (selectedStateFilter) {
      list = list.filter(a => (a.state || 'RJ').toUpperCase() === selectedStateFilter.toUpperCase());
    }
    if (selectedCityFilter) {
      const normCity = normalizeText(selectedCityFilter);
      list = list.filter(a => normalizeText(a.city || '').includes(normCity) || normCity.includes(normalizeText(a.city || '')));
    }

    const canonicalKey = (raw: string) =>
      String(raw || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/z/g, 's')
        .replace(/y/g, 'i')
        .replace(/ph/g, 'f')
        .replace(/th/g, 't')
        .replace(/w/g, 'v')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    const formatDisplay = (raw: string) => {
      const lowerWords = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
      return raw
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map((w, idx) => {
          const clean = w.toLowerCase();
          if (!clean) return '';
          if (idx > 0 && lowerWords.has(clean)) return clean;
          return clean.charAt(0).toUpperCase() + clean.slice(1);
        })
        .join(' ');
    };

    const itbiPreferred = new Map<string, string>();
    (itbiStats || []).forEach((s: any) => {
      if (!s?.neighborhood) return;
      if (selectedStateFilter && s.state && s.state.toUpperCase() !== selectedStateFilter.toUpperCase()) return;
      const k = canonicalKey(s.neighborhood);
      if (k && !itbiPreferred.has(k)) {
        itbiPreferred.set(k, formatDisplay(s.neighborhood));
      }
    });

    const map = new Map<string, { name: string; count: number }>();
    list.forEach(a => {
      if (!a.neighborhood) return;
      const k = canonicalKey(a.neighborhood);
      if (!k) return;
      const preferred = itbiPreferred.get(k);
      const formatted = preferred || formatDisplay(a.neighborhood);
      const prev = map.get(k);
      if (!prev) {
        map.set(k, { name: formatted, count: 1 });
      } else {
        const hasAccents = (s: string) => /[^\u0000-\u007f]/.test(s);
        const bestName = preferred || (hasAccents(formatted) && !hasAccents(prev.name) ? formatted : prev.name);
        map.set(k, { name: bestName, count: prev.count + 1 });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [auctions, itbiStats, checkOriginMatch, advancedContextTab, selectedStateFilter, selectedCityFilter]);

  // Filtered neighborhoods based on sidebar search
  const visibleNeighborhoods = useMemo(() => {
    if (!neighborhoodSearch.trim()) return uniqueNeighborhoodsWithCount;
    const query = normalizeText(neighborhoodSearch);
    return uniqueNeighborhoodsWithCount.filter(n => normalizeText(n.name).includes(query));
  }, [uniqueNeighborhoodsWithCount, neighborhoodSearch]);

  // Contadores dinâmicos para sub-modalidades Caixa no escopo geográfico ativo
  const caixaModalityCounts = useMemo(() => {
    const counts = {
      vendaDireta: 0,
      vendaOnline: 0,
      licitacao: 0,
      leilaoSfi: 0,
      total: 0
    };
    auctions.forEach(a => {
      if (!isCaixaAuction(a)) return;
      if (selectedStateFilter && (a.state || 'RJ').toUpperCase() !== selectedStateFilter.toUpperCase()) return;
      if (selectedCityFilter) {
        const normCity = normalizeText(selectedCityFilter);
        const aCity = normalizeText(a.city || '');
        if (!aCity.includes(normCity) && !normCity.includes(aCity)) return;
      }
      counts.total++;
      const mod = getCaixaModality(a);
      if (mod === 'VENDA_DIRETA_ONLINE') counts.vendaDireta++;
      else if (mod === 'VENDA_ONLINE') counts.vendaOnline++;
      else if (mod === 'LICITACAO_ABERTA') counts.licitacao++;
      else if (mod === 'LEILAO_SFI') counts.leilaoSfi++;
    });
    return counts;
  }, [auctions, selectedStateFilter, selectedCityFilter]);

  const handleToggleNeighborhood = (neigh: string) => {
    setSelectedNeighborhoods(prev => {
      if (prev.includes(neigh)) {
        const next = prev.filter(n => n !== neigh);
        setSelectedNeighborhoodFilter(next.length === 1 ? next[0] : '');
        return next;
      } else {
        const next = [...prev, neigh];
        setSelectedNeighborhoodFilter(next.length === 1 ? next[0] : '');
        return next;
      }
    });
  };

  const handleSelectAllNeighborhoods = () => {
    const allNames = visibleNeighborhoods.map(n => n.name);
    setSelectedNeighborhoods(allNames);
    setSelectedNeighborhoodFilter('');
  };

  const handleClearNeighborhoods = () => {
    setSelectedNeighborhoods([]);
    setSelectedNeighborhoodFilter('');
  };

  // Helper for acquisition mode badges
  const getSaleModeBadge = useCallback((auc: AuctionProperty) => {
    const isCaixa = isCaixaAuction(auc);
    if (isCaixa) {
      const modality = getCaixaModality(auc);
      if (modality === 'VENDA_DIRETA_ONLINE') {
        return {
          label: 'Venda Direta Online',
          type: 'venda_direta_online',
          icon: '🤝',
          className: 'bg-slate-900/60 text-emerald-400 border-slate-800 shadow-xs'
        };
      }
      if (modality === 'VENDA_ONLINE') {
        return {
          label: 'Venda Online',
          type: 'venda_online',
          icon: '⏱️',
          className: 'bg-slate-900/60 text-cyan-400 border-slate-800 shadow-xs'
        };
      }
      if (modality === 'LICITACAO_ABERTA') {
        return {
          label: 'Licitação Aberta',
          type: 'licitacao_aberta',
          icon: '📢',
          className: 'bg-slate-900/60 text-amber-400 border-slate-800 shadow-xs'
        };
      }
      if (modality === 'LEILAO_SFI') {
        return {
          label: 'Leilão SFI Online',
          type: 'leilao_sfi',
          icon: '⚖️',
          className: 'bg-slate-900/60 text-indigo-400 border-slate-800 shadow-xs'
        };
      }
    }

    let mode = auc.saleMode;
    if (!mode && auc.description) {
      const mMatch = auc.description.match(/Modalidade:\s*([^.]+)/i);
      if (mMatch) mode = mMatch[1].trim();
    }
    if (!mode) {
      const textLower = `${auc.title} ${auc.description || ''} ${auc.paymentTerms || ''}`.toLowerCase();
      if (textLower.includes('venda direta online')) mode = 'Venda Direta Online';
      else if (textLower.includes('venda direta')) mode = 'Venda Direta';
      else if (textLower.includes('licitação aberta') || textLower.includes('licitacao aberta')) mode = 'Licitação Aberta';
      else if (textLower.includes('venda online')) mode = 'Venda Online';
      else if (textLower.includes('leilão sfi') || textLower.includes('leilao sfi')) mode = 'Leilão SFI Online';
      else if (textLower.includes('online')) mode = 'Leilão Online';
      else if (auc.origin === 'judicial') mode = 'Leilão Judicial Online';
      else if (auc.origin === 'extrajudicial') mode = 'Leilão Extrajudicial Online';
      else mode = 'Leilão Online';
    }

    const modeLower = (mode || '').toLowerCase();
    
    if (modeLower.includes('venda direta')) {
      return {
        label: modeLower.includes('online') ? 'Venda Direta Online' : 'Venda Direta',
        type: 'venda_direta_online',
        icon: '🤝',
        className: 'bg-slate-900/60 text-emerald-400 border-slate-800 shadow-xs'
      };
    }

    if (modeLower.includes('venda online')) {
      return {
        label: 'Venda Online',
        type: 'venda_online',
        icon: '⏱️',
        className: 'bg-slate-900/60 text-cyan-400 border-slate-800 shadow-xs'
      };
    }
    
    if (modeLower.includes('licita') || modeLower.includes('licitação')) {
      return {
        label: 'Licitação Aberta',
        type: 'licitacao_aberta',
        icon: '📢',
        className: 'bg-slate-900/60 text-amber-400 border-slate-800 shadow-xs'
      };
    }

    if (modeLower.includes('sfi') || modeLower.includes('edital único')) {
      return {
        label: 'Leilão SFI Online',
        type: 'leilao_sfi',
        icon: '⚖️',
        className: 'bg-slate-900/60 text-indigo-400 border-slate-800 shadow-xs'
      };
    }

    if (auc.origin === 'judicial') {
      return {
        label: 'Leilão Judicial Online',
        type: 'judicial_online',
        icon: '⚖️',
        className: 'bg-slate-900/60 text-purple-400 border-slate-800 shadow-xs'
      };
    }

    return {
      label: mode || 'Leilão Online',
      type: 'leilao_online',
      icon: '🌐',
      className: 'bg-slate-900/60 text-blue-400 border-slate-800 shadow-xs'
    };
  }, []);

  // Filter & Sort listing
  const filteredAndSortedAuctions = useMemo(() => {
    let result = auctions.filter(checkOriginMatch);

    // Expurgar lotes encerrados/arrematados ou com datas de leilão já transcorridas
    const nowIso = new Date().toISOString();
    const todayEnd = Date.parse(nowIso.slice(0, 10) + 'T23:59:59-03:00');
    result = result.filter(a => {
      // Imóveis de Portais (Flip House) são anúncios ativos e NÃO devem ser expurgados por data de leilão,
      // mas devem ser filtrados se já tiverem sido vendidos, alugados ou encerrados
      if (a.origin === 'portal') {
        if (a.status && /arrematad|encerrad|cancelad|suspens|sustad|finalizad|vendid|retirad|expirad/i.test(a.status)) return false;
        if (a.title && /\b(vendido|alugado|indispon[íi]vel)\b/i.test(a.title)) return false;
        if (a.description && /\b(imóvel vendido|já foi vendido|anúncio pausado)\b/i.test(a.description)) return false;
        return true;
      }

      // Imóveis da Caixa são sincronizados diretamente com a planilha oficial de ativos da Caixa
      if (a.origin === 'caixa' || a.origin === 'caixa_radar' || a.id?.startsWith('auc-caixa-')) {
        if (a.status && /arrematad|encerrad|cancelad|suspens|sustad|finalizad|vendid|retirad|expirad/i.test(a.status)) return false;
        return true;
      }

      if (a.availability?.state === 'closed' || a.availability?.state === 'removed' || a.sourceClosed === true) return false;
      if (a.status && /arrematad|encerrad|cancelad|suspens|sustad|finalizad|vendid|retirad|expirad/i.test(a.status)) return false;
      if (a.ingestionStatus === 'expirado_por_data' || a.ingestionStatus === 'finalizado') return false;

      const mode = `${a.saleMode || ''} ${a.title || ''}`;
      if (!/venda direta|proposta continuada|venda online cont/i.test(mode)) {
        const dates = [a.secondAuctionDate, a.auctionDate, a.firstAuctionDate, a.thirdAuctionDate]
          .filter(Boolean)
          .map(d => /^\d{4}-\d{2}-\d{2}$/.test(d!) ? Date.parse(d + 'T23:59:59-03:00') : Date.parse(d!))
          .filter(Number.isFinite);
        if (dates.length > 0 && dates.every(d => d < todayEnd)) {
          return false;
        }
        
      }
      return true;
    });

    // Filtro de Finalidade da Busca: Venda (Comprar) vs Locação (Alugar para Morar)
    if (advancedContextTab === 'alugar') {
      result = result.filter(a => a.transactionType === 'aluguel' || (a as any).tipoTransacao === 'aluguel' || (a as any).purpose === 'rent');
      if (strategyFilters.superCheap) {
        const cheap = result.filter(a => a.vereditoLocacao === 'barato' || (a.aluguelDiferencaPct !== undefined && a.aluguelDiferencaPct < 0));
        if (cheap.length > 0) result = cheap;
      }
    } else {
      result = result.filter(a => a.transactionType !== 'aluguel' && (a as any).tipoTransacao !== 'aluguel' && (a as any).purpose !== 'rent');
      if (strategyFilters.under250k && mode === 'portais') {
        result = result.filter(a => (a.auctionPrice || a.precoAnunciado || 0) <= 250000);
      }
    }

    if (selectedStateFilter) {
      result = result.filter(a => (a.state || 'RJ').toUpperCase() === selectedStateFilter.toUpperCase());
    }

    if (selectedCityFilter) {
      const normCity = normalizeText(selectedCityFilter);
      result = result.filter(a => normalizeText(a.city || '').includes(normCity) || normCity.includes(normalizeText(a.city || '')));
    }

    if (selectedZoneFilter) {
      result = result.filter(a => isNeighborhoodInZone(a.city, a.neighborhood, selectedZoneFilter) || a.zone === selectedZoneFilter);
    }

    if (selectedNeighborhoods.length > 0) {
      const orthoKey = (s: string) =>
        normalizeText(s).replace(/z/g, 's').replace(/y/g, 'i').replace(/ph/g, 'f').replace(/th/g, 't').replace(/w/g, 'v').replace(/[^a-z0-9]/g, '');
      const normSelected = selectedNeighborhoods.map(orthoKey);
      result = result.filter(a => normSelected.includes(orthoKey(a.neighborhood || '')));
    } else if (selectedNeighborhoodFilter) {
      const orthoKey = (s: string) =>
        normalizeText(s).replace(/z/g, 's').replace(/y/g, 'i').replace(/ph/g, 'f').replace(/th/g, 't').replace(/w/g, 'v').replace(/[^a-z0-9]/g, '');
      const normSingle = orthoKey(selectedNeighborhoodFilter);
      result = result.filter(a => orthoKey(a.neighborhood || '') === normSingle);
    }

    if (selectedTypeFilter) {
      result = result.filter(a => a.propertyType === selectedTypeFilter);
    }

    // Busca textual por logradouro, bairro, condomínio ou título
    if (advancedSearchQuery && advancedSearchQuery.trim()) {
      const q = normalizeText(advancedSearchQuery);
      result = result.filter(a => {
        const hay = normalizeText(`${a.title || ''} ${a.address || ''} ${a.neighborhood || ''} ${a.description || ''} ${(a as any).condominio || ''}`);
        return hay.includes(q);
      });
    }

    // Filtros de Quartos, Vagas e Banheiros
    if (bedroomsFilter !== null && bedroomsFilter > 0) {
      result = result.filter(a => (a.bedrooms || 0) >= bedroomsFilter);
    }
    if (parkingFilter !== null && parkingFilter > 0) {
      result = result.filter(a => ((a.parkingSpaces || (a as any).parkingSpots || 0)) >= parkingFilter);
    }
    if (bathroomsFilter !== null && bathroomsFilter > 0) {
      result = result.filter(a => (a.bathrooms || 0) >= bathroomsFilter);
    }

    // Faixa de Metragem Privativa (m²)
    const minA = Number(minAreaInput);
    if (!isNaN(minA) && minA > 0) {
      result = result.filter(a => (Number(a.sizeSqm) || 0) >= minA);
    }
    const maxA = Number(maxAreaInput);
    if (!isNaN(maxA) && maxA > 0) {
      result = result.filter(a => (Number(a.sizeSqm) || 0) <= maxA);
    }

    // Desconto Mínimo (% sobre o mercado ITBI)
    if (minDiscountFilter > 0) {
      result = result.filter(a => (a.descontoMercadoPct || 0) >= minDiscountFilter);
    }

    // Min / Max price filters
    const minP = Number(minPriceInput);
    if (!isNaN(minP) && minP > 0) {
      result = result.filter(a => {
        const p = advancedContextTab === 'alugar' ? (a.monthlyRent || a.precoAnunciado || a.auctionPrice || 0) : (a.auctionPrice || a.precoAnunciado || 0);
        return p >= minP;
      });
    }
    const maxP = Number(maxPriceInput || maxPriceFilter);
    if (!isNaN(maxP) && maxP > 0) {
      result = result.filter(a => {
        const p = advancedContextTab === 'alugar' ? (a.monthlyRent || a.precoAnunciado || a.auctionPrice || 0) : (a.auctionPrice || a.precoAnunciado || 0);
        return p <= maxP;
      });
    }

    // Caixa sub-modes filter (Separação canônica estrita - Sem colisões de substring)
    if (selectedOriginFilter === 'caixa') {
      result = result.filter(a => {
        const isCaixa = isCaixaAuction(a);
        if (!isCaixa) return false;
        const modality = getCaixaModality(a);
        if (modality === 'VENDA_DIRETA_ONLINE') return caixaSubModes.vendaDireta;
        if (modality === 'VENDA_ONLINE') return caixaSubModes.vendaOnline;
        if (modality === 'LICITACAO_ABERTA') return caixaSubModes.licitacao;
        if (modality === 'LEILAO_SFI') return caixaSubModes.leilaoSfi;
        return true;
      });
    }

    // Filtro de Portais Imobiliários selecionados
    if (selectedOriginFilter === 'portal' || selectedPortals.length < ALL_PORTALS.length) {
      result = result.filter(a => {
        if (a.origin !== 'portal') return true;
        if (!a.portalName) return true;
        return selectedPortals.includes(a.portalName);
      });
    }

    // Condições de Aquisição & Ocupação (Financiamento, Parcelamento, Desocupado)
    if (onlyFinancing) {
      result = result.filter(a => a.allowsFinancing === true);
    }
    if (onlyInstallments) {
      result = result.filter(a => a.allowsInstallments === true);
    }
    if (onlyVacant) {
      result = result.filter(a => a.occupied === false);
    }

    // Yield / Profit filters
    if (onlyHighReturn) {
      result = result.filter(a => (a.calculatedRoi || 0) >= 40 && Math.min(a.liquidityScore ?? 0, assessDataQuality(a).liquidityCeiling) >= 7);
    }

    if (minRoiFilter > 0) {
      result = result.filter(a => (a.calculatedRoi || 0) >= minRoiFilter);
    }

    if (onlyAnalysisAboveEdital) {
      result = result.filter(a => (a.estimatedValue || 0) > (a.evaluationPrice || a.auctionPrice));
    }

    if (itbiConfidenceFilter === 'verified') {
      result = result.filter(a => a.valuationConfidence === 'verified' && (a.itbiStreetCount || 0) > 0);
    }

    if (prestigeFilter === 'nobre') {
      result = result.filter(a => {
        const area = Number(a.sizeSqm) || 0;
        const flipPrice = Number(a.vendaBaixaPrice) || Number(a.vendaMediaPrice) || 0;
        const flipM2 = area > 0 ? flipPrice / area : 0;
        return flipM2 >= 4500;
      });
    } else if (prestigeFilter === 'prime') {
      result = result.filter(a => {
        const area = Number(a.sizeSqm) || 0;
        const flipPrice = Number(a.vendaBaixaPrice) || Number(a.vendaMediaPrice) || 0;
        const flipM2 = area > 0 ? flipPrice / area : 0;
        return flipM2 >= 8000;
      });
    }

    // As estratégias NÃO eliminam nenhum imóvel da lista — funcionam estritamente como ranqueamento multi-critério (sobem os melhores para o topo)

    // Capital Budget filter
    const budgetNum = Number(capitalBudget);
    if (!isNaN(budgetNum) && budgetNum > 0) {
      result = result.filter(a => {
        const repair = a.estimatedRepair || Math.round(a.auctionPrice * 0.05);
        const debts = a.pendingDebts || 0;
        const totalFullCash = a.auctionPrice + repair + debts + (a.otherCosts || 0);
        // Either full cash fits budget or financed down payment fits budget
        const financedDownPayment = (a.auctionPrice * 0.05) + repair + debts + (a.otherCosts || 0);
        return totalFullCash <= budgetNum || (a.allowsFinancing && financedDownPayment <= budgetNum);
      });
    }

    const qualityByAuction = new Map(result.map(property => [property, assessDataQuality(property)] as const));

    // 1. Quarentena de Imóveis Inauditáveis / Sob Análise / Sem Preço de Flip / Liquidez 0
    const isQuarantineAuction = (a: AuctionProperty) => {
      if (a.origin === 'portal') return false;
      const q = qualityByAuction.get(a);
      const effectiveLiq = Math.min(a.liquidityScore ?? 0, q?.liquidityCeiling ?? 10);
      const flipPrice = Number(a.vendaBaixaPrice) || 0;
      return (
        flipPrice <= 0 ||
        effectiveLiq === 0 ||
        a.precisa_revisao === true ||
        a.valuationConfidence === 'unavailable' ||
        (Number(a.sizeSqm) || 0) <= 0
      );
    };

    const eligibleAuctions: AuctionProperty[] = [];
    const quarantinedAuctions: AuctionProperty[] = [];

    for (const prop of result) {
      if (isQuarantineAuction(prop)) {
        quarantinedAuctions.push(prop);
      } else {
        eligibleAuctions.push(prop);
      }
    }

    // 2. Cálculo de Percentis (0 a 100) para Imóveis Elegíveis
    const computePercentileMap = (items: AuctionProperty[], getValue: (a: AuctionProperty) => number) => {
      const map = new Map<AuctionProperty, number>();
      if (items.length === 0) return map;
      if (items.length === 1) {
        map.set(items[0], 100);
        return map;
      }
      const sorted = [...items].sort((a, b) => getValue(a) - getValue(b));
      const M = sorted.length;
      for (let i = 0; i < M; i++) {
        let j = i;
        while (j + 1 < M && getValue(sorted[j + 1]) === getValue(sorted[i])) {
          j++;
        }
        const avgRank = (i + j) / 2;
        const percentile = (avgRank / (M - 1)) * 100;
        for (let k = i; k <= j; k++) {
          map.set(sorted[k], percentile);
        }
        i = j;
      }
      return map;
    };

    const getAucLucroReal = (a: AuctionProperty): number => {
      if (a.origin === 'portal') {
        const precoCompra = a.precoAnunciado || a.auctionPrice || 0;
        const itbi = Math.round(precoCompra * 0.03);
        const rgi = Math.round(precoCompra * 0.02);
        const reforma = Math.round(precoCompra * 0.05);
        const dividas = (a.pendingDebts || 0) + (a.valorCondominio || 0) + (a.valorIptu || 0);
        const totalCost = precoCompra + itbi + rgi + reforma + dividas;
        const m2Ref = a.m2ReferenciaBairro || 3600;
        const valMercado = a.valorMercadoEstimado || a.estimatedValue || Math.round((a.sizeSqm || 1) * m2Ref);
        if (a.transactionType === 'aluguel') {
          const rent = a.monthlyRent || a.precoAnunciado || a.auctionPrice || 0;
          const rentRef = a.mediaLocacaoCalculadora || Math.round(valMercado * 0.0055);
          return Math.max(0, rentRef - rent) * 12;
        }
        const flipExit = Number(a.vendaBaixaPrice) || Number(a.vendaMediaPrice) || valMercado;
        return flipExit - totalCost;
      }
      const flipPrice = Number(a.vendaBaixaPrice) || Number(a.vendaMediaPrice) || 0;
      if (flipPrice <= 0) return (Number(a.calculatedProfit) || 0);
      const costs = auctionCosts(a);
      const totalCost = costs.bid + costs.auctioneer + costs.itbi + costs.registry + costs.repair + costs.legal + costs.iptu + costs.condo + costs.custoCarregamento;
      return Math.round(flipPrice - totalCost);
    };

    const getAucRoi = (a: AuctionProperty): number => {
      if (a.origin === 'portal') {
        const precoCompra = a.precoAnunciado || a.auctionPrice || 0;
        const itbi = Math.round(precoCompra * 0.03);
        const rgi = Math.round(precoCompra * 0.02);
        const reforma = Math.round(precoCompra * 0.05);
        const dividas = (a.pendingDebts || 0) + (a.valorCondominio || 0) + (a.valorIptu || 0);
        const totalCost = precoCompra + itbi + rgi + reforma + dividas;
        const m2Ref = a.m2ReferenciaBairro || 3600;
        const valMercado = a.valorMercadoEstimado || a.estimatedValue || Math.round((a.sizeSqm || 1) * m2Ref);
        if (a.transactionType === 'aluguel') {
          const rent = a.monthlyRent || a.precoAnunciado || a.auctionPrice || 0;
          return valMercado > 0 ? Number(((rent * 12 / valMercado) * 100).toFixed(2)) : 0;
        }
        const flipExit = Number(a.vendaBaixaPrice) || Number(a.vendaMediaPrice) || valMercado;
        const diff = flipExit - totalCost;
        return totalCost > 0 ? Number(((diff / totalCost) * 100).toFixed(2)) : 0;
      }
      const flipPrice = Number(a.vendaBaixaPrice) || Number(a.vendaMediaPrice) || 0;
      if (flipPrice <= 0) return (Number(a.calculatedRoi) || 0);
      const costs = auctionCosts(a);
      const totalCost = costs.bid + costs.auctioneer + costs.itbi + costs.registry + costs.repair + costs.legal + costs.iptu + costs.condo + costs.custoCarregamento;
      return totalCost > 0 ? Number((((flipPrice - totalCost) / totalCost) * 100).toFixed(2)) : 0;
    };

    const spreadPercentiles = computePercentileMap(eligibleAuctions, a => calculateSpreadSqm(a));
    const liquidityPercentiles = computePercentileMap(eligibleAuctions, a => {
      const ceiling = qualityByAuction.get(a)?.liquidityCeiling ?? 10;
      return Math.min(a.liquidityScore ?? 0, ceiling);
    });
    const profitPercentiles = computePercentileMap(eligibleAuctions, a => getAucLucroReal(a));
    const roiPercentiles = computePercentileMap(eligibleAuctions, a => getAucRoi(a));
    const m2FlipPercentiles = computePercentileMap(eligibleAuctions, a => {
      const area = Number(a.sizeSqm) || 0;
      const flipPrice = Number(a.vendaBaixaPrice) || Number(a.vendaMediaPrice) || 0;
      return area > 0 ? flipPrice / area : 0;
    });

    // 3. Pesos Hierárquicos Normalizados (Spread 0.50, Liquidez 0.30, Lucro 0.10, M² Flip / ROI 0.10)
    // Se [Maior Spread] e [Maior Liquidez] estiverem ativos: Spread 0.625, Liquidez 0.375
    const activeWeights = {
      spread: strategyFilters.spread ? 0.50 : 0,
      liquidity: strategyFilters.liquidity ? 0.30 : 0,
      profit: strategyFilters.profit ? 0.10 : 0,
      roi: strategyFilters.roi ? 0.10 : 0,
    };
    const totalWeight = activeWeights.spread + activeWeights.liquidity + activeWeights.profit + activeWeights.roi;
    const strategyScoreMap = new Map<AuctionProperty, number>();

    if (totalWeight > 0) {
      const wSpread = activeWeights.spread / totalWeight;
      const wLiq = activeWeights.liquidity / totalWeight;
      const wProfit = activeWeights.profit / totalWeight;
      const wRoi = activeWeights.roi / totalWeight;

      for (const prop of eligibleAuctions) {
        const pSpread = spreadPercentiles.get(prop) ?? 0;
        const pLiq = liquidityPercentiles.get(prop) ?? 0;
        const pProfit = profitPercentiles.get(prop) ?? 0;
        const pM2Flip = m2FlipPercentiles.get(prop) ?? 0;
        const pRoi = roiPercentiles.get(prop) ?? 0;
        // Ponderação com Spread, Liquidez, Lucro e padrão de revenda/ROI
        const score = (wSpread * pSpread) + (wLiq * pLiq) + (wProfit * pProfit) + (wRoi * ((pM2Flip + pRoi) / 2));
        strategyScoreMap.set(prop, score);
      }
    }
    for (const prop of quarantinedAuctions) {
      strategyScoreMap.set(prop, 0);
    }

    // 4. Ordenação dos Imóveis Elegíveis
    eligibleAuctions.sort((a, b) => {
      // 1. ORDENAÇÃO DE LOCAÇÃO RESIDENCIAL (Alugar para Morar)
      if (advancedContextTab === 'alugar' || a.transactionType === 'aluguel' || b.transactionType === 'aluguel') {
        if (temporalSortMode === 'urgent') {
          const daysA = a.diasPublicado !== undefined ? a.diasPublicado : 0;
          const daysB = b.diasPublicado !== undefined ? b.diasPublicado : 0;
          if (daysB !== daysA) return daysB - daysA;
        } else if (temporalSortMode === 'newest') {
          const daysA = a.diasPublicado !== undefined ? a.diasPublicado : 0;
          const daysB = b.diasPublicado !== undefined ? b.diasPublicado : 0;
          if (daysA !== daysB) return daysA - daysB;
        }

        if (strategyFilters.lowestRent) {
          const rentA = a.monthlyRent || a.aluguelMensal || a.auctionPrice || 0;
          const rentB = b.monthlyRent || b.aluguelMensal || b.auctionPrice || 0;
          if (rentA !== rentB) return rentA - rentB;
        }

        if (strategyFilters.lowestRentSqm) {
          const sqmA = (a.monthlyRent || a.aluguelMensal || a.auctionPrice || 0) / (a.sizeSqm || 1);
          const sqmB = (b.monthlyRent || b.aluguelMensal || b.auctionPrice || 0) / (b.sizeSqm || 1);
          if (sqmA !== sqmB) return sqmA - sqmB;
        }

        if (strategyFilters.bestRentDiscount) {
          // 1. Veredito de locação da Calculadora: imóveis com veredito "barato" têm prioridade máxima
          const getVereditoScore = (x: AuctionProperty) => {
            if (x.vereditoLocacao === 'barato' || (x.aluguelDiferencaPct !== undefined && x.aluguelDiferencaPct <= -10)) return 3;
            if (x.vereditoLocacao === 'justo' || (x.aluguelDiferencaPct !== undefined && x.aluguelDiferencaPct < 10)) return 2;
            return 1;
          };
          const scoreA = getVereditoScore(a);
          const scoreB = getVereditoScore(b);
          if (scoreB !== scoreA) return scoreB - scoreA;

          // 2. Maior percentual de desconto sobre o valor de locação justo que o imóvel realmente vale
          // Quanto maior o deságio do aluguel pedido em relação à média pericial da Calculadora
          const getRentDiscountPct = (x: AuctionProperty) => {
            if (x.descontoMercadoPct && x.descontoMercadoPct > 0) return x.descontoMercadoPct;
            if (x.aluguelDiferencaPct !== undefined && x.aluguelDiferencaPct < 0) return Math.abs(x.aluguelDiferencaPct);
            const rent = x.monthlyRent || x.aluguelMensal || x.auctionPrice || 0;
            const refRent = x.mediaLocacaoCalculadora || Math.round((x.valorMercadoEstimado || (x.sizeSqm * (x.m2ReferenciaBairro || 3600))) * 0.0055);
            if (refRent > 0 && rent < refRent) {
              return Math.round(((refRent - rent) / refRent) * 100);
            }
            return 0;
          };
          const discA = getRentDiscountPct(a);
          const discB = getRentDiscountPct(b);
          if (discB !== discA) return discB - discA;

          // 3. Desempate: Maior economia financeira líquida em R$/mês
          const getMonthlySavings = (x: AuctionProperty) => {
            const rent = x.monthlyRent || x.aluguelMensal || x.auctionPrice || 0;
            const refRent = x.mediaLocacaoCalculadora || Math.round((x.valorMercadoEstimado || (x.sizeSqm * (x.m2ReferenciaBairro || 3600))) * 0.0055);
            return Math.max(0, refRent - rent);
          };
          const saveA = getMonthlySavings(a);
          const saveB = getMonthlySavings(b);
          if (saveB !== saveA) return saveB - saveA;
        }

        // Padrão / Super Barato: Ordena pelo menor percentual vs calculadora (mais barato que a média primeiro, ex: -40%, -25%)
        const diffA = a.aluguelDiferencaPct !== undefined ? a.aluguelDiferencaPct : 0;
        const diffB = b.aluguelDiferencaPct !== undefined ? b.aluguelDiferencaPct : 0;
        if (diffA !== diffB) return diffA - diffB;

        const rentA = a.monthlyRent || a.aluguelMensal || a.auctionPrice || 0;
        const rentB = b.monthlyRent || b.aluguelMensal || b.auctionPrice || 0;
        return rentA - rentB;
      }

      // 2. ORDENAÇÃO DE FLIP HOUSE (Portais de Venda Direta Particular)
      if (selectedOriginFilter === 'portal' || mode === 'portais' || a.origin === 'portal' || b.origin === 'portal') {
        // 1. Critérios temporais se ativos
        if (temporalSortMode === 'urgent') {
          const daysA = a.diasPublicado !== undefined ? a.diasPublicado : 0;
          const daysB = b.diasPublicado !== undefined ? b.diasPublicado : 0;
          if (daysB !== daysA) return daysB - daysA;
        } else if (temporalSortMode === 'newest') {
          const daysA = a.diasPublicado !== undefined ? a.diasPublicado : 0;
          const daysB = b.diasPublicado !== undefined ? b.diasPublicado : 0;
          if (daysA !== daysB) return daysA - daysB;
        }

        const activeSortKey = sortBy || 'roi';

        // 2. Estratégia Maior Desconto sobre mercado ITBI
        if (strategyFilters.discount) {
          const descA = a.descontoMercadoPct !== undefined ? a.descontoMercadoPct : 0;
          const descB = b.descontoMercadoPct !== undefined ? b.descontoMercadoPct : 0;
          if (descB !== descA) return descB - descA;
        }

        // 3. Estratégia Menor Preço por m²
        if (strategyFilters.lowestSqm) {
          const sqmA = (a.auctionPrice || a.precoAnunciado || 0) / (a.sizeSqm || 1);
          const sqmB = (b.auctionPrice || b.precoAnunciado || 0) / (b.sizeSqm || 1);
          if (sqmA !== sqmB) return sqmA - sqmB;
        }

        // 4. Se ordenação por Lucro ou estratégia de lucro estiver ativa
        if (strategyFilters.profit || activeSortKey === 'profit') {
          const profA = a.calculatedProfit !== undefined ? a.calculatedProfit : getAucLucroReal(a);
          const profB = b.calculatedProfit !== undefined ? b.calculatedProfit : getAucLucroReal(b);
          if (profB !== profA) return profB - profA;
        }

        // 5. Se ordenação por Spread ou estratégia de spread estiver ativa
        if (strategyFilters.spread || activeSortKey === 'spread') {
          const spA = calculateSpreadSqm(a);
          const spB = calculateSpreadSqm(b);
          if (spB !== spA) return spB - spA;
        }

        // 6. CRITÉRIO PADRÃO MANDATÓRIO: Maior ROI decrescente
        const roiA = a.calculatedRoi !== undefined ? a.calculatedRoi : getAucRoi(a);
        const roiB = b.calculatedRoi !== undefined ? b.calculatedRoi : getAucRoi(b);
        if (roiB !== roiA) return roiB - roiA;

        // 7. Desempate primário mandatório: Maior Lucro Líquido Real decrescente
        const profA = a.calculatedProfit !== undefined ? a.calculatedProfit : getAucLucroReal(a);
        const profB = b.calculatedProfit !== undefined ? b.calculatedProfit : getAucLucroReal(b);
        if (profB !== profA) return profB - profA;

        // 8. Desempate secundário: Maior desconto sobre o mercado ITBI
        const descA = a.descontoMercadoPct !== undefined ? a.descontoMercadoPct : 0;
        const descB = b.descontoMercadoPct !== undefined ? b.descontoMercadoPct : 0;
        if (descB !== descA) return descB - descA;

        return (b.auctionPrice || 0) - (a.auctionPrice || 0);
      }
      // 1. Se filtros de estratégia estiverem ativos, ordena pelo Score ponderado composto decrescente (maior score no topo)
      if (totalWeight > 0) {
        const scoreA = strategyScoreMap.get(a) ?? 0;
        const scoreB = strategyScoreMap.get(b) ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
      }

      // 2. Ordenação temporal se ativa
      if (temporalSortMode === 'urgent') {
        const dateA = a.firstAuctionDate || a.auctionDate || '9999-12-31';
        const dateB = b.firstAuctionDate || b.auctionDate || '9999-12-31';
        const dateOrder = dateA.localeCompare(dateB);
        if (dateOrder) return dateOrder;
      } else if (temporalSortMode === 'newest') {
        const newestOrder = (b.id || '').localeCompare(a.id || '');
        if (newestOrder) return newestOrder;
      }

      // 3. Dropdown sortBy se selecionado
      const activeSortKey = sortBy || 'spread';
      if (activeSortKey === 'price_asc') return a.auctionPrice - b.auctionPrice;
      if (activeSortKey === 'price_desc') return b.auctionPrice - a.auctionPrice;
      if (activeSortKey === 'closing_date') {
        const dA = a.firstAuctionDate || a.auctionDate || '9999-12-31';
        const dB = b.firstAuctionDate || b.auctionDate || '9999-12-31';
        return dA.localeCompare(dB);
      }
      if (activeSortKey === 'profit' && totalWeight === 0) {
        const profitB = getAucLucroReal(b);
        const profitA = getAucLucroReal(a);
        if (profitB !== profitA) return profitB - profitA;
      }
      if (activeSortKey === 'roi' && totalWeight === 0) {
        const roiDiff = getAucRoi(b) - getAucRoi(a);
        if (roiDiff !== 0) return roiDiff;
      }
      if (activeSortKey === 'liquidity' && totalWeight === 0) {
        const ceilingA = qualityByAuction.get(a)?.liquidityCeiling ?? 10;
        const ceilingB = qualityByAuction.get(b)?.liquidityCeiling ?? 10;
        const liqB = Math.min(b.liquidityScore ?? 0, ceilingB);
        const liqA = Math.min(a.liquidityScore ?? 0, ceilingA);
        if (liqB !== liqA) return liqB - liqA;
      }

      // Prioridade SSOT do Ranqueamento:
      // 1º Spread por m² (maior spread fica acima)
      // 2º Lucro Real (segundo fator de peso)
      // 3º Liquidez (depois liquidez)
      // 4º ROI (desempate residual)
      const spreadB = calculateSpreadSqm(b);
      const spreadA = calculateSpreadSqm(a);
      if (spreadB !== spreadA) return spreadB - spreadA;

      const profitB = getAucLucroReal(b);
      const profitA = getAucLucroReal(a);
      if (profitB !== profitA) return profitB - profitA;

      const ceilingA = qualityByAuction.get(a)?.liquidityCeiling ?? 10;
      const ceilingB = qualityByAuction.get(b)?.liquidityCeiling ?? 10;
      const liqB = Math.min(b.liquidityScore ?? 0, ceilingB);
      const liqA = Math.min(a.liquidityScore ?? 0, ceilingA);
      if (liqB !== liqA) return liqB - liqA;

      const m2FlipB = (Number(b.vendaBaixaPrice) || Number(b.vendaMediaPrice) || 0) / (Number(b.sizeSqm) || 1);
      const m2FlipA = (Number(a.vendaBaixaPrice) || Number(a.vendaMediaPrice) || 0) / (Number(a.sizeSqm) || 1);
      if (m2FlipB !== m2FlipA) return m2FlipB - m2FlipA;

      return getAucRoi(b) - getAucRoi(a);
    });

    // 5. Ordenação defensiva dos Quarentenados (menor preço de leilão)
    quarantinedAuctions.sort((a, b) => (a.auctionPrice || 0) - (b.auctionPrice || 0));

    // 6. Concatenar: Elegíveis primeiro, Quarentena no final absoluto
    result = [...eligibleAuctions, ...quarantinedAuctions];

    return result;
  }, [
    auctions,
    checkOriginMatch,
    mode,
    advancedContextTab,
    selectedStateFilter,
    selectedCityFilter,
    selectedZoneFilter,
    selectedNeighborhoods,
    selectedNeighborhoodFilter,
    selectedTypeFilter,
    minPriceInput,
    maxPriceInput,
    maxPriceFilter,
    selectedOriginFilter,
    selectedPortals,
    caixaSubModes,
    advancedSearchQuery,
    bedroomsFilter,
    parkingFilter,
    bathroomsFilter,
    minAreaInput,
    maxAreaInput,
    minDiscountFilter,
    onlyFinancing,
    onlyInstallments,
    onlyVacant,
    onlyHighReturn,
    minRoiFilter,
    onlyAnalysisAboveEdital,
    itbiConfidenceFilter,
    prestigeFilter,
    capitalBudget,
    temporalSortMode,
    strategyFilters,
    sortBy,
    getSaleModeBadge
  ]);

  // Alternância entre Comprar e Alugar: reseta paginação e filtros sem disparar extrações de rede automáticas
  useEffect(() => {
    setVisibleCount(24);
    setMinPriceInput('');
    setMaxPriceInput('');
    setStrategyFilters(prev => ({
      ...prev,
      superCheap: false,
      lowestRent: false,
      lowestRentSqm: false,
      bestRentDiscount: false,
      under250k: false,
      highSpread: false
    }));
  }, [advancedContextTab]);

  // Infinite scroll listener + Monitoramento para o botão Voltar ao Topo
  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setShowScrollTop(scrollY > 350);

      if (window.innerHeight + scrollY >= document.documentElement.offsetHeight - 150) {
        setVisibleCount(prev => Math.min(prev + 12, filteredAndSortedAuctions.length));
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredAndSortedAuctions.length]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Clear all filters handler
  const handleClearAllFilters = () => {
    setSelectedNeighborhoodFilter('');
    setSelectedNeighborhoods([]);
    setSelectedCityFilter('');
    setCitySearchInput('');
    setSelectedStateFilter('');
    setSelectedTypeFilter('');
    setAdvancedSearchQuery('');
    setBedroomsFilter(null);
    setParkingFilter(null);
    setBathroomsFilter(null);
    setMinAreaInput('');
    setMaxAreaInput('');
    setMinDiscountFilter(0);
    setMinPriceInput('');
    setMaxPriceInput('');
    if (setMaxPriceFilter) setMaxPriceFilter('');
    setPaymentFilter('');
    setMinRoiFilter(0);
    setOnlyHighReturn(false);
    setOnlyAnalysisAboveEdital(false);
    setItbiConfidenceFilter('all');
    setPrestigeFilter('all');
    setCapitalBudget('');
    setOnlyFinancing(false);
    setOnlyInstallments(false);
    setOnlyVacant(false);
    setTemporalSortMode('neutral');
    setStrategyFilters({
      liquidity: false,
      roi: false,
      profit: false,
      spread: false,
      discount: false,
      lowestSqm: false,
      under250k: false,
      superCheap: false,
      lowestRent: false,
      lowestRentSqm: false,
      bestRentDiscount: false,
    });
    setSelectedAuctioneerFilter('');
  };

  // Save search handler
  const handleSaveSearch = () => {
    const searchConfig = {
      state: selectedStateFilter,
      city: selectedCityFilter,
      neighborhoods: selectedNeighborhoods,
      type: selectedTypeFilter,
      minPrice: minPriceInput,
      maxPrice: maxPriceInput,
      roi: minRoiFilter,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('saved_search_config', JSON.stringify(searchConfig));
    setSaveToastVisible(true);
    setTimeout(() => setSaveToastVisible(false), 3000);
  };

  // Auto portal data lookup
  const refreshCardPortalData = useCallback(async (auc: AuctionProperty) => {
    if (portalSearchIds.has(auc.id)) return;
    if ((auc as any).moradaM2 || (auc as any).moradaVirtualM2 || auc.origin === 'portal') return;
    setPortalSearchIds(prev => new Set(prev).add(auc.id));
    try {
      const response = await fetch('/api/portais/search-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: auc.state || 'RJ',
          city: auc.city || 'Rio de Janeiro',
          neighborhood: auc.neighborhood,
          street: (auc.address || '').split(',')[0].trim(),
          propertyType: auc.propertyType,
          sizeSqm: auc.sizeSqm,
          bedrooms: auc.bedrooms,
          parkingSpaces: auc.parkingSpaces
        })
      });
      const data = await response.json();
      if (!response.ok) return;

      const matches = [
        ...(data.below?.matches || []),
        ...(data.close?.matches || []),
        ...(data.above?.matches || [])
      ];
      const unique = Array.from(new Map(matches.map((item: any) => [item.link, item])).values()) as any[];
      const valid = unique.filter(item => Number(item.unitValueSqm) >= 800 && Number(item.unitValueSqm) <= 75000 && Number(item.price) > 0);
      if (!data.verified || valid.length === 0) return;

      const averagePrice = (items: any[]) => items.length
        ? Math.round(items.reduce((sum, item) => sum + Number(item.price), 0) / items.length)
        : undefined;
      const zap = valid.filter(item => /zapimoveis/i.test(item.link || ''));
      const quinto = valid.filter(item => /quintoandar/i.test(item.link || ''));

      await onUpdateProperty({
        id: auc.id,
        streetPortalAvgSqm: Math.round(valid.reduce((sum, item) => sum + Number(item.unitValueSqm), 0) / valid.length),
        portalZapAvg: averagePrice(zap),
        portalQuintoAndarAvg: averagePrice(quinto),
        portalSampleCount: valid.length,
        portalDataVerifiedAt: data.checkedAt || new Date().toISOString(),
        portalDataSource: 'Anúncios individuais ativos na via'
      });
    } catch (e) {
      // Silent error handling for background enrichment
    } finally {
      setPortalSearchIds(prev => {
        const next = new Set(prev);
        next.delete(auc.id);
        return next;
      });
    }
  }, [onUpdateProperty, portalSearchIds]);

  const formatBRL = (val?: number) => {
    if (val === undefined || isNaN(val)) return 'R$ -';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const formatAuctionDate = (date?: string) => {
    if (!date) return 'Data a definir';
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('pt-BR');
  };

  const formatPublicationDateDisplay = (auc: AuctionProperty): string => {
    if (auc.textoPublicacao && auc.textoPublicacao.includes('/')) {
      return auc.textoPublicacao;
    }
    const iso = auc.dataPublicacaoIso || (auc.auctionDate ? `${auc.auctionDate}T12:00:00` : null);
    let dateFormatted = '';
    if (iso) {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        dateFormatted = `${day}/${month}/${year}`;
      }
    }

    const days = auc.diasPublicado;
    if (days !== undefined && days !== null) {
      if (days === 0) {
        return dateFormatted ? `Publicado em ${dateFormatted} (Hoje)` : 'Publicado hoje';
      } else if (days === 1) {
        return dateFormatted ? `Publicado em ${dateFormatted} (Ontem)` : 'Publicado há 1 dia';
      } else {
        return dateFormatted ? `Publicado em ${dateFormatted} (há ${days} dias)` : `Publicado há ${days} dias`;
      }
    }

    if (dateFormatted) {
      return `Publicado em ${dateFormatted}`;
    }

    return auc.textoPublicacao || 'Publicado recentemente';
  };

  const getAuctionPortalDisplayName = (auc: AuctionProperty) => {
    if (auc.origin === 'caixa' || (auc.id && auc.id.startsWith('auc-caixa-')) || (auc.auctionLink && auc.auctionLink.includes('caixa.gov.br'))) {
      return 'Imóveis Caixa';
    }
    if (auc.leiloeiro && auc.leiloeiro !== 'Desconhecido' && !auc.leiloeiro.includes('http')) {
      return auc.leiloeiro;
    }
    const link = auc.auctionLink || '';
    if (!link) return 'Oficial';
    try {
      const host = new URL(link).hostname.toLowerCase().replace(/^www\./, '');
      if (host.includes('caixa.gov.br')) return 'Imóveis Caixa';
      if (host.includes('portalzuk.com.br') || host.includes('zukerman')) return 'Portal Zuk';
      if (host.includes('biasileiloes.com.br') || host.includes('biasi')) return 'Biasi Leilões';
      if (host.includes('pestanaleiloes.com.br') || host.includes('pestana')) return 'Pestana Leilões';
      if (host.includes('megaleiloes.com.br')) return 'Mega Leilões';
      if (host.includes('leilaovip.com.br')) return 'Leilão VIP';
      if (host.includes('sold.com.br')) return 'SOLD Leilões';
      if (host.includes('frazaoleiloes.com.br')) return 'Frazão Leilões';
      if (host.includes('milanleiloes.com.br')) return 'Milan Leilões';
      if (host.includes('rodrigoschumacherleiloeiro.com.br')) return 'Schumacher Leilões';
      if (host.includes('portaldoleiloeiro.com.br')) return 'Portal do Leiloeiro';
      if (host.includes('rymerleiloes.com.br')) return 'Rymer Leilões';
      if (host.includes('depaulaonline.com.br')) return 'De Paula Leilões';
      if (host.includes('lancejudicial.com.br')) return 'Lance Judicial';
      if (host.includes('rogeriomenezes.com.br') || host.includes('rogeriomenezes')) return 'Rogério Menezes Leiloeiro';
      if (host.includes('superbid')) return 'Superbid Exchange';
      if (host.includes('sodresantoro')) return 'Sodré Santoro Leilões';
      const cleanName = host.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return cleanName ? `${cleanName} Leilões` : 'Oficial';
    } catch {
      return 'Oficial';
    }
  };

  const getAuctionHost = (auctionLink?: string) => {
    if (!auctionLink) return 'Oficial';
    try {
      const host = new URL(auctionLink).hostname.toLowerCase().replace(/^www\./, '');
      if (host.includes('caixa.gov.br')) return 'Imóveis Caixa';
      return host;
    } catch {
      return 'Oficial';
    }
  };

  const locationScopeText = useMemo(() => {
    if (selectedNeighborhoods.length > 0) {
      if (selectedNeighborhoods.length <= 2) {
        return `${selectedNeighborhoods.join(', ')} (${selectedCityFilter || 'RJ'})`;
      }
      return `${selectedNeighborhoods[0]}, ${selectedNeighborhoods[1]} (+${selectedNeighborhoods.length - 2} bairros em ${selectedCityFilter || 'RJ'})`;
    }
    if (selectedNeighborhoodFilter) {
      return `${selectedNeighborhoodFilter} (${selectedCityFilter || 'RJ'})`;
    }
    if (selectedCityFilter) {
      return `${selectedCityFilter} - ${selectedStateFilter || 'RJ'}`;
    }
    if (selectedStateFilter) {
      return `Estado do ${selectedStateFilter}`;
    }
    return 'todas as praças monitoradas';
  }, [selectedNeighborhoods, selectedNeighborhoodFilter, selectedCityFilter, selectedStateFilter]);

  const handleSyncNow = useCallback(() => {
    const d = new Date();
    setLastUpdatedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    if (mode === 'portais') {
      onGarimparPortais(selectedCityFilter || undefined, selectedPortals, selectedNeighborhoods, advancedContextTab === 'alugar' ? 'aluguel' : 'venda');
    } else if (selectedOriginFilter === 'judicial') {
      if (onSyncJudiciaisAuto) onSyncJudiciaisAuto();
      else if (onGarimparJudiciais) onGarimparJudiciais(selectedCityFilter || undefined);
    } else if (selectedOriginFilter === 'extrajudicial') {
      if (onSyncExtrajudiciaisAuto) onSyncExtrajudiciaisAuto();
      else if (onSyncJudiciaisAuto) onSyncJudiciaisAuto();
    } else if (selectedOriginFilter === 'caixa' || selectedOriginFilter === 'caixa_radar') {
      if (onSyncCaixaAuto) onSyncCaixaAuto();
    } else {
      if (onSyncAll) onSyncAll();
      else if (onSyncCaixaAuto) onSyncCaixaAuto();
    }
  }, [
    mode,
    selectedOriginFilter,
    onGarimparPortais,
    onSyncAll,
  onSyncCaixaAuto,
    onSyncJudiciaisAuto,
    onSyncExtrajudiciaisAuto,
    onGarimparJudiciais,
    selectedCityFilter,
    selectedPortals,
    selectedNeighborhoods,
    advancedContextTab
  ]);

  return (
    <div id="dashboard-tab" className="space-y-4">
      {/* Toast de Busca Salva */}
      <AnimatePresence>
        {saveToastVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 font-bold text-xs"
          >
            <Check className="w-4 h-4" />
            <span>Filtros e critérios salvos com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Full-Width View: Zap-Style Filter Header + Lista + Fullscreen Mapa */}
      <div className="space-y-3">
        <main className="w-full space-y-3">
          {(() => {
            const zapFilterProps = {
              mode,
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
              onOpenAdvancedFilters: () => setIsAdvancedModalOpen(true),
              matchingCount: filteredAndSortedAuctions.length,
              temporalSortMode,
              setTemporalSortMode,
              setSortBy,
              strategyFilters,
              setStrategyFilters,
              isMining,
              onSyncNow: handleSyncNow,
              viewMode,
              setViewMode,
              onResetFocusedMapProp: () => setFocusedMapPropId(null),
              showMapFactions,
              setShowMapFactions,
            };

            return (
              <>
                <ZapFilterHeader {...zapFilterProps} />

                {viewMode === 'map' && (
                  <div className={`fixed inset-0 z-50 w-screen h-screen flex flex-col animate-in fade-in duration-150 ${theme === 'light' ? 'bg-white' : 'bg-[#020617]'}`}>
                    <PropertyMap
                      theme={theme}
                      auctions={auctions}
                      itbiStats={itbiStats}
                      onUpdateProperty={onUpdateProperty}
                      initialFilteredAuctions={filteredAndSortedAuctions}
                      initialSelectedPropertyId={focusedMapPropId || hoveredPropertyId || undefined}
                      hideCloseButton
                      onClose={() => setViewMode('list')}
                      showFactionsExternal={showMapFactions}
                      onToggleFactionsExternal={() => setShowMapFactions((v) => !v)}
                      renderMapFilters={<ZapFilterHeader {...zapFilterProps} embeddedInMap />}
                      onSelectPropertyFromMap={(id) => {
                        const found = auctions.find((a) => a.id === id);
                        if (found) setSimulatingAuction(found);
                      }}
                    />
                  </div>
                )}
              </>
            );
          })()}

          <>
          {/* LISTA / GRID DE CARDS DE OPORTUNIDADES */}
          {filteredAndSortedAuctions.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-bold text-slate-200 text-base">Nenhum lote corresponde aos filtros selecionados.</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tente ajustar a faixa de preço, limpar os bairros selecionados ou selecionar outro estado/modalidade.
              </p>
              <button
                onClick={handleClearAllFilters}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpar Todos os Filtros</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredAndSortedAuctions.slice(0, visibleCount).map((auc, idx) => {
                  const isPortal = auc.origin === 'portal';
                  const costs = auctionCosts(auc);
                  let totalCost: number;
                  let lucroReal: number | undefined;
                  let roi: number | undefined;
                  const flipPrice = Number(auc.vendaBaixaPrice) || Number(auc.vendaMediaPrice) || 0;

                  if (isPortal) {
                    const precoCompra = auc.precoAnunciado || auc.auctionPrice || 0;
                    const itbi = auc.itbiCost ?? Math.round(precoCompra * 0.03);
                    const rgi = auc.notaryCost ?? Math.round(precoCompra * 0.02);
                    const reforma = auc.estimatedRepair !== undefined ? auc.estimatedRepair : Math.round(precoCompra * 0.05);
                    const dividas = (auc.pendingDebts || 0) + (auc.valorCondominio || 0) + (auc.valorIptu || 0);
                    // Custo total de aquisição fiel à Calculadora (Sem taxa de leilão, reforma a 5%)
                    totalCost = precoCompra + itbi + rgi + reforma + dividas;

                    if (auc.transactionType === 'aluguel') {
                      const rent = auc.monthlyRent || auc.precoAnunciado || auc.auctionPrice || 0;
                      const valMercado = auc.valorMercadoEstimado || auc.estimatedValue || Math.round((auc.sizeSqm || 1) * (auc.m2ReferenciaBairro || 3600));
                      const rentRef = auc.mediaLocacaoCalculadora || Math.round(valMercado * 0.0055);
                      lucroReal = Math.max(0, rentRef - rent) * 12;
                      roi = valMercado > 0 ? Number(((rent * 12 / valMercado) * 100).toFixed(2)) : 0;
                    } else {
                      // Flip House: Lucro e ROI baseados no Preço de Saída Flip (vendaBaixaPrice) da Calculadora
                      const flipExit = flipPrice > 0 ? flipPrice : (auc.vendaBaixaPrice || auc.valorMercadoEstimado || auc.estimatedValue || 0);
                      if (flipExit > 0) {
                        lucroReal = Math.round(flipExit - totalCost);
                        roi = totalCost > 0 ? Number(((lucroReal / totalCost) * 100).toFixed(2)) : 0;
                      } else if (auc.calculatedProfit !== undefined) {
                        lucroReal = Number(auc.calculatedProfit);
                        roi = auc.calculatedRoi !== undefined ? Number(auc.calculatedRoi) : (totalCost > 0 ? Number(((lucroReal / totalCost) * 100).toFixed(2)) : 0);
                      } else {
                        lucroReal = undefined;
                        roi = undefined;
                      }
                    }
                  } else {
                    totalCost = costs.bid + costs.auctioneer + costs.itbi + costs.registry + costs.repair + costs.legal + costs.iptu + costs.condo + costs.custoCarregamento;
                    lucroReal = flipPrice > 0 ? Math.round(flipPrice - totalCost) : (auc.calculatedProfit !== undefined ? Number(auc.calculatedProfit) : undefined);
                    roi = (lucroReal !== undefined && totalCost > 0) ? Number(((lucroReal / totalCost) * 100).toFixed(2)) : (auc.calculatedRoi !== undefined ? Number(auc.calculatedRoi) : undefined);
                  }

                  const isSelected = selectedAuctionId === auc.id;
                  const quality = assessDataQuality(auc);
                  const spreadSqm = calculateSpreadSqm(auc);

                  return (
                    <motion.div
                      key={auc.id}
                      layoutId={`card-${auc.id}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      onMouseEnter={() => setHoveredPropertyId(auc.id)}
                      onMouseLeave={() => setHoveredPropertyId(null)}
                      className={`auction-card bg-transparent border rounded-2xl transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-slate-500/80 ring-1 ring-slate-500/40'
                          : 'border-transparent hover:border-slate-700/60'
                      }`}
                    >
                      {/* Foto edge-to-edge ocupando exatamente toda a largura e cantos superiores do card */}
                      <div className="relative w-full aspect-[16/9] bg-slate-950 overflow-hidden rounded-t-2xl group/img">
                        <PropertyThumbnail
                          property={auc}
                          size="cover"
                          className="!w-full !h-full !rounded-none !rounded-t-2xl !border-0"
                          onClick={() => setSelectedLightboxProperty(auc)}
                        />
                        <div className="absolute top-2.5 left-3 pointer-events-none">
                          {auc.origin === 'caixa' ? (
                            <span className="inline-block bg-white/95 text-blue-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg shadow-xs backdrop-blur-xs">
                              Imóveis Caixa
                            </span>
                          ) : auc.origin === 'judicial' ? (
                            <span className="inline-block bg-white/95 text-purple-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg shadow-xs backdrop-blur-xs">
                              Leilão Judicial
                            </span>
                          ) : (
                            <span
                              className="text-[11px] font-extrabold tracking-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
                              style={{ color: '#ffffff' }}
                            >
                              {auc.origin === 'portal'
                                ? (auc.portalName || 'Portal')
                                : (auc.auctioneerName || auc.leiloeiro || 'Leilão Extrajudicial')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="px-3 pt-2 pb-3 space-y-2">
                        {/* Linha imediatamente abaixo da foto: descrição (esq) | modalidade sem hífen + Salvar (dir) */}
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className="text-xs text-slate-300 leading-snug truncate min-w-0 flex-1"
                            title={auc.areaAudit?.selected?.excerpt || 'Metragem sem confirmação na fonte'}
                          >
                            {[
                              auc.propertyType,
                              auc.sizeSqm > 0 ? `${auc.sizeApproximate ? '≈ ' : ''}${auc.sizeSqm} m²` : 'Área não confirmada',
                              auc.bedrooms ? `${auc.bedrooms} quarto${auc.bedrooms > 1 ? 's' : ''}` : '',
                              auc.parkingSpaces ? `${auc.parkingSpaces} vaga${auc.parkingSpaces > 1 ? 's' : ''}` : '',
                            ].filter(Boolean).join(', ')}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {auc.origin !== 'portal' && (() => {
                              const badge = getSaleModeBadge(auc);
                              return badge?.label ? (
                                <span className="text-[11px] italic font-semibold text-slate-200 whitespace-nowrap">
                                  {badge.label}
                                </span>
                              ) : null;
                            })()}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateProperty({ id: auc.id, saved: !auc.saved });
                              }}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                                auc.saved
                                  ? 'bg-amber-500/25 text-amber-300 border-amber-400/50'
                                  : 'bg-amber-500/10 text-amber-300/85 hover:text-amber-200 hover:bg-amber-500/20 border-amber-500/30'
                              }`}
                              title={auc.saved ? 'Remover dos salvos' : 'Salvar oportunidade no perfil'}
                            >
                              <Bookmark className={`w-4 h-4 ${auc.saved ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {auc.transactionType === 'aluguel' ? (
                          <div className="text-[11px] text-slate-300 pb-1">
                            <div className="font-bold uppercase tracking-wide text-white">
                              {auc.vereditoLocacao === 'barato'
                                ? `Aluguel Abaixo da Média (-${Math.abs(auc.aluguelDiferencaPct || 0)}%)`
                                : auc.vereditoLocacao === 'caro'
                                  ? `Aluguel Acima da Média (+${auc.aluguelDiferencaPct || 0}%)`
                                  : 'Preço Justo de Locação'}
                            </div>
                            <div className="text-slate-400 font-mono">
                              Valor estimado: <strong className="text-white">{formatBRL(auc.valorMercadoEstimado || (auc.sizeSqm * (auc.m2ReferenciaBairro || 4500)))}</strong>
                            </div>
                          </div>
                        ) : auc.origin === 'portal' && (() => {
                          const valEst = (auc.estimatedValue && auc.estimatedValue > 0) ? auc.estimatedValue : (flipPrice > 0 ? Math.round(flipPrice / 0.90) : (auc.valorMercadoEstimado || 0));
                          const preco = auc.precoAnunciado || auc.auctionPrice || 0;
                          const diff = valEst - preco;
                          const pct = (valEst > 0 && diff > 0) ? Math.round((diff / valEst) * 100) : 0;
                          return pct >= 15 || (auc.oportunidadeAbaixoMercado && pct > 0);
                        })() ? (() => {
                          const valEst = (auc.estimatedValue && auc.estimatedValue > 0) ? auc.estimatedValue : (flipPrice > 0 ? Math.round(flipPrice / 0.90) : (auc.valorMercadoEstimado || (auc.sizeSqm * (auc.m2ReferenciaBairro || 3600))));
                          const preco = auc.precoAnunciado || auc.auctionPrice || 0;
                          const diff = valEst - preco;
                          const pct = (valEst > 0 && diff > 0) ? Math.round((diff / valEst) * 100) : (auc.descontoMercadoPct || 0);
                          return (
                            <div className="text-[11px] text-slate-300 pb-1">
                              <div className="font-bold uppercase tracking-wide text-slate-200">
                                Abaixo do Valor de Mercado (-{pct}%)
                              </div>
                              <div className="text-slate-400 font-mono">
                                Valor Estimado: <strong className="text-white">{formatBRL(valEst)}</strong>
                              </div>
                            </div>
                          );
                        })() : null}

                        {/* Título e Endereço (sem ícone antes do endereço) */}
                        <div className="space-y-0.5">
                          <h3
                            className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug hover:text-slate-200 transition-colors cursor-pointer break-words"
                            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                            onClick={() => setSimulatingAuction(auc)}
                            title={auc.title}
                          >
                            {auc.title}
                          </h3>
                          <div
                            className="text-xs text-slate-400 truncate break-words"
                            style={{ overflowWrap: 'anywhere' }}
                          >
                            {(() => {
                              let addr = (auc.address || '').trim();
                              addr = addr.replace(/,\s*undefined\s*-/g, `, ${auc.city || 'Rio de Janeiro'} -`);
                              addr = addr.replace(/^(?:Rua|Avenida|Av|Travessa|Alameda|Estrada|Praça)\s*,\s*/i, '');
                              if (!addr) return `${auc.neighborhood || ''}, ${auc.city || ''} - ${auc.state || 'RJ'}`.replace(/^, /, '');
                              if (addr.includes(' - ') || (auc.city && addr.toLowerCase().includes((auc.city || '').toLowerCase()))) return addr;
                              const hasNeigh = auc.neighborhood && addr.toLowerCase().includes(auc.neighborhood.toLowerCase());
                              if (hasNeigh) return `${addr}, ${auc.city || ''} - ${auc.state || 'RJ'}`;
                              return `${addr} (${auc.neighborhood || ''} - ${auc.city || ''}/${auc.state || 'RJ'})`;
                            })()}
                          </div>
                          {(() => {
                            const divNotice = cleanDivergentNotice(auc.divergentNeighborhoodNotice);
                            if (!divNotice) return null;
                            const m = divNotice.match(/^(Bairro\s*Real\s*:\s*)([^(]+)(.*)$/i);
                            if (m) {
                              return (
                                <div className="text-[10.5px] text-slate-400 font-mono">
                                  <span>{m[1]}</span>
                                  <strong className="font-extrabold uppercase text-white">{m[2].trim()}</strong>
                                  {m[3] ? <span> {m[3].trim()}</span> : null}
                                </div>
                              );
                            }
                            return <div className="text-[10.5px] text-slate-400 font-mono">{divNotice}</div>;
                          })()}
                          {auc.origin === 'portal' ? (
                            <div className="text-[10.5px] text-slate-400 font-mono">
                              Publicação: <strong className="text-slate-200">{formatPublicationDateDisplay(auc)}</strong>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10.5px] text-slate-400 font-mono">
                              <span>Origem: <strong className="text-slate-200">{getAuctionPortalDisplayName(auc)}</strong></span>
                              <span>1ª Praça: <strong className="text-slate-200">{formatAuctionDate(auc.firstAuctionDate || auc.auctionDate)}</strong></span>
                              {auc.secondAuctionDate && (
                                <span>2ª Praça: <strong className="text-slate-200">{formatAuctionDate(auc.secondAuctionDate)}</strong></span>
                              )}
                            </div>
                          )}
                          {(auc.isCommunityRisk || auc.nearbyCommunityName) && (() => {
                            const communityName = auc.isCommunityRisk ? auc.communityName : auc.nearbyCommunityName;
                            const faction = auc.isCommunityRisk ? auc.factionName : auc.nearbyFactionName;
                            const distance = auc.isCommunityRisk ? auc.communityDistanceM : auc.nearbyCommunityDistanceM;
                            if (!communityName) return null;
                            return (
                              <div className="pt-0.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                                    auc.isCommunityRisk
                                      ? 'bg-rose-950/90 text-rose-300 border-rose-700/60'
                                      : 'bg-amber-950/70 text-amber-300 border-amber-700/50'
                                  }`}
                                >
                                  <span>{auc.isCommunityRisk ? '⛔' : '⚠️'}</span>
                                  <span>
                                    {auc.isCommunityRisk ? 'Área de risco: ' : 'Próx.: '}
                                    {communityName}
                                    {faction ? ` (${faction})` : ''}
                                    {distance === 0 ? ' (dentro)' : ` (~${distance || 0}m)`}
                                  </span>
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Grid Financeiro (sem bordas/caixas internas, cores somente em Lucro) */}
                        {auc.transactionType === 'aluguel' ? (
                          <div className="space-y-1.5 pt-1">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold">Aluguel Pedido</span>
                                <span className="text-xs font-bold text-white font-mono">
                                  {formatBRL(auc.monthlyRent || auc.precoAnunciado || auc.auctionPrice)}/mês
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold">Aluguel / m²</span>
                                <span className="text-xs font-bold text-slate-200 font-mono">
                                  {formatBRL(Math.round((auc.monthlyRent || auc.precoAnunciado || auc.auctionPrice) / (auc.sizeSqm || 1)))}/m²
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold">Média Calc.</span>
                                <span className="text-xs font-bold text-slate-200 font-mono">
                                  {formatBRL(auc.mediaLocacaoCalculadora || Math.round((auc.valorMercadoEstimado || (auc.sizeSqm * (auc.m2ReferenciaBairro || 4500))) * 0.0055))}/mês
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold">Custo Total</span>
                                <span className="text-xs font-bold text-white font-mono">
                                  {formatBRL(
                                    auc.totalRentalPackage ||
                                    ((auc.monthlyRent || auc.precoAnunciado || auc.auctionPrice || 0) +
                                     (auc.totalTaxas !== undefined ? auc.totalTaxas : ((auc.valorCondominio || 0) + (auc.valorIptu || 0) + (auc.taxasServico || 0))))
                                  )}/mês
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : auc.origin === 'portal' ? (
                          <div className="space-y-1.5 pt-1">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold">Preço Anunciado</span>
                                <span className="text-xs font-bold text-white font-mono">
                                  {formatBRL(auc.precoAnunciado || auc.auctionPrice)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold">Custo Total Est.</span>
                                <span className="text-xs font-normal text-slate-200 font-mono">
                                  {formatBRL(totalCost)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold leading-tight">
                                  {flipPrice > 0 ? 'Preço Sugerido Flip' : 'Valor Estimado'}
                                </span>
                                <span className="text-xs font-bold text-white font-mono">
                                  {formatBRL(flipPrice > 0 ? flipPrice : (auc.valorMercadoEstimado || auc.estimatedValue || 0))}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1">
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold">M² Ref. Bairro</span>
                                <span className="text-xs font-normal text-slate-200 font-mono">
                                  {(() => {
                                    const itbiStat = itbiStats?.find(s =>
                                      normalizeText(s.neighborhood) === normalizeText(auc.neighborhood) &&
                                      (!auc.propertyType || s.propertyType === auc.propertyType)
                                    ) || itbiStats?.find(s => normalizeText(s.neighborhood) === normalizeText(auc.neighborhood));
                                    const m2Val = itbiStat?.avgSqm || auc.itbiNeighborhoodAvgSqm || auc.itbiUnitValueAvg || auc.m2ReferenciaBairro || 0;
                                    return formatBRL(m2Val);
                                  })()}/m²
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold">ROI Projetado</span>
                                <span className="text-xs font-bold text-slate-200 font-mono">
                                  {roi !== undefined ? (roi > 0 ? `+${roi}%` : `${roi}%`) : 'Sob análise'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block uppercase font-bold">Lucro Estimado</span>
                                <span className={`text-xs font-bold font-mono ${
                                  lucroReal !== undefined && lucroReal > 0 ? 'text-emerald-400' :
                                  lucroReal !== undefined && lucroReal < 0 ? 'text-rose-400' : 'text-slate-400'
                                }`}>
                                  {lucroReal !== undefined
                                    ? (lucroReal > 0 ? formatBRL(lucroReal) : `Sem margem (${formatBRL(lucroReal)})`)
                                    : 'Sob análise'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[9px] text-slate-400 uppercase font-bold">Lance Mínimo</span>
                                  {auc.firstAuctionPrice && auc.secondAuctionPrice ? (
                                    <span className="text-[9px] font-bold text-slate-200">
                                      {auc.auctionPrice === auc.firstAuctionPrice ? '1º Leilão' : '2º Leilão'}
                                    </span>
                                  ) : null}
                                </div>
                                <span className="text-xs font-bold text-white font-mono block truncate">
                                  {auc.auctionPrice > 0 ? formatBRL(auc.auctionPrice) : 'Lance não confirmado'}
                                </span>
                                {auc.firstAuctionPrice && auc.secondAuctionPrice && (
                                  <span className="text-[8.5px] text-slate-500 font-mono block leading-tight">
                                    1º: {formatBRL(auc.firstAuctionPrice)} | 2º: {formatBRL(auc.secondAuctionPrice)}
                                  </span>
                                )}
                              </div>

                              <div className="relative group/cost cursor-help min-w-0">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold truncate">Custo Total Est.</span>
                                <span className="text-xs font-normal text-slate-200 font-mono block truncate">
                                  {auc.auctionPrice > 0 ? formatBRL(totalCost) : 'Sob análise'}
                                </span>
                                <span className="text-[8.5px] text-slate-500 font-mono leading-tight block">
                                  ITBI (3%) + RGI (2%) + Ref. (5%)
                                </span>
                                <div className="absolute bottom-full left-0 mb-2 w-64 p-2.5 bg-slate-950 text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover/cost:opacity-100 transition-opacity z-50 text-[10px] space-y-1">
                                  <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">Composição do Custo Total</div>
                                  <div className="flex justify-between"><span>Lance Mínimo:</span><strong>{costs.bid > 0 ? formatBRL(costs.bid) : 'Lance não confirmado'}</strong></div>
                                  {costs.auctioneer > 0 && <div className="flex justify-between"><span>Comissão Leiloeiro (5%):</span><strong>{formatBRL(costs.auctioneer)}</strong></div>}
                                  <div className="flex justify-between"><span>ITBI (3%) &amp; RGI/Cartório:</span><strong>{formatBRL(costs.itbi + costs.registry)}</strong></div>
                                  <div className="flex justify-between"><span>Reforma Est. (5%):</span><strong>{formatBRL(costs.repair)}</strong></div>
                                  {costs.legal > 0 && <div className="flex justify-between"><span>Desocupação / Custas (5%):</span><strong>{formatBRL(costs.legal)}</strong></div>}
                                  {(costs.iptu + costs.condo) > 0 && <div className="flex justify-between"><span>Dívidas IPTU / Cond.:</span><strong>{formatBRL(costs.iptu + costs.condo)}</strong></div>}
                                  {costs.custoCarregamento > 0 && <div className="flex justify-between"><span>Carregamento (1,5% Gab.):</span><strong>{formatBRL(costs.custoCarregamento)}</strong></div>}
                                  <div className="flex justify-between border-t border-slate-800 pt-1 font-bold text-slate-100"><span>Custo Total Est.:</span><strong>{formatBRL(totalCost)}</strong></div>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold truncate">Lucro Real Est.</span>
                                <span className={`text-xs font-bold font-mono block truncate ${
                                  lucroReal !== undefined && lucroReal > 0 ? 'text-emerald-400' :
                                  lucroReal !== undefined && lucroReal < 0 ? 'text-rose-400' : 'text-slate-400'
                                }`}>
                                  {lucroReal !== undefined
                                    ? (lucroReal > 0 ? formatBRL(lucroReal) : `Sem margem (${formatBRL(lucroReal)})`)
                                    : 'Sob análise'}
                                </span>
                                {spreadSqm > 0 && (
                                  <span className="text-[8.5px] font-mono text-slate-500 block leading-tight">
                                    Spread: {formatBRL(spreadSqm)}/m²
                                  </span>
                                )}
                              </div>

                              <div className="relative group/itbi cursor-help min-w-0">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold truncate">Gabarito ITBI</span>
                                <span className="text-xs font-bold text-slate-200 font-mono block truncate">
                                  {auc.estimatedValue ? formatBRL(auc.estimatedValue) : 'Sem amostras'}
                                </span>
                                {auc.isAreaHomogeneizada && (
                                  <span className="text-[8.5px] font-mono text-slate-500 block leading-tight">
                                    Escala NBR: {auc.fatorEscala ? auc.fatorEscala.toFixed(3) : '1.000'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              <div className="min-w-0">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold truncate">Avaliação Edital</span>
                                <span className="text-xs font-normal text-slate-200 font-mono block truncate">
                                  {auc.evaluationPrice ? formatBRL(auc.evaluationPrice) : '-'}
                                </span>
                              </div>

                              <div className="min-w-0">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold truncate">ROI Projetado</span>
                                <span className="text-xs font-bold text-slate-200 font-mono block truncate">
                                  {roi !== undefined ? (roi > 0 ? `+${roi}%` : `${roi}%`) : 'Sob análise'}
                                </span>
                              </div>

                              {(() => {
                                const streetCount = Math.max(0, Number(auc.itbiStreetCount) || 0);
                                const hasStreetData = streetCount > 0;
                                const isCalibratedBadge = quality.badgeLabel.includes('Calibrado') || Boolean(auc.valuationCalibration);
                                const effectiveCeiling = !hasStreetData ? 0 : (isCalibratedBadge ? ((Number(auc.itbiSurroundingCount) || 0) < 5 ? 3.0 : 5.0) : quality.liquidityCeiling);
                                const finalLiquidity = !hasStreetData ? 0 : Math.min(auc.liquidityScore ?? 0, effectiveCeiling);
                                return (
                                  <div className="min-w-0">
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold truncate">Liquidez</span>
                                    <span className="text-xs font-bold text-slate-200 font-mono block">{finalLiquidity}/10</span>
                                  </div>
                                );
                              })()}

                              <div className="min-w-0">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold leading-tight">
                                  {flipPrice > 0 ? 'Preço Sugerido Flip' : 'Valor Estimado'}
                                </span>
                                <span className="text-xs font-bold text-white font-mono block truncate">
                                  {formatBRL(flipPrice > 0 ? flipPrice : (auc.valorMercadoEstimado || auc.estimatedValue || 0))}
                                </span>
                                {(() => {
                                  const preco = auc.auctionPrice || 0;
                                  const valEst = flipPrice > 0 ? flipPrice : (auc.valorMercadoEstimado || auc.estimatedValue || 0);
                                  const diffPct = (valEst > 0 && preco > 0) ? Math.round(((valEst - preco) / valEst) * 100) : 0;
                                  if (diffPct > 0) return <span className="text-[8.5px] font-mono text-slate-500 block leading-tight">Deságio Flip: -{diffPct}%</span>;
                                  if (diffPct < 0) return <span className="text-[8.5px] font-mono text-slate-500 block leading-tight">Acima do Flip: +{Math.abs(diffPct)}%</span>;
                                  return null;
                                })()}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Linha única: Ocupado / Financiamento à esquerda e Acessar Leilão + Ver no Mapa à direita */}
                        <div className="pt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                            {auc.origin !== 'portal' && (
                              <>
                                <span>{auc.occupied ? 'Ocupado' : 'Desocupado'}</span>
                                {auc.allowsFinancing && <span>✓ Financiamento</span>}
                                {auc.allowsInstallments && <span>✓ Parcelamento</span>}
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {auc.auctionLink && (
                              <a
                                href={auc.auctionLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="btn-light-outline text-[11px] bg-transparent hover:bg-slate-800/40 text-slate-200 px-3 py-1 rounded-full font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                {auc.transactionType === 'aluguel' ? 'Ver Anúncio' : auc.origin === 'portal' ? 'Ver Anúncio' : 'Acessar Leilão'}
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFocusedMapPropId(auc.id);
                                setViewMode('map');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-full font-bold cursor-pointer transition-colors shrink-0"
                              title="Localizar imóvel no Mapa Georreferenciado"
                            >
                              Ver no Mapa
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Footer compacto altura botão Contatar Zap Imóveis (h-9 / py-2 text-xs) */}
                      <div className="px-3 pb-3 pt-0.5">
                        <button
                          onClick={() => setSimulatingAuction(auc)}
                          className={`btn-solid-white w-full h-9 px-4 text-white font-bold text-xs rounded-full transition-all border border-transparent shadow-sm flex items-center justify-center cursor-pointer active:scale-[0.99] ${
                            auc.transactionType === 'aluguel'
                              ? 'bg-emerald-600 hover:bg-emerald-500'
                              : auc.origin === 'portal'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500'
                                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'
                          }`}
                        >
                          <span>
                            {auc.transactionType === 'aluguel' ? 'Simular Locação' : auc.origin === 'portal' ? 'Simular Flip' : 'Simular Viabilidade'}
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

            </>
        </main>
      </div>

      {/* Lightbox Modal Gallery */}
      {selectedLightboxProperty && (
        <LightboxModal
          property={selectedLightboxProperty}
          onClose={() => setSelectedLightboxProperty(null)}
          onSimulate={(prop) => setSimulatingAuction(prop)}
        />
      )}

      {/* Drawer do Simulador de Viabilidade e Calculadora RealValueCalculator */}
      <AnimatePresence>
        {simulatingAuction && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSimulatingAuction(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-screen max-w-[96vw] lg:max-w-[94vw] xl:max-w-[90vw] bg-slate-900 border-l border-slate-800 shadow-2xl h-full overflow-y-auto z-10 p-4 sm:p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    {(() => {
                      const realNeighborhood = simulatingAuction.officialNeighborhood || 
                        (simulatingAuction as any).bairroReal || 
                        (simulatingAuction.divergentNeighborhoodNotice ? cleanDivergentNotice(simulatingAuction.divergentNeighborhoodNotice)?.match(/Bairro Real:\s*([^(]+)/i)?.[1]?.trim() : undefined) || 
                        simulatingAuction.neighborhood;

                      return (
                        <>
                          <h3 className="font-bold text-white text-base">
                            Simulação de Viabilidade & Jurídico
                          </h3>
                          <p className="text-xs text-slate-400">
                            {simulatingAuction.title} • {realNeighborhood}, {simulatingAuction.city} - {simulatingAuction.state}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => setSimulatingAuction(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <RealValueCalculator
                key={simulatingAuction.id}
                itbiStats={itbiStats}
                prefillData={(() => {
                  const realNeighborhood = simulatingAuction.officialNeighborhood || 
                    (simulatingAuction as any).bairroReal || 
                    (simulatingAuction.divergentNeighborhoodNotice ? cleanDivergentNotice(simulatingAuction.divergentNeighborhoodNotice)?.match(/Bairro Real:\s*([^(]+)/i)?.[1]?.trim() : undefined) || 
                    simulatingAuction.neighborhood;

                  return {
                    ...simulatingAuction,
                    id: simulatingAuction.id,
                    title: simulatingAuction.title,
                    description: simulatingAuction.description,
                    auctionLink: simulatingAuction.auctionLink,
                    state: simulatingAuction.state || selectedStateFilter || 'RJ',
                    city: simulatingAuction.city,
                    neighborhood: realNeighborhood,
                    officialNeighborhood: realNeighborhood,
                    bairroReal: realNeighborhood,
                    originalListedNeighborhood: simulatingAuction.originalListedNeighborhood || simulatingAuction.neighborhood,
                    divergentNeighborhoodNotice: simulatingAuction.divergentNeighborhoodNotice,
                    address: simulatingAuction.address,
                  matriculaText: simulatingAuction.matriculaText,
                  propertyType: simulatingAuction.propertyType,
                  sizeSqm: simulatingAuction.sizeSqm,
                  bedrooms: (simulatingAuction as any).bedrooms,
                  parkingSpaces: (simulatingAuction as any).parkingSpaces,
                  purchasePrice: simulatingAuction.auctionPrice,
                  evaluationPrice: (simulatingAuction as any).evaluationPrice,
                  estimatedValue: simulatingAuction.estimatedValue,
                  acquisitionRule: simulatingAuction.origin === 'caixa' || (simulatingAuction.id && simulatingAuction.id.includes('caixa')) ? 'caixa' : 'leilao',
                  estimatedRepair: Math.round(simulatingAuction.auctionPrice * 0.05),
                  pendingDebts: (simulatingAuction as any).pendingCondoCost || Math.round(((simulatingAuction as any).evaluationPrice || 0) * 0.10),
                  otherCosts: (simulatingAuction.itbiTax || 0) + (simulatingAuction.registryCost || 0) + (simulatingAuction.condoDebts || 0),
                  itbiUnitValueAvg: simulatingAuction.itbiUnitValueAvg,
                  portalZapAvg: simulatingAuction.portalZapAvg,
                  portalQuintoAndarAvg: simulatingAuction.portalQuintoAndarAvg,
                  vendaBaixaPrice: simulatingAuction.vendaBaixaPrice,
                  vendaMediaPrice: simulatingAuction.vendaMediaPrice,
                  valuationConfidence: simulatingAuction.valuationConfidence,
                  valuationBasis: simulatingAuction.valuationBasis,
                  valuationSampleCount: simulatingAuction.valuationSampleCount,
                  valuationRadiusKm: simulatingAuction.valuationRadiusKm,
                  portalDataVerifiedAt: simulatingAuction.portalDataVerifiedAt,
                  portalSampleCount: simulatingAuction.portalSampleCount,
                  portalDataSource: simulatingAuction.portalDataSource,
                  streetPortalAvgSqm: simulatingAuction.streetPortalAvgSqm,
                  isCommunityRisk: simulatingAuction.isCommunityRisk,
                  communityName: simulatingAuction.communityName,
                  communityDistanceM: simulatingAuction.communityDistanceM,
                  ageDepreciationPct: simulatingAuction.ageDepreciationPct,
                  buildingAge: (simulatingAuction as any).buildingAge,
                };
              })()}
                onUpdateProperty={async (updates) => {
                  await onUpdateProperty({ id: simulatingAuction.id, ...updates });
                  setSimulatingAuction(prev => prev ? { ...prev, ...updates } : null);
                  try {
                    fetch(`/api/auctions/${simulatingAuction.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updates)
                    }).catch(() => {});
                  } catch (e) {}
                }}
                onValuationComplete={(lotId, result) => {
                  void onUpdateProperty({ id: lotId, ...result });
                  setSimulatingAuction(prev => (prev && prev.id === lotId) ? { ...prev, ...result } : prev);
                }}
                onClose={() => setSimulatingAuction(null)}
              />
            </motion.div>
          </div>
        )}

        {/* MODAL: FILTROS AVANÇADOS (ESTILO QUINTOANDAR) */}
        <AdvancedFiltersModal
          isOpen={isAdvancedModalOpen}
          onClose={() => setIsAdvancedModalOpen(false)}
          mode={mode}
          contextTab={advancedContextTab}
          setContextTab={setAdvancedContextTab}
          searchQuery={advancedSearchQuery}
          setSearchQuery={setAdvancedSearchQuery}
          selectedType={selectedTypeFilter}
          setSelectedType={setSelectedTypeFilter}
          bedrooms={bedroomsFilter}
          setBedrooms={setBedroomsFilter}
          parkingSpaces={parkingFilter}
          setParkingSpaces={setParkingFilter}
          bathrooms={bathroomsFilter}
          setBathrooms={setBathroomsFilter}
          minPrice={minPriceInput}
          setMinPrice={setMinPriceInput}
          maxPrice={maxPriceInput}
          setMaxPrice={setMaxPriceInput}
          minArea={minAreaInput}
          setMinArea={setMinAreaInput}
          maxArea={maxAreaInput}
          setMaxArea={setMaxAreaInput}
          minDiscount={minDiscountFilter}
          setMinDiscount={setMinDiscountFilter}
          onlyHighReturn={onlyHighReturn}
          setOnlyHighReturn={setOnlyHighReturn}
          minRoi={minRoiFilter}
          setMinRoi={setMinRoiFilter}
          onlyAnalysisAboveEdital={onlyAnalysisAboveEdital}
          setOnlyAnalysisAboveEdital={setOnlyAnalysisAboveEdital}
          itbiConfidence={itbiConfidenceFilter}
          setItbiConfidence={setItbiConfidenceFilter}
          prestigeFilter={prestigeFilter}
          setPrestigeFilter={setPrestigeFilter}
          capitalBudget={capitalBudget}
          setCapitalBudget={setCapitalBudget}
          onlyFinancing={onlyFinancing}
          setOnlyFinancing={setOnlyFinancing}
          onlyInstallments={onlyInstallments}
          setOnlyInstallments={setOnlyInstallments}
          onlyVacant={onlyVacant}
          setOnlyVacant={setOnlyVacant}
          matchingCount={filteredAndSortedAuctions.length}
          onResetFilters={handleClearAdvancedFilters}
        />

        {/* MODAL: GERENCIADOR DE PRESETS DE BUSCA */}
        <AnimatePresence>
          {isPresetModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    <h3 className="font-extrabold text-white text-sm">Presets de Busca Salvos</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPresetModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                  {/* Salvar busca atual */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Salvar Configuração Atual
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Ex: Minha busca em ${selectedCityFilter || 'RJ'}`}
                        value={presetNameInput}
                        onChange={e => setPresetNameInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveCurrentPreset();
                        }}
                        className="flex-1 text-xs border border-slate-700 rounded-xl px-3 py-2 bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCurrentPreset()}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Salvar</span>
                      </button>
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-mono">
                      Filtros atuais: {selectedCityFilter || 'Todas Cidades'}, {selectedNeighborhoods.length > 0 ? `${selectedNeighborhoods.length} bairros` : 'todos bairros'}, {selectedTypeFilter || 'todos tipos'}.
                    </div>
                  </div>

                  {/* Lista de presets salvos */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Buscas Salvas ({savedPresets.length})
                    </div>

                    {savedPresets.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                        Nenhuma busca salva ainda. Digite um nome acima para salvar sua primeira busca.
                      </div>
                    ) : (
                      savedPresets.map(preset => (
                        <div
                          key={preset.id}
                          className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-200 truncate">{preset.name}</div>
                            <div className="text-[10.5px] text-slate-400 truncate mt-0.5 font-mono">
                              {preset.city ? `${preset.city} (${preset.state || 'RJ'})` : 'Todas cidades'}
                              {preset.neighborhoods && preset.neighborhoods.length > 0 ? ` • ${preset.neighborhoods.slice(0, 2).join(', ')}${preset.neighborhoods.length > 2 ? ` (+${preset.neighborhoods.length - 2})` : ''}` : ''}
                              {preset.type ? ` • ${preset.type}` : ''}
                              {preset.roi ? ` • ROI ≥${preset.roi}%` : ''}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleLoadPreset(preset)}
                              className="px-2.5 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Carregar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePreset(preset.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Excluir busca salva"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>

      {/* Botão Flutuante Voltar ao Topo */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            transition={{ duration: 0.2 }}
            type="button"
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 p-3 sm:p-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl shadow-emerald-950/80 border border-emerald-400/40 cursor-pointer flex items-center justify-center group backdrop-blur-md transition-all hover:scale-110 active:scale-95 ring-2 ring-emerald-400/20"
            aria-label="Voltar ao início da página"
            title="Voltar ao topo da página"
          >
            <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-y-1" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
