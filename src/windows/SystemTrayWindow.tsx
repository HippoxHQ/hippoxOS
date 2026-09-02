import React, { useState, useEffect } from "react";
import { configCommands } from "../command/config";
import { windowsCommands } from "../command/windows";
import { zh, en } from "../i18n";
import { SystemEvent } from "../types/types";
import { Bot, RotateCw, Info, LogOut, LucideIcon, Loader2, Download, RefreshCw, CheckCircle, Sparkles } from "lucide-react";
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
    // Cleanup timer on unmount
    return () => {
      if (resetTimerId) {
        clearTimeout(resetTimerId);
      }
    };
  }, []);
  const isZh = language === "zh";
  // Schedule auto-reset of update status after 10 seconds
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
  // Handle check update logic - same as UniversalSettings
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
  // ===== Menu items with lucide-react icons =====
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
  // ===== Build menu items with dividers =====
  const renderedMenuItems: (MenuItem | { divider: boolean })[] = [menuItems[0], { divider: true }, menuItems[1], menuItems[2], { divider: true }, menuItems[3]];
  const styles = {
    container: {
      backgroundColor: isDark ? "#1a1d26" : "#ffffff",
      borderRadius: "8px",
      border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.08)",
      overflow: "hidden" as const,
    },
    menuContainer: {
      padding: "6px 0",
      maxHeight: "345px",
      overflowY: "auto" as const,
      scrollbarColor: isDark ? "#3a3f4a #1a1d26" : "#cbd5e1 #e5e7eb",
    },
    menuItem: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "10px",
      padding: "8px 14px",
      cursor: "pointer" as const,
      color: isDark ? "#e8edf2" : "#111827",
      fontSize: "13px",
      backgroundColor: "transparent",
      transition: "background-color 0.15s",
    },
    menuIcon: {
      width: "18px",
      height: "18px",
      flexShrink: 0 as const,
    },
    menuLabel: {
      flex: 1,
    },
    submenuArrow: {
      marginLeft: "auto",
      fontSize: "10px",
      color: isDark ? "#6b7280" : "#9ca3af",
    },
    divider: {
      height: "1px",
      backgroundColor: isDark ? "#2d303a" : "#e5e7eb",
      margin: "6px 0",
    },
    // Update status styles
    updateStatusContainer: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "8px",
      flex: 1,
    },
    updateStatusText: {
      fontSize: "12px",
      color: isDark ? "#e8edf2" : "#111827",
    },
    updateErrorText: {
      fontSize: "12px",
      color: "#ff4444",
    },
    updateSuccessText: {
      fontSize: "12px",
      color: "#4caf50",
    },
    updateAccentText: {
      fontSize: "12px",
      color: "#00aaff",
      fontWeight: 500,
    },
    updateVersionText: {
      fontSize: "10px",
      color: isDark ? "#6b7280" : "#9ca3af",
    },
    retryButton: {
      padding: "2px 10px",
      borderRadius: "4px",
      border: `1px solid ${isDark ? "#3a3f4a" : "#d1d5db"}`,
      background: "transparent",
      color: isDark ? "#e8edf2" : "#111827",
      cursor: "pointer" as const,
      fontSize: "11px",
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "4px",
    },
    updateButton: {
      padding: "2px 12px",
      borderRadius: "4px",
      border: "none",
      background: "#00aaff",
      color: "white",
      cursor: "pointer" as const,
      fontSize: "11px",
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "4px",
      flexShrink: 0 as const,
    },
    updateButtonDisabled: {
      padding: "2px 12px",
      borderRadius: "4px",
      border: "none",
      background: "#555",
      color: "#999",
      cursor: "not-allowed" as const,
      fontSize: "11px",
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "4px",
      flexShrink: 0 as const,
    },
    checkButton: {
      padding: "2px 12px",
      borderRadius: "4px",
      border: `1px solid ${isDark ? "#3a3f4a" : "#d1d5db"}`,
      background: "transparent",
      color: isDark ? "#e8edf2" : "#111827",
      cursor: "pointer" as const,
      fontSize: "11px",
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "4px",
      flexShrink: 0 as const,
    },
    loadingSpinner: {
      animation: "spin 1s linear infinite",
    },
  };
  // Helper to render update item content
  const renderUpdateItem = (item: MenuItem) => {
    const isHovered = hoveredItem === item.id;
    // If checking for update
    if (checkingUpdate) {
      return (
        <div
          style={{
            ...styles.menuItem,
            backgroundColor: isHovered ? (isDark ? "rgba(232,237,242,0.08)" : "rgba(0,0,0,0.04)") : "transparent",
          }}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <item.icon style={styles.menuIcon} />
          <div style={styles.updateStatusContainer}>
            <Loader2 size={14} style={styles.loadingSpinner} />
            <span style={styles.updateStatusText}>{isZh ? "检查中..." : "Checking..."}</span>
          </div>
        </div>
      );
    }
    // If downloading
    if (downloading) {
      return (
        <div
          style={{
            ...styles.menuItem,
            backgroundColor: isHovered ? (isDark ? "rgba(232,237,242,0.08)" : "rgba(0,0,0,0.04)") : "transparent",
          }}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <Loader2 size={14} style={styles.loadingSpinner} />
          <div style={styles.updateStatusContainer}>
            <span style={styles.updateStatusText}>{isZh ? `下载中` : `Downloading`}</span>
          </div>
        </div>
      );
    }
    // If there's an error
    if (updateError) {
      return (
        <div
          style={{
            ...styles.menuItem,
            backgroundColor: isHovered ? (isDark ? "rgba(232,237,242,0.08)" : "rgba(0,0,0,0.04)") : "transparent",
          }}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <item.icon style={styles.menuIcon} />
          <div style={styles.updateStatusContainer}>
            <span style={styles.updateErrorText}>{updateError}</span>
            <button
              style={styles.retryButton}
              onClick={(e) => {
                e.stopPropagation();
                handleCheckUpdate();
              }}
            >
              <RefreshCw size={10} />
              {isZh ? "重试" : "Retry"}
            </button>
          </div>
        </div>
      );
    }
    // If update is available
    if (versionInfo?.has_update) {
      return (
        <div
          style={{
            ...styles.menuItem,
            backgroundColor: isHovered ? (isDark ? "rgba(232,237,242,0.08)" : "rgba(0,0,0,0.04)") : "transparent",
            padding: "6px 14px",
          }}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <Sparkles size={14} style={{ color: "#00aaff", flexShrink: 0 }} />
          <div style={styles.updateStatusContainer}>
            <span style={styles.updateAccentText}>{isZh ? `发现新版本 ${versionInfo.latest_version}` : `New version ${versionInfo.latest_version} available`}</span>
            <span style={styles.updateVersionText}>{isZh ? `当前: ${versionInfo.current_version}` : `Current: ${versionInfo.current_version}`}</span>
          </div>
          <button
            style={styles.updateButton}
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadAndInstall();
            }}
          >
            <Download size={12} />
            {isZh ? "更新" : "Update"}
          </button>
        </div>
      );
    }
    // If already up to date
    if (versionInfo && !versionInfo.has_update) {
      return (
        <div
          style={{
            ...styles.menuItem,
            backgroundColor: isHovered ? (isDark ? "rgba(232,237,242,0.08)" : "rgba(0,0,0,0.04)") : "transparent",
          }}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <CheckCircle size={14} style={{ color: "#4caf50", flexShrink: 0 }} />
          <span style={styles.updateSuccessText}>{isZh ? "当前已是最新版本" : "You are on the latest version"}</span>
        </div>
      );
    }
    // Default: show check update button
    return (
      <div
        style={{
          ...styles.menuItem,
          backgroundColor: isHovered ? (isDark ? "rgba(232,237,242,0.08)" : "rgba(0,0,0,0.04)") : "transparent",
        }}
        onClick={() => handleCheckUpdate()}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <item.icon style={styles.menuIcon} />
        <span style={styles.menuLabel}>{item.label}</span>
        <button
          style={styles.checkButton}
          onClick={(e) => {
            e.stopPropagation();
            handleCheckUpdate();
          }}
        >
          <RefreshCw size={10} />
          {isZh ? "检查" : "Check"}
        </button>
      </div>
    );
  };
  return (
    <div style={styles.container}>
      {/* Add spin animation keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.menuContainer}>
        {renderedMenuItems.map((item, index) => {
          if ("divider" in item) {
            return <div key={`divider-${index}`} style={styles.divider} />;
          }
          // Special rendering for update item
          if (item.isUpdateItem) {
            return <div key={item.id}>{renderUpdateItem(item)}</div>;
          }
          const isHovered = hoveredItem === item.id;
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              style={{
                ...styles.menuItem,
                backgroundColor: isHovered ? (isDark ? "rgba(232,237,242,0.08)" : "rgba(0,0,0,0.04)") : "transparent",
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
              <IconComponent style={styles.menuIcon} />
              <span style={styles.menuLabel}>{item.label}</span>
              {item.hasSubmenu && <span style={styles.submenuArrow}>▶</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default SystemTrayWindow;
