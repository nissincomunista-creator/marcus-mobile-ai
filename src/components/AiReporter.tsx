import React from 'react';
import { AuctionProperty } from '../types.ts';
import { Sparkles, BrainCircuit, ShieldAlert, Award, ArrowUpRight, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';

interface AiReporterProps {
  property: AuctionProperty;
  isGenerating: boolean;
  onRunAnalysis: () => void;
}

export default function AiReporter({
  property,
  isGenerating,
  onRunAnalysis
}: AiReporterProps) {
  
  // Custom circular color helper for the 1 to 10 score
  const getAppreciationColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score >= 5) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-4">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="w-6 h-6 text-indigo-600 animate-pulse" />
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Assessor de Investimentos AI</h3>
            <p className="text-xs text-gray-400">Análise heurística de edital e estimativas de liquidez via Gemini.</p>
          </div>
        </div>

        <button
          onClick={onRunAnalysis}
          disabled={isGenerating}
          className="self-start sm:self-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm disabled:from-blue-300 disabled:to-indigo-300 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          <span>{isGenerating ? 'Analisando Edital...' : 'Forçar Re-Análise Inteligente'}</span>
        </button>
      </div>

      {/* Main Container: Details vs Markdown doc */}
      {!property.aiAnalysis ? (
        <div className="py-12 text-center text-gray-500 space-y-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl max-w-xl mx-auto">
          <BrainCircuit className="w-12 h-12 text-indigo-400 mx-auto" />
          <div className="space-y-1">
            <p className="font-bold text-gray-700 text-sm">Nenhum Relatório Gerado para este Imóvel</p>
            <p className="text-xs text-gray-400 px-6">
              Nossa IA pode cruzar os dados de metragem, o preço mínimo de leilão e a média do ITBI municipal para consolidar uma tese de aporte qualificada.
            </p>
          </div>
          <button
            onClick={onRunAnalysis}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            {isGenerating ? 'Processando...' : 'Gerar Análise IA Agora'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column: Index Stats (1/4 width) */}
          <div className="lg:border-r lg:border-gray-100 lg:pr-6 space-y-5">
            
            {/* Score Ring */}
            <div className="text-center p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Potencial de Ganho</span>
              <div className="flex justify-center">
                <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-mono ${getAppreciationColor(property.aiAppreciationScore || 5)}`}>
                  <span className="text-3xl font-black">{property.aiAppreciationScore || 5}</span>
                  <span className="text-[10px] font-sans font-semibold">/10</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 leading-normal">
                Nota de atratividade baseada na margem de lucro e localização.
              </p>
            </div>

            {/* Veredito de Decisão da IA */}
            {property.finalDecisionVerdict && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-center font-mono">
                <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">Veredito do Analista</span>
                <div className="flex justify-center mt-1">
                  {property.finalDecisionVerdict === 'revenda' ? (
                    <span className="w-full text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 py-1.5 rounded-lg">
                      🟢 REVENDA (FLIPPING)
                    </span>
                  ) : property.finalDecisionVerdict === 'locacao' ? (
                    <span className="w-full text-[10px] font-black text-blue-800 bg-blue-100 border border-blue-300 py-1.5 rounded-lg">
                      🔵 LOCAÇÃO (RENDIMENTO)
                    </span>
                  ) : (
                    <span className="w-full text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 py-1.5 rounded-lg">
                      🔴 DESCARTAR (RISCO/PREÇO)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Micro summary list boxes */}
            <div className="space-y-2.5">
              <div className="flex items-start space-x-2 text-xs">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-gray-700 block text-[11px]">Arbitragem ITBI</span>
                  <span className="text-gray-400 text-[9.5px]">Comparado contra {property.itbiUnitValueAvg ? 'dados reais ITBI' : 'taxas médias'}.</span>
                </div>
              </div>

              <div className="flex items-start space-x-2 text-xs">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-gray-700 block text-[11px]">Status de Posse</span>
                  <span className="text-gray-400 text-[9.5px]">Imóvel está {property.occupied ? 'Ocupado' : 'Desocupado'}.</span>
                </div>
              </div>

              {/* Análise jurídica do devedor */}
              {property.legalAnalysisDebtor && property.legalAnalysisDebtor !== 'Não analisado' && (
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1 text-[10.5px]">
                  <span className="font-bold text-slate-700 block">👤 Proprietário (Devedor)</span>
                  <p className="text-slate-600 leading-relaxed font-sans text-[10px]">{property.legalAnalysisDebtor}</p>
                </div>
              )}

              {/* Análise jurídica do imóvel */}
              {property.legalAnalysisAsset && property.legalAnalysisAsset !== 'Não analisado' && (
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1 text-[10.5px]">
                  <span className="font-bold text-slate-700 block">🔒 Processos do Imóvel</span>
                  <p className="text-slate-600 leading-relaxed font-sans text-[10px]">{property.legalAnalysisAsset}</p>
                </div>
              )}
            </div>
            
          </div>

          {/* Right Column: Markdown Report Render (3/4 width) */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Dynamic Markdown Document wrapper */}
            <div className="prose max-w-none text-sm text-slate-700 leading-relaxed space-y-4 markdown-body">
              <ReactMarkdown>{property.aiAnalysis}</ReactMarkdown>
            </div>

            {/* Note signature */}
            <div className="border-t border-slate-100 pt-4 text-[10px] text-gray-400 italic">
              *Aviso Legal: Os dados fornecidos são projeções matemáticas comparativas geradas por modelos de inteligência artificial sobre dados de ITBI gravados na plataforma. O investidor deve ler atentamente as regras e ônus do edital regulador do leilão oficial.
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
