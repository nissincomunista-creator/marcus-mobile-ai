import React, { useState, useMemo } from 'react';
import { AuctionProperty, CalculatorState } from '../types';
import { Search, Sparkles, MapPin, DollarSign, TrendingUp, ExternalLink, Calculator, Filter } from 'lucide-react';

interface MobileRadarProps {
  auctions: AuctionProperty[];
  onAuditInCalculator: (auc: AuctionProperty) => void;
  selectedCityFilter: string;
  onCityFilterChange: (city: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
}

export const MobileRadar: React.FC<MobileRadarProps> = ({
  auctions,
  onAuditInCalculator,
  selectedCityFilter,
  onCityFilterChange,
  sortBy,
  onSortByChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);
  };

  const cities = [
    { name: '', label: 'Todas Cidades' },
    { name: 'Rio de Janeiro', label: '🏖️ Rio de Janeiro (4.014)' },
    { name: 'Niterói', label: '🌊 Niterói (86)' },
    { name: 'Juiz de Fora', label: '⛰️ Juiz de Fora (68)' },
    { name: 'Santos Dumont', label: '🚂 Santos Dumont (1)' }
  ];

  const filteredAuctions = useMemo(() => {
    let result = auctions.filter((a) => a.origin === 'caixa_radar');

    if (selectedCityFilter) {
      result = result.filter(
        (a) => (a.city || '').toLowerCase() === selectedCityFilter.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          (a.neighborhood || '').toLowerCase().includes(q) ||
          (a.address || '').toLowerCase().includes(q) ||
          (a.title || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'profit') {
      result.sort((a, b) => (b.calculatedProfit || 0) - (a.calculatedProfit || 0));
    } else if (sortBy === 'roi') {
      result.sort((a, b) => (b.calculatedRoi || 0) - (a.calculatedRoi || 0));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.auctionPrice || 0) - (b.auctionPrice || 0));
    }

    return result;
  }, [auctions, selectedCityFilter, searchQuery, sortBy]);

  return (
    <div className="max-w-lg mx-auto w-full px-4 pt-2 pb-24 space-y-3">
      {/* Header & City Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono">
              Radar Oportunidades Caixa (ITBI)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {filteredAuctions.length} imóveis
          </span>
        </div>

        {/* City Filter Pills (Horizontal Scroll) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {cities.map((c) => (
            <button
              key={c.name}
              onClick={() => onCityFilterChange(c.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCityFilter === c.name
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar & Fast Sort */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por bairro ou rua..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-2 py-2 focus:outline-none cursor-pointer"
        >
          <option value="profit">Maior Lucro</option>
          <option value="roi">Maior ROI</option>
          <option value="price_asc">Menor Preço</option>
        </select>
      </div>

      {/* Property Cards List */}
      <div className="space-y-3">
        {filteredAuctions.slice(0, 30).map((auc) => (
          <div
            key={auc.id}
            className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-md space-y-2.5 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 mb-1">
                  {auc.propertyType} • {auc.sizeSqm}m²
                </span>
                <h4 className="text-xs font-bold text-slate-100 line-clamp-1">
                  {auc.neighborhood}, {auc.city}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {auc.address || 'Endereço Caixa'}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lucro Líquido</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  +{formatBRL(auc.calculatedProfit || 0)}
                </span>
              </div>
            </div>

            {/* Price & ITBI Comparison Box */}
            <div className="bg-slate-950/70 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center border border-slate-800/80">
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-medium">Preço Caixa</span>
                <span className="text-xs font-bold text-slate-200 font-mono">{formatBRL(auc.auctionPrice)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-medium">Valor ITBI</span>
                <span className="text-xs font-bold text-sky-300 font-mono">{formatBRL(auc.estimatedValue)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-medium">ROI Real</span>
                <span className="text-xs font-black text-emerald-400 font-mono">+{auc.calculatedRoi || 0}%</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => onAuditInCalculator(auc)}
                className="flex-1 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Auditar na Calculadora</span>
              </button>

              {auc.auctionLink && (
                <a
                  href={auc.auctionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Caixa</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
