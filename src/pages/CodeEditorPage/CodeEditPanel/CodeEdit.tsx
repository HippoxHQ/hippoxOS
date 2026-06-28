import React, { useState, useEffect, useRef, useCallback } from "react";
import * as monaco from "monaco-editor";
import { readTextFile, exists } from "@tauri-apps/plugin-fs";
import { showToast, ToastType } from "../../../components/Toast";
import { useCodeEditorKeyboard } from "./hooks/useCodeEditorKeyboard";
import { TabContextMenu, TabContextMenuItemType } from "./TabContextMenu";
import {
  codeEditorCommands,
  TabFileMetadata,
  WorkspaceMetadata,
} from "../../../command/CodeEditor";
import { showDialog, DialogType } from "../../../components/Dialog";

interface CodeEditProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  selectedFile: string | null;
  workspacePath?: string | null;
  onTabChange?: (filePath: string | null) => void;
}

interface TabItem {
  id: string;
  source_path: string;
  name: string;
  tmp_path: string;
  isDirty: boolean;
}

const getFileLanguage = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "cpp",
    hpp: "cpp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    vue: "vue",
    svelte: "svelte",
    zig: "zig",
  };
  return map[ext] || "plaintext";
};

const getFileIcon = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const icons: Record<string, string> = {
    ts: "📘",
    tsx: "📘",
    js: "📜",
    jsx: "📜",
    py: "🐍",
    rs: "🦀",
    go: "🐹",
    java: "☕",
    cpp: "⚙️",
    c: "⚙️",
    html: "🌐",
    css: "🎨",
    json: "📋",
    md: "📝",
    xml: "📄",
    yaml: "📄",
    yml: "📄",
    toml: "📄",
    sh: "📟",
    bash: "📟",
    sql: "🗄️",
    php: "🐘",
    rb: "💎",
    swift: "🦅",
    kt: "📱",
    vue: "🟢",
    svelte: "🟠",
    zig: "⚡",
  };
  return icons[ext] || "📄";
};

