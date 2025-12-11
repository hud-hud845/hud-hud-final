
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

// Interface untuk Pengaturan Aplikasi
export interface AppSettings {
  // Tampilan
  wallpaper: string; 
  fontSize: 'small' | 'normal' | 'large';
  language: 'id' | 'ar';
  
  // Notifikasi
  notifMessage: boolean;
  notifGroup: boolean;
  notifDesktop: boolean;
  soundEnabled: boolean;

  // Penyimpanan
  autoDownloadWifi: boolean;
  autoDownloadCellular: boolean;
}

export const Layout: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatPreview | undefined>(undefined);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('chats');
  
  // App Settings State (Persisted in LocalStorage)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('hudhud_settings');
    return saved ? JSON.parse(saved) : {
      wallpaper: 'default',
      fontSize: 'normal',
      language: 'id',
      notifMessage: true,
      notifGroup: true,
      notifDesktop: true,
      soundEnabled: true,
      autoDownloadWifi: true,
      autoDownloadCellular: false
    };
  });

  // Global Admin Profile State (Full Object, not just UID)
  const [adminProfile, setAdminProfile] = useState<User | null>(null);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('hudhud_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  const updateAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  // Global Contacts Map for Name Resolution
  const [contactsMap, setContactsMap] = useState<Record<string, Contact>>({});

  // Fetch contacts realtime to build the resolution map
  useEffect(() => {
    if (!currentUser) return;
    const contactsRef = collection(db, 'users', currentUser.id, 'contacts');
    const unsubscribe = onSnapshot(contactsRef, (snapshot) => {
      const map: Record<string, Contact> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Contact;
        map[data.uid] = data; // Map by UID
      });
      setContactsMap(map);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // PERBAIKAN: Fetch Admin Profile secara Realtime & Global
  useEffect(() => {
    // 1. Cari UID Admin dulu
    const fetchAdminUid = async () => {
      const q = query(collection(db, 'users'), where('isAdmin', '==', true));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const adminId = snap.docs[0].id;
        
        // 2. Listen ke dokumen admin tersebut secara realtime
        // Ini memastikan jika admin ganti foto/nama, user langsung lihat perubahannya
        const unsubAdmin = onSnapshot(doc(db, 'users', adminId), (docSnap) => {
          if (docSnap.exists()) {
            setAdminProfile({ id: docSnap.id, ...docSnap.data() } as User);
          }
        });
        return unsubAdmin;
      }
    };
    
    // Wrap to handle unsubscribe promise
    let unsubscribe: (() => void) | undefined;
    fetchAdminUid().then(unsub => { unsubscribe = unsub; });

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Translate Helper
  const t = translations[appSettings.language];

  // Helper Function: Resolve Name (Prioritas: Admin Global > Kontak Saya > Phone Number > Fallback)
  const getDisplayName = (targetUid: string, fallbackName?: string, fallbackPhone?: string) => {
    if (targetUid === currentUser?.id) return t.common.you;

    // PRIORITAS UTAMA: Jika target adalah Admin, GUNAKAN profil Admin asli dari DB.
    if (adminProfile && targetUid === adminProfile.id) {
      return adminProfile.name;
    }

    // 2. Cek di Contacts Map (User lain)
    const contact = contactsMap[targetUid];
    
    // 3. Return nama kontak jika ada
    if (contact) return contact.savedName;
    
    // 4. Jika tidak ada di kontak, PRIORITAS tampilkan Nomor HP jika tersedia
    if (fallbackPhone) return fallbackPhone;
    
    // 5. Fallback terakhir (nama default/user name dari chat)
    return fallbackName || 'Pengguna';
  };

  if (!currentUser) return null;

  const handleMenuNavigation = (view: ViewState) => {
    setCurrentView(view);
  };

  const handleBackToChats = () => {
    setSelectedChat(undefined);
    setCurrentView('chats');
  };

  // Logika: Tandai pesan sudah dibaca
  const markChatAsRead = async (chat: ChatPreview) => {
    if (!chat || !currentUser) return;
    
    if (chat.unreadCounts && chat.unreadCounts[currentUser.id] > 0) {
      const chatRef = doc(db, 'chats', chat.id);
      try {
        await updateDoc(chatRef, {
          [`unreadCounts.${currentUser.id}`]: 0
        });
      } catch (err) {
        console.error("Gagal update status baca:", err);
      }
    }
  };

  const handleSelectChat = (chat: ChatPreview) => {
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
      const q = query(
        chatsRef, 
        where('type', '==', 'direct'),
        where('participants', 'array-contains', currentUser.id)
      );
      
      const snapshot = await getDocs(q);
      let existingChat: ChatPreview | undefined;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(contactUid)) {
          existingChat = { 
            id: doc.id, 
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as ChatPreview;
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
          unreadCounts: {
             [currentUser.id]: 0,
             [contactUid]: 0
          },
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          typing: {} 
        };

        const docRef = await addDoc(collection(db, 'chats'), newChatData);
        
        handleSelectChat({
          id: docRef.id,
          ...newChatData,
          updatedAt: new Date(),
        } as ChatPreview);
      }

      setCurrentView('chats');
      setIsMenuOpen(false);

    } catch (error) {
      console.error("Gagal memulai chat:", error);
      alert("Terjadi kesalahan saat membuka obrolan.");
    }
  };

  const isRtl = appSettings.language === 'ar';

  return (
    <div 
      className="flex h-screen w-full bg-cream-50 overflow-hidden font-sans relative text-denim-900" 
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      
      {/* Sidebar Panel Container */}
      <div 
        className={`
          relative flex-col border-e border-cream-200 bg-cream-100 transition-all duration-300 ease-in-out z-20
          ${selectedChat ? 'hidden md:flex' : 'flex'}
          w-full md:w-[380px] lg:w-[420px]
        `}
      >
        <SidebarMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)}
          currentUser={currentUser}
          onNavigate={handleMenuNavigation}
          activeView={currentView}
          appSettings={appSettings}
        />

        {/* Conditional Rendering of Left Panel Content */}
        {currentView === 'chats' ? (
          <ChatList 
            activeChatId={selectedChat?.id}
            onSelectChat={handleSelectChat}
            onOpenMenu={() => setIsMenuOpen(true)}
            onStartChat={handleStartChat}
            contactsMap={contactsMap}
            getDisplayName={getDisplayName}
            appSettings={appSettings}
            adminProfile={adminProfile} // Pass full Admin Profile
          />
        ) : (
          renderSidebarView(
            currentView, 
            handleBackToChats, 
            handleStartChat, 
            handleOpenGroupChat,
            appSettings,
            updateAppSettings
          )
        )}
      </div>

      {/* Main Content Area */}
      <div 
        className={`
          flex-1 flex flex-col bg-cream-50 relative z-10
          ${!selectedChat ? 'hidden md:flex' : 'flex'}
        `}
      >
        {selectedChat ? (
          <ChatWindow 
            chat={selectedChat}
            currentUser={currentUser}
            onBack={() => setSelectedChat(undefined)}
            contactsMap={contactsMap}
            getDisplayName={getDisplayName}
            onStartChat={handleStartChat}
            appSettings={appSettings}
            adminProfile={adminProfile} // Pass full Admin Profile
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-denim-400 select-none p-4 text-center bg-cream-50 pattern-bg">
            <div className="w-24 h-24 bg-cream-100 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-xl shadow-denim-900/5 border border-cream-200">
               <span className="text-4xl filter drop-shadow-sm">🕊️</span>
            </div>
            <h1 className="text-2xl font-bold text-denim-800 mb-2">{t.chatList.title}</h1>
            <p className="max-w-xs text-sm text-denim-500">
              {t.chatList.selectChat}
            </p>
            <div className="mt-8 px-4 py-1.5 bg-cream-100/80 backdrop-blur rounded-full text-[10px] font-medium text-denim-600 border border-cream-200 shadow-sm">
              Terenkripsi • Cepat • Aman
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
