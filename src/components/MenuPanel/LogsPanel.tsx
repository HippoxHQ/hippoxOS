import React, { useState, useEffect, useRef } from "react";
import { getDataPaths } from "../../api/paths";
import { filesCommands } from "../../api/files";

interface LogEntry {
  id: string;
  name: string;
  size: number;
  modified: string;
  path: string;
}

interface LogsPanelProps {
  t: (key: string, params?: any) => string;
  onClose?: () => void;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ t, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const paths = await getDataPaths();
      const logsData = await readLogFiles(paths.log_dir);
      const sortedLogs = logsData.sort(
        (a, b) =>
          new Date(b.modified).getTime() - new Date(a.modified).getTime(),
      );
      setLogs(sortedLogs);
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const readLogFiles = async (logDir: string): Promise<LogEntry[]> => {
    const entries: LogEntry[] = [];
    try {
      const exists = await filesCommands.pathExists(logDir);
      if (!exists) {
        console.log("Log directory does not exist:", logDir);
        return entries;
      }
      const files = await filesCommands.readDirectory(logDir);
      const logFiles = files.filter(
        (f) => f.is_directory === false && f.name.endsWith(".log"),
      );
      for (const file of logFiles) {
        entries.push({
          id: file.path,
          name: file.name,
          size: file.size || 0,
          modified: file.modified || new Date().toISOString(),
          path: file.path,
        });
      }
    } catch (error) {
      console.error("Failed to read log directory:", error);
    }
    return entries;
  };

  const handleOpenLogFile = async (filePath: string) => {
    try {
      await filesCommands.openPath(filePath);
    } catch (error) {
      console.error("Failed to open log file:", error);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const filteredLogs = logs.filter((log) =>
    log.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
    statsRow: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: "8px",
    },
    stats: {
      fontSize: "11px",
      color: "var(--text-muted)",
    },
    logsContainer: {
      flex: 1,
      overflowY: "auto",
    },
    logEntry: {
      background: "var(--bg-secondary)",
      padding: "12px 15px",
      border: "1px solid var(--border-color)",
      transition: "background 0.2s ease",
      cursor: "pointer",
      marginBottom: "8px",
    },
    logEntryHovered: {
      background: "var(--hover-bg)",
    },
    logName: {
      fontSize: "14px",
      fontWeight: 500,
      color: "var(--text-primary)",
      marginBottom: "6px",
      wordBreak: "break-all",
    },
    logMeta: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flexWrap: "wrap",
      fontSize: "11px",
      color: "var(--text-muted)",
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
      padding: "60px 20px",
      color: "var(--text-muted)",
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
            placeholder={t("logs.searchPlaceholder") || "Search log files..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={styles.statsRow}>
          <div style={styles.stats}>
            {filteredLogs.length} / {logs.length} log files
          </div>
        </div>
      </div>

      <div style={styles.logsContainer} ref={logsContainerRef}>
        {filteredLogs.length === 0 ? (
          <div style={styles.emptyState}>
            {searchTerm
              ? "No matching log files"
              : t("logs.empty") || "No log files available"}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isHovered = hoveredId === log.id;
            return (
              <div
                key={log.id}
                style={{
                  ...styles.logEntry,
                  ...(isHovered ? styles.logEntryHovered : {}),
                }}
                onMouseEnter={() => setHoveredId(log.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleOpenLogFile(log.path)}
              >
                <div style={styles.logName}>📄 {log.name}</div>
                <div style={styles.logMeta}>
                  <span>📅 {formatDate(log.modified)}</span>
                  <span>💾 {formatSize(log.size)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LogsPanel;
