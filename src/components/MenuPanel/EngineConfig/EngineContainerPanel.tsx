import React, { useState, useEffect, useRef } from "react";
import { showToast, ToastType } from "../../Toast";
import { showDialog, DialogType } from "../../Dialog";
import { engineCommands } from "../../../api/config";

interface ContainerInstance {
  id: string;
  name: string;
  description: string;
  type: "docker" | "k8s";
  host: string;
  api_version?: string;
  tls_verify?: boolean;
  kubeconfig?: string;
  context?: string;
  namespace?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface EngineContainerPanelProps {
  t: (key: string, params?: any) => string;
  initialConfig?: any;
  onSave?: (config: any) => void;
}

const CONTAINER_TYPE_CONFIG: Record<
  string,
  { name: string; icon: string; defaultHost: string }
> = {
  docker: {
    name: "Docker",
    icon: "🐳",
    defaultHost: "unix:///var/run/docker.sock",
  },
  k8s: { name: "Kubernetes", icon: "☸️", defaultHost: "" },
};

const EngineContainerPanel: React.FC<EngineContainerPanelProps> = ({
  t,
  initialConfig,
  onSave,
}) => {
  const [instances, setInstances] = useState<ContainerInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("docker");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHost, setFormHost] = useState("");
  const [formApiVersion, setFormApiVersion] = useState("");
  const [formTlsVerify, setFormTlsVerify] = useState(false);
  const [formKubeconfig, setFormKubeconfig] = useState("");
  const [formContext, setFormContext] = useState("");
  const [formNamespace, setFormNamespace] = useState("default");

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, []);

  useEffect(() => {
    if (activeTab === "docker") {
      setFormHost(CONTAINER_TYPE_CONFIG.docker.defaultHost);
    } else {
      setFormHost("");
      setFormNamespace("default");
    }
  }, [activeTab]);

  const loadInstances = async () => {
    setLoading(true);
    try {
      const savedInstances = await engineCommands.getContainerInstances();
      setInstances(savedInstances);
    } catch (error) {
      setInstances([]);
    }
    setLoading(false);
  };

  const handleToggleEnabled = async (
    id: string,
    name: string,
    enabled: boolean,
  ) => {
    const newEnabled = !enabled;
    const actionText = newEnabled ? "enable" : "disable";

    if (!newEnabled) {
      showDialog(
        DialogType.WARNING,
        t("container.disableConfirmTitle"),
        t("container.disableConfirmMessage", { name }),
        async () => {
          await engineCommands.toggleContainerInstance(id, newEnabled);
          await loadInstances();
          showToast(
            ToastType.SUCCESS,
            t(`container.${actionText}Success`, { name }),
          );
        },
        undefined,
        t("container.disable"),
        t("common.cancel"),
      );
    } else {
      await engineCommands.toggleContainerInstance(id, newEnabled);
      await loadInstances();
      showToast(
        ToastType.SUCCESS,
        t(`container.${actionText}Success`, { name }),
      );
    }
  };

  const handleDelete = async (id: string, name: string) => {
    showDialog(
      DialogType.WARNING,
      t("container.deleteConfirmTitle"),
      t("container.deleteConfirmMessage", { name }),
      async () => {
        await engineCommands.deleteContainerInstance(id);
        await loadInstances();
        showToast(ToastType.SUCCESS, t("container.deleteSuccess", { name }));
      },
      undefined,
      t("container.delete"),
      t("common.cancel"),
    );
  };

  const handleEdit = (instance: ContainerInstance) => {
    setEditingId(instance.id);
    setFormName(instance.name);
    setFormDescription(instance.description || "");
    setFormHost(instance.host || "");
    setFormApiVersion(instance.api_version || "");
    setFormTlsVerify(instance.tls_verify || false);
    setFormKubeconfig(instance.kubeconfig || "");
    setFormContext(instance.context || "");
    setFormNamespace(instance.namespace || "default");
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    if (activeTab === "docker") {
      setFormHost(CONTAINER_TYPE_CONFIG.docker.defaultHost);
      setFormApiVersion("");
      setFormTlsVerify(false);
    } else {
      setFormHost("");
      setFormKubeconfig("");
      setFormContext("");
      setFormNamespace("default");
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    try {
      await engineCommands.saveContainerInstance({
        id: editingId || undefined,
        name: formName,
        description: formDescription,
        instance_type: activeTab,
        host: formHost,
        api_version: formApiVersion || undefined,
        tls_verify: formTlsVerify,
        kubeconfig: formKubeconfig || undefined,
        context: formContext || undefined,
        namespace: formNamespace,
        enabled: true,
      });

      await loadInstances();

      if (editingId) {
        showToast(
          ToastType.SUCCESS,
          t("container.updateSuccess", { name: formName }),
        );
      } else {
        showToast(
          ToastType.SUCCESS,
          t("container.addSuccess", { type: getTypeName(activeTab) }),
        );
      }
      resetForm();
    } catch (error) {
      showToast(ToastType.ERROR, t("common.error"));
    }
  };

  const getInstancesByType = (type: string) => {
    return instances.filter((i) => i.type === type);
  };

  const getTypeIcon = (type: string) => {
    return CONTAINER_TYPE_CONFIG[type]?.icon || "📦";
  };

  const getTypeName = (type: string) => {
    return CONTAINER_TYPE_CONFIG[type]?.name || type;
  };

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      const newScrollLeft =
        tabsRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      tabsRef.current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
    }
  };

  const checkScrollButtons = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(
        scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - 5,
      );
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "120px",
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

  const checkboxStyle: React.CSSProperties = {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    flexShrink: 0,
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

  const cardStyle: React.CSSProperties = {
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

  const enabledBadgeStyle: React.CSSProperties = {
    ...badgeStyle,
    background: "#10b981",
  };

  const disabledBadgeStyle: React.CSSProperties = {
    ...badgeStyle,
    background: "#6b7280",
  };

  const tabsStyles = `
    .engine-tabs-container {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 0px;
    }
    .engine-tabs-scroll {
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .engine-tabs-scroll::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .engine-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border-color);
      min-width: max-content;
    }
    .engine-tab {
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      border-radius: 6px 6px 0 0;
      white-space: nowrap;
      user-select: none;
    }
    .engine-tab:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }
    .engine-tab.active {
      color: var(--accent-color, #0066cc);
      border-bottom: 2px solid var(--accent-color, #0066cc);
    }
    .engine-tab-scroll-btn {
      width: 28px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 16px;
      transition: all 0.2s;
      flex-shrink: 0;
      margin: 0 4px;
      user-select: none;
    }
    .engine-tab-scroll-btn:hover {
      background: var(--hover-bg);
      color: var(--text-primary);
    }
  `;

  if (typeof document !== "undefined") {
    const styleId = "engine-tabs-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = tabsStyles;
      document.head.appendChild(style);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {t("common.loading")}
      </div>
    );
  }

  const currentInstances = getInstancesByType(activeTab);
  const containerTypes = ["docker", "k8s"];

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        className="engine-tabs-container"
        style={{ padding: "0px", margin: 0 }}
      >
        {showLeftArrow && (
          <button
            className="engine-tab-scroll-btn"
            onClick={() => scrollTabs("left")}
          >
            ◀
          </button>
        )}
        <div
          className="engine-tabs-scroll"
          ref={tabsRef}
          onScroll={checkScrollButtons}
        >
          <div className="engine-tabs">
            {containerTypes.map((type) => (
              <button
                key={type}
                className={`engine-tab ${activeTab === type ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(type);
                  resetForm();
                }}
              >
                {getTypeIcon(type)} {getTypeName(type)}
              </button>
            ))}
          </div>
        </div>
        {showRightArrow && (
          <button
            className="engine-tab-scroll-btn"
            onClick={() => scrollTabs("right")}
          >
            ▶
          </button>
        )}
      </div>

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
        {currentInstances.length === 0 && !showAddForm ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            {t("container.noInstances", { type: getTypeName(activeTab) })}
          </div>
        ) : (
          currentInstances.map((instance) => (
            <div key={instance.id} style={cardStyle}>
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
                  {getTypeIcon(instance.type)} {instance.name}
                </span>
                <span
                  style={
                    instance.enabled ? enabledBadgeStyle : disabledBadgeStyle
                  }
                >
                  {instance.enabled
                    ? t("container.enabled")
                    : t("container.disabled")}
                </span>
              </div>

              {instance.description && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("container.description")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={instance.description}
                    disabled
                    readOnly
                  />
                </div>
              )}

              {instance.type === "docker" ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={labelStyle}>{t("container.host")}</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.host}
                      disabled
                      readOnly
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={labelStyle}>
                      {t("container.apiVersion")}
                    </label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.api_version || ""}
                      disabled
                      readOnly
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={labelStyle}>{t("container.tlsVerify")}</label>
                    <input
                      type="checkbox"
                      style={checkboxStyle}
                      checked={instance.tls_verify || false}
                      disabled
                    />
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={labelStyle}>
                      {t("container.kubeconfig")}
                    </label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.kubeconfig}
                      disabled
                      readOnly
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={labelStyle}>{t("container.context")}</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.context}
                      disabled
                      readOnly
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label style={labelStyle}>{t("container.namespace")}</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.namespace}
                      disabled
                      readOnly
                    />
                  </div>
                </>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                }}
              >
                <button
                  style={{
                    ...buttonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() =>
                    handleToggleEnabled(
                      instance.id,
                      instance.name,
                      instance.enabled,
                    )
                  }
                >
                  {instance.enabled
                    ? t("container.disable")
                    : t("container.enable")}
                </button>
                <button
                  style={{
                    ...buttonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleEdit(instance)}
                >
                  {t("container.edit")}
                </button>
                <button
                  style={{
                    ...deleteButtonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleDelete(instance.id, instance.name)}
                >
                  {t("container.delete")}
                </button>
              </div>
            </div>
          ))
        )}

        {showAddForm ? (
          <div style={cardStyle}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "12px",
              }}
            >
              {editingId
                ? t("container.editInstance")
                : t("container.addInstance", {
                    type: getTypeName(activeTab),
                  })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("container.name")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("container.namePlaceholder")}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label style={labelStyle}>{t("container.description")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("container.descriptionPlaceholder")}
              />
            </div>

            {activeTab === "docker" ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("container.host")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    placeholder="unix:///var/run/docker.sock"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("container.apiVersion")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formApiVersion}
                    onChange={(e) => setFormApiVersion(e.target.value)}
                    placeholder="v1.41"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("container.tlsVerify")}</label>
                  <input
                    type="checkbox"
                    style={checkboxStyle}
                    checked={formTlsVerify}
                    onChange={(e) => setFormTlsVerify(e.target.checked)}
                  />
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("container.kubeconfig")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formKubeconfig}
                    onChange={(e) => setFormKubeconfig(e.target.value)}
                    placeholder="~/.kube/config"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("container.context")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formContext}
                    onChange={(e) => setFormContext(e.target.value)}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("container.namespace")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formNamespace}
                    onChange={(e) => setFormNamespace(e.target.value)}
                  />
                </div>
              </>
            )}

            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
                marginTop: "8px",
              }}
            >
              <button style={buttonStyle} onClick={resetForm}>
                {t("common.cancel")}
              </button>
              <button style={addButtonStyle} onClick={handleSave}>
                {editingId ? t("settings.update") : t("settings.add")}
              </button>
            </div>
          </div>
        ) : (
          <button
            style={{ ...addButtonStyle, width: "100%" }}
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
          >
            + {t("container.addInstance", { type: getTypeName(activeTab) })}
          </button>
        )}
      </div>
    </div>
  );
};

export default EngineContainerPanel;
