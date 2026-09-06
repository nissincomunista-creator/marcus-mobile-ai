import React, { useState, useEffect } from 'react';
import { AuctionProperty } from '../types.ts';
import { 
  Briefcase, 
  Trash2, 
  Sparkles, 
  Edit3, 
  HelpCircle, 
  ArrowRight, 
  ExternalLink,
  ChevronLeft,
  DollarSign,
  TrendingUp,
  Percent,
  Check,
  Calculator,
  BookOpen,
  Scale,
  FileText,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
  Building,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function estimateNotaryFees(price: number, origin: string, state = 'SP'): { notary: number; registration: number } {
  const st = (state || 'SP').toUpperCase();
  const orig = origin || 'judicial';

  let reg = 0;
  if (price <= 50000) reg = 600;
  else if (price <= 100000) reg = 1100;
  else if (price <= 150000) reg = 1500;
  else if (price <= 200000) reg = 1900;
  else if (price <= 350000) reg = 2600;
  else if (price <= 500000) reg = 3000;
  else if (price <= 800000) reg = 3400;
  else if (price <= 1200000) reg = 4200;
  else if (price <= 2000000) reg = 5500;
  else if (price <= 5000000) reg = 7500;
  else reg = 9500;

  if (st === 'RJ') {
    reg = Math.round(reg * 1.25);
  }

  let esc = 0;
  if (price <= 50000) esc = 700;
  else if (price <= 100000) esc = 1200;
  else if (price <= 150000) esc = 1700;
  else if (price <= 200000) esc = 2100;
  else if (price <= 350000) esc = 2900;
  else if (price <= 500000) esc = 3500;
  else if (price <= 800000) esc = 4100;
  else if (price <= 1200000) esc = 5000;
  else if (price <= 2000000) esc = 6800;
  else if (price <= 5000000) esc = 9200;
  else esc = 11500;

  if (st === 'RJ') {
    esc = Math.round(esc * 1.2);
  }

  let notaryCost = 0;
  if (orig === 'judicial' || orig === 'caixa') {
    notaryCost = reg;
  } else {
    notaryCost = esc + reg;
  }

  return {
    notary: notaryCost,
    registration: reg
  };
}

interface SimulatorProps {
  property: AuctionProperty;
  onUpdateProperty: (updates: Partial<AuctionProperty>) => Promise<void>;
  onBack: () => void;
  onTriggerAi: (id: string) => Promise<void>;
  isAiAnalyzing: boolean;
}

export default function Simulator({
  property,
  onUpdateProperty,
  onBack,
  onTriggerAi,
  isAiAnalyzing
}: SimulatorProps) {
  // Local editable form states (Basic inputs)
  const [bidPrice, setBidPrice] = useState(property.auctionPrice);
  const [repairs, setRepairs] = useState(property.estimatedRepair);
  const [debts, setDebts] = useState(property.pendingDebts);
  const [otherLegal, setOtherLegal] = useState(property.otherCosts);
  const [resaleVal, setResaleVal] = useState(property.estimatedValue);
  const [status, setStatus] = useState(property.status);
  const [isSaved, setIsSaved] = useState(false);

  // Subtabs state matching user request: "faça uma aba, dentro do propria guia do imovel"
  const [activeSubTab, setActiveSubTab] = useState<'basico' | 'planilha' | 'comparador'>('planilha');

  // Spreadsheet-specific state parameters (pre-filled with property custom fields or smart defaults)
  const getInitialDownpayment = (p: AuctionProperty) => {
    if (p.downpaymentPercent !== undefined) return p.downpaymentPercent;
    if (p.minDownpaymentPercent !== undefined) return p.minDownpaymentPercent;
    return p.origin === 'caixa' ? 5 : 25;
  };

  const getInitialNotaryCost = (p: AuctionProperty) => {
    if (p.notaryCost !== undefined) return p.notaryCost;
    return estimateNotaryFees(p.auctionPrice, p.origin || 'judicial', p.state || 'SP').notary;
  };

  const getInitialCaixaCost = (p: AuctionProperty) => {
    if (p.origin !== 'caixa') return 0;
    return p.caixaContractCost !== undefined ? p.caixaContractCost : 1000;
  };

  const getInitialInstallment = (p: AuctionProperty) => {
    if (p.monthlyFinancingInstallment !== undefined) return p.monthlyFinancingInstallment;
    if (p.maxInstallments && p.maxInstallments > 0) {
      const downPercent = getInitialDownpayment(p);
      const entrada = Math.round(p.auctionPrice * (downPercent / 100));
      return Math.round((p.auctionPrice - entrada) / p.maxInstallments);
    }
    return 2560;
  };

  const [pnyPct, setPnyPct] = useState(getInitialDownpayment(property));
  const [itbiRate, setItbiRate] = useState(property.itbiPercent !== undefined ? property.itbiPercent : 3);
  const [cartCd, setCartCd] = useState(getInitialNotaryCost(property));
  const [caixCd, setCaixCd] = useState(getInitialCaixaCost(property));
  const [certCd, setCertCd] = useState(property.certificatesCost !== undefined ? property.certificatesCost : 650);
  const [iptuAt, setIptuAt] = useState(property.pendingIptuCost !== undefined ? property.pendingIptuCost : 0);
  const [condoAt, setCondoAt] = useState(property.pendingCondoCost !== undefined ? property.pendingCondoCost : 0);
  const [leilPct, setLeilPct] = useState(property.auctioneerFeePercent != null ? property.auctioneerFeePercent : 5);
  const [advPct, setAdvPct] = useState(property.lawyerFeePercent != null ? property.lawyerFeePercent : 5);
  const [leilCd, setLeilCd] = useState(property.auctioneerFee != null ? property.auctioneerFee : Math.round(property.auctionPrice * 0.05));
  const [advCd, setAdvCd] = useState(property.lawyerFee != null ? property.lawyerFee : Math.round(property.auctionPrice * 0.05));
  
  const [vMediaPrice, setVMediaPrice] = useState(property.vendaMediaPrice || Math.round(property.auctionPrice * 2.18));
  const [vBaixaPrice, setVBaixaPrice] = useState(property.vendaBaixaPrice || Math.round(property.auctionPrice * 2.04));
  const [brokerCommissionPct, setBrokerCommissionPct] = useState(property.brokerCommissionPercent !== undefined ? property.brokerCommissionPercent : 6);
  const [monthlyFinancingInstall, setMonthlyFinancingInstall] = useState(getInitialInstallment(property));

  // Sync state if property changes
  useEffect(() => {
    setBidPrice(property.auctionPrice);
    setRepairs(property.estimatedRepair);
    setDebts(property.pendingDebts);
    setOtherLegal(property.otherCosts);
    setResaleVal(property.estimatedValue);
    setStatus(property.status);

    const downPct = getInitialDownpayment(property);
    setPnyPct(downPct);
    setItbiRate(property.itbiPercent !== undefined ? property.itbiPercent : 3);
    setCartCd(getInitialNotaryCost(property));
    setCaixCd(getInitialCaixaCost(property));
    setCertCd(property.certificatesCost !== undefined ? property.certificatesCost : 650);
    setIptuAt(property.pendingIptuCost !== undefined ? property.pendingIptuCost : 0);
    setCondoAt(property.pendingCondoCost !== undefined ? property.pendingCondoCost : 0);
    
    const initialLeilPct = property.auctioneerFeePercent != null ? property.auctioneerFeePercent : 5;
    const initialAdvPct = property.lawyerFeePercent != null ? property.lawyerFeePercent : 5;
    setLeilPct(initialLeilPct);
    setAdvPct(initialAdvPct);
    setLeilCd(property.auctioneerFee != null ? property.auctioneerFee : Math.round(property.auctionPrice * (initialLeilPct / 100)));
    setAdvCd(property.lawyerFee != null ? property.lawyerFee : Math.round(property.auctionPrice * (initialAdvPct / 100)));
    
    setVMediaPrice(property.vendaMediaPrice || Math.round(property.auctionPrice * 2.18));
    setVBaixaPrice(property.vendaBaixaPrice || Math.round(property.auctionPrice * 2.04));
    setBrokerCommissionPct(property.brokerCommissionPercent !== undefined ? property.brokerCommissionPercent : 6);
    setMonthlyFinancingInstall(getInitialInstallment(property));
  }, [property]);

  // Interactive Fee Helpers
  const updateBidPriceAndRecalculateFees = (newPrice: number) => {
    setBidPrice(newPrice);
    setLeilCd(Math.round(newPrice * (leilPct / 100)));
    setAdvCd(Math.round(newPrice * (advPct / 100)));
  };

  const handleLeilPctChange = (pct: number) => {
    setLeilPct(pct);
    setLeilCd(Math.round(bidPrice * (pct / 100)));
  };

  const handleLeilCdChange = (val: number) => {
    setLeilCd(val);
    setLeilPct(bidPrice > 0 ? Number(((val / bidPrice) * 100).toFixed(2)) : 0);
  };

  const handleAdvPctChange = (pct: number) => {
    setAdvPct(pct);
    setAdvCd(Math.round(bidPrice * (pct / 100)));
  };

  const handleAdvCdChange = (val: number) => {
    setAdvCd(val);
    setAdvPct(bidPrice > 0 ? Number(((val / bidPrice) * 100).toFixed(2)) : 0);
  };

  // Real-time calculation derivations (Basic Tab)
  const totalInvested = bidPrice + repairs + debts + otherLegal;
  const netProfit = resaleVal - totalInvested;
  const roiPercent = totalInvested > 0 ? Number(((netProfit / totalInvested) * 100).toFixed(1)) : 0;
  const effectiveCostSqm = property.sizeSqm > 0 ? Math.round(totalInvested / property.sizeSqm) : 0;
  const itbiTotalVal = (property.itbiUnitValueAvg || 0) * property.sizeSqm;
  const itbiDeltaPercent = property.itbiUnitValueAvg && property.itbiUnitValueAvg > 0 
    ? Number(((1 - (effectiveCostSqm / property.itbiUnitValueAvg)) * 100).toFixed(1))
    : 0;

  // Real-time Excel Spreadsheet derivations
  const calculatedEntradaVal = Math.round(bidPrice * (pnyPct / 100));
  const calculatedFinanciamentoVal = bidPrice - calculatedEntradaVal;
  const calculatedItbiCost = Math.round(bidPrice * (itbiRate / 100));

  // Cash outlays / Expenses to buy
  const purchaseCostsTotal = calculatedItbiCost + cartCd + caixCd + certCd + iptuAt + condoAt + leilCd + advCd;
  // Total cash layout = entrada + purchase costs (just like bold column total in excel: 38.389,37)
  const totalCashAporte = calculatedEntradaVal + purchaseCostsTotal;

  // Scenario A: Venda Média (Average Resale)
  const brokerCommM = Math.round(vMediaPrice * (brokerCommissionPct / 100));
  // Tax Gain Base (Ganho de capital) matches precisely: (Sale - Commission - Price - ITBI - Cartorio - Caixa - Certidores)
  const taxGainBaseM = vMediaPrice - brokerCommM - bidPrice - calculatedItbiCost - cartCd - caixCd - certCd;
  const capitalGainTaxM = taxGainBaseM > 0 ? Math.round(taxGainBaseM * 0.15) : 0;
  // Montante = Venda - comissão - imposto
  const montanteM = vMediaPrice - brokerCommM - capitalGainTaxM;
  // Sobra = montante - financiamento
  const sobraM = montanteM - calculatedFinanciamentoVal;
  // Lucro = montante - preço - custos adicionais
  const lucroM = montanteM - bidPrice - purchaseCostsTotal;
  // ROI in %: Lucro / Aporte de Caixa Total (Entrada + Extras)
  const roiM = totalCashAporte > 0 ? Number(((lucroM / totalCashOutlayForRoi()) * 100).toFixed(1)) : 0;
  const rendaMensalM = Math.round(lucroM / 12);
  const liquidAfterTwelveMonthsM = lucroM - (12 * monthlyFinancingInstall);

  // Scenario B: Venda Baixa (Low Resale)
  const brokerCommB = Math.round(vBaixaPrice * (brokerCommissionPct / 100));
  const taxGainBaseB = vBaixaPrice - brokerCommB - bidPrice - calculatedItbiCost - cartCd - caixCd - certCd;
  const capitalGainTaxB = taxGainBaseB > 0 ? Math.round(taxGainBaseB * 0.15) : 0;
  const montanteB = vBaixaPrice - brokerCommB - capitalGainTaxB;
  const sobraB = montanteB - calculatedFinanciamentoVal;
  const lucroB = montanteB - bidPrice - purchaseCostsTotal;
  const roiB = totalCashAporte > 0 ? Number(((lucroB / totalCashOutlayForRoi()) * 100).toFixed(1)) : 0;
  const rendaMensalB = Math.round(lucroB / 12);
  const liquidAfterTwelveMonthsB = lucroB - (12 * monthlyFinancingInstall);

  // Small helper to prevent Division-by-Zero
  function totalCashOutlayForRoi() {
    return totalCashAporte > 0 ? totalCashAporte : 1;
  }

  const handleSaveSimulation = async () => {
    // If saving from Planilha tab, we backport appropriate numbers as well
    await onUpdateProperty({
      id: property.id,
      auctionPrice: bidPrice,
      estimatedRepair: repairs,
      pendingDebts: debts,
      otherCosts: otherLegal,
      estimatedValue: activeSubTab === 'planilha' ? vMediaPrice : resaleVal,
      status,

      // Save custom spreadsheet variables as well
      prefeituraValuation: property.prefeituraValuation || 0,
      downpaymentPercent: pnyPct,
      downpaymentVal: calculatedEntradaVal,
      financingVal: calculatedFinanciamentoVal,
      itbiPercent: itbiRate,
      itbiCost: calculatedItbiCost,
      notaryCost: cartCd,
      caixaContractCost: caixCd,
      certificatesCost: certCd,
      pendingIptuCost: iptuAt,
      pendingCondoCost: condoAt,
      auctioneerFee: leilCd,
      auctioneerFeePercent: leilPct,
      lawyerFee: advCd,
      lawyerFeePercent: advPct,
      vendaMediaPrice: vMediaPrice,
      vendaBaixaPrice: vBaixaPrice,
      brokerCommissionPercent: brokerCommissionPct,
      monthlyFinancingInstallment: monthlyFinancingInstall
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Local states for Portal Comparator in Simulator
  const [isSearchingPortals, setIsSearchingPortals] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [portalResults, setPortalResults] = useState<any | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(1.5);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  const handlePortalComparison = async () => {
    setIsSearchingPortals(true);
    setPortalError('');
    setPortalResults(null);
    try {
      const response = await fetch('/api/portais/search-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: property.state,
          city: property.city || (property.state === 'RJ' ? 'Rio de Janeiro' : 'São Paulo'),
          neighborhood: property.neighborhood,
          street: property.address,
          propertyType: property.propertyType,
          sizeSqm: property.sizeSqm,
          bedrooms: property.bedrooms || 2,
          parkingSpaces: property.parkingSpaces || 1,
          radiusKm
        })
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { error: responseText || `Erro HTTP ${response.status}` };
      }

      if (response.ok) {
        setPortalResults(responseData);
      } else {
        setPortalError(responseData.error || 'Erro ao buscar imóveis similares.');
      }
    } catch (e: any) {
      setPortalError(`Erro de rede: ${e.message}`);
    } finally {
      setIsSearchingPortals(false);
    }
  };

  // Load raw transactions when neighborhood changes
  useEffect(() => {
    if (activeSubTab !== 'comparador') return;
    
    async function loadTransactions() {
      setIsLoadingTransactions(true);
      try {
        const stateStr = property.state || 'SP';
        const cityStr = property.city || (stateStr === 'RJ' ? 'Rio de Janeiro' : 'São Paulo');
        const url = `/api/itbi/transactions?state=${stateStr}&city=${encodeURIComponent(cityStr)}&neighborhood=${encodeURIComponent(property.neighborhood)}&propertyType=${encodeURIComponent(property.propertyType)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setRawTransactions(data);
        }
      } catch (e) {
        console.error('Error fetching transactions:', e);
      } finally {
        setIsLoadingTransactions(false);
      }
    }

    loadTransactions();
  }, [activeSubTab, property.neighborhood, property.propertyType, property.state, property.city]);

  // Run portal comparison automatically when activeSubTab changes to 'comparador'
  useEffect(() => {
    if (activeSubTab === 'comparador') {
      handlePortalComparison();
    }
  }, [activeSubTab, radiusKm]);

  const normalizeString = (str: string) => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  const cleanStreetName = (street: string | null | undefined): string => {
    if (!street) return '';
    let norm = normalizeString(street);
    norm = norm.replace(/\s+/g, ' ');
    
    const prefixes: [RegExp, string][] = [
      [/^(rua|r)\b\.?\s*/i, 'r '],
      [/^(avenida|avn|av)\b\.?\s*/i, 'av '],
      [/^(estrada|etr|estr)\b\.?\s*/i, 'est '],
      [/^(travessa|trv|tra|trav)\b\.?\s*/i, 'trav '],
      [/^(praca|pra|prc)\b\.?\s*/i, 'praca '],
      [/^(beco|bec|bc)\b\.?\s*/i, 'beco '],
      [/^(rodovia|rod)\b\.?\s*/i, 'rod '],
      [/^(alameda|alm|al)\b\.?\s*/i, 'alameda '],
      [/^(largo|lrg|lgo)\b\.?\s*/i, 'largo '],
      [/^(caminho|cam)\b\.?\s*/i, 'caminho '],
      [/^(servidao|srv)\b\.?\s*/i, 'servidao '],
      [/^(ladeira|lad)\b\.?\s*/i, 'ladeira '],
      [/^(boulevard|blv)\b\.?\s*/i, 'boulevard '],
      [/^(vila|vil)\b\.?\s*/i, 'vila ']
    ];
    
    for (const [regex, replacement] of prefixes) {
      if (regex.test(norm)) {
        return norm.replace(regex, replacement).trim();
      }
    }
    return norm;
  };

  const getCoreStreetName = (street: string | null | undefined): string => {
    if (!street) return '';
    let norm = normalizeString(street);
    norm = norm.replace(/\s+/g, ' ');
    
    const prefixRegex = /^(rua|r|avenida|avn|av|estrada|etr|estr|travessa|trv|tra|trav|praca|pra|prc|beco|bec|bc|rodovia|rod|alameda|alm|al|largo|lrg|lgo|caminho|cam|servidao|srv|ladeira|lad|boulevard|blv|vila|vil)\b\.?\s*/i;
    return norm.replace(prefixRegex, '').trim();
  };

  const getSimulatedDistanceKm = (streetA: string, streetB: string) => {
    if (!streetA || !streetB) return 1.5;
    if (streetA.toLowerCase() === streetB.toLowerCase()) return 0;
    let hash = 0;
    const combined = streetA + streetB;
    for (let i = 0; i < combined.length; i++) {
      hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 0.5 + (Math.abs(hash) % 25) / 10;
  };

  // Find street name from address
  const extractStreetName = (addressStr: string) => {
    if (!addressStr) return '';
    const commaIndex = addressStr.indexOf(',');
    if (commaIndex !== -1) {
      return addressStr.substring(0, commaIndex).trim();
    }
    return addressStr.trim();
  };

  const targetStreet = extractStreetName(property.address);

  const exactStreetTxs = React.useMemo(() => {
    if (!targetStreet || rawTransactions.length === 0) return [];
    const streetClean = cleanStreetName(targetStreet);
    const streetCore = getCoreStreetName(targetStreet);
    return rawTransactions.filter(tx => {
      if (!tx.street) return false;
      const tClean = cleanStreetName(tx.street);
      const tCore = getCoreStreetName(tx.street);
      return tClean === streetClean || (streetCore && tCore === streetCore);
    });
  }, [rawTransactions, targetStreet]);

  const nearbyStreetTxs = React.useMemo(() => {
    if (rawTransactions.length === 0) return [];
    if (!targetStreet) return rawTransactions;
    const streetClean = cleanStreetName(targetStreet);
    const streetCore = getCoreStreetName(targetStreet);
    return rawTransactions.filter(tx => {
      if (!tx.street) return true;
      const tClean = cleanStreetName(tx.street);
      const tCore = getCoreStreetName(tx.street);
      if (tClean === streetClean || (streetCore && tCore === streetCore)) return false;
      const dist = getSimulatedDistanceKm(targetStreet, tx.street || '');
      return dist <= radiusKm;
    });
  }, [rawTransactions, targetStreet, radiusKm]);

  const exactStreetStats = React.useMemo(() => {
    if (exactStreetTxs.length === 0) return null;
    const values = exactStreetTxs.map(tx => tx.unitValueSqm).filter(Boolean);
    if (values.length === 0) return null;
    return {
      avgSqm: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      count: exactStreetTxs.length
    };
  }, [exactStreetTxs]);

  const nearbyStats = React.useMemo(() => {
    const txsToUse = targetStreet ? nearbyStreetTxs : rawTransactions;
    if (txsToUse.length === 0) {
      return {
        avgSqm: property.itbiUnitValueAvg || 6000,
        count: 0
      };
    }
    const values = txsToUse.map(tx => tx.unitValueSqm).filter(Boolean);
    return {
      avgSqm: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      count: txsToUse.length
    };
  }, [nearbyStreetTxs, rawTransactions, targetStreet, property.itbiUnitValueAvg]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const currentRoi = activeSubTab === 'planilha' ? roiM : roiPercent;
  const currentProfit = activeSubTab === 'planilha' ? lucroM : netProfit;
  const currentLiquidity = property.liquidityScore || 5;

  return (
    <div className="space-y-6">
      
      {/* Property Title & Header panel */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
        <div id="sim-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
          <button
            onClick={onBack}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar ao Painel</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="text-xs font-bold bg-slate-50 border border-gray-300 rounded p-1.5 text-slate-700 outline-none cursor-pointer"
            >
              <option value="Pendente">🟡 Pendente</option>
              <option value="Analisado">🔵 Analisado</option>
              <option value="Arrematado">🟣 Arrematado</option>
              <option value="Arquivado">⚪ Arquivado</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-black tracking-widest text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {property.propertyType} • {property.sizeSqm} m² • {property.neighborhood} ({property.state})
              </span>
              {property.auctionLink && (
                <a
                  href={property.auctionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1 transition-colors px-2 py-0.5 rounded hover:bg-emerald-50 border border-emerald-100"
                  title={property.origin === 'portal' ? 'Ver buscas no portal' : 'Ver edital original'}
                >
                  <span>{property.origin === 'portal' ? 'Acessar Busca no Portal' : 'Acessar Leilão Original'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-2 leading-tight">{property.title}</h2>
            <p className="text-xs text-gray-500 mt-1">{property.address}</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto shrink-0">
            <button
              onClick={() => setActiveSubTab('planilha')}
              className={`flex-1 md:flex-none text-[11px] font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'planilha'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Planilha Completa (Excel)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('basico')}
              className={`flex-1 md:flex-none text-[11px] font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'basico'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Parâmetros Básicos</span>
            </button>
            <button
              onClick={() => setActiveSubTab('comparador')}
              className={`flex-1 md:flex-none text-[11px] font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'comparador'
                  ? 'bg-violet-650 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Comparador Portais</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Property KPI Cards (matching home page layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex items-center space-x-4"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">ROI Estimado</p>
            <h3 className="text-2xl font-bold text-emerald-600 font-mono">{currentRoi}%</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex items-center space-x-4"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Ganhos Potenciais</p>
            <h3 className="text-2xl font-bold text-gray-900 font-mono">{formatBRL(currentProfit)}</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex items-center space-x-4"
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Liquidez do Bairro</p>
            <h3 className="text-2xl font-bold text-gray-900 font-mono">
              {currentLiquidity} <span className="text-xs text-gray-400 font-sans font-normal">/ 10</span>
            </h3>
          </div>
        </motion.div>
      </div>

      {/* Simulator view wrapped in elegant light-gray container to enhance visual clarity */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
        <AnimatePresence mode="wait">
          {activeSubTab === 'basico' ? (
            
            /* ORIGINAL SIMULATOR LAYOUT */
            <motion.div
              key="basico-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-100"
            >
              {/* LEFT COLUMN: Controls (3/5) */}
              <div className="md:col-span-3 p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-indigo-600/5 p-3 rounded-lg border border-indigo-600/10">
                    <div>
                      <span className="text-xs font-bold text-indigo-900 block uppercase tracking-wide">1. Lance de Arremate (R$)</span>
                      <p className="text-[11px] text-indigo-500 mt-0.5">Lance inicial de arremate estipulado na seção.</p>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-white border border-indigo-200 rounded px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                      <span className="text-xs text-indigo-500 font-bold font-mono">R$</span>
                      <input
                        type="number"
                        step="5000"
                        value={bidPrice}
                        onChange={(e) => {
                          const numVal = Number(e.target.value);
                          updateBidPriceAndRecalculateFees(numVal);
                        }}
                        className="w-28 text-right font-bold text-sm bg-transparent border-0 outline-none font-mono text-indigo-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="block text-[11px] font-bold text-gray-500 uppercase mb-1">2. Reforma/Obra</span>
                      <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                        <span className="text-xs text-gray-400 font-bold font-mono">R$</span>
                        <input
                          type="number"
                          step="2000"
                          value={repairs}
                          onChange={(e) => setRepairs(Number(e.target.value))}
                          className="w-full text-right font-semibold text-xs bg-transparent border-0 outline-none font-mono text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold text-gray-500 uppercase mb-1">3. Dívidas Edital</span>
                      <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                        <span className="text-xs text-gray-400 font-bold font-mono">R$</span>
                        <input
                          type="number"
                          step="1000"
                          value={debts}
                          onChange={(e) => setDebts(Number(e.target.value))}
                          className="w-full text-right font-semibold text-xs bg-transparent border-0 outline-none font-mono text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold text-gray-500 uppercase mb-1">4. Custas/Burocracia</span>
                      <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                        <span className="text-xs text-gray-400 font-bold font-mono">R$</span>
                        <input
                          type="number"
                          step="1000"
                          value={otherLegal}
                          onChange={(e) => setOtherLegal(Number(e.target.value))}
                          className="w-full text-right font-semibold text-xs bg-transparent border-0 outline-none font-mono text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-700 block uppercase">5. Valor de Venda Final Estimado (R$)</span>
                      <span className="text-[10px] text-gray-400 font-sans normal-case">(Passe 0 para usar cota do ITBI local)</span>
                    </div>
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2.5 py-2 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                      <span className="text-xs text-gray-500 font-bold font-mono">R$</span>
                      <input
                        type="number"
                        step="10000"
                        value={resaleVal}
                        onChange={(e) => setResaleVal(Number(e.target.value))}
                        className="w-full text-right font-bold text-sm bg-transparent border-0 outline-none font-mono text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Persistence triggers */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={handleSaveSimulation}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Edit3 className="w-3.5 h-3.5" />}
                    <span>{isSaved ? 'Simulação Gravada!' : 'Gravar Parâmetros'}</span>
                  </button>

                  <button
                    onClick={() => onTriggerAi(property.id)}
                    disabled={isAiAnalyzing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>{isAiAnalyzing ? 'Processando IA...' : 'Análise de Edital IA'}</span>
                  </button>
                </div>

                {property.description && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      {property.origin === 'portal' ? 'Descrição do Anúncio' : 'Dados do Leilão'}
                    </span>
                    <p className="text-xs text-gray-600 leading-relaxed max-h-36 overflow-y-auto">{property.description}</p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Performance indicators (2/5) */}
              <div className="md:col-span-2 p-6 bg-slate-50/50 space-y-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center space-x-1">
                      <span>📊 Resultados Operacionais</span>
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Custo Total de Aporte</span>
                      <span className="text-sm font-bold text-gray-900 font-mono">{formatBRL(totalInvested)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Valor de Revenda Final</span>
                      <span className="text-sm font-semibold text-gray-900 font-mono">{formatBRL(resaleVal)}</span>
                    </div>

                    <div className="border-t border-slate-200 border-dashed pt-3 flex justify-between items-end">
                      <div>
                        <span className="text-xs font-semibold text-[#475569] block">Lucro Imobiliário</span>
                        <span className="text-[10px] text-gray-400">Ganho Líquido Estimado</span>
                      </div>
                      <span className={`text-xl font-black font-mono ${netProfit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatBRL(netProfit)}
                      </span>
                    </div>

                    {(() => {
                      let ratingLabel = 'RUIM';
                      let ratingDesc = 'Retorno insatisfatório ou risco elevado. Reavalie o preço de compra.';
                      let ratingClass = 'bg-rose-50 border border-rose-200 text-rose-800';
                      let pingClass = 'bg-rose-450';
                      let circleClass = 'bg-rose-500';
                      
                      if (roiPercent >= 30) {
                        ratingLabel = 'EXCELENTE (ÓTIMO)';
                        ratingDesc = 'Excepcional oportunidade de arbitragem! Margem de lucro extremamente segura.';
                        ratingClass = 'bg-blue-50 border border-blue-200 text-blue-800';
                        pingClass = 'bg-blue-400';
                        circleClass = 'bg-blue-500';
                      } else if (roiPercent >= 15) {
                        ratingLabel = 'BOM INVESTIMENTO';
                        ratingDesc = 'Retorno atrativo com margem de segurança adequada.';
                        ratingClass = 'bg-emerald-50 border border-emerald-200 text-emerald-800';
                        pingClass = 'bg-emerald-400';
                        circleClass = 'bg-emerald-500';
                      } else if (roiPercent >= 5) {
                        ratingLabel = 'MEDIANO';
                        ratingDesc = 'Retorno moderado com margem apertada. Exige cuidado na negociação.';
                        ratingClass = 'bg-amber-50 border border-amber-200 text-amber-800';
                        pingClass = 'bg-amber-400';
                        circleClass = 'bg-amber-500';
                      }
                      
                      return (
                        <div className="space-y-3.5 mt-4">
                          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-emerald-800">Retorno de Capital (ROI)</span>
                              <span className="text-xl font-extrabold text-emerald-700 font-mono">{roiPercent}%</span>
                            </div>
                            <p className="text-[10px] text-emerald-600 leading-normal font-sans">
                              Para cada R$ 1 investido neste lote, estima-se o retorno de R$ {(1 + netProfit/totalInvested).toFixed(2)}.
                            </p>
                          </div>
                          
                          <div className={`rounded-xl border p-4 flex items-center space-x-3 transition-all ${ratingClass}`}>
                            <div className="flex-shrink-0">
                              <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingClass}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${circleClass}`}></span>
                              </span>
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs tracking-wider uppercase font-mono">Recomendação: {ratingLabel}</h4>
                              <p className="text-[10px] opacity-80 mt-0.5 font-sans leading-relaxed">{ratingDesc}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Arbitrage */}
                <div className="space-y-4 pt-4 border-t border-gray-200 border-dashed animate-fade-in">
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">🏗 Arbitragem de m² por ITBI</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Custo Efetivo do m²:</span>
                      <span className="font-bold text-slate-800 font-mono">R$ {effectiveCostSqm.toLocaleString('pt-BR')}/m²</span>
                    </div>
                    {property.itbiStreetAvgSqm ? (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Média na Mesma Rua (ITBI):</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          R$ {property.itbiStreetAvgSqm.toLocaleString('pt-BR')}/m² ({property.itbiStreetCount} tx)
                        </span>
                      </div>
                    ) : null}
                    {property.itbiSurroundingAvgSqm ? (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Média no Entorno (ITBI - 1km):</span>
                        <span className="font-bold text-indigo-700 font-mono">
                          R$ {property.itbiSurroundingAvgSqm.toLocaleString('pt-BR')}/m² ({property.itbiSurroundingCount} tx)
                        </span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Média Geral do Bairro (ITBI):</span>
                      <span className="font-bold text-slate-700 font-mono">
                        {property.itbiUnitValueAvg ? `R$ ${property.itbiUnitValueAvg.toLocaleString('pt-BR')}/m²` : 'Não indexado'}
                      </span>
                    </div>
                    {property.itbiUnitValueAvg && property.itbiUnitValueAvg > 0 && (
                      <div className="mt-2 text-center text-[11px] font-semibold text-blue-700 bg-blue-50 p-2 border border-blue-100 rounded">
                        {itbiDeltaPercent > 0 
                          ? `🔥 Comprando com ${itbiDeltaPercent}% de desconto em relação ao m² oficial do bairro.`
                          : `▲ Custo supera o ITBI médio em ${Math.abs(itbiDeltaPercent)}%.`
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeSubTab === 'planilha' ? (
            
            /* DETAILED SPREADSHEET (PLANILHA DE CUSTOS ADVANCED EXCEL) */
            <motion.div
              key="planilha-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 font-sans"
            >
              
              {/* Quick Informative Info Banner about standard spreadsheet formulas */}
              <div className="bg-emerald-50 border border-emerald-100/60 p-3.5 rounded-xl flex items-start space-x-3 text-xs text-emerald-800">
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">💡 Legenda e Fórmulas da Planilha Excel Integrada</span>
                  <p className="text-emerald-700 leading-relaxed text-[11px]">
                    Todos os cálculos reagem instantaneamente. O **Imposto sobre Ganho de Capital (15%)** deduz legalmente Comissão, ITBI, Cartório, e Certidões. O **Retorno em % (ROI)** reflete o lucro real em cima do **Aporte de Caixa Mínimo** (Entrada + Custos de Cartório e Tributos).
                  </p>
                </div>
              </div>

              {/* Dynamic Spreadsheet layout: 12-column Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                
                {/* 1. COMPRA COLUMN: 5/12 width - updated to match sales column styling */}
                <div className="xl:col-span-5 bg-white text-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5 flex flex-col justify-between border border-slate-200">
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 pb-2.5 border-b border-slate-200">
                      <DollarSign className="w-4.5 h-4.5 text-indigo-600" />
                      <div>
                        <h3 className="font-bold text-xs text-indigo-700 uppercase tracking-widest font-mono">1. CUSTOS DE COMPRA (APORTE)</h3>
                        <p className="text-[10px] text-slate-400">Valores de arrematação, leilão e custas cartoriais.</p>
                      </div>
                    </div>

                    {/* Payment terms badge if available */}
                    {(property.allowsInstallments || property.paymentTerms) && (
                      <div className="bg-indigo-50/50 border border-indigo-100/70 rounded-xl p-3 text-[11px] text-indigo-900 space-y-1">
                        <span className="font-bold flex items-center text-indigo-700">
                          <Scale className="w-3.5 h-3.5 mr-1" /> 
                          {property.origin === 'portal' ? 'Regras e Condições de Venda' : 'Regras de Parcelamento do Edital'}
                        </span>
                        <p className="text-indigo-800 font-sans leading-relaxed">{property.paymentTerms || 'Permite parcelamento'}</p>
                        {property.maxInstallments ? (
                          <div className="flex space-x-3 text-[10px] text-indigo-600 font-mono mt-1 pt-1 border-t border-indigo-100">
                            <span>Parcelas Máx: <strong className="font-bold">{property.maxInstallments}x</strong></span>
                            <span>Entrada Mín: <strong className="font-bold">{property.minDownpaymentPercent}%</strong></span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Interactive Input Form */}
                    <div className="space-y-2 text-xs font-mono">
                      
                      {/* Preço do Imóvel */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-600 font-bold">Preço do Imóvel:</span>
                        <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                          <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                          <input
                            type="number"
                            value={bidPrice}
                            onChange={(e) => updateBidPriceAndRecalculateFees(Number(e.target.value))}
                            className="w-24 text-right bg-transparent border-0 outline-none text-slate-800 font-bold text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Entrada % / Entrada R$ */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <div>
                          <span className="text-slate-600 block">Entrada:</span>
                          <span className="text-[9px] text-slate-400 italic font-sans">Mude % para amortizar</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={pnyPct}
                              onChange={(e) => setPnyPct(Number(e.target.value))}
                              className="w-8 text-center bg-transparent border-0 outline-none text-slate-800 font-bold text-xs"
                            />
                            <span className="text-slate-500 font-bold text-[10px] ml-0.5">%</span>
                          </div>
                          <span className="text-indigo-600 font-extrabold w-24 text-right block font-mono">{formatBRL(calculatedEntradaVal)}</span>
                        </div>
                      </div>

                      {/* Financiamento */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-600">Financiamento (Quitação):</span>
                        <span className="font-bold text-slate-800 font-mono">{formatBRL(calculatedFinanciamentoVal)}</span>
                      </div>

                      {/* ITBI % & ITBI Cost */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-600">Alíquota ITBI:</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                            <input
                              type="number"
                              step="0.5"
                              value={itbiRate}
                              onChange={(e) => setItbiRate(Number(e.target.value))}
                              className="w-8 text-center bg-transparent border-0 outline-none text-slate-800 font-bold text-xs"
                            />
                            <span className="text-slate-500 font-bold text-[10px] ml-0.5">%</span>
                          </div>
                          <span className="font-semibold text-slate-800 text-right w-24 block font-mono">{formatBRL(calculatedItbiCost)}</span>
                        </div>
                      </div>

                      {/* Cartorio */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-600">Registro & Cartório:</span>
                        <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                          <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                          <input
                            type="number"
                            value={cartCd}
                            onChange={(e) => setCartCd(Number(e.target.value))}
                            className="w-24 text-right bg-transparent border-0 outline-none text-slate-800 text-xs font-bold font-mono"
                          />
                        </div>
                      </div>

                      {/* Contrato Caixa (only display if origin is caixa) */}
                      {property.origin === 'caixa' && (
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                          <span className="text-slate-600">Custas Contrato Caixa:</span>
                          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                            <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                            <input
                              type="number"
                              value={caixCd}
                              onChange={(e) => setCaixCd(Number(e.target.value))}
                              className="w-24 text-right bg-transparent border-0 outline-none text-slate-800 text-xs font-bold font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Certidões */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-600">Certidões Negativas:</span>
                        <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                          <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                          <input
                            type="number"
                            value={certCd}
                            onChange={(e) => setCertCd(Number(e.target.value))}
                            className="w-24 text-right bg-transparent border-0 outline-none text-slate-800 text-xs font-bold font-mono"
                          />
                        </div>
                      </div>

                      {/* IPTU Atrasado */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-amber-800">
                        <span className="font-semibold">IPTU em Atraso:</span>
                        <div className="flex items-center space-x-1.5 bg-slate-50 border border-amber-200 rounded-lg px-2 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                          <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                          <input
                            type="number"
                            value={iptuAt}
                            onChange={(e) => setIptuAt(Number(e.target.value))}
                            className="w-24 text-right bg-transparent border-0 outline-none text-slate-800 font-bold text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Condominio atrasado */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-amber-800">
                        <span className="font-semibold">Condomínio Atrasado:</span>
                        <div className="flex items-center space-x-1.5 bg-slate-50 border border-amber-200 rounded-lg px-2 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                          <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                          <input
                            type="number"
                            value={condoAt}
                            onChange={(e) => setCondoAt(Number(e.target.value))}
                            className="w-24 text-right bg-transparent border-0 outline-none text-slate-800 font-bold text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Leiloeiro fee */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <div>
                          <span className="text-slate-600 font-medium block">
                            {property.origin === 'portal' ? 'Taxa do Portal:' : 'Leiloeiro:'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                            <input
                              type="number"
                              value={leilPct}
                              onChange={(e) => handleLeilPctChange(Number(e.target.value))}
                              className="w-8 text-center bg-transparent border-0 outline-none text-slate-800 font-bold text-xs"
                            />
                            <span className="text-slate-500 font-bold text-[10px] ml-0.5">%</span>
                          </div>
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                            <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                            <input
                              type="number"
                              value={leilCd}
                              onChange={(e) => handleLeilCdChange(Number(e.target.value))}
                              className="w-20 text-right bg-transparent border-0 outline-none text-slate-800 text-xs font-bold font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Advogado */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <div>
                          <span className="text-slate-600 font-medium block">Advogado:</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                            <input
                              type="number"
                              value={advPct}
                              onChange={(e) => handleAdvPctChange(Number(e.target.value))}
                              className="w-8 text-center bg-transparent border-0 outline-none text-slate-800 font-bold text-xs"
                            />
                            <span className="text-slate-500 font-bold text-[10px] ml-0.5">%</span>
                          </div>
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                            <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                            <input
                              type="number"
                              value={advCd}
                              onChange={(e) => handleAdvCdChange(Number(e.target.value))}
                              className="w-20 text-right bg-transparent border-0 outline-none text-slate-800 text-xs font-bold font-mono"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Total bold display box */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-indigo-200/85 space-y-1.5 mt-3 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 uppercase text-[9px] font-bold">Total Custos Extras:</span>
                      <span className="font-extrabold text-slate-800">{formatBRL(purchaseCostsTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-indigo-700 border-t border-slate-200 pt-2">
                      <div>
                        <span className="font-extrabold uppercase text-[9.5px] block text-indigo-600">Aporte de Caixa Total:</span>
                        <span className="text-[8px] text-slate-400 normal-case">(Entrada + Custos Extras)</span>
                      </div>
                      <span className="text-sm font-black text-indigo-700">{formatBRL(totalCashAporte)}</span>
                    </div>
                  </div>

                </div>

                {/* 2. SALES COMPARISON TABLE: 7/12 width */}
                <div className="xl:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm space-y-3 flex flex-col justify-between">
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                        <div>
                          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-widest">2. CENÁRIOS DE VENDA & RETORNO</h3>
                          <p className="text-[10px] text-gray-500">Compare margens, impostos e ROI das duas projeções reais.</p>
                        </div>
                      </div>
                      
                      {/* Commission */}
                      <div className="flex items-center space-x-2 bg-slate-50 p-1 rounded-lg border border-gray-200 text-[10px]">
                        <span className="font-bold text-slate-700 font-mono">Corretor (%):</span>
                        <input
                          type="number"
                          value={brokerCommissionPct}
                          onChange={(e) => setBrokerCommissionPct(Number(e.target.value))}
                          className="w-8 text-center font-bold bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none p-0.5"
                        />
                      </div>
                    </div>

                    {/* SPREADSHEET TABLE CARD COMPARISON */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse font-mono">
                        <thead>
                          <tr className="border-b border-gray-200 text-slate-400 uppercase text-[9px]">
                            <th className="py-2 font-bold">MÉTRICAS DE VENDA</th>
                            <th className="py-2 text-right font-black text-rose-700 bg-rose-50/50 px-2 rounded-t-lg">📉 Cenário 1: Venda p/ ITBI</th>
                            <th className="py-2 text-right font-black text-indigo-700 bg-indigo-50/50 px-2 rounded-t-lg">📈 Cenário 2: Venda p/ Portais</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11px]">
                          
                          {/* Preço de Venda row */}
                          <tr className="hover:bg-slate-50/5">
                            <td className="py-1.5 font-bold text-slate-700 font-sans">Preço de Venda Projetado</td>
                            <td className="py-1 bg-rose-50/30 px-2">
                              <div className="flex items-center justify-end space-x-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-rose-500 focus-within:bg-white transition-all w-28 ml-auto">
                                <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                                <input
                                  type="number"
                                  value={vBaixaPrice}
                                  onChange={(e) => setVBaixaPrice(Number(e.target.value))}
                                  className="w-full text-right font-bold bg-transparent border-0 outline-none text-slate-800 font-mono text-xs"
                                />
                              </div>
                            </td>
                            <td className="py-1 bg-indigo-50/30 px-2">
                              <div className="flex items-center justify-end space-x-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all w-28 ml-auto">
                                <span className="text-[10px] text-slate-400 font-bold font-mono">R$</span>
                                <input
                                  type="number"
                                  value={vMediaPrice}
                                  onChange={(e) => setVMediaPrice(Number(e.target.value))}
                                  className="w-full text-right font-bold bg-transparent border-0 outline-none text-slate-800 font-mono text-xs"
                                />
                              </div>
                            </td>
                          </tr>

                          {/* Preço por m² projetado */}
                          <tr className="text-slate-600">
                            <td className="py-1.5 font-sans">Valor Projetado por m²</td>
                            <td className="py-1.5 text-right bg-rose-50/30 px-2 font-semibold">
                              R$ {property.sizeSqm > 0 ? Math.round(vBaixaPrice / property.sizeSqm).toLocaleString('pt-BR') : '0'}/m²
                            </td>
                            <td className="py-1.5 text-right bg-indigo-50/30 px-2 font-semibold">
                              R$ {property.sizeSqm > 0 ? Math.round(vMediaPrice / property.sizeSqm).toLocaleString('pt-BR') : '0'}/m²
                            </td>
                          </tr>

                          {/* Preço do m² Mesma Rua */}
                          <tr className="text-slate-500 bg-slate-50/5">
                            <td className="py-1.5 font-sans text-[10px]">Média m² Mesma Rua (ITBI)</td>
                            <td className="py-1.5 text-right bg-rose-50/30 px-2 text-[10px] font-semibold">
                              {property.itbiStreetAvgSqm 
                                ? `R$ ${property.itbiStreetAvgSqm.toLocaleString('pt-BR')}/m² (${property.itbiStreetCount} tx)` 
                                : 'Sem dados na rua'}
                            </td>
                            <td className="py-1.5 text-right bg-indigo-50/30 px-2 text-[10px] text-slate-400">
                              -
                            </td>
                          </tr>

                          {/* Preço do m² Ruas do Entorno */}
                          <tr className="text-slate-500 bg-slate-50/5">
                            <td className="py-1.5 font-sans text-[10px]">Média m² Ruas Entorno (ITBI - 1km)</td>
                            <td className="py-1.5 text-right bg-rose-50/30 px-2 text-[10px] font-semibold">
                              {property.itbiSurroundingAvgSqm 
                                ? `R$ ${property.itbiSurroundingAvgSqm.toLocaleString('pt-BR')}/m² (${property.itbiSurroundingCount} tx)` 
                                : 'Sem dados no entorno'}
                            </td>
                            <td className="py-1.5 text-right bg-indigo-50/30 px-2 text-[10px] text-slate-400">
                              -
                            </td>
                          </tr>

                          {/* Preço do m² médio da região */}
                          <tr className="text-slate-500 bg-slate-50/10">
                            <td className="py-1.5 font-sans text-[10px] italic">Preço Médio m² Bairro (ITBI / Portais)</td>
                            <td className="py-1.5 text-right bg-rose-50/30 px-2 text-[10px] font-semibold">
                              R$ {(property.itbiUnitValueAvg || 0).toLocaleString('pt-BR')}/m²
                            </td>
                            <td className="py-1.5 text-right bg-indigo-50/30 px-2 text-[10px] font-semibold">
                              R$ {property.sizeSqm > 0 && (property.portalZapAvg || property.portalQuintoAndarAvg) ? Math.round(((property.portalZapAvg || 0) + (property.portalQuintoAndarAvg || 0)) / (2 * property.sizeSqm)).toLocaleString('pt-BR') : '0'}/m²
                            </td>
                          </tr>

                          {/* Comissão Corretor */}
                          <tr className="text-gray-500">
                            <td className="py-1.5 font-sans">Comissão Corretor ({brokerCommissionPct}%)</td>
                            <td className="py-1.5 text-right bg-rose-50/30 px-2 font-semibold text-slate-750">{formatBRL(brokerCommB)}</td>
                            <td className="py-1.5 text-right bg-indigo-50/30 px-2 font-semibold text-slate-750">{formatBRL(brokerCommM)}</td>
                          </tr>

                          {/* Imposto Ganho de Capital */}
                          <tr>
                            <td className="py-1.5 font-sans flex items-center space-x-1.5 text-gray-500">
                              <span>Imposto s/ Lucro (15%)</span>
                            </td>
                            <td className="py-1.5 text-right bg-rose-50/30 px-2 text-rose-600 font-medium">{formatBRL(capitalGainTaxB)}</td>
                            <td className="py-1.5 text-right bg-indigo-50/30 px-2 text-rose-600 font-medium">{formatBRL(capitalGainTaxM)}</td>
                          </tr>

                          {/* Montante */}
                          <tr className="font-bold text-slate-800">
                            <td className="py-1.5 font-sans">Soma Pós Impostos</td>
                            <td className="py-1.5 text-right bg-rose-50/30 px-2">{formatBRL(montanteB)}</td>
                            <td className="py-1.5 text-right bg-indigo-50/30 px-2">{formatBRL(montanteM)}</td>
                          </tr>

                          {/* Quitação Financiamento */}
                          <tr className="text-gray-400">
                            <td className="py-1.5 font-sans">Quitação Financiamento</td>
                            <td className="py-1.5 text-right bg-rose-50/30 px-2 text-rose-500">-{formatBRL(calculatedFinanciamentoVal)}</td>
                            <td className="py-1.5 text-right bg-indigo-50/30 px-2 text-rose-500">-{formatBRL(calculatedFinanciamentoVal)}</td>
                          </tr>

                          {/* Sobra de caixa */}
                          <tr className="text-slate-800 font-semibold">
                            <td className="py-1.5 font-sans">Sobra de Caixa (Líquido)</td>
                            <td className="py-1.5 text-right bg-rose-50/30 px-2">{formatBRL(sobraB)}</td>
                            <td className="py-1.5 text-right bg-indigo-50/30 px-2">{formatBRL(sobraM)}</td>
                          </tr>

                          {/* Lucro Real */}
                          <tr className="font-black text-sm text-emerald-800">
                            <td className="py-2 font-sans flex items-center space-x-1.5">
                              <span>Lucro Real Estimado</span>
                            </td>
                            <td className="py-2 text-right bg-rose-50/30 px-2 text-emerald-600 text-sm font-black">{formatBRL(lucroB)}</td>
                            <td className="py-2 text-right bg-indigo-50/30 px-2 text-emerald-600 text-sm font-black">{formatBRL(lucroM)}</td>
                          </tr>

                          {/* ROI */}
                          <tr className="font-black text-rose-900 text-xs">
                            <td className="py-2 font-sans">ROI de Caixa (%)</td>
                            <td className="py-2 text-right bg-rose-50 border-y border-rose-200 px-2">
                              <span className="inline-block bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded text-[10.5px]">
                                {roiB.toLocaleString('pt-BR')}%
                              </span>
                            </td>
                            <td className="py-2 text-right bg-indigo-50 border-y border-indigo-200 px-2">
                              <span className="inline-block bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded text-[10.5px]">
                                {roiM.toLocaleString('pt-BR')}%
                              </span>
                            </td>
                          </tr>

                          {/* Monthly Installment */}
                          <tr className="bg-slate-50/60 font-sans text-xs">
                            <td className="py-1.5 font-medium text-slate-600">Prestação Financiamento</td>
                            <td className="py-1.5 text-right px-2 bg-slate-50/80" colSpan={2}>
                              <div className="flex justify-end items-center space-x-2">
                                <span className="text-[10px] text-gray-400 font-mono">Mensal:</span>
                                <input
                                  type="number"
                                  value={monthlyFinancingInstall}
                                  onChange={(e) => setMonthlyFinancingInstall(Number(e.target.value))}
                                  className="w-20 text-right font-bold bg-white border border-gray-300 rounded p-0.5 font-mono text-slate-800 text-[11px]"
                                />
                              </div>
                            </td>
                          </tr>

                          {/* Renda Mensal */}
                          <tr className="text-gray-500">
                            <td className="py-2 font-sans italic">Renda Pro-rata (Lucro / 12 meses)</td>
                            <td className="py-2 text-right bg-rose-50/30 px-2 font-semibold text-slate-800">{formatBRL(rendaMensalB)}/mês</td>
                            <td className="py-2 text-right bg-indigo-50/30 px-2 font-semibold text-slate-800">{formatBRL(rendaMensalM)}/mês</td>
                          </tr>

                          {/* 12 Meses Profit minus Installment */}
                          <tr className="border-t border-dashed border-slate-300 text-slate-900 bg-slate-100/40 font-bold">
                            <td className="py-2 font-sans">Saldo Real Pós-Mensalidades (12m)</td>
                            <td className="py-2 text-right bg-rose-50/30 px-2 text-slate-900">{formatBRL(liquidAfterTwelveMonthsB)}</td>
                            <td className="py-2 text-right bg-indigo-50/30 px-2 text-slate-900">{formatBRL(liquidAfterTwelveMonthsM)}</td>
                          </tr>

                        </tbody>
                      </table>
                    </div>

                    {/* Investment Rating Indicator Card (Spreadsheet Tab) */}
                    {(() => {
                      // We evaluate based on the Portais scenario (Scenario 2)
                      const roi = roiM;
                      
                      let ratingLabel = 'RUIM';
                      let ratingDesc = 'Retorno insatisfatório ou risco elevado. Reavalie o preço de compra.';
                      let ratingClass = 'bg-rose-50 border border-rose-200 text-rose-800';
                      let pingClass = 'bg-rose-450';
                      let circleClass = 'bg-rose-500';
                      
                      if (roi >= 30) {
                        ratingLabel = 'EXCELENTE (ÓTIMO)';
                        ratingDesc = 'Excepcional oportunidade de arbitragem! Margem de lucro extremamente segura.';
                        ratingClass = 'bg-blue-50 border border-blue-200 text-blue-800';
                        pingClass = 'bg-blue-400';
                        circleClass = 'bg-blue-500';
                      } else if (roi >= 15) {
                        ratingLabel = 'BOM INVESTIMENTO';
                        ratingDesc = 'Retorno atrativo com margem de segurança adequada.';
                        ratingClass = 'bg-emerald-50 border border-emerald-200 text-emerald-800';
                        pingClass = 'bg-emerald-400';
                        circleClass = 'bg-emerald-500';
                      } else if (roi >= 5) {
                        ratingLabel = 'MEDIANO';
                        ratingDesc = 'Retorno moderado com margem apertada. Exige cuidado na negociação.';
                        ratingClass = 'bg-amber-50 border border-amber-200 text-amber-800';
                        pingClass = 'bg-amber-400';
                        circleClass = 'bg-amber-500';
                      }
                      
                      return (
                        <div className={`mt-4 rounded-xl border p-4 flex items-center space-x-3 transition-all ${ratingClass}`}>
                          <div className="flex-shrink-0">
                            <span className="relative flex h-3 w-3">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingClass}`}></span>
                              <span className={`relative inline-flex rounded-full h-3 w-3 ${circleClass}`}></span>
                            </span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs tracking-wider uppercase font-mono">Indicador de Investimento: {ratingLabel}</h4>
                            <p className="text-[10px] opacity-80 mt-0.5 font-sans leading-relaxed">{ratingDesc}</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Projections Charts (Spreadsheet Tab) */}
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-150">
                      {(() => {
                        const rent12_B = Math.round(vBaixaPrice * 0.005) * 12;
                        const rent24_B = Math.round(vBaixaPrice * 0.005) * 24;
                        const rent12_M = Math.round(vMediaPrice * 0.005) * 12;
                        const rent24_M = Math.round(vMediaPrice * 0.005) * 24;
                        
                        const maxRent = Math.max(rent24_B, rent24_M, 1);
                        const getRentHeight = (rent: number) => Math.round((rent / maxRent) * 85);
                        
                        const roi12_B = Math.round(((lucroB - (12 * monthlyFinancingInstall)) / totalCashOutlayForRoi()) * 100);
                        const roi24_B = Math.round(((lucroB - (24 * monthlyFinancingInstall)) / totalCashOutlayForRoi()) * 100);
                        const roi12_M = Math.round(((lucroM - (12 * monthlyFinancingInstall)) / totalCashOutlayForRoi()) * 100);
                        const roi24_M = Math.round(((lucroM - (24 * monthlyFinancingInstall)) / totalCashOutlayForRoi()) * 100);
                        
                        const maxAbsRoi = Math.max(
                          Math.abs(roi12_B), Math.abs(roi24_B),
                          Math.abs(roi12_M), Math.abs(roi24_M),
                          1
                        );
                        const getRoiHeight = (roi: number) => Math.round((Math.abs(roi) / maxAbsRoi) * 75);
                        
                        return (
                          <>
                            {/* Rent Chart */}
                            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                              <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-wider block mb-3 text-center">
                                Projeções de Receita de Locação
                              </span>
                              <svg viewBox="0 0 300 160" className="w-full h-auto overflow-visible">
                                {/* Legend */}
                                <rect x="180" y="5" width="8" height="8" rx="1.5" fill="#818cf8" />
                                <text x="192" y="12" fill="#64748B" className="text-[8px] font-mono">12 meses</text>
                                <rect x="235" y="5" width="8" height="8" rx="1.5" fill="#4f46e5" />
                                <text x="247" y="12" fill="#64748B" className="text-[8px] font-mono">24 meses</text>
                                
                                {/* Baseline */}
                                <line x1="15" y1="130" x2="285" y2="130" stroke="#CBD5E1" strokeWidth="1" />
                                
                                {/* Group 1: ITBI */}
                                <rect x="60" y={130 - getRentHeight(rent12_B)} width="15" height={getRentHeight(rent12_B)} rx="2" fill="#818cf8" />
                                <rect x="78" y={130 - getRentHeight(rent24_B)} width="15" height={getRentHeight(rent24_B)} rx="2" fill="#4f46e5" />
                                <text x="76" y={130 - getRentHeight(rent24_B) - 4} fill="#4f46e5" className="text-[7.5px] font-mono font-bold" textAnchor="middle">{Math.round(rent24_B / 1000)}k</text>
                                
                                {/* Group 2: Portais */}
                                <rect x="190" y={130 - getRentHeight(rent12_M)} width="15" height={getRentHeight(rent12_M)} rx="2" fill="#818cf8" />
                                <rect x="208" y={130 - getRentHeight(rent24_M)} width="15" height={getRentHeight(rent24_M)} rx="2" fill="#4f46e5" />
                                <text x="206" y={130 - getRentHeight(rent24_M) - 4} fill="#4f46e5" className="text-[7.5px] font-mono font-bold" textAnchor="middle">{Math.round(rent24_M / 1000)}k</text>
                                
                                {/* Bottom Labels */}
                                <text x="76" y="145" fill="#475569" className="text-[8.5px] font-sans font-bold" textAnchor="middle">Cenário 1 (ITBI)</text>
                                <text x="206" y="145" fill="#475569" className="text-[8.5px] font-sans font-bold" textAnchor="middle">Cenário 2 (Portais)</text>
                              </svg>
                            </div>

                            {/* ROI Chart */}
                            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                              <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-wider block mb-3 text-center">
                                ROI na Venda (Flipping)
                              </span>
                              <svg viewBox="0 0 300 160" className="w-full h-auto overflow-visible">
                                {/* Legend */}
                                <rect x="180" y="5" width="8" height="8" rx="1.5" fill="#34d399" />
                                <text x="192" y="12" fill="#64748B" className="text-[8px] font-mono">12 meses</text>
                                <rect x="235" y="5" width="8" height="8" rx="1.5" fill="#059669" />
                                <text x="247" y="12" fill="#64748B" className="text-[8px] font-mono">24 meses</text>
                                
                                {/* Baseline at Y=90 */}
                                <line x1="15" y1="90" x2="285" y2="90" stroke="#CBD5E1" strokeWidth="1" />
                                
                                {/* Group 1: ITBI */}
                                {roi12_B >= 0 ? (
                                  <rect x="60" y={90 - getRoiHeight(roi12_B)} width="15" height={getRoiHeight(roi12_B)} rx="2" fill="#34d399" />
                                ) : (
                                  <rect x="60" y={90} width="15" height={getRoiHeight(roi12_B)} rx="2" fill="#ef4444" />
                                )}
                                {roi24_B >= 0 ? (
                                  <rect x="78" y={90 - getRoiHeight(roi24_B)} width="15" height={getRoiHeight(roi24_B)} rx="2" fill="#059669" />
                                ) : (
                                  <rect x="78" y={90} width="15" height={getRoiHeight(roi24_B)} rx="2" fill="#b91c1c" />
                                )}
                                <text x="76" y={roi24_B >= 0 ? (90 - getRoiHeight(roi24_B) - 4) : 104 + getRoiHeight(roi24_B)} fill={roi24_B >= 0 ? "#059669" : "#ef4444"} className="text-[7.5px] font-mono font-bold" textAnchor="middle">{roi24_B}%</text>
                                
                                {/* Group 2: Portais */}
                                {roi12_M >= 0 ? (
                                  <rect x="190" y={90 - getRoiHeight(roi12_M)} width="15" height={getRoiHeight(roi12_M)} rx="2" fill="#34d399" />
                                ) : (
                                  <rect x="190" y={90} width="15" height={getRoiHeight(roi12_M)} rx="2" fill="#ef4444" />
                                )}
                                {roi24_M >= 0 ? (
                                  <rect x="208" y={90 - getRoiHeight(roi24_M)} width="15" height={getRoiHeight(roi24_M)} rx="2" fill="#059669" />
                                ) : (
                                  <rect x="208" y={90} width="15" height={getRoiHeight(roi24_M)} rx="2" fill="#b91c1c" />
                                )}
                                <text x="206" y={roi24_M >= 0 ? (90 - getRoiHeight(roi24_M) - 4) : 104 + getRoiHeight(roi24_M)} fill={roi24_M >= 0 ? "#059669" : "#ef4444"} className="text-[7.5px] font-mono font-bold" textAnchor="middle">{roi24_M}%</text>
                                
                                {/* Bottom Labels */}
                                <text x="76" y="145" fill="#475569" className="text-[8.5px] font-sans font-bold" textAnchor="middle">Cenário 1 (ITBI)</text>
                                <text x="206" y="145" fill="#475569" className="text-[8.5px] font-sans font-bold" textAnchor="middle">Cenário 2 (Portais)</text>
                              </svg>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                  </div>

                  {/* Simulation controls bottom bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2.5 border-t border-gray-100">
                    <span className="text-[10px] text-slate-400 italic">
                      💡 As simulações são mantidas localmente para este imóvel.
                    </span>
                    
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <button
                        onClick={handleSaveSimulation}
                        className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Edit3 className="w-4 h-4" />}
                        <span>{isSaved ? 'Gravado!' : 'Gravar Planilha'}</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </motion.div>
          ) : (
            /* PORTAL COMPARATOR MODE DETAILED PANELS */
            <motion.div
              key="comparador-details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6 animate-fade-in"
            >
              {isSearchingPortals ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-xs">
                  <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-800">Pesquisando imóveis similares ativos no ZapImóveis e QuintoAndar...</p>
                  <p className="text-xs text-slate-400">Agrupando por faixas de m² (Menor, Próximo, Maior) e tipologia.</p>
                </div>
              ) : portalError ? (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-xs flex items-center space-x-3">
                  <Info className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>{portalError}</span>
                </div>
              ) : portalResults ? (
                <div className="space-y-6">
                  
                  {/* Slider Control for Radius */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide font-sans">Ajustar Raio de Comparação Geográfica</span>
                      <p className="text-[10px] text-gray-500">Expanda ou contraia o raio para buscar transações oficiais e anúncios de ruas paralelas.</p>
                    </div>
                    <div className="flex items-center space-x-4 shrink-0">
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.5"
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Number(e.target.value))}
                        className="w-48 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                      />
                      <span className="text-xs font-black text-violet-700 font-mono w-14">{radiusKm.toFixed(1)} km</span>
                    </div>
                  </div>

                  {/* 3 Columns for Size Brackets */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Column 1: Menor (Below) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div className="border-b border-gray-100 pb-2.5">
                        <span className="text-[10px] text-indigo-600 font-mono font-bold uppercase tracking-wider">Faixa: Menor</span>
                        <h4 className="font-bold text-slate-800 text-sm mt-0.5 font-sans">Área Menor ({portalResults.below?.range || '-'})</h4>
                        <div className="flex justify-between items-end mt-2">
                          <div>
                            <span className="text-[9px] text-gray-400 block font-mono">MÉDIA ANÚNCIO</span>
                            <span className="text-sm font-black text-slate-800 font-mono">{formatBRL(portalResults.below?.avgPrice || 0)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 block font-mono">MÉDIA M²</span>
                            <span className="text-xs font-bold text-indigo-600 font-mono">R$ {(portalResults.below?.avgSqm || 0).toLocaleString('pt')}/m²</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {!portalResults.below?.matches || portalResults.below.matches.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">Nenhum imóvel encontrado nessa faixa.</p>
                        ) : (
                          portalResults.below.matches.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setResaleVal(m.price);
                              }}
                              className="bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 rounded-xl p-3.5 transition-all cursor-pointer text-xs space-y-2 group"
                              title="Clique para importar este preço como valor estimado"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-bold text-slate-700 group-hover:text-violet-700 transition-colors line-clamp-2 font-sans">
                                  {m.address}
                                </span>
                                <span className="text-[10px] text-gray-450 font-mono shrink-0">{m.sizeSqm}m²</span>
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="font-mono">
                                  <strong className="text-xs text-slate-800">{formatBRL(m.price)}</strong>
                                  <span className="text-[9.5px] text-gray-500 block mt-0.5">R$ {m.unitValueSqm.toLocaleString('pt')}/m²</span>
                                </div>
                                {m.link && (
                                  <a
                                    href={m.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-violet-650 hover:text-violet-800 flex items-center space-x-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>Ver Anúncio</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Column 2: Próximo (Close) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div className="border-b border-gray-100 pb-2.5">
                        <span className="text-[10px] text-emerald-600 font-mono font-bold uppercase tracking-wider">Faixa: Próximo</span>
                        <h4 className="font-bold text-slate-800 text-sm mt-0.5 font-sans">Área Próxima ({portalResults.close?.range || '-'})</h4>
                        <div className="flex justify-between items-end mt-2">
                          <div>
                            <span className="text-[9px] text-gray-400 block font-mono">MÉDIA ANÚNCIO</span>
                            <span className="text-sm font-black text-slate-800 font-mono">{formatBRL(portalResults.close?.avgPrice || 0)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 block font-mono">MÉDIA M²</span>
                            <span className="text-xs font-bold text-emerald-600 font-mono">R$ {(portalResults.close?.avgSqm || 0).toLocaleString('pt')}/m²</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {!portalResults.close?.matches || portalResults.close.matches.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">Nenhum imóvel encontrado nessa faixa.</p>
                        ) : (
                          portalResults.close.matches.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setResaleVal(m.price);
                              }}
                              className="bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 rounded-xl p-3.5 transition-all cursor-pointer text-xs space-y-2 group"
                              title="Clique para importar este preço como valor estimado"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-bold text-slate-700 group-hover:text-violet-700 transition-colors line-clamp-2 font-sans">
                                  {m.address}
                                </span>
                                <span className="text-[10px] text-gray-455 font-mono shrink-0">{m.sizeSqm}m²</span>
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="font-mono">
                                  <strong className="text-xs text-slate-800">{formatBRL(m.price)}</strong>
                                  <span className="text-[9.5px] text-gray-500 block mt-0.5">R$ {m.unitValueSqm.toLocaleString('pt')}/m²</span>
                                </div>
                                {m.link && (
                                  <a
                                    href={m.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-violet-650 hover:text-violet-800 flex items-center space-x-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>Ver Anúncio</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Column 3: Maior (Above) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div className="border-b border-gray-100 pb-2.5">
                        <span className="text-[10px] text-pink-600 font-mono font-bold uppercase tracking-wider">Faixa: Maior</span>
                        <h4 className="font-bold text-slate-800 text-sm mt-0.5 font-sans">Área Maior ({portalResults.above?.range || '-'})</h4>
                        <div className="flex justify-between items-end mt-2">
                          <div>
                            <span className="text-[9px] text-gray-400 block font-mono">MÉDIA ANÚNCIO</span>
                            <span className="text-sm font-black text-slate-800 font-mono">{formatBRL(portalResults.above?.avgPrice || 0)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 block font-mono">MÉDIA M²</span>
                            <span className="text-xs font-bold text-pink-600 font-mono">R$ {(portalResults.above?.avgSqm || 0).toLocaleString('pt')}/m²</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {!portalResults.above?.matches || portalResults.above.matches.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">Nenhum imóvel encontrado nessa faixa.</p>
                        ) : (
                          portalResults.above.matches.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setResaleVal(m.price);
                              }}
                              className="bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 rounded-xl p-3.5 transition-all cursor-pointer text-xs space-y-2 group"
                              title="Clique para importar este preço como valor estimado"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-bold text-slate-700 group-hover:text-violet-700 transition-colors line-clamp-2 font-sans">
                                  {m.address}
                                </span>
                                <span className="text-[10px] text-gray-455 font-mono shrink-0">{m.sizeSqm}m²</span>
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="font-mono">
                                  <strong className="text-xs text-slate-800">{formatBRL(m.price)}</strong>
                                  <span className="text-[9.5px] text-gray-500 block mt-0.5">R$ {m.unitValueSqm.toLocaleString('pt')}/m²</span>
                                </div>
                                {m.link && (
                                  <a
                                    href={m.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-violet-650 hover:text-violet-800 flex items-center space-x-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>Ver Anúncio</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Radius Streets Analysis */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-gray-150">
                      <div className="flex items-center space-x-2">
                        <Scale className="w-5 h-5 text-indigo-600" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm font-sans">Análise de Ruas Próximas no Entorno</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">Médias de m² de transações reais do ITBI num raio de {radiusKm} km.</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-mono">Raio Ativo:</span>
                        <span className="text-xs font-bold text-indigo-600 font-mono">{radiusKm} km</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-gray-600 font-semibold font-sans">Média da Rua Principal (Alvo):</span>
                          <div className="text-right font-mono">
                            <strong className="text-slate-800 block text-xs">{exactStreetStats ? `R$ ${exactStreetStats.avgSqm.toLocaleString('pt')}/m²` : 'Sem dados na rua'}</strong>
                            <span className="text-[9px] text-gray-500 block">{exactStreetStats ? `${exactStreetStats.count} transação(ões)` : '-'}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-gray-600 font-semibold font-sans">Média das Ruas Paralelas no Entorno:</span>
                          <div className="text-right font-mono">
                            <strong className="text-slate-800 block text-xs">R$ {nearbyStats.avgSqm.toLocaleString('pt')}/m²</strong>
                            <span className="text-[9px] text-gray-500 block">{nearbyStats.count} transações no raio</span>
                          </div>
                        </div>

                        {/* Slider (alavanca) de 1km a 3km */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-semibold font-sans text-xs">Raio do Entorno:</span>
                            <span className="text-xs font-bold text-indigo-600 font-mono">{radiusKm} km</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.5"
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                            <span>1.0 km</span>
                            <span>2.0 km</span>
                            <span>3.0 km</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Executive Insights */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-indigo-600 font-mono font-bold uppercase tracking-wider block">Análise IA de Arbitragem</span>
                          <p className="text-slate-700 leading-relaxed text-[11px] font-sans">
                            {(() => {
                              const portalAvg = portalResults.close?.avgPrice || resaleVal;
                              const pctDiff = portalAvg > 0 ? Math.round(((portalAvg - bidPrice) / portalAvg) * 100) : 0;
                              if (pctDiff > 15) {
                                return `🔥 Excelente oportunidade de arbitragem! O lance mínimo de aquisição (${formatBRL(bidPrice)}) está ${pctDiff}% abaixo da média de anúncios nos portais (${formatBRL(portalAvg)}). Ótima margem de segurança.`;
                              } else if (pctDiff > 0) {
                                return `🟡 Margem de arbitragem moderada. O lance de aquisição está ${pctDiff}% abaixo da média dos portais.`;
                              } else {
                                return `▲ Atenção: O preço de aquisição está superior ou muito próximo da expectativa anunciada de mercado (${formatBRL(portalAvg)}).`;
                              }
                            })()}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-gray-150 flex justify-between items-center text-[10px] font-mono text-gray-400">
                          <span>Estado: {property.state}</span>
                          <span>Bairro: {property.neighborhood}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-xs">
                  <TrendingUp className="w-8 h-8 text-violet-500 mx-auto" />
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-800">Aguardando Comparação de Portais...</p>
                  <p className="text-xs text-slate-400">Clique em "Comparador Portais" no menu acima para iniciar a varredura inteligente de mercado.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
