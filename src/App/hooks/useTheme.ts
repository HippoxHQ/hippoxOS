import { Theme } from "@tauri-apps/api/window";
import { useState, useEffect } from "react";
import { configCommands } from "../../api/config";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  const handleToggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    await configCommands.saveSettingsTheme(newTheme);
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