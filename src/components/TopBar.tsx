import React from 'react';
import { Theme, Language } from '../type';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  currentTheme: Theme;
  onToggleTheme: () => void;
  currentLanguage: Language;
  onToggleLanguage: () => void;
  t: (key: string) => string;
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
        <div className="app-logo">🦛</div>
        <div className="app-name">hippox</div>
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