import React from 'react';
import { AuctionProperty } from '../types.ts';
import RealValueCalculator from './RealValueCalculator.tsx';
import { ChevronLeft } from 'lucide-react';

interface SimulatorProps {
  property: AuctionProperty;
  onUpdateProperty?: (updates: Partial<AuctionProperty>) => Promise<void>;
  onBack?: () => void;
  onTriggerAi?: (id: string) => Promise<void>;
  isAiAnalyzing?: boolean;
}

export default function Simulator({
  property,
  onUpdateProperty,
  onBack,
  onTriggerAi,
  isAiAnalyzing
}: SimulatorProps) {
  if (!property) return null;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
        {onBack && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <button
              onClick={onBack}
              className="px-3.5 py-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center space-x-2 text-xs font-bold border border-slate-700 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 text-indigo-400" />
              <span>Voltar para Lista de Leilões</span>
            </button>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30">
              {property.neighborhood}, {property.city} - {property.state || 'RJ'}
            </span>
          </div>
        )}

        <RealValueCalculator
          key={property.id}
          prefillData={{
            id: property.id,
            title: property.title,
            description: property.description,
            auctionLink: property.auctionLink,
            state: property.state || 'RJ',
            city: property.city,
            neighborhood: property.neighborhood,
            address: property.address,
            propertyType: property.propertyType,
            sizeSqm: property.sizeSqm,
            bedrooms: (property as any).bedrooms,
            parkingSpaces: (property as any).parkingSpaces,
            purchasePrice: property.auctionPrice,
            evaluationPrice: (property as any).evaluationPrice,
            estimatedValue: property.estimatedValue,
            acquisitionRule: property.origin === 'caixa' || (property.id && property.id.includes('caixa')) ? 'caixa' : 'leilao',
            estimatedRepair: Math.round(property.auctionPrice * 0.05),
            pendingDebts: (property as any).pendingCondoCost || Math.round(((property as any).evaluationPrice || 0) * 0.10),
            vendaBaixaPrice: property.vendaBaixaPrice,
            itbiUnitValueAvg: property.itbiUnitValueAvg,
            portalZapAvg: property.portalZapAvg,
            portalQuintoAndarAvg: property.portalQuintoAndarAvg,
          }}
          onUpdateProperty={onUpdateProperty}
          onClose={onBack}
        />
      </div>
    </div>
  );
}
