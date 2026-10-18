import React, { useState } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Sparkles, 
  Check, 
  RefreshCw, 
  TrendingUp, 
  Wallet, 
  ChevronDown, 
  ChevronUp,
  Building,
  Home,
  Store,
  Layers,
  MapPin,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const formatBRL = (val?: number) => {
  if (val === undefined || isNaN(val)) return 'R$ -';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Tabs: Comprar | Alugar | Imóvel Novo
  contextTab: 'comprar' | 'alugar' | 'novo';
  setContextTab: (tab: 'comprar' | 'alugar' | 'novo') => void;
  // Campo de Busca por Endereço / Bairro
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  // Tipo de Imóvel
  selectedType: string;
  setSelectedType: (type: string) => void;
  // Quartos / Vagas / Banheiros
  bedrooms: number | null;
  setBedrooms: (val: number | null) => void;
  parkingSpaces: number | null;
  setParkingSpaces: (val: number | null) => void;
  bathrooms: number | null;
  setBathrooms: (val: number | null) => void;
  // Faixa de Preço
  minPrice: string;
  setMinPrice: (val: string) => void;
  maxPrice: string;
  setMaxPrice: (val: string) => void;
  // Faixa de Metragem (m²)
  minArea?: string;
  setMinArea?: (val: string) => void;
  maxArea?: string;
  setMaxArea?: (val: string) => void;
  // Investimento e Retorno
  onlyHighReturn: boolean;
  setOnlyHighReturn: React.Dispatch<React.SetStateAction<boolean>>;
  minRoi: number;
  setMinRoi: (val: number) => void;
  minDiscount?: number;
  setMinDiscount?: (val: number) => void;
  onlyAnalysisAboveEdital: boolean;
  setOnlyAnalysisAboveEdital: React.Dispatch<React.SetStateAction<boolean>>;
  itbiConfidence: 'all' | 'verified';
  setItbiConfidence: (val: 'all' | 'verified') => void;
  prestigeFilter: 'all' | 'nobre' | 'prime';
  setPrestigeFilter: (val: 'all' | 'nobre' | 'prime') => void;
  capitalBudget: string;
  setCapitalBudget: (val: string) => void;
  // Condições & Ocupação
  onlyFinancing: boolean;
  setOnlyFinancing: React.Dispatch<React.SetStateAction<boolean>>;
  onlyInstallments: boolean;
  setOnlyInstallments: React.Dispatch<React.SetStateAction<boolean>>;
  onlyVacant: boolean;
  setOnlyVacant: React.Dispatch<React.SetStateAction<boolean>>;
  // Mode (leilão vs portais)
  mode?: 'leilao' | 'portais' | 'todos' | 'auctions';
  // Matching count and reset
  matchingCount: number;
  onResetFilters: () => void;
}

