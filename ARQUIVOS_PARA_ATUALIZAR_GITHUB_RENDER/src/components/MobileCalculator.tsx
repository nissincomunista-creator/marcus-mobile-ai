import React from 'react';
import { CalculatorState, PropertyType } from '../types';
import { Sparkles, Calculator, Building2, MapPin, DollarSign, TrendingUp, ShieldCheck, RefreshCw } from 'lucide-react';

interface MobileCalculatorProps {
  calculator: CalculatorState;
  onChange: (newCalc: Partial<CalculatorState>) => void;
  onAskVoiceAboutCurrent: () => void;
}

export const MobileCalculator: React.FC<MobileCalculatorProps> = ({
  calculator,
  onChange,
  onAskVoiceAboutCurrent
}) => {
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);
  };

  const cities = [
    { name: 'Rio de Janeiro', state: 'RJ', itbi: 3 },
    { name: 'Niterói', state: 'RJ', itbi: 3 },
    { name: 'Juiz de Fora', state: 'MG', itbi: 2 },
    { name: 'Santos Dumont', state: 'MG', itbi: 2 },
    { name: 'São Paulo', state: 'SP', itbi: 3 }
  ];

  return (
    <div className="max-w-lg mx-auto w-full px-4 pt-2 pb-24 space-y-4">
      {/* Voice Badge Indicator */}
      {calculator.lastUpdatedByVoice && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-bold">Campos preenchidos automaticamente por Voz via Gemini!</span>
          </div>
        </div>
      )}

      {/* Main Results Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono flex items-center space-x-1.5">
            <Calculator className="w-4 h-4 text-amber-400" />
            <span>Resultado da Análise Real</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {calculator.city} ({calculator.state})
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400">Lucro Líquido Real</span>
            <p className={`text-lg font-black font-mono mt-0.5 ${calculator.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {calculator.netProfit >= 0 ? '+' : ''}{formatBRL(calculator.netProfit)}
            </p>
            <span className="text-[9px] text-slate-400 font-mono">Livre de impostos</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400">Retorno Real (ROI)</span>
            <p className={`text-lg font-black font-mono mt-0.5 ${calculator.roiPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {calculator.roiPercent >= 0 ? '+' : ''}{calculator.roiPercent}%
            </p>
            <span className="text-[9px] text-slate-400 font-mono">Sobre o capital investido</span>
          </div>
        </div>

        <div className="bg-slate-950/50 rounded-xl p-3 space-y-1.5 border border-slate-800/80 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Valor de Mercado ITBI:</span>
            <span className="font-bold text-sky-300 font-mono">{formatBRL(calculator.marketValueItbi)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Preço do m² no Bairro:</span>
            <span className="font-bold text-slate-200 font-mono">R$ {calculator.itbiSqm.toLocaleString('pt-BR')}/m²</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-800">
            <span className="text-slate-400">Custo Total de Aquisição:</span>
            <span className="font-bold text-slate-200 font-mono">{formatBRL(calculator.totalAcquisitionCost)}</span>
          </div>
        </div>

        <button
          onClick={onAskVoiceAboutCurrent}
          className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          <span>Perguntar Parecer ao Copiloto Gemini</span>
        </button>
      </div>

      {/* Form Fields */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3.5">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
          Dados do Imóvel & Custos
        </h3>

        {/* City & State Select */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cidade</label>
          <div className="grid grid-cols-2 gap-2">
            {cities.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  onChange({
                    city: c.name,
                    state: c.state,
                    itbiRate: c.itbi,
                    lastUpdatedByVoice: false
                  });
                }}
                className={`p-2 rounded-xl text-xs font-bold border transition-all text-left ${
                  calculator.city === c.name
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <span>{c.name}</span>
                <span className="block text-[9px] text-slate-400 font-normal">{c.state} (ITBI {c.itbi}%)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Neighborhood */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bairro</label>
          <input
            type="text"
            value={calculator.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value, lastUpdatedByVoice: false })}
            placeholder="Ex: Icaraí, Centro, São Mateus, Botafogo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-400 focus:border-amber-400 focus:outline-none"
          />
        </div>

        {/* Size & Auction Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Área (m²)</label>
            <input
              type="number"
              value={calculator.sizeSqm || ''}
              onChange={(e) => onChange({ sizeSqm: Number(e.target.value) || 0, lastUpdatedByVoice: false })}
              placeholder="Ex: 75"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-100 placeholder-slate-400 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lance / Preço Caixa (R$)</label>
            <input
              type="number"
              value={calculator.auctionPrice || ''}
              onChange={(e) => onChange({ auctionPrice: Number(e.target.value) || 0, lastUpdatedByVoice: false })}
              placeholder="Ex: 180000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-100 placeholder-slate-400 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Reform and Costs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Reforma Estimada (R$)</label>
            <input
              type="number"
              value={calculator.estimatedRepair || ''}
              onChange={(e) => onChange({ estimatedRepair: Number(e.target.value) || 0, lastUpdatedByVoice: false })}
              placeholder="Ex: 15000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-100 placeholder-slate-400 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Desocupação / Outros (R$)</label>
            <input
              type="number"
              value={calculator.evictionCost || ''}
              onChange={(e) => onChange({ evictionCost: Number(e.target.value) || 0, lastUpdatedByVoice: false })}
              placeholder="Ex: 6000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-100 placeholder-slate-400 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
