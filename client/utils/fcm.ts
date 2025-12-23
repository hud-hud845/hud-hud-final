
// @ts-ignore
import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "../services/firebase";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

const VAPID_KEY = "BDKuwBGjHTJYoYUOCtnMzI1PY3_bvkGYCMPknZNhD7-7GRxmgWAYfpodq8Y5TqaUwK_JngkYq1bG-Eq5TGrNxJ4";

export const requestFcmToken = async (userId: string) => {
  if (!messaging) return null;

  try {
    // Check if Notification exists (Android WebView safe)
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      let swRegistration;
      if ('serviceWorker' in navigator) {
        try {
            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } catch (swError) {
            console.warn("SW registration ignored/failed:", swError);
        }
      }

      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration
      });

      if (currentToken) {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const existingTokens = userSnap.data().fcmTokens || [];
          if (!existingTokens.includes(currentToken)) {
              await updateDoc(userRef, { fcmTokens: arrayUnion(currentToken) });
          }
        }
        return currentToken;
      }
      return null;
    }
    return null;
  } catch (err) {
    console.warn('FCM registration skipped:', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve, reject) => {
    if (!messaging) return;
    try {
      onMessage(messaging, (payload: any) => {
        resolve(payload);
      });
    } catch (e) {
      // Ignore errors in listener
    }
  });
