import React, { useState } from 'react';
import { User as UserType } from '../types';
import { Lock, Mail, User, ArrowRight, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: UserType) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'renew'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      let endpoint = '/api/auth/login';
      let payload: any = { email, password };

      if (mode === 'register') {
        endpoint = '/api/auth/register';
        payload = { email, password, name, accessCode: accessCode.trim().toUpperCase() };
      } else if (mode === 'renew') {
        endpoint = '/api/auth/renew-license';
        payload = { email, password, accessCode: accessCode.trim().toUpperCase() };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data: any = {};
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        if (!response.ok) {
          throw new Error(`Servidor instável ou offline (HTTP ${response.status}). Por favor, aguarde alguns instantes.`);
        }
        throw new Error('Formato de resposta inválido do servidor.');
      }

      if (!response.ok) {
        if (data.licenseExpired) {
          setMode('renew');
          throw new Error('Sua licença de 7 dias expirou. Insira o novo código de acesso enviado pela Marcus Assessoria para reativar.');
        }
        throw new Error(data.error || 'Ocorreu um erro ao processar.');
      }

      if (mode === 'renew') {
        setSuccessMessage('Licença renovada com sucesso por mais 7 dias!');
        setTimeout(() => {
          onLoginSuccess(data.token, data.user);
        }, 1200);
      } else {
        onLoginSuccess(data.token, data.user);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-emerald-600/15 blur-[140px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 mb-3 shadow-xl ring-1 ring-emerald-500/20">
            <img 
              src="/marcus_logo.png" 
              alt="Marcus Assessoria Imobiliária" 
              className="w-12 h-12 rounded-xl object-cover" 
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>Marcus Assessoria</span>
            <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Imobiliária
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Engenharia de Avaliações, Leilões & Vendas Diretas</p>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 relative overflow-hidden">
          
          {/* Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-850">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Acessar
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'register' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Criar Conta (7 Dias)
            </button>
            <button
              onClick={() => { setMode('renew'); setError(''); setSuccessMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'renew' 
                  ? 'bg-amber-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Renovar Código
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Nome Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-medium rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block pl-10 p-2.5 outline-none placeholder-slate-600"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-medium rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block pl-10 p-2.5 outline-none placeholder-slate-600"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-medium rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block pl-10 p-2.5 outline-none placeholder-slate-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Access Code Input (Required for Register and Renew) */}
            {(mode === 'register' || mode === 'renew') && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Código de Acesso (7 Dias)
                  </label>
                  <span className="text-[9.5px] text-amber-400/80 font-mono">Fornecido pela Matriz</span>
                </div>
                
                <input
                  type="text"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 block p-2.5 outline-none placeholder:text-slate-600 tracking-wider text-center"
                  placeholder="MARCUS-7D-XXXX-XXXX"
                  required
                />
                <p className="text-[10px] text-slate-400 italic">
                  💡 Este código ativa sua licença por <strong>7 dias</strong> completos. Ao término do prazo, basta solicitar um novo código de renovação.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">⚠️</span>
                <p className="leading-tight">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="leading-tight font-bold">{successMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-4 text-white font-bold rounded-xl text-xs px-5 py-3 text-center flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-md ${
                mode === 'renew' 
                  ? 'bg-amber-600 hover:bg-amber-500' 
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Entrar no Sistema'}
                    {mode === 'register' && 'Ativar e Criar Conta'}
                    {mode === 'renew' && 'Reativar Licença por 7 Dias'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-[10.5px] text-slate-500 mt-5">
          © 2026 Marcus Assessoria Imobiliária • Sistema de Avaliação & Arbitragem
        </p>
      </div>
    </div>
  );
}