export default function AdvancedFiltersModal({
  isOpen,
  onClose,
  mode = 'todos',
  contextTab,
  setContextTab,
  searchQuery = '',
  setSearchQuery,
  selectedType,
  setSelectedType,
  bedrooms,
  setBedrooms,
  parkingSpaces,
  setParkingSpaces,
  bathrooms,
  setBathrooms,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  minArea = '',
  setMinArea,
  maxArea = '',
  setMaxArea,
  onlyHighReturn,
  setOnlyHighReturn,
  minRoi,
  setMinRoi,
  minDiscount = 0,
  setMinDiscount,
  onlyAnalysisAboveEdital,
  setOnlyAnalysisAboveEdital,
  itbiConfidence,
  setItbiConfidence,
  prestigeFilter,
  setPrestigeFilter,
  capitalBudget,
  setCapitalBudget,
  onlyFinancing,
  setOnlyFinancing,
  onlyInstallments,
  setOnlyInstallments,
  onlyVacant,
  setOnlyVacant,
  matchingCount,
  onResetFilters
}: AdvancedFiltersModalProps) {
  const [isReturnAccordionOpen, setIsReturnAccordionOpen] = useState(true);

  if (!isOpen) return null;

  const propertyTypes = [
    { id: '', label: 'Todos os Tipos', icon: Layers },
    { id: 'Apartamento', label: 'Apartamento', icon: Building },
    { id: 'Casa', label: 'Casa', icon: Home },
    { id: 'Kitnet', label: 'Kitnet / Studio', icon: Building },
    { id: 'Cobertura', label: 'Cobertura', icon: Building },
    { id: 'Comercial', label: 'Comercial', icon: Store },
    { id: 'Terreno', label: 'Terreno / Lote', icon: MapPin }
  ];

  const quickNumbers = [
    { value: null, label: 'Qualquer' },
    { value: 1, label: '1+' },
    { value: 2, label: '2+' },
    { value: 3, label: '3+' },
    { value: 4, label: '4+' }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-750 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER DO MODAL (ESTILO QUINTOANDAR) */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-display">
                  Filtros Avançados
                </h3>
                <p className="text-[11px] text-slate-400">
                  Refine por tipologia, cômodos, preço e métricas de Flip
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar filtros"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB DE CONTEXTO ESTILO QUINTOANDAR: COMPRAR | ALUGAR | IMÓVEL NOVO */}
          <div className="px-5 pt-3 pb-2 bg-slate-900/95 border-b border-slate-800 shrink-0">
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 max-w-sm">
              <button
                type="button"
                onClick={() => setContextTab('comprar')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                  contextTab === 'comprar'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm ring-1 ring-indigo-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Comprar
              </button>
              <button
                type="button"
                onClick={() => setContextTab('alugar')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                  contextTab === 'alugar'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-sm ring-1 ring-amber-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Alugar
              </button>
              <button
                type="button"
                onClick={() => setContextTab('novo')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                  contextTab === 'novo'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm ring-1 ring-emerald-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Imóvel Novo
              </button>
            </div>
            {contextTab === 'alugar' && (
              <p className="text-[10.5px] text-amber-300/90 mt-2 font-mono">
                🔑 Modo Locação & Moradia: Imóveis residenciais para alugar e morar. Compara o preço pedido com a média pericial da Calculadora para indicar se está Barato, Justo ou Caro.
              </p>
            )}
            {contextTab === 'novo' && (
              <p className="text-[10.5px] text-emerald-300/90 mt-2 font-mono">
                ✨ Lançamentos e empreendimentos recém-entregues com garantia construtora.
              </p>
            )}
          </div>

          {/* CAMPO DE BUSCA (ESTILO QUINTOANDAR: RUA, BAIRRO OU CONDOMÍNIO) */}
          {setSearchQuery && (
            <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite rua, bairro ou condomínio..."
                  className="w-full text-xs font-medium pl-10 pr-8 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CORPO DO MODAL SCROLLÁVEL */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-200">
            {/* 1. TIPO DE IMÓVEL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Tipo de Imóvel
              </label>
              <div className="flex flex-wrap gap-2">
                {propertyTypes.map((t) => {
                  const isSelected = selectedType === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedType(t.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-950/50 ring-2 ring-indigo-400/30'
                          : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-750'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-white ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. QUARTOS */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Quartos
              </label>
              <div className="grid grid-cols-5 gap-2">
                {quickNumbers.map((item) => {
                  const isSelected = bedrooms === item.value;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setBedrooms(item.value)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm ring-2 ring-indigo-400/30'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-750'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. VAGAS DE GARAGEM */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Vagas de Garagem
              </label>
              <div className="grid grid-cols-5 gap-2">
                {quickNumbers.map((item) => {
                  const isSelected = parkingSpaces === item.value;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setParkingSpaces(item.value)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm ring-2 ring-indigo-400/30'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-750'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. BANHEIROS */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Banheiros
              </label>
              <div className="grid grid-cols-5 gap-2">
                {quickNumbers.map((item) => {
                  const isSelected = bathrooms === item.value;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setBathrooms(item.value)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm ring-2 ring-indigo-400/30'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-750'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. FAIXA DE PREÇO (R$) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Faixa de Preço (R$)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Valor Mínimo</span>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">R$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full text-xs font-mono font-bold border border-slate-700 rounded-xl pl-9 pr-3 py-2 bg-slate-950 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Valor Máximo</span>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">R$</span>
                    <input
                      type="number"
                      placeholder="Sem limite"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full text-xs font-mono font-bold border border-slate-700 rounded-xl pl-9 pr-3 py-2 bg-slate-950 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FAIXA DE METRAGEM (m²) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Faixa de Metragem (m²)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Área Mínima</span>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={minArea}
                      onChange={(e) => setMinArea?.(e.target.value)}
                      className="w-full text-xs font-mono font-bold border border-slate-700 rounded-xl pl-3 pr-8 py-2 bg-slate-950 text-white outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">m²</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Área Máxima</span>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Sem limite"
                      value={maxArea}
                      onChange={(e) => setMaxArea?.(e.target.value)}
                      className="w-full text-xs font-mono font-bold border border-slate-700 rounded-xl pl-3 pr-8 py-2 bg-slate-950 text-white outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">m²</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. CONDIÇÕES DE AQUISIÇÃO & OCUPAÇÃO (FINANCIAMENTO, PARCELAMENTO, DESOCUPADO) - Apenas Leilões */}
            {mode !== 'portais' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Condições de Aquisição & Ocupação
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOnlyFinancing((prev: boolean) => !prev)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                      onlyFinancing
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm ring-1 ring-emerald-400/30'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-750'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>🏦</span>
                      <span>Financiamento</span>
                    </span>
                    {onlyFinancing && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-white" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyInstallments((prev: boolean) => !prev)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                      onlyInstallments
                        ? 'bg-blue-600 text-white border-blue-400 shadow-sm ring-1 ring-blue-400/30'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-750'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>💳</span>
                      <span>Parcelamento</span>
                    </span>
                    {onlyInstallments && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-white" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlyVacant((prev: boolean) => !prev)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                      onlyVacant
                        ? 'bg-teal-600 text-white border-teal-400 shadow-sm ring-1 ring-teal-400/30'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-750'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>🔑</span>
                      <span>Desocupado</span>
                    </span>
                    {onlyVacant && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-white" />}
                  </button>
                </div>
              </div>
            )}

            {/* 7. PARÂMETROS DE INVESTIMENTO & RETORNO (ESPECÍFICOS DO APP) */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsReturnAccordionOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Parâmetros de Investimento & Retorno (Flip)
                  </span>
                </div>
                {isReturnAccordionOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isReturnAccordionOpen && (
                <div className="p-4 mt-2 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-4">
                  {/* Botão Rápido Alto Retorno */}
                  <button
                    type="button"
                    onClick={() => setOnlyHighReturn((prev) => !prev)}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      onlyHighReturn
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30 ring-2 ring-emerald-400/30'
                        : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-850 border-slate-750'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>Alto Retorno (ROI ≥ 40% & Score Liquidez ≥ 7)</span>
                    </div>
                    {onlyHighReturn && <Check className="w-4 h-4" />}
                  </button>

                  {/* Slider de ROI Mínimo */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">ROI Mínimo:</span>
                      <span className="font-mono text-emerald-400 font-bold">{minRoi}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={minRoi}
                      onChange={(e) => setMinRoi(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Slider de Desconto Mínimo em relação ao Mercado */}
                  {setMinDiscount && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-medium">Desconto Mínimo s/ Mercado:</span>
                        <span className="font-mono text-amber-400 font-bold">{minDiscount}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="70"
                        step="5"
                        value={minDiscount}
                        onChange={(e) => setMinDiscount(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Checkbox Análise > Edital */}
                  <label className="flex items-center space-x-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={onlyAnalysisAboveEdital}
                      onChange={(e) => setOnlyAnalysisAboveEdital(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Análise Real &gt; Avaliação do Edital</span>
                  </label>

                  {/* Certeza ITBI */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 block font-mono uppercase font-bold">
                      Certeza do Gabarito ITBI
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setItbiConfidence('all')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                          itbiConfidence === 'all'
                            ? 'bg-slate-800 text-white border-slate-600'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        Todos os Lotes
                      </button>
                      <button
                        type="button"
                        onClick={() => setItbiConfidence('verified')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                          itbiConfidence === 'verified'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        ★ Alta Certeza (Rua)
                      </button>
                    </div>
                  </div>

                  {/* Padrão de Mercado */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 block font-mono uppercase font-bold">
                      Padrão de Mercado (M² Flip)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrestigeFilter('all')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                          prestigeFilter === 'all'
                            ? 'bg-slate-800 text-white border-slate-600'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrestigeFilter('nobre')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                          prestigeFilter === 'nobre'
                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/60'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        Nobre (≥ 4.5k)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrestigeFilter('prime')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                          prestigeFilter === 'prime'
                            ? 'bg-purple-600/30 text-purple-300 border-purple-500/60'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        Prime (≥ 8k)
                      </button>
                    </div>
                  </div>

                  {/* Alocação de Capital */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono uppercase font-bold">
                        Orçamento Disponível (R$)
                      </span>
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">R$</span>
                      <input
                        type="number"
                        placeholder="Ex: 200000"
                        value={capitalBudget}
                        onChange={(e) => setCapitalBudget(e.target.value)}
                        className="w-full text-xs font-mono font-bold border border-slate-750 rounded-xl pl-9 pr-3 py-2 bg-slate-950 text-emerald-400 placeholder-slate-600 outline-none focus:border-emerald-500"
                      />
                    </div>
                    {capitalBudget && Number(capitalBudget) > 0 && (
                      <p className="text-[10px] text-emerald-400 font-mono">
                        Filtrando lotes que cabem em {formatBRL(Number(capitalBudget))} (à vista ou com 5% de entrada).
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RODAPÉ DO MODAL (ESTILO QUINTOANDAR: LIMPAR | BUSCAR X IMÓVEIS) */}
          <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center gap-2"
            >
              <span>Buscar {matchingCount} {matchingCount === 1 ? 'imóvel' : 'imóveis'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
