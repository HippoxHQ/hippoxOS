import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../../core/TaskManager";
import { SessionDomain, TaskStatusEnum } from "../../core/types";
import { showTooltipOnElement } from "../../components/Tooltip";
import { MessageCircleIcon } from "../../icons";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { showToast, ToastType } from "../../components/Toast";
import { EarthViewRef } from "./OfficeChatPanel/types";
// FIX: Import the Office-owned chat panel / canvas panel / welcome page.
import OfficeChatPanel from "./OfficeChatPanel";
import OfficePanel from "./OfficePanel";
import OfficeWelcomePage from "./OfficeWelcomePage";
import { useOfficeChatSession } from "../../App/hooks/session/useOfficeChatSession";
const HISTORY_PANEL_MIN_WIDTH = 285;
const HISTORY_PANEL_MAX_WIDTH = 400;
const HISTORY_PANEL_DEFAULT_WIDTH = 280;
const HISTORY_PANEL_COLLAPSED_WIDTH = 45;
const LEFT_PANEL_MIN_PERCENT = 25;
const LEFT_PANEL_MAX_PERCENT = 75;
const LEFT_PANEL_DEFAULT_PERCENT = 50;
const RIGHT_PANEL_MIN_WIDTH = 150;
// Minimum width reserved for the Office canvas area.
const OFFICE_MIN_WINDOW_WIDTH = 720;
interface OfficePageProps {
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
  /**
   * Optional session id to open directly on mount.
   */
  initSessionId?: string | null;
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
const OfficePage: React.FC<OfficePageProps> = ({ t = (key: string) => key, isFunctionPanelMaximized = false, theme = "dark", i18n = "en", mapData, onMapLoad, onMapClick, onMapMoveEnd, onFileClick, language = "en", onDragOverInputChange, initSessionId = null }) => {
  const { currentSessionId: officeSessionId, handleSendMessage: officeHandleSendMessage, handleSwitchSession: officeHandleSwitchSession, handleNewSession: officeHandleNewSession, shouldShowWelcome: officeShouldShowWelcome, isCreatingSession } = useOfficeChatSession(language as "zh" | "en", true);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [officeKey, setOfficeKey] = useState<number>(0);
  const [isSwitchingSession, setIsSwitchingSession] = useState<boolean>(false);
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(400);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState<boolean>(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [isResizeHover, setIsResizeHover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCreatingSessionRef = useRef(false);
  const mapRef = useRef<EarthViewRef | null>(null);
  const isDragging = useRef(false);
  const isResizingRef = useRef(false);
  const isUserActionRef = useRef(false);
  const dragType = useRef<"horizontal">("horizontal");
  const dragStartX = useRef(0);
  const dragStartChatPanelWidth = useRef(400);
  const dragStartContainerRect = useRef<DOMRect | null>(null);
  const [layoutSwapMode, setLayoutSwapMode] = useState<"terminal-left" | "chat-left">("terminal-left");
  const layoutSwapModeRef = useRef<"terminal-left" | "chat-left">("terminal-left");
  const isChatOnLeft = layoutSwapMode === "chat-left";
  // Guard so that initSessionId only opens once on mount.
  const didInitSessionRef = useRef<boolean>(false);
  useEffect(() => {
    // FIX: Set the Office domain, not the ImageEditor domain.
    taskManager.setCurrentDomain(SessionDomain.Office);
  }, []);
  // Panel toggle handlers
  const handleToggleChatPanel = useCallback(() => {
    if (isFunctionPanelMaximized) return;
    setChatPanelCollapsed((prev) => {
      const newState = !prev;
      saveChatPanelCollapsed(newState);
      return newState;
    });
  }, [isFunctionPanelMaximized]);
  const handleSelectImage = useCallback(
    async (imagePath: string, imageType: "file" | "empty" | "download") => {
      if (isCreatingSessionRef.current || isSwitchingSession) {
        return;
      }
      isCreatingSessionRef.current = true;
      try {
        setOfficeKey((prev) => prev + 1);
        await officeHandleNewSession(imagePath, imageType);
        setShowWelcome(false);
      } finally {
        isCreatingSessionRef.current = false;
      }
    },
    [officeHandleNewSession, isSwitchingSession],
  );
  const handleNewProject = useCallback(async () => {
    if (isSwitchingSession || isCreatingSessionRef.current) return;
    isCreatingSessionRef.current = true;
    try {
      setOfficeKey((prev) => prev + 1);
      await officeHandleNewSession("", "empty");
      setShowWelcome(false);
    } finally {
      isCreatingSessionRef.current = false;
    }
  }, [officeHandleNewSession, isSwitchingSession]);
  const handleSelectSessionFromWelcome = useCallback(
    async (sessionId: string) => {
      if (isSwitchingSession) {
        console.warn("[OfficePage] Session switch already in progress");
        return;
      }
      setIsSwitchingSession(true);
      try {
        await officeHandleSwitchSession(sessionId);
        setOfficeKey((prev) => prev + 1);
        setShowWelcome(false);
      } catch (error) {
        console.error("[OfficePage] Failed to switch session:", error);
        showToast(ToastType.ERROR, language === "zh" ? "切换会话失败" : "Failed to switch session");
      } finally {
        setIsSwitchingSession(false);
      }
    },
    [officeHandleSwitchSession, isSwitchingSession, language],
  );
  /**
   * Open the session passed via `initSessionId` exactly once on mount.
   */
  useEffect(() => {
    if (didInitSessionRef.current) return;
    if (!initSessionId) return;
    didInitSessionRef.current = true;
    (async () => {
      try {
        await officeHandleSwitchSession(initSessionId);
        setOfficeKey((prev) => prev + 1);
        setShowWelcome(false);
      } catch (error) {
        console.error("[OfficePage] Failed to open init session:", error);
        showToast(ToastType.ERROR, language === "zh" ? "切换会话失败" : "Failed to switch session");
      }
    })();
  }, [initSessionId, officeHandleSwitchSession, language]);
  const handleBackToWelcome = useCallback(() => {
    setOfficeKey((prev) => prev + 1);
    setShowWelcome(true);
  }, []);
  const chatPanel = <OfficeChatPanel onSendMessage={officeHandleSendMessage} onFileClick={onFileClick} t={t} currentSessionId={officeSessionId} onDragOverInputChange={onDragOverInputChange} language={language} isLeftPanel={isChatOnLeft} mapRef={mapRef} />;
  /**
   * Office panel — the right-hand main area.
   */
  const mapPanel = <OfficePanel key={officeKey} t={t} language={language} onBackToWelcome={handleBackToWelcome} currentSessionId={officeSessionId} style={{ width: "100%", height: "100%" }} />;
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
          {isChatOnLeft ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
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
  // Layout change listener — scoped to the office page type.
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { pageType, mode } = event.detail;
      if (pageType === "office") {
        setLayoutSwapMode(mode);
        layoutSwapModeRef.current = mode;
      }
    };
    window.addEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    return () => {
      window.removeEventListener("layout-swap-mode-changed", handleLayoutChange as EventListener);
    };
  }, []);
  // Load persisted state from localStorage — office-scoped keys.
  useEffect(() => {
    const savedChatPanelCollapsed = localStorage.getItem("hippox-office-chat-collapsed");
    const savedChatPanelWidth = localStorage.getItem("hippox-office-chat-width");
    if (savedChatPanelCollapsed) setChatPanelCollapsed(savedChatPanelCollapsed === "true");
    if (savedChatPanelWidth) {
      // Clamp persisted width to the valid range
      const parsed = parseFloat(savedChatPanelWidth);
      if (!isNaN(parsed)) {
        setChatPanelWidth(Math.max(HISTORY_PANEL_MIN_WIDTH, Math.min(HISTORY_PANEL_MAX_WIDTH, parsed)));
      }
    }
  }, []);
  // Persistence helpers
  const saveChatPanelCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-office-chat-collapsed", collapsed.toString());
  };
  const saveChatPanelWidth = (width: number) => {
    localStorage.setItem("hippox-office-chat-width", width.toString());
  };
  /**
   * Auto-adjust panel widths based on container size.
   */
  useEffect(() => {
    const checkWidth = () => {
      // Skip while the user is actively dragging or just toggled
      if (isResizingRef.current || isUserActionRef.current) {
        return;
      }
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const availableWidth = containerWidth - OFFICE_MIN_WINDOW_WIDTH;
      const defaultWidth = HISTORY_PANEL_DEFAULT_WIDTH;
      const minWidth = HISTORY_PANEL_MIN_WIDTH;
      if (chatPanelCollapsed) {
        return;
      }
      if (availableWidth >= defaultWidth) {
        if (chatPanelWidth !== defaultWidth) {
          setChatPanelWidth(defaultWidth);
          saveChatPanelWidth(defaultWidth);
        }
        return;
      }
      if (availableWidth >= minWidth) {
        if (chatPanelWidth !== minWidth) {
          setChatPanelWidth(minWidth);
          saveChatPanelWidth(minWidth);
        }
        return;
      }
      if (chatPanelWidth > minWidth) {
        setChatPanelWidth(minWidth);
        saveChatPanelWidth(minWidth);
      }
    };
    let timeoutId: number | null = null;
    const debouncedCheck = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(checkWidth, 100);
    };
    setTimeout(checkWidth, 50);
    const observer = new ResizeObserver(() => {
      debouncedCheck();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener("resize", debouncedCheck);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", debouncedCheck);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [chatPanelCollapsed, chatPanelWidth, showWelcome]);
  useEffect(() => {
    const handleOfficeSwitchSession = (e: CustomEvent) => {
      const { sessionId } = e.detail;
      if (sessionId) {
        officeHandleSwitchSession(sessionId);
        // Ensure the office panel is visible when switching sessions from search.
        setShowWelcome(false);
      }
    };
    // APP_WINDOW_EVENTS only exposes IMAGE_EDITOR_SWITCH_SESSION today.
    window.addEventListener(APP_WINDOW_EVENTS.IMAGE_EDITOR_SWITCH_SESSION, handleOfficeSwitchSession as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.IMAGE_EDITOR_SWITCH_SESSION, handleOfficeSwitchSession as EventListener);
    };
  }, [officeHandleSwitchSession]);
  const handleMouseDown = (e: React.MouseEvent, type: "horizontal") => {
    if (chatPanelCollapsed || isFunctionPanelMaximized) return;
    isUserActionRef.current = true;
    isDragging.current = true;
    isResizingRef.current = true;
    dragType.current = type;
    dragStartX.current = e.clientX;
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
      const mainAreaWidth = containerWidth;
      if (mainAreaWidth <= 0) return;
      const startWidthPx = dragStartChatPanelWidth.current;
      const currentMode = layoutSwapModeRef.current;
      let newWidthPx;
      if (currentMode === "terminal-left") {
        newWidthPx = startWidthPx - deltaX;
      } else {
        newWidthPx = startWidthPx + deltaX;
      }
      newWidthPx = Math.max(HISTORY_PANEL_MIN_WIDTH, Math.min(HISTORY_PANEL_MAX_WIDTH, newWidthPx));
      const maxChatWidth = mainAreaWidth - OFFICE_MIN_WINDOW_WIDTH;
      if (newWidthPx > maxChatWidth) {
        newWidthPx = Math.max(HISTORY_PANEL_MIN_WIDTH, maxChatWidth);
      }
      setChatPanelWidth(newWidthPx);
      saveChatPanelWidth(newWidthPx);
    }
  }, []);
  const handleMouseUp = useCallback(() => {
    if (!isDragging.current && !isResizingRef.current) {
      return;
    }
    isDragging.current = false;
    isResizingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setTimeout(() => {
      isUserActionRef.current = false;
    }, 300);
  }, []);
  useEffect(() => {
    const handleBlur = () => {
      if (isDragging.current || isResizingRef.current) {
        isDragging.current = false;
        isResizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (isDragging.current || isResizingRef.current)) {
        isDragging.current = false;
        isResizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleMouseMove, handleMouseUp]);
  if (showWelcome) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          background: "var(--bg-primary)",
        }}
      >
        <OfficeWelcomePage t={t} language={language} onSelectImage={handleSelectImage} onNewProject={handleNewProject} onSelectSession={handleSelectSessionFromWelcome} isLoading={isCreatingSession || isSwitchingSession} />
      </div>
    );
  }
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
        .collapsed-task-list::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Chat Panel */}
      {!chatPanelCollapsed && !isFunctionPanelMaximized ? (
        <div
          className="panel-chat"
          style={{
            flex: "0 0 auto",
            width: `${chatPanelWidth}px`,
            minWidth: `${HISTORY_PANEL_MIN_WIDTH}px`,
            maxWidth: `${HISTORY_PANEL_MAX_WIDTH}px`,
            overflow: "hidden",
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
            collapseIcon: isChatOnLeft ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />,
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
      {/* Office Panel — right-hand main area */}
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
export default OfficePage;
