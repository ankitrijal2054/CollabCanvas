/**
 * AI Types for Firebase Cloud Functions
 *
 * These types define the structure of AI commands, responses, tool calls,
 * and error handling for the CollabCanvas AI system.
 */

/**
 * AI command request from the client
 */
export interface AICommand {
  message: string;
  canvasId: string;
  userId: string;
  conversationHistory: AIMessage[];
}

/**
 * AI message in conversation history
 */
export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Tool call returned by OpenAI
 */
export interface ToolCall {
  tool: string;
  parameters: Record<string, unknown>;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  input: number;
  output: number;
}

/**
 * Successful AI response
 */
export interface AIResponse {
  success: true;
  toolCalls: ToolCall[];
  aiResponse: string;
  aiOperationId: string;
  executionTime: number;
  tokensUsed: TokenUsage;
}

/**
 * AI error response
 */
export interface AIError {
  success: false;
  error: AIErrorCode;
  message: string;
  suggestions?: string[];
}

/**
 * AI error codes
 */
export type AIErrorCode =
  | "INVALID_COMMAND"
  | "VALIDATION_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "AUTHENTICATION_ERROR"
  | "CANVAS_NOT_FOUND"
  | "OPENAI_ERROR"
  | "INTERNAL_ERROR";

/**
 * Complete AI API response (success or error)
 */
export type AIAPIResponse = AIResponse | AIError;

// ============================================
// Tool Parameter Types
// ============================================

/**
 * Shape types supported by createShape tool
 */
export type ShapeType = "rectangle" | "circle" | "star" | "line";

/**
 * Alignment options for alignShapes tool
 */
export type AlignmentType =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

/**
 * Distribution direction for distributeShapes tool
 */
export type DistributionDirection = "horizontal" | "vertical";

/**
 * Text alignment options
 */
export type TextAlign = "left" | "center" | "right";

/**
 * Font weight options
 */
export type FontWeight = "normal" | "bold";

/**
 * Font style options
 */
export type FontStyle = "normal" | "italic";

// ============================================
// Tool Parameter Interfaces
// ============================================

/**
 * Parameters for createShape tool
 */
export interface CreateShapeParams {
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  stroke?: string;
  strokeWidth?: number;
  rotation?: number;
  opacity?: number;
  // Star-specific
  numPoints?: number;
  innerRadius?: number;
  // Line-specific
  points?: number[];
  arrowStart?: boolean;
  arrowEnd?: boolean;
}

/**
 * Parameters for createText tool
 */
export interface CreateTextParams {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  textAlign?: TextAlign;
  color?: string;
  rotation?: number;
  opacity?: number;
}

/**
 * Parameters for moveShape tool
 */
export interface MoveShapeParams {
  shapeId: string;
  x: number;
  y: number;
}

/**
 * Parameters for resizeShape tool
 */
export interface ResizeShapeParams {
  shapeId: string;
  width: number;
  height: number;
}

/**
 * Parameters for rotateShape tool
 */
export interface RotateShapeParams {
  shapeId: string;
  degrees: number;
}

/**
 * Parameters for deleteShape tool
 */
export interface DeleteShapeParams {
  shapeId: string;
}

/**
 * Parameters for updateShapeStyle tool
 */
export interface UpdateShapeStyleParams {
  shapeId: string;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

/**
 * Parameters for updateTextStyle tool
 */
export interface UpdateTextStyleParams {
  shapeId: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  textAlign?: TextAlign;
  color?: string;
}

/**
 * Parameters for arrangeHorizontal tool
 */
export interface ArrangeHorizontalParams {
  shapeIds: string[];
  spacing: number;
}

/**
 * Parameters for arrangeVertical tool
 */
export interface ArrangeVerticalParams {
  shapeIds: string[];
  spacing: number;
}

/**
 * Parameters for createGrid tool
 */
export interface CreateGridParams {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  spacing: number;
  startX?: number;
  startY?: number;
  color?: string;
}

/**
 * Parameters for alignShapes tool
 */
export interface AlignShapesParams {
  shapeIds: string[];
  alignment: AlignmentType;
}

/**
 * Parameters for distributeShapes tool
 */
export interface DistributeShapesParams {
  shapeIds: string[];
  direction: DistributionDirection;
}

/**
 * Parameters for getCanvasState tool
 */
export interface GetCanvasStateParams {
  // No parameters needed - returns current state
}

/**
 * Parameters for findShapesByColor tool
 */
export interface FindShapesByColorParams {
  color: string;
}

/**
 * Parameters for findShapesByType tool
 */
export interface FindShapesByTypeParams {
  type: ShapeType | "text";
}

// ============================================
// Canvas State Types (for context)
// ============================================

/**
 * Simplified canvas object for AI context
 */
export interface CanvasObjectSummary {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text?: string;
  rotation?: number;
  createdBy?: string;
  timestamp?: number;
}

/**
 * Canvas state for AI context
 */
export interface CanvasStateSummary {
  objectCount: number;
  objects: CanvasObjectSummary[];
  selectedIds: string[];
  canvasSize: { width: number; height: number };
  recentObjects?: CanvasObjectSummary[];
  typeCounts?: Record<string, number>;
}
