import React, { useRef, useEffect, useState, useCallback, JSX } from "react";
import { hippoxCommands } from "../api/chat";
import { ExecutionLog, TaskInfo, UploadFile } from "../type";
import {
  ClearIcon,
  CollapseIcon,
  CopyIcon,
  ExpandArrowsIcon,
  TaskQueueIcon,
} from "../icons";
import { taskManager } from "../TaskManager";
import { HIPPOX_ASCII_LOGO } from "../config";
import { showToast, ToastType } from "./Toast";
import { filesCommands } from "../api/files";
import { open } from "@tauri-apps/plugin-shell";

interface TerminalPanelProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
  onFileClick?: (file: UploadFile) => void;
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
    cursor: "pointer" as const,
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
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    background: "var(--bg-tertiary, #2d2d2d)",
    border: "1px solid var(--border-color, #444)",
    color: "var(--text-secondary, #aaa)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    transition: "all 0.2s",
    flexShrink: 0,
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
    right: "0px",
    top: "40px",
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

const WELCOME_TASK_ID = "welcome";

const TerminalPanel: React.FC<TerminalPanelProps> = ({
  logs,
  onClearLogs,
  t,
  currentSessionId,
  onFileClick,
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
  const [allExpanded, setAllExpanded] = useState(true);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [bubblePosition, setBubblePosition] = useState({ right: 0, top: 0 });
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const activeTasks = tasks.filter(
    (task) => !currentSessionId || task.session_id === currentSessionId,
  );
  const [filesScrollStates, setFilesScrollStates] = useState<
    Map<string, { showLeft: boolean; showRight: boolean }>
  >(new Map());
  const filesScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const checkFilesScroll = useCallback((taskId: string) => {
    const scrollElement = filesScrollRefs.current.get(taskId);
    if (scrollElement) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
      const showLeft = scrollLeft > 0;
      const showRight = scrollLeft + clientWidth < scrollWidth - 1;
      setFilesScrollStates((prev) => {
        const newMap = new Map(prev);
        newMap.set(taskId, { showLeft, showRight });
        return newMap;
      });
    }
  }, []);

  const scrollFilesLeft = (taskId: string) => {
    const scrollElement = filesScrollRefs.current.get(taskId);
    if (scrollElement) {
      scrollElement.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollFilesRight = (taskId: string) => {
    const scrollElement = filesScrollRefs.current.get(taskId);
    if (scrollElement) {
      scrollElement.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  useEffect(() => {
    activeTasks.forEach((task) => {
      if ((task as any).files && (task as any).files.length > 0) {
        setTimeout(() => checkFilesScroll(task.task_id), 100);
      }
    });
  }, [activeTasks, checkFilesScroll]);

  useEffect(() => {
    const loadInitialTasks = () => {
      const initialTasks = taskManager.getAllTasks();
      setTasks(initialTasks);
    };
    loadInitialTasks();
    const unsubscribe = taskManager.subscribe(() => {
      const newTasks = taskManager.getAllTasks();
      setTasks([...newTasks]);
    });
    return unsubscribe;
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allTasks = [
    {
      task_id: "welcome",
      session_id: "welcome",
      user_input: "🎉 Hippox AI Runtime 已启动",
      status: "completed",
      steps: [],
      final_output: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as TaskInfo,
    ...activeTasks,
  ];

  const prevTaskCountRef = useRef(allTasks.length);

  const updateBubblePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelRect = buttonRef.current
        .closest(".terminal-panel")
        ?.getBoundingClientRect();
      if (panelRect) {
        setBubblePosition({
          right: panelRect.right - rect.right,
          top: rect.bottom - panelRect.top + 4,
        });
      }
    }
  }, []);

  const toggleAllTasks = () => {
    if (allExpanded) {
      setExpandedTasks(new Set());
      setAllExpanded(false);
    } else {
      const allTaskIds = new Set(allTasks.map((task) => task.task_id));
      setExpandedTasks(allTaskIds);
      setAllExpanded(true);
    }
  };

  useEffect(() => {
    const allTaskIds = new Set(allTasks.map((task) => task.task_id));
    setExpandedTasks(allTaskIds);
  }, []);

  useEffect(() => {
    if (terminalRef.current && allTasks.length > prevTaskCountRef.current) {
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, 50);
    }
    prevTaskCountRef.current = allTasks.length;
  }, [allTasks]);

  const checkScrollPosition = useCallback(() => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    setShowScrollTop(scrollTop > 100);
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 50);
  }, []);

  const updateActiveNavOnScroll = useCallback(() => {
    if (!terminalRef.current || allTasks.length === 0) return;
    const containerRect = terminalRef.current.getBoundingClientRect();
    let closestIndex = -1;
    let minDistance = Infinity;
    allTasks.forEach((task, idx) => {
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
  }, [allTasks]);

  const userScrolledUpRef = useRef(false);

  const handleScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;

    if (!isAtBottom) {
      userScrolledUpRef.current = true;
    } else {
      userScrolledUpRef.current = false;
    }

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
  }, [allTasks, updateActiveNavOnScroll]);

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
      const allTasksExpanded = allTasks.every((task) =>
        newSet.has(task.task_id),
      );
      setAllExpanded(allTasksExpanded);
      return newSet;
    });
  };

  useEffect(() => {
    const allTaskIds = new Set(allTasks.map((task) => task.task_id));
    setExpandedTasks(allTaskIds);
    setAllExpanded(true);
  }, []);

  const autoExpandedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeTasks.forEach((task) => {
      if (!autoExpandedRef.current.has(task.task_id)) {
        if (
          task.status === "failed" ||
          task.status === "running" ||
          task.status === "completed"
        ) {
          autoExpandedRef.current.add(task.task_id);
          setExpandedTasks((prev) => new Set(prev).add(task.task_id));
        }
      }
    });
  }, [activeTasks]);

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
      userScrolledUpRef.current = false;
      setAutoScroll(true);
    }
  };

  const scrollToTask = (index: number) => {
    const task = allTasks[index];
    if (task && taskRefs.current.has(task.task_id)) {
      taskRefs.current.get(task.task_id)?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
      setAutoScroll(false);
      setShowBubble(false);
      setTimeout(() => {
        checkScrollPosition();
        updateActiveNavOnScroll();
      }, 100);
    }
  };

  const handleButtonMouseEnter = () => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
    updateBubblePosition();
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

  const copyToClipboard = async (text: string | undefined) => {
    try {
      if (!text) {
        showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast(ToastType.SUCCESS, t("common.copied") || "Copied");
    } catch (err) {
      showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const renderWelcomeMessage = () => {
    const welcomeTime = new Date().toLocaleTimeString();
    const isExpanded = expandedTasks.has(WELCOME_TASK_ID);
    return (
      <div
        key={WELCOME_TASK_ID}
        className="task-row welcome-row"
        ref={(el) => {
          if (el) taskRefs.current.set(WELCOME_TASK_ID, el);
          else taskRefs.current.delete(WELCOME_TASK_ID);
        }}
      >
        <div
          className="task-row-header"
          style={styles.welcomeRowHeader}
          onClick={() => toggleTaskExpand(WELCOME_TASK_ID)}
        >
          <span className="task-expand-icon">{isExpanded ? "▼" : "▶"}</span>
          <span className="task-status-icon">🦛</span>
          <span className="task-time">[{welcomeTime}]</span>
          <span className="task-input">🎉 {t("terminal.welcome.title")}</span>
          <span className="task-status-text">ready</span>
        </div>
        {isExpanded && (
          <div
            className="task-steps welcome-steps"
            style={{ marginLeft: "5px" }}
          >
            <div className="task-step">
              <span className="step-icon">🚀</span>
              <span className="step-name" style={styles.welcomeStepName}>
                {t("terminal.welcome.subtitle")}
              </span>
            </div>
            <div className="step-output ascii-art" style={styles.asciiArt}>
              <pre style={styles.asciiPre}>{HIPPOX_ASCII_LOGO}</pre>
            </div>
            <div className="task-step">
              <span className="step-icon">💡</span>
              <span className="step-name" style={styles.welcomeStepName}>
                {t("terminal.welcome.status")}
              </span>
            </div>
          </div>
        )}
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

    const scrollState = filesScrollStates.get(task.task_id) || {
      showLeft: false,
      showRight: false,
    };

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
          <span
            className="task-status-text"
            style={task.status === "failed" ? { color: "#ff4444" } : {}}
          >
            {task.status}
            {stepSummary}
          </span>
        </div>

        {isExpanded &&
          (task as any).files &&
          (task as any).files.length > 0 && (
            <div className="task-files-scroll-container">
              <div className="task-files-scroll-wrapper">
                <div className="task-files-list-wrapper">
                  {scrollState.showLeft && (
                    <button
                      className="task-files-scroll-btn task-files-scroll-left"
                      onClick={() => scrollFilesLeft(task.task_id)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15 18L9 12L15 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                  <div
                    className="task-files-scroll"
                    ref={(el) => {
                      if (el) {
                        filesScrollRefs.current.set(task.task_id, el);
                        const checkScroll = () => {
                          const { scrollLeft, scrollWidth, clientWidth } = el;
                          const showLeft = scrollLeft > 0;
                          const showRight =
                            scrollLeft + clientWidth < scrollWidth - 1;
                          setFilesScrollStates((prev) => {
                            const newMap = new Map(prev);
                            newMap.set(task.task_id, { showLeft, showRight });
                            return newMap;
                          });
                        };
                        el.addEventListener("scroll", checkScroll);
                        setTimeout(checkScroll, 100);
                      } else {
                        filesScrollRefs.current.delete(task.task_id);
                      }
                    }}
                  >
                    {(task as any).files.map(
                      (file: UploadFile, idx: number) => (
                        <div
                          key={
                            file.id ||
                            `task_file_${task.task_id}_${idx}_${file.name}`
                          }
                          className="task-file-chip"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileClick?.(file);
                          }}
                        >
                          {file.type?.startsWith("image/") && file.preview ? (
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="task-file-preview-img"
                            />
                          ) : (
                            <div className="task-file-icon">
                              {file.type?.startsWith("image/")
                                ? "🖼️"
                                : file.type?.startsWith("video/")
                                  ? "🎬"
                                  : file.type === "application/pdf"
                                    ? "📄"
                                    : "📎"}
                            </div>
                          )}
                          <div className="task-file-info">
                            <span className="task-file-name" title={file.name}>
                              {file.name.length > 25
                                ? file.name.slice(0, 22) + "..."
                                : file.name}
                            </span>
                            <span className="task-file-size">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  {scrollState.showRight && (
                    <button
                      className="task-files-scroll-btn task-files-scroll-right"
                      onClick={() => scrollFilesRight(task.task_id)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 18L15 12L9 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        {isExpanded && task.steps.length > 0 && (
          <div className="task-steps">
            {task.steps.map((step) => (
              <div
                key={`${task.task_id}-step-${step.step_index}`}
                className="task-step"
              >
                <span className="step-icon">
                  {getStepStatusIcon(step.status)}
                </span>
                <span className="step-name">🔧 {step.step_name}</span>
                <span
                  className={`step-status step-status-${step.status.toLowerCase()}`}
                >
                  {step.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {isExpanded && task.final_output && task.status === "completed" && (
          <div className="task-final-output">
            <div
              className="output-header"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                className="output-label"
                style={{ color: "var(--text-primary)", fontWeight: 500 }}
              >
                📝 Response:
              </span>
              <button
                className="copy-output-btn"
                onClick={() => copyToClipboard(task.final_output)}
                title={t("common.copy") || "Copy"}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <CopyIcon size={12} /> {t("common.copy") || "Copy"}
              </button>
            </div>
            <div className="output-content">
              {renderContentWithLinks(task.final_output)}
            </div>
          </div>
        )}
        {isExpanded && task.status === "failed" && task.final_output && (
          <div className="task-error">
            <div
              className="error-header"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                className="error-label"
                style={{ color: "#ff6666", fontWeight: 500 }}
              >
                ❌ Error:
              </span>
              <button
                className="copy-error-btn"
                onClick={() => copyToClipboard(task.final_output)}
                title={t("common.copy") || "Copy"}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <CopyIcon size={12} /> {t("common.copy") || "Copy"}
              </button>
            </div>
            <div className="error-content">
              {renderContentWithLinks(task.final_output)}
            </div>
          </div>
        )}
        <div className="task-separator"></div>
      </div>
    );
  };

  const openUrl = async (url: string) => {
    try {
      open(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
      showToast(
        ToastType.ERROR,
        t("common.openUrlFailed", { url }) || `Unable to open link: ${url}`,
      );
    }
  };

  const handleOpenPath = async (path: string) => {
    try {
      await filesCommands.openPath(path);
    } catch (error) {
      showToast(
        ToastType.ERROR,
        t("common.openPathFailed", { path }) || `Unable to open: ${path}`,
      );
    }
  };

  const renderContentWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|ftp:\/\/[^\s]+|file:\/\/[^\s]+)/gi;
    const filePathRegex = /(?:[a-zA-Z]:)?[\\/][\w\-\.\\/]+(?:\.\w+)?/g;
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const matches: {
      index: number;
      endIndex: number;
      text: string;
      type: "url" | "file";
    }[] = [];
    let urlMatch: RegExpExecArray | null;
    urlRegex.lastIndex = 0;
    while ((urlMatch = urlRegex.exec(text)) !== null) {
      matches.push({
        index: urlMatch.index,
        endIndex: urlMatch.index + urlMatch[0].length,
        text: urlMatch[0],
        type: "url",
      });
    }
    let fileMatch: RegExpExecArray | null;
    filePathRegex.lastIndex = 0;
    while ((fileMatch = filePathRegex.exec(text)) !== null) {
      const isOverlap = matches.some(
        (m) =>
          (fileMatch!.index >= m.index && fileMatch!.index < m.endIndex) ||
          (fileMatch!.index + fileMatch![0].length > m.index &&
            fileMatch!.index + fileMatch![0].length <= m.endIndex),
      );
      if (!isOverlap && fileMatch[0].length > 3) {
        matches.push({
          index: fileMatch.index,
          endIndex: fileMatch.index + fileMatch[0].length,
          text: fileMatch[0],
          type: "file",
        });
      }
    }
    matches.sort((a, b) => a.index - b.index);
    let currentIndex = 0;
    for (const match of matches) {
      if (match.index > currentIndex) {
        parts.push(
          <span key={`text-${currentIndex}`}>
            {text.substring(currentIndex, match.index)}
          </span>,
        );
      }
      const isUrl = match.type === "url";
      parts.push(
        <span
          key={`link-${match.index}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isUrl) {
              openUrl(match.text);
            } else {
              handleOpenPath(match.text);
            }
          }}
          style={{
            color: "var(--accent-color, #00aaff)",
            textDecoration: "underline",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {match.text}
        </span>,
      );
      currentIndex = match.endIndex;
    }
    if (currentIndex < text.length) {
      parts.push(<span key={`text-end`}>{text.substring(currentIndex)}</span>);
    }
    return parts;
  };

  return (
    <div
      className="terminal-panel"
      style={{ position: "relative", height: "100%", overflow: "visible" }}
    >
      <style>{`
        .task-files-scroll-container {
          margin: 8px 0 4px 24px;
        }

        .task-files-scroll-wrapper {
          border-radius: 8px;
        }

        .task-files-list-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-tertiary);
          border-radius: 8px;
          padding: 0 4px;
        }

        .task-files-scroll-btn {
          flex-shrink: 0;
          width: 28px;
          height: 60px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          opacity: 0.8;
        }

        .task-files-scroll-btn:hover {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
          opacity: 1;
        }

        .task-files-scroll {
          flex: 1;
          display: flex;
          flex-wrap: nowrap;
          gap: 10px;
          overflow-x: auto;
          padding: 8px 4px;
          scrollbar-width: thin;
          scroll-behavior: smooth;
        }

        .task-files-scroll::-webkit-scrollbar {
          height: 4px;
        }

        .task-files-scroll::-webkit-scrollbar-track {
          background: var(--bg-tertiary);
          border-radius: 2px;
        }

        .task-files-scroll::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 2px;
        }

        .task-files-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }

        .task-file-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          min-width: 140px;
          max-width: 180px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .task-file-chip:hover {
          background: var(--hover-bg);
          border-color: var(--accent-color);
          transform: translateY(-1px);
        }

        .task-file-preview-img {
          width: 32px;
          height: 32px;
          object-fit: cover;
          border-radius: 4px;
        }

        .task-file-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          background: var(--bg-secondary);
          border-radius: 4px;
        }

        .task-file-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .task-file-name {
          font-size: 11px;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .task-file-size {
          font-size: 9px;
          color: var(--text-tertiary);
        }
      `}</style>
      <div
        className="panel-header"
        style={{ paddingTop: "8px", paddingBottom: "8px" }}
      >
        <div className="header-title">
          <span className="title-icon">🖥️</span>
          <span>{t("terminal.title")}</span>
          <span className="task-count">
            {activeTasks.filter((t) => t.status === "running").length > 0 &&
              ` (${activeTasks.filter((t) => t.status === "running").length} running)`}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            position: "relative",
          }}
        >
          <div
            ref={buttonRef}
            style={styles.taskListButton}
            onMouseEnter={handleButtonMouseEnter}
            onMouseLeave={handleButtonMouseLeave}
          >
            <TaskQueueIcon size={16} />
          </div>

          <button
            className="clear-logs-btn"
            onClick={toggleAllTasks}
            title={
              allExpanded ? t("terminal.collapseAll") : t("terminal.expandAll")
            }
          >
            {allExpanded ? (
              <ExpandArrowsIcon size={18} />
            ) : (
              <CollapseIcon size={18} />
            )}
          </button>
        </div>
      </div>

      <div
        className="terminal-content-wrapper"
        style={{
          position: "relative",
          height: "calc(100% - 48px)",
          overflow: "visible",
        }}
      >
        <div
          className="terminal-content"
          ref={terminalRef}
          onScroll={handleScroll}
          style={{
            height: "100%",
            overflowY: "auto",
            paddingLeft: "16px",
            paddingRight: "40px",
          }}
        >
          {renderWelcomeMessage()}
          {activeTasks.map((task, idx) => renderTaskRow(task, idx))}
        </div>
        <div style={styles.scrollButtonsContainer}>
          {showScrollTop && (
            <button
              style={styles.scrollButton}
              onClick={scrollToTop}
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
      {showBubble && allTasks.length > 0 && (
        <div
          style={{
            ...styles.bubbleContainer,
            position: "fixed",
            right: `${window.innerWidth - (buttonRef.current?.getBoundingClientRect().right ?? 0)}px`,
            top: `${(buttonRef.current?.getBoundingClientRect().bottom ?? 0) + 4}px`,
          }}
          onMouseEnter={handleBubbleMouseEnter}
          onMouseLeave={handleBubbleMouseLeave}
        >
          <div style={styles.bubbleHeader}>
            {t("terminal.taskList") || "任务列表"} ({allTasks.length})
          </div>
          <div style={styles.bubbleContent}>
            {allTasks.map((task, idx) => {
              const isActive = activeNavIndex === idx;
              const preview =
                task.task_id === WELCOME_TASK_ID
                  ? "🎉 Hippox AI Runtime 已启动"
                  : task.user_input.length > 45
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
                  <span style={styles.bubbleItemText} title={preview}>
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
    </div>
  );
};

export default TerminalPanel;
