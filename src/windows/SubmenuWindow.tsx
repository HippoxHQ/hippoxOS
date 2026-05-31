import React, { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { configCommands } from "../api/config";
import { llmCommands } from "../api/llm";
import { healthCommands, HealthCheckResult } from "../api/health";
import { zh, en } from "../i18n";

interface LLMInstance {
  id: string;
  name: string;
  isDefault: boolean;
  status?: "online" | "offline" | "checking";
}

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

const SubmenuWindow: React.FC = () => {
  const [instances, setInstances] = useState<LLMInstance[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTheme, savedLanguage] = await Promise.all([
          configCommands.getSettingsTheme(),
          configCommands.getSettingsLanguage(),
        ]);
        setTheme(savedTheme as "dark" | "light");
        setLanguage(savedLanguage as "zh" | "en");
        setIsLoading(false);
        const instancesData = await llmCommands.getLlmInstances();
        const defaultId = await llmCommands.getDefaultLlmInstanceId();
        const instancesList = Object.values(instancesData || {}).map(
          (instance: any) => ({
            id: instance.id,
            name: instance.name,
            isDefault: instance.id === defaultId,
            status: "checking" as const,
          }),
        );
        if (instancesList.length > 0) {
          const mergedInstances = [...instancesList];
          setInstances(mergedInstances);
          await performHealthChecks(instancesList);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const performHealthChecks = async (instancesList: LLMInstance[]) => {
    try {
      const results = await healthCommands.checkAllLlmHealth();
      setInstances((prev) =>
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
      setInstances((prev) =>
        prev.map((inst) => ({ ...inst, status: "offline" })),
      );
    }
  };

  const setDefaultLLM = async (instanceId: string) => {
    try {
      await invoke("set_default_llm_instance", { instanceId });
      setInstances((prev) =>
        prev.map((item) => ({
          ...item,
          isDefault: item.id === instanceId,
        })),
      );
      invoke("cmd_emit_to_main_window", {
        event: "show-notification",
        payload: {
          message:
            getTranslation(language, "llmModel.defaultSuccess") ||
            "Default LLM updated",
        },
      });
    } catch (error) {
      console.error("Failed to set default LLM:", error);
    }
  };

  const getStatusText = (status?: string) => {
    const t = (key: string) => getTranslation(language, key);
    if (status === "checking")
      return t("bottomBar.modelStatus.checking") || "Checking...";
    if (status === "online")
      return t("bottomBar.modelStatus.online") || "Online";
    return t("bottomBar.modelStatus.offline") || "Offline";
  };

  const getStatusColor = (status?: string) => {
    if (status === "online") return "#4ec9b0";
    if (status === "checking") return "#dcdcaa";
    return "#f48771";
  };

  const isDark = theme === "dark";
  const t = (key: string) => getTranslation(language, key);

  const styles = {
    container: {
      backgroundColor: isDark ? "#1a1d26" : "#ffffff",
      borderRadius: "6px",
      border: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      boxShadow: isDark
        ? "0 2px 8px rgba(0,0,0,0.3)"
        : "0 2px 8px rgba(0,0,0,0.1)",
      overflow: "hidden" as const,
    },
    header: {
      padding: "8px 12px",
      borderBottom: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      backgroundColor: isDark ? "#22252f" : "#f9fafb",
      fontSize: "12px",
      fontWeight: 600,
      color: isDark ? "#e8edf2" : "#111827",
    },
    menuContainer: {
      maxHeight: "260px",
      overflowY: "auto" as const,
      scrollbarColor: isDark ? "#3a3f4a #1a1d26" : "#cbd5e1 #e5e7eb",
    },
    menuItem: {
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      padding: "8px 12px",
      cursor: "pointer",
      fontSize: "12px",
      color: isDark ? "#e8edf2" : "#111827",
      backgroundColor: "transparent",
      transition: "background 0.2s",
    },
    itemLeft: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "8px",
      flex: 1,
    },
    statusDot: (status?: string) => ({
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: getStatusColor(status),
    }),
    itemName: {
      flex: 1,
    },
    statusText: {
      fontSize: "10px",
      color: isDark ? "#9ca3af" : "#6b7280",
      marginRight: "8px",
    },
    defaultBadge: {
      fontSize: "10px",
      padding: "2px 5px",
      backgroundColor: "#4ec9b0",
      color: "#ffffff",
      borderRadius: "3px",
    },
    loadingContainer: {
      padding: "20px",
      textAlign: "center" as const,
      backgroundColor: isDark ? "#1a1d26" : "#ffffff",
    },
    loadingText: {
      color: isDark ? "#6b7280" : "#9ca3af",
      fontSize: "12px",
    },
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>
          {t("common.loading") || "Loading..."}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {t("settings.tab.llmModel") || "LLM Models"}
      </div>
      <div style={styles.menuContainer}>
        {instances.length === 0 ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>
              {t("bottomBar.noInstances") || "No LLM configured"}
            </div>
          </div>
        ) : (
          instances.map((instance) => (
            <div
              key={instance.id}
              style={{
                ...styles.menuItem,
                backgroundColor:
                  hoveredItem === instance.id
                    ? isDark
                      ? "rgba(232,237,242,0.08)"
                      : "rgba(0,0,0,0.04)"
                    : instance.isDefault
                      ? isDark
                        ? "#22252f"
                        : "#f3f4f6"
                      : "transparent",
              }}
              onClick={() => setDefaultLLM(instance.id)}
              onMouseEnter={() => setHoveredItem(instance.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div style={styles.itemLeft}>
                <span style={styles.statusDot(instance.status)} />
                <span style={styles.itemName}>{instance.name}</span>
                <span style={styles.statusText}>
                  {getStatusText(instance.status)}
                </span>
              </div>
              {instance.isDefault && (
                <span style={styles.defaultBadge}>
                  {t("llmModel.default") || "Default"}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SubmenuWindow;
