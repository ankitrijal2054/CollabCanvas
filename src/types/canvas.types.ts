// Canvas types for the collaborative canvas application

/**
 * 2D Position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 2D Size dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Canvas viewport transform (scale + position)
 */
export interface Transform {
  scale: number; // Zoom level (1 = 100%)
  position: Position; // Pan offset
}

/**
 * Viewport state including scale and position
 */
export interface Viewport {
  x: number; // Pan X offset
  y: number; // Pan Y offset
  scale: number; // Zoom level
}

/**
 * Base interface for all canvas objects
 */
export interface CanvasObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  createdBy: string;
  timestamp: number;
}

/**
 * Rectangle object type
 */
export interface Rectangle extends CanvasObject {
  type: "rectangle";
}

/**
 * Canvas state interface for context
 */
export interface CanvasState {
  objects: CanvasObject[]; // All objects on the canvas
  selectedObjectId: string | null; // Currently selected object
  viewport: Viewport; // Current viewport state
  canvasSize: Size; // Bounded canvas dimensions
  loading: boolean; // Loading state
}

/**
 * Canvas interaction modes
 */
export type CanvasMode = "select" | "pan" | "draw";

/**
 * Canvas bounds
 */
export interface CanvasBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
