import React, { useRef, useState } from "react";
import SettingsPanel, { SettingsSubView } from "./SettingsPanel";
import SkillMarketPanel from "./SkillMarketPanel";
import TaskQueuePanel from "./TaskQueuePanel";
import FavoritesPanel from "./FavoritesPanel";
import HistoryPanel, {
  HistoryChatPanelRef,
} from "../../pages/GeneralChatPage/HistoryChatPanel";
import AtomicSkillsPanel from "./DriversPanel";
import WorkspacePanel from "./Workspace";
import WorkspaceConfig from "./SystemConfig/WorkspaceConfig";
import EngineContainerPanel from "./EngineConfig/EngineContainerPanel";
import EngineDatabasePanel from "./EngineConfig/EngineDatabasePanel";
import EngineNetworkPanel from "./EngineConfig/EngineNetworkPanel";
import EngineNotificationPanel from "./EngineConfig/EngineNotificationPanel";
import LogsPanel from "./LogsPanel";
import StorageConfig from "./SystemConfig/StorageConfig";
import { UploadFile } from "../../core/types";
import { CloseIcon, CollapseAllIcon2, ExpandAllIcon2 } from "../../icons";

export type MenuPanelView =
  | "terminal"
  | "history"
  | "favorites"
  | "skills"
  | "knowledge"
  | "skillMarket"
  | "taskQueue"
  | "executionHistory"
  | "drivers"
  | "settings"
  | "workspace"
  | "workspaceConfig"
  | "logs"
  | "storage"
  | "engine_group"
  | "codeEditor";

export type EngineSubView =
  | "engine_database"
  | "engine_network"
  | "engine_container"
  | "engine_notification";

interface MenuPanelProps {
  currentView: MenuPanelView;
  settingsSubView?: SettingsSubView;
  engineSubView?: EngineSubView;
  onClose: () => void;
  onSaveConfig?: (config: any) => void;
  t: (key: string, params?: any) => string;
  theme?: "light" | "dark";
  language?: "zh" | "en";
  onThemeChange?: (theme: "light" | "dark") => void;
  onLanguageChange?: (language: "zh" | "en") => void;
  isInitializing?: boolean;
  onSessionSelect?: (sessionId: string) => void;
  currentSessionId?: string;
  onSwitchSession?: (sessionId: string) => void;
  initialEngineConfig?: any;
  onCloseSkillsManager?: () => void;
  onSendMessage?: (message: string, files?: UploadFile[]) => void;
  onSendSkillMessage: (message: string, files?: UploadFile[]) => void;
  layoutSwapMode?: "terminal-left" | "chat-left";
  onLayoutSwapModeChange?: (mode: "terminal-left" | "chat-left") => void;
  functionPanelPosition?: "left" | "right";
  onFunctionPanelPositionChange?: (position: "left" | "right") => void;
  onFileClick?: (file: UploadFile) => void;
}

const viewTitles: Record<MenuPanelView, string> = {
  terminal: "terminal.title",
  history: "menu.history",
  favorites: "menu.favorites",
  skills: "menu.skills",
  drivers: "menu.drivers",
  knowledge: "menu.knowledge",
  skillMarket: "menu.skillMarket",
  taskQueue: "menu.taskQueue",
  executionHistory: "menu.executionHistory",
  settings: "menu.settings",
  workspace: "menu.workspace",
  workspaceConfig: "settings.workspaceConfig",
  engine_group: "menu.engineConfig",
  logs: "menu.logs",
  storage: "menu.storage",
  codeEditor: "menu.codeEditor",
};

const engineSubViewTitles: Record<EngineSubView, string> = {
  engine_database: "settings.tab.database",
  engine_network: "settings.tab.network",
  engine_container: "settings.tab.container",
  engine_notification: "settings.tab.notification",
};

const menuPanelStyles = `
  .menu-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    overflow: hidden;
  }

  .menu-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    flex-shrink: 0;
    min-height: 40px;
    overflow: hidden;
  }

  .menu-panel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .menu-panel-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 4px 8px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .menu-panel-close:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .menu-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 0px;
  }
`;

if (typeof document !== "undefined") {
  const styleId = "menu-panel-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = menuPanelStyles;
    document.head.appendChild(style);
  }
}

