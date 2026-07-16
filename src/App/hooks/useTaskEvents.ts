import { useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { Language } from "../../types/types";
import { setupTaskEventListeners } from "../../core/TaskListener";
export function useTaskEvents(language: Language) {
    const { t } = useTranslation(language);
    useEffect(() => {
        let unlistenFunctions: Array<() => void> = [];
        const setupListeners = async () => {
            unlistenFunctions = await setupTaskEventListeners(t);
        };
        setupListeners();
        return () => {
            unlistenFunctions.forEach((unlisten) => unlisten());
        };
    }, [t]);
}