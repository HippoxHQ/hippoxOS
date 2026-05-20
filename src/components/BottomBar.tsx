import React from 'react';

interface BottomBarProps {
    t: (key: string) => string;
}

const BottomBar: React.FC<BottomBarProps> = ({ t }) => {
    const version = 'v2026.3.8';

    return (
        <div className="bottom-bar">
            <div className="bottom-bar-left">
            </div>
            <div className="bottom-bar-right">
                <span className="version-info">{version}</span>
                <span className="health-status">
                    <span className="status-dot-small"></span>
                    {t('status.healthy')}
                </span>
            </div>
        </div>
    );
};

export default BottomBar;