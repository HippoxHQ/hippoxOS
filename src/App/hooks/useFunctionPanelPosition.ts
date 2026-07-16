import { useState, useCallback, useEffect } from "react";
import { configCommands } from "../../command/config";
export const useFunctionPanelPosition = () => {
    const [functionPanelPosition, setFunctionPanelPosition] = useState<"left" | "right">("right");
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const loadPosition = async () => {
            try {
                const saved = await configCommands.getSettingsFunctionPanelPosition();
                if (saved === "left" || saved === "right") {
                    setFunctionPanelPosition(saved);
                } else {
                    await configCommands.saveSettingsFunctionPanelPosition("right");
                    setFunctionPanelPosition("right");
                }
            } catch (error) {
                console.error("Failed to load function panel position:", error);
                try {
                    await configCommands.saveSettingsFunctionPanelPosition("right");
                } catch (saveError) {
                    console.error("Failed to save default function panel position:", saveError);
                }
                setFunctionPanelPosition("right");
            } finally {
                setIsLoading(false);
            }
        };
        loadPosition();
    }, []);
    const handleFunctionPanelPositionChange = useCallback((position: "left" | "right") => {
        setFunctionPanelPosition(position);
        configCommands.saveSettingsFunctionPanelPosition(position).catch((error) => {
            console.error("Failed to save function panel position:", error);
        });
    }, []);
    return {
        functionPanelPosition,
        handleFunctionPanelPositionChange,
        isLoading,
    };
};