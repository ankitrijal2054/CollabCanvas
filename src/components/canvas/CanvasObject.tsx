import { useRef, useEffect } from "react";
import { Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { CanvasObject as CanvasObjectType } from "../../types/canvas.types";
import { useCanvas } from "../../contexts/CanvasContext";

interface CanvasObjectProps {
  object: CanvasObjectType;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * CanvasObject Component
 * Renders a single canvas object (rectangle) with selection, drag, and resize capabilities
 */
export default function CanvasObject({
  object,
  isSelected,
  onSelect,
}: CanvasObjectProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const { updateObject, canvasSize } = useCanvas();

  // Attach transformer to shape when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  /**
   * Handle drag end - update object position in state
   */
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    updateObject(object.id, {
      x: node.x(),
      y: node.y(),
      timestamp: Date.now(),
    });
  };

  /**
   * Handle transform end (resize) - update object dimensions in state
   */
  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale to 1 and update width/height instead
    node.scaleX(1);
    node.scaleY(1);

    updateObject(object.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX), // Minimum width of 5px
      height: Math.max(5, node.height() * scaleY), // Minimum height of 5px
      timestamp: Date.now(),
    });
  };

  return (
    <>
      <Rect
        ref={shapeRef}
        id={object.id}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        fill={object.color}
        stroke={isSelected ? "#0066FF" : undefined}
        strokeWidth={isSelected ? 2 : 0}
        shadowColor={isSelected ? "rgba(0, 102, 255, 0.3)" : undefined}
        shadowBlur={isSelected ? 10 : 0}
        shadowOffset={isSelected ? { x: 0, y: 0 } : undefined}
        draggable
        dragBoundFunc={(pos) => {
          // Constrain drag position within canvas bounds
          const newX = Math.max(
            0,
            Math.min(pos.x, canvasSize.width - object.width)
          );
          const newY = Math.max(
            0,
            Math.min(pos.y, canvasSize.height - object.height)
          );
          return { x: newX, y: newY };
        }}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize to minimum 5x5 pixels
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }

            // Constrain resize within canvas bounds
            // Check if new box would go outside canvas
            if (
              newBox.x < 0 ||
              newBox.y < 0 ||
              newBox.x + newBox.width > canvasSize.width ||
              newBox.y + newBox.height > canvasSize.height
            ) {
              return oldBox;
            }

            return newBox;
          }}
          // Styling for transformer
          anchorFill="#0066FF"
          anchorStroke="#0066FF"
          anchorSize={8}
          borderStroke="#0066FF"
          borderStrokeWidth={2}
          enabledAnchors={[
            "top-left",
            "top-center",
            "top-right",
            "middle-right",
            "middle-left",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ]}
        />
      )}
    </>
  );
}
