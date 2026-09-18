// Shared by the calculator and the server. Call with candidates from one city/neighborhood.
export function canonicalStreet(value?: string | null): string {
  const titles: Record<string,string> = {dr:'doutor',dra:'doutora',eng:'engenheiro',prof:'professor',profa:'professora',cel:'coronel',gen:'general',gal:'general',dep:'deputado',gov:'governador',pres:'presidente',sen:'senador',pe:'padre',sta:'santa',sto:'santo'};
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .split(',')[0].replace(/\s+n[ºo°.]?\s*\d+.*$/i,'')
    .replace(/^(rua|r|avenida|avn|av|estrada|etr|estr|est|travessa|trv|trav|praca|prc|pca|alameda|alm|al|rodovia|rod|largo)\b\.?\s*/, '')
    .replace(/[^a-z0-9]/g,' ').split(/\s+/).filter(t=>t && !['de','da','do','das','dos','e'].includes(t))
    .map(t=>titles[t] || t).join(' ');
}
function editDistance(a:string,b:string):number { let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}return row[b.length]; }
export function resolveOfficialStreet(target:string, candidates:string[]):string|null {
  const wanted=canonicalStreet(target); if(!wanted)return null;
  const unique=[...new Set(candidates)].map(street=>({street,key:canonicalStreet(street)}));
  const exact=unique.filter(c=>c.key===wanted); if(exact.length)return exact[0].street;
  const tokens=wanted.split(' ');
  const scored=unique.map(c=>{const ts=c.key.split(' ');if(ts.length!==tokens.length)return {...c,score:0};let score=0;for(let i=0;i<tokens.length;i++){const a=tokens[i],b=ts[i];if(a===b)score+=1;else if(a.length>=2 && b.length>=2 && (a.startsWith(b)||b.startsWith(a)))score+=0.9;else if(Math.min(a.length,b.length)>=5 && editDistance(a,b)===1)score+=0.85;else return {...c,score:0};}return {...c,score:score/tokens.length};}).filter(c=>c.score>=0.85).sort((a,b)=>b.score-a.score);
  if(!scored.length || (scored[1] && scored[0].key!==scored[1].key && scored[0].score-scored[1].score<0.08))return null;
  return scored[0].street;
}
