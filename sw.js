'use strict';

const CACHE_VERSION = 'v3';
const CACHE_NAME = 'sfmc-guide-' + CACHE_VERSION;

const PRECACHE_URLS = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache immediately, refresh in background.
// Only cache same-origin GET requests; skip cross-origin (fonts, analytics).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        // `cache: 'reload'` bypasses the browser's HTTP cache. Without it the
        // revalidation can re-store the very copy it is meant to replace, so a
        // changed asset stays stale even after a cache-version bump.
        const networkFetch = fetch(event.request, { cache: 'reload' }).then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
        return cached || networkFetch;
      })
    )
  );
});
