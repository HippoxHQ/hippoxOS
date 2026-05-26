import React from "react";
import AtomicSkillsPanel from "./AtomicSkillsPanel";
import InterfaceConfig from "./SystemConfig/InterfaceConfig";
import WorkspaceConfig from "./SystemConfig/WorkspaceConfig";
import StorageConfig from "./SystemConfig/StorageConfig";
import LLMModelConfig from "./LLMModelConfig";

export type SettingsSubView =
  | "llmModel"
  | "atomicSkills"
  | "interface"
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
}) => {
  switch (subView) {
    case "llmModel":
      return (
        <LLMModelConfig t={t} onSave={onSave} isInitializing={isInitializing} />
      );
    case "atomicSkills":
      return <AtomicSkillsPanel t={t} onSave={onSave} />;
    case "interface":
      return (
        <InterfaceConfig
          t={t}
          theme={theme || "dark"}
          language={language || "en"}
          onThemeChange={onThemeChange || (() => {})}
          onLanguageChange={onLanguageChange || (() => {})}
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
