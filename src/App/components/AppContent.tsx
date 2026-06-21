import React, { useState, useEffect, useRef, useCallback } from "react";
import CustomDragCursor from "../../components/CustomDragCursor";
import GlobalDragOverlay from "../../components/GlobalDragOverlay";
import BottomBar from "../../components/BottomBar";
import ChatPanel from "../../components/ChatPanel";
import Dialog from "../../components/Dialog";
import MenuPanel from "../../components/MenuPanel";
import Sidebar from "../../components/Sidebar";
import TerminalPanel from "../../components/TerminalPanel";
import Toast from "../../components/Toast";
import TopBar from "../../components/TopBar";
import WelcomePage from "../../pages/WelcomePage";
import { ContentPanelView } from "../hooks/useMenuPanel";
import HistoryPanel from "../../components/MenuPanel/HistoryChatPanel";
import TaskQueuePanel from "../../components/MenuPanel/TaskQueuePanel";
import WorkspacePanel from "../../components/MenuPanel/Workspace";
import WorkspaceConfig from "../../components/MenuPanel/SystemConfig/WorkspaceConfig";
import LogsPanel from "../../components/MenuPanel/LogsPanel";
import StorageConfig from "../../components/MenuPanel/SystemConfig/StorageConfig";
import SettingsPanel, {
  SettingsSubView,
} from "../../components/MenuPanel/SettingsPanel";
import EngineContainerPanel from "../../components/MenuPanel/EngineConfig/EngineContainerPanel";
import EngineDatabasePanel from "../../components/MenuPanel/EngineConfig/EngineDatabasePanel";
import EngineNetworkPanel from "../../components/MenuPanel/EngineConfig/EngineNetworkPanel";
import EngineNotificationPanel from "../../components/MenuPanel/EngineConfig/EngineNotificationPanel";
import { Language, Theme } from "../../types/types";
import { UploadFile } from "../../core/types";
import HistoryChatDropdown from "../../components/HistoryChatDropdown";
import LLMChatPage from "../../pages/LLMChatPage";
import ScheduledTasksManager from "../../pages/ScheduledTasksPage";
import SkillsManager from "../../pages/SkillsManagerPage";
import UserProfile from "../../pages/UserProfilePage";
import FunctionPanel from "../../components/FunctionPanel/FunctionPanel";
import { FunctionPanelController } from "../../components/FunctionPanel/hooks/useFunctionPanelController";

interface AppContentProps {
  theme: Theme;
  onToggleTheme: () => void;
  language: Language;
  onToggleLanguage: () => void;
  t: (key: string) => string;
  currentSessionId: string;
  isLoading: boolean;
  onNewSession: () => void;
  onSwitchSession: (sessionId: string) => void;
  onSendMessage: (
    message: string,
    sessionId: string,
    files?: UploadFile[],
  ) => void;
  onResetSession: () => void;
  shouldShowWelcome: () => boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  menuPanelView: any;
  settingsSubView: SettingsSubView;
  engineSubView: any;
  menuPanelWidth: number;
  setMenuPanelWidth: (width: number) => void;
  currentContentPanel: ContentPanelView;
  onMenuClick: (view: string, subView?: string) => void;
  onCloseMenuPanel: () => void;
  onOpenSkillsManager: () => void;
  onCloseSkillsManager: () => void;
  onCloseScheduledTasks: () => void;
  onCloseUserProfile: () => void;
  onCloseContentPanel: () => void;
  onSaveConfig: (config: any) => void;
  initialEngineConfig: any;
  isFilePreviewOpen: boolean;
  previewFile: UploadFile | null;
  onFilePreview: (file: UploadFile) => void;
  onCloseFilePreview: () => void;
  executionLogs: any[];
  onClearLogs: () => void;
  isGlobalDragging: boolean;
  isDraggingOverInput: boolean;
  setIsDraggingOverInput: (value: boolean) => void;
  showDragCursor: boolean;
  layoutSwapMode: "terminal-left" | "chat-left";
  onLayoutSwapModeChange: (mode: "terminal-left" | "chat-left") => void;
  onSendSkillMessage: (message: string, files?: UploadFile[]) => void;
  functionPanel: FunctionPanelController;
}

