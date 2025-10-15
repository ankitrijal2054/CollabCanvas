// Header component - Top navigation bar
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { User } from "../../types/user.types";
import { ConnectionStatusDot } from "./ConnectionStatusDot";
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
        <div className="header-left">
          <h1 className="header-title">
            <span className="header-icon">🎨</span>
            CollabCanvas
          </h1>
        </div>

        <div className="header-right">
          {user && (
            <>
              <ConnectionStatusDot />
              <div className="user-info">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.name}
                    className="user-avatar"
                  />
                )}
                <span className="user-name">{user.name}</span>
              </div>
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
