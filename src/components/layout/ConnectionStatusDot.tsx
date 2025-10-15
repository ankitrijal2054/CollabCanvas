/**
 * Connection Status Dot Component
 *
 * Simple green dot indicator that shows connection status.
 * - Always visible when online (unobtrusive)
 * - Positioned in header near username
 * - Pulses when syncing for visual feedback
 */

import React from "react";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import "./ConnectionStatusDot.css";

export const ConnectionStatusDot: React.FC = () => {
  const { isOnline, isSyncing } = useConnectionStatus();

  return (
    <div className="connection-status-dot-container" title="Connection status">
      <div
        className={`connection-status-dot ${
          isOnline
            ? "connection-status-dot-online"
            : "connection-status-dot-offline"
        } ${isSyncing ? "connection-status-dot-syncing" : ""}`}
        role="status"
        aria-label={isOnline ? "Connected" : "Disconnected"}
      />
      <span className="sr-only">{isOnline ? "Connected" : "Disconnected"}</span>
    </div>
  );
};
