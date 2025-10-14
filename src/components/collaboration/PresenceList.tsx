// PresenceList component - displays online users with colored indicators
import React from "react";
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

      {!isInitialized && <div className="presence-loading">Connecting…</div>}

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
