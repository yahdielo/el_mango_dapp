import React from 'react';
import '../css/SettingsMobile.css';

const SettingsSection = ({ title, children }) => {
    return (
        <div className="settings-section">
            <div className="settings-section-title">{title}</div>
            <div className="settings-section-content">
                {children}
            </div>
        </div>
    );
};

export default SettingsSection;

