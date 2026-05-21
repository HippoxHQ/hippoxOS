import React, { useState } from 'react';

interface AIModelConfigProps {
  t: (key: string, params?: any) => string;
  initialConfig?: {
    defaultModel: string;
    apiKey: string;
    apiBase?: string;
  };
  onSave?: (config: any) => void;
}

const AIModelConfig: React.FC<AIModelConfigProps> = ({ t, initialConfig, onSave }) => {
  const [config, setConfig] = useState({
    defaultModel: initialConfig?.defaultModel || 'hippox-default-v1',
    apiKey: initialConfig?.apiKey || '',
    apiBase: initialConfig?.apiBase || '',
  });

  const handleSave = () => {
    if (onSave) {
      onSave(config);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--text-primary)',
    minWidth: '120px',
    flexShrink: 0,
    userSelect: 'none'
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '8px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none'
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer'
  };

  return (
    <div className="settings-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
      <div className="settings-group" style={{ marginBottom: '24px' }}>
        <div className="settings-title" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', userSelect: 'none' }}>
          {t('settings.aiConfig')}
        </div>
        <div className="settings-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
          <label style={labelStyle}>{t('settings.defaultModel')}</label>
          <select
            style={selectStyle}
            value={config.defaultModel}
            onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
          >
            <option>hippox-default-v1</option>
            <option>gpt-4</option>
            <option>gpt-4-turbo</option>
            <option>claude-3-opus</option>
            <option>claude-3-sonnet</option>
            <option>deepseek-v3</option>
          </select>
        </div>
        <div className="settings-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
          <label style={labelStyle}>{t('settings.apiKey')}</label>
          <input
            type="password"
            style={inputStyle}
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder={t('settings.apiKeyPlaceholder')}
          />
        </div>
        <div className="settings-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
          <label style={labelStyle}>{t('settings.apiBase')}</label>
          <input
            type="text"
            style={inputStyle}
            value={config.apiBase}
            onChange={(e) => setConfig({ ...config, apiBase: e.target.value })}
            placeholder={t('settings.apiBasePlaceholder')}
          />
        </div>
      </div>
      <button className="settings-save-btn" onClick={handleSave} style={{ padding: '8px 20px', background: 'var(--accent-color, #0066cc)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', alignSelf: 'flex-start' }}>
        {t('settings.save')}
      </button>
    </div>
  );
};

export default AIModelConfig;