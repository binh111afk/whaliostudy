const CACHE_NAME = 'whalio-cache-v2'; // Đổi tên cache để ép trình duyệt xóa cache cũ

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
    self.skipWaiting(); // Ép service worker mới chạy ngay lập tức
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_URLS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Xóa tất cả cache cũ không phải v2
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. KHÔNG BAO GIỜ CACHE API (Quan trọng nhất)
    if (url.pathname.startsWith('/api/')) {
        return; // Để mặc cho trình duyệt tự xử lý (gọi thẳng lên server)
    }

    // 2. Chiến thuật: Network First (Ưu tiên mạng) cho các file code
    // Giúp code mới luôn được cập nhật
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Tải được từ mạng -> Lưu bản mới vào cache -> Trả về
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                // Mất mạng -> Mới lôi cache ra dùng
                return caches.match(event.request);
            })
    );
});