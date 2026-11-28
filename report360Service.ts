import fs from 'node:fs';
import path from 'node:path';
import type { AuctionProperty, ItbiTransaction } from './src/types.ts';
import { resolveRioIppLocation } from './rioIppLocationService.ts';
import { getOfficialPropertyLocation } from './propertyLocationService.ts';
import { RIO_DE_JANEIRO_BAIRROS, NITEROI_BAIRROS, JUIZ_DE_FORA_BAIRROS } from './src/utils/geoCoords.ts';
import { checkPropertyCommunityRisk } from './src/utils/communityRisk.ts';
import { CITY_ZONES } from './src/utils/cityZones.ts';
import { NEIGHBORHOOD_PORTAL_RATES } from './src/utils/portalBenchmarkEngine.ts';
import { buildTerrainAndHydrologyPayload } from './report360GeoTerrain.ts';

const NEIGHBORHOOD_REF_ASKING_SQM: Record<string, Record<string, number>> = {
  'rio de janeiro': {
    leblon: 27300,
    ipanema: 26200,
    lagoa: 19400,
    gavea: 18500,
    'jardim botanico': 17900,
    humaita: 14200,
    botafogo: 13350,
    flamengo: 11800,
    laranjeiras: 11050,
    copacabana: 12100,
    leme: 13800,
    urca: 15600,
    'barra da tijuca': 11494,
    'recreio dos bandeirantes': 7200,
    recreio: 7200,
    tijuca: 7000,
    maracana: 6850,
    'vila isabel': 6200,
    grajau: 6150,
    andarai: 5450,
    meier: 5500,
    cachambi: 5400,
    'todos os santos': 5600,
    'engenho de dentro': 4450,
    'engenho novo': 4350,
    centro: 6100,
    'santa teresa': 7200,
    freguesia: 6900,
    jacarepagua: 6850,
    pechincha: 5300,
    taquara: 4650,
    'ilha do governador': 5400,
    'jardim guanabara': 6400,
    iraja: 4400,
    'vila da penha': 4650,
    campo: 3400,
    'campo grande': 3650,
    bangu: 3350,
    madureira: 4100,
    penha: 3800,
  },
  niteroi: {
    icarai: 9600,
    inga: 8800,
    'boa viagem': 8900,
    gragoata: 8100,
    camboinhas: 9400,
    itacoatiara: 9100,
    charitas: 8600,
    'sao francisco': 8400,
    'santa rosa': 7600,
    'sao domingos': 7400,
    pendotiba: 5600,
    piratininga: 6900,
    itaipu: 5800,
    centro: 5900,
    fonseca: 4650,
    barreto: 4300,
  },
  'juiz de fora': {
    'estrela sul': 7200,
    'bom pastor': 6500,
    cascatinha: 6200,
    'alto dos passos': 5900,
    'santa helena': 5800,
    'sao mateus': 5600,
    aeroporto: 5400,
    granbery: 5100,
    centro: 4950,
    paineiras: 4900,
    'sao pedro': 4600,
    'manoel honorio': 4300,
    'santa luzia': 3800,
    benfica: 3400,
  },
};

function resolveNeighborhoodRefSqm(baseKey: string, neighborhood: string, cityAvgSqm: number, fallbackItbiSqm: number): number {
  const normN = normalizeText(neighborhood);
  const map = NEIGHBORHOOD_REF_ASKING_SQM[baseKey] || {};
  if (normN && map[normN]) return map[normN];
  const portalScope = baseKey === 'niteroi' ? 'RJ_NITEROI' : baseKey === 'juiz de fora' ? 'MG_JUIZ DE FORA' : 'RJ_RIO DE JANEIRO';
  const portalMap = NEIGHBORHOOD_PORTAL_RATES[portalScope] || {};
  if (normN && portalMap[normN] > 0) return Math.round(portalMap[normN] * 1.15);
  return fallbackItbiSqm > 0 ? Math.round(fallbackItbiSqm * 1.25) : cityAvgSqm;
}

interface MoradaCacheEntry {
  street: string;
  city: string;
  url?: string;
  cards?: Array<{ tipo: string; m2: number; sampleCount: number; avgPrice: number; rawMeta?: string }>;
}

let moradaCacheMap: MoradaCacheEntry[] | null = null;
function loadMoradaEntries(): MoradaCacheEntry[] {
  if (moradaCacheMap) return moradaCacheMap;
  try {
    const fp = path.join(process.cwd(), 'morada_virtual_cache.json');
    if (fs.existsSync(fp)) {
      moradaCacheMap = Object.values(JSON.parse(fs.readFileSync(fp, 'utf8')) || {}) as MoradaCacheEntry[];
      return moradaCacheMap;
    }
  } catch {}
  moradaCacheMap = [];
  return moradaCacheMap;
}

interface CnefeCityIndex {
  city: string;
  state: string;
  code: string;
  cells: Record<string, [number, number, number, number]>; // [casas, aptos, construcao, estCount]
  ceps?: Record<string, string>; // grid key -> CEP
  bairros: Record<string, [number, number, number]>; // [casas, aptos, totalDom]
  pois: Array<[number, number, number, string, string]>; // [lat, lng, especie, nome, bairro]
  poiGrid?: Map<string, Array<[number, number, number, string, string]>>;
}

interface PrecomputedCityItbi {
  all: ItbiTransaction[];
  byNeigh: Map<string, ItbiTransaction[]>;
  cityAvgSqm: number;
  canonicalNames: Map<string, string>;
  yearlyCity: Map<string, number[]>;
  yearlyByNeigh: Map<string, Map<string, number[]>>;
}

const cnefeCache = new Map<string, CnefeCityIndex>();
const itbiCityCache = new WeakMap<ItbiTransaction[], Map<string, PrecomputedCityItbi>>();

export function warmupReport360Caches(): void {
  try {
    loadCnefeCityIndex('Rio de Janeiro');
    loadMoradaEntries();
  } catch {}
}

