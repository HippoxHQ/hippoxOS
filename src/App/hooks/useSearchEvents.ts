import { useEffect } from "react";

export function useSearchEvents(
  onOpenSkill: () => void,
  onSwitchSession: (sessionId: string) => void,
) {
  useEffect(() => {
    const handleOpenSkill = (e: CustomEvent) => {
      onOpenSkill();
    };

    const handleSwitchSession = (e: CustomEvent) => {
      const { sessionId } = e.detail;
      onSwitchSession(sessionId);
    };

    const handleOpenLog = (e: CustomEvent) => {};
    
    window.addEventListener(
      "search-open-skill",
      handleOpenSkill as EventListener,
    );
    window.addEventListener(
      "search-switch-session",
      handleSwitchSession as EventListener,
    );
    window.addEventListener("search-open-log", handleOpenLog as EventListener);
    
    return () => {
      window.removeEventListener(
        "search-open-skill",
        handleOpenSkill as EventListener,
      );
      window.removeEventListener(
        "search-switch-session",
        handleSwitchSession as EventListener,
      );
      window.removeEventListener(
        "search-open-log",
        handleOpenLog as EventListener,
      );
    };
  }, [onOpenSkill, onSwitchSession]);
}