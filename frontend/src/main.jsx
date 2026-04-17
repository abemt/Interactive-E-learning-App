import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker, onSyncComplete } from './services/serviceWorkerService'
import { initDB, registerOfflineSyncOnReconnect } from './services/indexedDBService'

initDB()
  .then(() => {
    registerOfflineSyncOnReconnect();
  })
  .catch((error) => {
    console.error('❌ Failed to initialize offline storage:', error);
  });

// Register service worker (only in production)
if (import.meta.env.PROD) {
  registerServiceWorker()
    .then((registration) => {
      if (registration) {
        console.log('✅ PWA ready: Service Worker active');
        
        // Listen for sync completion
        onSyncComplete((itemsSynced) => {
          console.log(`✅ ${itemsSynced} items synced from offline storage`);
          // Show success notification to user
          if (itemsSynced > 0) {
            // In production, trigger a toast notification
            console.log('📢 Your offline data has been synced!');
          }
        });
      }
    })
    .catch(err => {
      console.error('❌ Service Worker registration failed:', err);
    });
} else {
  // UNREGISTER service worker in development so it doesn't cache old Vite bundles!
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.unregister();
      console.log('🗑️ Service Worker unregistered in dev mode to fix caching issues.');
    });
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
