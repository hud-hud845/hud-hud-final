
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, X, Loader2, ImageIcon, Activity, Globe, MoreHorizontal, 
  Edit, Trash2, Heart, MessageCircle as MessageIcon, BadgeCheck, 
  ChevronDown, AlertTriangle, UserPlus, Send, CornerDownRight, MoreVertical,
  LayoutDashboard, Play, Maximize, ExternalLink, Lock, RotateCcw, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ref, push, set, onValue, remove, update, query as rtdbQuery, orderByChild, equalTo, limitToLast, get } from 'firebase/database';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { rtdb, db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { uploadMedia } from '../services/storageService';
import { translations } from '../utils/translations';
import { ViewHeader } from './SidebarViews';
import { AppSettings } from './Layout';
import { Status, Comment, User, Contact, ViewState } from '../types';

interface StatusViewProps {
  onBack: () => void;
  appSettings?: AppSettings;
  contactsMap?: Record<string, Contact>;
  adminProfile?: User | null;
  onNavigate?: (view: ViewState) => void;
  targetStatusId?: string | null;
  setTargetStatusId?: (id: string | null) => void;
}

export const StatusView: React.FC<StatusViewProps> = ({ 
  onBack, appSettings, contactsMap, adminProfile, onNavigate, targetStatusId, setTargetStatusId 
}) => {
    const { currentUser } = useAuth();
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageSize, setPageSize] = useState(30);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isEditingStatus, setIsEditingStatus] = useState<string | null>(null);
    const [statusText, setStatusText] = useState('');
    const [statusImage, setStatusImage] = useState<File | null>(null);
    const [statusImagePreview, setStatusImagePreview] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeMenuStatusId, setActiveMenuStatusId] = useState<string | null>(null);
    
    const [isTrashView, setIsTrashView] = useState(false);
    const [moderationConfirm, setModerationConfirm] = useState<{isOpen: boolean, id: string | null, type: 'delete' | 'restore'}>({
      isOpen: false, id: null, type: 'delete'
    });

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

    const [pendingExternalLink, setPendingExternalLink] = useState<string | null>(null);
    const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
    const [isVideoZoomed, setIsVideoZoomed] = useState(false);

    const t = translations[appSettings?.language || 'id'];
    const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); };

    useEffect(() => {
        if (!loading && targetStatusId && statuses.length > 0) {
            setTimeout(() => {
                const element = document.getElementById(`status-${targetStatusId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-4', 'ring-denim-400', 'ring-opacity-50');
                    setTimeout(() => element.classList.remove('ring-4', 'ring-denim-400', 'ring-opacity-50'), 3000);
                    if (setTargetStatusId) setTargetStatusId(null); 
                }
            }, 500);
        }
    }, [loading, targetStatusId, statuses]);

    useEffect(() => {
      setLoading(true);
      const path = isTrashView ? 'deleted_statuses' : 'statuses';
      const statusesRef = rtdbQuery(ref(rtdb, path), orderByChild('createdAt'), limitToLast(pageSize));
      
      const unsubscribe = onValue(statusesRef, (snapshot) => {
        const val = snapshot.val();
        const now = Date.now();
        if (val) {
          const list = Object.entries(val).map(([id, data]: [string, any]) => ({
            id,
            ...data,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            likes: data.likes ? Object.keys(data.likes) : []
          }))
          .filter(s => isTrashView || !s.expiresAt || s.expiresAt > now);

          const reversed = list.sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
          
          if (!isTrashView) {
            const contactStatuses = reversed.filter(s => contactsMap && contactsMap[s.userId]);
            const otherStatuses = reversed.filter(s => !contactsMap || !contactsMap[s.userId]);
            setStatuses([...contactStatuses, ...otherStatuses]);
          } else {
            setStatuses(reversed);
          }
        } else {
          setStatuses([]);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }, [pageSize, contactsMap, isTrashView]);

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

    const handleSubmitStatus = async () => {
      if (!statusText && !statusImage && !statusImagePreview) return;
      setIsPosting(true);
      try {
          let imageUrl = statusImagePreview || '';
          if (statusImage) {
            imageUrl = await uploadMedia(statusImage, 'status', (p) => setUploadProgress(p));
          }
          if (isEditingStatus) { await update(ref(rtdb, `statuses/${isEditingStatus}`), { content: statusText, imageUrl, updatedAt: Date.now() }); showToast("Status diperbarui"); }
          else {
              const newRef = push(ref(rtdb, 'statuses'));
              await set(newRef, { 
                userId: currentUser!.id, 
                author: { name: currentUser!.name, avatar: currentUser!.avatar, isAdmin: currentUser!.isAdmin || false }, 
                content: statusText, 
                imageUrl, 
                createdAt: Date.now(), 
                expiresAt: Date.now() + (48 * 60 * 60 * 1000), 
                commentsCount: 0 
              });
              showToast("Status dikirim");
          }
          setShowCreateModal(false); setIsEditingStatus(null); setStatusText(''); setStatusImage(null); setStatusImagePreview(null);
      } catch (error) { alert("Error memproses status"); } finally { setIsPosting(false); setUploadProgress(''); }
    };

    const handleModerationAction = async () => {
      const { id, type } = moderationConfirm;
      if (!id || !currentUser?.isAdmin) return;
      setIsPosting(true);
      try {
        const sourcePath = type === 'delete' ? `statuses/${id}` : `deleted_statuses/${id}`;
        const targetPath = type === 'delete' ? `deleted_statuses/${id}` : `statuses/${id}`;
        const snapshot = await get(ref(rtdb, sourcePath));
        if (snapshot.exists()) {
           const data = snapshot.val();
           await set(ref(rtdb, targetPath), data);
           await remove(ref(rtdb, sourcePath));
           showToast(type === 'delete' ? "Postingan dipindah ke sampah" : "Postingan berhasil dipulihkan");
        }
      } catch (e) {
        alert("Gagal memproses moderasi.");
      } finally {
        setIsPosting(false);
        setModerationConfirm({ isOpen: false, id: null, type: 'delete' });
        setActiveMenuStatusId(null);
      }
    };

    const checkVideo = (content: string) => {
        if (!content) return null;
        const youtubeRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/i;
        const ytMatch = content.match(youtubeRegex);
        if (ytMatch && ytMatch[2].length === 11) {
            const videoId = ytMatch[2];
            return { type: 'youtube', id: videoId, url: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0&mute=0` };
        }
        const directMatch = content.match(/(https?:\/\/[^\s]+\.(mp4|webm|ogg))/i);
        if (directMatch) { return { type: 'direct', url: directMatch[0] }; }
        return null;
    };

    const parseContent = (content: string) => {
        if (!content) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = content.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <button key={i} onClick={(e) => { 
                            e.stopPropagation(); 
                            const videoData = checkVideo(part);
                            if (videoData) { setActiveVideoUrl(videoData.url); } else { setPendingExternalLink(part); }
                        }}
                        className="text-blue-500 hover:underline break-all text-start font-bold"
                    >
                        {part}
                    </button>
                );
            }
            return part;
        });
    };

    const handleLike = async (statusId: string, currentLikes: string[], ownerId: string) => {
        if (!currentUser || isTrashView) return;
        const isLiked = currentLikes.includes(currentUser.id);
        const likeRef = ref(rtdb, `statuses/${statusId}/likes/${currentUser.id}`);
        if (isLiked) await remove(likeRef);
        else {
          await set(likeRef, true);
          if (currentUser.id !== ownerId) {
             const targetStatus = statuses.find(s => s.id === statusId);
             const nRef = push(ref(rtdb, `notifications/${ownerId}`));
             await set(nRef, { 
               id: nRef.key, 
               senderId: currentUser.id, 
               senderName: currentUser.name, 
               senderAvatar: currentUser.avatar, 
               type: 'like', 
               statusId, 
               previewText: '', 
               read: false, 
               createdAt: Date.now(), 
               expiresAt: Date.now() + (48 * 60 * 60 * 1000),
               statusOwnerId: ownerId,
               statusOwnerName: targetStatus?.author.name || 'Seseorang'
             });
          }
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !activeCommentStatusId || !currentUser) return;
        setSendingComment(true);
        try {
            const commentRef = push(ref(rtdb, `comments/${activeCommentStatusId}`));
            await set(commentRef, { 
              userId: currentUser.id, 
              userName: currentUser.name, 
              userAvatar: currentUser.avatar, 
              isAdmin: currentUser.id === adminProfile?.id || false, 
              text: commentText, 
              createdAt: Date.now(), 
              replyTo: replyingTo ? { userName: replyingTo.name, text: replyingTo.text } : null 
            });
            
            const target = statuses.find(s => s.id === activeCommentStatusId);
            if (target) {
                await update(ref(rtdb, `statuses/${activeCommentStatusId}`), { commentsCount: (target.commentsCount || 0) + 1 });
                
                // --- LOGIKA NOTIFIKASI ALA FACEBOOK ---
                const participants = new Set<string>(comments.map(c => c.userId));
                const ownerId = target.userId;
                const replyTargetId = replyingTo?.userId;
                
                // Kumpulkan semua penerima notifikasi unik
                const notifiedUsers = new Set<string>();

                // 1. Notifikasi ke Pemilik Status (Jika bukan pengirim sendiri)
                if (ownerId !== currentUser.id) {
                    const nRef = push(ref(rtdb, `notifications/${ownerId}`));
                    await set(nRef, {
                        id: nRef.key, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar,
                        type: 'comment', statusId: activeCommentStatusId, previewText: commentText, read: false,
                        createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000),
                        statusOwnerId: ownerId, statusOwnerName: target.author.name
                    });
                    notifiedUsers.add(ownerId);
                }

                // 2. Notifikasi ke Target Balasan (Jika ada dan bukan pemilik status & bukan diri sendiri)
                if (replyTargetId && replyTargetId !== currentUser.id && !notifiedUsers.has(replyTargetId)) {
                    const nRef = push(ref(rtdb, `notifications/${replyTargetId}`));
                    await set(nRef, {
                        id: nRef.key, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar,
                        type: 'reply', statusId: activeCommentStatusId, previewText: commentText, read: false,
                        createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000),
                        statusOwnerId: ownerId, statusOwnerName: target.author.name
                    });
                    notifiedUsers.add(replyTargetId);
                }

                // 3. Notifikasi ke Peserta Lain (Yang pernah komen tapi bukan owner/target balasan/diri sendiri)
                participants.forEach(async (participantId) => {
                    if (participantId !== currentUser.id && !notifiedUsers.has(participantId)) {
                        const nRef = push(ref(rtdb, `notifications/${participantId}`));
                        await set(nRef, {
                            id: nRef.key, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar,
                            type: 'comment', statusId: activeCommentStatusId, previewText: commentText, read: false,
                            createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000),
                            statusOwnerId: ownerId, statusOwnerName: target.author.name
                        });
                        notifiedUsers.add(participantId);
                    }
                });
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

    const filteredStatuses = statuses.filter(s => 
      s.author.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.content && s.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
        <ViewHeader 
          title={isTrashView ? "Tong Sampah" : t.status.title} 
          onBack={isTrashView ? () => setIsTrashView(false) : onBack} 
          rightAction={
            <div className="flex items-center gap-2">
              {currentUser?.isAdmin && (
                <button 
                  onClick={() => setIsTrashView(!isTrashView)}
                  className={`p-2.5 rounded-full transition-all shadow-sm ${isTrashView ? 'bg-red-600 text-white shadow-red-200' : 'bg-cream-200/80 text-denim-800 hover:bg-cream-300'}`}
                  title="Lihat Postingan Terhapus"
                >
                  <Trash2 size={22} strokeWidth={2.5} />
                </button>
              )}
              {!isTrashView && (
                <button 
                  onClick={() => { setIsEditingStatus(null); setStatusText(''); setStatusImagePreview(null); setShowCreateModal(true); }}
                  className="p-2.5 bg-cream-200/80 hover:bg-cream-300 rounded-full text-denim-800 transition-all shadow-sm"
                >
                  <Plus size={22} strokeWidth={2.5} />
                </button>
              )}
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-2.5 rounded-full transition-all shadow-sm ${isSearchOpen ? 'text-denim-900 bg-cream-300' : 'bg-cream-200/80 text-denim-800 hover:bg-cream-300'}`}
              >
                <Search size={22} strokeWidth={2.5} />
              </button>
              
              {currentUser?.isProfessional && !isTrashView && (
                <button 
                  onClick={() => onNavigate && onNavigate('professional_dashboard')}
                  className="p-2.5 bg-cream-200/80 hover:bg-cream-300 rounded-full text-denim-800 transition-all shadow-sm"
                  title="Dashboard Pro"
                >
                  <LayoutDashboard size={22} strokeWidth={2.5} />
                </button>
              )}
            </div>
          }
        />
        
        {isSearchOpen && (
          <div className="px-4 py-3 bg-white border-b border-cream-200 shadow-sm animate-in slide-in-from-top-2 duration-200 z-20">
             <div className="relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-denim-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Cari kata kunci..." 
                 value={searchTerm} 
                 onChange={(e) => setSearchTerm(e.target.value)} 
                 className="w-full bg-cream-50 border border-cream-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-denim-500 transition-all"
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
           {!isTrashView && (
             <div className="bg-white p-4 mb-2 border-b border-cream-200 shadow-sm">
               <div className="flex gap-3 items-center">
                 <img src={currentUser?.avatar} className="w-10 h-10 rounded-full object-cover border border-cream-200 cursor-pointer" onClick={() => onNavigate && onNavigate('my_status')} />
                 <div onClick={() => { setIsEditingStatus(null); setStatusText(''); setStatusImagePreview(null); setShowCreateModal(true); }} className="flex-1 bg-cream-50 hover:bg-cream-100 rounded-full px-4 py-2.5 cursor-pointer border border-cream-200 transition-colors">
                   <span className="text-denim-400 text-sm">{t.status.placeholder}</span>
                 </div>
                 <button onClick={() => { setIsEditingStatus(null); setStatusText(''); setStatusImagePreview(null); setShowCreateModal(true); setTimeout(() => fileInputRef.current?.click(), 100); }} className="text-green-600 hover:bg-green-50 p-2 rounded-full">
                   <ImageIcon size={24}/>
                 </button>
               </div>
             </div>
           )}

           {isTrashView && (
             <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
               <AlertTriangle size={20} className="text-red-500" />
               <p className="text-xs font-bold text-red-700 uppercase tracking-tighter leading-tight">MODERASI ADMIN: Postingan di bawah ini telah disembunyikan dari feed utama pengguna.</p>
             </div>
           )}
           
           {loading ? ( 
               <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div> 
           ) : filteredStatuses.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 text-denim-400 h-[60vh]">
                 <div className="w-20 h-20 bg-cream-200 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                    {isTrashView ? <Trash2 size={40} className="text-denim-300 opacity-40" /> : <Activity size={40} className="text-denim-300 opacity-40" />}
                 </div>
                 <p className="font-black uppercase tracking-[0.2em] text-xs text-denim-300 mb-1">{isTrashView ? "Tong Sampah" : "Status Kosong"}</p>
                 <p className="font-bold text-sm text-denim-400">{isTrashView ? "Belum ada postingan yang dihapus" : "Tidak ada status ditemukan"}</p>
               </div>
           ) : (
               <div className="space-y-3 pb-4 px-2 pt-2">
                   {filteredStatuses.map(status => {
                       const isLiked = status.likes.includes(currentUser!.id);
                       const isOwner = status.userId === currentUser!.id;
                       const isContact = contactsMap && contactsMap[status.userId];
                       const videoData = checkVideo(status.content || '');

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
                                       </h4>
                                       <p className="text-[11px] text-denim-400 leading-tight mt-0.5">{status.createdAt ? format(status.createdAt, 'HH:mm • dd MMM') : ''} • Public</p>
                                     </div>
                                   </div>
                                   
                                   <div className="relative">
                                     <button onClick={(e) => { e.stopPropagation(); setActiveMenuStatusId(activeMenuStatusId === status.id ? null : status.id); }} className="text-denim-300 hover:text-denim-600 p-2 rounded-full">
                                       <MoreHorizontal size={20} />
                                     </button>
                                     {activeMenuStatusId === status.id && (
                                       <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-cream-200 z-20 animate-in zoom-in-95 origin-top-right overflow-hidden">
                                         {isTrashView ? (
                                           currentUser?.isAdmin && (
                                             <button 
                                               onClick={() => setModerationConfirm({ isOpen: true, id: status.id, type: 'restore' })}
                                               className="w-full px-4 py-3 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                             >
                                               <RotateCcw size={16}/> Tampilkan Kembali
                                             </button>
                                           )
                                         ) : (
                                           <>
                                             {isOwner && (
                                               <button onClick={() => { setStatusText(status.content || ''); setStatusImagePreview(status.imageUrl || null); setIsEditingStatus(status.id); setActiveMenuStatusId(null); setShowCreateModal(true); }} className="w-full px-4 py-3 text-left text-sm text-denim-700 hover:bg-cream-50 flex items-center gap-2"><Edit size={16}/> Edit Status</button>
                                             )}
                                             {!isOwner && currentUser?.isAdmin && (
                                               <button 
                                                 onClick={() => setModerationConfirm({ isOpen: true, id: status.id, type: 'delete' })}
                                                 className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                               >
                                                 <Trash2 size={16}/> Hapus Postingan
                                               </button>
                                             )}
                                             {isOwner && (
                                               <button onClick={() => { setActiveMenuStatusId(null); setDeleteConfirm({ isOpen: true, id: status.id }); }} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-cream-100"><Trash2 size={16}/> Hapus Permanen</button>
                                             )}
                                           </>
                                         )}
                                       </div>
                                     )}
                                   </div>
                               </div>
                               
                               {status.content && (
                                 <div className={`px-4 pb-2 ${status.imageUrl ? 'text-sm' : 'text-lg py-2'} text-denim-900 whitespace-pre-wrap font-medium`}>
                                   {parseContent(status.content)}
                                 </div>
                               )}

                               {status.imageUrl ? (
                                   <div className="w-full bg-cream-50 border-t border-cream-100 cursor-pointer overflow-hidden group" onClick={() => setZoomImage(status.imageUrl!)}>
                                       <img src={status.imageUrl} className="w-full h-auto max-h-[600px] object-contain group-hover:scale-[1.02] transition-transform" loading="lazy" />
                                   </div>
                               ) : videoData ? (
                                   <div className="w-full bg-black aspect-video relative cursor-pointer group border-t border-cream-100 overflow-hidden" onClick={() => setActiveVideoUrl(videoData.url)}>
                                       {videoData.type === 'youtube' ? (
                                           <img src={`https://img.youtube.com/vi/${videoData.id}/maxresdefault.jpg`} className="w-full h-full object-cover opacity-60" onError={(e) => (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoData.id}/0.jpg`} />
                                       ) : (
                                           <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                                               <Play size={64} strokeWidth={1} />
                                               <span className="text-[10px] font-black uppercase mt-2 tracking-widest">Video Post</span>
                                           </div>
                                       )}
                                       <div className="absolute inset-0 flex items-center justify-center z-10">
                                           <div className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white shadow-2xl group-hover:scale-110 transition-transform">
                                               <Play size={32} fill="currentColor" />
                                           </div>
                                       </div>
                                   </div>
                               ) : null}

                               <div className="px-4 py-2 flex justify-between text-xs text-denim-500 border-b border-cream-50/50"><div className="flex items-center gap-1">{status.likes.length > 0 && <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm"><Heart size={8} className="text-white fill-current"/></div>}<span>{status.likes.length > 0 ? status.likes.length : ''}</span></div><span>{status.commentsCount > 0 ? `${status.commentsCount} ${t.status.comment}` : ''}</span></div>
                               <div className="flex items-center px-2 py-1">
                                 <button disabled={isTrashView} onClick={() => handleLike(status.id, status.likes, status.userId)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-cream-50 transition-all ${isLiked ? 'text-red-500 font-bold' : 'text-denim-600'} ${isTrashView ? 'opacity-30' : ''}`}><Heart size={20} className={isLiked ? 'fill-current' : ''} /><span className="text-sm">{t.status.like}</span></button>
                                 <button disabled={isTrashView} onClick={() => setActiveCommentStatusId(status.id)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-cream-50 transition-all text-denim-600 ${isTrashView ? 'opacity-30' : ''}`}><MessageIcon size={20} /><span className="text-sm">{t.status.comment}</span></button>
                               </div>
                           </div>
                       );
                   })}
               </div>
           )}
        </div>

        {/* MODAL KOMENTAR */}
        {activeCommentStatusId && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => { setActiveCommentStatusId(null); setReplyingTo(null); }}>
            <div className="bg-white w-full sm:max-w-md h-[85%] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-50 shrink-0">
                <h3 className="font-bold text-denim-900">{t.status.comment}</h3>
                <button onClick={() => setActiveCommentStatusId(null)} className="p-1 bg-cream-200 rounded-full hover:bg-cream-300 transition-colors"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-cream-50 space-y-4">
                {comments.length === 0 && <p className="text-center text-denim-300 text-sm mt-10">Belum ada komentar.</p>}
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3 relative">
                    <img src={c.userAvatar} className="w-8 h-8 rounded-full object-cover shrink-0 border border-cream-200"/>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-cream-200 shadow-sm max-w-[85%] relative group">
                      <div className="flex justify-between items-start gap-4">
                        <h5 className="font-bold text-xs text-denim-900 flex items-center gap-1">{c.userName}{c.isAdmin && <BadgeCheck size={12} className="text-white fill-blue-500" />}</h5>
                        <button onClick={() => setActiveCommentMenuId(activeCommentMenuId === c.id ? null : c.id)} className="text-denim-300 hover:text-denim-600 p-1 -mt-1 -mr-1 transition-colors"><MoreVertical size={14} /></button>
                      </div>
                      {c.replyTo && (
                        <div className="bg-cream-50 p-2 rounded-xl border-l-2 border-denim-400 mb-1.5">
                          <p className="text-[10px] font-bold text-denim-600">{c.replyTo.userName}</p>
                          <p className="text-[10px] text-denim-400 truncate italic">"{c.replyTo.text}"</p>
                        </div>
                      )}
                      <p className="text-sm text-denim-700 leading-snug">{c.text}</p>
                      {activeCommentMenuId === c.id && (
                        <div className="absolute right-0 top-7 bg-white shadow-xl border border-cream-200 rounded-xl z-30 py-1 w-28 animate-in zoom-in-95 origin-top-right overflow-hidden">
                          <button onClick={() => { setReplyingTo({id: c.id, name: c.userName, text: c.text, userId: c.userId}); setActiveCommentMenuId(null); }} className="w-full text-left px-3 py-2.5 text-xs hover:bg-cream-50 flex items-center gap-2 text-denim-700"><CornerDownRight size={14} /> Balas</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-cream-200 bg-white shrink-0 pb-safe">
                {replyingTo && (
                  <div className="flex justify-between items-center bg-cream-100 p-2.5 rounded-xl mb-3 text-xs border border-denim-200 animate-in slide-in-from-bottom-2">
                    <span className="text-denim-600 truncate">Balas ke <b>{replyingTo.name}</b></span>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white rounded-full"><X size={14} className="text-denim-400" /></button>
                  </div>
                )}
                <form onSubmit={handleSendComment} className="flex gap-2 items-center">
                  <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={replyingTo ? `Tulis balasan...` : t.status.writeComment} className="flex-1 bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 shadow-inner" autoFocus={!!replyingTo}/>
                  <button disabled={!commentText.trim() || sendingComment} className="p-3 bg-denim-600 text-white rounded-2xl hover:bg-denim-700 disabled:opacity-50 transition-all shadow-md active:scale-90"><Send size={20} /></button>
                </form>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-denim-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="animated-status-border w-full max-w-md animate-in zoom-in-95">
              <div className="animated-status-content flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-50/50 shrink-0">
                  <h3 className="font-bold text-denim-900 text-lg w-full text-center">{isEditingStatus ? 'Edit Status' : t.status.create}</h3>
                  <button onClick={() => setShowCreateModal(false)} className="absolute right-4 p-2 bg-cream-200 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-white">
                  <textarea value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder={t.status.placeholder} className="w-full min-h-[120px] text-lg border-none focus:ring-0 resize-none p-2 rounded-2xl bg-cream-50 text-denim-900" autoFocus />
                  {statusImagePreview && ( 
                    <div className="relative mt-4 rounded-xl overflow-hidden border border-cream-200">
                      <img src={statusImagePreview} className="w-full h-auto max-h-[300px] object-cover" />
                      <button onClick={() => { setStatusImage(null); setStatusImagePreview(null); }} className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-lg"><X size={18}/></button>
                    </div> 
                  )}
                </div>
                <div className="p-4 border-t border-cream-200 bg-white shrink-0">
                   <div className="flex gap-2 mb-4">
                      <label className="p-3 bg-cream-50 hover:bg-cream-100 rounded-xl cursor-pointer transition-colors text-green-600 flex items-center gap-2 text-sm font-bold border border-cream-200">
                        <ImageIcon size={20} /> {uploadProgress || "Tambah Foto"}
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files && e.target.files[0]) { setStatusImage(e.target.files[0]); setStatusImagePreview(URL.createObjectURL(e.target.files[0])); } }} />
                      </label>
                   </div>
                  <button onClick={handleSubmitStatus} disabled={isPosting || (!statusText && !statusImage && !statusImagePreview)} className="w-full bg-denim-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-denim-700 transition-all active:scale-95 disabled:opacity-50"> 
                    {isPosting ? <Loader2 size={20} className="animate-spin" /> : (isEditingStatus ? 'Update' : t.status.post)} 
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm.isOpen && (<div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"><div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={28} /></div><h3 className="text-lg font-bold text-denim-900 mb-2">Hapus Permanen?</h3><p className="text-sm text-denim-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm({isOpen: false, id: null})} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl font-bold text-sm">Batal</button><button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg">Hapus</button></div></div></div>)}
        {zoomImage && (<div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-0 animate-in fade-in duration-300" onClick={() => setZoomImage(null)}><button className="absolute top-4 right-4 text-white p-2 bg-black/40 rounded-full"><X size={28} /></button><img src={zoomImage} className="max-w-full max-h-full object-contain" /></div>)}
        {activeVideoUrl && (
          <div className={`fixed inset-0 z-[160] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-300 ${isVideoZoomed ? 'p-0' : 'p-4'}`}>
              <div className={`relative bg-black w-full shadow-2xl transition-all duration-500 flex flex-col ${isVideoZoomed ? 'h-full' : 'max-w-4xl aspect-video rounded-3xl overflow-hidden'}`}>
                  <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-20 flex gap-2">
                      <button onClick={() => setIsVideoZoomed(!isVideoZoomed)} className="p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"><Maximize size={24} /></button>
                      <button onClick={() => { setActiveVideoUrl(null); setIsVideoZoomed(false); }} className="p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors"><X size={24} /></button>
                  </div>
                  {activeVideoUrl.includes('youtube.com/embed') ? (
                      <iframe src={activeVideoUrl} className="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen title="Hud-Hud YouTube Player" />
                  ) : (
                      <video src={activeVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                  )}
              </div>
          </div>
        )}
      </div>
    );
};

export const MyStatusView: React.FC<StatusViewProps> = ({ onBack, appSettings, contactsMap, adminProfile, onNavigate }) => {
  const { currentUser } = useAuth();
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [isVideoZoomed, setIsVideoZoomed] = useState(false);

  const t = translations[appSettings?.language || 'id'];

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const statusesRef = rtdbQuery(ref(rtdb, 'statuses'), orderByChild('userId'), equalTo(currentUser.id));
    const unsubscribe = onValue(statusesRef, (snapshot) => {
        const val = snapshot.val();
        const now = Date.now();
        if (val) {
          const list = Object.entries(val).map(([id, data]: [string, any]) => ({ id, ...data, createdAt: data.createdAt ? new Date(data.createdAt) : new Date(), likes: data.likes ? Object.keys(data.likes) : [] }))
          .filter(s => !s.expiresAt || s.expiresAt > now)
          .sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
          setMyStatuses(list);
        } else { setMyStatuses([]); }
        setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

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
          await set(commentRef, { 
            userId: currentUser.id, 
            userName: currentUser.name, 
            userAvatar: currentUser.avatar, 
            text: commentText, 
            createdAt: Date.now(), 
            replyTo: replyingTo ? { userName: replyingTo.name, text: replyingTo.text } : null 
          });
          
          const target = myStatuses.find(s => s.id === activeCommentStatusId);
          if (target) {
              await update(ref(rtdb, `statuses/${activeCommentStatusId}`), { commentsCount: (target.commentsCount || 0) + 1 });
              
              const participants = new Set<string>(comments.map(c => c.userId));
              const ownerId = target.userId;
              const replyTargetId = replyingTo?.userId;
              const notifiedUsers = new Set<string>();

              if (ownerId !== currentUser.id) {
                const nRef = push(ref(rtdb, `notifications/${ownerId}`));
                await set(nRef, {
                    id: nRef.key, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar,
                    type: 'comment', statusId: activeCommentStatusId, previewText: commentText, read: false,
                    createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000),
                    statusOwnerId: ownerId, statusOwnerName: currentUser.name // Dalam MyStatus, pengirim adalah owner
                });
                notifiedUsers.add(ownerId);
              }

              if (replyTargetId && replyTargetId !== currentUser.id && !notifiedUsers.has(replyTargetId)) {
                const nRef = push(ref(rtdb, `notifications/${replyTargetId}`));
                await set(nRef, {
                    id: nRef.key, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar,
                    type: 'reply', statusId: activeCommentStatusId, previewText: commentText, read: false,
                    createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000),
                    statusOwnerId: ownerId, statusOwnerName: currentUser.name
                });
                notifiedUsers.add(replyTargetId);
              }

              participants.forEach(async (participantId) => {
                  if (participantId !== currentUser.id && !notifiedUsers.has(participantId)) {
                      const nRef = push(ref(rtdb, `notifications/${participantId}`));
                      await set(nRef, {
                          id: nRef.key, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar,
                          type: 'comment', statusId: activeCommentStatusId, previewText: commentText, read: false,
                          createdAt: Date.now(), expiresAt: Date.now() + (48 * 60 * 60 * 1000),
                          statusOwnerId: ownerId, statusOwnerName: currentUser.name
                      });
                      notifiedUsers.add(participantId);
                  }
              });
          }
          setCommentText(''); setReplyingTo(null);
      } finally { setSendingComment(false); }
  };

  const checkVideo = (content: string) => {
    if (!content) return null;
    const youtubeRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/i;
    const ytMatch = content.match(youtubeRegex);
    if (ytMatch && ytMatch[2].length === 11) {
        const videoId = ytMatch[2];
        return { type: 'youtube', id: videoId, url: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0&mute=0` };
    }
    const directMatch = content.match(/(https?:\/\/[^\s]+\.(mp4|webm|ogg))/i);
    if (directMatch) { return { type: 'direct', url: directMatch[0] }; }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.status.myStatus} onBack={onBack} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 px-2 pb-32">
        {loading ? ( <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div> ) : myStatuses.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-10 text-denim-400 h-64"><Activity size={32} className="text-denim-300 mb-3" /><p className="font-medium text-sm text-center">{t.status.noStatus}</p></div>
        ) : (
             <div className="space-y-3 pb-4">
                {myStatuses.map(status => (
                    <div key={status.id} id={`status-${status.id}`} className="bg-white border border-cream-200 rounded-2xl shadow-sm animate-in fade-in duration-300 overflow-hidden">
                        <div className="p-3 flex items-center justify-between"><div className="flex items-center gap-3"><img src={currentUser?.avatar} className="w-10 h-10 rounded-full object-cover border border-cream-100" /><div><h4 className="font-bold text-denim-900 text-sm leading-tight flex items-center gap-1">{currentUser?.name}{currentUser?.isAdmin && <BadgeCheck size={14} className="text-white fill-blue-500" />}</h4><p className="text-[11px] text-denim-400 leading-tight mt-0.5">{status.createdAt ? format(status.createdAt, 'HH:mm • dd MMM') : ''} • Me</p></div></div><div className="relative"><button onClick={(e) => { e.stopPropagation(); setActiveMenuStatusId(activeMenuStatusId === status.id ? null : status.id); }} className="text-denim-300 hover:text-denim-600 p-2 rounded-full"><MoreVertical size={20} /></button>{activeMenuStatusId === status.id && (<div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-xl border border-cream-200 z-20 animate-in zoom-in-95 origin-top-right overflow-hidden"><button onClick={() => { setStatusText(status.content || ''); setStatusImagePreview(status.imageUrl || null); setIsEditingStatus(status.id); setActiveMenuStatusId(null); setShowCreateModal(true); }} className="w-full px-4 py-3 text-left text-sm text-denim-700 hover:bg-cream-50 flex items-center gap-2"><Edit size={16}/> Edit Status</button><button onClick={() => setDeleteConfirm({ isOpen: true, id: status.id })} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-cream-100"><Trash2 size={16}/> Hapus Status</button></div>)}</div></div>
                        <div className="px-4 pb-2 text-denim-900 whitespace-pre-wrap font-medium">{status.content}</div>
                        {status.imageUrl && (
                            <div className="w-full bg-cream-50 border-t border-cream-100 cursor-pointer overflow-hidden group" onClick={() => setZoomImage(status.imageUrl!)}>
                                <img src={status.imageUrl} className="w-full h-auto max-h-[600px] object-contain group-hover:scale-[1.02] transition-transform duration-500" loading="lazy" />
                            </div>
                        )}
                        <div className="px-4 py-2 flex justify-between text-xs text-denim-500 border-b border-cream-50/50"><div className="flex items-center gap-1">{status.likes.length > 0 && <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm"><Heart size={8} className="text-white fill-current"/></div>}<span>{status.likes.length}</span></div><button onClick={() => setActiveCommentStatusId(status.id)} className="flex items-center gap-1"><MessageIcon size={14} className="text-denim-400" /><span>{status.commentsCount} {t.status.comment}</span></button></div>
                        <div className="flex items-center px-2 py-1"><button onClick={() => handleLike(status.id, status.likes)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${status.likes.includes(currentUser!.id) ? 'text-red-500 font-bold' : 'text-denim-600'}`}><Heart size={20} className={status.likes.includes(currentUser!.id) ? 'fill-current' : ''} /><span className="text-sm">{t.status.like}</span></button><button onClick={() => setActiveCommentStatusId(status.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-denim-600"><MessageIcon size={20} /><span className="text-sm">{t.status.comment}</span></button></div>
                    </div>
                ))}
             </div>
        )}
      </div>

      {/* MODAL KOMENTAR */}
      {activeCommentStatusId && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => { setActiveCommentStatusId(null); setReplyingTo(null); }}>
          <div className="bg-white w-full sm:max-w-md h-[85%] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-50 shrink-0">
              <h3 className="font-bold text-denim-900">{t.status.comment}</h3>
              <button onClick={() => setActiveCommentStatusId(null)} className="p-1 bg-cream-200 rounded-full hover:bg-cream-300 transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-cream-50 space-y-4">
              {comments.length === 0 && <p className="text-center text-denim-300 text-sm mt-10">Belum ada komentar.</p>}
              {comments.map(c => (
                <div key={c.id} className="flex gap-3 relative">
                  <img src={c.userAvatar} className="w-8 h-8 rounded-full object-cover shrink-0 border border-cream-200"/>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-cream-200 shadow-sm max-w-[85%] relative group">
                    <div className="flex justify-between items-start gap-4">
                      <h5 className="font-bold text-xs text-denim-900 flex items-center gap-1">{c.userName}{c.isAdmin && <BadgeCheck size={12} className="text-white fill-blue-500" />}</h5>
                      <button onClick={() => setActiveCommentMenuId(activeCommentMenuId === c.id ? null : c.id)} className="text-denim-300 hover:text-denim-600 p-1 -mt-1 -mr-1 transition-colors"><MoreVertical size={14} /></button>
                    </div>
                    {c.replyTo && (
                      <div className="bg-cream-50 p-2 rounded-xl border-l-2 border-denim-400 mb-1.5">
                        <p className="text-[10px] font-bold text-denim-600">{c.replyTo.userName}</p>
                        <p className="text-[10px] text-denim-400 truncate italic">"{c.replyTo.text}"</p>
                      </div>
                    )}
                    <p className="text-sm text-denim-700 leading-snug">{c.text}</p>
                    {activeCommentMenuId === c.id && (
                      <div className="absolute right-0 top-7 bg-white shadow-xl border border-cream-200 rounded-xl z-30 py-1 w-28 animate-in zoom-in-95 origin-top-right overflow-hidden">
                        <button onClick={() => { setReplyingTo({id: c.id, name: c.userName, text: c.text, userId: c.userId}); setActiveCommentMenuId(null); }} className="w-full text-left px-3 py-2.5 text-xs hover:bg-cream-50 flex items-center gap-2 text-denim-700"><CornerDownRight size={14} /> Balas</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-cream-200 bg-white shrink-0 pb-safe">
              {replyingTo && (
                <div className="flex justify-between items-center bg-cream-100 p-2.5 rounded-xl mb-3 text-xs border border-denim-200 animate-in slide-in-from-bottom-2">
                  <span className="text-denim-600 truncate">Balas ke <b>{replyingTo.name}</b></span>
                  <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white rounded-full"><X size={14} className="text-denim-400" /></button>
                </div>
              )}
              <form onSubmit={handleSendComment} className="flex gap-2 items-center">
                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={replyingTo ? `Tulis balasan...` : t.status.writeComment} className="flex-1 bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 shadow-inner" autoFocus={!!replyingTo}/>
                <button disabled={!commentText.trim() || sendingComment} className="p-3 bg-denim-600 text-white rounded-2xl hover:bg-denim-700 disabled:opacity-50 transition-all shadow-md active:scale-90"><Send size={20} /></button>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.isOpen && (<div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"><div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={28} /></div><h3 className="text-lg font-bold text-denim-900 mb-2">Hapus Status?</h3><p className="text-sm text-denim-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm({isOpen: false, id: null})} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl font-bold text-sm">Batal</button><button onClick={() => { if(deleteConfirm.id) { remove(ref(rtdb, `statuses/${deleteConfirm.id}`)); remove(ref(rtdb, `comments/${deleteConfirm.id}`)); setDeleteConfirm({isOpen: false, id: null}); } }} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg">Hapus</button></div></div></div>)}
      {zoomImage && (<div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-0 animate-in fade-in duration-300" onClick={() => setZoomImage(null)}><button className="absolute top-4 right-4 text-white p-2 bg-black/40 rounded-full"><X size={28} /></button><img src={zoomImage} className="max-w-full max-h-full object-contain" /></div>)}
    </div>
  );
};
