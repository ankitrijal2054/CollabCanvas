// ShortcutHelp - Modal displaying all keyboard shortcuts
import { useEffect } from "react";
import { getKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import "./ShortcutHelp.css";

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ShortcutHelp Modal Component
 * Displays a comprehensive list of all keyboard shortcuts
 * Grouped by category for easy reference
 */
export default function ShortcutHelp({ isOpen, onClose }: ShortcutHelpProps) {
  // Get all shortcuts from the utility function
  const shortcuts = getKeyboardShortcuts();

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="shortcut-help-backdrop" onClick={handleBackdropClick}>
      <div className="shortcut-help-modal">
        <div className="shortcut-help-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            className="shortcut-help-close"
            onClick={onClose}
            aria-label="Close shortcuts help"
          >
            ×
          </button>
        </div>

        <div className="shortcut-help-content">
          {Object.entries(groupedShortcuts).map(
            ([category, categoryShortcuts]) => (
              <div key={category} className="shortcut-category">
                <h3 className="shortcut-category-title">{category}</h3>
                <div className="shortcut-list">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="shortcut-item">
                      <kbd className="shortcut-keys">{shortcut.keys}</kbd>
                      <span className="shortcut-description">
                        {shortcut.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        <div className="shortcut-help-footer">
          <p className="shortcut-help-tip">
            💡 <strong>Tip:</strong> Press <kbd>?</kbd> anytime to view this
            help menu
          </p>
        </div>
      </div>
    </div>
  );
}
