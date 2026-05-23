import React from "react";
import ExecutionHistoryPanel from "./ExecutionHistoryPanel";
import KnowledgePanel from "./KnowledgePanel";
import ScheduledTasksPanel from "./ScheduledTasksPanel";
import SettingsPanel, { SettingsSubView } from "./SettingsPanel";
import SkillMarketPanel from "./SkillMarketPanel";
import TaskQueuePanel from "./TaskQueuePanel";
import FavoritesPanel from "./FavoritesPanel";
import HistoryPanel from "./HistoryPanel";
import SkillsPanel from "./SkillsPanel";
import AtomicSkillsPanel from "./AtomicSkillsPanel";

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
  | "settings";

interface MenuPanelProps {
  currentView: MenuPanelView;
  settingsSubView?: SettingsSubView;
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
    padding: 7px 16px;
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

  .panel-section {
    margin-bottom: 24px;
  }

  .panel-section h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .history-list,
  .favorites-list,
  .knowledge-list,
  .execution-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-item,
  .favorite-item,
  .knowledge-item,
  .execution-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .history-item:hover,
  .favorite-item:hover,
  .knowledge-item:hover,
  .execution-item:hover {
    background: var(--hover-bg);
  }

  .history-info,
  .knowledge-info,
  .exec-info {
    flex: 1;
  }

  .history-title,
  .knowledge-title,
  .exec-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .history-time,
  .knowledge-desc,
  .exec-time {
    font-size: 11px;
    color: var(--text-muted);
  }

  .exec-status {
    font-size: 14px;
  }

  .skills-search-input {
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 13px;
    margin-bottom: 12px;
  }

  .skills-search-input:focus {
    outline: none;
    border-color: var(--text-secondary);
  }

  .skills-stats {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  .skill-category {
    margin-bottom: 16px;
  }

  .category-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .skill-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .skill-tag {
    font-size: 11px;
    padding: 4px 10px;
    background: var(--bg-tertiary);
    border-radius: 16px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    font-family: monospace;
  }

  .skill-tag:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .market-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .market-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
  }

  .market-icon {
    font-size: 24px;
  }

  .market-info {
    flex: 1;
  }

  .market-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .market-desc {
    font-size: 11px;
    color: var(--text-muted);
  }

  .market-install {
    padding: 4px 12px;
    background: var(--accent-green);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .market-install:hover {
    opacity: 0.85;
  }

  .task-queue {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
  }

  .task-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .task-status.running {
    background: var(--accent-yellow);
    animation: pulse 1.5s infinite;
  }

  .task-status.pending {
    background: var(--text-muted);
  }

  .task-status.completed {
    background: var(--accent-green);
  }

  .task-name {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
  }

  .task-progress {
    font-size: 11px;
    color: var(--text-muted);
  }

  .scheduled-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .scheduled-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-primary);
  }

  .edit-btn,
  .add-task-btn {
    padding: 4px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .edit-btn:hover,
  .add-task-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .add-task-btn {
    width: 100%;
    margin-top: 8px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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
}) => {
  const renderContent = () => {
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
      case "knowledge":
        return <KnowledgePanel t={t} />;
      case "skillMarket":
        return <SkillMarketPanel t={t} />;
      case "taskQueue":
        return <TaskQueuePanel t={t} />;
      case "scheduledTasks":
        return <ScheduledTasksPanel t={t} />;
      case "executionHistory":
        return <ExecutionHistoryPanel t={t} />;
      case "atomicSkills":
        return <AtomicSkillsPanel t={t} onSave={onSaveConfig} />;
      case "settings":
        return (
          <SettingsPanel
            subView={settingsSubView || "aiModel"}
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
    if (currentView === "settings" && settingsSubView) {
      const subViewTitles: Record<SettingsSubView, string> = {
        aiModel: "menu.aiModelConfig",
        engine: "menu.engineConfig",
        workspace: "menu.workspaceConfig",
        system: "menu.systemConfig",
        atomicSkills: "menu.atomicSkills",
      };
      const key = subViewTitles[settingsSubView];
      if (!key) {
        console.warn("Unknown settings subview:", settingsSubView);
        return t("menu.settings");
      }
      return t(key);
    }
    const titleKey = viewTitles[currentView];
    if (!titleKey) {
      console.warn("Unknown view:", currentView);
      return "Unknown";
    }
    return t(titleKey);
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
