import { preserveSource } from './auctionPipeline/quarantine.ts';
import { assessAvailability } from './auctionAvailability.ts';
import fs from 'node:fs';
import { officialLotFinancials } from './officialLotPayload.ts';
import path from 'node:path';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { launchPuppeteer } from './src/utils/puppeteerConfig.ts';
import { AUCTIONEER_PORTALS, canonicalAuctionLink, parseOfficialLotDetail, extractAddress, scrapeMegaLeiloes, type ScrapedAuctionDraft } from './auctioneerSyncService.ts';
import { SYNC_SOURCE_IDS, SYNC_TARGETS, allowedSyncLocation, normalizeAuctionText as norm } from './src/utils/auctionSyncScope.ts';
import { sourceAuctionLocation, sourceNeighborhoodLocation, sourceTargetCityLocation } from './src/utils/auctionGeography.ts';
import { CITY_ZONES } from './src/utils/cityZones.ts';
import { collectBankApi, collectSoldApi, collectPestanaApi, collectRioLinks, collectMariaFilomenaApi, collectSuporteApi, collectDoulheTresLinks, collectSuperbidOffers, collectSantanderApi } from './listedPortalApis.ts';
import { scrapeLeilaoImovel } from './scrapers/leilaoImovelScraper.ts';

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
const propertyWords=/\b(?:imoveis|imovel|apartamento|apto|casa|terreno|galpao|predio|cobertura|sala|loja|fazenda|gleba|chacara|sitio|sobrado|kitnet|residencial|duplex)\b/;
const directPattern=/\/(?:item|lote|lotes\/\d+|imovel|ofertas?|anuncio\/detalhe|evento\/anuncio|leilao_imoveis|externo\/leilao|produto|bens?|detalhes-lote|auditorio)\/|\/Leiloes\/LoteDetalhes(?:\?|\/)|\/Sale\/Lot\/|\/(?:detalhe|lote|loteVendaDireta|Leilao_Lote|peca)\.(?:php|asp)\?|\/sale\/detail\?|[?&]acao=evento&[^#]*\blote=|\/leilao\/index\/leilao_id\/\d+\/lote\/\d+|\/leilao\/\d+\/lote|\/leilao\/lote\/\d+|\/leiloes\/\d+\/lotes?\/\d+|\/auctions\/\d+\/lot\/\d+|\/imoveis\/\d+-|\/imoveis\/[^?#]+-\w*\d{4,}|\/imovel\/(?:[^/?#]+\/){2,}[^?#]*-\d{4,}|\/leiloes\/bens-imoveis[^?#]*\/\d+|\/(?:lote|imovel)-\d+/i;
const navigationPattern=/\/(?:eventos\/leilao|leilao|leiloes|lotes|categorias\/imoveis|categoria-produto\/imoveis|leiloes-imoveis|Leiloes\/Pesquisar|agenda|pesquisa|navegar-pelo-mapa|thumbs\.php|Principal\.asp)(?:\/|\?|$)|\/(?:busca|buscador|imoveis|imovel|auctions)(?:\/|\?|$)|\/leilao\.php\?|\/leilao\/\d+\//i;
const skipPattern=/login|entrar|cadastro|contato|politica|privacidade|termos|blog|noticia|artigo|realizados|encerrados|finalizados|editais|fale-conosco|quem-somos|como-comprar|como-vender|indique|validar-documento|habilitacao|regulamento|duvidas|faq|\/home(?:\/|$)|\/venda-direta(?:\/|$)|\/auditorio\/\d+\/\d+\/batch|\.pdf(?:\?|$)/i;
const bankIds=new Set(['bb','emgea','santander','vitrinebradesco']);
const isBlockedLeilaoImovelResponse=(portalId:string,error:unknown)=>portalId==='leilaoimovel'&&/HTTP\s+403\b/i.test(error instanceof Error?error.message:String(error));
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const HIGH_PRIORITY_IDS = new Set([
  'megaleiloes', 'portalzuk', 'frazao', 'biasi', 'sold', 'pestana',
  'santander', 'emgea', 'vitrinebradesco', 'rioleiloes', 'mariafilomena',
  'rogeriomenezes', 'isaias', 'leilaoimovel', 'superbid'
]);
const portalConfigs = (() => {
  const byDomain = new Map<string, (typeof AUCTIONEER_PORTALS)[number] & { nexusImoveis?: number; nexusSituacao?: string }>();
  for (const p of AUCTIONEER_PORTALS) {
    if (!p.enabled) continue;
    const dom = (p.domain || '').replace(/^www\./i, '').toLowerCase();
    const prev = byDomain.get(dom);
    if (!prev) {
      byDomain.set(dom, { ...p });
    } else {
      byDomain.set(dom, {
        ...prev,
        ...(!prev.searchUrl && p.searchUrl ? { searchUrl: p.searchUrl } : {}),
        ...(p.suporteApi ? { suporteApi: true } : {}),
        ...(p.nexusImoveis && !prev.nexusImoveis ? { nexusImoveis: p.nexusImoveis } : {}),
        ...(p.nexusSituacao && !prev.nexusSituacao ? { nexusSituacao: p.nexusSituacao } : {}),
      });
    }
  }
  const rank = (p: any) =>
    HIGH_PRIORITY_IDS.has(p.id) ? 0
    : p.nexusSituacao === 'com_imoveis' ? 1
    : p.suporteApi || p.nexusSituacao === 'agregador' || p.nexusSituacao === 'em_atualizacao' || !p.nexusSituacao ? 2
    : p.nexusSituacao === 'outro_site' ? 3
    : 4;
  return [...byDomain.values()].sort((a: any, b: any) => rank(a) - rank(b) || (b.nexusImoveis || 0) - (a.nexusImoveis || 0) || a.name.localeCompare(b.name, 'pt-BR'));
})();
const sameHost=(a:string,b:string)=>new URL(a).hostname.replace(/^www\./,'')===new URL(b).hostname.replace(/^www\./,'');
const sameHostOrAlias=(linkUrl:string,responseUrl:string,config?:typeof portalConfigs[number])=>{
 if(sameHost(linkUrl,responseUrl))return true;
 try{
  const linkHost=new URL(linkUrl).hostname.replace(/^www\./,'').toLowerCase();
  const allowed=[config?.domain,...(config?.aliasDomains||[])].filter(Boolean).map(d=>d!.replace(/^www\./,'').toLowerCase());
  return allowed.some(d=>linkHost===d||linkHost.endsWith('.'+d));
 }catch{return false;}
};
const officialPortalForUrl=(url:string)=>{
 try{
  const host=new URL(url).hostname.replace(/^www\./,'').toLowerCase();
  return AUCTIONEER_PORTALS.find(portal=>{
   const domains=[portal.domain,...(portal.aliasDomains||[])].map(d=>d.replace(/^www\./,'').toLowerCase());
   return domains.some(domain=>host===domain||host.endsWith('.'+domain));
  });
 }catch{return undefined;}
};
function resolveRioNeighborhoodFallback(evidenceText:string,fullPageText:string){
 const pageNorm=norm(fullPageText);
 if(!/\b(?:tjrj|trt1|rio de janeiro|rj|niteroi)\b/.test(pageNorm))return null;
 const evNorm=norm(evidenceText);
 const candidates=['rio de janeiro','niteroi'].filter(cityKey=>{
  const zones=CITY_ZONES[cityKey]||[];
  return zones.some(zone=>zone.neighborhoods.some(name=>{
   const nbNorm=norm(name);
   return nbNorm.length>=5 && new RegExp(`(?:^|[^a-z])${nbNorm.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=$|[^a-z])`).test(evNorm);
  }));
 });
 if(candidates.length!==1)return null;
 return {city:candidates[0]==='niteroi'?'Niterói':'Rio de Janeiro',state:'RJ'};
}
export function isWithinMegaScope(url:string,detail:boolean){
 const pathname=new URL(url).pathname.replace(/\/$/,'');
 if(!detail)return SYNC_TARGETS.some(t=>pathname===`/imoveis/${t.state.toLowerCase()}/${t.slug}`);
 const match=pathname.match(/^\/imoveis\/(?:[^/]+\/)?([a-z]{2})\/([^/]+)/i);
 return !match||SYNC_TARGETS.some(t=>t.state.toLowerCase()===match[1].toLowerCase()&&t.slug===match[2]);
}
function separatedTargetLocation(text:string){
 const normalized=norm(text);const matches=SYNC_TARGETS.filter(t=>new RegExp(`\\b${norm(t.city)}\\b`).test(normalized)&&new RegExp(`\\b${t.state.toLowerCase()}\\b`).test(normalized));
 return matches.length===1?{city:matches[0].city,state:matches[0].state}:null;
}
function urlLocation(rawUrl:string){try{const u=new URL(rawUrl),full=norm(decodeURIComponent(u.pathname+' '+u.search));if(/(?:^|[\/\-_\s])rj(?:[\/\-_\s])+(?:[a-z]+\/)?rio de janeiro\b|\brio de janeiro rj\b/.test(full))return {city:'Rio de Janeiro',state:'RJ'};if(/(?:^|[\/\-_\s])rj(?:[\/\-_\s])+(?:[a-z]+\/)?niteroi\b|\bniteroi rj\b/.test(full))return {city:'Niterói',state:'RJ'};if(/(?:^|[\/\-_\s])mg(?:[\/\-_\s])+(?:[a-z]+\/)?juiz de fora\b|\bjuiz de fora mg\b/.test(full))return {city:'Juiz de Fora',state:'MG'};}catch{}return null;}
export function sourceSeedUrls(id:string, base:string):string[] {
 const cityUrls=(fn:(t:typeof SYNC_TARGETS[number])=>string)=>SYNC_TARGETS.map(fn);
 if(id==='leilaoimovel')return cityUrls(t=>`${base}/leilao-de-imovel/${t.slug}-${t.state.toLowerCase()}?pag=1`);
 if(id==='megaleiloes')return cityUrls(t=>`${base}/imoveis/${t.state.toLowerCase()}/${t.slug}`);
 if(id==='biasi')return cityUrls(t=>`${base}/Sale/LotListSearch?start=0&limit=48&buscaImovel=true&estado=${t.state.toLowerCase()}&cidade=${t.slug}&bairro=todos-os-bairros&segmento=todos-os-segmentos`);
 if(id==='leiloei')return [base+'/busca/segmento/imoveis'];
 if(id==='pestana')return [base+'/leilao-de-imoveis'];
 if(id==='frazao')return [base,`${base}/judicial/leiloes`,`${base}/itau/leiloes`,`${base}/santander/leiloes`,...cityUrls(t=>`${base}/sale/searchLot?estado=${t.state}&cidade=${encodeURIComponent(t.city)}&pesquisaSimples=false`),...cityUrls(t=>`${base}/Sale/SearchLotResult?uf=${t.state}&cidade=${encodeURIComponent(t.city)}&pagina=1`)];
 if(id==='d1lance'||id==='d1lanceleiloes_com_br')return [`${base}/navegar-pelo-mapa?tipo_filtro=imoveis`,base];
 if(id==='portalzuk')return [...cityUrls(t=>`${base}/leilao-de-imoveis/c/todos-imoveis/${t.state.toLowerCase()}/regiao/${t.slug}`),...cityUrls(t=>`${base}/leilao-de-imoveis/c/todos-imoveis/${t.state.toLowerCase()}/regiao/${t.slug}?page=2`)];
 if(id==='jv')return cityUrls(t=>`${base}/lotes/imovel?tipo=imovel&address_uf=${t.state}&address_cidade_ibge=${t.ibge}`);
 if(id==='joaoemilio')return [...cityUrls(t=>`${base}/lotes/imovel?tipo=imovel&address_uf=${t.state}&address_cidade_ibge=${t.ibge}`),`${base}/leiloes`];
 if(id==='santander')return cityUrls(t=>`${base}/?cidade=${encodeURIComponent(t.city)}&uf=${t.state}&pag=1`);
 if(id==='bb')return [`${base}/catalogo/imoveis?uf=RJ`,`${base}/catalogo/imoveis?uf=MG`];
 if(id==='saraiva')return [1,2,3,4].map(p=>`${base}/lotes?categoria=Im%C3%B3veis&page=${p}`);
 if(id==='kronbergleiloes_com_br'||id==='kronleiloes_com_br')return ['https://www.kronleiloes.com.br/categorias/imoveis?searchType=opened&pageNumber=1&pageSize=30&orderBy=price:desc'];
 if(id==='apaleiloes_com_br')return ['https://www.apabrfleiloes.com.br'];
 if(id==='silas')return [base+'/Principal.asp?at=jd',base+'/Principal.asp?at=ex'];
 if(id==='onildo')return [base+'/Principal.asp'];
 if(id==='schulmann')return [base+'/thumbs.php?tipo=leiloes-online'];
 if(id==='paulobotelho')return [base+'/lotes/imoveis?page=1',base];
 if(['rioleiloes','mariafilomena','deonizialeiloes_com_br','giordanoleiloes_com_br','alessandroteixeiraleiloes_com_br','hdleiloes_com_br'].includes(id))return [base+'/leilao/index/imoveis',base];
 if(id==='rogeriomenezes')return [`${base}/busca?interesse=imovel`,`${base}/busca?interesse=apartamento`,`${base}/busca?interesse=terreno`,`${base}/busca?interesse=casa`,`${base}/busca?interesse=comercial`,`${base}/busca?interesse=loja`];
 const config=portalConfigs.find(p=>p.id===id); return [config?.searchUrl||base];

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
   const isPag=$(el).attr('rel')==='next'||$(el).closest('[class*="pagin"], [aria-label*="pagin"]').length>0||/^(?:proxima?|próxima?|next|›|»|\d+)$/i.test($(el).text().trim());
   if($(el).closest('header, footer, nav').length>0&&!isPag&&!directPattern.test(u.href)&&!/im[oó]ve(?:l|is)/i.test(u.pathname))return;
   links.push({url:canonicalAuctionLink(u.href),text:text.slice(0,3500),pagination:isPag});
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
  const gotoMatch=onclick.match(/goTo\(\s*['"]([^'"]+)['"]/i);
  if(gotoMatch){try{const u=new URL(gotoMatch[1],url);const card=$(el).closest('[class*="lote"],[class*="leilao"],[class*="card"],[class*="shadow"],article,tr,li,.row');links.push({url:canonicalAuctionLink(u.href),text:(card.length?card.text():$(el).text()).replace(/\s+/g,' ').trim().slice(0,3500),pagination:false});}catch{}}
  for(const match of onclick.matchAll(/['"]([^'"]+\.(?:asp|php)(?:\?[^'"]*)?)['"]/gi)){
   try{links.push({url:canonicalAuctionLink(new URL(match[1],url).href),text:$(el).text().trim(),pagination:false});}catch{}
  }
 });
 const apiList=$('#leilao-lista-lote');
 if(apiList.length&&/LotListSearch/i.test(url)){const start=Number(apiList.attr('index')),limit=Number(apiList.attr('limit')),total=Number(apiList.attr('total'));if(limit>0&&start+limit<total){const next=new URL(url);next.searchParams.set('start',String(start+limit));links.push({url:next.href,text:'Próxima página',pagination:true});}}
 const mapLotRaw=$('#info-lote-mapa').attr('data-lote');
 let mapLotText='';
 if(mapLotRaw){
  try{
   const parsed=JSON.parse(mapLotRaw);
   const entries=Array.isArray(parsed)?parsed:[parsed];
   const parts:string[]=[];
   for(const item of entries){
    if(!item||typeof item!=='object')continue;
    const rawSlug=item.nm_slug?`/${String(item.nm_slug).replace(/^\//,'')}`:'';
    const itemLink=item.url||item.link||(rawSlug?new URL(rawSlug,url).href:'')||(item.slug?new URL(`/oferta/${item.slug}`,url).href:'');
    const summary=[item.nm_titulo||item.titulo||item.title,item.descricao||item.description,item.localizacao?.nm_endereco||item.endereco||item.address,item.localizacao?.nm_bairro||item.bairro,item.localizacao?.nm_cidade||item.cidade||item.city,item.localizacao?.nm_estado||item.uf||item.state,item.valor?`R$ ${item.valor}`:''].filter(Boolean).join(' - ');
    if(itemLink){try{links.push({url:canonicalAuctionLink(new URL(itemLink,url).href),text:summary||'Imóvel',pagination:false});}catch{}}
    if(summary)parts.push(summary);
   }
   mapLotText=parts.join('\n');
  }catch{}
 }
 const structuredAddresses:string[]=[];const structuredSizes:number[]=[];
 $('script[type="application/ld+json"]').each((_,el)=>{try{const visit=(x:any)=>{if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(visit);return;}if(/Product|Residence|Apartment|House|RealEstateListing/i.test(String(x['@type']))){if(x.address)structuredAddresses.push(typeof x.address==='string'?x.address:[x.address.streetAddress,x.address.addressLocality,x.address.addressRegion].filter(Boolean).join(', '));const n=Number(x.floorSize?.value);if(n>0)structuredSizes.push(n);}Object.values(x).forEach(visit);};visit(JSON.parse($(el).text()));}catch{}});
 const image=$('meta[property="og:image"]').attr('content')||'';
 const documentLinks=$('a[href]').map((_,el)=>{const href=$(el).attr('href')||'';return /matr[ií]cula|edital/i.test($(el).text())||/\.pdf(?:\?|$)/i.test(href)?new URL(href,url).href:'';}).get().filter(Boolean);
 $('script,style,noscript,header,footer,nav,aside,[class*="related"],[class*="recommend"],[id*="Modal"],[id*="PolPriv"],[id*="Login"],[id*="Rodape"],.modal').remove();
 $('br').replaceWith('\n');$('p,div,h1,h2,h3,h4,li,tr,dt,dd').each((_,el)=>{$(el).append('\n');});
 const title=$('#divDescrLoteTexto').text().trim()||$('h1').map((_,el)=>$(el).text().trim()).get().find(t=>propertyWords.test(norm(t)))||$('h1').first().text().trim()||$('h2,h3,h4').map((_,el)=>$(el).text().trim()).get().find(t=>propertyWords.test(norm(t)))||$('title').text().trim();
 let text=$('body').text().replace(/[\t \u00a0]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
 text=text.replace(/(?:Lote Anterior\s*)?(?:LOTE\s+\d{1,4}\s*){8,}/gi,' ').trim();
 if($('#divDescrLoteTexto').length){const visao=$('#divVisao1').text().replace(/[\t \u00a0]+/g,' ').replace(/\n\s*\n/g,'\n').trim();if(visao)text=visao;}
 if(mapLotText)text=[mapLotText,text].filter(Boolean).join('\n');
 if(lotData?.descricao){const description=cheerio.load(lotData.descricao).text();text=[eventData?.judicial===true?'Judicial':eventData?.judicial===false?'Extrajudicial':'',description,text].join('\n');}
 let financials=officialLotFinancials(html,url);
 // Public item detail templates expose the current bid in a dedicated element.
 if(/\/item\/\d+\/detalhes/.test(new URL(url).pathname)) {
  const displayed=$('#lance_inicial').text().trim().match(/^R\$\s*([\d.]+,\d{2})$/);
  if(displayed){const value=Number(displayed[1].replace(/\./g,'').replace(',','.'));if(value>0)financials={...financials,auctionPrice:value,priceVerified:true};}
 }

 if(new URL(url).hostname.replace(/^www\./,'')==='paulobotelholeiloeiro.com.br' && /\/leiloes\/.+\/\d+$/.test(new URL(url).pathname)) {
  const money=(v?:string)=>v?Number(v.replace(/\./g,'').replace(',','.')):0;
  const date=(v?:string)=>v?v.split('/').reverse().join('-'):undefined;
  const firstAuctionPrice=money(text.match(/Lance Inicial:\s*R\$\s*([\d.,]+)/i)?.[1]);
  const secondAuctionPrice=money(text.match(/Lance Inicial para Segundo Leil[aã]o:\s*R\$\s*([\d.,]+)/i)?.[1]);
  const firstAuctionDate=date(text.match(/Primeiro Leil[aã]o\s*\d{2}\/\d{2}\/\d{4}\s*At[eé]\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1]);
  const secondAuctionDate=date(text.match(/Segundo Leil[aã]o\s*\d{2}\/\d{2}\/\d{4}\s*At[eé]\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1]);
  const today=new Date().toISOString().slice(0,10);
  const auctionPrice=firstAuctionDate&&firstAuctionDate>=today?firstAuctionPrice:secondAuctionDate&&secondAuctionDate>=today?secondAuctionPrice:0;
  financials={auctionPrice,priceVerified:auctionPrice>0,firstAuctionPrice,secondAuctionPrice,firstAuctionDate,secondAuctionDate,auctionDate:firstAuctionDate&&firstAuctionDate>=today?firstAuctionDate:secondAuctionDate};
 }
 return {availability:assessAvailability(undefined,url,200,html),links,text,title:lotData?.titulo||title,image,structuredAddresses,structuredSizes,documentLinks,officialFinancials:financials,lotDescription:lotData?.descricao?cheerio.load(lotData.descricao).text():''};
}

