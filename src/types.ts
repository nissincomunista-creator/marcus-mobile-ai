export type PropertyType = 'Apartamento' | 'Casa' | 'Comercial' | 'Terreno' | 'Outro';

export interface ItbiTransaction {
  id: string;
  date: string;
  city: string;
  state: string;
  neighborhood: string;
  street?: string;
  propertyType: PropertyType;
  totalValue: number;
  sizeSqm: number;
  unitValueSqm: number;
}

export interface AuctionProperty {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  city?: string;
  state?: string;
  propertyType: PropertyType;
  sizeSqm: number;
  auctionPrice: number;
  estimatedRepair: number;
  pendingDebts: number;
  otherCosts: number;
  estimatedValue: number;
  auctionDate: string;
  auctionLink: string;
  description?: string;
  status: 'Pendente' | 'Arrematado' | 'Perdido' | 'Em Análise';
  occupied: boolean;
  origin?: 'caixa' | 'caixa_radar' | 'judicial' | 'extrajudicial' | 'portal';
  allowsFinancing?: boolean;
  allowsInstallments?: boolean;
  bedrooms?: number;
  parkingSpaces?: number;
  itbiUnitValueAvg?: number;
  calculatedProfit?: number;
  calculatedRoi?: number;
  liquidityScore?: number;
  riskLevel?: 'Baixo' | 'Médio' | 'Alto';
  itbiCost?: number;
  notaryCost?: number;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'gemini' | 'system';
  text: string;
  timestamp: string;
  actionExecuted?: {
    type: 'fill_calculator' | 'filter_radar' | 'itbi_lookup';
    data: any;
    summary: string;
  };
}

export interface CalculatorState {
  city: string;
  state: string;
  neighborhood: string;
  propertyType: PropertyType;
  sizeSqm: number;
  auctionPrice: number;
  estimatedRepair: number;
  itbiRate: number;
  registryRate: number;
  evictionCost: number;
  auctioneerFeePercent: number;
  // Calculated
  marketValueItbi: number;
  itbiSqm: number;
  totalAcquisitionCost: number;
  netProfit: number;
  roiPercent: number;
  lastUpdatedByVoice?: boolean;
}
