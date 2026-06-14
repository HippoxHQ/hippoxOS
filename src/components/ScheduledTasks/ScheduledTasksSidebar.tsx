import React from "react";
import { ScheduledTask } from "./types";

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
  t: (key: string, params?: any) => string
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
    return `每 ${config.config.value} ${unit}`;
  } else {
    const freqText: Record<string, string> = {
      daily: t("scheduled.frequencyDaily") || "每天",
      weekly: t("scheduled.frequencyWeekly") || "每周",
      monthly: t("scheduled.frequencyMonthly") || "每月",
      once: t("scheduled.frequencyOnce") || "单次",
    };
    let text = freqText[config.config.frequency] || config.config.frequency;
    if (config.config.frequency === "weekly" && config.config.day_of_week?.length) {
      text += ` ${config.config.day_of_week.join(",")}`;
    }
    if (config.config.frequency === "monthly" && config.config.day_of_month?.length) {
      text += ` ${config.config.day_of_month.join(",")}日`;
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
        <div className="stats-title">📊 {t("scheduled.statistics") || "统计"}</div>
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
            <div className="stat-label">{t("scheduled.completed") || "已完成"}</div>
          </div>
          <div className={`stat-card ${stats.failed > 0 ? "stat-warning" : ""}`}>
            <div className="stat-number">{stats.failed}</div>
            <div className="stat-label">{t("scheduled.failed") || "失败"}</div>
          </div>
        </div>
      </div>

      <div className="task-list-section">
        <div className="task-list-header">
          <span className="task-list-title">
            📋 {t("scheduled.taskList") || "任务列表"}
          </span>
          <button className="add-task-btn" onClick={onCreateNew}>
            + {t("scheduled.add") || "新建"}
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div className="empty-icon">🕐</div>
            <div className="empty-text">{t("scheduled.noTasks") || "暂无定时任务"}</div>
            <div className="empty-hint">{t("scheduled.clickAdd") || "点击上方按钮添加"}</div>
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
                <span className={`task-status-badge ${task.enabled ? "task-status-enabled" : "task-status-disabled"}`}>
                  {task.enabled ? (t("scheduled.enabled") || "启用") : (t("scheduled.disabled") || "禁用")}
                </span>
              </div>
              <div className="task-item-schedule">
                {getScheduleDisplay(task, t)}
              </div>
              <div className="task-item-action">
                {task.action_type === "naturallanguage" ? "💬 自然语言" : "📄 SKILL.md"}
              </div>
              <div className="task-item-footer">
                <span>执行 {task.execution_count} 次</span>
                {task.last_executed_at && (
                  <span className="task-item-badge">
                    最近: {new Date(task.last_executed_at).toLocaleDateString()}
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