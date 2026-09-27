export interface JuizDeForaAreaAnchor {
  sizeSqm: number;
  marketValue: number;
  propertyType: string;
  source?: string;
  sizeVerified?: boolean;
}

export interface JuizDeForaAreaModel {
  referenceAreaSqm: number;
  referenceValue: number;
  minAreaSqm: number;
  maxAreaSqm: number;
  elasticity: number;
  sampleCount: number;
  rSquared: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'verified-area-anchors' | 'fallback';
}

function median(values: number[]): number {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function cleanType(value: string): string {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Fits the price-versus-area curve only from independent, confirmed-area
 * appraisal anchors. ITBI transaction percentages and synthetic areas are
 * never used as areas. The fitted curve is used solely to group area-less
 * sale totals into an estimated size band; it is not written back as a fact.
 */
export function fitJuizDeForaAreaModel(
  anchors: JuizDeForaAreaAnchor[],
  targetPropertyType: string
): JuizDeForaAreaModel {
  const normalizedTarget = cleanType(targetPropertyType);
  const clean = anchors.filter(anchor => {
    const area = Number(anchor.sizeSqm);
    const value = Number(anchor.marketValue);
    const psm = value / area;
    return anchor.sizeVerified === true && area >= 20 && area <= 500 && value >= 20000 &&
      psm >= 800 && psm <= 15000 && Number.isFinite(psm);
  });

  const exactType = clean.filter(anchor => cleanType(anchor.propertyType) === normalizedTarget);
  const modelAnchors = exactType.length >= 8
    ? exactType
    : normalizedTarget === 'casa'
      ? clean.filter(anchor => ['casa', 'apartamento'].includes(cleanType(anchor.propertyType)))
      : clean;

  if (modelAnchors.length < 3) {
    return {
      referenceAreaSqm: 60,
      referenceValue: 0,
      minAreaSqm: 20,
      maxAreaSqm: 500,
      elasticity: 0.7,
      sampleCount: modelAnchors.length,
      rSquared: 0,
      confidence: 'low',
      source: 'fallback'
    };
  }

  // Remove only gross unit-value anomalies before calculating the robust unit-rate anchor.
  const rates = modelAnchors.map(anchor => anchor.marketValue / anchor.sizeSqm);
  const sortedRates = [...rates].sort((a, b) => a - b);
  const q1 = sortedRates[Math.floor(sortedRates.length * 0.25)];
  const q3 = sortedRates[Math.floor(sortedRates.length * 0.75)];
  const iqr = q3 - q1;
  const low = Math.max(800, q1 - 1.5 * iqr);
  const high = Math.min(15000, q3 + 1.5 * iqr);
  const filtered = modelAnchors.filter(anchor => {
    const rate = anchor.marketValue / anchor.sizeSqm;
    return rate >= low && rate <= high;
  });
  const fit = filtered.length >= 3 ? filtered : modelAnchors;
  const xs = fit.map(anchor => Math.log(anchor.sizeSqm));
  const ys = fit.map(anchor => Math.log(anchor.marketValue));
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const referenceAreaSqm = median(fit.map(anchor => anchor.sizeSqm));
  // For a known target area, value should grow with area at a stable unit rate.
  // The previous log curve forced elasticity below 0.5 for these noisy city
  // anchors and systematically undervalued large units. Use the robust median
  // R$/m² from verified-area anchors; local ITBI clusters still determine the
  // final estimate and are never converted into stored area facts.
  const referencePriceSqm = median(fit.map(anchor => anchor.marketValue / anchor.sizeSqm));
  const elasticity = 1;
  const referenceValue = referencePriceSqm * referenceAreaSqm;
  const residualSum = fit.reduce((sum, anchor) => {
    const residual = Math.log(anchor.marketValue) - Math.log(referencePriceSqm * anchor.sizeSqm);
    return sum + residual ** 2;
  }, 0);
  const totalSum = ys.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const rSquared = totalSum > 0 ? Math.max(0, Math.min(1, 1 - residualSum / totalSum)) : 0;
  const confidence = fit.length >= 20 && rSquared >= 0.55
    ? 'high'
    : fit.length >= 10 && rSquared >= 0.3
      ? 'medium'
      : 'low';

  return {
    referenceAreaSqm: Math.round(referenceAreaSqm * 10) / 10,
    referenceValue: Math.round(referenceValue),
    // Area bounds come from all independently verified anchors, including
    // valid large units whose price-per-m² is atypical and was trimmed only
    // from the curve fit. Do not confuse a price outlier with an area limit.
    minAreaSqm: Math.min(...modelAnchors.map(anchor => anchor.sizeSqm)),
    maxAreaSqm: Math.max(...modelAnchors.map(anchor => anchor.sizeSqm)),
    elasticity,
    sampleCount: fit.length,
    rSquared,
    confidence,
    source: 'verified-area-anchors'
  };
}

export function inferJfComparableArea(transactionValue: number, model: JuizDeForaAreaModel): number | undefined {
  if (!(transactionValue > 0) || !(model.referenceValue > 0) || !(model.elasticity > 0)) return undefined;
  const equivalent = model.referenceAreaSqm * Math.pow(transactionValue / model.referenceValue, 1 / model.elasticity);
  if (!Number.isFinite(equivalent) || equivalent < 15 || equivalent > 1000) return undefined;
  return Math.round(equivalent * 10) / 10;
}
