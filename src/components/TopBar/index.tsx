import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import logo from "../../assets/logo.png";
import {
  SearchIcon,
  LayoutVerticalIcon,
  LayoutHorizontalIcon,
  NewSessionIcon,
  NewSessionIcon2,
} from "../../icons";
import { Theme, Language } from "../../type";
import SearchDialog from "./SearchDialog";

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onNewSession?: () => void;
  currentTheme: Theme;
  onToggleTheme: () => void;
  currentLanguage: Language;
  onToggleLanguage: () => void;
  t: (key: string) => string;
  layoutMode?: "horizontal" | "vertical";
  onLayoutModeChange?: (mode: "horizontal" | "vertical") => void;
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
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path
      d="M13 16l-6-6 6-6"
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

const TopBar: React.FC<TopBarProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
  onNewSession,
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  const handleNewSession = () => {
    if (onNewSession) {
      onNewSession();
    } else {
      window.dispatchEvent(new CustomEvent("search-new-session"));
    }
  };

  const openSearch = () => {
    setIsSearchOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
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
  const getNewSessionTitle = () =>
    currentLanguage === "zh" ? "新建会话 (⌘N)" : "New Session (⌘N)";

  return (
    <>
      <div className="top-bar" style={{ paddingRight: "0px" }}>
        <div className="top-bar-left">
          <div className="app-brand">
            <div className="app-logo">
              <img src={logo} alt="logo" />
            </div>
            <div className="app-name">HippoX</div>
          </div>
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
          <button
            className="sidebar-toggle"
            onClick={handleNewSession}
            title={getNewSessionTitle()}
          >
            <NewSessionIcon2 size={16} />
          </button>
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

      <SearchDialog
        isOpen={isSearchOpen}
        onClose={closeSearch}
        currentLanguage={currentLanguage}
        currentTheme={currentTheme}
        onToggleTheme={onToggleTheme}
        onToggleLanguage={onToggleLanguage}
      />
    </>
  );
};

export default TopBar;
