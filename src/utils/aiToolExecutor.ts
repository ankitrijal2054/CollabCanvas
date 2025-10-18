/**
 * AI Tool Executor - Executes AI tool calls via Canvas Context
 *
 * Maps each tool name to corresponding Canvas Context functions
 */

import type { ToolCall } from "../types/ai.types";
import type { CanvasObject } from "../types/canvas.types";

/**
 * Options for creating shapes via AI
 */
export interface CreateShapeOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
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
  // AI attribution
  createdBy?: string;
  lastEditedBy?: string;
  lastEditedByName?: string;
  aiRequestedBy?: string;
  aiOperationId?: string;
}

/**
 * Options for creating text via AI
 */
export interface CreateTextOptions {
  x?: number;
  y?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  color?: string;
  rotation?: number;
  opacity?: number;
  // AI attribution
  createdBy?: string;
  lastEditedBy?: string;
  lastEditedByName?: string;
  aiRequestedBy?: string;
  aiOperationId?: string;
}

/**
 * Canvas Context interface (subset needed for tool execution)
 *
 * We use a minimal interface here to avoid circular dependencies
 * The actual implementation will be injected at runtime
 */
export interface CanvasContextForTools {
  // State
  objects: CanvasObject[];
  selectedIds: string[];

  // Object creation with optional parameters
  createRectangle: (options?: CreateShapeOptions) => Promise<string | void>;
  createCircle: (options?: CreateShapeOptions) => Promise<string | void>;
  createStar: (options?: CreateShapeOptions) => Promise<string | void>;
  createLine: (options?: CreateShapeOptions) => Promise<string | void>;
  createText: (options?: CreateTextOptions) => Promise<string | void>;

  // Object manipulation
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => Promise<void>;

  // Selection
  selectObject: (id: string | null) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Sync control (to batch operations)
  pauseSync: () => void;
  resumeSync: () => void;

  // Alignment
  alignSelectedLeft: () => Promise<void>;
  alignSelectedRight: () => Promise<void>;
  alignSelectedTop: () => Promise<void>;
  alignSelectedBottom: () => Promise<void>;
  alignSelectedHorizontalCenter: () => Promise<void>;
  alignSelectedVerticalMiddle: () => Promise<void>;

  // Distribution
  distributeSelectedHorizontal: () => Promise<void>;
  distributeSelectedVertical: () => Promise<void>;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any; // For query tools: structured data (shape IDs, objects, etc.)
  objectsCreated?: string[];
  objectsModified?: string[];
  error?: string;
}

/**
 * Execute a single tool call
 *
 * @param toolCall - The tool call to execute
 * @param context - Canvas context with necessary functions
 * @param userId - User ID for attribution
 * @param aiOperationId - AI operation ID for grouping
 * @returns Execution result
 */
