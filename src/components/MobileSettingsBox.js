import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useDisconnect } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import MobileSwapHeader from './MobileSwapHeader';
import BottomNavigation from './BottomNavigation';
import WalletSettings from './settings/WalletSettings';
import PreferencesSettings from './settings/PreferencesSettings';
import SecuritySettings from './settings/SecuritySettings';
import ReferralSettings from './settings/ReferralSettings';
import ChainManagement from './settings/ChainManagement';
import './css/SettingsMobile.css';

const MobileSettingsBox = () => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { disconnect } = useDisconnect();
    const navigate = useNavigate();

    const handleMenuClick = () => {
        // Could navigate back or open menu
        navigate(-1);
    };

    return (
        <div className="mobile-settings-container">
            <MobileSwapHeader 
                onMenuClick={handleMenuClick}
                title="Settings"
            />
            
            <div className="mobile-settings-content">
                {/* Wallet Settings */}
                <WalletSettings 
                    address={address}
                    isConnected={isConnected}
                    chainId={chainId}
                    onDisconnect={disconnect}
                />

                {/* App Preferences */}
                <PreferencesSettings />

                {/* Security Settings */}
                <SecuritySettings />

                {/* Referral & Rewards */}
                {isConnected && (
                    <ReferralSettings address={address} chainId={chainId} />
                )}

                {/* Chain Management */}
                <ChainManagement chainId={chainId} />
            </div>

            <BottomNavigation />
        </div>
    );
};

export default MobileSettingsBox;

