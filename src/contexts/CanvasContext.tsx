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

  /**
   * Handle incoming objects from Firebase
   * Merges remote changes with local state using Last-Write-Wins
   */
  const handleObjectsUpdate = useCallback((remoteObjects: CanvasObject[]) => {
    setCanvasState((prev) => {
      // Merge local and remote objects with conflict resolution
      const mergedObjects = syncHelpers.mergeObjects(
        prev.objects,
        remoteObjects
      );

      // Log sync info in development
      if (import.meta.env.DEV) {
        console.log(
          `🔄 Objects synced: ${mergedObjects.length} total (${prev.objects.length} local, ${remoteObjects.length} remote)`
        );
      }

      return {
        ...prev,
        objects: mergedObjects,
        loading: false, // Data loaded
      };
    });
  }, []);

  /**
   * Initialize canvas and load initial state
   */
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        console.log("🚀 Loading initial canvas state...");
        const initialObjects = await initializeCanvas();

        setCanvasState((prev) => ({
          ...prev,
          objects: initialObjects,
          loading: false,
        }));

        console.log(
          `✅ Initial state loaded: ${initialObjects.length} objects`
        );
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
   * Updates local state and syncs to Firebase
   */
  const deleteObject = async (id: string) => {
    // Update local state immediately (optimistic update)
    setCanvasState((prev) => ({
      ...prev,
      objects: prev.objects.filter((obj) => obj.id !== id),
      selectedObjectId:
        prev.selectedObjectId === id ? null : prev.selectedObjectId,
    }));

    // Sync deletion to Firebase
    try {
      await syncOps.deleteObject(id);
      console.log("✅ Object deleted from Firebase:", id);
    } catch (error) {
      console.error("❌ Failed to delete object from Firebase:", error);
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
   * Create a new rectangle at canvas center with default size and color
   * Saves to Firebase for real-time sync
   */
  const createRectangle = async () => {
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

    // Save to Firebase for real-time sync
    try {
      await syncOps.saveObject(newRectangle);
      console.log("✅ Rectangle saved to Firebase:", id);
    } catch (error) {
      console.error("❌ Failed to save rectangle to Firebase:", error);
      // Optionally: Remove from local state if save fails
      // deleteObject(id);
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