export async function executeToolCall(
  toolCall: ToolCall,
  context: CanvasContextForTools,
  userId: string,
  aiOperationId: string
): Promise<ToolExecutionResult> {
  console.log("[AI Tool Executor] Executing tool", {
    tool: toolCall.tool,
    parameters: toolCall.parameters,
  });

  try {
    switch (toolCall.tool) {
      // ===== CREATION TOOLS =====

      case "createShape":
        return await executeCreateShape(
          toolCall,
          context,
          userId,
          aiOperationId
        );

      case "createText":
        return await executeCreateText(
          toolCall,
          context,
          userId,
          aiOperationId
        );

      // ===== MANIPULATION TOOLS =====

      case "moveShape":
        return await executeMoveShape(toolCall, context);

      case "resizeShape":
        return await executeResizeShape(toolCall, context);

      case "rotateShape":
        return await executeRotateShape(toolCall, context);

      case "deleteShape":
        return await executeDeleteShape(toolCall, context);

      // ===== STYLING TOOLS =====

      case "updateShapeStyle":
        return await executeUpdateShapeStyle(toolCall, context);

      case "updateTextStyle":
        return await executeUpdateTextStyle(toolCall, context);

      // ===== LAYOUT TOOLS =====

      case "arrangeHorizontal":
        return await executeArrangeHorizontal(toolCall, context);

      case "arrangeVertical":
        return await executeArrangeVertical(toolCall, context);

      case "createGrid":
        return await executeCreateGrid(
          toolCall,
          context,
          userId,
          aiOperationId
        );

      case "alignShapes":
        return await executeAlignShapes(toolCall, context);

      case "distributeShapes":
        return await executeDistributeShapes(toolCall, context);

      // ===== QUERY TOOLS =====

      case "getCanvasState":
        return executeGetCanvasState(context);

      case "findShapesByColor":
        return executeFindShapesByColor(toolCall, context);

      case "findShapesByType":
        return executeFindShapesByType(toolCall, context);

      default:
        return {
          success: false,
          message: `Unknown tool: ${toolCall.tool}`,
          error: "UNKNOWN_TOOL",
        };
    }
  } catch (error) {
    console.error("[AI Tool Executor] Tool execution failed", {
      tool: toolCall.tool,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      message: `Failed to execute ${toolCall.tool}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: String(error),
    };
  }
}

/**
 * Execute multiple tool calls sequentially
 *
 * @param toolCalls - Array of tool calls
 * @param context - Canvas context
 * @param userId - User ID
 * @param aiOperationId - AI operation ID
 * @returns Combined execution result
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  context: CanvasContextForTools,
  userId: string,
  aiOperationId: string
): Promise<ToolExecutionResult> {
  console.log("[AI Tool Executor] Executing tool calls", {
    count: toolCalls.length,
    tools: toolCalls.map((tc) => tc.tool),
  });

  const allObjectsCreated: string[] = [];
  const allObjectsModified: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < toolCalls.length; i++) {
    const toolCall = toolCalls[i];
    const result = await executeToolCall(
      toolCall,
      context,
      userId,
      aiOperationId
    );

    if (result.success) {
      if (result.objectsCreated) {
        allObjectsCreated.push(...result.objectsCreated);
      }
      if (result.objectsModified) {
        allObjectsModified.push(...result.objectsModified);
      }
    } else {
      errors.push(`${toolCall.tool}: ${result.error || result.message}`);
    }

    // Small delay between operations to allow state updates
    if (i < toolCalls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Some operations failed: ${errors.join(", ")}`,
      objectsCreated: allObjectsCreated,
      objectsModified: allObjectsModified,
      error: errors.join("; "),
    };
  }

  return {
    success: true,
    message: `Successfully executed ${toolCalls.length} operation(s)`,
    objectsCreated: allObjectsCreated,
    objectsModified: allObjectsModified,
  };
}

// ===== TOOL IMPLEMENTATION FUNCTIONS =====

async function executeCreateShape(
  toolCall: ToolCall,
  context: CanvasContextForTools,
  userId: string,
  aiOperationId: string
): Promise<ToolExecutionResult> {
  const {
    type,
    x,
    y,
    width,
    height,
    color,
    stroke,
    strokeWidth,
    rotation,
    opacity,
    numPoints,
    innerRadius,
    points,
    arrowStart,
    arrowEnd,
  } = toolCall.parameters;

  console.log("[AI Tool Executor] Creating shape", {
    type,
    x,
    y,
    width,
    height,
    color,
  });

  try {
    // Prepare options with all AI-specific properties
    const options: CreateShapeOptions = {
      x: x as number,
      y: y as number,
      width: width as number,
      height: height as number,
      color: color as string,
      stroke: stroke as string | undefined,
      strokeWidth: strokeWidth as number | undefined,
      rotation: rotation as number | undefined,
      opacity: opacity as number | undefined,
      createdBy: "ai-agent",
      lastEditedBy: "ai-agent",
      lastEditedByName: "AI Agent",
      aiRequestedBy: userId,
      aiOperationId: aiOperationId,
    };

    // Add shape-specific properties
    if (type === "star") {
      options.numPoints = numPoints as number | undefined;
      options.innerRadius = innerRadius as number | undefined;
    } else if (type === "line") {
      options.points = points as number[] | undefined;
      options.arrowStart = arrowStart as boolean | undefined;
      options.arrowEnd = arrowEnd as boolean | undefined;
    }

    // Call the appropriate create function with all properties at once
    let objectId: string | void;
    switch (type) {
      case "rectangle":
        objectId = await context.createRectangle(options);
        break;
      case "circle":
        objectId = await context.createCircle(options);
        break;
      case "star":
        objectId = await context.createStar(options);
        break;
      case "line":
        objectId = await context.createLine(options);
        break;
      default:
        return {
          success: false,
          message: `Unknown shape type: ${type}`,
          error: "INVALID_SHAPE_TYPE",
        };
    }

    if (!objectId) {
      return {
        success: false,
        message: "Failed to create shape",
        error: "CREATION_FAILED",
      };
    }

    console.log("[AI Tool Executor] Shape creation complete", {
      objectId,
      type,
    });

    return {
      success: true,
      message: `Created ${type} at (${x}, ${y})`,
      objectsCreated: [objectId],
    };
  } catch (error) {
    console.error("[AI Tool Executor] Shape creation failed", { error });
    throw error;
  }
}

async function executeCreateText(
  toolCall: ToolCall,
  context: CanvasContextForTools,
  userId: string,
  aiOperationId: string
): Promise<ToolExecutionResult> {
  const {
    text,
    x,
    y,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    textAlign,
    color,
    rotation,
    opacity,
  } = toolCall.parameters;

  console.log("[AI Tool Executor] Creating text", {
    text,
    x,
    y,
    fontSize,
  });

  try {
    // Prepare options with all AI-specific properties
    const options: CreateTextOptions = {
      x: x as number,
      y: y as number,
      text: text as string,
      fontSize: fontSize as number | undefined,
      fontFamily: fontFamily as string | undefined,
      fontWeight: fontWeight as string | undefined,
      fontStyle: fontStyle as string | undefined,
      textAlign: textAlign as string | undefined,
      color: color as string | undefined,
      rotation: rotation as number | undefined,
      opacity: opacity as number | undefined,
      createdBy: "ai-agent",
      lastEditedBy: "ai-agent",
      lastEditedByName: "AI Agent",
      aiRequestedBy: userId,
      aiOperationId: aiOperationId,
    };

    // Create text with all properties at once
    const objectId = await context.createText(options);

    if (!objectId) {
      return {
        success: false,
        message: "Failed to create text",
        error: "CREATION_FAILED",
      };
    }

    console.log("[AI Tool Executor] Text creation complete", {
      objectId,
      text,
    });

    return {
      success: true,
      message: `Created text "${text}" at (${x}, ${y})`,
      objectsCreated: [objectId],
    };
  } catch (error) {
    console.error("[AI Tool Executor] Text creation failed", { error });
    throw error;
  }
}

async function executeMoveShape(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeId, x, y } = toolCall.parameters;

  const object = context.objects.find((obj) => obj.id === shapeId);
  if (!object) {
    return {
      success: false,
      message: `Shape not found: ${shapeId}`,
      error: "SHAPE_NOT_FOUND",
    };
  }

  await context.updateObject(shapeId as string, {
    x: x as number,
    y: y as number,
    lastEditedBy: "ai-agent",
    lastEditedByName: "AI Agent",
    lastEditedAt: Date.now(),
  });

  return {
    success: true,
    message: `Moved shape to (${x}, ${y})`,
    objectsModified: [shapeId as string],
  };
}

