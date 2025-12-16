
import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "../services/firebase";
import { doc, updateDoc, arrayUnion, setDoc, getDoc } from "firebase/firestore";
import { User } from "../types";

// Key dari Firebase Console Anda
const VAPID_KEY = "BDKuwBGjHTJYoYUOCtnMzI1PY3_bvkGYCMPknZNhD7-7GRxmgWAYfpodq8Y5TqaUwK_JngkYq1bG-Eq5TGrNxJ4"; 

export const requestFcmToken = async (userId: string) => {
  if (!messaging) return null;

  try {
    // 1. Minta Izin Browser
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // 2. Dapatkan Token FCM (ID unik perangkat ini)
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });

      if (currentToken) {
        // 3. Simpan Token ke Database User
        // Kita gunakan arrayUnion agar satu user bisa punya banyak HP/Laptop (banyak token)
        const userRef = doc(db, 'users', userId);
        
        // Cek dulu apakah user doc ada (jaga-jaga)
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(currentToken)
          });
        }
        
        console.log("FCM Token Generated & Saved:", currentToken);
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.log('Izin notifikasi ditolak.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

// Listener untuk pesan saat aplikasi SEDANG DIBUKA (Foreground)
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
