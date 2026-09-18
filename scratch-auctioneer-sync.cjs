var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// auctioneerSyncService.ts
var auctioneerSyncService_exports = {};
__export(auctioneerSyncService_exports, {
  AUCTIONEER_PORTALS: () => AUCTIONEER_PORTALS,
  scrapeBiasi: () => scrapeBiasi,
  scrapeConfiguredAuctioneers: () => scrapeConfiguredAuctioneers,
  scrapeFrazao: () => scrapeFrazao,
  scrapeGroundedAuctioneers: () => scrapeGroundedAuctioneers,
  scrapeMegaLeiloes: () => scrapeMegaLeiloes,
  syncAuctioneersPipeline: () => syncAuctioneersPipeline
});
module.exports = __toCommonJS(auctioneerSyncService_exports);
var import_puppeteer = __toESM(require("puppeteer"), 1);
var import_genai = require("@google/genai");
var AUCTIONEER_PORTALS = [
  { id: "frazao", name: "Fraz\xE3o Leil\xF5es", domain: "frazaoleiloes.com.br", baseUrl: "https://www.frazaoleiloes.com.br", enabled: true },
  { id: "biasi", name: "Biasi Leil\xF5es", domain: "biasileiloes.com.br", baseUrl: "https://www.biasileiloes.com.br", enabled: true },
  { id: "megaleiloes", name: "Mega Leil\xF5es", domain: "megaleiloes.com.br", baseUrl: "https://www.megaleiloes.com.br", enabled: true },
  { id: "portalzuk", name: "Portal Zuk", domain: "portalzuk.com.br", baseUrl: "https://www.portalzuk.com.br", enabled: true },
  { id: "sold", name: "Sold Leil\xF5es", domain: "sold.com.br", baseUrl: "https://www.sold.com.br", enabled: true },
  { id: "pestana", name: "Pestana Leil\xF5es", domain: "pestanaleiloes.com.br", baseUrl: "https://www.pestanaleiloes.com.br", enabled: true },
  { id: "mgl", name: "MGL Leil\xF5es", domain: "mgl.com.br", baseUrl: "https://www.mgl.com.br", enabled: true },
  { id: "santander", name: "Santander Im\xF3veis", domain: "santanderimoveis.com.br", baseUrl: "https://www.santanderimoveis.com.br", genericScrape: true, enabled: true },
  { id: "ricart", name: "Ricart Leil\xF5es", domain: "ricartleiloes.com.br", baseUrl: "https://www.ricartleiloes.com.br", genericScrape: true, enabled: true },
  { id: "pamela", name: "Pamela Leiloeira", domain: "pamelaleiloeira.com.br", baseUrl: "https://www.pamelaleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "gustavo", name: "Gustavo Leiloeiro", domain: "gustavoleiloeiro.com.br", baseUrl: "https://gustavoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "onildo", name: "Onildo Bastos", domain: "onildobastos.com.br", baseUrl: "https://www.onildobastos.com.br", searchUrl: "https://www.onildobastos.com.br/Principal.asp", genericScrape: true, enabled: true },
  { id: "schulmann", name: "Schulmann Leil\xF5es", domain: "schulmannleiloes.com.br", baseUrl: "https://schulmannleiloes.com.br", genericScrape: true, enabled: true },
  { id: "saraiva", name: "Saraiva Leil\xF5es", domain: "saraivaleiloes.com.br", baseUrl: "https://www.saraivaleiloes.com.br", searchUrl: "https://www.saraivaleiloes.com.br/buscador?categoria=2", genericScrape: true, enabled: true },
  { id: "ayupp", name: "Fabiano Ayupp Leiloeiro", domain: "fabianoayuppleiloeiro.com.br", baseUrl: "https://fabianoayuppleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "rymer", name: "Rymer Leil\xF5es", domain: "rymerleiloes.com.br", baseUrl: "https://www.rymerleiloes.com.br", genericScrape: true, enabled: true },
  { id: "depaula", name: "De Paula Leil\xF5es", domain: "depaulaonline.com.br", baseUrl: "https://depaulaonline.com.br", genericScrape: true, enabled: true },
  { id: "jv", name: "JV Leil\xF5es", domain: "jvleiloes.lel.br", baseUrl: "https://www.jvleiloes.lel.br", searchUrl: "https://www.jvleiloes.lel.br/lotes/imovel?tipo=imovel&address_uf=RJ&address_cidade_ibge=3304557", genericScrape: true, enabled: true },
  { id: "paulobotelho", name: "Paulo Botelho Leiloeiro", domain: "paulobotelholeiloeiro.com.br", baseUrl: "https://www.paulobotelholeiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "alexandro", name: "Alexandro Leiloeiro", domain: "alexandroleiloeiro.com.br", baseUrl: "https://alexandroleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "portella", name: "Portella Leil\xF5es", domain: "portellaleiloes.com.br", baseUrl: "https://portellaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "silas", name: "Silas Leiloeiro", domain: "silasleiloeiro.lel.br", baseUrl: "https://www.silasleiloeiro.lel.br", searchUrl: "https://www.silasleiloeiro.lel.br/Principal.asp?at=jd", genericScrape: true, enabled: true },
  { id: "joaoemilio", name: "Jo\xE3o Em\xEDlio Leiloeiro", domain: "joaoemilio.com.br", baseUrl: "https://www.joaoemilio.com.br", searchUrl: "https://www.joaoemilio.com.br/lotes/imovel?tipo=imovel&address_uf=RJ&address_cidade_ibge=3304557", genericScrape: true, enabled: true },
  { id: "facanha", name: "Fa\xE7anha Leil\xF5es", domain: "facanhaleiloes.com.br", baseUrl: "https://facanhaleiloes.com.br", genericScrape: true, enabled: true }
];
function normalizeStr(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function parseType(text) {
  const norm = normalizeStr(text);
  if (norm.includes("apartamento") || norm.includes("apto") || norm.includes("studio") || norm.includes("cobertura") || norm.includes("flat")) {
    return "Apartamento";
  }
  if (norm.includes("casa") || norm.includes("sobrado") || norm.includes("vila")) {
    return "Casa";
  }
  if (norm.includes("terreno") || norm.includes("lote") || norm.includes("gleba")) {
    return "Terreno";
  }
  if (norm.includes("comercial") || norm.includes("sala") || norm.includes("loja") || norm.includes("galp") || norm.includes("predio") || norm.includes("pr\xE9dio")) {
    return "Comercial";
  }
  return "Apartamento";
}
function detectBankOrJudicial(text) {
  const norm = normalizeStr(text);
  if (norm.includes("santander")) return { origin: "extrajudicial", bank: "Santander" };
  if (norm.includes("itau") || norm.includes("ita\xFA")) return { origin: "extrajudicial", bank: "Ita\xFA" };
  if (norm.includes("bradesco")) return { origin: "extrajudicial", bank: "Bradesco" };
  if (norm.includes("caixa")) return { origin: "extrajudicial", bank: "Caixa" };
  if (norm.includes("inter")) return { origin: "extrajudicial", bank: "Banco Inter" };
  if (norm.includes("pan")) return { origin: "extrajudicial", bank: "Banco Pan" };
  if (norm.includes("safra")) return { origin: "extrajudicial", bank: "Safra" };
  if (norm.includes("banco do brasil") || norm.includes("bb")) return { origin: "extrajudicial", bank: "Banco do Brasil" };
  if (norm.includes("alienacao fiduciaria") || norm.includes("aliena\xE7\xE3o fiduci\xE1ria") || norm.includes("extrajudicial") || norm.includes("banco")) {
    return { origin: "extrajudicial", bank: "Institui\xE7\xE3o Financeira" };
  }
  if (norm.includes("vara") || norm.includes("judicial") || norm.includes("falencia") || norm.includes("fal\xEAncia") || norm.includes("execucao") || norm.includes("execu\xE7\xE3o") || norm.includes("civel") || norm.includes("c\xEDvel") || norm.includes("trabalho") || norm.includes("trt") || norm.includes("tj")) {
    return { origin: "judicial" };
  }
  return { origin: "extrajudicial" };
}
function extractAddress(text, fallback) {
  const lines = text.split(/\r?\n|\s{2,}/).map((line) => line.trim()).filter(Boolean);
  const labeledLine = lines.find((line) => /\bendere[cç]o\b/i.test(line) && /\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(line));
  if (labeledLine) {
    const labeledAddress = labeledLine.replace(/^.*?\bendere[cç]o(?:\s+cf\.?\s+auto\s+de\s+penhora)?\s*:?\s*/i, "").split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0].replace(/\s+/g, " ").trim();
    if (labeledAddress.length >= 8) return labeledAddress.slice(0, 180);
  }
  const addressLine = lines.find((line) => /\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo)\s+.{3,}/i.test(line));
  if (addressLine) {
    const extracted = addressLine.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\s+.{3,180}/i)?.[0] || addressLine;
    return extracted.split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0].replace(/\s+(?:bairro|cidade|estado)\s*[:\-].*$/i, "").trim();
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  const addressMatch = normalized.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo)\s+[^|;]{3,120}/i);
  return addressMatch ? addressMatch[0].replace(/\s{2,}/g, " ").trim() : fallback;
}
function extractDeclaredCity(text, state) {
  const escapedState = state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\bcidade\\s*:\\s*([^\\n/]{2,50})\\s*/\\s*${escapedState}\\b`, "i"),
    new RegExp(`\\bmunic[i\xED]pio\\s+de\\s+([^,.;/\\n-]{2,50})\\s*[-/]\\s*${escapedState}\\b`, "i"),
    new RegExp(`\\b(Rio de Janeiro)\\s*[-/]\\s*${escapedState}\\b`, "i")
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}
function extractAuctionDates(text) {
  const dates = [...text.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/g)].map((match) => `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
  return { first: dates[0], second: dates.find((date) => date !== dates[0]) };
}
function extractAuctionDate(text) {
  return extractAuctionDates(text).first || "";
}
function extractMinimumBid(text) {
  const values = [...text.matchAll(/lance\s+(?:inicial|m[ií]nimo)(?:\s+\d+[ªºo]?\s*(?:leil[aã]o|pra[cç]a))?\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/gi)].map((match) => Number(match[1].replace(/\./g, "").replace(",", "."))).filter((value) => Number.isFinite(value) && value > 0);
  return values.length > 0 ? Math.round(Math.min(...values)) : 0;
}
function extractAppraisal(text) {
  const match = text.match(/valor\s+(?:de\s+)?avalia[cç][aã]o\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (!match) return void 0;
  const value = Number(match[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : void 0;
}
function extractSaleMode(text) {
  const normalized = normalizeStr(text);
  if (normalized.includes("aceita proposta") || normalized.includes("recebe proposta")) return "Aceita Propostas";
  if (normalized.includes("venda direta")) return "Venda Direta";
  if (normalized.includes("licitacao aberta") || normalized.includes("licita\xE7\xE3o aberta")) return "Licita\xE7\xE3o Aberta";
  if (normalized.includes("leilao sfi") || normalized.includes("leil\xE3o sfi")) return "Leil\xE3o SFI";
  return "Leil\xE3o Online";
}
function isConfiguredAuctionLink(link) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "").toLowerCase();
    return AUCTIONEER_PORTALS.some((portal) => host === portal.domain || host.endsWith(`.${portal.domain}`));
  } catch {
    return false;
  }
}
async function enrichLotDetails(browser, draft) {
  let detailPage = null;
  try {
    detailPage = await browser.newPage();
    await detailPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await detailPage.goto(draft.auctionLink, { waitUntil: "domcontentloaded", timeout: 2e4 });
    const detailText = await detailPage.evaluate(() => document.body?.innerText || "");
    const dates = extractAuctionDates(detailText);
    const sizeMatch = detailText.match(/(?:[aá]rea(?:\s+(?:privativa|total|constru[ií]da))?\s*:?\s*)?(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    const detailedSize = sizeMatch ? Math.round(Number(sizeMatch[1].replace(",", "."))) : 0;
    const detailedMinimumBid = extractMinimumBid(detailText);
    const enrichedDescription = detailText.replace(/\s+/g, " ").trim().slice(0, 1200);
    return {
      ...draft,
      address: extractAddress(detailText, draft.address),
      sizeSqm: draft.sizeSqm > 0 ? draft.sizeSqm : detailedSize,
      auctionPrice: detailedMinimumBid || draft.auctionPrice,
      estimatedValue: extractAppraisal(detailText) || draft.estimatedValue,
      auctionDate: dates.first || draft.auctionDate,
      firstAuctionDate: dates.first || draft.firstAuctionDate,
      secondAuctionDate: dates.second || draft.secondAuctionDate,
      saleMode: extractSaleMode(detailText || draft.description || ""),
      description: enrichedDescription || draft.description
    };
  } catch (err) {
    console.warn(`[Auctioneer Sync] N\xE3o foi poss\xEDvel abrir o lote ${draft.auctionLink}: ${err.message}`);
    return draft;
  } finally {
    if (detailPage) await detailPage.close().catch(() => void 0);
  }
}
async function scrapeMegaLeiloes(targetType, state = "RJ", city = "Rio de Janeiro") {
  const results = [];
  let browser = null;
  try {
    browser = await import_puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    const ufSlug = state.toLowerCase();
    const citySlug = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const url = `https://www.megaleiloes.com.br/imoveis/${ufSlug}/${citySlug}`;
    console.log(`[Mega Leil\xF5es Scraper] Acessando ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25e3 });
    await new Promise((r) => setTimeout(r, 4e3));
    const rawLots = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".card.open, .card"));
      return cards.map((c) => {
        const link = c.querySelector("a")?.href || "";
        const text = c.innerText || "";
        const img = c.querySelector("img")?.src || "";
        const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
        const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, "").replace(",", "."))) : 0;
        const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
        const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(",", "."))) : 0;
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        const title = lines.find((l) => l.includes("Apartamento") || l.includes("Casa") || l.includes("Terreno") || l.includes("Comercial") || l.includes("Unid")) || lines[0] || "Im\xF3vel Mega Leil\xF5es";
        return { title, text, price, size, link, img };
      });
    });
    for (const raw of rawLots) {
      if (!raw.link || raw.price <= 0) continue;
      const propType = parseType(raw.title + " " + raw.text);
      const detection = detectBankOrJudicial(raw.text);
      if (targetType === "extrajudicial" && detection.origin !== "extrajudicial") continue;
      if (targetType === "judicial" && detection.origin !== "judicial") continue;
      let neigh = "";
      const parts = raw.title.split("-").map((p) => p.trim());
      if (parts.length >= 3) {
        neigh = parts[parts.length - 3] || parts[parts.length - 2];
      }
      const draft = {
        portalId: "megaleiloes",
        auctioneerName: "Mega Leil\xF5es",
        title: raw.title,
        address: extractAddress(raw.text, raw.title),
        neighborhood: neigh || "Centro",
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
  } catch (err) {
    console.error("[Mega Leil\xF5es Scraper] Erro:", err.message);
  } finally {
    if (browser) await browser.close();
  }
  return results;
}
async function scrapeFrazao(targetType, state = "RJ", city = "Rio de Janeiro") {
  const results = [];
  let browser = null;
  try {
    browser = await import_puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    const url = `https://www.frazaoleiloes.com.br/sale/searchLot?estado=${state}&cidade=${encodeURIComponent(city)}&pesquisaSimples=false`;
    console.log(`[Fraz\xE3o Scraper] Acessando ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25e3 });
    await new Promise((r) => setTimeout(r, 4e3));
    const rawLots = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a")).filter((a) => a.href && a.href.includes("/lote/"));
      const unique = [];
      const seen = /* @__PURE__ */ new Set();
      for (const a of anchors) {
        if (!seen.has(a.href)) {
          seen.add(a.href);
          const card = a.closest(".card") || a.parentElement;
          const text = card ? card.innerText : a.innerText;
          const img = card ? card.querySelector("img")?.src : null;
          const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
          const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, "").replace(",", "."))) : 0;
          const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
          const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(",", "."))) : 0;
          const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
          const title = lines.find((l) => l.includes("Apartamento") || l.includes("Casa") || l.includes("Terreno") || l.includes("Comercial")) || lines[0] || "Im\xF3vel Fraz\xE3o";
          unique.push({ title, text, price, size, link: a.href, img });
        }
      }
      return unique;
    });
    for (const raw of rawLots) {
      if (!raw.link || raw.price <= 0) continue;
      const propType = parseType(raw.title + " " + raw.text);
      const detection = detectBankOrJudicial(raw.text);
      if (targetType === "extrajudicial" && detection.origin !== "extrajudicial") continue;
      if (targetType === "judicial" && detection.origin !== "judicial") continue;
      let neigh = "";
      const mNeigh = raw.title.match(/(?:em|no|na)\s+([A-Za-zÀ-ÿ\s]+),\s*(?:Rio de Janeiro|RJ)/i);
      if (mNeigh) {
        neigh = mNeigh[1].trim();
      }
      const draft = {
        portalId: "frazao",
        auctioneerName: "Fraz\xE3o Leil\xF5es",
        title: raw.title,
        address: extractAddress(raw.text, raw.title),
        neighborhood: neigh || "Centro",
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
  } catch (err) {
    console.error("[Fraz\xE3o Scraper] Erro:", err.message);
  } finally {
    if (browser) await browser.close();
  }
  return results;
}
async function scrapeBiasi(targetType, state = "RJ", city = "Rio de Janeiro") {
  const results = [];
  let browser = null;
  try {
    browser = await import_puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    const ufSlug = state.toLowerCase();
    const citySlug = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const url = `https://www.biasileiloes.com.br/imoveis/${ufSlug}/${citySlug}/todos-os-bairros/todos-os-segmentos?pagina=1`;
    console.log(`[Biasi Scraper] Acessando ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25e3 });
    await new Promise((r) => setTimeout(r, 4e3));
    const rawLots = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("a.leilao-lote"));
      return cards.map((a) => {
        const link = a.href || "";
        const text = a.innerText || "";
        const imgEl = a.querySelector(".card-img-cover");
        let img = "";
        if (imgEl && imgEl.style.backgroundImage) {
          const m = imgEl.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (m) img = m[1];
        }
        if (!img) img = a.querySelector("img")?.src || "";
        const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
        const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, "").replace(",", "."))) : 0;
        const descEl = a.querySelector(".text-descricao");
        const descText = descEl ? descEl.innerText : text;
        return { text: descText, price, link, img };
      });
    });
    for (const raw of rawLots) {
      if (!raw.link || raw.price <= 0) continue;
      const propType = parseType(raw.text);
      const detection = detectBankOrJudicial(raw.text);
      if (targetType === "extrajudicial" && detection.origin !== "extrajudicial") continue;
      if (targetType === "judicial" && detection.origin !== "judicial") continue;
      let neigh = "";
      const parts = raw.text.split("-").map((p) => p.trim());
      if (parts.length >= 2) {
        neigh = parts[1];
      }
      const draft = {
        portalId: "biasi",
        auctioneerName: "Biasi Leil\xF5es",
        title: raw.text.split("\n")[0] || "Im\xF3vel Biasi",
        address: extractAddress(raw.text, raw.text.split("\n")[0] || "Rio de Janeiro, RJ"),
        neighborhood: neigh || "Centro",
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
  } catch (err) {
    console.error("[Biasi Scraper] Erro:", err.message);
  } finally {
    if (browser) await browser.close();
  }
  return results;
}
async function scrapeConfiguredAuctioneers(targetType, state = "RJ", city = "Rio de Janeiro") {
  const configs = AUCTIONEER_PORTALS.filter((portal) => portal.enabled && portal.genericScrape);
  const results = [];
  let browser = null;
  try {
    browser = await import_puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    let cursor = 0;
    const worker = async () => {
      while (cursor < configs.length) {
        const config = configs[cursor++];
        let page = null;
        try {
          page = await browser.newPage();
          await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
          await page.setRequestInterception(true);
          page.on("request", (request) => {
            const type = request.resourceType();
            if (type === "media" || type === "font") request.abort();
            else request.continue();
          });
          const url = config.searchUrl || config.baseUrl;
          console.log(`[Auctioneer Generic] Acessando ${config.name}: ${url}`);
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 18e3 });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const rawLots = await page.evaluate(() => {
            const propertyWords = /\b(im[oó]vel|apartamento|apto|casa|terreno|lote|sala|loja|galp[aã]o|pr[eé]dio|cobertura)\b/i;
            const priceWords = /R\$\s*[\d.]+(?:,\d{2})?/i;
            const ignored = /(?:login|entrar|cadastro|contato|quem somos|pol[ií]tica|termos)/i;
            const seen = /* @__PURE__ */ new Set();
            const lots = [];
            for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
              const link = anchor.href || "";
              if (!link || seen.has(link) || ignored.test(link)) continue;
              const container = anchor.closest('article, [class*="card"], [class*="lote"], [class*="lot"], [class*="item"], li') || anchor;
              const text = (container.innerText || anchor.innerText || "").replace(/\s+/g, " ").trim();
              if (text.length < 35 || !propertyWords.test(text) || !priceWords.test(text)) continue;
              const bidMatches = [...text.matchAll(/lance\s+(?:inicial|m[ií]nimo)(?:\s+\d+[ªºo]?\s*(?:leil[aã]o|pra[cç]a))?\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/gi)];
              const fallbackPrice = text.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
              const sizeMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
              const bidValues = bidMatches.map((match) => Number(match[1].replace(/\./g, "").replace(",", "."))).filter((value) => Number.isFinite(value) && value > 0);
              const price = bidValues.length > 0 ? Math.round(Math.min(...bidValues)) : fallbackPrice ? Math.round(Number(fallbackPrice[1].replace(/\./g, "").replace(",", "."))) : 0;
              const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(",", "."))) : 0;
              if (price < 1e4) continue;
              const image = container.querySelector("img");
              seen.add(link);
              lots.push({ text, link, img: image?.src || "", price, size });
              if (lots.length >= 20) break;
            }
            return lots;
          });
          for (const raw of rawLots.slice(0, 8)) {
            const locationText = normalizeStr(raw.text);
            const cityNorm = normalizeStr(city);
            if (!locationText.includes(cityNorm)) continue;
            const detection = detectBankOrJudicial(raw.text);
            if (detection.origin !== targetType) continue;
            const lines = raw.text.split(/\s{2,}|\n/).map((line) => line.trim()).filter(Boolean);
            const title = lines.find((line) => /im[oó]vel|apartamento|casa|terreno|sala|loja|galp[aã]o|pr[eé]dio|cobertura/i.test(line)) || raw.text.slice(0, 140);
            const dates = extractAuctionDates(raw.text);
            const neighborhoodMatch = raw.text.match(/(?:bairro|em|no|na)\s+([A-Za-zÀ-ÿ\s]{3,35})(?:\s*[-,/]\s*(?:RJ|Rio de Janeiro)|\s+-)/i);
            const draft = {
              portalId: config.id,
              auctioneerName: config.name,
              title,
              address: extractAddress(raw.text, ""),
              neighborhood: neighborhoodMatch?.[1]?.trim() || "",
              city,
              state,
              propertyType: parseType(raw.text),
              sizeSqm: raw.size,
              auctionPrice: raw.price,
              auctionDate: dates.first || "",
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
            const declaredCity = extractDeclaredCity(`${enriched.description || ""}
${raw.text}`, state);
            const hasAuditableAddress = /\b(?:rua|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(enriched.address || "");
            if (!declaredCity || normalizeStr(declaredCity) !== cityNorm || !hasAuditableAddress || enriched.sizeSqm <= 0 || enriched.auctionPrice <= 0) continue;
            results.push({ ...enriched, city: declaredCity });
          }
        } catch (err) {
          console.warn(`[Auctioneer Generic] ${config.name} indispon\xEDvel: ${err.message}`);
        } finally {
          if (page) await page.close().catch(() => void 0);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, configs.length) }, () => worker()));
  } finally {
    if (browser) await browser.close().catch(() => void 0);
  }
  return results;
}
async function scrapeGroundedAuctioneers(targetType, state = "RJ", city = "Rio de Janeiro") {
  const results = [];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Auctioneer Miner] GEMINI_API_KEY n\xE3o configurada. Pulando varredura Grounded.");
    return results;
  }
  const ai = new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } }
  });
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const targetLabel = targetType === "extrajudicial" ? "LEIL\xD5ES DE BANCOS E EXTRAJUDICIAIS (Aliena\xE7\xE3o Fiduci\xE1ria)" : "LEIL\xD5ES JUDICIAIS (Varas C\xEDveis e Trabalhistas)";
  const domains = AUCTIONEER_PORTALS.map((p) => p.domain).join(", ");
  const prompt = `
Voc\xEA \xE9 um auditor e rob\xF4 de varredura pericial de leil\xF5es imobili\xE1rios no Brasil. Hoje \xE9 ${todayStr}.
Realize uma pesquisa ativa no Google (Google Search Grounding) focando estritamente nos portais de leiloeiros oficiais configurados:
${domains}.

Objetivo:
Encontre entre 4 e 8 ${targetLabel} de im\xF3veis ATIVOS (com data de leil\xE3o futura a ${todayStr}) localizados no estado do ${state} (especialmente em ${city} ou Regi\xE3o Metropolitana).

${targetType === "extrajudicial" ? "Foque em im\xF3veis retomados por bancos (Santander, Ita\xFA, Bradesco, Banco do Brasil, Inter, Pan, Safra, etc.) ou aliena\xE7\xE3o fiduci\xE1ria." : "Foque em im\xF3veis com processo judicial, penhora, fal\xEAncia ou execu\xE7\xE3o judicial das varas c\xEDveis/trabalhistas."}

Gere links REAIS que apontem diretamente para o lote do im\xF3vel dentro de um dos portais citados.

Retorne EXCLUSIVAMENTE um array JSON puro (sem explica\xE7\xF5es, sem markdown fora do bloco json):
[
  {
    "portalId": "identificador do portal configurado",
    "auctioneerName": "Nome do leiloeiro (ex: Portal Zuk, Mega Leil\xF5es, Sold Leil\xF5es, Pestana Leil\xF5es)",
    "title": "Apartamento / Casa no Bairro X",
    "address": "Endere\xE7o com rua e n\xFAmero se dispon\xEDvel",
    "neighborhood": "Nome do Bairro oficial",
    "city": "${city}",
    "state": "${state}",
    "propertyType": "Apartamento" | "Casa" | "Terreno" | "Comercial",
    "sizeSqm": n\xFAmero da metragem em m\xB2 (ex: 65),
    "auctionPrice": valor do lance m\xEDnimo em reais (n\xFAmero inteiro sem v\xEDrgulas),
    "estimatedValue": valor de avalia\xE7\xE3o do leil\xE3o em reais,
    "auctionDate": "AAAA-MM-DD",
    "firstAuctionDate": "AAAA-MM-DD da primeira pra\xE7a, se houver",
    "secondAuctionDate": "AAAA-MM-DD da segunda pra\xE7a, se houver",
    "saleMode": "Venda Direta" | "Licita\xE7\xE3o Aberta" | "Leil\xE3o Online" | "Aceita Propostas",
    "auctionLink": "URL direta do lote no site do leiloeiro",
    "imageUrl": "URL da foto se dispon\xEDvel",
    "description": "Detalhes do lote e comitente/banco",
    "sellerBank": "Nome do banco se houver (ex: Santander, Ita\xFA)"
  }
]
`;
  try {
    console.log(`[Auctioneer Grounded Miner] Iniciando busca no Google para leil\xF5es ${targetType} em ${city}-${state}...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const responseText = response.text || "";
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/) || [null, responseText];
    let jsonStr = (jsonMatch[1] || responseText).trim();
    jsonStr = jsonStr.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item.auctionLink || !isConfiguredAuctionLink(item.auctionLink) || !item.auctionPrice || item.auctionPrice <= 0) continue;
        results.push({
          portalId: item.portalId || "portal",
          auctioneerName: item.auctioneerName || "Leiloeiro Oficial",
          title: item.title || "Im\xF3vel em Leil\xE3o",
          address: item.address || "",
          neighborhood: item.neighborhood || "Centro",
          city: item.city || city,
          state: item.state || state,
          propertyType: parseType(item.propertyType || item.title),
          sizeSqm: Number(item.sizeSqm) || 0,
          auctionPrice: Math.round(Number(item.auctionPrice)),
          estimatedValue: item.estimatedValue ? Math.round(Number(item.estimatedValue)) : Math.round(Number(item.auctionPrice) * 1.5),
          auctionDate: item.auctionDate || item.firstAuctionDate || "",
          firstAuctionDate: item.firstAuctionDate || item.auctionDate || void 0,
          secondAuctionDate: item.secondAuctionDate || void 0,
          auctionLink: item.auctionLink,
          imageUrl: item.imageUrl,
          description: item.description || "",
          saleMode: item.saleMode || extractSaleMode(item.description || item.title || ""),
          origin: targetType,
          sellerBank: item.sellerBank
        });
      }
    }
  } catch (err) {
    console.error("[Auctioneer Grounded Miner] Erro:", err.message);
  }
  return results;
}
async function syncAuctioneersPipeline(targetType, state = "RJ", city = "Rio de Janeiro", existingAuctions, recalculateFn) {
  console.log(`
======================================================`);
  console.log(`[Auctioneer Master Sync] Sincronizando Leil\xF5es ${targetType.toUpperCase()} para ${city}-${state}...`);
  console.log(`Portais configurados: ${AUCTIONEER_PORTALS.map((p) => p.name).join(", ")}`);
  console.log(`======================================================
`);
  const [megaList, frazaoList, biasiList, configuredList, groundedList] = await Promise.all([
    scrapeMegaLeiloes(targetType, state, city).catch(() => []),
    scrapeFrazao(targetType, state, city).catch(() => []),
    scrapeBiasi(targetType, state, city).catch(() => []),
    scrapeConfiguredAuctioneers(targetType, state, city).catch(() => []),
    scrapeGroundedAuctioneers(targetType, state, city).catch(() => [])
  ]);
  const allDrafts = [...megaList, ...frazaoList, ...biasiList, ...configuredList, ...groundedList];
  console.log(`[Auctioneer Master Sync] Total bruto capturado nos portais: ${allDrafts.length}`);
  const existingLinks = new Set(existingAuctions.map((a) => a.auctionLink).filter(Boolean));
  const newAuctions = [];
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  for (const draft of allDrafts) {
    const auditableAddress = /\b(?:rua|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(draft.address || "") && /\d/.test(draft.address || "");
    const lastKnownDate = draft.secondAuctionDate || draft.firstAuctionDate || draft.auctionDate;
    if (!isConfiguredAuctionLink(draft.auctionLink) || !auditableAddress || draft.sizeSqm <= 0 || draft.auctionPrice <= 0 || !lastKnownDate || lastKnownDate < today) {
      continue;
    }
    if (existingLinks.has(draft.auctionLink)) {
      continue;
    }
    existingLinks.add(draft.auctionLink);
    const baseId = `auc-${draft.portalId}-${normalizeStr(draft.title).slice(0, 15)}-${Math.floor(Math.random() * 1e5)}`;
    const rawAuc = {
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
      saleMode: draft.saleMode,
      imageUrl: draft.imageUrl,
      description: draft.description || `${draft.title} - Leiloeiro: ${draft.auctioneerName}`,
      status: "Pendente",
      occupied: true,
      origin: targetType,
      allowsFinancing: targetType === "extrajudicial",
      downpaymentPercent: targetType === "extrajudicial" ? 20 : 25
    };
    const calculated = recalculateFn(rawAuc);
    newAuctions.push(calculated);
  }
  console.log(`[Auctioneer Master Sync] Novos leil\xF5es ${targetType} adicionados e auditados com sucesso: ${newAuctions.length}`);
  return {
    newAuctions,
    totalScraped: allDrafts.length
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AUCTIONEER_PORTALS,
  scrapeBiasi,
  scrapeConfiguredAuctioneers,
  scrapeFrazao,
  scrapeGroundedAuctioneers,
  scrapeMegaLeiloes,
  syncAuctioneersPipeline
});
