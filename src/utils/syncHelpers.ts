// Sync helper functions for real-time collaboration
import type { CanvasObject } from "../types/canvas.types";

export const syncHelpers = {
  /**
   * Debounce function - delays execution until after wait time has elapsed
   * Useful for: Reducing frequent Firebase writes during drag operations
   * @param func - Function to debounce
   * @param wait - Wait time in milliseconds
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function - ensures function is called at most once per limit
   * Useful for: Cursor position updates (60fps = 16ms limit)
   * @param func - Function to throttle
   * @param limit - Minimum time between calls in milliseconds
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;
    let lastResult: ReturnType<T>;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        lastResult = func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
      return lastResult;
    };
  },

  /**
   * Resolve conflicts using Last-Write-Wins strategy
   * Compares timestamps and returns the most recent version
   * @param local - Local object version
   * @param remote - Remote object version
   * @returns Most recent version based on timestamp
   */
  resolveConflict: (
    local: CanvasObject,
    remote: CanvasObject
  ): CanvasObject => {
    // If timestamps are equal, prefer remote (server is source of truth)
    if (remote.timestamp >= local.timestamp) {
      return remote;
    }
    return local;
  },

  /**
   * Merge local and remote object arrays
   * Resolves conflicts using Last-Write-Wins
   * Remote is the source of truth - objects not in remote are considered deleted
   * @param local - Local objects array
   * @param remote - Remote objects array
   * @returns Merged array with conflicts resolved
   */
  mergeObjects: (
    local: CanvasObject[],
    remote: CanvasObject[]
  ): CanvasObject[] => {
    const merged = new Map<string, CanvasObject>();
    const localMap = new Map<string, CanvasObject>();

    // Create map of local objects for quick lookup
    local.forEach((obj) => localMap.set(obj.id, obj));

    // Process remote objects (remote is source of truth for what should exist)
    remote.forEach((remoteObj) => {
      const localObj = localMap.get(remoteObj.id);
      if (localObj) {
        // Object exists in both - resolve conflict using timestamps
        merged.set(
          remoteObj.id,
          syncHelpers.resolveConflict(localObj, remoteObj)
        );
      } else {
        // New object from remote
        merged.set(remoteObj.id, remoteObj);
      }
    });

    // Objects in local but not in remote are considered deleted - don't add them

    return Array.from(merged.values());
  },

  /**
   * Check if two objects are significantly different
   * Used to avoid unnecessary updates
   * @param obj1 - First object
   * @param obj2 - Second object
   * @param threshold - Minimum difference to consider significant (pixels)
   */
  hasSignificantChange: (
    obj1: CanvasObject,
    obj2: CanvasObject,
    threshold: number = 1
  ): boolean => {
    // Check position changes
    if (
      Math.abs(obj1.x - obj2.x) >= threshold ||
      Math.abs(obj1.y - obj2.y) >= threshold
    ) {
      return true;
    }

    // Check size changes
    if (
      Math.abs(obj1.width - obj2.width) >= threshold ||
      Math.abs(obj1.height - obj2.height) >= threshold
    ) {
      return true;
    }

    // Check other properties
    if (obj1.color !== obj2.color) {
      return true;
    }

    return false;
  },

  /**
   * Create a retry mechanism for failed operations
   * Useful for handling network issues
   * @param fn - Async function to retry
   * @param maxRetries - Maximum number of retry attempts
   * @param delay - Delay between retries in milliseconds
   */
  retryOperation: async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`,
          error
        );

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, delay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw new Error(
      `Operation failed after ${maxRetries + 1} attempts: ${lastError!.message}`
    );
  },

  /**
   * Batch multiple operations together
   * Reduces number of database writes
   * @param operations - Array of operations to batch
   * @param batchSize - Number of operations per batch
   * @param delayBetweenBatches - Delay between batches in milliseconds
   */
  batchOperations: async <T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 10,
    delayBetweenBatches: number = 100
  ): Promise<T[]> => {
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((op) => op()));
      results.push(...batchResults);

      // Add delay between batches to avoid overwhelming the server
      if (i + batchSize < operations.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches)
        );
      }
    }

    return results;
  },

  /**
   * Generate unique ID for objects
   * Format: prefix-timestamp-random
   * @param prefix - Prefix for the ID (e.g., 'rect', 'circle')
   */
  generateObjectId: (prefix: string = "obj"): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  },

  /**
   * Calculate sync latency
   * Measures time between local change and remote confirmation
   */
  measureLatency: (() => {
    const startTimes = new Map<string, number>();

    return {
      start: (operationId: string) => {
        startTimes.set(operationId, performance.now());
      },
      end: (operationId: string): number | null => {
        const startTime = startTimes.get(operationId);
        if (startTime) {
          const latency = performance.now() - startTime;
          startTimes.delete(operationId);
          return latency;
        }
        return null;
      },
      clear: () => {
        startTimes.clear();
      },
    };
  })(),

  /**
   * Deep clone an object to avoid reference issues
   * @param obj - Object to clone
   */
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Compare two arrays for equality (shallow comparison)
   * @param arr1 - First array
   * @param arr2 - Second array
   */
  arraysEqual: <T>(arr1: T[], arr2: T[]): boolean => {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((item, index) => item === arr2[index]);
  },

  /**
   * Create a simple queue for managing sequential operations
   */
  createQueue: <T>() => {
    const queue: (() => Promise<T>)[] = [];
    let isProcessing = false;

    const processQueue = async () => {
      if (isProcessing || queue.length === 0) return;

      isProcessing = true;
      while (queue.length > 0) {
        const operation = queue.shift();
        if (operation) {
          try {
            await operation();
          } catch (error) {
            console.error("Queue operation failed:", error);
          }
        }
      }
      isProcessing = false;
    };

    return {
      add: (operation: () => Promise<T>) => {
        queue.push(operation);
        processQueue();
      },
      clear: () => {
        queue.length = 0;
      },
      size: () => queue.length,
      isProcessing: () => isProcessing,
    };
  },
};
