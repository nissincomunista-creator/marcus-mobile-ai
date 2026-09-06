import React from 'react';
import { Mic, Calculator, Sparkles, Building, QrCode } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'copilot' | 'radar' | 'calculator' | 'itbi';
  onTabChange: (tab: 'copilot' | 'radar' | 'calculator' | 'itbi') => void;
  onOpenQrModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, onOpenQrModal }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#090d16]/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 safe-area-pb">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {/* Radar Tab */}
        <button
          onClick={() => onTabChange('radar')}
          className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'radar' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">Radar Caixa</span>
        </button>

        {/* Center Floating Copilot AI Voice Button */}
        <div className="relative -top-5">
          <button
            onClick={() => onTabChange('copilot')}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer ${
              activeTab === 'copilot'
                ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 text-slate-950 ring-4 ring-amber-400/40 shadow-amber-500/50 scale-105'
                : 'bg-gradient-to-tr from-slate-800 to-slate-900 text-amber-400 border border-amber-500/40 shadow-black'
            }`}
          >
            <Mic className="w-6 h-6" />
          </button>
        </div>

        {/* Calculator Tab */}
        <button
          onClick={() => onTabChange('calculator')}
          className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'calculator' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px]">Calculadora</span>
        </button>

        {/* ITBI Tab */}
        <button
          onClick={() => onTabChange('itbi')}
          className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'itbi' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-5 h-5" />
          <span className="text-[10px]">Base ITBI</span>
        </button>

        {/* QR Code Connect Mobile Button */}
        <button
          onClick={onOpenQrModal}
          className="flex flex-col items-center space-y-1 py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          title="Conectar Celular via QR Code"
        >
          <QrCode className="w-5 h-5 text-slate-400" />
          <span className="text-[10px]">Conectar</span>
        </button>
      </div>
    </div>
  );
};
