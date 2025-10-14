// CanvasToolbar component - Top toolbar for canvas object operations
import { useCanvas } from "../../hooks/useCanvas";
import "./CanvasToolbar.css";

export default function CanvasToolbar() {
  const { createRectangle, selectedObjectId, deleteObject } = useCanvas();

  /**
   * Delete the selected object
   */
  const handleDelete = () => {
    if (selectedObjectId) {
      deleteObject(selectedObjectId);
    }
  };

  return (
    <div className="canvas-toolbar">
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

      {/* Delete Button */}
      <button
        className="toolbar-button toolbar-button-danger"
        onClick={handleDelete}
        disabled={!selectedObjectId}
        title={
          selectedObjectId
            ? "Delete Selected (Delete)"
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
