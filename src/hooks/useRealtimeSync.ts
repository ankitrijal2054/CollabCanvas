// useRealtimeSync hook - Manages real-time synchronization with Firebase
import { useEffect, useCallback, useRef } from "react";
import { canvasService } from "../services/canvasService";
import { ref, onValue, off } from "firebase/database";
import { database } from "../services/firebase";
import type { CanvasObject } from "../types/canvas.types";
import { syncHelpers } from "../utils/syncHelpers";

interface UseRealtimeSyncOptions {
  onObjectsUpdate: (objects: CanvasObject[]) => void;
  enabled?: boolean;
}

/**
 * Custom hook for real-time synchronization with Firebase
 * Handles subscribing to object changes and managing sync state
 */
export const useRealtimeSync = ({
  onObjectsUpdate,
  enabled = true,
}: UseRealtimeSyncOptions) => {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastSyncTime = useRef<number>(Date.now());
  const syncMetrics = useRef({
    updateCount: 0,
    lastLatency: 0,
    averageLatency: 0,
  });

  /**
   * Handle incoming object updates from Firebase
   * Processes and forwards to the callback
   */
  const handleObjectsUpdate = useCallback(
    (objects: CanvasObject[]) => {
      const now = Date.now();
      const latency = now - lastSyncTime.current;

      // Update sync metrics
      syncMetrics.current.updateCount++;
      syncMetrics.current.lastLatency = latency;
      syncMetrics.current.averageLatency =
        (syncMetrics.current.averageLatency *
          (syncMetrics.current.updateCount - 1) +
          latency) /
        syncMetrics.current.updateCount;

      lastSyncTime.current = now;

      // Log sync performance in development
      if (import.meta.env.DEV) {
        console.log(
          `🔄 Sync update: ${objects.length} objects, latency: ${latency}ms`
        );
      }

      // Forward to callback
      onObjectsUpdate(objects);
    },
    [onObjectsUpdate]
  );

  /**
   * Subscribe to real-time updates
   */
  const subscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      console.warn("Already subscribed to real-time updates");
      return;
    }

    console.log("📡 Subscribing to real-time object updates...");
    unsubscribeRef.current =
      canvasService.subscribeToObjects(handleObjectsUpdate);
  }, [handleObjectsUpdate]);

  /**
   * Unsubscribe from real-time updates
   */
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      console.log("📡 Unsubscribing from real-time updates...");
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  /**
   * Get current sync metrics
   */
  const getSyncMetrics = useCallback(() => {
    return { ...syncMetrics.current };
  }, []);

  /**
   * Auto-subscribe on mount, cleanup on unmount
   */
  useEffect(() => {
    if (enabled) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe]);

  /**
   * Reconnection handling: when /.info/connected becomes true, re-subscribe
   * and refresh the latest canvas state to avoid any missed updates.
   */
  useEffect(() => {
    if (!enabled) return;

    const connectedRef = ref(database, "/.info/connected");

    const handleConnected = (snap: { val: () => unknown }) => {
      const isConnected = !!snap.val();
      if (!isConnected) return;

      console.log(
        "🌐 Network reconnected - resubscribing and refreshing state"
      );
      // Ensure a fresh subscription
      unsubscribe();
      subscribe();

      // Fetch current state explicitly to resync
      canvasService
        .getCanvasState()
        .then((objects) => {
          onObjectsUpdate(objects);
        })
        .catch((err) => {
          console.error("Failed to refresh canvas state after reconnect:", err);
        });
    };

    onValue(connectedRef, handleConnected);

    return () => {
      off(connectedRef, "value", handleConnected);
    };
  }, [enabled, subscribe, unsubscribe, onObjectsUpdate]);

  return {
    subscribe,
    unsubscribe,
    getSyncMetrics,
    isSubscribed: () => unsubscribeRef.current !== null,
  };
};

/**
 * Hook for syncing a single object in real-time
 * Useful for detailed object-level subscriptions
 */
