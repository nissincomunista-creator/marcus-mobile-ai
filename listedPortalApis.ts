import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { launchPuppeteer } from './src/utils/puppeteerConfig.ts';
import * as cheerio from 'cheerio';
import { extractAddress, parseOfficialLotDetail, type ScrapedAuctionDraft } from './auctioneerSyncService.ts';
import { allowedSyncLocation } from './src/utils/auctionSyncScope.ts';
import { sourceAuctionLocation } from './src/utils/auctionGeography.ts';

const EMGEA_API_DEFAULT = 'https://yfvun6xbh1.execute-api.us-east-2.amazonaws.com/prod/emgea/property';
const dateOnly = (value: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0,10);
  const m=value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};
function inferEmgeaNeighborhood(row: any, city: string): string {
  const explicit = String(row.endereco?.bairro || row.neighborhood || '').trim();
  if (explicit) return explicit;
  const full = String(row.endereco?.endereco_completo || '');
  if (full && city) {
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = full.match(new RegExp(`,\\s*([^,]+?)\\s*,\\s*${escapedCity}\\b`, 'i'));
    if (m?.[1] && !/^(?:unidade|bloco|apto|sala|casa|quadra|lote)/i.test(m[1].trim())) {
      return m[1].trim();
    }
  }
  const titleParts = String(row.nome_imovel || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const tail = titleParts.at(-1) || '';
  if (tail && !/residencial|comercial|apartamento|casa|terreno|loja|sala/i.test(tail)) return tail;
  return '';
}
export function bankApiDraft(id:string, row:any):ScrapedAuctionDraft|null {
  const emgea=id==='emgea';
  const city=emgea?row.endereco?.cidade:row.city;
  const state=emgea?row.endereco?.estado:row.state;
  if(!allowedSyncLocation(city,state))return null;
  const title=emgea?row.nome_imovel:row.name;
  const description=emgea?row.descricao:row.description;
  const address=emgea
    ? (row.endereco?.endereco_completo || '')
    : (row.address || row.endereco?.endereco_completo || extractAddress(`${title || ''}\n${description || ''}`, '') || '');
  const neighborhood=emgea?inferEmgeaNeighborhood(row,city):(row.neighborhood||'');
  const url=emgea?`https://www.emgeaimoveis.com.br/imovel/${state}/${city.replace(/ /g,'-')}/${row.id_banco}`:`https://vitrinebradesco.com.br/auctions/${row.slug}`;
  const dates=emgea?[{date:dateOnly(row.data_melhor_proposta||row.data_venda),price:Number(row.valores?.valor_venda)}]:!row.date_auction_1&&!row.date_auction_2?[{date:dateOnly(row.auction_date),price:Number(row.price)}]:[
    {date:dateOnly(row.date_auction_1),price:Number(row.min_auction_value_1)},
    {date:dateOnly(row.date_auction_2),price:Number(row.min_auction_value_2)}];
  const today=new Date().toISOString().slice(0,10);
  const next=dates.filter(d=>d.date>=today&&d.price>0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const selected=next||dates[dates.length-1];
  const text=[title,description,address?`Endereço: ${address}`:'',neighborhood?`Bairro: ${neighborhood}`:'',`${city}/${state}`].filter(Boolean).join('\n');
  const base:ScrapedAuctionDraft={portalId:id,auctioneerName:emgea?'EMGEA':'Vitrine Bradesco',title,address:address||'',neighborhood,city,state,propertyType:'Apartamento',sizeSqm:0,auctionPrice:0,auctionDate:'',auctionLink:url,origin:'extrajudicial',locationScopeVerified:true};
  const draft=parseOfficialLotDetail(base,{text,title,image:emgea?row.foto_capa:(typeof row.images?.[0]==='string'?row.images[0]:''),structuredAddresses:address?[address]:[],structuredSizes:[],documentLinks:[]},url);
  return {...draft,city,state,neighborhood:draft.neighborhood||neighborhood,origin:'extrajudicial',originVerified:true,sourceVerified:true,sellerBank:emgea?'EMGEA':'Bradesco',
    auctionPrice:selected?.price>0?selected.price:0,priceVerified:selected?.price>0,auctionDate:selected?.date||'',firstAuctionDate:dates[0]?.date||undefined,secondAuctionDate:dates[1]?.date||undefined,
    sourceClosed:emgea?row.status_da_venda!=='ativo':Boolean(dates.every(d=>d.date&&d.date<today)),
    estimatedValue:emgea&&Number(row.valores?.valor_avaliado)>0?Number(row.valores.valor_avaliado):draft.estimatedValue,
    ...(emgea?{saleMode:row.tags?.includes('Melhor Proposta')?'Melhor Proposta':draft.saleMode}:{}),
  };
}

// These are the same public inventory APIs requested by the portals themselves.
// Save every response and verify page totals instead of accepting the first screen.
export async function collectBankApi(id:string,dir:string,onPage:(rows:ScrapedAuctionDraft[],total:number)=>Promise<void>) {
  const seen=new Set<string>();let maximum=1;
  const processRecords=async(body:any,pageNum:number)=>{
    const records=body?.data;
    if(!Array.isArray(records))throw Error('Resposta da API sem inventário de imóveis');
    fs.writeFileSync(path.join(dir,`${id}-api-${pageNum}.json`),JSON.stringify(body));
    maximum=Number(id==='emgea'?body.pagination?.max_pages:body.total_pages)||1;
    if(!records.length)return false;
    const fresh=records.filter((row:any)=>{const key=String(row.id||row.guid||row.id_banco);if(seen.has(key))return false;seen.add(key);return true;});
    if(fresh.length)await onPage(fresh.map((row:any)=>bankApiDraft(id,row)).filter(Boolean) as ScrapedAuctionDraft[],records.length);
    return true;
  };

  if(id==='emgea'){
    const browser=await launchPuppeteer(puppeteer, {headless:true,args:['--no-sandbox']});
    try{
      const page=await browser.newPage();
      await page.setRequestInterception(true);
      let apiEndpoint=EMGEA_API_DEFAULT;
      let apiKey='';
      page.on('request',request=>{
        const rt=request.resourceType();
        if(['image','stylesheet','font','media'].includes(rt)){void request.abort();return;}
        const u=request.url().split('?')[0];
        if(/execute-api.*\/emgea\/property/i.test(u)&&request.headers()['x-api-key']){
          apiEndpoint=u;
          apiKey=request.headers()['x-api-key'];
        }
        void request.continue();
      });
      await page.goto('https://www.emgeaimoveis.com.br/busca',{waitUntil:'domcontentloaded',timeout:45000});
      for(let i=0;i<50&&!apiKey;i++)await new Promise(r=>setTimeout(r,300));
      if(!apiKey)throw Error('A página oficial EMGEA não forneceu acesso à API pública de imóveis');
      for(let pageNum=1;pageNum<=maximum;pageNum++){
        const res=await page.evaluate(async(url:string,key:string)=>{
          const r=await fetch(url,{headers:{'x-api-key':key}});
          const txt=await r.text();
          return {ok:r.ok,status:r.status,txt};
        },`${apiEndpoint}?page=${pageNum}`,apiKey);
        if(!res.ok)throw Error(`${apiEndpoint}?page=${pageNum}: HTTP ${res.status}`);
        const cont=await processRecords(JSON.parse(res.txt),pageNum);
        if(!cont)break;
      }
      return;
    }finally{await browser.close();}
  }

  const headers:Record<string,string>={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36','Origin':'https://vitrinebradesco.com.br','Referer':'https://vitrinebradesco.com.br/'};
  for(let page=1;page<=maximum;page++){
    const url=`https://api.vitrinebradesco.com.br/v1/auctions?page=${page}&type=realstate`;
    const response=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`${url}: HTTP ${response.status}`);
    const body=await response.json();
    const cont=await processRecords(body,page);
    if(!cont)break;
  }
}

export async function collectSoldApi(dir:string,onPage:(links:Array<{url:string;text:string}>,total:number)=>Promise<void>){
  const seen=new Set<number>();let total=1;
  for(let page=1;seen.size<total;page++){
    const url=new URL('https://offer-query.superbid.net/offers/');
    Object.entries({portalId:'[2,15]',requestOrigin:'store',locale:'pt_BR',timeZoneId:'America/Sao_Paulo',searchType:'opened',filter:'stores.id:[1161,1741];product.productType.description:imoveis;isShopping:false;auction.modalityId:[1,4,5,7]',pageNumber:String(page),pageSize:'24',orderBy:'price:desc;visits:desc',fieldList:'id;linkURL;price;endDate;offerStatus;product.shortDesc;product.location;product.template;product.productType;auction;offerDetail'}).forEach(([k,v])=>url.searchParams.set(k,v));
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Sold API: HTTP ${response.status}`);
    const body=await response.json();fs.writeFileSync(path.join(dir,`sold-api-${page}.json`),JSON.stringify(body));total=Number(body.total);
    if(!Array.isArray(body.offers)||!Number.isFinite(total))throw Error('Resposta inválida da API Sold');
    const fresh=body.offers.filter((r:any)=>!seen.has(r.id));if(!fresh.length&&seen.size<total)throw Error('Paginação Sold interrompida antes do total informado');
    const links:Array<{url:string;text:string}>=[];
    for(const row of fresh){seen.add(row.id);const properties=row.product?.template?.groups?.flatMap((g:any)=>g.properties)||[];
      const address=properties.find((p:any)=>p.id==='endereco')?.value||'';const title=row.product?.shortDesc||'';
      const locCity=String(row.product?.location?.city||'').replace(/\s*-\s*[A-Z]{2}$/,'').trim();
      const locState=String(row.product?.location?.city||'').match(/\s-\s*([A-Z]{2})$/)?.[1]||'';
      const location=(locCity&&locState?{city:locCity,state:locState}:null)||sourceAuctionLocation(address)||sourceAuctionLocation(title);
      if(!location||!allowedSyncLocation(location.city,location.state))continue;
      // The public detail route uses the exact offer id, with the displayed title as its slug.
      const slug=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      links.push({url:row.linkURL||`https://www.sold.com.br/oferta/${slug}-${row.id}`,text:`${title}\n${address}\n${location.city}/${location.state}`});
    }
    await onPage(links,fresh.length);
  }
}

export async function collectSuperbidOffers(id:'sold'|'superbid',dir:string,onPage:(rows:ScrapedAuctionDraft[],total:number)=>Promise<void>){
  const seen=new Set<number>();let total=1;
  const storeFilter=id==='sold'?'stores.id:[1161,1741];':'';
  for(let page=1;seen.size<total&&page<=60;page++){
    const url=new URL('https://offer-query.superbid.net/offers/');
    Object.entries({
      portalId:'[2,15]',requestOrigin:'store',locale:'pt_BR',timeZoneId:'America/Sao_Paulo',searchType:'opened',
      filter:`${storeFilter}product.productType.description:imoveis;isShopping:false;auction.modalityId:[1,4,5,7]`,
      pageNumber:String(page),pageSize:'50',orderBy:'price:desc;visits:desc',
      fieldList:'id;linkURL;price;endDate;offerStatus;product.shortDesc;product.location;product.template;product.productType;product.thumbnailUrl;auction;offerDetail;stores'
    }).forEach(([k,v])=>url.searchParams.set(k,v));
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`${id.toUpperCase()} API: HTTP ${response.status}`);
    const body=await response.json();fs.writeFileSync(path.join(dir,`${id}-api-${page}.json`),JSON.stringify(body));total=Number(body.total);
    if(!Array.isArray(body.offers)||!Number.isFinite(total))throw Error(`Resposta inválida da API ${id}`);
    const fresh=body.offers.filter((r:any)=>!seen.has(r.id));if(!fresh.length)break;
    const drafts:ScrapedAuctionDraft[]=[];
    for(const row of fresh){
      seen.add(row.id);
      const properties=row.product?.template?.groups?.flatMap((g:any)=>g.properties)||[];
      const address=properties.find((p:any)=>p.id==='endereco')?.value||'';
      const title=row.product?.shortDesc||'';
      const rawCity=String(row.product?.location?.city||'');
      const locCity=rawCity.replace(/\s*-\s*[A-Z]{2}$/,'').trim();
      const locState=rawCity.match(/\s-\s*([A-Z]{2})$/)?.[1]||'';
      const location=(locCity&&locState?{city:locCity,state:locState}:null)||sourceAuctionLocation(address)||sourceAuctionLocation(title);
      if(!location||!allowedSyncLocation(location.city,location.state))continue;
      const slug=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const link=row.linkURL||(id==='sold'?`https://www.sold.com.br/oferta/${slug}-${row.id}`:`https://www.superbid.net/oferta/${slug}-${row.id}`);
      const isSoldRow = id === 'sold' || /sold\.com\.br/i.test(link) || (Array.isArray(row.stores) && row.stores.some((s:any) => [1161, 1741].includes(Number(s?.id ?? s))));
      const effectivePortalId = isSoldRow ? 'sold' : 'superbid';
      const effectiveAuctioneer = isSoldRow ? 'Sold Leilões' : 'Superbid';
      const price=Number(row.offerDetail?.currentMinBid||row.offerDetail?.initialBidValue||row.price||0);
      const dateStr=dateOnly(String(row.endDate||row.auction?.endDate||''));
      const propText=properties.map((p:any)=>`${p.title}: ${p.value}`).join('\n');
      const fullText=`${title}\n${address}\n${location.city}/${location.state}\n${propText}`;
      const isJudicial=/judicial|vara|processo|execu[cç][aã]o/i.test(fullText);
      const origin:'judicial'|'extrajudicial'=isJudicial?'judicial':'extrajudicial';
      const base:ScrapedAuctionDraft={
        portalId:effectivePortalId,auctioneerName:effectiveAuctioneer,title,address,neighborhood:row.product?.location?.neighborhood||'',
        city:location.city,state:location.state,propertyType:'Apartamento',sizeSqm:0,auctionPrice:price,auctionDate:dateStr,firstAuctionDate:dateStr||undefined,
        firstAuctionPrice:price||undefined,auctionLink:link,imageUrl:row.product?.thumbnailUrl||'',description:fullText,origin,
        originVerified:true,sourceVerified:true,locationScopeVerified:true,priceVerified:price>0
      };
      const parsed=parseOfficialLotDetail(base,{title,text:fullText,image:row.product?.thumbnailUrl||'',structuredAddresses:address?[address]:[],structuredSizes:[],documentLinks:[],officialFinancials:{auctionPrice:price,priceVerified:price>0,auctionDate:dateStr,firstAuctionDate:dateStr||undefined,firstAuctionPrice:price||undefined}},link);
      drafts.push({...parsed,city:location.city,state:location.state,neighborhood:parsed.neighborhood||row.product?.location?.neighborhood||'',origin,originVerified:true,sourceVerified:true});
    }
    await onPage(drafts,fresh.length);
  }
}

