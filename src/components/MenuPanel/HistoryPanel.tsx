import React, { useEffect, useState, useRef } from "react";
import { sessionCommands } from "../../api/session";
import { DialogSession } from "../../type";

interface HistoryPanelProps {
  t: (key: string, params?: any) => string;
  onSessionSelect?: (sessionId: string) => void;
  currentSessionId?: string;
}

type CategoryType =
  | "pinned"
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "older";

interface CategoryConfig {
  label: string;
  type: CategoryType;
}

const categories: CategoryConfig[] = [
  { label: "置顶", type: "pinned" },
  { label: "今天", type: "today" },
  { label: "昨天", type: "yesterday" },
  { label: "最近7天", type: "last7days" },
  { label: "最近30天", type: "last30days" },
  { label: "更早", type: "older" },
];

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  t,
  onSessionSelect,
  currentSessionId,
}) => {
  const [sessions, setSessions] = useState<DialogSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadSessions();
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    const handleSessionCreated = () => {
      loadSessions();
    };
    window.addEventListener("session-created", handleSessionCreated);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("session-created", handleSessionCreated);
    };
  }, []);
  const loadSessions = async () => {
    setLoading(true);
    try {
      const list = await sessionCommands.listSessions();
      setSessions(list);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleTogglePin = async (
    session: DialogSession,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      const newPinned = !session.is_pinned;
      const updatedPinned = await sessionCommands.updatePinnedSessions(
        session.session_id,
        newPinned,
      );
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === session.session_id
            ? { ...s, is_pinned: newPinned }
            : s,
        ),
      );
      setActiveMenuId(null);
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };
  const handleDelete = async (session: DialogSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      t("history.confirmDelete") || `确定要删除 "${session.title}" 吗？`,
    );
    if (confirmed) {
      try {
        await sessionCommands.deleteSession(session.session_id);
        if (currentSessionId === session.session_id && onSessionSelect) {
          onSessionSelect("default");
        }
        setSessions((prev) =>
          prev.filter((s) => s.session_id !== session.session_id),
        );
        setActiveMenuId(null);
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    }
  };
  const handleRename = async (session: DialogSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTitle = prompt(
      t("history.renamePrompt") || "请输入新名称",
      session.title,
    );
    if (newTitle && newTitle.trim()) {
      try {
        await sessionCommands.updateSessionConfig(session.session_id, {
          title: newTitle.trim(),
        });
        await loadSessions();
        setActiveMenuId(null);
      } catch (error) {
        console.error("Failed to rename session:", error);
      }
    }
  };
  const handleSelectSession = (sessionId: string) => {
    setActiveMenuId(null);
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
  };
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };
  const getSessionCategory = (session: DialogSession): CategoryType => {
    if (session.is_pinned) return "pinned";
    const now = new Date();
    const updatedDate = new Date(session.updated_at);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (updatedDate >= today) return "today";
    if (updatedDate >= yesterday) return "yesterday";
    if (updatedDate >= weekAgo) return "last7days";
    if (updatedDate >= monthAgo) return "last30days";
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
  const getCardStyle = (
    isActive: boolean,
    isHovered: boolean,
  ): React.CSSProperties => {
    if (isActive) {
      return {
        background: "var(--hover-bg)",
        borderRadius: "10px",
        padding: "12px 14px",
        marginBottom: "8px",
        border: "1px solid var(--accent-color, #0066cc)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
      };
    }
    return {
      background: isHovered ? "var(--hover-bg)" : "var(--bg-secondary)",
      borderRadius: "10px",
      padding: "12px 14px",
      marginBottom: "8px",
      border: "1px solid var(--border-color)",
      cursor: "pointer",
      transition: "background 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "relative",
    };
  };
  const titleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-primary)",
    marginBottom: "6px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  const timeStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--text-muted)",
  };
  const pinIconStyle: React.CSSProperties = {
    fontSize: "12px",
    marginRight: "8px",
    color: "var(--accent-color, #0066cc)",
  };
  const menuButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "18px",
    color: "var(--text-secondary)",
    padding: "4px 8px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  };
  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    right: "0px",
    top: "30px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
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
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    zIndex: "10",
  };
  const categoryHeaderStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    padding: "12px 0 8px 4px",
    letterSpacing: "0.5px",
  };
  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          color: "var(--text-muted)",
        }}
      >
        {t("atomicSkills.loading") || "加载中..."}
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          color: "var(--text-muted)",
        }}
      >
        {t("history.empty") || "暂无对话历史"}
      </div>
    );
  }
  const groupedSessions = getGroupedSessions();
  return (
    <div style={{ padding: "8px 12px" }}>
      {categories.map((category) => {
        const categorySessions = groupedSessions[category.type];
        if (categorySessions.length === 0) return null;
        return (
          <div key={category.type}>
            <div style={categoryHeaderStyle}>{category.label}</div>
            {categorySessions.map((session) => {
              const isActive = currentSessionId === session.session_id;
              const isHovered = hoveredId === session.session_id;

              return (
                <div
                  key={session.session_id}
                  style={getCardStyle(isActive, isHovered)}
                  onMouseEnter={() => setHoveredId(session.session_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelectSession(session.session_id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {session.is_pinned && (
                        <span style={pinIconStyle}>📌</span>
                      )}
                      <span style={titleStyle} title={session.title}>
                        {session.title || "未命名对话"}
                      </span>
                    </div>
                    <div style={timeStyle}>
                      {formatDate(session.updated_at)}
                    </div>
                  </div>
                  {(activeMenuId === session.session_id || isHovered) && (
                    <div>
                      <button
                        style={menuButtonStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(
                            activeMenuId === session.session_id
                              ? null
                              : session.session_id,
                          );
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
                        ⋯
                      </button>
                      {activeMenuId === session.session_id && (
                        <div style={dropdownStyle} ref={menuRef}>
                          <div
                            style={dropdownItemStyle}
                            onClick={(e) => handleRename(session, e)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "var(--hover-bg)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "";
                            }}
                          >
                            ✏️ {t("history.rename") || "重命名"}
                          </div>
                          <div
                            style={dropdownItemStyle}
                            onClick={(e) => handleTogglePin(session, e)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "var(--hover-bg)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "";
                            }}
                          >
                            {session.is_pinned ? "📍" : "📌"}{" "}
                            {session.is_pinned
                              ? t("history.unpin") || "取消置顶"
                              : t("history.pin") || "置顶"}
                          </div>
                          <div
                            style={{
                              ...dropdownItemStyle,
                              color: "var(--error-color, #dc2626)",
                            }}
                            onClick={(e) => handleDelete(session, e)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "var(--error-bg, rgba(220,38,38,0.1))";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "";
                            }}
                          >
                            🗑️ {t("history.delete") || "删除"}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default HistoryPanel;
