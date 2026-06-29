import React, { useEffect, useRef } from "react";
import { PopupMenu, SidebarButton } from "./components";
import { SidebarProps } from "./types";
import { NewSessionIcon } from "../../icons";
import { showTooltipOnElement } from "../Tooltip";
import { topMenuItems, bottomMenuItems, allMenuItems } from "./constants";
import { sidebarStyles } from "./sidebarStyles";
import { usePopupMenu } from "./hooks/usePopupMenu";

if (typeof document !== "undefined") {
  const styleId = "sidebar-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = sidebarStyles;
    document.head.appendChild(style);
  }
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onResetSession,
  onClearLogs,
  onMenuClick,
  onNewSession,
  currentSessionId,
  onSwitchSession,
  t,
}) => {
  const [activeId, setActiveId] = React.useState("generalChat");
  const [activeSubId, setActiveSubId] = React.useState<string>();
  const [activeSubSubId, setActiveSubSubId] = React.useState<string>();
  const {
    popupVisible,
    popupPosition,
    activeIconId,
    iconRefs,
    handleClosePopup,
    showPopup,
    isPopupVisible,
  } = usePopupMenu();

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

  const handleIconClick = (
    itemId: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
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
    ];

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

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLButtonElement>,
    label: string,
  ) => {
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
      return (
        activeId === "skills_group" ||
        activeId === "skills" ||
        activeId === "skillMarket"
      );
    }
    if (itemId === "tasks_group") {
      return (
        activeId === "tasks_group" ||
        activeId === "scheduledTasks" ||
        activeId === "taskQueue"
      );
    }
    if (itemId === "settings_group") {
      return (
        activeId === "settings_group" ||
        activeSubId !== undefined ||
        activeSubSubId !== undefined
      );
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
            <button
              className="new-session-icon-btn"
              onClick={handleNewSessionClick}
              onMouseEnter={(e) => handleMouseEnter(e, t("actions.newSession"))}
              onMouseLeave={handleMouseLeave}
            >
              <NewSessionIcon size={18} />
            </button>
          </div>
          <nav className="sidebar-nav-top">
            {topMenuItems.map((item) => renderButton(item))}
          </nav>
          <nav
            className="sidebar-nav-bottom"
            style={{ flexDirection: "column-reverse" }}
          >
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
          {popupVisible && activeIconId && (
            <PopupMenu
              items={allMenuItems.filter((item) => item.id === activeIconId)}
              activeId={activeId}
              activeSubId={activeSubId}
              activeSubSubId={activeSubSubId}
              onMenuClick={handleMenuClick}
              onClose={handleClosePopup}
              position={popupPosition}
              t={t}
            />
          )}
        </>
      )}
    </aside>
  );
};

export default Sidebar;
