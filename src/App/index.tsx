import React, { useEffect } from "react";
import { useTheme } from "./hooks/useTheme";
import { useLanguage } from "./hooks/useLanguage";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useMenuPanel } from "./hooks/useMenuPanel";
import { useFilePreview } from "./hooks/useFilePreview";
import { useExecutionLogs } from "./hooks/useExecutionLogs";
import { useConfigLoader } from "./hooks/useConfigLoader";
import { useSession } from "./hooks/session/useGeneralChatSession";
import { useSidebar } from "./hooks/useSidebar";
import { useSystemEvents, useDirectoryEvents } from "./hooks/useSystemEvents";
import { useSearchEvents } from "./hooks/useSearchEvents";
import { AppContent } from "./components/AppContent";
import { taskManager } from "../core/TaskManager";
import { useTaskEvents } from "./hooks/useTaskEvents";
import { useLayoutSwapMode } from "./hooks/useLayoutSwapMode";
import { useDriverEvents } from "./hooks/useDriverEvents";
import { useSendSkillMessage } from "./hooks/useSendSkillMessage";
import { useFunctionPanelController } from "../components/FunctionPanel/hooks/useFunctionPanelController";
import { useFunctionPanelPosition } from "./hooks/useFunctionPanelPosition";
import { sessionCommands } from "../command/session/general";

