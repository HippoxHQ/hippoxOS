import { useState } from "react";
import { MenuPanelView, EngineSubView } from "../../components/MenuPanel";
import { SettingsSubView } from "../../components/MenuPanel/SettingsPanel";

export type ContentPanelView =
  | "history"
  | "favorites"
  | "skills"
  | "skillMarket"
  | "taskQueue"
  | "atomicSkills"
  | "workspace"
  | "workspaceConfig"
  | "logs"
  | "storage"
  | "settings"
  | "engine_group"
  | "skillsManager"
  | "scheduledTasks"
  | "userProfile"
  | "codeEditor"
  | null;

export function useMenuPanel() {
  const [menuPanelView, setMenuPanelView] = useState<MenuPanelView | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>("llmModel");
  const [engineSubView, setEngineSubView] = useState<EngineSubView>("engine_database");
  const [menuPanelWidth, setMenuPanelWidth] = useState<number>(320);
  const [currentContentPanel, setCurrentContentPanel] = useState<ContentPanelView>(null);
  const handleMenuClick = (view: string, subView?: string) => {
    if (view === "skillsManager" || view === "scheduledTasks" || view === "userProfile" || view === "codeEditor") {
      return;
    }
    if (
      subView === "engine_database" ||
      subView === "engine_network" ||
      subView === "engine_container" ||
      subView === "engine_notification"
    ) {
      setMenuPanelView("engine_group");
      setEngineSubView(subView as EngineSubView);
      setSettingsSubView("llmModel");
    } else if (view === "settings") {
      setMenuPanelView("settings");
      setSettingsSubView((subView as SettingsSubView) || "llmModel");
      setEngineSubView("engine_database");
    } else if (view === "dashboard") {
      setMenuPanelView(null);
    } else {
      if (menuPanelView === (view as MenuPanelView)) {
        setMenuPanelView(null);
      } else {
        setMenuPanelView(view as MenuPanelView);
      }
    }
  };
  const closeMenuPanel = () => {
    setMenuPanelView(null);
  };

  const handleOpenSkillsManager = () => {
    setCurrentContentPanel("skillsManager");
  };
  const handleCloseSkillsManager = () => {
    if (currentContentPanel === "skillsManager") {
      setCurrentContentPanel(null);
    }
  };
  const handleOpenScheduledTasks = () => {
    setCurrentContentPanel("scheduledTasks");
  };
  const handleCloseScheduledTasks = () => {
    if (currentContentPanel === "scheduledTasks") {
      setCurrentContentPanel(null);
    }
  };
  const handleOpenUserProfile = () => {
    setCurrentContentPanel("userProfile");
  };
  const handleOpenCodeEditor = () => {
    setCurrentContentPanel("codeEditor");
  };
  const handleCloseUserProfile = () => {
    if (currentContentPanel === "userProfile") {
      setCurrentContentPanel(null);
    }
  };
  const handleOpenHistory = () => {
    setCurrentContentPanel("history");
  };
  const closeContentPanel = () => {
    setCurrentContentPanel(null);
  };
  const resetToChat = () => {
    setCurrentContentPanel(null);
  };
  const showSkillsManager = currentContentPanel === "skillsManager";
  const showScheduledTasks = currentContentPanel === "scheduledTasks";
  const showUserProfile = currentContentPanel === "userProfile";

  return {
    menuPanelView,
    settingsSubView,
    engineSubView,
    menuPanelWidth,
    setMenuPanelWidth,
    closeMenuPanel,
    handleMenuClick,
    currentContentPanel,
    closeContentPanel,
    resetToChat,
    handleOpenSkillsManager,
    handleCloseSkillsManager,
    handleOpenScheduledTasks,
    handleCloseScheduledTasks,
    handleOpenUserProfile,
    handleOpenCodeEditor,
    handleCloseUserProfile,
    handleOpenHistory,
    showSkillsManager,
    showScheduledTasks,
    showUserProfile,
  };
}