export const useObjectSync = (
  objectId: string | null,
  onObjectUpdate: (object: CanvasObject | null) => void,
  enabled: boolean = true
) => {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !objectId) {
      return;
    }

    console.log(`📡 Subscribing to object: ${objectId}`);
    unsubscribeRef.current = canvasService.subscribeToObject(
      objectId,
      onObjectUpdate
    );

    return () => {
      if (unsubscribeRef.current) {
        console.log(`📡 Unsubscribing from object: ${objectId}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [objectId, onObjectUpdate, enabled]);

  return {
    isSubscribed: () => unsubscribeRef.current !== null,
  };
};

/**
 * Hook for initializing canvas and loading initial state
 */
export const useCanvasInitialization = () => {
  const isInitialized = useRef(false);
  const isInitializing = useRef(false);

  /**
   * Initialize canvas metadata and load initial state
   */
  const initializeCanvas = useCallback(async (): Promise<CanvasObject[]> => {
    if (isInitialized.current || isInitializing.current) {
      console.log("Canvas already initialized or initializing");
      return [];
    }

    try {
      isInitializing.current = true;
      console.log("🚀 Initializing canvas...");

      // Initialize canvas metadata if needed
      await canvasService.initializeCanvas();

      // Load initial canvas state
      const objects = await canvasService.getCanvasState();
      console.log(`✅ Canvas initialized with ${objects.length} objects`);

      isInitialized.current = true;
      return objects;
    } catch (error) {
      console.error("❌ Failed to initialize canvas:", error);
      throw error;
    } finally {
      isInitializing.current = false;
    }
  }, []);

  /**
   * Reset initialization state (useful for testing)
   */
  const resetInitialization = useCallback(() => {
    isInitialized.current = false;
    isInitializing.current = false;
  }, []);

  return {
    initializeCanvas,
    resetInitialization,
    isInitialized: () => isInitialized.current,
    isInitializing: () => isInitializing.current,
  };
};

/**
 * Hook for syncing object operations to Firebase with retry logic
 */
export const useSyncOperations = () => {
  // Pending update coalescing for performance
  const pendingUpdatesRef = useRef<Record<string, Partial<CanvasObject>>>({});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingUpdates = useCallback(async () => {
    const pending = pendingUpdatesRef.current;
    pendingUpdatesRef.current = {};
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const ids = Object.keys(pending);
    if (ids.length === 0) return;

    try {
      if (ids.length === 1) {
        const id = ids[0];
        await canvasService.updateObject(id, pending[id]);
      } else {
        await canvasService.batchUpdateObjects(pending);
      }
    } catch (error) {
      console.error("Error flushing pending object updates:", error);
    }
  }, []);

  const enqueueUpdate = useCallback(
    (
      objectId: string,
      updates: Partial<CanvasObject>,
      delayMs: number = 50
    ) => {
      pendingUpdatesRef.current[objectId] = {
        ...(pendingUpdatesRef.current[objectId] || {}),
        ...updates,
      };
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flushPendingUpdates, delayMs);
      }
    },
    [flushPendingUpdates]
  );
  /**
   * Save object with retry logic
   */
  const saveObject = useCallback(
    async (object: CanvasObject): Promise<void> => {
      return syncHelpers.retryOperation(
        () => canvasService.saveObject(object),
        3, // max retries
        500 // delay in ms
      );
    },
    []
  );

  /**
   * Update object with retry logic
   */
  const updateObject = useCallback(
    async (objectId: string, updates: Partial<CanvasObject>): Promise<void> => {
      return syncHelpers.retryOperation(
        async () => enqueueUpdate(objectId, updates),
        3,
        100
      );
    },
    [enqueueUpdate]
  );

  /**
   * Delete object with retry logic
   */
  const deleteObject = useCallback(
    async (objectId: string): Promise<void> => {
      // Remove any pending changes for this object; flush others first
      // Omit pending updates for this object without creating an unused binding
      const clone = { ...pendingUpdatesRef.current };
      delete (clone as Record<string, unknown>)[objectId];
      pendingUpdatesRef.current = clone as Record<
        string,
        Partial<CanvasObject>
      >;
      await flushPendingUpdates();

      return syncHelpers.retryOperation(
        () => canvasService.deleteObject(objectId),
        3,
        500
      );
    },
    [flushPendingUpdates]
  );

  /**
   * Batch update multiple objects
   */
  const batchUpdate = useCallback(
    async (updates: Record<string, Partial<CanvasObject>>): Promise<void> => {
      return syncHelpers.retryOperation(
        () => canvasService.batchUpdateObjects(updates),
        3,
        500
      );
    },
    []
  );

  return {
    saveObject,
    updateObject,
    deleteObject,
    batchUpdate,
    flushPendingUpdates,
  };
};
