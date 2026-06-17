import { useEffect } from "react";
import { Language } from "../../types/types";
import { useTranslation } from "../../hooks/useTranslation";
import { setupSkillEventListeners } from "../../core/SkillListener";

export function useSkillEvents(language: Language) {
    const { t } = useTranslation(language);
    useEffect(() => {
        let unlistenFunctions: Array<() => void> = [];
        const setupListeners = async () => {
            unlistenFunctions = await setupSkillEventListeners(t);
        };
        setupListeners();
        return () => {
            unlistenFunctions.forEach((unlisten) => unlisten());
        };
    }, [t]);
}