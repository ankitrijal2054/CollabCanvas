// Presence service - Firebase Realtime Database operations for user presence
import {
  ref,
  set,
  update,
  onValue,
  off,
  onDisconnect,
  serverTimestamp,
  get,
} from "firebase/database";
import { database } from "./firebase";
import { DEFAULT_CANVAS_ID } from "../constants/canvas";
import type {
  UserPresence,
  CursorPosition,
  PresenceUpdate,
  PresenceMap,
  UserPresenceExtended,
  TransformSnapshot,
  RemoteTransformsMap,
} from "../types/collaboration.types";

/**
 * Presence Service
 * Handles all Firebase Realtime Database operations for user presence and cursors
 */
export const presenceService = {
  /**
   * Begin a presence session that auto-handles disconnects/reconnects
   * Uses /.info/connected to detect connectivity and (re)register presence
   */
  startPresenceSession: (
    userId: string,
    userName: string,
    canvasId: string = DEFAULT_CANVAS_ID
  ): (() => void) => {
    const connectedRef = ref(database, "/.info/connected");
    const presenceRef = ref(database, `/presence/${canvasId}/${userId}`);

    const handleConnected = async (snap: any) => {
      const connected = !!snap.val();
      if (!connected) return;

      try {
        // Set onDisconnect first to avoid race conditions
        const disconnectRef = onDisconnect(presenceRef);
        await disconnectRef.update({
          online: false,
          cursor: null,
          lastSeen: serverTimestamp(),
        });

        // Now set online state
        await set(presenceRef, {
          name: userName,
          online: true,
          lastSeen: Date.now(),
        } as Partial<UserPresence>);
      } catch (error) {
        console.error("Error starting presence session:", error);
      }
    };

    onValue(connectedRef, handleConnected);

    // Return unsubscribe/cleanup function
    return () => {
      off(connectedRef, "value", handleConnected);
    };
  },

  /**
   * Set or update a live transform snapshot for ghost rendering
   * Path: /presence/{canvasId}/{userId}/transforms/{objectId}
   */
  setTransform: async (
    userId: string,
    objectId: string,
    snapshot: Omit<TransformSnapshot, "lastUpdated">,
    canvasId: string = DEFAULT_CANVAS_ID
  ): Promise<void> => {
    try {
      const transformRef = ref(
        database,
        `/presence/${canvasId}/${userId}/transforms/${objectId}`
      );
      await set(transformRef, {
        ...snapshot,
        objectId,
        lastUpdated: Date.now(),
      });
      if (import.meta.env.DEV) {
        console.debug("[presenceService] setTransform", {
          userId,
          canvasId,
          objectId,
        });
      }
    } catch (error) {
      console.error("Error setting transform snapshot:", error);
      throw error;
    }
  },

  /**
   * Clear a live transform snapshot (on transform end)
   */
  clearTransform: async (
    userId: string,
    objectId: string,
    canvasId: string = DEFAULT_CANVAS_ID
  ): Promise<void> => {
    try {
      const transformRef = ref(
        database,
        `/presence/${canvasId}/${userId}/transforms/${objectId}`
      );
      await set(transformRef, null);
      if (import.meta.env.DEV) {
        console.debug("[presenceService] clearTransform", {
          userId,
          canvasId,
          objectId,
        });
      }
    } catch (error) {
      console.error("Error clearing transform snapshot:", error);
      throw error;
    }
  },

  /**
   * Subscribe to all users' transform snapshots for a canvas
   */
  subscribeToTransforms: (
    canvasId: string = DEFAULT_CANVAS_ID,
    callback: (remoteTransforms: RemoteTransformsMap) => void
  ) => {
    const transformsRef = ref(database, `/presence/${canvasId}`);

    const handleTransforms = (snapshot: any) => {
      const presenceData = snapshot.val() || {};
      const result: RemoteTransformsMap = {};

      Object.entries(presenceData).forEach(([userId, presence]) => {
        const userPresence = presence as any;
        if (userPresence && userPresence.transforms) {
          result[userId] = userPresence.transforms as Record<
            string,
            TransformSnapshot
          >;
        }
      });

      callback(result);
    };

    onValue(transformsRef, handleTransforms);
    return () => off(transformsRef, "value", handleTransforms);
  },

  /**
   * Update cursor position for a user
   * @param userId - Firebase user ID
   * @param position - Cursor position in canvas coordinates
   * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
   */
  updateCursorPosition: async (
    userId: string,
    position: CursorPosition,
    canvasId: string = DEFAULT_CANVAS_ID
  ): Promise<void> => {
    try {
      const presenceRef = ref(database, `/presence/${canvasId}/${userId}`);
      await update(presenceRef, {
        cursor: position,
        lastSeen: Date.now(),
      });
    } catch (error) {
      console.error("Error updating cursor position:", error);
      throw error;
    }
  },

  /**
   * Set user online status and initialize presence
   * @param userId - Firebase user ID
   * @param userName - User's display name
   * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
   */
  setUserOnline: async (
    userId: string,
    userName: string,
    canvasId: string = DEFAULT_CANVAS_ID
  ): Promise<void> => {
    try {
      const presenceRef = ref(database, `/presence/${canvasId}/${userId}`);

      // Set user as online
      const presenceData = {
        name: userName,
        online: true,
        lastSeen: Date.now(),
      };

      await set(presenceRef, presenceData);

      // Setup auto-cleanup on disconnect
      const disconnectRef = onDisconnect(presenceRef);
      await disconnectRef.update({
        online: false,
        cursor: null,
        lastSeen: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error setting user online:", error);
      throw error;
    }
  },

  /**
   * Manually set user offline
   * @param userId - Firebase user ID
   * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
   */
  setUserOffline: async (
    userId: string,
    canvasId: string = DEFAULT_CANVAS_ID
  ): Promise<void> => {
    try {
      const presenceRef = ref(database, `/presence/${canvasId}/${userId}`);
      await update(presenceRef, {
        online: false,
        cursor: null,
        lastSeen: Date.now(),
      });
    } catch (error) {
      console.error("Error setting user offline:", error);
      throw error;
    }
  },

  /**
   * Subscribe to all user presence updates for a canvas
   * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
   * @param callback - Function to call with presence updates
   * @returns Unsubscribe function
   */
  subscribeToPresence: (
    canvasId: string = DEFAULT_CANVAS_ID,
    callback: (presenceMap: PresenceMap) => void
  ) => {
    const presenceRef = ref(database, `/presence/${canvasId}`);

    const handlePresenceChange = (snapshot: any) => {
      const presenceData = snapshot.val();
      const presenceMap: PresenceMap = {};

      if (presenceData) {
        // Convert Firebase object to PresenceMap
        Object.entries(presenceData).forEach(([userId, presence]) => {
          const userPresence = presence as UserPresence;
          presenceMap[userId] = {
            ...userPresence,
            userId,
            color: generateUserColor(userId),
          };
        });
      }

      callback(presenceMap);
    };

    onValue(presenceRef, handlePresenceChange);

    // Return unsubscribe function
    return () => {
      off(presenceRef, "value", handlePresenceChange);
    };
  },

  /**
   * Subscribe to a single user's presence
   * @param userId - Firebase user ID
   * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
   * @param callback - Function to call with presence updates
   * @returns Unsubscribe function
   */
  subscribeToUserPresence: (
    userId: string,
    canvasId: string = DEFAULT_CANVAS_ID,
    callback: (presence: UserPresenceExtended | null) => void
  ) => {
    const userPresenceRef = ref(database, `/presence/${canvasId}/${userId}`);

    const handleUserPresenceChange = (snapshot: any) => {
      const presenceData = snapshot.val() as UserPresence | null;

      if (presenceData) {
        const userPresence: UserPresenceExtended = {
          ...presenceData,
          userId,
          color: generateUserColor(userId),
        };
        callback(userPresence);
      } else {
        callback(null);
      }
    };

    onValue(userPresenceRef, handleUserPresenceChange);

    // Return unsubscribe function
    return () => {
      off(userPresenceRef, "value", handleUserPresenceChange);
    };
  },

  /**
   * Get current presence snapshot for a canvas
   * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
   * @returns PresenceMap of all users
   */
  getPresenceSnapshot: async (
    canvasId: string = DEFAULT_CANVAS_ID
  ): Promise<PresenceMap> => {
    try {
      const presenceRef = ref(database, `/presence/${canvasId}`);
      const snapshot = await get(presenceRef);
      const presenceData = snapshot.val();
      const presenceMap: PresenceMap = {};

      if (presenceData) {
        Object.entries(presenceData).forEach(([userId, presence]) => {
          const userPresence = presence as UserPresence;
          presenceMap[userId] = {
            ...userPresence,
            userId,
            color: generateUserColor(userId),
          };
        });
      }

      return presenceMap;
    } catch (error) {
      console.error("Error getting presence snapshot:", error);
      throw error;
    }
  },

  /**
   * Update partial presence data
   * @param userId - Firebase user ID
   * @param updates - Partial presence updates
   * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
   */
  updatePresence: async (
    userId: string,
    updates: PresenceUpdate,
    canvasId: string = DEFAULT_CANVAS_ID
  ): Promise<void> => {
    try {
      const presenceRef = ref(database, `/presence/${canvasId}/${userId}`);
      await update(presenceRef, {
        ...updates,
        lastSeen: Date.now(),
      });
    } catch (error) {
      console.error("Error updating presence:", error);
      throw error;
    }
  },

  /**
   * Remove cursor position (when user leaves canvas)
   * @param userId - Firebase user ID
   * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
   */
  removeCursor: async (
    userId: string,
    canvasId: string = DEFAULT_CANVAS_ID
  ): Promise<void> => {
    try {
      const presenceRef = ref(database, `/presence/${canvasId}/${userId}`);
      await update(presenceRef, {
        cursor: null,
        lastSeen: Date.now(),
      });
    } catch (error) {
      console.error("Error removing cursor:", error);
      throw error;
    }
  },

  /**
   * Clean up stale presence entries
   * Removes users who have been offline for more than the specified time
   * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours)
   * @param canvasId - Canvas ID (defaults to DEFAULT_CANVAS_ID)
   */
  cleanupStalePresence: async (
    maxAgeMs: number = 24 * 60 * 60 * 1000,
    canvasId: string = DEFAULT_CANVAS_ID
  ): Promise<void> => {
    try {
      const presenceRef = ref(database, `/presence/${canvasId}`);
      const snapshot = await get(presenceRef);
      const presenceData = snapshot.val();

      if (!presenceData) return;

      const now = Date.now();
      const updates: Record<string, null> = {};

      Object.entries(presenceData).forEach(([userId, presence]) => {
        const userPresence = presence as UserPresence;
        const age = now - userPresence.lastSeen;

        if (!userPresence.online && age > maxAgeMs) {
          updates[userId] = null; // Mark for deletion
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(presenceRef, updates);
      }
    } catch (error) {
      console.error("Error cleaning up stale presence:", error);
      throw error;
    }
  },
};

/**
 * Generate a consistent color for a user based on their userId
 * Uses HSL color space for vibrant, distinct colors
 * @param userId - Firebase user ID
 * @returns Hex color string
 */
export function generateUserColor(userId: string): string {
  // Hash the userId to get a number
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use hash to generate HSL values
  const hue = Math.abs(hash % 360); // 0-360 degrees
  const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
  const lightness = 50 + (Math.abs(hash) % 15); // 50-65%

  return hslToHex(hue, saturation, lightness);
}

/**
 * Convert HSL color to Hex
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string
 */
function hslToHex(h: number, s: number, l: number): string {
  const sDecimal = s / 100;
  const lDecimal = l / 100;

  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lDecimal - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const red = Math.round((r + m) * 255);
  const green = Math.round((g + m) * 255);
  const blue = Math.round((b + m) * 255);

  return `#${red.toString(16).padStart(2, "0")}${green
    .toString(16)
    .padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}
