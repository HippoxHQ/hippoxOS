import React from 'react';

export type MenuPanelView =
    | 'terminal'
    | 'history'
    | 'favorites'
    | 'skills'
    | 'knowledge'
    | 'skillMarket'
    | 'taskQueue'
    | 'scheduledTasks'
    | 'executionHistory'
    | 'settings'
    | 'plugins'
    | 'monitor'
    | 'debug';

interface MenuPanelProps {
    currentView: MenuPanelView;
    onClose: () => void;
    t: (key: string, params?: any) => string;
}

const viewTitles: Record<MenuPanelView, string> = {
    terminal: 'terminal.title',
    history: 'menu.history',
    favorites: 'menu.favorites',
    skills: 'menu.skills',
    knowledge: 'menu.knowledge',
    skillMarket: 'menu.skillMarket',
    taskQueue: 'menu.taskQueue',
    scheduledTasks: 'menu.scheduledTasks',
    executionHistory: 'menu.executionHistory',
    settings: 'menu.settings',
    plugins: 'menu.plugins',
    monitor: 'menu.monitor',
    debug: 'menu.debug',
};

const menuPanelStyles = `
  .menu-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    border-left: 1px solid var(--border-color);
    overflow: hidden;
  }

  .menu-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
    flex-shrink: 0;
    min-height: 40px;
  }

  .menu-panel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .menu-panel-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .menu-panel-close:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .menu-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .panel-section {
    margin-bottom: 24px;
  }

  .panel-section h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .history-list,
  .favorites-list,
  .knowledge-list,
  .plugins-list,
  .execution-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-item,
  .favorite-item,
  .knowledge-item,
  .plugin-item,
  .execution-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .history-item:hover,
  .favorite-item:hover,
  .knowledge-item:hover,
  .plugin-item:hover,
  .execution-item:hover {
    background: var(--hover-bg);
  }

  .history-info,
  .knowledge-info,
  .plugin-info,
  .exec-info {
    flex: 1;
  }

  .history-title,
  .knowledge-title,
  .plugin-name,
  .exec-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .history-time,
  .knowledge-desc,
  .plugin-desc,
  .exec-time {
    font-size: 11px;
    color: var(--text-muted);
  }

  .exec-status {
    font-size: 14px;
  }

  .skills-search-input {
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 13px;
    margin-bottom: 12px;
  }

  .skills-search-input:focus {
    outline: none;
    border-color: var(--text-secondary);
  }

  .skills-stats {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  .skill-category {
    margin-bottom: 16px;
  }

  .category-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .skill-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .skill-tag {
    font-size: 11px;
    padding: 4px 10px;
    background: var(--bg-tertiary);
    border-radius: 16px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    font-family: monospace;
  }

  .skill-tag:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .market-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .market-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
  }

  .market-icon {
    font-size: 24px;
  }

  .market-info {
    flex: 1;
  }

  .market-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .market-desc {
    font-size: 11px;
    color: var(--text-muted);
  }

  .market-install {
    padding: 4px 12px;
    background: var(--accent-green);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .market-install:hover {
    opacity: 0.85;
  }

  .task-queue {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
  }

  .task-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .task-status.running {
    background: var(--accent-yellow);
    animation: pulse 1.5s infinite;
  }

  .task-status.pending {
    background: var(--text-muted);
  }

  .task-status.completed {
    background: var(--accent-green);
  }

  .task-name {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
  }

  .task-progress {
    font-size: 11px;
    color: var(--text-muted);
  }

  .scheduled-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .scheduled-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-primary);
  }

  .edit-btn,
  .add-task-btn,
  .debug-btn {
    padding: 4px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .edit-btn:hover,
  .add-task-btn:hover,
  .debug-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .add-task-btn {
    width: 100%;
    margin-top: 8px;
  }

  .settings-group {
    margin-bottom: 24px;
  }

  .settings-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border-color);
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .settings-row label {
    font-size: 12px;
    color: var(--text-primary);
  }

  .settings-row select,
  .settings-row input {
    padding: 6px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 12px;
    width: 200px;
  }

  .settings-row select:focus,
  .settings-row input:focus {
    outline: none;
    border-color: var(--text-secondary);
  }

  .plugin-status {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
  }

  .plugin-status.enabled {
    background: var(--accent-green);
    color: white;
  }

  .plugin-status.disabled {
    background: var(--bg-tertiary);
    color: var(--text-muted);
  }

  .monitor-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 16px;
    background: var(--bg-tertiary);
    border-radius: 8px;
    text-align: center;
  }

  .stat-label {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .debug-controls {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .debug-output {
    background: var(--bg-tertiary);
    border-radius: 8px;
    padding: 12px;
    font-family: monospace;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .debug-line {
    padding: 4px 0;
    border-bottom: 1px solid var(--border-color);
  }

  .debug-line:last-child {
    border-bottom: none;
  }
`;

