import React, { useRef, useEffect, useState } from "react";
import { hippoxCommands } from "../api/chat";
import { ExecutionLog, TaskInfo } from "../type";

interface TerminalPanelProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
  t: (key: string, params?: any) => string;
  activeTasks?: TaskInfo[];
}

const logToConsole = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString();
  switch (level) {
    case "error":
      console.error(`[${timestamp}] ${message}`, data || "");
      break;
    case "warn":
      console.warn(`[${timestamp}] ${message}`, data || "");
      break;
    case "info":
      console.info(`[${timestamp}] ${message}`, data || "");
      break;
    default:
      console.log(`[${timestamp}] ${message}`, data || "");
  }
};

const HIPPOX_ASCII_LOGO = `
   ██╗  ██╗██╗██████╗ ██████╗  ██████╗ ██╗  ██╗
   ██║  ██║██║██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝
   ███████║██║██████╔╝██████╔╝██║   ██║ ╚███╔╝ 
   ██╔══██║██║██╔═══╝ ██╔═══╝ ██║   ██║ ██╔██╗ 
   ██║  ██║██║██║     ██║     ╚██████╔╝██╔╝ ██╗
   ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝      ╚═════╝ ╚═╝  ╚═╝
`;

const styles = {
  asciiArt: {
    margin: "0px 0px",
  },
  asciiPre: {
    fontFamily: "'Courier New', 'Fira Code', monospace",
    fontSize: "11px",
    lineHeight: 1.2,
    color: "var(--terminal-text, #119c11)",
    margin: 0,
    padding: "4px 0",
    whiteSpace: "pre" as const,
    background: "transparent",
    border: "none",
    textShadow: "0 0 2px rgba(0, 255, 0, 0.3)",
  },
  welcomeRowHeader: {
    cursor: "default" as const,
  },
  welcomeStepName: {
    color: "var(--terminal-dim, #888)",
  },
  linksContainer: {
    marginTop: "8px",
    paddingTop: "4px",
    borderTop: "1px solid var(--border-color, #333)",
  },
  link: {
    color: "var(--link-color, #00aaff)",
    textDecoration: "none",
    cursor: "pointer",
    marginRight: "16px",
    fontSize: "12px",
    display: "inline-flex" as const,
    alignItems: "center",
    gap: "4px",
  },
  linkHover: {
    textDecoration: "underline",
  },
};

