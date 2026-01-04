
import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Loader2, LayoutDashboard, Sparkles, ChevronRight, CheckCircle2, 
  X, ShieldAlert, Mail, Phone, MapPin, Download, CreditCard, User as UserIcon, BadgeCheck, QrCode 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadMedia } from '../services/storageService';
import { translations } from '../utils/translations';
import { ViewHeader } from './SidebarViews';
import { AppSettings } from './Layout';
import { ViewState } from '../types';
import { db } from '../services/firebase';
import { doc, updateDoc, onSnapshot as onFirestoreSnapshot } from 'firebase/firestore';

interface ProfileViewProps {
  onBack: () => void;
  appSettings?: AppSettings;
  onNavigate?: (view: ViewState) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onBack, appSettings, onNavigate }) => {
  const { currentUser } = useAuth();
  const t = translations[appSettings?.language || 'id'];
  const [isEditing, setIsEditing] = useState(false);
  
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zoomCardRef = useRef<HTMLDivElement>(null);

  const [isPro, setIsPro] = useState(currentUser?.isProfessional || false);
  const [showConfirmActivate, setShowConfirmActivate] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  
  const [isCardZoomed, setIsCardZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsubFirestore = onFirestoreSnapshot(doc(db, 'users', currentUser.id), (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setIsPro(!!userData.isProfessional);
        if (!isEditing) {
          setName(userData.name || '');
          setBio(userData.bio || '');
          setAddress(userData.address || '');
        }
      }
    });
    return () => unsubFirestore();
  }, [currentUser, isEditing]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.id), { name, bio, address });
      setIsEditing(false);
      showToast("Profil diperbarui");
    } catch (e) {
      alert("Gagal memperbarui profil.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try { 
        const url = await uploadMedia(e.target.files[0], 'profile'); 
        await updateDoc(doc(db, 'users', currentUser!.id), { avatar: url });
        showToast("Foto profil diperbarui");
      } catch (err) {
        alert("Gagal mengunggah foto profil.");
      } finally { 
        setLoading(false); 
      }
    }
  };

  const handleActivatePro = async () => {
    if (!currentUser || isActivating) return;
    setIsActivating(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, { isProfessional: true, proActivatedAt: Date.now() });
      setShowConfirmActivate(false);
      showToast("Dashboard Pro Aktif!");
    } catch (e) {
      alert("Gagal mengaktifkan Dashboard Pro.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!zoomCardRef.current || isDownloading) return;
    setIsDownloading(true);
    
    try {
      // Tunggu sebentar untuk memastikan DOM stabil
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // @ts-ignore
      const dataUrl = await window.htmlToImage.toPng(zoomCardRef.current, { 
        quality: 1.0,
        pixelRatio: 3, // Ditingkatkan ke 3 untuk ketajaman ultra
        cacheBust: true,
        backgroundColor: '#0a2e4d', // Fallback background denim
        style: {
          transform: 'scale(1)',
          borderRadius: '28px'
        }
      });
      
      const link = document.createElement('a');
      link.download = `hudhud-card-${(name || currentUser?.name || 'user').replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Gambar berhasil disimpan");
    } catch (error) {
      console.error('Download card error:', error);
      alert('Gagal mengunduh kartu secara utuh. Silahkan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const ProfileCardUI = ({ containerRef, isZoomed = false }: { containerRef?: React.RefObject<HTMLDivElement>, isZoomed?: boolean }) => {
    // Generate QR Code URL using currentUser ID - Menggunakan API yang stabil
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${currentUser?.id}&bgcolor=ffffff&color=0a2e4d&margin=1`;

    return (
      <div 
        ref={containerRef}
        className={`relative overflow-hidden transition-all duration-500 rounded-[28px] shadow-2xl border border-white/10 select-none
          ${isZoomed ? 'w-full max-w-[500px] aspect-[1.586/1]' : 'w-full aspect-[1.586/1] cursor-pointer hover:scale-[1.02] active:scale-95'}
          bg-gradient-to-br from-denim-800 via-denim-900 to-black text-white p-6 sm:p-8
        `}
        onClick={() => !isZoomed && setIsCardZoomed(true)}
      >
        {/* Background Accents - Optimized for capture */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400/40 via-transparent to-transparent opacity-40"></div>
        
        {/* Card Header Section */}
        <div className="flex justify-between items-start mb-4 sm:mb-6 relative z-10">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-black tracking-[0.4em] text-amber-400 leading-none drop-shadow-md">HUD-HUD</h1>
            <p className="text-[8px] sm:text-[9px] font-black text-denim-200 mt-1 uppercase tracking-[0.3em] opacity-80">Official Member Card</p>
          </div>
          {isPro && (
            <div className="bg-white/5 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-lg">
              <Sparkles size={10} className="text-amber-400" />
              <span className="text-[7px] font-black uppercase tracking-widest text-amber-100">PRO VERIFIED</span>
            </div>
          )}
        </div>

        {/* Main Content Area: Photo + Data | QR CODE Center Right */}
        <div className="flex justify-between items-center gap-4 relative z-10 h-[60%]">
          {/* Left Side: Profile Info */}
          <div className="flex-1 flex gap-4 items-center min-w-0">
             <div className="relative shrink-0">
                <div className="absolute -inset-1.5 bg-gradient-to-br from-amber-400/30 to-amber-600/30 rounded-2xl blur-[2px]"></div>
                <img 
                  src={currentUser?.avatar} 
                  crossOrigin="anonymous"
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-denim-800 border border-white/20 shadow-2xl" 
                />
             </div>
             
             <div className="flex-1 min-w-0 flex flex-col">
                <h2 className="text-lg sm:text-xl font-black truncate tracking-tight text-white leading-tight uppercase">{name || currentUser?.name}</h2>
                <p className="text-[8px] sm:text-[10px] text-denim-300 font-bold uppercase tracking-wide opacity-80 mb-3 truncate italic">"{bio || currentUser?.bio || '-'}"</p>
                
                <div className="space-y-1.5">
                   <div className="flex items-center gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-95">
                      <div className="w-4 h-4 rounded bg-amber-400/20 flex items-center justify-center"><Phone size={10} className="text-amber-400" /></div>
                      <span>{currentUser?.phoneNumber || '-'}</span>
                   </div>
                   <div className="flex items-center gap-2 text-[8px] sm:text-[10px] font-black tracking-widest opacity-95">
                      <div className="w-4 h-4 rounded bg-amber-400/20 flex items-center justify-center"><Mail size={10} className="text-amber-400" /></div>
                      <span className="lowercase">{(currentUser?.email || '-').toLowerCase()}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Side: LARGE EXCLUSIVE QR CODE - Centered Vertically */}
          <div className="shrink-0 flex flex-col items-center justify-center gap-2 ps-4 border-l border-white/5">
             <div className="p-1.5 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-200 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-transform hover:scale-105">
                <div className="bg-white p-1 rounded-xl">
                   <img src={qrUrl} crossOrigin="anonymous" className="w-16 h-16 sm:w-24 sm:h-24 object-contain" alt="QR" />
                </div>
             </div>
             <p className="text-[6px] sm:text-[7px] font-black text-amber-400/70 uppercase tracking-[0.3em]">Scan My Identity</p>
          </div>
        </div>

        {/* Bottom Bar: Address */}
        <div className="absolute bottom-4 left-6 sm:left-8 right-6 sm:right-8 flex items-center justify-between border-t border-white/10 pt-3">
          <div className="flex items-center gap-2 text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-denim-200 min-w-0">
             <MapPin size={10} className="text-amber-400 shrink-0" />
             <span className="truncate">{address || currentUser?.address || 'Address Not Set'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[7px] text-denim-400 font-black">
             <QrCode size={11} />
             <span className="tracking-tighter">ID: {currentUser?.id.substring(0,12).toUpperCase()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-cream-100 animate-in slide-in-from-left-4 duration-200 relative">
      <ViewHeader title={t.profile.title} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-32">
         <div className="flex flex-col items-center mb-6 mt-4">
           <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
             <img src={currentUser?.avatar} className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover bg-denim-200" />
             <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <Camera size={28} className="text-white" />
             </div>
             <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
           </div>
           {loading && <p className="text-[10px] text-denim-500 font-bold mt-2 animate-pulse">Sedang mengunggah...</p>}
         </div>
         
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-cream-200 space-y-5">
            <div>
              <label className="text-[9px] font-black text-denim-400 uppercase tracking-widest block mb-1 ml-1">Nama Lengkap</label>
              {isEditing ? ( <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-cream-200 rounded-xl px-4 py-2.5 text-denim-900 bg-cream-50 focus:ring-1 focus:ring-denim-500 outline-none text-sm font-bold shadow-inner" placeholder="Masukkan nama..." /> ) : ( <p className="text-base font-black text-denim-900 px-1">{currentUser?.name}</p> )}
            </div>
            <div>
              <label className="text-[9px] font-black text-denim-400 uppercase tracking-widest block mb-1 ml-1">Bio / Info</label>
              {isEditing ? ( <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full border border-cream-200 rounded-xl px-4 py-2.5 text-denim-900 bg-cream-50 focus:ring-1 focus:ring-denim-500 outline-none text-sm h-16 resize-none font-medium shadow-inner" placeholder="Tulis sesuatu tentang Anda..." /> ) : ( <p className="text-sm text-denim-700 px-1 leading-relaxed italic">{currentUser?.bio || '-'}</p> )}
            </div>
            <div className="opacity-80">
              <label className="text-[9px] font-black text-denim-400 uppercase tracking-widest block mb-1 ml-1 flex items-center gap-1.5"><Phone size={10} /> Nomor HP</label>
              <div className="bg-cream-100/50 px-4 py-2.5 rounded-xl border border-cream-200 text-denim-500 text-sm font-bold">{currentUser?.phoneNumber || '-'}</div>
            </div>
            <div>
              <label className="text-[9px] font-black text-denim-400 uppercase tracking-widest block mb-1 ml-1 flex items-center gap-1.5"><MapPin size={10} /> Alamat Lengkap</label>
              {isEditing ? ( <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-cream-200 rounded-xl px-4 py-2.5 text-denim-900 bg-cream-50 focus:ring-1 focus:ring-denim-500 outline-none text-sm h-20 resize-none font-medium shadow-inner" placeholder="Masukkan alamat lengkap..." /> ) : ( <p className="text-sm text-denim-800 px-1 leading-relaxed">{currentUser?.address || 'Alamat belum diatur'}</p> )}
            </div>
            <div className="opacity-80">
              <label className="text-[9px] font-black text-denim-400 uppercase tracking-widest block mb-1 ml-1 flex items-center gap-1.5"><Mail size={10} /> Alamat Email</label>
              <div className="bg-cream-100/50 px-4 py-2.5 rounded-xl border border-cream-200 text-denim-500 text-sm font-medium">{(currentUser?.email || '-').toLowerCase()}</div>
            </div>
         </div>

         {!currentUser?.isAdmin && (
           <div className="mt-4">
             {isPro ? (
               <button onClick={() => onNavigate && onNavigate('professional_dashboard')} className="w-full bg-denim-700 p-4 rounded-2xl border border-denim-600 shadow-lg flex items-center justify-between group active:scale-95 transition-all animate-in zoom-in-90"><div className="flex items-center gap-3 text-white text-left"><div className="p-2 bg-white/10 rounded-xl shadow-inner"><LayoutDashboard size={20} /></div><div><p className="font-black text-sm tracking-tight">Dashboard Profesional</p><p className="text-[9px] text-denim-100 flex items-center gap-1 font-bold uppercase opacity-80"><Sparkles size={10} className="text-yellow-400" /> Kreator Aktif</p></div></div><ChevronRight size={18} className="text-denim-300" /></button>
             ) : (
               /* Sembunyikan sementara Menu Pengajuan Pro sesuai request - Bos bisa aktifkan kembali dengan menghapus null di bawah */
               null
               /* 
               <button onClick={() => setShowConfirmActivate(true)} className="w-full bg-white p-4 rounded-2xl border border-denim-200 shadow-sm flex items-center justify-between group hover:bg-denim-50 active:scale-95 transition-all"><div className="flex items-center gap-3 text-left"><div className="p-2 bg-denim-600 text-white rounded-xl shadow-md"><LayoutDashboard size={20} /></div><div><p className="font-black text-sm text-denim-900 tracking-tight">Buka Dashboard Pro</p><p className="text-[9px] text-denim-400 font-bold uppercase">Mulai Menghasilkan Uang</p></div></div><ChevronRight size={18} className="text-denim-200" /></button>
               */
             )}
           </div>
         )}

         <div className="mt-4">
           {isEditing ? ( <div className="flex gap-2"><button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-cream-200 text-denim-700 font-black rounded-xl text-xs uppercase active:scale-95">Batal</button><button onClick={handleUpdateProfile} disabled={loading} className="flex-[2] py-3 bg-denim-600 text-white font-black rounded-xl text-xs flex justify-center items-center gap-2 shadow shadow-denim-900/20 uppercase tracking-widest active:scale-95">{loading && <Loader2 size={14} className="animate-spin"/>} Simpan</button></div> ) : ( <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-white border border-cream-300 text-denim-700 font-black rounded-xl text-xs hover:bg-cream-50 active:scale-95 shadow-sm uppercase tracking-widest">Edit Profil</button> )}
         </div>

         {/* --- EXCLUSIVE DIGITAL PROFILE CARD --- */}
         <div className="mt-8">
            <div className="flex items-center justify-between mb-4 px-1">
               <h4 className="text-[10px] font-black text-denim-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <CreditCard size={14} /> Kartu Digital Exclusive
               </h4>
               <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">TAP TO ZOOM</span>
            </div>
            <ProfileCardUI />
         </div>
      </div>

      {/* ZOOM MODAL & DOWNLOAD */}
      {isCardZoomed && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="w-full max-w-[550px] flex flex-col items-center gap-8">
              <div className="w-full flex justify-between items-center mb-2 px-2">
                 <div className="flex items-center gap-2 text-white/60">
                    <Sparkles size={20} className="text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-widest">Preview Mode</span>
                 </div>
                 <button onClick={() => setIsCardZoomed(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                    <X size={28} />
                 </button>
              </div>

              {/* Elemen ini yang dicapture oleh html-to-image */}
              <div className="w-full">
                 <ProfileCardUI containerRef={zoomCardRef} isZoomed={true} />
              </div>

              <div className="w-full flex flex-col gap-4 px-2">
                 <button 
                   onClick={handleDownloadCard}
                   disabled={isDownloading}
                   className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-denim-950 font-black rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all active:scale-95 disabled:opacity-50 text-sm uppercase tracking-widest"
                 >
                    {isDownloading ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
                    SIMPAN KE GALERI
                 </button>
                 <p className="text-[10px] text-white/40 text-center font-bold uppercase tracking-[0.3em]">Hud-Hud Card Rendering Engine v2.1</p>
              </div>
           </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] bg-denim-800 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 border border-white/10">
          <CheckCircle2 size={18} className="text-green-400" />
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}

      {showConfirmActivate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-denim-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] p-6 max-sm w-full shadow-2xl border border-cream-200 text-center animate-in zoom-in-95 duration-300"><div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner"><ShieldAlert size={32} /></div><h3 className="text-lg font-black text-denim-900 mb-2 tracking-tight">Buka Dashboard Pro?</h3><p className="text-xs text-denim-500 mb-6 leading-relaxed font-medium">Anda akan mendapatkan akses ke fitur monetisasi, statistik postingan, dan manajemen saldo penghasilan.</p><div className="flex flex-col gap-2"><button onClick={handleActivatePro} disabled={isActivating} className="w-full py-3 bg-denim-700 text-white font-black rounded-xl shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 text-[11px] uppercase tracking-widest">{isActivating ? <Loader2 size={16} className="animate-spin" /> : "Iya, Saya Yakin"}</button><button onClick={() => setShowConfirmActivate(false)} disabled={isActivating} className="w-full py-3 text-denim-500 font-bold rounded-xl text-[11px] uppercase hover:bg-cream-50 transition-colors">Batal</button></div></div>
        </div>
      )}
    </div>
  );
};