if (typeof document !== 'undefined') {
    const styleId = 'menu-panel-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = menuPanelStyles;
        document.head.appendChild(style);
    }
}

const MenuPanel: React.FC<MenuPanelProps> = ({ currentView, onClose, t }) => {
    const renderContent = () => {
        switch (currentView) {
            case 'history':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="history-list">
                                <div className="history-item">
                                    <span>💬</span>
                                    <div className="history-info">
                                        <div className="history-title">{t('history.dataAnalysis')}</div>
                                        <div className="history-time">2024-01-15 14:30</div>
                                    </div>
                                </div>
                                <div className="history-item">
                                    <span>💬</span>
                                    <div className="history-info">
                                        <div className="history-title">{t('history.codeDebug')}</div>
                                        <div className="history-time">2024-01-14 10:15</div>
                                    </div>
                                </div>
                                <div className="history-item">
                                    <span>💬</span>
                                    <div className="history-info">
                                        <div className="history-title">{t('history.fileProcess')}</div>
                                        <div className="history-time">2024-01-13 16:45</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'favorites':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="favorites-list">
                                <div className="favorite-item">⭐ {t('favorites.dataAnalysisTemplate')}</div>
                                <div className="favorite-item">⭐ {t('favorites.codeReviewFlow')}</div>
                                <div className="favorite-item">⭐ {t('favorites.deployChecklist')}</div>
                                <div className="favorite-item">⭐ {t('favorites.dbBackupScript')}</div>
                            </div>
                        </div>
                    </div>
                );
            case 'skills':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="skills-search">
                                <input type="text" placeholder={t('skills.searchPlaceholder')} className="skills-search-input" />
                            </div>
                            <div className="skills-stats">{t('skills.totalCount', { count: 156 })}</div>
                            <div className="skills-categories">
                                <div className="skill-category">
                                    <div className="category-title">📁 {t('skills.category.fileSystem')}</div>
                                    <div className="skill-tags">
                                        <span className="skill-tag">file_read</span>
                                        <span className="skill-tag">file_write</span>
                                        <span className="skill-tag">file_delete</span>
                                        <span className="skill-tag">file_list</span>
                                        <span className="skill-tag">file_copy</span>
                                    </div>
                                </div>
                                <div className="skill-category">
                                    <div className="category-title">🌐 {t('skills.category.network')}</div>
                                    <div className="skill-tags">
                                        <span className="skill-tag">http_request</span>
                                        <span className="skill-tag">ping</span>
                                        <span className="skill-tag">dns_lookup</span>
                                        <span className="skill-tag">tcp_send</span>
                                    </div>
                                </div>
                                <div className="skill-category">
                                    <div className="category-title">⚙️ {t('skills.category.system')}</div>
                                    <div className="skill-tags">
                                        <span className="skill-tag">exec_command</span>
                                        <span className="skill-tag">process_list</span>
                                        <span className="skill-tag">system_info</span>
                                    </div>
                                </div>
                                <div className="skill-category">
                                    <div className="category-title">🗄️ {t('skills.category.database')}</div>
                                    <div className="skill-tags">
                                        <span className="skill-tag">postgres_query</span>
                                        <span className="skill-tag">redis_get</span>
                                        <span className="skill-tag">mysql_execute</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'knowledge':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="knowledge-list">
                                <div className="knowledge-item">
                                    <span>📄</span>
                                    <div className="knowledge-info">
                                        <div className="knowledge-title">SOUL.md</div>
                                        <div className="knowledge-desc">{t('knowledge.soulDesc')}</div>
                                    </div>
                                </div>
                                <div className="knowledge-item">
                                    <span>📄</span>
                                    <div className="knowledge-info">
                                        <div className="knowledge-title">SKILL.md</div>
                                        <div className="knowledge-desc">{t('knowledge.skillDesc')}</div>
                                    </div>
                                </div>
                                <div className="knowledge-item">
                                    <span>📘</span>
                                    <div className="knowledge-info">
                                        <div className="knowledge-title">{t('knowledge.apiTitle')}</div>
                                        <div className="knowledge-desc">{t('knowledge.apiDesc')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'skillMarket':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="market-items">
                                <div className="market-item">
                                    <span className="market-icon">📧</span>
                                    <div className="market-info">
                                        <div className="market-name">Email Sender</div>
                                        <div className="market-desc">{t('market.emailDesc')}</div>
                                    </div>
                                    <button className="market-install">{t('market.install')}</button>
                                </div>
                                <div className="market-item">
                                    <span className="market-icon">📊</span>
                                    <div className="market-info">
                                        <div className="market-name">Data Visualizer</div>
                                        <div className="market-desc">{t('market.visualizerDesc')}</div>
                                    </div>
                                    <button className="market-install">{t('market.install')}</button>
                                </div>
                                <div className="market-item">
                                    <span className="market-icon">🤖</span>
                                    <div className="market-info">
                                        <div className="market-name">Code Assistant</div>
                                        <div className="market-desc">{t('market.codeDesc')}</div>
                                    </div>
                                    <button className="market-install">{t('market.install')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'taskQueue':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="task-queue">
                                <div className="task-item">
                                    <span className="task-status running"></span>
                                    <span className="task-name">{t('task.analyzeData')}</span>
                                    <span className="task-progress">45%</span>
                                </div>
                                <div className="task-item">
                                    <span className="task-status pending"></span>
                                    <span className="task-name">{t('task.weeklyReport')}</span>
                                    <span className="task-progress">{t('task.waiting')}</span>
                                </div>
                                <div className="task-item">
                                    <span className="task-status completed"></span>
                                    <span className="task-name">{t('task.dbBackup')}</span>
                                    <span className="task-progress">{t('task.completed')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'scheduledTasks':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="scheduled-list">
                                <div className="scheduled-item">
                                    <span>🕐 {t('scheduled.dailyBackup')}</span>
                                    <button className="edit-btn">{t('scheduled.edit')}</button>
                                </div>
                                <div className="scheduled-item">
                                    <span>🕐 {t('scheduled.weeklyReport')}</span>
                                    <button className="edit-btn">{t('scheduled.edit')}</button>
                                </div>
                                <div className="scheduled-item">
                                    <span>🕐 {t('scheduled.monthlyCleanup')}</span>
                                    <button className="edit-btn">{t('scheduled.edit')}</button>
                                </div>
                            </div>
                            <button className="add-task-btn">+ {t('scheduled.addTask')}</button>
                        </div>
                    </div>
                );
            case 'executionHistory':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="execution-list">
                                <div className="execution-item">
                                    <span className="exec-status success">✅</span>
                                    <div className="exec-info">
                                        <div className="exec-name">{t('history.analyzeData')}</div>
                                        <div className="exec-time">14:32:03 - {t('history.duration', { time: '2.3s' })}</div>
                                    </div>
                                </div>
                                <div className="execution-item">
                                    <span className="exec-status success">✅</span>
                                    <div className="exec-info">
                                        <div className="exec-name">{t('history.readConfig')}</div>
                                        <div className="exec-time">14:30:15 - {t('history.duration', { time: '156ms' })}</div>
                                    </div>
                                </div>
                                <div className="execution-item">
                                    <span className="exec-status error">❌</span>
                                    <div className="exec-info">
                                        <div className="exec-name">{t('history.dbConnect')}</div>
                                        <div className="exec-time">14:28:02 - {t('history.failed')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="settings-group">
                                <div className="settings-title">{t('settings.aiConfig')}</div>
                                <div className="settings-row">
                                    <label>{t('settings.defaultModel')}</label>
                                    <select>
                                        <option>hippox-default-v1</option>
                                        <option>gpt-4</option>
                                        <option>claude-3</option>
                                    </select>
                                </div>
                                <div className="settings-row">
                                    <label>{t('settings.apiKey')}</label>
                                    <input type="password" placeholder={t('settings.apiKeyPlaceholder')} />
                                </div>
                            </div>
                            <div className="settings-group">
                                <div className="settings-title">{t('settings.interfaceConfig')}</div>
                                <div className="settings-row">
                                    <label>{t('settings.theme')}</label>
                                    <select>
                                        <option>{t('settings.themeDark')}</option>
                                        <option>{t('settings.themeLight')}</option>
                                        <option>{t('settings.themeSystem')}</option>
                                    </select>
                                </div>
                                <div className="settings-row">
                                    <label>{t('settings.language')}</label>
                                    <select>
                                        <option>{t('settings.langZh')}</option>
                                        <option>{t('settings.langEn')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'plugins':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="plugins-list">
                                <div className="plugin-item">
                                    <span>🔌</span>
                                    <div className="plugin-info">
                                        <div className="plugin-name">GitHub {t('plugins.integration')}</div>
                                        <div className="plugin-desc">{t('plugins.githubDesc')}</div>
                                    </div>
                                    <span className="plugin-status enabled">{t('plugins.enabled')}</span>
                                </div>
                                <div className="plugin-item">
                                    <span>🔌</span>
                                    <div className="plugin-info">
                                        <div className="plugin-name">Kubernetes {t('plugins.support')}</div>
                                        <div className="plugin-desc">{t('plugins.k8sDesc')}</div>
                                    </div>
                                    <span className="plugin-status enabled">{t('plugins.enabled')}</span>
                                </div>
                                <div className="plugin-item">
                                    <span>🔌</span>
                                    <div className="plugin-info">
                                        <div className="plugin-name">Docker {t('plugins.integration')}</div>
                                        <div className="plugin-desc">{t('plugins.dockerDesc')}</div>
                                    </div>
                                    <span className="plugin-status disabled">{t('plugins.disabled')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'monitor':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="monitor-stats">
                                <div className="stat-card">
                                    <div className="stat-label">{t('monitor.cpuUsage')}</div>
                                    <div className="stat-value">23%</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">{t('monitor.memoryUsage')}</div>
                                    <div className="stat-value">1.2GB / 8GB</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">{t('monitor.apiCalls')}</div>
                                    <div className="stat-value">1,234</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">{t('monitor.skillExecutions')}</div>
                                    <div className="stat-value">567</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'debug':
                return (
                    <div className="menu-panel-content">
                        <div className="panel-section">
                            <div className="debug-controls">
                                <button className="debug-btn">{t('debug.viewRawLogs')}</button>
                                <button className="debug-btn">{t('debug.skillTrace')}</button>
                                <button className="debug-btn">{t('debug.performanceAnalysis')}</button>
                            </div>
                            <div className="debug-output">
                                <div className="debug-line">[DEBUG] {t('debug.registryLoaded')}</div>
                                <div className="debug-line">[DEBUG] {t('debug.skillsReady', { count: 156 })}</div>
                                <div className="debug-line">[DEBUG] {t('debug.waitingForCommand')}</div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="menu-panel">
            <div className="menu-panel-header">
                <div className="menu-panel-title">{t(viewTitles[currentView])}</div>
                <button className="menu-panel-close" onClick={onClose} title={t('common.close')}>
                    ✕
                </button>
            </div>
            <div className="menu-panel-body">{renderContent()}</div>
        </div>
    );
};

export default MenuPanel;