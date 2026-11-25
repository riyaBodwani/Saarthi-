import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "saarthi_theme";

function readStoredTheme() {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    const legacy = localStorage.getItem("notiva_theme");
    if (legacy === "dark" || legacy === "light") return legacy;
  } catch {
    // Storage unavailable
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage unavailable or sandboxed
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme, setTheme, isDark: theme === "dark" };
}
