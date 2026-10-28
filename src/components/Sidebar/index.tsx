import React, { useState, useEffect, useRef } from "react";
import { PopupMenu, SidebarButton } from "./components";
import { SidebarProps } from "./types";
import { topMenuItems, bottomMenuItems, allMenuItems } from "./constants";
import { sidebarStyles } from "./sidebarStyles";
import { usePopupMenu } from "./hooks/usePopupMenu";
import { videoEditorStateManager } from "../../subsystem/VideoEditor/global";
import { clearVideoEditorAllMemory } from "../../subsystem/VideoEditor/MenoryManager";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { SUBSYSTEM_TO_SIDEBAR_ID } from "../../App/SubSystemConstants";
import { windowsCommands } from "../../command/windows";
import { ChevronUp, ChevronDown, ExternalLink, ArrowRight } from "lucide-react";
if (typeof document !== "undefined") {
  const styleId = "sidebar-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = sidebarStyles;
    document.head.appendChild(style);
  }
}
/**
 * Subsystem sidebar item ids that can be opened in a separate window.
 */
const NEW_WINDOW_CAPABLE_ITEMS = ["generalChat", "codeEditorChat", "chartChat", "mapChat", "videoEditor", "audioEditor", "sandbox3d", "blockchain", "imageEditor", "pixelEditor", "databaseClient", "dockerClient", "apiClient", "userProfile"];
/**
 * Small hover context menu for a sidebar item.
 */
