import React, { useState, useEffect, useRef, useCallback } from "react";
import * as monaco from "monaco-editor";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { showToast, ToastType } from "../../../components/Toast";
import { useCodeEditorKeyboard } from "./hooks/useCodeEditorKeyboard";
import { TabContextMenu, TabContextMenuItemType } from "./TabContextMenu";
import { codeEditorCommands } from "../../../command/CodeEditor";
import { showDialog, DialogType } from "../../../components/Dialog";

interface CodeEditProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  selectedFile: string | null;
  workspacePath?: string | null;
}

interface TabItem {
  path: string;
  name: string;
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
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [tabContextMenu, setTabContextMenu] = useState<{
    x: number;
    y: number;
    tabPath: string;
    tabIndex: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const originalContentRef = useRef<Map<string, string>>(new Map());
  const savingRef = useRef<Set<string>>(new Set());
  const ensureStatusDir = useCallback(async () => {
    if (!workspacePath) return;
    await codeEditorCommands.ensureStatusDir(workspacePath);
  }, [workspacePath]);
  const readFromStatus = useCallback(
    async (filePath: string): Promise<string | null> => {
      if (!workspacePath) return null;
      return await codeEditorCommands.readFromStatus(workspacePath, filePath);
    },
    [workspacePath],
  );
  const writeToStatus = useCallback(
    async (filePath: string, content: string) => {
      if (!workspacePath) return;
      await codeEditorCommands.writeToStatus(workspacePath, filePath, content);
    },
    [workspacePath],
  );
  const deleteFromStatus = useCallback(
    async (filePath: string) => {
      if (!workspacePath) return;
      await codeEditorCommands.deleteFromStatus(workspacePath, filePath);
    },
    [workspacePath],
  );
  const checkStatusExists = useCallback(
    async (filePath: string): Promise<boolean> => {
      if (!workspacePath) return false;
      return await codeEditorCommands.checkStatusExists(
        workspacePath,
        filePath,
      );
    },
    [workspacePath],
  );
  const copyFileToStatus = useCallback(
    async (filePath: string) => {
      if (!workspacePath) return;
      await codeEditorCommands.copyFileToStatus(workspacePath, filePath);
    },
    [workspacePath],
  );
  const compareStatusWithOriginal = useCallback(
    async (filePath: string): Promise<boolean> => {
      if (!workspacePath) return false;
      return await codeEditorCommands.compareStatusWithOriginal(
        workspacePath,
        filePath,
      );
    },
    [workspacePath],
  );

  const handleSave = useCallback(async () => {
    if (!activeTab || !workspacePath) {
      showToast(
        ToastType.WARNING,
        t("codeEditor.noFileToSave") || "No file to save",
      );
      return;
    }
    if (savingRef.current.has(activeTab)) {
      return;
    }
    savingRef.current.add(activeTab);
    try {
      const content = editorRef.current?.getValue() || "";
      const result = await codeEditorCommands.writeFile(activeTab, content);
      if (result.success) {
        originalContentRef.current.set(activeTab, content);
        setTabs((prev) =>
          prev.map((tab) =>
            tab.path === activeTab ? { ...tab, isDirty: false } : tab,
          ),
        );
        showToast(
          ToastType.SUCCESS,
          t("codeEditor.saveSuccess") || "File saved",
        );

        window.dispatchEvent(
          new CustomEvent("file-saved", {
            detail: { path: activeTab, content },
          }),
        );
      } else {
        showToast(
          ToastType.ERROR,
          result.message || t("codeEditor.saveFailed") || "Failed to save",
        );
      }
    } catch (error) {
      console.error("Save error:", error);
      showToast(
        ToastType.ERROR,
        t("codeEditor.saveFailed") || `Failed to save: ${error}`,
      );
    } finally {
      savingRef.current.delete(activeTab);
    }
  }, [activeTab, workspacePath, t]);

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

  const addTab = async (path: string) => {
    if (!path || !workspacePath) return;
    setTabs((prev) => {
      const exists = prev.some((tab) => tab.path === path);
      if (exists) {
        setActiveTab(path);
        return prev;
      }
      return [
        ...prev,
        { path, name: path.split(/[\\/]/).pop() || path, isDirty: false },
      ];
    });
    await loadFileContent(path);
  };

  const loadFileContent = async (filePath: string) => {
    if (!filePath || !workspacePath) return;
    setLoadingContent(true);
    setIsEditing(true);
    try {
      const statusExists = await checkStatusExists(filePath);
      let content: string;
      let isDirty = false;
      if (statusExists) {
        const statusContent = await readFromStatus(filePath);
        if (statusContent !== null) {
          content = statusContent;
          const isSame = await compareStatusWithOriginal(filePath);
          isDirty = !isSame;
        } else {
          content = await readTextFile(filePath);
          await copyFileToStatus(filePath);
          isDirty = false;
        }
      } else {
        content = await readTextFile(filePath);
        await copyFileToStatus(filePath);
        isDirty = false;
      }
      if (isMountedRef.current) {
        originalContentRef.current.set(filePath, content);
        setCode(content);
        if (editorRef.current) {
          editorRef.current.setValue(content);
          const model = editorRef.current.getModel();
          if (model) {
            const lang = getFileLanguage(filePath);
            monaco.editor.setModelLanguage(model, lang);
          }
        }
        setTabs((prev) =>
          prev.map((tab) =>
            tab.path === filePath ? { ...tab, isDirty } : tab,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to load file:", error);
      const errorMsg = `Failed to load file: ${error}`;
      if (isMountedRef.current) {
        setCode(errorMsg);
        if (editorRef.current) {
          editorRef.current.setValue(errorMsg);
        }
      }
      showToast(ToastType.ERROR, t("file.readError") || "Failed to read file");
    } finally {
      setLoadingContent(false);
      setIsEditing(false);
    }
  };

  const closeTab = async (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!path || tabs.length === 0 || !workspacePath) return;
    const tab = tabs.find((t) => t.path === path);
    if (!tab) return;
    if (tab.isDirty) {
      const fileName = path.split(/[\\/]/).pop() || path;
      const result = await new Promise<"save" | "cancel">((resolve) => {
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
        );
      });
      if (result === "cancel") {
        return;
      }
      const content =
        originalContentRef.current.get(path) ||
        editorRef.current?.getValue() ||
        "";
      await codeEditorCommands.writeFile(path, content);
      await deleteFromStatus(path);
      originalContentRef.current.delete(path);
    } else {
      await deleteFromStatus(path);
      originalContentRef.current.delete(path);
    }
    const newTabs = tabs.filter((tab) => tab.path !== path);
    setTabs(newTabs);
    if (activeTab === path) {
      if (newTabs.length > 0) {
        const currentIndex = tabs.findIndex((tab) => tab.path === path);
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = Math.min(safeIndex, newTabs.length - 1);
        const nextPath = newTabs[nextIndex]?.path;
        if (nextPath) {
          setActiveTab(nextPath);
          await loadFileContent(nextPath);
        } else {
          const fallbackPath = newTabs[0]?.path;
          if (fallbackPath) {
            setActiveTab(fallbackPath);
            await loadFileContent(fallbackPath);
          } else {
            setActiveTab(null);
            setCode("");
            if (editorRef.current) {
              editorRef.current.setValue("");
            }
          }
        }
      } else {
        setActiveTab(null);
        setCode("");
        if (editorRef.current) {
          editorRef.current.setValue("");
        }
      }
    }
  };

  const closeAllTabs = async () => {
    if (tabs.length === 0) return;
    const tabPaths = tabs.map((t) => t.path);
    for (const path of tabPaths) {
      const stillExists = tabs.some((t) => t.path === path);
      if (stillExists) {
        await closeTab(path);
      }
    }
  };

  const closeOtherTabs = async (path: string) => {
    const tabsToClose = tabs.filter((t) => t.path !== path);
    for (const tab of tabsToClose) {
      const stillExists = tabs.some((t) => t.path === tab.path);
      if (stillExists) {
        await closeTab(tab.path);
      }
    }
  };

  const closeTabsToRight = async (path: string) => {
    const index = tabs.findIndex((t) => t.path === path);
    if (index === -1) return;
    const tabsToClose = tabs.slice(index + 1);
    for (const tab of tabsToClose) {
      const stillExists = tabs.some((t) => t.path === tab.path);
      if (stillExists) {
        await closeTab(tab.path);
      }
    }
  };

  const getTabContextMenuItems = (
    tabPath: string,
  ): TabContextMenuItemType[] => {
    const tabIndex = tabs.findIndex((tab) => tab.path === tabPath);
    const isLastTab = tabIndex === tabs.length - 1;
    const isOnlyTab = tabs.length === 1;
    return [
      {
        label: t("codeEditor.close") || "关闭",
        action: () => closeTab(tabPath),
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
              action: () => closeOtherTabs(tabPath),
            },
            ...(isLastTab
              ? []
              : [
                  {
                    label: t("codeEditor.closeToRight") || "关闭右侧",
                    action: () => closeTabsToRight(tabPath),
                  },
                ]),
          ]),
    ];
  };