export async function collectSantanderApi(dir:string,onPage:(rows:ScrapedAuctionDraft[],total:number)=>Promise<void>){
  let apiKey='d9ffca1a-71af-48e4-bece-8bc852455cd7';
  const browser=await launchPuppeteer(puppeteer,{headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const page=await browser.newPage();
    page.on('request',req=>{if(req.url().includes('api.shi.santander')&&req.headers()['x-api-key'])apiKey=req.headers()['x-api-key'];});
    await page.goto('https://www.santanderimoveis.com.br/',{waitUntil:'domcontentloaded',timeout:25000}).catch(()=>{});
    await new Promise(r=>setTimeout(r,2000));
    await page.close().catch(()=>{});
  }finally{await browser.close().catch(()=>{});}

  const limit=100;
  let offset=0;
  let total=1;
  let pageNum=1;
  while(offset<total){
    const url=`https://api.shi.santander.com.br/v1/real_estate_auctions/real_estate_properties?_limit=${limit}&_offset=${offset}`;
    const r=await fetch(url,{headers:{'x-api-key':apiKey,'Origin':'https://www.santanderimoveis.com.br','Referer':'https://www.santanderimoveis.com.br/','Accept':'application/json'},signal:AbortSignal.timeout(30000)});
    if(!r.ok)throw Error(`Santander API: HTTP ${r.status}`);
    const body=await r.json();
    const records=body.content||[];
    total=Number(body.pagination?.totalElements||0);
    fs.writeFileSync(path.join(dir,`santander-api-${pageNum}.json`),JSON.stringify(body));
    const drafts:ScrapedAuctionDraft[]=[];
    for(const item of records){
      const city=String(item.postalAddress?.city?.cityName||item.postalAddress?.townName||'').trim();
      const state=String(item.postalAddress?.state?.stateCode||'').toUpperCase().trim();
      if(!allowedSyncLocation(city,state))continue;
      if(item.saleInformation?.isSold||item.saleInformation?.isAvailable===false)continue;
      const addrStreet=String(item.postalAddress?.streetName||'').replace(/\s*,\s*[^,]+-\s*[A-Z]{2}\.?\s*CEP:.*$/i,'').trim();
      const addrNum=String(item.postalAddress?.streetBuildingIdentification||'').trim();
      const address=[addrStreet,addrNum&&addrNum!=='0'?`nº ${addrNum}`:''].filter(Boolean).join(', ');
      const neighborhood=String(item.postalAddress?.districtName||'').trim();
      const areaObj=item.physicalCharacteristics?.areaCharacteristics||{};
      const sizeSqm=Math.round(Number(areaObj.privateArea||areaObj.usableArea||areaObj.builtArea||areaObj.totalArea||areaObj.landArea||0));
      const price=Number(item.saleInformation?.minimumSalePrice?.amount||item.saleInformation?.initialSalePrice?.amount||0);
      const appraisal=Number(item.financialInformation?.marketValue?.amount||item.financialInformation?.assessedValue?.amount||0);
      const auctionDate=dateOnly(String(item.saleInformation?.auctionStartDate||item.saleInformation?.saleDate||''));
      const partnerRaw=String(item.saleInformation?.salePartner?.salePartnerName||'');
      const partnerUrl=partnerRaw.includes('|')?partnerRaw.split('|')[1].trim():'';
      const urlLink=partnerUrl&&/^https?:\/\//i.test(partnerUrl)?partnerUrl:`https://www.santanderimoveis.com.br/imoveis/${item.realEstatePropertyId}`;
      const bType=String(item.buildingType?.buildingTypeDescription||'Imóvel');
      const title=`${bType} Santander - ${neighborhood||city} (${city}/${state})`;
      const descText=cheerio.load(String(item.detailedDescription||item.description||'')).text().replace(/\s+/g,' ').trim();
      const cover=item.images?.find((img:any)=>img.isCoverImage)?.imageUrl||item.images?.[0]?.imageUrl||'';
      const matriculaDoc=item.documents?.find((d:any)=>/matr/i.test(d.documentUrl||''))?.documentUrl||'';
      const occupied=item.occupationStatus?.occupationStatusName==='ocupado'?true:item.occupationStatus?.occupationStatusName==='desocupado'?false:undefined;
      const base:ScrapedAuctionDraft={
        portalId:'santander',auctioneerName:'Santander Imóveis',title,address:address||`${neighborhood}, ${city} - ${state}`,neighborhood,city,state,
        propertyType:'Apartamento',sizeSqm,auctionPrice:price,estimatedValue:appraisal>0?appraisal:undefined,auctionDate,firstAuctionDate:auctionDate||undefined,
        firstAuctionPrice:price||undefined,auctionLink:urlLink,imageUrl:cover,description:descText||item.postalAddress?.fullAddress||title,
        saleMode:item.saleInformation?.saleType?.saleTypeDescription||'Leilão Extrajudicial Online',origin:'extrajudicial',sellerBank:'Santander',
        occupied,matriculaUrl:matriculaDoc||undefined,matriculaNumber:item.registrationNumber||undefined,registryOffice:item.generalRealEstateRegistry||undefined,
        originVerified:true,sourceVerified:true,locationScopeVerified:true,priceVerified:price>0,sizeVerified:sizeSqm>0,addressVerified:Boolean(address)
      };
      const parsed=parseOfficialLotDetail(base,{title,text:`${title}\n${address}\n${neighborhood}, ${city}/${state}\n${descText}`,image:cover,structuredAddresses:address?[address]:[],structuredSizes:sizeSqm>0?[sizeSqm]:[],documentLinks:matriculaDoc?[matriculaDoc]:[],officialFinancials:{auctionPrice:price,priceVerified:price>0,auctionDate,firstAuctionDate:auctionDate||undefined,firstAuctionPrice:price||undefined,estimatedValue:appraisal>0?appraisal:undefined}},urlLink);
      drafts.push({...parsed,city,state,neighborhood:neighborhood||parsed.neighborhood,sizeSqm:sizeSqm>0?sizeSqm:parsed.sizeSqm,sizeVerified:sizeSqm>0||parsed.sizeVerified,origin:'extrajudicial',originVerified:true,sourceVerified:true,sellerBank:'Santander'});
    }
    await onPage(drafts,records.length);
    if(!records.length)break;
    offset+=records.length;pageNum++;
  }
}

async function publicJson(url:string,body?:unknown){
 const r=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);
 const ct=r.headers.get('content-type')||'';
 const raw=await r.text();
 if(/Radware Captcha|Checking your browser/i.test(raw))throw Error(`Consulta bloqueada por desafio anti-bot (Radware) em ${url}`);
 if(!ct.includes('json')&&raw.trim().startsWith('<'))throw Error(`Resposta HTML inesperada em ${url}`);
 return JSON.parse(raw);
}
export async function collectRioLinks(dir:string,onPage:(links:Array<{url:string;text:string}>,total:number)=>Promise<void>,baseUrl='https://www.rioleiloes.com.br',prefix='rioleiloes'){
 const cleanBase=baseUrl.replace(/\/$/,'');
 const inventory=await publicJson(`${cleanBase}/core/api/get-leiloes`);
 fs.writeFileSync(path.join(dir,`${prefix}-events.json`),JSON.stringify(inventory));
 if(!Array.isArray(inventory.items))throw Error(`Inventário de leilões ${prefix} indisponível`);
 // The current endpoint returns all events. Do not claim coverage if pagination changes.
 const incomplete=Number(inventory.totalPages)>1;
 for(const event of inventory.items){
  if(!event.categorialeilao?.some((c:any)=>c.nm_categoria==='Imóveis'))continue;
  if(Array.isArray(event.uf)&&event.uf.length>0&&!event.uf.some((u:string)=>/^(?:RJ|MG)$/i.test(String(u||'').trim())))continue;
  const lots=await publicJson(`${cleanBase}/leilao/filtro-id/leilao_id/${event.id}?`);
  fs.writeFileSync(path.join(dir,`${prefix}-event-${event.id}.json`),JSON.stringify(lots));
  if(!Array.isArray(lots.lotes))throw Error(`Lotes indisponíveis para leilão ${event.id}`);
  await onPage(lots.lotes.map((lot:any)=>({url:`${cleanBase}/leilao/index/leilao_id/${event.id}/lote/${lot.lote_id}`,text:'Imóvel: '+event.nm})),lots.lotes.length);
 }
 if(incomplete)throw Error(`Inventário ${prefix} informou páginas adicionais; cobertura ainda não confirmada`);
}

