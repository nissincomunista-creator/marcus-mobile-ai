import puppeteer from 'puppeteer';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { enrichLotDetails } from '../auctioneerSyncService.ts';

const store = JSON.parse(readFileSync('data_store.json', 'utf8'));
const property = store.auctions.find((a: any) => a.auctionLink?.includes('x128862'));
assert(property);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const result = await enrichLotDetails(browser, { ...property, portalId: 'megaleiloes', auctioneerName: 'Mega Leiloes' });
  console.log(JSON.stringify({ address: result.address, size: result.sizeSqm, price: result.auctionPrice }));
  assert.equal(result.auctionPrice, 301000);
  assert.equal(result.sizeSqm, 104);
  assert.match(result.address, /424/);
} finally {
  await browser.close();
}
