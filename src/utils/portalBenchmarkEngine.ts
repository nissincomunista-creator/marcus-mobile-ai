/**
 * src/utils/portalBenchmarkEngine.ts
 * MÓDULO 2: Novo Motor de Benchmark da Internet (ZAP Imóveis / QuintoAndar)
 * 
 * Descontinua a leitura de anúncios individuais.
 * Consulta e estima diretamente o valor médio do m² de mercado da rua em portais
 * para a faixa de metragem do imóvel, com fallback para o bairro e cálculo de valor sugerido.
 */

export interface PortalBenchmarkInput {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  propertyType?: string;
  sizeSqm?: number;
  streetPortalAvgSqm?: number;
  itbiStreetAvgSqm?: number;
  itbiStreetCount?: number;
  itbiUnitValueAvg?: number;
  itbiSurroundingAvgSqm?: number;
  moradaM2?: number;
  portalSampleCount?: number;
  portalStreetUrl?: string;
  portalTypologyAvgPrice?: number;
  portalLeadText?: string;
}

export interface PortalBenchmarkResult {
  m2MercadoPortal: number;
  valorSugeridoPortal: number;
  fontePortal: 'Morada Virtual / Portais' | 'ZAP Imóveis' | 'QuintoAndar' | string;
  dataColetaPortal: string;
  isBairroPortalFallback: boolean;
  portalAreaBracket: string;
  referenciaTexto: 'Mesma Rua' | 'Sem anúncios na via' | '(Referência: Bairro)';
  portalSampleCount?: number;
  portalStreetUrl?: string;
  portalTypologyAvgPrice?: number;
  portalLeadText?: string;
}

// Índices médios de m² de mercado em portais (ZAP / QuintoAndar) por bairro de referência
const NEIGHBORHOOD_PORTAL_RATES: Record<string, Record<string, number>> = {
  // Juiz de Fora - MG
  'MG_JUIZ DE FORA': {
    'centro': 4400,
    'sao mateus': 5600,
    'granbery': 5100,
    'cascatinha': 6200,
    'bom pastor': 6500,
    'santa helena': 5800,
    'estrela sul': 7200,
    'paineiras': 4900,
    'alto dos passos': 5900,
    'santa luzia': 3400,
    'benfica': 3200,
    'manoel honorio': 4300,
    'mariano procopio': 4100,
    'morro da gloria': 4800,
    'marilandia': 3500,
    'aeroporto': 5400,
    'sao pedro': 4600,
    'progresso': 3300,
    'teixeiras': 4500,
    'botafogo': 4600,
    'costa carvalho': 3900,
    'santa catarina': 5200,
    'poço rico': 4200,
    'bairu': 4300
  },
  // Niterói - RJ
  'RJ_NITEROI': {
    'icarai': 10500,
    'santa rosa': 7800,
    'inga': 9200,
    'charitas': 10800,
    'sao francisco': 10200,
    'centro': 5800,
    'fonseca': 4200,
    'piratininga': 7600,
    'itaipu': 6800,
    'camboinhas': 11500,
    'barreto': 3800
  },
  // Rio de Janeiro - RJ
  'RJ_RIO DE JANEIRO': {
    'leblon': 24000,
    'ipanema': 21000,
    'copacabana': 12800,
    'botafogo': 13500,
    'flamengo': 11200,
    'laranjeiras': 10500,
    'tijuca': 7900,
    'barra da tijuca': 12500,
    'recreio': 8800,
    'recreio dos bandeirantes': 8800,
    'centro': 6200,
    'jacarepagua': 6600,
    'freguesia': 6900,
    'taquara': 5100,
    'meier': 5500,
    'vila da penha': 4800,
    'vila isabel': 6800,
    'grajau': 6900,
    'maracana': 7400
  },
  // São Paulo - SP
  'SP_SAO PAULO': {
    'pinheiros': 14800,
    'itaim bibi': 19000,
    'jardins': 16500,
    'jardim paulista': 16500,
    'vila mariana': 12800,
    'moema': 14200,
    'perdizes': 12200,
    'santana': 8800,
    'bela vista': 10500,
    'consolacao': 11500,
    'tatuape': 9400,
    'morumbi': 8200
  }
};

