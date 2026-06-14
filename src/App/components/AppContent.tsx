import React from "react";
import CustomDragCursor from "../../components/CustomDragCursor";
import GlobalDragOverlay from "../../components/GlobalDragOverlay";
import BottomBar from "../../components/BottomBar";
import ChatPanel from "../../components/ChatPanel";
import Dialog from "../../components/Dialog";
import FilePreview from "../../components/FilePreview";
import MenuPanel from "../../components/MenuPanel";
import ResizablePanels from "../../components/ResizablePanels";
import Sidebar from "../../components/Sidebar";
import SkillsManager from "../../components/SkillsManager";
import TerminalPanel from "../../components/TerminalPanel";
import Toast from "../../components/Toast";
import TopBar from "../../components/TopBar";
import WelcomePage from "../../components/WelcomePage";
import { UploadFile, Theme, Language } from "../../types/type";
import ScheduledTasksManager from "../../components/ScheduledTasks";

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
  settingsSubView: any;
  engineSubView: any;
  menuPanelWidth: number;
  setMenuPanelWidth: (width: number) => void;
  showSkillsManager: boolean;
  showScheduledTasks: boolean;
  onMenuClick: (view: string, subView?: string) => void;
  onCloseMenuPanel: () => void;
  onOpenSkillsManager: () => void;
  onCloseSkillsManager: () => void;
  onCloseScheduledTasks: () => void;
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
  showSkillsManager,
  showScheduledTasks,
  onMenuClick,
  onCloseMenuPanel,
  onOpenSkillsManager,
  onCloseSkillsManager,
  onCloseScheduledTasks,
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
}: AppContentProps) {
  const showWelcome = shouldShowWelcome();
  const leftPanelContent =
    layoutSwapMode === "terminal-left" ? (
      <TerminalPanel
        logs={executionLogs}
        onClearLogs={onClearLogs}
        t={t}
        currentSessionId={currentSessionId}
        onFileClick={onFilePreview}
      />
    ) : (
      <ChatPanel
        onSendMessage={onSendMessage}
        onFileClick={onFilePreview}
        t={t}
        currentSessionId={currentSessionId}
        onDragOverInputChange={setIsDraggingOverInput}
        language={language}
      />
    );

  const rightPanelContent =
    layoutSwapMode === "terminal-left" ? (
      <ChatPanel
        onSendMessage={onSendMessage}
        onFileClick={onFilePreview}
        t={t}
        currentSessionId={currentSessionId}
        onDragOverInputChange={setIsDraggingOverInput}
        language={language}
      />
    ) : (
      <TerminalPanel
        logs={executionLogs}
        onClearLogs={onClearLogs}
        t={t}
        currentSessionId={currentSessionId}
        onFileClick={onFilePreview}
      />
    );

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
      />

      <div className="main-layout">
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
                onCloseSkillsManager={onCloseSkillsManager}
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
        {showSkillsManager ? (
          <SkillsManager
            t={t}
            onClose={onCloseSkillsManager}
            currentSessionId={currentSessionId}
          />
        ) : showScheduledTasks ? (
          <ScheduledTasksManager
            t={t}
            onClose={onCloseScheduledTasks}
            currentSessionId={currentSessionId}
          />
        ) : showWelcome ? (
          <WelcomePage
            onSendMessage={(msg, files) =>
              onSendMessage(msg, currentSessionId, files)
            }
            t={t}
            onDragOverInputChange={setIsDraggingOverInput}
          />
        ) : (
          <ResizablePanels
            leftPanel={leftPanelContent}
            rightPanel={rightPanelContent}
            rightExtraPanel={
              isFilePreviewOpen ? (
                <FilePreview
                  file={previewFile}
                  onClose={onCloseFilePreview}
                  t={t}
                />
              ) : undefined
            }
            isRightExtraOpen={isFilePreviewOpen}
            layoutMode="horizontal"
            onLayoutModeChange={() => {}}
          />
        )}
      </div>
      <BottomBar t={t} />
    </div>
  );
}