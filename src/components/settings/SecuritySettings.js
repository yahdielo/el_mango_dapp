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
        // Collect all transaction-related data from localStorage
        const history = localStorage.getItem('transactionHistory');
        const swaps = localStorage.getItem('swapHistory');
        const stakes = localStorage.getItem('stakeHistory');
        const liquidity = localStorage.getItem('liquidityHistory');
        
        const exportData = {
            exportDate: new Date().toISOString(),
            transactionHistory: history ? JSON.parse(history) : [],
            swapHistory: swaps ? JSON.parse(swaps) : [],
            stakeHistory: stakes ? JSON.parse(stakes) : [],
            liquidityHistory: liquidity ? JSON.parse(liquidity) : []
        };

        if (Object.values(exportData).every(v => !v || (Array.isArray(v) && v.length === 0))) {
            alert('No transaction history to export');
            return;
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mango-defi-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportHistory = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (window.confirm('This will replace your current transaction history. Continue?')) {
                        if (data.transactionHistory) {
                            localStorage.setItem('transactionHistory', JSON.stringify(data.transactionHistory));
                        }
                        if (data.swapHistory) {
                            localStorage.setItem('swapHistory', JSON.stringify(data.swapHistory));
                        }
                        if (data.stakeHistory) {
                            localStorage.setItem('stakeHistory', JSON.stringify(data.stakeHistory));
                        }
                        if (data.liquidityHistory) {
                            localStorage.setItem('liquidityHistory', JSON.stringify(data.liquidityHistory));
                        }
                        alert('History imported successfully!');
                    }
                } catch (error) {
                    alert('Failed to import history: Invalid file format');
                    console.error('Import error:', error);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <SettingsSection title="Security">
            <div className="settings-item settings-item-compact-toggle">
                <div className="settings-item-content">
                    <div className="settings-item-label">Auto-Approve Token Spending</div>
                    <SettingsToggle
                        checked={autoApprove}
                        onChange={handleAutoApproveChange}
                    />
                </div>
            </div>

            <div className="settings-item">
                <div className="settings-item-label">Transaction History</div>
                <div className="settings-item-description" style={{ marginBottom: '8px', fontSize: '12px', color: '#7A7A7A' }}>
                    Export or import your transaction history
                </div>
                <div className="settings-actions">
                    <button 
                        className="settings-button settings-button-secondary"
                        onClick={handleExportHistory}
                    >
                        Export
                    </button>
                    <button 
                        className="settings-button settings-button-secondary"
                        onClick={handleImportHistory}
                    >
                        Import
                    </button>
                    <button 
                        className="settings-button settings-button-destructive"
                        onClick={handleClearHistory}
                    >
                        Clear
                    </button>
                </div>
            </div>
        </SettingsSection>
    );
};

export default SecuritySettings;

