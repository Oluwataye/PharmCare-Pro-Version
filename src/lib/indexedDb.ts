const DB_NAME = 'PharmCarePOSDB';
const DB_VERSION = 2;
const STORE_NAME = 'cart_sessions';
const DRAFTS_STORE = 'transaction_drafts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE);
      }
    };
  });
}

/**
 * Retrieve a saved cart session from IndexedDB.
 * Returns null if no session matches the key.
 */
export async function getCartSession<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result !== undefined ? request.result as T : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB getCartSession failed:', err);
    return null;
  }
}

/**
 * Store a cart session in IndexedDB.
 */
export async function setCartSession<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB setCartSession failed:', err);
  }
}

/**
 * Delete a cart session from IndexedDB.
 */
export async function clearCartSession(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB clearCartSession failed:', err);
  }
}

/**
 * Retrieve all saved transaction drafts from IndexedDB.
 */
export async function getAllDrafts<T>(): Promise<{ key: string; value: T }[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAFTS_STORE, 'readonly');
      const store = transaction.objectStore(DRAFTS_STORE);
      const request = store.openCursor();
      const results: { key: string; value: T }[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          results.push({ key: cursor.key as string, value: cursor.value as T });
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB getAllDrafts failed:', err);
    return [];
  }
}

/**
 * Store a transaction draft in IndexedDB.
 */
export async function saveDraft<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAFTS_STORE, 'readwrite');
      const store = transaction.objectStore(DRAFTS_STORE);
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB saveDraft failed:', err);
  }
}

/**
 * Delete a transaction draft from IndexedDB.
 */
export async function deleteDraft(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAFTS_STORE, 'readwrite');
      const store = transaction.objectStore(DRAFTS_STORE);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB deleteDraft failed:', err);
  }
}
