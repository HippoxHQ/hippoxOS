import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ScheduledTask {
  id: string;
  name: string;
  scheduleType: "fixed" | "interval";
  scheduleConfig: FixedScheduleConfig | IntervalScheduleConfig;
  enabled: boolean;
  actionType: "naturalLanguage" | "skillFile";
  actionContent: string;
  actionFileName?: string;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  completed?: boolean;
}

interface FixedScheduleConfig {
  frequency: "daily" | "weekly" | "monthly" | "once";
  time: string;
  dayOfWeek?: number[];
  dayOfMonth?: number[];
  date?: string;
}

interface IntervalScheduleConfig {
  unit: "second" | "minute" | "hour" | "day";
  value: number;
}

interface TaskQueuePanelProps {
  t: (key: string, params?: any) => string;
}

const TaskQueuePanel: React.FC<TaskQueuePanelProps> = ({ t }) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      const tasksListJson = await invoke<string>("scheduled_list");
      const tasksList = JSON.parse(tasksListJson);
      const convertedTasks: ScheduledTask[] = tasksList.map((task: any) => ({
        id: task.id,
        name: task.name,
        scheduleType: task.schedule_type,
        scheduleConfig: task.schedule_config,
        enabled: task.enabled,
        actionType: task.action_type,
        actionContent: task.action_content,
        actionFileName: task.action_file_name,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        lastExecutedAt: task.last_executed_at,
        completed: task.completed,
      }));
      setTasks(convertedTasks);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScheduleDisplay = (task: ScheduledTask): string => {
    if (task.scheduleType === "interval") {
      const config = task.scheduleConfig as IntervalScheduleConfig;
      const unitText: Record<string, string> = {
        second: t("scheduled.unitSecond") || "秒",
        minute: t("scheduled.unitMinute") || "分钟",
        hour: t("scheduled.unitHour") || "小时",
        day: t("scheduled.unitDay") || "天",
      };
      const unit = unitText[config.unit] || config.unit;
      return `每 ${config.value} ${unit}`;
    } else {
      const config = task.scheduleConfig as FixedScheduleConfig;
      const frequencyText: Record<string, string> = {
        daily: t("scheduled.frequencyDaily") || "每天",
        weekly: t("scheduled.frequencyWeekly") || "每周",
        monthly: t("scheduled.frequencyMonthly") || "每月",
        once: t("scheduled.frequencyOnce") || "单次",
      };
      let result = frequencyText[config.frequency] || "每天";
      if (config.time) {
        result += ` ${config.time}`;
      }
      return result;
    }
  };

  const getActionDisplay = (task: ScheduledTask): string => {
    if (task.actionType === "naturalLanguage") {
      const preview =
        task.actionContent.length > 40
          ? task.actionContent.substring(0, 40) + "..."
          : task.actionContent;
      return `💬 ${preview}`;
    } else {
      return `📄 ${task.actionFileName || "SKILL.md"}`;
    }
  };

  const getStatusText = (task: ScheduledTask): string => {
    if (task.completed) {
      return t("taskQueue.completed") || "已完成";
    }
    if (task.enabled) {
      return t("taskQueue.waiting") || "等待执行";
    }
    return t("taskQueue.disabled") || "已禁用";
  };

  const getStatusColor = (task: ScheduledTask): string => {
    if (task.completed) {
      return "#10b981";
    }
    if (task.enabled) {
      return "#f59e0b";
    }
    return "#6b7280";
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    header: {
      padding: "10px",
      borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
    },
    scrollContainer: {
      flex: 1,
      overflowY: "auto" as const,
      padding: "10px",
    },
    taskCard: {
      background: "var(--bg-secondary)",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "12px",
      border: "1px solid var(--border-color)",
    },
    taskHeader: {
      display: "flex",
      alignItems: "center",
      marginBottom: "12px",
      flexWrap: "wrap",
      gap: "8px",
    },
    taskName: {
      fontSize: "16px",
      fontWeight: 600,
      color: "var(--text-primary)",
    },
    statusBadge: {
      fontSize: "10px",
      padding: "2px 8px",
      borderRadius: "12px",
      color: "white",
    },
    tag: {
      background: "var(--bg-tertiary)",
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      color: "var(--text-secondary)",
    },
    taskMeta: {
      display: "flex",
      gap: "12px",
      marginBottom: "8px",
      fontSize: "11px",
      color: "var(--text-muted)",
    },
    taskDescription: {
      fontSize: "13px",
      color: "var(--text-secondary)",
      marginBottom: "12px",
      lineHeight: 1.4,
    },
    loadingState: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "200px",
      color: "var(--text-muted)",
    },
    emptyState: {
      textAlign: "center",
      padding: "60px 20px",
      color: "var(--text-muted)",
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          {t("atomicSkills.loading") || "加载中..."}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.scrollContainer}>
        {tasks.length === 0 ? (
          <div style={styles.emptyState}>
            {t("taskQueue.noTasks") || "暂无任务"}
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} style={styles.taskCard}>
              <div style={styles.taskHeader}>
                <span style={styles.taskName}>🕐 {task.name}</span>
                <span
                  style={{
                    ...styles.statusBadge,
                    background: getStatusColor(task),
                  }}
                >
                  {getStatusText(task)}
                </span>
                <span style={styles.tag}>
                  {task.scheduleType === "fixed"
                    ? t("scheduled.typeFixed") || "定时"
                    : t("scheduled.typeInterval") || "间隔"}
                </span>
                <span style={styles.tag}>
                  {task.actionType === "naturalLanguage"
                    ? t("scheduled.typeNatural") || "自然语言"
                    : t("scheduled.typeSkillFile") || "SKILL文件"}
                </span>
              </div>
              <div style={styles.taskMeta}>
                <span>⏰ {getScheduleDisplay(task)}</span>
              </div>
              <div style={styles.taskDescription}>{getActionDisplay(task)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskQueuePanel;
