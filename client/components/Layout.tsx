
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
import { cleanupExpiredMessages } from '../services/cleanup';
// Helper notifikasi sistem & FCM
import { sendSystemNotification } from '../utils/notificationHelper';
import { requestFcmToken, onMessageListener } from '../utils/fcm';
import { Bell, X } from 'lucide-react';

export interface AppSettings {
  wallpaper: string; 
  fontSize: 'small' | 'normal' | 'large';
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

  // --- CEK IZIN NOTIFIKASI ---
  useEffect(() => {
    if ('Notification' in window) {
      // Jika izin 'default' (belum dipilih), tampilkan banner
      if (Notification.permission === 'default') {
        setShowPermissionBanner(true);
      }
    }
  }, []);

  // Fungsi yang dipanggil saat tombol di banner diklik
  const handleEnableNotifications = async () => {
    if (currentUser) {
      const token = await requestFcmToken(currentUser.id);
      if (token) {
        setShowPermissionBanner(false);
        // Tes notifikasi lokal
        new Notification("Notifikasi Aktif", { body: "Hud-Hud siap menerima pesan." });
      }
    }
  };

  // --- INTEGRASI FCM TOKEN SAAT LOGIN (Jika sudah diizinkan sebelumnya) ---
  useEffect(() => {
    if (currentUser && Notification.permission === 'granted') {
      cleanupExpiredMessages(currentUser.id);
      requestFcmToken(currentUser.id);
    }
  }, [currentUser]);

  // --- LISTENER PESAN FOREGROUND FCM ---
  useEffect(() => {
    onMessageListener().then((payload: any) => {
      // Menangani pesan push saat aplikasi terbuka
      // Kita bisa memunculkan notifikasi sistem di sini juga
      if (payload?.notification) {
          sendSystemNotification(
              payload.notification.title || "Pesan Baru",
              payload.notification.body || "Anda mendapat pesan baru",
              '/vite.svg'
          );
      }
    });
  }, []);

  // --- LOGIKA NOTIFIKASI IN-APP (FIRESTORE LISTENER) ---
  // Kita gunakan ini HANYA untuk Notifikasi Sistem (Desktop/Android Native)
  // TIDAK ADA Bubble dalam aplikasi lagi.
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data() as ChatPreview;
          const chatId = change.doc.id;

          const myUnreadCount = data.unreadCounts?.[currentUser.id] || 0;
          const isChatOpen = selectedChat?.id === chatId;
          
          // Cek waktu
          const updatedAtTime = data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now();
          const isRecent = (Date.now() - updatedAtTime) < 10000; 

