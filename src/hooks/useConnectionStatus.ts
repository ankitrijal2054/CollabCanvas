/**
 * Connection Status Hook
 *
 * Monitors online/offline status and manages connection state.
 * - Tracks browser online/offline events
 * - Monitors Firebase Realtime Database connection
 * - Tracks queued operations count
 * - Detects 10-minute offline timeout
 * - Triggers canvas disable when timeout exceeded
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../services/firebase";
import { offlineQueue } from "../utils/offlineQueue";

export type ConnectionState =
  | "online"
  | "offline"
  | "reconnecting"
  | "syncing"
  | "timeout";

export interface ConnectionStatus {
  state: ConnectionState;
  isOnline: boolean;
  isOffline: boolean;
  isReconnecting: boolean;
  isSyncing: boolean;
  isTimeout: boolean;
  queuedOperationsCount: number;
  offlineDuration: number | null; // milliseconds since first offline operation
  timeUntilTimeout: number | null; // milliseconds until timeout
  retryConnection: () => void;
}

export const useConnectionStatus = (): ConnectionStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTimeout, setIsTimeout] = useState<boolean>(false);
  const [queuedOperationsCount, setQueuedOperationsCount] = useState<number>(0);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(true);

  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const timeoutCheckIntervalRef = useRef<number | undefined>(undefined);

  /**
   * Calculate offline duration based on oldest queued operation
   */
  const getOfflineDuration = useCallback((): number | null => {
    const oldestTimestamp = offlineQueue.getOldestOperationTimestamp();
    if (oldestTimestamp === null) {
      return null;
    }
    return Date.now() - oldestTimestamp;
  }, []);

  /**
   * Calculate time until timeout
   */
  const getTimeUntilTimeout = useCallback((): number | null => {
    return offlineQueue.getTimeUntilTimeout();
  }, []);

  /**
   * Check if timeout exceeded
   */
  const checkTimeout = useCallback(() => {
    if (offlineQueue.isTimeoutExceeded()) {
      console.warn("useConnectionStatus: Offline timeout exceeded");
      setIsTimeout(true);

      // Clear timeout check interval when timeout exceeded
      if (timeoutCheckIntervalRef.current) {
        clearInterval(timeoutCheckIntervalRef.current);
      }
    }
  }, []);

  /**
   * Handle online event
   */
  const handleOnline = useCallback(async () => {
    console.log("useConnectionStatus: Browser is online");
    setIsOnline(true);
    setIsReconnecting(true);

    // Reset timeout state when coming back online
    setIsTimeout(false);

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Clear timeout check interval if it exists
    if (timeoutCheckIntervalRef.current) {
      clearInterval(timeoutCheckIntervalRef.current);
      timeoutCheckIntervalRef.current = undefined;
    }

    // If we have queued operations, sync them
    const queueCount = offlineQueue.getQueueCount();
    if (queueCount > 0) {
      console.log(
        `useConnectionStatus: Syncing ${queueCount} queued operations`
      );
      setIsSyncing(true);

      try {
        await offlineQueue.processQueue();
        console.log("useConnectionStatus: All operations synced successfully");

        // Clear queue and IndexedDB after successful sync
        await offlineQueue.clearQueue();
        console.log("useConnectionStatus: Queue and IndexedDB cleared");

        // Update queue count to 0
        setQueuedOperationsCount(0);
      } catch (error) {
        console.error("useConnectionStatus: Error processing queue", error);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // No queued operations, but still clear to ensure clean state
      try {
        await offlineQueue.clearQueue();
        setQueuedOperationsCount(0);
      } catch (error) {
        console.error("useConnectionStatus: Error clearing queue", error);
      }
    }

    setIsReconnecting(false);
  }, []);

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    console.log("useConnectionStatus: Browser is offline");
    setIsOnline(false);
    setIsReconnecting(false);
    setIsSyncing(false);

    // Start checking for timeout every second
    if (!timeoutCheckIntervalRef.current) {
      timeoutCheckIntervalRef.current = setInterval(checkTimeout, 1000);
    }
  }, [checkTimeout]);

  /**
   * Manual retry connection
   */
  const retryConnection = useCallback(async () => {
    console.log("useConnectionStatus: Manual retry connection triggered");

    if (!navigator.onLine) {
      console.warn("useConnectionStatus: Browser still offline, cannot retry");
      return;
    }

    setIsReconnecting(true);

    // Reset timeout state
    setIsTimeout(false);

    // Clear timeout check interval if it exists
    if (timeoutCheckIntervalRef.current) {
      clearInterval(timeoutCheckIntervalRef.current);
      timeoutCheckIntervalRef.current = undefined;
    }

    // Attempt to process queue
    const queueCount = offlineQueue.getQueueCount();
    if (queueCount > 0) {
      setIsSyncing(true);
      try {
        await offlineQueue.processQueue();
        console.log("useConnectionStatus: Manual retry successful");

        // Clear queue and IndexedDB after successful sync
        await offlineQueue.clearQueue();
        console.log("useConnectionStatus: Queue and IndexedDB cleared");

        // Update queue count to 0
        setQueuedOperationsCount(0);
      } catch (error) {
        console.error("useConnectionStatus: Manual retry failed", error);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // No queued operations, but still clear to ensure clean state
      try {
        await offlineQueue.clearQueue();
        setQueuedOperationsCount(0);
      } catch (error) {
        console.error("useConnectionStatus: Error clearing queue", error);
      }
    }

    setIsReconnecting(false);
  }, []);

  /**
   * Setup browser online/offline listeners
   */
  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (navigator.onLine) {
      setIsOnline(true);
    } else {
      handleOffline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  /**
   * Setup Firebase connection monitoring
   */
  useEffect(() => {
    // Monitor Firebase connection status using .info/connected
    const connectedRef = ref(database, ".info/connected");

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      setFirebaseConnected(connected);

      if (connected) {
        console.log("useConnectionStatus: Firebase connected");

        // If browser is also online and we have queued ops, trigger sync
        if (navigator.onLine && offlineQueue.getQueueCount() > 0) {
          handleOnline();
        }
      } else {
        console.log("useConnectionStatus: Firebase disconnected");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [handleOnline]);

  /**
   * Setup offline queue monitoring
   */
  useEffect(() => {
    // Subscribe to queue updates
    offlineQueue.onQueueUpdate((count) => {
      setQueuedOperationsCount(count);

      // If queue just became empty and we were syncing, stop syncing
      if (count === 0 && isSyncing) {
        setIsSyncing(false);
      }

      // Reset timeout if queue is empty
      if (count === 0) {
        setIsTimeout(false);
      }
    });

    // Subscribe to timeout events
    offlineQueue.onTimeout(() => {
      console.error(
        "useConnectionStatus: Offline timeout exceeded - disabling canvas"
      );
      setIsTimeout(true);
    });

    // Initial queue count
    setQueuedOperationsCount(offlineQueue.getQueueCount());

    // Check if timeout already exceeded on mount ONLY if we're offline and have queued operations
    if (
      !navigator.onLine &&
      offlineQueue.getQueueCount() > 0 &&
      offlineQueue.isTimeoutExceeded()
    ) {
      console.warn("useConnectionStatus: Timeout already exceeded on mount");
      setIsTimeout(true);
    }

    return () => {
      // Cleanup timeout check interval
      if (timeoutCheckIntervalRef.current) {
        clearInterval(timeoutCheckIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isSyncing]);

  /**
   * Determine overall connection state
   */
  const getConnectionState = (): ConnectionState => {
    if (isTimeout) return "timeout";
    if (isSyncing) return "syncing";
    if (isReconnecting) return "reconnecting";
    if (!isOnline || !firebaseConnected) return "offline";
    return "online";
  };

  const state = getConnectionState();

  return {
    state,
    isOnline: state === "online",
    isOffline: state === "offline",
    isReconnecting: state === "reconnecting",
    isSyncing: state === "syncing",
    isTimeout: state === "timeout",
    queuedOperationsCount,
    offlineDuration: getOfflineDuration(),
    timeUntilTimeout: getTimeUntilTimeout(),
    retryConnection,
  };
};
