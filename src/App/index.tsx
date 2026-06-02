import React, { useEffect } from "react";
import { useTheme } from "./hooks/useTheme";
import { useLanguage } from "./hooks/useLanguage";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useMenuPanel } from "./hooks/useMenuPanel";
import { useFilePreview } from "./hooks/useFilePreview";
import { useExecutionLogs } from "./hooks/useExecutionLogs";
import { useConfigLoader } from "./hooks/useConfigLoader";
import { useSession } from "./hooks/useSession";
import { useLayoutMode } from "./hooks/useLayoutMode";
import { useSidebar } from "./hooks/useSidebar";
import { useSystemEvents, useDirectoryEvents } from "./hooks/useSystemEvents";
import { useTaskEvents } from "./hooks/useTaskEvents";
import { useSearchEvents } from "./hooks/useSearchEvents";
import { taskManager } from "../TaskManager";
import { AppContent } from "./components/AppContent";

function App() {
  const { theme, handleToggleTheme } = useTheme();
  const { language, handleToggleLanguage, t } = useLanguage();
  const { isConfigLoaded, initialEngineConfig } = useConfigLoader();
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
  const { layoutMode, handleLayoutModeChange } = useLayoutMode();
  const {
    menuPanelView,
    settingsSubView,
    engineSubView,
    menuPanelWidth,
    setMenuPanelWidth,
    showSkillsManager,
    handleMenuClick,
    closeMenuPanel,
    handleOpenSkillsManager,
    handleCloseSkillsManager,
  } = useMenuPanel();
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

  useTaskEvents(language);
  useSystemEvents(
    handleNewSession,
    () => handleMenuClick("skillMarket"),
    () => handleMenuClick("history"),
    () => handleMenuClick("favorites"),
    () => handleMenuClick("scheduledTasks"),
    (subView) => handleMenuClick("settings", subView),
  );
  useDirectoryEvents();
  useSearchEvents(() => handleMenuClick("skillMarket"), handleSwitchSession);

  useEffect(() => {
    taskManager.setupTaskEventListeners();
  }, []);

  const handleSaveConfig = async (config: any) => {};

  return (
    <AppContent
      theme={theme}
      onToggleTheme={handleToggleTheme}
      language={language}
      onToggleLanguage={handleToggleLanguage}
      t={t}
      currentSessionId={currentSessionId}
      isLoading={isLoading}
      onNewSession={handleNewSession}
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
      showSkillsManager={showSkillsManager}
      onMenuClick={handleMenuClick}
      onCloseMenuPanel={closeMenuPanel}
      onOpenSkillsManager={handleOpenSkillsManager}
      onCloseSkillsManager={handleCloseSkillsManager}
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
      layoutMode={layoutMode}
      onLayoutModeChange={handleLayoutModeChange}
    />
  );
}

export default App;
