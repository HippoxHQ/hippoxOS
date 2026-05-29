import React, { useState, useEffect, useRef } from "react";
import { workspaceCommands, WorkspaceInstance } from "../../api/workspace";
import { filesCommands, FileInfo } from "../../api/files";
import {
  FolderOpenIcon,
  FolderIcon,
  FileIcon,
  ChevronRightIcon,
} from "../../icons";

interface WorkspacePanelProps {
  t: (key: string, params?: any) => string;
}

interface TreeNode extends FileInfo {
  children?: TreeNode[];
  expanded?: boolean;
}

interface WorkspaceNode {
  workspace: WorkspaceInstance;
  treeData: TreeNode[];
  expanded: boolean;
  loading: boolean;
}

const EmptyFolderIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity: 0.5 }}
  >
    <path
      d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M12 14V10M10 12H14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ t }) => {
  const [workspaceNodes, setWorkspaceNodes] = useState<WorkspaceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const autoExpandedRef = useRef(false);
  const watchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);
  const workspaceNodesRef = useRef<WorkspaceNode[]>([]);
  const expandedPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    workspaceNodesRef.current = workspaceNodes;
  }, [workspaceNodes]);

  useEffect(() => {
    expandedPathsRef.current = expandedPaths;
  }, [expandedPaths]);

  useEffect(() => {
    loadAllWorkspaces();
    startWatching();
    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
    };
  }, []);

  const getFileSystemSnapshot = async (path: string): Promise<string> => {
    try {
      const entries = await filesCommands.readDirectory(path);
      const snapshot = entries
        .map(
          (e) =>
            `${e.name}|${e.is_directory ? "dir" : "file"}|${e.size}|${e.modified}`,
        )
        .sort()
        .join("\n");
      return snapshot;
    } catch (error) {
      return "";
    }
  };

  const checkForChanges = async (): Promise<boolean> => {
    const currentNodes = workspaceNodesRef.current;
    if (currentNodes.length === 0) return false;
    for (const node of currentNodes) {
      const currentSnapshot = await getFileSystemSnapshot(
        node.workspace.workspace_path,
      );
      const cachedSnapshot = snapshotCacheRef.current.get(node.workspace.id);
      if (cachedSnapshot !== currentSnapshot) {
        return true;
      }
    }
    return false;
  };
  const snapshotCacheRef = useRef<Map<string, string>>(new Map());
  const updateSnapshotCache = async (workspaceId: string, path: string) => {
    const snapshot = await getFileSystemSnapshot(path);
    snapshotCacheRef.current.set(workspaceId, snapshot);
  };
  const startWatching = () => {
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
    }
    watchIntervalRef.current = setInterval(async () => {
      if (isRefreshingRef.current) return;
      const hasChanges = await checkForChanges();
      if (hasChanges) {
        await refreshAllWorkspacesPreserveState();
      }
    }, 1000);
  };

  const refreshAllWorkspacesPreserveState = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    const savedExpandedPaths = new Set(expandedPathsRef.current);
    const savedWorkspaceExpanded = workspaceNodesRef.current.map(
      (n) => n.expanded,
    );
    try {
      const config = await workspaceCommands.getWorkspaceConfig();
      const newNodes: WorkspaceNode[] = [];
      for (const workspace of config.instances) {
        const existingIndex = workspaceNodesRef.current.findIndex(
          (n) => n.workspace.id === workspace.id,
        );
        newNodes.push({
          workspace,
          treeData: [],
          expanded:
            existingIndex !== -1
              ? savedWorkspaceExpanded[existingIndex]
              : false,
          loading: true,
        });
      }

      setWorkspaceNodes(newNodes);

      for (let i = 0; i < newNodes.length; i++) {
        await loadWorkspaceRootWithExpandedState(
          i,
          newNodes[i].workspace,
          savedExpandedPaths,
        );
      }
    } catch (error) {
      console.error("Failed to refresh workspaces:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  };

  const loadAllWorkspaces = async () => {
    setLoading(true);
    try {
      const config = await workspaceCommands.getWorkspaceConfig();
      const nodes: WorkspaceNode[] = [];
      for (const workspace of config.instances) {
        nodes.push({
          workspace,
          treeData: [],
          expanded: false,
          loading: true,
        });
      }
      setWorkspaceNodes(nodes);
      for (let i = 0; i < nodes.length; i++) {
        await loadWorkspaceRoot(i, nodes[i].workspace);
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceRoot = async (
    index: number,
    workspace: WorkspaceInstance,
  ) => {
    try {
      const entries = await filesCommands.readDirectory(
        workspace.workspace_path,
      );
      const tree = await buildTreeWithExpandedState(
        entries,
        workspace.workspace_path,
        expandedPaths,
      );

      await updateSnapshotCache(workspace.id, workspace.workspace_path);

      setWorkspaceNodes((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            treeData: tree,
            loading: false,
          };
        }
        return updated;
      });
    } catch (error) {
      console.error(`Failed to load workspace ${workspace.name}:`, error);
      setWorkspaceNodes((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            treeData: [],
            loading: false,
          };
        }
        return updated;
      });
    }
  };

  const loadWorkspaceRootWithExpandedState = async (
    index: number,
    workspace: WorkspaceInstance,
    savedExpandedPaths: Set<string>,
  ) => {
    try {
      const entries = await filesCommands.readDirectory(
        workspace.workspace_path,
      );
      const tree = await buildTreeWithExpandedState(
        entries,
        workspace.workspace_path,
        savedExpandedPaths,
      );

      await updateSnapshotCache(workspace.id, workspace.workspace_path);

      setWorkspaceNodes((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            treeData: tree,
            loading: false,
          };
        }
        return updated;
      });
    } catch (error) {
      console.error(`Failed to load workspace ${workspace.name}:`, error);
      setWorkspaceNodes((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            treeData: [],
            loading: false,
          };
        }
        return updated;
      });
    }
  };

  const buildTreeWithExpandedState = async (
    entries: FileInfo[],
    basePath: string,
    currentExpandedPaths: Set<string>,
  ): Promise<TreeNode[]> => {
    const tree: TreeNode[] = [];
    for (const entry of entries) {
      const node: TreeNode = {
        ...entry,
        children: [],
        expanded: currentExpandedPaths.has(entry.path),
      };
      if (entry.is_directory && currentExpandedPaths.has(entry.path)) {
        try {
          const subEntries = await filesCommands.readDirectory(entry.path);
          node.children = await buildTreeWithExpandedState(
            subEntries,
            entry.path,
            currentExpandedPaths,
          );
        } catch (error) {
          console.error(`Failed to read directory ${entry.path}:`, error);
          node.children = [];
        }
      }
      tree.push(node);
    }
    tree.sort((a, b) => {
      if (a.is_directory && !b.is_directory) return -1;
      if (!a.is_directory && b.is_directory) return 1;
      return a.name.localeCompare(b.name);
    });
    return tree;
  };

  const buildTree = async (
    entries: FileInfo[],
    basePath: string,
  ): Promise<TreeNode[]> => {
    const tree: TreeNode[] = [];
    for (const entry of entries) {
      const node: TreeNode = {
        ...entry,
        children: [],
        expanded: false,
      };
      if (entry.is_directory) {
        try {
          const subEntries = await filesCommands.readDirectory(entry.path);
          node.children = await buildTree(subEntries, entry.path);
        } catch (error) {
          console.error(`Failed to read directory ${entry.path}:`, error);
          node.children = [];
        }
      }
      tree.push(node);
    }
    tree.sort((a, b) => {
      if (a.is_directory && !b.is_directory) return -1;
      if (!a.is_directory && b.is_directory) return 1;
      return a.name.localeCompare(b.name);
    });
    return tree;
  };

  const collectAllPaths = (nodes: TreeNode[]): string[] => {
    const paths: string[] = [];
    for (const node of nodes) {
      if (node.is_directory) {
        paths.push(node.path);
        if (node.children && node.children.length > 0) {
          paths.push(...collectAllPaths(node.children));
        }
      }
    }
    return paths;
  };

  useEffect(() => {
    if (autoExpandedRef.current) return;
    if (workspaceNodes.length === 0) return;
    const defaultIndex = workspaceNodes.findIndex(
      (node) => node.workspace.is_default,
    );
    if (defaultIndex !== -1) {
      const defaultNode = workspaceNodes[defaultIndex];
      if (!defaultNode.loading && defaultNode.treeData) {
        autoExpandedRef.current = true;
        setWorkspaceNodes((prev) => {
          const updated = [...prev];
          updated[defaultIndex] = {
            ...updated[defaultIndex],
            expanded: true,
          };
          return updated;
        });
        if (defaultNode.treeData.length > 0) {
          const allPaths = collectAllPaths(defaultNode.treeData);
          setExpandedPaths(new Set(allPaths));
        }
      }
    }
  }, [workspaceNodes]);

  const toggleWorkspace = (index: number) => {
    setWorkspaceNodes((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        expanded: !updated[index].expanded,
      };
      return updated;
    });
  };

  const toggleNode = async (node: TreeNode, path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
      setExpandedPaths(newExpanded);
    } else {
      newExpanded.add(path);
      if (!node.children || node.children.length === 0) {
        try {
          const subEntries = await filesCommands.readDirectory(node.path);
          const children = await buildTreeWithExpandedState(
            subEntries,
            node.path,
            newExpanded,
          );
          node.children = children;
          setWorkspaceNodes((prev) => [...prev]);
        } catch (error) {
          console.error(`Failed to load directory ${node.path}:`, error);
        }
      }
      setExpandedPaths(newExpanded);
    }
  };

  const getWorkspaceDisplayName = (workspace: WorkspaceInstance): string => {
    const path = workspace.workspace_path;
    const normalizedPath = path.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    const folderName = parts[parts.length - 1] || workspace.name;
    return folderName !== workspace.name ? folderName : workspace.name;
  };

  const renderTreeWithLines = (
    nodes: TreeNode[],
    parentIsLast: boolean[] = [],
  ): React.ReactNode => {
    return nodes.map((node, idx) => {
      const isLast = idx === nodes.length - 1;
      const newParentIsLast = [...parentIsLast, isLast];
      let prefix = "";
      for (let i = 0; i < parentIsLast.length; i++) {
        if (parentIsLast[i]) {
          prefix += "    ";
        } else {
          prefix += "│   ";
        }
      }
      const connector = isLast ? "└── " : "├── ";
      return (
        <div key={node.path}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "3px 0",
              cursor: "pointer",
              borderRadius: "4px",
              transition: "all 0.15s ease",
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              fontSize: "12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            onClick={() => node.is_directory && toggleNode(node, node.path)}
          >
            <span
              style={{
                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                fontSize: "12px",
                color: "var(--text-tertiary)",
                whiteSpace: "pre",
                flexShrink: 0,
              }}
            >
              {prefix}
              {connector}
            </span>
            <span
              style={{
                marginLeft: "4px",
                fontSize: "13px",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {node.is_directory ? (
                expandedPaths.has(node.path) ? (
                  <FolderOpenIcon size={14} />
                ) : (
                  <FolderIcon size={14} />
                )
              ) : (
                <FileIcon size={14} />
              )}
            </span>
            <span
              style={{
                marginLeft: "6px",
                color: node.is_directory
                  ? "var(--accent-blue)"
                  : "var(--text-primary)",
                fontWeight: node.is_directory ? 500 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={node.name}
            >
              {node.name}
            </span>
          </div>
          {node.is_directory &&
            expandedPaths.has(node.path) &&
            node.children && (
              <div>{renderTreeWithLines(node.children, newParentIsLast)}</div>
            )}
        </div>
      );
    });
  };

  const manualRefresh = async () => {
    await refreshAllWorkspacesPreserveState();
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).refreshWorkspace = manualRefresh;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).refreshWorkspace;
      }
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>
            <FolderIcon size={32} />
          </div>
          <div>{t("atomicSkills.loading") || "Loading..."}</div>
        </div>
      </div>
    );
  }

  if (workspaceNodes.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-secondary)",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>
            <EmptyFolderIcon size={48} />
          </div>
          <div style={{ fontSize: "13px" }}>
            {t("workspace.empty") ||
              "No workspace, please add in settings first"}
          </div>
        </div>
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
        background: "var(--bg-primary)",
        userSelect: "none",
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FolderIcon size={16} />
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "0.3px",
            }}
          >
            {t("workspace.title") || "Workspace"}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        {workspaceNodes.map((node, index) => (
          <div key={node.workspace.id}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-color)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-secondary)";
              }}
              onClick={() => toggleWorkspace(index)}
            >
              <span
                style={{
                  marginRight: "10px",
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {node.expanded ? (
                  <FolderOpenIcon size={18} />
                ) : (
                  <FolderIcon size={18} />
                )}
              </span>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    flexShrink: 0,
                  }}
                >
                  {getWorkspaceDisplayName(node.workspace)}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-tertiary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={node.workspace.workspace_path}
                >
                  {node.workspace.workspace_path}
                </span>
              </div>
              {node.workspace.is_default && (
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    background: "var(--accent-color)",
                    color: "white",
                    borderRadius: "20px",
                    marginRight: "8px",
                    flexShrink: 0,
                  }}
                >
                  default
                </span>
              )}
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-tertiary)",
                  transition: "transform 0.2s",
                  transform: node.expanded ? "rotate(90deg)" : "rotate(0deg)",
                  display: "inline-flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <ChevronRightIcon size={12} />
              </span>
            </div>
            {node.expanded && (
              <div style={{ paddingLeft: "12px", marginTop: "4px" }}>
                {node.loading ? (
                  <div
                    style={{
                      padding: "16px",
                      color: "var(--text-tertiary)",
                      fontSize: "12px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        animation: "pulse 1s ease infinite",
                      }}
                    >
                      <FolderIcon size={16} />
                    </span>
                    <span style={{ marginLeft: "8px" }}>
                      {t("atomicSkills.loading") || "Loading..."}
                    </span>
                  </div>
                ) : node.treeData.length === 0 ? (
                  <div
                    style={{
                      padding: "16px",
                      color: "var(--text-tertiary)",
                      fontSize: "12px",
                      textAlign: "center",
                      fontStyle: "italic",
                    }}
                  >
                    {t("workspace.emptyDirectory") || "Empty directory"}
                  </div>
                ) : (
                  renderTreeWithLines(node.treeData)
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspacePanel;
