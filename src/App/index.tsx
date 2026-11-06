import React, { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
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
import { APP_WINDOW_EVENTS, dispatchOpenSubsystem, getSubsystemEventInfo } from "./AppWindowEventManager";
import "../core/TaskPool";
import { videoEditorStateManager } from "../subsystem/VideoEditor/global";
import { clearVideoEditorAllMemory } from "../subsystem/VideoEditor/MenoryManager";
import { listen } from "@tauri-apps/api/event";
// Video file extensions supported by the shell context menu.
const VIDEO_EXTS = ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv"];
// Audio file extensions supported by the shell context menu.
const AUDIO_EXTS = ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"];
// Image file extensions: opened in the video editor (as image material).
const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "bmp", "gif", "svg", "tiff", "ico"];
/**
 * Resolve a file path to the target subsystem id.
 */
function resolveSubsystemForFile(filePath: string): string | null {
  const ext = (filePath.split(".").pop() || "").toLowerCase();
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (AUDIO_EXTS.includes(ext)) return "audioEditor";
  // Images are opened in the video editor as image material.
  if (IMAGE_EXTS.includes(ext)) return "video";
  return null;
}
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
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    (async () => {
      try {
        const un = await listen<{ window_label: string; session_id: string | null }>("media:window-closed", (event) => {
          console.debug("[App] media:window-closed received:", event.payload);
          videoEditorStateManager.clear();
          clearVideoEditorAllMemory();
        });
        if (disposed) {
          un();
        } else {
          unlisten = un;
        }
      } catch (err) {
        console.error("[App] failed to listen for media:window-closed:", err);
      }
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  /**
   * Consume a file path passed via the OS context-menu ("Open with HippoxOS").
   */
  useEffect(() => {
    if (!isConfigLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const filePath = await invoke<string | null>("cmd_take_pending_file_open");
        if (cancelled || !filePath) return;
        console.log("[App] pending file-open path:", filePath);
        const subsystem = resolveSubsystemForFile(filePath);
        if (!subsystem) {
          console.warn("[App] unsupported file type for shell open:", filePath);
          return;
        }
        // Dispatch OPEN_SUBSYSTEM with filePath so the target page opens it.
        dispatchOpenSubsystem(subsystem, null, filePath);
      } catch (err) {
        console.error("[App] cmd_take_pending_file_open failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConfigLoaded]);
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
      closeMenuPanel();
      switchContentArea(target.panel as any);
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
    // Added "blockchain" and new subsystem pages to the content panel whitelist
    if (
      view === "skillsManager" ||
      view === "scheduledTasks" ||
      view === "userProfile" ||
      view === "codeEditorChat" ||
      view === "chartChat" ||
      view === "mapChat" ||
      view === "videoEditor" ||
      view === "audioEditor" ||
      view === "sandbox3d" ||
      view === "blockchain" ||
      view === "imageEditor" ||
      view === "pixelEditor" ||
      view === "databaseClient" ||
      view === "dockerClient" ||
      view === "apiClient"
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
