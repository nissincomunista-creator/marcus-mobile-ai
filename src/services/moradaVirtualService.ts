import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

export interface MoradaVirtualCard {
  tipo: 'APARTAMENTO' | 'CASA' | 'COMERCIAL' | string;
  m2: number;
  sampleCount: number;
  avgPrice: number;
  rawMeta?: string;
}

export interface MoradaVirtualStreetData {
  street: string;
  city: string;
  state: string;
  url: string;
  canonicalTitle: string;
  leadText?: string;
  cards: MoradaVirtualCard[];
  updatedAt: string;
  notFound?: boolean;
}

export interface MoradaVirtualBenchmark {
  m2: number;
  sampleCount: number;
  avgPrice: number;
  typology: string;
  streetUrl: string;
  leadText?: string;
  dataColeta: string;
}

const CACHE_FILE = path.join(process.cwd(), 'morada_virtual_cache.json');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

let moradaCache: Record<string, MoradaVirtualStreetData> = {};
let isDirty = false;
let saveTimeout: NodeJS.Timeout | null = null;

export function loadMoradaCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      moradaCache = JSON.parse(raw);
      console.log(`[Morada Virtual] Cache carregado: ${Object.keys(moradaCache).length} vias indexadas.`);
    } else {
      moradaCache = {};
    }
  } catch (err: any) {
    console.warn(`[Morada Virtual] Erro ao carregar cache: ${err?.message}`);
    moradaCache = {};
  }
}

export function saveMoradaCacheSync(): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(moradaCache, null, 2), 'utf-8');
    isDirty = false;
  } catch (err: any) {
    console.error(`[Morada Virtual] Falha ao persistir cache: ${err?.message}`);
  }
}

export function scheduleSaveMoradaCache(): void {
  if (saveTimeout) return;
  isDirty = true;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    if (isDirty) {
      saveMoradaCacheSync();
    }
  }, 2000);
}

// Inicializa o cache imediatamente
loadMoradaCache();

export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Remove prefixos de logradouro comuns e aplica apelidos históricos conhecidos
 */
export function cleanStreetName(rawStreet: string): string {
  if (!rawStreet) return '';
  let s = rawStreet.trim();

  // Remove complementos como número, bloco, apto
  s = s.replace(/,.*$/, '').trim();

  // Remove prefixos formais
  s = s.replace(/^(rua|r\.|avenida|av\.|av|alameda|al\.|travessa|tv\.|estrada|est\.|estr\.|praça|praca|pc\.|rodovia|rod\.|largo|passarela|via|beco)\s+/i, '').trim();

  return s;
}

/**
 * Retorna apelido ou nome oficializado se a via for historicamente rebatizada
 */
function resolveStreetAliases(cleanName: string, city: string): string[] {
  const normC = normalizeText(city);
  const normS = normalizeText(cleanName);
  const aliases: string[] = [cleanName];

  // Niterói: Moreira César foi oficialmente rebatizada para Ator Paulo Gustavo
  if (normC.includes('niteroi')) {
    if (normS.includes('moreira cesar') || normS.includes('coronel moreira cesar')) {
      aliases.unshift('Ator Paulo Gustavo');
    }
  }

  // Rio de Janeiro
  if (normC.includes('rio de janeiro')) {
    if (normS === 'adhemar bebiano' || normS === 'ademar bebiano') {
      aliases.unshift('Estrada Adhemar Bebiano');
    }
    if (normS === 'tres rios' || normS === '3 rios') {
      aliases.unshift('Estrada dos Tres Rios');
    }
  }

  // Juiz de Fora
  if (normC.includes('juiz de fora')) {
    if (normS === 'rio branco') {
      aliases.unshift('Avenida Barao do Rio Branco');
    }
    if (normS === 'halfeld') {
      aliases.unshift('Rua Halfeld');
    }
  }

  return Array.from(new Set(aliases));
}

export function getMoradaCacheKey(street: string, city: string, state: string): string {
  const normS = normalizeText(cleanStreetName(street));
  const normC = normalizeText(city || '');
  const normUf = normalizeText(state || '').substring(0, 2);
  return `${normUf}_${normC}_${normS}`;
}

interface MoradaSearchResultItem {
  tipo: string;
  texto: string;
  url: string;
}

/**
 * Realiza a busca na API do Morada Virtual com tolerância e pontuação inteligente
 */
