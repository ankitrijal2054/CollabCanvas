// Sidebar component - shows properties panel (full height)
import { StrokeProperties } from "../canvas/StrokeProperties";
import { FontProperties } from "../canvas/FontProperties";
import "./Sidebar.css";

interface SidebarProps {
  hasSelection?: boolean;
  selectedObjectType?: string;
}

export default function Sidebar({
  hasSelection,
  selectedObjectType,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Properties section - full height */}
      <div className="sidebar-section sidebar-properties-full">
        <h3 className="sidebar-section-title">Properties</h3>
        <div className="sidebar-section-content">
          {hasSelection ? (
            <>
              {selectedObjectType === "text" ? (
                <FontProperties />
              ) : (
                <StrokeProperties />
              )}
            </>
          ) : (
            <div className="sidebar-empty-state">
              <p>Select an object to view properties</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
