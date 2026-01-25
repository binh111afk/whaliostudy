const CACHE_NAME = 'whalio-cache-v9999'; // Update version to force cache refresh

const STATIC_CACHE_URLS = [
    './index.html',
    './home.css',
    './community.css',
    './js/main.js',
    './js/config.js',
    './js/auth.js',
    './js/state.js',
    './js/profile.js',
    './js/timetable.js',
    './js/exam.js',
    './js/docs.js',
    './js/community.js',
    './js/flashcard.js',
    './js/gpa-calculator.js',
    './js/timer.js',
    './js/icons.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_URLS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // 1. CHẶN LỖI CHROME-EXTENSION (Quan trọng)
    if (!event.request.url.startsWith('http')) {
        return; 
    }

    const url = new URL(event.request.url);

    // 2. Không cache API
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // 3. Network First cho file code
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});