import React from "react";
import AtomicSkillsPanel from "./DriversPanel";
import WorkspaceConfig from "./SystemConfig/WorkspaceConfig";
import StorageConfig from "./SystemConfig/StorageConfig";
import LLMModelConfig from "./LLMModelConfig";
import UniversalSettings from "./SystemConfig/UniversalSettings";

export type SettingsSubView =
  | "llmModel"
  | "drivers"
  | "universal"
  | "workspaceConfig"
  | "storage";

interface SettingsPanelProps {
  subView: SettingsSubView;
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
  theme?: "light" | "dark";
  language?: "zh" | "en";
  onThemeChange?: (theme: "light" | "dark") => void;
  onLanguageChange?: (language: "zh" | "en") => void;
  isInitializing?: boolean;
  layoutSwapMode?: "terminal-left" | "chat-left";
  onLayoutSwapModeChange?: (mode: "terminal-left" | "chat-left") => void;
  functionPanelPosition?: "left" | "right";
  onFunctionPanelPositionChange?: (position: "left" | "right") => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  subView,
  t,
  onSave,
  theme,
  language,
  onThemeChange,
  onLanguageChange,
  isInitializing,
  layoutSwapMode = "terminal-left",
  onLayoutSwapModeChange,
  functionPanelPosition = "right",
  onFunctionPanelPositionChange,
}) => {
  switch (subView) {
    case "llmModel":
      return (
        <LLMModelConfig t={t} onSave={onSave} isInitializing={isInitializing} />
      );
    case "drivers":
      return <AtomicSkillsPanel t={t} onSave={onSave} />;
    case "universal":
      return (
        <UniversalSettings
          t={t}
          theme={theme || "dark"}
          language={language || "en"}
          onThemeChange={onThemeChange || (() => {})}
          onLanguageChange={onLanguageChange || (() => {})}
          layoutSwapMode={layoutSwapMode}
          onLayoutSwapModeChange={onLayoutSwapModeChange}
          functionPanelPosition={functionPanelPosition}
          onFunctionPanelPositionChange={onFunctionPanelPositionChange}
        />
      );
    case "workspaceConfig":
      return <WorkspaceConfig t={t} onSaveWorkspace={onSave} />;
    case "storage":
      return <StorageConfig t={t} onSave={onSave} />;
    default:
      return (
        <LLMModelConfig t={t} onSave={onSave} isInitializing={isInitializing} />
      );
  }
};

export default SettingsPanel;
