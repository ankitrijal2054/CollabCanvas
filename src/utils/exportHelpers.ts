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
 * Export options
 */
export interface ExportOptions {
  format: "png" | "svg";
  scope: "all" | "selection";
  selectedObjects?: CanvasObject[];
  pixelRatio?: number; // For PNG export (default: 2)
}

/**
 * Calculate bounding box for a set of objects
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
    // Calculate object bounds
    const objMinX = obj.x;
    const objMinY = obj.y;
    const objMaxX = obj.x + obj.width;
    const objMaxY = obj.y + obj.height;

    minX = Math.min(minX, objMinX);
    minY = Math.min(minY, objMinY);
    maxX = Math.max(maxX, objMaxX);
    maxY = Math.max(maxY, objMaxY);
  });

  // Add padding (20px on each side)
  const padding = 20;
  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
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
    let exportConfig: any = {
      pixelRatio,
      mimeType: "image/png",
    };

    // If exporting selection only, crop to bounding box
    if (options.scope === "selection" && options.selectedObjects) {
      const bbox = calculateBoundingBox(options.selectedObjects);
      exportConfig = {
        ...exportConfig,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      };
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
