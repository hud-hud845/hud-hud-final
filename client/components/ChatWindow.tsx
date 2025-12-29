
import React, { useState, useEffect, useRef } from 'react';
import { 
  MoreVertical, Phone, Video, Paperclip, Smile, Send, Mic, ArrowLeft, 
  Loader2, Image as ImageIcon, MapPin, FileText, User as UserIcon, 
  X, Trash2, Download, ExternalLink, Info, CheckSquare, Reply, ChevronDown, BadgeCheck, UserPlus, CheckCircle2, Lock, Play, Maximize
} from 'lucide-react';
import { ChatPreview, Message, User, Contact } from '../types';
import { format } from 'date-fns';
import { doc, updateDoc, increment, getDoc, writeBatch, arrayUnion, onSnapshot as onFirestoreSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, push, set, onValue, serverTimestamp as rtdbTimestamp, remove, update } from 'firebase/database';
import { db, rtdb } from '../services/firebase';
import { uploadFileToCloudinary, uploadImageToCloudinary } from '../services/cloudinary';
import { AppSettings } from './Layout';
import { translations } from '../utils/translations';

interface ChatWindowProps {
  chat: ChatPreview;
  currentUser: User;
  onBack: () => void;
  contactsMap: Record<string, Contact>;
  getDisplayName: (uid: string, fallbackName?: string, fallbackPhone?: string) => string;
  onStartChat: (uid: string) => void;
  appSettings: AppSettings;
  adminProfile: User | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chat: initialChat, 
  currentUser, 
  onBack,
  contactsMap,
  getDisplayName,
  onStartChat,
  appSettings,
  adminProfile
}) => {
  const [chat, setChat] = useState<ChatPreview>(initialChat);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>(''); 
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const t = translations[appSettings.language];

  const [partnerStatus, setPartnerStatus] = useState<'online' | 'offline'>('offline');
  const [partnerRealtimeData, setPartnerRealtimeData] = useState<User | null>(null);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalUser, setInfoModalUser] = useState<User | null>(null);
  const [groupMembersInfo, setGroupMembersInfo] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null); 
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [myContacts, setMyContacts] = useState<Contact[]>([]);
  
  // Link & Video States
  const [pendingExternalLink, setPendingExternalLink] = useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [isVideoZoomed, setIsVideoZoomed] = useState(false);

  // Voice Note States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubChat = onFirestoreSnapshot(doc(db, 'chats', initialChat.id), (docSnap) => {
        if (docSnap.exists()) {
            setChat({ id: docSnap.id, ...docSnap.data() } as ChatPreview);
        }
    });
    return () => unsubChat();
  }, [initialChat.id]);

  const isParticipant = chat.participants.includes(currentUser.id);
  const partnerUid = chat.type === 'direct' ? chat.participants.find(p => p !== currentUser.id) : null;
  const isVerifiedChat = chat.type === 'direct' && adminProfile && partnerUid === adminProfile.id;

  const resolvedName = isVerifiedChat && adminProfile 
    ? adminProfile.name 
    : (partnerUid 
        ? (contactsMap[partnerUid]?.savedName || partnerRealtimeData?.name || partnerRealtimeData?.phoneNumber || chat.name) 
        : chat.name);

  let rawAvatar = isVerifiedChat && adminProfile ? adminProfile.avatar : (contactsMap[partnerUid!]?.avatar || partnerRealtimeData?.avatar || chat.avatar);
  if (!rawAvatar || rawAvatar.includes('ui-avatars.com') || rawAvatar.includes('default')) {
     rawAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=random&color=fff`;
  }
  const displayAvatar = rawAvatar;

  const bgStyle: React.CSSProperties = appSettings.wallpaper === 'default' 
    ? { backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23154c79' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }
    : appSettings.wallpaper.startsWith('http') 
      ? { backgroundImage: `url(${appSettings.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1 }
      : { backgroundColor: appSettings.wallpaper, backgroundImage: 'none' };

  const fontSizeClass = 
    appSettings.fontSize === 'xsmall' ? 'text-[11px]' :
    appSettings.fontSize === 'small' ? 'text-[13px]' : 
    appSettings.fontSize === 'large' ? 'text-[17px]' : 
    appSettings.fontSize === 'xlarge' ? 'text-[19px]' : 
    'text-[15px]';

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const scrollToMessage = (msgId: string) => { const el = document.getElementById(`msg-${msgId}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('bg-yellow-100/20'); setTimeout(() => el.classList.remove('bg-yellow-100/20'), 1000); } };

  useEffect(() => {
    if (chat.type === 'direct' && partnerUid) {
      const unsubPartner = onFirestoreSnapshot(doc(db, 'users', partnerUid), async (docSnap) => {
        if (docSnap.exists()) {
          const userData = { id: docSnap.id, ...docSnap.data() } as User;
          setPartnerRealtimeData(userData);
          setPartnerStatus(userData.status === 'online' ? 'online' : 'offline');
        }
      });
      return () => unsubPartner();
    } 
  }, [chat.id, partnerUid, chat.type]);

  useEffect(() => {
    const messagesRef = ref(rtdb, `messages/${chat.id}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
            const fetchedMessages: Message[] = Object.entries(val).map(([id, data]: [string, any]) => ({
                id,
                ...data,
                timestamp: data.createdAt ? new Date(data.createdAt) : new Date()
            }));
            setMessages(fetchedMessages);
            setTimeout(scrollToBottom, 100);

            const unreadIds = Object.entries(val)
                .filter(([id, data]: [string, any]) => data.senderId !== currentUser.id && (!data.readBy || !data.readBy.includes(currentUser.id)))
                .map(([id]) => id);

            if (unreadIds.length > 0) {
                const updates: any = {};
                unreadIds.forEach(id => {
                    const currentReadBy = val[id].readBy || [];
                    if (!currentReadBy.includes(currentUser.id)) {
                        updates[`messages/${chat.id}/${id}/readBy`] = [...currentReadBy, currentUser.id];
                    }
                });
                if (Object.keys(updates).length > 0) update(ref(rtdb), updates);
            }
        } else {
            setMessages([]);
        }
    });
    return () => unsubscribe();
  }, [chat.id, currentUser.id]);

  useEffect(() => { if (showContactPicker) { const list = Object.values(contactsMap).sort((a: Contact, b: Contact) => a.savedName.localeCompare(b.savedName)); setMyContacts(list); } }, [showContactPicker, contactsMap]);

  const showToast = (message: string) => { setToastMessage(message); setTimeout(() => setToastMessage(null), 3000); };

  const handleDirectDownload = async (url: string, fileName: string, msgId: string) => {
    try {
      setDownloadingFileId(msgId);
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error("Gagal mengambil file.");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = blobUrl; link.download = fileName; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(blobUrl);
      showToast("File berhasil disimpan");
    } catch (error) { window.open(url, '_blank'); showToast("Membuka file di tab baru"); } finally { setDownloadingFileId(null); }
  };

  const handleHeaderClick = async () => { 
    if (chat.type === 'group') { setInfoModalUser(null); setShowInfoModal(true); } 
    else { const partnerId = chat.participants.find(p => p !== currentUser.id); if (partnerId) { if (adminProfile && partnerId === adminProfile.id) { setInfoModalUser(adminProfile); setShowInfoModal(true); } else { await handleOpenUserInfo(partnerId); } } } 
  };
  
  const handleOpenUserInfo = async (targetUid: string) => {
    if (adminProfile && targetUid === adminProfile.id) { setInfoModalUser(adminProfile); setShowInfoModal(true); return; }
    const docSnap = await getDoc(doc(db, 'users', targetUid)); 
    if (docSnap.exists()) { 
         const userData = docSnap.data();
         let finalAvatar = contactsMap[targetUid]?.avatar || userData.avatar;
         if (!finalAvatar) finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(contactsMap[targetUid]?.savedName || userData.name)}&background=random&color=fff`;
         setInfoModalUser({ id: docSnap.id, ...userData, name: contactsMap[targetUid]?.savedName || userData.name, avatar: finalAvatar } as User);
    }
    setShowInfoModal(true);
  };
  
  const handleSendMessage = async (type: Message['type'], content: string, extraData: Partial<Message> = {}) => {
    if (!isParticipant) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateDoc(doc(db, 'chats', chat.id), { [`typing.${currentUser.id}`]: null });
    
    try {
      const messageRef = push(ref(rtdb, `messages/${chat.id}`));
      let displayContent = content || (type !== 'text' ? type : '');
      if (type === 'image') displayContent = `📷 ${t.chatWindow.attach.photo}`; else if (type === 'audio') displayContent = '🎤 Voice'; else if (type === 'document') displayContent = `📄 ${t.chatWindow.attach.doc}`; else if (type === 'location') displayContent = `📍 ${t.chatWindow.attach.loc}`; else if (type === 'contact') displayContent = `👤 ${t.chatWindow.attach.contact}`;
      
      let replyData = null;
      if (replyingTo) {
        let replyPreview = replyingTo.content;
        if (replyingTo.type === 'image') replyPreview = `📷 ${t.chatWindow.attach.photo}`; else if (replyingTo.type === 'audio') replyPreview = '🎤 Voice'; else if (replyingTo.type === 'document') replyPreview = `📄 ${t.chatWindow.attach.doc}`; else if (replyingTo.type === 'location') replyPreview = `📍 ${t.chatWindow.attach.loc}`; else if (replyingTo.type === 'contact') replyPreview = `👤 ${t.chatWindow.attach.contact}`;
        replyData = { id: replyingTo.id, senderName: getDisplayName(replyingTo.senderId), content: replyPreview, type: replyingTo.type };
      }

      const messageObj = { senderId: currentUser.id, content: content, type: type, status: 'sent', readBy: [], createdAt: Date.now(), replyTo: replyData, ...extraData };
      await set(messageRef, messageObj);

      const chatRef = doc(db, 'chats', chat.id);
      const updates: any = { lastMessage: displayContent, lastMessageType: type, updatedAt: serverTimestamp() };
      chat.participants.forEach(uid => { if (uid !== currentUser.id) { updates[`unreadCounts.${uid}`] = increment(1); } });
      await updateDoc(chatRef, updates);

      setInputText(''); setReplyingTo(null); setShowAttachMenu(false);
    } catch (error) { console.error("Gagal mengirim pesan:", error); alert("Gagal mengirim pesan."); }
  };

  const handleMessageSelect = (msgId: string) => { const newSet = new Set(selectedMessageIds); if (newSet.has(msgId)) newSet.delete(msgId); else newSet.add(msgId); setSelectedMessageIds(newSet); };
  
  const handleDeleteMessages = async () => { 
    if (selectedMessageIds.size === 0) return; 
    setIsDeleting(true); 
    try { 
      const updates: any = {};
      selectedMessageIds.forEach(id => { updates[`messages/${chat.id}/${id}`] = null; });
      await update(ref(rtdb), updates);
      setIsSelectionMode(false); setSelectedMessageIds(new Set()); setShowDeleteConfirm(false);
    } catch (e) { alert("Gagal menghapus pesan"); } finally { setIsDeleting(false); } 
  };

  const toggleSelectionMode = () => { setIsSelectionMode(!isSelectionMode); setSelectedMessageIds(new Set()); setShowHeaderMenu(false); };
  const handleReply = (msg: Message) => { setReplyingTo(msg); setActiveMessageMenu(null); };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; setIsUploading(true); setUploadProgress(t.common.processing); try { const url = await uploadImageToCloudinary(file); await handleSendMessage('image', '', { fileUrl: url, fileName: file.name }); } finally { setIsUploading(false); setUploadProgress(''); } } };
  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; setIsUploading(true); setUploadProgress(t.common.processing); try { const url = await uploadFileToCloudinary(file, 'auto'); const size = (file.size / 1024 / 1024).toFixed(2) + " MB"; await handleSendMessage('document', '', { fileUrl: url, fileName: file.name, fileSize: size, mimeType: file.type }); } finally { setIsUploading(false); setUploadProgress(''); } } };
  const handleSendLocation = () => { if (!navigator.geolocation) return; setIsUploading(true); setUploadProgress(t.common.processing); setShowAttachMenu(false); navigator.geolocation.getCurrentPosition((pos) => { handleSendMessage('location', '', { location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }).finally(() => { setIsUploading(false); setUploadProgress(""); }); }, () => { setIsUploading(false); setUploadProgress(""); }, { enableHighAccuracy: true, timeout: 15000 }); };
  const handleSendContact = (contact: Contact) => { handleSendMessage('contact', '', { contact: { uid: contact.uid, name: contact.savedName, phoneNumber: contact.phoneNumber, avatar: contact.avatar } }); setShowContactPicker(false); };
  
  // VOICE NOTE LOGIC
  const startRecording = async () => { 
    try { 
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); 
      const mediaRecorder = new MediaRecorder(stream); 
      mediaRecorderRef.current = mediaRecorder; 
      audioChunksRef.current = []; 
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); }; 
      mediaRecorder.onstop = async () => { 
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        const audioFile = new File([audioBlob], `vn_${Date.now()}.webm`, { type: 'audio/webm' }); 
        setIsUploading(true); setUploadProgress(t.common.processing); 
        try { const url = await uploadFileToCloudinary(audioFile, 'audio'); await handleSendMessage('audio', '', { fileUrl: url, duration: recordingDuration }); } catch (err) { alert("Gagal mengirim Voice Note."); } finally { setIsUploading(false); setUploadProgress(''); } 
        stream.getTracks().forEach(track => track.stop()); 
      }; 
      mediaRecorder.start(); setIsRecording(true); setRecordingDuration(0); 
      recordingTimerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000); 
    } catch (err) { alert("Akses Mikrofon Ditolak. Harap izinkan mikrofon di pengaturan browser Anda."); } 
  };

  const stopRecording = (cancel = false) => { 
    if (mediaRecorderRef.current && isRecording) { 
      if (cancel) { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); } 
      else { mediaRecorderRef.current.stop(); } 
    } 
    clearInterval(recordingTimerRef.current); setIsRecording(false); 
  };

  // Smart Content Parser & Video Detection
  const parseContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <button 
            key={i} 
            onClick={(e) => { e.stopPropagation(); setPendingExternalLink(part); }}
            className="text-blue-400 hover:underline break-all text-start"
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };

  const checkVideo = (content: string) => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/i;
    const directVideoRegex = /\.(mp4|webm|ogg)$/i;
    
    const ytMatch = content.match(youtubeRegex);
    if (ytMatch) {
        const id = ytMatch[1].split('&')[0].split('?')[0];
        return { type: 'youtube', url: `https://www.youtube.com/embed/${id}` };
    }
    
    const directMatch = content.match(/(https?:\/\/[^\s]+\.(mp4|webm|ogg))/i);
    if (directMatch) {
        return { type: 'direct', url: directMatch[0] };
    }
    
    return null;
  };

  const renderMessageContent = (msg: Message, isMe: boolean) => {
    if (msg.senderId === 'system') return (<div className="flex justify-center w-full my-1"><div className="bg-cream-200/50 px-4 py-1.5 rounded-full border border-cream-300"><p className="text-[11px] font-bold text-denim-600 uppercase italic">{msg.content}</p></div></div>);
    
    const videoData = msg.type === 'text' ? checkVideo(msg.content) : null;

    switch (msg.type) {
      case 'image': return (<div className="mb-1"><img src={msg.fileUrl} onClick={() => setZoomImage(msg.fileUrl || null)} className="rounded-lg max-h-64 object-cover cursor-pointer" />{msg.content && <p className={`mt-1 ${fontSizeClass}`}>{msg.content}</p>}</div>);
      case 'audio': return (<div className="flex items-center gap-3 min-w-[200px] py-1"><div className={`p-2 rounded-full ${isMe ? 'bg-denim-600' : 'bg-denim-100'}`}><Mic size={20} className={isMe ? 'text-white' : 'text-denim-600'} /></div><audio controls src={msg.fileUrl} className="h-8 w-48" /></div>);
      case 'document': return (<div className="flex items-center gap-3 bg-black/5 p-3 rounded-lg min-w-[220px] max-w-[280px]"><div className="shrink-0"><FileText size={28} className="text-red-500" /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-semibold truncate leading-tight mb-0.5">{msg.fileName}</p><p className="text-[10px] opacity-70">{msg.fileSize} • Doc</p></div><button onClick={() => msg.fileUrl && handleDirectDownload(msg.fileUrl, msg.fileName || 'doc', msg.id)} disabled={downloadingFileId === msg.id} className="shrink-0 p-2.5 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors flex items-center justify-center h-10 w-10">{downloadingFileId === msg.id ? <Loader2 size={18} className="animate-spin text-denim-600" /> : <Download size={18} className="text-denim-600"/>}</button></div>);
      case 'location': return (<a href={`https://www.google.com/maps?q=${msg.location?.latitude},${msg.location?.longitude}`} target="_blank" rel="noreferrer" className="block min-w-[200px]"><div className="bg-cream-100 h-32 rounded-lg flex items-center justify-center mb-2 relative overflow-hidden border border-cream-200"><div className="absolute inset-0 opacity-50 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover"></div><MapPin size={32} className="text-red-500 relative z-10 animate-bounce" /></div><div className="flex items-center gap-2 text-sm text-blue-500 font-medium px-1"><ExternalLink size={14} /> <span>Open Map</span></div></a>);
      case 'contact': return (<div className="bg-black/5 p-3 rounded-lg min-w-[200px]"><div className="flex items-center gap-3 mb-2"><img src={msg.contact?.avatar} className="w-10 h-10 rounded-full bg-gray-300" /><div><p className="font-bold text-sm">{msg.contact?.name}</p><p className="text-xs">{msg.contact?.phoneNumber}</p></div></div><button onClick={() => msg.contact?.uid && onStartChat(msg.contact.uid)} className="w-full py-2 bg-denim-600 text-white rounded-lg text-xs font-bold">Chat</button></div>);
      default: return (
        <div className="space-y-2">
            <p className={`${fontSizeClass} leading-relaxed whitespace-pre-wrap break-words`}>{parseContent(msg.content)}</p>
            {videoData && (
                <div 
                    onClick={() => setActiveVideoUrl(videoData.url)}
                    className="mt-2 group relative cursor-pointer overflow-hidden rounded-xl border border-white/20 bg-black shadow-lg aspect-video max-w-[300px]"
                >
                    <div className="absolute inset-0 bg-denim-900/40 group-hover:bg-denim-900/20 transition-colors flex items-center justify-center z-10">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white shadow-xl group-hover:scale-110 transition-transform">
                            <Play size={24} fill="currentColor" />
                        </div>
                    </div>
                    {videoData.type === 'youtube' ? (
                        <img 
                            src={`https://img.youtube.com/vi/${videoData.url.split('/').pop()?.split('?')[0]}/0.jpg`} 
                            className="w-full h-full object-cover opacity-60" 
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                             <Video size={48} />
                             <span className="text-[10px] font-bold uppercase mt-2">Format Video</span>
                        </div>
                    )}
                </div>
            )}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-cream-50 relative pattern-bg">
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={bgStyle}></div>
      <div className="flex items-center justify-between p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-cream-200 bg-cream-50/95 backdrop-blur-sm z-30 shadow-sm relative text-denim-900 shrink-0">
        {isSelectionMode ? ( <div className="flex items-center gap-4 w-full"><button onClick={toggleSelectionMode} className="p-2 hover:bg-cream-200 rounded-full transition-colors"><X size={20} className="text-denim-600"/></button><span className="text-lg font-bold">{selectedMessageIds.size} {t.chatWindow.select}</span><div className="flex-1"/><button onClick={() => selectedMessageIds.size > 0 && setShowDeleteConfirm(true)} className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"><Trash2 size={24} /></button></div> ) : (
          <><div className="flex items-center gap-3 cursor-pointer" onClick={handleHeaderClick}><button onClick={(e) => { e.stopPropagation(); onBack(); }} className="md:hidden p-2 -ms-2 text-denim-500"><ArrowLeft size={20} className="rtl:rotate-180" /></button><img src={displayAvatar} className="w-10 h-10 rounded-full border border-cream-300 object-cover" /><div className="flex flex-col"><h2 className="font-bold text-[15px] flex items-center gap-1">{resolvedName}{isVerifiedChat && <BadgeCheck size={16} className="text-white fill-blue-500" />}</h2><div className="flex items-center gap-1 text-xs text-denim-500"><p>{chat.type === 'group' ? `${chat.participants.length} ${t.groups.members}` : (partnerStatus === 'online' ? t.common.online : t.common.offline)}</p></div></div></div><div className="flex items-center gap-4 text-denim-400 relative"><button className="hidden sm:block hover:text-denim-600 transition-colors"><Phone size={20} /></button><button className="hidden sm:block hover:text-denim-600 transition-colors"><Video size={20} /></button><button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="ps-2 border-s border-cream-300 hover:text-denim-600 transition-colors"><MoreVertical size={20} /></button>{showHeaderMenu && (<div className="absolute end-0 top-10 bg-white shadow-xl border border-cream-200 rounded-xl py-1 w-48 z-50 animate-in fade-in zoom-in-95"><button onClick={() => { setShowHeaderMenu(false); handleHeaderClick(); }} className="w-full text-start px-4 py-3 hover:bg-cream-50 text-sm text-denim-800 flex items-center gap-2"><Info size={16}/> {chat.type === 'group' ? t.chatWindow.infoGroup : t.chatWindow.infoContact}</button><button onClick={toggleSelectionMode} className="w-full text-start px-4 py-3 hover:bg-red-50 text-sm text-red-500 flex items-center gap-2 border-t border-cream-100"><Trash2 size={16}/> {t.chatWindow.deleteMsg}</button></div>)}</div></>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 z-0 custom-scrollbar relative">
        {messages.map((msg) => {
          if (msg.senderId === 'system') return <div key={msg.id}>{renderMessageContent(msg, false)}</div>;
          const isMe = msg.senderId === currentUser.id;
          let senderName = null, senderAvatar = null, isMsgAdmin = false;
          if (!isMe && chat.type === 'group') {
             if (adminProfile && msg.senderId === adminProfile.id) { senderName = adminProfile.name; senderAvatar = adminProfile.avatar; isMsgAdmin = true; } 
             else { senderName = getDisplayName(msg.senderId); senderAvatar = contactsMap[msg.senderId]?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff`; }
          }
          const isSelected = selectedMessageIds.has(msg.id);
          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
              {isSelectionMode && (<div onClick={() => handleMessageSelect(msg.id)} className={`mt-2 cursor-pointer w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-denim-600 border-denim-600' : 'border-denim-300 bg-white'}`}>{isSelected && <CheckSquare size={14} className="text-white"/>}</div>)}
              {!isMe && chat.type === 'group' && !isSelectionMode && (<img src={senderAvatar || ''} className="w-8 h-8 rounded-full mt-1 cursor-pointer hover:opacity-80 transition-opacity object-cover border border-cream-200 shrink-0" onClick={() => handleOpenUserInfo(msg.senderId)}/>)}
              <div className={`max-w-[85%] md:max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
                {senderName && (<span className="text-[10px] text-denim-500 font-bold mb-1 ms-1 flex items-center gap-1">{senderName}{isMsgAdmin && <BadgeCheck size={12} className="text-white fill-blue-500" />}</span>)}
                <div className={`px-4 py-2 rounded-2xl relative shadow-sm min-w-[120px] transition-colors ${isMe ? 'bg-denim-700 text-white rounded-be-none' : 'bg-white text-denim-900 rounded-bs-none border border-cream-200'} ${isSelected ? 'ring-2 ring-denim-400 ring-offset-2' : ''}`} onContextMenu={(e) => { e.preventDefault(); if (!isSelectionMode) setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id); }}>
                  {msg.replyTo && (<div className={`mb-2 p-2 rounded-lg text-xs border-s-4 cursor-pointer hover:opacity-80 ${isMe ? 'bg-black/20 border-white/50 text-white' : 'bg-cream-100 border-denim-500 text-denim-800'}`} onClick={() => scrollToMessage(msg.replyTo!.id)}><p className="font-bold mb-0.5">{msg.replyTo.senderName}</p><p className="truncate opacity-80">{msg.replyTo.content}</p></div>)}
                  {renderMessageContent(msg, isMe)}
                  <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-denim-100' : 'text-denim-400'}`}>{format(msg.timestamp, 'HH:mm')}{isMe && (<span className={`font-bold tracking-tighter ${(msg.readBy && msg.readBy.length > 0) ? 'text-green-300' : 'text-denim-300'}`}>{(msg.readBy && msg.readBy.length > 0) || (chat.type === 'direct' && partnerStatus === 'online') ? '✓✓' : '✓'}</span>)}</div>
                  {!isSelectionMode && (<button onClick={(e) => { e.stopPropagation(); setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id); }} className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full transition-all ${isMe ? '-start-8 text-denim-500' : '-end-8 text-denim-500'}`}><ChevronDown size={18} /></button>)}
                  {activeMessageMenu === msg.id && (<div className={`absolute top-8 z-20 bg-white shadow-xl rounded-xl border border-cream-200 py-1 w-32 animate-in fade-in zoom-in-95 ${isMe ? 'end-0' : 'start-0'}`}><button onClick={() => handleReply(msg)} className="w-full text-start px-3 py-2 text-sm text-denim-800 hover:bg-cream-50 flex items-center gap-2"><Reply size={14}/> {t.chatWindow.reply}</button><button onClick={() => { setIsSelectionMode(true); setSelectedMessageIds(new Set([msg.id])); setActiveMessageMenu(null); }} className="w-full text-start px-3 py-2 text-sm text-denim-800 hover:bg-cream-50 flex items-center gap-2"><CheckSquare size={14}/> {t.chatWindow.select}</button><button onClick={() => { setShowDeleteConfirm(true); setSelectedMessageIds(new Set([msg.id])); setActiveMessageMenu(null); }} className="w-full text-start px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-cream-100"><Trash2 size={14}/> {t.common.delete}</button></div>)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-cream-50/95 backdrop-blur-sm border-t border-cream-200 z-30 relative shrink-0">
        {!isParticipant ? ( <div className="p-4 bg-cream-100 flex flex-col items-center justify-center gap-2 animate-in slide-in-from-bottom-2 pb-safe"><div className="p-3 bg-cream-200 rounded-full text-denim-400"><Lock size={24} /></div><p className="text-sm font-bold text-denim-600">Anda tidak lagi menjadi anggota grup ini</p><p className="text-xs text-denim-400">Hubungi admin untuk bergabung kembali.</p></div> ) : (
            <>{replyingTo && (<div className="px-4 py-2 bg-cream-100 border-s-4 border-denim-500 flex justify-between items-center animate-in slide-in-from-bottom-2"><div className="overflow-hidden"><p className="text-xs font-bold text-denim-600 mb-0.5">{t.chatWindow.reply} {getDisplayName(replyingTo.senderId)}</p><p className="text-xs text-denim-500 truncate">{replyingTo.content || 'Media'}</p></div><button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-cream-200 rounded-full text-denim-500"><X size={16} /></button></div>)}<div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] relative">{showAttachMenu && (<div className="absolute bottom-[calc(80px+env(safe-area-inset-bottom))] left-4 bg-white rounded-xl shadow-xl border border-cream-200 p-2 grid grid-cols-2 gap-2 animate-in slide-in-from-bottom-5 zoom-in-95 duration-200 w-64 z-20 rtl:right-4 rtl:left-auto"><button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center p-3 hover:bg-cream-100 rounded-lg gap-2 text-denim-700"><div className="p-2 bg-blue-100 text-blue-500 rounded-full"><ImageIcon size={20}/></div><span className="text-xs font-medium">{t.chatWindow.attach.photo}</span></button><button onClick={() => docInputRef.current?.click()} className="flex flex-col items-center p-3 hover:bg-cream-100 rounded-lg gap-2 text-denim-700"><div className="p-2 bg-purple-100 text-purple-500 rounded-full"><FileText size={20}/></div><span className="text-xs font-medium">{t.chatWindow.attach.doc}</span></button><button onClick={handleSendLocation} className="flex flex-col items-center p-3 hover:bg-cream-100 rounded-lg gap-2 text-denim-700"><div className="p-2 bg-green-100 text-green-500 rounded-full"><MapPin size={20}/></div><span className="text-xs font-medium">{t.chatWindow.attach.loc}</span></button><button onClick={() => { setShowContactPicker(true); setShowAttachMenu(false); }} className="flex flex-col items-center p-3 hover:bg-cream-100 rounded-lg gap-2 text-denim-700"><div className="p-2 bg-orange-100 text-orange-500 rounded-full"><UserIcon size={20}/></div><span className="text-xs font-medium">{t.chatWindow.attach.contact}</span></button></div>)}<input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" /><input type="file" ref={docInputRef} onChange={handleDocSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" /><div className="max-w-4xl mx-auto flex items-end gap-2">{isRecording ? (<div className="flex-1 bg-white border border-red-200 rounded-2xl flex items-center px-4 py-2 min-h-[48px] shadow-sm animate-pulse"><div className="w-3 h-3 bg-red-500 rounded-full animate-ping me-3"></div><span className="flex-1 text-red-500 font-mono font-bold">{(recordingDuration / 60) | 0}:{recordingDuration % 60 < 10 ? '0' : ''}{recordingDuration % 60}</span><button onClick={() => stopRecording(true)} className="p-2 text-denim-400 hover:text-red-500 text-xs font-bold uppercase me-2">{t.common.cancel}</button></div>) : (<><button onClick={() => setShowAttachMenu(!showAttachMenu)} disabled={isUploading} className="p-3 text-denim-400 hover:text-denim-600 transition-colors rounded-full hover:bg-cream-200 disabled:opacity-50">{isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}</button><div className="flex-1 bg-white border border-cream-300 rounded-2xl flex items-center px-4 py-2 min-h-[48px] shadow-sm"><input type="text" value={uploadProgress ? uploadProgress : inputText} disabled={isUploading || !!uploadProgress} onChange={(e) => { setInputText(e.target.value); if (e.target.value.length % 5 === 0) updateDoc(doc(db, 'chats', chat.id), { [`typing.${currentUser.id}`]: serverTimestamp() }); }} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage('text', inputText)} placeholder={uploadProgress ? t.chatWindow.recording : t.chatWindow.writeMessage} className="flex-1 bg-transparent text-denim-900 placeholder-denim-300 focus:outline-none disabled:text-denim-400 outline-none"/><button className="text-denim-400 hover:text-orange-400 transition-colors ms-2 focus:outline-none"><Smile size={20} /></button></div></>)}<button onClick={() => { if (isRecording) stopRecording(false); else if (inputText.trim()) handleSendMessage('text', inputText); else startRecording(); }} disabled={isUploading} className={`p-3 rounded-full transition-all duration-200 transform shadow-lg ${isRecording ? 'bg-red-500 text-white hover:bg-red-600 scale-110' : 'bg-denim-600 text-white hover:bg-denim-700 scale-100'}`}>{isRecording ? <Send size={20} className="rtl:rotate-180" /> : inputText.trim() ? <Send size={20} className="rtl:rotate-180" /> : <Mic size={20} />}</button></div></div></>
        )}
      </div>
      
      {/* MODALS - Tetap menjaga tampilan unread merah dan fitur keamanan link */}
      {pendingExternalLink && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-cream-200 text-center animate-in zoom-in-95 duration-200">
             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
             </div>
             <h3 className="text-lg font-bold text-denim-900 mb-2">{t.common.confirmExit}</h3>
             <p className="text-sm text-denim-500 mb-6">{t.common.exitWarning}</p>
             <div className="flex gap-3">
                <button onClick={() => setPendingExternalLink(null)} className="flex-1 py-3 bg-cream-100 text-denim-700 font-bold rounded-xl">{t.common.cancel}</button>
                <button 
                  onClick={() => { window.open(pendingExternalLink, '_blank'); setPendingExternalLink(null); }} 
                  className="flex-1 py-3 bg-denim-700 text-white font-bold rounded-xl shadow-lg"
                >
                  Buka Link
                </button>
             </div>
          </div>
        </div>
      )}

      {activeVideoUrl && (
        <div className={`fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-300 ${isVideoZoomed ? 'p-0' : 'p-4'}`}>
            <div className={`relative bg-black w-full shadow-2xl transition-all duration-500 flex flex-col ${isVideoZoomed ? 'h-full' : 'max-w-4xl aspect-video rounded-3xl overflow-hidden'}`}>
                <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-20 flex gap-2">
                    <button onClick={() => setIsVideoZoomed(!isVideoZoomed)} className="p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors">
                        <Maximize size={24} />
                    </button>
                    <button onClick={() => { setActiveVideoUrl(null); setIsVideoZoomed(false); }} className="p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                {activeVideoUrl.includes('youtube') ? (
                    <iframe 
                        src={`${activeVideoUrl}?autoplay=1`} 
                        className="w-full h-full" 
                        allow="autoplay; fullscreen" 
                        title="In-App Video"
                    />
                ) : (
                    <video 
                        src={activeVideoUrl} 
                        controls 
                        autoPlay 
                        className="w-full h-full object-contain"
                    />
                )}
            </div>
            {!isVideoZoomed && <p className="mt-4 text-white/60 font-medium text-sm">Hud-Hud Video Engine</p>}
        </div>
      )}

      {showDeleteConfirm && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"><h3 className="font-bold text-lg text-denim-900 mb-2 text-center">{t.chatWindow.deleteMsg}</h3><p className="text-sm text-denim-500 text-center mb-6">{t.chatWindow.deleteMsgConfirm.replace('{count}', selectedMessageIds.size.toString())}</p><div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="flex-1 py-2 bg-cream-100 text-denim-700 rounded-xl font-medium">{t.common.cancel}</button><button onClick={handleDeleteMessages} disabled={isDeleting} className="flex-1 py-2 bg-red-500 text-white rounded-xl font-medium flex justify-center gap-2 items-center">{isDeleting && <Loader2 size={16} className="animate-spin"/>} {t.common.delete}</button></div></div></div>)}

      {showInfoModal && (<div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"><div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative animate-in zoom-in-95 flex flex-col max-h-[80vh]"><button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 bg-black/20 text-white p-1 rounded-full hover:bg-black/40 z-10 rtl:left-4 rtl:right-auto"><X size={20} /></button><div className="h-32 bg-denim-700 relative rounded-t-2xl shrink-0"><div className="absolute inset-0 opacity-10 pattern-bg rounded-t-2xl"></div></div><div className="px-6 pb-6 -mt-12 flex flex-col items-center relative z-0 flex-1 overflow-y-auto custom-scrollbar"><div className="relative group cursor-pointer" onClick={() => setZoomImage(infoModalUser?.avatar || displayAvatar)}><img src={infoModalUser?.avatar || displayAvatar} className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-denim-200 object-cover z-10 relative" /></div><h2 className="mt-3 text-xl font-bold text-denim-900 text-center flex items-center justify-center gap-1">{infoModalUser?.name || chat.name}{((infoModalUser?.isAdmin) || (adminProfile && infoModalUser?.id === adminProfile.id)) && <BadgeCheck size={18} className="text-white fill-blue-500" />}</h2><p className="text-denim-500 text-sm font-medium mb-4 text-center">{chat.type === 'group' && !infoModalUser ? `${chat.participants.length} ${t.groups.members}` : (infoModalUser?.phoneNumber || '-')}</p><div className="w-full bg-cream-50 p-4 rounded-xl border border-cream-200 text-center shrink-0"><p className="text-sm text-denim-700 italic">"{chat.type === 'group' && !infoModalUser ? (chat.description || '-') : (infoModalUser?.bio || '-')}"</p></div>{chat.type === 'group' && !infoModalUser && (<div className="mt-4 w-full"><p className="text-xs font-bold text-denim-400 uppercase tracking-wider mb-2 text-center">{t.groups.members}</p><div className="space-y-2 mt-2">{loadingMembers ? <div className="flex justify-center"><Loader2 className="animate-spin text-denim-400" size={20}/></div> : groupMembersInfo.map(m => (<div key={m.id} className="flex items-center gap-3 p-2 hover:bg-cream-50 rounded-lg"><img src={m.avatar} className="w-8 h-8 rounded-full object-cover shrink-0"/><div className="text-start flex-1 min-w-0 flex items-center gap-1"><p className="text-sm font-semibold text-denim-800 truncate">{m.name}</p>{m.isAdmin && <BadgeCheck size={14} className="text-white fill-blue-500" />}</div>{chat.adminIds?.includes(m.id) && <span className="text-[10px] bg-denim-100 text-denim-600 px-2 py-0.5 rounded-full font-bold">{t.chatWindow.admin}</span>}</div>))}</div></div>)}</div></div></div>)}
      {zoomImage && (<div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-0 animate-in fade-in duration-200" onClick={() => setZoomImage(null)}><button className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 text-white/80 hover:text-white z-[101] bg-black/40 rounded-full p-2 rtl:left-4 rtl:right-auto"><X size={28} /></button><img src={zoomImage} className="w-full h-full object-contain pointer-events-none select-none" /></div>)}
      {toastMessage && (<div className="absolute bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[90] bg-denim-800 text-white px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-400" /><span className="text-sm font-medium">{toastMessage}</span></div>)}
      {showContactPicker && (<div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-denim-900/40 backdrop-blur-sm pt-safe pb-safe"><div className="bg-white w-full max-w-sm rounded-2xl shadow-xl flex flex-col max-h-[70vh]"><div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-50"><h3 className="font-bold text-denim-900">{t.chatWindow.attach.contact}</h3><button onClick={() => setShowContactPicker(false)}><X size={20} className="text-denim-500"/></button></div><div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-white"><div className="space-y-1">{myContacts.map(c => (<div key={c.id} onClick={() => handleSendContact(c)} className="flex items-center gap-3 p-3 hover:bg-cream-100 rounded-xl cursor-pointer"><img src={c.avatar} className="w-10 h-10 rounded-full shrink-0" /><div><p className="font-bold text-sm text-denim-900 flex items-center gap-1">{c.savedName}</p><p className="text-xs text-denim-500">{c.phoneNumber}</p></div></div>))}</div></div></div></div>)}
    </div>
  );
};
