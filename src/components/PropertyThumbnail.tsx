import React, { useState } from 'react';
import { Building2, Home, Landmark, Trees, Image as ImageIcon } from 'lucide-react';
import { AuctionProperty } from '../types.ts';

interface PropertyThumbnailProps {
  property: AuctionProperty;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PropertyThumbnail({
  property,
  className = '',
  size = 'md'
}: PropertyThumbnailProps) {
  const [imgErrorCount, setImgErrorCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Extract Caixa identification code
  const rawNumMatch = (property.auctionLink || '').match(/hdnimovel=(\d+)/) ||
                      (property.id || '').match(/auc-caixa-(\d+)/);
  const caixaNum = rawNumMatch ? rawNumMatch[1] : null;

  // Candidate photo URLs in priority order
  const candidateUrls: string[] = [];
  if (property.imageUrl) {
    candidateUrls.push(property.imageUrl);
  }
  if (caixaNum) {
    const primary = `https://venda-imoveis.caixa.gov.br/fotos/F${caixaNum}21.jpg`;
    if (!candidateUrls.includes(primary)) candidateUrls.push(primary);
    candidateUrls.push(`https://venda-imoveis.caixa.gov.br/fotos/F${caixaNum}11.jpg`);
    candidateUrls.push(`https://venda-imoveis.caixa.gov.br/fotos/F${caixaNum}01.jpg`);
  }

  const currentUrl = candidateUrls[imgErrorCount] || null;

  const handleImageError = () => {
    setImgErrorCount(prev => prev + 1);
  };

  const propType = (property.propertyType || '').toLowerCase();
  const isApt = propType.includes('apartamento') || propType.includes('apto');
  const isCasa = propType.includes('casa');
  const isTerreno = propType.includes('terreno') || propType.includes('lote');

  const dimClasses = size === 'sm'
    ? 'w-16 h-16 min-w-[64px]'
    : size === 'lg'
    ? 'w-28 h-28 sm:w-32 sm:h-32 min-w-[112px]'
    : 'w-20 h-20 sm:w-24 sm:h-24 min-w-[80px] sm:min-w-[96px]';

  return (
    <div
      className={`relative ${dimClasses} rounded-2xl overflow-hidden shrink-0 border border-slate-800 bg-slate-950 shadow-md group ${className}`}
    >
      {currentUrl ? (
        <>
          <img
            src={currentUrl}
            alt={property.title || 'Foto do imóvel'}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {!isLoaded && (
            <div className="absolute inset-0 bg-slate-900 animate-pulse flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-slate-700 animate-bounce" />
            </div>
          )}
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
        </>
      ) : (
        /* Sleek Modern Architectural Placeholder */
        <div
          className={`w-full h-full flex flex-col items-center justify-center p-1.5 text-center select-none transition-all duration-200 group-hover:border-slate-700 ${
            isApt
              ? 'bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 text-indigo-400'
              : isCasa
              ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 text-emerald-400'
              : isTerreno
              ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-950 text-amber-400'
              : 'bg-gradient-to-br from-blue-950/70 via-slate-900 to-slate-950 text-blue-400'
          }`}
        >
          {isApt ? (
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 opacity-85 group-hover:scale-110 transition-transform" />
          ) : isCasa ? (
            <Home className="w-6 h-6 sm:w-7 sm:h-7 opacity-85 group-hover:scale-110 transition-transform" />
          ) : isTerreno ? (
            <Trees className="w-6 h-6 sm:w-7 sm:h-7 opacity-85 group-hover:scale-110 transition-transform" />
          ) : (
            <Landmark className="w-6 h-6 sm:w-7 sm:h-7 opacity-85 group-hover:scale-110 transition-transform" />
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider font-mono mt-1 opacity-90 truncate max-w-full">
            {property.propertyType || 'Imóvel'}
          </span>
          <span className="text-[7.5px] text-slate-500 font-mono mt-0.5 truncate max-w-full">
            {property.sizeSqm ? `${property.sizeSqm}m²` : (property.neighborhood || '')}
          </span>
        </div>
      )}

      {/* Caixa or Edital Mini Tag */}
      {property.origin === 'caixa' && (
        <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-blue-950/90 text-blue-300 border border-blue-800/80 rounded text-[7.5px] font-mono font-bold shadow-xs">
          CAIXA
        </span>
      )}
    </div>
  );
}
