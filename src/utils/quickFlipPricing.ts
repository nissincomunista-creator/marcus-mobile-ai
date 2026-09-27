/** Shared pricing steps for the calculator's 60-day flip and the auction card. */
export function buildingAgeDepreciationPercent(age: number | null | undefined): number {
  if (!Number.isFinite(age) || age === null || age === undefined || age <= 12) return 0;
  if (age <= 20) return Number((1 + ((age - 12) / 8) * 0.5).toFixed(1));
  if (age <= 35) return Number((1.6 + ((age - 21) / 14) * 1.2).toFixed(1));
  if (age <= 50) return Number((2.9 + ((age - 36) / 14) * 1.1).toFixed(1));
  return Number(Math.min(5, 4.5 + Math.min(0.5, ((age - 50) / 20) * 0.5)).toFixed(1));
}

/** Converts the already-selected 60-day per-m² flip benchmark to the card total. */
export function calculateQuickFlipTotal(options: {
  basePerSqm: number;
  sizeSqm: number;
  depreciationPercent?: number;
  communityRisk?: boolean;
}): number {
  const { basePerSqm, sizeSqm, depreciationPercent = 0, communityRisk = false } = options;
  if (!(basePerSqm > 0) || !(sizeSqm > 0)) return 0;
  const ageFactor = Math.max(0, 1 - depreciationPercent / 100);
  const territorialFactor = communityRisk ? 0.85 : 1;
  return Math.round(Math.round(basePerSqm * ageFactor * territorialFactor) * sizeSqm);
}

/** Same factors and rounding for Juiz de Fora's absolute-price benchmark. */
export function calculateQuickFlipAbsoluteTotal(options: {
  baseTotal: number;
  depreciationPercent?: number;
  communityRisk?: boolean;
}): number {
  const { baseTotal, depreciationPercent = 0, communityRisk = false } = options;
  if (!(baseTotal > 0)) return 0;
  return Math.round(baseTotal * Math.max(0, 1 - depreciationPercent / 100) * (communityRisk ? 0.85 : 1));
}
