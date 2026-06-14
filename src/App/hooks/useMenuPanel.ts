import { useState } from "react";
import { MenuPanelView, EngineSubView } from "../../components/MenuPanel";
import { SettingsSubView } from "../../components/MenuPanel/SettingsPanel";

export function useMenuPanel() {
  const [menuPanelView, setMenuPanelView] = useState<MenuPanelView | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>("llmModel");
  const [engineSubView, setEngineSubView] = useState<EngineSubView>("engine_database");
  const [menuPanelWidth, setMenuPanelWidth] = useState<number>(320);
  const [showSkillsManager, setShowSkillsManager] = useState(false);
  const [showScheduledTasks, setShowScheduledTasks] = useState(false);
  const handleMenuClick = (view: string, subView?: string) => {
    if (view === "skillsManager") {
      setShowSkillsManager(true);
      setShowScheduledTasks(false);
      return;
    }
    if (view === "scheduledTasks") {
      setShowScheduledTasks(true);
      setShowSkillsManager(false);
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
      setShowSkillsManager(false);
      setShowScheduledTasks(false);
    } else if (view === "settings") {
      setMenuPanelView("settings");
      setSettingsSubView((subView as SettingsSubView) || "llmModel");
      setEngineSubView("engine_database");
      setShowSkillsManager(false);
      setShowScheduledTasks(false);
    } else if (view === "dashboard") {
      setMenuPanelView(null);
      setShowSkillsManager(false);
      setShowScheduledTasks(false);
    } else {
      setMenuPanelView(view as MenuPanelView);
      setShowSkillsManager(false);
      setShowScheduledTasks(false);
    }
  };

  const closeMenuPanel = () => {
    setMenuPanelView(null);
  };

  const handleOpenSkillsManager = () => {
    setShowSkillsManager(true);
    setShowScheduledTasks(false);
  };

  const handleCloseSkillsManager = () => {
    setShowSkillsManager(false);
  };

  const handleOpenScheduledTasks = () => {
    setShowScheduledTasks(true);
    setShowSkillsManager(false);
  };

  const handleCloseScheduledTasks = () => {
    setShowScheduledTasks(false);
  };

  return {
    menuPanelView,
    settingsSubView,
    engineSubView,
    menuPanelWidth,
    setMenuPanelWidth,
    showSkillsManager,
    showScheduledTasks,
    handleMenuClick,
    closeMenuPanel,
    handleOpenSkillsManager,
    handleCloseSkillsManager,
    handleOpenScheduledTasks,
    handleCloseScheduledTasks,
  };
}