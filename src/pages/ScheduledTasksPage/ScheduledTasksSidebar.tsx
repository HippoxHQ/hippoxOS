import React from "react";
import { ScheduledTask } from "../../command/scheduledtasks";

const BarChartIcon = () => (
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
    <path d="M12 20V10" />
    <path d="M18 20V4" />
    <path d="M6 20v-4" />
  </svg>
);

const ListIcon = () => (
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
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const PlusIcon = () => (
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

interface ScheduledTasksSidebarProps {
  t: (key: string, params?: any) => string;
  tasks: ScheduledTask[];
  selectedTaskId: string | null;
  onSelectTask: (task: ScheduledTask) => void;
  onCreateNew: () => void;
  stats: { total: number; enabled: number; completed: number; failed: number };
}

const getScheduleDisplay = (
  task: ScheduledTask,
  t: (key: string, params?: any) => string,
): string => {
  const config = task.schedule_config;
  if (config.type === "interval") {
    const unitText: Record<string, string> = {
      second: t("scheduled.unitSecond") || "s",
      minute: t("scheduled.unitMinute") || "min",
      hour: t("scheduled.unitHour") || "h",
      day: t("scheduled.unitDay") || "d",
    };
    const unit = unitText[config.config.unit] || config.config.unit;
    return `${t("scheduled.every") || "每"} ${config.config.value} ${unit}`;
  } else {
    const freqText: Record<string, string> = {
      daily: t("scheduled.frequencyDaily") || "每天",
      weekly: t("scheduled.frequencyWeekly") || "每周",
      monthly: t("scheduled.frequencyMonthly") || "每月",
      once: t("scheduled.frequencyOnce") || "单次",
    };
    let text = freqText[config.config.frequency] || config.config.frequency;
    if (
      config.config.frequency === "weekly" &&
      config.config.day_of_week?.length
    ) {
      text += ` ${config.config.day_of_week.join(",")}`;
    }
    if (
      config.config.frequency === "monthly" &&
      config.config.day_of_month?.length
    ) {
      text += ` ${config.config.day_of_month.join(",")}${t("scheduled.dayUnit") || "日"}`;
    }
    if (config.config.time) {
      text += ` ${config.config.time}`;
    }
    return text;
  }
};

const ScheduledTasksSidebar: React.FC<ScheduledTasksSidebarProps> = ({
  t,
  tasks,
  selectedTaskId,
  onSelectTask,
  onCreateNew,
  stats,
}) => {
  return (
    <div className="scheduled-sidebar">
      <div className="stats-section">
        <div
          className="stats-title"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <BarChartIcon />
          {t("scheduled.statistics") || "统计"}
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">{t("scheduled.total") || "总数"}</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.enabled}</div>
            <div className="stat-label">{t("scheduled.enabled") || "启用"}</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.completed}</div>
            <div className="stat-label">
              {t("scheduled.completed") || "已完成"}
            </div>
          </div>
          <div
            className={`stat-card ${stats.failed > 0 ? "stat-warning" : ""}`}
          >
            <div className="stat-number">{stats.failed}</div>
            <div className="stat-label">{t("scheduled.failed") || "失败"}</div>
          </div>
        </div>
      </div>

      <div className="task-list-section">
        <div className="task-list-header">
          <span
            className="task-list-title"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <ListIcon />
            {t("scheduled.taskList") || "任务列表"}
          </span>
          <button
            className="add-task-btn"
            onClick={onCreateNew}
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            <PlusIcon />
            {t("scheduled.add") || "新建"}
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div
              className="empty-icon"
              style={{ fontSize: "48px", opacity: 0.5, marginBottom: "16px" }}
            >
              <ClockIcon />
            </div>
            <div className="empty-text">
              {t("scheduled.noTasks") || "暂无定时任务"}
            </div>
            <div className="empty-hint">
              {t("scheduled.clickAdd") || "点击上方按钮添加"}
            </div>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`task-list-item ${selectedTaskId === task.id ? "active" : ""}`}
              onClick={() => onSelectTask(task)}
            >
              <div className="task-item-header">
                <span className="task-item-name" title={task.name}>
                  {task.name}
                </span>
                <span
                  className={`task-status-badge ${task.enabled ? "task-status-enabled" : "task-status-disabled"}`}
                >
                  {task.enabled
                    ? t("scheduled.enabled") || "启用"
                    : t("scheduled.disabled") || "禁用"}
                </span>
              </div>
              <div className="task-item-schedule">
                {getScheduleDisplay(task, t)}
              </div>
              <div
                className="task-item-action"
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                {task.action_type === "naturallanguage" ? (
                  <>
                    <MessageSquareIcon />
                    {t("scheduled.naturalLanguage") || "自然语言"}
                  </>
                ) : (
                  <>
                    <FileIcon />
                    {t("scheduled.skillFileLabel") || "SKILL.md"}
                  </>
                )}
              </div>
              <div className="task-item-footer">
                <span>
                  {t("scheduled.execute") || "执行"} {task.execution_count}{" "}
                  {t("scheduled.times") || "次"}
                </span>
                {task.last_executed_at && (
                  <span className="task-item-badge">
                    {t("scheduled.recent") || "最近"}:{" "}
                    {new Date(task.last_executed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ScheduledTasksSidebar;