  const handleTabContextMenu = (
    e: React.MouseEvent,
    tabPath: string,
    tabIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setTabContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabPath,
      tabIndex,
    });
  };

  const closeTabContextMenu = () => {
    setTabContextMenu(null);
  };


  useEffect(() => {
    if (selectedFile && workspacePath) {
      addTab(selectedFile);
    }
  }, [selectedFile, workspacePath]);


  useEffect(() => {
    if (activeTab) {
      loadFileContent(activeTab);
    }
  }, [activeTab]);


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
    editor.onDidChangeModelContent(() => {
      if (isMountedRef.current && activeTab && workspacePath) {
        const value = editor?.getValue() || "";
        setCode(value);
        const original = originalContentRef.current.get(activeTab) || "";
        const isDirty = value !== original;
        setTabs((prev) =>
          prev.map((tab) =>
            tab.path === activeTab ? { ...tab, isDirty } : tab,
          ),
        );
        if (isDirty) {
          writeToStatus(activeTab, value);
        }
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


  useEffect(() => {
    if (editorRef.current) {
      try {
        monaco.editor.setTheme(theme);
      } catch (e) {}
    }
  }, [theme]);


  useEffect(() => {
    if (editorRef.current && activeTab) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== code) {
        editorRef.current.setValue(code);
        const model = editorRef.current.getModel();
        if (model) {
          const lang = getFileLanguage(activeTab);
          monaco.editor.setModelLanguage(model, lang);
        }
      }
    }
  }, [code, activeTab]);


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
    if (!activeTab) return [];
    const parts = activeTab.split(/[\\/]/).filter(Boolean);
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
            const isActive = activeTab === tab.path;
            return (
              <div
                key={tab.path}
                onClick={() => {
                  setActiveTab(tab.path);
                }}
                onContextMenu={(e) => handleTabContextMenu(e, tab.path, index)}
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
                  onClick={(e) => closeTab(tab.path, e)}
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
          items={getTabContextMenuItems(tabContextMenu.tabPath)}
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
