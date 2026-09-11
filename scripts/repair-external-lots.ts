import puppeteer from 'puppeteer';
import { readFileSync } from 'node:fs';
import { enrichLotDetails } from '../auctioneerSyncService.ts';

const store = JSON.parse(readFileSync('data_store.json', 'utf8'));
const queue = store.auctions.filter((a: any) => a.auctionLink?.includes('megaleiloes.com.br') && ['judicial', 'extrajudicial'].includes(a.origin));
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
let updated = 0;
let failed = 0;
try {
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const property = queue.shift();
      const result = await enrichLotDetails(browser, { ...property, portalId: 'megaleiloes', auctioneerName: 'Mega Leiloes' });
      if (!result.addressVerified || !result.sizeVerified || !result.priceVerified) { failed++; continue; }
      const response = await fetch(`http://localhost:3000/api/auctions/${property.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: property.id, address: result.address, sizeSqm: result.sizeSqm,
          auctionPrice: result.auctionPrice, description: result.description,
          pendingCondoCost: result.pendingCondoCost, pendingIptuCost: result.pendingIptuCost,
          allowsFinancing: result.allowsFinancing, allowsInstallments: result.allowsInstallments,
          paymentTerms: result.paymentTerms, lat: null, lng: null })
      });
      if (response.ok) { updated++; console.log(JSON.stringify({ id: property.id, price: result.auctionPrice, area: result.sizeSqm })); }
      else failed++;
    }
  }));
} finally { await browser.close(); }
console.log(JSON.stringify({ updated, failed }));
