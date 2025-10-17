// Header component - Top navigation bar
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { User } from "../../types/user.types";
import { ConnectionStatusDot } from "./ConnectionStatusDot";
import { OnlineUsersDropdown } from "../collaboration/OnlineUsersDropdown";
import "./Header.css";

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Left: User info + Online Users dropdown */}
        <div className="header-left">
          {user && (
            <>
              <div className="user-section">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.name}
                    className="user-avatar"
                  />
                )}
                <div className="user-details">
                  <div className="user-name-status">
                    <span className="user-name">{user.name}</span>
                    <ConnectionStatusDot />
                  </div>
                </div>
              </div>

              {/* NEW: Online Users Dropdown - right after user section */}
              <OnlineUsersDropdown />
            </>
          )}
        </div>

        {/* Center: Title */}
        <div className="header-center">
          <h1 className="header-title">
            <span className="header-icon">🎨</span>
            CollabCanvas
          </h1>
        </div>

        {/* Right: Logout button */}
        <div className="header-right">
          {user && (
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
