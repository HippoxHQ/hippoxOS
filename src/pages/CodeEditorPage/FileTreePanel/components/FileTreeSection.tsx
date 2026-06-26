import React, { useState, useEffect } from "react";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { FileNode } from "../types";
import { getFileIcon } from "../fileUtils";

interface FileTreeSectionProps {
  workspacePath: string | null | undefined;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  searchQuery: string;
  isCollapsed: boolean;
  t: (key: string) => string;
}

export const FileTreeSection: React.FC<FileTreeSectionProps> = ({
  workspacePath,
  selectedFile,
  onFileSelect,
  searchQuery,
  isCollapsed,
  t,
}) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadDirectoryTree = async (path: string): Promise<FileNode[]> => {
    try {
      const entries = await readDir(path);
      const nodes: FileNode[] = [];
      for (const entry of entries) {
        const name = entry.name;
        if (name.startsWith(".") && name !== ".git") continue;
        if (
          name === "node_modules" ||
          name === "target" ||
          name === "dist" ||
          name === "build"
        )
          continue;
        const fullPath = await join(path, name);
        const isDirectory = entry.isDirectory;
        const node: FileNode = {
          name: name,
          path: fullPath,
          isDirectory: isDirectory,
          children: isDirectory ? [] : undefined,
        };
        nodes.push(node);
      }
      return nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error("Failed to read directory:", error);
      return [];
    }
  };

  const loadChildren = async (node: FileNode): Promise<FileNode[]> => {
    if (!node.isDirectory) return [];
    try {
      const entries = await readDir(node.path);
      const children: FileNode[] = [];
      for (const entry of entries) {
        const name = entry.name;
        if (name.startsWith(".") && name !== ".git") continue;
        if (
          name === "node_modules" ||
          name === "target" ||
          name === "dist" ||
          name === "build"
        )
          continue;
        const fullPath = await join(node.path, name);
        const isDirectory = entry.isDirectory;
        children.push({
          name: name,
          path: fullPath,
          isDirectory: isDirectory,
          children: isDirectory ? [] : undefined,
        });
      }
      return children.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error("Failed to load children:", error);
      return [];
    }
  };

  useEffect(() => {
    const initFileTree = async () => {
      if (!workspacePath) {
        setFileTree([]);
        return;
      }
      setLoading(true);
      try {
        const tree = await loadDirectoryTree(workspacePath);
        setFileTree(tree);
        setExpandedPaths(new Set([workspacePath]));
      } catch (error) {
        console.error("Failed to load file tree:", error);
      } finally {
        setLoading(false);
      }
    };
    initFileTree();
  }, [workspacePath]);

  const toggleExpand = async (path: string, node?: FileNode) => {
    const newSet = new Set(expandedPaths);
    if (newSet.has(path)) {
      newSet.delete(path);
      setExpandedPaths(newSet);
      return;
    }
    newSet.add(path);
    setExpandedPaths(newSet);
    if (
      node &&
      node.isDirectory &&
      (!node.children || node.children.length === 0)
    ) {
      const children = await loadChildren(node);
      const updateTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((n) => {
          if (n.path === path) {
            return { ...n, children };
          }
          if (n.children) {
            return { ...n, children: updateTree(n.children) };
          }
          return n;
        });
      };
      setFileTree((prev) => updateTree(prev));
    }
  };

  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();
    const filterNode = (node: FileNode): FileNode | null => {
      const nameMatch = node.name.toLowerCase().includes(lowerQuery);

      if (node.isDirectory && node.children) {
        const filteredChildren = node.children
          .map((child) => filterNode(child))
          .filter((child): child is FileNode => child !== null);

        if (filteredChildren.length > 0 || nameMatch) {
          return {
            ...node,
            children: filteredChildren,
          };
        }
        return null;
      }

      return nameMatch ? node : null;
    };

    return nodes
      .map((node) => filterNode(node))
      .filter((node): node is FileNode => node !== null);
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const expandMatchingPaths = (nodes: FileNode[], pathSet: Set<string>) => {
        for (const node of nodes) {
          if (node.isDirectory) {
            if (node.children) {
              expandMatchingPaths(node.children, pathSet);
            }
            const hasMatchingChild = (n: FileNode): boolean => {
              if (n.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return true;
              }
              if (n.isDirectory && n.children) {
                return n.children.some((child) => hasMatchingChild(child));
              }
              return false;
            };
            if (hasMatchingChild(node)) {
              pathSet.add(node.path);
            }
          }
        }
      };

      const newExpanded = new Set(expandedPaths);
      expandMatchingPaths(fileTree, newExpanded);
      setExpandedPaths(newExpanded);
    }
  }, [searchQuery, fileTree]);

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedPaths.has(node.path);
      const isSelected = selectedFile === node.path;

      if (node.isDirectory) {
        return (
          <div key={node.path}>
            <div
              onClick={() => toggleExpand(node.path, node)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                paddingLeft: `${level * 16 + 8}px`,
                cursor: "pointer",
                borderRadius: "4px",
                color: "var(--text-primary)",
                fontSize: "13px",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              title={node.path}
            >
              <span style={{ fontSize: "14px", flexShrink: 0 }}>
                {isExpanded ? "📂" : "📁"}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {node.name}
              </span>
            </div>
            {isExpanded && node.children && node.children.length > 0 && (
              <div>{renderFileTree(node.children, level + 1)}</div>
            )}
            {isExpanded && node.children && node.children.length === 0 && (
              <div
                style={{
                  paddingLeft: `${(level + 1) * 16 + 8}px`,
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  padding: "2px 8px 2px 8px",
                }}
              >
                <span style={{ paddingLeft: `${(level + 1) * 16}px` }}>
                  (empty)
                </span>
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          onClick={() => onFileSelect(node.path)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            paddingLeft: `${level * 16 + 8}px`,
            cursor: "pointer",
            borderRadius: "4px",
            background: isSelected ? "var(--accent-glow)" : "transparent",
            color: isSelected ? "var(--accent-color)" : "var(--text-primary)",
            fontSize: "13px",
            userSelect: "none",
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = "var(--hover-bg)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = "transparent";
            }
          }}
          title={node.path}
        >
          <span style={{ fontSize: "14px", flexShrink: 0 }}>
            {getFileIcon(node.name)}
          </span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {node.name}
          </span>
        </div>
      );
    });
  };

  const filteredTree = filterTree(fileTree, searchQuery);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "12px",
          padding: "20px",
        }}
      >
        {t("common.loading") || "Loading..."}
      </div>
    );
  }

  if (!workspacePath) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "12px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        {t("editor.noWorkspace") || "No workspace loaded"}
      </div>
    );
  }

  if (filteredTree.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "12px",
          padding: "12px",
          textAlign: "center",
        }}
      >
        {searchQuery.trim()
          ? t("editor.noSearchResults") || "No matching files found"
          : t("editor.emptyDirectory") || "Empty directory"}
      </div>
    );
  }

  return <div>{renderFileTree(filteredTree)}</div>;
};