interface SidebarContextMenuProps {
  label: string;
  top: number;
  left: number;
  canOpenNewWindow: boolean;
  onOpen: () => void;
  onOpenNewWindow: () => void;
  onClose: () => void;
  isZh: boolean;
}
const SidebarContextMenu: React.FC<SidebarContextMenuProps> = ({ label, top, left, canOpenNewWindow, onOpen, onOpenNewWindow, onClose, isZh }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;
    let adjustedTop = top;
    let adjustedLeft = left;
    if (adjustedLeft + rect.width > viewportWidth - gap) {
      adjustedLeft = viewportWidth - rect.width - gap;
    }
    if (adjustedLeft < gap) {
      adjustedLeft = gap;
    }
    if (adjustedTop + rect.height > viewportHeight - gap) {
      adjustedTop = viewportHeight - rect.height - gap;
    }
    if (adjustedTop < gap) {
      adjustedTop = gap;
    }
    el.style.top = `${adjustedTop}px`;
    el.style.left = `${adjustedLeft}px`;
  }, [top, left]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  return (
    <div
      ref={menuRef}
      className="sidebar-context-menu"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top,
        left,
        minWidth: "170px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "6px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.24), 0 2px 6px rgba(0, 0, 0, 0.12)",
        zIndex: 1200,
        overflow: "hidden",
        userSelect: "none",
        padding: "4px",
      }}
    >
      <div
        style={{
          padding: "5px 8px",
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={label}
      >
        {label}
      </div>
      <div
        style={{
          height: "1px",
          background: "var(--border-color)",
          margin: "2px 4px 4px 4px",
        }}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
          onClose();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "6px 8px",
          background: "transparent",
          border: "none",
          borderRadius: "4px",
          color: "var(--text-primary)",
          fontSize: "12px",
          cursor: "pointer",
          textAlign: "left",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--hover-bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <ArrowRight size={13} style={{ flexShrink: 0 }} />
        <span>{isZh ? "打开" : "Open"}</span>
      </button>
      {canOpenNewWindow && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenNewWindow();
            onClose();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            padding: "6px 8px",
            background: "transparent",
            border: "none",
            borderRadius: "4px",
            color: "var(--text-primary)",
            fontSize: "12px",
            cursor: "pointer",
            textAlign: "left",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <ExternalLink size={13} style={{ flexShrink: 0 }} />
          <span>{isZh ? "在新窗口打开" : "Open in new window"}</span>
        </button>
      )}
    </div>
  );
};
const Sidebar: React.FC<SidebarProps> = ({ collapsed, onResetSession, onClearLogs, onMenuClick, onNewSession, currentSessionId, onSwitchSession, t }) => {
  const isZh = t("i18n") === "zh";
  const [activeId, setActiveId] = React.useState("generalChat");
  const [activeSubId, setActiveSubId] = React.useState<string>();
  const [activeSubSubId, setActiveSubSubId] = React.useState<string>();
  const { popupVisible, popupPosition, activeIconId, iconRefs, handleClosePopup, showPopup, isPopupVisible } = usePopupMenu();
  const topNavRef = useRef<HTMLElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const isProgrammaticScrollRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{
    itemId: string;
    label: string;
    top: number;
    left: number;
    canOpenNewWindow: boolean;
  } | null>(null);
  const contextMenuHoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const handleSessionSelected = (e: CustomEvent) => {
      const { sessionId, title, subsystem } = e.detail;
      if (subsystem) {
        const sidebarId = SUBSYSTEM_TO_SIDEBAR_ID[subsystem as keyof typeof SUBSYSTEM_TO_SIDEBAR_ID];
        if (sidebarId) {
          setActiveId(sidebarId);
          if (popupVisible) {
            handleClosePopup();
          }
        }
      }
    };
    const handleSearchSwitchSession = (e: CustomEvent) => {
      const { sessionId, title, highlightMessageId, subsystem } = e.detail;
      if (subsystem) {
        const sidebarId = SUBSYSTEM_TO_SIDEBAR_ID[subsystem as keyof typeof SUBSYSTEM_TO_SIDEBAR_ID];
        if (sidebarId) {
          setActiveId(sidebarId);
          if (popupVisible) {
            handleClosePopup();
          }
        }
      }
    };
    window.addEventListener(APP_WINDOW_EVENTS.SESSION_SELECTED, handleSessionSelected as EventListener);
    window.addEventListener(APP_WINDOW_EVENTS.SEARCH_SWITCH_SESSION, handleSearchSwitchSession as EventListener);
    return () => {
      window.removeEventListener(APP_WINDOW_EVENTS.SESSION_SELECTED, handleSessionSelected as EventListener);
      window.removeEventListener(APP_WINDOW_EVENTS.SEARCH_SWITCH_SESSION, handleSearchSwitchSession as EventListener);
    };
  }, [popupVisible, handleClosePopup]);
  /**
   * Update scroll button visibility based on scroll position
   */
  const updateScrollButtons = () => {
    const el = topNavRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 0);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
  };
  /**
   * Re-check scroll buttons when top menu items change or on mount
   */
  useEffect(() => {
    updateScrollButtons();
    const el = topNavRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollButtons);
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, []);
  /**
   * Clear any pending hover-close timer for the context menu.
   */
  const clearContextMenuHoverTimer = () => {
    if (contextMenuHoverTimerRef.current) {
      clearTimeout(contextMenuHoverTimerRef.current);
      contextMenuHoverTimerRef.current = null;
    }
  };
  /**
   * Close the context menu and reset its related state.
   */
  const closeContextMenu = () => {
    clearContextMenuHoverTimer();
    setContextMenu(null);
  };
  const scheduleCloseContextMenu = () => {
    clearContextMenuHoverTimer();
    contextMenuHoverTimerRef.current = setTimeout(() => {
      setContextMenu(null);
    }, 180);
  };
  const openContextMenu = (itemId: string, label: string, anchorEl: HTMLElement) => {
    const isNewWindowCapable = NEW_WINDOW_CAPABLE_ITEMS.includes(itemId);
    const rect = anchorEl.getBoundingClientRect();
    setContextMenu({
      itemId,
      label,
      top: rect.top,
      left: rect.right + 6,
      canOpenNewWindow: isNewWindowCapable,
    });
  };
  /**
   * Open a subsystem in a separate Tauri main window.
   */
  const handleOpenInNewWindow = async (itemId: string) => {
    try {
      await windowsCommands.createMainWindow(itemId);
    } catch (error) {
      console.error("[Sidebar] Failed to open subsystem in new window:", error);
    }
  };
  const handleMenuClick = (id: string, subId?: string, subSubId?: string) => {
    setActiveId(id);
    setActiveSubId(subId);
    setActiveSubSubId(subSubId);
    if (onMenuClick) {
      if (subSubId) {
        onMenuClick(id, subSubId);
      } else if (subId) {
        onMenuClick(id, subId);
      } else {
        onMenuClick(id);
      }
    }
  };
  const handleIconClick = (itemId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    // Any interaction with an icon closes the hover context menu first.
    closeContextMenu();
    const directOpenItems = [
      "skillsManager",
      "tasks_group",
      "generalChat",
      "codeEditorChat",
      "favorites",
      "workspace",
      "logs",
      "skillMarket",
      "userProfile",
      "chartChat",
      "mapChat",
      "videoEditor",
      "audioEditor",
      "sandbox3d",
      "blockchain",
      "imageEditor",
      "pixelEditor",
      "databaseClient",
      "dockerClient",
      "apiClient",
      "home",
    ];
    // Keep video editor state alive for both the video editor and the audio
    // editor entry, since the audio editor opens inside the video editor page.
    if (itemId != "videoEditor" && itemId != "audioEditor") {
      videoEditorStateManager.clear();
      clearVideoEditorAllMemory();
    }
    if (directOpenItems.includes(itemId)) {
      if (popupVisible) {
        handleClosePopup();
      }
      if (itemId === "home") {
        if (onNewSession) onNewSession();
        else onResetSession();
      }
      handleMenuClick(itemId);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const popupWidth = 280;
    const gap = 8;
    let left = rect.right + gap;
    if (left + popupWidth > viewportWidth - gap) {
      left = rect.left - popupWidth - gap;
    }
    if (left < gap) {
      left = gap;
    }
    let top = rect.top;
    if (top < gap) {
      top = gap;
    }
    const position = { top, left };
    if (itemId === "skills_group" || itemId === "settings_group") {
      if (isPopupVisible(itemId)) {
        handleClosePopup();
        return;
      }
      setActiveId(itemId);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      showPopup(itemId, position);
      return;
    }
    if (isPopupVisible(itemId)) {
      handleClosePopup();
    } else {
      if (popupVisible) {
        handleClosePopup();
      }
      showPopup(itemId, position);
    }
  };
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, itemId: string, label: string) => {
    if (NEW_WINDOW_CAPABLE_ITEMS.includes(itemId) || itemId === "userProfile") {
      clearContextMenuHoverTimer();
      openContextMenu(itemId, label, e.currentTarget);
    }
  };
  const handleMouseLeave = () => {
    scheduleCloseContextMenu();
  };
  const isIconActive = (itemId: string): boolean => {
    if (itemId === "skillsManager") {
      return activeId === "skillsManager";
    }
    if (itemId === "userProfile") {
      return activeId === "userProfile";
    }
    if (itemId === "generalChat") {
      return activeId === "generalChat";
    }
    if (itemId === "codeEditorChat") {
      return activeId === "codeEditorChat";
    }
    if (itemId === "skillMarket") {
      return activeId === "skillMarket" || activeId === "skills";
    }
    if (itemId === "skills_group") {
      return activeId === "skills_group" || activeId === "skills" || activeId === "skillMarket";
    }
    if (itemId === "tasks_group") {
      return activeId === "tasks_group" || activeId === "scheduledTasks" || activeId === "taskQueue";
    }
    if (itemId === "settings_group") {
      return activeId === "settings_group" || activeSubId !== undefined || activeSubSubId !== undefined;
    }
    // Added blockchain active state check
    if (itemId === "blockchain") {
      return activeId === "blockchain";
    }
    // Added new active state checks
    if (itemId === "imageEditor") {
      return activeId === "imageEditor";
    }
    if (itemId === "pixelEditor") {
      return activeId === "pixelEditor";
    }
    if (itemId === "databaseClient") {
      return activeId === "databaseClient";
    }
    if (itemId === "dockerClient") {
      return activeId === "dockerClient";
    }
    if (itemId === "apiClient") {
      return activeId === "apiClient";
    }
    // Audio editor has its own active state so it can be highlighted
    // independently of the video editor entry.
    if (itemId === "audioEditor") {
      return activeId === "audioEditor";
    }
    return activeId === itemId;
  };
  const handleNewSessionClick = () => {
    if (onNewSession) onNewSession();
    else onResetSession();
  };
  const getButtonLabel = (item: { id: string; label: string }) => {
    if (item.id === "home") {
      return t("actions.newSession");
    }
    if (item.id === "skillMarket") {
      return t("actions.skillMarket");
    }
    if (item.id === "userProfile") {
      return t("menu.userProfile");
    }
    if (item.id === "generalChat") {
      return t("menu.history");
    }
    if (item.id === "codeEditorChat") {
      return t("menu.codeEditor");
    }
    // Added blockchain label mapping
    if (item.id === "blockchain") {
      return t("menu.blockchain");
    }
    // Added new label mappings
    if (item.id === "imageEditor") {
      return t("menu.imageEditor");
    }
    if (item.id === "pixelEditor") {
      return t("menu.pixelEditor");
    }
    if (item.id === "databaseClient") {
      return t("menu.databaseClient");
    }
    if (item.id === "dockerClient") {
      return t("menu.dockerClient");
    }
    if (item.id === "apiClient") {
      return t("menu.apiClient");
    }
    // Audio editor label mapping.
    if (item.id === "audioEditor") {
      return t("menu.audioEditor");
    }
    return t(item.label);
  };
  const renderButton = (item: (typeof topMenuItems)[0]) => {
    const isActive = isIconActive(item.id);
    const label = getButtonLabel(item);
    return (
      <SidebarButton
        key={item.id}
        item={item}
        isActive={isActive}
        label={label}
        onClick={(e) => handleIconClick(item.id, e)}
        onMouseEnter={(e) => handleMouseEnter(e, item.id, label)}
        onMouseLeave={handleMouseLeave}
        buttonRef={(el) => {
          if (el) iconRefs.current.set(item.id, el);
          else iconRefs.current.delete(item.id);
        }}
      />
    );
  };
  const scrollToTop = () => {
    const el = topNavRef.current;
    if (!el) return;
    isProgrammaticScrollRef.current = true;
    el.scrollTop = 0;
    setCanScrollUp(false);
    setCanScrollDown(el.scrollHeight > el.clientHeight + 1);
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  };
  const scrollToBottom = () => {
    const el = topNavRef.current;
    if (!el) return;
    isProgrammaticScrollRef.current = true;
    el.scrollTop = el.scrollHeight;
    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(false);
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  };
  const homeItem = topMenuItems[0];
  const otherTopItems = topMenuItems.slice(1);
  return (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? 0 : 45,
        overflow: collapsed ? "hidden" : "visible",
        padding: collapsed ? 0 : undefined,
        opacity: collapsed ? 0 : 1,
      }}
    >
      {!collapsed && (
        <>
          <div className="sidebar-header">{renderButton(homeItem)}</div>
          {canScrollUp && (
            <button className="sidebar-scroll-btn" onClick={scrollToTop} onMouseEnter={(e) => handleMouseEnter(e, "", isZh ? "滚动到顶部" : "Scroll to top")} onMouseLeave={handleMouseLeave}>
              <ChevronUp size={14} />
            </button>
          )}
          <nav className="sidebar-nav-top" ref={topNavRef}>
            {otherTopItems.map((item) => renderButton(item))}
          </nav>
          {canScrollDown && (
            <button className="sidebar-scroll-btn" onClick={scrollToBottom} onMouseEnter={(e) => handleMouseEnter(e, "", isZh ? "滚动到底部" : "Scroll to bottom")} onMouseLeave={handleMouseLeave}>
              <ChevronDown size={14} />
            </button>
          )}
          <nav className="sidebar-nav-bottom" style={{ flexDirection: "column-reverse" }}>
            <SidebarButton
              item={{
                id: "userProfile",
                icon: "user",
                label: "menu.userProfile",
              }}
              isActive={isIconActive("userProfile")}
              label={t("menu.userProfile")}
              onClick={(e) => handleIconClick("userProfile", e)}
              onMouseEnter={(e) => handleMouseEnter(e, "userProfile", t("menu.userProfile"))}
              onMouseLeave={handleMouseLeave}
              buttonRef={(el) => {
                if (el) iconRefs.current.set("userProfile", el);
                else iconRefs.current.delete("userProfile");
              }}
            />
            {bottomMenuItems.map((item) => renderButton(item))}
          </nav>
          {popupVisible && activeIconId && <PopupMenu items={allMenuItems.filter((item) => item.id === activeIconId)} activeId={activeId} activeSubId={activeSubId} activeSubSubId={activeSubSubId} onMenuClick={handleMenuClick} onClose={handleClosePopup} position={popupPosition} t={t} />}
          {contextMenu && (
            <div
              onMouseEnter={() => {
                clearContextMenuHoverTimer();
              }}
              onMouseLeave={() => {
                scheduleCloseContextMenu();
              }}
            >
              <SidebarContextMenu
                label={contextMenu.label}
                top={contextMenu.top}
                left={contextMenu.left}
                canOpenNewWindow={contextMenu.canOpenNewWindow}
                onOpen={() => handleMenuClick(contextMenu.itemId)}
                onOpenNewWindow={() => handleOpenInNewWindow(contextMenu.itemId)}
                onClose={closeContextMenu}
                isZh={isZh}
              />
            </div>
          )}
        </>
      )}
    </aside>
  );
};
export default Sidebar;