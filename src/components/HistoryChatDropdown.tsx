import React, { useEffect, useState, useRef, useCallback } from "react";
import { DialogSession } from "../types/types";
import { showToast, ToastType } from "./Toast";
import { PinFilledIcon } from "../icons";
import { sessionCommands } from "../command/session/general";
interface HistoryChatDropdownProps {
  t: (key: string, params?: any) => string;
  onSessionSelect?: (sessionId: string) => void;
  currentSessionId?: string;
  onClose?: () => void;
  isOpen: boolean;
  anchorElement?: HTMLElement | null;
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
const HistoryChatDropdown: React.FC<HistoryChatDropdownProps> = ({ t, onSessionSelect, currentSessionId, onClose, isOpen, anchorElement }) => {
  const [sessions, setSessions] = useState<DialogSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<CategoryType, boolean>>({
    pinned: true,
    today: true,
    yesterday: true,
    last7days: true,
    last30days: true,
    older: true,
  });
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleCategory = (categoryType: CategoryType) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryType]: !prev[categoryType],
    }));
  };
  const loadSessions = async () => {
    setLoading(true);
    try {
      const list = await sessionCommands.listSessions();
      const sorted = [...list].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return a.is_pinned ? -1 : 1;
        }
        const getTimestamp = (id: string) => {
          const ts = id.replace("session_", "");
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
  const updatePosition = useCallback(() => {
    if (!anchorElement) return;
    const rect = anchorElement.getBoundingClientRect();
    const dropdownWidth = 320;
    const gap = 6;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - gap) {
      left = window.innerWidth - dropdownWidth - gap;
    }
    if (left < gap) {
      left = gap;
    }
    setPosition({
      top: rect.bottom + gap,
      left: left,
    });
  }, [anchorElement]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && anchorElement && !anchorElement.contains(event.target as Node)) {
        onClose?.();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, anchorElement]);
  useEffect(() => {
    if (isOpen) {
      setIsVisible(false);
      loadSessions();
      requestAnimationFrame(() => {
        updatePosition();
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen, updatePosition]);
  useEffect(() => {
    if (isOpen) {
      const handleUpdate = () => {
        updatePosition();
      };
      window.addEventListener("resize", handleUpdate);
      window.addEventListener("scroll", handleUpdate);
      return () => {
        window.removeEventListener("resize", handleUpdate);
        window.removeEventListener("scroll", handleUpdate);
      };
    }
  }, [isOpen, updatePosition]);
  useEffect(() => {
    const handleSessionCreated = () => {
      loadSessions();
    };
    window.addEventListener("session-created", handleSessionCreated);
    return () => {
      window.removeEventListener("session-created", handleSessionCreated);
    };
  }, []);
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (currentSessionId === sessionId) {
        onClose?.();
        return;
      }
      try {
        if (onSessionSelect) {
          onSessionSelect(sessionId);
        }
      } catch (error) {
        showToast(ToastType.ERROR, "Failed to switch session:" + error);
        if (onSessionSelect) {
          onSessionSelect(sessionId);
        }
      }
      onClose?.();
    },
    [currentSessionId, onSessionSelect, onClose],
  );
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
  if (!isOpen) return null;
  const groupedSessions = getGroupedSessions();
  const hasSessions = sessions.length > 0;
  return (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: "320px",
        maxHeight: "420px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        zIndex: 999999,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "scale(1)" : "scale(0.95)",
        transformOrigin: "top left",
        transition: "opacity 0.1s ease, transform 0.12s ease",
        pointerEvents: isVisible ? "auto" : "none",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {t("history.title") || "历史会话"}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: "16px",
            padding: "0 4px",
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          overflowY: "auto",
          padding: "0px 0px",
          flex: 1,
        }}
      >
        {loading && sessions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "30px",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            {t("atomicSkills.loading") || "加载中..."}
          </div>
        ) : !hasSessions ? (
          <div
            style={{
              textAlign: "center",
              padding: "30px",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            {t("history.empty") || "暂无对话历史"}
          </div>
        ) : (
          categories.map((category) => {
            const categorySessions = groupedSessions[category.type];
            if (categorySessions.length === 0) return null;
            return (
              <div key={category.type}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    letterSpacing: "0.5px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "0px 10px",
                    marginBottom: "5px",
                    marginTop: "5px",
                  }}
                  onClick={() => toggleCategory(category.type)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <span>{t(category.labelKey)}</span>
                  <span
                    style={{
                      fontSize: "10px",
                      transition: "transform 0.15s",
                      transform: expandedCategories[category.type] ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  >
                    ▼
                  </span>
                </div>
                {expandedCategories[category.type] &&
                  categorySessions.map((session) => {
                    const isActive = currentSessionId === session.session_id;
                    const isHovered = hoveredId === session.session_id;
                    return (
                      <div
                        key={session.session_id}
                        style={{
                          padding: "8px 15px",
                          borderRadius: "0px",
                          cursor: "pointer",
                          background: isActive ? "rgba(129, 140, 248, 0.12)" : isHovered ? "var(--hover-bg)" : "transparent",
                          border: isActive ? "1px solid rgba(129, 140, 248, 0.25)" : "1px solid transparent",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={() => setHoveredId(session.session_id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => handleSelectSession(session.session_id)}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {session.is_pinned && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--accent-color, #818cf8)",
                                flexShrink: 0,
                              }}
                            >
                              <PinFilledIcon size={16} />
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: isActive ? 500 : 400,
                              color: isActive ? "var(--accent-color, #818cf8)" : "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                            title={session.title}
                          >
                            {session.title || t("history.untitled")}
                          </span>
                          {isActive && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--accent-color, #818cf8)",
                                flexShrink: 0,
                              }}
                            >
                              ●
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "var(--text-tertiary)",
                            marginTop: "2px",
                          }}
                        >
                          {formatDate(session.updated_at)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default HistoryChatDropdown;
