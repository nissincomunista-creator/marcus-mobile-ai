import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share2, Check, X, QrCode, ExternalLink, Sparkles } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export default function InstallAppModal({ isOpen, onClose, deferredPrompt }: InstallAppModalProps) {
  const [copied, setCopied] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));
      setIsAndroid(/android/.test(ua));
      setAppUrl(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        onClose();
      }
    }
  };

  const handleCopyLink = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `📲 Acesse e instale o App da Marcus Assessoria Imobiliária direto no seu celular:\n${window.location.origin}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin : 'https://marcus-mobile-ai.onrender.com'
  )}&bgcolor=090d16&color=38bdf8&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>Instalar no Celular</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">
                PWA Nativo
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Tenha o app na tela inicial do seu celular como se fosse da loja!
            </p>
          </div>
        </div>

        {/* Direct Install Action if supported by browser */}
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="w-full mb-5 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all transform active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>Instalar Aplicativo Agora</span>
          </button>
        )}

        {/* Instructions by Device Type */}
        <div className="space-y-4 mb-6">
          {isIOS ? (
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold">
                <span>🍎 Como instalar no iPhone (Safari):</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Abra este link no navegador <strong>Safari</strong> do seu iPhone.</li>
                <li>Toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima ⬆️ no rodapé).</li>
                <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
              </ol>
            </div>
          ) : isAndroid ? (
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                <span>🤖 Como instalar no Android (Chrome):</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior direito do Chrome.</li>
                <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                <li>Confirme em <strong>Instalar</strong>. O ícone aparecerá direto na sua gaveta de aplicativos!</li>
              </ol>
            </div>
          ) : (
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center text-center space-y-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>Aponte a câmera do seu celular para abrir:</span>
              </span>
              <div className="p-2.5 bg-[#090d16] border border-slate-700 rounded-xl shadow-inner">
                <img
                  src={qrCodeUrl}
                  alt="QR Code do App"
                  className="w-44 h-44 rounded-lg object-contain mx-auto"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Ao abrir no celular, basta tocar em <strong>"Adicionar à tela inicial"</strong>!
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons: Copy Link & WhatsApp */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
          <button
            onClick={handleCopyLink}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Link Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
