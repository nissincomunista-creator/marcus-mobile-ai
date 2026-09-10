import React, { useState, useMemo, useEffect } from 'react';
import { AuctionProperty, ItbiStats, VALID_ITBI_CITIES_BY_STATE } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import RealValueCalculator from './RealValueCalculator.tsx';
import { 
  Wallet, 
  TrendingUp, 
  KeyRound, 
  ChevronRight, 
  ExternalLink, 
  Sparkles, 
  MapPin, 
  ArrowUpDown, 
  Coins, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  X
} from 'lucide-react';

interface CapitalInvestmentMatcherProps {
  auctions: AuctionProperty[];
  itbiStats: ItbiStats[];
  onSelectProperty: (auc: AuctionProperty) => void;
  onSimulateProperty: (auc: AuctionProperty) => void;
  onUpdateProperty: (updates: Partial<AuctionProperty>) => Promise<void>;
}

export default function CapitalInvestmentMatcher({
  auctions,
  itbiStats = [],
  onSimulateProperty,
  onUpdateProperty
}: CapitalInvestmentMatcherProps) {
  const [availableCapitalStr, setAvailableCapitalStr] = useState<string>(() => {
    return localStorage.getItem('matcher_capital') || '150.000';
  });
  const [purchaseMode, setPurchaseMode] = useState<'all' | 'avista' | 'financiado'>(() => {
    return (localStorage.getItem('matcher_mode') as any) || 'all';
  });
  const [strategy, setStrategy] = useState<'revenda' | 'locacao'>(() => {
    return (localStorage.getItem('matcher_strategy') as any) || 'revenda';
  });
  const [minLiquidity, setMinLiquidity] = useState<number>(() => {
    const saved = localStorage.getItem('matcher_liquidity_v2');
    return saved ? Number(saved) : 1;
  });
  const [selectedState, setSelectedState] = useState<string>(() => {
    return localStorage.getItem('matcher_state') || '';
  });
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('matcher_city') || '';
  });
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(() => {
    return localStorage.getItem('matcher_neighborhood') || '';
  });
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(() => {
    return localStorage.getItem('matcher_type') || '';
  });
  const [sortBy, setSortBy] = useState<'roi' | 'profit' | 'yield' | 'outlay' | 'liquidity'>(() => {
    return (localStorage.getItem('matcher_sort') as any) || 'roi';
  });
  const [visibleCount, setVisibleCount] = useState<number>(30);
  const [simulatingProperty, setSimulatingProperty] = useState<AuctionProperty | null>(null);

  useEffect(() => {
    localStorage.setItem('matcher_capital', availableCapitalStr);
  }, [availableCapitalStr]);

  useEffect(() => {
    localStorage.setItem('matcher_mode', purchaseMode);
  }, [purchaseMode]);

  useEffect(() => {
    localStorage.setItem('matcher_strategy', strategy);
  }, [strategy]);

  useEffect(() => {
    localStorage.setItem('matcher_liquidity_v2', String(minLiquidity));
  }, [minLiquidity]);

  useEffect(() => {
    localStorage.setItem('matcher_state', selectedState);
  }, [selectedState]);

  useEffect(() => {
    localStorage.setItem('matcher_city', selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    localStorage.setItem('matcher_neighborhood', selectedNeighborhood);
  }, [selectedNeighborhood]);

  useEffect(() => {
    localStorage.setItem('matcher_type', selectedPropertyType);
  }, [selectedPropertyType]);

  useEffect(() => {
    localStorage.setItem('matcher_sort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    setVisibleCount(30);
  }, [availableCapitalStr, purchaseMode, strategy, minLiquidity, sortBy, selectedState, selectedCity, selectedNeighborhood, selectedPropertyType]);

  const safeAuctions = useMemo(() => Array.isArray(auctions) ? auctions.filter(Boolean) : [], [auctions]);

  // Unique states strictly filtered to those with real ITBI data: RJ, MG, SP
  const uniqueStates = useMemo(() => {
    const itbiValidStates = new Set(Object.keys(VALID_ITBI_CITIES_BY_STATE));
    const foundStates = Array.from(new Set(safeAuctions.map(a => (a?.state || '').toUpperCase()).filter(Boolean)));
    const filtered = foundStates.filter(st => itbiValidStates.has(st));
    return filtered.length > 0 ? filtered.sort() : ['RJ'];
  }, [safeAuctions]);

  // Unique cities filtered strictly to those with ITBI data
  const uniqueCities = useMemo(() => {
    const subset = selectedState ? safeAuctions.filter(a => (a?.state || 'RJ').toUpperCase() === selectedState.toUpperCase()) : safeAuctions;
    const normalizeCity = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    
    const allowedCities = selectedState && VALID_ITBI_CITIES_BY_STATE[selectedState.toUpperCase()]
      ? new Set(VALID_ITBI_CITIES_BY_STATE[selectedState.toUpperCase()].map(normalizeCity))
      : new Set(Object.values(VALID_ITBI_CITIES_BY_STATE).flat().map(normalizeCity));

    const cities = subset
      .filter(a => {
        if (!a?.city) return false;
        const norm = normalizeCity(a.city);
        return allowedCities.has(norm);
      })
      .map(a => a?.city || '')
      .filter(Boolean);

    return Array.from(new Set(cities)).sort();
  }, [safeAuctions, selectedState]);

  const uniqueNeighborhoods = useMemo(() => {
    const subset = safeAuctions.filter(a => {
      if (!a) return false;
      if (selectedState && (a.state || 'SP').toUpperCase() !== selectedState.toUpperCase()) return false;
      if (selectedCity && (a.city || '').toLowerCase() !== selectedCity.toLowerCase()) return false;
      return true;
    });
    return Array.from(new Set(subset.map(a => a?.neighborhood || '').filter(Boolean))).sort();
  }, [safeAuctions, selectedState, selectedCity]);

  const uniquePropertyTypes = useMemo(() => Array.from(new Set(safeAuctions.map(a => a?.propertyType || '').filter(Boolean))).sort(), [safeAuctions]);

  const availableCapital = useMemo(() => {
    const clean = availableCapitalStr.replace(/\./g, '').replace(/,/g, '.');
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
  }, [availableCapitalStr]);

  const presetValues = [50000, 100000, 150000, 250000, 500000, 1000000];

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const estimateNotary = (bid: number) => {
    if (bid <= 40000) return 650;
    if (bid <= 100000) return 1500;
    if (bid <= 200000) return 2400;
    if (bid <= 400000) return 3800;
    if (bid <= 600000) return 5200;
    if (bid <= 1000000) return 6800;
    return 9500;
  };

  const matchedOpportunities = useMemo(() => {
    if (availableCapital <= 0) return [];

    const results: any[] = [];

    for (const auc of auctions) {
      if (selectedState && (auc.state || 'SP').toUpperCase() !== selectedState.toUpperCase()) {
        continue;
      }
      if (selectedCity && (auc.city || '').toLowerCase() !== selectedCity.toLowerCase()) {
        continue;
      }
      if (selectedNeighborhood && (auc.neighborhood || '').toLowerCase() !== selectedNeighborhood.toLowerCase()) {
        continue;
      }
      if (selectedPropertyType && (auc.propertyType || '').toLowerCase() !== selectedPropertyType.toLowerCase()) {
        continue;
      }

      const auditedLiquidity = Number(auc.liquidityScore) || 1;
      const hasStreetEvidence = (auc.itbiStreetCount || 0) > 0;
      const hasAuditedExit = auc.valuationConfidence === 'verified' && hasStreetEvidence && (auc.vendaBaixaPrice || 0) > 0;
      const effectiveLiquidity = hasAuditedExit ? auditedLiquidity : Math.min(4, auditedLiquidity);

      if (effectiveLiquidity < minLiquidity) {
        continue;
      }

      const isCaixa = auc.origin === 'caixa' || (auc.id && auc.id.includes('caixa'));
      const bidPrice = auc.auctionPrice || 0;
      if (bidPrice <= 0) continue;

      const repairCost = Math.round(bidPrice * 0.05);
      const evalBase = auc.evaluationPrice || auc.estimatedValue || Math.round(bidPrice * 1.5);
      const condoCost = isCaixa ? Math.round(evalBase * 0.10) : (auc.pendingCondoCost || 0);
      const leiloeiroCost = isCaixa ? 0 : Math.round(bidPrice * 0.05);
      const itbiCost = Math.round(bidPrice * (auc.state === 'RJ' ? 0.03 : 0.02));
      const notaryCost = estimateNotary(bidPrice);

      const totalAcquisitionCostAVista = bidPrice + leiloeiroCost + itbiCost + notaryCost + repairCost + condoCost;

      const allowsFinancing = auc.allowsFinancing === true;
      const allowsInstallments = auc.allowsInstallments === true;
      const configuredDownpayment = auc.minDownpaymentPercent ?? auc.downpaymentPercent;
      const downpaymentPct = Math.min(1, Math.max(0, configuredDownpayment !== undefined
        ? configuredDownpayment / 100
        : (allowsFinancing && isCaixa ? 0.05 : 0.20)));
      const downpaymentVal = Math.round(bidPrice * downpaymentPct);
      const initialOutlayFinanciado = downpaymentVal + itbiCost + notaryCost + repairCost + condoCost;

      const fitsAVista = totalAcquisitionCostAVista <= availableCapital;
      const fitsFinanciado = (allowsFinancing || allowsInstallments) && initialOutlayFinanciado <= availableCapital;

      if (!fitsAVista && !fitsFinanciado) continue;

      if (purchaseMode === 'avista' && !fitsAVista) continue;
      if (purchaseMode === 'financiado' && !fitsFinanciado) continue;

      const primaryMode = fitsAVista && (purchaseMode === 'avista' || purchaseMode === 'all') ? 'avista' : 'financiado';
      const actualOutlay = primaryMode === 'avista' ? totalAcquisitionCostAVista : initialOutlayFinanciado;
      const capitalLeftover = availableCapital - actualOutlay;

      // Use the exact audited outputs shown in Garimpo. Never invent a resale
      // value from a generic multiplier inside the capital allocator.
      const gabaritoITBI = auc.estimatedValue || 0;
      const vendaPortais = auc.vendaBaixaPrice || 0;

      const brokerFee = Math.round(vendaPortais * 0.06);
      const grossProfit = vendaPortais - totalAcquisitionCostAVista - brokerFee;
      const capitalGainsTax = grossProfit > 0 ? Math.round(grossProfit * 0.15) : 0;
      const netProfit = grossProfit - capitalGainsTax;
      const roiPct = vendaPortais > 0 ? Math.round((netProfit / actualOutlay) * 100) : 0;

      const monthlyRent = Math.round(gabaritoITBI * 0.0055);
      const annualRent = monthlyRent * 12;
      const yieldPct = Number(((annualRent / actualOutlay) * 100).toFixed(1));

      results.push({
        auction: auc,
        isCaixa,
        primaryMode,
        fitsAVista,
        fitsFinanciado,
        paymentLabel: allowsFinancing
          ? 'Financiamento confirmado'
          : allowsInstallments
            ? 'Parcelamento confirmado'
            : 'Somente à vista',
        actualOutlay,
        capitalLeftover,
        costs: {
          bidPrice,
          downpaymentVal,
          repairCost,
          condoCost,
          itbiCost,
          notaryCost,
          leiloeiroCost,
          totalAcquisitionCostAVista,
          initialOutlayFinanciado
        },
        valuation: {
          gabaritoITBI,
          vendaPortais,
          monthlyRent,
          netProfit,
          roiPct,
          yieldPct
        },
        hasAuditedExit,
        effectiveLiquidity
      });
    }

    return results.sort((a, b) => {
      if (sortBy === 'roi') return (b.valuation.roiPct || 0) - (a.valuation.roiPct || 0);
      if (sortBy === 'profit') return (b.valuation.netProfit || 0) - (a.valuation.netProfit || 0);
      if (sortBy === 'yield') return (b.valuation.yieldPct || 0) - (a.valuation.yieldPct || 0);
      if (sortBy === 'outlay') return (a.actualOutlay || 0) - (b.actualOutlay || 0);
      if (sortBy === 'liquidity') return ((b.auction?.liquidityScore || 5) - (a.auction?.liquidityScore || 5));
      return 0;
    });
  }, [safeAuctions, availableCapital, purchaseMode, minLiquidity, selectedState, selectedCity, selectedNeighborhood, selectedPropertyType, sortBy]);

  return (
    <div className="space-y-6">
      <div data-tour="capital-input" className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span>Alocador Inteligente de Capital • Carteira do Investidor</span>
          </div>

          <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Quanto capital você tem disponível para investir?
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Insira o seu caixa disponível. O sistema calcula todos os custos reais de arrematação (lance/entrada, ITBI, cartório, reforma e condomínio Caixa) e filtra instantaneamente os imóveis mais rentáveis para o seu orçamento.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold font-mono text-lg">
                R$
              </span>
              <input
                type="text"
                value={availableCapitalStr}
                onChange={(e) => setAvailableCapitalStr(e.target.value)}
                placeholder="Ex: 150.000"
                className="w-full bg-slate-950/90 border-2 border-emerald-500/50 focus:border-emerald-400 rounded-2xl py-3 pl-12 pr-4 text-white text-xl font-black font-mono focus:outline-hidden transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {presetValues.map((val) => (
                <button
                  key={val}
                  onClick={() => setAvailableCapitalStr(val.toLocaleString('pt-BR'))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono cursor-pointer transition-all ${
                    availableCapital === val
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {val >= 1000000 ? `R$ ${(val / 1000000)}M` : `R$ ${val / 1000}k`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div data-tour="capital-filters" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 font-mono flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-indigo-400" />
            Modalidade:
          </span>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPurchaseMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                purchaseMode === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setPurchaseMode('avista')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                purchaseMode === 'avista' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              À Vista
            </button>
            <button
              onClick={() => setPurchaseMode('financiado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                purchaseMode === 'financiado' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Financiado (Entrada)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 font-mono flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            Estratégia:
          </span>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setStrategy('revenda'); setSortBy('roi'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                strategy === 'revenda' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Revenda Rápida (Flip)</span>
            </button>
            <button
              onClick={() => { setStrategy('locacao'); setSortBy('yield'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                strategy === 'locacao' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3 h-3" />
              <span>Renda / Locação</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 font-mono">Liquidez:</span>
          <select
            value={minLiquidity}
            onChange={(e) => setMinLiquidity(Number(e.target.value))}
            className="bg-slate-950 text-slate-200 text-xs font-mono font-bold rounded-xl border border-slate-800 px-3 py-1.5 focus:outline-hidden"
          >
            <option value={1}>Qualquer Liquidez (1+/10)</option>
            <option value={5}>Média / Alta (5+/10)</option>
            <option value={7}>Alta Liquidez (7+/10)</option>
            <option value={8}>Altíssima Liquidez (8+/10)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 font-mono flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            Ordenar por:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 text-slate-200 text-xs font-mono font-bold rounded-xl border border-slate-800 px-3 py-1.5 focus:outline-hidden"
          >
            {strategy === 'revenda' ? (
              <>
                <option value="roi">Maior ROI Projetado (%)</option>
                <option value="profit">Maior Lucro Líquido (R$)</option>
                <option value="outlay">Menor Aporte Necessário</option>
                <option value="liquidity">Maior Liquidez</option>
              </>
            ) : (
              <>
                <option value="yield">Maior Yield Anual (% a.a.)</option>
                <option value="profit">Maior Valor de Aluguel</option>
                <option value="outlay">Menor Aporte Necessário</option>
                <option value="liquidity">Maior Liquidez</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Sub-bar de Filtros Regionais e Tipologia */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 font-mono uppercase">Estado (UF)</label>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedCity('');
              setSelectedNeighborhood('');
            }}
            className="w-full text-xs border border-slate-800 rounded-xl p-2 bg-slate-950 text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="">Todos os Estados</option>
            {uniqueStates.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 font-mono uppercase">Cidade</label>
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setSelectedNeighborhood('');
            }}
            className="w-full text-xs border border-slate-800 rounded-xl p-2 bg-slate-950 text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="">Todas as cidades</option>
            {uniqueCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 font-mono uppercase">Bairro</label>
          <select
            value={selectedNeighborhood}
            onChange={(e) => setSelectedNeighborhood(e.target.value)}
            className="w-full text-xs border border-slate-800 rounded-xl p-2 bg-slate-950 text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="">Todos os bairros</option>
            {uniqueNeighborhoods.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1 font-mono uppercase">Tipo de Imóvel</label>
          <select
            value={selectedPropertyType}
            onChange={(e) => setSelectedPropertyType(e.target.value)}
            className="w-full text-xs border border-slate-800 rounded-xl p-2 bg-slate-950 text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="">Todos os tipos</option>
            {uniquePropertyTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
        <span>
          Encontradas <strong className="text-emerald-400">{matchedOpportunities.length} oportunidades</strong> viáveis para o capital de <strong className="text-white">{formatBRL(availableCapital)}</strong>
        </span>
        <span>
          {purchaseMode === 'avista' ? 'Modo: Compra à Vista' : purchaseMode === 'financiado' ? 'Modo: Entrada Financiada' : 'Modo: Ambos os Formatos'}
        </span>
      </div>

      {matchedOpportunities.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">Nenhum imóvel compatível com este aporte no momento</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Tente aumentar o capital disponível, selecionar a opção &ldquo;Financiado (Entrada)&rdquo; ou reduzir a exigência mínima de liquidez.
          </p>
        </div>
      ) : (
        <div data-tour="capital-results" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchedOpportunities.slice(0, visibleCount).map((match) => {
            const { auction: auc, primaryMode, paymentLabel, actualOutlay, capitalLeftover, costs, valuation, hasAuditedExit, effectiveLiquidity } = match;
            const isFeatured = hasAuditedExit && valuation.roiPct >= 40 && effectiveLiquidity >= 7;

            return (
              <div
                key={auc.id}
                className={`bg-slate-900 border rounded-xl shadow-md transition-colors overflow-hidden flex flex-col justify-between ${
                  isFeatured 
                    ? 'border-indigo-500/50 ring-1 ring-indigo-500/30 bg-slate-900/95' 
                    : 'border-slate-750 hover:border-indigo-400'
                }`}
              >
                <div className="p-5 pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {auc.propertyType || 'Imóvel'} • {auc.sizeSqm}m²
                      </span>
                      <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {auc.origin === 'caixa' || auc.origin === 'caixa_radar'
                          ? 'Caixa Retomado'
                          : auc.origin === 'extrajudicial'
                            ? 'Leilão Extrajudicial'
                            : auc.origin === 'judicial'
                              ? 'Leilão Judicial'
                              : 'Portal Imobiliário'}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded flex items-center gap-1 bg-slate-800 text-slate-200 border border-slate-700">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{paymentLabel}</span>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-white text-base leading-snug line-clamp-1">
                    {auc.title}
                  </h3>

                  <p className="text-xs text-slate-400 flex items-center gap-1 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{auc.address || 'Endereço'}, {auc.neighborhood} - {auc.city}/{auc.state}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${hasAuditedExit ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-rose-950/50 text-rose-300 border-rose-700/50'}`}>
                      {auc.valuationConfidence === 'verified' ? 'ITBI verificado' : 'Projeção não ranqueada'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-950 text-slate-300 border-slate-700">
                      Liquidez {effectiveLiquidity}/10
                    </span>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-950/50 border-y border-slate-800/60 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold">Aporte Total Necessário</span>
                    <p className="text-base font-black text-white font-mono">
                      {formatBRL(actualOutlay)}
                    </p>
                    <span className="text-[9.5px] text-slate-500 font-mono">
                      {primaryMode === 'avista'
                        ? 'Lance + todas as custas'
                        : `Entrada ${Math.round((costs.downpaymentVal / Math.max(1, costs.bidPrice)) * 100)}% + todas as custas`}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold">Sobra de Caixa do Investidor</span>
                    <p className="text-base font-black text-slate-200 font-mono">
                      {formatBRL(capitalLeftover)}
                    </p>
                    <span className="text-[9.5px] text-slate-500 font-mono">
                      Saldo livre do capital inserido
                    </span>
                  </div>
                </div>

                <div className="p-5 py-3.5 space-y-3 flex-1">
                  {strategy === 'revenda' ? (
                    <div className={`grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border ${hasAuditedExit ? 'border-slate-850' : 'border-rose-700/60'}`}>
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-mono uppercase block">Gabarito de Venda ITBI</span>
                        <span className="text-xs font-bold text-white font-mono block">
                          {valuation.gabaritoITBI > 0 ? formatBRL(valuation.gabaritoITBI) : 'Sob consulta'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-mono uppercase block">Lucro Líquido</span>
                        <span className="text-xs font-bold text-white font-mono block">
                          {hasAuditedExit ? formatBRL(valuation.netProfit) : 'Não calculado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-mono uppercase block">ROI Projetado</span>
                        <span className="text-xs font-black text-emerald-400 font-mono block">
                          {hasAuditedExit ? `${valuation.roiPct}%` : 'Não ranqueado'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-mono uppercase block">Aluguel Estimado</span>
                        <span className="text-xs font-bold text-white font-mono block">
                          {formatBRL(valuation.monthlyRent)}/mês
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-mono uppercase block">Yield Anual</span>
                        <span className="text-xs font-black text-emerald-400 font-mono block">
                          {valuation.yieldPct}% a.a.
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-400 font-mono uppercase block">Payback Estimado</span>
                        <span className="text-xs font-bold text-slate-200 font-mono block">
                          {(actualOutlay / (valuation.monthlyRent * 12)).toFixed(1)} anos
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono text-slate-400">
                    <span title="Reforma estimada de 5% do lance">🔨 Reforma: {formatBRL(costs.repairCost)}</span>
                    <span>•</span>
                    <span title="Condomínio estimado (até 10% da avaliação Caixa)">🏢 Condomínio: {formatBRL(costs.condoCost)}</span>
                    <span>•</span>
                    <span title="ITBI e Cartório provisionados">🏛️ ITBI/Cartório: {formatBRL(costs.itbiCost + costs.notaryCost)}</span>
                  </div>
                </div>

                <div className="p-4 pt-2 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSimulatingProperty(auc)}
                    className="text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 border border-indigo-500 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-600/30"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>Simular na Calculadora</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </button>

                  {auc.auctionLink && (
                    <a
                      href={auc.auctionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/40 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Acessar Imóvel</span>
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {matchedOpportunities.length > visibleCount && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            onClick={() => setVisibleCount(prev => prev + 30)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Carregar Mais Oportunidades</span>
            <span className="text-[11px] bg-indigo-800/80 px-2 py-0.5 rounded-full font-mono">
              Exibindo {Math.min(visibleCount, matchedOpportunities.length)} de {matchedOpportunities.length}
            </span>
          </button>
        </div>
      )}

      {/* In-Tab Sliding Drawer for Simulation & Legal Viability with RealValueCalculator */}
      <AnimatePresence>
        {simulatingProperty && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSimulatingProperty(null)}
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
                      {simulatingProperty.title} • {simulatingProperty.neighborhood}, {simulatingProperty.city} - {simulatingProperty.state || selectedState || 'RJ'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSimulatingProperty(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <RealValueCalculator
                key={simulatingProperty.id}
                itbiStats={itbiStats}
                prefillData={{
                  id: simulatingProperty.id,
                  title: simulatingProperty.title,
                  description: simulatingProperty.description,
                  auctionLink: simulatingProperty.auctionLink,
                  state: simulatingProperty.state || selectedState || 'RJ',
                  city: simulatingProperty.city,
                  neighborhood: simulatingProperty.neighborhood,
                  address: simulatingProperty.address,
                  propertyType: simulatingProperty.propertyType,
                  sizeSqm: simulatingProperty.sizeSqm,
                  bedrooms: (simulatingProperty as any).bedrooms,
                  parkingSpaces: (simulatingProperty as any).parkingSpaces,
                  purchasePrice: simulatingProperty.auctionPrice,
                  evaluationPrice: (simulatingProperty as any).evaluationPrice,
                  estimatedValue: simulatingProperty.estimatedValue,
                  acquisitionRule: simulatingProperty.origin === 'caixa' || (simulatingProperty.id && simulatingProperty.id.includes('caixa')) ? 'caixa' : 'leilao',
                  estimatedRepair: Math.round(simulatingProperty.auctionPrice * 0.05),
                  pendingDebts: (simulatingProperty as any).pendingCondoCost || Math.round(((simulatingProperty as any).evaluationPrice || 0) * 0.10),
                  otherCosts: (simulatingProperty.itbiTax || 0) + (simulatingProperty.registryCost || 0) + (simulatingProperty.condoDebts || 0),
                  itbiUnitValueAvg: simulatingProperty.itbiUnitValueAvg,
                  portalZapAvg: simulatingProperty.portalZapAvg,
                  portalQuintoAndarAvg: simulatingProperty.portalQuintoAndarAvg,
                  vendaBaixaPrice: simulatingProperty.vendaBaixaPrice,
                  vendaMediaPrice: simulatingProperty.vendaMediaPrice,
                  valuationConfidence: simulatingProperty.valuationConfidence,
                  valuationBasis: simulatingProperty.valuationBasis,
                  valuationSampleCount: simulatingProperty.valuationSampleCount,
                  valuationRadiusKm: simulatingProperty.valuationRadiusKm,
                  portalDataVerifiedAt: simulatingProperty.portalDataVerifiedAt,
                  portalSampleCount: simulatingProperty.portalSampleCount,
                  portalDataSource: simulatingProperty.portalDataSource,
                  streetPortalAvgSqm: simulatingProperty.streetPortalAvgSqm,
                  isCommunityRisk: simulatingProperty.isCommunityRisk,
                  communityName: simulatingProperty.communityName,
                  communityDistanceM: simulatingProperty.communityDistanceM,
                  matriculaText: simulatingProperty.matriculaText,
                }}
                onUpdateProperty={onUpdateProperty}
                onClose={() => setSimulatingProperty(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
