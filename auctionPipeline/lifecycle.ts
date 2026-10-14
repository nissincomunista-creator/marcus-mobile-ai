import * as cheerio from 'cheerio';
export type IngestionStatus='ativo'|'finalizado'|'expirado_link_invalido'|'expirado_por_data'|'quarentena_extracao';
export type Availability={state:'active'|'closed'|'removed'|'unknown';status?:IngestionStatus;url:string;checkedAt:string;reason:string;firstMissingAt?:string;missingCount?:number};
export type LifecycleContext={finalUrl?:string;dates?:string[];saleMode?:string};
const dayEnd=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)?Date.parse(value+'T23:59:59-03:00'):Date.parse(value);
export const lifecycleDates = (a: any): string[] => {
 const caixa=a.origin==='caixa'||a.origin==='caixa_radar'||a.id?.startsWith('auc-caixa-');
 // Legacy Caixa auctionDate may be the import date. Explicit round dates are real deadlines.
 return [a.firstAuctionDate,a.secondAuctionDate,a.thirdAuctionDate,...(caixa?[]:[a.auctionDate])].filter(Boolean);
};
export const expiredRounds=(dates:string[],saleMode='',now=new Date().toISOString())=>{
 const parsed=dates.map(dayEnd).filter(Number.isFinite);
 return !/venda direta|proposta/i.test(saleMode)&&parsed.length>0&&parsed.every(d=>d<Date.parse(now));
};
export function assessAvailability(previous:Availability|undefined,url:string,httpStatus:number,html:string,now=new Date().toISOString(),context:LifecycleContext={}):Availability {
 if(previous?.url!==url)previous=undefined;
 const base={url,checkedAt:now};
 const finish=(status:IngestionStatus,reason:string):Availability=>({...base,state:status==='expirado_link_invalido'?'removed':'closed',status,reason});
 if(httpStatus===404||httpStatus===410)return finish('expirado_link_invalido','HTTP '+httpStatus+': anúncio indisponível');
 if(context.finalUrl){try{const original=new URL(url),final=new URL(context.finalUrl);if(original.pathname!=='/'&&/^\/(?:index\.(?:html?|php|asp))?$/i.test(final.pathname)&&!final.search)return finish('expirado_link_invalido','Detalhe redirecionado para a página inicial');}catch{}}
 if(httpStatus!==200||/<title[^>]*>[^<]*(?:Just a moment|Access Denied|Captcha)|Radware Bot Manager/i.test(html))return {...previous,...base,state:previous?.state||'unknown',reason:'Consulta bloqueada ou indisponível; HTTP '+httpStatus};
 const $=cheerio.load(html);
 $('script,style,noscript,nav,header,footer,aside,select,option,template,[hidden],[aria-hidden="true"],.modal,.cards,[class*="related"],[class*="recommend"]').remove();
 const heading=$('h1').first().text().trim();
 const visibleText=$('body').text().replace(/\s+/g,' ').trim();
 if(/verifique que voc[eê] [eé] humano|verify you are human|checking your browser/i.test(visibleText))return {...previous,...base,state:previous?.state||'unknown',reason:'Consulta bloqueada por desafio de acesso'};
 const unavailable=/^(?:(?:este|o)\s+)?(?:im[oó]vel|lote|an[uú]ncio|p[aá]gina)\s+(?:n[aã]o\s+(?:foi\s+)?encontrad[oa]|n[aã]o\s+(?:(?:est[aá]|se encontra)\s+)?(?:mais\s+)?dispon[ií]vel\s*(?:para venda)?|indispon[ií]vel|removid[oa])[.!]?$/i;
 const unavailableLabels=[heading,...$('.alert,[class*="erro"],[class*="error"]').map((_,e)=>$(e).text().replace(/\s+/g,' ').trim()).get()];
 if(unavailableLabels.some(t=>unavailable.test(t)))return finish('expirado_link_invalido','Fonte informa anúncio indisponível ou removido');
 if(/im[oó]vel n[aã]o est[aá] mais dispon[ií]vel|im[oó]vel n[aã]o se encontra dispon[ií]vel|im[oó]vel que voc[eê] procura n[aã]o foi encontrado/i.test(visibleText))return finish('expirado_link_invalido','Fonte informa imóvel não disponível');
 if(/^(?:im[oó]vel|lote|an[uú]ncio|p[aá]gina)\s+n[aã]o\s+encontrad[oa][.!]?$/i.test(heading))return finish('expirado_link_invalido','Página oficial informa anúncio não encontrado');
 if($('body.page-detail.finalized').length)return finish('finalizado','Lote finalizado no detalhe oficial');
 const statusText=[heading,...$('[class*="status"],[id*="status"],[class*="situacao"],[data-status],.price .header,.badge,.alert').map((_,e)=>$(e).text().replace(/\s+/g,' ').trim()).get()];
 const closed=/^(?:(?:status|situa[cç][aã]o)\s*:?\s*)?(?:(?:este\s+)?(?:lote|leil[aã]o)\s+(?:est[aá]\s+)?)?(?:arrematad[oa]|encerrad[oa]|cancelad[oa]|suspens[oa]|sustad[oa]|finalizad[oa]|vendid[oa]|retirad[oa])(?:\s+(?:judicialmente|pelo vendedor))?[.!]?$/i;
 // Scan short visible text blocks as well; legal clauses and instructions are not status labels.
 $('span,strong,b,h2,h3,p,div').each((_,e)=>{if($(e).children().length===0){const t=$(e).text().replace(/\s+/g,' ').trim();if(t.length<100)statusText.push(t);}});
 if(statusText.some(t=>closed.test(t)))return finish('finalizado','Encerramento explícito no DOM do lote');
 const extra=[...$('body').text().matchAll(/(?:[123][ºªo°]|primeir[oa]|segund[oa]|terceir[oa]|nova)\s*(?:pra[cç]a|leil[aã]o|rodada)[^\d]{0,60}(\d{1,2})\/(\d{1,2})\/(20\d{2})/gi)].map(m=>`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
 if(expiredRounds([...(context.dates||[]),...extra],context.saleMode,now))return finish('expirado_por_data','Todas as rodadas publicadas transcorreram, sem nova rodada futura');
 if(statusText.some(t=>/^(?:(?:lote|leil[aã]o)\s+)?(?:aberto(?: para lances)?|em andamento|dispon[ií]vel|liberado para lance)$/i.test(t)))return {...base,state:'active',status:'ativo',reason:'Disponibilidade explícita na fonte'};
 return {...previous,...base,state:previous?.state||'unknown',reason:'Página acessível; situação não confirmada'};
}
export const isExpiredAuction = (a: any, now = new Date().toISOString()): boolean => {
  if (!a) return false;

  if (a.availability?.state === 'closed' || a.availability?.state === 'removed') return true;
  if (a.sourceAvailability?.state === 'closed' || a.sourceAvailability?.state === 'removed') return true;
  if (a.sourceClosed === true) return true;
  if (a.status && /arrematad|encerrad|cancelad|suspens|sustad|finalizad|vendid|retirad|expirad/i.test(a.status)) return true;
  if (a.ingestionStatus === 'expirado_por_data' || a.ingestionStatus === 'expirado_link_invalido' || a.ingestionStatus === 'finalizado') return true;

  const mode = `${a.saleMode || ''} ${a.title || ''}`;
  if (/venda direta|proposta continuada|venda online cont/i.test(mode)) {
    return false;
  }

  const rawDates = lifecycleDates(a);
  if (rawDates.length === 0) return false;

  const nowMs = Date.parse(now);
  const parsedDates = rawDates.map(dayEnd).filter(Number.isFinite);
  if (parsedDates.length > 0 && parsedDates.every(d => d < nowMs)) {
    return true;
  }
  return false;
};

export const isRetired = (a: any) =>
  a?.availability?.state === 'closed' ||
  a?.availability?.state === 'removed' ||
  a?.sourceClosed === true ||
  isExpiredAuction(a);

