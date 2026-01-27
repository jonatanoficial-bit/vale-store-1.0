/*
 * service-worker.js (Parte 5)
 * PWA offline-first simples (0 custo).
 *
 * Cacheia páginas e assets essenciais para melhorar performance e dar
 * sensação de app instalado.
 */

const CACHE_NAME = 'appvault-cache-v1';

// Rotas principais (ajuste se publicar em subpasta)
const CORE_ASSETS = [
  './',
  './index.html',
  './product.html',
  './checkout.html',
  './deliver.html',
  './library.html',
  './admin.html',
  './terms.html',
  './privacy.html',
  './about.html',
  './support.html',
  './css/styles.css',
  './js/main.js',
  './js/product.js',
  './js/checkout.js',
  './js/deliver.js',
  './js/library.js',
  './js/admin.js',
  './js/pwa.js',
  './assets/hero.png',
  './assets/default-app.png',
  './content/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Estratégia: cache-first para assets, network-first para content (para atualizar catálogo)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  const isContent = url.pathname.includes('/content/') || url.pathname.endsWith('manifest.json');

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (isContent) {
        try {
          const fresh = await fetch(event.request);
          cache.put(event.request, fresh.clone());
          return fresh;
        } catch {
          const cached = await cache.match(event.request);
          return cached || new Response('Offline', { status: 503 });
        }
      }

      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const fresh = await fetch(event.request);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});
