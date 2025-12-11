
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ArrowRight, Loader2, Eye, EyeOff, Camera, Upload } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { loginWithEmail, registerUser } = useAuth(); // Hapus loginWithGoogle
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
    setIsLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        // Validasi Manual
        if (phoneNumber.length < 11) {
          throw new Error("Nomor HP minimal 11 angka.");
        }
        if (password !== confirmPassword) {
          throw new Error("Konfirmasi password tidak cocok.");
        }
        if (password.length < 6) {
          throw new Error("Password minimal 6 karakter.");
        }

        await registerUser({
          email,
          password,
          name,
          phoneNumber,
          bio,
          avatarFile
        });
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Periksa data Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Menggunakan min-h-[100dvh] untuk mobile browser support yang lebih baik
    <div className="min-h-[100dvh] w-full bg-cream-50 flex flex-col items-center justify-center py-4 px-4 relative pattern-bg overflow-y-auto">
      
      {/* Brand Logo - Lebih kecil marginnya */}
      <div className={`flex flex-col items-center transition-all mb-4 shrink-0 z-10`}>
        <div className="w-12 h-12 bg-denim-700 rounded-xl flex items-center justify-center shadow-lg shadow-denim-900/20 mb-2">
          <MessageSquare size={24} className="text-cream-100" />
        </div>
        <h1 className="text-xl font-bold text-denim-900 tracking-tight">Hud-Hud</h1>
      </div>

      {/* Auth Card - Padding lebih kecil untuk mobile */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-denim-900/10 border border-cream-200 animate-in fade-in zoom-in duration-300 z-10 flex flex-col overflow-hidden">
        
        {/* Header Card */}
        <div className="px-5 py-4 border-b border-cream-100 bg-cream-50/50">
           <h2 className="text-lg font-bold text-denim-900 text-center">
            {isLogin ? 'Masuk' : 'Daftar Akun'}
          </h2>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar max-h-[70vh]">
          {error && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* --- REGISTER FIELDS --- */}
            {!isLogin && (
              <>
                {/* Avatar Upload - Compact */}
                <div className="flex justify-center mb-2">
                  <div 
                    className="relative w-16 h-16 rounded-full bg-cream-100 border-2 border-dashed border-denim-300 flex items-center justify-center cursor-pointer hover:bg-cream-200 transition-colors overflow-hidden group shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-denim-400">
                        <Camera size={20} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload size={16} className="text-white" />
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-denim-600 uppercase tracking-wider mb-1 ml-1">Nama <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500 placeholder-denim-300 text-sm"
                      placeholder="Nama"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-denim-600 uppercase tracking-wider mb-1 ml-1">No. HP <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500 placeholder-denim-300 text-sm"
                      placeholder="08..."
                      minLength={11}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-denim-600 uppercase tracking-wider mb-1 ml-1">Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500 placeholder-denim-300 resize-none h-14 text-sm leading-tight"
                    placeholder="Tentang saya..."
                  />
                </div>
              </>
            )}

            {/* --- COMMON FIELDS --- */}
            <div>
              <label className="block text-[10px] font-bold text-denim-600 uppercase tracking-wider mb-1 ml-1">Email <span className="text-red-500">*</span></label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500 transition-all placeholder-denim-300 text-sm"
                placeholder="email@contoh.com"
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold text-denim-600 uppercase tracking-wider mb-1 ml-1">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500 transition-all placeholder-denim-300 pr-10 text-sm"
                  placeholder="••••••"
                  minLength={6}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-denim-400 hover:text-denim-600 p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="relative">
                <label className="block text-[10px] font-bold text-denim-600 uppercase tracking-wider mb-1 ml-1">Konfirmasi <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-cream-50 border border-cream-200 text-denim-900 focus:outline-none focus:ring-1 focus:ring-denim-500 transition-all placeholder-denim-300 pr-10 text-sm"
                    placeholder="••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-denim-400 hover:text-denim-600 p-1"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-denim-700 hover:bg-denim-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-denim-700/20 mt-4 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Masuk Aplikasi' : 'Daftar Sekarang'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="px-5 py-3 bg-cream-100 border-t border-cream-200 text-center">
          <p className="text-xs text-denim-600">
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setAvatarPreview(null);
                setAvatarFile(null);
              }}
              className="font-bold text-denim-800 hover:underline focus:outline-none ml-1"
            >
              {isLogin ? 'Daftar' : 'Masuk'}
            </button>
          </p>
        </div>
      </div>

      <div className="mt-4 text-center text-denim-400 text-[10px] shrink-0">
        <p>© 2024 Hud-Hud Web. Aman & Terpercaya.</p>
      </div>
    </div>
  );
};
