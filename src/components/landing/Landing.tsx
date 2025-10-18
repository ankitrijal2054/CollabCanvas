import { useNavigate } from "react-router-dom";

import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Animated background elements */}
      <div className="landing-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>

      {/* Main content */}
      <div className="landing-content">
        {/* Left side - Hero content */}
        <div className="landing-hero">
          <div className="landing-logo">
            <div className="logo-icon">
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
            <h1 className="logo-text">CollabCanvas</h1>
          </div>

          <div className="hero-text">
            <h2 className="hero-headline">
              Design Together.
              <br />
              <span className="gradient-text">Design Faster.</span>
              <br />
              Design with AI.
            </h2>
            <p className="hero-subheadline">
              The first collaborative design tool with conversational AI. Create
              stunning layouts in seconds—all in real-time with your team.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <div className="feature-text">
                <h3>AI-Powered</h3>
                <p>Create with simple commands</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">👥</div>
              <div className="feature-text">
                <h3>Real-Time Sync</h3>
                <p>Collaborate instantly</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎨</div>
              <div className="feature-text">
                <h3>Full Toolkit</h3>
                <p>Shapes, text, alignment</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💾</div>
              <div className="feature-text">
                <h3>Never Lose Work</h3>
                <p>Offline-first design</p>
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="cta-buttons">
            <button
              className="btn-primary-large"
              onClick={() => navigate("/signup")}
            >
              Get Started Free
              <span className="btn-arrow">→</span>
            </button>
            <button
              className="btn-secondary-large"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          </div>

          <p className="cta-subtitle">No credit card required</p>
        </div>

        {/* Right side - Visual showcase */}
        <div className="landing-visual">
          <div className="canvas-preview">
            {/* Mock canvas with animated elements */}
            <div className="preview-header">
              <div className="preview-header-left">
                <div className="preview-user-badge">
                  <div
                    className="user-avatar"
                    style={{
                      background: "#3B82F6",
                      width: "28px",
                      height: "28px",
                      fontSize: "0.7rem",
                    }}
                  >
                    S
                  </div>
                  <span className="preview-user-name">Sarah</span>
                </div>
              </div>
              <div className="preview-title">
                <div className="preview-logo-icon">
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
              </div>
              <div className="preview-header-right">
                <button className="preview-logout-btn">Logout</button>
              </div>
            </div>

            <div className="preview-canvas">
              {/* Floating toolbar */}
              <div className="preview-toolbar">
                <div className="preview-tool-btn secondary" title="Select">
                  ⬆
                </div>
                <div className="preview-tool-btn" title="Rectangle">
                  ▭
                </div>
                <div className="preview-tool-btn" title="Circle">
                  ●
                </div>
                <div className="preview-tool-btn" title="Text">
                  T
                </div>
              </div>
              {/* Animated shapes */}
              <div
                className="canvas-shape rect-shape"
                style={{ top: "15%", left: "10%" }}
              >
                <div className="shape-selection"></div>
              </div>
              <div
                className="canvas-shape circle-shape"
                style={{ top: "20%", right: "15%" }}
              >
                <div className="shape-selection"></div>
              </div>
              <div
                className="canvas-shape text-shape"
                style={{ top: "50%", left: "15%" }}
              >
                <span>Design Together</span>
              </div>
              <div
                className="canvas-shape star-shape"
                style={{ bottom: "20%", right: "20%" }}
              >
                ★
              </div>

              {/* Animated cursors */}
              <div
                className="cursor cursor-1"
                style={{ top: "25%", left: "15%" }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="#3B82F6">
                  <path d="M0 0 L0 16 L6 12 L9 20 L11 19 L8 11 L16 11 Z" />
                </svg>
                <span className="cursor-label">Sarah</span>
              </div>
              <div
                className="cursor cursor-2"
                style={{ top: "55%", right: "20%" }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="#8B5CF6">
                  <path d="M0 0 L0 16 L6 12 L9 20 L11 19 L8 11 L16 11 Z" />
                </svg>
                <span className="cursor-label">Marcus</span>
              </div>
            </div>

            {/* AI chat sidebar preview */}
            <div className="preview-ai-sidebar">
              <div className="ai-sidebar-header">
                <span className="ai-sidebar-icon">⚡</span>
                <span className="ai-sidebar-title">AI Assistant</span>
              </div>
              <div className="ai-sidebar-content">
                <div className="ai-message">
                  <div className="ai-text">"Create a login form"</div>
                </div>
                <div className="ai-response">
                  <div className="ai-response-label">AI is thinking</div>
                  <div className="ai-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="landing-footer">
        <div className="footer-stats">
          <div className="stat">
            <strong>&lt;100ms</strong>
            <span>Real-time sync</span>
          </div>
          <div className="stat">
            <strong>5+</strong>
            <span>Shape types</span>
          </div>
          <div className="stat">
            <strong>10+</strong>
            <span>Keyboard shortcuts</span>
          </div>
          <div className="stat">
            <strong>∞</strong>
            <span>Simultaneous users</span>
          </div>
        </div>
      </div>
    </div>
  );
}
