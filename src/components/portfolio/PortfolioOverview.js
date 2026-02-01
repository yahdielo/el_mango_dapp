import React, { useState, useEffect } from 'react';
import chainConfig from '../../services/chainConfig';
import '../css/PortfolioMobile.css';

const PortfolioOverview = ({ address, isConnected, selectedChain }) => {
    const [portfolioData, setPortfolioData] = useState({
        totalValue: 0,
        totalAssets: 0,
        change24h: 0,
        breakdownByChain: {},
        breakdownByType: {}
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isConnected && address) {
            // TODO: Fetch actual portfolio data from API
            setLoading(true);
            setTimeout(() => {
                // Mock data
                setPortfolioData({
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
                });
                setLoading(false);
            }, 1000);
        } else {
            setPortfolioData({
                totalValue: 0,
                totalAssets: 0,
                change24h: 0,
                breakdownByChain: {},
                breakdownByType: {}
            });
            setLoading(false);
        }
    }, [isConnected, address, selectedChain]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    if (!isConnected) {
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
                <div className="portfolio-total-label">Total Portfolio Value</div>
                <div className="portfolio-total-value">{formatCurrency(portfolioData.totalValue)}</div>
                <div className={`portfolio-change ${portfolioData.change24h >= 0 ? 'positive' : 'negative'}`}>
                    {portfolioData.change24h >= 0 ? '+' : ''}{portfolioData.change24h.toFixed(2)}% (24h)
                </div>
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
                                <div className="portfolio-breakdown-label">{chain}</div>
                                <div className="portfolio-breakdown-value">{formatCurrency(value)}</div>
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
                                <div className="portfolio-breakdown-label">{type}</div>
                                <div className="portfolio-breakdown-value">{formatCurrency(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioOverview;