async function executeResizeShape(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeId, width, height } = toolCall.parameters;

  const object = context.objects.find((obj) => obj.id === shapeId);
  if (!object) {
    return {
      success: false,
      message: `Shape not found: ${shapeId}`,
      error: "SHAPE_NOT_FOUND",
    };
  }

  await context.updateObject(shapeId as string, {
    width: width as number,
    height: height as number,
    lastEditedBy: "ai-agent",
    lastEditedByName: "AI Agent",
    lastEditedAt: Date.now(),
  });

  return {
    success: true,
    message: `Resized shape to ${width}x${height}`,
    objectsModified: [shapeId as string],
  };
}

async function executeRotateShape(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeId, degrees } = toolCall.parameters;

  const object = context.objects.find((obj) => obj.id === shapeId);
  if (!object) {
    return {
      success: false,
      message: `Shape not found: ${shapeId}`,
      error: "SHAPE_NOT_FOUND",
    };
  }

  // Normalize degrees to 0-360
  let normalizedDegrees = (degrees as number) % 360;
  if (normalizedDegrees < 0) {
    normalizedDegrees += 360;
  }

  await context.updateObject(shapeId as string, {
    rotation: normalizedDegrees,
    lastEditedBy: "ai-agent",
    lastEditedByName: "AI Agent",
    lastEditedAt: Date.now(),
  });

  return {
    success: true,
    message: `Rotated shape to ${normalizedDegrees}°`,
    objectsModified: [shapeId as string],
  };
}