export async function runListedPortalSync(reason:string,onDrafts:(rows:ScrapedAuctionDraft[],source:PortalRun)=>Promise<{imported:number;updated:number;pending:number}>, options:{ids?:string[]}={}) {
 const configs=portalConfigs.filter(p=>!options.ids||options.ids.includes(p.id));
 const report:FullSyncReport={id:new Date().toISOString().replace(/[:.]/g,'-'),status:'running',reason,startedAt:new Date().toISOString(),targets:SYNC_TARGETS,sources:configs.map(p=>({id:p.id,name:p.name,status:'queued',pages:0,discovered:0,fetched:0,accepted:0,imported:0,updated:0,pending:0,errors:[]}))};
 const dir=path.join('sync-audits','runs',report.id);fs.mkdirSync(dir,{recursive:true});
 const save=()=>{fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync('sync-audits/latest-listed-sync.json',JSON.stringify(report,null,2));};save();
 let browserPromise:Promise<any>|null=null; let activeRenderPages=0; const renderWaiters:Array<()=>void>=[]; const maxConcurrentRenders=process.env.RENDER==='true'?2:4;
 const acquireRenderSlot=async()=>{
  if(activeRenderPages>=maxConcurrentRenders){
   let settled=false;
   await new Promise<void>((resolve,reject)=>{
    const onFree=()=>{if(!settled){settled=true;resolve();}};
    // Wait cleanly in FIFO order without aborting HTTP portal discovery
    renderWaiters.push(onFree);
   });
  }
  activeRenderPages++;
 };
 const releaseRenderSlot=()=>{activeRenderPages=Math.max(0,activeRenderPages-1);const next=renderWaiters.shift();if(next)next();};
 const rendered=async(url:string)=>{
   await acquireRenderSlot(); try{ browserPromise ||= launchPuppeteer(puppeteer, {headless:true,protocolTimeout:120000,args:['--no-sandbox','--disable-dev-shm-usage']});const browser=await browserPromise;
  const isLeilaoImovel=new URL(url).hostname.endsWith('leilaoimovel.com.br');
  for(let attempt=0;attempt<(isLeilaoImovel?2:1);attempt++){
   let page:any=null;
   try{page=await browser.newPage();await page.setRequestInterception(true);page.on('request',(req:any)=>{const rt=req.resourceType();if(rt==='image'||rt==='media'||rt==='font'||rt==='stylesheet')req.abort().catch(()=>{});else req.continue().catch(()=>{});});await page.setUserAgent(UA);await page.setExtraHTTPHeaders({'Accept-Language':'pt-BR,pt;q=0.9'});const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});if(r&&r.status()>=400){if(isLeilaoImovel&&r.status()===403&&attempt===0){await wait(1500);continue;}throw Error(`HTTP ${r.status()}`);}await page.waitForNetworkIdle({idleTime:500,timeout:4500}).catch(()=>{});const html=await page.content();if(/<title>Just a moment|Access Denied/i.test(html))throw Error('Acesso bloqueado pela fonte');return {html,url:page.url()};}catch(err:any){if(/protocolTimeout|Target\.createTarget|Target closed|Session closed/i.test(String(err?.message||''))){const stale=browserPromise;browserPromise=null;stale?.then(b=>b?.close?.().catch(()=>{})).catch(()=>{});}throw err;}finally{await page?.close?.().catch(()=>{});}
  }
  throw Error('Leilão Imóvel bloqueou a página após duas tentativas via navegador.'); }finally{releaseRenderSlot();}
 };
  const decodeHtml=(bytes:ArrayBuffer,contentType:string|null)=>{
   const sniff=new TextDecoder('utf-8',{fatal:false}).decode(bytes.slice(0,3000));
   const declared=(contentType?.match(/charset=([^;\s]+)/i)?.[1]||sniff.match(/charset=["']?([a-zA-Z0-9_-]+)/i)?.[1]||'utf-8').trim();
   try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
   catch{try{return new TextDecoder(declared).decode(bytes);}catch{return new TextDecoder('latin1').decode(bytes);}}
  };
  const load=async(url:string,render=false)=>{
   if(render)return rendered(url);
   const parsedUrl=new URL(url);const legacyPage=/Principal\.asp/i.test(parsedUrl.pathname)&&parsedUrl.searchParams.has('pag');const postFields=legacyPage?new URLSearchParams({pag:parsedUrl.searchParams.get('pag')!,acaoDest:'',pesq:''}):undefined;
   let r=await fetch(url,{method:legacyPage?'POST':'GET',body:postFields,headers:{'User-Agent':UA,'Accept':'text/html,application/xhtml+xml','Accept-Language':'pt-BR,pt;q=0.9'},signal:AbortSignal.timeout(12000)});if(r.status===429){await wait(3000);r=await fetch(url,{method:legacyPage?'POST':'GET',body:postFields,headers:{'User-Agent':UA,'Accept':'text/html,application/xhtml+xml','Accept-Language':'pt-BR,pt;q=0.9'},signal:AbortSignal.timeout(12000)});}
   if(!r.ok)throw Error(`HTTP ${r.status}`);
   const bytes=await r.arrayBuffer();
   return {html:decodeHtml(bytes,r.headers.get('content-type')),url:r.url};
  };
  const shouldRenderFallback=(error:unknown)=>!(/HTTP\s+(?:400|401|403|404|410|451|500|502|503|504)\b|ENOTFOUND|ECONNREFUSED|ECONNRESET|CERT_|UNABLE_TO_VERIFY|ERR_TLS|fetch failed/i.test(error instanceof Error?error.message:String(error)));
  const canRenderFallback=(portalId:string,error:unknown)=>shouldRenderFallback(error)||isBlockedLeilaoImovelResponse(portalId,error);
  let cursor=0;
 const worker=async()=>{while(cursor<configs.length){const index=cursor++;const config=configs[index];const progress=report.sources[index];progress.status='running';progress.startedAt=new Date().toISOString();save();console.log(`[Listed Sync] ${config.name}: iniciando`);
  const cleanBase=config.baseUrl.replace(/\/$/,'');
  const listingQueue=sourceSeedUrls(config.id,cleanBase);
  if(config.id==='leilaovip'){listingQueue.push(`${cleanBase}/pesquisa?category=Im%C3%B3veis`);}
  else if(config.id==='freitas'){listingQueue.push(...[1,2,3,4,5].map(p=>`${cleanBase}/Leiloes/PesquisarLotes?Nome=&Categoria=2&TipoLoteId=0&FaixaValor=0&Pagina=${p}`),`${cleanBase}/Leiloes/Pesquisar?Categoria=2`);}
  else if(config.searchUrl && !listingQueue.includes(cleanBase) && !config.searchUrl.startsWith(`${cleanBase}/lotes/imovel`)){if(/\/rura(?:l|is)\b/i.test(config.searchUrl))listingQueue.unshift(cleanBase);else listingQueue.push(cleanBase);}
  const seenPages=new Set<string>();const details=new Map<string,string>();const seenDetails=new Set<string>();const batches:ScrapedAuctionDraft[]=[];
  const portalStartedAt=Date.now();
  const isUnlimitedSource=HIGH_PRIORITY_IDS.has(config.id)||Boolean((config as any).suporteApi);
  const maxPortalPages=HIGH_PRIORITY_IDS.has(config.id)?60:20;
  const portalSoftDeadlineMs=HIGH_PRIORITY_IDS.has(config.id)?180_000:90_000;
  let renderCalls=0;const maxListingRenders=isUnlimitedSource?16:6;let navigated=false;const pageSignatures=new Set<string>();let confirmedEmpty=false;
  let lastFlushAt=0;
  const flush=async()=>{if(!batches.length)return;const rows=batches.splice(0);lastFlushAt=Date.now();fs.appendFileSync(path.join(dir,config.id+'.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');const audits=rows.filter(r=>r.areaAudit).map(r=>JSON.stringify({source:config.id,url:r.auctionLink,...r.areaAudit}));if(audits.length)fs.appendFileSync(path.join(dir,'area-audit.jsonl'),audits.join('\n')+'\n');const counts=await onDrafts(rows,progress);progress.imported+=counts.imported;progress.updated+=counts.updated;progress.pending+=counts.pending;save();};
  try{
   if(config.id==='leilaoimovel'){
     navigated=true;
     console.log('[Listed Sync] Leilão Imóvel: iniciando varredura sem limites com descarte zero e motor canônico');
     await scrapeLeilaoImovel({
       targets: SYNC_TARGETS,
       onBatch: async (batch) => {
         const drafts: ScrapedAuctionDraft[] = batch
           .filter(b => b.origin !== 'caixa' && !/imovel-caixa-economica-federal-cef/i.test(b.auctionLink || '') && !/caixa\s+econ[oô]mica/i.test(b.auctioneerName || ''))
           .map(b => ({
           portalId: 'leilaoimovel',
           auctioneerName: b.auctioneerName || 'Leilão Imóvel',
           title: b.title || '',
           address: b.address || '',
           neighborhood: b.neighborhood || '',
           city: b.city || '',
           state: b.state || '',
           propertyType: b.propertyType || 'Apartamento',
           sizeSqm: b.sizeSqm || 0,
           auctionPrice: b.auctionPrice || 0,
           auctionDate: b.auctionDate || '',
           firstAuctionDate: b.firstAuctionDate,
           firstAuctionPrice: b.firstAuctionPrice,
           auctionLink: b.auctionLink || '',
           imageUrl: b.imageUrl,
           description: b.description || '',
           origin: (b.origin === 'judicial' ? 'judicial' : 'extrajudicial'),
           priceVerified: b.priceVerified,
           sizeVerified: b.sizeVerified,
           addressVerified: b.addressVerified,
           originVerified: true,
           sourceVerified: true,
           locationScopeVerified: true,
           requer_auditoria_endereco: b.requer_auditoria_endereco
         }));
         progress.pages++;
         if (drafts.length) {
           progress.discovered += drafts.length;
           progress.fetched += drafts.length;
           progress.accepted += drafts.length;
           batches.push(...drafts.map(row => ({ ...row, sourceEvidencePath: preserveSource(row.auctionLink, '<pre>' + JSON.stringify(row) + '</pre>') })));
           await flush();
         }
         return { imported: progress.imported, updated: progress.updated };
       }
     });
     progress.status='completed';
     continue;
    }
    if(config.id==='megaleiloes'){
     navigated=true;
     for (const target of SYNC_TARGETS) {
       const [exRows, judRows] = await Promise.all([
         scrapeMegaLeiloes('extrajudicial', target.state, target.city),
         scrapeMegaLeiloes('judicial', target.state, target.city),
       ]);
       const combined = [...exRows, ...judRows];
       progress.pages++;
       progress.discovered += combined.length;
       progress.fetched += combined.length;
       progress.accepted += combined.length;
       if (combined.length) {
         batches.push(...combined);
         await flush();
       }
     }
     progress.status = 'completed';
     continue;
    }
    if(['emgea','vitrinebradesco','pestana','mariafilomena','santander','sold','superbid'].includes(config.id)){
    const onPage=async(rows:ScrapedAuctionDraft[],total:number)=>{navigated=true;progress.pages++;progress.discovered+=total;progress.fetched+=total;progress.accepted+=rows.length;batches.push(...rows.map(row=>({...row,sourceEvidencePath:preserveSource(row.auctionLink,'<pre>'+JSON.stringify(row)+'</pre>')})));await flush();save();};
    if(config.id==='pestana')await collectPestanaApi(dir,onPage);
    else if(config.id==='mariafilomena')await collectMariaFilomenaApi(dir,onPage);
    else if(config.id==='santander')await collectSantanderApi(dir,onPage);
    else if(config.id==='sold'||config.id==='superbid')await collectSuperbidOffers(config.id as 'sold'|'superbid',dir,onPage);
    else await collectBankApi(config.id,dir,onPage);
    progress.status='completed';continue;
   }
   // Autodetecta portais Suporte Informática (centenas de leiloeiros Nexus) via API JSON estruturada
   const onSuportePage=async(rows:ScrapedAuctionDraft[],total:number)=>{navigated=true;progress.pages++;progress.discovered+=total;progress.fetched+=total;progress.accepted+=rows.length;batches.push(...rows.map(row=>({...row,sourceEvidencePath:preserveSource(row.auctionLink,'<pre>'+JSON.stringify(row)+'</pre>')})));await flush();save();};
   const isSuporteJson=await collectSuporteApi({id:config.id,name:config.name,baseUrl:config.baseUrl},dir,onSuportePage,{probeTimeoutMs:config.suporteApi?15000:5000});
   if(isSuporteJson){confirmedEmpty=progress.discovered===0;progress.status='completed';continue;}
   const isSuportePortal=Boolean((config as any).suporteApi)||new Set(['rioleiloes','deonizialeiloes_com_br','giordanoleiloes_com_br','alessandroteixeiraleiloes_com_br','hdleiloes_com_br','jrleiloes_com_br','fabioleiloes_com_br','carloferrarileiloes_com_br','rigolonleiloes_com_br','joserodovalholeiloes_com_br']).has(config.id);if(isSuportePortal){
    try{
     await collectRioLinks(dir,async(links)=>{navigated=true;progress.pages++;for(const link of links)details.set(link.url,link.text);progress.discovered=details.size;save();},config.baseUrl,config.id);
    }catch(error:any){if(config.id==='rioleiloes')throw error;}
   } else {
    const dtLinks=await collectDoulheTresLinks(config.baseUrl).catch(()=>null);
    if(dtLinks?.length){navigated=true;progress.pages++;for(const link of dtLinks)details.set(link.url,link.text);progress.discovered=details.size;save();}
   }
   while(listingQueue.length && progress.pages<maxPortalPages && Date.now()-portalStartedAt<portalSoftDeadlineMs){const requested=listingQueue.shift()!;const key=canonicalAuctionLink(requested);if(seenPages.has(key)||seenDetails.has(key))continue;seenPages.add(key);
     try{
      if(config.id==='leilaoimovel'&&progress.pages>0)await wait(1200);
      let response;try{response=await load(requested);}catch(error){if((renderCalls>=maxListingRenders&&!isBlockedLeilaoImovelResponse(config.id,error))||!canRenderFallback(config.id,error))throw error;renderCalls++;response=await load(requested,true);}
     let page=parseSourcePage(response.html,response.url);
     const isSpaShell=/<div[^>]+id=["']?(?:root|app|__next|__nuxt|main-app)["']?(?:\s[^>]*)?>\s*<\/div>|<app-root\b|self\.__next_f|\$\{\s*lote\./i.test(response.html)||(page.text.length<250&&/<div[^>]+id=["']?(?:root|app|__next|__nuxt|main-app)["']?/i.test(response.html));
     if(((!page.links.some(link=>directPattern.test(link.url))&&!/\/rura(?:l|is)\b/i.test(requested)&&listingQueue.length===0)||isSpaShell)&&renderCalls<maxListingRenders&&!/LotListSearch|PesquisarLotes|SearchLotResult/i.test(requested)){renderCalls++;response=await load(requested,true);page=parseSourcePage(response.html,response.url);}
     progress.pages++;navigated=true;
     if(/nenhum (?:im[oó]vel|lote|resultado)|n[aã]o (?:foram encontrados|temos leil[oõ]es ativos)/i.test(page.text))confirmedEmpty=true;
     const signature=page.links.filter(link=>directPattern.test(link.url)).map(link=>link.url).sort().join('|');
     if(signature&&pageSignatures.has(signature)){continue;}if(signature)pageSignatures.add(signature);
     fs.writeFileSync(path.join(dir,config.id+'-listing-'+progress.pages+'.html'),response.html);
     for(const link of page.links){if(!sameHostOrAlias(link.url,response.url,config)||skipPattern.test(link.url))continue;
      if(config.id==='megaleiloes'&&!isWithinMegaScope(link.url,directPattern.test(link.url)&&!link.pagination))continue;
      const location=sourceAuctionLocation(link.text);if(location&&!allowedSyncLocation(location.city,location.state))continue;
      const otherStateInUrl=/(?:\/|-)(?:ac|al|am|ap|ba|ce|df|es|go|ma|ms|mt|pa|pb|pe|pi|pr|rn|ro|rr|rs|sc|se|sp|to)(?:\/|$|-\d{3,})/i.test(new URL(link.url).pathname)&&!/(?:rio-de-janeiro|niteroi|juiz-de-fora|(?:\/|-)rj(?:\/|$|-)|(?:\/|-)mg(?:\/|$|-))/i.test(new URL(link.url).pathname);
      if(otherStateInUrl)continue;

      const inPropertyFeed=/im[oó]ve(?:l|is)|categoria=2|category=im|tipo_filtro=imoveis|ID_Categoria=|buscaImovel=true/i.test(response.url);const vehicleQuerySlug=/(?:veiculo|veiculos|carro|moto|caminhao|sucata)/i.test(link.url)&&!/imoveis|imovel/i.test(link.url);const vehicleLinkText=/\b(?:veiculo|veiculos|carro|moto|caminhao|trator|sucata|maquina|equipamento|moveis|eletro|chevrolet|fiat|volkswagen|ford|onix|uno|audi|pickup|automovel|motocicleta|honda|toyota|hyundai|renault)\b/i.test(norm(link.text));const relevant=!vehicleQuerySlug&&!vehicleLinkText&&(propertyWords.test(norm(link.text))||/imoveis|imovel|tipo=imovel|categoria=2|category=im[oó]veis|buscaImovel=true|leilao\.php\?idLeilao=|lote\.php\?idLote=/i.test(link.url)||(inPropertyFeed&&directPattern.test(link.url)));
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
     const processDetail=async([url,listingText]:[string,string])=>{
      seenDetails.add(url);
      try{
      // The Caixa source is synchronized from its own official catalogue before
      // this discovery-only aggregator pass. Avoid creating a second Caixa copy.
      if(config.id==='leilaoimovel'&&/imovel-caixa-economica-federal-cef/i.test(url))return;
      if(config.id==='leilaoimovel')await wait(700);
      let response;try{response=await load(url);}catch(error){if(!canRenderFallback(config.id,error))throw error;response=await load(url,true);}let page=parseSourcePage(response.html,response.url);progress.fetched++;
      const isDetailSpa=/<div[^>]+id=["']?(?:root|app|__next|__nuxt)["']?(?:\s[^>]*)?>\s*<\/div>|<app-root\b/i.test(response.html)||(page.text.length<250&&/<div[^>]+id=["']?(?:root|app|__next|__nuxt)["']?/i.test(response.html));
      if(isSuportePortal||config.id==='sold'||config.id==='mariafilomena'||page.text.length<80||isDetailSpa){response=await load(url,true);page=parseSourcePage(response.html,response.url);}
      let sourcePortal=config;
      if(config.id==='leilaoimovel'){
       // The aggregator is discovery-only. Confirm every candidate on the
       // linked auctioneer page before extracting price, status, area or origin.
       const officialLink=page.links.find(link=>{
        if(sameHost(link.url,response.url)||!officialPortalForUrl(link.url))return false;
        try{return new URL(link.url).pathname!=='/'&&!skipPattern.test(link.url);}catch{return false;}
       });
       if(!officialLink)throw Error('Agregador não forneceu link verificável do leiloeiro oficial');
       response=await load(officialLink.url);page=parseSourcePage(response.html,response.url);progress.fetched++;
       sourcePortal=officialPortalForUrl(response.url)||officialPortalForUrl(officialLink.url)||config;
      }
      if(page.text.length<80)throw Error('Detalhe sem conteúdo verificável');
       const addressText=extractAddress(page.text,'');
       const lotLocationEvidence=[...page.structuredAddresses,addressText,page.lotDescription,page.title,listingText].filter(Boolean);
       let location=sourceAuctionLocation(page.title)||sourceAuctionLocation(addressText)||sourceAuctionLocation(page.lotDescription)||separatedTargetLocation(page.lotDescription)||sourceAuctionLocation(page.text)||sourceAuctionLocation(listingText)||urlLocation(response.url)||urlLocation(url);
       // Several official details omit the UF after a municipality, while legacy
       // Rio auction pages show a known neighborhood followed by "RJ". Apply
       // these narrow fallbacks only to the lot's own address/title/card text,
       // never to the site's full page (which can contain footer cities).
       if(!location){
        for(const evidence of lotLocationEvidence){
         location=sourceAuctionLocation(evidence)||separatedTargetLocation(evidence)||sourceTargetCityLocation(evidence)||sourceNeighborhoodLocation(evidence)||resolveRioNeighborhoodFallback(evidence,page.text);
         if(location)break;
        }
       }
       if(!location)location=separatedTargetLocation(page.text.slice(0,2500));
        if(!location||!allowedSyncLocation(location.city,location.state)){progress.errors.push({url,message:location?'Imóvel fora das três cidades solicitadas':'Localização do imóvel não confirmada no detalhe'});return;}
       if(!propertyWords.test(norm(page.title+' '+page.text)))return;
      const initial:ScrapedAuctionDraft={portalId:sourcePortal.id,auctioneerName:sourcePortal.name,title:page.title,address:'',neighborhood:'',city:location.city,state:location.state,propertyType:'Apartamento',sizeSqm:0,auctionPrice:0,auctionDate:'',auctionLink:canonicalAuctionLink(response.url),description:page.text,origin:bankIds.has(sourcePortal.id)?'extrajudicial':'judicial',locationScopeVerified:true};
      page={...page,sourceEvidencePath:preserveSource(response.url,response.html)} as any;
      let draft=parseOfficialLotDetail(initial,page,response.url);
      if((!draft.priceVerified && page.text.length < 300) || (isDetailSpa && (!draft.priceVerified || !draft.addressVerified))) {
       try { const renderedResponse=await load(url,true);const renderedPage=parseSourcePage(renderedResponse.html,renderedResponse.url);const checked=parseOfficialLotDetail(initial,{...renderedPage,sourceEvidencePath:preserveSource(renderedResponse.url,renderedResponse.html)},renderedResponse.url);if(checked.priceVerified||checked.areaAudit?.selected||checked.addressVerified){draft={...checked,...(!checked.priceVerified&&draft.priceVerified?{auctionPrice:draft.auctionPrice,priceVerified:true,firstAuctionPrice:draft.firstAuctionPrice,secondAuctionPrice:draft.secondAuctionPrice}:{}),...(!checked.sizeVerified&&draft.sizeVerified?{sizeSqm:draft.sizeSqm,sizeVerified:true,areaAudit:draft.areaAudit}:{})};page=renderedPage;} }
       catch(error:any){progress.errors.push({url,message:'Conferência de área no navegador: '+error.message});}
      }
      if(bankIds.has(sourcePortal.id)){draft.origin='extrajudicial';draft.originVerified=true;draft.sellerBank=sourcePortal.name;}
      if(!draft.originVerified&&/(?:leilao|modalidade|natureza|tipo)\s*:?\s*judicial\b/.test(norm(page.text))){draft.origin='judicial';draft.originVerified=true;}
       if(!draft.city||!allowedSyncLocation(draft.city,draft.state)){progress.errors.push({url,message:'Localização não confirmada na descrição oficial'});return;}
      const registryLink=page.documentLinks.find(link=>/matricula|certidao/i.test(link));if(registryLink)draft.matriculaUrl=registryLink;
      batches.push(draft);progress.accepted++;if(batches.length>=10||Date.now()-lastFlushAt>15000)await flush();
      }catch(error:any){progress.errors.push({url,message:error.message});}
     };
     // Detail pages are independent once discovered. A small per-portal pool
     // cuts long sequential scans without hammering any single auctioneer.
     let detailCursor=0;
     const detailWorker=async()=>{while(detailCursor<pending.length && Date.now()-portalStartedAt<portalSoftDeadlineMs){const item=pending[detailCursor++];await processDetail(item);}};
      await Promise.all(Array.from({length:Math.min(3,pending.length)},detailWorker));
    await flush();save();
   }
   if(!progress.discovered&&!confirmedEmpty)progress.errors.push({url:config.baseUrl,message:'Nenhum lote identificado; a ausência de ofertas não foi confirmada.'});
   progress.status=progress.errors.length?(navigated?'partial':'failed'):'completed';
  }catch(error:any){progress.errors.push({url:config.baseUrl,message:error.message});progress.status='failed';}
  finally{await flush();progress.finishedAt=new Date().toISOString();save();console.log(`[Listed Sync] ${config.name}: ${progress.status}; ${progress.discovered} descobertos, ${progress.accepted} na região, ${progress.imported} novos`);}
 }};
  // Keep the machine responsive while the opening sync is running. Each
  // portal can still use two detail requests, so three portal workers cap the
  // total at six detail pages instead of twelve competing for memory/CPU.
  const portalConcurrency = process.env.RENDER === 'true' ? 4 : 10;
  try{await Promise.all(Array.from({length:Math.min(portalConcurrency,configs.length)},worker));report.status=report.sources.every(s=>s.status==='completed')?'completed':'partial';}
 catch(error){report.status='failed';throw error;}
 finally{if(browserPromise){const browser=await browserPromise.catch(()=>null);if(browser)await browser.close().catch(()=>{});}report.finishedAt=new Date().toISOString();save();}
 return report;
}
