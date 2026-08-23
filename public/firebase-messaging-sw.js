/**
 * Firebase Cloud Messaging background handler.
 *
 * A static file served as-is by Vite — it never passes through env
 * substitution — so the client config is passed via the registration URL's
 * query string (see src/lib/push.ts) rather than hardcoded or imported.
 * Firebase web config values are not secret (they're domain-restricted in
 * the Firebase console), so passing them in the URL is standard practice.
 */
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

const params = new URL(location).searchParams;
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();

// Background (app closed / backgrounded) push — shows an OS notification.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const link = payload.data?.link || '/mechanic';
  self.registration.showNotification(title || 'RedPiston', {
    body: body || '',
    icon: '/logo.png',
    data: { link },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/mechanic';
  event.waitUntil(self.clients.openWindow(link));
});
