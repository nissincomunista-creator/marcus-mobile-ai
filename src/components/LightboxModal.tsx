import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ExternalLink, Sparkles, MapPin, Building2 } from 'lucide-react';
import { AuctionProperty } from '../types.ts';

interface LightboxModalProps {
  property: AuctionProperty | null;
  onClose: () => void;
  onSimulate?: (property: AuctionProperty) => void;
}

export default function LightboxModal({
  property,
  onClose,
  onSimulate
}: LightboxModalProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  // Derive candidate photos for the property
  const photos = React.useMemo(() => {
    if (!property) return [];
    const list: string[] = [];

    if (property.imageUrl && !list.includes(property.imageUrl)) {
      list.push(property.imageUrl);
    }

    // Caixa alternate photo URLs
    const rawNumMatch = (property.auctionLink || '').match(/hdnimovel=(\d+)/) ||
                        (property.id || '').match(/auc-caixa-(\d+)/);
    if (rawNumMatch) {
      const num = rawNumMatch[1];
      const p1 = `https://venda-imoveis.caixa.gov.br/fotos/F${num}21.jpg`;
      const p2 = `https://venda-imoveis.caixa.gov.br/fotos/F${num}11.jpg`;
      const p3 = `https://venda-imoveis.caixa.gov.br/fotos/F${num}01.jpg`;
      if (!list.includes(p1)) list.push(p1);
      if (!list.includes(p2)) list.push(p2);
      if (!list.includes(p3)) list.push(p3);
    }

    if (Array.isArray((property as any).images)) {
      (property as any).images.forEach((img: string) => {
        if (img && !list.includes(img)) list.push(img);
      });
    }

    return list;
  }, [property]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [property?.id]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setPhotoIndex(prev => (prev + 1) % photos.length);
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  if (!property) return null;

  const formatBRL = (val?: number) => {
    if (val === undefined || isNaN(val)) return 'R$ -';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const activePhoto = photos[photoIndex] || property.imageUrl;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md">
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 shrink-0">
            <div className="flex items-center space-x-3 truncate">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h3 className="font-bold text-white text-sm sm:text-base truncate leading-tight">
                  {property.title}
                </h3>
                <div className="flex items-center text-xs text-slate-400 space-x-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">
                    {property.address} • {property.neighborhood}, {property.city} - {property.state || 'RJ'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 ml-3"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Visualizer */}
          <div className="relative flex-1 min-h-[320px] sm:min-h-[480px] max-h-[65vh] bg-slate-950 flex items-center justify-center overflow-hidden">
            {activePhoto ? (
              <img
                src={activePhoto}
                alt={property.title}
                className="max-w-full max-h-full object-contain select-none"
              />
            ) : (
              <div className="text-center p-8 text-slate-500">
                <Building2 className="w-16 h-16 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-sm font-medium">Nenhuma fotografia anexada a este lote.</p>
                <p className="text-xs text-slate-600 mt-1">Consulte o edital original para mais anexos periciais.</p>
              </div>
            )}

            {/* Previous / Next buttons */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-slate-700 transition-all cursor-pointer shadow-lg hover:scale-105"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-slate-700 transition-all cursor-pointer shadow-lg hover:scale-105"
                  title="Próxima foto"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Photo Counter Pill */}
            {photos.length > 0 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-full border border-slate-700 text-xs font-mono text-slate-300 shadow-md">
                Foto {photoIndex + 1} de {photos.length}
              </div>
            )}
          </div>

          {/* Thumbnail Bar if multiple photos */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 p-2.5 bg-slate-950/95 border-t border-slate-855 overflow-x-auto shrink-0 justify-center">
              {photos.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setPhotoIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    photoIndex === idx ? 'border-indigo-500 scale-105 shadow-md' : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Footer with financial summary & actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 border-t border-slate-800 shrink-0">
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Lance Mínimo</span>
                <span className="font-bold text-white text-sm">{property.auctionPrice > 0 ? formatBRL(property.auctionPrice) : 'Aberto a Propostas'}</span>
              </div>
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Gabarito ITBI</span>
                <span className="font-bold text-amber-400 text-sm">{formatBRL(property.estimatedValue)}</span>
              </div>
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Lucro Estimado</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {property.calculatedProfit ? formatBRL(property.calculatedProfit) : 'Sob análise'}
                </span>
              </div>
              {property.calculatedRoi !== undefined && (
                <>
                  <div className="h-6 w-px bg-slate-800 hidden sm:block" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">ROI</span>
                    <span className="font-bold text-indigo-400 text-sm">{property.calculatedRoi}%</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {property.auctionLink && (
                <a
                  href={property.auctionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500/40 flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span>Ver no Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {onSimulate && (
                <button
                  onClick={() => {
                    onClose();
                    onSimulate(property);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simular Viabilidade</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
