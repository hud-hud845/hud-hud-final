
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Search, UserPlus, Bell, Lock, Smartphone, 
  Monitor, ChevronRight, HelpCircle, FileText, MessageCircle, 
  Camera, Save, LogOut, CheckSquare, Trash2, X, Plus, Loader2, Settings, UserMinus, AlertTriangle, Key, Mail, Palette, Type, Globe, Database, Wifi, Signal, Send, Radio,
  Heart, Image as ImageIcon, MessageCircle as MessageIcon, MoreHorizontal, CheckCircle2, User as UserIcon,
  Activity, MapPin, Edit, CornerDownRight, MoreVertical, BadgeCheck, MessageSquare, Users, Eye, EyeOff, Upload,
  ChevronDown, UserMinus as UserMinusIcon
} from 'lucide-react';
import { ViewState, Contact, ChatPreview, User, Message, Status, Comment, Notification } from '../types';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, onSnapshot, deleteDoc, doc, writeBatch, serverTimestamp, updateDoc, arrayUnion, arrayRemove, getDoc, orderBy, Timestamp, increment } from 'firebase/firestore';
import { ref, push, set, onValue, remove, update, serverTimestamp as rtdbTimestamp, query as rtdbQuery, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { db, rtdb } from '../services/firebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { AppSettings } from './Layout';
import { translations } from '../utils/translations';
import { format } from 'date-fns';

interface SidebarViewProps {
  onBack: () => void;
  onStartChat?: (contactUid: string) => void;
  onOpenGroupChat?: (chat: ChatPreview) => void;
  appSettings?: AppSettings;
  updateAppSettings?: (settings: Partial<AppSettings>) => void;
  contactsMap?: Record<string, Contact>;
  adminProfile?: User | null;
  onNavigate?: (view: ViewState) => void;
  setTargetStatusId?: (id: string | null) => void;
  targetStatusId?: string | null;
}

const ViewHeader: React.FC<{ 
  title: string; 
  onBack: () => void; 
  rightAction?: React.ReactNode 
}> = ({ title, onBack, rightAction }) => (
  <div className="h-[60px] px-4 pt-[calc(0rem+env(safe-area-inset-top))] flex items-center justify-between bg-cream-50 border-b border-cream-200 sticky top-0 z-10 text-denim-800 shrink-0 box-content">
    <div className="flex items-center gap-4">
      <button onClick={onBack} className="p-2 -ms-2 text-denim-500 hover:bg-cream-200 rounded-full transition-colors"><ArrowLeft size={20} className="rtl:rotate-180" /></button>
      <h2 className="text-lg font-semibold text-denim-900">{title}</h2>
    </div>
    <div className="flex items-center gap-1">
      {rightAction}
    </div>
  </div>
);

// --- NOTIFICATIONS VIEW ---
export const NotificationsView: React.FC<SidebarViewProps> = ({ onBack, appSettings, onNavigate, setTargetStatusId }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[appSettings?.language || 'id'];

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    
    const notifRef = ref(rtdb, `notifications/${currentUser.id}`);
    const unsubscribe = onValue(notifRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list = Object.entries(val).map(([id, data]: [string, any]) => ({
          id,
          ...data,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
        })).sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
        
        setNotifications(list);
        
        const unreadIds = Object.entries(val).filter(([id, data]: [string, any]) => !data.read).map(([id]) => id);
        if (unreadIds.length > 0) {
           const updates: any = {};
           unreadIds.forEach(id => { updates[`notifications/${currentUser.id}/${id}/read`] = true; });
           setTimeout(() => update(ref(rtdb), updates), 3000);
        }
      } else {
        setNotifications([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleNotificationClick = (notif: Notification) => {
    update(ref(rtdb, `notifications/${currentUser?.id}/${notif.id}`), { read: true });
    if (setTargetStatusId && onNavigate) {
      setTargetStatusId(notif.statusId);
      onNavigate('status'); 
    }
  };

  const getTimeAgo = (timestamp: any) => { if (!timestamp) return ''; return format(timestamp, 'HH:mm • dd MMM'); };
  
  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title={t.notifications.title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 pb-24 md:pb-0">
        {loading ? ( <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div> ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-denim-400 h-64">
            <div className="w-16 h-16 bg-cream-200 rounded-full flex items-center justify-center mb-3"><Bell size={32} className="text-denim-300" /></div>
            <p className="font-medium text-sm text-denim-500">{t.notifications.empty}</p>
          </div>
        ) : (
          <div className="divide-y divide-cream-200">
            {notifications.map(notif => (
              <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-4 flex gap-3 cursor-pointer transition-all duration-300 relative border-s-4 ${!notif.read ? 'bg-denim-50 border-denim-500' : 'bg-white border-transparent hover:bg-cream-50'}`}>
                <div className="relative shrink-0">
                  <img src={notif.senderAvatar} className="w-12 h-12 rounded-full object-cover border border-cream-200" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.senderName)}&background=random&color=fff`; }}/>
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white flex items-center justify-center ${notif.type === 'like' ? 'bg-red-500' : 'bg-green-500'}`}>{notif.type === 'like' ? <Heart size={10} className="text-white fill-white"/> : <MessageCircle size={10} className="text-white fill-white"/>}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-denim-900 leading-snug"><span className="font-bold">{notif.senderName}</span> {notif.type === 'like' ? t.notifications.liked : notif.type === 'reply' ? "membalas komentar Anda:" : t.notifications.commented}{notif.previewText && (<span className="block text-denim-600 italic truncate mt-1 bg-white/50 p-1.5 rounded border border-denim-100 text-xs">"{notif.previewText}"</span>)}</p>
                  <p className={`text-[10px] mt-1.5 flex items-center gap-1.5 ${!notif.read ? 'text-denim-600 font-bold' : 'text-denim-400'}`}>{getTimeAgo(notif.createdAt)}{!notif.read && <span className="w-1.5 h-1.5 bg-denim-600 rounded-full"></span>}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- STATUS VIEW ---
export const StatusView: React.FC<SidebarViewProps> = ({ onBack, appSettings, contactsMap, adminProfile, onNavigate, targetStatusId, setTargetStatusId }) => {
    const { currentUser } = useAuth();
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pageSize, setPageSize] = useState(25);
    const [hasMore, setHasMore] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isEditingStatus, setIsEditingStatus] = useState<string | null>(null);
    const [statusText, setStatusText] = useState('');
    const [statusImage, setStatusImage] = useState<File | null>(null);
    const [statusImagePreview, setStatusImagePreview] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeMenuStatusId, setActiveMenuStatusId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [activeCommentStatusId, setActiveCommentStatusId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{id: string, name: string, text: string, userId: string} | null>(null);
    const [zoomImage, setZoomImage] = useState<string | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoUser, setInfoUser] = useState<User | null>(null);
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [newContactName, setNewContactName] = useState('');
    const t = translations[appSettings?.language || 'id'];
    const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); };

    useEffect(() => {
      setLoading(true);
      const statusesRef = rtdbQuery(ref(rtdb, 'statuses'), orderByChild('createdAt'), limitToLast(pageSize));
      const unsubscribe = onValue(statusesRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.entries(val).map(([id, data]: [string, any]) => ({
            id,
            ...data,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            likes: data.likes ? Object.keys(data.likes) : []
          }));
          const reversed = list.sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
          const contactStatuses = reversed.filter(s => contactsMap && contactsMap[s.userId]);
          const otherStatuses = reversed.filter(s => !contactsMap || !contactsMap[s.userId]);
          const sortedResult = [...contactStatuses, ...otherStatuses];
          setStatuses(sortedResult);
          setHasMore(list.length >= pageSize);
        } else {
          setStatuses([]);
          setHasMore(false);
        }
        setLoading(false);
        setLoadingMore(false);
      });
      return () => unsubscribe();
    }, [pageSize, contactsMap]);

    useEffect(() => {
      if (activeCommentStatusId) {
        const commentsRef = ref(rtdb, `comments/${activeCommentStatusId}`);
        const unsub = onValue(commentsRef, (snapshot) => {
          const val = snapshot.val();
          if (val) { setComments(Object.entries(val).map(([id, data]: [string, any]) => ({ id, ...data })).sort((a, b) => a.createdAt - b.createdAt)); }
          else { setComments([]); }
        });
        return () => unsub();
      }
    }, [activeCommentStatusId]);

    useEffect(() => {
        if (targetStatusId && !loading) {
            const el = document.getElementById(`status-${targetStatusId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-denim-500', 'ring-offset-2');
                setTimeout(() => {
                    el.classList.remove('ring-2', 'ring-denim-500', 'ring-offset-2');
                    if (setTargetStatusId) setTargetStatusId(null);
                }, 3000);
            }
        }
    }, [targetStatusId, loading]);

    const handleLoadMore = () => { setLoadingMore(true); setPageSize(prev => prev + 25); };

    const handleSubmitStatus = async () => {
      if (!statusText && !statusImage && !statusImagePreview) return;
      setIsPosting(true);
      try {
          let imageUrl = statusImagePreview || '';
          if (statusImage) imageUrl = await uploadImageToCloudinary(statusImage);
          if (isEditingStatus) { await update(ref(rtdb, `statuses/${isEditingStatus}`), { content: statusText, imageUrl, updatedAt: Date.now() }); showToast("Status diperbarui"); }
          else {
              const newRef = push(ref(rtdb, 'statuses'));
              await set(newRef, { userId: currentUser!.id, author: { name: currentUser!.name, avatar: currentUser!.avatar, isAdmin: currentUser!.isAdmin || false }, content: statusText, imageUrl, createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000), commentsCount: 0 });
              showToast("Status dikirim");
          }
          setShowCreateModal(false); setIsEditingStatus(null); setStatusText(''); setStatusImage(null); setStatusImagePreview(null);
      } catch (error) { alert("Error memproses status"); } finally { setIsPosting(false); }
    };

    const handleLike = async (statusId: string, currentLikes: string[], ownerId: string) => {
        if (!currentUser) return;
        const isLiked = currentLikes.includes(currentUser.id);
        const likeRef = ref(rtdb, `statuses/${statusId}/likes/${currentUser.id}`);
        if (isLiked) await remove(likeRef);
        else {
          await set(likeRef, true);
          if (currentUser.id !== ownerId) {
             const nRef = push(ref(rtdb, `notifications/${ownerId}`));
             await set(nRef, { id: nRef.key, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar, type: 'like', statusId, previewText: '', read: false, createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000) });
          }
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !activeCommentStatusId || !currentUser) return;
        setSendingComment(true);
        try {
            const commentRef = push(ref(rtdb, `comments/${activeCommentStatusId}`));
            await set(commentRef, { userId: currentUser.id, userName: currentUser.name, userAvatar: currentUser.avatar, isAdmin: currentUser.isAdmin || false, text: commentText, createdAt: Date.now(), replyTo: replyingTo ? { userName: replyingTo.name, text: replyingTo.text } : null });
            const target = statuses.find(s => s.id === activeCommentStatusId);
            if (target) {
                await update(ref(rtdb, `statuses/${activeCommentStatusId}`), { commentsCount: (target.commentsCount || 0) + 1 });
                if (target.userId !== currentUser.id) {
                    const nRef = push(ref(rtdb, `notifications/${target.userId}`));
                    await set(nRef, { id: nRef.key, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar, type: 'comment', statusId: activeCommentStatusId, previewText: commentText, read: false, createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000) });
                }
                if (replyingTo && replyingTo.userId !== currentUser.id && replyingTo.userId !== target.userId) {
                    const nRef = push(ref(rtdb, `notifications/${replyingTo.userId}`));
                    await set(nRef, { id: nRef.key, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar, type: 'reply', statusId: activeCommentStatusId, previewText: commentText, read: false, createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000) });
                }
            }
            setCommentText(''); setReplyingTo(null);
        } finally { setSendingComment(false); }
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.id) return;
        await remove(ref(rtdb, `statuses/${deleteConfirm.id}`)); 
        await remove(ref(rtdb, `comments/${deleteConfirm.id}`)); 
        showToast("Status dihapus"); setDeleteConfirm({ isOpen: false, id: null });
    };

    const handleUserClick = async (uid: string) => {
        if (uid === currentUser?.id) { onNavigate && onNavigate('my_status'); return; }
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) { setInfoUser({ id: snap.id, ...snap.data() } as User); setShowInfoModal(true); }
    };

    const handleAddContact = async () => {
        if (!infoUser || !currentUser || !newContactName) return;
        await addDoc(collection(db, 'users', currentUser.id, 'contacts'), { uid: infoUser.id, savedName: newContactName, phoneNumber: infoUser.phoneNumber || '', avatar: infoUser.avatar || '' });
        alert("Kontak disimpan!"); setIsAddingContact(false); setShowInfoModal(false); 
    };

    const filteredStatuses = statuses.filter(s => 
      s.author.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.content && s.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
        <ViewHeader 
          title={t.status.title} 
          onBack={onBack} 
          rightAction={(
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setIsEditingStatus(null); setStatusText(''); setStatusImagePreview(null); setShowCreateModal(true); }}
                className="p-2 hover:bg-cream-200 rounded-full text-denim-600 transition-colors"
                title="Status Baru"
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-2 hover:bg-cream-200 rounded-full transition-colors ${isSearchOpen ? 'text-denim-900 bg-cream-200' : 'text-denim-600'}`}
                title="Cari"
              >
                <Search size={22} strokeWidth={2.5} />
              </button>
            </div>
          )}
        />
        
        {/* Dropdown Input Pencarian */}
        {isSearchOpen && (
          <div className="px-4 py-3 bg-white border-b border-cream-200 shadow-sm animate-in slide-in-from-top-2 duration-200 z-20">
             <div className="relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-denim-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Cari kata kunci, caption, atau username..." 
                 value={searchTerm} 
                 onChange={(e) => setSearchTerm(e.target.value)} 
                 className="w-full bg-cream-50 border border-cream-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-denim-500 transition-all placeholder-denim-300"
                 autoFocus
               />
               {searchTerm && (
                 <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-cream-200 rounded-full text-denim-600">
                   <X size={12} />
                 </button>
               )}
             </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 pb-32 md:pb-0">
           <div className="bg-white p-4 mb-2 border-b border-cream-200 shadow-sm">
             <div className="flex gap-3 items-center">
               <img src={currentUser?.avatar} className="w-10 h-10 rounded-full bg-denim-100 object-cover border border-cream-200 cursor-pointer" onClick={() => onNavigate && onNavigate('my_status')} />
               <div onClick={() => { setIsEditingStatus(null); setStatusText(''); setStatusImagePreview(null); setShowCreateModal(true); }} className="flex-1 bg-cream-50 hover:bg-cream-100 rounded-full px-4 py-2.5 cursor-pointer border border-cream-200 transition-colors">
                 <span className="text-denim-400 text-sm">{t.status.placeholder}</span>
               </div>
               <button onClick={() => { setIsEditingStatus(null); setStatusText(''); setStatusImagePreview(null); setShowCreateModal(true); setTimeout(() => fileInputRef.current?.click(), 100); }} className="text-green-600 hover:bg-green-50 p-2 rounded-full">
                 <ImageIcon size={24}/>
               </button>
             </div>
           </div>
           
           {loading && pageSize === 25 ? ( 
               <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div> 
           ) : filteredStatuses.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-10 text-denim-400 h-64">
                 <Activity size={32} className="text-denim-300 mb-3" />
                 <p className="font-medium text-sm">Tidak ada status ditemukan</p>
               </div>
           ) : (
               <div className="space-y-3 pb-4 px-2">
                   {filteredStatuses.map(status => {
                       const isLiked = status.likes.includes(currentUser!.id);
                       const isOwner = status.userId === currentUser!.id;
                       const isContact = contactsMap && contactsMap[status.userId];
                       return (
                           <div key={status.id} id={`status-${status.id}`} className={`bg-white border border-cream-200 rounded-2xl shadow-sm animate-in fade-in duration-300 relative transition-all overflow-hidden ${isContact ? 'border-denim-200 ring-1 ring-denim-50' : ''}`}>
                               <div className="p-3 flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                     <div className="relative cursor-pointer" onClick={() => handleUserClick(status.userId)}>
                                       <img src={status.author.avatar} className="w-10 h-10 rounded-full border border-cream-100 object-cover"/>
                                       <div className="absolute -bottom-1 -right-1 bg-denim-600 rounded-full p-0.5 border-2 border-white"><Globe size={10} className="text-white"/></div>
                                     </div>
                                     <div>
                                       <h4 className="font-bold text-denim-900 text-sm leading-tight flex items-center gap-1 cursor-pointer hover:underline" onClick={() => handleUserClick(status.userId)}>
                                         {status.author.name}
                                         {status.author.isAdmin && <BadgeCheck size={14} className="text-white fill-blue-500" />}
                                         {isContact && <span className="text-[9px] bg-denim-100 text-denim-600 px-1.5 rounded-full border border-denim-200 ms-1 uppercase font-bold">Kontak</span>}
                                       </h4>
                                       <p className="text-[11px] text-denim-400 leading-tight mt-0.5">{status.createdAt ? format(status.createdAt, 'HH:mm • dd MMM') : ''} • Public</p>
                                     </div>
                                   </div>
                                   {isOwner && (
                                     <div className="relative">
                                       <button onClick={(e) => { e.stopPropagation(); setActiveMenuStatusId(activeMenuStatusId === status.id ? null : status.id); }} className="text-denim-300 hover:text-denim-600 p-2 rounded-full hover:bg-cream-50 transition-colors">
                                         <MoreHorizontal size={20} />
                                       </button>
                                       {activeMenuStatusId === status.id && (
                                         <div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-xl border border-cream-200 z-20 animate-in zoom-in-95 origin-top-right overflow-hidden">
                                           <button onClick={() => { setStatusText(status.content || ''); setStatusImagePreview(status.imageUrl || null); setIsEditingStatus(status.id); setActiveMenuStatusId(null); setShowCreateModal(true); }} className="w-full px-4 py-3 text-left text-sm text-denim-700 hover:bg-cream-50 flex items-center gap-2"><Edit size={16}/> Edit Status</button>
                                           <button onClick={() => { setActiveMenuStatusId(null); setDeleteConfirm({ isOpen: true, id: status.id }); }} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-cream-100"><Trash2 size={16}/> Hapus Status</button>
                                         </div>
                                       )}
                                     </div>
                                   )}
                               </div>
                               {status.content && <div className={`px-4 pb-2 ${status.imageUrl ? 'text-sm' : 'text-lg py-2'} text-denim-900 whitespace-pre-wrap leading-relaxed font-medium`}>{status.content}</div>}
                               {status.imageUrl && ( <div className="w-full bg-cream-50 border-t border-cream-100 cursor-pointer overflow-hidden group" onClick={() => setZoomImage(status.imageUrl!)}><img src={status.imageUrl} className="w-full h-auto max-h-[600px] object-contain group-hover:scale-[1.02] transition-transform duration-500" loading="lazy" /></div> )}
                               <div className="px-4 py-2 flex justify-between text-xs text-denim-500 border-b border-cream-50/50"><div className="flex items-center gap-1">{status.likes.length > 0 && <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm"><Heart size={8} className="text-white fill-current"/></div>}<span>{status.likes.length > 0 ? status.likes.length : ''}</span></div><span>{status.commentsCount > 0 ? `${status.commentsCount} ${t.status.comment}` : ''}</span></div>
                               <div className="flex items-center px-2 py-1"><button onClick={() => handleLike(status.id, status.likes, status.userId)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-cream-50 transition-all active:scale-95 ${isLiked ? 'text-red-500 font-bold' : 'text-denim-600'}`}><Heart size={20} className={isLiked ? 'fill-current' : ''} /><span className="text-sm">{t.status.like}</span></button><button onClick={() => setActiveCommentStatusId(status.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-cream-50 transition-all text-denim-600 active:scale-95"><MessageIcon size={20} /><span className="text-sm">{t.status.comment}</span></button></div>
                           </div>
                       );
                   })}
                   {hasMore && !searchTerm && (
                       <div className="pt-4 pb-8 flex justify-center">
                           <button onClick={handleLoadMore} disabled={loadingMore} className="px-6 py-2.5 bg-white border border-cream-200 text-denim-600 font-bold text-sm rounded-full shadow-sm hover:bg-cream-50 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
                               {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={18} />}
                               Lihat Status Lainnya
                           </button>
                       </div>
                   )}
               </div>
           )}
        </div>
        
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-denim-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="p-4 border-b border-cream-200 flex justify-between items-center shrink-0 bg-cream-50/50">
                <h3 className="font-bold text-denim-900 text-lg w-full text-center">{isEditingStatus ? 'Edit Status' : t.status.create}</h3>
                <button onClick={() => setShowCreateModal(false)} className="absolute right-4 p-2 bg-cream-200 rounded-full hover:bg-cream-300 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-white">
                <div className="flex items-center gap-3 mb-4">
                  <img src={currentUser?.avatar} className="w-12 h-12 rounded-full object-cover border border-cream-200"/>
                  <div>
                    <p className="font-bold text-denim-900 text-[15px] flex items-center gap-1">{currentUser?.name}{currentUser?.isAdmin && <BadgeCheck size={14} className="text-white fill-blue-500" />}</p>
                    <div className="flex items-center gap-1 text-xs bg-cream-100 text-denim-600 px-2 py-1 rounded-md border border-cream-200 w-fit"><Globe size={10} /><span>Public</span></div>
                  </div>
                </div>
                <textarea value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder={t.status.placeholder} className="w-full min-h-[120px] text-base sm:text-lg placeholder-denim-300 border-none focus:ring-0 resize-none p-4 rounded-2xl bg-cream-50 text-denim-900" autoFocus />
                {statusImagePreview && ( 
                  <div className="relative mt-4 rounded-xl overflow-hidden border border-cream-200">
                    <img src={statusImagePreview} className="w-full h-auto max-h-[300px] object-cover" />
                    <button onClick={() => { setStatusImage(null); setStatusImagePreview(null); }} className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-lg hover:bg-red-50 hover:text-red-500 transition-colors"><X size={18}/></button>
                  </div> 
                )}
              </div>
              <div className="p-4 border-t border-cream-200 bg-white shrink-0">
                <div className="border border-cream-200 rounded-2xl p-2 mb-4 flex items-center justify-between shadow-sm bg-cream-50/30">
                  <span className="text-xs font-semibold text-denim-800 ps-2">Tambahkan Foto</span>
                  <div className="flex gap-2">
                    <label className="p-2 hover:bg-cream-100 rounded-full cursor-pointer transition-colors text-green-600">
                      <ImageIcon size={20} />
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files && e.target.files[0]) { setStatusImage(e.target.files[0]); setStatusImagePreview(URL.createObjectURL(e.target.files[0])); } }} />
                    </label>
                  </div>
                </div>
                <button onClick={handleSubmitStatus} disabled={isPosting || (!statusText && !statusImage && !statusImagePreview)} className="w-full bg-denim-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-denim-700 transition-all active:scale-95 disabled:opacity-50"> 
                  {isPosting ? <Loader2 size={20} className="animate-spin" /> : (isEditingStatus ? 'Update' : t.status.post)} 
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm.isOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"><div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={28} /></div><h3 className="text-lg font-bold text-denim-900 mb-2">Hapus Status?</h3><p className="text-sm text-denim-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm({isOpen: false, id: null})} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl font-bold text-sm">Batal</button><button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/30">Ya, Hapus</button></div></div></div>)}
        {zoomImage && (<div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-0 animate-in fade-in duration-300" onClick={() => setZoomImage(null)}><button className="absolute top-4 right-4 text-white p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors z-[101]"><X size={28} /></button><img src={zoomImage} className="max-w-full max-h-full object-contain select-none animate-in zoom-in-95 duration-500" /></div>)}
        {showInfoModal && infoUser && (<div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in pt-safe pb-safe"><div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative animate-in zoom-in-95 flex flex-col max-h-[80vh] overflow-hidden"><button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 bg-black/20 text-white p-1 rounded-full hover:bg-black/40 z-10"><X size={20} /></button><div className="h-32 bg-denim-700 relative rounded-t-2xl shrink-0"><div className="absolute inset-0 opacity-10 pattern-bg"></div></div><div className="px-6 pb-6 -mt-12 flex flex-col items-center relative z-0 flex-1 overflow-y-auto custom-scrollbar"><img src={infoUser.avatar} className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-denim-200 object-cover z-10 relative" /><h2 className="mt-3 text-xl font-bold text-denim-900 text-center flex items-center justify-center gap-1">{infoUser.name}{(infoUser.isAdmin) && <BadgeCheck size={18} className="text-white fill-blue-500" />}</h2><p className="text-denim-500 text-sm font-medium mb-4 text-center">{infoUser.phoneNumber || '-'}</p>{contactsMap && !contactsMap[infoUser.id] && (!adminProfile || infoUser.id !== adminProfile.id) && (<div className="mb-4 w-full">{!isAddingContact ? (<button onClick={() => { setNewContactName(infoUser.name); setIsAddingContact(true); }} className="w-full py-3 bg-denim-600 hover:bg-denim-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"><UserPlus size={16} /> Tambahkan Kontak</button>) : (<div className="bg-cream-100 p-4 rounded-2xl border border-denim-200 animate-in fade-in"><p className="text-[10px] text-denim-500 mb-2 font-bold uppercase tracking-wider">Simpan Sebagai:</p><input type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} className="w-full p-2.5 border border-cream-300 rounded-xl text-sm mb-3 focus:ring-1 focus:ring-denim-500 outline-none" placeholder="Nama Kontak" autoFocus /><div className="flex gap-2"><button onClick={() => setIsAddingContact(false)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Batal</button><button onClick={handleAddContact} className="flex-1 py-2 bg-green-500 text-white rounded-xl text-xs font-bold shadow-md shadow-green-500/20">Simpan</button></div></div>)}</div>)}<div className="w-full bg-cream-50 p-4 rounded-2xl border border-cream-200 text-center"><p className="text-sm text-denim-700 italic">"{infoUser.bio || '-'}"</p></div></div></div></div>)}
        {activeCommentStatusId && (<div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveCommentMenuId(null)}><div className="bg-white w-full sm:max-w-md h-[85%] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}><div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-50 shrink-0"><h3 className="font-bold text-denim-900">{t.status.comment}</h3><button onClick={() => setActiveCommentStatusId(null)} className="p-1 bg-cream-200 rounded-full hover:bg-cream-300 transition-colors"><X size={20} className="text-denim-600"/></button></div><div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-cream-50 space-y-4">{comments.length === 0 && <p className="text-center text-denim-300 text-sm mt-10">Belum ada komentar.</p>}{comments.map(c => (<div key={c.id} className="flex gap-3 relative"><img src={c.userAvatar} className="w-8 h-8 rounded-full object-cover shrink-0 border border-cream-200"/><div className="bg-white p-3 rounded-2xl rounded-tl-none border border-cream-200 shadow-sm max-w-[85%] relative group"><div className="flex justify-between items-start gap-4"><h5 className="font-bold text-xs text-denim-900 flex items-center gap-1">{c.userName}{c.isAdmin && <BadgeCheck size={12} className="text-white fill-blue-500" />}</h5><button onClick={() => setActiveCommentMenuId(activeCommentMenuId === c.id ? null : c.id)} className="text-denim-300 hover:text-denim-600 p-1 -mt-1 -mr-1 transition-colors"><MoreVertical size={14} /></button></div>{c.replyTo && (<div className="bg-cream-50 p-2 rounded-xl border-l-2 border-denim-400 mb-1.5"><p className="text-[10px] font-bold text-denim-600">{c.replyTo.userName}</p><p className="text-[10px] text-denim-400 truncate italic">"{c.replyTo.text}"</p></div>)}<p className="text-sm text-denim-700 leading-snug">{c.text}</p>{activeCommentMenuId === c.id && (<div className="absolute right-0 top-7 bg-white shadow-xl border border-cream-200 rounded-xl z-30 py-1 w-28 animate-in zoom-in-95 origin-top-right overflow-hidden"><button onClick={() => { setReplyingTo({id: c.id, name: c.userName, text: c.text, userId: c.userId}); setActiveCommentMenuId(null); }} className="w-full text-left px-3 py-2.5 text-xs hover:bg-cream-50 flex items-center gap-2 text-denim-700"><CornerDownRight size={14} /> Balas</button></div>)}</div></div>))}</div><div className="p-4 border-t border-cream-200 bg-white shrink-0 pb-safe">{replyingTo && ( <div className="flex justify-between items-center bg-cream-100 p-2.5 rounded-xl mb-3 text-xs border border-denim-200 animate-in slide-in-from-bottom-2"> <span className="text-denim-600 truncate">Balas ke <b>{replyingTo.name}</b>: "{replyingTo.text.substring(0, 20)}..."</span> <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white rounded-full"><X size={14} className="text-denim-400 hover:text-red-500" /></button> </div> )}<form onSubmit={handleSendComment} className="flex gap-2 items-center"><input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={replyingTo ? `Tulis balasan...` : t.status.writeComment} className="flex-1 bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 shadow-inner" autoFocus={!!replyingTo}/><button disabled={!commentText.trim() || sendingComment} className="p-3 bg-denim-600 text-white rounded-2xl hover:bg-denim-700 disabled:opacity-50 transition-all shadow-md active:scale-90"><Send size={20} /></button></form></div></div></div>)}
      </div>
    );
};

