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
  './antidoping/patch.js',
  './base-datos/index.html',
  './base-datos/patch.js',
  './concentraciones/index.html',
  './reportes/index.html',
  './reportes/patch.js',
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
  if (request.mode === 'navigate') return false;
  return ['style:', 'script:', 'image:', 'font:'].includes(`${request.destination}:`) || (url.origin === self.location.origin && request.destination !== 'document');
}

function injectPatchScript(html, scriptSrc) {
  if (!html || !scriptSrc || html.includes(scriptSrc)) return html;
  const tag = `<script src="${scriptSrc}"></script>`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${tag}</body>`);
  }
  return `${html}${tag}`;
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

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) return response;

        const url = new URL(request.url);
        let html = await response.text();
        if (/\/antidoping\/?(?:index\.html)?$/i.test(url.pathname)) {
          html = injectPatchScript(html, './patch.js');
        } else if (/\/base-datos\/?(?:index\.html)?$/i.test(url.pathname)) {
          html = injectPatchScript(html, './patch.js');
        } else if (/\/reportes\/?(?:index\.html)?$/i.test(url.pathname)) {
          html = injectPatchScript(html, './patch.js');
        }

        const headers = new Headers(response.headers);
        headers.delete('content-length');
        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (error) {
        const cached = await caches.match('./index.html');
        return cached || caches.match('./');
      }
    })());
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

});
