import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Link, ShieldAlert, Cpu, HelpCircle, Loader2 } from 'lucide-react';

interface LinkAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (
    url: string,
    origin: 'auto' | 'judicial' | 'extrajudicial',
    sizeSqmOverride?: number,
    neighborhoodOverride?: string
  ) => Promise<void>;
  isAnalyzing: boolean;
}

export default function LinkAnalyzerModal({
  isOpen,
  onClose,
  onAnalyze,
  isAnalyzing
}: LinkAnalyzerModalProps) {
  const [url, setUrl] = useState('');
  const [origin, setOrigin] = useState<'auto' | 'judicial' | 'extrajudicial'>('auto');
  const [sizeSqmOverride, setSizeSqmOverride] = useState('');
  const [neighborhoodOverride, setNeighborhoodOverride] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Custom loader messages
  const [loaderMessage, setLoaderMessage] = useState('Processando...');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      alert('Por favor, insira uma URL válida.');
      return;
    }

    setErrorMessage(null);
    setLoaderMessage('Acessando portal do leiloeiro (crawling)...');
    
    // Cycle messages to keep the user engaged
    const messages = [
      'Acessando portal do leiloeiro (crawling)...',
      'Extraindo texto e edital da página...',
      'Invocando Inteligência Artificial (Gemini)...',
      'Realizando cruzamento estatístico com o ITBI local...',
      'Calculando ROI, lucros e viabilidade do edital...'
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setLoaderMessage(messages[msgIdx]);
    }, 6000);

    try {
      await onAnalyze(
        url.trim(),
        origin,
        sizeSqmOverride ? Number(sizeSqmOverride) : undefined,
        neighborhoodOverride.trim() || undefined
      );
      setUrl('');
      setSizeSqmOverride('');
      setNeighborhoodOverride('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao analisar o link do leilão.');
    } finally {
      clearInterval(interval);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col text-slate-800"
      >
        {/* Header bar */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Análise Automática de Link</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Cole o link do edital para a IA preencher e simular tudo.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="p-1.5 hover:bg-gray-200 text-gray-500 rounded-lg cursor-pointer transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6">
          {isAnalyzing ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-16 h-16 rounded-full border-4 border-indigo-100 animate-pulse"></div>
                <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="font-bold text-sm text-slate-700">Garimpando Oportunidade...</h4>
                <p className="text-xs text-indigo-650 font-medium animate-pulse">{loaderMessage}</p>
                <p className="text-[10px] text-gray-400 max-w-xs mx-auto pt-2">
                  Isso pode levar até 30 segundos devido à raspagem do edital e análise profunda da IA.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">Erro na análise da IA</p>
                    <p className="text-[11px] text-rose-600 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* URL Link Input */}
              <div className="space-y-1.5">
                <label className="block font-bold text-gray-600 uppercase tracking-wide">URL do Leilão (Judicial ou Extrajudicial) *</label>
                <div className="flex items-center bg-slate-50 border border-gray-300 rounded-xl px-3 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                  <Link className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.megaleiloes.com.br/imoveis/apartamento-..."
                    className="w-full text-slate-800 bg-transparent border-0 py-3 outline-none text-xs"
                  />
                </div>
              </div>

              {/* Origin Selection */}
              <div className="space-y-1.5">
                <label className="block font-bold text-gray-600 uppercase tracking-wide">Modalidade do Leilão</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'auto', label: 'Auto-detectar 🤖' },
                    { val: 'judicial', label: 'Judicial ⚖️' },
                    { val: 'extrajudicial', label: 'Extrajudicial 🚪' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setOrigin(opt.val as any)}
                      className={`py-2 px-3 rounded-lg font-bold border transition-all cursor-pointer text-center text-[10.5px] ${
                        origin === opt.val
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced settings toggles */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-indigo-600 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>{showAdvanced ? 'Ocultar Ajustes Avançados ▲' : 'Exibir Ajustes Avançados (Área / Bairro) ▼'}</span>
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden space-y-3 pt-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block font-bold text-gray-500 uppercase tracking-wide">Forçar Área (m²)</label>
                          <input
                            type="number"
                            min="1"
                            value={sizeSqmOverride}
                            onChange={(e) => setSizeSqmOverride(e.target.value)}
                            placeholder="Ex: 85 (Sobrescreve se a IA falhar)"
                            className="w-full text-slate-800 bg-slate-50 border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block font-bold text-gray-500 uppercase tracking-wide">Forçar Bairro</label>
                          <input
                            type="text"
                            value={neighborhoodOverride}
                            onChange={(e) => setNeighborhoodOverride(e.target.value)}
                            placeholder="Ex: Copacabana (Melhora busca ITBI)"
                            className="w-full text-slate-800 bg-slate-50 border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 italic">
                        * Use estas opções caso o edital seja muito longo ou o site impeça a leitura correta de metragem e bairro pela IA.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[10px] text-indigo-850 leading-normal">
                💡 **Como funciona:** O robô lê as informações do site, e o Gemini calcula a rentabilidade para locação ou venda com base nas transações de ITBI reais do município.
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end pt-3 gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2.5 rounded-lg cursor-pointer flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Cpu className="w-4 h-4" />
                  <span>Analisar e Cadastrar</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
