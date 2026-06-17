import { useEffect, useRef } from "react";
import { setupSkillEventListeners } from "../../../../core/SkillListener";

export function useTaskStepManager(t: (key: string) => string) {
    const unlistenRefs = useRef<Array<() => void>>([]);
    useEffect(() => {
        const setupListeners = async () => {
            const unlistenFunctions = await setupSkillEventListeners(t);
            unlistenRefs.current = unlistenFunctions;
        };
        setupListeners();
        return () => {
            unlistenRefs.current.forEach((unlisten) => unlisten());
            unlistenRefs.current = [];
        };
    }, [t]);
}