async function searchMoradaVirtual(street: string, city: string, state: string): Promise<MoradaSearchResultItem | null> {
  const cleanBase = cleanStreetName(street);
  if (!cleanBase || cleanBase.length < 2) return null;

  const candidateNames = resolveStreetAliases(cleanBase, city);
  const normCity = normalizeText(city);
  const normState = normalizeText(state);

  for (const name of candidateNames) {
    const normName = normalizeText(name);
    const queries = [
      `${name} ${city}`,
      name,
      `${street} ${city}`
    ];

    for (const q of queries) {
      try {
        const url = `https://api.moradavirtual.com.br/api/v1/busca?q=${encodeURIComponent(q)}&limite=8`;
        const resp = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT }
        });
        if (!resp.ok) continue;

        const data = await resp.json() as { resultados?: MoradaSearchResultItem[] };
        if (!data.resultados || data.resultados.length === 0) continue;

        const scored: Array<{ item: MoradaSearchResultItem; score: number }> = [];

        for (const item of data.resultados) {
          if (item.tipo !== 'logradouro') continue;
          const itemTextNorm = normalizeText(item.texto);
          const itemUrl = item.url || '';

          // Validação obrigatória da UF e Cidade
          const matchesState = itemTextNorm.includes(normState) || itemUrl.includes(`/${normState}/`);
          const matchesCity = itemTextNorm.includes(normCity) || itemUrl.includes(`/${normCity.replace(/\s+/g, '-')}/`);
          if (!matchesState || !matchesCity) continue;

          // Extrai o nome da via do item
          const itemStreetPart = normalizeText(cleanStreetName(item.texto.split(',')[0] || ''));

          let score = 0;
          if (itemStreetPart === normName) {
            score = 100;
          } else if (itemStreetPart.startsWith(normName) || normName.startsWith(itemStreetPart)) {
            score = 80;
          } else if (itemStreetPart.includes(normName) || normName.includes(itemStreetPart)) {
            score = 65;
          }

          if (score > 0) {
            scored.push({ item, score });
          }
        }

        scored.sort((a, b) => b.score - a.score);
        if (scored.length > 0 && scored[0].score >= 65) {
          return scored[0].item;
        }
      } catch (err: any) {
        // Ignora erro momentâneo de busca e tenta próxima query
      }
    }
  }

  return null;
}

/**
 * Faz o scrape da página HTML do Morada Virtual da via e extrai os cards de m²
 */
