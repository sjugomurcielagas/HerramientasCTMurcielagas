const CACHE_NAME = 'ct-murcielagas-pwa-v2';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const RUNTIME_CACHE = `${CACHE_NAME}-runtime`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/config.js',
  './assets/logo-murcielagas.webp',
  './assets/fadec-logo.webp',
  './assets/pwa-icon-192.png',
  './assets/pwa-icon-512.png',
  './analisis/index.html',
  './analisis/partidos/index.html',
  './analisis/penales/index.html',
  './antidoping/index.html',
  './base-datos/index.html',
  './concentraciones/index.html',
  './reportes/index.html',
  './tactica/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key.startsWith('ct-murcielagas-pwa-') && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isAppsScriptRequest(request) {
  return request.url.includes('script.google.com') || request.url.includes('googleapis.com') || request.url.includes('apps-script');
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return ['style:', 'script:', 'image:', 'font:'].includes(`${request.destination}:`) || url.origin === self.location.origin;
}

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (isAppsScriptRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || Response.error();
        })
    );
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone)).catch(() => {});
          return response;
        });
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('./index.html');
        return cached || caches.match('./');
      })
    );
  }
});