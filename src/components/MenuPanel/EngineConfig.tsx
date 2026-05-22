/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from 'react';

interface EngineConfigProps {
    t: (key: string, params?: any) => string;
    initialConfig?: {
        postgresql?: { host: string; port: number; database: string; username: string; password: string };
        mysql?: { host: string; port: number; database: string; username: string; password: string };
        redis?: { host: string; port: number; password: string; db: number };
        sqlite?: { path: string };
        tcp?: { host: string; port: number; encoding: string };
        udp?: { host: string; port: number; encoding: string; broadcast: boolean };
        ftp?: { host: string; port: number; username: string; password: string; remoteDir: string };
        docker?: { host: string; apiVersion: string; tlsVerify: boolean };
        k8s?: { kubeconfig: string; context: string; namespace: string };
        smtp?: { host: string; port: number; username: string; password: string; from: string };
        telegram?: { botToken: string };
        dingtalk?: { accessToken: string };
        feishu?: { webhook: string };
        wecom?: { webhook: string };
        github?: { token: string; apiUrl: string };
    };
    onSave?: (config: any) => void;
}

const EngineConfig: React.FC<EngineConfigProps> = ({ t, initialConfig, onSave }) => {
    const [activeTab, setActiveTab] = useState('database');
    const tabsRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const tabs = [
        { id: 'database', label: t('settings.tab.database') },
        { id: 'network', label: t('settings.tab.network') },
        { id: 'container', label: t('settings.tab.container') },
        { id: 'notification', label: t('settings.tab.notification') },
    ];
    const [config, setConfig] = useState({
        postgresql: initialConfig?.postgresql || { host: '', port: 5432, database: '', username: '', password: '' },
        mysql: initialConfig?.mysql || { host: '', port: 3306, database: '', username: '', password: '' },
        redis: initialConfig?.redis || { host: '', port: 6379, password: '', db: 0 },
        sqlite: initialConfig?.sqlite || { path: '' },
        tcp: initialConfig?.tcp || { host: '127.0.0.1', port: 8888, encoding: 'utf8' },
        udp: initialConfig?.udp || { host: '127.0.0.1', port: 9999, encoding: 'utf8', broadcast: false },
        ftp: initialConfig?.ftp || { host: '', port: 21, username: 'anonymous', password: '', remoteDir: '/' },
        docker: initialConfig?.docker || { host: 'unix:///var/run/docker.sock', apiVersion: '', tlsVerify: false },
        k8s: initialConfig?.k8s || { kubeconfig: '', context: '', namespace: 'default' },
        smtp: initialConfig?.smtp || { host: '', port: 587, username: '', password: '', from: '' },
        telegram: initialConfig?.telegram || { botToken: '' },
        dingtalk: initialConfig?.dingtalk || { accessToken: '' },
        feishu: initialConfig?.feishu || { webhook: '' },
        wecom: initialConfig?.wecom || { webhook: '' },
        github: initialConfig?.github || { token: '', apiUrl: 'https://api.github.com' },
    });
    const handleSave = () => {
        if (onSave) {
            onSave(config);
        }
    };
    const scrollTabs = (direction: 'left' | 'right') => {
        if (tabsRef.current) {
            const scrollAmount = 200;
            const newScrollLeft = tabsRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
            tabsRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
        }
    };
    const checkScrollButtons = () => {
        if (tabsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - 5);
        }
    };
    useEffect(() => {
        checkScrollButtons();
        window.addEventListener('resize', checkScrollButtons);
        return () => window.removeEventListener('resize', checkScrollButtons);
    }, []);
    useEffect(() => {
        setTimeout(checkScrollButtons, 0);
    }, [tabs]);
    const handleTabClick = (tabId: string) => {
        setActiveTab(tabId);
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
    const checkboxStyle: React.CSSProperties = {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
        flexShrink: 0
    };
    const subtitleStyle: React.CSSProperties = {
        fontSize: '15px',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        margin: '0px 0 12px 0',
        paddingLeft: '8px',
        borderLeft: '3px solid var(--accent-color)'
    };
    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        gap: '16px',
        flexWrap: 'wrap',
        paddingLeft: '10px'
    };
    const renderDatabaseTab = () => (
        <>
            <div className="settings-subtitle" style={subtitleStyle}>PostgreSQL</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Host</label>
                <input
                    style={inputStyle}
                    value={config.postgresql.host}
                    onChange={(e) => setConfig({ ...config, postgresql: { ...config.postgresql, host: e.target.value } })}
                    placeholder="localhost"
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Port</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={config.postgresql.port}
                    onChange={(e) => setConfig({ ...config, postgresql: { ...config.postgresql, port: parseInt(e.target.value) || 5432 } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Database</label>
                <input
                    style={inputStyle}
                    value={config.postgresql.database}
                    onChange={(e) => setConfig({ ...config, postgresql: { ...config.postgresql, database: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Username</label>
                <input
                    style={inputStyle}
                    value={config.postgresql.username}
                    onChange={(e) => setConfig({ ...config, postgresql: { ...config.postgresql, username: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Password</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={config.postgresql.password}
                    onChange={(e) => setConfig({ ...config, postgresql: { ...config.postgresql, password: e.target.value } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>MySQL</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Host</label>
                <input
                    style={inputStyle}
                    value={config.mysql.host}
                    onChange={(e) => setConfig({ ...config, mysql: { ...config.mysql, host: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Port</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={config.mysql.port}
                    onChange={(e) => setConfig({ ...config, mysql: { ...config.mysql, port: parseInt(e.target.value) || 3306 } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Database</label>
                <input
                    style={inputStyle}
                    value={config.mysql.database}
                    onChange={(e) => setConfig({ ...config, mysql: { ...config.mysql, database: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Username</label>
                <input
                    style={inputStyle}
                    value={config.mysql.username}
                    onChange={(e) => setConfig({ ...config, mysql: { ...config.mysql, username: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Password</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={config.mysql.password}
                    onChange={(e) => setConfig({ ...config, mysql: { ...config.mysql, password: e.target.value } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>Redis</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Host</label>
                <input
                    style={inputStyle}
                    value={config.redis.host}
                    onChange={(e) => setConfig({ ...config, redis: { ...config.redis, host: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Port</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={config.redis.port}
                    onChange={(e) => setConfig({ ...config, redis: { ...config.redis, port: parseInt(e.target.value) || 6379 } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Password</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={config.redis.password}
                    onChange={(e) => setConfig({ ...config, redis: { ...config.redis, password: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Database</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={config.redis.db}
                    onChange={(e) => setConfig({ ...config, redis: { ...config.redis, db: parseInt(e.target.value) || 0 } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>SQLite</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Database Path</label>
                <input
                    style={inputStyle}
                    value={config.sqlite.path}
                    onChange={(e) => setConfig({ ...config, sqlite: { path: e.target.value } })}
                    placeholder="/path/to/database.db"
                />
            </div>
        </>
    );

    const renderNetworkTab = () => (
        <>
            <div className="settings-subtitle" style={subtitleStyle}>TCP</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Host</label>
                <input
                    style={inputStyle}
                    value={config.tcp.host}
                    onChange={(e) => setConfig({ ...config, tcp: { ...config.tcp, host: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Port</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={config.tcp.port}
                    onChange={(e) => setConfig({ ...config, tcp: { ...config.tcp, port: parseInt(e.target.value) || 8888 } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Encoding</label>
                <select
                    style={selectStyle}
                    value={config.tcp.encoding}
                    onChange={(e) => setConfig({ ...config, tcp: { ...config.tcp, encoding: e.target.value } })}
                >
                    <option>utf8</option>
                    <option>gbk</option>
                    <option>ascii</option>
                </select>
            </div>

            <div className="settings-subtitle" style={subtitleStyle}>UDP</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Host</label>
                <input
                    style={inputStyle}
                    value={config.udp.host}
                    onChange={(e) => setConfig({ ...config, udp: { ...config.udp, host: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Port</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={config.udp.port}
                    onChange={(e) => setConfig({ ...config, udp: { ...config.udp, port: parseInt(e.target.value) || 9999 } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Encoding</label>
                <select
                    style={selectStyle}
                    value={config.udp.encoding}
                    onChange={(e) => setConfig({ ...config, udp: { ...config.udp, encoding: e.target.value } })}
                >
                    <option>utf8</option>
                    <option>gbk</option>
                    <option>ascii</option>
                </select>
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Broadcast</label>
                <input
                    type="checkbox"
                    style={checkboxStyle}
                    checked={config.udp.broadcast}
                    onChange={(e) => setConfig({ ...config, udp: { ...config.udp, broadcast: e.target.checked } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>FTP</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Host</label>
                <input
                    style={inputStyle}
                    value={config.ftp.host}
                    onChange={(e) => setConfig({ ...config, ftp: { ...config.ftp, host: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Port</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={config.ftp.port}
                    onChange={(e) => setConfig({ ...config, ftp: { ...config.ftp, port: parseInt(e.target.value) || 21 } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Username</label>
                <input
                    style={inputStyle}
                    value={config.ftp.username}
                    onChange={(e) => setConfig({ ...config, ftp: { ...config.ftp, username: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Password</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={config.ftp.password}
                    onChange={(e) => setConfig({ ...config, ftp: { ...config.ftp, password: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Remote Directory</label>
                <input
                    style={inputStyle}
                    value={config.ftp.remoteDir}
                    onChange={(e) => setConfig({ ...config, ftp: { ...config.ftp, remoteDir: e.target.value } })}
                />
            </div>
        </>
    );
    const renderContainerTab = () => (
        <>
            <div className="settings-subtitle" style={subtitleStyle}>Docker</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Host</label>
                <input
                    style={inputStyle}
                    value={config.docker.host}
                    onChange={(e) => setConfig({ ...config, docker: { ...config.docker, host: e.target.value } })}
                    placeholder="unix:///var/run/docker.sock"
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>API Version</label>
                <input
                    style={inputStyle}
                    value={config.docker.apiVersion}
                    onChange={(e) => setConfig({ ...config, docker: { ...config.docker, apiVersion: e.target.value } })}
                    placeholder="v1.41"
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>TLS Verify</label>
                <input
                    type="checkbox"
                    style={checkboxStyle}
                    checked={config.docker.tlsVerify}
                    onChange={(e) => setConfig({ ...config, docker: { ...config.docker, tlsVerify: e.target.checked } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>Kubernetes</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Kubeconfig Path</label>
                <input
                    style={inputStyle}
                    value={config.k8s.kubeconfig}
                    onChange={(e) => setConfig({ ...config, k8s: { ...config.k8s, kubeconfig: e.target.value } })}
                    placeholder="~/.kube/config"
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Context</label>
                <input
                    style={inputStyle}
                    value={config.k8s.context}
                    onChange={(e) => setConfig({ ...config, k8s: { ...config.k8s, context: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Default Namespace</label>
                <input
                    style={inputStyle}
                    value={config.k8s.namespace}
                    onChange={(e) => setConfig({ ...config, k8s: { ...config.k8s, namespace: e.target.value } })}
                />
            </div>
        </>
    );
    const renderNotificationTab = () => (
        <>
            <div className="settings-subtitle" style={subtitleStyle}>SMTP Email</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>SMTP Host</label>
                <input
                    style={inputStyle}
                    value={config.smtp.host}
                    onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, host: e.target.value } })}
                    placeholder="smtp.gmail.com"
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>SMTP Port</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={config.smtp.port}
                    onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, port: parseInt(e.target.value) || 587 } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Username</label>
                <input
                    style={inputStyle}
                    value={config.smtp.username}
                    onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, username: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Password</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={config.smtp.password}
                    onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, password: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>From Email</label>
                <input
                    style={inputStyle}
                    value={config.smtp.from}
                    onChange={(e) => setConfig({ ...config, smtp: { ...config.smtp, from: e.target.value } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>Telegram</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Bot Token</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={config.telegram.botToken}
                    onChange={(e) => setConfig({ ...config, telegram: { botToken: e.target.value } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>DingTalk</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Access Token</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={config.dingtalk.accessToken}
                    onChange={(e) => setConfig({ ...config, dingtalk: { accessToken: e.target.value } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>Feishu</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Webhook URL</label>
                <input
                    style={inputStyle}
                    value={config.feishu.webhook}
                    onChange={(e) => setConfig({ ...config, feishu: { webhook: e.target.value } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>WeCom</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Webhook URL</label>
                <input
                    style={inputStyle}
                    value={config.wecom.webhook}
                    onChange={(e) => setConfig({ ...config, wecom: { webhook: e.target.value } })}
                />
            </div>
            <div className="settings-subtitle" style={subtitleStyle}>GitHub</div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>Access Token</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={config.github.token}
                    onChange={(e) => setConfig({ ...config, github: { ...config.github, token: e.target.value } })}
                />
            </div>
            <div className="settings-row" style={rowStyle}>
                <label style={labelStyle}>API URL</label>
                <input
                    style={inputStyle}
                    value={config.github.apiUrl}
                    onChange={(e) => setConfig({ ...config, github: { ...config.github, apiUrl: e.target.value } })}
                />
            </div>
        </>
    );
    const engineTabsStyles = `
    .engine-tabs-container {
        position: relative;
        display: flex;
        align-items: center;
        margin-bottom: 0px;
    }
    .engine-tabs-scroll {
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .engine-tabs-scroll::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
    }
    .engine-tabs {
        display: flex;
        gap: 4px;
        border-bottom: 1px solid var(--border-color);
        min-width: max-content;
    }
    .engine-tab {
        padding: 8px 16px;
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 6px 6px 0 0;
        white-space: nowrap;
        user-select: none;
    }
    .engine-tab:hover {
        color: var(--text-primary);
        background: var(--hover-bg);
    }
    .engine-tab.active {
        color: var(--accent-color, #0066cc);
        border-bottom: 2px solid var(--accent-color, #0066cc);
    }
    .engine-tab-scroll-btn {
        width: 28px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 16px;
        transition: all 0.2s;
        flex-shrink: 0;
        margin: 0 4px;
        user-select: none;
    }
    .engine-tab-scroll-btn:hover {
        background: var(--hover-bg);
        color: var(--text-primary);
    }
    .engine-tab-scroll-btn.disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .engine-tab-scroll-btn.disabled:hover {
        background: var(--bg-secondary);
        color: var(--text-secondary);
    }
`;
    if (typeof document !== 'undefined') {
        const styleId = 'engine-tabs-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = engineTabsStyles;
            document.head.appendChild(style);
        }
    }
    return (
        <div className="settings-container" style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', padding: 0, margin: 0, gap: 0,
        }}>
            <div className="engine-tabs-container" style={{ padding: '0px', margin: 0 }}>
                {showLeftArrow && (
                    <button className="engine-tab-scroll-btn" onClick={() => scrollTabs('left')}>
                        ◀
                    </button>
                )}
                <div
                    className="engine-tabs-scroll"
                    ref={tabsRef}
                    onScroll={checkScrollButtons}
                >
                    <div className="engine-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`engine-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => handleTabClick(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                {showRightArrow && (
                    <button className="engine-tab-scroll-btn" onClick={() => scrollTabs('right')}>
                        ▶
                    </button>
                )}
            </div>
            <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '0 10px',
                margin: 0, paddingTop: '10px',
                paddingBottom: '10px',
            }}>
                {activeTab === 'database' && renderDatabaseTab()}
                {activeTab === 'network' && renderNetworkTab()}
                {activeTab === 'container' && renderContainerTab()}
                {activeTab === 'notification' && renderNotificationTab()}
            </div>
            <button className="settings-save-btn" onClick={handleSave} style={{
                padding: '8px 20px', margin: '10px 10px 0 10px',
                background: 'var(--accent-color, #0066cc)',
                border: 'none', borderRadius: '6px',
                color: 'white', fontSize: '13px',
                fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.2s',
                alignSelf: 'flex-end',
                marginRight: '10px',
                marginBottom: '10px'
            }}>
                {t('settings.save')}
            </button>
        </div>
    );
};

export default EngineConfig;