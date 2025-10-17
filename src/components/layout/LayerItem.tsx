import React from "react";
import type { CanvasObject } from "../../types/canvas.types";
import "./LayerItem.css";

interface LayerItemProps {
  /** The canvas object this layer represents */
  object: CanvasObject;
  /** Display name for the layer */
  name: string;
  /** Whether this layer is currently selected */
  isSelected: boolean;
  /** Click handler for layer selection */
  onClick: (objectId: string) => void;
  /** Drag start handler */
  onDragStart: (objectId: string) => void;
  /** Drag over handler */
  onDragOver: (e: React.DragEvent, objectId: string) => void;
  /** Drop handler */
  onDrop: (objectId: string) => void;
}

/**
 * Get icon/emoji for each shape type
 */
const getShapeIcon = (type: CanvasObject["type"]): string => {
  switch (type) {
    case "rectangle":
      return "⬜";
    case "circle":
      return "⭕";
    case "star":
      return "⭐";
    case "line":
      return "➖";
    case "text":
      return "🔤";
    default:
      return "⬜";
  }
};

/**
 * LayerItem
 *
 * Represents a single layer in the layers panel.
 * Draggable for reordering, clickable for selection.
 */
export const LayerItem: React.FC<LayerItemProps> = ({
  object,
  name,
  isSelected,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(object.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", object.id);
    onDragStart(object.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(e, object.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(object.id);
  };

  return (
    <div
      className={`layer-item ${isSelected ? "selected" : ""}`}
      onClick={handleClick}
      draggable={true}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <span className="layer-drag-handle" title="Drag to reorder">
        ⋮
      </span>
      <span className="layer-icon">{getShapeIcon(object.type)}</span>
      <span className="layer-name" title={name}>
        {name}
      </span>
    </div>
  );
};
