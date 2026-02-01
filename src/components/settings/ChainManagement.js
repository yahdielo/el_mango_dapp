import React from 'react';
import chainConfig from '../../services/chainConfig';
import SettingsSection from './SettingsSection';
import ChainStatusBadge from '../ChainStatusBadge';
import '../css/SettingsMobile.css';

const ChainManagement = ({ chainId }) => {
    const supportedChains = chainConfig.getAllChains() || [];
    const [imageErrors, setImageErrors] = React.useState(new Set());

    const handleImageError = (chainId) => {
        setImageErrors(prev => new Set(prev).add(chainId));
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
                            className={`settings-chain-item ${isActive ? 'settings-chain-active' : ''}`}
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
                                </div>
                            </div>
                            <ChainStatusBadge chainId={parseInt(chain.chainId)} />
                        </div>
                    );
                })}
            </div>
        </SettingsSection>
    );
};

export default ChainManagement;

