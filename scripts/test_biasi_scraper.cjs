const puppeteer = require('puppeteer');

async function scrapeBiasi(state = 'RJ', city = 'Rio de Janeiro') {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  const ufSlug = state.toLowerCase();
  const citySlug = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  const url = `https://www.biasileiloes.com.br/imoveis/${ufSlug}/${citySlug}/todos-os-bairros/todos-os-segmentos?pagina=1`;
  console.log('Scraping Biasi:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  const items = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('a.leilao-lote'));
    return cards.map(a => {
      const link = a.href || '';
      const text = a.innerText || '';
      
      const imgEl = a.querySelector('.card-img-cover');
      let img = '';
      if (imgEl && imgEl.style.backgroundImage) {
        const m = imgEl.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (m) img = m[1];
      }
      if (!img) {
        img = a.querySelector('img')?.src || '';
      }

      const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
      const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.'))) : 0;

      const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
      const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 60;

      let propType = 'Apartamento';
      const lower = text.toLowerCase();
      if (lower.includes('apartamento')) propType = 'Apartamento';
      else if (lower.includes('casa')) propType = 'Casa';
      else if (lower.includes('comercial') || lower.includes('sala') || lower.includes('galp')) propType = 'Comercial';
      else if (lower.includes('terreno')) propType = 'Terreno';

      const isJudicial = lower.includes('judicial') || lower.includes('vara') || lower.includes('falência');
      const origin = isJudicial ? 'judicial' : 'extrajudicial';

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const title = lines[0] || 'Imóvel Biasi';

      return {
        title,
        price,
        size,
        propType,
        origin,
        link,
        img
      };
    }).filter(i => i.price > 0 && i.link);
  });

  console.log(`Biasi found ${items.length} valid lots. First 3:`);
  console.log(items.slice(0, 3));
  await browser.close();
}

scrapeBiasi();
