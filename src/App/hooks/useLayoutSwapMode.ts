import { useState, useCallback, useEffect } from "react";
import { configCommands } from "../../command/config";

export type PageType = 'general' | 'chart' | 'map' | 'codeeditor';

export const useLayoutSwapMode = (pageType: PageType = 'general') => {
    const [layoutSwapMode, setLayoutSwapMode] = useState<"terminal-left" | "chat-left">("terminal-left");
    const [isLoading, setIsLoading] = useState(true);

    const getSettingsFunction = useCallback(() => {
        switch (pageType) {
            case 'chart':
                return configCommands.getSettingsChartChatLayoutSwapMode;
            case 'map':
                return configCommands.getSettingsMapChatLayoutSwapMode;
            case 'codeeditor':
                return configCommands.getSettingsCodeEditorLayoutSwapMode;
            case 'general':
            default:
                return configCommands.getSettingsGeneralChatLayoutSwapMode;
        }
    }, [pageType]);

    const saveSettingsFunction = useCallback(() => {
        switch (pageType) {
            case 'chart':
                return configCommands.saveSettingsChartChatLayoutSwapMode;
            case 'map':
                return configCommands.saveSettingsMapChatLayoutSwapMode;
            case 'codeeditor':
                return configCommands.saveSettingsCodeEditorLayoutSwapMode;
            case 'general':
            default:
                return configCommands.saveSettingsGeneralChatLayoutSwapMode;
        }
    }, [pageType]);

    useEffect(() => {
        const loadMode = async () => {
            try {
                const getFn = getSettingsFunction();
                const saved = await getFn();
                if (saved === "terminal-left" || saved === "chat-left") {
                    setLayoutSwapMode(saved);
                } else {
                    const saveFn = saveSettingsFunction();
                    await saveFn("terminal-left");
                    setLayoutSwapMode("terminal-left");
                }
            } catch (error) {
                console.error("Failed to load layout swap mode:", error);
                try {
                    const saveFn = saveSettingsFunction();
                    await saveFn("terminal-left");
                } catch (saveError) {
                    console.error("Failed to save default layout swap mode:", saveError);
                }
                setLayoutSwapMode("terminal-left");
            } finally {
                setIsLoading(false);
            }
        };
        loadMode();
    }, [getSettingsFunction, saveSettingsFunction]);

    const handleLayoutSwapModeChange = useCallback((mode: "terminal-left" | "chat-left") => {
        setLayoutSwapMode(mode);
        const saveFn = saveSettingsFunction();
        saveFn(mode).catch((error) => {
            console.error("Failed to save layout swap mode:", error);
        });
    }, [saveSettingsFunction]);

    return {
        layoutSwapMode,
        handleLayoutSwapModeChange,
        isLoading,
    };
};