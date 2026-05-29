import React, { useState, useEffect, useRef, JSX } from "react";
import { iconMap, NewSessionIcon } from "../icons";
import { showTooltipOnElement } from "./Tooltip";

interface PopupMenuProps {
  items: MenuItemWithSection[];
  activeId: string;
  activeSubId?: string;
  activeSubSubId?: string;
  onMenuClick: (id: string, subId?: string, subSubId?: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
  t: (key: string) => string;
}

interface SidebarProps {
  collapsed: boolean;
  onResetSession: () => void;
  onClearLogs: () => void;
  onMenuClick?: (view: string, subView?: string, subSubView?: string) => void;
  onNewSession?: () => void;
  currentSessionId?: string;
  onSwitchSession?: (sessionId: string) => void;
  t: (key: string, params?: any) => string;
}

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  badge?: string;
  children?: MenuItem[];
}

const sidebarStyles = `
  .sidebar {
    width: 48px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    user-select: none;
    z-index: 100;
    position: relative;
    justify-content: space-between;
  }

  .sidebar-header {
    padding: 9px 0;
    border-bottom: 1px solid var(--border-color);
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .new-session-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .new-session-icon-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .sidebar-nav-top {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 0;
  }

  .sidebar-nav-bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 0;
    border-top: 1px solid var(--border-color);
  }

  .sidebar-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s ease;
    position: relative;
  }

  .sidebar-icon-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .sidebar-icon-btn.active {
    background: var(--accent-color);
    color: white;
  }

  .icon-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    background: var(--accent-color);
    border-radius: 50%;
    border: 1px solid var(--bg-secondary);
  }

  .menu-popup {
    position: fixed;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    width: 280px;
    max-height: 500px;
    overflow-y: auto;
    z-index: 201;
    padding: 8px 0;
  }

  .menu-popup::-webkit-scrollbar {
    width: 4px;
  }

  .menu-popup::-webkit-scrollbar-track {
    background: transparent;
  }

  .menu-popup::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }

  .popup-section-title {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--text-tertiary);
    padding: 8px 12px 4px 12px;
  }

  .popup-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    margin: 0 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: var(--text-secondary);
    border-radius: 6px;
    font-size: 13px;
  }

  .popup-menu-item:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .popup-menu-item.active {
    background: var(--accent-color);
    color: white;
  }

  .popup-menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .popup-menu-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .popup-menu-badge {
    background: var(--accent-color);
    color: white;
    font-size: 10px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 12px;
    min-width: 18px;
    text-align: center;
  }

  .popup-menu-item.active .popup-menu-badge {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .popup-menu-item.has-children {
    justify-content: space-between;
  }

  .popup-chevron {
    transition: transform 0.2s ease;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .popup-chevron.open {
    transform: rotate(90deg);
  }

  .popup-sub-menu {
    margin-left: 32px;
    display: flex;
    flex-direction: column;
  }

  .popup-sub-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px 6px 0;
    margin: 0 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: var(--text-tertiary);
    border-radius: 6px;
    font-size: 12px;
  }

  .popup-sub-item:hover {
    background: var(--hover-bg);
    color: var(--text-secondary);
  }

  .popup-sub-item.active {
    background: var(--accent-color);
    color: white;
  }

  .popup-sub-icon {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .popup-sub-sub-menu {
    margin-left: 28px;
    display: flex;
    flex-direction: column;
  }

  .popup-sub-sub-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 12px 5px 0;
    margin: 0 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: var(--text-tertiary);
    border-radius: 6px;
    font-size: 11px;
  }

  .popup-sub-sub-item:hover {
    background: var(--hover-bg);
    color: var(--text-secondary);
  }

  .popup-sub-sub-item.active {
    background: var(--accent-color);
    color: white;
  }

  .popup-divider {
    height: 1px;
    background: var(--border-color);
    margin: 8px 12px;
  }
`;

