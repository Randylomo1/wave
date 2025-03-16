const CACHE_NAME = 'wave-logistics-v1';
const STATIC_CACHE_URLS = [
    '/',
    '/static/css/main.css',
    '/static/js/main.js',
    '/static/js/payment.js',
    '/static/main/img/logo.png',
    '/static/main/img/favicon-32x32.png',
    '/static/main/img/favicon-16x16.png',
    '/static/main/img/apple-touch-icon.png',
    '/static/main/manifest.json',
    '/offline.html',
    '/static/main/img/offline.svg'
];

const DYNAMIC_CACHE = 'dynamic-v1';
const FORM_CACHE = 'form-data-v1';
const API_CACHE = 'api-data-v1';

// Cache strategies
const cacheStrategies = {
    cacheFirst: async (request) => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
            const response = await fetch(request);
            await cache.put(request, response.clone());
            return response;
        } catch (error) {
            return null;
        }
    },

    networkFirst: async (request) => {
        try {
            const response = await fetch(request);
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, response.clone());
            return response;
        } catch (error) {
            const cached = await caches.match(request);
            return cached || null;
        }
    },

    staleWhileRevalidate: async (request) => {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cached = await cache.match(request);

        const networkPromise = fetch(request).then(response => {
            cache.put(request, response.clone());
            return response;
        });

        return cached || networkPromise;
    }
};

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME)
                .then(cache => cache.addAll(STATIC_CACHE_URLS)),
            caches.open(DYNAMIC_CACHE),
            caches.open(FORM_CACHE),
            caches.open(API_CACHE)
        ]).then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    const currentCaches = [CACHE_NAME, DYNAMIC_CACHE, FORM_CACHE, API_CACHE];
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => !currentCaches.includes(cacheName))
                        .map(cacheName => caches.delete(cacheName))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip cross-origin requests
    if (!url.origin.includes(self.location.origin)) {
        return;
    }

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        if (url.pathname.includes('/payments/')) {
            // Don't cache payment requests
            return;
        }

        event.respondWith(
            cacheStrategies.networkFirst(event.request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'You are offline' }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // Handle navigation requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            cacheStrategies.networkFirst(event.request)
                .catch(() => caches.match('/offline.html'))
        );
        return;
    }

    // Handle static assets
    if (
        url.pathname.startsWith('/static/') ||
        url.pathname.startsWith('/media/')
    ) {
        event.respondWith(cacheStrategies.cacheFirst(event.request));
        return;
    }

    // Default strategy
    event.respondWith(cacheStrategies.staleWhileRevalidate(event.request));
});

// Background sync for offline form submissions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-forms') {
        event.waitUntil(syncForms());
    }
});

// Push notification handling
self.addEventListener('push', event => {
    const data = event.data.json();
    const options = {
        body: data.body || 'New update from Wave Logistics',
        icon: '/static/main/img/logo-192.png',
        badge: '/static/main/img/badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: data.id || 1,
            url: data.url || '/'
        },
        actions: [
            {
                action: 'view',
                title: 'View Details'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ],
        tag: data.tag || 'default',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Wave Logistics', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'view') {
        const urlToOpen = event.notification.data.url || '/';
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(windowClients => {
                    // Check if there is already a window/tab open with the target URL
                    for (const client of windowClients) {
                        if (client.url === urlToOpen && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // If no window/tab is already open, open a new one
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

// Helper function for form sync
async function syncForms() {
    try {
        const cache = await caches.open(FORM_CACHE);
        const requests = await cache.keys();
        
        const responses = await Promise.all(
            requests.map(async request => {
                try {
                    const formData = await cache.match(request);
                    const data = await formData.json();
                    
                    const response = await fetch(request.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify(data)
                    });

                    if (response.ok) {
                        await cache.delete(request);
                        // Show success notification
                        await self.registration.showNotification('Form Submitted', {
                            body: 'Your form has been successfully submitted',
                            icon: '/static/main/img/logo-192.png',
                            badge: '/static/main/img/badge.png'
                        });
                    } else {
                        throw new Error(`Server responded with ${response.status}`);
                    }

                    return response;
                } catch (error) {
                    console.error('Form sync failed:', error);
                    // Keep the form data in cache for retry
                    return null;
                }
            })
        );

        return responses.filter(Boolean);
    } catch (error) {
        console.error('Form sync failed:', error);
        throw error;
    }
} 