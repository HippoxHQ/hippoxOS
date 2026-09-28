import React, { useState, useEffect, useRef, useCallback } from "react";
import { configCommands } from "../../../command/config";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import { systemUpdateCommands, VersionInfo } from "../../../command/SystemUpdate";
import { PanelLeftClose, PanelRightClose, Terminal, MessageSquare, PanelLeft, PanelRight, Monitor, Globe, Power, Sparkles, Loader2, Download, RefreshCw, CheckCircle, AlertCircle, XCircle, ChevronDown } from "lucide-react";
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
/**
 * Custom dropdown option shape.
 */
interface CustomSelectOption {
  value: string;
  label: string;
}
/**
 * CustomSelect
 *
 * A self-rendered dropdown that replaces the native <select> element.
 * Behaviour mirrors the CanvasPresetDropdown used in InfoPanel:
 *   - Opens on trigger click.
 *   - Closes on outside pointerdown, ESC, window scroll, or resize.
 *   - Positions itself with fixed coordinates relative to the trigger.
 */
interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  /** Width of the trigger button in pixels. */
  triggerWidth?: number;
  /** Minimum width of the dropdown menu in pixels. */
  menuMinWidth?: number;
  /** Horizontal alignment of the menu relative to the trigger. */
  menuAlign?: "left" | "right";
}
const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, disabled, onChange, triggerWidth = 180, menuMinWidth = 160, menuAlign = "right" }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const selected = options.find((o) => o.value === value) || options[0];
  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = Math.max(menuMinWidth, rect.width);
    // Align the menu horizontally with the trigger; keep it inside the viewport.
    let left = menuAlign === "right" ? rect.right - menuWidth - 45 : rect.left;
    if (left < 8) left = 8;
    const top = rect.bottom - 30;
    setMenuPosition({ top, left, minWidth: menuWidth });
  }, [menuMinWidth, menuAlign]);
  // Recompute position when the menu opens.
  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, updateMenuPosition]);
  // Close on outside click, ESC, window scroll, or resize.
  useEffect(() => {
    if (!open) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      // Scrolling inside the menu itself should not close it.
      if (target && menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleResize = () => {
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDownOutside, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);
  const handleSelect = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      setOpen(false);
    },
    [onChange],
  );
  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-flex",
        justifyContent: "flex-end",
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        title={selected?.label}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          width: `${triggerWidth}px`,
          minWidth: `${triggerWidth}px`,
          maxWidth: `${triggerWidth}px`,
          height: "34px",
          padding: "0 10px",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
          fontSize: "13px",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            flex: 1,
            textAlign: "left",
          }}
        >
          {selected?.label}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
            color: "var(--text-secondary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <ChevronDown size={12} />
        </span>
      </button>
      {open && menuPosition && (
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: "fixed",
            top: menuPosition.top,
            left: menuPosition.left,
            minWidth: `${menuPosition.minWidth}px`,
            maxHeight: "240px",
            overflowY: "auto",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
            zIndex: 2000,
            padding: "4px",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                title={opt.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  color: isSelected ? "var(--accent-color, #00aaff)" : "var(--text-primary)",
                  background: isSelected ? "var(--hover-bg)" : "transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  {opt.label}
                </span>
                {isSelected && (
                  <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                    <CheckCircle size={12} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
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
  const [sandbox3dLayout, setSandbox3dLayout] = useState<"terminal-left" | "chat-left">("terminal-left");
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
    // Cancel any pending auto-reset so the downloading state is not cleared mid-download
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
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
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
  const updateResultStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: "1 1 auto",
    justifyContent: "flex-end",
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
  };
  const updateButtonContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: "1 1 auto",
    justifyContent: "flex-end",
    minWidth: 0,
    flexWrap: "nowrap",
    overflow: "hidden",
  };
  const updateStatusStyle: React.CSSProperties = {
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: "1 1 auto",
    justifyContent: "flex-end",
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
  };
  // Theme options for the custom dropdown.
  const themeOptions: CustomSelectOption[] = [
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") },
  ];
  // Language options for the custom dropdown.
  const languageOptions: CustomSelectOption[] = [
    { value: "zh", label: t("settings.langZh") },
    { value: "en", label: t("settings.langEn") },
  ];
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
          <CustomSelect options={themeOptions} value={theme} onChange={(next) => handleThemeChange(next as "light" | "dark")} triggerWidth={180} menuMinWidth={180} menuAlign="right" />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>{t("settings.language")}</label>
          <CustomSelect options={languageOptions} value={language} onChange={(next) => handleLanguageChange(next as "zh" | "en")} triggerWidth={180} menuMinWidth={180} menuAlign="right" />
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
        {/* <div
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
         */}
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
        {/* Update row: keep label and controls on a single line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            gap: "12px",
            flexWrap: "nowrap",
            minWidth: 0,
          }}
        >
          <label style={{ ...labelStyle, flexShrink: 0 }}>{isZh ? "检查更新" : "Check Update"}</label>
          <div style={{ ...updateButtonContainerStyle, flex: "0 1 auto" }}>
            {checkingUpdate ? (
              <div style={updateStatusStyle}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                <span style={{ color: "var(--text-secondary)" }}>{isZh ? "检查中..." : "Checking..."}</span>
              </div>
            ) : downloading ? (
              // Downloading state: show only the progress bar, no text and no loader.
              <div
                style={{
                  position: "relative",
                  width: "160px",
                  height: "6px",
                  borderRadius: "3px",
                  background: "var(--bg-tertiary)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: downloadProgress > 0 ? `${Math.min(downloadProgress, 100)}%` : "40%",
                    background: "var(--accent-color, #00aaff)",
                    borderRadius: "3px",
                    transition: downloadProgress > 0 ? "width 0.2s ease" : "none",
                    // Indeterminate animation runs while no numeric progress is reported,
                    // so the bar keeps moving and the UI never looks frozen.
                    animation: downloadProgress > 0 ? "none" : "indeterminate 1.2s ease-in-out infinite",
                  }}
                />
              </div>
            ) : updateError ? (
              <div style={updateStatusStyle}>
                <span style={{ color: "var(--text-error, #ff4444)", overflow: "hidden", textOverflow: "ellipsis" }}>{updateError}</span>
                <button
                  style={{
                    ...updateButtonStyle,
                    padding: "4px 12px",
                    fontSize: "12px",
                    minWidth: "auto",
                    flexShrink: 0,
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
                  <span
                    style={{
                      color: "var(--accent-color, #00aaff)",
                      fontSize: "10px",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isZh ? `新版本 ${versionInfo.latest_version}` : `New Version ${versionInfo.latest_version}`}
                  </span>
                  {/* <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-tertiary)",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isZh ? `当前: ${versionInfo.current_version}` : `Current: ${versionInfo.current_version}`}
                  </span> */}
                </div>
                <button
                  style={{
                    ...updateButtonStyle,
                    background: "var(--accent-color, #00aaff)",
                    borderColor: "var(--accent-color, #00aaff)",
                    color: "white",
                    flexShrink: 0,
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
                <CheckCircle size={14} style={{ color: "var(--text-success, #4caf50)", flexShrink: 0 }} />
                <span
                  style={{
                    color: "var(--text-success, #4caf50)",
                    whiteSpace: "nowrap",
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
          /* Indeterminate progress bar animation: a moving highlight that never stops,
             used when the backend does not report numeric progress. */
          @keyframes indeterminate {
            0%   { left: -40%; width: 40%; }
            50%  { left: 30%;  width: 40%; }
            100% { left: 100%; width: 40%; }
          }
        `}</style>
      </div>
    </div>
  );
};
export default UniversalSettings;