if (typeof document !== "undefined") {
  const styleId = "sidebar-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = sidebarStyles;
    document.head.appendChild(style);
  }
}

interface MenuItemWithSection extends MenuItem {
  section?: "main" | "ai" | "config";
}

const topMenuItems: MenuItemWithSection[] = [
  { id: "history", icon: "history", label: "menu.history", section: "main" },
  {
    id: "favorites",
    icon: "favorites",
    label: "menu.favorites",
    section: "main",
  },
  {
    id: "workspace",
    icon: "workspace",
    label: "menu.workspace",
    section: "main",
  },
  {
    id: "skills_group",
    icon: "skills",
    label: "menu.skillsGroup",
    section: "ai",
    children: [
      { id: "skillMarket", icon: "skillMarket", label: "menu.skillMarket" },
      { id: "skills", icon: "skills", label: "menu.skills" },
    ],
  },
  {
    id: "tasks_group",
    icon: "tasks",
    label: "menu.tasksGroup",
    section: "ai",
    children: [
      {
        id: "scheduledTasks",
        icon: "scheduledTasks",
        label: "menu.scheduledTasks",
      },
      { id: "taskQueue", icon: "taskQueue", label: "menu.taskQueue" },
    ],
  },
  { id: "logs", icon: "logs", label: "menu.logs", section: "config" },
];

const bottomMenuItems: MenuItemWithSection[] = [
  {
    id: "settings_group",
    icon: "settings",
    label: "menu.settings",
    section: "config",
    children: [
      { id: "llmModel", icon: "settings", label: "menu.llmModelConfig" },
      { id: "atomicSkills", icon: "skills", label: "menu.atomicSkills" },
      {
        id: "engine_group",
        icon: "config",
        label: "menu.engineConfig",
        children: [
          {
            id: "engine_database",
            icon: "database",
            label: "settings.tab.database",
          },
          {
            id: "engine_network",
            icon: "network",
            label: "settings.tab.network",
          },
          {
            id: "engine_container",
            icon: "container",
            label: "settings.tab.container",
          },
          {
            id: "engine_notification",
            icon: "notification",
            label: "settings.tab.notification",
          },
        ],
      },
      {
        id: "system_group",
        icon: "config",
        label: "menu.systemConfig",
        children: [
          {
            id: "interface",
            icon: "config",
            label: "settings.interfaceConfig",
          },
          {
            id: "workspaceConfig",
            icon: "config",
            label: "settings.workspaceConfig",
          },
          { id: "storage", icon: "config", label: "menu.storage" },
        ],
      },
    ],
  },
];

const allMenuItems = [...topMenuItems, ...bottomMenuItems];

