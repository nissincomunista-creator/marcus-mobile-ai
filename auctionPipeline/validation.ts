import fs from 'node:fs';import {load} from 'cheerio';import {enrichLocation} from './location.ts';import {quarantine,resolveQuarantine} from './quarantine.ts';import {assessAvailability,isRetired} from './lifecycle.ts';
import {declaredAuctionLocation} from '../src/utils/auctionLocation.ts';
import {normalize} from './location.ts';
export function validateDraft<T extends {auctionLink:string;title:string;description?:string;city:string;state:string;neighborhood?:string;address?:string;auctionPrice:number;priceVerified?:boolean;sourceVerified?:boolean;originVerified?:boolean;sourceClosed?:boolean;sourceAvailability?:any;sourceEvidencePath?:string;firstAuctionDate?:string;secondAuctionDate?:string;thirdAuctionDate?:string;auctionDate?:string;saleMode?:string}>(input:T,options:{persist?:boolean;now?:string}={}) {
 const draft=enrichLocation(input);let html='';if(draft.sourceEvidencePath){try{html=fs.readFileSync(draft.sourceEvidencePath,'utf8');}catch{}}
 const visible=load(html);visible('script,style,nav,footer,aside,[hidden],[class*="related"],[class*="recommend"]').remove();
 const third=visible('body').text().match(/(?:3[ºªo°]|terceir[oa]|nova)\s*(?:pra[cç]a|leil[aã]o|rodada)[^\d]{0,60}(\d{1,2})\/(\d{1,2})\/(20\d{2})/i);
 if(third)draft.thirdAuctionDate=`${third[3]}-${third[2].padStart(2,'0')}-${third[1].padStart(2,'0')}`;
 const life=draft.sourceAvailability||assessAvailability(undefined,draft.auctionLink,200,html,options.now,{dates:[draft.firstAuctionDate,draft.secondAuctionDate,draft.thirdAuctionDate,draft.auctionDate].filter(Boolean) as string[],saleMode:draft.saleMode});
 const dated=assessAvailability(life,draft.auctionLink,200,html,options.now,{dates:[draft.firstAuctionDate,draft.secondAuctionDate,draft.thirdAuctionDate,draft.auctionDate].filter(Boolean) as string[],saleMode:draft.saleMode});
 if(draft.sourceClosed||isRetired({availability:dated})){const retired=draft.sourceClosed&&!isRetired({availability:dated})?{...dated,state:'closed' as const,status:'finalizado' as const,reason:'Encerramento confirmado pelo adaptador oficial'}:dated;return {draft:{...draft,sourceClosed:true,sourceAvailability:retired},accepted:false,retired:true,reasons:[retired.reason]};}
 const reasons:string[]=[];
 const declared=declaredAuctionLocation(draft);
 if(declared&&(normalize(declared.city)!==normalize(draft.city)||declared.state!==draft.state))reasons.push('localidade_divergente_do_detalhe');
 if(!(Number.isFinite(draft.auctionPrice)&&draft.auctionPrice>0&&draft.priceVerified===true))reasons.push('preco_minimo_nao_confirmado');
 if(!draft.neighborhood)reasons.push('bairro_nao_confirmado');
 if(!draft.address||!/\d/.test(draft.address))reasons.push('endereco_incompleto');
 if(!draft.sourceVerified)reasons.push('detalhe_oficial_nao_confirmado');
 if(!draft.originVerified)reasons.push('modalidade_nao_confirmada');
 if(options.persist!==false){if(reasons.length)quarantine(draft as any,reasons,html);else resolveQuarantine(draft.auctionLink);}
 return {draft:{...draft,sourceAvailability:dated},accepted:!reasons.length,retired:false,reasons};
}
export const catalogEligible=(a:{auctionPrice?:number;priceVerified?:boolean;neighborhood?:string;ingestionStatus?:string;availability?:any})=>!isRetired(a)&&a.ingestionStatus!=='quarentena_extracao'&&Number(a.auctionPrice)>0&&a.priceVerified===true&&!!a.neighborhood&&!/^(?:n[aã]o informado|desconhecido|a confirmar)$/i.test(a.neighborhood);
