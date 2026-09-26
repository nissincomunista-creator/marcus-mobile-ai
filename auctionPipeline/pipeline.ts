import fs from 'node:fs';import {parseSourcePage} from '../listedPortalSync.ts';import {parseOfficialLotDetail,type ScrapedAuctionDraft} from '../auctioneerSyncService.ts';import {preserveSource} from './quarantine.ts';import {validateDraft} from './validation.ts';import {assessAvailability,isRetired} from './lifecycle.ts';
/** Portal adapters -> contextual parsing -> location evidence -> lifecycle -> quarantine. */
export function extractAndValidate(input:{draft:ScrapedAuctionDraft;html:string;status:number;finalUrl?:string;now?:string;persist?:boolean}){
 const {draft,html,status}=input;
 const life=assessAvailability(undefined,draft.auctionLink,status,html,input.now,{finalUrl:input.finalUrl});
 if(isRetired({availability:life}))return {draft:{...draft,sourceClosed:true,sourceAvailability:life},accepted:false,retired:true,reasons:[life.reason]};
 if(status!==200||/captcha|Access Denied|Just a moment/i.test(html))return {draft,accepted:false,retired:false,reasons:['fonte_indisponivel']};
 const url=input.finalUrl||draft.auctionLink;const page=parseSourcePage(html,url);const sourceEvidencePath=input.persist===false?undefined:preserveSource(url,html);
 const parsed=parseOfficialLotDetail(draft,{...page,sourceEvidencePath},url);
 return validateDraft(parsed,{persist:input.persist,now:input.now});
}
