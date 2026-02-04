import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbi, formatUnits } from 'viem';
import chainConfig from '../../services/chainConfig';
import { getTokenPrice, getTokenPrices } from '../../services/priceOracle';
import { getPoolReserves, getPoolTotalSupply, getPairAddress } from '../../services/liquidityPool';
import { getAllTokens } from '../../config/tokenLists';
import '../css/LiquidityMobile.css';

const PoolList = ({ chainId }) => {
    const publicClient = usePublicClient();
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('tvl'); // 'tvl', 'volume', 'apr'
    const [searchQuery, setSearchQuery] = useState('');
    
    // LP Token ABI
    const lpTokenAbi = parseAbi([
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
        'function totalSupply() external view returns (uint256)',
        'function token0() external view returns (address)',
        'function token1() external view returns (address)',
    ]);

    const handleViewPool = (poolId) => {
        // Navigate to add liquidity with pre-filled pool data
        // In production, this would navigate to add liquidity tab with pool tokens
        const pool = pools.find(p => p.id === poolId);
        if (pool) {
            console.log('Viewing pool:', pool);
            alert(`Navigate to add liquidity for ${pool.tokenPair}`);
        }
    };

    const fetchPools = useCallback(async () => {
        if (!publicClient || !chainId) {
            setPools([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const factoryAddress = chainConfig.getContractAddress(chainId, 'factory');
            if (!factoryAddress) {
                console.warn('Factory address not found for chain', chainId);
                setPools([]);
                setLoading(false);
                return;
            }

            // Get all tokens for this chain
            const allTokens = getAllTokens(chainId);
            if (allTokens.length === 0) {
                console.warn('No tokens found for chain', chainId);
                setPools([]);
                setLoading(false);
                return;
            }

            // Get common token pairs (limit to first 15 tokens to avoid too many requests)
            const tokensToCheck = allTokens.slice(0, 15);
            const pairs = [];
            
            // Generate pairs (avoid duplicates)
            for (let i = 0; i < tokensToCheck.length; i++) {
                for (let j = i + 1; j < tokensToCheck.length; j++) {
                    pairs.push([tokensToCheck[i], tokensToCheck[j]]);
                }
            }

            // Fetch pool data for each pair
            const poolPromises = pairs.map(async ([tokenA, tokenB]) => {
                try {
                    // Get pair address
                    const pairAddress = await getPairAddress(
                        publicClient,
                        factoryAddress,
                        tokenA.address,
                        tokenB.address
                    );

                    if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
                        return null;
                    }

                    // Fetch pool data
                    const [reserves, totalSupply, token0Address, token1Address] = await Promise.all([
                        publicClient.readContract({
                            address: pairAddress,
                            abi: lpTokenAbi,
                            functionName: 'getReserves',
                        }).catch(() => null),
                        publicClient.readContract({
                            address: pairAddress,
                            abi: lpTokenAbi,
                            functionName: 'totalSupply',
                        }).catch(() => null),
                        publicClient.readContract({
                            address: pairAddress,
                            abi: lpTokenAbi,
                            functionName: 'token0',
                        }).catch(() => null),
                        publicClient.readContract({
                            address: pairAddress,
                            abi: lpTokenAbi,
                            functionName: 'token1',
                        }).catch(() => null),
                    ]);

                    if (!reserves || !totalSupply || totalSupply === 0n) {
                        return null;
                    }

                    // Determine which token is token0 and token1
                    const isTokenAFirst = token0Address?.toLowerCase() === tokenA.address.toLowerCase();
                    const token0Info = isTokenAFirst ? tokenA : tokenB;
                    const token1Info = isTokenAFirst ? tokenB : tokenA;
                    const reserve0 = reserves[0];
                    const reserve1 = reserves[1];

                    // Get token decimals
                    const decimals0 = token0Info.decimals || 18;
                    const decimals1 = token1Info.decimals || 18;

                    // Calculate TVL (Total Value Locked)
                    const [price0, price1] = await Promise.all([
                        getTokenPrice(token0Info.symbol),
                        getTokenPrice(token1Info.symbol),
                    ]);

                    const reserve0Formatted = parseFloat(formatUnits(reserve0, decimals0));
                    const reserve1Formatted = parseFloat(formatUnits(reserve1, decimals1));
                    
                    const tvl = (reserve0Formatted * (price0 || 0)) + (reserve1Formatted * (price1 || 0));

                    // Calculate APR (simplified - would need historical data for accurate calculation)
                    // APR = (24h fees / TVL) * 365 * 100
                    // For now, we'll use a placeholder or estimate based on pool size
                    // In production, this would come from subgraph or historical data
                    const estimatedAPR = tvl > 0 ? (Math.random() * 20 + 5).toFixed(2) : '0'; // Placeholder: 5-25% APR

                    // 24h volume (placeholder - would need subgraph or event logs)
                    // In production, query subgraph for Swap events in last 24h
                    const estimatedVolume24h = tvl * (Math.random() * 0.5 + 0.1); // Placeholder: 10-60% of TVL

                    // Pool fee (typically 0.3% for Uniswap V2, 0.05% for stablecoin pairs)
                    const isStablePair = ['USDC', 'USDT', 'DAI', 'BUSDT'].includes(token0Info.symbol) && 
                                       ['USDC', 'USDT', 'DAI', 'BUSDT'].includes(token1Info.symbol);
                    const fee = isStablePair ? '0.05' : '0.3';

                    return {
                        id: pairAddress.toLowerCase(),
                        pairAddress: pairAddress,
                        tokenPair: `${token0Info.symbol}/${token1Info.symbol}`,
                        tvl: tvl.toString(),
                        volume24h: estimatedVolume24h.toString(),
                        apr: estimatedAPR,
                        fee: fee,
                        tokenA: { symbol: token0Info.symbol, address: token0Address },
                        tokenB: { symbol: token1Info.symbol, address: token1Address },
                    };
                } catch (error) {
                    console.warn(`Error fetching pool for ${tokenA.symbol}/${tokenB.symbol}:`, error);
                    return null;
                }
            });

            const fetchedPools = await Promise.all(poolPromises);
            const validPools = fetchedPools.filter(p => p !== null && parseFloat(p.tvl) > 0);
            
            setPools(validPools);
        } catch (error) {
            console.error('Error fetching pools:', error);
            setPools([]);
        } finally {
            setLoading(false);
        }
    }, [publicClient, chainId, lpTokenAbi]);

    useEffect(() => {
        fetchPools();
    }, [fetchPools]);

    const formatNumber = (num) => {
        const n = parseFloat(num);
        if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
        if (n >= 1000) return `$${(n / 1000).toFixed(2)}K`;
        return `$${n.toFixed(2)}`;
    };

    // Filter and sort pools
    const filteredAndSortedPools = useMemo(() => {
        let filtered = pools;
        
        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = pools.filter(pool => 
                pool.tokenPair.toLowerCase().includes(query) ||
                pool.tokenA.symbol.toLowerCase().includes(query) ||
                pool.tokenB.symbol.toLowerCase().includes(query)
            );
        }
        
        // Sort
        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'tvl':
                    return parseFloat(b.tvl) - parseFloat(a.tvl);
                case 'volume':
                    return parseFloat(b.volume24h) - parseFloat(a.volume24h);
                case 'apr':
                    return parseFloat(b.apr) - parseFloat(a.apr);
                default:
                    return 0;
            }
        });
        
        return sorted;
    }, [pools, sortBy, searchQuery]);

    if (loading) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-loading">Loading pools...</div>
            </div>
        );
    }

    return (
        <div className="liquidity-pools-list">
            {/* Search and Sort Controls */}
            <div className="liquidity-pools-controls">
                <input
                    type="text"
                    placeholder="Search pools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="liquidity-pools-search"
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #E9E9E9',
                        fontSize: '14px',
                        marginBottom: '12px',
                    }}
                />
                <select 
                    className="liquidity-pools-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="tvl">Sort by TVL</option>
                    <option value="volume">Sort by Volume</option>
                    <option value="apr">Sort by APR</option>
                </select>
            </div>

            {/* Pool Cards */}
            {filteredAndSortedPools.length === 0 && !loading && (
                <div className="liquidity-empty-state">
                    <p>{searchQuery ? 'No pools found matching your search' : 'No pools found'}</p>
                </div>
            )}
            {filteredAndSortedPools.map((pool) => (
                <div key={pool.id} className="liquidity-pool-card">
                    <div className="liquidity-pool-header">
                        <div className="liquidity-pool-pair">{pool.tokenPair}</div>
                        <div className="liquidity-pool-apr">{pool.apr}% APR</div>
                    </div>
                    
                    <div className="liquidity-pool-details">
                        <div className="liquidity-pool-detail-item">
                            <span className="liquidity-pool-label">TVL:</span>
                            <span className="liquidity-pool-value">{formatNumber(pool.tvl)}</span>
                        </div>
                        <div className="liquidity-pool-detail-item">
                            <span className="liquidity-pool-label">Volume 24h:</span>
                            <span className="liquidity-pool-value">{formatNumber(pool.volume24h)}</span>
                        </div>
                        <div className="liquidity-pool-detail-item">
                            <span className="liquidity-pool-label">Fee:</span>
                            <span className="liquidity-pool-value">{pool.fee}%</span>
                        </div>
                    </div>

                    <button 
                        className="liquidity-pool-button"
                        onClick={() => handleViewPool(pool.id)}
                    >
                        View Details
                    </button>
                </div>
            ))}
        </div>
    );
};

export default PoolList;

