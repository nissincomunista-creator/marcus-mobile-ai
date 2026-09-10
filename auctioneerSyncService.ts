import puppeteer from 'puppeteer';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { readRegistryPdf } from './documentTextService.ts';

let documentOcrPausedUntil = 0;
import { AuctionProperty, PropertyType } from './src/types.ts';

export interface AuctioneerPortalConfig {
  id: string;
  name: string;
  domain: string;
  baseUrl: string;
  searchUrl?: string;
  genericScrape?: boolean;
  enabled: boolean;
}

export const AUCTIONEER_PORTALS: AuctioneerPortalConfig[] = [
  { id: 'frazao', name: 'Frazão Leilões', domain: 'frazaoleiloes.com.br', baseUrl: 'https://www.frazaoleiloes.com.br', enabled: true },
  { id: 'biasi', name: 'Biasi Leilões', domain: 'biasileiloes.com.br', baseUrl: 'https://www.biasileiloes.com.br', enabled: true },
  { id: 'megaleiloes', name: 'Mega Leilões', domain: 'megaleiloes.com.br', baseUrl: 'https://www.megaleiloes.com.br', enabled: true },
  { id: 'portalzuk', name: 'Portal Zuk', domain: 'portalzuk.com.br', baseUrl: 'https://www.portalzuk.com.br', enabled: true },
  { id: 'sold', name: 'Sold Leilões', domain: 'sold.com.br', baseUrl: 'https://www.sold.com.br', enabled: true },
  { id: 'pestana', name: 'Pestana Leilões', domain: 'pestanaleiloes.com.br', baseUrl: 'https://www.pestanaleiloes.com.br', enabled: true },
  { id: 'mgl', name: 'MGL Leilões', domain: 'mgl.com.br', baseUrl: 'https://www.mgl.com.br', enabled: true },
  { id: 'santander', name: 'Santander Imóveis', domain: 'santanderimoveis.com.br', baseUrl: 'https://www.santanderimoveis.com.br', genericScrape: true, enabled: true },
  { id: 'ricart', name: 'Ricart Leilões', domain: 'ricartleiloes.com.br', baseUrl: 'https://www.ricartleiloes.com.br', genericScrape: true, enabled: true },
  { id: 'pamela', name: 'Pamela Leiloeira', domain: 'pamelaleiloeira.com.br', baseUrl: 'https://www.pamelaleiloeira.com.br', genericScrape: true, enabled: true },
  { id: 'gustavo', name: 'Gustavo Leiloeiro', domain: 'gustavoleiloeiro.com.br', baseUrl: 'https://gustavoleiloeiro.com.br', genericScrape: true, enabled: true },
  { id: 'onildo', name: 'Onildo Bastos', domain: 'onildobastos.com.br', baseUrl: 'https://www.onildobastos.com.br', searchUrl: 'https://www.onildobastos.com.br/Principal.asp', genericScrape: true, enabled: true },
  { id: 'schulmann', name: 'Schulmann Leilões', domain: 'schulmannleiloes.com.br', baseUrl: 'https://schulmannleiloes.com.br', genericScrape: true, enabled: true },
  { id: 'saraiva', name: 'Saraiva Leilões', domain: 'saraivaleiloes.com.br', baseUrl: 'https://www.saraivaleiloes.com.br', searchUrl: 'https://www.saraivaleiloes.com.br/buscador?categoria=2', genericScrape: true, enabled: true },
  { id: 'ayupp', name: 'Fabiano Ayupp Leiloeiro', domain: 'fabianoayuppleiloeiro.com.br', baseUrl: 'https://fabianoayuppleiloeiro.com.br', genericScrape: true, enabled: true },
  { id: 'rymer', name: 'Rymer Leilões', domain: 'rymerleiloes.com.br', baseUrl: 'https://www.rymerleiloes.com.br', genericScrape: true, enabled: true },
  { id: 'depaula', name: 'De Paula Leilões', domain: 'depaulaonline.com.br', baseUrl: 'https://depaulaonline.com.br', genericScrape: true, enabled: true },
  { id: 'jv', name: 'JV Leilões', domain: 'jvleiloes.lel.br', baseUrl: 'https://www.jvleiloes.lel.br', searchUrl: 'https://www.jvleiloes.lel.br/lotes/imovel?tipo=imovel&address_uf=RJ&address_cidade_ibge=3304557', genericScrape: true, enabled: true },
  { id: 'paulobotelho', name: 'Paulo Botelho Leiloeiro', domain: 'paulobotelholeiloeiro.com.br', baseUrl: 'https://www.paulobotelholeiloeiro.com.br', genericScrape: true, enabled: true },
  { id: 'alexandro', name: 'Alexandro Leiloeiro', domain: 'alexandroleiloeiro.com.br', baseUrl: 'https://alexandroleiloeiro.com.br', genericScrape: true, enabled: true },
  { id: 'portella', name: 'Portella Leilões', domain: 'portellaleiloes.com.br', baseUrl: 'https://portellaleiloes.com.br', genericScrape: true, enabled: true },
  { id: 'silas', name: 'Silas Leiloeiro', domain: 'silasleiloeiro.lel.br', baseUrl: 'https://www.silasleiloeiro.lel.br', searchUrl: 'https://www.silasleiloeiro.lel.br/Principal.asp?at=jd', genericScrape: true, enabled: true },
  { id: 'joaoemilio', name: 'João Emílio Leiloeiro', domain: 'joaoemilio.com.br', baseUrl: 'https://www.joaoemilio.com.br', searchUrl: 'https://www.joaoemilio.com.br/lotes/imovel?tipo=imovel&address_uf=RJ&address_cidade_ibge=3304557', genericScrape: true, enabled: true },
  { id: 'facanha', name: 'Façanha Leilões', domain: 'facanhaleiloes.com.br', baseUrl: 'https://facanhaleiloes.com.br', genericScrape: true, enabled: true }
];

