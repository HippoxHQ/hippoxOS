import React, { useState, useEffect } from "react";
import { configCommands } from "../command/config";
import { windowsCommands } from "../command/windows";
import { zh, en } from "../i18n";
import { SystemEvent } from "../types/types";
import { Bot, RotateCw, Info, LogOut, LucideIcon, Loader2, Download, RefreshCw, CheckCircle, Sparkles, ChevronRight } from "lucide-react";
import { systemUpdateCommands, VersionInfo } from "../command/SystemUpdate";
const getTranslation = (language: "zh" | "en", key: string): string => {
  const translations = language === "zh" ? zh : en;
  const keys = key.split(".");
  let value: any = translations;
  for (const k of keys) {
    if (value === undefined) return key;
    value = value[k];
  }
  return value || key;
};
const openLLMSubmenu = async () => {
  const instancesData = await windowsCommands.getLlmInstances();
  const defaultId = await windowsCommands.getDefaultLlmInstanceId();
  const items = Object.entries(instancesData || {}).map(([id, instance]: [string, any]) => ({
    id,
    name: instance.name,
    isDefault: id === defaultId,
  }));
  await windowsCommands.createSubmenuWindow(items, defaultId);
};
const openAboutWindow = async () => {
  await windowsCommands.createAboutWindow();
};
const SystemTrayWindow: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  // Update check states
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  // Download states
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [resetTimerId, setResetTimerId] = useState<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTheme, savedLanguage] = await Promise.all([configCommands.getSettingsTheme(), configCommands.getSettingsLanguage()]);
        setTheme(savedTheme as "dark" | "light");
        setLanguage(savedLanguage as "zh" | "en");
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadData();
    return () => {
      if (resetTimerId) {
        clearTimeout(resetTimerId);
      }
    };
  }, []);
  const isZh = language === "zh";
  const scheduleAutoReset = () => {
    if (resetTimerId) {
      clearTimeout(resetTimerId);
    }
    const timer = setTimeout(() => {
      setVersionInfo(null);
      setUpdateError(null);
      setCheckingUpdate(false);
      setDownloading(false);
      setDownloadProgress(0);
      setResetTimerId(null);
    }, 10000);
    setResetTimerId(timer);
  };
  const handleCheckUpdate = async () => {
    if (resetTimerId) {
      clearTimeout(resetTimerId);
      setResetTimerId(null);
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
      setUpdateError(isZh ? "检查更新失败" : "Check failed");
      scheduleAutoReset();
    } finally {
      setCheckingUpdate(false);
    }
  };
  const handleDownloadAndInstall = async () => {
    if (!versionInfo?.download_url) {
      setUpdateError(isZh ? "下载链接不可用" : "Download URL not available");
      return;
    }
    setDownloading(true);
    setDownloadProgress(0);
    setUpdateError(null);
    try {
      await systemUpdateCommands.downloadAndInstallUpdate(versionInfo.download_url, (progress: number) => {
        setDownloadProgress(progress);
      });
    } catch (error) {
      console.error("Download/Install failed:", error);
      setUpdateError(isZh ? "下载或安装失败" : "Download or install failed");
      setDownloading(false);
      scheduleAutoReset();
    }
  };
  const handleMenuItemClick = (action: string) => {
    if (action === "quit") {
      windowsCommands.exitApp();
    } else if (action === SystemEvent.ShowAbout) {
      openAboutWindow();
    } else {
      windowsCommands.sendEvent(action);
    }
  };
  const isDark = theme === "dark";
  const t = (key: string) => getTranslation(language, key);
  // ===== Compact palette =====
  const palette = {
    bg: isDark ? "#1c1f27" : "#ffffff",
    border: isDark ? "#2a2e38" : "#e6e8ec",
    divider: isDark ? "#262a33" : "#eef0f3",
    text: isDark ? "#e6e9ef" : "#1f2430",
    textMuted: isDark ? "#7c8290" : "#9096a3",
    hover: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)",
    hoverStrong: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    accent: "#3b82f6",
    accentSoft: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.10)",
    success: "#22c55e",
    danger: "#ef4444",
    btnBg: isDark ? "#262a33" : "#f3f4f6",
    btnBorder: isDark ? "#31363f" : "#dfe2e7",
  };
  interface MenuItem {
    id: string;
    label: string;
    icon: LucideIcon;
    hasSubmenu?: boolean;
    isUpdateItem?: boolean;
  }
  const menuItems: MenuItem[] = [
    {
      id: "llm_status",
      label: t("bottomBar.model") || "AI Model",
      icon: Bot,
      hasSubmenu: true,
    },
    {
      id: SystemEvent.CheckUpdates,
      label: t("settings.update") || "Check for Updates",
      icon: RotateCw,
      isUpdateItem: true,
    },
    { id: SystemEvent.ShowAbout, label: "About", icon: Info },
    { id: "quit", label: t("common.close") || "Quit", icon: LogOut },
  ];
  // ===== Compact styles =====
  const S = {
    container: {
      backgroundColor: palette.bg,
      borderRadius: "6px",
      border: `1px solid ${palette.border}`,
      boxShadow: isDark ? "0 4px 14px rgba(0,0,0,0.35)" : "0 4px 14px rgba(0,0,0,0.08)",
      overflow: "hidden" as const,
      minWidth: "196px",
    },
    menuContainer: {
      padding: "4px",
      maxHeight: "300px",
      overflowY: "auto" as const,
    },
    menuItem: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "8px",
      padding: "6px 8px",
      borderRadius: "4px",
      cursor: "pointer" as const,
      color: palette.text,
      fontSize: "12px",
      lineHeight: "16px",
      backgroundColor: "transparent",
      transition: "background-color 0.12s ease",
    },
    menuIcon: {
      width: "14px",
      height: "14px",
      flexShrink: 0 as const,
      color: palette.textMuted,
    },
    menuLabel: {
      flex: 1,
      whiteSpace: "nowrap" as const,
      overflow: "hidden" as const,
      textOverflow: "ellipsis" as const,
    },
    submenuArrow: {
      marginLeft: "auto",
      display: "flex" as const,
      alignItems: "center" as const,
      color: palette.textMuted,
      flexShrink: 0 as const,
    },
    divider: {
      height: "1px",
      backgroundColor: palette.divider,
      margin: "3px 6px",
    },
    // ---- inline status row (single-line, compact) ----
    statusRow: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "6px",
      flex: 1,
      minWidth: 0,
    },
    statusText: {
      fontSize: "11px",
      color: palette.text,
      whiteSpace: "nowrap" as const,
      overflow: "hidden" as const,
      textOverflow: "ellipsis" as const,
    },
    statusMuted: {
      fontSize: "10px",
      color: palette.textMuted,
      flexShrink: 0 as const,
    },
    statusSuccess: {
      fontSize: "11px",
      color: palette.success,
    },
    statusError: {
      fontSize: "11px",
      color: palette.danger,
      whiteSpace: "nowrap" as const,
      overflow: "hidden" as const,
      textOverflow: "ellipsis" as const,
    },
    statusAccent: {
      fontSize: "11px",
      color: palette.accent,
      fontWeight: 500 as const,
      whiteSpace: "nowrap" as const,
      overflow: "hidden" as const,
      textOverflow: "ellipsis" as const,
    },
    // ---- compact buttons ----
    btnGhost: {
      padding: "2px 8px",
      borderRadius: "4px",
      border: `1px solid ${palette.btnBorder}`,
      background: "transparent",
      color: palette.text,
      cursor: "pointer" as const,
      fontSize: "10px",
      lineHeight: "14px",
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "3px",
      flexShrink: 0 as const,
      transition: "background-color 0.12s ease",
    },
    btnPrimary: {
      padding: "2px 8px",
      borderRadius: "4px",
      border: "none",
      background: palette.accent,
      color: "#fff",
      cursor: "pointer" as const,
      fontSize: "10px",
      lineHeight: "14px",
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "3px",
      flexShrink: 0 as const,
      transition: "opacity 0.12s ease",
    },
    spinner: {
      animation: "spin 1s linear infinite",
    },
  };
  // ===== Update item renderer (compact) =====
  const renderUpdateItem = (item: MenuItem) => {
    const isHovered = hoveredItem === item.id;
    const rowBg = isHovered ? palette.hover : "transparent";
    // Checking
    if (checkingUpdate) {
      return (
        <div style={{ ...S.menuItem, backgroundColor: rowBg, cursor: "default" }} onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}>
          <Loader2 size={13} style={S.spinner} color={palette.textMuted} />
          <div style={S.statusRow}>
            <span style={S.statusText}>{isZh ? "检查中…" : "Checking…"}</span>
          </div>
        </div>
      );
    }
    // Downloading
    if (downloading) {
      return (
        <div style={{ ...S.menuItem, backgroundColor: rowBg, cursor: "default" }} onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}>
          <Loader2 size={13} style={S.spinner} color={palette.accent} />
          <div style={S.statusRow}>
            <span style={S.statusText}>
              {isZh ? "下载中" : "Downloading"}
              {downloadProgress > 0 ? ` ${downloadProgress}%` : ""}
            </span>
          </div>
        </div>
      );
    }
    // Error
    if (updateError) {
      return (
        <div style={{ ...S.menuItem, backgroundColor: rowBg, cursor: "default" }} onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}>
          <item.icon style={S.menuIcon} />
          <div style={S.statusRow}>
            <span style={S.statusError}>{updateError}</span>
          </div>
          <button
            style={S.btnGhost}
            onClick={(e) => {
              e.stopPropagation();
              handleCheckUpdate();
            }}
          >
            <RefreshCw size={9} />
            {isZh ? "重试" : "Retry"}
          </button>
        </div>
      );
    }
    // Update available
    if (versionInfo?.has_update) {
      return (
        <div style={{ ...S.menuItem, backgroundColor: rowBg, cursor: "default" }} onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}>
          <Sparkles size={13} color={palette.accent} style={{ flexShrink: 0 }} />
          <div style={S.statusRow}>
            <span style={S.statusAccent}>{isZh ? `v${versionInfo.latest_version}` : `v${versionInfo.latest_version}`}</span>
          </div>
          <button
            style={S.btnPrimary}
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadAndInstall();
            }}
          >
            <Download size={9} />
            {isZh ? "更新" : "Update"}
          </button>
        </div>
      );
    }
    // Up to date
    if (versionInfo && !versionInfo.has_update) {
      return (
        <div style={{ ...S.menuItem, backgroundColor: rowBg, cursor: "default" }} onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}>
          <CheckCircle size={13} color={palette.success} style={{ flexShrink: 0 }} />
          <div style={S.statusRow}>
            <span style={S.statusSuccess}>{isZh ? "已是最新版本" : "Up to date"}</span>
          </div>
        </div>
      );
    }
    // Default: show check button
    return (
      <div style={{ ...S.menuItem, backgroundColor: rowBg }} onClick={() => handleCheckUpdate()} onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}>
        <item.icon style={S.menuIcon} />
        <span style={S.menuLabel}>{item.label}</span>
        <button
          style={S.btnGhost}
          onClick={(e) => {
            e.stopPropagation();
            handleCheckUpdate();
          }}
        >
          <RefreshCw size={9} />
          {isZh ? "检查" : "Check"}
        </button>
      </div>
    );
  };
  // ===== Menu layout with dividers =====
  const renderedMenuItems: (MenuItem | { divider: boolean })[] = [menuItems[0], { divider: true }, menuItems[1], { divider: true }, menuItems[2], menuItems[3]];
  return (
    <div style={S.container}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: ${isDark ? "#31363f" : "#d5d8dd"};
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "#3a4049" : "#c1c5cc"};
        }
      `}</style>
      <div style={S.menuContainer}>
        {renderedMenuItems.map((item, index) => {
          if ("divider" in item) {
            return <div key={`divider-${index}`} style={S.divider} />;
          }
          if (item.isUpdateItem) {
            return <div key={item.id}>{renderUpdateItem(item)}</div>;
          }
          const isHovered = hoveredItem === item.id;
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              style={{
                ...S.menuItem,
                backgroundColor: isHovered ? palette.hover : "transparent",
              }}
              onClick={() => {
                if (item.id === "llm_status") {
                  openLLMSubmenu();
                } else {
                  handleMenuItemClick(item.id);
                }
              }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <IconComponent style={S.menuIcon} />
              <span style={S.menuLabel}>{item.label}</span>
              {item.hasSubmenu && (
                <span style={S.submenuArrow}>
                  <ChevronRight size={12} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default SystemTrayWindow;
