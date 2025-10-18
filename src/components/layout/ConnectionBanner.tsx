/**
 * Connection Banner Component
 *
 * Displays connection status when offline/reconnecting/syncing.
 * - Only appears when NOT online (no banner when connected)
 * - Shows queued operation count
 * - Provides manual retry button
 * - Auto-dismisses after successful reconnection
 */

import React, { useEffect, useState } from "react";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import "./ConnectionBanner.css";

export const ConnectionBanner: React.FC = () => {
  const { state, isOnline, queuedOperationsCount, retryConnection } =
    useConnectionStatus();

  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Show/hide banner based on connection state
  useEffect(() => {
    if (!isOnline) {
      // Show banner when offline/reconnecting/syncing
      setIsVisible(true);
      setIsAnimatingOut(false);
    } else {
      // Hide banner when online
      // Add small delay for smooth transition
      setIsAnimatingOut(true);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
      }, 300); // Match CSS transition duration

      return () => clearTimeout(timeout);
    }
  }, [isOnline]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  /**
   * Get banner content based on connection state
   */
  const getBannerContent = () => {
    switch (state) {
      case "offline":
        return {
          icon: (
            <svg
              className="connection-banner-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          ),
          message:
            queuedOperationsCount > 0
              ? `Offline • ${queuedOperationsCount} queued`
              : "Offline",
          className: "connection-banner-offline",
          showRetry: false,
        };

      case "reconnecting":
        return {
          icon: (
            <svg
              className="connection-banner-icon connection-banner-spinner"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          ),
          message: "Reconnecting...",
          className: "connection-banner-reconnecting",
          showRetry: true,
        };

      case "syncing":
        return {
          icon: (
            <svg
              className="connection-banner-icon connection-banner-spinner"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          ),
          message: `Syncing ${queuedOperationsCount}...`,
          className: "connection-banner-syncing",
          showRetry: false,
        };

      case "timeout":
        return {
          icon: (
            <svg
              className="connection-banner-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          message: "Offline too long",
          className: "connection-banner-timeout",
          showRetry: true,
        };

      default:
        return null;
    }
  };

  const content = getBannerContent();

  if (!content) {
    return null;
  }

  return (
    <div
      className={`connection-banner ${content.className} ${
        isAnimatingOut ? "connection-banner-hide" : ""
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="connection-banner-content">
        {content.icon}
        <span className="connection-banner-message">{content.message}</span>
        {content.showRetry && (
          <button
            className="connection-banner-retry"
            onClick={retryConnection}
            aria-label="Retry connection"
          >
            Retry Now
          </button>
        )}
      </div>
    </div>
  );
};
