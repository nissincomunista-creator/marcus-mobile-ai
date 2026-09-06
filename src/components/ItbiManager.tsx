import React, { useState, useMemo, useEffect } from 'react';
import { ItbiTransaction, PropertyType, BRAZIL_STATES } from '../types.ts';
import { 
  Database, 
  Upload, 
  Trash2, 
  Plus, 
  TrendingUp, 
  AlertCircle, 
  FileSpreadsheet, 
  BookOpen, 
  CheckCircle,
  HelpCircle,
  X,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ItbiStats {
  state: string;
  city: string;
  neighborhood: string;
  propertyType: PropertyType;
  averageValueSqm: number;
  minValueSqm: number;
  maxValueSqm: number;
  transactionCount: number;
  averageTotalValue: number;
}

interface ItbiManagerProps {
  itbiStats: ItbiStats[];
  itbiCount: number;
  onAddTransaction: (tx: Omit<ItbiTransaction, 'id' | 'unitValueSqm'>) => Promise<boolean>;
  onBatchTransactions: (items: any[]) => Promise<number>;
  onDeleteTransaction: (id: string) => void;
  onClearAllTransactions: () => void;
}

export default function ItbiManager({
  itbiStats,
  itbiCount,
  onAddTransaction,
  onBatchTransactions,
  onDeleteTransaction,
  onClearAllTransactions
}: ItbiManagerProps) {
  
  // Single Transaction Form State: Add rua field
  const [bairro, setBairro] = useState('');
  const [rua, setRua] = useState('');
  const [tipo, setTipo] = useState<PropertyType>('Apartamento');
  const [area, setArea] = useState('');
  const [valor, setValor] = useState('');
  const [dataTx, setDataTx] = useState(new Date().toISOString().split('T')[0]);
  const [estado, setEstado] = useState('SP');
  const [municipio, setMunicipio] = useState('São Paulo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Batch Default Context
  const [batchState, setBatchState] = useState('SP');
  const [batchCity, setBatchCity] = useState('São Paulo');

  // UI Filters for reference viewing (allows switching municipality dynamically)
  const [uiStateFilter, setUiStateFilter] = useState('');
  const [uiCityFilter, setUiCityFilter] = useState('');
  const [uiNeighborhoodFilter, setUiNeighborhoodFilter] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'transactions'>('value');
  const [showGuide, setShowGuide] = useState(true);

  // Neighborhood Detail view states
  const [selectedNeighborhoodDetail, setSelectedNeighborhoodDetail] = useState<{ neighborhood: string; state: string; city: string } | null>(null);
  const [streetStats, setStreetStats] = useState<any[]>([]);
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);
  const [streetSearch, setStreetSearch] = useState('');

  const filteredStreets = useMemo(() => {
    return streetStats.filter(st => 
      (st.street || '').toLowerCase().includes(streetSearch.toLowerCase())
    );
  }, [streetStats, streetSearch]);

  useEffect(() => {
    if (selectedNeighborhoodDetail) {
      setStreetSearch('');
    }
  }, [selectedNeighborhoodDetail]);

  const handleNeighborhoodClick = async (neighborhood: string, state: string, city: string) => {
    setSelectedNeighborhoodDetail({ neighborhood, state, city });
    setIsLoadingStreets(true);
    try {
      const res = await fetch(`/api/itbi/streets?state=${state}&city=${city}&neighborhood=${encodeURIComponent(neighborhood)}`);
      if (res.ok) {
        const data = await res.json();
        setStreetStats(data);
      } else {
        console.error('Error fetching street stats');
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setIsLoadingStreets(false);
    }
  };

  // Batch Paste State
  const [pastedText, setPastedText] = useState('');
  const [csvDelimiter, setCsvDelimiter] = useState('auto');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchPreview, setBatchPreview] = useState<{ headers: string[]; rows: string[][]; error?: string } | null>(null);
  const [columnMappings, setColumnMappings] = useState({
    neighborhood: 0,
    propertyType: 1,
    sizeSqm: 2,
    transactionValue: 3,
    date: 4,
    street: 5
  });

  // Calculate unique regions existing in current ITBI database
  const uniqueTxStates = useMemo(() => {
    const states = itbiStats.map(tx => (tx.state || 'SP').toUpperCase());
    return Array.from(new Set(states)).filter(Boolean).sort();
  }, [itbiStats]);

  const uniqueTxCities = useMemo(() => {
    const matchingTxs = itbiStats.filter(tx => !uiStateFilter || (tx.state || 'SP').toUpperCase() === uiStateFilter.toUpperCase());
    const cities = matchingTxs.map(tx => tx.city || 'São Paulo');
    return Array.from(new Set(cities)).filter(Boolean).sort();
  }, [itbiStats, uiStateFilter]);

  const uniqueTxNeighborhoods = useMemo(() => {
    const matchingTxs = itbiStats.filter(tx => {
      const matchState = !uiStateFilter || (tx.state || 'SP').toUpperCase() === uiStateFilter.toUpperCase();
      const matchCity = !uiCityFilter || (tx.city || 'São Paulo').toLowerCase() === uiCityFilter.toLowerCase();
      return matchState && matchCity;
    });
    const neighborhoods = matchingTxs.map(tx => tx.neighborhood);
    return Array.from(new Set(neighborhoods)).filter(Boolean).sort();
  }, [itbiStats, uiStateFilter, uiCityFilter]);

  // Filtered stats for the statistical views and charts
  const filteredStats = useMemo(() => {
    return itbiStats.filter(tx => {
      const matchState = !uiStateFilter || (tx.state || 'SP').toUpperCase() === uiStateFilter.toUpperCase();
      const matchCity = !uiCityFilter || (tx.city || 'São Paulo').toLowerCase() === uiCityFilter.toLowerCase();
      const matchNeighborhood = !uiNeighborhoodFilter || (tx.neighborhood || '').toLowerCase() === uiNeighborhoodFilter.toLowerCase();
      return matchState && matchCity && matchNeighborhood;
    });
  }, [itbiStats, uiStateFilter, uiCityFilter, uiNeighborhoodFilter]);

  // Calculate neighborhood statistics by aggregating filtered stats (weighted by transactionCount)
  const neighborhoodStats = useMemo(() => {
    const statsMap: Record<string, { 
      state: string;
      city: string;
      neighborhood: string;
      sumSqmTimesCount: number; 
      count: number; 
      min: number; 
      max: number; 
      sumAvgTotalValTimesCount: number 
    }> = {};
    
    filteredStats.forEach(stat => {
      const state = stat.state || 'SP';
      const city = stat.city || 'São Paulo';
      const b = stat.neighborhood;
      const key = `${state}|${city}|${b}`;
      
      if (!statsMap[key]) {
        statsMap[key] = { 
          state,
          city,
          neighborhood: b,
          sumSqmTimesCount: 0, 
          count: 0, 
          min: stat.minValueSqm, 
          max: stat.maxValueSqm, 
          sumAvgTotalValTimesCount: 0 
        };
      }
      
      const tc = stat.transactionCount || 1;
      statsMap[key].sumSqmTimesCount += stat.averageValueSqm * tc;
      statsMap[key].count += tc;
      statsMap[key].sumAvgTotalValTimesCount += stat.averageTotalValue * tc;
      if (stat.minValueSqm < statsMap[key].min) statsMap[key].min = stat.minValueSqm;
      if (stat.maxValueSqm > statsMap[key].max) statsMap[key].max = stat.maxValueSqm;
    });

    const result = Object.values(statsMap).map(s => ({
      state: s.state,
      city: s.city,
      neighborhood: s.neighborhood,
      averageValueSqm: s.count > 0 ? Math.round(s.sumSqmTimesCount / s.count) : 0,
      minValueSqm: s.min,
      maxValueSqm: s.max,
      transactionCount: s.count,
      averageTotalValue: s.count > 0 ? Math.round(s.sumAvgTotalValTimesCount / s.count) : 0
    }));

    if (sortBy === 'value') {
      result.sort((a, b) => b.averageValueSqm - a.averageValueSqm);
    } else {
      result.sort((a, b) => b.transactionCount - a.transactionCount);
    }
    return result;
  }, [filteredStats, sortBy]);

  // Handle manual addition
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bairro || !area || !valor) {
      alert('Por favor, preencha Bairro, Área (m²) e Valor de Transação.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onAddTransaction({
        neighborhood: bairro.trim(),
        propertyType: tipo,
        sizeSqm: Number(area),
        transactionValue: Number(valor),
        date: dataTx,
        state: estado.toUpperCase().trim(),
        city: municipio.trim(),
        street: rua.trim() || undefined
      });

      if (ok) {
        setBairro('');
        setRua('');
        setArea('');
        setValor('');
        setSuccessMessage('Transação ITBI gravada e indexada com sucesso!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe CSV Parsing logic (auto-detect delimiter)
  const handlePasteChange = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setBatchPreview(null);
      return;
    }

    // Attempt to guess separator
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return;

    const firstLine = lines[0];
    let delimiter = ',';
    if (csvDelimiter === 'auto') {
      const commas = (firstLine.match(/,/g) || []).length;
      const semicolons = (firstLine.match(/;/g) || []).length;
      const tabs = (firstLine.match(/\t/g) || []).length;
      
      if (semicolons > commas && semicolons > tabs) delimiter = ';';
      else if (tabs > commas && tabs > semicolons) delimiter = '\t';
    } else {
      delimiter = csvDelimiter;
    }

    // Split headers and rows
    const headerRow = firstLine.split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
    const dataRows = lines.slice(1, 6).map(rowStr => 
      rowStr.split(delimiter).map(cell => cell.replace(/^["']|["']$/g, '').trim())
    );

    setBatchPreview({
      headers: headerRow,
      rows: dataRows
    });

    // Auto-map columns by standard real estate keywords
    const newMappings = { neighborhood: 0, propertyType: 1, sizeSqm: 2, transactionValue: 3, date: 4, street: 5 };
    headerRow.forEach((h, idx) => {
      const headerLower = h.toLowerCase();
      if (headerLower.includes('bairro') || headerLower.includes('distrito') || headerLower.includes('localidade') || headerLower.includes('neighborhood')) {
        newMappings.neighborhood = idx;
      } else if (headerLower.includes('tipo') || headerLower.includes('property') || headerLower.includes('categoria')) {
        newMappings.propertyType = idx;
      } else if (headerLower.includes('area') || headerLower.includes('m2') || headerLower.includes('metragem') || headerLower.includes('sqm') || headerLower.includes('util')) {
        newMappings.sizeSqm = idx;
      } else if (headerLower.includes('valor') || headerLower.includes('preco') || headerLower.includes('base') || headerLower.includes('transacao') || headerLower.includes('itbi') || headerLower.includes('value')) {
        newMappings.transactionValue = idx;
      } else if (headerLower.includes('data') || headerLower.includes('date') || headerLower.includes('dia') || headerLower.includes('ano')) {
        newMappings.date = idx;
      } else if (headerLower.includes('rua') || headerLower.includes('logradouro') || headerLower.includes('avenida') || headerLower.includes('street') || headerLower.includes('endereco') || headerLower.includes('endereço')) {
        newMappings.street = idx;
      }
    });
    setColumnMappings(newMappings);
  };

  // Run the batch import across all text rows
  const handleBatchImport = async () => {
    if (!pastedText.trim()) return;

    setIsProcessingBatch(true);
    try {
      const lines = pastedText.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        alert('Formato de CSV incorreto. É necessária ao menos uma linha de cabeçalho e uma de dados.');
        setIsProcessingBatch(false);
        return;
      }

      // Detec Delimiter
      let delimiter = ',';
      const firstLine = lines[0];
      if (csvDelimiter === 'auto') {
        const commas = (firstLine.match(/,/g) || []).length;
        const semicolons = (firstLine.match(/;/g) || []).length;
        const tabs = (firstLine.match(/\t/g) || []).length;
        if (semicolons > commas && semicolons > tabs) delimiter = ';';
        else if (tabs > commas && tabs > semicolons) delimiter = '\t';
      } else {
        delimiter = csvDelimiter;
      }

      const rows = lines.slice(1);
      const itemsToUpload: any[] = [];

      rows.forEach(rowStr => {
        const cells = rowStr.split(delimiter).map(cell => cell.replace(/^["']|["']$/g, '').trim());
        if (cells.length > 1) {
          const rawNeigh = cells[columnMappings.neighborhood];
          const rawType = cells[columnMappings.propertyType] || 'Apartamento';
          const rawSize = cells[columnMappings.sizeSqm];
          const rawVal = cells[columnMappings.transactionValue];
          const rawDate = cells[columnMappings.date] || new Date().toISOString().split('T')[0];
          const rawStreet = cells[columnMappings.street] || 'Não informado';

          if (rawNeigh && rawSize && rawVal) {
            // Standardize Property Type in Portuguese format
            let mappedType: PropertyType = 'Apartamento';
            const typeLower = rawType.toLowerCase();
            if (typeLower.includes('casa') || typeLower.includes('home')) mappedType = 'Casa';
            else if (typeLower.includes('comercio') || typeLower.includes('sala') || typeLower.includes('loja') || typeLower.includes('office') || typeLower.includes('comercial')) mappedType = 'Comercial';
            else if (typeLower.includes('terreno') || typeLower.includes('land') || typeLower.includes('lote')) mappedType = 'Terreno';

            // Clean number inputs (removing dots, commas, R$)
            const cleanSize = Number(rawSize.replace(/[^\d.,]/g, '').replace(',', '.'));
            const cleanValue = Number(rawVal.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));

            if (!isNaN(cleanSize) && !isNaN(cleanValue) && cleanSize > 0 && cleanValue > 0) {
              itemsToUpload.push({
                neighborhood: rawNeigh,
                propertyType: mappedType,
                sizeSqm: cleanSize,
                transactionValue: cleanValue,
                date: rawDate,
                state: batchState.toUpperCase().trim(),
                city: batchCity.trim(),
                street: rawStreet
              });
            }
          }
        }
      });

      if (itemsToUpload.length === 0) {
        alert('Erro: Nenhuma linha foi mapeada corretamente. Verifique as colunas selecionadas.');
        setIsProcessingBatch(false);
        return;
      }

      const countAdded = await onBatchTransactions(itemsToUpload);
      alert(`${countAdded} transações de ITBI inseridas na base municipal com sucesso!`);
      setPastedText('');
      setBatchPreview(null);
    } catch (e: any) {
      alert('Erro ao importar lote de ITBI: ' + e.message);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  // Render SVG Histogram/Chart
  const renderAverageChart = () => {
    if (neighborhoodStats.length === 0) return null;
    
    // Take top 8 neighborhoods to fit nicely
    const topNeighborhoods = neighborhoodStats.slice(0, 8);
    const maxVal = Math.max(...topNeighborhoods.map(s => s.averageValueSqm));
    
    const chartHeight = 220;
    const paddingLeft = 120;
    const paddingRight = 40;
    const paddingTop = 20;
    const paddingBottom = 40;
    const width = 600;
    const drawWidth = width - paddingLeft - paddingRight;
    const barHeight = 16;
    const barSpacing = 24;

    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Gabarito de Valores Médios por Região (R$/m² de ITBI)</h3>
          </div>
          <span className="text-xs text-gray-400">Dados Históricos Reais</span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${chartHeight}`} className="w-full h-auto text-gray-600 font-sans" style={{ minWidth: '450px' }}>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const xPos = paddingLeft + ratio * drawWidth;
              const gridVal = Math.round(ratio * maxVal);
              return (
                <g key={idx}>
                  <line 
                    x1={xPos} 
                    y1={paddingTop} 
                    x2={xPos} 
                    y2={chartHeight - paddingBottom} 
                    stroke="#F1F5F9" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                  <text 
                    x={xPos} 
                    y={chartHeight - paddingBottom + 16} 
                    textAnchor="middle" 
                    className="text-[10px] fill-gray-400 font-mono"
                  >
                    R$ {gridVal.toLocaleString('pt', { maximumFractionDigits: 0 })}
                  </text>
                </g>
              );
            })}

            {topNeighborhoods.map((n, idx) => {
              const y = paddingTop + idx * barSpacing;
              const barWidth = maxVal > 0 ? (n.averageValueSqm / maxVal) * drawWidth : 0;
              
              return (
                <g key={n.neighborhood} className="group">
                  {/* Label name */}
                  <text 
                    x={paddingLeft - 10} 
                    y={y + 12} 
                    textAnchor="end" 
                    className="text-xs font-semibold fill-gray-700 font-sans"
                  >
                    {n.neighborhood}
                  </text>

                  {/* Colored bar representing the m2 value */}
                  <rect 
                    x={paddingLeft} 
                    y={y} 
                    width={barWidth} 
                    height={barHeight} 
                    rx="3"
                    className="fill-indigo-600 hover:fill-blue-500 transition-all duration-300" 
                  />

                  {/* Value label on top/right of bar */}
                  <text 
                    x={paddingLeft + barWidth + 8} 
                    y={y + 12} 
                    className="text-xs font-bold fill-indigo-900 font-mono"
                  >
                    {n.averageValueSqm.toLocaleString('pt')}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 📖 GUIA INTERATIVO PARA ALIMENTAÇÃO DE DADOS */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">📖 Guia Completo: Como Obter e Alimentar Planilhas de ITBI</h2>
              <p className="text-xs text-gray-400 mt-0.5">Siga o passo a passo para alimentar o cérebro estatístico do programa por estado e município.</p>
            </div>
          </div>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-slate-50 transition-colors cursor-pointer text-slate-600 shrink-0 self-start sm:self-center"
          >
            {showGuide ? "Esconder Tutorial ✕" : "Exibir Tutorial 📖"}
          </button>
        </div>

        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 text-xs">
                
                {/* Passo 1 */}
                <div className="p-3.5 bg-slate-50/70 border border-gray-200/50 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white font-mono font-bold text-[10px] rounded-full">1</span>
                    <strong className="text-slate-800 text-xs">Acessar Dados Oficiais</strong>
                  </div>
                  <p className="text-gray-500 leading-normal text-[11px]">
                    Pesquise no Google por: <code className="bg-slate-100 font-mono text-[9px] px-1 py-0.5 rounded font-semibold">"Planilha ITBI [Sua Cidade] dados abertos"</code>. Municípios grandes como São Paulo fornecem no <a href="https://geosampa.prefeitura.sp.gov.br/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline inline-flex items-center space-x-0.5">GeoSampa</a> e Rio de Janeiro no <a href="https://www.data.rio/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline">Data.Rio</a>. Baixe o arquivo XLSX ou CSV.
                  </p>
                </div>

                {/* Passo 2 */}
                <div className="p-3.5 bg-slate-50/70 border border-gray-200/50 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white font-mono font-bold text-[10px] rounded-full">2</span>
                    <strong className="text-slate-800 text-xs">Organizar no Excel</strong>
                  </div>
                  <p className="text-gray-500 leading-normal text-[11px]">
                    Arrume sua planilha com colunas principais: <strong className="text-slate-700">Bairro</strong>, <strong className="text-slate-700">Tipo</strong> (Casa/Apartamento), <strong className="text-slate-700">Área útil (m²)</strong> e <strong className="text-slate-700">Valor de Transação</strong>. Não se preocupe em formatar os números, nosso leitor limpa pontos, zeros ou símbolos de moeda.
                  </p>
                </div>

                {/* Passo 3 */}
                <div className="p-3.5 bg-slate-50/70 border border-gray-200/50 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white font-mono font-bold text-[10px] rounded-full">3</span>
                    <strong className="text-slate-800 text-xs">Evitar Colisões de Bairros</strong>
                  </div>
                  <p className="text-gray-500 leading-normal text-[11px]">
                    Como cidades diferentes podem possuir bairros com nomes idênticos (ex.: "Centro"), nosso software separa estatísticas por **Estado (UF)** e **Município**. Insira as tags de localidade antes de salvar para isolar as avaliações de arbitragem estritamente na sua região de interesse.
                  </p>
                </div>

                {/* Passo 4 */}
                <div className="p-3.5 bg-slate-50/70 border border-gray-200/50 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white font-mono font-bold text-[10px] rounded-full">4</span>
                    <strong className="text-slate-800 text-xs">Copiar e Indexar</strong>
                  </div>
                  <p className="text-gray-500 leading-normal text-[11px]">
                    Abra sua tabela, selecione os dados, copie (<kbd className="bg-slate-100 px-1 py-0.5 rounded font-sans">Ctrl+C</kbd>) e cole no painel abaixo. Faça o mapeamento simples das colunas detectadas e clique em <strong className="text-emerald-700 font-bold">Processar e Indexar</strong> para reavaliar os leilões cadastrados instantaneamente!
                  </p>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div id="itbi-manager-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-800">
        
        {/* 2/3 Area - Municipal Reference Stats & Pasting CSV */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dynamic Filtering Selector bar - Modern Glassmorphism/Gradient styling */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-indigo-600 font-mono tracking-wider">Filtros de Referência ITBI</span>
              <h3 className="text-sm font-bold text-slate-800">Selecione a Região e Bairro</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs w-full md:w-auto">
              <div className="flex flex-col space-y-1">
                <span className="text-slate-500 font-semibold font-mono text-[9px] uppercase">Estado (UF):</span>
                <select
                  value={uiStateFilter}
                  onChange={(e) => {
                    setUiStateFilter(e.target.value);
                    setUiCityFilter('');
                    setUiNeighborhoodFilter('');
                  }}
                  className="bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <option value="">Todos estados</option>
                  {uniqueTxStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <span className="text-slate-500 font-semibold font-mono text-[9px] uppercase">Município:</span>
                <select
                  value={uiCityFilter}
                  disabled={!uiStateFilter}
                  onChange={(e) => {
                    setUiCityFilter(e.target.value);
                    setUiNeighborhoodFilter('');
                  }}
                  className="bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Todas cidades</option>
                  {uniqueTxCities.map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <span className="text-slate-500 font-semibold font-mono text-[9px] uppercase">Bairro:</span>
                <select
                  value={uiNeighborhoodFilter}
                  disabled={!uiCityFilter}
                  onChange={(e) => setUiNeighborhoodFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Todos bairros</option>
                  {uniqueTxNeighborhoods.map(nb => (
                    <option key={nb} value={nb}>{nb}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Horizontal Chart */}
          {renderAverageChart()}

          {/* Mapped Neighborhood Data Summary */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-800 text-sm">Resumos por Bairro {uiCityFilter ? `em ${uiCityFilter}` : ''}</h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 px-2 font-mono">Ordenar por:</span>
                  <button
                    onClick={() => setSortBy('value')}
                    className={`px-2.5 py-1 rounded-md font-bold text-[10.5px] transition-all cursor-pointer ${
                      sortBy === 'value' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Maior Valor m²
                  </button>
                  <button
                    onClick={() => setSortBy('transactions')}
                    className={`px-2.5 py-1 rounded-md font-bold text-[10.5px] transition-all cursor-pointer ${
                      sortBy === 'transactions' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Qtd Transações
                  </button>
                </div>

                {itbiCount > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza de que deseja esvaziar todo o banco de ITBI? Você poderá importar seus próprios dados a qualquer momento.')) {
                        onClearAllTransactions();
                      }
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center space-x-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Esvaziar Base</span>
                  </button>
                )}
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-medium text-xs uppercase tracking-wider">
                  <th className="pb-2.5 font-semibold">Bairro</th>
                  <th className="pb-2.5 font-semibold text-right">Média Valor m²</th>
                  <th className="pb-2.5 font-semibold text-right">Preço de Venda Médio</th>
                  <th className="pb-2.5 font-semibold text-right">Janela Min - Max m²</th>
                  <th className="pb-2.5 font-semibold text-center">Amostras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {neighborhoodStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400 text-xs">
                      Nenhum registro de ITBI indexado. Adicione novas transações no painel lateral ou carregue via planilha.
                    </td>
                  </tr>
                ) : (
                  neighborhoodStats.map((s, idx) => (
                    <tr 
                      key={`${s.state || 'SP'}|${s.city || 'São Paulo'}|${s.neighborhood}`} 
                      onClick={() => handleNeighborhoodClick(s.neighborhood, s.state || 'SP', s.city || 'São Paulo')}
                      className="hover:bg-slate-100/70 transition-colors cursor-pointer"
                      title="Clique para ver o valor de m² por ruas"
                    >
                      <td className="py-3 font-semibold text-gray-900 flex flex-col justify-center">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] text-gray-400 font-mono w-5">#{idx + 1}</span>
                          <span className="text-indigo-600 hover:underline">{s.neighborhood}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-normal pl-6">
                          {s.city || 'São Paulo'} - {s.state || 'SP'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-indigo-700">R$ {s.averageValueSqm.toLocaleString('pt')}/m²</td>
                      <td className="py-3 text-right font-mono text-gray-600">{formatBRL(s.averageTotalValue)}</td>
                      <td className="py-3 text-right font-mono text-xs text-gray-500">R$ {s.minValueSqm.toLocaleString('pt')} - R$ {s.maxValueSqm.toLocaleString('pt')}</td>
                      <td className="py-3 text-center">
                        <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          {s.transactionCount} txs
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CSV Batch Paste Console */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Carregamento e Importação em Lote (Excel, CSV, Planilhas)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Cole os registros de ITBI oficiais fornecidos pela prefeitura no painel abaixo.</p>
            </div>
          </div>

          {/* Configuração de qual Região pertence a planilha atual */}
          <div className="bg-emerald-50/40 border border-emerald-100/60 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1 font-mono">Região da Planilha: Estado (UF)</label>
              <select
                value={batchState}
                onChange={(e) => setBatchState(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-gray-300 rounded-lg p-2 text-slate-800 outline-none focus:border-emerald-500"
              >
                {BRAZIL_STATES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Região da Planilha: Cidade/Município</label>
              <input
                type="text"
                required
                value={batchCity}
                onChange={(e) => setBatchCity(e.target.value)}
                placeholder="Ex. São Paulo, Niterói"
                className="w-full text-xs font-bold bg-white border border-gray-300 rounded-lg p-2 text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>
            <p className="sm:col-span-2 text-[9.5px] text-gray-400 leading-normal italic">
              💡 Como as planilhas municipais abrangem apenas sua própria localidade, o programa aplicará esta UF e Cidade a todas as linhas lidas para seu resguardo analítico, evitando duplicações indesejadas em bairros com nomes idênticos no Brasil.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Delimitador do CSV:</span>
              <div className="flex space-x-3">
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input type="radio" checked={csvDelimiter === 'auto'} onChange={() => setCsvDelimiter('auto')} className="text-blue-600" />
                  <span>Auto-detectar</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input type="radio" checked={csvDelimiter === ';'} onChange={() => setCsvDelimiter(';')} className="text-blue-600" />
                  <span>Ponto e vírgula (;)</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input type="radio" checked={csvDelimiter === ','} onChange={() => setCsvDelimiter(',')} className="text-blue-600" />
                  <span>Vírgula (,)</span>
                </label>
              </div>
            </div>

            <textarea
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="Cole as colunas aqui. Exemplo:
Bairro;Tipo;Area;Valor;Data
Moema;Apartamento;85;1100000;2026-03-01
Pinheiros;Apartamento;60;750000;2026-04-12"
              rows={5}
              className="w-full text-xs font-mono p-3 border border-gray-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            {batchPreview && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
              >
                <span className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Estrutura de Cabeçalhos Detectada ({batchPreview.headers.length} colunas)</span>
                </span>

                <div className="text-xs space-y-2">
                  <p className="text-gray-500">Mapeie as propriedades do leilão para as colunas listadas na sua planilha copiadora:</p>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">Bairro</span>
                      <select 
                        value={columnMappings.neighborhood} 
                        onChange={(e) => setColumnMappings({ ...columnMappings, neighborhood: Number(e.target.value) })}
                        className="w-full text-xs p-1 bg-white border border-gray-300 rounded mt-0.5"
                      >
                        {batchPreview.headers.map((h, i) => (<option key={i} value={i}>{h}</option>))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">Rua / Logr.</span>
                      <select 
                        value={columnMappings.street} 
                        onChange={(e) => setColumnMappings({ ...columnMappings, street: Number(e.target.value) })}
                        className="w-full text-xs p-1 bg-white border border-gray-300 rounded mt-0.5"
                      >
                        {batchPreview.headers.map((h, i) => (<option key={i} value={i}>{h}</option>))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">Tipo</span>
                      <select 
                        value={columnMappings.propertyType} 
                        onChange={(e) => setColumnMappings({ ...columnMappings, propertyType: Number(e.target.value) })}
                        className="w-full text-xs p-1 bg-white border border-gray-300 rounded mt-0.5"
                      >
                        {batchPreview.headers.map((h, i) => (<option key={i} value={i}>{h}</option>))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">Área (m²)</span>
                      <select 
                        value={columnMappings.sizeSqm} 
                        onChange={(e) => setColumnMappings({ ...columnMappings, sizeSqm: Number(e.target.value) })}
                        className="w-full text-xs p-1 bg-white border border-gray-300 rounded mt-0.5"
                      >
                        {batchPreview.headers.map((h, i) => (<option key={i} value={i}>{h}</option>))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">Valor Total</span>
                      <select 
                        value={columnMappings.transactionValue} 
                        onChange={(e) => setColumnMappings({ ...columnMappings, transactionValue: Number(e.target.value) })}
                        className="w-full text-xs p-1 bg-white border border-gray-300 rounded mt-0.5"
                      >
                        {batchPreview.headers.map((h, i) => (<option key={i} value={i}>{h}</option>))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-medium">Data (Opt)</span>
                      <select 
                        value={columnMappings.date} 
                        onChange={(e) => setColumnMappings({ ...columnMappings, date: Number(e.target.value) })}
                        className="w-full text-xs p-1 bg-white border border-gray-300 rounded mt-0.5"
                      >
                        {batchPreview.headers.map((h, i) => (<option key={i} value={i}>{h}</option>))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Rows preview */}
                <div className="overflow-x-auto border-t border-slate-200 pt-2.5">
                  <table className="w-full text-left text-[11px] text-gray-500 font-mono">
                    <thead>
                      <tr>
                        {batchPreview.headers.map((h, i) => (
                          <th key={i} className="pb-1 font-semibold text-gray-600 pr-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batchPreview.rows.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="py-0.5 pr-3 truncate max-w-[120px]">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-gray-400 mt-1.5 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Exibidas as 5 primeiras linhas para conferência. Esses registros receberão as tags de região: <strong className="font-bold text-slate-700 font-mono">{batchState} - {batchCity}</strong>.</span>
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleBatchImport}
                    disabled={isProcessingBatch}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    {isProcessingBatch ? 'Processando Base...' : 'Processar e Indexar Registros'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* 1/3 Area - Manual single transaction input */}
      <div className="space-y-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Inserir Transação Avulsa</h3>
          </div>

          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-dashed border-gray-200">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 font-mono">Estado (UF)</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full text-xs font-bold border border-gray-300 bg-white rounded-lg p-2 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
                >
                  {BRAZIL_STATES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Município</label>
                <input
                  type="text"
                  required
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  placeholder="Ex. São Paulo"
                  className="w-full text-xs font-bold border border-gray-300 bg-white rounded-lg p-2 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">Bairro do Município *</label>
                <input
                  type="text"
                  required
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex. Moema, Pinheiros"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">Rua / Logradouro</label>
                <input
                  type="text"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  placeholder="Ex. Alameda dos Maracatins"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">Tipo de Imóvel</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as PropertyType)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none bg-white"
                >
                  <option value="Apartamento">Apartamento</option>
                  <option value="Casa">Casa</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Terreno">Terreno</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1 font-mono">Data da Venda</label>
                <input
                  type="date"
                  required
                  value={dataTx}
                  onChange={(e) => setDataTx(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">Área Privativa (m²)</label>
                <input
                  type="number"
                  required
                  min="5"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Ex. 85"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">Valor Venda ITBI (R$)</label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Ex. 950000"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none font-mono"
                />
              </div>
            </div>

            {successMessage && (
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-xs text-emerald-600 font-medium bg-emerald-50 p-2 rounded flex items-center space-x-1"
              >
                <span>✔ {successMessage}</span>
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 rounded-lg cursor-pointer transition-colors"
            >
              {isSubmitting ? 'Registrando...' : 'Indexar Transação'}
            </button>
          </form>
        </div>

        {/* Informative Guidance Panel */}
        <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-5 space-y-3 shadow-inner">
          <span className="text-slate-800 font-bold text-xs flex items-center space-x-1.5 uppercase tracking-wide">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Por que usamos ITBI?</span>
          </span>
          <p className="text-xs text-gray-500 leading-relaxed">
            Diferente dos valores anunciados em portais (que incluem altos honorários de corretagem e margens de barganha), o **ITBI (Imposto sobre Transmissão de Bens Imóveis)** é registrado diretamente na prefeitura no fechamento das escrituras públicas. 
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ele representa o **verdadeiro valor transacionado por m²** no mercado local. Ao parear os lances mínimos de leilão contra essa base, consolidamos uma arbitragem isenta de vieses, medindo exatamente a margem líquida real de lucro do investimento.
          </p>
        </div>
      </div>

      {/* Drawer lateral de Ruas e m² */}
      <AnimatePresence>
        {selectedNeighborhoodDetail && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNeighborhoodDetail(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col h-full border-l border-slate-200"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <span>Detalhe de Ruas</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-semibold">
                    {selectedNeighborhoodDetail.neighborhood}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {selectedNeighborhoodDetail.city} - {selectedNeighborhoodDetail.state}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNeighborhoodDetail(null)}
                  className="p-1.5 hover:bg-slate-200 text-gray-500 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={streetSearch}
                    onChange={(e) => setStreetSearch(e.target.value)}
                    placeholder="Pesquisar rua ou logradouro..."
                    className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
                  />
                  {streetSearch && (
                    <button
                      onClick={() => setStreetSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content / Street list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {isLoadingStreets ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 font-medium">Carregando dados das ruas...</span>
                  </div>
                ) : filteredStreets.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-xs text-gray-400">
                      {streetSearch ? 'Nenhuma rua corresponde à pesquisa.' : 'Nenhuma transação com rua informada para este bairro.'}
                    </p>
                  </div>
                ) : (
                  filteredStreets.map((st, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-2.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-slate-800 leading-snug break-words flex-1">
                          {st.street || 'Não informado'}
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {st.transactionCount} txs
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100/60 text-xs">
                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-medium">Média m²</span>
                          <span className="font-mono font-bold text-indigo-600">
                            R$ {st.averageValueSqm.toLocaleString('pt-BR')}/m²
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-gray-400 uppercase font-medium">Preço Médio</span>
                          <span className="font-mono text-slate-700">
                            {formatBRL(st.averageTotalValue)}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono flex justify-between bg-slate-50 p-1.5 rounded-md">
                        <span>Min: R$ {st.minValueSqm.toLocaleString('pt-BR')}/m²</span>
                        <span>Max: R$ {st.maxValueSqm.toLocaleString('pt-BR')}/m²</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
    </div>
  );
}
