import { useState, useCallback, useEffect } from "react";

export const useFunctionPanelPosition = () => {
    const [functionPanelPosition, setFunctionPanelPosition] = useState<"left" | "right">("right");

    useEffect(() => {
        const saved = localStorage.getItem("hippox-function-panel-position");
        if (saved === "left" || saved === "right") {
            setFunctionPanelPosition(saved);
        }
    }, []);

    const handleFunctionPanelPositionChange = useCallback((position: "left" | "right") => {
        setFunctionPanelPosition(position);
        localStorage.setItem("hippox-function-panel-position", position);
    }, []);

    return {
        functionPanelPosition,
        handleFunctionPanelPositionChange,
    };
};