import React, { useState, useEffect } from "react";
import { configCommands } from "../../api/config";

interface WorkspaceInstance {
  id: string;
  name: string;
  workspacePath: string;
  maxLogSize: number;
  is_default: boolean;
}

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
      const savedInstances = localStorage.getItem("hippox-workspace-instances");
      const savedDefaultId = localStorage.getItem("hippox-default-workspace");
      if (savedInstances) {
        const instances = JSON.parse(savedInstances);
        setWorkspaceInstances(instances);
        if (savedDefaultId) {
          setDefaultInstanceId(savedDefaultId);
        } else if (instances.length > 0) {
          setDefaultInstanceId(instances[0].id);
        }
      } else if (initialWorkspaceConfig) {
        const defaultInstance: WorkspaceInstance = {
          id: `workspace_${Date.now()}`,
          name: "默认工作空间",
          workspacePath: initialWorkspaceConfig.workspacePath || "",
          maxLogSize: initialWorkspaceConfig.maxLogSize || 100,
          is_default: true,
        };
        setWorkspaceInstances([defaultInstance]);
        setDefaultInstanceId(defaultInstance.id);
      }
    } catch (error) {
      console.error("Failed to load workspace instances:", error);
    } finally {
      setLoading(false);
    }
  };
  const saveWorkspaceInstances = (
    instances: WorkspaceInstance[],
    defaultId: string,
  ) => {
    localStorage.setItem(
      "hippox-workspace-instances",
      JSON.stringify(instances),
    );
    localStorage.setItem("hippox-default-workspace", defaultId);
    if (onSaveWorkspace) {
      const defaultWorkspace = instances.find((i) => i.id === defaultId);
      if (defaultWorkspace) {
        onSaveWorkspace({
          workspacePath: defaultWorkspace.workspacePath,
          maxLogSize: defaultWorkspace.maxLogSize,
        });
      }
    }
  };
  const handleSetDefault = (instanceId: string) => {
    const updatedInstances = workspaceInstances.map((inst) => ({
      ...inst,
      is_default: inst.id === instanceId,
    }));
    setWorkspaceInstances(updatedInstances);
    setDefaultInstanceId(instanceId);
    saveWorkspaceInstances(updatedInstances, instanceId);
  };
  const handleDeleteInstance = (instanceId: string) => {
    if (workspaceInstances.length <= 1) {
      return;
    }
    if (defaultInstanceId === instanceId) {
      return;
    }
    const updatedInstances = workspaceInstances.filter(
      (inst) => inst.id !== instanceId,
    );
    setWorkspaceInstances(updatedInstances);
    saveWorkspaceInstances(updatedInstances, defaultInstanceId);
  };
  const handleAddInstance = () => {
    if (!newWorkspaceName.trim() || !newWorkspacePath.trim()) {
      return;
    }
    const newInstance: WorkspaceInstance = {
      id: `workspace_${Date.now()}`,
      name: newWorkspaceName.trim(),
      workspacePath: newWorkspacePath.trim(),
      maxLogSize: newMaxLogSize,
      is_default: false,
    };
    const updatedInstances = [...workspaceInstances, newInstance];
    setWorkspaceInstances(updatedInstances);
    setShowAddForm(false);
    setNewWorkspaceName("");
    setNewWorkspacePath("");
    setNewMaxLogSize(100);
    saveWorkspaceInstances(updatedInstances, defaultInstanceId);
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
                <input
                  style={inputStyle}
                  value={instance.workspacePath}
                  disabled
                  placeholder={t("settings.workspacePathPlaceholder")}
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
                <label style={labelStyle}>
                  {t("settings.maxLogSize")} (MB)
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={instance.maxLogSize}
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
                      padding: "4px 10px",
                    }}
                    onClick={() => handleSetDefault(instance.id)}
                  >
                    {t("settings.setAsDefault") || "设为默认"}
                  </button>
                )}
                {defaultInstanceId !== instance.id &&
                  workspaceInstances.length > 1 && (
                    <button
                      style={{
                        ...deleteButtonStyle,
                        fontSize: "11px",
                        padding: "4px 10px",
                      }}
                      onClick={() => handleDeleteInstance(instance.id)}
                    >
                      {t("settings.delete") || "删除"}
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
                <input
                  style={inputStyle}
                  value={newWorkspacePath}
                  onChange={(e) => setNewWorkspacePath(e.target.value)}
                  placeholder={t("settings.workspacePathPlaceholder")}
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
                  {t("settings.cancel") || "取消"}
                </button>
                <button style={addButtonStyle} onClick={handleAddInstance}>
                  {t("settings.add") || "添加"}
                </button>
              </div>
            </div>
          ) : (
            <button
              style={{ ...addButtonStyle, width: "100%" }}
              onClick={() => setShowAddForm(true)}
            >
              + {t("settings.addWorkspace") || "添加工作空间"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
