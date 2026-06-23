import React, { useState, useEffect } from "react";
import { configCommands } from "../../../command/config";
import { disable, enable } from "@tauri-apps/plugin-autostart";

interface UniversalSettingsProps {
  t: (key: string, params?: any) => string;
  theme: "light" | "dark";
  language: "zh" | "en";
  onThemeChange: (theme: "light" | "dark") => void;
  onLanguageChange: (language: "zh" | "en") => void;
  layoutSwapMode?: "terminal-left" | "chat-left";
  onLayoutSwapModeChange?: (mode: "terminal-left" | "chat-left") => void;
  functionPanelPosition?: "left" | "right";
  onFunctionPanelPositionChange?: (position: "left" | "right") => void;
}

const TerminalLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    width="14"
    height="14"
  >
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="2"
      stroke="currentColor"
      fill="none"
    />
    <path
      d="M9 8L6 12L9 16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 16h6" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

const ChatLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    width="14"
    height="14"
  >
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="2"
      stroke="currentColor"
      fill="none"
    />
    <path
      d="M15 8L18 12L15 16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 16h-6" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

const FunctionLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    width="14"
    height="14"
  >
    <rect
      x="2"
      y="4"
      width="8"
      height="16"
      rx="1.5"
      stroke="currentColor"
      fill="none"
    />
    <rect
      x="12"
      y="4"
      width="10"
      height="16"
      rx="1.5"
      stroke="currentColor"
      fill="none"
    />
    <path d="M6 8h0" stroke="currentColor" />
  </svg>
);

const FunctionRightIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    width="14"
    height="14"
  >
    <rect
      x="2"
      y="4"
      width="10"
      height="16"
      rx="1.5"
      stroke="currentColor"
      fill="none"
    />
    <rect
      x="14"
      y="4"
      width="8"
      height="16"
      rx="1.5"
      stroke="currentColor"
      fill="none"
    />
    <path d="M18 8h0" stroke="currentColor" />
  </svg>
);

