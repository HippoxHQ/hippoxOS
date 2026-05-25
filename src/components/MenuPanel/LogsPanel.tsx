import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface LogEntry {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
  source?: string;
}

interface LogsPanelProps {
  t: (key: string, params?: any) => string;
  onClose?: () => void;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ t, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const loadLogs = async () => {
    try {
      const logsData = await fetchLogs();
      setLogs(logsData);
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (): Promise<LogEntry[]> => {
    const now = new Date();
    return [
      {
        id: "1",
        level: "info",
        message: "Hippox AI Runtime started successfully",
        timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
        source: "system",
      },
      {
        id: "2",
        level: "info",
        message: "Loaded 15 atomic skills",
        timestamp: new Date(now.getTime() - 1000 * 60 * 4).toISOString(),
        source: "skills",
      },
      {
        id: "3",
        level: "warn",
        message: "Network connection timeout, retrying...",
        timestamp: new Date(now.getTime() - 1000 * 60 * 3).toISOString(),
        source: "network",
      },
      {
        id: "4",
        level: "info",
        message: "User message received: 'Hello Hippox'",
        timestamp: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
        source: "chat",
      },
      {
        id: "5",
        level: "error",
        message: "Failed to connect to database: connection refused",
        timestamp: new Date(now.getTime() - 1000 * 60).toISOString(),
        source: "database",
      },
      {
        id: "6",
        level: "info",
        message: "Response generated successfully",
        timestamp: new Date(now.getTime()).toISOString(),
        source: "chat",
      },
    ];
  };

  const clearLogs = async () => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm(
        t("logs.confirmClear") || "Are you sure you want to clear all logs?",
      )
    ) {
      try {
        setLogs([]);
      } catch (error) {
        console.error("Failed to clear logs:", error);
      }
    }
  };

  const exportLogs = () => {
    const logText = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`,
      )
      .join("\n");
    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hippox_logs_${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case "error":
        return "#dc2626";
      case "warn":
        return "#f59e0b";
      case "debug":
        return "#8b5cf6";
      default:
        return "#10b981";
    }
  };

  const getLevelIcon = (level: string): string => {
    switch (level) {
      case "error":
        return "❌";
      case "warn":
        return "⚠️";
      case "debug":
        return "🔍";
      default:
        return "ℹ️";
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === "all" || log.level === filter;
    const matchesSearch =
      !searchTerm ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    header: {
      padding: "10px",
      borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
    },
    toolbar: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "10px",
      flexWrap: "wrap",
    },
    searchInput: {
      flex: 1,
      padding: "6px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "6px",
      color: "var(--text-primary)",
      fontSize: "12px",
      outline: "none",
    },
    filterGroup: {
      display: "flex",
      gap: "4px",
      background: "var(--bg-tertiary)",
      borderRadius: "6px",
      padding: "2px",
    },
    filterBtn: {
      padding: "4px 10px",
      background: "transparent",
      border: "none",
      borderRadius: "4px",
      color: "var(--text-secondary)",
      fontSize: "12px",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    filterBtnActive: {
      background: "var(--accent-color, #0066cc)",
      color: "white",
    },
    actionBtn: {
      padding: "6px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "6px",
      color: "var(--text-secondary)",
      fontSize: "12px",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    logsContainer: {
      flex: 1,
      overflowY: "auto",
      padding: "10px",
    },
    logEntry: {
      padding: "8px 12px",
      marginBottom: "4px",
      borderBottom: "1px solid var(--border-color)",
      fontFamily: "monospace",
      fontSize: "12px",
      display: "flex",
      gap: "12px",
      alignItems: "flex-start",
    },
    logTime: {
      color: "var(--text-tertiary)",
      flexShrink: 0,
      minWidth: "70px",
    },
    logLevel: {
      flexShrink: 0,
      minWidth: "24px",
    },
    logMessage: {
      flex: 1,
      color: "var(--text-primary)",
      wordBreak: "break-word",
    },
    logSource: {
      color: "var(--text-tertiary)",
      fontSize: "10px",
      flexShrink: 0,
    },
    loadingState: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "200px",
      color: "var(--text-muted)",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px 20px",
      color: "var(--text-muted)",
    },
    stats: {
      fontSize: "11px",
      color: "var(--text-muted)",
      marginTop: "8px",
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          {t("atomicSkills.loading") || "Loading logs..."}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.toolbar}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder={t("logs.searchPlaceholder") || "Search logs..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={styles.filterGroup}>
            <button
              style={{
                ...styles.filterBtn,
                ...(filter === "all" ? styles.filterBtnActive : {}),
              }}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              style={{
                ...styles.filterBtn,
                ...(filter === "info" ? styles.filterBtnActive : {}),
              }}
              onClick={() => setFilter("info")}
            >
              Info
            </button>
            <button
              style={{
                ...styles.filterBtn,
                ...(filter === "warn" ? styles.filterBtnActive : {}),
              }}
              onClick={() => setFilter("warn")}
            >
              Warn
            </button>
            <button
              style={{
                ...styles.filterBtn,
                ...(filter === "error" ? styles.filterBtnActive : {}),
              }}
              onClick={() => setFilter("error")}
            >
              Error
            </button>
          </div>
          <button style={styles.actionBtn} onClick={exportLogs}>
            📥 Export
          </button>
          <button style={styles.actionBtn} onClick={clearLogs}>
            🗑️ Clear
          </button>
        </div>
        <div style={styles.stats}>
          {filteredLogs.length} / {logs.length} logs
        </div>
      </div>

      <div
        style={styles.logsContainer}
        ref={logsContainerRef}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const isAtBottom =
            target.scrollHeight - target.scrollTop - target.clientHeight < 50;
          setAutoScroll(isAtBottom);
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={styles.emptyState}>
            {searchTerm
              ? "No matching logs"
              : t("logs.empty") || "No logs available"}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} style={styles.logEntry}>
              <span style={styles.logTime}>{formatTime(log.timestamp)}</span>
              <span style={styles.logLevel}>{getLevelIcon(log.level)}</span>
              <span style={styles.logMessage}>{log.message}</span>
              {log.source && <span style={styles.logSource}>{log.source}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogsPanel;
