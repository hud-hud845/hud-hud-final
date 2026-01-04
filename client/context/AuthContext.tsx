
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
import { doc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
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

const ADMIN_STANDARD = 'admin.h2@gmail.com';
const ADMIN_PRO = 'admin.h2h@gmail.com';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.Node }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Gagal mengatur persistensi sesi:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const isStandardAdmin = firebaseUser.email === ADMIN_STANDARD;
            const isSuperProAdmin = firebaseUser.email === ADMIN_PRO;
            
            setCurrentUser({ 
              id: firebaseUser.uid, 
              ...userData, 
              isAdmin: isStandardAdmin || isSuperProAdmin || userData.isAdmin,
              isProAdmin: isSuperProAdmin // Field khusus Super Admin Pro
            } as User & { isProAdmin: boolean });
            
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

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, provider);
    } catch (error) {
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

  const registerUser = async (data: RegisterData) => {
    const { email, password, name, phoneNumber, bio, avatarFile } = data;
    let userCredential;

    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
        const querySnapshot = await getDocs(q);
        const isDuplicate = !querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== uid);
        if (isDuplicate) throw new Error("nomor_hp_duplicate");
      } catch (dbError: any) {
        if (dbError.message === "nomor_hp_duplicate") throw dbError;
        throw dbError;
      }

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
        isProfessional: false
      };

      await setDoc(doc(db, 'users', uid), newUser);
    } catch (error: any) {
      if (userCredential && userCredential.user) try { await deleteUser(userCredential.user); } catch (e) {}
      if (error.message === "nomor_hp_duplicate") throw new Error("Nomor HP telah digunakan.");
      if (error.code === 'auth/email-already-in-use') throw new Error("Email sudah terdaftar.");
      throw new Error("Gagal mendaftar: " + error.message);
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.id), { status: 'offline', lastSeen: new Date().toISOString() });
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const updateProfile = async (name: string, bio: string, phoneNumber: string, avatar?: string) => {
    if (!currentUser) return;
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
      updateUserPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