const UniversalSettings: React.FC<UniversalSettingsProps> = ({
  t,
  theme,
  language,
  onThemeChange,
  onLanguageChange,
  layoutSwapMode = "terminal-left",
  onLayoutSwapModeChange,
  functionPanelPosition = "right",
  onFunctionPanelPositionChange,
}) => {
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [autoStartLoading, setAutoStartLoading] = useState(true);

  useEffect(() => {
    const loadAutoStart = async () => {
      try {
        const saved = await configCommands.getSettingsAutoStart();
        setAutoStartEnabled(saved);
      } catch (error) {
        console.error("Failed to load auto start setting:", error);
      } finally {
        setAutoStartLoading(false);
      }
    };
    loadAutoStart();
  }, []);

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    onThemeChange(newTheme);
    await configCommands.saveSettingsTheme(newTheme);
  };

  const handleLanguageChange = async (newLanguage: "zh" | "en") => {
    onLanguageChange(newLanguage);
    await configCommands.saveSettingsLanguage(newLanguage);
  };

  const handleLayoutSwapChange = (mode: "terminal-left" | "chat-left") => {
    onLayoutSwapModeChange?.(mode);
    configCommands.saveSettingsLayoutSwapMode(mode);
  };

  const handleFunctionPanelPositionChange = (position: "left" | "right") => {
    onFunctionPanelPositionChange?.(position);
    configCommands.saveSettingsFunctionPanelPosition(position);
  };

  const handleAutoStartToggle = async () => {
    const newState = !autoStartEnabled;
    try {
      if (newState) {
        await enable();
      } else {
        await disable();
      }
      setAutoStartEnabled(newState);
      await configCommands.saveSettingsAutoStart(newState);
    } catch (error) {
      console.error("Failed to toggle auto start:", error);
      setAutoStartEnabled(!newState);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "60px",
    flexShrink: 0,
    userSelect: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    gap: "12px",
    flexWrap: "nowrap",
  };

  const layoutSwitchGroupStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    background: "var(--bg-tertiary)",
    borderRadius: "6px",
    padding: "2px",
    flex: "1 1 auto",
    minWidth: 0,
    overflow: "hidden",
  };

  const layoutSwitchBtnStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    flex: "1 1 auto",
    minWidth: 0,
    height: "24px",
    padding: "0 8px",
    background: isActive ? "var(--accent-color, #00aaff)" : "transparent",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 450,
    color: isActive ? "white" : "var(--text-secondary)",
    // transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    position: "relative",
    zIndex: 1,
    pointerEvents: "auto",
  });

  const btnTextStyle: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flexShrink: 1,
    minWidth: 0,
  };

  const toggleSwitchStyle = (isActive: boolean): React.CSSProperties => ({
    width: "44px",
    height: "24px",
    borderRadius: "12px",
    background: isActive
      ? "var(--accent-color, #00aaff)"
      : "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    cursor: "pointer",
    // transition: "all 0.2s",
    position: "relative",
    flexShrink: 0,
    outline: "none",
    padding: 0,
  });

  const toggleKnobStyle = (isActive: boolean): React.CSSProperties => ({
    position: "absolute",
    top: "2px",
    left: isActive ? "22px" : "2px",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "white",
    // transition: "all 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  });

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 10px",
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

        <div style={rowStyle}>
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

        <div style={rowStyle}>
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

        <div style={rowStyle}>
          <label style={labelStyle}>
            {t("settings.panelLayout") || "面板布局"}
          </label>
          <div style={layoutSwitchGroupStyle}>
            <button
              type="button"
              style={layoutSwitchBtnStyle(layoutSwapMode === "terminal-left")}
              onClick={() => handleLayoutSwapChange("terminal-left")}
              title={t("settings.terminalLeft") || "终端在左"}
            >
              <TerminalLeftIcon />
              <span style={btnTextStyle}>
                {t("settings.terminalLeft") || "终端｜对话"}
              </span>
            </button>
            <button
              type="button"
              style={layoutSwitchBtnStyle(layoutSwapMode === "chat-left")}
              onClick={() => handleLayoutSwapChange("chat-left")}
              title={t("settings.chatLeft") || "对话在左"}
            >
              <ChatLeftIcon />
              <span style={btnTextStyle}>
                {t("settings.chatLeft") || "对话｜终端"}
              </span>
            </button>
          </div>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>
            {t("settings.functionPanelPosition") || "功能区位置"}
          </label>
          <div style={layoutSwitchGroupStyle}>
            <button
              type="button"
              style={layoutSwitchBtnStyle(functionPanelPosition === "left")}
              onClick={() => handleFunctionPanelPositionChange("left")}
              title={t("settings.functionLeft") || "功能区在左"}
            >
              <FunctionLeftIcon />
              <span style={btnTextStyle}>
                {t("settings.functionLeft") || "功能区左"}
              </span>
            </button>
            <button
              type="button"
              style={layoutSwitchBtnStyle(functionPanelPosition === "right")}
              onClick={() => handleFunctionPanelPositionChange("right")}
              title={t("settings.functionRight") || "功能区在右"}
            >
              <FunctionRightIcon />
              <span style={btnTextStyle}>
                {t("settings.functionRight") || "功能区右"}
              </span>
            </button>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border-color, #333)",
            marginBottom: "10px",
          }}
        ></div>

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

        <div style={rowStyle}>
          <label style={labelStyle}>
            {t("settings.autoStart") || "开机自启动"}
          </label>
          <button
            type="button"
            style={toggleSwitchStyle(autoStartEnabled)}
            onClick={handleAutoStartToggle}
            disabled={autoStartLoading}
            title={
              autoStartEnabled
                ? t("settings.disableAutoStart") || "关闭开机自启动"
                : t("settings.enableAutoStart") || "开启开机自启动"
            }
          >
            <span style={toggleKnobStyle(autoStartEnabled)} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UniversalSettings;
