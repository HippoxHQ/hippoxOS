import { useState, useEffect, useCallback } from "react";
import { sessionCommands } from "../../../../command/session/general";
export const useSessionTitles = () => {
  const [sessionTitlesMap, setSessionTitlesMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const loadSessionTitles = useCallback(async () => {
    setLoading(true);
    try {
      const sessions = await sessionCommands.listSessions();
      const map = new Map<string, string>();
      sessions.forEach((session) => {
        map.set(session.session_id, session.title || `session ${session.session_id.slice(-6)}`);
      });
      setSessionTitlesMap(map);
    } catch (error) {
      console.error("Failed to load session titles:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadSessionTitles();
    const handleSessionCreated = () => {
      loadSessionTitles();
    };
    window.addEventListener("session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("session-created", handleSessionCreated);
    };
  }, [loadSessionTitles]);
  return {
    sessionTitlesMap,
    loading: loading,
    refresh: loadSessionTitles,
  };
};