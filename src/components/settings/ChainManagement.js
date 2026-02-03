import React, { useState, useEffect } from 'react';
import { useSwitchChain, useChainId } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import SettingsSection from './SettingsSection';
import ChainStatusBadge from '../ChainStatusBadge';
import '../css/SettingsMobile.css';

const ChainManagement = ({ chainId: propChainId }) => {
    const { switchChain, isPending } = useSwitchChain();
    const currentChainId = useChainId();
    const activeChainId = propChainId || currentChainId;
    const supportedChains = chainConfig.getAllChains() || [];
    const [imageErrors, setImageErrors] = useState(new Set());
    const [switchingChain, setSwitchingChain] = useState(null);
    const [switchError, setSwitchError] = useState(null);
    const [switchSuccess, setSwitchSuccess] = useState(null);

    // Clear switching state when chain actually changes
    useEffect(() => {
        if (switchingChain && parseInt(activeChainId) === parseInt(switchingChain)) {
            setSwitchingChain(null);
            setSwitchSuccess(switchingChain);
            setSwitchError(null);
            // Clear success message after 2 seconds
            setTimeout(() => setSwitchSuccess(null), 2000);
        }
    }, [activeChainId, switchingChain]);

    // Clear error when switching starts
    useEffect(() => {
        if (isPending && switchingChain) {
            setSwitchError(null);
        }
    }, [isPending, switchingChain]);

    const handleImageError = (chainId) => {
        setImageErrors(prev => new Set(prev).add(chainId));
    };

    const handleSwitchChain = async (targetChainId) => {
        if (parseInt(targetChainId) === activeChainId) {
            return; // Already on this chain
        }

        setSwitchingChain(targetChainId);
        setSwitchError(null);
        setSwitchSuccess(null);
        
        try {
            if (switchChain) {
                await switchChain({ chainId: parseInt(targetChainId) });
                // Note: The actual chain change will be detected by useEffect above
            } else {
                // Fallback: show message
                const chainName = chainConfig.getChain(targetChainId)?.chainName || 'this chain';
                alert(`Please switch to ${chainName} in your wallet`);
                setSwitchingChain(null);
            }
        } catch (error) {
            console.error('Error switching chain:', error);
            const errorMessage = error.message || 'Unknown error';
            setSwitchError(errorMessage);
            setSwitchingChain(null);
            // Show error for 3 seconds
            setTimeout(() => setSwitchError(null), 3000);
        }
    };

    return (
        <SettingsSection title="Supported Chains">
            <div className="settings-chains-list">
                {supportedChains.map((chain) => {
                    const isActive = parseInt(chain.chainId) === activeChainId;
                    const isSwitching = switchingChain === chain.chainId;
                    const hasImageError = imageErrors.has(chain.chainId);
                    const showPlaceholder = !chain.img || hasImageError;
                    const showError = switchError && isSwitching;
                    const showSuccess = switchSuccess === chain.chainId;
                    
                    return (
                        <div 
                            key={chain.chainId} 
                            className={`settings-chain-item ${isActive ? 'settings-chain-active' : ''} ${isSwitching ? 'settings-chain-switching' : ''} ${showSuccess ? 'settings-chain-success' : ''} ${showError ? 'settings-chain-error' : ''}`}
                            onClick={() => !isActive && !isSwitching && handleSwitchChain(chain.chainId)}
                            style={{ cursor: isActive || isSwitching ? 'default' : 'pointer' }}
                        >
                            <div className="settings-chain-info">
                                {!showPlaceholder ? (
                                    <img 
                                        src={chain.img} 
                                        alt={chain.chainName} 
                                        className="settings-chain-icon"
                                        onError={() => handleImageError(chain.chainId)}
                                    />
                                ) : (
                                    <div className="settings-chain-icon settings-chain-icon-placeholder">
                                        {chain.chainName.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div className="settings-chain-name">
                                        {chain.chainName}
                                        {isSwitching && (
                                            <span className="settings-chain-switching-indicator">
                                                <span className="settings-chain-spinner"></span>
                                                Switching...
                                            </span>
                                        )}
                                        {showSuccess && (
                                            <span className="settings-chain-success-indicator">✓ Switched</span>
                                        )}
                                        {showError && (
                                            <span className="settings-chain-error-indicator">✗ Failed</span>
                                        )}
                                    </div>
                                    <div className="settings-chain-id">Chain ID: {chain.chainId}</div>
                                    {chain.status && (
                                        <div className="settings-chain-status" style={{ fontSize: '11px', color: chain.status === 'active' ? '#34C759' : '#FF3B30', marginTop: '2px' }}>
                                            {chain.status}
                                        </div>
                                    )}
                                    {showError && (
                                        <div className="settings-chain-error-message" style={{ fontSize: '11px', color: '#FF3B30', marginTop: '4px' }}>
                                            {switchError}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <ChainStatusBadge chainId={parseInt(chain.chainId)} />
                                {!isActive && (
                                    <button
                                        className="settings-button settings-button-secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSwitchChain(chain.chainId);
                                        }}
                                        disabled={isSwitching || isPending}
                                        style={{ 
                                            fontSize: '11px', 
                                            padding: '4px 8px',
                                            height: 'auto',
                                            minWidth: 'auto',
                                            opacity: isSwitching ? 0.6 : 1
                                        }}
                                    >
                                        {isSwitching ? (
                                            <>
                                                <span className="settings-chain-spinner-small"></span>
                                                Switching...
                                            </>
                                        ) : 'Switch'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </SettingsSection>
    );
};

export default ChainManagement;

