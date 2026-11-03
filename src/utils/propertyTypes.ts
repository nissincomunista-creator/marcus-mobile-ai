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

  // 0. ANÁLISE DO TOKEN PRIMÁRIO (determina tipologias oficiais diretas da Caixa ou catálogos estruturados)
  // Ex: "Apartamento, 0.00 de área total..." -> primaryToken = "apartamento"
  // Ex: "Casa, 61.00 de área total..." -> primaryToken = "casa"
  // Ex: "Terreno, 0.00 de área total..." -> primaryToken = "terreno"
  // Ex: "Loja, 50.00 de área privativa..." -> primaryToken = "loja"
  const primaryTokenDesc = (descLower.split(/[,.\s]+/)[0] || '').trim();
  const primaryTokenTitle = (titleLower.split(/[,.\s]+/)[0] || '').trim();
  const tokenCandidate = ['apartamento', 'apto', 'casa', 'sobrado', 'terreno', 'lote', 'gleba', 'loja', 'sala', 'galpao', 'galpão', 'predio', 'prédio', 'comercial'].includes(primaryTokenTitle)
    ? primaryTokenTitle
    : primaryTokenDesc;

  if (tokenCandidate === 'apartamento' || tokenCandidate === 'apto') {
    return { propertyType: 'Apartamento', subtype: 'Apartamento', displayPrefix: 'Apartamento' };
  }
  if (tokenCandidate === 'casa' || tokenCandidate === 'sobrado') {
    return { propertyType: 'Casa', subtype: 'Casa', displayPrefix: 'Casa' };
  }
  if (tokenCandidate === 'terreno' || tokenCandidate === 'lote' || tokenCandidate === 'gleba') {
    return { propertyType: 'Terreno', subtype: 'Terreno / Lote', displayPrefix: 'Terreno / Lote' };
  }
  if (['loja', 'sobreloja'].includes(tokenCandidate)) {
    return { propertyType: 'Comercial', subtype: 'Loja', displayPrefix: 'Loja Comercial' };
  }
  if (['sala', 'consultorio', 'consultório'].includes(tokenCandidate)) {
    return { propertyType: 'Comercial', subtype: 'Sala Comercial', displayPrefix: 'Sala Comercial' };
  }
  if (['galpao', 'galpão', 'deposito', 'depósito', 'armazem', 'armazém'].includes(tokenCandidate)) {
    return { propertyType: 'Comercial', subtype: 'Galpão', displayPrefix: 'Galpão Comercial' };
  }
  if (['predio', 'prédio', 'comercial'].includes(tokenCandidate)) {
    return { propertyType: 'Comercial', subtype: 'Comercial', displayPrefix: 'Imóvel Comercial' };
  }

  // 1. COBERTURA (Prioridade alta antes de Casa e Apto)
  if (titleLower.includes('cobertura') || urlLower.includes('cobertura') || descLower.includes('cobertura duplex') || descLower.includes('cobertura linear')) {
    return {
      propertyType: 'Apartamento',
      subtype: 'Cobertura',
      displayPrefix: 'Cobertura'
    };
  }

  // 2. KITNET / STUDIO / LOFT / FLAT / APART-HOTEL
  if (/\b(kitnet|studio|loft|flat|apart-?hotel|conjugado)\b/i.test(titleLower) || /\b(kitnet|studio|loft|flat|apart-?hotel|conjugado)\b/i.test(urlLower) || /\b(apart-?hotel|flat)\b/i.test(descLower)) {
    return {
      propertyType: 'Apartamento',
      subtype: 'Kitnet / Studio',
      displayPrefix: 'Kitnet / Studio'
    };
  }

  // 3. APARTAMENTO EXPLÍCITO (Se o título ou URL contém apartamento/apto, NUNCA converter em Terreno ou Casa)
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

  // 4. CASAS (Apenas com menção explícita no título, URL ou início da descrição sem menção a apartamento)
  const isCasaInTitleOrUrl = 
    urlLower.includes('casa-') ||
    urlLower.includes('sobrado') ||
    urlLower.includes('casa-a-venda') ||
    housePattern.test(titleLower);

  if (isCasaInTitleOrUrl && !titleLower.includes('apartamento') && !titleLower.includes('apto') && !urlLower.includes('apartamento')) {
    if (!titleLower.includes('casa de festas') && !titleLower.includes('casa de show')) {
      return {
        propertyType: 'Casa',
        subtype: 'Casa',
        displayPrefix: 'Casa'
      };
    }
  }

  // 5. COMERCIAL (SALAS, LOJAS, GALPÕES, PRÉDIOS COMERCIAIS)
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

  // 6. TERRENO / LOTE / GLEBA
  // NOTA CRÍTICA: "área de terreno" ou "área do terreno" é especificação de metragem e NUNCA tipologia!
  const hasTerrenoKeyword =
    urlLower.includes('terreno') ||
    urlLower.includes('lote-') ||
    urlLower.includes('loteamento') ||
    urlLower.includes('gleba') ||
    /\b(terreno|loteamento|gleba|lote\s+de\s+terreno)\b/i.test(titleLower);

  const hasTerrenoInDesc =
    /\b(terreno|loteamento|gleba|lote\s+de\s+terreno)\b/i.test(descLower) &&
    !descLower.includes('apartamento') &&
    !descLower.includes('casa') &&
    !descLower.includes('qto(s)') &&
    !descLower.includes('quarto');

  if (hasTerrenoKeyword || hasTerrenoInDesc) {
    if (!titleLower.includes('apartamento') && !titleLower.includes('apto') && !titleLower.includes('casa')) {
      return {
        propertyType: 'Terreno',
        subtype: 'Terreno / Lote',
        displayPrefix: 'Terreno / Lote'
      };
    }
  }

  // 7. CASA NA DESCRIÇÃO (quando o título é genérico mas a descrição detalha casa)
  if (housePattern.test(descLower) && !descLower.includes('apartamento') && !descLower.includes('apto')) {
    return {
      propertyType: 'Casa',
      subtype: 'Casa',
      displayPrefix: 'Casa'
    };
  }

  // 8. DEFAULT RESIDENCIAL: APARTAMENTO
  return {
    propertyType: 'Apartamento',
    subtype: 'Apartamento',
    displayPrefix: 'Apartamento'
  };
}

