import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { launchPuppeteer } from '../src/utils/puppeteerConfig.ts';

const browser = await launchPuppeteer(puppeteer, { headless: true });
const page = await browser.newPage();
const errors: string[] = [];
page.on('pageerror', error => {
  const pageError = error as Error;
  errors.push(pageError.stack || pageError.message);
});
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname === '/api/sync/start') {
    void request.respond({ status: 202, contentType: 'application/json', body: JSON.stringify({ started: false, running: false }) });
    return;
  }
  if (url.pathname === '/api/sync/status') {
    void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'completed' }) });
    return;
  }
  if (url.pathname === '/api/auctions/fetch-documentos') {
    void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, matriculaText: '', matriculaUrl: '', editalText: '', address: '', sizeSqm: 0 }) });
    return;
  }
  if (request.method() === 'PUT' && url.pathname.startsWith('/api/auctions/')) {
    void request.respond({ status: 200, contentType: 'application/json', body: '{}' });
    return;
  }
  void request.continue();
});

try {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.innerText.includes('Garimpar'), { timeout: 45000 });
  try {
    await page.waitForFunction(() => [...document.querySelectorAll('select')].some(select => [...select.options].some(option => option.value === 'MG')), { timeout: 30000 });
  } catch (error) {
    const snapshot = await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 2400),
      selects: [...document.querySelectorAll('select')].map(select => [...select.options].map(option => option.value).slice(0, 8))
    }));
    console.error('Juiz de Fora filter did not render:', JSON.stringify(snapshot));
    throw error;
  }
  await page.evaluate(() => {
    const stateSelect = [...document.querySelectorAll('select')].find(select => [...select.options].some(option => option.value === 'MG'));
    if (!stateSelect) throw new Error('State selector was not found');
    stateSelect.value = 'MG';
    stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(resolve => setTimeout(resolve, 800));
  await page.locator('input[placeholder="Buscar cidade..."]').fill('Juiz de Fora');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.innerText.trim() === 'Juiz de Fora'), { timeout: 10000 });
  await page.evaluate(() => {
    const cityOption = [...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Juiz de Fora');
    if (!cityOption) throw new Error('Juiz de Fora city suggestion was not found');
    cityOption.click();
  });
  await new Promise(resolve => setTimeout(resolve, 1200));

  const totalOpportunities = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('h2')].find(element => /Oportunidades? Encontrad/i.test(element.innerText));
    return Number(heading?.innerText.match(/\d+/)?.[0] || 0);
  });

  let renderedCards = 0;
  let guacuiVisible = false;
  for (let pageIndex = 0; pageIndex < 8; pageIndex++) {
    const pageState = await page.evaluate(() => ({
      cards: document.querySelectorAll('.auction-card').length,
      guacui: [...document.querySelectorAll('.auction-card')].some(card => /gua[cç]ui/i.test((card as HTMLElement).innerText))
    }));
    renderedCards = pageState.cards;
    guacuiVisible = pageState.guacui;
    if (guacuiVisible) break;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(totalOpportunities >= 50, `the Juiz de Fora filter should report the full catalog, not a handful of results; found ${totalOpportunities}`);
  assert.ok(renderedCards > 0, 'the Juiz de Fora filter should render property cards');
  assert.ok(guacuiVisible, 'the verified Pestana listing for Rua Guaçuí, 35 should remain visible in the Juiz de Fora catalog');
  const clickedSimulator = await page.evaluate(() => {
    const card = [...document.querySelectorAll('.auction-card')].find(candidate => /gua[cç]ui/i.test((candidate as HTMLElement).innerText));
    const button = [...(card?.querySelectorAll('button') || [])].find(candidate => /Simular Viabilidade/i.test((candidate as HTMLElement).innerText));
    if (!button) return false;
    (button as HTMLElement).click();
    return true;
  });
  assert.ok(clickedSimulator, 'a Juiz de Fora property card should expose its simulator');
  await new Promise(resolve => setTimeout(resolve, 3500));
  const body = await page.evaluate(() => document.body.innerText);
  assert.doesNotMatch(body, /Cannot read properties of null \(reading 'avgSqm'\)/);
  assert.equal(errors.some(error => error.includes("reading 'avgSqm'")), false, errors.join('\n'));
  console.log(`Juiz de Fora lists ${totalOpportunities} opportunities (${renderedCards} cards lazily rendered); Rua Guaçuí simulator opened without a null avgSqm crash.`);
} finally {
  await browser.close();
}
