import * as cheerio from 'cheerio';
import type { AuctionProperty, PropertyType } from '../types.ts';
import { toCanonicalPropertyType } from './propertyTypes.ts';
import { auditOfficialArea } from './officialAreaAudit.ts';

export interface ParsedCaixaDetailResult {
  property: AuctionProperty;
  inDispute: boolean;
  isRemoved: boolean;
  state: string;
  imageUrl?: string;
}

export function isRadwareCaixaResponse(content: string): boolean {
  if (!content) return false;
  return /perfdrive|radware|bot\s*manager|hcaptcha|g-recaptcha|pardon\s+our\s+interruption|captcha\.css/i.test(content);
}

export function extractCaixaImovelId(inputUrlOrHtml: string): string {
  const urlMatch = String(inputUrlOrHtml || '').match(/[?&]hdnimovel=(\d+)/i);
  if (urlMatch) return urlMatch[1];
  const hiddenMatch = String(inputUrlOrHtml || '').match(/(?:id|name)=["']?hdnimovel["']?[^>]*value=["']?(\d+)/i);
  if (hiddenMatch) return hiddenMatch[1];
  const fotoMatch = String(inputUrlOrHtml || '').match(/\/fotos\/F(\d{10,16})\./i);
  if (fotoMatch) return fotoMatch[1];
  return '';
}

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cleanCityFromCaixa(rawCity: string, uf: string): string {
  if (!rawCity) return uf === 'MG' ? 'Juiz de Fora' : 'Rio de Janeiro';
  const norm = normalizeText(rawCity);
  if (norm === 'niteroi') return 'Niterói';
  if (norm === 'juiz de fora') return 'Juiz de Fora';
  if (norm === 'rio de janeiro') return 'Rio de Janeiro';
  return rawCity.trim().toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatNeighborhood(raw: string): string {
  const cleaned = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Não informado';
  if (normalizeText(cleaned) === 'taua') return 'Tauá';
  return cleaned
    .toLowerCase()
    .split(/\s+/)
    .map(w => (['da', 'de', 'do', 'das', 'dos', 'e'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function parseBrDecimal(raw: string | undefined): number {
  if (!raw) return 0;
  const parsed = Number(String(raw).replace(/\./g, '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseCaixaDetailHtml(
  html: string,
  link: string,
  userId = 'system'
): ParsedCaixaDetailResult {
  if (isRadwareCaixaResponse(html)) {
    throw new Error('RADWARE_CAPTCHA_BLOCKED');
  }

  const $ = cheerio.load(html || '');
  $('script, style, noscript').remove();
  const blockTexts: string[] = [];
  $('h1, h2, h3, h4, h5, p, span, li, td, div.control-item, div.content').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t && t.length <= 400) blockTexts.push(t);
  });
  const flatText = ($('body').text() || $.text() || '').replace(/\s+/g, ' ').trim();
  const caixaId = extractCaixaImovelId(link) || extractCaixaImovelId(html);
  const canonicalUrl = caixaId
    ? `https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnimovel=${caixaId}`
    : link;

  const inDispute = /\bim[oó]vel\s+em\s+disputa\b/i.test(flatText);

  const headingMatch = blockTexts
    .map(t => t.match(/^\s*([A-ZÀ-Ý\s.]+?)\s*-\s*([A-ZÀ-Ý0-9\s.]{2,60})\s*$/i))
    .find(Boolean)
    || flatText.match(/\b(RIO DE JANEIRO|NITER[ÓO]I|JUIZ DE FORA)\s*-\s*([A-ZÀ-Ý0-9\s.]{2,40}?)(?=\s+(?:Im[oó]vel\s+em\s+disputa|Valor|Edital|Tipo\s+de\s+im[oó]vel|N[úu]mero\s+do\s+im[oó]vel|$))/i);

  const evalMatch = flatText.match(/Valor\s+de\s+avalia[çc][aã]o\s*:?\s*R\$\s*([\d.]+,\d{2})/i);
  const minPriceMatch = flatText.match(/Valor\s+m[ií]nimo\s+de\s+venda(?:\s*\d*[ªº]?\s*(?:Leil[aã]o|Venda)?)?\s*:?\s*R\$\s*([\d.]+,\d{2})/i)
    || flatText.match(/Valor\s+m[ií]nimo\s*:?\s*R\$\s*([\d.]+,\d{2})/i);

  const evaluationPrice = parseBrDecimal(evalMatch?.[1]) || undefined;
  const auctionPrice = parseBrDecimal(minPriceMatch?.[1]);

  const typeMatch = flatText.match(/Tipo\s+de\s+im[oó]vel\s*:?\s*([A-Za-zÀ-ÿ\s/]+?)(?=\s+(?:Situa[çc][aã]o|Quartos|Garagem|N[úu]mero|Matr[ií]cula|Comarca|Inscri[çc][aã]o|[ÁA]rea|Endere[çc]o|$))/i);
  const rawType = (typeMatch?.[1] || '').trim();
  const propertyType: PropertyType = toCanonicalPropertyType(rawType, '', flatText);

  const bedroomsMatch = flatText.match(/Quartos\s*:?\s*(\d+)/i);
  const parkingMatch = flatText.match(/(?:Garagem|Vagas?)\s*:?\s*(\d+)/i);
  const wcMatch = flatText.match(/(?:Banheiros?|WC)\s*:?\s*(\d+)/i);
  const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : undefined;
  const parkingSpaces = parkingMatch ? parseInt(parkingMatch[1], 10) : undefined;
  const bathrooms = wcMatch ? parseInt(wcMatch[1], 10) : undefined;

  const privAreaMatch = flatText.match(/[ÁA]rea\s+privativa\s*[:=]?\s*([\d.]+(?:,\d+)?)\s*m[²2]?/i)
    || flatText.match(/[ÁA]rea\s+[úu]til\s*[:=]?\s*([\d.]+(?:,\d+)?)\s*m[²2]?/i);
  const totalAreaMatch = flatText.match(/[ÁA]rea\s+total\s*[:=]?\s*([\d.]+(?:,\d+)?)\s*m[²2]?/i);
  const terrainAreaMatch = flatText.match(/[ÁA]rea\s+do\s+terreno\s*[:=]?\s*([\d.]+(?:,\d+)?)\s*m[²2]?/i);
  const auditedArea = auditOfficialArea({
    text: flatText,
    title: rawType,
    propertyType,
    url: canonicalUrl,
    extractedValue: parseBrDecimal(privAreaMatch?.[1]) || parseBrDecimal(totalAreaMatch?.[1]) || parseBrDecimal(terrainAreaMatch?.[1])
  }).selected?.value || 0;
  const sizeSqm = parseBrDecimal(privAreaMatch?.[1]) || auditedArea || parseBrDecimal(totalAreaMatch?.[1]) || parseBrDecimal(terrainAreaMatch?.[1]);

  const addrMatch = flatText.match(/Endere[çc]o\s*:?\s*(.+?)(?=\s*(?:Descri[çc][aã]o\b|Formas\s+de\s+pagamento\b|Permite\s+financiamento\b|N[aã]o\s+permite\s+financiamento\b|Observa[çc][õo]es\b|Regras\s+da|Para\s+mais\s+informa[çc][õo]es|Edital\b|Matr[ií]cula\b|Comarca\b|$))/i);
  const rawAddressFull = (addrMatch?.[1] || '').replace(/\s+/g, ' ').replace(/,\s*N\./i, ', N.').trim();

  // Example: "RUA HAIA,N. 287, TAUA - CEP: 21920-180, RIO DE JANEIRO - RIO DE JANEIRO"
  const cityStateInAddr = rawAddressFull.match(/,\s*(RIO DE JANEIRO|NITER[ÓO]I|JUIZ DE FORA)\s*-\s*(RIO DE JANEIRO|MINAS GERAIS|RJ|MG)\s*$/i);
  let state = 'RJ';
  if (cityStateInAddr) {
    state = /MINAS|MG/i.test(cityStateInAddr[2]) ? 'MG' : 'RJ';
  } else if (headingMatch && /JUIZ DE FORA/i.test(headingMatch[1])) {
    state = 'MG';
  } else if (/\bJUIZ\s+DE\s+FORA\b/i.test(flatText)) {
    state = 'MG';
  }

  const rawCity = cityStateInAddr?.[1] || headingMatch?.[1] || (state === 'MG' ? 'Juiz de Fora' : 'Rio de Janeiro');
  const city = cleanCityFromCaixa(rawCity, state);

  const bairroInAddr = rawAddressFull.match(/,\s*([^,-]{2,45}?)\s*-\s*CEP\s*:/i);
  const rawNeighborhood = bairroInAddr?.[1] || headingMatch?.[2] || '';
  const neighborhood = formatNeighborhood(rawNeighborhood);

  const cleanStreetAddr = rawAddressFull
    .replace(/,\s*(?:RIO DE JANEIRO|NITER[ÓO]I|JUIZ DE FORA)\s*-\s*(?:RIO DE JANEIRO|MINAS GERAIS|RJ|MG)\s*$/i, '')
    .replace(/,\s*N\.\s*/i, ', N. ')
    .trim();

  const descMatch = flatText.match(/Descri[çc][aã]o\s*:?\s*(.+?)(?=\s*(?:Formas\s+de\s+pagamento|Regras\s+da|Despesas|Consulte|$))/i);
  const permiteFinanc = /Permite\s+(?:a\s+utiliza[çc][aã]o\s+de\s+)?financiamento/i.test(flatText) &&
    !/N[ãa]o\s+permite\s+(?:a\s+utiliza[çc][aã]o\s+de\s+)?financiamento|somente\s+[àa]\s+vista/i.test(flatText);

  const modeMatch = flatText.match(/Modalidade\s+de\s+venda\s*:?\s*([A-Za-zÀ-ÿ\s\-]{3,40}?)(?=\s+(?:Edital|Im[oó]vel|Valor|N[úu]mero|Tipo|$))/i);
  const saleMode = inDispute ? 'Imóvel em disputa' : (modeMatch?.[1]?.trim() || (/Venda\s+Direta\s+Online/i.test(flatText) ? 'Venda Direta Online' : (/Venda\s+Online/i.test(flatText) ? 'Venda Online' : undefined)));

  let imageUrl: string | undefined;
  const imgSrc = $('img#preview').attr('src') || $('img[src*="/fotos/"]').first().attr('src');
  if (imgSrc) {
    imageUrl = imgSrc.startsWith('http') ? imgSrc : `https://venda-imoveis.caixa.gov.br${imgSrc.startsWith('/') ? '' : '/'}${imgSrc}`;
  } else if (caixaId) {
    imageUrl = `https://venda-imoveis.caixa.gov.br/fotos/F${caixaId}21.jpg`;
  }

  const explicitRemoved = /\b(?:im[oó]vel\s+n[aã]o\s+encontrado|nenhum\s+im[oó]vel\s+encontrado|im[oó]vel\s+indispon[ií]vel|n[aã]o\s+est[aá]\s+mais\s+dispon[ií]vel|im[oó]vel\s+vendido)\b/i.test(flatText);
  const isRemoved = explicitRemoved || (!auctionPrice && !evaluationPrice && !cleanStreetAddr);

  const title = `${propertyType} Retomado Caixa - ${neighborhood.toUpperCase()}${inDispute ? ' (Em disputa)' : ''}`.slice(0, 100);
  const idNum = caixaId || String(Date.now());
  const property: AuctionProperty = {
    id: `auc-caixa-${idNum}`,
    canonicalPropertyId: caixaId ? `CAIXA_${caixaId}` : undefined,
    title,
    address: cleanStreetAddr,
    neighborhood,
    city,
    state,
    propertyType,
    sizeSqm,
    auctionPrice,
    evaluationPrice,
    estimatedRepair: 0,
    pendingDebts: 0,
    otherCosts: 0,
    estimatedValue: 0,
    auctionDate: '',
    auctionLink: canonicalUrl,
    imageUrl,
    description: [
      'Imóvel Retomado Caixa Econômica Federal.',
      saleMode ? `Modalidade: ${saleMode}.` : '',
      evaluationPrice ? `Avaliação original Caixa: R$ ${evaluationPrice.toFixed(2)}.` : '',
      descMatch?.[1] ? `Descrição: ${descMatch[1].trim()}` : '',
      rawAddressFull ? `Endereço oficial Caixa: ${rawAddressFull}.` : ''
    ].filter(Boolean).join(' '),
    status: 'Pendente',
    occupied: true,
    allowsFinancing: permiteFinanc,
    allowsInstallments: false,
    userId,
    origin: 'caixa',
    bedrooms,
    parkingSpaces,
    bathrooms,
    saleMode,
    sourceVerified: true,
    originVerified: true,
    priceVerified: auctionPrice > 0,
    sizeVerified: sizeSqm > 0,
    ingestionStatus: auctionPrice > 0 ? 'ativo' : 'quarentena_extracao'
  };

  return {
    property,
    inDispute,
    isRemoved,
    state,
    imageUrl
  };
}
