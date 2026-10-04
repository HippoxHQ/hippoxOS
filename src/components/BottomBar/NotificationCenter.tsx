import React, { useState, useEffect, useRef } from "react";
import { SystemNotification, notificationManager, NotificationType } from "../../core/NotificationManager";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  t: (key: string, params?: Record<string, any>) => string;
  popupRef: React.RefObject<HTMLDivElement | null>;
}
const extractSubsystem = (data?: Record<string, any>): "general" | "financial_analysis" | "map" | "codeeditor" | "sandbox3d" | "video" => {
  if (!data) return "general";
  if (data.subsystem) {
    return data.subsystem as "general" | "financial_analysis" | "map" | "codeeditor" | "sandbox3d" | "video";
  }
  const sessionId = data.sessionId || data.session_id;
  if (sessionId) {
    const id = sessionId as string;
    if (id.startsWith("financial_analysis_session_")) return "financial_analysis";
    if (id.startsWith("map_session_")) return "map";
    if (id.startsWith("codeeditor_session_")) return "codeeditor";
    if (id.startsWith("video_session_")) return "video";
    if (id.startsWith("sandbox3d_session_")) return "sandbox3d";
  }
  if (data.path) {
    const path = data.path as string;
    if (path.includes("FinancialAnalysis") || path.includes("financial_analysis_session_")) return "financial_analysis";
    if (path.includes("MapDialogHistory") || path.includes("map_session_")) return "map";
    if (path.includes("CodeEditorDialogHistory") || path.includes("codeeditor_session_")) return "codeeditor";
    if (path.includes("SandBox3DDialogHistory") || path.includes("sandbox3d_session_")) return "sandbox3d";
    if (path.includes("VideoDialogHistory") || path.includes("video_session_")) return "video";
  }
  if (data.payload) {
    const payload = data.payload;
    if (payload.subsystem) {
      return payload.subsystem as "general" | "financial_analysis" | "map" | "codeeditor" | "sandbox3d" | "video";
    }
    if (payload.session_id || payload.sessionId) {
      const id = (payload.session_id || payload.sessionId) as string;
      if (id.startsWith("financial_analysis_session_")) return "financial_analysis";
      if (id.startsWith("map_session_")) return "map";
      if (id.startsWith("codeeditor_session_")) return "codeeditor";
      if (id.startsWith("video_session_")) return "video";
      if (id.startsWith("sandbox3d_session_")) return "sandbox3d";
    }
  }
  if (data.title) {
    const title = data.title as string;
    if (title.includes("Financial") || title.includes("financial_analysis")) return "financial_analysis";
    if (title.includes("Map") || title.includes("map")) return "map";
    if (title.includes("CodeEditor") || title.includes("codeeditor") || title.includes("Code Editor")) return "codeeditor";
    if (title.includes("Video") || title.includes("video")) return "video";
    if (title.includes("SandBox") || title.includes("sandbox3d") || title.includes("3D")) return "sandbox3d";
  }
  return "general";
};
/**
 * Extract session ID from notification data
 */
const extractSessionId = (data?: Record<string, any>): string | undefined => {
  if (!data) return undefined;
  // Check for sessionId in data
  if (data.sessionId) return data.sessionId;
  if (data.session_id) return data.session_id;
  // Check for sessionId nested in payload
  if (data.payload?.sessionId) return data.payload.sessionId;
  if (data.payload?.session_id) return data.payload.session_id;
  return undefined;
};
/**
 * Try to parse a value that may be a JSON string / object / primitive into
 * a plain object. Returns an empty object when parsing is not possible so
 * the caller can safely spread the result into i18n params.
 */
const coerceToObject = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    // Only attempt JSON parsing when the string clearly looks like JSON,
    // otherwise keep it as a plain text field so i18n can still show it.
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return parsed as Record<string, any>;
        }
      } catch {
        // Not JSON; fall through and wrap it as text.
      }
    }
    return { text: value };
  }
  return { value };
};
/**
 * Unescape a JSON string fragment.
 *
 * Handles the escapes that the backend is likely to emit inside `message`:
 * \n \r \t \" \\ \/ \b \f and \uXXXX. Invalid escapes are left as-is so we
 * never lose characters.
 */
