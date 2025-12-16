
// @ts-ignore
import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "../services/firebase";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

// Key Pair (VAPID) Anda
const VAPID_KEY = "BDKuwBGjHTJYoYUOCtnMzI1PY3_bvkGYCMPknZNhD7-7GRxmgWAYfpodq8Y5TqaUwK_JngkYq1bG-Eq5TGrNxJ4";

export const requestFcmToken = async (userId: string) => {
  if (!messaging) {
    console.warn("Messaging not initialized.");
    return null;
  }

  try {
    // 1. Cek Permission. 
    // Jika sudah granted, ini akan cepat. Jika belum, browser akan memunculkan popup native.
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // 2. Pastikan Service Worker Teregistrasi (PENTING untuk Mobile Background)
      let swRegistration;
      if ('serviceWorker' in navigator) {
        try {
            // Kita register ulang/pastikan SW aktif
            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } catch (swError) {
            console.error("SW Register Error:", swError);
            // Lanjut saja, mungkin sudah teregistrasi sebelumnya
        }
      }

      // 3. Dapatkan Token
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration
      });

      if (currentToken) {
        // 4. Simpan ke DB (Optimized: Cek dulu sebelum tulis)
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const existingTokens = userData.fcmTokens || [];
          
          if (!existingTokens.includes(currentToken)) {
              await updateDoc(userRef, {
                fcmTokens: arrayUnion(currentToken)
              });
              // console.log("FCM Token saved.");
          }
        }
        return currentToken;
      } else {
        console.warn('Gagal mendapatkan token FCM.');
        return null;
      }
    } else {
      console.log('User menolak notifikasi.');
      return null;
    }
  } catch (err) {
    // Log error tapi jangan biarkan aplikasi crash
    console.error('FCM Error:', err);
    return null;
  }
};

// Listener Foreground
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload: any) => {
      resolve(payload);
    });
  });
