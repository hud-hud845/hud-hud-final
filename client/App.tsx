import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/AuthPage';
import { MessageSquare } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';

const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    // 1. LOGIKA TOMBOL BACK
    const setupBackButton = async () => {
      await CapApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapApp.exitApp();
        } else {
          window.history.back();
        }
      });
    };

    // 2. LOGIKA NOTIFIKASI & AMBIL TOKEN
    const setupNotifications = async () => {
      // Tambahkan Listener untuk menangkap Token saat registrasi berhasil
      await PushNotifications.addListener('registration', (token) => {
        // INI KUNCINYA: Token akan muncul di layar HP kamu
        console.log('Token FCM:', token.value);
        alert('COPY TOKEN INI UNTUK FIREBASE:\n\n' + token.value);
      });

      // Tambahkan Listener jika registrasi gagal
      await PushNotifications.addListener('registrationError', (err) => {
        alert('Gagal Registrasi: ' + err.error);
      });

      // Cek status izin
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

    return () => {
      CapApp.removeAllListeners();
      PushNotifications.removeAllListeners();
    };
  }, []);

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