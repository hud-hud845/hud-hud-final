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

  // Jika masih loading status auth dari Firebase, kita kembalikan null (layar polos) 
  // agar Splash Screen bawaan PWA tetap terlihat sampai halaman siap.
  if (loading) return null;

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