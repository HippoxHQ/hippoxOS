import React, { useEffect, useState, useRef } from "react";
import { ExecutionLog } from "../../types/types";
import TerminalArea from "./TerminalArea";
import { configCommands } from "../../command/config";
import { UploadFile } from "../../core/types";
import { taskManager } from "../../core/TaskManager";
import { TaskStatusEnum } from "../../core/types";
import { useLLMChatPage } from "../../pages/LLMChatPage";
interface TerminalPanelProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
  onFileClick?: (file: UploadFile) => void;
  navigationContent?: React.ReactNode;
  isLeftPanel?: boolean;
}
const TerminalPanel: React.FC<TerminalPanelProps> = ({
  logs,
  onClearLogs,
  t,
  currentSessionId,
  onFileClick,
  navigationContent,
  isLeftPanel = false,
}) => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [i18n, setI18n] = useState<"en" | "zh-cn">("zh-cn");
  const [activeNavIndex, setActiveNavIndex] = useState<number>(-1);
  const [taskList, setTaskList] = useState<any[]>([]);
  const terminalAreaRef = useRef<HTMLDivElement>(null);
  const { leftCollapsed, rightCollapsed, toggleLeft, toggleRight } =
    useLLMChatPage();
  const isCollapsed = isLeftPanel ? leftCollapsed : rightCollapsed;
  const togglePanel = isLeftPanel ? toggleLeft : toggleRight;
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await configCommands.getSettingsTheme();
        setTheme(savedTheme as "light" | "dark");
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    };
    const loadLanguage = async () => {
      try {
        const savedLanguage = await configCommands.getSettingsLanguage();
        const candleViewLang = savedLanguage === "zh" ? "zh-cn" : "en";
        setI18n(candleViewLang as "en" | "zh-cn");
      } catch (error) {
        console.error("Failed to load language:", error);
      }
    };
    loadLanguage();
    loadTheme();
    const handleThemeChange = () => {
      configCommands
        .getSettingsTheme()
        .then((theme) => setTheme(theme as "light" | "dark"))
        .catch(console.error);
    };
    const handleLanguageChange = () => {
      configCommands
        .getSettingsLanguage()
        .then((lang) => {
          const candleViewLang = lang === "zh" ? "zh-cn" : "en";
          setI18n(candleViewLang as "en" | "zh-cn");
        })
        .catch(console.error);
    };
    window.addEventListener("theme-changed", handleThemeChange);
    window.addEventListener("language-changed", handleLanguageChange);
    const updateTasks = () => {
      const allTasks = taskManager.getAllTasks();
      const activeTasks = allTasks.filter(
        (task) =>
          task.status === TaskStatusEnum.Running ||
          task.status === TaskStatusEnum.Pending ||
          task.status === TaskStatusEnum.Paused,
      );
      setTaskList(activeTasks);
    };
    updateTasks();
    const unsubscribe = taskManager.subscribe(updateTasks);
    return () => {
      window.removeEventListener("theme-changed", handleThemeChange);
      window.removeEventListener("language-changed", handleLanguageChange);
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    const handleLocateTask = (event: CustomEvent) => {
      const { taskId } = event.detail;
      const index = taskList.findIndex((t) => t.task_id === taskId);
      if (index !== -1) {
        setActiveNavIndex(index);
      }
    };
    window.addEventListener(
      "locate-task-in-terminal",
      handleLocateTask as EventListener,
    );
    return () => {
      window.removeEventListener(
        "locate-task-in-terminal",
        handleLocateTask as EventListener,
      );
    };
  }, [taskList]);
  const buildNavigationContent = (): React.ReactNode => {
    if (taskList.length === 0) {
      return (
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            textAlign: "center",
            padding: "8px 4px",
            writingMode: "vertical-rl",
            letterSpacing: "1px",
            opacity: 0.5,
          }}
        >
          {t("terminal.noRunningTasks") || "No Tasks"}
        </div>
      );
    }
    const getStatusEmoji = (status: string) => {
      switch (status) {
        case TaskStatusEnum.Running:
          return "🔄";
        case TaskStatusEnum.Pending:
          return "⏳";
        case TaskStatusEnum.Paused:
          return "⏸️";
        case TaskStatusEnum.Completed:
          return "✅";
        case TaskStatusEnum.Failed:
          return "❌";
        default:
          return "📌";
      }
    };
    const getStatusColor = (status: string) => {
      switch (status) {
        case TaskStatusEnum.Running:
          return "#ffa500";
        case TaskStatusEnum.Pending:
          return "#888";
        case TaskStatusEnum.Paused:
          return "#ffa500";
        case TaskStatusEnum.Completed:
          return "#4caf50";
        case TaskStatusEnum.Failed:
          return "#ff4444";
        default:
          return "var(--text-tertiary)";
      }
    };
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          width: "100%",
          padding: "0 4px",
        }}
      >
        {taskList.map((task, idx) => {
          const isActive = idx === activeNavIndex;
          const preview = task.user_input?.slice(0, 6) || "...";
          return (
            <button
              key={task.task_id}
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("locate-task-in-terminal", {
                    detail: { taskId: task.task_id },
                  }),
                );
                setActiveNavIndex(idx);
              }}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: isActive
                  ? "1px solid var(--accent-color)"
                  : "1px solid var(--border-color)",
                background: isActive
                  ? "var(--accent-glow)"
                  : "var(--bg-tertiary)",
                color: isActive
                  ? "var(--accent-color)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                flexShrink: 0,
                fontWeight: isActive ? 600 : 400,
                position: "relative",
              }}
              title={task.user_input || t("terminal.unnamedTask")}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  right: "2px",
                  fontSize: "6px",
                  color: getStatusColor(task.status),
                }}
              >
                {getStatusEmoji(task.status)}
              </span>
              {preview}
            </button>
          );
        })}
      </div>
    );
  };
  const navigation = buildNavigationContent();
  const collapseIcon = isLeftPanel
    ? isCollapsed
      ? "▶"
      : "◀"
    : isCollapsed
      ? "◀"
      : "▶";
  return (
    <div
      className="terminal-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        className="terminal-area"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <TerminalArea
          logs={logs}
          onClearLogs={onClearLogs}
          t={t}
          currentSessionId={currentSessionId}
          onFileClick={onFileClick}
          theme={theme}
          i18n={i18n}
          isCollapsed={isCollapsed}
          togglePanel={togglePanel}
          collapseIcon={collapseIcon}
        />
      </div>
      <div style={{ display: "none" }} data-navigation-content>
        {navigation}
      </div>
    </div>
  );
};
export default TerminalPanel;
