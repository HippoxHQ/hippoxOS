import React, { useState } from 'react';

interface WorkspaceConfigProps {
    t: (key: string, params?: any) => string;
    initialConfig?: {
        workspacePath: string;
        logsPath: string;
        dataPath: string;
        tempPath: string;
        backupPath: string;
        maxLogSize: number;
        maxBackupCount: number;
    };
    onSave?: (config: any) => void;
}

const WorkspaceConfig: React.FC<WorkspaceConfigProps> = ({ t, initialConfig, onSave }) => {
    const [config, setConfig] = useState({
        workspacePath: initialConfig?.workspacePath || '',
        logsPath: initialConfig?.logsPath || '',
        dataPath: initialConfig?.dataPath || '',
        tempPath: initialConfig?.tempPath || '',
        backupPath: initialConfig?.backupPath || '',
        maxLogSize: initialConfig?.maxLogSize || 100,
        maxBackupCount: initialConfig?.maxBackupCount || 10,
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

    return (
        <div className="settings-container"
            style={{
                height: '100%', display: 'flex',
                flexDirection: 'column', gap: '0px',
                overflow: 'hidden'
            }}>
            <div className="settings-group" style={{ paddingTop: '15px' }}>
                <div className="settings-row" style={{ padding: '0px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={labelStyle}>{t('settings.workspacePath')}</label>
                    <input
                        style={inputStyle}
                        value={config.workspacePath}
                        onChange={(e) => setConfig({ ...config, workspacePath: e.target.value })}
                        placeholder={t('settings.workspacePathPlaceholder')}
                    />
                </div>
                <div className="settings-row" style={{ padding: '0px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={labelStyle}>{t('settings.logsPath')}</label>
                    <input
                        style={inputStyle}
                        value={config.logsPath}
                        onChange={(e) => setConfig({ ...config, logsPath: e.target.value })}
                        placeholder={t('settings.logsPathPlaceholder')}
                    />
                </div>
                <div className="settings-row" style={{ padding: '0px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={labelStyle}>{t('settings.dataPath')}</label>
                    <input
                        style={inputStyle}
                        value={config.dataPath}
                        onChange={(e) => setConfig({ ...config, dataPath: e.target.value })}
                        placeholder={t('settings.dataPathPlaceholder')}
                    />
                </div>
                <div className="settings-row" style={{ padding: '0px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={labelStyle}>{t('settings.tempPath')}</label>
                    <input
                        style={inputStyle}
                        value={config.tempPath}
                        onChange={(e) => setConfig({ ...config, tempPath: e.target.value })}
                        placeholder={t('settings.tempPathPlaceholder')}
                    />
                </div>
                <div className="settings-row" style={{ padding: '0px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={labelStyle}>{t('settings.backupPath')}</label>
                    <input
                        style={inputStyle}
                        value={config.backupPath}
                        onChange={(e) => setConfig({ ...config, backupPath: e.target.value })}
                        placeholder={t('settings.backupPathPlaceholder')}
                    />
                </div>
                <div className="settings-row" style={{ padding: '0px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={labelStyle}>{t('settings.maxLogSize')} (MB)</label>
                    <input
                        type="number"
                        style={inputStyle}
                        value={config.maxLogSize}
                        onChange={(e) => setConfig({ ...config, maxLogSize: parseInt(e.target.value) || 100 })}
                    />
                </div>
                <div className="settings-row" style={{ padding: '0px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={labelStyle}>{t('settings.maxBackupCount')}</label>
                    <input
                        type="number"
                        style={inputStyle}
                        value={config.maxBackupCount}
                        onChange={(e) => setConfig({ ...config, maxBackupCount: parseInt(e.target.value) || 10 })}
                    />
                </div>
            </div>
            <button className="settings-save-btn" onClick={handleSave}
                style={{
                    padding: '8px 20px',
                    background: 'var(--accent-color, #0066cc)',
                    border: 'none', borderRadius: '6px',
                    color: 'white', fontSize: '13px',
                    fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.2s',
                    alignSelf: 'flex-end',
                    marginRight: '10px',
                }}>
                {t('settings.save')}
            </button>
        </div>
    );
};

export default WorkspaceConfig;