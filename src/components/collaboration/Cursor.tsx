// Cursor component - renders a user's cursor with name label
import React from "react";
import "./Cursor.css";
import type { CursorData } from "../../types/collaboration.types";

export interface CursorProps {
  cursor: CursorData;
  scale?: number; // Viewport scale for inverse scaling
}

/**
 * Cursor Component
 * Displays a user's cursor position with their name label
 *
 * @param cursor - Cursor data (userId, name, position, color)
 * @param scale - Canvas viewport scale (for inverse scaling labels)
 */
const Cursor: React.FC<CursorProps> = ({ cursor, scale = 1 }) => {
  const { name, position, color } = cursor;

  // Inverse scale factor to keep cursor size constant
  const inverseScale = 1 / scale;

  return (
    <div
      className="cursor-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `scale(${inverseScale})`,
      }}
    >
      {/* SVG Cursor Icon */}
      <svg
        className="cursor-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cursor pointer shape */}
        <path
          d="M5.65376 12.3673L11.6537 3.36729C12.1106 2.64653 13.2004 2.72653 13.5543 3.50948L19.5537 17.5095C19.8441 18.1583 19.4256 18.9077 18.7148 18.9077H14.9326L12.4326 24.4077C12.0758 25.2371 10.9077 25.1327 10.7031 24.2506L5.65376 12.3673Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* User Name Label */}
      <div
        className="cursor-label"
        style={{
          backgroundColor: color,
        }}
      >
        <span className="cursor-name">{name}</span>
      </div>
    </div>
  );
};

export default Cursor;

/**
 * Alternative cursor icon variant - simple arrow style
 * Can be used instead of the default cursor for a cleaner look
 */
export const SimpleCursor: React.FC<CursorProps> = ({ cursor, scale = 1 }) => {
  const { name, position, color } = cursor;
  const inverseScale = 1 / scale;

  return (
    <div
      className="cursor-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `scale(${inverseScale})`,
      }}
    >
      {/* Simple Arrow SVG */}
      <svg
        className="cursor-icon"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 2L18 10L10 12L8 18L2 2Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* User Name Label */}
      <div
        className="cursor-label"
        style={{
          backgroundColor: color,
        }}
      >
        <span className="cursor-name">{name}</span>
      </div>
    </div>
  );
};