/** Convert one official Pestana API lot into a source-verified auction draft. */
export function pestanaApiDraft(lot:any,event:any):ScrapedAuctionDraft|null {
 const location=sourceAuctionLocation(lot?.descricao||'');
 if(!location||!allowedSyncLocation(location.city,location.state))return null;
 const property=lot.bens?.[0];
 const description=(lot.bens||[]).flatMap((b:any)=>[b.descricao,b.observacao,...(b.caracteristicas||[]).map((c:any)=>c.valor)]).filter(Boolean).join('\n');
 const text=cheerio.load(description).text();
 const origin=property?.origem==='Judicial'?'judicial':'extrajudicial';
 const law=lot.informacoesLei9514,dates=event.informacoesLei9514;
 const displayedPrice=[lot.valorInicial,lot.lanceInicial,lot.lanceMinimo,lot.valorFiltro].map(Number).find(value=>Number.isFinite(value)&&value>0)||0;
 const rounds=law?.pertenceLei
  ?[{date:dateOnly(dates?.dataLeilao1||''),price:Number(law.valorLeilao1)},{date:dateOnly(dates?.dataLeilao2||''),price:Number(law.valorLeilao2)}]
  :[{date:dateOnly(event.data||''),price:displayedPrice}];
 const today=new Date().toISOString().slice(0,10);
 const next=rounds.filter(r=>r.date>=today&&r.price>0).sort((a,b)=>a.date.localeCompare(b.date))[0]||rounds.at(-1)!;
 const url=`https://www.pestanaleiloes.com.br/agenda-de-leiloes/${lot.leilao}/${lot.id}`;
 const base:ScrapedAuctionDraft={portalId:'pestana',auctioneerName:'Pestana Leilões',title:lot.descricao,...location,address:'',neighborhood:'',propertyType:'Apartamento',sizeSqm:0,auctionPrice:0,auctionDate:'',auctionLink:url,origin,locationScopeVerified:true};
 const draft=parseOfficialLotDetail(base,{title:lot.descricao,text,image:'',structuredAddresses:[],structuredSizes:[],documentLinks:[]},url);
 const originVerified=property?.origem==='Judicial'||Boolean(law?.pertenceLei)||/banco|santander|bradesco|ita[uú]|sicredi/i.test(event.nome||'');
 return {...draft,...location,origin,originVerified,sourceVerified:true,sourceClosed:lot.visivel===false||/retirado|vendido|arrematado|cancelado|suspenso/i.test(lot.status||''),auctionPrice:next.price||0,priceVerified:next.price>0,auctionDate:next.date,firstAuctionDate:rounds[0]?.date,secondAuctionDate:rounds[1]?.date,matriculaUrl:property?.documentos?.find((d:any)=>/matr[ií]cula/i.test(d.nome))?.link};
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
    const event=propertyEvents.find((e:any)=>e.id===lot.leilao);if(!event)continue;
    const draft=pestanaApiDraft(lot,event);if(draft)rows.push(draft);
   }
   await onPage(rows,cards.length);
   if(details.length!==targets.length)throw Error('Alguns detalhes Pestana não retornaram; conferir relatório');
  }else await onPage([],cards.length);
  if(cards.length!==requested.length)throw Error('Inventário Pestana não retornou todos os lotes anunciados');
 }
}

