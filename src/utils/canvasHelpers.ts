// Canvas helper functions - to be implemented in PR #3
import { Position } from "../types/canvas.types";

export const canvasHelpers = {
  // Convert screen coordinates to canvas coordinates
  screenToCanvas: (
    screenX: number,
    screenY: number,
    scale: number,
    offset: Position
  ): Position => {
    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale,
    };
  },

  // Convert canvas coordinates to screen coordinates
  canvasToScreen: (
    canvasX: number,
    canvasY: number,
    scale: number,
    offset: Position
  ): Position => {
    return {
      x: canvasX * scale + offset.x,
      y: canvasY * scale + offset.y,
    };
  },

  // Calculate zoom level
  calculateZoom: (
    currentZoom: number,
    delta: number,
    min = 0.1,
    max = 5
  ): number => {
    const newZoom = currentZoom * (1 + delta);
    return Math.min(Math.max(newZoom, min), max);
  },
};
