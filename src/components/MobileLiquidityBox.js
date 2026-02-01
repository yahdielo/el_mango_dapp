import React, { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import MobileSwapHeader from './MobileSwapHeader';
import BottomNavigation from './BottomNavigation';
import AddLiquidityCard from './liquidity/AddLiquidityCard';
import RemoveLiquidityCard from './liquidity/RemoveLiquidityCard';
import LiquidityPositionsList from './liquidity/LiquidityPositionsList';
import PoolList from './liquidity/PoolList';
import LiquidityHistory from './liquidity/LiquidityHistory';
import './css/LiquidityMobile.css';

const MobileLiquidityBox = () => {
    // Hooks must be called unconditionally at the top level
    const account = useAccount();
    const address = account?.address || null;
    const isConnected = account?.isConnected || false;
    const chainId = useChainId();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('add'); // 'add', 'remove', 'positions', 'pools', 'history'

    const handleMenuClick = () => {
        navigate(-1);
    };

    return (
        <div className="mobile-liquidity-container">
            <MobileSwapHeader 
                onMenuClick={handleMenuClick}
                title="Liquidity"
            />
            
            <div className="mobile-liquidity-content">
                {/* Tab Navigation */}
                <div className="liquidity-tabs">
                    <button 
                        className={`liquidity-tab ${activeTab === 'add' ? 'active' : ''}`}
                        onClick={() => setActiveTab('add')}
                    >
                        Add
                    </button>
                    <button 
                        className={`liquidity-tab ${activeTab === 'remove' ? 'active' : ''}`}
                        onClick={() => setActiveTab('remove')}
                    >
                        Remove
                    </button>
                    <button 
                        className={`liquidity-tab ${activeTab === 'positions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('positions')}
                    >
                        My Positions
                    </button>
                    <button 
                        className={`liquidity-tab ${activeTab === 'pools' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pools')}
                    >
                        Pools
                    </button>
                    {isConnected && (
                        <button 
                            className={`liquidity-tab ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            History
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                {activeTab === 'add' && (
                    <AddLiquidityCard 
                        address={address}
                        isConnected={isConnected}
                        chainId={chainId}
                    />
                )}

                {activeTab === 'remove' && (
                    <RemoveLiquidityCard 
                        address={address}
                        isConnected={isConnected}
                        chainId={chainId}
                    />
                )}

                {activeTab === 'positions' && (
                    <LiquidityPositionsList 
                        address={address}
                        isConnected={isConnected}
                        chainId={chainId}
                    />
                )}

                {activeTab === 'pools' && (
                    <PoolList chainId={chainId} />
                )}

                {activeTab === 'history' && isConnected && (
                    <LiquidityHistory 
                        address={address}
                        chainId={chainId}
                    />
                )}
            </div>

            <BottomNavigation />
        </div>
    );
};

export default MobileLiquidityBox;

