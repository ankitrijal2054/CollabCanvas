import React, { useRef, useEffect } from "react";
import { Text, Transformer } from "react-konva";
import type Konva from "konva";
import type {
  TextObject,
  CircleObject,
  LineObject,
} from "../../../types/canvas.types";
import { useCanvas } from "../../../contexts/CanvasContext";
import { useSyncOperations } from "../../../hooks/useRealtimeSync";
import { offlineQueue } from "../../../utils/offlineQueue";
import { TransactionErrorType } from "../../../services/transactionService";
import { useAuth } from "../../../hooks/useAuth";
import { calculateGroupMovePositions } from "../../../utils/multiSelectHelpers";

interface TextShapeProps {
  object: TextObject;
  isSelected: boolean;
  onSelect: (e?: Konva.KonvaEventObject<Event>) => void;
  selectedIds: string[];
  allObjects: import("../../../types/canvas.types").CanvasObject[];
  onDoubleClick?: () => void; // For entering edit mode
  onHoverChange?: (
    hovering: boolean,
    object: TextObject | null,
    position: { x: number; y: number }
  ) => void;
}

/**
 * TextShape Component
 * Renders text using Konva.Text with auto-resizing and word wrapping
 */
function TextShape({
  object,
  isSelected,
  onSelect,
  selectedIds,
  allObjects,
  onDoubleClick,
  onHoverChange,
}: TextShapeProps) {
  const shapeRef = useRef<Konva.Text>(null);
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
            payload: {
              ...updates,
              lastEditedBy: user?.id,
              lastEditedByName: userName,
              lastEditedAt: Date.now(),
            },
            timestamp: Date.now(),
            retryCount: 0,
          });
          console.log("📦 Queued text position update (offline)");
        } else {
          await syncOps.updateObject(object.id, updates, user?.id, userName);
        }
      } catch (error: unknown) {
        if (error && typeof error === "object") {
          const errorObj = error as { errorType?: TransactionErrorType };
          if (errorObj.errorType === TransactionErrorType.OBJECT_DELETED) {
            console.warn("⚠️ Text object was deleted during drag");
          } else {
            console.error("❌ Failed to sync text position:", error);
          }
        }
      }
    }
  };

  /**
   * Handle transform end - update width/height after resize
   */
  const handleTransformEnd = async () => {
    if (isCanvasDisabled) {
      console.warn("🚫 Canvas is disabled - cannot update objects");
      return;
    }

    const node = shapeRef.current;
    if (!node) return;

    // Get the new dimensions after transform
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    const updates = {
      x: node.x(),
      y: node.y(),
      width: Math.max(50, node.width() * scaleX), // Minimum 50px width
      height: Math.max(20, node.height() * scaleY), // Minimum 20px height
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
          payload: {
            ...updates,
            lastEditedBy: user?.id,
            lastEditedByName: userName,
            lastEditedAt: Date.now(),
          },
          timestamp: Date.now(),
          retryCount: 0,
        });
        console.log("📦 Queued text resize (offline)");
      } else {
        await syncOps.updateObject(object.id, updates, user?.id, userName);
      }
    } catch (error: unknown) {
      if (error && typeof error === "object") {
        const errorObj = error as { errorType?: TransactionErrorType };
        if (errorObj.errorType === TransactionErrorType.OBJECT_DELETED) {
          console.warn("⚠️ Text object was deleted during resize");
        } else {
          console.error("❌ Failed to sync text resize:", error);
        }
      }
    }
  };

  /**
   * Handle mouse enter - show tooltip
   */
  const handleMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = "move";
    }

    const pointerPos = stage?.getPointerPosition();
    if (pointerPos && onHoverChange) {
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
    const stage = shapeRef.current?.getStage();
    if (stage) {
      stage.container().style.cursor = "default";
    }

    if (onHoverChange) {
      onHoverChange(false, null, { x: 0, y: 0 });
    }
  };

  /**
   * Handle double click - enter edit mode
   */
  const handleDoubleClick = () => {
    const node = shapeRef.current;
    if (!node) return;

    // Measure and store the actual displayed size before editing
    const width = node.width();
    const height = node.height();

    updateObject(object.id, { width, height });

    // Enter edit mode
    if (onDoubleClick) {
      onDoubleClick();
    }
  };

  return (
    <>
      <Text
        ref={shapeRef}
        id={object.id}
        x={object.x}
        y={object.y}
        text={object.text || ""}
        // Font properties - combine into CSS font string for Konva
        fontFamily={object.fontFamily || "Arial"}
        fontSize={object.fontSize || 16}
        fontStyle={`${object.fontStyle || "normal"} ${
          object.fontWeight || "normal"
        }`}
        fill={object.color || "#000000"}
        align={object.textAlign || "left"}
        width={object.width || 200}
        height={object.height || 24}
        // Text wrapping configuration
        wrap="word" // Wrap at word boundaries
        ellipsis={false} // Don't show ellipsis
        // Selection styling
        shadowColor={isSelected ? "rgba(0, 102, 255, 0.3)" : undefined}
        shadowBlur={isSelected ? 10 : 0}
        shadowOffset={isSelected ? { x: 0, y: 0 } : undefined}
        // Interaction
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
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
            // Limit resize to minimum 50x20 pixels
            if (newBox.width < 50 || newBox.height < 20) {
              return oldBox;
            }

            // Limit maximum width to 800px (as per spec)
            if (newBox.width > 800) {
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
          // Enable horizontal and vertical resizing
          enabledAnchors={[
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ]}
          rotateEnabled={false} // No rotation for text in this phase
          keepRatio={false} // Allow independent width/height adjustment
        />
      )}
    </>
  );
}

export default React.memo(TextShape, (prevProps, nextProps) => {
  // Avoid re-render unless props meaningfully change
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.object.id !== nextProps.object.id) return false;
  if (prevProps.onSelect !== nextProps.onSelect) return false;
  if (prevProps.onDoubleClick !== nextProps.onDoubleClick) return false;

  const prev = prevProps.object;
  const next = nextProps.object;

  // Check all text-specific properties
  if (prev.x !== next.x) return false;
  if (prev.y !== next.y) return false;
  if (prev.width !== next.width) return false;
  if (prev.height !== next.height) return false;
  if (prev.text !== next.text) return false;
  if (prev.fontFamily !== next.fontFamily) return false;
  if (prev.fontSize !== next.fontSize) return false;
  if (prev.fontWeight !== next.fontWeight) return false;
  if (prev.fontStyle !== next.fontStyle) return false;
  if (prev.textAlign !== next.textAlign) return false;
  if (prev.color !== next.color) return false;

  return true; // No re-render needed
});
