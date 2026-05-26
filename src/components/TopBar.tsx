import React, { useEffect, useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Theme, Language } from "../type";
import logo from "../assets/logo.png";
import {
  LayoutVerticalIcon,
  LayoutHorizontalIcon,
  ClearIcon,
  SearchIcon,
} from "../icons";
import { searchService } from "../api/search";

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  currentTheme: Theme;
  onToggleTheme: () => void;
  currentLanguage: Language;
  onToggleLanguage: () => void;
  t: (key: string) => string;
  layoutMode?: "horizontal" | "vertical";
  onLayoutModeChange?: (mode: "horizontal" | "vertical") => void;
}

interface SearchResult {
  category: "skill" | "session" | "log";
  id: string;
  title: string;
  description: string;
  path: string;
  timestamp?: string;
  highlight?: string | null;
}

interface SearchSuggestion {
  id: string;
  title: string;
  description: string;
  action: () => void;
  icon: string;
}

const topBarStyles = `
  .top-bar {
    height: 40px;
    background: var(--bg-topbar);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    flex-shrink: 0;
    position: relative;
    -webkit-app-region: drag;
    app-region: drag;
  }
  
  .top-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .sidebar-toggle {
    -webkit-app-region: no-drag;
    app-region: no-drag;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.15s ease;
  }
  
  .sidebar-toggle svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
    stroke-width: 1.75;
    fill: none;
  }
  
  .sidebar-toggle:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .app-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    -webkit-app-region: drag;
    app-region: drag;
  }
  
  .app-logo {
    -webkit-app-region: drag;
    app-region: drag;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .app-logo img {
    width: 22px;
    height: 22px;
    border-radius: 5px;
  }
  
  .app-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: -0.3px;
    -webkit-app-region: drag;
    app-region: drag;
  }
  
  .top-bar-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .search-hint {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: var(--bg-tertiary);
    border-radius: 100px;
    font-size: 12px;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: background 0.2s ease;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }
  
  .search-hint:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .search-hint kbd {
    font-size: 10px;
    background: var(--bg-secondary);
    padding: 2px 5px;
    border-radius: 5px;
    font-family: monospace;
    color: var(--text-secondary);
  }
  
  .top-bar-right {
    display: flex;
    align-items: center;
    gap: 4px;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 28px;
    padding: 0 8px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 450;
    color: var(--text-secondary);
    transition: all 0.15s ease;
  }
  
  .action-btn svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 1.75;
    fill: none;
  }
  
  .action-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .layout-divider {
    width: 1px;
    height: 40px;
    background: var(--border-color);
    margin: 0 4px;
  }
  
  .window-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: 8px;
    border-left: 1px solid var(--border-color);
    height: 40px;
  }
  
  .window-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 14px;
    transition: all 0.15s ease;
    position: relative;
    border-radius: 0;
  }
  
  .window-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .window-btn.close:hover {
    background: rgba(220, 38, 38, 0.12);
    color: #ef4444;
  }
  
  .theme-toggle {
    transition: transform 0.2s ease;
  }
  
  .theme-toggle:active {
    transform: scale(0.95);
  }
  
  .layout-btn {
    transition: all 0.15s ease;
  }
  
  .layout-btn.active {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .search-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.5);
    pointer-events: auto;
  }
  
  .search-dialog {
    position: fixed;
    width: 540px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    overflow: hidden;
    pointer-events: auto;
  }
  
  .search-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }
  
  .search-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
  
  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 13px;
    padding: 8px 0;
    line-height: 1.4;
  }
  
  .search-input::placeholder {
    color: var(--text-muted);
  }
  
  .search-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  
  .search-clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    border-radius: 4px;
    transition: all 0.15s ease;
  }
  
  .search-clear-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .search-clear-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .search-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 16px;
    border-radius: 4px;
    transition: all 0.15s ease;
  }
  
  .search-close:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .search-results {
    max-height: 340px;
    overflow-y: auto;
    background: var(--bg-primary);
  }
  
  .result-category-header {
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
    background: var(--bg-primary);
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .search-result-item {
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.1s ease;
    border-bottom: 1px solid var(--border-color);
  }
  
  .search-result-item:hover {
    background: var(--hover-bg);
  }
  
  .search-result-item.selected {
    background: var(--hover-bg);
  }
  
  .result-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 2px;
  }
  
  .result-description {
    font-size: 11px;
    color: var(--text-secondary);
    word-break: break-word;
    line-height: 1.3;
  }
  
  .result-time {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 2px;
  }
  
  .empty-results {
    padding: 24px;
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
  }
  
  .search-loading {
    padding: 24px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 12px;
  }

  .search-suggestions {
    padding: 6px 0;
  }
  
  .suggestions-header {
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }
  
  .suggestion-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    cursor: pointer;
    transition: background 0.1s ease;
  }
  
  .suggestion-item:hover {
    background: var(--hover-bg);
  }
  
  .suggestion-icon {
    font-size: 14px;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }
  
  .suggestion-content {
    flex: 1;
  }
  
  .suggestion-title {
    font-size: 13px;
    color: var(--text-primary);
  }
  
  .suggestion-description {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 1px;
  }
`;

