
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Loader2, Eye, EyeOff, Camera, Upload, Lock, WifiOff, AlertCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { loginWithEmail, registerUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // States Input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Register Specific States
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkPasswordStrength = (pass: string) => {
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isLengthValid = pass.length >= 6;
    return {
      isValid: hasUpper && hasNumber && hasSymbol && isLengthValid,
      hasUpper, hasNumber, hasSymbol
    };
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

    // DETEKSI KONEKSI INTERNET MANUAL
    if (!navigator.onLine) {
      setError("Miskin Ya Bro, Kok Gak terhubung ke internet sih?");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (phoneNumber.length < 11) throw new Error("Nomor HP minimal 11 angka.");
        if (password !== confirmPassword) throw new Error("Konfirmasi password tidak cocok.");
        if (password.length < 6) throw new Error("Password minimal 6 karakter.");
        if (!passwordStrength.isValid) throw new Error("Password wajib mengandung Huruf Kapital, Angka, dan Simbol.");

        await registerUser({ email, password, name, phoneNumber, bio, avatarFile });
      }
    } catch (err: any) {
      // LOGIKA PEMETAAN ERROR KUSTOM (Sesuai Request)
      const errCode = err.code || "";
      
      if (errCode.includes('network-request-failed') || errCode.includes('unavailable')) {
        setError("Miskin Ya Bro, Kok Gak terhubung ke internet sih?");
      } else if (
        errCode === 'auth/invalid-credential' || 
        errCode === 'auth/wrong-password' || 
        errCode === 'auth/user-not-found' ||
        errCode === 'auth/invalid-email'
      ) {
        // PESAN ERROR SESUAI REQUEST USER
        setError("waduh bro,Password atau Email Mu salah Nih");
      } else if (errCode === 'auth/email-already-in-use') {
        setError("Email ini sudah dipake orang lain, Bos!");
      } else if (errCode === 'auth/too-many-requests') {
        setError("Kebanyakan nyoba nih, istirahat dulu bro!");
      } else {
        // Fallback untuk error lain yang bukan credential
        setError(err.message || 'Terjadi kesalahan. Periksa data Anda.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-cream-50 flex flex-col items-center justify-center py-2 px-4 relative pattern-bg overflow-x-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes rotate-border {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        .rotating-border-container {
          position: relative;
          padding: 2px;
          border-radius: 24px;
          overflow: hidden;
        }
        .rotating-border-bg {
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          background: conic-gradient(from 0deg, #154c79, #36b2fa, #0c9aeb, transparent 60%);
          animation: rotate-border 3.5s linear infinite;
          z-index: 0;
        }
        .rotating-border-inner {
          position: relative;
          background: white;
          border-radius: 22px;
          z-index: 1;
        }
        .carousel-container {
          display: flex;
          transition: transform 0.5s cubic-bezier(0.65, 0, 0.35, 1);
          width: 200%;
        }
        .carousel-item {
          width: 50%;
        }
        .denim-texture-bg {
          background-color: #154c79;
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0);
          background-size: 3px 3px;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      
      {/* --- Ultra Compact Logo Section --- */}
      <div className="flex flex-col items-center mb-4 shrink-0 z-10 animate-float">
        <div className="w-16 h-16 sm:w-20 sm:h-20 denim-texture-bg rounded-full flex items-center justify-center shadow-xl border-[3px] border-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
          <img 
            src="https://i.ibb.co.com/5W5dNpfy/20251211-081657.png" 
            alt="Hud-Hud Logo" 
            className="w-full h-full object-cover rounded-full relative z-10"
          />
        </div>
        
        <h1 className="text-lg sm:text-xl font-black text-denim-700 tracking-widest mt-2 uppercase font-sans">Hud-Hud</h1>
        <div className="h-0.5 w-4 bg-denim-300 rounded-full mt-0.5 opacity-40"></div>
      </div>

      {/* --- Ultra Slim Auth Card --- */}
      <div className="w-full max-w-[310px] sm:max-w-[340px] rotating-border-container shadow-2xl z-10 transition-all">
        <div className="rotating-border-bg"></div>
        <div className="rotating-border-inner flex flex-col overflow-hidden">
          
          {/* Minimalist Tab Selection */}
          <div className="px-3 py-3 border-b border-cream-100 bg-cream-50/50 flex justify-center">
             <div className="flex bg-cream-200 p-0.5 rounded-lg w-full max-w-[150px]">
                <button 
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${isLogin ? 'bg-denim-700 text-white shadow-sm' : 'text-denim-500 hover:text-denim-700'}`}
                >
                  Masuk
                </button>
                <button 
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${!isLogin ? 'bg-denim-700 text-white shadow-sm' : 'text-denim-500 hover:text-denim-700'}`}
                >
                  Daftar
                </button>
             </div>
          </div>

          <div className="relative overflow-hidden">
            <div className="carousel-container" style={{ transform: isLogin ? 'translateX(0%)' : 'translateX(-50%)' }}>
              
              {/* --- LOGIN SECTION (Compact) --- */}
              <div className="carousel-item p-4">
                <form onSubmit={handleSubmit} className="space-y-2.5">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[10px] font-black text-center mb-2 flex flex-col items-center gap-1 animate-shake">
                      <div className="p-1 bg-white rounded-full shadow-sm">
                        {error.includes("internet") ? <WifiOff size={14} /> : <AlertCircle size={14} />}
                      </div>
                      <span className="uppercase tracking-tight leading-tight">{error}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[7px] font-black text-denim-400 uppercase tracking-widest mb-1 ml-1">Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:ring-1 focus:ring-denim-500 outline-none text-xs font-medium shadow-inner placeholder-denim-200" placeholder="email@anda.com" />
                  </div>
                  <div>
                    <label className="block text-[7px] font-black text-denim-400 uppercase tracking-widest mb-1 ml-1">Sandi</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:ring-1 focus:ring-denim-500 outline-none pr-10 text-xs font-medium shadow-inner placeholder-denim-200" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-denim-300 hover:text-denim-600 p-1 transition-colors">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-denim-700 hover:bg-denim-800 text-white font-black py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg mt-2 disabled:opacity-70 text-[10px] uppercase tracking-widest active:scale-95">
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <>Masuk <ArrowRight size={12} /></>}
                  </button>
                </form>
              </div>

              {/* --- REGISTER SECTION (Slim) --- */}
              <div className="carousel-item p-4">
                <div className="overflow-y-auto max-h-[45vh] no-scrollbar pr-0.5">
                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[10px] font-black text-center mb-2 flex flex-col items-center gap-1 animate-shake">
                         <div className="p-1 bg-white rounded-full shadow-sm">
                          {error.includes("internet") ? <WifiOff size={14} /> : <AlertCircle size={14} />}
                        </div>
                        <span className="uppercase tracking-tight leading-tight">{error}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-center mb-1">
                      <div className="relative w-12 h-12 rounded-xl bg-cream-100 border border-dashed border-denim-300 flex items-center justify-center cursor-pointer hover:bg-cream-200 transition-all overflow-hidden group shadow-inner" onClick={() => fileInputRef.current?.click()}>
                        {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <Camera size={16} className="text-denim-400" />}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload size={12} className="text-white" /></div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[7px] font-black text-denim-400 uppercase mb-0.5 ml-1">Nama</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:ring-1 focus:ring-denim-500 outline-none text-[10px] font-bold shadow-inner" placeholder="Nama" />
                      </div>
                      <div>
                        <label className="block text-[7px] font-black text-denim-400 uppercase mb-0.5 ml-1">No. HP</label>
                        <input type="number" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:ring-1 focus:ring-denim-500 outline-none text-[10px] font-bold shadow-inner" placeholder="08..." />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[7px] font-black text-denim-400 uppercase mb-0.5 ml-1">Email</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:ring-1 focus:ring-denim-500 outline-none text-[10px] font-medium shadow-inner" placeholder="email@baru.com" />
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <label className="block text-[7px] font-black text-denim-400 uppercase mb-0.5 ml-1">Sandi Baru</label>
                        <div className="relative">
                          <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full px-2 py-1.5 rounded-lg bg-cream-50 border text-denim-900 outline-none focus:ring-1 transition-all text-[10px] font-medium shadow-inner pr-8 ${password && !passwordStrength.isValid ? 'border-red-300' : 'border-cream-200 focus:ring-denim-50'}`} placeholder="••••••••" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-denim-300 p-0.5"><Eye size={12} /></button>
                        </div>
                        {password && !passwordStrength.isValid && <p className="text-[6px] text-red-500 mt-0.5 font-bold italic leading-tight">* Kapital, Angka, & Simbol.</p>}
                      </div>
                      <div>
                        <label className="block text-[7px] font-black text-denim-400 uppercase mb-0.5 ml-1">Konfirmasi</label>
                        <div className="relative">
                          <input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 outline-none focus:ring-1 focus:ring-denim-500 text-[10px] font-medium shadow-inner pr-8" placeholder="••••••••" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-denim-300 p-0.5"><Eye size={12} /></button>
                        </div>
                      </div>
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

      {/* --- Minimalist Footer --- */}
      <div className="mt-6 text-center text-denim-400 text-[7px] font-black uppercase tracking-[0.2em] z-10 flex flex-col items-center gap-1 opacity-50">
        <div className="flex items-center gap-2">
          <div className="h-[1px] w-3 bg-denim-200"></div>
          <p>HUD-HUD SECURE</p>
          <div className="h-[1px] w-3 bg-denim-200"></div>
        </div>
        <div className="flex items-center gap-1 text-denim-300 lowercase font-medium">
          <Lock size={8} />
          <span>End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
};
