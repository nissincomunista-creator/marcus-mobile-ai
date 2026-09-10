import puppeteer, { Browser } from 'puppeteer';
import fs from 'fs';
import path from 'path';

export interface PortalListing {
  title: string;
  price: number;
  sizeSqm: number;
  unitValueSqm: number;
  address: string;
  link: string;
  portal: 'QuintoAndar' | 'ZapImóveis';
  description: string;
}

export interface PortalComparisonResult {
  fallback: boolean;
  verified: boolean;
  checkedAt: string;
  message?: string;
  totalFound: number;
  streetMatchesCount: number;
  below: {
    range: string;
    avgPrice: number;
    avgSqm: number;
    matches: PortalListing[];
  };
  close: {
    range: string;
    avgPrice: number;
    avgSqm: number;
    matches: PortalListing[];
  };
  above: {
    range: string;
    avgPrice: number;
    avgSqm: number;
    matches: PortalListing[];
  };
}

const PORTAL_LIVE_CACHE_PATH = path.join(process.cwd(), 'portal_live_cache.json');
let liveCache: Record<string, { timestamp: number; data: PortalComparisonResult }> = {};

if (fs.existsSync(PORTAL_LIVE_CACHE_PATH)) {
  try {
    liveCache = JSON.parse(fs.readFileSync(PORTAL_LIVE_CACHE_PATH, 'utf-8'));
  } catch (e) {
    console.error('Error reading portal_live_cache.json:', e);
  }
}

