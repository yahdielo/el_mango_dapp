import React, { useState, useEffect } from 'react';
import { useChainId } from 'wagmi';
import SettingsSection from './SettingsSection';
import SettingsToggle from './SettingsToggle';
import SettingsInput from './SettingsInput';
import chainConfig from '../../services/chainConfig';
import '../css/SettingsMobile.css';

const PreferencesSettings = () => {
    const chainId = useChainId();
    const slippageSettings = chainConfig.getSlippageTolerance(chainId);
    
    const [slippageTolerance, setSlippageTolerance] = useState(() => {
        const saved = localStorage.getItem('slippageTolerance');
        return saved || (slippageSettings?.default || 0.5).toString();
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

    const [slippageError, setSlippageError] = useState(null);
    const [deadlineError, setDeadlineError] = useState(null);

    // Validate slippage tolerance
    useEffect(() => {
        const slippageValue = parseFloat(slippageTolerance);
        if (isNaN(slippageValue) || slippageValue < 0) {
            setSlippageError('Slippage must be a positive number');
        } else if (slippageSettings?.min && slippageValue < slippageSettings.min) {
            setSlippageError(`Minimum slippage is ${slippageSettings.min}%`);
        } else if (slippageSettings?.max && slippageValue > slippageSettings.max) {
            setSlippageError(`Maximum slippage is ${slippageSettings.max}%`);
        } else if (slippageValue > 50) {
            setSlippageError('Slippage above 50% is not recommended');
        } else {
            setSlippageError(null);
            localStorage.setItem('slippageTolerance', slippageTolerance);
        }
    }, [slippageTolerance, slippageSettings]);

    // Validate transaction deadline
    useEffect(() => {
        const deadlineValue = parseInt(transactionDeadline);
        if (isNaN(deadlineValue) || deadlineValue < 1) {
            setDeadlineError('Deadline must be at least 1 minute');
        } else if (deadlineValue > 60) {
            setDeadlineError('Deadline cannot exceed 60 minutes');
        } else {
            setDeadlineError(null);
            localStorage.setItem('transactionDeadline', transactionDeadline);
        }
    }, [transactionDeadline]);

    useEffect(() => {
        localStorage.setItem('showZeroBalances', showZeroBalances);
    }, [showZeroBalances]);

    useEffect(() => {
        localStorage.setItem('currency', currency);
    }, [currency]);

    const handleSlippagePreset = (preset) => {
        setSlippageTolerance(preset.toString());
    };

    return (
        <SettingsSection title="Preferences">
            <div className="settings-preferences-row">
                <div className="settings-item settings-item-compact">
                    <div className="settings-item-label">Slippage Tolerance</div>
                    <SettingsInput
                        type="text"
                        value={slippageTolerance}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value)) {
                                setSlippageTolerance(value);
                            }
                        }}
                        suffix="%"
                        placeholder={(slippageSettings?.default || 0.5).toString()}
                    />
                    {slippageError && (
                        <div className="settings-error" style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                            {slippageError}
                        </div>
                    )}
                    {!slippageError && slippageSettings && (
                        <div className="settings-presets" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            {[slippageSettings.min || 0.1, slippageSettings.default || 0.5, slippageSettings.max || 5.0].map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => handleSlippagePreset(preset)}
                                    className={`settings-preset-button ${parseFloat(slippageTolerance) === preset ? 'active' : ''}`}
                                    style={{
                                        padding: '2px 6px',
                                        fontSize: '10px',
                                        border: '1px solid #E9E9E9',
                                        borderRadius: '4px',
                                        background: parseFloat(slippageTolerance) === preset ? 'var(--mango-orange)' : 'transparent',
                                        color: parseFloat(slippageTolerance) === preset ? '#FFFFFF' : '#000000',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {preset}%
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="settings-item settings-item-compact">
                    <div className="settings-item-label">Transaction Deadline</div>
                    <SettingsInput
                        type="text"
                        value={transactionDeadline}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) {
                                setTransactionDeadline(value);
                            }
                        }}
                        suffix="minutes"
                        placeholder="20"
                    />
                    {deadlineError && (
                        <div className="settings-error" style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                            {deadlineError}
                        </div>
                    )}
                </div>

                <div className="settings-item settings-item-compact">
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

