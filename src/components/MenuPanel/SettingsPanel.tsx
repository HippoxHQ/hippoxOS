import React from 'react';
import AIModelConfig from './AIModelConfig';
import EngineConfig from './EngineConfig';
import WorkspaceConfig from './WorkspaceConfig';
import SystemConfig from './SystemConfig';

export type SettingsSubView = 'aiModel' | 'engine' | 'workspace' | 'system';

interface SettingsPanelProps {
  subView: SettingsSubView;
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
  theme?: 'light' | 'dark';
  language?: 'zh' | 'en';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  onLanguageChange?: (language: 'zh' | 'en') => void;
  isInitializing?: boolean;
}

const settingsPanelStyles = `
  .settings-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow: hidden;
  }
  
  .settings-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .settings-subtitle {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin: 16px 0 12px 0;
    padding-left: 8px;
    border-left: 3px solid var(--accent-color);
  }
  
  .settings-subtitle:first-of-type {
    margin-top: 0;
  }
  
  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    gap: 16px;
    flex-wrap: wrap;
  }
  
  .settings-row label {
    font-size: 13px;
    color: var(--text-primary);
    min-width: 120px;
    flex-shrink: 0;
  }
  
  .settings-row select,
  .settings-row input[type="text"],
  .settings-row input[type="password"],
  .settings-row input[type="number"] {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
  }
  
  .settings-row select:focus,
  .settings-row input:focus {
    outline: none;
    border-color: var(--accent-color);
  }
  
  .settings-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0;
  }
  
  .settings-row-with-browse {
    flex: 1;
    display: flex;
    gap: 8px;
    min-width: 0;
  }
  
  .settings-row-with-browse input {
    flex: 1;
    min-width: 0;
  }
  
  .browse-btn {
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  
  .browse-btn:hover {
    background: var(--hover-bg);
  }
  
  .settings-hint {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
    margin-left: 136px;
  }
  
  .settings-save-btn {
    padding: 8px 20px;
    background: var(--accent-color, #0066cc);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    align-self: flex-start;
  }
  
  .settings-save-btn:hover {
    opacity: 0.85;
  }
  
  .settings-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  .settings-subgroup {
    margin-bottom: 24px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
    overflow-x: auto;
  }
`;


if (typeof document !== 'undefined') {
  const styleId = 'settings-panel-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = settingsPanelStyles;
    document.head.appendChild(style);
  }
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  subView,
  t,
  onSave,
  theme,
  language,
  onThemeChange,
  onLanguageChange,
  isInitializing = false, 
}) => {
  const renderContent = () => {
    switch (subView) {
      case 'aiModel':
        return <AIModelConfig t={t} onSave={onSave} isInitializing={isInitializing} />;
      case 'engine':
        return <EngineConfig t={t} onSave={onSave} />;
      case 'workspace':
        return <WorkspaceConfig t={t} onSave={onSave} />;
      case 'system':
        return <SystemConfig
          t={t}
          theme={theme || 'light'}
          language={language || 'en'}
          onThemeChange={onThemeChange || (() => { })}
          onLanguageChange={onLanguageChange || (() => { })}
        />;
      default:
        return <AIModelConfig t={t} onSave={onSave} isInitializing={isInitializing} />;
    }
  };

  return <div className="settings-container">{renderContent()}</div>;
};

export default SettingsPanel;