import React from 'react';
import '../css/SettingsMobile.css';

const SettingsToggle = ({ checked, onChange }) => {
    return (
        <label className="settings-toggle">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="settings-toggle-input"
            />
            <span className="settings-toggle-slider"></span>
        </label>
    );
};

export default SettingsToggle;

