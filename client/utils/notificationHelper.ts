
/**
 * Helper untuk menangani Notifikasi Sistem (Browser/OS Native)
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      return false;
    }
  }

  return false;
};

export const sendSystemNotification = (title: string, body: string, icon?: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: icon || '/vite.svg',
        badge: '/vite.svg',
        tag: 'hud-hud-msg',
        renotify: true,
        silent: true 
      } as any);
    } catch (e) {
      // Pada beberapa WebView Android, konstruktor Notification bisa gagal
      // Kita abaikan agar tidak menyebabkan white screen
    }
  }
};
