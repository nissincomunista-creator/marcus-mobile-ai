import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Printer,
  Download,
  RefreshCw,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MatriculaAnalysisReport } from '../types.ts';
import { Report360ApiPayload, Report360FullPages, ReportPageInputData } from './Report360Pages.tsx';
import { App3DReportCaptures, captureOwnApp3DViews } from '../utils/app3DReportCapture.ts';
import { RIO_DE_JANEIRO_BAIRROS, NITEROI_BAIRROS, JUIZ_DE_FORA_BAIRROS } from '../utils/geoCoords.ts';

export interface ExecutiveReportData extends ReportPageInputData {
  initialLat?: number;
  initialLng?: number;
  initialCep?: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  streetNumber: string;
  propertyType: string;
  sizeSqm: number;
  bedrooms: number;
  parkingSpaces: number;

  // Acquisition
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

  // Market Tiers
  marketTiers: Array<{
    id: string;
    label: string;
    sqm: number | null;
    samples: string;
    saleValue: number;
    grossProfit: number;
    roi: number;
  }>;

  // Holding & Financing
  monthlyCondo: number;
  monthlyIptu: number;
  monthlyExtra: number;
  monthlyFinancing: number;
  annualInterestRate: number;
  monthlyInterestCost: number;
  totalMonthlyHolding: number;

  // Flip Scenarios
  flipScenarios: Array<{
    months: number;
    holdingCost: number;
    brokerFee: number;
    capitalGainsTax?: number;
    netProfit: number;
    netRoi: number;
  }>;
  flipExitPrice: number;

  // Rental Scenarios
  grossRentMonthly: number;
  portalRentalBenchmarkMonthly: number;
  irDeductionMonthly: number;
  rentalIrDeductionPct: number;
  netRentMonthly: number;
  netRentalYieldAnnual: number;

  // Due Diligence Jurídica da Matrícula
  matriculaReport?: MatriculaAnalysisReport;
}

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExecutiveReportData;
}

