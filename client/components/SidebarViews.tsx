
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, UserPlus, Bell, Lock, Smartphone, 
  Monitor, ChevronRight, HelpCircle, FileText, MessageCircle, 
  Camera, Save, LogOut, CheckSquare, Trash2, X, Plus, Loader2, Settings, UserMinus, AlertTriangle, Key, Mail, Palette, Type, Globe, Database, Wifi, Signal, Send, Radio
} from 'lucide-react';
import { ViewState, Contact, ChatPreview, User, Message } from '../types';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, onSnapshot, deleteDoc, doc, writeBatch, serverTimestamp, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { AppSettings } from './Layout';
import { translations } from '../utils/translations';

interface SidebarViewProps {
  onBack: () => void;
  onStartChat?: (contactUid: string) => void;
  onOpenGroupChat?: (chat: ChatPreview) => void;
  appSettings?: AppSettings;
  updateAppSettings?: (settings: Partial<AppSettings>) => void;
}

// Interface untuk State Konfirmasi
interface ConfirmDialogState {
  isOpen: boolean;
  type: 'kick_member' | 'delete_group' | 'leave_group' | 'batch_delete';
  title: string;
  message: string;
  data?: any; 
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

// --- Profile View ---
export const ProfileView: React.FC<SidebarViewProps> = ({ onBack, appSettings }) => {
  const { currentUser, updateProfile, logout } = useAuth();
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [localAvatar, setLocalAvatar] = useState(currentUser?.avatar);

  const t = translations[appSettings!.language];

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setBio(currentUser.bio || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      if (!isSaving) setLocalAvatar(currentUser.avatar);
    }
  }, [currentUser, isSaving]);

  const handleSave = async () => {
    if (phoneNumber.length < 11) {
      alert("Nomor HP minimal 11 digit.");
      return;
    }
    
    setIsSaving(true);
    try {
      await updateProfile(name, bio, phoneNumber);
      setIsEditing(false);
    } catch (e: any) {
      alert("Gagal menyimpan profil: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser) {
      const file = e.target.files[0];
      
      const previewUrl = URL.createObjectURL(file);
      setLocalAvatar(previewUrl);
      setIsSaving(true);

      try {
        const url = await uploadImageToCloudinary(file);
        const urlWithTimestamp = `${url}?t=${Date.now()}`;
        await updateProfile(name, bio, phoneNumber, urlWithTimestamp);
        setLocalAvatar(urlWithTimestamp);
      } catch (e) {
        console.error(e);
        alert("Gagal upload foto");
        setLocalAvatar(currentUser.avatar); 
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!currentUser) return null;

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title={t.profile.title} onBack={onBack} />
      
      <div className="overflow-y-auto custom-scrollbar flex-1 pb-4">
        <div className="p-6 flex flex-col items-center bg-cream-50 border-b border-cream-200">
          <div className="relative group cursor-pointer" onClick={() => !isSaving && document.getElementById('profileAvatarInput')?.click()}>
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-denim-100 shadow-lg relative bg-denim-200">
              {isSaving && (
                 <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
                    <Loader2 className="animate-spin text-white" />
                 </div>
              )}
              <img src={localAvatar} alt={currentUser.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <Camera className="text-white" size={28} />
            </div>
            <input type="file" id="profileAvatarInput" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={isSaving}/>
          </div>
          <p className="mt-3 text-xs text-denim-400 font-medium">{t.profile.tapChange}</p>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
             <label className="block text-xs font-bold text-denim-500 uppercase tracking-wider mb-2">{t.profile.name}</label>
             {isEditing ? (
               <input 
                 type="text" 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500"
               />
             ) : (
               <p className="text-denim-900 font-medium text-lg">{currentUser.name}</p>
             )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
             <label className="block text-xs font-bold text-denim-500 uppercase tracking-wider mb-2">{t.profile.phone}</label>
             {isEditing ? (
               <input 
                 type="number" 
                 value={phoneNumber}
                 onChange={(e) => setPhoneNumber(e.target.value)}
                 className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500"
               />
             ) : (
               <p className="text-denim-900 font-medium text-lg">{currentUser.phoneNumber || '-'}</p>
             )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
             <label className="block text-xs font-bold text-denim-500 uppercase tracking-wider mb-2">{t.profile.bio}</label>
             {isEditing ? (
               <textarea 
                 value={bio}
                 onChange={(e) => setBio(e.target.value)}
                 className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500 min-h-[80px]"
               />
             ) : (
               <p className="text-denim-700 leading-relaxed">{currentUser.bio || '-'}</p>
             )}
             <p className="text-xs text-denim-400 mt-4 pt-2 border-t border-cream-100">{t.profile.email}: {currentUser.email}</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-cream-200 flex flex-col gap-3">
        {isEditing ? (
           <div className="flex gap-2">
             <button 
               onClick={() => setIsEditing(false)}
               disabled={isSaving}
               className="flex-1 bg-cream-200 hover:bg-cream-300 text-denim-700 font-medium py-3 rounded-xl transition-colors"
             >
               {t.common.cancel}
             </button>
             <button 
               onClick={handleSave}
               disabled={isSaving}
               className="flex-[2] bg-denim-600 hover:bg-denim-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-denim-600/20"
             >
               <Save size={18} />
               {isSaving ? t.common.processing : t.common.save}
             </button>
           </div>
        ) : (
           <button 
             onClick={() => setIsEditing(true)}
             className="w-full bg-cream-100 hover:bg-cream-200 text-denim-700 font-medium py-3 rounded-xl transition-colors border border-cream-300"
           >
             {t.profile.editProfile}
           </button>
        )}

        <button 
          onClick={() => logout()}
          className="w-full text-red-500 hover:bg-red-50 font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={18} className="rtl:rotate-180" />
          {t.profile.logout}
        </button>
      </div>
    </div>
  );
};

export const BroadcastView: React.FC<SidebarViewProps> = ({ onBack, appSettings }) => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');
  const t = translations[appSettings!.language];

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.isAdmin) return;
    
    setIsSending(true);
    setStatus(t.broadcast.sending);

    try {
      // 1. Ambil semua User (kecuali saya sendiri)
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as User))
        .filter(u => u.id !== currentUser.id);

      // 2. Ambil SEMUA chat SAYA (Admin) untuk pengecekan
      // PERBAIKAN: Query berdasarkan peserta SAYA, bukan peserta target
      // Ini mencegah error "Missing or insufficient permissions"
      const myChatsQuery = query(
          collection(db, 'chats'),
          where('type', '==', 'direct'),
          where('participants', 'array-contains', currentUser.id)
      );
      const myChatsSnap = await getDocs(myChatsQuery);
      
      // 3. Buat Peta (Map) TargetUserID -> ChatDoc
      const existingChatMap = new Map<string, string>(); // UID -> ChatID
      myChatsSnap.docs.forEach(doc => {
          const data = doc.data();
          const partnerId = data.participants.find((p: string) => p !== currentUser.id);
          if (partnerId) {
              existingChatMap.set(partnerId, doc.id);
          }
      });

      let sentCount = 0;
      const batchLimit = 400; 
      let batch = writeBatch(db);
      let opCount = 0;

      // 4. Loop Users dan Tentukan Aksi (Pakai Chat Lama / Buat Baru)
      for (const user of allUsers) {
        let chatId = existingChatMap.get(user.id);

        if (!chatId) {
          // Buat Chat Baru jika belum ada
          const newChatRef = doc(collection(db, 'chats'));
          batch.set(newChatRef, {
            type: 'direct',
            participants: [currentUser.id, user.id],
            name: user.name,
            avatar: user.avatar,
            lastMessage: message,
            lastMessageType: 'text',
            unreadCounts: { [user.id]: 1, [currentUser.id]: 0 },
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            typing: {}
          });
          chatId = newChatRef.id;
          opCount++;
        } else {
            // Update Chat Lama
            const chatRef = doc(db, 'chats', chatId);
            batch.update(chatRef, {
               lastMessage: message,
               lastMessageType: 'text',
               updatedAt: serverTimestamp(),
               [`unreadCounts.${user.id}`]: 1 
            });
            opCount++;
        }

        // Tambahkan Pesan ke Sub-collection
        const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
        batch.set(messageRef, {
           senderId: currentUser.id,
           content: message,
           type: 'text',
           status: 'sent',
           readBy: [],
           createdAt: serverTimestamp()
        });
        opCount++;
        sentCount++;

        // Commit jika batch penuh
        if (opCount >= batchLimit) {
           await batch.commit();
           batch = writeBatch(db);
           opCount = 0;
        }
      }

      // Commit sisa batch
      if (opCount > 0) await batch.commit();

      setStatus(t.broadcast.success.replace('{count}', sentCount.toString()));
      setMessage('');

    } catch (error: any) {
      console.error(error);
      setStatus("Gagal mengirim siaran: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!currentUser?.isAdmin) return null;

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title={t.broadcast.title} onBack={onBack} />
      <div className="p-6">
         <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio size={32} />
            </div>
            <h3 className="font-bold text-denim-900 text-lg mb-2">{t.broadcast.title}</h3>
            <p className="text-sm text-denim-500">{t.broadcast.desc}</p>
         </div>
         <form onSubmit={handleBroadcast}>
            <div className="mb-4">
               <label className="block text-xs font-bold text-denim-500 uppercase mb-2">{t.broadcast.messageLabel}</label>
               <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full p-4 rounded-xl border border-cream-300 focus:ring-1 focus:ring-denim-500 focus:outline-none min-h-[150px] text-sm" placeholder={t.broadcast.placeholder} required />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-6 flex gap-3">
               <AlertTriangle className="text-yellow-600 shrink-0" size={20} />
               <p className="text-xs text-yellow-700">{t.broadcast.warning}</p>
            </div>
            <button type="submit" disabled={isSending || !message} className="w-full py-3 bg-denim-600 hover:bg-denim-700 disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
               {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} className="rtl:rotate-180" />}
               {isSending ? t.broadcast.sending : t.broadcast.send}
            </button>
         </form>
         {status && (
            <div className={`mt-6 p-4 rounded-xl text-center text-sm font-bold ${status.includes('Gagal') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
               {status}
            </div>
         )}
      </div>
    </div>
  );
};

export const GroupsView: React.FC<SidebarViewProps> = ({ onBack, onOpenGroupChat, appSettings }) => {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<ChatPreview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ChatPreview | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentGroupMembers, setCurrentGroupMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ isOpen: false, type: 'kick_member', title: '', message: '' });
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const t = translations[appSettings!.language];

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'chats'), where('type', '==', 'group'), where('participants', 'array-contains', currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatPreview));
      setGroups(fetchedGroups); setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchContacts = async () => {
      const snap = await getDocs(collection(db, 'users', currentUser.id, 'contacts'));
      setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)));
    };
    fetchContacts();
  }, [currentUser]);

  const fetchGroupMembers = async (participantIds: string[]) => {
    setLoadingMembers(true);
    try {
      const membersData: User[] = [];
      for (const uid of participantIds) {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) membersData.push({ id: userSnap.id, ...userSnap.data() } as User);
      }
      setCurrentGroupMembers(membersData);
    } catch (error) { console.error("Error fetching members:", error); } finally { setLoadingMembers(false); }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]; setGroupAvatar(file); setGroupAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentUser) return; setIsSubmitting(true);
    
    try {
      // 1. Prepare Group Data
      let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=154c79&color=fff&size=256`;
      if (groupAvatar) {
        const url = await uploadImageToCloudinary(groupAvatar);
        avatarUrl = `${url}?t=${Date.now()}`;
      }
      
      const memberUids = Array.from(selectedMemberIds); 
      if (!memberUids.includes(currentUser.id)) memberUids.push(currentUser.id);

      // 2. Create Group Doc
      const newGroupRef = doc(collection(db, 'chats'));
      const batch = writeBatch(db);

      batch.set(newGroupRef, { 
        type: 'group', 
        name: groupName, 
        description: groupDesc, 
        avatar: avatarUrl, 
        participants: memberUids, 
        adminIds: [currentUser.id], 
        lastMessage: 'Grup dibuat', 
        lastMessageType: 'text', 
        unreadCount: 0, 
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
      });

      await batch.commit();

      setShowCreateModal(false); setGroupName(''); setGroupDesc(''); setGroupAvatar(null); setGroupAvatarPreview(null); setSelectedMemberIds(new Set());
    } catch (error: any) { 
      console.error(error);
      alert("Gagal membuat grup: " + error.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedGroup || !currentUser) return; setIsSubmitting(true);
    
    try {
      let avatarUrl = selectedGroup.avatar; 
      if (groupAvatar) {
        const url = await uploadImageToCloudinary(groupAvatar);
        // Add timestamp to force update everywhere
        avatarUrl = `${url}?t=${Date.now()}`;
      }

      const memberUidsToAdd = Array.from(selectedMemberIds); 
      const groupRef = doc(db, 'chats', selectedGroup.id);
      
      const updateData: any = { name: groupName, description: groupDesc, avatar: avatarUrl, updatedAt: serverTimestamp() };
      if (memberUidsToAdd.length > 0) updateData.participants = arrayUnion(...memberUidsToAdd);
      
      const batch = writeBatch(db);
      batch.update(groupRef, updateData);

      await batch.commit();
      setShowEditModal(false); setGroupAvatar(null); setGroupAvatarPreview(null); setSelectedMemberIds(new Set());
    } catch (error: any) { 
      console.error(error);
      alert("Gagal mengupdate grup: " + error.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const triggerKickMember = (memberId: string, memberName: string) => { setConfirmDialog({ isOpen: true, type: 'kick_member', title: t.groups.confirmKick, message: t.groups.confirmKickMsg.replace('{name}', memberName), data: { memberId } }); };
  const triggerLeaveOrDeleteGroup = () => { if (!selectedGroup || !currentUser) return; const isAdmin = selectedGroup.adminIds?.includes(currentUser.id); if (isAdmin) { setConfirmDialog({ isOpen: true, type: 'delete_group', title: t.groups.confirmDelete, message: t.groups.confirmDeleteMsg, data: { groupId: selectedGroup.id } }); } else { setConfirmDialog({ isOpen: true, type: 'leave_group', title: t.groups.confirmLeave, message: t.groups.confirmLeaveMsg, data: { groupId: selectedGroup.id } }); } };
  const triggerBatchDelete = () => { if (selectedGroupIds.size === 0) return; setConfirmDialog({ isOpen: true, type: 'batch_delete', title: t.contacts.deleteSelected, message: `Hapus ${selectedGroupIds.size}?` }); };

  const executeConfirmAction = async () => {
    if (!currentUser) return; setIsProcessingAction(true);
    try {
      const { type, data } = confirmDialog;
      if (type === 'kick_member' && selectedGroup) { await updateDoc(doc(db, 'chats', selectedGroup.id), { participants: arrayRemove(data.memberId) }); setCurrentGroupMembers(prev => prev.filter(m => m.id !== data.memberId)); } 
      else if (type === 'delete_group') { await deleteDoc(doc(db, 'chats', data.groupId)); setShowEditModal(false); } 
      else if (type === 'leave_group') { await updateDoc(doc(db, 'chats', data.groupId), { participants: arrayRemove(currentUser.id) }); setShowEditModal(false); } 
      else if (type === 'batch_delete') { const batch = writeBatch(db); selectedGroupIds.forEach(groupId => { const group = groups.find(g => g.id === groupId); if (!group) return; const groupRef = doc(db, 'chats', groupId); if (group.adminIds?.includes(currentUser.id)) batch.delete(groupRef); else batch.update(groupRef, { participants: arrayRemove(currentUser.id) }); }); await batch.commit(); setIsSelectionMode(false); setSelectedGroupIds(new Set()); }
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } catch (error: any) { alert("Terjadi kesalahan: " + error.message); } finally { setIsProcessingAction(false); }
  };

  const openEditModal = (group: ChatPreview) => { setSelectedGroup(group); setGroupName(group.name); setGroupDesc(group.description || ''); setGroupAvatarPreview(group.avatar); fetchGroupMembers(group.participants); setShowEditModal(true); };
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={isSelectionMode ? `${selectedGroupIds.size} ${t.chatList.selectChat}` : t.groups.title} onBack={isSelectionMode ? () => setIsSelectionMode(false) : onBack} rightAction={isSelectionMode ? (<button onClick={triggerBatchDelete} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={18} /></button>) : (<button onClick={() => setIsSelectionMode(true)} className="text-denim-600 text-sm font-medium">{t.contacts.select}</button>)} />
      <div className="p-2 bg-cream-100 sticky top-[60px] z-10"><div className="relative"><Search className="absolute start-3 top-1/2 -translate-y-1/2 text-denim-400" size={18} /><input type="text" placeholder={t.groups.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-cream-200 ps-10 pe-4 py-2.5 rounded-xl text-sm focus:outline-none text-denim-900 shadow-sm" /></div></div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-20">
        {loading ? (<div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div>) : filteredGroups.length === 0 ? (<div className="text-center p-8 text-denim-400 text-sm">{t.groups.noGroups}</div>) : (filteredGroups.map(group => { const isAdmin = group.adminIds?.includes(currentUser?.id || ''); return (<div key={group.id} onClick={() => { if (isSelectionMode) { const newSet = new Set(selectedGroupIds); if (newSet.has(group.id)) newSet.delete(group.id); else newSet.add(group.id); setSelectedGroupIds(newSet); } else if (onOpenGroupChat) { onOpenGroupChat(group); } }} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors group relative ${isSelectionMode && selectedGroupIds.has(group.id) ? 'bg-denim-100 border border-denim-200' : 'hover:bg-cream-200 border border-transparent'}`}>{isSelectionMode && (<div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${selectedGroupIds.has(group.id) ? 'bg-denim-600 border-denim-600' : 'bg-white border-denim-300'}`}>{selectedGroupIds.has(group.id) && <CheckSquare size={14} className="text-white" />}</div>)}<img src={group.avatar} alt={group.name} className="w-12 h-12 rounded-full object-cover bg-denim-200" /><div className="flex-1 min-w-0"><h3 className="text-denim-900 font-semibold text-[15px] truncate">{group.name}</h3><p className="text-xs text-denim-500 font-medium truncate">{group.participants.length} {t.groups.members}</p></div>{!isSelectionMode && isAdmin && (<button onClick={(e) => { e.stopPropagation(); openEditModal(group); }} className="p-2 text-denim-400 hover:text-denim-600 hover:bg-cream-300 rounded-full"><Settings size={18} /></button>)}</div>); }))}
      </div>
      {!isSelectionMode && (<button onClick={() => { setGroupName(''); setGroupDesc(''); setGroupAvatar(null); setGroupAvatarPreview(null); setSelectedMemberIds(new Set()); setShowCreateModal(true); }} className="absolute bottom-6 right-6 rtl:left-6 rtl:right-auto w-14 h-14 bg-denim-600 hover:bg-denim-700 text-white rounded-full shadow-xl shadow-denim-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20"><Plus size={28} /></button>)}
      {(showCreateModal || showEditModal) && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md h-[90%] sm:h-auto sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-4 py-3 border-b border-cream-200 flex justify-between items-center bg-cream-50 shrink-0"><h3 className="font-bold text-denim-900">{showEditModal ? t.groups.editGroup : t.groups.newGroup}</h3><button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-1 hover:bg-cream-200 rounded-full"><X size={20} className="text-denim-500" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <form id="groupForm" onSubmit={showEditModal ? handleEditGroup : handleCreateGroup} className="space-y-4">
                 <div className="flex justify-center"><div className="relative w-20 h-20 rounded-full bg-cream-100 border-2 border-dashed border-denim-300 flex items-center justify-center cursor-pointer hover:bg-cream-200 overflow-hidden group" onClick={() => document.getElementById('groupAvatarInput')?.click()}>{groupAvatarPreview ? (<img src={groupAvatarPreview} alt="Preview" className="w-full h-full object-cover" />) : (<Camera size={24} className="text-denim-400" />)}<div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={20} className="text-white" /></div></div><input id="groupAvatarInput" type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} /></div>
                 <div><label className="text-xs font-bold text-denim-500 uppercase">{t.groups.groupName}</label><input type="text" required value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-cream-300 bg-cream-50 focus:ring-1 focus:ring-denim-500 focus:outline-none" /></div>
                 <div><label className="text-xs font-bold text-denim-500 uppercase">{t.groups.desc}</label><textarea value={groupDesc} onChange={e => setGroupDesc(e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-cream-300 bg-cream-50 focus:ring-1 focus:ring-denim-500 focus:outline-none h-20 resize-none" /></div>
                 {showEditModal && currentUser && (<div className="bg-cream-50 rounded-lg p-3 border border-cream-200"><label className="text-xs font-bold text-denim-500 uppercase mb-2 block">{t.groups.members} ({currentGroupMembers.length})</label><div className="max-h-32 overflow-y-auto space-y-1 pe-1">{loadingMembers ? (<div className="text-center p-2"><Loader2 className="animate-spin w-4 h-4 mx-auto text-denim-400"/></div>) : (currentGroupMembers.map(member => (<div key={member.id} className="flex items-center justify-between p-2 rounded bg-white border border-cream-100"><div className="flex items-center gap-2"><img src={member.avatar} className="w-6 h-6 rounded-full" /><span className="text-sm text-denim-900 truncate max-w-[120px]">{member.name}</span>{selectedGroup?.adminIds?.includes(member.id) && <span className="text-[10px] bg-denim-100 text-denim-600 px-1 rounded">Admin</span>}</div>{selectedGroup?.adminIds?.includes(currentUser.id) && member.id !== currentUser.id && (<button type="button" onClick={() => triggerKickMember(member.id, member.name)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded" title="Hapus Anggota"><Trash2 size={14} /></button>)}</div>)))}</div></div>)}
                 <div><label className="text-xs font-bold text-denim-500 uppercase mb-2 block">{showEditModal ? t.groups.addMembers : t.contacts.select}</label><div className="max-h-40 overflow-y-auto border border-cream-200 rounded-lg bg-cream-50 p-1 space-y-1">{contacts.length === 0 && <p className="text-xs text-denim-400 p-2 text-center">Belum ada kontak.</p>}{contacts.map(contact => { if (showEditModal && currentGroupMembers.some(m => m.id === contact.uid)) return null; return (<div key={contact.uid} onClick={() => { const newSet = new Set(selectedMemberIds); if (newSet.has(contact.uid)) newSet.delete(contact.uid); else newSet.add(contact.uid); setSelectedMemberIds(newSet); }} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selectedMemberIds.has(contact.uid) ? 'bg-denim-100' : 'hover:bg-white'}`}><div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedMemberIds.has(contact.uid) ? 'bg-denim-600 border-denim-600' : 'bg-white border-denim-300'}`}>{selectedMemberIds.has(contact.uid) && <CheckSquare size={10} className="text-white" />}</div><img src={contact.avatar} className="w-6 h-6 rounded-full" /><span className="text-sm text-denim-800">{contact.savedName}</span></div>); })}</div></div>
              </form>
            </div>
            <div className="p-4 border-t border-cream-200 bg-cream-50 flex flex-col gap-2 shrink-0"><button form="groupForm" type="submit" disabled={isSubmitting} className="w-full bg-denim-700 hover:bg-denim-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-denim-700/20 flex items-center justify-center gap-2">{isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}{showEditModal ? t.groups.saveChanges : t.groups.create}</button>{showEditModal && selectedGroup && (<button type="button" onClick={triggerLeaveOrDeleteGroup} className="w-full bg-red-50 hover:bg-red-100 text-red-500 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-red-200">{selectedGroup.adminIds?.includes(currentUser?.id || '') ? (<><Trash2 size={18} /> {t.groups.deleteGroup}</>) : (<><UserMinus size={18} /> {t.groups.leaveGroup}</>)}</button>)}</div>
          </div>
        </div>
      )}
      {confirmDialog.isOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-cream-200 relative"><div className="flex flex-col items-center text-center"><div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500"><AlertTriangle size={28} /></div><h3 className="text-lg font-bold text-denim-900 mb-2">{confirmDialog.title}</h3><p className="text-denim-500 text-sm mb-6 leading-relaxed">{confirmDialog.message}</p><div className="flex gap-3 w-full"><button onClick={() => setConfirmDialog(prev => ({...prev, isOpen: false}))} disabled={isProcessingAction} className="flex-1 px-4 py-2.5 bg-cream-100 hover:bg-cream-200 text-denim-700 font-medium rounded-xl transition-colors">{t.common.cancel}</button><button onClick={executeConfirmAction} disabled={isProcessingAction} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2">{isProcessingAction && <Loader2 size={16} className="animate-spin" />}Ya</button></div></div></div></div>)}
    </div>
  );
};

export const ContactsView: React.FC<SidebarViewProps> = ({ onBack, onStartChat, appSettings }) => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const t = translations[appSettings!.language];

  useEffect(() => {
    if (!currentUser) return;
    let unsubscribe: () => void;
    if (currentUser.isAdmin) {
       const usersRef = collection(db, 'users');
       unsubscribe = onSnapshot(usersRef, (snapshot) => {
         const fetchedContacts = snapshot.docs.map(doc => { const data = doc.data() as User; return { id: doc.id, uid: doc.id, savedName: data.name, phoneNumber: data.phoneNumber || '', avatar: data.avatar } as Contact; }).filter(c => c.uid !== currentUser.id);
         fetchedContacts.sort((a, b) => a.savedName.localeCompare(b.savedName)); setContacts(fetchedContacts); setLoading(false);
       });
    } else {
       const contactsRef = collection(db, 'users', currentUser.id, 'contacts');
       unsubscribe = onSnapshot(contactsRef, (snapshot) => {
         const fetchedContacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
         fetchedContacts.sort((a, b) => a.savedName.localeCompare(b.savedName)); setContacts(fetchedContacts); setLoading(false);
       });
    }
    return () => unsubscribe();
  }, [currentUser]);

  const filteredContacts = contacts.filter(c => c.savedName.toLowerCase().includes(searchTerm.toLowerCase()) || c.phoneNumber.includes(searchTerm));
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault(); setAddLoading(true); setAddError('');
    try {
      if (addPhone === currentUser?.phoneNumber) throw new Error("Anda tidak bisa menambahkan nomor sendiri.");
      const usersRef = collection(db, 'users'); const q = query(usersRef, where('phoneNumber', '==', addPhone)); const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) throw new Error("Nomor belum terdaftar di Hud-Hud.");
      const targetUid = querySnapshot.docs[0].id; const targetUser = querySnapshot.docs[0].data();
      const exists = contacts.some(c => c.phoneNumber === addPhone); if (exists) throw new Error("Kontak sudah ada.");
      if (currentUser) { await addDoc(collection(db, 'users', currentUser.id, 'contacts'), { uid: targetUid, savedName: addName, phoneNumber: addPhone, avatar: targetUser.avatar || '' }); }
      setShowAddModal(false); setAddName(''); setAddPhone('');
    } catch (err: any) { setAddError(err.message); } finally { setAddLoading(false); }
  };
  const toggleSelectionMode = () => { setIsSelectionMode(!isSelectionMode); setSelectedContactIds(new Set()); };
  const handleSelectContact = (id: string) => { const newSet = new Set(selectedContactIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedContactIds(newSet); };
  const handleDeleteSelected = async () => {
    if (selectedContactIds.size === 0 || !currentUser) return;
    if (currentUser.isAdmin) { alert("Admin melihat database user global. Tidak bisa dihapus dari sini."); return; }
    if (window.confirm(`Hapus ${selectedContactIds.size} kontak terpilih?`)) { try { const batch = writeBatch(db); selectedContactIds.forEach(id => { const docRef = doc(db, 'users', currentUser.id, 'contacts', id); batch.delete(docRef); }); await batch.commit(); setIsSelectionMode(false); setSelectedContactIds(new Set()); } catch (error) { alert("Gagal menghapus kontak."); } }
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={isSelectionMode ? `${selectedContactIds.size} ${t.chatList.selectChat}` : t.contacts.title} onBack={isSelectionMode ? toggleSelectionMode : onBack} rightAction={!isSelectionMode ? (<button onClick={toggleSelectionMode} className="text-denim-600 text-sm font-medium hover:underline">{t.contacts.select}</button>) : (<button onClick={handleDeleteSelected} disabled={selectedContactIds.size === 0} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg disabled:opacity-50"><Trash2 size={18} /></button>)} />
      <div className="p-2 bg-cream-100 sticky top-[60px] z-10"><div className="relative"><Search className="absolute start-3 top-1/2 -translate-y-1/2 text-denim-400" size={18} /><input type="text" placeholder={t.contacts.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-cream-200 ps-10 pe-4 py-2.5 rounded-xl text-sm focus:outline-none text-denim-900 placeholder-denim-300 focus:ring-1 focus:ring-denim-300 shadow-sm"/></div></div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-20">
        {loading ? (<div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400"/></div>) : filteredContacts.length === 0 ? (<div className="text-center p-8 text-denim-400 text-sm">{searchTerm ? t.chatList.contactNotFound : t.groups.noGroups}</div>) : (<div className="space-y-1">{filteredContacts.map((contact) => (<div key={contact.id} onClick={() => isSelectionMode ? handleSelectContact(contact.id) : onStartChat && onStartChat(contact.uid)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors group ${isSelectionMode && selectedContactIds.has(contact.id) ? 'bg-denim-100 border border-denim-200' : 'hover:bg-cream-200 border border-transparent'}`}>{isSelectionMode && (<div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${selectedContactIds.has(contact.id) ? 'bg-denim-600 border-denim-600' : 'border-denim-300 bg-white'}`}>{selectedContactIds.has(contact.id) && <CheckSquare size={14} className="text-white" />}</div>)}<div className="relative shrink-0"><img src={contact.avatar} alt={contact.savedName} className="w-10 h-10 rounded-full object-cover bg-denim-200" /></div><div className="flex-1 min-w-0"><h3 className="text-denim-900 font-semibold text-[15px] truncate">{contact.savedName}</h3><p className="text-xs text-denim-500 font-medium truncate">{contact.phoneNumber}</p></div></div>))}</div>)}
      </div>
      {!isSelectionMode && !currentUser?.isAdmin && (<button onClick={() => setShowAddModal(true)} className="absolute bottom-6 right-6 rtl:left-6 rtl:right-auto w-14 h-14 bg-denim-600 hover:bg-denim-700 text-white rounded-full shadow-xl shadow-denim-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20"><UserPlus size={24} /></button>)}
      {showAddModal && (<div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative"><button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rtl:left-4 rtl:right-auto"><X size={20} /></button><h3 className="text-lg font-bold text-denim-900 mb-4">{t.contacts.newContact}</h3>{addError && (<div className="mb-4 p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{addError}</div>)}<form onSubmit={handleAddContact} className="space-y-4"><div><label className="block text-xs font-bold text-denim-500 uppercase mb-1">{t.profile.name}</label><input type="text" required value={addName} onChange={(e) => setAddName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500 text-sm" placeholder="Misal: Budi Kantor"/></div><div><label className="block text-xs font-bold text-denim-500 uppercase mb-1">{t.profile.phone}</label><input type="number" required value={addPhone} onChange={(e) => setAddPhone(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500 text-sm" placeholder="08..."/></div><button type="submit" disabled={addLoading} className="w-full bg-denim-600 hover:bg-denim-700 text-white font-medium py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2">{addLoading ? <Loader2 size={18} className="animate-spin"/> : t.contacts.saveContact}</button></form></div></div>)}
    </div>
  );
};

export const SettingsView: React.FC<SidebarViewProps> = ({ onBack, appSettings, updateAppSettings }) => {
  const { currentUser, updateUserEmail, updateUserPassword } = useAuth();
  const [subView, setSubView] = useState<'main' | 'account' | 'chat' | 'notif' | 'storage' | 'lang' | 'help'>('main');
  const t = translations[appSettings!.language];
  
  const AccountSettings = () => { 
      // State Email
      const [newEmail, setNewEmail] = useState(''); 
      const [currPassEmail, setCurrPassEmail] = useState(''); // Untuk Re-auth

      // State Password
      const [currPass, setCurrPass] = useState('');
      const [newPassword, setNewPassword] = useState(''); 
      const [confirmPassword, setConfirmPassword] = useState('');

      const [loading, setLoading] = useState(false); 
      const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'error', text: string} | null>(null); 
      
      const handleUpdateEmail = async () => { 
          if (!currPassEmail) { setStatusMsg({type: 'error', text: "Masukkan password saat ini untuk verifikasi."}); return; }
          setLoading(true); setStatusMsg(null); 
          try { 
              await updateUserEmail(newEmail, currPassEmail); 
              setStatusMsg({type: 'success', text: "Perubahan telah berhasil"}); 
              setNewEmail(''); setCurrPassEmail('');
          } catch (e: any) { 
              const msg = e?.message || 'Error';
              setStatusMsg({type: 'error', text: String(msg)}); 
          } finally { setLoading(false); } 
      }; 

      const handleUpdatePassword = async () => { 
          if (!currPass) { setStatusMsg({type: 'error', text: "Masukkan password saat ini untuk verifikasi."}); return; }
          if (newPassword !== confirmPassword) { setStatusMsg({type: 'error', text: "Konfirmasi password tidak cocok."}); return; }
          setLoading(true); setStatusMsg(null); 
          try { 
              await updateUserPassword(newPassword, currPass); 
              setStatusMsg({type: 'success', text: "Perubahan telah berhasil"}); 
              setCurrPass(''); setNewPassword(''); setConfirmPassword('');
          } catch (e: any) { 
              const msg = e?.message || 'Error';
              setStatusMsg({type: 'error', text: String(msg)}); 
          } finally { setLoading(false); } 
      }; 

      return (
        <div className="h-full flex flex-col animate-in slide-in-from-right-4">
          <ViewHeader title={t.settings.account.title} onBack={() => setSubView('main')} />
          <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar">
            {statusMsg && (
              <div className={`p-3 rounded-lg text-sm font-bold border ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {statusMsg.text}
              </div>
            )}
            
            {/* GANTI EMAIL */}
            <div className="bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
              <h3 className="font-bold text-denim-900 mb-4 flex items-center gap-2">
                <Mail size={16}/> {t.settings.account.changeEmail}
              </h3>
              <p className="text-xs text-denim-500 mb-2">{t.settings.account.currEmail}: <span className="font-medium text-denim-900">{currentUser?.email}</span></p>
              
              <div className="space-y-3">
                 <input 
                   type="email" 
                   placeholder={t.settings.account.newEmail} 
                   value={newEmail} 
                   onChange={e => setNewEmail(e.target.value)} 
                   className="w-full border p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 bg-cream-50"
                 />
                 <div className="relative">
                   <input 
                     type="password" 
                     placeholder="Password Saat Ini (Wajib)" 
                     value={currPassEmail} 
                     onChange={e => setCurrPassEmail(e.target.value)} 
                     className="w-full border p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 bg-cream-50 pr-8"
                   />
                   <Lock size={14} className="absolute right-3 top-3 text-denim-400" />
                 </div>
                 <button 
                   onClick={handleUpdateEmail} 
                   disabled={loading || !newEmail || !currPassEmail} 
                   className="bg-denim-600 hover:bg-denim-700 text-white px-4 py-2.5 rounded-lg text-sm w-full font-medium transition-colors disabled:opacity-50"
                 >
                   {loading ? t.common.processing : t.settings.account.saveEmail}
                 </button>
              </div>
            </div>
            
            {/* GANTI PASSWORD */}
            <div className="bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
              <h3 className="font-bold text-denim-900 mb-4 flex items-center gap-2">
                <Key size={16}/> {t.settings.account.changePass}
              </h3>
              <div className="space-y-3">
                <div className="relative">
                  <input 
                     type="password" 
                     placeholder="Password Saat Ini" 
                     value={currPass} 
                     onChange={e => setCurrPass(e.target.value)} 
                     className="w-full border p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 bg-cream-50 pr-8"
                   />
                   <Lock size={14} className="absolute right-3 top-3 text-denim-400" />
                </div>
                <div className="border-t border-cream-100 my-2"></div>
                <input 
                   type="password" 
                   placeholder={t.settings.account.newPass} 
                   value={newPassword} 
                   onChange={e => setNewPassword(e.target.value)} 
                   className="w-full border p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 bg-cream-50"
                 />
                 <input 
                   type="password" 
                   placeholder="Konfirmasi Password Baru" 
                   value={confirmPassword} 
                   onChange={e => setConfirmPassword(e.target.value)} 
                   className="w-full border p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 bg-cream-50"
                 />
                 <button 
                   onClick={handleUpdatePassword} 
                   disabled={loading || !newPassword || !currPass || !confirmPassword} 
                   className="bg-denim-600 hover:bg-denim-700 text-white px-4 py-2.5 rounded-lg text-sm w-full font-medium transition-colors disabled:opacity-50"
                 >
                   {loading ? t.common.processing : t.settings.account.savePass}
                 </button>
              </div>
            </div>
          </div>
        </div>
      ); 
  };
  if (subView === 'account') return <AccountSettings />;
  if (subView === 'chat') { const colors = ['#fdfbf7', '#e0f0fe', '#ffedd5', '#dcfce7', '#f3e8ff', '#fee2e2']; return (<div className="h-full flex flex-col animate-in slide-in-from-right-4"><ViewHeader title={t.settings.chat.title} onBack={() => setSubView('main')} /><div className="p-4 space-y-6"><div className="bg-white p-4 rounded-xl border border-cream-200"><h3 className="font-bold text-denim-900 mb-4 flex items-center gap-2"><Palette size={16}/> {t.settings.chat.wallpaper}</h3><div className="grid grid-cols-4 gap-2"><button onClick={() => updateAppSettings?.({ wallpaper: 'default' })} className={`h-10 rounded-lg border flex items-center justify-center text-xs font-bold ${appSettings?.wallpaper === 'default' ? 'ring-2 ring-denim-500' : ''}`} style={{backgroundImage: 'radial-gradient(#ddd 1px, transparent 1px)', backgroundSize: '4px 4px'}}>{t.settings.chat.default}</button>{colors.map(c => (<button key={c} onClick={() => updateAppSettings?.({ wallpaper: c })} className={`h-10 rounded-lg border ${appSettings?.wallpaper === c ? 'ring-2 ring-denim-500' : ''}`} style={{backgroundColor: c}}></button>))}</div></div><div className="bg-white p-4 rounded-xl border border-cream-200"><h3 className="font-bold text-denim-900 mb-4 flex items-center gap-2"><Type size={16}/> {t.settings.chat.fontSize}</h3><div className="flex justify-between text-xs text-denim-500 mb-2"><span>{t.settings.chat.small}</span><span>{t.settings.chat.medium}</span><span>{t.settings.chat.large}</span></div><input type="range" min="0" max="2" step="1" value={appSettings?.fontSize === 'small' ? 0 : appSettings?.fontSize === 'large' ? 2 : 1} onChange={(e) => { const val = parseInt(e.target.value); updateAppSettings?.({ fontSize: val === 0 ? 'small' : val === 2 ? 'large' : 'normal' }); }} className="w-full accent-denim-600"/></div></div></div>); }
  if (subView === 'lang') { return (<div className="h-full flex flex-col animate-in slide-in-from-right-4"><ViewHeader title={t.settings.lang.title} onBack={() => setSubView('main')} /><div className="p-4 space-y-2">{[{id: 'id', label: 'Bahasa Indonesia'}, {id: 'ar', label: 'العربية (Arab)'}].map(l => (<button key={l.id} onClick={() => updateAppSettings?.({ language: l.id as 'id' | 'ar' })} className="w-full flex justify-between p-4 bg-white rounded-xl border border-cream-200 items-center"><span>{l.label}</span>{appSettings?.language === l.id && <CheckSquare size={18} className="text-denim-600" />}</button>))}</div></div>); }
  if (subView === 'help') { const HelpSettings = () => { const [hName, setHName] = useState(currentUser?.name || ''); const [hEmail, setHEmail] = useState(currentUser?.email || ''); const [hIssue, setHIssue] = useState(''); const [sent, setSent] = useState(false); const handleSendReport = (e: React.FormEvent) => { e.preventDefault(); setSent(true); setTimeout(() => { alert(t.settings.help.success); window.open(`mailto:hallo.hudhud@gmail.com?subject=Laporan Masalah dari ${hName}&body=Nama: ${hName}%0D%0AEmail: ${hEmail}%0D%0AKeluhan: ${hIssue}`); setHIssue(''); setSent(false); }, 1000); }; return (<div className="h-full flex flex-col animate-in slide-in-from-right-4"><ViewHeader title={t.settings.help.title} onBack={() => setSubView('main')} /><div className="p-4 flex-1 overflow-y-auto"><div className="bg-white p-5 rounded-xl border border-cream-200 shadow-sm"><h3 className="text-lg font-bold text-denim-900 mb-2">{t.settings.help.report}</h3><p className="text-xs text-denim-500 mb-4">{t.settings.help.desc}</p><form onSubmit={handleSendReport} className="space-y-4"><div><label className="block text-xs font-bold text-denim-600 uppercase mb-1">{t.settings.help.name}</label><input type="text" required value={hName} onChange={e => setHName(e.target.value)} className="w-full p-2.5 rounded-lg border border-cream-300 bg-cream-50 text-sm focus:outline-none focus:ring-1 focus:ring-denim-500"/></div><div><label className="block text-xs font-bold text-denim-600 uppercase mb-1">{t.settings.help.email}</label><input type="email" required value={hEmail} onChange={e => setHEmail(e.target.value)} className="w-full p-2.5 rounded-lg border border-cream-300 bg-cream-50 text-sm focus:outline-none focus:ring-1 focus:ring-denim-500"/></div><div><label className="block text-xs font-bold text-denim-600 uppercase mb-1">{t.settings.help.issue}</label><textarea required value={hIssue} onChange={e => setHIssue(e.target.value)} className="w-full p-2.5 rounded-lg border border-cream-300 bg-cream-50 text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 min-h-[120px]" placeholder={t.settings.help.placeholder}></textarea></div><button type="submit" disabled={sent} className="w-full py-3 bg-denim-700 hover:bg-denim-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-denim-700/20 flex items-center justify-center gap-2">{sent ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}{sent ? t.common.processing : t.settings.help.send}</button></form></div></div></div>); }; return <HelpSettings />; }

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200">
      <ViewHeader title={t.settings.title} onBack={onBack} />
      <div className="overflow-y-auto custom-scrollbar">
        <div className="p-4 flex flex-col items-center border-b border-cream-200 pb-6 bg-cream-50">
           <div className="w-24 h-24 rounded-full bg-denim-200 mb-3 relative overflow-hidden shadow-md">
             <img src={currentUser?.avatar} alt="Profile" className="w-full h-full object-cover" />
           </div>
           <h3 className="text-xl font-semibold text-denim-900 flex items-center gap-1">
             {currentUser?.name}
             {currentUser?.isAdmin && <CheckSquare size={18} className="text-blue-500 fill-current" />}
           </h3>
           <p className="text-denim-500 text-sm">{currentUser?.email}</p>
        </div>
        <div className="p-2 mt-2 space-y-1">
           {[ { id: 'account', icon: Key, label: t.settings.account.menuLabel, color: 'bg-purple-100 text-purple-600' }, { id: 'chat', icon: Monitor, label: t.settings.chat.menuLabel, color: 'bg-blue-100 text-blue-600' }, { id: 'lang', icon: Globe, label: t.settings.lang.menuLabel, color: 'bg-orange-100 text-orange-600' }, { id: 'help', icon: HelpCircle, label: t.settings.help.menuLabel, color: 'bg-gray-100 text-gray-600' } ].map((item) => (
             <button key={item.id} onClick={() => setSubView(item.id as any)} className="w-full flex items-center gap-4 p-3 hover:bg-cream-200 rounded-lg transition-colors group">
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}><item.icon size={18} /></div>
               <span className="flex-1 text-start text-denim-800 text-[15px] font-medium">{item.label}</span>
               <ChevronRight size={16} className="text-denim-300 group-hover:text-denim-500 rtl:rotate-180" />
             </button>
           ))}
        </div>
      </div>
    </div>
  );
};

export const renderSidebarView = (view: ViewState, onBack: () => void, onStartChat?: (contactUid: string) => void, onOpenGroupChat?: (chat: ChatPreview) => void, appSettings?: AppSettings, updateAppSettings?: (settings: Partial<AppSettings>) => void) => {
  switch (view) {
    case 'groups': return <GroupsView onBack={onBack} onOpenGroupChat={onOpenGroupChat} appSettings={appSettings} />;
    case 'contacts': return <ContactsView onBack={onBack} onStartChat={onStartChat} appSettings={appSettings} />;
    case 'settings': return <SettingsView onBack={onBack} appSettings={appSettings} updateAppSettings={updateAppSettings} />;
    case 'help': return <SettingsView onBack={onBack} appSettings={appSettings} updateAppSettings={updateAppSettings} />; 
    case 'profile': return <ProfileView onBack={onBack} appSettings={appSettings} />;
    case 'broadcast': return <BroadcastView onBack={onBack} appSettings={appSettings} />;
    default: return null;
  }
};
