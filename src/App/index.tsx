import React, { useEffect } from "react";
import { taskManager } from "../core/TaskManager";
import { useFunctionPanelController } from "../components/FunctionPanel/hooks/useFunctionPanelController";
import { sessionCommands } from "../command/session/general";
import { AppContent } from "./components/AppContent";
import { useSession } from "./hooks/session/useGeneralChatSession";
import { useConfigLoader } from "./hooks/useConfigLoader";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useDriverEvents } from "./hooks/useDriverEvents";
import { useExecutionLogs } from "./hooks/useExecutionLogs";
import { useFilePreview } from "./hooks/useFilePreview";
import { useFunctionPanelPosition } from "./hooks/useFunctionPanelPosition";
import { useLanguage } from "./hooks/useLanguage";
import { useLayoutSwapMode } from "./hooks/useLayoutSwapMode";
import { useSearchEvents } from "./hooks/useSearchEvents";
import { useSendSkillMessage } from "./hooks/useSendSkillMessage";
import { useSidebar } from "./hooks/useSidebar";
import { useSystemEvents, useDirectoryEvents } from "./hooks/useSystemEvents";
import { useTaskEvents } from "./hooks/useTaskEvents";
import { useTheme } from "./hooks/useTheme";
import { useMenuPanel, ContentPanelView } from "./hooks/useMenuPanel";
import { APP_WINDOW_EVENTS, getSubsystemEventInfo } from "./AppWindowEventManager";
function App() {
  const { isConfigLoaded, initialEngineConfig, initialTheme, initialLanguage } = useConfigLoader();
  const { theme, handleToggleTheme } = useTheme(initialTheme);
  const { language, handleToggleLanguage, t } = useLanguage(initialLanguage);
  const { menuPanelView, settingsSubView, engineSubView, menuPanelWidth, setMenuPanelWidth, currentContentPanel, closeContentPanel, resetToChat, switchMenuPanel, closeMenuPanel, switchContentArea } = useMenuPanel();
  const { currentSessionId, isLoading, handleNewSession, handleSwitchSession, handleSendMessage, resetSession, shouldShowWelcome } = useSession(language, isConfigLoaded);
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const { layoutSwapMode, handleLayoutSwapModeChange } = useLayoutSwapMode();
  const { functionPanelPosition, handleFunctionPanelPositionChange } = useFunctionPanelPosition();
  const { isFilePreviewOpen, previewFile, handleFilePreview, handleCloseFilePreview } = useFilePreview();
  const { executionLogs, clearLogs } = useExecutionLogs();
  const { isGlobalDragging, isDraggingOverInput, setIsDraggingOverInput, showDragCursor } = useDragAndDrop();
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
  /**
   * Listen for search new session event using APP_WINDOW_EVENTS
   */
  useEffect(() => {
    const handleSearchNewSession = () => {
      handleNewSessionWithClose();
    };
    window.addEventListener(APP_WINDOW_EVENTS.SEARCH_NEW_SESSION, handleSearchNewSession);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.SEARCH_NEW_SESSION, handleSearchNewSession);
    };
  }, [handleNewSessionWithClose]);
  useSearchEvents(() => switchMenuPanel("skillMarket"), handleSwitchSession);
  /**
   * Handle search result click navigation to different subsystems
   * Uses APP_WINDOW_EVENTS constants and getSubsystemEventInfo helper
   * All subsystems including general chat handle session selection via their own event listeners
   */
  useEffect(() => {
    const handleSearchSwitchSession = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId, subsystem } = e.detail;
      if (!sessionId) return;
      // Use the subsystem map from AppWindowEventManager
      const target = getSubsystemEventInfo(subsystem || "general");
      if (!target) {
        // Fallback: use general session switch
        handleSwitchSession(sessionId);
        return;
      }
      // Close any open menu panel
      closeMenuPanel();
      // Switch to the subsystem content panel
      // target.panel is guaranteed to be non-null here
      switchContentArea(target.panel as any);
      // After a short delay to allow the panel to render, dispatch the subsystem-specific event
      // The subsystem page will handle the session selection via its own event listener
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent(target.event, {
            detail: { sessionId, title, highlightMessageId },
          }),
        );
      }, 150);
    };
    window.addEventListener(APP_WINDOW_EVENTS.SEARCH_SWITCH_SESSION, handleSearchSwitchSession as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.SEARCH_SWITCH_SESSION, handleSearchSwitchSession as EventListener);
    };
  }, [closeMenuPanel, switchContentArea]);
  /**
   * Listen for session switch events using APP_WINDOW_EVENTS
   */
  useEffect(() => {
    const onSwitchEvent = (e: CustomEvent) => {
      const sessionId = e.detail?.sessionId;
      if (sessionId) {
        handleSwitchSession(sessionId);
      }
    };
    window.addEventListener(APP_WINDOW_EVENTS.SESSION_SWITCH, onSwitchEvent as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.SESSION_SWITCH, onSwitchEvent as EventListener);
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
    if (view === "skillsManager" || view === "scheduledTasks" || view === "userProfile" || view === "codeEditorChat" || view === "chartChat" || view === "mapChat" || view === "videoEditor" || view === "sandbox3d") {
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
