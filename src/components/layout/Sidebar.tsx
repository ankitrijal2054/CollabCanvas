// Sidebar component - shows online users and properties
import PresenceList from "../collaboration/PresenceList";
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
      {/* Top section: Online Users */}
      <div className="sidebar-section sidebar-online-users">
        <h3 className="sidebar-section-title">Online Users</h3>
        <div className="sidebar-section-content">
          <PresenceList />
        </div>
      </div>

      {/* Bottom section: Properties (when selection exists) */}
      <div className="sidebar-section sidebar-properties">
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
