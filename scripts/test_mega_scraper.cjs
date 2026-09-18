const puppeteer = require('puppeteer');

async function scrapeMega(state = 'RJ', city = 'Rio de Janeiro') {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  const ufSlug = state.toLowerCase();
  const citySlug = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  const url = `https://www.megaleiloes.com.br/imoveis/${ufSlug}/${citySlug}`;
  console.log('Scraping Mega:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  const items = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.card.open, .card'));
    return cards.map(c => {
      const link = c.querySelector('a')?.href || '';
      const text = c.innerText || '';
      const img = c.querySelector('img')?.src || '';

      // Extract price
      const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
      const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.'))) : 0;

      // Extract size
      const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
      const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 0;

      // Extract type
      let propType = 'Apartamento';
      const lower = text.toLowerCase();
      if (lower.includes('casa')) propType = 'Casa';
      else if (lower.includes('terreno') || lower.includes('lote')) propType = 'Terreno';
      else if (lower.includes('comercial') || lower.includes('sala') || lower.includes('galp')) propType = 'Comercial';

      // Bank or Judicial
      const isBank = lower.includes('santander') || lower.includes('itau') || lower.includes('itaú') || lower.includes('bradesco') || lower.includes('pan') || lower.includes('safra') || lower.includes('banco') || lower.includes('extrajudicial');
      const origin = isBank ? 'extrajudicial' : (lower.includes('judicial') || lower.includes('vara') ? 'judicial' : 'extrajudicial');

      // Title & Address
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const title = lines.find(l => l.includes('Apartamento') || l.includes('Casa') || l.includes('Terreno') || l.includes('Comercial') || l.includes('Lote')) || lines[0] || 'Imóvel em Leilão';

      return {
        title,
        price,
        size,
        propType,
        origin,
        link,
        img,
        preview: text.slice(0, 120).replace(/\s+/g, ' ')
      };
    }).filter(i => i.price > 0 && i.link);
  });

  console.log(`Mega found ${items.length} valid lots. First 3:`);
  console.log(items.slice(0, 3));
  await browser.close();
}

scrapeMega();
