import React, { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { configCommands } from "../api/config";
import { invoke } from "@tauri-apps/api/core";
import { zh, en } from "../i18n";
import { healthCommands, HealthCheckResult } from "../api/health";

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

interface LLMInstance {
  id: string;
  name: string;
  isDefault: boolean;
  status?: "online" | "offline" | "checking";
}

const openLLMSubmenu = async () => {
  const instancesData = await invoke<any>("get_llm_instances");
  const defaultId = await invoke<string>("get_default_llm_instance_id");
  const items = Object.entries(instancesData || {}).map(
    ([id, instance]: [string, any]) => ({
      id,
      name: instance.name,
      isDefault: id === defaultId,
    }),
  );
  await invoke("cmd_create_submenu_window", {
    items,
    currentDefaultId: defaultId,
  });
};

const SystemTrayWindow: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [llmInstances, setLlmInstances] = useState<LLMInstance[]>([]);
  const [isLoadingLLM, setIsLoadingLLM] = useState(true);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTheme, savedLanguage] = await Promise.all([
          configCommands.getSettingsTheme(),
          configCommands.getSettingsLanguage(),
        ]);
        setTheme(savedTheme as "dark" | "light");
        setLanguage(savedLanguage as "zh" | "en");
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadData();
    loadLLMInstances();
  }, []);

  const loadLLMInstances = async () => {
    try {
      setIsLoadingLLM(true);
      const instancesData = await invoke<any>("get_llm_instances");
      const defaultId = await invoke<string>("get_default_llm_instance_id");

      const instancesList = Object.entries(instancesData || {}).map(
        ([id, instance]: [string, any]) => ({
          id,
          name: instance.name,
          isDefault: id === defaultId,
          status: "checking" as const,
        }),
      );

      setLlmInstances(instancesList);

      if (instancesList.length > 0) {
        await performHealthChecks(instancesList);
      }
    } catch (error) {
      console.error("Failed to load LLM instances:", error);
    } finally {
      setIsLoadingLLM(false);
    }
  };

  const performHealthChecks = async (instances: LLMInstance[]) => {
    if (instances.length === 0) return;
    setIsCheckingHealth(true);

    setLlmInstances((prev) =>
      prev.map((inst) => ({ ...inst, status: "checking" })),
    );

    try {
      const results = await healthCommands.checkAllLlmHealth();
      setLlmInstances((prev) =>
        prev.map((inst) => {
          const result = results.find(
            (r: HealthCheckResult) => r.instance_id === inst.id,
          );
          return {
            ...inst,
            status: result?.status === "online" ? "online" : "offline",
          };
        }),
      );
    } catch (error) {
      setLlmInstances((prev) =>
        prev.map((inst) => ({ ...inst, status: "offline" })),
      );
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const setDefaultLLM = async (instanceId: string) => {
    try {
      await invoke("set_default_llm_instance", { instanceId });
      setLlmInstances((prev) =>
        prev.map((item) => ({
          ...item,
          isDefault: item.id === instanceId,
        })),
      );
      const lang = language;
      const message = lang === "zh" ? "默认 LLM 已更新" : "Default LLM updated";
      invoke("emit_to_main_window", {
        event: "show-notification",
        payload: { message },
      });
    } catch (error) {
      console.error("Failed to set default LLM:", error);
      const lang = language;
      const errorMsg =
        lang === "zh" ? "设置默认 LLM 失败" : "Failed to set default LLM";
      invoke("emit_to_main_window", {
        event: "show-notification",
        payload: { message: errorMsg, type: "error" },
      });
    }
  };

  const handleMenuItemClick = (action: string) => {
    if (action === "quit") {
      invoke("exit_app");
    } else if (action === "open_history_dir") {
      invoke("cmd_open_path", { path: "" });
    } else if (action === "open_notification_dir") {
      invoke("cmd_open_path", { path: "" });
    } else if (action === "open_workspace_dir") {
      invoke("cmd_open_path", { path: "" });
    } else if (action === "check_updates") {
      invoke("emit_to_main_window", { event: "check-updates" });
    } else if (action === "about") {
      invoke("emit_to_main_window", { event: "show-about" });
    } else if (action === "llm_config") {
      invoke("emit_to_main_window", { event: "open-llm-config" });
    } else {
      invoke("emit_to_main_window", { event: action });
    }
  };

  const recheckHealth = async () => {
    if (!isCheckingHealth && llmInstances.length > 0) {
      await performHealthChecks(llmInstances);
    }
  };

  const isDark = theme === "dark";
  const t = (key: string) => getTranslation(language, key);

  const menuItems = [
    {
      id: "new_session",
      label: t("actions.newSession") || "新建对话",
      icon: "💬",
    },
    { divider: true },
    {
      id: "llm_status",
      label: t("bottomBar.model") || "LLM 状态",
      icon: "🤖",
    },
    {
      id: "llm_config",
      label: t("settings.tab.llm") || "LLM 配置",
      icon: "⚙️",
    },
    { divider: true },
    {
      id: "skills_market",
      label: t("actions.skillMarket") || "技能市场",
      icon: "🛒",
    },
    { id: "history", label: t("menu.history") || "对话历史", icon: "📜" },
    { id: "favorites", label: t("menu.favorites") || "我的收藏", icon: "⭐" },
    {
      id: "scheduled_tasks",
      label: t("menu.scheduledTasks") || "定时任务",
      icon: "⏰",
    },
    { divider: true },
    {
      id: "open_history_dir",
      label: t("settings.openDirectory") || "历史会话目录",
      icon: "📁",
    },
    { id: "open_notification_dir", label: "通知目录", icon: "🔔" },
    { id: "open_workspace_dir", label: "默认工作区目录", icon: "🏠" },
    { divider: true },
    { id: "settings", label: t("menu.settings") || "设置", icon: "⚙️" },
    {
      id: "check_updates",
      label: t("settings.update") || "检查更新",
      icon: "🔄",
    },
    { id: "about", label: "关于", icon: "ℹ️" },
    { divider: true },
    { id: "quit", label: t("common.close") || "退出", icon: "🚪" },
  ];

  const styles = {
    container: {
      backgroundColor: isDark ? "#1a1d26" : "#ffffff",
      borderRadius: "8px",
      border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      boxShadow: isDark
        ? "0 4px 12px rgba(0,0,0,0.4)"
        : "0 4px 12px rgba(0,0,0,0.15)",
      overflow: "hidden" as const,
    },
    header: {
      padding: "10px 14px",
      borderBottom: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      backgroundColor: isDark ? "#22252f" : "#f9fafb",
      display: "flex" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    title: {
      fontWeight: 600,
      fontSize: "13px",
      color: isDark ? "#e8edf2" : "#111827",
    },
    menuContainer: {
      padding: "6px 0",
      maxHeight: "360px",
      overflowY: "auto" as const,
    },
    menuItem: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "10px",
      padding: "8px 14px",
      cursor: "pointer",
      color: isDark ? "#e8edf2" : "#111827",
      fontSize: "13px",
      backgroundColor: "transparent",
    },
    menuIcon: {
      width: "20px",
      fontSize: "14px",
    },
    menuLabel: {
      flex: 1,
    },
    divider: {
      height: "1px",
      backgroundColor: isDark ? "#2d303a" : "#e5e7eb",
      margin: "6px 0",
    },
    submenuWrapper: {
      position: "relative" as const,
    },
    submenuHeader: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "10px",
      padding: "8px 14px",
      cursor: "pointer",
      color: isDark ? "#e8edf2" : "#111827",
      fontSize: "13px",
    },
    submenuArrow: {
      marginLeft: "auto",
      fontSize: "10px",
      color: isDark ? "#6b7280" : "#9ca3af",
    },
    submenuContent: {
      position: "absolute" as const,
      left: "100%",
      top: 0,
      width: "240px",
      backgroundColor: isDark ? "#1a1d26" : "#ffffff",
      border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      borderRadius: "6px",
      boxShadow: isDark
        ? "0 2px 8px rgba(0,0,0,0.3)"
        : "0 2px 8px rgba(0,0,0,0.1)",
      zIndex: 10001,
      maxHeight: "400px",
      overflowY: "auto" as const,
    },
    loadingText: {
      padding: "12px",
      textAlign: "center" as const,
      color: isDark ? "#6b7280" : "#9ca3af",
      fontSize: "12px",
    },
    refreshBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      padding: "4px",
      borderRadius: "4px",
      color: isDark ? "#9ca3af" : "#6b7280",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Hippox</span>
      </div>
      <div style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          if (item.divider) {
            return <div key={`divider-${index}`} style={styles.divider} />;
          }

          if (item.id === "llm_status") {
            return (
              <div
                key={item.id}
                style={{
                  ...styles.menuItem,
                  backgroundColor:
                    hoveredItem === item.id
                      ? isDark
                        ? "rgba(232,237,242,0.08)"
                        : "rgba(0,0,0,0.04)"
                      : "transparent",
                }}
                onClick={async (e) => {
                  await openLLMSubmenu();
                }}
                onMouseEnter={() => setHoveredItem(item.id!)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span style={styles.menuIcon}>{item.icon}</span>
                <span style={styles.menuLabel}>{item.label}</span>
                <span style={styles.submenuArrow}>▶</span>
              </div>
            );
          }
          return (
            <div
              key={item.id}
              style={{
                ...styles.menuItem,
                backgroundColor:
                  hoveredItem === item.id
                    ? isDark
                      ? "rgba(232,237,242,0.08)"
                      : "rgba(0,0,0,0.04)"
                    : "transparent",
              }}
              onClick={() => handleMenuItemClick(item.id!)}
              onMouseEnter={() => setHoveredItem(item.id!)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              <span style={styles.menuLabel}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SystemTrayWindow;
