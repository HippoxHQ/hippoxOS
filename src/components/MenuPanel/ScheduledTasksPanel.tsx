import React from 'react';

interface ScheduledTasksPanelProps {
  t: (key: string, params?: any) => string;
}

const ScheduledTasksPanel: React.FC<ScheduledTasksPanelProps> = ({ t }) => {
  return (
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
  );
};

export default ScheduledTasksPanel;