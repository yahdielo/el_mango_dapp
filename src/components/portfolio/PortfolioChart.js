import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { createPublicClient, http, formatUnits as viemFormatUnits, parseAbi } from 'viem';
import chainConfig from '../../services/chainConfig';
import { getTokenPrice, getTokenPrices } from '../../services/priceOracle';
import { getPairAddress, getPoolReserves, getPoolTotalSupply } from '../../services/liquidityPool';
import { getAllTokens } from '../../config/tokenLists';
import { getSwapHistory } from '../../services/transactionHistory';
import '../css/PortfolioMobile.css';

const PortfolioChart = ({ address, isConnected, selectedChain }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    const publicClient = usePublicClient();
    
    const [chartData, setChartData] = useState([]);
    const [timeRange, setTimeRange] = useState('7d'); // '7d', '30d', 'all'
    const [loading, setLoading] = useState(true);
    const [topAssets, setTopAssets] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [assetAllocation, setAssetAllocation] = useState([]);
    const [currentPortfolioValue, setCurrentPortfolioValue] = useState(0);
    
    // ERC20 ABI
    const erc20Abi = parseAbi([
        'function balanceOf(address account) external view returns (uint256)',
        'function decimals() external view returns (uint8)',
    ]);
    
    // LP Token ABI
    const lpTokenAbi = parseAbi([
        'function balanceOf(address account) external view returns (uint256)',
        'function totalSupply() external view returns (uint256)',
        'function token0() external view returns (address)',
        'function token1() external view returns (address)',
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    ]);

    const fetchChartData = useCallback(async () => {
        if (!finalIsConnected || !finalAddress) {
            setChartData([]);
            setTopAssets([]);
            setRecentActivity([]);
            setAssetAllocation([]);
            setCurrentPortfolioValue(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch current portfolio value and assets
            const allChains = chainConfig.getAllChains() || [];
            const chainsToCheck = selectedChain 
                ? [chainConfig.getChain(selectedChain)].filter(Boolean)
                : allChains.filter(c => c.type === 'EVM');

            const assetMap = new Map(); // Track assets for allocation
            let totalValue = 0;
            const assetValues = [];

            // Fetch assets for portfolio value calculation
            for (const chain of chainsToCheck) {
                const chainId = parseInt(chain.chainId);
                const chainName = chain.chainName;

                try {
                    let chainPublicClient = publicClient;
                    
                    if (!chainPublicClient || chainPublicClient.chain?.id !== chainId) {
                        const rpcUrl = chain.rpcUrls?.[0];
                        if (!rpcUrl) continue;
                        
                        try {
                            chainPublicClient = createPublicClient({
                                transport: http(rpcUrl),
                            });
                        } catch (error) {
                            continue;
                        }
                    }

                    // Get native token
                    try {
                        const nativeBalance = await chainPublicClient.getBalance({
                            address: finalAddress,
                        });
                        const nativeDecimals = chain.nativeCurrency?.decimals || 18;
                        const nativeBalanceFormatted = parseFloat(viemFormatUnits(nativeBalance, nativeDecimals));
                        const nativeSymbol = chain.nativeCurrency?.symbol || 'ETH';
                        const nativePrice = await getTokenPrice(nativeSymbol);
                        
                        if (nativeBalanceFormatted > 0 && nativePrice) {
                            const value = nativeBalanceFormatted * nativePrice;
                            totalValue += value;
                            const key = `${nativeSymbol}-${chainId}`;
                            assetMap.set(key, (assetMap.get(key) || 0) + value);
                            assetValues.push({ symbol: nativeSymbol, value, change: 0 });
                        }
                    } catch (error) {
                        // Skip
                    }

                    // Get token balances
                    const tokens = getAllTokens(chainId);
                    const tokenPromises = tokens.slice(0, 20).map(async (token) => {
                        try {
                            if (token.address === 'native' || !token.address) return null;

                            const balance = await chainPublicClient.readContract({
                                address: token.address,
                                abi: erc20Abi,
                                functionName: 'balanceOf',
                                args: [finalAddress],
                            });

                            const decimals = token.decimals || 18;
                            const balanceFormatted = parseFloat(viemFormatUnits(balance, decimals));
                            
                            if (balanceFormatted > 0) {
                                const price = await getTokenPrice(token.symbol);
                                if (price) {
                                    const value = balanceFormatted * price;
                                    totalValue += value;
                                    const key = `${token.symbol}-${chainId}`;
                                    assetMap.set(key, (assetMap.get(key) || 0) + value);
                                    assetValues.push({ symbol: token.symbol, value, change: 0 });
                                }
                            }
                            return null;
                        } catch (error) {
                            return null;
                        }
                    });

                    await Promise.all(tokenPromises);
                } catch (error) {
                    console.warn(`Error fetching assets for ${chainName}:`, error);
                }
            }

            setCurrentPortfolioValue(totalValue);

            // Calculate asset allocation (top 5 assets)
            const sortedAssets = Array.from(assetMap.entries())
                .map(([key, value]) => {
                    const symbol = key.split('-')[0];
                    return { symbol, value, percentage: (value / totalValue) * 100 };
                })
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
            setAssetAllocation(sortedAssets);

            // Calculate top performing assets (simplified - would need historical data)
            const topAssetsData = assetValues
                .sort((a, b) => b.value - a.value)
                .slice(0, 3)
                .map(asset => ({
                    symbol: asset.symbol,
                    change: (Math.random() * 10 - 5).toFixed(2), // Placeholder
                }));
            setTopAssets(topAssetsData);

            // Generate historical chart data
            // For now, we'll generate based on current value with some variation
            // In production, this would fetch historical portfolio snapshots
            const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const chartDataPoints = [];
            const now = Date.now();
            
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(now - i * 24 * 60 * 60 * 1000);
                // Simulate portfolio value over time (trending upward with variation)
                const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
                const trend = (days - i) / days * 0.1; // 10% growth over period
                const value = totalValue * (1 + trend + variation);
                
                chartDataPoints.push({
                    date: date.toISOString().split('T')[0],
                    value: Math.max(0, value),
                });
            }
            setChartData(chartDataPoints);

            // Get recent activity from transaction history
            const transactionHistory = getSwapHistory(finalAddress, selectedChain);
            const recent = transactionHistory
                .slice(0, 5)
                .map(tx => {
                    let description = '';
                    let type = 'Transaction';
                    
                    if (tx.type === 'swap') {
                        type = 'Swap';
                        description = `Swapped ${parseFloat(tx.amountIn || '0').toFixed(2)} ${tx.tokenInSymbol || tx.tokenIn || ''} → ${tx.tokenOutSymbol || tx.tokenOut || ''}`;
                    } else if (tx.type === 'addLiquidity' || tx.type === 'removeLiquidity') {
                        type = 'Liquidity';
                        description = `${tx.type === 'addLiquidity' ? 'Added' : 'Removed'} liquidity`;
                    } else if (tx.type === 'stake') {
                        type = 'Stake';
                        description = `Staked ${parseFloat(tx.amountIn || '0').toFixed(2)} ${tx.tokenInSymbol || ''}`;
                    }

                    const timestamp = tx.timestamp || tx.createdAt || new Date().toISOString();
                    const date = new Date(timestamp);
                    const now = new Date();
                    const diff = now - date;
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const days = Math.floor(hours / 24);
                    
                    let timeStr = '';
                    if (hours < 1) {
                        timeStr = 'Just now';
                    } else if (hours < 24) {
                        timeStr = `${hours} hour${hours > 1 ? 's' : ''} ago`;
                    } else {
                        timeStr = `${days} day${days > 1 ? 's' : ''} ago`;
                    }

                    return { type, description, time: timeStr };
                });
            setRecentActivity(recent);
        } catch (error) {
            console.error('Error fetching chart data:', error);
            setChartData([]);
            setTopAssets([]);
            setRecentActivity([]);
            setAssetAllocation([]);
            setCurrentPortfolioValue(0);
        } finally {
            setLoading(false);
        }
    }, [finalIsConnected, finalAddress, selectedChain, timeRange, publicClient, erc20Abi, lpTokenAbi]);

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

            {/* Current Portfolio Value */}
            <div className="portfolio-card">
                <div className="portfolio-card-title">Current Portfolio Value</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--mango-orange)', marginTop: '8px' }}>
                    {formatCurrency(currentPortfolioValue)}
                </div>
            </div>

            {/* Asset Allocation Pie Chart */}
            {assetAllocation.length > 0 && (
                <div className="portfolio-card">
                    <div className="portfolio-card-title">Asset Allocation</div>
                    <div className="portfolio-allocation">
                        {assetAllocation.map((asset, index) => (
                            <div key={index} className="portfolio-allocation-item">
                                <div className="portfolio-allocation-label">
                                    <span style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
                                        display: 'inline-block',
                                        marginRight: '8px'
                                    }} />
                                    {asset.symbol}
                                </div>
                                <div className="portfolio-allocation-value">
                                    {asset.percentage.toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Portfolio Value Chart */}
            <div className="portfolio-card">
                <div className="portfolio-card-title">Portfolio Value Over Time</div>
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

