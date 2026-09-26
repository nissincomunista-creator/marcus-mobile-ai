import { canonicalStreet, resolveOfficialStreet } from './streetMatching.ts';
import { ItbiTransaction } from '../types.ts';

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
  const match = String(n).match(/\d+/);
  return match ? match[0] : '';
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
export function computeBidirectionalBenchmarks(
  allNeighborhoodTxs: ItbiTransaction[],
  targetStreet: string,
  targetNumber: string | undefined | null,
  targetSize: number,
  sizeMode: 'similar' | 'all' = 'similar',
  radiusKm: number = 0.5,
  targetPropType?: string
): BidirectionalBenchmarkResult | null {
  if (!allNeighborhoodTxs || allNeighborhoodTxs.length === 0) return null;

  const size = targetSize > 0 ? targetSize : 60;
  const minSize = Math.max(15, Math.round(size * 0.67));
  const maxSize = Math.round(size * 1.33);

  const officialStreet = resolveOfficialStreet(targetStreet, allNeighborhoodTxs.map(t => t.street || ''));
  const targetCore = cleanStreetCore(officialStreet || targetStreet);
  const targetNum = cleanStreetNumber(targetNumber);

  // Isolamento Estrito de Tipologia (Casa não pode ser precificada com m² de Apartamento, e vice-versa):
  let typeTxs = allNeighborhoodTxs;
  if (targetPropType) {
    const exactTypeTxs = allNeighborhoodTxs.filter(t => t.propertyType === targetPropType);
    if (exactTypeTxs.length > 0) {
      typeTxs = exactTypeTxs;
    }
  }

  // Filtro de Metragem Similar (±33% da área privativa do imóvel)
  // Aplica filtro de área caso o usuário selecione 'similar'
  // Fallback seguro: se a tipologia no bairro não tiver imóveis na faixa restrita, usa todas as amostras da tipologia
  const filterByArea = (txs: ItbiTransaction[]) => {
    if (sizeMode === 'all') return txs;
    const filtered = txs.filter(t => t.sizeSqm >= minSize && t.sizeSqm <= maxSize);
    if (filtered.length === 0 && txs.length > 0) {
      return txs;
    }
    return filtered;
  };

  const poolTxs = filterByArea(typeTxs);

  // 1. Nível Bairro Macro (Saneamento de Segurança: valores absurdos e Chauvenet 2.2σ)
  const bVals = poolTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v >= 800 && v <= 80000);
  if (bVals.length === 0) return null;

  const bPrelim = bVals.reduce((a, b) => a + b, 0) / bVals.length;
  const bVariance = bVals.reduce((acc, v) => acc + Math.pow(v - bPrelim, 2), 0) / bVals.length;
  const bStd = Math.sqrt(bVariance);
  const bValid = bVals.filter(v => Math.abs(v - bPrelim) <= 2.2 * bStd);
  const bSaneada = bValid.length > 0 ? Math.round(bValid.reduce((a, b) => a + b, 0) / bValid.length) : Math.round(bPrelim);
  const bExpurgados = bVals.length - bValid.length;

  // Segmentação Geoespacial com Fallback Progressivo e Transparente (NBR 14.653)
  const ruaTxs = targetCore ? poolTxs.filter(t => cleanStreetCore(t.street) === targetCore) : [];
  const surroundingPool = targetCore ? poolTxs.filter(t => cleanStreetCore(t.street) !== targetCore) : poolTxs;
  const geolocatedSurrounding = surroundingPool.filter(t => t.distanceKm !== null && t.distanceKm !== undefined && Number.isFinite(Number(t.distanceKm)));

  let raioTxs: ItbiTransaction[] = [];
  let effectiveRadiusKm = radiusKm || 0.5;
  let radiusLabel = `Raio imediato ~${effectiveRadiusKm.toFixed(1)}km`;
  let fallbackLevel: '0.5km' | '1.0km' | '2.0km' | 'bairro' = '0.5km';
  // Um único registro geolocalizado não confirma amostragem de entorno.
  const hasVerifiedRadius = geolocatedSurrounding.length >= 2;

  if (geolocatedSurrounding.length > 0) {
    // Contagem e média do raio registram apenas a circunferência inicial escolhida;
    // o raio ampliado serve para valuation, sem se passar pelos 500m.
    const tierInitial = geolocatedSurrounding.filter(t => Number(t.distanceKm) <= (radiusKm || 0.5));
    if (tierInitial.length >= 2) {
      raioTxs = tierInitial;
      effectiveRadiusKm = radiusKm || 0.5;
      radiusLabel = `Raio imediato ~${effectiveRadiusKm.toFixed(1)}km`;
      fallbackLevel = '0.5km';
    } else {
      // 2. Fallback progressivo para 1.0km
      const tier1000 = geolocatedSurrounding.filter(t => Number(t.distanceKm) <= 1.0);
      if (tier1000.length >= 2) {
        raioTxs = tier1000;
        effectiveRadiusKm = 1.0;
        radiusLabel = 'Raio expandido para 1.0km por baixa amostragem local';
        fallbackLevel = '1.0km';
      } else {
        // 3. Fallback progressivo para 2.0km
        const tier2000 = geolocatedSurrounding.filter(t => Number(t.distanceKm) <= 2.0);
        if (tier2000.length >= 2) {
          raioTxs = tier2000;
          effectiveRadiusKm = 2.0;
          radiusLabel = 'Raio expandido para 2.0km por baixa amostragem local';
          fallbackLevel = '2.0km';
        } else {
          // 4. Fallback pericial seguro para o pool de outras ruas do bairro/região
          raioTxs = surroundingPool.length > 0 ? surroundingPool : poolTxs;
          effectiveRadiusKm = 2.0;
          radiusLabel = 'Mediana do bairro (sem amostras em raio até 2.0km)';
          fallbackLevel = 'bairro';
        }
      }
    }
    raioTxs = geolocatedSurrounding.filter(t => Number(t.distanceKm) <= (radiusKm || 0.5));
  } else {
    raioTxs = surroundingPool.length > 0 ? surroundingPool : poolTxs;
    radiusLabel = 'Mediana do bairro (sem geolocalização exata)';
    fallbackLevel = 'bairro';
  }

  // 2. Nível Raio (Ruas do Entorno). O expurgo usa Chauvenet operacional
  // em 2 desvios-padrão, sem uma faixa percentual que descarte comparáveis válidos.
  const raioVals = raioTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v >= 800 && v <= 80000);
  const raioPrelim = raioVals.length > 0 ? (raioVals.reduce((a, b) => a + b, 0) / raioVals.length) : (hasVerifiedRadius ? bSaneada : 0);
  const raioVariance = raioVals.length > 0
    ? raioVals.reduce((acc, value) => acc + Math.pow(value - raioPrelim, 2), 0) / raioVals.length
    : 0;
  const raioStd = Math.sqrt(raioVariance);
  const refCorteRaio = Math.round(raioPrelim || bSaneada);
  const raioCorteMin = raioStd > 0 ? Math.round(raioPrelim - (2 * raioStd)) : Math.round(raioPrelim);
  const raioCorteMax = raioStd > 0 ? Math.round(raioPrelim + (2 * raioStd)) : Math.round(raioPrelim);
  const raioValid = raioVals.filter(v => raioStd === 0 || Math.abs(v - raioPrelim) <= 2 * raioStd);
  const raioSaneada = raioValid.length > 0
    ? Math.round(raioValid.reduce((a, b) => a + b, 0) / raioValid.length)
    : (hasVerifiedRadius ? Math.round(refCorteRaio) : 0);
  const raioExpurgados = raioVals.length - raioValid.length;

  // 3. Nível Rua: Saneamento interno do cluster da rua (NBR 14.653)
  // Se a rua possui amostragem própria, seu cluster factual tem supremacia hierárquica sobre o raio
  const ruaVals = ruaTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v >= 800 && v <= 80000);
  const ruaPrelim = ruaVals.length > 0 ? Math.round(ruaVals.reduce((a, b) => a + b, 0) / ruaVals.length) : 0;

  let ruaValid: number[] = [];
  let ruaSaneada = 0;
  let ruaCorteMin = 0;
  let ruaCorteMax = 0;
  let refCorteRua = raioSaneada;

  if (ruaVals.length >= 2) {
    // Cada prédio contribui uma vez para a referência de corte: lançamentos
    // com muitas unidades não podem expulsar os demais prédios da rua.
    const buildings = new Map<string, number[]>();
    ruaTxs.forEach(t => {
      if (!(t.unitValueSqm >= 800 && t.unitValueSqm <= 80000)) return;
      const key = cleanStreetNumber(t.number) || t.id;
      buildings.set(key, [...(buildings.get(key) || []), t.unitValueSqm]);
    });
    const ruaMed = computeMedian(Array.from(buildings.values()).map(computeMedian));
    refCorteRua = ruaMed;
    // Preserve distinct price groups along a long street. A fixed median band
    // otherwise removes the cheaper buildings and raises the reported mean.
    const deviation = Math.sqrt(ruaVals.reduce((sum, value) => sum + (value - ruaPrelim) ** 2, 0) / ruaVals.length);
    ruaCorteMin = Math.max(800, Math.round(ruaPrelim - 2.2 * deviation));
    ruaCorteMax = Math.round(ruaPrelim + 2.2 * deviation);
    ruaValid = ruaVals.filter(v => v >= ruaCorteMin && v <= ruaCorteMax);
    if (ruaValid.length === 0) ruaValid = ruaVals;
    ruaSaneada = Math.round(ruaValid.reduce((a, b) => a + b, 0) / ruaValid.length);
  } else if (ruaVals.length === 1) {
    const anchor = raioSaneada > 0 ? raioSaneada : bSaneada;
    refCorteRua = anchor;
    ruaCorteMin = Math.round(anchor * 0.55);
    ruaCorteMax = Math.round(anchor * 1.45);
    // Uma escritura real da rua continua sendo evidência local nos dois modos
    // de metragem. A anomalia é tratada na ponderação conservadora abaixo, não
    // apagando a amostra e reclassificando o mesmo imóvel como mera projeção.
    ruaValid = [ruaVals[0]];
    ruaSaneada = ruaVals[0];
  } else {
    ruaValid = [];
    ruaSaneada = 0;
    ruaCorteMin = 0;
    ruaCorteMax = 0;
  }
  const ruaExpurgados = ruaVals.length - ruaValid.length;

  // 4. Nível Prédio (Mesmo Edifício / Número Predial)
  const predioTxs = targetNum ? ruaTxs.filter(t => cleanStreetNumber(t.number) === targetNum) : [];
  const predioVals = predioTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v >= 800 && v <= 80000);
  const predioPrelim = predioVals.length > 0 ? Math.round(predioVals.reduce((a, b) => a + b, 0) / predioVals.length) : 0;

  let predioValid: number[] = [];
  let predioSaneada = 0;
  let predioCorteMin = 0;
  let predioCorteMax = 0;

  if (predioVals.length >= 2) {
    const pMed = computeMedian(predioVals);
    predioCorteMin = Math.round(pMed * 0.65);
    predioCorteMax = Math.round(pMed * 1.35);
    predioValid = predioVals.filter(v => v >= predioCorteMin && v <= predioCorteMax);
    if (predioValid.length === 0) predioValid = predioVals;
    predioSaneada = Math.round(predioValid.reduce((a, b) => a + b, 0) / predioValid.length);
  } else if (predioVals.length === 1) {
    const pAnchor = ruaSaneada > 0 ? ruaSaneada : (raioSaneada > 0 ? raioSaneada : bSaneada);
    predioCorteMin = Math.round(pAnchor * 0.55);
    predioCorteMax = Math.round(pAnchor * 1.45);
    if (predioVals[0] <= predioCorteMax) {
      predioValid = [predioVals[0]];
      predioSaneada = predioVals[0];
    } else {
      predioValid = [];
      predioSaneada = 0;
    }
  } else {
    predioValid = [];
    predioSaneada = 0;
    predioCorteMin = 0;
    predioCorteMax = 0;
  }
  const predioExpurgados = predioVals.length - predioValid.length;

  // 5. DE TRÁS PRA FRENTE (Prédio -> Rua -> Raio -> Bairro)
  // Calibragem Conservadora Pericial: Quando há poucas amostras (1 ou 2),
  // NUNCA inflar o valor se a amostragem real for menor que o bairro!
  let mediaCorteReal = 0;
  let nivelUtilizado: 'Prédio' | 'Rua' | 'Raio Entorno' | 'Bairro' | 'Sem Dados Suficientes' = 'Sem Dados Suficientes';
  let hasMicroData = false;

  // Referência de entorno: Raio quando houver, ou média do Bairro
  const refEntorno = (raioSaneada > 0) ? raioSaneada : bSaneada;
  const ruaRaioDesvioPct = ruaSaneada > 0 && refEntorno > 0
    ? Math.round(((ruaSaneada - refEntorno) / refEntorno) * 100)
    : 0;
  let ruaRaioCalibrada = false;

  if (predioValid.length > 0) {
    const anchor = ruaSaneada > 0 ? ruaSaneada : refEntorno;
    if (predioValid.length === 1) {
      if (predioSaneada <= anchor) {
        mediaCorteReal = predioSaneada;
      } else {
        const blended = (predioSaneada * 0.40) + (anchor * 0.60);
        mediaCorteReal = Math.round(Math.min(anchor * 1.12, blended));
      }
    } else if (predioValid.length === 2) {
      if (predioSaneada <= anchor) {
        mediaCorteReal = predioSaneada;
      } else {
        const blended = (predioSaneada * 0.70) + (anchor * 0.30);
        mediaCorteReal = Math.round(Math.min(anchor * 1.18, blended));
      }
    } else {
      mediaCorteReal = predioSaneada;
    }
    nivelUtilizado = 'Prédio';
    hasMicroData = true;
  } else if (ruaValid.length > 0) {
    const anchor = refEntorno > 0 ? refEntorno : bSaneada;
    if (ruaValid.length === 1) {
      // 1 amostra na rua: Respeitar a realidade fática da rua de forma estritamente conservadora.
      // Se a rua for mais barata que o bairro (ex: 1382 vs 1874), NUNCA inflar o valor para cima!
      if (ruaSaneada <= anchor) {
        mediaCorteReal = ruaSaneada;
      } else {
        const blended = (ruaSaneada * 0.40) + (anchor * 0.60);
        mediaCorteReal = Math.round(Math.min(anchor * 1.12, blended));
      }
    } else if (ruaValid.length === 2) {
      if (ruaSaneada <= anchor) {
        mediaCorteReal = ruaSaneada;
      } else {
        const blended = (ruaSaneada * 0.70) + (anchor * 0.30);
        mediaCorteReal = Math.round(Math.min(anchor * 1.18, blended));
      }
    } else {
      mediaCorteReal = ruaSaneada;
    }

    // Divergência material rua x raio (> 25%): calibra a rua ponderando com o entorno
    // evitando anomalias locais por escassez ou dados expurgados
    if (Math.abs(ruaRaioDesvioPct) > 25 && refEntorno > 0) {
      if (ruaRaioDesvioPct > 0) {
        // Rua muito mais cara que o raio: calibra com 50% rua + 50% raio e teto de 25% do bairro
        const blended = (ruaSaneada * 0.50) + (refEntorno * 0.50);
        const neighborhoodCeiling = bSaneada > 0 ? Math.round(bSaneada * 1.25) : blended;
        mediaCorteReal = Math.round(Math.min(mediaCorteReal, neighborhoodCeiling, blended));
      } else {
        // Rua mais barata que o entorno: preserva estritamente o valor menor conservador
        mediaCorteReal = Math.min(mediaCorteReal, ruaSaneada);
      }
      ruaRaioCalibrada = true;
    }
    nivelUtilizado = 'Rua';
    hasMicroData = true;
  } else if (hasVerifiedRadius && raioValid.length >= 2 && raioSaneada > 0) {
    mediaCorteReal = raioSaneada;
    nivelUtilizado = 'Raio Entorno';
    hasMicroData = true;
  } else if (bSaneada > 0) {
    // Projeção contextual de Bairro: fornece gabarito e referência estatística
    mediaCorteReal = bSaneada;
    nivelUtilizado = 'Bairro';
    hasMicroData = false;
  } else {
    mediaCorteReal = 0;
    nivelUtilizado = 'Sem Dados Suficientes';
    hasMicroData = false;
  }

  // 6. Aplicação no Flip Rápido (60 dias) e Gabarito
  // Deságio tático de 10% para liquidez imediata
  const flipRapidoSqm = mediaCorteReal > 0 ? Math.round(mediaCorteReal * 0.90) : 0;
  const gabaritoTotal = mediaCorteReal > 0 ? mediaCorteReal * size : 0;
  const flipTotal = flipRapidoSqm > 0 ? flipRapidoSqm * size : 0;

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
    hasMicroData
  };
}