const unescapeJsonString = (raw: string): string => {
  if (!raw) return "";
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    if (next === undefined) {
      out += "\\";
      break;
    }
    switch (next) {
      case "n":
        out += "\n";
        i++;
        break;
      case "r":
        out += "\r";
        i++;
        break;
      case "t":
        out += "\t";
        i++;
        break;
      case "b":
        out += "\b";
        i++;
        break;
      case "f":
        out += "\f";
        i++;
        break;
      case '"':
        out += '"';
        i++;
        break;
      case "\\":
        out += "\\";
        i++;
        break;
      case "/":
        out += "/";
        i++;
        break;
      case "u": {
        // \uXXXX: parse the four hex digits when possible.
        const hex = raw.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 5;
        } else {
          out += "\\u";
          i++;
        }
        break;
      }
      default:
        out += "\\" + next;
        i++;
        break;
    }
  }
  return out;
};
/**
 * Extract a single string field by key from a possibly-broken JSON fragment.
 */
const extractStringField = (text: string, key: string): string | null => {
  // Match `"key"` optionally preceded by any whitespace and `:` separator,
  // then capture everything up to the first unescaped `"` or end-of-string.
  const pattern = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)("|$)`, "i");
  const match = text.match(pattern);
  if (!match) return null;
  const raw = match[1];
  if (!raw) return null;
  const value = unescapeJsonString(raw).trim();
  if (!value) return null;
  return value;
};
/**
 * Fallback: pull a readable string out of a broken / truncated JSON blob.
 */
const extractFromBrokenJson = (text: string): string | null => {
  // Ordered list of keys to search. The first non-empty match wins.
  const priorityKeys = ["chatResponseMessage", "m", "message", "text", "content", "final_output", "finalOutput", "output", "error", "detail", "description", "name", "title", "s"];
  // First pass: search within `chatResponse` / `terminalResponse` blocks.
  const chatResponseIndex = text.indexOf('"chatResponse"');
  if (chatResponseIndex !== -1) {
    const slice = text.slice(chatResponseIndex);
    const fromChat = extractStringField(slice, "m") || extractStringField(slice, "message") || extractStringField(slice, "text") || extractStringField(slice, "s");
    if (fromChat) return fromChat;
  }
  const terminalResponseIndex = text.indexOf('"terminalResponse"');
  if (terminalResponseIndex !== -1) {
    const slice = text.slice(terminalResponseIndex);
    const fromTerminal = extractStringField(slice, "m") || extractStringField(slice, "message") || extractStringField(slice, "text");
    if (fromTerminal) return fromTerminal;
  }
  for (const key of priorityKeys) {
    if (key === "chatResponseMessage") continue;
    const value = extractStringField(text, key);
    if (value) return value;
  }
  return null;
};
/**
 * Convert a possibly-JSON notification field into a human-readable string.
 */
