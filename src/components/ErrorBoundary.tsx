import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "#f9fafb",
            color: "#111827",
            padding: 16,
          }}
        >
          <div
            style={{
              maxWidth: 560,
              width: "100%",
              background: "white",
              borderRadius: 12,
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              padding: 20,
              border: "1px solid #e5e7eb",
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 8 }}>
              Something went wrong.
            </h2>
            {import.meta.env.DEV ? (
              <>
                <p style={{ marginTop: 0 }}>
                  {this.state.message || "An unexpected error occurred."}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>
                  Check the console for more details. Try reloading the page.
                </p>
              </>
            ) : (
              <p style={{ marginTop: 0 }}>
                An unexpected error occurred. Please refresh the page.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
