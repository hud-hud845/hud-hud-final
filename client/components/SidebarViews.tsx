
import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, ChevronRight, HelpCircle, FileText, MessageCircle, 
  LogOut, Mail, Key, Palette, Type, Globe, Loader2, BadgeCheck, ShieldCheck, Upload, Bell, User as UserIcon
} from 'lucide-react';
import { ViewState, Contact, ChatPreview, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { AppSettings } from './Layout';
import { translations } from '../utils/translations';

// Impor view yang telah dipindah
import { ProfileView } from './ProfileView';
import { StatusView, MyStatusView } from './StatusViews';
import { NotificationsView } from './NotificationsView';
import { ContactsView } from './ContactsView';
import { GroupsView } from './GroupsView';
import { ProfessionalDashboard } from './ProfessionalDashboard';
import { AdminProfessionalDashboard } from './AdminProfessionalDashboard';
import { BroadcastView } from './AdminViews';

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

// Komponen Header Bersama
export const ViewHeader: React.FC<{ 
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

// --- SETTINGS VIEW ---
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

        {/* DASHBOARD ADMIN DI PENGATURAN DIHAPUS, PINDAH KE NAVIGASI UTAMA SUPER ADMIN PRO */}

        <section onClick={() => setActiveSection('account')} className="bg-white p-4 rounded-xl shadow-sm border border-cream-200 cursor-pointer hover:bg-cream-50 transition-colors"><div className="flex items-center gap-4"><div className="p-2.5 bg-denim-100 text-denim-600 rounded-xl"><UserIcon size={22}/></div><div className="flex-1"><h3 className="text-denim-900 font-bold">Akun</h3><p className="text-xs text-denim-500">Email, Password</p></div><ChevronRight size={18} className="text-denim-300"/></div></section>
        <section onClick={() => setActiveSection('chat')} className="bg-white p-4 rounded-xl shadow-sm border border-cream-200 cursor-pointer hover:bg-cream-50 transition-colors"><div className="flex items-center gap-4"><div className="p-2.5 bg-denim-100 text-denim-600 rounded-xl"><Palette size={22}/></div><div className="flex-1"><h3 className="text-denim-900 font-bold">Chat</h3><p className="text-xs text-denim-500">Wallpaper, Ukuran Teks</p></div><ChevronRight size={18} className="text-denim-300"/></div></section>
        <section className="bg-white p-4 rounded-xl shadow-sm border border-cream-200"><h3 className="flex items-center gap-2 text-denim-900 font-bold mb-3"><Bell size={18}/> Notifikasi</h3><SettingToggle label="Notifikasi Pesan" value={appSettings.notifMessage} onChange={(v) => updateAppSettings({ notifMessage: v })} /><SettingToggle label="Notifikasi Grup" value={appSettings.notifGroup} onChange={(v) => updateAppSettings({ notifGroup: v })} /><SettingToggle label="Notifikasi Desktop" value={appSettings.notifDesktop} onChange={(v) => updateAppSettings({ notifDesktop: v })} /></section>
        <section className="bg-white p-4 rounded-xl shadow-sm border border-cream-200"><h3 className="flex items-center gap-2 text-denim-900 font-bold mb-3"><Globe size={18}/> Bahasa</h3><div className="flex gap-2"><button onClick={() => updateAppSettings({ language: 'id' })} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${appSettings.language === 'id' ? 'bg-denim-100 border-denim-500' : 'bg-white border-cream-200'}`}>Indonesia</button><button onClick={() => updateAppSettings({ language: 'ar' })} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${appSettings.language === 'ar' ? 'bg-denim-100 border-denim-500' : 'bg-white border-cream-200'}`}>العربية</button></div></section>
        <button onClick={() => logout()} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 border border-red-100"><LogOut size={18} /> Keluar</button>
      </div>
    </div>
  );
};

// --- HELP VIEW ---
export const HelpView: React.FC<SidebarViewProps> = ({ onBack, appSettings }) => {
    const t = translations[appSettings?.language || 'id'];
    return (
        <div className="h-full flex flex-col bg-cream-100">
            <ViewHeader title={t.settings.help.title} onBack={onBack} />
            <div className="p-4 space-y-2 pb-32 md:pb-0"><div className="bg-white p-4 rounded-xl shadow-sm"><h3 className="font-bold mb-2">Bantuan</h3><p className="text-sm text-gray-600">Hubungi admin untuk dukungan teknis.</p></div></div>
        </div>
    );
};

export const renderSidebarView = ( 
  view: ViewState, onBack: () => void, onStartChat?: (contactUid: string) => void, onOpenGroupChat?: (chat: ChatPreview) => void, 
  appSettings?: AppSettings, updateAppSettings?: (settings: Partial<AppSettings>) => void, contactsMap?: Record<string, Contact>, 
  adminProfile?: User | null, onNavigate?: (view: ViewState) => void, setTargetStatusId?: (id: string | null) => void, targetStatusId?: string | null
) => {
  switch (view) {
    case 'status': return <StatusView onBack={onBack} appSettings={appSettings} contactsMap={contactsMap} adminProfile={adminProfile} onNavigate={onNavigate} targetStatusId={targetStatusId} setTargetStatusId={setTargetStatusId} />;
    case 'my_status': return <MyStatusView onBack={onBack} appSettings={appSettings} targetStatusId={targetStatusId} setTargetStatusId={setTargetStatusId} contactsMap={contactsMap} adminProfile={adminProfile} onNavigate={onNavigate} />;
    case 'notifications': return <NotificationsView onBack={onBack} appSettings={appSettings} onNavigate={onNavigate} setTargetStatusId={setTargetStatusId} />;
    case 'groups': return <GroupsView onBack={onBack} onOpenGroupChat={onOpenGroupChat} appSettings={appSettings} contactsMap={contactsMap} />;
    case 'contacts': return <ContactsView onBack={onBack} onStartChat={onStartChat} appSettings={appSettings} />;
    case 'settings': return <SettingsView onBack={onBack} appSettings={appSettings} updateAppSettings={updateAppSettings} onNavigate={onNavigate} />;
    case 'help': return <HelpView onBack={onBack} appSettings={appSettings} />; 
    case 'profile': return <ProfileView onBack={onBack} appSettings={appSettings} onNavigate={onNavigate} />;
    case 'broadcast': return <BroadcastView onBack={onBack} appSettings={appSettings} />;
    case 'professional_dashboard': return <ProfessionalDashboard onBack={onBack} />;
    case 'admin_professional_dashboard': return <AdminProfessionalDashboard onBack={onBack} />;
    default: return null;
  }
};
