// Marcus Mobile AI Service Worker v2
const CACHE_NAME = 'marcus-mobile-ai-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Always network-first for all requests to ensure updates are instantly loaded
  e.respondWith(
    fetch(e.request)
      .then((networkRes) => {
        return networkRes;
      })
      .catch(() => caches.match(e.request))
  );
});
