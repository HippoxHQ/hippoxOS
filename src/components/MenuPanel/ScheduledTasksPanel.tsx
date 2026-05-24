import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getDataPaths } from "../../api/paths";

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

interface ScheduledTasksPanelProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
  isInitializing?: boolean;
}

const configToCron = (
  scheduleType: "fixed" | "interval",
  config: FixedScheduleConfig | IntervalScheduleConfig | undefined,
): string => {
  if (!config) {
    return "0 0 * * *";
  }
  if (scheduleType === "interval") {
    const intervalConfig = config as IntervalScheduleConfig;
    if (!intervalConfig.unit || !intervalConfig.value) {
      return "0 */1 * * *";
    }
    switch (intervalConfig.unit) {
      case "second":
        return `*/${intervalConfig.value} * * * * *`;
      case "minute":
        return `*/${intervalConfig.value} * * * *`;
      case "hour":
        return `0 */${intervalConfig.value} * * *`;
      case "day":
        return `0 0 */${intervalConfig.value} * *`;
      default:
        return "0 0 * * *";
    }
  } else {
    const fixedConfig = config as FixedScheduleConfig;
    if (!fixedConfig.time) {
      return "0 0 * * *";
    }
    const [hour, minute] = fixedConfig.time.split(":").map(Number);
    if (isNaN(hour) || isNaN(minute)) {
      return "0 0 * * *";
    }
    switch (fixedConfig.frequency) {
      case "daily":
        return `${minute} ${hour} * * *`;
      case "weekly":
        const days = fixedConfig.dayOfWeek?.length
          ? fixedConfig.dayOfWeek.join(",")
          : "1";
        return `${minute} ${hour} * * ${days}`;
      case "monthly":
        const daysOfMonth = fixedConfig.dayOfMonth?.length
          ? fixedConfig.dayOfMonth.join(",")
          : "1";
        return `${minute} ${hour} ${daysOfMonth} * *`;
      case "once":
        if (fixedConfig.date) {
          const [year, month, day] = fixedConfig.date.split("-").map(Number);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return `${minute} ${hour} ${day} ${month} *`;
          }
        }
        return `${minute} ${hour} * * *`;
      default:
        return `${minute} ${hour} * * *`;
    }
  }
};

const getScheduleDisplay = (
  scheduleType: "fixed" | "interval",
  config: FixedScheduleConfig | IntervalScheduleConfig | undefined,
  t: (key: string, params?: any) => string,
): string => {
  if (!config) {
    return t("scheduled.unknownSchedule") || "未知调度";
  }
  if (scheduleType === "interval") {
    const intervalConfig = config as IntervalScheduleConfig;
    const unitText: Record<string, string> = {
      second: t("scheduled.unitSecond") || "秒",
      minute: t("scheduled.unitMinute") || "分钟",
      hour: t("scheduled.unitHour") || "小时",
      day: t("scheduled.unitDay") || "天",
    };
    const unit = unitText[intervalConfig.unit] || intervalConfig.unit;
    const value = intervalConfig.value || 1;
    return (
      t("scheduled.intervalDisplay")
        ?.replace("{value}", String(value))
        .replace("{unit}", unit) || `每 ${value} ${unit}`
    );
  } else {
    const fixedConfig = config as FixedScheduleConfig;
    const frequencyText: Record<string, string> = {
      daily: t("scheduled.frequencyDaily") || "每天",
      weekly: t("scheduled.frequencyWeekly") || "每周",
      monthly: t("scheduled.frequencyMonthly") || "每月",
      once: t("scheduled.frequencyOnce") || "单次",
    };
    let result =
      frequencyText[fixedConfig.frequency] || fixedConfig.frequency || "每天";
    if (fixedConfig.frequency === "weekly" && fixedConfig.dayOfWeek?.length) {
      const dayNames = fixedConfig.dayOfWeek.map(
        (d) => t(`scheduled.day${d}`) || String(d),
      );
      result += ` ${dayNames.join("、")}`;
    }
    if (fixedConfig.frequency === "monthly" && fixedConfig.dayOfMonth?.length) {
      result += ` ${fixedConfig.dayOfMonth.join("、")}号`;
    }
    if (fixedConfig.frequency === "once" && fixedConfig.date) {
      result += ` ${fixedConfig.date}`;
    }
    if (fixedConfig.time) {
      result += ` ${fixedConfig.time}`;
    }
    return result;
  }
};

