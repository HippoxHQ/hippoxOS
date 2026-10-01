import React, { useEffect, useState } from "react";
import { X, Wifi, WifiOff } from "lucide-react";
import { healthCommands, HealthCheckResult } from "../../command/health";
import { LlmInstance, llmCommands, imageCommands, videoCommands, audioCommands } from "../../command/llm";
type SelectorTab = "chat" | "image" | "video" | "audio";
const filterInstanceName = (name: string): string => {
  return name.replace(/Instance/gi, "").trim() || name;
};
interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  llmInstances: LlmInstance[];
  defaultInstanceId: string;
  onSetDefaultModel: (instanceId: string, type: SelectorTab) => void;
  t: (key: string, params?: Record<string, any>) => string;
  anchorRef: React.RefObject<HTMLElement>;
  popupRef: React.RefObject<HTMLDivElement | null>;
}
const ModelSelector: React.FC<ModelSelectorProps> = ({ isOpen, onClose, llmInstances, defaultInstanceId, onSetDefaultModel, t, anchorRef, popupRef }) => {
  const [activeTab, setActiveTab] = useState<SelectorTab>("chat");
  const [healthStatus, setHealthStatus] = useState<Record<string, "online" | "offline" | "checking">>({});
  const [currentInstances, setCurrentInstances] = useState<any[]>(llmInstances);
  const [currentDefaultId, setCurrentDefaultId] = useState<string>(defaultInstanceId);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  /**
   * Tracks which instance currently has its model dropdown expanded.
   */
  const [expandedModelDropdownId, setExpandedModelDropdownId] = useState<string | null>(null);
  const isZh = t("i18n") === "zh";
  const sortInstances = (instances: any[]): any[] => {
    return [...instances].sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return (a.name || "").localeCompare(b.name || "");
    });
  };
  /**
   * Returns the command bundle for the currently selected tab.
   */
  const getCommands = (tab: SelectorTab) => {
    switch (tab) {
      case "image":
        return {
          getInstances: imageCommands.getImageInstances,
          getDefaultInstanceId: imageCommands.getDefaultImageInstanceId,
          setDefaultInstance: imageCommands.setDefaultImageInstance,
          checkHealth: healthCommands.checkAllImageHealth,
          setDefaultModel: imageCommands.setDefaultImageModel,
          getDefaultModel: imageCommands.getDefaultImageModel,
        };
      case "video":
        return {
          getInstances: videoCommands.getVideoInstances,
          getDefaultInstanceId: videoCommands.getDefaultVideoInstanceId,
          setDefaultInstance: videoCommands.setDefaultVideoInstance,
          checkHealth: healthCommands.checkAllVideoHealth,
          setDefaultModel: videoCommands.setDefaultVideoModel,
          getDefaultModel: videoCommands.getDefaultVideoModel,
        };
      case "audio":
        return {
          getInstances: audioCommands.getAudioInstances,
          getDefaultInstanceId: audioCommands.getDefaultAudioInstanceId,
          setDefaultInstance: audioCommands.setDefaultAudioInstance,
          checkHealth: healthCommands.checkAllAudioHealth,
          setDefaultModel: audioCommands.setDefaultAudioModel,
          getDefaultModel: audioCommands.getDefaultAudioModel,
        };
      case "chat":
      default:
        return {
          getInstances: llmCommands.getLlmInstances,
          getDefaultInstanceId: llmCommands.getDefaultLlmInstanceId,
          setDefaultInstance: llmCommands.setDefaultLlmInstance,
          checkHealth: healthCommands.checkAllLlmHealth,
          setDefaultModel: llmCommands.setDefaultLlmModel,
          getDefaultModel: async () => "",
        };
    }
  };
  useEffect(() => {
    if (isOpen) {
      loadLatestConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);
  useEffect(() => {
    if (activeTab === "chat") {
      setCurrentInstances(sortInstances(llmInstances));
      setCurrentDefaultId(defaultInstanceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llmInstances, defaultInstanceId, activeTab]);
  const loadLatestConfig = async () => {
    try {
      const cmds = getCommands(activeTab);
      const instancesData = await cmds.getInstances();
      // Preserve the HashMap key as `id` so set-default always has a valid id.
      const instancesList = Object.entries(instancesData).map(([id, instance]) => ({
        ...(instance as any),
        id,
      }));
      const sortedInstances = sortInstances(instancesList);
      setCurrentInstances(sortedInstances);
      const defaultId = await cmds.getDefaultInstanceId();
      setCurrentDefaultId(defaultId);
      if (sortedInstances.length > 0) {
        await performHealthChecks(sortedInstances);
      }
    } catch (error) {
      console.error("Failed to load latest LLM config:", error);
    }
  };
  const performHealthChecks = async (instances: any[]) => {
    if (instances.length === 0) return;
    setIsCheckingHealth(true);
    setHealthStatus((prev) => {
      const newStatus = { ...prev };
      instances.forEach((instance) => {
        newStatus[instance.id!] = "checking";
      });
      return newStatus;
    });
    try {
      const cmds = getCommands(activeTab);
      const results = await cmds.checkHealth();
      setHealthStatus((prev) => {
        const newStatus = { ...prev };
        results.forEach((result: HealthCheckResult) => {
          if (result.status !== "online") {
            console.warn(`Instance ${result.instance_name} is offline:`, result.message);
          }
          newStatus[result.instance_id] = result.status === "online" ? "online" : "offline";
        });
        return newStatus;
      });
    } catch (error) {
      setHealthStatus((prev) => {
        const newStatus = { ...prev };
        instances.forEach((instance) => {
          if (newStatus[instance.id!] === "checking") {
            newStatus[instance.id!] = "offline";
          }
        });
        return newStatus;
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };
  const recheckHealth = async () => {
    if (currentInstances.length > 0 && !isCheckingHealth) {
      await performHealthChecks(currentInstances);
    }
  };
  const getHealthStatus = (instanceId: string): "online" | "offline" | "checking" => {
    return healthStatus[instanceId] || "checking";
  };
  const handleTabChange = (tab: SelectorTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setCurrentInstances([]);
    setCurrentDefaultId("");
    setHealthStatus({});
    setExpandedModelDropdownId(null);
  };
  /**
   * Handles the "set as default" button click.
   */
  const handleSetDefault = async (instanceId: string) => {
    onSetDefaultModel(instanceId, activeTab);
    try {
      const cmds = getCommands(activeTab);
      const instancesData = await cmds.getInstances();
      const instancesList = Object.entries(instancesData).map(([id, instance]) => ({
        ...(instance as any),
        id,
      }));
      setCurrentInstances(sortInstances(instancesList));
      const defaultId = await cmds.getDefaultInstanceId();
      setCurrentDefaultId(defaultId);
    } catch (error) {
      console.error("Failed to refresh instances after set-default:", error);
    }
  };
  /**
   * Handles the "set as default model" action for the default instance.
   */
  const handleSetDefaultModel = async (instanceId: string, modelName: string) => {
    try {
      const cmds = getCommands(activeTab);
      await cmds.setDefaultModel(modelName);
      setCurrentInstances((prev) =>
        prev.map((inst) => {
          if (inst.id !== instanceId) return inst;
          const nextModels = Array.isArray(inst.models)
            ? inst.models.map((m: any) => ({
                ...m,
                is_default: m.name === modelName,
              }))
            : [];
          return {
            ...inst,
            default_model: modelName,
            models: nextModels,
          };
        }),
      );
      // Collapse the dropdown after the user picks a model.
      setExpandedModelDropdownId(null);
    } catch (error) {
      console.error("Failed to set default model:", error);
    }
  };
  /**
   * Toggles the inline model dropdown for a given instance.
   */
  const toggleModelDropdown = (instanceId: string) => {
    setExpandedModelDropdownId((prev) => (prev === instanceId ? null : instanceId));
  };
  if (!isOpen) return null;
  return (
    <div
      ref={popupRef}
      className="model-selector-popup"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: "35px",
        left: "5px",
        width: "340px",
        maxHeight: "400px",
        background: "var(--bg-primary)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        zIndex: 1000,
        overflow: "hidden",
        animation: "slideUp 0.2s ease-out",
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {t("settings.tab.llmModel")}
        </h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              background: "transparent",
              border: "none",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={recheckHealth}
            disabled={isCheckingHealth}
            title={t("bottomBar.checkHealth") || "Recheck Health Status"}
          >
            {/* Inline refresh SVG so no lucide version is required. */}
            <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={isCheckingHealth ? { animation: "spin 0.8s linear infinite" } : undefined}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              background: "transparent",
              border: "none",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {/* Capability tabs: Chat / Image / Video / Audio */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        {(["chat", "image", "video", "audio"] as SelectorTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--accent-color, #0066cc)" : "2px solid transparent",
              color: activeTab === tab ? "var(--accent-color, #0066cc)" : "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {tab === "chat" ? (isZh ? "对话" : "Chat") : tab === "image" ? (isZh ? "文生图" : "Image") : tab === "video" ? (isZh ? "文生视频" : "Video") : isZh ? "文生音频" : "Audio"}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {currentInstances.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: "13px",
            }}
          >
            {t("bottomBar.noInstances") || "No model configuration"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {currentInstances.map((instance) => {
              const healthStatusValue = getHealthStatus(instance.id!);
              const isDefault = instance.id === currentDefaultId;
              const isChecking = healthStatusValue === "checking";
              const instanceModels: any[] = Array.isArray(instance.models) ? instance.models : [];
              const currentDefaultModel: string = instance.default_model || "";
              const isModelDropdownOpen = expandedModelDropdownId === instance.id;
              return (
                <div
                  key={instance.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "stretch",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-color)",
                    transition: "background 0.2s",
                    background: isDefault ? "var(--bg-secondary)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                          }}
                        >
                          {filterInstanceName(instance.name)}
                        </span>
                        {isDefault && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              background: "#3b82f6",
                              color: "white",
                              borderRadius: "4px",
                            }}
                          >
                            {t("llmModel.default")}
                          </span>
                        )}
                        {isDefault && currentDefaultModel && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              background: "var(--hover-bg)",
                              color: "var(--text-secondary)",
                              borderRadius: "4px",
                              border: "1px solid var(--border-color)",
                            }}
                          >
                            {currentDefaultModel}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "11px",
                        }}
                      >
                        {isChecking ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                border: "2px solid var(--text-tertiary)",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                              }}
                            />
                            <span style={{ color: "#f59e0b" }}>{t("bottomBar.modelStatus.checking") || "Checking..."}</span>
                          </div>
                        ) : healthStatusValue === "online" ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            <Wifi size={12} />
                            <span style={{ color: "#22c55e" }}>{t("bottomBar.modelStatus.online")}</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            <WifiOff size={12} />
                            <span style={{ color: "#ef4444" }}>{t("bottomBar.modelStatus.offline")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "12px", flexShrink: 0 }}>
                      {/* Model switcher toggle — only available for the default instance
                          and only when it actually has models configured. */}
                      {isDefault && instanceModels.length > 0 && (
                        <button
                          style={{
                            padding: "4px 10px",
                            fontSize: "11px",
                            background: isModelDropdownOpen ? "var(--accent-color, #0066cc)" : "var(--hover-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            color: isModelDropdownOpen ? "#ffffff" : "var(--text-secondary)",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isModelDropdownOpen) {
                              e.currentTarget.style.background = "var(--bg-active)";
                              e.currentTarget.style.color = "var(--text-primary)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isModelDropdownOpen) {
                              e.currentTarget.style.background = "var(--hover-bg)";
                              e.currentTarget.style.color = "var(--text-secondary)";
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleModelDropdown(instance.id!);
                          }}
                          title={isZh ? "切换默认模型" : "Switch default model"}
                        >
                          {isZh ? "模型" : "Model"}
                        </button>
                      )}
                      {!isDefault && (
                        <button
                          style={{
                            padding: "4px 10px",
                            fontSize: "11px",
                            background: "var(--hover-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--bg-active)";
                            e.currentTarget.style.color = "var(--text-primary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--hover-bg)";
                            e.currentTarget.style.color = "var(--text-secondary)";
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(instance.id!);
                          }}
                        >
                          {t("llmModel.setAsDefault")}
                        </button>
                      )}
                    </div>
                  </div>
                  {isDefault && isModelDropdownOpen && instanceModels.length > 0 && (
                    <div
                      style={{
                        marginTop: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {instanceModels.map((model: any) => {
                        const isModelDefault = model.name === currentDefaultModel || model.is_default === true;
                        return (
                          <button
                            key={model.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefaultModel(instance.id!, model.name);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              background: isModelDefault ? "var(--bg-active)" : "transparent",
                              border: "1px solid var(--border-color)",
                              borderRadius: "4px",
                              color: isModelDefault ? "var(--accent-color, #0066cc)" : "var(--text-secondary)",
                              fontSize: "12px",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isModelDefault) {
                                e.currentTarget.style.background = "var(--hover-bg)";
                                e.currentTarget.style.color = "var(--text-primary)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isModelDefault) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "var(--text-secondary)";
                              }
                            }}
                          >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{model.name}</span>
                            {isModelDefault && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "1px 6px",
                                  background: "var(--accent-color, #0066cc)",
                                  color: "#ffffff",
                                  borderRadius: "3px",
                                  flexShrink: 0,
                                  marginLeft: "8px",
                                }}
                              >
                                {isZh ? "默认" : "Default"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
export default ModelSelector;
