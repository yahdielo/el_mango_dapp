import React, { useState } from 'react';
import SettingsSection from './SettingsSection';
import SettingsToggle from './SettingsToggle';
import '../css/SettingsMobile.css';

const SecuritySettings = () => {
    const [autoApprove, setAutoApprove] = useState(() => {
        return localStorage.getItem('autoApproveTokens') === 'true';
    });

    const handleAutoApproveChange = (value) => {
        if (value) {
            const confirmed = window.confirm(
                'Warning: Auto-approving token spending may expose you to security risks. ' +
                'Only enable this if you trust the application. Continue?'
            );
            if (confirmed) {
                setAutoApprove(true);
                localStorage.setItem('autoApproveTokens', 'true');
            }
        } else {
            setAutoApprove(false);
            localStorage.setItem('autoApproveTokens', 'false');
        }
    };

    const handleClearHistory = () => {
        if (window.confirm('Are you sure you want to clear all transaction history? This cannot be undone.')) {
            localStorage.removeItem('transactionHistory');
            alert('Transaction history cleared');
        }
    };

    const handleExportHistory = () => {
        const history = localStorage.getItem('transactionHistory');
        if (!history) {
            alert('No transaction history to export');
            return;
        }

        const blob = new Blob([history], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transaction-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <SettingsSection title="Security">
            <div className="settings-item">
                <div className="settings-item-content">
                    <div>
                        <div className="settings-item-label">Auto-Approve Token Spending</div>
                        <div className="settings-item-description">
                            Automatically approve token spending without confirmation
                        </div>
                    </div>
                    <SettingsToggle
                        checked={autoApprove}
                        onChange={handleAutoApproveChange}
                    />
                </div>
            </div>

            <div className="settings-item">
                <div className="settings-item-label">Transaction History</div>
                <div className="settings-actions">
                    <button 
                        className="settings-button settings-button-secondary"
                        onClick={handleExportHistory}
                    >
                        Export History
                    </button>
                    <button 
                        className="settings-button settings-button-destructive"
                        onClick={handleClearHistory}
                    >
                        Clear History
                    </button>
                </div>
            </div>
        </SettingsSection>
    );
};

export default SecuritySettings;

