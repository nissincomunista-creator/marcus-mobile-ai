import React from 'react';
import { AuctionProperty, PropertyType, BRAZIL_STATES } from '../types.ts';
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RealValueCalculator from './RealValueCalculator.tsx';

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
  onClearAll
}: DashboardProps) {
  const [simulatingAuction, setSimulatingAuction] = React.useState<AuctionProperty | null>(null);
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
  const uniqueStates = React.useMemo(() => {
    const list = auctions.filter(checkOriginMatch);
    const foundStates = Array.from(new Set(list.map(a => (a.state || '').toUpperCase()).filter(Boolean)));
    const all = Array.from(new Set([...foundStates, 'RJ', 'SP', 'MG'])).sort();
    return all;
  }, [auctions, selectedOriginFilter]);

  // Extract unique cities from auctions for filters (filtered by selectedStateFilter and selectedOriginFilter)
  const uniqueCities = React.useMemo(() => {
    let list = auctions.filter(checkOriginMatch);
    if (selectedStateFilter) {
      list = list.filter(a => (a.state || 'SP').toUpperCase() === selectedStateFilter.toUpperCase());
    }
    
    const citiesList = list.map(a => a.city).filter(Boolean) as string[];
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

    return Array.from(new Set(list.map(a => a.neighborhood).filter(Boolean) as string[])).sort();
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

      {/* Tab Selector for Source (Imóveis Caixa vs Judicial vs Extrajudicial vs Portais) */}
      <div className="bg-slate-900/80 p-1.5 rounded-xl flex flex-wrap gap-1.5 w-full border border-slate-800 backdrop-blur-md shadow-lg">
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

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {onSyncCaixaAuto && selectedOriginFilter === 'caixa' && (
              <button
                onClick={onSyncCaixaAuto}
                disabled={isMining}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                title="Varredura 100% automática da Caixa sem baixar planilhas"
              >
                {isMining ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Sparkles className="w-4 h-4 text-slate-950" />
                )}
                <span>⚡ Sincronizar Imóveis Caixa</span>
              </button>
            )}
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">

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

        {onClearAll && auctions.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/50 transition-colors cursor-pointer border border-rose-900/40 shadow-xs flex items-center space-x-1.5 self-start sm:self-auto"
            title="Zerar todas as pesquisas e imóveis garimpados"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Zerar Imóveis</span>
          </button>
        )}
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
                      onClick={() => setSimulatingAuction(auc)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1.5 cursor-pointer transition-colors bg-indigo-950/40 hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg border border-indigo-900/40"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Simular Viabilidade & Jurídico</span>
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
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
              className="relative w-screen max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl h-full overflow-y-auto z-10 p-6 space-y-6"
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
                itbiStats={itbiStats}
                prefillData={{
                  state: simulatingAuction.state || selectedStateFilter || 'RJ',
                  city: simulatingAuction.city,
                  neighborhood: simulatingAuction.neighborhood,
                  address: simulatingAuction.address,
                  propertyType: simulatingAuction.propertyType,
                  sizeSqm: simulatingAuction.sizeSqm,
                  purchasePrice: simulatingAuction.auctionPrice,
                  estimatedRepair: simulatingAuction.estimatedRepair,
                  pendingDebts: simulatingAuction.pendingDebts,
                  otherCosts: (simulatingAuction.itbiTax || 0) + (simulatingAuction.registryCost || 0) + (simulatingAuction.condoDebts || 0),
                  itbiUnitValueAvg: simulatingAuction.itbiUnitValueAvg,
                }}
                onClose={() => setSimulatingAuction(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