if (typeof document !== "undefined") {
  const styleId = "topbar-styles-v3";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = topBarStyles;
    document.head.appendChild(style);
  }
}

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path
      d="M3 12h18M3 6h18M3 18h18"
      stroke="currentColor"
      strokeLinecap="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    width="23px"
    height="23px"
  >
    <path
      d="M6 18L18 6M6 6l12 12"
      stroke="currentColor"
      strokeLinecap="round"
    />
  </svg>
);

const CollapseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path
      d="M15 18l-6-6 6-6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    <path
      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      stroke="currentColor"
      strokeLinecap="round"
    />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path
      d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CATEGORY_CONFIG: Record<
  string,
  { zh: string; en: string; icon: string }
> = {
  skill: { zh: "技能市场", en: "Skills", icon: "🧩" },
  session: { zh: "历史会话", en: "Sessions", icon: "💬" },
  log: { zh: "日志记录", en: "Logs", icon: "📋" },
};

const TopBar: React.FC<TopBarProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
  currentTheme,
  onToggleTheme,
  currentLanguage,
  onToggleLanguage,
  t,
  layoutMode = "vertical",
  onLayoutModeChange,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [isInputFocused, setIsInputFocused] = useState(false);
  const searchDialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await invoke<boolean>("window_is_maximized");
        setIsMaximized(maximized);
      } catch (error) {
        console.error("Failed to check window state:", error);
      }
    };
    checkMaximized();
    const interval = setInterval(checkMaximized, 500);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = async () => {
    try {
      await invoke("window_minimize");
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };

  const handleMaximize = async () => {
    try {
      await invoke("window_maximize");
      const maximized = await invoke<boolean>("window_is_maximized");
      setIsMaximized(maximized);
    } catch (error) {
      console.error("Failed to maximize/unmaximize:", error);
    }
  };

  const handleClose = async () => {
    try {
      await invoke("window_close");
    } catch (error) {
      console.error("Failed to close:", error);
    }
  };

  const performSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setIsSearchLoading(false);
      return;
    }
    setIsSearchLoading(true);
    try {
      const results = await searchService.search(keyword, 30);
      setSearchResults(results);
      setSelectedIndex(results.length > 0 ? 0 : -1);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearchOpen) return;
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    setSearchTimeout(timeout);
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery, isSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
        return;
      }
      if (e.key === "Escape" && isSearchOpen) {
        e.preventDefault();
        closeSearch();
        return;
      }
      if (isSearchOpen && searchQuery.trim() && searchResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev,
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (
          e.key === "Enter" &&
          selectedIndex >= 0 &&
          searchResults[selectedIndex]
        ) {
          e.preventDefault();
          handleResultClick(searchResults[selectedIndex]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, searchResults, selectedIndex, searchQuery]);

  useEffect(() => {
    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      const selectedElement = document.querySelector(
        `[data-result-idx="${selectedIndex}"]`,
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, searchResults]);

  const openSearch = () => {
    const dialogWidth = 540;
    const x = (window.innerWidth - dialogWidth) / 2;
    const y = 80;
    setDialogPosition({ x, y });
    setIsSearchOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIndex(-1);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIndex(-1);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  };

  const clearSearchInput = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - dialogPosition.x,
      y: e.clientY - dialogPosition.y,
    });
  };

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && searchDialogRef.current) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const dialogWidth = searchDialogRef.current.offsetWidth;
        const dialogHeight = searchDialogRef.current.offsetHeight;
        const minX = 0;
        const maxX = windowWidth - dialogWidth;
        const minY = 0;
        const maxY = windowHeight - dialogHeight;
        setDialogPosition({
          x: Math.min(maxX, Math.max(minX, newX)),
          y: Math.min(maxY, Math.max(minY, newY)),
        });
      }
    },
    [isDragging, dragStart],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleResultClick = async (result: SearchResult) => {
    switch (result.category) {
      case "skill":
        window.dispatchEvent(
          new CustomEvent("search-open-skill", {
            detail: { path: result.path, title: result.title },
          }),
        );
        break;
      case "session":
        const sessionId = result.id.replace("session_", "");
        window.dispatchEvent(
          new CustomEvent("search-switch-session", {
            detail: { sessionId, title: result.title },
          }),
        );
        break;
      case "log":
        window.dispatchEvent(
          new CustomEvent("search-open-log", {
            detail: { path: result.path, highlight: result.highlight },
          }),
        );
        break;
    }
    closeSearch();
  };

  const handleSuggestionClick = (action: () => void) => {
    action();
    closeSearch();
  };

  const groupResultsByCategory = (
    results: SearchResult[],
  ): Map<string, SearchResult[]> => {
    const grouped = new Map<string, SearchResult[]>();
    for (const result of results) {
      if (!grouped.has(result.category)) {
        grouped.set(result.category, []);
      }
      grouped.get(result.category)!.push(result);
    }
    return grouped;
  };

  const getCategoryDisplay = (category: string): string => {
    const config = CATEGORY_CONFIG[category];
    if (!config) return category;
    return currentLanguage === "zh" ? config.zh : config.en;
  };
  const getCategoryIcon = (category: string): string => {
    return CATEGORY_CONFIG[category]?.icon || "🔍";
  };
  const getMinimizeTitle = () =>
    currentLanguage === "zh" ? "最小化" : "Minimize";
  const getMaximizeTitle = () =>
    currentLanguage === "zh"
      ? isMaximized
        ? "还原"
        : "最大化"
      : isMaximized
        ? "Restore"
        : "Maximize";
  const getCloseTitle = () => (currentLanguage === "zh" ? "关闭" : "Close");
  const groupedResults = groupResultsByCategory(searchResults);
  const getSearchSuggestions = (): SearchSuggestion[] => {
    const isZh = currentLanguage === "zh";
    return [
      {
        id: "new-session",
        title: isZh ? "新建会话" : "New Session",
        description: isZh
          ? "创建一个新的对话会话"
          : "Create a new chat session",
        icon: "💬",
        action: () => {
          window.dispatchEvent(new CustomEvent("search-new-session"));
        },
      },
      {
        id: "toggle-theme",
        title: isZh ? "切换主题" : "Toggle Theme",
        description: isZh
          ? "切换深色/浅色模式"
          : "Switch between dark and light mode",
        icon: currentTheme === "dark" ? "☀️" : "🌙",
        action: () => onToggleTheme(),
      },
      {
        id: "toggle-language",
        title: isZh ? "切换语言" : "Toggle Language",
        description: isZh
          ? "切换中文/英文界面"
          : "Switch between Chinese and English",
        icon: "🌐",
        action: () => onToggleLanguage(),
      },
    ];
  };
  const suggestions = getSearchSuggestions();
  return (
    <>
      <div className="top-bar" style={{ paddingRight: "0px" }}>
        <div className="top-bar-left">
          <button
            className="sidebar-toggle"
            onClick={onToggleSidebar}
            title={
              sidebarCollapsed
                ? t("topbar.expandSidebar")
                : t("topbar.collapseSidebar")
            }
          >
            {sidebarCollapsed ? <MenuIcon /> : <CollapseIcon />}
          </button>

          <div className="app-brand">
            <div className="app-logo">
              <img src={logo} alt="logo" />
            </div>
            <div className="app-name">HippoX</div>
          </div>
        </div>

        <div className="top-bar-center">
          <button
            onClick={openSearch}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              height: "28px",
              width: "350px",
              justifyContent: "space-between",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                currentTheme === "dark"
                  ? "rgba(255, 255, 255, 0.12)"
                  : "rgba(0, 0, 0, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-tertiary)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SearchIcon />
              <span style={{ fontSize: "12px" }}>
                {currentLanguage === "zh" ? "搜索" : "Search"}
              </span>
            </div>
            <kbd
              style={{
                fontSize: "10px",
                background: "var(--bg-secondary)",
                padding: "2px 6px",
                borderRadius: "4px",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>
        <div className="top-bar-right">
          <button
            className="action-btn theme-toggle"
            onClick={onToggleTheme}
            title={t("topbar.toggleTheme")}
          >
            {currentTheme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            className="action-btn"
            onClick={onToggleLanguage}
            title={t("topbar.toggleLanguage")}
          >
            {currentLanguage === "zh" ? "EN" : "中文"}
          </button>
          {onLayoutModeChange && (
            <>
              <div className="layout-divider" />
              <button
                className={`action-btn layout-btn ${layoutMode === "horizontal" ? "active" : ""}`}
                onClick={() => onLayoutModeChange("horizontal")}
                title={
                  t("topbar.horizontalLayout") ||
                  (currentLanguage === "zh" ? "左右布局" : "Horizontal Layout")
                }
              >
                <LayoutVerticalIcon />
              </button>
              <button
                className={`action-btn layout-btn ${layoutMode === "vertical" ? "active" : ""}`}
                onClick={() => onLayoutModeChange("vertical")}
                title={
                  t("topbar.verticalLayout") ||
                  (currentLanguage === "zh" ? "上下布局" : "Vertical Layout")
                }
              >
                <LayoutHorizontalIcon />
              </button>
            </>
          )}

          <div className="window-controls">
            <button
              className="window-btn"
              onClick={handleMinimize}
              title={getMinimizeTitle()}
              style={{ fontSize: "20px", lineHeight: 1, fontWeight: 300 }}
            >
              ─
            </button>
            <button
              className="window-btn"
              onClick={handleMaximize}
              title={getMaximizeTitle()}
            >
              {isMaximized ? (
                <span
                  style={{
                    fontSize: "20px",
                    lineHeight: 1,
                    fontWeight: 400,
                    marginTop: "2px",
                  }}
                >
                  ❐
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "30px",
                    fontWeight: 300,
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "center",
                    marginTop: "-4px",
                  }}
                >
                  □
                </span>
              )}
            </button>
            <button
              className="window-btn close"
              onClick={handleClose}
              title={getCloseTitle()}
              style={{ paddingTop: "2px" }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.5)",
            pointerEvents: "auto",
            userSelect: "none",
          }}
          onClick={closeSearch}
        >
          <div
            ref={searchDialogRef}
            style={{
              position: "fixed",
              width: "540px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
              zIndex: 10000,
              overflow: "hidden",
              pointerEvents: "auto",
              left: `${dialogPosition.x}px`,
              top: `${dialogPosition.y}px`,
              padding: "5px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                border: `1px solid ${isInputFocused ? "#0078d4" : "var(--border-color)"}`,
                background: "var(--bg-secondary)",
                height: "35px",
                marginBottom: "5px",
                borderRadius: "5px",
                transition: "border-color 0.2s ease",
                cursor: isDragging ? "grabbing" : "grab",
              }}
              onMouseDown={handleDragStart}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                }}
              >
                <SearchIcon />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  padding: "8px 0",
                  marginLeft: "4px",
                }}
                placeholder={
                  currentLanguage === "zh"
                    ? "搜索技能、会话或日志..."
                    : "Search skills, sessions or logs..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                {searchQuery && (
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      borderRadius: "4px",
                    }}
                    onClick={clearSearchInput}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <ClearIcon size={14} />
                  </button>
                )}
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                    height: "24px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    fontSize: "16px",
                    borderRadius: "4px",
                  }}
                  onClick={closeSearch}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              style={{
                maxHeight: "340px",
                overflowY: "auto",
                background: "var(--bg-primary)",
                borderRadius: "5px",
              }}
            >
              {searchQuery.trim() ? (
                <>
                  {isSearchLoading ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        fontSize: "12px",
                      }}
                    >
                      {currentLanguage === "zh" ? "搜索中..." : "Searching..."}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: "12px",
                      }}
                    >
                      {currentLanguage === "zh"
                        ? "没有找到相关结果"
                        : "No results found"}
                    </div>
                  ) : (
                    Array.from(groupedResults.entries()).map(
                      ([category, results]) => (
                        <div key={category}>
                          <div
                            style={{
                              padding: "6px 12px",
                              fontSize: "11px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              color: "var(--text-muted)",
                              background: "var(--bg-primary)",
                              letterSpacing: "0.5px",
                              borderBottom: "1px solid var(--border-color)",
                            }}
                          >
                            <span>{getCategoryIcon(category)}</span>
                            <span style={{ marginLeft: "8px" }}>
                              {getCategoryDisplay(category)}
                            </span>
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: "10px",
                                background: "var(--bg-tertiary)",
                                padding: "2px 6px",
                                borderRadius: "10px",
                                float: "right",
                              }}
                            >
                              {results.length}
                            </span>
                          </div>
                          {results.map((result, idx) => {
                            const globalIdx = Array.from(
                              groupedResults.values(),
                            )
                              .flat()
                              .findIndex((r) => r.id === result.id);
                            return (
                              <div
                                key={result.id}
                                data-result-idx={globalIdx}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  borderBottom: "1px solid var(--border-color)",
                                  background:
                                    selectedIndex === globalIdx
                                      ? "var(--hover-bg)"
                                      : "transparent",
                                }}
                                onClick={() => handleResultClick(result)}
                                onMouseEnter={(e) => {
                                  if (selectedIndex !== globalIdx) {
                                    e.currentTarget.style.background =
                                      "var(--hover-bg)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedIndex !== globalIdx) {
                                    e.currentTarget.style.background =
                                      "transparent";
                                  }
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "var(--text-primary)",
                                    marginBottom: "2px",
                                  }}
                                >
                                  {result.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-secondary)",
                                    wordBreak: "break-word",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {result.highlight || result.description}
                                </div>
                                {result.timestamp && (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "var(--text-muted)",
                                      marginTop: "2px",
                                    }}
                                  >
                                    {new Date(
                                      parseInt(result.timestamp) * 1000,
                                    ).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ),
                    )
                  )}
                </>
              ) : (
                <div style={{ padding: "6px 0" }}>
                  <div
                    style={{
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {currentLanguage === "zh" ? "快速操作" : "Quick Actions"}
                  </div>
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "6px 12px",
                        cursor: "pointer",
                      }}
                      onClick={() => handleSuggestionClick(suggestion.action)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--hover-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          width: "20px",
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {suggestion.icon}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--text-primary)",
                          }}
                        >
                          {suggestion.title}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                            marginTop: "1px",
                          }}
                        >
                          {suggestion.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
