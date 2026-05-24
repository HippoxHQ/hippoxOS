import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Theme, Language } from "../type";
import logo from "../assets/logo.png";

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  currentTheme: Theme;
  onToggleTheme: () => void;
  currentLanguage: Language;
  onToggleLanguage: () => void;
  t: (key: string) => string;
}

const topBarStyles = `
  .top-bar {
    height: 48px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    flex-shrink: 0;
    position: relative;
    -webkit-app-region: drag;
    app-region: drag;
  }
  
  .top-bar * {
    -webkit-app-region: drag;
    app-region: drag;
  }
  
  .sidebar-toggle-btn,
  .theme-toggle-btn,
  .lang-toggle-btn,
  .window-control-btn {
    -webkit-app-region: no-drag;
    app-region: no-drag;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 6px 12px;
    border-radius: 8px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  .top-bar-center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    pointer-events: none;  
  }
  
  .app-logo,
  .app-name {
    pointer-events: none;
  }
  
  .sidebar-toggle-btn:hover,
  .theme-toggle-btn:hover,
  .lang-toggle-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .window-control-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .window-control-btn.close-btn:hover {
    background: rgba(220, 38, 38, 0.2);
    color: #dc2626;
  }
  
  .theme-toggle-btn,
  .lang-toggle-btn {
    font-size: 13px;
  }
  
  .sidebar-toggle-btn {
    font-size: 20px;
  }
`;

if (typeof document !== "undefined") {
  const styleId = "topbar-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = topBarStyles;
    document.head.appendChild(style);
  }
}

const TopBar: React.FC<TopBarProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
  currentTheme,
  onToggleTheme,
  currentLanguage,
  onToggleLanguage,
  t,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

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

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={
            sidebarCollapsed
              ? t("topbar.expandSidebar")
              : t("topbar.collapseSidebar")
          }
        >
          {sidebarCollapsed ? "☰" : "◀"}
        </button>
      </div>

      <div className="top-bar-center">
        <div className="app-logo">
          <img src={logo} width="32px" height="32px" alt="logo" />
        </div>
        <div className="app-name">HippoX</div>
      </div>

      <div className="top-bar-right">
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={t("topbar.toggleTheme")}
        >
          {currentTheme === "dark" ? "☀️" : "🌙"}
        </button>
        <button
          className="lang-toggle-btn"
          onClick={onToggleLanguage}
          title={t("topbar.toggleLanguage")}
        >
          {currentLanguage === "zh" ? "EN" : "中文"}
        </button>

        <button
          className="window-control-btn"
          onClick={handleMinimize}
          title="最小化"
        >
          ─
        </button>
        <button
          className="window-control-btn"
          onClick={handleMaximize}
          title={isMaximized ? "还原" : "最大化"}
        >
          {isMaximized ? "❐" : "□"}
        </button>
        <button
          className="window-control-btn close-btn"
          onClick={handleClose}
          title="关闭"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default TopBar;
