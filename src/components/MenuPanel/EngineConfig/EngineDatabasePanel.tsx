import React, { useState, useEffect, useRef } from "react";
import { showToast, ToastType } from "../../Toast";
import { showDialog, DialogType } from "../../Dialog";

interface DatabaseInstance {
  id: string;
  name: string;
  type: "postgresql" | "mysql" | "redis" | "sqlite";
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  redis_db?: number;
  sqlite_path?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EngineDatabasePanelProps {
  t: (key: string, params?: any) => string;
  initialConfig?: any;
  onSave?: (config: any) => void;
}

const DB_TYPE_CONFIG: Record<
  string,
  { name: string; icon: string; defaultPort: number }
> = {
  postgresql: { name: "PostgreSQL", icon: "🐘", defaultPort: 5432 },
  mysql: { name: "MySQL", icon: "🐬", defaultPort: 3306 },
  redis: { name: "Redis", icon: "⚡", defaultPort: 6379 },
  sqlite: { name: "SQLite", icon: "📁", defaultPort: 0 },
};

const EngineDatabasePanel: React.FC<EngineDatabasePanelProps> = ({
  t,
  initialConfig,
  onSave,
}) => {
  const [instances, setInstances] = useState<DatabaseInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("postgresql");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [formName, setFormName] = useState("");
  const [formHost, setFormHost] = useState("");
  const [formPort, setFormPort] = useState(5432);
  const [formDatabase, setFormDatabase] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRedisDb, setFormRedisDb] = useState(0);
  const [formSqlitePath, setFormSqlitePath] = useState("");

