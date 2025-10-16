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
  type: "rectangle" | "circle" | "star" | "line"; // Shape type discriminator
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
  // Stroke properties (optional for backward compatibility)
  stroke?: string; // Stroke color (e.g., "#000000")
  strokeWidth?: number; // Stroke width in pixels (0-20)
}

/**
 * Rectangle object type
 */
export interface RectangleObject extends CanvasObject {
  type: "rectangle";
}

/**
 * Circle object type
 */
export interface CircleObject extends CanvasObject {
  type: "circle";
  radius?: number; // Can be derived from width/2 for circular shapes
}

/**
 * Star object type
 */
export interface StarObject extends CanvasObject {
  type: "star";
  numPoints?: number; // Number of star points (3-12, default: 5)
  innerRadius?: number; // Inner radius ratio (0.0-1.0, default: 0.5)
}

/**
 * Line object type
 */
export interface LineObject extends CanvasObject {
  type: "line";
  points: number[]; // Array of points [x1, y1, x2, y2]
  arrowStart?: boolean; // Show arrow at start point
  arrowEnd?: boolean; // Show arrow at end point
}

/**
 * Union type for all shape types (discriminated union for type safety)
 */
export type ShapeObject =
  | RectangleObject
  | CircleObject
  | StarObject
  | LineObject;

/**
 * Alias for backward compatibility
 */
export type Rectangle = RectangleObject;

/**
 * Default shape properties for new rectangles
 */
export const DEFAULT_RECTANGLE = {
  width: 150,
  height: 100,
  color: "#3B82F6", // Blue color
  stroke: "#000000", // Black stroke
  strokeWidth: 2, // 2px stroke width
} as const;

/**
 * Default shape properties for new circles
 */
export const DEFAULT_CIRCLE = {
  width: 100, // Diameter
  height: 100, // Diameter (always equal to width for circles)
  radius: 50, // Radius
  color: "#10B981", // Green color
  stroke: "#000000", // Black stroke
  strokeWidth: 2, // 2px stroke width
} as const;

/**
 * Default shape properties for new stars
 */
export const DEFAULT_STAR = {
  width: 100,
  height: 100,
  numPoints: 5, // 5-pointed star
  innerRadius: 0.5, // 50% inner radius
  color: "#F59E0B", // Orange color
  stroke: "#000000", // Black stroke
  strokeWidth: 2, // 2px stroke width
} as const;

/**
 * Default shape properties for new lines
 */
export const DEFAULT_LINE = {
  width: 100, // Line length (for initial creation)
  height: 2, // Line thickness
  color: "#000000", // Black line
  stroke: "#000000", // Black stroke
  strokeWidth: 2, // 2px stroke width
  arrowStart: false, // No arrow at start
  arrowEnd: true, // Arrow at end
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