async function scrapeMoradaPage(pathUrl: string): Promise<{ cards: MoradaVirtualCard[]; leadText: string; canonicalTitle: string } | null> {
  try {
    const fullUrl = `https://moradavirtual.com.br${pathUrl}`;
    const resp = await fetch(fullUrl, {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!resp.ok) return null;

    const html = await resp.text();
    const $ = cheerio.load(html);

    const canonicalTitle = $('h1').text().trim() || '';
    const leadText = $('.mvm-lead').text().trim() || '';

    const cards: MoradaVirtualCard[] = [];
    $('.mvm-card').each((_, el) => {
      const rawTipo = $(el).find('.mvm-card-tipo').text().trim().toUpperCase();
      const rawM2 = $(el).find('.mvm-m2').text().trim();
      const rawCount = $(el).find('.mvm-card-n').text().trim();
      const rawMid = $(el).find('.mvm-faixa-mid').text().trim();
      const rawMeta = $(el).find('.mvm-card-meta').text().trim();

      // m²: "R$ 9.694 /m²" -> 9694
      const m2Match = rawM2.replace(/\./g, '').match(/(\d+)/);
      const m2 = m2Match ? parseInt(m2Match[1], 10) : 0;

      // anúncios: "1.354 anúncios" -> 1354
      const countMatch = rawCount.replace(/\./g, '').match(/(\d+)/);
      const sampleCount = countMatch ? parseInt(countMatch[1], 10) : 0;

      // preço médio: "R$ 1.167.500" -> 1167500
      const midMatch = rawMid.replace(/\./g, '').match(/(\d+)/);
      const avgPrice = midMatch ? parseInt(midMatch[1], 10) : 0;

      if (m2 > 0) {
        cards.push({
          tipo: rawTipo,
          m2,
          sampleCount,
          avgPrice,
          rawMeta
        });
      }
    });

    return { cards, leadText, canonicalTitle };
  } catch (err: any) {
    console.error(`[Morada Virtual] Falha no scrape de ${pathUrl}: ${err?.message}`);
    return null;
  }
}

/**
 * Consulta a via na internet (ou cache) e armazena os dados
 */
export async function fetchAndCacheMoradaVirtual(street: string, city: string, state: string): Promise<MoradaVirtualStreetData | null> {
  const cacheKey = getMoradaCacheKey(street, city, state);
  if (moradaCache[cacheKey]) {
    return moradaCache[cacheKey].notFound ? null : moradaCache[cacheKey];
  }

  const match = await searchMoradaVirtual(street, city, state);
  if (!match) {
    // Marca como notFound para não ficar refazendo busca inútil no loop
    moradaCache[cacheKey] = {
      street,
      city,
      state,
      url: '',
      canonicalTitle: '',
      cards: [],
      updatedAt: new Date().toISOString(),
      notFound: true
    };
    scheduleSaveMoradaCache();
    return null;
  }

  const pageData = await scrapeMoradaPage(match.url);
  if (!pageData || pageData.cards.length === 0) {
    moradaCache[cacheKey] = {
      street,
      city,
      state,
      url: match.url,
      canonicalTitle: match.texto,
      cards: [],
      updatedAt: new Date().toISOString(),
      notFound: true
    };
    scheduleSaveMoradaCache();
    return null;
  }

  const streetData: MoradaVirtualStreetData = {
    street,
    city,
    state,
    url: match.url,
    canonicalTitle: pageData.canonicalTitle || match.texto,
    leadText: pageData.leadText,
    cards: pageData.cards,
    updatedAt: new Date().toISOString()
  };

  moradaCache[cacheKey] = streetData;
  scheduleSaveMoradaCache();
  return streetData;
}

/**
 * Mapeia o tipo de imóvel do leilão para a tipologia do Morada Virtual
 */
function mapTypologyCategory(propertyType?: string): 'APARTAMENTO' | 'CASA' | 'COMERCIAL' {
  const t = normalizeText(propertyType || '');
  if (t.includes('apart') || t.includes('apto') || t.includes('cobertura') || t.includes('kitnet') || t.includes('conjugado') || t.includes('loft') || t.includes('flat')) {
    return 'APARTAMENTO';
  }
  if (t.includes('casa') || t.includes('sobrado') || t.includes('moradia') || t.includes('vila') || t.includes('chale') || t.includes('bangalo') || t.includes('condominio fechado')) {
    return 'CASA';
  }
  if (t.includes('comercial') || t.includes('sala') || t.includes('loja') || t.includes('predio') || t.includes('galpao') || t.includes('escritorio')) {
    return 'COMERCIAL';
  }
  return 'APARTAMENTO';
}

/**
 * Consulta síncrona ultra-rápida no cache de memória (0ms de latência para a rota /api/auctions)
 */
export function getMoradaVirtualBenchmark(
  street?: string,
  city?: string,
  state?: string,
  propertyType?: string
): MoradaVirtualBenchmark | null {
  if (!street || !city) return null;

  const cacheKey = getMoradaCacheKey(street, city, state || 'RJ');
  const entry = moradaCache[cacheKey];
  if (!entry || entry.notFound || !entry.cards || entry.cards.length === 0) {
    return null;
  }

  const targetCategory = mapTypologyCategory(propertyType);
  const matchedCard = entry.cards.find(c => c.tipo.includes(targetCategory)) || entry.cards[0];

  if (!matchedCard || matchedCard.m2 <= 0) return null;

  return {
    m2: matchedCard.m2,
    sampleCount: matchedCard.sampleCount,
    avgPrice: matchedCard.avgPrice,
    typology: matchedCard.tipo,
    streetUrl: `https://moradavirtual.com.br${entry.url}`,
    leadText: entry.leadText,
    dataColeta: entry.updatedAt
  };
}

/**
 * Retorna estatísticas gerais do cache
 */
export function getMoradaCacheStats(): { totalStreets: number; withCards: number; notFound: number } {
  const values = Object.values(moradaCache);
  const withCards = values.filter(v => !v.notFound && v.cards && v.cards.length > 0).length;
  const notFound = values.filter(v => v.notFound).length;
  return {
    totalStreets: values.length,
    withCards,
    notFound
  };
}

/**
 * Processador em segundo plano para pré-aquecer o cache de ruas dos lotes
 */
export async function batchEnrichAuctionsMorada(
  auctions: Array<{ address?: string; street?: string; city?: string; state?: string }>,
  options: { maxToFetch?: number; delayMs?: number } = {}
): Promise<{ checked: number; newlyFetched: number; matched: number; errors: number }> {
  const maxToFetch = options.maxToFetch ?? 150;
  const delayMs = options.delayMs ?? 400;

  // Extrai ruas únicas dos leilões que ainda não foram consultadas
  const pendingMap = new Map<string, { street: string; city: string; state: string }>();

  for (const auc of auctions) {
    const rawAddr = auc.address || auc.street;
    if (!rawAddr || !auc.city) continue;
    const cleanStreet = cleanStreetName(rawAddr);
    if (!cleanStreet || cleanStreet.length < 3) continue;

    const cacheKey = getMoradaCacheKey(cleanStreet, auc.city, auc.state || 'RJ');
    if (!moradaCache[cacheKey] && !pendingMap.has(cacheKey)) {
      pendingMap.set(cacheKey, {
        street: cleanStreet,
        city: auc.city,
        state: auc.state || 'RJ'
      });
    }
  }

  const items = Array.from(pendingMap.values()).slice(0, maxToFetch);
  console.log(`[Morada Virtual] Pré-aquecimento iniciado: ${items.length} vias pendentes de pesquisa.`);

  let newlyFetched = 0;
  let matched = 0;
  let errors = 0;

  for (const item of items) {
    try {
      const res = await fetchAndCacheMoradaVirtual(item.street, item.city, item.state);
      newlyFetched++;
      if (res && res.cards && res.cards.length > 0) {
        matched++;
      }
    } catch (e) {
      errors++;
    }

    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  saveMoradaCacheSync();
  console.log(`[Morada Virtual] Pré-aquecimento concluído: ${newlyFetched} consultadas, ${matched} com cards no ar, ${errors} erros.`);

  return {
    checked: items.length,
    newlyFetched,
    matched,
    errors
  };
}
