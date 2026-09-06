export type PropertyType = 'Apartamento' | 'Casa' | 'Comercial' | 'Terreno';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  role?: 'admin' | 'client';
  licenseExpiresAt?: number;
  activatedWithCode?: string;
}

export interface AccessCode {
  id: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedBy?: {
    name: string;
    email: string;
    activatedAt: number;
  };
  status: 'active' | 'used' | 'expired' | 'revoked';
  durationDays?: number;
  notes?: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface AuctionProperty {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  propertyType: PropertyType;
  sizeSqm: number;
  auctionPrice: number;
  estimatedRepair: number;
  pendingDebts: number;
  otherCosts: number;
  estimatedValue: number;
  auctionDate: string;
  auctionLink?: string;
  description?: string;
  status: 'Pendente' | 'Analisado' | 'Arrematado' | 'Arquivado';
  occupied: boolean;
  state: string; // BR State abbreviation (e.g., 'SP', 'RJ')
  
  // Real Estate Web Portals average data (ZapImoveis, QuintoAndar)
  portalZapAvg?: number; // Estimated average total price for similar type in same street on ZapImoveis
  portalQuintoAndarAvg?: number; // Estimated average total price for similar type in same street on QuintoAndar
  streetPortalAvgSqm?: number; // General average price per sqm of active listings on the street
  
  // Derived / Calculated values
  itbiUnitValueAvg?: number; // Average $/m2 in the neighborhood from ITBI
  itbiStreetAvgSqm?: number; // Average $/m2 on the same street
  itbiStreetCount?: number; // Number of transactions on the same street
  itbiSurroundingAvgSqm?: number; // Average $/m2 on surrounding streets (within 1km radius)
  itbiSurroundingCount?: number; // Number of transactions on surrounding streets
  calculatedRoi?: number; // ROI percentage
  calculatedProfit?: number; // Capital gains
  liquidityScore?: number; // 1-10 score
  riskLevel?: 'Baixo' | 'Médio' | 'Alto';
  
  // AI Generated fields
  aiAppreciationScore?: number; // 1-10 score
  aiAnalysis?: string; // Markdown summary of strengths, weaknesses, path to yield

  // custom spreadsheet simulator variables
  prefeituraValuation?: number; // Avaliação prefeitura
  downpaymentPercent?: number; // Entrada %
  downpaymentVal?: number; // Entrada R$
  financingVal?: number; // Financiamento
  itbiPercent?: number; // ITBI %
  itbiCost?: number; // ITBI R$
  notaryCost?: number; // Cartório
  caixaContractCost?: number; // Contrato Caixa
  certificatesCost?: number; // Certidões
  pendingIptuCost?: number; // IPTU Atrasado
  pendingCondoCost?: number; // Condomínio Atrasado
  auctioneerFee?: number; // Leiloeiro
  auctioneerFeePercent?: number; // Leiloeiro %
  lawyerFee?: number; // Advogado
  lawyerFeePercent?: number; // Advogado %
  
  vendaMediaPrice?: number; // Preço Venda Média
  vendaBaixaPrice?: number; // Preço Venda Baixa
  brokerCommissionPercent?: number; // Comissão Corretor %
  monthlyFinancingInstallment?: number; // Prestação total / mensal
  
  // Profile / Favorite fields
  saved?: boolean;
  salePrice?: number;
  allowsFinancing?: boolean;
  allowsInstallments?: boolean;
  city?: string;
  userId?: string;
  origin?: 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal';

  // AI parsed installment & payment details
  paymentTerms?: string;
  maxInstallments?: number;
  minDownpaymentPercent?: number;

  // AI detailed legal checks
  legalAnalysisDebtor?: string;
  legalAnalysisAsset?: string;
  finalDecisionVerdict?: 'revenda' | 'locacao' | 'skip';
  bedrooms?: number;
  parkingSpaces?: number;
}

export interface ItbiTransaction {
  id: string;
  neighborhood: string;
  propertyType: PropertyType;
  sizeSqm: number;
  transactionValue: number;
  date: string;
  unitValueSqm: number; // Value per sqm
  state?: string;      // BR State abbreviation (e.g. 'SP', 'RJ')
  city?: string;       // Municipality name (e.g. 'São Paulo')
  street?: string;     // Street/Logradouro name
  number?: string;     // Building / House number (e.g. '388')
  complement?: string; // Complement (e.g. 'Apto 302', 'Bloco 1')
  description?: string;// Full property description from ITBI
}

export interface NeighborhoodStats {
  neighborhood: string;
  averageValueSqm: number;
  minValueSqm: number;
  maxValueSqm: number;
  transactionCount: number;
}

export const BRAZIL_STATES = [
  { value: 'AC', label: 'AC - Acre' },
  { value: 'AL', label: 'AL - Alagoas' },
  { value: 'AP', label: 'AP - Amapá' },
  { value: 'AM', label: 'AM - Amazonas' },
  { value: 'BA', label: 'BA - Bahia' },
  { value: 'CE', label: 'CE - Ceará' },
  { value: 'DF', label: 'DF - Distrito Federal' },
  { value: 'ES', label: 'ES - Espírito Santo' },
  { value: 'GO', label: 'GO - Goiás' },
  { value: 'MA', label: 'MA - Maranhão' },
  { value: 'MT', label: 'MT - Mato Grosso' },
  { value: 'MS', label: 'MS - Mato Grosso do Sul' },
  { value: 'MG', label: 'MG - Minas Gerais' },
  { value: 'PA', label: 'PA - Pará' },
  { value: 'PB', label: 'PB - Paraíba' },
  { value: 'PR', label: 'PR - Paraná' },
  { value: 'PE', label: 'PE - Pernambuco' },
  { value: 'PI', label: 'PI - Piauí' },
  { value: 'RJ', label: 'RJ - Rio de Janeiro' },
  { value: 'RN', label: 'RN - Rio Grande do Norte' },
  { value: 'RS', label: 'RS - Rio Grande do Sul' },
  { value: 'RO', label: 'RO - Rondônia' },
  { value: 'RR', label: 'RR - Roraima' },
  { value: 'SC', label: 'SC - Santa Catarina' },
  { value: 'SP', label: 'SP - São Paulo' },
  { value: 'SE', label: 'SE - Sergipe' },
  { value: 'TO', label: 'TO - Tocantins' }
];

export interface SavedMarketAnalysis {
  id: string;
  userId?: string;
  createdAt: string;
  title: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  streetNumber?: string;
  propertyType: PropertyType;
  sizeSqm: number;
  bedrooms?: number;
  parkingSpaces?: number;
  
