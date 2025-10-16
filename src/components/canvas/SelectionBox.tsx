import React, { useRef, useEffect, useMemo } from "react";
import { Rect, Transformer, Group } from "react-konva";
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
export const SelectionBox: React.FC<SelectionBoxProps> = ({
  selectedObjects,
}) => {
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

  // Don't render if less than 2 objects selected (single selection uses individual transformers)
  if (selectedObjects.length < 2) {
    return null;
  }

  return (
    <>
      {/* Selection box visual indicator */}
      <Group ref={groupRef}>
        <Rect
          x={boundingBox.x}
          y={boundingBox.y}
          width={boundingBox.width}
          height={boundingBox.height}
          stroke="#0066FF"
          strokeWidth={2}
          dash={[6, 3]} // Dashed line to differentiate from individual selection
          fill="rgba(0, 102, 255, 0.05)" // Very light blue fill
          listening={false} // Don't intercept clicks, let objects handle them
        />
      </Group>

      {/* Transformer for group operations */}
      <Transformer
        ref={transformerRef}
        rotateEnabled={false} // Disable rotation for now (will add in later tasks)
        enabledAnchors={[
          "top-left",
          "top-center",
          "top-right",
          "middle-left",
          "middle-right",
          "bottom-left",
          "bottom-center",
          "bottom-right",
        ]}
        keepRatio={false} // Allow independent width/height adjustment
        borderStroke="#0066FF"
        borderStrokeWidth={2}
        anchorStroke="#0066FF"
        anchorFill="#FFFFFF"
        anchorSize={8}
        anchorCornerRadius={2}
        // TODO: Task 17.10 - Add handlers for group transformations
        // onTransformEnd={handleGroupTransform}
        // onDragEnd={handleGroupDrag}
      />
    </>
  );
};