async function executeDeleteShape(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeId } = toolCall.parameters;

  const object = context.objects.find((obj) => obj.id === shapeId);
  if (!object) {
    return {
      success: false,
      message: `Shape not found: ${shapeId}`,
      error: "SHAPE_NOT_FOUND",
    };
  }

  await context.deleteObject(shapeId as string);

  return {
    success: true,
    message: `Deleted shape`,
    objectsModified: [shapeId as string],
  };
}

async function executeUpdateShapeStyle(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeId, color, stroke, strokeWidth, opacity } = toolCall.parameters;

  const object = context.objects.find((obj) => obj.id === shapeId);
  if (!object) {
    return {
      success: false,
      message: `Shape not found: ${shapeId}`,
      error: "SHAPE_NOT_FOUND",
    };
  }

  const updates: Partial<CanvasObject> = {
    lastEditedBy: "ai-agent",
    lastEditedByName: "AI Agent",
    lastEditedAt: Date.now(),
  };

  if (color !== undefined) updates.color = color as string;
  if (stroke !== undefined) updates.stroke = stroke as string;
  if (strokeWidth !== undefined) updates.strokeWidth = strokeWidth as number;
  if (opacity !== undefined) updates.opacity = opacity as number;

  await context.updateObject(shapeId as string, updates);

  return {
    success: true,
    message: `Updated shape style`,
    objectsModified: [shapeId as string],
  };
}

async function executeUpdateTextStyle(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeId, fontSize, fontWeight, fontFamily, textAlign } =
    toolCall.parameters;

  const object = context.objects.find((obj) => obj.id === shapeId);
  if (!object || object.type !== "text") {
    return {
      success: false,
      message: `Text object not found: ${shapeId}`,
      error: "TEXT_NOT_FOUND",
    };
  }

  const updates: Partial<CanvasObject> = {
    lastEditedBy: "ai-agent",
    lastEditedByName: "AI Agent",
    lastEditedAt: Date.now(),
  };

  if (fontSize !== undefined) (updates as any).fontSize = fontSize as number;
  if (fontWeight !== undefined)
    (updates as any).fontWeight = fontWeight as string;
  if (fontFamily !== undefined)
    (updates as any).fontFamily = fontFamily as string;
  if (textAlign !== undefined)
    (updates as any).textAlign = textAlign as "left" | "center" | "right";

  await context.updateObject(shapeId as string, updates);

  return {
    success: true,
    message: `Updated text style`,
    objectsModified: [shapeId as string],
  };
}

