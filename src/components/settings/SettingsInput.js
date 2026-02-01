import React from 'react';
import '../css/SettingsMobile.css';

const SettingsInput = ({ type = 'text', value, onChange, placeholder, suffix, ...props }) => {
    return (
        <div className="settings-input-wrapper">
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="settings-input"
                {...props}
            />
            {suffix && <span className="settings-input-suffix">{suffix}</span>}
        </div>
    );
};

export default SettingsInput;

