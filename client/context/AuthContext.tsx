
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
import { doc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot, getDoc } from 'firebase/firestore';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { auth, db, rtdb } from '../services/firebase';
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
  getDeviceId: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_STANDARD = 'admin.h2@gmail.com';
const ADMIN_PRO = 'admin.h2h@gmail.com';

// Fungsi generate Device ID unik untuk browser ini
const generateDeviceId = () => {
  let id = localStorage.getItem('hudhud_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('hudhud_device_id', id);
  }
  return id;
};

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
  const [deviceId] = useState(generateDeviceId());

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Gagal mengatur persistensi sesi:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const isStandardAdmin = firebaseUser.email === ADMIN_STANDARD;
            const isSuperProAdmin = firebaseUser.email === ADMIN_PRO;
            
            const userObj = { 
              id: firebaseUser.uid, 
              ...userData, 
              isAdmin: isStandardAdmin || isSuperProAdmin || userData.isAdmin,
              isProAdmin: isSuperProAdmin 
            } as User & { isProAdmin: boolean };

            setCurrentUser(userObj);
            
            if (userData.status !== 'online') {
              updateDoc(userDocRef, { status: 'online' }).catch(() => {});
            }
          }
          setLoading(false);
        }, (error) => {
          setLoading(false);
        });

        return () => unsubDoc();
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const checkConnection = () => {
    if (!navigator.onLine) {
      throw { code: 'auth/network-request-failed', message: 'Miskin Ya Bro, Kok Gak terhubung ke internet sih?' };
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    checkConnection();
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      
      // LOGIKA VALIDASI DEVICE SETELAH LOGIN BERHASIL
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const activeDeviceId = data.currentDeviceId;

        // Jika sudah ada device lain yang terdaftar dan berbeda dengan device saat ini
        if (activeDeviceId && activeDeviceId !== deviceId) {
          // Trigger Permohonan Izin di RTDB
          const permissionRef = ref(rtdb, `login_permissions/${userCred.user.uid}`);
          await set(permissionRef, {
            requestedBy: deviceId,
            status: 'pending',
            timestamp: Date.now()
          });

          // Kita lempar error khusus agar UI AuthPage menangkap flow "Waiting Permission"
          throw { code: 'auth/device-permission-required', message: 'Izin Perangkat Diperlukan' };
        } else {
          // Jika device pertama kali atau device yang sama, langsung kunci ke device ini
          await updateDoc(doc(db, 'users', userCred.user.uid), {
            currentDeviceId: deviceId
          });
        }
      }
    } catch (error: any) {
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    checkConnection();
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCred = await signInWithPopup(auth, provider);
      
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.currentDeviceId && data.currentDeviceId !== deviceId) {
          const permissionRef = ref(rtdb, `login_permissions/${userCred.user.uid}`);
          await set(permissionRef, { requestedBy: deviceId, status: 'pending', timestamp: Date.now() });
          throw { code: 'auth/device-permission-required', message: 'Izin Perangkat Diperlukan' };
        } else {
          await updateDoc(doc(db, 'users', userCred.user.uid), { currentDeviceId: deviceId });
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const registerUser = async (data: RegisterData) => {
    checkConnection();
    const { email, password, name, phoneNumber, bio, avatarFile } = data;
    let userCredential;

    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=154c79&color=fff&size=256`;
      if (avatarFile) {
        try { avatarUrl = await uploadImageToCloudinary(avatarFile); } catch (e) {}
      }

      const newUser: any = {
        id: uid,
        name,
        email,
        phoneNumber,
        bio: bio || 'Ada di Hud-Hud',
        avatar: avatarUrl,
        status: 'online',
        lastSeen: new Date().toISOString(),
        isAdmin: email === ADMIN_STANDARD || email === ADMIN_PRO,
        isProfessional: false,
        currentDeviceId: deviceId // Langsung kunci ke device pendaftar
      };

      await setDoc(doc(db, 'users', uid), newUser);
    } catch (error: any) {
      if (userCredential && userCredential.user) try { await deleteUser(userCredential.user); } catch (e) {}
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.id), { 
          status: 'offline', 
          lastSeen: new Date().toISOString(),
          currentDeviceId: null // Lepas kunci device saat logout manual
        });
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const updateProfile = async (name: string, bio: string, phoneNumber: string, avatar?: string) => {
    if (!currentUser) return;
    checkConnection();
    try {
      const userDocRef = doc(db, 'users', currentUser.id);
      const updateData: any = { name, bio, phoneNumber };
      if (avatar) updateData.avatar = avatar;
      await updateDoc(userDocRef, updateData);
    } catch (error) {
      throw error;
    }
  };

  const updateUserEmail = async (newEmail: string, currentPassword: string) => {
    if (auth.currentUser && currentUser) {
      checkConnection();
      try {
        const credential = EmailAuthProvider.credential(auth.currentUser.email || currentUser.email || '', currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updateEmail(auth.currentUser, newEmail);
        await updateDoc(doc(db, 'users', currentUser.id), { email: newEmail });
      } catch (error: any) {
        throw error;
      }
    }
  };

  const updateUserPassword = async (newPassword: string, currentPassword: string) => {
    if (auth.currentUser && currentUser) {
      checkConnection();
      try {
        const credential = EmailAuthProvider.credential(auth.currentUser.email || currentUser.email || '', currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
      } catch (error: any) {
        throw error;
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
      updateUserPassword,
      getDeviceId: () => deviceId
    }}>
      {children}
    </AuthContext.Provider>
  );
};
