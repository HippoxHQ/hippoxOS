import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../../core/TaskManager";
import { SessionDomain, TaskStatusEnum } from "../../core/types";
import { showTooltipOnElement } from "../../components/Tooltip";
import HistoryChatPanel, { HistoryChatPanelRef } from "./HistoryChatPanel";
import { CollapseAllIcon2, ExpandAllIcon2, MessageCircleIcon, MonitorIcon, ScrollTextIcon } from "../../icons";
import { configCommands } from "../../command/config";
import ChatPanel from "./ChatPanel";
import TerminalPanel from "./TerminalPanel";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { CheckSquare, Square, Layers, Pin, PinOff, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { sessionCommands } from "../../command/session/general";
import { showDialog, DialogType } from "../../components/Dialog";
import { showToast, ToastType } from "../../components/Toast";
// Panel Size Constants
// History panel (leftmost panel) size limits
const HISTORY_PANEL_MIN_WIDTH = 285;
const HISTORY_PANEL_MAX_WIDTH = 400;
const HISTORY_PANEL_DEFAULT_WIDTH = 280;
const HISTORY_PANEL_COLLAPSED_WIDTH = 45;
// Left panel (chat/terminal main panel) percentage limits
const LEFT_PANEL_MIN_PERCENT = 25;
const LEFT_PANEL_MAX_PERCENT = 75;
const LEFT_PANEL_DEFAULT_PERCENT = 50;
// Right panel min width
const RIGHT_PANEL_MIN_WIDTH = 150;
interface GeneralChatPageProps {
  layoutMode?: "horizontal" | "vertical";
  onLayoutModeChange?: (mode: "horizontal" | "vertical") => void;
  leftTitle?: string;
  rightTitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  t?: (key: string, params?: any) => string;
  isFunctionPanelMaximized?: boolean;
  currentSessionId?: string;
  onSwitchSession?: (sessionId: string, domain: SessionDomain) => void;
  onCloseSkillsManager?: () => void;
  onSendMessage?: (message: string, sessionId: string, files?: any[], workflowMode?: string) => void;
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
  isLeft: boolean;
}
const CollapsedTaskList: React.FC<CollapsedTaskListProps> = ({ tasks, activeNavIndex, onLocateTask }) => {
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
          <ChevronUp size={18} />
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
                border: isActive ? "1px solid var(--accent-color)" : "1px solid transparent",
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
                showTooltipOnElement(e.currentTarget, task.user_input || "Task");
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
          <ChevronDown size={18} />
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
const CollapsedHistoryList: React.FC<CollapsedHistoryListProps> = ({ sessions, currentSessionId, onSelectSession }) => {
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
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    const getTimestamp = (id: string) => {
      const ts = id.replace("session_", "");
      return parseInt(ts, 10) || 0;
    };
    const aTs = getTimestamp(a.session_id);
    const bTs = getTimestamp(b.session_id);
    return bTs - aTs;
  });
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
          <ChevronUp size={18} />
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
                border: isActive ? "1px solid var(--accent-color)" : "1px solid transparent",
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
                showTooltipOnElement(e.currentTarget, session.title || "Untitled");
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
                    color: isActive ? "rgba(255,255,255,0.8)" : "var(--accent-color)",
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
          <ChevronDown size={18} />
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
const GeneralChatPage: React.FC<GeneralChatPageProps> = ({
  layoutMode = "vertical",
  onLayoutModeChange,
  leftTitle = "Chat",
  rightTitle = "Terminal",
  leftIcon = <MessageCircleIcon size={16} />,
  rightIcon = <MonitorIcon size={16} />,
  t = (key: string) => key,
  isFunctionPanelMaximized = false,
  currentSessionId,
  onSwitchSession,
  onCloseSkillsManager,
  onSendMessage,
  onFileClick,
  language = "en",
  onDragOverInputChange,
  executionLogs,
  onClearLogs,
}) => {
  // Determine language
  const isZh = t("i18n") === "zh";
  const [leftWidth, setLeftWidth] = useState<number>(LEFT_PANEL_DEFAULT_PERCENT);
  const [historyWidth, setHistoryWidth] = useState<number>(HISTORY_PANEL_DEFAULT_WIDTH);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [historyCollapsed, setHistoryCollapsed] = useState<boolean>(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [isResizeHover, setIsResizeHover] = useState(false);
  const [isHistoryResizeHover, setIsHistoryResizeHover] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isHistoryAtBottom, setIsHistoryAtBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HistoryChatPanelRef>(null);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [layoutSwapMode, setLayoutSwapMode] = useState<"chat-left" | "terminal-left">("chat-left");
  const [isLayoutLoading, setIsLayoutLoading] = useState(true);
  // Batch selection state
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isDragging = useRef(false);
  const dragType = useRef<"horizontal" | "history">("horizontal");
  const dragStartX = useRef(0);
  const dragStartHistoryWidth = useRef(0);
  const dragStartLeftWidth = useRef(LEFT_PANEL_DEFAULT_PERCENT);
  const dragStartContainerRect = useRef<DOMRect | null>(null);
  const leftPanel = <ChatPanel onSendMessage={onSendMessage || (() => {})} onFileClick={onFileClick} t={t} currentSessionId={currentSessionId} onDragOverInputChange={onDragOverInputChange} language={language} isLeftPanel={true} />;
  const rightPanel = <TerminalPanel logs={executionLogs || []} onClearLogs={onClearLogs || (() => {})} t={t} currentSessionId={currentSessionId} onFileClick={onFileClick} isLeftPanel={false} />;
  useEffect(() => {
    if (currentSessionId) {
      taskManager.setCurrentSession(currentSessionId, SessionDomain.General);
    } else {
      taskManager.setCurrentDomain(SessionDomain.General);
    }
  }, [currentSessionId]);
  useEffect(() => {
    const loadLayoutMode = async () => {
      try {
        const mode = await configCommands.getSettingsGeneralChatLayoutSwapMode();
        if (mode === "terminal-left" || mode === "chat-left") {
          setLayoutSwapMode(mode);
        }
      } catch (error) {
      } finally {
        setIsLayoutLoading(false);
      }
    };
    loadLayoutMode();
  }, []);
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { pageType, mode } = event.detail;
      if (pageType === "general") {
        setLayoutSwapMode(mode);
      }
    };
    window.addEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    return () => {
      window.removeEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    };
  }, []);
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const { sessionCommands: sc } = await import("../../command/session/general");
        const list = await sc.listSessions();
        setHistorySessions(list);
      } catch (error) {}
    };
    loadSessions();
    const handleSessionCreated = () => {
      loadSessions();
    };
    window.addEventListener("session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("session-created", handleSessionCreated);
    };
  }, []);
  useEffect(() => {
    const savedHistoryWidth = localStorage.getItem("hippox-history-width");
    const savedHistoryCollapsed = localStorage.getItem("hippox-history-collapsed");
    const savedLeftCollapsed = localStorage.getItem("hippox-left-collapsed");
    const savedRightCollapsed = localStorage.getItem("hippox-right-collapsed");
    const savedLeftWidth = localStorage.getItem("hippox-left-width");
    if (savedHistoryWidth) setHistoryWidth(parseFloat(savedHistoryWidth));
    if (savedHistoryCollapsed) setHistoryCollapsed(savedHistoryCollapsed === "true");
    if (savedLeftCollapsed) setLeftCollapsed(savedLeftCollapsed === "true");
    if (savedRightCollapsed) setRightCollapsed(savedRightCollapsed === "true");
    if (savedLeftWidth) setLeftWidth(parseFloat(savedLeftWidth));
  }, []);
  const saveHistoryWidth = (width: number) => {
    localStorage.setItem("hippox-history-width", width.toString());
  };
  const saveHistoryCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-history-collapsed", collapsed.toString());
  };
  const saveLeftCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-left-collapsed", collapsed.toString());
  };
  const saveRightCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-right-collapsed", collapsed.toString());
  };
  // Clear selection when batch mode is turned off
  useEffect(() => {
    if (!isBatchMode) {
      setSelectedIds(new Set());
    }
  }, [isBatchMode]);
  // Toggle select all sessions
  const toggleSelectAll = () => {
    const allIds = historySessions.map((s) => s.session_id);
    if (selectedIds.size === allIds.length && allIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };
  // Batch operations
  /**
   * Batch pin selected sessions
   * Pins all sessions that are currently selected in batch mode
   * After successful operation, refreshes both the parent and child components
   */
  const handleBatchPin = async () => {
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请选择要置顶的会话" : "Please select sessions to pin");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await sessionCommands.updatePinnedSessions(id, true);
      }
      // Refresh HistoryChatPanel component
      await historyPanelRef.current?.refresh();
      // Refresh parent component's session list
      const { sessionCommands: sc } = await import("../../command/session/general");
      const list = await sc.listSessions();
      setHistorySessions(list);
      setSelectedIds(new Set());
      showToast(ToastType.SUCCESS, isZh ? `已置顶 ${ids.length} 个会话` : `${ids.length} session(s) pinned`);
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "批量置顶失败" : "Batch pin failed");
    }
  };
  /**
   * Batch unpin selected sessions
   * Unpins all sessions that are currently selected in batch mode
   * After successful operation, refreshes both the parent and child components
   */
  const handleBatchUnpin = async () => {
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请选择要取消置顶的会话" : "Please select sessions to unpin");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await sessionCommands.updatePinnedSessions(id, false);
      }
      // Refresh HistoryChatPanel component
      await historyPanelRef.current?.refresh();
      // Refresh parent component's session list
      const { sessionCommands: sc } = await import("../../command/session/general");
      const list = await sc.listSessions();
      setHistorySessions(list);
      setSelectedIds(new Set());
      showToast(ToastType.SUCCESS, isZh ? `已取消置顶 ${ids.length} 个会话` : `${ids.length} session(s) unpinned`);
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "批量取消置顶失败" : "Batch unpin failed");
    }
  };
  /**
   * Batch delete selected sessions
   * Deletes all sessions that are currently selected in batch mode
   * Prevents deleting the last session and shows a confirmation dialog
   * After successful operation, refreshes both the parent and child components
   * If the current session is deleted, switches to the first remaining session
   */
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请选择要删除的会话" : "Please select sessions to delete");
      return;
    }
    // Check if trying to delete all sessions - prevent deleting the last one
    if (selectedIds.size >= historySessions.length) {
      showDialog(DialogType.WARNING, t("history.dialog.cannotDeleteTitle"), t("history.dialog.cannotDeleteMessage"), undefined, undefined, t("history.dialog.gotIt"), undefined);
      return;
    }
    showDialog(
      DialogType.WARNING,
      isZh ? "批量删除会话" : "Batch Delete Sessions",
      isZh ? `确定要删除选中的 ${selectedIds.size} 个会话吗？此操作不可恢复。` : `Are you sure you want to delete ${selectedIds.size} selected session(s)? This action cannot be undone.`,
      async () => {
        try {
          const ids = Array.from(selectedIds);
          for (const id of ids) {
            await sessionCommands.deleteSession(id);
            const domain = taskManager.getDomainFromSessionId(id);
            taskManager.deleteSession(id, domain);
          }
          // If current session was deleted, switch to another session
          if (currentSessionId && selectedIds.has(currentSessionId) && onSwitchSession) {
            const remainingSessions = historySessions.filter((s) => !selectedIds.has(s.session_id));
            if (remainingSessions.length > 0) {
              onSwitchSession(remainingSessions[0].session_id, SessionDomain.General);
            }
          }
          // Refresh HistoryChatPanel component
          await historyPanelRef.current?.refresh();
          // Refresh parent component's session list
          const { sessionCommands: sc } = await import("../../command/session/general");
          const list = await sc.listSessions();
          setHistorySessions(list);
          setSelectedIds(new Set());
          setIsBatchMode(false);
          showToast(ToastType.SUCCESS, isZh ? `已删除 ${ids.length} 个会话` : `${ids.length} session(s) deleted`);
        } catch (error) {
          showToast(ToastType.ERROR, isZh ? "批量删除失败" : "Batch delete failed");
        }
      },
      undefined,
      isZh ? "删除" : "Delete",
      isZh ? "取消" : "Cancel",
    );
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
  const handleToggleLeft = () => {
    if (isFunctionPanelMaximized) return;
    const isTerminalLeft = layoutSwapMode === "terminal-left";
    const isLeftTerminal = isTerminalLeft;
    if (leftCollapsed) {
      setLeftCollapsed(false);
      saveLeftCollapsed(false);
      return;
    }
    if (rightCollapsed) {
      setRightCollapsed(false);
      saveRightCollapsed(false);
    }
    setLeftCollapsed(true);
    saveLeftCollapsed(true);
  };
  const handleToggleRight = () => {
    if (isFunctionPanelMaximized) return;
    const isTerminalLeft = layoutSwapMode === "terminal-left";
    if (rightCollapsed) {
      setRightCollapsed(false);
      saveRightCollapsed(false);
      return;
    }
    if (leftCollapsed) {
      setLeftCollapsed(false);
      saveLeftCollapsed(false);
    }
    setRightCollapsed(true);
    saveRightCollapsed(true);
  };
  /**
   * Listen for session-selected event from search results
   * This allows the search dialog to switch to a specific general chat session
   */
  useEffect(() => {
    const handleSessionSelected = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId } = e.detail;
      if (sessionId && onSwitchSession) {
        onSwitchSession(sessionId, SessionDomain.General);
      }
    };
    window.addEventListener(APP_WINDOW_EVENTS.SESSION_SELECTED, handleSessionSelected as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.SESSION_SELECTED, handleSessionSelected as EventListener);
    };
  }, [onSwitchSession]);
  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      if (onSwitchSession) {
        onSwitchSession(sessionId, SessionDomain.General);
      }
    },
    [onSwitchSession],
  );
  const handleMouseDown = (e: React.MouseEvent, type: "horizontal" | "history") => {
    if (leftCollapsed || rightCollapsed || isFunctionPanelMaximized) return;
    if (type === "history" && historyCollapsed) return;
    isDragging.current = true;
    dragType.current = type;
    dragStartX.current = e.clientX;
    dragStartHistoryWidth.current = historyCollapsed ? HISTORY_PANEL_COLLAPSED_WIDTH : historyWidth;
    dragStartLeftWidth.current = leftWidth;
    dragStartContainerRect.current = containerRef.current?.getBoundingClientRect() || null;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const containerRect = dragStartContainerRect.current || containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    if (dragType.current === "horizontal") {
      const historyWidthPx = dragStartHistoryWidth.current;
      const mainAreaWidth = containerWidth - historyWidthPx;
      if (mainAreaWidth <= 0) return;
      const startLeftWidthPx = (dragStartLeftWidth.current / 100) * mainAreaWidth;
      let newWidthPx = startLeftWidthPx + deltaX;
      const minWidthPx = mainAreaWidth * (LEFT_PANEL_MIN_PERCENT / 100);
      const maxWidthPx = mainAreaWidth * (LEFT_PANEL_MAX_PERCENT / 100);
      newWidthPx = Math.max(minWidthPx, Math.min(maxWidthPx, newWidthPx));
      const newWidthPercent = (newWidthPx / mainAreaWidth) * 100;
      setLeftWidth(newWidthPercent);
      localStorage.setItem("hippox-left-width", newWidthPercent.toString());
    } else if (dragType.current === "history") {
      const newWidth = dragStartHistoryWidth.current + deltaX;
      const clamped = Math.min(HISTORY_PANEL_MAX_WIDTH, Math.max(HISTORY_PANEL_MIN_WIDTH, newWidth));
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
  const renderCollapsedSidebar = (isLeft: boolean, title: string, icon: React.ReactNode, onToggle: () => void, expandIcon?: string) => {
    const allTasks = taskManager.getAllTasks();
    const iconChar = expandIcon || (isLeft ? "≫" : "≪");
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
          borderRight: isLeft ? "1px solid var(--border-color)" : "none",
          borderLeft: !isLeft ? "1px solid var(--border-color)" : "none",
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
            onClick={onToggle}
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
            title={`Expand ${title}`}
          >
            {iconChar}
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
          <span style={{ fontSize: "16px" }}>{icon}</span>
        </div>
        <CollapsedTaskList
          tasks={allTasks}
          activeNavIndex={activeNavIndex}
          onLocateTask={(idx) => {
            const task = allTasks[idx];
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
          isLeft={isLeft}
        />
      </div>
    );
  };
  const getLeftPanelContent = () => {
    const isTerminalLeft = layoutSwapMode === "terminal-left";
    if (leftCollapsed || isFunctionPanelMaximized) {
      return renderCollapsedSidebar(true, isTerminalLeft ? rightTitle : leftTitle, isTerminalLeft ? rightIcon : leftIcon, handleToggleLeft, "≫");
    }
    const panel = isTerminalLeft ? rightPanel : leftPanel;
    if (React.isValidElement(panel)) {
      return React.cloneElement(panel, {
        isCollapsed: false,
        togglePanel: handleToggleLeft,
        collapseIcon: "≪",
        isLeftPanel: true,
      } as any);
    }
    return panel;
  };
  const getRightPanelContent = () => {
    const isTerminalLeft = layoutSwapMode === "terminal-left";
    if (rightCollapsed || isFunctionPanelMaximized) {
      return renderCollapsedSidebar(false, isTerminalLeft ? leftTitle : rightTitle, isTerminalLeft ? leftIcon : rightIcon, handleToggleRight, "≪");
    }
    const panel = isTerminalLeft ? leftPanel : rightPanel;
    if (React.isValidElement(panel)) {
      return React.cloneElement(panel, {
        isCollapsed: false,
        togglePanel: handleToggleRight,
        collapseIcon: "≫",
        isLeftPanel: false,
      } as any);
    }
    return panel;
  };
  const getHistoryPanelContent = () => {
    // Common button style for header actions
    const headerButtonStyle: React.CSSProperties = {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary)",
      padding: "2px 6px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 1,
      width: "28px",
      height: "28px",
    };
    if (historyCollapsed || isFunctionPanelMaximized) {
      return (
        <div
          className="collapsed-sidebar"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: HISTORY_PANEL_COLLAPSED_WIDTH,
            minWidth: HISTORY_PANEL_COLLAPSED_WIDTH,
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
          <CollapsedHistoryList sessions={historySessions} currentSessionId={currentSessionId} onSelectSession={handleSessionSelect} />
        </div>
      );
    }
    // 修改 getHistoryPanelContent 中的返回部分，把按钮放在左侧并排显示
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          flex: 1,
          minWidth: `${HISTORY_PANEL_MIN_WIDTH}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 6px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            flexShrink: 0,
            minHeight: "40px",
          }}
        >
          {/* Left side: Title and action buttons - always visible */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Batch selection toggle button */}
            <button
              style={{
                ...headerButtonStyle,
                color: isBatchMode ? "var(--accent-color, #0066cc)" : "var(--text-secondary)",
              }}
              onClick={() => setIsBatchMode(!isBatchMode)}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isBatchMode ? "var(--accent-color, #0066cc)" : "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              title={isBatchMode ? (isZh ? "退出批量模式" : "Exit batch mode") : isZh ? "批量选择" : "Batch select"}
            >
              <Layers size={16} />
            </button>
            {/* Batch action buttons - only show in batch mode */}
            {isBatchMode && (
              <>
                {/* Select all button */}
                <button
                  style={headerButtonStyle}
                  onClick={toggleSelectAll}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "none";
                  }}
                  title={isZh ? "全选" : "Select all"}
                >
                  {selectedIds.size === historySessions.length && historySessions.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                {/* Selected count */}
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {selectedIds.size}
                </span>
                {/* Batch pin button */}
                <button
                  style={{
                    ...headerButtonStyle,
                    color: selectedIds.size > 0 ? "var(--accent-color, #0066cc)" : "var(--text-muted)",
                    opacity: selectedIds.size > 0 ? 1 : 0.5,
                  }}
                  onClick={handleBatchPin}
                  disabled={selectedIds.size === 0}
                  onMouseEnter={(e) => {
                    if (selectedIds.size > 0) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.background = "var(--hover-bg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedIds.size > 0) {
                      e.currentTarget.style.color = "var(--accent-color, #0066cc)";
                      e.currentTarget.style.background = "none";
                    }
                  }}
                  title={isZh ? "批量置顶" : "Batch pin"}
                >
                  <Pin size={16} />
                </button>
                {/* Batch unpin button */}
                <button
                  style={{
                    ...headerButtonStyle,
                    color: selectedIds.size > 0 ? "var(--accent-color, #0066cc)" : "var(--text-muted)",
                    opacity: selectedIds.size > 0 ? 1 : 0.5,
                  }}
                  onClick={handleBatchUnpin}
                  disabled={selectedIds.size === 0}
                  onMouseEnter={(e) => {
                    if (selectedIds.size > 0) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.background = "var(--hover-bg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedIds.size > 0) {
                      e.currentTarget.style.color = "var(--accent-color, #0066cc)";
                      e.currentTarget.style.background = "none";
                    }
                  }}
                  title={isZh ? "批量取消置顶" : "Batch unpin"}
                >
                  <PinOff size={16} />
                </button>
                {/* Batch delete button */}
                <button
                  style={{
                    ...headerButtonStyle,
                    color: selectedIds.size > 0 ? "#ef4444" : "var(--text-muted)",
                    opacity: selectedIds.size > 0 ? 1 : 0.5,
                  }}
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0}
                  onMouseEnter={(e) => {
                    if (selectedIds.size > 0) {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedIds.size > 0) {
                      e.currentTarget.style.background = "none";
                    }
                  }}
                  title={isZh ? "批量删除" : "Batch delete"}
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            {/* Expand/Collapse all categories button */}
            <button
              style={headerButtonStyle}
              onClick={handleExpandToggle}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              title={isHistoryExpanded ? (isZh ? "收起全部" : "Collapse all") : isZh ? "展开全部" : "Expand all"}
            >
              {isHistoryExpanded ? <CollapseAllIcon2 size={16} /> : <ExpandAllIcon2 size={16} />}
            </button>
            {/* Scroll to top/bottom button */}
            <button
              style={headerButtonStyle}
              onClick={handleScrollToggle}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              title={isHistoryAtBottom ? (isZh ? "滚动到顶部" : "Scroll to top") : isZh ? "滚动到底部" : "Scroll to bottom"}
            >
              {isHistoryAtBottom ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          {/* Right side: Collapse panel button only */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <button
              style={headerButtonStyle}
              onClick={handleToggleHistory}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              title={isZh ? "收起面板" : "Collapse panel"}
            >
              ◀
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <HistoryChatPanel
            ref={historyPanelRef}
            t={t}
            onSessionSelect={handleSessionSelect}
            currentSessionId={currentSessionId}
            onCloseSkillsManager={onCloseSkillsManager}
            isBatchMode={isBatchMode}
            selectedIds={selectedIds}
            onToggleSelection={(sessionId, e) => {
              e.stopPropagation();
              setSelectedIds((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(sessionId)) {
                  newSet.delete(sessionId);
                } else {
                  newSet.add(sessionId);
                }
                return newSet;
              });
            }}
          />
        </div>
      </div>
    );
  };
  const leftPanelContent = getLeftPanelContent();
  const rightPanelContent = getRightPanelContent();
  const historyPanelContent = getHistoryPanelContent();
  const historyWidthPx = historyCollapsed || isFunctionPanelMaximized ? HISTORY_PANEL_COLLAPSED_WIDTH : historyWidth;
  const isLeftCollapsed = leftCollapsed || isFunctionPanelMaximized;
  const isRightCollapsed = rightCollapsed || isFunctionPanelMaximized;
  return (
    <div className="panels-container horizontal-layout" ref={containerRef} style={{ display: "flex", flex: 1, overflow: "hidden" }}>
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
      `}</style>
      {!isFunctionPanelMaximized && (
        <>
          <div
            className="panel-history"
            style={{
              flex: historyCollapsed ? `0 0 ${HISTORY_PANEL_COLLAPSED_WIDTH}px` : "0 0 auto",
              width: historyCollapsed ? `${HISTORY_PANEL_COLLAPSED_WIDTH}px` : `${historyWidth}px`,
              overflow: "hidden",
              minWidth: historyCollapsed ? `${HISTORY_PANEL_COLLAPSED_WIDTH}px` : `${HISTORY_PANEL_MIN_WIDTH}px`,
              display: "flex",
              flexDirection: "row",
              borderRight: "1px solid var(--border-color)",
              userSelect: "none",
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
                background: isHistoryResizeHover ? "var(--scrollbar-thumb)" : "var(--border-color)",
                cursor: "col-resize",
                flexShrink: 0,
                position: "relative",
              }}
              onMouseEnter={() => setIsHistoryResizeHover(true)}
              onMouseLeave={() => setIsHistoryResizeHover(false)}
            />
          )}
        </>
      )}
      <div
        className="panel-left"
        style={{
          flex: isLeftCollapsed ? `0 0 ${HISTORY_PANEL_COLLAPSED_WIDTH}px` : isRightCollapsed ? "1" : "0 0 auto",
          width: isLeftCollapsed ? `${HISTORY_PANEL_COLLAPSED_WIDTH}px` : isRightCollapsed ? "auto" : `${leftWidth}%`,
          overflow: "hidden",
          minWidth: isLeftCollapsed ? `${HISTORY_PANEL_COLLAPSED_WIDTH}px` : `${RIGHT_PANEL_MIN_WIDTH}px`,
          display: "flex",
          flexDirection: "row",
        }}
      >
        {leftPanelContent}
      </div>
      {!isLeftCollapsed && !isRightCollapsed && !isFunctionPanelMaximized && (
        <div
          className="resize-handle resize-handle-vertical"
          onMouseDown={(e) => handleMouseDown(e, "horizontal")}
          style={{
            width: "1px",
            background: isResizeHover ? "var(--scrollbar-thumb)" : "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
            transition: "width 0.15s, background 0.15s",
          }}
          onMouseEnter={() => setIsResizeHover(true)}
          onMouseLeave={() => setIsResizeHover(false)}
        />
      )}
      <div
        style={{
          flex: isRightCollapsed ? `0 0 ${HISTORY_PANEL_COLLAPSED_WIDTH}px` : isLeftCollapsed ? "1" : 1,
          width: isRightCollapsed ? `${HISTORY_PANEL_COLLAPSED_WIDTH}px` : "auto",
          overflow: "hidden",
          minWidth: isRightCollapsed ? `${HISTORY_PANEL_COLLAPSED_WIDTH}px` : `${RIGHT_PANEL_MIN_WIDTH}px`,
          display: "flex",
          flexDirection: "row",
          justifyContent: isRightCollapsed ? "flex-end" : "flex-start",
          marginLeft: isRightCollapsed ? "auto" : 0,
        }}
      >
        {rightPanelContent}
      </div>
    </div>
  );
};
export default GeneralChatPage;
