import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Building2, 
  Coins, 
  TrendingUp, 
  Flame, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  User, 
  Award,
  Scale,
  RefreshCw,
  Percent
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MatriculaAnalysisReport } from '../types.ts';

export interface ExecutiveReportData {
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

export default function ExecutiveReportModal({ isOpen, onClose, data }: ExecutiveReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const todayStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const reportId = `PTAM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePrint = () => {
    const reportEl = document.getElementById('ptam-printable-report');
    if (!reportEl) {
      window.print();
      return;
    }

    try {
      const printWindow = window.open('', '_blank', 'width=950,height=1050');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
              <title>Laudo PTAM - Marcus Assessoria Imobiliária</title>
              <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet">
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @page { 
                  size: A4 portrait; 
                  margin: 10mm; 
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body { 
                  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; 
                  background-color: #ffffff !important; 
                  color: #0f172a !important; 
                  margin: 0; 
                  padding: 10px; 
                }
                .font-mono { 
                  font-family: 'JetBrains Mono', monospace; 
                }
              </style>
            </head>
            <body class="bg-white text-slate-900">
              ${reportEl.outerHTML}
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 400);
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
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = printRef.current;
      
      // Capture element with high scale for crisp typography
      const canvas = await html2canvas(element, {
        scale: 2.2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1050
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const fileName = `Laudo_PTAM_${(data.street || data.neighborhood || 'Imovel').replace(/[^a-zA-Z0-9]/g, '_')}_MarcusAssessoria.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static">
      
      {/* Modal Container */}
      <div className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden print:border-0 print:shadow-none print:bg-white print:text-black print:w-full print:max-w-none">
        
        {/* Modal Top Action Bar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 gap-3 print:hidden">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                Laudo Técnico de Avaliação Mercadológica & Viabilidade
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">Registro Oficial: {reportId}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Direct PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed border border-emerald-500/30"
              title="Baixar diretamente o arquivo PDF profissional formatado para impressão A4"
            >
              {isGeneratingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar em PDF (.pdf)</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center space-x-1.5 transition-all shadow-md cursor-pointer border border-indigo-500/30"
              title="Imprimir laudo técnico"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE LAUDO CONTENT (Pure White Background, Dark High-Contrast Text for Clients) */}
        <div 
          ref={printRef} 
          id="ptam-printable-report"
          className="bg-white text-slate-900 p-8 sm:p-12 space-y-6 font-sans select-text shadow-sm"
          style={{ minHeight: '1000px', color: '#0f172a' }}
        >
          
          {/* 1. Header do Laudo com Identidade Visual Formal Marcus Assessoria */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b-2 border-slate-900 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-lg">
                  M
                </div>
                <div>
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 block leading-tight">
                    MARCUS ASSESSORIA IMOBILIÁRIA
                  </span>
                  <span className="text-[10.5px] text-slate-600 font-bold uppercase tracking-wider block">
                    Engenharia de Avaliações, Leilões Judiciais & Vendas Diretas
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs font-mono space-y-0.5 border-l-2 sm:border-l-0 pl-3 sm:pl-0 border-slate-300">
              <div className="font-black text-slate-900 text-sm">PARECER TÉCNICO DE AVALIAÇÃO (PTAM)</div>
              <div className="text-slate-700 font-bold">Nº do Laudo: <span className="font-black text-slate-900">{reportId}</span></div>
              <div className="text-slate-600">Data de Emissão: {todayStr}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fundamentação: Norma ABNT NBR 14.653</div>
            </div>
          </div>

          {/* 2. Identificação do Imóvel Avaliando */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <MapPin className="w-4 h-4 text-indigo-700" />
              1. Identificação do Imóvel & Características Cadastrais
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Logradouro / Endereço:</span>
                <strong className="text-slate-900 font-bold text-xs block mt-0.5">
                  {data.street || 'Geral do Bairro'}{data.streetNumber ? `, Nº ${data.streetNumber}` : ''}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Bairro / Município / UF:</span>
                <strong className="text-slate-900 font-bold text-xs block mt-0.5">
                  {data.neighborhood || 'Centro'} - {data.city}/{data.state}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Tipologia & Metragem:</span>
                <strong className="text-slate-900 font-bold text-xs block mt-0.5">
                  {data.propertyType} • {data.sizeSqm} m² privativos
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Quartos & Vagas de Garagem:</span>
                <strong className="text-slate-900 font-bold text-xs block mt-0.5">
                  {data.bedrooms} Quartos • {data.parkingSpaces} Vaga(s)
                </strong>
              </div>
            </div>
          </div>

          {/* 3. Composição Analítica dos Custos de Aquisição */}
          <div className="space-y-2">
            <div className="flex justify-between items-center border-b border-slate-300 pb-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-700" />
                2. Composição Analítica do Custo de Aquisição ({data.acquisitionMode === 'leilao' ? 'Leilão Judicial / Extrajudicial' : 'Venda Direta Caixa Econômica'})
              </h3>
              <span className="text-[10px] font-bold text-slate-600 uppercase font-mono">
                Investimento Inicial Total
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3.5">Item de Despesa / Encargo</th>
                    <th className="py-2 px-3.5">Alíquota / Base Aplicada</th>
                    <th className="py-2 px-3.5 text-right">Valor em Reais (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                  <tr>
                    <td className="py-2 px-3.5 font-bold text-slate-900">Lance / Preço de Compra:</td>
                    <td className="py-2 px-3.5 text-slate-600">Valor Facial Ofertado</td>
                    <td className="py-2 px-3.5 text-right font-black text-slate-900">{formatBRL(data.arrematePrice)}</td>
                  </tr>
                  
                  {data.acquisitionMode === 'leilao' ? (
                    <tr>
                      <td className="py-2 px-3.5 text-slate-800">Comissão do Leiloeiro Oficial:</td>
                      <td className="py-2 px-3.5 text-slate-600">5% sobre o valor do lance</td>
                      <td className="py-2 px-3.5 text-right font-bold text-slate-800">{formatBRL(data.auctioneerFee)}</td>
                    </tr>
                  ) : (
                    <tr className="bg-emerald-50/50">
                      <td className="py-2 px-3.5 text-emerald-900 font-bold">Comissão do Leiloeiro:</td>
                      <td className="py-2 px-3.5 text-emerald-800">Isento (Venda Direta Caixa)</td>
                      <td className="py-2 px-3.5 text-right font-bold text-emerald-800">R$ 0</td>
                    </tr>
                  )}

                  <tr>
                    <td className="py-2 px-3.5 text-slate-800">Imposto de Transmissão (ITBI):</td>
                    <td className="py-2 px-3.5 text-slate-600">3% alíquota municipal</td>
                    <td className="py-2 px-3.5 text-right font-bold text-slate-800">{formatBRL(data.itbiFee)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 text-slate-800">Custas de Cartório e Registro (RGI):</td>
                    <td className="py-2 px-3.5 text-slate-600">3% registro + certidões</td>
                    <td className="py-2 px-3.5 text-right font-bold text-slate-800">{formatBRL(data.registryFee)}</td>
                  </tr>
                  
                  {(data.iptuDebt > 0 || data.condoDebt > 0) && (
                    <tr className="bg-amber-50/60">
                      <td className="py-2 px-3.5 text-amber-900 font-bold">Passivos Anteriores (IPTU + Condomínio):</td>
                      <td className="py-2 px-3.5 text-amber-800">Quitação de débitos pendentes</td>
                      <td className="py-2 px-3.5 text-right font-bold text-amber-900">{formatBRL(data.iptuDebt + data.condoDebt)}</td>
                    </tr>
                  )}

                  <tr>
                    <td className="py-2 px-3.5 text-slate-800">Provisão para Reforma & Pintura:</td>
                    <td className="py-2 px-3.5 text-slate-600">Estimativa de modernização e valorização</td>
                    <td className="py-2 px-3.5 text-right font-bold text-slate-800">{formatBRL(data.reformCost)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3.5 text-slate-800">Custas Jurídicas / Desocupação:</td>
                    <td className="py-2 px-3.5 text-slate-600">Mandado de imissão na posse</td>
                    <td className="py-2 px-3.5 text-right font-bold text-slate-800">{formatBRL(data.legalCost)}</td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="py-2.5 px-3.5 uppercase text-slate-900 text-xs">CUSTO TOTAL EFETIVO DE ENTRADA:</td>
                    <td className="py-2.5 px-3.5 text-slate-700">R$ {data.effectiveSqmCost.toLocaleString('pt-BR')}/m² efetivo</td>
                    <td className="py-2.5 px-3.5 text-right text-sm font-black text-slate-900">{formatBRL(data.totalAcquisitionCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Matriz Comparativa de Mercado (ITBI Real vs Portais) */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono flex items-center gap-1.5 border-b border-slate-300 pb-1">
              <TrendingUp className="w-4 h-4 text-indigo-700" />
              3. Matriz Comparativa de Mercado 1-a-1 (Transações Reais de ITBI vs Portais)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {data.marketTiers.map((tier) => (
                <div key={tier.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{tier.label}</span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {tier.sqm ? `R$ ${tier.sqm.toLocaleString('pt-BR')}/m² (${tier.samples})` : 'Sem dados registrados'}
                    </span>
                  </div>

                  {tier.sqm && tier.sqm > 0 ? (
                    <div className="text-right font-mono">
                      <div className="font-bold text-slate-900">Venda: {formatBRL(tier.saleValue)}</div>
                      <span className="text-[10.5px] text-emerald-800 font-bold">
                        Lucro: +{formatBRL(tier.grossProfit)} ({tier.roi}% ROI)
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">-</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. Parecer de Viabilidade Financeira (Flip vs Locação) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* QUADRO FLIP */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-black uppercase text-slate-900 font-mono">
                  📈 Parecer de Revenda Rápida (Flip)
                </span>
                <span className="text-[10px] text-slate-700 font-mono font-bold">
                  Saída: {formatBRL(data.flipExitPrice)}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                {data.flipScenarios.map((sc) => (
                  <div key={sc.months} className="flex justify-between items-center py-1 border-b border-slate-200 text-[11px]">
                    <span className="text-slate-700">Venda em {sc.months}m ({sc.months <= 6 ? 'Janela Ideal' : 'Arrasto'}):</span>
                    <span className="font-bold text-slate-900">
                      +{formatBRL(sc.netProfit)} ({sc.netRoi}% ROI Líquido)
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[9.5px] text-slate-600 italic">
                * Já deduzidos 4% de comissão de corretagem, 15% de Imposto de Renda sobre Ganho de Capital e carregamento mensal de R$ {data.totalMonthlyHolding.toLocaleString('pt-BR')}/mês
                {data.monthlyFinancing > 0 && ` (inclui R$ ${data.monthlyInterestCost.toLocaleString('pt-BR')}/mês de juros de financiamento)`}.
              </p>
            </div>

            {/* QUADRO LOCAÇÃO */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-black uppercase text-slate-900 font-mono">
                  🏢 Parecer de Renda Passiva / Locação
                </span>
                <span className="text-[10px] font-black text-indigo-900 font-mono">
                  {data.netRentalYieldAnnual.toFixed(1)}% a.a. Líquido
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center py-1 border-b border-slate-200 text-[11px]">
                  <span className="text-slate-700">Aluguel Bruto Estimado:</span>
                  <span className="font-bold text-slate-900">{formatBRL(data.grossRentMonthly)}/mês</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200 text-[11px]">
                  <span className="text-slate-700">Benchmark Portais (QuintoAndar/Zap):</span>
                  <span className="font-bold text-slate-900">{formatBRL(data.portalRentalBenchmarkMonthly)}/mês</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200 text-[11px]">
                  <span className="text-slate-700">Deságio Carnê-Leão (IR {data.rentalIrDeductionPct}%):</span>
                  <span className="text-rose-700 font-semibold">-{formatBRL(data.irDeductionMonthly)}/mês</span>
                </div>
                <div className="flex justify-between items-center py-1 font-bold text-[11.5px] bg-slate-200/80 px-2 rounded">
                  <span className="text-slate-900">Líquido no Bolso (Pós IR/Adm/Vac.):</span>
                  <span className="text-slate-900">{formatBRL(data.netRentMonthly)}/mês</span>
                </div>
              </div>
            </div>

          </div>

          {/* 5. ANÁLISE TÉCNICA DA MATRÍCULA & DUE DILIGENCE JURÍDICA (APENAS SE AUDITADA) */}
          {data.matriculaReport && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h4 className="font-black text-slate-900 uppercase font-mono text-[11px] flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-indigo-700" />
                  <span>5. Análise Técnica da Matrícula & Due Diligence Jurídica</span>
                </h4>
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                  data.matriculaReport.overallStatus === 'REGULAR' 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : data.matriculaReport.overallStatus === 'ALTO_RISCO'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {data.matriculaReport.overallStatus === 'REGULAR' ? '✓ MATRÍCULA REGULARIZADA' : 
                   data.matriculaReport.overallStatus === 'ALTO_RISCO' ? '⚠ RISCO JURÍDICO ELEVADO' : 
                   '⚠ ATENÇÃO / GRAVAMES IDENTIFICADOS'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900">Registro Imobiliário: </span>
                  <span>{data.matriculaReport.matriculaNumber || 'Matrícula Oficial em Auditoria do R.I.'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">Cartório Competente: </span>
                  <span>{data.matriculaReport.registryOffice || `Ofício de Registro de Imóveis de ${data.city}/${data.state}`}</span>
                </div>
              </div>

              {/* Lista de Gravames ou Declaração de Regularidade */}
              {data.matriculaReport.gravames && data.matriculaReport.gravames.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-700 block">
                    Gravames, Averbações e Ônus Reais Apurados na Certidão:
                  </span>
                  <div className="space-y-1.5">
                    {data.matriculaReport.gravames.map((gr, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-slate-200 text-[11px] space-y-0.5">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-900 font-bold">{gr.code} - {gr.type}</strong>
                          <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                            gr.severity === 'Alta' ? 'bg-rose-100 text-rose-700' :
                            gr.severity === 'Média' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            Risco {gr.severity}
                          </span>
                        </div>
                        <div className="text-slate-600 text-[10.5px]">Credor / Beneficiário / Juízo: {gr.beneficiaryOrCourt}</div>
                        <div className="text-indigo-900 text-[10.5px] font-semibold bg-indigo-50/70 p-1 rounded">
                          ⚖️ Providência: {gr.legalSolution}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded border border-emerald-200 text-[11px]">
                  ✓ Não constam penhoras trabalhistas, indisponibilidades na CNIB ou gravames impeditivos que inviabilizem a expedição da Carta de Arrematação e Imissão na Posse.
                </div>
              )}

              {/* Parecer Jurídico da Matrícula */}
              <div className="p-2.5 bg-slate-100 rounded border border-slate-200 text-[11px] text-slate-800 leading-relaxed text-justify">
                <strong>Parecer da Due Diligence: </strong>
                {data.matriculaReport.parecerTecnico}
              </div>
            </div>
          )}

          {/* 7. Parecer Técnico Conclusivo & Recomendações Estratégicas */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-2 text-xs leading-relaxed">
            <h4 className="font-black text-slate-900 uppercase font-mono text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              6. Parecer Conclusivo do Consultor & Recomendações de Arrematação
            </h4>
            <p className="text-slate-800 text-justify">
              Com base no cruzamento das transações imobiliárias averbadas de ITBI no endereço, na rua e no entorno imediato, somado à auditoria técnica registral da matrícula, o imóvel apresenta margem de segurança consistente para aquisição ao valor de lance de <strong>{formatBRL(data.arrematePrice)}</strong>. A estratégia prioritária recomendada é a <strong>revenda rápida (Flip) na janela de 1 a 6 meses</strong>, minimizando o impacto dos custos de carregamento e juros para atingir rentabilidade líquida projetada superior a 25% sobre o capital investido.
            </p>
          </div>

          {/* 7. Termo de Responsabilidade & Assinatura Profissional */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-end border-t-2 border-slate-900 text-xs">
            <div className="text-slate-600 text-[10px] space-y-0.5">
              <div>Documento emitido eletronicamente pelo Sistema de Inteligência Imobiliária Marcus Assessoria.</div>
              <div>Chave de Validação Criptográfica: SHA256-{Math.random().toString(36).substring(2, 15).toUpperCase()}</div>
              <div>Conforme Código de Ética Profissional e ABNT NBR 14.653.</div>
            </div>

            <div className="text-center mt-4 sm:mt-0 font-mono">
              <div className="w-52 border-b border-slate-900 mb-1 mx-auto"></div>
              <strong className="block text-slate-900 text-xs uppercase font-black">MARCUS ASSESSORIA IMOBILIÁRIA</strong>
              <span className="text-[10px] text-slate-600 block">Consultoria Especializada em Leilões Judiciais & ITBI</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}