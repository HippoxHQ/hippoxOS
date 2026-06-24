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
  ScheduledTask,
} from "../../command/scheduledtasks";
import { showDialog, DialogType } from "../../components/Dialog";
import { showToast, ToastType } from "../../components/Toast";
import { workflowCommands } from "../../command/workflow";
import { showTooltip } from "../../components/Tooltip";

const EditIcon = () => (
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
    <path d="M17 3l4 4-7 7H10v-4l7-7z" />
    <path d="M4 20h16" />
  </svg>
);

const XIcon = () => (
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SaveIcon = () => (
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
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
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

const FolderOpenIcon = () => (
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
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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

const HistoryIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckCircleIcon = () => (
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
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XCircleIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const EditPenIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3l4 4-7 7H10v-4l7-7z" />
    <path d="M4 20h16" />
  </svg>
);

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
  const [workflowMode, setWorkflowMode] = useState<string>("ReAct");
  const [workflowModes, setWorkflowModes] = useState<string[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
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
  const [workflowDisplayNames, setWorkflowDisplayNames] = useState<
    Map<string, string>
  >(new Map());

  const getWeekDayNames = (): string[] => {
    const weekNames = t("scheduled.weekDayNames");
    if (Array.isArray(weekNames) && weekNames.length === 7) {
      return weekNames;
    }
    return [
      t("scheduled.sun"),
      t("scheduled.mon"),
      t("scheduled.tue"),
      t("scheduled.wed"),
      t("scheduled.thu"),
      t("scheduled.fri"),
      t("scheduled.sat"),
    ];
  };
  const weekDayNames = getWeekDayNames();

  const loadWorkflowModes = async () => {
    setIsLoadingWorkflows(true);
    try {
      const modes = await workflowCommands.getWorkflowModeNames();
      setWorkflowModes(modes);
      const lang = localStorage.getItem("hippox-language") || "en";
      const displayNames = new Map<string, string>();
      for (const mode of modes) {
        const displayName =
          await workflowCommands.workflowModeDisplayNameByLang(mode, lang);
        displayNames.set(mode, displayName);
      }
      setWorkflowDisplayNames(displayNames);

      if (modes.length > 0 && !workflowMode) {
        setWorkflowMode(modes[0]);
      }
    } catch (error) {
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      loadWorkflowModes();
    };
    window.addEventListener(
      "language-changed",
      handleLanguageChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "language-changed",
        handleLanguageChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    loadWorkflowModes();
  }, []);

  const loadTaskData = async () => {
    if (!task) return;
    setName(task.name);
    setScheduleType(task.schedule_type);
    setActionType(task.action_type);
    if (task.workflow_mode) {
      setWorkflowMode(task.workflow_mode);
    } else if (workflowModes.length > 0) {
      setWorkflowMode(workflowModes[0]);
    }
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

  useEffect(() => {
    if (task) {
      loadTaskData();
    } else if (isCreating) {
      resetForm();
      if (workflowModes.length > 0) {
        setWorkflowMode(workflowModes[0]);
      }
    }
  }, [task, isCreating, workflowModes]);

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
    if (workflowModes.length > 0) {
      setWorkflowMode(workflowModes[0]);
    }
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
      showToast(ToastType.WARNING, t("scheduled.taskNameRequired"));
      return false;
    }

    if (actionType === "naturallanguage") {
      if (!naturalLanguage.trim()) {
        showToast(ToastType.WARNING, t("scheduled.taskDescriptionRequired"));
        return false;
      }
    } else {
      if (!skillContent) {
        showToast(ToastType.WARNING, t("scheduled.skillFileRequired"));
        return false;
      }
    }

    if (scheduleType === "fixed") {
      if (!fixedTime) {
        showToast(ToastType.WARNING, t("scheduled.timeRequired"));
        return false;
      }
      if (fixedFrequency === "once" && !fixedDate) {
        showToast(ToastType.WARNING, t("scheduled.dateRequired"));
        return false;
      }
    } else {
      if (intervalValue < 1) {
        showToast(ToastType.WARNING, t("scheduled.intervalValueInvalid"));
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
          workflow_mode: workflowMode,
        };
        const response = await scheduledTasksCommands.update(request);
        onTaskUpdated(response.task);
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
          workflow_mode: workflowMode,
        };
        const response = await scheduledTasksCommands.create(request);
        onTaskCreated(response.task);
        resetForm();
      }
    } catch (error) {
      showToast(ToastType.ERROR, t("scheduled.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    showDialog(
      DialogType.WARNING,
      t("scheduled.confirmDeleteTitle"),
      t("scheduled.confirmDeleteMessage", { name: task.name }),
      async () => {
        setIsDeleting(true);
        try {
          await scheduledTasksCommands.delete(task.id);
          onTaskDeleted(task.id);
        } catch (error) {
          showToast(ToastType.ERROR, t("scheduled.deleteFailed"));
        } finally {
          setIsDeleting(false);
        }
      },
      undefined,
      t("scheduled.delete"),
      t("settings.cancel"),
    );
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
    } catch (error) {
      showToast(ToastType.ERROR, t("scheduled.toggleFailed"));
    } finally {
      setIsToggling(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md") && !file.name.endsWith(".skill.md")) {
      showToast(ToastType.ERROR, t("scheduled.invalidFile"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSkillContent(content);
      setSkillFileName(file.name);
      showToast(ToastType.SUCCESS, t("scheduled.fileLoaded"));
    };
    reader.readAsText(file);
  };

  const handleRemoveSkillFile = () => {
    setSkillContent("");
    setSkillFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    showToast(ToastType.INFO, t("scheduled.fileRemoved"));
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
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "4px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "70px",
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
    gap: "6px",
    cursor: "pointer",
    fontSize: "12px",
    color: "var(--text-primary)",
  };

  const radioInputStyle: React.CSSProperties = {
    appearance: "none",
    width: "14px",
    height: "14px",
    margin: 0,
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "50%",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.2s",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "5px 14px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "11px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "6px",
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
    background: "transparent",
  };

  const toggleButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "rgba(16, 185, 129, 0.1)",
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
            padding: "32px",
          }}
        >
          <div
            style={{
              fontSize: "40px",
              opacity: 0.4,
              marginBottom: "12px",
              color: "var(--text-muted)",
            }}
          >
            <EditPenIcon />
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}
          >
            {t("scheduled.selectTaskToEdit")}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
            {t("scheduled.clickTaskHint")}
          </div>
        </div>
      </div>
    );
  }

  const isEditMode = !!task;

  return (
    <div
      className="task-edit-panel-no-select"
      style={{
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
          padding: "8.5px 14px",
          borderBottom: "1px solid var(--border-color)",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          <EditIcon />
        </span>
        <span
          style={{
            flex: 1,
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {isEditMode ? t("scheduled.editTask") : t("scheduled.addTask")}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            color: "var(--text-secondary)",
            padding: "4px 8px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "12px 14px",
          minHeight: 0,
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>
            {t("scheduled.taskName")}{" "}
            <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("scheduled.taskNamePlaceholder")}
            onMouseEnter={(e) => {
              const target = e.currentTarget;
              showTooltip(t("scheduled.taskNameToolTip"), target);
            }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>{t("scheduled.taskType")}</label>
          <div style={{ display: "flex", gap: "20px" }}>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                checked={scheduleType === "fixed"}
                onChange={() => setScheduleType("fixed")}
                style={radioInputStyle}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  showTooltip(t("scheduled.fixedToolTip"), target);
                }}
              />
              <span>{t("scheduled.typeFixed")}</span>
            </label>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                checked={scheduleType === "interval"}
                onChange={() => setScheduleType("interval")}
                style={radioInputStyle}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  showTooltip(t("scheduled.intervalToolTip"), target);
                }}
              />
              <span>{t("scheduled.typeInterval")}</span>
            </label>
          </div>
        </div>

        {scheduleType === "fixed" && (
          <>
            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>{t("scheduled.frequency")}</label>
              <select
                style={selectStyle}
                value={fixedFrequency}
                onChange={(e) => setFixedFrequency(e.target.value as Frequency)}
              >
                <option value="daily">{t("scheduled.frequencyDaily")}</option>
                <option value="weekly">{t("scheduled.frequencyWeekly")}</option>
                <option value="monthly">
                  {t("scheduled.frequencyMonthly")}
                </option>
                <option value="once">{t("scheduled.frequencyOnce")}</option>
              </select>
            </div>

            {fixedFrequency === "weekly" && (
              <div style={{ marginBottom: "12px" }}>
                <label style={labelStyle}>{t("scheduled.weekDays")}</label>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  {weekDayNames.map((day: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        width: "32px",
                        height: "28px",
                        background: fixedWeekDays.includes(idx)
                          ? "var(--accent-color)"
                          : "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "5px",
                        color: fixedWeekDays.includes(idx)
                          ? "white"
                          : "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "11px",
                        transition: "all 0.2s",
                      }}
                      onClick={() => toggleWeekDay(idx)}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        showTooltip(
                          t("scheduled.weekDayToolTip", { day: day }),
                          target,
                        );
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fixedFrequency === "monthly" && (
              <div style={{ marginBottom: "12px" }}>
                <label style={labelStyle}>{t("scheduled.monthDays")}</label>
                <div
                  style={{
                    display: "flex",
                    gap: "5px",
                    flexWrap: "wrap",
                    maxHeight: "100px",
                    overflowY: "auto",
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <button
                      key={day}
                      type="button"
                      style={{
                        width: "32px",
                        height: "28px",
                        background: fixedMonthDays.includes(day)
                          ? "var(--accent-color)"
                          : "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "5px",
                        color: fixedMonthDays.includes(day)
                          ? "white"
                          : "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "11px",
                        transition: "all 0.2s",
                      }}
                      onClick={() => toggleMonthDay(day)}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        showTooltip(
                          t("scheduled.monthDayToolTip", { day: day }),
                          target,
                        );
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fixedFrequency === "once" && (
              <div style={{ marginBottom: "12px" }}>
                <label style={labelStyle}>{t("scheduled.date")}</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={fixedDate}
                  onChange={(e) => setFixedDate(e.target.value)}
                />
              </div>
            )}

            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>{t("scheduled.time")}</label>
              <input
                type="time"
                style={{ ...inputStyle, maxWidth: "120px" }}
                value={fixedTime}
                onChange={(e) => setFixedTime(e.target.value)}
              />
            </div>
          </>
        )}

        {scheduleType === "interval" && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("scheduled.intervalValue")}</label>
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
              <label style={labelStyle}>{t("scheduled.intervalUnit")}</label>
              <select
                style={selectStyle}
                value={intervalUnit}
                onChange={(e) =>
                  setIntervalUnit(e.target.value as IntervalUnit)
                }
              >
                <option value="second">{t("scheduled.unitSecond")}</option>
                <option value="minute">{t("scheduled.unitMinute")}</option>
                <option value="hour">{t("scheduled.unitHour")}</option>
                <option value="day">{t("scheduled.unitDay")}</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>{t("scheduled.actionType")}</label>
          <div style={{ display: "flex", gap: "20px" }}>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                checked={actionType === "naturallanguage"}
                onChange={() => setActionType("naturallanguage")}
                style={radioInputStyle}
              />
              <span>{t("scheduled.typeNatural")}</span>
            </label>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                checked={actionType === "skillfile"}
                onChange={() => setActionType("skillfile")}
                style={radioInputStyle}
              />
              <span>{t("scheduled.typeSkillFile")}</span>
            </label>
          </div>
        </div>

        {/* Workflow Mode Selection */}
        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>{t("scheduled.workflowMode")}</label>
          <select
            style={selectStyle}
            value={workflowMode}
            onChange={(e) => setWorkflowMode(e.target.value)}
            disabled={isLoadingWorkflows || workflowModes.length === 0}
          >
            {workflowModes.map((mode) => (
              <option key={mode} value={mode}>
                {workflowDisplayNames.get(mode) || mode}
              </option>
            ))}
            {workflowModes.length === 0 && <option value="ReAct">ReAct</option>}
          </select>
          {workflowModes.length === 0 && (
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              {t("scheduled.noWorkflowModes")}
            </div>
          )}
        </div>

        {actionType === "naturallanguage" && (
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>{t("scheduled.taskDescription")}</label>
            <textarea
              style={textareaStyle}
              value={naturalLanguage}
              onChange={(e) => setNaturalLanguage(e.target.value)}
              placeholder={t("scheduled.naturalLanguagePlaceholder")}
              rows={3}
            />
          </div>
        )}

        {actionType === "skillfile" && (
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>{t("scheduled.skillFile")}</label>
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
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  showTooltip(t("scheduled.selectFileToolTip"), target);
                }}
              >
                <FolderOpenIcon />
                {t("scheduled.selectFile")}
              </button>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-primary)",
                    background: "var(--bg-tertiary)",
                    padding: "5px 10px",
                    borderRadius: "5px",
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
                  style={buttonStyle}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("scheduled.replaceFile")}
                </button>
                <button
                  type="button"
                  style={deleteButtonStyle}
                  onClick={handleRemoveSkillFile}
                >
                  <TrashIcon />
                  {t("scheduled.remove")}
                </button>
              </div>
            )}
          </div>
        )}

        {isEditMode && task && task.last_executed_at && (
          <div
            style={{
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              <HistoryIcon />
              <span>{t("scheduled.executionHistory")}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: "var(--bg-tertiary)",
                borderRadius: "5px",
                fontSize: "10px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                {new Date(task.last_executed_at).toLocaleString()}
              </span>
              <span
                style={{
                  color: task.last_status === "failed" ? "#ef4444" : "#10b981",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                {task.last_status === "failed" ? (
                  <XCircleIcon />
                ) : (
                  <CheckCircleIcon />
                )}
                {task.last_status || "success"}
              </span>
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "10px",
                color: "var(--text-muted)",
                textAlign: "right",
              }}
            >
              <span>
                {t("scheduled.executeCount")}: {task.execution_count || 0}
              </span>
            </div>
          </div>
        )}

        {isEditMode && task && (
          <div
            style={{
              marginTop: "16px",
              padding: "10px",
              background: "var(--bg-tertiary)",
              borderRadius: "6px",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {task.enabled ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                ) : (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                )}
                {t("scheduled.status")}:
              </span>
              <span
                style={{
                  flex: 1,
                  color: task.enabled
                    ? "#10b981"
                    : task.completed
                      ? "#8b5cf6"
                      : "var(--text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const statusText = task.completed
                    ? t("scheduled.completed")
                    : task.enabled
                      ? t("scheduled.enabled")
                      : t("scheduled.disabled");
                  showTooltip(statusText, e.currentTarget);
                }}
              >
                {task.completed
                  ? t("scheduled.completed")
                  : task.enabled
                    ? t("scheduled.enabled")
                    : t("scheduled.disabled")}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <FileIcon />
                ID:
              </span>
              <span
                style={{
                  flex: 1,
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  showTooltip(task.id, e.currentTarget);
                }}
              >
                {task.id}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(task.id);
                  showToast(ToastType.SUCCESS, t("common.copied"));
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <EditIcon />
                {t("scheduled.taskName")}:
              </span>
              <span
                style={{
                  flex: 1,
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  showTooltip(task.name, e.currentTarget);
                }}
              >
                {task.name}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(task.name);
                  showToast(ToastType.SUCCESS, t("common.copied"));
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <HistoryIcon />
                {t("scheduled.createdAt")}:
              </span>
              <span
                style={{
                  flex: 1,
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  showTooltip(
                    new Date(task.created_at).toLocaleString(),
                    e.currentTarget,
                  );
                }}
              >
                {new Date(task.created_at).toLocaleString()}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    new Date(task.created_at).toLocaleString(),
                  );
                  showToast(ToastType.SUCCESS, t("common.copied"));
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {t("scheduled.updatedAt")}:
              </span>
              <span
                style={{
                  flex: 1,
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  showTooltip(
                    new Date(task.updated_at).toLocaleString(),
                    e.currentTarget,
                  );
                }}
              >
                {new Date(task.updated_at).toLocaleString()}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    new Date(task.updated_at).toLocaleString(),
                  );
                  showToast(ToastType.SUCCESS, t("common.copied"));
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {t("scheduled.executeCount")}:
              </span>
              <span
                style={{
                  flex: 1,
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  showTooltip(
                    `${t("scheduled.executeCount")}: ${task.execution_count || 0} ${t("scheduled.times")}`,
                    e.currentTarget,
                  );
                }}
              >
                {task.execution_count || 0} {t("scheduled.times")}
              </span>
            </div>

            {/* Display workflow mode in info section */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M4 7h16M4 12h16M4 17h10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("scheduled.workflowMode")}:
              </span>
              <span
                style={{
                  flex: 1,
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  showTooltip(task.workflow_mode || "ReAct", e.currentTarget);
                }}
              >
                {workflowDisplayNames.get(task.workflow_mode || "ReAct") ||
                  task.workflow_mode ||
                  "ReAct"}
              </span>
            </div>
          </div>
        )}
      </div>
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          gap: "10px",
          flexShrink: 0,
          justifyContent: "flex-end",
        }}
      >
        {isEditMode && (
          <>
            <button
              onClick={handleToggle}
              disabled={isToggling}
              style={{
                padding: "5px 14px",
                background: task?.enabled
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(16, 185, 129, 0.15)",
                border: `1px solid ${task?.enabled ? "#f59e0b" : "#10b981"}`,
                borderRadius: "6px",
                color: task?.enabled ? "#f59e0b" : "#10b981",
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = task?.enabled
                  ? "rgba(245, 158, 11, 0.25)"
                  : "rgba(16, 185, 129, 0.25)";
                showTooltip(
                  task?.enabled
                    ? t("scheduled.disableToolTip")
                    : t("scheduled.enableToolTip"),
                  e.currentTarget,
                );
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = task?.enabled
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(16, 185, 129, 0.15)";
              }}
            >
              {task?.enabled ? <PauseIcon /> : <PlayIcon />}
              {task?.enabled ? t("scheduled.disable") : t("scheduled.enable")}
            </button>
            <button
              style={deleteButtonStyle}
              onClick={handleDelete}
              disabled={isDeleting}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                showTooltip(t("scheduled.deleteToolTip"), target);
              }}
            >
              <TrashIcon />
              {t("scheduled.delete")}
            </button>
          </>
        )}
        <button
          style={primaryButtonStyle}
          onClick={handleSave}
          disabled={isSaving}
          onMouseEnter={(e) => {
            const target = e.currentTarget;
            showTooltip(t("scheduled.saveToolTip"), target);
          }}
        >
          <SaveIcon />
          {isSaving ? t("common.saving") : t("settings.save")}
        </button>
      </div>
    </div>
  );
};

const radioCheckedStyle = `
input[type="radio"]:checked {
  background: #a0a0a0 !important;
  border-color: #a0a0a0 !important;
  box-shadow: inset 0 0 0 2px var(--bg-secondary) !important;
}
  input[type="radio"]:checked:hover {
    background: var(--accent-color);
  }
  input[type="radio"]:focus {
    outline: none;
  }
`;

const noSelectStyle = `
.task-edit-panel-no-select {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.task-edit-panel-no-select input,
.task-edit-panel-no-select textarea,
.task-edit-panel-no-select [contenteditable="true"] {
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}
`;

if (typeof document !== "undefined") {
  const noSelectStyleId = "task-edit-panel-no-select-styles";
  if (!document.getElementById(noSelectStyleId)) {
    const style = document.createElement("style");
    style.id = noSelectStyleId;
    style.textContent = noSelectStyle;
    document.head.appendChild(style);
  }
}

if (typeof document !== "undefined") {
  const styleId = "task-edit-radio-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = radioCheckedStyle;
    document.head.appendChild(style);
  }
}

export default TaskEditPanel;
