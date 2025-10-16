// CanvasToolbar component - Top toolbar for canvas object operations
import { useCanvas } from "../../hooks/useCanvas";
import "./CanvasToolbar.css";

interface CanvasToolbarProps {
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
}

export default function CanvasToolbar({
  isSelectionMode,
  onToggleSelectionMode,
}: CanvasToolbarProps) {
  const {
    createRectangle,
    createCircle,
    createStar,
    createLine,
    createText,
    selectedIds,
    deleteObject,
  } = useCanvas();

  /**
   * Delete the selected object(s)
   */
  const handleDelete = () => {
    if (selectedIds.length > 0) {
      selectedIds.forEach((id) => deleteObject(id));
    }
  };

  return (
    <div className="canvas-toolbar">
      {/* Selection Mode Toggle Button */}
      <button
        className={`toolbar-button ${
          isSelectionMode ? "toolbar-button-active" : ""
        }`}
        onClick={onToggleSelectionMode}
        title={
          isSelectionMode
            ? "Selection Mode (Active) - Drag to select multiple objects"
            : "Selection Mode (Inactive) - Click to enable drag-to-select"
        }
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {/* Mouse cursor with selection box */}
          <path d="M 3 3 L 3 14 L 7 10 L 9 14 L 11 13 L 9 9 L 13 9 Z" />
          <rect x="11" y="2" width="7" height="7" strokeDasharray="2 1" />
        </svg>
        <span>Select</span>
      </button>

      {/* Divider */}
      <div className="toolbar-divider"></div>

      {/* Add Rectangle Button */}
      <button
        className="toolbar-button toolbar-button-primary"
        onClick={createRectangle}
        title="Add Rectangle (R)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <rect x="3" y="3" width="14" height="14" strokeWidth="1.5" rx="1" />
          <path d="M10 6v8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 10h8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>Rectangle</span>
      </button>

      {/* Add Circle Button */}
      <button
        className="toolbar-button toolbar-button-primary"
        onClick={createCircle}
        title="Add Circle (C)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="10" cy="10" r="7" strokeWidth="1.5" />
          <path d="M10 7v6" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 10h6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>Circle</span>
      </button>

      {/* Add Star Button */}
      <button
        className="toolbar-button toolbar-button-primary"
        onClick={createStar}
        title="Add Star (S)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M10 2l2.5 5.5L18 8.5l-4.5 4 1 6-4.5-2.5L5.5 18.5l1-6-4.5-4 5.5-1L10 2z"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Star</span>
      </button>

      {/* Add Line Button */}
      <button
        className="toolbar-button toolbar-button-primary"
        onClick={createLine}
        title="Add Line (L)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path d="M3 17l14-14" strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M17 3l-2 2M5 15l-2 2"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span>Line</span>
      </button>

      {/* Add Text Button */}
      <button
        className="toolbar-button toolbar-button-primary"
        onClick={createText}
        title="Add Text (T)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M4 4h12M10 4v12"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 16h6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Text</span>
      </button>

      {/* Divider */}
      <div className="toolbar-divider"></div>

      {/* Delete Button */}
      <button
        className="toolbar-button toolbar-button-danger"
        onClick={handleDelete}
        disabled={selectedIds.length === 0}
        title={
          selectedIds.length > 0
            ? `Delete Selected (${selectedIds.length} object${
                selectedIds.length > 1 ? "s" : ""
              })`
            : "Select an object to delete"
        }
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path d="M3 5h14" strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M8 5V3h4v2"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M8 9v6" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 9v6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>Delete</span>
      </button>
    </div>
  );
}
