// OnlineUsersDropdown component - Header button showing online users count with hover dropdown
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import type { OnlineUser } from "../../types/collaboration.types";
import "./OnlineUsersDropdown.css";

export function OnlineUsersDropdown() {
  const { user } = useAuth();
  const { onlineUsers, isInitialized } = usePresence(
    user?.id ?? null,
    user?.name ?? user?.email ?? null
  );

  const count = onlineUsers.length;

  return (
    <div className="online-users-dropdown">
      <button className="online-users-button" type="button">
        <span className="online-users-icon" aria-hidden="true">
          👥
        </span>
        <span className="online-users-text">Online Users</span>
        <span className="online-users-count">{count}</span>
        <span className="online-users-arrow" aria-hidden="true">
          ▼
        </span>
      </button>

      {/* Dropdown panel (shows on hover) */}
      <div className="online-users-list" role="tooltip">
        <div className="online-users-list-header">
          <span className="online-users-list-title">Online Now</span>
          <span className="online-users-list-count">{count}</span>
        </div>

        {!isInitialized && (
          <div className="online-users-loading">
            <div className="loading-skeleton">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton-item">
                  <span className="skeleton-dot" />
                  <span className="skeleton-bar" />
                </div>
              ))}
            </div>
          </div>
        )}

        {isInitialized && count === 0 && (
          <div className="online-users-empty">No other users online</div>
        )}

        {isInitialized && count > 0 && (
          <ul className="online-users-items">
            {onlineUsers.map((u: OnlineUser) => (
              <li key={u.userId} className="online-user-item">
                <span
                  className="online-user-dot"
                  style={{ backgroundColor: u.color }}
                  aria-hidden="true"
                />
                <span className="online-user-name">{u.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