const extractReadableMessage = (message: any): string => {
  if (message === null || message === undefined) return "";
  // Plain string handling.
  if (typeof message === "string") {
    const trimmed = message.trim();
    if (!trimmed) return "";
    // If it looks like JSON (object or array), try the strict path first so
    // well-formed payloads go through the full parser.
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return extractReadableMessage(parsed);
        }
        // A scalar JSON value (e.g. `"hello"`): fall through to string
        // handling below.
      } catch {
        // Broken / truncated JSON: scan raw text for known keys.
        const fromBroken = extractFromBrokenJson(trimmed);
        if (fromBroken) return fromBroken;
        // Nothing readable: fall back to returning the original string so
        // the user still sees *something* rather than an empty row.
        return message;
      }
    }
    return message;
  }
  // Object handling.
  if (typeof message === "object") {
    const obj = message as Record<string, any>;
    // Prefer the two response envelopes used throughout the app. Their `m`
    // field is the actual message body, so check them before the flat keys.
    if (obj.chatResponse && typeof obj.chatResponse === "object") {
      const nested = extractReadableMessage(obj.chatResponse);
      if (nested) return nested;
    }
    if (obj.terminalResponse && typeof obj.terminalResponse === "object") {
      const nested = extractReadableMessage(obj.terminalResponse);
      if (nested) return nested;
    }
    if (obj.payload && typeof obj.payload === "object") {
      const nested = extractReadableMessage(obj.payload);
      if (nested) return nested;
    }
    // Flat keys, in priority order. Empty strings are skipped so an empty
    // `m` in `terminalResponse` does not shadow the real body.
    const candidateKeys = ["m", "message", "text", "content", "final_output", "finalOutput", "output", "error", "title", "name", "detail", "description", "s"];
    for (const key of candidateKeys) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) {
        // Guard against nested JSON strings.
        return extractReadableMessage(value);
      }
    }
    // Last resort: compact-print so the row is never blank.
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }
  return String(message);
};
const resolveNotificationTitle = (t: (key: string, params?: Record<string, any>) => string, title: any, data?: any): string => {
  if (title === null || title === undefined || title === "") return "";
  const params = coerceToObject(data);
  // Title can itself be a JSON string; normalise to a plain string first so
  // that `t()` always receives a string key.
  const titleText = typeof title === "string" ? title : extractReadableMessage(title);
  if (!titleText) return "";
  const translated = t(titleText, params);
  if (translated && translated !== titleText) {
    return translated;
  }
  // Missing translation: run the raw title through the readable extractor.
  return extractReadableMessage(titleText);
};
/**
 * Resolve a notification message into a human-readable string.
 */
const resolveNotificationMessage = (message: any): string => {
  return extractReadableMessage(message);
};
/**
 * Handle notification click - navigate to the appropriate subsystem and session
 */
