
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";

// KONFIGURASI FIREBASE (Hud-Hud Messenger)
const firebaseConfig = {
  apiKey: "AIzaSyCkSqqH33px6Xjf9GGGWQD0rdJ3wBHOgmw",
  authDomain: "hud-hud-mesenger.firebaseapp.com",
  projectId: "hud-hud-mesenger",
  storageBucket: "hud-hud-mesenger.firebasestorage.app",
  messagingSenderId: "809256298568",
  appId: "1:809256298568:web:6f53b87a06ff661d83907d",
  measurementId: "G-W6MBZC64V6"
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// Inisialisasi Analytics (Hanya di browser)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Ekspor service untuk digunakan di komponen lain
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export default app;