// --- MY STATUS VIEW ---
export const MyStatusView: React.FC<SidebarViewProps> = ({ onBack, appSettings, targetStatusId, setTargetStatusId, contactsMap, adminProfile, onNavigate }) => {
  const { currentUser } = useAuth();
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(25);
  const [hasMore, setHasMore] = useState(true);
  const [activeMenuStatusId, setActiveMenuStatusId] = useState<string | null>(null);
  const [activeCommentStatusId, setActiveCommentStatusId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{id: string, name: string, text: string, userId: string} | null>(null);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');
  const [statusImagePreview, setStatusImagePreview] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  const t = translations[appSettings?.language || 'id'];

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const statusesRef = rtdbQuery(ref(rtdb, 'statuses'), orderByChild('userId'), equalTo(currentUser.id), limitToLast(pageSize));
    const unsubscribe = onValue(statusesRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.entries(val).map(([id, data]: [string, any]) => ({ id, ...data, createdAt: data.createdAt ? new Date(data.createdAt) : new Date(), likes: data.likes ? Object.keys(data.likes) : [] })).sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
          setMyStatuses(list);
          setHasMore(list.length >= pageSize);
        } else { setMyStatuses([]); setHasMore(false); }
        setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, pageSize]);

  useEffect(() => {
    if (activeCommentStatusId) {
        const q = ref(rtdb, `comments/${activeCommentStatusId}`);
        const unsub = onValue(q, (snapshot) => {
          const val = snapshot.val();
          if (val) { setComments(Object.entries(val).map(([id, data]: [string, any]) => ({id, ...data})).sort((a, b) => a.createdAt - b.createdAt)); }
          else { setComments([]); }
        });
        return () => unsub();
    }
  }, [activeCommentStatusId]);

  const handleLike = async (statusId: string, currentLikes: string[]) => {
      const isLiked = currentLikes.includes(currentUser!.id);
      const likeRef = ref(rtdb, `statuses/${statusId}/likes/${currentUser!.id}`);
      if (isLiked) await remove(likeRef); else await set(likeRef, true);
  };

  const handleSendComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentText.trim() || !activeCommentStatusId || !currentUser) return;
      setSendingComment(true);
      try {
          const commentRef = push(ref(rtdb, `comments/${activeCommentStatusId}`));
          await set(commentRef, { userId: currentUser.id, userName: currentUser.name, userAvatar: currentUser.avatar, text: commentText, createdAt: Date.now(), replyTo: replyingTo ? { userName: replyingTo.name, text: replyingTo.text } : null });
          const target = myStatuses.find(s => s.id === activeCommentStatusId);
          if (target) await update(ref(rtdb, `statuses/${activeCommentStatusId}`), { commentsCount: (target.commentsCount || 0) + 1 });
          setCommentText(''); setReplyingTo(null);
      } finally { setSendingComment(false); }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    await remove(ref(rtdb, `statuses/${deleteConfirm.id}`));
    await remove(ref(rtdb, `comments/${deleteConfirm.id}`));
    setDeleteConfirm({isOpen: false, id: null});
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title={t.status.myStatus} onBack={onBack} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 px-2 pb-32" onClick={() => setActiveMenuStatusId(null)}>
        {loading && pageSize === 25 ? ( <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div> ) : myStatuses.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-10 text-denim-400 h-64"><Activity size={32} className="text-denim-300 mb-3" /><p className="font-medium text-sm text-center">{t.status.noStatus}</p></div>
        ) : (
             <div className="space-y-3 pb-4">
                {myStatuses.map(status => (
                  <div key={status.id} id={`status-${status.id}`} className="bg-white border border-cream-200 rounded-2xl shadow-sm animate-in fade-in duration-300 overflow-hidden">
                      <div className="p-3 flex items-center justify-between"><div className="flex items-center gap-3"><img src={currentUser?.avatar} className="w-10 h-10 rounded-full object-cover border border-cream-100" /><div><h4 className="font-bold text-denim-900 text-sm leading-tight flex items-center gap-1">{currentUser?.name}{currentUser?.isAdmin && <BadgeCheck size={14} className="text-white fill-blue-500" />}</h4><p className="text-[11px] text-denim-400 leading-tight mt-0.5">{status.createdAt ? format(status.createdAt, 'HH:mm • dd MMM') : ''} • Me</p></div></div><div className="relative"><button onClick={(e) => { e.stopPropagation(); setActiveMenuStatusId(activeMenuStatusId === status.id ? null : status.id); }} className="text-denim-300 hover:text-denim-600 p-2 rounded-full"><MoreHorizontal size={20} /></button>{activeMenuStatusId === status.id && (<div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-xl border border-cream-200 z-20 animate-in zoom-in-95 origin-top-right overflow-hidden"><button onClick={() => { setStatusText(status.content || ''); setStatusImagePreview(status.imageUrl || null); setIsEditingStatus(status.id); setActiveMenuStatusId(null); setShowCreateModal(true); }} className="w-full px-4 py-3 text-left text-sm text-denim-700 hover:bg-cream-50 flex items-center gap-2"><Edit size={16}/> Edit Status</button><button onClick={() => setDeleteConfirm({ isOpen: true, id: status.id })} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-cream-100"><Trash2 size={16}/> Hapus Status</button></div>)}</div></div><div className="px-4 pb-2 text-denim-900 whitespace-pre-wrap leading-relaxed font-medium">{status.content}</div>{status.imageUrl && ( <div className="w-full bg-cream-50 border-t border-cream-100 cursor-pointer overflow-hidden group" onClick={() => setZoomImage(status.imageUrl!)}><img src={status.imageUrl} className="w-full h-auto max-h-[600px] object-contain group-hover:scale-[1.02] transition-transform duration-500" loading="lazy" /></div> )}<div className="px-4 py-2 flex justify-between text-xs text-denim-500 border-b border-cream-50/50"><div className="flex items-center gap-1">{status.likes.length > 0 && <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm"><Heart size={8} className="text-white fill-current"/></div>}<span>{status.likes.length}</span></div><button onClick={() => setActiveCommentStatusId(status.id)} className="flex items-center gap-1"><MessageIcon size={14} className="text-denim-400" /><span>{status.commentsCount} {t.status.comment}</span></button></div><div className="flex items-center px-2 py-1"><button onClick={() => handleLike(status.id, status.likes)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${status.likes.includes(currentUser!.id) ? 'text-red-500 font-bold' : 'text-denim-600'}`}><Heart size={20} className={status.likes.includes(currentUser!.id) ? 'fill-current' : ''} /><span className="text-sm">{t.status.like}</span></button><button onClick={() => setActiveCommentStatusId(status.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-denim-600"><MessageIcon size={20} /><span className="text-sm">{t.status.comment}</span></button></div>
                  </div>
                ))}
                {hasMore && (
                  <div className="pt-4 pb-8 flex justify-center">
                    <button onClick={() => setPageSize(prev => prev + 25)} className="px-6 py-2.5 bg-white border border-cream-200 text-denim-600 font-bold text-sm rounded-full shadow-sm hover:bg-cream-50 transition-all flex items-center gap-2 active:scale-95">
                      <ChevronDown size={18} /> Lihat Lebih Banyak
                    </button>
                  </div>
                )}
             </div>
        )}
      </div>
      {deleteConfirm.isOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"><div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={28} /></div><h3 className="text-lg font-bold text-denim-900 mb-2">Hapus Status?</h3><p className="text-sm text-denim-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm({isOpen: false, id: null})} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl font-bold text-sm">Batal</button><button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg">Ya, Hapus</button></div></div></div>)}
      {zoomImage && (<div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-0 animate-in fade-in duration-300" onClick={() => setZoomImage(null)}><button className="absolute top-4 right-4 text-white p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors z-[101]"><X size={28} /></button><img src={zoomImage} className="max-w-full max-h-full object-contain select-none animate-in zoom-in-95 duration-500" /></div>)}
      {activeCommentStatusId && (<div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveCommentMenuId(null)}><div className="bg-white w-full sm:max-w-md h-[85%] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}><div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-50 shrink-0"><h3 className="font-bold text-denim-900">Komentar Status Saya</h3><button onClick={() => setActiveCommentStatusId(null)} className="p-1 bg-cream-200 rounded-full hover:bg-cream-300 transition-colors"><X size={20} className="text-denim-600"/></button></div><div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-cream-50 space-y-4">{comments.length === 0 && <p className="text-center text-denim-300 text-sm mt-10">Belum ada komentar.</p>}{comments.map(c => (<div key={c.id} className="flex gap-3 relative"><img src={c.userAvatar} className="w-8 h-8 rounded-full object-cover shrink-0 border border-cream-200"/><div className="bg-white p-3 rounded-2xl rounded-tl-none border border-cream-200 shadow-sm max-w-[85%] relative group"><div className="flex justify-between items-start gap-4"><h5 className="font-bold text-xs text-denim-900 flex items-center gap-1">{c.userName}{c.isAdmin && <BadgeCheck size={12} className="text-white fill-blue-500" />}</h5><button onClick={() => setActiveCommentMenuId(activeCommentMenuId === c.id ? null : c.id)} className="text-denim-300 hover:text-denim-600 p-1 -mt-1 -mr-1 transition-colors"><MoreVertical size={14} /></button></div>{c.replyTo && (<div className="bg-cream-50 p-2 rounded-xl border-l-2 border-denim-400 mb-1.5"><p className="text-[10px] font-bold text-denim-600">{c.replyTo.userName}</p><p className="text-[10px] text-denim-400 truncate italic">"{c.replyTo.text}"</p></div>)}<p className="text-sm text-denim-700 leading-snug">{c.text}</p>{activeCommentMenuId === c.id && (<div className="absolute right-0 top-7 bg-white shadow-xl border border-cream-200 rounded-xl z-30 py-1 w-28 animate-in zoom-in-95 origin-top-right overflow-hidden"><button onClick={() => { setReplyingTo({id: c.id, name: c.userName, text: c.text, userId: c.userId}); setActiveCommentMenuId(null); }} className="w-full text-left px-3 py-2.5 text-xs hover:bg-cream-50 flex items-center gap-2 text-denim-700"><CornerDownRight size={14} /> Balas</button></div>)}</div></div>))}</div><div className="p-4 border-t border-cream-200 bg-white shrink-0 pb-safe">{replyingTo && ( <div className="flex justify-between items-center bg-cream-100 p-2.5 rounded-xl mb-3 text-xs border border-denim-200 animate-in slide-in-from-bottom-2"> <span className="text-denim-600 truncate">Balas ke <b>{replyingTo.name}</b>: "{replyingTo.text.substring(0, 15)}..."</span> <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white rounded-full"><X size={14} className="text-denim-400" /></button> </div> )}<form onSubmit={handleSendComment} className="flex gap-2 items-center"><input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Tulis balasan..." className="flex-1 bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 shadow-inner" autoFocus={!!replyingTo}/><button disabled={!commentText.trim() || sendingComment} className="p-3 bg-denim-100 text-denim-600 rounded-2xl hover:bg-denim-200 disabled:opacity-50 shadow-md active:scale-90"><Send size={20} /></button></form></div></div></div>)}
    </div>
  );
};

