const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  // Zuk
  console.log('Testing Zuk search...');
  await page.goto('https://www.portalzuk.com.br/leilao-de-imoveis/todos-imoveis', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));
  const zukInfo = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('/imovel/'));
    return {
      title: document.title,
      lotsFound: anchors.length,
      sample: anchors.slice(0, 3).map(a => ({ href: a.href, text: a.innerText.slice(0, 150).replace(/\s+/g, ' ') }))
    };
  });
  console.log('Zuk:', zukInfo);

  // Sold
  console.log('\nTesting Sold...');
  await page.goto('https://www.sold.com.br/lotes/imoveis', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));
  const soldInfo = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a')).filter(a => a.href && (a.href.includes('/lote/') || a.href.includes('/imovel/')));
    return {
      title: document.title,
      lotsFound: anchors.length,
      sample: anchors.slice(0, 3).map(a => ({ href: a.href, text: a.innerText.slice(0, 150).replace(/\s+/g, ' ') }))
    };
  });
  console.log('Sold:', soldInfo);

  await browser.close();
}

test();