const handleNotificationClick = (notification: SystemNotification): void => {
  const { data, type, title, message } = notification;
  // Extract session ID from notification data
  const sessionId = extractSessionId(data);
  // Extract subsystem from notification data
  const subsystem = extractSubsystem(data);
  // Debug: Log notification data to understand structure
  console.log(`[Notification] Clicked:`, {
    id: notification.id,
    type: type,
    title: title,
    message: message,
    data: data,
    extracted: { sessionId, subsystem },
  });
  // If there's a session ID, switch to that session
  if (sessionId) {
    // Dispatch event to switch session with session info
    window.dispatchEvent(
      new CustomEvent(APP_WINDOW_EVENTS.SEARCH_SWITCH_SESSION, {
        detail: {
          sessionId: sessionId,
          title: data?.title || notification.title || "Session",
          highlightMessageId: data?.messageId || data?.id,
          subsystem: subsystem,
        },
      }),
    );
    // Dispatch session selected event
    window.dispatchEvent(
      new CustomEvent(APP_WINDOW_EVENTS.SESSION_SELECTED, {
        detail: {
          sessionId: sessionId,
          title: data?.title || notification.title || "Session",
          subsystem: subsystem,
        },
      }),
    );
    return;
  }
  switch (type) {
    case NotificationType.Success:
    case NotificationType.Info:
    case NotificationType.Warning:
    case NotificationType.Error:
    default:
      break;
  }
};
const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, anchorRef, t, popupRef }) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    const init = async () => {
      await notificationManager.initialize();
      setIsInitialized(true);
      const allNotifications = await notificationManager.getAll();
      setNotifications(allNotifications);
    };
    init();
  }, []);
  // Subscribe to notification changes
  useEffect(() => {
    if (!isInitialized) return;
    const unsubscribe = notificationManager.subscribe((updatedNotifications: SystemNotification[]) => {
      setNotifications(updatedNotifications);
    });
    return unsubscribe;
  }, [isInitialized]);
  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return t("notificationCenter.justNow") || "Just now";
    if (diffMins < 60) return `${diffMins} ${t("common.minutesAgo") || "min ago"}`;
    if (diffHours < 24) return `${diffHours} ${t("common.hoursAgo") || "hours ago"}`;
    if (diffDays < 7) return `${diffDays} ${t("common.daysAgo") || "days ago"}`;
    return date.toLocaleDateString();
  };
  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.Success:
        return "✓";
      case NotificationType.Error:
        return "✗";
      case NotificationType.Warning:
        return "⚠";
      default:
        return "ℹ";
    }
  };
  // Get icon background color based on type
  const getIconBgColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.Success:
        return "rgba(16, 185, 129, 0.15)";
      case NotificationType.Error:
        return "rgba(239, 68, 68, 0.15)";
      case NotificationType.Warning:
        return "rgba(245, 158, 11, 0.15)";
      default:
        return "rgba(59, 130, 246, 0.15)";
    }
  };
  // Get icon color based on type
  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.Success:
        return "#10b981";
      case NotificationType.Error:
        return "#ef4444";
      case NotificationType.Warning:
        return "#f59e0b";
      default:
        return "#3b82f6";
    }
  };
  // Mark a single notification as read
  const handleMarkAsRead = async (id: string) => {
    await notificationManager.markAsRead(id);
  };
  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    await notificationManager.markAllAsRead();
  };
  // Delete a single notification
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationManager.delete(id);
  };
  // Clear all notifications
  const handleClearAll = async () => {
    await notificationManager.clearAll();
  };
  // Handle notification item click - navigate to subsystem and session
  const handleNotificationItemClick = async (notification: SystemNotification) => {
    // Mark as read first
    if (!notification.read) {
      await notificationManager.markAsRead(notification.id);
    }
    // Navigate to the appropriate subsystem and session
    handleNotificationClick(notification);
    // Close the notification center
    onClose();
  };
  if (!isOpen) return null;
  return (
    <>
      <style>{`
        @keyframes notificationSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div
        ref={popupRef}
        className="notification-center-popup"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          bottom: "35px",
          right: "5px",
          width: "380px",
          maxHeight: "480px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "5px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          zIndex: 1000,
          overflow: "hidden",
          animation: "notificationSlideIn 0.2s ease-out",
          userSelect: "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {t("notificationCenter.title")}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllAsRead}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {t("notificationCenter.markAllRead")}
                </button>
                <button
                  onClick={handleClearAll}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                    e.currentTarget.style.color = "#ef4444";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {t("notificationCenter.clearAll")}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                background: "transparent",
                border: "none",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        {/* Notification List */}
        <div style={{ maxHeight: "350px", overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: "13px",
              }}
            >
              {t("notificationCenter.noNotifications")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {notifications.map((notification) => {
                const resolvedTitle = resolveNotificationTitle(t, notification.title, notification.data);
                const resolvedMessage = resolveNotificationMessage(notification.message);
                return (
                  <div
                    key={notification.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border-color)",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      background: "transparent",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      setHoveredId(notification.id);
                      e.currentTarget.style.background = "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      setHoveredId(null);
                      e.currentTarget.style.background = "transparent";
                    }}
                    onClick={() => handleNotificationItemClick(notification)}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "10px",
                        background: getIconBgColor(notification.type),
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          color: getIconColor(notification.type),
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          marginBottom: "6px",
                        }}
                      >
                        {resolvedTitle}
                      </div>
                      {resolvedMessage && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            marginBottom: "4px",
                            wordBreak: "break-word",
                            lineHeight: 1.4,
                          }}
                        >
                          {resolvedMessage}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {formatTimestamp(notification.timestamp)}
                      </div>
                    </div>
                    {/* Unread indicator */}
                    {!notification.read && (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: getIconColor(notification.type),
                          flexShrink: 0,
                          marginTop: "8px",
                        }}
                      />
                    )}
                    {/* Delete button */}
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4px",
                        background: "transparent",
                        border: "none",
                        borderRadius: "4px",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        opacity: hoveredId === notification.id ? 1 : 0,
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--hover-bg)";
                        e.currentTarget.style.color = "#ef4444";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-tertiary)";
                      }}
                      onClick={(e) => handleDelete(notification.id, e)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
export default NotificationCenter;
