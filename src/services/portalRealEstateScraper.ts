import https from 'https';
import path from 'path';
import * as cheerio from 'cheerio';
import puppeteer, { Browser } from 'puppeteer';
import { launchPuppeteer } from '../utils/puppeteerConfig.ts';
import { parseRelativePublicationDate } from '../utils/publicationDateParser.ts';
import { CITY_ZONES } from '../utils/cityZones.ts';
import type { AuctionProperty, PropertyType } from '../types.ts';
import { detectTypologyFromUrlAndText } from '../utils/propertyTypes.ts';
import { RIO_DE_JANEIRO_BAIRROS } from '../utils/geoCoords.ts';

export interface ScrapedPortalListing {
  id: string;
  titulo: string;
  portal: 'Zap Imóveis' | 'Viva Real' | 'QuintoAndar' | 'Imovelweb';
  url_anuncio: string;
  imagem_url: string;
  cidade: string;
  bairro: string;
  endereco: string;
  preco_anunciado: number;
  valor_condominio: number;
  valor_iptu: number;
  area_m2: number;
  quartos: number;
  vagas: number;
  data_publicacao_iso: string;
  dias_publicado: number;
  texto_publicacao: string;
  m2_anunciado: number;
  tipo_imovel?: PropertyType;
  subtipo?: string;
  m2_referencia_bairro?: number;
  valor_mercado_estimado?: number;
  desconto_mercado_pct?: number;
  oportunidade_abaixo_mercado?: boolean;
  calculatedProfit?: number;
  calculatedRoi?: number;
  taxas_servico?: number;
  total_taxas?: number;
  total_rental_package?: number;
  transaction_type?: 'venda' | 'aluguel';
  lat?: number;
  lng?: number;
}

export function normalizeSlug(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Mapeamento de Zonas no Rio de Janeiro para o portal Zap/Viva Real
const RJ_ZONE_MAP: Record<string, string> = {
  'tijuca': 'zona-norte',
  'maracana': 'zona-norte',
  'vila isabel': 'zona-norte',
  'grajau': 'zona-norte',
  'meier': 'zona-norte',
  'andarai': 'zona-norte',
  'cachambi': 'zona-norte',
  'del castilho': 'zona-norte',
  'engenho novo': 'zona-norte',
  'riachuelo': 'zona-norte',
  'sao cristovao': 'zona-norte',
  'penha': 'zona-norte',
  'vila da penha': 'zona-norte',
  'ramos': 'zona-norte',
  'madureira': 'zona-norte',
  'ilha do governador': 'zona-norte',
  'pavuna': 'zona-norte',
  'iraja': 'zona-norte',
  'rocha miranda': 'zona-norte',
  'anchieta': 'zona-norte',
  'coelho neto': 'zona-norte',
  'guadalupe': 'zona-norte',
  'costa barros': 'zona-norte',
  'copacabana': 'zona-sul',
  'ipanema': 'zona-sul',
  'leblon': 'zona-sul',
  'botafogo': 'zona-sul',
  'flamengo': 'zona-sul',
  'laranjeiras': 'zona-sul',
  'catete': 'zona-sul',
  'gloria': 'zona-sul',
  'urca': 'zona-sul',
  'gavea': 'zona-sul',
  'jardim botanico': 'zona-sul',
  'sao conrado': 'zona-sul',
  'humaita': 'zona-sul',
  'cosme velho': 'zona-sul',
  'barra da tijuca': 'zona-oeste',
  'recreio': 'zona-oeste',
  'recreio dos bandeirantes': 'zona-oeste',
  'jacarepagua': 'zona-oeste',
  'freguesia': 'zona-oeste',
  'freguesia jacarepagua': 'zona-oeste',
  'taquara': 'zona-oeste',
  'pechincha': 'zona-oeste',
  'anil': 'zona-oeste',
  'curicica': 'zona-oeste',
  'campo grande': 'zona-oeste',
  'bangu': 'zona-oeste',
  'realengo': 'zona-oeste',
  'santa cruz': 'zona-oeste',
  'centro': 'centro',
  'lapa': 'centro',
  'santa teresa': 'centro',
  'cidade nova': 'centro',
  'estacio': 'centro'
};

function getRjZone(neighborhood: string): string {
  const norm = normalizeSlug(neighborhood).replace(/-/g, ' ');
  const rjZones = (CITY_ZONES as any)?.['rio de janeiro'] || [];
  for (const zone of rjZones) {
    if (Array.isArray(zone.neighborhoods) && zone.neighborhoods.some((n: string) => n === norm || norm.includes(n) || n.includes(norm))) {
      if (zone.name.includes('Sul')) return 'zona-sul';
      if (zone.name.includes('Norte')) return 'zona-norte';
      if (zone.name.includes('Oeste')) return 'zona-oeste';
      if (zone.name.includes('Centro')) return 'centro';
    }
  }
  return RJ_ZONE_MAP[norm] || 'zona-norte';
}

// Mapeamento abrangente de Bairros por Cidade (ordenados por comprimento decrescente para evitar falso-positivo)
function buildSortedNeighborhoods(): { byCity: Record<string, string[]>; all: string[] } {
  const byCity: Record<string, string[]> = {};
  const allSet = new Set<string>();

  for (const [cityKey, zones] of Object.entries(CITY_ZONES)) {
    const bSet = new Set<string>();
    for (const z of zones) {
      if (Array.isArray(z.neighborhoods)) {
        for (const b of z.neighborhoods) {
          const norm = b.toLowerCase().trim();
          if (norm.length >= 3) {
            bSet.add(norm);
            allSet.add(norm);
          }
        }
      }
    }
    byCity[cityKey] = Array.from(bSet).sort((a, b) => b.length - a.length);
  }

  // Complementa Rio de Janeiro com os 109 bairros oficiais de geoCoords
  const rjSet = new Set<string>([...(byCity['rio de janeiro'] || []), ...Object.keys(RIO_DE_JANEIRO_BAIRROS)]);
  byCity['rio de janeiro'] = Array.from(rjSet).sort((a, b) => b.length - a.length);
  for (const b of rjSet) allSet.add(b);

  // Garante bairros de Niterói e Juiz de Fora
  const extraNiteroi = [
    'icarai', 'santa rosa', 'inga', 'sao francisco', 'charitas', 'jurujuba', 'centro',
    'piratininga', 'camboinhas', 'itaipu', 'itacoatiara', 'fonseca', 'barreto', 'engenhoca',
    'santana', 'sao domingos', 'boa viagem', 'gragoata', 'ponta d areia', 'fatima', 'pe pequeno',
    'vital brazil', 'cubango', 'santa barbara', 'caramujo', 'baldeador', 'maria paula',
    'pendotiba', 'badu', 'matapaca', 'sape', 'largo da batalha', 'maceio', 'cafuba',
    'serra grande', 'santo antonio', 'maravista', 'engenho do mato'
  ];
  const niteroiSet = new Set<string>([...(byCity['niteroi'] || []), ...extraNiteroi]);
  byCity['niteroi'] = Array.from(niteroiSet).sort((a, b) => b.length - a.length);
  for (const b of niteroiSet) allSet.add(b);

  const extraJF = [
    'centro', 'sao mateus', 'cascatinha', 'granbery', 'bom pastor', 'alto dos passos',
    'santa helena', 'sao pedro', 'passos', 'paineiras', 'morro da gloria', 'manoel honorio',
    'bairu', 'santa luzia', 'benfica', 'santa terezinha', 'jardim gloria', 'estrela sul',
    'aeroporto', 'salvaterra', 'alphaville', 'marilandia', 'santos dumont', 'novo horizonte',
    'progresso', 'costa carvalho', 'teixeiras', 'dom bosco', 'sagrado coracao', 'fontesville',
    'francisco bernardino', 'industrial', 'santa cruz', 'sao dimas', 'poco rico', 'grama',
    'fabrica', 'borboleta'
  ];
  const jfSet = new Set<string>([...(byCity['juiz de fora'] || []), ...extraJF]);
  byCity['juiz de fora'] = Array.from(jfSet).sort((a, b) => b.length - a.length);
  for (const b of jfSet) allSet.add(b);

  return {
    byCity,
    all: Array.from(allSet).sort((a, b) => b.length - a.length)
  };
}

const NEIGHBORHOOD_CATALOG = buildSortedNeighborhoods();

export function detectNeighborhoodFromCardAndUrl(
  href: string,
  cardText: string,
  targetNeigh?: string,
  city?: string
): string {
  const normUrl = (href || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const normText = (cardText || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const normCity = normalizeSlug(city || '').replace(/-/g, ' ');
  const cityCandidates = normCity ? (NEIGHBORHOOD_CATALOG.byCity[normCity] || []) : NEIGHBORHOOD_CATALOG.all;

  // 1. Prioridade absoluta: se targetNeigh foi fornecido e a busca/anúncio o referencia
  if (targetNeigh) {
    const targetSlug = normalizeSlug(targetNeigh);
    const targetNorm = targetNeigh.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (
      normUrl.includes('-' + targetSlug + '-') ||
      normUrl.includes('/' + targetSlug + '-') ||
      normUrl.includes('-' + targetSlug + '/') ||
      normUrl.includes('/' + targetSlug + '/') ||
      normUrl.endsWith('-' + targetSlug) ||
      new RegExp(`\\b${targetNorm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`).test(normText)
    ) {
      return targetNeigh;
    }
  }

  // 2. Extração pelo slug canônico da URL contra os bairros oficiais da cidade
  for (const n of cityCandidates) {
    if (n.length < 3) continue;
    const slug = n.replace(/\s+/g, '-');
    if (
      normUrl.includes('-' + slug + '-') ||
      normUrl.includes('/' + slug + '-') ||
      normUrl.includes('-' + slug + '/') ||
      normUrl.includes('/' + slug + '/') ||
      normUrl.endsWith('-' + slug)
    ) {
      return n.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  // 3. Extração por regex estrita no endereço do card ("Rua X - Bairro, Cidade")
  const textMatches = [
    cardText.match(/[-–—]\s*([A-Za-zÀ-ÿ\s]+?)\s*,\s*(?:Rio de Janeiro|Niterói|Juiz de Fora)/i),
    cardText.match(/,\s*([A-Za-zÀ-ÿ\s]+?)\s*[-–—]\s*(?:Rio de Janeiro|RJ|Niterói|Juiz de Fora|MG)/i),
    cardText.match(/[-–—]\s*([A-Za-zÀ-ÿ\s]+?)\s*[-–—]\s*(?:Rio de Janeiro|Niterói|Juiz de Fora)/i),
    cardText.match(/([A-Za-zÀ-ÿ\s]+?)\s*,\s*(?:Rio de Janeiro|Niterói|Juiz de Fora)\s*[-–—]\s*(?:RJ|MG)/i)
  ];

  for (const m of textMatches) {
    if (m && m[1]) {
      const candidate = m[1].trim();
      const candNorm = candidate.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (['rio de janeiro', 'rj', 'brasil', 'zona norte', 'zona sul', 'zona oeste', 'centro metropolitano', 'centro empresarial', 'mg'].includes(candNorm)) continue;
      
      // Procura correspondência exata ou por limite de palavra estrito (\b) para não confundir "centro" em "centro médico"
      for (const n of cityCandidates) {
        if (candNorm === n || new RegExp(`^${n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`).test(candNorm)) {
          return n.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
      }
    }
  }

  // 4. Fallback seguro: se targetNeigh foi fornecido, usa targetNeigh, senão cidade
  return targetNeigh || city || '';
}

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1'
};

function fetchHtml(url: string, timeoutMs = 15000): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = https.get({
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: COMMON_HEADERS,
        timeout: timeoutMs
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode || 200, body }));
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 408, body: '' });
      });

      req.on('error', (err) => {
        console.warn(`[HTTP Fetch Error] ${url}:`, err.message);
        resolve({ status: 500, body: '' });
      });
    } catch (e: any) {
      resolve({ status: 500, body: '' });
    }
  });
}

