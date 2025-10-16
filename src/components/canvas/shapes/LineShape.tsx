import React, { useRef } from "react";
import { Line, Rect } from "react-konva";
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
import { calculateGroupMovePositions } from "../../../utils/multiSelectHelpers";

interface LineShapeProps {
  object: LineObject;
  isSelected: boolean;
  onSelect: (e?: Konva.KonvaEventObject<Event>) => void;
  selectedIds: string[];
  allObjects: import("../../../types/canvas.types").CanvasObject[];
  onHoverChange?: (
    hovering: boolean,
    object: LineObject | null,
    position: { x: number; y: number }
  ) => void;
}

/**
 * LineShape Component
 * Renders a line with two draggable anchor points (start and end)
 */
function LineShape({
  object,
  isSelected,
  onSelect,
  selectedIds,
  allObjects,
  onHoverChange,
}: LineShapeProps) {
  const shapeRef = useRef<Konva.Line>(null);
  const startAnchorRef = useRef<Konva.Rect>(null);
  const endAnchorRef = useRef<Konva.Rect>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const { updateObject, canvasSize, isCanvasDisabled } = useCanvas();
  const syncOps = useSyncOperations();
  const { user } = useAuth();

  // Default points if not specified: horizontal line from (0,0) to (width, 0)
  const defaultPoints = [0, 0, object.width || 100, 0];
  const points =
    object.points && object.points.length >= 4 ? object.points : defaultPoints;

  // Extract start and end points
  const startX = points[0];
  const startY = points[1];
  const endX = points[2];
  const endY = points[3];

  /**
   * Sync line updates to Firebase
   */
  const syncLineUpdate = async (newPoints: number[]) => {
    // Calculate new bounding box
    const xCoords = [newPoints[0], newPoints[2]];
    const yCoords = [newPoints[1], newPoints[3]];
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    const updates = {
      points: newPoints,
      width: maxX - minX,
      height: maxY - minY,
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
      console.error("❌ Failed to sync line:", error);
    }
  };

  /**
   * Handle line drag start - store initial position for group move
   */
  const handleLineDragStart = () => {
    // Store the initial position at drag start
    dragStartPosRef.current = { x: object.x, y: object.y };
  };

  /**
   * Handle line drag move - update position in real-time for group move
   */
  const handleLineDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isCanvasDisabled) return;

    const node = e.target;
    const newPosition = { x: node.x(), y: node.y() };

    // Check if multiple objects are selected for group move
    const isGroupMove =
      selectedIds.length > 1 && selectedIds.includes(object.id);

    if (isGroupMove && dragStartPosRef.current) {
      const stage = node.getStage();
      if (!stage) return;

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
              const circleRadius =
                (otherObj as any).radius || otherObj.width / 2;
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
              // Anchors are positioned relative to the line's x,y position
              const lineObj = otherObj as any;
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

      // Also update THIS line's own anchors (the one being dragged)
      if (startAnchorRef.current && endAnchorRef.current) {
        startAnchorRef.current.x(newPosition.x + startX - 4);
        startAnchorRef.current.y(newPosition.y + startY - 4);
        endAnchorRef.current.x(newPosition.x + endX - 4);
        endAnchorRef.current.y(newPosition.y + endY - 4);
      }

      // Redraw the layer
      node.getLayer()?.batchDraw();
    } else {
      // Single line drag - also update anchors for smooth movement
      if (startAnchorRef.current && endAnchorRef.current) {
        startAnchorRef.current.x(newPosition.x + startX - 4);
        startAnchorRef.current.y(newPosition.y + startY - 4);
        endAnchorRef.current.x(newPosition.x + endX - 4);
        endAnchorRef.current.y(newPosition.y + endY - 4);
        node.getLayer()?.batchDraw();
      }
    }

    // DON'T update state during drag - only update Konva nodes (prevents misalignment on subsequent drags)
    // State will be updated in handleLineDragEnd
  };

  /**
   * Handle line drag end - sync to Firebase (with group move support)
   */
  const handleLineDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isCanvasDisabled) return;

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
        console.error("❌ Failed to sync line position:", error);
      }
    }
  };

  /**
   * Handle start anchor drag move - update in real-time (local only)
   */
  const handleStartAnchorDragMove = () => {
    if (isCanvasDisabled) return;

    const anchor = startAnchorRef.current;
    if (!anchor) return;

    // Get anchor position and convert to relative coordinates
    const anchorAbsX = anchor.x() + 4;
    const anchorAbsY = anchor.y() + 4;
    const newStartX = anchorAbsX - object.x;
    const newStartY = anchorAbsY - object.y;

    // Update local state in real-time
    updateObject(object.id, {
      points: [newStartX, newStartY, endX, endY],
    } as Partial<LineObject>);
  };

  /**
   * Handle start anchor drag end
   */
  const handleStartAnchorDragEnd = async () => {
    if (isCanvasDisabled) return;

    const anchor = startAnchorRef.current;
    if (!anchor) return;

    // Get anchor position (top-left corner of 8x8 rect)
    // Add 4 to get center position
    const anchorAbsX = anchor.x() + 4;
    const anchorAbsY = anchor.y() + 4;

    // Convert to relative coordinates (relative to line's x,y position)
    const newStartX = anchorAbsX - object.x;
    const newStartY = anchorAbsY - object.y;

    const newPoints = [newStartX, newStartY, endX, endY];
    await syncLineUpdate(newPoints);
  };

  /**
   * Handle end anchor drag move - update in real-time (local only)
   */
  const handleEndAnchorDragMove = () => {
    if (isCanvasDisabled) return;

    const anchor = endAnchorRef.current;
    if (!anchor) return;

    // Get anchor position and convert to relative coordinates
    const anchorAbsX = anchor.x() + 4;
    const anchorAbsY = anchor.y() + 4;
    const newEndX = anchorAbsX - object.x;
    const newEndY = anchorAbsY - object.y;

    // Update local state in real-time
    updateObject(object.id, {
      points: [startX, startY, newEndX, newEndY],
    } as Partial<LineObject>);
  };

  /**
   * Handle end anchor drag end
   */
  const handleEndAnchorDragEnd = async () => {
    if (isCanvasDisabled) return;

    const anchor = endAnchorRef.current;
    if (!anchor) return;

    // Get anchor position (top-left corner of 8x8 rect)
    // Add 4 to get center position
    const anchorAbsX = anchor.x() + 4;
    const anchorAbsY = anchor.y() + 4;

    // Convert to relative coordinates (relative to line's x,y position)
    const newEndX = anchorAbsX - object.x;
    const newEndY = anchorAbsY - object.y;

    const newPoints = [startX, startY, newEndX, newEndY];
    await syncLineUpdate(newPoints);
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
      {/* Line */}
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
        onDragStart={handleLineDragStart}
        onDragMove={handleLineDragMove}
        onDragEnd={handleLineDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Anchor points - only visible when selected */}
      {isSelected && (
        <>
          {/* Start anchor */}
          <Rect
            ref={startAnchorRef}
            id={`${object.id}-start-anchor`}
            x={object.x + startX - 4}
            y={object.y + startY - 4}
            width={8}
            height={8}
            fill="#0066FF"
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onDragMove={handleStartAnchorDragMove}
            onDragEnd={handleStartAnchorDragEnd}
            dragBoundFunc={(pos) => {
              // Constrain within canvas bounds
              return {
                x: Math.max(-4, Math.min(pos.x, canvasSize.width - 4)),
                y: Math.max(-4, Math.min(pos.y, canvasSize.height - 4)),
              };
            }}
          />

          {/* End anchor */}
          <Rect
            ref={endAnchorRef}
            id={`${object.id}-end-anchor`}
            x={object.x + endX - 4}
            y={object.y + endY - 4}
            width={8}
            height={8}
            fill="#0066FF"
            stroke="#ffffff"
            strokeWidth={2}
            draggable
            onDragMove={handleEndAnchorDragMove}
            onDragEnd={handleEndAnchorDragEnd}
            dragBoundFunc={(pos) => {
              // Constrain within canvas bounds
              return {
                x: Math.max(-4, Math.min(pos.x, canvasSize.width - 4)),
                y: Math.max(-4, Math.min(pos.y, canvasSize.height - 4)),
              };
            }}
          />
        </>
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
