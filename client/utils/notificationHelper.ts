

/**
 * Helper untuk menangani Notifikasi Sistem (Browser/OS Native)
 * Tanpa Suara, hanya visual.
 */

// Meminta izin notifikasi browser
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log("Browser tidak mendukung notifikasi.");
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Mengirim Notifikasi Sistem (Muncul di Status Bar / Desktop saat minimize)
export const sendSystemNotification = (title: string, body: string, icon?: string) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    // Cek apakah halaman sedang terlihat (Visible)
    // Jika user sedang membuka aplikasi (document.visibilityState === 'visible'), 
    // biasanya kita tidak perlu notifikasi sistem, cukup In-App Bubble.
    // Tapi user meminta "bahkan saat aplikasi diminimize", jadi kita cek visibilitas.
    
    // Namun, agar konsisten, kita kirim saja. Browser modern biasanya otomatis
    // tidak memunculkan pop-up sistem jika tab sedang aktif/fokus, 
    // atau menumpuknya di action center.
    
    try {
      new Notification(title, {
        body: body,
        icon: icon || '/vite.svg', // Icon default jika avatar kosong
        badge: '/vite.svg', // Icon kecil untuk status bar Android
        tag: 'hud-hud-msg', // Tag agar notifikasi tidak menumpuk terlalu banyak
        renotify: true, // Getar/Muncul ulang jika ada pesan baru dengan tag sama
        silent: true // Pastikan Native Notification juga silent (sesuai request)
      } as any);
    } catch (e) {
      console.error("Gagal mengirim notifikasi sistem:", e);
    }
  }
};