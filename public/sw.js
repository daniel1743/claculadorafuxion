// Service Worker para Dashboard FuXion PWA
const CACHE_NAME = 'fuxion-dashboard-v1';

// Recursos para cachear (shell de la app)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalacion del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activacion - limpiar caches antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Network First con fallback a cache
self.addEventListener('fetch', (event) => {
  // Ignorar requests que no sean GET
  if (event.request.method !== 'GET') return;

  // Ignorar requests de API/Supabase (siempre network)
  if (event.request.url.includes('supabase.co')) return;

  // Ignorar WebSockets
  if (event.request.url.startsWith('ws:') || event.request.url.startsWith('wss:')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es valida, la guardamos en cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar desde cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Si es navegacion, devolver index.html (SPA)
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
