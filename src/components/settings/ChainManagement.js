import React, { useState, useEffect, useCallback } from 'react';
import { useSwitchChain, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import SettingsSection from './SettingsSection';
import ChainStatusBadge from '../ChainStatusBadge';
import '../css/SettingsMobile.css';

const ChainManagement = ({ chainId: propChainId }) => {
    const { switchChain, isPending, data: switchTxHash } = useSwitchChain();
    const currentChainId = useChainId();
    const activeChainId = propChainId || currentChainId;
    const supportedChains = chainConfig.getAllChains() || [];
    const [imageErrors, setImageErrors] = useState(new Set());
    const [switchingChain, setSwitchingChain] = useState(null);
    const [switchError, setSwitchError] = useState(null);
    const [switchSuccess, setSwitchSuccess] = useState(null);
    const [switchProgress, setSwitchProgress] = useState(0);

    // Track transaction status if switchChain returns a transaction hash
    const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({
        hash: switchTxHash,
        query: {
            enabled: !!switchTxHash && !!switchingChain,
        },
    });

    // Update progress during switch
    useEffect(() => {
        if (switchingChain && isPending) {
            // Simulate progress (0-80% during pending)
            const progressInterval = setInterval(() => {
                setSwitchProgress(prev => {
                    if (prev < 80) return prev + 10;
                    return prev;
                });
            }, 500);
            return () => clearInterval(progressInterval);
        }
    }, [switchingChain, isPending]);

    // Handle transaction confirmation
    useEffect(() => {
        if (switchTxHash && switchingChain) {
            if (isConfirmed) {
                setSwitchProgress(100);
                // Wait a bit for chain to actually switch
                setTimeout(() => {
                    if (parseInt(activeChainId) === parseInt(switchingChain)) {
                        setSwitchingChain(null);
                        setSwitchSuccess(switchingChain);
                        setSwitchError(null);
                        setSwitchProgress(0);
                        setTimeout(() => setSwitchSuccess(null), 3000);
                    }
                }, 1000);
            } else if (isTxError) {
                setSwitchError('Transaction failed');
                setSwitchingChain(null);
                setSwitchProgress(0);
                setTimeout(() => setSwitchError(null), 5000);
            }
        }
    }, [switchTxHash, isConfirmed, isTxError, switchingChain, activeChainId]);

    // Clear switching state when chain actually changes (fallback if no tx hash)
    useEffect(() => {
        if (switchingChain && !switchTxHash && parseInt(activeChainId) === parseInt(switchingChain)) {
            setSwitchingChain(null);
            setSwitchSuccess(switchingChain);
            setSwitchError(null);
            setSwitchProgress(0);
            // Clear success message after 3 seconds
            setTimeout(() => setSwitchSuccess(null), 3000);
        }
    }, [activeChainId, switchingChain, switchTxHash]);

    // Clear error when switching starts
    useEffect(() => {
        if ((isPending || isConfirming) && switchingChain) {
            setSwitchError(null);
        }
    }, [isPending, isConfirming, switchingChain]);

    const handleImageError = (chainId) => {
        setImageErrors(prev => new Set(prev).add(chainId));
    };

    const handleSwitchChain = useCallback(async (targetChainId) => {
        if (parseInt(targetChainId) === activeChainId) {
            return; // Already on this chain
        }

        if (switchingChain) {
            // Already switching, ignore
            return;
        }

        setSwitchingChain(targetChainId);
        setSwitchError(null);
        setSwitchSuccess(null);
        setSwitchProgress(0);
        
        try {
            if (switchChain) {
                const chainName = chainConfig.getChain(targetChainId)?.chainName || `Chain ${targetChainId}`;
                
                // Start progress
                setSwitchProgress(10);
                
                await switchChain({ chainId: parseInt(targetChainId) });
                
                // Progress to 50% after switchChain call
                setSwitchProgress(50);
                
                // Note: The actual chain change will be detected by useEffect above
                // If switchChain returns a transaction hash, it will be handled by useWaitForTransactionReceipt
            } else {
                // Fallback: show message
                const chainName = chainConfig.getChain(targetChainId)?.chainName || 'this chain';
                alert(`Please switch to ${chainName} in your wallet`);
                setSwitchingChain(null);
                setSwitchProgress(0);
            }
        } catch (error) {
            console.error('Error switching chain:', error);
            let errorMessage = error.message || 'Unknown error';
            
            // Provide user-friendly error messages
            if (errorMessage.includes('User rejected')) {
                errorMessage = 'Chain switch cancelled by user';
            } else if (errorMessage.includes('not added')) {
                errorMessage = 'Please add this chain to your wallet first';
            } else if (errorMessage.includes('network')) {
                errorMessage = 'Network switch failed. Please try again.';
            }
            
            setSwitchError(errorMessage);
            setSwitchingChain(null);
            setSwitchProgress(0);
            // Show error for 5 seconds
            setTimeout(() => setSwitchError(null), 5000);
        }
    }, [activeChainId, switchingChain, switchChain]);

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
                    const showProgress = isSwitching && (isPending || isConfirming);
                    const progressValue = isSwitching ? switchProgress : 0;
                    
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
                                                {isConfirming ? 'Confirming...' : isPending ? 'Switching...' : 'Processing...'}
                                            </span>
                                        )}
                                        {showSuccess && (
                                            <span className="settings-chain-success-indicator">✓ Switched</span>
                                        )}
                                        {showError && (
                                            <span className="settings-chain-error-indicator">✗ Failed</span>
                                        )}
                                        {showProgress && (
                                            <div className="settings-chain-progress-bar">
                                                <div 
                                                    className="settings-chain-progress-fill"
                                                    style={{ width: `${progressValue}%` }}
                                                />
                                            </div>
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
                                        disabled={isSwitching || isPending || isConfirming}
                                        style={{ 
                                            fontSize: '11px', 
                                            padding: '4px 8px',
                                            height: 'auto',
                                            minWidth: 'auto',
                                            opacity: (isSwitching || isPending || isConfirming) ? 0.6 : 1
                                        }}
                                    >
                                        {isSwitching ? (
                                            <>
                                                <span className="settings-chain-spinner-small"></span>
                                                {isConfirming ? 'Confirming...' : isPending ? 'Switching...' : 'Processing...'}
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

