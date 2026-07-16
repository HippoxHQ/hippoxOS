import { useState, useEffect } from "react";
export function useLayoutMode() {
  const [layoutMode, setLayoutMode] = useState<"horizontal" | "vertical">(() => {
    const saved = localStorage.getItem("hippox-layout-mode");
    return saved === "horizontal" || saved === "vertical" ? saved : "vertical";
  });
  const handleLayoutModeChange = (mode: "horizontal" | "vertical") => {
    setLayoutMode(mode);
    localStorage.setItem("hippox-layout-mode", mode);
  };
  useEffect(() => {
    const savedLayoutMode = localStorage.getItem("hippox-layout-mode") as
      | "horizontal"
      | "vertical"
      | null;
    if (savedLayoutMode) {
      setLayoutMode(savedLayoutMode);
    }
  }, []);
  return {
    layoutMode,
    handleLayoutModeChange,
  };
}