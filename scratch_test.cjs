const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  console.log('Navigating to https://www.leilaoimovel.com.br/...');
  await page.goto('https://www.leilaoimovel.com.br/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3000));

  const formInfo = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      method: f.method,
      inputs: Array.from(f.querySelectorAll('input, select')).map(i => ({ name: i.name, id: i.id, placeholder: i.placeholder, value: i.value }))
    }));
    // Also look for links mentioning MG or Minas Gerais
    const mgLinks = Array.from(document.querySelectorAll('a[href*="mg"], a[href*="minas"]')).map(a => a.href);
    return { forms, mgLinks: mgLinks.slice(0, 10) };
  });

  console.log('Forms:', JSON.stringify(formInfo.forms, null, 2));
  console.log('MG Links:', formInfo.mgLinks);

  await browser.close();
}

run();
