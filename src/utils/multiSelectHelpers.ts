import type { CanvasObject } from "../types/canvas.types";

/**
 * Multi-Select Helper Utilities
 * Functions for handling group operations on multiple selected objects
 */

/**
 * Calculate the offset between two positions
 * Used to maintain relative positions during group move
 */
export function calculateOffset(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { dx: number; dy: number } {
  return {
    dx: to.x - from.x,
    dy: to.y - from.y,
  };
}

/**
 * Apply an offset to a position
 */
export function applyOffset(
  position: { x: number; y: number },
  offset: { dx: number; dy: number }
): { x: number; y: number } {
  return {
    x: position.x + offset.dx,
    y: position.y + offset.dy,
  };
}

/**
 * Get the bounding box that encompasses all selected objects
 * Useful for calculating group center or bounds
 */
export function getBoundingBox(objects: CanvasObject[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  objects.forEach((obj) => {
    const objMinX = obj.x;
    const objMinY = obj.y;
    const objMaxX = obj.x + (obj.width || 0);
    const objMaxY = obj.y + (obj.height || 0);

    minX = Math.min(minX, objMinX);
    minY = Math.min(minY, objMinY);
    maxX = Math.max(maxX, objMaxX);
    maxY = Math.max(maxY, objMaxY);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate new positions for all objects in a group when one object moves
 * Maintains relative positions between objects
 *
 * @param movedObjectId - ID of the object being dragged
 * @param oldPosition - Old position of the dragged object
 * @param newPosition - New position of the dragged object
 * @param allSelectedObjects - All currently selected objects
 * @returns Map of object IDs to their new positions
 */
export function calculateGroupMovePositions(
  movedObjectId: string,
  oldPosition: { x: number; y: number },
  newPosition: { x: number; y: number },
  allSelectedObjects: CanvasObject[]
): Map<string, { x: number; y: number }> {
  const offset = calculateOffset(oldPosition, newPosition);
  const newPositions = new Map<string, { x: number; y: number }>();

  // Apply the same offset to all selected objects
  allSelectedObjects.forEach((obj) => {
    if (obj.id === movedObjectId) {
      // The moved object gets the exact new position
      newPositions.set(obj.id, newPosition);
    } else {
      // Other objects move by the same offset
      newPositions.set(obj.id, applyOffset({ x: obj.x, y: obj.y }, offset));
    }
  });

  return newPositions;
}
