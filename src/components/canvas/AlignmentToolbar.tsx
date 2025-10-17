// AlignmentToolbar - Alignment and distribution controls for multi-select
import { useCanvas } from "../../hooks/useCanvas";
import "./AlignmentToolbar.css";

/**
 * AlignmentToolbar Component
 * Displays alignment and distribution buttons when 2+ objects are selected
 */
export function AlignmentToolbar() {
  const {
    selectedIds,
    alignSelectedLeft,
    alignSelectedRight,
    alignSelectedTop,
    alignSelectedBottom,
    alignSelectedHorizontalCenter,
    alignSelectedVerticalMiddle,
    distributeSelectedHorizontal,
    distributeSelectedVertical,
  } = useCanvas();

  // Only show toolbar when 2+ objects are selected
  const showAlignmentTools = selectedIds.length >= 2;
  const showDistributionTools = selectedIds.length >= 3;

  if (!showAlignmentTools) {
    return null;
  }

  return (
    <div className="alignment-toolbar">
      <div className="alignment-group">
        <span className="alignment-label">Align:</span>

        {/* Align Left */}
        <button
          className="alignment-button"
          onClick={alignSelectedLeft}
          title="Align Left (Cmd/Ctrl+Shift+L)"
          aria-label="Align left"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="3" width="2" height="14" fill="currentColor" />
            <rect x="6" y="4" width="8" height="3" fill="currentColor" />
            <rect x="6" y="9" width="12" height="3" fill="currentColor" />
            <rect x="6" y="14" width="6" height="3" fill="currentColor" />
          </svg>
        </button>

        {/* Align Horizontal Center */}
        <button
          className="alignment-button"
          onClick={alignSelectedHorizontalCenter}
          title="Align Horizontal Center (Cmd/Ctrl+Shift+H)"
          aria-label="Align horizontal center"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="9" y="2" width="2" height="16" fill="currentColor" />
            <rect x="6" y="4" width="8" height="3" fill="currentColor" />
            <rect x="4" y="9" width="12" height="3" fill="currentColor" />
            <rect x="7" y="14" width="6" height="3" fill="currentColor" />
          </svg>
        </button>

        {/* Align Right */}
        <button
          className="alignment-button"
          onClick={alignSelectedRight}
          title="Align Right (Cmd/Ctrl+Shift+R)"
          aria-label="Align right"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="16" y="3" width="2" height="14" fill="currentColor" />
            <rect x="6" y="4" width="8" height="3" fill="currentColor" />
            <rect x="2" y="9" width="12" height="3" fill="currentColor" />
            <rect x="8" y="14" width="6" height="3" fill="currentColor" />
          </svg>
        </button>

        <div className="alignment-divider" />

        {/* Align Top */}
        <button
          className="alignment-button"
          onClick={alignSelectedTop}
          title="Align Top (Cmd/Ctrl+Shift+T)"
          aria-label="Align top"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="2" width="14" height="2" fill="currentColor" />
            <rect x="4" y="6" width="3" height="8" fill="currentColor" />
            <rect x="9" y="6" width="3" height="12" fill="currentColor" />
            <rect x="14" y="6" width="3" height="6" fill="currentColor" />
          </svg>
        </button>

        {/* Align Vertical Middle */}
        <button
          className="alignment-button"
          onClick={alignSelectedVerticalMiddle}
          title="Align Vertical Middle (Cmd/Ctrl+Shift+V)"
          aria-label="Align vertical middle"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="9" width="16" height="2" fill="currentColor" />
            <rect x="4" y="6" width="3" height="8" fill="currentColor" />
            <rect x="9" y="4" width="3" height="12" fill="currentColor" />
            <rect x="14" y="7" width="3" height="6" fill="currentColor" />
          </svg>
        </button>

        {/* Align Bottom */}
        <button
          className="alignment-button"
          onClick={alignSelectedBottom}
          title="Align Bottom (Cmd/Ctrl+Shift+B)"
          aria-label="Align bottom"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="16" width="14" height="2" fill="currentColor" />
            <rect x="4" y="6" width="3" height="8" fill="currentColor" />
            <rect x="9" y="2" width="3" height="12" fill="currentColor" />
            <rect x="14" y="8" width="3" height="6" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Distribution tools (only show when 3+ objects selected) */}
      {showDistributionTools && (
        <>
          <div className="alignment-divider" />
          <div className="alignment-group">
            <span className="alignment-label">Distribute:</span>

            {/* Distribute Horizontal */}
            <button
              className="alignment-button"
              onClick={distributeSelectedHorizontal}
              title="Distribute Horizontally"
              aria-label="Distribute horizontally"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="7" width="3" height="6" fill="currentColor" />
                <rect x="8.5" y="7" width="3" height="6" fill="currentColor" />
                <rect x="15" y="7" width="3" height="6" fill="currentColor" />
                <path
                  d="M1 10L4 10M16 10L19 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Distribute Vertical */}
            <button
              className="alignment-button"
              onClick={distributeSelectedVertical}
              title="Distribute Vertically"
              aria-label="Distribute vertically"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="7" y="2" width="6" height="3" fill="currentColor" />
                <rect x="7" y="8.5" width="6" height="3" fill="currentColor" />
                <rect x="7" y="15" width="6" height="3" fill="currentColor" />
                <path
                  d="M10 1L10 4M10 16L10 19"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