function saveLiveCache() {
  try {
    fs.writeFileSync(PORTAL_LIVE_CACHE_PATH, JSON.stringify(liveCache, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving portal_live_cache.json:', e);
  }
}

function normalizeSlug(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeSearchText(value: string): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function streetCore(value: string): string {
  return normalizeSearchText(value)
    .replace(/^(rua|r|avenida|av|estrada|travessa|alameda|praca)\s+/, '')
    .replace(/\s+(n|numero)?\s*\d+.*$/, '')
    .trim();
}

function isIndividualPortalLink(link: string): boolean {
  try {
    const url = new URL(link);
    const allowed = url.hostname.endsWith('quintoandar.com.br') || url.hostname.endsWith('zapimoveis.com.br');
    return allowed && /\/imovel\//i.test(url.pathname);
  } catch {
    return false;
  }
}

export async function scrapeLivePortals(params: {
  state: string;
  city: string;
  neighborhood: string;
  street?: string;
  propertyType?: string;
  sizeSqm?: number;
  bedrooms?: number;
  parkingSpaces?: number;
}): Promise<PortalComparisonResult> {
  const { state, city, neighborhood, street, propertyType, sizeSqm, bedrooms } = params;

  const targetSize = sizeSqm && sizeSqm > 0 ? sizeSqm : 70;
  const targetBeds = bedrooms && bedrooms > 0 ? bedrooms : 2;
  const uf = (state || 'RJ').toUpperCase();
  const ufSlug = (state || 'rj').toLowerCase();
  const citySlug = normalizeSlug(city || (uf === 'RJ' ? 'rio de janeiro' : 'sao paulo'));
  const neighSlug = normalizeSlug(neighborhood || '');
  const streetClean = (street || '').trim();
  const streetSlug = normalizeSlug(streetClean);

  const cacheKey = `v2_${ufSlug}_${citySlug}_${neighSlug}_${streetSlug}_${targetSize}_${targetBeds}`;
  if (liveCache[cacheKey]) {
    const entry = liveCache[cacheKey];
    if (Date.now() - entry.timestamp < 12 * 60 * 60 * 1000) {
      console.log(`[Portal Live Scraper] Retornando cache válido para: ${cacheKey}`);
      return entry.data;
    }
  }

  console.log(`[Portal Live Scraper] Iniciando varredura real: Rua "${streetClean}", ${neighborhood}, ${city}-${uf}`);

  const allListings: PortalListing[] = [];
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const rt = req.resourceType();
      if (rt === 'image' || rt === 'media' || rt === 'font' || rt === 'stylesheet') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 1. QuintoAndar Scrape
    try {
      let quintoUrl = `https://www.quintoandar.com.br/comprar/imovel/${citySlug}-${ufSlug}/${neighSlug}`;
      if (targetBeds) quintoUrl += `?quartos=${targetBeds}`;

      console.log('[Portal Live Scraper] Acessando QuintoAndar:', quintoUrl);
      await page.goto(quintoUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await new Promise(r => setTimeout(r, 500));

      const quintoCards = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid="house-card"], [class*="HouseCard"], a[href*="/imovel/"]');
        const list: { text: string; href: string }[] = [];
        cards.forEach(c => {
          const text = (c as HTMLElement).innerText || '';
          const href = c.getAttribute('href') || (c.querySelector('a') ? c.querySelector('a')!.getAttribute('href') : '');
          if (text && text.includes('R$') && (text.includes('m²') || text.includes('quarto'))) {
            list.push({ text, href: href || '' });
          }
        });
        return list;
      });

      console.log(`[Portal Live Scraper] QuintoAndar cards brutos: ${quintoCards.length}`);

      for (const card of quintoCards) {
        const lines = card.text.split('\n').map(l => l.trim()).filter(Boolean);
        const textBlock = lines.join(' • ');

        const priceMatch = textBlock.match(/R\$\s*([\d.]+)/);
        if (!priceMatch) continue;
        const priceVal = parseInt(priceMatch[1].replace(/\./g, ''), 10);
        if (isNaN(priceVal) || priceVal < 50000) continue;

        const sizeMatch = textBlock.match(/(\d+)\s*m²/);
        const cardSize = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;

        const bedMatch = textBlock.match(/(\d+)\s*quarto/);
        const cardBeds = bedMatch ? parseInt(bedMatch[1], 10) : targetBeds;

        const streetMatch = textBlock.match(/(?:Rua|Avenida|Travessa|Alameda|Estrada|Praça)[^•|]+/i);
        const cardStreet = streetMatch ? streetMatch[0].trim() : '';

        const link = card.href
          ? (card.href.startsWith('http') ? card.href : `https://www.quintoandar.com.br${card.href}`)
          : quintoUrl;

        const unitVal = cardSize > 0 ? Math.round(priceVal / cardSize) : 0;

        allListings.push({
          title: `Imóvel com ${cardBeds} qtos, ${cardSize}m² em ${neighborhood}`,
          price: priceVal,
          sizeSqm: cardSize,
          unitValueSqm: unitVal,
          address: [cardStreet, neighborhood, `${city} - ${uf}`].filter(Boolean).join(', '),
          link,
          portal: 'QuintoAndar',
          description: textBlock.slice(0, 180)
        });
      }
    } catch (e: any) {
      console.warn('[Portal Live Scraper] QuintoAndar scraping warning:', e.message);
    }

    // 2. ZapImóveis Scrape
    try {
      let zapUrl = `https://www.zapimoveis.com.br/venda/imoveis/${ufSlug}+${citySlug}+${neighSlug}/`;
      if (streetSlug && streetClean.length >= 5) {
        zapUrl = `https://www.zapimoveis.com.br/venda/imoveis/${ufSlug}+${citySlug}+${neighSlug}+${streetSlug}/`;
      }

      console.log('[Portal Live Scraper] Acessando ZapImóveis:', zapUrl);
      await page.goto(zapUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await new Promise(r => setTimeout(r, 500));

      const zapCards = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid="listing-card"], [class*="card-container"], a[href*="/imovel/"]');
        const list: { text: string; href: string }[] = [];
        cards.forEach(c => {
          const text = (c as HTMLElement).innerText || '';
          const href = c.getAttribute('href') || (c.querySelector('a') ? c.querySelector('a')!.getAttribute('href') : '');
          if (text && text.includes('R$')) {
            list.push({ text, href: href || '' });
          }
        });
        return list;
      });

      console.log(`[Portal Live Scraper] ZapImóveis cards brutos: ${zapCards.length}`);

      for (const card of zapCards) {
        const textBlock = card.text.replace(/\n+/g, ' • ');
        const priceMatch = textBlock.match(/R\$\s*([\d.]+)/);
        if (!priceMatch) continue;
        const priceVal = parseInt(priceMatch[1].replace(/\./g, ''), 10);
        if (isNaN(priceVal) || priceVal < 50000) continue;

        const sizeMatch = textBlock.match(/(\d+)\s*m²/);
        const cardSize = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;

        const bedMatch = textBlock.match(/(\d+)\s*quarto/);
        const cardBeds = bedMatch ? parseInt(bedMatch[1], 10) : targetBeds;

        const streetMatch = textBlock.match(/(?:Rua|Avenida|Travessa|Alameda|Estrada|Praça)[^•|]+/i);
        const cardStreet = streetMatch ? streetMatch[0].trim() : '';

        const link = card.href
          ? (card.href.startsWith('http') ? card.href : `https://www.zapimoveis.com.br${card.href}`)
          : zapUrl;

        allListings.push({
          title: `Imóvel com ${cardBeds} qtos, ${cardSize}m² em ${streetClean || neighborhood}`,
          price: priceVal,
          sizeSqm: cardSize,
          unitValueSqm: cardSize > 0 ? Math.round(priceVal / cardSize) : 0,
          address: [cardStreet, neighborhood, `${city} - ${uf}`].filter(Boolean).join(', '),
          link,
          portal: 'ZapImóveis',
          description: textBlock.slice(0, 180)
        });
      }
    } catch (e: any) {
      console.warn('[Portal Live Scraper] ZapImóveis scraping warning:', e.message);
    }

    // Muitos cards omitem a rua e a metragem. Confirme esses campos na página
    // individual antes de decidir se o anúncio pertence à via pesquisada.
    const targetCore = streetCore(streetClean);
    const detailCandidates = Array.from(new Map(allListings
      .filter(listing => isIndividualPortalLink(listing.link))
      .filter(listing => !(targetCore && streetCore(listing.address).includes(targetCore) && listing.sizeSqm > 0))
      .map(listing => [listing.link, listing])).values()).slice(0, 6);
    let detailCursor = 0;
    const detailWorker = async () => {
      const detailPage = await browser!.newPage();
      await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      await detailPage.setRequestInterception(true);
      detailPage.on('request', (request) => {
        const type = request.resourceType();
        if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') request.abort();
        else request.continue();
      });
      try {
        while (detailCursor < detailCandidates.length) {
          const listing = detailCandidates[detailCursor++];
          try {
            await detailPage.goto(listing.link, { waitUntil: 'domcontentloaded', timeout: 5000 });
            await new Promise(r => setTimeout(r, 250));
            const detailText = await detailPage.evaluate(() => {
              const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                .map(script => script.textContent || '')
                .join('\n');
              return `${document.body?.innerText || ''}\n${jsonLd}`;
            });
            const detailNorm = normalizeSearchText(detailText);
            if (targetCore && !detailNorm.includes(targetCore)) continue;

            const sizeMatch = detailText.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i) || detailText.match(/"floorSize"\s*:\s*\{[^}]*"value"\s*:\s*"?(\d+(?:[.,]\d+)?)/i);
            const priceMatch = detailText.match(/R\$\s*([\d.]+(?:,\d{2})?)/i) || detailText.match(/"price"\s*:\s*"?(\d{5,})/i);
            const confirmedSize = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : listing.sizeSqm;
            const confirmedPrice = priceMatch
              ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.')))
              : listing.price;
            if (confirmedSize > 0) listing.sizeSqm = confirmedSize;
            if (confirmedPrice >= 50000) listing.price = confirmedPrice;
            listing.unitValueSqm = listing.sizeSqm > 0 ? Math.round(listing.price / listing.sizeSqm) : 0;
            listing.address = [streetClean, neighborhood, `${city} - ${uf}`].filter(Boolean).join(', ');
          } catch (detailError: any) {
            console.warn(`[Portal Live Scraper] Detalhe indisponível (${listing.link}): ${detailError.message}`);
          }
        }
      } finally {
        await detailPage.close().catch(() => undefined);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, detailCandidates.length) }, () => detailWorker()));

  } catch (err: any) {
    console.error('[Portal Live Scraper] Browser launch/execution error:', err.message);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }

  // Deduplicate listings by price + size
  const seen = new Set<string>();
  const uniqueListings: PortalListing[] = [];
  const targetStreetNorm = streetCore(streetClean);
  for (const item of allListings) {
    if (!isIndividualPortalLink(item.link)) continue;
    if (item.sizeSqm <= 0 || item.unitValueSqm <= 0) continue;
    if (targetStreetNorm && !streetCore(item.address).includes(targetStreetNorm)) continue;
    const key = `${item.price}_${item.sizeSqm}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueListings.push(item);
    }
  }

  console.log(`[Portal Live Scraper] Total de anúncios únicos raspados com sucesso: ${uniqueListings.length}`);

  const minBelow = Math.round(targetSize * 0.7);
  const maxBelow = Math.round(targetSize * 0.9);
  const minClose = Math.round(targetSize * 0.9);
  const maxClose = Math.round(targetSize * 1.1);
  const minAbove = Math.round(targetSize * 1.1);
  const maxAbove = Math.round(targetSize * 1.35);

  const belowMatches = uniqueListings.filter(l => l.sizeSqm < maxBelow);
  const closeMatches = uniqueListings.filter(l => l.sizeSqm >= minClose && l.sizeSqm <= maxClose);
  const aboveMatches = uniqueListings.filter(l => l.sizeSqm > minAbove);

  if (closeMatches.length === 0 && uniqueListings.length > 0) {
    closeMatches.push(...uniqueListings.slice(0, Math.min(uniqueListings.length, 6)));
  }

  const computeStats = (matches: PortalListing[]) => {
    if (matches.length === 0) return { avgPrice: 0, avgSqm: 0 };
    const sumPrice = matches.reduce((acc, m) => acc + m.price, 0);
    const sumSqm = matches.reduce((acc, m) => acc + m.unitValueSqm, 0);
    return {
      avgPrice: Math.round(sumPrice / matches.length),
      avgSqm: Math.round(sumSqm / matches.length)
    };
  };

  const belowStats = computeStats(belowMatches);
  const closeStats = computeStats(closeMatches);
  const aboveStats = computeStats(aboveMatches);

  const streetMatches = uniqueListings.filter(l => streetClean && streetCore(l.address).includes(streetCore(streetClean)));

  const result: PortalComparisonResult = {
    fallback: uniqueListings.length === 0,
    verified: uniqueListings.length > 0,
    checkedAt: new Date().toISOString(),
    message: uniqueListings.length > 0
      ? `${uniqueListings.length} anúncios individuais confirmados na rua.`
      : 'Nenhum anúncio individual com endereço e link confirmados foi encontrado nesta rua.',
    totalFound: uniqueListings.length,
    streetMatchesCount: streetMatches.length,
    below: {
      range: `${minBelow}m² - ${maxBelow}m²`,
      avgPrice: belowStats.avgPrice,
      avgSqm: belowStats.avgSqm,
      matches: belowMatches
    },
    close: {
      range: `${minClose}m² - ${maxClose}m²`,
      avgPrice: closeStats.avgPrice,
      avgSqm: closeStats.avgSqm,
      matches: closeMatches
    },
    above: {
      range: `${minAbove}m² - ${maxAbove}m²`,
      avgPrice: aboveStats.avgPrice,
      avgSqm: aboveStats.avgSqm,
      matches: aboveMatches
    }
  };

  if (uniqueListings.length > 0) {
    liveCache[cacheKey] = {
      timestamp: Date.now(),
      data: result
    };
    saveLiveCache();
  }

  return result;
}
