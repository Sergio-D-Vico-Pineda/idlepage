// Offline cache for the app shell.
// VERSION and ASSETS are rewritten by scripts/build.mjs on every build.

const VERSION = 'bb3a68be';
const ASSETS = [
    './',
    './index.html',
    './css/tailwind.css?v=3d12eb5a',
    './css/style.css?v=f3c226e0',
    './js/calendar.js?v=b784226e',
    './js/clock.js?v=c5fce605',
    './fonts/Inter.woff2',
    './fonts/sf-ui-display-medium.woff',
    './fonts/sf-ui-display-semibold.woff',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
    './icons/favicon.ico?v=5b26ad79',
    './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(`idlepage-${VERSION}`);
        await cache.addAll(ASSETS);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    const current = `idlepage-${VERSION}`;
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key !== current).map((key) => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    event.respondWith((async () => {
        // ignoreSearch: the ?v= cache buster must not miss the cached copy.
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;

        try {
            const response = await fetch(request);
            if (response.ok) {
                const cache = await caches.open(`idlepage-${VERSION}`);
                cache.put(request, response.clone());
            }
            return response;
        } catch (error) {
            if (request.mode === 'navigate') {
                const fallback = await caches.match('./index.html', { ignoreSearch: true });
                if (fallback) return fallback;
            }
            throw error;
        }
    })());
});
