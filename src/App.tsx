import React, { useState, useEffect } from "react";
import ChatPanel from "./components/ChatPanel";
import ResizablePanels from "./components/ResizablePanels";
import Sidebar from "./components/Sidebar";
import TerminalPanel from "./components/TerminalPanel";
import MenuPanel, {
  MenuPanelView,
  EngineSubView,
} from "./components/MenuPanel";
import TopBar from "./components/TopBar";
import BottomBar from "./components/BottomBar";
import { useTranslation } from "./hooks/useTranslation";
import {
  Theme,
  Language,
  ExecutionLog,
  ChatMessage,
  TaskInfo,
  RoleEnum,
  MessageStatus,
  SystemEvent,
  UploadFile,
} from "./type";
import { hippoxCommands } from "./api/chat";
import { sessionCommands } from "./api/session";
import { configCommands } from "./api/config";
import { listen } from "@tauri-apps/api/event";
import { SettingsSubView } from "./components/MenuPanel/SettingsPanel";
import { taskManager } from "./TaskManager";
import { appConfig } from "./config";
import Toast from "./components/Toast";
import Dialog from "./components/Dialog";
import WelcomePage from "./components/WelcomePage";
import GlobalDragOverlay from "./components/GlobalDragOverlay";
import CustomDragCursor from "./components/CustomDragCursor";
import { invoke } from "@tauri-apps/api/core";
import { filesCommands } from "./api/files";
import { getDataPaths } from "./api/paths";
import FilePreview from "./components/FilePreview";

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<Language>("en");
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const { t } = useTranslation(language);
  const [menuPanelView, setMenuPanelView] = useState<MenuPanelView | null>(
    null,
  );
  const [settingsSubView, setSettingsSubView] =
    useState<SettingsSubView>("llmModel");
  const [engineSubView, setEngineSubView] =
    useState<EngineSubView>("engine_database");
  const [menuPanelWidth, setMenuPanelWidth] = useState<number>(320);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [initialEngineConfig, setInitialEngineConfig] = useState<any>(null);
  const [taskManagerVersion, setTaskManagerVersion] = useState(0);
  const [showWelcomePage, setShowWelcomePage] = useState(true);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [isDraggingOverInput, setIsDraggingOverInput] = useState(false);
  const [showDragCursor, setShowDragCursor] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"horizontal" | "vertical">(
    () => {
      const saved = localStorage.getItem("hippox-layout-mode");
      return saved === "horizontal" || saved === "vertical"
        ? saved
        : "vertical";
    },
  );
  const handleLayoutModeChange = (mode: "horizontal" | "vertical") => {
    setLayoutMode(mode);
    localStorage.setItem("hippox-layout-mode", mode);
  };
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);
  const [filePreviewWidth, setFilePreviewWidth] = useState(320);
  const handleFilePreview = (file: UploadFile) => {
    setPreviewFile(file);
    setIsFilePreviewOpen(true);
  };
  const handleCloseFilePreview = () => {
    setIsFilePreviewOpen(false);
    setPreviewFile(null);
  };
  useEffect(() => {
    let unlistenDragEnter: (() => void) | undefined;
    let unlistenDragLeave: (() => void) | undefined;
    const setupDragListeners = async () => {
      unlistenDragEnter = await listen<any>("drag-enter", (event) => {
        setIsGlobalDragging(true);
        setShowDragCursor(true);
      });
      unlistenDragLeave = await listen<void>("drag-leave", () => {
        setIsGlobalDragging(false);
        setIsDraggingOverInput(false);
        setShowDragCursor(false);
      });
    };
    setupDragListeners();
    return () => {
      if (unlistenDragEnter) unlistenDragEnter();
      if (unlistenDragLeave) unlistenDragLeave();
    };
  }, []);
  useEffect(() => {
    let unlistenFileDrop: (() => void) | undefined;
    const setupFileDropListener = async () => {
      unlistenFileDrop = await listen<string[]>("file-drop", (event) => {
        if (event.payload && event.payload.length > 0) {
          const customEvent = new CustomEvent("files-dropped", {
            detail: { filePaths: event.payload },
          });
          window.dispatchEvent(customEvent);
        }
        setIsGlobalDragging(false);
        setIsDraggingOverInput(false);
        setShowDragCursor(false);
      });
    };
    setupFileDropListener();
    return () => {
      if (unlistenFileDrop) unlistenFileDrop();
    };
  }, []);

  useEffect(() => {
    const unlistenNewSession = listen("new-session", () => {
      handleNewSession();
    });
    const unlistenOpenSkillsMarket = listen("open-skills-market", () => {
      setMenuPanelView("skillMarket");
    });
    const unlistenOpenHistory = listen("open-history", () => {
      setMenuPanelView("history");
    });
    const unlistenOpenFavorites = listen("open-favorites", () => {
      setMenuPanelView("favorites");
    });
    const unlistenOpenScheduledTasks = listen("open-scheduled-tasks", () => {
      setMenuPanelView("scheduledTasks");
    });
    const unlistenOpenSettings = listen("open-settings", () => {
      setMenuPanelView("settings");
      setSettingsSubView("llmModel");
    });
    const unlistenOpenLLMConfig = listen("open-llm-config", () => {
      setMenuPanelView("settings");
      setSettingsSubView("llmModel");
    });
    const unlistenCheckUpdates = listen("check-updates", () => {});
    const unlistenShowAbout = listen("show-about", () => {});
    const unlistenShowNotification = listen("show-notification", (event) => {});
    return () => {
      unlistenNewSession.then((fn) => fn());
      unlistenOpenSkillsMarket.then((fn) => fn());
      unlistenOpenHistory.then((fn) => fn());
      unlistenOpenFavorites.then((fn) => fn());
      unlistenOpenScheduledTasks.then((fn) => fn());
      unlistenOpenSettings.then((fn) => fn());
      unlistenOpenLLMConfig.then((fn) => fn());
      unlistenCheckUpdates.then((fn) => fn());
      unlistenShowAbout.then((fn) => fn());
      unlistenShowNotification.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    let dragCounter = 0;
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (dragCounter === 1) {
        setIsGlobalDragging(true);
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        setIsGlobalDragging(false);
        setIsDraggingOverInput(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsGlobalDragging(false);
      setIsDraggingOverInput(false);
    };
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  useEffect(() => {
    const savedLayoutMode = localStorage.getItem("hippox-layout-mode") as
      | "horizontal"
      | "vertical"
      | null;
    if (savedLayoutMode) {
      setLayoutMode(savedLayoutMode);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = taskManager.subscribe(() => {
      setTaskManagerVersion((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleOpenSkill = (e: CustomEvent) => {
      setMenuPanelView("skillMarket");
    };

    const handleSwitchSession = (e: CustomEvent) => {
      const { sessionId } = e.detail;
      handleSwitchSession(sessionId);
    };

    const handleOpenLog = (e: CustomEvent) => {};
    window.addEventListener(
      "search-open-skill",
      handleOpenSkill as EventListener,
    );
    window.addEventListener(
      "search-switch-session",
      handleSwitchSession as EventListener,
    );
    window.addEventListener("search-open-log", handleOpenLog as EventListener);
    return () => {
      window.removeEventListener(
        "search-open-skill",
        handleOpenSkill as EventListener,
      );
      window.removeEventListener(
        "search-switch-session",
        handleSwitchSession as EventListener,
      );
      window.removeEventListener(
        "search-open-log",
        handleOpenLog as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const unlistenOpenLogsDir = listen("open-logs-dir", async () => {
      const paths = await getDataPaths();
      if (paths.log_dir) await filesCommands.openPath(paths.log_dir);
    });
    const unlistenOpenHistoryDir = listen("open-history-dir", async () => {
      const paths = await getDataPaths();
      if (paths.dialog_history_dir)
        await filesCommands.openPath(paths.dialog_history_dir);
    });
    const unlistenOpenSkillsMarketDir = listen(
      "open-skills-market-dir",
      async () => {
        const paths = await getDataPaths();
        if (paths.skills_market_dir)
          await filesCommands.openPath(paths.skills_market_dir);
      },
    );
    const unlistenOpenScheduledTasksDir = listen(
      "open-scheduled-tasks-dir",
      async () => {
        const paths = await getDataPaths();
        if (paths.scheduled_tasks_dir)
          await filesCommands.openPath(paths.scheduled_tasks_dir);
      },
    );
    const unlistenOpenSettingsDir = listen("open-settings-dir", async () => {
      const paths = await getDataPaths();
      if (paths.settings_dir) await filesCommands.openPath(paths.settings_dir);
    });

    return () => {
      unlistenOpenLogsDir.then((fn) => fn());
      unlistenOpenHistoryDir.then((fn) => fn());
      unlistenOpenSkillsMarketDir.then((fn) => fn());
      unlistenOpenScheduledTasksDir.then((fn) => fn());
      unlistenOpenSettingsDir.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const unlistenNewSession = listen(SystemEvent.NewSession, () => {
      handleNewSession();
    });
    const unlistenOpenSkillsMarket = listen(
      SystemEvent.OpenSkillsMarket,
      () => {
        setMenuPanelView("skillMarket");
      },
    );
    const unlistenOpenHistory = listen(SystemEvent.OpenHistory, () => {
      setMenuPanelView("history");
    });
    const unlistenOpenFavorites = listen(SystemEvent.OpenFavorites, () => {
      setMenuPanelView("favorites");
    });
    const unlistenOpenScheduledTasks = listen(
      SystemEvent.OpenScheduledTasks,
      () => {
        setMenuPanelView("scheduledTasks");
      },
    );
    const unlistenOpenSettings = listen(SystemEvent.OpenSettings, () => {
      setMenuPanelView("settings");
      setSettingsSubView("llmModel");
    });
    const unlistenOpenLlmConfig = listen(SystemEvent.OpenLlmConfig, () => {
      setMenuPanelView("settings");
      setSettingsSubView("llmModel");
    });
    const unlistenCheckUpdates = listen(SystemEvent.CheckUpdates, () => {});
    const unlistenShowAbout = listen(SystemEvent.ShowAbout, () => {});
    const unlistenShowNotification = listen(
      SystemEvent.ShowNotification,
      (event) => {},
    );
    return () => {
      unlistenNewSession.then((fn) => fn());
      unlistenOpenSkillsMarket.then((fn) => fn());
      unlistenOpenHistory.then((fn) => fn());
      unlistenOpenFavorites.then((fn) => fn());
      unlistenOpenScheduledTasks.then((fn) => fn());
      unlistenOpenSettings.then((fn) => fn());
      unlistenOpenLlmConfig.then((fn) => fn());
      unlistenCheckUpdates.then((fn) => fn());
      unlistenShowAbout.then((fn) => fn());
      unlistenShowNotification.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!isLoading && currentSessionId) {
      const saveTimer = setTimeout(() => {
        const allData = taskManager.getAllData();
        (sessionCommands.saveChatContent as any)(
          currentSessionId,
          JSON.stringify({
            userMessages: allData.userMessages,
            assistantMessages: allData.assistantMessages,
          }),
        ).catch(console.error);
        (sessionCommands.saveTerminalContent as any)(
          currentSessionId,
          JSON.stringify(allData.tasks),
        ).catch(console.error);
      }, 500);
      return () => clearTimeout(saveTimer);
    }
  }, [currentSessionId, isLoading, taskManagerVersion]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedTheme = await configCommands.getSettingsTheme();
        const savedLanguage = await configCommands.getSettingsLanguage();
        setTheme(savedTheme as Theme);
        setLanguage(savedLanguage as Language);
        await hippoxCommands.setLanguage(savedLanguage);

        const fullConfig = await configCommands.getConfig();
        if (fullConfig.engine) {
          setInitialEngineConfig(fullConfig.engine);
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      } finally {
        setIsConfigLoaded(true);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (isConfigLoaded) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, isConfigLoaded]);

  useEffect(() => {
    const loadSessions = async () => {
      if (!isConfigLoaded) return;
      try {
        const sessions = await sessionCommands.listSessions();
        if (sessions.length > 0) {
          for (const session of sessions) {
            const chatContent = await sessionCommands.loadChatContent(
              session.session_id,
            );
            const terminalContent = await sessionCommands.loadTerminalContent(
              session.session_id,
            );
            let userMessages: ChatMessage[] = [];
            let assistantMessages: ChatMessage[] = [];
            let tasks: TaskInfo[] = [];
            if (chatContent) {
              try {
                const parsed =
                  typeof chatContent === "string"
                    ? JSON.parse(chatContent)
                    : chatContent;
                userMessages = parsed?.userMessages || [];
                assistantMessages = parsed?.assistantMessages || [];
              } catch {}
            }
            if (terminalContent) {
              try {
                const parsed =
                  typeof terminalContent === "string"
                    ? JSON.parse(terminalContent)
                    : terminalContent;
                tasks = Array.isArray(parsed) ? parsed : [];
              } catch {}
            }
            if (!taskManager.getTasksBySession(session.session_id)) {
              taskManager.loadSessionData(
                session.session_id,
                tasks,
                userMessages,
                assistantMessages,
              );
            }
          }
        }
        const tempSessionId = `temp_${Date.now()}`;
        taskManager.loadSessionData(tempSessionId, [], [], []);
        setCurrentSessionId(tempSessionId);
        localStorage.setItem("hippox-current-session", tempSessionId);
      } catch (error) {
        console.error("Failed to load sessions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
  }, [isConfigLoaded]);

  useEffect(() => {
    if (!isLoading && currentSessionId) {
      const saveTimer = setTimeout(async () => {
        const allData = taskManager.getAllData();
        (sessionCommands.saveChatContent as any)(
          currentSessionId,
          JSON.stringify({
            userMessages: allData.userMessages,
            assistantMessages: allData.assistantMessages,
          }),
        ).catch(console.error);
        (sessionCommands.saveTerminalContent as any)(
          currentSessionId,
          JSON.stringify(allData.tasks),
        ).catch(console.error);
      }, 1000);
      return () => clearTimeout(saveTimer);
    }
  }, [currentSessionId, isLoading]);

  useEffect(() => {
    if (!isLoading && currentSessionId) {
      const saveTimer = setTimeout(async () => {
        const allData = taskManager.getAllData();
        (sessionCommands.saveChatContent as any)(
          currentSessionId,
          JSON.stringify({
            userMessages: allData.userMessages,
            assistantMessages: allData.assistantMessages,
          }),
        ).catch(console.error);
        (sessionCommands.saveTerminalContent as any)(
          currentSessionId,
          JSON.stringify(allData.tasks),
        ).catch(console.error);
      }, 500);
      return () => clearTimeout(saveTimer);
    }
  }, [currentSessionId, isLoading, taskManager.getAllData()]);

  useEffect(() => {
    const unlistenStep = listen("task_step_update", (event: any) => {
      const {
        task_id,
        step_name,
        step_index,
        status,
        output,
        error,
        session_id,
      } = event.payload;
      if (!session_id) {
        console.warn("task_step_update missing session_id");
        return;
      }
      const tasksMap = taskManager.getTasksBySession(session_id);
      const task = tasksMap?.get(task_id);
      if (task && task.status !== "failed") {
        const steps = [...task.steps];
        const existingStep = steps.find((s) => s.step_index === step_index);
        if (existingStep) {
          existingStep.status = status;
          if (output) existingStep.output = output;
          if (error) existingStep.error = error;
        } else {
          steps.push({ step_index, step_name, status, output, error });
        }
        steps.sort((a, b) => a.step_index - b.step_index);
        const hasFailure = steps.some((s) => s.status === "FAILURE");
        const taskStatus = hasFailure ? "failed" : task.status;
        taskManager.updateTaskBySession(session_id, task_id, {
          steps,
          status: taskStatus,
        });
      }
    });

    const unlistenFailed = listen("task_failed", (event: any) => {
      const { task_id, error, session_id } = event.payload;
      if (!session_id) return;
      const messageId = `llm_${task_id}`;
      const assistantMessagesMap =
        taskManager.getAssistantMessagesBySession(session_id);
      const existingMsg = assistantMessagesMap?.get(messageId);
      if (!existingMsg) {
        const errorMsg: ChatMessage = {
          id: messageId,
          role: RoleEnum.LLM,
          content: `❌ ${error}`,
          timestamp: new Date().toISOString(),
          status: MessageStatus.Failed,
        };
        taskManager.addAssistantMessageToSession(session_id, errorMsg);
      } else {
        taskManager.updateAssistantMessageBySession(session_id, messageId, {
          content: `❌ ${error}`,
          timestamp: new Date().toISOString(),
          status: MessageStatus.Failed,
        });
      }
      const task = taskManager.getTaskBySession(session_id, task_id);
      if (task) {
        taskManager.updateTaskBySession(session_id, task_id, {
          status: "failed",
          final_output: error,
        });
      } else {
        const newTask: TaskInfo = {
          task_id: task_id,
          session_id: session_id,
          user_input: "Processing...",
          status: "failed",
          steps: [],
          final_output: error,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        taskManager.addTaskToSession(session_id, newTask);
      }
    });

    const unlistenComplete = listen("task_complete", (event: any) => {
      const { task_id, final_output, session_id } = event.payload;
      if (!session_id) return;
      const messageId = `llm_${task_id}`;
      const assistantMessagesMap =
        taskManager.getAssistantMessagesBySession(session_id);
      const existingMsg = assistantMessagesMap?.get(messageId);
      if (!existingMsg) {
        const successMsg: ChatMessage = {
          id: messageId,
          role: RoleEnum.LLM,
          content: t("chat.taskCompleted"),
          timestamp: new Date().toISOString(),
          status: MessageStatus.Completed,
        };
        taskManager.addAssistantMessageToSession(session_id, successMsg);
      } else {
        taskManager.updateAssistantMessageBySession(session_id, messageId, {
          content: t("chat.taskCompleted"),
          timestamp: new Date().toISOString(),
          status: MessageStatus.Completed,
        });
      }
      const task = taskManager.getTaskBySession(session_id, task_id);
      if (task) {
        taskManager.updateTaskBySession(session_id, task_id, {
          status: "completed",
          final_output,
        });
      } else {
        const newTask: TaskInfo = {
          task_id: task_id,
          session_id: session_id,
          user_input: "Processing...",
          status: "completed",
          steps: [],
          final_output: final_output,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        taskManager.addTaskToSession(session_id, newTask);
      }
    });
    return () => {
      unlistenStep.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
      unlistenFailed.then((fn) => fn());
    };
  }, [language]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logs = await hippoxCommands.getLogs();
        const formattedLogs: ExecutionLog[] = logs.map((log) => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level as any,
          message: log.message,
          details: log.details,
          duration: log.duration,
        }));
        setExecutionLogs(formattedLogs);
      } catch (error) {
        console.error("loading logs error:", error);
      }
    };
    loadLogs();
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNewSession = async () => {
    const tempSessionId = `temp_${Date.now()}`;
    taskManager.loadSessionData(tempSessionId, [], [], []);
    setCurrentSessionId(tempSessionId);
    localStorage.setItem("hippox-current-session", tempSessionId);
  };

  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    if (sessionId.startsWith("temp_")) return;
    try {
      if (currentSessionId && !currentSessionId.startsWith("temp_")) {
        const allData = taskManager.getAllData();
        await (sessionCommands.saveChatContent as any)(
          currentSessionId,
          JSON.stringify({
            userMessages: allData.userMessages,
            assistantMessages: allData.assistantMessages,
          }),
        ).catch(console.error);
        await (sessionCommands.saveTerminalContent as any)(
          currentSessionId,
          JSON.stringify(allData.tasks),
        ).catch(console.error);
      }
      const hasData = taskManager.getTasksBySession(sessionId) !== undefined;
      if (!hasData) {
        const chatContent = await sessionCommands.loadChatContent(sessionId);
        const terminalContent =
          await sessionCommands.loadTerminalContent(sessionId);
        let userMessages: ChatMessage[] = [];
        let assistantMessages: ChatMessage[] = [];
        let tasks: TaskInfo[] = [];
        if (chatContent) {
          try {
            const parsed =
              typeof chatContent === "string"
                ? JSON.parse(chatContent)
                : chatContent;
            userMessages = parsed?.userMessages || [];
            assistantMessages = parsed?.assistantMessages || [];
          } catch {}
        }
        if (terminalContent) {
          try {
            const parsed =
              typeof terminalContent === "string"
                ? JSON.parse(terminalContent)
                : terminalContent;
            tasks = Array.isArray(parsed) ? parsed : [];
          } catch {}
        }
        taskManager.loadSessionData(
          sessionId,
          tasks,
          userMessages,
          assistantMessages,
        );
      } else {
        taskManager.switchToSession(sessionId);
      }
      setCurrentSessionId(sessionId);
      localStorage.setItem("hippox-current-session", sessionId);
      window.dispatchEvent(new CustomEvent("session-created"));
    } catch (error) {
      console.error("Failed to switch session:", error);
    }
  };

  const handleToggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    await configCommands.saveSettingsTheme(newTheme);
  };

  const handleToggleLanguage = async () => {
    const newLang = language === "zh" ? "en" : "zh";
    setLanguage(newLang);
    await configCommands.saveSettingsLanguage(newLang);
    await hippoxCommands.setLanguage(newLang);
    const assistantMessages = taskManager.getAssistantMessages();
    const welcomeMsg = assistantMessages.find((m) => m.id === "welcome");
    if (welcomeMsg) {
      const newContent = appConfig.getWelcomeMessage(newLang);
      taskManager.updateAssistantMessage("welcome", {
        content: newContent,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleMenuClick = (view: string, subView?: string) => {
    if (
      subView === "engine_database" ||
      subView === "engine_network" ||
      subView === "engine_container" ||
      subView === "engine_notification"
    ) {
      setMenuPanelView("engine_group");
      setEngineSubView(subView as EngineSubView);
      setSettingsSubView("llmModel");
    } else if (view === "settings") {
      setMenuPanelView("settings");
      setSettingsSubView((subView as SettingsSubView) || "llmModel");
      setEngineSubView("engine_database");
    } else if (view === "dashboard") {
      setMenuPanelView(null);
    } else {
      setMenuPanelView(view as MenuPanelView);
    }
  };

  const closeMenuPanel = () => {
    setMenuPanelView(null);
  };

  const handleSaveConfig = async (config: any) => {};

  const handleSendMessage = async (
    userMessage: string,
    sessionId: string,
    files?: UploadFile[],
  ) => {
    const now = new Date();
    let finalSessionId = sessionId || currentSessionId;
    const isTempSession = finalSessionId.startsWith("temp_");
    if (isTempSession) {
      const newSessionId = `session_${Date.now()}`;
      const sessionTitle =
        userMessage.length > 30
          ? userMessage.slice(0, 30) + "..."
          : userMessage;
      const tempUserMessages =
        taskManager.getUserMessagesBySession(finalSessionId);
      const tempAssistantMessages =
        taskManager.getAssistantMessagesBySessionAsArray(finalSessionId);
      const tempTasksMap = taskManager.getTasksBySession(finalSessionId);
      const tempTasks = tempTasksMap ? Array.from(tempTasksMap.values()) : [];
      try {
        await (sessionCommands.createSession as any)(
          newSessionId,
          sessionTitle,
          t("app.newSessionDesc"),
          JSON.stringify({
            userMessages: tempUserMessages,
            assistantMessages: tempAssistantMessages,
          }),
          JSON.stringify(tempTasks),
        );
        taskManager.loadSessionData(
          newSessionId,
          tempTasks,
          tempUserMessages,
          tempAssistantMessages,
        );
        taskManager.deleteSession(finalSessionId);
        finalSessionId = newSessionId;
        setCurrentSessionId(newSessionId);
        localStorage.setItem("hippox-current-session", newSessionId);
        window.dispatchEvent(new CustomEvent("session-created"));
      } catch (error) {
        console.error("Failed to create session:", error);
      }
    }
    const existingMessages =
      taskManager.getUserMessagesBySession(finalSessionId);
    const lastMessage = existingMessages[existingMessages.length - 1];
    const shouldAddUserMessage =
      !lastMessage ||
      lastMessage.content !== userMessage ||
      Date.now() - new Date(lastMessage.timestamp).getTime() > 1000;
    if (shouldAddUserMessage) {
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: RoleEnum.User,
        content: userMessage,
        timestamp: now.toISOString(),
        files: files,
      };
      taskManager.addUserMessageToSession(finalSessionId, userMsg);
    }
    try {
      const taskId = await hippoxCommands.sendMessageAsync(
        userMessage,
        finalSessionId,
      );
      const messageId = `llm_${taskId}`;
      const assistantMsg: ChatMessage = {
        id: messageId,
        role: RoleEnum.LLM,
        content: `⏳ ${t("chat.taskSubmitted")} ${taskId.slice(0, 8)}...`,
        timestamp: now.toISOString(),
        status: MessageStatus.Pending,
      };
      taskManager.addAssistantMessageToSession(finalSessionId, assistantMsg);
      const newTask: TaskInfo = {
        task_id: taskId,
        session_id: finalSessionId,
        user_input: userMessage,
        status: "pending",
        steps: [],
        final_output: undefined,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        files: files,
      };
      taskManager.addTaskToSession(finalSessionId, newTask);
    } catch (error) {
      console.error("send message error:", error);
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: RoleEnum.LLM,
        content: `❌ ${error}`,
        timestamp: now.toISOString(),
      };
      taskManager.addAssistantMessageToSession(finalSessionId, errorMsg);
    }
  };

  const clearLogs = async () => {
    try {
      await hippoxCommands.clearLogs();
      setExecutionLogs([]);
    } catch (error) {
      console.error("clear logs error:", error);
    }
  };

  const resetSession = async () => {
    try {
      await hippoxCommands.resetSession();
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        role: RoleEnum.LLM,
        content: t("session.reset"),
        timestamp: new Date().toISOString(),
      };
      taskManager.loadSessionData(currentSessionId, [], [], [welcomeMsg]);
    } catch (error) {
      console.error("reset session error:", error);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const shouldShowWelcome = () => {
    if (isLoading) return true;
    if (currentSessionId?.startsWith("temp_")) {
      const userMessages =
        taskManager.getUserMessagesBySession(currentSessionId);
      const assistantMessages =
        taskManager.getAssistantMessagesBySessionAsArray(currentSessionId);
      return userMessages.length === 0 && assistantMessages.length === 0;
    }
    return false;
  };

  return (
    <div className="App">
      <CustomDragCursor isDragging={showDragCursor} />
      <GlobalDragOverlay
        isDragging={isGlobalDragging && !isDraggingOverInput}
      />
      <Toast />
      <Dialog />
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onNewSession={handleNewSession}
        currentTheme={theme}
        onToggleTheme={handleToggleTheme}
        currentLanguage={language}
        onToggleLanguage={handleToggleLanguage}
        t={t}
        layoutMode={layoutMode}
        onLayoutModeChange={handleLayoutModeChange}
      />
      <div className="main-layout">
        {!sidebarCollapsed && (
          <Sidebar
            collapsed={false}
            onResetSession={resetSession}
            onClearLogs={clearLogs}
            onMenuClick={handleMenuClick}
            onNewSession={handleNewSession}
            currentSessionId={currentSessionId}
            onSwitchSession={handleSwitchSession}
            t={t}
          />
        )}
        {menuPanelView && (
          <>
            <div className="menu-panel-left" style={{ width: menuPanelWidth }}>
              <MenuPanel
                currentView={menuPanelView}
                settingsSubView={settingsSubView}
                engineSubView={engineSubView}
                onClose={closeMenuPanel}
                onSaveConfig={handleSaveConfig}
                t={t}
                theme={theme}
                language={language}
                onThemeChange={handleToggleTheme}
                onLanguageChange={handleToggleLanguage}
                isInitializing={false}
                currentSessionId={currentSessionId}
                onSwitchSession={handleSwitchSession}
                initialEngineConfig={initialEngineConfig}
              />
            </div>
            <div
              className="resize-handle-menu"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = menuPanelWidth;
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const newWidth = startWidth + (moveEvent.clientX - startX);
                  if (newWidth >= 200 && newWidth <= 600) {
                    setMenuPanelWidth(newWidth);
                  }
                };
                const onMouseUp = () => {
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                  document.body.style.cursor = "";
                  document.body.style.userSelect = "";
                };
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              }}
            >
              <div className="handle-line"></div>
            </div>
          </>
        )}

        {shouldShowWelcome() ? (
          <WelcomePage
            onSendMessage={(msg, files) =>
              handleSendMessage(msg, currentSessionId, files)
            }
            t={t}
            onDragOverInputChange={setIsDraggingOverInput}
          />
        ) : (
          <ResizablePanels
            leftPanel={
              <TerminalPanel
                logs={executionLogs}
                onClearLogs={clearLogs}
                t={t}
                currentSessionId={currentSessionId}
                onFileClick={handleFilePreview}
              />
            }
            rightPanel={
              <ChatPanel
                onSendMessage={handleSendMessage}
                onFileClick={handleFilePreview}
                t={t}
                currentSessionId={currentSessionId}
                onDragOverInputChange={setIsDraggingOverInput}
              />
            }
            rightExtraPanel={
              isFilePreviewOpen ? (
                <FilePreview
                  file={previewFile}
                  onClose={handleCloseFilePreview}
                  t={t}
                />
              ) : undefined
            }
            isRightExtraOpen={isFilePreviewOpen}
            layoutMode={layoutMode}
            onLayoutModeChange={handleLayoutModeChange}
          />
        )}
      </div>
      <BottomBar t={t} />
    </div>
  );
}

export default App;
