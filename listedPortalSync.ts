import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { AUCTIONEER_PORTALS, canonicalAuctionLink, parseOfficialLotDetail, extractAddress, type ScrapedAuctionDraft } from './auctioneerSyncService.ts';
import { SYNC_SOURCE_IDS, SYNC_TARGETS, allowedSyncLocation, normalizeAuctionText as norm } from './src/utils/auctionSyncScope.ts';
import { sourceAuctionLocation } from './src/utils/auctionGeography.ts';
import { collectBankApi, collectSoldApi, collectPestanaApi, collectRioLinks } from './listedPortalApis.ts';

export interface PortalRun {
 id: string; name: string; status: 'queued'|'running'|'completed'|'partial'|'failed';
 pages: number; discovered: number; fetched: number; accepted: number; imported: number; updated: number; pending: number;
 errors: Array<{url:string;message:string}>; startedAt?:string; finishedAt?:string;
}
export interface FullSyncReport {
 id:string; status:'running'|'completed'|'partial'|'failed'|'interrupted'; reason:string; startedAt:string; finishedAt?:string;
 sources:PortalRun[]; targets:typeof SYNC_TARGETS;
}
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const propertyWords=/\b(?:imoveis|imovel|apartamento|apto|casa|terreno|galpao|predio|cobertura|sala|loja|fazenda|gleba)\b/;
const directPattern=/\/(?:item|lote|imovel|oferta|anuncio\/detalhe)\/|\/(?:detalhe|lote|Leilao_Lote)\.(?:php|asp)\?|\/sale\/detail\?|\/imoveis\/[^?#]+-\w*\d{4,}|\/leiloes\/bens-imoveis[^?#]*\/\d+/i;
const navigationPattern=/\/(?:eventos\/leilao|leilao|leiloes|lotes)(?:\/|\?|$)|\/(?:busca|buscador|imoveis|auctions|thumbs\.php|Principal\.asp)(?:\?|$)/i;
const skipPattern=/login|entrar|cadastro|contato|politica|privacidade|termos|blog|noticia|artigo|realizados|encerrados|finalizados|editais|\.pdf(?:\?|$)/i;
const bankIds=new Set(['bb','emgea','santander','vitrinebradesco']);
const portalConfigs=SYNC_SOURCE_IDS.map(id=>AUCTIONEER_PORTALS.find(p=>p.id===id)!).filter(Boolean);
const sameHost=(a:string,b:string)=>new URL(a).hostname.replace(/^www\./,'')===new URL(b).hostname.replace(/^www\./,'');
function separatedTargetLocation(text:string){
 const normalized=norm(text);const matches=SYNC_TARGETS.filter(t=>new RegExp(`\\b${norm(t.city)}\\b`).test(normalized)&&new RegExp(`\\b${t.state.toLowerCase()}\\b`).test(normalized));
 return matches.length===1?{city:matches[0].city,state:matches[0].state}:null;
}
export function sourceSeedUrls(id:string, base:string):string[] {
 const cityUrls=(fn:(t:typeof SYNC_TARGETS[number])=>string)=>SYNC_TARGETS.map(fn);
 if(id==='leilaoimovel')return [base+'/leilao-de-imoveis/rj',base+'/leilao-de-imoveis/mg'];
 if(id==='megaleiloes')return cityUrls(t=>`${base}/imoveis/${t.state.toLowerCase()}/${t.slug}`);
 if(id==='biasi')return cityUrls(t=>`${base}/Sale/LotListSearch?start=0&limit=48&buscaImovel=true&estado=${t.state.toLowerCase()}&cidade=${t.slug}&bairro=todos-os-bairros&segmento=todos-os-segmentos`);
 if(id==='leiloei')return [base+'/busca/segmento/imoveis'];
 if(id==='pestana')return [base+'/leilao-de-imoveis'];
 if(id==='frazao')return cityUrls(t=>`${base}/sale/searchLot?estado=${t.state}&cidade=${encodeURIComponent(t.city)}&pesquisaSimples=false`);
 if(id==='portalzuk')return cityUrls(t=>`${base}/leilao-de-imoveis/c/todos-imoveis/${t.state.toLowerCase()}/regiao/${t.slug}`);
 if(['jv','joaoemilio'].includes(id))return cityUrls(t=>`${base}/lotes/imovel?tipo=imovel&address_uf=${t.state}&address_cidade_ibge=${t.ibge}`);
 if(id==='santander')return cityUrls(t=>`${base}/?cidade=${encodeURIComponent(t.city)}&uf=${t.state}&pag=1`);
 if(id==='silas')return [base+'/Principal.asp?at=jd',base+'/Principal.asp?at=ex'];
 if(id==='onildo')return [base+'/Principal.asp'];
 if(id==='schulmann')return [base+'/thumbs.php?tipo=leiloes-online'];
 if(id==='paulobotelho')return [base+'/lotes/imoveis?page=1',base];
 if(id==='rioleiloes')return [base+'/leilao/index/imoveis'];
 const config=portalConfigs.find(p=>p.id===id)!;
 return [config.searchUrl||base];
}
export function parseSourcePage(html:string,url:string) {
 const $=cheerio.load(html);
 const literal=(name:string)=>{try{return JSON.parse(html.match(new RegExp('(?:var|let|const) '+name+' = (\\{[^\\n]+\\});'))?.[1]||'null');}catch{return null;}};
 const lotData=literal('lote'),eventData=literal('leilao');
 const links:Array<{url:string;text:string;pagination:boolean}>=[];
 $('a[href]').each((_,el)=>{
  const raw=$(el).attr('href')||'';if(!raw||raw.startsWith('#'))return;
  try{const u=new URL(raw,url);if(!/^https?:$/.test(u.protocol))return;
   const container=$(el).closest('article,[class*="card"],[class*="lote"],[class*="oferta"],li');
   const text=(container.length?container.text():$(el).parent().text()).replace(/\s+/g,' ').trim();
   links.push({url:canonicalAuctionLink(u.href),text:text.slice(0,3500),pagination:$(el).attr('rel')==='next'||$(el).closest('[class*="pagin"], [aria-label*="pagin"]').length>0||/^(?:proxima?|próxima?|next|›|»|\d+)$/i.test($(el).text().trim())});
  }catch{}
 });
 // Legacy sites expose links in literal window.open/location assignments.
 $('[onclick]').each((_,el)=>{
  const onclick=$(el).attr('onclick')||'';
  const legacy=onclick.match(/abrirDetalhesLeilao\(['"](\d+)['"]\)/i);
  if(legacy)links.push({url:new URL('Leilao.asp?zz='+legacy[1],url).href,text:$(el).parent().text().trim(),pagination:false});
  const legacyLot=onclick.match(/acessarAuditorio\(['"](\d+)['"]/i);
  if(legacyLot)links.push({url:new URL('Leilao_Lote.asp?zz='+legacyLot[1],url).href,text:$(el).closest('[id^=divLote]').text().trim(),pagination:false});
  const paging=onclick.match(/^pagina\((\d+)\)/i);
  if(paging){const u=new URL(url);u.searchParams.set('pag',paging[1]);links.push({url:u.href,text:paging[1],pagination:true});}
  for(const match of onclick.matchAll(/['"]([^'"]+\.(?:asp|php)(?:\?[^'"]*)?)['"]/gi)){
   try{links.push({url:canonicalAuctionLink(new URL(match[1],url).href),text:$(el).text().trim(),pagination:false});}catch{}
  }
 });
 const apiList=$('#leilao-lista-lote');
 if(apiList.length&&/LotListSearch/i.test(url)){const start=Number(apiList.attr('index')),limit=Number(apiList.attr('limit')),total=Number(apiList.attr('total'));if(limit>0&&start+limit<total){const next=new URL(url);next.searchParams.set('start',String(start+limit));links.push({url:next.href,text:'Próxima página',pagination:true});}}
 const structuredAddresses:string[]=[];const structuredSizes:number[]=[];
 $('script[type="application/ld+json"]').each((_,el)=>{try{const visit=(x:any)=>{if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(visit);return;}if(/Product|Residence|Apartment|House|RealEstateListing/i.test(String(x['@type']))){if(x.address)structuredAddresses.push(typeof x.address==='string'?x.address:[x.address.streetAddress,x.address.addressLocality,x.address.addressRegion].filter(Boolean).join(', '));const n=Number(x.floorSize?.value);if(n>0)structuredSizes.push(n);}Object.values(x).forEach(visit);};visit(JSON.parse($(el).text()));}catch{}});
 const image=$('meta[property="og:image"]').attr('content')||'';
 const documentLinks=$('a[href]').map((_,el)=>{const href=$(el).attr('href')||'';return /matr[ií]cula|edital/i.test($(el).text())||/\.pdf(?:\?|$)/i.test(href)?new URL(href,url).href:'';}).get().filter(Boolean);
 $('script,style,noscript,header,footer,nav,aside,[class*="related"],[class*="recommend"],[id*="Modal"],[id*="PolPriv"],[id*="Login"],[id*="Rodape"],.modal').remove();
 $('br').replaceWith('\n');$('p,div,h1,h2,h3,h4,li,tr,dt,dd').each((_,el)=>{$(el).append('\n');});
 const title=$('#divDescrLoteTexto').text().trim()||$('h1,h2,h3,h4').map((_,el)=>$(el).text().trim()).get().find(t=>propertyWords.test(norm(t)))||$('h1').first().text().trim()||$('title').text().trim();
 let text=$('body').text().replace(/[\t \u00a0]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
 if($('#divDescrLoteTexto').length)text=$('#divVisao1').text().replace(/\s+/g,' ').trim();
 if(lotData?.descricao){const description=cheerio.load(lotData.descricao).text();text=[eventData?.judicial===true?'Judicial':eventData?.judicial===false?'Extrajudicial':'',description,text].join('\n');}
 return {links,text,title:lotData?.titulo||title,image,structuredAddresses,structuredSizes,documentLinks,lotDescription:lotData?.descricao?cheerio.load(lotData.descricao).text():''};
}

export async function runListedPortalSync(reason:string,onDrafts:(rows:ScrapedAuctionDraft[],source:PortalRun)=>Promise<{imported:number;updated:number;pending:number}>, options:{ids?:string[]}={}) {
 const configs=portalConfigs.filter(p=>!options.ids||options.ids.includes(p.id));
 const report:FullSyncReport={id:new Date().toISOString().replace(/[:.]/g,'-'),status:'running',reason,startedAt:new Date().toISOString(),targets:SYNC_TARGETS,sources:configs.map(p=>({id:p.id,name:p.name,status:'queued',pages:0,discovered:0,fetched:0,accepted:0,imported:0,updated:0,pending:0,errors:[]}))};
 const dir=path.join('sync-audits','runs',report.id);fs.mkdirSync(dir,{recursive:true});
 const save=()=>{fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync('sync-audits/latest-listed-sync.json',JSON.stringify(report,null,2));};save();
 let browserPromise:Promise<any>|null=null;
 const rendered=async(url:string)=>{
  browserPromise ||= puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const browser=await browserPromise;const page=await browser.newPage();
  try{await page.setUserAgent(UA);const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});if(r&&r.status()>=400)throw Error(`HTTP ${r.status()}`);await page.waitForNetworkIdle({idleTime:600,timeout:10000}).catch(()=>{});const html=await page.content();if(/<title>Just a moment|Access Denied/i.test(html))throw Error('Acesso bloqueado pela fonte');return {html,url:page.url()};}finally{await page.close().catch(()=>{});}
 };
 const load=async(url:string,render=false)=>{
  if(render)return rendered(url);
  const parsedUrl=new URL(url);const legacyPage=/Principal\.asp/i.test(parsedUrl.pathname)&&parsedUrl.searchParams.has('pag');const postFields=legacyPage?new URLSearchParams({pag:parsedUrl.searchParams.get('pag')!,acaoDest:'',pesq:''}):undefined;
  const r=await fetch(url,{method:legacyPage?'POST':'GET',body:postFields,headers:{'User-Agent':UA,'Accept':'text/html,application/xhtml+xml','Accept-Language':'pt-BR,pt;q=0.9'},signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error(`HTTP ${r.status}`);
  const bytes=await r.arrayBuffer();const charset=r.headers.get('content-type')?.match(/charset=([^;]+)/i)?.[1]||new TextDecoder().decode(bytes.slice(0,3000)).match(/charset=["']?([a-zA-Z0-9-]+)/i)?.[1]||'utf-8';
  return {html:new TextDecoder(charset).decode(bytes),url:r.url};
 };
 let cursor=0;
 const worker=async()=>{while(cursor<configs.length){const index=cursor++;const config=configs[index];const progress=report.sources[index];progress.status='running';progress.startedAt=new Date().toISOString();save();console.log(`[Listed Sync] ${config.name}: iniciando`);
  const listingQueue=sourceSeedUrls(config.id,config.baseUrl.replace(/\/$/,''));const seenPages=new Set<string>();const details=new Map<string,string>();const seenDetails=new Set<string>();const batches:ScrapedAuctionDraft[]=[];
  let renderedOnce=false;let navigated=false;const pageSignatures=new Set<string>();let confirmedEmpty=false;
  const flush=async()=>{if(!batches.length)return;const rows=batches.splice(0);fs.appendFileSync(path.join(dir,config.id+'.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');const counts=await onDrafts(rows,progress);progress.imported+=counts.imported;progress.updated+=counts.updated;progress.pending+=counts.pending;save();};
  try{
   if(['emgea','vitrinebradesco','pestana'].includes(config.id)){
    const onPage=async(rows:ScrapedAuctionDraft[],total:number)=>{navigated=true;progress.pages++;progress.discovered+=total;progress.fetched+=total;progress.accepted+=rows.length;batches.push(...rows);await flush();save();};
    if(config.id==='pestana')await collectPestanaApi(dir,onPage);else await collectBankApi(config.id,dir,onPage);
    progress.status='completed';continue;
   }
   if(config.id==='sold'){
    await collectSoldApi(dir,async(links)=>{navigated=true;progress.pages++;for(const link of links)details.set(link.url,link.text);progress.discovered=details.size;save();});
   }
   if(config.id==='rioleiloes')await collectRioLinks(dir,async(links)=>{navigated=true;progress.pages++;for(const link of links)details.set(link.url,link.text);progress.discovered=details.size;save();});
   while(listingQueue.length){const requested=listingQueue.shift()!;const key=canonicalAuctionLink(requested);if(seenPages.has(key)||seenDetails.has(key))continue;seenPages.add(key);
    try{
     let response;try{response=await load(requested);}catch(error){if(renderedOnce)throw error;renderedOnce=true;response=await load(requested,true);}
     let page=parseSourcePage(response.html,response.url);
     if(!page.links.some(link=>directPattern.test(link.url))&&!renderedOnce&&!/LotListSearch/i.test(requested)){renderedOnce=true;response=await load(requested,true);page=parseSourcePage(response.html,response.url);}
     progress.pages++;navigated=true;
     if(/nenhum (?:im[oó]vel|lote|resultado)|n[aã]o (?:foram encontrados|temos leil[oõ]es ativos)/i.test(page.text))confirmedEmpty=true;
     const signature=page.links.filter(link=>directPattern.test(link.url)).map(link=>link.url).sort().join('|');
     if(signature&&pageSignatures.has(signature)){progress.errors.push({url:requested,message:'Paginação repetiu os mesmos lotes; cobertura não confirmada.'});continue;}if(signature)pageSignatures.add(signature);
     fs.writeFileSync(path.join(dir,config.id+'-listing-'+progress.pages+'.html'),response.html);
     for(const link of page.links){if(!sameHost(link.url,response.url)||skipPattern.test(link.url))continue;
      const location=sourceAuctionLocation(link.text);if(location&&!allowedSyncLocation(location.city,location.state))continue;
      const relevant=propertyWords.test(norm(link.text))||/imoveis|imovel|tipo=imovel|categoria=2/i.test(link.url);
      if(directPattern.test(link.url)&&!link.pagination){if(relevant&&!seenDetails.has(link.url))details.set(link.url,link.text);continue;}
      if(link.pagination||((navigationPattern.test(link.url)||/\/Leilao\.asp\?|\/leilao-de-imoveis\/(?:rj|mg)(?:\/|$)/i.test(link.url))&&relevant)){
       // A municipality-filtered result may paginate, but must not drop its filter via a "clear" link.
       const current=new URL(response.url),next=new URL(link.url);
       if(current.searchParams.has('address_cidade_ibge')&&next.pathname===current.pathname&&!next.searchParams.has('address_cidade_ibge'))continue;
       if(!seenPages.has(link.url)&&!listingQueue.includes(link.url))listingQueue.push(link.url);
      }
     }
     progress.discovered=details.size;save();
    }catch(error:any){progress.errors.push({url:requested,message:error.message});save();}
    // Flush after each listing so a slow source never holds every result in memory.
    const pending=[...details].filter(([url])=>!seenDetails.has(url));
    for(const [url,listingText] of pending){seenDetails.add(url);
     try{let response;try{response=await load(url);}catch{response=await load(url,true);}let page=parseSourcePage(response.html,response.url);progress.fetched++;
      if(config.id==='rioleiloes'||config.id==='sold'){response=await load(url,true);page=parseSourcePage(response.html,response.url);}
      if(page.text.length<80)throw Error('Detalhe sem conteúdo verificável');
      const location=sourceAuctionLocation(page.title)||sourceAuctionLocation(extractAddress(page.text,''))||sourceAuctionLocation(page.lotDescription)||separatedTargetLocation(page.lotDescription)||sourceAuctionLocation(page.text)||sourceAuctionLocation(listingText);
      if(!location||!allowedSyncLocation(location.city,location.state)){progress.errors.push({url,message:location?'Imóvel fora das três cidades solicitadas':'Localização do imóvel não confirmada no detalhe'});continue;}
      if(!propertyWords.test(norm(page.title+' '+page.text)))continue;
      const initial:ScrapedAuctionDraft={portalId:config.id,auctioneerName:config.name,title:page.title,address:'',neighborhood:'',city:location.city,state:location.state,propertyType:'Apartamento',sizeSqm:0,auctionPrice:0,auctionDate:'',auctionLink:canonicalAuctionLink(response.url),description:page.text,origin:bankIds.has(config.id)?'extrajudicial':'judicial',locationScopeVerified:true};
      const draft=parseOfficialLotDetail(initial,page,response.url);
      if(bankIds.has(config.id)){draft.origin='extrajudicial';draft.originVerified=true;draft.sellerBank=config.name;}
      if(!draft.originVerified&&/(?:leilao|modalidade|natureza|tipo)\s*:?\s*judicial\b/.test(norm(page.text))){draft.origin='judicial';draft.originVerified=true;}
      if(!draft.city||!allowedSyncLocation(draft.city,draft.state)){progress.errors.push({url,message:'Localização não confirmada na descrição oficial'});continue;}
      const registryLink=page.documentLinks.find(link=>/matricula|certidao/i.test(link));if(registryLink)draft.matriculaUrl=registryLink;
      batches.push(draft);progress.accepted++;if(batches.length>=10)await flush();
     }catch(error:any){progress.errors.push({url,message:error.message});}
    }
    await flush();save();
   }
   if(!progress.discovered&&!confirmedEmpty)progress.errors.push({url:config.baseUrl,message:'Nenhum lote identificado; a ausência de ofertas não foi confirmada.'});
   progress.status=progress.errors.length?(navigated?'partial':'failed'):'completed';
  }catch(error:any){progress.errors.push({url:config.baseUrl,message:error.message});progress.status='failed';}
  finally{await flush();progress.finishedAt=new Date().toISOString();save();console.log(`[Listed Sync] ${config.name}: ${progress.status}; ${progress.discovered} descobertos, ${progress.accepted} na região, ${progress.imported} novos`);}
 }};
 try{await Promise.all(Array.from({length:3},worker));report.status=report.sources.every(s=>s.status==='completed')?'completed':'partial';}
 catch(error){report.status='failed';throw error;}
 finally{if(browserPromise){const browser=await browserPromise.catch(()=>null);if(browser)await browser.close().catch(()=>{});}report.finishedAt=new Date().toISOString();save();}
 return report;
}
