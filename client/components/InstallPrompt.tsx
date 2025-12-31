
import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, ArrowBigDown } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showDesktopPrompt, setShowDesktopPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    // 1. Cek apakah sudah dalam mode standalone (sudah diinstall)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (window.navigator as any).standalone 
                         || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // 2. Deteksi iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIos && isSafari) {
      setShowIosPrompt(true);
    }

    // 3. Desktop / Android Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowDesktopPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowDesktopPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (showDesktopPrompt) {
    return (
      <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-white rounded-2xl shadow-2xl border border-denim-100 p-4 z-[100] animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-denim-700 rounded-xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden border border-denim-600">
             <img src="/icon.png" alt="Hud-Hud" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-denim-900 text-sm">Pasang Hud-Hud</h3>
            <p className="text-xs text-denim-500 mt-1">Gunakan versi aplikasi untuk akses lebih cepat & lancar.</p>
          </div>
          <button onClick={() => setShowDesktopPrompt(false)} className="text-denim-300 hover:text-denim-600">
            <X size={18} />
          </button>
        </div>
        <button 
          onClick={handleInstallClick}
          className="w-full mt-4 bg-denim-700 hover:bg-denim-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-denim-900/20"
        >
          <Download size={16} /> Pasang Sekarang
        </button>
      </div>
    );
  }

  if (showIosPrompt) {
    return (
      <div className="fixed bottom-6 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-denim-100 p-5 z-[100] animate-in slide-in-from-bottom-10 duration-500">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-denim-700 rounded-lg flex items-center justify-center shadow-md overflow-hidden">
              <img src="/icon.png" alt="Hud-Hud" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-bold text-denim-900">Pasang Hud-Hud</h3>
          </div>
          <button onClick={() => setShowIosPrompt(false)} className="p-1 bg-cream-100 rounded-full text-denim-400">
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-4 text-sm text-denim-700">
          <div className="flex items-center gap-3 bg-cream-50 p-3 rounded-xl border border-cream-200">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-denim-600">
              <Share size={18} />
            </div>
            <p className="text-xs">1. Ketuk ikon <b>Bagikan (Share)</b> di bar bawah.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-cream-50 p-3 rounded-xl border border-cream-200">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-denim-600">
              <PlusSquare size={18} />
            </div>
            <p className="text-xs">2. Pilih <b>Tambah ke Layar Utama (Add to Home Screen)</b>.</p>
          </div>
        </div>

        <div className="mt-4 flex justify-center animate-bounce">
           <ArrowBigDown size={24} className="text-denim-400" />
        </div>
      </div>
    );
  }

  return null;
};
