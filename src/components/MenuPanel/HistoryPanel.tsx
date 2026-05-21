import React from 'react';

interface HistoryPanelProps {
  t: (key: string, params?: any) => string;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ t }) => {
  return (
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
  );
};

export default HistoryPanel;