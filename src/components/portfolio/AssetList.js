import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import AssetCard from './AssetCard';
import '../css/PortfolioMobile.css';

const AssetList = ({ address, isConnected, selectedChain }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('value'); // 'value', 'name', 'change24h'
    const [searchQuery, setSearchQuery] = useState('');

    const fetchAssets = useCallback(async () => {
        if (!finalIsConnected || !finalAddress) {
            setAssets([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // TODO: Fetch actual assets from API/contracts
            // This would:
            // 1. Get all token balances across all chains
            // 2. Get LP token positions
            // 3. Get staked positions
            // 4. Calculate USD values using price oracles
            // 5. Calculate 24h price changes
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Enhanced mock data
            const mockAssets = [
                {
                    id: 1,
                    symbol: 'BNB',
                    name: 'BNB',
                    balance: '52.34',
                    usdValue: 25000.50,
                    change24h: 2.5,
                    chainId: 56,
                    chainName: 'BNB Smart Chain',
                    icon: 'BNB'
                },
                {
                    id: 2,
                    symbol: 'MANGO',
                    name: 'Mango Token',
                    balance: '1000.00',
                    usdValue: 5000.00,
                    change24h: -1.2,
                    chainId: 8453,
                    chainName: 'Base',
                    icon: 'MANGO'
                },
                {
                    id: 3,
                    symbol: 'ETH',
                    name: 'Ethereum',
                    balance: '5.25',
                    usdValue: 15000.00,
                    change24h: 3.8,
                    chainId: 8453,
                    chainName: 'Base',
                    icon: 'ETH'
                },
                {
                    id: 4,
                    symbol: 'USDC',
                    name: 'USD Coin',
                    balance: '5000.00',
                    usdValue: 5000.00,
                    change24h: 0.1,
                    chainId: 42161,
                    chainName: 'Arbitrum One',
                    icon: 'USDC'
                }
            ];
            
            setAssets(mockAssets);
        } catch (error) {
            console.error('Error fetching assets:', error);
            setAssets([]);
        } finally {
            setLoading(false);
        }
    }, [finalIsConnected, finalAddress, selectedChain]);

    useEffect(() => {
        fetchAssets();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchAssets();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [fetchAssets]);

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = !searchQuery || 
            asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesChain = !selectedChain || asset.chainId === selectedChain;
        return matchesSearch && matchesChain;
    });

    const sortedAssets = [...filteredAssets].sort((a, b) => {
        switch (sortBy) {
            case 'value':
                return b.usdValue - a.usdValue;
            case 'name':
                return a.symbol.localeCompare(b.symbol);
            case 'change24h':
                return b.change24h - a.change24h;
            default:
                return 0;
        }
    });

    const handleRefresh = () => {
        fetchAssets();
    };

    if (!finalIsConnected) {
        return (
            <div className="portfolio-card">
                <div className="portfolio-empty-state">
                    <p>Connect your wallet to view your assets</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="portfolio-card">
                <div className="portfolio-loading">Loading assets...</div>
            </div>
        );
    }

    return (
        <div className="portfolio-assets">
            {/* Search and Sort */}
            <div className="portfolio-assets-controls">
                <input
                    type="text"
                    className="portfolio-search-input"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select 
                        className="portfolio-sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="value">Sort by Value</option>
                        <option value="name">Sort by Name</option>
                        <option value="change24h">Sort by 24h Change</option>
                    </select>
                    <button 
                        onClick={handleRefresh}
                        disabled={loading}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--mango-orange)',
                            color: 'var(--mango-orange)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: '8px'
                        }}
                    >
                        {loading ? '...' : '🔄'}
                    </button>
                </div>
            </div>

            {/* Assets List */}
            {sortedAssets.length === 0 ? (
                <div className="portfolio-card">
                    <div className="portfolio-empty-state">
                        <p>No assets found</p>
                    </div>
                </div>
            ) : (
                <div className="portfolio-assets-list">
                    {sortedAssets.map((asset) => (
                        <AssetCard key={asset.id} asset={asset} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AssetList;