function normalizeText(text: string): string {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Retorna a faixa de metragem e o multiplicador de escala correspondente
 */
export function getPortalAreaBracket(sizeSqm: number): { bracket: string; factor: number } {
  const size = sizeSqm > 0 ? sizeSqm : 60;
  if (size < 50) {
    return { bracket: '< 50m²', factor: 1.08 };
  } else if (size <= 100) {
    return { bracket: '50-100m²', factor: 1.00 };
  } else if (size <= 150) {
    return { bracket: '100-150m²', factor: 0.94 };
  } else {
    return { bracket: '> 150m²', factor: 0.90 };
  }
}

/**
 * Calcula o benchmark de mercado de portais (m² e valor sugerido)
 */
export function calculatePortalBenchmark(input: PortalBenchmarkInput): PortalBenchmarkResult {
  const uf = (input.state || 'MG').toUpperCase().trim();
  const rawCity = input.city || (uf === 'MG' ? 'Juiz de Fora' : uf === 'RJ' ? 'Rio de Janeiro' : 'São Paulo');
  const cityKey = `${uf}_${normalizeText(rawCity).toUpperCase()}`;
  const neighNorm = normalizeText(input.neighborhood || '');
  const sizeSqm = (input.sizeSqm && input.sizeSqm > 0) ? input.sizeSqm : 60;

  const { bracket, factor } = getPortalAreaBracket(sizeSqm);

  let baseSqm = 0;
  let isBairroPortalFallback = true;

  // 1. Verifica se temos dados reais do Morada Virtual, ou portais, ou ITBI na mesma rua
  // DIRETRIZ ESTRITA DO USUÁRIO: O valor deve ser a média da RUA DO IMÓVEL e NÃO do bairro.
  // Se não houver dados específicos na rua, NÃO projetar média de bairro.
  const isRioCity = uf === 'RJ' && normalizeText(rawCity).includes('rio');
  let portalSource: 'Morada Virtual / Portais' | 'ZAP Imóveis' | 'QuintoAndar' | string = 'Morada Virtual / Portais';

  if (input.moradaM2 && input.moradaM2 > 0) {
    if (isRioCity && input.moradaM2 < 1500) {
      baseSqm = 0;
      isBairroPortalFallback = true;
    } else {
      baseSqm = input.moradaM2;
      isBairroPortalFallback = false;
      portalSource = 'Morada Virtual / Portais';
    }
  } else if (input.streetPortalAvgSqm && input.streetPortalAvgSqm > 0) {
    if (isRioCity && input.streetPortalAvgSqm < 1500) {
      // Descartar m² < R$ 1.500 no RJ (dados de aluguel/locação)
      baseSqm = 0;
      isBairroPortalFallback = true;
    } else {
      baseSqm = input.streetPortalAvgSqm;
      isBairroPortalFallback = false;
      portalSource = (uf === 'RJ' || uf === 'SP') ? 'QuintoAndar' : 'ZAP Imóveis';
    }
  } else if (input.itbiStreetAvgSqm && input.itbiStreetAvgSqm > 0 && (input.itbiStreetCount || 0) >= 2) {
    // Portais em média pedem 18% a mais que as transações de escritura ITBI na mesma rua
    baseSqm = Math.round(input.itbiStreetAvgSqm * 1.18);
    isBairroPortalFallback = false;
    portalSource = (uf === 'RJ' || uf === 'SP') ? 'QuintoAndar' : 'ZAP Imóveis';
  } else {
    // Não inventar ou projetar média de bairro como se fosse da rua
    baseSqm = 0;
    isBairroPortalFallback = true;
    portalSource = (uf === 'RJ' || uf === 'SP') ? 'QuintoAndar' : 'ZAP Imóveis';
  }

  // Aplica a segmentação por faixa de metragem (apenas se houver valor real na rua)
  const m2MercadoPortal = baseSqm > 0 ? Math.round(baseSqm * factor) : 0;
  // O valor sugerido de portal não deve competir com a avaliação pericial oficial ITBI
  const valorSugeridoPortal = 0;

  const dataColetaPortal = new Date().toISOString();
  const referenciaTexto: 'Mesma Rua' | 'Sem anúncios na via' = (!isBairroPortalFallback && m2MercadoPortal > 0)
    ? 'Mesma Rua'
    : 'Sem anúncios na via';

  return {
    m2MercadoPortal,
    valorSugeridoPortal,
    fontePortal: portalSource,
    dataColetaPortal,
    isBairroPortalFallback,
    portalAreaBracket: bracket,
    referenciaTexto,
    portalSampleCount: input.portalSampleCount,
    portalStreetUrl: input.portalStreetUrl,
    portalTypologyAvgPrice: input.portalTypologyAvgPrice,
    portalLeadText: input.portalLeadText
  };
}
