import React, { useState } from 'react';

interface AIModelConfigProps {
  t: (key: string, params?: any) => string;
  initialConfig?: {
    defaultModel: string;
    apiKey: string;
  };
  onSave?: (config: any) => void;
}

interface ModelConfig {
  name: string;
  apiKey: string;
  isDefault: boolean;
}

const AIModelConfig: React.FC<AIModelConfigProps> = ({ t, initialConfig, onSave }) => {
  const [models, setModels] = useState<ModelConfig[]>([
    {
      name: 'hippox-default-v1',
      apiKey: initialConfig?.apiKey || '',
      isDefault: true
    },
    {
      name: 'gpt-4',
      apiKey: '',
      isDefault: false
    },
    {
      name: 'gpt-4-turbo',
      apiKey: '',
      isDefault: false
    },
    {
      name: 'claude-3-opus',
      apiKey: '',
      isDefault: false
    },
    {
      name: 'claude-3-sonnet',
      apiKey: '',
      isDefault: false
    },
    {
      name: 'deepseek-v3',
      apiKey: '',
      isDefault: false
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newModel, setNewModel] = useState<ModelConfig>({
    name: '',
    apiKey: '',
    isDefault: false
  });

  const handleSave = () => {
    const defaultModel = models.find(m => m.isDefault);
    if (onSave && defaultModel) {
      onSave({
        defaultModel: defaultModel.name,
        apiKey: defaultModel.apiKey,
        allModels: models
      });
    }
  };

  const handleSetDefault = (index: number) => {
    setModels(models.map((model, i) => ({
      ...model,
      isDefault: i === index
    })));
  };

  const handleUpdateModel = (index: number, field: keyof ModelConfig, value: string | boolean) => {
    setModels(models.map((model, i) =>
      i === index ? { ...model, [field]: value } : model
    ));
  };

  const handleDeleteModel = (index: number) => {
    const modelToDelete = models[index];
    if (modelToDelete.isDefault) {
      return;
    }
    setModels(models.filter((_, i) => i !== index));
  };

  const handleAddModel = () => {
    if (newModel.name.trim()) {
      setModels([...models, { ...newModel, isDefault: false }]);
      setNewModel({ name: '', apiKey: '', isDefault: false });
      setShowAddForm(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--text-primary)',
    minWidth: '100px',
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

  const buttonStyle: React.CSSProperties = {
    padding: '6px 16px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const addButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'var(--accent-color, #0066cc)',
    color: 'white',
    border: 'none'
  };

  const deleteButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: 'var(--error-color, #dc2626)',
    borderColor: 'var(--error-color, #dc2626)'
  };

  const modelCardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px',
    border: '1px solid var(--border-color)'
  };

  const badgeStyle: React.CSSProperties = {
    background: 'var(--accent-color, #0066cc)',
    color: 'white',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '12px',
    marginLeft: '8px'
  };

  return (
    <div className="settings-container" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', padding: 0, margin: 0, gap: 0,
    }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0 10px',
        margin: 0,
        paddingTop: '10px',
        paddingBottom: '10px',
      }}>
        {models.map((model, index) => (
          <div key={model.name} style={modelCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {model.name}
              </span>
              {model.isDefault && <span style={badgeStyle}>{t('settings.defaultBadge') || '默认'}</span>}
              {!model.isDefault && (
                <button
                  style={{ ...buttonStyle, marginLeft: 'auto', fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => handleSetDefault(index)}
                >
                  {t('settings.setAsDefault') || '设为默认'}
                </button>
              )}
              {!model.isDefault && (
                <button
                  style={{ ...deleteButtonStyle, marginLeft: '8px', fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => handleDeleteModel(index)}
                >
                  {t('settings.delete') || '删除'}
                </button>
              )}
            </div>

            <div className="settings-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
              <label style={labelStyle}>{t('settings.apiKey')}</label>
              <input
                type="password"
                style={inputStyle}
                value={model.apiKey}
                onChange={(e) => handleUpdateModel(index, 'apiKey', e.target.value)}
                placeholder={t('settings.apiKeyPlaceholder')}
              />
            </div>
          </div>
        ))}

        {showAddForm ? (
          <div style={modelCardStyle}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              {t('settings.addModel') || '添加新模型'}
            </div>
            <div className="settings-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
              <label style={labelStyle}>{t('settings.modelName') || '模型名称'}</label>
              <input
                type="text"
                style={inputStyle}
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                placeholder={t('settings.modelNamePlaceholder') || '例如: llama-3-70b'}
              />
            </div>
            <div className="settings-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
              <label style={labelStyle}>{t('settings.apiKey')}</label>
              <input
                type="password"
                style={inputStyle}
                value={newModel.apiKey}
                onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                placeholder={t('settings.apiKeyPlaceholder')}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button style={buttonStyle} onClick={() => setShowAddForm(false)}>
                {t('settings.cancel') || '取消'}
              </button>
              <button style={addButtonStyle} onClick={handleAddModel}>
                {t('settings.add') || '添加'}
              </button>
            </div>
          </div>
        ) : (
          <button style={{ ...addButtonStyle, width: '100%' }} onClick={() => setShowAddForm(true)}>
            + {t('settings.addModel') || '添加模型'}
          </button>
        )}
      </div>

      <button className="settings-save-btn" onClick={handleSave} style={{
        padding: '8px 20px',
        margin: '0 10px 10px auto',
        background: 'var(--accent-color, #0066cc)',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        alignSelf: 'flex-end'
      }}>
        {t('settings.save')}
      </button>
    </div>
  );
};

export default AIModelConfig;