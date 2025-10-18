// Header component - Top navigation bar
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAI } from "../../contexts/AIContext";
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
  const { isAIPanelOpen, setIsAIPanelOpen } = useAI();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const toggleAIPanel = () => {
    setIsAIPanelOpen(!isAIPanelOpen);
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
            <div className="header-logo-icon">
              <svg viewBox="0 0 40 40" fill="none">
                <rect
                  x="4"
                  y="4"
                  width="14"
                  height="14"
                  rx="2"
                  fill="#3B82F6"
                />
                <circle cx="29" cy="11" r="7" fill="#8B5CF6" />
                <path d="M4 25 L18 32 L18 25 Z" fill="#10B981" />
                <rect
                  x="24"
                  y="24"
                  width="12"
                  height="12"
                  rx="2"
                  fill="#F59E0B"
                />
              </svg>
            </div>
            CollabCanvas
          </h1>
        </div>

        {/* Right: AI Assistant toggle + Logout button */}
        <div className="header-right">
          {user && (
            <>
              <button
                onClick={toggleAIPanel}
                className={`ai-toggle-button ${isAIPanelOpen ? "active" : ""}`}
                title="Toggle AI Assistant"
              >
                <span className="ai-icon">⚡</span>
                <span className="ai-label">AI Assistant</span>
              </button>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
