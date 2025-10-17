import { useRef, useEffect, useMemo } from "react";
import type Konva from "konva";
import type { CanvasObject } from "../../types/canvas.types";

interface SelectionBoxProps {
  selectedObjects: CanvasObject[];
}

/**
 * SelectionBox Component
 * Renders a unified bounding box around multiple selected objects
 * with transform handles for group operations
 */
export const SelectionBox = ({ selectedObjects }: SelectionBoxProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  /**
   * Calculate the bounding box that encompasses all selected objects
   * Returns the top-left position and dimensions of the unified box
   */
  const boundingBox = useMemo(() => {
    if (selectedObjects.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    // Find the min/max coordinates across all objects
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedObjects.forEach((obj) => {
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
  }, [selectedObjects]);

  // Attach transformer to the selection box when objects are selected
  useEffect(() => {
    if (
      selectedObjects.length > 1 &&
      transformerRef.current &&
      groupRef.current
    ) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedObjects.length, boundingBox]);

  // Don't render unified selection box - just show individual object selections
  // The unified box creates visual clutter when multiple objects are selected
  // Individual selection boxes are cleaner and sufficient for now
  // TODO: Task 17.10 - Re-enable for group transformation operations
  return null;
};
