// Canvas service - Firebase Realtime Database operations for canvas objects
import { ref, set, update, remove, get, onValue, off } from "firebase/database";
import { database } from "./firebase";
import { DEFAULT_CANVAS_ID } from "../constants/canvas";
import type { CanvasObject } from "../types/canvas.types";
import {
  updateObjectTransaction,
  deleteObjectTransaction,
  createObjectTransaction,
  type TransactionResult,
} from "./transactionService";

/**
 * Canvas Service
 * Handles all Firebase Realtime Database operations for canvas objects
 */
export const canvasService = {
  /**
   * Save a new object to the canvas using atomic transaction
   * @param objectData - Complete object data to save
   * @returns Transaction result with success status
   */
  saveObject: async (objectData: CanvasObject): Promise<TransactionResult> => {
    try {
      const result = await createObjectTransaction(objectData);

      if (!result.success) {
        console.error("Failed to save object:", result.errorMessage);
      }

      return result;
    } catch (error) {
      console.error("Error saving object:", error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Update an existing object with partial data using atomic transaction
   * Prevents ghost objects and stale updates
   * @param objectId - ID of the object to update
   * @param updates - Partial object data to update
   * @param userId - Optional user ID for attribution
   * @returns Transaction result with success status and error details
   */
  updateObject: async (
    objectId: string,
    updates: Partial<CanvasObject>,
    userId?: string
  ): Promise<TransactionResult> => {
    try {
      // Ensure timestamp is included
      const updatesWithTimestamp = {
        ...updates,
        timestamp: updates.timestamp || Date.now(),
      };

      const result = await updateObjectTransaction(
        objectId,
        updatesWithTimestamp,
        userId
      );

      if (!result.success) {
        console.error("Failed to update object:", result.errorMessage);
      }

      return result;
    } catch (error) {
      console.error("Error updating object:", error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Delete an object from the canvas using atomic transaction
   * Prevents double-delete errors
   * @param objectId - ID of the object to delete
   * @param userId - User ID performing the deletion
   * @returns Transaction result with success status
   */
  deleteObject: async (
    objectId: string,
    userId: string
  ): Promise<TransactionResult> => {
    try {
      const result = await deleteObjectTransaction(objectId, userId);

      if (!result.success) {
        console.error("Failed to delete object:", result.errorMessage);
      }

      return result;
    } catch (error) {
      console.error("Error deleting object:", error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Get all objects from the canvas (one-time read)
   * @returns Promise with all canvas objects
   */
  getCanvasState: async (): Promise<CanvasObject[]> => {
    try {
      const objectsRef = ref(
        database,
        `/canvases/${DEFAULT_CANVAS_ID}/objects`
      );
      const snapshot = await get(objectsRef);

      if (snapshot.exists()) {
        const objectsData = snapshot.val();
        // Convert object of objects to array
        const objectsArray = Object.values(objectsData) as CanvasObject[];
        return objectsArray;
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error getting canvas state:", error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time updates for all canvas objects
   * @param callback - Function to call when objects change
   * @returns Unsubscribe function
   */
  subscribeToObjects: (
    callback: (objects: CanvasObject[]) => void
  ): (() => void) => {
    const objectsRef = ref(database, `/canvases/${DEFAULT_CANVAS_ID}/objects`);

    const handleValue = (snapshot: any) => {
      if (snapshot.exists()) {
        const objectsData = snapshot.val();
        const objectsArray = Object.values(objectsData) as CanvasObject[];
        callback(objectsArray);
      } else {
        callback([]);
      }
    };

    // Subscribe to real-time updates
    onValue(objectsRef, handleValue);

    // Return unsubscribe function
    return () => {
      off(objectsRef, "value", handleValue);
    };
  },

  /**
   * Subscribe to changes for a specific object
   * @param objectId - ID of the object to watch
   * @param callback - Function to call when object changes
   * @returns Unsubscribe function
   */
  subscribeToObject: (
    objectId: string,
    callback: (object: CanvasObject | null) => void
  ): (() => void) => {
    const objectRef = ref(
      database,
      `/canvases/${DEFAULT_CANVAS_ID}/objects/${objectId}`
    );

    const handleValue = (snapshot: any) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as CanvasObject);
      } else {
        callback(null);
      }
    };

    onValue(objectRef, handleValue);

    return () => {
      off(objectRef, "value", handleValue);
    };
  },

  /**
   * Initialize canvas metadata if it doesn't exist
   */
  initializeCanvas: async (): Promise<void> => {
    try {
      const metadataRef = ref(
        database,
        `/canvases/${DEFAULT_CANVAS_ID}/metadata`
      );
      const snapshot = await get(metadataRef);

      if (!snapshot.exists()) {
        await set(metadataRef, {
          name: "Main Canvas",
          createdAt: Date.now(),
          createdBy: "system",
        });
      }
    } catch (error) {
      console.error("Error initializing canvas:", error);
      throw error;
    }
  },

  /**
   * Batch update multiple objects at once
   * Useful for performance when updating many objects
   * @param updates - Object with objectId as keys and partial updates as values
   */
  batchUpdateObjects: async (
    updates: Record<string, Partial<CanvasObject>>
  ): Promise<void> => {
    try {
      const batchUpdates: Record<string, any> = {};
      const timestamp = Date.now();

      Object.entries(updates).forEach(([objectId, objectUpdates]) => {
        Object.entries(objectUpdates).forEach(([key, value]) => {
          batchUpdates[
            `/canvases/${DEFAULT_CANVAS_ID}/objects/${objectId}/${key}`
          ] = value;
        });
        // Add timestamp to each object
        batchUpdates[
          `/canvases/${DEFAULT_CANVAS_ID}/objects/${objectId}/timestamp`
        ] = timestamp;
      });

      const rootRef = ref(database);
      await update(rootRef, batchUpdates);
    } catch (error) {
      console.error("Error in batch update:", error);
      throw error;
    }
  },

  /**
   * Clear all objects from the canvas (use with caution!)
   */
  clearCanvas: async (): Promise<void> => {
    try {
      const objectsRef = ref(
        database,
        `/canvases/${DEFAULT_CANVAS_ID}/objects`
      );
      await remove(objectsRef);
    } catch (error) {
      console.error("Error clearing canvas:", error);
      throw error;
    }
  },

  /**
   * Check if canvas exists and has been initialized
   */
  canvasExists: async (): Promise<boolean> => {
    try {
      const metadataRef = ref(
        database,
        `/canvases/${DEFAULT_CANVAS_ID}/metadata`
      );
      const snapshot = await get(metadataRef);
      return snapshot.exists();
    } catch (error) {
      console.error("Error checking canvas existence:", error);
      return false;
    }
  },

  /**
   * Get canvas metadata
   */
  getCanvasMetadata: async (): Promise<{
    name: string;
    createdAt: number;
    createdBy: string;
  } | null> => {
    try {
      const metadataRef = ref(
        database,
        `/canvases/${DEFAULT_CANVAS_ID}/metadata`
      );
      const snapshot = await get(metadataRef);

      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error("Error getting canvas metadata:", error);
      throw error;
    }
  },
};
