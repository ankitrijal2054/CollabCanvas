/**
 * Zod Schemas for AI Tool Parameter Validation
 *
 * These schemas validate parameters for all 16 AI tools, ensuring
 * type safety, bounds checking, and proper error messages.
 */

import { z } from "zod";

// ============================================
// Constants and Helpers
// ============================================

/**
 * Canvas coordinate bounds (-10000 .. 10000)
 * Center-origin coordinates are supported: (0,0) at canvas center
 */
const MIN_CANVAS = -10000;
const MAX_CANVAS = 10000;

/**
 * Size constraints
 */
const MIN_SIZE = 1;
const MAX_SIZE = 5000;

/**
 * Stroke width constraints
 */
const MIN_STROKE = 0;
const MAX_STROKE = 50;

/**
 * Opacity constraints
 */
const MIN_OPACITY = 0;
const MAX_OPACITY = 1;

/**
 * Font size constraints
 */
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 200;

/**
 * Text length constraint
 */
const MAX_TEXT_LENGTH = 1000;

/**
 * Rotation constraints
 */
const MIN_ROTATION = -360;
const MAX_ROTATION = 360;

/**
 * Star points constraints
 */
const MIN_STAR_POINTS = 3;
const MAX_STAR_POINTS = 12;

/**
 * Allowed font families
 */
const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Impact",
  "Comic Sans MS",
  "Palatino",
  "Garamond",
  "Bookman",
  "Avant Garde",
];

/**
 * Hex color regex (supports #RGB, #RRGGBB, #RRGGBBAA)
 */
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;

/**
 * Named colors map (common CSS colors converted to hex)
 */
const NAMED_COLORS: Record<string, string> = {
  red: "#EF4444",
  blue: "#3B82F6",
  green: "#10B981",
  yellow: "#F59E0B",
  purple: "#8B5CF6",
  pink: "#EC4899",
  orange: "#F97316",
  teal: "#14B8A6",
  cyan: "#06B6D4",
  gray: "#6B7280",
  black: "#000000",
  white: "#FFFFFF",
  amber: "#F59E0B",
  lime: "#84CC16",
  indigo: "#6366F1",
  violet: "#8B5CF6",
};

/**
 * Custom Zod color refinement
 * Accepts hex colors or named colors, converts named to hex
 */
const colorSchema = z
  .string()
  .transform((val) => {
    const lower = val.toLowerCase();
    // If it's a named color, convert to hex
    if (NAMED_COLORS[lower]) {
      return NAMED_COLORS[lower];
    }
    return val;
  })
  .refine((val) => HEX_COLOR_REGEX.test(val), {
    message:
      "Color must be a valid hex color (e.g., #FF0000) or named color (e.g., red, blue)",
  });

// ============================================
// Creation Tool Schemas
// ============================================

/**
 * Schema for createShape tool
 */
export const createShapeSchema = z.object({
  type: z.enum(["rectangle", "circle", "star", "line"], {
    message: "Shape type must be rectangle, circle, star, or line",
  }),
  // x/y optional: if omitted, client will place at current viewport center
  x: z.number().min(MIN_CANVAS).max(MAX_CANVAS).optional(),
  y: z.number().min(MIN_CANVAS).max(MAX_CANVAS).optional(),
  width: z.number().min(MIN_SIZE).max(MAX_SIZE),
  height: z.number().min(MIN_SIZE).max(MAX_SIZE),
  color: colorSchema,
  stroke: colorSchema.optional(),
  strokeWidth: z.number().min(MIN_STROKE).max(MAX_STROKE).optional(),
  rotation: z.number().min(MIN_ROTATION).max(MAX_ROTATION).optional(),
  opacity: z.number().min(MIN_OPACITY).max(MAX_OPACITY).optional(),
  // Star-specific properties
  numPoints: z
    .number()
    .int()
    .min(MIN_STAR_POINTS)
    .max(MAX_STAR_POINTS)
    .optional(),
  innerRadius: z.number().min(0).max(1).optional(),
  // Line-specific properties
  points: z.array(z.number()).optional(),
  arrowStart: z.boolean().optional(),
  arrowEnd: z.boolean().optional(),
});

