const puppeteer = require('puppeteer');

async function inspectDetail() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  const url = 'https://www.portalzuk.com.br/imovel/mg/juiz-de-fora/bonfim/rua-mucio-vieira-259/37500-234543';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  const data = await page.evaluate(() => {
    const dl = window.dataLayer || [];
    const h1 = document.querySelector('h1') ? document.querySelector('h1').innerText : '';
    const h2 = document.querySelector('h2') ? document.querySelector('h2').innerText : '';

    // Look for price elements
    const priceEls = Array.from(document.querySelectorAll('[class*="preco"], [class*="valor"], [class*="lance"], [class*="price"]'))
      .map(el => (el.innerText || '').trim())
      .filter(Boolean);

    // Look for edital or matrícula links
    const docLinks = Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: (a.innerText || '').trim() }))
      .filter(a => /edital|matricula|laudo|documento|pdf/i.test(a.text + ' ' + a.href));

    return {
      title: document.title,
      h1,
      h2,
      dataLayer: dl,
      samplePriceEls: priceEls.slice(0, 10),
      docLinks: docLinks.slice(0, 5)
    };
  });

  console.log('Detail page data:');
  console.log(JSON.stringify(data, null, 2));

  await browser.close();
}

inspectDetail();
