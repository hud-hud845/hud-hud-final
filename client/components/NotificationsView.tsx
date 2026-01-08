
import React, { useState, useEffect } from 'react';
import { Bell, Loader2, Heart, MessageCircle, ArrowLeft, Reply, User as UserIcon, RotateCw } from 'lucide-react';
import { format } from 'date-fns';
import { ref, onValue, update, query as rtdbQuery, limitToLast, orderByChild } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { translations } from '../utils/translations';
import { ViewHeader } from './SidebarViews';
import { AppSettings } from './Layout';
import { Notification, ViewState } from '../types';

interface NotificationsViewProps {
  onBack: () => void;
  appSettings?: AppSettings;
  onNavigate?: (view: ViewState) => void;
  setTargetStatusId?: (id: string | null) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ 
  onBack, appSettings, onNavigate, setTargetStatusId 
}) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(10); // Mulai dari 10 notifikasi sesuai request
  const [hasMore, setHasMore] = useState(true);
  
  const t = translations[appSettings?.language || 'id'];

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    
    // Query dengan limit dinamis (Pagination)
    const notifRef = rtdbQuery(
      ref(rtdb, `notifications/${currentUser.id}`),
      orderByChild('createdAt'),
      limitToLast(limitCount)
    );

    const unsubscribe = onValue(notifRef, (snapshot) => {
      const val = snapshot.val();
      const now = Date.now();
      if (val) {
        const list = Object.entries(val).map(([id, data]: [string, any]) => ({
          id,
          ...data,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
        }))
        // Tetap filter usia 48 jam agar database tetap bersih
        .filter(n => !n.expiresAt || n.expiresAt > now)
        .sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
        
        setNotifications(list);

        // Jika jumlah data yang ditarik kurang dari limit yang diminta, berarti sudah habis
        if (Object.keys(val).length < limitCount) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        setNotifications([]);
        setHasMore(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, limitCount]);

  const handleNotificationClick = (notif: Notification) => {
    // Tandai sudah dibaca di database
    update(ref(rtdb, `notifications/${currentUser?.id}/${notif.id}`), { read: true });
    
    if (setTargetStatusId && onNavigate) {
      setTargetStatusId(notif.statusId);
      onNavigate('status'); 
    }
  };

  const getTimeAgo = (timestamp: any) => { 
    if (!timestamp) return ''; 
    return format(timestamp, 'HH:mm • dd MMM'); 
  };

  const renderNotificationText = (notif: Notification) => {
      const isOwner = notif.recipientId === notif.statusOwnerId;
      const ownerName = notif.statusOwnerName || 'Seseorang';

      if (notif.type === 'like') {
          return <span><span className="font-bold">{notif.senderName}</span> {isOwner ? 'menyukai status Anda.' : `menyukai status ${ownerName}.`}</span>;
      }
      if (notif.type === 'reply') {
          return <span><span className="font-bold">{notif.senderName}</span> membalas komentar Anda.</span>;
      }
      if (notif.type === 'comment') {
          return <span><span className="font-bold">{notif.senderName}</span> mengomentari status Anda.</span>;
      }
      if (notif.type === 'comment_owner') {
          return <span><span className="font-bold">{notif.senderName}</span> mengomentari postingannya.</span>;
      }
      if (notif.type === 'comment_others') {
          return <span><span className="font-bold">{notif.senderName}</span> juga mengomentari status {ownerName}.</span>;
      }
      return <span><span className="font-bold">{notif.senderName}</span> mengirim notifikasi.</span>;
  };
  
  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title={t.notifications.title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 pb-24 md:pb-0">
        {loading && limitCount === 10 ? ( 
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div> 
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-denim-400 h-64">
            <div className="w-16 h-16 bg-cream-200 rounded-full flex items-center justify-center mb-3"><Bell size={32} className="text-denim-300" /></div>
            <p className="font-medium text-sm text-denim-500">{t.notifications.empty}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="divide-y divide-cream-200">
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)} 
                  className={`p-4 flex gap-3 cursor-pointer transition-all duration-300 relative border-s-4 ${!notif.read ? 'bg-denim-50/80 border-denim-600 ring-inset ring-1 ring-denim-100' : 'bg-white border-transparent hover:bg-cream-50'}`}
                >
                  <div className="relative shrink-0">
                    <img src={notif.senderAvatar} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.senderName)}&background=random&color=fff`; }}/>
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${notif.type === 'like' ? 'bg-red-500' : notif.type === 'reply' ? 'bg-blue-500' : 'bg-green-500'}`}>
                      {notif.type === 'like' ? <Heart size={10} className="text-white fill-white"/> : notif.type === 'reply' ? <Reply size={10} className="text-white" /> : <MessageCircle size={10} className="text-white fill-white"/>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-denim-900 leading-snug">
                      {renderNotificationText(notif)}
                      {notif.previewText && (
                        <span className="block text-denim-600 italic truncate mt-1 bg-white/40 p-1.5 rounded border border-denim-100/30 text-xs">
                          "{notif.previewText}"
                        </span>
                      )}
                    </p>
                    <p className={`text-[10px] mt-1.5 flex items-center gap-1.5 ${!notif.read ? 'text-denim-600 font-black uppercase' : 'text-denim-400 font-medium'}`}>
                      {getTimeAgo(notif.createdAt)}
                      {!notif.read && (
                        <>
                          <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-sm"></span>
                          <span className="tracking-widest">Baru</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* TOMBOL LIHAT NOTIFIKASI LAINNYA */}
            {hasMore && (
              <div className="p-6 flex justify-center animate-in fade-in zoom-in-95">
                <button 
                  onClick={() => setLimitCount(prev => prev + 10)}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-white border border-cream-300 rounded-full text-[10px] font-black text-denim-700 shadow-lg hover:bg-denim-700 hover:text-white transition-all active:scale-95 group uppercase tracking-widest disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />}
                  Lihat Notifikasi Lainnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
