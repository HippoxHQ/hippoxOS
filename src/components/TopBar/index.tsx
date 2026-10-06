import React, { useEffect, useState, useRef } from "react";
import logo from "../../assets/logo.png";
import { SearchIcon } from "../../icons";
import { Theme, Language } from "../../types/types";
import SearchDialog from "./SearchDialog";
import { showToast, ToastType } from "../Toast";
import { windowsCommands } from "../../command/windows";
import { osCommands } from "../../command/os";
import { configCommands } from "../../command/config";
import { UploadFile } from "../../core/types";
import { Palette, X } from "lucide-react";
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
type ThemeId = "dark" | "light" | "black" | "midnight" | "warm" | "nord" | "dracula" | "solarized" | "rose" | "forest" | "pink" | "pink-light";
interface ThemeOption {
  id: ThemeId;
  labelZh: string;
  labelEn: string;
  swatch: string;
}
const THEME_OPTIONS: ThemeOption[] = [
  { id: "dark", labelZh: "暗黑", labelEn: "Dark", swatch: "#111318" },
  { id: "black", labelZh: "纯黑", labelEn: "Black", swatch: "#000000" },
  { id: "light", labelZh: "亮色", labelEn: "Light", swatch: "#ffffff" },
  { id: "midnight", labelZh: "午夜蓝", labelEn: "Midnight", swatch: "#050a1a" },
  { id: "warm", labelZh: "暖棕", labelEn: "Warm", swatch: "#1d1813" },
  { id: "nord", labelZh: "北欧", labelEn: "Nord", swatch: "#3b4252" },
  { id: "dracula", labelZh: "德古拉", labelEn: "Dracula", swatch: "#282a36" },
  { id: "solarized", labelZh: "日光", labelEn: "Solarized", swatch: "#073642" },
  { id: "rose", labelZh: "玫瑰", labelEn: "Rose", swatch: "#1f1d2e" },
  { id: "forest", labelZh: "森林", labelEn: "Forest", swatch: "#12251b" },
  { id: "pink", labelZh: "粉色", labelEn: "Pink", swatch: "#241a20" },
  { id: "pink-light", labelZh: "淡粉色", labelEn: "PinkLight", swatch: "#ffe4ec" },
];
/** Apply a theme by setting the data-theme attribute on <html>. */
const applyThemeToDocument = (themeId: ThemeId) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", themeId);
};
const persistThemeToBackend = async (themeId: ThemeId) => {
  try {
    await configCommands.saveSettingsTheme(themeId);
  } catch (_) {
    /* ignore persistence errors */
  }
};
const readThemeFromBackend = async (): Promise<ThemeId | null> => {
  try {
    const value = await configCommands.getSettingsTheme();
    if (value && typeof value === "string") {
      return value as ThemeId;
    }
  } catch (_) {
    /* ignore read errors */
  }
  return null;
};
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
  currentTheme?: Theme;
  onToggleTheme?: () => void;
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
const TopBar: React.FC<TopBarProps> = ({ sidebarCollapsed, onToggleSidebar, onNewSession, currentLanguage, onToggleLanguage, t, isHistoryOpen, onFileClick }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>("dark");
  const [hoveredThemeId, setHoveredThemeId] = useState<ThemeId | null>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const themePopupRef = useRef<HTMLDivElement>(null);
  const [isMacOS, setIsMacOS] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await readThemeFromBackend();
      if (cancelled) return;
      const initial: ThemeId = saved || "dark";
      setActiveThemeId(initial);
      applyThemeToDocument(initial);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const handleThemeChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ themeId?: string }>).detail;
      if (detail?.themeId) {
        const nextId = detail.themeId as ThemeId;
        setActiveThemeId(nextId);
        applyThemeToDocument(nextId);
      }
    };
    window.addEventListener("app-theme-changed", handleThemeChanged as EventListener);
    return () => window.removeEventListener("app-theme-changed", handleThemeChanged as EventListener);
  }, []);
  useEffect(() => {
    const handleGlobalMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const isThemeButton = themeButtonRef.current?.contains(target);
      if (isThemeButton) return;
      const isThemePopup = themePopupRef.current?.contains(target);
      if (!isThemePopup && isThemePickerOpen) {
        setIsThemePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleGlobalMouseDown, true);
    return () => document.removeEventListener("mousedown", handleGlobalMouseDown, true);
  }, [isThemePickerOpen]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const os = await osCommands.getOs();
        if (!cancelled) {
          setIsMacOS(os === "macos");
        }
      } catch (error) {
        // Fallback to navigator.platform if the backend command is unavailable.
        const fallback = typeof navigator !== "undefined" && /Mac|iPad|iPhone|iPod/.test(navigator.platform || "");
        if (!cancelled) {
          setIsMacOS(fallback);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
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
  const handleToggleThemePicker = () => {
    setIsThemePickerOpen((prev) => !prev);
  };
  const handleSelectTheme = (themeId: ThemeId) => {
    setActiveThemeId(themeId);
    applyThemeToDocument(themeId);
    // Persist the full theme id to the backend (not to the browser).
    void persistThemeToBackend(themeId);
    setIsThemePickerOpen(false);
    // Notify the rest of the app (e.g. the settings panel) about the change.
    window.dispatchEvent(
      new CustomEvent("app-theme-changed", {
        detail: { themeId },
      }),
    );
  };
  const getMinimizeTitle = () => (currentLanguage === "zh" ? "最小化" : "Minimize");
  const getMaximizeTitle = () => (currentLanguage === "zh" ? (isMaximized ? "还原" : "最大化") : isMaximized ? "Restore" : "Maximize");
  const getCloseTitle = () => (currentLanguage === "zh" ? "关闭" : "Close");
  const isZh = currentLanguage === "zh";
  return (
    <>
      <div className="top-bar" style={{ paddingRight: `${isMacOS ? "10px" : "0px"}` }}>
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
          <button ref={themeButtonRef} className="action-btn theme-toggle" onClick={handleToggleThemePicker} title={t("topbar.toggleTheme")} style={{ WebkitAppRegion: "no-drag", appRegion: "no-drag" } as React.CSSProperties}>
            <Palette size={16} strokeWidth={1.75} />
          </button>
          <button className="action-btn" onClick={onToggleLanguage} title={t("topbar.toggleLanguage")}>
            {currentLanguage === "zh" ? "EN" : "中文"}
          </button>
          {!isMacOS && <div className="layout-divider" />}
          {!isMacOS && (
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
          )}
        </div>
      </div>
      {isThemePickerOpen && (
        <div
          ref={themePopupRef}
          className="theme-picker-popup"
          onMouseDown={(e) => e.stopPropagation()}
          style={
            {
              position: "fixed",
              top: "40px",
              right: isMacOS ? "210px" : "108px",
              width: "200px",
              maxHeight: "70vh",
              overflowY: "auto",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "5px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              zIndex: 1000,
              padding: "6px",
              userSelect: "none",
              WebkitAppRegion: "no-drag",
              appRegion: "no-drag",
            } as React.CSSProperties
          }
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-tertiary)",
              padding: "6px 8px 4px",
              letterSpacing: "0.4px",
              textTransform: "uppercase",
            }}
          >
            {isZh ? "选择主题" : "Choose Theme"}
          </div>
          {THEME_OPTIONS.map((opt) => {
            const isActive = activeThemeId === opt.id;
            const isHovered = hoveredThemeId === opt.id;
            return (
              <button
                key={opt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "7px 8px",
                  background: isActive ? "var(--accent-glow)" : isHovered ? "var(--hover-bg)" : "transparent",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  textAlign: "left",
                  transition: "background 0.12s ease",
                }}
                onClick={() => handleSelectTheme(opt.id)}
                onMouseEnter={() => setHoveredThemeId(opt.id)}
                onMouseLeave={() => setHoveredThemeId(null)}
              >
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "5px",
                    flexShrink: 0,
                    background: opt.swatch,
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                />
                <span style={{ flex: 1, whiteSpace: "nowrap" }}>{isZh ? opt.labelZh : opt.labelEn}</span>
                {isActive && <span style={{ fontSize: "12px", color: "var(--accent-color)", flexShrink: 0 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
      <SearchDialog isOpen={isSearchOpen} onClose={closeSearch} currentLanguage={currentLanguage} currentTheme={activeThemeId === "light" ? "light" : "dark"} onToggleTheme={() => {}} onToggleLanguage={onToggleLanguage} onFileClick={onFileClick} />
    </>
  );
};
export default TopBar;