async function executeArrangeHorizontal(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeIds, spacing = 20 } = toolCall.parameters;

  const ids = shapeIds as string[];
  if (!Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      message: "No shapes to arrange",
      error: "NO_SHAPES",
    };
  }

  // Get objects
  const objects = ids
    .map((id) => context.objects.find((obj) => obj.id === id))
    .filter(Boolean);

  if (objects.length === 0) {
    return {
      success: false,
      message: "No valid shapes found",
      error: "NO_VALID_SHAPES",
    };
  }

  // Sort by x position
  objects.sort((a, b) => (a as CanvasObject).x - (b as CanvasObject).x);

  // Arrange horizontally
  let currentX = (objects[0] as CanvasObject).x;

  for (const obj of objects as CanvasObject[]) {
    await context.updateObject(obj.id, {
      x: currentX,
      lastEditedBy: "ai-agent",
      lastEditedByName: "AI Agent",
      lastEditedAt: Date.now(),
    });
    currentX += obj.width + (spacing as number);
  }

  return {
    success: true,
    message: `Arranged ${objects.length} shapes horizontally`,
    objectsModified: ids,
  };
}

async function executeArrangeVertical(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeIds, spacing = 20 } = toolCall.parameters;

  const ids = shapeIds as string[];
  if (!Array.isArray(ids) || ids.length === 0) {
    return {
      success: false,
      message: "No shapes to arrange",
      error: "NO_SHAPES",
    };
  }

  // Get objects
  const objects = ids
    .map((id) => context.objects.find((obj) => obj.id === id))
    .filter(Boolean);

  if (objects.length === 0) {
    return {
      success: false,
      message: "No valid shapes found",
      error: "NO_VALID_SHAPES",
    };
  }

  // Sort by y position
  objects.sort((a, b) => (a as CanvasObject).y - (b as CanvasObject).y);

  // Arrange vertically
  let currentY = (objects[0] as CanvasObject).y;

  for (const obj of objects as CanvasObject[]) {
    await context.updateObject(obj.id, {
      y: currentY,
      lastEditedBy: "ai-agent",
      lastEditedByName: "AI Agent",
      lastEditedAt: Date.now(),
    });
    currentY += obj.height + (spacing as number);
  }

  return {
    success: true,
    message: `Arranged ${objects.length} shapes vertically`,
    objectsModified: ids,
  };
}

async function executeCreateGrid(
  toolCall: ToolCall,
  context: CanvasContextForTools,
  userId: string,
  aiOperationId: string
): Promise<ToolExecutionResult> {
  const { rows, cols, cellWidth, cellHeight, spacing, color, startX, startY } =
    toolCall.parameters;

  const rowCount = rows as number;
  const colCount = cols as number;
  const gridColor = (color as string) || "#3B82F6";
  const baseX = (startX as number) || 5000;
  const baseY = (startY as number) || 5000;
  const created: string[] = [];

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const x = baseX + col * ((cellWidth as number) + (spacing as number));
      const y = baseY + row * ((cellHeight as number) + (spacing as number));

      // Create rectangle
      const createTool: ToolCall = {
        tool: "createShape",
        parameters: {
          type: "rectangle",
          x,
          y,
          width: cellWidth,
          height: cellHeight,
          color: gridColor,
        },
      };

      const result = await executeCreateShape(
        createTool,
        context,
        userId,
        aiOperationId
      );
      if (result.success && result.objectsCreated) {
        created.push(...result.objectsCreated);
      }

      // Small delay between creations
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return {
    success: true,
    message: `Created ${rowCount}x${colCount} grid (${created.length} shapes)`,
    objectsCreated: created,
  };
}

async function executeAlignShapes(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeIds, alignment } = toolCall.parameters;

  const ids = shapeIds as string[];
  if (!Array.isArray(ids) || ids.length < 2) {
    return {
      success: false,
      message: "Need at least 2 shapes to align",
      error: "INSUFFICIENT_SHAPES",
    };
  }

  // Temporarily set selection
  const previousSelection = [...context.selectedIds];
  context.clearSelection();
  ids.forEach((id) => context.toggleSelection(id));

  // Call appropriate alignment function
  try {
    switch (alignment) {
      case "left":
        await context.alignSelectedLeft();
        break;
      case "right":
        await context.alignSelectedRight();
        break;
      case "top":
        await context.alignSelectedTop();
        break;
      case "bottom":
        await context.alignSelectedBottom();
        break;
      case "center":
        await context.alignSelectedHorizontalCenter();
        break;
      case "middle":
        await context.alignSelectedVerticalMiddle();
        break;
      default:
        return {
          success: false,
          message: `Unknown alignment: ${alignment}`,
          error: "UNKNOWN_ALIGNMENT",
        };
    }
  } finally {
    // Restore previous selection
    context.clearSelection();
    previousSelection.forEach((id) => context.toggleSelection(id));
  }

  return {
    success: true,
    message: `Aligned ${ids.length} shapes to ${alignment}`,
    objectsModified: ids,
  };
}

