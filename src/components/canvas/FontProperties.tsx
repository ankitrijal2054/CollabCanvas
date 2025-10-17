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
import type { TextObject, BlendMode } from "../../types/canvas.types";
import "./FontProperties.css";

/**
 * FontProperties Component
 * Floating panel for editing font properties of the selected text object
 */
export const FontProperties: React.FC = () => {
  const { objects, selectedIds, updateObject, isCanvasDisabled } = useCanvas();
  const syncOps = useSyncOperations();
  const { user } = useAuth();

  // Get the first selected object (properties panel only shows for single selection)
  const selectedObject = objects.find((obj) => obj.id === selectedIds[0]);

  // Only show for text objects
  const isTextObject = selectedObject?.type === "text";
  const textObject = isTextObject ? (selectedObject as TextObject) : null;

  // Local state for real-time UI updates (before debounced sync)
  const [fontFamily, setFontFamily] = useState(
    textObject?.fontFamily || "Arial"
  );
  const [fontSize, setFontSize] = useState(textObject?.fontSize || 16);
  const [fontWeight, setFontWeight] = useState(
    textObject?.fontWeight || "normal"
  );
  const [fontStyle, setFontStyle] = useState(textObject?.fontStyle || "normal");
  const [textAlign, setTextAlign] = useState(textObject?.textAlign || "left");
  const [textColor, setTextColor] = useState(textObject?.color || "#000000");
  const [opacity, setOpacity] = useState(
    textObject?.opacity ?? DEFAULT_OPACITY
  );
  const [blendMode, setBlendMode] = useState<BlendMode>(
    textObject?.blendMode ?? DEFAULT_BLEND_MODE
  );

  // Refs for debouncing
  const debounceTimerRef = useRef<number | null>(null);

  // Update local state when selection changes
  useEffect(() => {
    if (textObject) {
      setFontFamily(textObject.fontFamily || "Arial");
      setFontSize(textObject.fontSize || 16);
      setFontWeight(textObject.fontWeight || "normal");
      setFontStyle(textObject.fontStyle || "normal");
      setTextAlign(textObject.textAlign || "left");
      setTextColor(textObject.color || "#000000");
      setOpacity(textObject.opacity ?? DEFAULT_OPACITY);
      setBlendMode(textObject.blendMode ?? DEFAULT_BLEND_MODE);
    }
  }, [textObject?.id]); // Only run when selection changes

  /**
   * Debounced sync function to update Firebase
   */
  const syncChanges = useCallback(
    async (updates: Partial<TextObject>) => {
      if (!textObject || isCanvasDisabled) return;

      const userName = user?.name || user?.email || "Unknown User";
      const payload = {
        ...updates,
        timestamp: Date.now(),
      };

      // Update local state immediately (optimistic update)
      updateObject(textObject.id, payload);

      // Sync to Firebase or queue if offline
      try {
        if (!navigator.onLine) {
          await offlineQueue.enqueue({
            id: `op-update-${Date.now()}`,
            type: "update",
            objectId: textObject.id,
            payload,
            timestamp: Date.now(),
            retryCount: 0,
          });
        } else {
          await syncOps.updateObject(
            textObject.id,
            payload,
            user?.id,
            userName
          );
        }
      } catch (error) {
        console.error("❌ Failed to sync font property changes:", error);
      }
    },
    [textObject, isCanvasDisabled, updateObject, syncOps, user]
  );

  /**
   * Debounce helper - delays sync by 300ms after last change
   */
  const debouncedSync = useCallback(
    (updates: Partial<TextObject>) => {
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
   * Handle font family change
   */
  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFont = e.target.value;
    setFontFamily(newFont);
    debouncedSync({ fontFamily: newFont });
  };

  /**
   * Handle font size change
   */
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value, 10);
    if (newSize >= 8 && newSize <= 120) {
      setFontSize(newSize);
      debouncedSync({ fontSize: newSize });
    }
  };

  /**
   * Handle bold toggle
   */
  const handleBoldToggle = () => {
    const newWeight = fontWeight === "bold" ? "normal" : "bold";
    setFontWeight(newWeight);
    syncChanges({ fontWeight: newWeight }); // Instant sync for toggles
  };

  /**
   * Handle italic toggle
   */
  const handleItalicToggle = () => {
    const newStyle = fontStyle === "italic" ? "normal" : "italic";
    setFontStyle(newStyle);
    syncChanges({ fontStyle: newStyle }); // Instant sync for toggles
  };

  /**
   * Handle text align change
   */
  const handleTextAlignChange = (align: "left" | "center" | "right") => {
    setTextAlign(align);
    syncChanges({ textAlign: align }); // Instant sync for alignment
  };

  /**
   * Handle text color change
   */
  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setTextColor(newColor);
    debouncedSync({ color: newColor });
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

  // Don't render if no text object is selected
  if (!textObject) {
    return null;
  }

  return (
    <div className="font-properties">
      <div className="font-properties-header">
        <h3>Text Properties</h3>
      </div>

      <div className="font-properties-content">
        {/* Font Family Dropdown */}
        <div className="property-group">
          <label htmlFor="font-family">Font</label>
          <select
            id="font-family"
            value={fontFamily}
            onChange={handleFontFamilyChange}
            disabled={isCanvasDisabled}
            className="font-family-select"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
          </select>
        </div>

        {/* Font Size Input */}
        <div className="property-group">
          <label htmlFor="font-size">
            Font Size
            <span className="property-value">{fontSize}px</span>
          </label>
          <div className="font-size-input-group">
            <input
              id="font-size"
              type="range"
              min="8"
              max="120"
              value={fontSize}
              onChange={handleFontSizeChange}
              disabled={isCanvasDisabled}
              className="font-size-slider"
            />
            <input
              type="number"
              min="8"
              max="120"
              value={fontSize}
              onChange={handleFontSizeChange}
              disabled={isCanvasDisabled}
              className="font-size-number-input"
            />
          </div>
        </div>

        {/* Bold and Italic Toggles */}
        <div className="property-group">
          <label>Style</label>
          <div className="font-style-buttons">
            <button
              type="button"
              onClick={handleBoldToggle}
              disabled={isCanvasDisabled}
              className={`font-style-button ${
                fontWeight === "bold" ? "active" : ""
              }`}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={handleItalicToggle}
              disabled={isCanvasDisabled}
              className={`font-style-button ${
                fontStyle === "italic" ? "active" : ""
              }`}
              title="Italic"
            >
              <em>I</em>
            </button>
          </div>
        </div>

        {/* Text Align Buttons */}
        <div className="property-group">
          <label>Alignment</label>
          <div className="text-align-buttons">
            <button
              type="button"
              onClick={() => handleTextAlignChange("left")}
              disabled={isCanvasDisabled}
              className={`text-align-button ${
                textAlign === "left" ? "active" : ""
              }`}
              title="Align Left"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 3h12v2H2V3zm0 4h8v2H2V7zm0 4h12v2H2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleTextAlignChange("center")}
              disabled={isCanvasDisabled}
              className={`text-align-button ${
                textAlign === "center" ? "active" : ""
              }`}
              title="Align Center"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 3h12v2H2V3zm2 4h8v2H4V7zm-2 4h12v2H2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleTextAlignChange("right")}
              disabled={isCanvasDisabled}
              className={`text-align-button ${
                textAlign === "right" ? "active" : ""
              }`}
              title="Align Right"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 3h12v2H2V3zm4 4h8v2H6V7zm-4 4h12v2H2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Text Color Picker */}
        <div className="property-group">
          <label htmlFor="text-color">Color</label>
          <div className="color-input-group">
            <input
              id="text-color"
              type="color"
              value={textColor}
              onChange={handleTextColorChange}
              disabled={isCanvasDisabled}
              className="color-picker"
            />
            <input
              type="text"
              value={textColor.toUpperCase()}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                  setTextColor(value);
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
