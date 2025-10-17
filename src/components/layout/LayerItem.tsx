import React, { useState, useRef, useEffect } from "react";
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
  /** Rename handler */
  onRename: (objectId: string, newName: string) => void;
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
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update editName when name prop changes (e.g., from another user)
  useEffect(() => {
    if (!isEditing) {
      setEditName(name);
    }
  }, [name, isEditing]);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onClick(object.id);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== name) {
      onRename(object.id, trimmedName);
    } else if (!trimmedName) {
      // If empty, revert to original name
      setEditName(name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditName(name);
      setIsEditing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) {
      e.preventDefault();
      return;
    }
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
      className={`layer-item ${isSelected ? "selected" : ""} ${
        isEditing ? "editing" : ""
      }`}
      onClick={handleClick}
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <span className="layer-drag-handle" title="Drag to reorder">
        ⋮
      </span>
      <span className="layer-icon">{getShapeIcon(object.type)}</span>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="layer-name-input"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          maxLength={50}
        />
      ) : (
        <span
          className="layer-name"
          title={`${name} (Double-click to rename)`}
          onDoubleClick={handleDoubleClick}
        >
          {name}
        </span>
      )}
    </div>
  );
};
