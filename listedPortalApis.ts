import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { parseOfficialLotDetail, type ScrapedAuctionDraft } from './auctioneerSyncService.ts';
import { allowedSyncLocation } from './src/utils/auctionSyncScope.ts';
import { sourceAuctionLocation } from './src/utils/auctionGeography.ts';

const API = 'https://yfvun6xbh1.execute-api.us-east-2.amazonaws.com/prod/emgea/property';
const dateOnly = (value: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0,10);
  const m=value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};
export function bankApiDraft(id:string, row:any):ScrapedAuctionDraft|null {
  const emgea=id==='emgea';
  const city=emgea?row.endereco?.cidade:row.city;
  const state=emgea?row.endereco?.estado:row.state;
  if(!allowedSyncLocation(city,state))return null;
  const title=emgea?row.nome_imovel:row.name;
  const description=emgea?row.descricao:row.description;
  const address=emgea?row.endereco?.endereco_completo:'';
  const url=emgea?`https://www.emgeaimoveis.com.br/imovel/${state}/${city.replace(/ /g,'-')}/${row.id_banco}`:`https://vitrinebradesco.com.br/auctions/${row.slug}`;
  const dates=emgea?[{date:dateOnly(row.data_melhor_proposta||row.data_venda),price:Number(row.valores?.valor_venda)}]:!row.date_auction_1&&!row.date_auction_2?[{date:dateOnly(row.auction_date),price:Number(row.price)}]:[
    {date:dateOnly(row.date_auction_1),price:Number(row.min_auction_value_1)},
    {date:dateOnly(row.date_auction_2),price:Number(row.min_auction_value_2)}];
  const today=new Date().toISOString().slice(0,10);
  const next=dates.filter(d=>d.date>=today&&d.price>0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const selected=next||dates[dates.length-1];
  const text=[title,description,address?`Endereço: ${address}`:'',`${city}/${state}`].filter(Boolean).join('\n');
  const base:ScrapedAuctionDraft={portalId:id,auctioneerName:emgea?'EMGEA':'Vitrine Bradesco',title,address:address||'',neighborhood:row.neighborhood||'',city,state,propertyType:'Apartamento',sizeSqm:0,auctionPrice:0,auctionDate:'',auctionLink:url,origin:'extrajudicial',locationScopeVerified:true};
  const draft=parseOfficialLotDetail(base,{text,title,image:emgea?row.foto_capa:(typeof row.images?.[0]==='string'?row.images[0]:''),structuredAddresses:address?[address]:[],structuredSizes:[],documentLinks:[]},url);
  return {...draft,city,state,origin:'extrajudicial',originVerified:true,sourceVerified:true,sellerBank:emgea?'EMGEA':'Bradesco',
    auctionPrice:selected?.price>0?selected.price:0,priceVerified:selected?.price>0,auctionDate:selected?.date||'',firstAuctionDate:dates[0]?.date||undefined,secondAuctionDate:dates[1]?.date||undefined,
    sourceClosed:emgea?row.status_da_venda!=='ativo':Boolean(dates.every(d=>d.date&&d.date<today)),
    estimatedValue:emgea&&Number(row.valores?.valor_avaliado)>0?Number(row.valores.valor_avaliado):draft.estimatedValue,
    ...(emgea?{saleMode:row.tags?.includes('Melhor Proposta')?'Melhor Proposta':draft.saleMode}:{}),
  };
}

// These are the same public inventory APIs requested by the portals themselves.
// Save every response and verify page totals instead of accepting the first screen.
export async function collectBankApi(id:string,dir:string,onPage:(rows:ScrapedAuctionDraft[],total:number)=>Promise<void>) {
  let headers:Record<string,string>={};
  if(id==='emgea'){
    const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
    try{const page=await browser.newPage();page.on('request',request=>{if(request.url().split('?')[0]===API)headers=request.headers();});
      await page.goto('https://www.emgeaimoveis.com.br/busca',{waitUntil:'networkidle2',timeout:45000});
      if(!headers['x-api-key'])throw Error('A página oficial não forneceu acesso à API pública de imóveis');
    }finally{await browser.close();}
  }
  const seen=new Set<string>();let maximum=1;let expected=0;
  for(let page=1;page<=maximum;page++){
    const url=id==='emgea'?`${API}?page=${page}`:`https://api.vitrinebradesco.com.br/v1/auctions?page=${page}&type=realstate`;
    const response=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`${url}: HTTP ${response.status}`);
    const body=await response.json();const records=body.data;
    if(!Array.isArray(records))throw Error('Resposta da API sem inventário de imóveis');
    fs.writeFileSync(path.join(dir,`${id}-api-${page}.json`),JSON.stringify(body));
    maximum=Number(id==='emgea'?body.pagination.max_pages:body.total_pages);expected=Number(body.pagination?.total_items||0);
    if(!Number.isInteger(maximum)||maximum<1||!records.length)throw Error('Paginação inconsistente na API oficial');
    const fresh=records.filter((row:any)=>{const key=String(row.id||row.guid);if(seen.has(key))return false;seen.add(key);return true;});
    if(fresh.length!==records.length)throw Error('A API repetiu imóveis entre páginas; cobertura deve ser revisada');
    await onPage(fresh.map((row:any)=>bankApiDraft(id,row)).filter(Boolean),records.length);
  }
  if(expected&&seen.size!==expected)throw Error(`Inventário mudou durante a coleta: ${seen.size}/${expected}; nova conferência necessária`);
}

