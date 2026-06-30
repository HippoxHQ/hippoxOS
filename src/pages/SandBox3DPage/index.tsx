import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../../core/TaskManager";
import { TaskStatusEnum } from "../../core/types";
import { showTooltipOnElement } from "../../components/Tooltip";
import {
  CollapseAllIcon2,
  ExpandAllIcon2,
  MessageCircleIcon,
  ScrollTextIcon,
} from "../../icons";
import SandBox3DChatPanel from "./SandBox3DChatPanel";
import HistorySandBox3DChatPanel, {
  HistorySandBox3DChatPanelRef,
} from "./HistorySandBox3DChatPanel";
import { configCommands } from "../../command/config";
import { useSandBox3DSession } from "../../App/hooks/session/useSandBox3DChatSession";
import { sandbox3dSessionCommands } from "../../command/session/sandbox3d";
import SandBox3D from "./SandBox3D";

interface SandBox3DPageProps {
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
      case TaskStatusEnum.Running:
        return "#ffa500";
      case TaskStatusEnum.Pending:
        return "#888";
      case TaskStatusEnum.Paused:
        return "#ffa500";
      case TaskStatusEnum.Completed:
        return "#4caf50";
      case TaskStatusEnum.Failed:
        return "#ff4444";
      default:
        return "var(--text-tertiary)";
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case TaskStatusEnum.Running:
        return "🔄";
      case TaskStatusEnum.Pending:
        return "⏳";
      case TaskStatusEnum.Paused:
        return "⏸️";
      case TaskStatusEnum.Completed:
        return "✅";
      case TaskStatusEnum.Failed:
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
  }, [sessions]);

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

