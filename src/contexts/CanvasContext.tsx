// CanvasContext - Manages canvas state globally with real-time sync
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  CanvasObject,
  CanvasState,
  Viewport,
} from "../types/canvas.types";
import { DEFAULT_RECTANGLE } from "../types/canvas.types";
import { CANVAS_CONFIG } from "../constants/canvas";
import { useAuth } from "../hooks/useAuth";
import {
  useRealtimeSync,
  useCanvasInitialization,
  useSyncOperations,
} from "../hooks/useRealtimeSync";
import { syncHelpers } from "../utils/syncHelpers";
import { canvasHelpers } from "../utils/canvasHelpers";
import { offlineQueue } from "../utils/offlineQueue";
import type { QueuedOperation } from "../utils/indexedDBManager";
import {
  TransactionErrorType,
  getErrorMessage,
} from "../services/transactionService";

/**
 * Canvas Context Interface
 * Defines all canvas-related methods and state available to components
 */
interface CanvasContextType extends CanvasState {
  setViewport: (viewport: Viewport) => void;
  setScale: (scale: number) => void;
  setPosition: (x: number, y: number) => void;
  resetViewport: () => void;
  addObject: (object: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => Promise<void>;
  selectObject: (id: string | null) => void;
  createRectangle: () => Promise<void>;
  isCanvasDisabled: boolean;
  pauseSync: () => void;
  resumeSync: () => void;
}

// Create the context with undefined default value
const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

/**
 * Canvas Provider Props
 */
interface CanvasProviderProps {
  children: ReactNode;
}

/**
 * CanvasProvider Component
 * Wraps canvas-related components and provides canvas state and methods
 * Now with real-time synchronization!
 */
export function CanvasProvider({ children }: CanvasProviderProps) {
  const { user } = useAuth();
  const { initializeCanvas } = useCanvasInitialization();
  const syncOps = useSyncOperations();

  const [canvasState, setCanvasState] = useState<CanvasState>({
    objects: [],
    selectedObjectId: null,
    viewport: {
      x: 0,
      y: 0,
      scale: CANVAS_CONFIG.DEFAULT_ZOOM,
    },
    canvasSize: {
      width: CANVAS_CONFIG.DEFAULT_WIDTH,
      height: CANVAS_CONFIG.DEFAULT_HEIGHT,
    },
    loading: true, // Start with loading state
    isDragging: false,
    isResizing: false,
  });

  // Track canvas disabled state (when offline timeout exceeded)
  const [isCanvasDisabled, setIsCanvasDisabled] = useState(false);

  // Track if we should pause real-time sync (during queue processing)
  const [isSyncPaused, setIsSyncPaused] = useState(false);

  /**
   * Handle incoming objects from Firebase
   * Merges remote changes with local state using Last-Write-Wins
   */
  const handleObjectsUpdate = useCallback(
    (remoteObjects: CanvasObject[]) => {
      // Skip updates if sync is paused (e.g., during queue processing)
      if (isSyncPaused) {
        return;
      }

      setCanvasState((prev) => {
        // Merge local and remote objects with conflict resolution
        const mergedObjects = syncHelpers.mergeObjects(
          prev.objects,
          remoteObjects
        );

        return {
          ...prev,
          objects: mergedObjects,
          loading: false, // Data loaded
        };
      });
    },
    [isSyncPaused]
  );

  /**
   * Initialize canvas and load initial state
   */
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const initialObjects = await initializeCanvas();

        setCanvasState((prev) => ({
          ...prev,
          objects: initialObjects,
          loading: false,
        }));
      } catch (error) {
        console.error("❌ Failed to load initial state:", error);
        setCanvasState((prev) => ({ ...prev, loading: false }));
      }
    };

    loadInitialState();
  }, [initializeCanvas]);

  /**
   * Subscribe to real-time updates
   * Only enable after user is authenticated
   */
  useRealtimeSync({
    onObjectsUpdate: handleObjectsUpdate,
    enabled: !!user, // Only sync when user is logged in
  });

  /**
   * Clear local canvas state on logout
   * Ensures no stale objects remain after user signs out
   */
  useEffect(() => {
    if (!user) {
      setCanvasState((prev) => ({
        ...prev,
        objects: [],
        selectedObjectId: null,
        loading: false,
        viewport: {
          x: 0,
          y: 0,
          scale: CANVAS_CONFIG.DEFAULT_ZOOM,
        },
      }));
    }
  }, [user]);

  /**
   * Set the entire viewport (position + scale)
   */
  const setViewport = (viewport: Viewport) => {
    setCanvasState((prev) => ({ ...prev, viewport }));
  };

  /**
   * Set only the scale (zoom level)
   */
  const setScale = (scale: number) => {
    setCanvasState((prev) => ({
      ...prev,
      viewport: { ...prev.viewport, scale },
    }));
  };

  /**
   * Set only the position (pan offset)
   */
  const setPosition = (x: number, y: number) => {
    setCanvasState((prev) => ({
      ...prev,
      viewport: { ...prev.viewport, x, y },
    }));
  };

  /**
   * Reset viewport to default position and zoom
   */
  const resetViewport = () => {
    setCanvasState((prev) => ({
      ...prev,
      viewport: {
        x: 0,
        y: 0,
        scale: CANVAS_CONFIG.DEFAULT_ZOOM,
      },
    }));
  };

  /**
   * Add a new object to the canvas (local state only)
   * Firebase sync happens separately
   */
  const addObject = (object: CanvasObject) => {
    setCanvasState((prev) => ({
      ...prev,
      objects: [...prev.objects, object],
    }));
  };

  /**
   * Update an existing object (local state only)
   * Firebase sync happens separately
   */
  const updateObject = (id: string, updates: Partial<CanvasObject>) => {
    setCanvasState((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) =>
        obj.id === id ? { ...obj, ...updates, timestamp: Date.now() } : obj
      ),
    }));
  };

  /**
   * Delete an object from the canvas
   * Updates local state and syncs to Firebase (or queues if offline)
   */
  const deleteObject = async (id: string) => {
    // Don't allow deletions if canvas is disabled
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot delete objects");
      return;
    }

    // Ensure user is authenticated
    if (!user?.id) {
      console.error("❌ Cannot delete object: User not authenticated");
      return;
    }

    // Update local state immediately (optimistic update)
    setCanvasState((prev) => ({
      ...prev,
      objects: prev.objects.filter((obj) => obj.id !== id),
      selectedObjectId:
        prev.selectedObjectId === id ? null : prev.selectedObjectId,
    }));

    // Sync deletion to Firebase or queue if offline
    try {
      if (!navigator.onLine) {
        // Queue operation when offline
        await offlineQueue.enqueue({
          id: `op-delete-${Date.now()}`,
          type: "delete",
          objectId: id,
          payload: { userId: user.id },
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        const result = await syncOps.deleteObject(id, user.id);

        if (!result.success) {
          // Handle transaction failure
          if (result.error === TransactionErrorType.OBJECT_DELETED) {
            // Object was already deleted, this is fine
            console.warn("Object was already deleted");
          } else {
            // Show error to user
            console.error("Failed to delete object:", result.errorMessage);
            alert(getErrorMessage(result.error!, "rectangle"));

            // Optionally restore object in local state
            // (For now, keep it deleted locally as it's likely gone from server)
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to delete object:", error);
      // Optionally: Restore object in local state if deletion fails
    }
  };

  /**
   * Select an object (or deselect if id is null)
   */
  const selectObject = (id: string | null) => {
    setCanvasState((prev) => ({
      ...prev,
      selectedObjectId: id,
    }));
  };

  /**
   * Pause real-time sync (used during queue processing to prevent race conditions)
   */
  const pauseSync = useCallback(() => {
    setIsSyncPaused(true);
  }, []);

  /**
   * Resume real-time sync after queue processing is complete
   */
  const resumeSync = useCallback(() => {
    setIsSyncPaused(false);
  }, []);

  /**
   * Setup offline queue integration
   * Registers operation executor, sync callbacks, and timeout callback
   */
  useEffect(() => {
    // Register executor function that processes queued operations
    offlineQueue.setOperationExecutor(
      async (operation: QueuedOperation): Promise<void> => {
        let result;

        switch (operation.type) {
          case "create":
            result = await syncOps.saveObject(operation.payload);
            if (!result.success) {
              throw new Error(result.errorMessage || "Failed to create object");
            }
            break;
          case "update":
            result = await syncOps.updateObject(
              operation.objectId,
              operation.payload,
              operation.payload.userId
            );
            if (!result.success) {
              // If object was deleted, don't throw - just skip
              if (result.error === TransactionErrorType.OBJECT_DELETED) {
                console.warn(
                  `Object ${operation.objectId} was deleted, skipping update`
                );
              } else {
                throw new Error(
                  result.errorMessage || "Failed to update object"
                );
              }
            }
            break;
          case "delete":
            // Extract userId from payload
            const userId = operation.payload?.userId || user?.id || "unknown";
            result = await syncOps.deleteObject(operation.objectId, userId);
            if (!result.success) {
              // If already deleted, don't throw - it's the desired state
              if (result.error === TransactionErrorType.OBJECT_DELETED) {
                console.warn(
                  `Object ${operation.objectId} was already deleted`
                );
              } else {
                throw new Error(
                  result.errorMessage || "Failed to delete object"
                );
              }
            }
            break;
          default:
            console.warn(`Unknown operation type: ${operation.type}`);
        }
      }
    );

    // Register sync pause/resume callbacks to prevent race conditions
    offlineQueue.setSyncCallbacks(pauseSync, resumeSync);

    // Register timeout callback - disables canvas after 10 minutes offline
    offlineQueue.onTimeout(() => {
      console.error(
        "🚫 Canvas disabled: offline timeout exceeded (10 minutes)"
      );
      setIsCanvasDisabled(true);
    });

    // Re-enable canvas when back online
    const checkOnlineStatus = async () => {
      if (navigator.onLine) {
        setIsCanvasDisabled(false);

        // Clear any old queue data when back online
        if (offlineQueue.getQueueCount() === 0) {
          await offlineQueue.clearQueue();
        }
      }
    };

    window.addEventListener("online", checkOnlineStatus);

    return () => {
      window.removeEventListener("online", checkOnlineStatus);
    };
  }, [syncOps, pauseSync, resumeSync]);

  /**
   * Create a new rectangle at canvas center with default size and color
   * Saves to Firebase for real-time sync (or queues if offline)
   */
  const createRectangle = async () => {
    // Don't allow creation if canvas is disabled
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot create objects");
      return;
    }

    // Generate unique ID using timestamp + random string
    const id = syncHelpers.generateObjectId("rect");

    // Get canvas container size (fallback to window if not available)
    const container = document.getElementById("canvas-container");
    const stageWidth = container?.offsetWidth ?? window.innerWidth;
    const stageHeight = container?.offsetHeight ?? window.innerHeight;

    // Compute visible center in screen coords, convert to canvas coords
    const screenCenterX = stageWidth / 2;
    const screenCenterY = stageHeight / 2;
    const centerPos = canvasHelpers.screenToCanvas(
      screenCenterX,
      screenCenterY,
      canvasState.viewport.scale,
      { x: canvasState.viewport.x, y: canvasState.viewport.y }
    );

    // Position rectangle so its center is at viewport center
    const x = centerPos.x - DEFAULT_RECTANGLE.width / 2;
    const y = centerPos.y - DEFAULT_RECTANGLE.height / 2;

    const newRectangle: CanvasObject = {
      id,
      x,
      y,
      width: DEFAULT_RECTANGLE.width,
      height: DEFAULT_RECTANGLE.height,
      color: DEFAULT_RECTANGLE.color,
      createdBy: user?.id || "anonymous",
      timestamp: Date.now(),
    };

    // Add to local state immediately (optimistic update)
    addObject(newRectangle);
    // Auto-select the newly created object
    selectObject(id);

    // Save to Firebase for real-time sync or queue if offline
    try {
      if (!navigator.onLine) {
        // Queue operation when offline
        await offlineQueue.enqueue({
          id: `op-create-${Date.now()}`,
          type: "create",
          objectId: id,
          payload: newRectangle,
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        const result = await syncOps.saveObject(newRectangle);

        if (!result.success) {
          // Handle transaction failure
          console.error("Failed to save rectangle:", result.errorMessage);
          alert(getErrorMessage(result.error!, "rectangle"));

          // Remove from local state since save failed
          setCanvasState((prev) => ({
            ...prev,
            objects: prev.objects.filter((obj) => obj.id !== id),
            selectedObjectId: null,
          }));
        }
      }
    } catch (error) {
      console.error("❌ Failed to save rectangle:", error);
      // Remove from local state if save fails
      setCanvasState((prev) => ({
        ...prev,
        objects: prev.objects.filter((obj) => obj.id !== id),
        selectedObjectId: null,
      }));
    }
  };

  const value: CanvasContextType = {
    ...canvasState,
    setViewport,
    setScale,
    setPosition,
    resetViewport,
    addObject,
    updateObject,
    deleteObject,
    selectObject,
    createRectangle,
    isCanvasDisabled,
    pauseSync,
    resumeSync,
  };

  return (
    <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
  );
}

/**
 * Custom hook to use the Canvas context
 * Throws an error if used outside of CanvasProvider
 */
export function useCanvas(): CanvasContextType {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}
