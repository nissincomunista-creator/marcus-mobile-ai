import React, { useEffect, useState } from 'react';
import { X, Smartphone, Wifi, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [networkUrl, setNetworkUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/network/host-info')
      .then((r) => r.json())
      .then((data) => {
        const url = data.networkUrl || window.location.origin;
        setNetworkUrl(url);
        QRCode.toDataURL(url, {
          width: 260,
          margin: 1.5,
          color: {
            dark: '#f59e0b',
            light: '#070a12'
          }
        }).then(setQrDataUrl);
      })
      .catch(() => {
        const url = window.location.origin;
        setNetworkUrl(url);
        QRCode.toDataURL(url, {
          width: 260,
          margin: 1.5,
          color: {
            dark: '#f59e0b',
            light: '#070a12'
          }
        }).then(setQrDataUrl);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const copyUrl = () => {
    navigator.clipboard.writeText(networkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <Smartphone className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-100">Abrir no seu Celular</h3>
          <p className="text-xs text-slate-400 mt-1">
            Aponte a câmera do seu celular (Android ou iPhone) para o QR Code abaixo:
          </p>
        </div>

        {qrDataUrl && (
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 inline-block shadow-inner">
            <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 mx-auto rounded-lg" />
          </div>
        )}

        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300">
          <span className="truncate mr-2">{networkUrl}</span>
          <button onClick={copyUrl} className="text-amber-400 hover:text-amber-300 shrink-0">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1">
          <Wifi className="w-3.5 h-3.5" />
          <span>Certifique-se de estar conectado no mesmo Wi-Fi.</span>
        </p>
      </div>
    </div>
  );
};
