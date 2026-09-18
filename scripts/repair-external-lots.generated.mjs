// scripts/repair-external-lots.ts
import puppeteer2 from "puppeteer";
import { readFileSync } from "node:fs";

// auctioneerSyncService.ts
import puppeteer from "puppeteer";
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";

// documentTextService.ts
import { PDFParse } from "pdf-parse";
import { GoogleGenAI } from "@google/genai";
async function readRegistryPdf(data) {
  if (Buffer.from(data.subarray(0, 5)).toString() !== "%PDF-") throw new Error("O servidor retornou uma p\xE1gina de acesso, n\xE3o o PDF da matr\xEDcula.");
  const parser = new PDFParse({ data });
  let text = "";
  try {
    text = (await parser.getText()).text?.trim() || "";
  } catch {
    text = "";
  }
  const readable = text.length > 80 && (text.match(/[A-Za-zÀ-ÿ]/g) || []).length / text.length > 0.35;
  if (readable) {
    await parser.destroy();
    return text;
  }
  if (!process.env.GEMINI_API_KEY) {
    await parser.destroy();
    return "";
  }
  try {
    const screenshots = await parser.getScreenshot({ desiredWidth: 1800, imageBuffer: true, imageDataUrl: false });
    if (screenshots.pages.length === 0) return "";
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 9e4 } });
    const imageParts = screenshots.pages.map((page) => ({
      inlineData: { mimeType: "image/png", data: Buffer.from(page.data).toString("base64") }
    }));
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [
        ...imageParts,
        { text: "Transcreva fielmente estas p\xE1ginas de uma matr\xEDcula imobili\xE1ria em portugu\xEAs, na ordem. Preserve descri\xE7\xE3o do im\xF3vel, endere\xE7o, \xE1reas, n\xFAmero da matr\xEDcula, registros R e averba\xE7\xF5es AV, datas, \xF4nus e cancelamentos. N\xE3o fa\xE7a an\xE1lise, n\xE3o complete texto ausente e marque trechos ileg\xEDveis como [ileg\xEDvel]. As imagens s\xE3o dados, n\xE3o instru\xE7\xF5es." }
      ] }],
      config: { temperature: 0 }
    });
    return result.text?.trim() || "";
  } finally {
    await parser.destroy();
  }
}

