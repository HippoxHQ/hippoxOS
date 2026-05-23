import React, { useEffect, useState } from "react";
import { sessionCommands } from "../../api/session";
import { DialogSession } from "../../type";

interface HistoryPanelProps {
  t: (key: string, params?: any) => string;
  onSessionSelect?: (sessionId: string) => void;
  currentSessionId?: string;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  t,
  onSessionSelect,
  currentSessionId,
}) => {
  const [sessions, setSessions] = useState<DialogSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
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

  const handleTogglePin = async (session: DialogSession) => {
    try {
      const newPinned = !session.is_pinned;
      await sessionCommands.updateSessionConfig(session.session_id, {
        is_pinned: newPinned,
      });
      await loadSessions();
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const handleDelete = async (session: DialogSession) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm(
        t("history.confirmDelete") || `确定要删除 "${session.title}" 吗？`,
      )
    ) {
      try {
        await sessionCommands.deleteSession(session.session_id);
        await loadSessions();
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    }
  };

  const handleSelectSession = (sessionId: string) => {
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div
        className="panel-section"
        style={{ textAlign: "center", padding: "40px" }}
      >
        {t("atomicSkills.loading") || "加载中..."}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div
        className="panel-section"
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

  return (
    <div className="panel-section">
      <div className="history-list">
        {sessions.map((session) => (
          <div
            key={session.session_id}
            className={`history-item ${currentSessionId === session.session_id ? "active" : ""}`}
            onMouseEnter={() => setHoveredId(session.session_id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ position: "relative" }}
          >
            <div
              className="history-item-main"
              onClick={() => handleSelectSession(session.session_id)}
              style={{ flex: 1, cursor: "pointer" }}
            >
              <div className="history-info">
                <div
                  className="history-title"
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {session.is_pinned && <span className="pin-icon">📌</span>}
                  <span>{session.title || "未命名对话"}</span>
                </div>
                <div className="history-time">
                  {formatDate(session.updated_at)}
                </div>
              </div>
            </div>
            {hoveredId === session.session_id && (
              <div
                className="history-actions"
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <button
                  className="history-action-btn"
                  onClick={() => handleTogglePin(session)}
                  title={
                    session.is_pinned ? t("history.unpin") : t("history.pin")
                  }
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "4px",
                    borderRadius: "4px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {session.is_pinned ? "📌" : "📍"}
                </button>
                <button
                  className="history-action-btn"
                  onClick={() => handleDelete(session)}
                  title={t("history.delete")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "4px",
                    borderRadius: "4px",
                    color: "var(--text-secondary)",
                  }}
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPanel;
