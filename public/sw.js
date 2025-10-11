// Service Worker for Web Push Notifications
// This service worker handles push notifications and background sync

const CACHE_NAME = 'saphari-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/devices',
  '/settings',
  '/manifest.json',
  '/logo.png',
  '/badge.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'SapHari Notification',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/badge.png',
    url: '/dashboard',
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('Failed to parse push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction || false,
      silent: notificationData.silent || false,
      tag: notificationData.tag,
      actions: notificationData.actions || [
        {
          action: 'view',
          title: 'View',
          icon: '/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/dismiss-icon.png'
        }
      ]
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/dashboard';

  if (event.action === 'dismiss') {
    // Just close the notification
    return;
  }

  // Handle notification click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification dismissal
  const notificationData = event.notification.data || {};
  
  // You could send analytics data here
  if (notificationData.trackDismissal) {
    // Send dismissal tracking to your analytics service
    console.log('Notification dismissed:', notificationData);
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync operations
      doBackgroundSync()
    );
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    console.log('Performing background sync...');
    
    // Sync any pending data
    // This could include:
    // - Syncing device states
    // - Uploading pending logs
    // - Checking for updates
    
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync event:', event);
  
  if (event.tag === 'device-health-check') {
    event.waitUntil(
      checkDeviceHealth()
    );
  }
});

// Device health check function
async function checkDeviceHealth() {
  try {
    console.log('Performing periodic device health check...');
    
    // This could check for:
    // - Device connectivity
    // - Pending commands
    // - System updates
    
    console.log('Device health check completed');
  } catch (error) {
    console.error('Device health check failed:', error);
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

// Utility functions
function getNotificationIcon(type) {
  switch (type) {
    case 'critical':
      return '/critical-icon.png';
    case 'warning':
      return '/warning-icon.png';
    case 'success':
      return '/success-icon.png';
    default:
      return '/info-icon.png';
  }
}

function getNotificationBadge(type) {
  switch (type) {
    case 'critical':
      return '/critical-badge.png';
    case 'warning':
      return '/warning-badge.png';
    case 'success':
      return '/success-badge.png';
    default:
      return '/info-badge.png';
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getNotificationIcon,
    getNotificationBadge
  };
}