import React, { useState, useEffect } from 'react';
import { configCommands, AddLlmInstanceRequest } from '../../api/config';
import { getAllModels, ModelInfo } from '../../api/tauri';

interface AIModelConfigProps {
  t: (key: string, params?: any) => string;
  onSave?: (config: any) => void;
  isInitializing?: boolean;
}

const PROVIDER_CONFIG: Record<string, { name: string; icon: string }> = {
  openai: { name: 'OpenAI', icon: '🔵' },
  anthropic: { name: 'Anthropic', icon: '🟣' },
  deepseek: { name: 'DeepSeek', icon: '🟢' },
  google: { name: 'Google', icon: '🔴' },
  groq: { name: 'Groq', icon: '⚡' },
  together: { name: 'Together.ai', icon: '🤝' },
  mistral: { name: 'Mistral', icon: '🪶' },
  cohere: { name: 'Cohere', icon: '📐' },
  alibaba: { name: '阿里云', icon: '☁️' },
  zhipu: { name: '智谱 AI', icon: '🧠' },
  moonshot: { name: '月之暗面', icon: '🌙' },
  baichuan: { name: '百川智能', icon: '🌊' },
  yi: { name: '零一万物', icon: '1️⃣' },
  custom: { name: 'Custom', icon: '🦛' },
};

const AIModelConfig: React.FC<AIModelConfigProps> = ({ t, onSave, isInitializing = false }) => {
  const [instances, setInstances] = useState<Record<string, any>>({});
  const [defaultInstanceId, setDefaultInstanceId] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState('openai');
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const instancesPromise = configCommands.getLlmInstances().catch(err => {
      console.error('Failed to load instances:', err);
      return {};
    });
    const defaultIdPromise = configCommands.getDefaultLlmInstanceId().catch(err => {
      console.error('Failed to load default instance id:', err);
      return '';
    });
    const modelsPromise = getAllModels().catch(err => {
      console.error('Failed to load models:', err);
      return [];
    });
    const [instancesData, defaultId, modelsData] = await Promise.all([
      instancesPromise,
      defaultIdPromise,
      modelsPromise
    ]);
    setInstances(instancesData);
    setDefaultInstanceId(defaultId);
    setAvailableModels(modelsData);
    setLoading(false);
  };

  const handleSetDefault = async (instanceId: string) => {
    try {
      await configCommands.setDefaultLlmInstance(instanceId);
      setDefaultInstanceId(instanceId);
      if (onSave) {
        onSave({ action: 'set_default', instanceId });
      }
    } catch (error) {
      console.error('Failed to set default instance:', error);
    }
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (Object.keys(instances).length <= 1) {
      return;
    }
    if (defaultInstanceId === instanceId) {
      return;
    }
    try {
      await configCommands.deleteLlmInstance(instanceId);
      await loadData();
      if (onSave) {
        onSave({ action: 'delete', instanceId });
      }
    } catch (error) {
      console.error('Failed to delete instance:', error);
    }
  };

  const handleAddInstance = async () => {
    if (!newApiKey.trim()) {
      return;
    }
    const providerModels = availableModels.filter(m => m.provider === newProvider);
    const defaultModel = providerModels.find(m => m.recommended) || providerModels[0];
    const defaultModelName = defaultModel?.id || '';
    const instanceToAdd: AddLlmInstanceRequest = {
      name: `${PROVIDER_CONFIG[newProvider]?.name || newProvider} Instance`,
      provider: newProvider,
      api_key: newApiKey,
      api_base: "",
      workflow_mode: 'react',
      default_model: defaultModelName,
      models: providerModels.map(m => ({
        name: m.id,
        api_key: newApiKey,
        is_default: m.id === defaultModelName,
        provider: newProvider
      }))
    };
    try {
      const result = await configCommands.addLlmInstance(instanceToAdd);
      setShowAddForm(false);
      setNewProvider('openai');
      setNewApiKey('');
      await loadData();
      if (onSave) {
        onSave({ action: 'add', instance: instanceToAdd });
      }
    } catch (error) {
      console.error('Failed to add instance:', error);
    }
  };
  const getProviderIcon = (provider: string) => {
    return PROVIDER_CONFIG[provider]?.icon || '🤖';
  };
  const getProviderName = (provider: string) => {
    return PROVIDER_CONFIG[provider]?.name || provider;
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--text-primary)',
    minWidth: '80px',
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
  if (loading) {
    return (
      <div className="settings-container" style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {t('atomicSkills.loading') || '加载中...'}
      </div>
    );
  }
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
        {Object.entries(instances).map(([id, instance]) => (
          <div key={id} style={modelCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {getProviderIcon(instance.provider)} {getProviderName(instance.provider)}
              </span>
              {defaultInstanceId === id && <span style={badgeStyle}>{t('settings.defaultBadge') || '默认'}</span>}
            </div>
            <div className="settings-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
              <label style={labelStyle}>{t('settings.apiKey')}</label>
              <input
                type="password"
                style={inputStyle}
                value={instance.api_key}
                placeholder="••••••••"
                disabled
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              {defaultInstanceId !== id && (
                <button
                  style={{ ...buttonStyle, fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => handleSetDefault(id)}
                >
                  {t('settings.setAsDefault') || '设为默认'}
                </button>
              )}
              {defaultInstanceId !== id && Object.keys(instances).length > 1 && (
                <button
                  style={{ ...deleteButtonStyle, fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => handleDeleteInstance(id)}
                >
                  {t('settings.delete') || '删除'}
                </button>
              )}
            </div>
          </div>
        ))}
        {showAddForm ? (
          <div style={modelCardStyle}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              {t('settings.addInstance') || '添加模型提供商'}
            </div>
            <div className="settings-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
              <label style={labelStyle}>{t('settings.provider')}</label>
              <select
                style={selectStyle}
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value)}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="deepseek">DeepSeek</option>
                <option value="google">Google</option>
                <option value="groq">Groq</option>
                <option value="together">Together.ai</option>
                <option value="mistral">Mistral</option>
                <option value="cohere">Cohere</option>
                <option value="alibaba">阿里云</option>
                <option value="zhipu">智谱 AI</option>
                <option value="moonshot">月之暗面</option>
                <option value="baichuan">百川智能</option>
                <option value="yi">零一万物</option>
              </select>
            </div>
            <div className="settings-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
              <label style={labelStyle}>{t('settings.apiKey')}</label>
              <input
                type="password"
                style={inputStyle}
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder={t('settings.apiKeyPlaceholder')}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button style={buttonStyle} onClick={() => setShowAddForm(false)}>
                {t('settings.cancel') || '取消'}
              </button>
              <button style={addButtonStyle} onClick={handleAddInstance}>
                {t('settings.add') || '添加'}
              </button>
            </div>
          </div>
        ) : (
          <button style={{ ...addButtonStyle, width: '100%' }} onClick={() => setShowAddForm(true)}>
            + {t('settings.addInstance') || '添加模型提供商'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AIModelConfig;