// --- GROUPS VIEW ---
export const GroupsView: React.FC<SidebarViewProps> = ({ onBack, onOpenGroupChat, appSettings, contactsMap }) => {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [showOptions, setShowOptions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[appSettings?.language || 'id'];

  const [membersInfoCache, setMembersInfoCache] = useState<Record<string, {name: string, avatar: string}>>({});

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const q = query(collection(db, 'chats'), where('type', '==', 'group'), where('participants', 'array-contains', currentUser.id), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatPreview)));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (showModal && isEditing && editGroupId) {
       const group = groups.find(g => g.id === editGroupId);
       if (group) {
          group.participants.forEach(async (uid) => {
            if (uid !== currentUser?.id && !contactsMap?.[uid] && !membersInfoCache[uid]) {
               const uSnap = await getDoc(doc(db, 'users', uid));
               if (uSnap.exists()) {
                  const d = uSnap.data();
                  setMembersInfoCache(prev => ({...prev, [uid]: { name: d.name, avatar: d.avatar }}));
               }
            }
          });
       }
    }
  }, [showModal, isEditing, editGroupId, groups]);

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { setGroupImage(e.target.files[0]); setGroupImagePreview(URL.createObjectURL(e.target.files[0])); } };
  
  const toggleMemberSelection = (uid: string) => { 
    if (selectedMembers.includes(uid)) { setSelectedMembers(prev => prev.filter(id => id !== uid)); } 
    else { setSelectedMembers(prev => [...prev, uid]); } 
  };

  const resetForm = () => { setGroupName(''); setGroupDesc(''); setGroupImage(null); setGroupImagePreview(null); setSelectedMembers([]); setIsEditing(false); setEditGroupId(null); };
  
  const handleOpenCreate = () => { resetForm(); setShowModal(true); };
  
  const handleOpenEdit = (group: ChatPreview) => { 
    setGroupName(group.name); 
    setGroupDesc(group.description || ''); 
    setGroupImagePreview(group.avatar); 
    setSelectedMembers(group.participants.filter(p => p !== currentUser?.id)); 
    setIsEditing(true); 
    setEditGroupId(group.id); 
    setShowModal(true); 
    setShowOptions(false); 
  };

  const handleSubmit = async () => {
    if (!currentUser || !groupName.trim()) return;
    setProcessing(true);
    try {
      let avatarUrl = groupImagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random`;
      if (groupImage) avatarUrl = await uploadImageToCloudinary(groupImage);
      const finalParticipants = Array.from(new Set([...selectedMembers, currentUser.id]));
      
      if (isEditing && editGroupId) {
          const oldGroup = groups.find(g => g.id === editGroupId);
          const kickedUids = (oldGroup?.participants || []).filter(p => !finalParticipants.includes(p));
          const addedUids = finalParticipants.filter(p => !(oldGroup?.participants || []).includes(p));
          
          await updateDoc(doc(db, 'chats', editGroupId), { name: groupName, description: groupDesc, avatar: avatarUrl, participants: finalParticipants, updatedAt: serverTimestamp() });
          
          const logRef = push(ref(rtdb, `messages/${editGroupId}`));
          if (addedUids.length > 0) await set(logRef, { senderId: 'system', content: `Admin menambahkan anggota baru`, type: 'text', status: 'read', createdAt: Date.now() });
          if (kickedUids.length > 0) await set(logRef, { senderId: 'system', content: `Admin mengeluarkan beberapa anggota`, type: 'text', status: 'read', createdAt: Date.now() });
      } else {
        await addDoc(collection(db, 'chats'), { type: 'group', name: groupName, description: groupDesc, avatar: avatarUrl, participants: finalParticipants, adminIds: [currentUser.id], lastMessage: 'Grup baru dibuat', lastMessageType: 'text', unreadCounts: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), typing: {} });
      }
      setShowModal(false); resetForm();
    } catch (e) { alert("Gagal menyimpan grup."); } finally { setProcessing(false); }
  };

  const handleSelectGroup = (id: string) => { const newSet = new Set(selectedGroupIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedGroupIds(newSet); };
  
  const executeGroupDelete = async () => {
    if (selectedGroupIds.size === 0) return;
    setProcessing(true);
    try {
      const batch = writeBatch(db);
      selectedGroupIds.forEach(id => {
        const group = groups.find(g => g.id === id);
        if (group) {
          const ref = doc(db, 'chats', id);
          if (group.adminIds?.includes(currentUser!.id)) { batch.delete(ref); } 
          else { batch.update(ref, { participants: arrayRemove(currentUser!.id) }); }
        }
      });
      await batch.commit();
      setIsSelectionMode(false); setSelectedGroupIds(new Set()); setShowDeleteConfirm(false);
    } catch (e) { alert("Gagal memproses."); } finally { setProcessing(false); }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const renderMemberManagement = () => {
    const group = isEditing ? groups.find(g => g.id === editGroupId) : null;
    const currentParticipantUids = group?.participants.filter(uid => uid !== currentUser?.id) || [];
    const allManageableUids = Array.from(new Set([
        ...currentParticipantUids,
        ...Object.keys(contactsMap || {})
    ]));

    return (
      <div className="border border-cream-200 rounded-xl max-h-48 overflow-y-auto custom-scrollbar bg-cream-50 box-border divide-y divide-cream-100">
        {allManageableUids.length === 0 ? (
          <p className="p-4 text-center text-denim-400 text-sm">Belum ada kontak tersedia.</p>
        ) : (
          allManageableUids.map((uid) => {
            const contact = contactsMap?.[uid];
            const info = membersInfoCache[uid];
            const displayName = contact?.savedName || info?.name || "Pengguna";
            const displayAvatar = contact?.avatar || info?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
            const isSelected = selectedMembers.includes(uid);
            const isCurrentMember = currentParticipantUids.includes(uid);

            return (
              <div key={uid} onClick={() => toggleMemberSelection(uid)} className="flex items-center gap-3 p-3 hover:bg-white cursor-pointer transition-colors group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-denim-600 border-denim-600' : 'border-denim-300 bg-white'}`}>
                  {isSelected && <CheckSquare size={14} className="text-white"/>}
                </div>
                <img src={displayAvatar} className="w-8 h-8 rounded-full bg-denim-200 object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-denim-900 truncate">{displayName}</p>
                  <p className="text-[9px] text-denim-500">{isCurrentMember ? "Bergabung" : "Tersedia"}</p>
                </div>
                {isCurrentMember && !isSelected && <div className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><UserMinusIcon size={14} /></div>}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <div className="h-[60px] px-4 pt-[calc(0rem+env(safe-area-inset-top))] flex items-center justify-between bg-cream-50 border-b border-cream-200 sticky top-0 z-10 shrink-0 text-denim-900 box-content">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ms-2 text-denim-500 hover:bg-cream-200 rounded-full transition-colors"><ArrowLeft size={20} className="rtl:rotate-180" /></button>
          <h2 className="text-lg font-semibold">{isSelectionMode ? `${selectedGroupIds.size} Terpilih` : t.groups.title}</h2>
        </div>
        <div className="relative">
            {isSelectionMode ? ( 
              <div className="flex gap-2">
                <button onClick={() => { setIsSelectionMode(false); setSelectedGroupIds(new Set()); }} className="text-sm font-bold text-denim-600 px-3 py-1 hover:bg-cream-200 rounded-lg">{t.common.cancel}</button>
                {selectedGroupIds.size > 0 && <button onClick={() => setShowDeleteConfirm(true)} className="text-sm font-bold text-red-500 px-3 py-1 hover:bg-red-50 rounded-lg">{processing ? '...' : t.common.delete}</button>}
              </div> 
            ) : ( 
              <button onClick={() => setShowOptions(!showOptions)} className="p-2 -me-2 text-denim-500 hover:bg-cream-200 rounded-full transition-colors"><MoreVertical size={20}/></button> 
            )}
            {showOptions && !isSelectionMode && (
              <div className="absolute right-0 top-10 bg-white shadow-xl border border-cream-200 rounded-xl py-1 w-40 z-20 animate-in zoom-in-95">
                <button onClick={() => { setIsSelectionMode(true); setShowOptions(false); }} className="w-full text-left px-4 py-3 text-sm text-denim-800 hover:bg-cream-50 flex items-center gap-2"><CheckSquare size={16}/> {t.contacts.select}</button>
              </div>
            )}
        </div>
      </div>
      <div className="p-3 bg-cream-50 border-b border-cream-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-denim-400" size={16} />
          <input type="text" placeholder={t.groups.search} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-cream-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 text-denim-900 shadow-sm"/>
        </div>
      </div>
      <div className="p-2 flex-1 overflow-y-auto custom-scrollbar pb-32 md:pb-0">
        {loading ? ( <div className="flex justify-center p-4"><Loader2 className="animate-spin text-denim-400" /></div> ) : filteredGroups.length === 0 ? ( <div className="flex flex-col items-center justify-center h-64 text-denim-400 text-center px-6"><div className="w-16 h-16 bg-cream-200 rounded-full flex items-center justify-center mb-3"><Users size={32} className="opacity-40" /></div><p className="text-sm font-bold text-denim-600 mb-1">Grup tidak tersedia</p><p className="text-xs text-denim-400">{t.groups.noGroups}</p></div> ) : (
          filteredGroups.map(group => {
            const isAdmin = group.adminIds?.includes(currentUser!.id);
            const isSelected = selectedGroupIds.has(group.id);
            return ( 
              <div key={group.id} onClick={() => { if (isSelectionMode) handleSelectGroup(group.id); else onOpenGroupChat && onOpenGroupChat(group); }} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${isSelectionMode && isSelected ? 'bg-denim-100 border-denim-300' : 'border-transparent hover:bg-white hover:border-cream-200'}`}>
                {isSelectionMode && ( <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-denim-600 border-denim-600' : 'border-denim-300 bg-white'}`}>{isSelected && <CheckSquare size={14} className="text-white"/>}</div> )}
                <img src={group.avatar} className="w-12 h-12 rounded-full object-cover bg-denim-200 border border-cream-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-denim-900 truncate text-[14px]">{group.name}</h4>
                  <p className="text-[11px] text-denim-500 truncate">{group.participants.length} {t.groups.members}</p>
                </div>
                {!isSelectionMode && isAdmin && ( 
                  <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(group); }} className="p-2 text-denim-400 hover:text-denim-700 hover:bg-cream-100 rounded-full transition-all" title="Atur Grup">
                    <Settings size={20} />
                  </button> 
                )}
              </div> 
            );
          })
        )}
      </div>
      {!isSelectionMode && ( <button onClick={handleOpenCreate} className="absolute bottom-24 md:bottom-6 right-6 w-14 h-14 bg-denim-600 hover:bg-denim-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 z-20"><Plus size={28} /></button> )}
      
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-denim-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 overflow-hidden">
            <div className="px-4 py-3 border-b border-cream-200 flex justify-between items-center bg-cream-50 shrink-0">
              <h3 className="font-bold text-lg text-denim-900">{isEditing ? t.groups.editGroup : t.groups.newGroup}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-cream-200 rounded-full"><X size={20} className="text-denim-500"/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white">
              <div className="flex justify-center mb-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img src={groupImagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName || 'G')}&background=random`} className="w-20 h-20 rounded-full object-cover border-4 border-cream-100 shadow-md bg-denim-100" />
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageInput} accept="image/*" className="hidden" />
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[10px] font-bold text-denim-500 uppercase mb-1 block">{t.groups.groupName}</label>
                  <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-xl bg-cream-50 focus:ring-1 focus:ring-denim-500 outline-none text-denim-900 text-sm" placeholder="Nama Grup"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-denim-500 uppercase mb-1 block">{t.groups.desc} (Opsional)</label>
                  <textarea value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-xl bg-cream-50 focus:ring-1 focus:ring-denim-500 outline-none text-denim-900 resize-none h-16 text-sm" placeholder="Deskripsi grup..."/>
                </div>
              </div>
              <div className="mb-2">
                <label className="text-[10px] font-bold text-denim-500 uppercase mb-1 block tracking-wider">Kelola Anggota</label>
                {renderMemberManagement()}
                <p className="text-[9px] text-denim-400 mt-1 text-right font-medium italic">Klik untuk menambah/mengeluarkan anggota</p>
              </div>
            </div>
            <div className="p-4 border-t border-cream-200 bg-white shrink-0 pb-safe">
              <button onClick={handleSubmit} disabled={processing || !groupName.trim()} className="w-full py-3 bg-denim-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-sm">
                {processing && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? 'Simpan' : t.groups.create}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"><div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={28} /></div><h3 className="text-lg font-bold text-denim-900 mb-2">Konfirmasi Aksi</h3><p className="text-sm text-denim-500 mb-6">Aksi ini akan menghapus/mengeluarkan Anda dari grup terpilih.</p><div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} disabled={processing} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl font-bold text-sm">Batal</button><button onClick={executeGroupDelete} disabled={processing} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2">{processing && <Loader2 size={16} className="animate-spin"/>} Ya, Proses</button></div></div></div>)}
    </div>
  );
};

