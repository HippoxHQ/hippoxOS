// LLMChatPage.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../core/TaskManager";
import { TaskStatusEnum } from "../core/types";

interface LLMChatPageProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  layoutMode?: "horizontal" | "vertical";
  onLayoutModeChange?: (mode: "horizontal" | "vertical") => void;
  leftTitle?: string;
  rightTitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  t?: (key: string, params?: any) => string;
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
  }, [tasks, updateScrollButtons]);

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
            transition: "all 0.2s",
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
          const preview = task.user_input?.slice(0, 6) || "...";
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
                transition: "all 0.15s",
                flexShrink: 0,
                fontWeight: isActive ? 600 : 400,
                position: "relative",
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
            transition: "all 0.2s",
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

const LLMChatPage: React.FC<LLMChatPageProps> = ({
  leftPanel,
  rightPanel,
  layoutMode = "vertical",
  onLayoutModeChange,
  leftTitle = "Chat",
  rightTitle = "Terminal",
  leftIcon = "💬",
  rightIcon = "🖥️",
  t = (key: string) => key,
}) => {
  const [leftWidth, setLeftWidth] = useState<number>(50);
  const [topHeight, setTopHeight] = useState<number>(60);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragType = useRef<"horizontal" | "vertical">("horizontal");

  useEffect(() => {
    const savedLeftWidth = localStorage.getItem("hippox-left-width");
    const savedTopHeight = localStorage.getItem("hippox-top-height");
    const savedLeftCollapsed = localStorage.getItem("hippox-left-collapsed");
    const savedRightCollapsed = localStorage.getItem("hippox-right-collapsed");
    if (savedLeftWidth) setLeftWidth(parseFloat(savedLeftWidth));
    if (savedTopHeight) setTopHeight(parseFloat(savedTopHeight));
    if (savedLeftCollapsed) setLeftCollapsed(savedLeftCollapsed === "true");
    if (savedRightCollapsed) setRightCollapsed(savedRightCollapsed === "true");
  }, []);

  const saveLeftWidth = (width: number) => {
    localStorage.setItem("hippox-left-width", width.toString());
  };

  const saveTopHeight = (height: number) => {
    localStorage.setItem("hippox-top-height", height.toString());
  };

  const saveLeftCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-left-collapsed", collapsed.toString());
  };

  const saveRightCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-right-collapsed", collapsed.toString());
  };

  const handleToggleLeft = () => {
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

  const handleMouseDown = (
    e: React.MouseEvent,
    type: "horizontal" | "vertical",
  ) => {
    if (leftCollapsed || rightCollapsed) return;
    isDragging.current = true;
    dragType.current = type;
    document.body.style.cursor =
      type === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      if (dragType.current === "horizontal") {
        const newWidthPercent =
          ((e.clientX - containerRect.left) / containerRect.width) * 100;
        const clamped = Math.min(70, Math.max(30, newWidthPercent));
        setLeftWidth(clamped);
        saveLeftWidth(clamped);
      } else {
        const newHeightPercent =
          ((e.clientY - containerRect.top) / containerRect.height) * 100;
        const clamped = Math.min(80, Math.max(20, newHeightPercent));
        setTopHeight(clamped);
        saveTopHeight(clamped);
      }
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

  const renderCollapsedSidebar = (
    isLeft: boolean,
    title: string,
    icon: React.ReactNode,
    onToggle: () => void,
  ) => {
    const allTasks = taskManager.getAllTasks();

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
              transition: "all 0.2s",
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
            {isLeft ? "▶" : "◀"}
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
          <span
            style={{
              writingMode: "vertical-rl",
              letterSpacing: "2px",
              fontSize: "10px",
              opacity: 0.6,
            }}
          >
            {title}
          </span>
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
              setActiveNavIndex(idx);
            }
          }}
        />
      </div>
    );
  };

  const getLeftPanelContent = () => {
    if (leftCollapsed) {
      return renderCollapsedSidebar(
        true,
        leftTitle,
        leftIcon,
        handleToggleLeft,
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
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>{leftPanel}</div>
      </div>
    );
  };

  const getRightPanelContent = () => {
    if (rightCollapsed) {
      return renderCollapsedSidebar(
        false,
        rightTitle,
        rightIcon,
        handleToggleRight,
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
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>{rightPanel}</div>
      </div>
    );
  };

  const contextValue = {
    leftCollapsed,
    rightCollapsed,
    toggleLeft: handleToggleLeft,
    toggleRight: handleToggleRight,
  };

  if (layoutMode === "vertical") {
    const topPanel = getLeftPanelContent();
    const bottomPanel = getRightPanelContent();
    return (
      <LLMChatPageProvider value={contextValue}>
        <div
          className="panels-container vertical-layout"
          ref={containerRef}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
          }}
        >
          <div
            className="panel-top"
            style={{
              height: leftCollapsed ? "auto" : `${topHeight}%`,
              overflow: "hidden",
              minHeight: leftCollapsed ? "auto" : "100px",
              display: "flex",
              flexDirection: "row",
            }}
          >
            {topPanel}
          </div>
          {!leftCollapsed && !rightCollapsed && (
            <div
              className="resize-handle resize-handle-horizontal"
              onMouseDown={(e) => handleMouseDown(e, "vertical")}
              style={{ height: "4px", cursor: "row-resize", flexShrink: 0 }}
            >
              <div className="handle-line"></div>
            </div>
          )}
          <div
            style={{
              flex: leftCollapsed || rightCollapsed ? 1 : undefined,
              height:
                leftCollapsed || rightCollapsed
                  ? "100%"
                  : `${100 - topHeight}%`,
              overflow: "hidden",
              minHeight: rightCollapsed ? "auto" : "100px",
              display: "flex",
              flexDirection: "row",
            }}
          >
            {bottomPanel}
          </div>
        </div>
      </LLMChatPageProvider>
    );
  }

  const leftPanelContent = getLeftPanelContent();
  const rightPanelContent = getRightPanelContent();

  return (
    <LLMChatPageProvider value={contextValue}>
      <div
        className="panels-container horizontal-layout"
        ref={containerRef}
        style={{ display: "flex", flex: 1, overflow: "hidden" }}
      >
        <div
          className="panel-left"
          style={{
            flex: leftCollapsed ? "0 0 45px" : rightCollapsed ? 1 : "0 0 auto",
            width: leftCollapsed
              ? "45px"
              : rightCollapsed
                ? "auto"
                : `${leftWidth}%`,
            overflow: "hidden",
            minWidth: leftCollapsed ? "45px" : "150px",
            display: "flex",
            flexDirection: "row",
          }}
        >
          {leftPanelContent}
        </div>
        {!leftCollapsed && !rightCollapsed && (
          <div
            className="resize-handle resize-handle-vertical"
            onMouseDown={(e) => handleMouseDown(e, "horizontal")}
            style={{ width: "4px", cursor: "col-resize", flexShrink: 0 }}
          >
            <div className="handle-line"></div>
          </div>
        )}
        <div
          style={{
            flex: rightCollapsed ? "0 0 45px" : leftCollapsed ? 1 : 1,
            width: rightCollapsed ? "45px" : "auto",
            overflow: "hidden",
            minWidth: rightCollapsed ? "45px" : "150px",
            display: "flex",
            flexDirection: "row",
            justifyContent: rightCollapsed ? "flex-end" : "flex-start",
            marginLeft: rightCollapsed ? "auto" : 0,
          }}
        >
          {rightPanelContent}
        </div>
      </div>
    </LLMChatPageProvider>
  );
};

const LLMChatPageContext = React.createContext<{
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
} | null>(null);

export const useLLMChatPage = () => {
  const ctx = React.useContext(LLMChatPageContext);
  if (!ctx) {
    throw new Error("useLLMChatPage must be used within LLMChatPage");
  }
  return ctx;
};

const LLMChatPageProvider = LLMChatPageContext.Provider;

export default LLMChatPage;