const puppeteer = require('puppeteer');

async function scrapeFrazao(state = 'RJ', city = 'Rio de Janeiro') {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  
  const url = `https://www.frazaoleiloes.com.br/sale/searchLot?estado=${state}&cidade=${encodeURIComponent(city)}&pesquisaSimples=false`;
  console.log('Scraping Frazao:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  const items = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('/lote/'));
    const unique = [];
    const seen = new Set();
    for (const a of anchors) {
      if (!seen.has(a.href)) {
        seen.add(a.href);
        const card = a.closest('.card') || a.parentElement;
        const text = card ? card.innerText : a.innerText;
        const img = card ? card.querySelector('img')?.src : null;

        const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
        const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.'))) : 0;

        const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
        const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 0;

        let propType = 'Apartamento';
        const lower = text.toLowerCase();
        if (lower.includes('apartamento')) propType = 'Apartamento';
        else if (lower.includes('casa')) propType = 'Casa';
        else if (lower.includes('comercial') || lower.includes('sala') || lower.includes('galp')) propType = 'Comercial';
        else if (lower.includes('terreno')) propType = 'Terreno';

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines.find(l => l.includes('Apartamento') || l.includes('Casa') || l.includes('Terreno') || l.includes('Comercial')) || lines[0] || 'Imóvel Frazão';

        const isJudicial = lower.includes('judicial') || lower.includes('vara') || lower.includes('falência');
        const origin = isJudicial ? 'judicial' : 'extrajudicial';

        unique.push({
          title,
          price,
          size,
          propType,
          origin,
          link: a.href,
          img
        });
      }
    }
    return unique.filter(i => i.price > 0 && i.link);
  });

  console.log(`Frazao found ${items.length} valid lots. First 3:`);
  console.log(items.slice(0, 3));
  await browser.close();
}

scrapeFrazao();
