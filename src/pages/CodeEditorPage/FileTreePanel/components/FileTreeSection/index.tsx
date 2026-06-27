import React, { useState, useEffect, useRef } from "react";
import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { codeEditorCommands } from "../../../../../command/CodeEditor";
import { showToast, ToastType } from "../../../../../components/Toast";
import { getFileIcon } from "../../fileUtils";
import { FileNode } from "../../types";
import { ContextMenuItemType, ContextMenu } from "../ContextMenu";
import { DialogType, showDialog } from "../../../../../components/Dialog";

interface FileTreeSectionProps {
  workspacePath: string | null | undefined;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  searchQuery: string;
  isCollapsed: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
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
  const isConfirmingRef = useRef<boolean>(false);
  const initialEditValueRef = useRef<string>("");

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
    startEditing("newfile", node.path, t("codeEditor.defaultFileName"));
    closeContextMenu();
  };

  const handleNewFolder = (node: FileNode) => {
    if (!expandedPaths.has(node.path)) {
      toggleExpand(node.path, node);
    }
    startEditing("newfolder", node.path, t("codeEditor.defaultFolderName"));
    closeContextMenu();
  };

  const handleOpenInExplorer = async (path: string) => {
    const result = await codeEditorCommands.openInExplorer(path);
    if (!result.success) {
      showToast(
        ToastType.ERROR,
        result.message || t("codeEditor.openInExplorer"),
      );
    }
    closeContextMenu();
  };

  const handleOpenInTerminal = async (path: string) => {
    const result = await codeEditorCommands.openInTerminal(path);
    if (!result.success) {
      showToast(
        ToastType.ERROR,
        result.message || t("codeEditor.openInTerminal"),
      );
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

  const startRename = (node: FileNode) => {
    startEditing("rename", node.path, node.name);
    closeContextMenu();
  };

  const confirmEdit = async () => {
    if (isConfirmingRef.current) return;
    isConfirmingRef.current = true;

    if (!editingPath) {
      cancelEdit();
      isConfirmingRef.current = false;
      return;
    }
    const trimmedName = editValue.trim();
    if (editingType === "rename") {
      if (!trimmedName || trimmedName === initialEditValueRef.current) {
        cancelEdit();
        isConfirmingRef.current = false;
        return;
      }
    } else {
      if (!trimmedName) {
        cancelEdit();
        isConfirmingRef.current = false;
        return;
      }
    }
    const currentType = editingType;
    const currentParentPath = editParentPath;
    const currentPath = editingPath;
    setEditingPath(null);
    setEditParentPath(null);
    if (currentType === "rename") {
      const result = await codeEditorCommands.rename(currentPath, trimmedName);
      if (result.success) {
        updateNodeName(currentPath, trimmedName);
        showToast(ToastType.SUCCESS, t("codeEditor.renameSuccess"));
      } else {
        if (result.message && result.message.includes("already exists")) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.fileExists", { name: trimmedName }),
          );
        } else {
          showToast(
            ToastType.ERROR,
            result.message || t("codeEditor.renameFailed"),
          );
        }
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
        showToast(ToastType.SUCCESS, t("codeEditor.createSuccess"));
      } else {
        if (result.message && result.message.includes("folder named")) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.fileFolderConflict", {
              type: t("codeEditor.newFile"),
              conflict: t("codeEditor.newFolder"),
              name: trimmedName,
            }),
          );
        } else if (
          result.message &&
          result.message.includes("already exists")
        ) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.fileExists", { name: trimmedName }),
          );
        } else {
          showToast(
            ToastType.ERROR,
            result.message || t("codeEditor.createFileFailed"),
          );
        }
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
        showToast(ToastType.SUCCESS, t("codeEditor.createSuccess"));
      } else {
        if (result.message && result.message.includes("file named")) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.fileFolderConflict", {
              type: t("codeEditor.newFolder"),
              conflict: t("codeEditor.newFile"),
              name: trimmedName,
            }),
          );
        } else if (
          result.message &&
          result.message.includes("already exists")
        ) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.folderExists", { name: trimmedName }),
          );
        } else {
          showToast(
            ToastType.ERROR,
            result.message || t("codeEditor.createFolderFailed"),
          );
        }
        setEditingPath(currentPath);
        setEditParentPath(currentParentPath);
      }
    }
    setTimeout(() => {
      isConfirmingRef.current = false;
    }, 300);
  };
  const isCancelActionRef = useRef<boolean>(false);
  const cancelEdit = () => {
    isCancelActionRef.current = true;
    setEditingPath(null);
    setEditParentPath(null);
    setTimeout(() => {
      isConfirmingRef.current = false;
      isCancelActionRef.current = false;
    }, 300);
  };

  const autoSaveEdit = async () => {
    if (isConfirmingRef.current || isCancelActionRef.current) {
      return;
    }
    if (!editingPath) return;
    const trimmedName = editValue.trim();
    if (editingType === "rename") {
      if (!trimmedName || trimmedName === initialEditValueRef.current) {
        cancelEdit();
        return;
      }
    } else {
      if (!trimmedName) {
        cancelEdit();
        return;
      }
    }
    const currentType = editingType;
    const currentParentPath = editParentPath;
    const currentPath = editingPath;
    setEditingPath(null);
    setEditParentPath(null);
    if (currentType === "rename") {
      const result = await codeEditorCommands.rename(currentPath, trimmedName);
      if (result.success) {
        updateNodeName(currentPath, trimmedName);
        showToast(ToastType.SUCCESS, t("codeEditor.renameSuccess"));
      } else {
        if (result.message && result.message.includes("already exists")) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.fileExists", { name: trimmedName }),
          );
        } else {
          showToast(
            ToastType.ERROR,
            result.message || t("codeEditor.renameFailed"),
          );
        }
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
        showToast(ToastType.SUCCESS, t("codeEditor.createSuccess"));
      } else {
        if (result.message && result.message.includes("folder named")) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.fileFolderConflict", {
              type: t("codeEditor.newFile"),
              conflict: t("codeEditor.newFolder"),
              name: trimmedName,
            }),
          );
        } else if (
          result.message &&
          result.message.includes("already exists")
        ) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.fileExists", { name: trimmedName }),
          );
        } else {
          showToast(
            ToastType.ERROR,
            result.message || t("codeEditor.createFileFailed"),
          );
        }
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
        showToast(ToastType.SUCCESS, t("codeEditor.createSuccess"));
      } else {
        if (result.message && result.message.includes("file named")) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.fileFolderConflict", {
              type: t("codeEditor.newFolder"),
              conflict: t("codeEditor.newFile"),
              name: trimmedName,
            }),
          );
        } else if (
          result.message &&
          result.message.includes("already exists")
        ) {
          showToast(
            ToastType.WARNING,
            t("codeEditor.folderExists", { name: trimmedName }),
          );
        } else {
          showToast(
            ToastType.ERROR,
            result.message || t("codeEditor.createFolderFailed"),
          );
        }
        setEditingPath(currentPath);
        setEditParentPath(currentParentPath);
      }
    }
  };

  const handleEditBlur = () => {
    setTimeout(() => {
      if (isConfirmingRef.current || isCancelActionRef.current) {
        return;
      }
      if (editingPath) {
        autoSaveEdit();
      }
    }, 200);
  };

  const startEditing = (
    type: "rename" | "newfile" | "newfolder",
    path: string,
    initialValue: string,
  ) => {
    isConfirmingRef.current = false;
    isCancelActionRef.current = false;
    setEditingType(type);
    setEditingPath(path);
    setEditValue(initialValue);
    initialEditValueRef.current = initialValue;
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
    if (parentPath === workspacePath) {
      setFileTree((prev) => {
        const exists = prev.some(
          (child) => child.name === name && child.isDirectory === isDirectory,
        );
        if (exists) return prev;
        const newTree = [...prev, newNode].sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        return newTree;
      });
      if (workspacePath) {
        setExpandedPaths((prev) => new Set(prev).add(workspacePath));
      }
      return;
    }

    const addNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === parentPath) {
          const children = node.children || [];
          const exists = children.some(
            (child) => child.name === name && child.isDirectory === isDirectory,
          );
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
      ? t("codeEditor.deleteFolderConfirm", { name: node.name })
      : t("codeEditor.deleteFileConfirm", { name: node.name });
    showDialog(
      DialogType.WARNING,
      t("codeEditor.delete"),
      confirmMsg,
      async () => {
        const result = await codeEditorCommands.delete(node.path);
        if (result.success) {
          removeNode(node.path);
          showToast(ToastType.SUCCESS, t("codeEditor.deleteSuccess"));
        } else {
          showToast(
            ToastType.ERROR,
            result.message || t("codeEditor.deleteFailed"),
          );
        }
        closeContextMenu();
      },
      () => {
        closeContextMenu();
      },
      t("codeEditor.delete"),
      t("common.cancel"),
    );
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
            label: t("codeEditor.newFile"),
            action: () => handleNewFile(node),
          },
          {
            label: t("codeEditor.newFolder"),
            action: () => handleNewFolder(node),
          },
          {
            divider: true,
          },
          {
            label: t("codeEditor.openInExplorer"),
            action: () => handleOpenInExplorer(fullPath),
          },
          {
            label: t("codeEditor.openInTerminal"),
            action: () => handleOpenInTerminal(fullPath),
          },
          {
            divider: true,
          },
          {
            label: t("codeEditor.copyPath"),
            action: () => handleCopyPath(fullPath),
          },
        );
      } else {
        items.push(
          {
            label: t("codeEditor.newFile"),
            action: () => handleNewFile(node),
          },
          {
            label: t("codeEditor.newFolder"),
            action: () => handleNewFolder(node),
          },
          {
            divider: true,
          },
          {
            label: t("codeEditor.openInExplorer"),
            action: () => handleOpenInExplorer(fullPath),
          },
          {
            label: t("codeEditor.openInTerminal"),
            action: () => handleOpenInTerminal(fullPath),
          },
          {
            divider: true,
          },
          {
            label: t("codeEditor.cut"),
            action: () => handleCut(node),
          },
          {
            label: t("codeEditor.copy"),
            action: () => handleCopy(node),
          },
          {
            divider: true,
          },
          {
            label: t("codeEditor.copyPath"),
            action: () => handleCopyPath(fullPath),
          },
          {
            divider: true,
          },
          {
            label: t("codeEditor.rename"),
            action: () => startRename(node),
          },
          {
            label: t("codeEditor.delete"),
            action: () => handleDelete(node),
          },
        );
      }
    } else {
      items.push(
        {
          label: t("codeEditor.openInExplorer"),
          action: () => handleOpenInExplorer(fullPath),
        },
        {
          label: t("codeEditor.openInTerminal"),
          action: () => handleOpenInTerminal(fullPath),
        },
        {
          divider: true,
        },
        {
          label: t("codeEditor.cut"),
          action: () => handleCut(node),
        },
        {
          label: t("codeEditor.copy"),
          action: () => handleCopy(node),
        },
        {
          divider: true,
        },
        {
          label: t("codeEditor.copyPath"),
          action: () => handleCopyPath(fullPath),
        },
        {
          divider: true,
        },
        {
          label: t("codeEditor.rename"),
          action: () => startRename(node),
        },
        {
          label: t("codeEditor.delete"),
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
                  onBlur={handleEditBlur}
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
            {isExpanded && (
              <div>
                {node.children && node.children.length > 0 && (
                  <div>
                    {renderFileTreeWithNewItem(node.children, level + 1)}
                  </div>
                )}
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
                      onBlur={handleEditBlur}
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
                  onBlur={handleEditBlur}
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

  const renderEmptyStateWithNewItem = () => {
    const isEditingRoot = isEditingNewInParent(workspacePath || "");
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
          ? t("codeEditor.noSearchResults")
          : t("codeEditor.emptyDirectory")}

        {isEditingRoot && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              marginTop: "8px",
              borderRadius: "4px",
              background: "var(--hover-bg)",
              justifyContent: "center",
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
              onBlur={handleEditBlur}
              style={{
                flex: 1,
                maxWidth: "300px",
                background: "var(--bg-primary)",
                border: "1px solid var(--accent-color)",
                borderRadius: "3px",
                color: "var(--text-primary)",
                fontSize: "13px",
                padding: "2px 6px",
                outline: "none",
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

  const isEditingRootNewItem = () => {
    return isEditingNewInParent(workspacePath || "");
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
        {t("codeEditor.loading")}
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
        {t("codeEditor.noWorkspace")}
      </div>
    );
  }

  if (filteredTree.length === 0) {
    return renderEmptyStateWithNewItem();
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

      {isEditingRootNewItem() && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            paddingLeft: "8px",
            marginTop: "4px",
            borderRadius: "4px",
            background: "var(--hover-bg)",
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
            onBlur={handleEditBlur}
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
