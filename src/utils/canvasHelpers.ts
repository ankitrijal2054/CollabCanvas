// Canvas helper functions for coordinate transformations and calculations
import type { Position, Viewport, CanvasBounds } from "../types/canvas.types";
import { CANVAS_CONFIG } from "../constants/canvas";

export const canvasHelpers = {
  /**
   * Convert screen coordinates to canvas coordinates
   * Takes into account zoom and pan transformations
   */
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

  /**
   * Convert canvas coordinates to screen coordinates
   * Takes into account zoom and pan transformations
   */
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

  /**
   * Calculate new zoom level with constraints
   * @param currentZoom - Current zoom level
   * @param delta - Change in zoom (negative to zoom out, positive to zoom in)
   * @param min - Minimum zoom level
   * @param max - Maximum zoom level
   */
  calculateZoom: (
    currentZoom: number,
    delta: number,
    min = CANVAS_CONFIG.MIN_ZOOM,
    max = CANVAS_CONFIG.MAX_ZOOM
  ): number => {
    const newZoom = currentZoom * (1 + delta);
    return Math.min(Math.max(newZoom, min), max);
  },

  /**
   * Get pointer position relative to the stage
   * Handles both mouse and touch events
   */
  getPointerPosition: (stage: any): Position | null => {
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return null;

    return {
      x: pointerPosition.x,
      y: pointerPosition.y,
    };
  },

  /**
   * Calculate new position when zooming to keep the point under cursor stationary
   * @param pointerPos - Cursor/pointer position in screen coordinates
   * @param oldScale - Current scale before zoom
   * @param newScale - New scale after zoom
   * @param oldPos - Current stage position
   */
  getZoomPointPosition: (
    pointerPos: Position,
    oldScale: number,
    newScale: number,
    oldPos: Position
  ): Position => {
    const mousePointTo = {
      x: (pointerPos.x - oldPos.x) / oldScale,
      y: (pointerPos.y - oldPos.y) / oldScale,
    };

    return {
      x: pointerPos.x - mousePointTo.x * newScale,
      y: pointerPos.y - mousePointTo.y * newScale,
    };
  },

  /**
   * Check if position is within canvas bounds
   */
  isWithinBounds: (pos: Position, bounds: CanvasBounds): boolean => {
    return (
      pos.x >= bounds.minX &&
      pos.x <= bounds.maxX &&
      pos.y >= bounds.minY &&
      pos.y <= bounds.maxY
    );
  },

  /**
   * Constrain position to stay within bounds
   * Allows panning to see all parts of canvas when zoomed in
   */
  constrainToBounds: (
    pos: Position,
    bounds: CanvasBounds,
    scale: number,
    stageSize: { width: number; height: number }
  ): Position => {
    // Calculate the visible area size in canvas coordinates
    const visibleWidth = stageSize.width / scale;
    const visibleHeight = stageSize.height / scale;

    // Canvas dimensions
    const canvasWidth = bounds.maxX - bounds.minX;
    const canvasHeight = bounds.maxY - bounds.minY;

    // Calculate the boundaries for the position
    // The position represents the top-left corner of the visible area
    let minX, maxX, minY, maxY;

    if (canvasWidth > visibleWidth) {
      // Canvas is wider than viewport - allow panning to see all of it
      minX = bounds.minX;
      maxX = bounds.maxX - visibleWidth;
    } else {
      // Canvas fits within viewport - center it
      minX = maxX = bounds.minX - (visibleWidth - canvasWidth) / 2;
    }

    if (canvasHeight > visibleHeight) {
      // Canvas is taller than viewport - allow panning to see all of it
      minY = bounds.minY;
      maxY = bounds.maxY - visibleHeight;
    } else {
      // Canvas fits within viewport - center it
      minY = maxY = bounds.minY - (visibleHeight - canvasHeight) / 2;
    }

    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    };
  },

  /**
   * Calculate canvas bounds based on canvas size
   */
  getCanvasBounds: (
    canvasWidth: number,
    canvasHeight: number
  ): CanvasBounds => {
    return {
      minX: 0,
      maxX: canvasWidth,
      minY: 0,
      maxY: canvasHeight,
    };
  },

  /**
   * Clamp a number between min and max
   */
  clamp: (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Calculate the default viewport that centers the canvas
   */
  getDefaultViewport: (
    canvasWidth: number,
    canvasHeight: number,
    stageWidth: number,
    stageHeight: number
  ): Viewport => {
    // Center the canvas in the viewport
    const x = (stageWidth - canvasWidth) / 2;
    const y = (stageHeight - canvasHeight) / 2;

    return {
      x,
      y,
      scale: CANVAS_CONFIG.DEFAULT_ZOOM,
    };
  },
};
