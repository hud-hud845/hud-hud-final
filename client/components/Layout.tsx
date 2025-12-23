
import React, { useState, useEffect } from 'react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { SidebarMenu } from './SidebarMenu';
import { renderSidebarView } from './SidebarViews';
import { ChatPreview, ViewState, Contact, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { translations } from '../utils/translations';
import { cleanupExpiredMessages, cleanupExpiredStatuses, cleanupExpiredNotifications } from '../services/cleanup';
import { sendSystemNotification } from '../utils/notificationHelper';
import { requestFcmToken, onMessageListener } from '../utils/fcm';
import { Bell, X } from 'lucide-react';

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
  const [adminProfile, setAdminProfile] = useState<User | null>(null);
  const [contactsMap, setContactsMap] = useState<Record<string, Contact>>({});

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
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
    } catch (e) {
      return { wallpaper: 'default', fontSize: 'normal', language: 'id', notifMessage: true, notifGroup: true, notifDesktop: true, soundEnabled: false, autoDownloadWifi: true, autoDownloadCellular: false };
    }
  });

  // --- CEK IZIN NOTIFIKASI DENGAN DEFENSIVE CHECK (PENTING UNTUK ANDROID WEBVIEW) ---
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
        if (Notification.permission === 'default') {
          setShowPermissionBanner(true);
        }
      }
    } catch (e) {
      console.warn("Notification API not supported in this environment");
    }
  }, []);

  const handleEnableNotifications = async () => {
    setShowPermissionBanner(false);
    if (!currentUser) return;
    try {
      const token = await requestFcmToken(currentUser.id);
      if (token) console.log("FCM Active");
    } catch (error) {
      console.error("FCM activation error:", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      cleanupExpiredMessages(currentUser.id).catch(() => {});
      cleanupExpiredStatuses().catch(() => {});
      cleanupExpiredNotifications().catch(() => {});
      
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        requestFcmToken(currentUser.id).catch(() => {});
      }
    }
  }, [currentUser]);

  useEffect(() => {
    onMessageListener().then((payload: any) => {
      if (payload?.notification) {
        sendSystemNotification(payload.notification.title || "Hud-Hud", payload.notification.body || "Pesan baru", '/vite.svg');
      }
    }).catch(() => {});
  }, []);

  // --- FIRESTORE REALTIME NOTIFICATIONS (FOREGROUND) ---
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data() as ChatPreview;
          const myUnreadCount = data.unreadCounts?.[currentUser.id] || 0;
          const isChatOpen = selectedChat?.id === change.doc.id;
          const updatedAtTime = data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now();
          const isRecent = (Date.now() - updatedAtTime) < 5000; 

          if (myUnreadCount > 0 && !isChatOpen && isRecent) {
            const shouldNotify = data.type === 'group' ? appSettings.notifGroup : appSettings.notifMessage;
            if (shouldNotify && appSettings.notifDesktop) {
              sendSystemNotification(`Hud-Hud: ${data.name}`, data.lastMessage || "Pesan baru", data.avatar);
            }
          }
        }
      });
    }, (err) => console.error("Snapshot error:", err));
    return () => unsubscribe();
  }, [currentUser, selectedChat, appSettings]);

  // --- MANAJEMEN NAVIGASI ANDROID (Hapus pushState karena sering bikin blank di WebView) ---
  // Kita gunakan state internal saja untuk stabilitas di Android Studio
  const handleMenuNavigation = (view: ViewState) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  const handleBackToChats = () => {
    setSelectedChat(undefined);
    setCurrentView('chats');
  };

  useEffect(() => {
    localStorage.setItem('hudhud_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  const updateAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings(prev => ({ ...prev, ...newSettings }));
  };
  
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
      try {
        const q = query(collection(db, 'users'), where('isAdmin', '==', true));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const adminId = snap.docs[0].id;
          onSnapshot(doc(db, 'users', adminId), (docSnap) => {
            if (docSnap.exists()) setAdminProfile({ id: docSnap.id, ...docSnap.data() } as User);
          });
        }
      } catch (e) {}
    };
    fetchAdmin();
  }, []);

  if (!currentUser) return null;

  const t = translations[appSettings.language];
  const getDisplayName = (targetUid: string, fallbackName?: string, fallbackPhone?: string) => {
    if (targetUid === currentUser?.id) return t.common.you;
    if (adminProfile && targetUid === adminProfile.id) return adminProfile.name;
    const contact = contactsMap[targetUid];
    return contact ? contact.savedName : (fallbackPhone || fallbackName || 'Pengguna');
  };

  const handleSelectChat = async (chat: ChatPreview) => {
    setSelectedChat(chat);
    if (chat.unreadCounts?.[currentUser.id] > 0) {
      try { await updateDoc(doc(db, 'chats', chat.id), { [`unreadCounts.${currentUser.id}`]: 0 }); } catch (e) {}
    }
  };

  const handleStartChat = async (contactUid: string) => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'chats'), where('type', '==', 'direct'), where('participants', 'array-contains', currentUser.id));
      const snapshot = await getDocs(q);
      let existing: ChatPreview | undefined;
      snapshot.forEach(doc => { if (doc.data().participants.includes(contactUid)) existing = { id: doc.id, ...doc.data() } as ChatPreview; });

      if (existing) {
        handleSelectChat(existing);
      } else {
        const contactDoc = await getDoc(doc(db, 'users', contactUid));
        const newChat = {
          type: 'direct', participants: [currentUser.id, contactUid], name: contactDoc.data()?.name || 'User',
          avatar: contactDoc.data()?.avatar || '', lastMessage: 'Chat baru', lastMessageType: 'text',
          unreadCounts: { [currentUser.id]: 0, [contactUid]: 0 }, updatedAt: serverTimestamp(), createdAt: serverTimestamp(), typing: {}
        };
        const ref = await addDoc(collection(db, 'chats'), newChat);
        handleSelectChat({ id: ref.id, ...newChat } as ChatPreview);
      }
      setCurrentView('chats');
    } catch (e) { alert("Error starting chat"); }
  };

  return (
    <div className="flex h-screen w-full bg-cream-50 overflow-hidden font-sans relative text-denim-900" dir={appSettings.language === 'ar' ? 'rtl' : 'ltr'}>
      {showPermissionBanner && (
        <div className="absolute top-0 left-0 right-0 bg-denim-600 text-white z-[60] px-4 py-3 flex items-center justify-between shadow-md">
           <div className="flex items-center gap-3"><Bell size={18}/><div className="text-sm"><p className="font-bold">Aktifkan Notifikasi?</p><p className="text-xs">Klik izinkan untuk tetap terhubung.</p></div></div>
           <div className="flex gap-2"><button onClick={() => setShowPermissionBanner(false)} className="px-3 py-1.5 text-xs">Nanti</button><button onClick={handleEnableNotifications} className="px-3 py-1.5 text-xs bg-white text-denim-700 font-bold rounded-lg">Izinkan</button></div>
        </div>
      )}

      <div className={`relative flex-col border-e border-cream-200 bg-cream-100 ${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] lg:w-[420px]`}>
        <SidebarMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} currentUser={currentUser} onNavigate={handleMenuNavigation} activeView={currentView} appSettings={appSettings} />
        {currentView === 'chats' ? (
          <ChatList activeChatId={selectedChat?.id} onSelectChat={handleSelectChat} onOpenMenu={() => setIsMenuOpen(true)} onStartChat={handleStartChat} contactsMap={contactsMap} getDisplayName={getDisplayName} appSettings={appSettings} adminProfile={adminProfile} />
        ) : (
          renderSidebarView(currentView, handleBackToChats, handleStartChat, (c) => { handleSelectChat(c); setCurrentView('chats'); }, appSettings, updateAppSettings, contactsMap, adminProfile, handleMenuNavigation, setTargetStatusId, targetStatusId)
        )}
      </div>

      <div className={`flex-1 flex flex-col bg-cream-50 relative z-10 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <ChatWindow chat={selectedChat} currentUser={currentUser} onBack={handleBackToChats} contactsMap={contactsMap} getDisplayName={getDisplayName} onStartChat={handleStartChat} appSettings={appSettings} adminProfile={adminProfile} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-denim-400 select-none p-4 text-center bg-cream-50 pattern-bg">
            <div className="w-24 h-24 bg-cream-100 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-xl border border-cream-200"><span className="text-4xl">🕊️</span></div>
            <h1 className="text-2xl font-bold text-denim-800 mb-2">Hud-Hud</h1>
            <p className="text-sm text-denim-500">Pilih obrolan untuk memulai pesan</p>
          </div>
        )}
      </div>
    </div>
  );
};
