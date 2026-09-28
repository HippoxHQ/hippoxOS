import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bot, X, ChevronDown, SearchIcon } from "lucide-react";
import { ProviderInfo, ModelInfo, llmCommands, AddLlmInstanceRequest, ExtraConfigField } from "../../../command/llm";
import { showDialog, DialogType } from "../../Dialog";
import { showToast, ToastType } from "../../Toast";
import { llmModelConfigStyles } from "./llmmodelConfig.styles";
interface LLMModelConfigProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
  isInitializing?: boolean;
  language?: string;
}
/**
 * Custom dropdown for selecting an LLM provider.
 */
interface ProviderDropdownOption {
  value: string;
  label: string;
}
interface ProviderDropdownProps {
  options: ProviderDropdownOption[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}
const ProviderDropdown: React.FC<ProviderDropdownProps> = ({ options, value, disabled, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const selected = options.find((o) => o.value === value) || options[0];
  /**
   * Recompute the fixed menu position from the trigger's bounding rect.
   */
  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 240;
    let left = rect.right - menuWidth - 5;
    if (left < 8) left = 8;
    const top = rect.bottom - 30;
    setMenuPosition({ top, left, minWidth: 130 });
  }, []);
  // Recompute position when the menu opens.
  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, updateMenuPosition]);
  useEffect(() => {
    if (!open) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleResize = () => {
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDownOutside, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);
  const handleSelect = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      setOpen(false);
    },
    [onChange],
  );
  return (
    <div
      className="llm-provider-dropdown"
      ref={containerRef}
      style={{
        justifyContent: "flex-end",
      }}
    >
      <button ref={triggerRef} type="button" className={`llm-provider-dropdown-trigger${open ? " open" : ""}`} onClick={() => !disabled && setOpen((prev) => !prev)} disabled={disabled} title={selected?.label}>
        <span className="llm-provider-dropdown-trigger-label">{selected?.label}</span>
        <span className="llm-provider-dropdown-trigger-chevron">
          <ChevronDown size={12} />
        </span>
      </button>
      {open && menuPosition && (
        <div
          ref={menuRef}
          className="llm-provider-dropdown-menu"
          role="listbox"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            minWidth: Math.max(menuPosition.minWidth, 200),
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div key={opt.value} role="option" aria-selected={isSelected} className={`llm-provider-dropdown-item${isSelected ? " selected" : ""}`} onClick={() => handleSelect(opt.value)} title={opt.label}>
                <span className="llm-provider-dropdown-item-label">{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
const LLMModelConfig: React.FC<LLMModelConfigProps> = ({ t, onSave, isInitializing = false, language = "en" }) => {
  // Determine if current language is Chinese
  const isZh = t("i18n") === "zh";
  // State management
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
  // Batch mode state - similar to MaterialTab/AudioTab
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Load data on mount and language change
  useEffect(() => {
    loadData();
  }, [language]);
  // Fetch all required data from backend
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
    // Clear selection when data reloads
    setSelectedIds(new Set());
    // Exit batch mode when data reloads
    setIsBatchMode(false);
    setLoading(false);
  };
  // Toggle batch mode - similar to MaterialTab toggleBatchMode
  const toggleBatchMode = () => {
    if (isBatchMode) {
      // Exit batch mode - clear selection
      setSelectedIds(new Set());
    }
    setIsBatchMode(!isBatchMode);
  };
  // Toggle selection for a single instance - only available in batch mode
  const toggleSelection = (instanceId: string) => {
    // Only allow selection in batch mode
    if (!isBatchMode) return;
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(instanceId)) {
        newSet.delete(instanceId);
      } else {
        newSet.add(instanceId);
      }
      return newSet;
    });
  };
  // Select all instances (excluding default) - only available in batch mode
  const handleSelectAll = () => {
    // Only allow in batch mode
    if (!isBatchMode) return;
    const allIds = Object.keys(instances).filter((id) => id !== defaultInstanceId);
    setSelectedIds(new Set(allIds));
    showToast(ToastType.INFO, isZh ? "已选择所有实例" : "Selected all instances");
  };
  // Deselect all instances - only available in batch mode
  const handleDeselectAll = () => {
    // Only allow in batch mode
    if (!isBatchMode) return;
    setSelectedIds(new Set());
    showToast(ToastType.INFO, isZh ? "已取消所有选择" : "Deselected all instances");
  };
  // Batch delete selected instances - only available in batch mode
  const handleBatchDelete = async () => {
    // Only allow in batch mode
    if (!isBatchMode) return;
    if (selectedIds.size === 0) {
      showToast(ToastType.WARNING, isZh ? "请先选择要删除的实例" : "Please select instances to delete");
      return;
    }
    if (selectedIds.has(defaultInstanceId)) {
      showToast(ToastType.WARNING, isZh ? "不能删除默认实例" : "Cannot delete default instance");
      return;
    }
    if (selectedIds.size >= Object.keys(instances).length) {
      showToast(ToastType.WARNING, isZh ? "不能删除所有实例" : "Cannot delete all instances");
      return;
    }
    const confirmMessage = isZh ? `确定要删除选中的 ${selectedIds.size} 个实例吗？` : `Are you sure you want to delete ${selectedIds.size} selected instance(s)?`;
    showDialog(
      DialogType.WARNING,
      isZh ? "批量删除确认" : "Batch Delete Confirmation",
      confirmMessage,
      async () => {
        try {
          const deletePromises = Array.from(selectedIds).map((id) => llmCommands.deleteLlmInstance(id));
          await Promise.all(deletePromises);
          await loadData();
          showToast(ToastType.SUCCESS, isZh ? `成功删除 ${selectedIds.size} 个实例` : `Successfully deleted ${selectedIds.size} instance(s)`);
          if (onSave) {
            onSave({ action: "batch_delete", instanceIds: Array.from(selectedIds) });
          }
          // Exit batch mode after deletion
          setIsBatchMode(false);
          setSelectedIds(new Set());
        } catch (error) {
          console.error("Failed to batch delete instances:", error);
          showToast(ToastType.ERROR, isZh ? "批量删除失败" : "Batch delete failed");
        }
      },
      undefined,
      isZh ? "确认删除" : "Confirm Delete",
      t("common.cancel"),
    );
  };
  // Set a provider instance as default
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
  // Delete a single provider instance with confirmation
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
  // Handle provider selection change
  const handleProviderChange = (providerId: string) => {
    setNewProvider(providerId);
    setExtraConfigValues({});
    const provider = providers.find((p) => p.id === providerId);
    setCurrentProviderInfo(provider || null);
  };
  // Handle extra config field changes
  const handleExtraConfigChange = (key: string, value: string) => {
    setExtraConfigValues((prev) => ({ ...prev, [key]: value }));
  };
  // Add a new LLM instance
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
  // Helper: Get provider icon
  const getProviderIcon = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.icon || <Bot size={16} />;
  };
  // Helper: Get provider display name
  const getProviderName = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.name || providerId;
  };
  // Helper: Get extra config fields for a provider
  const getProviderExtraFields = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.extra_config_fields || [];
  };
  // Clear search input
  const handleClearSearch = () => {
    setSearchTerm("");
  };
  // Filter instances based on search term
  const filteredInstances = Object.entries(instances).filter(([id, instance]) => {
    const providerName = getProviderName(instance.provider).toLowerCase();
    const search = searchTerm.toLowerCase();
    return providerName.includes(search) || instance.provider.toLowerCase().includes(search);
  });
  /**
   * Stop keyboard events from bubbling up out of this component.
   */
  const stopKeyboardPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };
  if (typeof document !== "undefined") {
    const styleId = "llm-model-config-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = llmModelConfigStyles;
      document.head.appendChild(style);
    }
  }
  // Loading state
  if (loading || isInitializing) {
    return <div className="llm-config-loading">{t("common.loading") || "Loading..."}</div>;
  }
  const currentExtraFields = getProviderExtraFields(newProvider);
  const instanceEntries = filteredInstances;
  const hasInstances = instanceEntries.length > 0;
  return (
    <div className="llm-config-root">
      {/* Search Header */}
      <div className="llm-config-header">
        <div className="llm-config-search-row">
          <div className="llm-config-search-wrapper">
            <SearchIcon />
            <input
              type="text"
              className="llm-config-search-input"
              placeholder={t("llmModel.searchPlaceholder") || "Search providers..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              /* Keep keystrokes inside this component so the host app's
                 global keyboard handlers never fire while typing here. */
              onKeyDown={stopKeyboardPropagation}
              onKeyUp={stopKeyboardPropagation}
              onKeyPress={stopKeyboardPropagation}
            />
            {searchTerm && (
              <button className="llm-config-search-clear" onClick={handleClearSearch} title={t("llmModel.clearSearch") || "Clear search"}>
                <X />
              </button>
            )}
          </div>
          <button
            className="llm-config-btn primary"
            style={{
              padding: "5px 10px",
              fontSize: "15px",
              whiteSpace: "nowrap",
            }}
            onClick={() => setShowAddForm(true)}
          >
            +
          </button>
        </div>
        {/* Batch actions area - similar to MaterialTab */}
        <div className="llm-config-batch-row">
          {/* Batch mode toggle button - similar to MaterialTab */}
          <button className={`llm-config-btn tiny${isBatchMode ? " active" : ""}`} onClick={toggleBatchMode}>
            {isBatchMode ? (isZh ? "退出批量" : "Exit Batch") : isZh ? "批量" : "Batch"}
          </button>
          {/* Batch mode actions - only visible in batch mode */}
          {isBatchMode && (
            <>
              <button className={`llm-config-btn tiny${selectedIds.size === Object.keys(instances).filter((id) => id !== defaultInstanceId).length && Object.keys(instances).length > 0 ? " active" : ""}`} onClick={handleSelectAll}>
                {isZh ? "全选" : "Select All"}
              </button>
              <button className="llm-config-btn tiny" onClick={handleDeselectAll}>
                {isZh ? "取消全选" : "Deselect All"}
              </button>
              <div className="llm-config-batch-divider" />
              <button className={`llm-config-btn danger tiny${selectedIds.size === 0 ? " disabled" : ""}`} onClick={handleBatchDelete} disabled={selectedIds.size === 0}>
                {isZh ? "批量删除" : "Delete"}
                {selectedIds.size > 0 && <span style={{ marginLeft: "4px", fontWeight: 600 }}>({selectedIds.size})</span>}
              </button>
            </>
          )}
          {/* <span className="llm-config-batch-count">{isZh ? `共 ${Object.keys(instances).length} 个实例${selectedIds.size > 0 ? `，已选 ${selectedIds.size} 个` : ""}` : `Total: ${Object.keys(instances).length} instances${selectedIds.size > 0 ? `, ${selectedIds.size} selected` : ""}`}</span> */}
        </div>
      </div>
      {/* Content Area */}
      <div className="llm-config-content">
        {/* Add Form */}
        {showAddForm && (
          <div className="llm-config-card">
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
            <div className="llm-config-row">
              <label className="llm-config-label">{t("llmModel.provider")}</label>
              {/* Custom dropdown replacing the native <select>. Uses only the
                  llm-provider-dropdown-* classes defined in this panel's
                  own stylesheet. */}
              <ProviderDropdown
                options={providers.map((provider) => ({
                  value: provider.id,
                  label: provider.name,
                }))}
                value={newProvider}
                onChange={(value) => handleProviderChange(value)}
              />
            </div>
            {currentExtraFields.map((field: ExtraConfigField) => (
              <div key={field.key} className="llm-config-row">
                <label className="llm-config-label">{field.name}</label>
                <input
                  type="text"
                  className="llm-config-input"
                  value={extraConfigValues[field.key] || ""}
                  onChange={(e) => handleExtraConfigChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  /* Prevent the host app from reacting to keys typed in the form. */
                  onKeyDown={stopKeyboardPropagation}
                  onKeyUp={stopKeyboardPropagation}
                  onKeyPress={stopKeyboardPropagation}
                />
              </div>
            ))}
            <div className="llm-config-row">
              <label className="llm-config-label">{t("llmModel.apiKey")}</label>
              <input
                type="password"
                className="llm-config-input"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder={t("llmModel.apiKeyPlaceholder")}
                /* Prevent the host app from reacting to keys typed in the form. */
                onKeyDown={stopKeyboardPropagation}
                onKeyUp={stopKeyboardPropagation}
                onKeyPress={stopKeyboardPropagation}
              />
            </div>
            <div className="llm-config-actions">
              <button className="llm-config-btn" onClick={() => setShowAddForm(false)}>
                {t("common.cancel")}
              </button>
              <button className="llm-config-btn primary" onClick={handleAddInstance}>
                {t("llmModel.add")}
              </button>
            </div>
          </div>
        )}
        {/* Empty State */}
        {!hasInstances && !showAddForm ? (
          <div className="llm-config-empty">{searchTerm ? t("llmModel.noSearchResults") || "No matching providers found" : t("llmModel.noProviders") || "No providers available"}</div>
        ) : (
          /* Provider Instance Cards - ORIGINAL STYLE with batch mode checkbox */
          instanceEntries.map(([id, instance]) => {
            const extraConfig = instance.extra || {};
            const extraFields = getProviderExtraFields(instance.provider);
            const instanceName = getProviderName(instance.provider);
            const isSelected = selectedIds.has(id);
            const isDefault = defaultInstanceId === id;
            // Determine if checkbox should be visible and enabled
            const showCheckbox = isBatchMode && !isDefault;
            const isCheckboxDisabled = !isBatchMode || isDefault;
            return (
              <div key={id} className={`llm-config-card${isSelected && isBatchMode ? " selected" : ""}`}>
                {/* Checkbox and provider name in one row */}
                <div className="llm-config-card-header">
                  <span className="llm-config-card-title">{getProviderName(instance.provider)}</span>
                  {isDefault && <span className="llm-config-badge">{t("llmModel.default")}</span>}
                  <input type="checkbox" className={`llm-config-checkbox ${!showCheckbox ? "hidden-checkbox" : ""}`} checked={isSelected} onChange={() => toggleSelection(id)} disabled={isCheckboxDisabled} />
                </div>
                {/* Row with checkbox */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                  {/* Original card content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* REMOVED: Workflow Mode section */}
                    <div className="llm-config-row">
                      <label className="llm-config-label">{t("llmModel.apiKey")}</label>
                      <input
                        type="password"
                        className="llm-config-input"
                        value={instance.api_key}
                        placeholder="••••••••"
                        disabled
                        /* Disabled inputs can still bubble key events when focused; block them. */
                        onKeyDown={stopKeyboardPropagation}
                        onKeyUp={stopKeyboardPropagation}
                        onKeyPress={stopKeyboardPropagation}
                      />
                    </div>
                    {Object.entries(extraConfig).map(([key, value]) => {
                      if (!value) return null;
                      const fieldInfo = extraFields.find((f) => f.key === key);
                      const fieldName = fieldInfo?.name || key;
                      return (
                        <div key={key} className="llm-config-row">
                          <label className="llm-config-label">{fieldName}</label>
                          <input
                            type="password"
                            className="llm-config-input"
                            value={String(value)}
                            disabled
                            placeholder="••••••••"
                            /* Disabled inputs can still bubble key events when focused; block them. */
                            onKeyDown={stopKeyboardPropagation}
                            onKeyUp={stopKeyboardPropagation}
                            onKeyPress={stopKeyboardPropagation}
                          />
                        </div>
                      );
                    })}
                    <div className="llm-config-actions">
                      {!isDefault && (
                        <button className="llm-config-btn small" onClick={() => handleSetDefault(id, instanceName)}>
                          {t("llmModel.setAsDefault")}
                        </button>
                      )}
                      {!isDefault && Object.keys(instances).length > 1 && (
                        <button className="llm-config-btn danger small" onClick={() => handleDeleteInstance(id, instanceName)}>
                          {t("llmModel.delete")}
                        </button>
                      )}
                    </div>
                  </div>
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
