import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve('sync-audits/quarentena_extracao');
export function quarantine(draft:{auctionLink?:string;[key:string]:unknown},reasons:string[],raw?:string) {
 fs.mkdirSync(root,{recursive:true});const key=createHash('sha256').update(draft.auctionLink||JSON.stringify(draft)).digest('hex');
 const htmlPath=path.join(root,key+'.html');if(raw)fs.writeFileSync(htmlPath,raw);
 const record={key,status:'quarentena_extracao',checkedAt:new Date().toISOString(),reasons,htmlPath:fs.existsSync(htmlPath)?htmlPath:undefined,draft};
 const target=path.join(root,key+'.json');fs.writeFileSync(target+'.tmp',JSON.stringify(record,null,2));fs.renameSync(target+'.tmp',target);return record;
}
export function preserveSource(url:string,raw:string):string {
 const dir=path.resolve('sync-audits/source-evidence');fs.mkdirSync(dir,{recursive:true});const name=createHash('sha256').update(url).digest('hex')+'.html';const file=path.join(dir,name);fs.writeFileSync(file,raw);return file;
}
export function resolveQuarantine(url:string){const key=createHash('sha256').update(url).digest('hex'),file=path.join(root,key+'.json');if(fs.existsSync(file)){const row=JSON.parse(fs.readFileSync(file,'utf8'));row.status='resolvido';row.resolvedAt=new Date().toISOString();fs.writeFileSync(file+'.tmp',JSON.stringify(row,null,2));fs.renameSync(file+'.tmp',file);}}