export interface ScrapedAuctionDraft {
  portalId: string;
  auctioneerName: string;
  title: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  propertyType: PropertyType;
  sizeSqm: number;
  auctionPrice: number;
  estimatedValue?: number;
  auctionDate: string;
  firstAuctionDate?: string;
  secondAuctionDate?: string;
  auctionLink: string;
  saleMode?: string;
  imageUrl?: string;
  description?: string;
  origin: 'extrajudicial' | 'judicial';
  occupied?: boolean;
  sellerBank?: string;
  matriculaText?: string;
  matriculaUrl?: string;
  allowsFinancing?: boolean;
  allowsInstallments?: boolean;
  paymentTerms?: string;
  maxInstallments?: number;
  minDownpaymentPercent?: number;
  pendingIptuCost?: number;
  pendingCondoCost?: number;
  addressVerified?: boolean;
  sizeVerified?: boolean;
}

function normalizeStr(str: string | undefined | null): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseType(text: string): PropertyType {
  const norm = normalizeStr(text);
  if (norm.includes('apartamento') || norm.includes('apto') || norm.includes('studio') || norm.includes('cobertura') || norm.includes('flat')) {
    return 'Apartamento';
  }
  if (norm.includes('casa') || norm.includes('sobrado') || norm.includes('vila')) {
    return 'Casa';
  }
  if (norm.includes('terreno') || norm.includes('lote') || norm.includes('gleba')) {
    return 'Terreno';
  }
  if (norm.includes('comercial') || norm.includes('sala') || norm.includes('loja') || norm.includes('galp') || norm.includes('predio') || norm.includes('prédio')) {
    return 'Comercial';
  }
  return 'Apartamento';
}

function detectBankOrJudicial(text: string): { origin: 'extrajudicial' | 'judicial'; bank?: string } {
  const norm = normalizeStr(text);
  if (norm.includes('santander')) return { origin: 'extrajudicial', bank: 'Santander' };
  if (norm.includes('itau') || norm.includes('itaú')) return { origin: 'extrajudicial', bank: 'Itaú' };
  if (norm.includes('bradesco')) return { origin: 'extrajudicial', bank: 'Bradesco' };
  if (norm.includes('caixa')) return { origin: 'extrajudicial', bank: 'Caixa' };
  if (norm.includes('inter')) return { origin: 'extrajudicial', bank: 'Banco Inter' };
  if (norm.includes('pan')) return { origin: 'extrajudicial', bank: 'Banco Pan' };
  if (norm.includes('safra')) return { origin: 'extrajudicial', bank: 'Safra' };
  if (norm.includes('banco do brasil') || norm.includes('bb')) return { origin: 'extrajudicial', bank: 'Banco do Brasil' };
  if (norm.includes('alienacao fiduciaria') || norm.includes('alienação fiduciária') || norm.includes('extrajudicial') || norm.includes('banco')) {
    return { origin: 'extrajudicial', bank: 'Instituição Financeira' };
  }

  if (norm.includes('vara') || norm.includes('judicial') || norm.includes('falencia') || norm.includes('falência') || norm.includes('execucao') || norm.includes('execução') || norm.includes('civel') || norm.includes('cível') || norm.includes('trabalho') || norm.includes('trt') || norm.includes('tj')) {
    return { origin: 'judicial' };
  }

  return { origin: 'extrajudicial' };
}

export function extractAddress(text: string, fallback: string): string {
  const lines = text.split(/\r?\n|\s{2,}/).map(line => line.trim()).filter(Boolean);
  const labeledLine = lines.find(line =>
    /\bendere[cç]o\b/i.test(line) &&
    !/leiloeir|escrit[oó]rio|correio\s+eletr[oô]nico|telefone|\btel\.?\b/i.test(line) &&
    /\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(line)
  );
  if (labeledLine) {
    const labeledAddress = labeledLine
      .replace(/^.*?\bendere[cç]o(?:\s+cf\.?\s+auto\s+de\s+penhora)?\s*:?\s*/i, '')
      .split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0]
      .replace(/\s+/g, ' ')
      .trim();
    if (labeledAddress.length >= 8) return labeledAddress.slice(0, 180);
  }
  const addressCandidates = lines
    .map((line, index) => {
      if (!/\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\s+.{3,}/i.test(line)) return null;
      const context = `${lines[index - 1] || ''} ${line}`;
      let score = 0;
      if (/im[oó]vel|\bbem\b|auto\s+de\s+avalia[cç][aã]o|auto\s+de\s+penhora|situad[oa]|localizad[oa]|objeto\s+do\s+leil[aã]o|matr[ií]cula/i.test(context)) score += 8;
      if (/n[ºo°]?\s*\d+|,\s*\d+/.test(line)) score += 3;
      if (/leiloeir|escrit[oó]rio|correio\s+eletr[oô]nico|telefone|\btel\.?\b|sala\s+40[234]/i.test(context)) score -= 10;
      return { line, score, index };
    })
    .filter((candidate): candidate is { line: string; score: number; index: number } => !!candidate)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const addressLine = addressCandidates[0]?.line;
  if (addressLine) {
    const extracted = addressLine.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\s+.{3,180}/i)?.[0] || addressLine;
    return extracted
      .split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0]
      .replace(/\s+(?:bairro|cidade|estado)\s*[:\-].*$/i, '')
      .trim();
  }
  const normalized = text.replace(/\s+/g, ' ').trim();
  const addressMatch = normalized.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo)\s+[^|;]{3,120}/i);
  return addressMatch ? addressMatch[0].replace(/\s{2,}/g, ' ').trim() : fallback;
}

