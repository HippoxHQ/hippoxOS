import React from 'react';

interface TaskQueuePanelProps {
  t: (key: string, params?: any) => string;
}

const TaskQueuePanel: React.FC<TaskQueuePanelProps> = ({ t }) => {
  return (
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
  );
};

export default TaskQueuePanel;