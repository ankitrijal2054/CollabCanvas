// Bottom bar component - spans full width with help button
import React from "react";
import "./BottomBar.css";

interface BottomBarProps {
  onHelpClick?: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({ onHelpClick }) => {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-left">
        {/* Reserved for future "Add Canvas" functionality */}
      </div>
      <div className="bottom-bar-right">
        <button
          onClick={onHelpClick}
          className="help-button"
          title="Keyboard shortcuts (Press ? for help)"
          aria-label="Show keyboard shortcuts"
        >
          <span className="help-icon">?</span>
          <span className="help-text">Help</span>
        </button>
      </div>
    </div>
  );
};
