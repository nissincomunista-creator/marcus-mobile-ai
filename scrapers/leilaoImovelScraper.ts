import puppeteer, { Browser, Page } from 'puppeteer';
import { launchPuppeteer } from '../src/utils/puppeteerConfig.ts';
import { toCanonicalPropertyType, housePattern } from '../src/utils/propertyTypes.ts';
import { getCanonicalPropertyKey } from '../auctionIdentity.ts';
import { canonicalAuctionLink } from '../auctioneerSyncService.ts';
import type { AuctionProperty, PropertyType } from '../src/types.ts';
import fs from 'node:fs';
import path from 'node:path';

export interface LeilaoImovelRawBox {
  url: string;
  imgSrc: string;
  imgAlt: string;
  title: string;
  address: string;
  discountPrice: string;
  lastPrice: string;
  dateText: string;
  categories: string[];
  fullText: string;
}

export interface ScrapeOptions {
  targets?: Array<{ city: string; slug: string; state: string }>;
  maxPagesPerTarget?: number; // default unlimited (page++ until 0 items)
  onBatch?: (auctions: Partial<AuctionProperty>[]) => Promise<{ imported: number; updated: number }>;
  onProgress?: (info: { page: number; totalCollected: number; target: string; status: string }) => void;
  filterTipo?: number; // 1 for casas, etc.
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
];

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function parseMoney(str?: string): number {
  if (!str) return 0;
  const clean = str.replace(/[^\d.,]/g, '').trim();
  if (!clean) return 0;
  const num = Number(clean.replace(/\./g, '').replace(',', '.'));
  return isNaN(num) ? 0 : num;
}

