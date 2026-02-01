import React, { useState, useEffect } from 'react';
import SettingsSection from './SettingsSection';
import SettingsToggle from './SettingsToggle';
import SettingsInput from './SettingsInput';
import '../css/SettingsMobile.css';

const PreferencesSettings = () => {
    const [slippageTolerance, setSlippageTolerance] = useState(() => {
        return localStorage.getItem('slippageTolerance') || '0.5';
    });
    
    const [transactionDeadline, setTransactionDeadline] = useState(() => {
        return localStorage.getItem('transactionDeadline') || '20';
    });

    const [showZeroBalances, setShowZeroBalances] = useState(() => {
        return localStorage.getItem('showZeroBalances') !== 'false';
    });

    const [currency, setCurrency] = useState(() => {
        return localStorage.getItem('currency') || 'USD';
    });

    useEffect(() => {
        localStorage.setItem('slippageTolerance', slippageTolerance);
    }, [slippageTolerance]);

    useEffect(() => {
        localStorage.setItem('transactionDeadline', transactionDeadline);
    }, [transactionDeadline]);

    useEffect(() => {
        localStorage.setItem('showZeroBalances', showZeroBalances);
    }, [showZeroBalances]);

    useEffect(() => {
        localStorage.setItem('currency', currency);
    }, [currency]);

    return (
        <SettingsSection title="Preferences">
            <div className="settings-item">
                <div className="settings-item-label">Slippage Tolerance</div>
                <SettingsInput
                    type="text"
                    value={slippageTolerance}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 50) {
                            setSlippageTolerance(value);
                        }
                    }}
                    suffix="%"
                    placeholder="0.5"
                />
            </div>

            <div className="settings-item">
                <div className="settings-item-label">Transaction Deadline</div>
                <SettingsInput
                    type="text"
                    value={transactionDeadline}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value) && parseInt(value) <= 60) {
                            setTransactionDeadline(value);
                        }
                    }}
                    suffix="minutes"
                    placeholder="20"
                />
            </div>

            <div className="settings-item">
                <div className="settings-item-label">Currency</div>
                <select 
                    className="settings-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                </select>
            </div>

            <div className="settings-item">
                <div className="settings-item-content">
                    <div className="settings-item-label">Show Zero Balances</div>
                    <SettingsToggle
                        checked={showZeroBalances}
                        onChange={setShowZeroBalances}
                    />
                </div>
            </div>
        </SettingsSection>
    );
};

export default PreferencesSettings;

