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

  const genericKeywords = [
    'projetad', 'sem nome', 's/n', 'nao informado', 'nao informada', 
    'loteamento', 'quadra', 'gleba', 'chacara', 'sitio', 'estrada municipal',
    'zona rural', 'area rural', 'area de posse', 'vila nova', 'povoado', 'extracao documental', 'apartamento em', 'casa de condominio em'
  ];
  if (genericKeywords.some(k => s.includes(k))) return true;

  const core = cleanStreetCore(s);
  if (core.length <= 2) return true;

  return false;
}

export function cleanStreetCore(s: string | undefined | null): string {
  if (!s) return '';
  let str = s.split(',')[0].trim();
  str = str.replace(/\s+n[ºo°.]?\s*\d+.*$/i, '').trim();
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(rua|r\.|avenida|av\.|estrada|estr\.|travessa|trav\.|praca|praça|pc\.|alameda|al\.|engenheiro|eng\.|doutor|dr\.|coronel|cel\.|general|gen\.|marechal|almirante|brigadeiro|padre|pe\.|santo|santa|prof|professor)\b/g, '')
    .replace(/th/g, 't')
    .replace(/ph/g, 'f')
    .replace(/y/g, 'i')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  // Endereços genéricos (rua projetada, rua a, quadra, etc.): vedado arbitramento
  if (isGenericStreet(targetStreet)) {
    return {
      bairro: { saneada: 0, total: 0, validas: 0, expurgadas: 0 },
      raio: { saneada: 0, total: 0, validas: 0, expurgadas: 0 },
      rua: { saneada: 0, total: 0, validas: 0, expurgadas: 0 },
      predio: { saneada: 0, total: 0, validas: 0, expurgadas: 0 },
      mediaCorteReal: 0,
      nivelUtilizado: 'Sem Dados Suficientes',
      flipRapidoSqm: 0,
      gabaritoTotal: 0,
      flipTotal: 0,
      ruaRaioDesvioPct: 0,
      ruaRaioCalibrada: false,
      radiusVerified: false,
      minSimilarSize: minSize,
      maxSimilarSize: maxSize,
      hasMicroData: false
    };
  }

  const targetCore = cleanStreetCore(targetStreet);
  const targetNum = cleanStreetNumber(targetNumber);

  // Isolamento Estrito de Tipologia (Casa não pode ser precificada com m² de Apartamento, e vice-versa):
  let typeTxs = allNeighborhoodTxs;
  if (targetPropType) {
    const exactTypeTxs = allNeighborhoodTxs.filter(t => t.propertyType === targetPropType);
    typeTxs = exactTypeTxs;
  }

  // Filtro de Metragem Similar (±33% da área privativa do imóvel)
  // Aplica filtro de área caso o usuário selecione 'similar'
  const filterByArea = (txs: ItbiTransaction[]) => {
    if (sizeMode === 'all') return txs;
    const filtered = txs.filter(t => t.sizeSqm >= minSize && t.sizeSqm <= maxSize);
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

  // Segmentação Geoespacial
  const ruaTxs = targetCore ? poolTxs.filter(t => cleanStreetCore(t.street) === targetCore) : [];
  const surroundingPool = targetCore ? poolTxs.filter(t => cleanStreetCore(t.street) !== targetCore) : poolTxs;
  const geolocatedSurrounding = surroundingPool.filter(t => t.distanceKm !== null && t.distanceKm !== undefined && Number.isFinite(Number(t.distanceKm)));
  // When the API supplied verified coordinates, radius is a hard spatial filter.
  // Legacy server-side batches do not have distanceKm and therefore cannot claim
  // a radius-level microbenchmark; they may still support street/building levels.
  const raioTxs = geolocatedSurrounding.length > 0
    ? geolocatedSurrounding.filter(t => Number(t.distanceKm) <= radiusKm)
    : surroundingPool;
  const hasVerifiedRadius = geolocatedSurrounding.length > 0;

  // 2. Nível Raio (Ruas do Entorno). O expurgo usa Chauvenet operacional
  // em 2 desvios-padrão, sem uma faixa percentual que descarte comparáveis válidos.
  const raioVals = raioTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v >= 800 && v <= 80000);
  const raioPrelim = raioVals.length > 0 ? (raioVals.reduce((a, b) => a + b, 0) / raioVals.length) : bSaneada;
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
    : Math.round(refCorteRaio);
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
  const ruaRaioDesvioPct = hasVerifiedRadius && ruaSaneada > 0 && raioSaneada > 0
    ? Math.round(((ruaSaneada - raioSaneada) / raioSaneada) * 100)
    : 0;
  let ruaRaioCalibrada = false;

  if (predioValid.length > 0) {
    const anchor = ruaSaneada > 0 ? ruaSaneada : raioSaneada;
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
    const anchor = raioSaneada > 0 ? raioSaneada : bSaneada;
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

    // Divergência material rua x raio: pondera a rua sem permitir que uma
    // anomalia local exceda 30% da mediana saneada do bairro.
    if (Math.abs(ruaRaioDesvioPct) > 25 && raioSaneada > 0) {
      const blended = (ruaSaneada * 0.65) + (raioSaneada * 0.35);
      const neighborhoodCeiling = bSaneada > 0 ? bSaneada * 1.30 : Number.POSITIVE_INFINITY;
      mediaCorteReal = Math.round(Math.min(mediaCorteReal, neighborhoodCeiling, blended));
      ruaRaioCalibrada = true;
    }
    nivelUtilizado = 'Rua';
    hasMicroData = true;
  } else if (hasVerifiedRadius && raioValid.length >= 3 && raioSaneada > 0) {
    mediaCorteReal = raioSaneada;
    nivelUtilizado = 'Raio Entorno';
    hasMicroData = true;
  } else {
    // Without building, street or a geolocated radius sample, a neighborhood
    // average is contextual information only and cannot become a verified flip.
    mediaCorteReal = 0;
    nivelUtilizado = 'Sem Dados Suficientes';
    hasMicroData = false;
  }

  // 6. Aplicação no Flip Rápido (60 dias) e Gabarito
  // Deságio tático de 10% para liquidez imediata - SOMENTE se houver amostragem na microregião
  const flipRapidoSqm = hasMicroData ? Math.round(mediaCorteReal * 0.90) : 0;
  const gabaritoTotal = hasMicroData ? mediaCorteReal * size : 0;
  const flipTotal = hasMicroData ? flipRapidoSqm * size : 0;

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
      validas: raioValid.length,
      expurgadas: raioExpurgados,
      prelim: Math.round(raioPrelim),
      refCorte: Math.round(refCorteRaio),
      corteMin: raioCorteMin,
      corteMax: raioCorteMax
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
    minSimilarSize: minSize,
    maxSimilarSize: maxSize,
    hasMicroData
  };
}
