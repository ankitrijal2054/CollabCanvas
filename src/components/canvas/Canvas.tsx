// Canvas component - to be fully implemented in PR #3
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Canvas() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "0.5rem" }}>CollabCanvas</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Welcome, {user?.name || "User"}! 👋
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "white",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          border: "2px dashed var(--border-color)",
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Canvas Coming Soon!</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          The collaborative canvas will be implemented in PR #3.
          <br />
          You're successfully authenticated and ready to collaborate! 🎨
        </p>
      </div>
    </div>
  );
}
