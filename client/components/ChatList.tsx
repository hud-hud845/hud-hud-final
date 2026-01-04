
import React, { useState, useEffect } from 'react';
import { Search, Pin, Menu, Camera, Loader2, MoreVertical, Trash2, CheckSquare, X, Users, User as UserIcon, MessageSquare, Plus, AlertTriangle, BadgeCheck, Settings, UserCircle } from 'lucide-react';
import { ChatPreview, Contact, User, ViewState } from '../types';
import { format } from 'date-fns';
import { collection, query, where, onSnapshot, doc, writeBatch, getDocs, getDoc, orderBy, deleteDoc } from 'firebase/firestore';
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
  
  const handleSelectChat = (chatId: string) => { 
    const newSelected = new Set(selectedChatIds); 
    if (newSelected.has(chatId)) newSelected.delete(chatId); 
    else newSelected.add(chatId); 
    setSelectedChatIds(newSelected); 
  };

  const executeDelete = async () => { 
    if (selectedChatIds.size === 0) return;
    setIsDeleting(true); 
    try { 
      const batch = writeBatch(db); 
      selectedChatIds.forEach(id => batch.delete(doc(db, 'chats', id))); 
      await batch.commit(); 
      setIsSelectionMode(false); 
      setSelectedChatIds(new Set()); 
      setShowDeleteConfirm(false); 
    } catch (e) { 
      alert("Gagal menghapus obrolan. Periksa koneksi Anda."); 
    } finally { 
      setIsDeleting(false); 
    } 
  };

  return (
    <div className="flex flex-col h-full bg-cream-50 w-full relative border-e border-cream-200/50 pb-[calc(20px+env(safe-area-inset-bottom))] md:pb-0">
      <div className="px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-2 bg-cream-100/95 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            {/* ICON MENU SIDEBAR: DISEMBUNYIKAN PADA MOBILE (MD:FLEX) UNTUK TAMPILAN LEBIH BERSIH */}
            <button 
              onClick={onOpenMenu} 
              className="hidden md:flex p-2 -ms-2 text-denim-600 hover:bg-cream-200 rounded-full transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-black text-denim-700 tracking-tight font-sans">Hud-Hud</h1>
          </div>
          
          <div className="flex items-center gap-2 relative">
             {isSelectionMode ? (
               <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                 <button onClick={toggleSelectionMode} className="text-denim-600 font-bold text-xs uppercase tracking-widest px-3 py-1.5 hover:bg-cream-200 rounded-lg transition-all">{t.common.cancel}</button>
                 {selectedChatIds.size > 0 && (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)} 
                      className="p-2.5 bg-red-500 text-white rounded-full shadow-lg shadow-red-500/20 active:scale-90 transition-all"
                      title="Hapus Terpilih"
                    >
                      <Trash2 size={20} />
                    </button>
                 )}
               </div>
             ) : (
               <>
                {/* ICON PROFILE SAYA - CEPAT */}
                <button 
                  onClick={() => onNavigate('profile')}
                  className="w-10 h-10 bg-cream-300 hover:bg-cream-400 text-denim-700 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 overflow-hidden"
                  title="Profil Saya"
                >
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={22} />
                  )}
                </button>

                {/* TOMBOL SELECT / MORE DENGAN LINGKARAN ABU */}
                <button 
                  onClick={() => setShowOptionsDropdown(!showOptionsDropdown)} 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 ${showOptionsDropdown ? 'bg-denim-600 text-white shadow-denim-600/20' : 'bg-cream-300 hover:bg-cream-400 text-denim-700'}`}
                >
                  <MoreVertical size={22} />
                </button>

                {showOptionsDropdown && (
                  <div className="absolute end-0 top-12 w-52 bg-white rounded-2xl shadow-2xl border border-cream-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                    <button onClick={() => { onNavigate('settings'); setShowOptionsDropdown(false); }} className="w-full text-start px-4 py-3 text-sm font-bold text-denim-800 hover:bg-cream-50 flex items-center gap-3 transition-colors"><Settings size={18} className="text-denim-400" /> {t.settings.title}</button>
                    <button onClick={toggleSelectionMode} className="w-full text-start px-4 py-3 text-sm font-bold text-denim-800 hover:bg-cream-50 flex items-center gap-3 border-t border-cream-100 transition-colors"><CheckSquare size={18} className="text-denim-400" /> {t.chatList.selectChat}</button>
                    <button 
                      onClick={() => { 
                        setIsSelectionMode(true); 
                        setSelectedChatIds(new Set(filteredChats.map(c => c.id))); 
                        setShowOptionsDropdown(false); 
                      }} 
                      className="w-full text-start px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <Trash2 size={18} /> {t.chatList.deleteAll}
                    </button>
                  </div>
                )}
               </>
             )}
          </div>
        </div>
        <div className="relative group mb-3"><Search className="absolute start-3 top-1/2 -translate-y-1/2 text-denim-400" size={18} /><input type="text" placeholder={t.chatList.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-cream-200 text-denim-900 ps-10 pe-4 py-2.5 rounded-xl text-[15px] focus:outline-none focus:ring-1 focus:ring-denim-400 shadow-sm placeholder-denim-300"/></div>
        <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
          {[{ id: 'all', label: t.chatList.tabs.all, icon: MessageSquare }, { id: 'direct', label: t.chatList.tabs.private, icon: UserIcon }, { id: 'group', label: t.chatList.tabs.group, icon: Users }].map((tab) => (
            <button key={tab.id} onClick={() => setFilterType(tab.id as FilterType)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter transition-all whitespace-nowrap border ${filterType === tab.id ? 'bg-denim-700 text-white border-denim-700 shadow-md' : 'bg-white text-denim-500 border-cream-200 hover:bg-cream-100'}`}><tab.icon size={12} />{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-10 pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-denim-400"><Loader2 className="animate-spin mb-2" /><span className="text-xs font-bold uppercase tracking-widest">{t.common.loading}</span></div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center mt-16 px-6">
            <div className="w-16 h-16 bg-cream-200 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50"><MessageSquare size={32} className="text-denim-300"/></div>
            <p className="text-denim-400 text-sm font-bold">{t.chatList.noChats}</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const unreadCount = (chat.unreadCounts && currentUser) ? (chat.unreadCounts[currentUser.id] || 0) : 0;
            const displayName = getChatDisplayName(chat);
            const displayAvatar = getChatAvatar(chat, displayName);
            const isSelected = selectedChatIds.has(chat.id);

            return (
              <div 
                key={chat.id} 
                onClick={() => isSelectionMode ? handleSelectChat(chat.id) : onSelectChat(chat)} 
                className={`group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 relative mb-1 border ${activeChatId === chat.id && !isSelectionMode ? 'bg-denim-700 border-denim-600 shadow-lg -translate-y-0.5' : isSelectionMode && isSelected ? 'bg-denim-100 border-denim-200' : 'hover:bg-white hover:shadow-sm border-transparent'}`}
              >
                {isSelectionMode && (
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center me-1 transition-all shrink-0 ${isSelected ? 'bg-denim-600 border-denim-600 shadow-md' : 'border-denim-300 bg-white'}`}>
                    {isSelected && <CheckSquare size={16} className="text-white" />}
                  </div>
                )}
                <div className="relative shrink-0">
                  <img src={displayAvatar} className="w-12 h-12 rounded-full object-cover bg-cream-300 border border-black/5 shadow-sm"/>
                  {unreadCount > 0 && !isSelectionMode && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-black rounded-full bg-red-500 text-white border-2 border-cream-50 shadow-sm animate-in zoom-in-50">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-black text-[15px] truncate flex items-center gap-1 tracking-tight ${activeChatId === chat.id && !isSelectionMode ? 'text-white' : 'text-denim-900'}`}>{displayName}</h3>
                    <div className={`text-[10px] font-bold ${activeChatId === chat.id && !isSelectionMode ? 'text-denim-200' : 'text-denim-400'}`}>
                      <span>{chat.updatedAt ? format(chat.updatedAt, 'HH:mm') : ''}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`text-[13px] truncate pe-2 font-medium ${activeChatId === chat.id && !isSelectionMode ? 'text-denim-100' : 'text-denim-500'}`}>
                      {chat.lastMessage || (chat.type === 'group' ? 'Grup Baru' : 'Mulai Obrolan')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isSelectionMode && (
        <button 
          onClick={() => setShowNewChatModal(true)} 
          className="absolute bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-8 right-6 w-14 h-14 bg-denim-700 hover:bg-denim-800 text-white rounded-full shadow-2xl flex items-center justify-center z-20 hover:scale-110 active:scale-95 transition-all shadow-denim-900/20"
        >
          <Plus size={28} />
        </button>
      )}

      {/* DIALOG KONFIRMASI HAPUS PESAN MASAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-cream-200 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-black text-denim-900 mb-3 tracking-tight">{t.chatList.deleteConfirmTitle}</h3>
            <p className="text-sm text-denim-500 mb-8 leading-relaxed font-medium">
              {t.chatList.deleteConfirmMsg.replace('{count}', selectedChatIds.size.toString())}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={executeDelete} 
                disabled={isDeleting} 
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl shadow-red-900/10 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {t.common.delete} Obrolan
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                disabled={isDeleting} 
                className="w-full py-3.5 text-denim-400 font-bold rounded-2xl hover:bg-cream-100 transition-colors uppercase tracking-widest text-xs"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewChatModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-denim-900/40 backdrop-blur-sm animate-in fade-in duration-300 pt-[env(safe-area-inset-top)]">
          <div className="bg-cream-50 w-full max-w-sm h-[85%] rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative border border-cream-200">
            <div className="px-6 py-4 border-b border-cream-200 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-black text-denim-900 uppercase tracking-widest text-sm">{t.chatList.newChat}</h3>
              <button onClick={() => setShowNewChatModal(false)} className="p-2 bg-cream-100 rounded-full hover:bg-cream-200 transition-colors text-denim-500"><X size={18} /></button>
            </div>
            <div className="p-4 bg-white border-b border-cream-100 shadow-sm">
               <div className="relative"><Search className="absolute start-4 top-1/2 -translate-y-1/2 text-denim-400" size={18} /><input type="text" placeholder={t.contacts.search} value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="w-full bg-cream-50 border border-cream-200 ps-11 pe-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-denim-400 shadow-inner"/></div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-cream-50 pb-safe">
               {filteredContacts.length === 0 ? (
                 <div className="text-center py-12">
                   <div className="w-12 h-12 bg-cream-200 rounded-2xl flex items-center justify-center mx-auto mb-3 opacity-60"><UserIcon size={24} className="text-denim-300" /></div>
                   <p className="text-denim-400 text-xs font-bold uppercase tracking-widest">{contactSearch ? t.chatList.contactNotFound : t.contacts.newContact}</p>
                 </div>
               ) : (
                 filteredContacts.map(contact => (
                   <div key={contact.id} onClick={() => { onStartChat(contact.uid); setShowNewChatModal(false); }} className="flex items-center gap-4 p-3.5 hover:bg-white hover:shadow-sm rounded-2xl cursor-pointer transition-all mb-1 border border-transparent hover:border-cream-200 group">
                     <img src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.savedName)}`} className="w-11 h-11 rounded-full object-cover bg-denim-100 border border-black/5 group-hover:scale-105 transition-transform" />
                     <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-black text-denim-900 truncate tracking-tight">{contact.savedName}</h4>
                       <p className="text-[11px] text-denim-400 font-bold uppercase tracking-tighter mt-0.5">{contact.phoneNumber}</p>
                     </div>
                     <ChevronRight size={16} className="text-denim-200 opacity-0 group-hover:opacity-100 transition-opacity" />
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

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
);
