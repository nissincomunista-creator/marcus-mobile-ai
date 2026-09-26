import { AuctionProperty } from '../types.ts';
import { isGenericStreet } from './bidirectionalBenchmark.ts';

export type DataQualityStatus = 'Auditado' | 'Estimado' | 'Auditoria Incompleta';

export interface DataQualityReport {
  status: DataQualityStatus;
  isAuditado: boolean;
  isEstimado: boolean;
  isIncompleto: boolean;
  canBeFeatured: boolean;
  liquidityCeiling: number;
  reasons: string[];
  badgeLabel: string;
  badgeClass: string;
}

/** Only same-building or same-street samples support a high liquidity score.
 * Legacy records without explicit provenance are treated conservatively. */
export function getVerifiedLocalComparableCount(auc: AuctionProperty): number {
  if (auc.valuationLevel === 'Prédio') return Math.max(0, Number(auc.itbiBuildingCount) || 0);
  if (auc.valuationLevel === 'Rua') return Math.max(0, Number(auc.valuationSampleCount) || 0);
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

  if (localComparableCount === 0) {
    reasons.push('Sem transações confirmadas no prédio ou na rua');
  }

  const hasCriticalInconsistency = reasons.length > 0;

  let status: DataQualityStatus;
  if (hasCriticalInconsistency) {
    status = 'Auditoria Incompleta';
  } else if (auc.valuationConfidence === 'verified' && localComparableCount >= 2) {
    status = 'Auditado';
  } else {
    status = 'Estimado';
  }

  // Trava de liquidez proporcional à incerteza
  let liquidityCeiling = 10;
  if (status === 'Auditoria Incompleta') {
    liquidityCeiling = auc.precisa_revisao ? 1 : 3;
  } else if (localComparableCount === 0) {
    liquidityCeiling = 3;
  } else if (localComparableCount < 2) {
    liquidityCeiling = 4;
  } else if (localComparableCount < 5) {
    liquidityCeiling = 6;
  } else if (auc.valuationConfidence === 'projected') {
    liquidityCeiling = 4;
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
  const discountRate = auc.estimatedValue && auc.auctionPrice 
    ? (auc.estimatedValue - auc.auctionPrice) / auc.estimatedValue 
    : 0;

  const canBeFeatured = 
    status === 'Auditado' &&
    !auc.precisa_revisao &&
    localComparableCount >= 5 &&
    auc.valuationConfidence === 'verified' &&
    (auc.calculatedRoi || 0) >= 35 &&
    (auc.liquidityScore || 0) >= 7 &&
    discountRate >= 0.30 &&
    auc.riskLevel !== 'Alto' &&
    !auc.isCommunityRisk;

  let badgeLabel = 'Auditado';
  let badgeClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50';

  if (status === 'Auditoria Incompleta') {
    badgeLabel = 'Auditoria Incompleta';
    badgeClass = 'bg-rose-950/80 text-rose-300 border-rose-700/60';
  } else if (status === 'Estimado') {
    badgeLabel = 'Projeção Estimada';
    badgeClass = 'bg-amber-950/70 text-amber-300 border-amber-600/50';
  }

  return {
    status,
    isAuditado: status === 'Auditado',
    isEstimado: status === 'Estimado',
    isIncompleto: status === 'Auditoria Incompleta',
    canBeFeatured,
    liquidityCeiling,
    reasons,
    badgeLabel,
    badgeClass
  };
}
