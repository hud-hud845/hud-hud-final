
import React, { useState, useEffect } from 'react';
import { Search, Pin, Menu, Camera, Loader2, MoreVertical, Trash2, CheckSquare, X, Users, User as UserIcon, MessageSquare, Plus, AlertTriangle, BadgeCheck } from 'lucide-react';
import { ChatPreview, Contact, User } from '../types';
import { format } from 'date-fns';
import { collection, query, where, onSnapshot, doc, writeBatch, getDocs, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { AppSettings } from './Layout';
import { translations } from '../utils/translations';

interface ChatListProps {
  activeChatId?: string;
  onSelectChat: (chat: ChatPreview) => void;
  onOpenMenu: () => void;
  onStartChat: (contactUid: string) => void;
  contactsMap: Record<string, Contact>;
  getDisplayName: (uid: string, fallbackName?: string, fallbackPhone?: string) => string;
  appSettings: AppSettings;
  adminProfile: User | null; // Receive full admin profile
}

type FilterType = 'all' | 'direct' | 'group';

export const ChatList: React.FC<ChatListProps> = ({ 
  activeChatId, 
  onSelectChat, 
  onOpenMenu, 
  onStartChat,
  contactsMap,
  getDisplayName,
  appSettings,
  adminProfile
}) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[appSettings.language];
  
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Cache for unknown user phones
  const [unknownUserPhones, setUnknownUserPhones] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentUser) return;
    
    // QUERY OPTIMIZED: Menggunakan orderBy('updatedAt', 'desc')
    // Ini mewajibkan adanya INDEX Composite di Firestore:
    // Collection: chats
    // Fields: participants (Arrays) + updatedAt (Descending)
    const q = query(
      collection(db, 'chats'), 
      where('participants', 'array-contains', currentUser.id),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats: ChatPreview[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ChatPreview;
      });
      // Sorting di sini tidak diperlukan lagi karena sudah di-handle oleh Firestore (orderBy),
      // tapi kita biarkan sebagai fallback aman.
      // fetchedChats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      setChats(fetchedChats);
      setLoading(false);
    }, (error) => { 
      console.error("Error fetching chats:", error);
      // Jika error index, stop loading agar user tidak stuck
      if (error.code === 'failed-precondition') {
         console.log("INDEX DIPERLUKAN! Buka link di console log di atas untuk membuatnya otomatis.");
      }
      setLoading(false); 
    });
    return () => unsubscribe();
  }, [currentUser]);
  
  // Effect to fetch phone numbers for non-contacts
  useEffect(() => {
    chats.forEach(chat => {
      if (chat.type === 'direct') {
        const partnerId = chat.participants.find(p => p !== currentUser?.id);
        if (partnerId && !contactsMap[partnerId] && !unknownUserPhones[partnerId] && (!adminProfile || partnerId !== adminProfile.id)) {
           // Fetch user data once
           getDoc(doc(db, 'users', partnerId)).then(snap => {
             if (snap.exists()) {
               const data = snap.data();
               if (data.phoneNumber) {
                 setUnknownUserPhones(prev => ({...prev, [partnerId]: data.phoneNumber}));
               }
             }
           });
        }
      }
    });
  }, [chats, contactsMap, currentUser, adminProfile]);

  useEffect(() => {
    if (showNewChatModal && currentUser && contactsList.length === 0) {
      const fetchContacts = async () => {
        const snap = await getDocs(collection(db, 'users', currentUser.id, 'contacts'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
        list.sort((a, b) => a.savedName.localeCompare(b.savedName));
        setContactsList(list);
      };
      fetchContacts();
    }
  }, [showNewChatModal, currentUser]);

  // Helper untuk mendapatkan nama partner di list chat
  const getChatDisplayName = (chat: ChatPreview) => {
    if (chat.type === 'group') return chat.name;
    const partnerId = chat.participants.find(p => p !== currentUser?.id);
    if (!partnerId) return chat.name;

    // Jika partner adalah Admin, gunakan nama dari adminProfile (Realtime)
    if (adminProfile && partnerId === adminProfile.id) {
       return adminProfile.name;
    }

    // Use fetched phone if available and not in contacts
    const fallback = unknownUserPhones[partnerId] || chat.name;
    return getDisplayName(partnerId, fallback, fallback); 
  };

  const filteredChats = chats.filter(c => {
    const displayName = getChatDisplayName(c);
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) || c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' ? true : filterType === 'group' ? c.type === 'group' : c.type === 'direct';
    return matchesSearch && matchesType;
  });

  const filteredContacts = contactsList.filter(c => c.savedName.toLowerCase().includes(contactSearch.toLowerCase()) || c.phoneNumber.includes(contactSearch));

  const toggleSelectionMode = () => { setIsSelectionMode(!isSelectionMode); setSelectedChatIds(new Set()); setShowOptionsDropdown(false); };
  const handleSelectChat = (chatId: string) => { const newSelected = new Set(selectedChatIds); if (newSelected.has(chatId)) newSelected.delete(chatId); else newSelected.add(chatId); setSelectedChatIds(newSelected); };
  const confirmDelete = () => { if (selectedChatIds.size > 0) setShowDeleteConfirm(true); };
  const executeDelete = async () => { setIsDeleting(true); try { const batch = writeBatch(db); selectedChatIds.forEach(id => { const docRef = doc(db, 'chats', id); batch.delete(docRef); }); await batch.commit(); setIsSelectionMode(false); setSelectedChatIds(new Set()); setShowDeleteConfirm(false); } catch (error) { alert("Gagal menghapus chat."); } finally { setIsDeleting(false); } };
  const handleSelectAll = () => { if (selectedChatIds.size === filteredChats.length) setSelectedChatIds(new Set()); else setSelectedChatIds(new Set(filteredChats.map(c => c.id))); setShowOptionsDropdown(false); };

  const getTypingStatus = (chat: ChatPreview) => {
    if (!chat.typing) return null;
    const now = Date.now();
    const typingUsers = Object.entries(chat.typing).filter(([uid, timestamp]) => {
      if (uid === currentUser?.id) return false;
      const time = timestamp?.toMillis ? timestamp.toMillis() : timestamp?.getTime ? timestamp.getTime() : 0;
      return (now - time) < 3000;
    });
    if (typingUsers.length > 0) return typingUsers.length === 1 ? t.common.typing : `${typingUsers.length} ${t.common.typingMulti}`;
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-cream-50 w-full relative border-e border-cream-200/50">
      <div className="px-4 pt-4 pb-2 bg-cream-100/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onOpenMenu} className="p-2 -ms-2 text-denim-600 hover:bg-cream-200 rounded-full transition-colors"><Menu size={24} /></button>
            <h1 className="text-xl font-bold text-denim-900 tracking-tight font-sans">{t.chatList.title}</h1>
          </div>
          <div className="relative">
             {isSelectionMode ? (
               <button onClick={toggleSelectionMode} className="text-denim-600 font-medium text-sm px-3 py-1 hover:bg-cream-200 rounded-lg">{t.common.cancel}</button>
             ) : (
               <>
                <button onClick={() => setShowOptionsDropdown(!showOptionsDropdown)} className="p-2 -me-2 text-denim-500 hover:text-denim-700 hover:bg-cream-200 rounded-full transition-colors"><MoreVertical size={20} /></button>
                {showOptionsDropdown && (
                  <div className="absolute end-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-cream-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={toggleSelectionMode} className="w-full text-start px-4 py-3 text-sm text-denim-800 hover:bg-cream-50 flex items-center gap-2"><CheckSquare size={16} /> {t.chatList.selectChat}</button>
                    <button onClick={() => { setIsSelectionMode(true); handleSelectAll(); setShowOptionsDropdown(false); }} className="w-full text-start px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 size={16} /> {t.chatList.deleteAll}</button>
                  </div>
                )}
               </>
             )}
          </div>
        </div>
        <div className="relative group mb-3"><Search className="absolute start-3 top-1/2 -translate-y-1/2 text-denim-400 group-focus-within:text-denim-600 transition-colors" size={18} /><input type="text" placeholder={t.chatList.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-cream-200 text-denim-900 ps-10 pe-4 py-2.5 rounded-xl text-[15px] focus:outline-none focus:ring-1 focus:ring-denim-400 focus:bg-white transition-all placeholder-denim-300 shadow-sm"/></div>
        <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
          {[{ id: 'all', label: t.chatList.tabs.all, icon: MessageSquare }, { id: 'direct', label: t.chatList.tabs.private, icon: UserIcon }, { id: 'group', label: t.chatList.tabs.group, icon: Users }].map((tab) => (
            <button key={tab.id} onClick={() => setFilterType(tab.id as FilterType)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${filterType === tab.id ? 'bg-denim-600 text-white border-denim-600 shadow-sm' : 'bg-white text-denim-500 border-cream-200 hover:bg-cream-100'}`}><tab.icon size={12} />{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-20 pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-denim-400"><Loader2 className="animate-spin mb-2" /><span className="text-xs">{t.common.loading}</span></div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center mt-10 text-denim-400 text-sm px-4"><p>{t.chatList.noChats}</p></div>
        ) : (
          filteredChats.map((chat) => {
            const unreadCount = (chat.unreadCounts && currentUser) ? (chat.unreadCounts[currentUser.id] || 0) : 0;
            const displayName = getChatDisplayName(chat);
            
            let partnerId = '';
            if (chat.type === 'direct') {
               const foundPartnerId = chat.participants.find(p => p !== currentUser?.id);
               if (foundPartnerId) partnerId = foundPartnerId;
            }

            const typingText = getTypingStatus(chat);
            
            // VERIFIKASI ADMIN: Berdasarkan UID di adminProfile
            const isVerified = chat.type === 'direct' && adminProfile && partnerId === adminProfile.id;

            // Foto Profil: Jika verified (Admin), gunakan foto asli adminProfile
            const displayAvatar = isVerified && adminProfile ? adminProfile.avatar : chat.avatar;

            return (
              <div key={chat.id} onClick={() => isSelectionMode ? handleSelectChat(chat.id) : onSelectChat(chat)} className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 relative ${activeChatId === chat.id && !isSelectionMode ? 'bg-denim-700 shadow-md shadow-denim-700/20' : isSelectionMode && selectedChatIds.has(chat.id) ? 'bg-denim-100' : 'hover:bg-cream-200'}`}>
                {isSelectionMode && (<div className={`w-5 h-5 rounded-md border flex items-center justify-center me-1 transition-colors ${selectedChatIds.has(chat.id) ? 'bg-denim-600 border-denim-600' : 'border-denim-300 bg-white'}`}>{selectedChatIds.has(chat.id) && <CheckSquare size={14} className="text-white" />}</div>)}
                <div className="relative shrink-0"><img src={displayAvatar} alt={displayName} className="w-12 h-12 rounded-full object-cover bg-cream-300 border border-black/5"/></div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-semibold text-[15px] truncate flex items-center gap-1 ${activeChatId === chat.id && !isSelectionMode ? 'text-white' : 'text-denim-900'}`}>
                      {displayName}
                      {isVerified && <BadgeCheck size={16} className={`fill-blue-500 ${activeChatId === chat.id && !isSelectionMode ? 'text-denim-700' : 'text-white'}`} />}
                    </h3>
                    <div className={`flex items-center gap-1 text-xs ${activeChatId === chat.id && !isSelectionMode ? 'text-denim-100' : 'text-denim-400'}`}>{chat.isPinned && <Pin size={12} className="rotate-45" />}<span>{chat.updatedAt ? format(chat.updatedAt, 'HH:mm') : ''}</span></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`text-[14px] truncate pe-2 flex items-center gap-1 ${activeChatId === chat.id && !isSelectionMode ? 'text-denim-100' : 'text-denim-500 group-hover:text-denim-600'} ${typingText ? 'text-green-600 font-medium italic' : ''}`}>
                      {typingText ? (<span>{typingText}</span>) : (<>{chat.lastMessageType === 'image' && <Camera size={14} />}<span className="truncate">{chat.lastMessage}</span></>)}
                    </div>
                    {unreadCount > 0 && !isSelectionMode && (<span className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-bold rounded-full shadow-sm ${activeChatId === chat.id ? 'bg-white text-denim-700' : 'bg-green-500 text-white'}`}>{unreadCount}</span>)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {!isSelectionMode && (<button onClick={() => setShowNewChatModal(true)} className="absolute bottom-6 right-6 rtl:left-6 rtl:right-auto w-14 h-14 bg-denim-600 hover:bg-denim-700 text-white rounded-full shadow-xl shadow-denim-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20"><Plus size={28} /></button>)}
      {/* ... (Bottom Action Bar and Modals same as before) ... */}
      {isSelectionMode && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-cream-200 p-3 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-20 animate-in slide-in-from-bottom-4 duration-200">
           <div className="flex justify-between items-center">
             <span className="text-sm font-medium text-denim-700 ms-2">
               {selectedChatIds.size} {t.chatList.selectChat}
             </span>
             <div className="flex gap-3">
               <button 
                 onClick={handleSelectAll}
                 className="px-4 py-2 text-xs font-medium text-denim-600 hover:bg-cream-100 rounded-lg transition-colors"
               >
                 {t.chatList.tabs.all}
               </button>
               <button 
                 onClick={confirmDelete}
                 disabled={selectedChatIds.size === 0}
                 className="px-4 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Trash2 size={14} /> {t.common.delete}
               </button>
             </div>
           </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-cream-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-lg font-bold text-denim-900 mb-2">{t.chatList.deleteConfirmTitle}</h3>
              <p className="text-denim-500 text-sm mb-6 leading-relaxed">
                {t.chatList.deleteConfirmMsg.replace('{count}', selectedChatIds.size.toString())}
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-cream-100 hover:bg-cream-200 text-denim-700 font-medium rounded-xl transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button 
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 size={16} className="animate-spin" />}
                  {t.common.delete}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewChatModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-denim-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cream-50 w-full max-w-sm h-[80%] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            <div className="px-4 py-3 border-b border-cream-200 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-denim-900">{t.chatList.newChat}</h3>
              <button 
                onClick={() => setShowNewChatModal(false)}
                className="p-1 hover:bg-cream-100 rounded-full text-denim-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 bg-white border-b border-cream-100">
               <div className="relative">
                 <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-denim-400" size={16} />
                 <input 
                   type="text"
                   placeholder={t.contacts.search}
                   value={contactSearch}
                   onChange={(e) => setContactSearch(e.target.value)}
                   className="w-full bg-cream-50 ps-9 pe-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500"
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-cream-50">
               {filteredContacts.length === 0 ? (
                 <div className="text-center p-8 text-denim-400 text-sm">
                   {contactSearch ? t.chatList.contactNotFound : t.contacts.newContact}
                 </div>
               ) : (
                 filteredContacts.map(contact => {
                   const isContactVerified = adminProfile && contact.uid === adminProfile.id;
                   const displayName = isContactVerified ? adminProfile!.name : contact.savedName;
                   const displayAvatar = isContactVerified ? adminProfile!.avatar : contact.avatar;

                   return (
                     <div 
                       key={contact.id}
                       onClick={() => {
                          onStartChat(contact.uid);
                          setShowNewChatModal(false);
                       }}
                       className="flex items-center gap-3 p-3 hover:bg-white rounded-xl cursor-pointer transition-colors border border-transparent hover:border-cream-200"
                     >
                       <img src={displayAvatar} className="w-10 h-10 rounded-full object-cover bg-denim-200" />
                       <div>
                         <h4 className="text-sm font-bold text-denim-900 flex items-center gap-1">
                            {displayName}
                            {isContactVerified && <BadgeCheck size={14} className="text-white fill-blue-500" />}
                         </h4>
                         <p className="text-xs text-denim-500">{contact.phoneNumber}</p>
                       </div>
                     </div>
                   );
                 })
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