export async function collectSoldApi(dir:string,onPage:(links:Array<{url:string;text:string}>,total:number)=>Promise<void>){
  const seen=new Set<number>();let total=1;
  for(let page=1;seen.size<total;page++){
    const url=new URL('https://offer-query.superbid.net/offers/');
    Object.entries({portalId:'[2,15]',requestOrigin:'store',locale:'pt_BR',timeZoneId:'America/Sao_Paulo',searchType:'opened',filter:'stores.id:[1161,1741];product.productType.description:imoveis;isShopping:false;auction.modalityId:[1,4,5,7]',pageNumber:String(page),pageSize:'24',orderBy:'price:desc;visits:desc',fieldList:'id;linkURL;price;endDate;offerStatus;product.shortDesc;product.template;product.productType;auction;offerDetail'}).forEach(([k,v])=>url.searchParams.set(k,v));
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Sold API: HTTP ${response.status}`);
    const body=await response.json();fs.writeFileSync(path.join(dir,`sold-api-${page}.json`),JSON.stringify(body));total=Number(body.total);
    if(!Array.isArray(body.offers)||!Number.isFinite(total))throw Error('Resposta inválida da API Sold');
    const fresh=body.offers.filter((r:any)=>!seen.has(r.id));if(!fresh.length&&seen.size<total)throw Error('Paginação Sold interrompida antes do total informado');
    const links:Array<{url:string;text:string}>=[];
    for(const row of fresh){seen.add(row.id);const properties=row.product?.template?.groups?.flatMap((g:any)=>g.properties)||[];
      const address=properties.find((p:any)=>p.id==='endereco')?.value||'';const title=row.product?.shortDesc||'';
      const location=sourceAuctionLocation(address)||sourceAuctionLocation(title);
      if(!location||!allowedSyncLocation(location.city,location.state))continue;
      // The public detail route uses the exact offer id, with the displayed title as its slug.
      const slug=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      links.push({url:row.linkURL||`https://www.sold.com.br/oferta/${slug}-${row.id}`,text:title+'\n'+address});
    }
    await onPage(links,fresh.length);
  }
}

