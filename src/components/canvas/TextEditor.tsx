import React, { useRef, useEffect, useState, useCallback } from "react";
import type { TextObject } from "../../types/canvas.types";
import { useCanvas } from "../../contexts/CanvasContext";
import { useSyncOperations } from "../../hooks/useRealtimeSync";
import { offlineQueue } from "../../utils/offlineQueue";
import { useAuth } from "../../hooks/useAuth";
import "./TextEditor.css";

interface TextEditorProps {
  object: TextObject;
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
  onFinishEditing: () => void;
}

/**
 * TextEditor Component
 * Renders an HTML textarea overlay positioned over the text object for editing
 */
function TextEditor({ object, viewport, onFinishEditing }: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(object.text || "");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { updateObject, isCanvasDisabled } = useCanvas();
  const syncOps = useSyncOperations();
  const { user } = useAuth();

  // Calculate position on canvas with viewport transform
  // Calculate position and dimensions with viewport scaling
  const canvasX = object.x * viewport.scale + viewport.x;
  const canvasY = object.y * viewport.scale + viewport.y;
  const scaledWidth = (object.width || 200) * viewport.scale;
  const scaledHeight = (object.height || 24) * viewport.scale;
  const scaledFontSize = (object.fontSize || 16) * viewport.scale;

  /**
   * Sync text changes to Firebase with 500ms debounce
   */
  const syncTextChange = useCallback(
    async (newText: string) => {
      if (isCanvasDisabled) {
        console.warn("🚫 Canvas is disabled - cannot update text");
        return;
      }

      const updates = {
        text: newText,
        timestamp: Date.now(),
      };

      const userName = user?.name || user?.email || "Unknown User";

      // Update local state immediately (optimistic update)
      updateObject(object.id, updates);

      // Sync to Firebase or queue if offline
      try {
        setIsSyncing(true);
        if (!navigator.onLine) {
          await offlineQueue.enqueue({
            id: `op-update-${Date.now()}`,
            type: "update",
            objectId: object.id,
            payload: {
              ...updates,
              lastEditedBy: user?.id,
              lastEditedByName: userName,
              lastEditedAt: Date.now(),
            },
            timestamp: Date.now(),
            retryCount: 0,
          });
          console.log("📦 Queued text update (offline)");
        } else {
          await syncOps.updateObject(object.id, updates, user?.id, userName);
        }
      } catch (error) {
        console.error("❌ Failed to sync text change:", error);
      } finally {
        setIsSyncing(false);
      }
    },
    [object.id, updateObject, syncOps, user, isCanvasDisabled]
  );

  /**
   * Handle text change with debouncing (500ms)
   */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    // Clear previous timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Set new timeout for sync (500ms debounce)
    syncTimeoutRef.current = setTimeout(() => {
      syncTextChange(newText);
    }, 500);
  };

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Escape to finish editing
    if (e.key === "Escape") {
      e.preventDefault();
      finishEditing();
    }

    // Prevent canvas shortcuts while editing
    e.stopPropagation();
  };

  /**
   * Handle click outside to finish editing
   */
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        finishEditing();
      }
    },
    [onFinishEditing]
  );

  /**
   * Finish editing - sync final changes and close editor
   */
  const finishEditing = useCallback(() => {
    // Clear any pending sync timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    // Perform final sync if text changed
    if (text !== object.text) {
      syncTextChange(text);
    }

    onFinishEditing();
  }, [text, object.text, syncTextChange, onFinishEditing]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Select all text for easy editing
      textareaRef.current.select();
    }
  }, []);

  // Add click outside listener
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Build font style string
  const fontWeight = object.fontWeight === "bold" ? "bold" : "normal";
  const fontStyle = object.fontStyle === "italic" ? "italic" : "normal";
  const fontFamily = object.fontFamily || "Arial";

  return (
    <div
      ref={containerRef}
      className="text-editor-container"
      style={{
        position: "absolute",
        left: `${canvasX}px`,
        top: `${canvasY}px`,
        width: `${scaledWidth}px`,
        minHeight: "24px",
        zIndex: 1000,
      }}
    >
      <textarea
        ref={textareaRef}
        className="text-editor-textarea"
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your text here..."
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          fontSize: `${scaledFontSize}px`,
          fontFamily: fontFamily,
          fontWeight: fontWeight,
          fontStyle: fontStyle,
          color: object.color || "#000000",
          textAlign: object.textAlign || "left",
          padding: "4px",
          border: "2px solid #0066FF",
          borderRadius: "2px",
          outline: "none",
          resize: "none",
          overflow: "hidden",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          lineHeight: "1.2",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = "auto";
          target.style.height = `${target.scrollHeight}px`;
        }}
      />

      {isSyncing && (
        <div className="text-editor-sync-indicator">
          <span>Syncing...</span>
        </div>
      )}
    </div>
  );
}

export default TextEditor;
