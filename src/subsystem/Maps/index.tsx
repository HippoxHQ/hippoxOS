import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../../core/TaskManager";
import { TaskStatusEnum } from "../../core/types";
import { showTooltipOnElement } from "../../components/Tooltip";
import { CollapseAllIcon2, ExpandAllIcon2, MessageCircleIcon, ScrollTextIcon } from "../../icons";
import HistoryMapChatPanel, { HistoryMapChatPanelRef } from "./HistoryMapChatPanel";
import MapsChatPageEarthView from "./MapsChatPageEarthView";
import { configCommands } from "../../command/config";
import { useMapSession } from "../../App/hooks/session/useMapChatSession";
import { EarthViewRef } from "./MapsChatPanel/types";
import MapsChatPage from "./MapsChatPanel";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { CheckSquare, Square, Layers, Pin, PinOff, Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { mapSessionCommands } from "../../command/session/map";
import { showDialog, DialogType } from "../../components/Dialog";
import { showToast, ToastType } from "../../components/Toast";
// Panel Size Constants - Matching GeneralChatPage
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
interface MapsPageProps {
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
  mapData?: any;
  onMapLoad?: (earthView: any) => void;
  onMapClick?: (event: any) => void;
  onMapMoveEnd?: (center: [number, number], zoom: number) => void;
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
/**
 * Collapsed task list component for sidebar navigation
 */
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
/**
 * Collapsed history list component for sidebar navigation
 */
const CollapsedHistoryList: React.FC<CollapsedHistoryListProps> = ({ sessions, currentSessionId, onSelectSession }) => {
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
                  <Pin size={16} />
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
/**
 * Main Maps Page Component
 * Integrates chat panel and EarthView map with data flow between them
 *
 * Data Flow (same pattern as 3D Sandbox):
 * 1. User sends message → MapsChatPage
 * 2. LLM responds with JSON containing earthview data
 * 3. MapsChatPage parses and extracts earthview via mapRef.applyEarthViewConfig()
 * 4. MapsChatPageEarthView renders the data on the map (accumulates layers)
 * 5. All tasks in the same session are overlaid on the map
 */
const MapsPage: React.FC<MapsPageProps> = ({
  layoutMode = "vertical",
  onLayoutModeChange,
  leftTitle = "Chat",
  rightTitle = "Map",
  leftIcon = "💬",
  rightIcon = "🗺️",
  t = (key: string) => key,
  isFunctionPanelMaximized = false,
  onCloseSkillsManager,
  theme = "dark",
  i18n = "en",
  mapData,
  onMapLoad,
  onMapClick,
  onMapMoveEnd,
  onFileClick,
  language = "en",
  onDragOverInputChange,
  executionLogs,
  onClearLogs,
}) => {
  // Session management
  const { currentSessionId: mapSessionId, handleSendMessage: mapHandleSendMessage, handleSwitchSession: mapHandleSwitchSession, handleNewSession: mapHandleNewSession, shouldShowWelcome: mapShouldShowWelcome } = useMapSession(language as "zh" | "en", true);
  // Panel state - using constants from GeneralChatPage
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(400);
  const [historyWidth, setHistoryWidth] = useState<number>(HISTORY_PANEL_DEFAULT_WIDTH);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState<boolean>(false);
  const [historyCollapsed, setHistoryCollapsed] = useState<boolean>(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [isResizeHover, setIsResizeHover] = useState(false);
  const [isHistoryResizeHover, setIsHistoryResizeHover] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isHistoryAtBottom, setIsHistoryAtBottom] = useState(false);
  // Batch selection state
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HistoryMapChatPanelRef>(null);
  /**
   * Reference to EarthView map component for rendering
   * This is passed to MapsChatPage so it can call applyEarthViewConfig()
   * Same pattern as sandboxRef in 3D Sandbox
   */
  const mapRef = useRef<EarthViewRef | null>(null);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const isDragging = useRef(false);
  const dragType = useRef<"horizontal" | "history">("horizontal");
  const dragStartX = useRef(0);
  const dragStartHistoryWidth = useRef(0);
  const dragStartChatPanelWidth = useRef(400);
  const dragStartContainerRect = useRef<DOMRect | null>(null);
  const [layoutSwapMode, setLayoutSwapMode] = useState<"terminal-left" | "chat-left">("terminal-left");
  const layoutSwapModeRef = useRef<"terminal-left" | "chat-left">("terminal-left");
  const isChatOnLeft = layoutSwapMode === "chat-left";
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
  /**
   * Batch pin selected sessions
   * Pins all sessions that are currently selected in batch mode
   * After successful operation, refreshes both the parent and child components
   */
  const handleBatchPin = async () => {
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, t("history.batch.selectSessions") || "Please select sessions to pin");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await mapSessionCommands.updatePinnedMapSessions(id, true);
      }
      // Refresh HistoryMapChatPanel component
      await historyPanelRef.current?.refreshSessions();
      // Refresh parent component's session list
      const list = await mapSessionCommands.listMapSessions();
      setHistorySessions(list);
      setSelectedIds(new Set());
      showToast(ToastType.SUCCESS, `${ids.length} session(s) pinned`);
    } catch (error) {
      showToast(ToastType.ERROR, "Batch pin failed");
    }
  };
  /**
   * Batch unpin selected sessions
   * Unpins all sessions that are currently selected in batch mode
   * After successful operation, refreshes both the parent and child components
   */
  const handleBatchUnpin = async () => {
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, t("history.batch.selectSessions") || "Please select sessions to unpin");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await mapSessionCommands.updatePinnedMapSessions(id, false);
      }
      // Refresh HistoryMapChatPanel component
      await historyPanelRef.current?.refreshSessions();
      // Refresh parent component's session list
      const list = await mapSessionCommands.listMapSessions();
      setHistorySessions(list);
      setSelectedIds(new Set());
      showToast(ToastType.SUCCESS, `${ids.length} session(s) unpinned`);
    } catch (error) {
      showToast(ToastType.ERROR, "Batch unpin failed");
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
      showToast(ToastType.WARNING, t("history.batch.selectSessions") || "Please select sessions to delete");
      return;
    }
    // Check if trying to delete all sessions - prevent deleting the last one
    if (selectedIds.size >= historySessions.length) {
      showDialog(DialogType.WARNING, t("history.dialog.cannotDeleteTitle"), t("history.dialog.cannotDeleteMessage"), undefined, undefined, t("history.dialog.gotIt"), undefined);
      return;
    }
    showDialog(
      DialogType.WARNING,
      "Batch Delete Sessions",
      `Are you sure you want to delete ${selectedIds.size} selected session(s)? This action cannot be undone.`,
      async () => {
        try {
          const ids = Array.from(selectedIds);
          for (const id of ids) {
            await mapSessionCommands.deleteMapSession(id);
            const domain = taskManager.getDomainFromSessionId(id);
            taskManager.deleteSession(id, domain);
          }
          // If current session was deleted, switch to another session
          if (mapSessionId && selectedIds.has(mapSessionId) && mapHandleSwitchSession) {
            const remainingSessions = historySessions.filter((s) => !selectedIds.has(s.session_id));
            if (remainingSessions.length > 0) {
              mapHandleSwitchSession(remainingSessions[0].session_id);
            }
          }
          // Refresh HistoryMapChatPanel component
          await historyPanelRef.current?.refreshSessions();
          // Refresh parent component's session list
          const list = await mapSessionCommands.listMapSessions();
          setHistorySessions(list);
          setSelectedIds(new Set());
          setIsBatchMode(false);
          showToast(ToastType.SUCCESS, `${ids.length} session(s) deleted`);
        } catch (error) {
          showToast(ToastType.ERROR, "Batch delete failed");
        }
      },
      undefined,
      "Delete",
      "Cancel",
    );
  };
  // Panel toggle handlers
  const handleToggleChatPanel = useCallback(() => {
    if (isFunctionPanelMaximized) return;
    setChatPanelCollapsed((prev) => {
      const newState = !prev;
      saveChatPanelCollapsed(newState);
      return newState;
    });
  }, [isFunctionPanelMaximized]);
  /**
   * Create chat panel with mapRef passed down for earthview rendering
   * Similar to how 3D sandbox passes sandboxRef to its chat panel
   */
  const chatPanel = <MapsChatPage onSendMessage={mapHandleSendMessage} onFileClick={onFileClick} t={t} currentSessionId={mapSessionId} onDragOverInputChange={onDragOverInputChange} language={language} isLeftPanel={isChatOnLeft} mapRef={mapRef} />;
  /**
   * Create map panel with ref attached for chat panel to call
   * Similar to how 3D sandbox attaches sandboxRef to SandBox3D component
   */
  const mapPanel = (
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
      <MapsChatPageEarthView ref={mapRef} theme={theme} i18n={i18n} onLoad={onMapLoad} onMapClick={onMapClick} onMoveEnd={onMapMoveEnd} mapData={mapData} />
    </div>
  );
  /**
   * Collapsed chat sidebar
   */
  const collapsedChatSidebar = (
    <div
      className="collapsed-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: HISTORY_PANEL_COLLAPSED_WIDTH,
        minWidth: HISTORY_PANEL_COLLAPSED_WIDTH,
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
          title={isChatOnLeft ? "Expand Right" : "Expand Left"}
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
  // Layout mode loading
  useEffect(() => {
    const loadLayoutMode = async () => {
      try {
        const mode = await configCommands.getSettingsMapChatLayoutSwapMode();
        if (mode === "terminal-left" || mode === "chat-left") {
          setLayoutSwapMode(mode);
          layoutSwapModeRef.current = mode;
        }
      } catch (error) {
        console.error("Failed to load map chat layout mode:", error);
      }
    };
    loadLayoutMode();
  }, []);
  // Layout change listener
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { pageType, mode } = event.detail;
      if (pageType === "map") {
        setLayoutSwapMode(mode);
        layoutSwapModeRef.current = mode;
      }
    };
    window.addEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    return () => {
      window.removeEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    };
  }, []);
  // Load history sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const list = await mapSessionCommands.listMapSessions();
        setHistorySessions(list);
      } catch (error) {
        console.error("Failed to load history sessions:", error);
      }
    };
    loadSessions();
    const handleSessionCreated = () => {
      loadSessions();
    };
    window.addEventListener("map-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("map-session-created", handleSessionCreated);
    };
  }, []);
  // Refresh history on session created
  useEffect(() => {
    const handleSessionCreated = () => {
      historyPanelRef.current?.refreshSessions();
    };
    window.addEventListener("map-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("map-session-created", handleSessionCreated);
    };
  }, []);
  // Refresh history on title update
  useEffect(() => {
    const handleTitleUpdated = () => {
      historyPanelRef.current?.refreshSessions();
    };
    window.addEventListener("session-title-updated", handleTitleUpdated);
    return () => {
      window.removeEventListener("session-title-updated", handleTitleUpdated);
    };
  }, []);
  // Load persisted state from localStorage
  useEffect(() => {
    const savedHistoryWidth = localStorage.getItem("hippox-map-history-width");
    const savedHistoryCollapsed = localStorage.getItem("hippox-map-history-collapsed");
    const savedChatPanelCollapsed = localStorage.getItem("hippox-map-chat-collapsed");
    const savedChatPanelWidth = localStorage.getItem("hippox-map-chat-width");
    if (savedHistoryWidth) setHistoryWidth(parseFloat(savedHistoryWidth));
    if (savedHistoryCollapsed) setHistoryCollapsed(savedHistoryCollapsed === "true");
    if (savedChatPanelCollapsed) setChatPanelCollapsed(savedChatPanelCollapsed === "true");
    if (savedChatPanelWidth) setChatPanelWidth(parseFloat(savedChatPanelWidth));
  }, []);
  // Persistence helpers
  const saveHistoryWidth = (width: number) => {
    localStorage.setItem("hippox-map-history-width", width.toString());
  };
  const saveHistoryCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-map-history-collapsed", collapsed.toString());
  };
  const saveChatPanelCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-map-chat-collapsed", collapsed.toString());
  };
  const saveChatPanelWidth = (width: number) => {
    localStorage.setItem("hippox-map-chat-width", width.toString());
  };
  // History panel controls
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
  /**
   * Listen for map-switch-session event from search results
   * This allows the search dialog to switch to a specific map session
   */
  useEffect(() => {
    const handleMapSwitchSession = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId } = e.detail;
      if (sessionId) {
        mapHandleSwitchSession(sessionId);
      }
    };
    window.addEventListener(APP_WINDOW_EVENTS.MAP_SWITCH_SESSION, handleMapSwitchSession as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.MAP_SWITCH_SESSION, handleMapSwitchSession as EventListener);
    };
  }, [mapHandleSwitchSession]);
  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      mapHandleSwitchSession(sessionId);
    },
    [mapHandleSwitchSession],
  );
  const handleNewSession = useCallback(() => {
    mapHandleNewSession();
  }, [mapHandleNewSession]);
  // Resize drag handlers
  const handleMouseDown = (e: React.MouseEvent, type: "horizontal" | "history") => {
    if (chatPanelCollapsed || isFunctionPanelMaximized) return;
    if (type === "history" && historyCollapsed) return;
    isDragging.current = true;
    dragType.current = type;
    dragStartX.current = e.clientX;
    dragStartHistoryWidth.current = historyCollapsed ? HISTORY_PANEL_COLLAPSED_WIDTH : historyWidth;
    dragStartChatPanelWidth.current = chatPanelWidth;
    dragStartContainerRect.current = containerRef.current?.getBoundingClientRect() || null;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const containerRect = dragStartContainerRect.current || containerRef.current.getBoundingClientRect();
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
      const clamped = Math.min(HISTORY_PANEL_MAX_WIDTH, Math.max(HISTORY_PANEL_MIN_WIDTH, newWidth));
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
  /**
   * Get history panel content
   */
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
          <CollapsedHistoryList sessions={historySessions} currentSessionId={mapSessionId} onSelectSession={handleSessionSelect} />
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
          minWidth: `${HISTORY_PANEL_MIN_WIDTH}px`,
          userSelect: "none",
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
              title={isBatchMode ? "Exit batch mode" : "Batch select"}
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
                  title="Select all"
                >
                  {selectedIds.size === historySessions.length && historySessions.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                {/* Selected count */}
                {/* <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {selectedIds.size}
                </span> */}
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
                  title="Batch pin"
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
                  title="Batch unpin"
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
                  title="Batch delete"
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
              title={isHistoryExpanded ? "Collapse all" : "Expand all"}
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
              title={isHistoryAtBottom ? "Scroll to top" : "Scroll to bottom"}
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
              onClick={handleNewSession}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              title="New Session"
            >
              <Plus size={16} />
            </button>
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
              title="Collapse panel"
            >
              ≪
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <HistoryMapChatPanel
            ref={historyPanelRef}
            t={t}
            onSessionSelect={handleSessionSelect}
            currentSessionId={mapSessionId}
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
  const historyPanelContent = getHistoryPanelContent();
  // === RENDER ===
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
          width: ${HISTORY_PANEL_COLLAPSED_WIDTH}px;
          min-width: ${HISTORY_PANEL_COLLAPSED_WIDTH}px;
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
      {/* History Panel */}
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
                transition: "width 0.15s, background 0.15s",
              }}
              onMouseEnter={() => setIsHistoryResizeHover(true)}
              onMouseLeave={() => setIsHistoryResizeHover(false)}
            />
          )}
        </>
      )}
      {/* Chat Panel */}
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
            borderRight: isChatOnLeft ? "1px solid var(--border-color)" : "none",
            borderLeft: !isChatOnLeft ? "1px solid var(--border-color)" : "none",
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
            flex: `0 0 ${HISTORY_PANEL_COLLAPSED_WIDTH}px`,
            order: isChatOnLeft ? 1 : 3,
          }}
        >
          {collapsedChatSidebar}
        </div>
      ) : null}
      {/* Resize Handle */}
      {!chatPanelCollapsed && !isFunctionPanelMaximized && (
        <div
          className="resize-handle resize-handle-vertical"
          onMouseDown={(e) => handleMouseDown(e, "horizontal")}
          style={{
            width: "0px",
            background: isResizeHover ? "var(--scrollbar-thumb)" : "var(--border-color)",
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
      {/* Map Panel - This is where earthview data gets rendered */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          minWidth: `${RIGHT_PANEL_MIN_WIDTH}px`,
          display: "flex",
          flexDirection: "row",
          order: isChatOnLeft ? 3 : 1,
        }}
      >
        {mapPanel}
      </div>
    </div>
  );
};
export default MapsPage;
