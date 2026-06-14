import { useState, useEffect } from "react";

export type LayoutSwapMode = "terminal-left" | "chat-left";

export function useLayoutSwapMode() {
    const [layoutSwapMode, setLayoutSwapMode] = useState<LayoutSwapMode>(() => {
        const saved = localStorage.getItem("hippox-layout-swap-mode");
        return saved === "terminal-left" || saved === "chat-left" ? saved as LayoutSwapMode : "terminal-left";
    });
    const handleLayoutSwapModeChange = (mode: LayoutSwapMode) => {
        setLayoutSwapMode(mode);
        localStorage.setItem("hippox-layout-swap-mode", mode);
    };
    useEffect(() => {
        const savedMode = localStorage.getItem("hippox-layout-swap-mode") as LayoutSwapMode | null;
        if (savedMode) {
            setLayoutSwapMode(savedMode);
        }
    }, []);
    return {
        layoutSwapMode,
        handleLayoutSwapModeChange,
    };
}