function extractDeclaredCity(text: string, state: string): string {
  const escapedState = state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`\\bcidade\\s*:\\s*([^\\n/]{2,50})\\s*/\\s*${escapedState}\\b`, 'i'),
    new RegExp(`\\bmunic[ií]pio\\s+de\\s+([^,.;/\\n-]{2,50})\\s*[-/]\\s*${escapedState}\\b`, 'i'),
    new RegExp(`\\b(Rio de Janeiro)\\s*[-/]\\s*${escapedState}\\b`, 'i')
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function extractAuctionDates(text: string): { first?: string; second?: string } {
  const dates = [...text.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/g)]
    .map(match => `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
  return { first: dates[0], second: dates.find(date => date !== dates[0]) };
}

function extractAuctionDate(text: string): string {
  return extractAuctionDates(text).first || '';
}

function extractMinimumBid(text: string): number {
  const values = [...text.matchAll(/lance\s+(?:inicial|m[ií]nimo)(?:\s+\d+[ªºo]?\s*(?:leil[aã]o|pra[cç]a))?\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/gi)]
    .map(match => Number(match[1].replace(/\./g, '').replace(',', '.')))
    .filter(value => Number.isFinite(value) && value > 0);
  return values.length > 0 ? Math.round(Math.min(...values)) : 0;
}

function extractAppraisal(text: string): number | undefined {
  const match = text.match(/valor\s+(?:de\s+)?avalia[cç][aã]o\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (!match) return undefined;
  const value = Number(match[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

function extractSaleMode(text: string): string {
  const normalized = normalizeStr(text);
  if (normalized.includes('aceita proposta') || normalized.includes('recebe proposta')) return 'Aceita Propostas';
  if (normalized.includes('venda direta')) return 'Venda Direta';
  if (normalized.includes('licitacao aberta') || normalized.includes('licitação aberta')) return 'Licitação Aberta';
  if (normalized.includes('leilao sfi') || normalized.includes('leilão sfi')) return 'Leilão SFI';
  return 'Leilão Online';
}

function parseBrazilianMoney(value: string): number {
  const parsed = Number(value.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

function extractFinancialTerms(text: string) {
  const normalized = normalizeStr(text).replace(/\s+/g, ' ');
  const deniesFinancing = /(?:nao\s+(?:aceita|admite|permite)|sem)\s+financiamento|pagamento\s+exclusivamente\s+a\s+vista/.test(normalized);
  const allowsFinancing = !deniesFinancing && /(?:aceita|admite|permite|possibilidade\s+de|podera\s+ser)\s+(?:o\s+)?financiamento|financiamento\s+(?:bancario|imobiliario|habitacional)/.test(normalized);
  const allowsInstallments = /(?:parcelamento|parcelado|pagamento\s+em\s+ate\s+\d+\s+parcelas|\d+\s+parcelas)/.test(normalized)
    && !/(?:nao\s+(?:aceita|admite|permite)|sem)\s+parcelamento/.test(normalized);
  const installmentMatch = normalized.match(/(?:ate\s+)?(\d{1,3})\s+parcelas/);
  const entryMatch = normalized.match(/(?:entrada|sinal)[^%]{0,50}(\d{1,3}(?:[.,]\d+)?)\s*%/)
    || normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*%[^.]{0,40}(?:entrada|sinal)/);
  const sellerClearsDebts = /(?:debitos?|dividas?|condominio|iptu)[^.]{0,160}(?:quitad[oa]s?|por\s+conta|responsabilidade)[^.]{0,80}(?:vendedor|credor|banco|alienante)|(?:vendedor|credor|banco|alienante)[^.]{0,100}(?:quitara|assumira|responsavel)[^.]{0,80}(?:debitos?|dividas?|condominio|iptu)/.test(normalized);
  const iptuMatch = text.match(/(?:IPTU|tributos?\s+municipais?)[^R$\n]{0,80}R\$\s*([\d.]+(?:,\d{2})?)/i);
  const condoMatch = text.match(/(?:condom[ií]nio|cotas?\s+condominiais?)[^R$\n]{0,80}R\$\s*([\d.]+(?:,\d{2})?)/i);

  let paymentTerms = 'Condição de pagamento não confirmada na fonte';
  if (allowsFinancing) paymentTerms = 'Financiamento permitido conforme fonte do lote';
  else if (allowsInstallments) paymentTerms = installmentMatch ? `Parcelamento em até ${installmentMatch[1]} parcelas` : 'Parcelamento permitido conforme fonte do lote';
  else if (deniesFinancing || /(?:somente|apenas|exclusivamente)\s+a\s+vista/.test(normalized)) paymentTerms = 'Somente à vista';

  return {
    allowsFinancing,
    allowsInstallments,
    paymentTerms,
    maxInstallments: allowsInstallments && installmentMatch ? Number(installmentMatch[1]) : undefined,
    minDownpaymentPercent: entryMatch ? Number(entryMatch[1].replace(',', '.')) : undefined,
    pendingIptuCost: sellerClearsDebts ? 0 : (iptuMatch ? parseBrazilianMoney(iptuMatch[1]) : undefined),
    pendingCondoCost: sellerClearsDebts ? 0 : (condoMatch ? parseBrazilianMoney(condoMatch[1]) : undefined)
  };
}

function isConfiguredAuctionLink(link: string): boolean {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '').toLowerCase();
    return AUCTIONEER_PORTALS.some(portal => host === portal.domain || host.endsWith(`.${portal.domain}`));
  } catch {
    return false;
  }
}

function hasAuditableAddress(address: string | undefined): boolean {
  return /\b(?:rua|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(address || '') && /\d/.test(address || '');
}

async function extractOfficialDocumentText(page: any, documentUrl: string): Promise<string> {
  try {
    if (Date.now() < documentOcrPausedUntil) return '';
    if (!/^https?:\/\//i.test(documentUrl)) return '';
    let base64 = await page.evaluate(async (url: string) => {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) return '';
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > 15 * 1024 * 1024) return '';
      if (String.fromCharCode(...bytes.subarray(0, 4)) !== '%PDF') return '';
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    }, documentUrl).catch(() => '');
    if (!base64) {
      const response = await fetch(documentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          Referer: page.url()
        },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) return '';
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 15 * 1024 * 1024 || buffer.subarray(0, 4).toString('ascii') !== '%PDF') return '';
      base64 = buffer.toString('base64');
    }
    if (!base64) return '';

    const text = await readRegistryPdf(new Uint8Array(Buffer.from(base64, 'base64')));
    const letters = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
    return text.length >= 50 && letters / text.length >= 0.35 ? text : '';
  } catch (error: any) {
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(String(error?.message || ''))) {
      documentOcrPausedUntil = Date.now() + 60 * 60 * 1000;
      console.warn('[Auctioneer Docs] OCR pausado por 1 hora após limite do provedor; a varredura dos portais continuará sem novas chamadas de OCR.');
      return '';
    }
    console.warn(`[Auctioneer Docs] Documento não pôde ser lido (${documentUrl}): ${error.message}`);
    return '';
  }
}

export async function enrichLotDetails(browser: any, draft: ScrapedAuctionDraft): Promise<ScrapedAuctionDraft> {
  let detailPage: any = null;
  try {
    detailPage = await browser.newPage();
    await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await detailPage.goto(draft.auctionLink, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await detailPage.waitForNetworkIdle({ idleTime: 500, timeout: 6000 }).catch(() => undefined);
    const detailData = await detailPage.evaluate(() => {
      const links = new Set<string>();
      document.querySelectorAll('a, iframe, embed').forEach(element => {
        const href = element.getAttribute('href') || element.getAttribute('src') || '';
        const onclick = element.getAttribute('onclick') || '';
        const candidates = [href, ...(onclick.match(/https?:\/\/[^'"\s)]+|[^'"\s)]+\.pdf(?:\?[^'"\s)]*)?/gi) || [])];
        for (const candidate of candidates) {
          if (!candidate || !/(?:matr[ií]cula|certid[aã]o|\.pdf(?:\?|$))/i.test(candidate)) continue;
          try {
            const resolved = new URL(candidate, location.href);
            if (/^https?:$/i.test(resolved.protocol)) links.add(resolved.href);
          } catch { /* URL inválida */ }
        }
      });
      const normalizeValue = (value: unknown) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
      const addresses: string[] = [];
      const sizes: number[] = [];
      const visitJson = (value: any) => {
        if (!value) return;
        if (Array.isArray(value)) return value.forEach(visitJson);
        if (typeof value !== 'object') return;
        const address = value.address;
        if (typeof address === 'string') addresses.push(normalizeValue(address));
        else if (address && typeof address === 'object') {
          const formatted = [address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode]
            .map(normalizeValue).filter(Boolean).join(', ');
          if (formatted) addresses.push(formatted);
        }
        const floorValue = value.floorSize?.value ?? value.area?.value ?? value.floorSize;
        const numericFloor = Number(String(floorValue ?? '').replace(',', '.'));
        if (Number.isFinite(numericFloor) && numericFloor > 0) sizes.push(numericFloor);
        Object.values(value).forEach(visitJson);
      };
      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try { visitJson(JSON.parse(script.textContent || 'null')); } catch { /* JSON-LD inválido */ }
      });

      const addressSelectors = '[itemprop="streetAddress"], [itemprop="address"], [data-testid*="address" i], [class*="endereco" i], [class*="address" i]';
      document.querySelectorAll(addressSelectors).forEach(element => {
        const value = normalizeValue((element as HTMLElement).innerText || element.getAttribute('content'));
        if (value) addresses.push(value);
      });
      document.querySelectorAll('a[href*="google.com/maps"], a[href*="maps.google"], iframe[src*="maps"]')
        .forEach(element => {
          const raw = element.getAttribute('href') || element.getAttribute('src') || '';
          try {
            const url = new URL(raw, location.href);
            const mapAddress = url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('destination');
            if (mapAddress && !/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(mapAddress)) addresses.push(normalizeValue(mapAddress));
          } catch { /* mapa sem URL válida */ }
        });
      return { text: document.body?.innerText || '', documentLinks: Array.from(links), structuredAddresses: addresses, structuredSizes: sizes };
    });

    let officialDocumentText = '';
    let matriculaText = draft.matriculaText || '';
    let matriculaUrl = draft.matriculaUrl;
    if (detailData.documentLinks.length > 0) {
      const orderedLinks = detailData.documentLinks.sort((a: string, b: string) => {
        const priority = (url: string) => /matr[ií]cula|certid[aã]o|\brgi\b/i.test(url) ? 0 : 1;
        return priority(a) - priority(b);
      });
      for (const documentUrl of orderedLinks.slice(0, 3)) {
        const extracted = await extractOfficialDocumentText(detailPage, documentUrl);
        if (extracted) officialDocumentText += `\n${extracted}`;
        if (extracted && /matr[ií]cula|certid[aã]o|\brgi\b/i.test(documentUrl)) {
          matriculaText = extracted;
          matriculaUrl = documentUrl;
        }
      }
    }

    const combinedText = `${detailData.text}\n${officialDocumentText}`;
    const financialTerms = extractFinancialTerms(combinedText);
    const dates = extractAuctionDates(combinedText);
    const sizeMatch = combinedText.match(/[aá]rea\s+(?:privativa|[uú]til|constru[ií]da)\s*:?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i)
      || combinedText.match(/(\d+(?:[.,]\d+)?)\s*m[²2]\s*(?:de\s+)?[aá]rea\s+privativa/i)
      || combinedText.match(/(?:metragem|[aá]rea\s+do\s+im[oó]vel)\s*:?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    const structuredSize = detailData.structuredSizes.find((value: number) => value >= 10 && value <= 5000) || 0;
    const detailedSize = structuredSize || (sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 0);
    const structuredAddress = detailData.structuredAddresses
      .map((value: string) => extractAddress(value, ''))
      .find((value: string) => hasAuditableAddress(value) && !/leiloeir|escrit[oó]rio|telefone|contato/i.test(value));
    const textAddress = extractAddress(combinedText, '');
    const verifiedAddress = structuredAddress || (hasAuditableAddress(textAddress) ? textAddress : '');
    const detailedMinimumBid = extractMinimumBid(combinedText);
    const enrichedDescription = combinedText.trim().slice(0, 30000);
    return {
      ...draft,
      address: verifiedAddress || draft.address,
      addressVerified: Boolean(verifiedAddress),
      matriculaText,
      matriculaUrl,
      sizeSqm: detailedSize > 0 ? detailedSize : draft.sizeSqm,
      sizeVerified: detailedSize > 0,
      auctionPrice: detailedMinimumBid || draft.auctionPrice,
      estimatedValue: extractAppraisal(combinedText) || draft.estimatedValue,
      auctionDate: dates.first || draft.auctionDate,
      firstAuctionDate: dates.first || draft.firstAuctionDate,
      secondAuctionDate: dates.second || draft.secondAuctionDate,
      saleMode: extractSaleMode(combinedText || draft.description || ''),
      ...financialTerms,
      description: enrichedDescription || draft.description
    };
  } catch (err: any) {
    console.warn(`[Auctioneer Sync] Não foi possível abrir o lote ${draft.auctionLink}: ${err.message}`);
    return draft;
  } finally {
    if (detailPage) await detailPage.close().catch(() => undefined);
  }
}

// 1. Scraper Mega Leilões
export async function scrapeMegaLeiloes(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const ufSlug = state.toLowerCase();
    const citySlug = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const url = `https://www.megaleiloes.com.br/imoveis/${ufSlug}/${citySlug}`;

    console.log(`[Mega Leilões Scraper] Acessando ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const rawLots = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card.open, .card'));
      return cards.map(c => {
        const link = (c.querySelector('a') as HTMLAnchorElement | null)?.href || '';
        const text = (c as HTMLElement).innerText || '';
        const img = c.querySelector('img')?.src || '';

        const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
        const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.'))) : 0;

        const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
        const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 0;

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines.find(l => l.includes('Apartamento') || l.includes('Casa') || l.includes('Terreno') || l.includes('Comercial') || l.includes('Unid')) || lines[0] || 'Imóvel Mega Leilões';

        return { title, text, price, size, link, img };
      });
    });

    for (const raw of rawLots) {
      if (!raw.link || raw.price <= 0) continue;
      const propType = parseType(raw.title + ' ' + raw.text);
      const detection = detectBankOrJudicial(raw.text);

      if (targetType === 'extrajudicial' && detection.origin !== 'extrajudicial') continue;
      if (targetType === 'judicial' && detection.origin !== 'judicial') continue;

      // Extract neighborhood from " - Bairro - Cidade - UF"
      let neigh = '';
      const parts = raw.title.split('-').map(p => p.trim());
      if (parts.length >= 3) {
        neigh = parts[parts.length - 3] || parts[parts.length - 2];
      }

      const draft: ScrapedAuctionDraft = {
        portalId: 'megaleiloes',
        auctioneerName: 'Mega Leilões',
        title: raw.title,
        address: extractAddress(raw.text, raw.title),
        neighborhood: neigh || 'Centro',
        city,
        state,
        propertyType: propType,
        sizeSqm: raw.size > 0 ? raw.size : 0,
        auctionPrice: raw.price,
        estimatedValue: Math.round(raw.price * 1.6),
        auctionDate: extractAuctionDate(raw.text),
        auctionLink: raw.link,
        imageUrl: raw.img,
        description: raw.text.slice(0, 300),
        saleMode: extractSaleMode(raw.text),
        origin: targetType,
        sellerBank: detection.bank
      };
      results.push(results.length < 12 ? await enrichLotDetails(browser, draft) : draft);
    }
  } catch (err: any) {
    console.error('[Mega Leilões Scraper] Erro:', err.message);
  } finally {
    if (browser) await browser.close();
  }
  return results;
}

// 2. Scraper Frazão Leilões
export async function scrapeFrazao(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const url = `https://www.frazaoleiloes.com.br/sale/searchLot?estado=${state}&cidade=${encodeURIComponent(city)}&pesquisaSimples=false`;
    console.log(`[Frazão Scraper] Acessando ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const rawLots = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('/lote/'));
      const unique = [];
      const seen = new Set();
      for (const a of anchors) {
        if (!seen.has(a.href)) {
          seen.add(a.href);
          const card = a.closest('.card') || a.parentElement;
          const text = card ? (card as HTMLElement).innerText : (a as HTMLElement).innerText;
          const img = card ? card.querySelector('img')?.src : null;

          const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
          const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.'))) : 0;

          const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
          const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 0;

          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          const title = lines.find(l => l.includes('Apartamento') || l.includes('Casa') || l.includes('Terreno') || l.includes('Comercial')) || lines[0] || 'Imóvel Frazão';

          unique.push({ title, text, price, size, link: a.href, img });
        }
      }
      return unique;
    });

    for (const raw of rawLots) {
      if (!raw.link || raw.price <= 0) continue;
      const propType = parseType(raw.title + ' ' + raw.text);
      const detection = detectBankOrJudicial(raw.text);

      if (targetType === 'extrajudicial' && detection.origin !== 'extrajudicial') continue;
      if (targetType === 'judicial' && detection.origin !== 'judicial') continue;

      let neigh = '';
      const mNeigh = raw.title.match(/(?:em|no|na)\s+([A-Za-zÀ-ÿ\s]+),\s*(?:Rio de Janeiro|RJ)/i);
      if (mNeigh) {
        neigh = mNeigh[1].trim();
      }

      const draft: ScrapedAuctionDraft = {
        portalId: 'frazao',
        auctioneerName: 'Frazão Leilões',
        title: raw.title,
        address: extractAddress(raw.text, raw.title),
        neighborhood: neigh || 'Centro',
        city,
        state,
        propertyType: propType,
        sizeSqm: raw.size > 0 ? raw.size : 0,
        auctionPrice: raw.price,
        estimatedValue: Math.round(raw.price * 1.5),
        auctionDate: extractAuctionDate(raw.text),
        auctionLink: raw.link,
        imageUrl: raw.img,
        description: raw.text.slice(0, 300),
        saleMode: extractSaleMode(raw.text),
        origin: targetType,
        sellerBank: detection.bank
      };
      results.push(results.length < 12 ? await enrichLotDetails(browser, draft) : draft);
    }
  } catch (err: any) {
    console.error('[Frazão Scraper] Erro:', err.message);
  } finally {
    if (browser) await browser.close();
  }
  return results;
}

// 3. Scraper Biasi Leilões
export async function scrapeBiasi(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const ufSlug = state.toLowerCase();
    const citySlug = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const url = `https://www.biasileiloes.com.br/imoveis/${ufSlug}/${citySlug}/todos-os-bairros/todos-os-segmentos?pagina=1`;

    console.log(`[Biasi Scraper] Acessando ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const rawLots = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('a.leilao-lote'));
      return cards.map(a => {
        const link = (a as HTMLAnchorElement).href || '';
        const text = (a as HTMLElement).innerText || '';

        const imgEl = a.querySelector('.card-img-cover');
        let img = '';
        if (imgEl && (imgEl as HTMLElement).style.backgroundImage) {
          const m = (imgEl as HTMLElement).style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (m) img = m[1];
        }
        if (!img) img = a.querySelector('img')?.src || '';

        const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
        const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.'))) : 0;

        const descEl = a.querySelector('.text-descricao');
        const descText = descEl ? (descEl as HTMLElement).innerText : text;

        return { text: descText, price, link, img };
      });
    });

    for (const raw of rawLots) {
      if (!raw.link || raw.price <= 0) continue;
      const propType = parseType(raw.text);
      const detection = detectBankOrJudicial(raw.text);

      if (targetType === 'extrajudicial' && detection.origin !== 'extrajudicial') continue;
      if (targetType === 'judicial' && detection.origin !== 'judicial') continue;

      let neigh = '';
      const parts = raw.text.split('-').map(p => p.trim());
      if (parts.length >= 2) {
        neigh = parts[1];
      }

      const draft: ScrapedAuctionDraft = {
        portalId: 'biasi',
        auctioneerName: 'Biasi Leilões',
        title: raw.text.split('\n')[0] || 'Imóvel Biasi',
        address: extractAddress(raw.text, raw.text.split('\n')[0] || 'Rio de Janeiro, RJ'),
        neighborhood: neigh || 'Centro',
        city,
        state,
        propertyType: propType,
        sizeSqm: 0,
        auctionPrice: raw.price,
        estimatedValue: Math.round(raw.price * 1.55),
        auctionDate: extractAuctionDate(raw.text),
        auctionLink: raw.link,
        imageUrl: raw.img,
        description: raw.text,
        saleMode: extractSaleMode(raw.text),
        origin: targetType,
        sellerBank: detection.bank
      };
      results.push(results.length < 12 ? await enrichLotDetails(browser, draft) : draft);
    }
  } catch (err: any) {
    console.error('[Biasi Scraper] Erro:', err.message);
  } finally {
    if (browser) await browser.close();
  }
  return results;
}

// Coletor conservador para portais heterogêneos. Só admite cards que exponham
// link direto, preço e linguagem inequívoca de imóvel; o detalhe é aberto antes
// da importação para confirmar endereço, metragem, datas e natureza do leilão.
export async function scrapeConfiguredAuctioneers(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const configs = AUCTIONEER_PORTALS.filter(portal => portal.enabled && portal.genericScrape);
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    let cursor = 0;
    const worker = async () => {
      while (cursor < configs.length) {
        const config = configs[cursor++];
        let page: any = null;
        try {
          page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
          await page.setRequestInterception(true);
          page.on('request', (request: any) => {
            const type = request.resourceType();
            if (type === 'media' || type === 'font') request.abort();
            else request.continue();
          });

          const url = config.searchUrl || config.baseUrl;
          console.log(`[Auctioneer Generic] Acessando ${config.name}: ${url}`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 18000 });
          await new Promise(resolve => setTimeout(resolve, 1200));

          const rawLots = await page.evaluate(() => {
            const propertyWords = /\b(im[oó]vel|apartamento|apto|casa|terreno|lote|sala|loja|galp[aã]o|pr[eé]dio|cobertura)\b/i;
            const priceWords = /R\$\s*[\d.]+(?:,\d{2})?/i;
            const ignored = /(?:login|entrar|cadastro|contato|quem somos|pol[ií]tica|termos)/i;
            const seen = new Set<string>();
            const lots: Array<{ text: string; link: string; img: string; price: number; size: number }> = [];

            for (const anchor of Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[]) {
              const link = anchor.href || '';
              if (!link || seen.has(link) || ignored.test(link)) continue;
              const container = anchor.closest('article, [class*="card"], [class*="lote"], [class*="lot"], [class*="item"], li') || anchor;
              const text = ((container as HTMLElement).innerText || anchor.innerText || '').replace(/\s+/g, ' ').trim();
              if (text.length < 35 || !propertyWords.test(text) || !priceWords.test(text)) continue;

              const bidMatches = [...text.matchAll(/lance\s+(?:inicial|m[ií]nimo)(?:\s+\d+[ªºo]?\s*(?:leil[aã]o|pra[cç]a))?\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/gi)];
              const fallbackPrice = text.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
              const sizeMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
              const bidValues = bidMatches.map(match => Number(match[1].replace(/\./g, '').replace(',', '.'))).filter(value => Number.isFinite(value) && value > 0);
              const price = bidValues.length > 0 ? Math.round(Math.min(...bidValues)) : fallbackPrice ? Math.round(Number(fallbackPrice[1].replace(/\./g, '').replace(',', '.'))) : 0;
              const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 0;
              if (price < 10000) continue;

              const image = container.querySelector('img') as HTMLImageElement | null;
              seen.add(link);
              lots.push({ text, link, img: image?.src || '', price, size });
              if (lots.length >= 20) break;
            }
            return lots;
          });

          for (const raw of rawLots.slice(0, 8)) {
            const cityNorm = normalizeStr(city);
            const detection = detectBankOrJudicial(raw.text);
            const lines = raw.text.split(/\s{2,}|\n/).map(line => line.trim()).filter(Boolean);
            const title = lines.find(line => /im[oó]vel|apartamento|casa|terreno|sala|loja|galp[aã]o|pr[eé]dio|cobertura/i.test(line)) || raw.text.slice(0, 140);
            const dates = extractAuctionDates(raw.text);
            const neighborhoodMatch = raw.text.match(/(?:bairro|em|no|na)\s+([A-Za-zÀ-ÿ\s]{3,35})(?:\s*[-,/]\s*(?:RJ|Rio de Janeiro)|\s+-)/i);

            const draft: ScrapedAuctionDraft = {
              portalId: config.id,
              auctioneerName: config.name,
              title,
              address: extractAddress(raw.text, ''),
              neighborhood: neighborhoodMatch?.[1]?.trim() || '',
              city,
              state,
              propertyType: parseType(raw.text),
              sizeSqm: raw.size,
              auctionPrice: raw.price,
              auctionDate: dates.first || '',
              firstAuctionDate: dates.first,
              secondAuctionDate: dates.second,
              auctionLink: raw.link,
              imageUrl: raw.img,
              description: raw.text.slice(0, 500),
              saleMode: extractSaleMode(raw.text),
              origin: targetType,
              sellerBank: detection.bank
            };

            const enriched = await enrichLotDetails(browser, draft);
            const combinedEvidence = `${enriched.description || ''}\n${raw.text}`;
            const finalDetection = detectBankOrJudicial(combinedEvidence);
            if (finalDetection.origin !== targetType) continue;
            const declaredCity = extractDeclaredCity(combinedEvidence, state) || (normalizeStr(combinedEvidence).includes(cityNorm) ? city : '');
            if (!declaredCity || normalizeStr(declaredCity) !== cityNorm || enriched.sizeSqm <= 0 || enriched.auctionPrice <= 0) continue;
            results.push({
              ...enriched,
              city: declaredCity,
              sellerBank: finalDetection.bank || detection.bank,
              address: hasAuditableAddress(enriched.address)
                ? enriched.address
                : 'Endereço em extração documental - matrícula ou edital não disponibilizado pelo portal'
            });
          }
        } catch (err: any) {
          console.warn(`[Auctioneer Generic] ${config.name} indisponível: ${err.message}`);
        } finally {
          if (page) await page.close().catch(() => undefined);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(4, configs.length) }, () => worker()));
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }

  return results;
}

// Grounded search complements the deterministic scrapers and is still subject
// to link, date and value validation before entering the store.
export async function scrapeGroundedAuctioneers(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Auctioneer Miner] GEMINI_API_KEY não configurada. Pulando varredura Grounded.');
    return results;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const targetLabel = targetType === 'extrajudicial' ? 'LEILÕES DE BANCOS E EXTRAJUDICIAIS (Alienação Fiduciária)' : 'LEILÕES JUDICIAIS (Varas Cíveis e Trabalhistas)';
  const domains = AUCTIONEER_PORTALS.map(p => p.domain).join(', ');

  const prompt = `
Você é um auditor e robô de varredura pericial de leilões imobiliários no Brasil. Hoje é ${todayStr}.
Realize uma pesquisa ativa no Google (Google Search Grounding) focando estritamente nos portais de leiloeiros oficiais configurados:
${domains}.

Objetivo:
Encontre entre 4 e 8 ${targetLabel} de imóveis ATIVOS (com data de leilão futura a ${todayStr}) localizados no estado do ${state} (especialmente em ${city} ou Região Metropolitana).

${targetType === 'extrajudicial' 
  ? 'Foque em imóveis retomados por bancos (Santander, Itaú, Bradesco, Banco do Brasil, Inter, Pan, Safra, etc.) ou alienação fiduciária.' 
  : 'Foque em imóveis com processo judicial, penhora, falência ou execução judicial das varas cíveis/trabalhistas.'}

Gere links REAIS que apontem diretamente para o lote do imóvel dentro de um dos portais citados.

Retorne EXCLUSIVAMENTE um array JSON puro (sem explicações, sem markdown fora do bloco json):
[
  {
    "portalId": "identificador do portal configurado",
    "auctioneerName": "Nome do leiloeiro (ex: Portal Zuk, Mega Leilões, Sold Leilões, Pestana Leilões)",
    "title": "Apartamento / Casa no Bairro X",
    "address": "Endereço com rua e número se disponível",
    "neighborhood": "Nome do Bairro oficial",
    "city": "${city}",
    "state": "${state}",
    "propertyType": "Apartamento" | "Casa" | "Terreno" | "Comercial",
    "sizeSqm": número da metragem em m² (ex: 65),
    "auctionPrice": valor do lance mínimo em reais (número inteiro sem vírgulas),
    "estimatedValue": valor de avaliação do leilão em reais,
    "auctionDate": "AAAA-MM-DD",
    "firstAuctionDate": "AAAA-MM-DD da primeira praça, se houver",
    "secondAuctionDate": "AAAA-MM-DD da segunda praça, se houver",
    "saleMode": "Venda Direta" | "Licitação Aberta" | "Leilão Online" | "Aceita Propostas",
    "auctionLink": "URL direta do lote no site do leiloeiro",
    "imageUrl": "URL da foto se disponível",
    "description": "Detalhes do lote e comitente/banco",
    "sellerBank": "Nome do banco se houver (ex: Santander, Itaú)"
  }
]
`;

  try {
    console.log(`[Auctioneer Grounded Miner] Iniciando busca no Google para leilões ${targetType} em ${city}-${state}...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const responseText = response.text || '';
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/) || [null, responseText];
    let jsonStr = (jsonMatch[1] || responseText).trim();
    jsonStr = jsonStr.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item.auctionLink || !isConfiguredAuctionLink(item.auctionLink) || !item.auctionPrice || item.auctionPrice <= 0) continue;
        results.push({
          portalId: item.portalId || 'portal',
          auctioneerName: item.auctioneerName || 'Leiloeiro Oficial',
          title: item.title || 'Imóvel em Leilão',
          address: item.address || '',
          neighborhood: item.neighborhood || 'Centro',
          city: item.city || city,
          state: item.state || state,
          propertyType: parseType(item.propertyType || item.title),
          sizeSqm: Number(item.sizeSqm) || 0,
          auctionPrice: Math.round(Number(item.auctionPrice)),
          estimatedValue: item.estimatedValue ? Math.round(Number(item.estimatedValue)) : Math.round(Number(item.auctionPrice) * 1.5),
          auctionDate: item.auctionDate || item.firstAuctionDate || '',
          firstAuctionDate: item.firstAuctionDate || item.auctionDate || undefined,
          secondAuctionDate: item.secondAuctionDate || undefined,
          auctionLink: item.auctionLink,
          imageUrl: item.imageUrl,
          description: item.description || '',
          saleMode: item.saleMode || extractSaleMode(item.description || item.title || ''),
          origin: targetType,
          sellerBank: item.sellerBank
        });
      }
    }
  } catch (err: any) {
    console.error('[Auctioneer Grounded Miner] Erro:', err.message);
  }

  return results;
}

