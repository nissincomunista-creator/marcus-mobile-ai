import React, { useState, useEffect, useMemo } from 'react';
import { AuctionProperty, SavedMarketAnalysis, ArrematacaoProperty, PropertyType } from '../types.ts';
import { 
  Calendar as CalendarIcon, 
  Bookmark, 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  ExternalLink, 
  Building, 
  User, 
  Activity, 
  CheckCircle2,
  Trash2,
  FileText,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  Plus,
  X,
  RefreshCw,
  Sparkles,
  Calculator,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExecutiveReportModal, { ExecutiveReportData } from './ExecutiveReportModal.tsx';

interface ProfileProps {
  auctions: AuctionProperty[];
  onUpdateProperty: (updates: Partial<AuctionProperty>) => Promise<void>;
  onSelectAuction: (id: string) => void;
}

export default function Profile({ auctions, onUpdateProperty, onSelectAuction }: ProfileProps) {
  // -------------------------------------------------------------
  // STATE: SAVED MARKET ANALYSES (CALCULADORA & ITBI)
  // -------------------------------------------------------------
  const [savedAnalyses, setSavedAnalyses] = useState<SavedMarketAnalysis[]>([]);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedMarketAnalysis | null>(null);
  const [analysisSortBy, setAnalysisSortBy] = useState<'roi' | 'profit' | 'date'>('roi');

  // Modal for viewing full PDF report of a saved analysis
  const [activeReportData, setActiveReportData] = useState<ExecutiveReportData | null>(null);

  // Fetch saved analyses from backend & localStorage cache
  const fetchSavedAnalyses = async () => {
    setIsLoadingAnalyses(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/saved-analyses', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedAnalyses(data);
        localStorage.setItem('user_saved_analyses_cache', JSON.stringify(data));
        if (data.length > 0 && !selectedAnalysis) {
          setSelectedAnalysis(data[0]);
        }
      } else {
        const cached = localStorage.getItem('user_saved_analyses_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          setSavedAnalyses(parsed);
          if (parsed.length > 0 && !selectedAnalysis) setSelectedAnalysis(parsed[0]);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar análises salvas:', e);
      const cached = localStorage.getItem('user_saved_analyses_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setSavedAnalyses(parsed);
          if (parsed.length > 0 && !selectedAnalysis) setSelectedAnalysis(parsed[0]);
        } catch (err) {}
      }
    } finally {
      setIsLoadingAnalyses(false);
    }
  };

  const handleDeleteAnalysis = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover esta análise salva?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/user/saved-analyses/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setSavedAnalyses(prev => {
        const updated = prev.filter(a => a.id !== id);
        localStorage.setItem('user_saved_analyses_cache', JSON.stringify(updated));
        return updated;
      });
      if (selectedAnalysis?.id === id) {
        setSelectedAnalysis(null);
      }
    } catch (err) {
      console.error('Erro ao excluir análise:', err);
    }
  };

  // -------------------------------------------------------------
  // STATE: ARREMATAÇÕES & GESTÃO PÓS-VENDA
  // -------------------------------------------------------------
  const [arrematacoes, setArrematacoes] = useState<ArrematacaoProperty[]>([]);
  const [isLoadingArrematacoes, setIsLoadingArrematacoes] = useState(false);
  const [isAddArremateModalOpen, setIsAddArremateModalOpen] = useState(false);
  const [editingArremate, setEditingArremate] = useState<ArrematacaoProperty | null>(null);

  // Form state for creating / editing an arrematação
  const [arremateForm, setArremateForm] = useState<Partial<ArrematacaoProperty>>({
    title: '',
    address: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    sizeSqm: 70,
    propertyType: 'Apartamento',
    arrematePrice: 200000,
    auctioneerFee: 10000,
    itbiFee: 6000,
    registryFee: 6000,
    reformCost: 15000,
    legalCost: 5000,
    iptuAndCondoDebts: 0,
    otherExpenses: 0,
    status: 'Reforma/Desocupação',
    holdingMonths: 6,
    monthlyHoldingCost: 800,
    salePrice: 0,
    brokerFeePaid: 0,
    capitalGainsTaxPaid: 0,
    rentMonthly: 0
  });

  const fetchArrematacoes = async () => {
    setIsLoadingArrematacoes(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/arrematacoes', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setArrematacoes(data);
        localStorage.setItem('user_arrematacoes_cache', JSON.stringify(data));
      } else {
        const cached = localStorage.getItem('user_arrematacoes_cache');
        if (cached) setArrematacoes(JSON.parse(cached));
      }
    } catch (e) {
      console.error('Erro ao carregar arrematações:', e);
      const cached = localStorage.getItem('user_arrematacoes_cache');
      if (cached) {
        try { setArrematacoes(JSON.parse(cached)); } catch (err) {}
      }
    } finally {
      setIsLoadingArrematacoes(false);
    }
  };

  const handleSaveArrematacao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const bid = Number(arremateForm.arrematePrice) || 0;
      const leil = Number(arremateForm.auctioneerFee) || 0;
      const itbi = Number(arremateForm.itbiFee) || 0;
      const reg = Number(arremateForm.registryFee) || 0;
      const ref = Number(arremateForm.reformCost) || 0;
      const leg = Number(arremateForm.legalCost) || 0;
      const deb = Number(arremateForm.iptuAndCondoDebts) || 0;
      const oth = Number(arremateForm.otherExpenses) || 0;
      const totalInv = bid + leil + itbi + reg + ref + leg + deb + oth;

      const holdMonths = Number(arremateForm.holdingMonths) || 0;
      const holdCostMonthly = Number(arremateForm.monthlyHoldingCost) || 0;
      const totalHoldingPaid = holdMonths * holdCostMonthly;

      const sPrice = Number(arremateForm.salePrice) || 0;
      const bFee = typeof arremateForm.brokerFeePaid === 'number'
        ? arremateForm.brokerFeePaid
        : (arremateForm.brokerFeePaid !== undefined && arremateForm.brokerFeePaid !== '' ? Number(arremateForm.brokerFeePaid) : 0);
      
      const taxPaid = typeof arremateForm.capitalGainsTaxPaid === 'number'
        ? arremateForm.capitalGainsTaxPaid
        : (arremateForm.capitalGainsTaxPaid !== undefined && arremateForm.capitalGainsTaxPaid !== '' ? Number(arremateForm.capitalGainsTaxPaid) : 0);
      
      const netRev = sPrice > 0 ? (sPrice - bFee - taxPaid) : 0;
      const netProfit = sPrice > 0 ? (netRev - totalInv - totalHoldingPaid) : 0;
      const netRoi = totalInv > 0 && sPrice > 0 ? Number(((netProfit / totalInv) * 100).toFixed(1)) : 0;
      const monthlyYield = holdMonths > 0 && netRoi !== 0 ? Number((netRoi / holdMonths).toFixed(2)) : 0;

      const rMonthly = Number(arremateForm.rentMonthly) || 0;
      const netRentAnnualYield = totalInv > 0 && rMonthly > 0 ? Number(((rMonthly * 12 / totalInv) * 100).toFixed(1)) : 0;

      const payload: ArrematacaoProperty = {
        id: editingArremate?.id || `arremate-${Date.now()}`,
        createdAt: editingArremate?.createdAt || new Date().toISOString(),
        title: arremateForm.title || `${arremateForm.propertyType} em ${arremateForm.neighborhood || 'Bairro'}`,
        address: arremateForm.address || '',
        neighborhood: arremateForm.neighborhood || '',
        city: arremateForm.city || 'São Paulo',
        state: arremateForm.state || 'SP',
        sizeSqm: Number(arremateForm.sizeSqm) || 50,
        propertyType: (arremateForm.propertyType as PropertyType) || 'Apartamento',
        
        arrematePrice: bid,
        auctioneerFee: leil,
        itbiFee: itbi,
        registryFee: reg,
        reformCost: ref,
        legalCost: leg,
        iptuAndCondoDebts: deb,
        otherExpenses: oth,
        totalInvested: totalInv,
        
        status: arremateForm.status || 'Reforma/Desocupação',
        holdingMonths: holdMonths,
        monthlyHoldingCost: holdCostMonthly,
        
        salePrice: sPrice,
        brokerFeePaid: bFee,
        capitalGainsTaxPaid: taxPaid,
        netRevenue: netRev,
        netProfitReal: netProfit,
        netRoiReal: netRoi,
        monthlyYieldReal: monthlyYield,
        
        rentMonthly: rMonthly,
        netRentYieldAnnual: netRentAnnualYield,
        notes: arremateForm.notes || ''
      };

      if (editingArremate) {
        await fetch(`/api/user/arrematacoes/${editingArremate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });
        setArrematacoes(prev => {
          const updated = prev.map(a => a.id === payload.id ? payload : a);
          localStorage.setItem('user_arrematacoes_cache', JSON.stringify(updated));
          return updated;
        });
      } else {
        await fetch('/api/user/arrematacoes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });
        setArrematacoes(prev => {
          const updated = [payload, ...prev];
          localStorage.setItem('user_arrematacoes_cache', JSON.stringify(updated));
          return updated;
        });
      }

      setIsAddArremateModalOpen(false);
      setEditingArremate(null);
    } catch (err) {
      console.error('Erro ao salvar arrematação:', err);
    }
  };

  const handleDeleteArrematacao = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir este registro de imóvel arrematado?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/arrematacoes/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        setArrematacoes(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Erro ao excluir arrematação:', err);
    }
  };

  // Load initial backend data on mount
  useEffect(() => {
    fetchSavedAnalyses();
    fetchArrematacoes();
  }, []);

  // -------------------------------------------------------------
  // CALENDAR & SAVED AUCTIONS (GARIMPAR) STATE
  // -------------------------------------------------------------
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // 0-indexed: 4 is May
  const [selectedDay, setSelectedDay] = useState<number | null>(22);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  };

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const startDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  const savedAuctions = useMemo(() => {
    return auctions.filter(a => a.saved === true);
  }, [auctions]);

  const auctionsByDay = useMemo(() => {
    const map: Record<number, AuctionProperty[]> = {};
    auctions.forEach(auc => {
      if (!auc.auctionDate) return;
      if (!auc.saved && auc.status !== 'Arrematado') return;
      const [year, month, day] = auc.auctionDate.split('-').map(Number);
      if (year === currentYear && (month - 1) === currentMonth) {
        if (!map[day]) map[day] = [];
        map[day].push(auc);
      }
    });
    return map;
  }, [auctions, currentYear, currentMonth]);

  // Total Portfolio Metrics
  const portfolioSummary = useMemo(() => {
    let totalInvested = 0;
    let totalNetProfitRealized = 0;
    let soldCount = 0;
    let activeCount = 0;

    arrematacoes.forEach(a => {
      totalInvested += (a.totalInvested || 0);
      if (a.status === 'Vendido' && a.netProfitReal !== undefined) {
        totalNetProfitRealized += a.netProfitReal;
        soldCount++;
      } else {
        activeCount++;
      }
    });

    const averageRoi = totalInvested > 0 ? ((totalNetProfitRealized / totalInvested) * 100).toFixed(1) : '0.0';

    return { totalInvested, totalNetProfitRealized, averageRoi, soldCount, activeCount };
  }, [arrematacoes]);

  // Sorted analyses list
  const sortedAnalysesList = useMemo(() => {
    return [...savedAnalyses].sort((a, b) => {
      if (analysisSortBy === 'roi') {
        const roiA = Math.max(a.roiQuickSale || 0, a.roiStreetAverage || 0, a.roiNeighborhood || 0);
        const roiB = Math.max(b.roiQuickSale || 0, b.roiStreetAverage || 0, b.roiNeighborhood || 0);
        return roiB - roiA;
      }
      if (analysisSortBy === 'profit') {
        const profA = Math.max(a.profitQuickSale || 0, a.profitStreetAverage || 0);
        const profB = Math.max(b.profitQuickSale || 0, b.profitStreetAverage || 0);
        return profB - profA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [savedAnalyses, analysisSortBy]);

  return (
    <div className="space-y-8 pb-12">
      
      {/* ========================================================================= */}
      {/* 1. SEÇÃO PRINCIPAL (TOPO): MINHAS ANÁLISES SALVAS (CALCULADORA & ITBI)     */}
      {/* ========================================================================= */}
      <div data-tour="profile-analyses" className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
        
        {/* Header with Sorting Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Minhas Análises de Mercado Salvas
                </h2>
                <span className="bg-amber-500/20 text-amber-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {savedAnalyses.length} {savedAnalyses.length === 1 ? 'análise' : 'análises'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparativo de precificação real (ITBI), 4 faixas de ROI, simulações de Flip e Locação para consulta rápida.
              </p>
            </div>
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-[10px] text-slate-400 uppercase font-bold pl-2">Ordenar por:</span>
            <button
              onClick={() => setAnalysisSortBy('roi')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                analysisSortBy === 'roi' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Maior ROI %
            </button>
            <button
              onClick={() => setAnalysisSortBy('profit')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                analysisSortBy === 'profit' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Maior Lucro R$
            </button>
            <button
              onClick={() => setAnalysisSortBy('date')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                analysisSortBy === 'date' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Recentes
            </button>
          </div>
        </div>

        {/* Saved Analyses Content Grid: 7 cols cards list (Left) + 5 cols Mini Resumo do Laudo (Right) */}
        {savedAnalyses.length === 0 ? (
          <div className="py-14 text-center text-slate-400 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 space-y-3">
            <Bookmark className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <h3 className="font-bold text-slate-200 text-sm">Nenhuma análise salva ainda</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Ao simular qualquer imóvel na <strong>"Calculadora de Valor Real"</strong>, clique no botão <strong>"💾 Salvar Análise no Perfil"</strong> para indexar os 4 ROIs e laudos aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: LIST OF SAVED ANALYSES (7 Cols) */}
            <div className="lg:col-span-7 space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
              {sortedAnalysesList.map((item) => {
                const isSelected = selectedAnalysis?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAnalysis(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3 ${
                      isSelected 
                        ? 'bg-slate-800/90 border-amber-500/70 shadow-lg ring-1 ring-amber-500/50' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Card Header: Address & Acquisition Tag */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                            {item.propertyType} • {item.sizeSqm}m²
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {item.acquisitionMode === 'caixa' ? 'Venda Direta Caixa' : 'Leilão Judicial'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{item.street}{item.streetNumber ? `, ${item.streetNumber}` : ''} - {item.neighborhood}, {item.city}/{item.state}</span>
                        </h3>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteAnalysis(item.id, e)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Excluir análise"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cost & Bid Snapshot */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-bold">Lance Arremate</span>
                        <strong className="text-white font-bold">{formatBRL(item.arrematePrice)}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-bold">Custo Total Entrada</span>
                        <strong className="text-amber-300 font-bold">{formatBRL(item.totalAcquisitionCost)}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-bold">Custo / m² Efetivo</span>
                        <strong className="text-slate-300 font-bold">R$ {item.effectiveSqmCost?.toLocaleString('pt-BR') || Math.round(item.totalAcquisitionCost / item.sizeSqm)}/m²</strong>
                      </div>
                    </div>

                    {/* 4 ROIs & VALUES COMPARATIVE MATRIX (Requested by user) */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[9.5px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
                        4 Faixas de Mercado & ROIs Projetados:
                      </span>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
                        {/* Tier 1: Conservador / Venda Rápida */}
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80 text-center">
                          <span className="text-[8px] text-slate-400 uppercase block font-bold">1. Venda Rápida</span>
                          <strong className="text-white text-[11px] block">{formatBRL(item.valueQuickSale)}</strong>
                          <span className="text-[10px] font-black text-emerald-400 block mt-0.5">+{item.roiQuickSale}% ROI</span>
                        </div>

                        {/* Tier 2: Média Mesma Rua / Prédio */}
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80 text-center">
                          <span className="text-[8px] text-slate-400 uppercase block font-bold">2. Mesma Rua</span>
                          <strong className="text-white text-[11px] block">{formatBRL(item.valueStreetAverage)}</strong>
                          <span className="text-[10px] font-black text-emerald-400 block mt-0.5">+{item.roiStreetAverage}% ROI</span>
                        </div>

                        {/* Tier 3: Média Saneada Bairro */}
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80 text-center">
                          <span className="text-[8px] text-slate-400 uppercase block font-bold">3. Média Bairro</span>
                          <strong className="text-white text-[11px] block">{formatBRL(item.valueNeighborhood)}</strong>
                          <span className="text-[10px] font-black text-emerald-400 block mt-0.5">+{item.roiNeighborhood}% ROI</span>
                        </div>

                        {/* Tier 4: Portais Teto */}
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80 text-center">
                          <span className="text-[8px] text-slate-400 uppercase block font-bold">4. Portais Teto</span>
                          <strong className="text-white text-[11px] block">{formatBRL(item.valuePortalsAsking)}</strong>
                          <span className="text-[10px] font-black text-emerald-400 block mt-0.5">+{item.roiPortalsAsking}% ROI</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Summary Badges */}
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center space-x-2">
                        <span className="text-emerald-400 font-bold">Flip 6m: +{item.flipNetRoi6m}% ROI</span>
                        <span>•</span>
                        <span className="text-indigo-400 font-bold">Locação: {item.netRentalYieldAnnual?.toFixed(1)}% a.a.</span>
                      </div>
                      <span className="text-slate-500">Salvo em: {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* RIGHT: INTERACTIVE MINI RESUMO DO LAUDO (5 Cols - Sticky) */}
            <div className="lg:col-span-5 sticky top-6">
              {selectedAnalysis ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4 text-slate-100">
                  
                  {/* Header of Mini Report */}
                  <div className="pb-3 border-b border-slate-800 flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                        Mini Resumo do Laudo Técnico
                      </span>
                      <h3 className="text-sm font-black text-white uppercase mt-0.5">
                        {selectedAnalysis.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {selectedAnalysis.street} • {selectedAnalysis.sizeSqm} m² • {selectedAnalysis.city}/{selectedAnalysis.state}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (selectedAnalysis.reportData) {
                          setActiveReportData(selectedAnalysis.reportData);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
                      title="Abrir Laudo PTAM completo para download em PDF ou impressão"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Laudo PDF</span>
                    </button>
                  </div>

                  {/* 1. Composição Resumida de Custos de Entrada */}
                  <div className="space-y-1.5">
                    <span className="text-[9.5px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
                      1. Investimento & Custos de Entrada:
                    </span>
                    <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Lance de Compra:</span>
                        <strong className="text-white">{formatBRL(selectedAnalysis.arrematePrice)}</strong>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">ITBI + Cartório (6%):</span>
                        <span className="text-slate-300">{formatBRL(Math.round(selectedAnalysis.arrematePrice * 0.06))}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Leiloeiro ({selectedAnalysis.acquisitionMode === 'leilao' ? '5%' : 'Isento'}):</span>
                        <span className="text-slate-300">{formatBRL(selectedAnalysis.acquisitionMode === 'leilao' ? Math.round(selectedAnalysis.arrematePrice * 0.05) : 0)}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-slate-800 font-black">
                        <span className="text-amber-400">CUSTO TOTAL ENTRADA:</span>
                        <span className="text-amber-400">{formatBRL(selectedAnalysis.totalAcquisitionCost)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Matriz de Saída & Lucro Líquido */}
                  <div className="space-y-1.5">
                    <span className="text-[9.5px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
                      2. Matriz Comparativa de Saída:
                    </span>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <span className="text-white font-bold block text-xs">🚀 Venda Rápida (Conservador)</span>
                          <span className="text-[10px] text-slate-400">Saída: {formatBRL(selectedAnalysis.valueQuickSale)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-black block text-xs">+{selectedAnalysis.roiQuickSale}% ROI</span>
                          <span className="text-[10px] text-slate-300">Lucro: +{formatBRL(selectedAnalysis.profitQuickSale)}</span>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <span className="text-white font-bold block text-xs">🏛️ Média da Mesma Rua (ITBI)</span>
                          <span className="text-[10px] text-slate-400">Saída: {formatBRL(selectedAnalysis.valueStreetAverage)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-black block text-xs">+{selectedAnalysis.roiStreetAverage}% ROI</span>
                          <span className="text-[10px] text-slate-300">Lucro: +{formatBRL(selectedAnalysis.profitStreetAverage)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Flip vs Locação */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-[8.5px] text-slate-400 uppercase font-bold block">Flip Líquido 6m</span>
                      <strong className="text-emerald-400 font-black text-xs block mt-0.5">+{selectedAnalysis.flipNetRoi6m}% ROI</strong>
                      <span className="text-[9.5px] text-slate-300 block mt-0.5">+{formatBRL(selectedAnalysis.flipNetProfit6m)}</span>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-[8.5px] text-slate-400 uppercase font-bold block">Locação Líquida</span>
                      <strong className="text-indigo-400 font-black text-xs block mt-0.5">{selectedAnalysis.netRentalYieldAnnual?.toFixed(1)}% a.a.</strong>
                      <span className="text-[9.5px] text-slate-300 block mt-0.5">{formatBRL(selectedAnalysis.netRentMonthly)}/mês pós-IR</span>
                    </div>
                  </div>

                  {/* Due Diligence Matrícula Snapshot */}
                  {selectedAnalysis.reportData?.matriculaReport && (
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Due Diligence Matrícula</span>
                        <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-bold ${
                          selectedAnalysis.reportData.matriculaReport.overallStatus === 'REGULAR'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {selectedAnalysis.reportData.matriculaReport.overallStatus === 'REGULAR' ? '✓ Regularizada' : '⚠ Gravames Identificados'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 truncate">
                        {selectedAnalysis.reportData.matriculaReport.matriculaNumber}
                      </div>
                    </div>
                  )}

                  {/* Open Full PDF Report Button */}
                  <button
                    onClick={() => {
                      if (selectedAnalysis.reportData) {
                        setActiveReportData(selectedAnalysis.reportData);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer border border-indigo-400/30"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Visualizar / Baixar Laudo PTAM Completo (PDF)</span>
                  </button>

                </div>
              ) : (
                <div className="p-8 bg-slate-950 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                  Selecione uma análise ao lado para ver o mini resumo detalhado do laudo.
                </div>
              )}
            </div>

          </div>
        )}

      </div>


      {/* ========================================================================= */}
      {/* 2. SEÇÃO INTERMEDIÁRIA: ARREMATAÇÕES & GESTÃO PÓS-VENDA                    */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Arrematações & Gestão de Imóveis (Pós-Venda)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Alimente seus lotes arrematados, controle custos de obras/cartório e apure o lucro líquido real obtido na revenda.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingArremate(null);
              setArremateForm({
                title: '',
                address: '',
                neighborhood: '',
                city: 'São Paulo',
                state: 'SP',
                sizeSqm: 70,
                propertyType: 'Apartamento',
                arrematePrice: 200000,
                auctioneerFee: 10000,
                itbiFee: 6000,
                registryFee: 6000,
                reformCost: 15000,
                legalCost: 5000,
                iptuAndCondoDebts: 0,
                otherExpenses: 0,
                status: 'Reforma/Desocupação',
                holdingMonths: 6,
                monthlyHoldingCost: 800,
                salePrice: 0,
                brokerFeePaid: 0,
                capitalGainsTaxPaid: 0,
                rentMonthly: 0
              });
              setIsAddArremateModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-md cursor-pointer border border-emerald-400/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Alimentar Novo Imóvel Arrematado</span>
          </button>
        </div>

        {/* Portfolio KPI Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Total Investido Alocado</span>
            <h3 className="text-2xl font-black font-mono text-white">{formatBRL(portfolioSummary.totalInvested)}</h3>
            <span className="text-[10px] text-slate-500 font-mono">{arrematacoes.length} imóveis no portfólio</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block">Lucro Realizado no Bolso</span>
            <h3 className="text-2xl font-black font-mono text-emerald-400">+{formatBRL(portfolioSummary.totalNetProfitRealized)}</h3>
            <span className="text-[10px] text-slate-500 font-mono">{portfolioSummary.soldCount} vendas concluídas</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-indigo-400 uppercase font-mono font-bold block">ROI Médio da Carteira</span>
            <h3 className="text-2xl font-black font-mono text-indigo-400">+{portfolioSummary.averageRoi}%</h3>
            <span className="text-[10px] text-slate-500 font-mono">Retorno sobre capital</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-amber-400 uppercase font-mono font-bold block">Em Carteira Ativa</span>
            <h3 className="text-2xl font-black font-mono text-amber-400">{portfolioSummary.activeCount} Imóveis</h3>
            <span className="text-[10px] text-slate-500 font-mono">Em obras / venda / locação</span>
          </div>
        </div>

        {/* List of Arrematações */}
        {arrematacoes.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 space-y-3">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <h3 className="font-bold text-slate-200 text-sm">Nenhum lote arrematado cadastrado</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Clique no botão <strong>"+ Alimentar Novo Imóvel Arrematado"</strong> acima para registrar seus lotes comprados em leilão ou venda direta.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {arrematacoes.map((item) => {
              const isSold = item.status === 'Vendido';
              return (
                <div 
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {item.propertyType} • {item.sizeSqm}m²
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        item.status === 'Vendido' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                        item.status === 'À Venda' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                        item.status === 'Locado' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                        'bg-amber-950 text-amber-300 border-amber-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{item.address || item.neighborhood} - {item.city}/{item.state}</span>
                    </p>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lance de Compra:</span>
                      <strong className="text-white">{formatBRL(item.arrematePrice)}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Custos (Obras/Cart/Taxas):</span>
                      <span className="text-slate-300">{formatBRL(item.totalInvested - item.arrematePrice)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                      <span className="text-slate-300">TOTAL INVESTIDO:</span>
                      <strong className="text-white">{formatBRL(item.totalInvested)}</strong>
                    </div>

                    {isSold ? (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Preço Venda Real:</span>
                          <span>{formatBRL(item.salePrice || 0)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-black bg-emerald-950/60 p-1.5 rounded border border-emerald-800/50">
                          <span className="text-emerald-300">LUCRO NO BOLSO:</span>
                          <span className="text-emerald-300">+{formatBRL(item.netProfitReal || 0)}</span>
                        </div>
                        <div className="flex justify-between text-[10.5px] font-bold">
                          <span className="text-slate-400">ROI Efetivo:</span>
                          <span className="text-emerald-400 font-mono">+{item.netRoiReal}% ROI ({item.monthlyYieldReal}% a.m.)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1.5 text-[10px] text-amber-400 font-mono">
                        ⏳ Imóvel em carregamento ({item.holdingMonths} meses previstos)
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                    <button
                      onClick={() => {
                        setEditingArremate(item);
                        setArremateForm(item);
                        setIsAddArremateModalOpen(true);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                    >
                      Editar / Atualizar Venda ✍️
                    </button>
                    <button
                      onClick={(e) => handleDeleteArrematacao(item.id, e)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="Excluir arrematação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>


      {/* ========================================================================= */}
      {/* 3. SEÇÃO INFERIOR: IMÓVEIS SELECIONADOS & CALENDÁRIO DE LEILÕES (BAIXO)   */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
        
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Calendário de Leilões Salvos & Garimpo
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhe as datas de praça e leilões agendados dos imóveis marcados na plataforma.
            </p>
          </div>
        </div>

        {/* Calendar Grid & Selected Day Auctions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Calendar Card (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider">
                  Agenda Mensal de Praças
                </h3>
                
                <div className="flex items-center space-x-1 border border-slate-800 rounded-lg p-0.5 bg-slate-900">
                  <button 
                    onClick={() => {
                      if (currentMonth === 0) {
                        setCurrentMonth(11);
                        setCurrentYear(prev => prev - 1);
                      } else {
                        setCurrentMonth(prev => prev - 1);
                      }
                      setSelectedDay(null);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-200 px-2 font-mono min-w-[90px] text-center">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <button 
                    onClick={() => {
                      if (currentMonth === 11) {
                        setCurrentMonth(0);
                        setCurrentYear(prev => prev + 1);
                      } else {
                        setCurrentMonth(prev => prev + 1);
                      }
                      setSelectedDay(null);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Days Header */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 py-1 uppercase tracking-wider font-mono">
                {daysOfWeek.map(d => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              {/* Calendar Grid Days */}
              <div className="grid grid-cols-7 gap-1.5 mt-2">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square bg-slate-900/30 rounded-xl border border-dashed border-slate-850"></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayAuctions = auctionsByDay[day] || [];
                  const hasAuctions = dayAuctions.length > 0;
                  const hasSavedAuctions = dayAuctions.some(a => a.saved === true);
                  const isSelected = selectedDay === day;

                  let dayBg = 'bg-slate-900/50 border-slate-800/80 hover:border-slate-600 text-slate-300';
                  if (hasAuctions) {
                    if (hasSavedAuctions) {
                      dayBg = 'bg-rose-950/60 border-rose-800 text-rose-300 hover:bg-rose-900/80 font-bold';
                    } else {
                      dayBg = 'bg-blue-950/60 border-blue-800 text-blue-300 hover:bg-blue-900/80 font-bold';
                    }
                  }

                  if (isSelected) {
                    dayBg = 'bg-indigo-600 border-indigo-400 text-white font-black scale-[1.03] shadow-md';
                  }

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => setSelectedDay(day)}
                      className={`aspect-square border rounded-xl flex flex-col justify-between p-1.5 transition-all cursor-pointer relative font-mono text-xs ${dayBg}`}
                    >
                      <span className="font-bold">{day}</span>
                      {hasAuctions && (
                        <div className="flex space-x-0.5 justify-end w-full">
                          {dayAuctions.map((auc, aIdx) => (
                            <span 
                              key={auc.id || aIdx} 
                              className={`w-1.5 h-1.5 rounded-full ${auc.saved ? 'bg-rose-400 animate-pulse' : 'bg-blue-400'}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full inline-block" />
                  <span>Leilão Programado</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-rose-400 rounded-full inline-block" />
                  <span>Imóvel Salvo</span>
                </span>
              </div>
              <span>Horário Oficial de Brasília</span>
            </div>
          </div>

          {/* Selected Day Auctions List (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h3 className="font-bold text-white text-sm font-mono flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Leilões em {selectedDay ? `${selectedDay} de ${monthNames[currentMonth]}` : '---'}</span>
                </h3>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
                {(selectedDay ? (auctionsByDay[selectedDay] || []) : []).length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <CalendarIcon className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs">Nenhum leilão marcado para esta data.</p>
                  </div>
                ) : (
                  (auctionsByDay[selectedDay!] || []).map(auc => (
                    <div 
                      key={auc.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-900 space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {auc.propertyType} • {auc.sizeSqm}m²
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">+{auc.calculatedRoi}% ROI</span>
                      </div>
                      <h4 className="font-bold text-xs text-white line-clamp-1">{auc.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{auc.address}</p>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs font-mono">
                        <span className="text-slate-300 font-bold">Lance: {formatBRL(auc.auctionPrice)}</span>
                        <button
                          onClick={() => onSelectAuction(auc.id)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                        >
                          Simular →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center space-x-2 font-mono">
              <span className="font-bold text-white">May 2026</span>
              <span>• Calendário sincronizado com o edital oficial</span>
            </div>
          </div>

        </div>

      </div>


      {/* ========================================================================= */}
      {/* MODAL: ALIMENTAR / EDITAR IMÓVEL ARREMATADO                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddArremateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl text-slate-100 p-6 space-y-5 shadow-2xl my-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">
                      {editingArremate ? 'Editar Imóvel Arrematado & Resultado' : 'Alimentar Novo Imóvel Arrematado'}
                    </h3>
                    <p className="text-xs text-slate-400">Registre os custos reais e a performance financeira pós-venda.</p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsAddArremateModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveArrematacao} className="space-y-4 text-xs font-mono">
                
                {/* Identification */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1 font-bold">Título / Identificação do Lote:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Apto 302 Copacabana Edifício Mar"
                      value={arremateForm.title || ''}
                      onChange={e => setArremateForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans text-xs focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Tipologia:</label>
                    <select
                      value={arremateForm.propertyType || 'Apartamento'}
                      onChange={e => setArremateForm(prev => ({ ...prev, propertyType: e.target.value as PropertyType }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-emerald-500 outline-none"
                    >
                      <option value="Apartamento">Apartamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Terreno">Terreno</option>
                    </select>
                  </div>
                </div>

                {/* Location & Size */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Bairro:</label>
                    <input 
                      type="text"
                      placeholder="Bairro"
                      value={arremateForm.neighborhood || ''}
                      onChange={e => setArremateForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Cidade / UF:</label>
                    <input 
                      type="text"
                      placeholder="Cidade"
                      value={arremateForm.city || ''}
                      onChange={e => setArremateForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Metragem (m²):</label>
                    <input 
                      type="number"
                      value={arremateForm.sizeSqm || ''}
                      onChange={e => setArremateForm(prev => ({ ...prev, sizeSqm: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Status Atual:</label>
                    <select
                      value={arremateForm.status || 'Reforma/Desocupação'}
                      onChange={e => setArremateForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs outline-none"
                    >
                      <option value="Reforma/Desocupação">Reforma/Desocupação</option>
                      <option value="À Venda">À Venda</option>
                      <option value="Locado">Locado</option>
                      <option value="Vendido">Vendido / Concluído</option>
                    </select>
                  </div>
                </div>

                {/* Acquisition Costs */}
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                  <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
                    💰 Custos de Aquisição & Obras Realizados:
                  </span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-slate-400 text-[10px] font-bold">Lance de Compra (R$):</label>
                        <span className="text-[8px] text-amber-400 font-mono">Calcula taxas auto</span>
                      </div>
                      <input 
                        type="number"
                        placeholder="Ex: 250000"
                        value={arremateForm.arrematePrice || ''}
                        onChange={e => {
                          const price = Number(e.target.value) || 0;
                          const isCaixa = (arremateForm.title || '').toLowerCase().includes('caixa') || (arremateForm.notes || '').toLowerCase().includes('caixa');
                          setArremateForm(prev => ({
                            ...prev,
                            arrematePrice: price,
                            itbiFee: Math.round(price * 0.03),
                            registryFee: Math.round(price * 0.03),
                            auctioneerFee: isCaixa ? 0 : Math.round(price * 0.05)
                          }));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-slate-400 text-[10px]">Leiloeiro (5%):</label>
                        <button
                          type="button"
                          onClick={() => setArremateForm(prev => ({ ...prev, auctioneerFee: 0 }))}
                          className="text-[8px] text-emerald-400 hover:underline"
                        >
                          Isentar (Caixa)
                        </button>
                      </div>
                      <input 
                        type="number"
                        placeholder="0"
                        value={arremateForm.auctioneerFee !== undefined && arremateForm.auctioneerFee !== null ? arremateForm.auctioneerFee : ''}
                        onChange={e => setArremateForm(prev => ({ ...prev, auctioneerFee: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px]">ITBI Pago (3%):</label>
                      <input 
                        type="number"
                        placeholder="0"
                        value={arremateForm.itbiFee !== undefined && arremateForm.itbiFee !== null ? arremateForm.itbiFee : ''}
                        onChange={e => setArremateForm(prev => ({ ...prev, itbiFee: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px]">Cartório/Registro (3%):</label>
                      <input 
                        type="number"
                        placeholder="0"
                        value={arremateForm.registryFee !== undefined && arremateForm.registryFee !== null ? arremateForm.registryFee : ''}
                        onChange={e => setArremateForm(prev => ({ ...prev, registryFee: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px]">Reforma/Pintura (R$):</label>
                      <input 
                        type="number"
                        placeholder="0"
                        value={arremateForm.reformCost !== undefined && arremateForm.reformCost !== null ? arremateForm.reformCost : ''}
                        onChange={e => setArremateForm(prev => ({ ...prev, reformCost: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px]">Advogado/Desocupação (R$):</label>
                      <input 
                        type="number"
                        placeholder="0"
                        value={arremateForm.legalCost !== undefined && arremateForm.legalCost !== null ? arremateForm.legalCost : ''}
                        onChange={e => setArremateForm(prev => ({ ...prev, legalCost: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px]">Dívidas Pagas (R$):</label>
                      <input 
                        type="number"
                        placeholder="0"
                        value={arremateForm.iptuAndCondoDebts !== undefined && arremateForm.iptuAndCondoDebts !== null ? arremateForm.iptuAndCondoDebts : ''}
                        onChange={e => setArremateForm(prev => ({ ...prev, iptuAndCondoDebts: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px]">Outros Gastos (R$):</label>
                      <input 
                        type="number"
                        placeholder="0"
                        value={arremateForm.otherExpenses !== undefined && arremateForm.otherExpenses !== null ? arremateForm.otherExpenses : ''}
                        onChange={e => setArremateForm(prev => ({ ...prev, otherExpenses: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* If Sold (Resultado Pós-Venda) */}
                {arremateForm.status === 'Vendido' && (
                  <div className="p-3.5 bg-emerald-950/40 rounded-2xl border border-emerald-800/60 space-y-2.5">
                    <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider block">
                      🏆 Resultado Financeiro Pós-Venda (Lucro Real):
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="block text-emerald-200 text-[10px]">Preço de Venda Real (R$):</label>
                          <span className="text-[8px] text-emerald-300 font-mono">Calcula corretor & IR auto</span>
                        </div>
                        <input 
                          type="number"
                          required
                          placeholder="Ex: 380000"
                          value={arremateForm.salePrice || ''}
                          onChange={e => {
                            const sPrice = Number(e.target.value) || 0;
                            const bid = Number(arremateForm.arrematePrice) || 0;
                            const leil = Number(arremateForm.auctioneerFee) || 0;
                            const itbi = Number(arremateForm.itbiFee) || 0;
                            const reg = Number(arremateForm.registryFee) || 0;
                            const ref = Number(arremateForm.reformCost) || 0;
                            const leg = Number(arremateForm.legalCost) || 0;
                            const deb = Number(arremateForm.iptuAndCondoDebts) || 0;
                            const oth = Number(arremateForm.otherExpenses) || 0;
                            const totalInv = bid + leil + itbi + reg + ref + leg + deb + oth;
                            const broker = Math.round(sPrice * 0.04);
                            const baseGain = sPrice - broker - totalInv;
                            const tax = baseGain > 0 ? Math.round(baseGain * 0.15) : 0;
                            setArremateForm(prev => ({
                              ...prev,
                              salePrice: sPrice,
                              brokerFeePaid: broker,
                              capitalGainsTaxPaid: tax
                            }));
                          }}
                          className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg p-2 text-white font-bold"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="block text-emerald-200 text-[10px]">Comissão Corretor:</label>
                          <button
                            type="button"
                            onClick={() => setArremateForm(prev => ({ ...prev, brokerFeePaid: 0 }))}
                            className="text-[8px] text-amber-300 hover:underline"
                          >
                            Zerar (0%)
                          </button>
                        </div>
                        <input 
                          type="number"
                          placeholder="0"
                          value={arremateForm.brokerFeePaid !== undefined && arremateForm.brokerFeePaid !== null ? arremateForm.brokerFeePaid : ''}
                          onChange={e => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            setArremateForm(prev => ({ ...prev, brokerFeePaid: val }));
                          }}
                          className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="block text-emerald-200 text-[10px]">IR Ganho de Capital:</label>
                          <button
                            type="button"
                            onClick={() => setArremateForm(prev => ({ ...prev, capitalGainsTaxPaid: 0 }))}
                            className="text-[8px] text-amber-300 hover:underline"
                          >
                            Isentar (R$ 0)
                          </button>
                        </div>
                        <input 
                          type="number"
                          placeholder="0"
                          value={arremateForm.capitalGainsTaxPaid !== undefined && arremateForm.capitalGainsTaxPaid !== null ? arremateForm.capitalGainsTaxPaid : ''}
                          onChange={e => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            setArremateForm(prev => ({ ...prev, capitalGainsTaxPaid: val }));
                          }}
                          className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddArremateModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black transition-all shadow-md cursor-pointer"
                  >
                    {editingArremate ? 'Atualizar Dados' : 'Salvar Arrematação'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: LAUDO TÉCNICO PTAM COMPLETO (PDF) DE ANÁLISE SALVA                 */}
      {/* ========================================================================= */}
      {activeReportData && (
        <ExecutiveReportModal
          isOpen={!!activeReportData}
          onClose={() => setActiveReportData(null)}
          data={activeReportData}
        />
      )}

    </div>
  );
}
