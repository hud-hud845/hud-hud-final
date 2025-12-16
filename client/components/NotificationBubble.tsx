
import React, { useEffect, useState } from 'react';
import { MessageSquare, X, Bell } from 'lucide-react';

interface NotificationBubbleProps {
  senderName: string;
  avatar: string;
  message: string; 
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
    
    // Auto close setelah 5 detik (sedikit lebih lama agar terbaca)
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); 
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div 
      className={`
        fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-[350px] 
        z-[100] transition-all duration-500 transform cubic-bezier(0.68, -0.55, 0.265, 1.55)
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}
      `}
      onClick={() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }}
    >
      <div className="bg-white/95 backdrop-blur-md border border-denim-100 shadow-2xl shadow-denim-900/10 rounded-2xl p-4 flex items-start gap-3 cursor-pointer hover:bg-white transition-colors">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img 
            src={avatar} 
            alt={senderName} 
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=154c79&color=fff`;
            }}
          />
          <div className="absolute -bottom-1 -right-1 bg-denim-600 rounded-full p-1 border-2 border-white">
            <Bell size={10} className="text-white fill-current" />
          </div>
        </div>

        {/* Content sesuai request user */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-0.5">
            {/* Nama Aplikasi */}
            <h4 className="text-[10px] font-bold text-denim-400 uppercase tracking-widest">{appName}</h4>
            <span className="text-[10px] text-denim-300">Baru saja</span>
          </div>
          
          {/* Nama Pengirim (User Name / Group Name) */}
          <h3 className="font-bold text-denim-900 text-sm truncate leading-tight mb-0.5">{senderName}</h3>
          
          {/* Title Notifikasi (Isi pesan statis sesuai request) */}
          <p className="text-sm text-denim-600 font-medium line-clamp-2 leading-snug">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-denim-300 hover:text-red-500 transition-colors -mr-1 -mt-1 p-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
