import React, { useState } from "react";
import { iconMap, ChevronIcon, NewSessionIcon } from "../icons";

interface SidebarProps {
  collapsed: boolean;
  onResetSession: () => void;
  onClearLogs: () => void;
  onMenuClick?: (view: string, subView?: string) => void;
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
  .sub-nav-item.active {
    background: var(--hover-bg) !important;
    color: var(--text-primary) !important;
    font-weight: 500;
  }

  .nav-item.active .nav-icon,
  .sub-nav-item.active .sub-nav-icon {
    color: var(--text-primary) !important;
  }

  .nav-item.active .nav-label,
  .sub-nav-item.active .sub-nav-label {
    color: var(--text-primary) !important;
    font-weight: 500;
  }

  .nav-item:hover,
  .sub-nav-item:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
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
  .sidebar.collapsed .sub-nav-item {
    justify-content: center;
    padding: 10px 0 !important;
  }

  .sidebar.collapsed .nav-label,
  .sidebar.collapsed .sub-nav-label {
    display: none;
  }

  .sidebar.collapsed .nav-badge,
  .sidebar.collapsed .sub-nav-badge {
    display: none;
  }

  .sidebar.collapsed .sub-menu {
    display: none;
  }

  .nav-icon,
  .sub-nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
  }

  .nav-label,
  .sub-nav-label {
    font-size: 13px;
    flex: 1;
  }

  .nav-badge,
  .sub-nav-badge {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
  }

  .nav-item.active .nav-badge,
  .sub-nav-item.active .sub-nav-badge {
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
  {
    id: "skills_group",
    icon: "skills",
    label: "menu.skillsGroup",
    children: [
      { id: "skills", icon: "skills", label: "menu.skills" },
      { id: "knowledge", icon: "knowledge", label: "menu.knowledge" },
      { id: "skillMarket", icon: "skillMarket", label: "menu.skillMarket" },
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
      {
        id: "executionHistory",
        icon: "executionHistory",
        label: "menu.executionHistory",
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
      { id: "engine", icon: "settings", label: "menu.engineConfig" },
      { id: "workspace", icon: "settings", label: "menu.workspaceConfig" },
      { id: "atomicSkills", icon: "skills", label: "menu.atomicSkills" },
      { id: "system", icon: "settings", label: "menu.systemConfig" },
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
  onMenuClick: (id: string, subId?: string) => void;
  t: (key: string) => string;
}

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({
  item,
  collapsed,
  activeId,
  activeSubId,
  onMenuClick,
  t,
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
                className={`sub-nav-item ${activeSubId === child.id ? "active" : ""}`}
                onClick={() => {
                  if (item.id === "settings_group") {
                    onMenuClick("settings", child.id);
                  } else {
                    onMenuClick(child.id);
                  }
                }}
              >
                <span className="sub-nav-icon">
                  {ChildIcon && <ChildIcon size={16} />}
                </span>
                <span className="sub-nav-label">{t(child.label)}</span>
                {child.badge && (
                  <span className="sub-nav-badge">{child.badge}</span>
                )}
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

  const handleMenuClick = (id: string, subId?: string) => {
    if (id === "settings" && subId) {
      setActiveId("settings_group");
      setActiveSubId(subId);
      if (onMenuClick) {
        onMenuClick("settings", subId);
      }
    } else if (id === "history") {
      setActiveId(id);
      setActiveSubId(undefined);
      if (onMenuClick) {
        onMenuClick(id);
      }
    } else {
      setActiveId(id);
      setActiveSubId(undefined);
      if (onMenuClick) {
        onMenuClick(id);
      }
    }
  };

  const handleNewSessionClick = () => {
    if (onNewSession) {
      onNewSession();
    } else {
      onResetSession();
    }
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
              item.id === "settings_group"
                ? activeSubId !== undefined
                : activeId === item.id;
            return (
              <div
                key={item.id}
                className={`nav-item-collapsed ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (item.id === "settings_group" && item.children?.length) {
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
            onMenuClick={handleMenuClick}
            t={t}
          />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
