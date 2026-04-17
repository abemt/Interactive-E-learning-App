import { openDB } from 'idb';
import apiClient from './apiClient';

/**
 * IndexedDB Service for Offline Quiz/Progress Storage and Sync
 */

const DB_NAME = 'elearning-offline-db';
const DB_VERSION = 2;

const STORES = {
  QUIZ_SCORES: 'quizScores',
  USER_PROGRESS: 'userProgress',
  PENDING_SYNC: 'pendingSync'
};

let hasRegisteredOnlineSyncListener = false;

const isBrowser = typeof window !== 'undefined';

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.QUIZ_SCORES)) {
        const quizStore = db.createObjectStore(STORES.QUIZ_SCORES, {
          keyPath: 'id',
          autoIncrement: true
        });
        quizStore.createIndex('userId', 'userId', { unique: false });
        quizStore.createIndex('quizId', 'quizId', { unique: false });
        quizStore.createIndex('timestamp', 'timestamp', { unique: false });
        quizStore.createIndex('synced', 'synced', { unique: false });
        quizStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.USER_PROGRESS)) {
        const progressStore = db.createObjectStore(STORES.USER_PROGRESS, {
          keyPath: 'id',
          autoIncrement: true
        });
        progressStore.createIndex('userId', 'userId', { unique: false });
        progressStore.createIndex('moduleId', 'moduleId', { unique: false });
        progressStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
        const syncStore = db.createObjectStore(STORES.PENDING_SYNC, {
          keyPath: 'id',
          autoIncrement: true
        });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }
    }
  });
}

function isOfflineNetworkError(error) {
  return !error?.response;
}

/**
 * Initialize IndexedDB
 */
export async function initDB() {
  try {
    const db = await getDB();
    console.log('IndexedDB initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing IndexedDB:', error);
    throw error;
  }
}

/**
 * Save a quiz score payload for offline use and queue it for sync
 */
export async function saveQuizScoreOffline(quizScore) {
  try {
    const db = await getDB();

    const scoreData = {
      ...quizScore,
      timestamp: Date.now(),
      synced: false,
      syncStatus: 'Pending Sync',
      savedAt: new Date().toISOString()
    };

    const id = await db.add(STORES.QUIZ_SCORES, scoreData);

    await addToPendingSyncQueue({
      type: 'quiz-submission',
      endpoint: '/sync',
      data: {
        ...quizScore,
        localScoreId: id
      },
      syncStatus: 'Pending Sync'
    });

    return id;
  } catch (error) {
    console.error('Error saving quiz score offline:', error);
    throw error;
  }
}

/**
 * Submit a quiz answer with offline fallback.
 * If network is unavailable, stores payload locally as Pending Sync.
 */
export async function submitQuizAnswerWithOfflineSupport(payload) {
  try {
    const response = await apiClient.post('/quiz/submit-answer', payload);
    return {
      ...response.data,
      offline: false,
      pendingSync: false
    };
  } catch (error) {
    if (!isOfflineNetworkError(error)) {
      throw error;
    }

    const offlineRecordId = await saveQuizScoreOffline(payload);

    return {
      success: true,
      offline: true,
      pendingSync: true,
      message: 'No network connection. Quiz result saved locally as Pending Sync.',
      data: {
        syncStatus: 'Pending Sync',
        offlineRecordId
      }
    };
  }
}

/**
 * Returns all unsynced quiz records.
 */
export async function getUnsyncedQuizScores() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.QUIZ_SCORES, 'readonly');
    const index = tx.store.index('synced');
    return index.getAll(false);
  } catch (error) {
    console.error('Error getting unsynced quiz scores:', error);
    return [];
  }
}

/**
 * Mark quiz score as synced.
 */
export async function markQuizScoreSynced(id) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.QUIZ_SCORES, 'readwrite');
    const existing = await tx.store.get(id);

    if (existing) {
      existing.synced = true;
      existing.syncStatus = 'Synced';
      existing.syncedAt = new Date().toISOString();
      await tx.store.put(existing);
    }

    await tx.done;
  } catch (error) {
    console.error('Error marking quiz score as synced:', error);
  }
}

/**
 * Save user progress offline.
 */
export async function saveUserProgressOffline(progressData) {
  try {
    const db = await getDB();

    const data = {
      ...progressData,
      timestamp: Date.now(),
      synced: false,
      savedAt: new Date().toISOString()
    };

    const id = await db.add(STORES.USER_PROGRESS, data);

    await addToPendingSyncQueue({
      type: 'user-progress',
      data,
      endpoint: '/gamification/update-progress',
      syncStatus: 'Pending Sync'
    });

    return id;
  } catch (error) {
    console.error('Error saving user progress offline:', error);
    throw error;
  }
}

export async function getUnsyncedUserProgress() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.USER_PROGRESS, 'readonly');
    const index = tx.store.index('synced');
    return index.getAll(false);
  } catch (error) {
    console.error('Error getting unsynced user progress:', error);
    return [];
  }
}

export async function markUserProgressSynced(id) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.USER_PROGRESS, 'readwrite');
    const existing = await tx.store.get(id);

    if (existing) {
      existing.synced = true;
      existing.syncedAt = new Date().toISOString();
      await tx.store.put(existing);
    }

    await tx.done;
  } catch (error) {
    console.error('Error marking user progress as synced:', error);
  }
}

/**
 * Add an item to the sync queue.
 */
