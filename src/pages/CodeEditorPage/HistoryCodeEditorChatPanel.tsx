import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { DialogSession } from "../../types/types";
import { showDialog, DialogType } from "../../components/Dialog";
import { showToast, ToastType } from "../../components/Toast";
import { codeEditorSessionCommands } from "../../command/session/codeeditor";
import {
  DeleteIcon,
  MoreVerticalIcon,
  PinFilledIcon,
  PinIcon,
  RenameIcon,
  UnPinIcon,
} from "../../icons";
import { taskManager } from "../../core/TaskManager";

export interface HistoryCodeEditorChatPanelRef {
  scrollToTop: () => void;
  scrollToBottom: () => void;
  expandAll: () => void;
  collapseAll: () => void;
  refreshSessions: () => Promise<void>;
}

interface HistoryCodeEditorChatPanelProps {
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

const HistoryCodeEditorChatPanel = forwardRef<
  HistoryCodeEditorChatPanelRef,
  HistoryCodeEditorChatPanelProps
>(
  (
    { t, onSessionSelect, currentSessionId }: HistoryCodeEditorChatPanelProps,
    ref,
  ) => {
    const [sessions, setSessions] = useState<DialogSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const editInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [expandedCategories, setExpandedCategories] = useState<
      Record<CategoryType, boolean>
    >({
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
        const list = await codeEditorSessionCommands.listCodeEditorSessions();
        const sorted = [...list].sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1;
          }
          const getTimestamp = (id: string) => {
            const ts = id.replace("codeeditor_session_", "");
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
      window.addEventListener(
        "codeeditor-session-created",
        handleSessionCreated,
      );
      return () => {
        window.removeEventListener(
          "codeeditor-session-created",
          handleSessionCreated,
        );
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
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          setActiveMenuId(null);
        }
        if (
          editingId &&
          editInputRef.current &&
          !editInputRef.current.contains(event.target as Node)
        ) {
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

    const handleTogglePin = async (
      session: DialogSession,
      e: React.MouseEvent,
    ) => {
      e.stopPropagation();
      try {
        const newPinned = !session.is_pinned;
        await codeEditorSessionCommands.updatePinnedCodeEditorSessions(
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
        if (newPinned) {
          showToast(ToastType.SUCCESS, t("history.toast.pinned"));
        } else {
          showToast(ToastType.INFO, t("history.toast.unpinned"));
        }
      } catch (error) {
        showToast(ToastType.ERROR, t("history.toast.pinFailed"));
      }
    };

    const handleDelete = async (
      session: DialogSession,
      e: React.MouseEvent,
    ) => {
      e.stopPropagation();
      if (sessions.length <= 1) {
        showDialog(
          DialogType.WARNING,
          t("history.dialog.cannotDeleteTitle"),
          t("history.dialog.cannotDeleteMessage"),
          undefined,
          undefined,
          t("history.dialog.gotIt"),
          undefined,
        );
        setActiveMenuId(null);
        return;
      }
      showDialog(
        DialogType.WARNING,
        t("history.dialog.confirmDeleteTitle"),
        t("history.dialog.confirmDeleteMessage"),
        async () => {
          try {
            await codeEditorSessionCommands.deleteCodeEditorSession(
              session.session_id,
            );
            const domain = taskManager.getDomainFromSessionId(
              session.session_id,
            );
            taskManager.deleteSession(session.session_id, domain);
            if (currentSessionId === session.session_id && onSessionSelect) {
              const otherSession = sessions.find(
                (s) => s.session_id !== session.session_id,
              );
              if (otherSession) {
                onSessionSelect(otherSession.session_id);
              }
            }
            setSessions((prev) =>
              prev.filter((s) => s.session_id !== session.session_id),
            );
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
        await codeEditorSessionCommands.updateCodeEditorSessionConfig(
          session.session_id,
          {
            title: trimmed,
          },
        );
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
        setActiveMenuId(null);
        if (currentSessionId === sessionId) {
          return;
        }
        try {
          if (onSessionSelect) {
            onSessionSelect(sessionId);
          }
        } catch (error) {
          showToast(
            ToastType.ERROR,
            "Failed to recall session context:" + error,
          );
          if (onSessionSelect) {
            onSessionSelect(sessionId);
          }
        }
      },
      [currentSessionId, onSessionSelect],
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

    const getCardStyle = (
      isActive: boolean,
      isHovered: boolean,
    ): React.CSSProperties => {
      if (isActive) {
        return {
          background: "rgba(0, 102, 204, 0.1)",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "5px",
          border: "1px solid rgba(0, 102, 204, 0.3)",
          cursor: "pointer",
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
        marginBottom: "5px",
        border: "1px solid var(--border-color)",
        cursor: "pointer",
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
      flex: 1,
    };

    const titleInputStyle: React.CSSProperties = {
      fontSize: "14px",
      fontWeight: 500,
      color: "var(--text-primary)",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--accent-color)",
      borderRadius: "4px",
      padding: "2px 8px",
      outline: "none",
      flex: 1,
      minWidth: 0,
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
    };

    const dropdownStyle: React.CSSProperties = {
      position: "absolute",
      right: "0px",
      top: "30px",
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
      fontSize: "14px",
      fontWeight: 600,
      color: "var(--text-secondary)",
      padding: "12px 0 8px 4px",
      letterSpacing: "0.5px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      cursor: "pointer",
      paddingBottom: "5px",
    };

    if (loading && sessions.length === 0) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text-muted)",
          }}
        >
          {t("history.loading") || "Loading..."}
        </div>
      );
    }

    const groupedSessions = getGroupedSessions();

    return (
      <div
        ref={scrollContainerRef}
        style={{
          padding: "0px 5px",
          userSelect: "none",
          height: "100%",
          overflowY: "auto",
        }}
      >
        {sessions.length === 0 ? (
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
                      transform: expandedCategories[category.type]
                        ? "rotate(0deg)"
                        : "rotate(-90deg)",
                    }}
                  >
                    ▼
                  </span>
                </div>
                {expandedCategories[category.type] &&
                  categorySessions.map((session) => {
                    const isActive = currentSessionId === session.session_id;
                    const isHovered = hoveredId === session.session_id;
                    const isEditing = editingId === session.session_id;
                    return (
                      <div
                        key={session.session_id}
                        style={getCardStyle(isActive, isHovered)}
                        onMouseEnter={() => setHoveredId(session.session_id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => {
                          if (!isEditing) {
                            handleSelectSession(session.session_id);
                          }
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {session.is_pinned && (
                              <span style={pinIconStyle}>
                                <PinFilledIcon size={16} />
                              </span>
                            )}
                            {isEditing ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                style={titleInputStyle}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, session)}
                                onBlur={() => saveEdit(session)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span style={titleStyle} title={session.title}>
                                {session.title || t("history.untitled")}
                              </span>
                            )}
                          </div>
                          <div style={timeStyle}>
                            {formatDate(session.created_at)}
                          </div>
                        </div>
                        {!isEditing &&
                          (activeMenuId === session.session_id ||
                            isHovered) && (
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
                                  e.currentTarget.style.background =
                                    "var(--hover-bg)";
                                  e.currentTarget.style.color =
                                    "var(--text-primary)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "none";
                                  e.currentTarget.style.color =
                                    "var(--text-secondary)";
                                }}
                              >
                                <MoreVerticalIcon size={18} />
                              </button>
                              {activeMenuId === session.session_id && (
                                <div style={dropdownStyle} ref={menuRef}>
                                  <div
                                    style={dropdownItemStyle}
                                    onClick={(e) => startEdit(session, e)}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background =
                                        "var(--hover-bg)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "";
                                    }}
                                  >
                                    <RenameIcon size={16} />{" "}
                                    {t("history.rename")}
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
                                    {session.is_pinned ? (
                                      <UnPinIcon size={16} />
                                    ) : (
                                      <PinIcon size={16} />
                                    )}{" "}
                                    {session.is_pinned
                                      ? t("history.unpin")
                                      : t("history.pin")}
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
                                    <DeleteIcon size={16} />{" "}
                                    {t("history.delete")}
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
          })
        )}
      </div>
    );
  },
);

HistoryCodeEditorChatPanel.displayName = "HistoryCodeEditorChatPanel";

export default HistoryCodeEditorChatPanel;
