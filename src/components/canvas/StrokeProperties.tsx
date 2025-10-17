import React, { useState, useEffect, useCallback, useRef } from "react";
import { useCanvas } from "../../contexts/CanvasContext";
import { useSyncOperations } from "../../hooks/useRealtimeSync";
import { useAuth } from "../../hooks/useAuth";
import { offlineQueue } from "../../utils/offlineQueue";
import {
  BLEND_MODES,
  DEFAULT_OPACITY,
  DEFAULT_BLEND_MODE,
} from "../../constants/canvas";
import type { BlendMode } from "../../types/canvas.types";
import "./StrokeProperties.css";

/**
 * StrokeProperties Component
 * Floating panel for editing stroke and fill properties of the selected object
 */
export const StrokeProperties: React.FC = () => {
  const { objects, selectedIds, updateObject, isCanvasDisabled } = useCanvas();
  const syncOps = useSyncOperations();
  const { user } = useAuth();

  // Get the first selected object (properties panel only shows for single selection)
  const selectedObject = objects.find((obj) => obj.id === selectedIds[0]);

  // Local state for real-time UI updates (before debounced sync)
  const [fillColor, setFillColor] = useState(
    selectedObject?.color || "#3B82F6"
  );
  const [strokeColor, setStrokeColor] = useState(
    selectedObject?.stroke || "#000000"
  );
  const [strokeWidth, setStrokeWidth] = useState(
    selectedObject?.strokeWidth || 0
  );
  const [opacity, setOpacity] = useState(
    selectedObject?.opacity ?? DEFAULT_OPACITY
  );
  const [blendMode, setBlendMode] = useState<BlendMode>(
    selectedObject?.blendMode ?? DEFAULT_BLEND_MODE
  );

  // Refs for debouncing
  const debounceTimerRef = useRef<number | null>(null);

  // Update local state when selection changes
  useEffect(() => {
    if (selectedObject) {
      setFillColor(selectedObject.color);
      setStrokeColor(selectedObject.stroke || "#000000");
      setStrokeWidth(selectedObject.strokeWidth || 0);
      setOpacity(selectedObject.opacity ?? DEFAULT_OPACITY);
      setBlendMode(selectedObject.blendMode ?? DEFAULT_BLEND_MODE);
    }
  }, [selectedObject?.id]); // Only run when selection changes

  /**
   * Debounced sync function to update Firebase
   */
  const syncChanges = useCallback(
    async (updates: {
      color?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      blendMode?: BlendMode;
    }) => {
      if (!selectedObject || isCanvasDisabled) return;

      const userName = user?.name || user?.email || "Unknown User";
      const payload = {
        ...updates,
        timestamp: Date.now(),
      };

      // Update local state immediately (optimistic update)
      updateObject(selectedObject.id, payload);

      // Sync to Firebase or queue if offline
      try {
        if (!navigator.onLine) {
          await offlineQueue.enqueue({
            id: `op-update-${Date.now()}`,
            type: "update",
            objectId: selectedObject.id,
            payload,
            timestamp: Date.now(),
            retryCount: 0,
          });
        } else {
          await syncOps.updateObject(
            selectedObject.id,
            payload,
            user?.id,
            userName
          );
        }
      } catch (error) {
        console.error("❌ Failed to sync property changes:", error);
      }
    },
    [selectedObject, isCanvasDisabled, updateObject, syncOps, user]
  );

  /**
   * Debounce helper - delays sync by 300ms after last change
   */
  const debouncedSync = useCallback(
    (updates: {
      color?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      blendMode?: BlendMode;
    }) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = window.setTimeout(() => {
        syncChanges(updates);
      }, 300);
    },
    [syncChanges]
  );

  /**
   * Handle fill color change
   */
  const handleFillColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setFillColor(newColor);
    debouncedSync({ color: newColor });
  };

  /**
   * Handle stroke color change
   */
  const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setStrokeColor(newColor);
    debouncedSync({ stroke: newColor });
  };

  /**
   * Handle stroke width change
   */
  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value, 10);
    setStrokeWidth(newWidth);
    debouncedSync({ strokeWidth: newWidth });
  };

  /**
   * Handle opacity change
   */
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value) / 100; // Convert 0-100 to 0-1
    setOpacity(newOpacity);
    debouncedSync({ opacity: newOpacity });
  };

  /**
   * Handle blend mode change
   */
  const handleBlendModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBlendMode = e.target.value as BlendMode;
    setBlendMode(newBlendMode);
    // No debounce for dropdown - sync immediately
    syncChanges({ blendMode: newBlendMode });
  };

  /**
   * Clear debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Don't render if no object is selected
  if (!selectedObject) {
    return null;
  }

  // Check if selected object is a line (lines don't have fill)
  const isLine = selectedObject.type === "line";

  return (
    <div className="stroke-properties">
      <div className="stroke-properties-header">
        <h3>Properties</h3>
      </div>

      <div className="stroke-properties-content">
        {/* Fill Color - hide for lines */}
        {!isLine && (
          <div className="property-group">
            <label htmlFor="fill-color">Fill</label>
            <div className="color-input-group">
              <input
                id="fill-color"
                type="color"
                value={fillColor}
                onChange={handleFillColorChange}
                disabled={isCanvasDisabled}
                className="color-picker"
              />
              <input
                type="text"
                value={fillColor.toUpperCase()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                    setFillColor(value);
                    if (value.length === 7) {
                      debouncedSync({ color: value });
                    }
                  }
                }}
                disabled={isCanvasDisabled}
                className="color-hex-input"
                maxLength={7}
                placeholder="#000000"
              />
            </div>
          </div>
        )}

        {/* Stroke Color (or just "Color" for lines) */}
        <div className="property-group">
          <label htmlFor="stroke-color">{isLine ? "Color" : "Stroke"}</label>
          <div className="color-input-group">
            <input
              id="stroke-color"
              type="color"
              value={strokeColor}
              onChange={handleStrokeColorChange}
              disabled={isCanvasDisabled}
              className="color-picker"
            />
            <input
              type="text"
              value={strokeColor.toUpperCase()}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                  setStrokeColor(value);
                  if (value.length === 7) {
                    debouncedSync({ stroke: value });
                  }
                }
              }}
              disabled={isCanvasDisabled}
              className="color-hex-input"
              maxLength={7}
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Stroke Width (or "Thickness" for lines) */}
        <div className="property-group">
          <label htmlFor="stroke-width">
            {isLine ? "Thickness" : "Stroke Width"}
            <span className="property-value">{strokeWidth}px</span>
          </label>
          <input
            id="stroke-width"
            type="range"
            min="0"
            max="20"
            value={strokeWidth}
            onChange={handleStrokeWidthChange}
            disabled={isCanvasDisabled}
            className="stroke-width-slider"
          />
        </div>

        {/* Separator */}
        <div className="property-separator" />

        {/* Opacity Slider */}
        <div className="property-group">
          <label htmlFor="opacity">
            Opacity
            <span className="property-value">{Math.round(opacity * 100)}%</span>
          </label>
          <input
            id="opacity"
            type="range"
            min="0"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={handleOpacityChange}
            disabled={isCanvasDisabled}
            className="opacity-slider"
          />
        </div>

        {/* Blend Mode Dropdown */}
        <div className="property-group">
          <label htmlFor="blend-mode">Blend Mode</label>
          <select
            id="blend-mode"
            value={blendMode}
            onChange={handleBlendModeChange}
            disabled={isCanvasDisabled}
            className="blend-mode-select"
          >
            {BLEND_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
