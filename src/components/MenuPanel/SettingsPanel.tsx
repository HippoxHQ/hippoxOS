import React from "react";
import AIModelConfig from "./AIModelConfig";
import SystemConfig from "./SystemConfig";
import AtomicSkillsPanel from "./AtomicSkillsPanel";

export type SettingsSubView = "llmModel" | "atomicSkills" | "system";

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
    case "system":
      return (
        <SystemConfig
          t={t}
          theme={theme || "dark"}
          language={language || "en"}
          onThemeChange={onThemeChange || (() => {})}
          onLanguageChange={onLanguageChange || (() => {})}
          onSaveWorkspace={onSave}
        />
      );
    default:
      return (
        <AIModelConfig t={t} onSave={onSave} isInitializing={isInitializing} />
      );
  }
};

export default SettingsPanel;
