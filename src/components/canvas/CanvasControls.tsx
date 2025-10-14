// CanvasControls component - UI controls for canvas navigation
import { useCanvas } from "../../hooks/useCanvas";
import { canvasHelpers } from "../../utils/canvasHelpers";
import { CANVAS_CONFIG } from "../../constants/canvas";
import "./CanvasControls.css";

export default function CanvasControls() {
  const { viewport, setViewport, resetViewport } = useCanvas();

  /**
   * Zoom in centered on current viewport
   */
  const handleZoomIn = () => {
    const newScale = canvasHelpers.calculateZoom(viewport.scale, 0.1);
    if (newScale !== viewport.scale) {
      setViewport({ ...viewport, scale: newScale });
    }
  };

  /**
   * Zoom out centered on current viewport
   */
  const handleZoomOut = () => {
    const newScale = canvasHelpers.calculateZoom(viewport.scale, -0.1);
    if (newScale !== viewport.scale) {
      setViewport({ ...viewport, scale: newScale });
    }
  };

  /**
   * Reset view to default (centered, 100% zoom)
   */
  const handleResetView = () => {
    resetViewport();
  };

  // Calculate zoom percentage
  const zoomPercentage = Math.round(viewport.scale * 100);

  return (
    <div className="canvas-controls">
      {/* Zoom Controls Group */}
      <div className="controls-group">
        {/* Zoom Out Button */}
        <button
          className="control-button"
          onClick={handleZoomOut}
          disabled={viewport.scale <= CANVAS_CONFIG.MIN_ZOOM}
          title="Zoom Out"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="8" cy="8" r="6" strokeWidth="1.5" />
            <path d="M13 13l5 5" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 8h6" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Zoom Percentage Display */}
        <div className="zoom-display" title="Current Zoom Level">
          {zoomPercentage}%
        </div>

        {/* Zoom In Button */}
        <button
          className="control-button"
          onClick={handleZoomIn}
          disabled={viewport.scale >= CANVAS_CONFIG.MAX_ZOOM}
          title="Zoom In"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="8" cy="8" r="6" strokeWidth="1.5" />
            <path d="M13 13l5 5" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 8h6" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 5v6" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Reset View Button (Icon Only) */}
      <button
        className="control-button reset-button"
        onClick={handleResetView}
        title="Reset View"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M4 10a6 6 0 0112 0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M16 10a6 6 0 01-12 0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M4 6v4h4" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 14v-4h-4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
