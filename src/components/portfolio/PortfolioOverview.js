import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import chainConfig from '../../services/chainConfig';
import '../css/PortfolioMobile.css';

const PortfolioOverview = ({ address, isConnected, selectedChain }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    
    const [portfolioData, setPortfolioData] = useState({
        totalValue: 0,
        totalAssets: 0,
        change24h: 0,
        breakdownByChain: {},
        breakdownByType: {}
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchPortfolioData = useCallback(async () => {
        if (!finalIsConnected || !finalAddress) {
            setPortfolioData({
                totalValue: 0,
                totalAssets: 0,
                change24h: 0,
                breakdownByChain: {},
                breakdownByType: {}
            });
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // TODO: Fetch actual portfolio data from API/contracts
            // This would aggregate:
            // 1. Token balances across all chains
            // 2. LP token positions
            // 3. Staked positions
            // 4. Calculate USD values using price oracles
            // 5. Calculate 24h changes
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Enhanced mock data with better structure
            const mockData = {
                totalValue: 12500.50,
                totalAssets: 8,
                change24h: 2.5,
                breakdownByChain: {
                    'Base': 5000.25,
                    'BNB Smart Chain': 4500.00,
                    'Arbitrum One': 3000.25
                },
                breakdownByType: {
                    'Tokens': 8000.50,
                    'LP Tokens': 3500.00,
                    'Staked': 1000.00
                }
            };
            
            // Filter by selected chain if specified
            if (selectedChain) {
                const chain = chainConfig.getChain(selectedChain);
                if (chain) {
                    const chainName = chain.chainName;
                    const chainValue = mockData.breakdownByChain[chainName] || 0;
                    mockData.totalValue = chainValue;
                    mockData.breakdownByChain = { [chainName]: chainValue };
                }
            }
            
            setPortfolioData(mockData);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error fetching portfolio data:', error);
            setPortfolioData({
                totalValue: 0,
                totalAssets: 0,
                change24h: 0,
                breakdownByChain: {},
                breakdownByType: {}
            });
        } finally {
            setLoading(false);
        }
    }, [finalIsConnected, finalAddress, selectedChain]);

    useEffect(() => {
        fetchPortfolioData();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchPortfolioData();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [fetchPortfolioData]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const renderChainIcon = (chainName) => {
        const chains = chainConfig.getAllChains() || [];
        const chain = chains.find((c) => c.chainName === chainName);
        if (!chain?.img) return null;

        return (
            <div className="portfolio-breakdown-icon">
                <img src={chain.img} alt={chainName} />
            </div>
        );
    };

    const handleRefresh = () => {
        fetchPortfolioData();
    };

    if (!finalIsConnected) {
        return (
            <div className="portfolio-card">
                <div className="portfolio-empty-state">
                    <p>Connect your wallet to view your portfolio</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="portfolio-card">
                <div className="portfolio-loading">Loading portfolio...</div>
            </div>
        );
    }

    return (
        <div className="portfolio-overview">
            {/* Total Portfolio Value */}
            <div className="portfolio-card portfolio-total-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div className="portfolio-total-label">Total Portfolio Value</div>
                    <button 
                        onClick={handleRefresh}
                        disabled={loading}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--mango-orange)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            padding: '4px 8px'
                        }}
                    >
                        {loading ? 'Refreshing...' : '🔄 Refresh'}
                    </button>
                </div>
                <div className="portfolio-total-value">{formatCurrency(portfolioData.totalValue)}</div>
                <div className={`portfolio-change ${portfolioData.change24h >= 0 ? 'positive' : 'negative'}`}>
                    {portfolioData.change24h >= 0 ? '+' : ''}{portfolioData.change24h.toFixed(2)}% (24h)
                </div>
                {lastUpdate && (
                    <div style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '8px' }}>
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="portfolio-summary-grid">
                <div className="portfolio-summary-card">
                    <div className="portfolio-summary-label">Total Assets</div>
                    <div className="portfolio-summary-value">{portfolioData.totalAssets}</div>
                </div>
                <div className="portfolio-summary-card">
                    <div className="portfolio-summary-label">24h Change</div>
                    <div className={`portfolio-summary-value ${portfolioData.change24h >= 0 ? 'positive' : 'negative'}`}>
                        {portfolioData.change24h >= 0 ? '+' : ''}{portfolioData.change24h.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* Breakdown by Chain */}
            {Object.keys(portfolioData.breakdownByChain).length > 0 && (
                <div className="portfolio-card">
                    <div className="portfolio-card-title">By Chain</div>
                    <div className="portfolio-breakdown">
                        {Object.entries(portfolioData.breakdownByChain).map(([chain, value]) => (
                            <div key={chain} className="portfolio-breakdown-item">
                                <div className="portfolio-breakdown-label">
                                    {renderChainIcon(chain)}
                                    <span>{chain}</span>
                                </div>
                                <div className="portfolio-breakdown-value">
                                    {formatCurrency(value)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Breakdown by Type */}
            {Object.keys(portfolioData.breakdownByType).length > 0 && (
                <div className="portfolio-card">
                    <div className="portfolio-card-title">By Type</div>
                    <div className="portfolio-breakdown">
                        {Object.entries(portfolioData.breakdownByType).map(([type, value]) => (
                            <div key={type} className="portfolio-breakdown-item">
                                <div className="portfolio-breakdown-label">
                                    <span>{type}</span>
                                </div>
                                <div className="portfolio-breakdown-value">
                                    {formatCurrency(value)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioOverview;

