import * as SunCalc from 'suncalc';
import * as polygonClipping from 'polygon-clipping';

const pc: typeof polygonClipping = (polygonClipping as any).default || polygonClipping;

export interface SolarPositionInfo {
  hourDecimal: number;
  label: string;
  altitudeRad: number;
  altitudeDeg: number;
  /** Compass bearing (degrees clockwise from True North) toward the sun. */
  azimuthFromNorthDeg: number;
  /** Bearing toward where shadows fall (opposite of sun). */
  shadowBearingDeg: number;
  isDaylight: boolean;
  /** Normalized XY shadow offset per 1 meter of building height (meters East, meters North). */
  shadowEastPerMeter: number;
  shadowNorthPerMeter: number;
}

export function buildReferenceSolarDate(hourDecimal: number): Date {
  const wholeHours = Math.floor(hourDecimal);
  const mins = Math.round((hourDecimal - wholeHours) * 60);
  // Reference date in BRT (UTC-3) using current calendar date so solar azimuth/altitude match Brazil cleanly
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), wholeHours + 3, mins, 0));
}

export function getSolarPositionInfo(hourDecimal: number, lat: number, lng: number): SolarPositionInfo {
  const date = buildReferenceSolarDate(hourDecimal);
  const pos = SunCalc.getPosition(date, lat, lng);

  // SunCalc azimuth: radians from South, positive Westward -> compass clockwise from North
  const bearingFromNorthRad = pos.azimuth + Math.PI;
  const azimuthFromNorthDeg = ((bearingFromNorthRad * 180) / Math.PI + 360) % 360;
  const shadowBearingRad = bearingFromNorthRad + Math.PI;
  const shadowBearingDeg = (azimuthFromNorthDeg + 180) % 360;
  const altitudeDeg = (pos.altitude * 180) / Math.PI;
  const isDaylight = pos.altitude > 0.015;

  // Preserve crisp long early-morning/late-afternoon shadows while keeping low-sun length bounded
  const effectiveAlt = Math.max(pos.altitude, 0.22);
  const shadowLengthPerMeter = isDaylight ? Math.min(2.8, 1 / Math.tan(effectiveAlt)) : 0;

  const shadowEastPerMeter = shadowLengthPerMeter * Math.sin(shadowBearingRad);
  const shadowNorthPerMeter = shadowLengthPerMeter * Math.cos(shadowBearingRad);

  const hh = Math.floor(hourDecimal).toString().padStart(2, '0');
  const mm = Math.round((hourDecimal - Math.floor(hourDecimal)) * 60);
  const label = mm > 0 ? `${hh}:${mm.toString().padStart(2, '0')}` : `${hh}h`;

  return {
    hourDecimal,
    label,
    altitudeRad: pos.altitude,
    altitudeDeg: Number(altitudeDeg.toFixed(1)),
    azimuthFromNorthDeg: Number(azimuthFromNorthDeg.toFixed(1)),
    shadowBearingDeg: Number(shadowBearingDeg.toFixed(1)),
    isDaylight,
    shadowEastPerMeter,
    shadowNorthPerMeter,
  };
}

function normalizeClosedRing(ring: number[][]): [number, number][] {
  if (!ring || ring.length < 3) return [];
  const out: [number, number][] = [];
  for (let i = 0; i < ring.length; i++) {
    const pt = ring[i];
    if (!pt || pt.length < 2 || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev[0] - pt[0]) < 1e-7 && Math.abs(prev[1] - pt[1]) < 1e-7) continue;
    out.push([pt[0], pt[1]]);
  }
  if (out.length < 3) return [];
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    out.push([first[0], first[1]]);
  }
  return out.length >= 4 ? out : [];
}

function buildCleanExtrudedShadowMultiPoly(
  ring: [number, number][],
  dLng: number,
  dLat: number
): polygonClipping.MultiPolygon | null {
  try {
    const shifted: [number, number][] = ring.map(([x, y]) => [x + dLng, y + dLat]);
    const parts: polygonClipping.Geom[] = [[shifted]];
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      const sa = shifted[i];
      const sb = shifted[i + 1];
      if (!a || !b || !sa || !sb) continue;
      // Only include edge wall quads whose winding area is non-degenerate along the sun shadow vector
      const cross = (b[0] - a[0]) * dLat - (b[1] - a[1]) * dLng;
      if (Math.abs(cross) < 1e-13) continue;
      parts.push([[a, b, sb, sa, a]]);
    }
    if (parts.length === 0) return null;
    const merged = pc.union(parts[0], ...parts.slice(1));
    if (!merged || merged.length === 0) return null;
    // Subtract base building footprint so shadows cast cleanly around buildings without interior overlap
    const castOnly = pc.difference(merged, [ring]);
    return castOnly && castOnly.length > 0 ? castOnly : null;
  } catch {
    return null;
  }
}

/**
 * Computes geometrically unified, zero-overlap projected solar shadow polygons
 * across rendered 3D buildings so alpha blending stays 100% uniform (no dark smudges).
 */
export function buildViewportSolarShadowsGeoJson(
  features: Array<{ geometry?: any; properties?: any }>,
  solar: SolarPositionInfo,
  centerLat: number,
  maxFeatures = 320
): GeoJSON.FeatureCollection {
  if (!solar.isDaylight || features.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const metersPerDegLat = 110540;
  const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const perBuildingShadows: polygonClipping.MultiPolygon[] = [];
  const seenCoords = new Set<string>();

  for (let i = 0; i < features.length && perBuildingShadows.length < maxFeatures; i++) {
    const feat = features[i];
    const geom = feat?.geometry;
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

    const hRaw = Number(feat.properties?.h ?? feat.properties?.render_height ?? 7);
    const height = Number.isFinite(hRaw) && hRaw > 1.5 ? Math.min(135, hRaw) : 7;
    const dLng = (height * solar.shadowEastPerMeter) / metersPerDegLng;
    const dLat = (height * solar.shadowNorthPerMeter) / metersPerDegLat;
    if (Math.hypot(dLng, dLat) < 0.000004) continue;

    const outerRings: number[][][] =
      geom.type === 'Polygon'
        ? [geom.coordinates[0]]
        : (geom.coordinates as number[][][][]).map((p) => p[0]).filter(Boolean);

    for (const rawRing of outerRings) {
      const ring = normalizeClosedRing(rawRing);
      if (ring.length < 4) continue;
      const key = `${Math.round(ring[0][0] * 25000)}_${Math.round(ring[0][1] * 25000)}`;
      if (seenCoords.has(key)) continue;
      seenCoords.add(key);

      const shadowMP = buildCleanExtrudedShadowMultiPoly(ring, dLng, dLat);
      if (shadowMP && shadowMP.length > 0) {
        perBuildingShadows.push(shadowMP);
      }
    }
  }

  if (perBuildingShadows.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  // Global union of neighboring cast shadows guarantees zero double-opacity artifacts between adjacent buildings
  try {
    let unified: polygonClipping.MultiPolygon = perBuildingShadows[0];
    const chunkSize = 48;
    for (let i = 1; i < perBuildingShadows.length; i += chunkSize) {
      const chunk = perBuildingShadows.slice(i, i + chunkSize);
      unified = pc.union(unified, ...chunk);
    }
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'MultiPolygon',
            coordinates: unified,
          },
        },
      ],
    };
  } catch {
    return {
      type: 'FeatureCollection',
      features: perBuildingShadows.map((mp) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'MultiPolygon' as const,
          coordinates: mp,
        },
      })),
    };
  }
}
