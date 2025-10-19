import React, { useRef, useEffect } from "react";
import { Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type {
  RectangleObject,
  CircleObject,
  LineObject,
} from "../../../types/canvas.types";
import { useCanvas } from "../../../contexts/CanvasContext";
import { useSyncOperations } from "../../../hooks/useRealtimeSync";
import { offlineQueue } from "../../../utils/offlineQueue";
import {
  TransactionErrorType,
  getErrorMessage,
} from "../../../services/transactionService";
import { useAuth } from "../../../hooks/useAuth";
import { calculateGroupMovePositions } from "../../../utils/multiSelectHelpers";

interface RectangleShapeProps {
  object: RectangleObject;
  isSelected: boolean;
  onSelect: (e?: Konva.KonvaEventObject<Event>) => void;
  selectedIds: string[];
  allObjects: import("../../../types/canvas.types").CanvasObject[];
  onHoverChange?: (
    hovering: boolean,
    object: RectangleObject | null,
    position: { x: number; y: number }
  ) => void;
}

/**
 * RectangleShape Component
 * Renders a rectangle with drag, resize, and stroke capabilities
 */
function RectangleShape({
  object,
  isSelected,
  onSelect,
  selectedIds,
  allObjects,
  onHoverChange,
}: RectangleShapeProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const { updateObject, canvasSize, isCanvasDisabled } = useCanvas();
  const syncOps = useSyncOperations();
  const { user } = useAuth();

  // Attach transformer to shape when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  /**
   * Handle drag start - store initial position for group move
   */
  const handleDragStart = () => {
    // Store the initial position at drag start
    dragStartPosRef.current = { x: object.x, y: object.y };

    // Hide tooltip during drag for cleaner UI
    if (onHoverChange) {
      onHoverChange(false, null, { x: 0, y: 0 });
    }
  };

  /**
   * Handle drag - update Konva node positions in real-time for group move
   * (Don't update state during drag to avoid re-render conflicts)
   */
  const handleDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Check if multiple objects are selected for group move
    const isGroupMove =
      selectedIds.length > 1 && selectedIds.includes(object.id);

    if (isGroupMove && dragStartPosRef.current) {
      const node = e.target;
      const stage = node.getStage();
      if (!stage) return;

      const newPosition = { x: node.x(), y: node.y() };
      const oldPosition = dragStartPosRef.current; // Use stored start position

      // Get all selected objects
      const selectedObjects = allObjects.filter((obj) =>
        selectedIds.includes(obj.id)
      );

      // Calculate new positions for all selected objects
      const newPositions = calculateGroupMovePositions(
        object.id,
        oldPosition,
        newPosition,
        selectedObjects
      );

      // ONLY update Konva nodes directly (don't update state to avoid re-render)
      newPositions.forEach((pos, objId) => {
        if (objId !== object.id) {
          // Find the Konva node by ID and update its position directly
          const otherNode = stage.findOne(`#${objId}`);
          if (otherNode) {
            // Check object type to handle positioning correctly
            const otherObj = allObjects.find((o) => o.id === objId);
            if (otherObj?.type === "circle") {
              // Circles are positioned by center
              const circleObj = otherObj as CircleObject;
              const circleRadius = circleObj.radius || otherObj.width / 2;
              otherNode.x(pos.x + circleRadius);
              otherNode.y(pos.y + circleRadius);
            } else if (otherObj?.type === "star") {
              // Stars are positioned by center
              otherNode.x(pos.x + otherObj.width / 2);
              otherNode.y(pos.y + otherObj.height / 2);
            } else if (otherObj?.type === "line") {
              // Lines use top-left position
              otherNode.x(pos.x);
              otherNode.y(pos.y);

              // IMPORTANT: Also update the line's anchor points if they exist
              const lineObj = otherObj as LineObject;
              const linePoints = lineObj.points || [0, 0, 100, 0];

              // Find and update start anchor
              const startAnchor = stage.findOne(`#${objId}-start-anchor`);
              if (startAnchor) {
                startAnchor.x(pos.x + linePoints[0] - 4);
                startAnchor.y(pos.y + linePoints[1] - 4);
              }

              // Find and update end anchor
              const endAnchor = stage.findOne(`#${objId}-end-anchor`);
              if (endAnchor) {
                endAnchor.x(pos.x + linePoints[2] - 4);
                endAnchor.y(pos.y + linePoints[3] - 4);
              }
            } else {
              // Rectangles, Text use top-left position
              otherNode.x(pos.x);
              otherNode.y(pos.y);
            }
          }
        }
      });

      // Redraw the layer
      node.getLayer()?.batchDraw();
    }
  };

  /**
   * Handle drag end - sync to Firebase (with group move support)
   */
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot update objects");
      return;
    }

    const node = e.target;
    const newPosition = { x: node.x(), y: node.y() };
    const oldPosition = { x: object.x, y: object.y };
    const userName = user?.name || user?.email || "Unknown User";

    // Check if multiple objects are selected for group move
    const isGroupMove =
      selectedIds.length > 1 && selectedIds.includes(object.id);

    if (isGroupMove) {
      // Group move: Move all selected objects together
      const selectedObjects = allObjects.filter((obj) =>
        selectedIds.includes(obj.id)
      );

      // Calculate new positions for all selected objects
      const newPositions = calculateGroupMovePositions(
        object.id,
        oldPosition,
        newPosition,
        selectedObjects
      );

      // Update all objects locally (optimistic)
      newPositions.forEach((pos, objId) => {
        updateObject(objId, { ...pos, timestamp: Date.now() });
      });

      // Sync all objects to Firebase
      try {
        const updatePromises = Array.from(newPositions.entries()).map(
          async ([objId, pos]) => {
            const updates = { ...pos, timestamp: Date.now() };

            if (!navigator.onLine) {
              await offlineQueue.enqueue({
                id: `op-update-${Date.now()}-${objId}`,
                type: "update",
                objectId: objId,
                payload: updates,
                timestamp: Date.now(),
                retryCount: 0,
              });
            } else {
              const result = await syncOps.updateObject(
                objId,
                updates,
                user?.id,
                userName
              );

              if (!result.success) {
                console.error(
                  `Failed to update object ${objId}:`,
                  result.errorMessage
                );
              }
            }
          }
        );

        await Promise.all(updatePromises);
      } catch (error) {
        console.error("❌ Failed to sync group move:", error);
      }
    } else {
      // Single object move (original behavior)
      const updates = {
        ...newPosition,
        timestamp: Date.now(),
      };

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
              alert(getErrorMessage(result.error!, "rectangle"));
            }
          }
        }
      } catch (error) {
        console.error("❌ Failed to sync rectangle position:", error);
      }
    }

    // Show tooltip again after drag ends with updated attribution
    if (onHoverChange) {
      const stage = e.target.getStage();
      const pointerPos = stage?.getPointerPosition();
      const updatedObject = {
        ...object,
        lastEditedBy: user?.id,
        lastEditedByName: userName,
        lastEditedAt: Date.now(),
      };
      if (pointerPos) {
        onHoverChange(true, updatedObject, pointerPos);
      }
    }
  };

  /**
   * Handle transform end - update size and rotation
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

    const updates = {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
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
            alert(getErrorMessage(result.error!, "rectangle"));
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to sync rectangle resize:", error);
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
      <Rect
        ref={shapeRef}
        id={object.id}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        fill={object.color}
        stroke={object.stroke || "#000000"}
        strokeWidth={object.strokeWidth || 0}
        strokeEnabled={!!object.stroke && (object.strokeWidth || 0) > 0}
        opacity={object.opacity ?? 1.0}
        globalCompositeOperation={object.blendMode ?? "source-over"}
        rotation={object.rotation || 0}
        shadowColor={isSelected ? "rgba(0, 102, 255, 0.3)" : undefined}
        shadowBlur={isSelected ? 10 : 0}
        shadowOffset={isSelected ? { x: 0, y: 0 } : undefined}
        draggable
        dragBoundFunc={(pos) => {
          // Allow free movement for rotated objects (production standard)
          if (object.rotation && object.rotation !== 0) {
            return pos;
          }

          // Constrain non-rotated objects within canvas bounds
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
        onDragStart={handleDragStart}
        onDrag={handleDrag}
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
            // Limit resize to minimum 5x5 pixels
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }

            // Constrain resize within canvas bounds
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
          // Enable all anchors for free transformation
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
          rotateEnabled={selectedIds.length === 1}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          keepRatio={false} // Allow free transformation
        />
      )}
    </>
  );
}

export default React.memo(RectangleShape, (prevProps, nextProps) => {
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
  if (prev.rotation !== next.rotation) return false;

  return true; // No re-render needed
});
