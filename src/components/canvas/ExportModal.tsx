// ExportModal - Modal for exporting canvas
import { useState } from "react";
import { useCanvas } from "../../hooks/useCanvas";
import type { ExportOptions } from "../../utils/exportHelpers";
import "./ExportModal.css";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const { selectedIds, objects } = useCanvas();
  const [format, setFormat] = useState<"png" | "svg">("png");
  const [scope, setScope] = useState<"all" | "selection">("all");
  const [isExporting, setIsExporting] = useState(false);

  // Auto-select "all" if nothing is selected
  const hasSelection = selectedIds.length > 0;
  const effectiveScope = hasSelection ? scope : "all";

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const selectedObjects =
        effectiveScope === "selection"
          ? objects.filter((obj) => selectedIds.includes(obj.id))
          : undefined;

      await onExport({
        format,
        scope: effectiveScope,
        selectedObjects,
        pixelRatio: 2, // 2x for high DPI
      });

      // Close modal after successful export
      setTimeout(() => {
        onClose();
        setIsExporting(false);
      }, 500);
    } catch (error) {
      console.error("Export failed:", error);
      setIsExporting(false);
      alert("Export failed. Please try again.");
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Generate preview filename
  const getPreviewFilename = () => {
    const timestamp = new Date().toLocaleString();
    return `collabcanvas-${timestamp}.${format}`;
  };

  return (
    <div className="export-modal-backdrop" onClick={handleBackdropClick}>
      <div className="export-modal">
        {/* Header */}
        <div className="export-modal-header">
          <h2>Export Canvas</h2>
          <button
            className="export-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                d="M6 6L14 14M14 6L6 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="export-modal-content">
          {/* Scope Selection */}
          <div className="export-option-group">
            <label className="export-option-label">Export Scope</label>
            <div className="export-radio-group">
              <div
                className={`export-option-btn ${
                  effectiveScope === "all" ? "selected" : ""
                }`}
                onClick={() => setScope("all")}
              >
                <strong>Entire Canvas</strong>
                <span>Export all objects ({objects.length})</span>
              </div>

              <div
                className={`export-option-btn ${
                  effectiveScope === "selection" ? "selected" : ""
                } ${!hasSelection ? "disabled" : ""}`}
                onClick={() => hasSelection && setScope("selection")}
              >
                <strong>Selected Objects Only</strong>
                <span>
                  {hasSelection
                    ? `Export ${selectedIds.length} selected object${
                        selectedIds.length !== 1 ? "s" : ""
                      }`
                    : "No objects selected"}
                </span>
              </div>
            </div>
          </div>
          {/* Format Selection */}
          <div className="export-option-group">
            <label className="export-option-label">Format</label>
            <div className="export-radio-group">
              <div
                className={`export-option-btn ${
                  format === "png" ? "selected" : ""
                }`}
                onClick={() => setFormat("png")}
              >
                <strong>PNG</strong>
                <span>High-resolution raster (2x DPI)</span>
              </div>
              <div
                className={`export-option-btn ${
                  format === "svg" ? "selected" : ""
                }`}
                onClick={() => setFormat("svg")}
              >
                <strong>SVG</strong>
                <span>Scalable vector graphics</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="export-preview">
            <div className="export-preview-label">File preview:</div>
            <div className="export-preview-filename">
              {getPreviewFilename()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="export-modal-footer">
          <button className="export-btn export-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="export-btn export-btn-primary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="export-spinner"></span>
                Exporting...
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M8 2v10M4 8l4 4 4-4M2 14h12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Download
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
