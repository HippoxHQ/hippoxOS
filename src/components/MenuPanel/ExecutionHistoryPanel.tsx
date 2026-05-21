import React from 'react';

interface ExecutionHistoryPanelProps {
  t: (key: string, params?: any) => string;
}

const ExecutionHistoryPanel: React.FC<ExecutionHistoryPanelProps> = ({ t }) => {
  return (
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
  );
};

export default ExecutionHistoryPanel;