// ==========================================
// AUXILIARES: SANITIZAÇÃO DE ÁREA (PRIVATIVA VS TERRENO) E EXPURGADOR DE FANTASMAS
// ==========================================
export function sanitizePropertyArea(
  text: string,
  rawArea?: number,
  propertyType: PropertyType | string = 'Apartamento',
  price = 0,
  href = ''
): number {
  const normType = (propertyType || '').toLowerCase();
  const isTerreno = normType.includes('terreno') || normType.includes('lote') || normType.includes('gleba');

  // Se for terreno/lote, a metragem relevante É a metragem do lote/terreno
  if (isTerreno) {
    if (rawArea && rawArea >= 30) return rawArea;
    const lotMatch = text.match(/(\d+)\s*m[²2]/i) || href.match(/[-_](\d+)m2/i) || href.match(/[-_](\d+)-m/i);
    if (lotMatch) return parseInt(lotMatch[1], 10);
    return rawArea || 300;
  }

  // 1. Prioridade Absoluta: menção explícita de Área Útil, Privativa ou Construída no texto/card
  const postfixMatch = text.match(/(\d+)\s*m[²2]?\s*(?:útil|util|privativ[ao]|priv|úteis|constru[íi]da|constr)/i);
  if (postfixMatch) {
    const val = parseInt(postfixMatch[1], 10);
    if (val >= 15 && val <= 800) return val;
  }

  const prefixMatch = text.match(/(?:área\s+(?:útil|privativa|constru[íi]da|privada))[:\s]*(\d+)\s*m[²2]?/i);
  if (prefixMatch) {
    const val = parseInt(prefixMatch[1], 10);
    if (val >= 15 && val <= 800) return val;
  }

  // 1.1 Menção no título ou card associada a quartos (ex: "Casa com 2 quartos, 82m²" ou "2 qtos, 82m²")
  const roomBuiltMatch = text.match(/(?:quarto|dormit[óo]rio|suite|qto)s?[^,\d]*,\s*(\d+)\s*m[²2]/i) ||
                         text.match(/,\s*(\d+)\s*m[²2]\s*(?:em\s+|com\s+)/i);
  if (roomBuiltMatch) {
    const val = parseInt(roomBuiltMatch[1], 10);
    if (val >= 20 && val <= 500) {
      return val;
    }
  }

  // 2. Área Construída explícita
  const constrMatch = text.match(/(?:área\s*constru[íi]da)[:\s]*(\d+)\s*m[²2]?/i) ||
                      text.match(/(\d+)\s*m[²2]?\s*(?:constr|constru[íi]da)/i);
  if (constrMatch) {
    const val = parseInt(constrMatch[1], 10);
    if (val >= 15 && val <= 800) return val;
  }

  // 3. Menção explícita de metragem privativa na URL (ex: casa-com-2-dormitorios-a-venda-90-m ou ...-46m2)
  if (href) {
    const hrefMatch = href.match(/[-_](\d+)\s*m(?:2|²)?(?:[-_\/]|$)/i);
    if (hrefMatch) {
      const val = parseInt(hrefMatch[1], 10);
      if (val >= 18 && val <= 600) {
        if (!rawArea || rawArea > val * 1.3 || rawArea > 250) {
          return val;
        }
      }
    }
  }

  // 4. Se o imóvel é CASA ou SOBRADO e a área informada for muito grande (> 200m²),
  // verificar se não há uma menção menor no card que seja a área privativa/construída
  const isHouse = normType.includes('casa') || normType.includes('sobrado') || normType.includes('vila');
  if (isHouse && rawArea && rawArea > 200) {
    const smallerBuiltMatches = Array.from(text.matchAll(/(\d+)\s*m[²2]/gi))
      .map(m => {
        const idx = m.index ?? 0;
        const prefix = text.substring(Math.max(0, idx - 30), idx).toLowerCase();
        const suffix = text.substring(idx, Math.min(text.length, idx + 30)).toLowerCase();
        if (/terreno|lote|total|tot\./.test(prefix) || /terreno|lote|total|tot\./.test(suffix)) return 0;
        return parseInt(m[1], 10);
      })
      .filter(v => v >= 30 && v <= 250);
    if (smallerBuiltMatches.length > 0) {
      return smallerBuiltMatches[0];
    }
  }

  // 5. Trava Sanitária para Apartamentos e Unidades Comerciais:
  // Se a área for superior a 180m², verificar se não é a fração/terreno do prédio
  let parsed = rawArea || 0;
  const isApartmentOrCommercial = normType.includes('apartamento') || normType.includes('comercial') || normType.includes('sala') || normType.includes('loja');
  if (isApartmentOrCommercial && parsed > 180) {
    const smallerMatches = Array.from(text.matchAll(/(\d+)\s*m[²2]/gi))
      .map(m => parseInt(m[1], 10))
      .filter(v => v >= 20 && v <= 180);
    if (smallerMatches.length > 0) {
      return smallerMatches[0];
    }
    if (price > 0 && price < 850000) {
      if (href) {
        const hMatch = href.match(/[-_](\d+)\s*m(?:2|²)?(?:[-_\/]|$)/i);
        if (hMatch) {
          const val = parseInt(hMatch[1], 10);
          if (val >= 20 && val <= 180) return val;
        }
      }
      return 65;
    }
  }

  if (!parsed || parsed <= 0) {
    const allMatches = Array.from(text.matchAll(/(\d+)\s*m[²2]/gi));
    for (const m of allMatches) {
      const idx = m.index ?? 0;
      const prefix = text.substring(Math.max(0, idx - 30), idx).toLowerCase();
      if (/terreno|lote|área\s*total|gleba|tot\./.test(prefix)) continue;
      const val = parseInt(m[1], 10);
      if (val >= 15 && val <= 1000) {
        parsed = val;
        break;
      }
    }
  }

  if (!parsed || parsed < 15) parsed = 60;
  return parsed;
}

export function isListingActiveAndValid(text: string, href: string): boolean {
  const t = text.toLowerCase();
  if (
    t.includes('não está mais disponível') ||
    t.includes('imóvel indisponível') ||
    t.includes('anúncio pausado') ||
    t.includes('imóvel vendido') ||
    t.includes('já foi vendido') ||
    t.includes('desativado') ||
    t.includes('este imóvel foi desativado')
  ) {
    return false;
  }
  if (href.includes('/imovel-indisponivel') || href.includes('/404') || href.includes('indisponivel')) {
    return false;
  }
  return true;
}