const MenuPanel: React.FC<MenuPanelProps> = ({
  currentView,
  settingsSubView,
  engineSubView,
  onClose,
  onSaveConfig,
  t,
  theme,
  language,
  onThemeChange,
  onLanguageChange,
  isInitializing = false,
  onSessionSelect,
  currentSessionId,
  onSwitchSession,
  initialEngineConfig,
  onCloseSkillsManager,
  onSendMessage = () => {},
  onSendSkillMessage,
  layoutSwapMode = "terminal-left",
  onLayoutSwapModeChange,
  functionPanelPosition = "right",
  onFunctionPanelPositionChange,
  onFileClick,
}) => {
  const historyPanelRef = useRef<HistoryChatPanelRef>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const renderContent = () => {
    if (currentView === "engine_group" && engineSubView) {
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
    }
    if (currentView === "settings") {
      return (
        <SettingsPanel
          subView={settingsSubView || "llmModel"}
          t={t}
          onSave={onSaveConfig}
          theme={theme}
          language={language}
          onThemeChange={onThemeChange}
          onLanguageChange={onLanguageChange}
          isInitializing={isInitializing}
          layoutSwapMode={layoutSwapMode}
          onLayoutSwapModeChange={onLayoutSwapModeChange}
          functionPanelPosition={functionPanelPosition}
          onFunctionPanelPositionChange={onFunctionPanelPositionChange}
        />
      );
    }
    switch (currentView) {
      case "favorites":
        return (
          <FavoritesPanel
            t={t}
            onSendSkillMessage={onSendSkillMessage}
            onFileClick={onFileClick}
          />
        );
      case "skillMarket":
        return (
          <SkillMarketPanel
            t={t}
            onSendSkillMessage={onSendSkillMessage}
            onFileClick={onFileClick}
          />
        );
      case "taskQueue":
        return <TaskQueuePanel t={t} />;
      case "drivers":
        return <AtomicSkillsPanel t={t} onSave={onSaveConfig} />;
      case "workspace":
        return <WorkspacePanel t={t} />;
      case "workspaceConfig":
        return <WorkspaceConfig t={t} onSaveWorkspace={onSaveConfig} />;
      case "logs":
        return <LogsPanel t={t} onClose={onClose} onFileClick={onFileClick} />;
      case "storage":
        return <StorageConfig t={t} onSave={onSaveConfig} />;
      default:
        return null;
    }
  };

  const getDisplayTitle = () => {
    if (currentView === "engine_group" && engineSubView) {
      return t(engineSubViewTitles[engineSubView]);
    }
    if (currentView === "settings" && settingsSubView) {
      const settingsTitles: Record<SettingsSubView, string> = {
        llmModel: "menu.llmModelConfig",
        drivers: "menu.drivers",
        universal: "settings.universalSettings",
        workspaceConfig: "settings.workspaceConfig",
        storage: "menu.storage",
      };
      return t(settingsTitles[settingsSubView] || "menu.settings");
    }
    const titleKey = viewTitles[currentView];
    return titleKey ? t(titleKey) : "Unknown";
  };

  const controlButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "var(--text-secondary)",
    padding: "2px 6px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    width: "32px",
    height: "32px",
    flexShrink: 0,
  };

  const handleExpandToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded) {
      historyPanelRef.current?.expandAll();
    } else {
      historyPanelRef.current?.collapseAll();
    }
  };

  const handleScrollToggle = () => {
    const newAtBottom = !isAtBottom;
    setIsAtBottom(newAtBottom);
    if (newAtBottom) {
      historyPanelRef.current?.scrollToBottom();
    } else {
      historyPanelRef.current?.scrollToTop();
    }
  };

  return (
    <div className="menu-panel" style={{ userSelect: "none" }}>
      <div className="menu-panel-header">
        <div className="menu-panel-title">{getDisplayTitle()}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          {currentView === "history" && (
            <>
              <button
                style={controlButtonStyle}
                onClick={handleExpandToggle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "none";
                }}
                title={
                  isExpanded
                    ? t("history.collapseAll") || "收起全部"
                    : t("history.expandAll") || "展开全部"
                }
              >
                {isExpanded ? (
                  <CollapseAllIcon2 size={16} />
                ) : (
                  <ExpandAllIcon2 size={16} />
                )}
              </button>
              <button
                style={controlButtonStyle}
                onClick={handleScrollToggle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "none";
                }}
                title={
                  isAtBottom
                    ? t("history.scrollToTop") || "滚动到顶部"
                    : t("history.scrollToBottom") || "滚动到底部"
                }
              >
                {isAtBottom ? "▲" : "▼"}
              </button>
              <div
                style={{
                  width: "1px",
                  height: "16px",
                  background: "var(--border-color)",
                  margin: "0 4px",
                  flexShrink: 0,
                }}
              />
            </>
          )}
          <button
            className="menu-panel-close"
            onClick={onClose}
            title={t("common.close")}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="menu-panel-body">{renderContent()}</div>
    </div>
  );
};

export default MenuPanel;
