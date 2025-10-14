// usePresence hook - manages user presence and cursor tracking
import { useState, useEffect, useCallback, useRef } from "react";
import { presenceService } from "../services/presenceService";
import { syncHelpers } from "../utils/syncHelpers";
import { DEFAULT_CANVAS_ID } from "../constants/canvas";
import type {
  CursorPosition,
  PresenceMap,
  UserPresenceExtended,
  CursorData,
  OnlineUser,
} from "../types/collaboration.types";

/**
 * Configuration options for usePresence hook
 */
export interface UsePresenceOptions {
  canvasId?: string;
  throttleMs?: number; // Cursor update throttle interval (default: 16ms = 60fps)
  enabled?: boolean; // Enable/disable presence tracking (default: true)
}

/**
 * Return type for usePresence hook
 */
export interface UsePresenceReturn {
  // State
  presenceMap: PresenceMap;
  onlineUsers: OnlineUser[];
  cursors: CursorData[];
  isInitialized: boolean;

  // Actions
  updateCursor: (position: CursorPosition) => void;
  removeCursor: () => void;
  updatePresence: (updates: Partial<UserPresenceExtended>) => void;
}

/**
 * Custom hook for managing user presence and cursor tracking
 * Handles initialization, cursor updates, and real-time synchronization
 *
 * @param userId - Current user's Firebase ID
 * @param userName - Current user's display name
 * @param options - Configuration options
 * @returns Presence state and control functions
 *
 * @example
 * ```tsx
 * const { cursors, onlineUsers, updateCursor } = usePresence(
 *   user.uid,
 *   user.displayName,
 *   { throttleMs: 16 }
 * );
 * ```
 */
