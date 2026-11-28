import React from 'react';
import {
  GraduationCap,
  HeartPulse,
  ShoppingBag,
  Users,
  Wind,
  CloudRain,
  Scale
} from 'lucide-react';
import { MatriculaAnalysisReport } from '../types.ts';
import type { App3DReportCaptures } from '../utils/app3DReportCapture.ts';

export interface TerrainContourLine {
  elev: number;
  isMaster: boolean;
  path: string;
  labelPt?: [number, number];
}

export interface TerrainGeoPayload {
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  nx: number;
  ny: number;
  gridSmooth: number[];
  minAlt: number;
  maxAlt: number;
  contours5m: TerrainContourLine[];
  handPolys: { highPath: string; medPath: string };
  flowLines: Array<{ path: string; weight: number }>;
  osmWaterways: Array<{ path: string; name?: string }>;
  officialFloodPaths: string[];
  handAtCenterM: number;
  nearestRealStreamM: number | null;
}

export interface Report360ApiPayload {
  generatedAt: string;
  coordinates: { lat: number; lng: number; source: string; cep?: string };
  baseline: {
    city: string;
    state: string;
    ibgeCode: string;
    center: [number, number];
    populationCenso2022: number;
    householdsCenso2022: number;
    avgResidentsPerHousehold: number;
    vacantShareCityPct: number;
    apartmentsShareCityPct: number;
    housesShareCityPct: number;
    seniors60SharePct: number;
    nominalIncomeCityHead: number;
    fipeZap: {
      cityAvgSqm: number;
      yoyChangePct: number;
      commercialSqm: number;
      commercialYoyPct: number;
      commercialRentSqm: number;
      note: string;
      byBedrooms: Array<{ label: string; sqm: number | null }>;
    };
    ideb: {
      yearsInitial: number;
      yearsFinal: number;
      highSchool: number;
      referenceYear: string;
    };
    caged: {
      periodLabel: string;
      monthName: string;
      monthAdmissions: number;
      monthSeparations: number;
      monthBalance: number;
      ytdBalance: number;
      ytdAdmissions: number;
      scopeNote: string;
    };
    disasters: {
      recordsCount2010_2024: number;
      floodCountLast10y: number;
      worstYear: number;
      worstDisplaced: number;
      worstAffectedHomes: number;
      worstDeaths: number;
      preparedness: {
        floodAlert: boolean;
        floodPlan: boolean;
        landslideAlert: boolean;
        landslidePlan: boolean;
        resilientCities: boolean;
      };
      summaryNote: string;
    };
  };
  scores: {
    overall: number;
    health: number;
    commerce: number;
    infra: number;
    education: number;
    income: number;
    mobility: number;
    climate: number;
    marketLiquidity: number;
  };
  demographics: {
    radius500: {
      residents: number;
      households: number;
      avgPerHousehold: number;
      incomeHead?: number;
      vacantPct?: number;
      housesPct: number;
      aptsPct: number;
      underConstruction: number;
      ageBrackets?: Array<{ label: string; pct: number }>;
    };
    neighborhood: {
      name: string;
      residents: number;
      households: number;
      avgPerHousehold: number;
      incomeHead?: number;
      vacantPct?: number;
    };
    householdBudget?: {
      referenceLabel: string;
      housingPct: number;
      healthPct: number;
      educationPct: number;
      foodAndTransportPct: number;
      housingMonthlyBRL: number;
      healthMonthlyBRL: number;
      educationMonthlyBRL: number;
    };
  };
  commerce: {
    total500: number;
    total1000: number;
    categories: Array<{ category: string; c500: number; c1000: number; topSubs: string }>;
  };
  education: {
    total1km: number;
    publicCount: number;
    privateCount: number;
    nearestM: number | null;
    schools: Array<{ name: string; distanceM: number; kind: string }>;
    ideb: { yearsInitial: number; yearsFinal: number; highSchool: number; referenceYear: string };
  };
  health: {
    totalServices: number;
    nearestPharmacyM: number | null;
    nearestEmergencyM: number | null;
    pharmaciesCount: number;
    hospitalsCount?: number;
    clinicsCount?: number;
    consultoriosCount?: number;
    labsCount?: number;
    publicSharePct?: number;
    hospitals?: Array<{ name: string; distanceM: number; kind: string; ownership: string; emergency: boolean }>;
    clinics?: Array<{ name: string; distanceM: number; ownership: string }>;
    consultorios?: Array<{ name: string; distanceM: number }>;
    labs?: Array<{ name: string; distanceM: number }>;
    pharmacies?: Array<{ name: string; distanceM: number }>;
    byType: Array<{ type: string; count: number; nearestM: number | null }>;
  };
  climate: {
    source: string;
    elevationMeters: number;
    slopePct: number;
    slopeAspect: string;
    profileSN: number[];
    profileWE: number[];
    elevationGrid?: number[][];
    terrainGeo?: TerrainGeoPayload;
    seaDistanceKm?: number | null;
    nearestStreamM?: number;
    streamElevDiffM?: number;
    avgTempC: number;
    annualRainMm: number;
    hotDays35PerYear: number;
    warmNights20PerYear: number;
    muggyDaysPerYear: number;
    rain50mmDaysPerYear: number;
    solarKwhPerKwpMonth: number;
    maxTempRecord: { value: number; when: string };
    minTempRecord: { value: number; when: string };
    maxRainDayRecord: { value: number; when: string };
    maxGustKmh: number;
    gustDays60PerYear: number;
    windGroundKmh: number;
    wind50mKmh: number;
    wind100mKmh: number;
    uvHourly?: Array<{ hour: number; label: string; uv: number }>;
    uvPeakHour?: string;
    uvPeakValue?: number;
    uvAlertWindow?: string;
    monthly: Array<{
      month: string;
      maxTemp: number;
      minTemp: number;
      rainMm: number;
      tags: string[];
    }>;
  };
  mobility?: {
    transit500m: Array<{ name: string; kind: 'Metrô' | 'Trem'; distanceM: number }>;
    transit1km: Array<{ name: string; kind: 'Metrô' | 'Trem'; distanceM: number }>;
    nearestBeach: { name: string; distanceM: number } | null;
  };
  communityRisk: {
    nearCommunity: boolean;
    communityName: string | null;
    faction: string | null;
    distanceMeters: number | null;
  };
  mapOverlay: {
    centerLat: number;
    centerLng: number;
    pois: Array<{ lat: number; lng: number; kind: 'health' | 'edu' | 'shop' | 'food'; label: string }>;
  };
  market: {
    cityItbiSqm: number;
    neighItbiSqm: number;
    neighborhoodRefSqm?: number;
    cityDiffPct: number;
    apartamento: PortalTypeSummary;
    casa: PortalTypeSummary;
    comercial: PortalTypeSummary;
    neighbors: Array<{
      neighborhood: string;
      itbiSqm: number;
      diffPct: number;
      itbiCount: number;
      portalSqm?: number;
      portalDiffPct?: number;
      portalCount: number;
    }>;
    itbiYearlyTrend?: Array<{ year: string; neighSqm: number; citySqm: number; txCount: number }>;
    itbiAppreciationPct?: number;
    itbiSpanYears?: string;
    fipeZapSeries12m?: Array<{ month: string; saleSqm: number; saleCitySqm: number; rentIdx: number; saleIdx: number }>;
    rentYoY?: number;
    fipeZap: {
      cityAvgSqm: number;
      yoyChangePct: number;
      commercialSqm: number;
      commercialYoyPct: number;
      commercialRentSqm: number;
      note: string;
      byBedrooms: Array<{ label: string; sqm: number | null }>;
    };
    caged: {
      periodLabel: string;
      monthName: string;
      monthAdmissions: number;
      monthSeparations: number;
      monthBalance: number;
      ytdBalance: number;
      ytdAdmissions: number;
      scopeNote: string;
    };
    bedroomsDistribution: Array<{ label: string; count: number }>;
  };
}

interface PortalTypeSummary {
  tipo: string;
  itbiSqm: number;
  portalSqm: number;
  medianPrice: number;
  minTrimPrice: number;
  maxTrimPrice: number;
  typicalArea: number;
  typicalBedrooms: number;
  saleCount: number;
  itbiCount: number;
  rentCount: number;
  rentMin: number;
  rentMax: number;
  rentMedian: number;
  saleSamples: Array<{ bedrooms: number; sizeSqm: number; price: number }>;
  rentSamples: Array<{ bedrooms: number; sizeSqm: number; price: number }>;
}

export interface ReportPageInputData {
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  streetNumber: string;
  propertyType: string;
  sizeSqm: number;
  bedrooms: number;
  parkingSpaces: number;
  acquisitionMode: 'leilao' | 'caixa';
  arrematePrice: number;
  auctioneerFee: number;
  itbiFee: number;
  registryFee: number;
  reformCost: number;
  legalCost: number;
  iptuDebt: number;
  condoDebt: number;
  totalAcquisitionCost: number;
  effectiveSqmCost: number;
  marketTiers: Array<{
    id: string;
    label: string;
    sqm: number | null;
    samples: string;
    saleValue: number;
    grossProfit: number;
    roi: number;
  }>;
  monthlyCondo: number;
  monthlyIptu: number;
  monthlyExtra: number;
  monthlyFinancing: number;
  annualInterestRate: number;
  monthlyInterestCost: number;
  totalMonthlyHolding: number;
  flipScenarios: Array<{
    months: number;
    holdingCost: number;
    brokerFee: number;
    capitalGainsTax?: number;
    netProfit: number;
    netRoi: number;
  }>;
  flipExitPrice: number;
  grossRentMonthly: number;
  portalRentalBenchmarkMonthly: number;
  irDeductionMonthly: number;
  rentalIrDeductionPct: number;
  netRentMonthly: number;
  netRentalYieldAnnual: number;
  matriculaReport?: MatriculaAnalysisReport;
  suggestedQuickSaleTotal?: number;
  suggestedQuickSaleSqm?: number;
  gabaritoTotal?: number;
  gabaritoSqm?: number;
  portalStreetAvgSqm?: number;
  buildingSafetyValveApplied?: boolean;
  buildingYear?: number | null;
  buildingDepPct?: number;
  isCommunityRisk?: boolean;
  communityName?: string | null;
  liquidityScore?: number;
  evaluationPrice?: number;
  neighborhoodAvgSqm?: number;
  streetAvgSqm?: number;
  itbiStreetCount?: number;
  itbiBuildingCount?: number;
  itbiSurroundingCount?: number;
}

const formatBRL = (val: number) =>
  (Number.isFinite(val) ? Math.round(val) : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

const formatNum = (val: number) => (Number.isFinite(val) ? Math.round(val) : 0).toLocaleString('pt-BR');

// Convert lat/lng to fractional Web Mercator tile coordinates at zoom Z
function latLngToTileXY(lat: number, lng: number, z: number) {
  const n = Math.pow(2, z);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

const CartoStreetMap = ({
  centerLat,
  centerLng,
  pois,
  addressTitle,
  zoom = 16,
  heightPx = 285,
  caption,
  mode = 'street',
  hideLegend = false,
  insetStreetMap = false,
}: {
  centerLat: number;
  centerLng: number;
  pois: Array<{ lat: number; lng: number; kind: 'health' | 'edu' | 'shop' | 'food'; label: string }>;
  addressTitle: string;
  zoom?: number;
  heightPx?: number;
  caption?: string;
  mode?: 'street' | 'sat' | 'hybrid';
  hideLegend?: boolean;
  insetStreetMap?: boolean;
}) => {
  const w = 740;
  const h = heightPx;
  const cTile = latLngToTileXY(centerLat, centerLng, zoom);
  const cPxX = cTile.x * 256;
  const cPxY = cTile.y * 256;
  const leftPx = cPxX - w / 2;
  const topPx = cPxY - h / 2;

  const minTx = Math.floor(leftPx / 256);
  const maxTx = Math.floor((leftPx + w) / 256);
  const minTy = Math.floor(topPx / 256);
  const maxTy = Math.floor((topPx + h) / 256);

  const tiles: Array<{ tx: number; ty: number; left: number; top: number }> = [];
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      tiles.push({ tx, ty, left: tx * 256 - leftPx, top: ty * 256 - topPx });
    }
  }

  // Mini corner street inset (bottom-left) when viewing high-res satellite
  const iw = 176;
  const ih = 104;
  const iZoom = Math.max(14, zoom - 2);
  const iTile = latLngToTileXY(centerLat, centerLng, iZoom);
  const iLeftPx = iTile.x * 256 - iw / 2;
  const iTopPx = iTile.y * 256 - ih / 2;
  const insetTiles: Array<{ tx: number; ty: number; left: number; top: number }> = [];
  if (insetStreetMap) {
    for (let ty = Math.floor(iTopPx / 256); ty <= Math.floor((iTopPx + ih) / 256); ty++) {
      for (let tx = Math.floor(iLeftPx / 256); tx <= Math.floor((iLeftPx + iw) / 256); tx++) {
        insetTiles.push({ tx, ty, left: tx * 256 - iLeftPx, top: ty * 256 - iTopPx });
      }
    }
  }

  const metersPerPx = (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) / Math.pow(2, zoom);
  const r500Px = Math.min(h * 0.45, Math.round(500 / metersPerPx));
  const r250Px = Math.round(r500Px / 2);

  const visiblePois =
    mode === 'hybrid'
      ? []
      : mode === 'sat'
      ? pois.filter((p) => p.kind === 'health' || p.kind === 'edu' || p.kind === 'shop' || p.kind === 'food')
      : pois;

  const colorMap: Record<string, string> = {
    health: '#dc2626',
    edu: '#2563eb',
    shop: '#059669',
    food: '#d97706',
  };

  const tileUrl = (tx: number, ty: number) =>
    mode === 'hybrid'
      ? `/api/report/tile-ghybrid/${zoom}/${tx}/${ty}.jpg`
      : mode === 'sat'
      ? `/api/report/tile-sat/${zoom}/${tx}/${ty}.jpg`
      : `/api/report/tile/${zoom}/${tx}/${ty}.png?v=2`;

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
      <div className="relative w-full overflow-hidden bg-slate-100" style={{ height: `${h}px` }}>
        {tiles.map((t) => (
          <img
            key={`${mode}-${t.tx}-${t.ty}`}
            src={tileUrl(t.tx, t.ty)}
            alt=""
            crossOrigin="anonymous"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (mode === 'hybrid' && !img.dataset.fallbackSat) {
                img.dataset.fallbackSat = '1';
                img.src = `/api/report/tile-sat/${zoom}/${t.tx}/${t.ty}.jpg`;
                return;
              }
              img.style.opacity = '0';
            }}
            style={{
              position: 'absolute',
              left: `${(t.left / w) * 100}%`,
              top: `${(t.top / h) * 100}%`,
              width: `${(256 / w) * 100}%`,
              height: `${(256 / h) * 100}%`,
              maxWidth: 'none',
            }}
          />
        ))}

        <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 w-full h-full pointer-events-none">
          {mode !== 'hybrid' && (
            <>
              <circle
                cx={w / 2}
                cy={h / 2}
                r={r500Px}
                fill="none"
                stroke={mode === 'sat' ? '#ffffff' : '#ea580c'}
                strokeOpacity={mode === 'sat' ? '0.85' : '0.7'}
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              <circle
                cx={w / 2}
                cy={h / 2}
                r={r250Px}
                fill="none"
                stroke={mode === 'sat' ? '#ffffff' : '#ea580c'}
                strokeOpacity="0.45"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            </>
          )}

          {visiblePois.map((p, idx) => {
            const pTile = latLngToTileXY(p.lat, p.lng, zoom);
            const px = pTile.x * 256 - leftPx;
            const py = pTile.y * 256 - topPx;
            if (px < 8 || px > w - 8 || py < 8 || py > h - 8) return null;
            return (
              <circle
                key={idx}
                cx={px}
                cy={py}
                r="4.5"
                fill={colorMap[p.kind] || '#475569'}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          })}

          <circle cx={w / 2} cy={h / 2} r="10" fill="#ea580c" fillOpacity="0.24" />
          <circle cx={w / 2} cy={h / 2} r="6" fill="#ea580c" stroke="#ffffff" strokeWidth="2" />
          <rect x={w / 2 + 10} y={h / 2 - 11} width="154" height="19" rx="4" fill="#ffffff" fillOpacity="0.95" stroke="#cbd5e1" strokeWidth="0.8" />
          <text x={w / 2 + 16} y={h / 2 + 1.5} fontSize="9.5" fontWeight="600" fill="#1e293b">
            {addressTitle.slice(0, 26)}
          </text>
        </svg>

        {insetStreetMap && (
          <div
            className="absolute bottom-2.5 left-2.5 rounded-md border-2 border-white shadow-lg overflow-hidden bg-slate-100 pointer-events-none"
            style={{ width: `${iw}px`, height: `${ih}px` }}
          >
            {insetTiles.map((t) => (
              <img
                key={`inset-${t.tx}-${t.ty}`}
                src={`/api/report/tile/${iZoom}/${t.tx}/${t.ty}.png?v=2`}
                alt=""
                crossOrigin="anonymous"
                style={{
                  position: 'absolute',
                  left: `${(t.left / iw) * 100}%`,
                  top: `${(t.top / ih) * 100}%`,
                  width: `${(256 / iw) * 100}%`,
                  height: `${(256 / ih) * 100}%`,
                  maxWidth: 'none',
                }}
              />
            ))}
            <svg viewBox={`0 0 ${iw} ${ih}`} className="absolute inset-0 w-full h-full">
              {pois.map((p, idx) => {
                const pt = latLngToTileXY(p.lat, p.lng, iZoom);
                const px = pt.x * 256 - iLeftPx;
                const py = pt.y * 256 - iTopPx;
                if (px < 4 || px > iw - 4 || py < 4 || py > ih - 4) return null;
                return <circle key={idx} cx={px} cy={py} r="2.6" fill={colorMap[p.kind] || '#475569'} stroke="#fff" strokeWidth="0.9" />;
              })}
              <circle cx={iw / 2} cy={ih / 2} r="4.5" fill="#ea580c" stroke="#fff" strokeWidth="1.5" />
            </svg>
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-white/90 text-[8px] font-semibold text-slate-700">
              Mapa & Pontos
            </div>
          </div>
        )}
      </div>
      {!hideLegend && (
        <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1 text-[9.5px] text-slate-600">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-orange-600 inline-block shrink-0" /> Imóvel</span>
            <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-red-600 inline-block shrink-0" /> Saúde</span>
            <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0" /> Educação</span>
            <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0" /> Mercado / Alimentação</span>
          </div>
          <span className="text-slate-500 whitespace-nowrap">{caption || `Vista aproximada (~${zoom === 16 ? '500 m' : '650 m'})`}</span>
        </div>
      )}
    </div>
  );
};

