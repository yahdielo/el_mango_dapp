import React, { useState, useEffect } from 'react';
import '../css/PortfolioMobile.css';

const PortfolioChart = ({ address, isConnected, selectedChain }) => {
    const [chartData, setChartData] = useState([]);
    const [timeRange, setTimeRange] = useState('7d'); // '7d', '30d', 'all'
    const [loading, setLoading] = useState(true);
    const [topAssets, setTopAssets] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        if (isConnected && address) {
            // TODO: Fetch actual chart data from API
            setLoading(true);
            setTimeout(() => {
                // Mock chart data
                const mockData = [];
                const now = Date.now();
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now - i * 24 * 60 * 60 * 1000);
                    mockData.push({
                        date: date.toISOString().split('T')[0],
                        value: 10000 + Math.random() * 5000
                    });
                }
                setChartData(mockData);

                // Mock top assets
                setTopAssets([
                    { symbol: 'BNB', change: 5.2 },
                    { symbol: 'ETH', change: 3.8 },
                    { symbol: 'MANGO', change: 2.1 }
                ]);

                // Mock recent activity
                setRecentActivity([
                    { type: 'Swap', description: 'Swapped 10 BNB for MANGO', time: '2 hours ago' },
                    { type: 'Stake', description: 'Staked 100 MANGO', time: '1 day ago' },
                    { type: 'Liquidity', description: 'Added liquidity to BNB/MANGO', time: '2 days ago' }
                ]);

                setLoading(false);
            }, 1000);
        } else {
            setChartData([]);
            setTopAssets([]);
            setRecentActivity([]);
            setLoading(false);
        }
    }, [isConnected, address, selectedChain, timeRange]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    if (!isConnected) {
        return (
            <div className="portfolio-card">
                <div className="portfolio-empty-state">
                    <p>Connect your wallet to view analytics</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="portfolio-card">
                <div className="portfolio-loading">Loading analytics...</div>
            </div>
        );
    }

    // Simple chart visualization
    const maxValue = Math.max(...chartData.map(d => d.value));
    const minValue = Math.min(...chartData.map(d => d.value));
    const range = maxValue - minValue;

    return (
        <div className="portfolio-analytics">
            {/* Time Range Selector */}
            <div className="portfolio-time-range">
                <button
                    className={`portfolio-time-button ${timeRange === '7d' ? 'active' : ''}`}
                    onClick={() => setTimeRange('7d')}
                >
                    7D
                </button>
                <button
                    className={`portfolio-time-button ${timeRange === '30d' ? 'active' : ''}`}
                    onClick={() => setTimeRange('30d')}
                >
                    30D
                </button>
                <button
                    className={`portfolio-time-button ${timeRange === 'all' ? 'active' : ''}`}
                    onClick={() => setTimeRange('all')}
                >
                    All
                </button>
            </div>

            {/* Portfolio Value Chart */}
            <div className="portfolio-card">
                <div className="portfolio-card-title">Portfolio Value</div>
                <div className="portfolio-chart-container">
                    <div className="portfolio-chart">
                        {chartData.map((point, index) => {
                            const height = range > 0 ? ((point.value - minValue) / range) * 100 : 50;
                            return (
                                <div key={index} className="portfolio-chart-bar-container">
                                    <div 
                                        className="portfolio-chart-bar"
                                        style={{ height: `${height}%` }}
                                    />
                                    <div className="portfolio-chart-label">
                                        {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="portfolio-chart-values">
                        <div className="portfolio-chart-min">{formatCurrency(minValue)}</div>
                        <div className="portfolio-chart-max">{formatCurrency(maxValue)}</div>
                    </div>
                </div>
            </div>

            {/* Top Performing Assets */}
            {topAssets.length > 0 && (
                <div className="portfolio-card">
                    <div className="portfolio-card-title">Top Performing Assets</div>
                    <div className="portfolio-top-assets">
                        {topAssets.map((asset, index) => (
                            <div key={index} className="portfolio-top-asset">
                                <div className="portfolio-top-asset-rank">{index + 1}</div>
                                <div className="portfolio-top-asset-symbol">{asset.symbol}</div>
                                <div className={`portfolio-top-asset-change positive`}>
                                    +{asset.change.toFixed(2)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
                <div className="portfolio-card">
                    <div className="portfolio-card-title">Recent Activity</div>
                    <div className="portfolio-recent-activity">
                        {recentActivity.map((activity, index) => (
                            <div key={index} className="portfolio-activity-item">
                                <div className="portfolio-activity-type">{activity.type}</div>
                                <div className="portfolio-activity-details">
                                    <div className="portfolio-activity-description">{activity.description}</div>
                                    <div className="portfolio-activity-time">{activity.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioChart;