// --- CONTACTS VIEW (FIXED FOR ADMIN) ---
export const ContactsView: React.FC<SidebarViewProps> = ({ onBack, onStartChat, appSettings }) => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [savedName, setSavedName] = useState('');
  const t = translations[appSettings?.language || 'id'];

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    if (currentUser.isAdmin) {
      const unsub = onSnapshot(collection(db, 'users'), (snap) => {
        const list = snap.docs
          .filter(d => d.id !== currentUser.id)
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              uid: d.id,
              savedName: data.name,
              phoneNumber: data.phoneNumber || '-',
              avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}`
            } as Contact;
          });
        list.sort((a, b) => a.savedName.localeCompare(b.savedName));
        setContacts(list);
        setLoading(false);
      });
      return () => unsub();
    } else {
      const unsub = onSnapshot(collection(db, 'users', currentUser.id, 'contacts'), (snap) => {
        const list = snap.docs.map(d => ({id: d.id, ...d.data()} as Contact));
        list.sort((a, b) => a.savedName.localeCompare(b.savedName));
        setContacts(list);
        setLoading(false);
      });
      return () => unsub();
    }
  }, [currentUser]);

  const handleSearchUser = async () => {
    if (!searchPhone) return;
    setSearchingUser(true); setSearchError(''); setFoundUser(null);
    try {
      const q = query(collection(db, 'users'), where('phoneNumber', '==', searchPhone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        if (snap.docs[0].id === currentUser?.id) { setSearchError("Tidak dapat menambah diri sendiri."); } else {
            const userData = snap.docs[0].data();
            setFoundUser({ id: snap.docs[0].id, ...userData } as User); setSavedName(userData.name);
        }
      } else { setSearchError("Nomor belum terdaftar."); }
    } catch (e) { setSearchError("Gagal mencari pengguna."); } finally { setSearchingUser(false); }
  };

  const handleSaveContact = async () => {
    if (!foundUser || !currentUser || !savedName) return;
    await addDoc(collection(db, 'users', currentUser.id, 'contacts'), { uid: foundUser.id, savedName: savedName, phoneNumber: foundUser.phoneNumber, avatar: foundUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name)}` });
    setShowAddModal(false); resetModal(); if (onStartChat) onStartChat(foundUser.id);
  };

  const resetModal = () => { setSearchPhone(''); setFoundUser(null); setSavedName(''); setSearchError(''); };
  const handleSelectContact = (id: string) => { const newSet = new Set(selectedContactIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedContactIds(newSet); };
  const handleDeleteSelected = async () => {
      if (selectedContactIds.size === 0) return;
      const batch = writeBatch(db);
      selectedContactIds.forEach(id => { 
        batch.delete(doc(db, 'users', currentUser!.id, 'contacts', id)); 
      });
      await batch.commit(); setIsSelectionMode(false); setSelectedContactIds(new Set()); setShowDeleteConfirm(false);
  };

  const filteredContacts = contacts.filter(c => c.savedName.toLowerCase().includes(search.toLowerCase()) || c.phoneNumber.includes(search));

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <div className="h-[60px] px-4 pt-[calc(0rem+env(safe-area-inset-top))] flex items-center justify-between bg-cream-50 border-b border-cream-200 sticky top-0 z-10 shrink-0 text-denim-900 box-content">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ms-2 text-denim-500 hover:bg-cream-200 rounded-full transition-colors"><ArrowLeft size={20} className="rtl:rotate-180" /></button>
          <h2 className="text-lg font-semibold">{isSelectionMode ? `${selectedContactIds.size} Terpilih` : (currentUser?.isAdmin ? "Daftar Pengguna" : t.contacts.title)}</h2>
        </div>
        <div className="relative">
            {!currentUser?.isAdmin && isSelectionMode ? ( 
               <div className="flex gap-2"><button onClick={() => { setIsSelectionMode(false); setSelectedContactIds(new Set()); }} className="text-sm font-bold text-denim-600 px-3 py-1 hover:bg-cream-200 rounded-lg">{t.common.cancel}</button>{selectedContactIds.size > 0 && <button onClick={() => setShowDeleteConfirm(true)} className="text-sm font-bold text-red-500 px-3 py-1 hover:bg-red-50 rounded-lg">{t.common.delete}</button>}</div> 
            ) : !currentUser?.isAdmin ? ( 
               <button onClick={() => setShowOptions(!showOptions)} className="p-2 -me-2 text-denim-500 hover:text-denim-700 hover:bg-cream-200 rounded-full transition-colors"><MoreVertical size={20}/></button> 
            ) : null}
            {showOptions && !isSelectionMode && (<div className="absolute right-0 top-10 bg-white shadow-xl border border-cream-200 rounded-xl py-1 w-40 z-20 animate-in zoom-in-95"><button onClick={() => { setIsSelectionMode(true); setShowOptions(false); }} className="w-full text-left px-4 py-3 text-sm text-denim-800 hover:bg-cream-50 flex items-center gap-2"><CheckSquare size={16}/> {t.contacts.select}</button></div>)}
        </div>
      </div>
      <div className="p-3 bg-cream-50 border-b border-cream-200"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-denim-400" size={16} /><input type="text" placeholder={currentUser?.isAdmin ? "Cari pengguna..." : t.contacts.search} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-cream-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 text-denim-900"/></div></div>
      <div className="p-2 flex-1 overflow-y-auto custom-scrollbar pb-32 md:pb-0">
        {loading ? ( <div className="flex justify-center p-4"><Loader2 className="animate-spin text-denim-400" /></div> ) : filteredContacts.length === 0 ? ( <div className="text-center p-8 text-denim-400 text-sm">Tidak ada hasil.</div> ) : (
            filteredContacts.map(contact => {
                const isSelected = selectedContactIds.has(contact.id);
                return ( <div key={contact.id} onClick={() => { if (isSelectionMode) handleSelectContact(contact.id); else if (onStartChat) onStartChat(contact.uid); }} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${isSelectionMode && isSelected ? 'bg-denim-100 border-denim-300' : 'border-transparent hover:bg-white hover:border-cream-200'}`}>{isSelectionMode && ( <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-denim-600 border-denim-600' : 'border-denim-300 bg-white'}`}>{isSelected && <CheckSquare size={14} className="text-white"/>}</div> )}<img src={contact.avatar} className="w-10 h-10 rounded-full object-cover bg-denim-200 border border-cream-200" onError={(e) => (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.savedName)}`}/><div className="flex-1 min-w-0"><h4 className="font-bold text-denim-900 text-sm truncate">{contact.savedName}</h4><p className="text-xs text-denim-500 truncate">{contact.phoneNumber}</p></div></div> );
            })
        )}
      </div>
      {!currentUser?.isAdmin && !isSelectionMode && ( <button onClick={() => { resetModal(); setShowAddModal(true); }} className="absolute bottom-24 md:bottom-6 right-6 w-14 h-14 bg-denim-600 hover:bg-denim-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 z-20 pb-safe"><UserPlus size={24} /></button> )}
      {showAddModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-denim-900/60 backdrop-blur-sm p-4 animate-in fade-in"><div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"><div className="px-6 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50"><h3 className="font-bold text-lg text-denim-900">{t.contacts.newContact}</h3><button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-cream-200 rounded-full transition-colors"><X size={20} className="text-denim-500"/></button></div><div className="p-6">{!foundUser ? (<><label className="text-[10px] font-bold text-denim-600 uppercase mb-2 block tracking-wide">Cari Nomor HP</label><div className="flex gap-2 mb-2"><input type="tel" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} className="flex-1 px-4 py-3 border border-cream-300 rounded-xl bg-cream-50 focus:ring-2 focus:ring-denim-500 outline-none text-denim-900 placeholder-denim-300" placeholder="08..." autoFocus/><button onClick={handleSearchUser} disabled={searchingUser || !searchPhone} className="px-4 bg-denim-600 hover:bg-denim-700 text-white rounded-xl shadow-lg disabled:opacity-50 transition-all">{searchingUser ? <Loader2 size={20} className="animate-spin"/> : <Search size={20} />}</button></div>{searchError && <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1"><AlertTriangle size={12}/> {searchError}</p>}</>) : (<div className="animate-in slide-in-from-right-4 duration-300"><div className="flex flex-col items-center mb-6"><img src={foundUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name)}`} className="w-20 h-20 rounded-full border-4 border-cream-100 shadow-md mb-3 object-cover" /><p className="font-bold text-denim-900 text-lg">{foundUser.name}</p><p className="text-sm text-denim-500">{foundUser.phoneNumber}</p><div className="mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">Terdaftar</div></div><label className="text-[10px] font-bold text-denim-500 uppercase mb-2 block tracking-wide">Simpan Sebagai</label><input type="text" value={savedName} onChange={(e) => setSavedName(e.target.value)} className="w-full px-4 py-3 border border-cream-300 rounded-xl bg-cream-50 mb-6 focus:ring-2 focus:ring-denim-500 outline-none text-denim-900" placeholder="Nama Kontak"/><div className="flex gap-3"><button onClick={() => setFoundUser(null)} className="flex-1 py-3 bg-cream-100 text-denim-700 font-bold rounded-xl hover:bg-cream-200 transition-colors">Batal</button><button onClick={handleSaveContact} className="flex-1 py-3 bg-denim-600 text-white font-bold rounded-xl shadow-lg hover:bg-denim-700 transition-all">Simpan</button></div></div>)}</div></div></div>)}
      {showDeleteConfirm && ( <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"><div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><Trash2 size={28} /></div><h3 className="text-lg font-bold text-denim-900 mb-2">Hapus Kontak?</h3><p className="text-sm text-denim-500 mb-6">Anda akan menghapus {selectedContactIds.size} kontak terpilih.</p><div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl font-bold text-sm">Batal</button><button onClick={handleDeleteSelected} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg">Ya, Hapus</button></div></div></div> )}
    </div>
  );
};

