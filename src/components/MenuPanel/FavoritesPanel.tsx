import React from 'react';

interface FavoritesPanelProps {
  t: (key: string, params?: any) => string;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ t }) => {
  return (
    <div className="panel-section">
      <div className="favorites-list">
        <div className="favorite-item">⭐ {t('favorites.dataAnalysisTemplate')}</div>
        <div className="favorite-item">⭐ {t('favorites.codeReviewFlow')}</div>
        <div className="favorite-item">⭐ {t('favorites.deployChecklist')}</div>
        <div className="favorite-item">⭐ {t('favorites.dbBackupScript')}</div>
      </div>
    </div>
  );
};

export default FavoritesPanel;