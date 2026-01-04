
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Search, CheckSquare, MoreVertical, Settings, Users, Plus, 
  X, Camera, Loader2, UserMinus as UserMinusIcon, Trash2, LogOut, ShieldAlert,
  LayoutGrid, List, ChevronDown, CheckCircle2
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDoc, doc, updateDoc, writeBatch, serverTimestamp, addDoc, arrayRemove, deleteDoc } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { db, rtdb } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { uploadMedia } from '../services/storageService';
import { translations } from '../utils/translations';
import { AppSettings } from './Layout';
import { ChatPreview, Contact } from '../types';

interface GroupsViewProps {
  onBack: () => void;
  onOpenGroupChat?: (chat: ChatPreview) => void;
  appSettings?: AppSettings;
  contactsMap?: Record<string, Contact>;
}

type ViewMode = 'list' | 'grid';

export const GroupsView: React.FC<GroupsViewProps> = ({ onBack, onOpenGroupChat, appSettings, contactsMap }) => {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('hudhud_group_view') as ViewMode) || 'list');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  
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
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatPreview)).sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('hudhud_group_view', viewMode);
  }, [viewMode]);

  // Fetch info tambahan untuk anggota yang bukan kontak (untuk modal edit)
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
  }, [showModal, isEditing, editGroupId, groups, currentUser, contactsMap]);

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
    // Filter out current user from selected members list (handled automatically in finalParticipants)
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
      
      if (groupImage) {
        avatarUrl = await uploadMedia(groupImage, 'profile', (p) => setUploadProgress(p));
      }
      
      const finalParticipants = Array.from(new Set([...selectedMembers, currentUser.id]));
      
      if (isEditing && editGroupId) {
          const oldGroup = groups.find(g => g.id === editGroupId);
          const kickedUids = (oldGroup?.participants || []).filter(p => !finalParticipants.includes(p));
          const addedUids = finalParticipants.filter(p => !(oldGroup?.participants || []).includes(p));

          await updateDoc(doc(db, 'chats', editGroupId), { 
            name: groupName, 
            description: groupDesc, 
            avatar: avatarUrl, 
            participants: finalParticipants, 
            updatedAt: serverTimestamp() 
          });
          
          const logRef = push(ref(rtdb, `messages/${editGroupId}`));
          if (addedUids.length > 0) await set(logRef, { senderId: 'system', content: `Admin menambahkan anggota baru`, type: 'text', status: 'read', createdAt: Date.now() });
          if (kickedUids.length > 0) await set(logRef, { senderId: 'system', content: `Admin mengeluarkan anggota`, type: 'text', status: 'read', createdAt: Date.now() });
      } else {
        await addDoc(collection(db, 'chats'), { 
          type: 'group', 
          name: groupName, 
          description: groupDesc, 
          avatar: avatarUrl, 
          participants: finalParticipants, 
          adminIds: [currentUser.id], 
          lastMessage: 'Grup baru dibuat', 
          lastMessageType: 'text', 
          unreadCounts: {}, 
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp(), 
          typing: {} 
        });
      }
      setShowModal(false); resetForm();
    } catch (e) { alert("Gagal menyimpan grup."); } finally { setProcessing(false); setUploadProgress(''); }
  };

  const handleSelectGroup = (id: string) => { const newSet = new Set(selectedGroupIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedGroupIds(newSet); };
  
  const executeGroupDelete = async () => {
    if (selectedGroupIds.size === 0 || !currentUser) return;
    setProcessing(true);
    try {
      for (const id of Array.from(selectedGroupIds)) {
        const group = groups.find(g => g.id === id);
        if (group) {
          const chatRef = doc(db, 'chats', id);
          if (group.adminIds?.includes(currentUser.id)) { 
            await deleteDoc(chatRef);
          } else { 
            await updateDoc(chatRef, { participants: arrayRemove(currentUser.id) }); 
          }
        }
      }
      setIsSelectionMode(false); 
      setSelectedGroupIds(new Set()); 
      setShowDeleteConfirm(false);
    } catch (e) { 
      console.error(e);
      alert("Gagal memproses penghapusan."); 
    } finally { 
      setProcessing(false); 
    }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const hasOwnedGroup = Array.from(selectedGroupIds).some(id => {
    const g = groups.find(group => group.id === id);
    return g?.adminIds?.includes(currentUser?.id || '');
  });

  const renderMemberManagement = () => {
    const group = isEditing ? groups.find(g => g.id === editGroupId) : null;
    const currentParticipantUids = group?.participants.filter(uid => uid !== currentUser?.id) || [];
    
    // Gabungkan kontak user dengan anggota yang sudah ada di grup
    const allPossibleUids = Array.from(new Set([
        ...currentParticipantUids,
        ...Object.keys(contactsMap || {})
    ]));

    return (
      <div className="border border-cream-200 rounded-2xl max-h-56 overflow-y-auto custom-scrollbar bg-cream-50 divide-y divide-cream-100 shadow-inner">
        {allPossibleUids.length === 0 ? (
          <p className="p-8 text-center text-denim-300 text-xs font-bold uppercase tracking-widest">Belum ada kontak tersedia.</p>
        ) : (
          allPossibleUids.map((uid) => {
            const contact = contactsMap?.[uid];
            const info = membersInfoCache[uid];
            const displayName = contact?.savedName || info?.name || "Pengguna";
            const displayAvatar = contact?.avatar || info?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;
            const isSelected = selectedMembers.includes(uid);
            const isCurrentMember = currentParticipantUids.includes(uid);

            return (
              <div key={uid} onClick={() => toggleMemberSelection(uid)} className="flex items-center gap-4 p-3.5 hover:bg-white cursor-pointer transition-all group">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-denim-600 border-denim-600 shadow-md' : 'border-denim-200 bg-white'}`}>
                  {isSelected && <CheckSquare size={16} className="text-white"/>}
                </div>
                <img src={displayAvatar} className="w-10 h-10 rounded-xl bg-denim-100 object-cover shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-denim-900 truncate tracking-tight">{displayName}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-tighter ${isCurrentMember ? 'text-denim-400' : 'text-denim-300'}`}>{isCurrentMember ? "Sudah Bergabung" : "Bisa Ditambahkan"}</p>
                </div>
                {isCurrentMember && !isSelected && (
                  <div className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
                    <UserMinusIcon size={14} />
                    <span className="text-[9px] font-black uppercase">Keluarkan</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      {/* HEADER UTAMA */}
      <div className="h-[60px] px-4 pt-[calc(0rem+env(safe-area-inset-top))] flex items-center justify-between bg-cream-50 border-b border-cream-200 sticky top-0 z-10 shrink-0 text-denim-900 box-content shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ms-2 text-denim-500 hover:bg-cream-200 rounded-full transition-colors"><ArrowLeft size={20} className="rtl:rotate-180" /></button>
          <h2 className="text-lg font-black tracking-tight">{isSelectionMode ? `${selectedGroupIds.size} Terpilih` : t.groups.title}</h2>
        </div>
        <div className="relative">
            {isSelectionMode ? ( 
              <div className="flex gap-2">
                <button onClick={() => { setIsSelectionMode(false); setSelectedGroupIds(new Set()); }} className="text-xs font-black uppercase tracking-wider text-denim-600 px-3 py-1.5 hover:bg-cream-200 rounded-xl transition-all">{t.common.cancel}</button>
                {selectedGroupIds.size > 0 && <button onClick={() => setShowDeleteConfirm(true)} className="text-xs font-black uppercase tracking-wider bg-red-50 text-red-600 px-4 py-1.5 hover:bg-red-100 rounded-xl transition-all shadow-sm">{processing ? '...' : t.common.delete}</button>}
              </div> 
            ) : ( 
              <button onClick={() => setShowOptions(!showOptions)} className="p-2 -me-2 text-denim-500 hover:text-denim-700 hover:bg-cream-200 rounded-full transition-colors"><MoreVertical size={20}/></button> 
            )}
            {showOptions && !isSelectionMode && (
              <div className="absolute right-0 top-10 bg-white shadow-xl border border-cream-200 rounded-2xl py-1 w-44 z-20 animate-in fade-in zoom-in-95 overflow-hidden">
                <button onClick={() => { setIsSelectionMode(true); setShowOptions(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-denim-800 hover:bg-cream-50 flex items-center gap-3 transition-colors"><CheckSquare size={18} className="text-denim-400"/> {t.contacts.select}</button>
              </div>
            )}
        </div>
      </div>
      
      {/* FILTER & VIEW TOGGLE */}
      <div className="p-3 bg-cream-50 border-b border-cream-200 space-y-3">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-denim-400" size={16} />
            <input type="text" placeholder={t.groups.search} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 text-denim-900 shadow-sm placeholder-denim-300"/>
          </div>
          
          <div className="relative">
            <button onClick={() => setShowViewDropdown(!showViewDropdown)} className="p-2.5 bg-white border border-cream-200 rounded-xl text-denim-600 shadow-sm hover:bg-cream-100 transition-all flex items-center gap-2 active:scale-95">
              {viewMode === 'list' ? <List size={20} /> : <LayoutGrid size={20} />}
              <ChevronDown size={14} className={`transition-transform duration-300 ${showViewDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showViewDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowViewDropdown(false)}></div>
                <div className="absolute right-0 top-12 w-44 bg-white border border-cream-200 rounded-2xl shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <button onClick={() => { setViewMode('list'); setShowViewDropdown(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-denim-700 text-white shadow-lg shadow-denim-900/20' : 'text-denim-800 hover:bg-cream-50'}`}>
                    <List size={16} /> Daftar
                    {viewMode === 'list' && <CheckCircle2 size={12} className="ms-auto" />}
                  </button>
                  <button onClick={() => { setViewMode('grid'); setShowViewDropdown(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest mt-1 transition-all ${viewMode === 'grid' ? 'bg-denim-700 text-white shadow-lg shadow-denim-900/20' : 'text-denim-800 hover:bg-cream-50'}`}>
                    <LayoutGrid size={16} /> Kotak
                    {viewMode === 'grid' && <CheckCircle2 size={12} className="ms-auto" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* GROUP LIST / GRID */}
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar pb-32 md:pb-0">
        {loading ? ( 
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400" /></div> 
        ) : filteredGroups.length === 0 ? ( 
          <div className="flex flex-col items-center justify-center h-64 text-denim-400 text-center px-6"><div className="w-20 h-20 bg-cream-200 rounded-[32px] flex items-center justify-center mb-4 shadow-inner opacity-60"><Users size={40} className="text-denim-300" /></div><p className="text-sm font-black text-denim-700 uppercase tracking-widest mb-1">Grup Kosong</p><p className="text-xs text-denim-400 font-medium">{t.groups.noGroups}</p></div> 
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4" : "space-y-3"}>
            {filteredGroups.map(group => {
              const isAdmin = group.adminIds?.includes(currentUser!.id);
              const isSelected = selectedGroupIds.has(group.id);
              
              if (viewMode === 'grid') {
                return (
                  <div key={group.id} onClick={() => { if (isSelectionMode) handleSelectGroup(group.id); else onOpenGroupChat && onOpenGroupChat(group); }} className={`group relative aspect-square bg-white rounded-[32px] border transition-all duration-300 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:shadow-xl ${isSelectionMode && isSelected ? 'bg-denim-50 border-denim-400 ring-2 ring-denim-100' : 'border-cream-200 shadow-sm'}`}>
                    <div className="relative mb-3">
                      <img src={group.avatar} className="w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] object-cover bg-cream-100 border border-black/5 shadow-md group-hover:scale-105 transition-transform" />
                      {isAdmin && <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-lg shadow-sm border border-white"><Settings size={10} /></div>}
                      {isSelectionMode && (
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-denim-600 border-white shadow-md' : 'bg-white border-denim-200 shadow-inner'}`}>
                          {isSelected && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                      )}
                    </div>
                    <h4 className="font-black text-denim-900 truncate w-full text-xs tracking-tight uppercase px-1 leading-tight">{group.name}</h4>
                    {!isSelectionMode && isAdmin && (
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(group); }} className="absolute top-3 right-3 p-1.5 bg-cream-50 rounded-lg text-denim-300 opacity-0 group-hover:opacity-100 transition-all hover:bg-cream-200"><Settings size={14} /></button>
                    )}
                  </div>
                );
              }

              return ( 
                <div key={group.id} onClick={() => { if (isSelectionMode) handleSelectGroup(group.id); else onOpenGroupChat && onOpenGroupChat(group); }} className={`group flex items-center gap-4 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 border mb-2 ${isSelectionMode && isSelected ? 'bg-denim-50 border-denim-300 shadow-inner' : 'bg-white border-cream-200 shadow-sm hover:border-denim-200 hover:shadow-md'}`}>
                  {isSelectionMode && ( <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-denim-600 border-denim-600 shadow-md' : 'border-denim-100 bg-cream-50'}`}>{isSelected && <CheckSquare size={16} className="text-white" />}</div> )}
                  <div className="relative shrink-0">
                    <img src={group.avatar} className="w-14 h-14 rounded-[20px] object-cover bg-denim-50 border border-black/5 shadow-sm" />
                    {isAdmin && <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-md shadow-sm border border-white"><Settings size={10} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-denim-900 truncate text-[15px] tracking-tight">{group.name}</h4>
                    <p className="text-[11px] text-denim-400 font-bold uppercase tracking-tighter mt-0.5">{group.participants.length} {t.groups.members}</p>
                  </div>
                  {!isSelectionMode && isAdmin && ( 
                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(group); }} className="p-2.5 text-denim-300 hover:text-denim-700 hover:bg-cream-100 rounded-xl transition-all" title="Atur Grup">
                      <Settings size={20} />
                    </button> 
                  )}
                </div> 
              );
            })}
          </div>
        )}
      </div>

      {!isSelectionMode && ( <button onClick={handleOpenCreate} className="absolute bottom-24 md:bottom-6 right-6 w-14 h-14 bg-denim-700 hover:bg-denim-800 text-white rounded-[24px] shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20 shadow-denim-900/30 border border-denim-600"><Plus size={32} /></button> )}
      
      {/* MODAL BUAT / EDIT GRUP DENGAN MANAJEMEN ANGGOTA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-denim-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col animate-in zoom-in-95 overflow-hidden">
            <div className="px-6 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50 shrink-0">
              <h3 className="font-black text-lg text-denim-900 uppercase tracking-tight">{isEditing ? t.groups.editGroup : t.groups.newGroup}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-cream-200 rounded-full hover:bg-cream-300 transition-colors text-denim-700"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer inline-block" onClick={() => fileInputRef.current?.click()}>
                  <div className="absolute -inset-1.5 bg-gradient-to-tr from-denim-600 to-denim-400 rounded-full opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <img src={groupImagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName || 'G')}&background=random&color=fff`} className="relative w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl bg-cream-100" />
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Camera size={28} className="text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageInput} accept="image/*" className="hidden" />
                </div>
                {uploadProgress && <p className="text-[10px] text-denim-600 font-black uppercase mt-3 animate-pulse tracking-widest">{uploadProgress}</p>}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-denim-400 uppercase tracking-[0.2em] mb-2 block ml-1">{t.groups.groupName}</label>
                  <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full px-4 py-3 border border-cream-300 rounded-[18px] bg-cream-50 focus:ring-2 focus:ring-denim-500 outline-none text-denim-900 font-bold shadow-inner" placeholder="Nama Grup"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-denim-400 uppercase tracking-[0.2em] mb-2 block ml-1">{t.groups.desc}</label>
                  <textarea value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} className="w-full px-4 py-3 border border-cream-300 rounded-[18px] bg-cream-50 focus:ring-2 focus:ring-denim-500 outline-none text-denim-900 font-medium resize-none h-20 shadow-inner" placeholder="Jelaskan tujuan grup..."/>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3 ml-1">
                    <label className="text-[10px] font-black text-denim-400 uppercase tracking-[0.2em]">Manajemen Anggota</label>
                    <span className="text-[10px] font-black text-denim-600 bg-denim-50 px-2 py-0.5 rounded-full">{selectedMembers.length + 1} Terpilih</span>
                </div>
                {renderMemberManagement()}
              </div>
            </div>
            <div className="p-6 border-t border-cream-200 bg-white shrink-0 pb-safe">
              <button onClick={handleSubmit} disabled={processing || !groupName.trim()} className="w-full py-4 bg-denim-700 hover:bg-denim-800 text-white rounded-2xl font-black shadow-xl shadow-denim-900/20 disabled:opacity-50 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                {processing ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
                {isEditing ? 'Simpan Perubahan' : t.groups.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS / KELUAR */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-[0_20px_70px_-10px_rgba(0,0,0,0.5)] border border-cream-200 text-center animate-in zoom-in-95 duration-200">
              <div className={`w-20 h-20 ${hasOwnedGroup ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'} rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-inner`}>
                  {hasOwnedGroup ? <Trash2 size={40} /> : <LogOut size={40} />}
              </div>
              <h3 className="text-xl font-black text-denim-900 mb-3 tracking-tight">{hasOwnedGroup ? "Hapus Permanen?" : "Keluar dari Grup?"}</h3>
              <p className="text-sm text-denim-500 mb-8 leading-relaxed font-medium">
                {hasOwnedGroup 
                  ? "Sebagai Admin, menghapus grup akan membubarkan grup ini untuk SELURUH anggota secara permanen." 
                  : `Anda akan keluar dari ${selectedGroupIds.size} grup terpilih. Grup ini tetap aktif bagi anggota lainnya.`}
              </p>
              <div className="flex flex-col gap-3">
                  <button onClick={executeGroupDelete} disabled={processing} className={`w-full py-4 ${hasOwnedGroup ? 'bg-red-600 hover:bg-red-700' : 'bg-denim-700 hover:bg-denim-800'} text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-xs uppercase tracking-[0.1em] flex items-center justify-center gap-2 shadow-red-900/10`}>
                    {processing ? <Loader2 size={16} className="animate-spin" /> : hasOwnedGroup ? "Ya, Hapus Sekarang" : "Ya, Saya Keluar"}
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)} disabled={processing} className="w-full py-3.5 text-denim-400 font-bold rounded-2xl hover:bg-cream-100 transition-colors text-xs uppercase tracking-widest">Batalkan</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};
