import { AuctionProperty } from '../types.ts';
import communityCentroidsRaw from './communityCentroids.json';

export interface CommunityRiskResult {
  isRisk: boolean;
  level: 'safe' | 'warning' | 'high_risk';
  communityName?: string;
  faction?: string;
  distanceMeters?: number;
  badgeLabel?: string;
}

interface CommunityPoint {
  n: string;
  f: string;
  lat: number;
  lng: number;
}

const communityCentroids = communityCentroidsRaw as CommunityPoint[];

const RISK_KEYWORDS = [
  'morro', 'favela', 'comunidade', 'complexo', 'beco', 'travessa da paz',
  'rocinha', 'vidigal', 'macacos', 'alemao', 'alemão', 'mare', 'maré',
  'jacarezinho', 'vila cruzeiro', 'manguinhos', 'cidade de deus', 'gardênia',
  'rio das pedras', 'serrinha', 'juramento', 'turano', 'borei', 'borel',
  'mangueira', 'chapeu mangueira', 'chapéu mangueira', 'babilonia', 'babilônia',
  'cantagalo', 'pavao', 'pavão', 'pavaozinho', 'pavãozinho', 'dona marta',
  'santa marta', 'parada de lucas', 'vigario geral', 'vigário geral',
  'vila alianca', 'vila aliança', 'senador camara', 'senador camará',
  'coreia', 'coréia', 'antares', 'rollas', 'muquico', 'muquiço',
  'fazendinha', 'nova holanda', 'baixa do sapateiro', 'parque uniao', 'parque união',
  'arara', 'arará', 'kelson', 'varginha', 'chapa', 'morro do amor', 'sapo', 'dende', 'dendê'
];

export function checkPropertyCommunityRisk(
  prop: Partial<AuctionProperty>,
  resolvedCoords?: [number, number]
): CommunityRiskResult {
  const fullText = `${prop.title || ''} ${prop.address || ''} ${prop.neighborhood || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  for (const kw of RISK_KEYWORDS) {
    const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const regex = new RegExp(`\\b${kwNorm}\\b`, 'i');
    if (regex.test(fullText)) {
      return {
        isRisk: true,
        level: 'high_risk',
        communityName: kw.toUpperCase(),
        badgeLabel: '⚠️ Em Comunidade / Área de Risco'
      };
    }
  }

  const lat = prop.lat || (resolvedCoords ? resolvedCoords[0] : null);
  const lng = prop.lng || (resolvedCoords ? resolvedCoords[1] : null);

  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    let closestPoint: CommunityPoint | null = null;
    let minDistanceKm = Infinity;

    for (const c of communityCentroids) {
      if (Math.abs(lat - c.lat) > 0.009 || Math.abs(lng - c.lng) > 0.009) continue;

      const dLat = (lat - c.lat) * 111.32;
      const dLng = (lng - c.lng) * 111.32 * Math.cos((lat * Math.PI) / 180);
      const distKm = Math.hypot(dLat, dLng);

      if (distKm < minDistanceKm) {
        minDistanceKm = distKm;
        closestPoint = c;
      }
    }

    if (closestPoint) {
      const distMeters = Math.round(minDistanceKm * 1000);
      // Regra Estrita Solicitada: Fator de comunidade SÓ se aplica dentro ou até 100m.
      // Passou de 100m, NÃO é considerado risco de comunidade!
      if (distMeters <= 100) {
        return {
          isRisk: true,
          level: 'high_risk',
          communityName: closestPoint.n,
          faction: closestPoint.f || undefined,
          distanceMeters: distMeters,
          badgeLabel: `⚠️ Em Comunidade / ${distMeters}m (${closestPoint.n}${closestPoint.f ? ` - ${closestPoint.f}` : ''})`
        };
      }
    }
  }

  return {
    isRisk: false,
    level: 'safe'
  };
}
