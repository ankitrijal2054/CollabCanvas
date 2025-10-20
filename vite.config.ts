import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Strip noisy logs in production; keep warn/error
  esbuild: {
    drop: mode === "production" ? ["debugger"] : [],
    pure:
      mode === "production"
        ? ["console.log", "console.info", "console.debug", "console.trace"]
        : [],
  },
}));
