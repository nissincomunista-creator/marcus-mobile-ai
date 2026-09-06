import React, { useState, useEffect } from 'react';
import { AuctionProperty, ItbiTransaction, PropertyType, BRAZIL_STATES, User as UserType, AccessCode } from './types.ts';
import Dashboard from './components/Dashboard.tsx';
import ItbiManager from './components/ItbiManager.tsx';
import Simulator from './components/Simulator.tsx';
import AiReporter from './components/AiReporter.tsx';
import PropertyMap from './components/PropertyMap.tsx';
import ChatAssistant from './components/ChatAssistant.tsx';
import Profile from './components/Profile.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import RealValueCalculator from './components/RealValueCalculator.tsx';
import LinkAnalyzerModal from './components/LinkAnalyzerModal.tsx';
import { 
  Building2, 
  Database, 
  HelpCircle, 
  Clock, 
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  MapPin,
  User,
  LogOut,
  Trash2,
  Calculator,
  Laptop,
  Server,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  UserPlus,
  Send,
  X,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InstallAppModal from './components/InstallAppModal.tsx';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 sm:p-8 text-white space-y-4 my-6 shadow-xl">
          <div className="flex items-center space-x-3 text-rose-400">
            <AlertTriangle className="w-7 h-7 shrink-0 text-rose-400" />
            <h3 className="text-lg font-bold">
              {this.props.fallbackTitle || 'Ocorreu um erro ao carregar esta seção'}
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            {this.state.error?.message || 'Erro inesperado na renderização do componente.'}
          </p>
          {this.state.error?.stack && (
            <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-rose-300/80 overflow-x-auto border border-slate-800">
              {this.state.error.stack}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserType | null>(null);

  const [activeTab, setActiveTab] = useState<'garimpo' | 'calculadora' | 'itbi' | 'mapa' | 'perfil'>('garimpo');
  const [auctions, setAuctions] = useState<AuctionProperty[]>([]);
  const [itbiStats, setItbiStats] = useState<any[]>([]);
  const [itbiCount, setItbiCount] = useState<number>(0);
  const [isMining, setIsMining] = useState(false);
  
  // Selected auction context tracker
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  
  // Filter and Sorting state passed to Dashboard
  const [selectedNeighborhoodFilter, setSelectedNeighborhoodFilter] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [sortBy, setSortBy] = useState('roi');
  const [selectedOriginFilter, setSelectedOriginFilter] = useState<'caixa' | 'judicial' | 'extrajudicial' | 'portal'>('caixa');

  // Modal toggle state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isAnalyzingLink, setIsAnalyzingLink] = useState(false);
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [hostInfo, setHostInfo] = useState<{
    hostName: string;
    localIp: string;
    port: number;
    localUrl: string;
    networkUrl: string;
    allIps: string[];
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Partial<AuctionProperty> | null>(null);

  // Access Codes / client license states
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState<string | null>(null);
  const [selectedLicenseDuration, setSelectedLicenseDuration] = useState<number>(7);

  // Mobile App Install Modal & PWA Prompt
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Async loaders
  const [isLoading, setIsLoading] = useState(true);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  // Time stamp state
  const [currentTime, setCurrentTime] = useState('2026-05-22 15:10:00');

  // Custom fetch with auth header
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };

  // Helper to safely extract error message from API response without crashing on non-JSON bodies
  const getErrorMessage = async (response: Response, defaultMsg: string) => {
    try {
      const text = await response.text();
      const parsed = text ? JSON.parse(text) : {};
      return parsed.error || defaultMsg;
    } catch (e) {
      return `${defaultMsg} (Status: ${response.status})`;
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  // Load backend stores on startup
  useEffect(() => {
    async function fetchData() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setRpcError(null);
      try {
        // Auto login check
        const meRes = await authFetch('/api/auth/me');
        if (!meRes.ok) {
          handleLogout();
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const [aucRes, itbiRes] = await Promise.all([
          authFetch('/api/auctions'),
          authFetch('/api/itbi')
        ]);

        if (!aucRes.ok || !itbiRes.ok) {
          throw new Error('Falha ao comunicar com os servidores de garimpo.');
        }

        const aucData = await aucRes.json();
        const itbiData = await itbiRes.json();

        setAuctions(aucData);
        setItbiStats(itbiData.stats || []);
        setItbiCount(itbiData.totalCount || 0);

        try {
          const hostRes = await fetch('/api/network/host-info');
          if (hostRes.ok) {
            const hData = await hostRes.json();
            setHostInfo(hData);
          }
        } catch (hErr) {
          console.error('Host info error:', hErr);
        }

        // Fetch licenses / access codes if logged in
        try {
          const licRes = await authFetch('/api/admin/licenses');
          if (licRes.ok) {
            const licData = await licRes.json();
            setAccessCodes(licData || []);
          }
        } catch (lErr) {
          console.error('Licenses fetch error:', lErr);
        }

      } catch (e: any) {
        console.error('Error fetching data on app load:', e);
        setRpcError(e.message || 'Erro de conexão com o painel fullstack.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();

    // Minor clock update relative to user timezone
    const timer = setInterval(() => {
      const now = new Date();
      const formatStr = now.toISOString().replace('T', ' ').substring(0, 19);
      setCurrentTime(formatStr);
    }, 1000);
    return () => clearInterval(timer);
  }, [token]);

  const fetchAccessCodes = async () => {
    try {
      const res = await authFetch('/api/admin/licenses');
      if (res.ok) {
        const data = await res.json();
        setAccessCodes(data || []);
      }
    } catch (e) {
      console.error('Failed to load access codes:', e);
    }
  };

  const handleGenerateAccessCode = async () => {
    setIsGeneratingCode(true);
    try {
      const days = selectedLicenseDuration;
      const durationLabel = days === 9999 ? 'Acesso Permanente / Vitalício' : `${days} dias`;
      const res = await authFetch('/api/admin/licenses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationDays: days,
          notes: `Licença de ${durationLabel} para Cliente`
        })
      });
      if (res.ok) {
        await fetchAccessCodes();
      } else {
        alert('Erro ao gerar código de acesso.');
      }
    } catch (e: any) {
      alert('Erro: ' + e.message);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleSyncCaixaAuto = async () => {
    setIsMining(true);
    try {
      const res = await authFetch('/api/garimpar/caixa-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ states: ['RJ', 'SP', 'MG'] })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Varredura automática da Caixa concluída com sucesso!');
        await refreshMarketData();
        setSelectedOriginFilter('caixa_radar');
      } else {
        alert('Aviso: ' + (data.error || 'Erro ao sincronizar imóveis Caixa.'));
      }
    } catch (e: any) {
      alert('Erro na sincronização: ' + e.message);
    } finally {
      setIsMining(false);
    }
  };

  const handleDeleteAccessCode = async (id: string) => {
    if (!confirm('Deseja realmente revogar e excluir este código de acesso?')) return;
    try {
      const res = await authFetch(`/api/admin/licenses/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchAccessCodes();
      }
    } catch (e: any) {
      alert('Erro ao excluir código: ' + e.message);
    }
  };

  const handleCopyInviteMessage = (code: string) => {
    const inviteText = `Olá! Segue seu acesso exclusivo ao sistema Marcus Assessoria Imobiliária:\n\n1. Abra o programa no seu computador.\n2. Na tela de início, clique em "Criar Conta (7 Dias)".\n3. Preencha seu Nome, E-mail, Senha e insira seu Código de Acesso:\n👉 ${code}\n\nSeu acesso ficará ativo por 7 dias completos com todas as ferramentas de avaliação, relatórios e dados de mercado!`;
    navigator.clipboard.writeText(inviteText);
    setCopiedInviteCode(code);
    setTimeout(() => setCopiedInviteCode(null), 3000);
  };

  const refreshMarketData = async () => {
    setIsLoading(true);
    try {
      const [aucRes, itbiRes] = await Promise.all([
        authFetch('/api/auctions'),
        authFetch('/api/itbi')
      ]);
      if (aucRes.ok && itbiRes.ok) {
        setAuctions(await aucRes.json());
        const itbiData = await itbiRes.json();
        setItbiStats(itbiData.stats || []);
        setItbiCount(itbiData.totalCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGarimparJudiciais = async (city?: string) => {
    setIsMining(true);
    try {
      const response = await authFetch('/api/garimpar/judiciais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: selectedStateFilter, city })
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Erro ao realizar garimpo de leilões judiciais.');
        throw new Error(errorMsg);
      }

      const resObj = await response.json();
      alert(resObj.message);
      await refreshMarketData();
      setSelectedOriginFilter('judicial');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsMining(false);
    }
  };

  const handleGarimparCaixa = async (city?: string) => {
    setIsMining(true);
    try {
      const response = await authFetch('/api/garimpar/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: selectedStateFilter, city })
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Erro ao garimpar imóveis da Caixa.');
        throw new Error(errorMsg);
      }

      const resObj = await response.json();
      alert(resObj.message);
      await refreshMarketData();
      setSelectedOriginFilter('caixa');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsMining(false);
    }
  };

  const handleGarimparPortais = async (city?: string) => {
    setIsMining(true);
    try {
      const response = await authFetch('/api/garimpar/portais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: selectedStateFilter, city })
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Erro ao realizar garimpo nos portais ZapImóveis / QuintoAndar.');
        throw new Error(errorMsg);
      }

      const resObj = await response.json();
      alert(resObj.message);
      await refreshMarketData();
      setSelectedOriginFilter('portal');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsMining(false);
    }
  };

  // Add/Update auctions dispatchers
  const handleSaveAuction = async (propertyData: Partial<AuctionProperty>) => {
    const isEdit = !!propertyData.id;
    const url = isEdit ? `/api/auctions/${propertyData.id}` : '/api/auctions';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData)
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Erro ao persistir leilão.');
        throw new Error(errorMsg);
      }

      await refreshMarketData();
      setIsAddModalOpen(false);
      setEditingAuction(null);
    } catch (err: any) {
      alert('Aviso: ' + err.message);
    }
  };

  const handleAnalyzeLink = async (
    url: string,
    origin: 'auto' | 'judicial' | 'extrajudicial',
    sizeSqmOverride?: number,
    neighborhoodOverride?: string
  ) => {
    setIsAnalyzingLink(true);
    try {
      const response = await authFetch('/api/auctions/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          origin,
          sizeSqmOverride,
          neighborhoodOverride
        })
      });

      if (!response.ok) {
        let errMsg = `Erro no servidor (Status ${response.status})`;
        try {
          const errObj = await response.json();
          errMsg = errObj.error || errMsg;
        } catch (e) {
          try {
            const text = await response.text();
            if (text && text.length < 200) errMsg = text;
          } catch (textErr) {}
        }
        throw new Error(errMsg);
      }

      const newProperty = await response.json();
      
      // Update local state
      setAuctions(prev => [newProperty, ...prev]);
      
      // Select the new property and filter to match
      setSelectedOriginFilter(newProperty.origin || 'judicial');
      setSelectedAuctionId(newProperty.id);
      
      alert('Imóvel analisado e cadastrado com sucesso!');
    } catch (e: any) {
      console.error(e);
      throw e;
    } finally {
      setIsAnalyzingLink(false);
    }
  };

  const handleUpdatePropertyDirectly = async (updates: Partial<AuctionProperty>) => {
    if (!updates.id) return;
    try {
      const response = await authFetch(`/api/auctions/${updates.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Falha ao sincronizar simulação.');
      
      // Fast updates locally
      const data = await response.json();
      setAuctions(prev => prev.map(a => a.id === updates.id ? data : a));
    } catch (e: any) {
      alert('Erro ao atualizar valores da simulação: ' + e.message);
    }
  };

  const handleDeleteAuction = async (id: string) => {
    try {
      const response = await authFetch(`/api/auctions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Não foi possível excluir o lote.');
      if (selectedAuctionId === id) setSelectedAuctionId(null);
      await refreshMarketData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleClearAllAuctions = async () => {
    if (!confirm('Tem certeza de que deseja zerar todos os imóveis garimpados e começar do zero?')) {
      return;
    }
    try {
      const response = await authFetch('/api/auctions', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Não foi possível limpar a base de leilões.');
        throw new Error(errorMsg);
      }
      
      setSelectedNeighborhoodFilter('');
      setSelectedCityFilter('');
      setSelectedTypeFilter('');
      setSelectedStateFilter('');
      setMaxPriceFilter('');
      setPaymentFilter('');
      setSortBy('roi');
      setSelectedAuctionId(null);
      await refreshMarketData();
    } catch (e: any) {
      alert('Erro ao zerar imóveis: ' + e.message);
    }
  };

  // Single ITBI insertion
  const handleAddItbiTransaction = async (txData: any) => {
    try {
      const response = await authFetch('/api/itbi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData)
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Erro ao cadastrar ITBI.');
        throw new Error(errorMsg);
      }

      await refreshMarketData();
      return true;
    } catch (e: any) {
      alert('Erro ao cadastrar ITBI: ' + e.message);
      return false;
    }
  };

  // Batch CSV operations
  const handleBatchItbiTransactions = async (items: any[]) => {
    try {
      const response = await authFetch('/api/itbi/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: items.length, items })
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Erro de processamento de lote.');
        throw new Error(errorMsg);
      }

      const resObj = await response.json();
      await refreshMarketData();
      return resObj.count;
    } catch (e: any) {
      alert('Erro de processamento de lote: ' + e.message);
      throw e;
    }
  };

  const handleDeleteItbiTransaction = async (id: string) => {
    try {
      const response = await authFetch(`/api/itbi/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await refreshMarketData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllItbi = async () => {
    try {
      const response = await authFetch('/api/itbi', { method: 'DELETE' });
      if (response.ok) {
        await refreshMarketData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Gemini detailed report analysis on selected property
  const handleTriggerAiReport = async (id: string) => {
    setIsAiAnalyzing(true);
    try {
      const response = await authFetch(`/api/auctions/${id}/analyze`, {
        method: 'POST'
      });

      if (!response.ok) {
        let errorMsg = 'Falha de processamento.';
        try {
          const errObj = await response.json();
          errorMsg = errObj.error || errorMsg;
        } catch (e) {
          try {
            const text = await response.text();
            if (text) errorMsg = text;
          } catch (textErr) {}
        }
        throw new Error(errorMsg);
      }

      const updatedAuc = await response.json();
      setAuctions(prev => prev.map(a => a.id === id ? updatedAuc : a));
    } catch (e: any) {
      alert('Aviso da IA: ' + e.message);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Safe unique array list helper
  const uniqueNeighborhoods = Array.from(new Set(itbiStats.map(tx => tx.neighborhood)));

  // Identify active selected listing object for Simulator pane
  const activeSelectedAuction = auctions.find(a => a.id === selectedAuctionId);

  if (!token) {
    return (
      <LoginPage onLoginSuccess={(newToken, newUser) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
      }} />
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans flex flex-col justify-between">
      
      {/* 1. Header Toolbar (Navigation & Logo) */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
          
          {/* Logo & Clock details */}
          <div className="flex items-center space-x-3 cursor-pointer justify-start" onClick={() => setSelectedAuctionId(null)}>
            <img 
              src="/marcus_logo.png" 
              alt="Marcus Assessoria Imobiliária" 
              className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40 shadow-md ring-1 ring-emerald-500/20" 
            />
            <div>
              <h1 className="text-base font-black text-slate-100 tracking-tight flex items-center gap-2">
                <span>Marcus</span>
                <span className="text-[10px] text-emerald-400 font-bold font-mono tracking-normal bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Assessoria Imobiliária
                </span>
              </h1>
              <span className="text-[10px] text-slate-400 font-medium font-mono flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>UTC: {currentTime}</span>
              </span>
            </div>
          </div>
             {/* Right: All tabs grouped in a responsive flex-wrap row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="tab-garimpo"
              onClick={() => {
                setActiveTab('garimpo');
                setSelectedAuctionId(null); // Back to listings
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs border ${
                activeTab === 'garimpo'
                  ? 'bg-indigo-650 text-white border-indigo-650 shadow-md'
                  : 'bg-slate-800 text-slate-350 border-slate-700 hover:bg-slate-700 hover:text-slate-100'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeTab === 'garimpo' ? 'text-white' : 'text-slate-400'}`} />
              <span>Garimpar Leilões</span>
            </button>
 
            <button
              id="tab-calculadora"
              onClick={() => {
                setActiveTab('calculadora');
                setSelectedAuctionId(null);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs border ${
                activeTab === 'calculadora'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-slate-800 text-slate-355 border-slate-700 hover:bg-slate-700 hover:text-slate-100'
              }`}
            >
              <Calculator className={`w-3.5 h-3.5 ${activeTab === 'calculadora' ? 'text-white' : 'text-slate-400'}`} />
              <span>Calculadora Valor Real</span>
            </button>
 
            <button
              id="tab-itbi"
              onClick={() => {
                setActiveTab('itbi');
                setSelectedAuctionId(null);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs border ${
                activeTab === 'itbi'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-slate-800 text-slate-350 border-slate-700 hover:bg-slate-700 hover:text-slate-100'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${activeTab === 'itbi' ? 'text-white' : 'text-slate-400'}`} />
              <span>Base ITBI Municipal</span>
            </button>

            <button
              id="tab-mapa"
              onClick={() => {
                setActiveTab('mapa');
                setSelectedAuctionId(null);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs border ${
                activeTab === 'mapa'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-slate-800 text-slate-350 border-slate-700 hover:bg-slate-700 hover:text-slate-100'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${activeTab === 'mapa' ? 'text-white' : 'text-slate-400'}`} />
              <span>Mapa de Oportunidades</span>
            </button>
 
            <button
              id="tab-perfil"
              onClick={() => {
                setActiveTab('perfil');
                setSelectedAuctionId(null);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs border ${
                activeTab === 'perfil'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                  : 'bg-slate-800 text-slate-350 border-slate-700 hover:bg-slate-700 hover:text-slate-100'
              }`}
            >
              <User className={`w-3.5 h-3.5 ${activeTab === 'perfil' ? 'text-white' : 'text-slate-400'}`} />
              <span>Perfil</span>
            </button>

            {/* Mobile App Install Button */}
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600/25 to-teal-600/25 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/35 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Instalar aplicativo no celular ou escanear QR Code"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>📱 Baixar no Celular</span>
            </button>

            {/* Server / Matrix Mode Trigger: ONLY for Admin */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setIsHostModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-amber-300 border border-amber-500/30 hover:bg-amber-950/30 hover:border-amber-500/50 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="Central da Matriz - Gerenciar Licenças e Conectar PC"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Painel Matriz</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>
            )}
 
            <div className="h-6 w-px bg-slate-855 mx-1 hidden sm:block"></div>
 
            <button
              onClick={handleLogout}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:bg-rose-950/20 hover:text-rose-450 transition-all flex items-center space-x-1.5 cursor-pointer border border-transparent hover:border-rose-900/30"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

        </div>
      </header>

      {/* MODAL: MODO SERVIDOR & COMPARTILHAMENTO DE ACESSO */}
      <AnimatePresence>
        {isHostModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                      <span>Central de Licenças & Acesso de Clientes</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Matriz Ativa
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gere códigos de acesso de 7 dias para novos clientes e gerencie quem pode acessar o sistema.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHostModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SEÇÃO 1: GERENCIADOR DE CÓDIGOS DE ACESSO (7 DIAS) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-850">
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-300 font-mono tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Gerador de Códigos de Acesso & Licenças
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Selecione a validade e gere o código de ativação para enviar ao cliente.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-750 px-2.5 py-1.5 rounded-xl">
                      <span className="text-[11px] text-slate-400 font-bold">Validade:</span>
                      <select
                        value={selectedLicenseDuration}
                        onChange={(e) => setSelectedLicenseDuration(Number(e.target.value))}
                        className="bg-transparent text-xs font-bold text-amber-400 outline-none cursor-pointer"
                      >
                        <option value={7} className="bg-slate-900 text-white">7 Dias (Degustação)</option>
                        <option value={15} className="bg-slate-900 text-white">15 Dias (2 Semanas)</option>
                        <option value={30} className="bg-slate-900 text-white">30 Dias (1 Mês)</option>
                        <option value={60} className="bg-slate-900 text-white">60 Dias (2 Meses)</option>
                        <option value={90} className="bg-slate-900 text-white">90 Dias (3 Meses)</option>
                        <option value={180} className="bg-slate-900 text-white">180 Dias (6 Meses)</option>
                        <option value={365} className="bg-slate-900 text-white">365 Dias (1 Ano)</option>
                        <option value={9999} className="bg-slate-900 text-amber-400 font-bold">Vitalício / Permanente</option>
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateAccessCode}
                      disabled={isGeneratingCode}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isGeneratingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      <span>+ Gerar Código ({selectedLicenseDuration === 9999 ? 'Vitalício' : `${selectedLicenseDuration}d`})</span>
                    </button>
                  </div>
                </div>

                {/* Tabela de Códigos */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {accessCodes.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs font-mono">
                      Nenhum código gerado ainda. Clique no botão acima para criar o primeiro código de 7 dias!
                    </div>
                  ) : (
                    accessCodes.map((code) => {
                      const isUsed = code.used;
                      const isExpired = code.expiresAt < Date.now();
                      const daysLeft = Math.max(0, Math.ceil((code.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));

                      return (
                        <div 
                          key={code.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                            isUsed
                              ? 'bg-slate-900/60 border-slate-800'
                              : isExpired
                                ? 'bg-rose-950/20 border-rose-900/40 opacity-70'
                                : 'bg-slate-900 border-amber-500/30 shadow-xs'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-white tracking-wider bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                                {code.code}
                              </span>
                              
                              {isUsed ? (
                                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                                  Ativado por: {code.usedBy?.name || code.usedBy?.email || 'Cliente'}
                                </span>
                              ) : isExpired ? (
                                <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                  Expirado
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Disponível para Envio
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-slate-400 font-mono">
                              Criado em: {new Date(code.createdAt).toLocaleDateString('pt-BR')} • {isUsed ? `Ativado em ${new Date(code.usedBy?.activatedAt || 0).toLocaleDateString('pt-BR')}` : `Expira ativação em ${daysLeft} dias`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => handleCopyInviteMessage(code.code)}
                              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Copiar mensagem pronta com instruções para enviar no WhatsApp ou E-mail do cliente"
                            >
                              {copiedInviteCode === code.code ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Mensagem Copiada!</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Copiar Convite</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteAccessCode(code.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Revogar / Excluir Código"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SEÇÃO 2: HOSPEDAGEM & CONEXÃO NA REDE (WI-FI / LOCAL) */}
              <div className="space-y-4 text-xs">
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-3">
                  <span className="font-bold text-indigo-300 font-mono uppercase text-[10px] block">
                    Conectar Outro Computador ou Celular (Mesmo Wi-Fi / Rede Local):
                  </span>
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5">
                    <span className="font-mono text-white text-xs font-bold truncate">
                      {hostInfo?.networkUrl || 'http://localhost:3000'}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(hostInfo?.networkUrl || 'http://localhost:3000');
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2500);
                      }}
                      className="ml-2 px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg font-mono font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Basta abrir esse endereço no navegador do outro computador. Ele criará o login com o <strong>Código de 7 Dias</strong> gerado acima e terá acesso total em tempo real!
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsHostModalOpen(false)}
                  className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Fechar Central
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Content Board */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex-1 w-full">
        
        {/* RPC Server connection failure alert banner */}
        {rpcError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex items-center space-x-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="font-bold">Falha na central fullstack</p>
              <p className="text-rose-600 mt-0.5">{rpcError}. Verifique as variáveis de ambiente ou reinicie o servidor de desenvolvimento.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          /* Loading skeleton loader */
          <div className="space-y-6 py-12 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-xs font-semibold uppercase tracking-wider">Garimpando e cruzando matrículas de leilão...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* TAB CONTENT: Opportunities Finder */}
            {activeTab === 'garimpo' && (
              <motion.div
                key="garimpo-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {!activeSelectedAuction ? (
                  <Dashboard
                    auctions={auctions}
                    selectedAuctionId={selectedAuctionId}
                    onSelectAuction={(id) => setSelectedAuctionId(id)}
                    onDeleteAuction={handleDeleteAuction}
                    onOpenAddModal={() => {}}
                    selectedNeighborhoodFilter={selectedNeighborhoodFilter}
                    setSelectedNeighborhoodFilter={setSelectedNeighborhoodFilter}
                    selectedCityFilter={selectedCityFilter}
                    setSelectedCityFilter={setSelectedCityFilter}
                    selectedTypeFilter={selectedTypeFilter}
                    setSelectedTypeFilter={setSelectedTypeFilter}
                    selectedStateFilter={selectedStateFilter}
                    setSelectedStateFilter={setSelectedStateFilter}
                    maxPriceFilter={maxPriceFilter}
                    setMaxPriceFilter={setMaxPriceFilter}
                    paymentFilter={paymentFilter}
                    setPaymentFilter={setPaymentFilter}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    onGarimparJudiciais={handleGarimparJudiciais}
                    onGarimparCaixa={handleGarimparCaixa}
                    onGarimparPortais={handleGarimparPortais}
                    onSyncCaixaAuto={handleSyncCaixaAuto}
                    isMining={isMining}
                    itbiCount={itbiCount}
                    onUpdateProperty={handleUpdatePropertyDirectly}
                    onViewMap={() => setActiveTab('mapa')}
                    selectedOriginFilter={selectedOriginFilter}
                    setSelectedOriginFilter={setSelectedOriginFilter}
                    onOpenLinkModal={() => setIsLinkModalOpen(true)}
                    itbiStats={itbiStats}
                    onClearAll={handleClearAllAuctions}
                  />
                ) : (
                  /* Single Detail focused Split Pane view (Simulator on top, AI reporter below) */
                  <div className="space-y-6">
                    <Simulator
                      property={activeSelectedAuction}
                      onUpdateProperty={handleSaveAuction}
                      onBack={() => setSelectedAuctionId(null)}
                      onTriggerAi={handleTriggerAiReport}
                      isAiAnalyzing={isAiAnalyzing}
                    />

                    <AiReporter
                      property={activeSelectedAuction}
                      isGenerating={isAiAnalyzing}
                      onRunAnalysis={() => handleTriggerAiReport(activeSelectedAuction.id)}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB CONTENT: Profile (Perfil) */}
            {activeTab === 'perfil' && (
              <motion.div
                key="perfil-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Profile 
                  auctions={auctions}
                  onUpdateProperty={handleUpdatePropertyDirectly}
                  onSelectAuction={(id) => {
                    setSelectedAuctionId(id);
                    setActiveTab('garimpo');
                  }}
                />
              </motion.div>
            )}

            {/* TAB CONTENT: Real Value Calculator */}
            {activeTab === 'calculadora' && (
              <motion.div
                key="calculadora-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <ErrorBoundary fallbackTitle="Erro na Calculadora de Valor Real">
                  <RealValueCalculator
                    itbiStats={itbiStats}
                  />
                </ErrorBoundary>
              </motion.div>
            )}

            {/* TAB CONTENT: ITBI Registry database manager */}
            {activeTab === 'itbi' && (
              <motion.div
                key="itbi-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <ItbiManager
                  itbiStats={itbiStats}
                  itbiCount={itbiCount}
                  onAddTransaction={handleAddItbiTransaction}
                  onBatchTransactions={handleBatchItbiTransactions}
                  onDeleteTransaction={handleDeleteItbiTransaction}
                  onClearAllTransactions={handleClearAllItbi}
                />
              </motion.div>
            )}

            {/* TAB CONTENT: Map Satellite Georeferencer */}
            {activeTab === 'mapa' && (
              <motion.div
                key="mapa-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <PropertyMap
                  auctions={auctions}
                  onSelectPropertyFromMap={(id) => {
                    setSelectedAuctionId(id);
                    setActiveTab('garimpo');
                  }}
                />
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </main>

      {/* 3. Footer credits */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <p>© 2026 Garimpeiro de Leilões - Decisões Inteligentes baseadas no ITBI Real Municipal.</p>
          <div className="flex justify-center space-x-3.5 text-slate-500">
            <span>Privacidade</span>
            <span>•</span>
            <span>Manual do Investidor</span>
          </div>
        </div>
      </footer>

      {/* Modal: Link Analyzer */}
      <AnimatePresence>
        {isLinkModalOpen && (
          <LinkAnalyzerModal
            isOpen={isLinkModalOpen}
            onClose={() => setIsLinkModalOpen(false)}
            onAnalyze={handleAnalyzeLink}
            isAnalyzing={isAnalyzingLink}
          />
        )}
      </AnimatePresence>

      {/* 5. AI Chat Assistant Widget */}
      <ChatAssistant auctions={auctions} selectedAuctionId={selectedAuctionId} />

      {/* 6. Mobile App Install Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />
    </div>
  );
}
