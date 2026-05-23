import React, { useState, useEffect } from "react";

interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  enabled: boolean;
  action: string;
}

interface ScheduledTasksPanelProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
  isInitializing?: boolean;
}

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
  const [newTaskCron, setNewTaskCron] = useState("");
  const [newTaskAction, setNewTaskAction] = useState("");
  const TASK_PRESETS = [
    {
      key: "dailyBackup",
      name: "每日备份",
      cron: "0 2 * * *",
      action: "backup",
    },
    {
      key: "weeklyReport",
      name: "每周报告",
      cron: "0 9 * * 1",
      action: "generate_report",
    },
    {
      key: "monthlyCleanup",
      name: "每月清理",
      cron: "0 3 1 * *",
      action: "cleanup",
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const savedTasks = localStorage.getItem("scheduled_tasks");
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      } else {
        const presetTasks: ScheduledTask[] = TASK_PRESETS.map(
          (preset, index) => ({
            id: `task_${index + 1}`,
            name: preset.name,
            cron: preset.cron,
            enabled: true,
            action: preset.action,
          }),
        );
        setTasks(presetTasks);
      }
      if (onSave) {
        onSave({ action: "load", tasks });
      }
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
    setLoading(false);
  };

  const saveTasks = async (newTasks: ScheduledTask[]) => {
    try {
      localStorage.setItem("scheduled_tasks", JSON.stringify(newTasks));
      setTasks(newTasks);
      if (onSave) {
        onSave({ action: "save", tasks: newTasks });
      }
    } catch (error) {
      console.error("Failed to save tasks:", error);
    }
  };

  const handleToggleEnabled = async (taskId: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, enabled: !task.enabled } : task,
    );
    await saveTasks(updatedTasks);
  };

  const handleEditTask = (task: ScheduledTask) => {
    setEditingTaskId(task.id);
    setNewTaskName(task.name);
    setNewTaskCron(task.cron);
    setNewTaskAction(task.action);
    setShowAddForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (tasks.length <= 1) {
      return;
    }
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    await saveTasks(updatedTasks);
    if (onSave) {
      onSave({ action: "delete", taskId });
    }
  };

  const handleAddOrUpdateTask = async () => {
    if (!newTaskName.trim() || !newTaskCron.trim() || !newTaskAction.trim()) {
      return;
    }
    if (editingTaskId) {
      const updatedTasks = tasks.map((task) =>
        task.id === editingTaskId
          ? {
              ...task,
              name: newTaskName,
              cron: newTaskCron,
              action: newTaskAction,
            }
          : task,
      );
      await saveTasks(updatedTasks);
      if (onSave) {
        onSave({
          action: "update",
          taskId: editingTaskId,
          task: { name: newTaskName, cron: newTaskCron, action: newTaskAction },
        });
      }
    } else {
      const newTask: ScheduledTask = {
        id: `task_${Date.now()}`,
        name: newTaskName,
        cron: newTaskCron,
        enabled: true,
        action: newTaskAction,
      };
      const updatedTasks = [...tasks, newTask];
      await saveTasks(updatedTasks);
      if (onSave) {
        onSave({ action: "add", task: newTask });
      }
    }
    setShowAddForm(false);
    setEditingTaskId(null);
    setNewTaskName("");
    setNewTaskCron("");
    setNewTaskAction("");
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingTaskId(null);
    setNewTaskName("");
    setNewTaskCron("");
    setNewTaskAction("");
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
        {tasks.map((task) => (
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
                style={task.enabled ? enabledBadgeStyle : disabledBadgeStyle}
              >
                {task.enabled
                  ? t("scheduled.enabled") || "启用"
                  : t("scheduled.disabled") || "禁用"}
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
                {t("scheduled.cron") || "Cron 表达式"}
              </label>
              <input
                type="text"
                style={inputStyle}
                value={task.cron}
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
                value={task.action}
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
                  ...buttonStyle,
                  fontSize: "11px",
                  padding: "4px 10px",
                }}
                onClick={() => handleEditTask(task)}
              >
                {t("scheduled.edit") || "编辑"}
              </button>
              {tasks.length > 1 && (
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
              )}
            </div>
          </div>
        ))}
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
                {t("scheduled.cron") || "Cron 表达式"}
              </label>
              <input
                type="text"
                style={inputStyle}
                value={newTaskCron}
                onChange={(e) => setNewTaskCron(e.target.value)}
                placeholder="0 2 * * *"
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
              <select
                style={selectStyle}
                value={newTaskAction}
                onChange={(e) => setNewTaskAction(e.target.value)}
              >
                <option value="">
                  {t("scheduled.selectAction") || "选择动作"}
                </option>
                <option value="backup">
                  {t("scheduled.actionBackup") || "备份"}
                </option>
                <option value="generate_report">
                  {t("scheduled.actionReport") || "生成报告"}
                </option>
                <option value="cleanup">
                  {t("scheduled.actionCleanup") || "清理"}
                </option>
                <option value="sync">
                  {t("scheduled.actionSync") || "同步"}
                </option>
              </select>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
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
