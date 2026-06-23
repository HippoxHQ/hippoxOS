import React, { useState, useEffect, useRef } from "react";
import { filesCommands } from "../../command/files";
import { getDataPaths } from "../../command/paths";
import { UploadFile } from "../../core/types";
import { SearchIcon } from "../../icons";

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
  onFileClick?: (file: UploadFile) => void;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ t, onClose, onFileClick }) => {
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

  const handleOpenLogFile = async (log: LogEntry) => {
    if (onFileClick) {
      try {
        const content = await filesCommands.readTextFile(log.path);
        const logFile: UploadFile = {
          id: log.id,
          name: log.name,
          path: log.path,
          size: log.size,
          file: new File([content], log.name, { type: "text/plain" }),
          type: "text/plain",
          status: "success" as const,
        };
        onFileClick(logFile);
      } catch (error) {
        console.error("Failed to read log file:", error);
        await filesCommands.openPath(log.path);
      }
    } else {
      await filesCommands.openPath(log.path);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
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
      flexShrink: 0,
    },
    searchRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    searchInputWrapper: {
      flex: 1,
      position: "relative" as const,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    searchInput: {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      color: "var(--text-primary)",
      fontSize: "13px",
      padding: "4px 0",
    },
    searchIcon: {
      flexShrink: 0,
      color: "var(--text-tertiary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    clearBtn: {
      background: "transparent",
      border: "none",
      color: "var(--text-tertiary)",
      cursor: "pointer",
      fontSize: "14px",
      padding: "2px 6px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
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
      padding: "10px 15px",
      borderBottom: "1px solid var(--border-color)",
      cursor: "pointer",
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

  // CSS 注入 - 包含搜索框样式
  const globalStyles = `
    .logs-search-input-wrapper {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 1.5px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 5px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .logs-search-input-wrapper:focus-within {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    .logs-search-input-wrapper svg {
      flex-shrink: 0;
      color: var(--text-tertiary);
    }
    .logs-search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 13px;
      padding: 4px 0;
    }
    .logs-search-clear {
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logs-search-clear:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }
  `;

  if (typeof document !== "undefined") {
    const styleId = "logs-panel-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = globalStyles;
      document.head.appendChild(style);
    }
  }

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
        <div style={styles.searchRow}>
          <div className="logs-search-input-wrapper">
            <SearchIcon />
            <input
              type="text"
              className="logs-search-input"
              placeholder={t("logs.searchPlaceholder") || "Search log files..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="logs-search-clear"
                onClick={handleClearSearch}
                title={t("logs.clearSearch") || "Clear search"}
              >
                ✕
              </button>
            )}
          </div>
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
                onClick={() => handleOpenLogFile(log)}
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
