import React, { useRef, useEffect, useState } from "react";
import { LlmInstance, llmCommands } from "../../api/llm";
import { healthCommands, HealthCheckResult } from "../../api/health";

interface IconProps {
  size?: number;
}

const CloseIcon: React.FC<IconProps> = ({ size = 14 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const WifiIcon: React.FC<IconProps> = ({ size = 12 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const WifiOffIcon: React.FC<IconProps> = ({ size = 12 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const LoadingIcon: React.FC<IconProps> = ({ size = 12 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2 L12 6" />
    <path d="M12 18 L12 22" />
    <path d="M2 12 L6 12" />
    <path d="M18 12 L22 12" />
  </svg>
);

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  llmInstances: LlmInstance[];
  defaultInstanceId: string;
  onSetDefaultModel: (instanceId: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
  anchorRef: React.RefObject<HTMLElement>;
  popupRef: React.RefObject<HTMLDivElement | null>;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  isOpen,
  onClose,
  llmInstances,
  defaultInstanceId,
  onSetDefaultModel,
  t,
  anchorRef,
  popupRef,
}) => {
  const [healthStatus, setHealthStatus] = useState<
    Record<string, "online" | "offline" | "checking">
  >({});
  const [currentInstances, setCurrentInstances] =
    useState<LlmInstance[]>(llmInstances);
  const [currentDefaultId, setCurrentDefaultId] =
    useState<string>(defaultInstanceId);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const sortInstances = (instances: LlmInstance[]): LlmInstance[] => {
    return [...instances].sort((a, b) => {
      if (a.created_at && b.created_at) {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      return (a.name || "").localeCompare(b.name || "");
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadLatestConfig();
    }
  }, [isOpen]);

  useEffect(() => {
    setCurrentInstances(sortInstances(llmInstances));
    setCurrentDefaultId(defaultInstanceId);
  }, [llmInstances, defaultInstanceId]);

  const loadLatestConfig = async () => {
    try {
      const instancesData = await llmCommands.getLlmInstances();
      const instancesList = Object.values(instancesData) as LlmInstance[];
      const sortedInstances = sortInstances(instancesList);
      setCurrentInstances(sortedInstances);
      const defaultId = await llmCommands.getDefaultLlmInstanceId();
      setCurrentDefaultId(defaultId);
      if (sortedInstances.length > 0) {
        await performHealthChecks(sortedInstances);
      }
    } catch (error) {
      console.error("Failed to load latest LLM config:", error);
    }
  };

  const performHealthChecks = async (instances: LlmInstance[]) => {
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
      const results = await healthCommands.checkAllLlmHealth();
      setHealthStatus((prev) => {
        const newStatus = { ...prev };
        results.forEach((result: HealthCheckResult) => {
          if (result.status !== "online") {
            console.warn(
              `Instance ${result.instance_name} is offline:`,
              result.message,
            );
          }
          newStatus[result.instance_id] =
            result.status === "online" ? "online" : "offline";
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

  const getHealthStatus = (
    instanceId: string,
  ): "online" | "offline" | "checking" => {
    return healthStatus[instanceId] || "checking";
  };
  if (!isOpen) return null;
  return (
    <div
      ref={popupRef}
      className="model-selector-popup"
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
            <LoadingIcon size={12} />
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
            <CloseIcon size={14} />
          </button>
        </div>
      </div>
      <div style={{ maxHeight: "350px", overflowY: "auto" }}>
        {currentInstances.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: "13px",
            }}
          >
            {t("llmModel.noInstances") || "No model configuration"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {currentInstances.map((instance) => {
              const healthStatusValue = getHealthStatus(instance.id!);
              const isDefault = instance.id === currentDefaultId;
              const isChecking = healthStatusValue === "checking";

              return (
                <div
                  key={instance.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-color)",
                    transition: "background 0.2s",
                    background: isDefault
                      ? "var(--bg-secondary)"
                      : "transparent",
                  }}
                >
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
                        {instance.name}
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
                          <span style={{ color: "#f59e0b" }}>
                            {t("bottomBar.modelStatus.checking") ||
                              "Checking..."}
                          </span>
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
                          <WifiIcon size={12} />
                          <span style={{ color: "#22c55e" }}>
                            {t("bottomBar.modelStatus.online")}
                          </span>
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
                          <WifiOffIcon size={12} />
                          <span style={{ color: "#ef4444" }}>
                            {t("bottomBar.modelStatus.offline")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
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
                        marginLeft: "12px",
                        flexShrink: 0,
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
                        onSetDefaultModel(instance.id!);
                      }}
                    >
                      {t("llmModel.setAsDefault")}
                    </button>
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
