import fs from 'node:fs';import {RIO_DE_JANEIRO_BAIRROS,NITEROI_BAIRROS,JUIZ_DE_FORA_BAIRROS} from '../src/utils/geoCoords.ts';
import {isUsableNeighborhoodLabel} from '../src/utils/locationSanitizers.ts';
export const normalize=(s:string)=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const catalogs:Record<string,string[]>={'rio de janeiro':Object.keys(RIO_DE_JANEIRO_BAIRROS),'niteroi':Object.keys(NITEROI_BAIRROS),'juiz de fora':Object.keys(JUIZ_DE_FORA_BAIRROS)};
let extra:Record<string,string[]>={};export function configureNeighborhoods(rows:Array<{city?:string;neighborhood:string}>){extra={};for(const r of rows)if(r.city&&isUsableNeighborhoodLabel(r.neighborhood)){const k=normalize(r.city),value=normalize(r.neighborhood);if(!value||value===k)continue;extra[k]||=[];if(!extra[k].includes(r.neighborhood))extra[k].push(r.neighborhood);}}
const distance=(a:string,b:string)=>{let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+Number(a[i-1]!==b[j-1]));row=next;}return row[b.length];};
export function neighborhoodEvidence(input:{city:string;state?:string;neighborhood?:string;title?:string;address?:string;description?:string}) {
 const cityKey=normalize(input.city),catalogNames=catalogs[cityKey]||[];
 const specificHits=(names:string[],text:string)=>{
  const hits=names.filter(name=>(' '+text+' ').includes(' '+normalize(name)+' '));
  return hits.filter(name=>!hits.some(other=>normalize(other)!==normalize(name)&&normalize(other).includes(normalize(name))));
 };
 const addressText=normalize(input.address||'');
 const catalogAddressHits=specificHits(catalogNames,addressText);
 // Only the municipality's curated neighborhood list may override a stale
 // stored label based on the source address. ITBI neighborhood values can be
 // malformed (for example, the city name or a unit number).
 if(catalogAddressHits.length===1)return {value:catalogAddressHits[0],method:'endereco-enum'};
 if(catalogAddressHits.length>1)return undefined;
 const canonicalNames=new Map<string,string>();
 for(const name of [...catalogNames,...(extra[cityKey]||[])])if(isUsableNeighborhoodLabel(name)&&!canonicalNames.has(normalize(name)))canonicalNames.set(normalize(name),name);
 const names=[...canonicalNames.values()];
 const addressHits=specificHits(names,addressText);
 if(addressHits.length===1)return {value:addressHits[0],method:'endereco-enum'};
 if(addressHits.length>1)return undefined;
 const text=[input.title,input.address,input.description].filter(Boolean).join(' ');const declared=input.description?.match(/bairro\s*[:\-]\s*([^\n,;]+)/i)?.[1]||'';
 const candidates=[declared,input.neighborhood||''].map(value=>value.replace(/^bairro\s*[:\-]?\s*/i,'')).filter(isUsableNeighborhoodLabel);
 for(const value of candidates){const exact=names.find(n=>normalize(n)===normalize(value));if(exact)return {value:exact,method:'enum-exato'};}
 const hits=names.filter(n=>(' '+normalize(text)+' ').includes(' '+normalize(n)+' '));
 const specific=hits.filter(n=>!hits.some(other=>normalize(other)!==normalize(n)&&normalize(other).includes(normalize(n))));
 if(specific.length===1)return {value:specific[0],method:'texto-enum'};
 for(const value of candidates.filter(v=>normalize(v).length>=6)){const hits=names.filter(n=>distance(normalize(n),normalize(value))<=1);if(hits.length===1)return {value:hits[0],method:'enum-fuzzy-distancia-1'};}
 return undefined;
}
export function internalCep(cep:string):{logradouro?:string;bairro?:string;cidade?:string;uf?:string}|undefined {
 try{const db=JSON.parse(fs.readFileSync('cep_cache.json','utf8'));const row=db[cep.replace(/\D/g,'')];return row;}catch{return undefined;}
}
export function enrichLocation<T extends {city:string;state?:string;neighborhood?:string;title?:string;address?:string;description?:string}>(draft:T):T {
 const direct=neighborhoodEvidence(draft);if(direct)return {...draft,neighborhood:direct.value};
 const text=[draft.address,draft.description].filter(Boolean).join(' ');const cep=text.match(/\b(\d{5})-?(\d{3})\b/);const row=cep?internalCep(cep[1]+cep[2]):undefined;
 if(row&&normalize(row.cidade||'')===normalize(draft.city)&&(!draft.state||row.uf===draft.state)){
  const enriched={...draft,neighborhood:row.bairro,address:draft.address||row.logradouro};const verified=neighborhoodEvidence(enriched);if(verified)return {...enriched,neighborhood:verified.value};
 }
 return {...draft,neighborhood:''};
}
