import fs from 'node:fs';
import zlib from 'node:zlib';
import {availabilityTargets,auditAvailability} from '../auctionPipeline/availabilityAudit.ts';
import {isRetired} from '../auctionPipeline/lifecycle.ts';
const store=JSON.parse(fs.existsSync('data_store.json') ? fs.readFileSync('data_store.json','utf8') : zlib.gunzipSync(fs.readFileSync('data_store.json.gz')).toString());
const targets=availabilityTargets(store.auctions);
const hosts=new Set<string>();
const selected=targets.filter(t=>{const host=new URL(t.url).host;if(hosts.has(host))return false;hosts.add(host);return true;}).slice(0,40);
const rows:any[]=[];
console.log(JSON.stringify({totalStored:store.auctions.length,retiredByRules:store.auctions.filter(isRetired).length,urlsToAudit:targets.length,sample:selected.map(t=>t.url)}));
const report=await auditAvailability(selected,(target,result)=>{rows.push({url:target.url,...result});console.log(result.state,target.url,result.reason);});
fs.mkdirSync('sync-audits',{recursive:true});fs.writeFileSync('sync-audits/lifecycle-live-oct09.json',JSON.stringify({report,rows},null,2));
console.log(report);

