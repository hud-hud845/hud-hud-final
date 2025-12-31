
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './client/App';

// Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => console.log('PWA Service Worker terdaftar:', reg.scope))
      .catch(err => console.log('PWA Service Worker gagal:', err));
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
