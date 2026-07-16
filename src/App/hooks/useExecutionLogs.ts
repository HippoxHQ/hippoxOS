import { useState, useEffect } from "react";
import { ExecutionLog } from "../../types/types";
import { hippoxCommands } from "../../command/chat";
export function useExecutionLogs() {
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const clearLogs = async () => {
    try {
      await hippoxCommands.clearLogs();
      setExecutionLogs([]);
    } catch (error) {
      console.error("clear logs error:", error);
    }
  };
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logs = await hippoxCommands.getLogs();
        const formattedLogs: ExecutionLog[] = logs.map((log) => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level as any,
          message: log.message,
          details: log.details,
          duration: log.duration,
        }));
        setExecutionLogs(formattedLogs);
      } catch (error) {
        console.error("loading logs error:", error);
      }
    };
    loadLogs();
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, []);
  return {
    executionLogs,
    clearLogs,
  };
}