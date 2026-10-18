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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RealValueCalculator from './RealValueCalculator.tsx';
import PropertyMap from './PropertyMap.tsx';
import SidebarMapWidget from './SidebarMapWidget.tsx';
import PropertyThumbnail from './PropertyThumbnail.tsx';
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
  onSyncCaixaAuto?: () => void;
  onSyncExtrajudiciaisAuto?: () => void;
  onSyncJudiciaisAuto?: () => void;
  itbiStats?: any[];
  onClearAll?: () => void;
  onOpenCapitalMatcher?: () => void;
}

export default function Dashboard({
  mode = 'auctions',
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
  onSyncCaixaAuto,
  onSyncExtrajudiciaisAuto,
  onSyncJudiciaisAuto,
  itbiStats = [],
  onClearAll,
  onOpenCapitalMatcher
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
  const [isPortalsOpen, setIsPortalsOpen] = useState(false);

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
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [selectedLightboxProperty, setSelectedLightboxProperty] = useState<AuctionProperty | null>(null);
  const [simulatingAuction, setSimulatingAuction] = useState<AuctionProperty | null>(null);
  const [selectedMapProperty, setSelectedMapProperty] = useState<AuctionProperty | null>(null);
  const [isGeneralMapModalOpen, setIsGeneralMapModalOpen] = useState(false);
  const [selectedAuctioneerFilter, setSelectedAuctioneerFilter] = useState<string>('');
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [visibleCount, setVisibleCount] = useState(16);

  // Dynamic Extrajudicial Auctioneers derivation
  const activeExtrajudicialAuctioneers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of auctions) {
      if (a.origin === 'extrajudicial' || (!a.id?.startsWith('auc-caixa') && a.origin !== 'caixa')) {
        let name = a.auctioneerName || a.leiloeiro;
        if (!name && a.auctionLink) {
          const lk = a.auctionLink.toLowerCase();
          if (lk.includes('portalzuk')) name = 'Portal Zuk';
          else if (lk.includes('megaleiloes')) name = 'Mega Leilões';
          else if (lk.includes('biasileiloes')) name = 'Biasi Leilões';
          else if (lk.includes('frazaoleiloes') || lk.includes('frazao')) name = 'Frazão Leilões';
          else if (lk.includes('santanderimoveis') || lk.includes('santander')) name = 'Santander Imóveis';
          else if (lk.includes('isaiasleiloes')) name = 'Isaías Leilões';
          else if (lk.includes('silasleiloeiro') || lk.includes('silas')) name = 'Silas Leiloeiro';
          else if (lk.includes('portellaleiloes')) name = 'Portella Leilões';
          else if (lk.includes('rioleiloes')) name = 'Rio Leilões';
          else if (lk.includes('alexandroleiloeiro')) name = 'Alexandro Leiloeiro';
          else if (lk.includes('paulobotelholeiloeiro')) name = 'Paulo Botelho Leiloeiro';
          else if (lk.includes('jvleiloes')) name = 'JV Leilões';
          else if (lk.includes('depaulaonline') || lk.includes('depaula')) name = 'De Paula Leilões';
          else if (lk.includes('rymerleiloes')) name = 'Rymer Leilões';
          else if (lk.includes('fabianoayupp')) name = 'Fabiano Ayupp';
          else if (lk.includes('saraivaleiloes')) name = 'Saraiva Leilões';
          else if (lk.includes('sold.com.br')) name = 'Sold Leilões';
          else if (lk.includes('schulmannleiloes')) name = 'Schulmann Leilões';
          else if (lk.includes('comprei.pgfn')) name = 'Comprei PGFN';
          else if (lk.includes('pestanaleiloes')) name = 'Pestana Leilões';
          else if (lk.includes('onildobastos')) name = 'Onildo Bastos';
          else if (lk.includes('gustavoleiloeiro')) name = 'Gustavo Leiloeiro';
          else if (lk.includes('mgl.com.br')) name = 'MGL Leilões';
          else if (lk.includes('leiloei.com')) name = 'Leiloei';
          else if (lk.includes('seuimovelbb')) name = 'Seu Imóvel BB';
          else if (lk.includes('emgeaimoveis')) name = 'EMGEA Imóveis';
          else if (lk.includes('vitrinebradesco')) name = 'Vitrine Bradesco';
          else if (lk.includes('ricartleiloes')) name = 'Ricart Leilões';
          else if (lk.includes('pamelaleiloeira')) name = 'Pamela Leiloeira';
          else if (lk.includes('facanhaleiloes')) name = 'Façanha Leilões';
          else if (lk.includes('leilaoimovel')) name = 'Leilão Imóvel';
        }
        if (name && name !== 'Caixa Econômica Federal' && name !== 'Caixa') {
          counts.set(name, (counts.get(name) || 0) + 1);
        }
      }
    }
    const list = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    const defaults = ['Portal Zuk', 'Mega Leilões', 'Biasi Leilões', 'Frazão Leilões', 'Santander Imóveis', 'Isaías Leilões', 'Silas Leiloeiro', 'Portella Leilões', 'Rio Leilões', 'Alexandro Leiloeiro', 'Paulo Botelho Leiloeiro', 'JV Leilões', 'De Paula Leilões', 'Rymer Leilões', 'Fabiano Ayupp', 'Saraiva Leilões', 'Sold Leilões', 'Schulmann Leilões', 'Comprei PGFN', 'Pestana Leilões', 'Onildo Bastos', 'Gustavo Leiloeiro', 'MGL Leilões', 'Leiloei', 'Seu Imóvel BB', 'EMGEA Imóveis', 'Vitrine Bradesco', 'Ricart Leilões', 'Pamela Leiloeira', 'Façanha Leilões', 'Leilão Imóvel'];
    for (const d of defaults) {
      if (!counts.has(d)) {
        list.push({ name: d, count: 0 });
      }
    }
    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [auctions]);

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
      const aucName = (a.auctioneerName || a.leiloeiro || '').toLowerCase();
      const aucLink = (a.auctionLink || '').toLowerCase();
      const aucId = (a.id || '').toLowerCase();
      
      const matches = aucName.includes(q) || 
                      (qClean.length > 3 && (aucLink.includes(qClean) || aucId.includes(qClean)));
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

    const map = new Map<string, number>();
    list.forEach(a => {
      if (!a.neighborhood) return;
      const formatted = a.neighborhood.trim().split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
      map.set(formatted, (map.get(formatted) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [auctions, checkOriginMatch, advancedContextTab, selectedStateFilter, selectedCityFilter]);

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
          className: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-xs'
        };
      }
      if (modality === 'VENDA_ONLINE') {
        return {
          label: 'Venda Online',
          type: 'venda_online',
          icon: '⏱️',
          className: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-xs'
        };
      }
      if (modality === 'LICITACAO_ABERTA') {
        return {
          label: 'Licitação Aberta',
          type: 'licitacao_aberta',
          icon: '📢',
          className: 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-xs'
        };
      }
      if (modality === 'LEILAO_SFI') {
        return {
          label: 'Leilão SFI Online',
          type: 'leilao_sfi',
          icon: '⚖️',
          className: 'bg-indigo-950/90 text-indigo-300 border-indigo-500/60 shadow-xs'
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
        className: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-xs'
      };
    }

    if (modeLower.includes('venda online')) {
      return {
        label: 'Venda Online',
        type: 'venda_online',
        icon: '⏱️',
        className: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-xs'
      };
    }
    
    if (modeLower.includes('licita') || modeLower.includes('licitação')) {
      return {
        label: 'Licitação Aberta',
        type: 'licitacao_aberta',
        icon: '📢',
        className: 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-xs'
      };
    }

    if (modeLower.includes('sfi') || modeLower.includes('edital único')) {
      return {
        label: 'Leilão SFI Online',
        type: 'leilao_sfi',
        icon: '⚖️',
        className: 'bg-indigo-950/90 text-indigo-300 border-indigo-500/60 shadow-xs'
      };
    }

    if (auc.origin === 'judicial') {
      return {
        label: 'Leilão Judicial Online',
        type: 'judicial_online',
        icon: '⚖️',
        className: 'bg-purple-950/90 text-purple-300 border-purple-500/60 shadow-xs'
      };
    }

    return {
      label: mode || 'Leilão Online',
      type: 'leilao_online',
      icon: '🌐',
      className: 'bg-blue-950/90 text-blue-300 border-blue-500/60 shadow-xs'
    };
  }, []);

  // Filter & Sort listing
  const filteredAndSortedAuctions = useMemo(() => {
    let result = auctions.filter(checkOriginMatch);

    // Expurgar lotes encerrados/arrematados ou com datas de leilão já transcorridas
    const nowIso = new Date().toISOString();
    const todayEnd = Date.parse(nowIso.slice(0, 10) + 'T23:59:59-03:00');
    result = result.filter(a => {
      // Imóveis de Portais (Flip House) são anúncios ativos e NÃO devem ser expurgados por data de leilão
      if (a.origin === 'portal') return true;

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
      const normSelected = selectedNeighborhoods.map(normalizeText);
      result = result.filter(a => normSelected.includes(normalizeText(a.neighborhood || '')));
    } else if (selectedNeighborhoodFilter) {
      const normSingle = normalizeText(selectedNeighborhoodFilter);
      result = result.filter(a => normalizeText(a.neighborhood || '') === normSingle);
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
          const saveA = (a.mediaLocacaoCalculadora || 0) - (a.monthlyRent || a.aluguelMensal || a.auctionPrice || 0);
          const saveB = (b.mediaLocacaoCalculadora || 0) - (b.monthlyRent || b.aluguelMensal || b.auctionPrice || 0);
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

  // Infinite scroll listener
  useEffect(() => {
    function handleScroll() {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 150) {
        setVisibleCount(prev => Math.min(prev + 12, filteredAndSortedAuctions.length));
      }
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredAndSortedAuctions.length]);

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
      const valid = unique.filter(item => Number(item.unitValueSqm) > 0 && Number(item.price) > 0);
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
    } else if (onSyncCaixaAuto) {
      onSyncCaixaAuto();
    } else if (onSyncJudiciaisAuto) {
      onSyncJudiciaisAuto();
    }
  }, [mode, onGarimparPortais, onSyncCaixaAuto, onSyncJudiciaisAuto, selectedCityFilter, selectedPortals, selectedNeighborhoods, advancedContextTab]);

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

      {/* Main Split View Layout: Sidebar (25-30%) + Feed (70-75%) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* ============================================================== */}
        {/* LEFT SIDEBAR: FILTROS E CONTROLES (Sticky 28% width) */}
        {/* ============================================================== */}
        <aside className="w-full lg:w-80 xl:w-88 shrink-0 space-y-4 lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 pb-10 scrollbar-thin scrollbar-thumb-slate-800">
          
          <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-5">
            
            {/* Header com Título e Limpar Filtros */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-indigo-400" />
                <h2 className="font-extrabold text-white text-sm tracking-tight">
                  Filtros de Oportunidades
                </h2>
              </div>
              <button
                onClick={handleClearAllFilters}
                className="text-[11px] font-bold text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1"
                title="Redefinir todos os filtros para o padrão"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            </div>

            {/* WIDGET DE MAPA GEORREFERENCIADO (LOGO ACIMA DOS FILTROS) */}
            <SidebarMapWidget
              auctions={filteredAndSortedAuctions}
              selectedCity={selectedCityFilter}
              selectedState={selectedStateFilter}
              onOpenFullMap={() => setIsGeneralMapModalOpen(true)}
              onSelectProperty={(property) => {
                setSimulatingAuction(property);
              }}
            />

            {/* BOTÃO DESTACADO: FILTROS AVANÇADOS (ESTILO QUINTOANDAR - LOGO ABAIXO DO MAPA) */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setIsAdvancedModalOpen(true)}
                className="w-full py-3 px-3.5 bg-gradient-to-r from-slate-800 via-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 text-white font-extrabold text-xs rounded-2xl border border-slate-700/80 shadow-lg transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <span>⚙️ Filtros Avançados</span>
                </div>
                {activeAdvancedFiltersCount > 0 ? (
                  <span className="text-[10.5px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded-full font-mono shadow-xs border border-indigo-400/40">
                    {activeAdvancedFiltersCount} {activeAdvancedFiltersCount === 1 ? 'ativo' : 'ativos'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors flex items-center gap-1 font-mono">
                    <span>Configurar</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </button>
            </div>

            {/* 1. SELETOR DE MODALIDADE (GARIMPAR LEILÕES) OU BANNER + PORTAIS (FLIP HOUSE) */}
            {mode === 'portais' ? (
              <div className="space-y-3">
                {/* Seletor de Finalidade: Comprar vs Alugar */}
                <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                      Finalidade da Busca:
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">
                      {advancedContextTab === 'alugar' ? 'Locação Residencial' : 'Venda / Flip'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAdvancedContextTab('comprar');
                        setVisibleCount(24);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        advancedContextTab !== 'alugar'
                          ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-400/30'
                          : 'text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                    >
                      <span>🏢 Comprar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdvancedContextTab('alugar');
                        setSelectedOriginFilter('portal');
                        setVisibleCount(24);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        advancedContextTab === 'alugar'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs ring-1 ring-emerald-400/30'
                          : 'text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                    >
                      <span>🔑 Alugar</span>
                    </button>
                  </div>
                </div>

                {/* Banner Flip House / Locação */}
                <div className={`p-3 bg-gradient-to-br border rounded-2xl space-y-2.5 shadow-lg ${
                  advancedContextTab === 'alugar'
                    ? 'from-emerald-950/70 via-slate-900 to-teal-950/40 border-emerald-600/50'
                    : 'from-amber-950/70 via-slate-900 to-orange-950/40 border-amber-600/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{advancedContextTab === 'alugar' ? '🔑' : '🔥'}</span>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wide text-white">
                          {advancedContextTab === 'alugar' ? 'Locação & Moradia' : 'Flip House'}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          {advancedContextTab === 'alugar' ? 'Imóveis para alugar e morar via app' : 'Venda Particular abaixo do mercado'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                      advancedContextTab === 'alugar'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {filteredAndSortedAuctions.length} ofertas
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-tight">
                    {advancedContextTab === 'alugar'
                      ? 'Comparação direta entre o aluguel pedido e a média calculada da região (~0,55% a.m.), indicando se o valor está Barato, Justo ou Caro.'
                      : 'Varredura de anúncios de venda direta nos 4 portais oficiais (Zap Imóveis, Viva Real, QuintoAndar e Imovelweb) com desconto real sobre a média do bairro.'}
                  </p>

                  <button
                    type="button"
                    onClick={() => onGarimparPortais(selectedCityFilter || undefined, selectedPortals, selectedNeighborhoods, advancedContextTab === 'alugar' ? 'aluguel' : 'venda')}
                    disabled={isMining}
                    className={`w-full py-2 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                      advancedContextTab === 'alugar'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                        : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>{isMining ? 'Extraindo...' : (advancedContextTab === 'alugar' ? 'Buscar Imóveis para Alugar' : 'Buscar Ofertas com Desconto')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Bloco Colapsável: Modalidades de Leilão */}
                <button
                  type="button"
                  onClick={() => setIsModalitiesOpen(prev => !prev)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer text-xs"
                >
                  <span className="flex items-center gap-1.5 font-bold text-slate-300 uppercase tracking-wide font-mono text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Modalidades de Leilão</span>
                  </span>
                  {isModalitiesOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                
                {isModalitiesOpen && (
                  <div className="space-y-1.5 mt-1.5">
                    {[
                      { id: 'todos', label: 'Todos os Leilões', icon: Layers, desc: 'Caixa + Judiciais + Extrajudiciais', color: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300' },
                      { id: 'caixa', label: 'Imóveis Caixa', icon: Building2, desc: 'Venda Direta / Licitação / SFI', color: 'border-blue-500/50 bg-blue-950/40 text-blue-300' },
                      { id: 'judicial', label: 'Leilões Judiciais', icon: Gavel, desc: 'Varas Cíveis e Trabalhistas', color: 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300' },
                      { id: 'extrajudicial', label: 'Leilões Extrajudiciais', icon: FileText, desc: 'Alienação Fiduciária & Bancos', color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300' }
                    ].map(item => {
                      const isSelected = selectedOriginFilter === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedOriginFilter(item.id as any);
                            setSelectedNeighborhoodFilter('');
                            setSelectedNeighborhoods([]);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? `${item.color} ring-1 ring-white/30 shadow-md font-bold`
                              : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <Icon className="w-4 h-4 shrink-0" />
                            <div>
                              <div className="text-xs font-bold">{item.label}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                            </div>
                          </div>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shrink-0" />}
                        </button>
                      );
                    })}

                    {selectedOriginFilter === 'caixa' && (
                      <div className="p-2.5 bg-slate-950 border border-blue-900/40 rounded-xl space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-400 block uppercase font-mono">
                            Sub-modalidades Caixa ({caixaModalityCounts.total})
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <button
                              type="button"
                              onClick={() => setCaixaSubModes({ vendaDireta: true, vendaOnline: true, licitacao: true, leilaoSfi: true })}
                              className="text-indigo-400 hover:text-white transition-colors cursor-pointer"
                              title="Marcar todas as modalidades Caixa"
                            >
                              Todas
                            </button>
                            <span className="text-slate-600">•</span>
                            <button
                              type="button"
                              onClick={() => setCaixaSubModes({ vendaDireta: false, vendaOnline: false, licitacao: false, leilaoSfi: false })}
                              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Desmarcar todas"
                            >
                              Nenhuma
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          {/* 1. Venda Direta Online */}
                          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer text-slate-300 hover:text-white transition-colors group">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={caixaSubModes.vendaDireta}
                                onChange={e => setCaixaSubModes(prev => ({ ...prev, vendaDireta: e.target.checked }))}
                                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                              />
                              <span className="flex items-center gap-1">
                                <span>🤝</span>
                                <span className="font-semibold text-slate-200">Venda Direta Online</span>
                              </span>
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                              caixaModalityCounts.vendaDireta > 0 ? 'bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-800/40' : 'bg-black/30 text-slate-600'
                            }`}>
                              {caixaModalityCounts.vendaDireta}
                            </span>
                          </label>

                          {/* 2. Venda Online */}
                          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer text-slate-300 hover:text-white transition-colors group">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={caixaSubModes.vendaOnline}
                                onChange={e => setCaixaSubModes(prev => ({ ...prev, vendaOnline: e.target.checked }))}
                                className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                              />
                              <span className="flex items-center gap-1">
                                <span>⏱️</span>
                                <span className="font-semibold text-slate-200">Venda Online</span>
                              </span>
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                              caixaModalityCounts.vendaOnline > 0 ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/40' : 'bg-black/30 text-slate-600'
                            }`}>
                              {caixaModalityCounts.vendaOnline}
                            </span>
                          </label>

                          {/* 3. Licitação Aberta */}
                          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer text-slate-300 hover:text-white transition-colors group">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={caixaSubModes.licitacao}
                                onChange={e => setCaixaSubModes(prev => ({ ...prev, licitacao: e.target.checked }))}
                                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                              />
                              <span className="flex items-center gap-1">
                                <span>📢</span>
                                <span className="font-semibold text-slate-200">Licitação Aberta</span>
                              </span>
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                              caixaModalityCounts.licitacao > 0 ? 'bg-amber-950/80 text-amber-300 font-bold border border-amber-800/40' : 'bg-black/30 text-slate-600'
                            }`}>
                              {caixaModalityCounts.licitacao}
                            </span>
                          </label>

                          {/* 4. Leilão SFI */}
                          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer text-slate-300 hover:text-white transition-colors group">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={caixaSubModes.leilaoSfi}
                                onChange={e => setCaixaSubModes(prev => ({ ...prev, leilaoSfi: e.target.checked }))}
                                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer"
                              />
                              <span className="flex items-center gap-1">
                                <span>⚖️</span>
                                <span className="font-semibold text-slate-200">Leilão SFI (1º/2º)</span>
                              </span>
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                              caixaModalityCounts.leilaoSfi > 0 ? 'bg-indigo-950/80 text-indigo-300 font-bold border border-indigo-800/40' : 'bg-black/30 text-slate-600'
                            }`}>
                              {caixaModalityCounts.leilaoSfi}
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Sub-opções específicas quando Extrajudicial estiver selecionada */}
                    {selectedOriginFilter === 'extrajudicial' && (
                      <div className="p-2.5 bg-slate-950 border border-emerald-900/40 rounded-xl space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono flex items-center gap-1">
                            <span>🏛️</span>
                            <span>Leiloeiros Extrajudiciais</span>
                          </span>
                          {selectedAuctioneerFilter && (
                            <button
                              type="button"
                              onClick={() => setSelectedAuctioneerFilter('')}
                              className="text-[10px] text-indigo-400 hover:text-white cursor-pointer"
                            >
                              Ver todos
                            </button>
                          )}
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-1.5 text-xs pr-1">
                          {activeExtrajudicialAuctioneers.map(item => {
                            const isSelected = selectedAuctioneerFilter === item.name;
                            return (
                              <button
                                key={item.name}
                                type="button"
                                onClick={() => setSelectedAuctioneerFilter(prev => prev === item.name ? '' : item.name)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 ring-2 ring-purple-400/50'
                                    : item.count > 0
                                      ? 'bg-slate-900 text-slate-200 hover:bg-slate-850 border-slate-800'
                                      : 'bg-slate-950/40 text-slate-500 hover:bg-slate-900/30 border-slate-900/60'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate mr-1">
                                  <span>🏛️</span>
                                  <span className="truncate">{item.name}</span>
                                </span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full shrink-0 ${
                                  item.count > 0 ? 'bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-800/40' : 'bg-black/30 text-slate-600'
                                }`}>
                                  {item.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. FILTRO DE LOCALIZAÇÃO GEOGRÁFICA (ESTADO -> CIDADE -> BAIRROS COLAPSÁVEL) */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsLocationOpen(prev => !prev)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer text-xs"
              >
                <span className="flex items-center gap-1.5 font-bold text-slate-300 uppercase tracking-wide font-mono text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Localização Geográfica</span>
                </span>
                {isLocationOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isLocationOpen && (
                <div className="space-y-3 p-2.5 bg-slate-950/90 rounded-xl border border-slate-800 mt-1">
                  {/* Estado (UF) */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Estado (UF)</span>
                    <select
                      value={selectedStateFilter}
                      onChange={(e) => {
                        setSelectedStateFilter(e.target.value);
                        setSelectedCityFilter('');
                        setCitySearchInput('');
                        setSelectedNeighborhoods([]);
                        setSelectedNeighborhoodFilter('');
                      }}
                      className="w-full text-xs font-bold border border-slate-700 rounded-xl p-2.5 bg-slate-900 text-slate-100 hover:bg-slate-850 focus:border-indigo-500 outline-none transition-colors cursor-pointer"
                    >
                      <option value="">Todos os Estados (RJ, MG)</option>
                      {uniqueStates.map(uf => {
                        const stateObj = BRAZIL_STATES.find(s => s.value === uf);
                        return (
                          <option key={uf} value={uf}>
                            {uf} {stateObj ? `- ${stateObj.label}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Cidade com Autocomplete Typeahead */}
                  <div className="relative">
                    <span className="text-[10px] text-slate-400 block mb-1">Cidade</span>
                    {selectedCityFilter ? (
                      <div className="flex items-center justify-between bg-indigo-950/60 border border-indigo-600/50 px-3 py-2 rounded-xl text-xs text-indigo-200 font-bold">
                        <span className="truncate">{selectedCityFilter}</span>
                        <button
                          onClick={() => {
                            setSelectedCityFilter('');
                            setCitySearchInput('');
                            setSelectedNeighborhoods([]);
                            setSelectedNeighborhoodFilter('');
                          }}
                          className="p-1 hover:text-white rounded-md text-indigo-400 transition-colors"
                          title="Remover cidade selecionada"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            placeholder="Buscar cidade..."
                            value={citySearchInput}
                            onChange={e => {
                              setCitySearchInput(e.target.value);
                              setIsCityDropdownOpen(true);
                            }}
                            onFocus={() => setIsCityDropdownOpen(true)}
                            className="w-full text-xs border border-slate-700 rounded-xl pl-8 pr-3 py-2 bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none"
                          />
                        </div>

                        {isCityDropdownOpen && filteredCitiesTypeahead.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto p-1">
                            {filteredCitiesTypeahead.map(city => (
                              <button
                                key={city}
                                onClick={() => {
                                  setSelectedCityFilter(city);
                                  setCitySearchInput('');
                                  setIsCityDropdownOpen(false);
                                  setSelectedNeighborhoods([]);
                                  setSelectedNeighborhoodFilter('');
                                  for (const [st, cities] of Object.entries(VALID_ITBI_CITIES_BY_STATE)) {
                                    if (cities.includes(city)) {
                                      setSelectedStateFilter(st);
                                      break;
                                    }
                                  }
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors cursor-pointer truncate"
                              >
                                {city}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bairros Acordeão Colapsável */}
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsNeighborhoodsOpen(prev => !prev)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer text-xs"
                    >
                      <span className="font-bold text-slate-300">
                        Bairros {selectedNeighborhoods.length > 0 ? `(${selectedNeighborhoods.length} selecionados)` : '(Todos)'}
                      </span>
                      {isNeighborhoodsOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {isNeighborhoodsOpen && (
                      <div className="space-y-2 p-2 bg-slate-950 rounded-xl border border-slate-800/80 mt-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-mono">Seleção:</span>
                          <div className="space-x-2">
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
                              className="text-slate-500 hover:text-slate-300 cursor-pointer"
                            >
                              Nenhum
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          placeholder="Filtrar bairro..."
                          value={neighborhoodSearch}
                          onChange={e => setNeighborhoodSearch(e.target.value)}
                          className="w-full text-[11px] border border-slate-750 rounded-lg px-2.5 py-1.5 bg-slate-900 text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none"
                        />

                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-xs">
                          {visibleNeighborhoods.length === 0 ? (
                            <div className="text-center py-3 text-[11px] text-slate-500">
                              Nenhum bairro com lotes ativos.
                            </div>
                          ) : (
                            visibleNeighborhoods.map(({ name, count }) => {
                              const isChecked = selectedNeighborhoods.includes(name);
                              return (
                                <label
                                  key={name}
                                  className="flex items-center justify-between p-1 rounded-md hover:bg-slate-850 cursor-pointer select-none text-[11px]"
                                >
                                  <div className="flex items-center space-x-2 truncate pr-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleNeighborhood(name)}
                                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span className={`truncate ${isChecked ? 'text-white font-bold' : 'text-slate-300'}`}>
                                      {name}
                                    </span>
                                  </div>
                                  <span className="text-[9.5px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded shrink-0">
                                    {count}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bloco Colapsável: Portais Imobiliários (4 portais oficiais) - Exibido logo abaixo de Localização Geográfica */}
            {mode === 'portais' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsPortalsOpen(prev => !prev)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer text-xs"
                >
                  <span className="flex items-center gap-1.5 font-bold text-slate-300 uppercase tracking-wide font-mono text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Portais Imobiliários ({selectedPortals.length}/4)</span>
                  </span>
                  {isPortalsOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {isPortalsOpen && (
                  <div className="space-y-1.5 p-2.5 bg-slate-950/90 rounded-xl border border-slate-800 mt-1">
                    <div className="flex items-center justify-between text-[10px] pb-1 border-b border-slate-800/60">
                      <span className="text-slate-400 font-mono">Seleção de Portais:</span>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={handleSelectAllPortals}
                          className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                        >
                          Todos
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={handleClearPortals}
                          className="text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          Nenhum
                        </button>
                      </div>
                    </div>

                    {/* Opção Todos os Portais */}
                    <label className="flex items-center justify-between p-1 rounded-md hover:bg-slate-850 cursor-pointer select-none text-[11px] border-b border-slate-800/40 pb-1 mb-1">
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <input
                          type="checkbox"
                          checked={selectedPortals.length === ALL_PORTALS.length}
                          onChange={handleToggleAllPortals}
                          className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <span className={`truncate ${selectedPortals.length === ALL_PORTALS.length ? 'text-white font-bold' : 'text-slate-300'}`}>
                          Todos os 4 Portais
                        </span>
                      </div>
                      <span className="text-[9.5px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded shrink-0">
                        {totalPortalCount}
                      </span>
                    </label>

                    {ALL_PORTALS.map((portal) => {
                      const isChecked = selectedPortals.includes(portal);
                      const count = portalCounts[portal] || 0;
                      return (
                        <label
                          key={portal}
                          className="flex items-center justify-between p-1 rounded-md hover:bg-slate-850 cursor-pointer select-none text-[11px]"
                        >
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePortal(portal)}
                              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                            />
                            <span className={`truncate ${isChecked ? 'text-white font-bold' : 'text-slate-300'}`}>
                              {portal}
                            </span>
                          </div>
                          <span className="text-[9.5px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded shrink-0">
                            {count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. CONDIÇÕES & OCUPAÇÃO (FINANCIAMENTO, PARCELAMENTO, DESOCUPADO) - Apenas Leilões */}
            {mode !== 'portais' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Condições & Ocupação
                </label>
                <div className="space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setOnlyFinancing(prev => !prev)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      onlyFinancing
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/40'
                        : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🏦</span>
                      <span>Aceita Financiamento</span>
                    </span>
                    {onlyFinancing && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyInstallments(prev => !prev)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      onlyInstallments
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-950/40 ring-1 ring-blue-400/40'
                        : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>💳</span>
                      <span>Aceita Parcelamento</span>
                    </span>
                    {onlyInstallments && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyVacant(prev => !prev)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      onlyVacant
                        ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-950/40 ring-1 ring-teal-400/40'
                        : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🔑</span>
                      <span>Imóvel Desocupado</span>
                    </span>
                    {onlyVacant && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              </div>
            )}

            {/* 5. RODAPÉ DA SIDEBAR: GERENCIADOR DE PRESETS DE BUSCA */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsPresetModalOpen(true)}
                className="w-full py-2.5 px-3.5 bg-slate-950 hover:bg-slate-850 text-slate-200 hover:text-white rounded-xl border border-slate-800 hover:border-slate-700 font-bold text-xs transition-all flex items-center justify-between cursor-pointer group shadow-sm"
                title="Abrir gerenciador de presets de busca salvos"
              >
                <div className="flex items-center space-x-2.5">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>💾 Presets de Busca</span>
                </div>
                <span className="text-[10px] font-mono bg-slate-900 border border-slate-750 px-2 py-0.5 rounded-full text-slate-400 group-hover:text-amber-300">
                  {savedPresets.length} {savedPresets.length === 1 ? 'salvo' : 'salvos'}
                </span>
              </button>
            </div>

          </div>
        </aside>

        {/* ============================================================== */}
        {/* RIGHT FEED AREA: CONTADOR, ORDENAÇÃO, TOGGLE E CARDS (72% width) */}
        {/* ============================================================== */}
        <main className="flex-1 min-w-0 space-y-4">
          
          {/* Top Bar do Feed: Oportunidades, Ordenação, Temporal Toggle e Salvar Busca */}
          <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-3 sm:p-3.5 shadow-xl space-y-2.5">
            
            {/* Linha 1: Contador e Contexto à esquerda, Controles Temporais e Salvar Busca à direita */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
              
              {/* Esquerda: Contador Dinâmico e Auditoria ITBI / Calculadora */}
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl border shrink-0 ${
                  advancedContextTab === 'alugar'
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-black text-white font-display">
                      {filteredAndSortedAuctions.length} {advancedContextTab === 'alugar' ? (filteredAndSortedAuctions.length === 1 ? 'Imóvel para Alugar' : 'Imóveis para Alugar') : (filteredAndSortedAuctions.length === 1 ? 'Oportunidade Encontrada' : 'Oportunidades Encontradas')}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    {advancedContextTab === 'alugar' ? (
                      <>Varredura de locação residencial em <strong className="text-slate-200 font-bold">{locationScopeText}</strong> • <span className="text-emerald-300 font-semibold">Avaliado via Calculadora de Valor Real</span></>
                    ) : (
                      <>Varredura ativa em <strong className="text-slate-200 font-bold">{locationScopeText}</strong> • <span className="text-indigo-300 font-semibold">Auditado via ITBI Municipal</span></>
                    )}
                  </p>
                </div>
              </div>

              {/* Direita: Toggle Temporal (Padrão, Mais Antigos, Inclusão Mais Recente) */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setTemporalSortMode('neutral');
                    setSortBy('roi');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    temporalSortMode === 'neutral'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={advancedContextTab === 'alugar' ? "Ordenar por Custo Benefício / Mais Barato que a Calculadora" : "Ordenar por Padrão (Maior ROI decrescente com desempate por Lucro Líquido Real)"}
                >
                  <span>{advancedContextTab === 'alugar' ? '📊 Padrão (Mais Barato)' : '📈 Padrão (Maior ROI)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemporalSortMode('urgent')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    temporalSortMode === 'urgent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={mode === 'portais' || advancedContextTab === 'alugar' ? "Anúncios publicados há mais tempo primeiro (maior margem para negociar)" : "Próximas praças e encerramentos iminentes"}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  <span>{mode === 'portais' || advancedContextTab === 'alugar' ? 'Mais Antigos' : 'Próximas Praças'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemporalSortMode('newest')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    temporalSortMode === 'newest'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Anúncios e oportunidades recém adicionados ao sistema"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Inclusão Mais Recente</span>
                </button>
              </div>
            </div>

            {/* Linha 2: Estratégias organizadas à esquerda + Mapa no canto direito na mesma linha */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2 border-t border-slate-800/80 w-full">
              
              {/* Esquerda: 4 Botões de Estratégia organizados e alinhados por modalidade */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-bold mr-1">ESTRATÉGIA:</span>
                
                {/* 1. ESTRATÉGIAS PARA LOCAÇÃO RESIDENCIAL */}
                {advancedContextTab === 'alugar' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, superCheap: !prev.superCheap }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.superCheap
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                      title="Imóveis onde o aluguel pedido está significativamente abaixo do valor real apurado pela calculadora"
                    >
                      <span>🟢 Super Barato</span>
                      {strategyFilters.superCheap && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, lowestRent: !prev.lowestRent }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.lowestRent
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                      title="Ordenar pelo menor valor absoluto de aluguel por mês"
                    >
                      <span>📉 Menor Aluguel</span>
                      {strategyFilters.lowestRent && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, lowestRentSqm: !prev.lowestRentSqm }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.lowestRentSqm
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                      title="Ordenar pelo menor valor de aluguel por metro quadrado (R$/m² mês)"
                    >
                      <span>📐 Menor R$/m² Mês</span>
                      {strategyFilters.lowestRentSqm && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, bestRentDiscount: !prev.bestRentDiscount }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.bestRentDiscount
                          ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                      title="Maior economia financeira mensal em relação à média apurada"
                    >
                      <span>⭐ Maior Economia</span>
                      {strategyFilters.bestRentDiscount && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </>
                ) : mode === 'portais' ? (
                  /* 2. ESTRATÉGIAS PARA FLIP HOUSE (Portais de Compra e Venda Particular) */
                  <>
                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, discount: !prev.discount }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.discount
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                      title="Imóveis com maior deságio em relação ao valor de mercado do ITBI municipal"
                    >
                      <span>🏷️ Maior Desconto</span>
                      {strategyFilters.discount && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, profit: !prev.profit }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.profit
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                      title="Maior projeção de lucro líquido após reforma e revenda rápida (Flip)"
                    >
                      <span>💰 Maior Lucro Flip</span>
                      {strategyFilters.profit && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, lowestSqm: !prev.lowestSqm }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.lowestSqm
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                      title="Menor preço pedido por metro quadrado útil"
                    >
                      <span>📉 Menor Preço/m²</span>
                      {strategyFilters.lowestSqm && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, under250k: !prev.under250k }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.under250k
                          ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                      title="Filtrar imóveis com preço total de até R$ 250.000 (Giro Rápido Popular)"
                    >
                      <span>⚡ Até R$ 250k</span>
                      {strategyFilters.under250k && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </>
                ) : (
                  /* 3. ESTRATÉGIAS PARA LEILÕES JUDICIAIS E CAIXA (Garimpo) */
                  <>
                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, liquidity: !prev.liquidity }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.liquidity
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                    >
                      <span>💧 Maior Liquidez</span>
                      {strategyFilters.liquidity && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, roi: !prev.roi }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.roi
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                    >
                      <span>📈 Maior ROI</span>
                      {strategyFilters.roi && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, profit: !prev.profit }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.profit
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                    >
                      <span>💰 Maior Lucro Real</span>
                      {strategyFilters.profit && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStrategyFilters(prev => ({ ...prev, spread: !prev.spread }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        strategyFilters.spread
                          ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                    >
                      <span>📐 Maior Spread por m²</span>
                      {strategyFilters.spread && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </>
                )}

                {(strategyFilters.liquidity || strategyFilters.roi || strategyFilters.profit || strategyFilters.spread || strategyFilters.discount || strategyFilters.lowestSqm || strategyFilters.under250k || strategyFilters.superCheap || strategyFilters.lowestRent || strategyFilters.lowestRentSqm || strategyFilters.bestRentDiscount) && (
                  <button
                    type="button"
                    onClick={() => setStrategyFilters({
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
                    })}
                    className="text-[11px] text-slate-400 hover:text-rose-400 font-bold cursor-pointer transition-colors ml-1"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Direita: Botão Mapa no canto direito exatamente na mesma linha da estratégia */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsGeneralMapModalOpen(true)}
                  className="text-xs text-emerald-300 hover:text-white font-bold px-3.5 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 transition-all cursor-pointer border border-emerald-500/40 shadow-xs flex items-center gap-1.5"
                  title="Abrir todos os imóveis filtrados no Mapa Georreferenciado"
                >
                  <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mapa ({filteredAndSortedAuctions.length})</span>
                </button>
              </div>

            </div>
          </div>

          {/* MAPA EXPANSÍVEL INTEGRADO */}
          <AnimatePresence>
            {isMapExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-slate-900"
              >
                <div className="h-[480px] w-full relative">
                  <PropertyMap
                    itbiStats={itbiStats}
                    onUpdateProperty={onUpdateProperty}
                    auctions={auctions}
                    initialFilteredAuctions={filteredAndSortedAuctions}
                    initialSelectedPropertyId={hoveredPropertyId || undefined}
                    onSelectPropertyFromMap={(id) => {
                      const found = auctions.find(a => a.id === id);
                      if (found) setSimulatingAuction(found);
                    }}
                    onClose={() => setIsMapExpanded(false)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                      className={`auction-card bg-slate-900/95 border rounded-2xl shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-400 ring-2 ring-indigo-400/60 shadow-[0_20px_50px_rgba(99,102,241,0.25)]'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top cover photo padronizado (Portais e Leilões Judiciais/Extrajudiciais/Caixa) */}
                      <div className="relative w-full h-44 sm:h-52 bg-slate-950 overflow-hidden border-b border-slate-800 rounded-t-2xl group/img">
                        <PropertyThumbnail
                          property={auc}
                          size="cover"
                          className="!w-full !h-full !rounded-none !border-0"
                          onClick={() => setSelectedLightboxProperty(auc)}
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-2 pointer-events-none">
                          {auc.origin === 'portal' ? (
                            <span className="bg-slate-900/90 backdrop-blur-md text-amber-300 text-[10.5px] font-bold px-2.5 py-1 rounded-lg border border-amber-600/40 shadow-md font-mono flex items-center gap-1.5">
                              <span>🏷️</span>
                              <span>{auc.portalName || 'Portal'}</span>
                            </span>
                          ) : (
                            <span className="bg-slate-900/90 backdrop-blur-md text-indigo-300 text-[10.5px] font-bold px-2.5 py-1 rounded-lg border border-indigo-600/40 shadow-md font-mono flex items-center gap-1.5">
                              <span>🏛️</span>
                              <span>{auc.origin === 'judicial' ? 'Leilão Judicial' : auc.origin === 'caixa' ? 'Imóveis Caixa' : (auc.auctioneerName || auc.leiloeiro || 'Leilão Extrajudicial')}</span>
                            </span>
                          )}
                        </div>
                        {auc.auctionLink && (
                          <a
                            href={auc.auctionLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2.5 right-2.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-lg backdrop-blur-sm border border-indigo-400/50 shadow-md transition-all flex items-center gap-1 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{auc.origin === 'portal' ? 'Ver Anúncio Original ↗' : 'Ver Lote do Leilão ↗'}</span>
                          </a>
                        )}
                      </div>

                      <div className="p-5 sm:p-6 space-y-4">
                        
                        {/* Header do Card com Badges, Título e Alerta */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            
                            {/* Alerta Visual de Imóvel para Locação (Comparado à Calculadora de Valor Real) ou Venda Abaixo do Mercado */}
                            {auc.transactionType === 'aluguel' ? (
                              <div className={`w-full py-2 px-0 mb-2 border-b border-slate-800/80 flex items-start gap-2 bg-transparent ${
                                auc.vereditoLocacao === 'barato' ? 'text-emerald-300' :
                                auc.vereditoLocacao === 'caro' ? 'text-rose-300' : 'text-cyan-300'
                              }`}>
                                <span className="text-base shrink-0 select-none">
                                  {auc.vereditoLocacao === 'barato' ? '🔥' : auc.vereditoLocacao === 'caro' ? '⚠️' : '⚖️'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-xs font-black uppercase tracking-wide whitespace-normal break-words ${
                                    auc.vereditoLocacao === 'barato' ? 'text-emerald-400' :
                                    auc.vereditoLocacao === 'caro' ? 'text-rose-400' : 'text-cyan-400'
                                  }`}>
                                    {auc.vereditoLocacao === 'barato' ? `Alerta: Aluguel Barato para Morar (${Math.abs(auc.aluguelDiferencaPct || 0)}% abaixo da média)` :
                                     auc.vereditoLocacao === 'caro' ? `Alerta: Aluguel Acima da Média (+${auc.aluguelDiferencaPct || 0}% acima da calculadora)` :
                                     'Preço Justo de Locação (Na média da Calculadora)'}
                                  </div>
                                  <div className="text-[11px] text-slate-300 font-mono whitespace-normal break-words mt-0.5" style={{ overflowWrap: 'anywhere' }}>
                                    O imóvel vale: <strong className="text-white font-bold">{formatBRL(auc.valorMercadoEstimado || (auc.sizeSqm * (auc.m2ReferenciaBairro || 4500)))}</strong>
                                    <span className="mx-1 text-slate-500">•</span>
                                    Média Calculadora: <strong className="text-amber-300 font-bold">{formatBRL(auc.mediaLocacaoCalculadora || Math.round((auc.valorMercadoEstimado || 0) * 0.0055))}/mês</strong>
                                    <span className="mx-1 text-slate-500">•</span>
                                    Aluguel: <strong className="text-white font-bold">{formatBRL(auc.monthlyRent || auc.precoAnunciado || auc.auctionPrice)}/mês</strong>
                                    <span className="mx-1 text-slate-500">•</span>
                                    Taxas (Cond+IPTU): <strong className="text-amber-300 font-bold">{formatBRL(auc.totalTaxas !== undefined ? auc.totalTaxas : ((auc.valorCondominio || 0) + (auc.valorIptu || 0) + (auc.taxasServico || 0)))}/mês</strong>
                                    <span className="mx-1 text-slate-500">•</span>
                                    Pacote Total: <strong className="text-emerald-400 font-bold">{formatBRL(auc.totalRentalPackage || ((auc.monthlyRent || auc.precoAnunciado || auc.auctionPrice || 0) + (auc.totalTaxas !== undefined ? auc.totalTaxas : ((auc.valorCondominio || 0) + (auc.valorIptu || 0) + (auc.taxasServico || 0)))))}/mês</strong>
                                  </div>
                                </div>
                              </div>
                            ) : auc.origin === 'portal' && (auc.oportunidadeAbaixoMercado || (auc.descontoMercadoPct && auc.descontoMercadoPct >= 15)) ? (
                              <div className="w-full py-2 px-0 mb-2 border-b border-slate-800/80 flex items-start gap-2 bg-transparent text-slate-200">
                                <span className="text-base shrink-0 select-none">🔥</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-black uppercase tracking-wide text-rose-400 whitespace-normal break-words overflow-visible">
                                    Alerta: Abaixo do Valor de Mercado (-{auc.descontoMercadoPct}%)
                                  </div>
                                  <div className="text-[11px] text-slate-300 font-mono whitespace-normal break-words mt-0.5" style={{ overflowWrap: 'anywhere' }}>
                                    Valor Estimado: <strong className="text-emerald-400 font-bold">{formatBRL(auc.valorMercadoEstimado || (auc.sizeSqm * (auc.m2ReferenciaBairro || 3600)))}</strong>
                                    <span className="mx-1 text-slate-500">•</span>
                                    Preço Anunciado: <strong className="text-white font-bold">{formatBRL(auc.precoAnunciado || auc.auctionPrice)}</strong>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {/* Badges de Status dos Cards */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span title={auc.areaAudit?.selected?.excerpt || 'Metragem sem confirmação na fonte'} className="bg-slate-800 text-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-lg border border-slate-700">
                                {auc.propertyType} • {auc.sizeSqm > 0 ? `${auc.sizeApproximate ? '≈ ' : ''}${auc.sizeSqm} m²` : 'Área não confirmada'}
                                {auc.bedrooms ? ` • ${auc.bedrooms} qto${auc.bedrooms > 1 ? 's' : ''}` : ''}
                              </span>

                              {/* Portais vs Leilões: Badges dedicados */}
                              {auc.transactionType === 'aluguel' ? (
                                <span className="bg-emerald-950/80 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-600/40 flex items-center gap-1">
                                  <span>🔑</span>
                                  <span>Locação Residencial (Para Morar)</span>
                                </span>
                              ) : auc.origin === 'portal' ? (
                                <span className="bg-amber-950/80 text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-600/40 flex items-center gap-1">
                                  <span>🤝</span>
                                  <span>Venda Direta Particular</span>
                                </span>
                              ) : (
                                <>
                                  {/* Badge de Modalidade */}
                                  {(() => {
                                    const badge = getSaleModeBadge(auc);
                                    return (
                                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${badge.className}`}>
                                        <span>{badge.icon}</span>
                                        <span>{badge.label}</span>
                                      </span>
                                    );
                                  })()}

                                  {/* Risco (Apenas para leilões) */}
                                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                                    auc.riskLevel === 'Baixo' ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600/50' :
                                    auc.riskLevel === 'Médio' ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600/50' :
                                    'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-600/50'
                                  }`}>
                                    Risco {auc.riskLevel || 'Baixo'}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Título e Endereço */}
                            <div>
                              <h3 
                                className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug hover:text-indigo-300 transition-colors cursor-pointer break-words"
                                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                                onClick={() => setSimulatingAuction(auc)}
                                title={auc.title}
                              >
                                {auc.title}
                              </h3>
                              <div className="flex items-center text-xs text-slate-400 space-x-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate break-words" style={{ overflowWrap: 'anywhere' }} title={`${auc.address} (${auc.neighborhood} - ${auc.city}/${auc.state || 'RJ'})`}>
                                  {auc.address} ({auc.neighborhood} - {auc.city}/{auc.state || 'RJ'})
                                </span>
                              </div>
                              {cleanDivergentNotice(auc.divergentNeighborhoodNotice) && (
                                <div className="mt-1">
                                  <span className="text-[10.5px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800/60 font-mono font-bold inline-flex items-center gap-1 shadow-xs" title="Bairro cadastrado no edital difere do endereço real no mapa/cartório">
                                    <span>⚠️</span>
                                    <span>{cleanDivergentNotice(auc.divergentNeighborhoodNotice)}</span>
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Informações complementares de publicação */}
                            {auc.origin === 'portal' ? (
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-400 font-mono">
                                <span>Portal: <strong className="text-amber-300 font-bold">{auc.portalName || 'Portal'}</strong></span>
                                <span>Publicação: <strong className="text-slate-200">{auc.textoPublicacao || (auc.diasPublicado !== undefined ? `Publicado há ${auc.diasPublicado} dias` : 'Recém-publicado')}</strong></span>
                                {auc.auctionLink && (
                                  <a href={auc.auctionLink} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 font-bold underline inline-flex items-center gap-1">
                                    <span>Ver Anúncio Original ↗</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-400 font-mono">
                                <span>Origem: <strong className={
                                  (auc.leiloeiro === 'Portal Zuk' || (auc.auctionLink && auc.auctionLink.includes('portalzuk')))
                                    ? "text-purple-300 font-bold"
                                    : "text-slate-200"
                                }>
                                  {getAuctionPortalDisplayName(auc)}
                                </strong></span>
                                <span>1ª Praça: <strong className="text-slate-200">{formatAuctionDate(auc.firstAuctionDate || auc.auctionDate)}</strong></span>
                                {auc.secondAuctionDate && (
                                  <span>2ª Praça: <strong className="text-slate-200">{formatAuctionDate(auc.secondAuctionDate)}</strong></span>
                                )}
                              </div>
                            )}

                          </div>
                        </div>

                        {/* Grid Financeiro: Locação vs Flip House (Portais) vs Leilões */}
                        {auc.transactionType === 'aluguel' ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                              {/* Aluguel Pedido */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  Aluguel Pedido
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5">
                                  {formatBRL(auc.monthlyRent || auc.precoAnunciado || auc.auctionPrice)}/mês
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {auc.portalName || 'Portal'}
                                </span>
                              </div>

                              {/* Aluguel / m² Anunciado */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  Aluguel / m²
                                </span>
                                <span className="text-xs sm:text-sm font-normal text-amber-300 font-mono mt-0.5">
                                  {formatBRL(Math.round((auc.monthlyRent || auc.precoAnunciado || auc.auctionPrice) / (auc.sizeSqm || 1)))}/m²
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  Área: {auc.sizeSqm}m²
                                </span>
                              </div>

                              {/* Média da Calculadora */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  Média Calculadora
                                </span>
                                <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5">
                                  {formatBRL(auc.mediaLocacaoCalculadora || Math.round((auc.valorMercadoEstimado || (auc.sizeSqm * (auc.m2ReferenciaBairro || 4500))) * 0.0055))}/mês
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  0.55% de {formatBRL(auc.valorMercadoEstimado)}
                                </span>
                              </div>

                              {/* Veredito Pericial */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  Veredito Calculadora
                                </span>
                                <span className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${
                                  auc.vereditoLocacao === 'barato' ? 'text-emerald-400' :
                                  auc.vereditoLocacao === 'caro' ? 'text-rose-400' : 'text-cyan-400'
                                }`}>
                                  {auc.vereditoLocacao === 'barato' ? `BARATO (-${Math.abs(auc.aluguelDiferencaPct || 0)}%)` :
                                   auc.vereditoLocacao === 'caro' ? `CARO (+${auc.aluguelDiferencaPct || 0}%)` : 'PREÇO JUSTO'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {auc.vereditoLocacao === 'barato' ? 'Ótimo p/ Morar' : auc.vereditoLocacao === 'caro' ? 'Acima do Mercado' : 'Alinhado à Região'}
                                </span>
                              </div>
                            </div>

                            {/* Linha 2: Pacote Completo de Moradia e Taxas */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                              {/* Condomínio */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  Condomínio
                                </span>
                                <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5">
                                  {auc.valorCondominio ? `${formatBRL(auc.valorCondominio)}/mês` : 'Incluso / Sem taxa'}
                                </span>
                                <span className="text-[8.5px] text-slate-500 font-mono">
                                  {auc.valorCondominio ? 'Taxa ordinária' : 'Sem cobrança'}
                                </span>
                              </div>

                              {/* IPTU Mensal */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  IPTU Mensal
                                </span>
                                <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5">
                                  {auc.valorIptu ? `${formatBRL(auc.valorIptu)}/mês` : 'Isento'}
                                </span>
                                <span className="text-[8.5px] text-slate-500 font-mono">
                                  {auc.valorIptu ? 'Cota mensal' : 'Isento pela prefeitura'}
                                </span>
                              </div>

                              {/* Total de Taxas (Condomínio + IPTU + Serviços) */}
                              <div className="flex flex-col justify-center">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                    Total de Taxas
                                  </span>
                                  {auc.taxasServico ? (
                                    <span className="text-[8px] bg-slate-800 text-amber-300/90 px-1 py-0.2 rounded font-mono" title={`Inclui taxas de serviço e seguro do portal: ${formatBRL(auc.taxasServico)}/mês`}>
                                      +{formatBRL(auc.taxasServico)} serv.
                                    </span>
                                  ) : null}
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-amber-300 font-mono mt-0.5">
                                  {formatBRL(auc.totalTaxas !== undefined ? auc.totalTaxas : ((auc.valorCondominio || 0) + (auc.valorIptu || 0) + (auc.taxasServico || 0)))}/mês
                                </span>
                                <span className="text-[8.5px] text-slate-500 font-mono">
                                  Cond. + IPTU{auc.taxasServico ? ' + Taxas' : ''}
                                </span>
                              </div>

                              {/* Pacote Moradia Total (Aluguel + Condomínio + IPTU + Taxas) */}
                              <div className="flex flex-col justify-center bg-emerald-950/40 p-2 rounded-lg border border-emerald-700/50">
                                <span className="text-[9px] text-emerald-400 block uppercase font-black tracking-wider">
                                  Pacote Moradia Total
                                </span>
                                <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5">
                                  {formatBRL(
                                    auc.totalRentalPackage ||
                                    ((auc.monthlyRent || auc.precoAnunciado || auc.auctionPrice || 0) +
                                     (auc.totalTaxas !== undefined ? auc.totalTaxas : ((auc.valorCondominio || 0) + (auc.valorIptu || 0) + (auc.taxasServico || 0))))
                                  )}/mês
                                </span>
                                <span className="text-[8.5px] text-emerald-300/80 font-mono font-medium">
                                  Aluguel + Todas Taxas
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : auc.origin === 'portal' ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                              {/* Preço Anunciado */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  Preço Anunciado
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5">
                                  {formatBRL(auc.precoAnunciado || auc.auctionPrice)}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {auc.portalName || 'Portal'} · Área: {auc.sizeSqm}m²
                                </span>
                              </div>

                              {/* M² Ref. Bairro (Benchmark Calculadora ITBI) */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  M² Ref. Bairro
                                </span>
                                <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5">
                                  {(() => {
                                    const itbiStat = itbiStats?.find(s => 
                                      normalizeText(s.neighborhood) === normalizeText(auc.neighborhood) && 
                                      (!auc.propertyType || s.propertyType === auc.propertyType)
                                    ) || itbiStats?.find(s => normalizeText(s.neighborhood) === normalizeText(auc.neighborhood));
                                    const m2Val = itbiStat?.avgSqm || auc.itbiNeighborhoodAvgSqm || auc.itbiUnitValueAvg || auc.m2ReferenciaBairro || 0;
                                    return formatBRL(m2Val);
                                  })()}/m²
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  Benchmark Calculadora
                                </span>
                              </div>

                              {/* Preço Sugerido Flip */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  {flipPrice > 0 ? 'Preço Sugerido Flip' : 'Valor Estimado'}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">
                                  {formatBRL(flipPrice > 0 ? flipPrice : (auc.valorMercadoEstimado || auc.estimatedValue || 0))}
                                </span>
                                {(() => {
                                  const preco = auc.precoAnunciado || auc.auctionPrice || 0;
                                  const valEst = flipPrice > 0 ? flipPrice : (auc.valorMercadoEstimado || auc.estimatedValue || 0);
                                  const diffPct = valEst > 0 ? Math.round(((valEst - preco) / valEst) * 100) : 0;
                                  if (diffPct > 0) {
                                    return (
                                      <span className="text-[9px] font-mono text-emerald-400 font-bold">
                                        Deságio Flip: -{diffPct}%
                                      </span>
                                    );
                                  } else if (diffPct < 0) {
                                    return (
                                      <span className="text-[9px] font-mono text-rose-400 font-bold">
                                        Acima do Flip: +{Math.abs(diffPct)}%
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>

                            {/* Linha 2: Viabilidade de Compra & Venda (Flip Rápido) */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  Custo Total Est.
                                </span>
                                <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5">
                                  {formatBRL(totalCost)}
                                </span>
                                <span className="text-[8.5px] text-slate-500 font-mono">
                                  ITBI (3%) + RGI (2%) + Ref. (5%)
                                </span>
                              </div>

                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  Lucro Estimado
                                </span>
                                <span className={`text-xs sm:text-sm font-bold font-mono mt-0.5 ${
                                  lucroReal !== undefined && lucroReal > 0 ? 'text-emerald-400' :
                                  lucroReal !== undefined && lucroReal < 0 ? 'text-rose-400' : 'text-slate-400'
                                }`}>
                                  {lucroReal !== undefined ? (
                                    lucroReal > 0 ? formatBRL(lucroReal) : `Sem margem (${formatBRL(lucroReal)})`
                                  ) : 'Sob análise'}
                                </span>
                                <span className="text-[8.5px] text-slate-500 font-mono">
                                  {lucroReal !== undefined && lucroReal > 0 ? 'Margem Líquida Flip' : 'Sem Margem Flip'}
                                </span>
                              </div>

                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                  ROI Projetado
                                </span>
                                <span className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${
                                  roi !== undefined && roi > 0 ? 'text-amber-400' :
                                  roi !== undefined && roi < 0 ? 'text-rose-400' : 'text-slate-400'
                                }`}>
                                  {roi !== undefined ? (
                                    roi > 0 ? `+${roi}%` : `${roi}%`
                                  ) : 'Sob análise'}
                                </span>
                                <span className="text-[8.5px] text-slate-500 font-mono">
                                  Retorno sobre Custo
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                          
                          {/* Lance Mínimo */}
                          <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                Lance Mínimo
                              </span>
                              {auc.firstAuctionPrice && auc.secondAuctionPrice ? (
                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded leading-none ${
                                  auc.auctionPrice === auc.firstAuctionPrice
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
                                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                                }`}>
                                  {auc.auctionPrice === auc.firstAuctionPrice ? '1º Leilão' : '2º Leilão'}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-xs sm:text-sm font-normal text-white font-mono mt-0.5">
                              {auc.auctionPrice > 0 ? formatBRL(auc.auctionPrice) : 'Lance não confirmado'}
                            </span>
                            {auc.firstAuctionPrice && auc.secondAuctionPrice && (
                              <span className="text-[9px] text-slate-400 font-mono">
                                1º: {formatBRL(auc.firstAuctionPrice)} | 2º: {formatBRL(auc.secondAuctionPrice)}
                              </span>
                            )}
                          </div>

                          {/* Custo Total Est. com Tooltip */}
                          <div className="relative group/cost flex flex-col justify-center cursor-help whitespace-nowrap">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
                                Custo Total
                              </span>
                              <Info className="w-2.5 h-2.5 text-slate-500" />
                            </div>
                            <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5 whitespace-nowrap">
                              {auc.auctionPrice > 0 ? formatBRL(totalCost) : 'Sob análise'}
                            </span>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-0 mb-2 w-64 p-2.5 bg-slate-950 text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover/cost:opacity-100 transition-opacity z-50 text-[10px] space-y-1">
                              <div className="font-bold text-indigo-300 border-b border-slate-800 pb-1">Composição do Custo</div>
                              <div className="flex justify-between"><span>Lance:</span><strong>{costs.bid > 0 ? formatBRL(costs.bid) : 'Lance não confirmado'}</strong></div>
                              {costs.auctioneer > 0 && <div className="flex justify-between"><span>Comissão Leiloeiro (5%):</span><strong>{formatBRL(costs.auctioneer)}</strong></div>}
                              <div className="flex justify-between"><span>ITBI & RGI:</span><strong>{formatBRL(costs.itbi + costs.registry)}</strong></div>
                              <div className="flex justify-between"><span>Reforma Est. (5%):</span><strong>{formatBRL(costs.repair)}</strong></div>
                              {(costs.iptu > 0 || costs.condo > 0) && <div className="flex justify-between"><span>Dívidas (IPTU/Condomínio):</span><strong>{formatBRL(costs.iptu + costs.condo)}</strong></div>}
                              <div className="flex justify-between"><span>Carregamento (1.5% Gabarito):</span><strong>{formatBRL(costs.custoCarregamento)}</strong></div>
                              <div className="flex justify-between border-t border-slate-800 pt-1 font-bold text-slate-100"><span>Total:</span><strong>{formatBRL(totalCost)}</strong></div>
                            </div>
                          </div>

                          {/* Lucro Estimado Real com valor neutro limpo */}
                          <div className="flex flex-col justify-center whitespace-nowrap">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
                              Lucro Real Est.
                            </span>
                            <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5 whitespace-nowrap">
                              {lucroReal !== undefined ? formatBRL(lucroReal) : 'Sob análise'}
                            </span>
                            {spreadSqm > 0 && (
                              <span className="text-[9.5px] font-mono text-emerald-400 font-bold mt-0.5 whitespace-nowrap" title="Spread líquido de saída por m² privativo">
                                Spread: {formatBRL(spreadSqm)}/m²
                              </span>
                            )}
                          </div>

                          {/* Gabarito ITBI com Tooltip Pericial NBR 14.653 */}
                          <div className="relative group/itbi flex flex-col justify-center cursor-help">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider flex items-center space-x-0.5 truncate">
                                <span>Gabarito ITBI</span>
                              </span>
                              <Info className="w-2.5 h-2.5 text-slate-500" />
                            </div>
                            <span className="text-[11px] sm:text-xs xl:text-sm font-black text-slate-200 font-mono mt-0.5 whitespace-nowrap">
                              {auc.estimatedValue ? formatBRL(auc.estimatedValue) : 'Sem amostras'}
                            </span>
                            {auc.isAreaHomogeneizada && (
                              <span className="text-[9px] font-mono text-indigo-400 font-bold mt-0.5" title="Homogeneizado por Curva de Escala Inversa da ABNT NBR 14.653">
                                Escala NBR: {auc.fatorEscala ? auc.fatorEscala.toFixed(3) : '1.000'}
                              </span>
                            )}

                            {/* Tooltip pericial */}
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover/itbi:opacity-100 transition-opacity z-50 text-left">
                              <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1">
                                <span>🏛️ Base Pericial ITBI Municipal</span>
                              </div>
                              <p className="text-[10px] text-slate-300 leading-relaxed">
                                Base apurada no registro de escrituras públicas da Prefeitura para esta via e bairro (Norma ABNT NBR 14.653 com saneamento Chauvenet).
                              </p>
                              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[9.5px] font-mono text-slate-400 flex justify-between">
                                <span>{auc.itbiIsDerivedSqm ? 'Unitário Homogeneizado:' : auc.itbiIsAbsolutePricing ? 'Preço Médio Compra e Venda:' : 'Unitário Apurado:'}</span>
                                <strong className="text-slate-200">
                                  {auc.itbiIsAbsolutePricing 
                                    ? formatBRL(auc.itbiAbsoluteAvgPrice || auc.estimatedValue || 0) 
                                    : `R$ ${(auc.itbiStreetAvgSqm || auc.itbiUnitValueAvg || 0).toLocaleString('pt-BR')}/m²`}
                                </strong>
                              </div>
                              {auc.itbiIsAbsolutePricing ? (
                                <div className="text-[9px] font-mono text-emerald-400 flex justify-between pt-1">
                                  <span>Amostras Compra e Venda:</span>
                                  <strong>{auc.itbiCompraEVendaCount || 0} tx ({auc.itbiPeriodRange?.minDate && auc.itbiPeriodRange?.maxDate ? `${auc.itbiPeriodRange.minDate} a ${auc.itbiPeriodRange.maxDate}` : "2024-2025"})</strong>
                                </div>
                              ) : null}
                            </div>
                          </div>

                        </div>

                        {/* Grid Financeiro: Linha 2 (ROI, Avaliação Edital, Liquidez, Flip Rápido 60d) - NÚMEROS NEUTROS */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                          
                          {/* ROI Projetado */}
                          <div className="flex flex-col justify-center whitespace-nowrap">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider whitespace-nowrap">
                              ROI Projetado
                            </span>
                            <span className="text-xs sm:text-sm font-black font-mono text-slate-200 mt-0.5 whitespace-nowrap">
                              {roi !== undefined ? `${roi}%` : 'Sob análise'}
                            </span>
                          </div>

                          {/* Avaliação do Edital */}
                          <div className="flex flex-col justify-center">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider truncate">
                              Avaliação Edital
                            </span>
                            <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5">
                              {auc.evaluationPrice ? formatBRL(auc.evaluationPrice) : '-'}
                            </span>
                          </div>

                          {/* Liquidez com Tooltip */}
                          {(() => {
                            const streetCount = Math.max(0, Number(auc.itbiStreetCount) || 0);
                            const hasStreetData = streetCount > 0;
                            const isCalibratedBadge = quality.badgeLabel.includes('Calibrado') || Boolean(auc.valuationCalibration);
                            const effectiveCeiling = !hasStreetData 
                              ? 0 
                              : (isCalibratedBadge 
                                  ? ((Number(auc.itbiSurroundingCount) || 0) < 5 ? 3.0 : 5.0) 
                                  : quality.liquidityCeiling);
                            const finalLiquidity = !hasStreetData ? 0 : Math.min(auc.liquidityScore ?? 0, effectiveCeiling);

                            return (
                              <div className="relative group/liq flex flex-col justify-center cursor-help">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Liquidez</span>
                                  <Info className="w-2.5 h-2.5 text-slate-500" />
                                </div>
                                <span className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${finalLiquidity === 0 ? 'text-slate-400' : 'text-slate-200'}`}>
                                  {finalLiquidity}/10
                                </span>

                                {/* Tooltip de Liquidez */}
                                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover/liq:opacity-100 transition-opacity z-50 text-left">
                                  <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1">
                                    <span>📊 Critérios de Liquidez ({finalLiquidity}/10)</span>
                                  </div>
                                  <p className="text-[10px] text-slate-300 leading-relaxed">
                                    {!hasStreetData ? (
                                      <span className="text-amber-300 font-bold block mb-1">
                                        ⚠️ Sem dados na rua: Nenhuma transação registrada na via pública. Liquidez zerada (0/10).
                                      </span>
                                    ) : isCalibratedBadge ? (
                                      <span className="text-amber-300 font-bold block mb-1">
                                        ⚠️ Amostragem Calibrada: Dados locais insuficientes ({auc.itbiStreetCount || 0} na rua, {auc.itbiBuildingCount || 0} no prédio). Liquidez travada no teto máximo de {effectiveCeiling}/10.
                                      </span>
                                    ) : quality.hasNoLocalHistory ? (
                                      <span className="text-amber-300 font-bold block mb-1">
                                        ⚠️ Escuridão Amostral: Sem histórico de transações na via ou condomínio. Liquidez travada no teto de {quality.liquidityCeiling <= 1 ? '1.0/10' : '3.0/10'}.
                                      </span>
                                    ) : quality.hasFragileLocalHistory ? (
                                      <span className="text-amber-300 font-bold block mb-1">
                                        ⚠️ Amostragem Frágil: Poucas transações na via ({auc.itbiStreetCount || 0} na rua, {auc.itbiBuildingCount || 0} no prédio). Liquidez travada no teto máximo de 5.0/10.
                                      </span>
                                    ) : null}
                                    Giro factual estritamente apurado pela densidade de escrituras públicas (ITBI) registradas no condomínio/prédio, na rua, no raio geodésico do entorno e no bairro. Apartamentos exigem transações no condomínio para pontuação máxima (sem vendas no prédio, a liquidez fica calibrada em no máximo 5-6). Casas e comerciais avaliam diretamente a densidade da rua e entorno.
                                  </p>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Flip Rápido (60d) com Tooltip */}
                          <div className="relative group/flip flex flex-col justify-center cursor-help whitespace-nowrap">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider truncate whitespace-nowrap">
                                Flip Rápido (60d)
                              </span>
                              <Info className="w-2.5 h-2.5 text-slate-500" />
                            </div>
                            <span className="text-[11px] sm:text-xs xl:text-sm font-black text-slate-200 font-mono mt-0.5 whitespace-nowrap">
                              {flipPrice > 0 ? formatBRL(flipPrice) : 'Amostragem Insuficiente (Análise Manual)'}
                            </span>

                            {/* Tooltip de Flip Rápido */}
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover/flip:opacity-100 transition-opacity z-50 text-left">
                              <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1">
                                <span>⚡ Preço Sugerido p/ Revenda em 60 Dias</span>
                              </div>
                              <p className="text-[10px] text-slate-300 leading-relaxed">
                                90% do valor pericial de corte ITBI verificado, com depreciação de idade (Ross-Heidecke) quando aplicável para liquidação rápida.{auc.buildingSafetyValveApplied ? ' Aplicada válvula de segurança (-5%) por ausência de amostras no próprio condomínio.' : ''}
                              </p>
                            </div>
                          </div>

                        </div>
                        </>
                        )}

                        {/* Calibragem Rua vs Raio (se disponível) */}
                        {auc.streetRadiusCalibrated && auc.itbiSurroundingAvgSqm && auc.itbiStreetAvgSqm && (
                          <div className="border border-slate-800 bg-slate-950/40 px-3 py-1.5 rounded-lg text-[10px] text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <strong className="text-slate-200">Calibragem rua–raio:</strong>
                            <span>Rua R$ {auc.itbiStreetAvgSqm.toLocaleString('pt-BR')}/m² vs raio R$ {auc.itbiSurroundingAvgSqm.toLocaleString('pt-BR')}/m².</span>
                          </div>
                        )}

                        {/* MÓDULO 2: Benchmark de Mercado dos Portais na Rua - APENAS na aba Flip House */}
                        {mode === 'portais' && auc.origin === 'portal' && (() => {
                          const isRioDeJaneiroCity = (auc.state || 'RJ').toUpperCase() === 'RJ' && 
                            (auc.city || 'Rio de Janeiro').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('rio');
                          
                          const moradaSqm = (auc as any).moradaM2 || (auc as any).moradaVirtualM2;
                          const rawPortalSqm = moradaSqm && moradaSqm > 0
                            ? moradaSqm
                            : ((!auc.isBairroPortalFallback && auc.m2MercadoPortal && auc.m2MercadoPortal > 0)
                              ? auc.m2MercadoPortal
                              : (auc.streetPortalAvgSqm && auc.streetPortalAvgSqm > 0 ? auc.streetPortalAvgSqm : 0));

                          // Filtro Visual de Sanidade: Descartar m² < R$ 1.500/m² no RJ para evitar dados de aluguel/locação
                          const hasValidSalePortal = rawPortalSqm > 0 && (!isRioDeJaneiroCity || rawPortalSqm >= 1500);

                          return (
                            <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-xs">
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 w-full justify-between">
                                {hasValidSalePortal ? (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase font-mono text-slate-400">Portais Imobiliários - Metro Quadrado Rua:</span>
                                    <span className="font-mono font-bold text-slate-100 text-[12px]">
                                      {formatBRL(rawPortalSqm)}/m²
                                    </span>
                                    {auc.portalSampleCount ? (
                                      <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                                        ({auc.portalSampleCount.toLocaleString('pt-BR')} anúncios na via · Morada Virtual)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                                        (Morada Virtual)
                                      </span>
                                    )}
                                    {auc.portalTypologyAvgPrice ? (
                                      <span className="text-[10px] text-slate-400 hidden md:inline">
                                        · Preço médio anúncios: <strong className="text-slate-200 font-mono">{formatBRL(auc.portalTypologyAvgPrice)}</strong>
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-[10px] font-bold uppercase font-mono text-slate-400">Portais Imobiliários:</span>
                                    <span className="font-mono font-semibold text-slate-400 text-[11px]">
                                      Rua não encontrada no Morada Virtual
                                    </span>
                                  </div>
                                )}

                                {auc.portalStreetUrl && (
                                  <a
                                    href={auc.portalStreetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5 transition-colors underline ml-auto"
                                    title="Ver análise completa da rua no Morada Virtual"
                                  >
                                    <span>Análise da Rua</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* METADADOS E AVISOS DO IMÓVEL NO FINAL DO CARD (RESTAURADOS INTEGRALMENTE) */}
                        <div className="flex flex-wrap gap-2 pt-2.5 border-t border-slate-800/80 items-center">
                          
                          {/* Ocupação (Aviso com cor viva e nítida) */}
                          <span className={`text-[11px] font-black flex items-center space-x-1 px-2.5 py-0.5 rounded-full border ${
                            auc.occupied 
                              ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600/50' 
                              : 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600/50'
                          }`}>
                            <span>● {auc.occupied ? 'Ocupado' : 'Desocupado'}</span>
                          </span>

                          {/* Financiamento */}
                          {auc.allowsFinancing && (
                            <span className="text-[11px] bg-slate-800/80 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                              ✓ Financiamento
                            </span>
                          )}

                          {/* Parcelamento */}
                          {auc.allowsInstallments && (
                            <span className="text-[11px] bg-slate-800/80 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                              ✓ Parcelamento
                            </span>
                          )}

                          {/* Ver no Mapa (Verde vibrante em destaque) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMapProperty(auc);
                            }}
                            className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 px-3 py-0.5 rounded-full font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            title="Localizar imóvel no Mapa Georreferenciado"
                          >
                            <MapPin className="w-3 h-3 text-white" />
                            <span>Ver no Mapa</span>
                          </button>

                          {/* Alerta de Comunidade / Risco Perimetral (Aviso com cor semântica) */}
                          {(() => {
                            const communityName = auc.isCommunityRisk ? auc.communityName : auc.nearbyCommunityName;
                            const faction = auc.isCommunityRisk ? auc.factionName : auc.nearbyFactionName;
                            const distance = auc.isCommunityRisk ? auc.communityDistanceM : auc.nearbyCommunityDistanceM;
                            if (!communityName) return null;
                            const isCritical = !!auc.isCommunityRisk;
                            return (
                              <span
                                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                                  isCritical
                                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                                    : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                }`}
                                title={isCritical ? 'Faixa crítica abaixo de 200m: reduz valor de venda e liquidez.' : 'Entre 200m e 500m: informativo.'}
                              >
                                <AlertTriangle className={`w-3 h-3 shrink-0 ${isCritical ? 'text-rose-400' : 'text-amber-400'}`} />
                                <span>
                                  {isCritical ? 'ÁREA CRÍTICA' : 'PRÓX. COMUNIDADE'}: {communityName}{faction ? ` (${faction})` : ''} • {distance === 0 ? 'dentro' : `~${distance || 0}m`}
                                </span>
                              </span>
                            );
                          })()}

                          {/* ITBI Rua vs Entorno */}
                          {auc.itbiIsDerivedSqm ? (
                            <span className="text-[11px] bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded-full font-mono" title="ITBI Homogeneizado NBR 14.653 Juiz de Fora">
                              🏛️ ITBI JF: <strong className="text-emerald-400">{auc.itbiStreetAvgSqm || auc.itbiUnitValueAvg ? `R$ ${(auc.itbiStreetAvgSqm || auc.itbiUnitValueAvg || 0).toLocaleString('pt-BR')}/m²` : 'Sem dados'}</strong>
                              {auc.estimatedValue ? <span className="text-slate-300"> ({formatBRL(auc.estimatedValue)})</span> : null}
                              {auc.itbiCompraEVendaCount ? <span className="text-slate-400"> • {auc.itbiCompraEVendaCount} tx</span> : null}
                            </span>
                          ) : auc.itbiIsAbsolutePricing ? (
                            <span className="text-[11px] bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded-full font-mono" title="Média oficial de ITBI Juiz de Fora (Compra e Venda)">
                              🏛️ ITBI JF: <strong className="text-emerald-400">{auc.estimatedValue ? formatBRL(auc.estimatedValue) : 'Sem dados'}</strong>
                              {auc.itbiCompraEVendaCount ? <span className="text-slate-400"> ({auc.itbiCompraEVendaCount} tx Compra e Venda)</span> : null}
                            </span>
                          ) : (
                            <span className="text-[11px] bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded-full font-mono" title="Média oficial de ITBI">
                              🏛️ ITBI RUA: <strong className="text-slate-200">{(auc.itbiStreetCount && auc.itbiStreetCount > 0 && auc.itbiStreetAvgSqm) ? `${formatBRL(auc.itbiStreetAvgSqm)}/m²` : 'Sem dados'}</strong> | ENTORNO: <strong className="text-slate-200">{auc.itbiUnitValueAvg ? `${formatBRL(auc.itbiUnitValueAvg)}/m²` : '-'}</strong>
                            </span>
                          )}

                          {/* Potencial IA */}
                          {auc.aiAppreciationScore && (
                            <span className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                              ★ Potencial IA: {auc.aiAppreciationScore}/10
                            </span>
                          )}

                        </div>

                      </div>

                      {/* Footer com Ações */}
                      <div className="bg-slate-950/60 border-t border-slate-800/90 px-5 py-3.5 flex items-center justify-between">
                        <button
                          onClick={() => setSimulatingAuction(auc)}
                          className={`px-4 py-2 text-white font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer active:scale-95 ${
                            auc.transactionType === 'aluguel'
                              ? 'bg-emerald-600 hover:bg-emerald-500'
                              : auc.origin === 'portal'
                              ? 'bg-amber-600 hover:bg-amber-500'
                              : 'bg-indigo-600 hover:bg-indigo-500'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{auc.transactionType === 'aluguel' ? 'Simular Locação (Calculadora)' : auc.origin === 'portal' ? 'Simular Viabilidade (Flip)' : 'Simular Viabilidade & Jurídico'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center space-x-2">
                          {auc.auctionLink && (
                            <a
                              href={auc.auctionLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 flex items-center gap-1"
                              title={auc.transactionType === 'aluguel' ? "Acessar anúncio de locação no portal" : auc.origin === 'portal' ? "Acessar anúncio original no portal" : "Acessar edital/anúncio original"}
                            >
                              <span>{auc.transactionType === 'aluguel' ? 'Ver Anúncio de Locação' : auc.origin === 'portal' ? 'Ver Anúncio' : 'Acessar Leilão'}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              onUpdateProperty({ id: auc.id, saved: !auc.saved });
                            }}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              auc.saved
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                            }`}
                            title={auc.saved ? 'Remover dos salvos' : 'Salvar oportunidade no perfil'}
                          >
                            <Bookmark className={`w-4 h-4 ${auc.saved ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Deseja remover este lote da base de garimpo?')) {
                                onDeleteAuction(auc.id);
                              }
                            }}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                            title="Remover leilão"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

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

        {/* MODAL: MAPA FOCADO NO IMÓVEL SELECIONADO ("Ver no Mapa" no Card) */}
        {selectedMapProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-[96vw] lg:max-w-6xl h-[90vh] bg-slate-900 border border-slate-750 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              <PropertyMap
                auctions={auctions}
                itbiStats={itbiStats}
                onUpdateProperty={onUpdateProperty}
                initialSelectedPropertyId={selectedMapProperty.id}
                onSelectPropertyFromMap={(id) => {
                  const found = auctions.find(a => a.id === id);
                  if (found) {
                    setSelectedMapProperty(null);
                    setSimulatingAuction(found);
                  }
                }}
                onClose={() => setSelectedMapProperty(null)}
              />
            </div>
          </div>
        )}

        {/* MODAL: MAPA GERAL EM TELA CHEIA (Expandir no Sidebar ou no Feed) */}
        {isGeneralMapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-[96vw] lg:max-w-6xl h-[90vh] bg-slate-900 border border-slate-750 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              <PropertyMap
                auctions={auctions}
                itbiStats={itbiStats}
                onUpdateProperty={onUpdateProperty}
                initialFilteredAuctions={filteredAndSortedAuctions}
                initialSelectedPropertyId={hoveredPropertyId || undefined}
                onSelectPropertyFromMap={(id) => {
                  const found = auctions.find(a => a.id === id);
                  if (found) {
                    setIsGeneralMapModalOpen(false);
                    setSimulatingAuction(found);
                  }
                }}
                onClose={() => setIsGeneralMapModalOpen(false)}
              />
            </div>
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
    </div>
  );
}
