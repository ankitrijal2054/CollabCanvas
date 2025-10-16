import React, { useRef, useEffect } from "react";
import { Line, Transformer } from "react-konva";
import type Konva from "konva";
import type { LineObject } from "../../../types/canvas.types";
import { useCanvas } from "../../../contexts/CanvasContext";
import { useSyncOperations } from "../../../hooks/useRealtimeSync";
import { offlineQueue } from "../../../utils/offlineQueue";
import {
  TransactionErrorType,
  getErrorMessage,
} from "../../../services/transactionService";
import { useAuth } from "../../../hooks/useAuth";

interface LineShapeProps {
  object: LineObject;
  isSelected: boolean;
  onSelect: () => void;
  onHoverChange?: (
    hovering: boolean,
    object: LineObject | null,
    position: { x: number; y: number }
  ) => void;
}

/**
 * LineShape Component
 * Renders a line with optional arrow heads at start/end
 */
function LineShape({
  object,
  isSelected,
  onSelect,
  onHoverChange,
}: LineShapeProps) {
  const shapeRef = useRef<Konva.Line>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const { updateObject, canvasSize, isCanvasDisabled } = useCanvas();
  const syncOps = useSyncOperations();
  const { user } = useAuth();

  // Default points if not specified: horizontal line from (0,0) to (width, 0)
  const defaultPoints = [0, 0, object.width || 100, 0];
  const points =
    object.points && object.points.length >= 4 ? object.points : defaultPoints;

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
            alert(getErrorMessage(result.error!, "line"));
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to sync line position:", error);
    }
  };

  /**
   * Handle transform end - update points based on scale/rotation
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

    // Reset scale to 1
    node.scaleX(1);
    node.scaleY(1);

    // Scale the points array
    const scaledPoints = points.map((coord, index) => {
      if (index % 2 === 0) {
        // X coordinate
        return coord * scaleX;
      } else {
        // Y coordinate
        return coord * scaleY;
      }
    });

    // Calculate new bounding box for width/height
    const xCoords = scaledPoints.filter((_, i) => i % 2 === 0);
    const yCoords = scaledPoints.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    const newWidth = maxX - minX;
    const newHeight = maxY - minY;

    const updates = {
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      points: scaledPoints,
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
            alert(getErrorMessage(result.error!, "line"));
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to sync line transform:", error);
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
      <Line
        ref={shapeRef}
        id={object.id}
        x={object.x}
        y={object.y}
        points={points}
        stroke={object.stroke || object.color || "#000000"}
        strokeWidth={object.strokeWidth || 2}
        lineCap="round"
        lineJoin="round"
        // Arrow heads
        pointerAtBeginning={object.arrowStart || false}
        pointerAtEnding={object.arrowEnd !== undefined ? object.arrowEnd : true}
        pointerLength={10}
        pointerWidth={10}
        // Selection styling
        shadowColor={isSelected ? "rgba(0, 102, 255, 0.3)" : undefined}
        shadowBlur={isSelected ? 10 : 0}
        shadowOffset={isSelected ? { x: 0, y: 0 } : undefined}
        // Interaction
        draggable
        hitStrokeWidth={20} // Larger hit area for easier selection
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
            // Limit resize to minimum 10 pixels
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }

            // Constrain within canvas bounds
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
          // Enable all anchors for line transformation
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
          keepRatio={false} // Allow free transformation
        />
      )}
    </>
  );
}

export default React.memo(LineShape, (prevProps, nextProps) => {
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
  if (prev.color !== next.color) return false;
  if (prev.stroke !== next.stroke) return false;
  if (prev.strokeWidth !== next.strokeWidth) return false;
  if (prev.arrowStart !== next.arrowStart) return false;
  if (prev.arrowEnd !== next.arrowEnd) return false;

  // Check points array
  if (prev.points?.length !== next.points?.length) return false;
  if (prev.points && next.points) {
    for (let i = 0; i < prev.points.length; i++) {
      if (prev.points[i] !== next.points[i]) return false;
    }
  }

  return true; // No re-render needed
});
