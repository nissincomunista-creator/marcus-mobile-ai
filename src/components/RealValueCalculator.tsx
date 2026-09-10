import React, { useState, useEffect, useMemo, useRef } from 'react';
import { auditRegistryText } from '../utils/registryAudit.ts';
import { 
  Calculator, 
  Search, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  Percent, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  BookOpen, 
  Scale, 
  Info,
  ChevronRight,
  ShieldCheck,
  Building,
  Building2,
  ExternalLink,
  Globe,
  Database,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Target,
  Layers,
  Activity,
  CheckCircle2,
  Compass,
  FileDown,
  Printer,
  ArrowUpRight,
  Coins,
  Flame,
  Bookmark,
  Award,
  Upload,
  FileUp,
  Paperclip,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExecutiveReportModal, { ExecutiveReportData } from './ExecutiveReportModal.tsx';
import { ItbiTransaction, SavedMarketAnalysis, PropertyType, MatriculaAnalysisReport, MatriculaGravame, MatriculaAuditData, EditalAuditData } from '../types.ts';
import { computeBidirectionalBenchmarks, BidirectionalBenchmarkResult } from '../utils/bidirectionalBenchmark.ts';

interface ItbiStats {
  state: string;
  city: string;
  neighborhood: string;
  propertyType: string;
  averageValueSqm: number;
  medianValueSqm?: number;
  minValueSqm: number;
  maxValueSqm: number;
  transactionCount: number;
  averageTotalValue: number;
}

export interface PortalScrapeResult {
  source: 'zap' | 'quintoandar' | 'olx';
  title: string;
  price: number;
  sqm: number;
  pricePerSqm: number;
  url: string;
  addressSnippet?: string;
  neighborhood?: string;
}

export interface PrefilledCalculatorData {
  id?: string;
  title?: string;
  description?: string;
  auctionLink?: string;
  matriculaText?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  propertyType?: string;
  sizeSqm?: number;
  bedrooms?: number;
  parkingSpaces?: number;
  purchasePrice?: number;
  acquisitionRule?: 'leilao' | 'caixa';
  estimatedRepair?: number;
  pendingDebts?: number;
  otherCosts?: number;
  itbiUnitValueAvg?: number;
  evaluationPrice?: number;
  estimatedValue?: number;
  portalZapAvg?: number;
  portalQuintoAndarAvg?: number;
  vendaBaixaPrice?: number;
  vendaMediaPrice?: number;
  valuationConfidence?: 'verified' | 'projected' | 'unavailable';
  valuationBasis?: string;
  valuationSampleCount?: number;
  valuationRadiusKm?: number;
  portalDataVerifiedAt?: string;
  portalSampleCount?: number;
  portalDataSource?: string;
  streetPortalAvgSqm?: number;
  isCommunityRisk?: boolean;
  communityName?: string;
  communityDistanceM?: number;
  ageDepreciationPct?: number;
  buildingAge?: number;
}

function normalizeString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cleanNeighborhood(neigh: string | null | undefined): string {
  if (!neigh) return '';
  return normalizeString(neigh).replace(/[^a-z0-9]/g, '').trim();
}

function extractCoreStreetTokens(str: string | null | undefined): string[] {
  if (!str) return [];
  // Remove all parenthetical content like (antiga rua ...)
  let s = str.replace(/\([^)]*\)/g, ' ');
  // Normalize accents and lower
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Remove punctuation
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  const stopWords = new Set([
    'rua', 'r', 'avenida', 'av', 'avn', 'estrada', 'estr', 'etr', 'travessa', 'trav', 'trv',
    'praca', 'pra', 'prc', 'alameda', 'al', 'alm', 'largo', 'lgo', 'rodovia', 'rod',
    'dr', 'dra', 'doutor', 'doutora', 'prof', 'profa', 'professor', 'professora',
    'des', 'desembargador', 'cel', 'coronel', 'gen', 'general', 'alm', 'almirante',
    'eng', 'engenheiro', 'maj', 'major', 'sgt', 'sargento', 'cap', 'capitao',
    'sta', 'santa', 'sto', 'santo', 'sao', 'pres', 'presidente', 'gov', 'governador',
    'sen', 'senador', 'dep', 'deputado', 'visc', 'visconde', 'brg', 'brigadeiro',
    'bar', 'barao', 'mal', 'marechal', 'jorn', 'jornalista', 'ver', 'vereador',
    'de', 'da', 'do', 'das', 'dos', 'e'
  ]);
  return s.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
}

function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  if (len1 < 3 || len2 < 3) {
    let matches = 0;
    const minLen = Math.min(len1, len2);
    for (let i = 0; i < minLen; i++) {
      if (s1[i] === s2[i]) matches++;
    }
    return matches / Math.max(len1, len2);
  }

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < len1 - 1; i++) {
    const bg = s1.slice(i, i + 2);
    bigrams1.set(bg, (bigrams1.get(bg) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < len2 - 1; i++) {
    const bg = s2.slice(i, i + 2);
    const count = bigrams1.get(bg) || 0;
    if (count > 0) {
      bigrams1.set(bg, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (len1 - 1 + len2 - 1);
}

function phoneticStreet(street: string | null | undefined): string {
  if (!street) return '';
  let s = normalizeString(street);
  s = s.split(',')[0].split('-')[0].replace(/\s+\d+.*$/, '').trim();
  s = s.replace(/^(rua|r|avenida|avn|av|estrada|etr|estr|est|travessa|trv|tra|trav|praca|pra|prc|beco|bec|bc|rodovia|rod|alameda|alm|al|largo|lrg|lgo|caminho|cam|servidao|srv|ladeira|lad|boulevard|blv|vila|vil)\b\.?\s*/i, '');
  s = s.replace(/^(engenheiro|eng|doutor|dr|dra|professor|prof|profa|general|gen|gal|coronel|cel|major|maj|capitao|cap|tenente|ten|almirante|alm|brigadeiro|brg|governador|gov|senador|sen|deputado|dep|padre|pe|pastor|bispo|dom|dona|d|sao|santa|sto|sta)\b\.?\s*/gi, '');
  s = s.replace(/ph/g, 'f').replace(/th/g, 't').replace(/y/g, 'i').replace(/w/g, 'v').replace(/z/g, 's').replace(/ck/g, 'k').replace(/ç/g, 's');
  s = s.replace(/([a-z])\1+/g, (m, c) => c);
  s = s.replace(/[^a-z0-9]/g, '');
  return s;
}

function findBestStreetMatch(target: string | null | undefined, candidateList: any[]): any | null {
  if (!target || !candidateList || candidateList.length === 0) return null;
  const targetPhon = phoneticStreet(target);
  
  // 1. Direct phonetic exact match
  if (targetPhon) {
    for (const cand of candidateList) {
      const candStreet = typeof cand === 'string' ? cand : (cand?.street || '');
      if (phoneticStreet(candStreet) === targetPhon) {
        return cand;
      }
    }
  }

  const targetTokens = extractCoreStreetTokens(target);
  if (targetTokens.length === 0) return null;

  const targetNorm = normalizeString(target).replace(/^(rua|r|avenida|av|estrada|est|travessa|trav|praca|alameda)\b\.?\s*/i, '').trim();

  let bestMatch: any = null;
  let bestScore = 0;

  for (const cand of candidateList) {
    const candStreet = typeof cand === 'string' ? cand : (cand?.street || '');
    const candTokens = extractCoreStreetTokens(candStreet);
    if (candTokens.length === 0) continue;

    const candNorm = normalizeString(candStreet).replace(/^(rua|r|avenida|av|estrada|est|travessa|trav|praca|alameda)\b\.?\s*/i, '').trim();

    // 1. Overall string similarity
    const fullSim = stringSimilarity(targetNorm, candNorm);

    // 2. Token overlap & fuzzy token similarity
    let matchCount = 0;
    for (const t of targetTokens) {
      if (candTokens.includes(t)) {
        matchCount += 1.0;
      } else {
        let maxTokSim = 0;
        for (const c of candTokens) {
          if (c.startsWith(t) || t.startsWith(c)) {
            maxTokSim = Math.max(maxTokSim, 0.85);
          } else {
            const sim = stringSimilarity(t, c);
            if (sim > maxTokSim) maxTokSim = sim;
          }
        }
        if (maxTokSim >= 0.65) {
          matchCount += maxTokSim;
        }
      }
    }

    const tokenScore = matchCount / Math.max(targetTokens.length, candTokens.length);
    const combinedScore = Math.max(fullSim, tokenScore * 0.9);

    // Require high confidence threshold (0.68) so that unrelated streets are never mistakenly matched
    if (combinedScore > bestScore && combinedScore >= 0.68) {
      bestScore = combinedScore;
      bestMatch = cand;
    }
  }

  return bestMatch;
}

function parseAddressComponents(rawAddress: string | null | undefined): {
  street: string;
  number: string;
  complement: string;
} {
  if (!rawAddress) return { street: '', number: '', complement: '' };
  let str = rawAddress.trim();
  
  // 1. Remove parenthetical notes like (Antiga Rua ...), (Lote ...), (Pavuna - RJ), etc.
  str = str.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

  // 2. Extract number strictly
  let num = '';
  let street = str;
  let complement = '';

  // Look for ', N. 123', ', Nº 123', ', 123', ', 425D', ', S/N'
  const matchWithComma = str.match(/^(.*?),\s*(?:n[º°.]?|numero)?\s*(\d+[a-zA-Z]?|s\/?n)\b\s*(?:,\s*(.*))?$/i);
  if (matchWithComma) {
    street = matchWithComma[1].trim();
    num = matchWithComma[2].trim().toUpperCase();
    complement = (matchWithComma[3] || '').trim();
  } else {
    // Look for ' N. 123' without comma
    const matchWithoutComma = str.match(/^(.*?)\s+(?:n[º°.]?|numero)\s*(\d+[a-zA-Z]?|s\/?n)\b\s*(?:,\s*(.*))?$/i);
    if (matchWithoutComma) {
      street = matchWithoutComma[1].trim();
      num = matchWithoutComma[2].trim().toUpperCase();
      complement = (matchWithoutComma[3] || '').trim();
    } else {
      // Split by comma: if second element is just a number
      const parts = str.split(',').map(p => p.trim());
      if (parts.length > 1) {
        const numOnlyMatch = parts[1].match(/^(\d+[a-zA-Z]?|s\/?n)$/i);
        if (numOnlyMatch) {
          street = parts[0];
          num = numOnlyMatch[1].toUpperCase();
          complement = parts.slice(2).join(', ');
        }
      }
    }
  }

  // Clean trailing punctuation, ', N.' or apto from street if any leaked
  street = street.replace(/,\s*(?:n[º°.]?|numero)?\s*$/i, '').replace(/,\s*$/, '').trim();

  return { street, number: num, complement };
}

function cleanStreetName(street: string | null | undefined): string {
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
}

function getCoreStreetName(street: string | null | undefined): string {
  if (!street) return '';
  let norm = normalizeString(street);
  norm = norm.replace(/\s+/g, ' ');
  
  const prefixRegex = /^(rua|r|avenida|avn|av|estrada|etr|estr|travessa|trv|tra|trav|praca|pra|prc|beco|bec|bc|rodovia|rod|alameda|alm|al|largo|lrg|lgo|caminho|cam|servidao|srv|ladeira|lad|boulevard|blv|vila|vil)\b\.?\s*/i;
  return norm.replace(prefixRegex, '').trim();
}

interface RealValueCalculatorProps {
  itbiStats?: ItbiStats[];
  prefillData?: PrefilledCalculatorData | null;
  onUpdateProperty?: (updates: Partial<any>) => Promise<void> | void;
  onClose?: () => void;
}

function hasValidDistance(tx: ItbiTransaction): boolean {
  const distanceKm = Number(tx.distanceKm);
  return Number.isFinite(distanceKm) && distanceKm >= 0;
}

export default function RealValueCalculator({ itbiStats = [], prefillData, onUpdateProperty, onClose }: RealValueCalculatorProps) {
  // Navigation mode for results display
  const [activeTab, setActiveTab] = useState<'local' | 'online' | 'matricula'>('local');

  const initialAddr = useMemo(() => parseAddressComponents(prefillData?.address), [prefillData?.address]);

  // Unified Form Inputs (Shared between local and online modes)
  const [selectedState, setSelectedState] = useState(prefillData?.state || 'RJ');
  const [selectedCity, setSelectedCity] = useState(prefillData?.city || 'Rio de Janeiro');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(prefillData?.neighborhood || '');
  const [selectedStreet, setSelectedStreet] = useState(initialAddr.street || '');
  const [streetNumber, setStreetNumber] = useState(
    initialAddr.number ? (initialAddr.complement ? `${initialAddr.number}, ${initialAddr.complement}` : initialAddr.number) : (initialAddr.complement || '')
  ); // Number & complement input
  const [propertyType, setPropertyType] = useState(prefillData?.propertyType || 'Apartamento');
  const [sizeSqm, setSizeSqm] = useState(prefillData?.sizeSqm || 80);
  const [bedrooms, setBedrooms] = useState(2);
  const [parkingSpaces, setParkingSpaces] = useState(1);
  const [customValue, setCustomValue] = useState<number | ''>('');

  // Matrícula & Due Diligence States
  // Matrícula & Due Diligence States
  const [matriculaNumber, setMatriculaNumber] = useState<string>('');
  const [registryOffice, setRegistryOffice] = useState<string>('');
  const [matriculaText, setMatriculaText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isAuditingMatricula, setIsAuditingMatricula] = useState<boolean>(false);
  const [matriculaAuditResult, setMatriculaAuditResult] = useState<MatriculaAuditData | null>(null);

  // Edital do Leilão States
  const [editalText, setEditalText] = useState<string>('');
  const [editalFileName, setEditalFileName] = useState<string>('');
  const [leiloeiroInput, setLeiloeiroInput] = useState<string>('');
  const [processNumberInput, setProcessNumberInput] = useState<string>('');
  const [isAuditingEdital, setIsAuditingEdital] = useState<boolean>(false);
  const [editalAuditResult, setEditalAuditResult] = useState<EditalAuditData | null>(null);

  // Unified report and notification
  const [matriculaReport, setMatriculaReport] = useState<MatriculaAnalysisReport | null>(null);
  const [dueDiligenceNotice, setDueDiligenceNotice] = useState<string>('');

  // Portal comparator search states
  const [isSearchingPortals, setIsSearchingPortals] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [portalResults, setPortalResults] = useState<any | null>(null);

  // Proximity radius (Strict 500m / 0.5km circular radius) and collapsible panel states
  const [radiusKm, setRadiusKm] = useState<number>(0.5);
  const [isLaudoMinimized, setIsLaudoMinimized] = useState<boolean>(false);
  const [isOnlineLaudoMinimized, setIsOnlineLaudoMinimized] = useState<boolean>(false);

  // Simulator purchase and resell prices
  const [customPurchasePrice, setCustomPurchasePrice] = useState<number | ''>('');
  const [customSalePrice, setCustomSalePrice] = useState<number | ''>('');

  // Autocomplete suggestions search states
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [showNeighborhoodDropdown, setShowNeighborhoodDropdown] = useState(false);
  const [streetInput, setStreetInput] = useState('');
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);

  // Online search states
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState('');
  const [onlineResults, setOnlineResults] = useState<{
    confidence: 'high' | 'medium' | 'low';
    foundMatches: Array<{
      address: string;
      date: string;
      value: number;
      area?: number | null;
      sqmPrice?: number | null;
      source?: string;
      sourceUrl?: string;
      description?: string;
    }>;
    valuationSummary: string;
    detailedReport: string;
  } | null>(null);

  // Sample and Area Size Filter Mode (Similar ±33% vs All)
  const [manualBuildingYear, setManualBuildingYear] = useState<number | null>(null);
  const [txSizeFilter, setTxSizeFilter] = useState<'similar' | 'all'>('similar');

  // Acquisition Mode & Costs State (Leilão Judicial vs Leilão Extrajudicial vs Venda Direta Caixa)
  const [acquisitionMode, setAcquisitionMode] = useState<'judicial' | 'extrajudicial' | 'caixa'>('judicial');
  const [paymentMethod, setPaymentMethod] = useState<'a_vista' | 'financiado'>('a_vista');
  const [arrematePrice, setArrematePrice] = useState<number>(0);
  const [arremateInputStr, setArremateInputStr] = useState<string>('');
  const [auctioneerFeeInput, setAuctioneerFeeInput] = useState<number | null>(null);
  const [itbiFeeInput, setItbiFeeInput] = useState<number | null>(null);
  const [registryFeeInput, setRegistryFeeInput] = useState<number | null>(null);
  const [iptuDebtInput, setIptuDebtInput] = useState<number>(0);
  const [condoDebtInput, setCondoDebtInput] = useState<number>(0);
  const [reformCostInput, setReformCostInput] = useState<number>(0);
  const [legalCostInput, setLegalCostInput] = useState<number>(0);
  const [monthlyCondoInput, setMonthlyCondoInput] = useState<number>(0);
  const [monthlyIptuInput, setMonthlyIptuInput] = useState<number>(0);
  const [monthlyExtraInput, setMonthlyExtraInput] = useState<number>(0);
  const [monthlyFinancingInput, setMonthlyFinancingInput] = useState<number>(0);
  const [annualInterestRateInput, setAnnualInterestRateInput] = useState<number>(0);
  const [rentalIrDeductionPct, setRentalIrDeductionPct] = useState<number>(15);
  const [customExitPrice, setCustomExitPrice] = useState<number | null>(null);
  const [isExecutingFullAnalysis, setIsExecutingFullAnalysis] = useState<boolean>(false);
  const [hoveredScenario, setHoveredScenario] = useState<number | null>(null);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState<boolean>(false);

  // Extract unique neighborhoods for selected state and city
  const neighborhoodsList = useMemo(() => {
    const list = itbiStats
      .filter(stat => 
        (stat.state || 'SP').toUpperCase() === selectedState.toUpperCase() &&
        (stat.city || 'São Paulo').toLowerCase() === selectedCity.toLowerCase()
      )
      .map(stat => stat.neighborhood);
    return Array.from(new Set(list)).sort();
  }, [itbiStats, selectedState, selectedCity]);

  const prefillInitializedRef = useRef<boolean>(false);
  const hasAutoExecutedAnalysisRef = useRef<boolean>(false);

  // Sync prefillData when provided from external property cards (Run ONCE on initialization)
  useEffect(() => {
    if (!prefillData || prefillInitializedRef.current) return;
    prefillInitializedRef.current = true;

    if (prefillData.state) setSelectedState(prefillData.state);
    if (prefillData.city) setSelectedCity(prefillData.city);
    if (prefillData.neighborhood) {
      let targetNeigh = prefillData.neighborhood;
      if (neighborhoodsList && neighborhoodsList.length > 0) {
        const match = neighborhoodsList.find(n => normalizeString(n) === normalizeString(targetNeigh)) ||
                      neighborhoodsList.find(n => cleanNeighborhood(n) === cleanNeighborhood(targetNeigh));
        if (match) targetNeigh = match;
      }
      setSelectedNeighborhood(targetNeigh);
      setNeighborhoodInput(targetNeigh);
    }
    if (prefillData.address) {
      const parsed = parseAddressComponents(prefillData.address);
      const cleanSt = parsed.street;
      setSelectedStreet(cleanSt);
      setStreetInput(cleanSt);
      // Feed ONLY the numeric street number
      setStreetNumber(parsed.number || '');
    }
    if (prefillData.propertyType) setPropertyType(prefillData.propertyType);
    if (prefillData.sizeSqm) setSizeSqm(prefillData.sizeSqm);
    if (prefillData.bedrooms !== undefined && prefillData.bedrooms > 0) setBedrooms(prefillData.bedrooms);
    if (prefillData.parkingSpaces !== undefined) setParkingSpaces(prefillData.parkingSpaces);
    if (prefillData.purchasePrice) {
      setArrematePrice(prefillData.purchasePrice);
      setArremateInputStr(prefillData.purchasePrice.toLocaleString('pt-BR'));
    }
    // Acquisition mode: Caixa properties default to 'caixa' (Venda Direta / Leilão Caixa)
    const isCaixa = prefillData.acquisitionRule === 'caixa' || 
                    prefillData.auctionLink?.includes('caixa.gov.br') || 
                    (prefillData.id && prefillData.id.includes('caixa'));
    if (isCaixa) {
      setAcquisitionMode('caixa');
    } else if (prefillData.acquisitionRule) {
      setAcquisitionMode(prefillData.acquisitionRule === 'caixa' ? 'caixa' : 'judicial');
    }

    // Custas de Desocupação / Judiciais: Para imóveis Caixa SEMPRE R$ 6.000 (padrão honorários e imissão de posse)
    if (isCaixa) {
      setLegalCostInput(6000);
    } else if (prefillData.otherCosts) {
      setLegalCostInput(prefillData.otherCosts);
    } else {
      setLegalCostInput(0);
    }

    // Reforma: SEMPRE 5% do valor do arremate, calculado internamente
    const purchaseVal = prefillData.purchasePrice || 0;
    setReformCostInput(Math.round(purchaseVal * 0.05));

    // Condomínio em Atraso: Regra expressa da Caixa: arrematante responde por até 10% do valor de avaliação
    const evalVal = prefillData.evaluationPrice || prefillData.estimatedValue || (purchaseVal * 1.5);
    const condoVal = isCaixa 
      ? (prefillData.pendingDebts !== undefined && prefillData.pendingDebts > 0 ? prefillData.pendingDebts : Math.round(evalVal * 0.10))
      : (prefillData.pendingDebts || 0);
    setCondoDebtInput(condoVal);

    // Matrícula: ONLY if actually present in description/title, never invent dummy text!
    const descToScan = (prefillData.description || '') + ' ' + (prefillData.title || '');
    const mMatch = descToScan.match(/matr[ií]cula\s*(?:n[ºo°]?\s*)?([0-9\.\-\/]+)/i) ||
                   descToScan.match(/rgi\s*(?:n[ºo°]?\s*)?([0-9\.\-\/]+)/i);
    if (mMatch && mMatch[1]) {
      setMatriculaNumber(`Matrícula nº ${mMatch[1]}`);
    } else {
      setMatriculaNumber('');
    }
    setRegistryOffice(`Ofício de Registro de Imóveis de ${prefillData.city || 'Capital'}/${prefillData.state || 'UF'}`);
    setMatriculaText('');
    setUploadedFileName('');
    setMatriculaAuditResult(null);
    setMatriculaReport(null);
    setDueDiligenceNotice('');
    setEditalAuditResult(null);

    // Edital: if property description exists, place real description in editalText
    if (prefillData.description) {
      setEditalText(prefillData.description);
      setLeiloeiroInput('Caixa Econômica Federal');
    } else {
      setEditalText('');
    }

    // Auto-análise 100% imediata da Matrícula e Edital ao abrir o simulador
    const initialCorpus = `${prefillData.matriculaText || ''}\n${prefillData.description || ''}\n${prefillData.title || ''}\n${prefillData.address || ''}`.trim();
    if (initialCorpus) {
      executeRealEditalAnalysis(initialCorpus, `Edital_${prefillData.id || 'Imovel'}.pdf`);
      const containsRegistryEvidence = /(?:matr[ií]cula|livro\s*2|registro\s+de\s+im[oó]veis|certid[aã]o|\b(?:R|AV)[-.\s]?\d+)/i.test(initialCorpus);
      if (containsRegistryEvidence) {
        setMatriculaText(prefillData.matriculaText || prefillData.description || '');
        executeRealMatriculaAnalysis(initialCorpus, `Matricula_${prefillData.id || 'Imovel'}.pdf`);
      } else {
        setDueDiligenceNotice('Matrícula não fornecida: não é possível certificar ausência de ônus, gravames ou penhoras apenas pelo anúncio.');
      }
    }

    // Auto-fetch authentic Caixa Matrícula & Edital PDF if Caixa property
    let timerId: any = null;
    if (prefillData.auctionLink && !prefillData.matriculaText) {
      timerId = setTimeout(() => {
        handleFetchCaixaDocs();
      }, 800);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [prefillData?.id]);

  // Unified report generator combining real Matrícula and Edital audit data
  const buildUnifiedReport = (mat: MatriculaAuditData | null, edit: EditalAuditData | null): MatriculaAnalysisReport | null => {
    if (!mat && !edit) return null;

    const activeMatNumber = mat ? mat.matriculaNumber : (matriculaNumber.trim() || 'Matrícula não informada');
    const activeRegistry = mat ? mat.registryOffice : (registryOffice.trim() || `Ofício de Registro de Imóveis de ${selectedCity || 'Capital'}/${selectedState || 'UF'}`);
    const gravames = mat ? mat.gravames : [];
    const overallStatus: 'REGULAR' | 'ATENCAO' | 'ALTO_RISCO' = mat ? mat.overallStatus : (edit ? 'ATENCAO' : 'REGULAR');

    const parecer = mat
      ? `Leitura documental de ${mat.matriculaNumber}: ${mat.gravames.length} referências a ônus ou direitos identificadas. Confira os registros, as averbações posteriores e as condições específicas do edital antes da aquisição. A análise automática não confirma baixa de gravames nem regularidade da cadeia dominial.`
      : 'Edital disponível; matrícula ainda não examinada. Situação registral pendente de confirmação.';

    return {
      matriculaNumber: activeMatNumber,
      registryOffice: activeRegistry,
      propertyTitle: `${propertyType} de ${sizeSqm}m², ${selectedStreet || 'Logradouro'}, ${selectedNeighborhood || 'Bairro'}`,
      ownerName: 'Executado / Devedor Registral',
      overallStatus,
      gravamesCount: gravames.length,
      gravames,
      pontosPositivos: mat ? mat.pontosApurados : (edit ? edit.debtRules : []),
      pontosDeAtencao: edit ? edit.criticalClauses : (mat ? mat.pontosApurados : []),
      parecerTecnico: parecer,
      matriculaData: mat || undefined,
      editalData: edit || undefined,
      analyzedAt: new Date().toISOString()
    };
  };

  // Real Matrícula Analyzer (Deterministic analysis on real document text + Caixa description + Edital)
  const executeRealMatriculaAnalysis = (rawText: string, fileName?: string) => {
    const text = rawText.trim();
    if (!text) {
      setDueDiligenceNotice('Matrícula ainda não disponível para leitura.');
      return;
    }
    const result = auditRegistryText(text);
    setMatriculaText(text);
    setMatriculaAuditResult(result);
    setMatriculaNumber(result.matriculaNumber);
    setRegistryOffice(result.registryOffice);
    setMatriculaReport(prev => buildUnifiedReport(result, prev?.editalData || editalAuditResult));
    setIsAuditingMatricula(false);
  };

  // Real Edital Analyzer (Deterministic analysis on real document text)
  const executeRealEditalAnalysis = (rawText: string, fileName?: string) => {
    const text = rawText.trim();
    if (!text && !leiloeiroInput.trim() && !processNumberInput.trim() && !fileName) {
      setDueDiligenceNotice('Nenhum arquivo ou texto de edital informado. Anexe o PDF ou cole o texto do edital.');
      setIsAuditingEdital(false);
      return;
    }

    const lower = (text + ' ' + (fileName || '')).toLowerCase();

    setDueDiligenceNotice('');
    setIsAuditingEdital(true);

    setTimeout(() => {
      try {
        let proc = processNumberInput.trim();
        if (!proc) {
          const procMatch = (text + ' ' + (fileName || '')).match(/processo\s*(?:n[ºo°]?\s*)?([0-9\.\-\/]+)/i);
          proc = procMatch && procMatch[1] ? `Processo nº ${procMatch[1]}` : (fileName ? `Edital: ${fileName.replace(/\.[^/.]+$/, '')}` : 'Processo Judicial Apurado');
        }

        let leil = leiloeiroInput.trim();
        if (!leil) {
          const leilMatch = text.match(/leiloeir[ao]\s*(?:oficial|p[úu]blic[ao])?\s*[:\-]?\s*([A-ZÀ-Ú\s]{3,35})/i);
          leil = leilMatch && leilMatch[1] ? leilMatch[1].trim() : 'Leiloeiro Oficial Designado';
        }

        const isCaixa = acquisitionMode === 'caixa' || lower.includes('caixa') || lower.includes('cpve');

        let court = isCaixa 
          ? 'Caixa Econômica Federal (CPVE/RE - Alienação Fiduciária)' 
          : `Vara Cível da Comarca de ${selectedCity || 'Capital'}`;
        const courtMatch = text.match(/(\d+[ªa]?\s+Vara\s+(?:C[íi]vel|do\s+Trabalho|Federal|de\s+Fam[íi]lia)[\w\s\-\.,]*)/i);
        if (courtMatch && courtMatch[1] && !isCaixa) {
          court = courtMatch[1].trim().substring(0, 45);
        }

        const debtRules: string[] = [];

        if (isCaixa) {
          debtRules.push('✓ Débitos de Condomínio (Regra Expressa Caixa): Responsabilidade do arrematante limitada a no máximo 10% do valor de avaliação. A CAIXA quita integralmente qualquer valor excedente.');
          debtRules.push('✓ Débitos Tributários (IPTU): A CAIXA realiza a quitação integral de tributos quando superiores a 10% da avaliação ou sub-rogados na data da venda.');
        } else {
          if (lower.includes('sub-roga') || lower.includes('130') || !lower.includes('arrematante arcar')) {
            debtRules.push('✓ Débitos de IPTU e taxas fiscais sub-rogam sobre o preço arrematado (art. 130, parágrafo único do CTN).');
          } else {
            debtRules.push('⚠️ Edital com cláusula especial de débitos: verificar se o arrematante assumirá impostos pendentes.');
          }

          if (lower.includes('condom')) {
            if (lower.includes('sub-roga') || lower.includes('preferência')) {
              debtRules.push('✓ Débitos de condomínio preferenciais quitados com o saldo arrecadado.');
            } else {
              debtRules.push('⚠️ Verificar débito condominial atualizado com o síndico/administradora.');
            }
          }
        }

        let occupationStatus = '✓ Imóvel presumido Desocupado / A constatar no local';
        if (lower.includes('ocupado') || lower.includes('posse de terceiro') || lower.includes('morador')) {
          occupationStatus = isCaixa
            ? '⚠️ Imóvel Ocupado: Desocupação por conta do adquirente via Lei nº 9.514/97 (liminar para desocupação em 60 dias).'
            : '⚠️ Imóvel Ocupado (Necessária expedição de Mandado de Imissão de Posse nos próprios autos).';
        } else if (lower.includes('desocupado') || lower.includes('livre de pessoas')) {
          occupationStatus = '✓ Imóvel Desocupado (Imissão imediata após emissão da Carta de Arrematação / Escritura).';
        }

        const criticalClauses: string[] = isCaixa ? [
          '✓ Regra Expressa Caixa: Condomínio limitado a 10% da avaliação do bem (alimentado automaticamente no simulador).',
          '✓ Amparo legal pela Lei 9.514/97 com consolidação da propriedade em favor da Caixa Econômica Federal.',
          '✓ ITBI e emolumentos de registro da escritura/contrato correm por conta do adquirente.'
        ] : [
          '✓ Comissão do Leiloeiro estipulada em 5% sobre o lance homologado.',
          lower.includes('parcela') || lower.includes('895') 
            ? '✓ Possibilidade de parcelamento judicial conforme art. 895 do CPC (25% de entrada + saldo em até 30 parcelas).'
            : '✓ Pagamento na forma estipulada pelo juízo (à vista ou prazo regimental).',
          '✓ Expedição de Carta de Arrematação com ordem expressa de cancelamento de constrições e imissão na posse.'
        ];

        const result: EditalAuditData = {
          leiloeiro: leil,
          processNumber: proc,
          court,
          auctionDates: '1ª Praça (Valor de Avaliação) • 2ª Praça (Lance Mínimo com Desconto)',
          debtRules,
          occupationStatus,
          criticalClauses,
          rawText: text,
          analyzedAt: new Date().toISOString()
        };

        setEditalAuditResult(result);
        setLeiloeiroInput(leil);
        setProcessNumberInput(proc);
        setMatriculaReport(prev => buildUnifiedReport(prev?.matriculaData || matriculaAuditResult, result));
      } catch (err) {
        console.error('Erro na auditoria do edital:', err);
      } finally {
        setIsAuditingEdital(false);
      }
    }, 200);
  };

  // PDF File Upload Handler for Matrícula using backend PDF extractor
  const handleMatriculaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(`${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
    setIsAuditingMatricula(true);
    setDueDiligenceNotice('');

    try {
      let extractedText = '';

      if (file.name.endsWith('.txt')) {
        extractedText = await file.text();
      } else {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const resp = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: base64, filename: file.name, type: 'matricula' })
        });

        if (resp.ok) {
          const json = await resp.json();
          extractedText = json.text || '';
        }
      }

      if (extractedText) {
        setMatriculaText(extractedText);
        executeRealMatriculaAnalysis(extractedText, file.name);
      } else {
        setDueDiligenceNotice('Aviso: O arquivo PDF anexado parece ser uma digitalização sem OCR de texto. Preencha o número ou digite as averbações para auditoria.');
        executeRealMatriculaAnalysis(matriculaText, file.name);
      }
    } catch (err) {
      console.error('Error parsing matricula file:', err);
      executeRealMatriculaAnalysis(matriculaText, file.name);
    } finally {
      setIsAuditingMatricula(false);
    }
  };

  // PDF File Upload Handler for Edital using backend PDF extractor
  const handleEditalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditalFileName(`${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
    setIsAuditingEdital(true);
    setDueDiligenceNotice('');

    try {
      let extractedText = '';

      if (file.name.endsWith('.txt')) {
        extractedText = await file.text();
      } else {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const resp = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: base64, filename: file.name, type: 'edital' })
        });

        if (resp.ok) {
          const json = await resp.json();
          extractedText = json.text || '';
        }
      }

      if (extractedText) {
        setEditalText(extractedText);
        executeRealEditalAnalysis(extractedText, file.name);
      } else {
        setDueDiligenceNotice('Aviso: O arquivo de edital anexado parece ser uma digitalização sem OCR. Cole as cláusulas principais no campo de texto.');
        executeRealEditalAnalysis(editalText, file.name);
      }
    } catch (err) {
      console.error('Error parsing edital file:', err);
      executeRealEditalAnalysis(editalText, file.name);
    } finally {
      setIsAuditingEdital(false);
    }
  };

  // Automated Caixa Document fetcher (Headless session extracts real PDF directly from Caixa servers)
  const [isFetchingCaixaDocs, setIsFetchingCaixaDocs] = useState<boolean>(false);

  const handleFetchCaixaDocs = async () => {
    if (!prefillData?.auctionLink && !prefillData?.id) {
      alert('Link ou identificador da Caixa não disponível para este lote.');
      return;
    }
    setIsFetchingCaixaDocs(true);
    setDueDiligenceNotice('Conectando aos servidores da Caixa para baixar a certidão de matrícula e edital oficial...');

    try {
      const isCaixa = prefillData.auctionLink?.includes('caixa.gov.br') || prefillData.id?.includes('caixa');
      const res = await fetch(isCaixa ? '/api/caixa/fetch-documentos' : '/api/auctions/fetch-documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionLink: prefillData.auctionLink,
          id: prefillData.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.matriculaNumber) setMatriculaNumber(data.matriculaNumber);
        if (data.registryOffice) setRegistryOffice(data.registryOffice);
        if (data.bedrooms) setBedrooms(data.bedrooms);
        if (data.parkingSpaces !== undefined) setParkingSpaces(data.parkingSpaces);

        if (data.matriculaText) {
          setMatriculaText(data.matriculaText);
          const fname = `Matricula_${data.matriculaNumber || 'Caixa'}.pdf`;
          setUploadedFileName(fname);
          setDueDiligenceNotice('✓ Matrícula oficial baixada diretamente da Caixa com sucesso!');
          executeRealMatriculaAnalysis(data.matriculaText, fname);
          if (prefillData.id && onUpdateProperty) await onUpdateProperty({ id: prefillData.id, matriculaText: data.matriculaText });
        } else {
          setDueDiligenceNotice('Aviso: A certidão em PDF não foi anexada pela Caixa na página deste imóvel. Caso possua o documento, anexe o arquivo ou cole as averbações.');
        }

        if (data.editalText) {
          setEditalText(data.editalText);
          if (data.editalNumber) setProcessNumberInput(`Edital nº ${data.editalNumber}`);
          if (data.leiloeiro) setLeiloeiroInput(data.leiloeiro);
          executeRealEditalAnalysis(data.editalText, `Edital_${data.editalNumber || 'Caixa'}.pdf`);
        }
      } else {
        const failure = await res.json().catch(() => ({}));
        setDueDiligenceNotice(failure.error || 'Não foi possível obter o documento automaticamente.');
      }
    } catch (e: any) {
      setDueDiligenceNotice('Erro de conexão ao buscar documentos da Caixa.');
    } finally {
      setIsFetchingCaixaDocs(false);
    }
  };

  // Helper to parse BRL formatted numbers (e.g. 150.000 -> 150000)
  const parseNumberBRL = (valStr: string): number => {
    const clean = valStr.replace(/\./g, '').replace(/,/g, '.');
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
  };

  // Sync arrematePrice back to string input when arrematePrice updates from defaults or other sources
  useEffect(() => {
    if (arrematePrice > 0) {
      const formatted = arrematePrice.toLocaleString('pt-BR');
      if (parseNumberBRL(arremateInputStr) !== arrematePrice) {
        setArremateInputStr(formatted);
      }
    } else {
      setArremateInputStr('');
    }
  }, [arrematePrice]);

  const handleArremateChange = (valStr: string) => {
    // Remove all non-digits
    const clean = valStr.replace(/[^\d]/g, '');
    if (clean === '') {
      setArremateInputStr('');
      setArrematePrice(0);
      return;
    }
    const num = parseInt(clean, 10);
    setArrematePrice(num);
    setArremateInputStr(num.toLocaleString('pt-BR'));
    setReformCostInput(Math.round(num * 0.05));
  };

  // Loaded data states
  const [streetsList, setStreetsList] = useState<any[]>([]);
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);
  const [rawTransactions, setRawTransactions] = useState<ItbiTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Search and filter inside raw transactions
  const [txSearch, setTxSearch] = useState('');

  // AI Appraisal report states (Local Mode)
  const [aiReport, setAiReport] = useState('');
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);

  // Sync neighborhood input text
  useEffect(() => {
    setNeighborhoodInput(selectedNeighborhood);
  }, [selectedNeighborhood]);

  // Sync street input text
  useEffect(() => {
    setStreetInput(selectedStreet);
  }, [selectedStreet]);

  // Load streets when neighborhood changes
  useEffect(() => {
    if (!selectedNeighborhood) {
      setStreetsList([]);
      setSelectedStreet('');
      return;
    }

    async function loadStreets() {
      setIsLoadingStreets(true);
      try {
        const res = await fetch(`/api/itbi/streets?state=${selectedState}&city=${selectedCity}&neighborhood=${encodeURIComponent(selectedNeighborhood)}`);
        if (res.ok) {
          const data = await res.json();
          setStreetsList(data);
          // Auto-match and select the closest official ITBI street from suggestion list
          let matched = null;
          const queryStreet = streetInput || (prefillData?.address ? parseAddressComponents(prefillData.address).street : '');
          if (queryStreet && Array.isArray(data) && data.length > 0) {
            matched = findBestStreetMatch(queryStreet, data);
            if (matched && matched.street) {
              setSelectedStreet(matched.street);
              setStreetInput(matched.street);
            }
          }

          // If no high-confidence street match in current neighborhood, check cross-neighborhood resolver
          if (!matched && queryStreet) {
            try {
              const checkRes = await fetch(`/api/itbi/resolve-street?state=${selectedState}&city=${encodeURIComponent(selectedCity)}&street=${encodeURIComponent(queryStreet)}`);
              if (checkRes.ok) {
                const resolved = await checkRes.json();
                if (resolved.found && resolved.neighborhood && cleanNeighborhood(resolved.neighborhood) !== cleanNeighborhood(selectedNeighborhood)) {
                  setSelectedNeighborhood(resolved.neighborhood);
                  setNeighborhoodInput(resolved.neighborhood);
                  if (resolved.officialStreet) {
                    setSelectedStreet(resolved.officialStreet);
                    setStreetInput(resolved.officialStreet);
                  }
                  return;
                }
              }
            } catch (err) {
              // ignore
            }
          }
        }
      } catch (e) {
        console.error('Error fetching streets:', e);
      } finally {
        setIsLoadingStreets(false);
      }
    }

    loadStreets();
  }, [selectedNeighborhood, selectedState, selectedCity]);

  // Load raw transactions when neighborhood/street changes (Local Mode)
  // Fetch all neighborhood transactions to allow client side segmentation and radius analysis
  useEffect(() => {
    if (!selectedNeighborhood) {
      setRawTransactions([]);
      return;
    }

    const controller = new AbortController();

    async function loadTransactions() {
      setIsLoadingTransactions(true);
      try {
        let url = `/api/itbi/transactions?state=${selectedState}&city=${selectedCity}&neighborhood=${encodeURIComponent(selectedNeighborhood)}`;
        if (propertyType) {
          url += `&propertyType=${encodeURIComponent(propertyType)}`;
        }
        if (selectedStreet) {
          // Hydrate the maximum supported radius once; changing the selector is
          // then an immediate client-side filter instead of another network crawl.
          url += `&targetStreet=${encodeURIComponent(selectedStreet)}&radiusKm=2.0`;
        }
        
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (!controller.signal.aborted) {
            setRawTransactions(Array.isArray(data) ? data : []);
          }
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error('Error fetching transactions:', e);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTransactions(false);
        }
      }
    }

    loadTransactions();
    setAiReport(''); // Reset AI report on filter change
    return () => controller.abort();
  }, [selectedNeighborhood, propertyType, selectedState, selectedCity, selectedStreet]);

  const exactStreetTxs = useMemo(() => {
    if (!selectedStreet || rawTransactions.length === 0) return [];
    const streetClean = cleanStreetName(selectedStreet);
    const streetCore = getCoreStreetName(selectedStreet);
    const streetPhon = phoneticStreet(selectedStreet);
    return rawTransactions.filter(tx => {
      if (!tx.street) return false;
      const tClean = cleanStreetName(tx.street);
      const tCore = getCoreStreetName(tx.street);
      const tPhon = phoneticStreet(tx.street);
      return tClean === streetClean || 
             (streetCore && tCore === streetCore) || 
             (streetPhon && tPhon === streetPhon) || 
             stringSimilarity(tClean, streetClean) >= 0.75;
    });
  }, [rawTransactions, selectedStreet]);

  // Segment raw transactions: Ruas ao Entorno com raio geodésico estrito de 500m (0.5km real)
  const nearbyStreetTxs = useMemo(() => {
    if (rawTransactions.length === 0) return [];
    if (!selectedStreet) return rawTransactions;
    const streetClean = cleanStreetName(selectedStreet);
    const streetCore = getCoreStreetName(selectedStreet);
    const streetPhon = phoneticStreet(selectedStreet);
    return rawTransactions.filter(tx => {
      if (!tx.street) return false;
      const tClean = cleanStreetName(tx.street);
      const tCore = getCoreStreetName(tx.street);
      const tPhon = phoneticStreet(tx.street);
      // Pula a mesma rua (pois já é contabilizada no Quadro 2: Mesma Rua)
      if (tClean === streetClean || 
          (streetCore && tCore === streetCore) || 
          (streetPhon && tPhon === streetPhon) || 
          stringSimilarity(tClean, streetClean) >= 0.75) return false;
      
      // Validação estrita por raio geográfico real (sem aproximações aleatórias por hash)
      if (hasValidDistance(tx)) {
        return Number(tx.distanceKm) <= radiusKm;
      }
      return false;
    });
  }, [rawTransactions, selectedStreet, radiusKm]);

