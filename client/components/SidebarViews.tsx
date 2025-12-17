
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Search, UserPlus, Bell, Lock, Smartphone, 
  Monitor, ChevronRight, HelpCircle, FileText, MessageCircle, 
  Camera, Save, LogOut, CheckSquare, Trash2, X, Plus, Loader2, Settings, UserMinus, AlertTriangle, Key, Mail, Palette, Type, Globe, Database, Wifi, Signal, Send, Radio,
  Heart, Image as ImageIcon, MessageCircle as MessageIcon, MoreHorizontal, CheckCircle2, User as UserIcon,
  Activity, MapPin, Edit, CornerDownRight, MoreVertical, BadgeCheck, MessageSquare
} from 'lucide-react';
import { ViewState, Contact, ChatPreview, User, Message, Status, Comment, Notification } from '../types';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, onSnapshot, deleteDoc, doc, writeBatch, serverTimestamp, updateDoc, arrayUnion, arrayRemove, getDoc, orderBy, Timestamp, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
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

// --- Common Header Component ---
const ViewHeader: React.FC<{ 
  title: string; 
  onBack: () => void; 
  rightAction?: React.ReactNode 
}> = ({ title, onBack, rightAction }) => (
  <div className="h-[60px] px-4 flex items-center justify-between bg-cream-50 border-b border-cream-200 sticky top-0 z-10 text-denim-800 shrink-0">
    <div className="flex items-center gap-4">
      <button 
        onClick={onBack}
        className="p-2 -ms-2 text-denim-500 hover:bg-cream-200 rounded-full transition-colors"
      >
        <ArrowLeft size={20} className="rtl:rotate-180" />
      </button>
      <h2 className="text-lg font-semibold text-denim-900">{title}</h2>
    </div>
    {rightAction}
  </div>
);