const PopupMenu: React.FC<PopupMenuProps> = ({
  items,
  activeId,
  activeSubId,
  activeSubSubId,
  onMenuClick,
  onClose,
  position,
  t,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const initOpen = (menuItems: MenuItemWithSection[]) => {
      menuItems.forEach((item) => {
        if (item.children && item.children.length > 0) {
          initial[item.id] = true;
          initOpen(item.children);
        }
      });
    };
    initOpen(items);
    return initial;
  });

  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 8;
      let { top, left } = position;
      if (left + rect.width > viewportWidth - gap) {
        left = viewportWidth - rect.width - gap;
      }
      if (left < gap) {
        left = gap;
      }
      if (top + rect.height > viewportHeight - gap) {
        top = viewportHeight - rect.height - gap;
      }
      if (top < gap) {
        top = gap;
      }
      setAdjustedPosition({ top, left });
    }
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderMenuItems = (menuItems: MenuItemWithSection[]) => {
    const result: JSX.Element[] = [];
    let lastSection = "";

    const processItem = (
      item: MenuItemWithSection,
      isInsideSettings = false,
    ) => {
      const section = item.section || "main";
      if (item.id === "settings_group" && item.children) {
        item.children.forEach((child) =>
          processItem(child as MenuItemWithSection, true),
        );
        return;
      }
      if (item.id === "skills_group" && item.children) {
        item.children.forEach((child) =>
          processItem(child as MenuItemWithSection, isInsideSettings),
        );
        return;
      }
      if (item.id === "tasks_group" && item.children) {
        item.children.forEach((child) =>
          processItem(child as MenuItemWithSection, isInsideSettings),
        );
        return;
      }
      if (!isInsideSettings && section !== lastSection) {
        lastSection = section;
      }
      const hasChildren = item.children && item.children.length > 0;
      const IconComp = iconMap[item.icon];
      const isActive = activeId === item.id;
      const isOpen = openGroups[item.id] || false;
      if (hasChildren) {
        result.push(
          <div key={item.id}>
            <div
              className="popup-menu-item has-children"
              onClick={(e) => toggleGroup(item.id, e)}
            >
              <span className="popup-menu-icon">
                {IconComp && <IconComp size={16} />}
              </span>
              <span className="popup-menu-label">{t(item.label)}</span>
              <span className={`popup-chevron ${isOpen ? "open" : ""}`}>▶</span>
            </div>
            {isOpen && (
              <div className="popup-sub-menu">
                {item.children!.map((child) => {
                  const ChildIcon = iconMap[child.icon];
                  const hasGrandChildren =
                    child.children && child.children.length > 0;

                  if (hasGrandChildren) {
                    const isGrandOpen = openGroups[child.id] || false;
                    return (
                      <div key={child.id}>
                        <div
                          className="popup-sub-item"
                          style={{ justifyContent: "space-between" }}
                          onClick={(e) => toggleGroup(child.id, e)}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <span className="popup-sub-icon">
                              {ChildIcon && <ChildIcon size={14} />}
                            </span>
                            <span>{t(child.label)}</span>
                          </span>
                          <span
                            className={`popup-chevron ${isGrandOpen ? "open" : ""}`}
                          >
                            ▶
                          </span>
                        </div>
                        {isGrandOpen && (
                          <div className="popup-sub-sub-menu">
                            {child.children!.map((grandChild) => {
                              const GrandIcon = iconMap[grandChild.icon];
                              return (
                                <div
                                  key={grandChild.id}
                                  className={`popup-sub-sub-item ${activeSubSubId === grandChild.id ? "active" : ""}`}
                                  onClick={() => {
                                    onMenuClick("settings", grandChild.id);
                                  }}
                                >
                                  <span className="popup-sub-icon">
                                    {GrandIcon && <GrandIcon size={12} />}
                                  </span>
                                  <span>{t(grandChild.label)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={child.id}
                      className={`popup-sub-item ${activeSubId === child.id || activeId === child.id ? "active" : ""}`}
                      onClick={() => {
                        if (
                          child.id === "llmModel" ||
                          child.id === "atomicSkills" ||
                          child.id === "interface" ||
                          child.id === "workspaceConfig" ||
                          child.id === "storage"
                        ) {
                          onMenuClick("settings", child.id);
                        } else if (
                          child.id === "skillMarket" ||
                          child.id === "skills"
                        ) {
                          onMenuClick(child.id);
                        } else if (
                          child.id === "scheduledTasks" ||
                          child.id === "taskQueue"
                        ) {
                          onMenuClick(child.id);
                        } else {
                          onMenuClick(child.id);
                        }
                      }}
                    >
                      <span className="popup-sub-icon">
                        {ChildIcon && <ChildIcon size={14} />}
                      </span>
                      <span>{t(child.label)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>,
        );
      } else {
        result.push(
          <div
            key={item.id}
            className={`popup-menu-item ${isActive ? "active" : ""}`}
            onClick={() => {
              if (
                item.id === "llmModel" ||
                item.id === "atomicSkills" ||
                item.id === "interface" ||
                item.id === "workspaceConfig" ||
                item.id === "storage"
              ) {
                onMenuClick("settings", item.id);
              } else if (
                item.id === "engine_database" ||
                item.id === "engine_network" ||
                item.id === "engine_container" ||
                item.id === "engine_notification"
              ) {
                onMenuClick("settings", item.id);
              } else if (item.id === "workspace") {
                onMenuClick(item.id);
              } else if (item.id === "history" || item.id === "favorites") {
                onMenuClick(item.id);
              } else if (item.id === "skillMarket" || item.id === "skills") {
                onMenuClick(item.id);
              } else if (
                item.id === "scheduledTasks" ||
                item.id === "taskQueue"
              ) {
                onMenuClick(item.id);
              } else if (item.id === "logs") {
                onMenuClick(item.id);
              } else {
                onMenuClick(item.id);
              }
            }}
          >
            <span className="popup-menu-icon">
              {IconComp && <IconComp size={16} />}
            </span>
            <span className="popup-menu-label">{t(item.label)}</span>
            {item.badge && (
              <span className="popup-menu-badge">{item.badge}</span>
            )}
          </div>,
        );
      }
    };
    menuItems.forEach((item) => processItem(item));
    return result;
  };
  return (
    <div
      ref={popupRef}
      className="menu-popup"
      style={{ top: adjustedPosition.top, left: adjustedPosition.left }}
    >
      {renderMenuItems(items)}
    </div>
  );
};

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
  const [activeId, setActiveId] = useState("history");
  const [activeSubId, setActiveSubId] = useState<string>();
  const [activeSubSubId, setActiveSubSubId] = useState<string>();
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [activeIconId, setActiveIconId] = useState<string | null>(null);
  const iconRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleMenuClick = (id: string, subId?: string, subSubId?: string) => {
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
      id === "atomicSkills" ||
      id === "interface" ||
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
    } else if (id === "scheduledTasks" || id === "taskQueue") {
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
    if (
      itemId === "history" ||
      itemId === "favorites" ||
      itemId === "workspace"
    ) {
      if (popupVisible) {
        setPopupVisible(false);
        setActiveIconId(null);
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
    if (
      itemId === "skills_group" ||
      itemId === "tasks_group" ||
      itemId === "settings_group"
    ) {
      if (popupVisible && activeIconId === itemId) {
        setPopupVisible(false);
        setActiveIconId(null);
        return;
      }
      if (itemId === "skills_group") {
        setActiveId("skills_group");
      } else if (itemId === "tasks_group") {
        setActiveId("tasks_group");
      } else if (itemId === "settings_group") {
        setActiveId("settings_group");
      }
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      setActiveIconId(itemId);
      setPopupPosition(position);
      setPopupVisible(true);
      return;
    }
    if (popupVisible && activeIconId === itemId) {
      setPopupVisible(false);
      setActiveIconId(null);
    } else {
      if (popupVisible) {
        setPopupVisible(false);
        setActiveIconId(null);
      }
      setActiveIconId(itemId);
      setPopupPosition(position);
      setPopupVisible(true);
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

  const handleClosePopup = () => {
    setPopupVisible(false);
    setActiveIconId(null);
  };

  const isIconActive = (itemId: string): boolean => {
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

  const renderButton = (item: MenuItemWithSection) => {
    const IconComp = iconMap[item.icon];
    const isActive = isIconActive(item.id);
    const label = t(item.label);
    return (
      <button
        key={item.id}
        ref={(el) => {
          if (el) iconRefs.current.set(item.id, el);
          else iconRefs.current.delete(item.id);
        }}
        className={`sidebar-icon-btn ${isActive ? "active" : ""}`}
        onClick={(e) => handleIconClick(item.id, e)}
        onMouseEnter={(e) => handleMouseEnter(e, label)}
        onMouseLeave={handleMouseLeave}
      >
        {IconComp && <IconComp size={18} />}
        {item.badge && <span className="icon-badge" />}
      </button>
    );
  };

  return (
    <aside className="sidebar">
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
    </aside>
  );
};

export default Sidebar;
