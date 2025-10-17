// Alignment and distribution helpers for multi-object operations
import type { CanvasObject } from "../types/canvas.types";

/**
 * Get bounding box for a single object (handles rotation)
 * Returns the axis-aligned bounding box (AABB) that encompasses the rotated object
 */
function getObjectBounds(obj: CanvasObject): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
} {
  // For simplicity, we'll use the object's position and dimensions
  // In a full implementation, rotation would require calculating the rotated bounding box
  const left = obj.x;
  const right = obj.x + obj.width;
  const top = obj.y;
  const bottom = obj.y + obj.height;
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;

  return { left, right, top, bottom, centerX, centerY };
}

/**
 * Get the combined bounding box for multiple objects
 */
function getGroupBounds(objects: CanvasObject[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
} {
  if (objects.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  objects.forEach((obj) => {
    const bounds = getObjectBounds(obj);
    minX = Math.min(minX, bounds.left);
    maxX = Math.max(maxX, bounds.right);
    minY = Math.min(minY, bounds.top);
    maxY = Math.max(maxY, bounds.bottom);
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return { minX, maxX, minY, maxY, centerX, centerY };
}

/**
 * Align objects to the left (leftmost edge)
 * @param objects - Array of objects to align
 * @returns Array of objects with updated x positions
 */
export function alignLeft(objects: CanvasObject[]): CanvasObject[] {
  if (objects.length < 2) return objects;

  const minX = Math.min(...objects.map((obj) => obj.x));

  return objects.map((obj) => ({
    ...obj,
    x: minX,
    timestamp: Date.now(),
  }));
}

/**
 * Align objects to the right (rightmost edge)
 * @param objects - Array of objects to align
 * @returns Array of objects with updated x positions
 */
export function alignRight(objects: CanvasObject[]): CanvasObject[] {
  if (objects.length < 2) return objects;

  const maxX = Math.max(...objects.map((obj) => obj.x + obj.width));

  return objects.map((obj) => ({
    ...obj,
    x: maxX - obj.width,
    timestamp: Date.now(),
  }));
}

/**
 * Align objects to the top (topmost edge)
 * @param objects - Array of objects to align
 * @returns Array of objects with updated y positions
 */
export function alignTop(objects: CanvasObject[]): CanvasObject[] {
  if (objects.length < 2) return objects;

  const minY = Math.min(...objects.map((obj) => obj.y));

  return objects.map((obj) => ({
    ...obj,
    y: minY,
    timestamp: Date.now(),
  }));
}

/**
 * Align objects to the bottom (bottommost edge)
 * @param objects - Array of objects to align
 * @returns Array of objects with updated y positions
 */
export function alignBottom(objects: CanvasObject[]): CanvasObject[] {
  if (objects.length < 2) return objects;

  const maxY = Math.max(...objects.map((obj) => obj.y + obj.height));

  return objects.map((obj) => ({
    ...obj,
    y: maxY - obj.height,
    timestamp: Date.now(),
  }));
}

/**
 * Align objects horizontally centered (vertical centers aligned)
 * @param objects - Array of objects to align
 * @returns Array of objects with updated x positions
 */
export function alignHorizontalCenter(objects: CanvasObject[]): CanvasObject[] {
  if (objects.length < 2) return objects;

  const groupBounds = getGroupBounds(objects);
  const targetCenterX = groupBounds.centerX;

  return objects.map((obj) => ({
    ...obj,
    x: targetCenterX - obj.width / 2,
    timestamp: Date.now(),
  }));
}

/**
 * Align objects vertically centered (horizontal centers aligned)
 * @param objects - Array of objects to align
 * @returns Array of objects with updated y positions
 */
export function alignVerticalMiddle(objects: CanvasObject[]): CanvasObject[] {
  if (objects.length < 2) return objects;

  const groupBounds = getGroupBounds(objects);
  const targetCenterY = groupBounds.centerY;

  return objects.map((obj) => ({
    ...obj,
    y: targetCenterY - obj.height / 2,
    timestamp: Date.now(),
  }));
}

/**
 * Distribute objects evenly horizontally (equal spacing)
 * @param objects - Array of objects to distribute
 * @returns Array of objects with updated x positions
 */
export function distributeHorizontal(objects: CanvasObject[]): CanvasObject[] {
  if (objects.length < 3) return objects; // Need at least 3 objects to distribute

  // Sort objects by x position (left to right)
  const sorted = [...objects].sort((a, b) => a.x - b.x);

  // Calculate total space available
  const leftmost = sorted[0];
  const rightmost = sorted[sorted.length - 1];
  const totalWidth = rightmost.x + rightmost.width - leftmost.x;

  // Calculate total width of all objects
  const objectsWidth = sorted.reduce((sum, obj) => sum + obj.width, 0);

  // Calculate spacing between objects
  const totalGap = totalWidth - objectsWidth;
  const spacing = totalGap / (sorted.length - 1);

  // Position objects with equal spacing
  let currentX = leftmost.x;
  const distributed = sorted.map((obj, index) => {
    if (index === 0) {
      // Keep first object in place
      currentX = obj.x + obj.width;
      return { ...obj, timestamp: Date.now() };
    } else if (index === sorted.length - 1) {
      // Keep last object in place
      return { ...obj, timestamp: Date.now() };
    } else {
      // Distribute middle objects
      const newX = currentX + spacing;
      currentX = newX + obj.width;
      return {
        ...obj,
        x: newX,
        timestamp: Date.now(),
      };
    }
  });

  // Return in original order (not sorted order)
  return objects.map((obj) => {
    const updated = distributed.find((d) => d.id === obj.id);
    return updated || obj;
  });
}

/**
 * Distribute objects evenly vertically (equal spacing)
 * @param objects - Array of objects to distribute
 * @returns Array of objects with updated y positions
 */
export function distributeVertical(objects: CanvasObject[]): CanvasObject[] {
  if (objects.length < 3) return objects; // Need at least 3 objects to distribute

  // Sort objects by y position (top to bottom)
  const sorted = [...objects].sort((a, b) => a.y - b.y);

  // Calculate total space available
  const topmost = sorted[0];
  const bottommost = sorted[sorted.length - 1];
  const totalHeight = bottommost.y + bottommost.height - topmost.y;

  // Calculate total height of all objects
  const objectsHeight = sorted.reduce((sum, obj) => sum + obj.height, 0);

  // Calculate spacing between objects
  const totalGap = totalHeight - objectsHeight;
  const spacing = totalGap / (sorted.length - 1);

  // Position objects with equal spacing
  let currentY = topmost.y;
  const distributed = sorted.map((obj, index) => {
    if (index === 0) {
      // Keep first object in place
      currentY = obj.y + obj.height;
      return { ...obj, timestamp: Date.now() };
    } else if (index === sorted.length - 1) {
      // Keep last object in place
      return { ...obj, timestamp: Date.now() };
    } else {
      // Distribute middle objects
      const newY = currentY + spacing;
      currentY = newY + obj.height;
      return {
        ...obj,
        y: newY,
        timestamp: Date.now(),
      };
    }
  });

  // Return in original order (not sorted order)
  return objects.map((obj) => {
    const updated = distributed.find((d) => d.id === obj.id);
    return updated || obj;
  });
}

/**
 * Alignment helper functions export
 */
export const alignmentHelpers = {
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignHorizontalCenter,
  alignVerticalMiddle,
  distributeHorizontal,
  distributeVertical,
  getObjectBounds,
  getGroupBounds,
};
