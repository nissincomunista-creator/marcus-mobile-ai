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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RealValueCalculator from './RealValueCalculator.tsx';
import PropertyMap from './PropertyMap.tsx';
import { checkPropertyCommunityRisk } from '../utils/communityRisk.ts';

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
  selectedTypeFilter: string;
  setSelectedTypeFilter: (val: string) => void;
  selectedStateFilter: string;
  setSelectedStateFilter: (val: string) => void;
  maxPriceFilter: string;
  setMaxPriceFilter: (val: string) => void;
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
  selectedOriginFilter: 'caixa' | 'judicial' | 'extrajudicial' | 'portal';
  setSelectedOriginFilter: (val: 'caixa' | 'judicial' | 'extrajudicial' | 'portal') => void;
  onOpenLinkModal: () => void;
  onSyncCaixaAuto?: () => void;
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
  itbiStats = [],
  onClearAll,
  onOpenCapitalMatcher
}: DashboardProps) {
  const [simulatingAuction, setSimulatingAuction] = React.useState<AuctionProperty | null>(null);
  const [selectedMapProperty, setSelectedMapProperty] = React.useState<AuctionProperty | null>(null);
  const [isGeneralMapOpen, setIsGeneralMapOpen] = React.useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = React.useState<'caixa' | 'capital' | null>(null);
  const [localMiningType, setLocalMiningType] = React.useState<'judicial' | 'caixa' | 'portal' | null>(null);
  const [selectedGarimpoCity, setSelectedGarimpoCity] = React.useState<string>('ambas');

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

  // Extract unique neighborhoods from auctions for filters (filtered by selectedStateFilter, selectedCityFilter and selectedOriginFilter)
  const uniqueNeighborhoods = React.useMemo(() => {
    let list = auctions.filter(checkOriginMatch);
    if (selectedStateFilter) {
      list = list.filter(a => (a.state || 'SP').toUpperCase() === selectedStateFilter.toUpperCase());
    }
    if (selectedCityFilter) {
      const normCity = normalizeText(selectedCityFilter);
      list = list.filter(a => normalizeText(a.city || '').includes(normCity) || normCity.includes(normalizeText(a.city || '')));
    }

    const titleCased = list
      .map(a => a.neighborhood ? a.neighborhood.trim().split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ') : '')
      .filter(Boolean);
    return Array.from(new Set(titleCased)).sort();
  }, [auctions, selectedStateFilter, selectedCityFilter, selectedOriginFilter]);

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
    if (selectedNeighborhoodFilter) {
      const normNeighFilter = normalizeText(selectedNeighborhoodFilter);
      result = result.filter(a => normalizeText(a.neighborhood || '') === normNeighFilter);
    }
    if (selectedTypeFilter) {
      result = result.filter(a => a.propertyType === selectedTypeFilter);
    }
    if (maxPriceFilter) {
      const maxVal = Number(maxPriceFilter);
      if (!isNaN(maxVal)) {
        result = result.filter(a => a.auctionPrice <= maxVal);
      }
    }
    if (paymentFilter === 'financing') {
      result = result.filter(a => a.allowsFinancing === true);
    } else if (paymentFilter === 'installments') {
      result = result.filter(a => a.allowsInstallments === true);
    } else if (paymentFilter === 'both') {
      result = result.filter(a => a.allowsFinancing === true && a.allowsInstallments === true);
    }

    if (sortBy === 'roi') {
      result.sort((a, b) => (b.calculatedRoi || 0) - (a.calculatedRoi || 0));
    } else if (sortBy === 'profit') {
      result.sort((a, b) => (b.calculatedProfit || 0) - (a.calculatedProfit || 0));
    } else if (sortBy === 'liquidity') {
      result.sort((a, b) => (b.liquidityScore || 0) - (a.liquidityScore || 0));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => a.auctionPrice - b.auctionPrice);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.auctionPrice - a.auctionPrice);
    }

    return result;
  }, [auctions, selectedNeighborhoodFilter, selectedCityFilter, selectedTypeFilter, selectedStateFilter, maxPriceFilter, paymentFilter, sortBy, selectedOriginFilter]);

  const [visibleCount, setVisibleCount] = React.useState(12);

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
    const avgRoi = totalCount > 0 
      ? Math.round(filteredAndSortedAuctions.reduce((acc, a) => acc + (a.calculatedRoi || 0), 0) / totalCount)
      : 0;
    const totalPotentialProfit = filteredAndSortedAuctions.reduce((acc, a) => acc + (a.calculatedProfit || 0), 0);
    const highLiquidityCount = filteredAndSortedAuctions.filter(a => (a.liquidityScore || 0) >= 8).length;

    return { totalCount, avgRoi, totalPotentialProfit, highLiquidityCount };
  }, [filteredAndSortedAuctions]);

  // Format currency helper
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
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
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">ROI Médio Estimado</p>
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
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ganhos Potenciais</p>
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

            {/* Grupo de Ordenação - 2 em cima e 2 embaixo */}
            <div data-tour="sorting-map" className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-950/90 p-2 sm:px-3 sm:py-2.5 rounded-xl border border-slate-800/90 ml-auto">
              <span className="text-xs uppercase font-bold text-slate-300 font-mono tracking-wider shrink-0 mr-1 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ordenar por:</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {/* Linha 1: 2 botões em cima */}
                <button
                  onClick={() => setSortBy('profit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                    sortBy === 'profit'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-750'
                  }`}
                >
                  <span>💎 Maior Lucro</span>
                </button>
                <button
                  onClick={() => setSortBy('roi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                    sortBy === 'roi'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-750'
                  }`}
                >
                  <span>🚀 Maior ROI</span>
                </button>

                {/* Linha 2: 2 botões embaixo */}
                <button
                  onClick={() => setSortBy('liquidity')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                    sortBy === 'liquidity'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-750'
                  }`}
                >
                  <span>📊 Maior Liquidez</span>
                </button>
                <button
                  onClick={() => setSortBy('price_asc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                    sortBy === 'price_asc'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-750'
                  }`}
                >
                  <span>💵 Menor Preço</span>
                </button>
              </div>
            </div>
        </div>
      </div>

        <div data-tour="filters-bar" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">

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
                setSelectedNeighborhoodFilter(''); // reset neighborhood on city change
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
            <label className="block text-xs font-semibold text-slate-400 mb-1">Preço Máximo (R$)</label>
            <input
              type="number"
              placeholder="Ex: 500000"
              value={maxPriceFilter}
              onChange={(e) => setMaxPriceFilter(e.target.value)}
              className="w-full text-sm border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/80 focus:ring-indigo-500/30 outline-none transition-colors"
            />
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
              const isFeatured = (auc.calculatedRoi || 0) >= 40 && (auc.liquidityScore || 0) >= 7;

              return (
                <motion.div
                  key={auc.id}
                  layoutId={`auc-card-${auc.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-slate-900 border rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.7),0_5px_15px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.9),0_10px_25px_rgba(15,23,42,0.8)] hover:-translate-y-2 hover:scale-[1.008] transition-all duration-300 overflow-visible relative flex flex-col justify-between ${
                    isSelected 
                      ? 'border-indigo-400 ring-2 ring-indigo-400/60 shadow-[0_25px_55px_rgba(99,102,241,0.25)] -translate-y-1.5' 
                      : isFeatured 
                        ? 'border-indigo-500/50 ring-1 ring-indigo-500/30 bg-slate-900/95' 
                        : 'border-slate-750 hover:border-indigo-400'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    {/* Header Block with Type, Badges, Title & Address */}
                    <div data-tour={idx === 0 ? "card-header" : undefined} className="space-y-2">
                      {/* Upper Row: Type & Badges */}
                      <div className="flex justify-between items-start gap-2">
                        <span className="bg-slate-800 text-slate-200 text-xs font-semibold px-2 py-0.5 rounded border border-slate-700">
                          {auc.propertyType} • {auc.sizeSqm} m²
                          {auc.bedrooms ? ` • ${auc.bedrooms} qto${auc.bedrooms > 1 ? 's' : ''}` : ''}
                          {auc.parkingSpaces ? ` • ${auc.parkingSpaces} vg${auc.parkingSpaces > 1 ? 's' : ''}` : ''}
                        </span>
                        <div className="flex space-x-1.5">
                          {isFeatured && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              Destaque ★
                            </span>
                          )}
                          {auc.isCommunityRisk && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60 flex items-center gap-1">
                              ⚠️ {auc.communityName ? `${auc.communityName}` : 'Comunidade'} {auc.factionName ? `(${auc.factionName})` : ''}
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            auc.riskLevel === 'Baixo' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                            auc.riskLevel === 'Médio' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                            'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}>
                            Risco {auc.riskLevel}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            auc.status === 'Arrematado' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                            auc.status === 'Analisado' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {auc.status}
                          </span>
                        </div>
                      </div>

                      {/* Title & Address */}
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 font-display hover:text-slate-200 transition-colors" title={auc.title}>
                          {auc.title}
                        </h3>
                        <div className="flex items-center text-xs text-slate-400 mt-1 space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate" title={`${auc.address} (${auc.neighborhood} - ${auc.state || 'SP'})`}>
                            {auc.address} ({auc.neighborhood} - {auc.state || 'SP'})
                          </span>
                        </div>
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
                        <span className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${(auc.calculatedProfit || 0) >= 0 ? 'text-white' : 'text-rose-400'}`}>
                          {formatBRL(auc.calculatedProfit || 0)}
                        </span>
                      </div>

                      {/* Col 4: Gabarito ITBI (Topo) */}
                      <div className="relative group/itbi bg-amber-950/30 p-2 rounded-lg border border-amber-500/40 shadow-xs flex flex-col justify-center cursor-help">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-amber-400 block uppercase font-bold tracking-wider flex items-center space-x-0.5 truncate">
                            <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span>Gabarito ITBI</span>
                          </span>
                          <span className="text-[8.5px] text-amber-400/80 font-mono">ℹ️</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-amber-300 font-mono block mt-0.5">
                          {auc.estimatedValue ? formatBRL(auc.estimatedValue) : (auc.itbiUnitValueAvg ? formatBRL(auc.itbiUnitValueAvg * auc.sizeSqm) : 'N/A')}
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
                          (auc.calculatedRoi || 0) > 40 ? 'text-emerald-400' : 
                          (auc.calculatedRoi || 0) > 20 ? 'text-indigo-400' : 'text-slate-200'
                        }`}>
                          {auc.calculatedRoi ? auc.calculatedRoi.toLocaleString('pt-BR') : '0'}%
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
                          
                          let effScore = auc.liquidityScore || 5;

                          if (auc.isCommunityRisk) {
                            effScore = Math.min(effScore, 2);
                          } else if (roi <= 0 || profit <= 0) {
                            effScore = 1;
                          } else if (streetCount === 0) {
                            effScore = Math.min(effScore, 2);
                          } else if (streetCount === 1) {
                            effScore = Math.min(effScore, 3);
                          } else if (streetCount === 2) {
                            effScore = Math.min(effScore, 5);
                          } else if (streetCount < 5) {
                            effScore = Math.min(effScore, 6);
                          }

                          if (roi < 20) {
                            effScore = Math.min(effScore, 3);
                          } else if (roi < 30) {
                            effScore = Math.min(effScore, 5);
                          } else if (roi < 45) {
                            effScore = Math.min(effScore, 7);
                          }

                          if (profit < 30000) {
                            effScore = Math.min(effScore, 4);
                          }

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
                                    <span>Risco Territorial:</span>
                                    <strong className={`font-mono ${auc.isCommunityRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                                      {auc.isCommunityRisk ? 'Comunidade (Teto 2/10)' : 'Sem risco crítico'}
                                    </strong>
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
                      <div className="relative group/flip bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/40 shadow-xs flex flex-col justify-center cursor-help">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-emerald-400 block uppercase font-bold tracking-wider truncate" title="Flip Rápido (60d)">
                            Flip Rápido (60d)
                          </span>
                          <span className="text-[8.5px] text-emerald-400/80 font-mono">ℹ️</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono block mt-0.5">
                          {formatBRL(auc.vendaBaixaPrice || (auc.estimatedValue ? Math.round(auc.estimatedValue * 0.90) : 0))}
                        </span>

                        {/* Tooltip flutuante no hover */}
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-950/98 text-slate-200 rounded-xl border border-emerald-500/40 shadow-2xl opacity-0 pointer-events-none group-hover/flip:opacity-100 transition-opacity z-50 text-left">
                          <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 mb-1">
                            <span>⚡ Preço Sugerido p/ Revenda Rápida</span>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                            85% ITBI (Piso Real de Cartório) + 15% Portais (Teto de Anúncios) calibrado para liquidez imediata em até 60 dias.
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

                    {/* Real Estate Portals Comparison (Sem Links Externos que abrem páginas em branco) */}
                    <div data-tour={idx === 0 ? "card-portals" : undefined} className="border-t border-slate-800/80 pt-2.5 flex flex-col space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="font-semibold text-slate-400">Média m² Anunciado na Rua:</span>
                        <span className="font-bold text-white font-mono bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                          {auc.streetPortalAvgSqm ? `${formatBRL(auc.streetPortalAvgSqm)}/m²` : '-'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-slate-950/40 border border-slate-850 p-2 rounded-lg text-center">
                          <span className="text-[9px] text-slate-400 block font-medium uppercase tracking-wide">Média ZapImóveis</span>
                          <span className="font-bold text-white text-xs font-mono">
                            {auc.portalZapAvg ? formatBRL(auc.portalZapAvg) : '-'}
                          </span>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-850 p-2 rounded-lg text-center">
                          <span className="text-[9px] text-slate-400 block font-medium uppercase tracking-wide">Média QuintoAndar</span>
                          <span className="font-bold text-white text-xs font-mono">
                            {auc.portalQuintoAndarAvg ? formatBRL(auc.portalQuintoAndarAvg) : '-'}
                          </span>
                        </div>
                      </div>
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
                      {(() => {
                        const risk = checkPropertyCommunityRisk(auc);
                        if (!risk.isRisk) return null;
                        return (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                              risk.level === 'high_risk'
                                ? 'bg-rose-955/80 text-rose-300 border-rose-700/60 shadow-xs'
                                : 'bg-amber-955/70 text-amber-300 border-amber-700/50'
                            }`}
                            title={risk.communityName ? `Área identificada: ${risk.communityName} ${risk.faction ? `(${risk.faction})` : ''}` : 'Área com alerta de risco'}
                          >
                            <span>{risk.badgeLabel || '⚠️ Área de Risco'}</span>
                          </span>
                        );
                      })()}
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
                  vendaBaixaPrice: simulatingAuction.vendaBaixaPrice || Math.round((simulatingAuction.estimatedValue || 0) * 0.90),
                  vendaMediaPrice: simulatingAuction.vendaMediaPrice,
                  ageDepreciationPct: simulatingAuction.ageDepreciationPct,
                  buildingAge: (simulatingAuction as any).buildingAge,
                }}
                onUpdateProperty={async (updates) => {
                  setAuctions(prev => prev.map(a => a.id === simulatingAuction.id ? { ...a, ...updates } : a));
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
