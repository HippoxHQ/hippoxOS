import { useEffect } from "react";
import { Language } from "../../types/types";
import { useTranslation } from "../../hooks/useTranslation";
import { setupDriverEventListeners } from "../../core/DriverListener";
export function useDriverEvents(language: Language) {
    const { t } = useTranslation(language);
    useEffect(() => {
        let unlistenFunctions: Array<() => void> = [];
        const setupListeners = async () => {
            unlistenFunctions = await setupDriverEventListeners(t);
        };
        setupListeners();
        return () => {
            unlistenFunctions.forEach((unlisten) => unlisten());
        };
    }, [t]);
}