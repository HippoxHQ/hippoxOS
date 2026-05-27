import React, { useState, useEffect, useRef } from "react";
import { showToast, ToastType } from "../../Toast";
import { showDialog, DialogType } from "../../Dialog";
import { engineCommands } from "../../../api/config";

interface NetworkInstance {
  id: string;
  name: string;
  description: string;
  type: "tcp" | "udp" | "ftp";
  host: string;
  port: number;
  encoding?: string;
  broadcast?: boolean;
  username?: string;
  password?: string;
  remote_dir?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface EngineNetworkPanelProps {
  t: (key: string, params?: any) => string;
  initialConfig?: any;
  onSave?: (config: any) => void;
}

const NETWORK_TYPE_CONFIG: Record<
  string,
  { name: string; icon: string; defaultPort: number }
> = {
  tcp: { name: "TCP", icon: "🔌", defaultPort: 8888 },
  udp: { name: "UDP", icon: "📡", defaultPort: 9999 },
  ftp: { name: "FTP", icon: "📁", defaultPort: 21 },
};

const EngineNetworkPanel: React.FC<EngineNetworkPanelProps> = ({
  t,
  initialConfig,
  onSave,
}) => {
  const [instances, setInstances] = useState<NetworkInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("tcp");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHost, setFormHost] = useState("");
  const [formPort, setFormPort] = useState(8888);
  const [formEncoding, setFormEncoding] = useState("utf8");
  const [formBroadcast, setFormBroadcast] = useState(false);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRemoteDir, setFormRemoteDir] = useState("/");

  const networkTypes = Object.keys(NETWORK_TYPE_CONFIG);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, [networkTypes]);

  useEffect(() => {
    setTimeout(checkScrollButtons, 0);
  }, [networkTypes]);

  useEffect(() => {
    setFormPort(NETWORK_TYPE_CONFIG[activeTab]?.defaultPort || 8888);
    if (activeTab === "tcp") {
      setFormEncoding("utf8");
    } else if (activeTab === "udp") {
      setFormEncoding("utf8");
      setFormBroadcast(false);
    } else if (activeTab === "ftp") {
      setFormUsername("");
      setFormPassword("");
      setFormRemoteDir("/");
    }
  }, [activeTab]);

  const loadInstances = async () => {
    setLoading(true);
    try {
      const savedInstances = await engineCommands.getNetworkInstances();
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
        t("network.disableConfirmTitle"),
        t("network.disableConfirmMessage", { name }),
        async () => {
          await engineCommands.toggleNetworkInstance(id, newEnabled);
          await loadInstances();
          showToast(
            ToastType.SUCCESS,
            t(`network.${actionText}Success`, { name }),
          );
        },
        undefined,
        t("network.disable"),
        t("common.cancel"),
      );
    } else {
      await engineCommands.toggleNetworkInstance(id, newEnabled);
      await loadInstances();
      showToast(ToastType.SUCCESS, t(`network.${actionText}Success`, { name }));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    showDialog(
      DialogType.WARNING,
      t("network.deleteConfirmTitle"),
      t("network.deleteConfirmMessage", { name }),
      async () => {
        await engineCommands.deleteNetworkInstance(id);
        await loadInstances();
        showToast(ToastType.SUCCESS, t("network.deleteSuccess", { name }));
      },
      undefined,
      t("network.delete"),
      t("common.cancel"),
    );
  };

  const handleEdit = (instance: NetworkInstance) => {
    setEditingId(instance.id);
    setFormName(instance.name);
    setFormDescription(instance.description || "");
    setFormHost(instance.host || "");
    setFormPort(instance.port);
    setFormEncoding(instance.encoding || "utf8");
    setFormBroadcast(instance.broadcast || false);
    setFormUsername(instance.username || "");
    setFormPassword(instance.password || "");
    setFormRemoteDir(instance.remote_dir || "/");
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormHost("");
    setFormPort(NETWORK_TYPE_CONFIG[activeTab]?.defaultPort || 8888);
    setFormEncoding("utf8");
    setFormBroadcast(false);
    setFormUsername("");
    setFormPassword("");
    setFormRemoteDir("/");
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    try {
      await engineCommands.saveNetworkInstance({
        id: editingId || undefined,
        name: formName,
        description: formDescription,
        instance_type: activeTab,
        host: formHost,
        port: formPort,
        encoding: activeTab !== "ftp" ? formEncoding : undefined,
        broadcast: activeTab === "udp" ? formBroadcast : undefined,
        username: activeTab === "ftp" ? formUsername : undefined,
        password: activeTab === "ftp" ? formPassword : undefined,
        remote_dir: activeTab === "ftp" ? formRemoteDir : undefined,
        enabled: true,
      });

      await loadInstances();

      if (editingId) {
        showToast(
          ToastType.SUCCESS,
          t("network.updateSuccess", { name: formName }),
        );
      } else {
        showToast(
          ToastType.SUCCESS,
          t("network.addSuccess", { type: getTypeName(activeTab) }),
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
    return NETWORK_TYPE_CONFIG[type]?.icon || "🌐";
  };

  const getTypeName = (type: string) => {
    return NETWORK_TYPE_CONFIG[type]?.name || type;
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

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
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
    .network-tabs-container {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 0px;
    }
    .network-tabs-scroll {
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .network-tabs-scroll::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .network-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border-color);
      min-width: max-content;
    }
    .network-tab {
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
    .network-tab:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }
    .network-tab.active {
      color: var(--accent-color, #0066cc);
      border-bottom: 2px solid var(--accent-color, #0066cc);
    }
    .network-tab-scroll-btn {
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
    .network-tab-scroll-btn:hover {
      background: var(--hover-bg);
      color: var(--text-primary);
    }
  `;

  if (typeof document !== "undefined") {
    const styleId = "network-tabs-styles";
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
        className="network-tabs-container"
        style={{ padding: "0px", margin: 0 }}
      >
        {showLeftArrow && (
          <button
            className="network-tab-scroll-btn"
            onClick={() => scrollTabs("left")}
          >
            ◀
          </button>
        )}
        <div
          className="network-tabs-scroll"
          ref={tabsRef}
          onScroll={checkScrollButtons}
        >
          <div className="network-tabs">
            {networkTypes.map((type) => (
              <button
                key={type}
                className={`network-tab ${activeTab === type ? "active" : ""}`}
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
            className="network-tab-scroll-btn"
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
            {t("network.noInstances", { type: getTypeName(activeTab) })}
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
                    ? t("network.enabled")
                    : t("network.disabled")}
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
                  <label style={labelStyle}>{t("network.description")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={instance.description}
                    disabled
                    readOnly
                  />
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>{t("network.host")}</label>
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
                <label style={labelStyle}>{t("network.port")}</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={instance.port}
                  disabled
                  readOnly
                />
              </div>

              {instance.type !== "ftp" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("network.encoding")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={instance.encoding}
                    disabled
                    readOnly
                  />
                </div>
              )}

              {instance.type === "udp" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("network.broadcast")}</label>
                  <input
                    type="checkbox"
                    style={checkboxStyle}
                    checked={instance.broadcast}
                    disabled
                  />
                </div>
              )}

              {instance.type === "ftp" && (
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
                    <label style={labelStyle}>{t("network.username")}</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.username}
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
                    <label style={labelStyle}>{t("network.remoteDir")}</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.remote_dir}
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
                    ? t("network.disable")
                    : t("network.enable")}
                </button>
                <button
                  style={{
                    ...buttonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleEdit(instance)}
                >
                  {t("network.edit")}
                </button>
                <button
                  style={{
                    ...deleteButtonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleDelete(instance.id, instance.name)}
                >
                  {t("network.delete")}
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
                ? t("network.editInstance")
                : t("network.addInstance", { type: getTypeName(activeTab) })}
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
              <label style={labelStyle}>{t("network.name")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("network.namePlaceholder")}
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
              <label style={labelStyle}>{t("network.description")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("network.descriptionPlaceholder")}
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
              <label style={labelStyle}>{t("network.host")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formHost}
                onChange={(e) => setFormHost(e.target.value)}
                placeholder="localhost"
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
              <label style={labelStyle}>{t("network.port")}</label>
              <input
                type="number"
                style={inputStyle}
                value={formPort}
                onChange={(e) => setFormPort(parseInt(e.target.value) || 0)}
              />
            </div>

            {activeTab !== "ftp" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>{t("network.encoding")}</label>
                <select
                  style={selectStyle}
                  value={formEncoding}
                  onChange={(e) => setFormEncoding(e.target.value)}
                >
                  <option>utf8</option>
                  <option>gbk</option>
                  <option>ascii</option>
                </select>
              </div>
            )}

            {activeTab === "udp" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>{t("network.broadcast")}</label>
                <input
                  type="checkbox"
                  style={checkboxStyle}
                  checked={formBroadcast}
                  onChange={(e) => setFormBroadcast(e.target.checked)}
                />
              </div>
            )}

            {activeTab === "ftp" && (
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
                  <label style={labelStyle}>{t("network.username")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
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
                  <label style={labelStyle}>{t("network.password")}</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
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
                  <label style={labelStyle}>{t("network.remoteDir")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formRemoteDir}
                    onChange={(e) => setFormRemoteDir(e.target.value)}
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
            + {t("network.addInstance", { type: getTypeName(activeTab) })}
          </button>
        )}
      </div>
    </div>
  );
};

export default EngineNetworkPanel;