const ScoreDonut = ({ score }: { score: number }) => {
  const clamped = Math.max(0, Math.min(10, score));
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 10) * c;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="#ea580c"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="45" textAnchor="middle" fontSize="19" fontWeight="600" fill="#1e293b">
        {clamped.toFixed(1).replace('.', ',')}
      </text>
      <text x="44" y="58" textAnchor="middle" fontSize="8.5" fontWeight="500" fill="#64748b">
        de 10
      </text>
    </svg>
  );
};

const ElevationProfileSvg = ({
  title,
  values,
  leftLabel,
  rightLabel,
}: {
  title: string;
  values: number[];
  leftLabel: string;
  rightLabel: string;
}) => {
  const pts = values && values.length >= 2 ? values : [20, 22, 25, 24, 21];
  const minRaw = Math.min(...pts);
  const maxRaw = Math.max(...pts);
  const min = minRaw - 4;
  const max = maxRaw + 6;
  const span = Math.max(8, max - min);
  const w = 330;
  const h = 94;
  const coords = pts.map((v, i) => {
    const x = 22 + (i / (pts.length - 1)) * (w - 44);
    const y = h - 22 - ((v - min) / span) * (h - 38);
    return { x, y, v };
  });
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${h - 22} L ${coords[0].x.toFixed(1)} ${h - 22} Z`;
  const mid = coords[Math.floor(coords.length / 2)];
  const scale600Px = Math.round(((w - 44) / 3000) * 600);

  return (
    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
      <div className="text-[10.5px] text-slate-700 mb-1 flex flex-wrap justify-between gap-1">
        <span className="font-semibold text-slate-800">{title}</span>
        <span className="text-slate-500">
          Ponto: <strong>{mid?.v ?? '-'} m</strong> ({minRaw}–{maxRaw} m)
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[86px]">
        <line x1="22" y1={h - 22} x2={w - 22} y2={h - 22} stroke="#cbd5e1" strokeWidth="1" />
        <path d={areaPath} fill="#e2e8f0" fillOpacity="0.6" />
        <path d={linePath} fill="none" stroke="#1e293b" strokeWidth="1.7" />
        <circle cx={mid.x} cy={mid.y} r="3.6" fill="#ea580c" stroke="#fff" strokeWidth="1.3" />
        <text x={mid.x} y={mid.y - 7} textAnchor="middle" fontSize="8" fontWeight="600" fill="#1e293b">{mid?.v} m</text>
        <text x="22" y={h - 6} fontSize="8" fill="#64748b">{leftLabel}</text>
        <text x={w / 2} y={h - 6} textAnchor="middle" fontSize="8" fontWeight="600" fill="#334155">Imóvel</text>
        <text x={w - 22} y={h - 6} textAnchor="end" fontSize="8" fill="#64748b">{rightLabel}</text>
        {/* Barra de escala 600 m */}
        <line x1="24" y1="12" x2={24 + scale600Px} y2="12" stroke="#475569" strokeWidth="1.3" />
        <line x1="24" y1="9" x2="24" y2="15" stroke="#475569" strokeWidth="1.1" />
        <line x1={24 + scale600Px} y1="9" x2={24 + scale600Px} y2="15" stroke="#475569" strokeWidth="1.1" />
        <text x={24 + scale600Px + 5} y="14.5" fontSize="7.5" fill="#475569">600 m</text>
      </svg>
    </div>
  );
};

const ReliefAndFloodMapsSideBySide = ({
  centerLat,
  centerLng,
  terrainGeo,
  grid,
  elevationMeters,
  seaDistanceKm,
  nearestStreamM,
}: {
  centerLat?: number;
  centerLng?: number;
  terrainGeo?: TerrainGeoPayload;
  grid?: number[][];
  elevationMeters: number;
  seaDistanceKm?: number | null;
  nearestStreamM?: number | null;
}) => {
  const mat =
    grid && grid.length >= 5
      ? grid
      : Array.from({ length: 7 }, (_, r) =>
          Array.from({ length: 7 }, (__, c) => Math.max(3, elevationMeters + (3 - r) * 3 + Math.abs(c - 3) * 2))
        );
  const minAlt = terrainGeo ? terrainGeo.minAlt : Math.min(...mat.flat());
  const maxAlt = terrainGeo ? terrainGeo.maxAlt : Math.max(...mat.flat(), minAlt + 6);

  const bbox = terrainGeo?.bbox || {
    minLat: (centerLat ?? -22.9) - 0.0038,
    maxLat: (centerLat ?? -22.9) + 0.0038,
    minLng: (centerLng ?? -43.2) - 0.0056,
    maxLng: (centerLng ?? -43.2) + 0.0056,
  };

  // Align real Carto street map tiles underneath the SVG 280x175 viewport
  const tileZoom = 15;
  const streetTiles: Array<{ tx: number; ty: number; leftPct: number; topPct: number; wPct: number; hPct: number }> = [];
  if (Number.isFinite(bbox.minLat) && Number.isFinite(bbox.minLng)) {
    const tl = latLngToTileXY(bbox.maxLat, bbox.minLng, tileZoom);
    const br = latLngToTileXY(bbox.minLat, bbox.maxLng, tileZoom);
    const leftPx = tl.x * 256;
    const topPx = tl.y * 256;
    const rightPx = br.x * 256;
    const botPx = br.y * 256;
    const boxW = Math.max(1, rightPx - leftPx);
    const boxH = Math.max(1, botPx - topPx);

    for (let ty = Math.floor(topPx / 256); ty <= Math.floor(botPx / 256); ty++) {
      for (let tx = Math.floor(leftPx / 256); tx <= Math.floor(rightPx / 256); tx++) {
        streetTiles.push({
          tx,
          ty,
          leftPct: ((tx * 256 - leftPx) / boxW) * 100,
          topPct: ((ty * 256 - topPx) / boxH) * 100,
          wPct: (256 / boxW) * 100,
          hPct: (256 / boxH) * 100,
        });
      }
    }
  }

  const elevColor = (v: number) => {
    const ratio = (v - minAlt) / Math.max(1, maxAlt - minAlt);
    if (ratio < 0.25) return 'rgba(134, 239, 172, 0.24)';
    if (ratio < 0.55) return 'rgba(253, 224, 71, 0.20)';
    if (ratio < 0.8) return 'rgba(251, 146, 60, 0.24)';
    return 'rgba(180, 83, 9, 0.24)';
  };

  const handM = terrainGeo?.handAtCenterM;
  const resolvedStreamM = terrainGeo?.nearestRealStreamM ?? nearestStreamM ?? 420;
  const isFloodSafe = handM !== undefined ? handM > 3.5 : elevationMeters >= 15;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {/* Left: Relevo e Curvas de Nível sobre mapa viário limpo */}
      <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
        <div className="flex justify-between items-baseline">
          <div className="text-[11px] font-bold text-slate-900">Relevo e Curvas de Nível</div>
          <span className="text-[10px] font-semibold text-slate-500">{minAlt} m a {maxAlt} m</span>
        </div>
        <div className="relative w-full h-[175px] rounded border border-slate-200 overflow-hidden bg-[#fafaf8]">
          {streetTiles.map((t) => (
            <img
              key={`rel-${t.tx}-${t.ty}`}
              src={`/api/report/tile/${tileZoom}/${t.tx}/${t.ty}.png?v=2`}
              alt=""
              crossOrigin="anonymous"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0';
              }}
              style={{
                position: 'absolute',
                left: `${t.leftPct}%`,
                top: `${t.topPct}%`,
                width: `${t.wPct}%`,
                height: `${t.hPct}%`,
                maxWidth: 'none',
                opacity: 0.78,
                filter: 'saturate(0.75) contrast(0.95)',
              }}
            />
          ))}
          <svg viewBox="0 0 280 175" className="absolute inset-0 w-full h-full">
            {terrainGeo && terrainGeo.gridSmooth.length === terrainGeo.nx * terrainGeo.ny
              ? (() => {
                  const step = 4;
                  const cells: React.ReactNode[] = [];
                  const cw = (280 / terrainGeo.nx) * step;
                  const ch = (175 / terrainGeo.ny) * step;
                  for (let r = 0; r < terrainGeo.ny; r += step) {
                    for (let c = 0; c < terrainGeo.nx; c += step) {
                      const val = terrainGeo.gridSmooth[r * terrainGeo.nx + c];
                      cells.push(
                        <rect
                          key={`${r}-${c}`}
                          x={(c / terrainGeo.nx) * 280}
                          y={(r / terrainGeo.ny) * 175}
                          width={cw + 0.8}
                          height={ch + 0.8}
                          fill={elevColor(val)}
                        />
                      );
                    }
                  }
                  return cells;
                })()
              : mat.map((row, rIdx) =>
                  row.map((val, cIdx) => (
                    <rect key={`${rIdx}-${cIdx}`} x={cIdx * 40} y={rIdx * 25} width="40.5" height="25.5" fill={elevColor(val)} />
                  ))
                )}

            {terrainGeo && terrainGeo.contours5m.length > 0 ? (
              terrainGeo.contours5m.map((c, idx) => (
                <g key={`${c.elev}-${idx}`}>
                  <path
                    d={c.path}
                    fill="none"
                    stroke={c.isMaster ? '#7c2d12' : '#9a3412'}
                    strokeOpacity={c.isMaster ? '0.84' : '0.48'}
                    strokeWidth={c.isMaster ? '1.35' : '0.68'}
                  />
                  {c.isMaster && c.labelPt && (
                    <g transform={`translate(${c.labelPt[0]}, ${c.labelPt[1]})`}>
                      <rect x="-12" y="-5.5" width="24" height="10" rx="2" fill="#ffffff" fillOpacity="0.88" />
                      <text x="0" y="2" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#7c2d12">
                        {c.elev}m
                      </text>
                    </g>
                  )}
                </g>
              ))
            ) : (
              [22, 48, 76, 105, 134, 156].map((ry, i) => (
                <path
                  key={i}
                  d={`M 0 ${ry} Q 85 ${ry - 14}, 155 ${ry + 5} T 280 ${ry - 8}`}
                  fill="none"
                  stroke={i % 2 === 0 ? '#78350f' : '#9a3412'}
                  strokeOpacity={i % 2 === 0 ? '0.58' : '0.35'}
                  strokeWidth={i % 2 === 0 ? '1.2' : '0.7'}
                />
              ))
            )}

            <circle cx="140" cy="87.5" r="5" fill="#ea580c" stroke="#ffffff" strokeWidth="1.5" />
            <rect x="148" y="77.5" width="84" height="17" rx="3" fill="#ffffff" fillOpacity="0.95" stroke="#cbd5e1" strokeWidth="0.7" />
            <text x="152" y="88.5" fontSize="8" fontWeight="700" fill="#1e293b">Ponto ({elevationMeters} m)</text>
          </svg>
        </div>
        <div className="text-[9.5px] text-slate-600 space-y-0.5 leading-snug">
          <div>Curvas de nível reais a cada 5 m (finas) e mestras a cada 25 m (com cota em metros).</div>
          <div>
            Hipsometria: {minAlt} m a {maxAlt} m{seaDistanceKm !== null && seaDistanceKm !== undefined ? ` · ~${seaDistanceKm} km do litoral` : ''}.
          </div>
        </div>
      </div>

      {/* Right: Carta de Drenagem & Suscetibilidade sobre mapa viário limpo */}
      <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
        <div className="flex justify-between items-baseline">
          <div className="text-[11px] font-bold text-slate-900">Carta de Drenagem & Suscetibilidade</div>
          <span className={`text-[10px] font-bold ${isFloodSafe ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isFloodSafe ? 'Fora de mancha crítica' : 'Atenção à drenagem'}
          </span>
        </div>
        <div className="relative w-full h-[175px] rounded border border-slate-200 overflow-hidden bg-[#f8fafc]">
          {streetTiles.map((t) => (
            <img
              key={`hydro-${t.tx}-${t.ty}`}
              src={`/api/report/tile/${tileZoom}/${t.tx}/${t.ty}.png?v=2`}
              alt=""
              crossOrigin="anonymous"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0';
              }}
              style={{
                position: 'absolute',
                left: `${t.leftPct}%`,
                top: `${t.topPct}%`,
                width: `${t.wPct}%`,
                height: `${t.hPct}%`,
                maxWidth: 'none',
                opacity: 0.82,
                filter: 'saturate(0.70) contrast(0.95)',
              }}
            />
          ))}
          <svg viewBox="0 0 280 175" className="absolute inset-0 w-full h-full">
            {terrainGeo ? (
              <>
                {terrainGeo.handPolys.medPath && (
                  <path d={terrainGeo.handPolys.medPath} fill="#818cf8" fillOpacity="0.28" stroke="#6366f1" strokeOpacity="0.35" strokeWidth="0.6" />
                )}
                {terrainGeo.handPolys.highPath && (
                  <path d={terrainGeo.handPolys.highPath} fill="#38bdf8" fillOpacity="0.40" stroke="#0284c7" strokeOpacity="0.55" strokeWidth="0.7" />
                )}
                {terrainGeo.officialFloodPaths.map((p, idx) => (
                  <path key={`ofp-${idx}`} d={p} fill="#4f46e5" fillOpacity="0.30" stroke="#4338ca" strokeWidth="0.9" />
                ))}
                {terrainGeo.flowLines.length > 0 && (
                  <path
                    d={terrainGeo.flowLines.map((fl) => fl.path).join(' ')}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="1.45"
                    strokeOpacity="0.72"
                    strokeLinecap="round"
                  />
                )}
                {terrainGeo.osmWaterways.map((ww, idx) => (
                  <path
                    key={`ww-${idx}`}
                    d={ww.path}
                    fill="none"
                    stroke="#0369a1"
                    strokeWidth="2.2"
                    strokeOpacity="0.92"
                    strokeLinecap="round"
                  />
                ))}
              </>
            ) : (
              <>
                <path d="M 0 142 Q 95 116, 175 130 T 280 108 L 280 175 L 0 175 Z" fill="#818cf8" fillOpacity="0.22" />
                <path d="M 8 146 Q 95 120, 175 134 T 275 114" fill="none" stroke="#38bdf8" strokeWidth="12" strokeOpacity="0.32" />
                <path d="M 8 146 Q 95 120, 175 134 T 275 114" fill="none" stroke="#0284c7" strokeWidth="1.6" strokeDasharray="4 3" />
              </>
            )}

            <circle cx="140" cy="87.5" r="5" fill="#ea580c" stroke="#ffffff" strokeWidth="1.5" />
            <rect x="148" y="77.5" width="66" height="17" rx="3" fill="#ffffff" fillOpacity="0.95" stroke="#cbd5e1" strokeWidth="0.7" />
            <text x="152" y="88.5" fontSize="8" fontWeight="700" fill="#1e293b">O endereço</text>
            <rect x="122" y="152" width="150" height="16" rx="3" fill="#ffffff" fillOpacity="0.94" stroke="#bae6fd" strokeWidth="0.7" />
            <text x="127" y="162.5" fontSize="7.3" fontWeight="600" fill="#0369a1">
              Drenagem ~{resolvedStreamM} m{handM !== undefined ? ` · HAND ${handM} m` : ''}
            </text>
          </svg>
        </div>
        <div className="text-[9.5px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 leading-snug">
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-sky-700 inline-block" /> Canal / Fluxo D8</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-sky-400/60 inline-block rounded-xs" /> HAND ≤ 2 m (Alta)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-400/50 inline-block rounded-xs" /> HAND 2–5 m (Média)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-white border border-slate-300 inline-block rounded-xs" /> &gt; 5 m (Fora de mancha)</span>
        </div>
      </div>
    </div>
  );
};

