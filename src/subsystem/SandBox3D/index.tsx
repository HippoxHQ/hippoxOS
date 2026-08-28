import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../../core/TaskManager";
import { TaskStatusEnum } from "../../core/types";
import { showTooltipOnElement } from "../../components/Tooltip";
import { CollapseAllIcon2, ExpandAllIcon2, MessageCircleIcon, ScrollTextIcon } from "../../icons";
import SandBox3DChatPanel from "./SandBox3DChatPanel";
import HistorySandBox3DChatPanel, { HistorySandBox3DChatPanelRef } from "./HistorySandBox3DChatPanel";
import { configCommands } from "../../command/config";
import { useSandBox3DSession } from "../../App/hooks/session/useSandBox3DChatSession";
import { sandbox3dSessionCommands } from "../../command/session/sandbox3d";
import { listenRefresh3DHistory } from "./SandBox3DWindowsEventsManager";
import SandBox3D, { SandBox3DRef, ThreeSceneSnapshot } from "./SandBox3D";
import { SandBox3DHistoryPanel } from "./SandBox3D/SandBox3DHistoryPanel";
import { ToolMenu } from "./SandBox3D/ToolMenu";
import { sandbox3dExportCommands } from "../../command/SandBox3D";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { showDialog, DialogType } from "../../components/Dialog";
import { showToast, ToastType } from "../../components/Toast";
import { CheckSquare, Layers, Pin, PinOff, Square, Trash2 } from "lucide-react";
// Panel Size Constants - aligned with GeneralChatPage
// History panel (leftmost panel) size limits
const HISTORY_PANEL_MIN_WIDTH = 285;
const HISTORY_PANEL_MAX_WIDTH = 400;
const HISTORY_PANEL_DEFAULT_WIDTH = 280;
const HISTORY_PANEL_COLLAPSED_WIDTH = 45;
// Chat panel min width
const CHAT_PANEL_MIN_WIDTH = 200;
const CHAT_PANEL_MAX_WIDTH_RATIO = 0.6; // 60% of main area
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
/**
 * Main 3D Sandbox Page Component
 */
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
  // Session management
  const { currentSessionId: sandbox3dSessionId, handleSendMessage: sandbox3dHandleSendMessage, handleSwitchSession: sandbox3dHandleSwitchSession, handleNewSession: sandbox3dHandleNewSession, shouldShowWelcome: sandbox3dShouldShowWelcome } = useSandBox3DSession(language as "zh" | "en", true);
  // Panel state - using constants for initial values
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(400);
  const [historyWidth, setHistoryWidth] = useState<number>(HISTORY_PANEL_DEFAULT_WIDTH);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState<boolean>(false);
  const [historyCollapsed, setHistoryCollapsed] = useState<boolean>(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [isResizeHover, setIsResizeHover] = useState(false);
  const [isHistoryResizeHover, setIsHistoryResizeHover] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isHistoryAtBottom, setIsHistoryAtBottom] = useState(false);
  // Batch selection state - aligned with GeneralChatPage
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HistorySandBox3DChatPanelRef>(null);
  const sandboxRef = useRef<SandBox3DRef | null>(null);
  // Independent history panel state
  const [historySnapshots, setHistorySnapshots] = useState<ThreeSceneSnapshot[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [isHistoryPanelExpanded, setIsHistoryPanelExpanded] = useState(false);
  const historyLoadedRef = useRef(false);
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
  const [historyPanelKey, setHistoryPanelKey] = useState(0);
  const [gifPath, setGifPath] = useState<string | null>(null);
  // Language helper
  const isZh = i18n === "zh-cn";
  // Clear selection when batch mode is turned off - aligned with GeneralChatPage
  useEffect(() => {
    if (!isBatchMode) {
      setSelectedIds(new Set());
    }
  }, [isBatchMode]);
  // Toggle select all sessions - aligned with GeneralChatPage
  const toggleSelectAll = () => {
    const allIds = historySessions.map((s) => s.session_id);
    if (selectedIds.size === allIds.length && allIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };
  /**
   * Batch pin selected sessions - aligned with GeneralChatPage
   * Pins all sessions that are currently selected in batch mode
   */
  const handleBatchPin = async () => {
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请选择要置顶的会话" : "Please select sessions to pin");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await sandbox3dSessionCommands.updatePinnedSandBox3DSessions(id, true);
      }
      // Refresh HistorySandBox3DChatPanel component
      await historyPanelRef.current?.refreshSessions();
      // Refresh parent component's session list
      const list = await sandbox3dSessionCommands.listSandBox3DSessions();
      setHistorySessions(list);
      setSelectedIds(new Set());
      showToast(ToastType.SUCCESS, isZh ? `已置顶 ${ids.length} 个会话` : `${ids.length} session(s) pinned`);
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "批量置顶失败" : "Batch pin failed");
    }
  };
  /**
   * Batch unpin selected sessions - aligned with GeneralChatPage
   * Unpins all sessions that are currently selected in batch mode
   */
  const handleBatchUnpin = async () => {
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请选择要取消置顶的会话" : "Please select sessions to unpin");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await sandbox3dSessionCommands.updatePinnedSandBox3DSessions(id, false);
      }
      // Refresh HistorySandBox3DChatPanel component
      await historyPanelRef.current?.refreshSessions();
      // Refresh parent component's session list
      const list = await sandbox3dSessionCommands.listSandBox3DSessions();
      setHistorySessions(list);
      setSelectedIds(new Set());
      showToast(ToastType.SUCCESS, isZh ? `已取消置顶 ${ids.length} 个会话` : `${ids.length} session(s) unpinned`);
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "批量取消置顶失败" : "Batch unpin failed");
    }
  };
  /**
   * Batch delete selected sessions - aligned with GeneralChatPage
   * Deletes all sessions that are currently selected in batch mode
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
            await sandbox3dSessionCommands.deleteSandBox3DSession(id);
            const domain = taskManager.getDomainFromSessionId(id);
            taskManager.deleteSession(id, domain);
          }
          // If current session was deleted, switch to another session
          if (sandbox3dSessionId && selectedIds.has(sandbox3dSessionId)) {
            const remainingSessions = historySessions.filter((s) => !selectedIds.has(s.session_id));
            if (remainingSessions.length > 0) {
              sandbox3dHandleSwitchSession(remainingSessions[0].session_id);
            }
          }
          // Refresh HistorySandBox3DChatPanel component
          await historyPanelRef.current?.refreshSessions();
          // Refresh parent component's session list
          const list = await sandbox3dSessionCommands.listSandBox3DSessions();
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
  // Panel toggle handlers
  const handleToggleChatPanel = useCallback(() => {
    if (isFunctionPanelMaximized) return;
    setChatPanelCollapsed((prev) => {
      const newState = !prev;
      saveChatPanelCollapsed(newState);
      return newState;
    });
  }, [isFunctionPanelMaximized]);
  useEffect(() => {
    if (sandboxRef.current) {
      sandboxRef.current.refreshScene();
    }
  }, [theme]);
  /**
   * Refresh history panel from backend - ONLY updates history panel data
   */
  const refreshHistoryPanel = useCallback(async (sessionId: string) => {
    if (!sessionId || sessionId.startsWith("pending_") || sessionId.startsWith("temp_")) {
      return;
    }
    try {
      const chatContent = await sandbox3dSessionCommands.loadChatContent(sessionId);
      if (!chatContent || !Array.isArray(chatContent) || chatContent.length === 0) {
        if (sandboxRef.current) {
          sandboxRef.current.updateHistorySnapshots([]);
        }
        setHistorySnapshots([]);
        setActiveSnapshotId(null);
        return;
      }
      // Extract all 3D scene data from messages
      const scenesData: Array<{ taskId: string; code: string; title: string; createdAt: string }> = [];
      for (const msg of chatContent) {
        if (msg.role !== "LLM") continue;
        try {
          const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
          const parsed = JSON.parse(content);
          if (parsed?.terminalResponse?.threeScene) {
            const threeScene = parsed.terminalResponse.threeScene;
            const chatResponse = parsed.chatResponse;
            scenesData.push({
              taskId: msg.id || `msg_${Date.now()}`,
              code: threeScene.code || "",
              title: chatResponse?.s || threeScene.description || "3D Scene",
              createdAt: msg.timestamp || new Date().toISOString(),
            });
          }
        } catch (e) {
          // skip non-JSON responses
        }
      }
      if (scenesData.length === 0) {
        if (sandboxRef.current) {
          sandboxRef.current.updateHistorySnapshots([]);
        }
        setHistorySnapshots([]);
        setActiveSnapshotId(null);
        return;
      }
      if (sandboxRef.current) {
        sandboxRef.current.updateHistorySnapshots(scenesData);
      }
      const snapshotsWithThumbnails: ThreeSceneSnapshot[] = [];
      for (let i = 0; i < scenesData.length; i++) {
        const scene = scenesData[i];
        const snapshotId = `snapshot_${scene.taskId}`;
        // Generate thumbnail using shared offscreen renderer - main canvas is untouched!
        let thumbnail: string | null = null;
        if (sandboxRef.current && scene.code) {
          // This prevents overloading the WebGL context
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          thumbnail = sandboxRef.current.generateThumbnailOffscreen(scene.code);
        }
        // Update the thumbnail in the sandbox ref data
        if (sandboxRef.current) {
          sandboxRef.current.updateSnapshotThumbnail(snapshotId, thumbnail);
        }
        snapshotsWithThumbnails.push({
          id: snapshotId,
          taskId: scene.taskId,
          code: scene.code,
          title: scene.title,
          thumbnail: thumbnail,
          createdAt: scene.createdAt,
          isActive: i === scenesData.length - 1, // Last one is active
        });
      }
      const lastScene = scenesData[scenesData.length - 1];
      const lastSnapshotId = `snapshot_${lastScene.taskId}`;
      if (sandboxRef.current && lastScene.code) {
        sandboxRef.current.executeThreeCode(lastScene.code, true);
      }
      if (sandboxRef.current) {
        sandboxRef.current.setActiveSnapshot(lastSnapshotId);
      }
      // Update local state to trigger re-render of history panel
      setHistorySnapshots(snapshotsWithThumbnails);
      setActiveSnapshotId(lastSnapshotId);
      historyLoadedRef.current = true;
    } catch (error) {
      console.error("[SandBox3DPage] Failed to refresh history:", error);
    }
  }, []);
  /**
   * Handle switching to a snapshot - renders on main canvas
   */
  const handleSwitchToSnapshot = useCallback(
    (snapshotId: string) => {
      const snapshot = historySnapshots.find((s) => s.id === snapshotId);
      if (!snapshot || !sandboxRef.current) return;
      // Switch to snapshot - this will render on the main canvas
      sandboxRef.current.switchToSnapshot(snapshotId);
      // Update local state to reflect the change
      setActiveSnapshotId(snapshotId);
      const updatedSnapshots = sandboxRef.current?.getSnapshots() || [];
      setHistorySnapshots(updatedSnapshots);
    },
    [historySnapshots],
  );
  useEffect(() => {
    const checkGif = async () => {
      const taskId = historySnapshots.find((s) => s.isActive)?.taskId;
      if (!sandbox3dSessionId || !taskId) {
        setGifPath(null);
        return;
      }
      try {
        const path = await sandbox3dExportCommands.getSandbox3dGifPath(sandbox3dSessionId, taskId);
        setGifPath(path || null);
      } catch (error) {
        setGifPath(null);
      }
    };
    checkGif();
  }, [sandbox3dSessionId, historySnapshots]);
  useEffect(() => {
    const cleanup = listenRefresh3DHistory((event) => {
      const sessionId = event.detail?.sessionId || sandbox3dSessionId;
      if (sessionId) {
        setTimeout(() => {
          refreshHistoryPanel(sessionId);
          setHistoryPanelKey((prev) => prev + 1);
        }, 500);
      }
    });
    return cleanup;
  }, [sandbox3dSessionId, refreshHistoryPanel]);
  // Initial load of history
  useEffect(() => {
    if (sandbox3dSessionId && !historyLoadedRef.current) {
      const timer = setTimeout(() => {
        refreshHistoryPanel(sandbox3dSessionId);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sandbox3dSessionId, refreshHistoryPanel]);
  // Reset loaded flag when session changes
  useEffect(() => {
    historyLoadedRef.current = false;
  }, [sandbox3dSessionId]);
  /**
   * Create chat panel
   */
  const chatPanel = <SandBox3DChatPanel onSendMessage={sandbox3dHandleSendMessage} onFileClick={onFileClick} t={t} onDragOverInputChange={onDragOverInputChange} language={language} isLeftPanel={isChatOnLeft} currentSessionId={sandbox3dSessionId} sandboxRef={sandboxRef} />;
  /**
   * Create 3D sandbox panel with ref attached and independent history panel
   */
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
      <SandBox3D ref={sandboxRef} theme={theme} i18n={i18n} t={t} currentSessionId={sandbox3dSessionId} />
      <SandBox3DHistoryPanel key={historyPanelKey} snapshots={historySnapshots} activeSnapshotId={activeSnapshotId} onSnapshotClick={handleSwitchToSnapshot} isExpanded={isHistoryPanelExpanded} onToggle={() => setIsHistoryPanelExpanded(!isHistoryPanelExpanded)} t={t} isZh={i18n === "zh-cn"} />
      <ToolMenu
        onRefresh={() => {
          if (sandboxRef.current) {
            sandboxRef.current.refreshScene();
          }
        }}
        onExportGif={async (duration, fps, quality) => {
          if (sandboxRef.current) {
            return await sandboxRef.current.exportGif(duration, fps, quality);
          }
          return null;
        }}
        onClearScene={() => {
          if (sandboxRef.current) {
            sandboxRef.current.clearScene();
          }
        }}
        onResetCamera={() => {}}
        onToggleFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        }}
        isZh={i18n === "zh-cn"}
        theme={theme}
        currentSessionId={sandbox3dSessionId}
        currentTaskId={historySnapshots.find((s) => s.isActive)?.taskId || null}
        gifPath={gifPath}
        onGifUploaded={(path) => {
          setGifPath(path);
          const taskId = historySnapshots.find((s) => s.isActive)?.taskId;
          if (taskId && sandbox3dSessionId) {
            localStorage.setItem(`sandbox3d_gif_${sandbox3dSessionId}_${taskId}`, path);
          }
        }}
        onDeleteGif={() => {
          setGifPath(null);
          const taskId = historySnapshots.find((s) => s.isActive)?.taskId;
          if (taskId && sandbox3dSessionId) {
            localStorage.removeItem(`sandbox3d_gif_${sandbox3dSessionId}_${taskId}`);
          }
        }}
      />
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
  // Layout mode loading
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
  // Layout change listener
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { pageType, mode } = event.detail;
      if (pageType === "sandbox3d") {
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
      window.removeEventListener("sandbox3d-session-created", handleSessionCreated);
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
    const savedHistoryWidth = localStorage.getItem("hippox-sandbox3d-history-width");
    const savedHistoryCollapsed = localStorage.getItem("hippox-sandbox3d-history-collapsed");
    const savedChatPanelCollapsed = localStorage.getItem("hippox-sandbox3d-chat-collapsed");
    const savedChatPanelWidth = localStorage.getItem("hippox-sandbox3d-chat-width");
    if (savedHistoryWidth) setHistoryWidth(parseFloat(savedHistoryWidth));
    if (savedHistoryCollapsed) setHistoryCollapsed(savedHistoryCollapsed === "true");
    if (savedChatPanelCollapsed) setChatPanelCollapsed(savedChatPanelCollapsed === "true");
    if (savedChatPanelWidth) setChatPanelWidth(parseFloat(savedChatPanelWidth));
  }, []);
  // Persistence helpers
  const saveHistoryWidth = (width: number) => {
    localStorage.setItem("hippox-sandbox3d-history-width", width.toString());
  };
  const saveHistoryCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-sandbox3d-history-collapsed", collapsed.toString());
  };
  const saveChatPanelCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-sandbox3d-chat-collapsed", collapsed.toString());
  };
  const saveChatPanelWidth = (width: number) => {
    localStorage.setItem("hippox-sandbox3d-chat-width", width.toString());
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
   * Listen for sandbox3d-switch-session event from search results
   * This allows the search dialog to switch to a specific 3D sandbox session
   */
  useEffect(() => {
    const handleSandbox3dSwitchSession = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId } = e.detail;
      if (sessionId) {
        sandbox3dHandleSwitchSession(sessionId);
      }
    };
    window.addEventListener(APP_WINDOW_EVENTS.SANDBOX3D_SWITCH_SESSION, handleSandbox3dSwitchSession as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.SANDBOX3D_SWITCH_SESSION, handleSandbox3dSwitchSession as EventListener);
    };
  }, [sandbox3dHandleSwitchSession]);
  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      sandbox3dHandleSwitchSession(sessionId);
    },
    [sandbox3dHandleSwitchSession],
  );
  const handleNewSession = useCallback(() => {
    sandbox3dHandleNewSession();
  }, [sandbox3dHandleNewSession]);
  // Resize drag handlers with constants for clamping
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
      // Use constants for min width
      const minWidthPx = CHAT_PANEL_MIN_WIDTH;
      const maxWidthPx = mainAreaWidth * CHAT_PANEL_MAX_WIDTH_RATIO;
      newWidthPx = Math.max(minWidthPx, Math.min(maxWidthPx, newWidthPx));
      setChatPanelWidth(newWidthPx);
      saveChatPanelWidth(newWidthPx);
    } else if (dragType.current === "history") {
      const newWidth = dragStartHistoryWidth.current + deltaX;
      // Use HISTORY_PANEL constants for clamping
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
  // Common button style for header actions - aligned with GeneralChatPage
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
  /**
   * Get history panel content - aligned with GeneralChatPage
   */
  const getHistoryPanelContent = () => {
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
          <CollapsedHistoryList sessions={historySessions} currentSessionId={sandbox3dSessionId} onSelectSession={handleSessionSelect} />
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
          {/* Left side: Title and action buttons - always visible - aligned with GeneralChatPage */}
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
              {isHistoryAtBottom ? "▲" : "▼"}
            </button>
            {/* New session button - only when not in batch mode */}
            {!isBatchMode && (
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
                title={isZh ? "新建会话" : "New Session"}
              >
                +
              </button>
            )}
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
          <HistorySandBox3DChatPanel
            ref={historyPanelRef}
            t={t}
            onSessionSelect={handleSessionSelect}
            currentSessionId={sandbox3dSessionId}
            onNewSession={handleNewSession}
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
  const historyWidthPx = historyCollapsed || isFunctionPanelMaximized ? HISTORY_PANEL_COLLAPSED_WIDTH : historyWidth;
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
      {!chatPanelCollapsed && !isFunctionPanelMaximized ? (
        <div
          className="panel-chat"
          style={{
            flex: "0 0 auto",
            width: `${chatPanelWidth}px`,
            overflow: "hidden",
            minWidth: `${CHAT_PANEL_MIN_WIDTH}px`,
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
