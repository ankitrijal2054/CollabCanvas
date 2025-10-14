// Canvas service - Firebase Realtime Database operations for canvas objects
import { ref, set, update, remove, get, onValue, off } from "firebase/database";
import { database } from "./firebase";
import { DEFAULT_CANVAS_ID } from "../constants/canvas";
import type { CanvasObject } from "../types/canvas.types";

/**
 * Canvas Service
 * Handles all Firebase Realtime Database operations for canvas objects
 */
export const canvasService = {
  /**
   * Save a new object to the canvas
   * @param objectData - Complete object data to save
   */
  saveObject: async (objectData: CanvasObject): Promise<void> => {
    try {
      const objectRef = ref(
        database,
        `/canvases/${DEFAULT_CANVAS_ID}/objects/${objectData.id}`
      );
      await set(objectRef, objectData);
      console.log("Object saved:", objectData.id);
    } catch (error) {
      console.error("Error saving object:", error);
      throw error;
    }
  },

  /**
   * Update an existing object with partial data
   * @param objectId - ID of the object to update
   * @param updates - Partial object data to update
   */
  updateObject: async (
    objectId: string,
    updates: Partial<CanvasObject>
  ): Promise<void> => {
    try {
      const objectRef = ref(
        database,
        `/canvases/${DEFAULT_CANVAS_ID}/objects/${objectId}`
      );
      await update(objectRef, {
        ...updates,
        timestamp: Date.now(), // Always update timestamp on any change
      });
      console.log("Object updated:", objectId);
    } catch (error) {
      console.error("Error updating object:", error);
      throw error;
    }
  },

  /**
   * Delete an object from the canvas
   * @param objectId - ID of the object to delete
   */
  deleteObject: async (objectId: string): Promise<void> => {
    try {
      const objectRef = ref(
        database,
        `/canvases/${DEFAULT_CANVAS_ID}/objects/${objectId}`
      );
      await remove(objectRef);
      console.log("Object deleted:", objectId);
    } catch (error) {
      console.error("Error deleting object:", error);
      throw error;
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
        console.log("Canvas state loaded:", objectsArray.length, "objects");
        return objectsArray;
      } else {
        console.log("No objects found in canvas");
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
        console.log("Canvas initialized with metadata");
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
      console.log(
        "Batch update completed:",
        Object.keys(updates).length,
        "objects"
      );
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
      console.log("Canvas cleared");
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
