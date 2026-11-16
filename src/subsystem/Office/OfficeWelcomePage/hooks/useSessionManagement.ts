import { useState, useCallback, useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { officeSessionCommands } from "../../../../command/session/office";
import { showDialog, DialogType } from "../../../../components/Dialog";
import { showToast, ToastType } from "../../../../components/Toast";
import { DialogSession } from "../../../../types/types";
interface UseSessionManagementProps {
  t: (key: string, params?: any) => string;
  sortOrder: "asc" | "desc";
}
interface UseSessionManagementReturn {
  sessions: DialogSession[];
  loadingSessions: boolean;
  activeMenuId: string | null;
  hoveredSessionId: string | null;
  editingId: string | null;
  editValue: string;
  filteredSessions: DialogSession[];
  expandedCategories: Record<string, boolean>;
  loadSessions: () => Promise<void>;
  handleSelectSession: (sessionId: string, onSelectSession?: (id: string) => void) => void;
  handleTogglePin: (session: DialogSession, e: React.MouseEvent) => Promise<void>;
  handleDeleteSession: (session: DialogSession, e: React.MouseEvent, onDelete?: () => void) => Promise<void>;
  startEdit: (session: DialogSession, e: React.MouseEvent) => void;
  cancelEdit: () => void;
  saveEdit: (session: DialogSession) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent, session: DialogSession) => void;
  toggleCategory: (categoryType: string) => void;
  setActiveMenuId: (id: string | null) => void;
  setHoveredSessionId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  searchQuery: string;
  getSessionThumbnail: (session: DialogSession) => string | null;
  handleEditChange: (value: string) => void;
  forceSaveEdit: (session: DialogSession) => Promise<void>;
}
export const useSessionManagement = ({ t, sortOrder }: UseSessionManagementProps): UseSessionManagementReturn => {
  const [sessions, setSessions] = useState<DialogSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    pinned: true,
    today: true,
    yesterday: true,
    last7days: true,
    last30days: true,
    older: true,
  });
  const editValueRef = useRef<string>("");
  const isSavingRef = useRef<boolean>(false);
  const isZh = t("i18n") === "zh";
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      // FIX: Use office session commands.
      const list = await officeSessionCommands.listOfficeSessions();
      const sorted = [...list].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return a.is_pinned ? -1 : 1;
        }
        const getTimestamp = (id: string) => {
          // FIX: Use office_session_ prefix.
          const ts = id.replace("office_session_", "");
          return parseInt(ts, 10) || 0;
        };
        const aTime = getTimestamp(a.session_id);
        const bTime = getTimestamp(b.session_id);
        return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
      });
      setSessions(sorted);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  }, [sortOrder]);
  const filteredSessions = useCallback(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase().trim();
    return sessions.filter((s) => (s.title || "").toLowerCase().includes(query));
  }, [sessions, searchQuery]);
  const handleSelectSession = useCallback((sessionId: string, onSelectSession?: (id: string) => void) => {
    setActiveMenuId(null);
    if (onSelectSession) onSelectSession(sessionId);
  }, []);
  const handleTogglePin = useCallback(
    async (session: DialogSession, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const newPinned = !session.is_pinned;
        // FIX: Use office session commands.
        await officeSessionCommands.updatePinnedOfficeSessions(session.session_id, newPinned);
        setSessions((prev) => prev.map((s) => (s.session_id === session.session_id ? { ...s, is_pinned: newPinned } : s)));
        setActiveMenuId(null);
        showToast(ToastType.SUCCESS, newPinned ? (isZh ? "已置顶" : "Pinned") : isZh ? "已取消置顶" : "Unpinned");
      } catch (error) {
        showToast(ToastType.ERROR, isZh ? "操作失败" : "Failed");
      }
    },
    [isZh],
  );
  const handleDeleteSession = useCallback(
    async (session: DialogSession, e: React.MouseEvent, onDelete?: () => void) => {
      e.stopPropagation();
      showDialog(
        DialogType.WARNING,
        isZh ? "删除会话" : "Delete Session",
        isZh
          ? `确定要删除会话 "${session.title || "未命名"}" 吗？此操作不可恢复。`
          : `Are you sure you want to delete session "${session.title || "Untitled"}"? This action cannot be undone.`,
        async () => {
          try {
            // FIX: Use office session commands.
            await officeSessionCommands.deleteOfficeSession(session.session_id);
            setSessions((prev) => prev.filter((s) => s.session_id !== session.session_id));
            setActiveMenuId(null);
            if (onDelete) onDelete();
            showToast(ToastType.SUCCESS, isZh ? "会话已删除" : "Session deleted");
          } catch (error) {
            showToast(ToastType.ERROR, isZh ? "删除会话失败" : "Failed to delete session");
          }
        },
        undefined,
        isZh ? "删除" : "Delete",
        isZh ? "取消" : "Cancel",
      );
    },
    [isZh],
  );
  const startEdit = useCallback((session: DialogSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const value = session.title || "";
    setEditingId(session.session_id);
    setEditValue(value);
    editValueRef.current = value;
    setActiveMenuId(null);
  }, []);
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue("");
    editValueRef.current = "";
  }, []);
  const handleEditChange = useCallback((value: string) => {
    setEditValue(value);
    editValueRef.current = value;
  }, []);
  const saveEdit = useCallback(
    async (session: DialogSession) => {
      if (isSavingRef.current) {
        return;
      }
      const trimmed = editValueRef.current.trim();
      if (!trimmed) {
        cancelEdit();
        return;
      }
      if (trimmed === session.title) {
        cancelEdit();
        return;
      }
      isSavingRef.current = true;
      try {
        // FIX: Use office session commands.
        await officeSessionCommands.updateOfficeSessionConfig(session.session_id, { title: trimmed });
        await loadSessions();
        setEditingId(null);
        setEditValue("");
        editValueRef.current = "";
        showToast(ToastType.SUCCESS, isZh ? "已重命名" : "Renamed");
        window.dispatchEvent(
          new CustomEvent("session-title-updated", {
            detail: { sessionId: session.session_id, title: trimmed },
          }),
        );
      } catch (error) {
        console.error("Save edit failed:", error);
        showToast(ToastType.ERROR, isZh ? "重命名失败" : "Rename failed");
      } finally {
        isSavingRef.current = false;
      }
    },
    [cancelEdit, loadSessions, isZh],
  );
  const forceSaveEdit = useCallback(
    async (session: DialogSession) => {
      if (isSavingRef.current) {
        return;
      }
      const trimmed = editValueRef.current.trim();
      if (!trimmed) {
        cancelEdit();
        return;
      }
      if (trimmed === session.title) {
        cancelEdit();
        return;
      }
      isSavingRef.current = true;
      try {
        // FIX: Use office session commands.
        await officeSessionCommands.updateOfficeSessionConfig(session.session_id, { title: trimmed });
        await loadSessions();
        setEditingId(null);
        setEditValue("");
        editValueRef.current = "";
        showToast(ToastType.SUCCESS, isZh ? "已重命名" : "Renamed");
        window.dispatchEvent(
          new CustomEvent("session-title-updated", {
            detail: { sessionId: session.session_id, title: trimmed },
          }),
        );
      } catch (error) {
        console.error("Force save edit failed:", error);
        showToast(ToastType.ERROR, isZh ? "重命名失败" : "Rename failed");
      } finally {
        isSavingRef.current = false;
      }
    },
    [cancelEdit, loadSessions, isZh],
  );
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, session: DialogSession) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit(session);
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit],
  );
  const toggleCategory = useCallback((categoryType: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryType]: !prev[categoryType],
    }));
  }, []);
  const getSessionThumbnail = useCallback((session: DialogSession): string | null => {
    if (session.thumbnail) {
      try {
        return convertFileSrc(session.thumbnail);
      } catch {
        return session.thumbnail;
      }
    }
    return null;
  }, []);
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  useEffect(() => {
    const handleSessionCreated = () => loadSessions();
    // FIX: Listen for the office-scoped session-created event.
    window.addEventListener("office-session-created", handleSessionCreated);
    return () => window.removeEventListener("office-session-created", handleSessionCreated);
  }, [loadSessions]);
  useEffect(() => {
    const handleTitleUpdated = () => loadSessions();
    window.addEventListener("session-title-updated", handleTitleUpdated);
    return () => window.removeEventListener("session-title-updated", handleTitleUpdated);
  }, [loadSessions]);
  return {
    sessions,
    loadingSessions,
    activeMenuId,
    hoveredSessionId,
    editingId,
    editValue,
    filteredSessions: filteredSessions(),
    expandedCategories,
    loadSessions,
    handleSelectSession,
    handleTogglePin,
    handleDeleteSession,
    startEdit,
    cancelEdit,
    saveEdit,
    handleKeyDown,
    toggleCategory,
    setActiveMenuId,
    setHoveredSessionId,
    setSearchQuery,
    searchQuery,
    getSessionThumbnail,
    handleEditChange,
    forceSaveEdit,
  };
};