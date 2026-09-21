import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../../core/TaskManager";
import { TaskStatusEnum } from "../../core/types";
import { showTooltipOnElement } from "../../components/Tooltip";
import { MessageCircleIcon } from "../../icons";
import MainPanel from "./MainPanel";
import { configCommands } from "../../command/config";
import { useFinanceSession } from "../../App/hooks/session/useFinanceSession";
import MarqueeBar from "./MarqueeBar";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import FinanceChatPanel from "./FinanceChatPanel";
// Panel Size Constants
// Chat panel (middle panel) size limits
const CHAT_PANEL_MIN_WIDTH = 200;
const CHAT_PANEL_MAX_PERCENT = 0.6; // 60% of main area
// Right panel (chart) min width
const RIGHT_PANEL_MIN_WIDTH = 150;
// Collapsed chat sidebar width
const CHAT_PANEL_COLLAPSED_WIDTH = 45;
interface FinancePageProps {
  layoutMode?: "horizontal" | "vertical";
  onLayoutModeChange?: (mode: "horizontal" | "vertical") => void;
  leftTitle?: string;
  rightTitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  t?: (key: string, params?: any) => string;
  isFunctionPanelMaximized?: boolean;
  theme?: "light" | "dark";
  i18n?: "en" | "zh-cn";
  chartData?: any;
  symbol?: string;
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
const FinancePage: React.FC<FinancePageProps> = ({
  layoutMode = "vertical",
  onLayoutModeChange,
  leftTitle = "Chat",
  rightTitle = "Chart",
  leftIcon = "💬",
  rightIcon = "📊",
  t = (key: string) => key,
  isFunctionPanelMaximized = false,
  theme = "dark",
  i18n = "en",
  chartData,
  symbol = "BTC/USDT",
  onFileClick,
  language = "en",
  onDragOverInputChange,
  executionLogs,
  onClearLogs,
}) => {
  const { currentSessionId: chartSessionId, handleSendMessage: chartHandleSendMessage, handleSwitchSession: chartHandleSwitchSession, handleNewSession: chartHandleNewSession, shouldShowWelcome: chartShouldShowWelcome } = useFinanceSession(language as "zh" | "en", true);
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(400);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState<boolean>(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [isResizeHover, setIsResizeHover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragType = useRef<"horizontal" | "history">("horizontal");
  const dragStartX = useRef(0);
  const dragStartChatPanelWidth = useRef(400);
  const dragStartContainerRect = useRef<DOMRect | null>(null);
  const [layoutSwapMode, setLayoutSwapMode] = useState<"terminal-left" | "chat-left">("terminal-left");
  const layoutSwapModeRef = useRef<"terminal-left" | "chat-left">("terminal-left");
  const isChatOnLeft = layoutSwapMode === "chat-left";
  // Default ticker data for the marquee
  const defaultTickerItems = [
    { symbol: "BTC/USDT", price: 67423.5, change: 1240.2, changePercent: 1.87 },
    { symbol: "ETH/USDT", price: 3520.8, change: 85.6, changePercent: 2.49 },
    { symbol: "SOL/USDT", price: 178.45, change: -3.2, changePercent: -1.76 },
    { symbol: "BNB/USDT", price: 598.2, change: 12.3, changePercent: 2.1 },
    { symbol: "XRP/USDT", price: 0.6245, change: 0.0182, changePercent: 3.0 },
    { symbol: "ADA/USDT", price: 0.462, change: -0.0085, changePercent: -1.81 },
    { symbol: "DOGE/USDT", price: 0.1542, change: 0.0063, changePercent: 4.26 },
    { symbol: "DOT/USDT", price: 7.82, change: 0.28, changePercent: 3.71 },
    { symbol: "LINK/USDT", price: 14.52, change: 0.65, changePercent: 4.69 },
    { symbol: "MATIC/USDT", price: 0.728, change: -0.012, changePercent: -1.62 },
    { symbol: "AVAX/USDT", price: 38.45, change: 1.85, changePercent: 5.05 },
    { symbol: "UNI/USDT", price: 7.95, change: 0.32, changePercent: 4.19 },
  ];
  // Default news data for the marquee
  const defaultNewsItems = [
    { id: "1", title: "Federal Reserve holds rates steady, signals possible rate cut this year", source: "Reuters", time: "10:32" },
    { id: "2", title: "Bitcoin breaks above $67,000 as institutional inflows continue", source: "CoinDesk", time: "10:15" },
    { id: "3", title: "NVIDIA Q2 earnings beat estimates, AI chip demand remains strong", source: "Bloomberg", time: "09:58" },
    { id: "4", title: "PBOC announces 25bps RRR cut to release long-term liquidity", source: "财联社", time: "09:30" },
    { id: "5", title: "Tesla Cybertruck deliveries surpass 10,000 units", source: "TechCrunch", time: "08:45" },
    { id: "6", title: "Gold hits all-time high as safe-haven demand surges", source: "FT", time: "08:20" },
    { id: "7", title: "EU passes landmark AI regulation act, world's first comprehensive AI law", source: "Politico", time: "07:50" },
    { id: "8", title: "OPEC+ maintains output levels, oil prices edge higher", source: "Reuters", time: "07:30" },
    { id: "9", title: "Apple unveils new M4 chip with 50% performance boost", source: "The Verge", time: "06:55" },
    { id: "10", title: "BoJ rate hike expectations rise, Yen strengthens", source: "Nikkei", time: "06:20" },
  ];
  const handleToggleChatPanel = useCallback(() => {
    if (isFunctionPanelMaximized) return;
    setChatPanelCollapsed((prev) => {
      const newState = !prev;
      saveChatPanelCollapsed(newState);
      return newState;
    });
  }, [isFunctionPanelMaximized]);
  const chatPanel = <FinanceChatPanel onSendMessage={chartHandleSendMessage} onFileClick={onFileClick} t={t} onDragOverInputChange={onDragOverInputChange} language={language} isLeftPanel={isChatOnLeft} currentSessionId={chartSessionId} />;
  const chartPanel = (
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
      <MainPanel theme={theme} i18n={i18n} currentSessionId={chartSessionId} chartData={chartData} symbol={symbol} t={t} onSessionSelect={chartHandleSwitchSession} onNewSession={chartHandleNewSession} />
    </div>
  );
  const collapsedChatSidebar = (
    <div
      className="collapsed-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: CHAT_PANEL_COLLAPSED_WIDTH,
        minWidth: CHAT_PANEL_COLLAPSED_WIDTH,
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
  useEffect(() => {
    const loadLayoutMode = async () => {
      try {
        const mode = await configCommands.getSettingsChartChatLayoutSwapMode();
        if (mode === "terminal-left" || mode === "chat-left") {
          setLayoutSwapMode(mode);
          layoutSwapModeRef.current = mode;
        }
      } catch (error) {
        console.error("Failed to load chart chat layout mode:", error);
      }
    };
    loadLayoutMode();
  }, []);
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { pageType, mode } = event.detail;
      if (pageType === "chart") {
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
    const savedChatPanelCollapsed = localStorage.getItem("hippox-chart-chat-collapsed");
    const savedChatPanelWidth = localStorage.getItem("hippox-chart-chat-width");
    if (savedChatPanelCollapsed) setChatPanelCollapsed(savedChatPanelCollapsed === "true");
    if (savedChatPanelWidth) {
      const parsed = parseFloat(savedChatPanelWidth);
      setChatPanelWidth(Math.max(CHAT_PANEL_MIN_WIDTH, parsed));
    }
  }, []);
  const saveChatPanelCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-chart-chat-collapsed", collapsed.toString());
  };
  const saveChatPanelWidth = (width: number) => {
    localStorage.setItem("hippox-chart-chat-width", width.toString());
  };
  /**
   * Listen for chart-switch-session event from search results
   * This allows the search dialog to switch to a specific chart session
   */
  useEffect(() => {
    const handleChartSwitchSession = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId } = e.detail;
      if (sessionId) {
        chartHandleSwitchSession(sessionId);
      }
    };
    window.addEventListener(APP_WINDOW_EVENTS.CHART_SWITCH_SESSION, handleChartSwitchSession as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.CHART_SWITCH_SESSION, handleChartSwitchSession as EventListener);
    };
  }, [chartHandleSwitchSession]);
  const handleMouseDown = (e: React.MouseEvent, type: "horizontal" | "history") => {
    if (chatPanelCollapsed || isFunctionPanelMaximized) return;
    isDragging.current = true;
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
      const minWidthPx = CHAT_PANEL_MIN_WIDTH;
      const maxWidthPx = mainAreaWidth * CHAT_PANEL_MAX_PERCENT;
      newWidthPx = Math.max(minWidthPx, Math.min(maxWidthPx, newWidthPx));
      setChatPanelWidth(newWidthPx);
      saveChatPanelWidth(newWidthPx);
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
  return (
    <div className="panels-container horizontal-layout" ref={containerRef} style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: "column" }}>
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
          width: ${CHAT_PANEL_COLLAPSED_WIDTH}px;
          min-width: ${CHAT_PANEL_COLLAPSED_WIDTH}px;
          background: var(--bg-secondary);
          overflow: hidden;
          flex-shrink: 0;
          height: 100%;
        }
        .collapsed-task-list::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Main content area - flex: 1 */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
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
              collapseIcon: isChatOnLeft ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />,
              isLeftPanel: isChatOnLeft,
            })}
          </div>
        ) : !isFunctionPanelMaximized ? (
          <div
            style={{
              flex: `0 0 ${CHAT_PANEL_COLLAPSED_WIDTH}px`,
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
            minWidth: `${RIGHT_PANEL_MIN_WIDTH}px`,
            display: "flex",
            flexDirection: "row",
            order: isChatOnLeft ? 3 : 1,
          }}
        >
          {chartPanel}
        </div>
      </div>
      {/* Marquee bar - 30px fixed height at the bottom */}
      <MarqueeBar theme={theme} language={language as "zh" | "en"} tickerSpeed={60} newsSpeed={50} />
    </div>
  );
};
export default FinancePage;
