const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const token=(v:string)=>v.replace(/^0+(?=\d)/,'');

/** A building alone never identifies an apartment. Keep every unit component. */
export function propertyIdentity(address?:string,city?:string,state?:string,type?:string,context?:string):string|null {
 if(!address||!city||!state)return null;
 const text=normalize(address).replace(/(\d)\.(?=\d{3}\b)/g,'$1');
 const explicitNumbers=[/\b(?:numero|num|n)[ºo°.]*\s*[:.-]?\s*(\d+[a-z]?)\b/i.exec(text),/,\s*(\d+[a-z]?)\b/.exec(text)].filter((m):m is RegExpExecArray=>Boolean(m)).sort((a,b)=>a.index-b.index).map(m=>({0:m[0],1:m[1],index:m.index}));
 let number=explicitNumbers[0];
 if(!number){
  const beforeUnit=text.split(/\b(?:apartamento|apto|apt|ap|unidade|und|bloco|bl|sala|loja|casa|lote|lt|quadra|qd)\b/)[0];
  const candidates=[...beforeUnit.matchAll(/\b(\d+[a-z]?)\b/g)];
  const candidate=candidates.at(-1);
  const tail=candidate?beforeUnit.slice(candidate.index!+candidate[0].length):'';
  // A lone number followed by "de [mês]" is usually part of a street name
  // (Rua 7 de Setembro), not its building number.
  if(candidate&&!/^\s+(?:de|do|da|dos|das)\b/.test(tail))number={0:candidate[0],1:candidate[1]||'',index:candidate.index!};
 }
 if(!number||!number.index)return null;
 const street=text.slice(0,number.index).replace(/[,\s]+$/,'').replace(/^(?:rua|r\.|avenida|av\.?|estrada|estr\.?|travessa|trav\.?|praca|alameda)\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
 if(street.length<2)return null;
 const rest=[text.slice(number.index+number[0].length),normalize(context||'')].filter(Boolean).join(' ');
 const specs:[string,RegExp][]=[
  ['ap',/\b(?:apartamento|apto|apt|ap|unidade|und)\.?\s*(?:n[ºo°.]*\s*)?[:.-]?\s*(\d+[a-z]?)\b/],
  ['bl',/\b(?:bloco|bl)\.?\s*[:.-]?\s*([a-z0-9]+)\b/],
  ['sl',/\b(?:sala|loja)\s*[:.-]?\s*(\d+[a-z]?)\b/],
  ['cs',/\b(?:casa)\s*[:.-]?\s*(\d+[a-z]?)\b/],
  ['lt',/\b(?:lote|lt)\.?\s*[:.-]?\s*([a-z0-9]+)\b/],
  ['qd',/\b(?:quadra|qd)\.?\s*[:.-]?\s*([a-z0-9]+)\b/]
 ];
 const units=specs.flatMap(([kind,re])=>{const m=rest.match(re);return m?[kind+'-'+token(m[1])]:[];});
 if(/apartamento|comercial|cobertura|sala/i.test(type||'')&&!units.some(u=>/^(ap|sl)-/.test(u)))return null;
 return [normalize(city),normalize(state),street,token(number[1]),...units].join('|');
}
