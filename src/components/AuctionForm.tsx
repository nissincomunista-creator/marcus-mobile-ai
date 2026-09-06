import React, { useState, useEffect } from 'react';
import { AuctionProperty, PropertyType, BRAZIL_STATES } from '../types.ts';
import { X, Save, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface AuctionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: Partial<AuctionProperty>) => Promise<void>;
  initialData: Partial<AuctionProperty> | null;
  existingNeighborhoods: string[];
}

export default function AuctionForm({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingNeighborhoods
}: AuctionFormProps) {
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('Apartamento');
  const [sizeSqm, setSizeSqm] = useState('');
  const [auctionPrice, setAuctionPrice] = useState('');
  const [estimatedRepair, setEstimatedRepair] = useState('');
  const [pendingDebts, setPendingDebts] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [auctionDate, setAuctionDate] = useState('');
  const [auctionLink, setAuctionLink] = useState('');
  const [description, setDescription] = useState('');
  const [occupied, setOccupied] = useState(true);
  const [allowsFinancing, setAllowsFinancing] = useState(false);
  const [allowsInstallments, setAllowsInstallments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New States requested
  const [state, setState] = useState('SP');
  const [portalZapAvg, setPortalZapAvg] = useState('');
  const [portalQuintoAndarAvg, setPortalQuintoAndarAvg] = useState('');
  const [streetPortalAvgSqm, setStreetPortalAvgSqm] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [parkingSpaces, setParkingSpaces] = useState('1');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setAddress(initialData.address || '');
      setNeighborhood(initialData.neighborhood || '');
      setCity(initialData.city || '');
      setPropertyType((initialData.propertyType || 'Apartamento') as PropertyType);
      setSizeSqm(initialData.sizeSqm ? String(initialData.sizeSqm) : '');
      setAuctionPrice(initialData.auctionPrice ? String(initialData.auctionPrice) : '');
      setEstimatedRepair(initialData.estimatedRepair ? String(initialData.estimatedRepair) : '0');
      setPendingDebts(initialData.pendingDebts ? String(initialData.pendingDebts) : '0');
      setOtherCosts(initialData.otherCosts ? String(initialData.otherCosts) : '0');
      setEstimatedValue(initialData.estimatedValue ? String(initialData.estimatedValue) : '0');
      setAuctionDate(initialData.auctionDate || '');
      setAuctionLink(initialData.auctionLink || '');
      setDescription(initialData.description || '');
      setOccupied(initialData.occupied !== undefined ? initialData.occupied : true);
      setAllowsFinancing(initialData.allowsFinancing !== undefined ? Boolean(initialData.allowsFinancing) : false);
      setAllowsInstallments(initialData.allowsInstallments !== undefined ? Boolean(initialData.allowsInstallments) : false);
      setState(initialData.state || 'SP');
      setPortalZapAvg(initialData.portalZapAvg ? String(initialData.portalZapAvg) : '');
      setPortalQuintoAndarAvg(initialData.portalQuintoAndarAvg ? String(initialData.portalQuintoAndarAvg) : '');
      setStreetPortalAvgSqm(initialData.streetPortalAvgSqm ? String(initialData.streetPortalAvgSqm) : '');
      setBedrooms(initialData.bedrooms !== undefined ? String(initialData.bedrooms) : '2');
      setParkingSpaces(initialData.parkingSpaces !== undefined ? String(initialData.parkingSpaces) : '1');
    } else {
      setTitle('');
      setAddress('');
      setNeighborhood('');
      setCity('');
      setPropertyType('Apartamento');
      setSizeSqm('');
      setAuctionPrice('');
      setEstimatedRepair('0');
      setPendingDebts('0');
      setOtherCosts('0');
      setEstimatedValue('0');
      setAuctionDate(new Date().toISOString().split('T')[0]);
      setAuctionLink('');
      setDescription('');
      setOccupied(true);
      setAllowsFinancing(false);
      setAllowsInstallments(false);
      setState('SP');
      setPortalZapAvg('');
      setPortalQuintoAndarAvg('');
      setStreetPortalAvgSqm('');
      setBedrooms('2');
      setParkingSpaces('1');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !neighborhood || !sizeSqm || !auctionPrice) {
      alert('Preencha os campos obrigatórios (Título, Bairro, Área m² e Preço de Leilão)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<AuctionProperty> = {
        title: title.trim(),
        address: address.trim() || 'Endereço não informado',
        neighborhood: neighborhood.trim(),
        city: city.trim() || undefined,
        propertyType,
        sizeSqm: Number(sizeSqm),
        auctionPrice: Number(auctionPrice),
        estimatedRepair: Number(estimatedRepair || 0),
        pendingDebts: Number(pendingDebts || 0),
        otherCosts: Number(otherCosts || 0),
        estimatedValue: Number(estimatedValue || 0),
        auctionDate,
        auctionLink: auctionLink.trim() || undefined,
        description: description.trim() || undefined,
        occupied,
        allowsFinancing,
        allowsInstallments,
        state: state.toUpperCase().trim() || 'SP',
        portalZapAvg: portalZapAvg !== '' ? Number(portalZapAvg) : undefined,
        portalQuintoAndarAvg: portalQuintoAndarAvg !== '' ? Number(portalQuintoAndarAvg) : undefined,
        streetPortalAvgSqm: streetPortalAvgSqm !== '' ? Number(streetPortalAvgSqm) : undefined,
        bedrooms: bedrooms !== '' ? Number(bedrooms) : undefined,
        parkingSpaces: parkingSpaces !== '' ? Number(parkingSpaces) : undefined
      };

      if (initialData?.id) {
        payload.id = initialData.id;
      }

      await onSave(payload);
      onClose();
    } catch (e: any) {
      alert('Erro ao gravar leilão: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-[#E2E8F0] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col text-slate-800"
      >
        {/* Header toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>{initialData?.id ? 'Editar Ficha do Leilão' : 'Cadastrar Oportunidade de Leilão'}</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Informe as credenciais do imóvel e os custos previstos do edital.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 text-gray-500 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Main Title Row */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Título do Leilão *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Apartamento 2 dormitórios c/ Garagem - Edifício Copan"
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
            />
          </div>

          {/* Type, State, City, Neighborhood & Size row */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo de Imóvel</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none bg-white"
              >
                <option value="Apartamento">Apartamento</option>
                <option value="Casa">Casa</option>
                <option value="Comercial">Comercial</option>
                <option value="Terreno">Terreno</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Estado (UF) *</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none bg-white"
              >
                {BRAZIL_STATES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex. São Paulo"
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bairro *</label>
              <input
                type="text"
                required
                list="bairros-sugeridos"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex. Pinheiros"
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
              />
              <datalist id="bairros-sugeridos">
                {existingNeighborhoods.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tamanho da Área (m²) *</label>
              <input
                type="number"
                required
                min="1"
                value={sizeSqm}
                onChange={(e) => setSizeSqm(e.target.value)}
                placeholder="Ex. 75"
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none font-mono"
              />
            </div>
          </div>

          {/* Full address & external link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Endereço Completo</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, Número, Bloco/Ap"
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Link do Edital ou Portal de Leilão</label>
              <input
                type="url"
                value={auctionLink}
                onChange={(e) => setAuctionLink(e.target.value)}
                placeholder="https://paginaleiloeiro.com.br/lote"
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none"
              />
            </div>
          </div>

          {/* Bedrooms & Parking Spaces */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quartos</label>
              <select
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none bg-white"
              >
                <option value="1">1 Quarto</option>
                <option value="2">2 Quartos</option>
                <option value="3">3 Quartos</option>
                <option value="4">4+ Quartos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vagas de Garagem</label>
              <select
                value={parkingSpaces}
                onChange={(e) => setParkingSpaces(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 transition-shadow outline-none bg-white"
              >
                <option value="0">Sem Vaga</option>
                <option value="1">1 Vaga</option>
                <option value="2">2 Vagas</option>
                <option value="3">3+ Vagas</option>
              </select>
            </div>
          </div>

          {/* Financial cost entries Row */}
          <div className="p-4 bg-slate-50 rounded-xl border border-dotted border-gray-200 space-y-4">
            <span className="text-xs font-bold text-slate-700 flex items-center space-x-1 uppercase tracking-wide">
              <span>💲 Engenharia Financeira de Aporte</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Lance Mínimo (R$) *</label>
                <input
                  type="number"
                  required
                  min="1000"
                  value={auctionPrice}
                  onChange={(e) => setAuctionPrice(e.target.value)}
                  placeholder="250000"
                  className="w-full text-sm font-semibold border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 text-emerald-800 uppercase tracking-wider mb-1" title="Verba estimada de benfeitorias, pintura e reforma">Obra / Reforma (R$)</label>
                <input
                  type="number"
                  value={estimatedRepair}
                  onChange={(e) => setEstimatedRepair(e.target.value)}
                  placeholder="0"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 text-rose-800 uppercase tracking-wider mb-1" title="Condomínio, IPTU e atrasados do antigo morador de obrigação do arrematante">Atrasa / Dívidas (R$)</label>
                <input
                  type="number"
                  value={pendingDebts}
                  onChange={(e) => setPendingDebts(e.target.value)}
                  placeholder="0"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1" title="Deixe 0 para auto-calcular taxas (leiloeiro 5% + escrituração/registro 3%)">Burocracia / Taxas (R$)</label>
                <input
                  type="number"
                  value={otherCosts}
                  onChange={(e) => setOtherCosts(e.target.value)}
                  placeholder="0"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1" title="Se deixar 0, a plataforma estimará usando a média do m² de ITBI correspondente">Preço de Revenda Estimado (R$)</label>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="Deixe em 0 para auto-estimar"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Data da Seção do Leilão</label>
                <input
                  type="date"
                  value={auctionDate}
                  onChange={(e) => setAuctionDate(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Real estate portals values section */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
            <span className="text-xs font-bold text-indigo-800 flex items-center space-x-1 uppercase tracking-wide">
              <span>🏠 comparativos de Portais de Venda (ZapImóveis & QuintoAndar)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1" title="Preço médio estimado para imóvel semelhante do mesmo tipo na mesma rua">Média ZapImóveis (R$)</label>
                <input
                  type="number"
                  value={portalZapAvg}
                  onChange={(e) => setPortalZapAvg(e.target.value)}
                  placeholder="Ex. 1150000"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1" title="Preço médio estimado para imóvel semelhante do mesmo tipo na mesma rua">Média QuintoAndar (R$)</label>
                <input
                  type="number"
                  value={portalQuintoAndarAvg}
                  onChange={(e) => setPortalQuintoAndarAvg(e.target.value)}
                  placeholder="Ex. 1120000"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1" title="Média geral por m² anunciado de qualquer imóvel ativo nessa rua">Média m² Anúncio Rua (R$/m²)</label>
                <input
                  type="number"
                  value={streetPortalAvgSqm}
                  onChange={(e) => setStreetPortalAvgSqm(e.target.value)}
                  placeholder="Ex. 13000"
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none font-mono bg-white"
                />
              </div>
            </div>
            <p className="text-[10px] text-indigo-600 italic">Essas médias subsidiarão a inteligência artificial ao traçar a tese de arbitragem de mercado.</p>
          </div>

          {/* Ocupado / desocupado toggle & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 pt-2 flex flex-col space-y-3 justify-center">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={occupied}
                  onChange={(e) => setOccupied(e.target.checked)}
                  className="w-4.5 h-4.5 text-blue-600 rounded bg-slate-100 border-gray-300 focus:ring-blue-500"
                />
                <div className="text-sm">
                  <span className="font-semibold text-slate-700 block select-none">Imóvel Ocupado</span>
                  <span className="text-[10px] text-gray-400 block select-none">Ocupação judicial exige despejo</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowsFinancing}
                  onChange={(e) => setAllowsFinancing(e.target.checked)}
                  className="w-4.5 h-4.5 text-blue-600 rounded bg-slate-100 border-gray-300 focus:ring-blue-500"
                />
                <div className="text-sm">
                  <span className="font-semibold text-slate-700 block select-none">Aceita Financiamento</span>
                  <span className="text-[10px] text-gray-400 block select-none">Permite pagar via banco</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowsInstallments}
                  onChange={(e) => setAllowsInstallments(e.target.checked)}
                  className="w-4.5 h-4.5 text-blue-600 rounded bg-slate-100 border-gray-300 focus:ring-blue-500"
                />
                <div className="text-sm">
                  <span className="font-semibold text-slate-700 block select-none">Permite Parcelamento</span>
                  <span className="text-[10px] text-gray-400 block select-none">Opção de parcelamento em edital</span>
                </div>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Detalhes do Edital / Textos Adicionais</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cole o resumo de ônus, descrição de matrícula ou termos de pagamento"
                rows={4}
                className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-lg cursor-pointer flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Salvando...' : 'Salvar Ficha'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
