import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { createPublicClient, http, formatUnits as viemFormatUnits, parseAbi } from 'viem';
import chainConfig from '../../services/chainConfig';
import { getTokenPrice, getTokenPrices } from '../../services/priceOracle';
import { getPairAddress, getPoolReserves, getPoolTotalSupply } from '../../services/liquidityPool';
import { getAllTokens } from '../../config/tokenLists';
import AssetCard from './AssetCard';
import '../css/PortfolioMobile.css';

const AssetList = ({ address, isConnected, selectedChain }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    const publicClient = usePublicClient();
    
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('value'); // 'value', 'name', 'change24h'
    const [searchQuery, setSearchQuery] = useState('');
    
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

    const fetchAssets = useCallback(async () => {
        if (!finalIsConnected || !finalAddress) {
            setAssets([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const allChains = chainConfig.getAllChains() || [];
            const chainsToCheck = selectedChain 
                ? [chainConfig.getChain(selectedChain)].filter(Boolean)
                : allChains.filter(c => c.type === 'EVM'); // Only EVM chains for now

            const allAssets = [];

            // Fetch assets for each chain
            for (const chain of chainsToCheck) {
                const chainId = parseInt(chain.chainId);
                const chainName = chain.chainName;

                try {
                    // Create public client for this chain
                    let chainPublicClient = publicClient;
                    
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
                            allAssets.push({
                                id: `${chainId}-${nativeSymbol}-native`,
                                symbol: nativeSymbol,
                                name: chain.nativeCurrency?.name || nativeSymbol,
                                balance: nativeBalanceFormatted.toFixed(6),
                                usdValue: nativeValue,
                                change24h: 0, // Would need historical price data
                                chainId: chainId,
                                chainName: chainName,
                                icon: nativeSymbol,
                                type: 'token',
                                address: 'native',
                            });
                        }
                    } catch (error) {
                        console.warn(`Error fetching native balance for ${chainName}:`, error);
                    }

                    // Get token balances
                    const tokens = getAllTokens(chainId);
                    const tokenPromises = tokens.slice(0, 30).map(async (token) => { // Limit to 30 tokens per chain
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
                                    return {
                                        id: `${chainId}-${token.symbol}-${token.address}`,
                                        symbol: token.symbol,
                                        name: token.name || token.symbol,
                                        balance: balanceFormatted.toFixed(6),
                                        usdValue: value,
                                        change24h: 0, // Would need historical price data
                                        chainId: chainId,
                                        chainName: chainName,
                                        icon: token.symbol,
                                        type: 'token',
                                        address: token.address,
                                    };
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
                            allAssets.push(result);
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
                                                return {
                                                    id: `${chainId}-LP-${pairAddress}`,
                                                    symbol: `${token0Info.symbol}/${token1Info.symbol}`,
                                                    name: `${token0Info.symbol}/${token1Info.symbol} LP`,
                                                    balance: lpBalance.toFixed(6),
                                                    usdValue: lpValue,
                                                    change24h: 0,
                                                    chainId: chainId,
                                                    chainName: chainName,
                                                    icon: 'LP',
                                                    type: 'lp',
                                                    address: pairAddress,
                                                };
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
                                allAssets.push(result);
                            }
                        });
                    }

                    // TODO: Fetch staked positions
                    // This would require staking contract addresses and ABI
                    // For now, staked assets are not included

                } catch (error) {
                    console.warn(`Error fetching assets for ${chainName}:`, error);
                }
            }

            setAssets(allAssets);
        } catch (error) {
            console.error('Error fetching assets:', error);
            setAssets([]);
        } finally {
            setLoading(false);
        }
    }, [finalIsConnected, finalAddress, selectedChain, publicClient, erc20Abi, lpTokenAbi]);

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

