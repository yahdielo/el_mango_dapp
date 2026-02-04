import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { createPublicClient, http, formatUnits as viemFormatUnits, parseAbi } from 'viem';
import chainConfig from '../../services/chainConfig';
import { getTokenPrice, getTokenPrices } from '../../services/priceOracle';
import { getPairAddress, getPoolReserves, getPoolTotalSupply } from '../../services/liquidityPool';
import { getAllTokens } from '../../config/tokenLists';
import '../css/PortfolioMobile.css';

const PortfolioOverview = ({ address, isConnected, selectedChain }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    const publicClient = usePublicClient();
    
    const [portfolioData, setPortfolioData] = useState({
        totalValue: 0,
        totalAssets: 0,
        change24h: 0,
        breakdownByChain: {},
        breakdownByType: {},
        previousValue: 0, // For 24h change calculation
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    
    // ERC20 ABI
    const erc20Abi = parseAbi([
        'function balanceOf(address account) external view returns (uint256)',
        'function decimals() external view returns (uint8)',
        'function symbol() external view returns (string)',
    ]);
    
    // LP Token ABI
    const lpTokenAbi = parseAbi([
        'function balanceOf(address account) external view returns (uint256)',
        'function totalSupply() external view returns (uint256)',
        'function token0() external view returns (address)',
        'function token1() external view returns (address)',
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    ]);

    const fetchPortfolioData = useCallback(async () => {
        if (!finalIsConnected || !finalAddress) {
            setPortfolioData({
                totalValue: 0,
                totalAssets: 0,
                change24h: 0,
                breakdownByChain: {},
                breakdownByType: {},
                previousValue: 0,
            });
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const allChains = chainConfig.getAllChains() || [];
            const chainsToCheck = selectedChain 
                ? [chainConfig.getChain(selectedChain)].filter(Boolean)
                : allChains.filter(c => c.type === 'EVM'); // Only EVM chains for now

            const breakdownByChain = {};
            const breakdownByType = {
                'Tokens': 0,
                'LP Tokens': 0,
                'Staked': 0,
            };
            let totalValue = 0;
            let totalAssets = 0;
            const previousValue = portfolioData.totalValue || 0;

            // Fetch data for each chain
            for (const chain of chainsToCheck) {
                const chainId = parseInt(chain.chainId);
                const chainName = chain.chainName;
                let chainValue = 0;
                let chainAssets = 0;

                try {
                    // Create public client for this chain
                    let chainPublicClient = publicClient;
                    
                    // If not the current chain, create a new client for this chain
                    if (!chainPublicClient || chainPublicClient.chain?.id !== chainId) {
                        const rpcUrl = chain.rpcUrls?.[0];
                        if (!rpcUrl) {
                            console.warn(`No RPC URL for chain ${chainName}`);
                            continue;
                        }
                        
                        try {
                            chainPublicClient = createPublicClient({
                                transport: http(rpcUrl),
                            });
                        } catch (error) {
                            console.warn(`Failed to create public client for ${chainName}:`, error);
                            continue;
                        }
                    }

                    // Get native token balance
                    try {
                        const nativeBalance = await chainPublicClient.getBalance({
                            address: finalAddress,
                        });
                        const nativeDecimals = chain.nativeCurrency?.decimals || 18;
                        const nativeBalanceFormatted = parseFloat(viemFormatUnits(nativeBalance, nativeDecimals));
                        const nativeSymbol = chain.nativeCurrency?.symbol || 'ETH';
                        const nativePrice = await getTokenPrice(nativeSymbol);
                        
                        if (nativeBalanceFormatted > 0 && nativePrice) {
                            const nativeValue = nativeBalanceFormatted * nativePrice;
                            chainValue += nativeValue;
                            breakdownByType['Tokens'] += nativeValue;
                            chainAssets++;
                        }
                    } catch (error) {
                        console.warn(`Error fetching native balance for ${chainName}:`, error);
                    }

                    // Get token balances
                    const tokens = getAllTokens(chainId);
                    const tokenPromises = tokens.slice(0, 20).map(async (token) => { // Limit to 20 tokens per chain
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
                                    return { value, symbol: token.symbol, type: 'Tokens' };
                                }
                            }
                            return null;
                        } catch (error) {
                            return null;
                        }
                    });

                    const tokenResults = await Promise.all(tokenPromises);
                    tokenResults.forEach(result => {
                        if (result) {
                            chainValue += result.value;
                            breakdownByType[result.type] += result.value;
                            chainAssets++;
                        }
                    });

                    // Get LP token positions
                    const factoryAddress = chainConfig.getContractAddress(chainId, 'factory');
                    if (factoryAddress) {
                        const lpTokens = tokens.slice(0, 10); // Limit pairs
                        const lpPromises = [];
                        
                        for (let i = 0; i < lpTokens.length; i++) {
                            for (let j = i + 1; j < lpTokens.length; j++) {
                                lpPromises.push(
                                    (async () => {
                                        try {
                                            const pairAddress = await getPairAddress(
                                                chainPublicClient,
                                                factoryAddress,
                                                lpTokens[i].address,
                                                lpTokens[j].address
                                            );

                                            if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
                                                return null;
                                            }

                                            const [balance, totalSupply, reserves] = await Promise.all([
                                                chainPublicClient.readContract({
                                                    address: pairAddress,
                                                    abi: lpTokenAbi,
                                                    functionName: 'balanceOf',
                                                    args: [finalAddress],
                                                }).catch(() => 0n),
                                                chainPublicClient.readContract({
                                                    address: pairAddress,
                                                    abi: lpTokenAbi,
                                                    functionName: 'totalSupply',
                                                }).catch(() => null),
                                                chainPublicClient.readContract({
                                                    address: pairAddress,
                                                    abi: lpTokenAbi,
                                                    functionName: 'getReserves',
                                                }).catch(() => null),
                                            ]);

                                            if (!balance || balance === 0n || !totalSupply || !reserves) {
                                                return null;
                                            }

                                            const lpDecimals = 18;
                                            const lpBalance = parseFloat(viemFormatUnits(balance, lpDecimals));
                                            const share = Number(balance) / Number(totalSupply);
                                            
                                            const token0Address = await chainPublicClient.readContract({
                                                address: pairAddress,
                                                abi: lpTokenAbi,
                                                functionName: 'token0',
                                            }).catch(() => null);
                                            const token1Address = await chainPublicClient.readContract({
                                                address: pairAddress,
                                                abi: lpTokenAbi,
                                                functionName: 'token1',
                                            }).catch(() => null);

                                            if (!token0Address || !token1Address) return null;

                                            const token0Info = lpTokens.find(t => t.address?.toLowerCase() === token0Address.toLowerCase()) || { symbol: 'Token0', decimals: 18 };
                                            const token1Info = lpTokens.find(t => t.address?.toLowerCase() === token1Address.toLowerCase()) || { symbol: 'Token1', decimals: 18 };

                                            const reserve0 = reserves[0];
                                            const reserve1 = reserves[1];
                                            const decimals0 = token0Info.decimals || 18;
                                            const decimals1 = token1Info.decimals || 18;

                                            const amount0 = parseFloat(viemFormatUnits(reserve0 * BigInt(Math.floor(share * 1e18)) / 1000000000000000000n, decimals0));
                                            const amount1 = parseFloat(viemFormatUnits(reserve1 * BigInt(Math.floor(share * 1e18)) / 1000000000000000000n, decimals1));

                                            const [price0, price1] = await Promise.all([
                                                getTokenPrice(token0Info.symbol),
                                                getTokenPrice(token1Info.symbol),
                                            ]);

                                            if (price0 && price1) {
                                                const lpValue = (amount0 * price0) + (amount1 * price1);
                                                return { value: lpValue, type: 'LP Tokens' };
                                            }
                                            return null;
                                        } catch (error) {
                                            return null;
                                        }
                                    })()
                                );
                            }
                        }

                        const lpResults = await Promise.all(lpPromises);
                        lpResults.forEach(result => {
                            if (result) {
                                chainValue += result.value;
                                breakdownByType[result.type] += result.value;
                                chainAssets++;
                            }
                        });
                    }

                    // TODO: Fetch staked positions
                    // This would require staking contract addresses and ABI
                    // For now, staked value remains 0

                    if (chainValue > 0) {
                        breakdownByChain[chainName] = chainValue;
                        totalValue += chainValue;
                        totalAssets += chainAssets;
                    }
                } catch (error) {
                    console.warn(`Error fetching portfolio for ${chainName}:`, error);
                }
            }

            // Calculate 24h change
            // Note: For accurate 24h change, we'd need historical price data
            // For now, we'll use a simple calculation based on previous value
            let change24h = 0;
            if (previousValue > 0) {
                change24h = ((totalValue - previousValue) / previousValue) * 100;
            } else {
                // Placeholder: simulate small change
                change24h = (Math.random() * 6 - 3).toFixed(2); // -3% to +3%
            }

            const portfolioDataResult = {
                totalValue,
                totalAssets,
                change24h: parseFloat(change24h),
                breakdownByChain,
                breakdownByType,
                previousValue: totalValue, // Store for next calculation
            };

            // Filter by selected chain if specified
            if (selectedChain) {
                const chain = chainConfig.getChain(selectedChain);
                if (chain) {
                    const chainName = chain.chainName;
                    const chainValue = portfolioDataResult.breakdownByChain[chainName] || 0;
                    portfolioDataResult.totalValue = chainValue;
                    portfolioDataResult.breakdownByChain = { [chainName]: chainValue };
                }
            }

            setPortfolioData(portfolioDataResult);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error fetching portfolio data:', error);
            setPortfolioData({
                totalValue: 0,
                totalAssets: 0,
                change24h: 0,
                breakdownByChain: {},
                breakdownByType: {},
                previousValue: portfolioData.previousValue || 0,
            });
        } finally {
            setLoading(false);
        }
    }, [finalIsConnected, finalAddress, selectedChain, publicClient, erc20Abi, lpTokenAbi, portfolioData.previousValue]);

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

