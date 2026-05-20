import React, { useState } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onResetSession: () => void;
  onClearLogs: () => void;
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
    width: 20% !important; 
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    transition: width 0.2s ease;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .sidebar.collapsed {
    width: 60px;
    min-width: 60px;
  }

  .sidebar-header {
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sidebar.collapsed .sidebar-header {
    padding: 16px 10px;
  }

  .header-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
    width: 100%;
  }

  .sidebar.collapsed .header-action-btn {
    padding: 10px 0;
  }

  .sidebar.collapsed .header-action-btn .action-label {
    display: none;
  }

  .header-action-btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent-blue);
  }

  .action-icon {
    font-size: 16px;
  }

  .action-label {
    font-size: 13px;
  }

  .sidebar-nav {
    flex: 1;
    padding: 0;
    margin: 0;
  }

  .sidebar.collapsed .sidebar-nav {
    padding: 0;
  }

  .nav-item,
  .sub-nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    margin: 0;
    border-radius: 0;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
    width: 100%;
  }

  .nav-item-parent {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    margin: 0;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
    width: 100%;
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
    font-size: 12px;
    transition: transform 0.2s;
  }

  .nav-item-parent .chevron.open {
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
    padding: 12px 0;
  }

  .sidebar.collapsed .nav-item,
  .sidebar.collapsed .sub-nav-item {
    justify-content: center;
    padding: 10px 0;
  }

  .sidebar.collapsed .nav-label,
  .sidebar.collapsed .sub-nav-label {
    display: none;
  }

  .sidebar.collapsed .nav-badge,
  .sidebar.collapsed .sub-nav-badge {
    display: none;
  }

  .nav-item:hover,
  .sub-nav-item:hover,
  .nav-item.active,
  .sub-nav-item.active {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .sub-menu {
    display: flex;
    flex-direction: column;
    padding-left: 44px;
  }

  .sidebar.collapsed .sub-menu {
    display: none;
  }

  .sub-nav-item {
    padding: 8px 16px;
    font-size: 13px;
  }

  .nav-icon,
  .sub-nav-icon {
    font-size: 18px;
    min-width: 24px;
  }

  .nav-label,
  .sub-nav-label {
    font-size: 14px;
    flex: 1;
  }

  .nav-badge,
  .sub-nav-badge {
    background: var(--accent-blue);
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
  }

  .sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--border-color);
  }

  .sidebar.collapsed .sidebar-footer {
    padding: 12px 8px;
  }

  .sidebar.collapsed .runtime-info {
    display: none;
  }

  .runtime-info {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .runtime-info-collapsed {
    font-size: 9px;
    color: var(--text-secondary);
    text-align: center;
    word-break: break-word;
  }

  .sidebar-nav-collapsed {
    flex: 1;
    padding: 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .nav-item-collapsed {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
    position: relative;
  }

  .nav-item-collapsed .nav-icon {
    font-size: 22px;
  }

  .nav-item-collapsed:hover,
  .nav-item-collapsed.active {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .nav-badge-collapsed {
    position: absolute;
    top: 4px;
    right: 12px;
    background: var(--accent-blue);
    color: white;
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 10px;
  }
`;

if (typeof document !== 'undefined') {
  const styleId = 'sidebar-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = sidebarStyles;
    document.head.appendChild(style);
  }
}

const menuConfig: MenuItem[] = [
  { id: 'dashboard', icon: '📊', label: 'menu.dashboard' },
  {
    id: 'workspace',
    icon: '📁',
    label: 'menu.workspace',
    children: [
      { id: 'projects', icon: '📄', label: 'menu.projects' },
      { id: 'files', icon: '📃', label: 'menu.files', badge: '3' },
    ]
  },
  { id: 'sessions', icon: '💬', label: 'menu.sessions', badge: '1' },
  { id: 'skills', icon: '⚡', label: 'menu.skills', badge: '3' },
  {
    id: 'tools',
    icon: '🔧',
    label: 'menu.tools',
    children: [
      { id: 'agents', icon: '🤖', label: 'menu.agents' },
      { id: 'nodes', icon: '🔄', label: 'menu.nodes' },
    ]
  },
  { id: 'settings', icon: '⚙️', label: 'menu.settings' },
  { id: 'debug', icon: '🐞', label: 'menu.debug' },
];

interface MenuItemComponentProps {
  item: MenuItem;
  depth?: number;
  collapsed: boolean;
  activeId: string;
  onMenuClick: (id: string) => void;
  t: (key: string) => string;
}

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({
  item,
  collapsed,
  activeId,
  onMenuClick,
  t
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

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
        <>
          <div className="nav-item-parent" onClick={handleClick} title={t(item.label)}>
            <div className="nav-item-content">
              <span className="nav-icon">{item.icon}</span>
            </div>
          </div>
        </>
      );
    }
    return (
      <div
        className={`nav-item ${activeId === item.id ? 'active' : ''}`}
        onClick={handleClick}
        title={t(item.label)}
      >
        <span className="nav-icon">{item.icon}</span>
        {item.badge && <span className="nav-badge-collapsed">{item.badge}</span>}
      </div>
    );
  }

  return (
    <>
      <div className="nav-item-parent" onClick={handleClick}>
        <div className="nav-item-content">
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{t(item.label)}</span>
          {item.badge && <span className="nav-badge">{item.badge}</span>}
        </div>
        {hasChildren && (
          <span className={`chevron ${isOpen ? 'open' : ''}`}>▶</span>
        )}
      </div>
      {hasChildren && isOpen && (
        <div className="sub-menu">
          {item.children!.map(child => (
            <div
              key={child.id}
              className={`sub-nav-item ${activeId === child.id ? 'active' : ''}`}
              onClick={() => onMenuClick(child.id)}
            >
              <span className="sub-nav-icon">{child.icon}</span>
              <span className="sub-nav-label">{t(child.label)}</span>
              {child.badge && <span className="sub-nav-badge">{child.badge}</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onResetSession, onClearLogs, t }) => {
  const [activeId, setActiveId] = useState('dashboard');

  const handleMenuClick = (id: string) => {
    setActiveId(id);
  };

  if (collapsed) {
    return (
      <aside className="sidebar collapsed">
        {/* 头部区域：两个按钮上下布局 */}
        <div className="sidebar-header">
          <button className="header-action-btn" onClick={onResetSession} title={t('actions.newSession')}>
            <span className="action-icon">🔄</span>
            <span className="action-label">{t('actions.newSession')}</span>
          </button>
          <button className="header-action-btn" onClick={onClearLogs} title={t('actions.clearTerminal')}>
            <span className="action-icon">🧹</span>
            <span className="action-label">{t('actions.clearTerminal')}</span>
          </button>
        </div>
        <nav className="sidebar-nav-collapsed">
          {menuConfig.map(item => (
            <div
              key={item.id}
              className={`nav-item-collapsed ${activeId === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
              title={t(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.badge && <span className="nav-badge-collapsed">{item.badge}</span>}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="runtime-info-collapsed">
            <div>{t('runtime.model')}</div>
            <div>{t('runtime.engine')}</div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      {/* 头部区域：两个按钮上下布局 */}
      <div className="sidebar-header">
        <button className="header-action-btn" onClick={onResetSession}>
          <span className="action-icon">🔄</span>
          <span className="action-label">{t('actions.newSession')}</span>
        </button>
        <button className="header-action-btn" onClick={onClearLogs}>
          <span className="action-icon">🧹</span>
          <span className="action-label">{t('actions.clearTerminal')}</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuConfig.map(item => (
          <MenuItemComponent
            key={item.id}
            item={item}
            collapsed={collapsed}
            activeId={activeId}
            onMenuClick={handleMenuClick}
            t={t}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="runtime-info">
          <div className="info-row">
            <span>{t('runtime.model')}:</span>
            <code>hippox-core</code>
          </div>
          <div className="info-row">
            <span>{t('runtime.engine')}:</span>
            <code>{t('runtime.skillOrchestration')}</code>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;