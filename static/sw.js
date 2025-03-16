const CACHE_NAME = 'wave-logistics-v1';
const STATIC_CACHE_URLS = [
    '/',
    '/static/css/main.css',
    '/static/js/main.js',
    '/static/js/payment.js',
    '/static/img/logo.png',
    '/static/img/favicon-32x32.png',
    '/static/img/favicon-16x16.png',
    '/static/img/apple-touch-icon.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-brands-400.woff2'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_CACHE_URLS))
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
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => caches.delete(cacheName))
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
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.startsWith('https://cdnjs.cloudflare.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached response if found
                if (response) {
                    return response;
                }
                
                // Clone the request - request streams can only be read once
                const fetchRequest = event.request.clone();
                
                // Make network request
                return fetch(fetchRequest)
                    .then(response => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response - response streams can only be read once
                        const responseToCache = response.clone();
                        
                        // Add response to cache
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Handle push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/static/img/icon-192x192.png',
        badge: '/static/img/badge-72x72.png',
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

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Background Sync for Offline Forms
self.addEventListener('sync', event => {
    if (event.tag === 'sync-forms') {
        event.waitUntil(syncForms());
    }
});

// Sync Forms Function
async function syncForms() {
    try {
        const db = await openDatabase();
        const forms = await getAllStoredForms(db);

        const successfulSync = await Promise.all(
            forms.map(async form => {
                try {
                    const response = await fetch('/api/sync-form/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(form)
                    });

                    if (response.ok) {
                        await deleteStoredForm(db, form.timestamp);
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error('Error syncing form:', error);
                    return false;
                }
            })
        );

        // Show notification for sync results
        const syncedCount = successfulSync.filter(Boolean).length;
        if (syncedCount > 0) {
            self.registration.showNotification('Form Sync Complete', {
                body: `Successfully synced ${syncedCount} form(s)`,
                icon: '/static/img/logo.png'
            });
        }
    } catch (error) {
        console.error('Error in syncForms:', error);
    }
}

// IndexedDB Helper Functions
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('WaveLogistics', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('forms')) {
                db.createObjectStore('forms', { keyPath: 'timestamp' });
            }
        };
    });
}

function getAllStoredForms(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['forms'], 'readonly');
        const store = transaction.objectStore('forms');
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

function deleteStoredForm(db, timestamp) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['forms'], 'readwrite');
        const store = transaction.objectStore('forms');
        const request = store.delete(timestamp);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
} 