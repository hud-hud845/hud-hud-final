
import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "../services/firebase";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

// GUNAKAN KEY PAIR (PUBLIC KEY) DISINI.
// Private Key JANGAN DIMASUKKAN KE SINI.
const VAPID_KEY = "BDKuwBGjHTJYoYUOCtnMzI1PY3_bvkGYCMPknZNhD7-7GRxmgWAYfpodq8Y5TqaUwK_JngkYq1bG-Eq5TGrNxJ4";

export const requestFcmToken = async (userId: string) => {
  if (!messaging) {
    console.error("Messaging not supported/initialized");
    return null;
  }

  try {
    // 1. Cek Permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // 2. Register Service Worker secara manual untuk memastikan file ditemukan
      let swRegistration;
      if ('serviceWorker' in navigator) {
        try {
            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } catch (swError) {
            console.error("Service Worker registration failed:", swError);
        }
      }

      // 3. Dapatkan Token FCM
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration
      });

      if (currentToken) {
        // 4. Simpan Token ke Database User
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          // Cek dulu apakah token sudah ada biar tidak write terus menerus
          const userData = userSnap.data();
          const existingTokens = userData.fcmTokens || [];
          
          if (!existingTokens.includes(currentToken)) {
              await updateDoc(userRef, {
                fcmTokens: arrayUnion(currentToken)
              });
              console.log("Token FCM Baru Disimpan:", currentToken);
          } else {
              console.log("Token FCM sudah ada di database.");
          }
        }
        return currentToken;
      } else {
        console.log('No registration token available.');
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
