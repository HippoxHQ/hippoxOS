import React, { useState, useEffect, useRef } from "react";
import { configCommands } from "../command/config";
import { healthCommands, HealthCheckResult } from "../command/health";
import { llmCommands } from "../command/llm";
import { windowsCommands } from "../command/windows";
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
// Cache health results to avoid repeated checks 
let healthCache: Record<string, "online" | "offline" | "checking"> = {};
let healthCacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds
const SubmenuWindow: React.FC = () => {
  const [instances, setInstances] = useState<LLMInstance[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"zh" | "en">("en");
  const [isLoading, setIsLoading] = useState(true);
  const dataLoadedRef = useRef(false);
  // Load config ONLY first (fast) 
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [savedTheme, savedLanguage] = await Promise.all([configCommands.getSettingsTheme(), configCommands.getSettingsLanguage()]);
        setTheme(savedTheme as "dark" | "light");
        setLanguage(savedLanguage as "zh" | "en");
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadConfig();
  }, []);
  // Load LLM instances (may take time) 
  useEffect(() => {
    const loadInstances = async () => {
      if (dataLoadedRef.current) return;
      dataLoadedRef.current = true;
      try {
        const instancesData = await llmCommands.getLlmInstances();
        const defaultId = await llmCommands.getDefaultLlmInstanceId();
        const instancesList = Object.values(instancesData || {}).map((instance: any) => {
          const cachedStatus = healthCache[instance.id];
          return {
            id: instance.id,
            name: instance.name,
            isDefault: instance.id === defaultId,
            status: cachedStatus || ("checking" as const),
          };
        });
        setInstances(instancesList);
        // Check if we have cached health results
        const now = Date.now();
        const hasValidCache = instancesList.every((inst) => healthCache[inst.id] && healthCache[inst.id] !== "checking");
        if (hasValidCache && now - healthCacheTimestamp < CACHE_TTL) {
          // Use cached results
          setInstances(
            instancesList.map((inst) => ({
              ...inst,
              status: healthCache[inst.id] as "online" | "offline",
            })),
          );
          setIsLoading(false);
        } else {
          // Need to check health - but don't block rendering
          setIsLoading(false);
          // Perform health checks in background
          performHealthChecks(instancesList);
        }
      } catch (error) {
        console.error("Failed to load instances:", error);
        setIsLoading(false);
      }
    };
    const timer = setTimeout(() => {
      loadInstances();
    }, 50);
    return () => clearTimeout(timer);
  }, []);
  const performHealthChecks = async (instancesList: LLMInstance[]) => {
    try {
      const results = await healthCommands.checkAllLlmHealth();
      const newCache: Record<string, "online" | "offline"> = {};
      setInstances((prev) =>
        prev.map((inst) => {
          const result = results.find((r: HealthCheckResult) => r.instance_id === inst.id);
          const status = result?.status === "online" ? "online" : "offline";
          newCache[inst.id] = status;
          return {
            ...inst,
            status,
          };
        }),
      );
      healthCache = newCache;
      healthCacheTimestamp = Date.now();
    } catch (error) {
      setInstances((prev) =>
        prev.map((inst) => {
          healthCache[inst.id] = "offline";
          return { ...inst, status: "offline" };
        }),
      );
    }
  };
  const setDefaultLLM = async (instanceId: string) => {
    try {
      await windowsCommands.setDefaultLlmInstance(instanceId);
      setInstances((prev) =>
        prev.map((item) => ({
          ...item,
          isDefault: item.id === instanceId,
        })),
      );
      await windowsCommands.emitToMainWindow("show-notification", {
        message: getTranslation(language, "llmModel.defaultSuccess") || "Default LLM updated",
      });
    } catch (error) {
      console.error("Failed to set default LLM:", error);
    }
  };
  const getStatusText = (status?: string) => {
    const t = (key: string) => getTranslation(language, key);
    if (status === "checking") return t("bottomBar.modelStatus.checking") || "Checking...";
    if (status === "online") return t("bottomBar.modelStatus.online") || "Online";
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
      boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.08)",
      overflow: "hidden" as const,
      display: "flex" as const,
      flexDirection: "column" as const,
      height: "100%",
      maxHeight: "100vh",
    },
    header: {
      padding: "8px 12px",
      borderBottom: `1px solid ${isDark ? "#2d303a" : "#e5e7eb"}`,
      backgroundColor: isDark ? "#22252f" : "#f9fafb",
      fontSize: "12px",
      fontWeight: 600,
      color: isDark ? "#e8edf2" : "#111827",
      flexShrink: 0 as const,
    },
    menuContainer: {
      flex: 1,
      overflowY: "auto" as const,
      overflowX: "hidden" as const,
      padding: "4px 0",
      scrollbarWidth: "thin" as const,
      scrollbarColor: isDark ? "#3a3f4a transparent" : "#cbd5e1 transparent",
    },
    menuItem: {
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      padding: "8px 12px",
      cursor: "pointer" as const,
      fontSize: "12px",
      color: isDark ? "#e8edf2" : "#111827",
      backgroundColor: "transparent",
      transition: "background 0.15s",
      minHeight: "36px",
    },
    itemLeft: {
      display: "flex" as const,
      alignItems: "center" as const,
      gap: "8px",
      flex: 1,
      minWidth: 0,
    },
    statusDot: (status?: string) => ({
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: getStatusColor(status),
      flexShrink: 0 as const,
    }),
    itemName: {
      flex: 1,
      overflow: "hidden" as const,
      textOverflow: "ellipsis" as const,
      whiteSpace: "nowrap" as const,
    },
    statusText: {
      fontSize: "10px",
      color: isDark ? "#9ca3af" : "#6b7280",
      marginRight: "8px",
      flexShrink: 0 as const,
    },
    defaultBadge: {
      fontSize: "10px",
      padding: "2px 5px",
      backgroundColor: "#4ec9b0",
      color: "#ffffff",
      borderRadius: "3px",
      flexShrink: 0 as const,
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
    emptyContainer: {
      padding: "20px",
      textAlign: "center" as const,
      color: isDark ? "#6b7280" : "#9ca3af",
      fontSize: "12px",
    },
  };
  // Webkit scrollbar styles 
  const scrollbarStyles = `
    .submenu-scroll-container::-webkit-scrollbar {
      width: 4px;
    }
    .submenu-scroll-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .submenu-scroll-container::-webkit-scrollbar-thumb {
      background: ${isDark ? "#3a3f4a" : "#cbd5e1"};
      border-radius: 2px;
    }
    .submenu-scroll-container::-webkit-scrollbar-thumb:hover {
      background: ${isDark ? "#4a4f5a" : "#b0c0d0"};
    }
  `;
  // Always render, even if loading 
  return (
    <div style={styles.container}>
      <style>{scrollbarStyles}</style>
      <div style={styles.header}>{t("settings.tab.llmModel") || "LLM Models"}</div>
      <div className="submenu-scroll-container" style={styles.menuContainer}>
        {isLoading && instances.length === 0 ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingText}>{t("common.loading") || "Loading..."}</div>
          </div>
        ) : instances.length === 0 ? (
          <div style={styles.emptyContainer}>{t("bottomBar.noInstances") || "No LLM configured"}</div>
        ) : (
          instances.map((instance) => (
            <div
              key={instance.id}
              style={{
                ...styles.menuItem,
                backgroundColor: hoveredItem === instance.id ? (isDark ? "rgba(232,237,242,0.08)" : "rgba(0,0,0,0.04)") : instance.isDefault ? (isDark ? "#22252f" : "#f3f4f6") : "transparent",
              }}
              onClick={() => setDefaultLLM(instance.id)}
              onMouseEnter={() => setHoveredItem(instance.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div style={styles.itemLeft}>
                <span style={styles.statusDot(instance.status)} />
                <span style={styles.itemName}>{instance.name}</span>
                <span style={styles.statusText}>{getStatusText(instance.status)}</span>
              </div>
              {instance.isDefault && <span style={styles.defaultBadge}>{t("llmModel.default") || "Default"}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default SubmenuWindow;
