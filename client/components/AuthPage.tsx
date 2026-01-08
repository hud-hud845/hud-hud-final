
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Loader2, Eye, EyeOff, Camera, Upload, Lock, WifiOff, AlertCircle, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { ref, onValue, remove } from 'firebase/database';
import { rtdb, auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

export const AuthPage: React.FC = () => {
  const { loginWithEmail, registerUser, getDeviceId } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State untuk Flow Izin Perangkat
  const [isWaitingPermission, setIsWaitingPermission] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);

  // States Input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listener untuk mengecek apakah izin sudah diberikan oleh perangkat utama
  useEffect(() => {
    if (isWaitingPermission && tempUserId) {
      const permissionRef = ref(rtdb, `login_permissions/${tempUserId}`);
      const unsubscribe = onValue(permissionRef, async (snapshot) => {
        const val = snapshot.val();
        if (val) {
          if (val.status === 'approved') {
            // Izin Diterima! Update Device ID di Firestore dan masuk ke aplikasi
            await updateDoc(doc(db, 'users', tempUserId), { currentDeviceId: getDeviceId() });
            await remove(permissionRef);
            window.location.reload(); // Refresh untuk masuk ke Layout
          } else if (val.status === 'rejected') {
            // Izin Ditolak! Sign out dan tampilkan error
            await signOut(auth);
            await remove(permissionRef);
            setIsWaitingPermission(false);
            setError("Maaf bro, Perangkat Utama menolak akses login Anda.");
          }
        }
      });
      return () => unsubscribe();
    }
  }, [isWaitingPermission, tempUserId, getDeviceId]);

  const checkPasswordStrength = (pass: string) => {
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isLengthValid = pass.length >= 6;
    return { isValid: hasUpper && hasNumber && hasSymbol && isLengthValid, hasUpper, hasNumber, hasSymbol };
  };

  const passwordStrength = checkPasswordStrength(password);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!navigator.onLine) { setError("Miskin Ya Bro, Kok Gak terhubung ke internet sih?"); return; }
    setIsLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (phoneNumber.length < 11) throw new Error("Nomor HP minimal 11 angka.");
        if (password !== confirmPassword) throw new Error("Konfirmasi password tidak cocok.");
        if (!passwordStrength.isValid) throw new Error("Password wajib mengandung Huruf Kapital, Angka, dan Simbol.");
        await registerUser({ email, password, name, phoneNumber, bio, avatarFile });
      }
    } catch (err: any) {
      if (err.code === 'auth/device-permission-required') {
        setTempUserId(auth.currentUser?.uid || null);
        setIsWaitingPermission(true);
      } else {
        const errCode = err.code || "";
        if (errCode.includes('network-request-failed')) setError("Miskin Ya Bro, Kok Gak terhubung ke internet sih?");
        else if (errCode.includes('invalid-credential') || errCode.includes('wrong-password')) setError("waduh bro,Password atau Email Mu salah Nih");
        else setError(err.message || 'Terjadi kesalahan.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isWaitingPermission) {
    return (
      <div className="min-h-screen w-full bg-cream-50 flex flex-col items-center justify-center p-6 text-center pattern-bg">
        <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-10 border border-cream-200 animate-in zoom-in-95">
           <div className="w-24 h-24 bg-denim-700 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-denim-900/20 relative">
              <Clock size={48} className="text-white animate-pulse" />
              <div className="absolute -top-2 -right-2 bg-amber-500 p-2 rounded-full border-4 border-white">
                 <ShieldCheck size={20} className="text-white" />
              </div>
           </div>
           <h2 className="text-2xl font-black text-denim-900 mb-4 uppercase tracking-tight">Menunggu Izin</h2>
           <p className="text-sm text-denim-500 leading-relaxed mb-10 font-medium">
             Bro, Akun ini sudah aktif di HP lain. Silahkan buka aplikasi Hud-Hud di perangkat utama Anda dan klik <b>"Ijinkan"</b> pada notifikasi yang muncul.
           </p>
           <button 
             onClick={async () => { 
                if (tempUserId) await remove(ref(rtdb, `login_permissions/${tempUserId}`));
                await signOut(auth);
                setIsWaitingPermission(false);
             }}
             className="w-full py-4 bg-cream-100 text-denim-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-cream-200 transition-all"
           >
             Batalkan Login
           </button>
           <p className="text-[10px] text-denim-300 font-bold uppercase tracking-[0.2em] mt-8 opacity-50">Hud-Hud Secure Fingerprint</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-cream-50 flex flex-col items-center justify-center py-2 px-4 relative pattern-bg overflow-x-hidden">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes rotate-border { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .rotating-border-container { position: relative; padding: 2px; border-radius: 24px; overflow: hidden; }
        .rotating-border-bg { position: absolute; width: 200%; height: 200%; top: -50%; left: -50%; background: conic-gradient(from 0deg, #154c79, #36b2fa, #0c9aeb, transparent 60%); animation: rotate-border 3.5s linear infinite; z-index: 0; }
        .rotating-border-inner { position: relative; background: white; border-radius: 22px; z-index: 1; }
        .carousel-container { display: flex; transition: transform 0.5s cubic-bezier(0.65, 0, 0.35, 1); width: 200%; }
        .carousel-item { width: 50%; }
        .denim-texture-bg { background-color: #154c79; background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0); background-size: 3px 3px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      
      <div className="flex flex-col items-center mb-4 shrink-0 z-10 animate-float">
        <div className="w-16 h-16 sm:w-20 sm:h-20 denim-texture-bg rounded-full flex items-center justify-center shadow-xl border-[3px] border-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
          <img src="https://i.ibb.co.com/5W5dNpfy/20251211-081657.png" alt="Hud-Hud" className="w-full h-full object-cover rounded-full relative z-10"/>
        </div>
        <h1 className="text-lg sm:text-xl font-black text-denim-700 tracking-widest mt-2 uppercase font-sans">Hud-Hud</h1>
        <div className="h-0.5 w-4 bg-denim-300 rounded-full mt-0.5 opacity-40"></div>
      </div>

      <div className="w-full max-w-[310px] sm:max-w-[340px] rotating-border-container shadow-2xl z-10 transition-all">
        <div className="rotating-border-bg"></div>
        <div className="rotating-border-inner flex flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-cream-100 bg-cream-50/50 flex justify-center">
             <div className="flex bg-cream-200 p-0.5 rounded-lg w-full max-w-[150px]">
                <button onClick={() => { setIsLogin(true); setError(''); }} className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${isLogin ? 'bg-denim-700 text-white shadow-sm' : 'text-denim-500 hover:text-denim-700'}`}>Masuk</button>
                <button onClick={() => { setIsLogin(false); setError(''); }} className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${!isLogin ? 'bg-denim-700 text-white shadow-sm' : 'text-denim-500 hover:text-denim-700'}`}>Daftar</button>
             </div>
          </div>
          <div className="relative overflow-hidden">
            <div className="carousel-container" style={{ transform: isLogin ? 'translateX(0%)' : 'translateX(-50%)' }}>
              <div className="carousel-item p-4">
                <form onSubmit={handleSubmit} className="space-y-2.5">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[10px] font-black text-center mb-2 animate-shake">
                      <span className="uppercase tracking-tight leading-tight">{error}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[7px] font-black text-denim-400 uppercase tracking-widest mb-1 ml-1">Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:ring-1 focus:ring-denim-500 outline-none text-xs font-medium shadow-inner" placeholder="email@anda.com" />
                  </div>
                  <div>
                    <label className="block text-[7px] font-black text-denim-400 uppercase tracking-widest mb-1 ml-1">Sandi</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:ring-1 focus:ring-denim-500 outline-none pr-10 text-xs font-medium shadow-inner" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-denim-300 p-1">{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-denim-700 hover:bg-denim-800 text-white font-black py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg mt-2 disabled:opacity-70 text-[10px] uppercase tracking-widest active:scale-95">
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <>Masuk <ArrowRight size={12} /></>}
                  </button>
                </form>
              </div>
              <div className="carousel-item p-4">
                <div className="overflow-y-auto max-h-[45vh] no-scrollbar pr-0.5">
                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    <div className="flex justify-center mb-1">
                      <div className="relative w-12 h-12 rounded-xl bg-cream-100 border border-dashed border-denim-300 flex items-center justify-center cursor-pointer hover:bg-cream-200 overflow-hidden shadow-inner" onClick={() => fileInputRef.current?.click()}>
                        {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <Camera size={16} className="text-denim-400" />}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 text-[10px] font-bold shadow-inner" placeholder="Nama" />
                      <input type="number" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 text-[10px] font-bold shadow-inner" placeholder="08..." />
                    </div>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 text-[10px] font-medium shadow-inner" placeholder="email@baru.com" />
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 text-[10px] font-medium shadow-inner pr-8" placeholder="Sandi" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-denim-300 p-0.5"><Eye size={12} /></button>
                    </div>
                    <div className="relative">
                      <input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 text-[10px] font-medium shadow-inner pr-8" placeholder="Konfirmasi" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-denim-300 p-0.5"><Eye size={12} /></button>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-denim-700 hover:bg-denim-800 text-white font-black py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg mt-2 uppercase tracking-widest text-[9px] active:scale-95">
                      {isLoading ? <Loader2 size={12} className="animate-spin" /> : "Buat Akun"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 text-center text-denim-400 text-[7px] font-black uppercase tracking-[0.2em] z-10 flex flex-col items-center gap-1 opacity-50">
        <div className="flex items-center gap-2"><div className="h-[1px] w-3 bg-denim-200"></div><p>HUD-HUD SECURE</p><div className="h-[1px] w-3 bg-denim-200"></div></div>
        <div className="flex items-center gap-1 text-denim-300 lowercase font-medium"><Lock size={8} /><span>End-to-End Encrypted</span></div>
      </div>
    </div>
  );
};
