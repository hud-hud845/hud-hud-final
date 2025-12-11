
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User } from '../types';
import { uploadImageToCloudinary } from '../services/cloudinary';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  bio: string;
  avatarFile?: File | null;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerUser: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, bio: string, phoneNumber: string, avatar?: string) => Promise<void>;
  updateUserEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  updateUserPassword: (newPassword: string, currentPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// KONFIGURASI ADMIN
const ADMIN_EMAIL = 'admin.h2@gmail.com';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Gagal mengatur persistensi sesi:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          // LOGIKA KHUSUS ADMIN
          const isAdminEmail = firebaseUser.email === ADMIN_EMAIL;
          
          if (isAdminEmail) {
            if (userSnapshot.exists()) {
              const existingData = userSnapshot.data();
              
              // Hapus overwrite profil paksa. Hanya pastikan isAdmin true.
              await updateDoc(userDocRef, { 
                status: 'online',
                isAdmin: true,
                lastSeen: new Date().toISOString()
              });
              
              // Load data apa adanya dari database (hasil editan admin)
              setCurrentUser({ 
                id: firebaseUser.uid, 
                ...existingData,
                isAdmin: true 
              } as User);
            } else {
              // HANYA JIKA DOKUMEN BELUM ADA (Login Pertama Kali) -> Buat Default
              const newAdmin: User = {
                 id: firebaseUser.uid,
                 name: 'Hud-Hud', 
                 email: ADMIN_EMAIL,
                 phoneNumber: '019490708',
                 bio: 'Official Admin Hud-Hud',
                 avatar: 'https://ui-avatars.com/api/?name=Hud-Hud&background=154c79&color=fff&size=256',
                 status: 'online',
                 lastSeen: new Date().toISOString(),
                 isAdmin: true
              };
              await setDoc(userDocRef, newAdmin);
              setCurrentUser(newAdmin);
            }
          } else {
             // USER BIASA
             if (userSnapshot.exists()) {
                setCurrentUser({ id: firebaseUser.uid, ...userSnapshot.data() } as User);
                updateDoc(userDocRef, { status: 'online' }).catch(console.error);
             } else {
                // Fallback register (should rarely happen with AuthPage flow)
                const newUser: User = {
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || 'Pengguna Tanpa Nama',
                  email: firebaseUser.email || '',
                  phoneNumber: '',
                  avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName}&background=0D8ABC&color=fff`,
                  bio: 'Ada di Hud-Hud',
                  status: 'online',
                  lastSeen: new Date().toISOString(),
                  isAdmin: false
                };
                await setDoc(userDocRef, newUser);
                setCurrentUser(newUser);
             }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    // Fungsi ini tidak digunakan lagi sesuai request, tapi dibiarkan untuk backward compatibility jika perlu
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-email'
      ) {
        throw new Error("email atau password salah");
      }
      throw error;
    }
  };

  const registerUser = async (data: RegisterData) => {
    const { email, password, name, phoneNumber, bio, avatarFile } = data;

    // 1. Cek Validasi Nomor HP Unik di Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error("nomor hp telah digunakan");
    }

    try {
      // 2. Buat Akun Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 3. Upload Avatar
      let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=154c79&color=fff&size=256`;
      if (avatarFile) {
        try { avatarUrl = await uploadImageToCloudinary(avatarFile); } catch (e) { console.error(e); }
      }

      // 4. Simpan Data ke Firestore
      const newUser: User = {
        id: uid,
        name,
        email,
        phoneNumber,
        bio: bio || 'Ada di Hud-Hud',
        avatar: avatarUrl,
        status: 'online',
        lastSeen: new Date().toISOString(),
        isAdmin: false
      };

      await setDoc(doc(db, 'users', uid), newUser);
      setCurrentUser(newUser);

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error("email sudah terdaftar");
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.id);
        await updateDoc(userDocRef, { status: 'offline', lastSeen: new Date().toISOString() });
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const updateProfile = async (name: string, bio: string, phoneNumber: string, avatar?: string) => {
    if (!currentUser) return;
    
    // Validasi HP jika berubah
    if (phoneNumber !== currentUser.phoneNumber) {
       const usersRef = collection(db, 'users');
       const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
       const querySnapshot = await getDocs(q);
       const isDuplicate = querySnapshot.docs.some(d => d.id !== currentUser.id);
       if (isDuplicate) throw new Error("nomor hp telah digunakan");
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.id);
      
      const updateData: any = { name, bio, phoneNumber };
      if (avatar) {
        updateData.avatar = avatar;
      }
      
      await updateDoc(userDocRef, updateData);
      
      // Update state lokal
      setCurrentUser(prev => prev ? { ...prev, ...updateData } : null);
      
    } catch (error) {
      console.error("Update profile failed", error);
      throw error;
    }
  };

  // FUNGSI UPDATE EMAIL DENGAN RE-AUTH
  const updateUserEmail = async (newEmail: string, currentPassword: string) => {
    if (auth.currentUser && currentUser) {
      try {
        // 1. Re-authenticate
        const credential = EmailAuthProvider.credential(auth.currentUser.email || currentUser.email || '', currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);

        // 2. Update Email di Auth
        // Catatan: Jika 'updateEmail' gagal dengan operation-not-allowed, biasanya karena aturan keamanan Firebase
        // yang mengharuskan verifikasi email baru sebelum diganti ('verifyBeforeUpdateEmail').
        // Namun, kita coba updateEmail dulu.
        try {
            await updateEmail(auth.currentUser, newEmail);
        } catch (updateErr: any) {
            // Jika error spesifik operation-not-allowed, coba metode verifikasi jika lingkungan mendukung,
            // atau lempar pesan yang jelas.
            if (updateErr.code === 'auth/operation-not-allowed') {
                 // Fallback: Jika update langsung tidak diizinkan, gunakan verifyBeforeUpdateEmail 
                 // (ini akan mengirim email verifikasi, bukan langsung ganti)
                 // await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
                 // throw new Error("Link verifikasi telah dikirim ke email baru. Silakan verifikasi untuk menyelesaikan perubahan.");
                 
                 // Namun user meminta "Berhasil". Jika error ini muncul, berarti admin project (Anda) 
                 // perlu mengaktifkan Email Provider di console atau menonaktifkan "Email enumeration protection".
                 // Kita lempar error generik yang sopan.
                 throw new Error("Perubahan email dibatasi oleh sistem keamanan.");
            }
            throw updateErr;
        }
        
        // 3. Update Email di Firestore
        const userDocRef = doc(db, 'users', currentUser.id);
        await updateDoc(userDocRef, { email: newEmail });
        
        setCurrentUser(prev => prev ? { ...prev, email: newEmail } : null);

      } catch (error: any) {
        // Mapping Error Code ke Bahasa Manusia
        switch (error.code) {
          case 'auth/email-already-in-use':
            throw new Error("Email sudah terdaftar");
          case 'auth/invalid-email':
            throw new Error("Format email salah");
          case 'auth/wrong-password':
            throw new Error("Password saat ini salah");
          case 'auth/too-many-requests':
            throw new Error("Terlalu banyak percobaan. Silakan tunggu sebentar.");
          case 'auth/user-mismatch':
          case 'auth/user-not-found':
            throw new Error("Kesalahan sesi. Silakan login ulang.");
          default:
            // Tangkap pesan error lain dan bersihkan
            console.error("Error Detail:", error.code, error.message);
            throw new Error(error.message.replace('Firebase:', '').replace(/\(auth\/.*\)/, '').trim() || "Gagal mengubah email");
        }
      }
    } else {
        throw new Error("Sesi tidak valid");
    }
  };

  // FUNGSI UPDATE PASSWORD DENGAN RE-AUTH
  const updateUserPassword = async (newPassword: string, currentPassword: string) => {
    if (auth.currentUser && currentUser) {
      try {
        // 1. Re-authenticate
        const credential = EmailAuthProvider.credential(auth.currentUser.email || currentUser.email || '', currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);

        // 2. Update Password
        await updatePassword(auth.currentUser, newPassword);
      } 
      catch (error: any) { 
        // Mapping Error Code
        switch (error.code) {
            case 'auth/weak-password':
                throw new Error("Format password tidak sesuai (minimal 6 karakter)");
            case 'auth/wrong-password':
                throw new Error("Password saat ini salah");
            case 'auth/too-many-requests':
                throw new Error("Terlalu banyak percobaan. Tunggu sebentar.");
            default:
                throw new Error("Gagal mengubah password");
        }
      }
    } else {
        throw new Error("Sesi tidak valid");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      registerUser, 
      logout, 
      updateProfile,
      updateUserEmail,
      updateUserPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
