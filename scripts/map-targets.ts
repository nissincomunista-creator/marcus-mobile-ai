import fs from 'node:fs';
import { cleanBrazilianAddress } from '../geocodeService.ts';
import { canonicalStreet } from '../src/utils/streetMatching.ts';
const store=JSON.parse(fs.readFileSync('data_store.json','utf8'));
const targets=store.auctions.map((a:any)=>{const p=cleanBrazilianAddress(a.address||'');return {id:a.id,address:a.address,city:a.city,state:a.state,neighborhood:a.neighborhood,street:p.street,streetKey:canonicalStreet(p.street),number:p.number,lat:a.lat,lng:a.lng};});
fs.writeFileSync('C:/Users/Marcus/Documents/Codex/2026-09-13/quero-que-foque-em-2-coisas/work/map-targets.json',JSON.stringify(targets));
console.log({properties:targets.length,numbered:targets.filter((t:any)=>t.number).length,municipalities:new Set(targets.map((t:any)=>t.state+'|'+t.city)).size});
