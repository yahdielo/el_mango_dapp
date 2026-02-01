import React, { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import MobileSwapHeader from './MobileSwapHeader';
import BottomNavigation from './BottomNavigation';
import MobileStakeCard from './stake/MobileStakeCard';
import StakePoolList from './stake/StakePoolList';
import ActiveStakesList from './stake/ActiveStakesList';
import StakeRewardsDisplay from './stake/StakeRewardsDisplay';
import StakeHistory from './stake/StakeHistory';
import './css/StakeMobile.css';

const MobileStakeBox = () => {
    // Hooks must be called unconditionally at the top level
    const account = useAccount();
    const address = account?.address || null;
    const isConnected = account?.isConnected || false;
    const chainId = useChainId();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('stake'); // 'stake', 'pools', 'active', 'rewards', 'history'

    const handleMenuClick = () => {
        navigate(-1);
    };

    return (
        <div className="mobile-stake-container">
            <MobileSwapHeader 
                onMenuClick={handleMenuClick}
                title="Stake"
            />
            
            <div className="mobile-stake-content">
                {/* Main Tabs */}
                <div className="stake-tabs">
                    <button 
                        className={`stake-tab ${activeTab === 'stake' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stake')}
                    >
                        Stake
                    </button>
                    <button 
                        className={`stake-tab ${activeTab === 'pools' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pools')}
                    >
                        Pools
                    </button>
                    {isConnected && (
                        <>
                            <button 
                                className={`stake-tab ${activeTab === 'active' ? 'active' : ''}`}
                                onClick={() => setActiveTab('active')}
                            >
                                My Stakes
                            </button>
                            <button 
                                className={`stake-tab ${activeTab === 'rewards' ? 'active' : ''}`}
                                onClick={() => setActiveTab('rewards')}
                            >
                                Rewards
                            </button>
                            <button 
                                className={`stake-tab ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => setActiveTab('history')}
                            >
                                History
                            </button>
                        </>
                    )}
                </div>

                {/* Tab Content */}
                {activeTab === 'stake' && (
                    <MobileStakeCard 
                        address={address}
                        isConnected={isConnected}
                        chainId={chainId}
                    />
                )}

                {activeTab === 'pools' && (
                    <StakePoolList chainId={chainId} />
                )}

                {activeTab === 'active' && isConnected && (
                    <ActiveStakesList 
                        address={address}
                        chainId={chainId}
                    />
                )}

                {activeTab === 'rewards' && isConnected && (
                    <StakeRewardsDisplay 
                        address={address}
                        chainId={chainId}
                    />
                )}

                {activeTab === 'history' && isConnected && (
                    <StakeHistory 
                        address={address}
                        chainId={chainId}
                    />
                )}
            </div>

            <BottomNavigation />
        </div>
    );
};

export default MobileStakeBox;

