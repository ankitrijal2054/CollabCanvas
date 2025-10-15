import React from "react";
import "./EditAttributionTooltip.css";

interface EditAttributionTooltipProps {
  /** User name who last edited */
  userName?: string;
  /** Timestamp of last edit (milliseconds) */
  editedAt?: number;
  /** Mouse position for tooltip placement */
  position: { x: number; y: number };
  /** Whether tooltip is visible */
  visible: boolean;
}

/**
 * Calculate relative time string (e.g., "5 minutes ago", "2 hours ago")
 */
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  // Less than 1 minute
  if (diff < 60 * 1000) {
    return "just now";
  }

  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  // Less than 1 day
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  // Less than 1 week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  // Less than 1 month
  if (diff < 30 * 24 * 60 * 60 * 1000) {
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }

  // More than 1 month
  const months = Math.floor(diff / (30 * 24 * 60 * 60 * 1000));
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}

/**
 * EditAttributionTooltip
 *
 * Displays who last edited an object and when, shown on hover.
 * Positioned near the cursor with smooth fade in/out animation.
 */
export const EditAttributionTooltip: React.FC<EditAttributionTooltipProps> = ({
  userName,
  editedAt,
  position,
  visible,
}) => {
  // Don't render if no attribution data
  if (!userName || !editedAt) {
    return null;
  }

  const relativeTime = getRelativeTime(editedAt);
  const displayName = userName || "Unknown User";

  return (
    <div
      className={`edit-attribution-tooltip ${visible ? "visible" : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="tooltip-content">
        Last edited by <strong>{displayName}</strong>, {relativeTime}
      </div>
    </div>
  );
};
