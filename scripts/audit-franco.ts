import fs from 'node:fs';
import { AUCTIONEER_PORTALS, scrapeConfiguredAuctioneers } from '../auctioneerSyncService.ts';
import { declaredAuctionLocation } from '../src/utils/auctionLocation.ts';
for(const portal of AUCTIONEER_PORTALS) portal.enabled=portal.domain==='francoleiloes.com.br';
const rows=await scrapeConfiguredAuctioneers('judicial','RJ','Rio de Janeiro');
const allowed=rows.filter(row=>{const p=declaredAuctionLocation(row);return !p||(p.state==='RJ'&&p.city==='Rio de Janeiro');});
fs.writeFileSync('sync-audits/franco-location-validation.json',JSON.stringify({checkedAt:new Date().toISOString(),scraped:rows.length,allowed:allowed.length,rows:rows.map(row=>({title:row.title,link:row.auctionLink,declared:declaredAuctionLocation(row)}))},null,2));
console.log(JSON.stringify({scraped:rows.length,allowed:allowed.length}));
