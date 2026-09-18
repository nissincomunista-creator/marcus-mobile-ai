const puppeteer = require('puppeteer');

async function inspectCards() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  // Mega Leilões
  try {
    console.log('--- Mega Leilões ---');
    await page.goto('https://www.megaleiloes.com.br/imoveis/rj/rio-de-janeiro', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));
    const megaCards = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.card, [class*="card"], [class*="card-lote"], .item, [data-id]'));
      return items.slice(0, 3).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText ? el.innerText.slice(0, 200).replace(/\s+/g, ' ') : '',
        href: el.querySelector('a')?.href || el.getAttribute('href'),
        img: el.querySelector('img')?.src
      }));
    });
    console.log('Mega Leilões cards found:', megaCards);
  } catch (e) {
    console.error('Mega error:', e.message);
  }

  // Biasi
  try {
    console.log('\n--- Biasi Leilões ---');
    await page.goto('https://www.biasileiloes.com.br/imoveis/rj/rio-de-janeiro/todos-os-bairros/todos-os-segmentos?pagina=1', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));
    const biasiCards = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[class*="card"], [class*="lote"], [class*="item"], .col-'));
      return items.slice(0, 3).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText ? el.innerText.slice(0, 200).replace(/\s+/g, ' ') : '',
        href: el.querySelector('a')?.href,
        img: el.querySelector('img')?.src
      }));
    });
    console.log('Biasi cards found:', biasiCards);
  } catch (e) {
    console.error('Biasi error:', e.message);
  }

  await browser.close();
}

inspectCards();
