import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ScheduledTask,
  scheduledTasksCommands,
} from "../../command/scheduledtasks";
import { showDialog, DialogType } from "../../components/Dialog";
import { showToast, ToastType } from "../../components/Toast";

interface ScheduledTasksStatusProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  t: (key: string, params?: Record<string, any>) => string;
  popupRef: React.RefObject<HTMLDivElement | null>;
}

const SearchIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const XIcon = () => (
  <svg
    width="10"
    height="10"
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
);

const ChevronDownIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const PlayIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ListIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const ScheduledTasksStatus: React.FC<ScheduledTasksStatusProps> = ({
  isOpen,
  onClose,
  anchorRef,
  t,
  popupRef,
}) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "enabled" | "disabled" | "completed"
  >("all");
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPopupRef = useRef<HTMLDivElement>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const taskList = await scheduledTasksCommands.list();
      const sorted = [...taskList].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setTasks(sorted);
    } catch (error) {
      console.error("Failed to load scheduled tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen]);

  // Click outside for filter popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showFilterPopup &&
        filterPopupRef.current &&
        !filterPopupRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowFilterPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterPopup]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (statusFilter === "enabled" && (!task.enabled || task.completed))
        return false;
      if (statusFilter === "disabled" && (task.enabled || task.completed))
        return false;
      if (statusFilter === "completed" && !task.completed) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = task.name.toLowerCase().includes(query);
        return nameMatch;
      }
      return true;
    });
  }, [tasks, searchQuery, statusFilter]);

  const getStatusStats = () => {
    const total = tasks.length;
    const enabled = tasks.filter((t) => t.enabled && !t.completed).length;
    const disabled = tasks.filter((t) => !t.enabled && !t.completed).length;
    const completed = tasks.filter((t) => t.completed).length;
    const failed = tasks.filter((t) => t.last_status === "failed").length;
    return { total, enabled, disabled, completed, failed };
  };

  const getScheduleDisplay = (task: ScheduledTask): string => {
    const config = task.schedule_config;
    if (config.type === "interval") {
      const unitText: Record<string, string> = {
        second: t("scheduled.unitSecond"),
        minute: t("scheduled.unitMinute"),
        hour: t("scheduled.unitHour"),
        day: t("scheduled.unitDay"),
      };
      const unit = unitText[config.config.unit] || config.config.unit;
      return `${t("scheduled.every")} ${config.config.value} ${unit}`;
    } else {
      const freqText: Record<string, string> = {
        daily: t("scheduled.frequencyDaily"),
        weekly: t("scheduled.frequencyWeekly"),
        monthly: t("scheduled.frequencyMonthly"),
        once: t("scheduled.frequencyOnce"),
      };
      let text = freqText[config.config.frequency] || config.config.frequency;
      if (
        config.config.frequency === "weekly" &&
        config.config.day_of_week?.length
      ) {
        const dayNames = config.config.day_of_week.map((d: number) => {
          const weekDays = [
            t("scheduled.sunShort"),
            t("scheduled.monShort"),
            t("scheduled.tueShort"),
            t("scheduled.wedShort"),
            t("scheduled.thuShort"),
            t("scheduled.friShort"),
            t("scheduled.satShort"),
          ];
          return weekDays[d] || d;
        });
        text += ` ${dayNames.join(",")}`;
      }
      if (
        config.config.frequency === "monthly" &&
        config.config.day_of_month?.length
      ) {
        text += ` ${config.config.day_of_month.join(",")}${t("scheduled.dayUnit")}`;
      }
      if (config.config.time) {
        text += ` ${config.config.time}`;
      }
      return text;
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return t("scheduled.never");
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("notificationCenter.justNow");
    if (diffMins < 60) return `${diffMins} ${t("common.minutesAgo")}`;
    if (diffHours < 24) return `${diffHours} ${t("common.hoursAgo")}`;
    if (diffDays < 7) return `${diffDays} ${t("common.daysAgo")}`;
    return date.toLocaleDateString();
  };

  const handleToggleTask = async (taskId: string, enabled: boolean) => {
    try {
      const updatedTask = await scheduledTasksCommands.toggle(taskId, enabled);
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      showToast(
        ToastType.SUCCESS,
        enabled
          ? t("scheduled.enabledSuccess")
          : t("scheduled.disabledSuccess"),
      );
    } catch (error) {
      console.error("Failed to toggle task:", error);
      showToast(ToastType.ERROR, t("scheduled.toggleFailed"));
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const completedTask = await scheduledTasksCommands.complete(taskId);
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? completedTask : task)),
      );
      showToast(ToastType.SUCCESS, t("scheduled.completeSuccess"));
    } catch (error) {
      console.error("Failed to complete task:", error);
      showToast(ToastType.ERROR, t("scheduled.completeFailed"));
    }
  };

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    showDialog(
      DialogType.WARNING,
      t("scheduled.confirmDeleteTitle"),
      t("scheduled.confirmDeleteMessage", { name: taskName }),
      async () => {
        try {
          await scheduledTasksCommands.delete(taskId);
          setTasks((prevTasks) =>
            prevTasks.filter((task) => task.id !== taskId),
          );
          showToast(ToastType.SUCCESS, t("scheduled.deleteSuccess"));
        } catch (error) {
          console.error("Failed to delete task:", error);
          showToast(ToastType.ERROR, t("scheduled.deleteFailed"));
        }
      },
      undefined,
      t("scheduled.delete"),
      t("settings.cancel"),
    );
  };

  const stats = getStatusStats();

  const filterOptions = [
    {
      key: "all" as const,
      label: t("scheduled.all"),
      icon: <ListIcon />,
    },
    {
      key: "enabled" as const,
      label: t("scheduled.enabled"),
      icon: <PlayIcon />,
    },
    {
      key: "disabled" as const,
      label: t("scheduled.disabled"),
      icon: <PauseIcon />,
    },
    {
      key: "completed" as const,
      label: t("scheduled.completed"),
      icon: <CheckIcon />,
    },
  ];

  const getCurrentFilterLabel = () => {
    const current = filterOptions.find((opt) => opt.key === statusFilter);
    return current ? current.label : t("scheduled.all");
  };

  const getCurrentFilterIcon = () => {
    const current = filterOptions.find((opt) => opt.key === statusFilter);
    return current ? current.icon : <ListIcon />;
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes statusSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        ref={popupRef}
        className="scheduled-status-popup"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          bottom: "35px",
          right: "5px",
          width: "420px",
          maxHeight: "520px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "5px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          zIndex: 1000,
          overflow: "hidden",
          animation: "statusSlideIn 0.2s ease-out",
          userSelect: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {t("scheduled.tasks")}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={loadTasks}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                background: "transparent",
                border: "none",
                borderRadius: "6px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              disabled={loading}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: loading ? "spin 0.8s linear infinite" : "none",
                }}
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
              {t("common.refresh")}
            </button>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "4px",
            padding: "8px 14px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-tertiary)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {stats.total}
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {t("scheduled.total")}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "15px", fontWeight: 600, color: "#10b981" }}
            >
              {stats.enabled}
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {t("scheduled.enabled")}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "15px", fontWeight: 600, color: "#8b5cf6" }}
            >
              {stats.completed}
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {t("scheduled.completed")}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: stats.failed > 0 ? "#ef4444" : "var(--text-muted)",
              }}
            >
              {stats.failed}
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
              {t("scheduled.failed")}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "8px 14px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "8px",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              <SearchIcon />
            </span>
            <input
              type="text"
              style={{
                width: "100%",
                padding: "5px 28px 5px 28px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "12px",
                outline: "none",
              }}
              placeholder={t("scheduled.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                style={{
                  position: "absolute",
                  right: "6px",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "2px 4px",
                  display: "flex",
                  alignItems: "center",
                }}
                onClick={() => setSearchQuery("")}
              >
                <XIcon />
              </button>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button
              ref={filterButtonRef}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 10px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: "var(--text-secondary)",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onClick={() => setShowFilterPopup(!showFilterPopup)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {getCurrentFilterIcon()}
              </span>
              <span>{getCurrentFilterLabel()}</span>
              <ChevronDownIcon />
            </button>

            {showFilterPopup && (
              <div
                ref={filterPopupRef}
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  minWidth: "120px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "6px 12px",
                      background:
                        statusFilter === option.key
                          ? "var(--accent-glow)"
                          : "transparent",
                      border: "none",
                      color: "var(--text-primary)",
                      fontSize: "11px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                    onClick={() => {
                      setStatusFilter(option.key);
                      setShowFilterPopup(false);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-tertiary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        statusFilter === option.key
                          ? "var(--accent-glow)"
                          : "transparent")
                    }
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {option.icon}
                    </span>
                    <span style={{ flex: 1 }}>{option.label}</span>
                    {statusFilter === option.key && (
                      <span
                        style={{
                          color: "var(--accent-color)",
                          fontSize: "11px",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ maxHeight: "280px", overflowY: "auto" }}>
          {loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: "13px",
              }}
            >
              {t("common.loading")}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: "13px",
              }}
            >
              {searchQuery || statusFilter !== "all"
                ? t("scheduled.noMatch")
                : t("scheduled.noTasks")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="task-row"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border-color)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      flexShrink: 0,
                      background: task.completed
                        ? "rgba(139, 92, 246, 0.15)"
                        : task.enabled
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(107, 114, 128, 0.15)",
                      cursor: task.completed ? "default" : "pointer",
                    }}
                    onClick={() => {
                      if (!task.completed) {
                        handleToggleTask(task.id, !task.enabled);
                      }
                    }}
                    title={
                      task.completed
                        ? t("scheduled.completed")
                        : task.enabled
                          ? t("scheduled.disableTooltip")
                          : t("scheduled.enableTooltip")
                    }
                  >
                    {task.completed ? (
                      <span style={{ fontSize: "14px", color: "#8b5cf6" }}>
                        ✓
                      </span>
                    ) : task.enabled ? (
                      <span style={{ fontSize: "14px", color: "#10b981" }}>
                        ▶
                      </span>
                    ) : (
                      <span style={{ fontSize: "14px", color: "#6b7280" }}>
                        ⏸
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "3px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "140px",
                        }}
                        title={task.name}
                      >
                        {task.name}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "1px 8px",
                            borderRadius: "10px",
                            background: task.completed
                              ? "rgba(139, 92, 246, 0.2)"
                              : task.enabled
                                ? "rgba(16, 185, 129, 0.2)"
                                : "rgba(107, 114, 128, 0.2)",
                            color: task.completed
                              ? "#8b5cf6"
                              : task.enabled
                                ? "#10b981"
                                : "var(--text-muted)",
                          }}
                        >
                          {task.completed
                            ? t("scheduled.completed")
                            : task.enabled
                              ? t("scheduled.enabled")
                              : t("scheduled.disabled")}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text-secondary)",
                        marginBottom: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getScheduleDisplay(task)}
                    </div>

                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text-secondary)",
                        marginBottom: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ flexShrink: 0 }}
                      >
                        <path
                          d="M4 7h16M4 12h16M4 17h10"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>
                        {t("scheduled.workflowMode")}:{" "}
                        {task.workflow_mode || "ReAct"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "9px",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span>
                        {t("scheduled.execute")}: {task.execution_count || 0}
                        {t("scheduled.times")}
                      </span>
                      <span>
                        {t("scheduled.lastExecute")}:{" "}
                        {formatTimestamp(task.last_executed_at)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      flexShrink: 0,
                      transition: "opacity 0.2s",
                    }}
                    className="scheduled-status-actions"
                  >
                    {!task.completed && (
                      <button
                        onClick={() => handleToggleTask(task.id, !task.enabled)}
                        title={
                          task.enabled
                            ? t("scheduled.disable")
                            : t("scheduled.enable")
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "2px 4px",
                          borderRadius: "4px",
                          color: task.enabled ? "#f59e0b" : "#10b981",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = task.enabled
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(16, 185, 129, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "none";
                        }}
                      >
                        {task.enabled ? <PauseIcon /> : <PlayIcon />}
                      </button>
                    )}

                    {!task.completed && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        title={t("scheduled.complete")}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "2px 4px",
                          borderRadius: "4px",
                          color: "#8b5cf6",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(139, 92, 246, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "none";
                        }}
                      >
                        <CheckIcon />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTask(task.id, task.name)}
                      title={t("scheduled.delete")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        color: "#ef4444",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(239, 68, 68, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "none";
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "6px 14px",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            fontSize: "10px",
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            {t("scheduled.total")}: {filteredTasks.length}
            {filteredTasks.length !== tasks.length &&
              ` (${t("scheduled.filtered")})`}
          </span>
          <span>{t("scheduled.clickStatusToToggle")}</span>
        </div>
      </div>
    </>
  );
};

export default ScheduledTasksStatus;
