import { canonicalStreet, resolveOfficialStreet } from './streetMatching.ts';
import { ItbiTransaction } from '../types.ts';
import { computeFourTierValuation } from './fourTierValuation.ts';
import { inferJfComparableArea, JuizDeForaAreaModel } from './juizDeForaAreaModel.ts';

export const DEFAULT_BENCHMARK_SIZE_MODE: 'similar' = 'similar';

export interface TierStats {
  saneada: number;
  total: number;
  validas: number;
  expurgadas: number;
  prelim?: number;
  refCorte?: number;
  corteMin?: number;
  corteMax?: number;
  effectiveRadiusKm?: number;
  radiusLabel?: string;
  fallbackLevel?: '0.5km' | '1.0km' | '2.0km' | 'bairro';
  isHomogeneizado?: boolean;
  fatorEscala?: number;
  areaMediaGeral?: number;
  cenarioArea?: 'A' | 'B';
}

export interface BidirectionalBenchmarkResult {
  bairro: TierStats;
  raio: TierStats;
  rua: TierStats;
  predio: TierStats;
  mediaCorteReal: number;
  nivelUtilizado: 'Prédio' | 'Rua' | 'Raio Entorno' | 'Bairro' | 'Sem Dados Suficientes';
  flipRapidoSqm: number;
  gabaritoTotal: number;
  flipTotal: number;
  ruaRaioDesvioPct: number;
  ruaRaioCalibrada: boolean;
  radiusVerified: boolean;
  effectiveRadiusKm?: number;
  radiusLabel?: string;
  fallbackLevel?: '0.5km' | '1.0km' | '2.0km' | 'bairro';
  minSimilarSize: number;
  maxSimilarSize: number;
  hasMicroData: boolean;
  calibrated?: boolean;
  calibrationKind?: 'few_local_samples' | 'radius_neighborhood';
  buildingSafetyValveApplied?: boolean;
  isAbsolutePricing?: boolean;
  compraEVendaCount?: number;
  totalRawSamples?: number;
  dateRange?: { minDate?: string; maxDate?: string; };
  m2BaseRua?: number;
  fatorEscala?: number;
  areaReferencia?: number;
  areaAlvo?: number;
  isDerivedSqm?: boolean;
  areaModelSampleCount?: number;
  areaModelConfidence?: 'high' | 'medium' | 'low';
  areaModelElasticity?: number;
  isAreaHomogeneizada?: boolean;
  areaMediaGeral?: number;
  cenarioArea?: 'A' | 'B';
}

export function isGenericStreet(str?: string | null): boolean {
  if (!str) return true;
  const s = str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  
  if (s.length < 3) return true;

  // Generic patterns: "rua a", "rua 1", "estrada 2", "travessa b", "alameda 10"
  const genericPrefixRegex = /^(rua|r\b|avenida|av\b|estrada|estr\b|travessa|trav\b|alameda|al\b|via|beco|praca|pc\b)\s+([a-z]|[0-9]{1,3})$/i;
  if (genericPrefixRegex.test(s)) return true;

  const strictlyGenericKeywords = [
    'projetad', 'sem nome', 's/n', 'nao informado', 'nao informada', 
    'extracao documental', 'apartamento em', 'casa de condominio em'
  ];
  if (strictlyGenericKeywords.some(k => s.includes(k))) return true;

  // Terms like quadra, loteamento, gleba only make the street generic if it begins with them
  const startGenericRegex = /^(?:quadra|qd\b|loteamento|gleba|chacara|sitio|estrada municipal|zona rural|area rural|area de posse|vila nova|povoado)\b/i;
  if (startGenericRegex.test(s)) return true;

  const core = cleanStreetCore(s);
  if (core.length <= 2) return true;

  return false;
}

export function cleanStreetCore(s: string | undefined | null): string {
  return canonicalStreet(s);
}