export function usePresence(
  userId: string | null,
  userName: string | null,
  options: UsePresenceOptions = {}
): UsePresenceReturn {
  const {
    canvasId = DEFAULT_CANVAS_ID,
    throttleMs = 16, // 60fps
    enabled = true,
  } = options;

  // State
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs to avoid recreating throttled function
  const throttledUpdateRef = useRef<
    ((position: CursorPosition) => void) | null
  >(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Initialize user presence when they join
   */
  useEffect(() => {
    if (!enabled || !userId || !userName) {
      setIsInitialized(false);
      return;
    }

    let isMounted = true;

    const initializePresence = async () => {
      try {
        // Set user as online in Firebase
        await presenceService.setUserOnline(userId, userName, canvasId);

        if (isMounted) {
          setIsInitialized(true);
          console.log(`Presence initialized for ${userName}`);
        }
      } catch (error) {
        console.error("Error initializing presence:", error);
        if (isMounted) {
          setIsInitialized(false);
        }
      }
    };

    initializePresence();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (userId) {
        presenceService.setUserOffline(userId, canvasId).catch((error) => {
          console.error("Error setting user offline:", error);
        });
      }
    };
  }, [userId, userName, canvasId, enabled]);

  /**
   * Subscribe to all user presence updates
   */
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    // Subscribe to all presence updates
    const unsubscribe = presenceService.subscribeToPresence(
      canvasId,
      (newPresenceMap) => {
        console.log(
          "🔔 Presence update received:",
          Object.keys(newPresenceMap).length,
          "users",
          newPresenceMap
        );
        setPresenceMap(newPresenceMap);
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup subscription
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, canvasId, enabled]);

  /**
   * Create throttled update function
   */
  useEffect(() => {
    if (!userId) return;

    // Create throttled function for cursor updates
    const throttledUpdate = syncHelpers.throttle((position: CursorPosition) => {
      presenceService
        .updateCursorPosition(userId, position, canvasId)
        .catch((error) => {
          console.error("Error updating cursor position:", error);
        });
    }, throttleMs);

    throttledUpdateRef.current = throttledUpdate;
  }, [userId, canvasId, throttleMs]);

  /**
   * Update cursor position (throttled)
   */
  const updateCursor = useCallback(
    (position: CursorPosition) => {
      if (!enabled || !userId || !throttledUpdateRef.current) return;
      throttledUpdateRef.current(position);
    },
    [userId, enabled]
  );

  /**
   * Remove cursor (when leaving canvas area)
   */
  const removeCursor = useCallback(() => {
    if (!enabled || !userId) return;

    presenceService.removeCursor(userId, canvasId).catch((error) => {
      console.error("Error removing cursor:", error);
    });
  }, [userId, canvasId, enabled]);

  /**
   * Update presence with custom data
   */
  const updatePresence = useCallback(
    (updates: Partial<UserPresenceExtended>) => {
      if (!enabled || !userId) return;

      presenceService
        .updatePresence(userId, updates, canvasId)
        .catch((error) => {
          console.error("Error updating presence:", error);
        });
    },
    [userId, canvasId, enabled]
  );

  /**
   * Compute derived state: online users list
   */
  const onlineUsers: OnlineUser[] = Object.values(presenceMap)
    .filter((user) => user.online && user.userId !== userId) // Exclude current user
    .map((user) => ({
      userId: user.userId,
      name: user.name,
      color: user.color,
      lastSeen: user.lastSeen,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

  /**
   * Compute derived state: cursor data for rendering
   */
  const cursors: CursorData[] = Object.values(presenceMap)
    .filter(
      (user) =>
        user.online && // User is online
        user.userId !== userId && // Not current user
        user.cursor !== undefined && // Has cursor data
        user.cursor !== null
    )
    .map((user) => ({
      userId: user.userId,
      name: user.name,
      position: user.cursor!,
      color: user.color,
    }));

  return {
    // State
    presenceMap,
    onlineUsers,
    cursors,
    isInitialized,

    // Actions
    updateCursor,
    removeCursor,
    updatePresence,
  };
}

/**
 * Hook for tracking only online users (without cursor tracking)
 * Lighter weight alternative when cursor tracking is not needed
 *
 * @param userId - Current user's Firebase ID
 * @param userName - Current user's display name
 * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
 * @returns List of online users
 */
export function useOnlineUsers(
  userId: string | null,
  userName: string | null,
  canvasId: string = DEFAULT_CANVAS_ID
): OnlineUser[] {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!userId || !userName) {
      setOnlineUsers([]);
      return;
    }

    // Initialize presence
    presenceService.setUserOnline(userId, userName, canvasId).catch((error) => {
      console.error("Error setting user online:", error);
    });

    // Subscribe to presence
    const unsubscribe = presenceService.subscribeToPresence(
      canvasId,
      (presenceMap) => {
        const users = Object.values(presenceMap)
          .filter((user) => user.online && user.userId !== userId)
          .map((user) => ({
            userId: user.userId,
            name: user.name,
            color: user.color,
            lastSeen: user.lastSeen,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setOnlineUsers(users);
      }
    );

    // Cleanup
    return () => {
      unsubscribe();
      presenceService.setUserOffline(userId, canvasId).catch((error) => {
        console.error("Error setting user offline:", error);
      });
    };
  }, [userId, userName, canvasId]);

  return onlineUsers;
}

/**
 * Hook for tracking a single user's presence
 * Useful for detailed user status displays
 *
 * @param userId - User ID to track
 * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
 * @returns User presence data or null if not found
 */
export function useUserPresence(
  userId: string | null,
  canvasId: string = DEFAULT_CANVAS_ID
): UserPresenceExtended | null {
  const [userPresence, setUserPresence] = useState<UserPresenceExtended | null>(
    null
  );

  useEffect(() => {
    if (!userId) {
      setUserPresence(null);
      return;
    }

    const unsubscribe = presenceService.subscribeToUserPresence(
      userId,
      canvasId,
      (presence) => {
        setUserPresence(presence);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, canvasId]);

  return userPresence;
}
