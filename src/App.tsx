import React, { useState, useEffect } from "react";
import ChatPanel from "./components/ChatPanel";
import ResizablePanels from "./components/ResizablePanels";
import Sidebar from "./components/Sidebar";
import TerminalPanel from "./components/TerminalPanel";
import MenuPanel, { MenuPanelView } from "./components/MenuPanel";
import TopBar from "./components/TopBar";
import BottomBar from "./components/BottomBar";
import { useTranslation } from "./hooks/useTranslation";
import { Theme, Language, ExecutionLog, ChatMessage, TaskInfo } from "./type";
import { SettingsSubView } from "./components/MenuPanel/SettingsPanel";
import { hippoxCommands } from "./api/chat";
import { listen } from "@tauri-apps/api/event";

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("hippox-theme") as Theme;
    return saved || "dark";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("hippox-theme", theme);
  }, [theme]);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("hippox-language") as Language;
    return saved || "en";
  });
  const { t } = useTranslation(language);
  const [menuPanelView, setMenuPanelView] = useState<MenuPanelView | null>(
    null,
  );
  const [settingsSubView, setSettingsSubView] =
    useState<SettingsSubView>("aiModel");
  const [menuPanelWidth, setMenuPanelWidth] = useState<number>(320);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "正在加载...",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [activeTasks, setActiveTasks] = useState<Map<string, TaskInfo>>(
    new Map(),
  );
  const [currentSessionTasks, setCurrentSessionTasks] = useState<TaskInfo[]>(
    [],
  );
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
            steps.push({
              step_index,
              step_name,
              status,
              output,
              error,
            });
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
        if (pendingIndex !== -1) {
          newMessages[pendingIndex] = {
            id: `response_${task_id}`,
            role: "assistant",
            content: final_output,
            timestamp: new Date().toLocaleTimeString(),
          };
        } else {
          newMessages.push({
            id: `response_${task_id}`,
            role: "assistant",
            content: final_output,
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
        if (pendingIndex !== -1) {
          newMessages[pendingIndex] = {
            id: `error_${task_id}`,
            role: "assistant",
            content: `❌ ${error}`,
            timestamp: new Date().toLocaleTimeString(),
          };
        } else {
          newMessages.push({
            id: `error_${task_id}`,
            role: "assistant",
            content: `❌ ${error}`,
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
  }, []);
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
    if (view === "settings") {
      setMenuPanelView("settings");
      setSettingsSubView((subView as SettingsSubView) || "aiModel");
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
        session_id: "default",
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
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };
  const toggleLanguage = async () => {
    const newLang = language === "zh" ? "en" : "zh";
    setLanguage(newLang);
    await hippoxCommands.setLanguage(newLang);
  };
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };
  return (
    <div className="App">
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        currentTheme={theme}
        onToggleTheme={toggleTheme}
        currentLanguage={language}
        onToggleLanguage={toggleLanguage}
        t={t}
      />
      <div className="main-layout">
        {!sidebarCollapsed && (
          <Sidebar
            collapsed={false}
            onResetSession={resetSession}
            onClearLogs={clearLogs}
            onMenuClick={handleMenuClick}
            t={t}
          />
        )}
        {menuPanelView && (
          <>
            <div className="menu-panel-left" style={{ width: menuPanelWidth }}>
              <MenuPanel
                currentView={menuPanelView}
                settingsSubView={settingsSubView}
                onClose={closeMenuPanel}
                onSaveConfig={handleSaveConfig}
                t={t}
                theme={theme}
                language={language}
                onThemeChange={toggleTheme}
                onLanguageChange={toggleLanguage}
                isInitializing={false}
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