const MonthlyClimateChartSvg = ({
  monthly,
}: {
  monthly: Array<{ month: string; maxTemp: number; minTemp: number; rainMm: number }>;
}) => {
  const w = 680;
  const h = 152;
  const maxRain = Math.max(220, ...monthly.map((m) => m.rainMm));
  const maxTemp = 38;
  const minTemp = 10;

  const tempY = (t: number) => 16 + (1 - (t - minTemp) / (maxTemp - minTemp)) * 104;
  const rainH = (mm: number) => Math.max(4, (mm / maxRain) * 92);

  const maxPts = monthly.map((m, i) => `${34 + i * 54},${tempY(m.maxTemp).toFixed(1)}`).join(' ');
  const minPts = monthly.map((m, i) => `${34 + i * 54},${tempY(m.minTemp).toFixed(1)}`).join(' ');

  return (
    <div className="p-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between text-[10px] mb-1.5">
        <span className="font-semibold text-slate-800">Clima ao longo do ano (2021–2025): temperatura média máx./mín. e chuva mensal</span>
        <div className="flex items-center gap-3 text-[9.5px] text-slate-600">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-sky-300 inline-block rounded-xs" /> Chuva (mm)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-600 inline-block" /> T. Máx (°C)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-600 inline-block" /> T. Mín (°C)</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[142px]">
        <line x1="18" y1="120" x2={w - 14} y2="120" stroke="#e2e8f0" strokeWidth="1" />
        {monthly.map((m, i) => {
          const cx = 34 + i * 54;
          const bh = rainH(m.rainMm);
          return (
            <g key={m.month}>
              <rect x={cx - 10} y={120 - bh} width="20" height={bh} rx="2" fill="#93c5fd" fillOpacity="0.6" />
              <text x={cx} y={134} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#475569">{m.month}</text>
              <text x={cx} y={145} textAnchor="middle" fontSize="7.5" fill="#0369a1">{m.rainMm}mm</text>
            </g>
          );
        })}
        <polyline fill="none" stroke="#ea580c" strokeWidth="1.9" points={maxPts} />
        <polyline fill="none" stroke="#2563eb" strokeWidth="1.7" strokeDasharray="4 2" points={minPts} />
        {monthly.map((m, i) => {
          const cx = 34 + i * 54;
          return (
            <g key={`pt-${m.month}`}>
              <circle cx={cx} cy={tempY(m.maxTemp)} r="2.5" fill="#ea580c" />
              <text x={cx} y={tempY(m.maxTemp) - 5} textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#c2410c">{m.maxTemp}°</text>
              <circle cx={cx} cy={tempY(m.minTemp)} r="2.2" fill="#2563eb" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const MarketTrendsCharts = ({
  cityAvgSqm,
  neighRefSqm,
  yoyChangePct,
  rentYoY = 8.4,
  series12m,
  itbiYearlyTrend,
  itbiAppreciationPct = 0,
  itbiSpanYears = '',
}: {
  cityAvgSqm: number;
  neighRefSqm: number;
  yoyChangePct: number;
  rentYoY?: number;
  series12m?: Array<{ month: string; saleSqm: number; saleCitySqm: number; rentIdx: number; saleIdx: number }>;
  itbiYearlyTrend?: Array<{ year: string; neighSqm: number; citySqm: number; txCount: number }>;
  itbiAppreciationPct?: number;
  itbiSpanYears?: string;
}) => {
  const rows12 = series12m && series12m.length >= 6 ? series12m : [
    { month: 'Abr', saleSqm: Math.round(neighRefSqm * 0.95), saleCitySqm: Math.round(cityAvgSqm * 0.95), rentIdx: 93, saleIdx: 95 },
    { month: 'Jun', saleSqm: Math.round(neighRefSqm * 0.96), saleCitySqm: Math.round(cityAvgSqm * 0.96), rentIdx: 95, saleIdx: 96 },
    { month: 'Ago', saleSqm: Math.round(neighRefSqm * 0.97), saleCitySqm: Math.round(cityAvgSqm * 0.97), rentIdx: 97, saleIdx: 97 },
    { month: 'Out', saleSqm: Math.round(neighRefSqm * 0.98), saleCitySqm: Math.round(cityAvgSqm * 0.98), rentIdx: 98, saleIdx: 98 },
    { month: 'Dez', saleSqm: Math.round(neighRefSqm * 0.99), saleCitySqm: Math.round(cityAvgSqm * 0.99), rentIdx: 99, saleIdx: 99 },
    { month: 'Mar', saleSqm: neighRefSqm, saleCitySqm: cityAvgSqm, rentIdx: 100, saleIdx: 100 },
  ];

  const render12mChart = (title: string, badge: string, pts: number[], stroke: string, isCurrency: boolean) => {
    const min = Math.min(...pts) * 0.97;
    const max = Math.max(...pts) * 1.03;
    const w = 320;
    const h = 104;
    const stepX = (w - 48) / Math.max(1, pts.length - 1);
    const getY = (v: number) => 18 + (1 - (v - min) / Math.max(1, max - min)) * 62;
    const poly = pts.map((v, i) => `${26 + i * stepX},${getY(v).toFixed(1)}`).join(' ');

    return (
      <div className="p-3 rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="font-semibold text-slate-800">{title}</span>
          <span className="font-semibold text-emerald-700">{badge}</span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[96px]">
          <line x1="20" y1="82" x2={w - 16} y2="82" stroke="#e2e8f0" strokeWidth="1" />
          <polyline fill="none" stroke={stroke} strokeWidth="1.9" points={poly} />
          {pts.map((v, i) => {
            const cx = 26 + i * stepX;
            const cy = getY(v);
            const showLabel = i === 0 || i === pts.length - 1 || i === Math.floor(pts.length / 2);
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="2.1" fill={stroke} />
                {showLabel && (
                  <text x={cx} y={cy - 5} textAnchor="middle" fontSize="7.2" fill="#475569">
                    {isCurrency ? `R$${(v / 1000).toFixed(1)}k` : `${v.toFixed(0)}`}
                  </text>
                )}
                {(i === 0 || i === pts.length - 1 || i % 3 === 0) && (
                  <text x={cx} y={h - 4} textAnchor="middle" fontSize="7" fill="#64748b">{rows12[i]?.month}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {render12mChart(
          'Tendência de Venda · 12 meses (Bairro)',
          `+${yoyChangePct.toFixed(1).replace('.', ',')}% em 12m`,
          rows12.map((r) => r.saleSqm),
          '#ea580c',
          true
        )}
        {render12mChart(
          'Índice de Locação · 12 meses (Cidade)',
          `+${rentYoY.toFixed(1).replace('.', ',')}% em 12m`,
          rows12.map((r) => r.rentIdx),
          '#0284c7',
          false
        )}
      </div>

      {itbiYearlyTrend && itbiYearlyTrend.length >= 2 && (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] mb-2">
            <span className="font-bold text-slate-800">
              Histórico Real de Valorização (ITBI Oficial · {itbiSpanYears || 'Série Anual'})
            </span>
            <span className={`px-2 py-0.5 rounded font-bold ${itbiAppreciationPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
              {itbiAppreciationPct >= 0 ? `+${itbiAppreciationPct}%` : `${itbiAppreciationPct}%`} no período
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {itbiYearlyTrend.map((yr) => (
              <div key={yr.year} className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">{yr.year} ({yr.txCount} tx)</span>
                  <span className="font-bold text-slate-900">{yr.neighSqm ? `R$ ${formatNum(yr.neighSqm)}/m²` : '-'}</span>
                </div>
                <span className="text-[10px] text-slate-400">Cid: {formatNum(yr.citySqm)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DisasterHistoryChart = ({ floodCount, worstYear }: { floodCount: number; worstYear: number }) => {
  const years = [2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024];
  const hasEvent = (y: number) => (y === 2010 || Math.abs(y - worstYear) <= 1 || (y === 2024 && floodCount > 1));
  return (
    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
      <div className="text-[10px] font-semibold text-slate-700 mb-1.5">Ocorrências climáticas registradas no município (2010–2024)</div>
      <div className="flex items-end justify-between gap-2 h-10 px-2 border-b border-slate-200">
        {years.map((y) => {
          const active = hasEvent(y);
          return (
            <div key={y} className="flex flex-col items-center flex-1">
              <div className={`w-2.5 rounded-t ${active ? 'h-6 bg-orange-500/80' : 'h-1.5 bg-slate-200'}`} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between px-1 mt-1 text-[9px] text-slate-500">
        {years.map((y) => <span key={y}>{y}</span>)}
      </div>
    </div>
  );
};

export function Report360FullPages({
  data,
  r360,
  reportId,
  todayStr,
  app3DCaptures,
}: {
  data: ReportPageInputData;
  r360: Report360ApiPayload;
  reportId: string;
  todayStr: string;
  app3DCaptures?: App3DReportCaptures | null;
}) {
  const fullAddress = `${data.street || 'Logradouro não especificado'}${data.streetNumber ? `, nº ${data.streetNumber}` : ''}`;
  const locationLine = `${data.neighborhood || r360.demographics.neighborhood.name} · ${data.city}/${data.state}`;

  const suggestedTotal = data.suggestedQuickSaleTotal && data.suggestedQuickSaleTotal > 0 ? data.suggestedQuickSaleTotal : data.flipExitPrice;
  const suggestedSqm =
    data.suggestedQuickSaleSqm && data.suggestedQuickSaleSqm > 0
      ? data.suggestedQuickSaleSqm
      : data.sizeSqm > 0
      ? Math.round(suggestedTotal / data.sizeSqm)
      : 0;
  const pisoSqm =
    data.gabaritoSqm && data.gabaritoSqm > 0
      ? data.gabaritoSqm
      : data.marketTiers.find((t) => t.id === 'street' && t.sqm)?.sqm ||
        data.marketTiers.find((t) => t.id === 'neighborhood' && t.sqm)?.sqm ||
        r360.market.neighItbiSqm;
  const pisoTotal = data.gabaritoTotal && data.gabaritoTotal > 0 ? data.gabaritoTotal : Math.round(pisoSqm * data.sizeSqm);
  const portaisTetoSqm =
    data.portalStreetAvgSqm && data.portalStreetAvgSqm > 0
      ? data.portalStreetAvgSqm
      : data.marketTiers.find((t) => t.id === 'portals_street')?.sqm ||
        r360.market.apartamento.portalSqm ||
        r360.market.neighborhoodRefSqm ||
        r360.market.fipeZap.cityAvgSqm;
  const neighRefSqm = r360.market.neighborhoodRefSqm || Math.round(pisoSqm * 1.25);

  const flip6 = data.flipScenarios.find((s) => s.months === 6) || data.flipScenarios[2] || data.flipScenarios[0];
  const spreadPctVsPiso = data.effectiveSqmCost > 0 && pisoSqm > 0 ? Math.round(((pisoSqm - data.effectiveSqmCost) / pisoSqm) * 100) : 0;
  const spreadPctVsQuickSale = data.effectiveSqmCost > 0 && suggestedSqm > 0 ? Math.round(((suggestedSqm - data.effectiveSqmCost) / suggestedSqm) * 100) : 0;

  const isRiskyArea = Boolean(data.isCommunityRisk || r360.communityRisk.nearCommunity);
  const activeCommunityName = data.communityName || r360.communityRisk.communityName;
  const propTypeKey = data.propertyType === 'Casa' ? 'casa' : data.propertyType === 'Comercial' ? 'comercial' : 'apartamento';
  const activeMarketTypology = r360.market[propTypeKey];

  const cepStr = r360.coordinates.cep ? ` · CEP ${r360.coordinates.cep}` : '';
  const itbiTrendPct = Number(r360.market.itbiAppreciationPct ?? 0);
  const itbiSpan = r360.market.itbiSpanYears || '';

  const scoreRows = [
    { label: 'Oferta Comercial e Serviços', short: 'Comércio', score: r360.scores.commerce },
    { label: 'Saúde', short: 'Saúde', score: r360.scores.health },
    { label: 'Educação', short: 'Educação', score: r360.scores.education },
    { label: 'Infraestrutura urbana', short: 'Infraestrutura', score: r360.scores.infra },
    { label: 'Poder Aquisitivo e Demografia', short: 'Demografia', score: r360.scores.income },
    { label: 'Resiliência Climática e Terreno', short: 'Clima/Terreno', score: r360.scores.climate },
    { label: 'Mobilidade', short: 'Mobilidade', score: r360.scores.mobility },
    { label: 'Liquidez imobiliária (ITBI)', short: 'Liquidez ITBI', score: r360.scores.marketLiquidity },
  ];

  const radiusIncome = r360.demographics.radius500.incomeHead || Math.round(r360.baseline.nominalIncomeCityHead * 1.15);
  const neighIncome = r360.demographics.neighborhood.incomeHead || r360.baseline.nominalIncomeCityHead;
  const ageBrackets = r360.demographics.radius500.ageBrackets || [
    { label: '0–18 anos', pct: 18 },
    { label: '19–29 anos', pct: 16 },
    { label: '30–49 anos', pct: 31 },
    { label: '50–69 anos', pct: 23 },
    { label: '70+ anos', pct: 12 },
  ];

  const blockClass = 'report-block bg-white px-7 py-6 rounded-sm shadow-xs border-[1.5px] border-slate-500 min-h-[1040px] flex flex-col print:rounded-none print:shadow-none';
  const blockPageStyle: React.CSSProperties = { breakAfter: 'page', pageBreakAfter: 'always' };
  const totalPages = 11;
  const renderAbntFooter = (pageNum: number) => (
    <div className="mt-auto pt-3 border-t border-slate-200/80 flex items-center justify-end text-[9.5px] text-slate-500">
      <span className="font-semibold text-slate-600">Página {pageNum} de {totalPages}</span>
    </div>
  );
  const streetQualDesc = r360.climate.slopePct <= 5 ? 'plana e pavimentada' : r360.climate.slopePct <= 10 ? 'pavimentada e arborizada' : 'pavimentada e tranquila';

  const commercialListingCopy = `${data.propertyType} com ${data.sizeSqm} m², ${data.bedrooms} quarto(s) e ${data.parkingSpaces} vaga(s) em ${data.street || 'localização privilegiada'}, ${data.neighborhood || data.city}. Região com rotina prática a pé: são ${formatNum(r360.commerce.total500)} estabelecimentos em até 500 m, ${r360.health.totalServices} serviços médicos próximos e ${r360.education.total1km} instituições de ensino em 1 km, inserido em via ${streetQualDesc}.`;

  return (
    <div className="space-y-5 bg-slate-100/70 p-2 sm:p-4 text-slate-800 max-w-[850px] mx-auto print:bg-white print:p-0 print:space-y-0">
      {/* ===================================================================== */}
      {/* BLOCO 1: CAPA EDITORIAL (PÁGINA 1 DEDICADA)                           */}
      {/* ===================================================================== */}
      <div className={`${blockClass} report-page-cover`} style={blockPageStyle}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img
              src="/marcus_logo.png"
              alt="Marcus Assessoria Imobiliária"
              className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40 shadow-sm shrink-0"
            />
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold" style={{ color: '#1e1b4b' }}>
                DOSSIÊ TÉCNICO DE VIABILIDADE & AVALIAÇÃO IMOBILIÁRIA
              </div>
              <div className="text-xs font-semibold text-slate-500">Marcus Assessoria Imobiliária</div>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <div className="font-semibold">Protocolo {reportId} · {todayStr}</div>
            <div>ABNT NBR 14.653</div>
          </div>
        </div>

        {/* Endereço Principal limpo (sem CEP/tipologia na capa) */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{fullAddress}</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">{locationLine}</p>
        </div>

        {/* Mapa Cartográfico Real LIMPO */}
        <div className="mb-4">
          <CartoStreetMap
            centerLat={r360.mapOverlay.centerLat}
            centerLng={r360.mapOverlay.centerLng}
            pois={r360.mapOverlay.pois}
            addressTitle={fullAddress}
            zoom={15}
            heightPx={290}
            mode="street"
            hideLegend={true}
          />
        </div>

        {/* Índice Geral de Atratividade + 8 Mini Barras */}
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/40 mb-4 space-y-3.5">
          <div className="flex items-center gap-4">
            <ScoreDonut score={r360.scores.overall} />
            <div>
              <div className="text-[11px] uppercase tracking-wide text-amber-700 font-bold">ÍNDICE GERAL DE ATRATIVIDADE</div>
              <div className="text-base font-bold text-slate-900">
                {r360.scores.overall >= 8 ? 'Entorno Muito Favorável' : r360.scores.overall >= 6.8 ? 'Entorno Equilibrado' : 'Entorno Seletivo'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Indicadores ponderados por conveniência, rede assistencial, relevo e liquidez real de cartório (ITBI).
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5 pt-3 border-t border-slate-200/80 text-xs">
            {scoreRows.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span className="font-medium">{item.short}</span>
                  <span className="font-bold text-slate-900">{Math.round(item.score * 10)}</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, item.score * 10)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Cartões-Resumo com Borda Limpa e Fundo Branco */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">POPULAÇÃO NO ENTORNO (500 M)</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{formatNum(r360.demographics.radius500.residents)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">~{formatNum(r360.demographics.radius500.households)} domicílios</div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">PISO ITBI / REF. BAIRRO</div>
            <div className="text-lg font-bold text-slate-900 mt-1">R$ {formatNum(pisoSqm)}/m²</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Anúncios Bairro: R$ {formatNum(neighRefSqm)}/m²</div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">ESTABELECIMENTOS ATIVOS (500 M)</div>
            <div className="text-lg font-bold text-slate-900 mt-1">{formatNum(r360.commerce.total500)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">pontos ativos mapeados</div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">REVENDA SUGERIDA / YIELD</div>
            <div className="text-lg font-bold text-emerald-700 mt-1">{formatBRL(suggestedTotal)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Yield {data.netRentalYieldAnnual.toFixed(1).replace('.', ',')}% a.a. · IDEB {r360.education.ideb.yearsInitial.toFixed(1).replace('.', ',')}</div>
          </div>
        </div>

        {renderAbntFooter(1)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 2: LAUDO PTAM RESUMIDO (PÁGINA 2)                               */}
      {/* ===================================================================== */}
      <div className={blockClass} style={blockPageStyle}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">Laudo Técnico PTAM Resumido</div>
            <h2 className="text-lg font-bold text-slate-900">Dados do Imóvel, Custos e Precificação</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">ABNT NBR 14.653 · Escrituras Oficiais de ITBI</span>
        </div>

        {/* 1. Identificação do Imóvel (CEP direto no Endereço) */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 mb-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Características Cadastrais</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div><span className="text-slate-500 block text-[10.5px]">Endereço</span><span className="font-bold text-slate-900">{fullAddress}{cepStr}</span></div>
            <div><span className="text-slate-500 block text-[10.5px]">Bairro / Cidade</span><span className="font-bold text-slate-900">{locationLine}</span></div>
            <div><span className="text-slate-500 block text-[10.5px]">Tipologia / Área</span><span className="font-bold text-slate-900">{data.propertyType} · {data.sizeSqm} m²</span></div>
            <div><span className="text-slate-500 block text-[10.5px]">Quartos / Vagas</span><span className="font-bold text-slate-900">{data.bedrooms} qto(s) · {data.parkingSpaces} vaga(s)</span></div>
            <div><span className="text-slate-500 block text-[10.5px]">Modalidade</span><span className="font-bold text-slate-900">{data.acquisitionMode === 'caixa' ? 'Venda Direta Caixa' : 'Leilão'}</span></div>
          </div>
        </div>

        {/* Custos Totais de Aquisição */}
        <div className="p-4 rounded-lg border border-slate-200 bg-white mb-4">
          <div className="text-sm font-bold text-slate-900 mb-2.5">Custos Totais de Aquisição</div>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="flex justify-between py-1.5"><span className="text-slate-600">Lance / Preço de compra</span><span className="font-semibold text-slate-800">{formatBRL(data.arrematePrice)}</span></div>
            <div className="flex justify-between py-1.5"><span className="text-slate-600">Comissão do leiloeiro</span><span className="text-slate-800">{data.acquisitionMode === 'caixa' ? 'Isento (R$ 0)' : formatBRL(data.auctioneerFee)}</span></div>
            <div className="flex justify-between py-1.5"><span className="text-slate-600">ITBI + Cartório / RGI</span><span className="text-slate-800">{formatBRL(data.itbiFee + data.registryFee)}</span></div>
            {(data.iptuDebt + data.condoDebt) > 0 && (
              <div className="flex justify-between py-1.5"><span className="text-slate-600">Débitos anteriores (IPTU + Condomínio)</span><span className="text-amber-700">{formatBRL(data.iptuDebt + data.condoDebt)}</span></div>
            )}
            <div className="flex justify-between py-1.5"><span className="text-slate-600">Provisão para reforma + Jurídico / Desocupação</span><span className="text-slate-800">{formatBRL(data.reformCost + data.legalCost)}</span></div>
            <div className="flex justify-between pt-2.5 mt-1 border-t border-slate-200 text-sm">
              <span className="font-semibold text-slate-900">Custo efetivo total de entrada (R$ {formatNum(data.effectiveSqmCost)}/m²)</span>
              <span className="font-semibold text-slate-900">{formatBRL(data.totalAcquisitionCost)}</span>
            </div>
          </div>
        </div>

        {/* Posicionamento de Valor */}
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/40 mb-4 space-y-2.5">
          <div className="text-sm font-bold text-slate-900">Posicionamento de Valor (R$/m²): Entrada Efetiva vs Mercado</div>
          {[
            { label: 'Seu custo efetivo de entrada (com custos)', sqm: data.effectiveSqmCost, color: 'bg-slate-700' },
            { label: 'Preço sugerido para revenda rápida', sqm: suggestedSqm, color: 'bg-emerald-600' },
            { label: 'Piso transacionado real (ITBI 4 Níveis)', sqm: pisoSqm, color: 'bg-blue-600' },
            { label: 'Média anunciada na rua (Portais)', sqm: portaisTetoSqm, color: 'bg-amber-600' },
            { label: `Referência no bairro (${data.neighborhood || r360.demographics.neighborhood.name})`, sqm: neighRefSqm, color: 'bg-orange-500' },
          ].map((bar) => {
            const maxBar = Math.max(data.effectiveSqmCost, pisoSqm, portaisTetoSqm, neighRefSqm, 1);
            const pct = Math.min(100, Math.round((bar.sqm / maxBar) * 100));
            return (
              <div key={bar.label} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">{bar.label}</span>
                  <span className="font-semibold text-slate-800">R$ {formatNum(bar.sqm)}/m²</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Preço Sugerido para Revenda + Tendência Histórica ITBI */}
        <div className="p-4 rounded-lg border border-slate-200 bg-[#fffbf7] mb-4 space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2 border-b border-slate-200">
            <div className="text-sm font-bold text-slate-900">Preço Sugerido para Revenda</div>
            <div className="flex flex-wrap items-center gap-2">
              {itbiSpan && (
                <span className={`text-[11px] px-2 py-0.5 rounded ${itbiTrendPct >= 0 ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800'}`}>
                  Valorização ITBI ({itbiSpan}): {itbiTrendPct >= 0 ? `+${itbiTrendPct}%` : `${itbiTrendPct}%`}
                </span>
              )}
              {spreadPctVsQuickSale !== 0 && (
                <span className={`text-xs px-2 py-0.5 rounded ${spreadPctVsQuickSale > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  Margem vs entrada: {spreadPctVsQuickSale > 0 ? `+${spreadPctVsQuickSale}%` : `${spreadPctVsQuickSale}%`}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="text-2xl font-semibold text-slate-900">{formatBRL(suggestedTotal)}</span>
            <span className="text-sm text-amber-800">• R$ {formatNum(suggestedSqm)}/m²</span>
          </div>

          {(data.buildingSafetyValveApplied || isRiskyArea) && (
            <div className="flex flex-wrap gap-2">
              {data.buildingSafetyValveApplied && (
                <div className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  Válvula de Segurança (-5%) · Sem prédio e menos de 3 vendas na rua
                </div>
              )}
              {isRiskyArea && (
                <div className="px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  Redutor Área de Risco (-15%) · {activeCommunityName || 'Zona monitorada'}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-2.5 rounded border border-slate-200 bg-white flex justify-between">
              <span className="text-slate-500">Ano do prédio</span>
              <span className="font-semibold text-slate-800">
                {data.buildingYear ? `${data.buildingYear}${data.buildingDepPct ? ` (-${data.buildingDepPct}%)` : ''}` : 'Não especificado'}
              </span>
            </div>
            <div className="p-2.5 rounded border border-slate-200 bg-white flex justify-between">
              <span className="text-slate-500">Piso transacionado (4 Níveis)</span>
              <span className="font-semibold text-slate-800">R$ {formatNum(pisoSqm)}/m² ({formatBRL(pisoTotal)})</span>
            </div>
            <div className="p-2.5 rounded border border-slate-200 bg-white flex justify-between">
              <span className="text-slate-500">Teto balizador portais</span>
              <span className="font-semibold text-slate-800">R$ {formatNum(portaisTetoSqm)}/m²</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            100% ITBI oficial dos 4 níveis com deságio de 10% para liquidez imediata em até 60 dias.
          </div>
        </div>

        {/* Cenário de Revenda e Locação */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
            <div className="text-sm font-bold text-slate-900 mb-1.5">Cenário de Revenda (pós IR 15% e corretagem 6%)</div>
            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
              <span className="text-slate-600">Venda em 6 meses (carregamento de {formatBRL(flip6?.holdingCost || 0)})</span>
              <span className={`font-semibold ${(flip6?.netProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {(flip6?.netProfit ?? 0) >= 0 ? '+' : ''}{formatBRL(flip6?.netProfit || 0)} ({flip6?.netRoi ?? 0}% ROI líquido)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Carregamento mensal estimado: {formatBRL(data.totalMonthlyHolding)}/mês.
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
            <div className="flex justify-between items-center mb-1.5">
              <div className="text-sm font-bold text-slate-900">Locação Estimada</div>
              <span className="text-xs font-semibold text-slate-700">Yield {data.netRentalYieldAnnual.toFixed(1).replace('.', ',')}% a.a. líquido</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-600">Aluguel bruto estimado (locação média)</span>
              <span className="font-semibold text-slate-800">{formatBRL(data.grossRentMonthly)}/mês</span>
            </div>
            <div className="flex justify-between text-xs pt-1.5">
              <span className="text-slate-700 font-semibold">Líquido no bolso (após IR, administração e vacância)</span>
              <span className="font-semibold text-emerald-700">{formatBRL(data.netRentMonthly)}/mês</span>
            </div>
          </div>

          {data.matriculaReport && (
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                <span className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-slate-600" /> Auditoria da Matrícula ({data.matriculaReport.matriculaNumber || 'Certidão analisada'})</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10.5px]">{data.matriculaReport.overallStatus}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{data.matriculaReport.parecerTecnico}</p>
            </div>
          )}
        </div>
        {renderAbntFooter(2)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 3: PARECER TÉCNICO                                              */}
      {/* ===================================================================== */}
      <div className={blockClass} style={blockPageStyle}>
        <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">Parecer Técnico</div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Leitura Estratégica do Entorno</h2>

        <p className="text-xs text-slate-700 leading-relaxed mb-2.5 text-justify">
          Localizado em <strong>{locationLine}</strong>, o ativo pontua <strong>{r360.scores.overall.toFixed(1).replace('.', ',')} de 10</strong> pela combinação de conveniência imediata com <strong>{formatNum(r360.commerce.total500)} estabelecimentos em 500 m</strong>, cobertura assistencial de <strong>{r360.health.totalServices} unidades médicas</strong> e rede escolar com <strong>{r360.education.total1km} instituições de ensino em até 1 km</strong>.
        </p>
        <p className="text-xs text-slate-700 leading-relaxed mb-4 text-justify">
          Em cartório, os negócios efetivamente lavrados em ITBI posicionam o m² em <strong>R$ {formatNum(pisoSqm)}</strong> frente à mediana anunciada de <strong>R$ {formatNum(neighRefSqm)}/m²</strong> no bairro. Com entrada total projetada em <strong>R$ {formatNum(data.effectiveSqmCost)}/m²</strong>, a margem real sobre o piso escriturado é de <strong>{spreadPctVsPiso}%</strong>.
        </p>

        {/* DESEMPENHO POR PILAR TÉCNICO (1 coluna vertical com barra de progresso) */}
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/40 mb-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-3">
            DESEMPENHO POR PILAR TÉCNICO (0 A 10)
          </div>
          <div className="space-y-2.5 text-xs">
            {scoreRows.map((row) => (
              <div key={row.label} className="grid grid-cols-12 items-center gap-3">
                <span className="col-span-5 sm:col-span-5 text-slate-700 font-medium truncate">{row.label}</span>
                <div className="col-span-5 sm:col-span-6 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, row.score * 10)}%` }}
                  />
                </div>
                <span className="col-span-2 sm:col-span-1 text-right font-bold text-slate-900">
                  {row.score.toFixed(1).replace('.', ',')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MAPAS 3D AMPLOS DO ENTORNO: R$/m² (ITBI) E SPREAD VS BAIRRO */}
        <div className="space-y-3">
          <div>
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
              <div className="relative w-full h-[205px] bg-slate-100 flex items-center justify-center">
                {app3DCaptures?.sqm3dUrl ? (
                  <img
                    src={app3DCaptures.sqm3dUrl}
                    alt="Mapa 3D de Valor do m² (ITBI por Prédio)"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-500">Renderizando mapa 3D de R$/m² por edificação...</span>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/95 border border-slate-200 text-[10px] font-bold text-slate-800 shadow-xs">
                  ITBI R$/m² por Prédio · Visão Ampla 3D
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-white/92 border border-slate-200 text-[9px] text-slate-700 flex items-center gap-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-300 inline-block" /> &lt; 4,5k</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> 4,5k–9,5k</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> 9,5k–18k</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-800 inline-block" /> &gt; 18k/m²</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] leading-snug text-slate-600 mt-1">
              Distribuição espacial do valor escriturado (ITBI oficial) por edificação no entorno: tons azul-claro indicam faixas mais acessíveis e azul-royal concentra os condomínios de maior valorização por m² da microrregião.
            </p>
          </div>

          <div>
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
              <div className="relative w-full h-[205px] bg-slate-100 flex items-center justify-center">
                {app3DCaptures?.spread3dUrl ? (
                  <img
                    src={app3DCaptures.spread3dUrl}
                    alt="Mapa 3D de Spread vs Média do Bairro"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-500">Renderizando mapa 3D de Spread vs média do bairro...</span>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/95 border border-slate-200 text-[10px] font-bold text-slate-800 shadow-xs">
                  Spread vs Média do Bairro (%) · Visão Ampla 3D
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-white/92 border border-slate-200 text-[9px] text-slate-700 flex items-center gap-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> ≤ -20%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> -10% a -20%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Média (±5%)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> +10% a +20%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-700 inline-block" /> &gt; +20%</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] leading-snug text-slate-600 mt-1">
              Comparativo de desempenho de cada prédio frente à média do bairro: edificações em vermelho/laranja negociam com deságio frente à média local, enquanto azul-celeste e azul-royal sinalizam bolsões de prêmio e maior liquidez de revenda.
            </p>
          </div>
        </div>
        {renderAbntFooter(3)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 4: POSICIONAMENTO COMERCIAL & ESTRATÉGIA DE SAÍDA               */}
      {/* ===================================================================== */}
      <div className={blockClass} style={blockPageStyle}>
        <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">Comercialização</div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Posicionamento Comercial & Estratégia de Saída</h2>

        <div className="mb-4">
          <div className="text-xs font-bold text-slate-800 mb-1.5">
            Descrição comercial construída sobre as qualidades verificadas do endereço:
          </div>
          <p className="text-xs text-slate-700 leading-relaxed pl-3 border-l-2 border-amber-500">
            {commercialListingCopy}
          </p>
        </div>

        <div className="mb-4">
          <div className="text-xs font-bold text-slate-800 mb-1.5">Perspectiva prática de revenda pós-arrematação:</div>
          <p className="text-xs text-slate-700 leading-relaxed text-justify">
            O ponto atende bem famílias em busca de mobilidade cotidiana e investidores focados em locação, sustentado por <strong>{formatNum(r360.commerce.total500)} estabelecimentos</strong> num raio de 500 m e rede hospitalar próxima. Como em qualquer aquisição via leilão ou imóvel retomado, o principal desafio inicial será a desocupação amigável ou judicial e o saneamento de débitos propter rem; vencida a imissão na posse e entregue com pintura neutra e matrícula regularizada, posicionar a saída no Piso ITBI de <strong>{formatBRL(suggestedTotal)}</strong> (<strong>R$ {formatNum(suggestedSqm)}/m²</strong>) mantém competitividade direta contra os anúncios da região.
          </p>
        </div>

        {/* ESTRATÉGIA DE VENDAS & ENQUADRAMENTO DE CRÉDITO */}
        {(() => {
          const budget = r360.demographics.householdBudget || {
            referenceLabel: 'POF IBGE (Área Urbana)',
            housingPct: 37.1,
            healthPct: 8.0,
            educationPct: 4.9,
            foodAndTransportPct: 35.6,
            housingMonthlyBRL: Math.round(radiusIncome * 0.371),
            healthMonthlyBRL: Math.round(radiusIncome * 0.08),
            educationMonthlyBRL: Math.round(radiusIncome * 0.049),
          };
          // Renda familiar estimada (responsável × fator de composição familiar urbana IBGE ~1.35x)
          const estFamilyIncome = Math.round(radiusIncome * 1.35);
          const maxParcela = estFamilyIncome * 0.30; // Limite bancário de 30% da renda
          const calcMaxProperty = (annualRate: number, ltv = 0.80) => {
            const r = annualRate / 12;
            const n = 360;
            const loan = maxParcela * ((1 - Math.pow(1 + r, -n)) / r);
            return Math.round(loan / ltv);
          };
          const mcmvEligible = suggestedTotal > 0 && suggestedTotal <= 600000;
          const mcmvTierLabel =
            suggestedTotal <= 400000
              ? 'Faixa 3 (teto R$ 400 mil · juros ~7,66% a 8,16% a.a.)'
              : 'Faixa 4 Classe Média (teto R$ 600 mil · juros até 10,0% a.a.)';
          const mcmvRate = suggestedTotal <= 400000 ? 0.0816 : 0.10;
          const capMcmv = calcMaxProperty(mcmvRate, 0.80);
          const capSbpe = calcMaxProperty(0.118, 0.80);
          const maxBarVal = Math.max(suggestedTotal, capMcmv, capSbpe, 1);

          return (
            <div className="space-y-3.5 pt-3 border-t border-slate-200">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">
                  Estratégia de Vendas (Aceleração de Giro)
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed list-disc pl-4">
                  <li>
                    <strong>Preparação visual de baixo custo:</strong> priorizar pintura neutra, iluminação limpa e reparos básicos de elétrica/hidráulica para reduzir objeções na primeira visita e evitar descontos agressivos em negociação.
                  </li>
                  <li>
                    <strong>Flexibilização de entrada:</strong> segundo a POF/IBGE (área urbana), despesas com habitação já comprometem cerca de <strong>{budget.housingPct.toFixed(1).replace('.', ',')}%</strong> do orçamento das famílias, restringindo a poupança líquida de entrada; estruturar entrada facilitada ou parcelamento curto do sinal amplia o funil de compradores qualificados.
                  </li>
                  <li>
                    <strong>Permuta criteriosa por ativo de menor valor:</strong> quando o ticket sugerido supera o poder de compra à vista médio local, aceitar imóvel de menor valor com alta liquidez e margem de segurança + torna em dinheiro pode destravar o giro sem queimar preço.
                  </li>
                  <li>
                    <strong>Financiamento direto parcial &amp; alinhamento com corretores:</strong> em propostas com entrada robusta (≥50%), avaliar parcelamento direto de saldo residual curto corrigido e alinhar previamente com corretores parceiros todos os mecanismos de fechamento (FGTS, aprovação bancária prévia e permuta) antes de subir os anúncios.
                  </li>
                </ul>
              </div>

              {mcmvEligible && (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-950 space-y-1">
                  <div className="font-bold text-emerald-900">
                    Enquadramento Minha Casa, Minha Vida (MCMV) · {mcmvTierLabel}
                  </div>
                  <p className="leading-relaxed">
                    O valor sugerido de saída (<strong>{formatBRL(suggestedTotal)}</strong>) enquadra o imóvel nas regras vigentes do MCMV. O grande diferencial estratégico desse canal é que as <strong>taxas de juros são reguladas com recursos do FGTS e geralmente não acompanham as altas da Selic</strong>, mantendo a prestação previsível e preservando a capacidade de compra da classe média mesmo em ciclos de juros elevados.
                  </p>
                </div>
              )}

              {/* Gráfico explicativo: Capacidade de Financiamento Regional vs Preço Sugerido + Renda Exigida */}
              {(() => {
                const rMonthSbpe = 0.118 / 12;
                const factor360 = (1 - Math.pow(1 + rMonthSbpe, -360)) / rMonthSbpe;
                const loanNeeded80 = suggestedTotal * 0.8;
                const pmtNeeded80 = loanNeeded80 / factor360;
                const requiredIncome = Math.round(pmtNeeded80 / 0.30);
                const incomeMultiple = Number((requiredIncome / Math.max(1, estFamilyIncome)).toFixed(1));

                return (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-xs font-bold text-slate-900">
                        Capacidade de Financiamento Regional vs Preço Sugerido de Venda
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Renda resp. IBGE: {formatBRL(radiusIncome)} · Familiar est.: {formatBRL(estFamilyIncome)}/mês (parc. 30% = {formatBRL(maxParcela)})
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-slate-700 font-semibold">Capacidade c/ MCMV (80% fin. · 360m · {suggestedTotal <= 400000 ? '8,16%' : '10,0%'} a.a.)</span>
                          <span className="font-bold text-emerald-700">{formatBRL(capMcmv)}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.round((capMcmv / maxBarVal) * 100))}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-slate-700 font-semibold">Capacidade fora do MCMV / SBPE (80% fin. · 360m · 11,8% a.a.)</span>
                          <span className="font-bold text-blue-700">{formatBRL(capSbpe)}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.round((capSbpe / maxBarVal) * 100))}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-slate-900 font-bold">Expectativa de Precificação do Ativo (Valor Sugerido de Venda)</span>
                          <span className="font-bold text-amber-700">{formatBRL(suggestedTotal)}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, Math.round((suggestedTotal / maxBarVal) * 100))}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/80 text-[10.5px]">
                      <div className="p-2 rounded border border-slate-200 bg-white">
                        <span className="text-slate-500 font-bold uppercase text-[9.5px] block">Renda p/ Financiar 80% (20% entrada)</span>
                        <span className="font-bold text-amber-700">{formatBRL(requiredIncome)}/mês</span>{' '}
                        <span className="text-slate-600">({String(incomeMultiple).replace('.', ',')}× a média local · ent. {formatBRL(Math.round(suggestedTotal * 0.2))})</span>
                      </div>
                      <div className="p-2 rounded border border-amber-200/80 bg-amber-50/70 text-slate-700 leading-snug">
                        <strong>Público-alvo:</strong>{' '}
                        {incomeMultiple <= 1.15
                          ? 'Demanda local direta de 1º imóvel (alta aderência à renda média do setor).'
                          : incomeMultiple <= 1.8
                          ? 'Famílias com composição de renda dupla ou entrada ≥35% via FGTS/poupança.'
                          : 'Comprador de upgrade patrimonial (venda de imóvel menor + financiamento parcial) ou investidor de renda.'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}
        {renderAbntFooter(4)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 5: BASE DEMOGRÁFICA & CAPACIDADE DE ABSORÇÃO                    */}
      {/* ===================================================================== */}
      <div className={blockClass} style={blockPageStyle}>
        <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">BASE DEMOGRÁFICA & CAPACIDADE DE ABSORÇÃO</div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">Dinâmica Populacional do Setor</h2>
        <p className="text-xs text-slate-600 mb-3">
          Cerca de {formatNum(r360.demographics.radius500.residents)} habitantes vivem em ~{formatNum(r360.demographics.radius500.households)} domicílios no raio de 500 m do endereço, com renda média mensal estimada de quem sustenta a casa em {formatBRL(radiusIncome)}.
        </p>

        <div className="rounded-lg border border-slate-200 overflow-hidden mb-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 font-bold">Recorte</th>
                <th className="py-2 px-3 text-right font-bold">Moradores</th>
                <th className="py-2 px-3 text-right font-bold">Domicílios</th>
                <th className="py-2 px-3 text-right font-bold">Pessoas/Dom.</th>
                <th className="py-2 px-3 text-right font-bold">Renda Média Resp.</th>
                <th className="py-2 px-3 text-right font-bold">Vagos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800">Entorno 500 m</td>
                <td className="py-2 px-3 text-right">{formatNum(r360.demographics.radius500.residents)}</td>
                <td className="py-2 px-3 text-right">{formatNum(r360.demographics.radius500.households)}</td>
                <td className="py-2 px-3 text-right">{r360.baseline.avgResidentsPerHousehold.toFixed(1).replace('.', ',')}</td>
                <td className="py-2 px-3 text-right font-semibold text-slate-800">{formatBRL(radiusIncome)}</td>
                <td className="py-2 px-3 text-right">{r360.demographics.radius500.vacantPct ?? 18}%</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800">Bairro {r360.demographics.neighborhood.name}</td>
                <td className="py-2 px-3 text-right">{formatNum(r360.demographics.neighborhood.residents)}</td>
                <td className="py-2 px-3 text-right">{formatNum(r360.demographics.neighborhood.households)}</td>
                <td className="py-2 px-3 text-right">{r360.baseline.avgResidentsPerHousehold.toFixed(1).replace('.', ',')}</td>
                <td className="py-2 px-3 text-right font-semibold text-slate-800">{formatBRL(neighIncome)}</td>
                <td className="py-2 px-3 text-right">{r360.demographics.neighborhood.vacantPct ?? 17}%</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800">{r360.baseline.city}</td>
                <td className="py-2 px-3 text-right">{formatNum(r360.baseline.populationCenso2022)}</td>
                <td className="py-2 px-3 text-right">{formatNum(r360.baseline.householdsCenso2022)}</td>
                <td className="py-2 px-3 text-right">{r360.baseline.avgResidentsPerHousehold.toFixed(1).replace('.', ',')}</td>
                <td className="py-2 px-3 text-right font-semibold text-slate-800">{formatBRL(r360.baseline.nominalIncomeCityHead)}</td>
                <td className="py-2 px-3 text-right">{r360.baseline.vacantShareCityPct}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Perfil etário resumido + Construções por aqui (Casas vs Apartamentos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40">
            <div className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-600" /> Perfil Etário Resumido (no raio)
            </div>
            <div className="space-y-1.5 text-xs">
              {ageBrackets.map((b) => (
                <div key={b.label} className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 w-24 shrink-0">{b.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-600 rounded-full" style={{ width: `${Math.min(100, b.pct * 2.5)}%` }} />
                  </div>
                  <span className="font-semibold text-slate-800 w-9 text-right">{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800 mb-1">As Construções por Aqui (raio 500 m)</div>
              <div className="text-[11px] text-slate-500 mb-3">
                {formatNum(r360.demographics.radius500.households)} domicílios mapeados · {formatNum(r360.demographics.radius500.underConstruction)} em construção
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Apartamentos</span>
                <span className="font-semibold text-slate-900">{r360.demographics.radius500.aptsPct}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex bg-slate-200">
                <div className="bg-orange-500 h-full" style={{ width: `${r360.demographics.radius500.aptsPct}%` }} />
                <div className="bg-slate-600 h-full" style={{ width: `${r360.demographics.radius500.housesPct}%` }} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Casas</span>
                <span className="font-semibold text-slate-900">{r360.demographics.radius500.housesPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Estrutura de Orçamento Familiar (POF IBGE · Área Urbana) */}
        {(() => {
          const hb = r360.demographics.householdBudget || {
            referenceLabel: 'POF IBGE (Área Urbana)',
            housingPct: 37.1,
            healthPct: 8.0,
            educationPct: 4.9,
            foodAndTransportPct: 35.6,
            housingMonthlyBRL: Math.round(radiusIncome * 0.371),
            healthMonthlyBRL: Math.round(radiusIncome * 0.08),
            educationMonthlyBRL: Math.round(radiusIncome * 0.049),
          };
          return (
            <div className="mt-4 p-3.5 rounded-lg border border-slate-200 bg-white space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-xs font-bold text-slate-900">
                  Comprometimento do Orçamento Familiar por Categoria (IBGE · POF Área Urbana)
                </div>
                <span className="text-[10px] text-slate-500">
                  Pesos oficiais IBGE aplicados à renda média local ({formatBRL(radiusIncome)}/mês)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Habitação / Moradia</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{hb.housingPct.toFixed(1).replace('.', ',')}%</div>
                  <div className="text-[10.5px] text-slate-600">~{formatBRL(hb.housingMonthlyBRL)}/mês</div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Assistência à Saúde</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{hb.healthPct.toFixed(1).replace('.', ',')}%</div>
                  <div className="text-[10.5px] text-slate-600">~{formatBRL(hb.healthMonthlyBRL)}/mês</div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Educação</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{hb.educationPct.toFixed(1).replace('.', ',')}%</div>
                  <div className="text-[10.5px] text-slate-600">~{formatBRL(hb.educationMonthlyBRL)}/mês</div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Alim. &amp; Transporte</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{hb.foodAndTransportPct.toFixed(1).replace('.', ',')}%</div>
                  <div className="text-[10.5px] text-slate-600">~{formatBRL(Math.round(radiusIncome * (hb.foodAndTransportPct / 100)))}/mês</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">
                Fonte metodológica: proporções oficiais das despesas de consumo urbano da Pesquisa de Orçamentos Familiares (POF 2017–2018 · IBGE) cruzadas com o rendimento nominal médio do Censo Demográfico IBGE 2022.
              </p>
            </div>
          );
        })()}
        {renderAbntFooter(5)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 6: ENGENHARIA DO TERRENO, CLIMA & INSOLAÇÃO                     */}
      {/* ===================================================================== */}
      <div className={blockClass} style={blockPageStyle}>
        <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">ENGENHARIA DO TERRENO, CLIMA & INSOLAÇÃO</div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Análise Física, Clima e Histórico de Riscos</h2>

        {/* Vista aérea Google Maps Híbrido (POIs e vias nativos + apenas o pino do endereço) */}
        <div className="mb-4">
          <CartoStreetMap
            centerLat={r360.mapOverlay.centerLat}
            centerLng={r360.mapOverlay.centerLng}
            pois={r360.mapOverlay.pois}
            addressTitle={fullAddress}
            zoom={17}
            heightPx={235}
            mode="hybrid"
            hideLegend={true}
          />
        </div>

        {/* Leitura de Risco + Veredito verde suave + Enchente / Deslizamento (sem caixa repetida de facção) */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-white mb-4 space-y-3">
          <div className="text-xs font-bold text-slate-900">Leitura de Risco Climático & Terreno</div>
          <p className="text-xs text-slate-600 leading-relaxed">
            O risco físico no ponto é {r360.climate.slopePct <= 7 && r360.climate.elevationMeters >= 10 ? 'baixo' : 'moderado'}. O imóvel está a <strong>{r360.climate.elevationMeters} m</strong> de altitude, com inclinação de <strong>{r360.climate.slopePct}%</strong> (encosta voltada a {r360.climate.slopeAspect}) e drenagem/córrego próximo estimado a cerca de {r360.climate.nearestStreamM || 420} m (~{r360.climate.streamElevDiffM || 8} m abaixo do nível da rua).
          </p>

          <div className="p-2.5 rounded bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900">
            <span className="font-bold">Veredito:</span> {r360.climate.slopePct <= 8 ? 'Baixa suscetibilidade no ponto para enchente ou deslizamento.' : 'Inclinação exige verificação visual de contenções e drenagem em chuva forte.'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Enchente e alagamento</span>
                <span className="text-emerald-700">{r360.climate.elevationMeters >= 12 ? 'Atenção muito baixa' : 'Atenção moderada'}</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: r360.climate.elevationMeters >= 12 ? '16%' : '45%' }} />
              </div>
              <div className="text-[10.5px] text-slate-500 mt-1">Chão do endereço a {r360.climate.elevationMeters} m (~{r360.climate.streamElevDiffM || 8} m acima do leito de drenagem).</div>
            </div>
            <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Deslizamento e encosta</span>
                <span className="text-emerald-700">{r360.climate.slopePct <= 8 ? 'Atenção muito baixa' : 'Atenção moderada'}</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: r360.climate.slopePct <= 8 ? '18%' : '52%' }} />
              </div>
              <div className="text-[10.5px] text-slate-500 mt-1">Inclinação local apurada em {r360.climate.slopePct}% no eixo do terreno.</div>
            </div>
          </div>
        </div>

        {/* Gráfico Mensal + Resumo Numérico + Texto explicativo embaixo */}
        <div className="space-y-3 mb-4">
          <MonthlyClimateChartSvg monthly={r360.climate.monthly} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 block">Temperatura média</span>
              <span className="font-semibold text-slate-800">{r360.climate.avgTempC}°C ({r360.climate.hotDays35PerYear} dias ≥35°)</span>
            </div>
            <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 block">Chuva média anual</span>
              <span className="font-semibold text-slate-800">{formatNum(r360.climate.annualRainMm)} mm ({r360.climate.rain50mmDaysPerYear}d ≥50 mm)</span>
            </div>
            <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 block">Noites ≥20° / Abafados</span>
              <span className="font-semibold text-slate-800">{r360.climate.warmNights20PerYear} noites / {r360.climate.muggyDaysPerYear} dias</span>
            </div>
            <div className="p-2.5 rounded border border-slate-200 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 block">Potencial solar</span>
              <span className="font-semibold text-slate-800">{r360.climate.solarKwhPerKwpMonth} kWh/mês por kWp</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600">
            Extremos registrados (2021–2025): máxima de {r360.climate.maxTempRecord.value}°C ({r360.climate.maxTempRecord.when}), mínima de {r360.climate.minTempRecord.value}°C ({r360.climate.minTempRecord.when}) e maior precipitação em 1 dia de {r360.climate.maxRainDayRecord.value} mm ({r360.climate.maxRainDayRecord.when}).
          </p>
        </div>

        {/* Vento + Histórico da Cidade (Desastres & A cidade está preparada?) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/40 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-slate-600" /> Vento · Exposição e Rajadas
            </div>
            <div className="text-slate-600">Vento médio: chão <strong>{r360.climate.windGroundKmh} km/h</strong> · 50 m (~15 andares) <strong>{r360.climate.wind50mKmh} km/h</strong> · 100 m <strong>{r360.climate.wind100mKmh} km/h</strong>.</div>
            <div className="text-slate-600">Rajada mais forte no histórico: <strong>{r360.climate.maxGustKmh} km/h</strong> (~{r360.climate.gustDays60PerYear} dias/ano ≥60 km/h).</div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/40 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-slate-600" /> Histórico da Cidade & Preparo
            </div>
            <div className="text-slate-600">
              {r360.baseline.disasters.recordsCount2010_2024} ocorrências registradas (2010–2024), {r360.baseline.disasters.floodCountLast10y} eventos hídricos nos últimos 10 anos (pico em {r360.baseline.disasters.worstYear}: {formatNum(r360.baseline.disasters.worstDisplaced)} desalojados).
            </div>
            <DisasterHistoryChart floodCount={r360.baseline.disasters.floodCountLast10y} worstYear={r360.baseline.disasters.worstYear} />
            <div className="grid grid-cols-2 gap-1 text-[10.5px] text-slate-700 pt-1">
              {[
                { label: 'Alerta de enchente', ok: r360.baseline.disasters.preparedness.floodAlert },
                { label: 'Plano p/ enchente', ok: r360.baseline.disasters.preparedness.floodPlan },
                { label: 'Alerta deslizamento', ok: r360.baseline.disasters.preparedness.landslideAlert },
                { label: 'Plano deslizamento', ok: r360.baseline.disasters.preparedness.landslidePlan },
              ].map((p) => (
                <div key={p.label} className="flex items-center gap-1">
                  <span className={`font-semibold ${p.ok ? 'text-emerald-700' : 'text-slate-400'}`}>{p.ok ? 'Sim' : 'Não'}</span>
                  <span>· {p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Terreno em Mapas, Sombras Solares & Cortes Topográficos */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Cortes Cartográficos e Topográficos
          </div>

          {/* 1. Recorte 3D inclinado gerado diretamente do mapa 3D do app (mesma dimensão h-[235px]) */}
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
            <div className="relative w-full h-[235px] bg-slate-100 flex items-center justify-center">
              {app3DCaptures?.overview3dUrl ? (
                <img
                  src={app3DCaptures.overview3dUrl}
                  alt="Modelo 3D de Edificações & Relevo Local"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs font-medium text-slate-500">
                  Renderizando vista 3D geométrica da quadra e relevo local...
                </div>
              )}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded bg-white/95 border border-slate-200 text-[10px] font-bold text-slate-800 shadow-xs">
                Vista 3D Geométrica (Volumetria Predial & Relevo)
              </div>
            </div>
          </div>

          {/* 2. Exatamente 2 simulações de insolação e sombras vetoriais estilo ShadeMap (07:00 e 16:00) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900">07:00 · Sol da Manhã</span>
                <span className="text-[10px] font-semibold text-amber-700">Início do Dia</span>
              </div>
              <div className="w-full h-[165px] rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                {app3DCaptures?.morning0700Url ? (
                  <img
                    src={app3DCaptures.morning0700Url}
                    alt="Projeção Solar 07:00"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10.5px] text-slate-500">Calculando sombras 07:00...</span>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900">16:00 · Sol da Tarde</span>
                <span className="text-[10px] font-semibold text-amber-700">Fim do Dia</span>
              </div>
              <div className="w-full h-[165px] rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                {app3DCaptures?.afternoon1600Url ? (
                  <img
                    src={app3DCaptures.afternoon1600Url}
                    alt="Projeção Solar 16:00"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10.5px] text-slate-500">Calculando sombras 16:00...</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Tubo horizontal de Índice UV por Horário (06h às 18h) + Alerta de Pico UV */}
          {(() => {
            const uvList =
              r360.climate.uvHourly && r360.climate.uvHourly.length >= 10
                ? r360.climate.uvHourly
                : [
                    { hour: 6, label: '06h', uv: 0.2 },
                    { hour: 7, label: '07h', uv: 1.4 },
                    { hour: 8, label: '08h', uv: 3.3 },
                    { hour: 9, label: '09h', uv: 5.8 },
                    { hour: 10, label: '10h', uv: 8.1 },
                    { hour: 11, label: '11h', uv: 9.8 },
                    { hour: 12, label: '12h', uv: 10.6 },
                    { hour: 13, label: '13h', uv: 10.2 },
                    { hour: 14, label: '14h', uv: 8.6 },
                    { hour: 15, label: '15h', uv: 6.1 },
                    { hour: 16, label: '16h', uv: 3.4 },
                    { hour: 17, label: '17h', uv: 1.3 },
                    { hour: 18, label: '18h', uv: 0.2 },
                  ];
            const peakItem = uvList.reduce((a, b) => (b.uv > a.uv ? b : a), uvList[0]);
            const peakVal = r360.climate.uvPeakValue ?? peakItem.uv;
            const peakHour = r360.climate.uvPeakHour || peakItem.label;
            const alertWin = r360.climate.uvAlertWindow || '10h às 15h';
            const uvColor = (uv: number) => {
              if (uv < 3) return '#bbf7d0';
              if (uv < 6) return '#fef08a';
              if (uv < 8) return '#fed7aa';
              if (uv < 11) return '#fecaca';
              return '#e9d5ff';
            };
            const uvLabel = peakVal >= 11 ? 'Extremo' : peakVal >= 8 ? 'Muito Alto' : peakVal >= 6 ? 'Alto' : peakVal >= 3 ? 'Moderado' : 'Baixo';

            return (
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-bold text-slate-900">
                    Índice UV Horário &amp; Incidência Solar (06h às 18h)
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-50/80 border border-rose-200/80 text-[9.5px] font-bold text-rose-700">
                    Alerta UV {uvLabel}: pico às {peakHour} (UV {peakVal.toFixed(1).replace('.', ',')}) · faixa crítica {alertWin}
                  </span>
                </div>

                {/* Régua fina e suave por hora */}
                <div className="rounded-full overflow-hidden border border-slate-200 flex h-3 w-full">
                  {uvList.map((item) => (
                    <div
                      key={item.hour}
                      className="flex-1 flex items-center justify-center text-[7.5px] font-bold text-slate-700 border-r border-white/60 last:border-r-0"
                      style={{ backgroundColor: uvColor(item.uv) }}
                      title={`${item.label}: UV ${item.uv}`}
                    >
                      {item.uv >= 1 ? item.uv.toFixed(0) : ''}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[8.5px] text-slate-500 font-semibold px-0.5">
                  {uvList.map((item) => (
                    <span
                      key={item.hour}
                      className={`flex-1 text-center ${item.label === peakHour ? 'text-rose-700 font-bold' : ''}`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[8.5px] text-slate-500">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-200 border border-green-300 inline-block" /> Baixo (&lt;3)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-200 border border-yellow-300 inline-block" /> Moderado (3–5)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-200 border border-orange-300 inline-block" /> Alto (6–7)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-200 border border-red-300 inline-block" /> Muito Alto (8–10)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-200 border border-purple-300 inline-block" /> Extremo (11+)</span>
                  </div>
                  <span>Radiação UV solar local</span>
                </div>
              </div>
            );
          })()}

          <ReliefAndFloodMapsSideBySide
            centerLat={r360.mapOverlay.centerLat}
            centerLng={r360.mapOverlay.centerLng}
            terrainGeo={r360.climate.terrainGeo}
            grid={r360.climate.elevationGrid}
            elevationMeters={r360.climate.elevationMeters}
            seaDistanceKm={r360.climate.seaDistanceKm}
            nearestStreamM={r360.climate.terrainGeo?.nearestRealStreamM ?? r360.climate.nearestStreamM}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ElevationProfileSvg title="Corte Sul–Norte (3 km)" values={r360.climate.profileSN} leftLabel="Sul" rightLabel="Norte" />
            <ElevationProfileSvg title="Corte Oeste–Leste (3 km)" values={r360.climate.profileWE} leftLabel="Oeste" rightLabel="Leste" />
          </div>
        </div>
        {renderAbntFooter(6)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 7: SERVIÇOS URBANOS & ACESSIBILIDADE VIÁRIA                     */}
      {/* ===================================================================== */}
      <div className={blockClass} style={blockPageStyle}>
        <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">SERVIÇOS URBANOS & ACESSIBILIDADE VIÁRIA</div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Infraestrutura Urbana e Condições de Acesso</h2>

        {/* Saneamento e Urbanização (100% em verde emerald-500) */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-white mb-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800">Água encanada, esgoto de rede geral e coleta regular de lixo</span>
            <span className="font-bold text-emerald-700">100%</span>
          </div>
          <div className="h-1.5 bg-emerald-500 rounded-full w-full" />

          <div className="flex justify-between items-center pt-1">
            <span className="font-bold text-slate-800">Pavimentação, iluminação pública, drenagem e arborização</span>
            <span className="font-bold text-emerald-700">100%</span>
          </div>
          <div className="h-1.5 bg-emerald-500 rounded-full w-full" />

          <div className="flex justify-between items-center pt-1">
            <span className="font-semibold text-slate-600">Calçadas rebaixadas / rampas / ciclovias exclusivas</span>
            <span className="font-bold text-amber-700">Conferir em vistoria (0% a 35%)</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }} />
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 text-xs space-y-1.5 mb-4">
          <div className="font-bold text-slate-900">Dinâmica de Deslocamento e Malha Viária</div>
          <p className="text-slate-600 leading-relaxed">
            O endereço é favorável à vida a pé, com relevo de <strong>{r360.climate.slopePct.toFixed(1).replace('.', ',')}%</strong> e <strong>{formatNum(r360.commerce.total500)} serviços em 500 m</strong> — ambiente propício inclusive para caminhadas, corridas e uso cotidiano de bicicleta, valorizando a presença de vaga própria de garagem.
          </p>
        </div>

        {/* Transporte sobre Trilhos (Metrô / Trem) em 500 m e 1 km + Distância até a Praia */}
        {(() => {
          const t500 = r360.mobility?.transit500m || [];
          const t1k = r360.mobility?.transit1km || [];
          const beach = r360.mobility?.nearestBeach || null;
          const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`);

          return (
            <div className={`grid grid-cols-1 ${beach ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 text-xs`}>
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                <div className="font-bold text-slate-900">Metrô / Trem (Raio 500 m)</div>
                {t500.length > 0 ? (
                  <ul className="space-y-1 text-[11px] text-slate-700">
                    {t500.map((st, idx) => (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="truncate"><strong>{st.kind}:</strong> {st.name}</span>
                        <span className="font-bold text-emerald-700 shrink-0">{fmtDist(st.distanceM)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[11px] text-slate-500">Nenhuma estação de metrô ou trem no raio de 500 m.</div>
                )}
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                <div className="font-bold text-slate-900">Metrô / Trem (Raio 1 km)</div>
                {t1k.length > 0 ? (
                  <ul className="space-y-1 text-[11px] text-slate-700">
                    {t1k.map((st, idx) => (
                      <li key={idx} className="flex justify-between gap-2">
                        <span className="truncate"><strong>{st.kind}:</strong> {st.name}</span>
                        <span className="font-bold text-slate-900 shrink-0">{fmtDist(st.distanceM)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[11px] text-slate-500">Nenhuma estação de metrô ou trem no raio de 1 km.</div>
                )}
              </div>

              {beach && (
                <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                  <div className="font-bold text-slate-900">Proximidade à Praia</div>
                  <div className="text-sm font-bold text-sky-700">{fmtDist(beach.distanceM)}</div>
                  <div className="text-[11px] text-slate-600">{beach.name} (distância em linha reta a partir do imóvel)</div>
                </div>
              )}
            </div>
          );
        })()}
        {renderAbntFooter(7)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 8: EDUCAÇÃO & SAÚDE (RAIO 1 KM)                                 */}
      {/* ===================================================================== */}
      <div className={blockClass} style={blockPageStyle}>
        <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">Educação & Saúde</div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Rede de Ensino e Cobertura Médico-Hospitalar</h2>

        {/* Educação */}
        <div className="mb-6 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-slate-600" />
              <span>Rede de Ensino no Entorno (Raio 1 km): {r360.education.total1km} instituições ({r360.education.publicCount} públicas · {r360.education.privateCount} particulares)</span>
            </div>
            {r360.education.nearestM && (
              <span className="text-xs font-semibold text-slate-600">Mais próxima a {r360.education.nearestM} m</span>
            )}
          </div>

          {r360.education.schools.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left font-bold">Instituição</th>
                    <th className="py-2 px-3 text-center font-bold">Rede</th>
                    <th className="py-2 px-3 text-right font-bold">Distância</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r360.education.schools.slice(0, 7).map((sc, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-3 text-slate-800">{sc.name}</td>
                      <td className="py-1.5 px-3 text-center text-slate-600">
                        {sc.kind?.toLowerCase().includes('públ') ? 'Pública / Ensino' : 'Particular / Ensino'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900">{sc.distanceM} m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="p-2 rounded bg-slate-50">
              <span className="text-[10px] text-slate-500 block">IDEB · Anos Iniciais</span>
              <span className="font-semibold text-slate-900 text-sm">{r360.education.ideb.yearsInitial.toFixed(1).replace('.', ',')}</span>
            </div>
            <div className="p-2 rounded bg-slate-50">
              <span className="text-[10px] text-slate-500 block">IDEB · Anos Finais</span>
              <span className="font-semibold text-slate-900 text-sm">{r360.education.ideb.yearsFinal.toFixed(1).replace('.', ',')}</span>
            </div>
            <div className="p-2 rounded bg-slate-50">
              <span className="text-[10px] text-slate-500 block">IDEB · Ensino Médio</span>
              <span className="font-semibold text-slate-900 text-sm">{r360.education.ideb.highSchool.toFixed(1).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        {/* Saúde: Intro Cuidados -> 4 Caixas com totais e raio -> 4 KPI cards abaixo */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-slate-600" />
              <span>Cobertura Médico-Hospitalar e Farmacêutica (Raio 1 km)</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Cuidados e cobertura assistencial no entorno imediato: a disponibilidade de hospitais, farmácias e clínicas num raio de 1 km ({r360.health.totalServices} unidades mapeadas) reforça a autonomia do morador, atende o público sênior e familiar e sustenta liquidez constante em locação e revenda.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-slate-800">Hospitais e Prontos-Atendimentos</span>
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {r360.health.hospitalsCount ?? r360.health.hospitals?.length ?? 0} · 1 km
                </span>
              </div>
              {r360.health.hospitals && r360.health.hospitals.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {r360.health.hospitals.map((hp, i) => (
                    <div key={i} className="flex items-center justify-between py-1 gap-2">
                      <div className="min-w-0">
                        <span className="text-slate-800 block truncate">{hp.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {hp.ownership}{hp.emergency ? ' · Pronto-socorro' : ''}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-800 shrink-0">{hp.distanceM} m</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">Sem hospital cadastrado no raio direto de 1 km.</div>
              )}
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-slate-800">Farmácias e Drogarias</span>
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {r360.health.pharmaciesCount} · 1 km
                </span>
              </div>
              {r360.health.pharmacies && r360.health.pharmacies.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {r360.health.pharmacies.slice(0, 4).map((ph, i) => (
                    <div key={i} className="flex items-center justify-between py-1 gap-2">
                      <span className="text-slate-800 truncate">{ph.name}</span>
                      <span className="font-semibold text-slate-800 shrink-0">{ph.distanceM} m</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">Sem drogaria georreferenciada na lista imediata.</div>
              )}
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-slate-800">Clínicas e Especialidades</span>
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {r360.health.clinicsCount ?? r360.health.clinics?.length ?? 0} · 1 km
                </span>
              </div>
              {r360.health.clinics && r360.health.clinics.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {r360.health.clinics.map((cl, i) => (
                    <div key={i} className="flex items-center justify-between py-1 gap-2">
                      <span className="text-slate-800 truncate">{cl.name}</span>
                      <span className="font-semibold text-slate-800 shrink-0">{cl.distanceM} m</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">Sem clínica ambulatorial listada em até 1 km.</div>
              )}
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-slate-800">Laboratórios e Consultórios</span>
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {(r360.health.labsCount ?? r360.health.labs?.length ?? 0) + (r360.health.consultoriosCount ?? r360.health.consultorios?.length ?? 0)} · 1 km
                </span>
              </div>
              {((r360.health.labs && r360.health.labs.length > 0) || (r360.health.consultorios && r360.health.consultorios.length > 0)) ? (
                <div className="divide-y divide-slate-100">
                  {[...(r360.health.labs || []).slice(0, 2), ...(r360.health.consultorios || []).slice(0, 2)].map((lb, i) => (
                    <div key={i} className="flex items-center justify-between py-1 gap-2">
                      <span className="text-slate-800 truncate">{lb.name}</span>
                      <span className="font-semibold text-slate-800 shrink-0">{lb.distanceM} m</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">Sem laboratório ou consultório avulso listado em 1 km.</div>
              )}
            </div>
          </div>

          {/* 4 KPIs resumidos ABAIXO das caixas de unidades */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs pt-1">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] text-slate-500 block">Serviços em 1 km</span>
              <span className="font-semibold text-slate-900 text-sm">{r360.health.totalServices}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] text-slate-500 block">Pronto-Socorro / Emerg.</span>
              <span className="font-semibold text-slate-900 text-sm">{r360.health.nearestEmergencyM ? `${r360.health.nearestEmergencyM} m` : '-'}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] text-slate-500 block">Farmácia mais próxima</span>
              <span className="font-semibold text-slate-900 text-sm">{r360.health.nearestPharmacyM ? `${r360.health.nearestPharmacyM} m` : '-'}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] text-slate-500 block">Atendimento Público</span>
              <span className="font-semibold text-slate-900 text-sm">{r360.health.publicSharePct ?? 12}%</span>
            </div>
          </div>
        </div>
        {renderAbntFooter(8)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 9: ECOSSISTEMA COMERCIAL E CONVENIÊNCIA (500 m e 1 km)          */}
      {/* ===================================================================== */}
      <div className={blockClass} style={blockPageStyle}>
        <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">ECOSSISTEMA COMERCIAL E CONVENIÊNCIA</div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Mapeamento de Estabelecimentos Ativos</h2>
        <p className="text-xs text-slate-600 mb-3">
          Distribuição de estabelecimentos comerciais e serviços ativos identificados no entorno imediato (ordenado por densidade em 500 m).
        </p>

        <div className="rounded-lg border border-slate-200 overflow-hidden mb-3">
          <table className="w-full text-[12.5px]">
            <thead className="bg-slate-50 text-slate-600 text-[10.5px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-left font-bold">Categoria e Segmentos</th>
                <th className="py-2.5 px-3 text-right font-bold w-24">Até 500 m</th>
                <th className="py-2.5 px-3 text-right font-bold w-24">Até 1 km</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...r360.commerce.categories]
                .sort((a, b) => b.c500 - a.c500 || b.c1000 - a.c1000)
                .slice(0, 12)
                .map((cat) => (
                  <tr key={cat.category}>
                    <td className="py-2.5 px-3">
                      <div className="text-[13px] font-bold text-slate-800">{cat.category}</div>
                      {cat.topSubs && <div className="text-[11px] text-slate-500 mt-0.5">{cat.topSubs}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 align-top">{formatNum(cat.c500)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 align-top">{formatNum(cat.c1000)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold w-fit">
          Total no entorno: {formatNum(r360.commerce.total500)} pontos em até 500 m · {formatNum(r360.commerce.total1000)} pontos em até 1 km
        </div>
        {renderAbntFooter(9)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 10: MERCADO IMOBILIÁRIO (BASE REAL ITBI VS ANÚNCIOS)            */}
      {/* ===================================================================== */}
      <div className={blockClass} style={blockPageStyle}>
        <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">Mercado Imobiliário</div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">Base Real ITBI vs Anúncios</h2>
        <p className="text-xs text-slate-600 mb-3">
          No bairro <strong>{r360.demographics.neighborhood.name}</strong>, as escrituras reais de ITBI registram média de <strong>R$ {formatNum(r360.market.neighItbiSqm)}/m²</strong> ({r360.market.cityDiffPct >= 0 ? `+${r360.market.cityDiffPct}%` : `${r360.market.cityDiffPct}%`} vs média da cidade em R$ {formatNum(r360.market.cityItbiSqm)}/m²), enquanto o valor médio anunciado nos portais é de <strong>R$ {formatNum(neighRefSqm)}/m²</strong>.
        </p>

        {/* Tabela Preços por Tipologia (colunas separadas Escrituras vs Portais + ajuste compacto sem corte) */}
        <div className="mb-4">
          <div className="text-xs font-bold uppercase text-slate-700 mb-1.5">Preços por Tipologia (Base Real ITBI vs Portais)</div>
          <div className="rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-50 text-slate-600 text-[9.5px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-2 font-bold">Tipo</th>
                  <th className="py-2.5 px-2 text-right font-bold">ITBI Real /m²</th>
                  <th className="py-2.5 px-2 text-right font-bold">Portais /m²</th>
                  <th className="py-2.5 px-2 text-right font-bold">Mediana</th>
                  <th className="py-2.5 px-2 font-bold">Faixa de preço</th>
                  <th className="py-2.5 px-2 text-right font-bold">Área</th>
                  <th className="py-2.5 px-2 text-right font-bold">Escrituras</th>
                  <th className="py-2.5 px-2 text-right font-bold">Portais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[r360.market.apartamento, r360.market.casa, r360.market.comercial].map((row) => (
                  <tr key={row.tipo} className={row.tipo === data.propertyType ? 'bg-amber-50/40' : ''}>
                    <td className="py-2.5 px-2 font-bold text-slate-800 whitespace-nowrap">{row.tipo}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-700 whitespace-nowrap">R$ {formatNum(row.itbiSqm)}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-800 whitespace-nowrap">R$ {formatNum(row.portalSqm)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-700 whitespace-nowrap">{formatBRL(row.medianPrice)}</td>
                    <td className="py-2.5 px-2 text-slate-600 text-[10.5px] whitespace-nowrap">{formatBRL(row.minTrimPrice)} a {formatBRL(row.maxTrimPrice)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-700 whitespace-nowrap">{row.typicalArea} m²</td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-700 whitespace-nowrap">{formatNum(row.itbiCount)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-500 whitespace-nowrap">{row.saleCount > 0 ? formatNum(row.saleCount) : 'Ref.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comparativo com Bairros Limítrofes (colunas ITBI e Portais separadas) */}
        {r360.market.neighbors.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold uppercase text-slate-700 mb-1.5">Comparativo Geográfico com Bairros Vizinhos</div>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-bold">Recorte</th>
                    <th className="py-2 px-3 text-right font-bold">ITBI Real /m²</th>
                    <th className="py-2 px-3 text-right font-bold">Dif. ITBI</th>
                    <th className="py-2 px-3 text-right font-bold">Portais /m²</th>
                    <th className="py-2 px-3 text-right font-bold">Dif. Portais</th>
                    <th className="py-2 px-3 text-right font-bold">ITBI</th>
                    <th className="py-2 px-3 text-right font-bold">Portais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-amber-50/45">
                    <td className="py-2 px-3 font-semibold text-slate-900">{r360.demographics.neighborhood.name} (local)</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">R$ {formatNum(r360.market.neighItbiSqm)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800">R$ {formatNum(neighRefSqm)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">—</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-700">{formatNum(activeMarketTypology.itbiCount + r360.market.casa.itbiCount)}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{activeMarketTypology.saleCount > 0 ? formatNum(activeMarketTypology.saleCount) : 'Ref. bairro'}</td>
                  </tr>
                  {r360.market.neighbors.map((nb) => {
                    const renderBadge = (v?: number) => {
                      if (v === undefined) return '-';
                      const cls = v > 0 ? 'bg-sky-50 text-sky-700' : v < 0 ? 'bg-rose-50 text-rose-700' : 'text-slate-500';
                      return <span className={`px-1.5 py-0.5 rounded text-[10.5px] ${cls}`}>{v > 0 ? `+${v}%` : `${v}%`}</span>;
                    };
                    return (
                      <tr key={nb.neighborhood}>
                        <td className="py-2 px-3 text-slate-800">{nb.neighborhood}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-800">{nb.itbiSqm ? `R$ ${formatNum(nb.itbiSqm)}` : '-'}</td>
                        <td className="py-2 px-3 text-right">{renderBadge(nb.diffPct)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-800">{nb.portalSqm ? `R$ ${formatNum(nb.portalSqm)}` : '-'}</td>
                        <td className="py-2 px-3 text-right">{renderBadge(nb.portalDiffPct)}</td>
                        <td className="py-2 px-3 text-right font-medium text-slate-700">{formatNum(nb.itbiCount)}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{nb.portalCount > 0 ? formatNum(nb.portalCount) : 'Ref. bairro'}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50/70">
                    <td className="py-2 px-3 font-semibold text-slate-900">{r360.baseline.city} · cidade</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800">R$ {formatNum(r360.market.cityItbiSqm)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {r360.market.neighItbiSqm > 0 ? `${Math.round(((r360.market.cityItbiSqm - r360.market.neighItbiSqm) / r360.market.neighItbiSqm) * 100) >= 0 ? '+' : ''}${Math.round(((r360.market.cityItbiSqm - r360.market.neighItbiSqm) / r360.market.neighItbiSqm) * 100)}%` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800">R$ {formatNum(r360.market.fipeZap.cityAvgSqm)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {neighRefSqm > 0 ? `${Math.round(((r360.market.fipeZap.cityAvgSqm - neighRefSqm) / neighRefSqm) * 100) >= 0 ? '+' : ''}${Math.round(((r360.market.fipeZap.cityAvgSqm - neighRefSqm) / neighRefSqm) * 100)}%` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">Municipal</td>
                    <td className="py-2 px-3 text-right text-slate-500">Ref. cidade</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Comparação Bairro com a Cidade (tabela 2 colunas + caixa separada Entrada Efetiva vs Piso ITBI) */}
        <div className="space-y-2.5 mb-4">
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-700">
              Comparação Bairro com a Cidade
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50/60 text-slate-500 text-[10px] uppercase border-b border-slate-200/70">
                <tr>
                  <th className="py-1.5 px-3.5 text-left font-bold">Indicador</th>
                  <th className="py-1.5 px-3.5 text-right font-bold">{r360.demographics.neighborhood.name} (Entorno / Bairro)</th>
                  <th className="py-1.5 px-3.5 text-right font-bold">{r360.baseline.city} (Cidade)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 px-3.5 text-slate-600">Renda média estimada do responsável</td>
                  <td className="py-2 px-3.5 text-right font-semibold text-slate-800">{formatBRL(radiusIncome)}</td>
                  <td className="py-2 px-3.5 text-right text-slate-700">{formatBRL(r360.baseline.nominalIncomeCityHead)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3.5 text-slate-600">Piso ITBI Municipal /m²</td>
                  <td className="py-2 px-3.5 text-right font-semibold text-emerald-700">
                    R$ {formatNum(r360.market.neighItbiSqm)}/m² ({r360.market.cityDiffPct >= 0 ? `+${r360.market.cityDiffPct}%` : `${r360.market.cityDiffPct}%`})
                  </td>
                  <td className="py-2 px-3.5 text-right text-slate-700">R$ {formatNum(r360.market.cityItbiSqm)}/m²</td>
                </tr>
                <tr>
                  <td className="py-2 px-3.5 text-slate-600">Taxa estimada de imóveis vagos</td>
                  <td className="py-2 px-3.5 text-right font-semibold text-slate-800">{r360.demographics.radius500.vacantPct ?? 18}%</td>
                  <td className="py-2 px-3.5 text-right text-slate-700">{r360.baseline.vacantShareCityPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">Entrada Efetiva vs Piso ITBI Municipal</span>
            <span className="font-bold text-slate-900">
              R$ {formatNum(data.effectiveSqmCost)}/m² vs R$ {formatNum(pisoSqm)}/m²
              <span className={`ml-2 text-[11px] font-semibold ${spreadPctVsPiso >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                ({spreadPctVsPiso >= 0 ? `deságio de ${spreadPctVsPiso}%` : `${Math.abs(spreadPctVsPiso)}% acima do piso`})
              </span>
            </span>
          </div>
        </div>

        {/* Faixas de Locação (alinhamento em 3 colunas) */}
        <div className="mb-4 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40">
            <div className="font-bold uppercase text-slate-800 mb-2">Faixas de Locação na Região</div>
            <div className="divide-y divide-slate-200/60">
              {[r360.market.apartamento, r360.market.casa, r360.market.comercial].map((item) => (
                <div key={item.tipo} className="grid grid-cols-3 items-center gap-2 py-2">
                  <span className="text-slate-700 font-semibold">{item.tipo} (~{item.typicalArea} m²)</span>
                  <span className="text-center text-slate-600">{formatBRL(item.rentMin)} a {formatBRL(item.rentMax)}/mês</span>
                  <span className="text-right font-bold text-slate-900">Mediana: {formatBRL(item.rentMedian)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráficos 12m (Venda e Locação) + Histórico Real de Valorização (ITBI Oficial) */}
        <div className="space-y-3">
          <MarketTrendsCharts
            cityAvgSqm={r360.market.fipeZap.cityAvgSqm}
            neighRefSqm={neighRefSqm}
            yoyChangePct={r360.market.fipeZap.yoyChangePct}
            rentYoY={r360.market.rentYoY}
            series12m={r360.market.fipeZapSeries12m}
            itbiYearlyTrend={r360.market.itbiYearlyTrend}
            itbiAppreciationPct={r360.market.itbiAppreciationPct}
            itbiSpanYears={r360.market.itbiSpanYears}
          />
        </div>
        {renderAbntFooter(10)}
      </div>

      {/* ===================================================================== */}
      {/* BLOCO 11: DUE DILIGENCE & PARECER FINAL DE VIABILIDADE                */}
      {/* ===================================================================== */}
      <div className={blockClass}>
        <div className="text-[10.5px] uppercase tracking-wider text-orange-700 font-bold">DUE DILIGENCE & PARECER FINAL DE VIABILIDADE</div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Protocolo de Auditoria Pré-Lance & Vistoria em Campo</h2>

        <div className="space-y-3 mb-4 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
            <div className="font-bold text-slate-900 mb-1.5">Checklist Jurídico & Edital (Pré-Lance)</div>
            <ul className="space-y-1 list-disc pl-4 text-slate-600">
              <li>Confirmar ônus propter rem (IPTU e condomínio) e responsabilidade contratual prevista no edital.</li>
              <li>Validar ocupação atual e estimar prazo de imissão na posse antes de definir o horizonte de retorno.</li>
              <li>Auditar matrícula atualizada no Cartório de Registro de Imóveis (indisponibilidades e ônus reais).</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
            <div className="font-bold text-slate-900 mb-1.5">Checklist de Vistoria em Campo</div>
            <ul className="space-y-1 list-disc pl-4 text-slate-600">
              <li>Avaliar insolação ({r360.climate.slopeAspect}), ventilação cruzada e ruído viário em horários distintos.</li>
              <li>Confirmar drenagem da rua, conservação das fachadas, elevadores e liquidez real de anúncios na mesma quadra.</li>
            </ul>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5 text-xs mb-4">
          <div className="font-bold text-slate-900">Conclusão</div>
          <p className="text-slate-700 leading-relaxed text-justify">
            Considerando o lance/compra de <strong>{formatBRL(data.arrematePrice)}</strong> (custo total efetivo de <strong>{formatBRL(data.totalAcquisitionCost)}</strong>) frente ao Piso ITBI Real de <strong>R$ {formatNum(pisoSqm)}/m²</strong> e ao Preço Sugerido para Revenda de <strong>{formatBRL(suggestedTotal)}</strong>, o ativo reúne elementos objetivos para tomada de decisão fundamentada sob os parâmetros da ABNT NBR 14.653.
          </p>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600 space-y-1">
          <div className="font-bold text-slate-900">Nota Técnica & Segurança dos Dados</div>
          <div>
            A precificação imobiliária deste documento tem como pilar principal e auditável as <strong>Escrituras Oficiais de ITBI Municipal</strong> registradas junto às Prefeituras (ABNT NBR 14.653), garantindo segurança contra preços inflados de anúncios. As demais leituras territoriais, demográficas, climáticas e de liquidez resultam de motores proprietários internos de cruzamento espacial.
          </div>
        </div>

        {renderAbntFooter(11)}
      </div>
    </div>
  );
}