function App() {
  const { isConfigLoaded, initialEngineConfig, initialTheme, initialLanguage } =
    useConfigLoader();
  const { theme, handleToggleTheme } = useTheme(initialTheme);
  const { language, handleToggleLanguage, t } = useLanguage(initialLanguage);
  const {
    menuPanelView,
    settingsSubView,
    engineSubView,
    menuPanelWidth,
    setMenuPanelWidth,
    currentContentPanel,
    closeContentPanel,
    resetToChat,
    switchMenuPanel,
    closeMenuPanel,
    switchContentArea,
  } = useMenuPanel();
  const {
    currentSessionId,
    isLoading,
    handleNewSession,
    handleSwitchSession,
    handleSendMessage,
    resetSession,
    shouldShowWelcome,
  } = useSession(language, isConfigLoaded);
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const { layoutSwapMode, handleLayoutSwapModeChange } = useLayoutSwapMode();
  const { functionPanelPosition, handleFunctionPanelPositionChange } =
    useFunctionPanelPosition();
  const {
    isFilePreviewOpen,
    previewFile,
    handleFilePreview,
    handleCloseFilePreview,
  } = useFilePreview();
  const { executionLogs, clearLogs } = useExecutionLogs();
  const {
    isGlobalDragging,
    isDraggingOverInput,
    setIsDraggingOverInput,
    showDragCursor,
  } = useDragAndDrop();
  const functionPanel = useFunctionPanelController();
  useTaskEvents(language);
  useDriverEvents(language);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleNewSessionWithClose = () => {
    resetToChat();
    handleNewSession();
  };

  useSystemEvents(
    handleNewSessionWithClose,
    () => switchMenuPanel("skillMarket"),
    () => switchMenuPanel("history"),
    () => switchMenuPanel("favorites"),
    () => switchContentArea("scheduledTasks"),
    (subView) => switchMenuPanel("settings", subView),
  );
  useDirectoryEvents();

  useEffect(() => {
    const handleSearchNewSession = () => {
      handleNewSessionWithClose();
    };
    window.addEventListener("search-new-session", handleSearchNewSession);
    return () => {
      window.removeEventListener("search-new-session", handleSearchNewSession);
    };
  }, [handleNewSessionWithClose]);

  useSearchEvents(() => switchMenuPanel("skillMarket"), handleSwitchSession);

  useEffect(() => {
    const onSwitchEvent = (e: CustomEvent) => {
      const sessionId = e.detail?.sessionId;
      if (sessionId) {
        handleSwitchSession(sessionId);
      }
    };
    window.addEventListener("switch-session", onSwitchEvent as EventListener);
    return () => {
      window.removeEventListener(
        "switch-session",
        onSwitchEvent as EventListener,
      );
    };
  }, [handleSwitchSession]);

  useEffect(() => {
    taskManager.setupTaskEventListeners();
  }, []);

  const handleSaveConfig = async (config: any) => {};

  const handleSidebarClick = async (view: string, subView?: string) => {
    if (view === "tasks_group") {
      switchContentArea("scheduledTasks");
      return;
    }
    if (
      view === "skillsManager" ||
      view === "scheduledTasks" ||
      view === "userProfile" ||
      view === "codeEditorChat" ||
      view === "chartChat" ||
      view === "mapChat"
    ) {
      switchContentArea(view);
      return;
    }
    if (view === "generalChat") {
      try {
        const sessions = await sessionCommands.listSessions();
        const sortedSessions = [...sessions].sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          const getTimestamp = (id: string) => {
            const ts = id.replace("session_", "");
            return parseInt(ts, 10) || 0;
          };
          const aTs = getTimestamp(a.session_id);
          const bTs = getTimestamp(b.session_id);
          return bTs - aTs;
        });
        if (sortedSessions.length > 0) {
          switchContentArea("generalChat");
          const latestSession = sortedSessions[0];
          if (currentSessionId !== latestSession.session_id) {
            await handleSwitchSession(latestSession.session_id);
          }
        } else {
          resetToChat();
          handleNewSession();
        }
      } catch (error) {
        console.error("Failed to load sessions:", error);
        resetToChat();
        handleNewSession();
      }
      return;
    }
    switchMenuPanel(view, subView);
  };

  const { onSendSkillMessage } = useSendSkillMessage({
    currentSessionId,
    currentContentPanel,
    closeContentPanel,
    handleNewSession,
    handleSendMessage,
    shouldShowWelcome,
  });

  if (!isConfigLoaded) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: initialTheme === "dark" ? "#1a1a1a" : "#f5f5f5",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <AppContent
      theme={theme}
      onToggleTheme={handleToggleTheme}
      language={language}
      onToggleLanguage={handleToggleLanguage}
      t={t}
      currentSessionId={currentSessionId}
      isLoading={isLoading}
      onNewSession={handleNewSessionWithClose}
      onSwitchSession={handleSwitchSession}
      onSendMessage={handleSendMessage}
      onResetSession={resetSession}
      shouldShowWelcome={shouldShowWelcome}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={toggleSidebar}
      menuPanelView={menuPanelView}
      settingsSubView={settingsSubView}
      engineSubView={engineSubView}
      menuPanelWidth={menuPanelWidth}
      setMenuPanelWidth={setMenuPanelWidth}
      currentContentPanel={currentContentPanel}
      onMenuClick={handleSidebarClick}
      onCloseMenuPanel={closeMenuPanel}
      onCloseContentPanel={closeContentPanel}
      onSaveConfig={handleSaveConfig}
      initialEngineConfig={initialEngineConfig}
      isFilePreviewOpen={isFilePreviewOpen}
      previewFile={previewFile}
      onFilePreview={handleFilePreview}
      onCloseFilePreview={handleCloseFilePreview}
      executionLogs={executionLogs}
      onClearLogs={clearLogs}
      isGlobalDragging={isGlobalDragging}
      isDraggingOverInput={isDraggingOverInput}
      setIsDraggingOverInput={setIsDraggingOverInput}
      showDragCursor={showDragCursor}
      layoutSwapMode={layoutSwapMode}
      onLayoutSwapModeChange={handleLayoutSwapModeChange}
      functionPanelPosition={functionPanelPosition}
      onFunctionPanelPositionChange={handleFunctionPanelPositionChange}
      onSendSkillMessage={onSendSkillMessage}
      functionPanel={functionPanel}
    />
  );
}

export default App;
