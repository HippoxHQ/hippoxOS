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
import { Theme, Language, ExecutionLog, ChatMessage, TaskInfo } from "./type";
import { hippoxCommands } from "./api/chat";
import { sessionCommands } from "./api/session";
import { configCommands } from "./api/config";
import { listen } from "@tauri-apps/api/event";
import { SettingsSubView } from "./components/MenuPanel/SettingsPanel";

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeTasks, setActiveTasks] = useState<Map<string, TaskInfo>>(
    new Map(),
  );
  const [currentSessionTasks, setCurrentSessionTasks] = useState<TaskInfo[]>(
    [],
  );
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [initialEngineConfig, setInitialEngineConfig] = useState<any>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedTheme = await configCommands.getSettingsTheme();
        const savedLanguage = await configCommands.getSettingsLanguage();
        setTheme(savedTheme as Theme);
        setLanguage(savedLanguage as Language);
        await hippoxCommands.setLanguage(savedLanguage);

        // 加载引擎配置
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
          let lastSessionId = localStorage.getItem("hippox-current-session");
          let targetSession = sessions.find(
            (s) => s.session_id === lastSessionId,
          );
          if (!targetSession) {
            targetSession = sessions[0];
          }
          const chatContent = await sessionCommands.loadChatContent(
            targetSession.session_id,
          );
          if (chatContent && chatContent.length > 0) {
            setChatMessages(chatContent);
          } else {
            setChatMessages([
              {
                id: "welcome",
                role: "assistant",
                content:
                  language === "zh"
                    ? "你好，我是 Hippox AI 运行时。我有自主决策能力，可以执行技能并实时反馈。有什么可以帮你的？"
                    : "Hello, I am Hippox AI Runtime. I have autonomous decision-making capabilities and can execute skills with real-time feedback. How can I help you?",
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          }
          setCurrentSessionId(targetSession.session_id);
          localStorage.setItem(
            "hippox-current-session",
            targetSession.session_id,
          );
        }
      } catch (error) {
        console.error("Failed to load sessions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
  }, [isConfigLoaded, language]);

  useEffect(() => {
    if (!isLoading && currentSessionId && chatMessages.length > 0) {
      const saveTimer = setTimeout(() => {
        sessionCommands
          .saveChatContent(currentSessionId, chatMessages)
          .catch(console.error);
        sessionCommands
          .saveTerminalContent(currentSessionId, currentSessionTasks)
          .catch(console.error);
      }, 1000);
      return () => clearTimeout(saveTimer);
    }
  }, [chatMessages, currentSessionTasks, currentSessionId, isLoading]);

  const handleNewSession = async () => {
    const newSessionId = `session_${Date.now()}`;
    const welcomeMessage: ChatMessage[] = [
      {
        id: "welcome",
        role: "assistant",
        content:
          language === "zh"
            ? "你好，我是 Hippox AI 运行时。有什么可以帮你的？"
            : "Hello, I am Hippox AI Runtime. How can I help you?",
        timestamp: new Date().toLocaleTimeString(),
      },
    ];
    try {
      await sessionCommands.createSession(
        newSessionId,
        language === "zh" ? "新对话" : "New Session",
        language === "zh" ? "新创建的对话" : "Newly created session",
        welcomeMessage,
        [],
      );
      setCurrentSessionId(newSessionId);
      localStorage.setItem("hippox-current-session", newSessionId);
      setChatMessages(welcomeMessage);
      setCurrentSessionTasks([]);
      setActiveTasks(new Map());
      window.dispatchEvent(new CustomEvent("session-created"));
    } catch (error) {
      console.error("Failed to create new session:", error);
    }
  };

  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    try {
      if (currentSessionId) {
        await sessionCommands.saveChatContent(currentSessionId, chatMessages);
        await sessionCommands.saveTerminalContent(
          currentSessionId,
          currentSessionTasks,
        );
      }
      const chatContent = await sessionCommands.loadChatContent(sessionId);
      const terminalContent =
        await sessionCommands.loadTerminalContent(sessionId);
      setCurrentSessionId(sessionId);
      localStorage.setItem("hippox-current-session", sessionId);
      if (chatContent && chatContent.length > 0) {
        setChatMessages(chatContent);
      } else {
        setChatMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              language === "zh"
                ? "你好，我是 Hippox AI 运行时。有什么可以帮你的？"
                : "Hello, I am Hippox AI Runtime. How can I help you?",
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
      if (terminalContent && terminalContent.length > 0) {
        setCurrentSessionTasks(terminalContent);
        const taskMap = new Map();
        terminalContent.forEach((task: TaskInfo) =>
          taskMap.set(task.task_id, task),
        );
        setActiveTasks(taskMap);
      } else {
        setCurrentSessionTasks([]);
        setActiveTasks(new Map());
      }
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
  };

  useEffect(() => {
    const unlistenStep = listen("task_step_update", (event: any) => {
      const { task_id, step_name, step_index, status, output, error } =
        event.payload;
      setActiveTasks((prev) => {
        const newMap = new Map(prev);
        const task = newMap.get(task_id);
        if (task) {
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
          const updatedTask = {
            ...task,
            steps,
            updated_at: new Date().toISOString(),
          };
          newMap.set(task_id, updatedTask);
          setCurrentSessionTasks(Array.from(newMap.values()));
        }
        return newMap;
      });
    });

    const unlistenComplete = listen("task_complete", (event: any) => {
      const { task_id, final_output } = event.payload;
      setActiveTasks((prev) => {
        const newMap = new Map(prev);
        const task = newMap.get(task_id);
        if (task) {
          const updatedTask = {
            ...task,
            status: "completed",
            final_output,
            updated_at: new Date().toISOString(),
          };
          newMap.set(task_id, updatedTask);
          setCurrentSessionTasks(Array.from(newMap.values()));
        }
        return newMap;
      });
      setChatMessages((prev) => {
        const newMessages = [...prev];
        const pendingIndex = newMessages.findIndex(
          (msg) => msg.id === `pending_${task_id}`,
        );
        const successMessage =
          language === "zh" ? "✅ 任务已完成" : "✅ Task completed";
        if (pendingIndex !== -1) {
          newMessages[pendingIndex] = {
            id: `response_${task_id}`,
            role: "assistant",
            content: successMessage,
            timestamp: new Date().toLocaleTimeString(),
          };
        } else {
          newMessages.push({
            id: `response_${task_id}`,
            role: "assistant",
            content: successMessage,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
        return newMessages;
      });
    });

    const unlistenFailed = listen("task_failed", (event: any) => {
      const { task_id, error } = event.payload;
      setActiveTasks((prev) => {
        const newMap = new Map(prev);
        const task = newMap.get(task_id);
        if (task) {
          const updatedTask = {
            ...task,
            status: "failed",
            final_output: error,
            updated_at: new Date().toISOString(),
          };
          newMap.set(task_id, updatedTask);
          setCurrentSessionTasks(Array.from(newMap.values()));
        }
        return newMap;
      });
      setChatMessages((prev) => {
        const newMessages = [...prev];
        const pendingIndex = newMessages.findIndex(
          (msg) => msg.id === `pending_${task_id}`,
        );
        const errorMessage =
          language === "zh" ? "❌ 任务执行失败" : "❌ Task execution failed";
        if (pendingIndex !== -1) {
          newMessages[pendingIndex] = {
            id: `error_${task_id}`,
            role: "assistant",
            content: errorMessage,
            timestamp: new Date().toLocaleTimeString(),
          };
        } else {
          newMessages.push({
            id: `error_${task_id}`,
            role: "assistant",
            content: errorMessage,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
        return newMessages;
      });
    });

    return () => {
      unlistenStep.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
      unlistenFailed.then((fn) => fn());
    };
  }, [language]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const tasks = await hippoxCommands.getSessionTasks();
        const taskMap = new Map();
        tasks.forEach((task) => taskMap.set(task.task_id, task));
        setActiveTasks(taskMap);
        setCurrentSessionTasks(tasks);
      } catch (error) {
        console.error("load tasks error:", error);
      }
    };
    loadTasks();
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

  const handleSaveConfig = async (config: any) => {
    console.log("config saved:", config);
  };

  const handleSendMessage = async (userMessage: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date().toLocaleTimeString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    try {
      const taskId = await hippoxCommands.sendMessageAsync(userMessage);
      const newTask: TaskInfo = {
        task_id: taskId,
        session_id: currentSessionId,
        user_input: userMessage,
        status: "pending",
        steps: [],
        final_output: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCurrentSessionTasks((prev) => [...prev, newTask]);
      setActiveTasks((prev) => {
        const newMap = new Map(prev);
        newMap.set(taskId, newTask);
        return newMap;
      });
      const pendingMsg: ChatMessage = {
        id: `pending_${taskId}`,
        role: "assistant",
        content: `⏳ ${language === "zh" ? "任务已提交" : "Task submitted"} ${taskId.slice(0, 8)}...`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatMessages((prev) => [...prev, pendingMsg]);
    } catch (error) {
      console.error("send message error:", error);
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `${language === "zh" ? "发送失败" : "Send failed"}: ${error}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
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
      setChatMessages([
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            language === "zh"
              ? "会话已重置。Hippox 运行时重新就绪，自主决策引擎已刷新。"
              : "Session reset. Hippox runtime ready, decision engine refreshed.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setActiveTasks(new Map());
      setCurrentSessionTasks([]);
    } catch (error) {
      console.error("reset session error:", error);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  if (isLoading || !isConfigLoaded) {
    return (
      <div
        className="App"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div>{t("atomicSkills.loading") || "加载中..."}</div>
      </div>
    );
  }

  return (
    <div className="App">
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        currentTheme={theme}
        onToggleTheme={handleToggleTheme}
        currentLanguage={language}
        onToggleLanguage={handleToggleLanguage}
        t={t}
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
        <ResizablePanels
          leftPanel={
            <TerminalPanel
              logs={executionLogs}
              onClearLogs={clearLogs}
              t={t}
              activeTasks={currentSessionTasks}
            />
          }
          rightPanel={
            <ChatPanel
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              t={t}
            />
          }
        />
      </div>
      <BottomBar t={t} />
    </div>
  );
}

export default App;
