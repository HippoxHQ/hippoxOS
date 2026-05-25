import React, { useState, useEffect } from "react";
import { configCommands } from "../../api/config";
import { workspaceCommands, WorkspaceInstance } from "../../api/workspace";
import { filesCommands } from "../../api/files";

interface SystemConfigProps {
  t: (key: string, params?: any) => string;
  theme: "light" | "dark";
  language: "zh" | "en";
  onThemeChange: (theme: "light" | "dark") => void;
  onLanguageChange: (language: "zh" | "en") => void;
  initialWorkspaceConfig?: {
    workspacePath: string;
    maxLogSize: number;
  };
  onSaveWorkspace?: (config: any) => void;
}

const SystemConfig: React.FC<SystemConfigProps> = ({
  t,
  theme,
  language,
  onThemeChange,
  onLanguageChange,
  initialWorkspaceConfig,
  onSaveWorkspace,
}) => {
  const [workspaceInstances, setWorkspaceInstances] = useState<
    WorkspaceInstance[]
  >([]);
  const [defaultInstanceId, setDefaultInstanceId] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspacePath, setNewWorkspacePath] = useState("");
  const [newMaxLogSize, setNewMaxLogSize] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaceInstances();
  }, []);

  const loadWorkspaceInstances = async () => {
    setLoading(true);
    try {
      const config = await workspaceCommands.getWorkspaceConfig();
      setWorkspaceInstances(config.instances);
      setDefaultInstanceId(config.default_instance_id);
      if (onSaveWorkspace && config.default_instance_id) {
        const defaultWorkspace = config.instances.find(
          (i) => i.id === config.default_instance_id,
        );
        if (defaultWorkspace) {
          onSaveWorkspace({
            workspacePath: defaultWorkspace.workspace_path,
            maxLogSize: defaultWorkspace.max_log_size,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load workspace instances:", error);
      if (initialWorkspaceConfig) {
        const defaultInstance: WorkspaceInstance = {
          id: `workspace_${Date.now()}`,
          name: "workspace",
          workspace_path: initialWorkspaceConfig.workspacePath || "",
          max_log_size: initialWorkspaceConfig.maxLogSize || 100,
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setWorkspaceInstances([defaultInstance]);
        setDefaultInstanceId(defaultInstance.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (instanceId: string) => {
    try {
      await workspaceCommands.setDefaultWorkspace(instanceId);
      const updatedInstances = workspaceInstances.map((inst) => ({
        ...inst,
        is_default: inst.id === instanceId,
      }));
      setWorkspaceInstances(updatedInstances);
      setDefaultInstanceId(instanceId);
      if (onSaveWorkspace) {
        const defaultWorkspace = updatedInstances.find(
          (i) => i.id === instanceId,
        );
        if (defaultWorkspace) {
          onSaveWorkspace({
            workspacePath: defaultWorkspace.workspace_path,
            maxLogSize: defaultWorkspace.max_log_size,
          });
        }
      }
    } catch (error) {
      console.error("Failed to set default workspace:", error);
    }
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (workspaceInstances.length <= 1) return;
    if (defaultInstanceId === instanceId) return;
    try {
      await workspaceCommands.deleteWorkspace(instanceId);
      const updatedInstances = workspaceInstances.filter(
        (inst) => inst.id !== instanceId,
      );
      setWorkspaceInstances(updatedInstances);
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
  };

  const handleOpenDirectory = async (path: string) => {
    try {
      await filesCommands.openPath(path);
    } catch (error) {
      console.error("Failed to open directory:", error);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const selected = await filesCommands.selectDirectory();
      if (selected) {
        setNewWorkspacePath(selected);
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
    }
  };

  const handleAddInstance = async () => {
    if (!newWorkspaceName.trim() || !newWorkspacePath.trim()) return;
    const now = new Date().toISOString();
    const newInstance: WorkspaceInstance = {
      id: `workspace_${Date.now()}`,
      name: newWorkspaceName.trim(),
      workspace_path: newWorkspacePath.trim(),
      max_log_size: newMaxLogSize,
      is_default: false,
      created_at: now,
      updated_at: now,
    };
    try {
      await workspaceCommands.addWorkspace(newInstance);
      const updatedInstances = [...workspaceInstances, newInstance];
      setWorkspaceInstances(updatedInstances);
      setShowAddForm(false);
      setNewWorkspaceName("");
      setNewWorkspacePath("");
      setNewMaxLogSize(100);
    } catch (error) {
      console.error("Failed to add workspace:", error);
    }
  };

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    onThemeChange(newTheme);
    await configCommands.saveSettingsTheme(newTheme);
  };

  const handleLanguageChange = async (newLanguage: "zh" | "en") => {
    onLanguageChange(newLanguage);
    await configCommands.saveSettingsLanguage(newLanguage);
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
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    cursor: "pointer",
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

  const workspaceCardStyle: React.CSSProperties = {
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

  const folderButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    padding: "8px 10px",
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const pathRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
  };

  if (loading) {
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
        {t("atomicSkills.loading") || "加载中..."}
      </div>
    );
  }

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
        <div
          style={{
            padding: "0 0 8px 0",
            marginBottom: "16px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "12px",
              paddingLeft: "4px",
            }}
          >
            🎨 {t("settings.interfaceConfig")}
          </div>
          <div
            className="settings-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("settings.theme")}</label>
            <select
              style={selectStyle}
              value={theme}
              onChange={(e) =>
                handleThemeChange(e.target.value as "light" | "dark")
              }
            >
              <option value="light">{t("settings.themeLight")}</option>
              <option value="dark">{t("settings.themeDark")}</option>
            </select>
          </div>
          <div
            className="settings-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <label style={labelStyle}>{t("settings.language")}</label>
            <select
              style={selectStyle}
              value={language}
              onChange={(e) =>
                handleLanguageChange(e.target.value as "zh" | "en")
              }
            >
              <option value="zh">{t("settings.langZh")}</option>
              <option value="en">{t("settings.langEn")}</option>
            </select>
          </div>
        </div>

        <div style={{ padding: "0" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "12px",
              paddingLeft: "4px",
            }}
          >
            📁 {t("settings.workspaceConfig")}
          </div>

          {workspaceInstances.map((instance) => (
            <div key={instance.id} style={workspaceCardStyle}>
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
                  📁 {instance.name}
                </span>
                {defaultInstanceId === instance.id && (
                  <span style={badgeStyle}>
                    {t("settings.defaultBadge") || "默认"}
                  </span>
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
                <label style={labelStyle}>{t("settings.workspacePath")}</label>
                <div style={pathRowStyle}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={instance.workspace_path}
                    disabled
                    placeholder={t("settings.workspacePathPlaceholder")}
                  />
                  <button
                    style={folderButtonStyle}
                    onClick={() => handleOpenDirectory(instance.workspace_path)}
                    title={t("settings.openDirectory") || "打开目录"}
                  >
                    📂 {t("settings.open") || "打开"}
                  </button>
                </div>
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
                  {t("settings.maxLogSize")} (MB)
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={instance.max_log_size}
                  disabled
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                }}
              >
                {defaultInstanceId !== instance.id && (
                  <button
                    style={{
                      ...buttonStyle,
                      fontSize: "11px",
                      padding: "8px 10px",
                    }}
                    onClick={() => handleSetDefault(instance.id)}
                  >
                    {t("settings.setAsDefault") || "Set Default"}
                  </button>
                )}
                {defaultInstanceId !== instance.id &&
                  workspaceInstances.length > 1 && (
                    <button
                      style={{
                        ...deleteButtonStyle,
                        fontSize: "11px",
                        padding: "8px 10px",
                      }}
                      onClick={() => handleDeleteInstance(instance.id)}
                    >
                      {t("settings.delete") || "Delete"}
                    </button>
                  )}
              </div>
            </div>
          ))}
          {showAddForm ? (
            <div style={workspaceCardStyle}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "12px",
                }}
              >
                {t("settings.addWorkspace") || "添加工作空间"}
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
                  {t("settings.workspaceName") || "工作空间名称"}
                </label>
                <input
                  style={inputStyle}
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder={
                    t("settings.workspaceNamePlaceholder") || "例如: 开发环境"
                  }
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
                <label style={labelStyle}>{t("settings.workspacePath")}</label>
                <div style={pathRowStyle}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={newWorkspacePath}
                    readOnly
                    placeholder={t("settings.workspacePathPlaceholder")}
                    onClick={handleSelectDirectory}
                  />
                  <button
                    style={folderButtonStyle}
                    onClick={handleSelectDirectory}
                    title={t("settings.selectDirectory") || "Select Directory"}
                  >
                    📂 {t("settings.browse") || "Browse"}
                  </button>
                </div>
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
                  {t("settings.maxLogSize")} (MB)
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={newMaxLogSize}
                  onChange={(e) =>
                    setNewMaxLogSize(parseInt(e.target.value) || 100)
                  }
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  style={buttonStyle}
                  onClick={() => setShowAddForm(false)}
                >
                  {t("settings.cancel") || "Cancel"}
                </button>
                <button style={addButtonStyle} onClick={handleAddInstance}>
                  {t("settings.add") || "Add"}
                </button>
              </div>
            </div>
          ) : (
            <button
              style={{ ...addButtonStyle, width: "100%" }}
              onClick={() => setShowAddForm(true)}
            >
              + {t("settings.addWorkspace") || "Add WorkSpace"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
