
import React, { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

interface NotificationBubbleProps {
  senderName: string;
  avatar: string;
  message: string; // Biasanya "Ada pesan baru..."
  appName?: string;
  onClose: () => void;
}

export const NotificationBubble: React.FC<NotificationBubbleProps> = ({ 
  senderName, 
  avatar, 
  message, 
  appName = "Hud-Hud",
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animasi masuk
    const timer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto close setelah 4 detik
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Tunggu animasi keluar selesai baru unmount
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div 
      className={`
        fixed top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[400px] 
        z-[100] transition-all duration-300 transform
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}
      `}
      onClick={() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }}
    >
      <div className="bg-white/95 backdrop-blur-md border border-cream-200 shadow-2xl rounded-2xl p-4 flex items-start gap-4 cursor-pointer hover:bg-white transition-colors">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img 
            src={avatar} 
            alt={senderName} 
            className="w-12 h-12 rounded-full object-cover border border-cream-300 shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=154c79&color=fff`;
            }}
          />
          <div className="absolute -bottom-1 -right-1 bg-denim-600 rounded-full p-1 border-2 border-white">
            <MessageSquare size={10} className="text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="text-xs font-bold text-denim-500 uppercase tracking-wider mb-0.5">{appName}</h4>
            <span className="text-[10px] text-denim-400">Baru saja</span>
          </div>
          <h3 className="font-bold text-denim-900 text-sm truncate">{senderName}</h3>
          <p className="text-sm text-denim-600 line-clamp-2 leading-snug mt-0.5">
            {message}
          </p>
        </div>

        {/* Close Button (Optional visually, but good for UX) */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-denim-300 hover:text-denim-500"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
