/**
 * IndexedDB Manager for Offline Operation Queue
 *
 * Handles persistent storage of canvas operations when offline.
 * Stores data in plain text (no encryption) for simplicity.
 * Supports 5-10 minute offline window before canvas disables.
 */

export interface QueuedOperation {
  id: string;
  type: "create" | "update" | "delete";
  objectId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = "CollabCanvasDB";
const DB_VERSION = 1;
const STORE_NAME = "operationQueue";

/**
 * Initialize IndexedDB database
 * Creates object store if it doesn't exist
 */
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB: Failed to open database", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });

        // Create index on timestamp for sorting
        objectStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
};

/**
 * Add a new operation to the queue
 */
export const addOperation = async (
  operation: QueuedOperation
): Promise<void> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(operation);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error("IndexedDB: Failed to add operation", request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("IndexedDB: Error in addOperation", error);
    throw error;
  }
};

/**
 * Get all queued operations, sorted by timestamp (oldest first)
 */
export const getAllOperations = async (): Promise<QueuedOperation[]> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("timestamp");
      const request = index.openCursor();

      const operations: QueuedOperation[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          operations.push(cursor.value);
          cursor.continue();
        } else {
          // No more entries
          resolve(operations);
        }
      };

      request.onerror = () => {
        console.error("IndexedDB: Failed to get operations", request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("IndexedDB: Error in getAllOperations", error);
    return []; // Return empty array on error
  }
};

/**
 * Remove a single operation from the queue
 */
export const removeOperation = async (operationId: string): Promise<void> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(operationId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error("IndexedDB: Failed to remove operation", request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("IndexedDB: Error in removeOperation", error);
    throw error;
  }
};

/**
 * Clear all operations from the queue
 * Useful for reconnection reset or manual cleanup
 */
export const clearAllOperations = async (): Promise<void> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error("IndexedDB: Failed to clear operations", request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("IndexedDB: Error in clearAllOperations", error);
    throw error;
  }
};

/**
 * Get count of queued operations
 * Useful for displaying queue status to user
 */
export const getOperationCount = async (): Promise<number> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(
          "IndexedDB: Failed to get operation count",
          request.error
        );
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("IndexedDB: Error in getOperationCount", error);
    return 0; // Return 0 on error
  }
};

/**
 * Check if IndexedDB is supported in the current browser
 */
export const isIndexedDBSupported = (): boolean => {
  return !!window.indexedDB;
};

/**
 * Update retry count for a specific operation
 */
export const updateOperationRetryCount = async (
  operationId: string,
  retryCount: number
): Promise<void> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(operationId);

      getRequest.onsuccess = () => {
        const operation = getRequest.result;

        if (operation) {
          operation.retryCount = retryCount;
          const updateRequest = store.put(operation);

          updateRequest.onsuccess = () => {
            resolve();
          };

          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          reject(new Error(`Operation ${operationId} not found`));
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("IndexedDB: Error in updateOperationRetryCount", error);
    throw error;
  }
};
