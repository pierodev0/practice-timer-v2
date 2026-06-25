const CACHE_NAME = 'music-routine-v3-offline';

// Assets estáticos que SÍ existen en dist/ (sin hash)
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Install: solo cachear lo que sabemos que existe
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: tomar control + limpiar caches viejas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keyList) =>
        Promise.all(
          keyList
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
    ])
  );
});

// 3. Fetch: network-first, fallback a caché
self.addEventListener('fetch', (e) => {
  // No interceptar requests de chrome-extension ni de cache API
  if (!e.request.url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Cachear sólo respuestas válidas de nuestra origen o CDNs
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // No cachear cosas tipo text/event-stream o similares
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/event-stream')) {
              cache.put(e.request, clone);
            }
          });
        }
        return response;
      })
      .catch(() => {
        // Sin conexión — buscar en caché
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          // Si es navegación, servir index.html (SPA fallback)
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // Para CDNs offline, devolver respuesta vacía (mejor que error)
          return new Response('', { status: 200, statusText: 'OK' });
        });
      })
  );
});
