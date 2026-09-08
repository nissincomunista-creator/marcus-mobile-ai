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
  nivelUtilizado: 'Prédio' | 'Rua' | 'Raio Entorno' | 'Bairro';
  flipRapidoSqm: number;
  gabaritoTotal: number;
  flipTotal: number;
  minSimilarSize: number;
  maxSimilarSize: number;
}

export function cleanStreetCore(s: string | undefined | null): string {
  if (!s) return '';
  let str = s.split(',')[0].trim();
  str = str.replace(/\b(n[ºo°.]?|\d+).*$/, '').trim();
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
  radiusKm: number = 0.5
): BidirectionalBenchmarkResult | null {
  if (!allNeighborhoodTxs || allNeighborhoodTxs.length === 0) return null;

  const targetCore = cleanStreetCore(targetStreet);
  const targetNum = cleanStreetNumber(targetNumber);
  const size = targetSize > 0 ? targetSize : 60;

  // Filtro de Metragem Similar (±33% da área privativa do imóvel)
  const minSize = Math.max(15, Math.round(size * 0.67));
  const maxSize = Math.round(size * 1.33);

  // Aplica filtro de área caso o usuário selecione 'similar'
  const filterByArea = (txs: ItbiTransaction[]) => {
    if (sizeMode === 'all') return txs;
    const filtered = txs.filter(t => t.sizeSqm >= minSize && t.sizeSqm <= maxSize);
    return filtered.length >= 2 ? filtered : txs;
  };

  const poolTxs = filterByArea(allNeighborhoodTxs);

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
  const raioTxs = targetCore ? poolTxs.filter(t => cleanStreetCore(t.street) !== targetCore) : poolTxs;

  // 2. Nível Raio (Ruas do Entorno)
  const raioVals = raioTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v >= 800 && v <= 80000);
  const raioPrelim = raioVals.length > 0 ? (raioVals.reduce((a, b) => a + b, 0) / raioVals.length) : bSaneada;
  
  // Balizado pelo Bairro (+/- 25% do bairro):
  const refCorteRaio = (raioPrelim >= bSaneada * 0.70 && raioPrelim <= bSaneada * 1.30) ? raioPrelim : bSaneada;
  const raioCorteMin = Math.round(refCorteRaio * 0.75);
  const raioCorteMax = Math.round(refCorteRaio * 1.25);
  const raioValid = raioVals.filter(v => v >= raioCorteMin && v <= raioCorteMax);
  const raioSaneada = raioValid.length > 0 ? Math.round(raioValid.reduce((a, b) => a + b, 0) / raioValid.length) : Math.round(refCorteRaio);
  const raioExpurgados = raioVals.length - raioValid.length;

  // 3. Nível Rua: Média da rua antes de cortar, balizar com a média do raio, 25% acima corta, 25% abaixo corta
  const ruaVals = ruaTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v >= 800 && v <= 80000);
  const ruaPrelim = ruaVals.length > 0 ? Math.round(ruaVals.reduce((a, b) => a + b, 0) / ruaVals.length) : 0;

  // Parâmetro de corte da rua balizado diretamente no raio (ruas do entorno)
  const refCorteRua = raioSaneada;
  const ruaCorteMin = Math.round(refCorteRua * 0.75);
  const ruaCorteMax = Math.round(refCorteRua * 1.25);

  const ruaValid = ruaVals.filter(v => v >= ruaCorteMin && v <= ruaCorteMax);
  const ruaSaneada = ruaValid.length > 0 ? Math.round(ruaValid.reduce((a, b) => a + b, 0) / ruaValid.length) : refCorteRua;
  const ruaExpurgados = ruaVals.length - ruaValid.length;

  // 4. Nível Prédio (Mesmo Edifício / Número Predial)
  const predioTxs = targetNum ? ruaTxs.filter(t => cleanStreetNumber(t.number) === targetNum) : [];
  const predioVals = predioTxs.map(t => t.unitValueSqm).filter(v => typeof v === 'number' && v >= 800 && v <= 80000);
  const predioPrelim = predioVals.length > 0 ? Math.round(predioVals.reduce((a, b) => a + b, 0) / predioVals.length) : 0;

  let predioValid = [];
  let predioSaneada = 0;
  let predioCorteMin = 0;
  let predioCorteMax = 0;

  // Se o prédio compreende 100% da amostragem da rua, herda o saneamento balizado pelo raio sem duplo expurgo
  if (predioVals.length === ruaVals.length && ruaVals.length > 0) {
    predioValid = ruaValid;
    predioSaneada = ruaSaneada;
    predioCorteMin = ruaCorteMin;
    predioCorteMax = ruaCorteMax;
  } else if (predioVals.length > 0) {
    const refCortePredio = ruaSaneada > 0 ? ruaSaneada : raioSaneada;
    predioCorteMin = Math.round(refCortePredio * 0.75);
    predioCorteMax = Math.round(refCortePredio * 1.25);
    predioValid = predioVals.filter(v => v >= predioCorteMin && v <= predioCorteMax);
    predioSaneada = predioValid.length > 0 ? Math.round(predioValid.reduce((a, b) => a + b, 0) / predioValid.length) : refCortePredio;
  }
  const predioExpurgados = predioVals.length - predioValid.length;

  // 5. DE TRÁS PRA FRENTE (Prédio -> Rua -> Raio -> Bairro)
  // Convergência da Média de Corte Real
  let mediaCorteReal = bSaneada;
  let nivelUtilizado = 'Bairro';

  if (predioValid.length > 0) {
    mediaCorteReal = predioSaneada;
    nivelUtilizado = 'Prédio';
  } else if (ruaValid.length > 0) {
    mediaCorteReal = ruaSaneada;
    nivelUtilizado = 'Rua';
  } else if (raioValid.length > 0) {
    mediaCorteReal = raioSaneada;
    nivelUtilizado = 'Raio Entorno';
  }

  // 6. Aplicação no Flip Rápido (60 dias) e Gabarito
  // Deságio tático de 10% para liquidez imediata
  const flipRapidoSqm = Math.round(mediaCorteReal * 0.90);
  const gabaritoTotal = mediaCorteReal * size;
  const flipTotal = flipRapidoSqm * size;

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
    minSimilarSize: minSize,
    maxSimilarSize: maxSize
  };
}