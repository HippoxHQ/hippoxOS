import React, { useState, useEffect, useRef } from "react";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { FileNode } from "../types";
import { getFileIcon } from "../fileUtils";
import { ContextMenu, ContextMenuItemType } from "./ContextMenu";
import { codeEditorCommands } from "../../../../command/CodeEditor";

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
  const containerRef = useRef<HTMLDivElement>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileNode;
  } | null>(null);

  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<
    "rename" | "newfile" | "newfolder"
  >("rename");
  const [editValue, setEditValue] = useState("");
  const [editParentPath, setEditParentPath] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("contextmenu", handleContextMenu);
      return () => {
        container.removeEventListener("contextmenu", handleContextMenu);
      };
    }
  }, []);

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const handleRootContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isContainer = target === containerRef.current;
    const isFileTreeRoot = target.classList?.contains("file-tree-root");

    if (isContainer || isFileTreeRoot) {
      e.preventDefault();
      e.stopPropagation();

      if (!workspacePath) return;

      const rootNode: FileNode = {
        name: workspacePath.split(/[\\/]/).pop() || "Root",
        path: workspacePath,
        isDirectory: true,
        children: fileTree,
      };

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        node: rootNode,
      });
    }
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleNewFile = (node: FileNode) => {
    if (!expandedPaths.has(node.path)) {
      toggleExpand(node.path, node);
    }
    startEditing("newfile", node.path, "新建文件.txt");
    closeContextMenu();
  };

  const handleNewFolder = (node: FileNode) => {
    if (!expandedPaths.has(node.path)) {
      toggleExpand(node.path, node);
    }
    startEditing("newfolder", node.path, "新建文件夹");
    closeContextMenu();
  };

  const handleOpenInExplorer = async (path: string) => {
    const result = await codeEditorCommands.openInExplorer(path);
    if (!result.success) {
      alert(result.message);
    }
    closeContextMenu();
  };

  const handleOpenInTerminal = async (path: string) => {
    const result = await codeEditorCommands.openInTerminal(path);
    if (!result.success) {
      alert(result.message);
    }
    closeContextMenu();
  };

  const handleCut = (node: FileNode) => {
    closeContextMenu();
  };

  const handleCopy = (node: FileNode) => {
    closeContextMenu();
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    closeContextMenu();
  };

  const startEditing = (
    type: "rename" | "newfile" | "newfolder",
    path: string,
    initialValue: string,
  ) => {
    setEditingType(type);
    setEditingPath(path);
    setEditValue(initialValue);
    if (type === "newfile" || type === "newfolder") {
      setEditParentPath(path);
    } else {
      setEditParentPath(null);
    }
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        if (type === "rename") {
          const dotIndex = initialValue.lastIndexOf(".");
          if (dotIndex > 0) {
            editInputRef.current.setSelectionRange(0, dotIndex);
          } else {
            editInputRef.current.select();
          }
        } else {
          editInputRef.current.select();
        }
      }
    }, 50);
  };

  const startRename = (node: FileNode) => {
    startEditing("rename", node.path, node.name);
    closeContextMenu();
  };

  const confirmEdit = async () => {
    if (!editingPath || !editValue.trim()) {
      cancelEdit();
      return;
    }

    const trimmedName = editValue.trim();
    const currentType = editingType;
    const currentParentPath = editParentPath;
    const currentPath = editingPath;

    setEditingPath(null);
    setEditParentPath(null);

    if (currentType === "rename") {
      const result = await codeEditorCommands.rename(currentPath, trimmedName);
      if (result.success) {
        updateNodeName(currentPath, trimmedName);
      } else {
        alert(result.message);
        setEditingPath(currentPath);
        setEditParentPath(null);
      }
    } else if (currentType === "newfile") {
      const parentPath = currentParentPath || currentPath;
      const result = await codeEditorCommands.createFile(
        parentPath,
        trimmedName,
      );
      if (result.success) {
        await addNodeToParent(parentPath, trimmedName, false);
      } else {
        alert(result.message);
        setEditingPath(currentPath);
        setEditParentPath(currentParentPath);
      }
    } else if (currentType === "newfolder") {
      const parentPath = currentParentPath || currentPath;
      const result = await codeEditorCommands.createFolder(
        parentPath,
        trimmedName,
      );
      if (result.success) {
        await addNodeToParent(parentPath, trimmedName, true);
      } else {
        alert(result.message);
        setEditingPath(currentPath);
        setEditParentPath(currentParentPath);
      }
    }
  };

  const updateNodeName = (path: string, newName: string) => {
    const updateName = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === path) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return { ...node, children: updateName(node.children) };
        }
        return node;
      });
    };
    setFileTree((prev) => updateName(prev));
  };

  const addNodeToParent = async (
    parentPath: string,
    name: string,
    isDirectory: boolean,
  ) => {
    const fullPath = await join(parentPath, name);
    const newNode: FileNode = {
      name: name,
      path: fullPath,
      isDirectory: isDirectory,
      children: isDirectory ? [] : undefined,
    };

    const addNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === parentPath) {
          const children = node.children || [];
          const exists = children.some((child) => child.name === name);
          if (exists) {
            return node;
          }
          const newChildren = [...children, newNode].sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
          return { ...node, children: newChildren };
        }
        if (node.children) {
          return { ...node, children: addNode(node.children) };
        }
        return node;
      });
    };

    setFileTree((prev) => addNode(prev));
  };

  const cancelEdit = () => {
    setEditingPath(null);
    setEditParentPath(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleDelete = async (node: FileNode) => {
    const confirmMsg = node.isDirectory
      ? `确定要删除文件夹 "${node.name}" 及其所有内容吗？`
      : `确定要删除文件 "${node.name}" 吗？`;

    // eslint-disable-next-line no-restricted-globals
    if (!confirm(confirmMsg)) return;

    const result = await codeEditorCommands.delete(node.path);
    if (result.success) {
      removeNode(node.path);
    } else {
      alert(result.message);
    }
    closeContextMenu();
  };

  const removeNode = (path: string) => {
    const removeNodeFn = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .filter((node) => node.path !== path)
        .map((node) => {
          if (node.children) {
            return { ...node, children: removeNodeFn(node.children) };
          }
          return node;
        });
    };
    setFileTree((prev) => removeNodeFn(prev));
  };

  const getContextMenuItems = (node: FileNode): ContextMenuItemType[] => {
    const isFile = !node.isDirectory;
    const isFolder = node.isDirectory;
    const fullPath = node.path;
    const isRoot = workspacePath === fullPath;
    const items: ContextMenuItemType[] = [];
    if (isFolder) {
      if (isRoot) {
        items.push(
          {
            label: "新建文件",
            action: () => handleNewFile(node),
          },
          {
            label: "新建文件夹",
            action: () => handleNewFolder(node),
          },
          {
            divider: true,
          },
          {
            label: "打开文件所在目录",
            action: () => handleOpenInExplorer(fullPath),
          },
          {
            label: "在终端中打开",
            action: () => handleOpenInTerminal(fullPath),
          },
          {
            divider: true,
          },
          {
            label: "复制路径",
            action: () => handleCopyPath(fullPath),
          },
        );
      } else {
        items.push(
          {
            label: "新建文件",
            action: () => handleNewFile(node),
          },
          {
            label: "新建文件夹",
            action: () => handleNewFolder(node),
          },
          {
            divider: true,
          },
          {
            label: "打开文件所在目录",
            action: () => handleOpenInExplorer(fullPath),
          },
          {
            label: "在终端中打开",
            action: () => handleOpenInTerminal(fullPath),
          },
          {
            divider: true,
          },
          {
            label: "剪切",
            action: () => handleCut(node),
          },
          {
            label: "复制",
            action: () => handleCopy(node),
          },
          {
            divider: true,
          },
          {
            label: "复制路径",
            action: () => handleCopyPath(fullPath),
          },
          {
            divider: true,
          },
          {
            label: "重命名",
            action: () => startRename(node),
          },
          {
            label: "删除",
            action: () => handleDelete(node),
          },
        );
      }
    } else {
      items.push(
        {
          label: "打开文件所在目录",
          action: () => handleOpenInExplorer(fullPath),
        },
        {
          label: "在终端中打开",
          action: () => handleOpenInTerminal(fullPath),
        },
        {
          divider: true,
        },
        {
          label: "剪切",
          action: () => handleCut(node),
        },
        {
          label: "复制",
          action: () => handleCopy(node),
        },
        {
          divider: true,
        },
        {
          label: "复制路径",
          action: () => handleCopyPath(fullPath),
        },
        {
          divider: true,
        },
        {
          label: "重命名",
          action: () => startRename(node),
        },
        {
          label: "删除",
          action: () => handleDelete(node),
        },
      );
    }
    return items;
  };

  const isEditingNewInParent = (parentPath: string) => {
    return (
      (editingType === "newfile" || editingType === "newfolder") &&
      editParentPath === parentPath
    );
  };

  const renderFileTreeWithNewItem = (nodes: FileNode[], level: number = 0) => {
    const result: React.ReactNode[] = [];

    for (const node of nodes) {
      const isExpanded = expandedPaths.has(node.path);
      const isSelected = selectedFile === node.path;
      const isRenaming = editingPath === node.path && editingType === "rename";

      if (node.isDirectory) {
        result.push(
          <div key={node.path}>
            {isRenaming ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  paddingLeft: `${level * 16 + 8}px`,
                  borderRadius: "4px",
                  background: "var(--hover-bg)",
                }}
              >
                <span style={{ fontSize: "14px", flexShrink: 0 }}>📁</span>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  style={{
                    flex: 1,
                    background: "var(--bg-primary)",
                    border: "1px solid var(--accent-color)",
                    borderRadius: "3px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    padding: "2px 6px",
                    outline: "none",
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={confirmEdit}
                  style={{
                    background: "var(--accent-color)",
                    border: "none",
                    borderRadius: "3px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "2px 6px",
                    flexShrink: 0,
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "3px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "2px 6px",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => toggleExpand(node.path, node)}
                onContextMenu={(e) => handleContextMenu(e, node)}
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
            )}
            {/* 当目录展开时，渲染子节点 */}
            {isExpanded && (
              <div>
                {/* 先渲染已有的子节点 */}
                {node.children && node.children.length > 0 && (
                  <div>
                    {renderFileTreeWithNewItem(node.children, level + 1)}
                  </div>
                )}
                {/* 如果没有子节点，显示 (empty) */}
                {(!node.children || node.children.length === 0) && (
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
                {/* 在子节点列表末尾显示新建项 */}
                {isEditingNewInParent(node.path) && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      paddingLeft: `${(level + 1) * 16 + 8}px`,
                      borderRadius: "4px",
                      background: "var(--hover-bg)",
                      marginTop:
                        node.children && node.children.length > 0 ? "2px" : "0",
                    }}
                  >
                    <span style={{ fontSize: "14px", flexShrink: 0 }}>
                      {editingType === "newfolder" ? "📁" : "📜"}
                    </span>
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      style={{
                        flex: 1,
                        background: "var(--bg-primary)",
                        border: "1px solid var(--accent-color)",
                        borderRadius: "3px",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        padding: "2px 6px",
                        outline: "none",
                        minWidth: 0,
                      }}
                    />
                    <button
                      onClick={confirmEdit}
                      style={{
                        background: "var(--accent-color)",
                        border: "none",
                        borderRadius: "3px",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "12px",
                        padding: "2px 6px",
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-color)",
                        borderRadius: "3px",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "12px",
                        padding: "2px 6px",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>,
        );
      } else {
        result.push(
          <div key={node.path}>
            {isRenaming ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  paddingLeft: `${level * 16 + 8}px`,
                  borderRadius: "4px",
                  background: "var(--hover-bg)",
                }}
              >
                <span style={{ fontSize: "14px", flexShrink: 0 }}>
                  {getFileIcon(node.name)}
                </span>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  style={{
                    flex: 1,
                    background: "var(--bg-primary)",
                    border: "1px solid var(--accent-color)",
                    borderRadius: "3px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    padding: "2px 6px",
                    outline: "none",
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={confirmEdit}
                  style={{
                    background: "var(--accent-color)",
                    border: "none",
                    borderRadius: "3px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "2px 6px",
                    flexShrink: 0,
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "3px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "2px 6px",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => onFileSelect(node.path)}
                onContextMenu={(e) => handleContextMenu(e, node)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  paddingLeft: `${level * 16 + 8}px`,
                  cursor: "pointer",
                  borderRadius: "4px",
                  background: isSelected ? "var(--accent-glow)" : "transparent",
                  color: isSelected
                    ? "var(--accent-color)"
                    : "var(--text-primary)",
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
            )}
          </div>,
        );
      }
    }

    return result;
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
        ref={containerRef}
        className="file-tree-root"
        onContextMenu={handleRootContextMenu}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "100%",
          padding: "12px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "12px",
        }}
      >
        {searchQuery.trim()
          ? t("editor.noSearchResults") || "No matching files found"
          : t("editor.emptyDirectory") || "Empty directory"}

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={getContextMenuItems(contextMenu.node)}
            onClose={closeContextMenu}
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="file-tree-root"
      onContextMenu={handleRootContextMenu}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100%",
      }}
    >
      {renderFileTreeWithNewItem(filteredTree)}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.node)}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};
