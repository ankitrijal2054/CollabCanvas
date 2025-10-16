import React, { useRef, useEffect } from "react";
import { Circle, Transformer } from "react-konva";
import type Konva from "konva";
import type { CircleObject } from "../../../types/canvas.types";
import { useCanvas } from "../../../contexts/CanvasContext";
import { useSyncOperations } from "../../../hooks/useRealtimeSync";
import { offlineQueue } from "../../../utils/offlineQueue";
import {
  TransactionErrorType,
  getErrorMessage,
} from "../../../services/transactionService";
import { useAuth } from "../../../hooks/useAuth";

interface CircleShapeProps {
  object: CircleObject;
  isSelected: boolean;
  onSelect: () => void;
  onHoverChange?: (
    hovering: boolean,
    object: CircleObject | null,
    position: { x: number; y: number }
  ) => void;
}

/**
 * CircleShape Component
 * Renders a circle with drag, resize, and stroke capabilities
 */
function CircleShape({
  object,
  isSelected,
  onSelect,
  onHoverChange,
}: CircleShapeProps) {
  const shapeRef = useRef<Konva.Circle>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const { updateObject, canvasSize, isCanvasDisabled } = useCanvas();
  const syncOps = useSyncOperations();
  const { user } = useAuth();

  // Calculate radius from width (circles are always proportional)
  const radius = object.radius || object.width / 2;

  // Attach transformer to shape when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  /**
   * Handle drag end - update position
   */
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
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
            alert(getErrorMessage(result.error!, "circle"));
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to sync circle position:", error);
    }
  };

  /**
   * Handle transform end - update size and maintain circular shape
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

    // For circles, use the average scale to maintain circular shape
    const avgScale = (scaleX + scaleY) / 2;

    // Reset scale to 1
    node.scaleX(1);
    node.scaleY(1);

    // Calculate new radius (maintain circular shape)
    const newRadius = Math.max(5, radius * avgScale);
    const newWidth = newRadius * 2;
    const newHeight = newRadius * 2;

    const updates = {
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      radius: newRadius,
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
            alert(getErrorMessage(result.error!, "circle"));
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to sync circle resize:", error);
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
      <Circle
        ref={shapeRef}
        id={object.id}
        x={object.x + radius} // Konva circles are positioned by center
        y={object.y + radius} // Konva circles are positioned by center
        radius={radius}
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
            // Limit resize to minimum 10x10 pixels (5px radius)
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }

            // Constrain resize within canvas bounds
            const centerX = object.x + radius;
            const centerY = object.y + radius;
            const newRadius = Math.max(newBox.width, newBox.height) / 2;

            if (
              centerX - newRadius < 0 ||
              centerY - newRadius < 0 ||
              centerX + newRadius > canvasSize.width ||
              centerY + newRadius > canvasSize.height
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
          // Enable proportional scaling (keep circular shape)
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

export default React.memo(CircleShape, (prevProps, nextProps) => {
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
  if (prev.radius !== next.radius) return false;
  if (prev.color !== next.color) return false;
  if (prev.stroke !== next.stroke) return false;
  if (prev.strokeWidth !== next.strokeWidth) return false;

  return true; // No re-render needed
});
