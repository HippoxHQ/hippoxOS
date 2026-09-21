import React, { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { DeleteIcon, MoreVerticalIcon, PinFilledIcon, PinIcon, RenameIcon, UnPinIcon, CollapseAllIcon2, ExpandAllIcon2, ScrollTextIcon } from "../../../icons";
import { CheckSquare, ChevronDown, Square, Layers, Pin, PinOff, Trash2, ChevronUp, Plus } from "lucide-react";
import { chartSessionCommands } from "../../../command/session/finance";
import { showDialog, DialogType } from "../../../components/Dialog";
import { showToast, ToastType } from "../../../components/Toast";
import { taskManager } from "../../../core/TaskManager";
import { DialogSession } from "../../../types/types";
export interface HistorySessionRef {
  scrollToTop: () => void;
  scrollToBottom: () => void;
  expandAll: () => void;
  collapseAll: () => void;
  refreshSessions: () => Promise<void>;
}
interface HistorySessionProps {
  t: (key: string, params?: any) => string;
  i18n?: "en" | "zh-cn";
  onSessionSelect?: (sessionId: string) => void;
  currentSessionId?: string;
  onNewSession?: () => void;
}
type CategoryType = "pinned" | "today" | "yesterday" | "last7days" | "last30days" | "older";
interface CategoryConfig {
  labelKey: string;
  type: CategoryType;
}
const categories: CategoryConfig[] = [
  { labelKey: "history.category.pinned", type: "pinned" },
  { labelKey: "history.category.today", type: "today" },
  { labelKey: "history.category.yesterday", type: "yesterday" },
  { labelKey: "history.category.last7days", type: "last7days" },
  { labelKey: "history.category.last30days", type: "last30days" },
  { labelKey: "history.category.older", type: "older" },
];
const HistorySession = forwardRef<HistorySessionRef, HistorySessionProps>(({ t, i18n = "en", onSessionSelect, currentSessionId, onNewSession }, ref) => {
  const isZh = i18n === "zh-cn";
  const [sessions, setSessions] = useState<DialogSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Batch selection state
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isHistoryAtBottom, setIsHistoryAtBottom] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<CategoryType, boolean>>({
    pinned: true,
    today: true,
    yesterday: true,
    last7days: true,
    last30days: true,
    older: true,
  });
  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    scrollToBottom: () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    },
    expandAll: () => {
      setExpandedCategories({
        pinned: true,
        today: true,
        yesterday: true,
        last7days: true,
        last30days: true,
        older: true,
      });
    },
    collapseAll: () => {
      setExpandedCategories({
        pinned: false,
        today: false,
        yesterday: false,
        last7days: false,
        last30days: false,
        older: false,
      });
    },
    refreshSessions: async () => {
      await loadSessions(true);
    },
  }));
  const toggleCategory = (categoryType: CategoryType) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryType]: !prev[categoryType],
    }));
  };
  const menuRef = useRef<HTMLDivElement>(null);
  const loadSessions = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const list = await chartSessionCommands.listChartSessions();
      const sorted = [...list].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return a.is_pinned ? -1 : 1;
        }
        const getTimestamp = (id: string) => {
          const ts = id.replace("financial_analysis_session_", "");
          return parseInt(ts, 10) || 0;
        };
        const aTs = getTimestamp(a.session_id);
        const bTs = getTimestamp(b.session_id);
        return bTs - aTs;
      });
      setSessions(sorted);
    } catch (error) {
      showToast(ToastType.ERROR, "Failed to load sessions:" + error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadSessions();
  }, []);
  useEffect(() => {
    const handleSessionCreated = () => {
      loadSessions(true);
    };
    window.addEventListener("chart-session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("chart-session-created", handleSessionCreated);
    };
  }, []);
  useEffect(() => {
    const handleTitleUpdated = () => {
      loadSessions(true);
    };
    window.addEventListener("session-title-updated", handleTitleUpdated);
    return () => {
      window.removeEventListener("session-title-updated", handleTitleUpdated);
    };
  }, []);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (editingId && editInputRef.current && !editInputRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest(".menu-panel-close")) return;
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingId]);
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);
  // Clear selection when batch mode is turned off
  useEffect(() => {
    if (!isBatchMode) {
      setSelectedIds(new Set());
    }
  }, [isBatchMode]);
  const handleTogglePin = async (session: DialogSession, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newPinned = !session.is_pinned;
      await chartSessionCommands.updatePinnedChartSessions(session.session_id, newPinned);
      setSessions((prev) => prev.map((s) => (s.session_id === session.session_id ? { ...s, is_pinned: newPinned } : s)));
      setActiveMenuId(null);
      if (newPinned) {
        showToast(ToastType.SUCCESS, t("history.toast.pinned"));
      } else {
        showToast(ToastType.INFO, t("history.toast.unpinned"));
      }
    } catch (error) {
      showToast(ToastType.ERROR, t("history.toast.pinFailed"));
    }
  };
  const handleDelete = async (session: DialogSession, e: React.MouseEvent) => {
    e.stopPropagation();
    showDialog(
      DialogType.WARNING,
      t("history.dialog.confirmDeleteTitle"),
      t("history.dialog.confirmDeleteMessage"),
      async () => {
        try {
          await chartSessionCommands.deleteChartSession(session.session_id);
          const domain = taskManager.getDomainFromSessionId(session.session_id);
          taskManager.deleteSession(session.session_id, domain);
          if (currentSessionId === session.session_id && onSessionSelect) {
            const otherSession = sessions.find((s) => s.session_id !== session.session_id);
            if (otherSession) {
              onSessionSelect(otherSession.session_id);
            }
          }
          setSessions((prev) => prev.filter((s) => s.session_id !== session.session_id));
          setActiveMenuId(null);
          showToast(ToastType.SUCCESS, t("history.toast.deleted"));
        } catch (error) {
          showToast(ToastType.ERROR, t("history.toast.deleteFailed"));
        }
      },
      undefined,
      t("history.dialog.delete"),
      t("history.dialog.cancel"),
    );
  };
  const startEdit = (session: DialogSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.session_id);
    setEditValue(session.title || "");
    setActiveMenuId(null);
  };
  const isSavingRef = useRef(false);
  const cancelEdit = () => {
    if (isSavingRef.current) return;
    setEditingId(null);
    setEditValue("");
  };
  const saveEdit = async (session: DialogSession) => {
    isSavingRef.current = true;
    const trimmed = editValue.trim();
    if (!trimmed) {
      cancelEdit();
      isSavingRef.current = false;
      return;
    }
    try {
      await chartSessionCommands.updateChartSessionConfig(session.session_id, {
        title: trimmed,
      });
      await loadSessions(true);
      setEditingId(null);
      setEditValue("");
      showToast(ToastType.SUCCESS, t("history.toast.renamed"));
      window.dispatchEvent(
        new CustomEvent("session-title-updated", {
          detail: { sessionId: session.session_id, title: trimmed },
        }),
      );
    } catch (error) {
      showToast(ToastType.ERROR, t("history.toast.renameFailed"));
    }
    isSavingRef.current = false;
  };
  const handleKeyDown = (e: React.KeyboardEvent, session: DialogSession) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(session);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (isBatchMode) return; // Block session selection in batch mode
      setActiveMenuId(null);
      if (currentSessionId === sessionId) {
        return;
      }
      try {
        if (onSessionSelect) {
          onSessionSelect(sessionId);
        }
      } catch (error) {
        showToast(ToastType.ERROR, "Failed to recall session context:" + error);
        if (onSessionSelect) {
          onSessionSelect(sessionId);
        }
      }
    },
    [currentSessionId, onSessionSelect, isBatchMode],
  );
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };
  const getSessionCategory = (session: DialogSession): CategoryType => {
    if (session.is_pinned) return "pinned";
    const now = new Date();
    const createdDate = new Date(session.created_at);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (createdDate >= today) return "today";
    if (createdDate >= yesterday) return "yesterday";
    if (createdDate >= weekAgo) return "last7days";
    if (createdDate >= monthAgo) return "last30days";
    return "older";
  };
  const getGroupedSessions = () => {
    const grouped: Record<CategoryType, DialogSession[]> = {
      pinned: [],
      today: [],
      yesterday: [],
      last7days: [],
      last30days: [],
      older: [],
    };
    sessions.forEach((session) => {
      const category = getSessionCategory(session);
      grouped[category].push(session);
    });
    return grouped;
  };
  /**
   * Compact card style for the responsive grid.
   * Cards are now small squares: title on top, date at the bottom,
   * with the action menu / checkbox overlaid at the top-right corner.
   */
  const getCardStyle = (isActive: boolean, isHovered: boolean, isSelected: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      borderRadius: "5px",
      padding: "6px 8px",
      cursor: isBatchMode ? "default" : "pointer",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      position: "relative",
      minHeight: "52px",
      minWidth: 0,
      boxSizing: "border-box",
    };
    if (isSelected) {
      return {
        ...baseStyle,
        background: "rgba(0, 102, 204, 0.15)",
        border: "1px solid rgba(0, 102, 204, 0.5)",
      };
    }
    if (isActive) {
      return {
        ...baseStyle,
        background: "rgba(0, 102, 204, 0.1)",
        border: "1px solid rgba(0, 102, 204, 0.3)",
      };
    }
    return {
      ...baseStyle,
      background: isHovered ? "var(--hover-bg)" : "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
    };
  };
  const titleStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
    flex: 1,
  };
  const titleInputStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-primary)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--accent-color)",
    borderRadius: "4px",
    padding: "1px 4px",
    outline: "none",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  };
  const timeStyle: React.CSSProperties = {
    fontSize: "10px",
    color: "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  const pinIconStyle: React.CSSProperties = {
    fontSize: "12px",
    marginRight: "4px",
    color: "var(--accent-color, #0066cc)",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
  };
  const menuButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-secondary)",
    padding: "2px",
    borderRadius: "3px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: "4px",
    right: "4px",
  };
  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    right: "0px",
    top: "22px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "5px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 200,
    minWidth: "110px",
    overflow: "hidden",
  };
  const dropdownItemStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "13px",
    color: "var(--text-primary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    zIndex: "10",
  };
  const categoryHeaderStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    padding: "10px 0 6px 2px",
    letterSpacing: "0.5px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  };
  const checkboxStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    cursor: "pointer",
    color: "var(--text-secondary)",
    position: "absolute",
    top: "4px",
    left: "4px",
  };
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
  // Toggle select all sessions
  const toggleSelectAll = () => {
    const allIds = sessions.map((s) => s.session_id);
    if (selectedIds.size === allIds.length && allIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };
  /**
   * Batch pin selected sessions
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
        await chartSessionCommands.updatePinnedChartSessions(id, true);
      }
      await loadSessions(true);
      setSelectedIds(new Set());
      showToast(ToastType.SUCCESS, isZh ? `已置顶 ${ids.length} 个会话` : `${ids.length} session(s) pinned`);
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "批量置顶失败" : "Batch pin failed");
    }
  };
  /**
   * Batch unpin selected sessions
   */
  const handleBatchUnpin = async () => {
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请选择要取消置顶的会话" : "Please select sessions to unpin");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await chartSessionCommands.updatePinnedChartSessions(id, false);
      }
      await loadSessions(true);
      setSelectedIds(new Set());
      showToast(ToastType.SUCCESS, isZh ? `已取消置顶 ${ids.length} 个会话` : `${ids.length} session(s) unpinned`);
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "批量取消置顶失败" : "Batch unpin failed");
    }
  };
  /**
   * Batch delete selected sessions
   */
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请选择要删除的会话" : "Please select sessions to delete");
      return;
    }
    // Check if trying to delete all sessions - prevent deleting the last one
    if (selectedIds.size >= sessions.length) {
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
            await chartSessionCommands.deleteChartSession(id);
            const domain = taskManager.getDomainFromSessionId(id);
            taskManager.deleteSession(id, domain);
          }
          // If current session was deleted, switch to another session
          if (currentSessionId && selectedIds.has(currentSessionId)) {
            const remainingSessions = sessions.filter((s) => !selectedIds.has(s.session_id));
            if (remainingSessions.length > 0 && onSessionSelect) {
              onSessionSelect(remainingSessions[0].session_id);
            }
          }
          await loadSessions(true);
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
      setExpandedCategories({
        pinned: true,
        today: true,
        yesterday: true,
        last7days: true,
        last30days: true,
        older: true,
      });
    } else {
      setExpandedCategories({
        pinned: false,
        today: false,
        yesterday: false,
        last7days: false,
        last30days: false,
        older: false,
      });
    }
  };
  const handleScrollToggle = () => {
    const newAtBottom = !isHistoryAtBottom;
    setIsHistoryAtBottom(newAtBottom);
    if (newAtBottom) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    } else {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };
  const handleNewSession = useCallback(() => {
    if (onNewSession) {
      onNewSession();
    }
  }, [onNewSession]);
  const groupedSessions = getGroupedSessions();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        flex: 1,
        width: "100%",
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
          {/* Panel title */}
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginRight: "4px",
            }}
          >
            <ScrollTextIcon size={14} />
            {isZh ? "历史会话" : "History"}
          </span>
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
                {selectedIds.size === sessions.length && sessions.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
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
        {/* Right side: New session button */}
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
            title={isZh ? "新建会话" : "New Session"}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      {/* Session list - responsive grid, packs as many cards per row as fit */}
      <div
        ref={scrollContainerRef}
        style={{
          padding: "0px 8px 8px 8px",
          userSelect: "none",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {loading && sessions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
            }}
          >
            {t("history.loading") || "Loading..."}
          </div>
        ) : sessions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
            }}
          >
            {t("history.empty") || "No History Chat"}
          </div>
        ) : (
          categories.map((category) => {
            const categorySessions = groupedSessions[category.type];
            if (categorySessions.length === 0) return null;
            return (
              <div key={category.type}>
                {/* Category header spans the full row */}
                <div
                  style={{
                    ...categoryHeaderStyle,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleCategory(category.type)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <span>
                    {t(category.labelKey)} ({categorySessions.length})
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      transform: expandedCategories[category.type] ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  >
                    <ChevronDown size={18} />
                  </span>
                </div>
                {/* Responsive grid: cards auto-fill, min width ~180px */}
                {expandedCategories[category.type] && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: "6px",
                      marginBottom: "4px",
                    }}
                  >
                    {categorySessions.map((session) => {
                      const isActive = currentSessionId === session.session_id;
                      const isHovered = hoveredId === session.session_id;
                      const isEditing = editingId === session.session_id;
                      const isSelected = selectedIds.has(session.session_id);
                      return (
                        <div
                          key={session.session_id}
                          style={getCardStyle(isActive, isHovered, isSelected)}
                          onMouseEnter={() => setHoveredId(session.session_id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onClick={() => {
                            if (isBatchMode) {
                              setSelectedIds((prev) => {
                                const newSet = new Set(prev);
                                if (newSet.has(session.session_id)) {
                                  newSet.delete(session.session_id);
                                } else {
                                  newSet.add(session.session_id);
                                }
                                return newSet;
                              });
                            } else if (!isEditing) {
                              handleSelectSession(session.session_id);
                            }
                          }}
                        >
                          {/* Checkbox for batch mode - overlaid top-left */}
                          {isBatchMode && (
                            <div
                              style={checkboxStyle}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIds((prev) => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(session.session_id)) {
                                    newSet.delete(session.session_id);
                                  } else {
                                    newSet.add(session.session_id);
                                  }
                                  return newSet;
                                });
                              }}
                            >
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                          )}
                          {/* Title row */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              minWidth: 0,
                              paddingLeft: isBatchMode ? "20px" : "0px",
                              paddingRight: "20px",
                            }}
                          >
                            {session.is_pinned && (
                              <span style={pinIconStyle}>
                                <PinFilledIcon size={12} />
                              </span>
                            )}
                            {isEditing ? (
                              <input ref={editInputRef} type="text" style={titleInputStyle} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => handleKeyDown(e, session)} onBlur={() => saveEdit(session)} onClick={(e) => e.stopPropagation()} />
                            ) : (
                              <span style={titleStyle} title={session.title}>
                                {session.title || t("history.untitled")}
                              </span>
                            )}
                          </div>
                          {/* Date row */}
                          <div style={timeStyle}>{formatDate(session.created_at)}</div>
                          {/* Menu button - hidden in batch mode, overlaid top-right */}
                          {!isBatchMode && !isEditing && (
                            <div>
                              <button
                                style={{
                                  ...menuButtonStyle,
                                  opacity: activeMenuId === session.session_id || isHovered ? 1 : 0,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === session.session_id ? null : session.session_id);
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--hover-bg)";
                                  e.currentTarget.style.color = "var(--text-primary)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "none";
                                  e.currentTarget.style.color = "var(--text-secondary)";
                                }}
                              >
                                <MoreVerticalIcon size={14} />
                              </button>
                              {activeMenuId === session.session_id && (
                                <div style={dropdownStyle} ref={menuRef}>
                                  <div
                                    style={dropdownItemStyle}
                                    onClick={(e) => startEdit(session, e)}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "var(--hover-bg)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "";
                                    }}
                                  >
                                    <RenameIcon size={16} /> {t("history.rename")}
                                  </div>
                                  <div
                                    style={dropdownItemStyle}
                                    onClick={(e) => handleTogglePin(session, e)}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "var(--hover-bg)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "";
                                    }}
                                  >
                                    {session.is_pinned ? <UnPinIcon size={16} /> : <PinIcon size={16} />} {session.is_pinned ? t("history.unpin") : t("history.pin")}
                                  </div>
                                  <div
                                    style={{
                                      ...dropdownItemStyle,
                                      color: "var(--error-color, #dc2626)",
                                    }}
                                    onClick={(e) => handleDelete(session, e)}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "var(--error-bg, rgba(220,38,38,0.1))";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "";
                                    }}
                                  >
                                    <DeleteIcon size={16} /> {t("history.delete")}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
HistorySession.displayName = "HistorySession";
export default HistorySession;
