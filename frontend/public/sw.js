const CACHE_NAME = 'campus-food-v4';

// 動態獲取 base path（支援 /vendor/ 子目錄部署）
const getBasePath = () => {
    // sw.js 位於 /vendor/sw.js，所以取得 /vendor/
    const swPath = self.location.pathname;
    const basePath = swPath.substring(0, swPath.lastIndexOf('/') + 1);
    return basePath;
};

// Install: Skip waiting
self.addEventListener('install', () => {
    self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Firebase/external requests
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) return;

    // Handle navigation requests (SPA routing)
    if (event.request.mode === 'navigate') {
        const basePath = getBasePath();
        const indexPath = basePath + 'index.html';
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(indexPath))
                .then((response) => response || caches.match(indexPath))
        );
        return;
    }

    // Handle other requests
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response && response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(async () => {
                // Return from cache if network fails
                const cached = await caches.match(event.request);
                return cached || new Response('Not Found', { status: 404 });
            })
    );
});

