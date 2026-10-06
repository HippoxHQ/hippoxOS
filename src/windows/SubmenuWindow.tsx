import React, { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
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
let cachedTheme: "dark" | "light" = "dark";
let cachedLanguage: "zh" | "en" = "en";
// Cache health results to avoid repeated checks
let healthCache: Record<string, "online" | "offline" | "checking"> = {};
let healthCacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds
let cachedSubmenuPayload: { items: LLMInstance[]; defaultId: string } | null = null;
const SubmenuWindow: React.FC = () => {
  const [instances, setInstances] = useState<LLMInstance[]>(cachedSubmenuPayload?.items ?? []);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(cachedTheme);
  const [language, setLanguage] = useState<"zh" | "en">(cachedLanguage);
  const [isLoading, setIsLoading] = useState(cachedSubmenuPayload === null);
  const dataLoadedRef = useRef(false);
  // Load config ONLY first (fast). Uses module cache for instant first paint.
  useEffect(() => {
    // Apply cached theme immediately so the skeleton uses the right palette.
    document.documentElement.setAttribute("data-theme", cachedTheme);
    const loadConfig = async () => {
      try {
        const [savedTheme, savedLanguage] = await Promise.all([configCommands.getSettingsTheme(), configCommands.getSettingsLanguage()]);
        const nextTheme = savedTheme as "dark" | "light";
        const nextLanguage = savedLanguage as "zh" | "en";
        if (nextTheme !== cachedTheme) {
          cachedTheme = nextTheme;
          setTheme(nextTheme);
          document.documentElement.setAttribute("data-theme", nextTheme);
        }
        if (nextLanguage !== cachedLanguage) {
          cachedLanguage = nextLanguage;
          setLanguage(nextLanguage);
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadConfig();
  }, []);
  useEffect(() => {
    const applyPayload = (payload: { items: LLMInstance[]; defaultId: string }) => {
      const list = (payload.items || []).map((inst: any) => {
        const cachedStatus = healthCache[inst.id];
        return {
          id: inst.id,
          name: inst.name,
          isDefault: inst.id === payload.defaultId || inst.isDefault === true,
          status: cachedStatus || ("checking" as const),
        };
      });
      cachedSubmenuPayload = { items: list, defaultId: payload.defaultId };
      setInstances(list);
      setIsLoading(false);
      const now = Date.now();
      const hasValidCache = list.every((inst) => healthCache[inst.id] && healthCache[inst.id] !== "checking");
      if (hasValidCache && now - healthCacheTimestamp < CACHE_TTL) {
        setInstances(
          list.map((inst) => ({
            ...inst,
            status: healthCache[inst.id] as "online" | "offline",
          })),
        );
      } else {
        performHealthChecks(list);
      }
    };
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen<{ items: any[]; defaultId: string }>("submenu-data", (event) => {
          applyPayload({ items: event.payload.items as LLMInstance[], defaultId: event.payload.defaultId });
        });
      } catch (e) {
        // Non-fatal: fall back to the direct query below.
      }
    })();
    const loadInstances = async () => {
      if (dataLoadedRef.current) return;
      dataLoadedRef.current = true;
      try {
        const instancesData = await llmCommands.getLlmInstances();
        const defaultId = await llmCommands.getDefaultLlmInstanceId();
        const list = Object.values(instancesData || {}).map((instance: any) => {
          const cachedStatus = healthCache[instance.id];
          return {
            id: instance.id,
            name: instance.name,
            isDefault: instance.id === defaultId,
            status: cachedStatus || ("checking" as const),
          };
        });
        // Only apply if no pushed payload arrived first.
        if (!cachedSubmenuPayload) {
          applyPayload({ items: list, defaultId });
        }
      } catch (error) {
        console.error("Failed to load instances:", error);
        setIsLoading(false);
      }
    };
    const timer = setTimeout(() => {
      loadInstances();
    }, 50);
    return () => {
      clearTimeout(timer);
      if (unlisten) unlisten();
    };
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
      // Update the module cache so the change survives the next show.
      if (cachedSubmenuPayload) {
        cachedSubmenuPayload = {
          items: cachedSubmenuPayload.items.map((item) => ({
            ...item,
            isDefault: item.id === instanceId,
          })),
          defaultId: instanceId,
        };
      }
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
    if (status === "online") return "var(--accent-green)";
    if (status === "checking") return "var(--accent-yellow)";
    return "var(--accent-red)";
  };
  const t = (key: string) => getTranslation(language, key);
  const styles = {
    container: {
      backgroundColor: "var(--bg-primary)",
      borderRadius: "6px",
      border: `1px solid var(--border-color)`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      overflow: "hidden" as const,
      display: "flex" as const,
      flexDirection: "column" as const,
      height: "100%",
      maxHeight: "100vh",
    },
    header: {
      padding: "8px 12px",
      borderBottom: `1px solid var(--border-color)`,
      backgroundColor: "var(--bg-secondary)",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-primary)",
      flexShrink: 0 as const,
    },
    menuContainer: {
      flex: 1,
      overflowY: "auto" as const,
      overflowX: "hidden" as const,
      padding: "4px 0",
      scrollbarWidth: "thin" as const,
      scrollbarColor: "var(--scrollbar-thumb) transparent",
    },
    menuItem: {
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      padding: "8px 12px",
      cursor: "pointer" as const,
      fontSize: "12px",
      color: "var(--text-primary)",
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
      color: "var(--text-muted)",
      marginRight: "8px",
      flexShrink: 0 as const,
    },
    defaultBadge: {
      fontSize: "10px",
      padding: "2px 5px",
      backgroundColor: "var(--accent-green)",
      color: "#ffffff",
      borderRadius: "3px",
      flexShrink: 0 as const,
    },
    loadingContainer: {
      padding: "20px",
      textAlign: "center" as const,
      backgroundColor: "var(--bg-primary)",
    },
    loadingText: {
      color: "var(--text-muted)",
      fontSize: "12px",
    },
    emptyContainer: {
      padding: "20px",
      textAlign: "center" as const,
      color: "var(--text-muted)",
      fontSize: "12px",
    },
  };
  const scrollbarStyles = `
    .submenu-scroll-container::-webkit-scrollbar {
      width: 4px;
    }
    .submenu-scroll-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .submenu-scroll-container::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: 2px;
    }
    .submenu-scroll-container::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover);
    }
  `;
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
                backgroundColor: hoveredItem === instance.id ? "var(--hover-bg)" : instance.isDefault ? "var(--bg-secondary)" : "transparent",
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