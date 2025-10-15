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
  // Last edit attribution (for hover tooltip)
  lastEditedBy?: string; // User ID who last edited this object
  lastEditedByName?: string; // Display name of the last editor
  lastEditedAt?: number; // Timestamp of the last edit
}

/**
 * Rectangle object type
 */
export interface Rectangle extends CanvasObject {
  type: "rectangle";
}

/**
 * Union type for all shape types (future-proof for circles, lines, etc.)
 */
export type ShapeObject = Rectangle;

/**
 * Default shape properties for new rectangles
 */
export const DEFAULT_RECTANGLE = {
  width: 150,
  height: 100,
  color: "#3B82F6", // Blue color
} as const;

/**
 * Canvas state interface for context
 */
export interface CanvasState {
  objects: CanvasObject[]; // All objects on the canvas
  selectedObjectId: string | null; // Currently selected object
  viewport: Viewport; // Current viewport state
  canvasSize: Size; // Bounded canvas dimensions
  loading: boolean; // Loading state
  isDragging: boolean; // Track if user is dragging an object
  isResizing: boolean; // Track if user is resizing an object
}

/**
 * Object transformation data (for move/resize operations)
 */
export interface ObjectTransform {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number; // Future-proof for rotation
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
