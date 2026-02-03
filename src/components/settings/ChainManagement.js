import React, { useState } from 'react';
import { useSwitchChain } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import SettingsSection from './SettingsSection';
import ChainStatusBadge from '../ChainStatusBadge';
import '../css/SettingsMobile.css';

const ChainManagement = ({ chainId }) => {
    const { switchChain, isPending } = useSwitchChain();
    const supportedChains = chainConfig.getAllChains() || [];
    const [imageErrors, setImageErrors] = useState(new Set());
    const [switchingChain, setSwitchingChain] = useState(null);

    const handleImageError = (chainId) => {
        setImageErrors(prev => new Set(prev).add(chainId));
    };

    const handleSwitchChain = async (targetChainId) => {
        if (parseInt(targetChainId) === chainId) {
            return; // Already on this chain
        }

        setSwitchingChain(targetChainId);
        try {
            if (switchChain) {
                await switchChain({ chainId: parseInt(targetChainId) });
            } else {
                // Fallback: show message
                alert(`Please switch to ${chainConfig.getChain(targetChainId)?.chainName || 'this chain'} in your wallet`);
            }
        } catch (error) {
            console.error('Error switching chain:', error);
            alert('Failed to switch chain: ' + (error.message || 'Unknown error'));
        } finally {
            setSwitchingChain(null);
        }
    };

    return (
        <SettingsSection title="Supported Chains">
            <div className="settings-chains-list">
                {supportedChains.map((chain) => {
                    const isActive = parseInt(chain.chainId) === chainId;
                    const hasImageError = imageErrors.has(chain.chainId);
                    const showPlaceholder = !chain.img || hasImageError;
                    
                    return (
                        <div 
                            key={chain.chainId} 
                            className={`settings-chain-item ${isActive ? 'settings-chain-active' : ''} ${switchingChain === chain.chainId ? 'settings-chain-switching' : ''}`}
                            onClick={() => !isActive && handleSwitchChain(chain.chainId)}
                            style={{ cursor: isActive ? 'default' : 'pointer' }}
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
                                    <div className="settings-chain-name">{chain.chainName}</div>
                                    <div className="settings-chain-id">Chain ID: {chain.chainId}</div>
                                    {chain.status && (
                                        <div className="settings-chain-status" style={{ fontSize: '11px', color: chain.status === 'active' ? '#34C759' : '#FF3B30', marginTop: '2px' }}>
                                            {chain.status}
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
                                        disabled={switchingChain === chain.chainId || isPending}
                                        style={{ 
                                            fontSize: '11px', 
                                            padding: '4px 8px',
                                            height: 'auto',
                                            minWidth: 'auto'
                                        }}
                                    >
                                        {switchingChain === chain.chainId ? 'Switching...' : 'Switch'}
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

