import React, { useEffect } from "react";
import { useTheme } from "./hooks/useTheme";
import { useLanguage } from "./hooks/useLanguage";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useMenuPanel } from "./hooks/useMenuPanel";
import { useFilePreview } from "./hooks/useFilePreview";
import { useExecutionLogs } from "./hooks/useExecutionLogs";
import { useConfigLoader } from "./hooks/useConfigLoader";
import { useSession } from "./hooks/useSession";
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
    handleMenuClick,
    closeMenuPanel,
    handleOpenSkillsManager,
    handleCloseSkillsManager,
    handleOpenScheduledTasks,
    handleCloseScheduledTasks,
    handleOpenUserProfile,
    handleOpenCodeEditor,
    handleCloseUserProfile,
  } = useMenuPanel();
  const {
    currentSessionId,
    isLoading,
    handleNewSession,
    handleSwitchSession,
    handleSendMessage,
    resetSession,
    shouldShowWelcome,
  } = useSession(language, isConfigLoaded, handleCloseSkillsManager);
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
  const handleNewSessionWithClose = () => {
    resetToChat();
    handleNewSession();
  };
  useSystemEvents(
    handleNewSessionWithClose,
    () => handleMenuClick("skillMarket"),
    () => handleMenuClick("history"),
    () => handleMenuClick("favorites"),
    () => handleOpenScheduledTasks(),
    (subView) => handleMenuClick("settings", subView),
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
  useSearchEvents(() => handleMenuClick("skillMarket"), handleSwitchSession);
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
  const handleMenuClickWrapper = (view: string, subView?: string) => {
    if (view === "scheduledTasks") {
      handleOpenScheduledTasks();
      return;
    }
    if (view === "skillsManager") {
      handleOpenSkillsManager();
      return;
    }
    if (view === "userProfile") {
      handleOpenUserProfile();
      return;
    }
    if (view === "codeEditor") {
      handleOpenCodeEditor();
      return;
    }
    handleMenuClick(view, subView);
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
      onMenuClick={handleMenuClickWrapper}
      onCloseMenuPanel={closeMenuPanel}
      onOpenSkillsManager={handleOpenSkillsManager}
      onCloseSkillsManager={handleCloseSkillsManager}
      onCloseScheduledTasks={handleCloseScheduledTasks}
      onCloseUserProfile={handleCloseUserProfile}
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
