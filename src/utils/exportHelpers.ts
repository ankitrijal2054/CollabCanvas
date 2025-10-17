// Export helpers for canvas export functionality
import type Konva from "konva";
import type { CanvasObject } from "../types/canvas.types";

/**
 * Bounding box interface
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate axis-aligned bounding box for a rotated object
 * @param obj - Canvas object with rotation
 * @returns Min/max coordinates of rotated bounding box
 */
function calculateRotatedBounds(obj: CanvasObject): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const rotation = (obj.rotation || 0) * (Math.PI / 180); // Convert to radians

  // Get center point based on object type
  let centerX: number;
  let centerY: number;
  let halfWidth: number;
  let halfHeight: number;

  if (obj.type === "circle") {
    const radius = (obj as { radius?: number }).radius || obj.width / 2;
    centerX = obj.x + radius;
    centerY = obj.y + radius;
    halfWidth = radius;
    halfHeight = radius;
  } else if (obj.type === "star") {
    centerX = obj.x + obj.width / 2;
    centerY = obj.y + obj.height / 2;
    halfWidth = obj.width / 2;
    halfHeight = obj.height / 2;
  } else {
    // Rectangle, text, line
    centerX = obj.x + obj.width / 2;
    centerY = obj.y + obj.height / 2;
    halfWidth = obj.width / 2;
    halfHeight = obj.height / 2;
  }

  // Calculate the four corners of the bounding box before rotation
  const corners = [
    { x: -halfWidth, y: -halfHeight }, // Top-left
    { x: halfWidth, y: -halfHeight }, // Top-right
    { x: halfWidth, y: halfHeight }, // Bottom-right
    { x: -halfWidth, y: halfHeight }, // Bottom-left
  ];

  // Rotate each corner and find min/max
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  corners.forEach((corner) => {
    // Apply rotation matrix
    const rotatedX =
      corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation);
    const rotatedY =
      corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation);

    // Transform back to world coordinates
    const worldX = centerX + rotatedX;
    const worldY = centerY + rotatedY;

    minX = Math.min(minX, worldX);
    minY = Math.min(minY, worldY);
    maxX = Math.max(maxX, worldX);
    maxY = Math.max(maxY, worldY);
  });

  return { minX, minY, maxX, maxY };
}

/**
 * Export options
 */
export interface ExportOptions {
  format: "png" | "svg";
  scope: "all" | "selection";
  selectedObjects?: CanvasObject[];
  pixelRatio?: number; // For PNG export (default: 2)
  viewport?: { x: number; y: number; scale: number }; // Viewport transformation for accurate cropping
}

/**
 * Calculate bounding box for a set of objects (accounting for rotation)
 * @param objects - Array of canvas objects
 * @returns Bounding box containing all objects
 */
export function calculateBoundingBox(objects: CanvasObject[]): BoundingBox {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 }; // Default size
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  objects.forEach((obj) => {
    const rotation = obj.rotation || 0;

    // If object is rotated, calculate rotated bounding box
    if (rotation !== 0) {
      const bounds = calculateRotatedBounds(obj);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    } else {
      // Non-rotated object - use simple bounds
      let objMinX = obj.x;
      let objMinY = obj.y;
      let objMaxX = obj.x + (obj.width || 0);
      let objMaxY = obj.y + (obj.height || 0);

      // Handle special cases for different shape types
      if (obj.type === "circle") {
        const circleObj = obj as {
          radius?: number;
          width: number;
          height: number;
        };
        const radius = circleObj.radius || obj.width / 2;
        objMinX = obj.x;
        objMinY = obj.y;
        objMaxX = obj.x + radius * 2;
        objMaxY = obj.y + radius * 2;
      } else if (obj.type === "line") {
        const lineObj = obj as { points?: number[] };
        if (lineObj.points && lineObj.points.length >= 4) {
          const x1 = lineObj.points[0];
          const y1 = lineObj.points[1];
          const x2 = lineObj.points[2];
          const y2 = lineObj.points[3];
          objMinX = Math.min(x1, x2);
          objMinY = Math.min(y1, y2);
          objMaxX = Math.max(x1, x2);
          objMaxY = Math.max(y1, y2);
        }
      }

      minX = Math.min(minX, objMinX);
      minY = Math.min(minY, objMinY);
      maxX = Math.max(maxX, objMaxX);
      maxY = Math.max(maxY, objMaxY);
    }
  });

  // Add padding (20px on each side)
  const padding = 20;
  const finalX = Math.floor(minX - padding);
  const finalY = Math.floor(minY - padding);
  const finalWidth = Math.ceil(maxX - minX + padding * 2);
  const finalHeight = Math.ceil(maxY - minY + padding * 2);

  console.log(`📦 Bounding box calculated:`, {
    x: finalX,
    y: finalY,
    width: finalWidth,
    height: finalHeight,
    objectCount: objects.length,
  });

  return {
    x: finalX >= 0 ? finalX : 0,
    y: finalY >= 0 ? finalY : 0,
    width: finalWidth,
    height: finalHeight,
  };
}

