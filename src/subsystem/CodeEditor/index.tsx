import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../../core/TaskManager";
import { CollapseAllIcon2, ExpandAllIcon2, FileIcon, FolderIcon, GithubIcon, MessageCircleIcon, ScrollTextIcon } from "../../icons";
import CodingPage, { CodingRef } from "./Coding";
import { configCommands } from "../../command/config";
import HistoryCodeEditorChatPanel, { HistoryCodeEditorChatPanelRef } from "./HistoryCodeEditorChatPanel";
import CodeEditorChatPanel from "./CodeEditorChatPanel";
import { useCodeEditorSession } from "../../App/hooks/session/useCodeEditorChatSession";
import { codeEditorSessionCommands } from "../../command/session/codeeditor";
import CodeEditorWelcomePage from "./CodeEditorWelcomePage";
import { listen } from "@tauri-apps/api/event";
import { githubCommands } from "../../command/net/github";
import { showToast, ToastType } from "../../components/Toast";
import { open } from "@tauri-apps/plugin-dialog";
import GithubClone from "./GithubClone";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { CheckSquare, Square, Layers, Pin, PinOff, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { showDialog, DialogType } from "../../components/Dialog";
// Panel Size Constants - Aligned with GeneralChatPage
// History panel (leftmost panel) size limits
const HISTORY_PANEL_MIN_WIDTH = 285;
const HISTORY_PANEL_MAX_WIDTH = 400;
const HISTORY_PANEL_DEFAULT_WIDTH = 280;
const HISTORY_PANEL_COLLAPSED_WIDTH = 45;
// Chat panel width limits (right panel in code editor)
const CHAT_PANEL_MIN_WIDTH = 200;
const CHAT_PANEL_MAX_WIDTH_RATIO = 0.6; // Max 60% of main area
const GLOBAL_SESSION_LOCK = {
  isCreating: false,
  lastPath: "",
  lastTime: 0,
  lockedPaths: new Map<string, number>(),
  processingPaths: new Set<string>(),
  cleanup() {
    const now = Date.now();
    for (const [path, time] of Array.from(this.lockedPaths.entries())) {
      if (now - time > 5000) {
        this.lockedPaths.delete(path);
      }
    }
  },
  tryLock(path: string): boolean {
    this.cleanup();
    const now = Date.now();
    if (this.processingPaths.has(path)) {
      return false;
    }
    if (this.isCreating) {
      return false;
    }
    if (this.lockedPaths.has(path)) {
      const lockTime = this.lockedPaths.get(path)!;
      if (now - lockTime < 5000) {
        return false;
      }
    }
    this.isCreating = true;
    this.lastPath = path;
    this.lastTime = now;
    this.lockedPaths.set(path, now);
    this.processingPaths.add(path);
    return true;
  },
  unlock(path?: string) {
    this.isCreating = false;
    const targetPath = path || this.lastPath;
    if (targetPath) {
      this.processingPaths.delete(targetPath);
    }
    setTimeout(() => {
      if (this.lastPath) {
        this.lockedPaths.delete(this.lastPath);
      }
    }, 3000);
  },
};
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
  const { currentSessionId, handleSendMessage: handleSendMessageHook, handleSwitchSession, handleNewSession, shouldShowWelcome, createSessionWithWorkspace } = useCodeEditorSession(language as "zh" | "en", isConfigLoaded, onCloseSkillsManager);
  const dropLockRef = useRef<{ path: string; time: number } | null>(null);
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(400);
  // Use the same history panel width constants as GeneralChatPage
  const [historyWidth, setHistoryWidth] = useState<number>(HISTORY_PANEL_DEFAULT_WIDTH);
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
  const [layoutSwapMode, setLayoutSwapMode] = useState<"terminal-left" | "chat-left">("terminal-left");
  const isChatOnLeft = layoutSwapMode === "chat-left";
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const hasHistorySessions = historySessions.length > 0;
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [showGithubDialog, setShowGithubDialog] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const layoutSwapModeRef = useRef<"terminal-left" | "chat-left">("terminal-left");
  const codingRef = useRef<CodingRef | null>(null);
  // Batch selection state
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isZh = language === "zh";
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
      showToast(ToastType.WARNING, isZh ? "请选择要置顶的会话" : "Please select sessions to pin");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await codeEditorSessionCommands.updatePinnedCodeEditorSessions(id, true);
      }
      // Refresh HistoryCodeEditorChatPanel component
      await historyPanelRef.current?.refreshSessions();
      // Refresh parent component's session list
      const list = await codeEditorSessionCommands.listCodeEditorSessions();
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
        await codeEditorSessionCommands.updatePinnedCodeEditorSessions(id, false);
      }
      // Refresh HistoryCodeEditorChatPanel component
      await historyPanelRef.current?.refreshSessions();
      // Refresh parent component's session list
      const list = await codeEditorSessionCommands.listCodeEditorSessions();
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
    // if (selectedIds.size >= historySessions.length) {
    //   showDialog(DialogType.WARNING, t("history.dialog.cannotDeleteTitle"), t("history.dialog.cannotDeleteMessage"), undefined, undefined, t("history.dialog.gotIt"), undefined);
    //   return;
    // }
    showDialog(
      DialogType.WARNING,
      isZh ? "批量删除会话" : "Batch Delete Sessions",
      isZh ? `确定要删除选中的 ${selectedIds.size} 个会话吗？此操作不可恢复。` : `Are you sure you want to delete ${selectedIds.size} selected session(s)? This action cannot be undone.`,
      async () => {
        try {
          const ids = Array.from(selectedIds);
          for (const id of ids) {
            await codeEditorSessionCommands.deleteCodeEditorSession(id);
            const domain = taskManager.getDomainFromSessionId(id);
            taskManager.deleteSession(id, domain);
          }
          // If current session was deleted, switch to another session
          if (currentSessionId && selectedIds.has(currentSessionId) && handleSwitchSession) {
            const remainingSessions = historySessions.filter((s) => !selectedIds.has(s.session_id));
            if (remainingSessions.length > 0) {
              handleSwitchSession(remainingSessions[0].session_id);
            }
          }
          // Refresh HistoryCodeEditorChatPanel component
          await historyPanelRef.current?.refreshSessions();
          // Refresh parent component's session list
          const list = await codeEditorSessionCommands.listCodeEditorSessions();
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
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenuPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const handleSendMessage = useCallback(
    (message: string, sessionId: string, files?: any[], workflowMode?: string) => {
      handleSendMessageHook(message, sessionId, files, workflowMode);
    },
    [handleSendMessageHook],
  );
  /**
   * Listen for codeeditor-switch-session event from search results
   * This allows the search dialog to switch to a specific code editor session
   */
  useEffect(() => {
    const handleCodeEditorSwitchSession = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId } = e.detail;
      if (sessionId) {
        handleSwitchSession(sessionId);
      }
    };
    window.addEventListener(APP_WINDOW_EVENTS.CODEEDITOR_SWITCH_SESSION, handleCodeEditorSwitchSession as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.CODEEDITOR_SWITCH_SESSION, handleCodeEditorSwitchSession as EventListener);
    };
  }, [handleSwitchSession]);
  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      handleSwitchSession(sessionId);
    },
    [handleSwitchSession],
  );
  const handleNewSessionClick = useCallback(() => {
    setShowMenuPopup(!showMenuPopup);
  }, [showMenuPopup]);
  const handleSelectFolder = async () => {
    setShowMenuPopup(false);
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: language === "zh" ? "选择工作区目录" : "Select Workspace Directory",
      });
      if (selected && typeof selected === "string") {
        await handleSelectWorkspace(selected, "directory");
      }
    } catch (error) {
      showToast(ToastType.ERROR, language === "zh" ? "选择目录失败" : "Failed to select directory");
    }
  };
  const handleSelectFile = async () => {
    setShowMenuPopup(false);
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: language === "zh" ? "选择文件" : "Select File",
        filters: [
          {
            name: language === "zh" ? "所有文件" : "All Files",
            extensions: ["*"],
          },
        ],
      });
      if (selected && typeof selected === "string") {
        await handleSelectWorkspace(selected, "file");
      }
    } catch (error) {
      showToast(ToastType.ERROR, language === "zh" ? "选择文件失败" : "Failed to select file");
    }
  };
  const handleSelectGithub = () => {
    setShowMenuPopup(false);
    setShowGithubDialog(true);
  };
  const handleToggleChatPanel = () => {
    if (isFunctionPanelMaximized) return;
    setChatPanelCollapsed(!chatPanelCollapsed);
    saveChatPanelCollapsed(!chatPanelCollapsed);
  };
  const loadWorkspacePath = useCallback(async (sessionId: string) => {
    if (!sessionId || sessionId.startsWith("pending_") || sessionId.startsWith("temp_")) {
      setWorkspacePath(null);
      return;
    }
    try {
      const config = await codeEditorSessionCommands.loadCodeEditorSessionConfig(sessionId);
      if (config && config.workspace_path) {
        setWorkspacePath(config.workspace_path);
      } else {
        setWorkspacePath(null);
      }
    } catch (error) {
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
  const loadHistorySessions = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const list = await codeEditorSessionCommands.listCodeEditorSessions();
      setHistorySessions(list);
    } catch (error) {
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);
  const createSessionWithWorkspaceRef = useRef(createSessionWithWorkspace);
  const loadHistorySessionsRef = useRef(loadHistorySessions);
  const loadWorkspacePathRef = useRef(loadWorkspacePath);
  const currentSessionIdRef = useRef(currentSessionId);
  const languageRef = useRef(language);
  useEffect(() => {
    createSessionWithWorkspaceRef.current = createSessionWithWorkspace;
    loadHistorySessionsRef.current = loadHistorySessions;
    loadWorkspacePathRef.current = loadWorkspacePath;
    currentSessionIdRef.current = currentSessionId;
    languageRef.current = language;
  }, [createSessionWithWorkspace, loadHistorySessions, loadWorkspacePath, currentSessionId, language]);
  const createSessionWithLock = useCallback(
    async (workspacePath: string, workspaceType: "directory" | "file") => {
      if (!GLOBAL_SESSION_LOCK.tryLock(workspacePath)) {
        return;
      }
      setIsCreatingSession(true);
      try {
        await createSessionWithWorkspace(workspacePath, workspaceType);
        await loadHistorySessions();
        if (currentSessionId) {
          await loadWorkspacePath(currentSessionId);
        }
      } catch (error) {
      } finally {
        setIsCreatingSession(false);
        GLOBAL_SESSION_LOCK.unlock(workspacePath);
      }
    },
    [createSessionWithWorkspace, loadHistorySessions, currentSessionId, loadWorkspacePath],
  );
  const handleSelectWorkspace = useCallback(
    async (workspacePath: string, workspaceType: "directory" | "file") => {
      await createSessionWithLock(workspacePath, workspaceType);
    },
    [createSessionWithLock],
  );
  const handleGithubClone = async (repoUrl: string, targetPath: string, branch: string) => {
    try {
      await githubCommands.cloneRepository(repoUrl, targetPath, branch || "main");
      await handleSelectWorkspace(targetPath, "directory");
      setShowGithubDialog(false);
      window.dispatchEvent(
        new CustomEvent("github-clone-complete", {
          detail: { repoUrl, targetPath, branch },
        }),
      );
    } catch (error) {
      showToast(ToastType.ERROR, language === "zh" ? "克隆失败" : "Clone Failed");
      throw error;
    }
  };
  useEffect(() => {
    loadHistorySessions();
  }, [loadHistorySessions]);
  useEffect(() => {
    const loadLayoutMode = async () => {
      try {
        const mode = await configCommands.getSettingsCodeEditorLayoutSwapMode();
        if (mode === "terminal-left" || mode === "chat-left") {
          setLayoutSwapMode(mode);
          layoutSwapModeRef.current = mode;
        }
      } catch (error) {}
    };
    loadLayoutMode();
  }, []);
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { pageType, mode } = event.detail;
      if (pageType === "codeeditor") {
        setLayoutSwapMode(mode);
        layoutSwapModeRef.current = mode;
      }
    };
    window.addEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    return () => {
      window.removeEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    };
  }, []);
  useEffect(() => {
    const handleSessionCreated = () => {
      historyPanelRef.current?.refreshSessions();
      loadHistorySessions();
    };
    window.addEventListener("codeeditor-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("codeeditor-session-created", handleSessionCreated);
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
  const createSessionWithLockRef = useRef(createSessionWithLock);
  useEffect(() => {
    createSessionWithLockRef.current = createSessionWithLock;
  }, [createSessionWithLock]);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    let unlisten: (() => void) | undefined;
    const setupFileDropListener = async () => {
      try {
        unlisten = await listen<string[]>("file-drop", async (event) => {
          if (!isMountedRef.current) {
            return;
          }
          const paths = event.payload;
          if (!paths || paths.length === 0) return;
          const path = paths[0];
          const now = Date.now();
          if (dropLockRef.current && dropLockRef.current.path === path && now - dropLockRef.current.time < 1000) {
            return;
          }
          dropLockRef.current = { path, time: now };
          await createSessionWithLockRef.current(path, "directory");
        });
      } catch (error) {
        console.error("Failed to setup file drop listener:", error);
      }
    };
    setupFileDropListener();
    return () => {
      isMountedRef.current = false;
      if (unlisten) {
        unlisten();
        unlisten = undefined;
      }
    };
  }, []);
  useEffect(() => {
    const savedHistoryWidth = localStorage.getItem("hippox-codeeditor-history-width");
    const savedHistoryCollapsed = localStorage.getItem("hippox-codeeditor-history-collapsed");
    const savedChatPanelCollapsed = localStorage.getItem("hippox-codeeditor-chat-collapsed");
    const savedChatPanelWidth = localStorage.getItem("hippox-codeeditor-chat-width");
    if (savedHistoryWidth) {
      const parsed = parseFloat(savedHistoryWidth);
      // Clamp the loaded value within the valid range
      setHistoryWidth(Math.max(HISTORY_PANEL_MIN_WIDTH, Math.min(HISTORY_PANEL_MAX_WIDTH, parsed)));
    }
    if (savedHistoryCollapsed) setHistoryCollapsed(savedHistoryCollapsed === "true");
    if (savedChatPanelCollapsed) setChatPanelCollapsed(savedChatPanelCollapsed === "true");
    if (savedChatPanelWidth) setChatPanelWidth(parseFloat(savedChatPanelWidth));
  }, []);
  const saveHistoryWidth = (width: number) => {
    localStorage.setItem("hippox-codeeditor-history-width", width.toString());
  };
  const saveHistoryCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-codeeditor-history-collapsed", collapsed.toString());
  };
  const saveChatPanelCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-codeeditor-chat-collapsed", collapsed.toString());
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
      const minWidthPx = CHAT_PANEL_MIN_WIDTH;
      const maxWidthPx = mainAreaWidth * CHAT_PANEL_MAX_WIDTH_RATIO;
      newWidthPx = Math.max(minWidthPx, Math.min(maxWidthPx, newWidthPx));
      setChatPanelWidth(newWidthPx);
      saveChatPanelWidth(newWidthPx);
    } else if (dragType.current === "history") {
      const newWidth = dragStartHistoryWidth.current + deltaX;
      // Use the same constants as GeneralChatPage
      const clamped = Math.min(HISTORY_PANEL_MAX_WIDTH, Math.max(HISTORY_PANEL_MIN_WIDTH, newWidth));
      setHistoryWidth(clamped);
      saveHistoryWidth(clamped);
    }
  }, []);
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove]);
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
  // Header button style
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
  const getHistoryPanelContent = () => {
    if (historyCollapsed || isFunctionPanelMaximized) {
      return (
        <div
          className="collapsed-sidebar"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: `${HISTORY_PANEL_COLLAPSED_WIDTH}px`,
            minWidth: `${HISTORY_PANEL_COLLAPSED_WIDTH}px`,
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
          {/* Right side: Collapse panel button and New Session button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              gap: "2px",
            }}
          >
            {/* New Session button */}
            <button
              ref={buttonRef}
              style={headerButtonStyle}
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
              <span style={{ fontSize: "18px", fontWeight: 600 }}>+</span>
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
              title={isZh ? "收起面板" : "Collapse panel"}
            >
              ≪
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
            onAllSessionsDeleted={() => {
              setHistorySessions([]);
              handleSwitchSession("");
              setTimeout(() => {
                handleNewSession();
              }, 100);
            }}
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
  const chatPanel = <CodeEditorChatPanel onSendMessage={handleSendMessage} onFileClick={onFileClick} t={t} currentSessionId={currentSessionId} onDragOverInputChange={onDragOverInputChange} language={language} isLeftPanel={isChatOnLeft} codingRef={codingRef} />;
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
      <CodingPage ref={codingRef} t={t} onClose={() => {}} workspacePath={workspacePath} onTabChange={(filePath) => {}} />
    </div>
  );
  const collapsedChatSidebar = (
    <div
      className="collapsed-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: `${HISTORY_PANEL_COLLAPSED_WIDTH}px`,
        minWidth: `${HISTORY_PANEL_COLLAPSED_WIDTH}px`,
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
        <CodeEditorWelcomePage t={t} language={language} onSelectWorkspace={handleSelectWorkspace} isLoading={isCreatingSession} />
      </div>
    );
  }
  return (
    <>
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
              order: isChatOnLeft ? 2 : 2,
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
          {codeEditorPanel}
        </div>
      </div>
      {showMenuPopup && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            zIndex: 9999,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "5px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "4px",
            minWidth: "120px",
            top: "68px",
            left: "225px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1px",
            }}
          >
            <div
              onClick={handleSelectFolder}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "5px 10px",
                borderRadius: "5px",
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: "12px",
                transition: "background 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <FolderIcon size={14} />
              <span>{language === "zh" ? "选择目录" : "Select Folder"}</span>
            </div>
            <div
              onClick={handleSelectFile}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: "12px",
                transition: "background 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <FileIcon size={14} />
              <span>{language === "zh" ? "选择文件" : "Select File"}</span>
            </div>
            <div
              onClick={handleSelectGithub}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: "12px",
                transition: "background 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <GithubIcon size={14} />
              <span>{language === "zh" ? "GitHub 拉取" : "GitHub Clone"}</span>
            </div>
          </div>
        </div>
      )}
      <GithubClone t={t} language={language} isOpen={showGithubDialog} onClose={() => setShowGithubDialog(false)} onClone={handleGithubClone} isLoading={isCreatingSession} />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};
export default CodeEditorPage;
