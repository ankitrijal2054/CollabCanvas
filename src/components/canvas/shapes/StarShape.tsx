import React, { useRef, useEffect } from "react";
import { Star, Transformer } from "react-konva";
import type Konva from "konva";
import type { StarObject } from "../../../types/canvas.types";
import { useCanvas } from "../../../contexts/CanvasContext";
import { useSyncOperations } from "../../../hooks/useRealtimeSync";
import { offlineQueue } from "../../../utils/offlineQueue";
import {
  TransactionErrorType,
  getErrorMessage,
} from "../../../services/transactionService";
import { useAuth } from "../../../hooks/useAuth";

interface StarShapeProps {
  object: StarObject;
  isSelected: boolean;
  onSelect: (e?: Konva.KonvaEventObject<Event>) => void;
  onHoverChange?: (
    hovering: boolean,
    object: StarObject | null,
    position: { x: number; y: number }
  ) => void;
}

/**
 * StarShape Component
 * Renders a star with customizable points and inner radius
 */
function StarShape({
  object,
  isSelected,
  onSelect,
  onHoverChange,
}: StarShapeProps) {
  const shapeRef = useRef<Konva.Star>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const { updateObject, canvasSize, isCanvasDisabled } = useCanvas();
  const syncOps = useSyncOperations();
  const { user } = useAuth();

  // Star properties with defaults
  const numPoints = Math.max(3, Math.min(12, object.numPoints || 5));
  const innerRadius = Math.max(0.1, Math.min(0.9, object.innerRadius || 0.5));
  const outerRadius = Math.min(object.width, object.height) / 2;

  // Attach transformer to shape when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  /**
   * Handle drag end - update position
   * Convert center position (Konva) back to top-left corner (storage)
   */
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot update objects");
      return;
    }

    const node = e.target;
    // Konva positions stars by center, but we store top-left corner
    const updates = {
      x: node.x() - object.width / 2,
      y: node.y() - object.height / 2,
      timestamp: Date.now(),
    };

    const userName = user?.name || user?.email || "Unknown User";

    // Update local state immediately (optimistic update)
    updateObject(object.id, updates);

    // Sync to Firebase or queue if offline
    try {
      if (!navigator.onLine) {
        await offlineQueue.enqueue({
          id: `op-update-${Date.now()}`,
          type: "update",
          objectId: object.id,
          payload: updates,
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        const result = await syncOps.updateObject(
          object.id,
          updates,
          user?.id,
          userName
        );

        if (!result.success) {
          if (result.error === TransactionErrorType.OBJECT_DELETED) {
            alert("This object was deleted by another user");
          } else {
            console.error("Failed to update object:", result.errorMessage);
            alert(getErrorMessage(result.error!, "star"));
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to sync star position:", error);
    }
  };

  /**
   * Handle transform end - update size and maintain star shape
   */
  const handleTransformEnd = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot update objects");
      return;
    }

    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // For stars, use the average scale to maintain proportional shape
    const avgScale = (scaleX + scaleY) / 2;

    // Reset scale to 1
    node.scaleX(1);
    node.scaleY(1);

    // Calculate new dimensions
    const newWidth = Math.max(20, object.width * avgScale);
    const newHeight = Math.max(20, object.height * avgScale);

    // node.x() and node.y() are the CENTER position after transform
    // Convert back to top-left corner for storage
    const updates = {
      x: node.x() - newWidth / 2,
      y: node.y() - newHeight / 2,
      width: newWidth,
      height: newHeight,
      timestamp: Date.now(),
    };

    const userName = user?.name || user?.email || "Unknown User";

    // Update local state immediately
    updateObject(object.id, updates);

    // Sync to Firebase or queue if offline
    try {
      if (!navigator.onLine) {
        await offlineQueue.enqueue({
          id: `op-update-${Date.now()}`,
          type: "update",
          objectId: object.id,
          payload: updates,
          timestamp: Date.now(),
          retryCount: 0,
        });
      } else {
        const result = await syncOps.updateObject(
          object.id,
          updates,
          user?.id,
          userName
        );

        if (!result.success) {
          if (result.error === TransactionErrorType.OBJECT_DELETED) {
            alert("This object was deleted by another user");
          } else {
            console.error("Failed to update object:", result.errorMessage);
            alert(getErrorMessage(result.error!, "star"));
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to sync star resize:", error);
    }
  };

  /**
   * Handle mouse enter - notify parent to show tooltip
   */
  const handleMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pointerPos = stage?.getPointerPosition();

    if (
      pointerPos &&
      object.lastEditedByName &&
      object.lastEditedAt &&
      onHoverChange
    ) {
      onHoverChange(true, object, pointerPos);
    }
  };

  /**
   * Handle mouse move - update tooltip position
   */
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pointerPos = stage?.getPointerPosition();

    if (pointerPos && onHoverChange) {
      onHoverChange(true, object, pointerPos);
    }
  };

  /**
   * Handle mouse leave - hide tooltip
   */
  const handleMouseLeave = () => {
    if (onHoverChange) {
      onHoverChange(false, null, { x: 0, y: 0 });
    }
  };

  return (
    <>
      <Star
        ref={shapeRef}
        id={object.id}
        x={object.x + object.width / 2} // Stars are positioned by center
        y={object.y + object.height / 2} // Stars are positioned by center
        numPoints={numPoints}
        innerRadius={outerRadius * innerRadius}
        outerRadius={outerRadius}
        fill={object.color}
        stroke={object.stroke || "#000000"}
        strokeWidth={object.strokeWidth || 0}
        strokeEnabled={!!object.stroke && (object.strokeWidth || 0) > 0}
        shadowColor={isSelected ? "rgba(0, 102, 255, 0.3)" : undefined}
        shadowBlur={isSelected ? 10 : 0}
        shadowOffset={isSelected ? { x: 0, y: 0 } : undefined}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize to minimum 20x20 pixels
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }

            // Constrain resize within canvas bounds
            const centerX = object.x + object.width / 2;
            const centerY = object.y + object.height / 2;
            const maxRadius = Math.max(newBox.width, newBox.height) / 2;

            if (
              centerX - maxRadius < 0 ||
              centerY - maxRadius < 0 ||
              centerX + maxRadius > canvasSize.width ||
              centerY + maxRadius > canvasSize.height
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
          // Enable proportional scaling (keep star shape)
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ]}
          rotateEnabled={false}
          keepRatio={true} // Force proportional scaling
        />
      )}
    </>
  );
}

export default React.memo(StarShape, (prevProps, nextProps) => {
  // Avoid re-render unless props meaningfully change
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.object.id !== nextProps.object.id) return false;
  if (prevProps.onSelect !== nextProps.onSelect) return false;

  const prev = prevProps.object;
  const next = nextProps.object;

  if (prev.x !== next.x) return false;
  if (prev.y !== next.y) return false;
  if (prev.width !== next.width) return false;
  if (prev.height !== next.height) return false;
  if (prev.numPoints !== next.numPoints) return false;
  if (prev.innerRadius !== next.innerRadius) return false;
  if (prev.color !== next.color) return false;
  if (prev.stroke !== next.stroke) return false;
  if (prev.strokeWidth !== next.strokeWidth) return false;

  return true; // No re-render needed
});
