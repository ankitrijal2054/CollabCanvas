// Sidebar component - shows presence and future panels
import PresenceList from "../collaboration/PresenceList";
import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <PresenceList />
      </div>
    </aside>
  );
}
