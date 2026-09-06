import React, { useState, useEffect } from 'react';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone app mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIos(isApple);

    // Listen for Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      alert('Para instalar: abra o menu do navegador (3 pontinhos) e toque em "Adicionar à Tela Inicial" ou "Instalar Aplicativo".');
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-base">📲</span>
          <span className="text-slate-200 font-medium">
            Instalar na Tela Inicial do Celular
          </span>
        </div>
        <button
          onClick={handleInstallClick}
          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          Baixar App 📥
        </button>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-amber-400">Como instalar no iPhone / iPad</h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>
            <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside">
              <li>Toque no botão de <strong>Compartilhar (⎋)</strong> na barra inferior do Safari.</li>
              <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início" (⊞)</strong>.</li>
              <li>Toque em <strong>"Adicionar"</strong> no topo direito.</li>
            </ol>
            <p className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
              Pronto! O ícone dourado do Marcus Assessoria aparecerá junto com seus outros aplicativos, abrindo em tela cheia e sem barra de navegador.
            </p>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
