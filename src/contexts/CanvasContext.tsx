// CanvasContext - Manages canvas state globally
import { createContext, useContext, useState, type ReactNode } from "react";
import type {
  CanvasObject,
  CanvasState,
  Viewport,
} from "../types/canvas.types";
import { CANVAS_CONFIG } from "../constants/canvas";

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
  deleteObject: (id: string) => void;
  selectObject: (id: string | null) => void;
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
 */
export function CanvasProvider({ children }: CanvasProviderProps) {
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
    loading: false,
  });

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
   * Add a new object to the canvas
   */
  const addObject = (object: CanvasObject) => {
    setCanvasState((prev) => ({
      ...prev,
      objects: [...prev.objects, object],
    }));
  };

  /**
   * Update an existing object
   */
  const updateObject = (id: string, updates: Partial<CanvasObject>) => {
    setCanvasState((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) =>
        obj.id === id ? { ...obj, ...updates } : obj
      ),
    }));
  };

  /**
   * Delete an object from the canvas
   */
  const deleteObject = (id: string) => {
    setCanvasState((prev) => ({
      ...prev,
      objects: prev.objects.filter((obj) => obj.id !== id),
      selectedObjectId:
        prev.selectedObjectId === id ? null : prev.selectedObjectId,
    }));
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