// Helper to extract clean numerical numbers for street number comparison
  const cleanNumber = (numStr: string | undefined | null) => {
    if (!numStr) return '';
    const match = String(numStr).match(/\d+/);
    return match ? match[0] : String(numStr).trim();
  };

  // NBR 14.653 - Saneamento Estatístico de Amostras (Chauvenet / Desvio Padrão) & Metragem Ponderada
  const calculateRobustStats = (
    txs: ItbiTransaction[],
    targetSize: number,
    sizeMode: 'similar' | 'all',
    sourceLabel: string
  ) => {
    if (!txs || txs.length === 0) return null;

    // 1. Todas as áreas (Bruto Geral)
    const allValues = txs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v > 0);
    if (allValues.length === 0) return null;

    const rawSum = allValues.reduce((a, b) => a + b, 0);
    const rawAvgSqm = Math.round(rawSum / allValues.length);

    // 2. Filtro por Metragem Similar (±33% da área privativa do imóvel)
    const minSize = Math.max(15, Math.round(targetSize * 0.67));
    const maxSize = Math.round(targetSize * 1.33);
    const similarTxs = txs.filter(t => t.sizeSqm >= minSize && t.sizeSqm <= maxSize);
    const similarValues = similarTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v > 0);
    const similarAvgSqm = similarValues.length > 0 ? Math.round(similarValues.reduce((a, b) => a + b, 0) / similarValues.length) : rawAvgSqm;

    // Seleciona conjunto de trabalho com base no filtro do usuário (Similar vs Todas)
    const workingTxs = sizeMode === 'similar' ? similarTxs : txs;
    if (workingTxs.length === 0) return null;
    const workingValues = workingTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v > 0);

    // 3. Saneamento Pericial NBR 14.653 de Outliers (Chauvenet / Tukey IQR Ponderado)
    let cleanedValues = [...workingValues];
    let outliersCount = 0;

    if (workingValues.length >= 4) {
      // Ordenação para cálculo de quartis e amplitude interquartil (Tukey IQR)
      const sortedVals = [...workingValues].sort((a, b) => a - b);
      const q1 = sortedVals[Math.floor(sortedVals.length * 0.25)];
      const q3 = sortedVals[Math.floor(sortedVals.length * 0.75)];
      const iqr = q3 - q1;
      const median = sortedVals[Math.floor(sortedVals.length * 0.5)];

      // 1. Limites Tukey com tolerância mercadológica (1.75 * IQR) e pisos de razoabilidade urbana
      const lowBound = Math.max(600, q1 - 1.75 * iqr);
      const highBound = Math.max(q3 + 1.75 * iqr, 2500);

      const step1 = sortedVals.filter(v => v >= lowBound && v <= highBound);

      if (step1.length >= 3) {
        // 2. Critério de Chauvenet / 2.2 Desvios-Padrão (elimina apenas anomalias extremas, preservando a distribuição real)
        const mean = step1.reduce((a, b) => a + b, 0) / step1.length;
        const variance = step1.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / step1.length;
        const stdDev = Math.sqrt(variance);
        const chauvenetThreshold = Math.max(stdDev * 2.2, 500);

        const step2 = step1.filter(val => Math.abs(val - mean) <= chauvenetThreshold);
        if (step2.length >= 2) {
          outliersCount = workingValues.length - step2.length;
          cleanedValues = step2;
        } else {
          outliersCount = workingValues.length - step1.length;
          cleanedValues = step1;
        }
      }
    }

    const cleanedSum = cleanedValues.reduce((a, b) => a + b, 0);
    const finalAvgSqm = Math.round(cleanedSum / cleanedValues.length);

    // Mediana
    const sorted = [...cleanedValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianSqm = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);

    return {
      avgSqm: isNaN(finalAvgSqm) || !isFinite(finalAvgSqm) ? rawAvgSqm : finalAvgSqm,
      medianSqm,
      source: sourceLabel,
      count: cleanedValues.length,
      minSqm: Math.min(...cleanedValues),
      maxSqm: Math.max(...cleanedValues),
      
      rawAvgSqm,
      rawCount: allValues.length,
      outliersCount,
      
      similarAvgSqm,
      similarCount: similarValues.length,
      allAreasAvgSqm: rawAvgSqm,
      allAreasCount: allValues.length,
      
      isSimilarActive: sizeMode === 'similar' && similarValues.length > 0,
      minSimilarSize: minSize,
      maxSimilarSize: maxSize
    };
  };

  // Médias de m² para cada botão de raio (500m, 1.0km, 2.0km) sincronizadas com txSizeFilter (Área Similar vs Todas)
  const radiusAverages = useMemo(() => {
    const streetClean = cleanStreetName(selectedStreet);
    const streetCore = getCoreStreetName(selectedStreet);
    const streetPhon = phoneticStreet(selectedStreet);

    const calcAvg = (maxDist: number) => {
      const txs = (rawTransactions || []).filter(tx => {
        const tClean = cleanStreetName(tx.street);
        const tCore = getCoreStreetName(tx.street);
        const tPhon = phoneticStreet(tx.street);
        if (tClean === streetClean || (streetCore && tCore === streetCore) || (streetPhon && tPhon === streetPhon) || stringSimilarity(tClean, streetClean) >= 0.75) return false;
        if (hasValidDistance(tx)) {
          return Number(tx.distanceKm) <= maxDist;
        }
        return false;
      });
      if (txs.length === 0) return null;
      const robust = calculateRobustStats(txs, sizeSqm, txSizeFilter, `Raio ${maxDist}km`);
      return robust ? robust.avgSqm : null;
    };

    return {
      r500: calcAvg(0.5),
      r1000: calcAvg(1.0),
      r2000: calcAvg(2.0)
    };
  }, [rawTransactions, selectedStreet, sizeSqm, txSizeFilter]);

  // Motor Pericial de Corte Bidirecional em 4 Níveis (NBR 14.653):
  // 1. Média preliminar da rua antes de cortar.
  // 2. Balizamento com a média do raio (ruas do entorno).
  // 3. Aplicação do corte estrito: 25% acima corta, 25% abaixo corta.
  // 4. Processamento bidirecional (de frente pra trás e de trás pra frente).
  // 5. Convergência da Média de Corte Real para Flip Rápido e Gabarito.
  const bidiBenchmark = useMemo(() => {
    return computeBidirectionalBenchmarks(
      rawTransactions,
      selectedStreet,
      streetNumber,
      sizeSqm,
      txSizeFilter,
      radiusKm,
      propertyType
    );
  }, [rawTransactions, selectedStreet, streetNumber, sizeSqm, txSizeFilter, radiusKm, propertyType]);

  // 1. Dedicated neighborhood stats calculated from all ITBI transactions of this neighborhood
  const neighborhoodStats = useMemo(() => {
    if (bidiBenchmark) {
      return {
        avgSqm: bidiBenchmark.bairro.saneada,
        medianSqm: bidiBenchmark.bairro.saneada,
        source: `Média Geral do Bairro (${selectedNeighborhood})`,
        count: bidiBenchmark.bairro.validas,
        minSqm: Math.round(bidiBenchmark.bairro.saneada * 0.75),
        maxSqm: Math.round(bidiBenchmark.bairro.saneada * 1.25),
        rawAvgSqm: bidiBenchmark.bairro.prelim || bidiBenchmark.bairro.saneada,
        rawCount: bidiBenchmark.bairro.total,
        outliersCount: bidiBenchmark.bairro.expurgadas,
        similarAvgSqm: bidiBenchmark.bairro.saneada,
        similarCount: bidiBenchmark.bairro.validas,
        allAreasAvgSqm: bidiBenchmark.bairro.saneada,
        allAreasCount: bidiBenchmark.bairro.total,
        isSimilarActive: txSizeFilter === 'similar',
        minSimilarSize: bidiBenchmark.minSimilarSize,
        maxSimilarSize: bidiBenchmark.maxSimilarSize
      };
    }
    if (rawTransactions && rawTransactions.length > 0) {
      const stats = calculateRobustStats(rawTransactions, sizeSqm, txSizeFilter, `Média Geral do Bairro (${selectedNeighborhood})`);
      if (stats) return stats;
    }
    const neighStats = itbiStats.find(stat => 
      stat.neighborhood && selectedNeighborhood &&
      cleanNeighborhood(stat.neighborhood) === cleanNeighborhood(selectedNeighborhood) &&
      (!propertyType || !stat.propertyType || stat.propertyType.toLowerCase() === propertyType.toLowerCase())
    ) || itbiStats.find(stat => 
      stat.neighborhood && selectedNeighborhood &&
      cleanNeighborhood(stat.neighborhood) === cleanNeighborhood(selectedNeighborhood)
    );

    if (neighStats && neighStats.averageValueSqm) {
      const base = neighStats.averageValueSqm;
      return {
        avgSqm: base,
        medianSqm: neighStats.medianValueSqm || base,
        source: `Média Oficial do Bairro (${selectedNeighborhood})`,
        count: neighStats.transactionCount || 0,
        minSqm: neighStats.minValueSqm || Math.round(base * 0.7),
        maxSqm: neighStats.maxValueSqm || Math.round(base * 1.4),
        rawAvgSqm: base,
        rawCount: neighStats.transactionCount || 0,
        outliersCount: 0,
        similarAvgSqm: base,
        similarCount: neighStats.transactionCount || 0,
        allAreasAvgSqm: base,
        allAreasCount: neighStats.transactionCount || 0,
        isSimilarActive: false,
        minSimilarSize: Math.round(sizeSqm * 0.67),
        maxSimilarSize: Math.round(sizeSqm * 1.33)
      };
    }
    return null;
  }, [bidiBenchmark, rawTransactions, sizeSqm, txSizeFilter, selectedNeighborhood, itbiStats, propertyType]);

  // 2. Aggregate stats from verified surrounding transactions inside the selected radius
  const nearbyStats = useMemo(() => {
    // The radius control must always use the strict geodesic subset first.
    // The bidirectional benchmark is intentionally broader for valuation
    // calibration, but must not make the 500m/1km/2km UI appear unchanged.
    if (selectedStreet && nearbyStreetTxs.length > 0) {
      const strictRadiusStats = calculateRobustStats(
        nearbyStreetTxs,
        sizeSqm,
        txSizeFilter,
        `Média do Entorno (Raio Geodésico de ${radiusKm.toFixed(1)}km)`
      );
      if (strictRadiusStats) return strictRadiusStats;
    }

    if (!selectedStreet && bidiBenchmark && bidiBenchmark.raio.total > 0) {
      return {
        avgSqm: bidiBenchmark.raio.saneada,
        medianSqm: bidiBenchmark.raio.saneada,
        source: 'Média do Entorno (Raio Balizado)',
        count: bidiBenchmark.raio.validas,
        minSqm: bidiBenchmark.raio.corteMin || Math.round(bidiBenchmark.raio.saneada * 0.75),
        maxSqm: bidiBenchmark.raio.corteMax || Math.round(bidiBenchmark.raio.saneada * 1.25),
        rawAvgSqm: bidiBenchmark.raio.prelim || bidiBenchmark.raio.saneada,
        rawCount: bidiBenchmark.raio.total,
        outliersCount: bidiBenchmark.raio.expurgadas,
        similarAvgSqm: bidiBenchmark.raio.saneada,
        similarCount: bidiBenchmark.raio.validas,
        allAreasAvgSqm: bidiBenchmark.raio.saneada,
        allAreasCount: bidiBenchmark.raio.total,
        isSimilarActive: txSizeFilter === 'similar',
        minSimilarSize: bidiBenchmark.minSimilarSize,
        maxSimilarSize: bidiBenchmark.maxSimilarSize
      };
    }

    const txsToUse = selectedStreet ? nearbyStreetTxs : rawTransactions;

    if (txsToUse.length === 0) {
      const neighStats = itbiStats.find(stat => 
        stat.neighborhood && selectedNeighborhood &&
        cleanNeighborhood(stat.neighborhood) === cleanNeighborhood(selectedNeighborhood) &&
        stat.propertyType && propertyType &&
        stat.propertyType.toLowerCase() === propertyType.toLowerCase()
      ) || itbiStats.find(stat => 
        stat.neighborhood && selectedNeighborhood &&
        cleanNeighborhood(stat.neighborhood) === cleanNeighborhood(selectedNeighborhood)
      );
      
      const allVals = itbiStats.map(s => s.averageValueSqm).filter(Boolean);
      const overallAvg = allVals.length > 0 
        ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length) 
        : 4000;
      
      const baseAvg = neighStats?.averageValueSqm || (neighborhoodStats?.avgSqm || overallAvg);

      return {
        avgSqm: baseAvg,
        medianSqm: baseAvg,
        source: neighStats?.averageValueSqm ? 'Média do Bairro (Sem dados no raio)' : 'Média Regional',
        count: 0,
        minSqm: neighStats?.minValueSqm || Math.round(baseAvg * 0.7),
        maxSqm: neighStats?.maxValueSqm || Math.round(baseAvg * 1.5),
        rawAvgSqm: baseAvg,
        rawCount: 0,
        outliersCount: 0,
        similarAvgSqm: baseAvg,
        similarCount: 0,
        allAreasAvgSqm: baseAvg,
        allAreasCount: 0,
        isSimilarActive: false,
        minSimilarSize: Math.round(sizeSqm * 0.67),
        maxSimilarSize: Math.round(sizeSqm * 1.33)
      };
    }
    
    const computed = calculateRobustStats(
      txsToUse,
      sizeSqm,
      txSizeFilter,
      selectedStreet ? `Média do Entorno (Raio Geodésico de ${radiusKm.toFixed(1)}km)` : 'Média do Entorno (Bairro)'
    );
    if (computed) return computed;

    const allVals = itbiStats.map(s => s.averageValueSqm).filter(Boolean);
    const defaultFallback = allVals.length > 0 ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length) : 6500;
    return {
      avgSqm: defaultFallback,
      medianSqm: defaultFallback,
      source: 'Média do Entorno (Bairro)',
      count: txsToUse.length,
      minSqm: Math.round(defaultFallback * 0.7),
      maxSqm: Math.round(defaultFallback * 1.4),
      rawAvgSqm: defaultFallback,
      rawCount: txsToUse.length,
      outliersCount: 0,
      similarAvgSqm: defaultFallback,
      similarCount: 0,
      allAreasAvgSqm: defaultFallback,
      allAreasCount: txsToUse.length,
      isSimilarActive: false,
      minSimilarSize: Math.round(sizeSqm * 0.75),
      maxSimilarSize: Math.round(sizeSqm * 1.25)
    };
  }, [bidiBenchmark, nearbyStreetTxs, rawTransactions, selectedStreet, selectedNeighborhood, propertyType, itbiStats, sizeSqm, txSizeFilter, neighborhoodStats, radiusKm]);

  // 3. Aggregate stats from matching transactions (Exact Street Stats) with Raio ±25% Outlier Defense
  const exactStreetStats = useMemo(() => {
    if (bidiBenchmark && bidiBenchmark.rua.validas > 0) {
      return {
        avgSqm: bidiBenchmark.rua.saneada,
        medianSqm: bidiBenchmark.rua.saneada,
        source: 'Média da Mesma Rua (Balizada no Raio)',
        count: bidiBenchmark.rua.validas,
        minSqm: bidiBenchmark.rua.corteMin || Math.round(bidiBenchmark.rua.saneada * 0.75),
        maxSqm: bidiBenchmark.rua.corteMax || Math.round(bidiBenchmark.rua.saneada * 1.25),
        rawAvgSqm: bidiBenchmark.rua.prelim || bidiBenchmark.rua.saneada,
        rawCount: bidiBenchmark.rua.total,
        outliersCount: bidiBenchmark.rua.expurgadas,
        similarAvgSqm: bidiBenchmark.rua.saneada,
        similarCount: bidiBenchmark.rua.validas,
        allAreasAvgSqm: bidiBenchmark.rua.saneada,
        allAreasCount: bidiBenchmark.rua.total,
        isCascadeProtected: bidiBenchmark.rua.validas > 0 && bidiBenchmark.rua.validas < 5,
        rawUncappedAvgSqm: bidiBenchmark.rua.saneada,
        isSimilarActive: txSizeFilter === 'similar',
        minSimilarSize: bidiBenchmark.minSimilarSize,
        maxSimilarSize: bidiBenchmark.maxSimilarSize
      };
    }

    const stats = calculateRobustStats(exactStreetTxs, sizeSqm, txSizeFilter, 'Média da Mesma Rua');
    if (!stats) return null;

    const upperRef = neighborhoodStats?.avgSqm || nearbyStats?.avgSqm || 0;
    if (stats.count > 0 && stats.count < 5 && upperRef > 0) {
      const streetWeight = stats.count * 15;
      const radiusWeight = Math.round((100 - streetWeight) * 0.65);
      const neighWeight = 100 - streetWeight - radiusWeight;
      const radiusSqm = nearbyStats?.avgSqm || upperRef;
      const neighSqm = neighborhoodStats?.avgSqm || upperRef;
      const cascadedAvg = Math.round(
        ((stats.avgSqm * streetWeight) + (radiusSqm * radiusWeight) + (neighSqm * neighWeight)) / 100
      );
      return {
        ...stats,
        avgSqm: cascadedAvg,
        medianSqm: cascadedAvg,
        isCascadeProtected: true,
        rawUncappedAvgSqm: stats.avgSqm
      };
    }
    return stats;
  }, [bidiBenchmark, exactStreetTxs, sizeSqm, txSizeFilter, neighborhoodStats, nearbyStats]);

  // 4. Transactions in the exact same building/number with Street ±25% Outlier Defense
  const exactBuildingTxs = useMemo(() => {
    if (!selectedStreet || !streetNumber || exactStreetTxs.length === 0) return [];
    const targetNum = cleanNumber(streetNumber);
    if (!targetNum) return [];
    return exactStreetTxs.filter(tx => {
      if (!tx.number) return false;
      const txNum = cleanNumber(tx.number);
      return txNum === targetNum;
    });
  }, [exactStreetTxs, streetNumber]);

  const exactBuildingStats = useMemo(() => {
    if (bidiBenchmark && bidiBenchmark.predio.validas > 0) {
      return {
        avgSqm: bidiBenchmark.predio.saneada,
        medianSqm: bidiBenchmark.predio.saneada,
        source: `Média do Prédio (Nº ${cleanNumber(streetNumber)})`,
        count: bidiBenchmark.predio.validas,
        minSqm: bidiBenchmark.predio.corteMin || Math.round(bidiBenchmark.predio.saneada * 0.75),
        maxSqm: bidiBenchmark.predio.corteMax || Math.round(bidiBenchmark.predio.saneada * 1.25),
        rawAvgSqm: bidiBenchmark.predio.prelim || bidiBenchmark.predio.saneada,
        rawCount: bidiBenchmark.predio.total,
        outliersCount: bidiBenchmark.predio.expurgadas,
        similarAvgSqm: bidiBenchmark.predio.saneada,
        similarCount: bidiBenchmark.predio.validas,
        allAreasAvgSqm: bidiBenchmark.predio.saneada,
        allAreasCount: bidiBenchmark.predio.total,
        isCascadeProtected: false,
        rawUncappedAvgSqm: bidiBenchmark.predio.saneada,
        isSimilarActive: txSizeFilter === 'similar',
        minSimilarSize: bidiBenchmark.minSimilarSize,
        maxSimilarSize: bidiBenchmark.maxSimilarSize
      };
    }

    const stats = calculateRobustStats(exactBuildingTxs, sizeSqm, txSizeFilter, `Média do Prédio (Nº ${cleanNumber(streetNumber)})`);
    if (!stats) return null;

    return {
      ...stats,
      isCascadeProtected: false,
      rawUncappedAvgSqm: stats.avgSqm
    };
  }, [bidiBenchmark, exactBuildingTxs, sizeSqm, txSizeFilter, streetNumber]);

  // Combined stats for dynamic calculations
  const calculatedStats = useMemo(() => {
    if (exactBuildingStats) {
      return exactBuildingStats;
    }
    if (exactStreetStats) {
      return exactStreetStats;
    }
    if (neighborhoodStats) {
      return neighborhoodStats;
    }
    return nearbyStats;
  }, [exactBuildingStats, exactStreetStats, neighborhoodStats, nearbyStats]);

  // Valor Unitário Saneado (NBR 14.653):
  // Representa o valor pericial puro saneado das transações reais após desvio padrão. NÃO É CALIBRADO!
  // Regra Estrita: Sem amostragem fática na rua ou edifício, vedado arbitrar valor unitário saneado fictício.
  const sanitizedUnitValueSqm = useMemo(() => {
    if (exactBuildingStats && exactBuildingStats.avgSqm > 0 && exactBuildingStats.count > 0) {
      return exactBuildingStats.avgSqm;
    }
    if (exactStreetStats && exactStreetStats.count > 0) {
      return ('rawUncappedAvgSqm' in exactStreetStats ? exactStreetStats.rawUncappedAvgSqm : undefined) || exactStreetStats.avgSqm;
    }
    return 0;
  }, [exactBuildingStats, exactStreetStats]);

  // Online search evaluation statistics
  const onlineStats = useMemo(() => {
    if (!onlineResults || !onlineResults.foundMatches || onlineResults.foundMatches.length === 0) {
      return null;
    }
    const validMatches = onlineResults.foundMatches.filter(m => m && m.value && m.area);
    const size = sizeSqm || 80;
    if (validMatches.length === 0) {
      const values = onlineResults.foundMatches.map(m => m && m.value).filter(Boolean);
      if (values.length === 0) return null;
      const avgVal = values.reduce((acc, v) => acc + v, 0) / values.length;
      const avg = Math.round(avgVal / size);
      return {
        avgSqm: isNaN(avg) || !isFinite(avg) ? 0 : avg,
        minSqm: Math.round(Math.min(...values) / size) || 0,
        maxSqm: Math.round(Math.max(...values) / size) || 0,
        count: onlineResults.foundMatches.length,
        source: 'Varredura Online (Estimado)'
      };
    }
    const sqms = validMatches.map(m => m.value / (m.area as number));
    const avgSqm = Math.round(sqms.reduce((acc, s) => acc + s, 0) / sqms.length);
    return {
      avgSqm: isNaN(avgSqm) || !isFinite(avgSqm) ? 0 : avgSqm,
      minSqm: Math.round(Math.min(...sqms)) || 0,
      maxSqm: Math.round(Math.max(...sqms)) || 0,
      count: onlineResults.foundMatches.length,
      source: 'Varredura Online'
    };
  }, [onlineResults, sizeSqm]);

  // Portal specific street and nearby stats derived from matches
  const portalStreetStats = useMemo(() => {
    if (!portalResults || !portalResults.close || !portalResults.close.matches) return null;
    const targetStreetNorm = selectedStreet ? normalizeString(selectedStreet) : '';
    
    const streetMatches = portalResults.close.matches.filter((m: any) => {
      if (!targetStreetNorm) return false;
      return m && m.address && normalizeString(m.address).includes(targetStreetNorm);
    });
    
    if (streetMatches.length === 0) return null;
    
    const sumSqm = streetMatches.reduce((acc: number, m: any) => acc + (m.unitValueSqm || 0), 0);
    const avg = Math.round(sumSqm / streetMatches.length);
    return {
      avgSqm: isNaN(avg) || !isFinite(avg) ? 0 : avg,
      count: streetMatches.length
    };
  }, [portalResults, selectedStreet]);

  // Default bid/arremate is 50% of the calculated ITBI value
  const defaultArremate = useMemo(() => {
    const base = calculatedStats.avgSqm * sizeSqm;
    return Math.round(base * 0.50);
  }, [calculatedStats, sizeSqm]);

  // Active statistics context
  // Portal searches are a visual cross-check only. Financial calculations are
  // always anchored to official ITBI statistics, regardless of the open tab.
  const activeStats = calculatedStats;

  // Dynamic calculated value scaling directly with area sizeSqm
  const averageValue = activeStats.avgSqm * sizeSqm;

  // Progressive Notary Fees (Cartório de Notas) and RGI (Registro de Imóveis) for RJ
  const calculateCartorioFees = (value: number) => {
    let base = 0;
    if (value <= 20000) base = 380;
    else if (value <= 40000) base = 650;
    else if (value <= 60000) base = 980;
    else if (value <= 100000) base = 1500;
    else if (value <= 200000) base = 2400;
    else if (value <= 400000) base = 3800;
    else if (value <= 600000) base = 5200;
    else if (value <= 1000000) base = 6800;
    else if (value <= 2000000) base = 8900;
    else if (value <= 5000000) base = 11500;
    else base = 15000;

    const fetj = base * 0.20;
    const funperj = base * 0.05;
    const fundperj = base * 0.05;
    const funarpen = base * 0.04;
    const iss = base * 0.05;
    const total = base + fetj + funperj + fundperj + funarpen + iss;

    return {
      base,
      funds: fetj + funperj + fundperj + funarpen,
      iss,
      total: Math.round(total)
    };
  };

  const calculateRgiFees = (value: number) => {
    const cartBase = calculateCartorioFees(value).base;
    const base = Math.round(cartBase * 0.75);

    const fetj = base * 0.20;
    const funperj = base * 0.05;
    const fundperj = base * 0.05;
    const funarpen = base * 0.04;
    const iss = base * 0.05;
    const total = base + fetj + funperj + fundperj + funarpen + iss;

    return {
      base,
      funds: fetj + funperj + fundperj + funarpen,
      iss,
      total: Math.round(total)
    };
  };

  const itbiRate = selectedState === 'RJ' ? 0.03 : 0.02;
  const activeVal = customValue !== '' ? Number(customValue) : averageValue;
  const itbiCost = Math.round(activeVal * itbiRate);
  const cartorioCost = calculateCartorioFees(activeVal).total;
  const rgiCost = calculateRgiFees(activeVal).total;
  const totalTaxAndFees = itbiCost + cartorioCost + rgiCost;
  const totalAcquisitionCost = activeVal + totalTaxAndFees;

  // Filtered raw transactions for the matching table (Local Mode)
  const filteredTxs = useMemo(() => {
    return rawTransactions.filter(tx => {
      const matchesSearch = txSearch === '' || 
        (tx.street || '').toLowerCase().includes(txSearch.toLowerCase()) ||
        (tx.neighborhood || '').toLowerCase().includes(txSearch.toLowerCase()) ||
        (tx.transactionValue || '').toString().includes(txSearch);
      
      const matchesSize = txSizeFilter === 'all' ||
        (tx.sizeSqm >= Math.max(15, Math.round(sizeSqm * 0.67)) && tx.sizeSqm <= Math.round(sizeSqm * 1.33));

      return matchesSearch && matchesSize;
    });
  }, [rawTransactions, txSearch, txSizeFilter, sizeSqm]);

  // Real Estate portals reference (usually inflated by 20%)
  const zapAskingValue = Math.round(averageValue * 1.25);
  const quintoAndarAskingValue = Math.round(averageValue * 1.18);
  const averageAskingValue = Math.round((zapAskingValue + quintoAndarAskingValue) / 2);

  // Portal Costs Scenario calculations
  const itbiCostPortal = Math.round(averageAskingValue * itbiRate);
  const cartorioCostPortal = calculateCartorioFees(averageAskingValue).total;
  const rgiCostPortal = calculateRgiFees(averageAskingValue).total;
  const totalAcquisitionCostPortal = averageAskingValue + itbiCostPortal + cartorioCostPortal + rgiCostPortal;

  // Savings calculations
  const totalSavings = Math.max(0, totalAcquisitionCostPortal - totalAcquisitionCost);
  const savingsPct = totalAcquisitionCostPortal > 0 ? Math.round((totalSavings / totalAcquisitionCostPortal) * 100) : 0;

  // Flipping Simulator calculations
  const reformCost = Math.round(activeVal * 0.05); // 5% reform cost
  const totalInvestedCapital = totalAcquisitionCost + reformCost;
  const resellValue = averageAskingValue;
  const brokerFee = Math.round(resellValue * 0.05); // 5% broker fee
  const netArbitrageProfit = resellValue - totalInvestedCapital - brokerFee;
  const arbitrageRoi = totalInvestedCapital > 0 ? Math.round((netArbitrageProfit / totalInvestedCapital) * 100) : 0;

  // Derived calculations for Auction Acquisition & Costs Breakdown
  const auctionBid = arrematePrice > 0 ? arrematePrice : 0;
  const isAuction = acquisitionMode === 'judicial' || acquisitionMode === 'extrajudicial';
  const defaultAuctioneerFee = isAuction && auctionBid > 0 ? Math.round(auctionBid * 0.05) : 0; // 5% leilao, 0 venda direta caixa
  const defaultItbiFee = auctionBid > 0 ? Math.round(auctionBid * 0.03) : 0; // 3%
  const defaultRegistryFee = auctionBid > 0 ? Math.round(auctionBid * 0.03) : 0; // 3% Cartório / RGI

  const auctioneerFee = isAuction ? (auctioneerFeeInput !== null ? auctioneerFeeInput : defaultAuctioneerFee) : 0;
  const itbiFee = itbiFeeInput !== null ? itbiFeeInput : defaultItbiFee;
  const registryFee = registryFeeInput !== null ? registryFeeInput : defaultRegistryFee;

  // Downpayment Rates: Caixa 5%, Judicial 25% (CPC 895), Extrajudicial 30%
  const downpaymentRate = acquisitionMode === 'caixa' ? 0.05 : acquisitionMode === 'judicial' ? 0.25 : 0.30;
  const downpaymentRatePct = Math.round(downpaymentRate * 100);
  const downpaymentVal = Math.round(auctionBid * downpaymentRate);
  const financedBalance = Math.max(0, auctionBid - downpaymentVal);

  const acquisitionExpenses = auctioneerFee + itbiFee + registryFee + reformCostInput + legalCostInput + (iptuDebtInput || 0) + (condoDebtInput || 0);
  const totalArremateAcquisitionCost = auctionBid + acquisitionExpenses;
  const entryFinancingTotal = downpaymentVal + acquisitionExpenses;
  const effectiveEntryCost = paymentMethod === 'financiado' ? entryFinancingTotal : totalArremateAcquisitionCost;
  const arremateEffectiveSqm = sizeSqm > 0 ? Math.round(totalArremateAcquisitionCost / sizeSqm) : 0;
  const entryEffectiveSqm = sizeSqm > 0 ? Math.round(entryFinancingTotal / sizeSqm) : 0;

  // Financing Interest vs Amortization
  // Only the interest fraction is true carrying cost, as amortization is recovered on exit
  const interestRatio = annualInterestRateInput > 0 
    ? Math.min(0.95, Math.max(0.20, (annualInterestRateInput / 100) / ((annualInterestRateInput / 100) + 0.035))) 
    : 0;
  const monthlyInterestCost = Math.round((monthlyFinancingInput || 0) * interestRatio);
  const monthlyAmortization = Math.max(0, (monthlyFinancingInput || 0) - monthlyInterestCost);

  // Monthly Holding Cost (IPTU, Condomínio, Outros + Juros Efetivos do Financiamento)
  const totalMonthlyHolding = monthlyCondoInput + monthlyIptuInput + monthlyExtraInput + monthlyInterestCost;

  // 1. Média Ponderada dos 4 Níveis Oficiais do ITBI (Prédio, Rua, Raio 500m, Bairro)
  const itbiWeightedStats = useMemo(() => {
    let totalWeight = 0;
    let weightedSum = 0;
    const components: { label: string; sqm: number; weight: number }[] = [];

    const buildingSqm = exactBuildingStats?.avgSqm;
    const streetSqm = exactStreetStats?.avgSqm;
    const surroundingSqm = nearbyStats.avgSqm;
    const neighborhoodSqm = neighborhoodStats ? neighborhoodStats.avgSqm : nearbyStats.avgSqm;

    // Nível 1: Mesmo Prédio / Edifício (Peso 40 se houver)
    if (buildingSqm && buildingSqm > 0 && exactBuildingStats && exactBuildingStats.count > 0) {
      const w = 40;
      weightedSum += buildingSqm * w;
      totalWeight += w;
      components.push({ label: 'Prédio', sqm: buildingSqm, weight: w });
    }

    // Nível 2: Mesma Rua (Peso 35 se prédio houver, ou 50 se não houver)
    if (streetSqm && streetSqm > 0 && exactStreetStats && exactStreetStats.count > 0) {
      const w = buildingSqm ? 35 : 50;
      weightedSum += streetSqm * w;
      totalWeight += w;
      components.push({ label: 'Rua', sqm: streetSqm, weight: w });
    }

    // Nível 3: Ruas ao Entorno no Raio de 500m (Peso 15 se prédio+rua, ou 35 se só rua, ou 65 se nenhum)
    if (surroundingSqm && surroundingSqm > 0 && nearbyStats.count > 0) {
      const w = (buildingSqm && streetSqm) ? 15 : (!buildingSqm && streetSqm) ? 35 : (!buildingSqm && !streetSqm) ? 65 : 25;
      weightedSum += surroundingSqm * w;
      totalWeight += w;
      components.push({ label: 'Raio 500m', sqm: surroundingSqm, weight: w });
    }

    // Nível 4: Média Geral do Bairro (Peso restante até 100%)
    if (neighborhoodSqm && neighborhoodSqm > 0) {
      const w = totalWeight > 0 ? (100 - totalWeight) : 100;
      weightedSum += neighborhoodSqm * w;
      totalWeight += w;
      components.push({ label: 'Bairro', sqm: neighborhoodSqm, weight: w });
    }

    // Motor Pericial Bidirecional: A Média de Corte Real é a âncora soberana para o gabarito
    let itbiCompositeSqm = bidiBenchmark ? bidiBenchmark.mediaCorteReal : (totalWeight > 0 ? Math.round(weightedSum / totalWeight) : (calculatedStats.avgSqm || 6500));

    // Prudência estatística: quando prédio e rua não possuem nenhuma amostra,
    // aplicar desconto prudencial de 12% sobre a média periférica para evitar distorção de ROI
    if (!buildingSqm && !streetSqm && !bidiBenchmark) {
      itbiCompositeSqm = Math.round(itbiCompositeSqm * 0.88);
    }

    // Terrenos e grandes glebas: aplicar redutor de terra nua para não precificar gleba com m² de apartamento
    if (propertyType === 'Terreno' || prefillData?.propertyType === 'Terreno') {
      if (sizeSqm > 300) {
        itbiCompositeSqm = Math.min(itbiCompositeSqm, Math.round((neighborhoodSqm || 5000) * 0.35));
      }
    }

    return { itbiCompositeSqm, components, totalWeight };
  }, [bidiBenchmark, exactBuildingStats, exactStreetStats, nearbyStats, neighborhoodStats, calculatedStats.avgSqm, propertyType, prefillData?.propertyType, sizeSqm]);

  // Detecção 100% AUTOMÁTICA do Ano de Construção / Habite-se / Registro na Matrícula & Edital
  const buildingAgeData = useMemo(() => {
    let yearFound: number | null = manualBuildingYear;
    let detectionSource = 'Manual';
    const currentYear = new Date().getFullYear();

    if (!yearFound) {
      const corpus = `${matriculaText || ''} ${prefillData?.description || ''} ${prefillData?.title || ''} ${prefillData?.address || ''}`;

      // 1. Habite-se e conclusão de obras (padrão ouro das matrículas)
      const habitePatterns = [
        /habite-?se(?:\s*datado\s*de|\s*de|\s*em|\s*n[ºo°.]?\s*[\d/.-]+)?\s*[:.]?\s*(\d{1,2}[./-]\d{1,2}[./-](\d{4})|(\d{4}))/i,
        /av[.-]?\s*\d+.*?habite-?se.*?(\d{4})/i,
        /conclus[aã]o\s*da\s*edifica[cç][aã]o.*?(\d{4})/i,
        /conclus[aã]o\s*da\s*obra.*?(\d{4})/i
      ];
      for (const pat of habitePatterns) {
        const m = corpus.match(pat);
        if (m) {
          const y = parseInt(m[2] || m[1], 10);
          if (y >= 1920 && y <= currentYear) {
            yearFound = y;
            detectionSource = 'Habite-se';
            break;
          }
        }
      }

      // 2. Data de registro, abertura da matrícula ou prenotação no topo
      if (!yearFound) {
        const regPatterns = [
          /(?:termo\s*de\s*abertura|abertura\s*da\s*matr[ií]cula|prenota[cç][aã]o|data\s*do\s*registro|livro\s*2).*?(\d{1,2}[./-]\d{1,2}[./-](\d{4})|(\d{4}))/i,
          /registrado\s*em\s*\d{1,2}\s*de\s*[a-zç]+\s*de\s*(19\d{2}|20\d{2})/i
        ];
        for (const pat of regPatterns) {
          const m = corpus.match(pat);
          if (m) {
            const y = parseInt(m[2] || m[1], 10);
            if (y >= 1920 && y <= currentYear) {
              yearFound = y;
              detectionSource = 'Registro da Matrícula';
              break;
            }
          }
        }
      }

      // 3. Ano de construção explícito
      if (!yearFound) {
        const yearPatterns = [
          /ano\s*(?:de\s*)?constru[cç][aã]o\s*[:=]?\s*(\d{4})/i,
          /constru[ií]do\s*em\s*(\d{4})/i,
          /ano\s*[:=]\s*(\d{4})/i
        ];
        for (const pat of yearPatterns) {
          const m = corpus.match(pat);
          if (m && m[1]) {
            const y = parseInt(m[1], 10);
            if (y >= 1920 && y <= currentYear) {
              yearFound = y;
              detectionSource = 'Edital';
              break;
            }
          }
        }
      }

      // 4. Histórico de datas na matrícula
      if (!yearFound && matriculaText) {
        const dates = matriculaText.match(/\b\d{2}[./-]\d{2}[./-](19\d{2}|20\d{2})\b/g);
        if (dates && dates.length > 0) {
          const years = dates.map(d => parseInt(d.slice(-4), 10)).filter(y => y >= 1920 && y <= currentYear);
          if (years.length > 0) {
            yearFound = Math.min(...years);
            detectionSource = 'Matrícula';
          }
        }
      }
    }

    if (yearFound) {
      const age = Math.max(0, currentYear - yearFound);
      // Se tiver até 12 anos (ex: construído em 2015 -> 11 anos): 0% de depreciação
      if (age > 12) {
        let depPct = 1.0;
        if (age <= 20) depPct = 1.0 + ((age - 12) / 8) * 0.5;
        else if (age <= 35) depPct = 1.6 + ((age - 21) / 14) * 1.2;
        else if (age <= 50) depPct = 2.9 + ((age - 36) / 14) * 1.1;
        else depPct = Math.min(5.0, 4.5 + Math.min(0.5, ((age - 50) / 20) * 0.5));
        depPct = Number(depPct.toFixed(1));
        return {
          detectedYear: yearFound,
          age,
          depreciationPct: depPct,
          factor: Number((1 - depPct / 100).toFixed(4)),
          source: detectionSource
        };
      }
      return {
        detectedYear: yearFound,
        age,
        depreciationPct: 0,
        factor: 1.0,
        source: detectionSource
      };
    }

    return {
      detectedYear: null,
      age: null,
      depreciationPct: 0,
      factor: 1.0,
      source: 'Não especificado'
    };
  }, [manualBuildingYear, matriculaText, prefillData?.description, prefillData?.title, prefillData?.address]);

  // Sincronização Pericial Exata: Se o motor bidirecional calculou o corte real, utiliza soberanamente
  const hasRealMicroData = useMemo(() => {
    if (bidiBenchmark) {
      return bidiBenchmark.hasMicroData;
    }
    return exactBuildingTxs.length > 0 || (exactStreetStats !== null && exactStreetStats.count > 0);
  }, [bidiBenchmark, exactBuildingTxs.length, exactStreetStats]);

  const hasVerifiedStreetOrBuildingData = useMemo(() => {
    if (bidiBenchmark) {
      return bidiBenchmark.predio.validas > 0 || bidiBenchmark.rua.validas > 0;
    }
    return exactBuildingTxs.length > 0 || (exactStreetStats !== null && exactStreetStats.count > 0);
  }, [bidiBenchmark, exactBuildingTxs.length, exactStreetStats]);

  // 2. Balizador Portais (ZapImóveis / QuintoAndar)
  const portalBenchmarkSqm = useMemo(() => {
    if (portalStreetStats && portalStreetStats.avgSqm > 0) {
      return portalStreetStats.avgSqm;
    }
    if (portalResults?.close?.avgSqm && portalResults.close.avgSqm > 0) {
      return portalResults.close.avgSqm;
    }
    return 0;
  }, [portalStreetStats, portalResults]);

  // 3. Preço Sugerido Flip (Giro rápido em até 60 dias):
  // 100% Ancorado no Gabarito Real de Cartório (Corte Bidirecional) com Deságio Tático de 10% para Liquidez Imediata
  const baseQuickSaleSqm = bidiBenchmark ? bidiBenchmark.flipRapidoSqm : Math.round(itbiWeightedStats.itbiCompositeSqm * 0.90);
  const suggestedQuickSaleTotal = useMemo(() => {
    if (!hasRealMicroData) {
      return 0;
    }
    const baseSqm = (bidiBenchmark && bidiBenchmark.hasMicroData && bidiBenchmark.flipRapidoSqm > 0)
      ? bidiBenchmark.flipRapidoSqm
      : baseQuickSaleSqm;
    const territorialFactor = prefillData?.isCommunityRisk ? 0.85 : 1;
    return Math.round(Math.round(baseSqm * buildingAgeData.factor * territorialFactor) * sizeSqm);
  }, [hasRealMicroData, bidiBenchmark, sizeSqm, baseQuickSaleSqm, buildingAgeData.factor, prefillData?.isCommunityRisk]);

  const suggestedQuickSaleSqm = useMemo(() => {
    if (!hasRealMicroData || suggestedQuickSaleTotal === 0) {
      return 0;
    }
    if (sizeSqm > 0) {
      return Math.round(suggestedQuickSaleTotal / sizeSqm);
    }
    return Math.round(baseQuickSaleSqm * buildingAgeData.factor);
  }, [hasRealMicroData, suggestedQuickSaleTotal, sizeSqm, baseQuickSaleSqm, buildingAgeData.factor]);

  // Sincronização Pericial em Tempo Real: O Flip Rápido e Gabarito da Calculadora atualizam soberanamente o Card do Imóvel
  useEffect(() => {
    if (isLoadingTransactions || rawTransactions.length === 0) return;
    if (prefillData?.id && onUpdateProperty) {
      if (suggestedQuickSaleTotal > 0 && hasRealMicroData && bidiBenchmark) {
        const gabaritoTotal = Math.round(bidiBenchmark.gabaritoTotal * buildingAgeData.factor * (prefillData.isCommunityRisk ? 0.85 : 1));
        if (prefillData.vendaBaixaPrice !== suggestedQuickSaleTotal || prefillData.estimatedValue !== gabaritoTotal || prefillData.valuationRadiusKm !== radiusKm) {
          onUpdateProperty({
            id: prefillData.id,
            vendaBaixaPrice: suggestedQuickSaleTotal,
            vendaMediaPrice: suggestedQuickSaleTotal,
            estimatedValue: gabaritoTotal,
            valuationConfidence: bidiBenchmark.predio.validas > 0 || bidiBenchmark.rua.validas > 0 ? 'verified' : 'projected',
            valuationBasis: `ITBI verificado - ${bidiBenchmark.nivelUtilizado} - raio ${radiusKm.toFixed(1)} km`,
            valuationSampleCount: bidiBenchmark.nivelUtilizado === 'Prédio' ? bidiBenchmark.predio.validas : bidiBenchmark.nivelUtilizado === 'Rua' ? bidiBenchmark.rua.validas : bidiBenchmark.raio.validas,
            valuationRadiusKm: radiusKm,
            itbiSurroundingAvgSqm: bidiBenchmark.radiusVerified ? (bidiBenchmark.raio.saneada || undefined) : undefined,
            itbiSurroundingCount: bidiBenchmark.radiusVerified ? (bidiBenchmark.raio.validas || undefined) : undefined,
            streetRadiusDeviationPct: bidiBenchmark.radiusVerified ? (bidiBenchmark.ruaRaioDesvioPct || undefined) : undefined,
            streetRadiusCalibrated: bidiBenchmark.radiusVerified && bidiBenchmark.ruaRaioCalibrada
          });
        }
      } else if (!hasRealMicroData && prefillData.valuationConfidence === 'verified') {
        onUpdateProperty({
          id: prefillData.id,
          vendaBaixaPrice: undefined,
          vendaMediaPrice: undefined,
          estimatedValue: undefined,
          valuationConfidence: 'unavailable',
          valuationBasis: 'Sem amostras ITBI verificadas na rua ou no raio selecionado',
          valuationSampleCount: undefined,
          valuationRadiusKm: radiusKm
        });
      }
    }
  }, [suggestedQuickSaleTotal, hasRealMicroData, bidiBenchmark, buildingAgeData.factor, radiusKm, prefillData?.id, prefillData?.vendaBaixaPrice, prefillData?.estimatedValue, prefillData?.valuationConfidence, prefillData?.valuationRadiusKm, prefillData?.isCommunityRisk, onUpdateProperty]);

  const activeFlipExitPrice = (customExitPrice !== null && customExitPrice > 0) ? customExitPrice : suggestedQuickSaleTotal;

  // Rental Calculations with IR deduction (IRPF / Carnê-Leão) and Portals Benchmark
  const grossRentMonthly = Math.round(activeFlipExitPrice * 0.0055); // ~0.55% a.m.
  const portalRentalBenchmarkMonthly = Math.round(activeFlipExitPrice * 0.0058); // ~0.58% a.m. (Média QuintoAndar / Zap)
  const rentAfterVacAndAdm = Math.round(grossRentMonthly * 0.82); // -18% (8% vacância + 10% adm)
  const irDeductionMonthly = Math.round(rentAfterVacAndAdm * ((rentalIrDeductionPct || 0) / 100)); // IR sobre aluguel
  const netRentMonthly = Math.max(0, rentAfterVacAndAdm - irDeductionMonthly);
  const netRentalYieldAnnual = totalArremateAcquisitionCost > 0 ? (((netRentMonthly * 12) / totalArremateAcquisitionCost) * 100) : 0;

  // Flip Scenarios data with 4% broker fee + 15% Capital Gains Tax (IR sobre Ganho de Capital)
  const flipScenariosData = useMemo(() => {
    return [1, 3, 6, 12, 24].map((months) => {
      const brokerFeeVal = Math.round(activeFlipExitPrice * 0.04); // 4% corretagem
      const accumulatedHolding = totalMonthlyHolding * months;
      const grossGain = activeFlipExitPrice - totalArremateAcquisitionCost - accumulatedHolding - brokerFeeVal;
      const capitalGainsTax = grossGain > 0 ? Math.round(grossGain * 0.15) : 0; // 15% IR Ganho de Capital
      const netProfit = grossGain - capitalGainsTax;
      const netRoi = totalArremateAcquisitionCost > 0 ? Math.round((netProfit / (totalArremateAcquisitionCost + accumulatedHolding)) * 100) : 0;
      return {
        months,
        holdingCost: accumulatedHolding,
        brokerFee: brokerFeeVal,
        capitalGainsTax,
        netProfit,
        netRoi
      };
    });
  }, [activeFlipExitPrice, totalArremateAcquisitionCost, totalMonthlyHolding]);

  // Synchronize simulator inputs with active calculations or arremate price
  useEffect(() => {
    if (arrematePrice > 0) {
      setCustomPurchasePrice(totalArremateAcquisitionCost);
    } else {
      setCustomPurchasePrice(totalAcquisitionCost);
    }
  }, [arrematePrice, totalArremateAcquisitionCost, totalAcquisitionCost]);

  useEffect(() => {
    setCustomSalePrice(activeFlipExitPrice || averageValue);
  }, [activeFlipExitPrice, averageValue]);

  // Market Tiers for 1-to-1 Comparison with Auction Acquisition
  const marketTiers = useMemo(() => {
    let portalSqm: number | null = null;
    let portalSamplesLabel = 'Sem anúncios registrados nesta via';
    
    if (portalStreetStats && portalStreetStats.avgSqm > 0 && portalStreetStats.count > 0) {
      portalSqm = portalStreetStats.avgSqm;
      portalSamplesLabel = `✓ Anúncios na Rua (${portalStreetStats.count} imóveis)`;
    } else if (portalResults?.close?.avgSqm && portalResults.close.avgSqm > 0 && (portalResults.close.matches?.length || 0) > 0) {
      portalSqm = portalResults.close.avgSqm;
      portalSamplesLabel = `✓ Pesquisa nos Portais (${portalResults.close.matches?.length || 0} anúncios)`;
    }

    const streetSqm = (exactStreetStats && exactStreetStats.count > 0 && exactStreetStats.avgSqm > 0) ? exactStreetStats.avgSqm : null;
    const buildingSqm = (exactBuildingStats && exactBuildingStats.count > 0 && exactBuildingStats.avgSqm > 0) ? exactBuildingStats.avgSqm : null;
    const surroundingSqm = nearbyStats.avgSqm;
    const neighborhoodSqm = neighborhoodStats ? neighborhoodStats.avgSqm : nearbyStats.avgSqm;

    const buildingCount = (exactBuildingStats && exactBuildingStats.count > 0) ? exactBuildingStats.count : 0;
    const streetCount = (exactStreetStats && exactStreetStats.count > 0) ? exactStreetStats.count : 0;
    const surroundingCount = nearbyStats.count || 0;
    const neighborhoodCount = (neighborhoodStats?.count || rawTransactions.length) || 0;
    const portalStreetCount = portalStreetStats ? portalStreetStats.count : 0;

    const tiers = [
      {
        id: 'building',
        label: `1. Mesmo Prédio / Edifício ${streetNumber ? `(Nº ${cleanNumber(streetNumber)})` : ''}`,
        icon: Building,
        color: 'emerald',
        sqm: buildingSqm,
        count: buildingCount,
        isFewSamples: false,
        isCascadeProtected: (exactBuildingStats as any)?.isCascadeProtected || false,
        samples: buildingCount > 0 ? `${buildingCount} tx` : 'Sem transações no número',
        active: !!(buildingSqm && buildingCount > 0)
      },
      {
        id: 'street',
        label: `2. Mesma Rua (${selectedStreet || 'Rua Selecionada'})`,
        icon: MapPin,
        color: 'indigo',
        sqm: streetSqm,
        count: streetCount,
        isFewSamples: streetCount > 0 && streetCount < 5,
        isCascadeProtected: (exactStreetStats as any)?.isCascadeProtected || false,
        samples: streetCount > 0 ? `${streetCount} tx` : 'Sem transações na rua',
        active: !!(streetSqm && streetCount > 0)
      },
      {
        id: 'surrounding',
        label: `3. Ruas do Entorno (Raio ~${radiusKm}km)`,
        icon: Compass,
        color: 'violet',
        sqm: (selectedStreet && nearbyStreetTxs.length === 0) ? null : surroundingSqm,
        count: (selectedStreet && nearbyStreetTxs.length === 0) ? 0 : surroundingCount,
        isFewSamples: (selectedStreet && nearbyStreetTxs.length === 0) || (surroundingCount > 0 && surroundingCount < 3),
        isCascadeProtected: (selectedStreet && nearbyStreetTxs.length === 0),
        samples: (selectedStreet && nearbyStreetTxs.length === 0) ? 'Sem transações no raio' : (nearbyStats.count > 0 ? `${nearbyStats.count} tx` : 'Sem transações no raio'),
        active: !(selectedStreet && nearbyStreetTxs.length === 0)
      },
      {
        id: 'neighborhood',
        label: `4. Média Geral do Bairro (${selectedNeighborhood || 'Bairro'})`,
        icon: Layers,
        color: 'amber',
        sqm: neighborhoodSqm,
        count: neighborhoodCount,
        isFewSamples: neighborhoodCount > 0 && neighborhoodCount < 3,
        isCascadeProtected: false,
        samples: neighborhoodCount > 0 ? `${neighborhoodCount} tx` : 'Média ITBI Bairro',
        active: true
      },
      {
        id: 'portals_street',
        label: '5. Anúncios nos Portais na Rua (Zap / QuintoAndar)',
        icon: Globe,
        color: 'cyan',
        sqm: portalSqm,
        count: portalStreetCount,
        isFewSamples: portalStreetCount > 0 && portalStreetCount < 3,
        isCascadeProtected: false,
        samples: portalSamplesLabel,
        active: portalSqm !== null && portalSqm > 0
      }
    ];

    return tiers.map(tier => {
      if (!tier.sqm || tier.sqm <= 0) {
        return {
          ...tier,
          saleValue: 0,
          grossProfit: 0,
          roi: 0,
          sqmDiff: 0
        };
      }
      const saleValue = tier.sqm * sizeSqm;
      const grossProfit = totalArremateAcquisitionCost > 0 ? (saleValue - totalArremateAcquisitionCost) : 0;
      const roi = totalArremateAcquisitionCost > 0 ? Math.round((grossProfit / totalArremateAcquisitionCost) * 100) : 0;
      const sqmDiff = totalArremateAcquisitionCost > 0 ? (tier.sqm - arremateEffectiveSqm) : 0;
      return {
        ...tier,
        saleValue,
        grossProfit,
        roi,
        sqmDiff
      };
    });
  }, [
    exactBuildingStats,
    exactStreetStats,
    nearbyStats,
    neighborhoodStats,
    calculatedStats,
    portalResults,
    portalStreetStats,
    isSearchingPortals,
    prefillData,
    averageAskingValue,
    sizeSqm,
    totalArremateAcquisitionCost,
    arremateEffectiveSqm,
    streetNumber,
    selectedStreet,
    selectedNeighborhood,
    radiusKm,
    rawTransactions.length
  ]);


  // Unified 3-in-1 Full Market Analysis Handler
  const handleExecuteFullAnalysis = async () => {
    if (!selectedNeighborhood) return;
    setIsExecutingFullAnalysis(true);
    setActiveTab('local'); // Lands automatically on Análise Precisa
    try {
      await Promise.allSettled([
        handleGenerateAiReport(),
        handleOnlineSearch()
      ]);
    } catch (e) {
      console.error('Error during full 3-in-1 analysis:', e);
    } finally {
      setIsExecutingFullAnalysis(false);
    }
  };

  // PDF / Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Trigger Local AI Report Generation
  const handleGenerateAiReport = async () => {
    if (!selectedNeighborhood) return;
    setIsGeneratingAiReport(true);
    setAiReport('');
    try {
      const response = await fetch('/api/itbi/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: selectedState,
          city: selectedCity,
          neighborhood: selectedNeighborhood,
          street: selectedStreet,
          propertyType,
          sizeSqm,
          estimatedValue: averageValue,
          streetStats: exactStreetStats ? {
            avgSqm: exactStreetStats.avgSqm,
            minSqm: exactStreetStats.minSqm,
            maxSqm: exactStreetStats.maxSqm,
            count: exactStreetStats.count
          } : null,
          nearbyStats: {
            avgSqm: nearbyStats.avgSqm,
            minSqm: nearbyStats.minSqm,
            maxSqm: nearbyStats.maxSqm,
            count: nearbyStats.count
          },
          radiusKm,
          transactionsPreview: exactStreetTxs.slice(0, 5),
          nearbyTransactionsPreview: nearbyStreetTxs.slice(0, 5)
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
        setAiReport(responseData.report || 'Sem análise disponível.');
      } else {
        setAiReport(`Aviso: ${responseData.error || 'Erro ao gerar o relatório.'}`);
      }
    } catch (e: any) {
      console.error(e);
      setAiReport(`Erro de rede: ${e.message}`);
    } finally {
      setIsGeneratingAiReport(false);
    }
  };

  // Trigger Online Search Grounding
  const handleOnlineSearch = async () => {
    if (!selectedNeighborhood) {
      alert('Por favor, selecione um Bairro para iniciar a pesquisa.');
      return;
    }
    
    // Construct search address query using selectors
    let searchAddr = '';
    if (selectedStreet) searchAddr += `${selectedStreet}`;
    else searchAddr += `Bairro ${selectedNeighborhood}`;
    
    if (streetNumber.trim()) {
      searchAddr += `, ${streetNumber}`;
    }
    
    searchAddr += `, ${selectedCity} - ${selectedState}`;

    setIsSearchingOnline(true);
    setOnlineError('');
    setOnlineResults(null);
    try {
      const response = await fetch('/api/itbi/search-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: searchAddr,
          neighborhood: selectedNeighborhood,
          street: selectedStreet,
          propertyType,
          sizeSqm,
          bedrooms,
          parkingSpaces
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
        setOnlineResults(responseData);
      } else {
        setOnlineError(responseData.error || 'Erro ao realizar busca online.');
      }
    } catch (e: any) {
      setOnlineError(`Erro de rede: ${e.message}`);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Trigger Portal Similar Comparison Search
  const handlePortalComparison = async () => {
    if (!selectedNeighborhood) {
      alert('Por favor, selecione um Bairro para iniciar a pesquisa.');
      return;
    }

    setIsSearchingPortals(true);
    setPortalError('');
    setPortalResults(null);
    try {
      const response = await fetch('/api/portais/search-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: selectedState,
          city: selectedCity,
          neighborhood: selectedNeighborhood,
          street: selectedStreet,
          propertyType,
          sizeSqm,
          bedrooms,
          parkingSpaces,
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
        if (prefillData?.id && onUpdateProperty && responseData.verified) {
          const allMatches = [
            ...(responseData.below?.matches || []),
            ...(responseData.close?.matches || []),
            ...(responseData.above?.matches || [])
          ];
          const uniqueMatches = Array.from(new Map(allMatches.map((match: any) => [match.link, match])).values()) as any[];
          const valid = uniqueMatches.filter((match: any) => Number(match.unitValueSqm) > 0 && Number(match.price) > 0);
          if (valid.length > 0) {
            const avgSqm = Math.round(valid.reduce((sum: number, match: any) => sum + Number(match.unitValueSqm), 0) / valid.length);
            const zap = valid.filter((match: any) => /zapimoveis/i.test(match.link || ''));
            const quinto = valid.filter((match: any) => /quintoandar/i.test(match.link || ''));
            const averageTotal = (matches: any[]) => matches.length > 0
              ? Math.round(matches.reduce((sum: number, match: any) => sum + Number(match.price), 0) / matches.length)
              : undefined;
            await onUpdateProperty({
              id: prefillData.id,
              streetPortalAvgSqm: avgSqm,
              portalZapAvg: averageTotal(zap),
              portalQuintoAndarAvg: averageTotal(quinto),
              portalSampleCount: valid.length,
              portalDataVerifiedAt: responseData.checkedAt || new Date().toISOString(),
              portalDataSource: 'Anúncios individuais ativos confirmados na rua'
            });
          }
        }
      } else {
        setPortalError(responseData.error || 'Erro ao buscar imóveis similares.');
      }
    } catch (e: any) {
      setPortalError(`Erro de rede: ${e.message}`);
    } finally {
      setIsSearchingPortals(false);
    }
  };

  const handleSaveAnalysisToProfile = async () => {
    setIsSavingAnalysis(true);
    let payload: SavedMarketAnalysis | null = null;
    try {
      const token = localStorage.getItem('token');
      payload = {
        id: `analysis-${Date.now()}`,
        createdAt: new Date().toISOString(),
        title: `${propertyType} em ${selectedNeighborhood || 'Bairro'}, ${selectedCity}`,
        state: selectedState,
        city: selectedCity,
        neighborhood: selectedNeighborhood || 'Centro',
        street: selectedStreet || 'Geral do Bairro',
        streetNumber: streetNumber || undefined,
        propertyType: propertyType as PropertyType,
        sizeSqm,
        bedrooms,
        parkingSpaces,
        
        acquisitionMode: acquisitionMode === 'caixa' ? 'caixa' : 'leilao',
        arrematePrice: auctionBid,
        totalAcquisitionCost: totalArremateAcquisitionCost,
        effectiveSqmCost: arremateEffectiveSqm,
        
        calculatedUnitSqm: calculatedStats.avgSqm,
        calculatedTotalValue: calculatedStats.avgSqm * sizeSqm,
        
        // 4 ROIs:
        // 1. Conservador / Venda Rápida
        roiQuickSale: Math.round(((suggestedQuickSaleTotal - totalArremateAcquisitionCost - Math.round(suggestedQuickSaleTotal * 0.04)) / (totalArremateAcquisitionCost || 1)) * 100),
        valueQuickSale: suggestedQuickSaleTotal,
        profitQuickSale: suggestedQuickSaleTotal - totalArremateAcquisitionCost - Math.round(suggestedQuickSaleTotal * 0.04),
        
        // 2. Mesma Rua / Prédio (Média Real ITBI)
        roiStreetAverage: exactStreetStats ? Math.round(((exactStreetStats.avgSqm * sizeSqm - totalArremateAcquisitionCost) / (totalArremateAcquisitionCost || 1)) * 100) : Math.round(((calculatedStats.avgSqm * sizeSqm - totalArremateAcquisitionCost) / (totalArremateAcquisitionCost || 1)) * 100),
        valueStreetAverage: (exactStreetStats ? exactStreetStats.avgSqm : calculatedStats.avgSqm) * sizeSqm,
        profitStreetAverage: (exactStreetStats ? exactStreetStats.avgSqm : calculatedStats.avgSqm) * sizeSqm - totalArremateAcquisitionCost,
        
        // 3. Entorno do Bairro (Média Saneada NBR 14.653)
        roiNeighborhood: Math.round(((nearbyStats.avgSqm * sizeSqm - totalArremateAcquisitionCost) / (totalArremateAcquisitionCost || 1)) * 100),
        valueNeighborhood: nearbyStats.avgSqm * sizeSqm,
        profitNeighborhood: nearbyStats.avgSqm * sizeSqm - totalArremateAcquisitionCost,
        
        // 4. Anúncios de Portais (Teto de Mercado)
        roiPortalsAsking: Math.round(((averageAskingValue - totalArremateAcquisitionCost) / (totalArremateAcquisitionCost || 1)) * 100),
        valuePortalsAsking: averageAskingValue,
        profitPortalsAsking: averageAskingValue - totalArremateAcquisitionCost,
        
        flipExitPrice: activeFlipExitPrice,
        flipNetRoi6m: flipScenariosData.find(s => s.months === 6)?.netRoi || 0,
        flipNetProfit6m: flipScenariosData.find(s => s.months === 6)?.netProfit || 0,
        
        grossRentMonthly,
        netRentMonthly,
        netRentalYieldAnnual: totalArremateAcquisitionCost > 0 ? ((netRentMonthly * 12) / totalArremateAcquisitionCost) * 100 : 0,
        
        reportData: {
          state: selectedState,
          city: selectedCity,
          neighborhood: selectedNeighborhood,
          street: selectedStreet,
          streetNumber: streetNumber,
          propertyType: propertyType,
          sizeSqm: sizeSqm,
          bedrooms: bedrooms,
          parkingSpaces: parkingSpaces,
          
          acquisitionMode: acquisitionMode === 'caixa' ? 'caixa' : 'leilao',
          arrematePrice: auctionBid,
          auctioneerFee: auctioneerFee,
          itbiFee: itbiFee,
          registryFee: registryFee,
          reformCost: reformCostInput,
          legalCost: legalCostInput,
          iptuDebt: iptuDebtInput || 0,
          condoDebt: condoDebtInput || 0,
          totalAcquisitionCost: totalArremateAcquisitionCost,
          effectiveSqmCost: arremateEffectiveSqm,
          
          marketTiers: marketTiers,
          
          monthlyCondo: monthlyCondoInput,
          monthlyIptu: monthlyIptuInput,
          monthlyExtra: monthlyExtraInput,
          monthlyFinancing: monthlyFinancingInput || 0,
          annualInterestRate: annualInterestRateInput || 0,
          monthlyInterestCost: monthlyInterestCost,
          totalMonthlyHolding: totalMonthlyHolding,
          
          flipScenarios: flipScenariosData,
          flipExitPrice: activeFlipExitPrice,
          
          grossRentMonthly: grossRentMonthly,
          portalRentalBenchmarkMonthly: portalRentalBenchmarkMonthly,
          irDeductionMonthly: irDeductionMonthly,
          rentalIrDeductionPct: rentalIrDeductionPct,
          netRentMonthly: netRentMonthly,
          netRentalYieldAnnual: netRentalYieldAnnual,
          matriculaReport: matriculaReport || undefined
        }
      };

      await fetch('/api/user/saved-analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      // Always update local cache so Profile displays it instantly
      try {
        const cached = localStorage.getItem('user_saved_analyses_cache');
        const list = cached ? JSON.parse(cached) : [];
        localStorage.setItem('user_saved_analyses_cache', JSON.stringify([payload, ...list.filter((x: any) => x.id !== payload!.id)]));
      } catch (err) {}

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (e: any) {
      console.error('Erro ao salvar:', e);
      // Fallback local save even on network fail
      if (payload) {
        try {
          const cached = localStorage.getItem('user_saved_analyses_cache');
          const list = cached ? JSON.parse(cached) : [];
          localStorage.setItem('user_saved_analyses_cache', JSON.stringify([payload, ...list]));
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 4000);
        } catch (err) {
          alert('Erro ao salvar análise.');
        }
      }
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-slate-950 p-5 md:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-md text-slate-100">
      
      {/* Header Panel (Centered & Polished with PDF Laudo Button & Save to Profile Button) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center space-x-3 text-center md:text-left">
          <div className="bg-indigo-600/20 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/30 shadow-xs">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
              Calculadora de Valor Real de Imóveis
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Cruzamento de dados oficiais de ITBI, varredura de mercado em tempo real e análise de viabilidade para investidores.
            </p>
          </div>
        </div>

        {/* Action Buttons: Save to Profile & Generate PDF */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-end shrink-0">
          <button
            onClick={handleSaveAnalysisToProfile}
            disabled={isSavingAnalysis}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-xs py-2.5 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-md cursor-pointer border border-amber-500/30 shrink-0"
            title="Salva esta análise completa na sua aba de Perfil para acompanhamento de ROI e comparativos"
          >
            {isSavingAnalysis ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            ) : savedSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Bookmark className="w-4 h-4 text-amber-400" />
            )}
            <span>{savedSuccess ? 'Análise Salva no Perfil!' : '💾 Salvar Análise no Perfil'}</span>
          </button>

          <button
            onClick={() => setIsExecutiveReportOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-md hover:shadow-indigo-500/25 cursor-pointer border border-indigo-400/40 shrink-0"
            title="Abre o Laudo Técnico de Avaliação Mercadológica (PTAM) para impressão e exportação em PDF"
          >
            <FileText className="w-4 h-4" />
            <span>Gerar Laudo Técnico PTAM (PDF)</span>
          </button>
        </div>
      </div>

      {/* Etapa 1 Badge */}
      <div className="flex items-center gap-2 pt-2">
        <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase font-mono tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 shadow-xs">
          <span>ETAPA 1 DE 4</span> • <span>Pré-Análise & Custos de Entrada (Comparativo 1-a-1)</span>
        </span>
      </div>

      {/* Main Grid: Form left 4/12, Cards right 8/12 (Fills 100% Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch w-full">
        
        {/* LEFT COLUMN: Controls & Unified Form (4/12 width) */}
        <div data-tour="calc-characteristics" className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3.5 w-full">
          
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-white uppercase tracking-widest font-mono pb-1.5 border-b border-slate-800 flex items-center space-x-1.5">
              <Building className="w-4 h-4 text-white" />
              <span>1. Características do Imóvel</span>
            </h3>

            {/* Select State & City */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 font-mono uppercase text-[9px]">Estado (UF):</label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setSelectedState(newState);
                    const cities = newState === 'RJ' ? ['Rio de Janeiro'] : newState === 'SP' ? ['São Paulo'] : ['Juiz de Fora', 'Santos Dumont'];
                    setSelectedCity(cities[0]);
                    setSelectedNeighborhood('');
                    setSelectedStreet('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-bold px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-600 text-slate-200 cursor-pointer"
                >
                  <option value="RJ">RJ - Rio de Janeiro</option>
                  <option value="SP">SP - São Paulo</option>
                  <option value="MG">MG - Minas Gerais</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 font-mono uppercase text-[9px]">Cidade:</label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setSelectedNeighborhood('');
                    setSelectedStreet('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-bold px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-600 text-slate-200 cursor-pointer"
                >
                  {selectedState === 'RJ' && (
                    <>
                      <option value="Rio de Janeiro">Rio de Janeiro</option>
                      <option value="Niterói">Niterói</option>
                    </>
                  )}
                  {selectedState === 'SP' && <option value="São Paulo">São Paulo</option>}
                  {selectedState === 'MG' && (
                    <>
                      <option value="Juiz de Fora">Juiz de Fora</option>
                      <option value="Santos Dumont">Santos Dumont</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Autocomplete Neighborhood */}
            <div className="relative">
              <label className="block text-slate-400 font-semibold mb-0.5 font-mono uppercase text-[9px]">Bairro (Digite para Buscar):</label>
              <input
                type="text"
                placeholder="Digite o nome do bairro..."
                value={neighborhoodInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setNeighborhoodInput(val);
                  setSelectedNeighborhood(val);
                  setShowNeighborhoodDropdown(true);
                }}
                onFocus={() => setShowNeighborhoodDropdown(true)}
                onBlur={() => setTimeout(() => setShowNeighborhoodDropdown(false), 200)}
                className="w-full bg-slate-950 border border-slate-800 text-xs font-bold px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-600 text-slate-200"
              />
              {showNeighborhoodDropdown && (
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg shadow-lg z-50 divide-y divide-slate-850">
                  {neighborhoodsList
                     .filter(nb => normalizeString(nb).includes(normalizeString(neighborhoodInput)))
                     .map(nb => (
                      <div
                        key={nb}
                        onClick={() => {
                          setSelectedNeighborhood(nb);
                          setNeighborhoodInput(nb);
                          setShowNeighborhoodDropdown(false);
                          setSelectedStreet('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
                      >
                        {nb}
                      </div>
                    ))}
                  {neighborhoodsList.filter(nb => normalizeString(nb).includes(normalizeString(neighborhoodInput))).length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-500">Nenhum bairro encontrado</div>
                  )}
                </div>
              )}
            </div>

            {/* Autocomplete Street */}
            <div className="relative">
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-slate-400 font-semibold font-mono uppercase text-[9px]">Logradouro (Digite para Buscar):</label>
                {isLoadingStreets && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
              </div>
              <input
                type="text"
                placeholder={selectedNeighborhood ? "Digite o nome da rua..." : "Selecione o bairro primeiro"}
                disabled={!selectedNeighborhood}
                value={streetInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setStreetInput(val);
                  setSelectedStreet(val);
                  setShowStreetDropdown(true);
                }}
                onFocus={() => setShowStreetDropdown(true)}
                onBlur={() => setTimeout(() => setShowStreetDropdown(false), 200)}
                className="w-full bg-slate-950 border border-slate-800 text-xs font-bold px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-600 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              {showStreetDropdown && selectedNeighborhood && (
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg shadow-lg z-50 divide-y divide-slate-850">
                  <div
                    onClick={() => {
                      setSelectedStreet('');
                      setStreetInput('');
                      setShowStreetDropdown(false);
                    }}
                    className="px-3 py-2 text-xs text-white font-bold hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    Todos logradouros / Geral do Bairro
                  </div>
                  {streetsList
                    .filter(st => normalizeString(st.street).includes(normalizeString(streetInput)))
                    .map(st => (
                      <div
                        key={st.street}
                        onClick={() => {
                          setSelectedStreet(st.street);
                          setStreetInput(st.street);
                          setShowStreetDropdown(false);
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
                      >
                        {st.street}
                      </div>
                    ))}
                  {streetsList.filter(st => normalizeString(st.street).includes(normalizeString(streetInput))).length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-500">Nenhuma rua encontrada</div>
                  )}
                </div>
              )}
            </div>

            {/* Street Number / Complement */}
            <div>
              <label className="block text-slate-400 font-semibold mb-0.5 font-mono uppercase text-[9px]">Número / Apto / Bloco (Opcional):</label>
              <input
                type="text"
                placeholder="Ex: 572, Apto 302"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs font-bold px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-600 text-slate-200 placeholder:text-slate-600"
              />
            </div>

            {/* Property Type & Size */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 font-mono uppercase text-[9px]">Tipo do Imóvel:</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-bold px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-600 text-slate-200 cursor-pointer"
                >
                  <option value="Apartamento">Apartamento</option>
                  <option value="Casa">Casa</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 font-mono uppercase text-[9px]">Área Privativa (m²):</label>
                <input
                  type="number"
                  value={sizeSqm}
                  onChange={(e) => setSizeSqm(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-bold px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-600 text-slate-200"
                />
              </div>
            </div>

            {/* Bedrooms & Parking */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 font-mono uppercase text-[9px]">Quartos:</label>
                <select
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-bold px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-600 text-slate-200 cursor-pointer"
                >
                  <option value={1}>1 Quarto</option>
                  <option value={2}>2 Quartos</option>
                  <option value={3}>3 Quartos</option>
                  <option value={4}>4+ Quartos</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-0.5 font-mono uppercase text-[9px]">Vagas de Garagem:</label>
                <select
                  value={parkingSpaces}
                  onChange={(e) => setParkingSpaces(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-bold px-2.5 py-2 rounded-lg focus:outline-none focus:border-slate-600 text-slate-200 cursor-pointer"
                >
                  <option value={0}>Sem Vaga</option>
                  <option value={1}>1 Vaga</option>
                  <option value={2}>2 Vagas</option>
                  <option value={3}>3+ Vagas</option>
                </select>
              </div>
            </div>

            {/* Custom Adjusted Value */}
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-slate-400 font-semibold font-mono uppercase text-[9px]">Preço Ajustado / Negociado (Opcional):</label>
                {customValue !== '' && (
                  <button
                    onClick={() => setCustomValue('')}
                    className="text-[8px] text-rose-400 hover:text-rose-300 font-bold uppercase transition-colors cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 focus-within:border-slate-600 transition-all">
                <span className="text-slate-500 font-bold text-[9px] mr-1">R$</span>
                <input
                  type="number"
                  placeholder="Deixe em branco para usar média ITBI"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-left bg-transparent border-0 py-2 outline-none text-slate-200 font-bold text-xs font-mono"
                />
              </div>
            </div>

            {/* Unified Action button (3-in-1) immediately after last item */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleExecuteFullAnalysis}
                disabled={!selectedNeighborhood || isExecutingFullAnalysis}
                className="w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md hover:shadow-indigo-500/25 cursor-pointer disabled:cursor-not-allowed border border-indigo-400/40"
                title="Executa automaticamente a análise de ITBI (Prédio/Rua), Varredura Online e Portais em simultâneo"
              >
                {isExecutingFullAnalysis ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span className="font-black text-white uppercase tracking-wider">Executando Análise Completa...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="font-black text-white uppercase tracking-wider">Executar Análise Completa de Mercado (3-em-1)</span>
                  </>
                )}
              </button>

              {/* Botão de Análise Jurídica de Matrícula & Edital */}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('secao-due-diligence-juridica');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm border border-indigo-500/40 hover:border-indigo-400 cursor-pointer"
                title="Leva direto para a guia de Auditoria Técnica da Matrícula & Edital do Leilão"
              >
                <Scale className="w-4 h-4 text-indigo-400" />
                <span className="font-black uppercase tracking-wider">Auditoria da Matrícula & Edital</span>
              </button>

              <p className="text-[9px] text-slate-400 text-center mt-1 font-sans">
                Cruza ITBI (Prédio/Rua), Varredura Online, Portais, Matrícula e Edital em tempo real.
              </p>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Results Cards (8/12 width, fills 100% of the right container) */}
        <div className="lg:col-span-8 w-full min-w-0">
          
          {/* Top Panels Side-by-Side: 1. Auction Costs Breakdown (Left) & 2. 1-to-1 Comparison Matrix (Right) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full h-full">
            
            {/* CARD 1: LANCE DE ARREMATAÇÃO & COMPOSIÇÃO DE CUSTOS */}
            <div data-tour="calc-costs" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3 w-full min-w-0">
              
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-white">
                  <Coins className="w-4 h-4 text-white" />
                  <span className="text-xs font-black uppercase tracking-wider font-mono text-white">1. LANCE & CUSTOS DE ARREMATAÇÃO</span>
                </div>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold border ${
                  acquisitionMode === 'judicial' 
                    ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60' 
                    : acquisitionMode === 'extrajudicial'
                    ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                }`}>
                  {acquisitionMode === 'judicial' ? 'Leilão Judicial (25%)' : acquisitionMode === 'extrajudicial' ? 'Leilão Extrajudicial (30%)' : 'Venda Direta Caixa (5%)'}
                </span>
              </div>

              {/* Bid Input */}
              <div className="space-y-1">
                <label className="block text-[9.5px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                  Lance de Arremate / Preço de Compra:
                </label>
                <div className="flex items-center bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 focus-within:border-slate-600 transition-all">
                  <span className="text-white font-black text-sm mr-1.5 font-mono">R$</span>
                  <input
                    type="text"
                    value={arremateInputStr}
                    onChange={(e) => handleArremateChange(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none text-white font-black text-sm sm:text-base font-mono"
                    placeholder="Digite o lance..."
                  />
                </div>
              </div>

              {/* Acquisition Mode Selector Toggle (Directly below Bid Input - Judicial, Extrajudicial, Caixa) */}
              <div className="space-y-1.5">
                <label className="block text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                  Regra de Aquisição:
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setAcquisitionMode('judicial')}
                    className={`py-1.5 px-1.5 rounded-lg font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      acquisitionMode === 'judicial'
                        ? 'bg-indigo-600 text-white shadow font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[9.5px] truncate">1. Judicial (25%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAcquisitionMode('extrajudicial')}
                    className={`py-1.5 px-1.5 rounded-lg font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      acquisitionMode === 'extrajudicial'
                        ? 'bg-purple-600 text-white shadow font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[9.5px] truncate">2. Extrajudicial (30%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAcquisitionMode('caixa')}
                    className={`py-1.5 px-1.5 rounded-lg font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      acquisitionMode === 'caixa'
                        ? 'bg-emerald-600 text-white shadow font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[9.5px] truncate">3. Caixa (5%)</span>
                  </button>
                </div>
              </div>

              {/* Payment Method Selector Toggle (Directly below Acquisition Mode, styled like 1-a-1 toggle) */}
              <div className="flex items-center justify-between pt-0.5 pb-1">
                <label className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                  Condição de Pagamento:
                </label>
                <div className="inline-flex p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('a_vista')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      paymentMethod === 'a_vista'
                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    💵 À Vista (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('financiado')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      paymentMethod === 'financiado'
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🏦 Financiamento ({downpaymentRatePct}% Entrada)
                  </button>
                </div>
              </div>

              {/* Itemized Costs Breakdown with Direct Clean R$ Inputs (No white borders) */}
              <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs font-mono">
                
                {/* Entrada no Financiamento (quando selecionado Financiamento) */}
                {paymentMethod === 'financiado' && (
                  <>
                    <div className="flex justify-between items-center text-slate-200 text-xs py-1.5 border-b border-emerald-800/40 bg-emerald-950/20 px-2 rounded-lg -mx-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-emerald-300 font-bold">
                          Entrada do Arremate ({downpaymentRatePct}%):
                        </span>
                      </div>
                      <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded-lg border border-emerald-700/50">
                        <span className="text-emerald-500 mr-1 text-[9.5px]">R$</span>
                        <span className="text-right text-emerald-300 font-black text-xs font-mono">
                          {formatBRL(downpaymentVal)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-slate-400 text-[10.5px] py-0.5 border-b border-slate-850 px-1">
                      <span className="text-slate-400">
                        Saldo Financiado/Parcelado ({100 - downpaymentRatePct}%):
                      </span>
                      <span className="text-right text-slate-300 font-semibold font-mono text-xs">
                        {formatBRL(financedBalance)}
                      </span>
                    </div>
                  </>
                )}

                {/* Leiloeiro (Hidden / Zeroed in Venda Direta Caixa) */}
                {isAuction ? (
                  <div className="flex justify-between items-center text-slate-200 text-xs py-1 border-b border-slate-850">
                    <span className="text-slate-300 font-bold">Comissão Leiloeiro (5%):</span>
                    <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 mr-1 text-[9.5px]">R$</span>
                      <input
                        type="number"
                        value={auctioneerFeeInput !== null ? auctioneerFeeInput : defaultAuctioneerFee}
                        onChange={(e) => setAuctioneerFeeInput(e.target.value === '' ? null : Number(e.target.value))}
                        className="w-24 bg-transparent border-0 outline-none text-right text-white font-black text-xs font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-slate-200 text-xs py-1 border-b border-slate-850">
                    <span className="text-slate-300 font-bold">Comissão Leiloeiro:</span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      Isento (Venda Direta Caixa) - R$ 0
                    </span>
                  </div>
                )}

                {/* ITBI */}
                <div className="flex justify-between items-center text-slate-200 text-xs py-1 border-b border-slate-850">
                  <span className="text-slate-300 font-bold">ITBI (3%):</span>
                  <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 mr-1 text-[9.5px]">R$</span>
                    <input
                      type="number"
                      value={itbiFeeInput !== null ? itbiFeeInput : defaultItbiFee}
                      onChange={(e) => setItbiFeeInput(e.target.value === '' ? null : Number(e.target.value))}
                      className="w-24 bg-transparent border-0 outline-none text-right text-white font-black text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Cartório / RGI (3%) */}
                <div className="flex justify-between items-center text-slate-200 text-xs py-1 border-b border-slate-850">
                  <span className="text-slate-300 font-bold">Cartório / RGI (3%):</span>
                  <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 mr-1 text-[9.5px]">R$</span>
                    <input
                      type="number"
                      value={registryFeeInput !== null ? registryFeeInput : defaultRegistryFee}
                      onChange={(e) => setRegistryFeeInput(e.target.value === '' ? null : Number(e.target.value))}
                      className="w-24 bg-transparent border-0 outline-none text-right text-white font-black text-xs font-mono"
                    />
                  </div>
                </div>

                {/* IPTU em Atraso (Débito Pendente) */}
                <div className="flex justify-between items-center text-slate-200 text-xs py-1 border-b border-slate-850">
                  <span className="text-slate-300 font-bold">IPTU em Atraso:</span>
                  <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 mr-1 text-[9.5px]">R$</span>
                    <input
                      type="number"
                      value={iptuDebtInput}
                      onChange={(e) => setIptuDebtInput(Number(e.target.value))}
                      className="w-24 bg-transparent border-0 outline-none text-right text-white font-black text-xs font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Condomínio em Atraso (Débito Pendente) */}
                <div className="flex justify-between items-center text-slate-200 text-xs py-1 border-b border-slate-850">
                  <span className="text-slate-300 font-bold">
                    {acquisitionMode === 'caixa' ? 'Condomínio em atraso: limite do arrematante (até 10% da avaliação):' : 'Condomínio em Atraso:'}
                  </span>
                  <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 mr-1 text-[9.5px]">R$</span>
                    <input
                      type="number"
                      value={condoDebtInput}
                      onChange={(e) => setCondoDebtInput(Number(e.target.value))}
                      className="w-24 bg-transparent border-0 outline-none text-right text-white font-black text-xs font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Configurable Renovation Cost */}
                <div className="flex justify-between items-center text-slate-200 text-xs py-1 border-b border-slate-850">
                  <span className="text-slate-300 font-bold">Reforma Estimada:</span>
                  <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 mr-1 text-[9.5px]">R$</span>
                    <input
                      type="number"
                      value={reformCostInput}
                      onChange={(e) => setReformCostInput(Number(e.target.value))}
                      className="w-24 bg-transparent border-0 outline-none text-right text-white font-black text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Configurable Legal / Eviction Cost */}
                <div className="flex justify-between items-center text-slate-200 text-xs pt-1">
                  <span className="text-slate-300 font-bold">Desocupação / Custas:</span>
                  <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 mr-1 text-[9.5px]">R$</span>
                    <input
                      type="number"
                      value={legalCostInput}
                      onChange={(e) => setLegalCostInput(Number(e.target.value))}
                      className="w-24 bg-transparent border-0 outline-none text-right text-white font-black text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Total Acquisition Summary Box with both Financed Scenario and Full Cost */}
              {paymentMethod === 'financiado' ? (
                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3.5 space-y-1.5 shadow-lg shadow-emerald-950/20">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[9.5px] text-emerald-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        CUSTO EFETIVO DE ENTRADA (C/ FINANCIAMENTO):
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        Entrada ({downpaymentRatePct}%) + Todas as Despesas de Cartório/Reforma/Débitos
                      </span>
                    </div>
                    <span className="text-base sm:text-xl font-black text-emerald-300 font-mono">
                      {formatBRL(entryFinancingTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-850 text-xs">
                    <span className="text-slate-400 font-sans">Custo Total de Entrada (À Vista / Valor Integral):</span>
                    <span className="font-bold text-slate-300 font-mono text-xs">
                      {formatBRL(totalArremateAcquisitionCost)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Custo Efetivo de Entrada por m² ({sizeSqm}m²):</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      R$ {entryEffectiveSqm.toLocaleString('pt-BR')}/m²
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9.5px] text-slate-400 font-mono font-bold uppercase tracking-wider">CUSTO TOTAL DE ENTRADA (À VISTA):</span>
                    <span className="text-base sm:text-lg font-black text-white font-mono">{formatBRL(totalArremateAcquisitionCost)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-850 text-xs">
                    <span className="text-slate-400 font-sans">Custo Efetivo por m² ({sizeSqm}m²):</span>
                    <span className="font-bold text-white font-mono text-sm">R$ {arremateEffectiveSqm.toLocaleString('pt-BR')}/m²</span>
                  </div>
                </div>
              )}

              {/* Proximity Radius Slider */}
              <div className="pt-1.5 border-t border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-400 font-semibold font-mono uppercase text-[9px]">Raio do Entorno da Pesquisa:</label>
                  <span className="text-xs font-bold text-white font-mono">{radiusKm.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                />
              </div>
            </div>

            {/* CARD 2: MATRIZ COMPARATIVA 1-A-1: CUSTO EFETIVO VS DADOS DO MERCADO */}
            <div data-tour="calc-benchmarks" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3 w-full min-w-0">
              <div className="flex flex-wrap justify-between items-center gap-2 pb-2.5 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-white">
                  <TrendingUp className="w-4 h-4 text-white" />
                  <span className="text-xs font-black uppercase tracking-wider font-mono text-white">2. COMPARATIVO 1-A-1 (LUCRO & ROI)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="inline-flex p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTxSizeFilter('similar')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        txSizeFilter === 'similar'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Áreas Similares (±33%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxSizeFilter('all')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        txSizeFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas Metragens
                    </button>
                  </div>
                  <span className="text-[9.5px] bg-slate-800/80 text-amber-300 border border-slate-700/60 px-2 py-0.5 rounded font-mono font-bold hidden sm:inline" title="Custo total efetivo de arrematação por m² (lance + todas as custas ÷ área privativa)">
                    Custo do Arrematante: R$ {arremateEffectiveSqm.toLocaleString('pt-BR')}/m²
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {marketTiers.map((tier) => {
                  const IconComponent = tier.icon;
                  const isStreetLow = tier.id === 'street' && (tier.isFewSamples || (tier.count > 0 && tier.count < 5) || tier.isCascadeProtected);
                  return (
                    <div 
                      key={tier.id}
                      className={`p-3 rounded-xl border transition-all ${
                        tier.sqm && tier.sqm > 0
                          ? isStreetLow
                            ? 'bg-rose-950/25 border-rose-500/60 shadow-xs ring-1 ring-rose-500/30'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/40 border-slate-850 opacity-50'
                      }`}
                    >
                      <div className="space-y-1.5">
                        {/* Linha Superior: Nome do Nivel e Preço Calculado de Venda */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            {isLoadingTransactions && (tier.id === 'building' || tier.id === 'street') ? (
                              <Loader2 className="w-4 h-4 shrink-0 text-indigo-400 animate-spin" />
                            ) : (
                              <IconComponent className={`w-4 h-4 shrink-0 ${isStreetLow ? 'text-rose-400' : tier.id === 'building' ? 'text-emerald-400' : 'text-indigo-400'}`} />
                            )}
                            <div className="flex flex-col">
                              <span className="text-xs sm:text-[13px] font-bold text-white leading-tight flex items-center gap-1.5 flex-wrap">
                                <span>{tier.label}</span>
                                {isStreetLow ? (
                                  <span className="text-[9.5px] font-bold text-rose-400 font-mono flex items-center gap-1">
                                    ⚠️ Poucas amostras ({tier.count} tx)
                                    <span className="text-amber-300 font-normal"> • 🛡️ Calibração Conservadora</span>
                                  </span>
                                ) : tier.isCascadeProtected ? (
                                  <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-mono font-medium">
                                    Calibrado
                                  </span>
                                ) : null}
                              </span>
                              {tier.isFewSamples && !isStreetLow && (
                                <span className="text-[9.5px] font-medium text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                                  ℹ️ Amostragem na via ({tier.count} tx)
                                  {tier.isCascadeProtected && <span className="text-slate-400 font-normal"> | Calibrado</span>}
                                </span>
                              )}
                            </div>
                          </div>

                          {tier.sqm && tier.sqm > 0 ? (
                            <div className="text-right font-mono shrink-0">
                              <span className="text-xs sm:text-sm font-black block text-white">
                                {formatBRL(tier.saleValue)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">-</span>
                          )}
                        </div>

                        {/* Linha Inferior: Base do m² e Indicadores de Lucro / ROI */}
                        {tier.sqm && tier.sqm > 0 && (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-850/80 text-xs font-mono">
                            <span className="text-[9.5px] font-mono text-slate-400">
                              R$ {tier.sqm.toLocaleString('pt-BR')}/m² ({tier.samples})
                            </span>

                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-black ${tier.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {tier.grossProfit >= 0 ? '+' : ''}{formatBRL(tier.grossProfit)}
                              </span>
                              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-lg border ${
                                tier.roi >= 0 
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' 
                                  : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                              }`}>
                                {tier.roi}% ROI
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[9.5px] text-slate-300 leading-relaxed font-sans">
                💡 <strong>Dica de Investidor:</strong> O ROI e o Lucro Bruto são calculados diretamente sobre o <strong>Custo Total de Entrada ({formatBRL(totalArremateAcquisitionCost)})</strong> com todas as despesas inclusas.
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Etapa 2 Badge */}
      <div className="flex items-center gap-2 pt-4">
        <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase font-mono tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
          <span>ETAPA 2 DE 4</span> • <span>Simulador de Viabilidade: Locação vs Flip (Revenda)</span>
        </span>
      </div>

      {/* COMPACT FULL-WIDTH SIMULATOR: LOCAÇÃO VS FLIP (REVENDA) */}
      <div data-tour="calc-flip-rental" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm text-slate-100 space-y-4 mt-2 w-full">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Flame className="w-5 h-5 text-white" />
            <h3 className="font-black text-sm sm:text-base text-white font-mono uppercase tracking-wider">
              Simulador de Viabilidade: Locação vs Flip (Revenda)
            </h3>
          </div>

          {/* Monthly Holding Inputs (Clean dark inputs without white borders) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Custos Mensais:</span>
            <div className="flex items-center bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 mr-1 text-[9.5px] font-sans font-bold">Condomínio:</span>
              <span className="text-slate-500 mr-0.5 text-[9px]">R$</span>
              <input
                type="number"
                value={monthlyCondoInput}
                onChange={(e) => setMonthlyCondoInput(Number(e.target.value))}
                className="w-14 bg-transparent text-white font-bold text-[11px] outline-none text-right"
              />
            </div>
            <div className="flex items-center bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 mr-1 text-[9.5px] font-sans font-bold">IPTU:</span>
              <span className="text-slate-500 mr-0.5 text-[9px]">R$</span>
              <input
                type="number"
                value={monthlyIptuInput}
                onChange={(e) => setMonthlyIptuInput(Number(e.target.value))}
                className="w-12 bg-transparent text-white font-bold text-[11px] outline-none text-right"
              />
            </div>
            <div className="flex items-center bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 mr-1 text-[9.5px] font-sans font-bold">Outros:</span>
              <span className="text-slate-500 mr-0.5 text-[9px]">R$</span>
              <input
                type="number"
                value={monthlyExtraInput}
                onChange={(e) => setMonthlyExtraInput(Number(e.target.value))}
                className="w-12 bg-transparent text-white font-bold text-[11px] outline-none text-right"
              />
            </div>

            {/* Financiamento (Parcela) & Juros Anuais lado a lado */}
            <div className="flex items-center bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 mr-1 text-[9.5px] font-sans font-bold">Financiamento:</span>
              <span className="text-slate-500 mr-0.5 text-[9px]">R$</span>
              <input
                type="number"
                placeholder="0"
                value={monthlyFinancingInput || ''}
                onChange={(e) => setMonthlyFinancingInput(Number(e.target.value))}
                className="w-14 bg-transparent text-white font-bold text-[11px] outline-none text-right placeholder:text-slate-600"
                title="Parcela mensal total do financiamento"
              />
            </div>

            <div className="flex items-center bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 mr-1 text-[9.5px] font-sans font-bold">Juros:</span>
              <input
                type="number"
                step="0.1"
                value={annualInterestRateInput}
                onChange={(e) => setAnnualInterestRateInput(Number(e.target.value))}
                className="w-10 bg-transparent text-white font-bold text-[11px] outline-none text-right"
                title="Taxa de juros anual do financiamento (% a.a.)"
              />
              <span className="text-slate-500 ml-0.5 text-[9px]">% a.a.</span>
            </div>

            {monthlyFinancingInput > 0 && (
              <span className="text-[9px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded" title="Apenas a parcela de juros entra no custo de carregamento, pois a amortização é recuperada na quitação da venda">
                Juros: R$ {monthlyInterestCost.toLocaleString('pt-BR')}/mês
              </span>
            )}

            <span className="text-white font-black text-xs pl-2 border-l border-slate-800">
              Total Carregamento: R$ {totalMonthlyHolding.toLocaleString('pt-BR')}/mês
            </span>
          </div>
        </div>

        {/* Two High-End Simulation Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* QUADRO 1: RENDA PASSIVA / LOCAÇÃO */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3.5 shadow-sm">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
              <span className="text-xs font-black text-white uppercase font-mono flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white" />
                Renda Passiva / Locação
              </span>
              <span className="text-xs bg-slate-800 text-white font-mono px-2.5 py-1 rounded-lg font-bold border border-slate-700">
                {netRentalYieldAnnual.toFixed(1)}% a.a. Líquido Real
              </span>
            </div>

            {/* 3-Row Vertical Rental Breakdown */}
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">1. Aluguel Estimado (Mercado Geral)</span>
                  <span className="text-[8.5px] text-slate-500 font-sans">Retorno bruto estimado em ~0.55% ao mês sobre o valor de avaliação</span>
                </div>
                <div className="text-right">
                  <strong className="text-white text-sm block">
                    {formatBRL(grossRentMonthly)}/mês
                  </strong>
                  <span className="text-[8.5px] text-emerald-400 font-mono">~0.55% a.m. bruto</span>
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-indigo-300 block uppercase font-bold">2. Referência Portais Ativos (Zap / QuintoAndar)</span>
                  <span className="text-[8.5px] text-slate-500 font-sans">Média dos anúncios de locação ativos na região (~R$ {Math.round(portalRentalBenchmarkMonthly / sizeSqm)}/m²)</span>
                </div>
                <div className="text-right">
                  <strong className="text-indigo-300 text-sm block">
                    {formatBRL(portalRentalBenchmarkMonthly)}/mês
                  </strong>
                  <span className="text-[8.5px] text-indigo-400/80 font-mono">Pedida em Anúncio</span>
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-emerald-400 block uppercase font-bold">3. Lucro Líquido no Bolso (Pós-Custos)</span>
                  <span className="text-[8.5px] text-slate-500 font-sans">Descontados alíquota de IR ({rentalIrDeductionPct}%), taxa de administração e provisão de vacância</span>
                </div>
                <div className="text-right">
                  <strong className="text-emerald-400 text-sm sm:text-base block">
                    {formatBRL(netRentMonthly)}/mês
                  </strong>
                  <span className="text-[8.5px] text-emerald-300/80 font-mono">{netRentalYieldAnnual.toFixed(1)}% a.a. líquido</span>
                </div>
              </div>
            </div>

            {/* Professional High-Fidelity Cashflow Curve (Bloomberg / Institutional Wealth Style) */}
            <div className="bg-[#0b1220] p-3.5 rounded-xl border border-slate-800/90 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                  📈 Curva de Retorno Acumulado no Tempo
                </span>
                <span className="text-white font-black">
                  60m: {formatBRL(netRentMonthly * 60)}
                </span>
              </div>

              {/* SVG High-Precision Spline Chart */}
              <div className="w-full h-20 relative flex items-center justify-center">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 340 65" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="locacaoGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Lines */}
                  <line x1="15" y1="15" x2="325" y2="15" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3,3" />
                  <line x1="15" y1="35" x2="325" y2="35" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3,3" />
                  <line x1="15" y1="55" x2="325" y2="55" stroke="#1e293b" strokeWidth="0.75" />

                  {/* Subtle Translucent Gradient Area */}
                  <path
                    d="M 15 55 Q 110 48, 180 32 T 325 10 L 325 55 Z"
                    fill="url(#locacaoGlow)"
                  />
                  
                  {/* High Contrast White/Cobalt Curve */}
                  <path
                    d="M 15 55 Q 110 48, 180 32 T 325 10"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Beacon Milestone Points with Glow Halos */}
                  <circle cx="15" cy="55" r="3" fill="#ffffff" />
                  <circle cx="92" cy="46" r="3" fill="#ffffff" />
                  <circle cx="170" cy="32" r="3" fill="#ffffff" />
                  <circle cx="247" cy="20" r="3" fill="#ffffff" />
                  <circle cx="325" cy="10" r="3.5" fill="#60a5fa" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Curve Timeline Axis Labels */}
              <div className="grid grid-cols-5 text-center text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[8px]">0m</span>
                  <span className="text-white font-bold">R$ 0</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px]">12m (1a)</span>
                  <span className="text-white font-bold">{formatBRL(netRentMonthly * 12)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px]">24m (2a)</span>
                  <span className="text-white font-bold">{formatBRL(netRentMonthly * 24)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px]">36m (3a)</span>
                  <span className="text-white font-bold">{formatBRL(netRentMonthly * 36)}</span>
                </div>
                <div>
                  <span className="text-slate-300 block text-[8px] font-bold">60m (5a)</span>
                  <span className="text-white font-black">{formatBRL(netRentMonthly * 60)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QUADRO 2: FLIP / REVENDA RÁPIDA */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3.5 shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-2 pb-2.5 border-b border-slate-800">
              <span className="text-xs font-black text-white uppercase font-mono flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-white" />
                Flip / Revenda Rápida
              </span>
              
              {/* Editable Exit Price Input (Clean dark input without white borders) */}
              <div className="flex items-center bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-400 font-mono font-bold mr-1.5">Preço Saída: R$</span>
                <input
                  type="number"
                  value={customExitPrice !== null ? customExitPrice : suggestedQuickSaleTotal}
                  onChange={(e) => setCustomExitPrice(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-24 bg-transparent text-right text-white font-black text-xs font-mono outline-none"
                  placeholder="Preço de venda..."
                />
              </div>
            </div>

            {/* Flip Scenarios Matrix by Months */}
            <div className="space-y-1.5 text-xs font-mono">
              {flipScenariosData.map((sc) => (
                <div key={sc.months} className="flex justify-between items-center bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-white text-xs font-bold">
                    Venda em {sc.months} {sc.months === 1 ? 'mês' : 'meses'}:
                  </span>
                  <span className="text-[9px] text-slate-400 font-sans">
                    -R$ {sc.holdingCost.toLocaleString('pt-BR')} custos
                  </span>
                  <div className="text-right">
                    <span className={`text-xs font-black mr-2 ${sc.netProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
                      {sc.netProfit >= 0 ? '+' : ''}{formatBRL(sc.netProfit)}
                    </span>
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-white border border-slate-700">
                      {sc.netRoi}% ROI
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Flip Visual Holding Drag Decay Curve */}
            <div className="bg-[#0b1220] p-3.5 rounded-xl border border-slate-800/90 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                  📉 Curva de Retorno com o Tempo de Carregamento
                </span>
                <span className="text-white font-black">
                  Pico Ideal: 1 a 6 meses
                </span>
              </div>

              {/* SVG High-Precision Decay Spline */}
              <div className="w-full h-20 relative flex items-center justify-center">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 340 65" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="flipGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Lines */}
                  <line x1="15" y1="15" x2="325" y2="15" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3,3" />
                  <line x1="15" y1="35" x2="325" y2="35" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3,3" />
                  <line x1="15" y1="55" x2="325" y2="55" stroke="#1e293b" strokeWidth="0.75" />

                  {/* Subtle Translucent Gradient Area */}
                  <path
                    d="M 15 12 Q 120 16, 200 34 T 325 55 L 325 55 L 15 55 Z"
                    fill="url(#flipGlow)"
                  />
                  
                  {/* High Contrast White Curve */}
                  <path
                    d="M 15 12 Q 120 16, 200 34 T 325 55"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Beacon Milestone Points with Glow Halos */}
                  <circle cx="15" cy="12" r="3.5" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="68" cy="15" r="3" fill="#ffffff" />
                  <circle cx="145" cy="24" r="3" fill="#ffffff" />
                  <circle cx="235" cy="42" r="3" fill="#ffffff" />
                  <circle cx="325" cy="55" r="3" fill="#ffffff" />
                </svg>
              </div>

              {/* Curve Timeline Axis Labels */}
              <div className="grid grid-cols-5 text-center text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-300 block font-bold text-[8px]">1m (Pico)</span>
                  <span className="text-white font-bold">
                    {formatBRL(activeFlipExitPrice - totalArremateAcquisitionCost - (totalMonthlyHolding * 1) - Math.round(activeFlipExitPrice * 0.04))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px]">3m</span>
                  <span className="text-white font-bold">
                    {formatBRL(activeFlipExitPrice - totalArremateAcquisitionCost - (totalMonthlyHolding * 3) - Math.round(activeFlipExitPrice * 0.04))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-300 block font-bold text-[8px]">6m (Alvo)</span>
                  <span className="text-white font-bold">
                    {formatBRL(activeFlipExitPrice - totalArremateAcquisitionCost - (totalMonthlyHolding * 6) - Math.round(activeFlipExitPrice * 0.04))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px]">12m</span>
                  <span className="text-white font-bold">
                    {formatBRL(activeFlipExitPrice - totalArremateAcquisitionCost - (totalMonthlyHolding * 12) - Math.round(activeFlipExitPrice * 0.04))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px]">24m</span>
                  <span className="text-white font-bold">
                    {formatBRL(activeFlipExitPrice - totalArremateAcquisitionCost - (totalMonthlyHolding * 24) - Math.round(activeFlipExitPrice * 0.04))}
                  </span>
                </div>
              </div>
            </div>

            {/* Explanatory Footnote for Investors */}
            <p className="text-[9.5px] text-slate-400 font-sans italic text-center sm:text-left leading-relaxed">
              * O Lucro Líquido e o ROI já estão calculados deduzindo a comissão do corretor (4%) e o Imposto de Renda sobre Ganho de Capital (15% IRPF).
            </p>

          </div>

        </div>

      </div>
          
      {/* Etapa 3 Badge */}
      <div className="flex items-center gap-2 pt-4">
        <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase font-mono tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
          <span>ETAPA 3 DE 4</span> • <span>Auditoria Técnica da Matrícula & Edital (Due Diligence Jurídica)</span>
        </span>
      </div>
          
      {/* SEÇÃO AUTÔNOMA: AUDITORIA TÉCNICA DA MATRÍCULA & EDITAL DO LEILÃO (DUE DILIGENCE JURÍDICA) */}
      <div id="secao-due-diligence-juridica" data-tour="calc-due-diligence" className="mt-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        
        {/* Header da Seção */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-950/80 border border-indigo-800/60 rounded-2xl text-indigo-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-base sm:text-lg flex items-center gap-2.5 flex-wrap">
                <span>Auditoria Técnica da Matrícula & Edital (Due Diligence Jurídica)</span>
                {matriculaReport && (
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md border font-black ${
                    matriculaReport.overallStatus === 'REGULAR'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : matriculaReport.overallStatus === 'ALTO_RISCO'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {matriculaReport.overallStatus === 'REGULAR'
                      ? '✓ MATRÍCULA & EDITAL REGULARIZADOS (BAIXO RISCO)'
                      : matriculaReport.overallStatus === 'ALTO_RISCO'
                      ? '🚨 RISCO JURÍDICO ELEVADO / ATENÇÃO CRÍTICA'
                      : '⚠️ GRAVAMES APURADOS / CUIDADOS RECOMENDADOS'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {propertyType} de {sizeSqm}m² • {selectedStreet || 'Logradouro'}, {selectedNeighborhood || 'Bairro'} - {selectedCity}/{selectedState}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              NBR 14.653 • CPC 908 • CTN 130
            </span>
          </div>
        </div>

        {/* Layout 2 Colunas Lado a Lado (Como Aluguel e Flip) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* COLUNA ESQUERDA (5/12): INPUTS MATRÍCULA, EDITAL & AÇÕES */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Card 1: Matrícula (R.I.) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black text-slate-200 uppercase font-mono">1. Certidão de Matrícula (R.I.)</span>
                </div>
                <label className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-indigo-800/60 cursor-pointer transition-all flex items-center space-x-1">
                  <Upload className="w-3 h-3" />
                  <span>Anexar PDF / Imagem</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={handleMatriculaFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadedFileName && (
                <div className="text-[10px] text-emerald-300 font-mono font-bold flex items-center gap-1.5 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Matrícula: {uploadedFileName}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 font-mono uppercase text-[8.5px]">
                    Nº Matrícula:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 142.890 / Livro 2"
                    value={matriculaNumber}
                    onChange={(e) => setMatriculaNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-100 placeholder:text-slate-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 font-mono uppercase text-[8.5px]">
                    Cartório Competente:
                  </label>
                  <input
                    type="text"
                    placeholder={`Ex: Ofício R.I. ${selectedCity}/${selectedState}`}
                    value={registryOffice}
                    onChange={(e) => setRegistryOffice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-100 placeholder:text-slate-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold font-mono uppercase text-[8.5px] mb-1">
                  Texto / Averbações da Matrícula (Opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Cole aqui averbações (R.1, Av.2, penhoras, hipotecas...) se não anexou arquivo..."
                  value={matriculaText}
                  onChange={(e) => setMatriculaText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs font-mono p-2 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-200 placeholder:text-slate-600 resize-none"
                />
              </div>
            </div>

            {/* Card 2: Edital do Leilão & Processo */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-slate-200 uppercase font-mono">2. Edital do Leilão & Processo</span>
                </div>
                <label className="bg-amber-950 hover:bg-amber-900 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-amber-800/60 cursor-pointer transition-all flex items-center space-x-1">
                  <Upload className="w-3 h-3" />
                  <span>Anexar Edital (PDF/TXT)</span>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleEditalFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {editalFileName && (
                <div className="text-[10px] text-amber-300 font-mono font-bold flex items-center gap-1.5 bg-amber-950/40 p-2 rounded-lg border border-amber-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Edital: {editalFileName}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 font-mono uppercase text-[8.5px]">
                    Leiloeiro Oficial:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mega Leilões / Zuk"
                    value={leiloeiroInput}
                    onChange={(e) => setLeiloeiroInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 text-slate-100 placeholder:text-slate-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 font-mono uppercase text-[8.5px]">
                    Nº do Processo Judicial:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0012345-67.2024.8.26.0100"
                    value={processNumberInput}
                    onChange={(e) => setProcessNumberInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 text-slate-100 placeholder:text-slate-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold font-mono uppercase text-[8.5px] mb-1">
                  Regras do Edital / Cláusulas / Decisões:
                </label>
                <textarea
                  rows={2}
                  placeholder="Cole aqui cláusulas do edital, regras de pagamento, decisões de desocupação ou débitos..."
                  value={editalText}
                  onChange={(e) => setEditalText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs font-mono p-2 rounded-lg focus:outline-none focus:border-amber-500 text-slate-200 placeholder:text-slate-600 resize-none"
                />
              </div>
            </div>

            {/* Aviso Informativo Caso o Usuário clique sem anexar */}
            {dueDiligenceNotice && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200 font-sans leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{dueDiligenceNotice}</span>
              </div>
            )}

            {/* Botão de Busca e Download Direto da Caixa */}
            {(prefillData?.auctionLink?.includes('caixa.gov.br') || prefillData?.id?.includes('caixa')) && (
              <button
                type="button"
                onClick={handleFetchCaixaDocs}
                disabled={isFetchingCaixaDocs}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs py-3 px-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer disabled:opacity-60"
              >
                {isFetchingCaixaDocs ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Baixando Matrícula & Edital da Caixa...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>⚡ Baixar Matrícula & Edital da Caixa Automaticamente</span>
                  </>
                )}
              </button>
            )}

            {/* Action Buttons: Analisar Matrícula & Analisar Edital */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => executeRealMatriculaAnalysis(matriculaText, uploadedFileName)}
                disabled={isAuditingMatricula}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 border border-indigo-400/30"
              >
                {isAuditingMatricula ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>Analisar Matrícula</span>
              </button>

              <button
                type="button"
                onClick={() => executeRealEditalAnalysis(editalText, editalFileName)}
                disabled={isAuditingMatricula || isAuditingEdital}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-3 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 border border-amber-400/30"
              >
                {isAuditingEdital ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Scale className="w-4 h-4" />
                )}
                <span>Analisar Edital</span>
              </button>
            </div>

          </div>

          {/* COLUNA DIREITA (7/12): 3 CAIXAS DEDICADAS (MATRÍCULA, EDITAL E PARECER) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* CAIXA 1: APENAS ANÁLISE DA MATRÍCULA (R.I.) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-black text-slate-200 uppercase font-mono">1. Análise Técnica da Matrícula (R.I.)</h4>
                </div>
                {matriculaAuditResult && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                    matriculaAuditResult.overallStatus === 'REGULAR'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                      : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                  }`}>
                    {matriculaAuditResult.overallStatus === 'REGULAR' ? '✓ CERTIDÃO REGULAR' : '⚠️ CONSTRIÇÕES IDENTIFICADAS'}
                  </span>
                )}
              </div>

              {(isFetchingCaixaDocs || isAuditingMatricula) ? (
                <div className="p-8 text-center text-slate-300 text-xs space-y-3 bg-slate-900/60 rounded-xl border border-indigo-500/30">
                  <RefreshCw className="w-8 h-8 mx-auto text-indigo-400 animate-spin" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-100 text-sm">Processando Auditoria Técnica da Matrícula...</p>
                    <p className="text-[11px] text-slate-400 font-mono">Baixando certidão oficial, identificando ônus, penhoras e gravames averbados...</p>
                  </div>
                </div>
              ) : !matriculaAuditResult ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-1.5">
                  <FileText className="w-6 h-6 mx-auto text-slate-600 opacity-60" />
                  <p className="font-semibold text-slate-400">Aguardando certidão de matrícula...</p>
                  <p className="text-[11px] text-slate-500">Anexe o arquivo em PDF ou digite os dados ao lado e clique em "Analisar Matrícula".</p>
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5">
                  <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 flex flex-wrap justify-between gap-2">
                    <span><strong>Nº:</strong> {matriculaAuditResult.matriculaNumber || 'Não informada'}</span>
                    <span className="text-slate-400"><strong>Cartório:</strong> {matriculaAuditResult.registryOffice || 'Cartório de Registro'}</span>
                  </div>

                  {matriculaAuditResult.gravames && matriculaAuditResult.gravames.length > 0 ? (
                    <div className="space-y-2">
                      {(matriculaAuditResult.gravames || []).map((gr, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[11px] font-black text-amber-400 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded">
                              {gr.code || 'Gravame'}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono bg-slate-950 text-slate-300 border border-slate-800">
                              Risco {gr.severity || 'Médio'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-200 text-[11.5px]">{gr.type}</p>
                          <div className="text-[10.5px] text-indigo-300 bg-indigo-950/40 p-1.5 rounded-lg border border-indigo-800/30 leading-relaxed font-mono">
                            ⚖️ <strong>Solução:</strong> {gr.legalSolution}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Matrícula sem ônus reais, hipotecas ou penhoras impeditivas de registro.</span>
                    </div>
                  )}

                  {matriculaAuditResult.pontosApurados && matriculaAuditResult.pontosApurados.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {(matriculaAuditResult.pontosApurados || []).map((pt, idx) => (
                        <div key={idx} className="text-[10.5px] text-slate-300 flex items-start space-x-1.5">
                          <span className="text-emerald-400 shrink-0">•</span>
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CAIXA 2: APENAS ANÁLISE DO EDITAL DO LEILÃO & PROCESSO */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black text-slate-200 uppercase font-mono">2. Análise do Edital do Leilão & Processo</h4>
                </div>
                {editalAuditResult && (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border bg-amber-950/60 text-amber-300 border-amber-800/50">
                    ✓ EDITAL AUDITADO
                  </span>
                )}
              </div>

              {(isFetchingCaixaDocs || isAuditingEdital) ? (
                <div className="p-8 text-center text-slate-300 text-xs space-y-3 bg-slate-900/60 rounded-xl border border-amber-500/30">
                  <RefreshCw className="w-8 h-8 mx-auto text-amber-400 animate-spin" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-100 text-sm">Processando Análise do Edital & Processo...</p>
                    <p className="text-[11px] text-slate-400 font-mono">Cruzando regras de comissão, débitos propter rem e prazos do leilão oficial...</p>
                  </div>
                </div>
              ) : !editalAuditResult ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-1.5">
                  <Scale className="w-6 h-6 mx-auto text-slate-600 opacity-60" />
                  <p className="font-semibold text-slate-400">Aguardando edital do leilão...</p>
                  <p className="text-[11px] text-slate-500">Anexe o edital em PDF ou cole as regras ao lado e clique em "Analisar Edital".</p>
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5">
                  <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span><strong>Processo:</strong> {editalAuditResult.processNumber || 'Processo Judicial'}</span>
                      <span className="text-amber-400 font-bold">{editalAuditResult.leiloeiro || 'Leiloeiro Oficial'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      <strong>Juízo:</strong> {editalAuditResult.court || 'Vara Cível'}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Status de Ocupação & Posse:</span>
                    <p className="text-[11px] text-slate-200">{editalAuditResult.occupationStatus || 'Não informado'}</p>
                  </div>

                  {editalAuditResult.debtRules && editalAuditResult.debtRules.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Regras de Débitos (IPTU / Condomínio):</span>
                      {(editalAuditResult.debtRules || []).map((dr, idx) => (
                        <div key={idx} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[10.5px] text-slate-300 flex items-start space-x-1.5">
                          <span className="text-indigo-400 shrink-0">•</span>
                          <span>{dr}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {editalAuditResult.criticalClauses && editalAuditResult.criticalClauses.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Cláusulas Procedimentais:</span>
                      {(editalAuditResult.criticalClauses || []).map((cc, idx) => (
                        <div key={idx} className="text-[10.5px] text-slate-400 flex items-start space-x-1.5">
                          <span className="text-slate-500 shrink-0">•</span>
                          <span>{cc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
          
      {/* Tabs navigation for detailed views below main board */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-sm flex space-x-1.5 mt-8">
        <button
          onClick={() => setActiveTab('local')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'local'
              ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500/40 font-black'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base Local (ITBI)</span>
        </button>

        <button
          onClick={() => setActiveTab('online')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'online'
              ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500/40 font-black'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Varredura Online</span>
        </button>
      </div>

      {/* Etapa 4 Badge */}
      <div className="flex items-center gap-2 pt-4">
        <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase font-mono tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1.5 shadow-xs">
          <span>ETAPA 4 DE 4</span> • <span>Base Local de ITBI (Análise Precisa de Mercado & Histórico de Escrituras)</span>
        </span>
      </div>

      {/* TABS CONTENT PANELS (Full width detailed listings at bottom) */}
      <AnimatePresence mode="wait">
        {activeTab === 'local' ? (
          
          /* ANALISE PRECISA DE MERCADO (PREDIO, RUA E ENTORNO) */
          <motion.div
            key="local-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Header / Diagnosis Bar */}
            <div data-tour="calc-itbi-history" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-950/60 border border-indigo-900/50 rounded-xl text-indigo-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2 flex-wrap">
                      <span>Análise Precisa de Mercado (Transações Reais de ITBI)</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                        Corte Bidirecional NBR 14.653 • Balizamento Raio ±25%
                      </span>
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/30">
                        {exactBuildingStats ? 'Nível: Prédio Exato' : exactStreetStats ? 'Nível: Mesma Rua' : 'Nível: Entorno / Bairro'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {propertyType} de {sizeSqm}m² • {selectedStreet || 'Rua não selecionada'}{streetNumber ? `, Nº ${streetNumber}` : ''} • {selectedNeighborhood || 'Bairro'}, {selectedCity} - {selectedState}
                    </p>
                  </div>
                </div>

                {/* Interactive Size Filter Toggle (Similar vs All Areas) */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setTxSizeFilter('similar')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                      txSizeFilter === 'similar'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Calcula com base em imóveis de metragens similares (±33%)"
                  >
                    <span>🎯 Áreas Similares ({calculatedStats.minSimilarSize}m²-{calculatedStats.maxSimilarSize}m²)</span>
                  </button>
                  <button
                    onClick={() => setTxSizeFilter('all')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                      txSizeFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Calcula com base em todas as metragens do mercado"
                  >
                    <span>🌐 Todas as Metragens</span>
                  </button>
                </div>
              </div>

              {/* Graphical Comparison of Price Tiers (R$/m²) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    Comparativo Visual de Valor do m² por Nível de Proximidade (Base Homogênea Saneada)
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Dados Oficiais da Prefeitura</span>
                </div>

                {/* Comparative Bars Grid */}
                <div className="space-y-2.5 font-mono text-xs">
                  {/* Tier 1: Exact Building */}
                  {(() => {
                    const isBuildingFew = false; // Alerta removido conforme regra do usuário (amostragem individual de condomínio)
                    const isBuildingCascade = (exactBuildingStats as any)?.isCascadeProtected;
                    return (
                      <div className="p-2.5 rounded-xl border space-y-1.5 transition-all bg-slate-950 border-slate-850">
                        <div className="flex justify-between items-center text-[11px] flex-wrap gap-1">
                          <span className="text-slate-300 font-bold flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-emerald-400" />
                            1. Mesmo Prédio / Edifício {streetNumber ? `(Nº ${cleanNumber(streetNumber)})` : ''}
                          </span>
                          <span className="font-bold text-emerald-400">
                            {exactBuildingStats 
                              ? `R$ ${exactBuildingStats.avgSqm.toLocaleString('pt-BR')}/m² (${exactBuildingStats.count} tx válidas${exactBuildingStats.outliersCount > 0 ? ` • ${exactBuildingStats.outliersCount} expurgada` : ''})` 
                              : streetNumber ? 'Sem transação específica neste número' : 'Informe o número do endereço'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-600 to-emerald-400"
                            style={{ width: `${exactBuildingStats ? Math.min(100, Math.max(15, (exactBuildingStats.avgSqm / (Math.max(averageAskingValue / (sizeSqm || 1), 12000))) * 100)) : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tier 2: Same Street */}
                  {(() => {
                    const isStreetFew = exactStreetStats && exactStreetStats.count > 0 && exactStreetStats.count < 5;
                    const isStreetCascade = (exactStreetStats as any)?.isCascadeProtected;
                    return (
                      <div className={`p-2.5 rounded-xl border space-y-1.5 transition-all ${
                        isStreetFew 
                          ? 'bg-rose-950/25 border-rose-500/50 shadow-xs' 
                          : 'bg-slate-950 border-slate-850'
                      }`}>
                        <div className="flex justify-between items-center text-[11px] flex-wrap gap-1">
                          <span className="text-slate-300 font-bold flex items-center gap-1.5">
                            <MapPin className={`w-3.5 h-3.5 ${isStreetFew ? 'text-rose-400' : 'text-indigo-400'}`} />
                            2. Mesma Rua {selectedStreet ? `(${selectedStreet})` : ''}
                            {isStreetFew && (
                              <span className="text-[9.5px] font-bold text-rose-400 font-mono ml-1">
                                ⚠️ Poucas amostras ({exactStreetStats.count} tx)
                                {isStreetCascade && <span className="text-amber-300 font-normal"> • 🛡️ Calibração Conservadora</span>}
                              </span>
                            )}
                          </span>
                          <span className={`font-bold ${isStreetFew ? 'text-rose-300' : 'text-indigo-400'}`}>
                            {exactStreetStats 
                              ? `R$ ${exactStreetStats.avgSqm.toLocaleString('pt-BR')}/m² (${exactStreetStats.count} tx válidas${exactStreetStats.outliersCount > 0 ? ` • ${exactStreetStats.outliersCount} expurgada` : ''})` 
                              : 'Sem transações registradas nesta rua'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isStreetFew 
                                ? 'bg-gradient-to-r from-rose-600 to-rose-400' 
                                : 'bg-gradient-to-r from-indigo-600 to-indigo-400'
                            }`}
                            style={{ width: `${exactStreetStats ? Math.min(100, Math.max(15, (exactStreetStats.avgSqm / (Math.max(averageAskingValue / (sizeSqm || 1), 12000))) * 100)) : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tier 3: Surrounding Streets */}
                  <div className={`p-2.5 rounded-xl border space-y-1.5 ${
                    (selectedStreet && nearbyStreetTxs.length === 0 && !isLoadingTransactions) 
                      ? 'bg-slate-950/90 border-rose-500/60 shadow-sm shadow-rose-950/30' 
                      : 'bg-slate-950 border-slate-850'
                  }`}>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-violet-400" />
                        3. Ruas do Entorno (Raio ~{radiusKm}km)
                        {isLoadingTransactions ? (
                          <span className="text-[9px] bg-violet-950/80 text-violet-300 px-1.5 py-0.2 rounded border border-violet-800/60 font-mono font-bold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Atualizando raio
                          </span>
                        ) : selectedStreet && nearbyStreetTxs.length === 0 && (
                          <span className="text-[9px] bg-rose-950/80 text-rose-300 px-1.5 py-0.2 rounded border border-rose-800/60 font-mono font-bold">
                            Sem dados no raio
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-violet-400">
                        {isLoadingTransactions ? (
                          <span className="text-violet-300/90 font-mono text-[10.5px]">Consultando distâncias verificadas...</span>
                        ) : selectedStreet && nearbyStreetTxs.length === 0 ? (
                          <span className="text-amber-300/90 font-mono text-[10.5px]">
                            Sem dados no raio • Balizado pelo Bairro (R$ {(neighborhoodStats?.avgSqm || nearbyStats.avgSqm).toLocaleString('pt-BR')}/m²)
                          </span>
                        ) : (
                          `R$ ${nearbyStats.avgSqm.toLocaleString('pt-BR')}/m² (${nearbyStats.count} tx válidas${nearbyStats.outliersCount > 0 ? ` • ${nearbyStats.outliersCount} expurgada(s)` : ''})`
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedStreet && nearbyStreetTxs.length === 0 && !isLoadingTransactions
                            ? 'bg-slate-800'
                            : 'bg-gradient-to-r from-violet-600 to-violet-400'
                        }`}
                        style={{ width: `${selectedStreet && nearbyStreetTxs.length === 0 && !isLoadingTransactions ? 0 : Math.min(100, Math.max(15, (nearbyStats.avgSqm / (Math.max(averageAskingValue / (sizeSqm || 1), 12000))) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Tier 4: Neighborhood Official ITBI */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        4. Média Geral do Bairro ({selectedNeighborhood || 'Bairro'})
                      </span>
                      <span className="font-bold text-amber-400">
                        {neighborhoodStats ? (
                          `R$ ${neighborhoodStats.avgSqm.toLocaleString('pt-BR')}/m² (${neighborhoodStats.count} tx válidas${neighborhoodStats.outliersCount > 0 ? ` • ${neighborhoodStats.outliersCount} expurgada(s)` : ''})`
                        ) : (
                          `R$ ${nearbyStats.avgSqm.toLocaleString('pt-BR')}/m² (Base ITBI Oficial)`
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(15, ((neighborhoodStats?.avgSqm || nearbyStats.avgSqm) / (Math.max(averageAskingValue / (sizeSqm || 1), 12000))) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Tier 5: Real Estate Portals Asking Price - Street */}
                  {(() => {
                    const portalTier = marketTiers.find(t => t.id === 'portals_street');
                    const tierSqm = (portalTier && portalTier.sqm && portalTier.sqm > 0) ? portalTier.sqm : Math.round(averageAskingValue / (sizeSqm || 1));
                    const tierLabel = portalTier?.samples || 'Preço Pedido';
                    return (
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-300 font-bold flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-cyan-400" />
                            5. Anúncios de Venda nos Portais na Rua (Zap / QuintoAndar)
                          </span>
                          <span className="font-bold text-cyan-400">
                            R$ {tierSqm.toLocaleString('pt-BR')}/m² ({tierLabel})
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(15, (tierSqm / (Math.max(averageAskingValue / (sizeSqm || 1), 12000))) * 100))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Synthesis Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 pt-2">
                {/* CARD 1: Valor Unitário Saneado com cálculo explícito e métricas informativas */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono uppercase flex items-center gap-1.5 font-bold">
                      {isLoadingTransactions && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
                      <span>1. Valor Unitário Saneado</span>
                    </span>
                    <span className="text-[8.5px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">
                      {txSizeFilter === 'similar' ? 'Área Similar' : 'Todas Áreas'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    {sanitizedUnitValueSqm > 0 ? (
                      <>
                        <span className="text-base font-black text-white font-mono">
                          R$ {sanitizedUnitValueSqm.toLocaleString('pt-BR')}/m²
                        </span>
                        <span className="text-[11px] font-bold text-slate-300 font-mono">
                          • ({sizeSqm}m² = {formatBRL(sizeSqm * sanitizedUnitValueSqm)})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-black text-amber-400 font-mono">
                          Sem amostragem na via
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          (Sem escrituras na rua ou prédio)
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div className="pt-1 border-t border-slate-900 space-y-0.5">
                    {sanitizedUnitValueSqm > 0 ? (
                      <>
                        <span className="text-[9.5px] text-emerald-400 font-sans block font-semibold">
                          {calculatedStats.source} {calculatedStats.outliersCount > 0 ? `(${calculatedStats.outliersCount} distorção expurgada)` : ''}
                        </span>
                        <div className="text-[9px] text-slate-400 font-mono flex flex-wrap gap-x-2">
                          <span>Média Geral: <strong className="text-slate-300">R$ {calculatedStats.rawAvgSqm.toLocaleString('pt-BR')}/m²</strong></span>
                          <span>• Similar: <strong className="text-indigo-300">R$ {calculatedStats.similarAvgSqm.toLocaleString('pt-BR')}/m²</strong></span>
                        </div>
                      </>
                    ) : (
                      <span className="text-[9.5px] text-slate-400 font-sans block leading-tight">
                        NBR 14.653 veda arbitramento de valor unitário sem amostragem fática na via ou edifício.
                      </span>
                    )}
                  </div>
                </div>

                {/* CARD 2: Média do Valor da Mesma Rua */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-mono uppercase flex items-center gap-1.5 font-bold">
                    {isLoadingTransactions && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
                    <span>2. Média da Mesma Rua</span>
                  </span>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    {exactStreetStats ? (
                      <>
                        <span className="text-base font-black text-indigo-400 font-mono">
                          R$ {exactStreetStats.avgSqm.toLocaleString('pt-BR')}/m²
                        </span>
                        <span className="text-[11px] font-bold text-slate-300 font-mono">
                          • (Total: {formatBRL(sizeSqm * exactStreetStats.avgSqm)})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-black text-slate-400 font-mono">
                          - Sem dados na rua
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          (Balizado pelo Bairro)
                        </span>
                      </>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-900 space-y-0.5">
                    <div className="text-[9.5px] text-slate-300 font-sans">
                      {exactStreetStats ? `Baseado em ${exactStreetStats.count} transações na via` : `Sem escrituras registradas nesta via no ITBI.`}
                    </div>
                    {exactStreetStats && (
                      <div className="text-[9px] text-slate-400 font-mono flex flex-wrap gap-x-2">
                        <span>Similar: <strong className="text-indigo-300">R$ {exactStreetStats.similarAvgSqm.toLocaleString('pt-BR')}/m²</strong></span>
                        <span>• Geral: <strong className="text-slate-300">R$ {exactStreetStats.allAreasAvgSqm.toLocaleString('pt-BR')}/m²</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                  <span className="text-[9px] text-violet-300 font-mono uppercase block font-bold">3. Ruas do Entorno (Raio ~{radiusKm}km)</span>
                  <span className="text-base font-black text-violet-400 font-mono block">
                    {bidiBenchmark?.radiusVerified && bidiBenchmark.raio.validas > 0 ? `${formatBRL(bidiBenchmark.raio.saneada)}/m²` : 'Sem amostras geolocalizadas'}
                  </span>
                  <span className="text-[10px] text-slate-400">{bidiBenchmark?.radiusVerified ? bidiBenchmark.raio.validas : 0} transações no raio</span>
                </div>
                {/* CARD 4: Média Geral do Bairro */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-mono uppercase block font-bold">4. Média Geral do Bairro</span>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-base font-black text-amber-400 font-mono">
                      R$ {(neighborhoodStats?.avgSqm || nearbyStats.avgSqm).toLocaleString('pt-BR')}/m²
                    </span>
                    <span className="text-[11px] font-bold text-slate-300 font-mono">
                      • (Total: {formatBRL(sizeSqm * (neighborhoodStats?.avgSqm || nearbyStats.avgSqm))})
                    </span>
                  </div>

                  <div className="pt-1 border-t border-slate-900 space-y-0.5">
                    <div className="text-[9.5px] text-slate-300 font-sans">
                      {neighborhoodStats ? `${neighborhoodStats.count} transações no ITBI oficial de ${selectedNeighborhood}` : `Média cadastral oficial do ITBI`}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      <span>Bairro: <strong className="text-amber-300">{selectedNeighborhood || 'Bairro'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* CARD 4: Preço Sugerido para Revenda Rápida (Flip) */}
                <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                  (!hasRealMicroData || suggestedQuickSaleTotal === 0 || !hasVerifiedStreetOrBuildingData)
                    ? 'bg-rose-950/20 border-rose-500/50'
                    : 'bg-slate-950 border-slate-850'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono uppercase block font-bold">4. Preço Sugerido p/ Revenda (Flip Rápido)</span>
                    <span className={`text-[8px] px-2 py-0.5 rounded border font-mono font-bold ${
                      (!hasRealMicroData || suggestedQuickSaleTotal === 0 || !hasVerifiedStreetOrBuildingData)
                        ? 'bg-rose-950/80 text-rose-300 border-rose-800/50'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                    }`}>
                      {(!hasRealMicroData || suggestedQuickSaleTotal === 0) ? 'Amostragem Insuficiente' : !hasVerifiedStreetOrBuildingData ? 'Projeção pelo entorno' : 'Giro em até 60 dias'}
                    </span>
                  </div>

                  {(!hasRealMicroData || suggestedQuickSaleTotal === 0) ? (
                    <div className="py-2 space-y-1">
                      <span className="text-sm font-black text-amber-300 font-mono block">
                        Cálculo de Flip Suspenso
                      </span>
                      <p className="text-[9.5px] text-slate-300 leading-relaxed font-sans">
                        A Norma NBR 14.653 exige amostragem comprovada no prédio, na rua ou no raio de 500m. Sem dados da via ou entorno, é vedado arbitrar preço de saída especulativo.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-base font-black text-emerald-400 font-mono">
                          {formatBRL(suggestedQuickSaleTotal)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-300 font-mono">
                          • R$ {suggestedQuickSaleSqm.toLocaleString('pt-BR')}/m²
                        </span>
                      </div>

                      {!hasVerifiedStreetOrBuildingData && (
                        <p className="text-[9.5px] font-bold text-rose-300 border-t border-rose-800/40 pt-1.5">
                          Fonte local insuficiente: valor projetado pelo entorno, sem confirmação no prédio ou na rua.
                        </p>
                      )}

                      {buildingAgeData.detectedYear !== null ? (
                        <div className="text-[9px] bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-800 font-mono flex items-center justify-between">
                          <span>🏗️ Ano: {buildingAgeData.detectedYear} ({buildingAgeData.age} anos)</span>
                          <strong className={buildingAgeData.depreciationPct > 0 ? "text-amber-300" : "text-emerald-400"}>
                            Depreciação: {buildingAgeData.depreciationPct > 0 ? `-${buildingAgeData.depreciationPct}%` : '0% (Conservado)'}
                          </strong>
                        </div>
                      ) : (
                        <div className="text-[9px] bg-slate-900/90 text-slate-400 px-2 py-0.5 rounded border border-slate-800 flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1 font-sans">
                            📅 Ano do Prédio:
                            <input
                              type="number"
                              placeholder="Ex: 2015"
                              min="1900"
                              max={new Date().getFullYear()}
                              value={manualBuildingYear || ''}
                              onChange={(e) => setManualBuildingYear(e.target.value ? parseInt(e.target.value, 10) : null)}
                              className="w-14 px-1 py-0.2 bg-slate-950 border border-slate-700 rounded text-white font-mono text-[9px] text-center focus:border-indigo-500 focus:outline-none"
                            />
                          </span>
                          <span className="text-[8px] text-slate-500 font-mono">
                            {manualBuildingYear ? `${new Date().getFullYear() - manualBuildingYear} anos` : 'Não especificado'}
                          </span>
                        </div>
                      )}
                      
                      <div className="pt-1.5 border-t border-slate-900 space-y-1">
                        <div className="text-[9px] text-slate-400 font-sans flex items-center justify-between">
                          <span>Piso Transacionado (ITBI 4 Níveis):</span>
                          <strong className="text-emerald-400 font-mono">R$ {itbiWeightedStats.itbiCompositeSqm.toLocaleString('pt-BR')}/m²</strong>
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans flex items-center justify-between">
                          <span>Teto Balizador Portais:</span>
                          <strong className="text-cyan-300 font-mono">R$ {portalBenchmarkSqm.toLocaleString('pt-BR')}/m²</strong>
                        </div>
                        <span className="text-[8px] text-slate-500 block font-mono">
                          100% ITBI Oficial dos 4 Níveis com deságio de 10% para liquidez imediata em até 60 dias
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* TABELA 1 (DESTAQUE): Transações no Mesmo Prédio / Número */}
            {exactBuildingTxs.length > 0 && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-900/40">
                  <div className="flex items-center space-x-2">
                    <Building className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-extrabold text-emerald-300 text-sm flex items-center gap-2">
                        <span>Transações Oficiais no Mesmo Prédio / Endereço (Nº {cleanNumber(streetNumber)})</span>
                        <span className="text-[10px] bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                          {exactBuildingTxs.filter(tx => txSizeFilter === 'all' || (tx.sizeSqm >= Math.round(sizeSqm * 0.67) && tx.sizeSqm <= Math.round(sizeSqm * 1.33))).length} imóveis no recorte
                        </span>
                      </h3>
                      <p className="text-[10px] text-emerald-400/80 mt-0.5">
                        Escrituras e impostos de ITBI recolhidos exatamente neste edifício. Clique em uma linha para aplicar os dados na calculadora.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-emerald-900/60 text-emerald-300 font-medium uppercase tracking-wider text-[9px] font-mono">
                        <th className="pb-2">Data</th>
                        <th className="pb-2">Número</th>
                        <th className="pb-2">Complemento / Apto</th>
                        <th className="pb-2 text-center">Área Privativa</th>
                        <th className="pb-2 text-right">Preço Declarado</th>
                        <th className="pb-2 text-right">Valor m²</th>
                        <th className="pb-2">Descrição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/30 text-slate-300">
                      {exactBuildingTxs
                        .filter(tx => txSizeFilter === 'all' || (tx.sizeSqm >= Math.max(15, Math.round(sizeSqm * 0.67)) && tx.sizeSqm <= Math.round(sizeSqm * 1.33)))
                        .map((tx) => (
                        <tr 
                          key={tx.id}
                          onClick={() => {
                            setSizeSqm(tx.sizeSqm);
                            setCustomValue(tx.transactionValue);
                          }}
                          className="hover:bg-emerald-950/40 transition-colors cursor-pointer group"
                          title="Clique para importar esta transação na calculadora"
                        >
                          <td className="py-2.5 font-mono text-emerald-300/80">{tx.date}</td>
                          <td className="py-2.5 font-bold text-white font-mono">{tx.number || '-'}</td>
                          <td className="py-2.5 font-semibold text-emerald-200 group-hover:text-emerald-100 transition-colors">
                            {tx.complement || 'Unidade Principal'}
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold text-white">{tx.sizeSqm}m²</td>
                          <td className="py-2.5 text-right font-mono font-black text-emerald-400">{formatBRL(tx.transactionValue)}</td>
                          <td className="py-2.5 text-right font-mono font-black text-emerald-300">R$ {tx.unitValueSqm.toLocaleString('pt-BR')}/m²</td>
                          <td className="py-2.5 text-[10px] text-slate-400 truncate max-w-[200px]" title={tx.description || ''}>
                            {tx.description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Split comparative lists: Same Street (Left) and Nearby Streets (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Same Street Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <div className="flex items-center space-x-2">
                    <Building className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm">Amostras na Mesma Rua</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Valores reais de ITBI especificamente nesta rua ({selectedStreet || 'todas'}).</p>
                    </div>
                  </div>
                  
                  {/* Size Filter Toggle inside tab */}
                  <button
                    onClick={() => setTxSizeFilter(prev => prev === 'all' ? 'similar' : 'all')}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                      txSizeFilter === 'similar' 
                        ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300 font-semibold shadow-xs' 
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{txSizeFilter === 'similar' ? '🎯 Área Similar (±33%)' : '🌐 Todas as Áreas'}</span>
                  </button>
                </div>

                <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-450 font-medium uppercase tracking-wider text-[9px]">
                        <th className="pb-2 font-semibold">Data</th>
                        <th className="pb-2 font-semibold">Nº / Apto</th>
                        <th className="pb-2 text-center font-semibold">Área</th>
                        <th className="pb-2 text-right font-semibold">Preço Escritura</th>
                        <th className="pb-2 text-right font-semibold">Valor m²</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {exactStreetTxs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-550 italic">
                            Nenhuma transação individual encontrada nesta rua.
                          </td>
                        </tr>
                      ) : (
                        exactStreetTxs
                          .filter(tx => txSizeFilter === 'all' || (tx.sizeSqm >= Math.max(15, Math.round(sizeSqm * 0.67)) && tx.sizeSqm <= Math.round(sizeSqm * 1.33)))
                          .slice(0, 35)
                          .map((tx) => (
                            <tr 
                              key={tx.id} 
                              onClick={() => {
                                setSizeSqm(tx.sizeSqm);
                                setCustomValue(tx.transactionValue);
                              }}
                              className="hover:bg-slate-950/60 transition-colors cursor-pointer group"
                              title="Clique para importar esta transação na calculadora"
                            >
                              <td className="py-2.5 font-mono text-slate-450">{tx.date}</td>
                              <td className="py-2.5 font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                                {tx.number ? `Nº ${tx.number}` : ''}{tx.complement ? ` - ${tx.complement}` : (tx.number ? '' : tx.street || 'Não informado')}
                              </td>
                              <td className="py-2.5 text-center font-mono font-semibold">{tx.sizeSqm}m²</td>
                              <td className="py-2.5 text-right font-mono font-bold text-slate-100">{formatBRL(tx.transactionValue)}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-indigo-400">R$ {tx.unitValueSqm.toLocaleString('pt-BR')}/m²</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Nearby Streets Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-850">
                  <div className="flex items-center space-x-2">
                    <Compass className="w-5 h-5 text-violet-400" />
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                        <span>Amostras nas Ruas Próximas ao Entorno (Raio Exato de {radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm}km`})</span>
                        <span className="text-[10px] bg-violet-950 text-violet-300 px-2 py-0.5 rounded font-mono font-bold border border-violet-800/40">
                          {nearbyStreetTxs.length} tx válidas
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">
                        Transações reais do ITBI estritamente contidas na circunferência de {radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm}km`} a partir do imóvel de referência.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="text-[10px] text-slate-400 font-mono mr-1">Raio:</span>
                    <button
                      onClick={() => setRadiusKm(0.5)}
                      className={`px-2 py-1 text-[10px] rounded font-mono font-bold transition-colors flex flex-col items-center cursor-pointer ${
                        radiusKm === 0.5 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>500m (Padrão)</span>
                      <span className="text-[8.5px] font-normal opacity-90">
                        {radiusAverages.r500 ? `R$ ${radiusAverages.r500.toLocaleString('pt-BR')}/m²` : 'Sem dados'}
                      </span>
                    </button>
                    <button
                      onClick={() => setRadiusKm(1.0)}
                      className={`px-2 py-1 text-[10px] rounded font-mono font-bold transition-colors flex flex-col items-center cursor-pointer ${
                        radiusKm === 1.0 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>1.0 km</span>
                      <span className="text-[8.5px] font-normal opacity-90">
                        {radiusAverages.r1000 ? `R$ ${radiusAverages.r1000.toLocaleString('pt-BR')}/m²` : 'Sem dados'}
                      </span>
                    </button>
                    <button
                      onClick={() => setRadiusKm(2.0)}
                      className={`px-2 py-1 text-[10px] rounded font-mono font-bold transition-colors flex flex-col items-center cursor-pointer ${
                        radiusKm === 2.0 ? 'bg-violet-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>2.0 km</span>
                      <span className="text-[8.5px] font-normal opacity-90">
                        {radiusAverages.r2000 ? `R$ ${radiusAverages.r2000.toLocaleString('pt-BR')}/m²` : 'Sem dados'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-455 font-medium uppercase tracking-wider text-[9px]">
                        <th className="pb-2 font-semibold">Data</th>
                        <th className="pb-2 font-semibold">Logradouro</th>
                        <th className="pb-2 text-center font-semibold">Distância Real</th>
                        <th className="pb-2 text-center font-semibold">Área</th>
                        <th className="pb-2 text-right font-semibold">Preço Escritura</th>
                        <th className="pb-2 text-right font-semibold">Valor m²</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {nearbyStreetTxs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                            {isLoadingTransactions ? 'Carregando transações do ITBI...' : `Nenhuma transação individual encontrada no raio estrito de ${radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm}km`}.`}
                          </td>
                        </tr>
                      ) : (
                        nearbyStreetTxs
                          .filter(tx => txSizeFilter === 'all' || (tx.sizeSqm >= Math.max(15, Math.round(sizeSqm * 0.67)) && tx.sizeSqm <= Math.round(sizeSqm * 1.33)))
                          .slice(0, 35)
                          .map((tx) => {
                            const distMeters = tx.distanceMeters || (typeof tx.distanceKm === 'number' ? Math.round(tx.distanceKm * 1000) : null);
                            return (
                              <tr 
                                key={tx.id} 
                                onClick={() => {
                                  setSizeSqm(tx.sizeSqm);
                                  setCustomValue(tx.transactionValue);
                                }}
                                className="hover:bg-slate-950/60 transition-colors cursor-pointer group"
                                title="Clique para importar esta transação na calculadora"
                              >
                                <td className="py-2.5 font-mono text-slate-450">{tx.date}</td>
                                <td className="py-2.5 font-medium text-slate-300 group-hover:text-indigo-400 transition-colors truncate max-w-[150px] block">
                                  {tx.street || 'Não informado'} {tx.number ? `(${tx.number})` : ''}
                                </td>
                                <td className="py-2.5 text-center">
                                  <span className="px-1.5 py-0.5 rounded bg-violet-950/70 text-violet-300 font-mono text-[10px] font-bold border border-violet-800/40">
                                    {distMeters !== null ? `${distMeters}m` : 'no raio'}
                                  </span>
                                </td>
                                <td className="py-2.5 text-center font-mono font-semibold">{tx.sizeSqm}m²</td>
                                <td className="py-2.5 text-right font-mono font-semibold text-slate-200">{formatBRL(tx.transactionValue)}</td>
                                <td className="py-2.5 text-right font-mono font-bold text-slate-400">R$ {tx.unitValueSqm.toLocaleString('pt-BR')}/m²</td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </motion.div>
        ) : activeTab === 'online' ? (
          
          /* ONLINE MODE DETAILED PANELS */
          <motion.div
            key="online-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {isSearchingOnline ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-xs">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-200">Buscando escrituras, laudos judiciais e impostos pagos na internet...</p>
                <p className="text-xs text-slate-400">Varrendo Data.Rio, Carioca Digital e portais de registros imobiliários confiáveis.</p>
              </div>
            ) : onlineError ? (
              <div className="bg-rose-955/30 border border-rose-900/50 text-rose-350 p-4 rounded-xl text-xs flex items-center space-x-3">
                <Info className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{onlineError}</span>
              </div>
            ) : onlineResults ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Online matching transacted units (5/12 width) */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 pb-2.5 border-b border-slate-850">
                    <Building className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm">Transações Encontradas na Web</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Clique em um registro para carregar o valor na calculadora.</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
                    {!onlineResults || !onlineResults.foundMatches || onlineResults.foundMatches.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">
                        Nenhum registro individual detalhado encontrado online para o número exato. Utilize a média do m² da rua.
                      </p>
                    ) : (
                      onlineResults.foundMatches.map((m, idx) => {
                        if (!m) return null;
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (m.value !== undefined) setCustomValue(m.value);
                              if (m.area) setSizeSqm(m.area);
                            }}
                            className="bg-slate-950 hover:bg-emerald-950/20 border border-slate-850 hover:border-emerald-900/50 rounded-xl p-3.5 transition-all cursor-pointer text-xs space-y-2 group"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                                {m.address || 'Imóvel'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">{m.date || ''}</span>
                            </div>

                            <div className="flex justify-between items-end">
                              <div className="font-mono">
                                <span className="text-slate-450 font-sans block text-[9.5px]">Valor da Escritura:</span>
                                <strong className="text-sm text-slate-100">{formatBRL(m.value || 0)}</strong>
                                {m.area && <span className="text-[10px] text-slate-450 ml-1.5">({m.area} m²)</span>}
                              </div>
                              
                              {m.sourceUrl && (
                                <a
                                  href={m.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>Ver Fonte</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            
                            {m.description && (
                              <p className="text-[10px] text-slate-400 leading-normal border-t border-slate-850 pt-1.5 mt-1.5 italic">
                                {m.description}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* AI report detailed (7/12 width) */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-850">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-emerald-450" />
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm">Laudo de Avaliação (Auditoria da IA - Busca Web)</h3>
                        <p className="text-[10px] text-slate-450 mt-0.5">Tese baseada nas fontes oficiais rastreadas no Google Search.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsOnlineLaudoMinimized(!isOnlineLaudoMinimized)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                      {isOnlineLaudoMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>

                  {!isOnlineLaudoMinimized && (
                    <div className="prose prose-sm max-w-none text-slate-300 text-[11px] leading-relaxed max-h-[300px] overflow-y-auto bg-slate-950 border border-slate-850 rounded-xl p-4 font-sans whitespace-pre-wrap flex-1">
                      {onlineResults.detailedReport}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-xs">
                <Globe className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-200">Aguardando Varredura Online...</p>
                <p className="text-xs text-slate-400">Preencha o formulário e clique em "Varredura Online" para iniciar.</p>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* PDF / Executive Report Export Footer Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 print:hidden">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-300">
            <FileDown className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-sm text-white">Relatório & Laudo de Avaliação em PDF</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Gere um laudo executivo completo com todos os dados da arrematação, comparativos de mercado, análise da matrícula e projeções financeiras.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExecutiveReportOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs px-6 py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer shrink-0 border border-indigo-400/30"
        >
          <FileText className="w-4 h-4" />
          <span>Gerar Laudo Técnico PTAM (PDF)</span>
        </button>
      </div>

      {/* Executive Report Modal */}
      <ExecutiveReportModal
        isOpen={isExecutiveReportOpen}
        onClose={() => setIsExecutiveReportOpen(false)}
        data={{
          state: selectedState,
          city: selectedCity,
          neighborhood: selectedNeighborhood,
          street: selectedStreet,
          streetNumber: streetNumber,
          propertyType: propertyType,
          sizeSqm: sizeSqm,
          bedrooms: bedrooms,
          parkingSpaces: parkingSpaces,
          
          acquisitionMode: acquisitionMode === 'caixa' ? 'caixa' : 'leilao',
          arrematePrice: auctionBid,
          auctioneerFee: auctioneerFee,
          itbiFee: itbiFee,
          registryFee: registryFee,
          reformCost: reformCostInput,
          legalCost: legalCostInput,
          iptuDebt: iptuDebtInput || 0,
          condoDebt: condoDebtInput || 0,
          totalAcquisitionCost: totalArremateAcquisitionCost,
          effectiveSqmCost: arremateEffectiveSqm,
          
          marketTiers: marketTiers,
          
          monthlyCondo: monthlyCondoInput,
          monthlyIptu: monthlyIptuInput,
          monthlyExtra: monthlyExtraInput,
          monthlyFinancing: monthlyFinancingInput || 0,
          annualInterestRate: annualInterestRateInput || 0,
          monthlyInterestCost: monthlyInterestCost,
          totalMonthlyHolding: totalMonthlyHolding,
          
          flipScenarios: flipScenariosData,
          flipExitPrice: activeFlipExitPrice,
          
          grossRentMonthly: grossRentMonthly,
          portalRentalBenchmarkMonthly: portalRentalBenchmarkMonthly,
          irDeductionMonthly: irDeductionMonthly,
          rentalIrDeductionPct: rentalIrDeductionPct,
          netRentMonthly: netRentMonthly,
          netRentalYieldAnnual: netRentalYieldAnnual,
          matriculaReport: matriculaReport || undefined
        }}
      />

    </div>
  );
}
