import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi, formatUnits, parseUnits } from 'viem';
import chainConfig from '../../services/chainConfig';
import { getTokenPrice, getTokenPrices } from '../../services/priceOracle';
import { getPoolReserves, getPoolTotalSupply, getPairAddress, calculatePoolShare } from '../../services/liquidityPool';
import { getAllTokens } from '../../config/tokenLists';
import { saveSwapTransaction, updateSwapTransaction } from '../../services/transactionHistory';
import '../css/LiquidityMobile.css';

const LiquidityPositionsList = ({ address, isConnected, chainId }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    const publicClient = usePublicClient();
    const { writeContract } = useWriteContract();
    
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claimingId, setClaimingId] = useState(null);
    const [txHash, setTxHash] = useState(null);
    
    // Transaction receipt
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
        query: {
            enabled: !!txHash,
        },
    });
    
    // LP Token ABI
    const lpTokenAbi = parseAbi([
        'function balanceOf(address account) external view returns (uint256)',
        'function totalSupply() external view returns (uint256)',
        'function token0() external view returns (address)',
        'function token1() external view returns (address)',
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
        'function decimals() external view returns (uint8)',
    ]);
    
    // ERC20 ABI for token info
    const erc20Abi = parseAbi([
        'function symbol() external view returns (string)',
        'function name() external view returns (string)',
        'function decimals() external view returns (uint8)',
    ]);

    // Handle transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash && claimingId) {
            // Update transaction status
            if (finalAddress && chainId) {
                try {
                    updateSwapTransaction(txHash, 'completed', {
                        confirmedAt: new Date().toISOString(),
                    });
                } catch (error) {
                    console.error('Failed to update transaction status:', error);
                }
            }
            
            alert('Fees claimed successfully!');
            setClaimingId(null);
            setTxHash(null);
            // Refresh positions
            fetchPositions();
        }
    }, [isConfirmed, txHash, claimingId, finalAddress, chainId]);

    const handleClaimFees = async (positionId) => {
        try {
            const position = positions.find(p => p.id === positionId);
            if (!position || parseFloat(position.unclaimedFees || '0') <= 0) {
                alert('No fees to claim');
                return;
            }

            if (!finalIsConnected || !publicClient || !chainId) {
                alert('Please connect your wallet');
                return;
            }

            setClaimingId(positionId);
            
            // Note: In Uniswap V2 style pools, fees are accumulated in reserves
            // Some DEXes have separate fee claiming contracts
            // For now, we'll implement a generic approach that can work with different pool types
            
            const lpTokenAddress = position.lpTokenAddress;
            if (!lpTokenAddress) {
                alert('LP token address not found');
                setClaimingId(null);
                return;
            }

            // Try to call claimFees if the pool supports it
            // Some pools have: claimFees(address to) or claim() function
            const poolAbi = parseAbi([
                'function claimFees(address to) external returns (uint256 amount0, uint256 amount1)',
                'function claim() external returns (uint256 amount0, uint256 amount1)',
                'function collect(address to) external returns (uint256 amount0, uint256 amount1)',
            ]);

            const routerAddress = chainConfig.getContractAddress(chainId, 'router');
            const gasSettings = chainConfig.getGasSettings(chainId);
            
            // Try different fee claiming methods
            let txConfig = null;
            
            try {
                // Method 1: claimFees(to)
                txConfig = {
                    address: lpTokenAddress,
                    abi: poolAbi,
                    functionName: 'claimFees',
                    args: [finalAddress],
                    gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                };
            } catch (error) {
                try {
                    // Method 2: claim()
                    txConfig = {
                        address: lpTokenAddress,
                        abi: poolAbi,
                        functionName: 'claim',
                        args: [],
                        gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                    };
                } catch (error2) {
                    try {
                        // Method 3: collect(to)
                        txConfig = {
                            address: lpTokenAddress,
                            abi: poolAbi,
                            functionName: 'collect',
                            args: [finalAddress],
                            gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                        };
                    } catch (error3) {
                        // If no fee claiming method is available, show message
                        // In Uniswap V2, fees are automatically included when removing liquidity
                        alert('This pool does not support separate fee claiming. Fees are automatically included when you remove liquidity.');
                        setClaimingId(null);
                        return;
                    }
                }
            }

            if (txConfig) {
                writeContract(txConfig, {
                    onSuccess: (hash) => {
                        setTxHash(hash);
                        console.log('Fee claiming transaction submitted:', hash);
                        
                        // Save to transaction history
                        if (finalAddress && chainId) {
                            try {
                                saveSwapTransaction({
                                    txHash: hash,
                                    userAddress: finalAddress,
                                    chainId: chainId,
                                    type: 'claimFees',
                                    tokenIn: 'LP',
                                    tokenOut: `${position.tokenA.symbol}/${position.tokenB.symbol}`,
                                    amountIn: '0',
                                    amountOut: position.unclaimedFees || '0',
                                    status: 'pending',
                                    timestamp: Date.now(),
                                });
                            } catch (error) {
                                console.error('Failed to save transaction:', error);
                            }
                        }
                    },
                    onError: (error) => {
                        console.error('Fee claiming failed:', error);
                        // If contract call fails, it might be that fees are included in reserves
                        // Show helpful message
                        if (error.message?.includes('execution reverted') || error.message?.includes('function does not exist')) {
                            alert('This pool does not support separate fee claiming. Fees are automatically included in the pool reserves and will be received when you remove liquidity.');
                        } else {
                            alert('Failed to claim fees: ' + (error.message || 'Unknown error'));
                        }
                        setClaimingId(null);
                    },
                });
            }
        } catch (error) {
            console.error('Error claiming fees:', error);
            alert('Failed to claim fees: ' + (error.message || 'Unknown error'));
            setClaimingId(null);
        }
    };

    const handleManagePosition = (positionId) => {
        // Navigate to remove liquidity with pre-filled data
        // In production, this would navigate to remove liquidity tab with position data
        console.log('Managing position:', positionId);
        alert('Navigate to remove liquidity with this position');
    };

    const fetchPositions = useCallback(async () => {
        if (!finalIsConnected || !finalAddress || !publicClient || !chainId) {
            setPositions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const factoryAddress = chainConfig.getContractAddress(chainId, 'factory');
            if (!factoryAddress) {
                console.warn('Factory address not found for chain', chainId);
                setPositions([]);
                setLoading(false);
                return;
            }

            // Get all tokens for this chain
            const allTokens = getAllTokens(chainId);
            if (allTokens.length === 0) {
                console.warn('No tokens found for chain', chainId);
                setPositions([]);
                setLoading(false);
                return;
            }

            // Get common token pairs (combinations of popular tokens)
            // Limit to first 10 tokens to avoid too many requests
            const tokensToCheck = allTokens.slice(0, 10);
            const pairs = [];
            
            // Generate pairs (avoid duplicates)
            for (let i = 0; i < tokensToCheck.length; i++) {
                for (let j = i + 1; j < tokensToCheck.length; j++) {
                    pairs.push([tokensToCheck[i], tokensToCheck[j]]);
                }
            }

            // Fetch positions for each pair
            const positionPromises = pairs.map(async ([tokenA, tokenB]) => {
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

                    // Check user balance
                    const [balance, totalSupply, reserves, token0Address, token1Address] = await Promise.all([
                        publicClient.readContract({
                            address: pairAddress,
                            abi: lpTokenAbi,
                            functionName: 'balanceOf',
                            args: [finalAddress],
                        }).catch(() => 0n),
                        publicClient.readContract({
                            address: pairAddress,
                            abi: lpTokenAbi,
                            functionName: 'totalSupply',
                        }).catch(() => null),
                        publicClient.readContract({
                            address: pairAddress,
                            abi: lpTokenAbi,
                            functionName: 'getReserves',
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

                    if (!balance || balance === 0n || !totalSupply || !reserves) {
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
                    const lpDecimals = 18; // LP tokens typically have 18 decimals

                    // Format LP balance
                    const lpBalance = formatUnits(balance, lpDecimals);
                    
                    // Calculate share percentage
                    const sharePercent = calculatePoolShare(balance, totalSupply);

                    // Calculate token amounts
                    const amount0 = (balance * reserve0) / totalSupply;
                    const amount1 = (balance * reserve1) / totalSupply;
                    const token0Amount = formatUnits(amount0, decimals0);
                    const token1Amount = formatUnits(amount1, decimals1);

                    // Calculate USD value
                    const [price0, price1] = await Promise.all([
                        getTokenPrice(token0Info.symbol),
                        getTokenPrice(token1Info.symbol),
                    ]);
                    const usdValue = (parseFloat(token0Amount) * (price0 || 0)) + (parseFloat(token1Amount) * (price1 || 0));

                    // Calculate unclaimed fees (simplified - in Uniswap V2, fees are in reserves)
                    // This is an approximation - actual fees would require tracking reserves over time
                    // For now, we'll show a placeholder or calculate based on pool activity
                    const unclaimedFees = '0'; // Placeholder - would need historical data to calculate accurately

                    return {
                        id: pairAddress.toLowerCase(),
                        lpTokenAddress: pairAddress,
                        tokenPair: `${token0Info.symbol}/${token1Info.symbol}`,
                        lpAmount: parseFloat(lpBalance).toFixed(6),
                        usdValue: usdValue.toFixed(2),
                        sharePercent: sharePercent.toFixed(4),
                        apr: '0', // Would need to calculate from pool fees over time
                        unclaimedFees: unclaimedFees,
                        tokenA: { symbol: token0Info.symbol, amount: parseFloat(token0Amount).toFixed(6), address: token0Address },
                        tokenB: { symbol: token1Info.symbol, amount: parseFloat(token1Amount).toFixed(6), address: token1Address },
                    };
                } catch (error) {
                    console.warn(`Error fetching position for ${tokenA.symbol}/${tokenB.symbol}:`, error);
                    return null;
                }
            });

            const fetchedPositions = await Promise.all(positionPromises);
            const validPositions = fetchedPositions.filter(p => p !== null);
            
            setPositions(validPositions);
        } catch (error) {
            console.error('Error fetching positions:', error);
            setPositions([]);
        } finally {
            setLoading(false);
        }
    }, [finalIsConnected, finalAddress, publicClient, chainId, lpTokenAbi]);

    useEffect(() => {
        fetchPositions();
    }, [fetchPositions]);

    if (!finalIsConnected) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-empty-state">
                    <p>Connect your wallet to view your liquidity positions</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-loading">Loading positions...</div>
            </div>
        );
    }

    if (positions.length === 0) {
        return (
            <div className="liquidity-card">
                <div className="liquidity-empty-state">
                    <p>No liquidity positions found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="liquidity-positions-list">
            {positions.map((position) => (
                <div key={position.id} className="liquidity-position-card">
                    <div className="liquidity-position-header">
                        <div className="liquidity-position-pair">{position.tokenPair}</div>
                        <div className="liquidity-position-value">${position.usdValue}</div>
                    </div>
                    
                    <div className="liquidity-position-details">
                        <div className="liquidity-position-detail-item">
                            <span className="liquidity-position-label">LP Tokens:</span>
                            <span className="liquidity-position-value">{position.lpAmount}</span>
                        </div>
                        <div className="liquidity-position-detail-item">
                            <span className="liquidity-position-label">Share:</span>
                            <span className="liquidity-position-value">{position.sharePercent}%</span>
                        </div>
                        <div className="liquidity-position-detail-item">
                            <span className="liquidity-position-label">APR:</span>
                            <span className="liquidity-position-value">{position.apr}%</span>
                        </div>
                        <div className="liquidity-position-detail-item">
                            <span className="liquidity-position-label">Unclaimed Fees:</span>
                            <span className="liquidity-position-value">{position.unclaimedFees}</span>
                        </div>
                    </div>

                    <div className="liquidity-position-actions">
                        <button 
                            className="liquidity-position-button liquidity-position-button-secondary"
                            onClick={() => handleClaimFees(position.id)}
                            disabled={parseFloat(position.unclaimedFees || '0') <= 0 || claimingId === position.id || isConfirming}
                        >
                            {claimingId === position.id ? (isConfirming ? 'Confirming...' : 'Claiming...') : 'Claim Fees'}
                        </button>
                        {txHash && claimingId === position.id && (
                            <div style={{ marginTop: '8px', fontSize: '11px', color: '#7A7A7A', textAlign: 'center' }}>
                                TX: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                            </div>
                        )}
                        <button 
                            className="liquidity-position-button liquidity-position-button-primary"
                            onClick={() => handleManagePosition(position.id)}
                        >
                            Manage
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LiquidityPositionsList;

