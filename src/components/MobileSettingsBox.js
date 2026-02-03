import React from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import MobileSwapHeader from './MobileSwapHeader';
import BottomNavigation from './BottomNavigation';
import PreferencesSettings from './settings/PreferencesSettings';
import SecuritySettings from './settings/SecuritySettings';
import ReferralSettings from './settings/ReferralSettings';
import ChainManagement from './settings/ChainManagement';
import AboutSection from './settings/AboutSection';
import './css/SettingsMobile.css';

const MobileSettingsBox = () => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const navigate = useNavigate();

    const handleMenuClick = () => {
        navigate(-1);
    };

    return (
        <div className="mobile-settings-container">
            <MobileSwapHeader 
                onMenuClick={handleMenuClick}
                title="Settings"
            />
            
            <div className="mobile-settings-content">
                <PreferencesSettings />

                <SecuritySettings />

                {isConnected && (
                    <ReferralSettings address={address} chainId={chainId} />
                )}

                <ChainManagement chainId={chainId} />

                <AboutSection />
            </div>

            <BottomNavigation />
        </div>
    );
};

export default MobileSettingsBox;

