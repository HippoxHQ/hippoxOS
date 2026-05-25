import React from "react";
import AIModelConfig from "./AIModelConfig";
import AtomicSkillsPanel from "./AtomicSkillsPanel";
import InterfaceConfig from "./SystemConfig/InterfaceConfig";
import WorkspaceConfig from "./SystemConfig/WorkspaceConfig";

export type SettingsSubView =
  | "llmModel"
  | "atomicSkills"
  | "interface"
  | "workspaceConfig";

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
        <AIModelConfig t={t} onSave={onSave} isInitializing={isInitializing} />
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
    default:
      return (
        <AIModelConfig t={t} onSave={onSave} isInitializing={isInitializing} />
      );
  }
};

export default SettingsPanel;
