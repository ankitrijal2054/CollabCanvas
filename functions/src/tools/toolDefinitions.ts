/**
 * Tool Definitions for OpenAI Function Calling
 *
 * Defines all 16 AI tools in OpenAI's function calling format.
 * These definitions tell GPT-4 what functions are available and how to use them.
 */

import type { OpenAI } from "openai";

/**
 * All 16 tools for OpenAI function calling
 */
export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  // ===== CREATION TOOLS =====

  {
    type: "function",
    function: {
      name: "createShape",
      description:
        "Create a new shape on the canvas (rectangle, circle, star, or line)",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["rectangle", "circle", "star", "line"],
            description: "Type of shape to create",
          },
          x: {
            type: "number",
            description: "X position on canvas (0-10000)",
          },
          y: {
            type: "number",
            description: "Y position on canvas (0-10000)",
          },
          width: {
            type: "number",
            description: "Width of the shape in pixels (1-5000)",
          },
          height: {
            type: "number",
            description: "Height of the shape in pixels (1-5000)",
          },
          color: {
            type: "string",
            description:
              "Fill color (hex code like #FF0000 or named color like red)",
          },
          stroke: {
            type: "string",
            description: "Stroke/border color (hex code, optional)",
          },
          strokeWidth: {
            type: "number",
            description: "Stroke/border width in pixels (0-50, optional)",
          },
          rotation: {
            type: "number",
            description: "Rotation angle in degrees (optional, -360 to 360)",
          },
          opacity: {
            type: "number",
            description: "Opacity level (0.0-1.0, optional)",
          },
          numPoints: {
            type: "number",
            description: "Number of star points (3-12, only for star type)",
          },
          innerRadius: {
            type: "number",
            description:
              "Inner radius ratio for stars (0.0-1.0, only for star type)",
          },
          points: {
            type: "array",
            items: { type: "number" },
            description:
              "Line points array [x1, y1, x2, y2] (only for line type)",
          },
          arrowStart: {
            type: "boolean",
            description: "Show arrow at start of line (only for line type)",
          },
          arrowEnd: {
            type: "boolean",
            description: "Show arrow at end of line (only for line type)",
          },
        },
        required: ["type", "x", "y", "width", "height", "color"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "createText",
      description: "Create a text label or content on the canvas",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text content to display (max 1000 characters)",
          },
          x: {
            type: "number",
            description: "X position on canvas (0-10000)",
          },
          y: {
            type: "number",
            description: "Y position on canvas (0-10000)",
          },
          fontSize: {
            type: "number",
            description: "Font size in pixels (8-200, optional, default: 16)",
          },
          fontFamily: {
            type: "string",
            enum: [
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
            ],
            description: "Font family (optional, default: Arial)",
          },
          fontWeight: {
            type: "string",
            enum: ["normal", "bold"],
            description: "Font weight (optional, default: normal)",
          },
          fontStyle: {
            type: "string",
            enum: ["normal", "italic"],
            description: "Font style (optional, default: normal)",
          },
          textAlign: {
            type: "string",
            enum: ["left", "center", "right"],
            description: "Text alignment (optional, default: left)",
          },
          color: {
            type: "string",
            description:
              "Text color (hex code or named color, optional, default: black)",
          },
          rotation: {
            type: "number",
            description: "Rotation angle in degrees (optional, -360 to 360)",
          },
          opacity: {
            type: "number",
            description: "Opacity level (0.0-1.0, optional)",
          },
        },
        required: ["text", "x", "y"],
      },
    },
  },

  // ===== MANIPULATION TOOLS =====

  {
    type: "function",
    function: {
      name: "moveShape",
      description: "Move a shape to a new position on the canvas",
      parameters: {
        type: "object",
        properties: {
          shapeId: {
            type: "string",
            description: "ID of the shape to move",
          },
          x: {
            type: "number",
            description: "New X position (0-10000)",
          },
          y: {
            type: "number",
            description: "New Y position (0-10000)",
          },
        },
        required: ["shapeId", "x", "y"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "resizeShape",
      description: "Resize a shape to new dimensions",
      parameters: {
        type: "object",
        properties: {
          shapeId: {
            type: "string",
            description: "ID of the shape to resize",
          },
          width: {
            type: "number",
            description: "New width in pixels (1-5000)",
          },
          height: {
            type: "number",
            description: "New height in pixels (1-5000)",
          },
        },
        required: ["shapeId", "width", "height"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "rotateShape",
      description: "Rotate a shape by a specified angle",
      parameters: {
        type: "object",
        properties: {
          shapeId: {
            type: "string",
            description: "ID of the shape to rotate",
          },
          degrees: {
            type: "number",
            description: "Rotation angle in degrees (-360 to 360)",
          },
        },
        required: ["shapeId", "degrees"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "deleteShape",
      description: "Delete a shape from the canvas",
      parameters: {
        type: "object",
        properties: {
          shapeId: {
            type: "string",
            description: "ID of the shape to delete",
          },
        },
        required: ["shapeId"],
      },
    },
  },

  // ===== STYLING TOOLS =====

  {
    type: "function",
    function: {
      name: "updateShapeStyle",
      description: "Update visual styling of a shape (color, stroke, opacity)",
      parameters: {
        type: "object",
        properties: {
          shapeId: {
            type: "string",
            description: "ID of the shape to style",
          },
          color: {
            type: "string",
            description: "New fill color (hex code or named color, optional)",
          },
          stroke: {
            type: "string",
            description: "New stroke/border color (hex code, optional)",
          },
          strokeWidth: {
            type: "number",
            description: "New stroke/border width (0-50, optional)",
          },
          opacity: {
            type: "number",
            description: "New opacity level (0.0-1.0, optional)",
          },
        },
        required: ["shapeId"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "updateTextStyle",
      description:
        "Update text styling (font size, family, weight, color, etc.)",
      parameters: {
        type: "object",
        properties: {
          shapeId: {
            type: "string",
            description: "ID of the text object to style",
          },
          fontSize: {
            type: "number",
            description: "New font size (8-200, optional)",
          },
          fontFamily: {
            type: "string",
            enum: [
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
            ],
            description: "New font family (optional)",
          },
          fontWeight: {
            type: "string",
            enum: ["normal", "bold"],
            description: "New font weight (optional)",
          },
          fontStyle: {
            type: "string",
            enum: ["normal", "italic"],
            description: "New font style (optional)",
          },
          textAlign: {
            type: "string",
            enum: ["left", "center", "right"],
            description: "New text alignment (optional)",
          },
          color: {
            type: "string",
            description: "New text color (hex code or named color, optional)",
          },
        },
        required: ["shapeId"],
      },
    },
  },

  // ===== LAYOUT TOOLS =====

  {
    type: "function",
    function: {
      name: "arrangeHorizontal",
      description:
        "Arrange multiple shapes horizontally with specified spacing",
      parameters: {
        type: "object",
        properties: {
          shapeIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of shape IDs to arrange (minimum 2)",
          },
          spacing: {
            type: "number",
            description: "Space between shapes in pixels (0-1000)",
          },
        },
        required: ["shapeIds", "spacing"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "arrangeVertical",
      description: "Arrange multiple shapes vertically with specified spacing",
      parameters: {
        type: "object",
        properties: {
          shapeIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of shape IDs to arrange (minimum 2)",
          },
          spacing: {
            type: "number",
            description: "Space between shapes in pixels (0-1000)",
          },
        },
        required: ["shapeIds", "spacing"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "createGrid",
      description:
        "Create a grid of rectangles with specified dimensions and spacing",
      parameters: {
        type: "object",
        properties: {
          rows: {
            type: "number",
            description: "Number of rows (1-20)",
          },
          cols: {
            type: "number",
            description: "Number of columns (1-20)",
          },
          cellWidth: {
            type: "number",
            description: "Width of each cell in pixels (1-1000)",
          },
          cellHeight: {
            type: "number",
            description: "Height of each cell in pixels (1-1000)",
          },
          spacing: {
            type: "number",
            description: "Space between cells in pixels (0-200)",
          },
          startX: {
            type: "number",
            description:
              "Starting X position (optional, default: canvas center)",
          },
          startY: {
            type: "number",
            description:
              "Starting Y position (optional, default: canvas center)",
          },
          color: {
            type: "string",
            description:
              "Cell color (hex code or named color, optional, default: blue)",
          },
        },
        required: ["rows", "cols", "cellWidth", "cellHeight", "spacing"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "alignShapes",
      description: "Align multiple shapes along a specified edge or center",
      parameters: {
        type: "object",
        properties: {
          shapeIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of shape IDs to align (minimum 2)",
          },
          alignment: {
            type: "string",
            enum: ["left", "center", "right", "top", "middle", "bottom"],
            description:
              "Alignment direction (left/center/right for horizontal, top/middle/bottom for vertical)",
          },
        },
        required: ["shapeIds", "alignment"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "distributeShapes",
      description:
        "Distribute shapes evenly across a horizontal or vertical axis",
      parameters: {
        type: "object",
        properties: {
          shapeIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of shape IDs to distribute (minimum 3)",
          },
          direction: {
            type: "string",
            enum: ["horizontal", "vertical"],
            description: "Distribution direction",
          },
        },
        required: ["shapeIds", "direction"],
      },
    },
  },

  // ===== QUERY TOOLS =====

  {
    type: "function",
    function: {
      name: "getCanvasState",
      description:
        "Get the current state of the canvas (all objects, selection, etc.)",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "findShapesByColor",
      description: "Find all shapes with a specific color",
      parameters: {
        type: "object",
        properties: {
          color: {
            type: "string",
            description: "Color to search for (hex code or named color)",
          },
        },
        required: ["color"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "findShapesByType",
      description: "Find all shapes of a specific type",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["rectangle", "circle", "star", "line", "text"],
            description: "Type of shape to find",
          },
        },
        required: ["type"],
      },
    },
  },
];

/**
 * Tool names for validation and mapping
 */
export const toolNames = tools
  .filter((tool) => tool.type === "function")
  .map((tool) => tool.function.name);

/**
 * Check if a tool name is valid
 *
 * @param name - Tool name to check
 * @returns True if the tool exists
 */
export function isValidToolName(name: string): boolean {
  return toolNames.includes(name);
}