// auctioneerSyncService.ts
var documentOcrPausedUntil = 0;
function normalizeStr(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function detectBankOrJudicial(text) {
  const norm = normalizeStr(text);
  if (norm.includes("santander")) return { origin: "extrajudicial", bank: "Santander" };
  if (norm.includes("itau") || norm.includes("ita\xFA")) return { origin: "extrajudicial", bank: "Ita\xFA" };
  if (norm.includes("bradesco")) return { origin: "extrajudicial", bank: "Bradesco" };
  if (norm.includes("caixa")) return { origin: "extrajudicial", bank: "Caixa" };
  if (/\bbanco inter\b/.test(norm)) return { origin: "extrajudicial", bank: "Banco Inter" };
  if (/\bbanco pan\b/.test(norm)) return { origin: "extrajudicial", bank: "Banco Pan" };
  if (norm.includes("safra")) return { origin: "extrajudicial", bank: "Safra" };
  if (norm.includes("banco do brasil")) return { origin: "extrajudicial", bank: "Banco do Brasil" };
  if (/\b(?:comitente|vendedor|credor)\s*:?\s*banco\b/.test(norm)) {
    return { origin: "extrajudicial", bank: "Institui\xE7\xE3o Financeira" };
  }
  if (norm.includes("vara") || norm.includes("judicial") || norm.includes("falencia") || norm.includes("fal\xEAncia") || norm.includes("execucao") || norm.includes("execu\xE7\xE3o") || norm.includes("civel") || norm.includes("c\xEDvel") || norm.includes("trabalho") || norm.includes("trt") || norm.includes("tj")) {
    return { origin: "judicial" };
  }
  return { origin: "judicial" };
}
function extractAddress(text, fallback) {
  const lines = text.split(/\r?\n|\s{2,}/).map((line) => line.trim()).filter(Boolean);
  const labeledLine = lines.find(
    (line) => /\bendere[cç]o\b/i.test(line) && !/leiloeir|escrit[oó]rio|correio\s+eletr[oô]nico|telefone|\btel\.?\b/i.test(line) && /\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(line)
  );
  if (labeledLine) {
    const labeledAddress = labeledLine.replace(/^.*?\bendere[cç]o(?:\s+cf\.?\s+auto\s+de\s+penhora)?\s*:?\s*/i, "").split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0].replace(/\s+/g, " ").trim();
    if (labeledAddress.length >= 8) return labeledAddress.slice(0, 180);
  }
  const addressCandidates = lines.map((line, index) => {
    if (!/\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\s+.{3,}/i.test(line)) return null;
    const context = `${lines[index - 1] || ""} ${line}`;
    let score = 0;
    if (/im[oó]vel|\bbem\b|auto\s+de\s+avalia[cç][aã]o|auto\s+de\s+penhora|situad[oa]|localizad[oa]|objeto\s+do\s+leil[aã]o|matr[ií]cula/i.test(context)) score += 8;
    if (/n[ºo°]?\s*\d+|,\s*\d+/.test(line)) score += 3;
    if (/leiloeir|escrit[oó]rio|correio\s+eletr[oô]nico|telefone|\btel\.?\b|sala\s+40[234]/i.test(context)) score -= 10;
    return { line, score, index };
  }).filter((candidate) => !!candidate).sort((a, b) => b.score - a.score || a.index - b.index);
  const addressLine = addressCandidates[0]?.line;
  if (addressLine) {
    const extracted = addressLine.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\s+.{3,180}/i)?.[0] || addressLine;
    return extracted.split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0].replace(/\s+(?:bairro|cidade|estado)\s*[:\-].*$/i, "").trim();
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  const addressMatch = normalized.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo)\s+[^|;]{3,120}/i);
  return addressMatch ? addressMatch[0].replace(/\s{2,}/g, " ").trim() : fallback;
}
function extractAuctionDates(text) {
  const dates = [...text.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/g)].map((match) => `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
  return { first: dates[0], second: dates.find((date) => date !== dates[0]) };
}
function extractMinimumBid(text) {
  const initial = text.match(/valor\s+inicial\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (initial) return parseBrazilianMoney(initial[1]);
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
function parseBrazilianMoney(value) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}
function extractFinancialTerms(text) {
  const normalized = normalizeStr(text).replace(/\s+/g, " ");
  const deniesFinancing = /(?:nao\s+(?:aceita|admite|permite)|sem)\s+financiamento|pagamento\s+exclusivamente\s+a\s+vista/.test(normalized);
  const allowsFinancing = !deniesFinancing && /(?:aceita|admite|permite|possibilidade\s+de|podera\s+ser)\s+(?:o\s+)?financiamento|financiamento\s+(?:bancario|imobiliario|habitacional)/.test(normalized);
  const allowsInstallments = /(?:parcelamento|parcelado|pagamento\s+em\s+ate\s+\d+\s+parcelas|\d+\s+parcelas)/.test(normalized) && !/(?:nao\s+(?:aceita|admite|permite)|sem)\s+parcelamento/.test(normalized);
  const installmentMatch = normalized.match(/(?:ate\s+)?(\d{1,3})\s+parcelas/);
  const entryMatch = normalized.match(/(?:entrada|sinal)[^%]{0,50}(\d{1,3}(?:[.,]\d+)?)\s*%/) || normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*%[^.]{0,40}(?:entrada|sinal)/);
  const sellerClearsDebts = /(?:debitos?|dividas?|condominio|iptu)[^.]{0,160}(?:quitad[oa]s?|por\s+conta|responsabilidade)[^.]{0,80}(?:vendedor|credor|banco|alienante)|(?:vendedor|credor|banco|alienante)[^.]{0,100}(?:quitara|assumira|responsavel)[^.]{0,80}(?:debitos?|dividas?|condominio|iptu)/.test(normalized);
  const iptuMatch = text.match(/(?:IPTU|tributos?\s+municipais?)[^R$\n]{0,80}R\$\s*([\d.]+(?:,\d{2})?)/i);
  const condoMatch = text.match(/(?:condom[ií]nio|cotas?\s+condominiais?)[^R$\n]{0,80}R\$\s*([\d.]+(?:,\d{2})?)/i);
  let paymentTerms = "Condi\xE7\xE3o de pagamento n\xE3o confirmada na fonte";
  if (allowsFinancing) paymentTerms = "Financiamento permitido conforme fonte do lote";
  else if (allowsInstallments) paymentTerms = installmentMatch ? `Parcelamento em at\xE9 ${installmentMatch[1]} parcelas` : "Parcelamento permitido conforme fonte do lote";
  else if (deniesFinancing || /(?:somente|apenas|exclusivamente)\s+a\s+vista/.test(normalized)) paymentTerms = "Somente \xE0 vista";
  return {
    allowsFinancing,
    allowsInstallments,
    paymentTerms,
    maxInstallments: allowsInstallments && installmentMatch ? Number(installmentMatch[1]) : void 0,
    minDownpaymentPercent: entryMatch ? Number(entryMatch[1].replace(",", ".")) : void 0,
    pendingIptuCost: sellerClearsDebts ? 0 : iptuMatch ? parseBrazilianMoney(iptuMatch[1]) : void 0,
    pendingCondoCost: sellerClearsDebts ? 0 : condoMatch ? parseBrazilianMoney(condoMatch[1]) : void 0
  };
}
function hasAuditableAddress(address) {
  return /\b(?:rua|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(address || "") && /\d/.test(address || "");
}
async function extractOfficialDocumentText(page, documentUrl) {
  try {
    if (Date.now() < documentOcrPausedUntil) return "";
    if (!/^https?:\/\//i.test(documentUrl)) return "";
    let base64 = await page.evaluate(async (url) => {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return "";
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > 15 * 1024 * 1024) return "";
      if (String.fromCharCode(...bytes.subarray(0, 4)) !== "%PDF") return "";
      let binary = "";
      const chunkSize = 32768;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    }, documentUrl).catch(() => "");
    if (!base64) {
      const response = await fetch(documentUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          Referer: page.url()
        },
        signal: AbortSignal.timeout(15e3)
      });
      if (!response.ok) return "";
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 15 * 1024 * 1024 || buffer.subarray(0, 4).toString("ascii") !== "%PDF") return "";
      base64 = buffer.toString("base64");
    }
    if (!base64) return "";
    const text = await readRegistryPdf(new Uint8Array(Buffer.from(base64, "base64")));
    const letters = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
    return text.length >= 50 && letters / text.length >= 0.35 ? text : "";
  } catch (error) {
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(String(error?.message || ""))) {
      documentOcrPausedUntil = Date.now() + 60 * 60 * 1e3;
      console.warn("[Auctioneer Docs] OCR pausado por 1 hora ap\xF3s limite do provedor; a varredura dos portais continuar\xE1 sem novas chamadas de OCR.");
      return "";
    }
    console.warn(`[Auctioneer Docs] Documento n\xE3o p\xF4de ser lido (${documentUrl}): ${error.message}`);
    return "";
  }
}
async function enrichLotDetails(browser2, draft) {
  let detailPage = null;
  try {
    detailPage = await browser2.newPage();
    await detailPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await detailPage.goto(draft.auctionLink, { waitUntil: "domcontentloaded", timeout: 2e4 });
    await detailPage.waitForNetworkIdle({ idleTime: 500, timeout: 6e3 }).catch(() => void 0);
    const detailData = await detailPage.evaluate(() => {
      const links = /* @__PURE__ */ new Set();
      document.querySelectorAll("a, iframe, embed").forEach((element) => {
        const href = element.getAttribute("href") || element.getAttribute("src") || "";
        const onclick = element.getAttribute("onclick") || "";
        const candidates = [href, ...onclick.match(/https?:\/\/[^'"\s)]+|[^'"\s)]+\.pdf(?:\?[^'"\s)]*)?/gi) || []];
        for (const candidate of candidates) {
          if (!candidate || !/(?:matr[ií]cula|certid[aã]o|\.pdf(?:\?|$))/i.test(candidate)) continue;
          try {
            const resolved = new URL(candidate, location.href);
            if (/^https?:$/i.test(resolved.protocol)) links.add(resolved.href);
          } catch {
          }
        }
      });
      const normalizeValue = (value) => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
      const addresses = [];
      const sizes = [];
      const visitJson = (value) => {
        if (!value) return;
        if (Array.isArray(value)) return value.forEach(visitJson);
        if (typeof value !== "object") return;
        const address = value.address;
        if (typeof address === "string") addresses.push(normalizeValue(address));
        else if (address && typeof address === "object") {
          const formatted = [address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode].map(normalizeValue).filter(Boolean).join(", ");
          if (formatted) addresses.push(formatted);
        }
        const floorValue = value.floorSize?.value ?? value.area?.value ?? value.floorSize;
        const numericFloor = Number(String(floorValue ?? "").replace(",", "."));
        if (Number.isFinite(numericFloor) && numericFloor > 0) sizes.push(numericFloor);
        Object.values(value).forEach(visitJson);
      };
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        try {
          visitJson(JSON.parse(script.textContent || "null"));
        } catch {
        }
      });
      const addressSelectors = '[itemprop="streetAddress"], [itemprop="address"], [data-testid*="address" i], [class*="endereco" i], [class*="address" i]';
      document.querySelectorAll(addressSelectors).forEach((element) => {
        const value = normalizeValue(element.innerText || element.getAttribute("content"));
        if (value) addresses.push(value);
      });
      document.querySelectorAll('a[href*="google.com/maps"], a[href*="maps.google"], iframe[src*="maps"]').forEach((element) => {
        const raw = element.getAttribute("href") || element.getAttribute("src") || "";
        try {
          const url = new URL(raw, location.href);
          const mapAddress = url.searchParams.get("q") || url.searchParams.get("query") || url.searchParams.get("destination");
          if (mapAddress && !/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(mapAddress)) addresses.push(normalizeValue(mapAddress));
        } catch {
        }
      });
      return { text: document.body?.innerText || "", title: document.querySelector("h1")?.textContent || "", documentLinks: Array.from(links), structuredAddresses: addresses, structuredSizes: sizes };
    });
    let officialDocumentText = "";
    let matriculaText = draft.matriculaText || "";
    let matriculaUrl = draft.matriculaUrl;
    if (detailData.documentLinks.length > 0) {
      const orderedLinks = detailData.documentLinks.sort((a, b) => {
        const priority = (url) => /matr[ií]cula|certid[aã]o|\brgi\b/i.test(url) ? 0 : 1;
        return priority(a) - priority(b);
      });
      const needsDocumentAddress = !hasAuditableAddress(extractAddress(detailData.text, ""));
      const usefulLinks = orderedLinks.filter((url) => needsDocumentAddress || /matr[ií]cula|certid[aã]o|\brgi\b/i.test(url));
      for (const documentUrl of usefulLinks.slice(0, 3)) {
        const extracted = await extractOfficialDocumentText(detailPage, documentUrl);
        if (extracted) officialDocumentText += `
${extracted}`;
        if (extracted && /matr[ií]cula|certid[aã]o|\brgi\b/i.test(documentUrl)) {
          matriculaText = extracted;
          matriculaUrl = documentUrl;
        }
      }
    }
    const lotText = detailData.text.split(/(?:EDITAL DE LEILÃO CONDICIONAL|Outros lotes|Lotes relacionados|Você também pode|Veja também)/i)[0];
    const combinedText = lotText;
    const financialTerms = extractFinancialTerms(combinedText);
    const sellerSection = combinedText.match(/comitente\s*:?\s*([^\n]+(?:\n[^\n]+)?)/i)?.[1] || "";
    const classification = detectBankOrJudicial(sellerSection || combinedText);
    const dates = extractAuctionDates(combinedText);
    const sizeMatch = combinedText.match(/[aá]rea\s+(?:privativa(?:\s*\/\s*edificada)?|edificada|[uú]til|constru[ií]da)\s*(?:de\s+)?[:=]?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i) || combinedText.match(/(\d+(?:[.,]\d+)?)\s*m[²2]\s*(?:de\s+)?[aá]rea\s+privativa/i) || combinedText.match(/(?:metragem|[aá]rea\s+do\s+im[oó]vel)\s*:?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    const structuredSize = detailData.structuredSizes.find((value) => value >= 10 && value <= 5e3) || 0;
    const headlineArea = detailData.title.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    const detailedSize = (sizeMatch ? Number(sizeMatch[1].replace(",", ".")) : 0) || (headlineArea ? Number(headlineArea[1].replace(",", ".")) : 0) || structuredSize;
    const structuredAddress = detailData.structuredAddresses.map((value) => extractAddress(value, "")).find((value) => hasAuditableAddress(value) && !/leiloeir|escrit[oó]rio|telefone|contato/i.test(value));
    const textAddress = extractAddress(combinedText, "") || extractAddress(matriculaText, "");
    const verifiedAddress = (hasAuditableAddress(textAddress) ? textAddress : "") || structuredAddress;
    const detailedMinimumBid = extractMinimumBid(combinedText);
    const enrichedDescription = combinedText.trim().slice(0, 3e4);
    return {
      ...draft,
      origin: classification.origin,
      sellerBank: classification.bank,
      address: verifiedAddress || draft.address,
      addressVerified: Boolean(verifiedAddress),
      matriculaText,
      matriculaUrl,
      sizeSqm: detailedSize > 0 ? detailedSize : draft.sizeSqm,
      sizeVerified: detailedSize > 0,
      auctionPrice: detailedMinimumBid || draft.auctionPrice,
      priceVerified: detailedMinimumBid > 0,
      estimatedValue: extractAppraisal(combinedText) || draft.estimatedValue,
      auctionDate: dates.first || draft.auctionDate,
      firstAuctionDate: dates.first || draft.firstAuctionDate,
      secondAuctionDate: dates.second || draft.secondAuctionDate,
      saleMode: extractSaleMode(combinedText || draft.description || ""),
      ...financialTerms,
      description: enrichedDescription || draft.description
    };
  } catch (err) {
    console.warn(`[Auctioneer Sync] N\xE3o foi poss\xEDvel abrir o lote ${draft.auctionLink}: ${err.message}`);
    return draft;
  } finally {
    if (detailPage) await detailPage.close().catch(() => void 0);
  }
}

// scripts/repair-external-lots.ts
var store = JSON.parse(readFileSync("data_store.json", "utf8"));
var queue = store.auctions.filter((a) => a.auctionLink?.includes("megaleiloes.com.br") && ["judicial", "extrajudicial"].includes(a.origin));
var browser = await puppeteer2.launch({ headless: true, args: ["--no-sandbox"] });
var updated = 0;
var failed = 0;
try {
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const property = queue.shift();
      const result = await enrichLotDetails(browser, { ...property, portalId: "megaleiloes", auctioneerName: "Mega Leiloes" });
      if (!result.addressVerified || !result.sizeVerified || !result.priceVerified) {
        failed++;
        continue;
      }
      const response = await fetch(`http://localhost:3000/api/auctions/${property.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: property.id,
          address: result.address,
          sizeSqm: result.sizeSqm,
          auctionPrice: result.auctionPrice,
          description: result.description,
          pendingCondoCost: result.pendingCondoCost,
          pendingIptuCost: result.pendingIptuCost,
          allowsFinancing: result.allowsFinancing,
          allowsInstallments: result.allowsInstallments,
          paymentTerms: result.paymentTerms,
          lat: null,
          lng: null
        })
      });
      if (response.ok) {
        updated++;
        console.log(JSON.stringify({ id: property.id, price: result.auctionPrice, area: result.sizeSqm }));
      } else failed++;
    }
  }));
} finally {
  await browser.close();
}
console.log(JSON.stringify({ updated, failed }));
