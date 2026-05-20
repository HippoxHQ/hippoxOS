import React from 'react';
import { Theme, Language } from '../type';
import logo from '../assets/logo.png';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  currentTheme: Theme;
  onToggleTheme: () => void;
  currentLanguage: Language;
  onToggleLanguage: () => void;
  t: (key: string) => string;
}

const topBarStyles = `
  .top-bar {
    height: 48px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    flex-shrink: 0;
  }
  .top-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sidebar-toggle-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 6px 10px;
    border-radius: 8px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sidebar-toggle-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
  .app-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .app-logo img {
    display: block;
    vertical-align: middle;
  }
  .app-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1;
  }
  .top-bar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .theme-toggle-btn,
  .lang-toggle-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .theme-toggle-btn:hover,
  .lang-toggle-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
    border-color: var(--text-secondary);
  }
`;

if (typeof document !== 'undefined') {
  const styleId = 'topbar-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = topBarStyles;
    document.head.appendChild(style);
  }
}

const TopBar: React.FC<TopBarProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
  currentTheme,
  onToggleTheme,
  currentLanguage,
  onToggleLanguage,
  t
}) => {
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? t('topbar.expandSidebar') : t('topbar.collapseSidebar')}
        >
          {sidebarCollapsed ? '☰' : '◀'}
        </button>
        <div className="app-logo">
          <img src={logo} width="32px" height="32px" alt="logo" />
        </div>
        <div className="app-name">HippoX</div>
      </div>
      <div className="top-bar-right">
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={t('topbar.toggleTheme')}
        >
          {currentTheme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          className="lang-toggle-btn"
          onClick={onToggleLanguage}
          title={t('topbar.toggleLanguage')}
        >
          {currentLanguage === 'zh' ? 'EN' : '中文'}
        </button>
      </div>
    </div>
  );
};

export default TopBar;