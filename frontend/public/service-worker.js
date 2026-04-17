/* global workbox */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

if (!self.workbox) {
  console.error('Workbox failed to load.');
} else {
  workbox.core.setCacheNameDetails({
    prefix: 'elearning',
    suffix: 'v1'
  });

  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  workbox.precaching.precacheAndRoute([
    { url: '/', revision: null },
    { url: '/index.html', revision: null },
    { url: '/manifest.json', revision: null },
    { url: '/vite.svg', revision: null }
  ]);

  // JS/CSS/font assets
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'font',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'app-shell-assets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 120,
          maxAgeSeconds: 7 * 24 * 60 * 60
        })
      ]
    })
  );

  // Fidel/media assets (images/audio) for offline learning
  workbox.routing.registerRoute(
    ({ url, request }) => {
      const destinationIsMedia = request.destination === 'image' || request.destination === 'audio';
      const uploadMediaPath = /\/uploads\/(images|audio)\//.test(url.pathname);
      const mediaExtension = /\.(png|jpg|jpeg|gif|svg|webp|mp3|wav|ogg)$/i.test(url.pathname);
      return destinationIsMedia || uploadMediaPath || mediaExtension;
    },
    new workbox.strategies.CacheFirst({
      cacheName: 'learning-media-assets',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 300,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          purgeOnQuotaError: true
        })
      ]
    })
  );

  // API GET requests: network-first with cache fallback
  workbox.routing.registerRoute(
    ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-get-cache',
      networkTimeoutSeconds: 4,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 120,
          maxAgeSeconds: 24 * 60 * 60
        })
      ]
    })
  );
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_NOW' });
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'SYNC_NOW') {
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SYNC_NOW' });
      });
    });
  }
});
