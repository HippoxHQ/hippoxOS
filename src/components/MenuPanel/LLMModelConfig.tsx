import React, { useState, useEffect } from "react";
import {
  AddLlmInstanceRequest,
  ExtraConfigField,
  llmCommands,
  ModelInfo,
  ProviderInfo,
} from "../../api/llm";
import { showToast, ToastType } from "../Toast";
import { showDialog, DialogType } from "../Dialog";

interface LLMModelConfigProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
  isInitializing?: boolean;
  language?: string;
}

type WorkflowMode = "react" | "batch" | "chain" | "plan_and_execute";

const getWorkflowModes = (t: (key: string) => string) => [
  {
    value: "react" as const,
    label: t("llmModel.workflowModeReAct"),
    description: "Think → Act → Observe loop",
  },
  {
    value: "batch" as const,
    label: t("llmModel.workflowModeBatch"),
    description: "Execute multiple independent skills in parallel",
  },
  {
    value: "chain" as const,
    label: t("llmModel.workflowModeChain"),
    description: "Sequential execution with variable passing",
  },
  {
    value: "plan_and_execute" as const,
    label: t("llmModel.workflowModePlanAndExecute"),
    description: "One-time planning with full workflow support",
  },
];

const LLMModelConfig: React.FC<LLMModelConfigProps> = ({
  t,
  onSave,
  isInitializing = false,
  language = "en",
}) => {
  const [instances, setInstances] = useState<Record<string, any>>({});
  const [defaultInstanceId, setDefaultInstanceId] = useState<string>("");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState("openai");
  const [newApiKey, setNewApiKey] = useState("");
  const [newWorkflowMode, setNewWorkflowMode] = useState<WorkflowMode>("react");
  const [extraConfigValues, setExtraConfigValues] = useState<
    Record<string, string>
  >({});
  const [currentProviderInfo, setCurrentProviderInfo] =
    useState<ProviderInfo | null>(null);

  const workflowModes = getWorkflowModes(t);

  useEffect(() => {
    loadData();
  }, [language]);

  const loadData = async () => {
    setLoading(true);
    const instancesPromise = llmCommands
      .getLlmInstances()
      .catch((err: Error) => {
        console.error("Failed to load instances:", err);
        return {};
      });
    const defaultIdPromise = llmCommands
      .getDefaultLlmInstanceId()
      .catch((err: Error) => {
        console.error("Failed to load default instance id:", err);
        return "";
      });
    const providersPromise = llmCommands
      .getAllProviders()
      .catch((err: Error) => {
        console.error("Failed to load providers:", err);
        return [];
      });
    const modelsPromise = llmCommands.getAllModels().catch((err: Error) => {
      console.error("Failed to load models:", err);
      return [];
    });

    const [instancesData, defaultId, providersData, modelsData] =
      await Promise.all([
        instancesPromise,
        defaultIdPromise,
        providersPromise,
        modelsPromise,
      ]);

    setProviders(providersData);
    setAvailableModels(modelsData);
    setInstances(instancesData);
    setDefaultInstanceId(defaultId);
    setLoading(false);
  };

  const handleSetDefault = async (instanceId: string, instanceName: string) => {
    try {
      await llmCommands.setDefaultLlmInstance(instanceId);
      setDefaultInstanceId(instanceId);
      showToast(
        ToastType.SUCCESS,
        t("llmModel.defaultSuccess", { name: instanceName }),
      );
      if (onSave) {
        onSave({ action: "set_default", instanceId });
      }
    } catch (error) {
      console.error("Failed to set default instance:", error);
      showToast(ToastType.ERROR, t("llmModel.defaultFailed"));
    }
  };

  const handleDeleteInstance = async (
    instanceId: string,
    instanceName: string,
  ) => {
    if (Object.keys(instances).length <= 1) {
      showToast(ToastType.WARNING, t("llmModel.cannotDeleteLast"));
      return;
    }
    if (defaultInstanceId === instanceId) {
      showToast(ToastType.WARNING, t("llmModel.cannotDeleteDefault"));
      return;
    }

    showDialog(
      DialogType.WARNING,
      t("llmModel.deleteConfirmTitle"),
      t("llmModel.deleteConfirmMessage", { name: instanceName }),
      async () => {
        try {
          await llmCommands.deleteLlmInstance(instanceId);
          await loadData();
          showToast(
            ToastType.SUCCESS,
            t("llmModel.deleteSuccess", { name: instanceName }),
          );
          if (onSave) {
            onSave({ action: "delete", instanceId });
          }
        } catch (error) {
          console.error("Failed to delete instance:", error);
          showToast(ToastType.ERROR, t("llmModel.deleteFailed"));
        }
      },
      undefined,
      t("llmModel.delete"),
      t("common.cancel"),
    );
  };

  const handleProviderChange = (providerId: string) => {
    setNewProvider(providerId);
    setExtraConfigValues({});
    const provider = providers.find((p) => p.id === providerId);
    setCurrentProviderInfo(provider || null);
  };

  const handleExtraConfigChange = (key: string, value: string) => {
    setExtraConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddInstance = async () => {
    if (!newApiKey.trim()) {
      showToast(ToastType.WARNING, t("llmModel.apiKeyRequired"));
      return;
    }
    const providerModels = availableModels.filter(
      (m) => m.provider === newProvider,
    );
    const defaultModel =
      providerModels.find((m) => m.recommended) || providerModels[0];
    const defaultModelName = defaultModel?.id || "";
    const providerInfo = providers.find((p) => p.id === newProvider);
    const extra: Record<string, string> = {};
    let apiBase = "";
    if (providerInfo?.requires_extra_config) {
      Object.entries(extraConfigValues).forEach(([key, value]) => {
        if (value) {
          extra[key] = value;
          if (key === "api_base") {
            apiBase = value;
          }
        }
      });
    }
    const isCustomProvider = newProvider === "custom";
    const instanceToAdd: AddLlmInstanceRequest = {
      name: `${providerInfo?.name || newProvider} Instance`,
      provider: newProvider,
      api_key: newApiKey,
      api_base: isCustomProvider ? apiBase : "",
      workflow_mode: newWorkflowMode,
      default_model: defaultModelName,
      models: providerModels.map((m) => ({
        name: m.id,
        api_key: newApiKey,
        is_default: m.id === defaultModelName,
        provider: newProvider,
      })),
      extra: extra,
    };
    try {
      await llmCommands.addLlmInstance(instanceToAdd);
      setShowAddForm(false);
      setNewProvider("openai");
      setNewApiKey("");
      setNewWorkflowMode("react");
      setExtraConfigValues({});
      await loadData();
      showToast(
        ToastType.SUCCESS,
        t("llmModel.addSuccess", { name: providerInfo?.name || newProvider }),
      );
      if (onSave) {
        onSave({ action: "add", instance: instanceToAdd });
      }
    } catch (error) {
      console.error("Failed to add instance:", error);
      showToast(ToastType.ERROR, t("llmModel.addFailed"));
    }
  };

  const getProviderIcon = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.icon || "🤖";
  };

  const getProviderName = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.name || providerId;
  };

  const getWorkflowModeLabel = (mode: string) => {
    const modeMap: Record<string, string> = {
      react: t("llmModel.workflowModeReAct"),
      batch: t("llmModel.workflowModeBatch"),
      chain: t("llmModel.workflowModeChain"),
      plan_and_execute: t("llmModel.workflowModePlanAndExecute"),
    };
    return modeMap[mode] || mode;
  };

  const getProviderExtraFields = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.extra_config_fields || [];
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "100px",
    flexShrink: 0,
    userSelect: "none",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 16px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  const addButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "var(--accent-color, #0066cc)",
    color: "white",
    border: "none",
  };

  const deleteButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: "var(--error-color, #dc2626)",
    borderColor: "var(--error-color, #dc2626)",
  };

  const modelCardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "12px",
    border: "1px solid var(--border-color)",
  };

  const badgeStyle: React.CSSProperties = {
    background: "var(--accent-color, #0066cc)",
    color: "white",
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "12px",
    marginLeft: "8px",
  };

  const extraConfigRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    marginBottom: "8px",
    gap: "12px",
    flexWrap: "wrap",
  };

  if (loading || isInitializing) {
    return (
      <div
        className="settings-container"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {t("common.loading") || "Loading..."}
      </div>
    );
  }
  const currentExtraFields = getProviderExtraFields(newProvider);
  return (
    <div
      className="settings-container"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        margin: 0,
        gap: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 10px",
          margin: 0,
          paddingTop: "10px",
          paddingBottom: "10px",
        }}
      >
        {Object.entries(instances).map(([id, instance]) => {
          const extraConfig = instance.extra || {};
          const extraFields = getProviderExtraFields(instance.provider);
          const instanceName = getProviderName(instance.provider);
          return (
            <div key={id} style={modelCardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {getProviderIcon(instance.provider)}{" "}
                  {getProviderName(instance.provider)}
                </span>
                {instance.is_default && (
                  <span style={badgeStyle}>{t("llmModel.default")}</span>
                )}
              </div>

              <div
                className="settings-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>
                  {t("llmModel.workflowMode") || "Workflow Mode"}
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={getWorkflowModeLabel(instance.workflow_mode)}
                  disabled
                  readOnly
                />
              </div>

              <div
                className="settings-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>{t("llmModel.apiKey")}</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={instance.api_key}
                  placeholder="••••••••"
                  disabled
                />
              </div>
              {Object.entries(extraConfig).map(([key, value]) => {
                if (!value) return null;
                const fieldInfo = extraFields.find((f) => f.key === key);
                const fieldName = fieldInfo?.name || key;
                return (
                  <div
                    key={key}
                    className="settings-row"
                    style={extraConfigRowStyle}
                  >
                    <label style={labelStyle}>{fieldName}</label>
                    <input
                      type="password"
                      style={inputStyle}
                      value={String(value)}
                      disabled
                      placeholder="••••••••"
                    />
                  </div>
                );
              })}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                }}
              >
                {defaultInstanceId !== id && (
                  <button
                    style={{
                      ...buttonStyle,
                      fontSize: "11px",
                      padding: "4px 10px",
                    }}
                    onClick={() => handleSetDefault(id, instanceName)}
                  >
                    {t("llmModel.setAsDefault")}
                  </button>
                )}
                {defaultInstanceId !== id &&
                  Object.keys(instances).length > 1 && (
                    <button
                      style={{
                        ...deleteButtonStyle,
                        fontSize: "11px",
                        padding: "4px 10px",
                      }}
                      onClick={() => handleDeleteInstance(id, instanceName)}
                    >
                      {t("llmModel.delete")}
                    </button>
                  )}
              </div>
            </div>
          );
        })}

        {showAddForm ? (
          <div style={modelCardStyle}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "12px",
              }}
            >
              {t("llmModel.addLlmProvider")}
            </div>
            <div
              className="settings-row"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("llmModel.provider")}</label>
              <select
                style={selectStyle}
                value={newProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.icon} {provider.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="settings-row"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>
                {t("llmModel.workflowMode") || "Workflow Mode"}
              </label>
              <select
                style={selectStyle}
                value={newWorkflowMode}
                onChange={(e) =>
                  setNewWorkflowMode(e.target.value as WorkflowMode)
                }
              >
                {workflowModes.map((mode) => (
                  <option
                    key={mode.value}
                    value={mode.value}
                    title={mode.description}
                  >
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            {currentExtraFields.map((field: ExtraConfigField) => (
              <div
                key={field.key}
                className="settings-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>{field.name}</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={extraConfigValues[field.key] || ""}
                  onChange={(e) =>
                    handleExtraConfigChange(field.key, e.target.value)
                  }
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            <div
              className="settings-row"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("llmModel.apiKey")}</label>
              <input
                type="password"
                style={inputStyle}
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder={t("llmModel.apiKeyPlaceholder")}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button style={buttonStyle} onClick={() => setShowAddForm(false)}>
                {t("common.cancel")}
              </button>
              <button style={addButtonStyle} onClick={handleAddInstance}>
                {t("llmModel.add")}
              </button>
            </div>
          </div>
        ) : (
          <button
            style={{ ...addButtonStyle, width: "100%" }}
            onClick={() => setShowAddForm(true)}
          >
            + {t("llmModel.addLlmProvider")}
          </button>
        )}
      </div>
    </div>
  );
};

export default LLMModelConfig;
