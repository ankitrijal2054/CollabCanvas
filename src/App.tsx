import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import Canvas from "./components/canvas/Canvas";
import AuthGuard from "./components/auth/AuthGuard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route redirects to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth routes - accessible to everyone */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected route - requires authentication */}
        <Route
          path="/canvas"
          element={
            <AuthGuard>
              <Canvas />
            </AuthGuard>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
