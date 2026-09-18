import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
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
  const dates=emgea?[{date:dateOnly(row.data_melhor_proposta||row.data_venda),price:Number(row.valores?.valor_venda)}]:[
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
    ...(emgea?{saleMode:'Venda Direta' as const}:{}),
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
