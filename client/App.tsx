import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/AuthPage';
import { App as CapApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from './services/firebase'; 
import InstallBanner from './components/InstallBanner';

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

    // 2. LOGIKA IZIN NATIVE
    const setupPermissions = async () => {
      try {
        await Camera.requestPermissions();
        await VoiceRecorder.requestAudioRecordingPermission();
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

  // --- TAMPILAN LOADING MINIMALIS ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#154c79] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Efek Spinner Halus (Opsional, bisa dihapus jika hanya ingin teks) */}
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          
          {/* Teks Sedang Memuat dengan Animasi Kedip (Pulse) */}
          <p className="text-white text-sm font-medium tracking-widest animate-pulse">
            sedang memuat data....
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentUser ? <Layout /> : <AuthPage />}
      <InstallBanner />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;