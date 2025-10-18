// Canvas types for the collaborative canvas application

/**
 * Blend modes for canvas objects (maps to Canvas 2D Context globalCompositeOperation)
 * Controls how colors blend when objects overlap
 */
export type BlendMode =
  | "source-over" // Normal (default) - top layer covers bottom
  | "multiply" // Darken by multiplying colors (good for shadows)
  | "screen" // Lighten by inverting, multiplying, and inverting (good for glows)
  | "overlay" // Combination of multiply and screen (increases contrast)
  | "darken" // Pick darker of two colors per channel
  | "lighten" // Pick lighter of two colors per channel
  | "color-dodge" // Brightens background based on source (extreme lighten)
  | "color-burn" // Darkens background based on source (extreme darken)
  | "hard-light" // Like overlay but with source/destination swapped
  | "soft-light" // Softer version of hard-light
  | "difference" // Subtracts colors (creates invert-like effect)
  | "exclusion" // Similar to difference but lower contrast
  | "hue" // Uses hue of source with saturation/luminosity of destination
  | "saturation" // Uses saturation of source with hue/luminosity of destination
  | "color" // Uses hue and saturation of source with luminosity of destination
  | "luminosity"; // Uses luminosity of source with hue/saturation of destination

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
  type: "rectangle" | "circle" | "star" | "line" | "text"; // Shape type discriminator
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
  // Layer ordering (z-index)
  zIndex?: number; // Layer order (higher = in front, default: auto-increment from timestamp)
  // Custom layer name (optional, for layers panel)
  name?: string; // User-defined layer name (e.g., "Logo", "Background")
  // Opacity and blend modes (Phase 2 - PR #22)
  opacity?: number; // Opacity level (0.0-1.0, default: 1.0 = 100% opaque)
  blendMode?: BlendMode; // Blend mode for color mixing (default: 'source-over' = normal)
  // Rotation (Phase 2 - PR #17)
  rotation?: number; // Rotation angle in degrees (0-360, default: 0)
  // AI attribution fields (Phase 3 - PR #24)
  aiRequestedBy?: string; // User ID who requested AI operation
  aiOperationId?: string; // Groups objects from same AI command (for undo)
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
 * Text object type
 */
export interface TextObject extends CanvasObject {
  type: "text";
  text: string; // Text content
  fontFamily: string; // Font family (e.g., 'Arial', 'Helvetica')
  fontSize: number; // Font size in pixels
  fontWeight: "normal" | "bold"; // Font weight
  fontStyle: "normal" | "italic"; // Font style
  textAlign: "left" | "center" | "right"; // Text alignment
  // color from base CanvasObject is used for text color
  // width/height auto-calculated from text rendering
}

/**
 * Union type for all shape types (discriminated union for type safety)
 */
export type ShapeObject =
  | RectangleObject
  | CircleObject
  | StarObject
  | LineObject
  | TextObject;

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
 * Default properties for new text objects
 */
export const DEFAULT_TEXT = {
  text: "Double-click to edit", // Default placeholder text
  fontFamily: "Arial", // Default font
  fontSize: 16, // Default font size (px)
  fontWeight: "normal" as const, // Default font weight
  fontStyle: "normal" as const, // Default font style
  textAlign: "left" as const, // Default text alignment
  color: "#000000", // Black text color
  width: 200, // Initial width (will auto-adjust based on content)
  height: 24, // Initial height (will auto-adjust based on content)
  // Note: stroke and strokeWidth are intentionally omitted for text objects
} as const;

/**
 * Canvas state interface for context
 */
export interface CanvasState {
  objects: CanvasObject[]; // All objects on the canvas
  selectedIds: string[]; // Array of selected object IDs (supports multi-select)
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
