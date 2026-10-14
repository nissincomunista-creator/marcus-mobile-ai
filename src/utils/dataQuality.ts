import { AuctionProperty } from '../types.ts';
import { isGenericStreet } from './bidirectionalBenchmark.ts';

export type DataQualityStatus = 'Auditado' | 'Estimado' | 'Precificação Incompleta';

export interface DataQualityReport {
  status: DataQualityStatus;
  isAuditado: boolean;
  isEstimado: boolean;
  isIncompleto: boolean;
  canBeFeatured: boolean;
  liquidityCeiling: number;
  hasNoLocalHistory: boolean;
  hasFragileLocalHistory: boolean;
  reasons: string[];
  badgeLabel: string;
  badgeClass: string;
}

/** Only same-building or same-street samples support a high liquidity score.
 * Legacy records without explicit provenance are treated conservatively. */
export function getVerifiedLocalComparableCount(auc: AuctionProperty): number {
  const explicitBuildingCount = Math.max(0, Number(auc.itbiBuildingCount) || 0);
  const explicitStreetCount = Math.max(0, Number(auc.itbiStreetCount) || 0);
  if (auc.valuationLevel === 'Prédio' || auc.valuationLevel === 'Rua') {
    return explicitBuildingCount + explicitStreetCount || Math.max(0, Number(auc.valuationSampleCount) || 0);
  }
  // Older stored lots predate valuationLevel. Accept only an explicit historic
  // audit label with its own sample count; raw street totals can include radius
  // or neighborhood transactions and are never a safe substitute.
  const legacyLocalLabel = String(auc.valuationBasis || '').match(/ITBI\s+verificado\s*-\s*(Rua|Prédio)(?=\s|$)(?:\s*\((\d+)\s+amostras?\))?/i);
  if (legacyLocalLabel) {
    // The historical label's own count takes precedence over unscoped legacy counts.
    return Number(legacyLocalLabel[2]) || Number(auc.valuationSampleCount) || 0;
  }
  return 0;
}

/**
 * Liquidez factual estritamente baseada em densidade de amostras (ITBI).
 * Não utiliza critérios arbitrários de financiamento, desocupação, faixa de preço ou margem de saída.
 *
 * Regras:
 * - Apartamentos: dependem fortemente de vendas no condomínio/prédio para notas altas (7-10).
 *   Sem vendas no prédio, a liquidez fica travada em no máximo 5-6 (se houver alto volume na rua/entorno).
 * - Casas / Terrenos / Comerciais: NÃO exigem vendas em prédio. Avaliam diretamente rua + entorno + bairro,
 *   podendo atingir 8, 9 ou 10 se a rua e entorno tiverem alto volume.
 * - Menos de cinco amostras confirmadas no prédio e na rua: trava em no máximo 5/10.
 * - Área de risco / comunidade: trava em no máximo 2/10.
 * - Lote com pendência pericial / precisa_revisao: nota 1/10.
 */
/**
 * Nova Metodologia do Score de Liquidez Factual (0 a 10)
 *
 * Fórmula:
 * Score = (0.40 * Nota_Bairro) + (0.30 * Nota_Volume) + (0.30 * Nota_Desagio)
 *
 * 1. Eixo Bairro (Giro Médio - Peso 40%):
 *    Δt_médio = (Data Mais Recente - Data Mais Antiga) / Total Transações do bairro (em dias).
 *    Δt <= 30 dias => 9.5 a 10.0 (giro ultra-rápido, ex: Copacabana, Botafogo, Tijuca).
 *    31 <= Δt <= 90 dias => 7.5 a 8.5.
 *    Δt > 90 dias => 5.0 a 6.0.
 *
 * 2. Eixo Volume Local (Peso 30%):
 *    Baseado na amostragem N apurada no nível mais específico (prédio -> rua -> raio):
 *    N >= 12 => 10.0
 *    6 <= N <= 11 => 8.0
 *    N < 6 => 5.0
 *    Trava Protetiva Condominial: se Apartamento e houver zero vendas históricas no prédio, trava em no máx 6.0.
 *
 * 3. Eixo Deságio / Agressividade de Saída (Peso 30%):
 *    Deságio = (Valor Mercado - Preço Arremate) / Valor Mercado
 *    Deságio >= 50% => 10.0
 *    35% <= Deságio < 50% => 8.0
 *    Deságio < 35% => 6.0
 *
 * 4. Trava Protetiva Global:
 *    Se Nota_Bairro >= 9.0 e Deságio >= 45% => piso obrigatório de 8.0.
 *
 * 5. Inconsistência Crítica / Risco:
 *    precisa_revisao => 1.0.
 *    Área de risco / comunidade => trava em no máx 2.0.
 */
