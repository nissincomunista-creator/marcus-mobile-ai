const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const token=(v:string)=>v.replace(/^0+(?=\d)/,'');

export interface PropertyKeyFields {
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  processNumber?: string;
  id?: string;
  propertyType?: string;
  title?: string;
  description?: string;
  auctionLink?: string;
  origin?: string;
}

/**
 * Motor de Desduplicação Canônico:
 * - Caixa: CAIXA_{numero_imovel}
 * - Judicial: JUD_{processo}_{lote}
 * - Fallback: ADDR_{bairro}_{logradouro}_{numero}_{complemento}
 */
export function getCanonicalPropertyKey(fields: PropertyKeyFields): string | null {
  const normStr = (s?: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const combined = `${fields.title || ''}\n${fields.description || ''}\n${fields.auctionLink || ''}\n${fields.id || ''}`;
  const isCaixa = fields.origin === 'caixa' || /caixa(?:\s+econ[oô]mica|\s+federal|\s*cef|\.gov|\b)/i.test(combined);

  // 1. CAIXA: CAIXA_{numero_imovel}
  if (isCaixa) {
    const caixaMatch = (fields.id || '').match(/caixa[_-](\d{6,18})/i)
      || (fields.auctionLink || '').match(/(?:hdnimovel=|imovel-caixa[a-z0-9-]*|cef[a-z0-9-]*|detalhe-imovel\.asp\?hdnimovel=)(\d{6,18})/i)
      || combined.match(/\[['"]?(\d{10,16})['"]?\]/)
      || combined.match(/\b(?:im[oó]vel\s+(?:n[ºo°.]*\s*)?|cef\s+|caixa\s+|n[ºo°.]\s*im[oó]vel\s*)(\d{10,16})\b/i);
    
    if (caixaMatch) {
      return `CAIXA_${caixaMatch[1]}`;
    }
  }

  // 2. JUDICIAL: JUD_{processo}_{lote}
  const isJudicial = fields.origin === 'judicial' || /judicial|vara\s+c[ií]vel|execu[cç][aã]o\s+fiscal/i.test(combined);
  const processMatch = (fields.processNumber || '').replace(/\D/g, '')
    || combined.match(/\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/)?.[1]?.replace(/\D/g, '')
    || combined.match(/\bprocesso\s*(?:n[ºo°.]*)?\s*:?\s*(\d{15,25})\b/i)?.[1]?.replace(/\D/g, '');

  if (isJudicial && processMatch && processMatch.length >= 10) {
    const loteMatch = combined.match(/\blote\s*(?:n[ºo°.]*)?\s*:?\s*(\d+[a-z]?)\b/i)?.[1]
      || (fields.auctionLink || '').match(/[?&]lote=(\d+)/i)?.[1]
      || '01';
    return `JUD_${processMatch}_${loteMatch.padStart(2, '0')}`;
  }

  // 3. Fallback: ADDR_{bairro}_{logradouro}_{numero}_{complemento}
  const addr = fields.address || '';
  if (addr) {
    const text = normalize(addr).replace(/(\d)\.(?=\d{3}\b)/g, '$1');
    const explicitNumbers = [/\b(?:numero|num|n)[ºo°.]*\s*[:.-]?\s*(\d+[a-z]?)\b/i.exec(text), /,\s*(\d+[a-z]?)\b/.exec(text)]
      .filter((m): m is RegExpExecArray => Boolean(m))
      .sort((a, b) => a.index - b.index)
      .map(m => ({ 0: m[0], 1: m[1], index: m.index }));
    
    let number = explicitNumbers[0];
    if (!number) {
      const beforeUnit = text.split(/\b(?:apartamento|apto|apt|ap|unidade|und|bloco|bl|sala|loja|casa|lote|lt|quadra|qd)\b/)[0];
      const candidates = [...beforeUnit.matchAll(/\b(\d+[a-z]?)\b/g)];
      const candidate = candidates.at(-1);
      const tail = candidate ? beforeUnit.slice(candidate.index! + candidate[0].length) : '';
      if (candidate && !/^\s+(?:de|do|da|dos|das)\b/.test(tail)) {
        number = { 0: candidate[0], 1: candidate[1] || '', index: candidate.index! };
      }
    }

    const street = number
      ? text.slice(0, number.index).replace(/[,\s]+$/, '').replace(/^(?:rua|r\.|avenida|av\.?|estrada|estr\.?|travessa|trav\.?|praca|alameda)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim()
      : text.split(/[,;\-]/)[0].replace(/^(?:rua|r\.|avenida|av\.?|estrada|estr\.?|travessa|trav\.?|praca|alameda)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();

    const rest = [number ? text.slice(number.index + number[0].length) : '', normalize(fields.title || ''), normalize(fields.description || '')].filter(Boolean).join(' ');
    const specs: [string, RegExp][] = [
      ['apto', /\b(?:apartamento|apto|apt|ap|unidade|und)\.?\s*(?:n[ºo°.]*\s*)?[:.-]?\s*(\d+[a-z]?)\b/],
      ['bloco', /\b(?:bloco|bl)\.?\s*[:.-]?\s*([a-z0-9]+)\b/],
      ['sala', /\b(?:sala|loja)\s*[:.-]?\s*(\d+[a-z]?)\b/],
      ['casa', /\b(?:casa)\s*[:.-]?\s*(\d+[a-z]?)\b/],
      ['lote', /\b(?:lote|lt)\.?\s*[:.-]?\s*([a-z0-9]+)\b/],
      ['quadra', /\b(?:quadra|qd)\.?\s*[:.-]?\s*([a-z0-9]+)\b/]
    ];
    const units = specs.flatMap(([kind, re]) => { const m = rest.match(re); return m ? [kind + '_' + token(m[1])] : []; });

    const bairroClean = normStr(fields.neighborhood) || normStr((addr.match(/\b(?:bairro|b\.)\s*[:\-]?\s*([^,;\-]+)/i) || [])[1]);
    const streetClean = normStr(street);
    const numClean = number ? token(number[1]) : '';
    const compClean = units.join('_');

    if (bairroClean && streetClean) {
      return `ADDR_${bairroClean}_${streetClean}_${numClean}${compClean ? '_' + compClean : ''}`.replace(/_+/g, '_').replace(/^_|_$/g, '');
    }
  }

  return null;
}

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
