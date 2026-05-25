import React from "react";
import ScheduledTasksPanel from "./ScheduledTasksPanel";
import SettingsPanel, { SettingsSubView } from "./SettingsPanel";
import SkillMarketPanel from "./SkillMarketPanel";
import TaskQueuePanel from "./TaskQueuePanel";
import FavoritesPanel from "./FavoritesPanel";
import HistoryPanel from "./HistoryPanel";
import SkillsPanel from "./SkillsPanel";
import AtomicSkillsPanel from "./AtomicSkillsPanel";
import WorkspacePanel from "./Workspace";
import EngineContainerPanel from "./EngineConfig/EngineContainerPanel";
import EngineDatabasePanel from "./EngineConfig/EngineDatabasePanel";
import EngineNetworkPanel from "./EngineConfig/EngineNetworkPanel";
import EngineNotificationPanel from "./EngineConfig/EngineNotificationPanel";

export type MenuPanelView =
  | "terminal"
  | "history"
  | "favorites"
  | "skills"
  | "knowledge"
  | "skillMarket"
  | "taskQueue"
  | "scheduledTasks"
  | "executionHistory"
  | "atomicSkills"
  | "settings"
  | "workspace"
  | "engine_group";

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
}

const viewTitles: Record<MenuPanelView, string> = {
  terminal: "terminal.title",
  history: "menu.history",
  favorites: "menu.favorites",
  skills: "menu.skills",
  atomicSkills: "menu.atomicSkills",
  knowledge: "menu.knowledge",
  skillMarket: "menu.skillMarket",
  taskQueue: "menu.taskQueue",
  scheduledTasks: "menu.scheduledTasks",
  executionHistory: "menu.executionHistory",
  settings: "menu.settings",
  workspace: "menu.workspace",
  engine_group: "menu.engineConfig",
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
    border-left: 1px solid var(--border-color);
    overflow: hidden;
  }

  .menu-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    flex-shrink: 0;
    min-height: 40px;
  }

  .menu-panel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .menu-panel-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
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
}) => {
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

    switch (currentView) {
      case "history":
        return (
          <HistoryPanel
            t={t}
            onSessionSelect={onSwitchSession}
            currentSessionId={currentSessionId}
          />
        );
      case "favorites":
        return <FavoritesPanel t={t} />;
      case "skills":
        return <SkillsPanel t={t} />;
      case "skillMarket":
        return <SkillMarketPanel t={t} />;
      case "taskQueue":
        return <TaskQueuePanel t={t} />;
      case "scheduledTasks":
        return <ScheduledTasksPanel t={t} />;
      case "atomicSkills":
        return <AtomicSkillsPanel t={t} onSave={onSaveConfig} />;
      case "workspace":
        return <WorkspacePanel t={t} />;
      case "settings":
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
          />
        );
      default:
        return null;
    }
  };

  const getDisplayTitle = () => {
    if (currentView === "engine_group" && engineSubView) {
      return t(engineSubViewTitles[engineSubView]);
    }
    const titleKey = viewTitles[currentView];
    return titleKey ? t(titleKey) : "Unknown";
  };

  return (
    <div className="menu-panel">
      <div className="menu-panel-header">
        <div className="menu-panel-title">{getDisplayTitle()}</div>
        <button
          className="menu-panel-close"
          onClick={onClose}
          title={t("common.close")}
        >
          ✕
        </button>
      </div>
      <div className="menu-panel-body">{renderContent()}</div>
    </div>
  );
};

export default MenuPanel;
