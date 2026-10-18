import { ItbiTransaction } from '../types.ts';

/**
 * Filtro Universal Anti-Fiduciária e Saneamento de Amostras de ITBI:
 * - Rio de Janeiro: Toda transação só é aceita se não possuir centavos (vl_declarado % 1 === 0)
 *   e for múltiplo exato de R$ 100 (vl_declarado % 100 === 0). Transações com valores quebrados
 *   decorrem de liquidação de saldo devedor/garantia (Lei 9.514/97) e são expurgadas compulsoriamente.
 * - Juiz de Fora: Mantém a regra de natureza explícita (COMPRA E VENDA / COMPRA E VENDA PURA).
 * - Niterói: Mantém a média oficial da via municipal já saneada pela prefeitura.
 */
export function isVoluntaryMarketSale(tx: ItbiTransaction): boolean {
  if (!tx) return false;

  const city = String(tx.city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  const state = String(tx.state || '').toUpperCase().trim();

  // 1. Juiz de Fora (e bases que possuam a coluna de natureza explícita)
  if (city.includes('JUIZ DE FORA') || state === 'MG') {
    if (tx.isCompraEVenda === true) return true;
    if (tx.naturezaOperacao) {
      const nat = String(tx.naturezaOperacao).trim().toUpperCase();
      return nat === 'COMPRA E VENDA' || nat === 'COMPRA E VENDA PURA';
    }
    return false;
  }

  // 2. Niterói (média de rua oficial da prefeitura já saneada)
  if (city.includes('NITEROI') || (tx as any).sourceAggregation === 'municipal_street_average') {
    return true;
  }

  // 3. Rio de Janeiro (e demais municípios sem discriminação de natureza):
  // Filtro Universal Anti-Fiduciária: Múltiplos de R$ 100 e sem centavos fracionados
  const val = Number(tx.transactionValue);
  if (!Number.isFinite(val) || val <= 0) return false;

  // 1. Não possuir centavos fracionados (vl_declarado % 1 === 0)
  if (Math.abs(val - Math.round(val)) > 1e-4) return false;

  // 2. For múltiplo exato de R$ 100 (vl_declarado % 100 === 0)
  const intVal = Math.round(val);
  if (intVal % 100 !== 0) return false;

  return true;
}

export interface ItbiTierInput {
  value: number;
  count: number;
}

export interface ItbiWeightedComponent extends ItbiTierInput {
  id: 'building' | 'street' | 'surrounding' | 'neighborhood';
  label: string;
  weight: number;
}

export interface FourTierValuation {
  value: number;
  totalWeight: number;
  localSampleCount: number;
  priceable: boolean;
  calibrated: boolean;
  calibrationKind?: 'few_local_samples' | 'radius_neighborhood';
  components: ItbiWeightedComponent[];
  isSurroundingOutlier?: boolean;
  isOutlierBrakeApplied?: boolean;
}

/** Fixed ITBI hierarchy: building 40%, street 35%, selected radius 15%, neighborhood 10%.
 * Missing tiers are excluded and the remaining weights are normalized. With fewer
 * than two local sales, contextual calibration is allowed only with at least five
 * exact-address radius sales and seven neighborhood sales.
 */
export function computeFourTierValuation(input: {
  building?: ItbiTierInput;
  street?: ItbiTierInput;
  surrounding?: ItbiTierInput;
  neighborhood?: ItbiTierInput;
  radiusKm?: number;
  minimumLocalSamples?: number;
  allowContextOnly?: boolean;
}): FourTierValuation {
  const tiers = ([
    { id: 'building', label: 'Prédio', weight: 40, ...(input.building || { value: 0, count: 0 }) },
    { id: 'street', label: 'Rua', weight: 35, ...(input.street || { value: 0, count: 0 }) },
    { id: 'surrounding', label: `Raio ${input.radiusKm && input.radiusKm !== 0.5 ? `${input.radiusKm}km` : '500m'}`, weight: 15, ...(input.surrounding || { value: 0, count: 0 }) },
    { id: 'neighborhood', label: 'Bairro', weight: 10, ...(input.neighborhood || { value: 0, count: 0 }) }
  ] satisfies ItbiWeightedComponent[]).filter(tier => Number.isFinite(tier.value) && tier.value > 0 && Number.isFinite(tier.count) && tier.count > 0);

  const localSampleCount = tiers
    .filter(tier => tier.id === 'building' || tier.id === 'street')
    .reduce((sum, tier) => sum + tier.count, 0);
  const minimumLocalSamples = Math.max(2, input.minimumLocalSamples ?? 2);
  const calibratedWithoutLocal = input.allowContextOnly !== false && localSampleCount < minimumLocalSamples &&
    (input.surrounding?.count || 0) >= 5 && (input.neighborhood?.count || 0) >= 7;

  // Solid local hierarchy (SSOT - NBR 14.653):
  // 1. Condomínio/Prédio com >= 2 vendas: O prédio é a referência direta e soberana.
  // 2. Condomínio com 1 venda e Rua com >= 5: Pondera prédio + rua sem contaminação externa.
  // 3. Mesma Rua com >= 4 vendas (e sem vendas no prédio): A rua é a referência direta e soberana.
  const bldgCount = input.building?.count || 0;
  const streetCount = input.street?.count || 0;
  const neighborhoodValue = input.neighborhood?.value || 0;
  const streetValue = input.street?.value || 0;
  const surroundingCount = input.surrounding?.count || 0;
  const surroundingValue = input.surrounding?.value || 0;

  // FREIO E BLOQUEIO DE OUTLIER NO RAIO (Ruas do Entorno):
  // Quando o raio tiver poucas amostras (< 3 tx) e o valor ficar fora da curva (> 35% de desvio
  // em relação à rua ou bairro), ativa o freio para impedir contaminação do valor patrimonial.
  const refBenchmarkVal = streetValue > 0 ? streetValue : neighborhoodValue;
  const isSurroundingOutlier = surroundingCount > 0 && surroundingCount < 3 && refBenchmarkVal > 0 &&
    (surroundingValue > refBenchmarkVal * 1.35 || surroundingValue < refBenchmarkVal * 0.65);

  const hasSolidBuilding = bldgCount >= 2;
  const hasBuildingAndSolidStreet = bldgCount >= 1 && streetCount >= 4;
  const hasSolidStreet = streetCount >= 4 && bldgCount === 0;

  let activeTiers: ItbiWeightedComponent[];
  if (hasSolidBuilding) {
    activeTiers = tiers.filter(tier => tier.id === 'building');
  } else if (hasBuildingAndSolidStreet) {
    activeTiers = tiers.filter(tier => tier.id === 'building' || tier.id === 'street');
  } else if (hasSolidStreet) {
    activeTiers = tiers.filter(tier => tier.id === 'street');
  } else if (calibratedWithoutLocal) {
    activeTiers = tiers.filter(tier => tier.id === 'surrounding' || tier.id === 'neighborhood');
  } else if (isSurroundingOutlier && (streetCount >= 2 || (input.neighborhood?.count || 0) >= 5)) {
    // Freio ativado: descarta o entorno discrepante com poucas amostras e faz a média ponderada sobre os dados confiáveis (Prédio, Rua e Bairro)
    activeTiers = tiers.filter(tier => tier.id !== 'surrounding');
  } else {
    activeTiers = tiers;
  }
  const activeWeight = activeTiers.reduce((sum, tier) => sum + tier.weight, 0);
  const priceable = (localSampleCount >= minimumLocalSamples || calibratedWithoutLocal) && activeWeight > 0;
  const weightedSum = activeTiers.reduce((sum, tier) => sum + tier.value * tier.weight, 0);
  let finalValue = priceable ? Math.round(weightedSum / activeWeight) : 0;

  // Calibração Conservadora: quando a amostragem local é frágil (< 3 transações)
  // ou quando o entorno foi bloqueado, o valor NUNCA pode inflacionar acima do teto seguro
  const isFragileSampling = localSampleCount < 3 || calibratedWithoutLocal;
  if (isFragileSampling && finalValue > 0 && neighborhoodValue > 0) {
    const neighborhoodCeiling = Math.round(neighborhoodValue * 1.05);
    if (finalValue > neighborhoodCeiling) {
      finalValue = neighborhoodCeiling;
    }
  }

  // Trava de segurança da via: se a Mesma Rua tem amostragem confiável (>= 3 vendas),
  // o valor ponderado final não pode descolar mais de 10% da média da própria rua
  if (streetCount >= 3 && streetValue > 0 && finalValue > Math.round(streetValue * 1.10)) {
    finalValue = Math.round(streetValue * 1.10);
  }

  const calibrated = priceable && (localSampleCount < 7);

  const isOutlierBrakeApplied = isSurroundingOutlier && (streetCount >= 2 || (input.neighborhood?.count || 0) >= 5);

  return {
    value: finalValue,
    totalWeight: activeWeight,
    localSampleCount,
    priceable,
    calibrated,
    calibrationKind: calibratedWithoutLocal ? 'radius_neighborhood' : calibrated ? 'few_local_samples' : undefined,
    components: activeTiers,
    isSurroundingOutlier,
    isOutlierBrakeApplied
  };
}
