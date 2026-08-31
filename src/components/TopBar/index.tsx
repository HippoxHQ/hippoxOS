import React, { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import logo from "../../assets/logo.png";
import { SearchIcon, NewSessionIcon2, HistoryChatIcon2, MoonIcon, SunIcon, LanguageIcon } from "../../icons";
import { Theme, Language } from "../../types/types";
import SearchDialog from "./SearchDialog";
import { showToast, ToastType } from "../Toast";
import { windowsCommands } from "../../command/windows";
import { UploadFile } from "../../core/types";
import { X } from "lucide-react";
const TerminalLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="16" height="16">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" fill="none" />
    <path d="M9 8L6 12L9 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16h6" stroke="currentColor" strokeLinecap="round" />
  </svg>
);
const ChatLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="16" height="16">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" fill="none" />
    <path d="M15 8L18 12L15 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16h-6" stroke="currentColor" strokeLinecap="round" />
  </svg>
);
const FunctionLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="16" height="16">
    <rect x="2" y="4" width="8" height="16" rx="1.5" stroke="currentColor" fill="none" />
    <rect x="12" y="4" width="10" height="16" rx="1.5" stroke="currentColor" fill="none" />
    <path d="M6 8h0" stroke="currentColor" />
  </svg>
);
const FunctionRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="16" height="16">
    <rect x="2" y="4" width="10" height="16" rx="1.5" stroke="currentColor" fill="none" />
    <rect x="14" y="4" width="8" height="16" rx="1.5" stroke="currentColor" fill="none" />
    <path d="M18 8h0" stroke="currentColor" />
  </svg>
);
const HistoryIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width={size} height={size}>
    <path d="M12 8v4l3 3M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const topBarStyles = `
  .top-bar {
    height: 35px;
    background: var(--bg-secondary);
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
    min-width: 0;
    gap: 5px;
    padding-right: 0px;
  }
   .top-bar-left {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    min-width: 0;
    position: relative;
    z-index: 1000;
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
    // transition: all 0.15s ease;
    flex-shrink: 0;
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
    gap: 6px;
    -webkit-app-region: drag;
    app-region: drag;
    flex-shrink: 0;
  }
   .app-logo {
    -webkit-app-region: drag;
    app-region: drag;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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
    white-space: nowrap;
  }
  .top-bar-center {
   flex: 1;
   display: flex;
   align-items: center;
   justify-content: center;
   min-width: 0;
   padding: 0 8px;
  }
   .top-bar-right {
    display: flex;
    align-items: center;
    gap: 4px;
    -webkit-app-region: no-drag;
    app-region: no-drag;
    flex-shrink: 0;
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
    // transition: all 0.15s ease;
    flex-shrink: 0;
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
   .layout-switch-group {
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--bg-tertiary);
    border-radius: 6px;
    padding: 2px;
    margin-left: 4px;
    flex-shrink: 0;
  }
   .layout-switch-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 20px;
    padding: 0 10px;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 450;
    color: var(--text-secondary);
    // transition: all 0.15s ease;
    white-space: nowrap;
  }
   .layout-switch-btn svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 1.75;
    fill: none;
  }
   .layout-switch-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
   .layout-switch-btn.active {
    background: var(--accent-color, #00aaff);
    color: white;
  }
   .layout-divider {
    width: 1px;
    height: 20px;
    background: var(--border-color);
    margin: 0 4px;
    flex-shrink: 0;
  }
   .window-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: 4px;
    // border-left: 1px solid var(--border-color);
    height: 35px;
    flex-shrink: 0;
    padding-left: 4px;
  }
   .window-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 14px;
    // transition: all 0.15s ease;
    position: relative;
    border-radius: 0;
    flex-shrink: 0;
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
    // transition: transform 0.2s ease;
  }
   .theme-toggle:active {
    transform: scale(0.95);
  }
  .search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  // transition: all 0.2s ease;
  height: 25px;
  flex: 1;
  justify-content: space-between;
  min-width: 40px;
  max-width: 65%;      
  }
   .search-input-wrapper:hover {
    background: var(--hover-bg);
  }
   .search-input-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
    color: var(--text-secondary);
  }
   .search-input-left span {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-secondary);
  }
   .search-kbd {
    font-size: 10px;
    background: var(--bg-secondary);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
   @media (max-width: 720px) {
    .app-name {
      display: none;
    }
    .layout-switch-btn span {
      display: none;
    }
    .layout-switch-btn {
      padding: 0 6px;
    }
    .layout-divider {
      display: none;
    }
  }
   @media (max-width: 600px) {
  .action-btn.theme-toggle {
    display: none;
    }
  .action-btn:not(.theme-toggle) {
    display: none;
    }
  }
   @media (max-width: 580px) {
    .search-input-wrapper {
      min-width: 32px;
      padding: 4px 8px;
    }
    .search-input-left span {
      display: none;
    }
    .search-kbd {
      display: none;
    }
    .top-bar {
      padding: 0 8px;
      gap: 4px;
    }
    .window-btn {
      width: 32px;
    }
    .window-controls {
      margin-left: 2px;
      padding-left: 2px;
    }
  }
   @media (max-width: 480px) {
    .top-bar-left {
      gap: 4px;
    }
    .app-brand {
      gap: 4px;
    }
    .sidebar-toggle {
      width: 24px;
      height: 24px;
    }
    .sidebar-toggle svg {
      width: 14px;
      height: 14px;
    }
    .search-input-wrapper {
      min-width: 24px;
      padding: 4px 6px;
    }
    .search-input-wrapper svg {
      width: 14px;
      height: 14px;
    }
    .window-btn {
      width: 28px;
      font-size: 12px;
    }
    .top-bar-right {
      gap: 2px;
    }
  }
`;
if (typeof document !== "undefined") {
  const styleId = "topbar-styles-v6";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = topBarStyles;
    document.head.appendChild(style);
  }
}
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeLinecap="round" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="23px" height="23px">
    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeLinecap="round" />
  </svg>
);
const CollapseIcon = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M13 16l-6-6 6-6" stroke="currentColor" strokeLinecap="round" />
  </svg>
);
interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onNewSession?: () => void;
  currentTheme: Theme;
  onToggleTheme: () => void;
  currentLanguage: Language;
  onToggleLanguage: () => void;
  t: (key: string) => string;
  layoutSwapMode?: "terminal-left" | "chat-left";
  functionPanelPosition?: "left" | "right";
  onFunctionPanelPositionChange?: (position: "left" | "right") => void;
  onSwitchSession?: (sessionId: string) => void;
  currentSessionId?: string;
  onHistoryClick?: () => void;
  isHistoryOpen?: boolean;
  onFileClick?: (file: UploadFile) => void;
}
const TopBar: React.FC<TopBarProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
  onNewSession,
  currentTheme,
  onToggleTheme,
  currentLanguage,
  onToggleLanguage,
  t,
  layoutSwapMode = "terminal-left",
  functionPanelPosition = "right",
  onFunctionPanelPositionChange,
  onSwitchSession,
  currentSessionId,
  onHistoryClick,
  isHistoryOpen,
  onFileClick,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await windowsCommands.windowIsMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        showToast(ToastType.ERROR, "Failed to check window state: " + error);
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
  useEffect(() => {
    if (isHistoryOpen && historyButtonRef.current) {
      window.dispatchEvent(
        new CustomEvent("history-anchor-update", {
          detail: { anchorElement: historyButtonRef.current },
        }),
      );
    }
  }, [isHistoryOpen]);
  const handleMinimize = async () => {
    try {
      await windowsCommands.windowMinimize();
    } catch (error) {
      showToast(ToastType.ERROR, "Failed to minimize: " + error);
    }
  };
  const handleMaximize = async () => {
    try {
      await windowsCommands.windowMaximize();
      const maximized = await windowsCommands.windowIsMaximized();
      setIsMaximized(maximized);
    } catch (error) {
      showToast(ToastType.ERROR, "Failed to maximize/unmaximize: " + error);
    }
  };
  const handleClose = async () => {
    try {
      await windowsCommands.windowHide();
    } catch (error) {
      showToast(ToastType.ERROR, "Failed to close: " + error);
    }
  };
  const handleNewSessionClick = () => {
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
  const getMinimizeTitle = () => (currentLanguage === "zh" ? "最小化" : "Minimize");
  const getMaximizeTitle = () => (currentLanguage === "zh" ? (isMaximized ? "还原" : "最大化") : isMaximized ? "Restore" : "Maximize");
  const getCloseTitle = () => (currentLanguage === "zh" ? "关闭" : "Close");
  const getNewSessionTitle = () => (currentLanguage === "zh" ? "新建会话 (⌘N)" : "New Session (⌘N)");
  const isZh = currentLanguage === "zh";
  return (
    <>
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="app-brand">
            <div className="app-logo">
              <img src={logo} alt="logo" />
            </div>
            <div className="app-name">HippoxOS</div>
          </div>
          <button className="sidebar-toggle" onClick={onToggleSidebar} title={sidebarCollapsed ? t("topbar.expandSidebar") : t("topbar.collapseSidebar")}>
            {sidebarCollapsed ? <MenuIcon /> : <CollapseIcon />}
          </button>
          {/* <button
            className="sidebar-toggle"
            onClick={handleNewSessionClick}
            title={getNewSessionTitle()}
          >
            <NewSessionIcon2 size={16} />
          </button> */}
          {/* <button
            ref={historyButtonRef}
            className="sidebar-toggle"
            onClick={onHistoryClick}
            title={t("history.title") || "History Chat"}
          >
            <HistoryChatIcon2 size={16} />
          </button> */}
        </div>
        <div className="top-bar-center">
          <button className="search-input-wrapper" onClick={openSearch}>
            <div className="search-input-left">
              <SearchIcon />
              <span>{currentLanguage === "zh" ? "搜索" : "Search"}</span>
            </div>
            <kbd className="search-kbd">⌘K</kbd>
          </button>
        </div>
        <div className="top-bar-right">
          <button className="action-btn theme-toggle" onClick={onToggleTheme} title={t("topbar.toggleTheme")}>
            {currentTheme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="action-btn" onClick={onToggleLanguage} title={t("topbar.toggleLanguage")}>
            {currentLanguage === "zh" ? "EN" : "中文"}
          </button>
          <div className="layout-divider" />
          {/* {onFunctionPanelPositionChange && (
            <>
              <div className="layout-divider" />
              <div className="layout-switch-group">
                <button
                  className={`layout-switch-btn ${functionPanelPosition === "left" ? "active" : ""}`}
                  onClick={() => onFunctionPanelPositionChange("left")}
                   title={isZh ? "功能区在左" : "Function Panel Left"}
                >
                  <FunctionLeftIcon />
                   <span>{isZh ? "功能区左" : "Func Left"}</span> 
                </button>
                <button
                  className={`layout-switch-btn ${functionPanelPosition === "right" ? "active" : ""}`}
                  onClick={() => {
                     onFunctionPanelPositionChange("right")
                  }}
                  title={isZh ? "功能区在右" : "Function Panel Right"}
                >
                  <FunctionRightIcon />
                   <span>{isZh ? "功能区右" : "Func Right"}</span> 
                </button>
              </div>
            </>
          )} */}
          <div className="window-controls">
            <button className="window-btn" onClick={handleMinimize} title={getMinimizeTitle()} style={{ fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>
              ─
            </button>
            <button className="window-btn" onClick={handleMaximize} title={getMaximizeTitle()}>
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
            <button className="window-btn close" onClick={handleClose} title={getCloseTitle()} style={{ paddingTop: "2px" }}>
              <X />
            </button>
          </div>
        </div>
      </div>
      <SearchDialog isOpen={isSearchOpen} onClose={closeSearch} currentLanguage={currentLanguage} currentTheme={currentTheme} onToggleTheme={onToggleTheme} onToggleLanguage={onToggleLanguage} onFileClick={onFileClick} />
    </>
  );
};
export default TopBar;
