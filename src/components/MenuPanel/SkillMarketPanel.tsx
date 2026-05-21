import React from 'react';

interface SkillMarketPanelProps {
  t: (key: string, params?: any) => string;
}

const SkillMarketPanel: React.FC<SkillMarketPanelProps> = ({ t }) => {
  return (
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
  );
};

export default SkillMarketPanel;