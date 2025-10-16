import React from "react";
import type {
  CanvasObject as CanvasObjectType,
  LineObject,
} from "../../types/canvas.types";
import RectangleShape from "./shapes/RectangleShape";
import CircleShape from "./shapes/CircleShape";
import StarShape from "./shapes/StarShape";
import LineShape from "./shapes/LineShape";

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
