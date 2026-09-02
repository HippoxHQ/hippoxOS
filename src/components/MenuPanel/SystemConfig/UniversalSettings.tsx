import React, { useState, useEffect, useRef } from "react";
import { configCommands } from "../../../command/config";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import { systemUpdateCommands, VersionInfo } from "../../../command/SystemUpdate";
import { PanelLeftClose, PanelRightClose, Terminal, MessageSquare, PanelLeft, PanelRight, Monitor, Globe, Power, Sparkles, Loader2, Download, RefreshCw, CheckCircle, AlertCircle, XCircle } from "lucide-react";
interface UniversalSettingsProps {
  t: (key: string, params?: any) => string;
  theme: "light" | "dark";
  language: "zh" | "en";
  onThemeChange: (theme: "light" | "dark") => void;
  onLanguageChange: (language: "zh" | "en") => void;
  functionPanelPosition?: "left" | "right";
  onFunctionPanelPositionChange?: (position: "left" | "right") => void;
}
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
    gap: "6px",
    flex: "1 1 auto",
    minWidth: 0,
    height: "28px",
    padding: "0 10px",
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
        <button type="button" style={layoutSwitchBtnStyle(value === "terminal-left")} onClick={() => handleChange("terminal-left")} title={t("settings.terminalLeftTitle", { terminal: terminalLabel })}>
          <PanelLeftClose size={14} />
          <span style={btnTextStyle}>{t("settings.terminalLeftLabel", { terminal: terminalLabel })}</span>
        </button>
        <button type="button" style={layoutSwitchBtnStyle(value === "chat-left")} onClick={() => handleChange("chat-left")} title={t("settings.chatLeftTitle", { terminal: terminalLabel })}>
          <PanelRightClose size={14} />
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
  // Update check states
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  // Download states
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isZh = t("i18n") === "zh";
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);
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
  const scheduleAutoReset = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    resetTimerRef.current = setTimeout(() => {
      setVersionInfo(null);
      setUpdateError(null);
      setCheckingUpdate(false);
      setDownloading(false);
      setDownloadProgress(0);
      resetTimerRef.current = null;
    }, 10000);
  };
  const handleCheckUpdate = async () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setCheckingUpdate(true);
    setUpdateError(null);
    setVersionInfo(null);
    setDownloadProgress(0);
    try {
      const info = await systemUpdateCommands.checkVersionUpdate();
      setVersionInfo(info);
      scheduleAutoReset();
    } catch (error) {
      console.error("Failed to check update:", error);
      setUpdateError(isZh ? "检查更新失败，请稍后重试" : "Failed to check update, please try again");
      scheduleAutoReset();
    } finally {
      setCheckingUpdate(false);
    }
  };
  // Handle download and install update
  const handleDownloadAndInstall = async () => {
    if (!versionInfo?.download_url) {
      setUpdateError(isZh ? "下载链接不可用" : "Download URL not available");
      return;
    }
    setDownloading(true);
    setDownloadProgress(0);
    setUpdateError(null);
    try {
      // Call backend to download and install
      await systemUpdateCommands.downloadAndInstallUpdate(versionInfo.download_url, (progress: number) => {
        setDownloadProgress(progress);
      });
      // On success, the app will exit and installer will run
    } catch (error) {
      console.error("Download/Install failed:", error);
      setUpdateError(isZh ? "下载或安装失败，请重试" : "Download or install failed, please retry");
      setDownloading(false);
      scheduleAutoReset();
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
    gap: "6px",
    flex: "1 1 auto",
    minWidth: 0,
    height: "28px",
    padding: "0 10px",
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
  const updateButtonStyle: React.CSSProperties = {
    padding: "6px 16px",
    borderRadius: "6px",
    border: "1px solid var(--border-color)",
    background: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: "13px",
    transition: "all 0.2s",
    minWidth: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  };
  const updateResultStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    justifyContent: "flex-end",
  };
  const updateButtonContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
    justifyContent: "flex-end",
  };
  const updateStatusStyle: React.CSSProperties = {
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    justifyContent: "flex-end",
  };
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
              <PanelLeft size={14} />
              <span style={btnTextStyle}>{t("settings.functionLeft")}</span>
            </button>
            <button type="button" style={layoutSwitchBtnStyle(functionPanelPosition === "right")} onClick={() => handleFunctionPanelPositionChange("right")} title={t("settings.functionRightTitle")}>
              <PanelRight size={14} />
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
          <button type="button" style={toggleSwitchStyle(autoStartEnabled)} onClick={handleAutoStartToggle} disabled={autoStartLoading} title={autoStartEnabled ? t("settings.disableAutoStart") : t("settings.enableAutoStart")}>
            <span style={toggleKnobStyle(autoStartEnabled)} />
          </button>
        </div>
        {/* Update Check Section */}
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
          {isZh ? "版本更新" : "Version Update"}
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>{isZh ? "检查更新" : "Check Update"}</label>
          <div style={updateButtonContainerStyle}>
            {checkingUpdate ? (
              <div style={updateStatusStyle}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ color: "var(--text-secondary)" }}>{isZh ? "检查中..." : "Checking..."}</span>
              </div>
            ) : downloading ? (
              <div style={updateStatusStyle}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ color: "var(--text-secondary)" }}>{isZh ? `下载中` : `Downloading`}</span>
              </div>
            ) : updateError ? (
              <div style={updateStatusStyle}>
                <span style={{ color: "var(--text-error, #ff4444)" }}>{updateError}</span>
                <button
                  style={{
                    ...updateButtonStyle,
                    padding: "4px 12px",
                    fontSize: "12px",
                    minWidth: "auto",
                  }}
                  onClick={handleCheckUpdate}
                >
                  <RefreshCw size={12} />
                  {isZh ? "重试" : "Retry"}
                </button>
              </div>
            ) : versionInfo?.has_update ? (
              <>
                <div style={updateResultStyle}>
                  <Sparkles size={14} style={{ color: "var(--accent-color, #00aaff)" }} />
                  <span
                    style={{
                      color: "var(--accent-color, #00aaff)",
                      fontWeight: 500,
                    }}
                  >
                    {isZh ? `发现新版本 ${versionInfo.latest_version}` : `New version ${versionInfo.latest_version} available`}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {isZh ? `当前: ${versionInfo.current_version}` : `Current: ${versionInfo.current_version}`}
                  </span>
                </div>
                <button
                  style={{
                    ...updateButtonStyle,
                    background: "var(--accent-color, #00aaff)",
                    borderColor: "var(--accent-color, #00aaff)",
                    color: "white",
                  }}
                  onClick={handleDownloadAndInstall}
                  disabled={downloading}
                >
                  <Download size={14} />
                  {isZh ? "更新" : "Update"}
                </button>
              </>
            ) : versionInfo && !versionInfo.has_update ? (
              <div style={updateResultStyle}>
                <CheckCircle size={14} style={{ color: "var(--text-success, #4caf50)" }} />
                <span
                  style={{
                    color: "var(--text-success, #4caf50)",
                  }}
                >
                  {isZh ? "当前已是最新版本" : "You are on the latest version"}
                </span>
              </div>
            ) : (
              <button
                style={updateButtonStyle}
                onClick={handleCheckUpdate}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }}
              >
                <RefreshCw size={14} />
                {isZh ? "检查更新" : "Check"}
              </button>
            )}
          </div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
export default UniversalSettings;
