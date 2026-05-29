import React, { useRef, useEffect } from "react";
import { LlmInstance } from "../../api/llm";

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

const getTestModelInstances = (): LlmInstance[] => {
  const now = new Date().toISOString();
  return [
    {
      id: "test_model_1",
      name: "GPT-4 Turbo",
      provider: "openai",
      api_key: "",
      api_base: "https://api.openai.com/v1",
      workflow_mode: "react",
      default_model: "gpt-4-turbo",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: true,
    },
    {
      id: "test_model_2",
      name: "Claude 3 Opus",
      provider: "anthropic",
      api_key: "",
      api_base: "https://api.anthropic.com/v1",
      workflow_mode: "react",
      default_model: "claude-3-opus",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: false,
    },
    {
      id: "test_model_3",
      name: "DeepSeek Chat",
      provider: "deepseek",
      api_key: "",
      api_base: "https://api.deepseek.com/v1",
      workflow_mode: "plan_and_execute",
      default_model: "deepseek-chat",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: false,
    },
    {
      id: "test_model_4",
      name: "Gemini 1.5 Pro",
      provider: "google",
      api_key: "",
      api_base: "https://generativelanguage.googleapis.com/v1",
      workflow_mode: "react",
      default_model: "gemini-1.5-pro",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: false,
    },
    {
      id: "test_model_5",
      name: "Mixtral 8x7B",
      provider: "groq",
      api_key: "",
      api_base: "https://api.groq.com/openai/v1",
      workflow_mode: "batch",
      default_model: "mixtral-8x7b-32768",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: false,
    },
    {
      id: "test_model_6",
      name: "Llama 3 70B",
      provider: "together",
      api_key: "",
      api_base: "https://api.together.xyz/v1",
      workflow_mode: "chain",
      default_model: "llama-3-70b",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: false,
    },
    {
      id: "test_model_7",
      name: "Mistral Large",
      provider: "mistral",
      api_key: "",
      api_base: "https://api.mistral.ai/v1",
      workflow_mode: "react",
      default_model: "mistral-large-latest",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: false,
    },
    {
      id: "test_model_8",
      name: "通义千问 Plus",
      provider: "alibaba",
      api_key: "",
      api_base: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      workflow_mode: "plan_and_execute",
      default_model: "qwen-plus",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: false,
    },
    {
      id: "test_model_9",
      name: "GLM-4",
      provider: "zhipu",
      api_key: "",
      api_base: "https://open.bigmodel.cn/api/paas/v4",
      workflow_mode: "react",
      default_model: "glm-4",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: false,
    },
    {
      id: "test_model_10",
      name: "Moonshot V1",
      provider: "moonshot",
      api_key: "",
      api_base: "https://api.moonshot.cn/v1",
      workflow_mode: "chain",
      default_model: "moonshot-v1-128k",
      models: [],
      created_at: now,
      updated_at: now,
      extra: {},
      is_default: false,
    },
  ];
};

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  llmInstances: LlmInstance[];
  defaultInstanceId: string;
  onSetDefaultModel: (instanceId: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
  anchorRef: React.RefObject<HTMLElement>;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  isOpen,
  onClose,
  llmInstances,
  defaultInstanceId,
  onSetDefaultModel,
  t,
  anchorRef,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [tokenUsage, setTokenUsage] = React.useState<
    Record<string, { used: number; limit: number }>
  >({});

  const instances =
    llmInstances.length > 0 ? llmInstances : getTestModelInstances();
  const defaultId =
    llmInstances.length > 0 ? defaultInstanceId : "test_model_1";

  React.useEffect(() => {
    const loadTokenData = () => {
      const usage: Record<string, { used: number; limit: number }> = {};
      for (const instance of instances) {
        usage[instance.id] = {
          used: Math.floor(Math.random() * 50000),
          limit: 100000,
        };
      }
      setTokenUsage(usage);
    };
    if (instances.length > 0) {
      loadTokenData();
    }
  }, [instances]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        const anchor = anchorRef.current;
        if (anchor && !anchor.contains(event.target as Node)) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, anchorRef, onClose]);

  const getNetworkStatus = (
    instanceId: string,
  ): "online" | "offline" | "unknown" => {
    if (instanceId === defaultId) return "online";
    const onlineInstances = [
      "test_model_1",
      "test_model_2",
      "test_model_3",
      "test_model_4",
    ];
    return onlineInstances.includes(instanceId) ? "online" : "offline";
  };

  const getTokenUsage = (instanceId: string) => {
    return (
      tokenUsage[instanceId] || {
        used: Math.floor(Math.random() * 50000),
        limit: 100000,
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        bottom: "35px",
        left: "5px",
        width: "320px",
        maxHeight: "400px",
        background: "var(--bg-primary)",
        border: "1px solid var(--border-color)",
        borderRadius: "5px",
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
      <div style={{ maxHeight: "350px", overflowY: "auto" }}>
        {instances.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: "13px",
            }}
          >
            {t("llmModel.noInstances") || "暂无模型配置"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {instances.map((instance) => {
              const networkStatus = getNetworkStatus(instance.id);
              const tokens = getTokenUsage(instance.id);
              const isDefault = instance.id === defaultId;
              return (
                <div
                  key={instance.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-color)",
                    cursor: isDefault ? "default" : "pointer",
                    transition: "background 0.2s",
                    background: isDefault
                      ? "var(--bg-secondary)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isDefault) {
                      e.currentTarget.style.background = "var(--hover-bg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDefault) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                  onClick={() => !isDefault && onSetDefaultModel(instance.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
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
                        gap: "12px",
                        fontSize: "11px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {networkStatus === "online" ? (
                          <>
                            <WifiIcon size={12} />
                            <span style={{ color: "#22c55e" }}>
                              {t("bottomBar.modelStatus.online")}
                            </span>
                          </>
                        ) : networkStatus === "offline" ? (
                          <>
                            <WifiOffIcon size={12} />
                            <span style={{ color: "#ef4444" }}>
                              {t("bottomBar.modelStatus.offline")}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "#f59e0b" }}>
                            {t("bottomBar.modelStatus.unknown")}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        <span style={{ fontSize: "10px" }}>
                          {t("bottomBar.tokenUsed")}:
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "monospace",
                          }}
                        >
                          {t("bottomBar.tokenFormat", {
                            used: tokens.used.toLocaleString(),
                            limit: tokens.limit.toLocaleString(),
                          })}
                        </span>
                      </div>
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
                        onSetDefaultModel(instance.id);
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
    </div>
  );
};

export default ModelSelector;
