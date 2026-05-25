import React, { useState, useEffect, useRef } from "react";

interface NetworkInstance {
  id: string;
  name: string;
  type: "tcp" | "udp" | "ftp";
  host: string;
  port: number;
  encoding?: string;
  broadcast?: boolean;
  username?: string;
  password?: string;
  remoteDir?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
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
      const savedInstances = await loadInstancesFromStorage();
      setInstances(savedInstances);
    } catch (error) {
      console.error("Failed to load instances:", error);
      setInstances([]);
    }
    setLoading(false);
  };

  const loadInstancesFromStorage = async (): Promise<NetworkInstance[]> => {
    try {
      const saved = localStorage.getItem("engine_network_instances");
      if (saved) {
        return JSON.parse(saved);
      }
      if (initialConfig) {
        const migrated: NetworkInstance[] = [];
        const now = new Date().toISOString();
        if (initialConfig.tcp?.host) {
          migrated.push({
            id: `tcp_${Date.now()}`,
            name: "TCP Server",
            type: "tcp",
            host: initialConfig.tcp.host,
            port: initialConfig.tcp.port || 8888,
            encoding: initialConfig.tcp.encoding || "utf8",
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.udp?.host) {
          migrated.push({
            id: `udp_${Date.now()}`,
            name: "UDP Server",
            type: "udp",
            host: initialConfig.udp.host,
            port: initialConfig.udp.port || 9999,
            encoding: initialConfig.udp.encoding || "utf8",
            broadcast: initialConfig.udp.broadcast || false,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.ftp?.host) {
          migrated.push({
            id: `ftp_${Date.now()}`,
            name: "FTP Server",
            type: "ftp",
            host: initialConfig.ftp.host,
            port: initialConfig.ftp.port || 21,
            username: initialConfig.ftp.username || "anonymous",
            password: initialConfig.ftp.password || "",
            remoteDir: initialConfig.ftp.remoteDir || "/",
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (migrated.length > 0) {
          localStorage.setItem(
            "engine_network_instances",
            JSON.stringify(migrated),
          );
        }
        return migrated;
      }
      return [];
    } catch (error) {
      console.error("Failed to load instances from storage:", error);
      return [];
    }
  };

  const saveInstancesToStorage = async (newInstances: NetworkInstance[]) => {
    localStorage.setItem(
      "engine_network_instances",
      JSON.stringify(newInstances),
    );
    const config: any = {};
    newInstances.forEach((inst) => {
      if (inst.type === "tcp") {
        config.tcp = {
          host: inst.host,
          port: inst.port,
          encoding: inst.encoding || "utf8",
        };
      } else if (inst.type === "udp") {
        config.udp = {
          host: inst.host,
          port: inst.port,
          encoding: inst.encoding || "utf8",
          broadcast: inst.broadcast || false,
        };
      } else if (inst.type === "ftp") {
        config.ftp = {
          host: inst.host,
          port: inst.port,
          username: inst.username || "anonymous",
          password: inst.password || "",
          remoteDir: inst.remoteDir || "/",
        };
      }
    });
    if (onSave) onSave(config);
  };

  const handleDelete = async (id: string) => {
    const updated = instances.filter((i) => i.id !== id);
    setInstances(updated);
    await saveInstancesToStorage(updated);
  };

  const handleToggleEnabled = async (id: string) => {
    const updated = instances.map((i) =>
      i.id === id
        ? { ...i, enabled: !i.enabled, updatedAt: new Date().toISOString() }
        : i,
    );
    setInstances(updated);
    await saveInstancesToStorage(updated);
  };

  const handleEdit = (instance: NetworkInstance) => {
    setEditingId(instance.id);
    setFormName(instance.name);
    setFormHost(instance.host || "");
    setFormPort(instance.port);
    setFormEncoding(instance.encoding || "utf8");
    setFormBroadcast(instance.broadcast || false);
    setFormUsername(instance.username || "");
    setFormPassword(instance.password || "");
    setFormRemoteDir(instance.remoteDir || "/");
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormName("");
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
    const now = new Date().toISOString();
    const newInstance: NetworkInstance = {
      id: editingId || `${activeTab}_${Date.now()}`,
      name: formName,
      type: activeTab as any,
      host: formHost,
      port: formPort,
      encoding: activeTab !== "ftp" ? formEncoding : undefined,
      broadcast: activeTab === "udp" ? formBroadcast : undefined,
      username: activeTab === "ftp" ? formUsername : undefined,
      password: activeTab === "ftp" ? formPassword : undefined,
      remoteDir: activeTab === "ftp" ? formRemoteDir : undefined,
      enabled: true,
      createdAt: editingId
        ? instances.find((i) => i.id === editingId)?.createdAt || now
        : now,
      updatedAt: now,
    };
    let updated: NetworkInstance[];
    if (editingId) {
      updated = instances.map((i) => (i.id === editingId ? newInstance : i));
    } else {
      updated = [...instances, newInstance];
    }
    setInstances(updated);
    await saveInstancesToStorage(updated);
    resetForm();
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
        {t("atomicSkills.loading") || "Loading..."}
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
                    ? t("network.enabled") || "Enabled"
                    : t("network.disabled") || "Disabled"}
                </span>
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
                <label style={labelStyle}>{t("network.host") || "Host"}</label>
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
                <label style={labelStyle}>{t("network.port") || "Port"}</label>
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
                  <label style={labelStyle}>
                    {t("network.encoding") || "Encoding"}
                  </label>
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
                  <label style={labelStyle}>
                    {t("network.broadcast") || "Broadcast"}
                  </label>
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
                    <label style={labelStyle}>
                      {t("network.username") || "Username"}
                    </label>
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
                    <label style={labelStyle}>
                      {t("network.remoteDir") || "Remote Directory"}
                    </label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.remoteDir}
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
                  onClick={() => handleToggleEnabled(instance.id)}
                >
                  {instance.enabled
                    ? t("network.disable") || "Disable"
                    : t("network.enable") || "Enable"}
                </button>
                <button
                  style={{
                    ...buttonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleEdit(instance)}
                >
                  {t("network.edit") || "Edit"}
                </button>
                <button
                  style={{
                    ...deleteButtonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleDelete(instance.id)}
                >
                  {t("network.delete") || "Delete"}
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
                ? t("network.editInstance") || "Edit Network Config"
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
              <label style={labelStyle}>
                {t("network.name") || "Config Name"}
              </label>
              <input
                type="text"
                style={inputStyle}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={
                  t("network.namePlaceholder") || "Example: My Server"
                }
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
              <label style={labelStyle}>{t("network.host") || "Host"}</label>
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
              <label style={labelStyle}>{t("network.port") || "Port"}</label>
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
                <label style={labelStyle}>
                  {t("network.encoding") || "Encoding"}
                </label>
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
                <label style={labelStyle}>
                  {t("network.broadcast") || "Broadcast"}
                </label>
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
                  <label style={labelStyle}>
                    {t("network.username") || "Username"}
                  </label>
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
                  <label style={labelStyle}>
                    {t("network.password") || "Password"}
                  </label>
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
                  <label style={labelStyle}>
                    {t("network.remoteDir") || "Remote Directory"}
                  </label>
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
                {t("settings.cancel") || "Cancel"}
              </button>
              <button style={addButtonStyle} onClick={handleSave}>
                {editingId
                  ? t("settings.update") || "Update"
                  : t("settings.add") || "Add"}
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