const SandBox3DPage: React.FC<SandBox3DPageProps> = ({
  layoutMode = "vertical",
  onLayoutModeChange,
  leftTitle = "Chat",
  rightTitle = "3D Sandbox",
  leftIcon = "💬",
  rightIcon = "🧊",
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
}) => {
  const {
    currentSessionId: sandbox3dSessionId,
    handleSendMessage: sandbox3dHandleSendMessage,
    handleSwitchSession: sandbox3dHandleSwitchSession,
    handleNewSession: sandbox3dHandleNewSession,
    shouldShowWelcome: sandbox3dShouldShowWelcome,
  } = useSandBox3DSession(language as "zh" | "en", true);

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
  const historyPanelRef = useRef<HistorySandBox3DChatPanelRef>(null);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const isDragging = useRef(false);
  const dragType = useRef<"horizontal" | "history">("horizontal");
  const dragStartX = useRef(0);
  const dragStartHistoryWidth = useRef(0);
  const dragStartChatPanelWidth = useRef(400);
  const dragStartContainerRect = useRef<DOMRect | null>(null);
  const [layoutSwapMode, setLayoutSwapMode] = useState<
    "terminal-left" | "chat-left"
  >("terminal-left");
  const layoutSwapModeRef = useRef<"terminal-left" | "chat-left">(
    "terminal-left",
  );

  const isChatOnLeft = layoutSwapMode === "chat-left";

  const handleToggleChatPanel = useCallback(() => {
    if (isFunctionPanelMaximized) return;
    setChatPanelCollapsed((prev) => {
      const newState = !prev;
      saveChatPanelCollapsed(newState);
      return newState;
    });
  }, [isFunctionPanelMaximized]);

  const chatPanel = (
    <SandBox3DChatPanel
      onSendMessage={sandbox3dHandleSendMessage}
      onFileClick={onFileClick}
      t={t}
      onDragOverInputChange={onDragOverInputChange}
      language={language}
      isLeftPanel={isChatOnLeft}
      currentSessionId={sandbox3dSessionId}
    />
  );

  const sandbox3dPanel = (
    <div
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SandBox3D
        theme={theme}
        i18n={i18n}
        t={t}
        currentSessionId={sandbox3dSessionId}
      />
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
        <span style={{ fontSize: "16px" }}>
          <MessageCircleIcon size={16} />
        </span>
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

  useEffect(() => {
    const loadLayoutMode = async () => {
      try {
        const mode = await configCommands.getSettingsSandBox3DLayoutSwapMode();
        if (mode === "terminal-left" || mode === "chat-left") {
          setLayoutSwapMode(mode);
          layoutSwapModeRef.current = mode;
        }
      } catch (error) {
        console.error("Failed to load sandbox3d layout mode:", error);
      }
    };
    loadLayoutMode();
  }, []);

  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { pageType, mode } = event.detail;
      if (pageType === "sandbox3d") {
        setLayoutSwapMode(mode);
        layoutSwapModeRef.current = mode;
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
    const loadSessions = async () => {
      try {
        const list = await sandbox3dSessionCommands.listSandBox3DSessions();
        setHistorySessions(list);
      } catch (error) {
        console.error("Failed to load history sessions:", error);
      }
    };
    loadSessions();
    const handleSessionCreated = () => {
      loadSessions();
    };
    window.addEventListener("sandbox3d-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener(
        "sandbox3d-session-created",
        handleSessionCreated,
      );
    };
  }, []);

  useEffect(() => {
    const handleTitleUpdated = () => {
      historyPanelRef.current?.refreshSessions();
    };
    window.addEventListener("session-title-updated", handleTitleUpdated);
    return () => {
      window.removeEventListener("session-title-updated", handleTitleUpdated);
    };
  }, []);

  useEffect(() => {
    const savedHistoryWidth = localStorage.getItem(
      "hippox-sandbox3d-history-width",
    );
    const savedHistoryCollapsed = localStorage.getItem(
      "hippox-sandbox3d-history-collapsed",
    );
    const savedChatPanelCollapsed = localStorage.getItem(
      "hippox-sandbox3d-chat-collapsed",
    );
    const savedChatPanelWidth = localStorage.getItem(
      "hippox-sandbox3d-chat-width",
    );
    if (savedHistoryWidth) setHistoryWidth(parseFloat(savedHistoryWidth));
    if (savedHistoryCollapsed)
      setHistoryCollapsed(savedHistoryCollapsed === "true");
    if (savedChatPanelCollapsed)
      setChatPanelCollapsed(savedChatPanelCollapsed === "true");
    if (savedChatPanelWidth) setChatPanelWidth(parseFloat(savedChatPanelWidth));
  }, []);

  const saveHistoryWidth = (width: number) => {
    localStorage.setItem("hippox-sandbox3d-history-width", width.toString());
  };

  const saveHistoryCollapsed = (collapsed: boolean) => {
    localStorage.setItem(
      "hippox-sandbox3d-history-collapsed",
      collapsed.toString(),
    );
  };

  const saveChatPanelCollapsed = (collapsed: boolean) => {
    localStorage.setItem(
      "hippox-sandbox3d-chat-collapsed",
      collapsed.toString(),
    );
  };

  const saveChatPanelWidth = (width: number) => {
    localStorage.setItem("hippox-sandbox3d-chat-width", width.toString());
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

  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      sandbox3dHandleSwitchSession(sessionId);
    },
    [sandbox3dHandleSwitchSession],
  );

  const handleNewSession = useCallback(() => {
    sandbox3dHandleNewSession();
  }, [sandbox3dHandleNewSession]);

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

  const handleMouseMove = useCallback((e: MouseEvent) => {
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
      const currentMode = layoutSwapModeRef.current;
      let newWidthPx;
      if (currentMode === "terminal-left") {
        newWidthPx = startWidthPx - deltaX;
      } else {
        newWidthPx = startWidthPx + deltaX;
      }
      const minWidthPx = 200;
      const maxWidthPx = mainAreaWidth * 0.6;
      newWidthPx = Math.max(minWidthPx, Math.min(maxWidthPx, newWidthPx));
      setChatPanelWidth(newWidthPx);
      saveChatPanelWidth(newWidthPx);
    } else if (dragType.current === "history") {
      const newWidth = dragStartHistoryWidth.current + deltaX;
      const clamped = Math.min(400, Math.max(200, newWidth));
      setHistoryWidth(clamped);
      saveHistoryWidth(clamped);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

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
            <span style={{ fontSize: "16px" }}>
              <ScrollTextIcon size={16} />
            </span>
          </div>
          <CollapsedHistoryList
            sessions={historySessions}
            currentSessionId={sandbox3dSessionId}
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
          minWidth: "200px",
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
              onClick={handleNewSession}
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
          <HistorySandBox3DChatPanel
            ref={historyPanelRef}
            t={t}
            onSessionSelect={handleSessionSelect}
            currentSessionId={sandbox3dSessionId}
            onNewSession={handleNewSession}
          />
        </div>
      </div>
    );
  };

  const historyPanelContent = getHistoryPanelContent();
  const historyWidthPx =
    historyCollapsed || isFunctionPanelMaximized ? 45 : historyWidth;

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
              minWidth: historyCollapsed ? "45px" : "200px",
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
                width: "0px",
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
            />
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
            width: "0px",
            background: isResizeHover
              ? "var(--scrollbar-thumb)"
              : "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
            transition: "width 0.15s, background 0.15s",
            order: 2,
          }}
          onMouseEnter={() => setIsResizeHover(true)}
          onMouseLeave={() => setIsResizeHover(false)}
        />
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
        {sandbox3dPanel}
      </div>
    </div>
  );
};

export default SandBox3DPage;
