
import React, { useState, useEffect } from 'react';
import { Search, Pin, Menu, Camera, Loader2, MoreVertical, Trash2, CheckSquare, X, Users, User as UserIcon, MessageSquare, Plus, AlertTriangle, BadgeCheck, Settings } from 'lucide-react';
import { ChatPreview, Contact, User, ViewState } from '../types';
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
  adminProfile: User | null;
  onNavigate: (view: ViewState) => void;
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
  adminProfile,
  onNavigate
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
  const [unknownUsersCache, setUnknownUsersCache] = useState<Record<string, User>>({});

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.id), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: ChatPreview[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), updatedAt: doc.data().updatedAt?.toDate() || new Date() } as ChatPreview));
      setChats(fetched);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [currentUser]);
  
  useEffect(() => {
    chats.forEach(chat => {
      if (chat.type === 'direct') {
        const partnerId = chat.participants.find(p => p !== currentUser?.id);
        if (partnerId && !contactsMap[partnerId] && !unknownUsersCache[partnerId] && (!adminProfile || partnerId !== adminProfile.id)) {
           getDoc(doc(db, 'users', partnerId)).then(snap => {
             if (snap.exists()) {
               const data = { id: snap.id, ...snap.data() } as User;
               setUnknownUsersCache(prev => ({...prev, [partnerId]: data}));
             }
           });
        }
      }
    });
  }, [chats, contactsMap, currentUser, adminProfile]);

  useEffect(() => {
    if (showNewChatModal && currentUser && contactsList.length === 0) {
      getDocs(collection(db, 'users', currentUser.id, 'contacts')).then(snap => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)).sort((a, b) => a.savedName.localeCompare(b.savedName));
        setContactsList(list);
      });
    }
  }, [showNewChatModal, currentUser]);

  const getChatDisplayName = (chat: ChatPreview) => {
    if (chat.type === 'group') return chat.name;
    const partnerId = chat.participants.find(p => p !== currentUser?.id);
    if (!partnerId) return chat.name;
    if (adminProfile && partnerId === adminProfile.id) return adminProfile.name;
    if (contactsMap[partnerId]) return contactsMap[partnerId].savedName;
    if (unknownUsersCache[partnerId]) return unknownUsersCache[partnerId].name || unknownUsersCache[partnerId].phoneNumber || chat.name;
    return getDisplayName(partnerId, chat.name, chat.name); 
  };

  const getChatAvatar = (chat: ChatPreview, displayName: string) => {
    if (chat.type === 'group') return chat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`;
    const partnerId = chat.participants.find(p => p !== currentUser?.id);
    if (!partnerId) return chat.avatar;
    
    // PERBAIKAN: Kembalikan adminProfile.avatar, bukan adminProfile.name
    if (adminProfile && partnerId === adminProfile.id) return adminProfile.avatar;
    
    let avatarUrl = contactsMap[partnerId]?.avatar || unknownUsersCache[partnerId]?.avatar || chat.avatar;
    if (!avatarUrl || avatarUrl.includes('ui-avatars.com')) return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;
    return avatarUrl;
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
  const executeDelete = async () => { setIsDeleting(true); try { const batch = writeBatch(db); selectedChatIds.forEach(id => batch.delete(doc(db, 'chats', id))); await batch.commit(); setIsSelectionMode(false); setSelectedChatIds(new Set()); setShowDeleteConfirm(false); } catch (e) { alert("Gagal."); } finally { setIsDeleting(false); } };

  return (
    <div className="flex flex-col h-full bg-cream-50 w-full relative border-e border-cream-200/50 pb-[calc(20px+env(safe-area-inset-bottom))] md:pb-0">
      <div className="px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-2 bg-cream-100/95 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onOpenMenu} className="hidden md:block p-2 -ms-2 text-denim-600 hover:bg-cream-200 rounded-full transition-colors"><Menu size={24} /></button>
            <h1 className="text-xl font-black text-denim-700 tracking-tight font-sans">Hud-Hud</h1>
          </div>
          <div className="relative">
             {isSelectionMode ? (
               <button onClick={toggleSelectionMode} className="text-denim-600 font-medium text-sm px-3 py-1 hover:bg-cream-200 rounded-lg">{t.common.cancel}</button>
             ) : (
               <>
                <button onClick={() => setShowOptionsDropdown(!showOptionsDropdown)} className="p-2 -me-2 text-denim-500 hover:text-denim-700 hover:bg-cream-200 rounded-full transition-colors"><MoreVertical size={20} /></button>
                {showOptionsDropdown && (
                  <div className="absolute end-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-cream-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={() => { onNavigate('settings'); setShowOptionsDropdown(false); }} className="w-full text-start px-4 py-3 text-sm text-denim-800 hover:bg-cream-50 flex items-center gap-2"><Settings size={16} /> {t.settings.title}</button>
                    <button onClick={toggleSelectionMode} className="w-full text-start px-4 py-3 text-sm text-denim-800 hover:bg-cream-50 flex items-center gap-2 border-t border-cream-100"><CheckSquare size={16} /> {t.chatList.selectChat}</button>
                    <button onClick={() => { setIsSelectionMode(true); setSelectedChatIds(new Set(filteredChats.map(c => c.id))); setShowOptionsDropdown(false); }} className="w-full text-start px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 size={16} /> {t.chatList.deleteAll}</button>
                  </div>
                )}
               </>
             )}
          </div>
        </div>
        <div className="relative group mb-3"><Search className="absolute start-3 top-1/2 -translate-y-1/2 text-denim-400" size={18} /><input type="text" placeholder={t.chatList.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-cream-200 text-denim-900 ps-10 pe-4 py-2.5 rounded-xl text-[15px] focus:outline-none focus:ring-1 focus:ring-denim-400 shadow-sm"/></div>
        <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
          {[{ id: 'all', label: t.chatList.tabs.all, icon: MessageSquare }, { id: 'direct', label: t.chatList.tabs.private, icon: UserIcon }, { id: 'group', label: t.chatList.tabs.group, icon: Users }].map((tab) => (
            <button key={tab.id} onClick={() => setFilterType(tab.id as FilterType)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${filterType === tab.id ? 'bg-denim-600 text-white border-denim-600 shadow-sm' : 'bg-white text-denim-500 border-cream-200 hover:bg-cream-100'}`}><tab.icon size={12} />{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-10 pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-denim-400"><Loader2 className="animate-spin mb-2" /><span className="text-xs">{t.common.loading}</span></div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center mt-10 text-denim-400 text-sm px-4"><p>{t.chatList.noChats}</p></div>
        ) : (
          filteredChats.map((chat) => {
            const unreadCount = (chat.unreadCounts && currentUser) ? (chat.unreadCounts[currentUser.id] || 0) : 0;
            const displayName = getChatDisplayName(chat);
            const displayAvatar = getChatAvatar(chat, displayName);
            const partnerId = chat.type === 'direct' ? chat.participants.find(p => p !== currentUser?.id) : '';
            const isVerified = chat.type === 'direct' && adminProfile && partnerId === adminProfile.id;

            return (
              <div key={chat.id} onClick={() => isSelectionMode ? handleSelectChat(chat.id) : onSelectChat(chat)} className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 relative ${activeChatId === chat.id && !isSelectionMode ? 'bg-denim-700 shadow-md' : isSelectionMode && selectedChatIds.has(chat.id) ? 'bg-denim-100' : 'hover:bg-cream-200'}`}>
                {isSelectionMode && (<div className={`w-5 h-5 rounded-md border flex items-center justify-center me-1 transition-colors ${selectedChatIds.has(chat.id) ? 'bg-denim-600 border-denim-600' : 'border-denim-300 bg-white'}`}>{selectedChatIds.has(chat.id) && <CheckSquare size={14} className="text-white" />}</div>)}
                <img src={displayAvatar} className="w-12 h-12 rounded-full object-cover bg-cream-300 border border-black/5"/>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-semibold text-[15px] truncate flex items-center gap-1 ${activeChatId === chat.id && !isSelectionMode ? 'text-white' : 'text-denim-900'}`}>{displayName} {isVerified && <BadgeCheck size={16} className="fill-blue-500" />}</h3>
                    <div className={`text-xs ${activeChatId === chat.id && !isSelectionMode ? 'text-denim-100' : 'text-denim-400'}`}><span>{chat.updatedAt ? format(chat.updatedAt, 'HH:mm') : ''}</span></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`text-[14px] truncate pe-2 ${activeChatId === chat.id && !isSelectionMode ? 'text-denim-100' : 'text-denim-500'}`}>{chat.lastMessage}</div>
                    {unreadCount > 0 && !isSelectionMode && (<span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-bold rounded-full bg-red-500 text-white">{unreadCount}</span>)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isSelectionMode && (<button onClick={() => setShowNewChatModal(true)} className="absolute bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-6 right-6 w-14 h-14 bg-denim-600 hover:bg-denim-700 text-white rounded-full shadow-xl flex items-center justify-center z-20"><Plus size={28} /></button>)}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-cream-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500"><AlertTriangle size={28} /></div>
              <h3 className="text-lg font-bold text-denim-900 mb-2">{t.chatList.deleteConfirmTitle}</h3>
              <p className="text-denim-500 text-sm mb-6">{t.chatList.deleteConfirmMsg.replace('{count}', selectedChatIds.size.toString())}</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl">Batal</button>
                <button onClick={executeDelete} disabled={isDeleting} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl shadow-lg flex items-center justify-center gap-2">{isDeleting && <Loader2 size={16} className="animate-spin" />} {t.common.delete}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewChatModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-denim-900/40 backdrop-blur-sm animate-in fade-in duration-200 pt-[env(safe-area-inset-top)]">
          <div className="bg-cream-50 w-full max-w-sm h-[80%] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            <div className="px-4 py-3 border-b border-cream-200 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-denim-900">{t.chatList.newChat}</h3>
              <button onClick={() => setShowNewChatModal(false)} className="p-1 text-denim-500"><X size={20} /></button>
            </div>
            <div className="p-3 bg-white border-b border-cream-100">
               <div className="relative"><Search className="absolute start-3 top-1/2 -translate-y-1/2 text-denim-400" size={16} /><input type="text" placeholder={t.contacts.search} value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="w-full bg-cream-50 ps-9 pe-4 py-2 rounded-lg text-sm focus:outline-none"/></div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-cream-50 pb-safe">
               {filteredContacts.length === 0 ? (<div className="text-center p-8 text-denim-400 text-sm">{contactSearch ? t.chatList.contactNotFound : t.contacts.newContact}</div>) : (
                 filteredContacts.map(contact => (
                   <div key={contact.id} onClick={() => { onStartChat(contact.uid); setShowNewChatModal(false); }} className="flex items-center gap-3 p-3 hover:bg-white rounded-xl cursor-pointer">
                     <img src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.savedName)}`} className="w-10 h-10 rounded-full object-cover bg-denim-200" />
                     <div><h4 className="text-sm font-bold text-denim-900">{contact.savedName}</h4><p className="text-xs text-denim-500">{contact.phoneNumber}</p></div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
