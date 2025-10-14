// CursorLayer component - renders all active user cursors
import React, { memo } from "react";
import Cursor from "./Cursor";
import "./CursorLayer.css";
import type { CursorData } from "../../types/collaboration.types";

export interface CursorLayerProps {
  cursors: CursorData[];
  scale?: number; // Viewport scale for inverse scaling
  offsetX?: number; // Viewport x offset (pan)
  offsetY?: number; // Viewport y offset (pan)
  className?: string;
}

/**
 * CursorLayer Component
 * Container for rendering all active user cursors on the canvas
 * Should be positioned as an overlay above the canvas
 *
 * @param cursors - Array of cursor data for all online users (excluding current user)
 * @param scale - Canvas viewport scale (for inverse scaling cursors)
 * @param offsetX - Viewport x offset (for transforming to screen coords)
 * @param offsetY - Viewport y offset (for transforming to screen coords)
 * @param className - Optional additional CSS class
 */
const CursorLayer: React.FC<CursorLayerProps> = ({
  cursors,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
  className = "",
}) => {
  return (
    <div className={`cursor-layer ${className}`}>
      {cursors.map((cursor) => {
        const screenX = cursor.position.x * scale + offsetX;
        const screenY = cursor.position.y * scale + offsetY;
        return (
          <Cursor
            key={cursor.userId}
            cursor={{ ...cursor, position: { x: screenX, y: screenY } }}
            scale={scale}
          />
        );
      })}
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
// Only re-render when cursors array or scale changes
export default memo(CursorLayer, (prevProps, nextProps) => {
  // Check if scale changed
  if (prevProps.scale !== nextProps.scale) {
    return false; // Re-render
  }

  // Check if offsets changed
  if (
    prevProps.offsetX !== nextProps.offsetX ||
    prevProps.offsetY !== nextProps.offsetY
  ) {
    return false; // Re-render
  }

  // Check if cursors array length changed
  if (prevProps.cursors.length !== nextProps.cursors.length) {
    return false; // Re-render
  }

  // Check if any cursor position or data changed
  for (let i = 0; i < prevProps.cursors.length; i++) {
    const prev = prevProps.cursors[i];
    const next = nextProps.cursors[i];

    if (
      prev.userId !== next.userId ||
      prev.position.x !== next.position.x ||
      prev.position.y !== next.position.y ||
      prev.name !== next.name ||
      prev.color !== next.color
    ) {
      return false; // Re-render
    }
  }

  // No changes, skip re-render
  return true;
});

/**
 * Alternative: Simple CursorLayer without memoization
 * Use this if you experience issues with the memoized version
 */
export const SimpleCursorLayer: React.FC<CursorLayerProps> = ({
  cursors,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
  className = "",
}) => {
  return (
    <div className={`cursor-layer ${className}`}>
      {cursors.map((cursor) => {
        const screenX = cursor.position.x * scale + offsetX;
        const screenY = cursor.position.y * scale + offsetY;
        return (
          <Cursor
            key={cursor.userId}
            cursor={{ ...cursor, position: { x: screenX, y: screenY } }}
            scale={scale}
          />
        );
      })}
    </div>
  );
};

/**
 * Cursor count display (optional utility component)
 * Shows the number of active cursors
 */
export const CursorCount: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;

  return (
    <div className="cursor-count">
      {count} {count === 1 ? "user" : "users"} online
    </div>
  );
};
