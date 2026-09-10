import React from 'react';
import { AuctionProperty, PropertyType, BRAZIL_STATES, VALID_ITBI_CITIES_BY_STATE } from '../types.ts';
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  AlertTriangle, 
  Eye, 
  Trash2, 
  LineChart, 
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Plus,
  HelpCircle,
  FileText,
  Sparkles,
  RefreshCw,
  Bookmark,
  Gavel,
  Link,
  ArrowUpDown,
  Gem,
  Gauge,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RealValueCalculator from './RealValueCalculator.tsx';
import PropertyMap from './PropertyMap.tsx';
import PropertyThumbnail from './PropertyThumbnail.tsx';
import { getAvailableZonesForCity, isNeighborhoodInZone } from '../utils/cityZones.ts';

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
  selectedOriginFilter: 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal';
  setSelectedOriginFilter: (val: 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal') => void;
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
  const [internalZoneFilter, setInternalZoneFilter] = React.useState('');
  const activeZoneFilter = selectedZoneFilter !== undefined ? selectedZoneFilter : internalZoneFilter;
  const setActiveZoneFilter = setSelectedZoneFilter || setInternalZoneFilter;

  const availableZones = React.useMemo(() => {
    return getAvailableZonesForCity(selectedCityFilter);
  }, [selectedCityFilter]);

  const [simulatingAuction, setSimulatingAuction] = React.useState<AuctionProperty | null>(null);
  const [selectedMapProperty, setSelectedMapProperty] = React.useState<AuctionProperty | null>(null);
  const [isGeneralMapOpen, setIsGeneralMapOpen] = React.useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = React.useState<'caixa' | 'extrajudicial' | 'judicial' | 'capital' | null>(null);
  const [localMiningType, setLocalMiningType] = React.useState<'judicial' | 'caixa' | 'portal' | null>(null);
  const [selectedGarimpoCity, setSelectedGarimpoCity] = React.useState<string>('ambas');
  const [selectedSaleModeFilter, setSelectedSaleModeFilter] = React.useState<string>('');
  const [portalSearchIds, setPortalSearchIds] = React.useState<Set<string>>(new Set());
  const autoPortalSearchIds = React.useRef<Set<string>>(new Set());

  const refreshCardPortalData = React.useCallback(async (auc: AuctionProperty) => {
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
      if (!response.ok) throw new Error(data.error || 'Falha ao consultar os portais.');

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
        portalDataSource: 'Anúncios individuais ativos confirmados na rua'
      });
    } catch (error) {
      console.error('[Dashboard] Falha ao atualizar anúncios do card:', error);
    } finally {
      setPortalSearchIds(prev => {
        const next = new Set(prev);
        next.delete(auc.id);
        return next;
      });
    }
  }, [onUpdateProperty, portalSearchIds]);

  const getSaleModeBadge = React.useCallback((auc: AuctionProperty) => {
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
      else if (textLower.includes('leilão sfi') || textLower.includes('leilao sfi')) mode = 'Leilão SFI';
      else if (textLower.includes('online')) mode = 'Leilão Online';
      else if (auc.origin === 'judicial') mode = 'Leilão Judicial Online';
      else if (auc.origin === 'extrajudicial') mode = 'Leilão Extrajudicial Online';
      else if (isCaixaAuction) mode = '';
      else mode = 'Leilão Online';
    }

    if (!mode && isCaixaAuction) {
      return {
        label: 'Modalidade não informada',
        shortLabel: 'Sem modalidade',
        type: 'modalidade_indefinida',
        icon: '○',
        className: 'bg-slate-800 text-slate-300 border-slate-600'
      };
    }

    const modeLower = (mode || '').toLowerCase();
    
    if (modeLower.includes('venda direta')) {
      return {
        label: modeLower.includes('online') ? 'Venda Direta Online' : 'Venda Direta',
        shortLabel: 'Venda Direta',
        type: 'venda_direta',
        icon: '🤝',
        className: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-950/50'
      };
    }
    
    if (modeLower.includes('licita') || modeLower.includes('licitação')) {
      return {
        label: 'Licitação Aberta',
        shortLabel: 'Licitação Aberta',
        type: 'licitacao_aberta',
        icon: '📢',
        className: 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-sm shadow-amber-950/50'
      };
    }
    
    if (modeLower.includes('venda online')) {
      return {
        label: 'Venda Online',
        shortLabel: 'Venda Online',
        type: 'venda_online',
        icon: '💻',
        className: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-950/50'
      };
    }

    if (modeLower.includes('sfi') || modeLower.includes('edital único')) {
      return {
        label: 'Leilão SFI Online',
        shortLabel: 'Leilão SFI',
        type: 'leilao_sfi',
        icon: '⚖️',
        className: 'bg-indigo-950/90 text-indigo-300 border-indigo-500/60 shadow-sm shadow-indigo-950/50'
      };
    }

    if (auc.origin === 'judicial') {
      return {
        label: 'Leilão Judicial Online',
        shortLabel: 'Judicial Online',
        type: 'judicial_online',
        icon: '⚖️',
        className: 'bg-purple-950/90 text-purple-300 border-purple-500/60 shadow-sm shadow-purple-950/50'
      };
    }

    return {
      label: mode || 'Leilão Online',
      shortLabel: mode || 'Leilão Online',
      type: 'leilao_online',
      icon: '🌐',
      className: 'bg-blue-950/90 text-blue-300 border-blue-500/60 shadow-sm shadow-blue-950/50'
    };
  }, []);

  React.useEffect(() => {
    if (!isMining) {
      setLocalMiningType(null);
    }
  }, [isMining]);
  
  const normalizeText = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';

  const checkOriginMatch = (a: AuctionProperty) => {
    const origin = a.origin || (a.id.startsWith('auc-caixa') ? 'caixa' : 'judicial');
    if (selectedOriginFilter === 'caixa' || selectedOriginFilter === 'caixa_radar') {
      return origin === 'caixa' || origin === 'caixa_radar';
    }
    return origin === selectedOriginFilter;
  };

  // Extract unique states to filter by (filtered by selectedOriginFilter)
  // Extract unique states to filter by (filtered strictly by real ITBI database presence: RJ, MG, SP)
  const uniqueStates = React.useMemo(() => {
    const itbiValidStates = new Set(Object.keys(VALID_ITBI_CITIES_BY_STATE));
    const list = auctions.filter(checkOriginMatch);
    const foundStates = Array.from(new Set(list.map(a => (a.state || '').toUpperCase()).filter(Boolean)));
    const filtered = foundStates.filter(st => itbiValidStates.has(st));
    return filtered.length > 0 ? filtered.sort() : ['RJ'];
  }, [auctions, selectedOriginFilter]);

  // Extract unique cities from auctions for filters (filtered strictly by verified ITBI municipal records)
  const uniqueCities = React.useMemo(() => {
    let list = auctions.filter(checkOriginMatch);
    if (selectedStateFilter) {
      list = list.filter(a => (a.state || 'RJ').toUpperCase() === selectedStateFilter.toUpperCase());
    }
    
    const allowedCities = selectedStateFilter && VALID_ITBI_CITIES_BY_STATE[selectedStateFilter.toUpperCase()]
      ? new Set(VALID_ITBI_CITIES_BY_STATE[selectedStateFilter.toUpperCase()].map(normalizeText))
      : new Set(Object.values(VALID_ITBI_CITIES_BY_STATE).flat().map(normalizeText));

    const citiesList = list
      .filter(a => {
        if (!a.city) return false;
        const norm = normalizeText(a.city);
        return allowedCities.has(norm);
      })
      .map(a => a.city)
      .filter(Boolean) as string[];

    return Array.from(new Set(citiesList)).sort();
  }, [auctions, selectedStateFilter, selectedOriginFilter]);

  // Extract unique neighborhoods from auctions for filters (filtered by selectedStateFilter, selectedCityFilter, activeZoneFilter and selectedOriginFilter)
  const uniqueNeighborhoods = React.useMemo(() => {
    let list = auctions.filter(checkOriginMatch);
    if (selectedStateFilter) {
      list = list.filter(a => (a.state || 'SP').toUpperCase() === selectedStateFilter.toUpperCase());
    }
    if (selectedCityFilter) {
      const normCity = normalizeText(selectedCityFilter);
      list = list.filter(a => normalizeText(a.city || '').includes(normCity) || normCity.includes(normalizeText(a.city || '')));
    }
    if (activeZoneFilter) {
      list = list.filter(a => isNeighborhoodInZone(a.city, a.neighborhood, activeZoneFilter) || a.zone === activeZoneFilter);
    }

    const titleCased = list
      .map(a => a.neighborhood ? a.neighborhood.trim().split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ') : '')
      .filter(Boolean);
    return Array.from(new Set(titleCased)).sort();
  }, [auctions, selectedStateFilter, selectedCityFilter, activeZoneFilter, selectedOriginFilter]);

  const activeSorts = React.useMemo(() => {
    if (!sortBy) return ['roi'];
    if (sortBy === 'roi_liquidity') return ['roi', 'liquidity'];
    return sortBy.split('+').filter(Boolean);
  }, [sortBy]);

  const handleToggleSort = (key: string) => {
    if (activeSorts.includes(key)) {
      if (activeSorts.length > 1) {
        const remaining = activeSorts.filter(s => s !== key);
        setSortBy(remaining.join('+'));
      } else {
        setSortBy(key);
      }
    } else if (activeSorts.length < 4) {
      setSortBy([...activeSorts, key].join('+'));
    }
  };

  // Filter & Sort listing
  const filteredAndSortedAuctions = React.useMemo(() => {
    let result = auctions.filter(checkOriginMatch);

    if (selectedStateFilter) {
      result = result.filter(a => (a.state || 'SP').toUpperCase() === selectedStateFilter.toUpperCase());
    }

    if (selectedCityFilter) {
      const normCity = normalizeText(selectedCityFilter);
      result = result.filter(a => normalizeText(a.city || '').includes(normCity) || normCity.includes(normalizeText(a.city || '')));
    }
    if (activeZoneFilter) {
      result = result.filter(a => isNeighborhoodInZone(a.city, a.neighborhood, activeZoneFilter) || a.zone === activeZoneFilter);
    }
    if (selectedNeighborhoodFilter) {
      const normNeighFilter = normalizeText(selectedNeighborhoodFilter);
      result = result.filter(a => normalizeText(a.neighborhood || '') === normNeighFilter);
    }
    if (selectedTypeFilter) {
      result = result.filter(a => a.propertyType === selectedTypeFilter);
    }
    if (paymentFilter === 'financing') {
      result = result.filter(a => a.allowsFinancing === true);
    } else if (paymentFilter === 'installments') {
      result = result.filter(a => a.allowsInstallments === true);
    } else if (paymentFilter === 'both') {
      result = result.filter(a => a.allowsFinancing === true && a.allowsInstallments === true);
    }
    if (selectedSaleModeFilter) {
      result = result.filter(a => {
        const b = getSaleModeBadge(a);
        return b.type === selectedSaleModeFilter;
      });
    }

    const getSortScore = (prop: AuctionProperty, sortKey: string) => {
      const confidenceFactor = prop.valuationConfidence === 'verified' ? 1 : 0;
      const territorialEligibility = prop.isCommunityRisk ? 0 : 1;
      if (sortKey === 'profit') return Math.max(0, prop.calculatedProfit || 0) * confidenceFactor * territorialEligibility;
      if (sortKey === 'roi') return Math.max(0, prop.calculatedRoi || 0) * confidenceFactor * territorialEligibility;
      if (sortKey === 'liquidity') return Math.max(0, prop.liquidityScore || 0);
      if (sortKey === 'price_asc') return -prop.auctionPrice;
      if (sortKey === 'price_desc') return prop.auctionPrice;
      return 0;
    };

    const scoreRanges = new Map(activeSorts.map(sortKey => {
      const values = result.map(property => getSortScore(property, sortKey));
      return [sortKey, { min: Math.min(...values), max: Math.max(...values) }];
    }));
    const weightedScore = (property: AuctionProperty) => activeSorts.reduce((total, sortKey, index) => {
      const value = getSortScore(property, sortKey);
      const range = scoreRanges.get(sortKey)!;
      const normalized = range.max === range.min ? 0.5 : (value - range.min) / (range.max - range.min);
      const weight = [1, 0.65, 0.4, 0.25][index] || 0;
      return total + normalized * weight;
    }, 0);

    result.sort((a, b) => weightedScore(b) - weightedScore(a));

    return result;
  }, [auctions, selectedNeighborhoodFilter, selectedCityFilter, selectedTypeFilter, selectedStateFilter, maxPriceFilter, paymentFilter, sortBy, activeSorts, selectedOriginFilter]);

  const [visibleCount, setVisibleCount] = React.useState(12);

  React.useEffect(() => {
    if (autoPortalSearchIds.current.size >= 2) return;
    const pending = filteredAndSortedAuctions
      .slice(0, Math.min(visibleCount, 12))
      .filter(auc => !auc.portalDataVerifiedAt && !autoPortalSearchIds.current.has(auc.id))
      .slice(0, 2 - autoPortalSearchIds.current.size);

    pending.forEach(auc => {
      autoPortalSearchIds.current.add(auc.id);
      void refreshCardPortalData(auc);
    });
  }, [filteredAndSortedAuctions, visibleCount, refreshCardPortalData]);

  // Reset visibleCount when filters/sorting change to optimize responsiveness
  React.useEffect(() => {
    setVisibleCount(12);
  }, [selectedNeighborhoodFilter, selectedCityFilter, selectedTypeFilter, selectedStateFilter, maxPriceFilter, paymentFilter, sortBy, selectedOriginFilter]);

  // Infinite scroll listener
  React.useEffect(() => {
    function handleScroll() {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 150
      ) {
        setVisibleCount(prev => Math.min(prev + 12, filteredAndSortedAuctions.length));
      }
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredAndSortedAuctions.length]);

  // Aggregate stats dynamically based on filtered auctions
  const stats = React.useMemo(() => {
    const totalCount = filteredAndSortedAuctions.length;
    const verified = filteredAndSortedAuctions.filter(a => a.valuationConfidence === 'verified' && !a.isCommunityRisk);
    const avgRoi = verified.length > 0
      ? Math.round(verified.reduce((acc, a) => acc + (a.calculatedRoi || 0), 0) / verified.length)
      : 0;
    const totalPotentialProfit = verified.reduce((acc, a) => acc + (a.calculatedProfit || 0), 0);
    const highLiquidityCount = verified.filter(a => (a.liquidityScore || 0) >= 8).length;

    return { totalCount, avgRoi, totalPotentialProfit, highLiquidityCount };
  }, [filteredAndSortedAuctions]);

  // Format currency helper
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const getAuctionHost = (auctionLink?: string) => {
    if (!auctionLink) return 'Portal não informado';
    try {
      return new URL(auctionLink).hostname.replace(/^www\./, '');
    } catch {
      return 'Portal não informado';
    }
  };

  const formatAuctionDate = (date?: string) => {
    if (!date) return 'Data não informada';
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? 'Data não informada' : parsed.toLocaleDateString('pt-BR');
  };

  return (
    <div id="dashboard-tab" className="space-y-6">
      {/* KPI Cards */}
      <div data-tour="kpis" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-md flex items-center space-x-4"
        >
          <div className="p-3 bg-blue-950/50 text-blue-400 border border-blue-900/30 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Leilões Garimpados</p>
            <h3 className="text-2xl font-bold text-white font-mono">{stats.totalCount}</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-md flex items-center space-x-4"
        >
          <div className="p-3 bg-emerald-950/50 text-emerald-400 border border-emerald-900/30 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">ROI Médio Verificado</p>
            <h3 className="text-2xl font-bold text-emerald-400 font-mono">{stats.avgRoi}%</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-md flex items-center space-x-4"
        >
          <div className="p-3 bg-indigo-950/50 text-indigo-400 border border-indigo-900/30 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ganhos Verificados</p>
            <h3 className="text-2xl font-bold text-slate-100 font-mono">{formatBRL(stats.totalPotentialProfit)}</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-md flex items-center space-x-4"
        >
          <div className="p-3 bg-amber-950/50 text-amber-400 border border-amber-900/30 rounded-lg">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Alta Liquidez (Score ≥8)</p>
<h3 className="text-2xl font-bold text-white font-mono">{stats.highLiquidityCount} <span className="text-xs text-slate-400 font-sans font-normal">imóveis</span></h3>
          </div>
        </motion.div>
      </div>

      {/* Tab Selector for Source (Imóveis Caixa vs Judicial vs Extrajudicial vs Portais) */}
      <div data-tour="origin-tabs" className="bg-slate-900/80 p-1.5 rounded-xl flex flex-wrap gap-1.5 w-full border border-slate-800 backdrop-blur-md shadow-lg">
        <button
          onClick={() => {
            setSelectedOriginFilter('caixa');
            setSelectedNeighborhoodFilter('');
          }}
          className={`flex-1 min-w-[150px] flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
            selectedOriginFilter === 'caixa'
              ? 'bg-blue-600 text-white shadow-md border border-blue-500/20'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-300" />
          <span>⚡ Imóveis Caixa</span>
        </button>
        <button
          onClick={() => setSelectedOriginFilter('judicial')}
          className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
            selectedOriginFilter === 'judicial'
              ? 'bg-indigo-600 text-white shadow-md border border-indigo-500/20'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
          }`}
        >
          <Gavel className="w-4 h-4" />
          <span>Leilões Judiciais</span>
        </button>
        <button
          onClick={() => setSelectedOriginFilter('extrajudicial')}
          className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
            selectedOriginFilter === 'extrajudicial'
              ? 'bg-emerald-600 text-white shadow-md border border-emerald-500/20'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Leilões Extrajudiciais</span>
        </button>
        <button
          onClick={() => setSelectedOriginFilter('portal')}
          className={`flex-1 min-w-[130px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
            selectedOriginFilter === 'portal'
              ? 'bg-amber-600 text-white shadow-md border border-amber-500/20'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Portais (Flip)</span>
        </button>
      </div>

      {/* Control Panel: Filters & Presets */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-slate-100">
                Filtros de Garimpo
              </h2>
            </div>
            <button
              onClick={() => {
                setSelectedNeighborhoodFilter('');
                setSelectedCityFilter('');
                setSelectedTypeFilter('');
                setSelectedStateFilter('');
                setMaxPriceFilter('');
                setPaymentFilter('');
                setSortBy('profit');
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-100 bg-slate-850 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 border border-slate-700 shadow-sm"
              title="Limpar todos os filtros de pesquisa"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div data-tour="quick-actions" className="flex flex-wrap items-center gap-3">
              {onSyncCaixaAuto && selectedOriginFilter === 'caixa' && (
                <div className="relative inline-flex items-center pt-1.5">
                  <button
                    onClick={onSyncCaixaAuto}
                    disabled={isMining}
                    className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                    title="Varredura 100% automática da Caixa sem baixar planilhas"
                  >
                    {isMining ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-slate-950" />
                    )}
                    <span>⚡ Sincronizar Imóveis Caixa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === 'caixa' ? null : 'caixa')}
                    className="absolute -top-3 -right-3.5 z-10 w-5 h-5 rounded-full bg-amber-950/90 border border-amber-500/70 text-amber-300 hover:bg-amber-900 hover:border-amber-400 hover:text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all cursor-pointer font-serif italic text-xs font-black"
                    title="Informações sobre a sincronização da Caixa"
                  >
                    i
                  </button>
                  {activeTooltip === 'caixa' && (
                    <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 p-3.5 bg-slate-900/98 text-slate-200 text-xs rounded-xl shadow-2xl border border-amber-500/40 z-50 backdrop-blur-md">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-amber-300">⚡ Sincronização Caixa Automática</span>
                        <button onClick={() => setActiveTooltip(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        Varre e atualiza a base completa de imóveis da Caixa (leilões e venda direta) sem precisar baixar planilhas manuais. Saneia metragens privativas, calcula o teto de 10% de condomínio e cruza com os valores reais da Prefeitura.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {onSyncExtrajudiciaisAuto && selectedOriginFilter === 'extrajudicial' && (
                <div className="relative inline-flex items-center pt-1.5">
                  <button
                    onClick={onSyncExtrajudiciaisAuto}
                    disabled={isMining}
                    className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center space-x-2 cursor-pointer disabled:opacity-50 border border-emerald-400/30"
                    title="Sincronizar imóveis de bancos e alienações fiduciárias nos portais configurados"
                  >
                    {isMining ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                    )}
                    <span>⚡ Sincronizar Leilões Extrajudiciais</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === 'extrajudicial' ? null : 'extrajudicial')}
                    className="absolute -top-3 -right-3.5 z-10 w-5 h-5 rounded-full bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 hover:bg-emerald-900 hover:border-emerald-400 hover:text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all cursor-pointer font-serif italic text-xs font-black"
                    title="Informações sobre a sincronização de leilões extrajudiciais"
                  >
                    i
                  </button>
                  {activeTooltip === 'extrajudicial' && (
                    <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 p-3.5 bg-slate-900/98 text-slate-200 text-xs rounded-xl shadow-2xl border border-emerald-500/40 z-50 backdrop-blur-md">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-emerald-300">⚡ Sincronização Extrajudicial Oficial</span>
                        <button onClick={() => setActiveTooltip(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        Varre os 24 portais configurados, incluindo Santander Imóveis e os leiloeiros oficiais indicados, capturando imóveis de bancos e alienações fiduciárias. Só importa lotes com link, preço, metragem e endereço auditáveis.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {onSyncJudiciaisAuto && selectedOriginFilter === 'judicial' && (
                <div className="relative inline-flex items-center pt-1.5">
                  <button
                    onClick={onSyncJudiciaisAuto}
                    disabled={isMining}
                    className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center space-x-2 cursor-pointer disabled:opacity-50 border border-indigo-400/30"
                    title="Sincronizar leilões judiciais ativos das varas cíveis e trabalhistas nos portais parceiros"
                  >
                    {isMining ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                    )}
                    <span>⚡ Sincronizar Leilões Judiciais</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === 'judicial' ? null : 'judicial')}
                    className="absolute -top-3 -right-3.5 z-10 w-5 h-5 rounded-full bg-indigo-950/90 border border-indigo-500/70 text-indigo-300 hover:bg-indigo-900 hover:border-indigo-400 hover:text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all cursor-pointer font-serif italic text-xs font-black"
                    title="Informações sobre a sincronização de leilões judiciais"
                  >
                    i
                  </button>
                  {activeTooltip === 'judicial' && (
                    <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 p-3.5 bg-slate-900/98 text-slate-200 text-xs rounded-xl shadow-2xl border border-indigo-500/40 z-50 backdrop-blur-md">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-indigo-300">⚡ Sincronização Judicial Oficial</span>
                        <button onClick={() => setActiveTooltip(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        Varre os leiloeiros oficiais em busca de processos das varas cíveis, de família e trabalhistas com leilão marcado. Cruza metragens e calcula viabilidade e margem com base na NBR 14.653 e ITBI.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {onOpenCapitalMatcher && (
                <div className="relative inline-flex items-center pt-1.5">
                  <button
                    onClick={onOpenCapitalMatcher}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer border border-emerald-400/30"
                    title="Filtrar oportunidades com base no seu capital disponível (à vista ou financiado)"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-200" />
                    <span>🎯 Alocação por Capital</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === 'capital' ? null : 'capital')}
                    className="absolute -top-3 -right-3.5 z-10 w-5 h-5 rounded-full bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 hover:bg-emerald-900 hover:border-emerald-400 hover:text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all cursor-pointer font-serif italic text-xs font-black"
                    title="Informações sobre a alocação por capital"
                  >
                    i
                  </button>
                  {activeTooltip === 'capital' && (
                    <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 p-3.5 bg-slate-900/98 text-slate-200 text-xs rounded-xl shadow-2xl border border-emerald-500/40 z-50 backdrop-blur-md">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-emerald-300">🎯 Alocação por Capital Disponível</span>
                        <button onClick={() => setActiveTooltip(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        Você informa quanto capital possui disponível e o sistema calcula instantaneamente quais imóveis são viáveis para compra À Vista (Full Cash) ou Financiada pela Caixa (5% de entrada + reforma de 5% + condomínio até 10% + cartório), destacando a margem de lucro, ROI e sobra de caixa.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Grupo de Ordenação com Seleção Dupla (Sem botões extras) */}
            <div data-tour="sorting-map" className="flex flex-col gap-2 bg-slate-950/90 p-2 sm:px-3 sm:py-2.5 rounded-xl border border-slate-800/90 ml-auto w-full lg:w-[40rem] max-w-full min-h-[5rem] shrink-0 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-300 font-mono tracking-wider shrink-0 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ordenar por:</span>
                </span>
                <span className="text-[10px] font-mono">
                  {activeSorts.length > 1 ? (
                    <span className="text-amber-300 font-bold">{activeSorts.length} critérios ativos</span>
                  ) : (
                    <span className="text-slate-400">Selecione até 4 critérios</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'profit', label: 'Lucro', icon: Gem, color: 'bg-emerald-600 border-emerald-500 shadow-emerald-600/30' },
                  { id: 'roi', label: 'Maior ROI', icon: TrendingUp, color: 'bg-indigo-600 border-indigo-500 shadow-indigo-600/30' },
                  { id: 'liquidity', label: 'Liquidez', icon: Gauge, color: 'bg-amber-600 border-amber-500 shadow-amber-600/30' },
                  { id: 'price_asc', label: 'Menor Preço', icon: DollarSign, color: 'bg-blue-600 border-blue-500 shadow-blue-600/30' }
                ].map(item => {
                  const isSelected = activeSorts.includes(item.id);
                  const orderIndex = activeSorts.indexOf(item.id);
                  const SortIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToggleSort(item.id)}
                      className={`relative w-full min-w-0 h-9 px-7 rounded-lg text-[11px] sm:text-xs font-bold transition-colors cursor-pointer border flex items-center justify-center overflow-hidden ${
                        isSelected
                          ? `${item.color} text-white shadow-md ring-1 ring-white/30`
                          : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-750'
                      }`}
                      title={isSelected && activeSorts.length > 1 ? `Critério ${orderIndex + 1} de ordenação combinada` : `Ordenar por ${item.label}`}
                    >
                      <span className="min-w-0 flex items-center justify-center gap-1.5 truncate"><SortIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{item.label}</span></span>
                      <span
                        aria-hidden={!isSelected || activeSorts.length === 1}
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded bg-black/50 text-[9px] font-mono leading-4 text-center text-amber-300 font-black border border-amber-400/40 transition-opacity ${
                          isSelected && activeSorts.length > 1 ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                          {orderIndex + 1}º
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
        </div>
      </div>

        <div data-tour="filters-bar" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mt-4">

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Filtrar por Estado (UF)</label>
            <select
              value={selectedStateFilter}
              onChange={(e) => {
                setSelectedStateFilter(e.target.value);
                setSelectedCityFilter(''); // reset city filter on state change
                setSelectedNeighborhoodFilter(''); // reset neighborhood filter on state change
              }}
              className="w-full text-sm border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-200 hover:bg-slate-900 focus:bg-slate-950 focus:border-indigo-500/80 focus:ring-indigo-500/30 outline-none transition-colors cursor-pointer [&>option]:bg-slate-950 [&>option]:text-slate-200"
            >
              <option value="" className="bg-slate-950 text-slate-200">Todos os Estados</option>
              {uniqueStates.map(uf => {
                const stateObj = BRAZIL_STATES.find(s => s.value === uf);
                return (
                  <option key={uf} value={uf} className="bg-slate-950 text-slate-200">
                    {uf} {stateObj ? `- ${stateObj.label}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Filtrar por Cidade</label>
            <select
              value={selectedCityFilter}
              onChange={(e) => {
                setSelectedCityFilter(e.target.value);
                setActiveZoneFilter('');
                setSelectedNeighborhoodFilter(''); // reset on city change
              }}
              className="w-full text-sm border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-200 hover:bg-slate-900 focus:bg-slate-950 focus:border-indigo-500/80 focus:ring-indigo-500/30 outline-none transition-colors cursor-pointer [&>option]:bg-slate-950 [&>option]:text-slate-200"
            >
              <option value="" className="bg-slate-950 text-slate-200">Todas as cidades</option>
              {uniqueCities.map(c => (
                <option key={c} value={c} className="bg-slate-950 text-slate-200">{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Filtrar por Zona</label>
            <select
              value={activeZoneFilter}
              onChange={(e) => {
                setActiveZoneFilter(e.target.value);
                setSelectedNeighborhoodFilter(''); // reset neighborhood on zone change
              }}
              disabled={availableZones.length === 0}
              className="w-full text-sm border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-200 hover:bg-slate-900 focus:bg-slate-950 focus:border-indigo-500/80 focus:ring-indigo-500/30 outline-none transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [&>option]:bg-slate-950 [&>option]:text-slate-200"
            >
              <option value="" className="bg-slate-950 text-slate-200">
                {availableZones.length === 0 ? (selectedCityFilter ? 'Zonas não demarcadas' : 'Selecione a cidade') : 'Todas as zonas'}
              </option>
              {availableZones.map(z => (
                <option key={z} value={z} className="bg-slate-950 text-slate-200">{z}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Filtrar por Bairro</label>
            <select
              value={selectedNeighborhoodFilter}
              onChange={(e) => setSelectedNeighborhoodFilter(e.target.value)}
              className="w-full text-sm border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-200 hover:bg-slate-900 focus:bg-slate-950 focus:border-indigo-500/80 focus:ring-indigo-500/30 outline-none transition-colors cursor-pointer [&>option]:bg-slate-950 [&>option]:text-slate-200"
            >
              <option value="" className="bg-slate-950 text-slate-200">Todos os bairros</option>
              {uniqueNeighborhoods.map(n => (
                <option key={n} value={n} className="bg-slate-950 text-slate-200">{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Imóvel</label>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full text-sm border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-200 hover:bg-slate-900 focus:bg-slate-950 focus:border-indigo-500/80 focus:ring-indigo-500/30 outline-none transition-colors cursor-pointer [&>option]:bg-slate-950 [&>option]:text-slate-200"
            >
              <option value="" className="bg-slate-950 text-slate-200">Todos os tipos</option>
              <option value="Apartamento" className="bg-slate-950 text-slate-200">Apartamento</option>
              <option value="Casa" className="bg-slate-950 text-slate-200">Casa</option>
              <option value="Comercial" className="bg-slate-950 text-slate-200">Comercial</option>
              <option value="Terreno" className="bg-slate-950 text-slate-200">Terreno</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Condições de Pagamento</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full text-sm border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-200 hover:bg-slate-900 focus:bg-slate-950 focus:border-indigo-500/80 focus:ring-indigo-500/30 outline-none transition-colors cursor-pointer [&>option]:bg-slate-950 [&>option]:text-slate-200"
            >
              <option value="" className="bg-slate-950 text-slate-200">Todos</option>
              <option value="financing" className="bg-slate-950 text-slate-200">Aceita Financiamento</option>
              <option value="installments" className="bg-slate-950 text-slate-200">Permite Parcelamento</option>
              <option value="both" className="bg-slate-950 text-slate-200">Financiamento & Parcelamento</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-300 mb-1 font-mono uppercase text-[10.5px]">Modalidade da Disputa</label>
            <select
              value={selectedSaleModeFilter}
              onChange={(e) => setSelectedSaleModeFilter(e.target.value)}
              className="w-full text-sm border border-indigo-500/40 rounded-lg p-2 bg-slate-950 text-slate-200 hover:bg-slate-900 focus:bg-slate-950 focus:border-indigo-500/80 focus:ring-indigo-500/30 outline-none transition-colors cursor-pointer font-medium [&>option]:bg-slate-950 [&>option]:text-slate-200"
            >
              <option value="" className="bg-slate-950 text-slate-200">Todas as modalidades</option>
              <option value="venda_direta" className="bg-slate-950 text-emerald-400 font-semibold">🤝 Venda Direta Online</option>
              <option value="licitacao_aberta" className="bg-slate-950 text-amber-400 font-semibold">📢 Licitação Aberta</option>
              <option value="venda_online" className="bg-slate-950 text-cyan-400 font-semibold">💻 Venda Online</option>
              <option value="leilao_sfi" className="bg-slate-950 text-indigo-400 font-semibold">⚖️ Leilão SFI Online</option>
              <option value="judicial_online" className="bg-slate-950 text-purple-400 font-semibold">⚖️ Leilão Judicial Online</option>
              <option value="leilao_online" className="bg-slate-950 text-blue-400 font-semibold">🌐 Leilão Online</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters Summary Indicator & Zerar Imoveis */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-950 border border-slate-850 rounded-lg py-2.5 px-3.5 shadow-inner">
        <div className="flex items-center space-x-2 text-slate-400">
          <div className={`w-2 h-2 rounded-full ${filteredAndSortedAuctions.length !== auctions.length ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
          <span>
            Mostrando <strong className="text-slate-200 font-bold">{filteredAndSortedAuctions.length}</strong> {filteredAndSortedAuctions.length === 1 ? 'leilão' : 'leilões'} 
            {filteredAndSortedAuctions.length !== auctions.length ? (
              <span> (filtrados de um total de <strong className="text-slate-350 font-bold">{auctions.length}</strong>)</span>
            ) : (
              <span> (todos os leilões cadastrados)</span>
            )}
          </span>
        </div>

        <button
          onClick={() => setIsGeneralMapOpen(true)}
          className="text-xs text-emerald-300 hover:text-white font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 hover:from-emerald-900/70 hover:to-emerald-850/70 transition-all cursor-pointer border border-emerald-500/40 shadow-md flex items-center space-x-2 self-start sm:self-auto hover:scale-102"
          title="Visualizar todos os imóveis filtrados no Mapa Georreferenciado"
        >
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>🗺️ Mapa de Oportunidades ({filteredAndSortedAuctions.length})</span>
        </button>
      </div>

      {/* Grid of Results */}
      {filteredAndSortedAuctions.length === 0 ? (
        !selectedStateFilter ? (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-8 sm:p-12 text-center text-slate-400 backdrop-blur-sm shadow-xl space-y-4 max-w-xl mx-auto my-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
              <MapPin className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-lg text-white">Selecione um Estado para Carregar os Imóveis</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Para garantir máxima velocidade e precisão nos cálculos, selecione o Estado e Cidade desejados nos filtros acima ou clique em um dos atalhos rápidos:
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5 pt-2">
              <button
                onClick={() => setSelectedStateFilter('RJ')}
                className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-xl border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105"
              >
                <span>🏛️</span>
                <span>Rio de Janeiro (RJ)</span>
              </button>
              <button
                onClick={() => setSelectedStateFilter('SP')}
                className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-xl border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105"
              >
                <span>🏙️</span>
                <span>São Paulo (SP)</span>
              </button>
              <button
                onClick={() => setSelectedStateFilter('MG')}
                className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-xl border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105"
              >
                <span>⛰️</span>
                <span>Minas Gerais (MG)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-400">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-200">Nenhum leilão corresponde aos seus filtros em {selectedStateFilter}.</p>
            <p className="text-xs text-slate-500 mt-1">Experimente limpar os filtros ou selecionar outra cidade.</p>
            {(selectedNeighborhoodFilter || selectedCityFilter || selectedTypeFilter || selectedStateFilter || maxPriceFilter || paymentFilter) && (
              <button
                onClick={() => {
                  setSelectedNeighborhoodFilter('');
                  setSelectedCityFilter('');
                  setSelectedTypeFilter('');
                  setSelectedStateFilter('');
                  setMaxPriceFilter('');
                  setPaymentFilter('');
                }}
                className="mt-4 text-indigo-400 font-bold text-xs hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedAuctions.slice(0, visibleCount).map((auc, idx) => {
              const repairCost = auc.estimatedRepair || Math.round(auc.auctionPrice * 0.05);
              const condoDebt = auc.pendingCondoCost || (auc.origin === 'caixa' ? Math.round(((auc as any).evaluationPrice || auc.estimatedValue || auc.auctionPrice * 1.5) * 0.10) : (auc.pendingDebts || 0));
              const totalCost = auc.auctionPrice + repairCost + condoDebt + (auc.otherCosts || (auc.itbiCost || 0) + (auc.notaryCost || 0));
              const isSelected = selectedAuctionId === auc.id;
              const isVerifiedValuation = auc.valuationConfidence === 'verified' && (auc.itbiStreetCount || 0) > 0;
              const isProjectedValuation = auc.valuationConfidence === 'projected';
              const isFeatured = isVerifiedValuation && (auc.calculatedRoi || 0) >= 40 && (auc.liquidityScore || 0) >= 7;
              const isCaixaAuction = auc.origin === 'caixa' || auc.origin === 'caixa_radar' || auc.id.startsWith('auc-caixa');

              return (
                <motion.div
                  key={auc.id}
                  layoutId={`auc-card-${auc.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-slate-900/95 border rounded-2xl shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden relative flex flex-col ${
                    isSelected 
                      ? 'border-indigo-400 ring-2 ring-indigo-400/60 shadow-[0_25px_55px_rgba(99,102,241,0.25)] -translate-y-1.5' 
                      : isFeatured 
                        ? 'border-indigo-500/50 ring-1 ring-indigo-500/30 bg-slate-900/95' 
                        : 'border-slate-750 hover:border-indigo-400'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    {/* Header Block with Thumbnail, Type, Left Badges, Title & Address */}
                    <div data-tour={idx === 0 ? "card-header" : undefined} className="flex gap-3 items-start justify-between">
                      {/* Informações: Tipologia + Badges alinhados à esquerda, Título e Endereço */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Upper Row: Tipologia e Avisos todos à esquerda */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-slate-800 text-slate-200 text-xs font-semibold px-2 py-0.5 rounded border border-slate-700">
                            {auc.propertyType} • {auc.sizeSqm} m²
                            {auc.bedrooms ? ` • ${auc.bedrooms} qto${auc.bedrooms > 1 ? 's' : ''}` : ''}
                            {auc.parkingSpaces ? ` • ${auc.parkingSpaces} vg${auc.parkingSpaces > 1 ? 's' : ''}` : ''}
                          </span>

                          {/* Modalidade fica no slot do status de fluxo para imóveis Caixa. */}
                          {!isCaixaAuction && (() => {
                            const badge = getSaleModeBadge(auc);
                            return (
                              <span 
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-sm transition-all ${badge.className}`}
                                title={`Modalidade de Aquisição: ${badge.label}`}
                              >
                                <span className="text-xs leading-none">{badge.icon}</span>
                                <span className="tracking-tight">{badge.label}</span>
                              </span>
                            );
                          })()}

                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            auc.riskLevel === 'Baixo' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                            auc.riskLevel === 'Médio' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                            'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}>
                            Risco {auc.riskLevel}
                          </span>

                          {isCaixaAuction ? (() => {
                            const badge = getSaleModeBadge(auc);
                            return (
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-sm transition-all ${badge.className}`}
                                title={`Modalidade oficial da Caixa: ${badge.label}`}
                              >
                                <span className="text-xs leading-none">{badge.icon}</span>
                                <span className="tracking-tight">{badge.label}</span>
                              </span>
                            );
                          })() : (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              auc.status === 'Arrematado' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                              auc.status === 'Analisado' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                              'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {auc.status}
                            </span>
                          )}

                          {isFeatured && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              Destaque ★
                            </span>
                          )}
                        </div>

                        {/* Title & Address */}
                        <div className="space-y-0.5">
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 font-display hover:text-slate-200 transition-colors" title={auc.title}>
                            {auc.title}
                          </h3>
                          <div className="flex items-center text-xs text-slate-400 space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate" title={`${auc.address} (${auc.neighborhood} - ${auc.state || 'SP'})`}>
                              {auc.address} ({auc.neighborhood} - {auc.state || 'SP'})
                            </span>
                          </div>
                          {auc.origin !== 'caixa' && auc.origin !== 'caixa_radar' && (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-slate-400 font-mono pt-0.5">
                              <span>Portal: <strong className="text-slate-200">{getAuctionHost(auc.auctionLink)}</strong></span>
                              <span>1ª praça: <strong className="text-slate-200">{formatAuctionDate(auc.firstAuctionDate || auc.auctionDate)}</strong></span>
                              {auc.secondAuctionDate && <span>2ª praça: <strong className="text-slate-200">{formatAuctionDate(auc.secondAuctionDate)}</strong></span>}
                              <span>Modalidade: <strong className="text-slate-200">{auc.saleMode || getSaleModeBadge(auc).label}</strong></span>
                            </div>
                          )}
                          {auc.valuationBasis && (
                            <div className="text-[9px] text-amber-300/90 font-mono pt-0.5">{auc.valuationBasis}</div>
                          )}
                          {auc.divergentNeighborhoodNotice && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[9.5px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800/60 font-mono font-bold flex items-center gap-1" title="Bairro cadastrado no edital difere do endereço real no mapa/cartório">
                                <span>⚠️</span>
                                <span>{auc.divergentNeighborhoodNotice}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Foto do Imóvel / Thumbnail na DIREITA */}
                      <div className="shrink-0">
                        <PropertyThumbnail property={auc} size="lg" className="rounded-lg" />
                      </div>
                    </div>

                    {/* Core Financial Indicators - Grid Linha 1 (4 Colunas Perfeitamente Alinhadas) */}
                    <div data-tour={idx === 0 ? "card-financial" : undefined} className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 items-stretch">
                      {/* Col 1: Lance Mínimo */}
                      <div className="flex flex-col justify-center">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                          {auc.origin === 'portal' ? 'Preço Anunciado' : 'Lance Mínimo'}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-white font-mono mt-0.5">{formatBRL(auc.auctionPrice)}</span>
                      </div>

                      {/* Col 2: Custo Total Est. */}
                      <div className="flex flex-col justify-center">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Custo Total Est.</span>
                        <span className="text-xs sm:text-sm font-black text-slate-300 font-mono mt-0.5" title={auc.origin === 'portal'
                          ? `Anúncio: ${formatBRL(auc.auctionPrice)} + Reforma: ${formatBRL(auc.estimatedRepair)} + Custos Legais: ${formatBRL(auc.otherCosts)}`
                          : `Lance: ${formatBRL(auc.auctionPrice)} + Reforma: ${formatBRL(auc.estimatedRepair)} + Dívidas: ${formatBRL(auc.pendingDebts)} + Custos Legais: ${formatBRL(auc.otherCosts)}`
                        }>
                          {formatBRL(totalCost)}
                        </span>
                      </div>

                      {/* Col 3: Lucro Estimado */}
                      <div className="flex flex-col justify-center">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Lucro Estimado</span>
                        <span className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${!isVerifiedValuation ? 'text-rose-400' : (auc.calculatedProfit || 0) >= 0 ? 'text-white' : 'text-rose-400'}`}>
                          {auc.calculatedProfit === undefined
                            ? 'Sob consulta'
                            : <>{formatBRL(auc.calculatedProfit)}{isProjectedValuation && <span className="block text-[8px]">PROJEÇÃO NÃO RANQUEADA</span>}</>}
                        </span>
                      </div>

                      {/* Col 4: Gabarito ITBI (Topo) */}
                      <div className={`relative group/itbi p-2 rounded-lg border shadow-xs flex flex-col justify-center cursor-help ${isVerifiedValuation ? 'bg-amber-950/30 border-amber-500/40' : 'bg-rose-950/40 border-rose-500/70'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-amber-400 block uppercase font-bold tracking-wider flex items-center space-x-0.5 truncate">
                            <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span>Gabarito ITBI</span>
                          </span>
                          <span className="text-[8.5px] text-amber-400/80 font-mono">ℹ️</span>
                        </div>
                        <span className={`text-xs sm:text-sm font-black font-mono block mt-0.5 ${isVerifiedValuation ? 'text-amber-300' : 'text-rose-300'}`}>
                          {!auc.estimatedValue
                            ? <span className="text-rose-300 font-mono text-[11px]">Sem fonte segura</span>
                            : <>{formatBRL(auc.estimatedValue)}{!isVerifiedValuation && <span className="block text-[8px]">PROJEÇÃO - BAIRRO</span>}</>}
                        </span>

                        {/* Tooltip flutuante no hover */}
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950/98 text-slate-200 rounded-xl border border-amber-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/itbi:opacity-100 transition-opacity z-50 text-left">
                          <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1 mb-1">
                            <span>🏛️ Gabarito Oficial de ITBI</span>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                            Valor de avaliação pericial apurado pelo histórico de escrituras públicas de compra e venda registradas na Prefeitura para esta via e bairro (Norma NBR 14.653 com saneamento Chauvenet).
                          </p>
                          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[9.5px] font-mono text-slate-400 flex justify-between">
                            <span>Unitário:</span>
                            <strong className="text-amber-300">R$ {(auc.itbiStreetAvgSqm || auc.itbiUnitValueAvg || 0).toLocaleString('pt-BR')}/m²</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Core Financial Indicators - Grid Linha 2 (4 Colunas Perfeitamente Alinhadas) */}
                    <div data-tour={idx === 0 ? "card-return" : undefined} className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 items-stretch text-left">
                      {/* Col 1: ROI Projetado */}
                      <div className="flex flex-col justify-center">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">ROI Projetado</span>
                        <span className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${
                          !isVerifiedValuation ? 'text-rose-400' :
                          (auc.calculatedRoi || 0) > 40 ? 'text-emerald-400' : 
                          (auc.calculatedRoi || 0) > 20 ? 'text-indigo-400' : 'text-slate-200'
                        }`}>
                          {auc.calculatedRoi === undefined
                            ? 'Sob consulta'
                            : <>{auc.calculatedRoi.toLocaleString('pt-BR')}%{isProjectedValuation && <span className="block text-[8px]">PROJEÇÃO NÃO RANQUEADA</span>}</>}
                        </span>
                      </div>

                      {/* Col 2: Avaliação Caixa */}
                      <div className="flex flex-col justify-center">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Avaliação Caixa</span>
                        <span className="text-xs sm:text-sm font-black text-slate-300 font-mono mt-0.5">
                          {auc.evaluationPrice ? formatBRL(auc.evaluationPrice) : '-'}
                        </span>
                      </div>

                      {/* Col 3: Liquidez (Do Lado Esquerdo do Flip Rápido) */}
                      <div className="relative group/liq bg-slate-950/50 p-2 rounded-lg border border-slate-800 flex flex-col justify-center cursor-help">
                        {(() => {
                          const streetCount = auc.itbiStreetCount || 0;
                          const roi = auc.calculatedRoi || 0;
                          const profit = auc.calculatedProfit || 0;
                          
                          // A nota é calculada e persistida no servidor. O card
                          // só a exibe, evitando regras concorrentes de 1/10.
                          const localSamples = auc.itbiStreetCount || 0;
                          const sourceCeiling = localSamples === 0 ? 4 : localSamples < 3 ? 6 : 10;
                          const effScore = Math.max(1, Math.min(sourceCeiling, auc.liquidityScore ?? 1));

                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Liquidez</span>
                                <span className="text-[8.5px] text-slate-400 font-mono">ℹ️</span>
                              </div>
                              <div className="flex items-center space-x-1 mt-0.5">
                                <span className={`text-xs sm:text-sm font-black font-mono ${
                                  effScore >= 8 ? 'text-emerald-400' :
                                  effScore >= 5 ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                  {effScore}/10
                                </span>
                              </div>

                              {/* Tooltip flutuante no hover */}
                              <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950/98 text-slate-200 rounded-xl border border-indigo-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/liq:opacity-100 transition-opacity z-50 text-left">
                                <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1 mb-1">
                                  <span>📊 Critérios de Liquidez ({effScore}/10)</span>
                                </div>
                                <div className="text-[9.5px] text-slate-300 space-y-1 font-sans">
                                  <div className="flex justify-between border-b border-slate-850 pb-0.5">
                                    <span>Amostras na Via:</span>
                                    <strong className="font-mono text-slate-200">{streetCount} transações</strong>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-850 pb-0.5">
                                    <span>Margem / Retorno:</span>
                                    <strong className="font-mono text-emerald-400">ROI {roi}% / R$ {profit.toLocaleString('pt-BR')}</strong>
                                  </div>
                                  <p className="text-[9px] text-slate-400 pt-1 leading-tight font-sans">
                                    Nota auditada combinando velocidade histórica de escrituração da via, segurança de posse e atratividade financeira.
                                  </p>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Col 4: Flip Rápido (60d) - EXATAMENTE EMBAIXO DO GABARITO ITBI & DO MESMO TAMANHO */}
                      <div className={`relative group/flip p-2 rounded-lg border shadow-xs flex flex-col justify-center cursor-help ${isVerifiedValuation ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/40 border-rose-500/70'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] block uppercase font-bold tracking-wider truncate ${isVerifiedValuation ? 'text-emerald-400' : 'text-rose-300'}`} title="Flip Rápido (60d)">
                            Flip Rápido (60d)
                          </span>
                          <span className="text-[8.5px] text-emerald-400/80 font-mono">ℹ️</span>
                        </div>
                        <span className={`text-xs sm:text-sm font-black font-mono block mt-0.5 ${isVerifiedValuation ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {!auc.vendaBaixaPrice ? (
                            <span className="text-rose-300 font-mono text-[11px]">Sem fonte segura</span>
                          ) : (
                            <>{formatBRL(auc.vendaBaixaPrice)}{!isVerifiedValuation && <span className="block text-[8px]">PROJEÇÃO NÃO RANQUEADA</span>}</>
                          )}
                        </span>

                        {/* Tooltip flutuante no hover */}
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950/98 text-slate-200 rounded-xl border border-emerald-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/flip:opacity-100 transition-opacity z-50 text-left">
                          <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 mb-1">
                            <span>⚡ Preço Sugerido p/ Revenda Rápida</span>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                            90% do corte ITBI verificado no nível disponível (prédio, rua ou raio), com depreciação de idade quando aplicável. Portais não participam deste cálculo.
                          </p>
                          {auc.ageDepreciationPct && auc.ageDepreciationPct > 0 ? (
                            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[9.5px] font-mono text-amber-300 flex justify-between">
                              <span>Depreciação de Idade:</span>
                              <strong>-{auc.ageDepreciationPct}% (Ross-Heidecke)</strong>
                            </div>
                          ) : (
                            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[9px] font-mono text-emerald-400">
                              ✓ Sem depreciação por idade
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {auc.streetRadiusCalibrated && auc.itbiSurroundingAvgSqm && auc.itbiStreetAvgSqm && (
                      <div className="border border-indigo-700/50 bg-indigo-950/30 px-3 py-2 rounded-lg text-[10px] text-indigo-200 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <strong>Calibragem rua–raio:</strong>
                        <span>Rua R$ {auc.itbiStreetAvgSqm.toLocaleString('pt-BR')}/m² versus raio R$ {auc.itbiSurroundingAvgSqm.toLocaleString('pt-BR')}/m².</span>
                        <span className="text-indigo-300/80">Diferença atípica ponderada pela amostragem válida.</span>
                      </div>
                    )}

                    {/* Real Estate Portals Comparison (Sem Links Externos que abrem páginas em branco) */}
                    <div data-tour={idx === 0 ? "card-portals" : undefined} className="border-t border-slate-800/80 pt-2.5 flex flex-col space-y-2 text-xs">
                      <div className="flex justify-between items-center gap-2 text-slate-400">
                        <span className="font-semibold text-slate-400">Média m² Anunciado na Rua:</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold text-white font-mono bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                            {auc.streetPortalAvgSqm && auc.portalDataVerifiedAt ? `${formatBRL(auc.streetPortalAvgSqm)}/m²` : 'Sem anúncios confirmados'}
                          </span>
                          <button
                            type="button"
                            onClick={() => refreshCardPortalData(auc)}
                            disabled={portalSearchIds.has(auc.id)}
                            className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-indigo-500 disabled:opacity-50"
                            title="Buscar anúncios individuais ativos nesta rua"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${portalSearchIds.has(auc.id) ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-slate-950/40 border border-slate-850 p-2 rounded-lg text-center">
                          <span className="text-[9px] text-slate-400 block font-medium uppercase tracking-wide">Média ZapImóveis</span>
                          <span className="font-bold text-white text-xs font-mono">
                            {auc.portalZapAvg && auc.portalDataVerifiedAt ? formatBRL(auc.portalZapAvg) : '-'}
                          </span>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-850 p-2 rounded-lg text-center">
                          <span className="text-[9px] text-slate-400 block font-medium uppercase tracking-wide">Média QuintoAndar</span>
                          <span className="font-bold text-white text-xs font-mono">
                            {auc.portalQuintoAndarAvg && auc.portalDataVerifiedAt ? formatBRL(auc.portalQuintoAndarAvg) : '-'}
                          </span>
                        </div>
                      </div>
                      {auc.portalDataVerifiedAt && auc.portalSampleCount ? (
                        <div className="text-[9px] text-emerald-700 font-semibold">{auc.portalSampleCount} anúncios individuais confirmados • conferência visual, fora do cálculo</div>
                      ) : (
                        <div className="text-[9px] text-rose-500 font-semibold">Sem fonte de anúncio auditável; nenhuma estimativa foi fabricada.</div>
                      )}
                    </div>

                    {/* Meta-metrics tags */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-dashed border-slate-800/80 items-center">
                      <span className={`text-[11px] flex items-center space-x-1 px-2 py-0.5 rounded border ${
                        auc.occupied 
                          ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' 
                          : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                      }`}>
                        <span>● {auc.occupied ? 'Ocupado' : 'Desocupado'}</span>
                      </span>
                      {auc.allowsFinancing && (
                        <span className="text-[11px] bg-blue-950/40 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded font-medium">
                          ✓ Financiamento
                        </span>
                      )}
                      {auc.allowsInstallments && (
                        <span className="text-[11px] bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 px-2 py-0.5 rounded font-medium">
                          ✓ Parcelamento
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMapProperty(auc);
                        }}
                        className="text-[11px] bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/60 px-2 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        title="Localizar imóvel no Mapa Georreferenciado"
                      >
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>Ver no Mapa</span>
                      </button>
                      {(() => {
                        const communityName = auc.isCommunityRisk ? auc.communityName : auc.nearbyCommunityName;
                        const faction = auc.isCommunityRisk ? auc.factionName : auc.nearbyFactionName;
                        const distance = auc.isCommunityRisk ? auc.communityDistanceM : auc.nearbyCommunityDistanceM;
                        if (!communityName) return null;
                        return (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded font-bold border border-rose-600/60 bg-rose-950/60 text-rose-300 flex items-center gap-1"
                            title={auc.isCommunityRisk ? 'Faixa crítica abaixo de 200m: reduz valor de venda e liquidez.' : 'Entre 200m e 350m: aviso informativo, sem alteração de valor ou liquidez.'}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{auc.isCommunityRisk ? 'ÁREA CRÍTICA' : 'PRÓX. COMUNIDADE'}: {communityName}{faction ? ` (${faction})` : ''} • {distance === 0 ? 'dentro' : `~${distance || 0}m`}</span>
                          </span>
                        );
                      })()}
                      <span className="text-[11px] bg-slate-850 text-slate-300 border border-slate-750 px-2 py-0.5 rounded font-mono" title="Média oficial por m² apurada no registro de transações municipais de ITBI da prefeitura (rua e entorno)">
                        🏛️ ITBI RUA: <span className="text-white font-bold">{auc.itbiStreetAvgSqm ? `${formatBRL(auc.itbiStreetAvgSqm)}/m²` : 'Sem dados'}</span> | ITBI ENTORNO (RAIO): <span className="text-white font-bold">{auc.itbiUnitValueAvg ? `${formatBRL(auc.itbiUnitValueAvg)}/m²` : '-'}</span>
                      </span>
                      {auc.aiAppreciationScore && (
                        <span className="text-[11px] bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded">
                          ★ Potencial IA: {auc.aiAppreciationScore}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div data-tour={idx === 0 ? "card-actions" : undefined} className="bg-slate-950/45 border-t border-slate-800/80 px-5 py-3.5 flex justify-between items-center">
                    <button
                      onClick={() => setSimulatingAuction(auc)}
                      className="text-xs font-black text-white flex items-center space-x-1.5 cursor-pointer transition-all bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-3.5 py-2 rounded-xl border border-indigo-500 shadow-md shadow-indigo-600/30"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>Simular Viabilidade & Jurídico</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white" />
                    </button>

                    <div className="flex items-center space-x-2">
                      {auc.auctionLink && (
                        <a
                          href={auc.auctionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors px-2 py-1 rounded hover:bg-emerald-950/20"
                          title={auc.origin === 'portal' ? 'Ver buscas no portal' : 'Ver edital original'}
                        >
                          <span>{auc.origin === 'portal' ? 'Acessar Portal' : 'Acessar Leilão'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          onUpdateProperty({ id: auc.id, saved: !auc.saved });
                        }}
                        className={`text-xs font-bold px-2.5 py-1 rounded-md border flex items-center space-x-1 transition-all cursor-pointer ${
                          auc.saved 
                            ? 'bg-rose-950/30 border-rose-900/40 text-rose-400 hover:bg-rose-950/50' 
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                        }`}
                        title={auc.saved ? 'Remover do calendário' : 'Salvar para o calendário do perfil'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${auc.saved ? 'fill-current' : ''}`} />
                        <span>{auc.saved ? 'Salvo' : 'Salvar'}</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza de que deseja remover esta oportunidade da mineradora?')) {
                            onDeleteAuction(auc.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded transition-colors cursor-pointer"
                        title="Remover leilão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* In-Tab Sliding Drawer for Simulation & Legal Viability */}
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

        {selectedMapProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-[96vw] lg:max-w-6xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <PropertyMap
                auctions={auctions}
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

        {isGeneralMapOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-[96vw] lg:max-w-6xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <PropertyMap
                auctions={auctions}
                initialFilteredAuctions={filteredAndSortedAuctions}
                onSelectPropertyFromMap={(id) => {
                  const found = auctions.find(a => a.id === id);
                  if (found) {
                    setIsGeneralMapOpen(false);
                    setSimulatingAuction(found);
                  }
                }}
                onClose={() => setIsGeneralMapOpen(false)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
