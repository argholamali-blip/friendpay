// sw.js - Service Worker for FriendPay PWA

const CACHE_NAME = 'friendpay-v1.0.8';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/api.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Service Worker: Cache failed', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdn.tailwindcss.com') &&
      !event.request.url.includes('fonts.googleapis.com') &&
      !event.request.url.includes('fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then((fetchResponse) => {
          // Don't cache API calls
          if (event.request.url.includes('/api/')) {
            return fetchResponse;
          }

          // Cache successful responses
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
      .catch(() => {
        // Return offline page if available
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync (for future use)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  if (event.tag === 'sync-debts') {
    // Implement background sync logic here
    event.waitUntil(syncDebts());
  }
});

async function syncDebts() {
  // Implement debt synchronization when back online
  console.log('Syncing debts...');
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'FriendPay';
  const options = {
    body: data.body || 'شما یک اعلان جدید دارید',
    icon: './icon-192.png',
    badge: './badge-72.png',
    data: data.url || '/',
    vibrate: [200, 100, 200],
    tag: 'friendpay-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

console.log('Service Worker: Loaded');