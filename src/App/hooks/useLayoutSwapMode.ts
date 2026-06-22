import { useState, useCallback, useEffect } from "react";
import { configCommands } from "../../command/config";

export const useLayoutSwapMode = () => {
    const [layoutSwapMode, setLayoutSwapMode] = useState<"terminal-left" | "chat-left">("terminal-left");
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const loadMode = async () => {
            try {
                const saved = await configCommands.getSettingsLayoutSwapMode();
                if (saved === "terminal-left" || saved === "chat-left") {
                    setLayoutSwapMode(saved);
                } else {
                    await configCommands.saveSettingsLayoutSwapMode("terminal-left");
                    setLayoutSwapMode("terminal-left");
                }
            } catch (error) {
                console.error("Failed to load layout swap mode:", error);
                try {
                    await configCommands.saveSettingsLayoutSwapMode("terminal-left");
                } catch (saveError) {
                    console.error("Failed to save default layout swap mode:", saveError);
                }
                setLayoutSwapMode("terminal-left");
            } finally {
                setIsLoading(false);
            }
        };
        loadMode();
    }, []);
    const handleLayoutSwapModeChange = useCallback((mode: "terminal-left" | "chat-left") => {
        setLayoutSwapMode(mode);
        configCommands.saveSettingsLayoutSwapMode(mode).catch((error) => {
            console.error("Failed to save layout swap mode:", error);
        });
    }, []);
    return {
        layoutSwapMode,
        handleLayoutSwapModeChange,
        isLoading,
    };
};