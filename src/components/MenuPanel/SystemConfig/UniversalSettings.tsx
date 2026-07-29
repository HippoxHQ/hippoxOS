import React, { useState, useEffect } from "react";
import { configCommands } from "../../../command/config";
import { disable, enable } from "@tauri-apps/plugin-autostart";
interface UniversalSettingsProps {
  t: (key: string, params?: any) => string;
  theme: "light" | "dark";
  language: "zh" | "en";
  onThemeChange: (theme: "light" | "dark") => void;
  onLanguageChange: (language: "zh" | "en") => void;
  functionPanelPosition?: "left" | "right";
  onFunctionPanelPositionChange?: (position: "left" | "right") => void;
}
const TerminalLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="14" height="14">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" fill="none" />
    <path d="M9 8L6 12L9 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16h6" stroke="currentColor" strokeLinecap="round" />
  </svg>
);
const ChatLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="14" height="14">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" fill="none" />
    <path d="M15 8L18 12L15 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16h-6" stroke="currentColor" strokeLinecap="round" />
  </svg>
);
const FunctionLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="14" height="14">
    <rect x="2" y="4" width="8" height="16" rx="1.5" stroke="currentColor" fill="none" />
    <rect x="12" y="4" width="10" height="16" rx="1.5" stroke="currentColor" fill="none" />
    <path d="M6 8h0" stroke="currentColor" />
  </svg>
);
const FunctionRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="14" height="14">
    <rect x="2" y="4" width="10" height="16" rx="1.5" stroke="currentColor" fill="none" />
    <rect x="14" y="4" width="8" height="16" rx="1.5" stroke="currentColor" fill="none" />
    <path d="M18 8h0" stroke="currentColor" />
  </svg>
);
const emitLayoutChangeEvent = (pageType: string, mode: string) => {
  window.dispatchEvent(
    new CustomEvent("layout-swap-mode-changed", {
      detail: { pageType, mode },
    }),
  );
};
interface LayoutSwitchProps {
  value: "terminal-left" | "chat-left";
  onChange: (mode: "terminal-left" | "chat-left") => void;
  label: string;
  description?: string;
  pageType: "general" | "chart" | "map" | "codeeditor" | "videoeditor" | "sandbox3d";
  t: (key: string, params?: any) => string;
}
const LayoutSwitch: React.FC<LayoutSwitchProps> = ({ value, onChange, label, description, pageType, t }) => {
  const getTerminalLabel = () => {
    switch (pageType) {
      case "chart":
        return t("settings.chartTerminal");
      case "map":
        return t("settings.mapTerminal");
      case "codeeditor":
        return t("settings.codeEditorTerminal");
      case "videoeditor":
        return t("settings.videoEditorTerminal");
      case "sandbox3d":
        return t("settings.sandbox3dTerminal");
      case "general":
      default:
        return t("settings.terminal");
    }
  };
  const terminalLabel = getTerminalLabel();
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
    height: "28px",
    padding: "0 8px",
    background: isActive ? "var(--accent-color, #00aaff)" : "transparent",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 450,
    color: isActive ? "white" : "var(--text-secondary)",
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
  const handleChange = (mode: "terminal-left" | "chat-left") => {
    onChange(mode);
    emitLayoutChangeEvent(pageType, mode);
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginBottom: "16px",
        gap: "6px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "var(--text-primary)",
          userSelect: "none",
        }}
      >
        {label}
        {description && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-tertiary)",
              marginLeft: "4px",
              display: "block",
              fontWeight: 400,
            }}
          >
            {description}
          </span>
        )}
      </div>
      <div style={layoutSwitchGroupStyle}>
        <button
          type="button"
          style={layoutSwitchBtnStyle(value === "terminal-left")}
          onClick={() => handleChange("terminal-left")}
          title={t("settings.terminalLeftTitle", { terminal: terminalLabel })}
        >
          <TerminalLeftIcon />
          <span style={btnTextStyle}>{t("settings.terminalLeftLabel", { terminal: terminalLabel })}</span>
        </button>
        <button type="button" style={layoutSwitchBtnStyle(value === "chat-left")} onClick={() => handleChange("chat-left")} title={t("settings.chatLeftTitle", { terminal: terminalLabel })}>
          <ChatLeftIcon />
          <span style={btnTextStyle}>{t("settings.chatLeftLabel", { terminal: terminalLabel })}</span>
        </button>
      </div>
    </div>
  );
};
const UniversalSettings: React.FC<UniversalSettingsProps> = ({ t, theme, language, onThemeChange, onLanguageChange, functionPanelPosition = "right", onFunctionPanelPositionChange }) => {
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [autoStartLoading, setAutoStartLoading] = useState(true);
  const [generalLayout, setGeneralLayout] = useState<"terminal-left" | "chat-left">("terminal-left");
  const [chartLayout, setChartLayout] = useState<"terminal-left" | "chat-left">("terminal-left");
  const [mapLayout, setMapLayout] = useState<"terminal-left" | "chat-left">("terminal-left");
  const [codeEditorLayout, setCodeEditorLayout] = useState<"terminal-left" | "chat-left">("terminal-left");
  const [videoEditorLayout, setVideoEditorLayout] = useState<"terminal-left" | "chat-left">("chat-left");
  const [sandbox3dLayout, setSandbox3dLayout] = useState<"terminal-left" | "chat-left">("chat-left");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        const [general, chart, map, codeEditor, videoEditor, sandbox3d, autoStart] = await Promise.all([
          configCommands.getSettingsGeneralChatLayoutSwapMode(),
          configCommands.getSettingsChartChatLayoutSwapMode(),
          configCommands.getSettingsMapChatLayoutSwapMode(),
          configCommands.getSettingsCodeEditorLayoutSwapMode(),
          configCommands.getSettingsVideoEditorLayoutSwapMode(),
          configCommands.getSettingsSandBox3DLayoutSwapMode(),
          configCommands.getSettingsAutoStart(),
        ]);
        setGeneralLayout(general as "terminal-left" | "chat-left");
        setChartLayout(chart as "terminal-left" | "chat-left");
        setMapLayout(map as "terminal-left" | "chat-left");
        setCodeEditorLayout(codeEditor as "terminal-left" | "chat-left");
        setVideoEditorLayout(videoEditor as "terminal-left" | "chat-left");
        setSandbox3dLayout(sandbox3d as "terminal-left" | "chat-left");
        setAutoStartEnabled(autoStart);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAllSettings();
  }, []);
  const handleThemeChange = async (newTheme: "light" | "dark") => {
    onThemeChange(newTheme);
    await configCommands.saveSettingsTheme(newTheme);
  };
  const handleLanguageChange = async (newLanguage: "zh" | "en") => {
    onLanguageChange(newLanguage);
    await configCommands.saveSettingsLanguage(newLanguage);
  };
  const handleGeneralLayoutChange = async (mode: "terminal-left" | "chat-left") => {
    setGeneralLayout(mode);
    await configCommands.saveSettingsGeneralChatLayoutSwapMode(mode);
  };
  const handleChartLayoutChange = async (mode: "terminal-left" | "chat-left") => {
    setChartLayout(mode);
    await configCommands.saveSettingsChartChatLayoutSwapMode(mode);
  };
  const handleMapLayoutChange = async (mode: "terminal-left" | "chat-left") => {
    setMapLayout(mode);
    await configCommands.saveSettingsMapChatLayoutSwapMode(mode);
  };
  const handleCodeEditorLayoutChange = async (mode: "terminal-left" | "chat-left") => {
    setCodeEditorLayout(mode);
    await configCommands.saveSettingsCodeEditorLayoutSwapMode(mode);
  };
  const handleVideoEditorLayoutChange = async (mode: "terminal-left" | "chat-left") => {
    setVideoEditorLayout(mode);
    await configCommands.saveSettingsVideoEditorLayoutSwapMode(mode);
  };
  const handleSandbox3dLayoutChange = async (mode: "terminal-left" | "chat-left") => {
    setSandbox3dLayout(mode);
    await configCommands.saveSettingsSandBox3DLayoutSwapMode(mode);
  };
  const handleFunctionPanelPositionChange = (position: "left" | "right") => {
    onFunctionPanelPositionChange?.(position);
    configCommands.saveSettingsFunctionPanelPosition(position);
    window.dispatchEvent(
      new CustomEvent("function-panel-position-changed", {
        detail: { position },
      }),
    );
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
    height: "28px",
    padding: "0 8px",
    background: isActive ? "var(--accent-color, #00aaff)" : "transparent",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 450,
    color: isActive ? "white" : "var(--text-secondary)",
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
    background: isActive ? "var(--accent-color, #00aaff)" : "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    cursor: "pointer",
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
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  });
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-secondary)",
          fontSize: "13px",
        }}
      >
        {t("common.loading")}
      </div>
    );
  }
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
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
          {t("settings.interfaceConfig")}
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>{t("settings.theme")}</label>
          <select style={selectStyle} value={theme} onChange={(e) => handleThemeChange(e.target.value as "light" | "dark")}>
            <option value="light">{t("settings.themeLight")}</option>
            <option value="dark">{t("settings.themeDark")}</option>
          </select>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>{t("settings.language")}</label>
          <select style={selectStyle} value={language} onChange={(e) => handleLanguageChange(e.target.value as "zh" | "en")}>
            <option value="zh">{t("settings.langZh")}</option>
            <option value="en">{t("settings.langEn")}</option>
          </select>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>{t("settings.functionPanelPosition")}</label>
          <div style={layoutSwitchGroupStyle}>
            <button type="button" style={layoutSwitchBtnStyle(functionPanelPosition === "left")} onClick={() => handleFunctionPanelPositionChange("left")} title={t("settings.functionLeftTitle")}>
              <FunctionLeftIcon />
              <span style={btnTextStyle}>{t("settings.functionLeft")}</span>
            </button>
            <button type="button" style={layoutSwitchBtnStyle(functionPanelPosition === "right")} onClick={() => handleFunctionPanelPositionChange("right")} title={t("settings.functionRightTitle")}>
              <FunctionRightIcon />
              <span style={btnTextStyle}>{t("settings.functionRight")}</span>
            </button>
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid var(--border-color, #333)",
            marginBottom: "10px",
            marginTop: "4px",
          }}
        />
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: "12px",
            paddingLeft: "4px",
          }}
        >
          {t("settings.panelLayout")}
        </div>
        <LayoutSwitch value={generalLayout} onChange={handleGeneralLayoutChange} label={t("settings.generalChat")} description={t("settings.generalChatDesc")} pageType="general" t={t} />
        <LayoutSwitch value={chartLayout} onChange={handleChartLayoutChange} label={t("settings.chartChat")} description={t("settings.chartChatDesc")} pageType="chart" t={t} />
        <LayoutSwitch value={mapLayout} onChange={handleMapLayoutChange} label={t("settings.mapChat")} description={t("settings.mapChatDesc")} pageType="map" t={t} />
        <LayoutSwitch value={codeEditorLayout} onChange={handleCodeEditorLayoutChange} label={t("settings.codeEditorChat")} description={t("settings.codeEditorDesc")} pageType="codeeditor" t={t} />
        {/* <LayoutSwitch
          value={videoEditorLayout}
          onChange={handleVideoEditorLayoutChange}
          label={t("settings.videoEditorChat")}
          description={t("settings.videoEditorDesc")}
          pageType="videoeditor"
          t={t}
        /> */}
        <LayoutSwitch value={sandbox3dLayout} onChange={handleSandbox3dLayoutChange} label={t("settings.sandbox3dChat")} description={t("settings.sandbox3dDesc")} pageType="sandbox3d" t={t} />
        <div
          style={{
            borderTop: "1px solid var(--border-color, #333)",
            marginBottom: "10px",
            marginTop: "4px",
          }}
        />
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: "12px",
            paddingLeft: "4px",
          }}
        >
          {t("settings.systemConfig")}
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>{t("settings.autoStart")}</label>
          <button
            type="button"
            style={toggleSwitchStyle(autoStartEnabled)}
            onClick={handleAutoStartToggle}
            disabled={autoStartLoading}
            title={autoStartEnabled ? t("settings.disableAutoStart") : t("settings.enableAutoStart")}
          >
            <span style={toggleKnobStyle(autoStartEnabled)} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default UniversalSettings;