// Master Pipeline: Runs all scrapers in parallel, deduplicates, and enriches
export async function syncAuctioneersPipeline(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro',
  existingAuctions: AuctionProperty[],
  recalculateFn: (auc: AuctionProperty) => AuctionProperty
): Promise<{ newAuctions: AuctionProperty[]; totalScraped: number }> {
  console.log(`\n======================================================`);
  console.log(`[Auctioneer Master Sync] Sincronizando Leilões ${targetType.toUpperCase()} para ${city}-${state}...`);
  console.log(`Portais configurados: ${AUCTIONEER_PORTALS.map(p => p.name).join(', ')}`);
  console.log(`======================================================\n`);

  const [megaList, frazaoList, biasiList, configuredList, groundedList] = await Promise.all([
    scrapeMegaLeiloes(targetType, state, city).catch(() => []),
    scrapeFrazao(targetType, state, city).catch(() => []),
    scrapeBiasi(targetType, state, city).catch(() => []),
    scrapeConfiguredAuctioneers(targetType, state, city).catch(() => []),
    scrapeGroundedAuctioneers(targetType, state, city).catch(() => [])
  ]);

  const allDrafts = [...megaList, ...frazaoList, ...biasiList, ...configuredList, ...groundedList];
  console.log(`[Auctioneer Master Sync] Total bruto capturado nos portais: ${allDrafts.length}`);

  const existingLinks = new Set(existingAuctions.map(a => a.auctionLink).filter(Boolean));
  const newAuctions: AuctionProperty[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const draft of allDrafts) {
    const lastKnownDate = draft.secondAuctionDate || draft.firstAuctionDate || draft.auctionDate;
    if (!isConfiguredAuctionLink(draft.auctionLink) || draft.sizeSqm <= 0 || draft.auctionPrice <= 0 || !lastKnownDate || lastKnownDate < today) {
      continue;
    }
    if (existingLinks.has(draft.auctionLink)) {
      const existing = existingAuctions.find(item => item.auctionLink === draft.auctionLink);
      if (existing && draft.addressVerified && draft.sizeVerified && hasAuditableAddress(draft.address)) {
        Object.assign(existing, recalculateFn({ ...existing, address: draft.address, sizeSqm: draft.sizeSqm,
          description: draft.description, matriculaText: draft.matriculaText || existing.matriculaText,
          matriculaUrl: draft.matriculaUrl || existing.matriculaUrl,
          allowsFinancing: draft.allowsFinancing ?? existing.allowsFinancing ?? false,
          allowsInstallments: draft.allowsInstallments ?? existing.allowsInstallments ?? false,
          paymentTerms: draft.paymentTerms || existing.paymentTerms,
          maxInstallments: draft.maxInstallments ?? existing.maxInstallments,
          minDownpaymentPercent: draft.minDownpaymentPercent ?? existing.minDownpaymentPercent,
          pendingIptuCost: draft.pendingIptuCost ?? existing.pendingIptuCost,
          pendingCondoCost: draft.pendingCondoCost ?? existing.pendingCondoCost }));
      }
      continue;
    }
    existingLinks.add(draft.auctionLink);

    const baseId = `auc-${draft.portalId}-${normalizeStr(draft.title).slice(0, 15)}-${Math.floor(Math.random() * 100000)}`;

    if (!draft.addressVerified || !draft.sizeVerified || !hasAuditableAddress(draft.address)) continue;

    const rawAuc: AuctionProperty = {
      id: baseId,
      title: draft.title,
      address: draft.address,
      neighborhood: draft.neighborhood,
      city: draft.city,
      state: draft.state,
      propertyType: draft.propertyType,
      sizeSqm: draft.sizeSqm,
      auctionPrice: draft.auctionPrice,
      estimatedRepair: Math.round(draft.auctionPrice * 0.05),
      pendingDebts: 0,
      otherCosts: 0,
      estimatedValue: draft.estimatedValue,
      auctionDate: draft.auctionDate,
      firstAuctionDate: draft.firstAuctionDate,
      secondAuctionDate: draft.secondAuctionDate,
      auctionLink: draft.auctionLink,
      auctioneerName: draft.auctioneerName,
      matriculaText: draft.matriculaText,
      matriculaUrl: draft.matriculaUrl,
      saleMode: draft.saleMode,
      imageUrl: draft.imageUrl,
      description: draft.description || `${draft.title} - Leiloeiro: ${draft.auctioneerName}`,
      status: 'Pendente',
      occupied: true,
      origin: targetType,
      allowsFinancing: draft.allowsFinancing ?? false,
      allowsInstallments: draft.allowsInstallments ?? false,
      paymentTerms: draft.paymentTerms || 'Condição de pagamento não confirmada na fonte',
      maxInstallments: draft.maxInstallments,
      minDownpaymentPercent: draft.minDownpaymentPercent,
      pendingIptuCost: draft.pendingIptuCost,
      pendingCondoCost: draft.pendingCondoCost,
      downpaymentPercent: draft.minDownpaymentPercent
    };

    // Calculate official ITBI benchmarks, Flip Rápido, Gabarito, Lucro, ROI, etc.
    const calculated = recalculateFn(rawAuc);
    newAuctions.push(calculated);
  }

  console.log(`[Auctioneer Master Sync] Novos leilões ${targetType} adicionados e auditados com sucesso: ${newAuctions.length}`);
  return {
    newAuctions,
    totalScraped: allDrafts.length
  };
}
