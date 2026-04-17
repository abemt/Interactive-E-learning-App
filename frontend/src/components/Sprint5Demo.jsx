import { useState } from 'react';
import { requestBackgroundSync, getServiceWorkerStatus, isPWA } from '../services/serviceWorkerService';
import { getSyncStatus } from '../services/indexedDBService';
import ClassAnalytics from './teacher/ClassAnalytics';

/**
 * Sprint 5 Demo Component
 * Demonstrates PWA offline capabilities and analytics dashboard
 */

function Sprint5Demo() {
  const [activeTab, setActiveTab] = useState('overview');
  const [swStatus, setSwStatus] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  // Check Service Worker status
  const checkSWStatus = async () => {
    const status = await getServiceWorkerStatus();
    setSwStatus(status);
  };

  // Check IndexedDB sync status
  const checkSyncStatus = async () => {
    const status = await getSyncStatus();
    setSyncStatus(status);
  };

  // Trigger manual sync
  const handleManualSync = async () => {
    const success = await requestBackgroundSync();
    if (success) {
      alert('✅ Background sync requested! Data will sync when online.');
    } else {
      alert('⚠️ Background sync not supported. Using manual sync fallback.');
    }
    // Refresh sync status
    checkSyncStatus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-success-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg border-b-4 border-primary-400">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              🚀 Sprint 5: PWA & Analytics
            </h1>
            <div className="flex items-center gap-3">
              {isPWA() && (
                <span className="px-4 py-2 bg-success-500 text-white rounded-xl font-bold text-sm">
                  📱 PWA Mode
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300'
              }`}
            >
              📋 Overview
            </button>
            
            <button
              onClick={() => setActiveTab('offline')}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 ${
                activeTab === 'offline'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300'
              }`}
            >
              📶 Offline Status
            </button>
            
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300'
              }`}
            >
              📊 Analytics Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200 mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                🎉 Sprint 5 Features Implemented
              </h2>
              
              <div className="space-y-6">
                <div className="border-l-4 border-success-500 pl-6 py-3">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">✅ Task 5.1: IndexedDB Setup</h3>
                  <p className="text-gray-700 mb-2">
                    Comprehensive IndexedDB service using the <code className="bg-gray-100 px-2 py-1 rounded">idb</code> library
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>3 Object Stores: quizScores, userProgress, pendingSync</li>
                    <li>Save quiz scores offline when no internet connection</li>
                    <li>Queue data for background sync</li>
                    <li>Track sync status and unsynced items</li>
                  </ul>
                </div>

                <div className="border-l-4 border-success-500 pl-6 py-3">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">✅ Task 5.2: Service Worker</h3>
                  <p className="text-gray-700 mb-2">
                    Full PWA service worker with background sync capability
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Offline asset caching (Cache-First strategy)</li>
                    <li>API request caching with fallback</li>
                    <li>Background Sync API for auto-sync when online</li>
                    <li>Manual sync fallback for unsupported browsers</li>
                    <li>Service worker lifecycle management</li>
                  </ul>
                </div>

                <div className="border-l-4 border-success-500 pl-6 py-3">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">✅ Task 5.3: Analytics Dashboard</h3>
                  <p className="text-gray-700 mb-2">
                    Teacher analytics with data visualization using <code className="bg-gray-100 px-2 py-1 rounded">recharts</code>
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Interactive bar chart of student performance</li>
                    <li>At-risk student filter (scores &lt; 50%)</li>
                    <li>Color-coded student cards (red/yellow/green)</li>
                    <li>Class statistics and metrics</li>
                    <li>Student detail cards with progress bars</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-primary-50 rounded-2xl shadow-xl p-8 border-2 border-primary-300">
              <h2 className="text-2xl font-bold text-primary-800 mb-4">
                🧪 How to Test Sprint 5 Features
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">1️⃣ Test Offline Capabilities:</h4>
                  <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                    <li>Open DevTools → Network tab → Select "Offline"</li>
                    <li>Refresh the page - app should still load from cache</li>
                    <li>Check "Offline Status" tab to see Service Worker status</li>
                    <li>Try saving quiz data while offline (simulated)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-2">2️⃣ Test Background Sync:</h4>
                  <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                    <li>Save data while offline (goes to IndexedDB)</li>
                    <li>Go back online</li>
                    <li>Service Worker automatically syncs data to backend</li>
                    <li>Check console for sync success messages</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-2">3️⃣ Test Analytics Dashboard:</h4>
                  <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                    <li>Click "Analytics Dashboard" tab</li>
                    <li>View bar chart of student performance</li>
                    <li>Toggle "At Risk Only" to filter struggling students</li>
                    <li>Hover over bars for detailed tooltips</li>
                    <li>View color-coded student cards</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-2">4️⃣ Install as PWA:</h4>
                  <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                    <li>Chrome: Look for install icon in address bar</li>
                    <li>Mobile: "Add to Home Screen" option</li>
                    <li>App runs in standalone window like native app</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'offline' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200 mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                📶 Offline & Sync Status
              </h2>

              {/* Service Worker Status */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Service Worker Status</h3>
                  <button
                    onClick={checkSWStatus}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-semibold"
                  >
                    🔄 Refresh Status
                  </button>
                </div>

                {swStatus ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border-2 ${swStatus.supported ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                      <div className="text-sm text-gray-600">Supported</div>
                      <div className="text-2xl font-bold">{swStatus.supported ? '✅ Yes' : '❌ No'}</div>
                    </div>
                    <div className={`p-4 rounded-xl border-2 ${swStatus.registered ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'}`}>
                      <div className="text-sm text-gray-600">Registered</div>
                      <div className="text-2xl font-bold">{swStatus.registered ? '✅ Yes' : '⏳ Pending'}</div>
                    </div>
                    <div className={`p-4 rounded-xl border-2 ${swStatus.active ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'}`}>
                      <div className="text-sm text-gray-600">Active</div>
                      <div className="text-2xl font-bold">{swStatus.active ? '✅ Active' : '⏳ Installing'}</div>
                    </div>
                    <div className="p-4 rounded-xl border-2 bg-primary-50 border-primary-400">
                      <div className="text-sm text-gray-600">Scope</div>
                      <div className="text-lg font-bold truncate">{swStatus.scope || 'N/A'}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">Click "Refresh Status" to check Service Worker</p>
                )}
              </div>

              {/* IndexedDB Sync Status */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">IndexedDB Sync Status</h3>
                  <button
                    onClick={checkSyncStatus}
                    className="px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 font-semibold"
                  >
                    🔄 Check Sync Status
                  </button>
                </div>

                {syncStatus ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl border-2 ${syncStatus.pendingItems > 0 ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-400'}`}>
                      <div className="text-sm text-gray-600">Pending Items</div>
                      <div className="text-3xl font-bold text-gray-800">{syncStatus.pendingItems}</div>
                    </div>
                    <div className="p-4 rounded-xl border-2 bg-primary-50 border-primary-400">
                      <div className="text-sm text-gray-600">Unsynced Scores</div>
                      <div className="text-3xl font-bold text-gray-800">{syncStatus.unsyncedScores}</div>
                    </div>
                    <div className="p-4 rounded-xl border-2 bg-secondary-50 border-secondary-400">
                      <div className="text-sm text-gray-600">Unsynced Progress</div>
                      <div className="text-3xl font-bold text-gray-800">{syncStatus.unsyncedProgress}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">Click "Check Sync Status" to view IndexedDB data</p>
                )}
              </div>

              {/* Manual Sync Button */}
              <div className="bg-gradient-to-r from-primary-100 to-success-100 rounded-xl p-6 border-2 border-primary-300">
                <h4 className="text-lg font-bold text-gray-800 mb-3">Manual Sync Control</h4>
                <p className="text-gray-700 mb-4">
                  Trigger background sync to push offline data to the server when online.
                </p>
                <button
                  onClick={handleManualSync}
                  className="px-6 py-3 bg-success-500 text-white rounded-xl font-bold text-lg hover:bg-success-600 transition-all duration-200 shadow-lg"
                >
                  🔄 Sync Offline Data Now
                </button>
              </div>
            </div>

            {/* Network Status Info */}
            <div className={`rounded-2xl shadow-xl p-6 border-2 ${navigator.onLine ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
              <div className="flex items-center gap-4">
                <div className="text-5xl">
                  {navigator.onLine ? '🟢' : '🔴'}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {navigator.onLine ? 'Online' : 'Offline'}
                  </h3>
                  <p className="text-gray-700">
                    {navigator.onLine
                      ? 'Connected to internet. Data will sync automatically.'
                      : 'No internet connection. Data saved locally and will sync when you reconnect.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && <ClassAnalytics />}
      </div>
    </div>
  );
}

export default Sprint5Demo;
