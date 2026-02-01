import React from 'react';
import chainConfig from '../../services/chainConfig';
import SettingsSection from './SettingsSection';
import ChainStatusBadge from '../ChainStatusBadge';
import '../css/SettingsMobile.css';

const ChainManagement = ({ chainId }) => {
    const supportedChains = chainConfig.getAllChains() || [];

    return (
        <SettingsSection title="Supported Chains">
            <div className="settings-chains-list">
                {supportedChains.map((chain) => {
                    const isActive = parseInt(chain.chainId) === chainId;
                    return (
                        <div 
                            key={chain.chainId} 
                            className={`settings-chain-item ${isActive ? 'settings-chain-active' : ''}`}
                        >
                            <div className="settings-chain-info">
                                {chain.img && (
                                    <img 
                                        src={chain.img} 
                                        alt={chain.chainName} 
                                        className="settings-chain-icon"
                                    />
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