// --- BROADCAST VIEW (FIXED REAL LOGIC) ---
export const BroadcastView: React.FC<SidebarViewProps> = ({ onBack, appSettings }) => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const t = translations[appSettings?.language || 'id'];

  const handleBroadcast = async () => {
    if (!message.trim() || !currentUser?.isAdmin) return;
    setSending(true);
    setProgress(0);
    
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.filter(d => d.id !== currentUser.id);
      setTotal(allUsers.length);
      
      const broadcastMsg = message.trim();
      let sentCount = 0;

      for (const uDoc of allUsers) {
        const targetId = uDoc.id;
        const targetData = uDoc.data();
        
        const q = query(collection(db, 'chats'), where('type', '==', 'direct'), where('participants', 'array-contains', targetId));
        const chatSnap = await getDocs(q);
        let chatId = '';
        
        let existing = chatSnap.docs.find(d => d.data().participants.includes(currentUser.id));
        if (existing) {
          chatId = existing.id;
        } else {
          const newChatRef = await addDoc(collection(db, 'chats'), {
            type: 'direct',
            participants: [currentUser.id, targetId],
            name: targetData.name || 'User',
            avatar: targetData.avatar || '',
            lastMessage: broadcastMsg,
            lastMessageType: 'text',
            unreadCounts: { [targetId]: 1, [currentUser.id]: 0 },
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            typing: {}
          });
          chatId = newChatRef.id;
        }

        const msgRef = push(ref(rtdb, `messages/${chatId}`));
        await set(msgRef, {
          senderId: currentUser.id,
          content: broadcastMsg,
          type: 'text',
          status: 'sent',
          createdAt: Date.now()
        });

        if (existing) {
          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: broadcastMsg,
            lastMessageType: 'text',
            updatedAt: serverTimestamp(),
            [`unreadCounts.${targetId}`]: increment(1)
          });
        }
        
        sentCount++;
        setProgress(sentCount);
      }

      alert(t.broadcast.success.replace('{count}', sentCount.toString()));
      setMessage('');
    } catch (e) {
      console.error(e);
      alert("Gagal mengirim broadcast.");
    } finally {
      setSending(false);
    }
  };

  if (!currentUser?.isAdmin) return <div className="p-4 text-center">Akses Ditolak</div>;

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.broadcast.title} onBack={onBack} />
      <div className="p-4 pb-32 md:pb-0 flex-1 overflow-y-auto custom-scrollbar">
         <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex gap-3"><AlertTriangle className="text-yellow-600 shrink-0" /><div><h4 className="font-bold text-yellow-800 text-sm">Peringatan Keamanan</h4><p className="text-xs text-yellow-700 mt-1">{t.broadcast.warning}</p></div></div>
         
         <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-denim-600 uppercase tracking-widest mb-2 ml-1">{t.broadcast.messageLabel}</label>
              <textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                className="w-full h-40 p-4 rounded-2xl bg-cream-50 border border-cream-300 focus:ring-2 focus:ring-denim-500 outline-none text-denim-900 transition-all resize-none text-sm leading-relaxed" 
                placeholder={t.broadcast.placeholder}
                disabled={sending}
              />
            </div>
            
            {sending && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-denim-600">
                  <span>Mengirim...</span>
                  <span>{progress} / {total}</span>
                </div>
                <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden">
                  <div className="h-full bg-denim-600 transition-all duration-300" style={{ width: `${(progress/total) * 100}%` }}></div>
                </div>
              </div>
            )}

            <button 
              onClick={handleBroadcast} 
              disabled={sending || !message.trim()} 
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
            >
              {sending ? <Loader2 className="animate-spin" /> : <Radio size={20} />} 
              {sending ? t.broadcast.sending : t.broadcast.send}
            </button>
         </div>
      </div>
    </div>
  );
};

