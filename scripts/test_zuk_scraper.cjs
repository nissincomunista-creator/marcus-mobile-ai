const puppeteer = require('puppeteer');

function parseType(text) {
  const t = (text || '').toLowerCase();
  if (/apartamento|apto|flat|studio|conjugado|cobertura/i.test(t)) return 'Apartamento';
  if (/casa|sobrado|vil[la]|residencia/i.test(t)) return 'Casa';
  if (/sala|loja|comercial|galp[aã]o|predio|escritorio|consultorio/i.test(t)) return 'Comercial';
  if (/terreno|lote|gleba|fracao/i.test(t)) return 'Terreno';
  return 'Apartamento';
}

function parsePrice(text) {
  if (!text) return 0;
  // Match R$ XX.XXX,XX
  const matches = [...text.matchAll(/R\$\s*([\d\.,]+)/gi)];
  if (!matches.length) return 0;
  // If multiple (e.g. 1º leilao, 2º leilao), usually 2º leilao or the lower price is the active/best bid
  const numbers = matches.map(m => {
    const clean = m[1].replace(/\./g, '').replace(',', '.');
    return parseFloat(clean);
  }).filter(n => !isNaN(n) && n > 1000);
  if (!numbers.length) return 0;
  // If 2nd auction exists, return 2nd auction price, else first
  return numbers[numbers.length - 1];
}

function parseSize(text) {
  if (!text) return 0;
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
  if (m) {
    const num = parseFloat(m[1].replace(',', '.'));
    if (!isNaN(num) && num > 5 && num < 100000) return Math.round(num);
  }
  return 0;
}

function parseDate(text) {
  if (!text) return new Date().toISOString().slice(0, 10);
  const m = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return new Date().toISOString().slice(0, 10);
}

async function scrapeZukCity(browser, state, city) {
  console.log(`\n--- Scraping Portal Zuk: ${city}/${state} ---`);
  const ufSlug = state.toLowerCase();
  const citySlug = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  const url = `https://www.portalzuk.com.br/leilao-de-imoveis/c/todos-imoveis/${ufSlug}/regiao/${citySlug}`;

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  const results = [];
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    if (resp && resp.status() >= 400) {
      console.warn(`[Portal Zuk Scraper] HTTP ${resp.status()} para ${url}`);
      return results;
    }
    await new Promise(r => setTimeout(r, 4000));

    // Get links to lots
    const lotLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/imovel/"]'));
      return Array.from(new Set(anchors.map(a => a.href))).filter(h => !h.includes('/leilao-de-imoveis/'));
    });

    console.log(`[Portal Zuk Scraper] ${city}/${state}: encontrados ${lotLinks.length} lotes.`);

    // Visit up to 5 lots to test extraction
    for (const link of lotLinks.slice(0, 5)) {
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 2000));

        const lotData = await page.evaluate(() => {
          const dl = window.dataLayer || [];
          const prodInfo = dl.find(d => d.pageType === 'Product' || d.productId) || {};
          const title = document.querySelector('h1')?.innerText || document.title || '';
          const bodyText = document.body.innerText || '';
          const img = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                      document.querySelector('.slide-imovel img, .galeria img, img[src*="imagens.portalzuk"]')?.getAttribute('src') || '';

          // Find edital link
          const editalAnchor = Array.from(document.querySelectorAll('a')).find(a => /edital/i.test(a.innerText || a.href));
          const editalUrl = editalAnchor ? editalAnchor.href : '';

          return {
            title,
            bodyText: bodyText.slice(0, 3000),
            prodInfo,
            img,
            editalUrl
          };
        });

        const prod = lotData.prodInfo;
        const bText = lotData.bodyText;
        const propType = parseType(prod.tipoImovel || lotData.title || bText);
        const price = prod.price ? parseFloat(prod.price) : parsePrice(bText);
        const size = parseSize(bText);
        const date = parseDate(bText);
        const neighborhood = prod.bairro || '';
        const bank = prod.comitente ? prod.comitente.trim() : 'Banco';

        // Extract address from bodyText or title
        let address = '';
        const addrMatch = bText.match(/(?:Rua|Avenida|Av\.|Travessa|Estrada|Al\.|Alameda)[^,\n]+,\s*\d+[^,\n]*/i);
        if (addrMatch) {
          address = addrMatch[0].trim();
        } else {
          address = `${neighborhood}, ${city} - ${state}`;
        }

        const draft = {
          portalId: 'portalzuk',
          auctioneerName: 'Portal Zuk',
          title: `${propType} em Leilão - ${neighborhood || city}`,
          address,
          neighborhood,
          city: prod.cidade || city,
          state: prod.uf || state,
          propertyType: propType,
          sizeSqm: size,
          auctionPrice: price,
          auctionDate: date,
          auctionLink: link,
          imageUrl: lotData.img,
          description: bText.slice(0, 350).replace(/\s+/g, ' '),
          saleMode: 'Leilão Extrajudicial Online',
          origin: 'extrajudicial',
          sellerBank: bank,
          editalUrl: lotData.editalUrl
        };

        results.push(draft);
        console.log(` -> Extraído: [${draft.city}/${draft.state} - ${draft.neighborhood}] ${draft.title} | R$ ${draft.auctionPrice.toLocaleString('pt-BR')} | Banco: ${draft.sellerBank} | Link: ${draft.auctionLink}`);
      } catch (err) {
        console.error(`Erro ao extrair lote ${link}:`, err.message);
      }
    }
  } catch (e) {
    console.error(`Erro na cidade ${city}:`, e.message);
  } finally {
    await page.close();
  }
  return results;
}

async function test() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  await scrapeZukCity(browser, 'MG', 'Juiz de Fora');
  await scrapeZukCity(browser, 'RJ', 'Niterói');
  await scrapeZukCity(browser, 'RJ', 'Rio de Janeiro');

  await browser.close();
}

test();