/**
 * Quórum Composto de Precificação e Trava de Supressão de Flip:
 * - Nível Verde (Soberania Própria): transacoes_predio >= 1 OU transacoes_rua >= 5 -> NÃO suprime (false)
 * - Nível Amarelo (Dependência de Entorno): transacoes_predio === 0 E transacoes_rua entre 2 e 4:
 *     * SE transacoes_raio_500m >= 10: NÃO suprime (false)
 *     * SE transacoes_raio_500m < 10: SUPRIME (true)
 * - Nível Vermelho (Vazio Amostral Crítico): transacoes_predio === 0 E transacoes_rua <= 1 -> SUPRIME (true)
 */
export function isFlipSuppressedByVazioAmostral(auc: {
  itbiBuildingCount?: number;
  itbiStreetCount?: number;
  itbiSurroundingCount?: number;
  itbiNeighborhoodCount?: number;
  valuationCalibration?: string;
}): boolean {
  const bldg = Math.max(0, Number(auc.itbiBuildingCount) || 0);
  const street = Math.max(0, Number(auc.itbiStreetCount) || 0);
  const surr = Math.max(0, Number(auc.itbiSurroundingCount) || 0);
  const neigh = Math.max(0, Number(auc.itbiNeighborhoodCount) || 0);

  // 1. Nível Verde (Soberania Própria)
  if (bldg >= 1 || street >= 5) {
    return false;
  }

  // 2. Calibração Contextual Aprovada NBR (fourTierValuation):
  // Se houver amostragem no entorno (>= 5) e bairro (>= 7), ou se rua >= 2 com suporte de entorno (>= 5) ou bairro (>= 7)
  if (surr >= 5 && (neigh >= 7 || street >= 1)) {
    return false;
  }

  // 3. Nível Amarelo (Dependência de Entorno)
  if (street >= 2) {
    return surr < 5 && neigh < 7;
  }

  // 4. Nível Vermelho (Vazio Amostral Crítico)
  return true;
}