const TerminalPanel: React.FC<TerminalPanelProps> = ({
  logs,
  onClearLogs,
  t,
  activeTasks = [],
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    const newExpanded = new Set(expandedTasks);
    activeTasks.forEach((task) => {
      if (!expandedTasks.has(task.task_id)) {
        newExpanded.add(task.task_id);
      }
    });
    setExpandedTasks(newExpanded);
  }, [activeTasks]);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeTasks, autoScroll]);

  const handleScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 10;
    setAutoScroll(isAtBottom);
  };

  const handleClearLogs = async () => {
    await hippoxCommands.clearLogs();
    onClearLogs();
    logToConsole("info", "Terminal logs cleared");
  };

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      case "running":
        return "🔄";
      case "pending":
        return "⏳";
      default:
        return "📌";
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "✅";
      case "FAILURE":
        return "❌";
      case "RUNNING":
        return "🔄";
      default:
        return "⏳";
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString();
    } catch {
      return "";
    }
  };

  const handleLinkClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getLinkStyle = (linkId: string) => ({
    ...styles.link,
    ...(hoveredLink === linkId ? styles.linkHover : {}),
  });

  const renderWelcomeMessage = () => {
    const welcomeTime = new Date().toLocaleTimeString();
    return (
      <div className="task-row welcome-row">
        <div className="task-row-header" style={styles.welcomeRowHeader}>
          <span className="task-expand-icon">▼</span>
          <span className="task-status-icon">🦛</span>
          <span className="task-time">[{welcomeTime}]</span>
          <span className="task-input">🎉 {t("terminal.welcome.title")}</span>
          <span className="task-status-text">ready</span>
        </div>
        <div className="task-steps welcome-steps">
          <div className="task-step">
            <span className="step-indent"> </span>
            <span className="step-icon">🚀</span>
            <span className="step-name" style={styles.welcomeStepName}>
              {t("terminal.welcome.subtitle")}
            </span>
          </div>
          <div className="step-output ascii-art" style={styles.asciiArt}>
            <pre style={styles.asciiPre}>{HIPPOX_ASCII_LOGO}</pre>
          </div>
          <div className="task-step">
            <span className="step-indent"> </span>
            <span className="step-icon">💡</span>
            <span className="step-name" style={styles.welcomeStepName}>
              {t("terminal.welcome.status")}
            </span>
          </div>
          <div className="task-step">
            <span className="step-indent"> </span>
            <span className="step-icon">📝</span>
            <span className="step-name" style={styles.welcomeStepName}>
              {t("terminal.welcome.commands")}
            </span>
          </div>
          <div className="task-step">
            <span className="step-indent"> </span>
            <span className="step-icon">⚙️</span>
            <span className="step-name" style={styles.welcomeStepName}>
              {t("terminal.welcome.workflow")}
            </span>
          </div>
          <div className="task-step" style={styles.linksContainer}>
            <span className="step-indent"> </span>
            <span className="step-icon">🔗</span>
            <span className="step-name" style={styles.welcomeStepName}>
              <span
                onMouseEnter={() => setHoveredLink("github")}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={() => handleLinkClick("https://github.com/HippoxHQ")}
                style={getLinkStyle("github")}
              >
                GitHub
              </span>
              <span
                onMouseEnter={() => setHoveredLink("website")}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={() => handleLinkClick("https://hippox.vercel.app/")}
                style={getLinkStyle("website")}
              >
                Website
              </span>
              <span
                onMouseEnter={() => setHoveredLink("x")}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={() => handleLinkClick("https://x.com/HippoxAI")}
                style={getLinkStyle("x")}
              >
                X (Twitter)
              </span>
            </span>
          </div>
        </div>
        <div className="task-separator"></div>
      </div>
    );
  };

  const renderTaskRow = (task: TaskInfo) => {
    const isExpanded = expandedTasks.has(task.task_id);
    const successCount = task.steps.filter(
      (s) => s.status === "SUCCESS",
    ).length;
    const failureCount = task.steps.filter(
      (s) => s.status === "FAILURE",
    ).length;
    const runningCount = task.steps.filter(
      (s) => s.status === "RUNNING",
    ).length;
    let stepSummary = "";
    if (task.steps.length > 0) {
      const parts = [];
      if (successCount > 0) parts.push(`✓${successCount}`);
      if (failureCount > 0) parts.push(`✗${failureCount}`);
      if (runningCount > 0) parts.push(`⟳${runningCount}`);
      stepSummary = ` [${parts.join(" ")}]`;
    }
    return (
      <div key={task.task_id} className="task-row">
        <div
          className="task-row-header"
          onClick={() => toggleTaskExpand(task.task_id)}
        >
          <span className="task-expand-icon">{isExpanded ? "▼" : "▶"}</span>
          <span className="task-status-icon">
            {getTaskStatusIcon(task.status)}
          </span>
          <span className="task-time">[{formatTime(task.created_at)}]</span>
          <span className="task-input">📤 {task.user_input}</span>
          <span className="task-status-text">
            {task.status}
            {stepSummary}
          </span>
        </div>
        {isExpanded && task.steps.length > 0 && (
          <div className="task-steps">
            {task.steps.map((step) => (
              <div
                key={`${task.task_id}-step-${step.step_index}`}
                className="task-step"
              >
                <span className="step-indent"> </span>
                <span className="step-icon">
                  {getStepStatusIcon(step.status)}
                </span>
                <span className="step-name">🔧 {step.step_name}</span>
                <span
                  className={`step-status step-status-${step.status.toLowerCase()}`}
                >
                  {step.status}
                </span>
                {step.output && (
                  <div className="step-output">
                    <span className="step-indent"> </span>
                    <span className="output-text">{step.output}</span>
                  </div>
                )}
                {step.error && (
                  <div className="step-error">
                    <span className="step-indent"> </span>
                    <span className="error-text">❌ {step.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {isExpanded && task.final_output && task.status === "completed" && (
          <div className="task-final-output">
            <span className="step-indent"> </span>
            <span className="output-label">📝 Response:</span>
            <div className="output-content">{task.final_output}</div>
          </div>
        )}
        {isExpanded && task.status === "failed" && task.final_output && (
          <div className="task-error">
            <span className="step-indent"> </span>
            <span className="error-label">❌ Error:</span>
            <div className="error-content">{task.final_output}</div>
          </div>
        )}
        <div className="task-separator"></div>
      </div>
    );
  };
  return (
    <div className="terminal-panel">
      <div className="panel-header">
        <div className="header-title">
          <span className="title-icon">🖥️</span>
          <span>{t("terminal.title")}</span>
          <span className="task-count">
            {activeTasks.filter((t) => t.status === "running").length > 0 &&
              ` (${activeTasks.filter((t) => t.status === "running").length} running)`}
          </span>
        </div>
        <button
          className="clear-logs-btn"
          onClick={handleClearLogs}
          title={t("terminal.clear")}
        >
          🗑️
        </button>
      </div>

      <div className="terminal-content-wrapper">
        <div
          className="terminal-content"
          ref={terminalRef}
          onScroll={handleScroll}
        >
          {activeTasks.length === 0
            ? renderWelcomeMessage()
            : activeTasks.map((task) => renderTaskRow(task))}
        </div>
      </div>
    </div>
  );
};

export default TerminalPanel;
