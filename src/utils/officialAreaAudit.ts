export interface AreaEvidence { value: number; kind: string; excerpt: string; approximate: boolean }
export interface AreaAudit { status: 'confirmed'|'approximate'|'conflict'|'missing'; sourceUrl: string; checkedAt: string; selected?: AreaEvidence; candidates: AreaEvidence[]; extractedValue?: number; disagrees: boolean }
const numeric = (s: string) => Number(s.includes(',') ? s.replace(/\./g,'').replace(',','.') : /^\d{1,3}(?:\.\d{3})+$/.test(s) ? s.replace(/\./g,'') : s);

// Independent evidence check: retain every labelled measurement instead of
// accepting the first number in the title or silently substituting 50 m².
export function auditOfficialArea(input: {text:string;title:string;propertyType:string;url:string;structuredSizes?:number[];extractedValue?:number}): AreaAudit {
 let candidates:AreaEvidence[]=[];
 const add=(value:number,kind:string,excerpt:string)=>{if(Number.isFinite(value)&&value>0)candidates.push({value,kind,excerpt:excerpt.trim().slice(0,220),approximate:/aproxim|cerca de|estimad/i.test(excerpt)});};
 const text=input.text.split(/Outros lotes|Lotes relacionados|Veja também|Imóveis similares/i)[0];
 const label='(?:[aá]rea\\s+(?:privativa|[uú]til|constru[ií]da|edificada|total|comum|do\\s+terreno|de\\s+terreno)(?:\\s*\\([^)]*\\))?|metragem\\s+constru[ií]da)';
 const amount='(\\d+(?:[.,]\\d+)*)';
 const unit='(?:m[²2]|m\\.q\\.|metros?\\s+quadrados?|ha|hectares?)';
 const kind=(s:string)=>/comum/i.test(s)?'common':/terreno/i.test(s)?'land':/privativa/i.test(s)?'private':/[uú]til/i.test(s)?'usable':/constru|edificada/i.test(s)?'built':'total';
 // Caixa's official CSV expresses these named area columns in square metres,
 // e.g. "52.01 de área privativa". This convention is source-specific.
 if (/^https:\/\/venda-imoveis\.caixa\.gov\.br\//i.test(input.url)) {
  for(const m of text.matchAll(new RegExp(amount+'\\s+de\\s+('+label+')','gi')))add(numeric(m[1]),kind(m[2]),m[0]);
 }

 for(const m of text.matchAll(new RegExp('('+label+')\\s*(?:aproximad[ao](?:mente)?|de)?\\s*[:=]?\\s*'+amount+'\\s*('+unit+')','gi')))add(numeric(m[2])*(/ha|hectare/i.test(m[3])?10000:1),kind(m[1]),m[0]);
 for(const m of text.matchAll(new RegExp(amount+'\\s*('+unit+')\\s+de\\s+('+label+')','gi')))add(numeric(m[1])*(/ha|hectare/i.test(m[2])?10000:1),kind(m[3]),m[0]);
 for(const m of text.matchAll(new RegExp('[aá]rea\\s+de\\s*'+amount+'\\s*('+unit+')','gi')))add(numeric(m[1])*(/ha|hectare/i.test(m[2])?10000:1),'unspecified',m[0]);
 const land=/Terreno|Gleba|Fazenda/i.test(input.propertyType);
 for(const m of text.matchAll(new RegExp('(?:possui|mede|medindo)\\s+(?:aproximadamente\\s+)?'+amount+'\\s*('+unit+')','gi'))){const ctx=text.slice(Math.max(0,(m.index??0)-55),m.index??0);add(numeric(m[1])*(/ha|hectare/i.test(m[2])?10000:1),!land&&/terreno|fra[cç][aã]o\s+ideal|loteamento|gleba|condom[ií]nio/i.test(ctx)?'land':'unspecified',ctx.trim().slice(-25)+' '+m[0]);}
 for(const m of text.matchAll(new RegExp('totalizando\\s+(?:aproximadamente\\s+)?'+amount+'\\s*('+unit+')','gi'))){const ctx=text.slice(Math.max(0,(m.index??0)-110),m.index??0);const isBuildingCtx=/edifica[cç][aã]o|constru[ií]d|privativ|coberta/i.test(ctx);if(!/vaga|garagem|box|fra[cç][aã]o\s+ideal|[aá]rea\s+comum|terreno|condom[ií]nio/i.test(ctx)&&(isBuildingCtx||!/frente\s+e\s+fundos/i.test(ctx)))add(numeric(m[1])*(/ha|hectare/i.test(m[2])?10000:1),isBuildingCtx?'built':'unspecified',ctx.trim().slice(-30)+' '+m[0]);}
 // Explicit property measurements such as "Apartamento com 60m²" are evidence,
 // even when the description does not repeat the word "área".
 for(const m of text.matchAll(new RegExp('(?:apartamento|apto\\.?|casa|sala|unidade(?:\\s+aut[oô]noma)?)\\s+com\\s+(?:aproximadamente\\s+)?'+amount+'\\s*(m[²2]|m\\.q\\.|metros?\\s+quadrados?)','gi')))add(numeric(m[1]),'unspecified',m[0]);
 for(const m of text.matchAll(new RegExp('\\b(privativa|priv\\.|constru[ií]da|constr\\.|edificada|terreno|terr\\.)(?:\\s*\\([^)]*\\))?\\s*(?:estimada|aproximada|de)?\\s*[:=]?\\s*'+amount+'\\s*('+unit+')','gi')))add(numeric(m[2])*(/ha|hectare/i.test(m[3])?10000:1),/^priv/i.test(m[1])?'private':/^terr/i.test(m[1])?'land':'built',m[0]);
 const titleForUnit = land ? input.title : input.title.replace(/\([^)]*\bterreno\b[^)]*\)/gi, '');
 for(const m of titleForUnit.matchAll(new RegExp(amount+'\\s*('+unit+')','gi')))add(numeric(m[1])*(/ha|hectare/i.test(m[2])?10000:1),'title',m[0]);
 for(const value of input.structuredSizes||[])add(value,'structured','Área publicada nos dados estruturados do lote');

 const ranks=land?['land','total','unspecified','structured','title']:['private','usable','built','structured','unspecified','title','total'];
 const refValues=candidates.filter(c=>c.kind==='title'||c.kind==='structured').map(c=>c.value);
 const approxEq=(a:number,b:number)=>Math.abs(a-b)/Math.max(a,b,1)<=0.015;
 let selected:AreaEvidence|undefined;let conflict=false;
 for(const rank of ranks){
  const group=candidates.filter(c=>c.kind===rank);if(!group.length)continue;
  const unique=[...new Set(group.map(c=>c.value))];
  if(unique.length>1){
   const matched=unique.filter(v=>refValues.some(r=>approxEq(v,r)));
   if(matched.length===1){selected=group.find(c=>c.value===matched[0]);break;}
   const max=Math.max(...unique),min=Math.min(...unique);
   if((max-min)/Math.max(max,1)<=0.015){selected=group[0];break;}
   conflict=true;break;
  }
  selected=group[0];break;
 }
 if(selected?.kind==='total'&&!land)selected={...selected,approximate:true};
 const status=conflict?'conflict':!selected?'missing':selected.approximate?'approximate':'confirmed';
 return {status,sourceUrl:input.url,checkedAt:new Date().toISOString(),selected,candidates,extractedValue:input.extractedValue,disagrees:Boolean(selected&&input.extractedValue&&Math.abs(selected.value-input.extractedValue)>0.01)};
}
