import { useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "cc_theme";

function getSystemTheme(): Theme {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") return stored;
  } catch (_) {
    // ignore storage errors
  }
  return getSystemTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  // Compute next theme quickly for UI labels
  const isDark = theme === "dark";
  const nextTheme: Theme = isDark ? "light" : "dark";

  useEffect(() => {
    const root = document.documentElement; // <html>
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_) {
      // ignore storage errors
    }
  }, [theme]);

  const toggleTheme = useMemo(
    () => () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    []
  );

  return { theme, isDark, nextTheme, toggleTheme };
}