          if (myUnreadCount > 0 && !isChatOpen && isRecent) {
             let displaySender = data.name; 
             let displayAvatar = data.avatar;
             const notifBody = data.lastMessage || "Ada pesan baru";
             const shouldNotify = data.type === 'group' ? appSettings.notifGroup : appSettings.notifMessage;

             if (shouldNotify && appSettings.notifDesktop) {
                // Munculkan notifikasi sistem (Status bar)
                sendSystemNotification(
                  displaySender, 
                  notifBody, 
                  displayAvatar
                );
             }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, selectedChat, appSettings]);

  // ... (Sisa kode logika Layout sama persis) ...
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (selectedChat) {
        setSelectedChat(undefined);
      } else if (currentView !== 'chats') {
        setCurrentView('chats');
      } 
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
    const contactsRef = collection(db, 'users', currentUser.id, 'contacts');
    const unsubscribe = onSnapshot(contactsRef, (snapshot) => {
      const map: Record<string, Contact> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Contact;
        map[data.uid] = data; 
      });
      setContactsMap(map);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const fetchAdminUid = async () => {
      const q = query(collection(db, 'users'), where('isAdmin', '==', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const adminId = snap.docs[0].id;
        const unsubAdmin = onSnapshot(doc(db, 'users', adminId), (docSnap) => {
          if (docSnap.exists()) {
            setAdminProfile({ id: docSnap.id, ...docSnap.data() } as User);
          }
        });
        return unsubAdmin;
      }
    };
    let unsubscribe: (() => void) | undefined;
    fetchAdminUid().then(unsub => { unsubscribe = unsub; });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const t = translations[appSettings.language];

  const getDisplayName = (targetUid: string, fallbackName?: string, fallbackPhone?: string) => {
    if (targetUid === currentUser?.id) return t.common.you;
    if (adminProfile && targetUid === adminProfile.id) return adminProfile.name;
    const contact = contactsMap[targetUid];
    if (contact) return contact.savedName;
    if (fallbackPhone) return fallbackPhone;
    return fallbackName || 'Pengguna';
  };

  if (!currentUser) return null;

  const handleMenuNavigation = (view: ViewState) => {
    if (view !== 'chats') window.history.pushState({ view: view }, '', '');
    setCurrentView(view);
  };

  const handleBackToChats = () => {
    if (window.history.state) window.history.back();
    else { setSelectedChat(undefined); setCurrentView('chats'); }
  };

  const markChatAsRead = async (chat: ChatPreview) => {
    if (!chat || !currentUser) return;
    if (chat.unreadCounts && chat.unreadCounts[currentUser.id] > 0) {
      const chatRef = doc(db, 'chats', chat.id);
      try { await updateDoc(chatRef, { [`unreadCounts.${currentUser.id}`]: 0 }); } catch (err) { console.error("Gagal update status baca:", err); }
    }
  };

  const handleSelectChat = (chat: ChatPreview) => {
    window.history.pushState({ chat: chat.id }, '', '');
    setSelectedChat(chat);
    markChatAsRead(chat);
  };

  const handleOpenGroupChat = (chat: ChatPreview) => {
    handleSelectChat(chat);
    setCurrentView('chats'); 
  };

  const handleStartChat = async (contactUid: string) => {
    if (!currentUser) return;
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('type', '==', 'direct'), where('participants', 'array-contains', currentUser.id));
      const snapshot = await getDocs(q);
      let existingChat: ChatPreview | undefined;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(contactUid)) {
          existingChat = { id: doc.id, ...data, updatedAt: data.updatedAt?.toDate() || new Date() } as ChatPreview;
        }
      });

      if (existingChat) {
        handleSelectChat(existingChat);
      } else {
        const contactDoc = await getDoc(doc(db, 'users', contactUid));
        const contactData = contactDoc.data();
        const newChatData = {
          type: 'direct',
          participants: [currentUser.id, contactUid],
          name: contactData?.name || 'Pengguna',
          avatar: contactData?.avatar || '',
          lastMessage: t.common.typing,
          lastMessageType: 'text',
          unreadCounts: { [currentUser.id]: 0, [contactUid]: 0 },
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          typing: {} 
        };
        const docRef = await addDoc(collection(db, 'chats'), newChatData);
        handleSelectChat({ id: docRef.id, ...newChatData, updatedAt: new Date() } as ChatPreview);
      }
      setCurrentView('chats');
      setIsMenuOpen(false);
    } catch (error) { console.error("Gagal memulai chat:", error); alert("Terjadi kesalahan."); }
  };

  const isRtl = appSettings.language === 'ar';

  return (
    <div className="flex h-screen w-full bg-cream-50 overflow-hidden font-sans relative text-denim-900" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* BANNER IZIN NOTIFIKASI */}
      {showPermissionBanner && (
        <div className="absolute top-0 left-0 right-0 bg-denim-600 text-white z-[60] px-4 py-3 flex items-center justify-between shadow-md">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-full">
               <Bell size={18} className="text-white animate-pulse" />
             </div>
             <div className="text-sm">
               <p className="font-bold">Aktifkan Notifikasi?</p>
               <p className="text-xs text-denim-100">Dapatkan pesan masuk saat aplikasi tertutup.</p>
             </div>
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowPermissionBanner(false)}
                className="px-3 py-1.5 text-xs text-denim-100 hover:bg-white/10 rounded-lg"
              >
                Nanti
              </button>
              <button 
                onClick={handleEnableNotifications}
                className="px-3 py-1.5 text-xs bg-white text-denim-700 font-bold rounded-lg hover:bg-cream-100 shadow-sm"
              >
                Aktifkan
              </button>
           </div>
        </div>
      )}

      {/* Sidebar Panel Container */}
      <div className={`relative flex-col border-e border-cream-200 bg-cream-100 transition-all duration-300 ease-in-out z-20 ${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] lg:w-[420px]`}>
        <SidebarMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)} 
          currentUser={currentUser} 
          onNavigate={handleMenuNavigation} 
          activeView={currentView} 
          appSettings={appSettings} 
        />
        {currentView === 'chats' ? (
          <ChatList 
            activeChatId={selectedChat?.id} 
            onSelectChat={handleSelectChat} 
            onOpenMenu={() => setIsMenuOpen(true)} 
            onStartChat={handleStartChat} 
            contactsMap={contactsMap} 
            getDisplayName={getDisplayName} 
            appSettings={appSettings} 
            adminProfile={adminProfile} 
          />
        ) : (
          renderSidebarView(currentView, handleBackToChats, handleStartChat, handleOpenGroupChat, appSettings, updateAppSettings)
        )}
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col bg-cream-50 relative z-10 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <ChatWindow 
            chat={selectedChat} 
            currentUser={currentUser} 
            onBack={handleBackToChats} 
            contactsMap={contactsMap} 
            getDisplayName={getDisplayName} 
            onStartChat={handleStartChat} 
            appSettings={appSettings} 
            adminProfile={adminProfile} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-denim-400 select-none p-4 text-center bg-cream-50 pattern-bg">
            <div className="w-24 h-24 bg-cream-100 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-xl shadow-denim-900/5 border border-cream-200">
               <span className="text-4xl filter drop-shadow-sm">🕊️</span>
            </div>
            <h1 className="text-2xl font-bold text-denim-800 mb-2">{t.chatList.title}</h1>
            <p className="max-w-xs text-sm text-denim-500">{t.chatList.selectChat}</p>
            <div className="mt-8 px-4 py-1.5 bg-cream-100/80 backdrop-blur rounded-full text-[10px] font-medium text-denim-600 border border-cream-200 shadow-sm">Terenkripsi • Cepat • Aman</div>
          </div>
        )}
      </div>
    </div>
  );
};
