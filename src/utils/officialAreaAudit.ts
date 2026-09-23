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
 const unit='(?:m[²2]|metros?\\s+quadrados?|ha|hectares?)';
 const kind=(s:string)=>/comum/i.test(s)?'common':/terreno/i.test(s)?'land':/privativa/i.test(s)?'private':/[uú]til/i.test(s)?'usable':/constru|edificada/i.test(s)?'built':'total';

 for(const m of text.matchAll(new RegExp('('+label+')\\s*(?:aproximad[ao](?:mente)?|de)?\\s*[:=]?\\s*'+amount+'\\s*('+unit+')','gi')))add(numeric(m[2])*(/ha|hectare/i.test(m[3])?10000:1),kind(m[1]),m[0]);
 for(const m of text.matchAll(new RegExp(amount+'\\s*('+unit+')\\s+de\\s+('+label+')','gi')))add(numeric(m[1])*(/ha|hectare/i.test(m[2])?10000:1),kind(m[3]),m[0]);
 for(const m of text.matchAll(new RegExp('[aá]rea\\s+de\\s*'+amount+'\\s*('+unit+')','gi')))add(numeric(m[1])*(/ha|hectare/i.test(m[2])?10000:1),'unspecified',m[0]);
 for(const m of text.matchAll(new RegExp('(?:possui|mede|medindo)\\s+(?:aproximadamente\\s+)?'+amount+'\\s*('+unit+')','gi')))add(numeric(m[1])*(/ha|hectare/i.test(m[2])?10000:1),'unspecified',m[0]);
 for(const m of text.matchAll(new RegExp('\\b(privativa|priv\\.|constru[ií]da|constr\\.|edificada|terreno|terr\\.)(?:\\s*\\([^)]*\\))?\\s*(?:estimada|aproximada|de)?\\s*[:=]?\\s*'+amount+'\\s*('+unit+')','gi')))add(numeric(m[2])*(/ha|hectare/i.test(m[3])?10000:1),/^priv/i.test(m[1])?'private':/^terr/i.test(m[1])?'land':'built',m[0]);
 for(const m of input.title.matchAll(new RegExp(amount+'\\s*('+unit+')','gi')))add(numeric(m[1])*(/ha|hectare/i.test(m[2])?10000:1),'title',m[0]);
 for(const value of input.structuredSizes||[])add(value,'structured','Área publicada nos dados estruturados do lote');

 const land=/Terreno|Gleba|Fazenda/i.test(input.propertyType);
 if (!land) {
   // Filter out condominium terrain measurements for apartments/commercial
   const hasBuiltOrPrivate = candidates.some(c => (c.kind === 'private' || c.kind === 'usable' || c.kind === 'built') && c.value > 10 && c.value <= 800);
   if (hasBuiltOrPrivate) {
     candidates = candidates.filter(c => c.kind !== 'land' && c.value <= 800);
   }
 }

 const ranks=land?['land','total','unspecified','structured','title']:['private','usable','built','structured','unspecified','title'];
 let selected:AreaEvidence|undefined;let conflict=false;
 for(const rank of ranks){const group=candidates.filter(c=>c.kind===rank);if(!group.length)continue;const unique=new Set(group.map(c=>c.value));if(unique.size>1){conflict=true;break;}selected=group[0];break;}
 const status=conflict?'conflict':!selected?'missing':selected.approximate?'approximate':'confirmed';
 return {status,sourceUrl:input.url,checkedAt:new Date().toISOString(),selected,candidates,extractedValue:input.extractedValue,disagrees:Boolean(selected&&input.extractedValue&&Math.abs(selected.value-input.extractedValue)>0.01)};
}
