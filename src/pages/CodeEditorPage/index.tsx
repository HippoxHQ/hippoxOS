import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../../core/TaskManager";
import { showTooltipOnElement } from "../../components/Tooltip";
import { CollapseAllIcon2, ExpandAllIcon2 } from "../../icons";
import CodingPage from "./Coding";
import { configCommands } from "../../command/config";
import HistoryCodeEditorChatPanel, {
  HistoryCodeEditorChatPanelRef,
} from "./HistoryCodeEditorChatPanel";
import CodeEditorChatPanel from "./CodeEditorChatPanel";
import { useCodeEditorSession } from "../../app/hooks/session/useCodeEditorChatSession";
import { codeEditorSessionCommands } from "../../command/session/codeeditor";
import { showToast, ToastType } from "../../components/Toast";
import CodeEditorWelcomePage from "./CodeEditorWelcomePage";

interface CodeEditorPageProps {
  layoutMode?: "horizontal" | "vertical";
  onLayoutModeChange?: (mode: "horizontal" | "vertical") => void;
  leftTitle?: string;
  rightTitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  t?: (key: string, params?: any) => string;
  isFunctionPanelMaximized?: boolean;
  onCloseSkillsManager?: () => void;
  theme?: "light" | "dark";
  i18n?: "en" | "zh-cn";
  onFileClick?: (file: any) => void;
  language?: "zh" | "en";
  onDragOverInputChange?: (isDragging: boolean) => void;
  executionLogs?: any[];
  onClearLogs?: () => void;
  isConfigLoaded?: boolean;
}

interface CollapsedTaskListProps {
  tasks: any[];
  activeNavIndex: number;
  onLocateTask: (idx: number) => void;
}

