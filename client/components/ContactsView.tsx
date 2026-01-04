
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, UserPlus, Loader2, X, AlertTriangle, CheckSquare, 
  MoreVertical, Trash2, ArrowLeft, ShieldAlert, QrCode, 
  Image as ImageIcon, Maximize, Camera, MessageSquare, BadgeCheck, Phone, CheckCircle2
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, addDoc, doc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { translations } from '../utils/translations';
import { ViewHeader } from './SidebarViews';
import { AppSettings } from './Layout';
import { Contact, User } from '../types';

interface ContactsViewProps {
  onBack: () => void;
  onStartChat?: (contactUid: string) => void;
  appSettings?: AppSettings;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onBack, onStartChat, appSettings }) => {
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // QR Scan States
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const qrScannerRef = useRef<any>(null);
  const qrUploadInputRef = useRef<HTMLInputElement>(null);

  const t = translations[appSettings?.language || 'id'];

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    let unsubscribe: () => void;

    if (currentUser.isAdmin) {
      const usersRef = collection(db, 'users');
      unsubscribe = onSnapshot(usersRef, (snap) => {
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
    } else {
      const contactsRef = collection(db, 'users', currentUser.id, 'contacts');
      unsubscribe = onSnapshot(contactsRef, (snap) => {
        const list = snap.docs.map(d => ({id: d.id, ...d.data()} as Contact));
        list.sort((a, b) => a.savedName.localeCompare(b.savedName));
        setContacts(list);
        setLoading(false);
      });
    }

    return () => unsubscribe && unsubscribe();
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- QR SCAN LOGIC ---
  const startScanner = async () => {
    setShowQrScanner(true);
    setQrScanning(true);
    setShowOptions(false);
    
    setTimeout(() => {
      // @ts-ignore
      const html5QrCode = new Html5Qrcode("qr-reader");
      qrScannerRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText: string) => {
          handleQrResult(decodedText);
        },
        () => {} 
      ).catch((err: any) => {
        console.error("Camera access error:", err);
        setSearchError("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
      });
    }, 100);
  };

  const stopScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      await qrScannerRef.current.stop();
    }
    setShowQrScanner(false);
    setQrScanning(false);
  };

  // LOGIKA UTAMA SETELAH SCAN / DETEKSI QR BERHASIL
  const handleQrResult = async (result: string) => {
    // 1. Matikan scanner
    await stopScanner();
    
    // 2. Siapkan modal info
    setSearchingUser(true);
    setFoundUser(null);
    setSearchError('');
    setShowAddModal(true);

    try {
      // 3. Cari Data: Pertama cek apakah result adalah UID (Format QR Profile Card)
      const userDoc = await getDoc(doc(db, 'users', result));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (userDoc.id === currentUser?.id) {
          setSearchError("Ini adalah kode QR Anda sendiri.");
        } else {
          setFoundUser({ id: userDoc.id, ...data } as User);
          setSavedName(data.name);
        }
      } else {
        // 4. Jika bukan UID, cek apakah result adalah Nomor HP
        const q = query(collection(db, 'users'), where('phoneNumber', '==', result));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const uDoc = snap.docs[0];
          if (uDoc.id === currentUser?.id) {
            setSearchError("Ini adalah kode QR Anda sendiri.");
          } else {
            const data = uDoc.data();
            setFoundUser({ id: uDoc.id, ...data } as User);
            setSavedName(data.name);
          }
        } else {
          setSearchError("Nomor yang Anda cari belum terdaftar di Hud-Hud");
        }
      }
    } catch (e) {
      setSearchError("Gagal memproses kode QR. Format tidak didukung.");
    } finally {
      setSearchingUser(false);
    }
  };

  // LOGIKA UNGGAH GAMBAR QR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // @ts-ignore
      const html5QrCode = new Html5Qrcode("qr-reader-hidden");
      try {
        const result = await html5QrCode.scanFile(file, true);
        handleQrResult(result);
      } catch (err) {
        alert("Gagal mendeteksi kode QR dari gambar ini. Pastikan gambar jelas.");
      }
    }
  };

  // LOGIKA PENCARIAN MANUAL
  const handleSearchUser = async () => {
    if (!searchPhone) return;
    setSearchingUser(true); 
    setSearchError(''); 
    setFoundUser(null);
    try {
      const q = query(collection(db, 'users'), where('phoneNumber', '==', searchPhone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        if (snap.docs[0].id === currentUser?.id) { 
          setSearchError("Tidak dapat mencari nomor sendiri."); 
        } else {
          const userData = snap.docs[0].data();
          setFoundUser({ id: snap.docs[0].id, ...userData } as User); 
          setSavedName(userData.name);
        }
      } else { 
        setSearchError("Nomor yang Anda cari belum terdaftar di Hud-Hud"); 
      }
    } catch (e) { 
      setSearchError("Terjadi kesalahan saat mencari pengguna."); 
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
        avatar: foundUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name)}` 
      });
      showToast("Kontak berhasil disimpan");
      setShowAddModal(false); 
      resetModal(); 
      if (onStartChat) onStartChat(foundUser.id);
    } catch (err) {
      alert("Gagal menyimpan kontak.");
    }
  };

  const resetModal = () => { 
    setSearchPhone(''); 
    setFoundUser(null); 
    setSavedName(''); 
    setSearchError(''); 
  };
  
  const handleSelectContact = (id: string) => { 
    const newSet = new Set(selectedContactIds); 
    if (newSet.has(id)) newSet.delete(id); 
    else newSet.add(id); 
    setSelectedContactIds(newSet); 
  };

  const handleDeleteSelected = async () => {
      if (selectedContactIds.size === 0 || !currentUser) return;
      setIsDeleting(true);
      try {
        const batch = writeBatch(db);
        if (currentUser.isAdmin) {
          selectedContactIds.forEach(id => { batch.delete(doc(db, 'users', id)); });
        } else {
          selectedContactIds.forEach(id => { batch.delete(doc(db, 'users', currentUser.id, 'contacts', id)); });
        }
        await batch.commit();
        setIsSelectionMode(false); 
        setSelectedContactIds(new Set()); 
        setShowDeleteConfirm(false);
      } catch (e) {
        alert("Gagal melakukan penghapusan.");
      } finally {
        setIsDeleting(false);
      }
  };

  const filteredContacts = contacts.filter(c => c.savedName.toLowerCase().includes(search.toLowerCase()) || c.phoneNumber.includes(search));

  // CEK APAKAH USER SUDAH ADA DI KONTAK
  const isAlreadyInContacts = foundUser ? contacts.some(c => c.uid === foundUser.id) : false;

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <div className="h-[60px] px-4 pt-[calc(0rem+env(safe-area-inset-top))] flex items-center justify-between bg-cream-50 border-b border-cream-200 sticky top-0 z-10 shrink-0 text-denim-900 box-content">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ms-2 text-denim-500 hover:bg-cream-200 rounded-full transition-colors"><ArrowLeft size={20} className="rtl:rotate-180" /></button>
          <h2 className="text-lg font-semibold">{isSelectionMode ? `${selectedContactIds.size} Terpilih` : (currentUser?.isAdmin ? "Manajemen User" : t.contacts.title)}</h2>
        </div>
        <div className="relative">
            {isSelectionMode ? ( 
               <div className="flex gap-2">
                 <button onClick={() => { setIsSelectionMode(false); setSelectedContactIds(new Set()); }} className="text-sm font-bold text-denim-600 px-3 py-1 hover:bg-cream-200 rounded-lg">{t.common.cancel}</button>
                 {selectedContactIds.size > 0 && (
                   <button onClick={() => setShowDeleteConfirm(true)} className="text-sm font-bold text-red-500 px-3 py-1 hover:bg-red-50 rounded-lg">{t.common.delete}</button>
                 )}
               </div> 
            ) : ( 
               <button onClick={() => setShowOptions(!showOptions)} className="p-2 -me-2 text-denim-500 hover:text-denim-700 hover:bg-cream-200 rounded-full transition-colors">
                 <MoreVertical size={20}/>
               </button> 
            )}
            {showOptions && !isSelectionMode && (
              <div className="absolute right-0 top-10 bg-white shadow-xl border border-cream-200 rounded-xl py-1 w-48 z-[60] animate-in fade-in zoom-in-95">
                <button 
                  onClick={() => { setIsSelectionMode(true); setShowOptions(false); }} 
                  className="w-full text-left px-4 py-3 text-sm text-denim-800 hover:bg-cream-50 flex items-center gap-2"
                >
                  <CheckSquare size={16}/> {currentUser?.isAdmin ? "Pilih Pengguna" : t.contacts.select}
                </button>
                <button 
                  onClick={startScanner} 
                  className="w-full text-left px-4 py-3 text-sm text-denim-800 hover:bg-cream-50 flex items-center gap-2 border-t border-cream-100"
                >
                  <QrCode size={16}/> Scan QR Code
                </button>
              </div>
            )}
        </div>
      </div>

      <div className="p-3 bg-cream-50 border-b border-cream-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-denim-400" size={16} />
          <input 
            type="text" 
            placeholder={currentUser?.isAdmin ? "Cari nama atau nomor..." : t.contacts.search} 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-9 pr-4 py-2 bg-white border border-cream-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-denim-500 text-denim-900"
          />
        </div>
      </div>

      <div className="p-2 flex-1 overflow-y-auto custom-scrollbar pb-32 md:pb-0">
        {loading ? ( 
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-denim-400" /></div> 
        ) : filteredContacts.length === 0 ? ( 
          <div className="text-center p-8 text-denim-400 text-sm">Tidak ada pengguna ditemukan.</div> 
        ) : (
            filteredContacts.map(contact => {
                const isSelected = selectedContactIds.has(contact.id);
                return ( 
                  <div 
                    key={contact.id} 
                    onClick={() => { if (isSelectionMode) handleSelectContact(contact.id); else if (onStartChat) onStartChat(contact.uid); }} 
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${isSelectionMode && isSelected ? 'bg-denim-100 border-denim-300' : 'border-transparent hover:bg-white hover:border-cream-200'}`}
                  >
                    {isSelectionMode && ( 
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-denim-600 border-denim-600' : 'border-denim-300 bg-white'}`}>
                        {isSelected && <CheckSquare size={14} className="text-white" />}
                      </div> 
                    )}
                    <img src={contact.avatar} className="w-10 h-10 rounded-full object-cover bg-denim-200 border border-cream-200" onError={(e) => (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.savedName)}`}/>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-denim-900 text-sm truncate">{contact.savedName}</h4>
                      <p className="text-xs text-denim-500 truncate">{contact.phoneNumber}</p>
                    </div>
                  </div> 
                );
            })
        )}
      </div>

      {!currentUser?.isAdmin && !isSelectionMode && ( 
        <button onClick={() => { resetModal(); setShowAddModal(true); }} className="absolute bottom-24 md:bottom-6 right-6 w-14 h-14 bg-denim-600 hover:bg-denim-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 z-20 pb-safe">
          <UserPlus size={24} />
        </button> 
      )}

      {/* --- LUXURY QR SCANNER VIEW --- */}
      {showQrScanner && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-sm flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-10">
                 <h3 className="text-white font-black uppercase tracking-[0.2em] flex items-center gap-3">
                    <QrCode size={24} className="text-amber-400" /> Pindai Kode
                 </h3>
                 <button onClick={stopScanner} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20">
                    <X size={24} />
                 </button>
              </div>

              <div className="relative w-72 h-72 sm:w-80 sm:h-80 mb-10">
                {/* Corner Frame Glow */}
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-amber-400 rounded-tl-3xl shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-amber-400 rounded-tr-3xl shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-amber-400 rounded-bl-3xl shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-amber-400 rounded-br-3xl shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                
                {/* Scanner Container */}
                <div id="qr-reader" className="w-full h-full overflow-hidden rounded-[40px] bg-denim-900/50 relative border-2 border-white/5">
                   <div className="qr-scan-line absolute left-0 right-0 top-0 z-20"></div>
                </div>
                
                {/* Input tersembunyi untuk scan file */}
                <div id="qr-reader-hidden" className="hidden"></div>
              </div>

              <div className="w-full space-y-4">
                 <button 
                   onClick={() => qrUploadInputRef.current?.click()}
                   className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 text-xs uppercase tracking-widest border border-white/5"
                 >
                    <ImageIcon size={20} /> UNGGAH DARI GALERI
                    <input type="file" ref={qrUploadInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                 </button>
                 <p className="text-[10px] text-white/40 text-center font-bold uppercase tracking-[0.3em] px-4 leading-relaxed">
                    Arahkan kamera ke profil Hud-Hud teman Anda atau pilih gambar dari galeri
                 </p>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL INFO KONTAK (HASIL SCAN / CARI MANUAL) --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-denim-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
              <h3 className="font-black text-sm uppercase tracking-widest text-denim-900">{foundUser ? 'Info Kontak' : t.contacts.newContact}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-cream-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6">
              {searchingUser ? (
                 <div className="flex flex-col items-center justify-center py-10 gap-3">
                   <Loader2 size={32} className="animate-spin text-denim-600" />
                   <p className="text-xs font-bold text-denim-400 uppercase tracking-widest">Mencari User...</p>
                 </div>
              ) : foundUser ? (
                <div className="animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-4">
                      <img src={foundUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name)}`} className="w-24 h-24 rounded-3xl border-4 border-white shadow-xl object-cover bg-denim-50" />
                      {foundUser.isAdmin && (
                        <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1 rounded-lg border-2 border-white shadow-lg">
                          <BadgeCheck size={16} className="fill-current" />
                        </div>
                      )}
                    </div>
                    <p className="font-black text-denim-900 text-xl tracking-tight text-center">{foundUser.name}</p>
                    <p className="text-xs font-bold text-denim-400 uppercase tracking-widest mt-1 mb-3">{foundUser.phoneNumber}</p>
                    
                    <div className="w-full bg-cream-50 p-4 rounded-2xl border border-cream-200 text-center mb-6">
                       <p className="text-xs text-denim-700 italic font-medium">"{foundUser.bio || '-'}"</p>
                    </div>

                    {isAlreadyInContacts ? (
                      <div className="w-full space-y-4">
                         <div className="flex items-center justify-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest bg-green-50 py-2 rounded-full border border-green-100">
                           <CheckSquare size={14} /> Sudah Ada di Kontak
                         </div>
                         <button 
                           onClick={() => { if(onStartChat) onStartChat(foundUser.id); setShowAddModal(false); }}
                           className="w-full py-4 bg-denim-700 hover:bg-denim-800 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 text-xs uppercase tracking-widest"
                         >
                            <MessageSquare size={18} /> CHAT SEKARANG
                         </button>
                      </div>
                    ) : (
                      <div className="w-full space-y-4">
                        <div className="text-left">
                          <label className="text-[10px] font-black text-denim-400 uppercase mb-2 block tracking-widest ml-1">Simpan Sebagai</label>
                          <input 
                            type="text" 
                            value={savedName} 
                            onChange={(e) => setSavedName(e.target.value)} 
                            className="w-full px-4 py-3 border border-cream-300 rounded-2xl bg-cream-50 focus:ring-2 focus:ring-denim-500 outline-none text-denim-900 font-bold shadow-inner" 
                            placeholder="Nama Kontak"
                          />
                        </div>
                        <button 
                          onClick={handleSaveContact} 
                          disabled={!savedName.trim()}
                          className="w-full py-4 bg-denim-600 hover:bg-denim-700 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50"
                        >
                          <UserPlus size={18} /> TAMBAH KONTAK
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6">
                  {searchError ? (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner"><AlertTriangle size={24}/></div>
                      <p className="text-sm font-bold text-red-600 px-4">{searchError}</p>
                      <button onClick={resetModal} className="mt-4 text-xs font-black text-denim-600 uppercase tracking-widest hover:underline">Coba Lagi</button>
                    </div>
                  ) : (
                    <>
                      <label className="text-[10px] font-black text-denim-400 uppercase mb-3 block tracking-widest">Masukkan Nomor HP</label>
                      <div className="flex gap-2 w-full">
                        <input 
                          type="tel" 
                          value={searchPhone} 
                          onChange={(e) => setSearchPhone(e.target.value)} 
                          className="flex-1 px-4 py-3 border border-cream-300 rounded-2xl bg-cream-50 focus:ring-2 focus:ring-denim-500 outline-none text-denim-900 font-bold shadow-inner placeholder-denim-200" 
                          placeholder="Contoh: 08123..." 
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                        />
                        <button onClick={handleSearchUser} disabled={searchingUser || !searchPhone} className="px-5 bg-denim-600 hover:bg-denim-700 text-white rounded-2xl shadow-lg disabled:opacity-50 transition-all active:scale-90">
                          {searchingUser ? <Loader2 size={20} className="animate-spin"/> : <Search size={20} />}
                        </button>
                      </div>
                      <p className="text-[9px] text-denim-400 font-bold uppercase mt-4 tracking-widest">Gunakan format nomor lokal (08...)</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIALOG KONFIRMASI HAPUS */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[21px] p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <div className={`w-16 h-16 ${currentUser?.isAdmin ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner`}>
                {currentUser?.isAdmin ? <ShieldAlert size={32} /> : <Trash2 size={32} />}
              </div>
              <h3 className="text-lg font-black text-denim-900 mb-2 tracking-tight">{currentUser?.isAdmin ? "Unregister User?" : "Hapus Kontak?"}</h3>
              <p className="text-sm text-denim-500 mb-6 leading-relaxed font-medium">{currentUser?.isAdmin ? `Hapus ${selectedContactIds.size} pengguna permanen?` : `Anda akan menghapus ${selectedContactIds.size} kontak terpilih.`}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="flex-1 py-3 bg-cream-100 text-denim-700 rounded-xl font-bold text-xs uppercase">Batal</button>
                <button onClick={handleDeleteSelected} disabled={isDeleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg flex items-center justify-center gap-2">{isDeleting ? <Loader2 size={14} className="animate-spin" /> : "Hapus"}</button>
              </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] bg-denim-800 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 border border-white/10">
          <CheckCircle2 size={18} className="text-green-400" />
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