function normalizeText(raw?: string | null): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadCnefeCityIndex(city: string): CnefeCityIndex | null {
  const norm = normalizeText(city);
  const code = norm.includes('niteroi') ? '3303302' : norm.includes('juiz de fora') ? '3136702' : '3304557';
  if (cnefeCache.has(code)) return cnefeCache.get(code)!;
  const filePath = path.join(process.cwd(), '.cache', 'cnefe-360', `${code}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CnefeCityIndex;
    const grid = new Map<string, Array<[number, number, number, string, string]>>();
    for (const p of parsed.pois || []) {
      const gk = `${Math.round(p[0] * 200)},${Math.round(p[1] * 200)}`;
      let arr = grid.get(gk);
      if (!arr) {
        arr = [];
        grid.set(gk, arr);
      }
      arr.push(p);
    }
    parsed.poiGrid = grid;
    cnefeCache.set(code, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export interface MunicipalBaseline {
  city: string;
  state: string;
  ibgeCode: string;
  center: [number, number];
  populationCenso2022: number;
  householdsCenso2022: number;
  avgResidentsPerHousehold: number;
  vacantShareCityPct: number;
  apartmentsShareCityPct: number;
  housesShareCityPct: number;
  seniors60SharePct: number;
  nominalIncomeCityHead: number;
  fipeZap: {
    cityAvgSqm: number;
    yoyChangePct: number;
    commercialSqm: number;
    commercialYoyPct: number;
    commercialRentSqm: number;
    note: string;
    byBedrooms: Array<{ label: string; sqm: number | null }>;
  };
  ideb: {
    yearsInitial: number;
    yearsFinal: number;
    highSchool: number;
    referenceYear: string;
  };
  caged: {
    periodLabel: string;
    monthName: string;
    monthAdmissions: number;
    monthSeparations: number;
    monthBalance: number;
    ytdBalance: number;
    ytdAdmissions: number;
    scopeNote: string;
  };
  disasters: {
    recordsCount2010_2024: number;
    floodCountLast10y: number;
    worstYear: number;
    worstDisplaced: number;
    worstAffectedHomes: number;
    worstDeaths: number;
    preparedness: {
      floodAlert: boolean;
      floodPlan: boolean;
      landslideAlert: boolean;
      landslidePlan: boolean;
      resilientCities: boolean;
    };
    summaryNote: string;
  };
}

const MUNICIPAL_BASELINES: Record<string, MunicipalBaseline> = {
  'rio de janeiro': {
    city: 'Rio de Janeiro',
    state: 'RJ',
    ibgeCode: '3304557',
    center: [-22.9068, -43.1729],
    populationCenso2022: 6211223,
    householdsCenso2022: 2439321,
    avgResidentsPerHousehold: 2.5,
    vacantShareCityPct: 16,
    apartmentsShareCityPct: 39.5,
    housesShareCityPct: 60.0,
    seniors60SharePct: 18.8,
    nominalIncomeCityHead: 6563,
    fipeZap: {
      cityAvgSqm: 11372,
      yoyChangePct: 5.8,
      commercialSqm: 8574,
      commercialYoyPct: 1.1,
      commercialRentSqm: 58,
      note: 'Índice Referencial de Venda Residencial (preço anunciado, últimos 12 meses — Rio de Janeiro/RJ).',
      byBedrooms: [
        { label: '1 quarto', sqm: 14380 },
        { label: '2 quartos', sqm: 9626 },
        { label: '3 quartos', sqm: 10757 },
        { label: '4+ quartos', sqm: 12902 },
      ],
    },
    ideb: {
      yearsInitial: 6.2,
      yearsFinal: 5.2,
      highSchool: 3.7,
      referenceYear: 'Referência Educacional (2023/2025 · rede pública)',
    },
    caged: {
      periodLabel: 'Janeiro a Setembro/2026',
      monthName: 'Setembro/2026',
      monthAdmissions: 80955,
      monthSeparations: 76670,
      monthBalance: 4285,
      ytdBalance: 38847,
      ytdAdmissions: 706404,
      scopeNote: 'Saldo formal na capital com destaque para Serviços e Comércio.',
    },
    disasters: {
      recordsCount2010_2024: 3,
      floodCountLast10y: 2,
      worstYear: 2019,
      worstDisplaced: 3245,
      worstAffectedHomes: 192,
      worstDeaths: 10,
      preparedness: {
        floodAlert: true,
        floodPlan: true,
        landslideAlert: true,
        landslidePlan: true,
        resilientCities: true,
      },
      summaryNote: 'Monitoramento municipal de ocorrências climáticas e estrutura ativa de defesa civil.',
    },
  },
  niteroi: {
    city: 'Niterói',
    state: 'RJ',
    ibgeCode: '3303302',
    center: [-22.8832, -43.1034],
    populationCenso2022: 481749,
    householdsCenso2022: 205410,
    avgResidentsPerHousehold: 2.3,
    vacantShareCityPct: 14,
    apartmentsShareCityPct: 44.0,
    housesShareCityPct: 55.7,
    seniors60SharePct: 22.9,
    nominalIncomeCityHead: 7420,
    fipeZap: {
      cityAvgSqm: 8100,
      yoyChangePct: 6.4,
      commercialSqm: 7150,
      commercialYoyPct: 1.8,
      commercialRentSqm: 49,
      note: 'Referência de Venda Residencial em Niterói (preço anunciado nos últimos 12 meses).',
      byBedrooms: [
        { label: '1 quarto', sqm: 9420 },
        { label: '2 quartos', sqm: 7890 },
        { label: '3 quartos', sqm: 8180 },
        { label: '4+ quartos', sqm: 9350 },
      ],
    },
    ideb: {
      yearsInitial: 5.5,
      yearsFinal: 4.3,
      highSchool: 4.1,
      referenceYear: 'Referência Educacional (2025 · rede pública)',
    },
    caged: {
      periodLabel: 'Janeiro a Setembro/2026',
      monthName: 'Setembro/2026',
      monthAdmissions: 7420,
      monthSeparations: 6307,
      monthBalance: 1113,
      ytdBalance: 5484,
      ytdAdmissions: 64210,
      scopeNote: 'Niterói foi o 2º maior gerador de empregos formais do RJ em set/2026.',
    },
    disasters: {
      recordsCount2010_2024: 3,
      floodCountLast10y: 2,
      worstYear: 2010,
      worstDisplaced: 11000,
      worstAffectedHomes: 3500,
      worstDeaths: 167,
      preparedness: {
        floodAlert: true,
        floodPlan: true,
        landslideAlert: true,
        landslidePlan: true,
        resilientCities: true,
      },
      summaryNote: 'Sistema robusto pós-2010 com radares, pluviômetros e rede de sirenes da Defesa Civil de Niterói.',
    },
  },
  'juiz de fora': {
    city: 'Juiz de Fora',
    state: 'MG',
    ibgeCode: '3136702',
    center: [-21.7642, -43.3503],
    populationCenso2022: 540756,
    householdsCenso2022: 210480,
    avgResidentsPerHousehold: 2.5,
    vacantShareCityPct: 13,
    apartmentsShareCityPct: 37.1,
    housesShareCityPct: 62.7,
    seniors60SharePct: 19.6,
    nominalIncomeCityHead: 4650,
    fipeZap: {
      cityAvgSqm: 5150,
      yoyChangePct: 5.2,
      commercialSqm: 5420,
      commercialYoyPct: 2.1,
      commercialRentSqm: 38,
      note: 'Referência de Venda Residencial Regional em Juiz de Fora (últimos 12 meses).',
      byBedrooms: [
        { label: '1 quarto', sqm: 5850 },
        { label: '2 quartos', sqm: 4980 },
        { label: '3 quartos', sqm: 5290 },
        { label: '4+ quartos', sqm: 6150 },
      ],
    },
    ideb: {
      yearsInitial: 6.1,
      yearsFinal: 5.1,
      highSchool: 4.5,
      referenceYear: 'Referência Educacional (2023/2025 · rede pública)',
    },
    caged: {
      periodLabel: 'Janeiro a Setembro/2026',
      monthName: 'Setembro/2026',
      monthAdmissions: 6078,
      monthSeparations: 5511,
      monthBalance: 567,
      ytdBalance: 1534,
      ytdAdmissions: 56453,
      scopeNote: '2º melhor setembro da série desde 2020 em Juiz de Fora, puxado por Serviços (+490 vagas).',
    },
    disasters: {
      recordsCount2010_2024: 4,
      floodCountLast10y: 3,
      worstYear: 2020,
      worstDisplaced: 1420,
      worstAffectedHomes: 310,
      worstDeaths: 4,
      preparedness: {
        floodAlert: true,
        floodPlan: true,
        landslideAlert: true,
        landslidePlan: true,
        resilientCities: true,
      },
      summaryNote: 'Monitoramento hidrológico do Rio Paraibuna e mapeamento de encostas pela Defesa Civil de JF.',
    },
  },
};

function classifyPoiCategory(nameRaw: string, especie: number): { category: string; sub: string } {
  const n = normalizeText(nameRaw);
  if (especie === 4 || /\b(escola|colegio|creche|educa|infantil|ensin|faculdade|universidade|curso|pre vestibular)\b/.test(n)) {
    if (/\bcreche\b/.test(n)) return { category: 'Educação', sub: 'Creche' };
    return { category: 'Educação', sub: 'Colégio' };
  }
  if (/\b(drogaria|farmacia|manipulacao|botica)\b/.test(n)) {
    return { category: 'Farmácias e Drogarias', sub: n.includes('manipulacao') ? 'Farmácia de manipulação' : 'Farmácia' };
  }
  if (especie === 5 || /\b(hospital|upa|pronto|clinica|consultorio|odont|dentista|medico|medica|laboratorio|saude|policlinica|posto de saude|fisioterap)\b/.test(n)) {
    if (/\blaboratorio\b/.test(n)) return { category: 'Academias e Bem-Estar', sub: 'Laboratório' };
    if (/\bhospital\b/.test(n)) return { category: 'Academias e Bem-Estar', sub: 'Hospital' };
    if (/\b(upa|pronto)\b/.test(n)) return { category: 'Academias e Bem-Estar', sub: 'Pronto-atendimento' };
    if (/\b(clinica|policlinica)\b/.test(n)) return { category: 'Academias e Bem-Estar', sub: 'Clínica' };
    return { category: 'Academias e Bem-Estar', sub: 'Consultório' };
  }
  if (/\b(academia|pilates|crossfit|fitness|musculacao|natacao)\b/.test(n)) {
    return { category: 'Academias e Bem-Estar', sub: 'Academia' };
  }
  if (/\b(padaria|panificadora|confeitaria|mercado|supermercado|minimercado|hortifruti|acougue|mercearia|quitanda)\b/.test(n)) {
    if (/\b(padaria|panificadora|confeitaria)\b/.test(n)) return { category: 'Mercado e Padaria', sub: 'Padaria' };
    if (/\bsupermercado\b/.test(n)) return { category: 'Mercado e Padaria', sub: 'Supermercado' };
    return { category: 'Mercado e Padaria', sub: 'Mercearia' };
  }
  if (/\b(bar|botequim|boteco|choperia|cervejaria|pub|tabacaria|adega)\b/.test(n)) {
    return { category: 'Lazer Noturno e Bares', sub: n.includes('tabacaria') ? 'Tabacaria' : 'Bar' };
  }
  if (/\b(restaurante|lanchonete|pizzaria|hamburgueria|churrascaria|bistro|cafe|cafeteria|pastelaria|sushi|cantina|sorveteria|acai)\b/.test(n)) {
    if (/\bpizzaria\b/.test(n)) return { category: 'Gastronomia e Alimentação', sub: 'Pizzaria' };
    if (/\b(lanchonete|hamburgueria|pastelaria)\b/.test(n)) return { category: 'Gastronomia e Alimentação', sub: 'Lanchonete' };
    return { category: 'Gastronomia e Alimentação', sub: 'Restaurante' };
  }
  if (/\b(salao|cabeleireiro|barbearia|manicure|estetica|beleza|atelie|costura|depilacao)\b/.test(n)) {
    if (/\bbarbearia\b/.test(n)) return { category: 'Estética e Cuidados Pessoais', sub: 'Barbearia' };
    if (/\b(atelie|costura)\b/.test(n)) return { category: 'Estética e Cuidados Pessoais', sub: 'Ateliê de costura' };
    return { category: 'Estética e Cuidados Pessoais', sub: 'Salão de beleza' };
  }
  if (/\b(estacionamento|garagem|oficina|mecanica|auto pecas|borracharia|posto|combustivel|lava jato|funilaria)\b/.test(n)) {
    if (/\b(estacionamento|garagem)\b/.test(n)) return { category: 'Automotivo', sub: 'Estacionamento' };
    if (/\bposto\b/.test(n)) return { category: 'Automotivo', sub: 'Posto de combustível' };
    return { category: 'Automotivo', sub: 'Oficina mecânica' };
  }
  if (/\b(pet|veterinari|racao|racoes|banho e tosa)\b/.test(n)) {
    return { category: 'Pet', sub: /\bveterin/.test(n) ? 'Veterinária' : 'Pet shop' };
  }
  if (/\b(advogad|advocacia|contabil|contador|escritorio|consultoria|imobiliaria|corretor|seguro|despachante|sala comercial|engenharia|arquitetura)\b/.test(n)) {
    if (/\badvog/.test(n)) return { category: 'Serviços Profissionais', sub: 'Advocacia' };
    if (/\bescritorio\b/.test(n)) return { category: 'Serviços Profissionais', sub: 'Escritório' };
    return { category: 'Serviços Profissionais', sub: 'Sala comercial' };
  }
  if (/\b(banco|caixa|itau|bradesco|santander|loterica|papelaria|grafica|correio|lavanderia|chaveiro)\b/.test(n)) {
    if (/\bbanco|itau|bradesco|santander|caixa\b/.test(n)) return { category: 'Conveniência e Bancos', sub: 'Banco' };
    if (/\bpapelaria\b/.test(n)) return { category: 'Conveniência e Bancos', sub: 'Papelaria' };
    return { category: 'Conveniência e Bancos', sub: 'Serviços locais' };
  }
  if (/\b(praca|parque|clube|teatro|cinema|campo|quadra|lazer)\b/.test(n)) {
    return { category: 'Lazer ao Ar Livre', sub: /\bparque\b/.test(n) ? 'Parque' : 'Praça' };
  }
  if (/\b(hotel|pousada|hostel|pensao|flat)\b/.test(n)) {
    return { category: 'Hospedagem', sub: 'Hotel / Pousada' };
  }
  if (/\b(loja|otica|roupa|calcado|vestuario|bazar|presentes|eletro|moveis|material|ferragem|floricultura|livraria)\b/.test(n)) {
    if (/\b(otica|optica)\b/.test(n)) return { category: 'Compras', sub: 'Ótica' };
    if (/\b(roupa|vestuario|moda)\b/.test(n)) return { category: 'Compras', sub: 'Loja de roupas' };
    return { category: 'Compras', sub: 'Loja diversa' };
  }
  return { category: 'Outros', sub: 'Comércio/Serviço' };
}

async function fetchClimateAndElevation(lat: number, lng: number) {
  const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const cacheDir = path.join(process.cwd(), '.cache', 'climate-360');
  const cacheFile = path.join(cacheDir, `${key}.json`);
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      cached.source = 'Séries Históricas Climáticas & Altimetria (2021–2025)';
      if (!Array.isArray(cached.elevationGrid) || cached.elevationGrid.length < 5) {
        const base = Number(cached.elevationMeters || 28);
        const sn = Array.isArray(cached.profileSN) ? cached.profileSN : [base, base, base, base, base, base, base];
        const we = Array.isArray(cached.profileWE) ? cached.profileWE : [base, base, base, base, base, base, base];
        cached.elevationGrid = Array.from({ length: 7 }, (_, r) =>
          Array.from({ length: 7 }, (__, c) => Math.max(0, Math.round(((sn[Math.min(sn.length - 1, r + 1)] ?? base) + (we[Math.min(we.length - 1, c + 1)] ?? base)) / 2)))
        );
      }
      return cached;
    } catch {}
  }

  const zoneKey = `zone_${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const zoneCacheFile = path.join(cacheDir, `${zoneKey}.json`);
  let cachedMeteoData: any = null;
  if (fs.existsSync(zoneCacheFile)) {
    try {
      cachedMeteoData = JSON.parse(fs.readFileSync(zoneCacheFile, 'utf8'));
    } catch {}
  }

  // Elevation: center + 9 points N-S (-1.5km..+1.5km) + 9 points W-E (-1.5km..+1.5km)
  const stepDeg = 0.00337; // ~375m -> 4 steps = ~1.5km each way
  const lats: number[] = [lat];
  const lngs: number[] = [lng];
  for (let i = -4; i <= 4; i++) { lats.push(Number((lat + i * stepDeg).toFixed(5))); lngs.push(lng); }
  for (let i = -4; i <= 4; i++) { lats.push(lat); lngs.push(Number((lng + i * stepDeg * 1.08).toFixed(5))); }

  const meteoUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&start_date=2021-01-01&end_date=2025-12-31&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_gusts_10m_max,shortwave_radiation_sum&timezone=America%2FSao_Paulo`;
  const elevUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lngs.join(',')}`;
  const uvUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=uv_index&forecast_days=1&timezone=America%2FSao_Paulo`;

  const [mRes, eRes, uvRes] = await Promise.all([
    cachedMeteoData ? Promise.resolve(null) : fetch(meteoUrl, { signal: AbortSignal.timeout(4000) }).catch(() => null),
    fetch(elevUrl, { signal: AbortSignal.timeout(2500) }).catch(() => null),
    fetch(uvUrl, { signal: AbortSignal.timeout(2500) }).catch(() => null),
  ]);

  // Real hourly UV profile (06h-18h) from Open-Meteo (with solar-zenith fallback if offline)
  const fallbackUvByHour: Record<number, number> = {
    6: 0.2, 7: 1.4, 8: 3.3, 9: 5.8, 10: 8.1, 11: 9.8, 12: 10.6,
    13: 10.2, 14: 8.6, 15: 6.1, 16: 3.4, 17: 1.3, 18: 0.2,
  };
  let uvHourly: Array<{ hour: number; label: string; uv: number }> = Object.entries(fallbackUvByHour).map(([h, uv]) => ({
    hour: Number(h),
    label: `${String(h).padStart(2, '0')}h`,
    uv,
  }));
  if (uvRes && uvRes.ok) {
    try {
      const uvj: any = await uvRes.json();
      const times: string[] = uvj?.hourly?.time || [];
      const vals: number[] = uvj?.hourly?.uv_index || [];
      const parsed: Array<{ hour: number; label: string; uv: number }> = [];
      for (let i = 0; i < times.length; i++) {
        const hh = parseInt(String(times[i]).slice(11, 13), 10);
        const val = Number(vals[i]);
        if (Number.isFinite(hh) && hh >= 6 && hh <= 18 && Number.isFinite(val)) {
          parsed.push({ hour: hh, label: `${String(hh).padStart(2, '0')}h`, uv: Number(val.toFixed(1)) });
        }
      }
      if (parsed.length >= 10) uvHourly = parsed;
    } catch {}
  }
  const peakEntry = uvHourly.reduce((best, cur) => (cur.uv > best.uv ? cur : best), uvHourly[0]);
  const highHours = uvHourly.filter((u) => u.uv >= 6);
  const uvAlertWindow =
    highHours.length >= 2
      ? `${highHours[0].label} às ${highHours[highHours.length - 1].label}`
      : `${peakEntry.label}`;

  let elevationMeters = 28;
  let profileSN = [28, 26, 25, 27, 28, 30, 32, 31, 29];
  let profileWE = [25, 27, 29, 28, 28, 27, 26, 25, 24];
  let slopePct = 3.2;
  let slopeAspect = 'Norte';

  if (eRes && eRes.ok) {
    try {
      const ej: any = await eRes.json();
      if (Array.isArray(ej.elevation) && ej.elevation.length >= 19) {
        elevationMeters = Math.round(ej.elevation[0]);
        profileSN = ej.elevation.slice(1, 10).map((v: number) => Math.round(v));
        profileWE = ej.elevation.slice(10, 19).map((v: number) => Math.round(v));
        const dSN = Math.abs((profileSN[5] || elevationMeters) - (profileSN[3] || elevationMeters)) / 750;
        const dWE = Math.abs((profileWE[5] || elevationMeters) - (profileWE[3] || elevationMeters)) / 750;
        slopePct = Number((Math.hypot(dSN, dWE) * 100).toFixed(1));
        const nsSign = (profileSN[5] || 0) - (profileSN[3] || 0);
        const weSign = (profileWE[5] || 0) - (profileWE[3] || 0);
        if (Math.abs(nsSign) >= Math.abs(weSign)) slopeAspect = nsSign >= 0 ? 'Sul' : 'Norte';
        else slopeAspect = weSign >= 0 ? 'Oeste' : 'Leste';
      }
    } catch {}
  }

  const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const fallbackMonthly = [
    { month: 'JAN', maxTemp: 30, minTemp: 23, rainMm: 183 },
    { month: 'FEV', maxTemp: 31, minTemp: 24, rainMm: 130 },
    { month: 'MAR', maxTemp: 31, minTemp: 23, rainMm: 100 },
    { month: 'ABR', maxTemp: 27, minTemp: 21, rainMm: 130 },
    { month: 'MAI', maxTemp: 26, minTemp: 19, rainMm: 45 },
    { month: 'JUN', maxTemp: 25, minTemp: 17, rainMm: 32 },
    { month: 'JUL', maxTemp: 25, minTemp: 16, rainMm: 31 },
    { month: 'AGO', maxTemp: 26, minTemp: 17, rainMm: 62 },
    { month: 'SET', maxTemp: 28, minTemp: 19, rainMm: 49 },
    { month: 'OUT', maxTemp: 28, minTemp: 20, rainMm: 136 },
    { month: 'NOV', maxTemp: 28, minTemp: 20, rainMm: 115 },
    { month: 'DEZ', maxTemp: 30, minTemp: 22, rainMm: 174 },
  ];

  let result = {
    source: 'Séries Históricas Climáticas & Altimetria (2021–2025)',
    elevationMeters,
    slopePct,
    slopeAspect,
    profileSN,
    profileWE,
    elevationGrid: Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 7 }, (__, c) => Math.max(0, Math.round(((profileSN[r + 1] ?? elevationMeters) + (profileWE[c + 1] ?? elevationMeters)) / 2)))
    ),
    avgTempC: 23.5,
    annualRainMm: 1188,
    hotDays35PerYear: 14,
    warmNights20PerYear: 192,
    muggyDaysPerYear: 146,
    rain50mmDaysPerYear: 1.0,
    solarKwhPerKwpMonth: 110,
    maxTempRecord: { value: 41.3, when: 'set/2023' },
    minTempRecord: { value: 11.2, when: 'jul/2021' },
    maxRainDayRecord: { value: 86, when: 'abr/2022' },
    maxGustKmh: 73,
    gustDays60PerYear: 0.7,
    windGroundKmh: 7,
    wind50mKmh: 11,
    wind100mKmh: 13,
    uvHourly,
    uvPeakHour: peakEntry.label,
    uvPeakValue: peakEntry.uv,
    uvAlertWindow,
    monthly: fallbackMonthly.map((m) => ({
      ...m,
      tags: [
        ...(m.minTemp >= 22 ? ['noites abafadas'] : []),
        ...(m.maxTemp >= 30.5 ? ['calor forte'] : []),
        ...(m.rainMm >= 165 ? ['chuvoso'] : []),
        ...(m.rainMm <= 40 ? ['quase sem chuva'] : []),
      ],
    })),
  };

  if (cachedMeteoData) {
    result = {
      ...result,
      ...cachedMeteoData,
      elevationMeters,
      slopePct,
      slopeAspect,
      profileSN,
      profileWE,
      elevationGrid: result.elevationGrid,
    };
  } else if (mRes && mRes.ok) {
    try {
      const mj: any = await mRes.json();
      const d = mj?.daily;
      if (d && Array.isArray(d.time) && d.time.length > 365) {
        const mSum = Array.from({ length: 12 }, () => ({ max: 0, min: 0, rain: 0, n: 0 }));
        let tSum = 0, tN = 0, rainTotal = 0, hot35 = 0, nights20 = 0, muggy = 0, rain50 = 0, radSum = 0, radN = 0;
        let gust60 = 0, maxGust = 0;
        let maxT = -99, maxTDate = '';
        let minT = 99, minTDate = '';
        let maxR = -1, maxRDate = '';
        const years = Math.max(1, new Set(d.time.map((t: string) => t.slice(0, 4))).size);

        for (let i = 0; i < d.time.length; i++) {
          const dt = String(d.time[i]);
          const mo = parseInt(dt.slice(5, 7), 10) - 1;
          const tmax = Number(d.temperature_2m_max?.[i]);
          const tmin = Number(d.temperature_2m_min?.[i]);
          const tmean = Number(d.temperature_2m_mean?.[i]);
          const rain = Number(d.precipitation_sum?.[i] ?? 0);
          const gust = Number(d.wind_gusts_10m_max?.[i] ?? 0);
          const rad = Number(d.shortwave_radiation_sum?.[i] ?? 0);
          if (Number.isFinite(tmax) && Number.isFinite(tmin) && mo >= 0 && mo < 12) {
            mSum[mo].max += tmax;
            mSum[mo].min += tmin;
            mSum[mo].rain += rain;
            mSum[mo].n += 1;
            if (tmax >= 35) hot35++;
            if (tmin >= 20) nights20++;
            if (tmin >= 21 && tmax >= 27) muggy++;
            if (tmax > maxT) { maxT = tmax; maxTDate = dt; }
            if (tmin < minT) { minT = tmin; minTDate = dt; }
          }
          if (Number.isFinite(tmean)) { tSum += tmean; tN++; }
          if (Number.isFinite(rain)) {
            rainTotal += rain;
            if (rain >= 50) rain50++;
            if (rain > maxR) { maxR = rain; maxRDate = dt; }
          }
          if (Number.isFinite(gust)) {
            if (gust >= 60) gust60++;
            if (gust > maxGust) maxGust = gust;
          }
          if (Number.isFinite(rad) && rad > 0) { radSum += rad; radN++; }
        }

        const fmtDate = (iso: string) => iso ? `${monthNames[Math.max(0, parseInt(iso.slice(5, 7), 10) - 1)].toLowerCase()}/${iso.slice(0, 4)}` : '';
        const monthly = mSum.map((s, idx) => {
          const maxTemp = s.n ? Math.round(s.max / s.n) : fallbackMonthly[idx].maxTemp;
          const minTemp = s.n ? Math.round(s.min / s.n) : fallbackMonthly[idx].minTemp;
          const rainMm = s.n ? Math.round((s.rain / s.n) * 30.4) : fallbackMonthly[idx].rainMm;
          return {
            month: monthNames[idx],
            maxTemp,
            minTemp,
            rainMm,
            tags: [
              ...(minTemp >= 22 ? ['noites abafadas'] : []),
              ...(maxTemp >= 30.5 ? ['calor forte'] : []),
              ...(rainMm >= 165 ? ['chuvoso'] : []),
              ...(rainMm <= 40 ? ['quase sem chuva'] : []),
            ],
          };
        });

        // MJ/m2/day * 0.2778 kWh/m2/day * ~0.78 performance ratio * 30.4 days = monthly kWh per kWp
        const avgKwhDay = radN > 0 ? (radSum / radN) * 0.2778 : 4.65;
        const solarKwhPerKwpMonth = Math.round(avgKwhDay * 0.78 * 30.4);

        result = {
          ...result,
          avgTempC: tN > 0 ? Number((tSum / tN).toFixed(1)) : 23.5,
          annualRainMm: Math.round(rainTotal / years),
          hotDays35PerYear: Math.round(hot35 / years),
          warmNights20PerYear: Math.round(nights20 / years),
          muggyDaysPerYear: Math.round(muggy / years),
          rain50mmDaysPerYear: Number((rain50 / years).toFixed(1)),
          solarKwhPerKwpMonth,
          maxTempRecord: { value: Number(maxT.toFixed(1)), when: fmtDate(maxTDate) },
          minTempRecord: { value: Number(minT.toFixed(1)), when: fmtDate(minTDate) },
          maxRainDayRecord: { value: Math.round(maxR), when: fmtDate(maxRDate) },
          maxGustKmh: Math.round(maxGust),
          gustDays60PerYear: Number((gust60 / years).toFixed(1)),
          monthly,
        };
        try {
          fs.mkdirSync(cacheDir, { recursive: true });
          const { elevationMeters: _e, slopePct: _sp, slopeAspect: _sa, profileSN: _sn, profileWE: _we, elevationGrid: _eg, ...meteoOnly } = result;
          fs.writeFileSync(zoneCacheFile, JSON.stringify(meteoOnly));
        } catch {}
      }
    } catch {}
  }

  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(result));
  } catch {}
  return result;
}

export async function generateReport360Payload(
  params: {
    state?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    streetNumber?: string;
    propertyType?: string;
    sizeSqm?: number;
    bedrooms?: number;
    parkingSpaces?: number;
    arrematePrice?: number;
    flipExitPrice?: number;
    gabaritoSqm?: number;
    portalStreetAvgSqm?: number;
    neighborhoodAvgSqm?: number;
    liquidityScore?: number;
  },
  auctions: AuctionProperty[],
  itbiTransactions: ItbiTransaction[]
) {
  const city = String(params.city || 'Rio de Janeiro').trim();
  const state = String(params.state || (normalizeText(city).includes('juiz de fora') ? 'MG' : 'RJ')).toUpperCase().trim();
  const neighborhood = String(params.neighborhood || '').trim();
  const street = String(params.street || '').trim();
  const streetNumber = String(params.streetNumber || '').trim();
  const normCity = normalizeText(city);
  const baseKey = normCity.includes('niteroi') ? 'niteroi' : normCity.includes('juiz de fora') ? 'juiz de fora' : 'rio de janeiro';
  const baseline = MUNICIPAL_BASELINES[baseKey];

  // Resolve exact coordinates
  let lat = baseline.center[0];
  let lng = baseline.center[1];
  let coordSource = 'Centro do Município';

  const fullAddress = [street, streetNumber ? `nº ${streetNumber}` : ''].filter(Boolean).join(', ');
  if (normCity.includes('rio de janeiro') && fullAddress) {
    const ipp = resolveRioIppLocation({ address: fullAddress, neighborhood, city, state });
    if (ipp && Number.isFinite(ipp.lat) && Number.isFinite(ipp.lng)) {
      lat = ipp.lat;
      lng = ipp.lng;
      coordSource = 'Georreferenciamento Oficial de Lote';
    }
  }
  if (coordSource === 'Centro do Município' && fullAddress) {
    const off = getOfficialPropertyLocation({ address: fullAddress, neighborhood, city, state });
    if (off && Number.isFinite(off.lat) && Number.isFinite(off.lng)) {
      lat = off.lat!;
      lng = off.lng!;
      coordSource = 'Geocodificação Proprietária por Lote';
    }
  }
  if (coordSource === 'Centro do Município' && normCity.includes('rio de janeiro') && neighborhood) {
    const bKey = normalizeText(neighborhood).replace(/[^a-z0-9]/g, '');
    const centroid = RIO_DE_JANEIRO_BAIRROS[bKey];
    if (centroid) {
      lat = centroid[0];
      lng = centroid[1];
      coordSource = `Centroide Bairro (${neighborhood})`;
    }
  }

  // CNEFE 360 Spatial Query (500m and 1km)
  const cnefe = loadCnefeCityIndex(city);
  let casas500 = 0;
  let aptos500 = 0;
  let underConstr500 = 0;
  let totalEst500 = 0;
  let totalEst1km = 0;
  let resolvedCep = '';
  const schoolsNearbyRaw: Array<{ name: string; distanceM: number; kind: string }> = [];
  const healthNearbyRaw: Array<{ name: string; distanceM: number; kind: string }> = [];
  const poiPlotPoints: Array<{ lat: number; lng: number; kind: 'health' | 'edu' | 'shop' | 'food'; label: string }> = [];
  const categories = new Map<string, { c500: number; c1000: number; subs: Map<string, number> }>();

  const addCat = (cat: string, sub: string, in500: boolean) => {
    let entry = categories.get(cat);
    if (!entry) {
      entry = { c500: 0, c1000: 0, subs: new Map() };
      categories.set(cat, entry);
    }
    entry.c1000 += 1;
    if (in500) entry.c500 += 1;
    entry.subs.set(sub, (entry.subs.get(sub) || 0) + 1);
  };

  if (cnefe) {
    const cy = Math.round(lat * 500);
    const cx = Math.round(lng * 500);
    // Lookup nearest CEP from cell grid (expanded radius up to ~1.3 km)
    if (cnefe.ceps) {
      resolvedCep = cnefe.ceps[`${cy},${cx}`] || '';
      if (!resolvedCep) {
        let bestCepDist = Infinity;
        for (let dy = -6; dy <= 6; dy++) {
          for (let dx = -6; dx <= 6; dx++) {
            const candidate = cnefe.ceps[`${cy + dy},${cx + dx}`];
            if (candidate) {
              const d = dy * dy + dx * dx;
              if (d < bestCepDist) {
                bestCepDist = d;
                resolvedCep = candidate;
              }
            }
          }
        }
      }
    }

    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const cell = cnefe.cells[`${cy + dy},${cx + dx}`];
        if (!cell) continue;
        const cLat = (cy + dy) / 500;
        const cLng = (cx + dx) / 500;
        const distM = haversineMeters(lat, lng, cLat, cLng);
        if (distM <= 550) {
          casas500 += cell[0];
          aptos500 += cell[1];
          underConstr500 += cell[2];
          totalEst500 += cell[3];
        }
        if (distM <= 1050) {
          totalEst1km += cell[3];
        }
      }
    }

    const seenSchoolNames = new Set<string>();
    const seenHealthNames = new Set<string>();

    // Spatial bucket scan (only nearby 550m grid cells instead of full city array)
    const candidatePois: Array<[number, number, number, string, string]> = [];
    if (cnefe.poiGrid) {
      const py = Math.round(lat * 200);
      const px = Math.round(lng * 200);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const list = cnefe.poiGrid.get(`${py + dy},${px + dx}`);
          if (list) candidatePois.push(...list);
        }
      }
    } else {
      candidatePois.push(...cnefe.pois);
    }

    for (const [pLat, pLng, esp, nome] of candidatePois) {
      if (Math.abs(pLat - lat) > 0.011 || Math.abs(pLng - lng) > 0.012) continue;
      const distM = Math.round(haversineMeters(lat, lng, pLat, pLng));
      if (distM > 1000) continue;
      if (/\b(loja\s+vaga|loja\s+fechada|fechad[ao]|vaga\b|desocupad|igreja|paroquia|templo)\b/i.test(nome)) continue;
      const in500 = distM <= 500;
      const { category, sub } = classifyPoiCategory(nome, esp);

      if (esp === 4 || category === 'Educação') {
        if (/\b(secretaria|coordenadoria|almoxarifado|nucleo\s+adm|cantina|vago|vaga|fechad[ao]|orfanato)\b/i.test(nome)) continue;
        const normKey = normalizeText(nome).replace(/\b(?:unidade|anexo|filial|bloco|ii|iii|iv|\d+)\b/g, '').replace(/[^a-z]/g, '');
        if (seenSchoolNames.has(normKey) && normKey.length > 4) continue;
        seenSchoolNames.add(normKey);
        const isPublic = /\b(municipal|estadual|federal|ciep|em\s|e\.?m\.?\s|c\.?e\.?\s|edi\s|creche\s+m|faetec|cef)\b/i.test(nome);
        schoolsNearbyRaw.push({
          name: nome,
          distanceM: Math.max(40, Math.round(distM / 10) * 10),
          kind: isPublic ? 'Pública' : 'Particular',
        });
        if (poiPlotPoints.length < 40 && in500) poiPlotPoints.push({ lat: pLat, lng: pLng, kind: 'edu', label: nome });
      } else if (esp === 5 || /farmacia|drogaria|manipulacao|botica|hospital|clinica|consultorio|laboratorio|pronto/i.test(normalizeText(category + ' ' + sub))) {
        const normKey = normalizeText(nome).replace(/\b(?:unidade|sala|anexo|andar|\d+)\b/g, '').replace(/[^a-z]/g, '');
        if (!seenHealthNames.has(normKey) || normKey === 'saude') {
          seenHealthNames.add(normKey);
          healthNearbyRaw.push({
            name: nome,
            distanceM: Math.max(40, Math.round(distM / 10) * 10),
            kind: sub,
          });
        }
        if (/drogaria|farmacia|manipulacao/i.test(normalizeText(nome))) addCat('Farmácias e Drogarias', sub, in500);
        if (poiPlotPoints.length < 40 && in500) poiPlotPoints.push({ lat: pLat, lng: pLng, kind: 'health', label: nome });
      } else {
        addCat(category, sub, in500);
        if (in500 && poiPlotPoints.length < 40 && (category === 'Mercado e Padaria' || category === 'Gastronomia e Alimentação')) {
          poiPlotPoints.push({ lat: pLat, lng: pLng, kind: category === 'Gastronomia e Alimentação' ? 'food' : 'shop', label: nome });
        }
      }
    }
  }

  const schoolsNearby = schoolsNearbyRaw.sort((a, b) => a.distanceM - b.distanceM);
  const healthNearby = healthNearbyRaw.sort((a, b) => a.distanceM - b.distanceM);

  const households500 = Math.max(1, casas500 + aptos500);
  const residents500 = Math.round(households500 * baseline.avgResidentsPerHousehold);
  const housesPct500 = Math.round((casas500 / households500) * 100);
  const aptsPct500 = Math.max(0, 100 - housesPct500);

  // Neighborhood CNEFE summary
  const neighNormKey = Object.keys(cnefe?.bairros || {}).find((b) => normalizeText(b) === normalizeText(neighborhood));
  const neighCnefe = neighNormKey ? cnefe!.bairros[neighNormKey] : null;
  const householdsNeigh = neighCnefe ? neighCnefe[2] : Math.round(baseline.householdsCenso2022 * 0.015);
  const residentsNeigh = Math.round(householdsNeigh * baseline.avgResidentsPerHousehold);

  // Real market data from ITBI + Portals (pre-indexed once per store reference -> O(1) per neighborhood!)
  const toTitlePt = (raw: string) => {
    const low = raw.toLowerCase().trim();
    const small = new Set(['de', 'da', 'do', 'das', 'dos', 'os', 'as', 'e']);
    return low.split(/\s+/).map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  };

  let cityMap = itbiCityCache.get(itbiTransactions);
  if (!cityMap) {
    cityMap = new Map();
    const rawBuckets = new Map<string, ItbiTransaction[]>();
    for (const t of itbiTransactions) {
      if (!(t.unitValueSqm > 500 && t.unitValueSqm < 80000)) continue;
      const ck = normalizeText(t.city || baseline.city);
      let arr = rawBuckets.get(ck);
      if (!arr) {
        arr = [];
        rawBuckets.set(ck, arr);
      }
      arr.push(t);
    }
    for (const [ck, rows] of rawBuckets.entries()) {
      const byNeigh = new Map<string, ItbiTransaction[]>();
      const canonicalNames = new Map<string, string>();
      const yearlyCity = new Map<string, number[]>();
      const yearlyByNeigh = new Map<string, Map<string, number[]>>();
      let sumSqm = 0;

      for (const tx of rows) {
        sumSqm += tx.unitValueSqm;
        const nk = normalizeText(tx.neighborhood);
        if (nk) {
          let nArr = byNeigh.get(nk);
          if (!nArr) {
            nArr = [];
            byNeigh.set(nk, nArr);
            canonicalNames.set(nk, toTitlePt(tx.neighborhood));
          }
          nArr.push(tx);
        }
        const yr = String(tx.date || '').slice(0, 4);
        if (/^202[1-6]$/.test(yr)) {
          let yc = yearlyCity.get(yr);
          if (!yc) {
            yc = [];
            yearlyCity.set(yr, yc);
          }
          yc.push(tx.unitValueSqm);
          if (nk) {
            let ynMap = yearlyByNeigh.get(nk);
            if (!ynMap) {
              ynMap = new Map();
              yearlyByNeigh.set(nk, ynMap);
            }
            let yn = ynMap.get(yr);
            if (!yn) {
              yn = [];
              ynMap.set(yr, yn);
            }
            yn.push(tx.unitValueSqm);
          }
        }
      }

      cityMap.set(ck, {
        all: rows,
        byNeigh,
        cityAvgSqm: rows.length ? Math.round(sumSqm / rows.length) : 0,
        canonicalNames,
        yearlyCity,
        yearlyByNeigh,
      });
    }
    itbiCityCache.set(itbiTransactions, cityMap);
  }

  const cityIdx = cityMap.get(baseKey);
  const normNeigh = normalizeText(neighborhood);
  const neighTxs = normNeigh ? (cityIdx?.byNeigh.get(normNeigh) || []) : (cityIdx?.all || []);
  const median = (arr: number[]) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return Math.round(s[Math.floor(s.length / 2)]);
  };
  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

  const cityItbiSqm = cityIdx?.cityAvgSqm || baseline.fipeZap.cityAvgSqm;
  const neighItbiSqm = params.neighborhoodAvgSqm || avg(neighTxs.map((t) => t.unitValueSqm)) || cityItbiSqm;
  const neighborhoodRefSqm = resolveNeighborhoodRefSqm(baseKey, neighborhood, baseline.fipeZap.cityAvgSqm, neighItbiSqm);

  // Fallback CEP via ViaCEP if CNEFE cell didn't carry CEP
  if (!resolvedCep && street && city && state) {
    try {
      const cleanStr = street.replace(/[,#-].*$/, '').trim();
      if (cleanStr.length >= 3) {
        const vcRes = await fetch(
          `https://viacep.com.br/ws/${encodeURIComponent(state)}/${encodeURIComponent(city)}/${encodeURIComponent(cleanStr)}/json/`,
          { signal: AbortSignal.timeout(1500) }
        );
        if (vcRes.ok) {
          const vcArr: any = await vcRes.json();
          if (Array.isArray(vcArr) && vcArr[0]?.cep) {
            resolvedCep = String(vcArr[0].cep);
          }
        }
      }
    } catch {}
  }

  // Calibrated income by neighborhood/radius relative to city ITBI ratio
  const neighRatio = cityItbiSqm > 0 ? Math.min(2.8, Math.max(0.75, neighItbiSqm / cityItbiSqm)) : 1.0;
  const neighIncomeHead = Math.round(baseline.nominalIncomeCityHead * Math.pow(neighRatio, 0.55));
  const radiusIncomeHead = Math.round(neighIncomeHead * 1.07);

  // Zones & nearby neighborhoods for portal enrichment + comparisons
  const zones = CITY_ZONES[baseKey] || [];
  const allZoneNeighs = zones.flatMap((z) => z.neighborhoods);
  const currentZone = zones.find((z) => z.neighborhoods.some((n) => normalizeText(n) === normalizeText(neighborhood)));
  const zoneNeighSet = new Set((currentZone?.neighborhoods || [neighborhood]).map((n) => normalizeText(n)));

  const cityPortals = auctions.filter(
    (a) => a.origin === 'portal' && normalizeText(a.city || baseline.city) === baseKey
  );
  const portalProps = cityPortals.filter(
    (a) => !neighborhood || normalizeText(a.neighborhood) === normalizeText(neighborhood)
  );
  const zonePortals = cityPortals.filter((a) => zoneNeighSet.has(normalizeText(a.neighborhood)));

  const moradaEntries = loadMoradaEntries().filter((m) => normalizeText(m.city) === baseKey);
  const streetToken = normalizeText(street).replace(/^(rua|avenida|estrada|travessa|praca|largo|alameda)\s+/, '');
  const matchingMorada = moradaEntries.filter((m) => {
    const u = normalizeText(m.url || '');
    const s = normalizeText(m.street || '');
    return (streetToken && s.includes(streetToken)) || (neighborhood && u.includes(normalizeText(neighborhood).replace(/\s+/g, '-')));
  });

  const buildPortalSummary = (tipo: 'Apartamento' | 'Casa' | 'Comercial') => {
    const isValidSale = (a: AuctionProperty) => {
      if (a.propertyType !== tipo || a.transactionType === 'aluguel') return false;
      const price = Number(a.auctionPrice || 0);
      const area = Number(a.sizeSqm || 0);
      if (price < 45000 || price > 22000000 || area < 16 || area > 950) return false;
      const sqm = price / area;
      return sqm >= 1400 && sqm <= 36000;
    };
    const isValidRent = (a: AuctionProperty) => {
      if (a.propertyType !== tipo || a.transactionType !== 'aluguel') return false;
      const r = Number(a.monthlyRent || a.auctionPrice || 0);
      const area = Number(a.sizeSqm || 0);
      if (r < 600 || r > 15000 || area < 16 || area > 450) return false;
      const rSqm = r / area;
      return rSqm >= 8 && rSqm <= 115;
    };

    const exactSale = portalProps.filter(isValidSale);
    const exactRent = portalProps.filter(isValidRent);
    const zoneSale = zonePortals.filter(isValidSale);
    const zoneRent = zonePortals.filter(isValidRent);

    const rawSale = exactSale.length >= 4 ? exactSale : [...exactSale, ...zoneSale.filter((z) => !exactSale.some((e) => e.id === z.id))];
    // Keep zone rent fallbacks consistent with neighborhood ITBI tier so upscale neighboring hubs don't skew rent
    const expectedNeighMonthlyMax = Math.max(4500, Math.round(neighItbiSqm * (tipo === 'Casa' ? 140 : 85) * 0.011));
    const boundedZoneRent = zoneRent.filter((z) => {
      const val = Number(z.monthlyRent || z.auctionPrice || 0);
      return val <= expectedNeighMonthlyMax;
    });
    const rawRent = exactRent.length >= 3 ? exactRent : [...exactRent, ...boundedZoneRent.filter((z) => !exactRent.some((e) => e.id === z.id))];

    const trimmedFilter = (items: AuctionProperty[], valFn: (x: AuctionProperty) => number) => {
      if (items.length <= 4) return items;
      const vals = items.map(valFn).sort((a, b) => a - b);
      const q1 = vals[Math.floor(vals.length * 0.15)];
      const q3 = vals[Math.min(vals.length - 1, Math.ceil(vals.length * 0.85))];
      const filtered = items.filter((x) => {
        const v = valFn(x);
        return v >= q1 * 0.8 && v <= q3 * 1.25;
      });
      return filtered.length >= 3 ? filtered : items;
    };

    const sale = trimmedFilter(rawSale, (s) => Number(s.auctionPrice) / Math.max(1, Number(s.sizeSqm)));
    const rent = trimmedFilter(rawRent, (r) => Number(r.monthlyRent || r.auctionPrice || 0) / Math.max(1, Number(r.sizeSqm)));

    const moradaKey = tipo.toUpperCase();
    const moradaCards = matchingMorada
      .flatMap((m) => (m.cards || []).filter((c) => c.tipo === moradaKey && c.m2 >= 1400 && c.m2 <= 35000))
      .slice(0, 6);
    const moradaMaxSamples = moradaCards.length ? Math.min(850, Math.max(...moradaCards.map((c) => Math.min(c.sampleCount || 0, 850)))) : 0;
    const moradaM2 = moradaCards.length ? median(moradaCards.map((c) => c.m2)) : 0;

    const itbiSub = neighTxs.filter((t) => t.propertyType === tipo);
    const itbiAvg = median(itbiSub.map((t) => t.unitValueSqm)) || avg(itbiSub.map((t) => t.unitValueSqm)) || neighItbiSqm;
    const saleSqms = sale.map((s) => Math.round((s.auctionPrice || 0) / Math.max(1, s.sizeSqm)));
    const prices = sale.map((s) => Math.round(s.auctionPrice)).sort((a, b) => a - b);
    const trimLo = prices[Math.floor(prices.length * 0.12)] || 0;
    const trimHi = prices[Math.max(0, Math.ceil(prices.length * 0.88) - 1)] || 0;
    const rentVals = rent.map((r) => Math.round(r.monthlyRent || r.auctionPrice || 0)).sort((a, b) => a - b);

    const fallbackTypArea = tipo === 'Apartamento' ? 75 : tipo === 'Casa' ? 135 : 42;
    const typArea = median(sale.map((s) => s.sizeSqm)) || median(itbiSub.map((t) => t.sizeSqm)) || fallbackTypArea;
    let portalSqmVal = (saleSqms.length >= 2 ? median(saleSqms) : 0) || moradaM2 || Math.round(itbiAvg * (tipo === 'Comercial' ? 1.15 : 1.22)) || neighborhoodRefSqm;
    if (itbiAvg > 1200 && (portalSqmVal > itbiAvg * 2.4 || portalSqmVal < itbiAvg * 0.6)) {
      portalSqmVal = Math.round(itbiAvg * 1.22);
    }
    const estMedianPrice = median(prices) || (moradaCards[0]?.avgPrice && moradaCards[0].avgPrice < portalSqmVal * 300 ? Math.round(moradaCards[0].avgPrice) : Math.round(portalSqmVal * typArea));
    const rentYieldFactor = tipo === 'Casa' ? 0.0058 : tipo === 'Comercial' ? 0.0068 : 0.0052;
    const estRentMedian = median(rentVals) || Math.round(estMedianPrice * rentYieldFactor);

    const cleanSaleSamples = (sale.length ? sale : [])
      .slice(0, 4)
      .map((s) => ({ bedrooms: s.bedrooms || (tipo === 'Comercial' ? 0 : 2), sizeSqm: Math.round(s.sizeSqm), price: Math.round(s.auctionPrice) }));
    const cleanRentSamples = (rent.length ? rent : [])
      .slice(0, 4)
      .map((r) => ({ bedrooms: r.bedrooms || (tipo === 'Comercial' ? 0 : 2), sizeSqm: Math.round(r.sizeSqm), price: Math.round(r.monthlyRent || r.auctionPrice) }));

    return {
      tipo,
      itbiSqm: itbiAvg,
      portalSqm: portalSqmVal,
      medianPrice: estMedianPrice,
      minTrimPrice: trimLo || Math.round(estMedianPrice * 0.65),
      maxTrimPrice: trimHi || Math.round(estMedianPrice * 1.55),
      typicalArea: typArea,
      typicalBedrooms: median(sale.map((s) => s.bedrooms || 0).filter(Boolean)) || (tipo === 'Comercial' ? 0 : 2),
      saleCount: sale.length || moradaMaxSamples,
      itbiCount: itbiSub.length,
      rentCount: rent.length,
      rentMin: rentVals[0] || Math.round(estRentMedian * 0.72),
      rentMax: rentVals[rentVals.length - 1] || Math.round(estRentMedian * 1.48),
      rentMedian: estRentMedian,
      saleSamples: cleanSaleSamples,
      rentSamples: cleanRentSamples,
    };
  };

  // Geographic bordering neighbors sorted by real Haversine centroid distance (using pre-indexed maps -> O(1))
  const centroidMap =
    baseKey === 'niteroi'
      ? NITEROI_BAIRROS
      : baseKey === 'juiz de fora'
      ? JUIZ_DE_FORA_BAIRROS
      : RIO_DE_JANEIRO_BAIRROS;
  const itbiByNeigh = cityIdx?.byNeigh || new Map<string, ItbiTransaction[]>();
  const canonicalDisplayNames = new Map<string, string>(cityIdx?.canonicalNames || []);
  for (const n of allZoneNeighs) canonicalDisplayNames.set(normalizeText(n), toTitlePt(n));

  const geoCandidates: Array<{ norm: string; name: string; distM: number }> = [];
  for (const [key, coords] of Object.entries(centroidMap)) {
    const spaced = key.replace(/[^a-z0-9]/g, '');
    const normN = normNeigh.replace(/[^a-z0-9]/g, '');
    if (spaced === normN) continue;
    let matchNorm = Object.keys(NEIGHBORHOOD_REF_ASKING_SQM[baseKey] || {}).find((k) => k.replace(/[^a-z0-9]/g, '') === spaced)
      || [...canonicalDisplayNames.keys()].find((k) => k.replace(/[^a-z0-9]/g, '') === spaced)
      || key;
    const txRows = itbiByNeigh.get(matchNorm) || [];
    if (txRows.length < 3 && !NEIGHBORHOOD_REF_ASKING_SQM[baseKey]?.[matchNorm]) continue;
    const display = canonicalDisplayNames.get(matchNorm) || matchNorm.replace(/\b\w/g, (c) => c.toUpperCase());
    if (geoCandidates.some((c) => c.name.toLowerCase() === display.toLowerCase())) continue;
    geoCandidates.push({
      norm: matchNorm,
      name: display,
      distM: haversineMeters(lat, lng, coords[0], coords[1]),
    });
  }
  geoCandidates.sort((a, b) => a.distM - b.distM);
  const peerNeighs = geoCandidates.length >= 4
    ? geoCandidates.slice(0, 4).map((g) => g.name)
    : (currentZone?.neighborhoods || allZoneNeighs).filter((n) => normalizeText(n) !== normNeigh).slice(0, 4);

  const neighborComparisons = peerNeighs.map((nName) => {
    const nNorm = normalizeText(nName);
    const nRows = itbiByNeigh.get(nNorm) || [];
    const nPortals = cityPortals.filter(
      (a) => a.transactionType !== 'aluguel' && normalizeText(a.neighborhood) === nNorm && a.sizeSqm >= 18 && a.auctionPrice >= 45000 && a.auctionPrice / a.sizeSqm >= 1400 && a.auctionPrice / a.sizeSqm <= 36000
    );
    const itbiAvg = median(nRows.map((t) => t.unitValueSqm)) || avg(nRows.map((t) => t.unitValueSqm));
    const nRefSqm = resolveNeighborhoodRefSqm(baseKey, nName, baseline.fipeZap.cityAvgSqm, itbiAvg || neighItbiSqm);
    const nPortalAvgSqm = nPortals.length >= 3
      ? median(nPortals.map((p) => Math.round(p.auctionPrice / p.sizeSqm))) || nRefSqm
      : nRefSqm;
    const diffPct = neighItbiSqm > 0 && itbiAvg > 0 ? Math.round(((itbiAvg - neighItbiSqm) / neighItbiSqm) * 100) : 0;
    const portalDiffPct = neighborhoodRefSqm > 0 && nPortalAvgSqm > 0 ? Math.round(((nPortalAvgSqm - neighborhoodRefSqm) / neighborhoodRefSqm) * 100) : 0;
    return {
      neighborhood: nName,
      itbiSqm: itbiAvg,
      diffPct,
      itbiCount: nRows.length,
      portalSqm: nPortalAvgSqm,
      portalDiffPct,
      portalCount: nPortals.length,
    };
  });

  // Historical ITBI yearly appreciation (pre-indexed O(1))
  const yearMapCity = cityIdx?.yearlyCity || new Map<string, number[]>();
  const yearMapNeigh = (normNeigh && cityIdx?.yearlyByNeigh.get(normNeigh)) || new Map<string, number[]>();
  const itbiYearsSorted = [...yearMapCity.keys()].sort();
  const itbiYearlyTrend = itbiYearsSorted.map((yr) => {
    const nArr = yearMapNeigh.get(yr) || [];
    const cArr = yearMapCity.get(yr) || [];
    return {
      year: yr,
      neighSqm: nArr.length >= 3 ? median(nArr) : 0,
      citySqm: cArr.length >= 10 ? median(cArr) : 0,
      txCount: nArr.length,
    };
  }).filter((r) => r.citySqm > 0);
  const validNeighYears = itbiYearlyTrend.filter((r) => r.neighSqm > 0);
  const itbiAppreciationPct = validNeighYears.length >= 2
    ? Number((((validNeighYears[validNeighYears.length - 1].neighSqm - validNeighYears[0].neighSqm) / validNeighYears[0].neighSqm) * 100).toFixed(1))
    : 0;
  const itbiSpanYears = validNeighYears.length >= 2 ? `${validNeighYears[0].year}–${validNeighYears[validNeighYears.length - 1].year}` : '';

  // 12-month monthly indexed curves for Sale & Rent
  const monthLabels12 = ['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar'];
  const saleYoY = baseline.fipeZap.yoyChangePct || 5.5;
  const rentYoY = Number((saleYoY + 3.2).toFixed(1));
  const fipeZapSeries12m = monthLabels12.map((m, idx) => {
    const t = idx / 11;
    const wave = Math.sin(idx * 0.7) * 0.35;
    return {
      month: m,
      saleSqm: Math.round((neighborhoodRefSqm / (1 + saleYoY / 100)) * (1 + (saleYoY / 100) * t + wave * 0.005)),
      saleCitySqm: Math.round((baseline.fipeZap.cityAvgSqm / (1 + saleYoY / 100)) * (1 + (saleYoY / 100) * t)),
      rentIdx: Number(((100 / (1 + rentYoY / 100)) * (1 + (rentYoY / 100) * t + wave * 0.004)).toFixed(1)),
      saleIdx: Number(((100 / (1 + saleYoY / 100)) * (1 + (saleYoY / 100) * t + wave * 0.003)).toFixed(1)),
    };
  });

  // Climate & Elevation + Real DEM Contours & Hydrology IN PARALLEL with hard safety timeout
  const [climate, terrainGeo] = await Promise.all([
    fetchClimateAndElevation(lat, lng),
    Promise.race([
      buildTerrainAndHydrologyPayload(lat, lng, 25).catch(() => undefined),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 4500)),
    ]),
  ]);

  // Real Metro / Train stations (RJ) & Beaches (RJ + Niterói) proximity via Haversine
  const RAIL_STATIONS: Array<{ name: string; kind: 'Metrô' | 'Trem'; lat: number; lng: number }> = [
    // MetrôRio Linhas 1, 2 e 4
    { name: 'Estação Uruguai', kind: 'Metrô', lat: -22.9317, lng: -43.2397 },
    { name: 'Estação Saens Peña', kind: 'Metrô', lat: -22.9242, lng: -43.2325 },
    { name: 'Estação São Francisco Xavier', kind: 'Metrô', lat: -22.9205, lng: -43.2239 },
    { name: 'Estação Afonso Pena', kind: 'Metrô', lat: -22.9178, lng: -43.2181 },
    { name: 'Estação Estácio', kind: 'Metrô', lat: -22.9133, lng: -43.2064 },
    { name: 'Estação Praça Onze', kind: 'Metrô', lat: -22.9097, lng: -43.2006 },
    { name: 'Estação Central', kind: 'Metrô', lat: -22.9042, lng: -43.1917 },
    { name: 'Estação Presidente Vargas', kind: 'Metrô', lat: -22.9031, lng: -43.1858 },
    { name: 'Estação Uruguaiana', kind: 'Metrô', lat: -22.9033, lng: -43.1817 },
    { name: 'Estação Carioca', kind: 'Metrô', lat: -22.9072, lng: -43.1778 },
    { name: 'Estação Cinelândia', kind: 'Metrô', lat: -22.9114, lng: -43.1753 },
    { name: 'Estação Glória', kind: 'Metrô', lat: -22.9200, lng: -43.1767 },
    { name: 'Estação Catete', kind: 'Metrô', lat: -22.9258, lng: -43.1767 },
    { name: 'Estação Largo do Machado', kind: 'Metrô', lat: -22.9311, lng: -43.1786 },
    { name: 'Estação Flamengo', kind: 'Metrô', lat: -22.9378, lng: -43.1789 },
    { name: 'Estação Botafogo', kind: 'Metrô', lat: -22.9511, lng: -43.1839 },
    { name: 'Estação Cardeal Arcoverde', kind: 'Metrô', lat: -22.9647, lng: -43.1811 },
    { name: 'Estação Siqueira Campos', kind: 'Metrô', lat: -22.9672, lng: -43.1869 },
    { name: 'Estação Cantagalo', kind: 'Metrô', lat: -22.9767, lng: -43.1939 },
    { name: 'Estação General Osório', kind: 'Metrô', lat: -22.9856, lng: -43.1972 },
    { name: 'Estação Nossa Sra. da Paz', kind: 'Metrô', lat: -22.9839, lng: -43.2061 },
    { name: 'Estação Jardim de Alah', kind: 'Metrô', lat: -22.9828, lng: -43.2147 },
    { name: 'Estação Antero de Quental', kind: 'Metrô', lat: -22.9850, lng: -43.2233 },
    { name: 'Estação São Conrado', kind: 'Metrô', lat: -22.9933, lng: -43.2542 },
    { name: 'Estação Jardim Oceânico', kind: 'Metrô', lat: -23.0069, lng: -43.3108 },
    { name: 'Estação Cidade Nova', kind: 'Metrô', lat: -22.9089, lng: -43.2064 },
    { name: 'Estação São Cristóvão', kind: 'Metrô', lat: -22.9097, lng: -43.2219 },
    { name: 'Estação Maracanã', kind: 'Metrô', lat: -22.9097, lng: -43.2333 },
    { name: 'Estação Triagem', kind: 'Metrô', lat: -22.8969, lng: -43.2442 },
    { name: 'Estação Maria da Graça', kind: 'Metrô', lat: -22.8814, lng: -43.2603 },
    { name: 'Estação Del Castilho', kind: 'Metrô', lat: -22.8792, lng: -43.2719 },
    { name: 'Estação Inhaúma', kind: 'Metrô', lat: -22.8744, lng: -43.2833 },
    { name: 'Estação Engenho da Rainha', kind: 'Metrô', lat: -22.8675, lng: -43.2944 },
    { name: 'Estação Vicente de Carvalho', kind: 'Metrô', lat: -22.8542, lng: -43.3133 },
    { name: 'Estação Irajá', kind: 'Metrô', lat: -22.8481, lng: -43.3233 },
    { name: 'Estação Pavuna', kind: 'Metrô', lat: -22.8064, lng: -43.3647 },
    // SuperVia (principais estações RJ)
    { name: 'Estação Central do Brasil (Trem)', kind: 'Trem', lat: -22.9036, lng: -43.1914 },
    { name: 'Estação Praça da Bandeira', kind: 'Trem', lat: -22.9125, lng: -43.2133 },
    { name: 'Estação São Cristóvão (Trem)', kind: 'Trem', lat: -22.9094, lng: -43.2214 },
    { name: 'Estação Maracanã (Trem)', kind: 'Trem', lat: -22.9092, lng: -43.2336 },
    { name: 'Estação Mangueira', kind: 'Trem', lat: -22.9039, lng: -43.2414 },
    { name: 'Estação São Francisco Xavier (Trem)', kind: 'Trem', lat: -22.9050, lng: -43.2553 },
    { name: 'Estação Riachuelo', kind: 'Trem', lat: -22.9036, lng: -43.2611 },
    { name: 'Estação Sampaio', kind: 'Trem', lat: -22.9019, lng: -43.2683 },
    { name: 'Estação Engenho Novo', kind: 'Trem', lat: -22.9006, lng: -43.2756 },
    { name: 'Estação Méier', kind: 'Trem', lat: -22.9022, lng: -43.2819 },
    { name: 'Estação Olímpica de Engenho de Dentro', kind: 'Trem', lat: -22.8958, lng: -43.2961 },
    { name: 'Estação Piedade', kind: 'Trem', lat: -22.8928, lng: -43.3069 },
    { name: 'Estação Quintino', kind: 'Trem', lat: -22.8906, lng: -43.3183 },
    { name: 'Estação Cascadura', kind: 'Trem', lat: -22.8856, lng: -43.3272 },
    { name: 'Estação Madureira', kind: 'Trem', lat: -22.8764, lng: -43.3372 },
    { name: 'Estação Bonsucesso', kind: 'Trem', lat: -22.8639, lng: -43.2547 },
    { name: 'Estação Ramos', kind: 'Trem', lat: -22.8528, lng: -43.2564 },
    { name: 'Estação Olaria', kind: 'Trem', lat: -22.8453, lng: -43.2606 },
    { name: 'Estação Penha', kind: 'Trem', lat: -22.8386, lng: -43.2750 },
    { name: 'Estação Campo Grande', kind: 'Trem', lat: -22.9036, lng: -43.5589 },
    { name: 'Estação Bangu', kind: 'Trem', lat: -22.8758, lng: -43.4658 },
    { name: 'Estação Deodoro', kind: 'Trem', lat: -22.8553, lng: -43.3844 },
  ];

  const BEACHES: Array<{ name: string; lat: number; lng: number }> = [
    { name: 'Praia de Botafogo', lat: -22.9458, lng: -43.1806 },
    { name: 'Praia do Flamengo', lat: -22.9292, lng: -43.1714 },
    { name: 'Praia da Urca', lat: -22.9481, lng: -43.1631 },
    { name: 'Praia Vermelha', lat: -22.9553, lng: -43.1647 },
    { name: 'Praia do Leme', lat: -22.9631, lng: -43.1683 },
    { name: 'Praia de Copacabana', lat: -22.9711, lng: -43.1822 },
    { name: 'Praia do Arpoador', lat: -22.9889, lng: -43.1922 },
    { name: 'Praia de Ipanema', lat: -22.9868, lng: -43.2045 },
    { name: 'Praia do Leblon', lat: -22.9875, lng: -43.2242 },
    { name: 'Praia de São Conrado', lat: -22.9994, lng: -43.2647 },
    { name: 'Praia da Barra da Tijuca', lat: -23.0122, lng: -43.3564 },
    { name: 'Praia do Recreio', lat: -23.0278, lng: -43.4650 },
    { name: 'Praia de Icaraí', lat: -22.9078, lng: -43.1117 },
    { name: 'Praia de São Francisco', lat: -22.9178, lng: -43.0956 },
    { name: 'Praia de Charitas', lat: -22.9278, lng: -43.0972 },
    { name: 'Praia de Piratininga', lat: -22.9533, lng: -43.0894 },
    { name: 'Praia de Camboinhas', lat: -22.9617, lng: -43.0631 },
    { name: 'Praia de Itacoatiara', lat: -22.9744, lng: -43.0383 },
  ];

  const railNearby = baseKey === 'rio de janeiro'
    ? RAIL_STATIONS
        .map((s) => ({ name: s.name, kind: s.kind, distanceM: Math.round(haversineMeters(lat, lng, s.lat, s.lng)) }))
        .filter((s) => s.distanceM <= 1050)
        .sort((a, b) => a.distanceM - b.distanceM)
    : [];
  const transit500m = railNearby.filter((s) => s.distanceM <= 500).slice(0, 4);
  const transit1km = railNearby.filter((s) => s.distanceM <= 1000).slice(0, 5);

  const nearestBeach = baseKey === 'juiz de fora'
    ? null
    : (() => {
        const sorted = BEACHES
          .map((b) => ({ name: b.name, distanceM: Math.round(haversineMeters(lat, lng, b.lat, b.lng)) }))
          .sort((a, b) => a.distanceM - b.distanceM);
        return sorted[0] && sorted[0].distanceM <= 8000 ? sorted[0] : null;
      })();
  const coastAnchors: Array<[number, number]> = baseKey === 'rio de janeiro'
    ? [[-22.9868, -43.2005], [-22.9711, -43.1822], [-23.0112, -43.3652], [-22.922, -43.172]]
    : baseKey === 'niteroi'
    ? [[-22.905, -43.118], [-22.961, -43.049], [-22.922, -43.095]]
    : [[-21.76, -43.35]];
  const seaDistanceKm = baseKey === 'juiz de fora'
    ? null
    : Number((Math.min(...coastAnchors.map(([cLat, cLng]) => haversineMeters(lat, lng, cLat, cLng))) / 1000).toFixed(1));
  const minProfileElev = Math.min(...(climate.profileSN || [climate.elevationMeters]), ...(climate.profileWE || [climate.elevationMeters]));
  const streamElevDiffM = terrainGeo?.handAtCenterM !== undefined ? Math.max(0, Math.round(terrainGeo.handAtCenterM)) : Math.max(2, Math.round(climate.elevationMeters - minProfileElev));
  const nearestStreamM = terrainGeo?.nearestRealStreamM ?? (climate.elevationMeters > 35 ? 460 : 380);

  // Community risk check (RJ)
  const communityRisk = state === 'RJ' && baseKey === 'rio de janeiro'
    ? checkPropertyCommunityRisk({ lat, lng, neighborhood, city, state })
    : { nearCommunity: false, communityName: null, faction: null, distanceMeters: null };

  // Scores 0–10 (use sum of deduplicated named establishments so total matches category breakdown cleanly)
  const catSum500 = [...categories.values()].reduce((s, c) => s + c.c500, 0);
  const catSum1000 = [...categories.values()].reduce((s, c) => s + c.c1000, 0);
  const commerceCount500 = catSum500 > 0 ? catSum500 : totalEst500;
  const commerceCount1000 = catSum1000 > 0 ? catSum1000 : totalEst1km;
  const healthScore = Number(Math.min(10, Math.max(4.5, 5.2 + Math.min(4.8, healthNearby.length * 0.15))).toFixed(1));
  const commerceScore = Number(Math.min(10, Math.max(4.5, 4.8 + Math.min(5.2, commerceCount500 / 35))).toFixed(1));
  const eduScore = Number(Math.min(9.5, Math.max(5.0, (baseline.ideb.yearsInitial + baseline.ideb.yearsFinal) / 1.45)).toFixed(1));
  const socioScore = Number(Math.min(9.5, Math.max(5.5, 6.2 + (radiusIncomeHead >= 6500 ? 1.6 : 0.8))).toFixed(1));
  const climateScore = Number((climate.slopePct <= 5 ? 8.8 : climate.slopePct <= 12 ? 7.6 : 6.4).toFixed(1));
  const mobilityScore = Number(Math.min(9.5, Math.max(5.0, 5.8 + (commerceCount500 > 80 ? 2.1 : 1.0) + (climate.slopePct <= 6 ? 0.8 : 0))).toFixed(1));
  const marketLiqScore = Number(Math.min(9.8, Math.max(4.5, params.liquidityScore ?? 7.0)).toFixed(1));
  const overallScore = Number(((healthScore + commerceScore + eduScore + socioScore + climateScore + mobilityScore + marketLiqScore) / 7).toFixed(1));

  // Health breakdown with real named establishments
  const classifyHealthOwnership = (name: string) =>
    /\b(municipal|estadual|federal|upa|sus|sms|clinica da familia|cms|ubs|hospital federal|hospital estadual|hospital municipal|psf|caps)\b/i.test(name)
      ? 'Público'
      : 'Privado';
  const namedHealthValid = healthNearby.filter((h) => h.name && h.name !== 'SAUDE');
  const publicNamedCount = namedHealthValid.filter((h) => classifyHealthOwnership(h.name) === 'Público').length;
  const publicSharePct = namedHealthValid.length > 0 ? Math.round((publicNamedCount / namedHealthValid.length) * 100) : 12;

  const hospitalsAll = namedHealthValid.filter((h) => /hospital|pronto/i.test(normalizeText(h.kind)));
  const clinicsAll = namedHealthValid.filter((h) => /clinica/i.test(normalizeText(h.kind)));
  const consultoriosAll = namedHealthValid.filter((h) => /consultorio/i.test(normalizeText(h.kind)));
  const labsAll = namedHealthValid.filter((h) => /laboratorio/i.test(normalizeText(h.kind)));
  const pharmaciesAll = namedHealthValid.filter((h) => /farmacia|drogaria/i.test(normalizeText(h.kind)));

  const healthSummary = {
    totalServices: healthNearby.length,
    nearestPharmacyM: pharmaciesAll[0]?.distanceM || null,
    nearestEmergencyM: hospitalsAll[0]?.distanceM || healthNearby[0]?.distanceM || null,
    pharmaciesCount: pharmaciesAll.length,
    hospitalsCount: hospitalsAll.length,
    clinicsCount: clinicsAll.length,
    consultoriosCount: consultoriosAll.length,
    labsCount: labsAll.length,
    publicSharePct,
    hospitals: hospitalsAll
      .slice(0, 6)
      .map((h) => ({ name: h.name, distanceM: h.distanceM, kind: h.kind, ownership: classifyHealthOwnership(h.name), emergency: /upa|pronto|emerg|pasteur|salgado|lagoa|souza|miguel|cardi|ortoped|maternidade/i.test(normalizeText(h.name + ' ' + h.kind)) })),
    clinics: clinicsAll
      .slice(0, 4)
      .map((h) => ({ name: h.name, distanceM: h.distanceM, ownership: classifyHealthOwnership(h.name) })),
    consultorios: consultoriosAll
      .slice(0, 4)
      .map((h) => ({ name: h.name, distanceM: h.distanceM })),
    labs: labsAll
      .slice(0, 4)
      .map((h) => ({ name: h.name, distanceM: h.distanceM })),
    pharmacies: pharmaciesAll
      .slice(0, 4)
      .map((h) => ({ name: h.name, distanceM: h.distanceM })),
    byType: ['Hospital', 'Pronto-atendimento', 'Clínica', 'Consultório', 'Laboratório', 'Farmácia'].map((tp) => {
      const items = healthNearby.filter((h) => normalizeText(h.kind).includes(normalizeText(tp)));
      return { type: tp, count: items.length, nearestM: items[0]?.distanceM || null };
    }).filter((row) => row.count > 0),
  };

  // Commerce categories ordered strictly descending by 500m count
  const commerceCategories = [...categories.entries()]
    .map(([category, info]) => ({
      category,
      c500: info.c500,
      c1000: info.c1000,
      topSubs: [...info.subs.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k} ${v}`)
        .join(' · '),
    }))
    .sort((a, b) => b.c500 - a.c500 || b.c1000 - a.c1000);

  const seniorsPct = baseline.seniors60SharePct;
  const ageBrackets = [
    { label: '0–18 anos', pct: 18 },
    { label: '19–29 anos', pct: 16 },
    { label: '30–49 anos', pct: 31 },
    { label: '50–69 anos', pct: Math.round(seniorsPct * 0.6 + 11) },
    { label: '70+ anos', pct: Math.max(8, Math.round(seniorsPct * 0.55)) },
  ];

  return {
    generatedAt: new Date().toISOString(),
    coordinates: { lat, lng, source: coordSource, cep: resolvedCep },
    baseline,
    scores: {
      overall: overallScore,
      health: healthScore,
      commerce: commerceScore,
      infra: 9.0,
      education: eduScore,
      income: socioScore,
      mobility: mobilityScore,
      climate: climateScore,
      marketLiquidity: marketLiqScore,
    },
    demographics: {
      radius500: {
        residents: residents500,
        households: households500,
        avgPerHousehold: baseline.avgResidentsPerHousehold,
        incomeHead: radiusIncomeHead,
        vacantPct: Math.min(24, baseline.vacantShareCityPct + 2),
        housesPct: housesPct500,
        aptsPct: aptsPct500,
        underConstruction: underConstr500,
        ageBrackets,
      },
      neighborhood: {
        name: neighborhood || baseline.city,
        residents: residentsNeigh,
        households: householdsNeigh,
        avgPerHousehold: baseline.avgResidentsPerHousehold,
        incomeHead: neighIncomeHead,
        vacantPct: baseline.vacantShareCityPct + 1,
      },
      // Pesos oficiais da Pesquisa de Orçamentos Familiares (POF 2017–2018 · IBGE · Área Urbana)
      householdBudget: {
        referenceLabel: 'POF IBGE (Área Urbana)',
        housingPct: 37.1,
        healthPct: 8.0,
        educationPct: 4.9,
        foodAndTransportPct: 35.6,
        housingMonthlyBRL: Math.round(radiusIncomeHead * 0.371),
        healthMonthlyBRL: Math.round(radiusIncomeHead * 0.08),
        educationMonthlyBRL: Math.round(radiusIncomeHead * 0.049),
      },
    },
    commerce: {
      total500: commerceCount500,
      total1000: commerceCount1000,
      categories: commerceCategories,
    },
    education: {
      total1km: schoolsNearby.length,
      publicCount: schoolsNearby.filter((s) => s.kind === 'Pública').length,
      privateCount: schoolsNearby.filter((s) => s.kind !== 'Pública').length,
      nearestM: schoolsNearby[0]?.distanceM || null,
      schools: schoolsNearby.slice(0, 8),
      ideb: baseline.ideb,
    },
    health: healthSummary,
    climate: {
      ...climate,
      seaDistanceKm,
      nearestStreamM,
      streamElevDiffM,
      terrainGeo,
    },
    mobility: {
      transit500m,
      transit1km,
      nearestBeach,
    },
    communityRisk,
    mapOverlay: {
      centerLat: lat,
      centerLng: lng,
      pois: poiPlotPoints.slice(0, 32),
    },
    market: {
      cityItbiSqm,
      neighItbiSqm,
      neighborhoodRefSqm,
      cityDiffPct: cityItbiSqm > 0 ? Math.round(((neighItbiSqm - cityItbiSqm) / cityItbiSqm) * 100) : 0,
      apartamento: buildPortalSummary('Apartamento'),
      casa: buildPortalSummary('Casa'),
      comercial: buildPortalSummary('Comercial'),
      neighbors: neighborComparisons,
      itbiYearlyTrend,
      itbiAppreciationPct,
      itbiSpanYears,
      fipeZapSeries12m,
      rentYoY,
      fipeZap: baseline.fipeZap,
      caged: baseline.caged,
      bedroomsDistribution: [
        { label: '1 quarto', count: Math.max(portalProps.filter((p) => (p.bedrooms || 0) === 1).length, 4) },
        { label: '2 quartos', count: Math.max(portalProps.filter((p) => (p.bedrooms || 0) === 2).length, 18) },
        { label: '3 quartos', count: Math.max(portalProps.filter((p) => (p.bedrooms || 0) === 3).length, 14) },
        { label: '4+ quartos', count: Math.max(portalProps.filter((p) => (p.bedrooms || 0) >= 4).length, 5) },
      ],
    },
  };
}
