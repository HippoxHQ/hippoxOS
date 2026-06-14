import React, { useState, useEffect, useRef } from "react";
import {
  scheduledTasksCommands,
  CreateScheduledTaskRequest,
  UpdateScheduledTaskRequest,
  ScheduleType,
  ActionType,
  Frequency,
  IntervalUnit,
  FixedScheduleConfig,
  IntervalScheduleConfig,
  toScheduleConfig,
  fromScheduleConfig,
} from "../../command/scheduledtasks";
import { ScheduledTask } from "./types";
import { showToast, ToastType } from "../Toast";

interface TaskEditPanelProps {
  t: (key: string, params?: any) => string;
  task: ScheduledTask | null;
  isCreating?: boolean;
  onTaskCreated: (task: ScheduledTask) => void;
  onTaskUpdated: (task: ScheduledTask) => void;
  onTaskDeleted: (taskId: string) => void;
  onClose: () => void;
}

const DEFAULT_WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];

const TaskEditPanel: React.FC<TaskEditPanelProps> = ({
  t,
  task,
  isCreating = false,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("fixed");
  const [actionType, setActionType] = useState<ActionType>("naturallanguage");
  const [naturalLanguage, setNaturalLanguage] = useState("");
  const [skillContent, setSkillContent] = useState("");
  const [skillFileName, setSkillFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fixedFrequency, setFixedFrequency] = useState<Frequency>("daily");
  const [fixedTime, setFixedTime] = useState("09:00");
  const [fixedWeekDays, setFixedWeekDays] = useState<number[]>([1]);
  const [fixedMonthDays, setFixedMonthDays] = useState<number[]>([1]);
  const [fixedDate, setFixedDate] = useState("");

  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("hour");
  const [intervalValue, setIntervalValue] = useState(1);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const getWeekDayNames = (): string[] => {
    const weekNames = t("scheduled.weekDayNames");
    if (Array.isArray(weekNames) && weekNames.length === 7) {
      return weekNames;
    }
    return [
      t("scheduled.sun") || "日",
      t("scheduled.mon") || "一",
      t("scheduled.tue") || "二",
      t("scheduled.wed") || "三",
      t("scheduled.thu") || "四",
      t("scheduled.fri") || "五",
      t("scheduled.sat") || "六",
    ];
  };

  const weekDayNames = getWeekDayNames();

  useEffect(() => {
    if (task) {
      loadTaskData();
    } else if (isCreating) {
      resetForm();
    }
  }, [task, isCreating]);

  const loadTaskData = async () => {
    if (!task) return;

    setName(task.name);
    setScheduleType(task.schedule_type);
    setActionType(task.action_type);

    if (task.action_type === "naturallanguage") {
      const content = await scheduledTasksCommands.getNaturalLanguage(task.id);
      setNaturalLanguage(content || "");
      setSkillContent("");
      setSkillFileName("");
    } else {
      const content = await scheduledTasksCommands.getSkillMd(task.id);
      setSkillContent(content || "");
      setSkillFileName("SKILL.md");
      setNaturalLanguage("");
    }

    const { scheduleType: st, config } = fromScheduleConfig(
      task.schedule_config,
    );
    if (st === "fixed") {
      const fixedConfig = config as FixedScheduleConfig;
      setFixedFrequency(fixedConfig.frequency);
      setFixedTime(fixedConfig.time);
      setFixedWeekDays(fixedConfig.day_of_week || [1]);
      setFixedMonthDays(fixedConfig.day_of_month || [1]);
      setFixedDate(fixedConfig.date || "");
    } else {
      const intervalConfig = config as IntervalScheduleConfig;
      setIntervalUnit(intervalConfig.unit);
      setIntervalValue(intervalConfig.value);
    }
  };

  const resetForm = () => {
    setName("");
    setScheduleType("fixed");
    setActionType("naturallanguage");
    setNaturalLanguage("");
    setSkillContent("");
    setSkillFileName("");
    setFixedFrequency("daily");
    setFixedTime("09:00");
    setFixedWeekDays([1]);
    setFixedMonthDays([1]);
    setFixedDate("");
    setIntervalUnit("hour");
    setIntervalValue(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getCurrentScheduleConfig = () => {
    if (scheduleType === "fixed") {
      return {
        frequency: fixedFrequency,
        time: fixedTime,
        day_of_week: fixedFrequency === "weekly" ? fixedWeekDays : undefined,
        day_of_month: fixedFrequency === "monthly" ? fixedMonthDays : undefined,
        date: fixedFrequency === "once" ? fixedDate : undefined,
      };
    } else {
      return {
        unit: intervalUnit,
        value: intervalValue,
      };
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      showToast(
        ToastType.WARNING,
        t("scheduled.taskNameRequired") || "请输入任务名称",
      );
      return false;
    }

    if (actionType === "naturallanguage") {
      if (!naturalLanguage.trim()) {
        showToast(
          ToastType.WARNING,
          t("scheduled.taskDescriptionRequired") || "请输入任务描述",
        );
        return false;
      }
    } else {
      if (!skillContent) {
        showToast(
          ToastType.WARNING,
          t("scheduled.skillFileRequired") || "请上传 SKILL.md 文件",
        );
        return false;
      }
    }

    if (scheduleType === "fixed") {
      if (!fixedTime) {
        showToast(
          ToastType.WARNING,
          t("scheduled.timeRequired") || "请选择执行时间",
        );
        return false;
      }
      if (fixedFrequency === "once" && !fixedDate) {
        showToast(
          ToastType.WARNING,
          t("scheduled.dateRequired") || "请选择执行日期",
        );
        return false;
      }
    } else {
      if (intervalValue < 1) {
        showToast(
          ToastType.WARNING,
          t("scheduled.intervalValueInvalid") || "间隔值必须大于0",
        );
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const scheduleConfigRaw = getCurrentScheduleConfig();
    const scheduleConfig = toScheduleConfig(scheduleType, scheduleConfigRaw);
    setIsSaving(true);
    try {
      if (task) {
        const request: UpdateScheduledTaskRequest = {
          id: task.id,
          name: name.trim(),
          schedule_type: scheduleType,
          schedule_config: scheduleConfig,
          enabled: task.enabled,
          action_type: actionType,
          natural_language_content:
            actionType === "naturallanguage" ? naturalLanguage : undefined,
          skill_md_content:
            actionType === "skillfile" ? skillContent : undefined,
        };
        const response = await scheduledTasksCommands.update(request);
        onTaskUpdated(response.task);
        showToast(
          ToastType.SUCCESS,
          t("scheduled.updateSuccess") || "更新成功",
        );
      } else {
        const request: CreateScheduledTaskRequest = {
          name: name.trim(),
          schedule_type: scheduleType,
          schedule_config: scheduleConfig,
          enabled: true,
          action_type: actionType,
          natural_language_content:
            actionType === "naturallanguage" ? naturalLanguage : undefined,
          skill_md_content:
            actionType === "skillfile" ? skillContent : undefined,
        };
        const response = await scheduledTasksCommands.create(request);
        onTaskCreated(response.task);
        showToast(ToastType.SUCCESS, t("scheduled.addSuccess") || "创建成功");
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save task:", error);
      showToast(ToastType.ERROR, t("scheduled.saveFailed") || "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(t("scheduled.confirmDelete") || "确定删除此任务吗？")) return;
    setIsDeleting(true);
    try {
      await scheduledTasksCommands.delete(task.id);
      onTaskDeleted(task.id);
      showToast(ToastType.SUCCESS, t("scheduled.deleteSuccess") || "删除成功");
    } catch (error) {
      console.error("Failed to delete task:", error);
      showToast(ToastType.ERROR, t("scheduled.deleteFailed") || "删除失败");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async () => {
    if (!task) return;
    setIsToggling(true);
    try {
      const updatedTask = await scheduledTasksCommands.toggle(
        task.id,
        !task.enabled,
      );
      onTaskUpdated(updatedTask);
      showToast(
        ToastType.SUCCESS,
        updatedTask.enabled
          ? t("scheduled.enabledSuccess") || "已启用"
          : t("scheduled.disabledSuccess") || "已禁用",
      );
    } catch (error) {
      console.error("Failed to toggle task:", error);
      showToast(ToastType.ERROR, t("scheduled.toggleFailed") || "操作失败");
    } finally {
      setIsToggling(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md") && !file.name.endsWith(".skill.md")) {
      showToast(
        ToastType.ERROR,
        t("scheduled.invalidFile") || "请上传 .md 或 .skill.md 文件",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSkillContent(content);
      setSkillFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleRemoveSkillFile = () => {
    setSkillContent("");
    setSkillFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleWeekDay = (day: number) => {
    if (fixedWeekDays.includes(day)) {
      setFixedWeekDays(fixedWeekDays.filter((d) => d !== day));
    } else {
      setFixedWeekDays([...fixedWeekDays, day].sort());
    }
  };
  const toggleMonthDay = (day: number) => {
    if (fixedMonthDays.includes(day)) {
      setFixedMonthDays(fixedMonthDays.filter((d) => d !== day));
    } else {
      setFixedMonthDays([...fixedMonthDays, day].sort());
    }
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "6px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box" as const,
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "80px",
    resize: "vertical" as const,
    fontFamily: "inherit",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  const radioLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "13px",
    color: "var(--text-primary)",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 16px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "var(--accent-color)",
    color: "white",
    border: "none",
  };

  const deleteButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: "#ef4444",
    borderColor: "#ef4444",
  };

  const toggleButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
    border: "1px solid #10b981",
  };
  if (!task && !isCreating && !isSaving) {
    return (
      <div
        style={{
          flexShrink: 0,
          background: "var(--bg-secondary)",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid var(--border-color)",
          height: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center",
            padding: "40px",
          }}
        >
          <div style={{ fontSize: "48px", opacity: 0.5, marginBottom: "16px" }}>
            ✏️
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              marginBottom: "8px",
            }}
          >
            {t("scheduled.selectTaskToEdit") || "选择一个任务进行编辑"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {t("scheduled.clickTaskHint") || "点击左侧任务卡片开始编辑"}
          </div>
        </div>
      </div>
    );
  }
  const isEditMode = !!task;
  return (
    <div
      style={{
        width: "380px",
        flexShrink: 0,
        background: "var(--bg-secondary)",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--border-color)",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "16px" }}>✏️</span>
        <span
          style={{
            flex: 1,
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {isEditMode
            ? t("scheduled.editTask") || "编辑任务"
            : t("scheduled.addTask") || "新建任务"}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "16px",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-tertiary)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "16px",
          minHeight: 0,
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>
            {t("scheduled.taskName") || "任务名称"}{" "}
            <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("scheduled.taskNamePlaceholder") || "例如：每日备份"}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>
            {t("scheduled.taskType") || "任务类型"}
          </label>
          <div style={{ display: "flex", gap: "20px" }}>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                checked={scheduleType === "fixed"}
                onChange={() => setScheduleType("fixed")}
              />
              <span>{t("scheduled.typeFixed") || "定时执行"}</span>
            </label>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                checked={scheduleType === "interval"}
                onChange={() => setScheduleType("interval")}
              />
              <span>{t("scheduled.typeInterval") || "间隔执行"}</span>
            </label>
          </div>
        </div>

        {scheduleType === "fixed" && (
          <>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>
                {t("scheduled.frequency") || "执行频率"}
              </label>
              <select
                style={selectStyle}
                value={fixedFrequency}
                onChange={(e) => setFixedFrequency(e.target.value as Frequency)}
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

            {fixedFrequency === "weekly" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>
                  {t("scheduled.weekDays") || "选择星期"}
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {weekDayNames.map((day: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        width: "36px",
                        height: "32px",
                        background: fixedWeekDays.includes(idx)
                          ? "var(--accent-color)"
                          : "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        color: fixedWeekDays.includes(idx)
                          ? "white"
                          : "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                      onClick={() => toggleWeekDay(idx)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fixedFrequency === "monthly" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>
                  {t("scheduled.monthDays") || "选择日期"}
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                    maxHeight: "120px",
                    overflowY: "auto",
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <button
                      key={day}
                      type="button"
                      style={{
                        width: "36px",
                        height: "32px",
                        background: fixedMonthDays.includes(day)
                          ? "var(--accent-color)"
                          : "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        color: fixedMonthDays.includes(day)
                          ? "white"
                          : "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                      onClick={() => toggleMonthDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fixedFrequency === "once" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>
                  {t("scheduled.date") || "执行日期"}
                </label>
                <input
                  type="date"
                  style={inputStyle}
                  value={fixedDate}
                  onChange={(e) => setFixedDate(e.target.value)}
                />
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>
                {t("scheduled.time") || "执行时间"}
              </label>
              <input
                type="time"
                style={{ ...inputStyle, maxWidth: "150px" }}
                value={fixedTime}
                onChange={(e) => setFixedTime(e.target.value)}
              />
            </div>
          </>
        )}

        {scheduleType === "interval" && (
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                {t("scheduled.intervalValue") || "间隔数值"}
              </label>
              <input
                type="number"
                style={inputStyle}
                value={intervalValue}
                onChange={(e) =>
                  setIntervalValue(Math.max(1, parseInt(e.target.value) || 1))
                }
                min={1}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                {t("scheduled.intervalUnit") || "间隔单位"}
              </label>
              <select
                style={selectStyle}
                value={intervalUnit}
                onChange={(e) =>
                  setIntervalUnit(e.target.value as IntervalUnit)
                }
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
                <option value="day">{t("scheduled.unitDay") || "天"}</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>
            {t("scheduled.actionType") || "动作类型"}
          </label>
          <div style={{ display: "flex", gap: "20px" }}>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                checked={actionType === "naturallanguage"}
                onChange={() => setActionType("naturallanguage")}
              />
              <span>{t("scheduled.typeNatural") || "自然语言"}</span>
            </label>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                checked={actionType === "skillfile"}
                onChange={() => setActionType("skillfile")}
              />
              <span>{t("scheduled.typeSkillFile") || "SKILL.md 文件"}</span>
            </label>
          </div>
        </div>

        {actionType === "naturallanguage" && (
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>
              {t("scheduled.taskDescription") || "任务描述"}
            </label>
            <textarea
              style={textareaStyle}
              value={naturalLanguage}
              onChange={(e) => setNaturalLanguage(e.target.value)}
              placeholder={
                t("scheduled.naturalLanguagePlaceholder") ||
                "例如：每天凌晨2点备份数据库到 /backup 目录"
              }
              rows={4}
            />
          </div>
        )}

        {actionType === "skillfile" && (
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>
              {t("scheduled.skillFile") || "SKILL.md 文件"}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.skill.md"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            {!skillContent ? (
              <button
                type="button"
                style={primaryButtonStyle}
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
                    background: "var(--bg-tertiary)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                  }}
                >
                  📄 {skillFileName}
                </span>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("scheduled.replaceFile") || "替换"}
                </button>
                <button
                  type="button"
                  style={deleteButtonStyle}
                  onClick={handleRemoveSkillFile}
                >
                  {t("scheduled.remove") || "移除"}
                </button>
              </div>
            )}
          </div>
        )}

        {isEditMode && task && task.last_executed_at && (
          <div
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "12px",
              }}
            >
              <span>📜</span>
              <span>{t("scheduled.executionHistory") || "执行历史"}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--bg-tertiary)",
                borderRadius: "6px",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                {new Date(task.last_executed_at).toLocaleString()}
              </span>
              <span
                style={{
                  color: task.last_status === "failed" ? "#ef4444" : "#10b981",
                }}
              >
                {task.last_status === "failed" ? "❌" : "✅"}{" "}
                {task.last_status || "success"}
              </span>
            </div>
            <div
              style={{
                marginTop: "8px",
                fontSize: "11px",
                color: "var(--text-muted)",
                textAlign: "right",
              }}
            >
              <span>
                {t("scheduled.executeCount") || "执行次数"}:{" "}
                {task.execution_count || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        {isEditMode && (
          <>
            <button
              style={toggleButtonStyle}
              onClick={handleToggle}
              disabled={isToggling}
            >
              {task?.enabled
                ? "⏸️ " + (t("scheduled.disable") || "禁用")
                : "▶️ " + (t("scheduled.enable") || "启用")}
            </button>
            <button
              style={deleteButtonStyle}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              🗑️ {t("scheduled.delete") || "删除"}
            </button>
          </>
        )}
        <button
          style={primaryButtonStyle}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving
            ? "💾 " + (t("common.saving") || "保存中...")
            : "💾 " + (t("settings.save") || "保存")}
        </button>
      </div>
    </div>
  );
};

export default TaskEditPanel;
