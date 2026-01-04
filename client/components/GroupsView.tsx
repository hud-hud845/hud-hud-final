
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Search, CheckSquare, MoreVertical, Settings, Users, Plus, 
  X, Camera, Loader2, UserMinus as UserMinusIcon 
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDoc, doc, updateDoc, writeBatch, serverTimestamp, addDoc, arrayRemove } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { db, rtdb } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { uploadMedia } from '../services/storageService'; // MENGGUNAKAN SERVICE BARU
import { translations } from '../utils/translations';
import { AppSettings } from './Layout';
import { ChatPreview, Contact } from '../types';

interface GroupsViewProps {
  onBack: () => void;
  onOpenGroupChat?: (chat: ChatPreview) => void;
  appSettings?: AppSettings;
  contactsMap?: Record<string, Contact>;
}

export const GroupsView: React.FC<GroupsViewProps> = ({ onBack, onOpenGroupChat, appSettings, contactsMap }) => {
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
  const [uploadProgress, setUploadProgress] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[appSettings?.language || 'id'];

  const [membersInfoCache, setMembersInfoCache] = useState<Record<string, {name: string, avatar: string}>>({});

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const q = query(collection(db, 'chats'), where('type', '==', 'group'), where('participants', 'array-contains', currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatPreview)).sort((a,b) => b.updatedAt?.seconds - a.updatedAt?.seconds));
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

  const resetForm = () => { setGroupName(''); setGroupDesc(''); setGroupImage(null); setGroupImagePreview(null); setSelectedMembers([]); setIsEditing(false); setEditGroupId(null); setUploadProgress(''); };
  
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
      
      // FAILOVER UPLOAD UNTUK GROUP AVATAR
      if (groupImage) {
        avatarUrl = await uploadMedia(groupImage, 'profile', (p) => setUploadProgress(p));
      }
      
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
    } catch (e) { alert("Gagal menyimpan grup."); } finally { setProcessing(false); setUploadProgress(''); }
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
                {isSelectionMode && ( <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-denim-600 border-denim-600' : 'border-denim-300 bg-white'}`}>{isSelected && <CheckSquare size={14} className="text-white" />}</div> )}
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
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-cream-200 rounded-full"><X size={20} className="text-denim-50"/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white">
              <div className="flex justify-center mb-4 text-center">
                <div className="relative group cursor-pointer inline-block" onClick={() => fileInputRef.current?.click()}>
                  <img src={groupImagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName || 'G')}&background=random`} className="w-20 h-20 rounded-full object-cover border-4 border-cream-100 shadow-md bg-denim-100" />
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageInput} accept="image/*" className="hidden" />
                </div>
                {uploadProgress && <p className="text-[10px] text-denim-500 font-bold mt-2 animate-pulse">{uploadProgress}</p>}
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
              </div>
            </div>
            <div className="p-4 border-t border-cream-200 bg-white shrink-0 pb-safe">
              <button onClick={handleSubmit} disabled={processing || !groupName.trim()} className="w-full py-3 bg-denim-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-sm">
                {processing && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? 'Simpan' : t.groups.create}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"><h3 className="text-lg font-bold text-denim-900 mb-2">Konfirmasi Aksi</h3><p className="text-sm text-denim-500 mb-6">Aksi ini akan menghapus/mengeluarkan Anda dari grup terpilih.</p><div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} disabled={processing} className="flex-1 py-2.5 bg-cream-100 text-denim-700 rounded-xl font-bold text-sm">Batal</button><button onClick={executeGroupDelete} disabled={processing} className="flex-1 py-2.5 bg-red-50 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2">{processing && <Loader2 size={16} className="animate-spin"/>} Ya, Proses</button></div></div></div>)}
    </div>
  );
};
