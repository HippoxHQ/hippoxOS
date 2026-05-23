import React, { useRef, useEffect, useState, useCallback } from "react";
import { hippoxCommands } from "../api/chat";
import { ExecutionLog, TaskInfo } from "../type";
import { ClearIcon, TaskQueueIcon } from "../icons";

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
  scrollButtonsContainer: {
    position: "absolute" as const,
    right: "12px",
    bottom: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    zIndex: 10,
  },
  taskListButton: {
    position: "absolute" as const,
    left: "12px",
    top: "12px",
    width: "40px",
    height: "40px",
    borderRadius: "20px",
    background: "var(--bg-tertiary, #2d2d2d)",
    border: "1px solid var(--border-color, #444)",
    color: "var(--text-secondary, #aaa)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    transition: "all 0.2s",
    backdropFilter: "blur(4px)",
    zIndex: 10,
  },
  scrollButton: {
    width: "32px",
    height: "32px",
    borderRadius: "16px",
    background: "var(--bg-tertiary, #2d2d2d)",
    border: "1px solid var(--border-color, #444)",
    color: "var(--text-secondary, #aaa)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    transition: "all 0.2s",
    backdropFilter: "blur(4px)",
  },
  bubbleContainer: {
    position: "absolute" as const,
    left: "52px",
    top: "12px",
    minWidth: "300px",
    maxWidth: "360px",
    maxHeight: "600px",
    background: "var(--bg-secondary, #1e1e1e)",
    border: "1px solid var(--border-color, #333)",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    overflow: "hidden",
    zIndex: 100,
    pointerEvents: "auto" as const,
  },
  bubbleHeader: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--border-color, #333)",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary, #aaa)",
    background: "var(--bg-tertiary, #252525)",
  },
  bubbleContent: {
    maxHeight: "340px",
    overflowY: "auto" as const,
    padding: "8px 0",
  },
  bubbleItem: {
    padding: "8px 12px",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.15s",
    borderLeft: "2px solid transparent",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  bubbleItemHover: {
    background: "var(--hover-bg, #2a2a2a)",
    borderLeftColor: "var(--accent-color, #00aaff)",
  },
  bubbleItemActive: {
    background: "var(--hover-bg, #2a2a2a)",
    borderLeftColor: "var(--accent-color, #00aaff)",
  },
  bubbleItemIcon: {
    fontSize: "14px",
    flexShrink: 0,
  },
  bubbleItemText: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    color: "var(--text-primary, #fff)",
  },
  bubbleItemStatus: {
    fontSize: "10px",
    color: "var(--text-tertiary, #888)",
    flexShrink: 0,
  },
};