const CollapsedTaskList: React.FC<CollapsedTaskListProps> = ({
  tasks,
  activeNavIndex,
  onLocateTask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);

  const checkScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const canScrollUp = scrollTop > 0;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - 1;
    setShowUp(canScrollUp);
    setShowDown(canScrollDown);
  }, []);

  const updateScrollButtons = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollHeight, clientHeight } = containerRef.current;
    const canScroll = scrollHeight > clientHeight;
    if (canScroll) {
      requestAnimationFrame(() => {
        checkScroll();
      });
    } else {
      setShowUp(false);
      setShowDown(false);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      const resizeObserver = new ResizeObserver(() => {
        updateScrollButtons();
      });
      resizeObserver.observe(el);
      setTimeout(updateScrollButtons, 50);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, [checkScroll, updateScrollButtons]);

  useEffect(() => {
    setTimeout(updateScrollButtons, 100);
  }, [tasks]);

  const scrollUp = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: -200, behavior: "smooth" });
    }
  };

  const scrollDown = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: 200, behavior: "smooth" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "#ffa500";
      case "pending":
        return "#888";
      case "paused":
        return "#ffa500";
      case "completed":
        return "#4caf50";
      case "failed":
        return "#ff4444";
      default:
        return "var(--text-tertiary)";
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "running":
        return "🔄";
      case "pending":
        return "⏳";
      case "paused":
        return "⏸️";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "📌";
    }
  };

  const getDisplayText = (text: string): string => {
    if (!text) return "...";
    const clean = text.trim();
    if (clean.length <= 2) return clean;
    return clean.slice(0, 2);
  };

  if (tasks.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: 0,
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            textAlign: "center",
            padding: "8px 4px",
            writingMode: "vertical-rl",
            letterSpacing: "1px",
            opacity: 0.5,
          }}
        >
          No Tasks
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        minHeight: 0,
        position: "relative",
      }}
    >
      {showUp && (
        <button
          onClick={scrollUp}
          style={{
            width: "30px",
            height: "20px",
            borderRadius: "4px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            flexShrink: 0,
            padding: "0",
            margin: "0",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="Scroll Up"
        >
          ▲
        </button>
      )}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          padding: "4px 2px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          minHeight: 0,
        }}
        className="collapsed-task-list"
      >
        {tasks.map((task, idx) => {
          const isActive = idx === activeNavIndex;
          const preview = getDisplayText(task.user_input);
          return (
            <button
              key={task.task_id}
              onClick={() => onLocateTask(idx)}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                border: isActive
                  ? "1px solid var(--accent-color)"
                  : "1px solid transparent",
                background: isActive ? "var(--accent-color)" : "transparent",
                color: isActive ? "white" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontWeight: isActive ? 600 : 400,
                position: "relative",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "30px",
              }}
              title={task.user_input || "Task"}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--hover-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }
                showTooltipOnElement(
                  e.currentTarget,
                  task.user_input || "Task",
                );
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  right: "2px",
                  fontSize: "6px",
                  color: getStatusColor(task.status),
                }}
              >
                {getStatusEmoji(task.status)}
              </span>
              {preview}
            </button>
          );
        })}
      </div>
      {showDown && (
        <button
          onClick={scrollDown}
          style={{
            width: "30px",
            height: "20px",
            borderRadius: "4px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            flexShrink: 0,
            padding: "0",
            margin: "0",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="Scroll Down"
        >
          ▼
        </button>
      )}
      <style>{`
        .collapsed-task-list::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

interface CollapsedHistoryListProps {
  sessions: any[];
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
}

const CollapsedHistoryList: React.FC<CollapsedHistoryListProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);

  const sortedSessions = React.useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aTs = new Date(a.created_at).getTime();
      const bTs = new Date(b.created_at).getTime();
      return bTs - aTs;
    });
  }, [sessions]);

  const checkScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const canScrollUp = scrollTop > 0;
    const canScrollDown = scrollTop + clientHeight < scrollHeight - 1;
    setShowUp(canScrollUp);
    setShowDown(canScrollDown);
  }, []);

  const updateScrollButtons = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollHeight, clientHeight } = containerRef.current;
    const canScroll = scrollHeight > clientHeight;
    if (canScroll) {
      requestAnimationFrame(() => {
        checkScroll();
      });
    } else {
      setShowUp(false);
      setShowDown(false);
    }
  }, [checkScroll]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      const resizeObserver = new ResizeObserver(() => {
        updateScrollButtons();
      });
      resizeObserver.observe(el);
      setTimeout(updateScrollButtons, 50);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, [checkScroll, updateScrollButtons]);

  useEffect(() => {
    setTimeout(updateScrollButtons, 100);
  }, [sessions, updateScrollButtons]);

  const scrollUp = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: -200, behavior: "smooth" });
    }
  };

  const scrollDown = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: 200, behavior: "smooth" });
    }
  };

  const getDisplayText = (text: string): string => {
    if (!text) return "...";
    const clean = text.trim();
    if (clean.length <= 2) return clean;
    return clean.slice(0, 2);
  };

  if (sessions.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: 0,
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            textAlign: "center",
            padding: "8px 4px",
            writingMode: "vertical-rl",
            letterSpacing: "1px",
            opacity: 0.5,
          }}
        >
          No History
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        minHeight: 0,
        position: "relative",
      }}
    >
      {showUp && (
        <button
          onClick={scrollUp}
          style={{
            width: "30px",
            height: "20px",
            borderRadius: "4px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            flexShrink: 0,
            padding: "0",
            margin: "0",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="Scroll Up"
        >
          ▲
        </button>
      )}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          padding: "4px 2px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          minHeight: 0,
        }}
        className="collapsed-history-list"
      >
        {sortedSessions.map((session) => {
          const isActive = currentSessionId === session.session_id;
          const preview = getDisplayText(session.title || "Untitled");
          return (
            <button
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                border: isActive
                  ? "1px solid var(--accent-color)"
                  : "1px solid transparent",
                background: isActive ? "var(--accent-color)" : "transparent",
                color: isActive ? "white" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontWeight: isActive ? 600 : 400,
                position: "relative",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "30px",
              }}
              title={session.title || "Untitled"}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--hover-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }
                showTooltipOnElement(
                  e.currentTarget,
                  session.title || "Untitled",
                );
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              {session.is_pinned && (
                <span
                  style={{
                    position: "absolute",
                    top: "1px",
                    right: "1px",
                    fontSize: "6px",
                    color: isActive
                      ? "rgba(255,255,255,0.8)"
                      : "var(--accent-color)",
                  }}
                >
                  📌
                </span>
              )}
              {preview}
            </button>
          );
        })}
      </div>
      {showDown && (
        <button
          onClick={scrollDown}
          style={{
            width: "30px",
            height: "20px",
            borderRadius: "4px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            flexShrink: 0,
            padding: "0",
            margin: "0",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="Scroll Down"
        >
          ▼
        </button>
      )}
      <style>{`
        .collapsed-history-list::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

const CodeEditorPage: React.FC<CodeEditorPageProps> = ({
  layoutMode = "vertical",
  onLayoutModeChange,
  leftTitle = "Chat",
  rightTitle = "Code Editor",
  leftIcon = "💬",
  rightIcon = "💻",
  t = (key: string) => key,
  isFunctionPanelMaximized = false,
  onCloseSkillsManager,
  theme = "dark",
  i18n = "en",
  onFileClick,
  language = "en",
  onDragOverInputChange,
  executionLogs,
  onClearLogs,
  isConfigLoaded = true,
}) => {
  const {
    currentSessionId,
    handleSendMessage: handleSendMessageHook,
    handleSwitchSession,
    handleNewSession,
    shouldShowWelcome,
    createSessionWithWorkspace,
  } = useCodeEditorSession(
    language as "zh" | "en",
    isConfigLoaded,
    onCloseSkillsManager,
  );

  const [chatPanelWidth, setChatPanelWidth] = useState<number>(400);
  const [historyWidth, setHistoryWidth] = useState<number>(280);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState<boolean>(false);
  const [historyCollapsed, setHistoryCollapsed] = useState<boolean>(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [isResizeHover, setIsResizeHover] = useState(false);
  const [isHistoryResizeHover, setIsHistoryResizeHover] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isHistoryAtBottom, setIsHistoryAtBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HistoryCodeEditorChatPanelRef>(null);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const isDragging = useRef(false);
  const dragType = useRef<"horizontal" | "history">("horizontal");
  const dragStartX = useRef(0);
  const dragStartHistoryWidth = useRef(0);
  const dragStartChatPanelWidth = useRef(400);
  const dragStartContainerRect = useRef<DOMRect | null>(null);
  const [layoutSwapMode, setLayoutSwapMode] = useState<
    "terminal-left" | "chat-left"
  >("terminal-left");
  const isChatOnLeft = layoutSwapMode === "terminal-left";
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const hasHistorySessions = historySessions.length > 0;

  const handleSendMessage = useCallback(
    (
      message: string,
      sessionId: string,
      files?: any[],
      workflowMode?: string,
    ) => {
      handleSendMessageHook(message, sessionId, files, workflowMode);
    },
    [handleSendMessageHook],
  );

  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      handleSwitchSession(sessionId);
    },
    [handleSwitchSession],
  );

  const handleNewSessionClick = useCallback(() => {
    handleNewSession();
  }, [handleNewSession]);

  const handleToggleChatPanel = () => {
    if (isFunctionPanelMaximized) return;
    setChatPanelCollapsed(!chatPanelCollapsed);
    saveChatPanelCollapsed(!chatPanelCollapsed);
  };

  const loadWorkspacePath = useCallback(async (sessionId: string) => {
    if (
      !sessionId ||
      sessionId.startsWith("pending_") ||
      sessionId.startsWith("temp_")
    ) {
      setWorkspacePath(null);
      return;
    }
    try {
      const config =
        await codeEditorSessionCommands.loadCodeEditorSessionConfig(sessionId);
      console.log("[CodeEditorPage] Loaded session config:", config);
      if (config && config.workspace_path) {
        setWorkspacePath(config.workspace_path);
        console.log(
          "[CodeEditorPage] Workspace path set to:",
          config.workspace_path,
        );
      } else {
        setWorkspacePath(null);
      }
    } catch (error) {
      console.error("[CodeEditorPage] Failed to load workspace path:", error);
      setWorkspacePath(null);
    }
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadWorkspacePath(currentSessionId);
    } else {
      setWorkspacePath(null);
    }
  }, [currentSessionId, loadWorkspacePath]);

  const handleNewSessionWithWorkspace = useCallback(
    async (workspacePath: string) => {
      const sessionId = `codeeditor_session_${Date.now()}`;
      const pathParts = workspacePath.split(/[\\/]/);
      const title = pathParts[pathParts.length - 1] || "Code Editor";
      const description = `Workspace: ${workspacePath}`;

      await codeEditorSessionCommands.createCodeEditorSession(
        sessionId,
        title,
        description,
        [],
        [],
        "ReAct",
        workspacePath,
      );

      handleSwitchSession(sessionId);
      window.dispatchEvent(new CustomEvent("codeeditor-session-created"));
      localStorage.setItem("codeeditor-last-workspace", workspacePath);
    },
    [handleSwitchSession],
  );

  const loadHistorySessions = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const list = await codeEditorSessionCommands.listCodeEditorSessions();
      setHistorySessions(list);
    } catch (error) {
      console.error("Failed to load history sessions:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  
  const handleSelectWorkspace = useCallback(
    async (workspacePath: string, workspaceType: "directory" | "file") => {
      setIsCreatingSession(true);
      try {
        await createSessionWithWorkspace(workspacePath, workspaceType);
        await loadHistorySessions();
        if (currentSessionId) {
          await loadWorkspacePath(currentSessionId);
        }
        showToast(
          ToastType.SUCCESS,
          language === "zh"
            ? `已打开: ${workspacePath}`
            : `Opened: ${workspacePath}`,
        );
      } catch (error) {
        console.error("Failed to create session with workspace:", error);
        showToast(
          ToastType.ERROR,
          language === "zh" ? `打开失败: ${error}` : `Failed to open: ${error}`,
        );
      } finally {
        setIsCreatingSession(false);
      }
    },
    [
      language,
      createSessionWithWorkspace,
      loadHistorySessions,
      currentSessionId,
      loadWorkspacePath,
    ],
  );

  useEffect(() => {
    loadHistorySessions();
  }, [loadHistorySessions]);

  useEffect(() => {
    const loadLayoutMode = async () => {
      try {
        const mode = await configCommands.getSettingsCodeEditorLayoutSwapMode();
        if (mode === "terminal-left" || mode === "chat-left") {
          setLayoutSwapMode(mode);
        }
      } catch (error) {
        console.error("Failed to load code editor layout mode:", error);
      }
    };
    loadLayoutMode();
  }, []);

  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { pageType, mode } = event.detail;
      if (pageType === "codeeditor") {
        setLayoutSwapMode(mode);
      }
    };
    window.addEventListener(
      "layout-swap-mode-changed",
      handleLayoutChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "layout-swap-mode-changed",
        handleLayoutChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const handleSessionCreated = () => {
      historyPanelRef.current?.refreshSessions();
      loadHistorySessions();
    };
    window.addEventListener("codeeditor-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener(
        "codeeditor-session-created",
        handleSessionCreated,
      );
    };
  }, [loadHistorySessions]);

  useEffect(() => {
    const handleTitleUpdated = () => {
      historyPanelRef.current?.refreshSessions();
      loadHistorySessions();
    };
    window.addEventListener("session-title-updated", handleTitleUpdated);
    return () => {
      window.removeEventListener("session-title-updated", handleTitleUpdated);
    };
  }, [loadHistorySessions]);

  useEffect(() => {
    const savedHistoryWidth = localStorage.getItem(
      "hippox-codeeditor-history-width",
    );
    const savedHistoryCollapsed = localStorage.getItem(
      "hippox-codeeditor-history-collapsed",
    );
    const savedChatPanelCollapsed = localStorage.getItem(
      "hippox-codeeditor-chat-collapsed",
    );
    const savedChatPanelWidth = localStorage.getItem(
      "hippox-codeeditor-chat-width",
    );
    if (savedHistoryWidth) setHistoryWidth(parseFloat(savedHistoryWidth));
    if (savedHistoryCollapsed)
      setHistoryCollapsed(savedHistoryCollapsed === "true");
    if (savedChatPanelCollapsed)
      setChatPanelCollapsed(savedChatPanelCollapsed === "true");
    if (savedChatPanelWidth) setChatPanelWidth(parseFloat(savedChatPanelWidth));
  }, []);

  const saveHistoryWidth = (width: number) => {
    localStorage.setItem("hippox-codeeditor-history-width", width.toString());
  };

  const saveHistoryCollapsed = (collapsed: boolean) => {
    localStorage.setItem(
      "hippox-codeeditor-history-collapsed",
      collapsed.toString(),
    );
  };

  const saveChatPanelCollapsed = (collapsed: boolean) => {
    localStorage.setItem(
      "hippox-codeeditor-chat-collapsed",
      collapsed.toString(),
    );
  };

  const saveChatPanelWidth = (width: number) => {
    localStorage.setItem("hippox-codeeditor-chat-width", width.toString());
  };

  const handleExpandToggle = () => {
    const newExpanded = !isHistoryExpanded;
    setIsHistoryExpanded(newExpanded);
    if (newExpanded) {
      historyPanelRef.current?.expandAll();
    } else {
      historyPanelRef.current?.collapseAll();
    }
  };

  const handleScrollToggle = () => {
    const newAtBottom = !isHistoryAtBottom;
    setIsHistoryAtBottom(newAtBottom);
    if (newAtBottom) {
      historyPanelRef.current?.scrollToBottom();
    } else {
      historyPanelRef.current?.scrollToTop();
    }
  };

  const handleToggleHistory = () => {
    setHistoryCollapsed(!historyCollapsed);
    saveHistoryCollapsed(!historyCollapsed);
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    type: "horizontal" | "history",
  ) => {
    if (chatPanelCollapsed || isFunctionPanelMaximized) return;
    if (type === "history" && historyCollapsed) return;

    isDragging.current = true;
    dragType.current = type;
    dragStartX.current = e.clientX;
    dragStartHistoryWidth.current = historyCollapsed ? 45 : historyWidth;
    dragStartChatPanelWidth.current = chatPanelWidth;
    dragStartContainerRect.current =
      containerRef.current?.getBoundingClientRect() || null;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const containerRect =
      dragStartContainerRect.current ||
      containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    if (dragType.current === "horizontal") {
      const historyWidthPx = dragStartHistoryWidth.current;
      const mainAreaWidth = containerWidth - historyWidthPx;
      if (mainAreaWidth <= 0) return;
      const startWidthPx = dragStartChatPanelWidth.current;
      let newWidthPx = startWidthPx + deltaX;
      const minWidthPx = 200;
      const maxWidthPx = mainAreaWidth * 0.6;
      newWidthPx = Math.max(minWidthPx, Math.min(maxWidthPx, newWidthPx));
      setChatPanelWidth(newWidthPx);
      saveChatPanelWidth(newWidthPx);
    } else if (dragType.current === "history") {
      const newWidth = dragStartHistoryWidth.current + deltaX;
      const clamped = Math.min(400, Math.max(180, newWidth));
      setHistoryWidth(clamped);
      saveHistoryWidth(clamped);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const getHistoryPanelContent = () => {
    if (historyCollapsed || isFunctionPanelMaximized) {
      return (
        <div
          className="collapsed-sidebar"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "45px",
            minWidth: "45px",
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border-color)",
            overflow: "hidden",
            flexShrink: 0,
            height: "100%",
          }}
        >
          <div
            style={{
              borderBottom: "1px solid var(--border-color)",
              padding: "4px 0px",
              width: "100%",
              display: "flex",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <button
              className="collapse-toggle-btn"
              onClick={handleToggleHistory}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "15px",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.color = "var(--text-primary)";
                showTooltipOnElement(e.currentTarget, "Expand History");
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              title="Expand History"
            >
              ≫
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              color: "var(--text-tertiary)",
              flexShrink: 0,
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            <span style={{ fontSize: "16px" }}>📜</span>
          </div>
          <CollapsedHistoryList
            sessions={historySessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSessionSelect}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          flex: 1,
          minWidth: "180px",
          userSelect: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 12px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            flexShrink: 0,
            minHeight: "40px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {t("menu.history") || "History"}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              flexShrink: 0,
            }}
          >
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "25px",
                color: "var(--text-secondary)",
                padding: "2px 6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                width: "28px",
                height: "28px",
              }}
              onClick={handleNewSessionClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              title={t("history.newSession") || "New Session"}
            >
              +
            </button>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: "var(--text-secondary)",
                padding: "2px 6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                width: "28px",
                height: "28px",
              }}
              onClick={handleExpandToggle}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              title={
                isHistoryExpanded
                  ? t("history.collapseAll")
                  : t("history.expandAll")
              }
            >
              {isHistoryExpanded ? (
                <CollapseAllIcon2 size={16} />
              ) : (
                <ExpandAllIcon2 size={16} />
              )}
            </button>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: "var(--text-secondary)",
                padding: "2px 6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                width: "28px",
                height: "28px",
              }}
              onClick={handleScrollToggle}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              title={
                isHistoryAtBottom
                  ? t("history.scrollToTop")
                  : t("history.scrollToBottom")
              }
            >
              {isHistoryAtBottom ? "▲" : "▼"}
            </button>
            <div
              style={{
                width: "1px",
                height: "16px",
                background: "var(--border-color)",
                margin: "0 2px",
                flexShrink: 0,
              }}
            />
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: "var(--text-secondary)",
                padding: "2px 6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                width: "28px",
                height: "28px",
              }}
              onClick={handleToggleHistory}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              title={t("history.collapse")}
            >
              ◀
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <HistoryCodeEditorChatPanel
            ref={historyPanelRef}
            t={t}
            onSessionSelect={handleSessionSelect}
            currentSessionId={currentSessionId}
            onNewSession={handleNewSessionClick}
          />
        </div>
      </div>
    );
  };

  const historyPanelContent = getHistoryPanelContent();
  const historyWidthPx =
    historyCollapsed || isFunctionPanelMaximized ? 45 : historyWidth;

  const chatPanel = (
    <CodeEditorChatPanel
      onSendMessage={handleSendMessage}
      onFileClick={onFileClick}
      t={t}
      currentSessionId={currentSessionId}
      onDragOverInputChange={onDragOverInputChange}
      language={language}
      isLeftPanel={isChatOnLeft}
    />
  );

  const codeEditorPanel = (
    <div
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <CodingPage t={t} onClose={() => {}} workspacePath={workspacePath} />
    </div>
  );

  const collapsedChatSidebar = (
    <div
      className="collapsed-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "45px",
        minWidth: "45px",
        background: "var(--bg-secondary)",
        borderRight: isChatOnLeft ? "1px solid var(--border-color)" : "none",
        borderLeft: !isChatOnLeft ? "1px solid var(--border-color)" : "none",
        overflow: "hidden",
        flexShrink: 0,
        height: "100%",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid var(--border-color)",
          padding: "4px 0px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <button
          className="collapse-toggle-btn"
          onClick={handleToggleChatPanel}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "15px",
            padding: "6px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title={isChatOnLeft ? "向右展开" : "向左展开"}
        >
          {isChatOnLeft ? "≫" : "≪"}
        </button>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          fontSize: "10px",
          color: "var(--text-tertiary)",
          flexShrink: 0,
          paddingTop: "8px",
          paddingBottom: "8px",
        }}
      >
        <span style={{ fontSize: "16px" }}>{leftIcon}</span>
      </div>
      <CollapsedTaskList
        tasks={taskManager.getAllTasks()}
        activeNavIndex={activeNavIndex}
        onLocateTask={(idx) => {
          const task = taskManager.getAllTasks()[idx];
          if (task) {
            window.dispatchEvent(
              new CustomEvent("locate-task-in-terminal", {
                detail: { taskId: task.task_id },
              }),
            );
            window.dispatchEvent(
              new CustomEvent("locate-task-in-chat", {
                detail: { taskId: task.task_id },
              }),
            );
            setActiveNavIndex(idx);
          }
        }}
      />
    </div>
  );

  if (isLoadingHistory) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          color: "var(--text-muted)",
          background: "var(--bg-primary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "2px solid var(--border-color)",
              borderTop: "2px solid var(--accent-color)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <div>{t("common.loading") || "Loading..."}</div>
        </div>
      </div>
    );
  }

  if (!hasHistorySessions) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          background: "var(--bg-primary)",
        }}
      >
        <CodeEditorWelcomePage
          t={t}
          language={language}
          onSelectWorkspace={handleSelectWorkspace}
          isLoading={isCreatingSession}
        />
      </div>
    );
  }

  return (
    <div
      className="panels-container horizontal-layout"
      ref={containerRef}
      style={{ display: "flex", flex: 1, overflow: "hidden" }}
    >
      <style>{`
        .resize-handle-vertical {
          position: relative;
          z-index: 1;
        }
        .resize-handle-vertical::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
        .resize-handle-history {
          position: relative;
          z-index: 1;
        }
        .resize-handle-history::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
        .collapsed-sidebar {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 45px;
          min-width: 45px;
          background: var(--bg-secondary);
          overflow: hidden;
          flex-shrink: 0;
          height: 100%;
        }
        .collapsed-history-list::-webkit-scrollbar,
        .collapsed-task-list::-webkit-scrollbar {
          display: none;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {!isFunctionPanelMaximized && (
        <>
          <div
            className="panel-history"
            style={{
              flex: historyCollapsed ? "0 0 45px" : "0 0 auto",
              width: historyCollapsed ? "45px" : `${historyWidth}px`,
              overflow: "hidden",
              minWidth: historyCollapsed ? "45px" : "180px",
              display: "flex",
              flexDirection: "row",
              borderRight: "1px solid var(--border-color)",
            }}
          >
            {historyPanelContent}
          </div>
          {!historyCollapsed && (
            <div
              className="resize-handle resize-handle-history"
              onMouseDown={(e) => handleMouseDown(e, "history")}
              style={{
                width: "3px",
                background: isHistoryResizeHover
                  ? "var(--scrollbar-thumb)"
                  : "var(--border-color)",
                cursor: "col-resize",
                flexShrink: 0,
                position: "relative",
                transition: "width 0.15s, background 0.15s",
              }}
              onMouseEnter={() => setIsHistoryResizeHover(true)}
              onMouseLeave={() => setIsHistoryResizeHover(false)}
            >
              {isHistoryResizeHover && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "2px",
                    height: "40px",
                    background: "var(--text-muted)",
                    borderRadius: "2px",
                    opacity: 0.5,
                    zIndex: 11,
                  }}
                />
              )}
            </div>
          )}
        </>
      )}

      {!chatPanelCollapsed && !isFunctionPanelMaximized ? (
        <div
          className="panel-chat"
          style={{
            flex: "0 0 auto",
            width: `${chatPanelWidth}px`,
            overflow: "hidden",
            minWidth: "200px",
            display: "flex",
            flexDirection: "row",
            borderRight: isChatOnLeft
              ? "1px solid var(--border-color)"
              : "none",
            borderLeft: !isChatOnLeft
              ? "1px solid var(--border-color)"
              : "none",
            order: isChatOnLeft ? 1 : 3,
          }}
        >
          {React.cloneElement(chatPanel as React.ReactElement<any>, {
            isCollapsed: false,
            togglePanel: handleToggleChatPanel,
            collapseIcon: isChatOnLeft ? "≪" : "≫",
            isLeftPanel: isChatOnLeft,
          })}
        </div>
      ) : !isFunctionPanelMaximized ? (
        <div
          style={{
            flex: "0 0 45px",
            order: isChatOnLeft ? 1 : 3,
          }}
        >
          {collapsedChatSidebar}
        </div>
      ) : null}

      {!chatPanelCollapsed && !isFunctionPanelMaximized && (
        <div
          className="resize-handle resize-handle-vertical"
          onMouseDown={(e) => handleMouseDown(e, "horizontal")}
          style={{
            width: "3px",
            background: isResizeHover
              ? "var(--scrollbar-thumb)"
              : "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
            transition: "width 0.15s, background 0.15s",
            order: isChatOnLeft ? 2 : 2,
          }}
          onMouseEnter={() => setIsResizeHover(true)}
          onMouseLeave={() => setIsResizeHover(false)}
        >
          {isResizeHover && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "2px",
                height: "40px",
                background: "var(--text-muted)",
                borderRadius: "2px",
                opacity: 0.5,
                zIndex: 11,
              }}
            />
          )}
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflow: "hidden",
          minWidth: "150px",
          display: "flex",
          flexDirection: "row",
          order: isChatOnLeft ? 3 : 1,
        }}
      >
        {codeEditorPanel}
      </div>
    </div>
  );
};

export default CodeEditorPage;
