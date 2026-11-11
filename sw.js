// Offline cache for the app shell. Bump VERSION whenever an asset changes.
const VERSION = 'v1';
const CACHE = `idlepage-${VERSION}`;

const ASSETS = [
    './',
    './index.html',
    './css/tailwind.css',
    './css/style.css',
    './js/calendar.js',
    './js/clock.js',
    './fonts/Inter.woff2',
    './fonts/sf-ui-display-medium.woff',
    './fonts/sf-ui-display-semibold.woff',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
    './favicon.ico',
    './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await cache.addAll(ASSETS);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE);

        // ignoreSearch so a bumped ?v= still hits the cached copy.
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;

        try {
            const response = await fetch(request);
            if (response.ok) cache.put(request, response.clone());
            return response;
        } catch (error) {
            if (request.mode === 'navigate') {
                const fallback = await cache.match('./index.html');
                if (fallback) return fallback;
            }
            throw error;
        }
    })());
});
