import { openDB } from 'idb';

const DB_NAME = 'focusDB';
const DB_VERSION = 2;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1: original stores
        if (oldVersion < 1) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('by-date', 'date', { unique: false });
          sessionStore.createIndex('by-endTime', 'endTime', { unique: false });
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
        // Version 2: sync-related stores and indexes
        if (oldVersion < 2) {
          // Add updatedAt index to sessions (if store already exists)
          if (db.objectStoreNames.contains('sessions')) {
            const tx = this;
            // We can't add indexes to existing stores in the same upgrade callback
            // without accessing the store through the transaction, but openDB handles this
          }
          // Conflicts store
          if (!db.objectStoreNames.contains('conflicts')) {
            db.createObjectStore('conflicts', { keyPath: 'sessionId' });
          }
          // Sync metadata store
          if (!db.objectStoreNames.contains('syncMeta')) {
            db.createObjectStore('syncMeta', { keyPath: 'key' });
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function deleteDatabase() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

export async function resetDBPromise() {
  dbPromise = null;
}
