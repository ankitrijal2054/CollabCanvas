import React, { useRef, useEffect } from "react";
import { Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { CanvasObject as CanvasObjectType } from "../../types/canvas.types";
import { useCanvas } from "../../contexts/CanvasContext";
import { useSyncOperations } from "../../hooks/useRealtimeSync";
import { offlineQueue } from "../../utils/offlineQueue";

interface CanvasObjectProps {
  object: CanvasObjectType;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * CanvasObject Component
 * Renders a single canvas object (rectangle) with selection, drag, and resize capabilities
 * Now with Firebase sync for all operations!
 */
function CanvasObject({ object, isSelected, onSelect }: CanvasObjectProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const { updateObject, canvasSize, isCanvasDisabled } = useCanvas();
  const syncOps = useSyncOperations();

  // Attach transformer to shape when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  /**
   * Handle drag end - update object position in state and Firebase (or queue if offline)
   */
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    // Don't allow updates if canvas is disabled
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot update objects");
      return;
    }

    const node = e.target;
    const updates = {
      x: node.x(),
      y: node.y(),
      timestamp: Date.now(),
    };

    // Update local state immediately (optimistic update)
    updateObject(object.id, updates);

    // Sync to Firebase or queue if offline
    try {
      if (!navigator.onLine) {
        // Queue operation when offline
        await offlineQueue.enqueue({
          id: `op-update-${Date.now()}`,
          type: "update",
          objectId: object.id,
          payload: updates,
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        await syncOps.updateObject(object.id, updates);
      }
    } catch (error) {
      console.error("❌ Failed to sync object position:", error);
    }
  };

  /**
   * Handle transform end (resize) - update object dimensions in state and Firebase (or queue if offline)
   */
  const handleTransformEnd = async () => {
    // Don't allow updates if canvas is disabled
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot update objects");
      return;
    }

    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale to 1 and update width/height instead
    node.scaleX(1);
    node.scaleY(1);

    const updates = {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX), // Minimum width of 5px
      height: Math.max(5, node.height() * scaleY), // Minimum height of 5px
      timestamp: Date.now(),
    };

    // Update local state immediately (optimistic update)
    updateObject(object.id, updates);

    // Sync to Firebase or queue if offline
    try {
      if (!navigator.onLine) {
        // Queue operation when offline
        await offlineQueue.enqueue({
          id: `op-update-${Date.now()}`,
          type: "update",
          objectId: object.id,
          payload: updates,
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        await syncOps.updateObject(object.id, updates);
      }
    } catch (error) {
      console.error("❌ Failed to sync object resize:", error);
    }
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
          rotateEnabled={false}
        />
      )}
    </>
  );
}

export default React.memo(CanvasObject, (prevProps, nextProps) => {
  // Avoid re-render unless this object's props meaningfully change
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.object.id !== nextProps.object.id) return false;
  if (prevProps.onSelect !== nextProps.onSelect) return false;

  const prev = prevProps.object;
  const next = nextProps.object;

  if (prev.x !== next.x) return false;
  if (prev.y !== next.y) return false;
  if (prev.width !== next.width) return false;
  if (prev.height !== next.height) return false;
  if (prev.color !== next.color) return false;

  return true; // props equal -> skip re-render
});