  // Acquisition details
  acquisitionMode: 'leilao' | 'caixa';
  arrematePrice: number;
  totalAcquisitionCost: number;
  effectiveSqmCost: number;
  
  // Calculated Valuation
  calculatedUnitSqm: number;
  calculatedTotalValue: number;
  
  // 4 ROIs & Values:
  // 1. Conservador / Venda Rápida
  roiQuickSale: number;
  valueQuickSale: number;
  profitQuickSale: number;
  
  // 2. Mesma Rua / Prédio (Média Real ITBI)
  roiStreetAverage: number;
  valueStreetAverage: number;
  profitStreetAverage: number;
  
  // 3. Entorno do Bairro (Média Saneada NBR 14.653)
  roiNeighborhood: number;
  valueNeighborhood: number;
  profitNeighborhood: number;
  
  // 4. Anúncios de Portais (Teto de Mercado)
  roiPortalsAsking: number;
  valuePortalsAsking: number;
  profitPortalsAsking: number;
  
  // Flip & Rental
  flipExitPrice: number;
  flipNetRoi6m: number;
  flipNetProfit6m: number;
  
  grossRentMonthly: number;
  netRentMonthly: number;
  netRentalYieldAnnual: number;
  
  // Full executive report data for side preview & PDF re-generation
  reportData?: any;
}

export interface ArrematacaoProperty {
  id: string;
  userId?: string;
  createdAt: string;
  title: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  sizeSqm: number;
  propertyType: PropertyType;
  
  // Custos de Aquisição & Posse
  arrematePrice: number;
  auctioneerFee: number;
  itbiFee: number;
  registryFee: number;
  reformCost: number;
  legalCost: number;
  iptuAndCondoDebts: number;
  otherExpenses: number;
  totalInvested: number; // Consolidado de todos os custos
  
  // Status & Resale
  status: 'Reforma/Desocupação' | 'À Venda' | 'Locado' | 'Vendido';
  holdingMonths: number;
  monthlyHoldingCost: number;
  
  // Resultado Pós-Venda (Quando Vendido):
  soldDate?: string;
  salePrice?: number;
  brokerFeePaid?: number;
  capitalGainsTaxPaid?: number;
  netRevenue?: number; // Preço Venda - Corretagem - IR
  netProfitReal?: number; // netRevenue - totalInvested - (holdingMonths * monthlyHoldingCost)
  netRoiReal?: number; // (netProfitReal / totalInvested) * 100
  monthlyYieldReal?: number; // ROI / holdingMonths
  
  // Se Locado:
  rentMonthly?: number;
  netRentYieldAnnual?: number;
  
  notes?: string;
}

export interface MatriculaGravame {
  code: string; // ex: "R.5", "Av.8"
  type: string; // ex: "Penhora de Execução Fiscal", "Hipoteca Cedular", "Indisponibilidade CNIB", "Alienação Fiduciária", "Ação de Cobrança Condominial"
  beneficiaryOrCourt: string; // ex: "Banco Santander S/A" ou "12ª Vara Cível de SP"
  severity: 'Baixa' | 'Média' | 'Alta';
  legalSolution: string; // Solução jurídica / providência
}

export interface MatriculaAuditData {
  matriculaNumber: string;
  registryOffice: string;
  propertyTitle?: string;
  ownerName?: string;
  overallStatus: 'REGULAR' | 'ATENCAO' | 'ALTO_RISCO';
  gravames: MatriculaGravame[];
  pontosApurados: string[];
  rawText?: string;
  analyzedAt: string;
}

export interface EditalAuditData {
  leiloeiro?: string;
  processNumber?: string;
  court?: string;
  auctionDates?: string;
  debtRules: string[];
  occupationStatus: string;
  criticalClauses: string[];
  rawText?: string;
  analyzedAt: string;
}

export interface MatriculaAnalysisReport {
  matriculaNumber: string;
  registryOffice: string;
  propertyTitle: string;
  ownerName: string;
  overallStatus: 'REGULAR' | 'ATENCAO' | 'ALTO_RISCO';
  gravamesCount: number;
  gravames: MatriculaGravame[];
  pontosPositivos: string[];
  pontosDeAtencao: string[];
  cuidadosEAlertas?: string[];
  editalRules?: string;
  leiloeiroProcesso?: string;
  parecerTecnico: string;
  matriculaData?: MatriculaAuditData;
  editalData?: EditalAuditData;
  analyzedAt?: string;
}

