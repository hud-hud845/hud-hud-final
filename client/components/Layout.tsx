
import React, { useState, useEffect } from 'react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { SidebarMenu } from './SidebarMenu';
import { renderSidebarView } from './SidebarViews';
import { ChatPreview, ViewState, Contact, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, rtdb } from '../services/firebase';
import { translations } from '../utils/translations';
import { cleanupExpiredMessages, cleanupExpiredStatuses, cleanupExpiredNotifications } from '../services/cleanup';
import { sendSystemNotification } from '../utils/notificationHelper';
import { requestFcmToken, onMessageListener } from '../utils/fcm';
import { Bell, MessageSquare, Users, Activity, User as UserIcon, Settings, Radio } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { InstallPrompt } from './InstallPrompt';

export interface AppSettings {
  wallpaper: string; 
  fontSize: 'xsmall' | 'small' | 'normal' | 'large' | 'xlarge';
  language: 'id' | 'ar';
  notifMessage: boolean;
  notifGroup: boolean;
  notifDesktop: boolean;
  soundEnabled: boolean;
  autoDownloadWifi: boolean;
  autoDownloadCellular: boolean;
}

export const Layout: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatPreview | undefined>(undefined);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('chats');
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [targetStatusId, setTargetStatusId] = useState<string | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('hudhud_settings');
    return saved ? JSON.parse(saved) : {
      wallpaper: 'default',
      fontSize: 'normal',
      language: 'id',
      notifMessage: true,
      notifGroup: true,
      notifDesktop: true,
      soundEnabled: false,
      autoDownloadWifi: true,
      autoDownloadCellular: false
    };
  });

  const [adminProfile, setAdminProfile] = useState<User | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          setShowPermissionBanner(true);
        }
      }
    } catch (e) {
      console.warn("Notification API not supported in this environment");
    }
  }, []);

  const handleEnableNotifications = () => {
    setShowPermissionBanner(false);
    setTimeout(async () => {
      if (currentUser) {
        try {
          const token = await requestFcmToken(currentUser.id);
          if (token) console.log("Notifikasi aktif.");
        } catch (error) {
          console.error("FCM Error:", error);
        }
      }
    }, 100); 
  };

  useEffect(() => {
    if (currentUser) {
        cleanupExpiredMessages(currentUser.id);
        cleanupExpiredStatuses();
        cleanupExpiredNotifications(currentUser.id);
        
        try {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              requestFcmToken(currentUser.id).catch(err => console.error(err));
          }
        } catch (e) {}

        const qChats = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.id));
        const unsubChats = onSnapshot(qChats, (snapshot) => {
          let total = 0;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            total += (data.unreadCounts?.[currentUser.id] || 0);
          });
          setTotalUnreadMessages(total);
        });

        const notifRef = ref(rtdb, `notifications/${currentUser.id}`);
        const unsubscribeNotif = onValue(notifRef, (snapshot) => {
          const val = snapshot.val();
          if (val) {
            const unread = Object.values(val).filter((n: any) => n.read === false).length;
            setUnreadNotifCount(unread);
          } else {
            setUnreadNotifCount(0);
          }
        });
        return () => {
          unsubChats();
          unsubscribeNotif();
        };
    }
  }, [currentUser]);

  useEffect(() => {
    onMessageListener().then((payload: any) => {
      if (payload?.notification) {
          sendSystemNotification(payload.notification.title || "Hud-Hud", payload.notification.body || "Pesan baru", '/vite.svg');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data() as ChatPreview;
          const chatId = change.doc.id;
          const myUnreadCount = data.unreadCounts?.[currentUser.id] || 0;
          const isChatOpen = selectedChat?.id === chatId;
          const updatedAtTime = data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now();
          const isRecent = (Date.now() - updatedAtTime) < 10000; 

          if (myUnreadCount > 0 && !isChatOpen && isRecent) {
             const shouldNotify = data.type === 'group' ? appSettings.notifGroup : appSettings.notifMessage;
             if (shouldNotify && appSettings.notifDesktop) {
                sendSystemNotification(`Hud-Hud: ${data.name}`, data.lastMessage || "Pesan baru", data.avatar);
             }
          }
        }
      });
    });
    return () => unsubscribe();
  }, [currentUser, selectedChat, appSettings]);

  useEffect(() => {
    const handlePopState = () => {
      try {
        if (selectedChat) setSelectedChat(undefined);
        else if (currentView !== 'chats') setCurrentView('chats');
      } catch (e) {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedChat, currentView]);

  useEffect(() => {
    localStorage.setItem('hudhud_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  const updateAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  const [contactsMap, setContactsMap] = useState<Record<string, Contact>>({});

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onSnapshot(collection(db, 'users', currentUser.id, 'contacts'), (snapshot) => {
      const map: Record<string, Contact> = {};
      snapshot.docs.forEach(doc => { const data = doc.data() as Contact; map[data.uid] = data; });
      setContactsMap(map);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const fetchAdmin = async () => {
      const q = query(collection(db, 'users'), where('isAdmin', '==', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return onSnapshot(doc(db, 'users', snap.docs[0].id), (docSnap) => {
          if (docSnap.exists()) setAdminProfile({ id: docSnap.id, ...docSnap.data() } as User);
        });
      }
    };
    let unsub: any;
    fetchAdmin().then(u => { unsub = u; });
    return () => unsub && unsub();
  }, []);

  const t = translations[appSettings.language];

  const getDisplayName = (targetUid: string, fallbackName?: string, fallbackPhone?: string) => {
    if (targetUid === currentUser?.id) return t.common.you;
    if (adminProfile && targetUid === adminProfile.id) return adminProfile.name;
    const contact = contactsMap[targetUid];
    if (contact) return contact.savedName;
    return fallbackPhone || fallbackName || 'Pengguna';
  };

  if (!currentUser) return null;

  const handleMenuNavigation = (view: ViewState) => {
    try {
      if (view !== 'chats' && window.history.pushState) {
        window.history.pushState({ view }, '', '');
      }
    } catch (e) {}
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  const handleBackToChats = () => {
    try {
      if (window.history.state) window.history.back();
      else { setSelectedChat(undefined); setCurrentView('chats'); }
    } catch (e) {
      setSelectedChat(undefined);
      setCurrentView('chats');
    }
  };

  const handleSelectChat = async (chat: ChatPreview) => {
    try {
      if (window.history.pushState) {
        window.history.pushState({ chat: chat.id }, '', '');
      }
    } catch (e) {}
    setSelectedChat(chat);
    if (chat.unreadCounts && chat.unreadCounts[currentUser.id] > 0) {
      await updateDoc(doc(db, 'chats', chat.id), { [`unreadCounts.${currentUser.id}`]: 0 });
    }
  };

  const handleStartChat = async (contactUid: string) => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'chats'), where('type', '==', 'direct'), where('participants', 'array-contains', currentUser.id));
      const snapshot = await getDocs(q);
      let existing: ChatPreview | undefined;
      snapshot.forEach(doc => { if (doc.data().participants.includes(contactUid)) existing = { id: doc.id, ...doc.data() } as ChatPreview; });

      if (existing) handleSelectChat(existing);
      else {
        const cSnap = await getDoc(doc(db, 'users', contactUid));
        const cData = cSnap.data();
        const newChat = { type: 'direct', participants: [currentUser.id, contactUid], name: cData?.name || 'User', avatar: cData?.avatar || '', lastMessage: '', lastMessageType: 'text', unreadCounts: { [currentUser.id]: 0, [contactUid]: 0 }, updatedAt: serverTimestamp(), createdAt: serverTimestamp(), typing: {} };
        const docRef = await addDoc(collection(db, 'chats'), newChat);
        handleSelectChat({ id: docRef.id, ...newChat, updatedAt: new Date() } as ChatPreview);
      }
      setCurrentView('chats');
    } catch (e) { alert("Gagal."); }
  };

  const isRtl = appSettings.language === 'ar';

  return (
    <div className="flex h-screen w-full bg-cream-50 overflow-hidden font-sans relative text-denim-900 justify-start" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Install Prompt for Desktop/iOS */}
      <InstallPrompt />

      {showPermissionBanner && (
        <div className="absolute top-0 left-0 right-0 bg-denim-600 text-white z-[60] px-4 py-3 flex items-center justify-between shadow-md animate-in slide-in-from-top-full duration-300 pt-safe">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-full"><Bell size={18} className="text-white animate-pulse" /></div>
             <div className="text-sm"><p className="font-bold">Aktifkan Notifikasi?</p><p className="text-xs text-denim-100">Tetap terhubung saat aplikasi ditutup.</p></div>
           </div>
           <div className="flex items-center gap-2">
              <button onClick={() => setShowPermissionBanner(false)} className="px-3 py-1.5 text-xs text-denim-100">Nanti</button>
              <button onClick={handleEnableNotifications} className="px-3 py-1.5 text-xs bg-white text-denim-700 font-bold rounded-lg shadow-sm">Izinkan</button>
           </div>
        </div>
      )}

      {/* Sidebar Panel - Left Docked */}
      <div className={`relative flex-col border-e border-cream-200 bg-cream-100 transition-all duration-300 ease-in-out z-20 shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] lg:w-[420px]`}>
        <div className="hidden md:block h-full">
            <SidebarMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} currentUser={currentUser} onNavigate={handleMenuNavigation} activeView={currentView} appSettings={appSettings} totalUnreadMessages={totalUnreadMessages} />
        </div>
        
        {currentView === 'chats' ? (
          <ChatList activeChatId={selectedChat?.id} onSelectChat={handleSelectChat} onOpenMenu={() => setIsMenuOpen(true)} onStartChat={handleStartChat} contactsMap={contactsMap} getDisplayName={getDisplayName} appSettings={appSettings} adminProfile={adminProfile} onNavigate={handleMenuNavigation} />
        ) : (
          renderSidebarView(currentView, handleBackToChats, handleStartChat, (c) => { handleSelectChat(c); setCurrentView('chats'); }, appSettings, updateAppSettings, contactsMap, adminProfile, handleMenuNavigation, setTargetStatusId, targetStatusId)
        )}

        {/* Mobile Footer Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-cream-200 flex justify-between items-end px-2 py-2 z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] h-16 pb-safe">
           <button onClick={() => setCurrentView('chats')} className={`flex flex-col items-center justify-center flex-1 transition-colors relative ${currentView === 'chats' ? 'text-denim-700' : 'text-denim-400'}`}>
             <MessageSquare size={22} className={currentView === 'chats' ? 'fill-denim-100/30' : ''} />
             {totalUnreadMessages > 0 && <span className="absolute top-0 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white font-bold">{totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}</span>}
             <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Obrolan</span>
           </button>
           
           {currentUser.isAdmin ? (
             <button onClick={() => setCurrentView('broadcast')} className={`flex flex-col items-center justify-center flex-1 transition-colors ${currentView === 'broadcast' ? 'text-denim-700' : 'text-denim-400'}`}>
               <Radio size={22} className={currentView === 'broadcast' ? 'fill-denim-100/30' : ''} />
               <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Siaran</span>
             </button>
           ) : (
             <button onClick={() => setCurrentView('groups')} className={`flex flex-col items-center justify-center flex-1 transition-colors ${currentView === 'groups' ? 'text-denim-700' : 'text-denim-400'}`}>
               <Users size={22} className={currentView === 'groups' ? 'fill-denim-100/30' : ''} />
               <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Grup</span>
             </button>
           )}
           
           {/* Status Icon */}
           <button onClick={() => setCurrentView('status')} className={`flex flex-col items-center justify-center flex-1 transition-all duration-300`}>
             <div className={`
               w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 mb-0.5 transition-all
               ${currentView === 'status' 
                 ? 'bg-denim-700 text-white border-denim-100 scale-110 -translate-y-1' 
                 : 'bg-denim-600 text-white/90 border-denim-500/50 scale-100'
               }
               ring-2 ring-offset-2 ring-transparent
             `}>
               <Activity size={24} strokeWidth={2.5} />
             </div>
             <span className={`text-[10px] font-bold uppercase tracking-tighter ${currentView === 'status' ? 'text-denim-800' : 'text-denim-400'}`}>Status</span>
           </button>
           
           <button onClick={() => setCurrentView('notifications')} className={`flex flex-col items-center justify-center flex-1 transition-colors relative ${currentView === 'notifications' ? 'text-denim-700' : 'text-denim-400'}`}>
             <Bell size={22} className={currentView === 'notifications' ? 'fill-denim-100/30' : ''} />
             {unreadNotifCount > 0 && <span className="absolute top-0 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white font-bold">{unreadNotifCount}</span>}
             <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Notif</span>
           </button>
           
           <button onClick={() => setCurrentView('contacts')} className={`flex flex-col items-center justify-center flex-1 transition-colors ${currentView === 'contacts' ? 'text-denim-700' : 'text-denim-400'}`}>
             <UserIcon size={22} className={currentView === 'contacts' ? 'fill-denim-100/30' : ''} />
             <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Kontak</span>
           </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col bg-cream-50 relative z-10 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <ChatWindow chat={selectedChat} currentUser={currentUser} onBack={handleBackToChats} contactsMap={contactsMap} getDisplayName={getDisplayName} onStartChat={handleStartChat} appSettings={appSettings} adminProfile={adminProfile} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-denim-400 select-none p-4 text-center bg-cream-50 pattern-bg">
            <div className="w-24 h-24 bg-cream-100 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-xl shadow-denim-900/5 border border-cream-200">
               <span className="text-4xl filter drop-shadow-sm">🕊️</span>
            </div>
            <h1 className="text-2xl font-bold text-denim-800 mb-2">Hud-Hud Messenger</h1>
            <p className="max-w-xs text-sm text-denim-500">{t.chatList.selectChat}</p>
          </div>
        )}
      </div>
    </div>
  );
};
