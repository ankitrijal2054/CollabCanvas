// AuthGuard component - Protects routes and redirects unauthorized users
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard Component
 * Wraps protected routes and redirects to login if user is not authenticated
 * Shows loading state while checking authentication status
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontSize: "1.125rem",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid var(--border-color)",
              borderTop: "4px solid var(--primary-color)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p>Loading...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
