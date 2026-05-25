import React, { useState, useEffect } from "react";
import { iconMap, ChevronIcon, NewSessionIcon } from "../icons";

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
    width: 10% !important;
    min-width: 180px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    transition: width 0.2s ease;
    overflow: hidden;
    user-select: none;
  }

  .sidebar.collapsed {
    width: 60px !important;
    min-width: 60px;
  }

  .sidebar-header {
    padding: 8px 12px !important;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 40px;
    flex-shrink: 0;
  }

  .sidebar.collapsed .sidebar-header {
    padding: 12px 8px !important;
  }

  .header-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 8px 12px !important;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    width: 100%;
  }

  .sidebar.collapsed .header-action-btn {
    padding: 8px 0 !important;
  }

  .sidebar.collapsed .header-action-btn .action-label {
    display: none;
  }

  .header-action-btn:hover {
    background: var(--hover-bg);
    border-color: var(--text-secondary);
  }

  .action-icon {
    font-size: 14px;
  }

  .action-label {
    font-size: 12px;
  }

  .sidebar-nav {
    flex: 1;
    padding: 8px 0 !important;
    margin: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .sidebar.collapsed .sidebar-nav {
    padding: 8px 0 !important;
    overflow-y: auto;
  }

  .nav-item-parent {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px !important;
    margin: 0 !important;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
    width: 100%;
    box-sizing: border-box;
  }

  .nav-item-parent:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .nav-item-parent .nav-item-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .nav-item-parent .chevron {
    transition: transform 0.2s;
    color: var(--text-muted);
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .nav-item-parent .chevron.open {
    transform: rotate(90deg);
  }

  .sub-menu {
    display: flex;
    flex-direction: column;
    margin: 0;
    width: 100%;
  }

  .sub-nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 16px 6px 25px !important;
    margin: 0 !important;
    border-radius: 0 !important;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
    width: 100%;
    box-sizing: border-box;
  }

  .sub-sub-menu {
    display: flex;
    flex-direction: column;
    margin: 0;
    width: 100%;
  }

  .sub-sub-nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 16px 6px 40px !important;
    margin: 0 !important;
    border-radius: 0 !important;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
    width: 100%;
    box-sizing: border-box;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px !important;
    margin: 0 !important;
    border-radius: 0 !important;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
    width: 100%;
    box-sizing: border-box;
  }

  .nav-item.active,
  .sub-nav-item.active,
  .sub-sub-nav-item.active {
    background: var(--hover-bg) !important;
    color: var(--text-primary) !important;
    font-weight: 500;
  }

  .nav-item.active .nav-icon,
  .sub-nav-item.active .sub-nav-icon,
  .sub-sub-nav-item.active .sub-sub-nav-icon {
    color: var(--text-primary) !important;
  }

  .nav-item.active .nav-label,
  .sub-nav-item.active .sub-nav-label,
  .sub-sub-nav-item.active .sub-sub-nav-label {
    color: var(--text-primary) !important;
    font-weight: 500;
  }

  .nav-item:hover,
  .sub-nav-item:hover,
  .sub-sub-nav-item:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .chevron {
   color: var(--text-muted);
   transition: transform 0.2s;
  }

  .chevron.open {
   transform: rotate(90deg);
  }
  
  .sidebar.collapsed .nav-item-parent .chevron {
    display: none;
  }

  .sidebar.collapsed .nav-item-parent .nav-label {
    display: none;
  }

  .sidebar.collapsed .nav-item-parent {
    justify-content: center;
    padding: 10px 0 !important;
  }

  .sidebar.collapsed .nav-item,
  .sidebar.collapsed .sub-nav-item,
  .sidebar.collapsed .sub-sub-nav-item {
    justify-content: center;
    padding: 10px 0 !important;
  }

  .sidebar.collapsed .nav-label,
  .sidebar.collapsed .sub-nav-label,
  .sidebar.collapsed .sub-sub-nav-label {
    display: none;
  }

  .sidebar.collapsed .nav-badge,
  .sidebar.collapsed .sub-nav-badge,
  .sidebar.collapsed .sub-sub-nav-badge {
    display: none;
  }

  .sidebar.collapsed .sub-menu,
  .sidebar.collapsed .sub-sub-menu {
    display: none;
  }

  .nav-icon,
  .sub-nav-icon,
  .sub-sub-nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
  }

  .nav-label,
  .sub-nav-label,
  .sub-sub-nav-label {
    font-size: 13px;
    flex: 1;
  }

  .nav-badge,
  .sub-nav-badge,
  .sub-sub-nav-badge {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
  }

  .nav-item.active .nav-badge,
  .sub-nav-item.active .sub-nav-badge,
  .sub-sub-nav-item.active .sub-sub-nav-badge {
    background: var(--border-color);
    color: var(--text-primary);
  }

  .sidebar-footer {
    padding: 12px;
    border-top: 1px solid var(--border-color);
  }

  .sidebar.collapsed .sidebar-footer {
    padding: 10px 6px;
  }

  .sidebar.collapsed .runtime-info {
    display: none;
  }

  .runtime-info {
    font-size: 10px;
    color: var(--text-muted);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .runtime-info-collapsed {
    font-size: 8px;
    color: var(--text-muted);
    text-align: center;
    word-break: break-word;
  }

  .sidebar-nav-collapsed {
    flex: 1;
    padding: 12px 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .nav-item-collapsed {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
    position: relative;
  }

  .nav-item-collapsed .nav-icon svg {
    width: 20px;
    height: 20px;
  }

  .nav-item-collapsed:hover,
  .nav-item-collapsed.active {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .nav-badge-collapsed {
    position: absolute;
    top: 2px;
    right: 8px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 8px;
    padding: 1px 4px;
    border-radius: 8px;
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

const menuConfig: MenuItem[] = [
  { id: "history", icon: "history", label: "menu.history" },
  { id: "favorites", icon: "favorites", label: "menu.favorites" },
  { id: "workspace", icon: "workspace", label: "menu.workspace" },
  {
    id: "skills_group",
    icon: "skills",
    label: "menu.skillsGroup",
    children: [
      { id: "skillMarket", icon: "skillMarket", label: "menu.skillMarket" },
      { id: "skills", icon: "skills", label: "menu.skills" },
    ],
  },
  {
    id: "tasks_group",
    icon: "tasks",
    label: "menu.tasksGroup",
    children: [
      {
        id: "scheduledTasks",
        icon: "scheduledTasks",
        label: "menu.scheduledTasks",
      },
      { id: "taskQueue", icon: "taskQueue", label: "menu.taskQueue" },
    ],
  },
  {
    id: "settings_group",
    icon: "settings",
    label: "menu.settings",
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
        ],
      },
    ],
  },
];

const getIcon = (iconName: string) => {
  const IconComponent = iconMap[iconName];
  return IconComponent ? <IconComponent /> : null;
};

interface MenuItemComponentProps {
  item: MenuItem;
  collapsed: boolean;
  activeId: string;
  activeSubId?: string;
  activeSubSubId?: string;
  onMenuClick: (id: string, subId?: string, subSubId?: string) => void;
  t: (key: string) => string;
  engineGroupOpen: boolean;
  systemGroupOpen: boolean;
  onToggleEngineGroup: (open: boolean) => void;
  onToggleSystemGroup: (open: boolean) => void;
}

const SubMenuRenderer: React.FC<{
  children: MenuItem[];
  activeSubSubId?: string;
  onMenuClick: (id: string, subId?: string, subSubId?: string) => void;
  t: (key: string) => string;
  engineGroupOpen: boolean;
  systemGroupOpen: boolean;
  onToggleEngineGroup: (open: boolean) => void;
  onToggleSystemGroup: (open: boolean) => void;
}> = ({
  children,
  activeSubSubId,
  onMenuClick,
  t,
  engineGroupOpen,
  systemGroupOpen,
  onToggleEngineGroup,
  onToggleSystemGroup,
}) => {
  const toggleSubMenu = (menuId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuId === "engine_group") {
      onToggleEngineGroup(!engineGroupOpen);
    } else if (menuId === "system_group") {
      onToggleSystemGroup(!systemGroupOpen);
    }
  };

  return (
    <>
      {children.map((child) => {
        const ChildIcon = iconMap[child.icon];

        if (child.id === "engine_group") {
          return (
            <div key={child.id}>
              <div
                className="sub-nav-item"
                onClick={(e) => toggleSubMenu(child.id, e)}
              >
                <span className="sub-nav-icon">
                  {ChildIcon && <ChildIcon size={16} />}
                </span>
                <span className="sub-nav-label">{t(child.label)}</span>
                <ChevronIcon
                  className={`chevron ${engineGroupOpen ? "open" : ""}`}
                />
              </div>
              {engineGroupOpen && (
                <div className="sub-sub-menu">
                  {child.children!.map((grandChild) => {
                    const GrandChildIcon = iconMap[grandChild.icon];
                    return (
                      <div
                        key={grandChild.id}
                        className={`sub-sub-nav-item ${activeSubSubId === grandChild.id ? "active" : ""}`}
                        onClick={() => onMenuClick(grandChild.id)}
                      >
                        <span className="sub-sub-nav-icon">
                          {GrandChildIcon && <GrandChildIcon size={16} />}
                        </span>
                        <span className="sub-sub-nav-label">
                          {t(grandChild.label)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        if (child.id === "system_group") {
          return (
            <div key={child.id}>
              <div
                className="sub-nav-item"
                onClick={(e) => toggleSubMenu(child.id, e)}
              >
                <span className="sub-nav-icon">
                  {ChildIcon && <ChildIcon size={16} />}
                </span>
                <span className="sub-nav-label">{t(child.label)}</span>
                <ChevronIcon
                  className={`chevron ${systemGroupOpen ? "open" : ""}`}
                />
              </div>
              {systemGroupOpen && (
                <div className="sub-sub-menu">
                  {child.children!.map((grandChild) => {
                    const GrandChildIcon = iconMap[grandChild.icon];
                    return (
                      <div
                        key={grandChild.id}
                        className={`sub-sub-nav-item ${activeSubSubId === grandChild.id ? "active" : ""}`}
                        onClick={() =>
                          onMenuClick(grandChild.id, undefined, grandChild.id)
                        }
                      >
                        <span className="sub-sub-nav-icon">
                          {GrandChildIcon && <GrandChildIcon size={16} />}
                        </span>
                        <span className="sub-sub-nav-label">
                          {t(grandChild.label)}
                        </span>
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
            className={`sub-nav-item ${activeSubSubId === child.id ? "active" : ""}`}
            onClick={() => onMenuClick(child.id)}
          >
            <span className="sub-nav-icon">
              {ChildIcon && <ChildIcon size={16} />}
            </span>
            <span className="sub-nav-label">{t(child.label)}</span>
          </div>
        );
      })}
    </>
  );
};

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({
  item,
  collapsed,
  activeId,
  activeSubId,
  activeSubSubId,
  onMenuClick,
  t,
  engineGroupOpen,
  systemGroupOpen,
  onToggleEngineGroup,
  onToggleSystemGroup,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const IconComponent = iconMap[item.icon];

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onMenuClick(item.id);
    }
  };

  if (collapsed) {
    if (hasChildren) {
      return (
        <div
          className="nav-item-parent"
          onClick={handleClick}
          title={t(item.label)}
        >
          <div className="nav-item-content">
            <span className="nav-icon">
              {IconComponent && <IconComponent />}
            </span>
          </div>
        </div>
      );
    }
    return (
      <div
        className={`nav-item ${activeId === item.id ? "active" : ""}`}
        onClick={handleClick}
        title={t(item.label)}
      >
        <span className="nav-icon">{IconComponent && <IconComponent />}</span>
        {item.badge && (
          <span className="nav-badge-collapsed">{item.badge}</span>
        )}
      </div>
    );
  }
  if (item.id === "settings_group" && hasChildren && isOpen) {
    return (
      <>
        <div className="nav-item-parent" onClick={handleClick}>
          <div className="nav-item-content">
            <span className="nav-icon">
              {IconComponent && <IconComponent />}
            </span>
            <span className="nav-label">{t(item.label)}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </div>
          {hasChildren && (
            <ChevronIcon className={`chevron ${isOpen ? "open" : ""}`} />
          )}
        </div>
        <div className="sub-menu">
          <SubMenuRenderer
            children={item.children!}
            activeSubSubId={activeSubSubId}
            onMenuClick={onMenuClick}
            t={t}
            engineGroupOpen={engineGroupOpen}
            systemGroupOpen={systemGroupOpen}
            onToggleEngineGroup={onToggleEngineGroup}
            onToggleSystemGroup={onToggleSystemGroup}
          />
        </div>
      </>
    );
  }
  if (
    (item.id === "skills_group" || item.id === "tasks_group") &&
    hasChildren &&
    isOpen
  ) {
    return (
      <>
        <div className="nav-item-parent" onClick={handleClick}>
          <div className="nav-item-content">
            <span className="nav-icon">
              {IconComponent && <IconComponent />}
            </span>
            <span className="nav-label">{t(item.label)}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </div>
          {hasChildren && (
            <ChevronIcon className={`chevron ${isOpen ? "open" : ""}`} />
          )}
        </div>
        <div className="sub-menu">
          {item.children!.map((child) => {
            const ChildIcon = iconMap[child.icon];
            return (
              <div
                key={child.id}
                className={`sub-nav-item ${activeId === child.id ? "active" : ""}`}
                onClick={() => onMenuClick(child.id)}
              >
                <span className="sub-nav-icon">
                  {ChildIcon && <ChildIcon size={16} />}
                </span>
                <span className="sub-nav-label">{t(child.label)}</span>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="nav-item-parent" onClick={handleClick}>
        <div className="nav-item-content">
          <span className="nav-icon">{IconComponent && <IconComponent />}</span>
          <span className="nav-label">{t(item.label)}</span>
          {item.badge && <span className="nav-badge">{item.badge}</span>}
        </div>
        {hasChildren && (
          <ChevronIcon className={`chevron ${isOpen ? "open" : ""}`} />
        )}
      </div>
      {hasChildren && isOpen && (
        <div className="sub-menu">
          {item.children!.map((child) => {
            const ChildIcon = iconMap[child.icon];
            return (
              <div
                key={child.id}
                className={`sub-nav-item ${activeId === child.id ? "active" : ""}`}
                onClick={() => onMenuClick(child.id)}
              >
                <span className="sub-nav-icon">
                  {ChildIcon && <ChildIcon size={16} />}
                </span>
                <span className="sub-nav-label">{t(child.label)}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
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
  const [engineGroupOpen, setEngineGroupOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("sidebar-engine-group-open");
    return saved !== null ? saved === "true" : false;
  });
  const [systemGroupOpen, setSystemGroupOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("sidebar-system-group-open");
    return saved !== null ? saved === "true" : false;
  });
  useEffect(() => {
    localStorage.setItem("sidebar-engine-group-open", String(engineGroupOpen));
  }, [engineGroupOpen]);
  useEffect(() => {
    localStorage.setItem("sidebar-system-group-open", String(systemGroupOpen));
  }, [systemGroupOpen]);
  const handleMenuClick = (id: string, subId?: string, subSubId?: string) => {
    if (id === "workspace") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
    } else if (id === "workspaceConfig") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(id);
      if (onMenuClick) onMenuClick("settings", id);
    } else if (id === "history" || id === "favorites") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
    } else if (id === "skillMarket" || id === "skills" || id === "knowledge") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
    } else if (
      id === "scheduledTasks" ||
      id === "taskQueue" ||
      id === "executionHistory"
    ) {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick(id);
    } else if (id === "llmModel" || id === "atomicSkills") {
      setActiveId(id);
      setActiveSubId(id);
      setActiveSubSubId(undefined);
      if (onMenuClick) onMenuClick("settings", id);
    } else if (id === "interface") {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(id);
      if (onMenuClick) onMenuClick("settings", id);
    } else if (
      id === "engine_database" ||
      id === "engine_network" ||
      id === "engine_container" ||
      id === "engine_notification"
    ) {
      setActiveId(id);
      setActiveSubId(undefined);
      setActiveSubSubId(id);
      if (onMenuClick) onMenuClick("settings", id);
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

  const handleNewSessionClick = () => {
    if (onNewSession) onNewSession();
    else onResetSession();
  };

  if (collapsed) {
    return (
      <aside className="sidebar collapsed">
        <div className="sidebar-header">
          <button
            className="header-action-btn"
            onClick={handleNewSessionClick}
            title={t("actions.newSession")}
          >
            <NewSessionIcon size={14} />
            <span className="action-label">{t("actions.newSession")}</span>
          </button>
        </div>
        <nav className="sidebar-nav-collapsed">
          {menuConfig.map((item) => {
            const IconComponent = iconMap[item.icon];
            const isActive =
              activeId === item.id ||
              (item.id === "settings_group" && (activeSubId || activeSubSubId));
            return (
              <div
                key={item.id}
                className={`nav-item-collapsed ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (item.id === "settings_group" && item.children?.length) {
                    handleMenuClick("llmModel");
                  } else if (item.id === "workspace") {
                    handleMenuClick("workspace");
                  } else if (
                    item.id === "skills_group" &&
                    item.children?.length
                  ) {
                    handleMenuClick("skills");
                  } else if (
                    item.id === "tasks_group" &&
                    item.children?.length
                  ) {
                    handleMenuClick("scheduledTasks");
                  } else if (item.children?.length) {
                    handleMenuClick(item.id, item.children[0].id);
                  } else {
                    handleMenuClick(item.id);
                  }
                }}
                title={t(item.label)}
              >
                <span className="nav-icon">
                  {IconComponent && <IconComponent />}
                </span>
                {item.badge && (
                  <span className="nav-badge-collapsed">{item.badge}</span>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button
          className="header-action-btn"
          onClick={handleNewSessionClick}
          title={t("actions.newSession")}
        >
          <NewSessionIcon size={14} />
          <span className="action-label">{t("actions.newSession")}</span>
        </button>
      </div>
      <nav className="sidebar-nav">
        {menuConfig.map((item) => (
          <MenuItemComponent
            key={item.id}
            item={item}
            collapsed={collapsed}
            activeId={activeId}
            activeSubId={activeSubId}
            activeSubSubId={activeSubSubId}
            onMenuClick={handleMenuClick}
            t={t}
            engineGroupOpen={engineGroupOpen}
            systemGroupOpen={systemGroupOpen}
            onToggleEngineGroup={setEngineGroupOpen}
            onToggleSystemGroup={setSystemGroupOpen}
          />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
