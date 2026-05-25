import React from "react";
import { configCommands } from "../../../api/config";

interface InterfaceConfigProps {
  t: (key: string, params?: any) => string;
  theme: "light" | "dark";
  language: "zh" | "en";
  onThemeChange: (theme: "light" | "dark") => void;
  onLanguageChange: (language: "zh" | "en") => void;
}

const InterfaceConfig: React.FC<InterfaceConfigProps> = ({
  t,
  theme,
  language,
  onThemeChange,
  onLanguageChange,
}) => {
  const handleThemeChange = async (newTheme: "light" | "dark") => {
    onThemeChange(newTheme);
    await configCommands.saveSettingsTheme(newTheme);
  };

  const handleLanguageChange = async (newLanguage: "zh" | "en") => {
    onLanguageChange(newLanguage);
    await configCommands.saveSettingsLanguage(newLanguage);
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "100px",
    flexShrink: 0,
    userSelect: "none",
  };

  const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    cursor: "pointer",
    outline: "none",
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "0 10px",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: "10px",
          paddingBottom: "10px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: "12px",
            paddingLeft: "4px",
          }}
        >
          🎨 {t("settings.interfaceConfig")}
        </div>
        <div
          className="settings-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <label style={labelStyle}>{t("settings.theme")}</label>
          <select
            style={selectStyle}
            value={theme}
            onChange={(e) =>
              handleThemeChange(e.target.value as "light" | "dark")
            }
          >
            <option value="light">{t("settings.themeLight")}</option>
            <option value="dark">{t("settings.themeDark")}</option>
          </select>
        </div>
        <div
          className="settings-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <label style={labelStyle}>{t("settings.language")}</label>
          <select
            style={selectStyle}
            value={language}
            onChange={(e) =>
              handleLanguageChange(e.target.value as "zh" | "en")
            }
          >
            <option value="zh">{t("settings.langZh")}</option>
            <option value="en">{t("settings.langEn")}</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default InterfaceConfig;
