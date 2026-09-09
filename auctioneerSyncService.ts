import puppeteer from 'puppeteer';
import { GoogleGenAI } from '@google/genai';
import { AuctionProperty, PropertyType } from './src/types.ts';

export interface AuctioneerPortalConfig {
  id: string;
  name: string;
  domain: string;
  baseUrl: string;
  enabled: boolean;
}

export const AUCTIONEER_PORTALS: AuctioneerPortalConfig[] = [
  { id: 'frazao', name: 'Frazão Leilões', domain: 'frazaoleiloes.com.br', baseUrl: 'https://www.frazaoleiloes.com.br', enabled: true },
  { id: 'biasi', name: 'Biasi Leilões', domain: 'biasileiloes.com.br', baseUrl: 'https://www.biasileiloes.com.br', enabled: true },
  { id: 'megaleiloes', name: 'Mega Leilões', domain: 'megaleiloes.com.br', baseUrl: 'https://www.megaleiloes.com.br', enabled: true },
  { id: 'portalzuk', name: 'Portal Zuk', domain: 'portalzuk.com.br', baseUrl: 'https://www.portalzuk.com.br', enabled: true },
  { id: 'sold', name: 'Sold Leilões', domain: 'sold.com.br', baseUrl: 'https://www.sold.com.br', enabled: true },
  { id: 'pestana', name: 'Pestana Leilões', domain: 'pestanaleiloes.com.br', baseUrl: 'https://www.pestanaleiloes.com.br', enabled: true },
  { id: 'mgl', name: 'MGL Leilões', domain: 'mgl.com.br', baseUrl: 'https://www.mgl.com.br', enabled: true }
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

function extractAddress(text: string, fallback: string): string {
  const lines = text.split(/\r?\n|\s{2,}/).map(line => line.trim()).filter(Boolean);
  const addressLine = lines.find(line => /\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo)\s+.{3,}/i.test(line));
  if (addressLine) {
    return addressLine.replace(/\s+(?:bairro|cidade|estado)\s*[:\-].*$/i, '').trim();
  }
  const normalized = text.replace(/\s+/g, ' ').trim();
  const addressMatch = normalized.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo)\s+[^|;]{3,120}/i);
  return addressMatch ? addressMatch[0].replace(/\s{2,}/g, ' ').trim() : fallback;
}

