import React, { useState, useEffect } from "react";
import { showToast, ToastType } from "../../Toast";
import { showDialog, DialogType } from "../../Dialog";
import { filesCommands } from "../../../command/files";
import {
  WorkspaceInstance,
  workspaceCommands,
} from "../../../command/workspace";
import { SearchIcon } from "../../../icons";

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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadWorkspaceInstances();
  }, []);

  const loadWorkspaceInstances = async (
    retryCount: number = 0,
  ): Promise<void> => {
    setLoading(true);
    try {
      const config = await workspaceCommands.getWorkspaceConfig();
      if (config.instances.length === 0 && retryCount < 5) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return loadWorkspaceInstances(retryCount + 1);
      }
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
      showToast(
        ToastType.ERROR,
        "Failed to load workspace instances: " + error,
      );
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
      showToast(ToastType.ERROR, "Failed to open directory: " + error);
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
      showToast(ToastType.ERROR, "Failed to select directory: " + error);
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
      showToast(ToastType.ERROR, t("workspace.addFailed"));
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const filteredInstances = workspaceInstances.filter((instance) => {
    const matchesSearch =
      instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.workspace_path.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const ellipsisStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--text-primary)",
    minWidth: "100px",
    flexShrink: 0,
    userSelect: "none",
    ...ellipsisStyle,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    padding: "8px 12px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "5px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
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

  const workspaceCardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    padding: "12px",
    borderBottom: "1px solid var(--border-color)",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
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
    minWidth: 0,
    width: "100%",
    overflow: "hidden",
  };
  const styles: Record<string, React.CSSProperties> = {
    searchInputWrapper: {
      flex: 1,
      minWidth: 0,
      position: "relative" as const,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 12px",
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
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
      borderRadius: "4px",
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
      maxWidth: "100%",
      boxSizing: "border-box",
      overflow: "hidden",
    },
    searchRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      width: "100%",
      minWidth: 0,
      overflow: "hidden",
    },
  };

  const globalStyles = `
  .workspace-search-input-wrapper {
    flex: 1 1 0%;
    min-width: 130px;
    overflow: hidden;
    // width: 100%;
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 1.5px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    box-sizing: border-box;
  }
  .workspace-search-input-wrapper:focus-within {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }
  .workspace-search-input-wrapper svg {
    flex-shrink: 0;
    color: var(--text-tertiary);
  }
  .workspace-search-input {
    flex: 1;
    min-width: 0;
    width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 13px;
    padding: 4px 0;
  }
  .workspace-search-clear {
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
  .workspace-search-clear:hover {
    color: var(--text-primary);
    background: var(--hover-bg);
  }
`;

  if (typeof document !== "undefined") {
    const styleId = "workspace-config-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = globalStyles;
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

  const hasInstances = filteredInstances.length > 0;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <div style={styles.header}>
        <div style={styles.searchRow}>
          <div
            className="workspace-search-input-wrapper"
            style={{ flex: 1, minWidth: "130px" }}
          >
            <SearchIcon />
            <input
              type="text"
              className="workspace-search-input"
              placeholder={
                t("workspace.searchPlaceholder") || "Search workspaces..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="workspace-search-clear"
                onClick={handleClearSearch}
                title={t("workspace.clearSearch") || "Clear search"}
              >
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
          paddingBottom: "10px",
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        {showAddForm && (
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
            {searchTerm
              ? t("workspace.noSearchResults") || "No matching workspaces found"
              : t("workspace.noWorkspaces") || "No workspaces available"}
          </div>
        ) : (
          filteredInstances.map((instance) => (
            <div key={instance.id} style={workspaceCardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "nowrap",
                  gap: "8px",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    ...ellipsisStyle,
                    flexShrink: 1,
                    minWidth: 0,
                  }}
                >
                  📁 {instance.name}
                </span>
                {defaultInstanceId === instance.id && (
                  <span style={{ ...badgeStyle, flexShrink: 0 }}>
                    {t("settings.defaultBadge")}
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
                  flexWrap: "nowrap",
                  minWidth: 0,
                  width: "100%",
                  overflow: "hidden",
                }}
              >
                <label style={labelStyle}>{t("settings.workspacePath")}</label>
                <div style={pathRowStyle}>
                  <input
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: 0,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    value={instance.workspace_path}
                    disabled
                    placeholder={t("settings.workspacePathPlaceholder")}
                  />
                  <button
                    style={{ ...folderButtonStyle, flexShrink: 0 }}
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
          ))
        )}
      </div>
    </div>
  );
};

export default WorkspaceConfig;
