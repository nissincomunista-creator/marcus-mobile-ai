import React, { useState, useEffect } from 'react';
import { VoiceCopilot } from './components/VoiceCopilot';
import { MobileCalculator } from './components/MobileCalculator';
import { MobileRadar } from './components/MobileRadar';
import { MobileItbi } from './components/MobileItbi';
import { BottomNav } from './components/BottomNav';
import { QrCodeModal } from './components/QrCodeModal';
import { LoginScreen } from './components/LoginScreen';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { CalculatorState, AuctionProperty, ItbiTransaction } from './types';
import { voiceService } from './services/voiceService';
import { authService, UserSession } from './services/authService';

export function App() {
  const [session, setSession] = useState<UserSession | null>(() => authService.getCurrentSession());
  const [activeTab, setActiveTab] = useState<'copilot' | 'radar' | 'calculator' | 'itbi'>('copilot');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [auctions, setAuctions] = useState<AuctionProperty[]>([]);
  const [itbiTransactions, setItbiTransactions] = useState<ItbiTransaction[]>([]);
  const [selectedCityFilter, setSelectedCityFilter] = useState('');
  const [sortBy, setSortBy] = useState('profit');

  // Calculator State
  const [calculator, setCalculator] = useState<CalculatorState>({
    city: 'Niterói',
    state: 'RJ',
    neighborhood: 'Icaraí',
    propertyType: 'Apartamento',
    sizeSqm: 75,
    auctionPrice: 195000,
    estimatedRepair: 15000,
    itbiRate: 3,
    registryRate: 2.5,
    evictionCost: 6000,
    auctioneerFeePercent: 0,
    marketValueItbi: 671250,
    itbiSqm: 8950,
    totalAcquisitionCost: 226725,
    netProfit: 444525,
    roiPercent: 196
  });

  // Load Database on Startup
  useEffect(() => {
    if (!session) return;

    fetch('/api/auctions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAuctions(data);
      })
      .catch((err) => console.error('Error fetching auctions:', err));

    fetch('/api/itbi')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItbiTransactions(data);
      })
      .catch((err) => console.error('Error fetching itbi:', err));
  }, [session]);

  // Recalculate calculator metrics on change or when ITBI is matched
  const handleUpdateCalculator = (newCalc: Partial<CalculatorState>) => {
    setCalculator((prev) => {
      const merged = { ...prev, ...newCalc };

      // Find neighborhood average in ITBI base
      let matchedSqm = merged.itbiSqm || 5000;
      if (itbiTransactions.length > 0) {
        const matches = itbiTransactions.filter(
          (t) =>
            t.city.toLowerCase() === merged.city.toLowerCase() &&
            t.neighborhood.toLowerCase().includes(merged.neighborhood.toLowerCase().trim())
        );
        if (matches.length > 0) {
          const total = matches.reduce((sum, m) => sum + (m.unitValueSqm || 0), 0);
          matchedSqm = Math.round(total / matches.length);
        } else {
          // City fallback
          const cityMatches = itbiTransactions.filter(
            (t) => t.city.toLowerCase() === merged.city.toLowerCase()
          );
          if (cityMatches.length > 0) {
            matchedSqm = Math.round(
              cityMatches.reduce((sum, m) => sum + (m.unitValueSqm || 0), 0) / cityMatches.length
            );
          }
        }
      }

      const marketValue = Math.round(merged.sizeSqm * matchedSqm);
      const itbiCost = Math.round(merged.auctionPrice * (merged.itbiRate / 100));
      const registryCost = Math.round(merged.auctionPrice * (merged.registryRate / 100));
      const totalCost = Math.round(
        merged.auctionPrice +
          itbiCost +
          registryCost +
          merged.estimatedRepair +
          merged.evictionCost
      );
      const netProfit = Math.round(marketValue - totalCost);
      const roi = totalCost > 0 ? Math.round((netProfit / totalCost) * 100) : 0;

      return {
        ...merged,
        itbiSqm: matchedSqm,
        marketValueItbi: marketValue,
        totalAcquisitionCost: totalCost,
        netProfit,
        roiPercent: roi
      };
    });
  };

  // Transfer Auction to Calculator
  const handleAuditInCalculator = (auc: AuctionProperty) => {
    handleUpdateCalculator({
      city: auc.city || 'Rio de Janeiro',
      state: auc.state || 'RJ',
      neighborhood: auc.neighborhood || 'Centro',
      propertyType: auc.propertyType || 'Apartamento',
      sizeSqm: auc.sizeSqm || 65,
      auctionPrice: auc.auctionPrice || 150000,
      estimatedRepair: auc.estimatedRepair || Math.round(auc.sizeSqm * 180),
      evictionCost: 6000,
      itbiRate: auc.state === 'MG' ? 2 : 3,
      itbiSqm: auc.itbiUnitValueAvg || 5000,
      marketValueItbi: auc.estimatedValue || 350000,
      lastUpdatedByVoice: false
    });
    setActiveTab('calculator');
  };

  // Ask Voice about current Calculator
  const handleAskVoiceAboutCurrent = () => {
    setActiveTab('copilot');
    const prompt = `Analise este imóvel em ${calculator.neighborhood}, ${calculator.city} de ${calculator.sizeSqm}m² com lance de R$ ${calculator.auctionPrice.toLocaleString('pt-BR')}. O valor de mercado pelo ITBI é R$ ${calculator.marketValueItbi.toLocaleString('pt-BR')} gerando lucro de R$ ${calculator.netProfit.toLocaleString('pt-BR')} e ROI de ${calculator.roiPercent}%. Vale a pena arrematar?`;
    voiceService.speak('Analisando os dados da calculadora com a base oficial de ITBI...');
  };

  const handleLogout = () => {
    authService.logout();
    setSession(null);
  };

  // Show Login Screen if no active session
  if (!session) {
    return <LoginScreen onLoginSuccess={(sess) => setSession(sess)} />;
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* PWA Direct Install Top Banner */}
      <PwaInstallBanner />

      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-slate-950 text-xs shadow-md">
            M
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-xs font-bold text-slate-100 tracking-tight leading-none">
                Marcus Assessoria
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[9px] font-mono text-amber-400">
              {session.name} ({session.role === 'admin' ? 'Master' : 'VIP'})
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-[10px] font-bold text-amber-300 border border-slate-700 transition-all cursor-pointer flex items-center space-x-1"
            title="Compartilhar Acesso / QR Code"
          >
            <span>🔗 Conectar</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-[10px] font-medium text-slate-400 hover:text-rose-300 border border-slate-800 transition-all cursor-pointer"
            title="Sair da conta"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 overflow-x-hidden pb-16">
        {activeTab === 'copilot' && (
          <VoiceCopilot
            calculator={calculator}
            onUpdateCalculator={handleUpdateCalculator}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onFilterRadar={({ city, sortBy: sort }) => {
              if (city !== undefined) setSelectedCityFilter(city);
              if (sort !== undefined) setSortBy(sort);
              setActiveTab('radar');
            }}
          />
        )}

        {activeTab === 'radar' && (
          <MobileRadar
            auctions={auctions}
            onAuditInCalculator={handleAuditInCalculator}
            selectedCityFilter={selectedCityFilter}
            onCityFilterChange={(c) => setSelectedCityFilter(c)}
            sortBy={sortBy}
            onSortByChange={(s) => setSortBy(s)}
          />
        )}

        {activeTab === 'calculator' && (
          <MobileCalculator
            calculator={calculator}
            onChange={handleUpdateCalculator}
            onAskVoiceAboutCurrent={handleAskVoiceAboutCurrent}
          />
        )}

        {activeTab === 'itbi' && (
          <MobileItbi
            itbiTransactions={itbiTransactions}
            onSelectForCalculator={(tx) => {
              handleUpdateCalculator({
                city: tx.city,
                state: tx.state,
                neighborhood: tx.neighborhood,
                itbiSqm: tx.unitValueSqm
              });
              setActiveTab('calculator');
            }}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      {/* QR Code Modal */}
      <QrCodeModal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} />
    </div>
  );
}