// ==========================================
// 1. CAMADA QUINTOANDAR (VENDA & LOCAÇÃO, ALTA RESOLUÇÃO XXL)
// ==========================================
export async function scrapeQuintoAndar(city: string, state: string, neighborhood: string): Promise<ScrapedPortalListing[]> {
  const citySlug = normalizeSlug(city);
  const ufSlug = normalizeSlug(state);
  const neighSlug = normalizeSlug(neighborhood);
  // URL canônica com prioridade de bairro estrito para VENDA
  const primaryUrl = neighSlug 
    ? `https://www.quintoandar.com.br/comprar/imovel/${neighSlug}-${citySlug}-${ufSlug}-brasil`
    : `https://www.quintoandar.com.br/comprar/imovel/${citySlug}-${ufSlug}`;
  const fallbackUrl = `https://www.quintoandar.com.br/comprar/imovel/${citySlug}-${ufSlug}/${neighSlug}`;
  const listings: ScrapedPortalListing[] = [];

  console.log(`[Scraper QuintoAndar] Consultando VENDA em ${neighborhood}, ${city} - ${state.toUpperCase()}`);

  const urlsToTry = [primaryUrl, fallbackUrl];

  for (const url of urlsToTry) {
    if (listings.length >= 8) break;
    try {
      const { status, body } = await fetchHtml(url);
      if (status === 200 && body.includes('__NEXT_DATA__')) {
        const match = body.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (match) {
          const j = JSON.parse(match[1]);
          const houses = j.props?.pageProps?.initialState?.houses || {};
          const targetNorm = normalizeSlug(neighborhood);

          const houseKeys = Object.keys(houses).filter(k => !isNaN(Number(k)));
          const maxHouseId = Math.max(0, ...houseKeys.map(k => Number(houses[k]?.id) || 0).filter(n => n > 0));

          for (const key of houseKeys) {
            const h = houses[key];

            // Expurgador de inativos/fantasmas QuintoAndar
            if (h.status && h.status !== 'ACTIVE') continue;
            if (h.isSold === true || h.isRented === true) continue;

            // 1. Validação Estrita de VENDA (Rejeita aluguel ou valores mensais baixos)
            if (h.forSale === false || h.businessContext === 'RENT') continue;
            if (h.type === 'Terreno' || h.type === 'Lote' || (h.type && h.type.toLowerCase().includes('terreno'))) continue;
            const price = Number(h.salePrice) || 0;
            if (!price || price < 80000) continue; // Descarte estrito de aluguel (< R$ 80.000)
            
            const rawArea = Number(h.usableArea || h.privateArea || h.area) || 0;
            const area = sanitizePropertyArea(JSON.stringify(h), rawArea, h.type || 'Apartamento', price);
            if (area < 10) continue;

            // 2. Validação Estrita de Bairro (Evita vazamento de Barra da Tijuca, Pechincha etc.)
            const houseNeighNorm = normalizeSlug(h.neighbourhood || '');
            if (targetNorm && houseNeighNorm) {
              if (targetNorm === 'tijuca') {
                if (houseNeighNorm !== 'tijuca') continue;
              } else if (houseNeighNorm !== targetNorm && !houseNeighNorm.includes(targetNorm)) {
                continue;
              }
            }

            const numId = Number(h.id) || 0;
            let daysOffset = 0;
            if (maxHouseId > 0 && numId > 0 && maxHouseId >= numId) {
              daysOffset = Math.min(180, Math.floor((maxHouseId - numId) / 1200));
            }
            const dateInput = h.publishedAt || h.createdAt || h.activeSince || (Date.now() - (daysOffset * 86400000));
            const relDate = parseRelativePublicationDate(dateInput);
            const street = h.address?.address || '';
            const num = h.address?.streetNumber || '';
            const fullAddress = street ? `${street}${num ? ', ' + num : ''}` : (h.neighbourhood || neighborhood);
            const m2Val = Math.round(price / area);

            // 3. Montagem da URL real direta de COMPRA (Obrigatório /comprar)
            const urlAnuncio = `https://www.quintoandar.com.br/imovel/${h.id}/comprar`;

            // 4. Captura da Foto em Alta Resolução XXL do CDN QuintoAndar (interditadas miniaturas)
            let photoUrl = '';
            const rawPhoto = (Array.isArray(h.photos) && h.photos.length > 0)
              ? (typeof h.photos[0] === 'string' ? h.photos[0] : h.photos[0]?.url)
              : (h.coverImage || h.banner || '');

            if (rawPhoto) {
              if (rawPhoto.startsWith('http')) {
                photoUrl = rawPhoto.replace(/\/(thumb|thumbnail|s|m|xl)\//, '/xxl/');
              } else {
                const photoWithExt = /\.(jpe?g|png|webp)$/i.test(rawPhoto) ? rawPhoto : `${rawPhoto}.jpg`;
                photoUrl = `https://www.quintoandar.com.br/img/xxl/${photoWithExt}`;
              }
            }

            listings.push({
              id: `quintoandar-${h.id}`,
              titulo: `${h.type || 'Apartamento'} com ${h.bedrooms || 1} qto(s), ${area}m² em ${h.neighbourhood || neighborhood}`,
              portal: 'QuintoAndar',
              url_anuncio: urlAnuncio,
              imagem_url: photoUrl,
              cidade: city,
              bairro: h.neighbourhood || neighborhood,
              endereco: `${fullAddress}, ${city} - ${state.toUpperCase()}`,
              preco_anunciado: price,
              valor_condominio: Number(h.condoPrice) || (h.condoIptu ? Math.round(Number(h.condoIptu) * 0.78) : 0),
              valor_iptu: Number(h.iptuPrice) || (h.condoIptu ? Math.round(Number(h.condoIptu) * 0.22) : 0),
              area_m2: area,
              quartos: Number(h.bedrooms) || 0,
              vagas: Number(h.parkingSpots) || 0,
              data_publicacao_iso: relDate.data_publicacao_iso,
              dias_publicado: relDate.dias_publicado,
              texto_publicacao: relDate.texto_publicacao,
              m2_anunciado: m2Val,
              transaction_type: 'venda'
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[QuintoAndar Venda Falhou na URL ${url}] ${err.message}`);
    }
  }

  return listings;
}

/**
 * Extração de Imóveis Reais de LOCAÇÃO RESIDENCIAL (Aluguel, Condomínio, IPTU e Taxas Reais)
 */
export async function scrapeQuintoAndarRental(city: string, state: string, neighborhood: string): Promise<ScrapedPortalListing[]> {
  const citySlug = normalizeSlug(city);
  const ufSlug = normalizeSlug(state);
  const neighSlug = normalizeSlug(neighborhood);
  // URL canônica estrita para aluguel no bairro
  const primaryUrl = neighSlug 
    ? `https://www.quintoandar.com.br/alugar/imovel/${neighSlug}-${citySlug}-${ufSlug}-brasil`
    : `https://www.quintoandar.com.br/alugar/imovel/${citySlug}-${ufSlug}`;
  const fallbackUrl = `https://www.quintoandar.com.br/alugar/imovel/${citySlug}-${ufSlug}/${neighSlug}`;
  const listings: ScrapedPortalListing[] = [];

  console.log(`[Scraper QuintoAndar] Consultando LOCAÇÃO (Aluguel) em ${neighborhood}, ${city} - ${state.toUpperCase()}`);

  const urlsToTry = [primaryUrl, fallbackUrl];

  for (const url of urlsToTry) {
    if (listings.length >= 8) break;
    try {
      const { status, body } = await fetchHtml(url);
      if (status === 200 && body.includes('__NEXT_DATA__')) {
        const match = body.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (match) {
          const j = JSON.parse(match[1]);
          const houses = j.props?.pageProps?.initialState?.houses || {};
          const targetNorm = normalizeSlug(neighborhood);

          const houseKeys = Object.keys(houses).filter(k => !isNaN(Number(k)));
          const maxHouseId = Math.max(0, ...houseKeys.map(k => Number(houses[k]?.id) || 0).filter(n => n > 0));

          for (const key of houseKeys) {
            const h = houses[key];

            // Expurgador de inativos/fantasmas
            if (h.status && h.status !== 'ACTIVE') continue;
            if (h.isRented === true || h.isSold === true) continue;

            // 1. Validação Estrita de LOCAÇÃO
            const rentPrice = Number(h.rentPrice) || (h.businessContext === 'RENT' ? Number(h.salePrice) : 0);
            if (!rentPrice || rentPrice < 400 || rentPrice > 100000) continue; // Descarte estrito de venda ou dados corrompidos
            if (h.type === 'Terreno' || h.type === 'Lote' || (h.type && h.type.toLowerCase().includes('terreno'))) continue;

            const rawArea = Number(h.usableArea || h.privateArea || h.area) || 0;
            const area = sanitizePropertyArea(JSON.stringify(h), rawArea, h.type || 'Apartamento', rentPrice);
            if (area < 10) continue;

            // 2. Validação Estrita de Bairro
            const houseNeighNorm = normalizeSlug(h.neighbourhood || '');
            if (targetNorm && houseNeighNorm) {
              if (targetNorm === 'tijuca') {
                if (houseNeighNorm !== 'tijuca') continue;
              } else if (houseNeighNorm !== targetNorm && !houseNeighNorm.includes(targetNorm)) {
                continue;
              }
            }

            // 3. Taxas Reais do Anúncio (Condomínio, IPTU e Serviços QuintoAndar)
            const totalRentalPackage = Number(h.totalCost) || (rentPrice + (Number(h.condoIptu) || 0));
            const totalTaxas = totalRentalPackage > rentPrice ? totalRentalPackage - rentPrice : (Number(h.condoIptu) || 0);
            const condoPrice = Number(h.condoPrice) || (h.condoIptu ? Math.round(Number(h.condoIptu) * 0.78) : Math.round(totalTaxas * 0.75));
            const iptuPrice = Number(h.iptuPrice) || (h.condoIptu ? Math.round(Number(h.condoIptu) * 0.22) : Math.round(totalTaxas * 0.15));
            const serviceFees = Math.max(0, totalTaxas - (condoPrice + iptuPrice));

            const numId = Number(h.id) || 0;
            let daysOffset = 0;
            if (maxHouseId > 0 && numId > 0 && maxHouseId >= numId) {
              daysOffset = Math.min(180, Math.floor((maxHouseId - numId) / 1200));
            }
            const dateInput = h.publishedAt || h.createdAt || h.activeSince || (Date.now() - (daysOffset * 86400000));
            const relDate = parseRelativePublicationDate(dateInput);
            const street = h.address?.address || '';
            const num = h.address?.streetNumber || '';
            const fullAddress = street ? `${street}${num ? ', ' + num : ''}` : (h.neighbourhood || neighborhood);
            const m2Val = Math.round(rentPrice / area);

            // 4. URL Real de Locação (100% autêntica e funcional)
            const urlAnuncio = `https://www.quintoandar.com.br/imovel/${h.id}/alugar`;

            // 5. Foto em Alta Resolução XXL do CDN
            let photoUrl = '';
            const rawPhoto = (Array.isArray(h.photos) && h.photos.length > 0)
              ? (typeof h.photos[0] === 'string' ? h.photos[0] : h.photos[0]?.url)
              : (h.coverImage || h.banner || '');

            if (rawPhoto) {
              if (rawPhoto.startsWith('http')) {
                photoUrl = rawPhoto.replace(/\/(thumb|thumbnail|s|m|xl)\//, '/xxl/');
              } else {
                const photoWithExt = /\.(jpe?g|png|webp)$/i.test(rawPhoto) ? rawPhoto : `${rawPhoto}.jpg`;
                photoUrl = `https://www.quintoandar.com.br/img/xxl/${photoWithExt}`;
              }
            }

            listings.push({
              id: `quintoandar-${h.id}`,
              titulo: `${h.type || 'Apartamento'} para Alugar com ${h.bedrooms || 1} qto(s), ${area}m² em ${h.neighbourhood || neighborhood}`,
              portal: 'QuintoAndar',
              url_anuncio: urlAnuncio,
              imagem_url: photoUrl,
              cidade: city,
              bairro: h.neighbourhood || neighborhood,
              endereco: `${fullAddress}, ${city} - ${state.toUpperCase()}`,
              preco_anunciado: rentPrice,
              valor_condominio: condoPrice,
              valor_iptu: iptuPrice,
              taxas_servico: serviceFees,
              total_taxas: totalTaxas,
              total_rental_package: totalRentalPackage,
              area_m2: area,
              quartos: Number(h.bedrooms) || 0,
              vagas: Number(h.parkingSpots) || 0,
              data_publicacao_iso: relDate.data_publicacao_iso,
              dias_publicado: relDate.dias_publicado,
              texto_publicacao: relDate.texto_publicacao,
              m2_anunciado: m2Val,
              transaction_type: 'aluguel'
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[QuintoAndar Aluguel Falhou na URL ${url}] ${err.message}`);
    }
  }

  return listings;
}

// ==========================================
// ==========================================
// MAPEAMENTO E RESOLUÇÃO DE SLUGS NO ZAP IMÓVEIS
// ==========================================
export function resolveZapNeighborhoodSlug(city: string, state: string, neighborhood: string): string {
  const normCity = normalizeSlug(city);
  const normNeigh = normalizeSlug(neighborhood);

  if (normCity.includes('juiz-de-fora')) {
    const jfMap: Record<string, string> = {
      'sao-mateus': 's-mateus',
      'sao-pedro': 's-pedro',
      'santa-helena': 'sta-helena',
      'santa-luzia': 'sta-luzia',
      'santa-terezinha': 'sta-terezinha',
      'jardim-gloria': 'jd-gloria',
      'alto-dos-passos': 'alto-dos-passos',
      'bom-pastor': 'bom-pastor',
      'estrela-sul': 'estrela-sul',
      'cascatinha': 'cascatinha',
      'granbery': 'granbery',
      'centro': 'centro',
      'benfica': 'benfica',
      'manoel-honorio': 'manoel-honorio',
      'paineiras': 'paineiras',
      'morro-da-gloria': 'morro-da-gloria',
      'aeroporto': 'aeroporto',
      'salvaterra': 'salvaterra',
      'alphaville': 'alphaville',
      'vina-del-mar': 'vina-del-mar',
      'grama': 'grama',
      'marilandia': 'marilandia',
      'santos-dumont': 'santos-dumont',
      'novo-horizonte': 'novo-horizonte',
      'bairu': 'bairu',
      'progresso': 'progresso',
      'costa-carvalho': 'costa-carvalho',
      'teixeiras': 'teixeiras',
      'dom-bosco': 'dom-bosco',
      'sagrado-coracao': 'sagrado-coracao',
      'fontesville': 'fontesville',
      'francisco-bernardino': 'francisco-bernardino',
      'industrial': 'industrial',
      'santa-cruz': 'sta-cruz',
      'sao-dimas': 's-dimas'
    };
    if (jfMap[normNeigh]) return jfMap[normNeigh];
    if (normNeigh.startsWith('sao-')) return 's-' + normNeigh.slice(4);
    if (normNeigh.startsWith('santa-')) return 'sta-' + normNeigh.slice(6);
    if (normNeigh.startsWith('jardim-')) return 'jd-' + normNeigh.slice(7);
  }

  return normNeigh;
}

// ==========================================
// 2. CAMADA ZAP IMÓVEIS (HEADLESS STEALTH, WEBP FOTO HD, URL REAL DE VENDA)
// ==========================================
export async function scrapeZapImoveis(
  city: string,
  state: string,
  neighborhood: string,
  browserInstance?: Browser
): Promise<ScrapedPortalListing[]> {
  const citySlug = normalizeSlug(city);
  const ufSlug = normalizeSlug(state);
  const isRjCapital = ufSlug === 'rj' && citySlug === 'rio-de-janeiro';
  const hasNeighborhood = Boolean(neighborhood && neighborhood.trim() && neighborhood.toLowerCase() !== 'todas' && neighborhood.toLowerCase() !== 'todos');
  const neighSlug = hasNeighborhood ? resolveZapNeighborhoodSlug(city, state, neighborhood) : '';
  const zoneSlug = (isRjCapital && hasNeighborhood) ? `${getRjZone(neighborhood)}+` : '';
  
  const primaryUrl = hasNeighborhood
    ? (isRjCapital
        ? `https://www.zapimoveis.com.br/venda/imoveis/${ufSlug}+${citySlug}+${zoneSlug}${neighSlug}/`
        : `https://www.zapimoveis.com.br/venda/imoveis/${ufSlug}+${citySlug}+${neighSlug}/`)
    : `https://www.zapimoveis.com.br/venda/imoveis/${ufSlug}+${citySlug}/`;

  console.log(`[Scraper Zap Imóveis] Consultando VENDA em ${neighborhood || 'Geral (' + city + ')'}, ${city} - ${state.toUpperCase()}`);

  const listings: ScrapedPortalListing[] = [];
  let ownBrowser = false;
  let browser = browserInstance;

  try {
    if (!browser) {
      browser = await launchPuppeteer(puppeteer, { headless: true });
      ownBrowser = true;
    }

    const page = await browser.newPage();
    await page.setUserAgent(COMMON_HEADERS['User-Agent']);
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      (window as any).chrome = { runtime: {} };
    });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const rt = req.resourceType();
      if (rt === 'media' || rt === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    let res = await page.goto(primaryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Validação de erro 404 / página de recomendação
    const pageTitle = await page.title();
    const isError = (res && res.status() === 404) || pageTitle.toLowerCase().includes('oops') || pageTitle.trim() === '';

    if (isError && hasNeighborhood) {
      console.log(`[Scraper Zap Imóveis] Rota específica do bairro ${neighborhood} indisponível. Recorrendo à busca geral de ${city}...`);
      const fallbackUrl = `https://www.zapimoveis.com.br/venda/imoveis/${ufSlug}+${citySlug}/`;
      res = await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
    }

    // Scroll suave para forçar o carregamento de cards e fotos dinâmicas (lazy loading)
    await page.evaluate(() => {
      window.scrollBy(0, 1000);
    });
    await new Promise(r => setTimeout(r, 1200));

    const rawListings = await page.evaluate((targetCity, targetNeigh) => {
      const results: any[] = [];
      const links = document.querySelectorAll('a[href*="/imovel/"]');
      const seen = new Set<string>();

      links.forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        if (!href || seen.has(href)) return;
        seen.add(href);

        // Rejeita qualquer anúncio de locação ou página de erro
        if (href.includes('/aluguel/') || href.includes('aluguel-') || href.includes('ERROR+PAGE')) return;

        const card = a.closest('[data-testid="listing-card"], [class*="card"], [class*="Card"], article') || a;
        const text = (card as HTMLElement).innerText || (a as HTMLElement).innerText || '';

        // Se o card menciona explicitamente 'ERROR PAGE' ou 'Oops', ignora
        if (text.includes('Não conseguimos encontrar') || text.includes('Novidades desde sua última visita')) return;

        const priceMatch = text.match(/R\$\s*([\d.]+)/) || href.match(/RS(\d+)/);
        if (!priceMatch) return;
        const price = parseInt(priceMatch[1].replace(/\./g, ''), 10);
        if (isNaN(price) || price < 70000) return;

        const sizeMatch = text.match(/(\d+)\s*m[²2]/i) || href.match(/(\d+)m2/i);
        const area = sizeMatch ? parseInt(sizeMatch[1], 10) : 60;

        const bedMatch = text.match(/(\d+)\s*quarto/i) || href.match(/(\d+)-quarto/i);
        const bedrooms = bedMatch ? parseInt(bedMatch[1], 10) : 2;

        const bathMatch = text.match(/(\d+)\s*banheiro/i);
        const bathrooms = bathMatch ? parseInt(bathMatch[1], 10) : 1;

        const parkingMatch = text.match(/(\d+)\s*vaga/i);
        const parking = parkingMatch ? parseInt(parkingMatch[1], 10) : 1;

        let rawImg = '';
        const allImgs = Array.from(card.querySelectorAll('img, source')) as (HTMLImageElement | HTMLSourceElement)[];
        for (const el of allImgs) {
          const s = (el as HTMLImageElement).src || el.getAttribute('data-src') || el.getAttribute('srcset') || el.getAttribute('data-srcset') || '';
          if (s && !s.startsWith('data:') && !s.includes('.svg') && !s.includes('placeholder')) {
            if (s.includes('resizedimgs') || s.includes('zapimoveis') || s.includes('vivareal')) {
              rawImg = s.split(' ')[0].split(',')[0].trim();
              break;
            } else if (!rawImg && s.startsWith('http')) {
              rawImg = s.split(' ')[0].split(',')[0].trim();
            }
          }
        }
        if (!rawImg) {
          const fallbackImg = card.querySelector('img');
          rawImg = fallbackImg ? (fallbackImg.src || fallbackImg.getAttribute('data-src') || '') : '';
        }
        // Maximiza a resolução da foto do Zap Imóveis para 1200x800
        const img = rawImg ? rawImg.replace(/dimension=\d+x\d+/, 'dimension=1200x800') : '';

        const streetMatch = text.match(/(?:Rua|Avenida|Travessa|Alameda|Estrada|Praça)[^,\n•]+/i);
        const rawStreet = streetMatch ? streetMatch[0].trim() : '';
        const streetClean = rawStreet.split(/(?:Tamanho|Quantidade|R\$|Cond|IPTU)/i)[0].trim();

        // Tenta detectar bairro do texto do card
        const bMatch = text.match(/[-–—]\s*([^,\n•]+),\s*(?:Juiz de Fora|Niterói|Rio de Janeiro)/i) ||
                       text.match(/([^,\n•]+),\s*(?:Juiz de Fora|Niterói|Rio de Janeiro)/i);
        const cardNeigh = bMatch ? bMatch[1].trim() : '';

        const pubMatch = text.match(/(?:(?:publicado|atualizado|criado|anunciado)\s*)?(?:h[áa]\s+\d+\s*(?:dia|hora|minuto|semana|m[êe]s|ano)s?|ontem|hoje|(?:publicado|atualizado|criado)[^•\n,]+)/i);
        const pubText = pubMatch ? pubMatch[0].trim() : 'Publicado hoje';

        const idMatch = href.match(/id-(\d+)/) || href.match(/\/(\d+)\/?(?:\?|$)/);
        const id = idMatch ? `zap-${idMatch[1]}` : `zap-${Math.abs(href.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0))}`;

        const condoMatch = text.match(/Cond\.?\s*R\$\s*([\d.]+)/i) || text.match(/Condom[íi]nio\s*R\$\s*([\d.]+)/i);
        const condoVal = condoMatch ? parseInt(condoMatch[1].replace(/\./g, ''), 10) : 0;
        const iptuMatch = text.match(/IPTU\s*R\$\s*([\d.]+)/i);
        const iptuVal = iptuMatch ? parseInt(iptuMatch[1].replace(/\./g, ''), 10) : 0;

        results.push({
          id,
          href,
          title: `Apartamento com ${bedrooms} quartos`,
          price,
          area,
          bedrooms,
          bathrooms,
          parking,
          condoVal,
          iptuVal,
          streetClean,
          cardNeigh: cardNeigh || '',
          img,
          pubText,
          cardText: text
        });
      });

      return results;
    }, city, neighborhood);

    await page.close();

    for (const item of rawListings) {
      if (!isListingActiveAndValid(item.cardText || '', item.href || '')) continue;
      const typo = detectTypologyFromUrlAndText(item.href || '', item.title || '', item.cardText || '');
      // Exclui completamente terrenos e lotes do módulo Flip e Locação
      if (typo.propertyType === 'Terreno') continue;

      const sanitizedArea = sanitizePropertyArea(item.cardText || '', item.area, typo.propertyType, item.price, item.href);
      const relDate = parseRelativePublicationDate(item.pubText);
      const m2Val = Math.round(item.price / (sanitizedArea || 1));
      
      const detectedNeigh = detectNeighborhoodFromCardAndUrl(item.href || '', item.cardText || '', item.cardNeigh || neighborhood, city);
      const finalNeigh = detectedNeigh || neighborhood || city;

      // Trava de coerência geográfica: se a busca solicitou um bairro específico (ex: Barra da Tijuca),
      // e o portal retornou anúncio patrocinado/ranking de outro bairro (ex: Engenho Novo),
      // descarta do pool do bairro alvo para não contaminar métricas de Flip House e Locação!
      if (neighborhood) {
        const normTarget = normalizeSlug(neighborhood);
        const normFinal = normalizeSlug(finalNeigh);
        if (normFinal && normTarget && normFinal !== normTarget) {
          console.log(`[Zap] Descartando anúncio patrocinado fora do bairro alvo: ${finalNeigh} (buscado: ${neighborhood}) - ${item.href}`);
          continue;
        }
      }

      const endClean = item.streetClean ? `${item.streetClean}, ${finalNeigh}` : finalNeigh;

      let displayTitle = '';
      if (typo.subtype === 'Sala Comercial') {
        displayTitle = `Sala Comercial com ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.subtype === 'Loja') {
        displayTitle = `Loja Comercial com ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.propertyType === 'Comercial') {
        displayTitle = `${typo.displayPrefix} com ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.propertyType === 'Casa') {
        displayTitle = `Casa com ${item.bedrooms} quartos, ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.subtype === 'Cobertura') {
        displayTitle = `Cobertura com ${item.bedrooms} quartos, ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.subtype === 'Kitnet / Studio') {
        displayTitle = `Kitnet / Studio com ${sanitizedArea}m² em ${finalNeigh}`;
      } else {
        displayTitle = `Apartamento com ${item.bedrooms} quartos, ${sanitizedArea}m² em ${finalNeigh}`;
      }

      listings.push({
        id: item.id,
        titulo: displayTitle,
        tipo_imovel: typo.propertyType,
        subtipo: typo.subtype,
        portal: 'Zap Imóveis',
        url_anuncio: item.href,
        imagem_url: item.img,
        cidade: city,
        bairro: finalNeigh,
        endereco: `${endClean}, ${city} - ${state.toUpperCase()}`,
        preco_anunciado: item.price,
        valor_condominio: item.condoVal || 0,
        valor_iptu: item.iptuVal || 0,
        area_m2: sanitizedArea,
        quartos: (typo.propertyType as string) === 'Terreno' || typo.propertyType === 'Comercial' ? 0 : item.bedrooms,
        vagas: item.parking,
        data_publicacao_iso: relDate.data_publicacao_iso,
        dias_publicado: relDate.dias_publicado,
        texto_publicacao: relDate.texto_publicacao,
        m2_anunciado: m2Val
      });
    }

  } catch (err: any) {
    console.warn(`[Zap Imóveis Puppeteer Falhou] ${err.message}`);
  } finally {
    if (ownBrowser && browser) {
      try { await browser.close(); } catch {}
    }
  }

  return listings;
}

// ==========================================
// 3. CAMADA VIVA REAL (HEADLESS STEALTH, WEBP FOTO, URL REAL DE VENDA)
// ==========================================
export async function scrapeVivaReal(
  city: string,
  state: string,
  neighborhood: string,
  browserInstance?: Browser
): Promise<ScrapedPortalListing[]> {
  const citySlug = normalizeSlug(city);
  const ufSlug = normalizeSlug(state);
  const stateFullMap: Record<string, string> = {
    'rj': 'rio-de-janeiro',
    'mg': 'minas-gerais',
    'sp': 'sao-paulo'
  };
  const stateFullSlug = stateFullMap[ufSlug] || ufSlug;
  const isRjCapital = ufSlug === 'rj' && citySlug === 'rio-de-janeiro';
  const hasNeighborhood = Boolean(neighborhood && neighborhood.trim() && neighborhood.toLowerCase() !== 'todas' && neighborhood.toLowerCase() !== 'todos');
  const neighSlug = hasNeighborhood ? normalizeSlug(neighborhood) : '';
  const zoneSlug = (isRjCapital && hasNeighborhood) ? `${getRjZone(neighborhood)}/` : '';
  
  const url = (ufSlug === 'mg' || !isRjCapital)
    ? (hasNeighborhood
        ? `https://www.vivareal.com.br/venda/${stateFullSlug}/${citySlug}/bairros/${neighSlug}/`
        : `https://www.vivareal.com.br/venda/${stateFullSlug}/${citySlug}/`)
    : `https://www.vivareal.com.br/venda/${ufSlug}/${citySlug}/${zoneSlug}${neighSlug}/`;

  console.log(`[Scraper Viva Real] Consultando VENDA em ${neighborhood || 'Geral (' + city + ')'}, ${city} - ${state.toUpperCase()}`);

  const listings: ScrapedPortalListing[] = [];
  let ownBrowser = false;
  let browser = browserInstance;

  try {
    if (!browser) {
      browser = await launchPuppeteer(puppeteer, { headless: true });
      ownBrowser = true;
    }

    const page = await browser.newPage();
    await page.setUserAgent(COMMON_HEADERS['User-Agent']);
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      (window as any).chrome = { runtime: {} };
    });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const rt = req.resourceType();
      if (rt === 'media' || rt === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll para carregar cards lazy
    await page.evaluate(() => {
      window.scrollBy(0, 1000);
    });
    await new Promise(r => setTimeout(r, 1000));

    const rawListings = await page.evaluate((targetCity, targetNeigh) => {
      const results: any[] = [];
      const links = document.querySelectorAll('a[href*="/imovel/"]');
      const seen = new Set<string>();

      links.forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        if (!href || seen.has(href)) return;
        seen.add(href);

        if (href.includes('/aluguel/') || href.includes('aluguel-') || href.includes('ERROR+PAGE')) return;

        const container = a.closest('article, [class*="card"], [class*="Card"], [data-type="property"]') || a;
        const text = (container as HTMLElement).innerText || (a as HTMLElement).innerText || '';

        const priceUrlMatch = href.match(/venda-RS(\d+)/i) || href.match(/RS(\d+)/i);
        const textPriceMatch = text.match(/R\$\s*([\d.]+)/);
        const price = textPriceMatch
          ? parseInt(textPriceMatch[1].replace(/\./g, ''), 10)
          : (priceUrlMatch ? parseInt(priceUrlMatch[1], 10) : 0);

        if (!price || price < 70000) return;

        const sizeUrlMatch = href.match(/(\d+)m2/i);
        const textSizeMatch = text.match(/(\d+)\s*m[²2]/i);
        const area = textSizeMatch ? parseInt(textSizeMatch[1], 10) : (sizeUrlMatch ? parseInt(sizeUrlMatch[1], 10) : 60);

        const bedUrlMatch = href.match(/(\d+)-quarto/i);
        const textBedMatch = text.match(/(\d+)\s*quarto/i);
        const bedrooms = textBedMatch ? parseInt(textBedMatch[1], 10) : (bedUrlMatch ? parseInt(bedUrlMatch[1], 10) : 2);

        const idMatch = href.match(/id-(\d+)/) || href.match(/\/(\d+)\/?(?:\?|$)/);
        const id = idMatch ? `vivareal-${idMatch[1]}` : `vivareal-${Math.floor(Math.random() * 1000000)}`;

        const img = container.querySelector('img');
        const rawImg = img ? (img.src || img.getAttribute('data-src') || '') : '';
        const imgSrc = rawImg.replace(/dimension=\d+x\d+/, 'dimension=1200x800');

        const streetMatch = text.match(/(?:Rua|Avenida|Travessa|Alameda|Estrada|Praça)[^,\n•]+/i);
        const rawStreet = streetMatch ? streetMatch[0].trim() : '';
        const streetClean = rawStreet.split(/(?:Tamanho|Quantidade|R\$|Cond|IPTU)/i)[0].trim();

        const bMatch = text.match(/[-–—]\s*([^,\n•]+),\s*(?:Juiz de Fora|Niterói|Rio de Janeiro)/i) ||
                       text.match(/([^,\n•]+),\s*(?:Juiz de Fora|Niterói|Rio de Janeiro)/i);
        const cardNeigh = bMatch ? bMatch[1].trim() : '';

        const condoMatch = text.match(/Cond\.?\s*R\$\s*([\d.]+)/i);
        const condoVal = condoMatch ? parseInt(condoMatch[1].replace(/\./g, ''), 10) : 0;

        const iptuMatch = text.match(/IPTU\.?\s*R\$\s*([\d.]+)/i);
        const iptuVal = iptuMatch ? parseInt(iptuMatch[1].replace(/\./g, ''), 10) : 0;

        const pubMatch = text.match(/(?:(?:publicado|atualizado|criado|anunciado)\s*)?(?:h[áa]\s+\d+\s*(?:dia|hora|minuto|semana|m[êe]s|ano)s?|ontem|hoje|(?:publicado|atualizado|criado)[^•\n,]+)/i);
        const pubText = pubMatch ? pubMatch[0].trim() : 'Publicado hoje';

        results.push({
          id,
          href,
          imgSrc,
          price,
          area,
          bedrooms,
          hasGarage: href.includes('com-garagem') || text.includes('vaga'),
          streetClean,
          cardNeigh: cardNeigh || '',
          condoVal,
          iptuVal,
          pubText,
          cardText: text
        });
      });

      return results;
    }, city, neighborhood);

    await page.close();

    for (const item of rawListings) {
      if (!isListingActiveAndValid(item.cardText || '', item.href || '')) continue;
      const typo = detectTypologyFromUrlAndText(item.href || '', '', item.cardText || '');
      // Exclui completamente terrenos e lotes do módulo Flip e Locação
      if (typo.propertyType === 'Terreno') continue;

      const sanitizedArea = sanitizePropertyArea(item.cardText || '', item.area, typo.propertyType, item.price, item.href);
      const relDate = parseRelativePublicationDate(item.pubText);
      const m2Val = Math.round(item.price / (sanitizedArea || 1));
      
      const detectedNeigh = detectNeighborhoodFromCardAndUrl(item.href || '', item.cardText || '', item.cardNeigh || neighborhood, city);
      const finalNeigh = detectedNeigh || neighborhood || city;

      // Trava de coerência geográfica
      if (neighborhood) {
        const normTarget = normalizeSlug(neighborhood);
        const normFinal = normalizeSlug(finalNeigh);
        if (normFinal && normTarget && normFinal !== normTarget) {
          console.log(`[VivaReal] Descartando anúncio fora do bairro alvo: ${finalNeigh} (buscado: ${neighborhood}) - ${item.href}`);
          continue;
        }
      }

      const endClean = item.streetClean ? `${item.streetClean}, ${finalNeigh}` : finalNeigh;

      let displayTitle = '';
      if (typo.subtype === 'Sala Comercial') {
        displayTitle = `Sala Comercial com ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.subtype === 'Loja') {
        displayTitle = `Loja Comercial com ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.propertyType === 'Comercial') {
        displayTitle = `${typo.displayPrefix} com ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.propertyType === 'Casa') {
        displayTitle = `Casa com ${item.bedrooms} quartos, ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.subtype === 'Cobertura') {
        displayTitle = `Cobertura com ${item.bedrooms} quartos, ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.subtype === 'Kitnet / Studio') {
        displayTitle = `Kitnet / Studio com ${sanitizedArea}m² em ${finalNeigh}`;
      } else {
        displayTitle = `Apartamento com ${item.bedrooms} quartos, ${sanitizedArea}m² em ${finalNeigh}`;
      }

      listings.push({
        id: item.id,
        titulo: displayTitle,
        tipo_imovel: typo.propertyType,
        subtipo: typo.subtype,
        portal: 'Viva Real',
        url_anuncio: item.href,
        imagem_url: item.imgSrc,
        cidade: city,
        bairro: finalNeigh,
        endereco: `${endClean}, ${city} - ${state.toUpperCase()}`,
        preco_anunciado: item.price,
        valor_condominio: item.condoVal,
        valor_iptu: item.iptuVal,
        area_m2: sanitizedArea,
        quartos: (typo.propertyType as string) === 'Terreno' || typo.propertyType === 'Comercial' ? 0 : item.bedrooms,
        vagas: item.hasGarage ? 1 : 0,
        data_publicacao_iso: relDate.data_publicacao_iso,
        dias_publicado: relDate.dias_publicado,
        texto_publicacao: relDate.texto_publicacao,
        m2_anunciado: m2Val
      });
    }

  } catch (err: any) {
    console.warn(`[Viva Real Puppeteer Falhou] ${err.message}`);
  } finally {
    if (ownBrowser && browser) {
      try { await browser.close(); } catch {}
    }
  }

  return listings;
}

// ==========================================
// 4. CAMADA IMOVELWEB (PUPPETEER STEALTH, FOTO REAL, URL DE VENDA)
// ==========================================
export async function scrapeImovelweb(
  city: string,
  state: string,
  neighborhood: string,
  browserInstance?: Browser
): Promise<ScrapedPortalListing[]> {
  const citySlug = normalizeSlug(city);
  const ufSlug = normalizeSlug(state);
  const neighSlug = normalizeSlug(neighborhood);
  const url = `https://www.imovelweb.com.br/imoveis-venda-${neighSlug}-${citySlug}-${ufSlug}.html`;
  const listings: ScrapedPortalListing[] = [];

  console.log(`[Scraper Imovelweb] Consultando VENDA em ${neighborhood}, ${city} - ${state.toUpperCase()}`);

  let ownBrowser = false;
  let browser = browserInstance;

  try {
    if (!browser) {
      browser = await launchPuppeteer(puppeteer, { headless: true });
      ownBrowser = true;
    }

    const page = await browser.newPage();
    await page.setUserAgent(COMMON_HEADERS['User-Agent']);
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      (window as any).chrome = { runtime: {} };
    });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const rt = req.resourceType();
      if (rt === 'media' || rt === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const rawListings = await page.evaluate(() => {
      const results: any[] = [];
      const seen = new Set<string>();
      const cards = document.querySelectorAll('[data-id], [class*="CardContainer"], [class*="postingCard"]');

      cards.forEach(card => {
        const a = card.querySelector('a[href*="/propriedades/"], a[data-to-posting]');
        if (!a) return;
        const href = (a as HTMLAnchorElement).href;
        if (!href || seen.has(href)) return;
        seen.add(href);

        const text = (card as HTMLElement).innerText || '';
        const priceMatch = text.match(/R\$\s*([\d.]+)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/\./g, ''), 10) : 0;
        if (!price || price < 80000) return;

        // Metragem Útil / Privativa vs Metragem de Terreno / Total
        const utilMatch = text.match(/(\d+)\s*m[²2]?\s*(?:útil|util|privativ[ao]|priv|constr|constru[íi]da)/i) ||
                          text.match(/(?:área\s+(?:útil|privativa|constru[íi]da|privada))[:\s]*(\d+)\s*m[²2]?/i);
        const totMatch = text.match(/(\d+)\s*m[²2]?\s*(?:tot|total|terreno|lote)/i) ||
                         text.match(/(?:área\s*(?:total|do\s*terreno)|terreno)[:\s]*(\d+)\s*m[²2]?/i);
        const sizeMatch = text.match(/(\d+)\s*m[²2]/i);

        const usefulArea = utilMatch ? parseInt(utilMatch[1], 10) : 0;
        const totalArea = totMatch ? parseInt(totMatch[1] || totMatch[2], 10) : 0;
        const anyArea = sizeMatch ? parseInt(sizeMatch[1], 10) : 65;

        const bedMatch = text.match(/(\d+)\s*quarto/i);
        const bedrooms = bedMatch ? parseInt(bedMatch[1], 10) : 2;

        const img = card.querySelector('img:not([src*="/empresas/"])') || card.querySelector('img');
        const imgSrc = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';

        // Extract street
        const streetMatch = text.match(/(?:Rua|Avenida|Travessa|Alameda|Estrada|Praça)[^,\n•]+/i);
        const streetClean = streetMatch ? streetMatch[0].trim() : '';

        const pubMatch = text.match(/(?:(?:publicado|atualizado|criado|anunciado)\s*)?(?:h[áa]\s+\d+\s*(?:dia|hora|minuto|semana|m[êe]s|ano)s?|ontem|hoje|(?:publicado|atualizado|criado)[^•\n,]+)/i);
        const pubText = pubMatch ? pubMatch[0].trim() : 'Publicado hoje';

        const idMatch = href.match(/-(\d+)\.html/) || text.match(/id:\s*(\d+)/i);
        const id = idMatch ? `imovelweb-${idMatch[1]}` : `imovelweb-${Math.abs(href.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0))}`;

        // Headline / Título do anúncio
        const titleEl = card.querySelector('h2, h3, [class*="Title"], [data-qa="POSTING_CARD_TITLE"]');
        const rawTitle = titleEl ? (titleEl as HTMLElement).innerText.trim() : '';

        const condoMatch = text.match(/Cond\.?\s*R\$\s*([\d.]+)/i) || text.match(/Condom[íi]nio\s*R\$\s*([\d.]+)/i);
        const condoVal = condoMatch ? parseInt(condoMatch[1].replace(/\./g, ''), 10) : 0;
        const iptuMatch = text.match(/IPTU\s*R\$\s*([\d.]+)/i);
        const iptuVal = iptuMatch ? parseInt(iptuMatch[1].replace(/\./g, ''), 10) : 0;

        results.push({
          id,
          href,
          price,
          usefulArea,
          totalArea,
          anyArea,
          bedrooms,
          condoVal,
          iptuVal,
          streetClean,
          imgSrc,
          pubText,
          rawTitle,
          cardText: text
        });
      });

      return results;
    });

    await page.close();

    for (const item of rawListings) {
      if (!isListingActiveAndValid(item.cardText || '', item.href || '')) continue;
      const typo = detectTypologyFromUrlAndText(item.href || '', item.rawTitle || '', item.cardText || '');
      // Exclui completamente terrenos e lotes do módulo Flip e Locação
      if (typo.propertyType === 'Terreno') continue;

      const initialArea = item.usefulArea > 0 ? item.usefulArea : (item.anyArea > 0 ? item.anyArea : 65);
      const sanitizedArea = item.usefulArea > 0 ? item.usefulArea : sanitizePropertyArea(item.cardText || '', initialArea, typo.propertyType, item.price, item.href);
      const relDate = parseRelativePublicationDate(item.pubText);
      const m2Val = Math.round(item.price / (sanitizedArea || 1));

      const detectedNeigh = detectNeighborhoodFromCardAndUrl(item.href || '', item.cardText || '', neighborhood, city);
      const finalNeigh = detectedNeigh || neighborhood || city;

      // Trava de coerência geográfica
      if (neighborhood) {
        const normTarget = normalizeSlug(neighborhood);
        const normFinal = normalizeSlug(finalNeigh);
        if (normFinal && normTarget && normFinal !== normTarget) {
          console.log(`[Imovelweb] Descartando anúncio fora do bairro alvo: ${finalNeigh} (buscado: ${neighborhood}) - ${item.href}`);
          continue;
        }
      }

      const endClean = item.streetClean ? `${item.streetClean}, ${finalNeigh}` : finalNeigh;

      let displayTitle = '';
      if (typo.subtype === 'Sala Comercial') {
        displayTitle = `Sala Comercial com ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.subtype === 'Loja') {
        displayTitle = `Loja Comercial com ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.propertyType === 'Comercial') {
        displayTitle = `${typo.displayPrefix} com ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.propertyType === 'Casa') {
        displayTitle = `Casa com ${item.bedrooms} quartos, ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.subtype === 'Cobertura') {
        displayTitle = `Cobertura com ${item.bedrooms} quartos, ${sanitizedArea}m² em ${finalNeigh}`;
      } else if (typo.subtype === 'Kitnet / Studio') {
        displayTitle = `Kitnet / Studio com ${sanitizedArea}m² em ${finalNeigh}`;
      } else {
        displayTitle = `Apartamento com ${item.bedrooms} quartos, ${sanitizedArea}m² em ${finalNeigh}`;
      }

      listings.push({
        id: item.id,
        titulo: displayTitle,
        tipo_imovel: typo.propertyType,
        subtipo: typo.subtype,
        portal: 'Imovelweb',
        url_anuncio: item.href,
        imagem_url: item.imgSrc,
        cidade: city,
        bairro: finalNeigh,
        endereco: `${endClean}, ${city} - ${state.toUpperCase()}`,
        preco_anunciado: item.price,
        valor_condominio: item.condoVal || 0,
        valor_iptu: item.iptuVal || 0,
        area_m2: sanitizedArea,
        quartos: (typo.propertyType as string) === 'Terreno' || typo.propertyType === 'Comercial' ? 0 : item.bedrooms,
        vagas: 1,
        data_publicacao_iso: relDate.data_publicacao_iso,
        dias_publicado: relDate.dias_publicado,
        texto_publicacao: relDate.texto_publicacao,
        m2_anunciado: m2Val
      });
    }
  } catch (err: any) {
    console.warn(`[Imovelweb Puppeteer Falhou] ${err.message}`);
  } finally {
    if (ownBrowser && browser) {
      try { await browser.close(); } catch {}
    }
  }

  return listings;
}

// ==========================================
// CÁLCULO DE DESCONTO, ROI E ALERTA DE OPORTUNIDADE
// ==========================================
export function enrichListingsWithMarketBenchmark(
  listings: ScrapedPortalListing[],
  neighborhoodM2Benchmark?: number
): ScrapedPortalListing[] {
  if (listings.length === 0) return listings;

  let refM2 = neighborhoodM2Benchmark || 0;
  if (!refM2 || refM2 <= 1000) {
    const validM2List = listings.map(l => l.m2_anunciado).filter(m => m > 1000 && m < 50000).sort((a, b) => a - b);
    if (validM2List.length > 0) {
      const mid = Math.floor(validM2List.length / 2);
      refM2 = validM2List.length % 2 === 0
        ? Math.round((validM2List[mid - 1] + validM2List[mid]) / 2)
        : validM2List[mid];
    } else {
      refM2 = 3600;
    }
  }

  return listings.map(item => {
    let itemM2 = refM2;
    if (item.tipo_imovel && /casa|sobrado/i.test(item.tipo_imovel)) {
      itemM2 = Math.round(itemM2 * 0.58);
    }
    if (item.area_m2 > 120) {
      const scale = Math.max(0.50, Math.pow(100 / item.area_m2, 0.18));
      itemM2 = Math.round(itemM2 * scale);
    }

    const valorMercadoEstimado = Math.round(item.area_m2 * itemM2);
    const flipExit = Math.round(valorMercadoEstimado * 0.90);
    const diff = valorMercadoEstimado - item.preco_anunciado;
    const descontoMercadoPct = valorMercadoEstimado > 0 ? Math.round((diff / valorMercadoEstimado) * 100) : 0;

    // Cálculo exato de custos de aquisição e reforma para ROI do House Flip
    const preco = item.preco_anunciado;
    const itbi = Math.round(preco * 0.03);
    const registry = Math.round(preco * 0.02);
    const repair = Math.round(item.area_m2 * 350);
    const holding = Math.round(valorMercadoEstimado * 0.015);
    const totalCost = preco + itbi + registry + repair + holding + (item.valor_condominio || 0) + (item.valor_iptu || 0);
    const calculatedProfit = flipExit > totalCost ? Math.round(flipExit - totalCost) : 0;
    const calculatedRoi = totalCost > 0 ? Number(((calculatedProfit / totalCost) * 100).toFixed(2)) : 0;
    const oportunidadeAbaixoMercado = calculatedProfit > 0 && calculatedRoi >= 15;

    return {
      ...item,
      m2_referencia_bairro: itemM2,
      valor_mercado_estimado: valorMercadoEstimado,
      desconto_mercado_pct: descontoMercadoPct,
      oportunidade_abaixo_mercado: oportunidadeAbaixoMercado,
      calculatedProfit,
      calculatedRoi
    };
  });
}

// ==========================================
// CONVERSÃO PARA AUCTIONPROPERTY (COMPATIBILIDADE FEED/SISTEMA)
// ==========================================
export function convertPortalListingToAuctionProperty(
  listing: ScrapedPortalListing,
  userId = 'admin-marcus'
): AuctionProperty {
  const isRental = listing.transaction_type === 'aluguel';
  const todayStr = new Date().toISOString().split('T')[0];
  const preco = listing.preco_anunciado;
  const area = listing.area_m2 || 50;
  const m2Ref = listing.m2_referencia_bairro || 3600;
  const scale = area > 120 ? Math.max(0.50, Math.pow(100 / area, 0.18)) : 1.0;
  const scaledM2Ref = Math.round(m2Ref * scale);
  const estimatedVal = listing.valor_mercado_estimado && listing.valor_mercado_estimado <= Math.round(area * scaledM2Ref * 1.15)
    ? listing.valor_mercado_estimado
    : Math.round(area * scaledM2Ref);
  const flipExit = Math.round(estimatedVal * 0.90);
  const estimatedRepair = Math.round(area * 350);
  const itbi = Math.round(preco * 0.03);
  const registry = Math.round(preco * 0.02);
  const holding = Math.round(estimatedVal * 0.015);
  const totalCost = preco + itbi + registry + estimatedRepair + holding + (listing.valor_condominio || 0) + (listing.valor_iptu || 0);
  const netProfit = flipExit > totalCost ? Math.round(flipExit - totalCost) : 0;
  const calculatedRoi = totalCost > 0 ? Number(((netProfit / totalCost) * 100).toFixed(2)) : 0;
  const m2Anunciado = Math.round(preco / (area || 1));
  const diff = estimatedVal - preco;
  const descontoPct = (estimatedVal > 0 && diff > 0) ? Math.round((diff / estimatedVal) * 100) : 0;
  const oportunidadeAbaixoMercado = netProfit > 0 && calculatedRoi >= 15;

  // Métricas específicas de Locação Residencial (Aluguel, IPTU, Condomínio e Taxas Reais)
  const rent = preco;
  const condo = listing.valor_condominio || 0;
  const iptu = listing.valor_iptu || 0;
  const taxas = listing.taxas_servico || 0;
  const totalTaxas = condo + iptu + taxas;
  const totalRentalPackage = listing.total_rental_package || (rent + totalTaxas);
  const mediaLocacaoCalculadora = Math.round(estimatedVal * 0.0055);
  const rentDiffPct = mediaLocacaoCalculadora > 0 ? Math.round(((rent - mediaLocacaoCalculadora) / mediaLocacaoCalculadora) * 100) : 0;
  const vereditoLocacao = rentDiffPct <= -10 ? 'barato' : rentDiffPct >= 10 ? 'caro' : 'justo';
  const rentalProfit = Math.max(0, mediaLocacaoCalculadora - rent) * 12;
  const rentalRoi = estimatedVal > 0 ? Number(((rent * 12 / estimatedVal) * 100).toFixed(2)) : 0;

  return {
    id: `auc-${listing.id}`,
    title: listing.titulo,
    address: listing.endereco,
    neighborhood: listing.bairro,
    city: listing.cidade,
    propertyType: listing.tipo_imovel || 'Apartamento',
    priceVerified: true,
    sizeVerified: true,
    sizeSqm: area,
    auctionPrice: listing.preco_anunciado,
    estimatedRepair,
    pendingDebts: (listing.valor_condominio || 0) + (listing.valor_iptu || 0),
    otherCosts: 0,
    estimatedValue: estimatedVal,
    auctionDate: listing.data_publicacao_iso ? listing.data_publicacao_iso.split('T')[0] : todayStr,
    auctionLink: listing.url_anuncio,
    description: isRental
      ? `Imóvel residencial para locação anunciado no portal ${listing.portal}. ${listing.texto_publicacao}. Metragem de ${area}m²${listing.quartos > 0 ? ` com ${listing.quartos} quartos` : ''}${listing.vagas > 0 ? ` e ${listing.vagas} vagas` : ''}. Aluguel: R$ ${rent.toLocaleString('pt-BR')}/mês. Pacote total com taxas: R$ ${totalRentalPackage.toLocaleString('pt-BR')}/mês.`
      : `${listing.subtipo || listing.tipo_imovel || 'Imóvel'} anunciado no portal ${listing.portal}. ${listing.texto_publicacao}. Metragem de ${area}m²${listing.quartos > 0 ? ` com ${listing.quartos} quartos` : ''}${listing.vagas > 0 ? ` e ${listing.vagas} vagas` : ''}. Valor anunciado: R$ ${listing.preco_anunciado.toLocaleString('pt-BR')}.`,
    status: 'Pendente',
    occupied: false,
    state: listing.endereco.includes(' - ') ? listing.endereco.split(' - ')[1].slice(0, 2) : 'RJ',
    origin: 'portal',
    allowsFinancing: true,
    allowsInstallments: false,
    userId,
    bedrooms: listing.quartos,
    parkingSpaces: listing.vagas,

    // Geocodificação
    lat: (listing as any).lat || undefined,
    lng: (listing as any).lng || undefined,

    // Propriedades de Mídia e Imagens (compatibilidade dupla para renderização total)
    imageUrl: listing.imagem_url,
    imagemUrl: listing.imagem_url,

    // Propriedades do Módulo Flip / Locação
    transactionType: isRental ? 'aluguel' : 'venda',
    monthlyRent: isRental ? rent : undefined,
    aluguelMensal: isRental ? rent : undefined,
    portalName: listing.portal,
    precoAnunciado: listing.preco_anunciado,
    valorCondominio: condo,
    valorIptu: iptu,
    taxasServico: taxas,
    outrasTaxas: taxas,
    totalTaxas,
    totalRentalPackage,
    pacoteMoradiaTotal: totalRentalPackage,
    mediaLocacaoCalculadora: isRental ? mediaLocacaoCalculadora : undefined,
    aluguelDiferencaPct: isRental ? rentDiffPct : undefined,
    vereditoLocacao: isRental ? vereditoLocacao : undefined,
    dataPublicacaoIso: listing.data_publicacao_iso,
    diasPublicado: listing.dias_publicado,
    textoPublicacao: listing.texto_publicacao,
    oportunidadeAbaixoMercado: isRental ? rentDiffPct <= -10 : oportunidadeAbaixoMercado,
    descontoMercadoPct: isRental ? (rentDiffPct <= -10 ? Math.abs(rentDiffPct) : 0) : descontoPct,
    valorMercadoEstimado: estimatedVal,
    m2ReferenciaBairro: scaledM2Ref,
    m2Anunciado,

    // Rentabilidade e ROI Pré-calculados
    calculatedProfit: isRental ? rentalProfit : netProfit,
    calculatedRoi: isRental ? rentalRoi : calculatedRoi,

    // Preço de saída estritamente atrelado ao Flip Rápido (vendaBaixaPrice) da calculadora
    vendaBaixaPrice: flipExit,
    vendaMediaPrice: flipExit,
    isSobAnalise: false
  };
}

// ==========================================
// MOTOR PRINCIPAL DE EXTRAÇÃO POR BAIRRO
// ==========================================
export async function scrapeAllPortalsForNeighborhood(
  city: string,
  state: string,
  neighborhood: string,
  neighborhoodM2Benchmark?: number,
  options: {
    includeVivaReal?: boolean;
    includeZap?: boolean;
    includeImovelweb?: boolean;
    portals?: string[];
  } = {}
): Promise<ScrapedPortalListing[]> {
  console.log(`\n🚀 INICIANDO EXTRAÇÃO REAL DE PORTAIS (4 OFICIAIS): ${neighborhood}, ${city} - ${state.toUpperCase()}`);

  const activePortals = options.portals && options.portals.length > 0
    ? options.portals
    : ['Zap Imóveis', 'Viva Real', 'QuintoAndar', 'Imovelweb'];

  const allRaw: ScrapedPortalListing[] = [];

  // 1. QuintoAndar (Camada 1 HTTP + Next.js Hydrate)
  if (activePortals.includes('QuintoAndar')) {
    try {
      const qaList = await scrapeQuintoAndar(city, state, neighborhood);
      allRaw.push(...qaList);
      console.log(`✅ [QuintoAndar] ${qaList.length} imóveis reais de VENDA extraídos.`);
    } catch (e: any) {
      console.warn(`⚠️ [QuintoAndar] Falha:`, e.message);
    }
  }

  // 2, 3 & 4: Zap Imóveis, Viva Real e Imovelweb (Headless Stealth com sessão única de navegador)
  const needZap = activePortals.includes('Zap Imóveis') && options.includeZap !== false;
  const needVivaReal = activePortals.includes('Viva Real') && options.includeVivaReal !== false;
  const needImovelweb = activePortals.includes('Imovelweb') && options.includeImovelweb !== false;

  if (needZap || needVivaReal || needImovelweb) {
    let sharedBrowser: Browser | null = null;
    try {
      sharedBrowser = await launchPuppeteer(puppeteer, { headless: true });

      if (needZap) {
        try {
          const zapList = await scrapeZapImoveis(city, state, neighborhood, sharedBrowser);
          allRaw.push(...zapList);
          console.log(`✅ [Zap Imóveis] ${zapList.length} imóveis reais de VENDA extraídos.`);
        } catch (e: any) {
          console.warn(`⚠️ [Zap Imóveis] Falha:`, e.message);
        }
      }

      if (needVivaReal) {
        try {
          const vrList = await scrapeVivaReal(city, state, neighborhood, sharedBrowser);
          allRaw.push(...vrList);
          console.log(`✅ [Viva Real] ${vrList.length} imóveis reais de VENDA extraídos.`);
        } catch (e: any) {
          console.warn(`⚠️ [Viva Real] Falha:`, e.message);
        }
      }

      if (needImovelweb) {
        try {
          const iwList = await scrapeImovelweb(city, state, neighborhood, sharedBrowser);
          allRaw.push(...iwList);
          console.log(`✅ [Imovelweb] ${iwList.length} imóveis reais de VENDA extraídos.`);
        } catch (e: any) {
          console.warn(`⚠️ [Imovelweb] Falha:`, e.message);
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ [Headless Browser Error]:`, e.message);
    } finally {
      if (sharedBrowser) {
        try { await sharedBrowser.close(); } catch {}
      }
    }
  }

  // Deduplicação estrita por URL e por ID
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const deduped: ScrapedPortalListing[] = [];

  for (const item of allRaw) {
    if (!item.preco_anunciado || item.preco_anunciado < 80000) continue;
    if (seenUrls.has(item.url_anuncio) || seenIds.has(item.id)) continue;
    seenUrls.add(item.url_anuncio);
    seenIds.add(item.id);
    deduped.push(item);
  }

  console.log(`📊 Total consolidado de anúncios únicos no bairro ${neighborhood}: ${deduped.length}`);

  // Etapa 5: Enriquecimento com valor de mercado, ROI e alertas
  const enriched = enrichListingsWithMarketBenchmark(deduped, neighborhoodM2Benchmark);
  const oportunidades = enriched.filter(e => e.oportunidade_abaixo_mercado);
  console.log(`🔥 Oportunidades abaixo do valor de mercado (-15% a -50%): ${oportunidades.length}`);

  return enriched;
}

// ==========================================
// MOTOR PRINCIPAL DE EXTRAÇÃO DE LOCAÇÃO (ALUGUEL RESIDENCIAL)
// ==========================================
export async function scrapeAllPortalsForRentalNeighborhood(
  city: string,
  state: string,
  neighborhood: string,
  neighborhoodM2Benchmark?: number,
  options: {
    portals?: string[];
  } = {}
): Promise<ScrapedPortalListing[]> {
  console.log(`\n🔑 INICIANDO EXTRAÇÃO REAL DE LOCAÇÃO (ALUGUEL): ${neighborhood}, ${city} - ${state.toUpperCase()}`);

  const activePortals = options.portals && options.portals.length > 0
    ? options.portals
    : ['Zap Imóveis', 'Viva Real', 'QuintoAndar', 'Imovelweb'];

  const allRaw: ScrapedPortalListing[] = [];

  // 1. QuintoAndar (Camada 1 HTTP + Next.js Hydrate de Aluguel Real)
  if (activePortals.includes('QuintoAndar')) {
    try {
      const qaList = await scrapeQuintoAndarRental(city, state, neighborhood);
      allRaw.push(...qaList);
      console.log(`✅ [QuintoAndar] ${qaList.length} imóveis reais de LOCAÇÃO extraídos.`);
    } catch (e: any) {
      console.warn(`⚠️ [QuintoAndar Locação] Falha:`, e.message);
    }
  }

  // Deduplicação estrita por URL e por ID
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const deduped: ScrapedPortalListing[] = [];

  for (const item of allRaw) {
    if (!item.preco_anunciado || item.preco_anunciado < 300) continue;
    if (seenUrls.has(item.url_anuncio) || seenIds.has(item.id)) continue;
    seenUrls.add(item.url_anuncio);
    seenIds.add(item.id);
    deduped.push(item);
  }

  console.log(`📊 Total consolidado de anúncios de locação únicos no bairro ${neighborhood}: ${deduped.length}`);

  // Enriquecimento com benchmark de mercado
  const enriched = enrichListingsWithMarketBenchmark(deduped, neighborhoodM2Benchmark);
  return enriched;
}
