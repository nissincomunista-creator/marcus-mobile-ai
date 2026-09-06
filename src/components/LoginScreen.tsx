import React, { useState } from 'react';
import { authService, UserSession } from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const res = authService.login(password);
      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setError(res.error || 'Acesso negado.');
      }
      setIsLoading(false);
    }, 400);
  };

  const handleQuickLogin = (pass: string) => {
    setPassword(pass);
    const res = authService.login(pass);
    if (res.success && res.session) {
      onLoginSuccess(res.session);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between p-6 select-none font-sans relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="pt-8 flex flex-col items-center text-center z-10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-600 p-[2px] shadow-[0_0_35px_rgba(245,158,11,0.3)] mb-4">
          <div className="w-full h-full bg-slate-950 rounded-2xl flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 leading-none">
              M
            </span>
            <span className="text-[7px] font-mono tracking-widest uppercase text-amber-400/80 mt-0.5">
              AI MOBILE
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Marcus Assessoria
        </h1>
        <p className="text-xs text-amber-400/90 font-medium mt-1">
          Inteligência Imobiliária & Leilões Caixa
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
          Acesso exclusivo a 103.000+ dados de ITBI, Radar de Retomados e Copiloto por Voz
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl z-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Senha de Acesso ou Token VIP
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha (ex: marcus2025)"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm transition-all"
                required
              />
            </div>
            {error && (
              <p className="text-rose-400 text-xs mt-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Entrar no Aplicativo</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Access Badges for Ease */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-mono">
            Atalhos de Acesso Rápido
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('marcus2025')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-[11px] font-bold text-amber-300 transition-all text-left"
            >
              👑 Marcus Master
              <span className="block text-[9px] text-slate-400 font-normal">Senha: marcus2025</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('cliente')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-[11px] font-bold text-emerald-300 transition-all text-left"
            >
              💼 Cliente VIP
              <span className="block text-[9px] text-slate-400 font-normal">Senha: cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Security Badge */}
      <div className="text-center z-10 py-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Servidor Cloud Criptografado SSL 256-bit</span>
        </div>
      </div>
    </div>
  );
}
