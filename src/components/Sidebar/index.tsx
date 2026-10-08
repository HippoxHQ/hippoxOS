import React, { useEffect, useRef, useState } from "react";
import { PopupMenu, SidebarButton } from "./components";
import { SidebarProps } from "./types";
import { showTooltipOnElement } from "../Tooltip";
import { topMenuItems, bottomMenuItems, allMenuItems } from "./constants";
import { sidebarStyles } from "./sidebarStyles";
import { usePopupMenu } from "./hooks/usePopupMenu";
import { videoEditorStateManager } from "../../subsystem/VideoEditor/global";
import { clearVideoEditorAllMemory } from "../../subsystem/VideoEditor/MenoryManager";
import { APP_WINDOW_EVENTS } from "../../App/AppWindowEventManager";
import { SUBSYSTEM_TO_SIDEBAR_ID } from "../../App/SubSystemConstants";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";
if (typeof document !== "undefined") {
  const styleId = "sidebar-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = sidebarStyles;
    document.head.appendChild(style);
  }
}
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
      "sandbox3d",
      // Added blockchain to direct open items
      "blockchain",
      // Added new items to direct open items
      "imageEditor",
      "pixelEditor",
      "databaseClient",
      "dockerClient",
      "apiClient",
    ];
    if (itemId != "videoEditor") {
      videoEditorStateManager.clear();
      clearVideoEditorAllMemory();
    }
    if (directOpenItems.includes(itemId)) {
      if (popupVisible) {
        handleClosePopup();
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
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, label: string) => {
    showTooltipOnElement(e.currentTarget, label);
  };
  const handleMouseLeave = () => {
    const container = document.getElementById("global-tooltip-container");
    if (container) {
      container.remove();
    }
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
    return activeId === itemId;
  };
  const handleNewSessionClick = () => {
    if (onNewSession) onNewSession();
    else onResetSession();
  };
  const getButtonLabel = (item: { id: string; label: string }) => {
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        buttonRef={(el) => {
          if (el) iconRefs.current.set(item.id, el);
          else iconRefs.current.delete(item.id);
        }}
      />
    );
  };
  /**
   * Instantly scroll top navigation to the very top (no smooth animation)
   */
  const scrollToTop = () => {
    const el = topNavRef.current;
    if (!el) return;
    isProgrammaticScrollRef.current = true;
    el.scrollTop = 0;
    // Sync button visibility right away, then release the flag on next frame
    setCanScrollUp(false);
    setCanScrollDown(el.scrollHeight > el.clientHeight + 1);
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  };
  /**
   * Instantly scroll top navigation to the very bottom (no smooth animation)
   */
  const scrollToBottom = () => {
    const el = topNavRef.current;
    if (!el) return;
    isProgrammaticScrollRef.current = true;
    el.scrollTop = el.scrollHeight;
    // Sync button visibility right away, then release the flag on next frame
    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(false);
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  };
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
          <div className="sidebar-header">
            <button className="new-session-icon-btn" onClick={handleNewSessionClick} onMouseEnter={(e) => handleMouseEnter(e, t("actions.newSession"))} onMouseLeave={handleMouseLeave}>
              <Plus size={18} />
            </button>
          </div>
          {/* Scroll-to-top button, only visible when scrollable and not at top */}
          {canScrollUp && (
            <button className="sidebar-scroll-btn" onClick={scrollToTop} onMouseEnter={(e) => handleMouseEnter(e, isZh ? "滚动到顶部" : "Scroll to top")} onMouseLeave={handleMouseLeave}>
              <ChevronUp size={14} />
            </button>
          )}
          <nav className="sidebar-nav-top" ref={topNavRef}>
            {topMenuItems.map((item) => renderButton(item))}
          </nav>
          {/* Scroll-to-bottom button, only visible when scrollable and not at bottom */}
          {canScrollDown && (
            <button className="sidebar-scroll-btn" onClick={scrollToBottom} onMouseEnter={(e) => handleMouseEnter(e, isZh ? "滚动到底部" : "Scroll to bottom")} onMouseLeave={handleMouseLeave}>
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
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              buttonRef={(el) => {
                if (el) iconRefs.current.set("userProfile", el);
                else iconRefs.current.delete("userProfile");
              }}
            />
            {bottomMenuItems.map((item) => renderButton(item))}
          </nav>
          {popupVisible && activeIconId && <PopupMenu items={allMenuItems.filter((item) => item.id === activeIconId)} activeId={activeId} activeSubId={activeSubId} activeSubSubId={activeSubSubId} onMenuClick={handleMenuClick} onClose={handleClosePopup} position={popupPosition} t={t} />}
        </>
      )}
    </aside>
  );
};
export default Sidebar;