export function cleanStreetNumber(n: string | undefined | null): string {
  if (!n) return '';
  const decoded = String(n).replace(/_x([0-9a-fA-F]{4})_/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const match = decoded.match(/\d+/);
  return match ? String(parseInt(match[0], 10)) : '';
}

export function computeMedian(vals: number[]): number {
  if (vals.length === 0) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Motor Pericial de Corte Bidirecional de Outliers (NBR 14.653)
 * 1. Média preliminar da rua antes de cortar.
 * 2. Balizamento com a média do raio (ruas do entorno).
 * 3. Aplicação do corte estrito: 25% acima corta, 25% abaixo corta.
 * 4. Processamento bidirecional:
 *    - De frente pra trás: Bairro -> Raio -> Rua -> Prédio
 *    - De trás pra frente: Prédio -> Rua -> Raio -> Bairro
 * 5. Convergência da Média de Corte Real para Flip Rápido e Gabarito.
 */
/**
 * Normalização de ITBI:
 * valor_integral = valor_declarado / fracao_transmitida
 */
export function getTxIntegralValue(tx: ItbiTransaction): number {
  if (typeof tx.normalizedTotalValue === 'number' && tx.normalizedTotalValue > 0) {
    return tx.normalizedTotalValue;
  }
  const frac = (tx.percentualTransmitido && tx.percentualTransmitido > 0)
    ? (tx.percentualTransmitido <= 1 ? tx.percentualTransmitido : tx.percentualTransmitido / 100)
    : 1;
  return Math.round(tx.transactionValue / frac);
}

/**
 * Corte de ruído estatístico por Intervalo Interquartil (IQR):
 * Q1 (percentil 25) e Q3 (percentil 75)
 * Limites: Q1 - 1.5 * IQR até Q3 + 1.5 * IQR
 */
export function filterByIQR(values: number[]): { filtered: number[]; q1: number; q3: number; iqr: number; minBound: number; maxBound: number } {
  if (values.length < 4) {
    return { filtered: values, q1: 0, q3: 0, iqr: 0, minBound: 0, maxBound: Infinity };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const minBound = Math.max(10000, q1 - 1.5 * iqr);
  const maxBound = q3 + 1.5 * iqr;
  const filtered = sorted.filter(v => v >= minBound && v <= maxBound);
  return {
    filtered: filtered.length > 0 ? filtered : sorted,
    q1,
    q3,
    iqr,
    minBound,
    maxBound
  };
}

/**
 * Inferência reversa de metragem para listagem de histórico:
 * area_estimada = round(valor_integral / m2_base_rua, 1)
 */
export function inferReverseArea(valorIntegral: number, m2BaseRua: number): number | undefined {
  if (!(valorIntegral > 0) || !(m2BaseRua > 0)) return undefined;
  const area = valorIntegral / m2BaseRua;
  if (!Number.isFinite(area) || area < 15 || area > 1000) return undefined;
  return Math.round(area * 10) / 10;
}

export function computeBidirectionalBenchmarks(
  allNeighborhoodTxs: ItbiTransaction[],
  targetStreet: string,
  targetNumber: string | undefined | null,
  targetSize: number,
  sizeMode: 'similar' | 'all' = 'similar',
  radiusKm: number = 0.5,
  targetPropType?: string,
  targetNeighborhood?: string,
  areaModel?: JuizDeForaAreaModel,
  radiusTransactions?: ItbiTransaction[]
): BidirectionalBenchmarkResult | null {
  if (!allNeighborhoodTxs || allNeighborhoodTxs.length === 0) return null;

  const isJuizDeFora = allNeighborhoodTxs.some(t =>
    String(t.city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('juiz de fora')
  );

  // Isolamento Estrito da Natureza da Operação para Juiz de Fora (Apenas Compra e Venda baliza mercado):
  const sourceTxs = isJuizDeFora ? allNeighborhoodTxs.filter(t => t.isCompraEVenda === true) : allNeighborhoodTxs;
  if (sourceTxs.length === 0) return null;

  const jfDates = isJuizDeFora ? sourceTxs.map(t => t.date).filter(Boolean).sort() : [];
  const dateRange = jfDates.length > 0 ? { minDate: jfDates[0], maxDate: jfDates[jfDates.length - 1] } : undefined;

  const officialStreet = resolveOfficialStreet(targetStreet, sourceTxs.map(t => t.street || ''));
  const targetCore = cleanStreetCore(officialStreet || targetStreet);
  const targetNum = cleanStreetNumber(targetNumber);

  // Isolamento Estrito de Tipologia (Casa não pode ser precificada com m² de Apartamento, e vice-versa):
  let typeTxs = sourceTxs;
  if (targetPropType) {
    const exactTypeTxs = sourceTxs.filter(t => t.propertyType === targetPropType);
    if (exactTypeTxs.length > 0) {
      typeTxs = exactTypeTxs;
    }
  }

  // =========================================================================
  // METODOLOGIA HOMOGENEIZADA NBR 14.653 PARA JUIZ DE FORA (SEM METRAGEM ORIGINAL)
  // =========================================================================
  if (isJuizDeFora) {
    const area_alvo = targetSize > 0 ? targetSize : 0;
    const neighborhoodCore = String(targetNeighborhood || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const exactType = typeTxs.filter(t => t.propertyType === targetPropType && t.propertyTypeVerified === true);
    const typeUnverified = typeTxs.filter(t => t.propertyTypeVerified !== true);
    // Most official JF rows do not identify unit type in the document. Keep
    // those records inside the already inferred target-type pool (local
    // building/street evidence), instead of silently dropping nearly all
    // official sales when a handful of explicit types exist elsewhere.
    const comparablePool = exactType.length >= 5 ? [...exactType, ...typeUnverified] : typeTxs;
    const neighborhoodPool = neighborhoodCore
      ? comparablePool.filter(t => String(t.neighborhood || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') === neighborhoodCore)
      : [];
    const validAmount = (tx: ItbiTransaction) => {
      const value = getTxIntegralValue(tx);
      return Number.isFinite(value) && value >= 20000 && value <= 50000000 ? value : 0;
    };
    const areaReference = areaModel?.referenceAreaSqm || 0;
    const elasticity = areaModel?.elasticity || 0.7;
    // ITBI-JF has no unit area. Keep local sale data usable even if the
    // verified-area calibration is weak; widen the comparison band and expose
    // low confidence instead of dropping the street/building observations.
    const withinModelDomain = !!areaModel && area_alvo >= areaModel.minAreaSqm * 0.5 && area_alvo <= areaModel.maxAreaSqm * 2.5;
    const effectiveAreaModelConfidence = !areaModel || area_alvo < areaModel.minAreaSqm * 0.75 || area_alvo > areaModel.maxAreaSqm * 1.25
      ? 'low'
      : areaModel.confidence;
    const buildTier = (candidates: ItbiTransaction[], minCount: number) => {
      const amountRows = candidates.map(tx => ({ tx, value: validAmount(tx) })).filter(row => row.value > 0);
      const sane = filterByIQR(amountRows.map(row => row.value));
      const saneSet = new Set(sane.filtered);
      const saneRows = amountRows.filter(row => saneSet.has(row.value));
      // Use an ephemeral price/area cluster based on independently verified
      // area anchors. It is a comparison aid only: never store inferred ITBI
      // area or treat a transferred percentage as square metres.
      const areaBands: Array<[number, number]> = effectiveAreaModelConfidence === 'low'
        ? [[0.75, 1.25], [0.65, 1.45], [0.55, 1.6]]
        : [[0.8, 1.2], [0.7, 1.3], [0.55, 1.5]];
      const clusterRows = areaModel && withinModelDomain && area_alvo > 0
        ? saneRows.map(row => ({ ...row, equivalentArea: inferJfComparableArea(row.value, areaModel) }))
        : [];
      let matches: typeof clusterRows = [];
      for (const [minFactor, maxFactor] of areaBands) {
        const bandRows = clusterRows.filter(row => row.equivalentArea !== undefined &&
          row.equivalentArea >= area_alvo * minFactor && row.equivalentArea <= area_alvo * maxFactor);
        if (bandRows.length >= minCount) {
          matches = bandRows;
          break;
        }
      }
      if (matches.length < minCount) matches = [];
      const values = matches.map(row => row.value);
      const total = values.length ? Math.round(computeMedian(values)) : 0;
      const perSqm = total > 0 && area_alvo > 0 ? Math.round(total / area_alvo) : 0;
      const outlierCount = amountRows.length - saneRows.length;
      return {
        total,
        perSqm,
        totalRows: candidates.length,
        validRows: matches.length,
        excludedRows: Math.max(0, candidates.length - matches.length),
        outlierCount,
        distances: matches.map(row => Number(row.tx.distanceKm)).filter(Number.isFinite)
      };
    };

    const neighborhoodMatches = (tx: ItbiTransaction) => {
      if (!neighborhoodCore || !tx.neighborhood) return true;
      const transactionNeighborhood = String(tx.neighborhood).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return transactionNeighborhood === neighborhoodCore;
    };
    const streetMatches = targetCore
      ? comparablePool.filter(t => cleanStreetCore(t.street) === targetCore && neighborhoodMatches(t))
      : [];
    const buildingRows = targetNum ? streetMatches.filter(t => cleanStreetNumber(t.number) === targetNum) : [];
    const buildingIds = new Set(buildingRows.map(tx => tx.id));
    const streetRows = streetMatches.filter(tx => !buildingIds.has(tx.id));
    const immediateRows = (radiusTransactions || comparablePool).filter(t => {
      if (t.transactionLocationPrecision !== 'exact_number') return false;
      if (t.propertyType !== targetPropType) return false;
      if (radiusTransactions && !typeTxs.some(local => local.id === t.id)) return false;
      if (!Number.isFinite(Number(t.distanceKm))) return false;
      const distance = Number(t.distanceKm);
      return distance <= (radiusKm || 0.5);
    });
    const usedLocalIds = new Set([...streetMatches.map(tx => tx.id), ...immediateRows.map(tx => tx.id)]);
    const neighborhoodRows = neighborhoodPool.filter(tx => !usedLocalIds.has(tx.id));

    const building = buildTier(buildingRows, 1);
    const street = buildTier(streetRows, 1);
    const surrounding = buildTier(immediateRows, 2);
    const neighborhood = buildTier(neighborhoodRows, 3);
    const weighted = computeFourTierValuation({
      building: { value: building.perSqm, count: building.validRows },
      street: { value: street.perSqm, count: street.validRows },
      // buildTier.total is a whole-property price. The four-tier calculator
      // consumes R$/m², so only its perSqm values belong here.
      surrounding: { value: surrounding.perSqm, count: surrounding.validRows },
      neighborhood: { value: neighborhood.perSqm, count: neighborhood.validRows },
      radiusKm,
      allowContextOnly: true
    });
    const hasLocalSale = building.validRows + street.validRows > 0;
    const hasMicroData = weighted.priceable && (hasLocalSale || weighted.calibrationKind === 'radius_neighborhood');
    const mediaCorteReal = hasMicroData && area_alvo > 0 ? weighted.value : 0;
    const nivelUtilizado: BidirectionalBenchmarkResult['nivelUtilizado'] = !hasMicroData
      ? 'Sem Dados Suficientes'
      : weighted.calibrationKind === 'radius_neighborhood' ? 'Raio Entorno'
      : building.validRows > 0 ? 'Prédio' : 'Rua';
    const gabaritoTotal = hasMicroData ? Math.round(weighted.value * area_alvo) : 0;
    const flipRapidoSqm = hasMicroData ? Math.round(mediaCorteReal * 0.90) : 0;
    const flipTotal = hasMicroData ? Math.round(gabaritoTotal * 0.90) : 0;
    const hasVerifiedRadius = surrounding.validRows >= 2;
    const fallbackLevel: '0.5km' | '1.0km' | '2.0km' | 'bairro' = hasVerifiedRadius ? '0.5km' : 'bairro';
    const radiusLabel = hasVerifiedRadius ? `Raio ITBI verificado até ${radiusKm || 0.5}km` : 'Sem amostras ITBI geolocalizadas no raio';
    const tier = (value: number, total: number, validas: number, expurgadas: number, prelim: number): TierStats => ({ saneada: value, total, validas, expurgadas, prelim });
    const minSimilarSize = Math.max(15, Math.round(area_alvo * 0.67));
    const maxSimilarSize = Math.round(area_alvo * 1.33);
    const sourceDates = sourceTxs.map(tx => tx.date).filter(Boolean).sort();

    return {
      bairro: tier(neighborhood.perSqm, neighborhood.totalRows, neighborhood.validRows, neighborhood.excludedRows, neighborhood.perSqm),
      raio: { ...tier(surrounding.perSqm, surrounding.totalRows, surrounding.validRows, surrounding.excludedRows, surrounding.perSqm), effectiveRadiusKm: hasVerifiedRadius ? radiusKm || 0.5 : undefined, radiusLabel, fallbackLevel },
      rua: tier(street.perSqm, street.totalRows, street.validRows, street.excludedRows, street.perSqm),
      predio: tier(building.perSqm, building.totalRows, building.validRows, building.excludedRows, building.perSqm),
      mediaCorteReal,
      nivelUtilizado,
      flipRapidoSqm,
      gabaritoTotal,
      flipTotal,
      ruaRaioDesvioPct: street.perSqm > 0 && surrounding.perSqm > 0 ? Math.round(((street.perSqm - surrounding.perSqm) / surrounding.perSqm) * 100) : 0,
      ruaRaioCalibrada: hasVerifiedRadius && street.perSqm > 0 && Math.abs((street.perSqm - surrounding.perSqm) / surrounding.perSqm) > 0.25,
      radiusVerified: hasVerifiedRadius,
      effectiveRadiusKm: hasVerifiedRadius ? radiusKm || 0.5 : undefined,
      radiusLabel,
      fallbackLevel,
      minSimilarSize,
      maxSimilarSize,
      hasMicroData,
      calibrated: weighted.calibrated,
      calibrationKind: weighted.calibrationKind,
      isAbsolutePricing: true,
      isDerivedSqm: false,
      m2BaseRua: areaModel?.referenceValue && areaReference > 0 ? Math.round(areaModel.referenceValue / areaReference) : undefined,
      fatorEscala: areaModel?.referenceAreaSqm ? Number(Math.pow(area_alvo / areaModel.referenceAreaSqm, elasticity).toFixed(3)) : undefined,
      areaReferencia: areaReference,
      areaAlvo: area_alvo,
      areaModelSampleCount: areaModel?.sampleCount || 0,
      areaModelConfidence: effectiveAreaModelConfidence,
      areaModelElasticity: elasticity,
      compraEVendaCount: sourceTxs.length,
      totalRawSamples: sourceTxs.length,
      dateRange: sourceDates.length ? { minDate: sourceDates[0], maxDate: sourceDates[sourceDates.length - 1] } : undefined
    };
  }

  const getTxVal = (t: ItbiTransaction) => t.unitValueSqm;
  const isValValid = (v: number) => typeof v === 'number' && v >= 800 && v <= 80000;

  const size = targetSize > 0 ? targetSize : 60;
  const minSize = Math.max(15, Math.round(size * 0.67));
  const maxSize = Math.round(size * 1.33);

  // 1. Nível Bairro Macro (Ponderação Adaptativa NBR 14.653)
  const allBVals = typeTxs.filter(t => isValValid(getTxVal(t)));
  if (allBVals.length === 0) return null;

  const similarBTxs = allBVals.filter(t => t.sizeSqm >= minSize && t.sizeSqm <= maxSize);
  const isBCenarioA = similarBTxs.length >= 4 && sizeMode !== 'all';
  const bWorkingTxs = isBCenarioA ? similarBTxs : allBVals;
  const bVals = bWorkingTxs.map(t => getTxVal(t));

  const bPrelim = bVals.reduce((a, b) => a + b, 0) / bVals.length;
  const bVariance = bVals.reduce((acc, v) => acc + Math.pow(v - bPrelim, 2), 0) / bVals.length;
  const bStd = Math.sqrt(bVariance);
  const bValid = bVals.filter(v => Math.abs(v - bPrelim) <= 2.2 * bStd);
  const bSaneadaRaw = bValid.length > 0 ? Math.round(bValid.reduce((a, b) => a + b, 0) / bValid.length) : Math.round(bPrelim);
  const bAreaMedia = bWorkingTxs.reduce((acc, t) => acc + (t.sizeSqm || size), 0) / Math.max(1, bWorkingTxs.length);
  const bFator = !isBCenarioA ? Math.pow(bAreaMedia / size, 0.15) : 1.0;
  const bSaneada = !isBCenarioA ? Math.round(bSaneadaRaw * bFator) : bSaneadaRaw;
  const bExpurgados = bVals.length - bValid.length;

  // Segmentação Geoespacial com Defesa e Fallback Defensivo do Entorno
  const isResidentialTarget = /apart|casa|sobrado|cobertura|flat|loft|kitnet|conjugado/i.test(targetPropType || '');
  const radiusSource = (radiusTransactions || typeTxs)
    .filter(t => {
      if (t.transactionLocationPrecision !== 'exact_number' && t.transactionLocationPrecision !== 'street_centroid') return false;
      if (targetPropType && t.propertyType !== targetPropType) {
        if (!isResidentialTarget || !/apart|casa|sobrado|cobertura|flat|loft|kitnet|conjugado/i.test(t.propertyType || '')) return false;
      }
      return true;
    });

  const isTargetStreetTx = (t: ItbiTransaction) => {
    if (!t.street) return false;
    if (targetCore && cleanStreetCore(t.street) === targetCore) return true;
    return false;
  };

  const geolocatedSurrounding = radiusSource.filter(t => 
    t.distanceKm !== null && 
    t.distanceKm !== undefined && 
    Number.isFinite(Number(t.distanceKm)) &&
    !isTargetStreetTx(t)
  );

  let raioTxs: ItbiTransaction[] = [];
  let effectiveRadiusKm = 0.5;
  let radiusLabel = `3. Ruas do Entorno (0.5 km) - 0 tx`;
  let fallbackLevel: '0.5km' | '1.0km' | '2.0km' | 'bairro' = '0.5km';
  let hasVerifiedRadius = false;

  if (geolocatedSurrounding.length > 0) {
    // Tentativa 1: Executar busca radial em raio = 500m (0.5 km)
    const txs500 = geolocatedSurrounding.filter(t => Number(t.distanceKm) <= 0.5);
    if (txs500.length >= 5) {
      raioTxs = txs500;
      effectiveRadiusKm = 0.5;
      radiusLabel = `3. Ruas do Entorno (0.5 km) - ${raioTxs.length} tx`;
      fallbackLevel = '0.5km';
      hasVerifiedRadius = true;
    } else {
      // Tentativa 2 (Gatilho se contagem < 5): Expandir automaticamente para raio = 1000m (1.0 km)
      const txs1000 = geolocatedSurrounding.filter(t => Number(t.distanceKm) <= 1.0);
      if (txs1000.length >= 5) {
        raioTxs = txs1000;
        effectiveRadiusKm = 1.0;
        radiusLabel = `3. Ruas do Entorno (Raio expandido para 1.0 km) - ${raioTxs.length} tx`;
        fallbackLevel = '1.0km';
        hasVerifiedRadius = true;
      } else {
        // Tentativa 3 (Gatilho se contagem < 5): Expandir para raio = 2000m (2.0 km)
        const txs2000 = geolocatedSurrounding.filter(t => Number(t.distanceKm) <= 2.0);
        raioTxs = txs2000;
        effectiveRadiusKm = 2.0;
        radiusLabel = txs2000.length > 0
          ? `3. Ruas do Entorno (Raio expandido para 2.0 km) - ${raioTxs.length} tx`
          : `3. Ruas do Entorno (0 tx no raio de 2.0 km)`;
        fallbackLevel = '2.0km';
        hasVerifiedRadius = raioTxs.length > 0;
      }
    }
  } else {
    raioTxs = [];
    radiusLabel = `3. Ruas do Entorno (Sem amostras no entorno)`;
    fallbackLevel = 'bairro';
    hasVerifiedRadius = false;
  }

  // 2. Nível Raio (Ruas do Entorno - Ponderação Adaptativa NBR 14.653)
  const raioValidSource = raioTxs.filter(t => isValValid(getTxVal(t)));
  const raioSimilarTxs = raioValidSource.filter(t => t.sizeSqm >= minSize && t.sizeSqm <= maxSize);
  const isRaioCenarioA = raioSimilarTxs.length >= 4 && sizeMode !== 'all';
  const raioWorkingTxs = isRaioCenarioA ? raioSimilarTxs : raioValidSource;
  const raioVals = raioWorkingTxs.map(t => getTxVal(t));

  const raioPrelim = raioVals.length > 0 ? (raioVals.reduce((a, b) => a + b, 0) / raioVals.length) : (hasVerifiedRadius ? bSaneada : 0);
  const raioVariance = raioVals.length > 0
    ? raioVals.reduce((acc, value) => acc + Math.pow(value - raioPrelim, 2), 0) / raioVals.length
    : 0;
  const raioStd = Math.sqrt(raioVariance);
  const refCorteRaio = Math.round(raioPrelim || bSaneada);
  const raioCorteMin = raioStd > 0 ? Math.round(raioPrelim - (2 * raioStd)) : Math.round(raioPrelim);
  const raioCorteMax = raioStd > 0 ? Math.round(raioPrelim + (2 * raioStd)) : Math.round(raioPrelim);
  const raioValid = raioVals.filter(v => raioStd === 0 || Math.abs(v - raioPrelim) <= 2 * raioStd);
  const raioSaneadaRaw = raioValid.length > 0
    ? Math.round(raioValid.reduce((a, b) => a + b, 0) / raioValid.length)
    : (hasVerifiedRadius ? Math.round(refCorteRaio) : 0);
  const raioAreaMedia = raioWorkingTxs.reduce((acc, t) => acc + (t.sizeSqm || size), 0) / Math.max(1, raioWorkingTxs.length);
  const raioFator = !isRaioCenarioA && hasVerifiedRadius ? Math.pow(raioAreaMedia / size, 0.15) : 1.0;
  const raioSaneada = !isRaioCenarioA && hasVerifiedRadius ? Math.round(raioSaneadaRaw * raioFator) : raioSaneadaRaw;
  const raioExpurgados = raioVals.length - raioValid.length;

  // 3. Nível Rua (Ponderação Adaptativa NBR 14.653)
  const allRuaTxs = targetCore ? typeTxs.filter(t => cleanStreetCore(t.street) === targetCore && isValValid(getTxVal(t))) : [];
  const ruaSimilarTxs = allRuaTxs.filter(t => t.sizeSqm >= minSize && t.sizeSqm <= maxSize);
  const isRuaCenarioA = ruaSimilarTxs.length >= 4 && sizeMode !== 'all';
  const ruaWorkingTxs = isRuaCenarioA ? ruaSimilarTxs : allRuaTxs;
  const ruaVals = ruaWorkingTxs.map(t => getTxVal(t));
  const ruaPrelim = ruaVals.length > 0 ? Math.round(ruaVals.reduce((a, b) => a + b, 0) / ruaVals.length) : 0;

  let ruaValid: number[] = [];
  let ruaSaneadaRaw = 0;
  let ruaCorteMin = 0;
  let ruaCorteMax = 0;
  let refCorteRua = raioSaneada;

  if (ruaVals.length >= 2) {
    const buildings = new Map<string, number[]>();
    ruaWorkingTxs.forEach(t => {
      const v = getTxVal(t);
      if (!isValValid(v)) return;
      const key = cleanStreetNumber(t.number) || t.id;
      buildings.set(key, [...(buildings.get(key) || []), v]);
    });
    const ruaMed = computeMedian(Array.from(buildings.values()).map(computeMedian));
    refCorteRua = ruaMed;
    const deviation = Math.sqrt(ruaVals.reduce((sum, value) => sum + (value - ruaPrelim) ** 2, 0) / ruaVals.length);
    ruaCorteMin = Math.max(800, Math.round(ruaPrelim - 2.2 * deviation));
    ruaCorteMax = Math.round(ruaPrelim + 2.2 * deviation);
    ruaValid = ruaVals.filter(v => v >= ruaCorteMin && v <= ruaCorteMax);
    if (ruaValid.length === 0) ruaValid = ruaVals;
    ruaSaneadaRaw = Math.round(ruaValid.reduce((a, b) => a + b, 0) / ruaValid.length);
  } else if (ruaVals.length === 1) {
    const anchor = raioSaneada > 0 ? raioSaneada : bSaneada;
    refCorteRua = anchor;
    ruaCorteMin = Math.round(anchor * 0.55);
    ruaCorteMax = Math.round(anchor * 1.45);
    ruaValid = [ruaVals[0]];
    ruaSaneadaRaw = ruaVals[0];
  } else {
    ruaValid = [];
    ruaSaneadaRaw = 0;
    ruaCorteMin = 0;
    ruaCorteMax = 0;
  }
  const ruaAreaMedia = ruaWorkingTxs.reduce((acc, t) => acc + (t.sizeSqm || size), 0) / Math.max(1, ruaWorkingTxs.length);
  const ruaFator = !isRuaCenarioA && ruaValid.length > 0 ? Math.pow(ruaAreaMedia / size, 0.15) : 1.0;
  const ruaSaneada = !isRuaCenarioA && ruaValid.length > 0 ? Math.round(ruaSaneadaRaw * ruaFator) : ruaSaneadaRaw;
  const ruaExpurgados = ruaVals.length - ruaValid.length;

  // 4. Nível Prédio (Mesmo Edifício / Número Predial - Ponderação Adaptativa NBR 14.653)
  const allPredioTxs = targetNum ? allRuaTxs.filter(t => cleanStreetNumber(t.number) === targetNum) : [];
  const predioSimilarTxs = allPredioTxs.filter(t => t.sizeSqm >= minSize && t.sizeSqm <= maxSize);
  const isPredioCenarioA = predioSimilarTxs.length >= 4 && sizeMode !== 'all';
  const predioWorkingTxs = isPredioCenarioA ? predioSimilarTxs : allPredioTxs;
  const predioVals = predioWorkingTxs.map(t => getTxVal(t));
  const predioPrelim = predioVals.length > 0 ? Math.round(predioVals.reduce((a, b) => a + b, 0) / predioVals.length) : 0;

  let predioValid: number[] = [];
  let predioSaneadaRaw = 0;
  let predioCorteMin = 0;
  let predioCorteMax = 0;

  if (predioVals.length >= 2) {
    const pMed = computeMedian(predioVals);
    predioCorteMin = Math.round(pMed * 0.65);
    predioCorteMax = Math.round(pMed * 1.35);
    predioValid = predioVals.filter(v => v >= predioCorteMin && v <= predioCorteMax);
    if (predioValid.length === 0) predioValid = predioVals;
    predioSaneadaRaw = Math.round(predioValid.reduce((a, b) => a + b, 0) / predioValid.length);
  } else if (predioVals.length === 1) {
    const pAnchor = ruaSaneada > 0 ? ruaSaneada : (raioSaneada > 0 ? raioSaneada : bSaneada);
    predioCorteMin = Math.round(pAnchor * 0.55);
    predioCorteMax = Math.round(pAnchor * 1.45);
    if (predioVals[0] <= predioCorteMax) {
      predioValid = [predioVals[0]];
      predioSaneadaRaw = predioVals[0];
    } else {
      predioValid = [];
      predioSaneadaRaw = 0;
    }
  } else {
    predioValid = [];
    predioSaneadaRaw = 0;
    predioCorteMin = 0;
    predioCorteMax = 0;
  }
  const predioAreaMedia = predioWorkingTxs.reduce((acc, t) => acc + (t.sizeSqm || size), 0) / Math.max(1, predioWorkingTxs.length);
  const predioFator = !isPredioCenarioA && predioValid.length > 0 ? Math.pow(predioAreaMedia / size, 0.15) : 1.0;
  const predioSaneada = !isPredioCenarioA && predioValid.length > 0 ? Math.round(predioSaneadaRaw * predioFator) : predioSaneadaRaw;
  const predioExpurgados = predioVals.length - predioValid.length;

  // 5. Weighted four-tier valuation (NBR 14.653)
  const weightedValuation = computeFourTierValuation({
    building: { value: predioSaneada, count: predioValid.length },
    street: { value: ruaSaneada, count: ruaValid.length },
    surrounding: { value: hasVerifiedRadius && fallbackLevel !== 'bairro' ? raioSaneada : 0, count: hasVerifiedRadius && fallbackLevel !== 'bairro' ? raioValid.length : 0 },
    neighborhood: { value: bSaneada, count: bValid.length },
    radiusKm: effectiveRadiusKm
  });
  let mediaCorteReal = weightedValuation.value;
  let nivelUtilizado: 'Prédio' | 'Rua' | 'Raio Entorno' | 'Bairro' | 'Sem Dados Suficientes' = 'Sem Dados Suficientes';
  let hasMicroData = weightedValuation.priceable;

  if (weightedValuation.priceable) {
    nivelUtilizado = predioValid.length > 0 ? 'Prédio' : ruaValid.length > 0 ? 'Rua' : (raioValid.length > 0 ? 'Raio Entorno' : 'Bairro');
  }

  // Identificação do Cenário de Homogeneização Adotado
  let adoptedHomogeneizado = false;
  let adoptedFatorEscala = 1.0;
  let adoptedAreaMedia = size;
  let adoptedCenario: 'A' | 'B' = 'A';

  if (nivelUtilizado === 'Prédio') {
    adoptedCenario = isPredioCenarioA ? 'A' : 'B';
    adoptedHomogeneizado = !isPredioCenarioA && predioValid.length > 0;
    adoptedFatorEscala = predioFator;
    adoptedAreaMedia = predioAreaMedia;
  } else if (nivelUtilizado === 'Rua') {
    adoptedCenario = isRuaCenarioA ? 'A' : 'B';
    adoptedHomogeneizado = !isRuaCenarioA && ruaValid.length > 0;
    adoptedFatorEscala = ruaFator;
    adoptedAreaMedia = ruaAreaMedia;
  } else if (nivelUtilizado === 'Raio Entorno') {
    adoptedCenario = isRaioCenarioA ? 'A' : 'B';
    adoptedHomogeneizado = !isRaioCenarioA && raioValid.length > 0;
    adoptedFatorEscala = raioFator;
    adoptedAreaMedia = raioAreaMedia;
  } else if (nivelUtilizado === 'Bairro') {
    adoptedCenario = isBCenarioA ? 'A' : 'B';
    adoptedHomogeneizado = !isBCenarioA && bValid.length > 0;
    adoptedFatorEscala = bFator;
    adoptedAreaMedia = bAreaMedia;
  }

  // Referência de entorno para a métrica de desvio
  const refEntorno = (raioSaneada > 0 && hasVerifiedRadius) ? raioSaneada : bSaneada;
  const ruaRaioDesvioPct = ruaSaneada > 0 && refEntorno > 0
    ? Math.round(((ruaSaneada - refEntorno) / refEntorno) * 100)
    : 0;
  const ruaRaioCalibrada = weightedValuation.priceable && Math.abs(ruaRaioDesvioPct) > 25 && refEntorno > 0;

  // 6. Aplicação no Flip Rápido (60 dias) e Gabarito
  // Deságio tático de 10% para liquidez imediata
  // Válvula de Segurança para Apartamentos sem amostragem no próprio condomínio:
  const isApartmentWithoutBuilding = targetPropType === 'Apartamento' && predioValid.length === 0;
  const buildingSafetyValveFactor = isApartmentWithoutBuilding ? 0.95 : 1.0;

  const flipRapidoSqm = isJuizDeFora ? 0 : (mediaCorteReal > 0 ? Math.round(mediaCorteReal * 0.90 * buildingSafetyValveFactor) : 0);
  const gabaritoTotal = isJuizDeFora ? mediaCorteReal : (mediaCorteReal > 0 ? Math.round(mediaCorteReal * buildingSafetyValveFactor) * size : 0);
  const flipTotal = isJuizDeFora ? (mediaCorteReal > 0 ? Math.round(mediaCorteReal * 0.90) : 0) : (flipRapidoSqm > 0 ? flipRapidoSqm * size : 0);

  return {
    bairro: {
      saneada: bSaneada,
      total: bVals.length,
      validas: bValid.length,
      expurgadas: bExpurgados,
      prelim: Math.round(bPrelim)
    },
    raio: {
      saneada: raioSaneada,
      total: raioVals.length,
      validas: hasVerifiedRadius ? raioValid.length : 0,
      expurgadas: raioExpurgados,
      prelim: Math.round(raioPrelim),
      refCorte: Math.round(refCorteRaio),
      corteMin: raioCorteMin,
      corteMax: raioCorteMax,
      effectiveRadiusKm,
      radiusLabel,
      fallbackLevel
    },
    rua: {
      saneada: ruaSaneada,
      total: ruaVals.length,
      validas: ruaValid.length,
      expurgadas: ruaExpurgados,
      prelim: ruaPrelim,
      refCorte: refCorteRua,
      corteMin: ruaCorteMin,
      corteMax: ruaCorteMax
    },
    predio: {
      saneada: predioSaneada,
      total: predioVals.length,
      validas: predioValid.length,
      expurgadas: predioExpurgados,
      prelim: predioPrelim,
      corteMin: predioCorteMin,
      corteMax: predioCorteMax
    },
    mediaCorteReal,
    nivelUtilizado,
    flipRapidoSqm,
    gabaritoTotal,
    flipTotal,
    ruaRaioDesvioPct,
    ruaRaioCalibrada,
    radiusVerified: hasVerifiedRadius,
    effectiveRadiusKm,
    radiusLabel,
    fallbackLevel,
    minSimilarSize: minSize,
    maxSimilarSize: maxSize,
    hasMicroData,
    calibrated: weightedValuation.calibrated,
    calibrationKind: weightedValuation.calibrationKind,
    buildingSafetyValveApplied: isApartmentWithoutBuilding,
    isAbsolutePricing: isJuizDeFora,
    compraEVendaCount: isJuizDeFora ? sourceTxs.length : undefined,
    totalRawSamples: allNeighborhoodTxs.length,
    dateRange,
    isAreaHomogeneizada: adoptedHomogeneizado,
    fatorEscala: Number(adoptedFatorEscala.toFixed(3)),
    areaMediaGeral: Math.round(adoptedAreaMedia),
    cenarioArea: adoptedCenario
  };
}
