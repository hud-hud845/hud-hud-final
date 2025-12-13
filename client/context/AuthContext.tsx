
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
  deleteUser
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
    // Menjaga agar user tetap login meskipun browser direfresh/ditutup
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Gagal mengatur persistensi sesi:", error);
    });

    // Listener: Mendeteksi perubahan status login (Login/Logout/Register)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // JIKA USER LOGIN
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          // LOGIKA KHUSUS ADMIN
          const isAdminEmail = firebaseUser.email === ADMIN_EMAIL;
          
          if (isAdminEmail) {
            // Logika Admin (Tetap sama seperti sebelumnya)
            if (userSnapshot.exists()) {
              const existingData = userSnapshot.data();
              await updateDoc(userDocRef, { 
                status: 'online',
                isAdmin: true,
                lastSeen: new Date().toISOString()
              });
              setCurrentUser({ id: firebaseUser.uid, ...existingData, isAdmin: true } as User);
            } else {
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
                // Ambil data profil dari database
                setCurrentUser({ id: firebaseUser.uid, ...userSnapshot.data() } as User);
                updateDoc(userDocRef, { status: 'online' }).catch(console.error);
             } else {
                 // Kasus Register Baru:
                 // Saat registerUser berjalan, onAuthStateChanged akan terpanggil duluan sebelum data DB tersimpan.
                 // Kita biarkan dulu, nanti fungsi registerUser yang akan melakukan setCurrentUser manual.
             }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // JIKA USER LOGOUT
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
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
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error("Email atau password salah.");
      }
      throw error;
    }
  };

  // --- LOGIKA UTAMA: PENDAFTARAN ---
  const registerUser = async (data: RegisterData) => {
    const { email, password, name, phoneNumber, bio, avatarFile } = data;
    let userCredential;

    try {
      // LANGKAH 1: Buat Akun Auth (Email/Pass).
      // Fungsi ini OTOMATIS membuat user LOGIN di Firebase Auth.
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // LANGKAH 2: Validasi Nomor HP di Database.
      // Karena Langkah 1 sudah membuat kita Login, Security Rules sekarang Mengizinkan kita membaca database.
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
      const querySnapshot = await getDocs(q);

      // Cek apakah ada dokumen user LAIN (bukan saya) yang punya nomor HP sama
      const isDuplicate = !querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== uid);

      if (isDuplicate) {
        throw new Error("nomor_hp_duplicate");
      }

      // LANGKAH 3: Upload Avatar (Opsional)
      let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=154c79&color=fff&size=256`;
      if (avatarFile) {
        try { 
            avatarUrl = await uploadImageToCloudinary(avatarFile); 
        } catch (e) { 
            console.error("Gagal upload avatar, menggunakan default", e); 
        }
      }

      // LANGKAH 4: Simpan Data Profil ke Database
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
      
      // LANGKAH 5: Set State Lokal & Masuk Aplikasi
      // Dengan memanggil ini, App.tsx akan mendeteksi currentUser ada, dan langsung merender halaman Layout (Chat).
      setCurrentUser(newUser);

    } catch (error: any) {
      // ROLLBACK (PEMBATALAN): 
      // Jika ternyata Nomor HP duplikat atau gagal simpan database, 
      // Hapus akun Auth yang barusan dibuat di Langkah 1 agar data bersih kembali.
      if (userCredential && userCredential.user) {
         try {
           await deleteUser(userCredential.user);
         } catch (delErr) {
           console.error("Gagal rollback user:", delErr);
         }
      }

      if (error.message === "nomor_hp_duplicate") {
          throw new Error("Nomor HP telah digunakan oleh pengguna lain.");
      }
      if (error.code === 'auth/email-already-in-use') {
        throw new Error("Email ini sudah terdaftar. Silakan login.");
      }
      
      console.error("Register Error:", error);
      throw new Error("Gagal mendaftar. Periksa koneksi internet Anda.");
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
    
    // Cek duplikasi nomor HP saat update profil juga
    if (phoneNumber !== currentUser.phoneNumber) {
       const usersRef = collection(db, 'users');
       const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
       const querySnapshot = await getDocs(q);
       const isDuplicate = querySnapshot.docs.some(d => d.id !== currentUser.id);
       if (isDuplicate) throw new Error("Nomor HP telah digunakan.");
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.id);
      const updateData: any = { name, bio, phoneNumber };
      if (avatar) updateData.avatar = avatar;
      
      await updateDoc(userDocRef, updateData);
      setCurrentUser(prev => prev ? { ...prev, ...updateData } : null);
      
    } catch (error) {
      console.error("Update profile failed", error);
      throw error;
    }
  };

  const updateUserEmail = async (newEmail: string, currentPassword: string) => {
    if (auth.currentUser && currentUser) {
      try {
        const credential = EmailAuthProvider.credential(auth.currentUser.email || currentUser.email || '', currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updateEmail(auth.currentUser, newEmail);
        
        const userDocRef = doc(db, 'users', currentUser.id);
        await updateDoc(userDocRef, { email: newEmail });
        
        setCurrentUser(prev => prev ? { ...prev, email: newEmail } : null);
      } catch (error: any) {
        if (error.code === 'auth/wrong-password') throw new Error("Password salah.");
        if (error.code === 'auth/email-already-in-use') throw new Error("Email sudah digunakan.");
        throw new Error("Gagal update email.");
      }
    }
  };

  const updateUserPassword = async (newPassword: string, currentPassword: string) => {
    if (auth.currentUser && currentUser) {
      try {
        const credential = EmailAuthProvider.credential(auth.currentUser.email || currentUser.email || '', currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
      } catch (error: any) {
        if (error.code === 'auth/wrong-password') throw new Error("Password salah.");
        throw new Error("Gagal update password.");
      }
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
