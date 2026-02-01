import React from 'react';
import { useDisconnect } from 'wagmi';
import ConnectWallet from '../connectWallet';
import SettingsSection from './SettingsSection';
import '../css/SettingsMobile.css';

const WalletSettings = ({ address, isConnected, chainId, onDisconnect }) => {
    const { disconnect } = useDisconnect();

    const formatAddress = (addr) => {
        if (!addr) return 'Not Connected';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const getChainName = (chainId) => {
        // You can import chainConfig here if needed
        const chainNames = {
            8453: 'Base',
            56: 'BNB Smart Chain',
            42161: 'Arbitrum One',
        };
        return chainNames[chainId] || `Chain ${chainId}`;
    };

    const handleDisconnect = () => {
        if (window.confirm('Are you sure you want to disconnect your wallet?')) {
            disconnect();
        }
    };

    return (
        <SettingsSection title="Wallet">
            {!isConnected ? (
                <div className="settings-wallet-connect">
                    <p className="settings-description">Connect your wallet to get started</p>
                    <ConnectWallet />
                </div>
            ) : (
                <>
                    <div className="settings-item">
                        <div className="settings-item-label">Address</div>
                        <div className="settings-item-value settings-address">
                            {formatAddress(address)}
                            <button 
                                className="settings-copy-button"
                                onClick={() => {
                                    navigator.clipboard.writeText(address);
                                }}
                                title="Copy address"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M5.5 3.5H3.5C2.67 3.5 2 4.17 2 5V12.5C2 13.33 2.67 14 3.5 14H11C11.83 14 12.5 13.33 12.5 12.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                    <path d="M9.5 2H13.5C14.33 2 15 2.67 15 3.5V9.5M9.5 2H6.5C5.67 2 5 2.67 5 3.5V9.5M9.5 2V6.5H15M15 6.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div className="settings-item">
                        <div className="settings-item-label">Network</div>
                        <div className="settings-item-value">{getChainName(chainId)}</div>
                    </div>

                    <div className="settings-actions">
                        <button 
                            className="settings-button settings-button-secondary"
                            onClick={handleDisconnect}
                        >
                            Disconnect Wallet
                        </button>
                    </div>
                </>
            )}
        </SettingsSection>
    );
};

export default WalletSettings;

