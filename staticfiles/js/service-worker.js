const CACHE_NAME = 'wave-logistics-v1';
const STATIC_ASSETS = [
    '/',
    '/static/css/main.css',
    '/static/js/main.js',
    '/static/js/payment.js',
    '/static/main/manifest.json',
    '/static/main/img/logo-192.png',
    '/static/main/img/logo-512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Skip API requests
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => new Response(
                    JSON.stringify({ error: 'You are offline' }),
                    { 
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    }
                ))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(response => {
                        // Cache successful responses
                        if (response.ok && response.type === 'basic') {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Offline fallback for HTML requests
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/offline.html');
                        }
                        return new Response('Offline content not available');
                    });
            })
    );
});

// Background sync for offline form submissions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-forms') {
        event.waitUntil(
            syncForms()
        );
    }
});

// Push notification handling
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/static/main/img/logo-192.png',
        badge: '/static/main/img/badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Details'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Wave Logistics', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Helper function for form sync
async function syncForms() {
    try {
        const cache = await caches.open('form-data');
        const requests = await cache.keys();
        
        const responses = await Promise.all(
            requests.map(async request => {
                const formData = await cache.match(request);
                const response = await fetch(request, {
                    method: 'POST',
                    body: await formData.text(),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    await cache.delete(request);
                }
                
                return response;
            })
        );
        
        return responses;
    } catch (error) {
        console.error('Form sync failed:', error);
        throw error;
    }
} 