/**
 * Schema for createText tool
 */
export const createTextSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(MAX_TEXT_LENGTH, {
      message: `Text must be between 1 and ${MAX_TEXT_LENGTH} characters`,
    }),
  // x/y optional: if omitted, client will place at current viewport center
  x: z.number().min(MIN_CANVAS).max(MAX_CANVAS).optional(),
  y: z.number().min(MIN_CANVAS).max(MAX_CANVAS).optional(),
  fontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE).optional(),
  fontFamily: z.enum(FONT_FAMILIES as [string, ...string[]]).optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  color: colorSchema.optional(),
  rotation: z.number().min(MIN_ROTATION).max(MAX_ROTATION).optional(),
  opacity: z.number().min(MIN_OPACITY).max(MAX_OPACITY).optional(),
});

// ============================================
// Manipulation Tool Schemas
// ============================================

/**
 * Schema for moveShape tool
 */
export const moveShapeSchema = z.object({
  shapeId: z.string().min(1, { message: "Shape ID is required" }),
  x: z.number().min(MIN_CANVAS).max(MAX_CANVAS),
  y: z.number().min(MIN_CANVAS).max(MAX_CANVAS),
});

/**
 * Schema for resizeShape tool
 */
export const resizeShapeSchema = z.object({
  shapeId: z.string().min(1, { message: "Shape ID is required" }),
  width: z.number().min(MIN_SIZE).max(MAX_SIZE),
  height: z.number().min(MIN_SIZE).max(MAX_SIZE),
});

/**
 * Schema for rotateShape tool
 */
export const rotateShapeSchema = z.object({
  shapeId: z.string().min(1, { message: "Shape ID is required" }),
  degrees: z.number().min(MIN_ROTATION).max(MAX_ROTATION),
});

/**
 * Schema for deleteShape tool
 */
export const deleteShapeSchema = z.object({
  shapeId: z.string().min(1, { message: "Shape ID is required" }),
});

// ============================================
// Styling Tool Schemas
// ============================================

/**
 * Schema for updateShapeStyle tool
 */
export const updateShapeStyleSchema = z.object({
  shapeId: z.string().min(1, { message: "Shape ID is required" }),
  color: colorSchema.optional(),
  stroke: colorSchema.optional(),
  strokeWidth: z.number().min(MIN_STROKE).max(MAX_STROKE).optional(),
  opacity: z.number().min(MIN_OPACITY).max(MAX_OPACITY).optional(),
});

/**
 * Schema for updateTextStyle tool
 */
export const updateTextStyleSchema = z.object({
  shapeId: z.string().min(1, { message: "Shape ID is required" }),
  fontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE).optional(),
  fontFamily: z.enum(FONT_FAMILIES as [string, ...string[]]).optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  color: colorSchema.optional(),
});

// ============================================
// Layout Tool Schemas
// ============================================

/**
 * Schema for arrangeHorizontal tool
 */
export const arrangeHorizontalSchema = z.object({
  shapeIds: z
    .array(z.string())
    .min(2, { message: "At least 2 shapes required for arrangement" }),
  spacing: z.number().min(0).max(1000),
});

/**
 * Schema for arrangeVertical tool
 */
export const arrangeVerticalSchema = z.object({
  shapeIds: z
    .array(z.string())
    .min(2, { message: "At least 2 shapes required for arrangement" }),
  spacing: z.number().min(0).max(1000),
});

/**
 * Schema for createGrid tool
 */
export const createGridSchema = z.object({
  rows: z
    .number()
    .int()
    .min(1)
    .max(20, { message: "Rows must be between 1 and 20" }),
  cols: z
    .number()
    .int()
    .min(1)
    .max(20, { message: "Columns must be between 1 and 20" }),
  cellWidth: z.number().min(MIN_SIZE).max(1000),
  cellHeight: z.number().min(MIN_SIZE).max(1000),
  spacing: z.number().min(0).max(200),
  startX: z.number().min(MIN_CANVAS).max(MAX_CANVAS).optional(),
  startY: z.number().min(MIN_CANVAS).max(MAX_CANVAS).optional(),
  color: colorSchema.optional(),
});

