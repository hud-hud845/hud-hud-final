
// Scripts for firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 1. Inisialisasi Firebase di dalam Service Worker (Background)
const firebaseConfig = {
  apiKey: "AIzaSyCkSqqH33px6Xjf9GGGWQD0rdJ3wBHOgmw",
  authDomain: "hud-hud-mesenger.firebaseapp.com",
  projectId: "hud-hud-mesenger",
  storageBucket: "hud-hud-mesenger.firebasestorage.app",
  messagingSenderId: "809256298568",
  appId: "1:809256298568:web:6f53b87a06ff661d83907d",
  measurementId: "G-W6MBZC64V6"
};

firebase.initializeApp(firebaseConfig);

// 2. Retrieve messaging object
const messaging = firebase.messaging();

// 3. Handle Background Messages
// Ini yang dijalankan saat browser/tab TERTUTUP (Background)
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Background message received ', payload);
  
  // LOGIKA TAMPILAN NOTIFIKASI SESUAI REQUEST:
  // Judul: "Hud-Hud: [Nama Pengirim]"
  // Body: "[Isi Pesan]"
  // Link: Disembunyikan sebisa mungkin (Browser tetap akan menampilkan origin domain kecil di bawah demi keamanan)
  
  // Ambil data dari payload yang dikirim backend/console
  const originalTitle = payload.notification.title || "Pesan Baru";
  const originalBody = payload.notification.body || "Anda memiliki pesan baru.";
  
  // Format Ulang:
  // Jika title asli sudah mengandung nama pengirim, gunakan itu.
  // Jika title asli generik, kita set "Hud-Hud".
  let finalTitle = "Hud-Hud";
  let finalBody = originalBody;

  // Jika payload title bukan "Pesan Baru", asumsikan itu nama pengirim
  if (originalTitle && originalTitle !== "Pesan Baru") {
      finalTitle = `Hud-Hud: ${originalTitle}`;
  }

  const notificationOptions = {
    body: finalBody,
    icon: '/vite.svg', // Icon Aplikasi
    badge: '/vite.svg', // Icon kecil monokrom untuk status bar Android
    tag: 'hud-hud-message', // Grouping agar tidak menumpuk
    renotify: true, // Getar ulang jika ada pesan baru
    vibrate: [200, 100, 200], // Pola getar
    data: {
        url: '/' // URL tujuan saat diklik
    }
  };

  return self.registration.showNotification(finalTitle, notificationOptions);
});

// 4. Handle Notification Click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Buka aplikasi saat notifikasi diklik
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Cek apakah ada tab yang sudah terbuka
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak ada, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
