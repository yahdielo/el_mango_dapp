import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import SettingsSection from './SettingsSection';
import SettingsToggle from './SettingsToggle';
import { exportSwapHistoryCSV, importSwapHistoryCSV, clearSwapHistory, getSwapHistory } from '../../services/transactionHistory';
import '../css/SettingsMobile.css';

const SecuritySettings = () => {
    const { address } = useAccount();
    const [autoApprove, setAutoApprove] = useState(() => {
        return localStorage.getItem('autoApproveTokens') === 'true';
    });
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

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
        const historyCount = getSwapHistory(address).length;
        if (historyCount === 0) {
            alert('No transaction history to clear');
            return;
        }

        const message = address 
            ? `Are you sure you want to clear all transaction history for this wallet (${historyCount} transactions)? This cannot be undone.`
            : `Are you sure you want to clear all transaction history (${historyCount} transactions)? This cannot be undone.`;

        if (window.confirm(message)) {
            const success = clearSwapHistory(address);
            if (success) {
                alert(`Transaction history cleared${address ? ' for this wallet' : ''}`);
            } else {
                alert('Failed to clear transaction history');
            }
        }
    };

    const handleExportHistory = () => {
        setIsExporting(true);
        try {
            const csvData = exportSwapHistoryCSV(address);
            
            if (!csvData || csvData.trim() === '') {
                alert('No transaction history to export');
                setIsExporting(false);
                return;
            }

            // Add BOM for Excel compatibility
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = address 
                ? `mango-defi-history-${address.slice(0, 8)}-${dateStr}.csv`
                : `mango-defi-history-${dateStr}.csv`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            const historyCount = getSwapHistory(address).length;
            alert(`Exported ${historyCount} transaction(s) to ${filename}`);
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export transaction history: ' + (error.message || 'Unknown error'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportHistory = () => {
        setIsImporting(true);
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) {
                setIsImporting(false);
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const fileContent = event.target.result;
                    const fileName = file.name.toLowerCase();
                    const isCSV = fileName.endsWith('.csv');
                    const isJSON = fileName.endsWith('.json');

                    if (!isCSV && !isJSON) {
                        alert('Unsupported file format. Please use CSV or JSON files.');
                        setIsImporting(false);
                        return;
                    }

                    // Ask user if they want to merge or replace
                    const merge = window.confirm(
                        'Import mode:\n\n' +
                        'OK = Merge with existing history (duplicates will be skipped)\n' +
                        'Cancel = Replace existing history'
                    );

                    let result;
                    if (isCSV) {
                        result = importSwapHistoryCSV(fileContent, merge);
                    } else {
                        // Try to parse as JSON
                        try {
                            const jsonData = JSON.parse(fileContent);
                            // Check if it's the old format with multiple history types
                            if (jsonData.swapHistory) {
                                // Old format - extract swapHistory
                                result = importSwapHistory(JSON.stringify(jsonData.swapHistory), merge);
                            } else if (Array.isArray(jsonData)) {
                                // New format - direct array
                                result = importSwapHistory(JSON.stringify(jsonData), merge);
                            } else {
                                throw new Error('Invalid JSON format');
                            }
                        } catch (jsonError) {
                            alert('Failed to parse JSON file: ' + jsonError.message);
                            setIsImporting(false);
                            return;
                        }
                    }

                    if (result.success) {
                        alert(`✓ ${result.message}`);
                    } else {
                        alert(`✗ ${result.message}`);
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    alert('Failed to import history: ' + (error.message || 'Invalid file format'));
                } finally {
                    setIsImporting(false);
                }
            };
            reader.onerror = () => {
                alert('Failed to read file');
                setIsImporting(false);
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
                        disabled={isExporting || isImporting}
                    >
                        {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                    <button 
                        className="settings-button settings-button-secondary"
                        onClick={handleImportHistory}
                        disabled={isExporting || isImporting}
                    >
                        {isImporting ? 'Importing...' : 'Import'}
                    </button>
                    <button 
                        className="settings-button settings-button-destructive"
                        onClick={handleClearHistory}
                        disabled={isExporting || isImporting}
                    >
                        Clear
                    </button>
                </div>
            </div>
        </SettingsSection>
    );
};

export default SecuritySettings;

