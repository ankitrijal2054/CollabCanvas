import React from "react";
import "./ContextMenu.css";

interface ContextMenuOption {
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
}

/**
 * ContextMenu
 *
 * Displays a right-click context menu with keyboard shortcuts
 * Positioned at the mouse cursor location
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  options,
  onClose,
}) => {
  React.useEffect(() => {
    // Close menu on click outside or escape
    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x, y });

  React.useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // Adjust if menu goes off right edge
      if (x + menuRect.width > viewportWidth) {
        adjustedX = viewportWidth - menuRect.width - 10;
      }

      // Adjust if menu goes off bottom edge
      if (y + menuRect.height > viewportHeight) {
        adjustedY = viewportHeight - menuRect.height - 10;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  const handleOptionClick = (option: ContextMenuOption) => {
    if (!option.disabled && !option.separator) {
      option.action();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {options.map((option, index) =>
        option.separator ? (
          <div key={index} className="context-menu-separator" />
        ) : (
          <div
            key={index}
            className={`context-menu-option ${
              option.disabled ? "disabled" : ""
            }`}
            onClick={() => handleOptionClick(option)}
          >
            <span className="context-menu-label">{option.label}</span>
            {option.shortcut && (
              <span className="context-menu-shortcut">{option.shortcut}</span>
            )}
          </div>
        )
      )}
    </div>
  );
};