// --- Notifications View ---
export const NotificationsView: React.FC<SidebarViewProps> = ({ onBack, appSettings, onNavigate, setTargetStatusId }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[appSettings?.language || 'id'];

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    
    const safetyTimeout = setTimeout(() => {
        if (loading) setLoading(false);
    }, 5000);

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(safetyTimeout);
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setLoading(false);
      
      const unread = snapshot.docs.filter(d => !d.data().read);
      if (unread.length > 0) {
        setTimeout(() => {
            const batch = writeBatch(db);
            unread.forEach(d => {
              batch.update(d.ref, { read: true });
            });
            batch.commit().catch(e => console.error("Batch update read failed", e));
        }, 1500);
      }
    }, (error) => {
        console.error("Error fetching notifications:", error);
        setLoading(false);
    });

    return () => { 
        unsubscribe(); 
        clearTimeout(safetyTimeout); 
    };
  }, [currentUser]);

  const handleNotificationClick = (notif: Notification) => {
    if (setTargetStatusId && onNavigate) {
      setTargetStatusId(notif.statusId);
      onNavigate('my_status');
    }
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return format(date, 'HH:mm • dd MMM');
  };

  const getNotificationText = (notif: Notification) => {
      if (notif.type === 'like') return t.notifications.liked;
      if (notif.type === 'reply') return "membalas komentar Anda";
      return t.notifications.commented;
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title={t.notifications.title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-denim-400 h-64 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-cream-200 rounded-full flex items-center justify-center mb-3">
              <Bell size={32} className="text-denim-300" />
            </div>
            <p className="font-medium text-sm text-denim-500">{t.notifications.empty}</p>
          </div>
        ) : (
          <div className="divide-y divide-cream-200">
            {notifications.map(notif => (
              <div 
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 flex gap-3 cursor-pointer hover:bg-cream-50 transition-colors ${!notif.read ? 'bg-blue-50/60' : 'bg-white'}`}
              >
                <div className="relative shrink-0">
                  <img 
                    src={notif.senderAvatar} 
                    className="w-12 h-12 rounded-full object-cover border border-cream-200" 
                    onError={(e) => {
                       (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.senderName)}&background=random&color=fff`;
                    }}
                  />
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white flex items-center justify-center ${notif.type === 'like' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {notif.type === 'like' ? <Heart size={10} className="text-white fill-white"/> : <MessageCircle size={10} className="text-white fill-white"/>}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-denim-900 leading-snug">
                    <span className="font-bold">{notif.senderName}</span>{' '}
                    {getNotificationText(notif)}
                    {(notif.type === 'comment' || notif.type === 'reply') && notif.previewText && (
                      <span className="block text-denim-600 italic truncate mt-1 bg-cream-50 p-1 rounded border border-cream-100 text-xs">"{notif.previewText}"</span>
                    )}
                  </p>
                  <p className={`text-xs mt-1.5 ${!notif.read ? 'text-denim-700 font-bold' : 'text-denim-400'}`}>
                    {getTimeAgo(notif.createdAt)}
                  </p>
                </div>
                {!notif.read && (
                  <div className="shrink-0 self-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Status View ---
export const StatusView: React.FC<SidebarViewProps> = ({ onBack, appSettings, contactsMap, adminProfile, onNavigate }) => {
  const { currentUser } = useAuth();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');
  const [statusImage, setStatusImage] = useState<File | null>(null);
  const [statusImagePreview, setStatusImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Menu & Actions State
  const [activeMenuStatusId, setActiveMenuStatusId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Comment State
  const [activeCommentStatusId, setActiveCommentStatusId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{id: string, name: string, text: string, userId: string} | null>(null);

  // Info Modal State
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoUser, setInfoUser] = useState<User | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');

  const t = translations[appSettings?.language || 'id'];

  const showToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    setLoading(true);
    const safetyTimeout = setTimeout(() => setLoading(false), 8000);

    const q = query(collection(db, 'statuses'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        clearTimeout(safetyTimeout);
        const now = Date.now();
        const fetched = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Status))
          .filter(s => {
             // Filter 2x24 Jam (48 jam)
             if (s.expiresAt?.toMillis) return s.expiresAt.toMillis() > now;
             return true; 
          });
        
        setStatuses(fetched);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching statuses:", error);
        setLoading(false);
    });

    return () => { unsubscribe(); clearTimeout(safetyTimeout); };
  }, []);

  useEffect(() => {
    if (activeCommentStatusId) {
        const q = query(collection(db, 'statuses', activeCommentStatusId, 'comments'), orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const cmts = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Comment));
            setComments(cmts);
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
            imageUrl = await uploadImageToCloudinary(statusImage);
        }

        const statusData = {
            content: statusText,
            imageUrl: imageUrl,
            updatedAt: serverTimestamp()
        };

        if (isEditingStatus) {
            await updateDoc(doc(db, 'statuses', isEditingStatus), statusData);
            showToast("Status berhasil diupdate");
        } else {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 48); // 48 JAM EXPIRY

            await addDoc(collection(db, 'statuses'), {
                ...statusData,
                userId: currentUser!.id,
                author: {
                    name: currentUser!.name,
                    avatar: currentUser!.avatar,
                    isAdmin: currentUser!.isAdmin || false
                },
                likes: [],
                commentsCount: 0,
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt)
            });
            showToast("Status berhasil dibuat");
        }

        setShowCreateModal(false);
        setIsEditingStatus(null);
        setStatusText('');
        setStatusImage(null);
        setStatusImagePreview(null);

    } catch (error) {
        console.error("Gagal submit status:", error);
        alert("Gagal memproses status. Coba lagi.");
    } finally {
        setIsPosting(false);
    }
  };

  const handleEditClick = (status: Status) => {
      setStatusText(status.content || '');
      setStatusImagePreview(status.imageUrl || null);
      setStatusImage(null);
      setIsEditingStatus(status.id);
      setActiveMenuStatusId(null);
      setShowCreateModal(true);
  };

  const handleDeleteClick = (statusId: string) => {
      setActiveMenuStatusId(null);
      setDeleteConfirm({ isOpen: true, id: statusId });
  };

  const confirmDelete = async () => {
      if (!deleteConfirm.id) return;
      try {
          await deleteDoc(doc(db, 'statuses', deleteConfirm.id));
          showToast("Status berhasil dihapus");
      } catch (e) {
          alert("Gagal menghapus status");
      } finally {
          setDeleteConfirm({ isOpen: false, id: null });
      }
  };

  const handleLike = async (statusId: string, currentLikes: string[], statusOwnerId: string) => {
      if (!currentUser) return;
      const ref = doc(db, 'statuses', statusId);
      if (currentLikes.includes(currentUser.id)) {
          await updateDoc(ref, { likes: arrayRemove(currentUser.id) });
      } else {
          await updateDoc(ref, { likes: arrayUnion(currentUser.id) });
          // TRIGGER NOTIFICATION: Only if liker is not the owner
          if (currentUser.id !== statusOwnerId) {
             const expiresAt = new Date();
             expiresAt.setHours(expiresAt.getHours() + 48);
             
             try {
               await addDoc(collection(db, 'notifications'), {
                  recipientId: statusOwnerId,
                  senderId: currentUser.id,
                  senderName: currentUser.name,
                  senderAvatar: currentUser.avatar,
                  type: 'like',
                  statusId: statusId,
                  previewText: '',
                  read: false,
                  createdAt: serverTimestamp(),
                  expiresAt: Timestamp.fromDate(expiresAt)
               });
             } catch (e) {
               console.error("Failed to send like notification", e);
             }
          }
      }
  };

  const handleSendComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentText.trim() || !activeCommentStatusId || !currentUser) return;
      setSendingComment(true);
      try {
          const statusRef = doc(db, 'statuses', activeCommentStatusId);
          await addDoc(collection(statusRef, 'comments'), {
              userId: currentUser.id,
              userName: currentUser.name,
              userAvatar: currentUser.avatar,
              isAdmin: currentUser.isAdmin || false,
              text: commentText,
              createdAt: serverTimestamp(),
              replyTo: replyingTo ? { userName: replyingTo.name, text: replyingTo.text } : null
          });
          await updateDoc(statusRef, { commentsCount: increment(1) } as any);

          // NOTIFICATION LOGIC
          const targetStatus = statuses.find(s => s.id === activeCommentStatusId);
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 48);

          if (targetStatus) {
             // 1. Notify Status Owner (Jika bukan diri sendiri DAN ini bukan balasan yang ditujukan ke orang lain selain owner)
             if (targetStatus.userId !== currentUser.id) {
                 await addDoc(collection(db, 'notifications'), {
                    recipientId: targetStatus.userId,
                    senderId: currentUser.id,
                    senderName: currentUser.name,
                    senderAvatar: currentUser.avatar,
                    type: 'comment',
                    statusId: activeCommentStatusId,
                    previewText: commentText,
                    read: false,
                    createdAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiresAt)
                 }).catch(console.error);
             }

             // 2. Notify Reply Recipient
             // CASE A: User lain membalas komentar saya di status orang lain -> Saya dapat notif 'reply'
             // CASE B: Pemilik status membalas komentar saya di statusnya -> Saya dapat notif 'reply'
             if (replyingTo && replyingTo.userId !== currentUser.id) {
                 // Pastikan tidak mengirim notif double jika pemilik status adalah yang dibalas (sudah dicover logic atas untuk type='comment', tapi ini type='reply')
                 // Logic 'comment' di atas hanya untuk OWNER STATUS.
                 // Logic 'reply' ini untuk OWNER KOMENTAR YANG DIBALAS.
                 
                 // Jika yang dibalas adalah pemilik status, dan saya bukan pemilik status -> Pemilik sudah dapat notif 'comment', apakah perlu 'reply' juga?
                 // Biasanya platform memisahkan. Jika reply, lebih spesifik.
                 // Kita kirim 'reply' ke target user ID (replyingTo.userId)
                 
                 // Pengecekan: Jangan kirim notif ke diri sendiri (sudah ada di if).
                 // Jangan kirim notif ke owner status jika owner status adalah yang dibalas (karena sudah dapat notif comment)? 
                 // TIDAK, lebih baik user dapat notif spesifik "dibalas" daripada sekadar "dikomentari".
                 
                 await addDoc(collection(db, 'notifications'), {
                    recipientId: replyingTo.userId,
                    senderId: currentUser.id,
                    senderName: currentUser.name,
                    senderAvatar: currentUser.avatar,
                    type: 'reply', 
                    statusId: activeCommentStatusId,
                    previewText: `${commentText}`, 
                    read: false,
                    createdAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiresAt)
                 }).catch(console.error);
             }
          }

          setCommentText('');
          setReplyingTo(null);
      } catch (err) {
          console.error("Error sending comment", err);
          alert("Gagal mengirim komentar.");
      } finally {
          setSendingComment(false);
      }
  };

  const handleReplyClick = (comment: Comment) => {
      setReplyingTo({ 
          id: comment.id, 
          name: comment.userName, 
          text: comment.text,
          userId: comment.userId 
      });
      setActiveCommentMenuId(null);
  };

  const getTimeAgo = (timestamp: any) => {
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return format(date, 'HH:mm • dd MMM');
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setStatusImage(e.target.files[0]);
        setStatusImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleUserClick = async (targetUid: string) => {
      if (targetUid === currentUser?.id) {
          onNavigate && onNavigate('my_status');
          return;
      }
      if (adminProfile && targetUid === adminProfile.id) {
          setInfoUser(adminProfile);
          setShowInfoModal(true);
          return;
      }
      if (contactsMap && contactsMap[targetUid]) {
          const c = contactsMap[targetUid];
          setInfoUser({ id: targetUid, name: c.savedName, avatar: c.avatar, phoneNumber: c.phoneNumber } as User);
          setShowInfoModal(true);
      } else {
          const userSnap = await getDoc(doc(db, 'users', targetUid));
          if (userSnap.exists()) {
              const uData = userSnap.data();
              let uAvatar = uData.avatar;
              if (!uAvatar || uAvatar.includes('ui-avatars.com')) {
                  uAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(uData.name)}&background=random&color=fff`;
              }
              setInfoUser({ id: targetUid, ...uData, avatar: uAvatar } as User);
              setShowInfoModal(true);
          }
      }
  };

  const handleAddContact = async () => {
      if (!infoUser || !currentUser || !newContactName) return;
      try {
          await addDoc(collection(db, 'users', currentUser.id, 'contacts'), {
              uid: infoUser.id,
              savedName: newContactName,
              phoneNumber: infoUser.phoneNumber || '',
              avatar: infoUser.avatar || ''
          });
          alert("Kontak berhasil disimpan!");
          setIsAddingContact(false);
          setShowInfoModal(false); 
      } catch (error) {
          alert("Gagal menyimpan kontak.");
          console.error(error);
      }
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.status.title} onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 pb-20" onClick={() => setActiveMenuStatusId(null)}>
         <div className="bg-white p-4 mb-2 border-b border-cream-200 shadow-sm">
             <div className="flex gap-3 items-center">
                 <img 
                    src={currentUser?.avatar} 
                    className="w-10 h-10 rounded-full bg-denim-100 object-cover border border-cream-200 cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => onNavigate && onNavigate('my_status')} 
                 />
                 <div 
                    onClick={() => {
                        setIsEditingStatus(null);
                        setStatusText('');
                        setStatusImagePreview(null);
                        setShowCreateModal(true);
                    }}
                    className="flex-1 bg-cream-50 hover:bg-cream-100 rounded-full px-4 py-2.5 cursor-pointer border border-cream-200 transition-colors"
                 >
                     <span className="text-denim-400 text-sm select-none">{t.status.placeholder}</span>
                 </div>
                 <button 
                    onClick={() => {
                        setIsEditingStatus(null);
                        setStatusText('');
                        setStatusImagePreview(null);
                        setShowCreateModal(true);
                        setTimeout(() => fileInputRef.current?.click(), 100);
                    }} 
                    className="text-green-600 hover:bg-green-50 p-2 rounded-full transition-colors"
                 >
                     <ImageIcon size={24}/>
                 </button>
             </div>
         </div>

         {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div>
         ) : statuses.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-10 text-denim-400 h-64 animate-in fade-in duration-500">
                 <div className="w-16 h-16 bg-cream-200 rounded-full flex items-center justify-center mb-3">
                    <Activity size={32} className="text-denim-300" />
                 </div>
                 <p className="font-medium text-sm">Status belum tersedia</p>
             </div>
         ) : (
             <div className="space-y-3 pb-4">
                 {statuses.map(status => {
                     const isLiked = status.likes.includes(currentUser!.id);
                     const isOwner = status.userId === currentUser!.id;
                     const isAdminAuthor = status.author.isAdmin;

                     return (
                         <div key={status.id} className="bg-white border-y border-cream-200 md:border md:rounded-xl md:mx-2 shadow-sm animate-in fade-in duration-300 relative">
                             <div className="p-3 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <div className="relative cursor-pointer" onClick={() => handleUserClick(status.userId)}>
                                        <img src={status.author.avatar} className="w-10 h-10 rounded-full border border-cream-100 object-cover"/>
                                        <div className="absolute -bottom-1 -right-1 bg-denim-600 rounded-full p-0.5 border-2 border-white">
                                            <Globe size={10} className="text-white"/>
                                        </div>
                                     </div>
                                     <div>
                                         <h4 
                                            className="font-bold text-denim-900 text-sm leading-tight flex items-center gap-1 cursor-pointer hover:underline"
                                            onClick={() => handleUserClick(status.userId)}
                                         >
                                             {status.author.name}
                                             {isAdminAuthor && <BadgeCheck size={14} className="text-white fill-blue-500" />}
                                         </h4>
                                         <p className="text-[11px] text-denim-400 leading-tight mt-0.5">{getTimeAgo(status.createdAt)} • Public</p>
                                     </div>
                                 </div>
                                 {isOwner && (
                                     <div className="relative">
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); setActiveMenuStatusId(activeMenuStatusId === status.id ? null : status.id); }} 
                                            className="text-denim-300 hover:text-denim-600 p-2 rounded-full hover:bg-cream-50 transition-colors"
                                         >
                                             <MoreHorizontal size={20} />
                                         </button>
                                         {activeMenuStatusId === status.id && (
                                             <div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-xl border border-cream-200 z-20 animate-in zoom-in-95 origin-top-right overflow-hidden">
                                                 <button onClick={() => handleEditClick(status)} className="w-full px-4 py-3 text-left text-sm text-denim-700 hover:bg-cream-50 flex items-center gap-2">
                                                     <Edit size={16}/> Edit Status
                                                 </button>
                                                 <button onClick={() => handleDeleteClick(status.id)} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-cream-100">
                                                     <Trash2 size={16}/> Hapus Status
                                                 </button>
                                             </div>
                                         )}
                                     </div>
                                 )}
                             </div>

                             {status.content && <div className={`px-4 pb-2 ${status.imageUrl ? 'text-sm' : 'text-lg py-2'} text-denim-900 whitespace-pre-wrap leading-relaxed`}>{status.content}</div>}
                             {status.imageUrl && (
                                 <div className="w-full bg-cream-50 border-t border-cream-100">
                                     <img src={status.imageUrl} className="w-full h-auto max-h-[600px] object-contain" loading="lazy" />
                                 </div>
                             )}

                             <div className="px-4 py-2 flex justify-between text-xs text-denim-500 border-b border-cream-100">
                                 <div className="flex items-center gap-1">
                                     {status.likes.length > 0 && <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><Heart size={8} className="text-white fill-current"/></div>}
                                     <span>{status.likes.length > 0 ? status.likes.length : ''}</span>
                                 </div>
                                 <span>{status.commentsCount > 0 ? `${status.commentsCount} ${t.status.comment}` : ''}</span>
                             </div>

                             <div className="flex items-center px-2 py-1">
                                 <button onClick={() => handleLike(status.id, status.likes, status.userId)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-cream-50 transition-colors active:scale-95 ${isLiked ? 'text-red-500' : 'text-denim-600'}`}>
                                     <Heart size={20} className={isLiked ? 'fill-current' : ''} />
                                     <span className="text-sm font-medium">{t.status.like}</span>
                                 </button>
                                 <button onClick={() => setActiveCommentStatusId(status.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-cream-50 transition-colors text-denim-600 active:scale-95">
                                     <MessageIcon size={20} />
                                     <span className="text-sm font-medium">{t.status.comment}</span>
                                 </button>
                             </div>
                         </div>
                     );
                 })}
             </div>
         )}
      </div>

      <button 
          onClick={() => { setIsEditingStatus(null); setStatusText(''); setStatusImagePreview(null); setShowCreateModal(true); }}
          className="absolute bottom-6 right-6 rtl:left-6 rtl:right-auto w-14 h-14 bg-denim-600 hover:bg-denim-700 text-white rounded-full shadow-xl shadow-denim-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20"
      >
          <Plus size={28} />
      </button>

      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full sm:max-w-md h-[95%] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
                  <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-white relative shrink-0">
                      <h3 className="font-bold text-denim-900 text-lg w-full text-center">{isEditingStatus ? 'Edit Status' : t.status.create}</h3>
                      <button onClick={() => setShowCreateModal(false)} className="absolute right-4 p-2 bg-cream-100 rounded-full hover:bg-cream-200 text-denim-600 transition-colors"><X size={20} /></button>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-white">
                      <div className="flex items-center gap-3 mb-4">
                          <img src={currentUser?.avatar} className="w-12 h-12 rounded-full object-cover border border-cream-200"/>
                          <div>
                              <p className="font-bold text-denim-900 text-[15px] flex items-center gap-1">
                                  {currentUser?.name}
                                  {currentUser?.isAdmin && <BadgeCheck size={14} className="text-white fill-blue-500" />}
                              </p>
                              <div className="flex items-center gap-1 text-xs bg-cream-100 text-denim-600 px-2 py-1 rounded-md mt-0.5 border border-cream-200 w-fit"><Globe size={10} /><span>Public</span></div>
                          </div>
                      </div>
                      <textarea value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder={t.status.placeholder} className="w-full min-h-[150px] text-lg sm:text-xl placeholder-denim-300 border-none focus:ring-0 resize-none p-4 rounded-xl bg-cream-50 text-denim-900" autoFocus />
                      {statusImagePreview && (
                          <div className="relative mt-4 rounded-xl overflow-hidden border border-cream-200 shadow-sm group">
                              <img src={statusImagePreview} className="w-full h-auto max-h-[400px] object-cover" />
                              <button onClick={() => { setStatusImage(null); setStatusImagePreview(null); }} className="absolute top-3 right-3 bg-white/90 text-denim-900 p-2 rounded-full hover:bg-white shadow-lg transition-transform hover:scale-110"><X size={18}/></button>
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t border-cream-200 bg-white shrink-0">
                       <div className="border border-cream-200 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm bg-white">
                           <span className="text-sm font-semibold text-denim-900 ps-2">Tambahkan ke postingan</span>
                           <div className="flex gap-2">
                               <label className="p-2 hover:bg-cream-100 rounded-full cursor-pointer transition-colors text-green-600">
                                   <ImageIcon size={24} />
                                   <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageInput} />
                               </label>
                               <button className="p-2 hover:bg-cream-100 rounded-full transition-colors text-blue-500"><UserIcon size={24} /></button>
                               <button className="p-2 hover:bg-cream-100 rounded-full transition-colors text-red-500"><MapPin size={24} /></button>
                           </div>
                       </div>
                       <button onClick={handleSubmitStatus} disabled={isPosting || (!statusText && !statusImage && !statusImagePreview)} className="w-full bg-denim-600 text-white py-3.5 rounded-xl font-bold text-[15px] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-denim-600/20 hover:bg-denim-700 transition-all active:scale-[0.98]">
                           {isPosting ? <Loader2 size={20} className="animate-spin" /> : (isEditingStatus ? 'Update Status' : t.status.post)}
                       </button>
                  </div>
              </div>
          </div>
      )}

      {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
                  <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={28} /></div>
                  <h3 className="text-lg font-bold text-denim-900 mb-2">Hapus Status?</h3>
                  <p className="text-sm text-denim-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setDeleteConfirm({isOpen: false, id: null})} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl font-bold text-sm">Batal</button>
                      <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/30">Ya, Hapus</button>
                  </div>
              </div>
          </div>
      )}

      {toastMsg && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-denim-800 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 w-max max-w-[90%]">
           <div className="bg-green-500 rounded-full p-0.5 shrink-0"><CheckCircle2 size={18} className="text-white" /></div>
           <span className="text-sm font-bold tracking-wide">{toastMsg}</span>
        </div>
      )}

      {activeCommentStatusId && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveCommentMenuId(null)}>
              <div className="bg-white w-full sm:max-w-md h-[80%] sm:h-[600px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                  <div className="p-3 border-b border-cream-200 flex justify-between items-center bg-cream-50">
                      <h3 className="font-bold text-denim-900">{t.status.comment}</h3>
                      <button onClick={() => setActiveCommentStatusId(null)}><X size={20} className="text-denim-400"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-cream-50 space-y-4">
                      {comments.length === 0 && <p className="text-center text-denim-300 text-sm mt-10">Jadilah yang pertama berkomentar.</p>}
                      {comments.map(c => (
                          <div key={c.id} className="flex gap-3 relative">
                              <img src={c.userAvatar} className="w-8 h-8 rounded-full object-cover bg-denim-100 shrink-0 border border-cream-200"/>
                              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-cream-200 shadow-sm max-w-[85%] relative group">
                                  <div className="flex justify-between items-start">
                                      <h5 className="font-bold text-xs text-denim-900 flex items-center gap-1">
                                          {c.userName}
                                          {c.isAdmin && <BadgeCheck size={12} className="text-white fill-blue-500" />}
                                      </h5>
                                      <button onClick={() => setActiveCommentMenuId(activeCommentMenuId === c.id ? null : c.id)} className="text-denim-300 hover:text-denim-600 p-1 -mt-1 -mr-1"><MoreVertical size={14} /></button>
                                  </div>
                                  {c.replyTo && (
                                      <div className="bg-cream-50 p-1.5 rounded-md border-l-2 border-denim-300 mb-1">
                                          <p className="text-[10px] font-bold text-denim-500">{c.replyTo.userName}</p>
                                          <p className="text-[10px] text-denim-400 truncate">{c.replyTo.text}</p>
                                      </div>
                                  )}
                                  <p className="text-sm text-denim-700 leading-snug">{c.text}</p>
                                  
                                  {activeCommentMenuId === c.id && (
                                      <div className="absolute right-0 top-6 bg-white shadow-lg border border-cream-200 rounded-lg z-10 py-1 w-24 animate-in zoom-in-95">
                                          <button onClick={() => handleReplyClick(c)} className="w-full text-left px-3 py-2 text-xs hover:bg-cream-50 flex items-center gap-2 text-denim-700">
                                              <CornerDownRight size={12} /> Balas
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-3 border-t border-cream-200 bg-white">
                      {replyingTo && (
                          <div className="flex justify-between items-center bg-cream-50 p-2 rounded-lg mb-2 text-xs border border-cream-200">
                              <span className="text-denim-600 truncate">Membalas <b>{replyingTo.name}</b>: "{replyingTo.text.substring(0, 20)}..."</span>
                              <button onClick={() => setReplyingTo(null)}><X size={14} className="text-denim-400 hover:text-red-500" /></button>
                          </div>
                      )}
                      <form onSubmit={handleSendComment} className="flex gap-2 items-center">
                          <input 
                              type="text" 
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder={replyingTo ? `Balas ke ${replyingTo.name}...` : t.status.writeComment}
                              className="flex-1 bg-cream-50 border border-cream-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-denim-500"
                              autoFocus={!!replyingTo}
                          />
                          <button disabled={!commentText.trim() || sendingComment} className="p-2 bg-denim-100 text-denim-600 rounded-full hover:bg-denim-200 disabled:opacity-50">
                              <Send size={18} className="rtl:rotate-180"/>
                          </button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {showInfoModal && infoUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative animate-in zoom-in-95 flex flex-col max-h-[80vh]">
             <button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 bg-black/20 text-white p-1 rounded-full hover:bg-black/40 z-10 rtl:left-4 rtl:right-auto"><X size={20} /></button>
             <div className="h-32 bg-denim-700 relative rounded-t-2xl shrink-0"><div className="absolute inset-0 opacity-10 pattern-bg rounded-t-2xl"></div></div>
             <div className="px-6 pb-6 -mt-12 flex flex-col items-center relative z-0 flex-1 overflow-y-auto custom-scrollbar">
                <div className="relative">
                  <img src={infoUser.avatar} className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-denim-200 object-cover z-10 relative" />
                </div>
                <h2 className="mt-3 text-xl font-bold text-denim-900 text-center flex items-center justify-center gap-1">
                  {infoUser.name}
                  {(infoUser.isAdmin) && <BadgeCheck size={18} className="text-white fill-blue-500" />}
                </h2>
                <p className="text-denim-500 text-sm font-medium mb-4 text-center">{infoUser.phoneNumber || '-'}</p>
                
                {contactsMap && !contactsMap[infoUser.id] && (!adminProfile || infoUser.id !== adminProfile.id) && (
                   <div className="mb-4 w-full">
                       {!isAddingContact ? (
                           <button onClick={() => { setNewContactName(infoUser.name); setIsAddingContact(true); }} className="w-full py-2 bg-denim-600 hover:bg-denim-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                               <UserPlus size={16} /> Tambahkan Kontak
                           </button>
                       ) : (
                           <div className="bg-cream-100 p-3 rounded-xl border border-denim-200">
                               <p className="text-xs text-denim-500 mb-2 font-bold uppercase">Simpan Sebagai:</p>
                               <input type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} className="w-full p-2 border border-cream-300 rounded-lg text-sm mb-2 focus:ring-1 focus:ring-denim-500 outline-none" placeholder="Nama Kontak" autoFocus />
                               <div className="flex gap-2">
                                   <button onClick={() => setIsAddingContact(false)} className="flex-1 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">Batal</button>
                                   <button onClick={handleAddContact} className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold">Simpan</button>
                               </div>
                           </div>
                       )}
                   </div>
                )}
                
                <div className="w-full bg-cream-50 p-4 rounded-xl border border-cream-200 text-center shrink-0"><p className="text-sm text-denim-700 italic">"{infoUser.bio || '-'}"</p></div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MY STATUS VIEW (Full Features Restored) ---
export const MyStatusView: React.FC<SidebarViewProps> = ({ onBack, appSettings, targetStatusId }) => {
    const { currentUser } = useAuth();
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);
    const t = translations[appSettings?.language || 'id'];

    // State untuk Modals (Duplicated agar mandiri)
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isEditingStatus, setIsEditingStatus] = useState<string | null>(null);
    const [statusText, setStatusText] = useState('');
    const [statusImage, setStatusImage] = useState<File | null>(null);
    const [statusImagePreview, setStatusImagePreview] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Actions & Notifications
    const [activeMenuStatusId, setActiveMenuStatusId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    
    // Comments
    const [activeCommentStatusId, setActiveCommentStatusId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{id: string, name: string, text: string, userId: string} | null>(null);

    const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); };

    useEffect(() => {
        if(!currentUser) return;
        setLoading(true);
        
        const safetyTimeout = setTimeout(() => {
            if (loading) setLoading(false);
        }, 5000);

        const q = query(
            collection(db, 'statuses'),
            where('userId', '==', currentUser.id), 
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            clearTimeout(safetyTimeout);
            const now = Date.now();
            const fetched = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Status))
                .filter(s => { if (s.expiresAt?.toMillis) return s.expiresAt.toMillis() > now; return true; });
            setStatuses(fetched);
            setLoading(false);
        }, (err) => {
            console.error("Gagal load Status Saya:", err);
            setLoading(false);
        });

        return () => { unsubscribe(); clearTimeout(safetyTimeout); };
    }, [currentUser]);

    // Handle Scroll to Target Status (Deep Link Logic)
    useEffect(() => {
        if (targetStatusId && !loading && statuses.length > 0) {
            const element = document.getElementById(`status-${targetStatusId}`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('bg-blue-50', 'ring-2', 'ring-blue-200');
                    setTimeout(() => {
                        element.classList.remove('bg-blue-50', 'ring-2', 'ring-blue-200');
                    }, 2000);
                }, 300);
            }
        }
    }, [targetStatusId, loading, statuses]);

    // Fetch Comments
    useEffect(() => {
        if (activeCommentStatusId) {
            const q = query(collection(db, 'statuses', activeCommentStatusId, 'comments'), orderBy('createdAt', 'asc'));
            const unsub = onSnapshot(q, (snapshot) => {
                setComments(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Comment)));
            });
            return () => unsub();
        }
    }, [activeCommentStatusId]);

    // --- HANDLERS ---
    const handleSubmitStatus = async () => {
        if (!statusText && !statusImage && !statusImagePreview) return;
        setIsPosting(true);
        try {
            let imageUrl = statusImagePreview || '';
            if (statusImage) imageUrl = await uploadImageToCloudinary(statusImage);
            const statusData = { content: statusText, imageUrl: imageUrl, updatedAt: serverTimestamp() };
            if (isEditingStatus) {
                await updateDoc(doc(db, 'statuses', isEditingStatus), statusData);
                showToast("Status berhasil diupdate");
            } else {
                const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 48);
                await addDoc(collection(db, 'statuses'), { ...statusData, userId: currentUser!.id, author: { name: currentUser!.name, avatar: currentUser!.avatar, isAdmin: currentUser!.isAdmin || false }, likes: [], commentsCount: 0, createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt) });
                showToast("Status berhasil dibuat");
            }
            setShowCreateModal(false); setIsEditingStatus(null); setStatusText(''); setStatusImage(null); setStatusImagePreview(null);
        } catch (error) { alert("Gagal memproses status."); } finally { setIsPosting(false); }
    };

    const handleLike = async (statusId: string, currentLikes: string[]) => {
        if (!currentUser) return;
        const ref = doc(db, 'statuses', statusId);
        if (currentLikes.includes(currentUser.id)) await updateDoc(ref, { likes: arrayRemove(currentUser.id) });
        else await updateDoc(ref, { likes: arrayUnion(currentUser.id) });
    };

    const handleDeleteClick = (statusId: string) => { setActiveMenuStatusId(null); setDeleteConfirm({ isOpen: true, id: statusId }); };
    const confirmDelete = async () => {
        if (!deleteConfirm.id) return;
        try { await deleteDoc(doc(db, 'statuses', deleteConfirm.id)); showToast("Status berhasil dihapus"); } catch (e) { alert("Gagal"); } finally { setDeleteConfirm({ isOpen: false, id: null }); }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !activeCommentStatusId || !currentUser) return;
        setSendingComment(true);
        try {
            const statusRef = doc(db, 'statuses', activeCommentStatusId);
            await addDoc(collection(statusRef, 'comments'), { userId: currentUser.id, userName: currentUser.name, userAvatar: currentUser.avatar, isAdmin: currentUser.isAdmin || false, text: commentText, createdAt: serverTimestamp(), replyTo: replyingTo ? { userName: replyingTo.name, text: replyingTo.text } : null });
            await updateDoc(statusRef, { commentsCount: increment(1) } as any);
            
            // Note: In MyStatusView, I am the owner.
            if (replyingTo && replyingTo.userId !== currentUser.id) {
                 const expiresAt = new Date();
                 expiresAt.setHours(expiresAt.getHours() + 48);
                 // PERBAIKAN: Gunakan tipe 'reply' saat owner membalas
                 await addDoc(collection(db, 'notifications'), {
                    recipientId: replyingTo.userId,
                    senderId: currentUser.id,
                    senderName: currentUser.name,
                    senderAvatar: currentUser.avatar,
                    type: 'reply', // Tipe: REPLY
                    statusId: activeCommentStatusId,
                    previewText: `${commentText}`,
                    read: false,
                    createdAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiresAt)
                 }).catch(console.error);
            }

            setCommentText(''); setReplyingTo(null);
        } catch (err) { console.error(err); } finally { setSendingComment(false); }
    };

    const getTimeAgo = (timestamp: any) => { if (!timestamp) return ''; const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp); if (isNaN(date.getTime())) return ''; return format(date, 'HH:mm • dd MMM'); };
    const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { setStatusImage(e.target.files[0]); setStatusImagePreview(URL.createObjectURL(e.target.files[0])); } };
    const handleEditClick = (status: Status) => { setStatusText(status.content || ''); setStatusImagePreview(status.imageUrl || null); setStatusImage(null); setIsEditingStatus(status.id); setActiveMenuStatusId(null); setShowCreateModal(true); };
    const handleReplyClick = (comment: Comment) => { 
        setReplyingTo({ 
            id: comment.id, 
            name: comment.userName, 
            text: comment.text,
            userId: comment.userId // Capture userID
        }); 
        setActiveCommentMenuId(null); 
    };

    return (
        <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
            <ViewHeader title={t.status.myStatus} onBack={onBack} />
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0 pb-20" onClick={() => setActiveMenuStatusId(null)}>
                <div className="bg-white p-4 mb-2 border-b border-cream-200 shadow-sm">
                    <div className="flex gap-3 items-center">
                        <img src={currentUser?.avatar} className="w-10 h-10 rounded-full bg-denim-100 object-cover border border-cream-200" />
                        <div onClick={() => { setIsEditingStatus(null); setStatusText(''); setStatusImagePreview(null); setShowCreateModal(true); }} className="flex-1 bg-cream-50 hover:bg-cream-100 rounded-full px-4 py-2.5 cursor-pointer border border-cream-200 transition-colors"><span className="text-denim-400 text-sm select-none">{t.status.placeholder}</span></div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div>
                ) : statuses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 text-denim-400 h-64 animate-in fade-in duration-500">
                        <div className="w-16 h-16 bg-cream-200 rounded-full flex items-center justify-center mb-3 border-2 border-cream-300">
                            <Activity size={32} className="text-denim-300" />
                        </div>
                        <p className="font-medium text-sm text-denim-600">Anda belum memposting status apapun.</p>
                        <button onClick={() => setShowCreateModal(true)} className="mt-4 text-xs font-bold text-denim-600 hover:underline">Mulai Posting</button>
                    </div> 
                ) : (
                    <div className="space-y-3 pb-4">
                        {statuses.map(status => {
                            const isLiked = status.likes.includes(currentUser!.id);
                            return (
                                <div key={status.id} id={`status-${status.id}`} className="bg-white border-y border-cream-200 md:border md:rounded-xl md:mx-2 shadow-sm animate-in fade-in duration-300 relative">
                                    <div className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative"><img src={status.author.avatar} className="w-10 h-10 rounded-full border border-cream-100 object-cover"/><div className="absolute -bottom-1 -right-1 bg-denim-600 rounded-full p-0.5 border-2 border-white"><Globe size={10} className="text-white"/></div></div>
                                            <div><h4 className="font-bold text-denim-900 text-sm leading-tight flex items-center gap-1">{t.common.you}{status.author.isAdmin && <BadgeCheck size={14} className="text-white fill-blue-500" />}</h4><p className="text-[11px] text-denim-400 leading-tight mt-0.5">{getTimeAgo(status.createdAt)} • Public</p></div>
                                        </div>
                                        <div className="relative"><button onClick={(e) => { e.stopPropagation(); setActiveMenuStatusId(activeMenuStatusId === status.id ? null : status.id); }} className="text-denim-300 hover:text-denim-600 p-2 rounded-full hover:bg-cream-50 transition-colors"><MoreHorizontal size={20} /></button>
                                            {activeMenuStatusId === status.id && (<div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-xl border border-cream-200 z-20 animate-in zoom-in-95 origin-top-right overflow-hidden"><button onClick={() => handleEditClick(status)} className="w-full px-4 py-3 text-left text-sm text-denim-700 hover:bg-cream-50 flex items-center gap-2"><Edit size={16}/> Edit Status</button><button onClick={() => handleDeleteClick(status.id)} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-cream-100"><Trash2 size={16}/> Hapus Status</button></div>)}
                                        </div>
                                    </div>
                                    
                                    {status.content && <div className={`px-4 pb-2 ${status.imageUrl ? 'text-sm' : 'text-lg py-2'} text-denim-900 whitespace-pre-wrap leading-relaxed`}>{status.content}</div>}
                                    {status.imageUrl && (<div className="w-full bg-cream-50 border-t border-cream-100"><img src={status.imageUrl} className="w-full h-auto max-h-[600px] object-contain" loading="lazy" /></div>)}
                                    
                                    <div className="px-4 py-2 flex justify-between text-xs text-denim-500 border-b border-cream-100"><div className="flex items-center gap-1">{status.likes.length > 0 && <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><Heart size={8} className="text-white fill-current"/></div>}<span>{status.likes.length > 0 ? status.likes.length : ''}</span></div><span>{status.commentsCount > 0 ? `${status.commentsCount} ${t.status.comment}` : ''}</span></div>
                                    
                                    <div className="flex items-center px-2 py-1"><button onClick={() => handleLike(status.id, status.likes)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-cream-50 transition-colors active:scale-95 ${isLiked ? 'text-red-500' : 'text-denim-600'}`}><Heart size={20} className={isLiked ? 'fill-current' : ''} /><span className="text-sm font-medium">{t.status.like}</span></button><button onClick={() => setActiveCommentStatusId(status.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-cream-50 transition-colors text-denim-600 active:scale-95"><MessageIcon size={20} /><span className="text-sm font-medium">{t.status.comment}</span></button></div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {showCreateModal && (<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white w-full sm:max-w-md h-[95%] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
                  <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-white relative shrink-0"><h3 className="font-bold text-denim-900 text-lg w-full text-center">{isEditingStatus ? 'Edit Status' : t.status.create}</h3><button onClick={() => setShowCreateModal(false)} className="absolute right-4 p-2 bg-cream-100 rounded-full hover:bg-cream-200 text-denim-600 transition-colors"><X size={20} /></button></div>
                  <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-white"><div className="flex items-center gap-3 mb-4"><img src={currentUser?.avatar} className="w-12 h-12 rounded-full object-cover border border-cream-200"/><div><p className="font-bold text-denim-900 text-[15px] flex items-center gap-1">{currentUser?.name}{currentUser?.isAdmin && <BadgeCheck size={14} className="text-white fill-blue-500" />}</p><div className="flex items-center gap-1 text-xs bg-cream-100 text-denim-600 px-2 py-1 rounded-md mt-0.5 border border-cream-200 w-fit"><Globe size={10} /><span>Public</span></div></div></div><textarea value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder={t.status.placeholder} className="w-full min-h-[150px] text-lg sm:text-xl placeholder-denim-300 border-none focus:ring-0 resize-none p-4 rounded-xl bg-cream-50 text-denim-900" autoFocus />{statusImagePreview && (<div className="relative mt-4 rounded-xl overflow-hidden border border-cream-200 shadow-sm group"><img src={statusImagePreview} className="w-full h-auto max-h-[400px] object-cover" /><button onClick={() => { setStatusImage(null); setStatusImagePreview(null); }} className="absolute top-3 right-3 bg-white/90 text-denim-900 p-2 rounded-full hover:bg-white shadow-lg transition-transform hover:scale-110"><X size={18}/></button></div>)}</div>
                  <div className="p-4 border-t border-cream-200 bg-white shrink-0"><div className="border border-cream-200 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm bg-white"><span className="text-sm font-semibold text-denim-900 ps-2">Tambahkan ke postingan</span><div className="flex gap-2"><label className="p-2 hover:bg-cream-100 rounded-full cursor-pointer transition-colors text-green-600"><ImageIcon size={24} /><input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageInput} /></label><button className="p-2 hover:bg-cream-100 rounded-full transition-colors text-blue-500"><UserIcon size={24} /></button><button className="p-2 hover:bg-cream-100 rounded-full transition-colors text-red-500"><MapPin size={24} /></button></div></div><button onClick={handleSubmitStatus} disabled={isPosting || (!statusText && !statusImage && !statusImagePreview)} className="w-full bg-denim-600 text-white py-3.5 rounded-xl font-bold text-[15px] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-denim-600/20 hover:bg-denim-700 transition-all active:scale-[0.98]">{isPosting ? <Loader2 size={20} className="animate-spin" /> : (isEditingStatus ? 'Update Status' : t.status.post)}</button></div>
              </div></div>)}
            
            {deleteConfirm.isOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"><div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={28} /></div><h3 className="text-lg font-bold text-denim-900 mb-2">Hapus Status?</h3><p className="text-sm text-denim-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm({isOpen: false, id: null})} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl font-bold text-sm">Batal</button><button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/30">Ya, Hapus</button></div></div></div>)}
            
            {toastMsg && (<div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-denim-800 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 w-max max-w-[90%]"><div className="bg-green-500 rounded-full p-0.5 shrink-0"><CheckCircle2 size={18} className="text-white" /></div><span className="text-sm font-bold tracking-wide">{toastMsg}</span></div>)}
            
            {activeCommentStatusId && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveCommentMenuId(null)}>
                    <div className="bg-white w-full sm:max-w-md h-[80%] sm:h-[600px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b border-cream-200 flex justify-between items-center bg-cream-50">
                            <h3 className="font-bold text-denim-900">{t.status.comment}</h3>
                            <button onClick={() => setActiveCommentStatusId(null)}><X size={20} className="text-denim-400"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-cream-50 space-y-4">
                            {comments.length === 0 && <p className="text-center text-denim-300 text-sm mt-10">Jadilah yang pertama berkomentar.</p>}
                            {comments.map(c => (
                                <div key={c.id} className="flex gap-3 relative">
                                    <img src={c.userAvatar} className="w-8 h-8 rounded-full object-cover bg-denim-100 shrink-0 border border-cream-200"/>
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-cream-200 shadow-sm max-w-[85%] relative group">
                                        <div className="flex justify-between items-start">
                                            <h5 className="font-bold text-xs text-denim-900 flex items-center gap-1">
                                                {c.userName}
                                                {c.isAdmin && <BadgeCheck size={12} className="text-white fill-blue-500" />}
                                            </h5>
                                            <button onClick={() => setActiveCommentMenuId(activeCommentMenuId === c.id ? null : c.id)} className="text-denim-300 hover:text-denim-600 p-1 -mt-1 -mr-1"><MoreVertical size={14} /></button>
                                        </div>
                                        {c.replyTo && (
                                            <div className="bg-cream-50 p-1.5 rounded-md border-l-2 border-denim-300 mb-1">
                                                <p className="text-[10px] font-bold text-denim-500">{c.replyTo.userName}</p>
                                                <p className="text-[10px] text-denim-400 truncate">{c.replyTo.text}</p>
                                            </div>
                                        )}
                                        <p className="text-sm text-denim-700 leading-snug">{c.text}</p>
                                        {activeCommentMenuId === c.id && (
                                            <div className="absolute right-0 top-6 bg-white shadow-lg border border-cream-200 rounded-lg z-10 py-1 w-24 animate-in zoom-in-95">
                                                <button onClick={() => handleReplyClick(c)} className="w-full text-left px-3 py-2 text-xs hover:bg-cream-50 flex items-center gap-2 text-denim-700">
                                                    <CornerDownRight size={12} /> Balas
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-cream-200 bg-white">
                            {replyingTo && (
                                <div className="flex justify-between items-center bg-cream-50 p-2 rounded-lg mb-2 text-xs border border-cream-200">
                                    <span className="text-denim-600 truncate">Membalas <b>{replyingTo.name}</b>: "{replyingTo.text.substring(0, 20)}..."</span>
                                    <button onClick={() => setReplyingTo(null)}><X size={14} className="text-denim-400 hover:text-red-500" /></button>
                                </div>
                            )}
                            <form onSubmit={handleSendComment} className="flex gap-2 items-center">
                                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={replyingTo ? `Balas ke ${replyingTo.name}...` : t.status.writeComment} className="flex-1 bg-cream-50 border border-cream-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-denim-500" autoFocus={!!replyingTo} />
                                <button disabled={!commentText.trim() || sendingComment} className="p-2 bg-denim-100 text-denim-600 rounded-full hover:bg-denim-200 disabled:opacity-50"><Send size={18} className="rtl:rotate-180"/></button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Groups View ---
export const GroupsView: React.FC<SidebarViewProps> = ({ onBack, onOpenGroupChat, appSettings }) => {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const t = translations[appSettings?.language || 'id'];

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'chats'),
      where('type', '==', 'group'),
      where('participants', 'array-contains', currentUser.id),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const g = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatPreview));
      setGroups(g);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !currentUser) return;
    setCreating(true);
    try {
      const newGroupData = {
        type: 'group',
        participants: [currentUser.id],
        adminIds: [currentUser.id],
        name: newGroupName,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newGroupName)}&background=random`,
        lastMessage: 'Grup dibuat',
        lastMessageType: 'text',
        unreadCounts: { [currentUser.id]: 0 },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        typing: {}
      };
      
      const docRef = await addDoc(collection(db, 'chats'), newGroupData);
      const newGroup = { id: docRef.id, ...newGroupData } as ChatPreview;
      
      setShowCreateModal(false);
      setNewGroupName('');
      if (onOpenGroupChat) onOpenGroupChat(newGroup);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Gagal membuat grup.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.groups.title} onBack={onBack} />
      
      <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin text-denim-400" /></div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-denim-400">
            <UserIcon size={48} className="mb-2 opacity-50" />
            <p className="text-sm">{t.groups.noGroups}</p>
          </div>
        ) : (
          groups.map(group => (
            <div 
              key={group.id} 
              onClick={() => onOpenGroupChat && onOpenGroupChat(group)}
              className="flex items-center gap-3 p-3 hover:bg-white rounded-xl cursor-pointer transition-colors border border-transparent hover:border-cream-200"
            >
              <img src={group.avatar} className="w-12 h-12 rounded-full object-cover bg-denim-200" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-denim-900 truncate">{group.name}</h4>
                <p className="text-xs text-denim-500 truncate">{group.participants.length} {t.groups.members}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => setShowCreateModal(true)}
        className="absolute bottom-6 right-6 rtl:left-6 rtl:right-auto w-14 h-14 bg-denim-600 hover:bg-denim-700 text-white rounded-full shadow-xl shadow-denim-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20"
      >
        <Plus size={28} />
      </button>

      {/* Modal Create Group */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-denim-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
             <h3 className="font-bold text-lg text-denim-900 mb-4">{t.groups.newGroup}</h3>
             <input 
               type="text" 
               placeholder={t.groups.groupName}
               value={newGroupName}
               onChange={(e) => setNewGroupName(e.target.value)}
               className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl mb-6 focus:outline-none focus:ring-1 focus:ring-denim-500"
               autoFocus
             />
             <div className="flex gap-3">
               <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-cream-100 text-denim-700 font-bold rounded-xl">{t.common.cancel}</button>
               <button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()} className="flex-1 py-2.5 bg-denim-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                 {creating && <Loader2 size={16} className="animate-spin" />}
                 {t.groups.create}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Contacts View ---
export const ContactsView: React.FC<SidebarViewProps> = ({ onBack, onStartChat, appSettings }) => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Add Contact State
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [savedName, setSavedName] = useState('');
  
  const t = translations[appSettings?.language || 'id'];

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, 'users', currentUser.id, 'contacts'), (snap) => {
      const list = snap.docs.map(d => ({id: d.id, ...d.data()} as Contact));
      list.sort((a, b) => a.savedName.localeCompare(b.savedName));
      setContacts(list);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const handleSearchUser = async () => {
    if (!searchPhone) return;
    setSearchingUser(true);
    setFoundUser(null);
    try {
      const q = query(collection(db, 'users'), where('phoneNumber', '==', searchPhone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        setFoundUser({ id: snap.docs[0].id, ...userData } as User);
        setSavedName(userData.name);
      } else {
        alert(t.chatList.contactNotFound);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingUser(false);
    }
  };

  const handleSaveContact = async () => {
    if (!foundUser || !currentUser || !savedName) return;
    try {
      await addDoc(collection(db, 'users', currentUser.id, 'contacts'), {
        uid: foundUser.id,
        savedName: savedName,
        phoneNumber: foundUser.phoneNumber,
        avatar: foundUser.avatar || ''
      });
      setShowAddModal(false);
      setSearchPhone('');
      setFoundUser(null);
      setSavedName('');
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan kontak.");
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.savedName.toLowerCase().includes(search.toLowerCase()) || 
    c.phoneNumber.includes(search)
  );

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.contacts.title} onBack={onBack} />
      
      <div className="p-3 bg-cream-50 border-b border-cream-200">
         <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-denim-400" size={16} />
           <input 
             type="text" 
             placeholder={t.contacts.search}
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full pl-9 pr-4 py-2 bg-white border border-cream-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500"
           />
         </div>
      </div>

      <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-colors text-denim-600 font-bold mb-2"
        >
          <div className="w-10 h-10 rounded-full bg-denim-100 flex items-center justify-center">
             <UserPlus size={20} />
          </div>
          {t.contacts.newContact}
        </button>

        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin text-denim-400" /></div>
        ) : filteredContacts.map(contact => (
          <div 
             key={contact.id}
             onClick={() => onStartChat && onStartChat(contact.uid)}
             className="flex items-center gap-3 p-3 hover:bg-white rounded-xl cursor-pointer transition-colors border border-transparent hover:border-cream-200"
          >
             <img src={contact.avatar} className="w-10 h-10 rounded-full object-cover bg-denim-200" />
             <div>
                <h4 className="font-bold text-denim-900 text-sm">{contact.savedName}</h4>
                <p className="text-xs text-denim-500">{contact.phoneNumber}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Modal Add Contact */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-denim-900/60 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg text-denim-900">{t.contacts.newContact}</h3>
                 <button onClick={() => setShowAddModal(false)}><X size={20} className="text-denim-400"/></button>
              </div>
              
              {!foundUser ? (
                <>
                  <label className="text-xs font-bold text-denim-500 uppercase mb-1 block">Nomor HP</label>
                  <div className="flex gap-2 mb-4">
                     <input 
                       type="tel" 
                       value={searchPhone}
                       onChange={(e) => setSearchPhone(e.target.value)}
                       className="flex-1 px-3 py-2 border border-cream-200 rounded-lg"
                       placeholder="08..."
                     />
                     <button onClick={handleSearchUser} disabled={searchingUser || !searchPhone} className="px-4 bg-denim-600 text-white rounded-lg">
                        {searchingUser ? <Loader2 size={18} className="animate-spin"/> : <Search size={18} />}
                     </button>
                  </div>
                </>
              ) : (
                <div className="mb-4">
                   <div className="flex items-center gap-3 mb-4 p-3 bg-cream-50 rounded-lg border border-cream-200">
                      <img src={foundUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name)}`} className="w-12 h-12 rounded-full" />
                      <div>
                         <p className="font-bold text-denim-900">{foundUser.name}</p>
                         <p className="text-xs text-denim-500">{foundUser.phoneNumber}</p>
                      </div>
                   </div>
                   <label className="text-xs font-bold text-denim-500 uppercase mb-1 block">Simpan Sebagai</label>
                   <input 
                     type="text" 
                     value={savedName}
                     onChange={(e) => setSavedName(e.target.value)}
                     className="w-full px-3 py-2 border border-cream-200 rounded-lg mb-4"
                   />
                   <button onClick={handleSaveContact} className="w-full py-2 bg-green-500 text-white font-bold rounded-lg">{t.contacts.saveContact}</button>
                   <button onClick={() => setFoundUser(null)} className="w-full py-2 mt-2 text-denim-500 text-sm">{t.common.cancel}</button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

// --- Settings View ---
export const SettingsView: React.FC<SidebarViewProps> = ({ onBack, appSettings, updateAppSettings }) => {
  const t = translations[appSettings?.language || 'id'];
  const { logout } = useAuth();
  
  if (!appSettings || !updateAppSettings) return null;

  const SettingToggle = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3">
       <span className="text-denim-700 text-sm font-medium">{label}</span>
       <button 
         onClick={() => onChange(!value)}
         className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-denim-600' : 'bg-gray-300'}`}
       >
         <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'left-6' : 'left-1'} rtl:${value ? 'right-6' : 'right-1'}`} />
       </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.settings.title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {/* Language */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-cream-200">
           <h3 className="flex items-center gap-2 text-denim-900 font-bold mb-3">
             <Globe size={18} className="text-denim-500" /> {t.settings.lang.title}
           </h3>
           <div className="flex gap-2">
              <button 
                onClick={() => updateAppSettings({ language: 'id' })}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border ${appSettings.language === 'id' ? 'bg-denim-100 border-denim-500 text-denim-700' : 'bg-white border-cream-200 text-denim-500'}`}
              >
                Indonesia
              </button>
              <button 
                onClick={() => updateAppSettings({ language: 'ar' })}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border ${appSettings.language === 'ar' ? 'bg-denim-100 border-denim-500 text-denim-700' : 'bg-white border-cream-200 text-denim-500'}`}
              >
                العربية
              </button>
           </div>
        </section>

        {/* Notifications */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-cream-200">
           <h3 className="flex items-center gap-2 text-denim-900 font-bold mb-3">
             <Bell size={18} className="text-denim-500" /> {t.settings.notif.title}
           </h3>
           <SettingToggle label={t.settings.notif.msgSound} value={appSettings.notifMessage} onChange={(v) => updateAppSettings({ notifMessage: v })} />
           <SettingToggle label={t.settings.notif.grpSound} value={appSettings.notifGroup} onChange={(v) => updateAppSettings({ notifGroup: v })} />
           <SettingToggle label={t.settings.notif.desktop} value={appSettings.notifDesktop} onChange={(v) => updateAppSettings({ notifDesktop: v })} />
        </section>

        {/* Chat Settings */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-cream-200">
           <h3 className="flex items-center gap-2 text-denim-900 font-bold mb-3">
             <MessageSquare size={18} className="text-denim-500" /> {t.settings.chat.title}
           </h3>
           <div className="mb-4">
              <span className="text-denim-700 text-sm font-medium block mb-2">{t.settings.chat.wallpaper}</span>
              <div className="flex gap-2 overflow-x-auto pb-2">
                 {['default', '#f0f2f5', '#e5ddd5', '#dcf8c6', '#34b7f1', '#ece5dd'].map(color => (
                   <button 
                     key={color}
                     onClick={() => updateAppSettings({ wallpaper: color })}
                     className={`w-8 h-8 rounded-full border-2 ${appSettings.wallpaper === color ? 'border-denim-600 scale-110' : 'border-transparent'}`}
                     style={{ backgroundColor: color === 'default' ? '#f0f2f5' : color }}
                   />
                 ))}
              </div>
           </div>
           <div>
              <span className="text-denim-700 text-sm font-medium block mb-2">{t.settings.chat.fontSize}</span>
              <div className="flex gap-2">
                 {(['small', 'normal', 'large'] as const).map(size => (
                   <button 
                     key={size}
                     onClick={() => updateAppSettings({ fontSize: size })}
                     className={`px-3 py-1 rounded text-xs font-bold border ${appSettings.fontSize === size ? 'bg-denim-100 border-denim-500 text-denim-700' : 'bg-white border-cream-200 text-gray-500'}`}
                   >
                     {t.settings.chat[size]}
                   </button>
                 ))}
              </div>
           </div>
        </section>

        <button 
          onClick={() => logout()}
          className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <LogOut size={18} />
          {t.nav.logout}
        </button>
      </div>
    </div>
  );
};

// --- Profile View ---
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
    try {
      await updateProfile(name, bio, currentUser.phoneNumber || '');
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("Gagal update profil");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const url = await uploadImageToCloudinary(e.target.files[0]);
        await updateProfile(currentUser!.name, currentUser!.bio || '', currentUser!.phoneNumber || '', url);
      } catch (e) {
        alert("Gagal upload foto");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.profile.title} onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
         <div className="flex flex-col items-center mb-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
               <img src={currentUser?.avatar} className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover bg-denim-200" />
               <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={32} className="text-white" />
               </div>
               <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
               {loading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-full"><Loader2 className="animate-spin text-denim-600"/></div>}
            </div>
            <p className="text-xs text-denim-500 mt-2">{t.profile.tapChange}</p>
         </div>

         <div className="bg-white p-4 rounded-xl shadow-sm border border-cream-200 space-y-4">
            <div>
               <label className="text-xs font-bold text-denim-500 uppercase block mb-1">{t.profile.name}</label>
               {isEditing ? (
                 <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-cream-300 rounded-lg px-3 py-2 text-denim-900" />
               ) : (
                 <p className="text-lg font-medium text-denim-900">{currentUser?.name}</p>
               )}
            </div>
            
            <div>
               <label className="text-xs font-bold text-denim-500 uppercase block mb-1">{t.profile.bio}</label>
               {isEditing ? (
                 <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full border border-cream-300 rounded-lg px-3 py-2 text-denim-900" />
               ) : (
                 <p className="text-md text-denim-700">{currentUser?.bio || '-'}</p>
               )}
            </div>
            
            <div>
               <label className="text-xs font-bold text-denim-500 uppercase block mb-1">{t.profile.phone}</label>
               <p className="text-md text-denim-600 font-mono bg-cream-50 p-2 rounded-lg">{currentUser?.phoneNumber}</p>
            </div>
         </div>

         <div className="mt-6">
            {isEditing ? (
              <div className="flex gap-3">
                 <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-cream-200 text-denim-700 font-bold rounded-xl">{t.common.cancel}</button>
                 <button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-denim-600 text-white font-bold rounded-xl flex justify-center items-center gap-2">{loading && <Loader2 size={16} className="animate-spin"/>}{t.profile.save}</button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-denim-600 text-white font-bold rounded-xl shadow-lg shadow-denim-600/20">{t.profile.editProfile}</button>
            )}
         </div>
      </div>
    </div>
  );
};

// --- Broadcast View ---
export const BroadcastView: React.FC<SidebarViewProps> = ({ onBack, appSettings }) => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const t = translations[appSettings?.language || 'id'];

  const handleBroadcast = async () => {
    if (!message.trim() || !currentUser?.isAdmin) return;
    setSending(true);
    try {
       // Broadcast implementation
       alert(`Broadcast sent: ${message}`);
       setMessage('');
    } catch (e) {
       alert("Failed to send broadcast.");
    } finally {
       setSending(false);
    }
  };

  if (!currentUser?.isAdmin) return <div className="p-4 text-center">Access Denied</div>;

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.broadcast.title} onBack={onBack} />
      <div className="p-4">
         <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex gap-3">
            <AlertTriangle className="text-yellow-600 shrink-0" />
            <div>
               <h4 className="font-bold text-yellow-800 text-sm">Warning</h4>
               <p className="text-xs text-yellow-700 mt-1">{t.broadcast.warning}</p>
            </div>
         </div>
         
         <label className="block text-sm font-bold text-denim-700 mb-2">{t.broadcast.messageLabel}</label>
         <textarea 
           value={message}
           onChange={(e) => setMessage(e.target.value)}
           className="w-full h-40 p-4 rounded-xl border border-cream-300 focus:ring-2 focus:ring-denim-500 focus:outline-none mb-4"
           placeholder={t.broadcast.placeholder}
         />
         
         <button 
           onClick={handleBroadcast} 
           disabled={sending || !message.trim()}
           className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
         >
           {sending ? <Loader2 className="animate-spin" /> : <Radio size={20} />}
           {t.broadcast.send}
         </button>
      </div>
    </div>
  );
};

export const HelpView: React.FC<SidebarViewProps> = ({ onBack, appSettings }) => {
    const t = translations[appSettings?.language || 'id'];
    return (
        <div className="h-full flex flex-col bg-cream-100">
            <ViewHeader title={t.settings.help.title} onBack={onBack} />
            <div className="p-4 space-y-2">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h3 className="font-bold mb-2">FAQ</h3>
                    <p className="text-sm text-gray-600">Contact admin for support.</p>
                </div>
            </div>
        </div>
    );
};

// Factory to render based on ViewState
export const renderSidebarView = (
  view: ViewState, 
  onBack: () => void, 
  onStartChat?: (contactUid: string) => void, 
  onOpenGroupChat?: (chat: ChatPreview) => void, 
  appSettings?: AppSettings, 
  updateAppSettings?: (settings: Partial<AppSettings>) => void,
  contactsMap?: Record<string, Contact>,
  adminProfile?: User | null,
  onNavigate?: (view: ViewState) => void,
  setTargetStatusId?: (id: string | null) => void,
  targetStatusId?: string | null
) => {
  switch (view) {
    case 'status': return <StatusView onBack={onBack} appSettings={appSettings} contactsMap={contactsMap} adminProfile={adminProfile} onNavigate={onNavigate} />;
    case 'my_status': return <MyStatusView onBack={onBack} appSettings={appSettings} targetStatusId={targetStatusId} />;
    case 'notifications': return <NotificationsView onBack={onBack} appSettings={appSettings} onNavigate={onNavigate} setTargetStatusId={setTargetStatusId} />;
    case 'groups': return <GroupsView onBack={onBack} onOpenGroupChat={onOpenGroupChat} appSettings={appSettings} />;
    case 'contacts': return <ContactsView onBack={onBack} onStartChat={onStartChat} appSettings={appSettings} />;
    case 'settings': return <SettingsView onBack={onBack} appSettings={appSettings} updateAppSettings={updateAppSettings} />;
    case 'help': return <HelpView onBack={onBack} appSettings={appSettings} />; 
    case 'profile': return <ProfileView onBack={onBack} appSettings={appSettings} />;
    case 'broadcast': return <BroadcastView onBack={onBack} appSettings={appSettings} />;
    default: return null;
  }
};