function parseDate(str?: string): string {
  if (!str) return '';
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function parseRawBoxToAuction(box: LeilaoImovelRawBox, defaultCity: string, defaultState: string): Partial<AuctionProperty> {
  const normTitle = box.title.trim();
  const normAddress = box.address.trim();
  const fullText = `${normTitle} ${normAddress} ${box.fullText} ${box.imgAlt}`;

  // 1. Property Type Normalization with compulsory CASA regex
  const propertyType: PropertyType = toCanonicalPropertyType('', normTitle, fullText);

  // 2. Financials
  const auctionPrice = parseMoney(box.discountPrice);
  const evaluationPrice = parseMoney(box.lastPrice);
  const auctionDate = parseDate(box.dateText);

  // 3. Extract Caixa ID & Number
  const caixaNumMatch = box.imgAlt.match(/\[['"]?(\d{10,16})['"]?\]/)
    || box.url.match(/-(?:cef-)?\d{5,8}-(\d{10,16})-/i)
    || fullText.match(/\b(?:cef\s*|caixa\s*|n[ºo°.]\s*im[oó]vel\s*)(\d{10,16})\b/i);
  const caixaNumber = caixaNumMatch ? caixaNumMatch[1] : undefined;

  const isCaixa = Boolean(caixaNumber) || /caixa(?:\s+econ[oô]mica|\s+federal|\s*cef|\.gov|\b)/i.test(fullText);

  // 4. Judicial Process
  const processMatch = fullText.match(/\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/)?.[1]
    || fullText.match(/\bprocesso\s*(?:n[ºo°.]*)?\s*:?\s*(\d{15,25})\b/i)?.[1];
  const isJudicial = !isCaixa && (Boolean(processMatch) || /judicial|vara\s+c[ií]vel/i.test(fullText));

  // 5. Origin
  const origin: AuctionProperty['origin'] = isCaixa ? 'caixa' : (isJudicial ? 'judicial' : 'extrajudicial');

  // 6. Location Extraction
  let bairro = '';
  // Try extracting neighborhood from imgAlt e.g. ['Itanhangá'] - ['Rio De Janeiro']
  const altBairroMatch = box.imgAlt.match(/\[['"]([^'"]+)['"]\]\s*-\s*\[['"][^'"]+['"]\]\//);
  if (altBairroMatch) {
    bairro = altBairroMatch[1].trim();
  }
  if (!bairro) {
    // Try from address e.g. "FREGUESIA (ILHA DO GOVERNADOR) - CEP:"
    const addrBairroMatch = normAddress.match(/,\s*([A-ZÀ-Ú\s()]+?)\s*-\s*CEP:/i)
      || normAddress.match(/-\s*([A-Za-zÀ-ÿ\s()]+?)\s*-\s*CEP:/i);
    if (addrBairroMatch) {
      bairro = addrBairroMatch[1].trim();
    }
  }

  // City & State
  let city = defaultCity;
  let state = defaultState.toUpperCase();
  const cityStateAltMatch = box.imgAlt.match(/\[['"]([^'"]+)['"]\]\/\[['"]([A-Z]{2})['"]\]/i);
  if (cityStateAltMatch) {
    city = cityStateAltMatch[1].trim();
    state = cityStateAltMatch[2].trim().toUpperCase();
  }

  // 7. Area (m²) extraction from slug or text
  const sizeMatch = box.url.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metros)/i)
    || fullText.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metros\s+quadrados)/i);
  const sizeSqm = sizeMatch ? Number(sizeMatch[1].replace(',', '.')) : 0;

  // 8. Bedrooms & Parking spaces from slug/text
  const bedroomsMatch = box.url.match(/(\d+)-quartos/i) || fullText.match(/(\d+)\s*(?:qto|quarto)/i);
  const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : undefined;

  const parkingMatch = box.url.match(/(\d+)-vaga/i) || fullText.match(/(\d+)\s*(?:vaga|garagem)/i);
  const parkingSpaces = parkingMatch ? parseInt(parkingMatch[1]) : undefined;

  // 9. Payment Terms / Conditions
  const allowsFinancing = box.categories.some(c => /financiamento/i.test(c)) || /financiamento/i.test(fullText);
  const saleMode = box.categories.find(c => /venda|leil[aã]o|licita[cç][aã]o/i.test(c)) || (isCaixa ? 'Venda Online' : 'Leilão Público');

  // 10. Zero Discard Policy flag
  // If street address or size is not fully detailed, do NOT discard: flag requer_auditoria_endereco = true
  const isAddressIncomplete = !normAddress || normAddress.length < 8 || !/\d/.test(normAddress);
  const requer_auditoria_endereco = isAddressIncomplete || sizeSqm === 0;

  // 11. Canonical Deduplication Key
  const canonicalPropertyId = getCanonicalPropertyKey({
    origin,
    id: caixaNumber ? `auc-caixa-${caixaNumber}` : undefined,
    auctionLink: box.url,
    title: normTitle,
    description: fullText,
    address: normAddress,
    neighborhood: bairro,
    city,
    state,
    processNumber: processMatch
  }) || (caixaNumber ? `CAIXA_${caixaNumber}` : undefined);

  const cleanLink = canonicalAuctionLink(box.url);

  return {
    id: caixaNumber ? `auc-caixa-${caixaNumber}` : `auc-leilaoimovel-${Buffer.from(cleanLink).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`,
    canonicalPropertyId: canonicalPropertyId || undefined,
    title: normTitle,
    address: normAddress || `${bairro || city}, ${city} - ${state}`,
    neighborhood: bairro || 'Não informado',
    city,
    state,
    propertyType,
    sizeSqm,
    sizeApproximate: sizeSqm === 0,
    auctionPrice,
    evaluationPrice: evaluationPrice > 0 ? evaluationPrice : undefined,
    estimatedValue: evaluationPrice > 0 ? evaluationPrice : undefined,
    auctionDate,
    firstAuctionDate: auctionDate,
    firstAuctionPrice: auctionPrice,
    auctionLink: cleanLink,
    sourceLinks: [cleanLink],
    imageUrl: box.imgSrc || undefined,
    description: fullText.slice(0, 800),
    origin,
    allowsFinancing,
    saleMode,
    bedrooms,
    parkingSpaces,
    status: 'Pendente',
    occupied: true,
    priceVerified: auctionPrice > 0,
    sizeVerified: sizeSqm > 0,
    addressVerified: !isAddressIncomplete,
    requer_auditoria_endereco,
    precisa_revisao: requer_auditoria_endereco,
    ingestionStatus: 'ativo',
    lastSyncedAt: new Date().toISOString()
  };
}

export async function scrapeLeilaoImovel(options: ScrapeOptions = {}): Promise<{
  totalCollected: number;
  totalNew: number;
  totalUpdated: number;
  casasCount: number;
}> {
  const targets = options.targets || [
    { city: 'Rio de Janeiro', slug: 'rio-de-janeiro', state: 'RJ' },
    { city: 'Niterói', slug: 'niteroi', state: 'RJ' }
  ];

  let totalCollected = 0;
  let totalNew = 0;
  let totalUpdated = 0;
  let casasCount = 0;

  console.log(`[Leilão Imóvel Scraper] Iniciando varredura sem limites para ${targets.map(t => t.city).join(', ')}...`);

  let browser: Browser | null = null;
  try {
    browser = await launchPuppeteer(puppeteer, {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await page.setUserAgent(getRandomUserAgent());
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Upgrade-Insecure-Requests': '1'
    });

    for (const target of targets) {
      let currentPage = 1;
      let consecutiveEmptyPages = 0;
      console.log(`\n[Leilão Imóvel Scraper] === Varrendo Alvo: ${target.city} (${target.state}) ===`);

      while (true) {
        if (options.maxPagesPerTarget && currentPage > options.maxPagesPerTarget) {
          console.log(`[Leilão Imóvel Scraper] Limite manual de ${options.maxPagesPerTarget} páginas atingido para ${target.city}.`);
          break;
        }

        const tipoParam = options.filterTipo ? `&tipo=${options.filterTipo}` : '';
        const url = `https://www.leilaoimovel.com.br/leilao-de-imovel/${target.slug}-${target.state.toLowerCase()}?pag=${currentPage}${tipoParam}`;

        // Anti-blocking dynamic delay: 800ms - 1500ms
        const delay = Math.floor(Math.random() * (1500 - 800 + 1) + 800);
        await wait(delay);

        let attempts = 0;
        let boxes: LeilaoImovelRawBox[] = [];

        while (attempts < 3) {
          attempts++;
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });

            // Check Cloudflare challenge
            const title = await page.title();
            if (title.includes('Just a moment') || title.includes('Access Denied')) {
              console.warn(`[Leilão Imóvel Scraper] Cloudflare detectado na pág. ${currentPage} (tentativa ${attempts}), aguardando backoff de ${attempts * 2500}ms...`);
              await wait(attempts * 2500);
              await page.setUserAgent(getRandomUserAgent());
              continue;
            }

            boxes = await page.evaluate(() => {
              const elements = Array.from(document.querySelectorAll('.place-box'));
              return elements.map(b => {
                const a = b.querySelector('a[href*="/imovel/"]') as HTMLAnchorElement | null;
                const img = b.querySelector('img') as HTMLImageElement | null;
                const titleEl = b.querySelector('.address p b, h2, h3, .title') as HTMLElement | null;
                const addrEl = b.querySelector('.address p span, .address span') as HTMLElement | null;
                const discountEl = b.querySelector('.discount-price, .price .discount-price') as HTMLElement | null;
                const lastPriceEl = b.querySelector('.last-price') as HTMLElement | null;
                const dateEl = b.querySelector('.tag span, .infos span') as HTMLElement | null;
                const categories = Array.from(b.querySelectorAll('.categories a')).map(c => (c as HTMLElement).innerText.trim());

                if (!a) return null;
                return {
                  url: a.href,
                  imgSrc: img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '',
                  imgAlt: img ? (img.getAttribute('alt') || '') : '',
                  title: titleEl ? titleEl.innerText.trim() : (b.querySelector('.address p') as HTMLElement)?.innerText || '',
                  address: addrEl ? addrEl.innerText.trim() : '',
                  discountPrice: discountEl ? discountEl.innerText.trim() : '',
                  lastPrice: lastPriceEl ? lastPriceEl.innerText.trim() : '',
                  dateText: dateEl ? dateEl.innerText.trim() : '',
                  categories,
                  fullText: (b as HTMLElement).innerText || ''
                };
              }).filter((x): x is NonNullable<typeof x> => Boolean(x && x.url));
            });

            if (boxes.length > 0) break;
            // If empty, pause briefly to allow dynamic content before retrying
            await wait(1200 * attempts);
          } catch (err: any) {
            console.warn(`[Leilão Imóvel Scraper] Pág. ${currentPage} erro tentativa ${attempts}: ${err.message}`);
            await wait(1800 * attempts);
          }
        }

        // Loop Infinito até o Esgotamento Real: para apenas quando array for rigorosamente vazio
        if (boxes.length === 0) {
          consecutiveEmptyPages++;
          console.log(`[Leilão Imóvel Scraper] Pág. ${currentPage} retornou 0 imóveis (vazio consecutivo: ${consecutiveEmptyPages}).`);
          if (consecutiveEmptyPages >= 2) {
            console.log(`[Leilão Imóvel Scraper] Esgotamento real confirmado para ${target.city} na página ${currentPage}. Fim da varredura deste alvo.`);
            break;
          }
          currentPage++;
          continue;
        }

        consecutiveEmptyPages = 0;
        totalCollected += boxes.length;

        // Transform into canonical auction drafts
        const parsedAuctions = boxes.map(b => parseRawBoxToAuction(b, target.city, target.state));
        for (const auc of parsedAuctions) {
          if (auc.propertyType === 'Casa') casasCount++;
        }

        if (options.onBatch) {
          const counts = await options.onBatch(parsedAuctions);
          totalNew += counts.imported;
          totalUpdated += counts.updated;
        }

        if (currentPage % 5 === 0 || currentPage === 1) {
          console.log(`[Leilão Imóvel Scraper] ${target.city} - Pág. ${currentPage} processada: +${boxes.length} lotes (Total coletado: ${totalCollected} | Casas: ${casasCount})`);
        }

        if (options.onProgress) {
          options.onProgress({
            page: currentPage,
            totalCollected,
            target: target.city,
            status: 'running'
          });
        }

        currentPage++;
      }
    }
  } catch (err: any) {
    console.error('[Leilão Imóvel Scraper] Erro fatal na sessão:', err.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  console.log(`\n[Leilão Imóvel Scraper] Varredura Concluída com Sucesso!`);
  console.log(`Total Coletado: ${totalCollected} | Novos Importados: ${totalNew} | Atualizados/Desduplicados: ${totalUpdated} | Total Casas: ${casasCount}`);

  return { totalCollected, totalNew, totalUpdated, casasCount };
}

// Standalone execution script
if (process.argv[1] && process.argv[1].endsWith('leilaoImovelScraper.ts')) {
  (async () => {
    const storePath = path.join(process.cwd(), 'data_store.json');
    let storeData: any = { auctions: [], itbiTransactions: [] };
    if (fs.existsSync(storePath)) {
      try { storeData = JSON.parse(fs.readFileSync(storePath, 'utf8')); } catch {}
    }

    const { getCanonicalPropertyKey: getKey } = await import('../auctionIdentity.ts');

    // Index existing auctions by canonical key and links
    const linkMap = new Map<string, any>();
    const keyMap = new Map<string, any>();

    for (const a of storeData.auctions) {
      if (a.auctionLink) linkMap.set(canonicalAuctionLink(a.auctionLink), a);
      for (const sl of a.sourceLinks || []) linkMap.set(canonicalAuctionLink(sl), a);
      const k = a.canonicalPropertyId || getKey(a);
      if (k) keyMap.set(k, a);
    }

    console.log(`[CLI Scraper] Store inicial com ${storeData.auctions.length} leilões.`);

    const filterTipoArg = process.argv.find(a => a.startsWith('--tipo='));
    const filterTipo = filterTipoArg ? parseInt(filterTipoArg.split('=')[1]) : undefined;

    const maxPagesArg = process.argv.find(a => a.startsWith('--maxPages='));
    const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : undefined;

    await scrapeLeilaoImovel({
      filterTipo,
      maxPagesPerTarget: maxPages,
      onBatch: async (batch) => {
        let imported = 0;
        let updated = 0;

        for (const draft of batch) {
          const canonKey = draft.canonicalPropertyId;
          const cleanLink = canonicalAuctionLink(draft.auctionLink || '');

          const existing = (cleanLink && linkMap.get(cleanLink))
            || (canonKey && keyMap.get(canonKey));

          if (existing) {
            updated++;
            // Atualizar apenas lances, datas e fotos sem duplicar o card na listagem
            if (draft.auctionPrice && draft.auctionPrice > 0) {
              existing.auctionPrice = draft.auctionPrice;
              existing.firstAuctionPrice = draft.firstAuctionPrice || draft.auctionPrice;
              existing.priceVerified = true;
            }
            if (draft.auctionDate) {
              existing.auctionDate = draft.auctionDate;
              existing.firstAuctionDate = draft.firstAuctionDate || draft.auctionDate;
            }
            if (draft.imageUrl && !existing.imageUrl) {
              existing.imageUrl = draft.imageUrl;
            }
            if (cleanLink && !(existing.sourceLinks || []).includes(cleanLink)) {
              existing.sourceLinks = [...new Set([...(existing.sourceLinks || []), cleanLink])];
            }
            if (canonKey && !existing.canonicalPropertyId) {
              existing.canonicalPropertyId = canonKey;
            }
          } else {
            imported++;
            const fullAuc = {
              ...draft,
              lastSyncedAt: new Date().toISOString()
            };
            storeData.auctions.unshift(fullAuc);
            if (cleanLink) linkMap.set(cleanLink, fullAuc);
            if (canonKey) keyMap.set(canonKey, fullAuc);
          }
        }

        // Save incrementally
        fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2), 'utf8');
        return { imported, updated };
      }
    });

    const rjAuctions = storeData.auctions.filter((a: any) => (a.state || '').toUpperCase() === 'RJ');
    const rjCasas = rjAuctions.filter((a: any) => a.propertyType === 'Casa');
    console.log(`\n[Auditoria Final Store]`);
    console.log(`Total Geral no Banco: ${storeData.auctions.length}`);
    console.log(`Total Rio de Janeiro (RJ): ${rjAuctions.length}`);
    console.log(`Total Casas em RJ: ${rjCasas.length}`);
  })();
}
