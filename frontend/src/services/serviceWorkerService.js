/**
 * Service Worker Registration and Management
 * Handles SW lifecycle and provides sync utilities
 */

import { syncPendingQuizSubmissions } from './indexedDBService';

const parseHostList = (value) => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    }
  } catch {
    // Ignore JSON parse errors and fallback to CSV parsing.
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const resolveMediaConfig = () => {
  const mediaPublicPath =
    import.meta.env.VITE_SW_MEDIA_PUBLIC_PATH ||
    import.meta.env.VITE_MEDIA_PUBLIC_PATH ||
    '/uploads';

  const mediaCacheHosts = parseHostList(
    import.meta.env.VITE_SW_MEDIA_CACHE_HOSTS ||
      import.meta.env.VITE_MEDIA_CACHE_HOSTS ||
      ''
  );

  return {
    mediaPublicPath,
    mediaCacheHosts
  };
};

/**
 * Register service worker
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        '/service-worker.js',
        { scope: '/' }
      );
      
      console.log('✅ Service Worker registered:', registration.scope);
      
      const postMediaConfig = () => {
        const config = resolveMediaConfig();

        if (registration.active) {
          registration.active.postMessage({
            type: 'SET_MEDIA_CONFIG',
            payload: config
          });
          return;
        }

        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SET_MEDIA_CONFIG',
            payload: config
          });
        }
      };

      await navigator.serviceWorker.ready;
      postMediaConfig();

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        postMediaConfig();
      });

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Service Worker update found');
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🆕 New Service Worker available');
            // Notify user of update
            notifyUpdate();
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  } else {
    console.warn('⚠️ Service Workers not supported');
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    
    if (success) {
      console.log('✅ Service Worker unregistered');
    }
    
    return success;
  }
  return false;
}

/**
 * Request background sync
 */
export async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-offline-data');
      console.log('🔄 Background sync requested');
      return true;
    } catch (error) {
      console.error('❌ Background sync request failed:', error);
      const fallbackResult = await syncPendingQuizSubmissions();
      return fallbackResult.synced > 0 || fallbackResult.attempted === 0;
    }
  } else {
    console.warn('⚠️ Background Sync not supported, using direct sync fallback');
    const fallbackResult = await syncPendingQuizSubmissions();
    return fallbackResult.synced > 0 || fallbackResult.attempted === 0;
  }
}

/**
 * Manual sync trigger (fallback when background sync not available)
 */
export function triggerManualSync() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_NOW'
    });
    console.log('🔄 Manual sync triggered');
    syncPendingQuizSubmissions().catch((error) => {
      console.error('❌ Direct sync fallback failed:', error);
    });
    return true;
  }
  syncPendingQuizSubmissions().catch((error) => {
    console.error('❌ Direct sync fallback failed:', error);
  });
  return false;
}

/**
 * Check if app is running as PWA
 */
export function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
}

/**
 * Get service worker status
 */
export async function getServiceWorkerStatus() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    
    return {
      supported: true,
      registered: !!registration,
      active: !!registration?.active,
      installing: !!registration?.installing,
      waiting: !!registration?.waiting,
      scope: registration?.scope || null
    };
  }
  
  return {
    supported: false,
    registered: false,
    active: false,
    installing: false,
    waiting: false,
    scope: null
  };
}

/**
 * Listen for sync completion
 */
export function onSyncComplete(callback) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        callback(event.data.itemsSynced);
        return;
      }

      if (event.data && event.data.type === 'SYNC_NOW') {
        const result = await syncPendingQuizSubmissions();
        callback(result.synced || 0);
      }
    });
  }
}

/**
 * Notify user of app update
 */
function notifyUpdate() {
  // In production, show a toast or modal
  // For now, just log
  console.log('📢 App update available. Refresh to update.');
  
  // Optional: Auto-reload after delay
  // setTimeout(() => window.location.reload(), 3000);
}

/**
 * Force update service worker
 */
export async function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  requestBackgroundSync,
  triggerManualSync,
  isPWA,
  getServiceWorkerStatus,
  onSyncComplete,
  updateServiceWorker
};
