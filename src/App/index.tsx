import React, { useCallback, useEffect, useState } from "react";
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
import { UploadFile } from "../core/types";
import { useSendSkillMessage } from "./hooks/useSendSkillMessage";

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
  const [isFunctionPanelOpen, setIsFunctionPanelOpen] = useState(false);

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
  useSearchEvents(() => handleMenuClick("skillMarket"), handleSwitchSession);

  useEffect(() => {
    taskManager.setupTaskEventListeners();
  }, []);

  useEffect(() => {
    const handleOpenPreview = (event: CustomEvent) => {
      const { file } = event.detail;
      if (file) {
        setIsFunctionPanelOpen(true);
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("open-preview-in-panel-internal", {
              detail: { file },
            }),
          );
        }, 100);
      }
    };

    const handleOpenMap = (event: CustomEvent) => {
      const { mapData, taskId } = event.detail;
      setIsFunctionPanelOpen(true);
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("open-map-in-panel-internal", {
            detail: { mapData, taskId },
          }),
        );
      }, 100);
    };

    const handleOpenChart = (event: CustomEvent) => {
      const { chartData, taskId } = event.detail;
      setIsFunctionPanelOpen(true);
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("open-chart-in-panel-internal", {
            detail: { chartData, taskId },
          }),
        );
      }, 100);
    };

    window.addEventListener(
      "open-preview-in-panel",
      handleOpenPreview as EventListener,
    );
    window.addEventListener(
      "open-map-in-panel",
      handleOpenMap as EventListener,
    );
    window.addEventListener(
      "open-chart-in-panel",
      handleOpenChart as EventListener,
    );

    return () => {
      window.removeEventListener(
        "open-preview-in-panel",
        handleOpenPreview as EventListener,
      );
      window.removeEventListener(
        "open-map-in-panel",
        handleOpenMap as EventListener,
      );
      window.removeEventListener(
        "open-chart-in-panel",
        handleOpenChart as EventListener,
      );
    };
  }, []);

  const handleCloseFunctionPanel = () => {
    setIsFunctionPanelOpen(false);
    if (isFilePreviewOpen) {
      handleCloseFilePreview();
    }
  };

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
      onSendSkillMessage={onSendSkillMessage}
      isFunctionPanelOpen={isFunctionPanelOpen}
      onCloseFunctionPanel={handleCloseFunctionPanel}
    />
  );
}

export default App;
