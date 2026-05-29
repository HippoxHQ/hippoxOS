import React, { useState, useEffect, useRef } from "react";
import {
  SystemNotification,
  systemNotificationService,
} from "../../services/Notification";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  t: (key: string, params?: Record<string, any>) => string;
  popupRef: React.RefObject<HTMLDivElement | null>;
}

const generateTestNotifications = (): SystemNotification[] => {
  const now = new Date();
  const types: Array<"info" | "success" | "warning" | "error"> = [
    "info",
    "success",
    "warning",
    "error",
  ];
  const titles = [
    { key: "notification.taskCompleted", default: "Task Completed" },
    { key: "notification.taskFailed", default: "Task Failed" },
    { key: "notification.taskStepUpdate", default: "Task Step Updated" },
    { key: "notification.taskCreated", default: "New Task Created" },
    { key: "notification.skillInstalled", default: "Skill Installed" },
    { key: "notification.skillUpdated", default: "Skill Updated" },
    { key: "notification.systemReady", default: "System Ready" },
    { key: "notification.engineInitialized", default: "Engine Initialized" },
  ];
  const messages = [
    "Data analysis task completed successfully, processed 1,234 records",
    "Database connection failed, please check network settings",
    "Code review step completed, found 3 potential issues",
    "New scheduled task created: Daily backup",
    "WebSearch skill installed successfully",
    "FileProcessor skill updated to v2.0.0",
    "Hippox system is ready, waiting for commands",
    "LLM engine initialized successfully, model loaded",
  ];

  const notifications: SystemNotification[] = [];
  for (let i = 0; i < 10; i++) {
    const date = new Date(now.getTime() - i * 3600000 * (i + 1));
    const titleIndex = i % titles.length;
    notifications.push({
      id: `test_${i}`,
      title: titles[titleIndex].key,
      message: messages[i % messages.length],
      type: types[i % types.length],
      timestamp: date.toISOString(),
      read: i >= 3,
      data: { testId: i },
    });
  }
  return notifications;
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  anchorRef,
  t,
  popupRef,
}) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isTestDataLoaded, setIsTestDataLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = systemNotificationService.subscribe(
      (newNotifications) => {
        setNotifications(newNotifications);
      },
    );
    return unsubscribe;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isTestDataLoaded && notifications.length === 0) {
      const testNotifications = generateTestNotifications();
      for (const notif of testNotifications) {
        systemNotificationService.add({
          title: notif.title,
          message: notif.message,
          type: notif.type,
          data: notif.data,
        });
      }
      setIsTestDataLoaded(true);
    }
  }, [isOpen, isTestDataLoaded, notifications.length]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return t("notificationCenter.justNow") || "Just now";
    if (diffMins < 60)
      return `${diffMins} ${t("common.minutesAgo") || "min ago"}`;
    if (diffHours < 24)
      return `${diffHours} ${t("common.hoursAgo") || "hours ago"}`;
    if (diffDays < 7) return `${diffDays} ${t("common.daysAgo") || "days ago"}`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: SystemNotification["type"]) => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "warning":
        return "⚠";
      default:
        return "ℹ";
    }
  };

  const getIconBgColor = (type: SystemNotification["type"]) => {
    switch (type) {
      case "success":
        return "rgba(16, 185, 129, 0.15)";
      case "error":
        return "rgba(239, 68, 68, 0.15)";
      case "warning":
        return "rgba(245, 158, 11, 0.15)";
      default:
        return "rgba(59, 130, 246, 0.15)";
    }
  };

  const getIconColor = (type: SystemNotification["type"]) => {
    switch (type) {
      case "success":
        return "#10b981";
      case "error":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      default:
        return "#3b82f6";
    }
  };

  const handleMarkAsRead = (id: string) => {
    systemNotificationService.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    systemNotificationService.markAllAsRead();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    systemNotificationService.delete(id);
  };

  const handleClearAll = () => {
    systemNotificationService.clearAll();
    setIsTestDataLoaded(false);
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

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
              {notifications.map((notification) => (
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
                  onClick={() => handleMarkAsRead(notification.id)}
                >
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

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        marginBottom: "6px",
                      }}
                    >
                      {t(notification.title, notification.data) ||
                        notification.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        marginBottom: "4px",
                        wordBreak: "break-word",
                        lineHeight: 1.4,
                      }}
                    >
                      {notification.message}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {formatTimestamp(notification.timestamp)}
                    </div>
                  </div>

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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;
