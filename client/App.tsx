import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/AuthPage';
import { MessageSquare } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { Geolocation } from '@capacitor/geolocation';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from './services/firebase'; 

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

    // 2. LOGIKA IZIN MIKROFON & LOKASI
    const setupPermissions = async () => {
      try {
        // Minta Izin Mikrofon
        await VoiceRecorder.requestAudioRecordingPermission();
        
        // Minta Izin Lokasi
        const locPerm = await Geolocation.checkPermissions();
        if (locPerm.location === 'prompt' || locPerm.location === 'prompt-with-description') {
          await Geolocation.requestPermissions();
        }
      } catch (error) {
        console.error('Gagal meminta izin native:', error);
      }
    };

    // 3. LOGIKA NOTIFIKASI
    const setupNotifications = async () => {
      await PushNotifications.addListener('registration', async (token) => {
        if (currentUser) {
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              fcmToken: token.value,
              lastTokenUpdate: new Date()
            });
            console.log('Token FCM tersimpan!');
          } catch (error) {
            console.error('Gagal simpan token:', error);
          }
        }
      });

      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
      }
    };

    setupBackButton();
    setupPermissions();
    setupNotifications();

    return () => {
      CapApp.removeAllListeners();
      PushNotifications.removeAllListeners();
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-denim-900 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-cream-50 rounded-2xl flex items-center justify-center shadow-2xl mb-6 animate-bounce">
            <MessageSquare size={40} className="text-denim-700" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-widest mb-2 animate-pulse">HUD-HUD</h1>
          <p className="text-denim-300 text-xs mt-4 font-medium tracking-wide opacity-80">Memuat aplikasi...</p>
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