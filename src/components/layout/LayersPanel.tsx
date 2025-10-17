import React, { useMemo, useState } from "react";
import { useCanvas } from "../../hooks/useCanvas";
import { LayerItem } from "./LayerItem";
import type { CanvasObject } from "../../types/canvas.types";
import "./LayersPanel.css";

/**
 * Auto-generate layer names based on shape type and index
 * e.g., "Rectangle 1", "Rectangle 2", "Circle 1", "Circle 2"
 */
const generateLayerNames = (objects: CanvasObject[]): Map<string, string> => {
  const nameMap = new Map<string, string>();
  const typeCounters = new Map<string, number>();

  // Sort by timestamp to maintain consistent naming order
  const sortedObjects = [...objects].sort((a, b) => a.timestamp - b.timestamp);

  sortedObjects.forEach((obj) => {
    const typeName = obj.type.charAt(0).toUpperCase() + obj.type.slice(1);

    // Increment counter for this type
    const currentCount = (typeCounters.get(obj.type) || 0) + 1;
    typeCounters.set(obj.type, currentCount);

    // Generate name
    nameMap.set(obj.id, `${typeName} ${currentCount}`);
  });

  return nameMap;
};

/**
 * Get zIndex value, fallback to timestamp if not set
 */
const getZIndex = (obj: CanvasObject): number => {
  return obj.zIndex !== undefined ? obj.zIndex : obj.timestamp;
};

/**
 * LayersPanel
 *
 * Displays all canvas objects in a hierarchical list sorted by zIndex.
 * Supports drag-to-reorder and click-to-select.
 */
export const LayersPanel: React.FC = () => {
  const { objects, selectedIds, selectObject, updateObjectZIndex } =
    useCanvas();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [_dragOverId, setDragOverId] = useState<string | null>(null);

  // Generate auto-names for all objects
  const layerNames = useMemo(() => generateLayerNames(objects), [objects]);

  // Sort objects by zIndex (descending - highest first = top layer)
  const sortedObjects = useMemo(() => {
    return [...objects].sort((a, b) => getZIndex(b) - getZIndex(a));
  }, [objects]);

  /**
   * Handle layer click - select object
   */
  const handleLayerClick = (objectId: string) => {
    selectObject(objectId);
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (objectId: string) => {
    setDraggedId(objectId);
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (_e: React.DragEvent, objectId: string) => {
    if (draggedId && draggedId !== objectId) {
      setDragOverId(objectId);
    }
  };

  /**
   * Handle drop - reorder layers by swapping zIndex values
   */
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedObj = objects.find((o) => o.id === draggedId);
    const targetObj = objects.find((o) => o.id === targetId);

    if (!draggedObj || !targetObj) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedZ = getZIndex(draggedObj);
    const targetZ = getZIndex(targetObj);

    // Swap zIndex values
    updateObjectZIndex(draggedId, targetZ);
    updateObjectZIndex(targetId, draggedZ);

    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="layers-panel">
      <div className="layers-panel-header">
        <h3>Layers</h3>
        <span className="layers-count">{objects.length}</span>
      </div>

      <div className="layers-list">
        {sortedObjects.length === 0 ? (
          <div className="layers-empty">
            <p>No objects yet</p>
            <p className="layers-empty-hint">Create shapes to see them here</p>
          </div>
        ) : (
          sortedObjects.map((obj) => (
            <LayerItem
              key={obj.id}
              object={obj}
              name={layerNames.get(obj.id) || "Unknown"}
              isSelected={selectedIds.includes(obj.id)}
              onClick={handleLayerClick}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>
    </div>
  );
};
