// firebase-messaging-sw.js
// FCM background message handler
// Served at /firebase-messaging-sw.js (repo root on Firebase Hosting)

// The compat SDK is required in service workers — they don't support ES module imports via importScripts
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
importScripts('/config.js');

firebase.initializeApp(self.APP_CONFIG.firebase);

const messaging = firebase.messaging();

// Handle background messages (app tab closed or not focused)
messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || self.APP_CONFIG.appName;
  const baseUrl = self.APP_CONFIG.appDomain + '/';
  const recipeId = payload.data?.recipeId;
  const type = payload.data?.type;
  const url = recipeId
    ? baseUrl + '?recipeId=' + recipeId
    : type === 'new_idea'
      ? baseUrl + '?chat=1'
      : baseUrl;
  const options = {
    body: payload.notification?.body || "Tonight's dinner suggestion is ready.",
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url }
  };
  self.registration.showNotification(title, options);
});

// On notification click: open or focus the app tab
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || self.APP_CONFIG.appDomain + '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.APP_CONFIG.appDomain) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