const TerminalPanel: React.FC<TerminalPanelProps> = ({
  logs,
  onClearLogs,
  t,
  activeTasks = [],
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [showBubble, setShowBubble] = useState(false);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
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
  const checkScrollPosition = useCallback(() => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    setShowScrollTop(scrollTop > 100);
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 50);
  }, []);
  const updateActiveNavOnScroll = useCallback(() => {
    if (!terminalRef.current || activeTasks.length === 0) return;
    const containerRect = terminalRef.current.getBoundingClientRect();
    let closestIndex = -1;
    let minDistance = Infinity;
    activeTasks.forEach((task, idx) => {
      const taskElement = taskRefs.current.get(task.task_id);
      if (taskElement) {
        const rect = taskElement.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerRect.top);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = idx;
        }
      }
    });
    setActiveNavIndex(closestIndex);
  }, [activeTasks]);
  const handleScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 10;
    setAutoScroll(isAtBottom);
    checkScrollPosition();
    updateActiveNavOnScroll();
  };
  useEffect(() => {
    const element = terminalRef.current;
    if (element) {
      element.addEventListener("scroll", handleScroll);
      checkScrollPosition();
      return () => element.removeEventListener("scroll", handleScroll);
    }
  }, [checkScrollPosition]);
  useEffect(() => {
    updateActiveNavOnScroll();
  }, [activeTasks, updateActiveNavOnScroll]);
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
  const scrollToTop = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({ top: 0, behavior: "auto" });
      setAutoScroll(false);
      setTimeout(() => {
        checkScrollPosition();
      }, 100);
    }
  };
  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: "smooth",
      });
      setAutoScroll(true);
    }
  };
  const scrollToTask = (index: number) => {
    const task = activeTasks[index];
    if (task && taskRefs.current.has(task.task_id)) {
      taskRefs.current.get(task.task_id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setAutoScroll(false);
      setShowBubble(false);
    }
  };
  const handleButtonMouseEnter = () => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
    setShowBubble(true);
  };
  const handleButtonMouseLeave = () => {
    bubbleTimerRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 200);
  };
  const handleBubbleMouseEnter = () => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
  };
  const handleBubbleMouseLeave = () => {
    setShowBubble(false);
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

  const getTaskStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("terminal.status.completed") || "已完成";
      case "failed":
        return t("terminal.status.failed") || "失败";
      case "running":
        return t("terminal.status.running") || "执行中";
      case "pending":
        return t("terminal.status.pending") || "等待中";
      default:
        return status;
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

  const renderTaskRow = (task: TaskInfo, index: number) => {
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
      <div
        key={task.task_id}
        className="task-row"
        ref={(el) => {
          if (el) taskRefs.current.set(task.task_id, el);
          else taskRefs.current.delete(task.task_id);
        }}
      >
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
                {/* {step.output && (
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
                )} */}
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
    <div
      className="terminal-panel"
      style={{ position: "relative", height: "100%" }}
    >
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
          <ClearIcon size={16} />
        </button>
      </div>
      <div
        className="terminal-content-wrapper"
        style={{ position: "relative", height: "calc(100% - 48px)" }}
      >
        <div
          className="terminal-content"
          ref={terminalRef}
          onScroll={handleScroll}
          style={{
            height: "100%",
            overflowY: "auto",
            paddingLeft: "55px",
            paddingRight: "40px",
          }}
        >
          {activeTasks.length === 0
            ? renderWelcomeMessage()
            : activeTasks.map((task, idx) => renderTaskRow(task, idx))}
        </div>
        {activeTasks.length > 0 && (
          <div
            style={styles.taskListButton}
            onMouseEnter={handleButtonMouseEnter}
            onMouseLeave={handleButtonMouseLeave}
          >
            <TaskQueueIcon size={16} />
          </div>
        )}
        {showBubble && activeTasks.length > 0 && (
          <div
            style={styles.bubbleContainer}
            onMouseEnter={handleBubbleMouseEnter}
            onMouseLeave={handleBubbleMouseLeave}
          >
            <div style={styles.bubbleHeader}>
              {t("terminal.taskList") || "任务列表"} ({activeTasks.length})
            </div>
            <div style={styles.bubbleContent}>
              {activeTasks.map((task, idx) => {
                const isActive = activeNavIndex === idx;
                const preview =
                  task.user_input.length > 45
                    ? task.user_input.substring(0, 45) + "..."
                    : task.user_input;
                return (
                  <div
                    key={task.task_id}
                    style={{
                      ...styles.bubbleItem,
                      ...(isActive ? styles.bubbleItemActive : {}),
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--hover-bg, #2a2a2a)";
                      e.currentTarget.style.borderLeftColor =
                        "var(--accent-color, #00aaff)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "";
                        e.currentTarget.style.borderLeftColor = "transparent";
                      }
                    }}
                    onClick={() => scrollToTask(idx)}
                  >
                    <span style={styles.bubbleItemIcon}>
                      {getTaskStatusIcon(task.status)}
                    </span>
                    <span style={styles.bubbleItemText} title={task.user_input}>
                      {preview}
                    </span>
                    <span style={styles.bubbleItemStatus}>
                      {getTaskStatusText(task.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={styles.scrollButtonsContainer}>
          {showScrollTop && (
            <button
              style={styles.scrollButton}
              onClick={scrollToTop}
              title="滚动到顶部"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #3d3d3d)";
                e.currentTarget.style.color = "var(--text-primary, #fff)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "var(--bg-tertiary, #2d2d2d)";
                e.currentTarget.style.color = "var(--text-secondary, #aaa)";
              }}
            >
              ▲
            </button>
          )}
          {showScrollBottom && (
            <button
              style={styles.scrollButton}
              onClick={scrollToBottom}
              title="滚动到底部"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #3d3d3d)";
                e.currentTarget.style.color = "var(--text-primary, #fff)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "var(--bg-tertiary, #2d2d2d)";
                e.currentTarget.style.color = "var(--text-secondary, #aaa)";
              }}
            >
              ▼
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalPanel;
