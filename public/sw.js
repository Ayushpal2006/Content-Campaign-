const STATIC_CACHE = 'infinity-static-v2';
const STATIC_ASSETS = ['/manifest.webmanifest', '/favicon.svg', '/icons/infinity-192.png', '/icons/infinity-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never cache login/session, Apps Script responses, or application HTML.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || request.mode === 'navigate') return;
  if (!['style', 'script', 'font', 'image', 'manifest'].includes(request.destination)) return;
  event.respondWith(caches.match(request).then((cached) => {
    const fresh = fetch(request).then((response) => {
      // Some browsers/extensions hand back an already-consumed response. Static
      // caching is optional, so never let clone/cache failures break the page.
      if (response.ok && !response.bodyUsed) {
        try {
          const cacheCopy = response.clone();
          caches.open(STATIC_CACHE)
            .then((cache) => cache.put(request, cacheCopy))
            .catch(() => {});
        } catch (_) {}
      }
      return response;
    }).catch(() => cached);
    return cached || fresh;
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/videos';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows[0];
    if (existing) {
      existing.navigate(target);
      return existing.focus();
    }
    return clients.openWindow(target);
  }));
});
