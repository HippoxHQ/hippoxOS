import React, { useState, useRef, useCallback, useEffect } from "react";
import CustomDragCursor from "../../components/CustomDragCursor";
import GlobalDragOverlay from "../../components/GlobalDragOverlay";
import BottomBar from "../../components/BottomBar";
import Dialog from "../../components/Dialog";
import MenuPanel from "../../components/MenuPanel";
import Sidebar from "../../components/Sidebar";
import Toast from "../../components/Toast";
import TopBar from "../../components/TopBar";
import WelcomePage from "../../pages/WelcomePage";
import { ContentPanelView } from "../hooks/useMenuPanel";
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
import ScheduledTasksManager from "../../pages/ScheduledTasksPage";
import SkillsManager from "../../pages/SkillsManagerPage";
import UserProfile from "../../pages/UserProfilePage";
import FunctionPanel from "../../components/FunctionPanel/FunctionPanel";
import { FunctionPanelController } from "../../components/FunctionPanel/hooks/useFunctionPanelController";
import CodeEditorPage from "../../pages/CodeEditorPage";
import ChartPage from "../../pages/ChartChatPage";
import MapsPage from "../../pages/MapsChatPage";
import ChatPanel from "../../pages/GeneralChatPage/ChatPanel";
import TerminalPanel from "../../pages/GeneralChatPage/TerminalPanel";
import GeneralChatPage from "../../pages/GeneralChatPage";

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
    workflowMode?: string,
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
  functionPanelPosition: "left" | "right";
  onFunctionPanelPositionChange: (position: "left" | "right") => void;
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
  functionPanelPosition,
  onFunctionPanelPositionChange,
  onSendSkillMessage,
  functionPanel,
}: AppContentProps) {
  const showWelcome = shouldShowWelcome();
  const [functionPanelWidth, setFunctionPanelWidth] = useState<number>(480);
  const [functionPanelCollapsed, setFunctionPanelCollapsed] =
    useState<boolean>(false);
  const [isFunctionPanelMaximized, setIsFunctionPanelMaximized] =
    useState(false);
  const [prevMaximizedState, setPrevMaximizedState] = useState<boolean>(false);
  const [isFuncPanelResizeHover, setIsFuncPanelResizeHover] = useState(false);
  const [isMenuResizeHover, setIsMenuResizeHover] = useState(false);
  const isDraggingFunctionPanel = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    const handleToggleMaximize = () => {
      setIsFunctionPanelMaximized((prev) => !prev);
    };
    window.addEventListener(
      "toggle-function-panel-maximize",
      handleToggleMaximize,
    );
    return () => {
      window.removeEventListener(
        "toggle-function-panel-maximize",
        handleToggleMaximize,
      );
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("hippox-function-panel-width");
    if (saved) {
      const w = parseFloat(saved);
      if (!isNaN(w) && w > 0) setFunctionPanelWidth(w);
    }
    const savedCollapsed = localStorage.getItem(
      "hippox-function-panel-collapsed",
    );
    if (savedCollapsed) {
      setFunctionPanelCollapsed(savedCollapsed === "true");
    }
  }, []);

  useEffect(() => {
    if (currentContentPanel === "generalChat") {
      onCloseContentPanel();
    }
  }, [currentContentPanel, onCloseContentPanel]);

  const handleToggleFunctionPanelMaximize = useCallback(() => {
    setIsFunctionPanelMaximized((prev) => !prev);
  }, []);

  const saveFunctionPanelWidth = useCallback((w: number) => {
    localStorage.setItem("hippox-function-panel-width", w.toString());
  }, []);

  const saveFunctionPanelCollapsed = useCallback((collapsed: boolean) => {
    localStorage.setItem(
      "hippox-function-panel-collapsed",
      collapsed.toString(),
    );
  }, []);

  const handleToggleFunctionPanelCollapse = useCallback(() => {
    setFunctionPanelCollapsed((prev) => {
      const newState = !prev;
      saveFunctionPanelCollapsed(newState);
      if (newState) {
        setPrevMaximizedState(isFunctionPanelMaximized);
        if (isFunctionPanelMaximized) {
          setIsFunctionPanelMaximized(false);
        }
      } else {
        if (prevMaximizedState) {
          setIsFunctionPanelMaximized(true);
        }
      }
      return newState;
    });
  }, [
    saveFunctionPanelCollapsed,
    isFunctionPanelMaximized,
    prevMaximizedState,
  ]);

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
      const delta = e.clientX - dragStartX.current;
      const adjustedDelta = functionPanelPosition === "right" ? -delta : delta;
      const newWidth = Math.min(
        800,
        Math.max(320, dragStartWidth.current + adjustedDelta),
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
  }, [functionPanelWidth, saveFunctionPanelWidth, functionPanelPosition]);

  useEffect(() => {
    const handleSessionSwitch = () => {
      if (isFunctionPanelMaximized) {
        setIsFunctionPanelMaximized(false);
        setFunctionPanelWidth((prev) => prev);
      }
    };
    window.addEventListener("session-created", handleSessionSwitch);
    return () => {
      window.removeEventListener("session-created", handleSessionSwitch);
    };
  }, [isFunctionPanelMaximized]);

  useEffect(() => {
    if (isFunctionPanelMaximized) {
      setIsFunctionPanelMaximized(false);
    }
  }, [currentContentPanel]);

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
      width: "1px",
      background: "var(--border-color)",
      cursor: "col-resize" as const,
      position: "relative" as const,
      flexShrink: 0,
      transition: "width 0.15s, background 0.15s",
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
      opacity: 0.5,
      zIndex: 11,
    },
    functionPanelResizeHandle: {
      width: "1px",
      background: "var(--border-color)",
      cursor: "col-resize" as const,
      flexShrink: 0,
      position: "relative" as const,
      transition: "width 0.15s, background 0.15s",
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
      opacity: 0.5,
      zIndex: 11,
    },
  };

  const renderMainLayout = () => {
    const isChatPage =
      !currentContentPanel || currentContentPanel === "generalChat";
    const isMapPage = currentContentPanel === "mapChat";
    const isChartPage = currentContentPanel === "chartChat";
    let contentElement: React.ReactNode;
    if (isChatPage) {
      if (showWelcome && !currentContentPanel) {
        contentElement = (
          <WelcomePage
            onSendMessage={(msg, files, workflowMode) =>
              onSendMessage(msg, currentSessionId, files, workflowMode)
            }
            t={t}
            onDragOverInputChange={setIsDraggingOverInput}
          />
        );
      } else {
        contentElement = (
          <GeneralChatPage
            layoutMode="horizontal"
            onLayoutModeChange={() => {}}
            leftTitle={t("chat.title") || "Chat"}
            rightTitle={t("terminal.title") || "Terminal"}
            leftIcon="💬"
            rightIcon="🖥️"
            isFunctionPanelMaximized={
              functionPanel.isOpen ? isFunctionPanelMaximized : false
            }
            currentSessionId={currentSessionId}
            onSwitchSession={onSwitchSession}
            onCloseSkillsManager={onCloseContentPanel}
            t={t}
          />
        );
      }
    } else if (isMapPage) {
      contentElement = (
        <MapsPage
          layoutMode="horizontal"
          onLayoutModeChange={() => {}}
          leftTitle={t("chat.title") || "Chat"}
          rightTitle="Map"
          leftIcon="💬"
          rightIcon="🗺️"
          isFunctionPanelMaximized={
            functionPanel.isOpen ? isFunctionPanelMaximized : false
          }
          currentSessionId={currentSessionId}
          onSwitchSession={onSwitchSession}
          onCloseSkillsManager={onCloseContentPanel}
          t={t}
          theme={theme === "dark" ? "dark" : "light"}
          i18n={language === "zh" ? "zh-cn" : "en"}
        />
      );
    } else if (isChartPage) {
      contentElement = (
        <ChartPage
          layoutMode="horizontal"
          onLayoutModeChange={() => {}}
          leftTitle={t("chat.title") || "Chat"}
          rightTitle="Chart"
          leftIcon="💬"
          rightIcon="📊"
          isFunctionPanelMaximized={
            functionPanel.isOpen ? isFunctionPanelMaximized : false
          }
          currentSessionId={currentSessionId}
          onSwitchSession={onSwitchSession}
          onCloseSkillsManager={onCloseContentPanel}
          t={t}
          theme={theme === "dark" ? "dark" : "light"}
          i18n={language === "zh" ? "zh-cn" : "en"}
        />
      );
    } else {
      switch (currentContentPanel) {
        case "codeEditorChat":
          contentElement = (
            <CodeEditorPage
              layoutMode="horizontal"
              onLayoutModeChange={() => {}}
              leftTitle={t("chat.title") || "Chat"}
              rightTitle={t("codeEditor.title") || "Code Editor"}
              leftIcon="💬"
              rightIcon="💻"
              isFunctionPanelMaximized={
                functionPanel.isOpen ? isFunctionPanelMaximized : false
              }
              currentSessionId={currentSessionId}
              onSwitchSession={onSwitchSession}
              onCloseSkillsManager={onCloseContentPanel}
              t={t}
              theme={theme === "dark" ? "dark" : "light"}
              i18n={language === "zh" ? "zh-cn" : "en"}
              onSendMessage={onSendMessage}
              onFileClick={handleFileClick}
              language={language}
              onDragOverInputChange={setIsDraggingOverInput}
              executionLogs={executionLogs}
              onClearLogs={onClearLogs}
            />
          );
          break;
        case "taskQueue":
          contentElement = <TaskQueuePanel t={t} />;
          break;
        case "workspace":
          contentElement = <WorkspacePanel t={t} />;
          break;
        case "workspaceConfig":
          contentElement = (
            <WorkspaceConfig t={t} onSaveWorkspace={onSaveConfig} />
          );
          break;
        case "logs":
          contentElement = <LogsPanel t={t} onClose={onCloseContentPanel} />;
          break;
        case "storage":
          contentElement = <StorageConfig t={t} onSave={onSaveConfig} />;
          break;
        case "settings":
          contentElement = (
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
          break;
        case "engine_group":
          contentElement = renderEngineConfig();
          break;
        case "skillsManager":
          contentElement = (
            <SkillsManager
              t={t}
              onClose={onCloseContentPanel}
              currentSessionId={currentSessionId}
              onSendSkillMessage={onSendSkillMessage}
            />
          );
          break;
        case "scheduledTasks":
          contentElement = (
            <ScheduledTasksManager
              t={t}
              onClose={onCloseContentPanel}
              currentSessionId={currentSessionId}
            />
          );
          break;
        case "userProfile":
          contentElement = (
            <UserProfile
              t={t}
              onClose={onCloseContentPanel}
              currentSessionId={currentSessionId}
            />
          );
          break;
        default:
          contentElement = null;
      }
    }
    const renderResizeHandle = () => (
      <div
        className="resize-handle resize-handle-vertical"
        onMouseDown={handleFunctionPanelResizeMouseDown}
        style={{
          ...styles.functionPanelResizeHandle,
          width: "3px",
          background: isFuncPanelResizeHover
            ? "var(--scrollbar-thumb)"
            : "var(--border-color)",
        }}
        onMouseEnter={() => setIsFuncPanelResizeHover(true)}
        onMouseLeave={() => setIsFuncPanelResizeHover(false)}
      >
        {isFuncPanelResizeHover && (
          <div
            style={styles.functionPanelResizeHandleLine}
            className="function-panel-handle-line"
          />
        )}
      </div>
    );
    const renderFunctionPanelComponent = (collapsed: boolean) => (
      <FunctionPanel
        controller={functionPanel}
        theme={theme}
        i18n={language === "zh" ? "zh-cn" : "en"}
        t={t}
        currentSessionId={currentSessionId}
        onSendSkillMessage={onSendSkillMessage}
        width={isFunctionPanelMaximized ? "100%" : functionPanelWidth}
        isCollapsed={collapsed}
        onToggleCollapse={handleToggleFunctionPanelCollapse}
        functionPanelPosition={functionPanelPosition}
        isMaximized={isFunctionPanelMaximized}
        onToggleMaximize={handleToggleFunctionPanelMaximize}
      />
    );
    if (!functionPanel.isOpen) {
      if (isFunctionPanelMaximized) {
        setIsFunctionPanelMaximized(false);
      }
      return <div style={styles.contentArea}>{contentElement}</div>;
    }
    if (isFunctionPanelMaximized) {
      return (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {renderFunctionPanelComponent(functionPanelCollapsed)}
        </div>
      );
    }
    const functionPanelElement = renderFunctionPanelComponent(
      functionPanelCollapsed,
    );
    const resizeHandle = functionPanelCollapsed ? null : renderResizeHandle();
    if (functionPanelPosition === "left") {
      return (
        <>
          {functionPanelElement}
          {resizeHandle}
          <div style={styles.contentArea}>{contentElement}</div>
        </>
      );
    } else {
      return (
        <>
          <div style={styles.contentArea}>{contentElement}</div>
          {resizeHandle}
          {functionPanelElement}
        </>
      );
    }
  };

  return (
    <div className="App">
      <style>{`
        .menu-panel-resize-handle {
          position: relative;
          z-index: 1;
        }
        .menu-panel-resize-handle::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
        .resize-handle-vertical {
          position: relative;
          z-index: 1;
        }
        .resize-handle-vertical::after {
          content: '';
          position: absolute;
          top: -10px;
          left: -8px;
          right: -8px;
          bottom: -10px;
          cursor: col-resize;
          z-index: 10;
        }
      `}</style>
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
        functionPanelPosition={functionPanelPosition}
        onFunctionPanelPositionChange={onFunctionPanelPositionChange}
        onSwitchSession={onSwitchSession}
        currentSessionId={currentSessionId}
        onFileClick={handleFileClick}
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
                layoutSwapMode={layoutSwapMode}
                onLayoutSwapModeChange={onLayoutSwapModeChange}
                functionPanelPosition={functionPanelPosition}
                onFunctionPanelPositionChange={onFunctionPanelPositionChange}
                onFileClick={handleFileClick}
              />
            </div>
            <div
              className="menu-panel-resize-handle"
              style={{
                width: "3px",
                background: isMenuResizeHover
                  ? "var(--scrollbar-thumb)"
                  : "var(--border-color)",
                cursor: "col-resize",
                flexShrink: 0,
                position: "relative",
                transition: "width 0.15s, background 0.15s",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = menuPanelWidth;
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const newWidth = startWidth + (moveEvent.clientX - startX);
                  if (newWidth >= 0 && newWidth <= 300) {
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
              onMouseEnter={() => setIsMenuResizeHover(true)}
              onMouseLeave={() => setIsMenuResizeHover(false)}
            >
              {isMenuResizeHover && (
                <div style={styles.handleLine} className="handle-line" />
              )}
            </div>
          </>
        )}
        {renderMainLayout()}
      </div>
      <BottomBar t={t} />
    </div>
  );
}