export function AppContent({
  theme,
  onToggleTheme,
  language,
  onToggleLanguage,
  t,
  currentSessionId,
  isLoading,
  onNewSession,
  onSwitchSession,
  onSendMessage,
  onResetSession,
  shouldShowWelcome,
  sidebarCollapsed,
  onToggleSidebar,
  menuPanelView,
  settingsSubView,
  engineSubView,
  menuPanelWidth,
  setMenuPanelWidth,
  currentContentPanel,
  onMenuClick,
  onCloseMenuPanel,
  onOpenSkillsManager,
  onCloseSkillsManager,
  onCloseScheduledTasks,
  onCloseUserProfile,
  onCloseContentPanel,
  onSaveConfig,
  initialEngineConfig,
  isFilePreviewOpen,
  previewFile,
  onFilePreview,
  onCloseFilePreview,
  executionLogs,
  onClearLogs,
  isGlobalDragging,
  isDraggingOverInput,
  setIsDraggingOverInput,
  showDragCursor,
  layoutSwapMode,
  onLayoutSwapModeChange,
  onSendSkillMessage,
  functionPanel,
}: AppContentProps) {
  const showWelcome = shouldShowWelcome();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyAnchor, setHistoryAnchor] = useState<HTMLElement | null>(null);
  const [functionPanelWidth, setFunctionPanelWidth] = useState<number>(480);
  const isDraggingFunctionPanel = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  useEffect(() => {
    const saved = localStorage.getItem("hippox-function-panel-width");
    if (saved) {
      const w = parseFloat(saved);
      if (!isNaN(w) && w > 0) setFunctionPanelWidth(w);
    }
  }, []);
  const saveFunctionPanelWidth = useCallback((w: number) => {
    localStorage.setItem("hippox-function-panel-width", w.toString());
  }, []);
  const handleFunctionPanelResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingFunctionPanel.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = functionPanelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [functionPanelWidth],
  );
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingFunctionPanel.current) return;
      const delta = dragStartX.current - e.clientX;
      const newWidth = Math.min(
        800,
        Math.max(320, dragStartWidth.current + delta),
      );
      if (newWidth !== functionPanelWidth) {
        setFunctionPanelWidth(newWidth);
        saveFunctionPanelWidth(newWidth);
      }
    };
    const onMouseUp = () => {
      if (isDraggingFunctionPanel.current) {
        isDraggingFunctionPanel.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [functionPanelWidth, saveFunctionPanelWidth]);
  const handleHistoryClick = () => {
    setIsHistoryOpen(!isHistoryOpen);
  };
  const handleHistoryClose = () => {
    setIsHistoryOpen(false);
  };
  const handleFileClick = (file: UploadFile) => {
    onFilePreview(file);
    functionPanel.openPreview(file);
  };

  const leftPanelContent =
    layoutSwapMode === "terminal-left" ? (
      <TerminalPanel
        logs={executionLogs}
        onClearLogs={onClearLogs}
        t={t}
        currentSessionId={currentSessionId}
        onFileClick={handleFileClick}
        isLeftPanel={true}
      />
    ) : (
      <ChatPanel
        onSendMessage={onSendMessage}
        onFileClick={handleFileClick}
        t={t}
        currentSessionId={currentSessionId}
        onDragOverInputChange={setIsDraggingOverInput}
        language={language}
        isLeftPanel={true}
      />
    );

  const rightPanelContent =
    layoutSwapMode === "terminal-left" ? (
      <ChatPanel
        onSendMessage={onSendMessage}
        onFileClick={handleFileClick}
        t={t}
        currentSessionId={currentSessionId}
        onDragOverInputChange={setIsDraggingOverInput}
        language={language}
        isLeftPanel={false}
      />
    ) : (
      <TerminalPanel
        logs={executionLogs}
        onClearLogs={onClearLogs}
        t={t}
        currentSessionId={currentSessionId}
        onFileClick={handleFileClick}
        isLeftPanel={false}
      />
    );

  const renderEngineConfig = () => {
    switch (engineSubView) {
      case "engine_database":
        return (
          <EngineDatabasePanel
            t={t}
            initialConfig={initialEngineConfig}
            onSave={onSaveConfig}
          />
        );
      case "engine_network":
        return (
          <EngineNetworkPanel
            t={t}
            initialConfig={initialEngineConfig}
            onSave={onSaveConfig}
          />
        );
      case "engine_container":
        return (
          <EngineContainerPanel
            t={t}
            initialConfig={initialEngineConfig}
            onSave={onSaveConfig}
          />
        );
      case "engine_notification":
        return (
          <EngineNotificationPanel
            t={t}
            initialConfig={initialEngineConfig}
            onSave={onSaveConfig}
          />
        );
      default:
        return null;
    }
  };
  const renderContent = () => {
    switch (currentContentPanel) {
      case "history":
        return (
          <HistoryPanel
            t={t}
            onSessionSelect={onSwitchSession}
            currentSessionId={currentSessionId}
            onCloseSkillsManager={onCloseContentPanel}
          />
        );
      case "taskQueue":
        return <TaskQueuePanel t={t} />;
      case "workspace":
        return <WorkspacePanel t={t} />;
      case "workspaceConfig":
        return <WorkspaceConfig t={t} onSaveWorkspace={onSaveConfig} />;
      case "logs":
        return <LogsPanel t={t} onClose={onCloseContentPanel} />;
      case "storage":
        return <StorageConfig t={t} onSave={onSaveConfig} />;
      case "settings":
        return (
          <SettingsPanel
            subView={settingsSubView || "llmModel"}
            t={t}
            onSave={onSaveConfig}
            theme={theme}
            language={language}
            onThemeChange={onToggleTheme}
            onLanguageChange={onToggleLanguage}
            isInitializing={false}
          />
        );
      case "engine_group":
        return renderEngineConfig();
      case "skillsManager":
        return (
          <SkillsManager
            t={t}
            onClose={onCloseSkillsManager}
            currentSessionId={currentSessionId}
          />
        );
      case "scheduledTasks":
        return (
          <ScheduledTasksManager
            t={t}
            onClose={onCloseScheduledTasks}
            currentSessionId={currentSessionId}
          />
        );
      case "userProfile":
        return (
          <UserProfile
            t={t}
            onClose={onCloseUserProfile}
            currentSessionId={currentSessionId}
          />
        );
      default:
        return null;
    }
  };
  const styles = {
    mainLayout: {
      display: "flex" as const,
      flex: 1,
      overflow: "hidden" as const,
    },
    contentArea: {
      flex: 1,
      overflow: "hidden" as const,
      display: "flex" as const,
      flexDirection: "column" as const,
    },
    resizeHandle: {
      width: "4px",
      background: "var(--border-color)",
      cursor: "col-resize" as const,
      transition: "all 0.2s",
      position: "relative" as const,
      flexShrink: 0,
    },
    handleLine: {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "2px",
      height: "40px",
      background: "var(--text-muted)",
      borderRadius: "2px",
      transition: "background 0.2s",
    },
    functionPanelResizeHandle: {
      width: "4px",
      background: "var(--border-color)",
      cursor: "col-resize" as const,
      flexShrink: 0,
      position: "relative" as const,
      transition: "background 0.2s",
    },
    functionPanelResizeHandleLine: {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "2px",
      height: "40px",
      background: "var(--text-muted)",
      borderRadius: "2px",
      transition: "background 0.2s",
    },
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
        onToggleSidebar={onToggleSidebar}
        onNewSession={onNewSession}
        currentTheme={theme}
        onToggleTheme={onToggleTheme}
        currentLanguage={language}
        onToggleLanguage={onToggleLanguage}
        t={t}
        layoutSwapMode={layoutSwapMode}
        onLayoutSwapModeChange={onLayoutSwapModeChange}
        onSwitchSession={onSwitchSession}
        currentSessionId={currentSessionId}
        onHistoryClick={handleHistoryClick}
        isHistoryOpen={isHistoryOpen}
      />
      <HistoryChatDropdown
        isOpen={isHistoryOpen}
        onClose={handleHistoryClose}
        t={t}
        onSessionSelect={onSwitchSession}
        currentSessionId={currentSessionId}
        anchorElement={historyAnchor}
      />
      <div style={styles.mainLayout}>
        {!sidebarCollapsed && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onResetSession={onResetSession}
            onClearLogs={onClearLogs}
            onMenuClick={onMenuClick}
            onNewSession={onNewSession}
            currentSessionId={currentSessionId}
            onSwitchSession={onSwitchSession}
            onOpenSkillsManager={onOpenSkillsManager}
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
                onClose={onCloseMenuPanel}
                onSaveConfig={onSaveConfig}
                t={t}
                theme={theme}
                language={language}
                onThemeChange={onToggleTheme}
                onLanguageChange={onToggleLanguage}
                isInitializing={false}
                currentSessionId={currentSessionId}
                onSwitchSession={onSwitchSession}
                initialEngineConfig={initialEngineConfig}
                onCloseSkillsManager={onCloseContentPanel}
                onSendSkillMessage={onSendSkillMessage}
              />
            </div>
            <div
              style={styles.resizeHandle}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--scrollbar-thumb)";
                const line = e.currentTarget.querySelector(
                  ".handle-line",
                ) as HTMLElement;
                if (line) line.style.background = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--border-color)";
                const line = e.currentTarget.querySelector(
                  ".handle-line",
                ) as HTMLElement;
                if (line) line.style.background = "var(--text-muted)";
              }}
            >
              <div style={styles.handleLine} className="handle-line"></div>
            </div>
          </>
        )}
        <div style={styles.contentArea}>
          {currentContentPanel ? (
            renderContent()
          ) : showWelcome ? (
            <WelcomePage
              onSendMessage={(msg, files) =>
                onSendMessage(msg, currentSessionId, files)
              }
              t={t}
              onDragOverInputChange={setIsDraggingOverInput}
            />
          ) : (
            <LLMChatPage
              leftPanel={leftPanelContent}
              rightPanel={rightPanelContent}
              layoutMode="horizontal"
              onLayoutModeChange={() => {}}
              leftTitle={
                layoutSwapMode === "terminal-left" ? "Terminal" : "Chat"
              }
              rightTitle={
                layoutSwapMode === "terminal-left" ? "Chat" : "Terminal"
              }
              leftIcon={layoutSwapMode === "terminal-left" ? "🖥️" : "💬"}
              rightIcon={layoutSwapMode === "terminal-left" ? "💬" : "🖥️"}
            />
          )}
        </div>
        {functionPanel.isOpen && (
          <>
            <div
              className="resize-handle resize-handle-vertical"
              onMouseDown={handleFunctionPanelResizeMouseDown}
              style={styles.functionPanelResizeHandle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--scrollbar-thumb)";
                const line = e.currentTarget.querySelector(
                  ".function-panel-handle-line",
                ) as HTMLElement;
                if (line) line.style.background = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--border-color)";
                const line = e.currentTarget.querySelector(
                  ".function-panel-handle-line",
                ) as HTMLElement;
                if (line) line.style.background = "var(--text-muted)";
              }}
            >
              <div
                style={styles.functionPanelResizeHandleLine}
                className="function-panel-handle-line"
              />
            </div>
            <FunctionPanel
              controller={functionPanel}
              theme={theme}
              i18n={language === "zh" ? "zh-cn" : "en"}
              t={t}
              currentSessionId={currentSessionId}
              onSendSkillMessage={onSendSkillMessage}
              width={functionPanelWidth}
            />
          </>
        )}
      </div>
      <BottomBar t={t} />
    </div>
  );
}
