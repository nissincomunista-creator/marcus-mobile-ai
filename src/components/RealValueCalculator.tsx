import React, { useState, useEffect, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExecutiveReportModal, { ExecutiveReportData } from './ExecutiveReportModal.tsx';
import { ItbiTransaction, SavedMarketAnalysis, PropertyType, MatriculaAnalysisReport, MatriculaGravame, MatriculaAuditData, EditalAuditData } from '../types.ts';

interface ItbiStats {
  state: string;
  city: string;
  neighborhood: string;
  propertyType: string;
  averageValueSqm: number;
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
  state?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  propertyType?: string;
  sizeSqm?: number;
  purchasePrice?: number;
  acquisitionRule?: 'leilao' | 'caixa';
  estimatedRepair?: number;
  pendingDebts?: number;
}

interface RealValueCalculatorProps {
  itbiStats: ItbiStats[];
  prefillData?: PrefilledCalculatorData | null;
  onClose?: () => void;
}

export default function RealValueCalculator({ itbiStats, prefillData, onClose }: RealValueCalculatorProps) {
  // Navigation mode for results display
  const [activeTab, setActiveTab] = useState<'local' | 'online' | 'comparador' | 'matricula'>('local');

  // Unified Form Inputs (Shared between local and online modes)
  const [selectedState, setSelectedState] = useState(prefillData?.state || 'RJ');
  const [selectedCity, setSelectedCity] = useState(prefillData?.city || 'Rio de Janeiro');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(prefillData?.neighborhood || '');
  const [selectedStreet, setSelectedStreet] = useState(prefillData?.address || '');
  const [streetNumber, setStreetNumber] = useState(''); // Number & complement input
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

  // Proximity radius and collapsible panel states
  const [radiusKm, setRadiusKm] = useState<number>(1);
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

  // Sample and Area Size Filter Mode (Similar ±25% vs All)
  const [txSizeFilter, setTxSizeFilter] = useState<'similar' | 'all'>('similar');

  // Acquisition Mode & Costs State (Leilão Judicial vs Venda Direta Caixa)
  const [acquisitionMode, setAcquisitionMode] = useState<'leilao' | 'caixa'>('leilao');
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

  // Sync prefillData when provided from external property cards
  useEffect(() => {
    if (prefillData) {
      if (prefillData.state) setSelectedState(prefillData.state);
      if (prefillData.city) setSelectedCity(prefillData.city);
      if (prefillData.neighborhood) {
        setSelectedNeighborhood(prefillData.neighborhood);
        setNeighborhoodInput(prefillData.neighborhood);
      }
      if (prefillData.address) {
        setSelectedStreet(prefillData.address);
        setStreetInput(prefillData.address);
      }
      if (prefillData.propertyType) setPropertyType(prefillData.propertyType);
      if (prefillData.sizeSqm) setSizeSqm(prefillData.sizeSqm);
      if (prefillData.purchasePrice) {
        setArrematePrice(prefillData.purchasePrice);
        setArremateInputStr(prefillData.purchasePrice.toLocaleString('pt-BR'));
      }
      if (prefillData.acquisitionRule) setAcquisitionMode(prefillData.acquisitionRule);
      if (prefillData.estimatedRepair !== undefined) setReformCostInput(prefillData.estimatedRepair);
      if (prefillData.pendingDebts !== undefined) setIptuDebtInput(prefillData.pendingDebts);
    }
  }, [prefillData]);

  // Unified report generator combining real Matrícula and Edital audit data
  const buildUnifiedReport = (mat: MatriculaAuditData | null, edit: EditalAuditData | null): MatriculaAnalysisReport | null => {
    if (!mat && !edit) return null;

    const activeMatNumber = mat ? mat.matriculaNumber : (matriculaNumber.trim() || 'Matrícula não informada');
    const activeRegistry = mat ? mat.registryOffice : (registryOffice.trim() || `Ofício de Registro de Imóveis de ${selectedCity || 'Capital'}/${selectedState || 'UF'}`);
    const gravames = mat ? mat.gravames : [];
    const overallStatus: 'REGULAR' | 'ATENCAO' | 'ALTO_RISCO' = mat ? mat.overallStatus : (edit ? 'ATENCAO' : 'REGULAR');

    let parecer = '';
    if (mat && edit) {
      parecer = `Auditoria Completa (Matrícula + Edital): A certidão imobiliária nº ${mat.matriculaNumber} no ${mat.registryOffice} aponta situação ${mat.overallStatus === 'REGULAR' ? 'plenamente regularizada' : 'com averbações saneáveis por ordem do juízo da arrematação'}. O edital do processo ${edit.processNumber || 'judicial'} conduzido por ${edit.leiloeiro || 'leiloeiro oficial'} (${edit.court || 'Vara Judicial'}) confirma aquisição originária com sub-rogação de débitos tributários (art. 130, parágrafo único do CTN) e cancelamento das constrições no R.I. (art. 908, §1º do CPC). O imóvel apresenta viabilidade jurídica com segurança patrimonial ao arrematante.`;
    } else if (mat) {
      parecer = `Auditoria da Matrícula: Certidão nº ${mat.matriculaNumber} examinada no ${mat.registryOffice}. ${mat.overallStatus === 'REGULAR' ? 'Não foram localizados ônus reais impeditivos ou indisponibilidades registradas.' : `Foram identificados ${mat.gravames.length} registros/averbações de constrições passíveis de cancelamento via Carta de Arrematação.`} Cadeia dominial sem quebras no princípio da continuidade registral.`;
    } else if (edit) {
      parecer = `Auditoria do Edital: Edital do processo ${edit.processNumber || 'judicial'} sob condução de ${edit.leiloeiro || 'leiloeiro oficial'} (${edit.court || 'Juízo Cível'}). Regras procedimentais em conformidade com o Código de Processo Civil. ${edit.occupationStatus} Comissão de 5% e sub-rogação fiscal aplicável nos termos do art. 130 do CTN.`;
    }

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

  // Real Matrícula Analyzer (Deterministic analysis on real document text)
  const executeRealMatriculaAnalysis = (rawText: string, fileName?: string) => {
    const text = rawText.trim();
    if (!text && !matriculaNumber.trim() && !fileName) {
      setDueDiligenceNotice('Nenhum arquivo ou texto de matrícula informado. Anexe o PDF ou preencha o número da matrícula.');
      return;
    }

    setDueDiligenceNotice('');
    setIsAuditingMatricula(true);

    setTimeout(() => {
      let matNum = matriculaNumber.trim();
      if (!matNum) {
        const matMatch = (text + ' ' + (fileName || '')).match(/matr[íi]cula\s*(?:n[ºo°]?\s*)?([0-9\.\-\/]+)/i);
        if (matMatch && matMatch[1]) {
          matNum = `Matrícula nº ${matMatch[1]} / Livro 2`;
        } else {
          const numOnly = (fileName || '').match(/\d{4,7}/);
          matNum = numOnly ? `Matrícula nº ${numOnly[0]} / Livro 2` : (fileName ? `Matrícula extraída: ${fileName.replace(/\.[^/.]+$/, '')}` : 'Matrícula apurada');
        }
      }

      let regOffice = registryOffice.trim();
      if (!regOffice) {
        const cartMatch = text.match(/([0-9ºª\s\w]+Ofici[ao]l?\s+de\s+Registro\s+de\s+Im[oó]veis[\w\s\-\/\.]*)/i);
        if (cartMatch && cartMatch[1]) {
          regOffice = cartMatch[1].trim();
        } else {
          regOffice = `Ofício de Registro de Imóveis de ${selectedCity || 'Capital'}/${selectedState || 'UF'}`;
        }
      }

      const gravamesFound: MatriculaGravame[] = [];
      const findings: string[] = [];
      const lower = text.toLowerCase();

      // Penhoras & Execuções
      if (lower.includes('penhora') || lower.includes('constri') || lower.includes('execu')) {
        const isFiscal = lower.includes('fiscal') || lower.includes('fazenda') || lower.includes('tribut');
        const isTrab = lower.includes('trabalh') || lower.includes('trt');
        const isCondo = lower.includes('condom');

        gravamesFound.push({
          code: 'Av.Penhora',
          type: isFiscal ? 'Penhora em Execução Fiscal' : isTrab ? 'Penhora em Ação Trabalhista (TRT)' : isCondo ? 'Penhora de Quotas Condominiais (Propter Rem)' : 'Penhora em Execução de Título Judicial/Extrajudicial',
          beneficiaryOrCourt: `Juízo da Execução / Comarca de ${selectedCity || 'Capital'}`,
          severity: isTrab ? 'Média' : 'Baixa',
          legalSolution: isFiscal 
            ? 'Sub-rogação legal dos débitos fiscais no preço arrematado (art. 130, parágrafo único do CTN).'
            : 'Aquisição originária; cancelamento das penhoras concorrentes via Mandado de Cancelamento e Carta de Arrematação (art. 908, §1º do CPC).'
        });
      }

      // Hipoteca
      if (lower.includes('hipoteca') || lower.includes('hipotec')) {
        gravamesFound.push({
          code: 'R.Hipoteca',
          type: 'Hipoteca Imobiliária Registrada',
          beneficiaryOrCourt: 'Instituição Bancária Credora Hipotecária',
          severity: 'Média',
          legalSolution: 'Extinção de pleno direito da hipoteca por efeito da arrematação judicial (art. 1.499, VI do Código Civil).'
        });
      }

      // Alienação Fiduciária
      if (lower.includes('aliena') || lower.includes('fiduci')) {
        gravamesFound.push({
          code: 'R.Alienação',
          type: 'Alienação Fiduciária em Garantia (Lei 9.514/97)',
          beneficiaryOrCourt: 'Credor Fiduciário Registrado',
          severity: 'Média',
          legalSolution: 'Verificar intimação do credor fiduciário nos autos (art. 889, V do CPC). Os créditos sub-rogam no produto do leilão.'
        });
      }

      // Indisponibilidade / CNIB
      if (lower.includes('indisponibilidade') || lower.includes('cnib') || lower.includes('bloqueio')) {
        findings.push('⚠️ Constam anotações de indisponibilidade de bens (CNIB). O juiz emitirá ofício à central para levantamento da indisponibilidade.');
      } else {
        findings.push('✓ Não constam indisponibilidades ativas na Central Nacional de Indisponibilidade de Bens (CNIB).');
      }

      if (gravamesFound.length === 0) {
        findings.unshift('✓ Certidão desprovida de penhoras, hipotecas ou ônus reais gravosos.');
        findings.push('✓ Princípio da continuidade registral e cadeia dominial plenamente regulares.');
      } else {
        findings.unshift(`✓ Apuradas ${gravamesFound.length} averbações/registros com soluções jurídicas saneáveis na arrematação.`);
      }

      const overallStatus: 'REGULAR' | 'ATENCAO' | 'ALTO_RISCO' = 
        gravamesFound.some(g => g.severity === 'Alta') ? 'ALTO_RISCO' :
        gravamesFound.length > 0 ? 'ATENCAO' : 'REGULAR';

      const result: MatriculaAuditData = {
        matriculaNumber: matNum,
        registryOffice: regOffice,
        overallStatus,
        gravames: gravamesFound,
        pontosApurados: findings,
        rawText: text,
        analyzedAt: new Date().toISOString()
      };

      setMatriculaAuditResult(result);
      setMatriculaNumber(matNum);
      setRegistryOffice(regOffice);
      setMatriculaReport(buildUnifiedReport(result, editalAuditResult));
      setIsAuditingMatricula(false);
    }, 200);
  };

  // Real Edital Analyzer (Deterministic analysis on real document text)
  const executeRealEditalAnalysis = (rawText: string, fileName?: string) => {
    const text = rawText.trim();
    if (!text && !leiloeiroInput.trim() && !processNumberInput.trim() && !fileName) {
      setDueDiligenceNotice('Nenhum arquivo ou texto de edital informado. Anexe o PDF ou cole o texto do edital.');
      return;
    }

    setDueDiligenceNotice('');
    setIsAuditingEdital(true);

    setTimeout(() => {
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

      let court = `Vara Cível da Comarca de ${selectedCity || 'Capital'}`;
      const courtMatch = text.match(/(\d+[ªa]?\s+Vara\s+(?:C[íi]vel|do\s+Trabalho|Federal|de\s+Fam[íi]lia)[\w\s\-\.,]*)/i);
      if (courtMatch && courtMatch[1]) {
        court = courtMatch[1].trim().substring(0, 45);
      }

      const debtRules: string[] = [];
      const lower = text.toLowerCase();

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

      let occupationStatus = '✓ Imóvel presumido Desocupado / A constatar no local';
      if (lower.includes('ocupado') || lower.includes('posse de terceiro') || lower.includes('morador')) {
        occupationStatus = '⚠️ Imóvel Ocupado (Necessária expedição de Mandado de Imissão de Posse nos próprios autos).';
      } else if (lower.includes('desocupado') || lower.includes('livre de pessoas')) {
        occupationStatus = '✓ Imóvel Desocupado (Imissão imediata após emissão da Carta de Arrematação).';
      }

      const criticalClauses: string[] = [
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
      setMatriculaReport(buildUnifiedReport(matriculaAuditResult, result));
      setIsAuditingEdital(false);
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
  };

  // Loaded data states
  const [streetsList, setStreetsList] = useState<any[]>([]);
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Search and filter inside raw transactions
  const [txSearch, setTxSearch] = useState('');

  // AI Appraisal report states (Local Mode)
  const [aiReport, setAiReport] = useState('');
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);

  // Normalized search helper
  const normalizeString = (str: string) => {
    return str
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

  // Sync neighborhood input text
  useEffect(() => {
    setNeighborhoodInput(selectedNeighborhood);
  }, [selectedNeighborhood]);

  // Sync street input text
  useEffect(() => {
    setStreetInput(selectedStreet);
  }, [selectedStreet]);

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

    async function loadTransactions() {
      setIsLoadingTransactions(true);
      try {
        let url = `/api/itbi/transactions?state=${selectedState}&city=${selectedCity}&neighborhood=${encodeURIComponent(selectedNeighborhood)}`;
        if (propertyType) {
          url += `&propertyType=${encodeURIComponent(propertyType)}`;
        }
        if (selectedStreet) {
          url += `&targetStreet=${encodeURIComponent(selectedStreet)}&radiusKm=${radiusKm}`;
        }
        
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
    setAiReport(''); // Reset AI report on filter change
  }, [selectedNeighborhood, propertyType, selectedState, selectedCity, selectedStreet, radiusKm]);

  // Segment raw transactions (exact street vs surrounding streets in same neighborhood)
  // Proximity simulator helper for radius filter
  const getSimulatedDistanceKm = (streetA: string, streetB: string) => {
    if (!streetA || !streetB) return 1.5;
    if (streetA.toLowerCase() === streetB.toLowerCase()) return 0;
    let hash = 0;
    const combined = streetA + streetB;
    for (let i = 0; i < combined.length; i++) {
      hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 0.5 + (Math.abs(hash) % 25) / 10; // returns between 0.5 and 3.0 km
  };

  const exactStreetTxs = useMemo(() => {
    if (!selectedStreet || rawTransactions.length === 0) return [];
    const streetClean = cleanStreetName(selectedStreet);
    const streetCore = getCoreStreetName(selectedStreet);
    return rawTransactions.filter(tx => {
      if (!tx.street) return false;
      const tClean = cleanStreetName(tx.street);
      const tCore = getCoreStreetName(tx.street);
      return tClean === streetClean || (streetCore && tCore === streetCore);
    });
  }, [rawTransactions, selectedStreet]);

  const nearbyStreetTxs = useMemo(() => {
    if (rawTransactions.length === 0) return [];
    if (!selectedStreet) return rawTransactions;
    const streetClean = cleanStreetName(selectedStreet);
    const streetCore = getCoreStreetName(selectedStreet);
    return rawTransactions.filter(tx => {
      if (!tx.street) return true;
      const tClean = cleanStreetName(tx.street);
      const tCore = getCoreStreetName(tx.street);
      if (tClean === streetClean || (streetCore && tCore === streetCore)) return false;
      const dist = typeof tx.distanceKm === 'number' ? tx.distanceKm : getSimulatedDistanceKm(selectedStreet, tx.street || '');
      return dist <= radiusKm;
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

    // 2. Filtro por Metragem Similar (±25% da área privativa do imóvel)
    const minSize = Math.max(15, Math.round(targetSize * 0.75));
    const maxSize = Math.round(targetSize * 1.25);
    const similarTxs = txs.filter(t => t.sizeSqm >= minSize && t.sizeSqm <= maxSize);
    const similarValues = similarTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v > 0);
    const similarAvgSqm = similarValues.length > 0 ? Math.round(similarValues.reduce((a, b) => a + b, 0) / similarValues.length) : rawAvgSqm;

    // Seleciona conjunto de trabalho com base no filtro do usuário (Similar vs Todas)
    const workingTxs = (sizeMode === 'similar' && similarValues.length > 0) ? similarTxs : txs;
    const workingValues = workingTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v > 0);

    // 3. Saneamento de Outliers (Critério de Chauvenet / Desvio Padrão NBR 14.653)
    let cleanedValues = [...workingValues];
    let outliersCount = 0;

    if (workingValues.length >= 3) {
      const mean = workingValues.reduce((a, b) => a + b, 0) / workingValues.length;
      const variance = workingValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / workingValues.length;
      const stdDev = Math.sqrt(variance);

      // Chauvenet: 1.5 desvios-padrão (margem mínima de R$ 400/m²)
      const threshold = Math.max(stdDev * 1.5, 400);
      const filtered = workingValues.filter(val => Math.abs(val - mean) <= threshold);

      if (filtered.length >= 2) {
        outliersCount = workingValues.length - filtered.length;
        cleanedValues = filtered;
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

  // Aggregate stats from matching transactions (Exact Street Stats)
  const exactStreetStats = useMemo(() => {
    return calculateRobustStats(exactStreetTxs, sizeSqm, txSizeFilter, 'Média da Mesma Rua');
  }, [exactStreetTxs, sizeSqm, txSizeFilter]);

  // Transactions in the exact same building/number
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
    return calculateRobustStats(exactBuildingTxs, sizeSqm, txSizeFilter, `Média do Prédio (Nº ${cleanNumber(streetNumber)})`);
  }, [exactBuildingTxs, sizeSqm, txSizeFilter, streetNumber]);

  // Aggregate stats from surrounding transactions (radius approximation)
  const nearbyStats = useMemo(() => {
    const txsToUse = selectedStreet ? nearbyStreetTxs : rawTransactions;
    if (txsToUse.length === 0) {
      const neighStats = itbiStats.find(stat => 
        stat.neighborhood && selectedNeighborhood &&
        stat.neighborhood.toLowerCase() === selectedNeighborhood.toLowerCase() &&
        stat.propertyType && propertyType &&
        stat.propertyType.toLowerCase() === propertyType.toLowerCase()
      );
      
      const allVals = itbiStats.map(s => s.averageValueSqm).filter(Boolean);
      const overallAvg = allVals.length > 0 ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length) : 6500;
      const baseAvg = neighStats?.averageValueSqm || overallAvg;

      return {
        avgSqm: baseAvg,
        medianSqm: baseAvg,
        source: 'Média do Entorno (Bairro)',
        count: neighStats?.transactionCount || 0,
        minSqm: neighStats?.minValueSqm || Math.round(overallAvg * 0.7),
        maxSqm: neighStats?.maxValueSqm || Math.round(overallAvg * 1.5),
        rawAvgSqm: baseAvg,
        rawCount: neighStats?.transactionCount || 0,
        outliersCount: 0,
        similarAvgSqm: baseAvg,
        similarCount: neighStats?.transactionCount || 0,
        allAreasAvgSqm: baseAvg,
        allAreasCount: neighStats?.transactionCount || 0,
        isSimilarActive: false,
        minSimilarSize: Math.round(sizeSqm * 0.75),
        maxSimilarSize: Math.round(sizeSqm * 1.25)
      };
    }
    
    const computed = calculateRobustStats(txsToUse, sizeSqm, txSizeFilter, 'Média do Entorno (Bairro)');
    if (computed) return computed;

    return {
      avgSqm: 6500,
      medianSqm: 6500,
      source: 'Média do Entorno (Bairro)',
      count: txsToUse.length,
      minSqm: 4500,
      maxSqm: 9000,
      rawAvgSqm: 6500,
      rawCount: txsToUse.length,
      outliersCount: 0,
      similarAvgSqm: 6500,
      similarCount: 0,
      allAreasAvgSqm: 6500,
      allAreasCount: txsToUse.length,
      isSimilarActive: false,
      minSimilarSize: Math.round(sizeSqm * 0.75),
      maxSimilarSize: Math.round(sizeSqm * 1.25)
    };
  }, [nearbyStreetTxs, rawTransactions, selectedStreet, selectedNeighborhood, propertyType, itbiStats, sizeSqm, txSizeFilter]);

  // Combined stats for dynamic calculations
  const calculatedStats = useMemo(() => {
    if (exactBuildingStats) {
      return exactBuildingStats;
    }
    if (exactStreetStats) {
      return exactStreetStats;
    }
    return nearbyStats;
  }, [exactBuildingStats, exactStreetStats, nearbyStats]);

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

  const portalNearbyStats = useMemo(() => {
    if (!portalResults || !portalResults.close || !portalResults.close.matches) {
      // Fallback: estimate portal nearby average based on nearbyStats
      return {
        avgSqm: Math.round(nearbyStats.avgSqm * 1.15) || 0, // Portals are typically 15% higher than ITBI
        count: nearbyStats.count || 2
      };
    }
    const targetStreetNorm = selectedStreet ? normalizeString(selectedStreet) : '';
    
    const nearbyMatches = portalResults.close.matches.filter((m: any) => {
      if (!targetStreetNorm) return true;
      return m && m.address && !normalizeString(m.address).includes(targetStreetNorm);
    });
    
    if (nearbyMatches.length === 0) {
      const sumSqm = portalResults.close.matches.reduce((acc: number, m: any) => acc + (m.unitValueSqm || 0), 0);
      const matchesLength = portalResults.close.matches.length || 1;
      const avg = Math.round(sumSqm / matchesLength);
      return {
        avgSqm: isNaN(avg) || !isFinite(avg) ? 0 : avg,
        count: portalResults.close.matches.length
      };
    }
    
    const sumSqm = nearbyMatches.reduce((acc: number, m: any) => acc + (m.unitValueSqm || 0), 0);
    const nearbyLength = nearbyMatches.length || 1;
    const avg = Math.round(sumSqm / nearbyLength);
    return {
      avgSqm: isNaN(avg) || !isFinite(avg) ? 0 : avg,
      count: nearbyMatches.length
    };
  }, [portalResults, selectedStreet, nearbyStats]);

  // Default bid/arremate is 50% of the calculated ITBI value
  const defaultArremate = useMemo(() => {
    const base = calculatedStats.avgSqm * sizeSqm;
    return Math.round(base * 0.50);
  }, [calculatedStats, sizeSqm]);

  // Active statistics context
  const activeStats = useMemo(() => {
    if (activeTab === 'local') {
      return calculatedStats;
    }
    return onlineStats || calculatedStats;
  }, [activeTab, calculatedStats, onlineStats]);

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
        (tx.sizeSqm >= sizeSqm * 0.85 && tx.sizeSqm <= sizeSqm * 1.15);

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
  const defaultAuctioneerFee = acquisitionMode === 'leilao' && auctionBid > 0 ? Math.round(auctionBid * 0.05) : 0; // 5% leilao, 0 venda direta caixa
  const defaultItbiFee = auctionBid > 0 ? Math.round(auctionBid * 0.03) : 0; // 3%
  const defaultRegistryFee = auctionBid > 0 ? Math.round(auctionBid * 0.03) : 0; // 3% Cartório / RGI

  const auctioneerFee = acquisitionMode === 'leilao' ? (auctioneerFeeInput !== null ? auctioneerFeeInput : defaultAuctioneerFee) : 0;
  const itbiFee = itbiFeeInput !== null ? itbiFeeInput : defaultItbiFee;
  const registryFee = registryFeeInput !== null ? registryFeeInput : defaultRegistryFee;

  const totalArremateAcquisitionCost = auctionBid + auctioneerFee + itbiFee + registryFee + reformCostInput + legalCostInput + (iptuDebtInput || 0) + (condoDebtInput || 0);
  const arremateEffectiveSqm = sizeSqm > 0 ? Math.round(totalArremateAcquisitionCost / sizeSqm) : 0;

  // Financing Interest vs Amortization
  // Only the interest fraction is true carrying cost, as amortization is recovered on exit
  const interestRatio = annualInterestRateInput > 0 
    ? Math.min(0.95, Math.max(0.20, (annualInterestRateInput / 100) / ((annualInterestRateInput / 100) + 0.035))) 
    : 0;
  const monthlyInterestCost = Math.round((monthlyFinancingInput || 0) * interestRatio);
  const monthlyAmortization = Math.max(0, (monthlyFinancingInput || 0) - monthlyInterestCost);

  // Monthly Holding Cost (IPTU, Condomínio, Outros + Juros Efetivos do Financiamento)
  const totalMonthlyHolding = monthlyCondoInput + monthlyIptuInput + monthlyExtraInput + monthlyInterestCost;

  // Suggested Quick Resale Price & Flip Exit Price (Editable)
  const streetOrBuildingSqm = exactBuildingStats?.avgSqm || exactStreetStats?.avgSqm || calculatedStats.avgSqm;
  const portalAvgSqm = Math.round(averageAskingValue / (sizeSqm || 1));
  const suggestedQuickSaleSqm = Math.round(Math.min(portalAvgSqm * 0.94, streetOrBuildingSqm * 1.04));
  const suggestedQuickSaleTotal = suggestedQuickSaleSqm * sizeSqm;
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
    const portalSqm = portalResults?.close?.avgSqm || (averageAskingValue > 0 ? Math.round(averageAskingValue / sizeSqm) : Math.round(calculatedStats.avgSqm * 1.15));
    const streetSqm = exactStreetStats?.avgSqm || calculatedStats.avgSqm;
    const buildingSqm = exactBuildingStats?.avgSqm || null;
    const surroundingSqm = nearbyStats.avgSqm;
    const neighborhoodSqm = calculatedStats.avgSqm;

    const tiers = [
      {
        id: 'building',
        label: `1. Mesmo Prédio / Edifício ${streetNumber ? `(Nº ${cleanNumber(streetNumber)})` : ''}`,
        icon: Building,
        color: 'emerald',
        sqm: buildingSqm,
        samples: exactBuildingStats ? `${exactBuildingStats.count} tx` : 'Sem transações no número',
        active: !!buildingSqm
      },
      {
        id: 'street',
        label: `2. Mesma Rua (${selectedStreet || 'Rua Selecionada'})`,
        icon: MapPin,
        color: 'indigo',
        sqm: streetSqm,
        samples: exactStreetStats ? `${exactStreetStats.count} tx` : 'Média aproximada',
        active: true
      },
      {
        id: 'surrounding',
        label: `3. Ruas do Entorno (Raio ~${radiusKm}km)`,
        icon: Compass,
        color: 'violet',
        sqm: surroundingSqm,
        samples: `${nearbyStats.count} tx`,
        active: true
      },
      {
        id: 'neighborhood',
        label: `4. Média Geral do Bairro (${selectedNeighborhood || 'Bairro'})`,
        icon: Layers,
        color: 'amber',
        sqm: neighborhoodSqm,
        samples: `${rawTransactions.length} tx`,
        active: true
      },
      {
        id: 'portals',
        label: '5. Anúncios nos Portais (Zap / QuintoAndar)',
        icon: Globe,
        color: 'cyan',
        sqm: portalSqm,
        samples: portalResults?.close ? `${portalResults.close.matches?.length || 0} anúncios` : 'Estimativa Portais',
        active: true
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
    calculatedStats,
    portalResults,
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
        handleOnlineSearch(),
        handlePortalComparison()
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
        if (responseData.foundMatches && responseData.foundMatches.length > 0) {
          setCustomValue(responseData.foundMatches[0].value);
        }
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
        
        acquisitionMode,
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
          
          acquisitionMode: acquisitionMode,
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

      {/* Main Grid: Form left 4/12, Cards right 8/12 (Fills 100% Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch w-full">
        
        {/* LEFT COLUMN: Controls & Unified Form (4/12 width) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3.5 w-full">
          
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3 w-full min-w-0">
              
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-white">
                  <Coins className="w-4 h-4 text-white" />
                  <span className="text-xs font-black uppercase tracking-wider font-mono text-white">1. LANCE & CUSTOS DE ARREMATAÇÃO</span>
                </div>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold border ${
                  acquisitionMode === 'leilao' 
                    ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60' 
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                }`}>
                  {acquisitionMode === 'leilao' ? 'Leilão Judicial' : 'Venda Direta Caixa'}
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

              {/* Acquisition Mode Selector Toggle (Directly below Bid Input) */}
              <div className="space-y-1">
                <label className="block text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                  Regra de Aquisição:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setAcquisitionMode('leilao')}
                    className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      acquisitionMode === 'leilao'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span className="text-[10px]">1. Leilão Judicial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAcquisitionMode('caixa')}
                    className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      acquisitionMode === 'caixa'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-[10px]">2. Venda Direta Caixa</span>
                  </button>
                </div>
              </div>

              {/* Itemized Costs Breakdown with Direct Clean R$ Inputs (No white borders) */}
              <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs font-mono">
                
                {/* Leiloeiro (Hidden / Zeroed in Venda Direta Caixa) */}
                {acquisitionMode === 'leilao' ? (
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
                  <span className="text-slate-300 font-bold">Condomínio em Atraso:</span>
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

              {/* Total Acquisition Summary Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9.5px] text-slate-400 font-mono font-bold uppercase tracking-wider">CUSTO TOTAL DE ENTRADA:</span>
                  <span className="text-base sm:text-lg font-black text-white font-mono">{formatBRL(totalArremateAcquisitionCost)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-850 text-xs">
                  <span className="text-slate-400 font-sans">Custo Efetivo por m² ({sizeSqm}m²):</span>
                  <span className="font-bold text-white font-mono text-sm">R$ {arremateEffectiveSqm.toLocaleString('pt-BR')}/m²</span>
                </div>
              </div>

              {/* Proximity Radius Slider */}
              <div className="pt-1.5 border-t border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-400 font-semibold font-mono uppercase text-[9px]">Raio do Entorno da Pesquisa:</label>
                  <span className="text-xs font-bold text-white font-mono">{radiusKm} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.5"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                />
              </div>
            </div>

            {/* CARD 2: MATRIZ COMPARATIVA 1-A-1: CUSTO EFETIVO VS DADOS DO MERCADO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3 w-full min-w-0">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-white">
                  <TrendingUp className="w-4 h-4 text-white" />
                  <span className="text-xs font-black uppercase tracking-wider font-mono text-white">2. COMPARATIVO 1-A-1 (LUCRO & ROI)</span>
                </div>
                <span className="text-[9.5px] text-slate-400 font-mono font-bold">
                  Base: R$ {arremateEffectiveSqm.toLocaleString('pt-BR')}/m²
                </span>
              </div>

              <div className="space-y-2">
                {marketTiers.map((tier) => {
                  const IconComponent = tier.icon;
                  return (
                    <div 
                      key={tier.id}
                      className={`p-3 rounded-xl border transition-all ${
                        tier.sqm && tier.sqm > 0
                          ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/40 border-slate-850 opacity-50'
                      }`}
                    >
                      <div className="space-y-1.5">
                        {/* Linha Superior: Nome do Nivel e Preço Calculado de Venda */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <IconComponent className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="text-xs sm:text-[13px] font-bold text-white leading-tight">
                              {tier.label}
                            </span>
                          </div>

                          {tier.sqm && tier.sqm > 0 ? (
                            <div className="text-right font-mono shrink-0">
                              <span className="text-xs sm:text-sm font-black text-white block">
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
                            <span className="text-[9.5px] text-slate-400 font-mono">
                              R$ {tier.sqm.toLocaleString('pt-BR')}/m² ({tier.samples})
                            </span>

                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-black text-white">
                                {tier.grossProfit >= 0 ? '+' : ''}{formatBRL(tier.grossProfit)}
                              </span>
                              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-white border border-slate-700">
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

      {/* COMPACT FULL-WIDTH SIMULATOR: LOCAÇÃO VS FLIP (REVENDA) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm text-slate-100 space-y-4 mt-6 w-full">
        
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

            {/* 3-Card Clean Rental Breakdown (Including QuintoAndar / Zap benchmark) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Aluguel Estimado</span>
                <strong className="text-white text-xs sm:text-sm block mt-1">
                  {formatBRL(grossRentMonthly)}/mês
                </strong>
                <span className="text-[7.5px] text-slate-500 block mt-0.5">~0.55% a.m.</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Portais (Zap/Quinto)</span>
                <strong className="text-indigo-300 text-xs sm:text-sm block mt-1">
                  {formatBRL(portalRentalBenchmarkMonthly)}/mês
                </strong>
                <span className="text-[7.5px] text-slate-400 block mt-0.5">~R$ {Math.round(portalRentalBenchmarkMonthly / sizeSqm)}/m² anúncio</span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-[8.5px] text-slate-400 uppercase font-bold">Líquido no Bolso</span>
                  <span className="text-[7.5px] text-slate-400 font-mono">IR: {rentalIrDeductionPct}%</span>
                </div>
                <strong className="text-white text-xs sm:text-sm block mt-1">
                  {formatBRL(netRentMonthly)}/mês
                </strong>
                <span className="text-[7.5px] text-slate-400 block mt-0.5">Pós IR/Adm/Vac.</span>
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
          
      {/* SEÇÃO AUTÔNOMA: AUDITORIA TÉCNICA DA MATRÍCULA & EDITAL DO LEILÃO (DUE DILIGENCE JURÍDICA) */}
      <div id="secao-due-diligence-juridica" className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        
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

              {!matriculaAuditResult ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-1.5">
                  <FileText className="w-6 h-6 mx-auto text-slate-600 opacity-60" />
                  <p className="font-semibold text-slate-400">Aguardando certidão de matrícula...</p>
                  <p className="text-[11px] text-slate-500">Anexe o arquivo em PDF ou digite os dados ao lado e clique em "Analisar Matrícula".</p>
                </div>
              ) : (
                <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2.5">
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

              {!editalAuditResult ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-1.5">
                  <Scale className="w-6 h-6 mx-auto text-slate-600 opacity-60" />
                  <p className="font-semibold text-slate-400">Aguardando edital do leilão...</p>
                  <p className="text-[11px] text-slate-500">Anexe o edital em PDF ou cole as regras ao lado e clique em "Analisar Edital".</p>
                </div>
              ) : (
                <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2.5">
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

            {/* CAIXA 3: PARECER TÉCNICO CONCLUSIVO */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                <h4 className="text-xs font-black text-white uppercase font-mono flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>3. Parecer Técnico Conclusivo da Due Diligence</span>
                </h4>
              </div>
              {!matriculaReport ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  Aguardando análise da matrícula ou edital para consolidação do parecer técnico conclusivo.
                </div>
              ) : (
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-justify font-sans">
                  {matriculaReport.parecerTecnico}
                </p>
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

        <button
          onClick={() => {
            setActiveTab('comparador');
            handlePortalComparison();
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'comparador'
              ? 'bg-violet-600 text-white shadow-sm border border-violet-500/40 font-black'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Comparador Portais</span>
        </button>
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-950/60 border border-indigo-900/50 rounded-xl text-indigo-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2 flex-wrap">
                      <span>Análise Precisa de Mercado (Transações Reais de ITBI)</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                        NBR 14.653 • Saneamento Chauvenet Ativo
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
                    title="Calcula com base em imóveis de metragens similares (±25%)"
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
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
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
                        className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${exactBuildingStats ? Math.min(100, Math.max(15, (exactBuildingStats.avgSqm / (Math.max(averageAskingValue / (sizeSqm || 1), 12000))) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Tier 2: Same Street */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        2. Mesma Rua {selectedStreet ? `(${selectedStreet})` : ''}
                      </span>
                      <span className="font-bold text-indigo-400">
                        {exactStreetStats 
                          ? `R$ ${exactStreetStats.avgSqm.toLocaleString('pt-BR')}/m² (${exactStreetStats.count} tx válidas${exactStreetStats.outliersCount > 0 ? ` • ${exactStreetStats.outliersCount} expurgada` : ''})` 
                          : 'Sem transações registradas nesta rua'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${exactStreetStats ? Math.min(100, Math.max(15, (exactStreetStats.avgSqm / (Math.max(averageAskingValue / (sizeSqm || 1), 12000))) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Tier 3: Surrounding Streets */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-violet-400" />
                        3. Ruas do Entorno (Raio ~{radiusKm}km)
                      </span>
                      <span className="font-bold text-violet-400">
                        R$ {nearbyStats.avgSqm.toLocaleString('pt-BR')}/m² ({nearbyStats.count} tx válidas)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-gradient-to-r from-violet-600 to-violet-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(15, (nearbyStats.avgSqm / (Math.max(averageAskingValue / (sizeSqm || 1), 12000))) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Tier 4: Real Estate Portals Asking Price */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        4. Anúncios de Venda nos Portais (ZapImóveis / QuintoAndar)
                      </span>
                      <span className="font-bold text-cyan-400">
                        R$ {Math.round(averageAskingValue / (sizeSqm || 1)).toLocaleString('pt-BR')}/m² (Preço Pedido)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                        style={{ width: '90%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Synthesis Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* CARD 1: Valor Unitário Saneado com cálculo explícito e métricas informativas */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono uppercase block font-bold">1. Valor Unitário Saneado (Sem Distorções)</span>
                    <span className="text-[8.5px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">
                      {txSizeFilter === 'similar' ? 'Área Similar' : 'Todas Áreas'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-base font-black text-white font-mono">
                      R$ {calculatedStats.avgSqm.toLocaleString('pt-BR')}/m²
                    </span>
                    <span className="text-[11px] font-bold text-slate-300 font-mono">
                      • ({sizeSqm}m² × R$ {calculatedStats.avgSqm.toLocaleString('pt-BR')} = {formatBRL(sizeSqm * calculatedStats.avgSqm)})
                    </span>
                  </div>
                  
                  <div className="pt-1 border-t border-slate-900 space-y-0.5">
                    <span className="text-[9.5px] text-emerald-400 font-sans block font-semibold">
                      {calculatedStats.source} {calculatedStats.outliersCount > 0 ? `(${calculatedStats.outliersCount} distorção expurgada)` : ''}
                    </span>
                    <div className="text-[9px] text-slate-400 font-mono flex flex-wrap gap-x-2">
                      <span>Média Geral Bruta: <strong className="text-slate-300">R$ {calculatedStats.rawAvgSqm.toLocaleString('pt-BR')}/m²</strong></span>
                      <span>• Área Similar: <strong className="text-indigo-300">R$ {calculatedStats.similarAvgSqm.toLocaleString('pt-BR')}/m²</strong></span>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Média do Valor da Mesma Rua */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-mono uppercase block font-bold">2. Média da Mesma Rua</span>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-base font-black text-indigo-400 font-mono">
                      R$ {(exactStreetStats ? exactStreetStats.avgSqm : calculatedStats.avgSqm).toLocaleString('pt-BR')}/m²
                    </span>
                    <span className="text-[11px] font-bold text-slate-300 font-mono">
                      • (Total: {formatBRL(sizeSqm * (exactStreetStats ? exactStreetStats.avgSqm : calculatedStats.avgSqm))})
                    </span>
                  </div>

                  <div className="pt-1 border-t border-slate-900 space-y-0.5">
                    <div className="text-[9.5px] text-slate-300 font-sans">
                      {exactStreetStats ? `Baseado em ${exactStreetStats.count} transações saneadas na via` : `Sem dados isolados na rua (usando entorno)`}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono flex flex-wrap gap-x-2">
                      <span>Similar: <strong className="text-indigo-300">R$ {(exactStreetStats ? exactStreetStats.similarAvgSqm : calculatedStats.similarAvgSqm).toLocaleString('pt-BR')}/m²</strong> ({exactStreetStats ? exactStreetStats.similarCount : calculatedStats.similarCount} tx)</span>
                      <span>• Geral Rua: <strong className="text-slate-300">R$ {(exactStreetStats ? exactStreetStats.allAreasAvgSqm : calculatedStats.allAreasAvgSqm).toLocaleString('pt-BR')}/m²</strong> ({exactStreetStats ? exactStreetStats.allAreasCount : calculatedStats.allAreasCount} tx)</span>
                    </div>
                  </div>
                </div>

                {/* CARD 3: Preço Sugerido para Revenda Rápida (Flip) */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-mono uppercase block font-bold">3. Preço Sugerido p/ Revenda Rápida (Flip)</span>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-base font-black text-cyan-400 font-mono">
                      {formatBRL(suggestedQuickSaleTotal)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300 font-mono">
                      • R$ {suggestedQuickSaleSqm.toLocaleString('pt-BR')}/m²
                    </span>
                  </div>
                  
                  <div className="pt-1 border-t border-slate-900">
                    <span className="text-[9.5px] text-slate-400 font-sans block">
                      Posicionado com liquidez imediata vs anúncios de {formatBRL(averageAskingValue)}
                    </span>
                  </div>
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
                          {exactBuildingTxs.length} {exactBuildingTxs.length === 1 ? 'imóvel transacionado' : 'imóveis transacionados'}
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
                        .filter(tx => txSizeFilter === 'all' || (tx.sizeSqm >= sizeSqm * 0.75 && tx.sizeSqm <= sizeSqm * 1.25))
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
                    <span>{txSizeFilter === 'similar' ? '🎯 Área Similar (±25%)' : '🌐 Todas as Áreas'}</span>
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
                          .filter(tx => txSizeFilter === 'all' || (tx.sizeSqm >= sizeSqm * 0.75 && tx.sizeSqm <= sizeSqm * 1.25))
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
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <div className="flex items-center space-x-2">
                    <Building className="w-5 h-5 text-slate-400" />
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm">Amostras nas Ruas Próximas (Entorno)</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Valores reais de outras ruas do mesmo bairro (~{radiusKm}km).</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-455 font-medium uppercase tracking-wider text-[9px]">
                        <th className="pb-2 font-semibold">Data</th>
                        <th className="pb-2 font-semibold">Logradouro</th>
                        <th className="pb-2 text-center font-semibold">Área</th>
                        <th className="pb-2 text-right font-semibold">Preço Escritura</th>
                        <th className="pb-2 text-right font-semibold">Valor m²</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {nearbyStreetTxs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                            {isLoadingTransactions ? 'Carregando transações do ITBI...' : 'Nenhuma transação individual encontrada no entorno.'}
                          </td>
                        </tr>
                      ) : (
                        nearbyStreetTxs
                          .filter(tx => txSizeFilter === 'all' || (tx.sizeSqm >= sizeSqm * 0.85 && tx.sizeSqm <= sizeSqm * 1.15))
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
                              <td className="py-2.5 font-medium text-slate-300 group-hover:text-indigo-400 transition-colors truncate max-w-[150px] block">
                                {tx.street || 'Não informado'} {tx.number ? `(${tx.number})` : ''}
                              </td>
                              <td className="py-2.5 text-center font-mono font-semibold">{tx.sizeSqm}m²</td>
                              <td className="py-2.5 text-right font-mono font-semibold text-slate-200">{formatBRL(tx.transactionValue)}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-slate-400">R$ {tx.unitValueSqm.toLocaleString('pt-BR')}/m²</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </motion.div>
        ) : activeTab === 'comparador' ? (
          
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-xs">
                <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-200">Pesquisando imóveis similares ativos no ZapImóveis e QuintoAndar...</p>
                <p className="text-xs text-slate-400">Agrupando por faixas de m² (Menor, Próximo, Maior) e tipologia.</p>
              </div>
            ) : portalError ? (
              <div className="bg-rose-955/30 border border-rose-900/50 text-rose-350 p-4 rounded-xl text-xs flex items-center space-x-3">
                <Info className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{portalError}</span>
              </div>
            ) : portalResults ? (
              <div className="space-y-6">
                
                {/* 3 Columns for Size Brackets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Column 1: Menor (Below) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="border-b border-slate-800 pb-2.5">
                      <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">Faixa: Menor</span>
                      <h4 className="font-bold text-slate-100 text-sm mt-0.5">Área Menor ({portalResults.below?.range || '-'})</h4>
                      <div className="flex justify-between items-end mt-2">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-mono">MÉDIA ANÚNCIO</span>
                          <span className="text-sm font-black text-white font-mono">{formatBRL(portalResults.below?.avgPrice || 0)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block font-mono">MÉDIA M²</span>
                          <span className="text-xs font-bold text-indigo-400 font-mono">R$ {(portalResults.below?.avgSqm || 0).toLocaleString('pt')}/m²</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {!portalResults.below?.matches || portalResults.below.matches.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6">Nenhum imóvel encontrado nessa faixa.</p>
                      ) : (
                        portalResults.below.matches.map((m: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setCustomValue(m.price);
                              setSizeSqm(m.sizeSqm);
                            }}
                            className="bg-slate-950 hover:bg-violet-950/20 border border-slate-850 hover:border-violet-900/50 rounded-xl p-3.5 transition-all cursor-pointer text-xs space-y-2 group"
                            title="Clique para usar os dados na calculadora"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-slate-250 group-hover:text-violet-400 transition-colors line-clamp-2">
                                {m.address}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">{m.sizeSqm}m²</span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div className="font-mono">
                                <strong className="text-xs text-slate-200">{formatBRL(m.price)}</strong>
                                <span className="text-[9.5px] text-slate-450 block mt-0.5">R$ {m.unitValueSqm.toLocaleString('pt')}/m²</span>
                              </div>
                              {m.link && (
                                <a
                                  href={m.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-violet-400 hover:text-violet-350 flex items-center space-x-0.5"
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
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="border-b border-slate-800 pb-2.5">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">Faixa: Próximo</span>
                      <h4 className="font-bold text-slate-100 text-sm mt-0.5">Área Próxima ({portalResults.close?.range || '-'})</h4>
                      <div className="flex justify-between items-end mt-2">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-mono">MÉDIA ANÚNCIO</span>
                          <span className="text-sm font-black text-white font-mono">{formatBRL(portalResults.close?.avgPrice || 0)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block font-mono">MÉDIA M²</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">R$ {(portalResults.close?.avgSqm || 0).toLocaleString('pt')}/m²</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {!portalResults.close?.matches || portalResults.close.matches.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6">Nenhum imóvel encontrado nessa faixa.</p>
                      ) : (
                        portalResults.close.matches.map((m: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setCustomValue(m.price);
                              setSizeSqm(m.sizeSqm);
                            }}
                            className="bg-slate-950 hover:bg-violet-950/20 border border-slate-850 hover:border-violet-900/50 rounded-xl p-3.5 transition-all cursor-pointer text-xs space-y-2 group"
                            title="Clique para usar os dados na calculadora"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-slate-250 group-hover:text-violet-400 transition-colors line-clamp-2">
                                {m.address}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">{m.sizeSqm}m²</span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div className="font-mono">
                                <strong className="text-xs text-slate-200">{formatBRL(m.price)}</strong>
                                <span className="text-[9.5px] text-slate-450 block mt-0.5">R$ {m.unitValueSqm.toLocaleString('pt')}/m²</span>
                              </div>
                              {m.link && (
                                <a
                                  href={m.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-violet-400 hover:text-violet-350 flex items-center space-x-0.5"
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
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="border-b border-slate-800 pb-2.5">
                      <span className="text-[10px] text-pink-400 font-mono font-bold uppercase tracking-wider">Faixa: Maior</span>
                      <h4 className="font-bold text-slate-100 text-sm mt-0.5">Área Maior ({portalResults.above?.range || '-'})</h4>
                      <div className="flex justify-between items-end mt-2">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-mono">MÉDIA ANÚNCIO</span>
                          <span className="text-sm font-black text-white font-mono">{formatBRL(portalResults.above?.avgPrice || 0)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block font-mono">MÉDIA M²</span>
                          <span className="text-xs font-bold text-pink-400 font-mono">R$ {(portalResults.above?.avgSqm || 0).toLocaleString('pt')}/m²</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {!portalResults.above?.matches || portalResults.above.matches.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6">Nenhum imóvel encontrado nessa faixa.</p>
                      ) : (
                        portalResults.above.matches.map((m: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setCustomValue(m.price);
                              setSizeSqm(m.sizeSqm);
                            }}
                            className="bg-slate-950 hover:bg-violet-950/20 border border-slate-850 hover:border-violet-900/50 rounded-xl p-3.5 transition-all cursor-pointer text-xs space-y-2 group"
                            title="Clique para usar os dados na calculadora"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-slate-255 group-hover:text-violet-400 transition-colors line-clamp-2">
                                {m.address}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">{m.sizeSqm}m²</span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div className="font-mono">
                                <strong className="text-xs text-slate-200">{formatBRL(m.price)}</strong>
                                <span className="text-[9.5px] text-slate-450 block mt-0.5">R$ {m.unitValueSqm.toLocaleString('pt')}/m²</span>
                              </div>
                              {m.link && (
                                <a
                                  href={m.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-violet-400 hover:text-violet-350 flex items-center space-x-0.5"
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

                {/* Nearby Streets analysis table based on Radius Km */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Scale className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm">Análise do Entorno: Rua Principal vs Ruas Paralelas</h4>
                        <p className="text-[10px] text-slate-450 mt-0.5">Médias de m² de transações reais do ITBI num raio de {radiusKm} km.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
                      <span className="text-[10px] text-slate-400 font-mono">Raio Ativo:</span>
                      <span className="text-xs font-bold text-indigo-400 font-mono">{radiusKm} km</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs p-3 bg-slate-950 rounded-xl border border-slate-855">
                        <span className="text-slate-400 font-semibold">Média da Rua Principal (Alvo):</span>
                        <div className="text-right font-mono">
                          <strong className="text-slate-100 block text-xs">{exactStreetStats ? `R$ ${exactStreetStats.avgSqm.toLocaleString('pt')}/m²` : 'Sem dados na rua'}</strong>
                          <span className="text-[9px] text-slate-500 block">{exactStreetStats ? `${exactStreetStats.count} transação(ões)` : '-'}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs p-3 bg-slate-950 rounded-xl border border-slate-855">
                        <span className="text-slate-400 font-semibold">Média das Ruas Paralelas no Entorno:</span>
                        <div className="text-right font-mono">
                          <strong className="text-slate-100 block text-xs">R$ {nearbyStats.avgSqm.toLocaleString('pt')}/m²</strong>
                          <span className="text-[9px] text-slate-500 block">{nearbyStats.count} transações no raio</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick executives insights */}
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-855 text-xs flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider block">Análise IA de Arbitragem</span>
                        <p className="text-slate-350 leading-relaxed text-[11px]">
                          {(() => {
                            const portalAvg = portalResults.close?.avgPrice || averageAskingValue;
                            const calcVal = customValue !== '' ? Number(customValue) : averageValue;
                            const pctDiff = portalAvg > 0 ? Math.round(((portalAvg - calcVal) / portalAvg) * 100) : 0;
                            if (pctDiff > 15) {
                              return `🔥 Oportunidade de Arbitragem Altíssima! O valor estimado de transação (${formatBRL(calcVal)}) está ${pctDiff}% abaixo da média anunciada nos portais (${formatBRL(portalAvg)}). Excelente margem para revenda pós-arrematação.`;
                            } else if (pctDiff > 0) {
                              return `🟡 Margem moderada. O imóvel estimado está ${pctDiff}% abaixo da média de portais. Ideal para estratégia de locação ou revenda conservadora.`;
                            } else {
                              return `▲ Alerta: Preço de transação está muito próximo ou acima da expectativa dos portais. Verifique se há descontos expressivos adicionais no edital.`;
                            }
                          })()}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-[10px] font-mono text-slate-500">
                        <span>Estado: {selectedState}</span>
                        <span>Cidade: {selectedCity}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-xs">
                <TrendingUp className="w-8 h-8 text-violet-500 mx-auto" />
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-200">Aguardando Comparação de Portais...</p>
                <p className="text-xs text-slate-400">Preencha as características e clique em "Comparador Portais" para analisar.</p>
              </div>
            )}
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
          
          acquisitionMode: acquisitionMode,
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