async function publicJson(url:string,body?:unknown){
 const r=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.json();
}
export async function collectRioLinks(dir:string,onPage:(links:Array<{url:string;text:string}>,total:number)=>Promise<void>){
 const inventory=await publicJson('https://www.rioleiloes.com.br/core/api/get-leiloes');
 fs.writeFileSync(path.join(dir,'rioleiloes-events.json'),JSON.stringify(inventory));
 if(!Array.isArray(inventory.items))throw Error('Inventário de leilões Rio indisponível');
 // The current endpoint returns all events. Do not claim coverage if pagination changes.
 const incomplete=Number(inventory.totalPages)>1;
 for(const event of inventory.items){
  if(!event.categorialeilao?.some((c:any)=>c.nm_categoria==='Imóveis'))continue;
  const lots=await publicJson(`https://www.rioleiloes.com.br/leilao/filtro-id/leilao_id/${event.id}?`);
  fs.writeFileSync(path.join(dir,`rioleiloes-event-${event.id}.json`),JSON.stringify(lots));
  if(!Array.isArray(lots.lotes))throw Error(`Lotes indisponíveis para leilão ${event.id}`);
  await onPage(lots.lotes.map((lot:any)=>({url:`https://www.rioleiloes.com.br/leilao/index/leilao_id/${event.id}/lote/${lot.lote_id}`,text:'Imóvel: '+event.nm})),lots.lotes.length);
 }
 if(incomplete)throw Error('Inventário Rio informou páginas adicionais; cobertura ainda não confirmada');
}
export async function collectPestanaApi(dir:string,onPage:(rows:ScrapedAuctionDraft[],total:number)=>Promise<void>){
 const events=await publicJson('https://www.pestanaleiloes.com.br/api/v2/leilao');
 if(!Array.isArray(events))throw Error('Inventário Pestana inválido');
 fs.writeFileSync(path.join(dir,'pestana-events.json'),JSON.stringify(events));
 const propertyEvents=events.filter((e:any)=>!e.privado&&e.subTipoBens?.some((t:any)=>t.tipoBem===462));
 const ids=[...new Set<number>(propertyEvents.flatMap((e:any)=>e.lotes||[]))];
 for(let start=0;start<ids.length;start+=80){
  const requested=ids.slice(start,start+80);
  const cards=await publicJson('https://www.pestanaleiloes.com.br/api/v2/lote/cards-por-ids',{ids:requested});
  if(!Array.isArray(cards))throw Error('Resposta de lotes Pestana inválida');
  fs.writeFileSync(path.join(dir,`pestana-cards-${start}.json`),JSON.stringify(cards));
  const targets=cards.filter((c:any)=>{const l=sourceAuctionLocation(c.descricao||'');return l&&allowedSyncLocation(l.city,l.state);});
  if(targets.length){
   const details=await publicJson('https://www.pestanaleiloes.com.br/api/v2/lote/por-ids',{ids:targets.map((c:any)=>c.id)});
   fs.writeFileSync(path.join(dir,`pestana-details-${start}.json`),JSON.stringify(details));
   if(!Array.isArray(details))throw Error('Detalhes Pestana inválidos');
   const rows:ScrapedAuctionDraft[]=[];
   for(const lot of details){
    const location=sourceAuctionLocation(lot.descricao||'');if(!location||!allowedSyncLocation(location.city,location.state))continue;
    const event=propertyEvents.find((e:any)=>e.id===lot.leilao);if(!event)continue;
    const property=lot.bens?.[0];
    const description=(lot.bens||[]).flatMap((b:any)=>[b.descricao,b.observacao,...(b.caracteristicas||[]).map((c:any)=>c.valor)]).filter(Boolean).join('\n');
    const text=cheerio.load(description).text();
    const origin=property?.origem==='Judicial'?'judicial':'extrajudicial';
    const law=lot.informacoesLei9514,dates=event.informacoesLei9514;
    const rounds=law?.pertenceLei?[{date:dateOnly(dates?.dataLeilao1||''),price:Number(law.valorLeilao1)},{date:dateOnly(dates?.dataLeilao2||''),price:Number(law.valorLeilao2)}]:[{date:dateOnly(event.data||''),price:Number(lot.valorInicial)}];
    const today=new Date().toISOString().slice(0,10);const next=rounds.filter(r=>r.date>=today&&r.price>0).sort((a,b)=>a.date.localeCompare(b.date))[0]||rounds.at(-1)!;
    const url=`https://www.pestanaleiloes.com.br/agenda-de-leiloes/${lot.leilao}/${lot.id}`;
    const base:ScrapedAuctionDraft={portalId:'pestana',auctioneerName:'Pestana Leilões',title:lot.descricao,...location,address:'',neighborhood:'',propertyType:'Apartamento',sizeSqm:0,auctionPrice:0,auctionDate:'',auctionLink:url,origin,locationScopeVerified:true};
    const draft=parseOfficialLotDetail(base,{title:lot.descricao,text,image:'',structuredAddresses:[],structuredSizes:[],documentLinks:[]},url);
    rows.push({...draft,...location,origin,originVerified:property?.origem==='Judicial'||Boolean(law?.pertenceLei)||/banco|santander|bradesco|ita[uú]|sicredi/i.test(event.nome),sourceClosed:lot.visivel===false||/retirado|vendido|arrematado|cancelado|suspenso/i.test(lot.status),auctionPrice:next.price||0,priceVerified:next.price>0,auctionDate:next.date,firstAuctionDate:rounds[0]?.date,secondAuctionDate:rounds[1]?.date,matriculaUrl:property?.documentos?.find((d:any)=>/matr[ií]cula/i.test(d.nome))?.link});
   }
   await onPage(rows,cards.length);
   if(details.length!==targets.length)throw Error('Alguns detalhes Pestana não retornaram; conferir relatório');
  }else await onPage([],cards.length);
  if(cards.length!==requested.length)throw Error('Inventário Pestana não retornou todos os lotes anunciados');
 }
}
