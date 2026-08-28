import { useEffect } from "react";
export function useSearchEvents(
  onOpenSkill: () => void,
  onSwitchSession: (sessionId: string) => void,
  onSwitchToSubsystem?: (subsystem: string, sessionId: string) => void,
) {
  useEffect(() => {
    const handleOpenSkill = (e: CustomEvent) => {
      onOpenSkill();
    };
    const handleSwitchSession = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId } = e.detail;
      onSwitchSession(sessionId);
    };
    const handleOpenLog = (e: CustomEvent) => { };
    const handleSearchSwitchSession = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId, subsystem } = e.detail;
      // If subsystem info is provided, switch to the corresponding subsystem page
      if (subsystem && onSwitchToSubsystem) {
        onSwitchToSubsystem(subsystem, sessionId);
      } else {
        // Fallback: just switch session
        onSwitchSession(sessionId);
      }
    };
    window.addEventListener(
      "search-open-skill",
      handleOpenSkill as EventListener,
    );
    window.addEventListener(
      "search-switch-session",
      handleSearchSwitchSession as EventListener,
    );
    window.addEventListener("search-open-log", handleOpenLog as EventListener);
    return () => {
      window.removeEventListener(
        "search-open-skill",
        handleOpenSkill as EventListener,
      );
      window.removeEventListener(
        "search-switch-session",
        handleSearchSwitchSession as EventListener,
      );
      window.removeEventListener(
        "search-open-log",
        handleOpenLog as EventListener,
      );
    };
  }, [onOpenSkill, onSwitchSession, onSwitchToSubsystem]);
}