export const SettingsView: React.FC<SidebarViewProps> = ({ onBack, appSettings, updateAppSettings, onNavigate }) => {
  const { currentUser, updateUserEmail, updateUserPassword, logout } = useAuth();
  const t = translations[appSettings?.language || 'id'];
  const [activeSection, setActiveSection] = useState<'main' | 'account' | 'chat'>('main');
  const [activeSubSection, setActiveSubSection] = useState<'email' | 'password' | null>(null);
  const [currentPass, setCurrentPass] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  if (!appSettings || !updateAppSettings) return null;

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try { await updateUserEmail(newEmail, currentPass); setSuccess(t.settings.account.successEmail); setTimeout(() => setActiveSubSection(null), 2000); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };
  const handleUpdatePass = async (e: React.FormEvent) => {
    e.preventDefault(); if (newPass !== confirmPass) { setError("Konfirmasi password tidak cocok"); return; }
    setLoading(true); setError(''); setSuccess('');
    try { await updateUserPassword(newPass, currentPass); setSuccess(t.settings.account.successPass); setTimeout(() => setActiveSubSection(null), 2000); } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };
  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try { const url = await uploadImageToCloudinary(e.target.files[0]); updateAppSettings({ wallpaper: url }); alert("Wallpaper diperbarui!"); } finally { setLoading(false); }
    }
  };
  const SettingToggle = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3"><span className="text-denim-700 text-sm font-medium">{label}</span><button onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-denim-600' : 'bg-gray-300'}`}><span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'start-6' : 'start-1'}`} /></button></div>
  );

  if (activeSection === 'account') {
    return (
      <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-right-4 duration-200">
        <ViewHeader title={t.settings.account.title} onBack={() => { setActiveSection('main'); setActiveSubSection(null); }} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 md:pb-0">
           {!activeSubSection ? (
             <>
               <button onClick={() => setActiveSubSection('email')} className="w-full bg-white p-4 rounded-xl shadow-sm border border-cream-200 flex items-center justify-between"><div className="flex items-center gap-3 text-denim-800"><Mail size={18}/> <span>{t.settings.account.changeEmail}</span></div><ChevronRight size={18} className="text-denim-300"/></button>
               <button onClick={() => setActiveSubSection('password')} className="w-full bg-white p-4 rounded-xl shadow-sm border border-cream-200 flex items-center justify-between"><div className="flex items-center gap-3 text-denim-800"><Key size={18}/> <span>{t.settings.account.changePass}</span></div><ChevronRight size={18} className="text-denim-300"/></button>
             </>
           ) : activeSubSection === 'email' ? (
             <form onSubmit={handleUpdateEmail} className="bg-white p-6 rounded-xl border border-cream-200 space-y-4 animate-in fade-in">
                {error && <p className="text-xs text-red-500">{error}</p>}
                {success && <p className="text-xs text-green-600">{success}</p>}
                <div><label className="text-[10px] font-bold uppercase text-denim-400 block">Email Baru</label><input type="email" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} required className="w-full bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-[10px] font-bold uppercase text-denim-400 block">Password Verifikasi</label><input type="password" value={currentPass} onChange={(e)=>setCurrentPass(e.target.value)} required className="w-full bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setActiveSubSection(null)} className="flex-1 py-2 text-sm bg-cream-100 rounded-lg">{t.common.cancel}</button><button type="submit" className="flex-1 py-2 text-sm text-white bg-denim-600 rounded-lg">Simpan</button></div>
             </form>
           ) : (
            <form onSubmit={handleUpdatePass} className="bg-white p-6 rounded-xl border border-cream-200 space-y-4 animate-in fade-in">
                {error && <p className="text-xs text-red-500">{error}</p>}
                {success && <p className="text-xs text-green-600">{success}</p>}
                <div><label className="text-[10px] font-bold uppercase text-denim-400 block">Password Baru</label><input type="password" value={newPass} onChange={(e)=>setNewPass(e.target.value)} required className="w-full bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 text-sm" minLength={6} /></div>
                <div><label className="text-[10px] font-bold uppercase text-denim-400 block">Password Saat Ini</label><input type="password" value={currentPass} onChange={(e)=>setCurrentPass(e.target.value)} required className="w-full bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setActiveSubSection(null)} className="flex-1 py-2 text-sm bg-cream-100 rounded-lg">{t.common.cancel}</button><button type="submit" className="flex-1 py-2 text-sm text-white bg-denim-600 rounded-lg">Simpan</button></div>
            </form>
           )}
        </div>
      </div>
    );
  }

  if (activeSection === 'chat') {
    return (
      <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-right-4 duration-200">
        <ViewHeader title={t.settings.chat.title} onBack={() => setActiveSection('main')} />
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 md:pb-0">
           <section className="bg-white p-4 rounded-xl shadow-sm border border-cream-200">
              <h3 className="flex items-center gap-2 text-denim-900 font-bold mb-3"><Palette size={18}/> {t.settings.chat.wallpaper}</h3>
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                 {['default', '#f0f2f5', '#e5ddd5', '#dcf8c6', '#34b7f1', '#ece5dd'].map(color => ( <button key={color} onClick={() => updateAppSettings({ wallpaper: color })} className={`w-10 h-10 rounded-full shrink-0 border-2 ${appSettings.wallpaper === color ? 'border-denim-600' : 'border-transparent'}`} style={{ backgroundColor: color === 'default' ? '#fdfbf7' : color }} /> ))}
                 <button onClick={() => wallpaperInputRef.current?.click()} className="w-10 h-10 rounded-full shrink-0 bg-denim-50 border-2 border-denim-200 border-dashed flex items-center justify-center text-denim-600"><Upload size={16} /></button>
                 <input type="file" ref={wallpaperInputRef} onChange={handleWallpaperUpload} accept="image/*" className="hidden" />
              </div>
           </section>
           <section className="bg-white p-4 rounded-xl shadow-sm border border-cream-200">
              <h3 className="flex items-center gap-2 text-denim-900 font-bold mb-3"><Type size={18}/> {t.settings.chat.fontSize}</h3>
              <div className="grid grid-cols-1 gap-2">
                 {['xsmall', 'small', 'normal', 'large', 'xlarge'].map(size => (
                   <button key={size} onClick={() => updateAppSettings({ fontSize: size as any })} className={`w-full py-3 px-4 rounded-xl text-start font-medium border ${appSettings.fontSize === size ? 'bg-denim-50 border-denim-500 text-denim-900' : 'bg-white border-cream-200 text-denim-500'}`}>{size}</button>
                 ))}
              </div>
           </section>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.settings.title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-32 md:pb-0">
        
        {/* DUPLICATED DASHBOARD PROFILE (MIRRORED LOOK) */}
        <section 
          onClick={() => onNavigate && onNavigate('profile')} 
          className="bg-denim-700 p-6 rounded-3xl shadow-xl border border-denim-600 cursor-pointer hover:bg-denim-800 transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 pattern-bg opacity-5 group-hover:opacity-10 transition-opacity"></div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative w-20 h-20">
              <img 
                src={currentUser?.avatar} 
                alt={currentUser?.name} 
                className="w-full h-full rounded-full object-cover border-2 border-white/20 shadow-lg"
              />
              <span className="absolute bottom-0 right-1 w-5 h-5 bg-green-500 border-4 border-denim-700 rounded-full rtl:left-1 rtl:right-auto"></span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-xl flex items-center gap-1.5">
                {currentUser?.name}
                {currentUser?.isAdmin && <BadgeCheck size={20} className="text-blue-400 fill-current" />}
              </h3>
              <p className="text-denim-100 text-sm font-medium mt-0.5 opacity-90">{t.common.online}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold tracking-wider border border-white/5 group-hover:bg-white/20 transition-colors">Lihat Profil</span>
              </div>
            </div>
            <ChevronRight size={24} className="text-white/40 group-hover:text-white transition-colors" />
          </div>
        </section>

        <section onClick={() => setActiveSection('account')} className="bg-white p-4 rounded-xl shadow-sm border border-cream-200 cursor-pointer hover:bg-cream-50 transition-colors"><div className="flex items-center gap-4"><div className="p-2.5 bg-denim-100 text-denim-600 rounded-xl"><UserIcon size={22}/></div><div className="flex-1"><h3 className="text-denim-900 font-bold">Akun</h3><p className="text-xs text-denim-500">Email, Password</p></div><ChevronRight size={18} className="text-denim-300"/></div></section>
        <section onClick={() => setActiveSection('chat')} className="bg-white p-4 rounded-xl shadow-sm border border-cream-200 cursor-pointer hover:bg-cream-50 transition-colors"><div className="flex items-center gap-4"><div className="p-2.5 bg-denim-100 text-denim-600 rounded-xl"><Palette size={22}/></div><div className="flex-1"><h3 className="text-denim-900 font-bold">Chat</h3><p className="text-xs text-denim-500">Wallpaper, Ukuran Teks</p></div><ChevronRight size={18} className="text-denim-300"/></div></section>
        <section className="bg-white p-4 rounded-xl shadow-sm border border-cream-200"><h3 className="flex items-center gap-2 text-denim-900 font-bold mb-3"><Bell size={18}/> Notifikasi</h3><SettingToggle label="Notifikasi Pesan" value={appSettings.notifMessage} onChange={(v) => updateAppSettings({ notifMessage: v })} /><SettingToggle label="Notifikasi Grup" value={appSettings.notifGroup} onChange={(v) => updateAppSettings({ notifGroup: v })} /><SettingToggle label="Notifikasi Desktop" value={appSettings.notifDesktop} onChange={(v) => updateAppSettings({ notifDesktop: v })} /></section>
        <section className="bg-white p-4 rounded-xl shadow-sm border border-cream-200"><h3 className="flex items-center gap-2 text-denim-900 font-bold mb-3"><Globe size={18}/> Bahasa</h3><div className="flex gap-2"><button onClick={() => updateAppSettings({ language: 'id' })} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${appSettings.language === 'id' ? 'bg-denim-100 border-denim-500' : 'bg-white border-cream-200'}`}>Indonesia</button><button onClick={() => updateAppSettings({ language: 'ar' })} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${appSettings.language === 'ar' ? 'bg-denim-100 border-denim-500' : 'bg-white border-cream-200'}`}>العربية</button></div></section>
        <button onClick={() => logout()} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 border border-red-100"><LogOut size={18} /> Keluar</button>
      </div>
    </div>
  );
};

