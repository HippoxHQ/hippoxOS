import React, { useState, useRef, useEffect, useCallback } from "react";
import { taskManager } from "../../core/TaskManager";
import BlockchainDashboard from "./BlockchainDashboard";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { blockchainSessionCommands } from "../../command/session/blockchain";
import { showDialog, DialogType } from "../../components/Dialog";
import { showToast, ToastType } from "../../components/Toast";
import BlockchainChatPanel from "./BlockchainChatPanel";
import HistoryBlockchainChatPanel, { HistoryBlockchainChatPanelRef } from "./HistoryBlockchainChatPanel";
import { Layers, CheckSquare, Square, Pin, PinOff, Trash2, ChevronUp, ChevronDown, Plus, ChevronsLeft, ChevronsRight, MessageCircleIcon } from "lucide-react";
import { useBlockchainSession } from "../../App/hooks/session/useBlockchainChatSession";
import { CollapseAllIcon2, ExpandAllIcon2 } from "../../icons";
// Right panel min width
const RIGHT_PANEL_MIN_WIDTH = 150;
// History drawer width (only used in the left-side slide-out drawer)
const HISTORY_DRAWER_WIDTH = 320;
// Chat panel width limits (px). The chat panel is anchored to the right
// and can never grow beyond CHAT_PANEL_MAX_WIDTH.
const CHAT_PANEL_MIN_WIDTH = 300;
const CHAT_PANEL_MAX_WIDTH = 400;
const CHAT_PANEL_DEFAULT_WIDTH = 350;
interface BlockchainPageProps {
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
/**
 * Main Blockchain Page Component
 * Integrates chat panel and Blockchain dashboard with data flow between them
 *
 * Data Flow (same pattern as 3D Sandbox):
 * 1. User sends message → BlockchainChatPage
 * 2. LLM responds with JSON containing blockchain data
 * 3. BlockchainChatPage parses and extracts data via dashboardRef.applyConfig()
 * 4. BlockchainDashboard renders the data (accumulates layers)
 * 5. All tasks in the same session are overlaid on the dashboard
 *
 * Layout: the chat panel is ALWAYS anchored to the RIGHT side of the page.
 * The dashboard fills the remaining space on the left.
 *
 * History sessions are presented in a slide-out drawer opened from the
 * sidebar's bottom button. All existing session logic is preserved and
 * delegated to the same `HistoryBlockchainChatPanel` component.
 *
 * IMPORTANT: No click inside the history drawer may close the drawer.
 * Only the backdrop (outside the drawer) and the explicit close button
 * are allowed to close it.
 */
const BlockchainPage: React.FC<BlockchainPageProps> = ({
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
  const { currentSessionId: blockchainSessionId, handleSendMessage: blockchainHandleSendMessage, handleSwitchSession: blockchainHandleSwitchSession, handleNewSession: blockchainHandleNewSession, shouldShowWelcome: blockchainShouldShowWelcome } = useBlockchainSession(language as "zh" | "en", true);
  // Panel state - using constants from GeneralChatPage
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(CHAT_PANEL_DEFAULT_WIDTH);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState<boolean>(false);
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [isResizeHover, setIsResizeHover] = useState(false);
  // History drawer state
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isHistoryAtBottom, setIsHistoryAtBottom] = useState(false);
  // Batch selection state
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HistoryBlockchainChatPanelRef>(null);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const isDragging = useRef(false);
  const dragType = useRef<"horizontal">("horizontal");
  const dragStartX = useRef(0);
  const dragStartChatPanelWidth = useRef(CHAT_PANEL_DEFAULT_WIDTH);
  const dragStartContainerRect = useRef<DOMRect | null>(null);
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
        await blockchainSessionCommands.updatePinnedBlockchainSessions(id, true);
      }
      // Refresh HistoryBlockchainChatPanel component
      await historyPanelRef.current?.refreshSessions();
      // Refresh parent component's session list
      const list = await blockchainSessionCommands.listBlockchainSessions();
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
        await blockchainSessionCommands.updatePinnedBlockchainSessions(id, false);
      }
      // Refresh HistoryBlockchainChatPanel component
      await historyPanelRef.current?.refreshSessions();
      // Refresh parent component's session list
      const list = await blockchainSessionCommands.listBlockchainSessions();
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
            await blockchainSessionCommands.deleteBlockchainSession(id);
            const domain = taskManager.getDomainFromSessionId(id);
            taskManager.deleteSession(id, domain);
          }
          // If current session was deleted, switch to another session
          if (blockchainSessionId && selectedIds.has(blockchainSessionId) && blockchainHandleSwitchSession) {
            const remainingSessions = historySessions.filter((s) => !selectedIds.has(s.session_id));
            if (remainingSessions.length > 0) {
              blockchainHandleSwitchSession(remainingSessions[0].session_id);
            }
          }
          // Refresh HistoryBlockchainChatPanel component
          await historyPanelRef.current?.refreshSessions();
          // Refresh parent component's session list
          const list = await blockchainSessionCommands.listBlockchainSessions();
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
   * Create chat panel with ref passed down for blockchain rendering.
   * The chat panel is always on the right side.
   */
  const chatPanel = <BlockchainChatPanel onSendMessage={blockchainHandleSendMessage} onFileClick={onFileClick} t={t} currentSessionId={blockchainSessionId} onDragOverInputChange={onDragOverInputChange} language={language} isLeftPanel={false} />;
  /**
   * Toggle the history drawer.
   * Declared before `blockchainPanel` so it can be safely passed as a prop.
   */
  const handleToggleHistoryDrawer = useCallback(() => {
    setIsHistoryDrawerOpen((prev) => !prev);
  }, []);
  /**
   * Create dashboard panel
   */
  const blockchainPanel = (
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
      <BlockchainDashboard
        theme={theme}
        i18n={i18n}
        /* Forward the history drawer controls so the sidebar's bottom History
         button can open / close the drawer owned by BlockchainPage. */
        onToggleHistory={handleToggleHistoryDrawer}
        isHistoryOpen={isHistoryDrawerOpen}
      />
    </div>
  );
  // Load history sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const list = await blockchainSessionCommands.listBlockchainSessions();
        setHistorySessions(list);
      } catch (error) {
        console.error("Failed to load history sessions:", error);
      }
    };
    loadSessions();
    const handleSessionCreated = () => {
      loadSessions();
    };
    window.addEventListener("blockchain-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("blockchain-session-created", handleSessionCreated);
    };
  }, []);
  // Refresh history on session created
  useEffect(() => {
    const handleSessionCreated = () => {
      historyPanelRef.current?.refreshSessions();
    };
    window.addEventListener("blockchain-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("blockchain-session-created", handleSessionCreated);
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
    const savedChatPanelCollapsed = localStorage.getItem("hippox-blockchain-chat-collapsed");
    const savedChatPanelWidth = localStorage.getItem("hippox-blockchain-chat-width");
    if (savedChatPanelCollapsed) setChatPanelCollapsed(savedChatPanelCollapsed === "true");
    if (savedChatPanelWidth) {
      // Clamp the persisted width to the allowed range.
      const parsed = parseFloat(savedChatPanelWidth);
      if (!Number.isNaN(parsed)) {
        setChatPanelWidth(Math.max(CHAT_PANEL_MIN_WIDTH, Math.min(CHAT_PANEL_MAX_WIDTH, parsed)));
      }
    }
  }, []);
  // Persistence helpers
  const saveChatPanelCollapsed = (collapsed: boolean) => {
    localStorage.setItem("hippox-blockchain-chat-collapsed", collapsed.toString());
  };
  const saveChatPanelWidth = (width: number) => {
    localStorage.setItem("hippox-blockchain-chat-width", width.toString());
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
  /**
   * Listen for blockchain-switch-session event from search results
   * This allows the search dialog to switch to a specific blockchain session
   */
  useEffect(() => {
    const handleBlockchainSwitchSession = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId } = e.detail;
      if (sessionId) {
        blockchainHandleSwitchSession(sessionId);
      }
    };
    window.addEventListener(APP_WINDOW_EVENTS.BLOCKCHAIN_SWITCH_SESSION, handleBlockchainSwitchSession as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.BLOCKCHAIN_SWITCH_SESSION, handleBlockchainSwitchSession as EventListener);
    };
  }, [blockchainHandleSwitchSession]);
  /**
   * Handle session selection from the history drawer.
   *
   * NOTE: This intentionally does NOT close the drawer. Clicking any item
   * inside the history drawer (session card, menu item, action button, etc.)
   * must never close the drawer. Only the backdrop and the explicit close
   * button are allowed to close it.
   */
  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      blockchainHandleSwitchSession(sessionId);
    },
    [blockchainHandleSwitchSession],
  );
  const handleNewSession = useCallback(() => {
    blockchainHandleNewSession();
  }, [blockchainHandleNewSession]);
  // Resize drag handlers
  const handleMouseDown = (e: React.MouseEvent, type: "horizontal") => {
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
      // The chat panel is anchored on the RIGHT, so dragging LEFT grows it.
      // (moving the divider left increases the chat width)
      const newWidthPx = startWidthPx - deltaX;
      // Clamp between the fixed min and the fixed max width.
      const clamped = Math.max(CHAT_PANEL_MIN_WIDTH, Math.min(CHAT_PANEL_MAX_WIDTH, newWidthPx));
      setChatPanelWidth(clamped);
      saveChatPanelWidth(clamped);
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
   * History drawer content.
   * Keeps the exact same header controls as the previous sidebar, but is
   * wrapped in a slide-out panel anchored to the left edge.
   *
   * CLICK BEHAVIOR:
   * - Any click inside the drawer is stopped at the drawer boundary so it
   *   can never bubble up and trigger a close.
   * - Only the backdrop (outside the drawer) or the explicit close button
   *   will call setIsHistoryDrawerOpen(false).
   */
  const renderHistoryDrawer = () => {
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
    return (
      <>
        {/* Backdrop: clicking outside closes the drawer */}
        <div
          onClick={(e) => {
            // Only close when the click actually lands on the backdrop itself.
            if (e.target === e.currentTarget) {
              setIsHistoryDrawerOpen(false);
            }
          }}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 40,
          }}
        />
        {/* Drawer panel: blocks all internal clicks from bubbling up */}
        <div
          onClick={(e) => {
            // Block every click inside the drawer from bubbling up, so nothing
            // in the history panel can trigger the drawer's close logic.
            e.stopPropagation();
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: HISTORY_DRAWER_WIDTH,
            minWidth: HISTORY_DRAWER_WIDTH,
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            zIndex: 41,
            boxShadow: "4px 0 16px rgba(0,0,0,0.35)",
          }}
        >
          {/* Header */}
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
            {/* Right side: New session + close drawer */}
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
                onClick={handleToggleHistoryDrawer}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "none";
                }}
                title="Close history"
              >
                <ChevronsLeft size={16} />
              </button>
            </div>
          </div>
          {/* Session list */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <HistoryBlockchainChatPanel
              ref={historyPanelRef}
              t={t}
              onSessionSelect={handleSessionSelect}
              currentSessionId={blockchainSessionId}
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
      </>
    );
  };
  return (
    <div
      className="panels-container horizontal-layout"
      ref={containerRef}
      style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        position: "relative",
      }}
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
      `}</style>
      {/* Dashboard Panel (left, fills remaining space) */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          minWidth: `${RIGHT_PANEL_MIN_WIDTH}px`,
          display: "flex",
          flexDirection: "row",
          order: 1,
        }}
      >
        {blockchainPanel}
      </div>
      {/* Resize Handle (between dashboard and chat) */}
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
      {/* Chat Panel (always anchored to the RIGHT) */}
      {!chatPanelCollapsed && !isFunctionPanelMaximized ? (
        <div
          className="panel-chat"
          style={{
            flex: "0 0 auto",
            width: `${chatPanelWidth}px`,
            maxWidth: `${CHAT_PANEL_MAX_WIDTH}px`,
            overflow: "hidden",
            minWidth: `${CHAT_PANEL_MIN_WIDTH}px`,
            display: "flex",
            flexDirection: "row",
            borderLeft: "1px solid var(--border-color)",
            order: 3,
          }}
        >
          {React.cloneElement(chatPanel as React.ReactElement<any>, {
            isCollapsed: false,
            togglePanel: handleToggleChatPanel,
            collapseIcon: <ChevronsRight size={16} />,
            isLeftPanel: false,
          })}
        </div>
      ) : !isFunctionPanelMaximized ? (
        <div
          style={{
            flex: `0 0 45px`,
            order: 3,
          }}
        >
          {/* Collapsed placeholder kept minimal: the history drawer is now the
              primary entry point for session management. */}
          <div
            className="collapsed-sidebar"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 45,
              minWidth: 45,
              background: "var(--bg-secondary)",
              borderLeft: "1px solid var(--border-color)",
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
                title="Expand Right"
              >
                <ChevronsLeft size={16} />
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
          </div>
        </div>
      ) : null}
      {/* History drawer (left slide-out) */}
      {isHistoryDrawerOpen && renderHistoryDrawer()}
    </div>
  );
};
export default BlockchainPage;
