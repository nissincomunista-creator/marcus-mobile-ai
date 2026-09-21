import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AuctionProperty, BRAZIL_STATES, VALID_ITBI_CITIES_BY_STATE } from '../types.ts';
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
import LightboxModal from './LightboxModal.tsx';
import { getAvailableZonesForCity, isNeighborhoodInZone } from '../utils/cityZones.ts';
import { cleanDivergentNotice } from '../utils/auctionLocation.ts';

interface DashboardProps {
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
  onGarimparPortais: (city?: string) => void;
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
  const [capitalBudget, setCapitalBudget] = useState<string>('');
  const [caixaSubModes, setCaixaSubModes] = useState<{ vendaDireta: boolean; licitacao: boolean; leilaoSfi: boolean }>({
    vendaDireta: true,
    licitacao: true,
    leilaoSfi: true
  });

  // Feed state
  const [temporalSortMode, setTemporalSortMode] = useState<'neutral' | 'urgent' | 'newest'>('neutral');
  const [strategyFilters, setStrategyFilters] = useState<{
    liquidity: boolean;
    roi: boolean;
    profit: boolean;
    price: boolean;
  }>({
    liquidity: false,
    roi: false,
    profit: false,
    price: false
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
      return true;
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
  }, [selectedAuctioneerFilter, selectedOriginFilter]);

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
  }, [auctions, checkOriginMatch, selectedStateFilter, selectedCityFilter]);

  // Filtered neighborhoods based on sidebar search
  const visibleNeighborhoods = useMemo(() => {
    if (!neighborhoodSearch.trim()) return uniqueNeighborhoodsWithCount;
    const query = normalizeText(neighborhoodSearch);
    return uniqueNeighborhoodsWithCount.filter(n => normalizeText(n.name).includes(query));
  }, [uniqueNeighborhoodsWithCount, neighborhoodSearch]);

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
    const isCaixaAuction = auc.origin === 'caixa' || auc.origin === 'caixa_radar' || auc.id.startsWith('auc-caixa');
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
      else if (isCaixaAuction) mode = 'Venda Direta Online';
      else mode = 'Leilão Online';
    }

    const modeLower = (mode || '').toLowerCase();
    
    if (modeLower.includes('venda direta')) {
      return {
        label: modeLower.includes('online') ? 'Venda Direta Online' : 'Venda Direta',
        type: 'venda_direta',
        icon: '🤝',
        className: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-xs'
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

    // Min / Max price filters
    const minP = Number(minPriceInput);
    if (!isNaN(minP) && minP > 0) {
      result = result.filter(a => a.auctionPrice >= minP);
    }
    const maxP = Number(maxPriceInput || maxPriceFilter);
    if (!isNaN(maxP) && maxP > 0) {
      result = result.filter(a => a.auctionPrice <= maxP);
    }

    // Caixa sub-modes filter
    if (selectedOriginFilter === 'caixa') {
      result = result.filter(a => {
        const badge = getSaleModeBadge(a);
        if (badge.type === 'venda_direta' && !caixaSubModes.vendaDireta) return false;
        if (badge.type === 'licitacao_aberta' && !caixaSubModes.licitacao) return false;
        if (badge.type === 'leilao_sfi' && !caixaSubModes.leilaoSfi) return false;
        return true;
      });
    }

    // Yield / Profit filters
    if (onlyHighReturn) {
      result = result.filter(a => (a.calculatedRoi || 0) >= 40 && (a.liquidityScore || 0) >= 7);
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

    // Temporal toggle (Urgência vs Novidades vs Neutro)
    if (temporalSortMode === 'urgent') {
      // Sort by closing date (firstAuctionDate or auctionDate) ascending
      result.sort((a, b) => {
        const dateA = a.firstAuctionDate || a.auctionDate || '9999-12-31';
        const dateB = b.firstAuctionDate || b.auctionDate || '9999-12-31';
        return dateA.localeCompare(dateB);
      });
      return result;
    } else if (temporalSortMode === 'newest') {
      // Sort by inclusion / ID descending
      result.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      return result;
    }

    // Ranqueamento das Estratégias Ativas (Sem ocultar imóveis - ordena do maior para o menor) ou Ordenação Padrão
    const activeStrategiesCount = (strategyFilters.liquidity ? 1 : 0) +
                                  (strategyFilters.roi ? 1 : 0) +
                                  (strategyFilters.profit ? 1 : 0) +
                                  (strategyFilters.price ? 1 : 0);

    result.sort((a, b) => {
      if (activeStrategiesCount > 0) {
        if (activeStrategiesCount === 1) {
          if (strategyFilters.liquidity) return (b.liquidityScore || 0) - (a.liquidityScore || 0);
          if (strategyFilters.roi) return (b.calculatedRoi || 0) - (a.calculatedRoi || 0);
          if (strategyFilters.profit) return (b.calculatedProfit || 0) - (a.calculatedProfit || 0);
          if (strategyFilters.price) return a.auctionPrice - b.auctionPrice;
        }

        // Se ROI e Liquidez estiverem ativos juntos: combinação direta consagrada
        if (strategyFilters.roi && strategyFilters.liquidity && activeStrategiesCount === 2) {
          const scoreA = (a.calculatedRoi || 0) * Math.pow(Math.max(1, a.liquidityScore || 1), 1.5);
          const scoreB = (b.calculatedRoi || 0) * Math.pow(Math.max(1, b.liquidityScore || 1), 1.5);
          return scoreB - scoreA;
        }

        // 2 ou mais selecionadas: score normalizado multi-critério equilibrado (0-100 pts por critério)
        let scoreA = 0;
        let scoreB = 0;
        if (strategyFilters.roi) {
          scoreA += Math.min(100, Math.max(0, a.calculatedRoi || 0));
          scoreB += Math.min(100, Math.max(0, b.calculatedRoi || 0));
        }
        if (strategyFilters.liquidity) {
          scoreA += Math.min(100, Math.max(0, (a.liquidityScore || 0) * 10));
          scoreB += Math.min(100, Math.max(0, (b.liquidityScore || 0) * 10));
        }
        if (strategyFilters.profit) {
          scoreA += Math.min(100, Math.max(0, (a.calculatedProfit || 0) / 2500));
          scoreB += Math.min(100, Math.max(0, (b.calculatedProfit || 0) / 2500));
        }
        if (strategyFilters.price) {
          scoreA += Math.min(100, Math.max(0, (350000 - a.auctionPrice) / 3500));
          scoreB += Math.min(100, Math.max(0, (350000 - b.auctionPrice) / 3500));
        }
        return scoreB - scoreA;
      }

      const activeSortKey = sortBy || 'roi';
      if (activeSortKey === 'profit') return (b.calculatedProfit || 0) - (a.calculatedProfit || 0);
      if (activeSortKey === 'roi') return (b.calculatedRoi || 0) - (a.calculatedRoi || 0);
      if (activeSortKey === 'liquidity') return (b.liquidityScore || 0) - (a.liquidityScore || 0);
      if (activeSortKey === 'price_asc') return a.auctionPrice - b.auctionPrice;
      if (activeSortKey === 'price_desc') return b.auctionPrice - a.auctionPrice;
      if (activeSortKey === 'closing_date') {
        const dA = a.firstAuctionDate || a.auctionDate || '9999-12-31';
        const dB = b.firstAuctionDate || b.auctionDate || '9999-12-31';
        return dA.localeCompare(dB);
      }
      return (b.calculatedRoi || 0) - (a.calculatedRoi || 0);
    });

    return result;
  }, [
    auctions,
    checkOriginMatch,
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
    caixaSubModes,
    onlyHighReturn,
    minRoiFilter,
    onlyAnalysisAboveEdital,
    itbiConfidenceFilter,
    capitalBudget,
    temporalSortMode,
    strategyFilters,
    sortBy,
    getSaleModeBadge
  ]);

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
    setMinPriceInput('');
    setMaxPriceInput('');
    if (setMaxPriceFilter) setMaxPriceFilter('');
    setPaymentFilter('');
    setMinRoiFilter(0);
    setOnlyHighReturn(false);
    setOnlyAnalysisAboveEdital(false);
    setItbiConfidenceFilter('all');
    setCapitalBudget('');
    setTemporalSortMode('neutral');
    setStrategyFilters({
      liquidity: false,
      roi: false,
      profit: false,
      price: false
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

  useEffect(() => {
    if (autoPortalSearchIds.current.size >= 2) return;
    const pending = filteredAndSortedAuctions
      .slice(0, Math.min(visibleCount, 8))
      .filter(auc => !auc.portalDataVerifiedAt && !autoPortalSearchIds.current.has(auc.id))
      .slice(0, 2 - autoPortalSearchIds.current.size);

    pending.forEach(auc => {
      autoPortalSearchIds.current.add(auc.id);
      void refreshCardPortalData(auc);
    });
  }, [filteredAndSortedAuctions, visibleCount, refreshCardPortalData]);

  const formatBRL = (val?: number) => {
    if (val === undefined || isNaN(val)) return 'R$ -';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const formatAuctionDate = (date?: string) => {
    if (!date) return 'Data a definir';
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('pt-BR');
  };

  const getAuctionHost = (auctionLink?: string) => {
    if (!auctionLink) return 'Oficial';
    try {
      return new URL(auctionLink).hostname.replace(/^www\./, '');
    } catch {
      return 'Oficial';
    }
  };

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

            {/* 1. SELETOR VERTICAL DE MODALIDADE */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Modalidade de Aquisição
              </label>
              
              <div className="space-y-1.5">
                {[
                  { id: 'todos', label: 'Todos os Imóveis', icon: Layers, desc: 'Caixa + Judiciais + Extrajudiciais', color: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300' },
                  { id: 'caixa', label: 'Imóveis Caixa', icon: Building2, desc: 'Venda Direta / Licitação / SFI', color: 'border-blue-500/50 bg-blue-950/40 text-blue-300' },
                  { id: 'judicial', label: 'Leilões Judiciais', icon: Gavel, desc: 'Varas Cíveis e Trabalhistas', color: 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300' },
                  { id: 'extrajudicial', label: 'Leilões Extrajudiciais', icon: FileText, desc: 'Alienação Fiduciária & Bancos', color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300' },
                  { id: 'portal', label: 'Portais (Flip Rápido)', icon: Sparkles, desc: 'Descontos no Zap & QuintoAndar', color: 'border-amber-500/50 bg-amber-950/40 text-amber-300' }
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
              </div>

              {/* Sub-opções específicas quando Caixa estiver selecionada */}
              {selectedOriginFilter === 'caixa' && (
                <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">
                    Sub-modalidades Caixa
                  </span>
                  <div className="space-y-1 text-xs">
                    <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={caixaSubModes.vendaDireta}
                        onChange={e => setCaixaSubModes(prev => ({ ...prev, vendaDireta: e.target.checked }))}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Venda Direta Online</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={caixaSubModes.licitacao}
                        onChange={e => setCaixaSubModes(prev => ({ ...prev, licitacao: e.target.checked }))}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Licitação Aberta</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={caixaSubModes.leilaoSfi}
                        onChange={e => setCaixaSubModes(prev => ({ ...prev, leilaoSfi: e.target.checked }))}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Leilão SFI (1º/2º Leilão)</span>
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
                      <span>Portais Extrajudiciais</span>
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
                  <div className="max-h-64 overflow-y-auto space-y-1.5 text-xs pr-1">
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

            {/* 2. FILTRO CASCATA DE LOCALIZAÇÃO (Estado -> Cidade -> Bairros) */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Localização Geográfica
              </label>

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
                  className="w-full text-xs font-bold border border-slate-700 rounded-xl p-2.5 bg-slate-950 text-slate-100 hover:bg-slate-900 focus:border-indigo-500 outline-none transition-colors cursor-pointer"
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
                        className="w-full text-xs border border-slate-700 rounded-xl pl-8 pr-3 py-2 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none"
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
                              // Auto sync state
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

              {/* Bairros Multi-select com Checkboxes e Busca Interna */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase font-mono">Bairros</span>
                  <div className="space-x-2">
                    <button
                      onClick={handleSelectAllNeighborhoods}
                      className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      onClick={handleClearNeighborhoods}
                      className="text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      Nenhum
                    </button>
                  </div>
                </div>

                {/* Input de busca rápida no bairro */}
                <input
                  type="text"
                  placeholder="Filtrar bairro..."
                  value={neighborhoodSearch}
                  onChange={e => setNeighborhoodSearch(e.target.value)}
                  className="w-full text-[11px] border border-slate-750 rounded-lg px-2.5 py-1.5 bg-slate-950 text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none"
                />

                {/* Lista de Checkboxes */}
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-xs">
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
            </div>

            {/* 3. TIPO DE IMÓVEL */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Tipo de Imóvel
              </label>
              <select
                value={selectedTypeFilter}
                onChange={e => setSelectedTypeFilter(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-700 rounded-xl p-2.5 bg-slate-950 text-slate-100 hover:bg-slate-900 focus:border-indigo-500 outline-none transition-colors cursor-pointer"
              >
                <option value="">Todos os Tipos de Imóvel</option>
                <option value="Apartamento">Apartamento</option>
                <option value="Casa">Casa</option>
                <option value="Terreno">Terreno / Lote</option>
                <option value="Comercial">Comercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Rural">Rural</option>
              </select>
            </div>

            {/* 4. FAIXA DE PREÇO / LANCE MÍNIMO E MÁXIMO */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Faixa de Preço (R$)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9.5px] text-slate-500 block mb-0.5">Lance Mínimo</span>
                  <input
                    type="number"
                    placeholder="R$ 0"
                    value={minPriceInput}
                    onChange={e => setMinPriceInput(e.target.value)}
                    className="w-full text-xs border border-slate-750 rounded-xl p-2 bg-slate-950 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[9.5px] text-slate-500 block mb-0.5">Lance Máximo</span>
                  <input
                    type="number"
                    placeholder="Sem limite"
                    value={maxPriceInput}
                    onChange={e => {
                      setMaxPriceInput(e.target.value);
                      if (setMaxPriceFilter) setMaxPriceFilter(e.target.value);
                    }}
                    className="w-full text-xs border border-slate-750 rounded-xl p-2 bg-slate-950 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 5. PAINEL RENDIMENTO & LUCRO */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Rendimento & Lucro
              </label>

              {/* Botão Rápido Alto Retorno */}
              <button
                onClick={() => setOnlyHighReturn(prev => !prev)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                  onlyHighReturn
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                    : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-850 border-slate-750'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Alto Retorno (ROI ≥ 40% & Score ≥ 7)</span>
                </div>
                {onlyHighReturn && <Check className="w-3.5 h-3.5" />}
              </button>

              {/* Slider de ROI Mínimo */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">ROI Mínimo:</span>
                  <span className="font-mono text-indigo-400 font-bold">{minRoiFilter}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minRoiFilter}
                  onChange={e => setMinRoiFilter(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Checkbox Análise > Edital */}
              <label className="flex items-center space-x-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyAnalysisAboveEdital}
                  onChange={e => setOnlyAnalysisAboveEdital(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>Análise Real &gt; Avaliação do Edital</span>
              </label>

              {/* Confiança ITBI */}
              <div className="pt-1">
                <span className="text-[10px] text-slate-400 block mb-1">Certeza do Gabarito ITBI</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setItbiConfidenceFilter('all')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      itbiConfidenceFilter === 'all'
                        ? 'bg-slate-750 text-white border-slate-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Todos os Lotes
                  </button>
                  <button
                    onClick={() => setItbiConfidenceFilter('verified')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      itbiConfidenceFilter === 'verified'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ★ Alta Certeza (Rua)
                  </button>
                </div>
              </div>
            </div>

            {/* 6. ALOCAÇÃO DE CAPITAL (Orçamento Numérico) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Alocação por Capital</span>
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              </label>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500">Seu orçamento disponível (R$):</span>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">R$</span>
                  <input
                    type="number"
                    placeholder="Ex: 200000"
                    value={capitalBudget}
                    onChange={e => setCapitalBudget(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-750 rounded-xl pl-9 pr-3 py-2 bg-slate-950 text-emerald-400 placeholder-slate-600 outline-none focus:border-emerald-500"
                  />
                </div>
                {capitalBudget && Number(capitalBudget) > 0 && (
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-[10px] text-emerald-300 font-mono">
                    Filtrando lotes que cabem em {formatBRL(Number(capitalBudget))} (à vista ou com 5% de entrada).
                  </div>
                )}
              </div>
            </div>

          </div>
        </aside>

        {/* ============================================================== */}
        {/* RIGHT FEED AREA: CONTADOR, ORDENAÇÃO, TOGGLE E CARDS (72% width) */}
        {/* ============================================================== */}
        <main className="flex-1 min-w-0 space-y-4">
          
          {/* Top Bar do Feed: Oportunidades, Ordenação, Temporal Toggle e Salvar Busca */}
          <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-3.5">
            
            {/* Linha 1: Contador à esquerda, Controles Temporais e Salvar Busca à direita */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              
              {/* Esquerda: Contador Dinâmico */}
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-black text-white font-display">
                      {filteredAndSortedAuctions.length} {filteredAndSortedAuctions.length === 1 ? 'Oportunidade Encontrada' : 'Oportunidades Encontradas'}
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {selectedStateFilter ? `Filtrando em ${selectedStateFilter}` : 'Varredura nacional ativa'} • Auditado via ITBI Municipal
                  </p>
                </div>
              </div>

              {/* Direita: Toggle Temporal e Salvar Busca */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Toggle Temporal: Padrão, Data de Encerramento, Inclusão Recente */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setTemporalSortMode('neutral')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      temporalSortMode === 'neutral'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Critério neutro por relevância"
                  >
                    Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemporalSortMode('urgent')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      temporalSortMode === 'urgent'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Próximas praças e encerramentos iminentes"
                  >
                    <Flame className="w-3 h-3 text-amber-300" />
                    <span>Data de Encerramento</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemporalSortMode('newest')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      temporalSortMode === 'newest'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Lotes recém adicionados e garimpados"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-300" />
                    <span>Inclusão Recente</span>
                  </button>
                </div>

                {/* Botão Salvar Busca */}
                <button
                  type="button"
                  onClick={handleSaveSearch}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl border border-slate-700 font-bold text-xs transition-all flex items-center space-x-1 cursor-pointer"
                  title="Salvar esta configuração de filtros para acessos futuros"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Salvar busca</span>
                </button>

              </div>
            </div>

            {/* Linha 2: 4 Botões de Estratégia (Multi-seleção Independente dos 4 Filtros) */}
            <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-800/80 w-full">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold mr-1">ESTRATÉGIA:</span>
              
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
                onClick={() => setStrategyFilters(prev => ({ ...prev, price: !prev.price }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  strategyFilters.price
                    ? 'bg-teal-600 text-white border-teal-400 shadow-md shadow-teal-500/20 ring-2 ring-teal-400/40'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                }`}
              >
                <span>🏷️ Menor Preço</span>
                {strategyFilters.price && <Check className="w-3 h-3 text-white" />}
              </button>

              {(strategyFilters.liquidity || strategyFilters.roi || strategyFilters.profit || strategyFilters.price) && (
                <button
                  type="button"
                  onClick={() => setStrategyFilters({ liquidity: false, roi: false, profit: false, price: false })}
                  className="text-[11px] text-slate-400 hover:text-rose-400 font-bold cursor-pointer transition-colors mr-2"
                >
                  Limpar Estratégias
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsGeneralMapModalOpen(true)}
                className="text-xs text-emerald-300 hover:text-white font-bold px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 transition-all cursor-pointer border border-emerald-500/40 shadow-sm flex items-center gap-1.5 ml-auto"
                title="Abrir todos os imóveis filtrados no Mapa Georreferenciado"
              >
                <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>🗺️ Mapa ({filteredAndSortedAuctions.length})</span>
              </button>
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
                  const repairCost = auc.estimatedRepair || Math.round(auc.auctionPrice * 0.05);
                  const condoDebt = auc.pendingCondoCost || (auc.origin === 'caixa' ? Math.round(((auc as any).evaluationPrice || auc.estimatedValue || auc.auctionPrice * 1.5) * 0.10) : (auc.pendingDebts || 0));
                  const totalCost = auc.auctionPrice + repairCost + condoDebt + (auc.otherCosts || (auc.itbiCost || 0) + (auc.notaryCost || 0));
                  const isSelected = selectedAuctionId === auc.id;
                  const isVerifiedValuation = auc.valuationConfidence === 'verified' && (auc.itbiStreetCount || 0) > 0;
                  const isFeatured = isVerifiedValuation && (auc.calculatedRoi || 0) >= 40 && (auc.liquidityScore || 0) >= 7;

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
                          : isFeatured
                          ? 'border-indigo-500/50 ring-1 ring-indigo-500/30'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="p-5 sm:p-6 space-y-4">
                        
                        {/* Header do Card com Badges, Título e Thumbnail Clicável */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            
                            {/* Badges de Status e Avisos dos Cards */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="bg-slate-800 text-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-lg border border-slate-700">
                                {auc.propertyType} • {auc.sizeSqm} m²
                                {auc.bedrooms ? ` • ${auc.bedrooms} qto${auc.bedrooms > 1 ? 's' : ''}` : ''}
                              </span>

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

                              {/* Badge Oficial do Portal Zuk */}
                              {(auc.leiloeiro === 'Portal Zuk' || (auc.auctionLink && auc.auctionLink.includes('portalzuk')) || (auc.id && auc.id.includes('portalzuk'))) && (
                                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-500/60 shadow-xs flex items-center gap-1">
                                  <span>🏛️</span>
                                  <span>Portal Zuk</span>
                                </span>
                              )}

                              {/* Risco (Aviso com alto contraste e cores vivas) */}
                              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                                auc.riskLevel === 'Baixo' ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600/50' :
                                auc.riskLevel === 'Médio' ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600/50' :
                                'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-600/50'
                              }`}>
                                Risco {auc.riskLevel || 'Baixo'}
                              </span>

                              {isFeatured && (
                                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/50 flex items-center gap-0.5">
                                  ★ Destaque
                                </span>
                              )}
                            </div>

                            {/* Título e Endereço */}
                            <div>
                              <h3 
                                className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug hover:text-indigo-300 transition-colors cursor-pointer"
                                onClick={() => setSimulatingAuction(auc)}
                                title={auc.title}
                              >
                                {auc.title}
                              </h3>
                              <div className="flex items-center text-xs text-slate-400 space-x-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate" title={`${auc.address} (${auc.neighborhood} - ${auc.city}/${auc.state || 'RJ'})`}>
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

                            {/* Informações complementares de praça */}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-400 font-mono">
                              <span>Portal: <strong className={
                                (auc.leiloeiro === 'Portal Zuk' || (auc.auctionLink && auc.auctionLink.includes('portalzuk')))
                                  ? "text-purple-300 font-bold"
                                  : "text-slate-200"
                              }>
                                {(auc.leiloeiro === 'Portal Zuk' || (auc.auctionLink && auc.auctionLink.includes('portalzuk')))
                                  ? "Portal Zuk (Zukerman)"
                                  : getAuctionHost(auc.auctionLink)}
                              </strong></span>
                              <span>1ª Praça: <strong className="text-slate-200">{formatAuctionDate(auc.firstAuctionDate || auc.auctionDate)}</strong></span>
                              {auc.secondAuctionDate && (
                                <span>2ª Praça: <strong className="text-slate-200">{formatAuctionDate(auc.secondAuctionDate)}</strong></span>
                              )}
                            </div>

                          </div>

                          {/* Thumbnail com clique para Lightbox Modal */}
                          <div className="shrink-0">
                            <PropertyThumbnail
                              property={auc}
                              size="lg"
                              className="rounded-xl shadow-md"
                              onClick={() => setSelectedLightboxProperty(auc)}
                            />
                          </div>
                        </div>

                        {/* Grid Financeiro: Linha 1 (Lance, Custo Total, Lucro Estimado, Gabarito ITBI) - NÚMEROS NEUTROS */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                          
                          {/* Lance Mínimo */}
                          <div className="flex flex-col justify-center">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                              Lance Mínimo
                            </span>
                            <span className="text-xs sm:text-sm font-normal text-white font-mono mt-0.5">
                              {formatBRL(auc.auctionPrice)}
                            </span>
                          </div>

                          {/* Custo Total Est. com Tooltip */}
                          <div className="relative group/cost flex flex-col justify-center cursor-help">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                                Custo Total
                              </span>
                              <Info className="w-2.5 h-2.5 text-slate-500" />
                            </div>
                            <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5">
                              {formatBRL(totalCost)}
                            </span>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-0 mb-2 w-60 p-2.5 bg-slate-950 text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover/cost:opacity-100 transition-opacity z-50 text-[10px] space-y-1">
                              <div className="font-bold text-indigo-300 border-b border-slate-800 pb-1">Composição do Custo</div>
                              <div className="flex justify-between"><span>Lance:</span><strong>{formatBRL(auc.auctionPrice)}</strong></div>
                              <div className="flex justify-between"><span>Reforma Est. (5%):</span><strong>{formatBRL(repairCost)}</strong></div>
                              <div className="flex justify-between"><span>Dívidas/Condomínio:</span><strong>{formatBRL(condoDebt)}</strong></div>
                              <div className="flex justify-between"><span>ITBI & Custos:</span><strong>{formatBRL(auc.otherCosts || 0)}</strong></div>
                            </div>
                          </div>

                          {/* Lucro Estimado Real com valor neutro limpo */}
                          <div className="flex flex-col justify-center">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                              Lucro Real Est.
                            </span>
                            <span className="text-xs sm:text-sm font-normal text-slate-200 font-mono mt-0.5">
                              {auc.calculatedProfit ? formatBRL(auc.calculatedProfit) : 'Sob análise'}
                            </span>
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

                            {/* Tooltip pericial */}
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover/itbi:opacity-100 transition-opacity z-50 text-left">
                              <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1">
                                <span>🏛️ Base Pericial ITBI Municipal</span>
                              </div>
                              <p className="text-[10px] text-slate-300 leading-relaxed">
                                Base apurada no registro de escrituras públicas da Prefeitura para esta via e bairro (Norma ABNT NBR 14.653 com saneamento Chauvenet).
                              </p>
                              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[9.5px] font-mono text-slate-400 flex justify-between">
                                <span>Unitário Apurado:</span>
                                <strong className="text-slate-200">R$ {(auc.itbiStreetAvgSqm || auc.itbiUnitValueAvg || 0).toLocaleString('pt-BR')}/m²</strong>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Grid Financeiro: Linha 2 (ROI, Avaliação Edital, Liquidez, Flip Rápido 60d) - NÚMEROS NEUTROS */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                          
                          {/* ROI Projetado */}
                          <div className="flex flex-col justify-center">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                              ROI Projetado
                            </span>
                            <span className="text-xs sm:text-sm font-black font-mono text-slate-200 mt-0.5">
                              {auc.calculatedRoi !== undefined ? `${auc.calculatedRoi}%` : 'Sob análise'}
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
                          <div className="relative group/liq flex flex-col justify-center cursor-help">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Liquidez</span>
                              <Info className="w-2.5 h-2.5 text-slate-500" />
                            </div>
                            <span className="text-xs sm:text-sm font-black font-mono text-slate-200 mt-0.5">
                              {auc.liquidityScore || 5}/10
                            </span>

                            {/* Tooltip de Liquidez */}
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover/liq:opacity-100 transition-opacity z-50 text-left">
                              <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1">
                                <span>📊 Critérios de Liquidez ({auc.liquidityScore || 5}/10)</span>
                              </div>
                              <p className="text-[10px] text-slate-300 leading-relaxed">
                                Nota calculada pela velocidade de escrituração da via, atratividade da margem e facilidade de desocupação do lote.
                              </p>
                            </div>
                          </div>

                          {/* Flip Rápido (60d) com Tooltip */}
                          <div className="relative group/flip flex flex-col justify-center cursor-help">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider truncate">
                                Flip Rápido (60d)
                              </span>
                              <Info className="w-2.5 h-2.5 text-slate-500" />
                            </div>
                            <span className="text-[11px] sm:text-xs xl:text-sm font-black text-slate-200 font-mono mt-0.5 whitespace-nowrap">
                              {auc.vendaBaixaPrice ? formatBRL(auc.vendaBaixaPrice) : 'Sob análise'}
                            </span>

                            {/* Tooltip de Flip Rápido */}
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover/flip:opacity-100 transition-opacity z-50 text-left">
                              <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1">
                                <span>⚡ Preço Sugerido p/ Revenda em 60 Dias</span>
                              </div>
                              <p className="text-[10px] text-slate-300 leading-relaxed">
                                90% do valor pericial de corte ITBI verificado, com depreciação de idade (Ross-Heidecke) quando aplicável para liquidação rápida.
                              </p>
                            </div>
                          </div>

                        </div>

                        {/* Calibragem Rua vs Raio (se disponível) */}
                        {auc.streetRadiusCalibrated && auc.itbiSurroundingAvgSqm && auc.itbiStreetAvgSqm && (
                          <div className="border border-slate-800 bg-slate-950/40 px-3 py-1.5 rounded-lg text-[10px] text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <strong className="text-slate-200">Calibragem rua–raio:</strong>
                            <span>Rua R$ {auc.itbiStreetAvgSqm.toLocaleString('pt-BR')}/m² vs raio R$ {auc.itbiSurroundingAvgSqm.toLocaleString('pt-BR')}/m².</span>
                          </div>
                        )}

                        {/* Média dos Portais Imobiliários (Zap / QuintoAndar) */}
                        <div className="border-t border-slate-800/80 pt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                          <div className="flex items-center space-x-2 text-slate-400">
                            <span className="text-[10px] font-bold uppercase font-mono">Portais na Rua:</span>
                            <span className="font-mono text-slate-200 text-[11px]">
                              {auc.streetPortalAvgSqm && auc.portalDataVerifiedAt 
                                ? `${formatBRL(auc.streetPortalAvgSqm)}/m²` 
                                : 'Anúncios da rua em verificação'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400">
                            <span>Zap: <strong className="text-slate-200">{auc.portalZapAvg ? formatBRL(auc.portalZapAvg) : '-'}</strong></span>
                            <span>QuintoAndar: <strong className="text-slate-200">{auc.portalQuintoAndarAvg ? formatBRL(auc.portalQuintoAndarAvg) : '-'}</strong></span>
                          </div>
                        </div>

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
                          <span className="text-[11px] bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded-full font-mono" title="Média oficial de ITBI">
                            🏛️ ITBI RUA: <strong className="text-slate-200">{auc.itbiStreetAvgSqm ? `${formatBRL(auc.itbiStreetAvgSqm)}/m²` : 'Sem dados'}</strong> | ENTORNO: <strong className="text-slate-200">{auc.itbiUnitValueAvg ? `${formatBRL(auc.itbiUnitValueAvg)}/m²` : '-'}</strong>
                          </span>

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
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Simular Viabilidade & Jurídico</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center space-x-2">
                          {auc.auctionLink && (
                            <a
                              href={auc.auctionLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 flex items-center gap-1"
                              title="Acessar edital/anúncio original"
                            >
                              <span>Acessar Leilão</span>
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
                    <h3 className="font-bold text-white text-base">
                      Simulação de Viabilidade & Jurídico
                    </h3>
                    <p className="text-xs text-slate-400">
                      {simulatingAuction.title} • {simulatingAuction.neighborhood}, {simulatingAuction.city} - {simulatingAuction.state}
                    </p>
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
                prefillData={{
                  ...simulatingAuction,
                  id: simulatingAuction.id,
                  title: simulatingAuction.title,
                  description: simulatingAuction.description,
                  auctionLink: simulatingAuction.auctionLink,
                  state: simulatingAuction.state || selectedStateFilter || 'RJ',
                  city: simulatingAuction.city,
                  neighborhood: simulatingAuction.neighborhood,
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
                }}
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
      </AnimatePresence>
    </div>
  );
}
