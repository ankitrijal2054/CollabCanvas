// PresenceList component - displays online users with colored indicators
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import type { OnlineUser } from "../../types/collaboration.types";
import "./PresenceList.css";

export default function PresenceList() {
  const { user } = useAuth();
  const { onlineUsers, isInitialized } = usePresence(
    user?.id ?? null,
    user?.name ?? user?.email ?? null
  );

  const count = onlineUsers.length;

  return (
    <div className="presence-list">
      <div className="presence-header">
        <span className="presence-title">Online</span>
        <span className="presence-count">{count}</span>
      </div>

      {!isInitialized && (
        <div className="presence-skeletons">
          {[0, 1, 2].map((i) => (
            <div key={i} className="presence-skeleton">
              <span className="presence-skeleton-dot" />
              <span className="presence-skeleton-bar" />
            </div>
          ))}
        </div>
      )}

      {isInitialized && count === 0 && (
        <div className="presence-empty">No other users online</div>
      )}

      <ul className="presence-users">
        {onlineUsers.map((u: OnlineUser) => (
          <li key={u.userId} className="presence-user">
            <span
              className="presence-dot"
              style={{ backgroundColor: u.color }}
            />
            <span className="presence-name">{u.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
