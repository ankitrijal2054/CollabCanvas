import React from "react";
import type {
  CanvasObject as CanvasObjectType,
  LineObject,
  TextObject,
} from "../../types/canvas.types";
import { useCanvas } from "../../hooks/useCanvas";
import RectangleShape from "./shapes/RectangleShape";
import CircleShape from "./shapes/CircleShape";
import StarShape from "./shapes/StarShape";
import LineShape from "./shapes/LineShape";
import TextShape from "./shapes/TextShape";

interface CanvasObjectProps {
  object: CanvasObjectType;
  isSelected: boolean;
  onSelect: () => void;
  onHoverChange?: (
    hovering: boolean,
    object: CanvasObjectType | null,
    position: { x: number; y: number }
  ) => void;
}

/**
 * CanvasObject Component
 * Router component that delegates to the appropriate shape component based on object type
 */
function CanvasObject({
  object,
  isSelected,
  onSelect,
  onHoverChange,
}: CanvasObjectProps) {
  const { setEditingTextId } = useCanvas();

  // Route to the appropriate shape component based on type
  // Default to rectangle for backward compatibility with objects that don't have a type
  const type = object.type || "rectangle";

  switch (type) {
    case "rectangle":
      return (
        <RectangleShape
          object={{ ...object, type: "rectangle" }}
          isSelected={isSelected}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
        />
      );

    case "circle":
      return (
        <CircleShape
          object={{ ...object, type: "circle" }}
          isSelected={isSelected}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
        />
      );

    case "star":
      return (
        <StarShape
          object={{ ...object, type: "star" }}
          isSelected={isSelected}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
        />
      );

    case "line": {
      const lineObj = object as Partial<LineObject>;
      return (
        <LineShape
          object={{
            ...object,
            type: "line",
            points: lineObj.points || [0, 0, object.width || 100, 0],
          }}
          isSelected={isSelected}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
        />
      );
    }

    case "text": {
      const textObj = object as TextObject;
      return (
        <TextShape
          object={textObj}
          isSelected={isSelected}
          onSelect={onSelect}
          onDoubleClick={() => setEditingTextId(textObj.id)}
          onHoverChange={onHoverChange}
        />
      );
    }

    default:
      // Fallback to rectangle for unknown types
      console.warn(`Unknown shape type: ${type}, defaulting to rectangle`);
      return (
        <RectangleShape
          object={{ ...object, type: "rectangle" }}
          isSelected={isSelected}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
        />
      );
  }
}

export default React.memo(CanvasObject);
