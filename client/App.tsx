import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/AuthPage';
import { MessageSquare } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';

// --- PERBAIKAN IMPORT DISINI ---
import { doc, updateDoc } from 'firebase/firestore';
// Kita arahkan ke folder services karena file kamu ada di sana
import { db } from './services/firebase'; 

const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    // 1. LOGIKA TOMBOL BACK (Keluar aplikasi jika di halaman utama)
    const setupBackButton = async () => {
      await CapApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapApp.exitApp();
        } else {
          window.history.back();
        }
      });
    };

    // 2. LOGIKA NOTIFIKASI
    const setupNotifications = async () => {
      // Listener saat registrasi token berhasil
      await PushNotifications.addListener('registration', async (token) => {
        console.log('Token FCM didapat:', token.value);
        
        // JIKA USER SUDAH LOGIN, UPDATE TOKEN KE FIRESTORE
        if (currentUser) {
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              fcmToken: token.value,
              lastTokenUpdate: new Date()
            });
            console.log('Token otomatis tersimpan di Firestore!');
          } catch (error) {
            console.error('Gagal update token ke Firestore:', error);
          }
        }
      });

      // Listener jika registrasi gagal
      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Gagal Registrasi Notifikasi:', err.error);
      });

      // Listener saat notifikasi masuk (Aplikasi sedang terbuka)
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notifikasi diterima:', notification);
      });

      // --- MINTA IZIN & DAFTARKAN ---
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
      }
    };

    setupBackButton();
    setupNotifications();

    // Cleanup listener saat komponen tidak digunakan
    return () => {
      CapApp.removeAllListeners();
      PushNotifications.removeAllListeners();
    };
  }, [currentUser]); // Trigger ulang jika currentUser berubah (misal baru login)

  // LOADING SCREEN (HUD-HUD STYLE)
  if (loading) {
    return (
      <div className="min-h-screen bg-denim-900 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-denim-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2 animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-cream-100 rounded-full mix-blend-multiply filter blur-3xl opacity-10 translate-x-1/2 translate-y-1/2 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-cream-50 rounded-2xl flex items-center justify-center shadow-2xl mb-6 animate-bounce">
            <MessageSquare size={40} className="text-denim-700" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-widest mb-2 animate-pulse">HUD-HUD</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cream-200 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-cream-200 rounded-full animate-bounce delay-150"></div>
            <div className="w-2 h-2 bg-cream-200 rounded-full animate-bounce delay-300"></div>
          </div>
          <p className="text-denim-300 text-xs mt-4 font-medium tracking-wide opacity-80">Memuat riwayat masuk...</p>
        </div>
      </div>
    );
  }

  // Tampilkan Layout jika sudah login, jika tidak tampilkan AuthPage
  return currentUser ? <Layout /> : <AuthPage />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;