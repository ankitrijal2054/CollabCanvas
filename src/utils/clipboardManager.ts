// Clipboard Manager - In-memory clipboard for canvas objects
// Not using browser clipboard for security and compatibility reasons

import type { CanvasObject } from "../types/canvas.types";

/**
 * Clipboard data structure
 * Stores copied/cut objects with metadata
 */
export interface ClipboardData {
  objects: CanvasObject[]; // Array of copied objects
  copiedAt: number; // Timestamp when copied
  isCut: boolean; // True if cut operation (for future paste-once behavior)
}

/**
 * ClipboardManager - Manages copy/paste/cut operations
 * Uses in-memory storage (React state) rather than browser clipboard
 */
class ClipboardManager {
  private clipboard: ClipboardData | null = null;

  /**
   * Copy objects to clipboard
   * @param objects - Array of objects to copy
   */
  copy(objects: CanvasObject[]): void {
    if (objects.length === 0) {
      console.warn("⚠️ No objects to copy");
      return;
    }

    this.clipboard = {
      objects: this.deepCloneObjects(objects),
      copiedAt: Date.now(),
      isCut: false,
    };

    // Removed success log
  }

  /**
   * Cut objects to clipboard
   * Similar to copy but marks as cut for potential future paste-once behavior
   * @param objects - Array of objects to cut
   */
  cut(objects: CanvasObject[]): void {
    if (objects.length === 0) {
      console.warn("⚠️ No objects to cut");
      return;
    }

    this.clipboard = {
      objects: this.deepCloneObjects(objects),
      copiedAt: Date.now(),
      isCut: true,
    };

    // Removed success log
  }

  /**
   * Get clipboard contents for paste operation
   * Returns cloned objects with new IDs
   * @param offsetX - X offset for pasted objects (default: 10px)
   * @param offsetY - Y offset for pasted objects (default: 10px)
   * @param generateId - Function to generate new unique IDs
   * @returns Array of objects ready to paste (with new IDs and offset positions)
   */
  paste(
    offsetX: number = 10,
    offsetY: number = 10,
    generateId: (type: string) => string
  ): CanvasObject[] | null {
    if (!this.clipboard || this.clipboard.objects.length === 0) {
      console.warn("⚠️ Clipboard is empty");
      return null;
    }

    // Clone objects and apply offset + new IDs
    const pastedObjects = this.clipboard.objects.map((obj) => ({
      ...this.deepCloneObject(obj),
      id: generateId(obj.type), // Generate new unique ID
      x: obj.x + offsetX, // Offset position
      y: obj.y + offsetY,
      timestamp: Date.now(), // Update timestamp
      createdBy: obj.createdBy, // Preserve original creator (will be updated by caller)
    }));

    // Removed success log
    return pastedObjects;
  }

  /**
   * Check if clipboard has contents
   */
  hasContent(): boolean {
    return this.clipboard !== null && this.clipboard.objects.length > 0;
  }

  /**
   * Get clipboard data (read-only)
   */
  getClipboard(): ClipboardData | null {
    return this.clipboard;
  }

  /**
   * Clear clipboard
   */
  clear(): void {
    this.clipboard = null;
    // Removed success log
  }

  /**
   * Deep clone an array of objects
   * Ensures no references to original objects
   */
  private deepCloneObjects(objects: CanvasObject[]): CanvasObject[] {
    return objects.map((obj) => this.deepCloneObject(obj));
  }

  /**
   * Deep clone a single object
   * Uses JSON parse/stringify for deep copy
   */
  private deepCloneObject(obj: CanvasObject): CanvasObject {
    return JSON.parse(JSON.stringify(obj));
  }
}

// Export singleton instance
export const clipboardManager = new ClipboardManager();