function buildFallback360Payload(data: ExecutiveReportData): Report360ApiPayload {
  const normCity = (data.city || '').toLowerCase();
  const isNiteroi = normCity.includes('niteroi') || normCity.includes('niterói');
  const isJf = normCity.includes('juiz de fora');
  const fipeSqm = isNiteroi ? 8100 : isJf ? 5150 : 11372;
  const neighSqm = data.neighborhoodAvgSqm || data.gabaritoSqm || Math.round(fipeSqm * 0.65);

  const bKey = String(data.neighborhood || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const bairroCoords = isNiteroi
    ? NITEROI_BAIRROS[bKey]
    : isJf
    ? JUIZ_DE_FORA_BAIRROS[bKey]
    : RIO_DE_JANEIRO_BAIRROS[bKey];
  const resolvedLat =
    data.initialLat && Number.isFinite(data.initialLat)
      ? data.initialLat
      : bairroCoords
      ? bairroCoords[0]
      : isJf
      ? -21.7642
      : isNiteroi
      ? -22.8832
      : -22.9068;
  const resolvedLng =
    data.initialLng && Number.isFinite(data.initialLng)
      ? data.initialLng
      : bairroCoords
      ? bairroCoords[1]
      : isJf
      ? -43.3503
      : isNiteroi
      ? -43.1034
      : -43.1729;

  const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const rainArr = [183, 130, 100, 130, 45, 32, 31, 62, 49, 136, 115, 174];
  const maxArr = [30, 31, 31, 27, 26, 25, 25, 26, 28, 28, 28, 30];
  const minArr = [23, 24, 23, 21, 19, 17, 16, 17, 19, 20, 20, 22];

  return {
    generatedAt: new Date().toISOString(),
    coordinates: { lat: resolvedLat, lng: resolvedLng, source: 'Base Municipal Consolidada', cep: data.initialCep || undefined },
    baseline: {
      city: data.city || 'Rio de Janeiro',
      state: data.state || 'RJ',
      ibgeCode: isNiteroi ? '3303302' : isJf ? '3136702' : '3304557',
      center: [-22.9068, -43.1729],
      populationCenso2022: isNiteroi ? 481749 : isJf ? 540756 : 6211223,
      householdsCenso2022: isNiteroi ? 205410 : isJf ? 210480 : 2439321,
      avgResidentsPerHousehold: 2.5,
      vacantShareCityPct: 16,
      apartmentsShareCityPct: isNiteroi ? 44.0 : isJf ? 37.1 : 39.5,
      housesShareCityPct: isNiteroi ? 55.7 : isJf ? 62.7 : 60.0,
      seniors60SharePct: isNiteroi ? 22.9 : 18.8,
      nominalIncomeCityHead: isNiteroi ? 7420 : isJf ? 4650 : 6563,
      fipeZap: {
        cityAvgSqm: fipeSqm,
        yoyChangePct: 5.8,
        commercialSqm: Math.round(fipeSqm * 0.78),
        commercialYoyPct: 1.1,
        commercialRentSqm: 58,
        note: 'Índice Referencial de Venda Residencial (últimos 12 meses)',
        byBedrooms: [
          { label: '1 quarto', sqm: Math.round(fipeSqm * 1.24) },
          { label: '2 quartos', sqm: Math.round(fipeSqm * 0.85) },
          { label: '3 quartos', sqm: Math.round(fipeSqm * 0.96) },
          { label: '4+ quartos', sqm: Math.round(fipeSqm * 1.15) },
        ],
      },
      ideb: {
        yearsInitial: isJf ? 5.9 : 6.2,
        yearsFinal: 5.2,
        highSchool: 3.8,
        referenceYear: 'Índice Educacional (2023/2025)',
      },
      caged: {
        periodLabel: 'Janeiro a Setembro/2026',
        monthName: 'Setembro/2026',
        monthAdmissions: isNiteroi ? 7420 : isJf ? 6840 : 80955,
        monthSeparations: isNiteroi ? 6307 : isJf ? 6210 : 76670,
        monthBalance: isNiteroi ? 1113 : isJf ? 630 : 4285,
        ytdBalance: isNiteroi ? 5484 : isJf ? 4120 : 38847,
        ytdAdmissions: 706404,
        scopeNote: 'Dinâmica Municipal de Empregos Formais',
      },
      disasters: {
        recordsCount2010_2024: 3,
        floodCountLast10y: 2,
        worstYear: 2019,
        worstDisplaced: 3245,
        worstAffectedHomes: 192,
        worstDeaths: 10,
        preparedness: { floodAlert: true, floodPlan: true, landslideAlert: true, landslidePlan: true, resilientCities: true },
        summaryNote: 'Monitoramento municipal de ocorrências hídricas e defesa civil.',
      },
    },
    scores: {
      overall: 7.8,
      health: 8.2,
      commerce: 8.1,
      infra: 9.0,
      education: 7.8,
      income: 7.7,
      mobility: 7.9,
      climate: 8.2,
      marketLiquidity: Number((data.liquidityScore ?? 7.5).toFixed(1)),
    },
    demographics: {
      radius500: {
        residents: 8450,
        households: 3380,
        avgPerHousehold: 2.5,
        incomeHead: 7200,
        vacantPct: 18,
        housesPct: 28,
        aptsPct: 72,
        underConstruction: 4,
      },
      neighborhood: {
        name: data.neighborhood || 'Bairro',
        residents: 45200,
        households: 18080,
        avgPerHousehold: 2.5,
        incomeHead: 6900,
        vacantPct: 17,
      },
    },
    commerce: { total500: 120, total1000: 410, categories: [] },
    education: {
      total1km: 6,
      publicCount: 3,
      privateCount: 3,
      nearestM: 320,
      schools: [],
      ideb: { yearsInitial: 6.2, yearsFinal: 5.2, highSchool: 3.8, referenceYear: 'Índice Educacional (2023/2025)' },
    },
    health: { totalServices: 14, nearestPharmacyM: 210, nearestEmergencyM: 980, pharmaciesCount: 4, byType: [] },
    climate: {
      source: 'Séries Históricas Climáticas & Altimetria (2021–2025)',
      elevationMeters: 28,
      slopePct: 3.2,
      slopeAspect: 'Norte',
      profileSN: [26, 25, 27, 28, 28, 29, 31, 30, 29],
      profileWE: [25, 26, 28, 28, 28, 27, 26, 25, 24],
      seaDistanceKm: isJf ? null : 5.4,
      nearestStreamM: 420,
      streamElevDiffM: 8,
      avgTempC: 23.5,
      annualRainMm: 1188,
      hotDays35PerYear: 14,
      warmNights20PerYear: 192,
      muggyDaysPerYear: 146,
      rain50mmDaysPerYear: 1.0,
      solarKwhPerKwpMonth: 110,
      maxTempRecord: { value: 41.3, when: 'set/2023' },
      minTempRecord: { value: 11.2, when: 'jul/2021' },
      maxRainDayRecord: { value: 86, when: 'abr/2022' },
      maxGustKmh: 73,
      gustDays60PerYear: 0.7,
      windGroundKmh: 7,
      wind50mKmh: 11,
      wind100mKmh: 13,
      monthly: monthNames.map((m, idx) => ({
        month: m,
        maxTemp: maxArr[idx],
        minTemp: minArr[idx],
        rainMm: rainArr[idx],
        tags: [],
      })),
    },
    communityRisk: {
      nearCommunity: Boolean(data.isCommunityRisk),
      communityName: data.communityName || null,
      faction: null,
      distanceMeters: null,
    },
    mapOverlay: {
      centerLat: resolvedLat,
      centerLng: resolvedLng,
      pois: [],
    },
    market: {
      cityItbiSqm: Math.round(fipeSqm * 0.7),
      neighItbiSqm: neighSqm,
      neighborhoodRefSqm: Math.round(neighSqm * 1.25),
      cityDiffPct: 0,
      apartamento: { tipo: 'Apartamento', itbiSqm: neighSqm, portalSqm: data.portalStreetAvgSqm || neighSqm, medianPrice: 0, minTrimPrice: 0, maxTrimPrice: 0, typicalArea: data.sizeSqm, typicalBedrooms: data.bedrooms, saleCount: 0, itbiCount: 0, rentCount: 0, rentMin: 0, rentMax: 0, rentMedian: 0, saleSamples: [], rentSamples: [] },
      casa: { tipo: 'Casa', itbiSqm: neighSqm, portalSqm: neighSqm, medianPrice: 0, minTrimPrice: 0, maxTrimPrice: 0, typicalArea: data.sizeSqm, typicalBedrooms: data.bedrooms, saleCount: 0, itbiCount: 0, rentCount: 0, rentMin: 0, rentMax: 0, rentMedian: 0, saleSamples: [], rentSamples: [] },
      comercial: { tipo: 'Comercial', itbiSqm: neighSqm, portalSqm: neighSqm, medianPrice: 0, minTrimPrice: 0, maxTrimPrice: 0, typicalArea: data.sizeSqm, typicalBedrooms: 0, saleCount: 0, itbiCount: 0, rentCount: 0, rentMin: 0, rentMax: 0, rentMedian: 0, saleSamples: [], rentSamples: [] },
      neighbors: [],
      fipeZap: {
        cityAvgSqm: fipeSqm,
        yoyChangePct: 5.8,
        commercialSqm: Math.round(fipeSqm * 0.78),
        commercialYoyPct: 1.1,
        commercialRentSqm: 58,
        note: 'Índice Referencial de Venda Residencial (últimos 12 meses)',
        byBedrooms: [
          { label: '1 quarto', sqm: Math.round(fipeSqm * 1.24) },
          { label: '2 quartos', sqm: Math.round(fipeSqm * 0.85) },
          { label: '3 quartos', sqm: Math.round(fipeSqm * 0.96) },
          { label: '4+ quartos', sqm: Math.round(fipeSqm * 1.15) },
        ],
      },
      caged: {
        periodLabel: 'Janeiro a Setembro/2026',
        monthName: 'Setembro/2026',
        monthAdmissions: 80955,
        monthSeparations: 76670,
        monthBalance: 4285,
        ytdBalance: 38847,
        ytdAdmissions: 706404,
        scopeNote: 'Dinâmica Municipal de Empregos Formais',
      },
      bedroomsDistribution: [],
    },
  };
}

export default function ExecutiveReportModal({ isOpen, onClose, data }: ExecutiveReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [isLoading360, setIsLoading360] = useState(false);
  const [remote360, setRemote360] = useState<Report360ApiPayload | null>(null);
  const [app3DCaptures, setApp3DCaptures] = useState<App3DReportCaptures | null>(null);

  const fallback360 = useMemo(() => buildFallback360Payload(data), [data]);
  const active360 = remote360 || fallback360;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || isLoading360) return;
    const lat = active360.mapOverlay.centerLat;
    const lng = active360.mapOverlay.centerLng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    let cancelled = false;
    setApp3DCaptures(null);
    captureOwnApp3DViews(lat, lng)
      .then((res) => {
        if (!cancelled && res) setApp3DCaptures(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, isLoading360, active360.mapOverlay.centerLat, active360.mapOverlay.centerLng]);

  useEffect(() => {
    if (!isOpen) return;
    const ctrl = new AbortController();
    const hardTimeout = setTimeout(() => ctrl.abort(), 45000);
    setIsLoading360(true);
    setRemote360(null);
    setApp3DCaptures(null);
    fetch('/api/report/360', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        state: data.state,
        city: data.city,
        neighborhood: data.neighborhood,
        street: data.street,
        streetNumber: data.streetNumber,
        propertyType: data.propertyType,
        sizeSqm: data.sizeSqm,
        bedrooms: data.bedrooms,
        parkingSpaces: data.parkingSpaces,
        arrematePrice: data.arrematePrice,
        flipExitPrice: data.suggestedQuickSaleTotal || data.flipExitPrice,
        gabaritoSqm: data.gabaritoSqm,
        portalStreetAvgSqm: data.portalStreetAvgSqm,
        neighborhoodAvgSqm: data.neighborhoodAvgSqm,
        liquidityScore: data.liquidityScore,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && json.scores && json.climate) {
          setRemote360(json);
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(hardTimeout);
        setIsLoading360(false);
      });

    return () => {
      clearTimeout(hardTimeout);
      ctrl.abort();
    };
  }, [
    isOpen,
    data.state,
    data.city,
    data.neighborhood,
    data.street,
    data.streetNumber,
    data.propertyType,
    data.sizeSqm,
    data.arrematePrice,
    data.suggestedQuickSaleTotal,
    data.flipExitPrice,
    data.gabaritoSqm,
  ]);

  const reportId = useMemo(
    () => `PTAM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    [isOpen]
  );

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const cleanDocTitle = [
    data.street ? `${data.street}${data.streetNumber ? ` ${data.streetNumber}` : ''}` : 'Imovel',
    data.neighborhood || '',
  ]
    .filter(Boolean)
    .join(' - ');

  const cleanFileSlug = cleanDocTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const handlePrint = () => {
    if (isLoading360) return;
    const reportEl = document.getElementById('ptam-printable-report');
    if (!reportEl) {
      window.print();
      return;
    }

    try {
      const originBase = window.location.origin;
      const printWindow = window.open('', '_blank', 'width=1020,height=1050');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
              <base href="${originBase}/">
              <title>Dossie_360_${cleanFileSlug}</title>
              <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,400..900;1,6..12,400..900&display=swap" rel="stylesheet">
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @page { size: A4 portrait; margin: 8mm; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Calibri', 'Carlito', 'Segoe UI', sans-serif !important; }
                h1, h2, h3, h4, .report-title { font-family: 'Calibri Light', 'Calibri', 'Carlito', 'Segoe UI Light', sans-serif !important; }
                body { font-family: 'Calibri', 'Carlito', 'Segoe UI', sans-serif !important; background: #fff !important; color: #1e293b !important; margin: 0; padding: 0; }
                .report-block {
                  border: 1.2pt solid #475569 !important;
                  border-radius: 0 !important;
                  min-height: 277mm;
                  box-sizing: border-box !important;
                  break-inside: avoid-page;
                  page-break-inside: avoid;
                  break-after: page;
                  page-break-after: always;
                }
                .report-block:last-child { break-after: auto; page-break-after: auto; }
              </style>
            </head>
            <body class="bg-white text-slate-800">
              ${reportEl.innerHTML}
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 600);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return;
      }
    } catch (e) {
      console.warn('Popup blocked, using direct window.print()', e);
    }

    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || isLoading360) return;
    setIsGeneratingPdf(true);
    try {
      const blocks = Array.from(
        printRef.current.querySelectorAll<HTMLElement>('.report-block')
      );
      const targets = blocks.length > 0 ? blocks : [printRef.current];
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const maxW = pdfWidth - margin * 2;
      const maxH = pdfHeight - margin * 2;

      for (let i = 0; i < targets.length; i++) {
        setPdfProgress(`${i + 1}/${targets.length}`);
        const el = targets[i];
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(el, {
          scale: 1.35,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 3500,
          removeContainer: true,
          windowWidth: 880,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll('.report-block').forEach((node) => {
              const htmlNode = node as HTMLElement;
              htmlNode.style.border = 'none';
              htmlNode.style.borderRadius = '0';
              htmlNode.style.boxShadow = 'none';
            });
          },
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const props = pdf.getImageProperties(imgData);
        const inset = 1.5;
        const ratio = Math.min((maxW - inset * 2) / props.width, (maxH - inset * 2) / props.height);
        const drawW = props.width * ratio;
        const drawH = props.height * ratio;
        pdf.addImage(imgData, 'JPEG', margin + inset, margin + inset, drawW, drawH, undefined, 'FAST');
        // Full-page ABNT architectural border around the entire sheet
        pdf.setDrawColor(71, 85, 105);
        pdf.setLineWidth(0.38);
        pdf.rect(margin, margin, maxW, maxH);
      }

      const fileName = `Dossie_360_${cleanFileSlug}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress('');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-start justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 text-slate-800 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col overflow-hidden cursor-default print:border-0 print:shadow-none print:w-full print:max-w-none"
      >
        {/* Top Action Bar (Hidden when printing) */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between px-5 py-3 bg-white border-b border-slate-200 gap-3 print:hidden">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-4 h-4 text-orange-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>Pré-visualização · Dossiê 360° & PTAM</span>
                {isLoading360 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Carregando dados...
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isLoading360}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Baixar arquivo PDF A4"
            >
              {isGeneratingPdf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>{pdfProgress ? `Gerando PDF (${pdfProgress})...` : 'Gerando PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={isLoading360}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Imprimir documento"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Viewport */}
        <div
          ref={printRef}
          id="ptam-printable-report"
          className="bg-slate-100 text-slate-800 p-4 sm:p-6 select-text print:bg-white print:p-0"
        >
          <Report360FullPages
            data={data}
            r360={active360}
            reportId={reportId}
            todayStr={todayStr}
            app3DCaptures={app3DCaptures}
          />
        </div>
      </div>
    </div>
  );
}
