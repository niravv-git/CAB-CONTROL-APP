// CABwise PWA Service Worker
// Version: 1.0.0

const CACHE_NAME = 'cabwise-v1';
const OFFLINE_PAGE = './offline.html';

// Files to cache on install (App Shell)
const PRECACHE_ASSETS = [
  './index.html',
  './offline.html',
  './manifest.json',
  './css/style.css',
  './js/store.js',
  './js/utils.js',
  './js/app.js',
  './js/sheets/dashboard.js',
  './js/sheets/owners.js',
  './js/sheets/cabs.js',
  './js/sheets/drivers.js',
  './js/sheets/reminders.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// External CDN resources to cache
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// ─────────────────────────────────────────────
// INSTALL: pre-cache all app shell assets
// ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets (required)
      const localCaching = cache.addAll(PRECACHE_ASSETS);

      // Cache CDN assets (best-effort, don't fail install if CDN is down)
      const cdnCaching = Promise.allSettled(
        CDN_ASSETS.map(url =>
          fetch(url).then(res => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => {})
        )
      );

      return Promise.all([localCaching, cdnCaching]);
    }).then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────────
// ACTIVATE: clean up old caches
// ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────
// FETCH: Cache-first strategy for app shell,
// Network-first for everything else
// ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET requests (POST, etc.)
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http requests
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // Cache-first for local app shell files
  const isLocalAsset = PRECACHE_ASSETS.some(asset =>
    request.url.includes(asset.replace('./', ''))
  );

  if (isLocalAsset || url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          }
          return response;
        }).catch(() => {
          // If offline and requesting a page, show offline page
          if (request.destination === 'document') {
            return caches.match(OFFLINE_PAGE);
          }
        });
      })
    );
    return;
  }

  // Network-first for CDN assets (fonts, icons, chart.js)
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ─────────────────────────────────────────────
// MESSAGE: force update from the app
// ─────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