const CodeEdit: React.FC<CodeEditProps> = ({
  t,
  selectedFile,
  workspacePath,
  onTabChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [code, setCode] = useState<string>("");
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const isMountedRef = useRef(true);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(20);
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [tabContextMenu, setTabContextMenu] = useState<{
    x: number;
    y: number;
    tabPath: string;
    tabIndex: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const savingRef = useRef<Set<string>>(new Set());
  const tabsRef = useRef<TabItem[]>(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const activeTabRef = useRef<string | null>(null);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalUpdateRef = useRef(false);
  const lastNotifiedPathRef = useRef<string | null>(null);
  const currentWorkspaceRef = useRef<string | null>(null);
  const isAddingRef = useRef(false);

  const loadMetadata =
    useCallback(async (): Promise<WorkspaceMetadata | null> => {
      if (!workspacePath) return null;
      return await codeEditorCommands.loadMetadata(workspacePath);
    }, [workspacePath]);
  const saveMetadata = useCallback(
    async (metadata: WorkspaceMetadata) => {
      if (!workspacePath) return;
      await codeEditorCommands.saveMetadata(workspacePath, metadata);
    },
    [workspacePath],
  );
  const ensureTmpDir = useCallback(async () => {
    if (!workspacePath) return;
    await codeEditorCommands.ensureTmpDir(workspacePath);
  }, [workspacePath]);
  const readFromTmp = useCallback(
    async (tmpPath: string): Promise<string | null> => {
      if (!workspacePath) return null;
      return await codeEditorCommands.readFromTmp(workspacePath, tmpPath);
    },
    [workspacePath],
  );
  const writeToTmp = useCallback(
    async (tmpPath: string, content: string) => {
      if (!workspacePath) return;
      await codeEditorCommands.writeToTmp(workspacePath, tmpPath, content);
    },
    [workspacePath],
  );
  const deleteFromTmp = useCallback(
    async (tmpPath: string) => {
      if (!workspacePath) return;
      await codeEditorCommands.deleteFromTmp(workspacePath, tmpPath);
    },
    [workspacePath],
  );
  const copyToTmp = useCallback(
    async (sourcePath: string, tmpPath: string) => {
      if (!workspacePath) return;
      await codeEditorCommands.copyToTmp(workspacePath, sourcePath, tmpPath);
    },
    [workspacePath],
  );
  const compareTmpWithSource = useCallback(
    async (sourcePath: string, tmpPath: string): Promise<boolean> => {
      if (!workspacePath) return false;
      return await codeEditorCommands.compareTmpWithSource(
        workspacePath,
        sourcePath,
        tmpPath,
      );
    },
    [workspacePath],
  );
  const generateTmpName = useCallback(async (): Promise<string> => {
    return await codeEditorCommands.generateTmpName("");
  }, []);
  const handleSave = useCallback(async () => {
    if (!activeTab || !workspacePath) {
      showToast(
        ToastType.WARNING,
        t("codeEditor.noFileToSave") || "No file to save",
      );
      return;
    }
    const tab = tabs.find((t) => t.id === activeTab);
    if (!tab) return;
    if (savingRef.current.has(activeTab)) {
      return;
    }
    savingRef.current.add(activeTab);
    try {
      const content = editorRef.current?.getValue() || "";
      const result = await codeEditorCommands.writeFile(
        tab.source_path,
        content,
      );
      if (result.success) {
        const metadata = await loadMetadata();
        if (metadata) {
          for (const file of metadata.tabs.files) {
            if (file.id === tab.id) {
              file.is_dirty = false;
              file.last_modified = new Date().toISOString();
              break;
            }
          }
          await saveMetadata(metadata);
        }
        setTabs((prev) =>
          prev.map((t) => (t.id === tab.id ? { ...t, isDirty: false } : t)),
        );
        showToast(
          ToastType.SUCCESS,
          t("codeEditor.saveSuccess") || "File saved",
        );
        window.dispatchEvent(
          new CustomEvent("file-saved", {
            detail: { path: tab.source_path, content },
          }),
        );
      } else {
        showToast(
          ToastType.ERROR,
          result.message || t("codeEditor.saveFailed") || "Failed to save",
        );
      }
    } catch (error) {
      showToast(
        ToastType.ERROR,
        t("codeEditor.saveFailed") || `Failed to save: ${error}`,
      );
    } finally {
      savingRef.current.delete(activeTab);
    }
  }, [activeTab, workspacePath, tabs, loadMetadata, saveMetadata, t]);

  const handleCopy = useCallback(() => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = editorRef.current.getModel()?.getValueInRange(selection);
        if (text) {
          navigator.clipboard.writeText(text);
          showToast(ToastType.SUCCESS, t("codeEditor.copied") || "Copied");
          return;
        }
      }
      const model = editorRef.current.getModel();
      if (model) {
        const fullText = model.getValue();
        navigator.clipboard.writeText(fullText);
        showToast(ToastType.SUCCESS, t("codeEditor.copied") || "Copied");
      }
    }
  }, [t]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (editorRef.current && text) {
        editorRef.current.trigger("keyboard", "paste", {
          text: text,
        });
        showToast(ToastType.SUCCESS, t("codeEditor.pasted") || "Pasted");
      }
    } catch (error) {
      showToast(
        ToastType.ERROR,
        t("codeEditor.pasteFailed") || "Failed to paste",
      );
    }
  }, [t]);

  useCodeEditorKeyboard({
    onCopy: handleCopy,
    onPaste: handlePaste,
    onSave: handleSave,
    isEditing: isEditing,
    editorRef: editorRef,
  });

  const loadTabContent = useCallback(
    async (tabId: string, tmpPath: string, sourcePath: string) => {
      if (!workspacePath) return;
      setLoadingContent(true);
      setIsEditing(true);
      isFirstLoadRef.current = true;
      try {
        const content = await readFromTmp(tmpPath);
        if (content !== null && content !== undefined) {
          setCode(content);
          if (editorRef.current) {
            editorRef.current.setValue(content);
            const model = editorRef.current.getModel();
            if (model) {
              const lang = getFileLanguage(sourcePath);
              monaco.editor.setModelLanguage(model, lang);
            }
          }
        } else {
          const sourceContent = await readTextFile(sourcePath);
          setCode(sourceContent);
          if (editorRef.current) {
            editorRef.current.setValue(sourceContent);
            const model = editorRef.current.getModel();
            if (model) {
              const lang = getFileLanguage(sourcePath);
              monaco.editor.setModelLanguage(model, lang);
            }
          }
          await writeToTmp(tmpPath, sourceContent);
        }
      } catch (error) {
        showToast(
          ToastType.ERROR,
          t("file.readError") || "Failed to read file",
        );
      } finally {
        setLoadingContent(false);
        setIsEditing(false);
        isFirstLoadRef.current = false;
      }
    },
    [workspacePath, readFromTmp, writeToTmp, t],
  );

  const addTab = useCallback(
    async (sourcePath: string) => {
      if (!sourcePath || !workspacePath) return;
      const existing = tabs.find((t) => t.source_path === sourcePath);
      if (existing) {
        if (existing.id !== activeTab) {
          setActiveTab(existing.id);
          lastNotifiedPathRef.current = sourcePath;
          onTabChange?.(sourcePath);
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
        }
        return;
      }
      const tmpName = await generateTmpName();
      let content: string;
      try {
        content = await readTextFile(sourcePath);
        await copyToTmp(sourcePath, tmpName);
      } catch (error) {
        showToast(
          ToastType.ERROR,
          t("file.readError") || "Failed to read file",
        );
        return;
      }
      const newTab: TabItem = {
        id: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        source_path: sourcePath,
        name: sourcePath.split(/[\\/]/).pop() || sourcePath,
        tmp_path: tmpName,
        isDirty: false,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTab(newTab.id);
      isInternalUpdateRef.current = true;
      lastNotifiedPathRef.current = sourcePath;
      onTabChange?.(sourcePath);
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 100);
      const metadata = await loadMetadata();
      if (metadata) {
        const tabMetadata: TabFileMetadata = {
          id: newTab.id,
          source_path: sourcePath,
          is_dirty: false,
          last_modified: new Date().toISOString(),
          tmp_path: tmpName,
        };
        metadata.tabs.files.push(tabMetadata);
        await saveMetadata(metadata);
      } else {
        const newMetadata: WorkspaceMetadata = {
          version: "1.0.0",
          workspace: {
            path: workspacePath,
            name: workspacePath.split(/[\\/]/).pop() || "Workspace",
            created_at: new Date().toISOString(),
            last_opened: new Date().toISOString(),
          },
          tabs: {
            files: [
              {
                id: newTab.id,
                source_path: sourcePath,
                is_dirty: false,
                last_modified: new Date().toISOString(),
                tmp_path: tmpName,
              },
            ],
          },
        };
        await saveMetadata(newMetadata);
      }
      await loadTabContent(newTab.id, newTab.tmp_path, newTab.source_path);
    },
    [
      tabs,
      workspacePath,
      activeTab,
      onTabChange,
      generateTmpName,
      copyToTmp,
      loadMetadata,
      saveMetadata,
      loadTabContent,
      t,
    ],
  );

  const closeTab = useCallback(
    async (
      tabId: string,
      e?: React.MouseEvent,
      options?: { skipSwitch?: boolean },
    ): Promise<"save" | "cancel" | "skip" | undefined> => {
      e?.stopPropagation();
      const currentTabs = tabsRef.current;
      const currentActiveTab = activeTabRef.current;
      if (!tabId || currentTabs.length === 0 || !workspacePath)
        return undefined;
      const tab = currentTabs.find((t) => t.id === tabId);
      if (!tab) return undefined;
      if (tab.isDirty) {
        const fileName = tab.name;
        const result = await new Promise<"save" | "cancel" | "skip">(
          (resolve) => {
            showDialog(
              DialogType.WARNING,
              t("codeEditor.unsavedChanges") || "Unsaved Changes",
              t("codeEditor.saveBeforeClose", { name: fileName }) ||
                `"${fileName}" has unsaved changes. Save before closing?`,
              () => {
                resolve("save");
              },
              () => {
                resolve("cancel");
              },
              t("codeEditor.save") || "Save",
              t("common.cancel") || "Cancel",
              t("codeEditor.skip") || "Skip",
              () => {
                resolve("skip");
              },
            );
          },
        );
        if (result === "cancel") {
          return "cancel";
        }
        if (result === "save") {
          const content = await readFromTmp(tab.tmp_path);
          if (content !== null && content !== undefined) {
            await codeEditorCommands.writeFile(tab.source_path, content);
          }
          const metadata = await loadMetadata();
          if (metadata) {
            for (const file of metadata.tabs.files) {
              if (file.id === tabId) {
                file.is_dirty = false;
                file.last_modified = new Date().toISOString();
                break;
              }
            }
            await saveMetadata(metadata);
          }
          setTabs((prev) =>
            prev.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t)),
          );
        }
      }
      await deleteFromTmp(tab.tmp_path);
      const metadata = await loadMetadata();
      if (metadata) {
        metadata.tabs.files = metadata.tabs.files.filter((f) => f.id !== tabId);
        await saveMetadata(metadata);
      }
      const newTabs = currentTabs.filter((t) => t.id !== tabId);
      setTabs(newTabs);
      if (!options?.skipSwitch && currentActiveTab === tabId) {
        if (newTabs.length > 0) {
          const currentIndex = currentTabs.findIndex((t) => t.id === tabId);
          const safeIndex = currentIndex >= 0 ? currentIndex : 0;
          const nextIndex = Math.min(safeIndex, newTabs.length - 1);
          const nextTab = newTabs[nextIndex];
          if (nextTab) {
            setActiveTab(nextTab.id);
            isInternalUpdateRef.current = true;
            lastNotifiedPathRef.current = nextTab.source_path;
            onTabChange?.(nextTab.source_path);
            setTimeout(() => {
              isInternalUpdateRef.current = false;
            }, 100);
            await loadTabContent(
              nextTab.id,
              nextTab.tmp_path,
              nextTab.source_path,
            );
          }
        } else {
          setActiveTab(null);
          setCode("");
          if (editorRef.current) {
            editorRef.current.setValue("");
          }
          isInternalUpdateRef.current = true;
          lastNotifiedPathRef.current = null;
          onTabChange?.(null);
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
        }
      } else if (options?.skipSwitch && currentActiveTab === tabId) {
        if (newTabs.length > 0) {
          const nextTab = newTabs[0];
          setActiveTab(nextTab.id);
          isInternalUpdateRef.current = true;
          lastNotifiedPathRef.current = nextTab.source_path;
          onTabChange?.(nextTab.source_path);
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
        } else {
          setActiveTab(null);
          setCode("");
          if (editorRef.current) {
            editorRef.current.setValue("");
          }
          isInternalUpdateRef.current = true;
          lastNotifiedPathRef.current = null;
          onTabChange?.(null);
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
        }
      }
      return undefined;
    },
    [
      workspacePath,
      onTabChange,
      loadMetadata,
      saveMetadata,
      deleteFromTmp,
      readFromTmp,
      loadTabContent,
      t,
    ],
  );

  const closeOtherTabs = useCallback(
    async (tabId: string) => {
      let currentTabs = tabsRef.current;
      const keepTabId = tabId;
      while (true) {
        currentTabs = tabsRef.current;
        const tabsToClose = currentTabs.filter((t) => t.id !== keepTabId);
        if (tabsToClose.length === 0) break;
        const result = await closeTab(tabsToClose[0].id, undefined, {
          skipSwitch: true,
        });
        if (result === "cancel") break;
      }
    },
    [closeTab],
  );

  const closeTabsToRight = useCallback(
    async (tabId: string) => {
      while (true) {
        const currentTabs = tabsRef.current;
        const index = currentTabs.findIndex((t) => t.id === tabId);
        if (index === -1 || index === currentTabs.length - 1) break;

        const tabsToClose = currentTabs.slice(index + 1);
        if (tabsToClose.length === 0) break;

        const result = await closeTab(tabsToClose[0].id, undefined, {
          skipSwitch: true,
        });
        if (result === "cancel") break;
      }
    },
    [closeTab],
  );

  const closeAllTabs = useCallback(async () => {
    while (true) {
      const currentTabs = tabsRef.current;
      if (currentTabs.length === 0) break;

      const result = await closeTab(currentTabs[0].id, undefined, {
        skipSwitch: true,
      });
      if (result === "cancel") break;
    }
  }, [closeTab]);

  const getTabContextMenuItems = (tabId: string): TabContextMenuItemType[] => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const isLastTab = tabIndex === tabs.length - 1;
    const isOnlyTab = tabs.length === 1;

    return [
      {
        label: t("codeEditor.close") || "关闭",
        action: () => closeTab(tabId),
      },
      {
        label: t("codeEditor.closeAll") || "关闭全部",
        action: closeAllTabs,
      },
      ...(isOnlyTab
        ? []
        : [
            {
              divider: true as const,
            },
            {
              label: t("codeEditor.closeOthers") || "关闭其他",
              action: () => closeOtherTabs(tabId),
            },
            ...(isLastTab
              ? []
              : [
                  {
                    label: t("codeEditor.closeToRight") || "关闭右侧",
                    action: () => closeTabsToRight(tabId),
                  },
                ]),
          ]),
    ];
  };

  const handleTabContextMenu = (
    e: React.MouseEvent,
    tabId: string,
    tabIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      setTabContextMenu({
        x: e.clientX,
        y: e.clientY,
        tabPath: tab.source_path,
        tabIndex,
      });
    }
  };

  const closeTabContextMenu = () => {
    setTabContextMenu(null);
  };

  const restoreTabsFromMetadata = useCallback(async () => {
    if (!workspacePath) return;

    await ensureTmpDir();

    const metadata = await loadMetadata();
    if (!metadata || metadata.tabs.files.length === 0) {
      return;
    }

    await codeEditorCommands.cleanupOrphanedTmp(workspacePath);

    const restoredTabs: TabItem[] = [];
    for (const file of metadata.tabs.files) {
      const sourceExists = await exists(file.source_path);
      if (!sourceExists) {
        await deleteFromTmp(file.tmp_path);
        continue;
      }

      restoredTabs.push({
        id: file.id,
        source_path: file.source_path,
        name: file.source_path.split(/[\\/]/).pop() || file.source_path,
        tmp_path: file.tmp_path,
        isDirty: file.is_dirty,
      });
    }

    if (restoredTabs.length > 0) {
      setTabs(restoredTabs);
      setActiveTab(restoredTabs[0].id);
      isInternalUpdateRef.current = true;
      lastNotifiedPathRef.current = restoredTabs[0].source_path;
      onTabChange?.(restoredTabs[0].source_path);
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 100);
      await loadTabContent(
        restoredTabs[0].id,
        restoredTabs[0].tmp_path,
        restoredTabs[0].source_path,
      );
    }
  }, [
    workspacePath,
    ensureTmpDir,
    loadMetadata,
    deleteFromTmp,
    loadTabContent,
    onTabChange,
  ]);

  useEffect(() => {
    if (!workspacePath) {
      setTabs([]);
      setActiveTab(null);
      setCode("");
      if (editorRef.current) {
        editorRef.current.setValue("");
      }
      return;
    }
    setTabs([]);
    setActiveTab(null);
    setCode("");
    if (editorRef.current) {
      editorRef.current.setValue("");
    }
    restoreTabsFromMetadata();
  }, [workspacePath]);

  useEffect(() => {
    if (isInternalUpdateRef.current) {
      return;
    }
    if (lastNotifiedPathRef.current === selectedFile) {
      return;
    }
    if (selectedFile && workspacePath) {
      const existingTab = tabs.find((t) => t.source_path === selectedFile);
      if (!existingTab) {
        if (isAddingRef.current) return;
        isAddingRef.current = true;
        addTab(selectedFile).finally(() => {
          isAddingRef.current = false;
        });
      } else {
        if (existingTab.id !== activeTab) {
          if (activeTab) {
            const currentTab = tabs.find((t) => t.id === activeTab);
            if (currentTab && editorRef.current) {
              const content = editorRef.current.getValue() || "";
              writeToTmp(currentTab.tmp_path, content).catch(() => {});
            }
          }
          setActiveTab(existingTab.id);
          isInternalUpdateRef.current = true;
          lastNotifiedPathRef.current = selectedFile;
          onTabChange?.(selectedFile);
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
          const loadContent = async () => {
            isFirstLoadRef.current = true;
            try {
              const content = await readFromTmp(existingTab.tmp_path);
              if (content !== null && content !== undefined) {
                setCode(content);
                if (editorRef.current) {
                  editorRef.current.setValue(content);
                  const model = editorRef.current.getModel();
                  if (model) {
                    const lang = getFileLanguage(existingTab.source_path);
                    monaco.editor.setModelLanguage(model, lang);
                  }
                }
              }
            } catch (error) {
              console.error("Failed to load tab content:", error);
            } finally {
              isFirstLoadRef.current = false;
            }
          };
          loadContent();
        }
      }
    }
  }, [selectedFile, workspacePath, tabs, activeTab, addTab, onTabChange]);

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (tabId === activeTab) return;
      if (activeTab) {
        const currentTab = tabs.find((t) => t.id === activeTab);
        if (currentTab && editorRef.current) {
          const content = editorRef.current.getValue() || "";
          writeToTmp(currentTab.tmp_path, content).catch(() => {});
        }
      }
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;
      setActiveTab(tabId);
      isInternalUpdateRef.current = true;
      lastNotifiedPathRef.current = tab.source_path;
      onTabChange?.(tab.source_path);
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 100);
      const loadContent = async () => {
        isFirstLoadRef.current = true;
        try {
          const content = await readFromTmp(tab.tmp_path);
          if (content !== null && content !== undefined) {
            setCode(content);
            if (editorRef.current) {
              editorRef.current.setValue(content);
              const model = editorRef.current.getModel();
              if (model) {
                const lang = getFileLanguage(tab.source_path);
                monaco.editor.setModelLanguage(model, lang);
              }
            }
          }
        } catch (error) {
          console.error("Failed to load tab content:", error);
        } finally {
          isFirstLoadRef.current = false;
        }
      };
      loadContent();
    },
    [activeTab, tabs, onTabChange, readFromTmp],
  );

  useEffect(() => {
    if (workspacePath) {
      restoreTabsFromMetadata();
    }
  }, [workspacePath]);

  // useEffect(() => {
  //   if (activeTab) {
  //     const tab = tabs.find((t) => t.id === activeTab);
  //     if (tab) {
  //       loadTabContent(tab.id, tab.tmp_path, tab.source_path);
  //     }
  //   }
  // }, [activeTab]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadTheme = () => {
      const savedTheme = localStorage.getItem("hippox-theme") as
        | "dark"
        | "light";
      setTheme(savedTheme === "light" ? "light" : "vs-dark");
    };
    loadTheme();
    const handleThemeChange = (e: CustomEvent) => {
      const newTheme = e.detail?.theme as "dark" | "light";
      if (newTheme) {
        setTheme(newTheme === "light" ? "light" : "vs-dark");
      }
    };
    window.addEventListener(
      "theme-changed",
      handleThemeChange as EventListener,
    );
    return () => {
      isMountedRef.current = false;
      window.removeEventListener(
        "theme-changed",
        handleThemeChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (editorRef.current) return;

    const content = activeTab ? code || "" : "";

    editorRef.current = monaco.editor.create(containerRef.current, {
      value: content,
      language: activeTab ? getFileLanguage(activeTab) : "plaintext",
      theme: theme,
      minimap: {
        enabled: true,
        showSlider: "mouseover",
      },
      fontSize: 14,
      tabSize: 2,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      lineNumbers: "on",
      automaticLayout: true,
      wordWrap: "on",
      formatOnPaste: true,
      formatOnType: true,
      scrollbar: {
        vertical: "visible",
        horizontal: "visible",
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
    });

    const editor = editorRef.current;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = editor.getModel()?.getValueInRange(selection);
        if (text) {
          navigator.clipboard.writeText(text);
          showToast(ToastType.SUCCESS, t("codeEditor.copied") || "Copied");
        }
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          editor.trigger("keyboard", "paste", {
            text: text,
          });
        }
      } catch (error) {
        editor.trigger("keyboard", "paste", undefined);
      }
    });

    const styleElement = document.createElement("style");
    styleElement.id = "minimap-divider-style";
    styleElement.textContent = `
      .monaco-editor .minimap {
        border-left: 1px solid rgba(128, 128, 128, 0.15) !important;
        box-shadow: -4px 0 8px rgba(0, 0, 0, 0.05) !important;
      }
      .monaco-editor .minimap .minimap-slider {
        opacity: 0.6 !important;
      }
      .monaco-editor .minimap .minimap-slider:hover {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(styleElement);
    return () => {
      const styleEl = document.getElementById("minimap-divider-style");
      if (styleEl) {
        styleEl.remove();
      }
      if (editorRef.current) {
        try {
          const model = editorRef.current.getModel();
          if (model) {
            model.dispose();
          }
          editorRef.current.dispose();
          editorRef.current = null;
        } catch (e) {}
      }
    };
  }, []);

  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const disposable = editor.onDidChangeModelContent(() => {
      const currentActiveTab = activeTabRef.current;
      if (isMountedRef.current && currentActiveTab && workspacePath) {
        if (isFirstLoadRef.current) {
          return;
        }
        const value = editor.getValue() || "";
        const currentTabs = tabsRef.current;
        const tab = currentTabs.find((t) => t.id === currentActiveTab);
        if (tab && tab.tmp_path) {
          writeToTmp(tab.tmp_path, value).catch((error) => {});
          if (!tab.isDirty) {
            setTabs((prev) =>
              prev.map((t) =>
                t.id === currentActiveTab ? { ...t, isDirty: true } : t,
              ),
            );
          }
        }
      }
    });
    return () => {
      disposable.dispose();
    };
  }, [workspacePath]);

  useEffect(() => {
    if (editorRef.current) {
      try {
        monaco.editor.setTheme(theme);
      } catch (e) {}
    }
  }, [theme]);

  const updateScrollbar = () => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) {
      setScrollPercentage(0);
      setThumbWidth(100);
    } else {
      setScrollPercentage(container.scrollLeft / maxScroll);
      const width = (container.clientWidth / container.scrollWidth) * 100;
      setThumbWidth(Math.max(10, width));
    }
  };

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", updateScrollbar);
    window.addEventListener("resize", updateScrollbar);
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(container);
    if (container && container.scrollWidth > 0 && container.clientWidth > 0) {
      setTimeout(updateScrollbar, 50);
    }
    return () => {
      container.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateScrollbar);
      observer.disconnect();
    };
  }, [tabs]);

  useEffect(() => {
    const scrollbar = scrollbarRef.current;
    if (!scrollbar) return;

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      const container = tabsContainerRef.current;
      if (!container) return;

      const target = e.target as HTMLElement;
      if (!target.classList.contains("scrollbar-thumb")) return;

      isDragging = true;
      startX = e.clientX;
      startScrollLeft = container.scrollLeft;
      document.body.style.cursor = "pointer";
      document.body.style.userSelect = "none";
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const container = tabsContainerRef.current;
      if (!container) return;
      const delta = e.clientX - startX;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const ratio = delta / container.clientWidth;
      container.scrollLeft = Math.max(
        0,
        Math.min(maxScroll, startScrollLeft + ratio * container.clientWidth),
      );
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    scrollbar.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      scrollbar.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [tabs]);

  const getCurrentBreadcrumbs = (): { name: string; path: string }[] => {
    const activeTabData = tabs.find((t) => t.id === activeTab);
    if (!activeTabData) return [];
    const parts = activeTabData.source_path.split(/[\\/]/).filter(Boolean);
    const result: { name: string; path: string }[] = [];
    let current = "";
    for (let i = 0; i < parts.length; i++) {
      current += "/" + parts[i];
      result.push({
        name: parts[i],
        path: current,
      });
    }
    return result;
  };
  const breadcrumbs = getCurrentBreadcrumbs();
  const showScrollbar = tabs.length > 0 && thumbWidth < 100;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
        overflow: "hidden",
        minWidth: 0,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
          minHeight: "40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          ref={tabsContainerRef}
          className="tabs-container"
          style={{
            display: "flex",
            alignItems: "center",
            overflowX: "auto",
            overflowY: "hidden",
            minWidth: 0,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            flex: 1,
            height: "40px",
          }}
          onWheel={(e) => {
            if (tabsContainerRef.current) {
              tabsContainerRef.current.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}
        >
          <style>
            {`
              .tabs-container::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-thumb:hover {
                background: var(--scrollbar-thumb-hover, var(--scrollbar-thumb)) !important;
              }
            `}
          </style>
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                onContextMenu={(e) => handleTabContextMenu(e, tab.id, index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0px 10px",
                  height: "40px",
                  cursor: "pointer",
                  background: isActive ? "var(--bg-primary)" : "transparent",
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  borderBottom: isActive
                    ? "2px solid var(--accent-color)"
                    : "2px solid transparent",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  minWidth: "60px",
                  maxWidth: "160px",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: "12px", flexShrink: 0 }}>
                  {getFileIcon(tab.name)}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100px",
                  }}
                >
                  {tab.name}
                  {tab.isDirty && (
                    <span
                      style={{
                        marginLeft: "4px",
                        color: "var(--accent-color)",
                        fontSize: "10px",
                      }}
                    >
                      ●
                    </span>
                  )}
                </span>
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  style={{
                    padding: "0 2px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "11px",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
          {loadingContent && (
            <div
              style={{
                padding: "0 12px",
                fontSize: "12px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  border: "2px solid var(--border-color)",
                  borderTop: "2px solid var(--accent-color)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              {t("common.loading") || "Loading..."}
            </div>
          )}
        </div>

        {showScrollbar && (
          <div
            ref={scrollbarRef}
            style={{
              height: "4px",
              width: "100%",
              position: "absolute",
              bottom: 0,
              left: 0,
              background: "transparent",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <div
              className="scrollbar-thumb"
              style={{
                height: "4px",
                width: `${thumbWidth}%`,
                minWidth: "10px",
                background: "var(--scrollbar-thumb)",
                position: "absolute",
                left: `${scrollPercentage * (100 - thumbWidth)}%`,
                top: 0,
                borderRadius: 0,
              }}
            />
          </div>
        )}
      </div>

      {activeTab && breadcrumbs.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "0px 12px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-tertiary)",
            flexShrink: 0,
            minHeight: "24px",
            fontSize: "11px",
            color: "var(--text-secondary)",
            overflow: "hidden",
            flexWrap: "nowrap",
          }}
        >
          <span style={{ fontSize: "11px", flexShrink: 0 }}>📂</span>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <span
                style={{
                  color:
                    index === breadcrumbs.length - 1
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                  fontWeight: index === breadcrumbs.length - 1 ? 500 : 400,
                  whiteSpace: "nowrap",
                  cursor:
                    index < breadcrumbs.length - 1 ? "pointer" : "default",
                }}
                onClick={() => {}}
                onMouseEnter={(e) => {
                  if (index < breadcrumbs.length - 1) {
                    e.currentTarget.style.color = "var(--accent-color)";
                    e.currentTarget.style.textDecoration = "underline";
                  }
                }}
                onMouseLeave={(e) => {
                  if (index < breadcrumbs.length - 1) {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.textDecoration = "none";
                  }
                }}
              >
                {crumb.name}
              </span>
              {index < breadcrumbs.length - 1 && (
                <span style={{ color: "var(--text-muted)", fontSize: "16px" }}>
                  ›
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: "100%",
          minWidth: 0,
          minHeight: "300px",
          position: "relative",
        }}
      />
      {tabContextMenu && (
        <TabContextMenu
          x={tabContextMenu.x}
          y={tabContextMenu.y}
          items={getTabContextMenuItems(
            tabs.find((t) => t.source_path === tabContextMenu.tabPath)?.id ||
              "",
          )}
          onClose={closeTabContextMenu}
        />
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CodeEdit;
