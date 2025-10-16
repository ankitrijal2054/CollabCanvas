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
  TextObject,
} from "../types/canvas.types";
import {
  DEFAULT_RECTANGLE,
  DEFAULT_CIRCLE,
  DEFAULT_STAR,
  DEFAULT_LINE,
  DEFAULT_TEXT,
} from "../types/canvas.types";
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
import { clipboardManager } from "../utils/clipboardManager";

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
  selectObject: (id: string | null) => void; // Single select (clears others)
  toggleSelection: (id: string) => void; // Add/remove from selection
  clearSelection: () => void; // Clear all selections
  selectAll: () => void; // Select all objects
  createRectangle: () => Promise<void>;
  createCircle: () => Promise<void>;
  createStar: () => Promise<void>;
  createLine: () => Promise<void>;
  createText: () => Promise<void>;
  isCanvasDisabled: boolean;
  pauseSync: () => void;
  resumeSync: () => void;
  // Text editing state management
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
  // Clipboard operations
  copySelectedObjects: () => void;
  pasteObjects: () => Promise<void>;
  cutSelectedObjects: () => Promise<void>;
  duplicateSelectedObjects: () => Promise<void>;
  // Enhanced delete operation
  deleteSelectedObjects: () => Promise<void>;
  // Nudge operations (arrow keys)
  nudgeSelectedObjects: (dx: number, dy: number) => Promise<void>;
  // Layer ordering operations
  bringForward: () => Promise<void>;
  sendBackward: () => Promise<void>;
  bringToFront: () => Promise<void>;
  sendToBack: () => Promise<void>;
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
    selectedIds: [], // Multi-select support
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

  // Track text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

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
        selectedIds: [], // Clear selections on logout
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
      selectedIds: prev.selectedIds.filter((selectedId) => selectedId !== id), // Remove from selection if selected
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
  /**
   * Select a single object (clears all other selections)
   * @param id - Object ID to select, or null to clear selection
   */
  const selectObject = (id: string | null) => {
    setCanvasState((prev) => ({
      ...prev,
      selectedIds: id ? [id] : [], // Single select replaces all selections
    }));
  };

  /**
   * Toggle an object's selection (add if not selected, remove if selected)
   * Used for Shift+Click multi-select
   * @param id - Object ID to toggle
   */
  const toggleSelection = (id: string) => {
    setCanvasState((prev) => ({
      ...prev,
      selectedIds: prev.selectedIds.includes(id)
        ? prev.selectedIds.filter((selectedId) => selectedId !== id) // Remove if already selected
        : [...prev.selectedIds, id], // Add if not selected
    }));
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    setCanvasState((prev) => ({
      ...prev,
      selectedIds: [],
    }));
  };

  /**
   * Select all objects on the canvas
   */
  const selectAll = () => {
    setCanvasState((prev) => ({
      ...prev,
      selectedIds: prev.objects.map((obj) => obj.id),
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
            {
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

    const now = Date.now();
    const userName = user?.name || user?.email || "Unknown User";

    const newRectangle: CanvasObject = {
      id,
      type: "rectangle",
      x,
      y,
      width: DEFAULT_RECTANGLE.width,
      height: DEFAULT_RECTANGLE.height,
      color: DEFAULT_RECTANGLE.color,
      stroke: DEFAULT_RECTANGLE.stroke,
      strokeWidth: DEFAULT_RECTANGLE.strokeWidth,
      createdBy: user?.id || "anonymous",
      timestamp: now,
      // Attribution for new objects
      lastEditedBy: user?.id,
      lastEditedByName: userName,
      lastEditedAt: now,
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
            selectedIds: [],
          }));
        }
      }
    } catch (error) {
      console.error("❌ Failed to save rectangle:", error);
      // Remove from local state if save fails
      setCanvasState((prev) => ({
        ...prev,
        objects: prev.objects.filter((obj) => obj.id !== id),
        selectedIds: [],
      }));
    }
  };

  /**
   * Create a new circle at canvas center with default size and color
   * Saves to Firebase for real-time sync (or queues if offline)
   */
  const createCircle = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot create objects");
      return;
    }

    const id = syncHelpers.generateObjectId("circle");

    // Get canvas container size
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

    // Position circle so its center is at viewport center
    const x = centerPos.x - DEFAULT_CIRCLE.width / 2;
    const y = centerPos.y - DEFAULT_CIRCLE.height / 2;

    const now = Date.now();
    const userName = user?.name || user?.email || "Unknown User";

    const newCircle: CanvasObject = {
      id,
      type: "circle",
      x,
      y,
      width: DEFAULT_CIRCLE.width,
      height: DEFAULT_CIRCLE.height,
      color: DEFAULT_CIRCLE.color,
      stroke: DEFAULT_CIRCLE.stroke,
      strokeWidth: DEFAULT_CIRCLE.strokeWidth,
      createdBy: user?.id || "anonymous",
      timestamp: now,
      lastEditedBy: user?.id,
      lastEditedByName: userName,
      lastEditedAt: now,
    };

    // Add to local state immediately
    addObject(newCircle);
    selectObject(id);

    // Save to Firebase or queue if offline
    try {
      if (!navigator.onLine) {
        await offlineQueue.enqueue({
          id: `op-create-${Date.now()}`,
          type: "create",
          objectId: id,
          payload: newCircle,
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        const result = await syncOps.saveObject(newCircle);
        if (!result.success) {
          console.error("Failed to save circle:", result.errorMessage);
          alert(getErrorMessage(result.error!, "circle"));
          setCanvasState((prev) => ({
            ...prev,
            objects: prev.objects.filter((obj) => obj.id !== id),
            selectedIds: [],
          }));
        }
      }
    } catch (error) {
      console.error("❌ Failed to save circle:", error);
      setCanvasState((prev) => ({
        ...prev,
        objects: prev.objects.filter((obj) => obj.id !== id),
        selectedIds: [],
      }));
    }
  };

  /**
   * Create a new star at canvas center with default size and color
   * Saves to Firebase for real-time sync (or queues if offline)
   */
  const createStar = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot create objects");
      return;
    }

    const id = syncHelpers.generateObjectId("star");

    // Get canvas container size
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

    // Position star so its center is at viewport center
    const x = centerPos.x - DEFAULT_STAR.width / 2;
    const y = centerPos.y - DEFAULT_STAR.height / 2;

    const now = Date.now();
    const userName = user?.name || user?.email || "Unknown User";

    const newStar: CanvasObject = {
      id,
      type: "star",
      x,
      y,
      width: DEFAULT_STAR.width,
      height: DEFAULT_STAR.height,
      color: DEFAULT_STAR.color,
      stroke: DEFAULT_STAR.stroke,
      strokeWidth: DEFAULT_STAR.strokeWidth,
      createdBy: user?.id || "anonymous",
      timestamp: now,
      lastEditedBy: user?.id,
      lastEditedByName: userName,
      lastEditedAt: now,
    };

    // Add to local state immediately
    addObject(newStar);
    selectObject(id);

    // Save to Firebase or queue if offline
    try {
      if (!navigator.onLine) {
        await offlineQueue.enqueue({
          id: `op-create-${Date.now()}`,
          type: "create",
          objectId: id,
          payload: newStar,
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        const result = await syncOps.saveObject(newStar);
        if (!result.success) {
          console.error("Failed to save star:", result.errorMessage);
          alert(getErrorMessage(result.error!, "star"));
          setCanvasState((prev) => ({
            ...prev,
            objects: prev.objects.filter((obj) => obj.id !== id),
            selectedIds: [],
          }));
        }
      }
    } catch (error) {
      console.error("❌ Failed to save star:", error);
      setCanvasState((prev) => ({
        ...prev,
        objects: prev.objects.filter((obj) => obj.id !== id),
        selectedIds: [],
      }));
    }
  };

  /**
   * Create a new line at canvas center with default length
   * Saves to Firebase for real-time sync (or queues if offline)
   */
  const createLine = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot create objects");
      return;
    }

    const id = syncHelpers.generateObjectId("line");

    // Get canvas container size
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

    // Position line so its center is at viewport center
    const lineWidth = DEFAULT_LINE.width || 100;
    const x = centerPos.x - lineWidth / 2;
    const y = centerPos.y;

    const now = Date.now();
    const userName = user?.name || user?.email || "Unknown User";

    const newLine: CanvasObject = {
      id,
      type: "line",
      x,
      y,
      width: lineWidth,
      height: DEFAULT_LINE.height,
      color: DEFAULT_LINE.color,
      stroke: DEFAULT_LINE.stroke,
      strokeWidth: DEFAULT_LINE.strokeWidth,
      createdBy: user?.id || "anonymous",
      timestamp: now,
      lastEditedBy: user?.id,
      lastEditedByName: userName,
      lastEditedAt: now,
    };

    // Add to local state immediately
    addObject(newLine);
    selectObject(id);

    // Save to Firebase or queue if offline
    try {
      if (!navigator.onLine) {
        await offlineQueue.enqueue({
          id: `op-create-${Date.now()}`,
          type: "create",
          objectId: id,
          payload: newLine,
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        const result = await syncOps.saveObject(newLine);
        if (!result.success) {
          console.error("Failed to save line:", result.errorMessage);
          alert(getErrorMessage(result.error!, "line"));
          setCanvasState((prev) => ({
            ...prev,
            objects: prev.objects.filter((obj) => obj.id !== id),
            selectedIds: [],
          }));
        }
      }
    } catch (error) {
      console.error("❌ Failed to save line:", error);
      setCanvasState((prev) => ({
        ...prev,
        objects: prev.objects.filter((obj) => obj.id !== id),
        selectedIds: [],
      }));
    }
  };

  /**
   * Create a new text object at canvas center with default properties
   * Saves to Firebase for real-time sync (or queues if offline)
   * Automatically enters edit mode after creation
   */
  const createText = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot create objects");
      return;
    }

    const id = syncHelpers.generateObjectId("text");

    // Get canvas container size
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

    // Position text so its center is at viewport center
    const x = centerPos.x - DEFAULT_TEXT.width / 2;
    const y = centerPos.y - DEFAULT_TEXT.height / 2;

    const now = Date.now();
    const userName = user?.name || user?.email || "Unknown User";

    const newText: TextObject = {
      id,
      type: "text",
      x,
      y,
      width: DEFAULT_TEXT.width,
      height: DEFAULT_TEXT.height,
      color: DEFAULT_TEXT.color,
      // Note: stroke and strokeWidth are omitted for text objects (Firebase doesn't accept undefined)
      createdBy: user?.id || "anonymous",
      timestamp: now,
      lastEditedBy: user?.id,
      lastEditedByName: userName,
      lastEditedAt: now,
      // Text-specific properties
      text: DEFAULT_TEXT.text,
      fontFamily: DEFAULT_TEXT.fontFamily,
      fontSize: DEFAULT_TEXT.fontSize,
      fontWeight: DEFAULT_TEXT.fontWeight,
      fontStyle: DEFAULT_TEXT.fontStyle,
      textAlign: DEFAULT_TEXT.textAlign,
    };

    // Add to local state immediately
    addObject(newText);
    selectObject(id);

    // Enter edit mode immediately after creation
    setEditingTextId(id);

    // Save to Firebase or queue if offline
    try {
      if (!navigator.onLine) {
        await offlineQueue.enqueue({
          id: `op-create-${Date.now()}`,
          type: "create",
          objectId: id,
          payload: newText,
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        const result = await syncOps.saveObject(newText);
        if (!result.success) {
          console.error("Failed to save text:", result.errorMessage);
          alert(getErrorMessage(result.error!, "text"));
          setCanvasState((prev) => ({
            ...prev,
            objects: prev.objects.filter((obj) => obj.id !== id),
            selectedIds: [],
          }));
          // Exit edit mode if save failed
          setEditingTextId(null);
        }
      }
    } catch (error) {
      console.error("❌ Failed to save text:", error);
      setCanvasState((prev) => ({
        ...prev,
        objects: prev.objects.filter((obj) => obj.id !== id),
        selectedIds: [],
      }));
      // Exit edit mode if save failed
      setEditingTextId(null);
    }
  };

  /**
   * Copy selected objects to clipboard
   * Stores a copy in memory (not browser clipboard)
   */
  const copySelectedObjects = () => {
    const selectedObjects = canvasState.objects.filter((obj) =>
      canvasState.selectedIds.includes(obj.id)
    );

    if (selectedObjects.length === 0) {
      console.warn("⚠️ No objects selected to copy");
      return;
    }

    clipboardManager.copy(selectedObjects);
    console.log(`📋 Copied ${selectedObjects.length} object(s)`);
  };

  /**
   * Paste objects from clipboard
   * Creates new objects with offset positions and new IDs
   */
  const pasteObjects = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot paste objects");
      return;
    }

    if (!user?.id) {
      console.error("❌ Cannot paste: User not authenticated");
      return;
    }

    // Get objects from clipboard with offset and new IDs
    const pastedObjects = clipboardManager.paste(
      10, // 10px X offset
      10, // 10px Y offset
      syncHelpers.generateObjectId
    );

    if (!pastedObjects || pastedObjects.length === 0) {
      console.warn("⚠️ Nothing to paste");
      return;
    }

    const now = Date.now();
    const userName = user?.name || user?.email || "Unknown User";

    // Update attribution for pasted objects
    const objectsToCreate = pastedObjects.map((obj) => ({
      ...obj,
      createdBy: user.id,
      timestamp: now,
      lastEditedBy: user.id,
      lastEditedByName: userName,
      lastEditedAt: now,
    }));

    // Add to local state immediately (optimistic update)
    setCanvasState((prev) => ({
      ...prev,
      objects: [...prev.objects, ...objectsToCreate],
      selectedIds: objectsToCreate.map((obj) => obj.id), // Select pasted objects
    }));

    // Save to Firebase or queue if offline
    try {
      for (const obj of objectsToCreate) {
        if (!navigator.onLine) {
          await offlineQueue.enqueue({
            id: `op-create-${Date.now()}`,
            type: "create",
            objectId: obj.id,
            payload: obj,
            timestamp: Date.now(),
            retryCount: 0,
          });
        } else {
          const result = await syncOps.saveObject(obj);
          if (!result.success) {
            console.error(
              `Failed to paste object ${obj.id}:`,
              result.errorMessage
            );
            // Remove failed object from local state
            setCanvasState((prev) => ({
              ...prev,
              objects: prev.objects.filter((o) => o.id !== obj.id),
              selectedIds: prev.selectedIds.filter((id) => id !== obj.id),
            }));
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to paste objects:", error);
    }
  };

  /**
   * Cut selected objects
   * Copies to clipboard and deletes originals
   */
  const cutSelectedObjects = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot cut objects");
      return;
    }

    const selectedObjects = canvasState.objects.filter((obj) =>
      canvasState.selectedIds.includes(obj.id)
    );

    if (selectedObjects.length === 0) {
      console.warn("⚠️ No objects selected to cut");
      return;
    }

    // Copy to clipboard first
    clipboardManager.cut(selectedObjects);
    console.log(`✂️ Cut ${selectedObjects.length} object(s)`);

    // Delete selected objects
    const idsToDelete = [...canvasState.selectedIds];
    for (const id of idsToDelete) {
      await deleteObject(id);
    }
  };

  /**
   * Duplicate selected objects
   * Copies and immediately pastes with offset (no clipboard involved)
   */
  const duplicateSelectedObjects = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot duplicate objects");
      return;
    }

    if (!user?.id) {
      console.error("❌ Cannot duplicate: User not authenticated");
      return;
    }

    const selectedObjects = canvasState.objects.filter((obj) =>
      canvasState.selectedIds.includes(obj.id)
    );

    if (selectedObjects.length === 0) {
      console.warn("⚠️ No objects selected to duplicate");
      return;
    }

    const now = Date.now();
    const userName = user?.name || user?.email || "Unknown User";

    // Create duplicates with offset and new IDs
    const duplicates = selectedObjects.map((obj) => ({
      ...JSON.parse(JSON.stringify(obj)), // Deep clone
      id: syncHelpers.generateObjectId(obj.type),
      x: obj.x + 10, // 10px offset
      y: obj.y + 10,
      createdBy: user.id,
      timestamp: now,
      lastEditedBy: user.id,
      lastEditedByName: userName,
      lastEditedAt: now,
    }));

    // Add to local state immediately
    setCanvasState((prev) => ({
      ...prev,
      objects: [...prev.objects, ...duplicates],
      selectedIds: duplicates.map((obj) => obj.id), // Select duplicates
    }));

    // Save to Firebase or queue if offline
    try {
      for (const obj of duplicates) {
        if (!navigator.onLine) {
          await offlineQueue.enqueue({
            id: `op-create-${Date.now()}`,
            type: "create",
            objectId: obj.id,
            payload: obj,
            timestamp: Date.now(),
            retryCount: 0,
          });
        } else {
          const result = await syncOps.saveObject(obj);
          if (!result.success) {
            console.error(
              `Failed to duplicate object ${obj.id}:`,
              result.errorMessage
            );
            // Remove failed object from local state
            setCanvasState((prev) => ({
              ...prev,
              objects: prev.objects.filter((o) => o.id !== obj.id),
              selectedIds: prev.selectedIds.filter((id) => id !== obj.id),
            }));
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to duplicate objects:", error);
    }

    console.log(`🔄 Duplicated ${duplicates.length} object(s)`);
  };

  /**
   * Delete selected objects
   * Shows confirmation dialog if deleting 10+ objects
   */
  const deleteSelectedObjects = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot delete objects");
      return;
    }

    if (!user?.id) {
      console.error("❌ Cannot delete: User not authenticated");
      return;
    }

    const selectedIds = [...canvasState.selectedIds];

    if (selectedIds.length === 0) {
      console.warn("⚠️ No objects selected to delete");
      return;
    }

    // Show confirmation prompt for 10+ objects
    if (selectedIds.length >= 10) {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${selectedIds.length} objects? This action cannot be undone.`
      );
      if (!confirmed) {
        console.log("❌ Delete cancelled by user");
        return;
      }
    }

    // Delete all selected objects
    console.log(`🗑️ Deleting ${selectedIds.length} object(s)...`);
    for (const id of selectedIds) {
      await deleteObject(id);
    }
  };

  /**
   * Helper: Get or initialize zIndex for an object
   * If object doesn't have zIndex, use timestamp
   */
  const getZIndex = (obj: CanvasObject): number => {
    return obj.zIndex !== undefined ? obj.zIndex : obj.timestamp;
  };

  /**
   * Helper: Update zIndex for selected objects
   */
  const updateZIndex = async (
    selectedIds: string[],
    getNewZIndex: (obj: CanvasObject, allObjects: CanvasObject[]) => number
  ) => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot update layer order");
      return;
    }

    if (!user?.id) {
      console.error("❌ Cannot update layer order: User not authenticated");
      return;
    }

    if (selectedIds.length === 0) {
      console.warn("⚠️ No objects selected to reorder");
      return;
    }

    const now = Date.now();
    const userName = user?.name || user?.email || "Unknown User";

    // Calculate new zIndex for each selected object
    const updates = new Map<string, number>();
    for (const id of selectedIds) {
      const obj = canvasState.objects.find((o) => o.id === id);
      if (obj) {
        const newZIndex = getNewZIndex(obj, canvasState.objects);
        updates.set(id, newZIndex);
      }
    }

    // Update local state immediately
    setCanvasState((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) => {
        const newZIndex = updates.get(obj.id);
        if (newZIndex !== undefined) {
          return {
            ...obj,
            zIndex: newZIndex,
            timestamp: now,
            lastEditedBy: user.id,
            lastEditedByName: userName,
            lastEditedAt: now,
          };
        }
        return obj;
      }),
    }));

    // Sync to Firebase
    try {
      for (const [id, newZIndex] of updates) {
        const updatePayload = {
          zIndex: newZIndex,
          timestamp: now,
          lastEditedBy: user.id,
          lastEditedByName: userName,
          lastEditedAt: now,
          userId: user.id,
        };

        if (!navigator.onLine) {
          await offlineQueue.enqueue({
            id: `op-update-${Date.now()}`,
            type: "update",
            objectId: id,
            payload: updatePayload,
            timestamp: now,
            retryCount: 0,
          });
        } else {
          const result = await syncOps.updateObject(id, updatePayload, user.id);
          if (!result.success) {
            console.error(
              `Failed to update zIndex for ${id}:`,
              result.errorMessage
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to sync layer order:", error);
    }
  };

  /**
   * Bring selected objects forward by 1 layer
   * Cmd/Ctrl+]
   */
  const bringForward = async () => {
    await updateZIndex(canvasState.selectedIds, (obj, allObjects) => {
      const currentZ = getZIndex(obj);
      // Find the next higher zIndex
      const higherZIndexes = allObjects
        .map((o) => getZIndex(o))
        .filter((z) => z > currentZ)
        .sort((a, b) => a - b);

      if (higherZIndexes.length > 0) {
        // Swap with the next object above
        return higherZIndexes[0] + 1;
      }
      // Already at top
      return currentZ;
    });
  };

  /**
   * Send selected objects backward by 1 layer
   * Cmd/Ctrl+[
   */
  const sendBackward = async () => {
    await updateZIndex(canvasState.selectedIds, (obj, allObjects) => {
      const currentZ = getZIndex(obj);
      // Find the next lower zIndex
      const lowerZIndexes = allObjects
        .map((o) => getZIndex(o))
        .filter((z) => z < currentZ)
        .sort((a, b) => b - a);

      if (lowerZIndexes.length > 0) {
        // Swap with the next object below
        return Math.max(0, lowerZIndexes[0] - 1);
      }
      // Already at bottom
      return 0;
    });
  };

  /**
   * Bring selected objects to front (highest zIndex)
   * Cmd/Ctrl+Shift+]
   */
  const bringToFront = async () => {
    await updateZIndex(canvasState.selectedIds, (_obj, allObjects) => {
      const maxZ = Math.max(...allObjects.map((o) => getZIndex(o)), 0);
      return maxZ + 1;
    });
  };

  /**
   * Send selected objects to back (lowest zIndex)
   * Cmd/Ctrl+Shift+[
   */
  const sendToBack = async () => {
    await updateZIndex(canvasState.selectedIds, () => {
      return 0;
    });
  };

  /**
   * Nudge selected objects by specified offset
   * Used for arrow key movements (1px or 10px with Shift)
   * Syncs immediately (no debouncing)
   * @param dx - X offset (positive = right, negative = left)
   * @param dy - Y offset (positive = down, negative = up)
   */
  const nudgeSelectedObjects = async (dx: number, dy: number) => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot nudge objects");
      return;
    }

    if (!user?.id) {
      console.error("❌ Cannot nudge: User not authenticated");
      return;
    }

    const selectedIds = [...canvasState.selectedIds];

    if (selectedIds.length === 0) {
      console.warn("⚠️ No objects selected to nudge");
      return;
    }

    const now = Date.now();
    const userName = user?.name || user?.email || "Unknown User";

    // Update local state immediately for all selected objects
    setCanvasState((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) => {
        if (selectedIds.includes(obj.id)) {
          return {
            ...obj,
            x: obj.x + dx,
            y: obj.y + dy,
            timestamp: now,
            lastEditedBy: user.id,
            lastEditedByName: userName,
            lastEditedAt: now,
          };
        }
        return obj;
      }),
    }));

    // Sync to Firebase immediately (no debouncing for nudge operations)
    try {
      for (const id of selectedIds) {
        const obj = canvasState.objects.find((o) => o.id === id);
        if (!obj) continue;

        const updates = {
          x: obj.x + dx,
          y: obj.y + dy,
          timestamp: now,
          lastEditedBy: user.id,
          lastEditedByName: userName,
          lastEditedAt: now,
          userId: user.id, // For transaction validation
        };

        if (!navigator.onLine) {
          // Queue operation when offline
          await offlineQueue.enqueue({
            id: `op-update-${Date.now()}`,
            type: "update",
            objectId: id,
            payload: updates,
            timestamp: now,
            retryCount: 0,
          });
        } else {
          const result = await syncOps.updateObject(id, updates, user.id);
          if (!result.success) {
            console.error(`Failed to nudge object ${id}:`, result.errorMessage);
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to sync nudge:", error);
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
    toggleSelection,
    clearSelection,
    selectAll,
    createRectangle,
    createCircle,
    createStar,
    createLine,
    createText,
    isCanvasDisabled,
    pauseSync,
    resumeSync,
    editingTextId,
    setEditingTextId,
    copySelectedObjects,
    pasteObjects,
    cutSelectedObjects,
    duplicateSelectedObjects,
    deleteSelectedObjects,
    nudgeSelectedObjects,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
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
