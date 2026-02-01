import React, { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import MobileSwapHeader from './MobileSwapHeader';
import BottomNavigation from './BottomNavigation';
import PortfolioOverview from './portfolio/PortfolioOverview';
import AssetList from './portfolio/AssetList';
import ChainTabs from './portfolio/ChainTabs';
import PortfolioChart from './portfolio/PortfolioChart';
import TransactionHistoryList from './portfolio/TransactionHistoryList';
import './css/PortfolioMobile.css';

const MobilePortfolioBox = () => {
    // Hooks must be called unconditionally at the top level
    const account = useAccount();
    const address = account?.address || null;
    const isConnected = account?.isConnected || false;
    const chainId = useChainId();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'assets', 'history', 'analytics'
    const [selectedChain, setSelectedChain] = useState(null); // null = all chains

    const handleMenuClick = () => {
        navigate(-1);
    };

    return (
        <div className="mobile-portfolio-container">
            <MobileSwapHeader 
                onMenuClick={handleMenuClick}
                title="Portfolio"
            />
            
            <div className="mobile-portfolio-content">
                {/* Chain Tabs */}
                <ChainTabs 
                    selectedChain={selectedChain}
                    onChainSelect={setSelectedChain}
                />

                {/* Main Tabs */}
                <div className="portfolio-tabs">
                    <button 
                        className={`portfolio-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button 
                        className={`portfolio-tab ${activeTab === 'assets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('assets')}
                    >
                        Assets
                    </button>
                    <button 
                        className={`portfolio-tab ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                    <button 
                        className={`portfolio-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        Analytics
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <PortfolioOverview 
                        address={address}
                        isConnected={isConnected}
                        selectedChain={selectedChain}
                    />
                )}

                {activeTab === 'assets' && (
                    <AssetList 
                        address={address}
                        isConnected={isConnected}
                        selectedChain={selectedChain}
                    />
                )}

                {activeTab === 'history' && (
                    <TransactionHistoryList 
                        address={address}
                        isConnected={isConnected}
                        selectedChain={selectedChain}
                    />
                )}

                {activeTab === 'analytics' && (
                    <PortfolioChart 
                        address={address}
                        isConnected={isConnected}
                        selectedChain={selectedChain}
                    />
                )}
            </div>

            <BottomNavigation />
        </div>
    );
};

export default MobilePortfolioBox;

