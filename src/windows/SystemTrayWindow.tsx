import React, { useState, useEffect } from "react";
import { configCommands } from "../command/config";
import { windowsCommands } from "../command/windows";
import { zh, en } from "../i18n";
import { SystemEvent } from "../types/types";
import { Bot, RotateCw, Info, LogOut, LucideIcon } from "lucide-react";
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
  }, []);
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
  };
  return (
    <div style={styles.container}>
      <div style={styles.menuContainer}>
        {renderedMenuItems.map((item, index) => {
          if ("divider" in item) {
            return <div key={`divider-${index}`} style={styles.divider} />;
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
