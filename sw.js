// TABI Service Worker — v4 (manifest + security)
var CACHE_NAME = 'tabi-v4';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/data.js',
  '/app.js',
  '/manifest.json'
];

// 설치: 정적 자산 캐시
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 활성화: 오래된 캐시 제거
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch 전략
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // API 요청 (Google Places proxy, photo) → Network-first
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Google Fonts → Cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(resp) {
            cache.put(e.request, resp.clone());
            return resp;
          });
        });
      })
    );
    return;
  }

  // HTML / CSS / JS → Cache-first, fallback network
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        var fetchPromise = fetch(e.request).then(function(resp) {
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, resp.clone()); });
          return resp;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 기타 → Network-first
  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match(e.request);
    })
  );
});
