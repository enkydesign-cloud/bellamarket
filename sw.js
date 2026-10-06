// Service worker minimal : permet l'installation de l'appli sur le téléphone.
// Il ne garde aucune copie en mémoire : l'appli se met toujours à jour depuis le réseau.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request));
});