export const ProfileView: React.FC<SidebarViewProps> = ({ onBack, appSettings }) => {
  const { currentUser, updateProfile } = useAuth();
  const t = translations[appSettings?.language || 'id'];
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!currentUser) return;
    setLoading(true);
    try { await updateProfile(name, bio, currentUser.phoneNumber || ''); setIsEditing(false); alert("Profil diperbarui!"); } finally { setLoading(false); }
  };
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try { const url = await uploadImageToCloudinary(e.target.files[0]); await updateProfile(currentUser!.name, currentUser!.bio || '', currentUser!.phoneNumber || '', url); alert("Foto diperbarui!"); } finally { setLoading(false); }
    }
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.profile.title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-32 md:pb-0">
         <div className="flex flex-col items-center mb-6"><div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}><img src={currentUser?.avatar} className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover bg-denim-200" /><div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={32} className="text-white" /></div><input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" /></div></div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-cream-200 space-y-4">
            <div><label className="text-xs font-bold text-denim-500 uppercase block mb-1">Nama</label>{isEditing ? ( <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-cream-300 rounded-lg px-3 py-2 text-denim-900" /> ) : ( <p className="text-lg font-medium text-denim-900">{currentUser?.name}</p> )}</div>
            <div><label className="text-xs font-bold text-denim-500 uppercase block mb-1">Bio</label>{isEditing ? ( <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full border border-cream-300 rounded-lg px-3 py-2 text-denim-900" /> ) : ( <p className="text-md text-denim-700">{currentUser?.bio || '-'}</p> )}</div>
            <div><label className="text-xs font-bold text-denim-500 uppercase block mb-1">Nomor HP</label><p className="text-md text-denim-600 font-mono bg-cream-50 p-2 rounded-lg">{currentUser?.phoneNumber}</p></div>
         </div>
         <div className="mt-6">{isEditing ? ( <div className="flex gap-3"><button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-cream-200 text-denim-700 font-bold rounded-xl">Batal</button><button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-denim-600 text-white font-bold rounded-xl flex justify-center items-center gap-2">{loading && <Loader2 size={16} className="animate-spin"/>} Simpan</button></div> ) : ( <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-denim-600 text-white font-bold rounded-xl">Edit Profil</button> )}</div>
      </div>
    </div>
  );
};

export const HelpView: React.FC<SidebarViewProps> = ({ onBack, appSettings }) => {
    const t = translations[appSettings?.language || 'id'];
    return (
        <div className="h-full flex flex-col bg-cream-100">
            <ViewHeader title={t.settings.help.title} onBack={onBack} />
            <div className="p-4 space-y-2 pb-32 md:pb-0"><div className="bg-white p-4 rounded-xl shadow-sm"><h3 className="font-bold mb-2">Bantuan</h3><p className="text-sm text-gray-600">Hubungi admin untuk dukungan teknis.</p></div></div>
        </div>
    );
};

export const renderSidebarView = ( view: ViewState, onBack: () => void, onStartChat?: (contactUid: string) => void, onOpenGroupChat?: (chat: ChatPreview) => void, appSettings?: AppSettings, updateAppSettings?: (settings: Partial<AppSettings>) => void, contactsMap?: Record<string, Contact>, adminProfile?: User | null, onNavigate?: (view: ViewState) => void, setTargetStatusId?: (id: string | null) => void, targetStatusId?: string | null) => {
  switch (view) {
    case 'status': return <StatusView onBack={onBack} appSettings={appSettings} contactsMap={contactsMap} adminProfile={adminProfile} onNavigate={onNavigate} targetStatusId={targetStatusId} setTargetStatusId={setTargetStatusId} />;
    case 'my_status': return <MyStatusView onBack={onBack} appSettings={appSettings} targetStatusId={targetStatusId} setTargetStatusId={setTargetStatusId} contactsMap={contactsMap} adminProfile={adminProfile} onNavigate={onNavigate} />;
    case 'notifications': return <NotificationsView onBack={onBack} appSettings={appSettings} onNavigate={onNavigate} setTargetStatusId={setTargetStatusId} />;
    case 'groups': return <GroupsView onBack={onBack} onOpenGroupChat={onOpenGroupChat} appSettings={appSettings} contactsMap={contactsMap} />;
    case 'contacts': return <ContactsView onBack={onBack} onStartChat={onStartChat} appSettings={appSettings} />;
    case 'settings': return <SettingsView onBack={onBack} appSettings={appSettings} updateAppSettings={updateAppSettings} onNavigate={onNavigate} />;
    case 'help': return <HelpView onBack={onBack} appSettings={appSettings} />; 
    case 'profile': return <ProfileView onBack={onBack} appSettings={appSettings} />;
    case 'broadcast': return <BroadcastView onBack={onBack} appSettings={appSettings} />;
    default: return null;
  }
};