export function calculateSampleDensityLiquidity(
  auc: {
    propertyType?: string;
    itbiBuildingCount?: number;
    itbiStreetCount?: number;
    itbiSurroundingCount?: number;
    itbiNeighborhoodCount?: number;
    valuationSampleCount?: number;
    valuationRadiusKm?: number;
    isBairroPortalFallback?: boolean;
    precisa_revisao?: boolean;
    isCommunityRisk?: boolean;
    riskLevel?: string;
    auctionPrice?: number;
    estimatedValue?: number;
    vendaBaixaPrice?: number;
    itbiStreetAvgSqm?: number;
    sizeSqm?: number;
    neighborhoodDeltaTDays?: number;
    valuationCalibration?: string;
    valuationConfidence?: string;
  },
  neighborhoodSalesLast24Months?: number,
  neighborhoodDeltaTDaysParam?: number
): number {
  const streetCount = Math.max(0, Number(auc.itbiStreetCount) || 0);
  const bldgCount = Math.max(0, Number(auc.itbiBuildingCount) || 0);
  const surroundingCount = Math.max(0, Number(auc.itbiSurroundingCount) || 0);
  const neighCount = Math.max(0, Number(auc.itbiNeighborhoodCount) || Number(neighborhoodSalesLast24Months) || 0);

  // REGRA MANDATÓRIA: Sem dados na via pública (streetCount === 0 E bldgCount === 0),
  // e sem calibração contextual aprovada (surroundingCount < 5 || neighCount < 7), liquidez é estritamente ZERO (0 / 10).
  const hasApprovedContext = surroundingCount >= 5 && (neighCount >= 7 || streetCount >= 1);
  if (streetCount === 0 && bldgCount === 0 && !hasApprovedContext) return 0;
  if (auc.precisa_revisao) return 1;

  const isApartment = (auc.propertyType || '').toLowerCase().includes('apart');

  // 1. Eixo Bairro (Giro Médio - Peso 40%)
  const deltaT = auc.neighborhoodDeltaTDays ?? neighborhoodDeltaTDaysParam;
  let notaBairro = 5.0;
  if (deltaT !== undefined && deltaT > 0) {
    if (deltaT <= 15) {
      notaBairro = 10.0;
    } else if (deltaT <= 30) {
      notaBairro = 9.5;
    } else if (deltaT <= 60) {
      notaBairro = 8.5;
    } else if (deltaT <= 90) {
      notaBairro = 7.5;
    } else if (deltaT <= 180) {
      notaBairro = 6.0;
    } else {
      notaBairro = 5.0;
    }
  } else {
    // Estimativa defensiva por densidade de transações quando deltaT não estiver disponível
    if (neighCount >= 50) {
      notaBairro = 10.0;
    } else if (neighCount >= 20) {
      notaBairro = 8.0;
    } else if (neighCount >= 5) {
      notaBairro = 6.0;
    } else {
      notaBairro = 5.0;
    }
  }

  // 2. Eixo Volume Local (Peso 30%)
  // Amostragem N apurada no nível mais específico (prédio -> rua -> raio)
  let localN = 0;
  if (bldgCount > 0) {
    localN = bldgCount;
  } else if (streetCount > 0) {
    localN = streetCount;
  } else if (surroundingCount > 0) {
    localN = surroundingCount;
  } else {
    localN = Number(auc.valuationSampleCount) || 0;
  }

  let notaVolume = 5.0;
  if (localN >= 12) {
    notaVolume = 10.0;
  } else if (localN >= 6) {
    notaVolume = 8.0;
  } else {
    notaVolume = 5.0;
  }

  // Trava Condominial: Apartamento sem vendas no prédio tem teto de 6.0 no Eixo Volume
  if (isApartment && bldgCount === 0) {
    notaVolume = Math.min(notaVolume, 6.0);
  }

  // 3. Eixo Deságio / Agressividade de Saída (Peso 30%)
  const marketRef = Number(auc.estimatedValue) || 
    (auc.vendaBaixaPrice ? Number(auc.vendaBaixaPrice) / 0.9 : 0) || 
    ((Number(auc.itbiStreetAvgSqm) || 0) * (Number(auc.sizeSqm) || 0)) || 0;
  const bidRef = Number(auc.auctionPrice) || 0;
  const desagio = (marketRef > 0 && bidRef > 0 && marketRef > bidRef)
    ? (marketRef - bidRef) / marketRef
    : 0;

  let notaDesagio = 6.0;
  if (desagio >= 0.50) {
    notaDesagio = 10.0;
  } else if (desagio >= 0.35) {
    notaDesagio = 8.0;
  } else {
    notaDesagio = 6.0;
  }

  // Comprovação de histórico local na via pública:
  // Notas >= 8.0 exigem estritamente streetCount >= 3 E (bldgCount >= 2 OU streetCount >= 5)
  const hasSolidLocalHistory = streetCount >= 3 && (bldgCount >= 2 || streetCount >= 5);
  const localComparableCount = bldgCount + streetCount;

  // Composição Ponderada
  let rawScore = (0.40 * notaBairro) + (0.30 * notaVolume) + (0.30 * notaDesagio);

  // 4. Trava Protetiva Global:
  // Se o imóvel está em Bairro com nota >= 9.0 e deságio >= 45%, a liquidez final JAMAIS pode ser menor que 8.0,
  // DESDE QUE haja comprovação de histórico local sólido (streetCount >= 3 E (bldgCount >= 2 OU streetCount >= 5)).
  if (hasSolidLocalHistory && notaBairro >= 9.0 && desagio >= 0.45) {
    rawScore = Math.max(rawScore, 8.0);
  }

  // Trava para área de risco / comunidade
  if (auc.isCommunityRisk || auc.riskLevel === 'Alto') {
    rawScore = Math.min(rawScore, 2);
  }

  // 5. Hierarquia Estrita de Travas de Liquidez por Densidade Amostral:
  // Trava Vazio Amostral Crítico:
  const isVazio = isFlipSuppressedByVazioAmostral({
    itbiBuildingCount: bldgCount,
    itbiStreetCount: streetCount,
    itbiSurroundingCount: surroundingCount,
    itbiNeighborhoodCount: neighCount,
    valuationCalibration: auc.valuationCalibration
  });

  if (isVazio) {
    if (surroundingCount < 5) {
      return 1;
    }
    return Math.min(3, Math.round(rawScore));
  }

  // Trava Rígida de Calibração (Fim do 9/10 com poucas amostras):
  // Se o imóvel depende de calibração por raio ou bairro (ausência de dados locais sólidos),
  // a liquidez fica IMEDIATA E COMPULSORIAMENTE LIMITADA AO TETO DE 5.0 / 10 (ou 3.0 se entorno for insuficiente).
  // É terminantemente proibido exibir score 8, 9 ou 10 em qualquer lote que dependa de calibração por raio/bairro.
  const isCalibrated = Boolean(auc.valuationCalibration) || 
    auc.valuationCalibration === 'few_local_samples' || 
    auc.valuationCalibration === 'radius_neighborhood' ||
    auc.valuationConfidence === 'projected';

  if (isCalibrated) {
    const calibCeiling = surroundingCount < 5 ? 3.0 : 5.0;
    return Math.min(calibCeiling, Math.round(rawScore * 2) / 2);
  }

  // Falha do operador 'OU': se streetCount === 0, Score de Liquidez travado em NO MÁXIMO 5.5 / 10,
  // mesmo com transações internas do prédio (corrige Del Castilho que recebia 9/10).
  // Notas 8, 9, 10 estritamente revogadas para ruas zeradas.
  if (streetCount === 0) {
    return Math.min(5.5, Math.round(rawScore * 2) / 2);
  }

  // Nível 2 - Amostragem Frágil (rua < 3 && predio <= 1):
  if (streetCount < 3 && bldgCount <= 1) {
    return Math.min(5, Math.round(rawScore));
  }

  // Nível 3 - Amostragem Média (rua entre 3 e 4 transações e predio <= 1):
  if (streetCount >= 3 && streetCount <= 4 && bldgCount <= 1) {
    return Math.min(6.5, Math.round(rawScore * 2) / 2);
  }

  // Notas 8.0, 9.0 ou 10.0: Histórico de mercado sólido obrigatório na via (streetCount >= 3 && (predio >= 2 OU rua >= 5))
  if (!hasSolidLocalHistory) {
    return Math.min(7, Math.round(rawScore));
  }

  return Math.round(Math.max(1, Math.min(10, rawScore)));
}

