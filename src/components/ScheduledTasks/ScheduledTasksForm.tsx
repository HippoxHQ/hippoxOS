import React, { useState, useRef } from "react";
import {
  ScheduledTask,
  FixedScheduleConfig,
  IntervalScheduleConfig,
} from "./types";
import { showToast, ToastType } from "../Toast";

const FolderOpenIcon = () => (
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
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const FileIcon = () => (
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
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);

const TrashIcon = () => (
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
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const SaveIcon = () => (
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
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const XIcon = () => (
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlayIcon = () => (
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
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseIcon = () => (
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
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const HistoryIcon = () => (
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

interface ScheduledTasksFormProps {
  t: (key: string, params?: any) => string;
  task: ScheduledTask | null;
  isEditing: boolean;
  onSave: (data: {
    name: string;
    schedule_type: "fixed" | "interval";
    schedule_config: any;
    action_type: "naturallanguage" | "skillfile";
    natural_language_content?: string;
    skill_md_content?: string;
  }) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onToggle?: (taskId: string, enabled: boolean) => Promise<void>;
  onClose: () => void;
}

const ScheduledTasksForm: React.FC<ScheduledTasksFormProps> = ({
  t,
  task,
  isEditing,
  onSave,
  onDelete,
  onToggle,
  onClose,
}) => {
  const [name, setName] = useState(task?.name || "");
  const [scheduleType, setScheduleType] = useState<"fixed" | "interval">(
    task?.schedule_type || "fixed",
  );
  const [actionType, setActionType] = useState<"naturallanguage" | "skillfile">(
    task?.action_type || "naturallanguage",
  );
  const [naturalLanguage, setNaturalLanguage] = useState("");
  const [skillContent, setSkillContent] = useState("");
  const [skillFileName, setSkillFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fixed schedule state
  const [fixedFrequency, setFixedFrequency] = useState<
    "daily" | "weekly" | "monthly" | "once"
  >(
    (task?.schedule_config.type === "fixed"
      ? task.schedule_config.config.frequency
      : "daily") as any,
  );
  const [fixedTime, setFixedTime] = useState(
    (task?.schedule_config.type === "fixed"
      ? task.schedule_config.config.time
      : "09:00") || "09:00",
  );
  const [fixedWeekDays, setFixedWeekDays] = useState<number[]>(
    (task?.schedule_config.type === "fixed"
      ? task.schedule_config.config.day_of_week
      : [1]) || [1],
  );
  const [fixedMonthDays, setFixedMonthDays] = useState<number[]>(
    (task?.schedule_config.type === "fixed"
      ? task.schedule_config.config.day_of_month
      : [1]) || [1],
  );
  const [fixedDate, setFixedDate] = useState(
    (task?.schedule_config.type === "fixed"
      ? task.schedule_config.config.date
      : "") || "",
  );

  // Interval schedule state
  const [intervalUnit, setIntervalUnit] = useState<
    "second" | "minute" | "hour" | "day"
  >(
    (task?.schedule_config.type === "interval"
      ? task.schedule_config.config.unit
      : "hour") as any,
  );
  const [intervalValue, setIntervalValue] = useState(
    (task?.schedule_config.type === "interval"
      ? task.schedule_config.config.value
      : 1) || 1,
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const getWeekDayNames = (): string[] => {
    const weekNames = t("scheduled.weekDayNames");
    if (Array.isArray(weekNames) && weekNames.length === 7) {
      return weekNames;
    }
    return [
      t("scheduled.sun") || "周日",
      t("scheduled.mon") || "周一",
      t("scheduled.tue") || "周二",
      t("scheduled.wed") || "周三",
      t("scheduled.thu") || "周四",
      t("scheduled.fri") || "周五",
      t("scheduled.sat") || "周六",
    ];
  };

  const weekDayNames = getWeekDayNames();

  const getScheduleConfig = () => {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setSkillContent(event.target?.result as string);
      setSkillFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast(
        ToastType.WARNING,
        t("scheduled.taskNameRequired") || "请输入任务名称",
      );
      return;
    }

    if (actionType === "naturallanguage") {
      if (!naturalLanguage.trim()) {
        showToast(
          ToastType.WARNING,
          t("scheduled.taskDescriptionRequired") || "请输入任务描述",
        );
        return;
      }
    } else {
      if (!skillContent) {
        showToast(
          ToastType.WARNING,
          t("scheduled.skillFileRequired") || "请上传 SKILL.md 文件",
        );
        return;
      }
    }

    if (scheduleType === "fixed") {
      if (!fixedTime) {
        showToast(
          ToastType.WARNING,
          t("scheduled.timeRequired") || "请选择执行时间",
        );
        return;
      }
      if (fixedFrequency === "once" && !fixedDate) {
        showToast(
          ToastType.WARNING,
          t("scheduled.dateRequired") || "请选择执行日期",
        );
        return;
      }
    } else {
      if (intervalValue < 1) {
        showToast(
          ToastType.WARNING,
          t("scheduled.intervalValueInvalid") || "间隔值必须大于0",
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        schedule_type: scheduleType,
        schedule_config: {
          type: scheduleType,
          config: getScheduleConfig(),
        },
        action_type: actionType,
        natural_language_content:
          actionType === "naturallanguage" ? naturalLanguage : undefined,
        skill_md_content: actionType === "skillfile" ? skillContent : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!task || !onToggle) return;
    setIsToggling(true);
    try {
      await onToggle(task.id, !task.enabled);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    // eslint-disable-next-line no-restricted-globals
    if (confirm(t("scheduled.confirmDelete") || "确定删除此任务吗？")) {
      await onDelete(task.id);
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
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "6px",
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "80px",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const radioLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "13px",
    color: "var(--text-primary)",
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "600px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
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

      <div style={{ marginBottom: "20px" }}>
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
            {t("scheduled.typeFixed") || "定时执行"}
          </label>
          <label style={radioLabelStyle}>
            <input
              type="radio"
              checked={scheduleType === "interval"}
              onChange={() => setScheduleType("interval")}
            />
            {t("scheduled.typeInterval") || "间隔执行"}
          </label>
        </div>
      </div>

      {scheduleType === "fixed" && (
        <>
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              {t("scheduled.frequency") || "执行频率"}
            </label>
            <select
              style={inputStyle}
              value={fixedFrequency}
              onChange={(e) => setFixedFrequency(e.target.value as any)}
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
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>
                {t("scheduled.weekDays") || "选择星期"}
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {weekDayNames.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleWeekDay(idx)}
                    style={{
                      padding: "6px 12px",
                      background: fixedWeekDays.includes(idx)
                        ? "var(--accent-color)"
                        : "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "20px",
                      color: fixedWeekDays.includes(idx)
                        ? "white"
                        : "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {fixedFrequency === "monthly" && (
            <div style={{ marginBottom: "20px" }}>
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
                    onClick={() => toggleMonthDay(day)}
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
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {fixedFrequency === "once" && (
            <div style={{ marginBottom: "20px" }}>
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

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              {t("scheduled.time") || "执行时间"}
            </label>
            <input
              type="time"
              style={{ ...inputStyle, maxWidth: "200px" }}
              value={fixedTime}
              onChange={(e) => setFixedTime(e.target.value)}
            />
          </div>
        </>
      )}

      {scheduleType === "interval" && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
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
              style={inputStyle}
              value={intervalUnit}
              onChange={(e) => setIntervalUnit(e.target.value as any)}
            >
              <option value="second">
                {t("scheduled.unitSecond") || "秒"}
              </option>
              <option value="minute">
                {t("scheduled.unitMinute") || "分钟"}
              </option>
              <option value="hour">{t("scheduled.unitHour") || "小时"}</option>
              <option value="day">{t("scheduled.unitDay") || "天"}</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
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
            {t("scheduled.typeNatural") || "自然语言"}
          </label>
          <label style={radioLabelStyle}>
            <input
              type="radio"
              checked={actionType === "skillfile"}
              onChange={() => setActionType("skillfile")}
            />
            {t("scheduled.typeSkillFile") || "SKILL.md 文件"}
          </label>
        </div>
      </div>

      {actionType === "naturallanguage" && (
        <div style={{ marginBottom: "20px" }}>
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
            rows={3}
          />
        </div>
      )}

      {actionType === "skillfile" && (
        <div style={{ marginBottom: "20px" }}>
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
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "10px 16px",
                background: "var(--accent-color)",
                border: "none",
                borderRadius: "8px",
                color: "white",
                cursor: "pointer",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FolderOpenIcon />
              {t("scheduled.selectFile") || "选择文件"}
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
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <FileIcon />
                {skillFileName}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "6px 12px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                {t("scheduled.replaceFile") || "替换"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSkillContent("");
                  setSkillFileName("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                style={{
                  padding: "6px 12px",
                  background: "transparent",
                  border: "1px solid #ef4444",
                  borderRadius: "6px",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <TrashIcon />
                {t("scheduled.remove") || "移除"}
              </button>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          marginTop: "24px",
        }}
      >
        {isEditing && onToggle && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            style={{
              padding: "10px 20px",
              background: task?.enabled
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(16, 185, 129, 0.1)",
              border: `1px solid ${task?.enabled ? "#ef4444" : "#10b981"}`,
              borderRadius: "8px",
              color: task?.enabled ? "#ef4444" : "#10b981",
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {task?.enabled ? <PauseIcon /> : <PlayIcon />}
            {task?.enabled
              ? t("scheduled.disable") || "禁用"
              : t("scheduled.enable") || "启用"}
          </button>
        )}
        {isEditing && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <TrashIcon />
            {t("scheduled.delete") || "删除"}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 20px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <XIcon />
          {t("settings.cancel") || "取消"}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          style={{
            padding: "10px 24px",
            background: "var(--accent-color)",
            border: "none",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <SaveIcon />
          {isSaving
            ? t("common.saving") || "保存中..."
            : t("settings.save") || "保存"}
        </button>
      </div>
    </div>
  );
};

export default ScheduledTasksForm;