export function suporteLotToDraft(
  config: { id: string; name: string; baseUrl: string },
  lot: any
): ScrapedAuctionDraft | null {
  if (!lot) return null;
  const rawTitle = String(lot.nm_titulo_lote || lot.nm_lote || '').trim();
  const rawAuctionTitle = String(lot.nm_titulo_leilao || '').trim();
  if (/simula[cç][aã]o|teste/i.test(rawTitle) || /simula[cç][aã]o|teste/i.test(rawAuctionTitle)) return null;

  if (lot.imovel_id === null && (lot.veiculo_id || lot.equipamento_id)) return null;
  const subcatRaw = `${lot.nm_categoria || ''} ${lot.nm_subcategoria || ''}`.toLowerCase();
  if (/\b(?:ve[ií]culo|carro|moto|caminh[aã]o|sucata|m[oó]vel|m[aá]quina|equipamento|eletro|onibus)\b/i.test(subcatRaw) &&
      !/\b(?:im[oó]ve|casa|apartamento|terreno|sala|loja|galp[aã]o|ch[aá]cara|s[ií]tio)\b/i.test(subcatRaw)) {
    return null;
  }

  const city = String(lot.nm_cidade || '').trim();
  const state = String(lot.nm_estado || '').trim().toUpperCase();
  if (!allowedSyncLocation(city, state)) return null;

  const cleanBase = config.baseUrl.replace(/\/$/, '');
  const descHtml = String(lot.nm_descricao || '');
  const $ = cheerio.load(descHtml);
  const descText = $('body').text().replace(/\s+/g, ' ').trim();

  const title = rawTitle || descText.slice(0, 100);
  const rawLink = String(lot.nm_link || '').trim();
  let url = `${cleanBase}/leilao/index/leilao_id/${lot.leilao_id}/lote/${lot.lote_id}`;
  if (rawLink) {
    try { url = new URL(rawLink, cleanBase).href; } catch {}
  }

  let propertyType: 'Apartamento' | 'Casa' | 'Comercial' | 'Terreno' = 'Apartamento';
  const typeText = `${subcatRaw} ${title}`.toLowerCase();
  if (/\bcasa\b|\bsobrado\b/.test(typeText)) propertyType = 'Casa';
  else if (/\bterreno\b|\blote\b|\bch[aá]cara\b|\bs[ií]tio\b|\bfazenda\b|\bgleba\b/.test(typeText)) propertyType = 'Terreno';
  else if (/\bcomercial\b|\bsala\b|\bescrit[oó]rio\b|\bloja\b|\bgalp[aã]o\b|\bvaga\b|\bbox\b/.test(typeText)) propertyType = 'Comercial';

  const price = Number(lot.vl_lanceinicial || lot.vl_lanceminimo || lot.vl_venda || lot.vl_valor || 0);
  const secondPrice = Number(lot.vl_lanceinicialsegundoleilao || 0);
  const dateRaw = String(lot.dt_fechamento || lot.dt_abertura || '');
  const dateOnlyStr = dateRaw ? dateRaw.slice(0, 10) : '';

  const matriculaAnexo = (lot.anexos || []).find((a: any) => /matr[íi]cula/i.test(a.nm || ''));
  const matriculaUrl = matriculaAnexo?.nm_path_completo || '';
  const matriculaMatch = descText.match(/Matr[íi]cula\s+(?:n[ºo°]\s*)?([0-9.]+)/i);
  const matriculaNumber = matriculaMatch ? matriculaMatch[1].replace(/\./g, '') : undefined;

  const isOccupied = /OCUPA[CÇ][AÃ]O:\s*OCUPADO/i.test(descText) ? true : /DESOCUPADO/i.test(descText) ? false : undefined;
  const allowsInstallments = Number(lot.nu_parcelas || 0) > 1 || /pagamento parcelado|parcelamento|saldo restante poderá ser realizado em até/i.test(descText);
  const parcelasMatch = descText.match(/at[ée]\s*(\d+)\s*parcelas/i);
  const maxInstallments = Number(lot.nu_parcelas || 0) > 0 ? Number(lot.nu_parcelas) : (parcelasMatch ? Number(parcelasMatch[1]) : allowsInstallments ? 30 : 0);
  const entradaMatch = descText.match(/sinal(?:\s+correspondente\s+a)?\s*(\d+)%/i);
  const minDownpaymentPercent = Number(lot.vl_percentualentrada || 0) > 0 ? Number(lot.vl_percentualentrada) : (entradaMatch ? Number(entradaMatch[1]) : allowsInstallments ? 20 : 100);

  const addrMatch = descText.match(/situado\s+(?:na|no|à|ao)\s+([^,]+,\s*n[ºo°]?\s*[^,]+(?:,[^.]+)?)/i);
  const address = String(lot.nm_endereco || '').trim()
    || (addrMatch ? addrMatch[1].trim() : '')
    || extractAddress(`${title}\n${descText}`, '')
    || '';

  const bairroMatch = descText.match(/,\s*([A-ZÀ-ÿ\s]{3,30}),\s*(?:Rio de Janeiro|Niterói|Juiz de Fora)/i);
  const neighborhood = String(lot.nm_bairro || '').trim() || (bairroMatch ? bairroMatch[1].trim() : '');

  const rawImg = String(lot.fotos?.[0]?.nm_path_completo || lot.nm_foto_capa || lot.foto || '').trim();
  let imageUrl = rawImg;
  if (rawImg && !/^https?:\/\//i.test(rawImg)) {
    try { imageUrl = new URL(rawImg, cleanBase).href; } catch {}
  }

  const originText = String(lot.nm_statusleilao || lot.nm_tipo_leilao || rawAuctionTitle || descText).toLowerCase();
  const origin: 'extrajudicial' | 'judicial' = originText.includes('judicial') && !originText.includes('extrajudicial') ? 'judicial' : 'extrajudicial';

  const base: ScrapedAuctionDraft = {
    portalId: config.id,
    auctioneerName: config.name,
    title,
    address,
    neighborhood,
    city,
    state,
    propertyType,
    sizeSqm: 0,
    auctionPrice: price,
    firstAuctionPrice: price,
    secondAuctionPrice: secondPrice > 0 ? secondPrice : undefined,
    auctionDate: dateOnlyStr,
    firstAuctionDate: dateOnlyStr,
    auctionLink: url,
    imageUrl,
    description: descText,
    origin,
    originVerified: true,
    sourceVerified: true,
    locationScopeVerified: true,
    priceVerified: price > 0,
    occupied: isOccupied,
    allowsInstallments,
    maxInstallments,
    minDownpaymentPercent,
    matriculaUrl,
    matriculaNumber
  };

  const parsed = parseOfficialLotDetail(base, {
    title,
    text: descText,
    image: imageUrl,
    structuredAddresses: address ? [address] : [],
    structuredSizes: [],
    documentLinks: (lot.anexos || []).map((a: any) => ({ name: a.nm, url: a.nm_path_completo })),
    officialFinancials: {
      auctionPrice: price,
      priceVerified: price > 0,
      auctionDate: dateOnlyStr,
      firstAuctionPrice: price,
      firstAuctionDate: dateOnlyStr,
      ...(secondPrice > 0 ? { secondAuctionPrice: secondPrice } : {})
    }
  }, url, '', matriculaUrl);
  return {
    ...parsed,
    city,
    state,
    neighborhood: parsed.neighborhood || neighborhood,
    origin,
    originVerified: true,
    sourceVerified: true,
    locationScopeVerified: true,
    priceVerified: price > 0
  };
}