/**
 * Schema for alignShapes tool
 */
export const alignShapesSchema = z.object({
  shapeIds: z
    .array(z.string())
    .min(2, { message: "At least 2 shapes required for alignment" }),
  alignment: z.enum(["left", "center", "right", "top", "middle", "bottom"], {
    message: "Alignment must be left, center, right, top, middle, or bottom",
  }),
});

/**
 * Schema for distributeShapes tool
 */
export const distributeShapesSchema = z.object({
  shapeIds: z
    .array(z.string())
    .min(3, { message: "At least 3 shapes required for distribution" }),
  direction: z.enum(["horizontal", "vertical"], {
    message: "Direction must be horizontal or vertical",
  }),
});

// ============================================
// Query Tool Schemas
// ============================================

/**
 * Schema for getCanvasState tool
 */
export const getCanvasStateSchema = z.object({});

/**
 * Schema for findShapesByColor tool
 */
export const findShapesByColorSchema = z.object({
  color: colorSchema,
});

/**
 * Schema for findShapesByType tool
 */
export const findShapesByTypeSchema = z.object({
  type: z.enum(["rectangle", "circle", "star", "line", "text"], {
    message: "Type must be rectangle, circle, star, line, or text",
  }),
});

// ============================================
// Schema Map
// ============================================

/**
 * Map of tool names to their Zod schemas
 * Used for dynamic validation in toolValidator.ts
 */
export const toolSchemaMap = {
  // Creation
  createShape: createShapeSchema,
  createText: createTextSchema,
  // Manipulation
  moveShape: moveShapeSchema,
  resizeShape: resizeShapeSchema,
  rotateShape: rotateShapeSchema,
  deleteShape: deleteShapeSchema,
  // Styling
  updateShapeStyle: updateShapeStyleSchema,
  updateTextStyle: updateTextStyleSchema,
  // Layout
  arrangeHorizontal: arrangeHorizontalSchema,
  arrangeVertical: arrangeVerticalSchema,
  createGrid: createGridSchema,
  alignShapes: alignShapesSchema,
  distributeShapes: distributeShapesSchema,
  // Query
  getCanvasState: getCanvasStateSchema,
  findShapesByColor: findShapesByColorSchema,
  findShapesByType: findShapesByTypeSchema,
} as const;

// ============================================
// Type Exports for Inferred Types
// ============================================

export type CreateShapeParams = z.infer<typeof createShapeSchema>;
export type CreateTextParams = z.infer<typeof createTextSchema>;
export type MoveShapeParams = z.infer<typeof moveShapeSchema>;
export type ResizeShapeParams = z.infer<typeof resizeShapeSchema>;
export type RotateShapeParams = z.infer<typeof rotateShapeSchema>;
export type DeleteShapeParams = z.infer<typeof deleteShapeSchema>;
export type UpdateShapeStyleParams = z.infer<typeof updateShapeStyleSchema>;
export type UpdateTextStyleParams = z.infer<typeof updateTextStyleSchema>;
export type ArrangeHorizontalParams = z.infer<typeof arrangeHorizontalSchema>;
export type ArrangeVerticalParams = z.infer<typeof arrangeVerticalSchema>;
export type CreateGridParams = z.infer<typeof createGridSchema>;
export type AlignShapesParams = z.infer<typeof alignShapesSchema>;
export type DistributeShapesParams = z.infer<typeof distributeShapesSchema>;
export type GetCanvasStateParams = z.infer<typeof getCanvasStateSchema>;
export type FindShapesByColorParams = z.infer<typeof findShapesByColorSchema>;
export type FindShapesByTypeParams = z.infer<typeof findShapesByTypeSchema>;