const getActionDisplay = (
  actionType: "naturalLanguage" | "skillFile",
  actionContent: string,
  actionFileName?: string,
  t?: (key: string, params?: any) => string,
): string => {
  if (actionType === "naturalLanguage") {
    const preview =
      actionContent.length > 50
        ? actionContent.substring(0, 50) + "..."
        : actionContent;
    return `💬 ${preview}`;
  } else {
    return `📄 ${actionFileName || "SKILL.md"}`;
  }
};

const ScheduledTasksPanel: React.FC<ScheduledTasksPanelProps> = ({
  t,
  onSave,
  isInitializing = false,
}) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newScheduleType, setNewScheduleType] = useState<"fixed" | "interval">(
    "fixed",
  );
  const [newActionType, setNewActionType] = useState<
    "naturalLanguage" | "skillFile"
  >("naturalLanguage");
  const [newNaturalLanguage, setNewNaturalLanguage] = useState("");
  const [newSkillFile, setNewSkillFile] = useState<File | null>(null);
  const [newSkillContent, setNewSkillContent] = useState("");
  const [newSkillFileName, setNewSkillFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFixedFrequency, setNewFixedFrequency] = useState<
    "daily" | "weekly" | "monthly" | "once"
  >("daily");
  const [newFixedTime, setNewFixedTime] = useState("09:00");
  const [newFixedWeekDays, setNewFixedWeekDays] = useState<number[]>([1]);
  const [newFixedMonthDays, setNewFixedMonthDays] = useState<number[]>([1]);
  const [newFixedDate, setNewFixedDate] = useState("");
  const [newIntervalUnit, setNewIntervalUnit] = useState<
    "second" | "minute" | "hour" | "day"
  >("hour");
  const [newIntervalValue, setNewIntervalValue] = useState(1);
  const [scheduledTasksDir, setScheduledTasksDir] = useState<string>("");

  useEffect(() => {
    loadScheduledTasksDir();
    loadData();
  }, []);

  const loadScheduledTasksDir = async () => {
    try {
      const paths = await getDataPaths();
      setScheduledTasksDir(paths.scheduled_tasks_dir);
    } catch (error) {
      console.error("Failed to load scheduled tasks dir:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const savedTasks = await loadTasksFromFiles();
      const activeTasks = savedTasks.filter((task) => !task.completed);
      setTasks(activeTasks);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      setTasks([]);
    }
    setLoading(false);
  };

  const loadTasksFromFiles = async (): Promise<ScheduledTask[]> => {
    try {
      const tasksListJson = await invoke<string>("scheduled_list");
      const tasksList = JSON.parse(tasksListJson);
      return tasksList.map((task: any) => ({
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
    } catch (error) {
      console.error("Failed to load tasks from files:", error);
      return [];
    }
  };

  const saveTaskToFile = async (task: ScheduledTask): Promise<void> => {
    try {
      const rustTask = {
        id: task.id,
        name: task.name,
        schedule_type: task.scheduleType,
        schedule_config: task.scheduleConfig,
        enabled: task.enabled,
        action_type: task.actionType,
        action_content: task.actionContent,
        action_file_name: task.actionFileName,
        created_at: task.createdAt,
        updated_at: task.updatedAt,
        last_executed_at: task.lastExecutedAt,
        completed: task.completed,
      };
      await invoke("scheduled_save", { taskJson: JSON.stringify(rustTask) });
    } catch (error) {
      console.error("Failed to save task to file:", error);
      throw error;
    }
  };

  const deleteTaskFile = async (taskId: string): Promise<void> => {
    try {
      await invoke("scheduled_delete", { taskId });
    } catch (error) {
      console.error("Failed to delete task file:", error);
      throw error;
    }
  };

  const handleToggleEnabled = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updatedTask = {
      ...task,
      enabled: !task.enabled,
      updatedAt: new Date().toISOString(),
    };
    await saveTaskToFile(updatedTask);
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? updatedTask : task,
    );
    setTasks(updatedTasks);
  };

  const handleEditTask = (task: ScheduledTask) => {
    setEditingTaskId(task.id);
    setNewTaskName(task.name);
    setNewScheduleType(task.scheduleType);
    setNewActionType(task.actionType);
    if (task.actionType === "naturalLanguage") {
      setNewNaturalLanguage(task.actionContent);
      setNewSkillFile(null);
      setNewSkillContent("");
      setNewSkillFileName("");
    } else {
      setNewNaturalLanguage("");
      setNewSkillContent(task.actionContent);
      setNewSkillFileName(task.actionFileName || "SKILL.md");
      setNewSkillFile(null);
    }
    if (task.scheduleType === "fixed") {
      const config = task.scheduleConfig as FixedScheduleConfig;
      setNewFixedFrequency(config.frequency || "daily");
      setNewFixedTime(config.time || "09:00");
      setNewFixedWeekDays(config.dayOfWeek || [1]);
      setNewFixedMonthDays(config.dayOfMonth || [1]);
      setNewFixedDate(config.date || "");
    } else {
      const config = task.scheduleConfig as IntervalScheduleConfig;
      setNewIntervalUnit(config.unit || "hour");
      setNewIntervalValue(config.value || 1);
    }
    setShowAddForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTaskFile(taskId);
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);
    if (onSave) {
      onSave({ action: "delete", taskId });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const completedTask = {
      ...task,
      completed: true,
      lastExecutedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveTaskToFile(completedTask);
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md") && !file.name.endsWith(".skill.md")) {
      alert(
        t("scheduled.invalidSkillFile") || "请上传 .md 或 .skill.md 格式的文件",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNewSkillContent(content);
      setNewSkillFileName(file.name);
      setNewSkillFile(file);
    };
    reader.readAsText(file);
  };

  const handleRemoveSkillFile = () => {
    setNewSkillFile(null);
    setNewSkillContent("");
    setNewSkillFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getCurrentScheduleConfig = ():
    | FixedScheduleConfig
    | IntervalScheduleConfig => {
    if (newScheduleType === "fixed") {
      return {
        frequency: newFixedFrequency,
        time: newFixedTime,
        dayOfWeek:
          newFixedFrequency === "weekly" ? newFixedWeekDays : undefined,
        dayOfMonth:
          newFixedFrequency === "monthly" ? newFixedMonthDays : undefined,
        date: newFixedFrequency === "once" ? newFixedDate : undefined,
      };
    } else {
      return {
        unit: newIntervalUnit,
        value: newIntervalValue,
      };
    }
  };

  const handleAddOrUpdateTask = async () => {
    if (!newTaskName.trim()) {
      alert(t("scheduled.taskNameRequired") || "请输入任务名称");
      return;
    }
    let actionContent = "";
    let actionFileName = "";
    if (newActionType === "naturalLanguage") {
      if (!newNaturalLanguage.trim()) {
        alert(t("scheduled.naturalLanguageRequired") || "请描述任务内容");
        return;
      }
      actionContent = newNaturalLanguage;
    } else {
      if (!newSkillContent) {
        alert(t("scheduled.skillFileRequired") || "请上传 SKILL.md 文件");
        return;
      }
      actionContent = newSkillContent;
      actionFileName = newSkillFileName;
    }
    const scheduleConfig = getCurrentScheduleConfig();
    if (newScheduleType === "fixed") {
      if (!newFixedTime) return;
      if (newFixedFrequency === "once" && !newFixedDate) {
        alert(t("scheduled.dateRequired") || "请选择执行日期");
        return;
      }
    } else {
      if (newIntervalValue < 1) return;
    }
    const now = new Date().toISOString();
    if (editingTaskId) {
      const updatedTask: ScheduledTask = {
        id: editingTaskId,
        name: newTaskName,
        scheduleType: newScheduleType,
        scheduleConfig: scheduleConfig,
        enabled: true,
        actionType: newActionType,
        actionContent: actionContent,
        actionFileName: actionFileName || undefined,
        createdAt: tasks.find((t) => t.id === editingTaskId)?.createdAt || now,
        updatedAt: now,
      };
      await saveTaskToFile(updatedTask);
      const updatedTasks = tasks.map((task) =>
        task.id === editingTaskId ? updatedTask : task,
      );
      setTasks(updatedTasks);
      if (onSave) {
        onSave({
          action: "update",
          taskId: editingTaskId,
          task: updatedTask,
        });
      }
    } else {
      const newTask: ScheduledTask = {
        id: `task_${Date.now()}`,
        name: newTaskName,
        scheduleType: newScheduleType,
        scheduleConfig: scheduleConfig,
        enabled: true,
        actionType: newActionType,
        actionContent: actionContent,
        actionFileName: actionFileName || undefined,
        createdAt: now,
        updatedAt: now,
        completed: false,
      };
      await saveTaskToFile(newTask);
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      if (onSave) {
        onSave({ action: "add", task: newTask });
      }
    }
    resetForm();
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingTaskId(null);
    setNewTaskName("");
    setNewScheduleType("fixed");
    setNewActionType("naturalLanguage");
    setNewNaturalLanguage("");
    setNewSkillFile(null);
    setNewSkillContent("");
    setNewSkillFileName("");
    setNewFixedFrequency("daily");
    setNewFixedTime("09:00");
    setNewFixedWeekDays([1]);
    setNewFixedMonthDays([1]);
    setNewFixedDate("");
    setNewIntervalUnit("hour");
    setNewIntervalValue(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const toggleWeekDay = (day: number) => {
    if (newFixedWeekDays.includes(day)) {
      setNewFixedWeekDays(newFixedWeekDays.filter((d) => d !== day));
    } else {
      setNewFixedWeekDays([...newFixedWeekDays, day].sort());
    }
  };

  const toggleMonthDay = (day: number) => {
    if (newFixedMonthDays.includes(day)) {
      setNewFixedMonthDays(newFixedMonthDays.filter((d) => d !== day));
    } else {
      setNewFixedMonthDays([...newFixedMonthDays, day].sort());
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "80px",
    flexShrink: 0,
    userSelect: "none",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "80px",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 16px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  const addButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "var(--accent-color, #0066cc)",
    color: "white",
    border: "none",
  };

  const deleteButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: "var(--error-color, #dc2626)",
    borderColor: "var(--error-color, #dc2626)",
  };

  const completeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: "var(--accent-color, #0066cc)",
    borderColor: "var(--accent-color, #0066cc)",
  };

  const taskCardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "12px",
    border: "1px solid var(--border-color)",
  };

  const badgeStyle: React.CSSProperties = {
    background: "var(--accent-color, #0066cc)",
    color: "white",
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "12px",
    marginLeft: "8px",
  };

  const enabledBadgeStyle: React.CSSProperties = {
    ...badgeStyle,
    background: "#10b981",
  };

  const disabledBadgeStyle: React.CSSProperties = {
    ...badgeStyle,
    background: "#6b7280",
  };

  const tagStyle: React.CSSProperties = {
    background: "var(--bg-tertiary)",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    color: "var(--text-secondary)",
  };

  if (loading || isInitializing) {
    return (
      <div
        className="settings-container"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {t("atomicSkills.loading") || "加载中..."}
      </div>
    );
  }

  return (
    <div
      className="settings-container"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        margin: 0,
        gap: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 10px",
          margin: 0,
          paddingTop: "10px",
          paddingBottom: "10px",
        }}
      >
        {tasks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            {t("scheduled.noTasks") || "暂无定时任务，点击下方按钮添加"}
          </div>
        ) : (
          tasks.map((task) => {
            const scheduleDisplay = getScheduleDisplay(
              task.scheduleType,
              task.scheduleConfig,
              t,
            );
            const actionDisplay = getActionDisplay(
              task.actionType,
              task.actionContent,
              task.actionFileName,
              t,
            );
            return (
              <div key={task.id} style={taskCardStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    🕐 {task.name}
                  </span>
                  <span
                    style={
                      task.enabled ? enabledBadgeStyle : disabledBadgeStyle
                    }
                  >
                    {task.enabled
                      ? t("scheduled.enabled") || "启用"
                      : t("scheduled.disabled") || "禁用"}
                  </span>
                  <span style={tagStyle}>
                    {task.scheduleType === "fixed"
                      ? t("scheduled.typeFixed") || "定时"
                      : t("scheduled.typeInterval") || "间隔"}
                  </span>
                  <span style={tagStyle}>
                    {task.actionType === "naturalLanguage"
                      ? t("scheduled.typeNatural") || "自然语言"
                      : t("scheduled.typeSkillFile") || "SKILL文件"}
                  </span>
                </div>
                <div
                  className="settings-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>
                    {t("scheduled.schedule") || "执行时间"}
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={scheduleDisplay}
                    disabled
                    readOnly
                  />
                </div>
                <div
                  className="settings-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>
                    {t("scheduled.action") || "执行动作"}
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={actionDisplay}
                    disabled
                    readOnly
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "flex-end",
                    marginTop: "8px",
                  }}
                >
                  <button
                    style={{
                      ...buttonStyle,
                      fontSize: "11px",
                      padding: "4px 10px",
                    }}
                    onClick={() => handleToggleEnabled(task.id)}
                  >
                    {task.enabled
                      ? t("scheduled.disable") || "禁用"
                      : t("scheduled.enable") || "启用"}
                  </button>
                  <button
                    style={{
                      ...completeButtonStyle,
                      fontSize: "11px",
                      padding: "4px 10px",
                    }}
                    onClick={() => handleCompleteTask(task.id)}
                  >
                    {t("scheduled.complete") || "标记完成"}
                  </button>
                  <button
                    style={{
                      ...buttonStyle,
                      fontSize: "11px",
                      padding: "4px 10px",
                    }}
                    onClick={() => handleEditTask(task)}
                  >
                    {t("scheduled.edit") || "编辑"}
                  </button>
                  <button
                    style={{
                      ...deleteButtonStyle,
                      fontSize: "11px",
                      padding: "4px 10px",
                    }}
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    {t("scheduled.delete") || "删除"}
                  </button>
                </div>
              </div>
            );
          })
        )}

        {showAddForm ? (
          <div style={taskCardStyle}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "12px",
              }}
            >
              {editingTaskId
                ? t("scheduled.editTask") || "编辑任务"
                : t("scheduled.addTask") || "添加定时任务"}
            </div>
            <div
              className="settings-row"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>
                {t("scheduled.taskName") || "任务名称"}
              </label>
              <input
                type="text"
                style={inputStyle}
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder={
                  t("scheduled.taskNamePlaceholder") || "例如：每日备份"
                }
              />
            </div>
            <div
              className="settings-row"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>
                {t("scheduled.taskType") || "任务类型"}
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="scheduleType"
                    value="fixed"
                    checked={newScheduleType === "fixed"}
                    onChange={() => setNewScheduleType("fixed")}
                  />
                  {t("scheduled.typeFixed") || "定时执行"}
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="scheduleType"
                    value="interval"
                    checked={newScheduleType === "interval"}
                    onChange={() => setNewScheduleType("interval")}
                  />
                  {t("scheduled.typeInterval") || "间隔执行"}
                </label>
              </div>
            </div>
            {newScheduleType === "fixed" && (
              <>
                <div
                  className="settings-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>
                    {t("scheduled.frequency") || "执行频率"}
                  </label>
                  <select
                    style={selectStyle}
                    value={newFixedFrequency}
                    onChange={(e) =>
                      setNewFixedFrequency(e.target.value as any)
                    }
                  >
                    <option value="daily">
                      {t("scheduled.frequencyDaily") || "每天"}
                    </option>
                    <option value="weekly">
                      {t("scheduled.frequencyWeekly") || "每周"}
                    </option>
                    <option value="monthly">
                      {t("scheduled.frequencyMonthly") || "每月"}
                    </option>
                    <option value="once">
                      {t("scheduled.frequencyOnce") || "单次"}
                    </option>
                  </select>
                </div>

                {newFixedFrequency === "weekly" && (
                  <div
                    className="settings-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={labelStyle}>
                      {t("scheduled.weekDays") || "选择星期"}
                    </label>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <button
                          key={day}
                          type="button"
                          style={{
                            ...buttonStyle,
                            background: newFixedWeekDays.includes(day)
                              ? "var(--accent-color, #0066cc)"
                              : "var(--bg-tertiary)",
                            color: newFixedWeekDays.includes(day)
                              ? "white"
                              : "var(--text-secondary)",
                            border: "none",
                            padding: "4px 10px",
                          }}
                          onClick={() => toggleWeekDay(day)}
                        >
                          {t(`scheduled.day${day}`) ||
                            [
                              "周日",
                              "周一",
                              "周二",
                              "周三",
                              "周四",
                              "周五",
                              "周六",
                            ][day]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {newFixedFrequency === "monthly" && (
                  <div
                    className="settings-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={labelStyle}>
                      {t("scheduled.monthDays") || "选择日期"}
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        maxHeight: "100px",
                        overflowY: "auto",
                      }}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(
                        (day) => (
                          <button
                            key={day}
                            type="button"
                            style={{
                              ...buttonStyle,
                              background: newFixedMonthDays.includes(day)
                                ? "var(--accent-color, #0066cc)"
                                : "var(--bg-tertiary)",
                              color: newFixedMonthDays.includes(day)
                                ? "white"
                                : "var(--text-secondary)",
                              border: "none",
                              padding: "4px 8px",
                              fontSize: "11px",
                            }}
                            onClick={() => toggleMonthDay(day)}
                          >
                            {day}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {newFixedFrequency === "once" && (
                  <div
                    className="settings-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={labelStyle}>
                      {t("scheduled.date") || "执行日期"}
                    </label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newFixedDate}
                      onChange={(e) => setNewFixedDate(e.target.value)}
                    />
                  </div>
                )}

                <div
                  className="settings-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>
                    {t("scheduled.time") || "执行时间"}
                  </label>
                  <input
                    type="time"
                    style={{ ...inputStyle, maxWidth: "150px" }}
                    value={newFixedTime}
                    onChange={(e) => setNewFixedTime(e.target.value)}
                  />
                </div>
              </>
            )}

            {newScheduleType === "interval" && (
              <>
                <div
                  className="settings-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>
                    {t("scheduled.intervalValue") || "间隔数值"}
                  </label>
                  <input
                    type="number"
                    style={{ ...inputStyle, maxWidth: "100px" }}
                    value={newIntervalValue}
                    onChange={(e) =>
                      setNewIntervalValue(
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                    min={1}
                  />
                </div>
                <div
                  className="settings-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>
                    {t("scheduled.intervalUnit") || "间隔单位"}
                  </label>
                  <select
                    style={{ ...selectStyle, maxWidth: "120px" }}
                    value={newIntervalUnit}
                    onChange={(e) => setNewIntervalUnit(e.target.value as any)}
                  >
                    <option value="second">
                      {t("scheduled.unitSecond") || "秒"}
                    </option>
                    <option value="minute">
                      {t("scheduled.unitMinute") || "分钟"}
                    </option>
                    <option value="hour">
                      {t("scheduled.unitHour") || "小时"}
                    </option>
                    <option value="day">
                      {t("scheduled.unitDay") || "天"}
                    </option>
                  </select>
                </div>
              </>
            )}

            <div
              className="settings-row"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>
                {t("scheduled.actionType") || "动作类型"}
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="actionType"
                    value="naturalLanguage"
                    checked={newActionType === "naturalLanguage"}
                    onChange={() => setNewActionType("naturalLanguage")}
                  />
                  {t("scheduled.typeNatural") || "自然语言描述"}
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="actionType"
                    value="skillFile"
                    checked={newActionType === "skillFile"}
                    onChange={() => setNewActionType("skillFile")}
                  />
                  {t("scheduled.typeSkillFile") || "上传 SKILL.md"}
                </label>
              </div>
            </div>

            {newActionType === "naturalLanguage" && (
              <div
                className="settings-row"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={{ ...labelStyle, paddingTop: "8px" }}>
                  {t("scheduled.taskDescription") || "任务描述"}
                </label>
                <textarea
                  style={textareaStyle}
                  value={newNaturalLanguage}
                  onChange={(e) => setNewNaturalLanguage(e.target.value)}
                  placeholder={
                    t("scheduled.naturalLanguagePlaceholder") ||
                    "例如：每天凌晨2点备份数据库到 /backup 目录"
                  }
                  rows={3}
                />
              </div>
            )}

            {newActionType === "skillFile" && (
              <div
                className="settings-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>
                  {t("scheduled.skillFile") || "SKILL.md 文件"}
                </label>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.skill.md"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                  {!newSkillContent ? (
                    <button
                      type="button"
                      style={{
                        ...buttonStyle,
                        background: "var(--accent-color, #0066cc)",
                        color: "white",
                        border: "none",
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📁 {t("scheduled.selectFile") || "选择文件"}
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          color: "var(--text-primary)",
                        }}
                      >
                        📄 {newSkillFileName}
                      </span>
                      <button
                        type="button"
                        style={{
                          ...buttonStyle,
                          fontSize: "11px",
                          padding: "4px 8px",
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t("scheduled.replaceFile") || "替换"}
                      </button>
                      <button
                        type="button"
                        style={{
                          ...deleteButtonStyle,
                          fontSize: "11px",
                          padding: "4px 8px",
                        }}
                        onClick={handleRemoveSkillFile}
                      >
                        {t("scheduled.remove") || "移除"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
                marginTop: "8px",
              }}
            >
              <button style={buttonStyle} onClick={handleCancelEdit}>
                {t("settings.cancel") || "取消"}
              </button>
              <button style={addButtonStyle} onClick={handleAddOrUpdateTask}>
                {editingTaskId
                  ? t("settings.update") || "更新"
                  : t("settings.add") || "添加"}
              </button>
            </div>
          </div>
        ) : (
          <button
            style={{ ...addButtonStyle, width: "100%" }}
            onClick={() => setShowAddForm(true)}
          >
            + {t("scheduled.addTask") || "添加定时任务"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ScheduledTasksPanel;
