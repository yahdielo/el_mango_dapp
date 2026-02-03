import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import '../css/PortfolioMobile.css';

const PortfolioChart = ({ address, isConnected, selectedChain }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    
    const [chartData, setChartData] = useState([]);
    const [timeRange, setTimeRange] = useState('7d'); // '7d', '30d', 'all'
    const [loading, setLoading] = useState(true);
    const [topAssets, setTopAssets] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    const fetchChartData = useCallback(async () => {
        if (!finalIsConnected || !finalAddress) {
            setChartData([]);
            setTopAssets([]);
            setRecentActivity([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // TODO: Fetch actual chart data from API
            // This would:
            // 1. Get historical portfolio values for the selected time range
            // 2. Calculate top performing assets
            // 3. Get recent activity summary
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Generate chart data based on time range
            const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const mockData = [];
            const now = Date.now();
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(now - i * 24 * 60 * 60 * 1000);
                mockData.push({
                    date: date.toISOString().split('T')[0],
                    value: 10000 + Math.random() * 5000 + (days - i) * 50 // Trending upward
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
        } catch (error) {
            console.error('Error fetching chart data:', error);
            setChartData([]);
            setTopAssets([]);
            setRecentActivity([]);
        } finally {
            setLoading(false);
        }
    }, [finalIsConnected, finalAddress, selectedChain, timeRange]);

    useEffect(() => {
        fetchChartData();
    }, [fetchChartData]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    if (!finalIsConnected) {
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

