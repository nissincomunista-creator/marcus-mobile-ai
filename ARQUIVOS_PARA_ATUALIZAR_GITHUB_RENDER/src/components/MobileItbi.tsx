import React, { useState, useMemo } from 'react';
import { ItbiTransaction } from '../types';
import { Search, Building, MapPin, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';

interface MobileItbiProps {
  itbiTransactions: ItbiTransaction[];
  onSelectForCalculator?: (tx: ItbiTransaction) => void;
}

export const MobileItbi: React.FC<MobileItbiProps> = ({ itbiTransactions, onSelectForCalculator }) => {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);
  };

  const neighborhoodsSummary = useMemo(() => {
    const map = new Map<string, { city: string; state: string; count: number; totalSqm: number }>();

    for (const tx of itbiTransactions) {
      if (cityFilter && tx.city.toLowerCase() !== cityFilter.toLowerCase()) continue;
      const nb = tx.neighborhood;
      if (!nb) continue;
      const key = `${tx.city} - ${nb}`;
      const existing = map.get(key) || { city: tx.city, state: tx.state, count: 0, totalSqm: 0 };
      existing.count += 1;
      existing.totalSqm += (tx.unitValueSqm || 0);
      map.set(key, existing);
    }

    const list = Array.from(map.entries()).map(([key, d]) => ({
      name: key.split(' - ')[1],
      city: d.city,
      state: d.state,
      count: d.count,
      avgSqm: Math.round(d.totalSqm / d.count)
    }));

    if (search.trim()) {
      const q = search.toLowerCase();
      return list.filter(item => item.name.toLowerCase().includes(q) || item.city.toLowerCase().includes(q));
    }

    return list.sort((a, b) => b.count - a.count);
  }, [itbiTransactions, search, cityFilter]);

  return (
    <div className="max-w-lg mx-auto w-full px-4 pt-2 pb-24 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Building className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono">
            Base Oficial de ITBI (104k+ Transações)
          </span>
        </div>
      </div>

      {/* City selector pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { name: '', label: 'Todas Cidades' },
          { name: 'Rio de Janeiro', label: 'Rio de Janeiro' },
          { name: 'Niterói', label: 'Niterói' },
          { name: 'Juiz de Fora', label: 'Juiz de Fora' },
          { name: 'Santos Dumont', label: 'Santos Dumont' }
        ].map(c => (
          <button
            key={c.name}
            onClick={() => setCityFilter(c.name)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              cityFilter === c.name
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                : 'bg-slate-900 text-slate-300 border-slate-800'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar bairro no ITBI..."
          className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Neighborhoods List */}
      <div className="space-y-2">
        {neighborhoodsSummary.slice(0, 40).map((nb) => (
          <div
            key={`${nb.city}-${nb.name}`}
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-100">{nb.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono">
                {nb.city} ({nb.state}) • {nb.count} transações registradas
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-amber-400 font-mono block">
                R$ {nb.avgSqm.toLocaleString('pt-BR')}/m²
              </span>
              <span className="text-[9px] text-slate-400">Média Oficial ITBI</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
