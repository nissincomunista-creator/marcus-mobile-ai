import React from 'react';
import { AuctionProperty, PropertyType } from '../types.ts';
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
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  selectedOriginFilter: 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal';
  setSelectedOriginFilter: (val: 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal') => void;
  onOpenLinkModal: () => void;
  itbiStats?: any[];
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
  itbiStats = []
}: DashboardProps) {
  const [localMiningType, setLocalMiningType] = React.useState<'judicial' | 'caixa' | 'portal' | null>(null);
  const [selectedGarimpoCity, setSelectedGarimpoCity] = React.useState<string>('ambas');

  React.useEffect(() => {
    if (!isMining) {
      setLocalMiningType(null);
    }
  }, [isMining]);
  
  
  const normalizeText = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';

  // Extract unique cities from auctions for filters (filtered by selectedStateFilter and selectedOriginFilter)
  const uniqueCities = React.useMemo(() => {
    let list = auctions.filter(a => {
      const origin = a.origin || (a.id.startsWith('auc-caixa-radar') ? 'caixa_radar' : (a.id.startsWith('auc-caixa') ? 'caixa' : 'judicial'));
      return origin === selectedOriginFilter;
    });
    if (selectedStateFilter) {
      list = list.filter(a => (a.state || 'SP').toUpperCase() === selectedStateFilter.toUpperCase());
    }
    
    const citiesList = list.map(a => a.city || (selectedStateFilter === 'RJ' ? 'Rio de Janeiro' : selectedStateFilter === 'MG' ? 'Juiz de Fora' : 'São Paulo'));
    return Array.from(new Set(citiesList)).sort();
  }, [auctions, selectedStateFilter, selectedOriginFilter]);

  // Extract unique neighborhoods from auctions for filters (filtered by selectedStateFilter, selectedCityFilter and selectedOriginFilter)
  const uniqueNeighborhoods = React.useMemo(() => {
    let list = auctions.filter(a => {
      const origin = a.origin || (a.id.startsWith('auc-caixa-radar') ? 'caixa_radar' : (a.id.startsWith('auc-caixa') ? 'caixa' : 'judicial'));
      return origin === selectedOriginFilter;
    });
    if (selectedStateFilter) {
      list = list.filter(a => (a.state || 'SP').toUpperCase() === selectedStateFilter.toUpperCase());
    }
    if (selectedCityFilter) {
      const normCity = normalizeText(selectedCityFilter);
      list = list.filter(a => normalizeText(a.city || '').includes(normCity) || normCity.includes(normalizeText(a.city || '')));
    }

    return Array.from(new Set(list.map(a => a.neighborhood))).sort();
  }, [auctions, selectedStateFilter, selectedCityFilter, selectedOriginFilter]);

  // Extract unique states to filter by (filtered by selectedOriginFilter)
  const uniqueStates = React.useMemo(() => {
    const list = auctions.filter(a => {
      const origin = a.origin || (a.id.startsWith('auc-caixa-radar') ? 'caixa_radar' : (a.id.startsWith('auc-caixa') ? 'caixa' : 'judicial'));
      return origin === selectedOriginFilter;
    });
    return Array.from(new Set(list.map(a => a.state || 'SP')));
  }, [auctions, selectedOriginFilter]);

  // Filter & Sort listing
  const filteredAndSortedAuctions = React.useMemo(() => {
    let result = auctions.filter(a => {
      const origin = a.origin || (a.id.startsWith('auc-caixa-radar') ? 'caixa_radar' : (a.id.startsWith('auc-caixa') ? 'caixa' : 'judicial'));
      return origin === selectedOriginFilter;
    });

    if (selectedStateFilter) {
      result = result.filter(a => (a.state || 'SP').toUpperCase() === selectedStateFilter.toUpperCase());
    }

    if (selectedCityFilter) {
      const normCity = normalizeText(selectedCityFilter);
      result = result.filter(a => normalizeText(a.city || '').includes(normCity) || normCity.includes(normalizeText(a.city || '')));
    }
    if (selectedNeighborhoodFilter) {
      result = result.filter(a => a.neighborhood === selectedNeighborhoodFilter);
    }
    if (selectedNeighborhoodFilter) {
      result = result.filter(a => a.neighborhood === selectedNeighborhoodFilter);
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

  const [visibleCount, setVisibleCount] = React.useState(10);

  // Reset visibleCount when filters/sorting change to optimize responsiveness
  React.useEffect(() => {
    setVisibleCount(10);
  }, [selectedNeighborhoodFilter, selectedCityFilter, selectedTypeFilter, selectedStateFilter, maxPriceFilter, paymentFilter, sortBy, selectedOriginFilter]);

  // Infinite scroll listener
  React.useEffect(() => {
    function handleScroll() {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 150
      ) {
        setVisibleCount(prev => Math.min(prev + 10, filteredAndSortedAuctions.length));
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

  // Top 3 opportunities for executive summary
  const topRadarHighlights = React.useMemo(() => {
    if (selectedOriginFilter !== 'caixa_radar') return [];
    return [...filteredAndSortedAuctions]
      .sort((a, b) => (b.calculatedProfit || 0) - (a.calculatedProfit || 0))
      .slice(0, 3);
  }, [filteredAndSortedAuctions, selectedOriginFilter]);

  // Top profitable neighborhoods for current city/state filter
  const topProfitableNeighborhoods = React.useMemo(() => {
    if (selectedOriginFilter !== 'caixa_radar') return [];
    const map = new Map<string, { count: number; totalProfit: number; avgRoi: number; avgSqm: number }>();
    for (const a of filteredAndSortedAuctions) {
      if (!a.neighborhood) continue;
      const nb = a.neighborhood;
      const entry = map.get(nb) || { count: 0, totalProfit: 0, avgRoi: 0, avgSqm: 0 };
      entry.count += 1;
      entry.totalProfit += (a.calculatedProfit || 0);
      entry.avgRoi += (a.calculatedRoi || 0);
      entry.avgSqm += (a.itbiUnitValueAvg || 0);
      map.set(nb, entry);
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgProfit: Math.round(data.totalProfit / data.count),
        avgRoi: Math.round(data.avgRoi / data.count),
        avgSqm: Math.round(data.avgSqm / data.count)
      }))
      .sort((a, b) => b.avgProfit - a.avgProfit)
      .slice(0, 5);
  }, [filteredAndSortedAuctions, selectedOriginFilter]);

  // Format currency helper
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div id="dashboard-tab" className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Premium Tab Selector for Source (Radar Caixa ITBI vs Caixa Geral vs Judicial vs Extrajudicial vs Portais) */}
      <div className="bg-slate-900/80 p-1.5 rounded-xl flex flex-wrap gap-1.5 w-full border border-slate-800 backdrop-blur-md shadow-lg">
        <button
          onClick={() => {
            setSelectedOriginFilter('caixa_radar');
            setSelectedNeighborhoodFilter('');
          }}
          className={`flex-1 min-w-[200px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
            selectedOriginFilter === 'caixa_radar'
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-950/40 border border-amber-400/30 ring-1 ring-amber-400/30'
              : 'text-amber-400 hover:text-amber-200 hover:bg-slate-800/60 bg-amber-950/20 border border-amber-900/30'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
          <span>⭐ Radar Oportunidades Caixa (Base ITBI)</span>
        </button>
        <button
          onClick={() => setSelectedOriginFilter('caixa')}
          className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
            selectedOriginFilter === 'caixa'
              ? 'bg-blue-600 text-white shadow-md border border-blue-500/20'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Imóveis Caixa (Geral)</span>
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

      {/* Special Intelligence Banner for Radar Caixa ITBI */}
      {selectedOriginFilter === 'caixa_radar' && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Inteligência Interna de Arbitragem
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Base Caixa Cruzada com 104k+ Transações Oficiais ITBI
                </span>
              </div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Garimpo dos Melhores Imóveis Caixa por Maior Lucro Real</span>
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl">
                Selecione a cidade desejada para ver o resumo executivo dos melhores imóveis com maior margem de lucro e maior desconto balizados pelo ITBI oficial.
              </p>
            </div>

            {/* Quick State & City Selector Cards */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setSelectedStateFilter('');
                  setSelectedCityFilter('');
                  setSelectedNeighborhoodFilter('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  !selectedCityFilter && !selectedStateFilter
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black ring-2 ring-amber-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700'
                }`}
              >
                Todas Cidades ({filteredAndSortedAuctions.length})
              </button>
              
              <button
                onClick={() => {
                  setSelectedStateFilter('RJ');
                  setSelectedCityFilter('Rio de Janeiro');
                  setSelectedNeighborhoodFilter('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center space-x-1.5 ${
                  normalizeText(selectedCityFilter) === 'rio de janeiro'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black ring-2 ring-amber-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700'
                }`}
              >
                <span>🏖️ Rio de Janeiro</span>
                <span className="text-[10px] opacity-75">(4.014)</span>
              </button>

              <button
                onClick={() => {
                  setSelectedStateFilter('RJ');
                  setSelectedCityFilter('Niterói');
                  setSelectedNeighborhoodFilter('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center space-x-1.5 ${
                  normalizeText(selectedCityFilter) === 'niteroi'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black ring-2 ring-amber-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700'
                }`}
              >
                <span>🌊 Niterói</span>
                <span className="text-[10px] opacity-75">(86)</span>
              </button>

              <button
                onClick={() => {
                  setSelectedStateFilter('MG');
                  setSelectedCityFilter('Juiz de Fora');
                  setSelectedNeighborhoodFilter('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center space-x-1.5 ${
                  normalizeText(selectedCityFilter) === 'juiz de fora'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black ring-2 ring-amber-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700'
                }`}
              >
                <span>⛰️ Juiz de Fora</span>
                <span className="text-[10px] opacity-75">(68)</span>
              </button>

              <button
                onClick={() => {
                  setSelectedStateFilter('MG');
                  setSelectedCityFilter('Santos Dumont');
                  setSelectedNeighborhoodFilter('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center space-x-1.5 ${
                  normalizeText(selectedCityFilter) === 'santos dumont'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black ring-2 ring-amber-400/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700'
                }`}
              >
                <span>🚂 Santos Dumont</span>
                <span className="text-[10px] opacity-75">(1)</span>
              </button>
            </div>
          </div>

          {/* Executive Summary: Top 3 Best Opportunities & Most Profitable Neighborhoods */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top 3 Best Opportunities Cards */}
            <div className="lg:col-span-2 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>⭐ Top Destaques de Maior Lucro ({selectedCityFilter || 'Geral'})</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Ordenado por Lucro Líquido Real vs ITBI
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topRadarHighlights.map((topAuc, idx) => (
                  <div
                    key={topAuc.id}
                    onClick={() => onSelectAuction(topAuc.id)}
                    className="bg-slate-950/70 border border-amber-500/30 hover:border-amber-400 rounded-xl p-3 space-y-2 cursor-pointer transition-all hover:bg-slate-950 hover:shadow-lg hover:shadow-amber-950/30 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-bl-lg">
                      #{idx + 1} MAIOR LUCRO
                    </div>
                    <div className="pr-12">
                      <p className="text-[11px] font-bold text-slate-200 line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {topAuc.neighborhood}, {topAuc.city}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono line-clamp-1">
                        {topAuc.address || 'Endereço Caixa'}
                      </p>
                    </div>

                    <div className="bg-slate-900/90 rounded-lg p-2 space-y-1 border border-slate-800">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Preço Caixa:</span>
                        <span className="font-bold text-slate-200 font-mono">{formatBRL(topAuc.auctionPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Valor ITBI:</span>
                        <span className="font-bold text-sky-300 font-mono">{formatBRL(topAuc.estimatedValue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800">
                        <span className="text-emerald-400 font-bold">Lucro Estimado:</span>
                        <span className="font-black text-emerald-400 font-mono">+{formatBRL(topAuc.calculatedProfit || 0)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono font-bold">
                        ROI: +{topAuc.calculatedRoi || 0}%
                      </span>
                      {topAuc.allowsFinancing && (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded font-semibold text-[9px]">
                          Aceita Financ.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Profitable Neighborhoods Column */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Top Bairros Mais Lucrativos</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">m² Médio ITBI</span>
              </div>

              <div className="space-y-1.5">
                {topProfitableNeighborhoods.map((nb, i) => (
                  <button
                    key={nb.name}
                    onClick={() => setSelectedNeighborhoodFilter(selectedNeighborhoodFilter === nb.name ? '' : nb.name)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all text-xs cursor-pointer border ${
                      selectedNeighborhoodFilter === nb.name
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-400 font-bold">
                        {i + 1}
                      </span>
                      <span className="font-bold">{nb.name}</span>
                      <span className="text-[10px] text-slate-400">({nb.count})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400">+{formatBRL(nb.avgProfit)}</span>
                      <span className="block text-[9px] text-slate-400 font-mono">R$ {nb.avgSqm.toLocaleString('pt-BR')}/m²</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel: Filters & Presets */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-slate-400" />
              <h2 className="font-semibold text-slate-100">
                {selectedOriginFilter === 'caixa_radar' ? 'Filtros da Análise Caixa' : 'Filtros de Garimpo'}
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

          {selectedOriginFilter === 'caixa_radar' ? (
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <span className="text-[11px] uppercase font-bold text-slate-400 font-mono tracking-wider mr-1">Ordenar por:</span>
              <button
                onClick={() => setSortBy('profit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  sortBy === 'profit'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border-slate-700'
                }`}
              >
                💎 Maior Lucro (R$)
              </button>
              <button
                onClick={() => setSortBy('roi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  sortBy === 'roi'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border-slate-700'
                }`}
              >
                🚀 Maior ROI (%)
              </button>
              <button
                onClick={() => setSortBy('price_asc')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  sortBy === 'price_asc'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border-slate-700'
                }`}
              >
                💵 Menor Preço (R$)
              </button>
              <button
                onClick={onViewMap}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer ml-1"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Mapa</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              {selectedStateFilter === 'MG' && (
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-lg p-2.5 shrink-0 text-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Garimpar em:</span>
                  <select
                    value={selectedGarimpoCity}
                    onChange={(e) => setSelectedGarimpoCity(e.target.value)}
                    className="bg-transparent border-0 text-xs font-bold text-slate-200 outline-none cursor-pointer focus:ring-0"
                  >
                    <option value="ambas" className="bg-slate-950 text-slate-200">Todas / Ambas</option>
                    <option value="juiz-de-fora" className="bg-slate-950 text-slate-200">Juiz de Fora</option>
                    <option value="santos-dumont" className="bg-slate-950 text-slate-200">Santos Dumont</option>
                  </select>
                </div>
              )}
              <button
                onClick={() => {
                  if (itbiCount === 0) {
                    alert('Nenhum registro de ITBI cadastrado na base municipal. Por favor, acesse a aba "Base ITBI Municipal" e adicione ou importe transações de ITBI para usarmos como referência de preço por m² antes de garimpar.');
                    return;
                  }
                  setLocalMiningType('judicial');
                  onGarimparJudiciais(selectedGarimpoCity);
                }}
                disabled={isMining}
                className={`relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:via-indigo-800 hover:to-violet-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMining ? 'cursor-wait' : 'cursor-pointer'
                }`}
                title="Garimpar leilões judiciais ativos direto dos portais dos leiloeiros"
              >
                {isMining ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Garimpando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>Garimpar Judiciais</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (itbiCount === 0) {
                    alert('Nenhum registro de ITBI cadastrado na base municipal. Por favor, acesse a aba "Base ITBI Municipal" e adicione ou importe transações de ITBI para usarmos como referência de preço por m² antes de garimpar.');
                    return;
                  }
                  setLocalMiningType('caixa');
                  onGarimparCaixa(selectedGarimpoCity);
                }}
                disabled={isMining}
                className={`bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMining && localMiningType === 'caixa' ? 'cursor-wait' : 'cursor-pointer'
                }`}
                title="Baixar e processar de forma 100% automática a base de imóveis retomados da Caixa Econômica Federal"
              >
                {isMining && localMiningType === 'caixa' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Processando Caixa...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-white" />
                    <span>Garimpar Imóveis Caixa</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (itbiCount === 0) {
                    alert('Nenhum registro de ITBI cadastrado na base municipal. Por favor, acesse a aba "Base ITBI Municipal" e adicione ou importe transações de ITBI para usarmos como referência de preço por m² antes de garimpar.');
                    return;
                  }
                  setLocalMiningType('portal');
                  onGarimparPortais(selectedGarimpoCity);
                }}
                disabled={isMining}
                className={`bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMining && localMiningType === 'portal' ? 'cursor-wait' : 'cursor-pointer'
                }`}
                title="Garimpar imóveis residenciais anunciados muito abaixo do mercado no ZapImóveis e QuintoAndar para Flip"
              >
                {isMining && localMiningType === 'portal' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Buscando Flips...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    <span>Garimpar Portais (Flip)</span>
                  </>
                )}
              </button>

              <button
                onClick={onViewMap}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-95 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-white" />
                <span>Mapa</span>
              </button>

              <button 
                id="btn-analisar-link"
                onClick={onOpenLinkModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 transition-colors cursor-pointer shadow-md hover:shadow-lg transform active:scale-95 duration-200"
                title="Analisar link de leilão judicial ou extrajudicial com IA"
              >
                <Link className="w-4 h-4" />
                <span>Analisar Link</span>
              </button>

              <button 
                id="btn-add-leilao"
                onClick={onOpenAddModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 transition-colors cursor-pointer shadow-md hover:shadow-lg transform active:scale-95 duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Leilão</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">

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

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Classificar por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full text-sm border border-slate-800 rounded-lg p-2 bg-slate-950 text-slate-200 hover:bg-slate-900 focus:bg-slate-950 focus:border-indigo-500/80 focus:ring-indigo-500/30 outline-none transition-colors cursor-pointer [&>option]:bg-slate-950 [&>option]:text-slate-200"
            >
              <option value="roi" className="bg-slate-950 text-slate-200">Maior Retorno (ROI %)</option>
              <option value="profit" className="bg-slate-950 text-slate-200">Maior Lucro Líquido (R$)</option>
              <option value="liquidity" className="bg-slate-950 text-slate-200">Melhor Liquidez (1-10)</option>
              <option value="price_asc" className="bg-slate-950 text-slate-200">Menor Preço de Leilão</option>
              <option value="price_desc" className="bg-slate-950 text-slate-200">Maior Preço de Leilão</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters Summary Indicator */}
      <div className="flex items-center justify-between text-xs bg-slate-950 border border-slate-850 rounded-lg py-2.5 px-3.5 shadow-inner">
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
      </div>

      {/* Grid of Results */}
      {filteredAndSortedAuctions.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-200">Nenhum leilão corresponde aos seus filtros.</p>
          <p className="text-xs text-slate-500 mt-1">Experimente limpar os filtros ou cadastrar uma nova oportunidade acima.</p>
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedAuctions.slice(0, visibleCount).map((auc) => {
              const totalCost = auc.auctionPrice + (auc.estimatedRepair || 0) + (auc.pendingDebts || 0) + (auc.otherCosts || 0);
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
                  className={`bg-slate-900 border rounded-xl shadow-sm hover:shadow-md hover:border-slate-700 transition-all overflow-hidden flex flex-col justify-between ${
                    isSelected 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                      : isFeatured 
                        ? 'border-indigo-500/40 ring-2 ring-indigo-500/5 bg-slate-900/95 shadow-md' 
                        : 'border-slate-800'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    {/* Upper Row: Type & Badges */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="bg-slate-800 text-slate-350 text-xs font-semibold px-2 py-0.5 rounded border border-slate-750/70">
                        {auc.propertyType} • {auc.sizeSqm} m²
                      </span>
                      <div className="flex space-x-1.5">
                        {isFeatured && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-950/50 text-indigo-400 border border-indigo-900/30 flex items-center gap-0.5 animate-pulse">
                            Destaque ★
                          </span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          auc.riskLevel === 'Baixo' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' :
                          auc.riskLevel === 'Médio' ? 'bg-amber-950/50 text-amber-400 border border-amber-900/30' :
                          'bg-rose-950/50 text-rose-400 border border-rose-900/30'
                        }`}>
                          Risco {auc.riskLevel}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          auc.status === 'Analisado' ? 'bg-blue-950/50 text-blue-400 border border-blue-900/30' :
                          auc.status === 'Arrematado' ? 'bg-purple-950/50 text-purple-400 border border-purple-900/30' :
                          'bg-slate-850 text-slate-400 border border-slate-750'
                        }`}>
                          {auc.status}
                        </span>
                      </div>
                    </div>

                    {/* Title & Address */}
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 font-display hover:text-indigo-400 transition-colors" title={auc.title}>
                        {auc.title}
                      </h3>
                      <div className="flex items-center text-xs text-slate-400 mt-1 space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate" title={`${auc.address} (${auc.neighborhood} - ${auc.state || 'SP'})`}>
                          {auc.address} ({auc.neighborhood} - {auc.state || 'SP'})
                        </span>
                      </div>
                    </div>

                    {/* Core Financial Indicators - Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                          {auc.origin === 'portal' ? 'Preço Anunciado' : 'Lance Mínimo'}
                        </span>
                        <span className="text-xs font-bold text-slate-205 font-mono">{formatBRL(auc.auctionPrice)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Custo Total Est.</span>
                        <span className="text-xs font-bold text-slate-205 font-mono" title={auc.origin === 'portal'
                          ? `Anúncio: ${formatBRL(auc.auctionPrice)} + Reforma: ${formatBRL(auc.estimatedRepair)} + Custos Legais: ${formatBRL(auc.otherCosts)}`
                          : `Lance: ${formatBRL(auc.auctionPrice)} + Reforma: ${formatBRL(auc.estimatedRepair)} + Dívidas: ${formatBRL(auc.pendingDebts)} + Custos Legais: ${formatBRL(auc.otherCosts)}`
                        }>
                          {formatBRL(totalCost)}
                        </span>
                      </div>
                      <div className="bg-amber-500/10 p-1.5 -m-0.5 rounded border border-amber-500/30 shadow-xs">
                        <span className="text-[9px] text-amber-300 block uppercase font-bold flex items-center space-x-0.5 mb-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                          <span>Gabarito ITBI</span>
                        </span>
                        <span className="text-xs font-black text-amber-300 font-mono">
                          {auc.itbiUnitValueAvg ? formatBRL(auc.itbiUnitValueAvg * auc.sizeSqm) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Key Metrics: Profit, ROI & Liquidity */}
                    <div className="grid grid-cols-3 gap-2 py-0.5">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">ROI Projetado</p>
                        <p className={`text-lg font-black font-mono ${
                          (auc.calculatedRoi || 0) > 60 ? 'text-emerald-400' : 
                          (auc.calculatedRoi || 0) > 30 ? 'text-indigo-400' : 'text-slate-350'
                        }`}>
                          {auc.calculatedRoi ? auc.calculatedRoi.toLocaleString('pt-BR') : '0'}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Lucro Estimado</p>
                        <p className="text-lg font-black text-slate-100 font-mono">
                          {formatBRL(auc.calculatedProfit || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Liquidez</p>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span className={`text-base font-black ${
                            (auc.liquidityScore || 5) >= 8 ? 'text-emerald-400' :
                            (auc.liquidityScore || 5) >= 5 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {auc.liquidityScore || 5}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">/10</span>
                        </div>
                      </div>
                    </div>

                    {/* Real Estate Portals Comparison */}
                    <div className="border-t border-slate-800/80 pt-3 flex flex-col space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="font-semibold text-slate-450">Média m² Anunciado na Rua:</span>
                        <span className="font-bold text-slate-200 font-mono bg-blue-950/40 text-blue-400 px-2 py-0.5 rounded border border-blue-900/30 text-[11px]">
                          {auc.streetPortalAvgSqm ? `${formatBRL(auc.streetPortalAvgSqm)}/m²` : 'Não informado'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-slate-950/40 border border-slate-800/60 p-2 rounded-lg text-center">
                          <span className="text-[9px] text-slate-500 block font-medium uppercase tracking-wide">Média ZapImóveis</span>
                          <span className="font-bold text-indigo-400 text-xs font-mono">
                            {auc.portalZapAvg ? formatBRL(auc.portalZapAvg) : 'Não informado'}
                          </span>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800/60 p-2 rounded-lg text-center">
                          <span className="text-[9px] text-slate-500 block font-medium uppercase tracking-wide">Média QuintoAndar</span>
                          <span className="font-bold text-indigo-400 text-xs font-mono">
                            {auc.portalQuintoAndarAvg ? formatBRL(auc.portalQuintoAndarAvg) : 'Não informado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Meta-metrics tags */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-dashed border-slate-800/80">
                      <span className={`text-[11px] flex items-center space-x-1 px-2 py-0.5 rounded ${
                        auc.occupied ? 'bg-orange-950/30 text-orange-400 border border-orange-900/30' : 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                      }`}>
                        <span>● {auc.occupied ? 'Ocupado' : 'Desocupado'}</span>
                      </span>
                      {auc.allowsFinancing && (
                        <span className="text-[11px] bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded font-medium">
                          ✓ Financiamento
                        </span>
                      )}
                      {auc.allowsInstallments && (
                        <span className="text-[11px] bg-blue-950/30 text-blue-400 border border-blue-900/30 px-2 py-0.5 rounded font-medium">
                          ✓ Parcelamento
                        </span>
                      )}
                      {auc.itbiUnitValueAvg && (
                        <span className="text-[11px] bg-slate-850 text-slate-350 border border-slate-750 px-2 py-0.5 rounded">
                          Valor local: {formatBRL(auc.itbiUnitValueAvg)}/m²
                        </span>
                      )}
                      {auc.aiAppreciationScore && (
                        <span className="text-[11px] bg-purple-950/30 text-purple-400 border border-purple-900/30 px-2 py-0.5 rounded">
                          ★ Potencial IA: {auc.aiAppreciationScore}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="bg-slate-950/45 border-t border-slate-800/80 px-5 py-3.5 flex justify-between items-center">
                    <button
                      onClick={() => onSelectAuction(auc.id)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <span>Simulador & Análise AI</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
    </div>
  );
}
