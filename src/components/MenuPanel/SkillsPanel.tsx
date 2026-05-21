import React from 'react';

interface SkillsPanelProps {
  t: (key: string, params?: any) => string;
}

const SkillsPanel: React.FC<SkillsPanelProps> = ({ t }) => {
  return (
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
  );
};

export default SkillsPanel;