export function assessDataQuality(auc: AuctionProperty): DataQualityReport {
  const reasons: string[] = [];
  const localComparableCount = getVerifiedLocalComparableCount(auc);

  // Critical failure checks
  if (auc.precisa_revisao) {
    reasons.push('Lote marcado para revisão pericial');
  }

  if (!auc.auctionPrice || auc.auctionPrice <= 0 || auc.priceVerified === false) {
    reasons.push('Preço de arrematação não validado');
  }

  if (!auc.sizeSqm || auc.sizeSqm <= 0 || auc.sizeVerified === false) {
    reasons.push('Metragem privativa pendente ou não comprovada');
  }

  if (!auc.address || auc.address.trim().length < 5 || isGenericStreet(auc.address) || auc.addressVerified === false) {
    reasons.push('Endereço genérico, inconsistente ou pendente de geolocalização');
  }

  if (auc.valuationConfidence === 'unavailable' || !auc.estimatedValue || auc.estimatedValue <= 0) {
    reasons.push('Amostragem de mercado insuficiente (sem dados no raio pericial)');
  }

  const hasExplicitCalibration = !!auc.valuationCalibration;
  if (localComparableCount < 2 && !hasExplicitCalibration) {
    reasons.push(localComparableCount === 0
      ? 'Poucos dados ITBI locais: sem transações confirmadas no prédio ou na rua'
      : 'Poucos dados ITBI locais: é necessária uma segunda transação no prédio ou na rua');
  }

  const hasCriticalInconsistency = reasons.length > 0;

  let status: DataQualityStatus;
  if (hasCriticalInconsistency) {
    status = 'Precificação Incompleta';
  } else if (hasExplicitCalibration) {
    status = 'Estimado';
  } else if (auc.valuationConfidence === 'verified' && localComparableCount >= 2) {
    status = 'Auditado';
  } else {
    status = 'Estimado';
  }

  const explicitBuildingCount = Math.max(0, Number(auc.itbiBuildingCount) || 0);
  const explicitStreetCount = Math.max(0, Number(auc.itbiStreetCount) || 0);
  const explicitSurroundingCount = Math.max(0, Number(auc.itbiSurroundingCount) || 0);
  const hasSolidLocalHistory = explicitStreetCount >= 3 && (explicitBuildingCount >= 2 || explicitStreetCount >= 5);
  const hasNoLocalHistory = (explicitBuildingCount === 0 && explicitStreetCount === 0);
  const hasFragileLocalHistory = (!hasNoLocalHistory && (explicitStreetCount < 3 && explicitBuildingCount <= 1));

  if (hasNoLocalHistory) {
    reasons.push(explicitSurroundingCount < 5
      ? 'Escuridão Amostral: Sem histórico na via ou entorno'
      : 'Risco de Amostragem: Sem histórico na via');
  } else if (hasFragileLocalHistory) {
    reasons.push('Amostragem Frágil: Poucas transações na via');
  }

  // Trava Selo Destaque (Anti-Falso Positivo)
  // Exige conformidade de 100%:
  // 1. Status 'Auditado'
  // 2. Sem pendência de revisão
  // 3. Mínimo de 5 amostras confirmadas na rua/edifício
  // 4. Confiança verified
  // 5. Desconto real de mercado >= 30% e ROI >= 35%
  // 6. Liquidez >= 7
  // 7. Não ser área de risco
  // 8. Comprovação obrigatória de histórico local
  const discountRate = auc.estimatedValue && auc.auctionPrice 
    ? (auc.estimatedValue - auc.auctionPrice) / auc.estimatedValue 
    : 0;

  const canBeFeatured = 
    status === 'Auditado' &&
    !auc.precisa_revisao &&
    hasSolidLocalHistory &&
    localComparableCount >= 5 &&
    auc.valuationConfidence === 'verified' &&
    (auc.calculatedRoi || 0) >= 35 &&
    (auc.liquidityScore || 0) >= 7 &&
    discountRate >= 0.30 &&
    auc.riskLevel !== 'Alto' &&
    !auc.isCommunityRisk;

  let badgeLabel = 'Auditado';
  let badgeClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50';

  if (status === 'Precificação Incompleta') {
    badgeLabel = localComparableCount < 2
      ? 'Poucos dados ITBI para precificação'
      : (auc.precisa_revisao ? 'Revisão documental pendente' : 'Dados do imóvel pendentes');
    badgeClass = 'bg-amber-950/70 text-amber-300 border-amber-600/50';
  } else if (status === 'Estimado') {
    badgeLabel = auc.valuationCalibration === 'radius_neighborhood'
      ? 'Calibrado por raio e bairro'
      : auc.valuationCalibration === 'few_local_samples'
        ? 'Calibrado: poucas amostras locais'
        : 'Projeção Estimada';
    badgeClass = 'bg-amber-950/70 text-amber-300 border-amber-600/50';
  }

  // Trava de liquidez proporcional estritamente à densidade amostral
  let liquidityCeiling = calculateSampleDensityLiquidity(auc);
  const isCalibratedBadge = hasExplicitCalibration || (typeof badgeLabel === 'string' && badgeLabel.includes('Calibrado'));
  if (explicitStreetCount === 0 && explicitBuildingCount === 0 && !isCalibratedBadge) {
    liquidityCeiling = 0;
  } else if (isCalibratedBadge) {
    const maxCeiling = explicitSurroundingCount < 5 ? 3.0 : 5.0;
    liquidityCeiling = Math.min(liquidityCeiling, maxCeiling);
  }

  return {
    status,
    isAuditado: status === 'Auditado',
    isEstimado: status === 'Estimado',
    isIncompleto: status === 'Precificação Incompleta',
    canBeFeatured,
    liquidityCeiling,
    hasNoLocalHistory,
    hasFragileLocalHistory,
    reasons,
    badgeLabel,
    badgeClass
  };
}
