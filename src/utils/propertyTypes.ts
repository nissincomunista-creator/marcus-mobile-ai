import type { PropertyType } from '../types';

export const housePattern = /\b(casa|sobrado|vila|condom[ií]nio\s+fechado|chal[eé]|bangal[oô]|casa-duplex|casa-triplex|casa-padrao)\b/i;

export interface TypologyClassification {
  propertyType: PropertyType;
  subtype: string; // e.g. 'Apartamento', 'Cobertura', 'Kitnet / Studio', 'Casa', 'Sala Comercial', 'Loja', 'Galpão', 'Terreno / Lote'
  displayPrefix: string;
}

export function detectTypologyFromUrlAndText(
  url = '',
  title = '',
  desc = ''
): TypologyClassification {
  const urlLower = (url || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();
  const descLower = (desc || '').toLowerCase();
  const combined = `${urlLower} ${titleLower} ${descLower}`;

  // 1. TERRENO / LOTE / GLEBA (prioridade alta em título e URL)
  const isTerrenoInTitleOrUrl = 
    urlLower.includes('terreno') ||
    urlLower.includes('lote-') ||
    urlLower.includes('loteamento') ||
    urlLower.includes('gleba') ||
    /\b(terreno|loteamento|gleba|lote\s+de\s+terreno|lote|área\s+de\s+terreno)\b/i.test(titleLower);

  if (isTerrenoInTitleOrUrl || (/\b(terreno|loteamento|gleba|lote\s+de\s+terreno)\b/i.test(descLower) && !titleLower.includes('apartamento') && !titleLower.includes('casa'))) {
    return {
      propertyType: 'Terreno',
      subtype: 'Terreno / Lote',
      displayPrefix: 'Terreno / Lote'
    };
  }

  // 2. COMERCIAL (SALAS, LOJAS, GALPÕES, PRÉDIOS COMERCIAIS)
  if (
    urlLower.includes('sala-comercial') ||
    urlLower.includes('conjunto-comercial') ||
    urlLower.includes('sala-a-venda') ||
    /\b(sala\s+comercial|conjunto\s+comercial|consult[oó]rio|escrit[oó]rio|sala\s+para\s+consult[oó]rio)\b/i.test(titleLower) ||
    (/\b(sala\s+comercial|conjunto\s+comercial)\b/i.test(descLower) && !titleLower.includes('apartamento'))
  ) {
    return {
      propertyType: 'Comercial',
      subtype: 'Sala Comercial',
      displayPrefix: 'Sala Comercial'
    };
  }

  if (
    urlLower.includes('loja') ||
    urlLower.includes('ponto-comercial') ||
    urlLower.includes('sobreloja') ||
    /\b(loja|ponto\s+comercial|sobreloja|box\s+comercial)\b/i.test(titleLower) ||
    (/\b(loja\s+comercial|ponto\s+comercial)\b/i.test(descLower) && !titleLower.includes('apartamento'))
  ) {
    return {
      propertyType: 'Comercial',
      subtype: 'Loja',
      displayPrefix: 'Loja Comercial'
    };
  }

  if (
    urlLower.includes('galpao') ||
    urlLower.includes('deposito') ||
    /\b(galp[aã]o|dep[oó]sito|armaz[eé]m|pavilh[aã]o)\b/i.test(titleLower) ||
    (/\b(galp[aã]o|dep[oó]sito|armaz[eé]m)\b/i.test(descLower) && !titleLower.includes('apartamento'))
  ) {
    return {
      propertyType: 'Comercial',
      subtype: 'Galpão',
      displayPrefix: 'Galpão Comercial'
    };
  }

  if (
    urlLower.includes('predio-comercial') ||
    urlLower.includes('edificio-comercial') ||
    /\b(pr[eé]dio\s+comercial|edif[ií]cio\s+comercial|im[oó]vel\s+comercial)\b/i.test(titleLower)
  ) {
    return {
      propertyType: 'Comercial',
      subtype: 'Comercial',
      displayPrefix: 'Imóvel Comercial'
    };
  }

  // 3. COBERTURA (Prioridade alta antes de Casa e Apto)
  if (titleLower.includes('cobertura') || urlLower.includes('cobertura') || descLower.includes('cobertura duplex') || descLower.includes('cobertura linear')) {
    return {
      propertyType: 'Apartamento',
      subtype: 'Cobertura',
      displayPrefix: 'Cobertura'
    };
  }

  // 4. KITNET / STUDIO / LOFT / FLAT / APART-HOTEL (Prioridade antes de Casa)
  if (/\b(kitnet|studio|loft|flat|apart-?hotel|conjugado)\b/i.test(titleLower) || /\b(kitnet|studio|loft|flat|apart-?hotel|conjugado)\b/i.test(urlLower) || /\b(apart-?hotel|flat)\b/i.test(descLower)) {
    return {
      propertyType: 'Apartamento',
      subtype: 'Kitnet / Studio',
      displayPrefix: 'Kitnet / Studio'
    };
  }

  // 5. APARTAMENTO EXPLÍCITO (Se o título ou URL contém apartamento/apto, NUNCA converter em Casa)
  const isAptoExplicit = 
    urlLower.includes('apartamento') ||
    urlLower.includes('apto') ||
    /\b(apartamento|apto|condom[ií]nio\s+edif[ií]cio|edif[ií]cio)\b/i.test(titleLower);

  if (isAptoExplicit) {
    return {
      propertyType: 'Apartamento',
      subtype: 'Apartamento',
      displayPrefix: 'Apartamento'
    };
  }

  // 6. CASAS (Apenas com menção explícita no título, URL ou início da descrição sem menção a apartamento)
  const isCasaInTitleOrUrl = 
    urlLower.includes('casa-') ||
    urlLower.includes('sobrado') ||
    urlLower.includes('casa-a-venda') ||
    housePattern.test(titleLower);

  if (isCasaInTitleOrUrl || (housePattern.test(descLower) && !titleLower.includes('apartamento') && !titleLower.includes('apto') && !urlLower.includes('apartamento'))) {
    if (!titleLower.includes('casa de festas') && !titleLower.includes('casa de show')) {
      return {
        propertyType: 'Casa',
        subtype: 'Casa',
        displayPrefix: 'Casa'
      };
    }
  }

  // 7. DEFAULT RESIDENCIAL: APARTAMENTO
  return {
    propertyType: 'Apartamento',
    subtype: 'Apartamento',
    displayPrefix: 'Apartamento'
  };
}

export function normalizePropertyType(rawType: string = '', title: string = '', desc: string = ''): 'APARTAMENTO' | 'CASA' | 'COMERCIAL' | 'TERRENO' | 'OUTRO' {
  const res = detectTypologyFromUrlAndText('', `${rawType} ${title}`, desc);
  switch (res.propertyType) {
    case 'Casa': return 'CASA';
    case 'Comercial': return 'COMERCIAL';
    case 'Terreno':
    case 'Lote': return 'TERRENO';
    default: return 'APARTAMENTO';
  }
}

export function toCanonicalPropertyType(rawType: string = '', title: string = '', desc: string = ''): PropertyType {
  const res = detectTypologyFromUrlAndText('', `${rawType} ${title}`, desc);
  return res.propertyType;
}
