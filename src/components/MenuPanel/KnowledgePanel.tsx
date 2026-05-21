import React from 'react';

interface KnowledgePanelProps {
  t: (key: string, params?: any) => string;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ t }) => {
  return (
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
  );
};

export default KnowledgePanel;