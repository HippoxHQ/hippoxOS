import React, { useState, useEffect } from "react";
import { showToast, ToastType } from "../Toast";
import { showDialog, DialogType } from "../Dialog";
import { ProviderInfo, ModelInfo, llmCommands, AddLlmInstanceRequest, ExtraConfigField } from "../../command/llm";
import { SearchIcon } from "../../icons";
import { Bot } from "lucide-react";
interface LLMModelConfigProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
  isInitializing?: boolean;
  language?: string;
}
const LLMModelConfig: React.FC<LLMModelConfigProps> = ({ t, onSave, isInitializing = false, language = "en" }) => {
  const [instances, setInstances] = useState<Record<string, any>>({});
  const [defaultInstanceId, setDefaultInstanceId] = useState<string>("");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState("openai");
  const [newApiKey, setNewApiKey] = useState("");
  const [extraConfigValues, setExtraConfigValues] = useState<Record<string, string>>({});
  const [currentProviderInfo, setCurrentProviderInfo] = useState<ProviderInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    loadData();
  }, [language]);
  const loadData = async () => {
    setLoading(true);
    const instancesPromise = llmCommands.getLlmInstances().catch((err: Error) => {
      console.error("Failed to load instances:", err);
      return {};
    });
    const defaultIdPromise = llmCommands.getDefaultLlmInstanceId().catch((err: Error) => {
      console.error("Failed to load default instance id:", err);
      return "";
    });
    const providersPromise = llmCommands.getAllProviders().catch((err: Error) => {
      console.error("Failed to load providers:", err);
      return [];
    });
    const modelsPromise = llmCommands.getAllModels().catch((err: Error) => {
      console.error("Failed to load models:", err);
      return [];
    });
    const [instancesData, defaultId, providersData, modelsData] = await Promise.all([instancesPromise, defaultIdPromise, providersPromise, modelsPromise]);
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
      setInstances((prev) => {
        const newInstances = { ...prev };
        Object.keys(newInstances).forEach((id) => {
          newInstances[id] = {
            ...newInstances[id],
            is_default: id === instanceId,
          };
        });
        return newInstances;
      });
      showToast(ToastType.SUCCESS, t("llmModel.defaultSuccess", { name: instanceName }));
      if (onSave) {
        onSave({ action: "set_default", instanceId });
      }
    } catch (error) {
      console.error("Failed to set default instance:", error);
      showToast(ToastType.ERROR, t("llmModel.defaultFailed"));
    }
  };
  const handleDeleteInstance = async (instanceId: string, instanceName: string) => {
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
          showToast(ToastType.SUCCESS, t("llmModel.deleteSuccess", { name: instanceName }));
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
    const providerModels = availableModels.filter((m) => m.provider === newProvider);
    const defaultModel = providerModels.find((m) => m.recommended) || providerModels[0];
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
      // setNewWorkflowMode("react");
      setExtraConfigValues({});
      await loadData();
      showToast(ToastType.SUCCESS, t("llmModel.addSuccess", { name: providerInfo?.name || newProvider }));
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
    return provider?.icon || <Bot size={16} />;
  };
  const getProviderName = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.name || providerId;
  };
  const getProviderExtraFields = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.extra_config_fields || [];
  };
  const handleClearSearch = () => {
    setSearchTerm("");
  };
  const filteredInstances = Object.entries(instances).filter(([id, instance]) => {
    const providerName = getProviderName(instance.provider).toLowerCase();
    const search = searchTerm.toLowerCase();
    return providerName.includes(search) || instance.provider.toLowerCase().includes(search);
  });
  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "100px",
    flexShrink: 0,
    userSelect: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "5px",
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
    borderRadius: "5px",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
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
    // borderRadius: "8px",
    padding: "10px",
    borderBottom: "1px solid var(--border-color)",
    overflow: "hidden",
  };
  const textEllipsisStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
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
  const styles: Record<string, React.CSSProperties> = {
    searchInputWrapper: {
      flex: 1,
      position: "relative" as const,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "5px",
    },
    searchInput: {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      color: "var(--text-primary)",
      fontSize: "13px",
      padding: "4px 0",
    },
    searchIcon: {
      flexShrink: 0,
      color: "var(--text-tertiary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    clearBtn: {
      background: "transparent",
      border: "none",
      color: "var(--text-tertiary)",
      cursor: "pointer",
      fontSize: "14px",
      padding: "2px 6px",
      borderRadius: "5px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    header: {
      padding: "10px",
      borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
      flexShrink: 0,
      width: "100%",
      boxSizing: "border-box",
    },
    searchRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      width: "100%",
    },
  };
  const globalStyles = `
    .llm-search-input-wrapper {
      flex: 1;
       min-width: 0; 
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 1.5px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 5px;
    }
    .llm-search-input-wrapper:focus-within {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    .llm-search-input-wrapper svg {
      flex-shrink: 0;
      color: var(--text-tertiary);
    }
    .llm-search-input {
      flex: 1;
       min-width: 0;  
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 13px;
      padding: 4px 0;
    }
    .llm-search-clear {
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .llm-search-clear:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }
  `;
  if (typeof document !== "undefined") {
    const styleId = "llm-config-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = globalStyles;
      document.head.appendChild(style);
    }
  }
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
  const instanceEntries = filteredInstances;
  const hasInstances = instanceEntries.length > 0;
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
      {/* Search Header */}
      <div style={styles.header}>
        <div style={styles.searchRow}>
          <div className="llm-search-input-wrapper">
            <SearchIcon />
            <input type="text" className="llm-search-input" placeholder={t("llmModel.searchPlaceholder") || "Search providers..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="llm-search-clear" onClick={handleClearSearch} title={t("llmModel.clearSearch") || "Clear search"}>
                ✕
              </button>
            )}
          </div>
          <button
            style={{
              ...addButtonStyle,
              padding: "5px 10px",
              fontSize: "15px",
              whiteSpace: "nowrap",
            }}
            onClick={() => setShowAddForm(true)}
          >
            +
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0px 0px",
          margin: 0,
        }}
      >
        {showAddForm && (
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
              <select style={selectStyle} value={newProvider} onChange={(e) => handleProviderChange(e.target.value)}>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.icon} {provider.name}
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
                <input type="text" style={inputStyle} value={extraConfigValues[field.key] || ""} onChange={(e) => handleExtraConfigChange(field.key, e.target.value)} placeholder={field.placeholder} />
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
              <input type="password" style={inputStyle} value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} placeholder={t("llmModel.apiKeyPlaceholder")} />
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
        )}
        {!hasInstances && !showAddForm ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            {searchTerm ? t("llmModel.noSearchResults") || "No matching providers found" : t("llmModel.noProviders") || "No providers available"}
          </div>
        ) : (
          instanceEntries.map(([id, instance]) => {
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
                      ...textEllipsisStyle,
                      flexShrink: 1,
                      minWidth: 0,
                    }}
                  >
                    {getProviderIcon(instance.provider)} {getProviderName(instance.provider)}
                  </span>
                  {instance.is_default && <span style={badgeStyle}>{t("llmModel.default")}</span>}
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
                  <label style={labelStyle}>{t("llmModel.workflowMode") || "Workflow Mode"}</label>
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
                  <input type="password" style={inputStyle} value={instance.api_key} placeholder="••••••••" disabled />
                </div>
                {Object.entries(extraConfig).map(([key, value]) => {
                  if (!value) return null;
                  const fieldInfo = extraFields.find((f) => f.key === key);
                  const fieldName = fieldInfo?.name || key;
                  return (
                    <div key={key} className="settings-row" style={extraConfigRowStyle}>
                      <label style={labelStyle}>{fieldName}</label>
                      <input type="password" style={inputStyle} value={String(value)} disabled placeholder="••••••••" />
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
                  {defaultInstanceId !== id && Object.keys(instances).length > 1 && (
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
          })
        )}
      </div>
    </div>
  );
};
export default LLMModelConfig;
