import React, { useState } from "react";
import { configCommands } from "../../api/config";

interface SystemConfigProps {
  t: (key: string, params?: any) => string;
  theme: "light" | "dark";
  language: "zh" | "en";
  onThemeChange: (theme: "light" | "dark") => void;
  onLanguageChange: (language: "zh" | "en") => void;
  initialWorkspaceConfig?: {
    workspacePath: string;
    maxLogSize: number;
  };
  onSaveWorkspace?: (config: any) => void;
}

const SystemConfig: React.FC<SystemConfigProps> = ({
  t,
  theme,
  language,
  onThemeChange,
  onLanguageChange,
  initialWorkspaceConfig,
  onSaveWorkspace,
}) => {
  const [workspaceConfig, setWorkspaceConfig] = useState({
    workspacePath: initialWorkspaceConfig?.workspacePath || "",
    maxLogSize: initialWorkspaceConfig?.maxLogSize || 100,
  });

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "120px",
    flexShrink: 0,
    userSelect: "none",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
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

  const buttonStyle: React.CSSProperties = {
    padding: "6px 16px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  const saveButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "var(--accent-color, #0066cc)",
    color: "white",
    border: "none",
    marginTop: "8px",
    alignSelf: "flex-end",
  };

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    onThemeChange(newTheme);
    await configCommands.saveSettingsTheme(newTheme);
  };

  const handleLanguageChange = async (newLanguage: "zh" | "en") => {
    onLanguageChange(newLanguage);
    await configCommands.saveSettingsLanguage(newLanguage);
  };

  const handleSaveWorkspace = () => {
    if (onSaveWorkspace) {
      onSaveWorkspace(workspaceConfig);
    }
  };

  return (
    <div
      className="settings-container"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        margin: 0,
        gap: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 10px",
          margin: 0,
          paddingTop: "10px",
          paddingBottom: "10px",
        }}
      >
        <div
          style={{
            padding: "0 0 8px 0",
            marginBottom: "16px",
            borderBottom: "1px solid var(--border-color)",
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
        <div style={{ padding: "0" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "12px",
              paddingLeft: "4px",
            }}
          >
            📁 {t("settings.workspaceConfig")}
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
            <label style={labelStyle}>{t("settings.workspacePath")}</label>
            <input
              style={inputStyle}
              value={workspaceConfig.workspacePath}
              onChange={(e) =>
                setWorkspaceConfig({
                  ...workspaceConfig,
                  workspacePath: e.target.value,
                })
              }
              placeholder={t("settings.workspacePathPlaceholder")}
            />
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
            <label style={labelStyle}>{t("settings.maxLogSize")} (MB)</label>
            <input
              type="number"
              style={inputStyle}
              value={workspaceConfig.maxLogSize}
              onChange={(e) =>
                setWorkspaceConfig({
                  ...workspaceConfig,
                  maxLogSize: parseInt(e.target.value) || 100,
                })
              }
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "8px",
            }}
          >
            <button style={saveButtonStyle} onClick={handleSaveWorkspace}>
              {t("settings.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