export function mariaFilomenaLotToDraft(lot: any): ScrapedAuctionDraft | null {
  return suporteLotToDraft(
    { id: 'mariafilomena', name: 'Leilões Maria Filomena', baseUrl: 'https://www.leiloesmariafilomena.com.br' },
    lot
  );
}

export async function collectSuporteApi(
  config: { id: string; name: string; baseUrl: string },
  dir: string,
  onPage: (rows: ScrapedAuctionDraft[], total: number) => Promise<void>,
  options?: { probeTimeoutMs?: number }
): Promise<boolean> {
  const candidates = [config.baseUrl.replace(/\/$/, '')];
  if (!candidates[0].includes('://www.')) {
    candidates.push(candidates[0].replace('://', '://www.'));
  }

  let activeBase = candidates[0];
  let categoria = '3';
  let firstData: any = null;

  const fetchCat = async (base: string, cat: string, pg: number, timeoutMs: number) => {
    const form = new URLSearchParams({ pg: String(pg), tipo: '', categoria: cat, estado: '', cidade: '' });
    const response = await fetch(`${base}/core/api/get-lotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': base,
      },
      body: form,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) return null;
    const txt = await response.text();
    if (!txt.trim().startsWith('{')) return null;
    return JSON.parse(txt);
  };

  for (const base of candidates) {
    const res = await fetchCat(base, '3', 1, options?.probeTimeoutMs ?? 8000).catch(() => null);
    if (res && Array.isArray(res.items)) {
      activeBase = base;
      firstData = res;
      break;
    }
  }
  if (!firstData || !Array.isArray(firstData.items)) return false;

  if (firstData.items.length === 0 && Number(firstData.totalPages || 0) === 0) {
    const allCat = await fetchCat(activeBase, '', 1, options?.probeTimeoutMs ?? 8000).catch(() => null);
    if (allCat && Array.isArray(allCat.items) && allCat.items.length > 0) {
      categoria = '';
      firstData = allCat;
    }
  }

  let page = 1;
  let totalPages = Math.min(50, Math.max(1, Number(firstData.totalPages) || 1));
  while (page <= totalPages) {
    const data = page === 1 ? firstData : await fetchCat(activeBase, categoria, page, 25000).catch(() => null);
    if (!data || !Array.isArray(data.items)) break;
    fs.writeFileSync(path.join(dir, `${config.id}-api-${page}.json`), JSON.stringify(data));
    totalPages = Math.min(50, Math.max(totalPages, Number(data.totalPages) || 1));
    const items = data.items;
    const drafts: ScrapedAuctionDraft[] = [];
    for (const lot of items) {
      const draft = suporteLotToDraft({ ...config, baseUrl: activeBase }, lot);
      if (draft) drafts.push(draft);
    }
    await onPage(drafts, items.length);
    if (!items.length) break;
    page++;
  }
  return true;
}

export async function collectDoulheTresLinks(
  baseUrl: string,
  timeoutMs = 6000
): Promise<Array<{ url: string; text: string }> | null> {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const tryUrl = async (b: string) => {
    const r = await fetch(`${b}/api-publica/stale/dados-home-lotes/imobiliario/categorias/imoveis`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? { base: b, items: j } : null;
  };
  let found = await tryUrl(cleanBase).catch(() => null);
  if (!found && !cleanBase.includes('://www.')) {
    found = await tryUrl(cleanBase.replace('://', '://www.')).catch(() => null);
  }
  if (!found) return null;
  const links: Array<{ url: string; text: string }> = [];
  for (const item of found.items) {
    if (!item?.id || !item?.id_leilao) continue;
    const title = String(item.titulo || item.leilao?.titulo || '').trim();
    const loc = sourceAuctionLocation(title);
    if (loc && !allowedSyncLocation(loc.city, loc.state)) continue;
    links.push({
      url: `${found.base}/leiloes/${item.id_leilao}/lotes/${item.id}`,
      text: `${title} R$ ${item.lance_inicial || item.lance_minimo || ''}`.trim()
    });
  }
  return links;
}

export async function collectMariaFilomenaApi(
  dir: string,
  onPage: (rows: ScrapedAuctionDraft[], total: number) => Promise<void>
) {
  await collectSuporteApi(
    { id: 'mariafilomena', name: 'Leilões Maria Filomena', baseUrl: 'https://www.leiloesmariafilomena.com.br' },
    dir,
    onPage,
    { probeTimeoutMs: 30000 }
  );
}

export async function collectSuaPlataformaApi(
  config: { id: string; name: string; baseUrl: string },
  dir: string,
  onPage: (rows: ScrapedAuctionDraft[], total: number) => Promise<void>,
  options?: { probeTimeoutMs?: number }
): Promise<boolean> {
  const cleanBase = config.baseUrl.replace(/\/$/, '');
  const candidates = [cleanBase];
  if (cleanBase.startsWith('https://') && !cleanBase.includes('://www.')) {
    candidates.push(cleanBase.replace('https://', 'https://www.'));
  }

  const timeoutMs = options?.probeTimeoutMs ?? 7000;
  let activeBase = '';
  let cookies = '';
  let token = '';

  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (!/ApiEngine|\/Core\/V1\/js\/Ajax\/Ajax_Leiloes|suaplataformadeleilao|TemplateGetLotes/i.test(html)) {
        return false;
      }
      activeBase = res.url ? new URL(res.url).origin : base;
      const setCookies = typeof (res.headers as any).getSetCookie === 'function'
        ? (res.headers as any).getSetCookie()
        : [res.headers.get('set-cookie')].filter(Boolean);
      cookies = setCookies.map((c: string) => c.split(';')[0]).filter(Boolean).join('; ');
      token = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/i)?.[1] || '';
      break;
    } catch {
      continue;
    }
  }
  if (!activeBase) return false;

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': `${activeBase}/busca/`,
    ...(cookies ? { Cookie: cookies } : {}),
    ...(token ? { __RequestVerificationToken: token } : {}),
  };

  const firstRes = await fetch(`${activeBase}/ApiEngine/GetLotes/1/100`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ Pagina: 1, QtdPorPagina: 100 }),
    signal: AbortSignal.timeout(15000)
  }).catch(() => null);
  if (!firstRes || !firstRes.ok) return false;
  let firstJson: any = null;
  try { firstJson = await firstRes.json(); } catch { return false; }
  if (!firstJson || !Array.isArray(firstJson.Lotes)) return false;

  const isPropertyRow = (lot: any) => {
    const label = `${lot.Categoria || ''} ${lot.SubCategoria || ''} ${lot.Lote || ''}`;
    if (/\b(?:ve[íi]culo|carro|moto|caminh[aã]o|[oô]nibus|sucata|trator|aeronave|embarca[cç][aã]o|eletro|mobili[aá]rio|joias?|vestu[aá]rio|honda|fiat|volkswagen|chevrolet|ford|toyota|hyundai|renault|scania|mercedes)\b/i.test(label) &&
        !/\b(?:im[oó]ve(?:l|is)|apartamento|apto|casa|terreno|galp[aã]o|pr[eé]dio|cobertura|sala|loja|residenc|comerc|urbano|rural)\b/i.test(label)) {
      return false;
    }
    return lot.IconeCategoria === 'casa' || /\b(?:residencia(?:l|is)|im[oó]ve(?:l|is)|apartamento|apto|casa|terreno|comercia(?:l|is)|sala|loja|pr[eé]dio|galp[aã]o|urbanos?|rurais?|rural|fazenda|s[ií]tio|ch[aá]cara|cobertura|sobrado|garagem)\b/i.test(label);
  };

  const parseIsoDate = (raw: any) => {
    const s = String(raw || '');
    if (!/^\d{4}-\d{2}-\d{2}/.test(s) || s.startsWith('1900-') || s.startsWith('0001-')) return '';
    return s.slice(0, 10);
  };

  const today = new Date().toISOString().slice(0, 10);
  for (let page = 1; page <= 20; page++) {
    const data = page === 1
      ? firstJson
      : await fetch(`${activeBase}/ApiEngine/GetLotes/${page}/100`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ Pagina: page, QtdPorPagina: 100 }),
          signal: AbortSignal.timeout(20000)
        }).then(r => r.ok ? r.json() : null).catch(() => null);
    const lotes: any[] = Array.isArray(data?.Lotes) ? data.Lotes : [];
    if (!lotes.length) break;
    fs.writeFileSync(path.join(dir, `${config.id}-dg-api-${page}.json`), JSON.stringify(data));

    let activeOnPage = 0;
    const drafts: ScrapedAuctionDraft[] = [];

    for (const lot of lotes) {
      const rt = (Array.isArray(lot.GetLoteRealTime) && lot.GetLoteRealTime[0]) || lot;
      const statusStr = `${rt.StatusLote || ''} ${rt.Lote_SubStatus || ''} ${rt.Lote_SubStatus_Label || ''}`.trim();
      const closed = /encerrad|arrematad|cancelad|suspens|sustad|finalizad|retirad|prejudicad/i.test(statusStr);
      const active = /aberto|andamento|em\s*breve|aguardando|proposta/i.test(statusStr) || (!closed && Number(lot.ID_Leiloes_Status) === 1);
      if (active && !closed) activeOnPage++;
      if (!active || closed || !isPropertyRow(lot)) continue;

      const locEvidence = `${lot.Lote || ''}\n${lot.Leilao || ''}\n${String(lot.URLlote || '').replace(/[/-]+/g, ' ')}`;
      const loc = sourceAuctionLocation(locEvidence);
      if (!loc || !allowedSyncLocation(loc.city, loc.state)) continue;

      const relUrl = String(lot.URLlote || `lote/imovel/${lot.ID_Leiloes_Lote}/`).replace(/^\//, '');
      const auctionLink = `${activeBase}/${relUrl}`;

      let descText = '';
      try {
        const infoRes = await fetch(`${activeBase}/ApiEngine/GetInfoLote/${lot.ID_Leiloes_Lote}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ID_Leiloes_Lote: lot.ID_Leiloes_Lote }),
          signal: AbortSignal.timeout(12000)
        });
        if (infoRes.ok) {
          const infoJson: any = await infoRes.json();
          const rawHtmlDesc = String(infoJson?.Lista?.[0]?.Descricao || '');
          if (rawHtmlDesc) {
            const $ = cheerio.load(rawHtmlDesc);
            $('br').replaceWith('\n');
            $('p,li,div,h1,h2,h3,h4,tr').each((_, el) => { $(el).append('\n'); });
            descText = $('body').text().replace(/[\t \u00a0]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
          }
        }
      } catch { /* fallback to listing fields */ }

      const p1 = Number(rt.ValorMinimoLancePrimeiraPraca || 0);
      const p2 = Number(rt.ValorMinimoLanceSegundaPraca || 0);
      const nextBid = Number(rt.ProximoLance || rt.ProximoLanceAVista || 0);
      const d1 = parseIsoDate(rt.DataHoraEncerramentoPrimeiraPraca || rt.DataHoraAberturaPrimeiraPraca);
      const d2 = parseIsoDate(rt.DataHoraEncerramentoSegundaPraca || rt.DataHoraAberturaSegundaPraca);
      const praca = Number(rt.PracaAtual || lot.PracaAtual || 1);
      const auctionPrice = praca === 2 && p2 > 0
        ? (nextBid > 0 ? nextBid : p2)
        : (d1 && d1 >= today && (nextBid || p1) > 0 ? (nextBid || p1) : (d2 && d2 >= today && p2 > 0 ? p2 : (nextBid || p1 || p2)));
      const auctionDate = praca === 2 && d2 ? d2 : (d1 && d1 >= today ? d1 : (d2 || d1 || ''));
      const evalVal = Number(rt.ValorAvaliacao || lot.ValorAvaliacao || 0);
      const modStr = String(lot.LabelModalidade || '').trim();
      const origin: 'extrajudicial' | 'judicial' = rt.IsExtraJudicial || /extrajudicial|venda direta|particular/i.test(modStr)
        ? 'extrajudicial'
        : (rt.IsJudicial || /judicial/i.test(modStr) ? 'judicial' : 'extrajudicial');

      const combinedText = [
        modStr || (origin === 'judicial' ? 'Judicial' : 'Extrajudicial'),
        lot.Leilao ? `${lot.Leilao}` : '',
        lot.Lote ? `${lot.Lote}` : '',
        lot.Comitente ? `Comitente: ${lot.Comitente}` : '',
        lot.NumeroProcesso ? `Processo: ${lot.NumeroProcesso}` : '',
        lot.Vara ? `${lot.Vara}` : '',
        p1 > 0 ? `1º Leilão: ${d1 ? d1.split('-').reverse().join('/') + ' - ' : ''}R$ ${p1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
        p2 > 0 ? `2º Leilão: ${d2 ? d2.split('-').reverse().join('/') + ' - ' : ''}R$ ${p2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
        descText
      ].filter(Boolean).join('\n');

      const fotoName = Array.isArray(lot.Fotos) && lot.Fotos[0]?.Foto ? String(lot.Fotos[0].Foto) : '';
      const imageUrl = fotoName ? `${activeBase}/imagens-complete/605x487/${fotoName}` : '';
      const rawAddress = extractAddress(combinedText, '');

      const baseDraft: ScrapedAuctionDraft = {
        portalId: config.id,
        auctioneerName: config.name,
        title: String(lot.Lote || lot.Leilao || 'Imóvel em Leilão').trim(),
        address: rawAddress,
        neighborhood: '',
        city: loc.city,
        state: loc.state,
        propertyType: 'Apartamento',
        sizeSqm: 0,
        auctionPrice,
        auctionDate,
        auctionLink,
        imageUrl,
        description: combinedText.slice(0, 12000),
        origin,
        originVerified: Boolean(modStr || lot.NumeroProcesso || rt.IsJudicial || rt.IsExtraJudicial),
        sourceVerified: true,
        locationScopeVerified: true,
        priceVerified: auctionPrice > 0,
        ...(evalVal > 0 ? { estimatedValue: evalVal } : {}),
        ...(p1 > 0 ? { firstAuctionPrice: p1 } : {}),
        ...(p2 > 0 ? { secondAuctionPrice: p2 } : {}),
        ...(d1 ? { firstAuctionDate: d1 } : {}),
        ...(d2 ? { secondAuctionDate: d2 } : {}),
      };

      const parsed = parseOfficialLotDetail(baseDraft, {
        text: combinedText,
        title: baseDraft.title,
        image: imageUrl,
        structuredAddresses: rawAddress ? [rawAddress] : [],
        structuredSizes: [],
        officialFinancials: {
          ...(auctionPrice > 0 ? { auctionPrice, priceVerified: true } : {}),
          ...(evalVal > 0 ? { estimatedValue: evalVal } : {}),
          ...(auctionDate ? { auctionDate } : {}),
          ...(d1 ? { firstAuctionDate: d1 } : {}),
          ...(d2 ? { secondAuctionDate: d2 } : {}),
          ...(p1 > 0 ? { firstAuctionPrice: p1 } : {}),
          ...(p2 > 0 ? { secondAuctionPrice: p2 } : {}),
        },
        availability: {
          url: auctionLink,
          checkedAt: new Date().toISOString(),
          state: 'active',
          status: 'ativo',
          reason: 'Ativo na API oficial SuaPlataformaDeLeilao'
        }
      }, auctionLink);

      drafts.push({
        ...parsed,
        origin,
        originVerified: true,
        ...(rt.IsVendaDireta ? { saleMode: 'Venda Direta' } : {})
      });
    }

    await onPage(drafts, lotes.length);
    if (activeOnPage === 0) break;
  }

  return true;
}

