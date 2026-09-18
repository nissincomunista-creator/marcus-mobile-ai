import { sourceAuctionLocation } from './auctionGeography.ts';
const UF = 'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO';
const normalize = (v?:string) => (v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function declaredAuctionLocation(property: {title?:string;address?:string}): {city:string;state:string}|null {
  return sourceAuctionLocation(property.title || '') || sourceAuctionLocation(property.address || '');
}
export function correctDeclaredAuctionLocation<T extends {title?:string;address?:string;city?:string;state?:string;neighborhood?:string}>(property:T):T {
  const actual = declaredAuctionLocation(property);
  if (!actual || (normalize(actual.city)===normalize(property.city) && actual.state===property.state)) return property;
  const result:any = {...property,...actual};
  const neighborhood = (property.title || '').match(/^[^/]+\/[A-Z]{2}\s*[-–]\s*(.*?)\s*[-–]\s*(?:Casa|Apartamento|Terreno|Sala|Loja|Galpão|Cobertura)\b/i)?.[1];
  result.neighborhood=neighborhood || '';
  const suffix=`, ${property.city} - ${property.state}`;
  if (result.address?.endsWith(suffix)) result.address=result.address.slice(0,-suffix.length);
  for(const key of Object.keys(result)) if (/^(itbi|calculated|venda)/.test(key) || ['officialNeighborhood','originalListedNeighborhood','divergentNeighborhoodNotice','lat','lng','mapLocation','status_geocodificacao'].includes(key)) delete result[key];
  result.estimatedValue=result.evaluationPrice || 0;
  return result;
}
