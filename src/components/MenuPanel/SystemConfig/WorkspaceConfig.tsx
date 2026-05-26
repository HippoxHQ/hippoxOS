import React, { useState, useEffect } from "react";
import { workspaceCommands, WorkspaceInstance } from "../../../api/workspace";
import { filesCommands } from "../../../api/files";
import { showToast, ToastType } from "../../Toast";
import { showDialog, DialogType } from "../../Dialog";

interface WorkspaceConfigProps {
  t: (key: string, params?: any) => string;
  onSaveWorkspace?: (config: any) => void;
  initialWorkspaceConfig?: {
    workspacePath: string;
    maxLogSize: number;
  };
}

const WorkspaceConfig: React.FC<WorkspaceConfigProps> = ({
  t,
  onSaveWorkspace,
  initialWorkspaceConfig,
}) => {
  const [workspaceInstances, setWorkspaceInstances] = useState<
    WorkspaceInstance[]
  >([]);
  const [defaultInstanceId, setDefaultInstanceId] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspacePath, setNewWorkspacePath] = useState("");
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

  const handleSetDefault = async (instanceId: string, instanceName: string) => {
    try {
      await workspaceCommands.setDefaultWorkspace(instanceId);
      const updatedInstances = workspaceInstances.map((inst) => ({
        ...inst,
        is_default: inst.id === instanceId,
      }));
      setWorkspaceInstances(updatedInstances);
      setDefaultInstanceId(instanceId);
      showToast(
        ToastType.SUCCESS,
        t("workspace.defaultSuccess", { name: instanceName }),
      );
      if (onSaveWorkspace) {
        const defaultWorkspace = updatedInstances.find(
          (i) => i.id === instanceId,
        );
        if (defaultWorkspace) {
          onSaveWorkspace({
            workspacePath: defaultWorkspace.workspace_path,
          });
        }
      }
    } catch (error) {
      console.error("Failed to set default workspace:", error);
      showToast(ToastType.ERROR, t("workspace.defaultFailed"));
    }
  };

  const handleDeleteInstance = async (
    instanceId: string,
    instanceName: string,
  ) => {
    if (workspaceInstances.length <= 1) {
      showToast(ToastType.WARNING, t("workspace.cannotDeleteLast"));
      return;
    }
    if (defaultInstanceId === instanceId) {
      showToast(ToastType.WARNING, t("workspace.cannotDeleteDefault"));
      return;
    }

    showDialog(
      DialogType.WARNING,
      t("workspace.deleteConfirmTitle"),
      t("workspace.deleteConfirmMessage", { name: instanceName }),
      async () => {
        try {
          await workspaceCommands.deleteWorkspace(instanceId);
          const updatedInstances = workspaceInstances.filter(
            (inst) => inst.id !== instanceId,
          );
          setWorkspaceInstances(updatedInstances);
          showToast(
            ToastType.SUCCESS,
            t("workspace.deleteSuccess", { name: instanceName }),
          );
        } catch (error) {
          console.error("Failed to delete workspace:", error);
          showToast(ToastType.ERROR, t("workspace.deleteFailed"));
        }
      },
      undefined,
      t("workspace.delete"),
      t("common.cancel"),
    );
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
        if (!newWorkspaceName.trim()) {
          const dirName = getWorkspaceNameFromPath(selected);
          setNewWorkspaceName(dirName);
        }
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
    }
  };

  const getWorkspaceNameFromPath = (path: string): string => {
    if (!path) return "workspace";
    const normalizedPath = path.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    return parts[parts.length - 1] || "workspace";
  };

  const handleAddInstance = async () => {
    if (!newWorkspacePath.trim()) {
      showToast(ToastType.WARNING, t("workspace.pathRequired"));
      return;
    }
    let workspaceName = newWorkspaceName.trim();
    if (!workspaceName) {
      workspaceName = getWorkspaceNameFromPath(newWorkspacePath);
    }
    const now = new Date().toISOString();
    const newInstance: WorkspaceInstance = {
      id: `workspace_${Date.now()}`,
      name: workspaceName,
      workspace_path: newWorkspacePath.trim(),
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
      showToast(
        ToastType.SUCCESS,
        t("workspace.addSuccess", { name: workspaceName }),
      );
    } catch (error) {
      console.error("Failed to add workspace:", error);
      showToast(ToastType.ERROR, t("workspace.addFailed"));
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

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "0 10px",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: "10px",
          paddingBottom: "10px",
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
                <span style={badgeStyle}>{t("settings.defaultBadge")}</span>
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
                  title={t("settings.openDirectory")}
                >
                  📂 {t("settings.open")}
                </button>
              </div>
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
                  onClick={() => handleSetDefault(instance.id, instance.name)}
                >
                  {t("settings.setAsDefault")}
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
                    onClick={() =>
                      handleDeleteInstance(instance.id, instance.name)
                    }
                  >
                    {t("settings.delete")}
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
              {t("settings.addWorkspace")}
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
              <label style={labelStyle}>{t("settings.workspaceName")}</label>
              <input
                style={inputStyle}
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder={t("settings.workspaceNamePlaceholder")}
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
                  title={t("settings.selectDirectory")}
                >
                  📂 {t("settings.browse")}
                </button>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button style={buttonStyle} onClick={() => setShowAddForm(false)}>
                {t("settings.cancel")}
              </button>
              <button style={addButtonStyle} onClick={handleAddInstance}>
                {t("settings.add")}
              </button>
            </div>
          </div>
        ) : (
          <button
            style={{ ...addButtonStyle, width: "100%" }}
            onClick={() => setShowAddForm(true)}
          >
            + {t("settings.addWorkspace")}
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkspaceConfig;
