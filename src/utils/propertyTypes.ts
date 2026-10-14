import type { PropertyType } from '../types';

export const housePattern = /\b(casa|sobrado|moradia|residencia|vila|condom[ií]nio\s+fechado|funda[cç][aã]o|chal[eé]|bangal[oô]|im[oó]vel\s+residencial(?!\s+apto))\b/i;

export function normalizePropertyType(rawType: string = '', title: string = '', desc: string = ''): 'APARTAMENTO' | 'CASA' | 'COMERCIAL' | 'TERRENO' | 'OUTRO' {
  const fullText = `${rawType} ${title} ${desc}`.toLowerCase();
  if (fullText.includes('apartamento') || fullText.includes('apto') || fullText.includes('conjugado') || fullText.includes('kitnet') || fullText.includes('loft') || fullText.includes('cobertura')) {
    return 'APARTAMENTO';
  }
  if (housePattern.test(fullText)) {
    return 'CASA';
  }
  if (fullText.includes('comercial') || fullText.includes('sala') || fullText.includes('loja') || fullText.includes('pr[eé]dio') || fullText.includes('predio') || fullText.includes('galp')) {
    return 'COMERCIAL';
  }
  if (fullText.includes('terreno') || fullText.includes('lote') || fullText.includes('gleba')) {
    return 'TERRENO';
  }
  return 'OUTRO';
}

export function toCanonicalPropertyType(rawType: string = '', title: string = '', desc: string = ''): PropertyType {
  const norm = normalizePropertyType(rawType, title, desc);
  switch (norm) {
    case 'CASA': return 'Casa';
    case 'APARTAMENTO': return 'Apartamento';
    case 'COMERCIAL': return 'Comercial';
    case 'TERRENO': return 'Terreno';
    default: return 'Apartamento';
  }
}
