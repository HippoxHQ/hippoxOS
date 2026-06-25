import { useState } from "react";
import { MenuPanelView, EngineSubView } from "../../components/MenuPanel";
import { SettingsSubView } from "../../components/MenuPanel/SettingsPanel";

export type ContentPanelView =
  | "generalChat"
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
  | "codeEditorChat"
  | "chartChat"
  | "mapChat"
  | null;

export function useMenuPanel() {
  const [menuPanelView, setMenuPanelView] = useState<MenuPanelView | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>("llmModel");
  const [engineSubView, setEngineSubView] = useState<EngineSubView>("engine_database");
  const [menuPanelWidth, setMenuPanelWidth] = useState<number>(320);
  const [currentContentPanel, setCurrentContentPanel] = useState<ContentPanelView>(null);

  const switchMenuPanel = (view: string, subView?: string) => {
    if (view === "settings") {
      setMenuPanelView("settings");
      setSettingsSubView((subView as SettingsSubView) || "llmModel");
      setEngineSubView("engine_database");
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
      return;
    }
    const menuViews: string[] = [
      "skills",
      "knowledge",
      "favorites",
      "skillMarket",
      "taskQueue",
      "executionHistory",
      "drivers",
      "workspace",
      "workspaceConfig",
      "logs",
      "storage",
      "terminal",
    ];
    if (menuViews.includes(view)) {
      setMenuPanelView(view as MenuPanelView);
    } else {
      setMenuPanelView(null);
    }
  };

  const closeMenuPanel = () => {
    setMenuPanelView(null);
  };

  const switchContentArea = (view: string) => {
    const contentViews: string[] = [
      "skillsManager",
      "scheduledTasks",
      "userProfile",
      "codeEditorChat",
      "chartChat",
      "mapChat",
      "generalChat",
    ];
    if (contentViews.includes(view)) {
      setCurrentContentPanel(view as ContentPanelView);
    }
  };

  const closeContentPanel = () => {
    setCurrentContentPanel(null);
  };

  const resetToChat = () => {
    setCurrentContentPanel(null);
  };

  return {
    menuPanelView,
    settingsSubView,
    engineSubView,
    menuPanelWidth,
    setMenuPanelWidth,
    closeMenuPanel,
    switchMenuPanel,
    switchContentArea,
    currentContentPanel,
    closeContentPanel,
    resetToChat,
  };
}