export async function addToPendingSyncQueue(item) {
  try {
    const db = await getDB();

    const queueItem = {
      ...item,
      timestamp: Date.now(),
      retries: Number(item?.retries || 0),
      syncStatus: item?.syncStatus || 'Pending Sync',
      createdAt: new Date().toISOString()
    };

    const id = await db.add(STORES.PENDING_SYNC, queueItem);
    return id;
  } catch (error) {
    console.error('Error adding to sync queue:', error);
    throw error;
  }
}

/**
 * Get all pending sync queue items.
 */
export async function getPendingSyncQueue() {
  try {
    const db = await getDB();
    return db.getAll(STORES.PENDING_SYNC);
  } catch (error) {
    console.error('Error getting pending sync queue:', error);
    return [];
  }
}

export async function removeFromSyncQueue(id) {
  try {
    const db = await getDB();
    await db.delete(STORES.PENDING_SYNC, id);
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
}

/**
 * Sync pending quiz submissions to backend /api/sync endpoint.
 */
export async function syncPendingQuizSubmissions() {
  if (!isBrowser || !navigator.onLine) {
    return {
      attempted: 0,
      synced: 0,
      failed: 0,
      skipped: true
    };
  }

  const pendingItems = await getPendingSyncQueue();
  const quizItems = pendingItems.filter((item) => item.type === 'quiz-submission');

  if (quizItems.length === 0) {
    return {
      attempted: 0,
      synced: 0,
      failed: 0,
      skipped: false
    };
  }

  const payload = quizItems.map((item) => ({
    ...item.data,
    clientSyncId: item.id
  }));

  try {
    const response = await apiClient.post('/sync', {
      quizSubmissions: payload
    });

    const resultRows = response?.data?.data?.results || [];
    const syncedIds = new Set(
      resultRows
        .filter((row) => row.status === 'synced')
        .map((row) => row.clientSyncId)
    );

    let syncedCount = 0;

    for (const item of quizItems) {
      if (!syncedIds.has(item.id)) {
        continue;
      }

      if (item?.data?.localScoreId) {
        await markQuizScoreSynced(item.data.localScoreId);
      }

      await removeFromSyncQueue(item.id);
      syncedCount += 1;
    }

    return {
      attempted: quizItems.length,
      synced: syncedCount,
      failed: quizItems.length - syncedCount,
      skipped: false
    };
  } catch (error) {
    console.error('Error syncing pending quiz submissions:', error);
    return {
      attempted: quizItems.length,
      synced: 0,
      failed: quizItems.length,
      skipped: false,
      error: error.message
    };
  }
}

/**
 * Register auto-sync when network connection is restored.
 */
export function registerOfflineSyncOnReconnect() {
  if (!isBrowser || hasRegisteredOnlineSyncListener) {
    return;
  }

  const syncHandler = async () => {
    const result = await syncPendingQuizSubmissions();
    if (result.synced > 0) {
      console.log(`Synced ${result.synced} pending quiz submissions.`);
    }
  };

  window.addEventListener('online', syncHandler);
  hasRegisteredOnlineSyncListener = true;

  if (navigator.onLine) {
    syncHandler().catch((error) => {
      console.error('Initial sync attempt failed:', error);
    });
  }
}

/**
 * Cleanup old synced data.
 */
export async function clearSyncedData() {
  try {
    const db = await getDB();
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const tx = db.transaction(STORES.QUIZ_SCORES, 'readwrite');
    const index = tx.store.index('synced');
    let cursor = await index.openCursor(true);

    while (cursor) {
      if ((cursor.value.timestamp || 0) < weekAgo) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
  } catch (error) {
    console.error('Error clearing synced data:', error);
  }
}

/**
 * Get synchronization status snapshot.
 */
export async function getSyncStatus() {
  try {
    const unsyncedScores = await getUnsyncedQuizScores();
    const unsyncedProgress = await getUnsyncedUserProgress();
    const pendingQueue = await getPendingSyncQueue();

    return {
      unsyncedQuizScores: unsyncedScores.length,
      unsyncedProgress: unsyncedProgress.length,
      pendingSyncItems: pendingQueue.length,
      pendingQuizSubmissions: pendingQueue.filter((item) => item.type === 'quiz-submission').length,
      isOnline: isBrowser ? navigator.onLine : false,
      lastCheck: new Date().toISOString(),

      // Backward-compatible aliases used in legacy demo views
      unsyncedScores: unsyncedScores.length,
      pendingItems: pendingQueue.length
    };
  } catch (error) {
    console.error('Error getting sync status:', error);
    return {
      unsyncedQuizScores: 0,
      unsyncedProgress: 0,
      pendingSyncItems: 0,
      pendingQuizSubmissions: 0,
      isOnline: isBrowser ? navigator.onLine : false,
      lastCheck: new Date().toISOString(),
      unsyncedScores: 0,
      pendingItems: 0
    };
  }
}

export default {
  initDB,
  saveQuizScoreOffline,
  submitQuizAnswerWithOfflineSupport,
  getUnsyncedQuizScores,
  markQuizScoreSynced,
  saveUserProgressOffline,
  getUnsyncedUserProgress,
  markUserProgressSynced,
  addToPendingSyncQueue,
  getPendingSyncQueue,
  removeFromSyncQueue,
  syncPendingQuizSubmissions,
  registerOfflineSyncOnReconnect,
  clearSyncedData,
  getSyncStatus
};