export function normalizePropertyType(rawType: string = '', title: string = '', desc: string = ''): 'APARTAMENTO' | 'CASA' | 'COMERCIAL' | 'TERRENO' | 'OUTRO' {
  const cleanRaw = (rawType || '').trim().toLowerCase();
  if (/^apto|^apartamento|^kitnet|^studio|^loft|^flat|^cobertura/i.test(cleanRaw)) return 'APARTAMENTO';
  if (/^casa|^sobrado|^bangal[oô]|^chal[eé]|^vila/i.test(cleanRaw)) return 'CASA';
  if (/^terreno|^loteamento|^gleba|^lote\b/i.test(cleanRaw) && !/casa|apto|apartamento/i.test(cleanRaw)) return 'TERRENO';
  if (/^sala|^loja|^galp[aã]o|^comercial|^pr[eé]dio|^box|^dep[oó]sito/i.test(cleanRaw)) return 'COMERCIAL';

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
  const cleanRaw = (rawType || '').trim().toLowerCase();
  if (/^apto|^apartamento|^kitnet|^studio|^loft|^flat|^cobertura/i.test(cleanRaw)) return 'Apartamento';
  if (/^casa|^sobrado|^bangal[oô]|^chal[eé]|^vila/i.test(cleanRaw)) return 'Casa';
  if (/^terreno|^loteamento|^gleba|^lote\b/i.test(cleanRaw) && !/casa|apto|apartamento/i.test(cleanRaw)) return 'Terreno';
  if (/^sala|^loja|^galp[aã]o|^comercial|^pr[eé]dio|^box|^dep[oó]sito/i.test(cleanRaw)) return 'Comercial';

  const res = detectTypologyFromUrlAndText('', `${rawType} ${title}`, desc);
  return res.propertyType;
}
