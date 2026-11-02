import type { ItbiTransaction } from '../types.ts';

export function normalizeRadiusKm(value: number): number {
  return Number.isFinite(value) ? Math.max(0.1, Math.min(2, value)) : 0.5;
}

/** A radius is a circle around a confirmed address, independent of bairro boundaries. */
export function selectRadiusTransactions(rows: ItbiTransaction[], radiusKm: number): ItbiTransaction[] {
  const limit = normalizeRadiusKm(radiusKm);
  return rows.filter(tx => {
    if (tx.transactionLocationPrecision !== 'exact_number') return false;
    if (tx.distanceKm == null || tx.distanceKm === ('' as any)) return false;
    const anchor = tx.distanceAnchorPrecision as string | undefined;
    if (anchor && anchor !== 'official_address' && anchor !== 'geocoded_number' && anchor !== 'street_centroid') return false;
    const distance = Number(tx.distanceKm);
    return Number.isFinite(distance) && distance >= 0 && distance <= limit;
  });
}
