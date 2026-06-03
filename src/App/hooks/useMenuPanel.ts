import { useState } from "react";
import { MenuPanelView, EngineSubView } from "../../components/MenuPanel";
import { SettingsSubView } from "../../components/MenuPanel/SettingsPanel";

export function useMenuPanel() {
  const [menuPanelView, setMenuPanelView] = useState<MenuPanelView | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>("llmModel");
  const [engineSubView, setEngineSubView] = useState<EngineSubView>("engine_database");
  const [menuPanelWidth, setMenuPanelWidth] = useState<number>(320);
  const [showSkillsManager, setShowSkillsManager] = useState(false);
  const handleMenuClick = (view: string, subView?: string) => {
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
      setMenuPanelView(view as MenuPanelView);
    }
  };

  const closeMenuPanel = () => {
    setMenuPanelView(null);
  };

  const handleOpenSkillsManager = () => {
    setShowSkillsManager(true);
  };

  const handleCloseSkillsManager = () => {
    setShowSkillsManager(false);
  };

  return {
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
  };
}