async function executeDistributeShapes(
  toolCall: ToolCall,
  context: CanvasContextForTools
): Promise<ToolExecutionResult> {
  const { shapeIds, direction } = toolCall.parameters;

  const ids = shapeIds as string[];
  if (!Array.isArray(ids) || ids.length < 3) {
    return {
      success: false,
      message: "Need at least 3 shapes to distribute",
      error: "INSUFFICIENT_SHAPES",
    };
  }

  // Temporarily set selection
  const previousSelection = [...context.selectedIds];
  context.clearSelection();
  ids.forEach((id) => context.toggleSelection(id));

  // Call appropriate distribution function
  try {
    if (direction === "horizontal") {
      await context.distributeSelectedHorizontal();
    } else if (direction === "vertical") {
      await context.distributeSelectedVertical();
    } else {
      return {
        success: false,
        message: `Unknown direction: ${direction}`,
        error: "UNKNOWN_DIRECTION",
      };
    }
  } finally {
    // Restore previous selection
    context.clearSelection();
    previousSelection.forEach((id) => context.toggleSelection(id));
  }

  return {
    success: true,
    message: `Distributed ${ids.length} shapes ${direction}ly`,
    objectsModified: ids,
  };
}

function executeGetCanvasState(
  context: CanvasContextForTools
): ToolExecutionResult {
  const summary = {
    objectCount: context.objects.length,
    selectedCount: context.selectedIds.length,
    objects: context.objects.map((obj) => ({
      id: obj.id,
      type: obj.type,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      color: obj.color,
    })),
    selectedIds: context.selectedIds,
  };

  return {
    success: true,
    message: `Canvas has ${summary.objectCount} objects`,
    data: summary, // Add structured data for AI to use
  };
}

function executeFindShapesByColor(
  toolCall: ToolCall,
  context: CanvasContextForTools
): ToolExecutionResult {
  const { color } = toolCall.parameters;
  const normalizedColor = (color as string).toLowerCase();

  // Match both exact color and partial matches (e.g., "red" matches "#FF0000")
  const matchingObjects = context.objects.filter((obj) => {
    const objColor = obj.color?.toLowerCase() || "";
    return objColor === normalizedColor || objColor.includes(normalizedColor);
  });

  const shapeIds = matchingObjects.map((obj) => obj.id);
  const details = matchingObjects.map((obj) => ({
    id: obj.id,
    type: obj.type,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    color: obj.color,
  }));

  return {
    success: true,
    message: `Found ${shapeIds.length} shape(s) with color ${color}`,
    data: {
      shapeIds, // For easy iteration in AI
      shapes: details, // Full details for context
      count: shapeIds.length,
    },
  };
}

function executeFindShapesByType(
  toolCall: ToolCall,
  context: CanvasContextForTools
): ToolExecutionResult {
  const { type } = toolCall.parameters;

  const matchingObjects = context.objects.filter((obj) => obj.type === type);

  const shapeIds = matchingObjects.map((obj) => obj.id);
  const details = matchingObjects.map((obj) => ({
    id: obj.id,
    type: obj.type,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    color: obj.color,
  }));

  return {
    success: true,
    message: `Found ${shapeIds.length} ${type}(s)`,
    data: {
      shapeIds, // For easy iteration in AI
      shapes: details, // Full details for context
      count: shapeIds.length,
    },
  };
}