  const dbTypes = Object.keys(DB_TYPE_CONFIG);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, [dbTypes]);

  useEffect(() => {
    setTimeout(checkScrollButtons, 0);
  }, [dbTypes]);

  useEffect(() => {
    setFormPort(DB_TYPE_CONFIG[activeTab]?.defaultPort || 0);
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

  const loadInstancesFromStorage = async (): Promise<DatabaseInstance[]> => {
    try {
      const saved = localStorage.getItem("engine_database_instances");
      if (saved) {
        return JSON.parse(saved);
      }
      if (initialConfig) {
        const migrated: DatabaseInstance[] = [];
        const now = new Date().toISOString();
        if (initialConfig.postgresql?.host) {
          migrated.push({
            id: `pg_${Date.now()}`,
            name: "PostgreSQL",
            type: "postgresql",
            host: initialConfig.postgresql.host,
            port: initialConfig.postgresql.port || 5432,
            database: initialConfig.postgresql.database,
            username: initialConfig.postgresql.username,
            password: initialConfig.postgresql.password,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.mysql?.host) {
          migrated.push({
            id: `mysql_${Date.now()}`,
            name: "MySQL",
            type: "mysql",
            host: initialConfig.mysql.host,
            port: initialConfig.mysql.port || 3306,
            database: initialConfig.mysql.database,
            username: initialConfig.mysql.username,
            password: initialConfig.mysql.password,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.redis?.host) {
          migrated.push({
            id: `redis_${Date.now()}`,
            name: "Redis",
            type: "redis",
            host: initialConfig.redis.host,
            port: initialConfig.redis.port || 6379,
            database: "",
            username: "",
            password: initialConfig.redis.password,
            redis_db: initialConfig.redis.db || 0,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (initialConfig.sqlite?.path) {
          migrated.push({
            id: `sqlite_${Date.now()}`,
            name: "SQLite",
            type: "sqlite",
            host: "",
            port: 0,
            database: "",
            username: "",
            password: "",
            sqlite_path: initialConfig.sqlite.path,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (migrated.length > 0) {
          localStorage.setItem(
            "engine_database_instances",
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

  const saveInstancesToStorage = async (newInstances: DatabaseInstance[]) => {
    localStorage.setItem(
      "engine_database_instances",
      JSON.stringify(newInstances),
    );
    const config: any = {};
    newInstances.forEach((inst) => {
      if (inst.type === "postgresql") {
        config.postgresql = {
          host: inst.host,
          port: inst.port,
          database: inst.database,
          username: inst.username,
          password: inst.password,
        };
      } else if (inst.type === "mysql") {
        config.mysql = {
          host: inst.host,
          port: inst.port,
          database: inst.database,
          username: inst.username,
          password: inst.password,
        };
      } else if (inst.type === "redis") {
        config.redis = {
          host: inst.host,
          port: inst.port,
          password: inst.password,
          db: inst.redis_db || 0,
        };
      } else if (inst.type === "sqlite") {
        config.sqlite = {
          path: inst.sqlite_path || "",
        };
      }
    });
    if (onSave) onSave(config);
  };

  const handleToggleEnabled = (id: string, name: string, enabled: boolean) => {
    const newEnabled = !enabled;
    const actionText = newEnabled ? "enable" : "disable";

    if (!newEnabled) {
      showDialog(
        DialogType.WARNING,
        t("database.disableConfirmTitle"),
        t("database.disableConfirmMessage", { name }),
        async () => {
          const updated = instances.map((i) =>
            i.id === id
              ? {
                  ...i,
                  enabled: newEnabled,
                  updatedAt: new Date().toISOString(),
                }
              : i,
          );
          setInstances(updated);
          await saveInstancesToStorage(updated);
          showToast(
            ToastType.SUCCESS,
            t(`database.${actionText}Success`, { name }),
          );
        },
        undefined,
        t("database.disable"),
        t("common.cancel"),
      );
    } else {
      const updated = instances.map((i) =>
        i.id === id
          ? { ...i, enabled: newEnabled, updatedAt: new Date().toISOString() }
          : i,
      );
      setInstances(updated);
      saveInstancesToStorage(updated);
      showToast(
        ToastType.SUCCESS,
        t(`database.${actionText}Success`, { name }),
      );
    }
  };

  const handleDelete = async (id: string, name: string) => {
    showDialog(
      DialogType.WARNING,
      t("database.deleteConfirmTitle"),
      t("database.deleteConfirmMessage", { name }),
      async () => {
        const updated = instances.filter((i) => i.id !== id);
        setInstances(updated);
        await saveInstancesToStorage(updated);
        showToast(ToastType.SUCCESS, t("database.deleteSuccess", { name }));
      },
      undefined,
      t("database.delete"),
      t("common.cancel"),
    );
  };

  const handleEdit = (instance: DatabaseInstance) => {
    setEditingId(instance.id);
    setFormName(instance.name);
    setFormHost(instance.host || "");
    setFormPort(instance.port);
    setFormDatabase(instance.database || "");
    setFormUsername(instance.username || "");
    setFormPassword(instance.password || "");
    setFormRedisDb(instance.redis_db || 0);
    setFormSqlitePath(instance.sqlite_path || "");
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormName("");
    setFormHost("");
    setFormPort(DB_TYPE_CONFIG[activeTab]?.defaultPort || 5432);
    setFormDatabase("");
    setFormUsername("");
    setFormPassword("");
    setFormRedisDb(0);
    setFormSqlitePath("");
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const now = new Date().toISOString();
    const newInstance: DatabaseInstance = {
      id: editingId || `${activeTab}_${Date.now()}`,
      name: formName,
      type: activeTab as any,
      host: formHost,
      port: formPort,
      database: formDatabase,
      username: formUsername,
      password: formPassword,
      redis_db: activeTab === "redis" ? formRedisDb : undefined,
      sqlite_path: activeTab === "sqlite" ? formSqlitePath : undefined,
      enabled: true,
      createdAt: editingId
        ? instances.find((i) => i.id === editingId)?.createdAt || now
        : now,
      updatedAt: now,
    };
    let updated: DatabaseInstance[];
    if (editingId) {
      updated = instances.map((i) => (i.id === editingId ? newInstance : i));
      showToast(
        ToastType.SUCCESS,
        t("database.updateSuccess", { name: formName }),
      );
    } else {
      updated = [...instances, newInstance];
      showToast(
        ToastType.SUCCESS,
        t("database.addSuccess", { type: getTypeName(activeTab) }),
      );
    }
    setInstances(updated);
    await saveInstancesToStorage(updated);
    resetForm();
  };

  const getInstancesByType = (type: string) => {
    return instances.filter((i) => i.type === type);
  };

  const getTypeIcon = (type: string) => {
    return DB_TYPE_CONFIG[type]?.icon || "🗄️";
  };

  const getTypeName = (type: string) => {
    return DB_TYPE_CONFIG[type]?.name || type;
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
    .db-tabs-container {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 0px;
    }
    .db-tabs-scroll {
      flex: 1;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .db-tabs-scroll::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .db-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border-color);
      min-width: max-content;
    }
    .db-tab {
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
    .db-tab:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }
    .db-tab.active {
      color: var(--accent-color, #0066cc);
      border-bottom: 2px solid var(--accent-color, #0066cc);
    }
    .db-tab-scroll-btn {
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
    .db-tab-scroll-btn:hover {
      background: var(--hover-bg);
      color: var(--text-primary);
    }
  `;

  if (typeof document !== "undefined") {
    const styleId = "db-tabs-styles";
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
      <div className="db-tabs-container" style={{ padding: "0px", margin: 0 }}>
        {showLeftArrow && (
          <button
            className="db-tab-scroll-btn"
            onClick={() => scrollTabs("left")}
          >
            ◀
          </button>
        )}
        <div
          className="db-tabs-scroll"
          ref={tabsRef}
          onScroll={checkScrollButtons}
        >
          <div className="db-tabs">
            {dbTypes.map((type) => (
              <button
                key={type}
                className={`db-tab ${activeTab === type ? "active" : ""}`}
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
            className="db-tab-scroll-btn"
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
            {t("database.noInstances", { type: getTypeName(activeTab) })}
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
                    ? t("database.enabled")
                    : t("database.disabled")}
                </span>
              </div>

              {instance.type !== "sqlite" ? (
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
                    <label style={labelStyle}>{t("database.host")}</label>
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
                    <label style={labelStyle}>{t("database.port")}</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={instance.port}
                      disabled
                      readOnly
                    />
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("database.path")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={instance.sqlite_path}
                    disabled
                    readOnly
                  />
                </div>
              )}

              {instance.type !== "redis" && instance.type !== "sqlite" && (
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
                    <label style={labelStyle}>{t("database.database")}</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.database}
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
                    <label style={labelStyle}>{t("database.username")}</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={instance.username}
                      disabled
                      readOnly
                    />
                  </div>
                </>
              )}

              {instance.type === "redis" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={labelStyle}>{t("database.db")}</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={instance.redis_db}
                    disabled
                    readOnly
                  />
                </div>
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
                    ? t("database.disable")
                    : t("database.enable")}
                </button>
                <button
                  style={{
                    ...buttonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleEdit(instance)}
                >
                  {t("database.edit")}
                </button>
                <button
                  style={{
                    ...deleteButtonStyle,
                    fontSize: "11px",
                    padding: "4px 10px",
                  }}
                  onClick={() => handleDelete(instance.id, instance.name)}
                >
                  {t("database.delete")}
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
                ? t("database.editInstance")
                : t("database.addInstance", { type: getTypeName(activeTab) })}
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
              <label style={labelStyle}>{t("database.name")}</label>
              <input
                type="text"
                style={inputStyle}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("database.namePlaceholder")}
              />
            </div>
            {activeTab !== "sqlite" ? (
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
                  <label style={labelStyle}>{t("database.host")}</label>
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
                  <label style={labelStyle}>{t("database.port")}</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={formPort}
                    onChange={(e) => setFormPort(parseInt(e.target.value) || 0)}
                  />
                </div>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>{t("database.path")}</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formSqlitePath}
                  onChange={(e) => setFormSqlitePath(e.target.value)}
                  placeholder="/path/to/database.db"
                />
              </div>
            )}
            {activeTab !== "redis" && activeTab !== "sqlite" && (
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
                  <label style={labelStyle}>{t("database.database")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formDatabase}
                    onChange={(e) => setFormDatabase(e.target.value)}
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
                  <label style={labelStyle}>{t("database.username")}</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                  />
                </div>
              </>
            )}
            {activeTab !== "sqlite" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>{t("database.password")}</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
              </div>
            )}
            {activeTab === "redis" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <label style={labelStyle}>{t("database.db")}</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={formRedisDb}
                  onChange={(e) =>
                    setFormRedisDb(parseInt(e.target.value) || 0)
                  }
                />
              </div>
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
            + {t("database.addInstance", { type: getTypeName(activeTab) })}
          </button>
        )}
      </div>
    </div>
  );
};

export default EngineDatabasePanel;
