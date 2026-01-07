import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Deteksi apakah sudah terinstal (PWA mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // 2. Deteksi iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // 3. Tangkap event instalasi (Chrome/Android/Edge)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    });

    // Untuk iOS, kita tampilkan saja bannernya setelah beberapa detik
    if (ios) {
      setTimeout(() => setShowBanner(true), 3000);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] animate-bounce-in">
      <div className="bg-denim-700 text-white p-4 rounded-2xl shadow-2xl border-2 border-cream-200">
        <button 
          onClick={() => setShowBanner(false)}
          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-xl">
            <img src="/icon.png" alt="Hud-Hud" className="w-10 h-10 object-contain" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-sm text-cream-100">Pasang Hud-Hud</h3>
            <p className="text-xs text-denim-100">Akses lebih cepat & hemat kuota</p>
          </div>

          {isIOS ? (
            <div className="flex items-center gap-1 bg-cream-100 text-denim-700 px-3 py-2 rounded-lg text-xs font-bold">
              <span>Klik</span> <Share size={14} /> <span>lalu</span> <PlusSquare size={14} />
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="bg-cream-100 text-denim-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-white transition-colors"
            >
              <Download size={14} /> INSTAL
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;