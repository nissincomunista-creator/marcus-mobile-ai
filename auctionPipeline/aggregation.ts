import {createHash} from 'node:crypto';import {propertyIdentity} from '../auctionIdentity.ts';import {expiredRounds,isRetired} from './lifecycle.ts';import type {AuctionProperty} from '../src/types.ts';
export function aggregateAuctions(auctions:AuctionProperty[],canonicalize:(u:string)=>string):AuctionProperty[] {
 const sourceKey=(url:string)=>{try{const u=new URL(url);const id=u.pathname.match(/[-/]([jx]\d+)\/?$/i);if(/(^|\.)megaleiloes\.com\.br$/i.test(u.hostname)&&id)return 'megaleiloes|'+id[1].toLowerCase();}catch{}return canonicalize(url);};
 const keys=new Map<string,AuctionProperty[]>(),links=new Map<string,AuctionProperty[]>();const groups:AuctionProperty[][]=[];
 for(const a of auctions){const urls=[a.auctionLink,...(a.sourceLinks||[])].filter(Boolean).map(u=>sourceKey(u!));
  const partial=/\b(?:fra[cç][aã]o|parte|quota)\s+(?:de\s+)?\d|\d+(?:[.,]\d+)?\s*%\s*(?:do|da|de)\s*(?:im[oó]vel|propriedade)/i.test(a.title||'');
  const key=partial?null:propertyIdentity(a.address,a.city,a.state,a.propertyType);
  let group=urls.map(u=>links.get(u)).find(Boolean);const candidate=key?keys.get(key):undefined;
  const differentContract=candidate?.some(b=>b.id.startsWith('auc-caixa-')&&a.id.startsWith('auc-caixa-')&&b.id!==a.id);
  group ||= differentContract?undefined:candidate;
  if(!group){group=[];groups.push(group);}group.push(a);for(const u of urls)links.set(u,group);if(key&&!keys.has(key))keys.set(key,group);
 }
 const timestamp=(a:AuctionProperty)=>a.lastSyncedAt||a.availability?.checkedAt||'';
 return groups.map(originalGroup=>{
  const records=new Map<string,AuctionProperty>();
  for(const a of originalGroup){for(const r of a.sourceRecords||[]){const key=canonicalize(r.auctionLink||r.id);if(!records.has(key))records.set(key,r);}const {sourceRecords,offers,...snapshot}=a;records.set(canonicalize(a.auctionLink||a.id),snapshot as AuctionProperty);}
  const group=[...records.values()].map(a=>{
   if(!isRetired(a)&&a.ingestionStatus!=='quarentena_extracao'&&expiredRounds([a.firstAuctionDate,a.secondAuctionDate,a.thirdAuctionDate,a.auctionDate].filter(Boolean) as string[],a.saleMode))return {...a,ingestionStatus:'expirado_por_data' as const,availability:{state:'closed' as const,status:'expirado_por_data' as const,url:a.auctionLink||'',checkedAt:new Date().toISOString(),reason:'Todas as rodadas transcorreram'}};
   return a;
  });
  const live=group.filter(a=>!isRetired(a)&&a.ingestionStatus!=='quarentena_extracao');const source=(live.length?live:group).slice().sort((a,b)=>timestamp(b).localeCompare(timestamp(a)))[0];
  const offers=live.filter(a=>a.priceVerified&&a.auctionPrice>0).sort((a,b)=>a.auctionPrice-b.auctionPrice||timestamp(b).localeCompare(timestamp(a)));
  const bid=offers[0]||source;const urls=[...new Set(group.flatMap(a=>[a.auctionLink,...(a.sourceLinks||[])]).filter(Boolean).map(u=>canonicalize(u!)))];
  const identity=propertyIdentity(source.address,source.city,source.state,source.propertyType)||canonicalize(source.auctionLink||source.id);
  return {...source,id:originalGroup[0].id,sourceRecords:group.length>1?group:undefined,canonicalPropertyId:createHash('sha256').update(identity).digest('hex'),
   auctionLink:bid.auctionLink,auctionPrice:bid.auctionPrice,auctionDate:bid.auctionDate,firstAuctionDate:bid.firstAuctionDate,secondAuctionDate:bid.secondAuctionDate,thirdAuctionDate:bid.thirdAuctionDate,firstAuctionPrice:bid.firstAuctionPrice,secondAuctionPrice:bid.secondAuctionPrice,priceVerified:bid.priceVerified,availability:bid.availability,
   sourceLinks:urls,links_adicionais:urls.filter(u=>u!==canonicalize(bid.auctionLink||'')),saved:group.some(a=>a.saved),
   offers:offers.map(a=>({url:a.auctionLink!,price:a.auctionPrice,date:a.auctionDate,checkedAt:timestamp(a)}))};
 });
}
