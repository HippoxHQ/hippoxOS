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
  onOpenSkillsManager,
  t,
}) => {
  const [activeId, setActiveId] = React.useState("history");
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
    if (id === "skillsManager") {
      setActiveId("skillsManager");
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onOpenSkillsManager) onOpenSkillsManager();
      return;
    }
    if (id === "userProfile") {
      setActiveId("userProfile");
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick("userProfile");
      return;
    }
    if (id === "codeEditor") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
      return;
    }
    if (id === "settings" && subId) {
      const configId = subId;
      setActiveId(configId);
      if (
        configId === "engine_database" ||
        configId === "engine_network" ||
        configId === "engine_container" ||
        configId === "engine_notification"
      ) {
        setActiveSubId(undefined);
        setActiveSubSubId(configId);
      } else {
        setActiveSubId(configId);
        setActiveSubSubId(undefined);
      }
      if (onMenuClick) onMenuClick("settings", configId);
      return;
    }
    if (
      id === "llmModel" ||
      id === "drivers" ||
      id === "universal" ||
      id === "workspaceConfig" ||
      id === "storage" ||
      id === "engine_database" ||
      id === "engine_network" ||
      id === "engine_container" ||
      id === "engine_notification"
    ) {
      setActiveId(id);
      if (
        id === "engine_database" ||
        id === "engine_network" ||
        id === "engine_container" ||
        id === "engine_notification"
      ) {
        setActiveSubId(undefined);
        setActiveSubSubId(id);
      } else {
        setActiveSubId(id);
        setActiveSubSubId(undefined);
      }
      if (onMenuClick) onMenuClick("settings", id);
      return;
    }
    if (id === "workspace") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
    } else if (id === "history" || id === "favorites") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
    } else if (id === "skillMarket" || id === "skills") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
    } else if (id === "logs") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
    } else if (id === "skills_group") {
      setActiveId("skills");
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick("skills");
    } else if (id === "tasks_group") {
      setActiveId("scheduledTasks");
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick("scheduledTasks");
    } else if (id === "settings_group") {
      setActiveId("llmModel");
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick("settings", "llmModel");
    } else {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
    }
  };

  const handleIconClick = (
    itemId: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const directOpenItems = [
      "skillsManager",
      "tasks_group",
      "history",
      "codeEditor",
      "favorites",
      "workspace",
      "logs",
      "skillMarket",
      "userProfile",
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
      if (itemId === "skills_group") {
        setActiveId("skills_group");
      } else if (itemId === "settings_group") {
        setActiveId("settings_group");
      }
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
      return t("menu.userProfile") || "个人资料";
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
        // transition: "width 0.2s ease, opacity 0.2s ease",
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
              label={t("menu.userProfile") || "个人资料"}
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
