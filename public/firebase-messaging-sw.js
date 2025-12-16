
// Scripts for firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 1. Inisialisasi Firebase di dalam Service Worker (Background)
// Config ini HARUS sama persis dengan yang ada di client/services/firebase.ts
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
// Ini yang akan jalan kalau Web/Tab DITUTUP
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/vite.svg', // Pastikan icon ada di public folder
    badge: '/vite.svg',
    tag: 'hud-hud-v1', // Grouping notifikasi
    renotify: true,
    data: payload.data // Custom data (misal chat_id untuk redirect saat diklik)
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 4. Handle Notification Click
// Saat notifikasi diklik, buka tab baru atau fokus ke tab yang sudah ada
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  // URL yang mau dibuka (Halaman Chat)
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Cek apakah tab sudah terbuka?
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
