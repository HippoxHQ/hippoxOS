import React, { useState, useEffect, useRef } from "react";
import {
  ScheduledTask,
  fromScheduleConfig,
} from "../../command/scheduledtasks";

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

const PlusIcon = () => (
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
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="14"
    height="14"
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
);

const CalendarIcon = () => (
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
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
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

const MessageSquareIcon = () => (
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const FileIcon = () => (
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
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);

const EmptyListIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// ListIcon - defined before usage in filterOptions
const ListIcon = () => (
  <svg
    width="14"
    height="14"
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

interface TaskCardListProps {
  t: (key: string, params?: any) => string;
  tasks: ScheduledTask[];
  selectedTaskId: string | null;
  onSelectTask: (task: ScheduledTask) => void;
  onToggleTask: (taskId: string, enabled: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: "all" | "enabled" | "disabled" | "completed";
  onStatusFilterChange: (
    filter: "all" | "enabled" | "disabled" | "completed",
  ) => void;
  onCreateNew: () => void;
}

const getScheduleDisplay = (
  scheduleType: "fixed" | "interval",
  config: any,
  t: (key: string, params?: any) => string,
): string => {
  if (scheduleType === "interval") {
    const unitText: Record<string, string> = {
      second: t("scheduled.unitSecond") || "秒",
      minute: t("scheduled.unitMinute") || "分钟",
      hour: t("scheduled.unitHour") || "小时",
      day: t("scheduled.unitDay") || "天",
    };
    const unit = unitText[config.unit] || config.unit;
    const value = config.value || 1;
    return `${t("scheduled.every") || "每"} ${value} ${unit}`;
  } else {
    const frequencyText: Record<string, string> = {
      daily: t("scheduled.frequencyDaily") || "每天",
      weekly: t("scheduled.frequencyWeekly") || "每周",
      monthly: t("scheduled.frequencyMonthly") || "每月",
      once: t("scheduled.frequencyOnce") || "单次",
    };
    let result = frequencyText[config.frequency] || config.frequency || "每天";
    if (config.frequency === "weekly" && config.day_of_week?.length) {
      const dayNames = config.day_of_week.map((d: number) => {
        const dayKey = `scheduled.day${d}`;
        const translated = t(dayKey);
        return translated === dayKey
          ? [
              t("scheduled.sunShort") || "日",
              t("scheduled.monShort") || "一",
              t("scheduled.tueShort") || "二",
              t("scheduled.wedShort") || "三",
              t("scheduled.thuShort") || "四",
              t("scheduled.friShort") || "五",
              t("scheduled.satShort") || "六",
            ][d]
          : translated;
      });
      result += ` ${dayNames.join(",")}`;
    }
    if (config.frequency === "monthly" && config.day_of_month?.length) {
      result += ` ${config.day_of_month.join(",")}${t("scheduled.dayUnit") || "日"}`;
    }
    if (config.time) {
      result += ` ${config.time}`;
    }
    return result;
  }
};

const getActionPreview = (
  task: ScheduledTask,
  t: (key: string, params?: any) => string,
): string => {
  if (task.action_type === "naturallanguage") {
    const content = (task as any).natural_language_content || "";
    return content.length > 60 ? content.substring(0, 60) + "..." : content;
  } else {
    return t("scheduled.skillFile") || "SKILL.md 文件";
  }
};

const TaskCardList: React.FC<TaskCardListProps> = ({
  t,
  tasks,
  selectedTaskId,
  onSelectTask,
  onToggleTask,
  onDeleteTask,
  onCompleteTask,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreateNew,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateColumns = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const cardMinWidth = 280;
        const calculatedColumns = Math.max(1, Math.floor(width / cardMinWidth));
        setColumns(calculatedColumns);
      }
    };
    calculateColumns();
    window.addEventListener("resize", calculateColumns);
    const resizeObserver = new ResizeObserver(calculateColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener("resize", calculateColumns);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showFilterPopup &&
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
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

  const filterOptions = [
    {
      key: "all" as const,
      label: t("scheduled.all") || "全部",
      icon: <ListIcon />,
      color: "#818cf8",
    },
    {
      key: "enabled" as const,
      label: t("scheduled.enabled") || "启用",
      icon: <PlayIcon />,
      color: "#10b981",
    },
    {
      key: "disabled" as const,
      label: t("scheduled.disabled") || "禁用",
      icon: <PauseIcon />,
      color: "#6b7280",
    },
    {
      key: "completed" as const,
      label: t("scheduled.completed") || "完成",
      icon: <CheckIcon />,
      color: "#8b5cf6",
    },
  ];

  const getCurrentFilterLabel = () => {
    const current = filterOptions.find((opt) => opt.key === statusFilter);
    return current ? current.label : t("scheduled.all") || "全部";
  };

  const getCurrentFilterIcon = () => {
    const current = filterOptions.find((opt) => opt.key === statusFilter);
    return current ? current.icon : <ListIcon />;
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-primary)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: "200px",
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: "10px",
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
              padding: "8px 30px 8px 32px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none",
            }}
            placeholder={
              t("scheduled.searchPlaceholder") || "按名称或描述搜索..."
            }
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              style={{
                position: "absolute",
                right: "8px",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "12px",
                padding: "2px 4px",
                display: "flex",
                alignItems: "center",
              }}
              onClick={() => onSearchChange("")}
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
              gap: "6px",
              padding: "6px 12px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              color: "var(--text-secondary)",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={() => setShowFilterPopup(!showFilterPopup)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--bg-tertiary)")
            }
          >
            <span
              style={{
                fontSize: "12px",
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
              ref={popupRef}
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                minWidth: "140px",
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
                    padding: "8px 12px",
                    background:
                      statusFilter === option.key
                        ? "var(--accent-glow)"
                        : "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                  }}
                  onClick={() => {
                    onStatusFilterChange(option.key);
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
                      fontSize: "14px",
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
                        fontSize: "12px",
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

        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 16px",
            background: "var(--accent-color)",
            border: "none",
            borderRadius: "6px",
            color: "white",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
          onClick={onCreateNew}
        >
          <PlusIcon />
          <span>{t("scheduled.addTask") || "新建任务"}</span>
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
        ref={containerRef}
      >
        {tasks.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: "300px",
              textAlign: "center",
              padding: "40px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                opacity: 0.5,
                marginBottom: "16px",
                color: "var(--text-muted)",
              }}
            >
              <EmptyListIcon />
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              {t("scheduled.noTasks") || "暂无定时任务"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {t("scheduled.clickCreateHint") || "点击上方按钮创建新任务"}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: "12px",
              padding: "12px",
            }}
          >
            {tasks.map((task) => {
              const { scheduleType, config } = fromScheduleConfig(
                task.schedule_config,
              );
              const scheduleDisplay = getScheduleDisplay(
                scheduleType,
                config,
                t,
              );
              const actionPreview = getActionPreview(task, t);

              return (
                <div
                  key={task.id}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border:
                      selectedTaskId === task.id
                        ? "1px solid var(--accent-color)"
                        : "1px solid var(--border-color)",
                    opacity: task.completed ? 0.7 : 1,
                  }}
                  onClick={() => onSelectTask(task)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          flexShrink: 0,
                          color: "var(--text-muted)",
                        }}
                      >
                        <ClockIcon />
                      </span>
                      <span
                        title={task.name}
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.name}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      {task.completed && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background: "#8b5cf6",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                          }}
                        >
                          <CheckIcon />
                          {t("scheduled.completed") || "已完成"}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background:
                            task.enabled && !task.completed
                              ? "#10b981"
                              : "#6b7280",
                          color: "white",
                        }}
                      >
                        {task.enabled && !task.completed
                          ? t("scheduled.enabled") || "启用"
                          : t("scheduled.disabled") || "禁用"}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      fontSize: "11px",
                    }}
                  >
                    <span
                      style={{
                        width: "20px",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <ClockIcon />
                    </span>
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {scheduleDisplay}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      fontSize: "11px",
                    }}
                  >
                    <span
                      style={{
                        width: "20px",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {task.action_type === "naturallanguage" ? (
                        <MessageSquareIcon />
                      ) : (
                        <FileIcon />
                      )}
                    </span>
                    <span
                      title={actionPreview}
                      style={{
                        color: "var(--text-secondary)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {actionPreview}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "10px",
                        color: "var(--text-muted)",
                      }}
                    >
                      <PlayIcon />
                      <span>
                        {task.execution_count || 0}{" "}
                        {t("scheduled.executions") || "次"}
                      </span>
                    </span>
                    {task.last_executed_at && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "10px",
                          color: "var(--text-muted)",
                        }}
                      >
                        <CalendarIcon />
                        <span>
                          {new Date(task.last_executed_at).toLocaleDateString()}
                        </span>
                      </span>
                    )}
                  </div>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      gap: "8px",
                      justifyContent: "flex-end",
                      paddingTop: "8px",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    {!task.completed && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTask(task.id, !task.enabled);
                          }}
                          title={
                            task.enabled
                              ? t("scheduled.disable") || "禁用"
                              : t("scheduled.enable") || "启用"
                          }
                          style={{
                            background: "none",
                            border: "none",
                            fontSize: "12px",
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            transition: "all 0.2s",
                            color: "#10b981",
                            display: "flex",
                            alignItems: "center",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(16, 185, 129, 0.15)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                        >
                          {task.enabled ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompleteTask(task.id);
                          }}
                          title={t("scheduled.complete") || "完成"}
                          style={{
                            background: "none",
                            border: "none",
                            fontSize: "12px",
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            transition: "all 0.2s",
                            color: "#8b5cf6",
                            display: "flex",
                            alignItems: "center",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(139, 92, 246, 0.15)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                        >
                          <CheckIcon />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          // eslint-disable-next-line no-restricted-globals
                          confirm(
                            t("scheduled.confirmDelete") ||
                              "确定删除此任务吗？",
                          )
                        ) {
                          onDeleteTask(task.id);
                        }
                      }}
                      title={t("scheduled.delete") || "删除"}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "12px",
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        transition: "all 0.2s",
                        color: "#ef4444",
                        display: "flex",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(239, 68, 68, 0.15)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "none")
                      }
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCardList;
