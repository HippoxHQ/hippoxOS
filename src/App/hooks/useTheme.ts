import { Theme } from "@tauri-apps/api/window";
import { useState, useEffect } from "react";
import { configCommands } from "../../command/config";
export function useTheme(initialTheme?: string) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (initialTheme) {
      return initialTheme as Theme;
    }
    const saved = localStorage.getItem("hippox-theme");
    return (saved === "dark" || saved === "light") ? saved as Theme : "dark";
  });
  useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme as Theme);
    }
  }, [initialTheme]);
  const handleToggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    await configCommands.saveSettingsTheme(newTheme);
    localStorage.setItem("hippox-theme", newTheme);
    window.dispatchEvent(
      new CustomEvent("theme-changed", { detail: { theme: newTheme } }),
    );
  };
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return {
    theme,
    handleToggleTheme,
  };
}