function extractAuctionDates(text: string): { first?: string; second?: string } {
  const dates = [...text.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/g)]
    .map(match => `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
  return { first: dates[0], second: dates.find(date => date !== dates[0]) };
}

function extractAuctionDate(text: string): string {
  return extractAuctionDates(text).first || '';
}

function extractSaleMode(text: string): string {
  const normalized = normalizeStr(text);
  if (normalized.includes('aceita proposta') || normalized.includes('recebe proposta')) return 'Aceita Propostas';
  if (normalized.includes('venda direta')) return 'Venda Direta';
  if (normalized.includes('licitacao aberta') || normalized.includes('licitação aberta')) return 'Licitação Aberta';
  if (normalized.includes('leilao sfi') || normalized.includes('leilão sfi')) return 'Leilão SFI';
  return 'Leilão Online';
}

async function enrichLotDetails(browser: any, draft: ScrapedAuctionDraft): Promise<ScrapedAuctionDraft> {
  let detailPage: any = null;
  try {
    detailPage = await browser.newPage();
    await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await detailPage.goto(draft.auctionLink, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const detailText = await detailPage.evaluate(() => document.body?.innerText || '');
    const dates = extractAuctionDates(detailText);
    const enrichedDescription = detailText.replace(/\s+/g, ' ').trim().slice(0, 1200);
    return {
      ...draft,
      address: extractAddress(detailText, draft.address),
      auctionDate: dates.first || draft.auctionDate,
      firstAuctionDate: dates.first || draft.firstAuctionDate,
      secondAuctionDate: dates.second || draft.secondAuctionDate,
      saleMode: extractSaleMode(detailText || draft.description || ''),
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
        sizeSqm: raw.size > 0 ? raw.size : 60,
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
        sizeSqm: raw.size > 0 ? raw.size : 60,
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
        sizeSqm: 65,
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

// 4. Grounded AI Live Search across all 7 Auction Houses (Zuk, Sold, Pestana, MGL, Mega, Biasi, Frazão)
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
Realize uma pesquisa ativa no Google (Google Search Grounding) focando estritamente nos seguintes 7 portais de leiloeiros oficiais:
${domains} (Portal Zuk, Mega Leilões, Biasi Leilões, Frazão Leilões, Sold Leilões/Superbid, Pestana Leilões, MGL Leilões).

Objetivo:
Encontre entre 4 e 8 ${targetLabel} de imóveis ATIVOS (com data de leilão futura a ${todayStr}) localizados no estado do ${state} (especialmente em ${city} ou Região Metropolitana).

${targetType === 'extrajudicial' 
  ? 'Foque em imóveis retomados por bancos (Santander, Itaú, Bradesco, Banco do Brasil, Inter, Pan, Safra, etc.) ou alienação fiduciária.' 
  : 'Foque em imóveis com processo judicial, penhora, falência ou execução judicial das varas cíveis/trabalhistas.'}

Gere links REAIS que apontem diretamente para o lote do imóvel dentro de um dos portais citados.

Retorne EXCLUSIVAMENTE um array JSON puro (sem explicações, sem markdown fora do bloco json):
[
  {
    "portalId": "zuk" | "megaleiloes" | "biasi" | "frazao" | "sold" | "pestana" | "mgl",
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
        if (!item.auctionLink || !item.auctionPrice || item.auctionPrice <= 0) continue;
        results.push({
          portalId: item.portalId || 'portal',
          auctioneerName: item.auctioneerName || 'Leiloeiro Oficial',
          title: item.title || 'Imóvel em Leilão',
          address: item.address || item.title,
          neighborhood: item.neighborhood || 'Centro',
          city: item.city || city,
          state: item.state || state,
          propertyType: parseType(item.propertyType || item.title),
          sizeSqm: Number(item.sizeSqm) || 60,
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

  const [megaList, frazaoList, biasiList, groundedList] = await Promise.all([
    scrapeMegaLeiloes(targetType, state, city).catch(() => []),
    scrapeFrazao(targetType, state, city).catch(() => []),
    scrapeBiasi(targetType, state, city).catch(() => []),
    scrapeGroundedAuctioneers(targetType, state, city).catch(() => [])
  ]);

  const allDrafts = [...megaList, ...frazaoList, ...biasiList, ...groundedList];
  console.log(`[Auctioneer Master Sync] Total bruto capturado nos portais: ${allDrafts.length}`);

  const existingLinks = new Set(existingAuctions.map(a => a.auctionLink).filter(Boolean));
  const newAuctions: AuctionProperty[] = [];

  for (const draft of allDrafts) {
    if (existingLinks.has(draft.auctionLink)) {
      continue;
    }
    existingLinks.add(draft.auctionLink);

    const baseId = `auc-${draft.portalId}-${normalizeStr(draft.title).slice(0, 15)}-${Math.floor(Math.random() * 100000)}`;

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
      estimatedValue: draft.estimatedValue || Math.round(draft.auctionPrice * 1.5),
      auctionDate: draft.auctionDate,
      firstAuctionDate: draft.firstAuctionDate,
      secondAuctionDate: draft.secondAuctionDate,
      auctionLink: draft.auctionLink,
      auctioneerName: draft.auctioneerName,
      saleMode: draft.saleMode,
      imageUrl: draft.imageUrl,
      description: draft.description || `${draft.title} - Leiloeiro: ${draft.auctioneerName}`,
      status: 'Pendente',
      occupied: true,
      origin: targetType,
      allowsFinancing: targetType === 'extrajudicial',
      downpaymentPercent: targetType === 'extrajudicial' ? 20 : 25
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