/**
 * Export canvas as PNG
 * @param stage - Konva stage reference
 * @param options - Export options
 * @returns Promise that resolves when download is triggered
 */
export async function exportToPNG(
  stage: Konva.Stage | null,
  options: ExportOptions
): Promise<void> {
  if (!stage) {
    throw new Error("Stage reference is required for PNG export");
  }

  try {
    const pixelRatio = options.pixelRatio || 2; // 2x for high DPI
    let exportConfig: {
      pixelRatio: number;
      mimeType: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    } = {
      pixelRatio,
      mimeType: "image/png",
    };

    // If exporting selection only, crop to bounding box
    if (options.scope === "selection" && options.selectedObjects) {
      console.log(
        `🎯 Exporting ${options.selectedObjects.length} selected objects:`,
        options.selectedObjects.map((obj) => ({
          type: obj.type,
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
        }))
      );

      const bbox = calculateBoundingBox(options.selectedObjects);

      // Transform world coordinates to screen coordinates using viewport
      const viewport = options.viewport || { x: 0, y: 0, scale: 1 };
      const screenX = bbox.x * viewport.scale + viewport.x;
      const screenY = bbox.y * viewport.scale + viewport.y;
      const screenWidth = bbox.width * viewport.scale;
      const screenHeight = bbox.height * viewport.scale;

      exportConfig = {
        ...exportConfig,
        x: screenX,
        y: screenY,
        width: screenWidth,
        height: screenHeight,
      };

      console.log(`📸 Export config (world coords):`, bbox);
      console.log(`📸 Export config (screen coords):`, {
        x: screenX,
        y: screenY,
        width: screenWidth,
        height: screenHeight,
      });
      console.log(`📸 Viewport:`, viewport);
    } else {
      console.log(`📸 Exporting entire canvas`);
    }

    // Generate data URL
    const dataURL = stage.toDataURL(exportConfig);

    // Trigger download
    const timestamp = Date.now();
    const filename = `collabcanvas-${timestamp}.png`;
    downloadFile(dataURL, filename);

    console.log(`✅ PNG exported successfully: ${filename}`);
  } catch (error) {
    console.error("❌ Failed to export PNG:", error);
    throw error;
  }
}

/**
 * Trigger file download
 * @param dataURL - Data URL or blob URL
 * @param filename - Filename for download
 */
export function downloadFile(dataURL: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up blob URLs
  if (dataURL.startsWith("blob:")) {
    setTimeout(() => URL.revokeObjectURL(dataURL), 100);
  }
}

/**
 * Generate filename with timestamp
 * @param format - Export format (png or svg)
 * @returns Filename with timestamp
 */
export function generateFilename(format: "png" | "svg"): string {
  const timestamp = Date.now();
  return `collabcanvas-${timestamp}.${format}`;
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validate export options
 * @param options - Export options to validate
 * @returns Validation result with error message if invalid
 */
export function validateExportOptions(options: ExportOptions): {
  valid: boolean;
  error?: string;
} {
  if (options.scope === "selection") {
    if (!options.selectedObjects || options.selectedObjects.length === 0) {
      return {
        valid: false,
        error: "No objects selected for export",
      };
    }
  }

  return { valid: true };
}

/**
 * Export helpers namespace
 */
export const exportHelpers = {
  calculateBoundingBox,
  exportToPNG,
  downloadFile,
  generateFilename,
  formatFileSize,
  validateExportOptions,
};
