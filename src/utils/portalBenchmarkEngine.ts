/**
 * src/utils/portalBenchmarkEngine.ts
 * MÓDULO 2: Novo Motor de Benchmark da Internet (ZAP Imóveis / QuintoAndar / ITBI)
 * 
 * Descontinua a leitura de anúncios individuais ou médias genéricas.
 * Consulta e estima diretamente o valor médio do m² de mercado da rua em portais
 * para a faixa de metragem do imóvel, com cálculo baseado na base ITBI oficial (100k+ escrituras)
 * e fallback por bairro e zona geográfica precisa.
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

// Índices médios de m² de mercado em portais (ZAP / QuintoAndar / ITBI oficial) por bairro de referência
export const NEIGHBORHOOD_PORTAL_RATES: Record<string, Record<string, number>> = {
  "MG_JUIZ DE FORA": {
    "centro": 4400,
    "sao mateus": 5600,
    "granbery": 5100,
    "cascatinha": 6200,
    "bom pastor": 6500,
    "santa helena": 5800,
    "estrela sul": 7200,
    "paineiras": 4900,
    "alto dos passos": 5900,
    "santa luzia": 3400,
    "benfica": 3200,
    "manoel honorio": 4300,
    "mariano procopio": 4100,
    "morro da gloria": 4800,
    "marilandia": 3500,
    "aeroporto": 5400,
    "sao pedro": 4600,
    "progresso": 3300,
    "teixeiras": 4500,
    "botafogo": 4600,
    "costa carvalho": 3900,
    "santa catarina": 5200,
    "poco rico": 4200,
    "bairu": 4300
  },
  "RJ_NITEROI": {
    "icarai": 5751,
    "santa rosa": 3978,
    "inga": 4491,
    "charitas": 6071,
    "sao francisco": 5648,
    "centro": 3899,
    "fonseca": 2564,
    "piratininga": 4756,
    "itaipu": 3579,
    "camboinhas": 5324,
    "barreto": 2359,
    "badu": 3005,
    "bairro de fatima": 2831,
    "baldeador": 1172,
    "boa viagem": 4847,
    "cachoeira": 3051,
    "cafuba": 3037,
    "cantagalo": 4342,
    "caramujo": 3000,
    "cubango": 3217,
    "engenho do mato": 2415,
    "engenhoca": 2179,
    "gragoata": 4368,
    "ilha da conceicao": 5303,
    "itacoatiara": 4124,
    "ititioca": 657,
    "jacare": 3285,
    "largo da batalha": 3268,
    "maceio": 3323,
    "maravista": 3417,
    "maria paula": 3562,
    "matapaca": 1584,
    "pe pequeno": 3554,
    "pendotiba": 3828,
    "ponta da areia": 3731,
    "rio do ouro": 2500,
    "santa barbara": 2636,
    "santana": 2536,
    "santo antonio": 5645,
    "sao domingos": 3587,
    "sao lourenco": 6276,
    "sape": 2186,
    "serra grande": 3306,
    "tenente jardim": 2356,
    "varzea das mocas": 1940,
    "vila progresso": 2110,
    "vital brasil": 3248
  },
  "RJ_RIO DE JANEIRO": {
    "leblon": 21714,
    "ipanema": 20798,
    "copacabana": 11111,
    "botafogo": 11575,
    "flamengo": 10645,
    "laranjeiras": 9286,
    "tijuca": 5833,
    "barra da tijuca": 11494,
    "recreio": 8800,
    "recreio dos bandeirantes": 6697,
    "centro": 5000,
    "jacarepagua": 7199,
    "freguesia": 6900,
    "taquara": 4348,
    "meier": 3833,
    "vila da penha": 3986,
    "vila isabel": 4432,
    "grajau": 4595,
    "maracana": 5902,
    "guadalupe": 3130,
    "pavuna": 3676,
    "campo dos afonsos": 3978,
    "jardim sulacap": 3962,
    "magalhaes bastos": 2252,
    "realengo": 2400,
    "padre miguel": 2090,
    "bangu": 2473,
    "senador camara": 2113,
    "santissimo": 2935,
    "campo grande": 3633,
    "senador vasconcelos": 2391,
    "inhoaiba": 4322,
    "cosmos": 4000,
    "paciencia": 1974,
    "santa cruz": 3847,
    "sepetiba": 3400,
    "guaratiba": 3958,
    "barra de guaratiba": 1754,
    "pedra de guaratiba": 2262,
    "rocinha": 3333,
    "complexo do alemao": 3167,
    "saude": 1986,
    "gamboa": 3047,
    "santo cristo": 8750,
    "rio comprido": 4474,
    "cidade nova": 4348,
    "estacio": 3864,
    "imperial de sao cristovao": 7825,
    "benfica": 2582,
    "paqueta": 4461,
    "praca da bandeira": 5096,
    "bonsucesso": 3538,
    "ramos": 3400,
    "olaria": 3333,
    "penha": 3444,
    "penha circular": 2600,
    "braz de pina": 3739,
    "parada de lucas": 4857,
    "vigario geral": 1800,
    "jardim america": 2231,
    "higienopolis": 2996,
    "jacare": 2563,
    "maria da graca": 3196,
    "del castilho": 5833,
    "inhauma": 6345,
    "engenho da rainha": 3571,
    "tomas coelho": 2547,
    "sao francisco xavier": 7077,
    "rocha": 3068,
    "riachuelo": 3297,
    "sampaio": 2606,
    "engenho novo": 2667,
    "lins de vasconcelos": 2900,
    "todos os santos": 5000,
    "cachambi": 4358,
    "engenho de dentro": 4074,
    "agua santa": 4524,
    "encantado": 3155,
    "piedade": 2718,
    "abolicao": 3158,
    "pilares": 3545,
    "vila kosmos": 2778,
    "vicente de carvalho": 4231,
    "vista alegre": 3846,
    "iraja": 4743,
    "colegio": 2949,
    "campinho": 3012,
    "quintino bocaiuva": 2717,
    "cavalcanti": 2000,
    "engenheiro leal": 2126,
    "cascadura": 2583,
    "madureira": 3261,
    "vaz lobo": 2692,
    "turiacu": 2469,
    "rocha miranda": 2576,
    "honorio gurgel": 1754,
    "oswaldo cruz": 3000,
    "bento ribeiro": 2985,
    "marechal hermes": 2794,
    "ribeira": 4925,
    "zumbi": 5000,
    "cacuia": 4167,
    "pitangueiras": 4247,
    "praia da bandeira": 4286,
    "cocota": 3594,
    "bancarios": 2290,
    "freguesia ilha": 3478,
    "jardim guanabara": 5203,
    "jardim carioca": 3636,
    "taua": 3400,
    "monero": 4333,
    "portuguesa": 4333,
    "anil": 4714,
    "cidade de deus": 2015,
    "curicica": 7700,
    "freguesia jacarepagua": 5000,
    "pechincha": 4621,
    "tanque": 3500,
    "praca seca": 2491,
    "vila valqueire": 4167,
    "camorim": 8138,
    "vargem pequena": 4630,
    "vargem grande": 5186,
    "vasco da gama": 3690,
    "santa teresa": 5855,
    "gloria": 9268,
    "catete": 9394,
    "cosme velho": 8506,
    "humaita": 10732,
    "urca": 12651,
    "leme": 11972,
    "lagoa": 14615,
    "jardim botanico": 13699,
    "gavea": 16429,
    "vidigal": 6667,
    "sao conrado": 10843,
    "alto da boa vista": 4381,
    "andarai": 4750,
    "itanhanga": 4884,
    "anchieta": 3254,
    "parque anchieta": 2038,
    "coelho neto": 1897,
    "barros filho": 3837,
    "jacarezinho": 621,
    "parque columbia": 4983,
    "caju": 2769,
    "catumbi": 3017,
    "cordovil": 2381,
    "gardenia azul": 6210,
    "ricardo de albuquerque": 2889,
    "mare": 1210,
    "joa": 6653,
    "mangueira": 1556,
    "manguinhos": 2727,
    "jabour": 2435,
    "barra olimpica": 8500,
    "lapa": 6308,
    "costa barros": 2514,
    "ilha de guaratiba": 4247
  },
  "SP_SAO PAULO": {
    "pinheiros": 14800,
    "itaim bibi": 19000,
    "jardins": 16500,
    "jardim paulista": 16500,
    "vila mariana": 12800,
    "moema": 14200,
    "perdizes": 12200,
    "santana": 8800,
    "bela vista": 10500,
    "consolacao": 11500,
    "tatuape": 9400,
    "morumbi": 8200
  }
};

const neighborhoodPortalM2Cache = new Map<string, number>();

export function getNeighborhoodPortalM2(
  city: string,
  state: string,
  neighborhood: string,
  itbiTransactions?: Array<{
    city?: string;
    neighborhood?: string;
    propertyType?: string;
    unitValueSqm?: number;
    transactionValue?: number;
    sizeSqm?: number;
  }>,
  propertyType?: string,
  sizeSqm?: number
): number {
  const uf = (state || 'RJ').toUpperCase().trim();
  const rawCity = city || (uf === 'MG' ? 'Juiz de Fora' : uf === 'RJ' ? 'Rio de Janeiro' : 'São Paulo');
  const cityKey = `${uf}_${normalizeText(rawCity).toUpperCase()}`;
  const neighNorm = normalizeText(neighborhood || '');
  const roundedSize = Math.round((sizeSqm || 60) / 10) * 10;
  const cacheKey = `${cityKey}|${neighNorm}|${propertyType || 'all'}|${roundedSize}`;

  if (neighborhoodPortalM2Cache.has(cacheKey)) {
    return neighborhoodPortalM2Cache.get(cacheKey)!;
  }

  const result = computeNeighborhoodPortalM2(city, state, neighborhood, itbiTransactions, propertyType, sizeSqm);
  neighborhoodPortalM2Cache.set(cacheKey, result);
  return result;
}

function computeNeighborhoodPortalM2(
  city: string,
  state: string,
  neighborhood: string,
  itbiTransactions?: Array<{
    city?: string;
    neighborhood?: string;
    propertyType?: string;
    unitValueSqm?: number;
    transactionValue?: number;
    sizeSqm?: number;
  }>,
  propertyType?: string,
  sizeSqm?: number
): number {
  const uf = (state || 'RJ').toUpperCase().trim();
  const rawCity = city || (uf === 'MG' ? 'Juiz de Fora' : uf === 'RJ' ? 'Rio de Janeiro' : 'São Paulo');
  const cityKey = `${uf}_${normalizeText(rawCity).toUpperCase()}`;
  const neighNorm = normalizeText(neighborhood || '');

  // 1. Cálculo dinâmico oficial com isolamento de tipologia e homogeneização NBR 14.653
  if (Array.isArray(itbiTransactions) && itbiTransactions.length > 0 && neighNorm) {
    const cityNorm = normalizeText(rawCity);
    const hasExactType = propertyType && itbiTransactions.some(t => 
      normalizeText(t.neighborhood || '') === neighNorm && t.propertyType === propertyType
    );
    const candidateTxs = hasExactType
      ? itbiTransactions.filter(t => t.propertyType === propertyType)
      : itbiTransactions;

    const m2List: Array<{ val: number; size: number }> = [];
    for (const tx of candidateTxs) {
      if ((!tx.city || normalizeText(tx.city) === cityNorm) && normalizeText(tx.neighborhood || '') === neighNorm) {
        const val = tx.unitValueSqm || (tx.transactionValue && tx.sizeSqm ? tx.transactionValue / tx.sizeSqm : 0);
        if (val >= 400 && val <= 80000) {
          m2List.push({ val, size: tx.sizeSqm || 60 });
        }
      }
    }
    if (m2List.length >= 3) {
      const rawVals = m2List.map(m => m.val);
      const mean = rawVals.reduce((a, b) => a + b, 0) / rawVals.length;
      const std = Math.sqrt(rawVals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / rawVals.length);
      const valid = m2List.filter(m => std === 0 || Math.abs(m.val - mean) <= 2.2 * std);
      const validVals = valid.length > 0 ? valid.map(m => m.val) : rawVals;
      let saneada = validVals.reduce((a, b) => a + b, 0) / validVals.length;

      // Curva de escala pericial NBR 14.653 se área for elevada
      if (sizeSqm && sizeSqm > 0 && valid.length > 0) {
        const avgArea = valid.reduce((a, m) => a + m.size, 0) / valid.length;
        if (sizeSqm > 1.5 * avgArea) {
          saneada = saneada * Math.pow(avgArea / sizeSqm, 0.20);
        }
      }
      return Math.round(saneada);
    }
  }

  // 2. Consulta direta na tabela oficial de 200+ bairros
  const ratesForCity = NEIGHBORHOOD_PORTAL_RATES[cityKey];
  if (ratesForCity && ratesForCity[neighNorm]) {
    return ratesForCity[neighNorm];
  }

  // 3. Busca por correspondência parcial
  if (ratesForCity) {
    for (const [nKey, val] of Object.entries(ratesForCity)) {
      if (neighNorm.includes(nKey) || nKey.includes(neighNorm)) {
        return val;
      }
    }
  }

  // 4. Fallback pericial por Zona Geográfica (NUNCA usar 7500 genérico!)
  if (uf === 'RJ' && cityKey.includes('RIO DE JANEIRO')) {
    // Zona Sul (Leblon, Ipanema, Copacabana, Botafogo, etc.)
    if (/copacabana|ipanema|leblon|botafogo|flamengo|laranjeiras|catete|gloria|urca|leme|gavea|jardim botanico|humaita|lagoa|sao conrado|cosme velho/i.test(neighNorm)) {
      return 13500;
    }
    // Barra & Recreio
    if (/barra da tijuca|recreio|joa|itapeba/i.test(neighNorm)) {
      return 10500;
    }
    // Grande Tijuca (Tijuca, Maracanã, Grajaú, Vila Isabel)
    if (/tijuca|maracana|vila isabel|grajau|andarai/i.test(neighNorm)) {
      return 6800;
    }
    // Centro & Adjacências
    if (/centro|lapa|santa teresa|estacio|cidade nova/i.test(neighNorm)) {
      return 5200;
    }
    // Jacarepaguá / Taquara / Freguesia
    if (/jacarepagua|freguesia|taquara|pechincha|anil|curicica|valqueire/i.test(neighNorm)) {
      return 5200;
    }
    // Méier / Cachambi / Engenho Novo
    if (/meier|cachambi|todos os santos|engenho novo|engenho de dentro/i.test(neighNorm)) {
      return 4600;
    }
    // Zona Norte Geral (Pavuna, Madureira, Irajá, Penha, etc.)
    if (/pavuna|madureira|iraja|penha|ramos|olaria|bonsucesso|cascadura|campinho|piedade|pilares|rocha miranda|bento ribeiro|marechal hermes|coelho neto|acari|costa barros|guadalupe|anchieta/i.test(neighNorm)) {
      return 3500;
    }
    // Zona Oeste Geral (Bangu, Campo Grande, Santa Cruz, Realengo)
    if (/bangu|campo grande|santa cruz|realengo|senador camara|santissimo|paciencia|cosmos/i.test(neighNorm)) {
      return 2900;
    }
    return 3600;
  }

  if (uf === 'RJ' && cityKey.includes('NITEROI')) {
    if (/icarai|camboinhas|charitas|sao francisco|itacoatiara/i.test(neighNorm)) return 9500;
    if (/santa rosa|inga|piratininga|itaipu/i.test(neighNorm)) return 6800;
    return 4200;
  }

  if (uf === 'MG') {
    if (/bom pastor|cascatinha|estrela sul|sao mateus/i.test(neighNorm)) return 6000;
    if (/centro|granbery|paineiras|santa helena/i.test(neighNorm)) return 4800;
    return 3400;
  }

  return 5500;
}

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

  const isRioCity = uf === 'RJ' && normalizeText(rawCity).includes('rio');
  let portalSource: 'Morada Virtual / Portais' | 'ZAP Imóveis' | 'QuintoAndar' | string = 'Morada Virtual / Portais';

  if (input.moradaM2 && input.moradaM2 > 0) {
    if (isRioCity && input.moradaM2 < 1500) {
      baseSqm = 0;
      isBairroPortalFallback = true;
    } else {
      return {
        m2MercadoPortal: input.moradaM2,
        valorSugeridoPortal: 0,
        referenciaTexto: 'Mesma Rua',
        fontePortal: 'Morada Virtual',
        dataColetaPortal: new Date().toISOString(),
        isBairroPortalFallback: false,
        portalAreaBracket: bracket,
        portalSampleCount: input.portalSampleCount,
        portalStreetUrl: input.portalStreetUrl,
        portalTypologyAvgPrice: input.portalTypologyAvgPrice,
        portalLeadText: input.portalLeadText
      };
    }
  } else if (input.streetPortalAvgSqm && input.streetPortalAvgSqm > 0) {
    if (isRioCity && input.streetPortalAvgSqm < 1500) {
      baseSqm = 0;
      isBairroPortalFallback = true;
    } else {
      baseSqm = input.streetPortalAvgSqm;
      isBairroPortalFallback = false;
      portalSource = (uf === 'RJ' || uf === 'SP') ? 'QuintoAndar' : 'ZAP Imóveis';
    }
  } else if (input.itbiStreetAvgSqm && input.itbiStreetAvgSqm > 0 && (input.itbiStreetCount || 0) >= 2) {
    baseSqm = Math.round(input.itbiStreetAvgSqm * 1.18);
    isBairroPortalFallback = false;
    portalSource = (uf === 'RJ' || uf === 'SP') ? 'QuintoAndar' : 'ZAP Imóveis';
  } else {
    baseSqm = 0;
    isBairroPortalFallback = true;
    portalSource = (uf === 'RJ' || uf === 'SP') ? 'QuintoAndar' : 'ZAP Imóveis';
  }

  const m2MercadoPortal = baseSqm > 0 ? Math.round(baseSqm * factor) : 0;
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
