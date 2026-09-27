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
  // A lone local deed is too unstable to carry the 40% building or 35% street
  // weight. When there are fewer than two local deeds, calibrate from the
  // verified radius and neighborhood only.
  const activeTiers = calibratedWithoutLocal
    ? tiers.filter(tier => tier.id === 'surrounding' || tier.id === 'neighborhood')
    : tiers;
  const activeWeight = activeTiers.reduce((sum, tier) => sum + tier.weight, 0);
  const priceable = (localSampleCount >= minimumLocalSamples || calibratedWithoutLocal) && activeWeight > 0;
  const weightedSum = activeTiers.reduce((sum, tier) => sum + tier.value * tier.weight, 0);
  const calibrated = priceable && (localSampleCount < 7);

  return {
    value: priceable ? Math.round(weightedSum / activeWeight) : 0,
    totalWeight: activeWeight,
    localSampleCount,
    priceable,
    calibrated,
    calibrationKind: calibratedWithoutLocal ? 'radius_neighborhood' : calibrated ? 'few_local_samples' : undefined,
    components: activeTiers
  };
}
