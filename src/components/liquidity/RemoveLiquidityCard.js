import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, parseAbi, zeroAddress } from 'viem';
import chainConfig from '../../services/chainConfig';
import { getTokenPrice, getTokenPrices, calculatePriceImpact } from '../../services/priceOracle';
import { getPoolReserves, getPoolTotalSupply } from '../../services/liquidityPool';
import { saveSwapTransaction, updateSwapTransaction } from '../../services/transactionHistory';
import '../css/LiquidityMobile.css';

const RemoveLiquidityCard = ({ address, isConnected, chainId }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    
    const [lpTokenBalance, setLpTokenBalance] = useState('0');
    const [removePercentage, setRemovePercentage] = useState(null);
    const [tokensToReceive, setTokensToReceive] = useState({ tokenA: '0', tokenB: '0' });
    const [priceImpact, setPriceImpact] = useState(0);
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [tokenPair, setTokenPair] = useState({ tokenA: null, tokenB: null });
    const [usdValue, setUsdValue] = useState(null);
    const [lpTokenAddress, setLpTokenAddress] = useState(null);
    const [poolReserves, setPoolReserves] = useState(null);
    const [poolTotalSupply, setPoolTotalSupply] = useState(null);
    const [slippage, setSlippage] = useState(() => {
        return localStorage.getItem('slippageTolerance') || '0.5';
    });
    
    const routerAddress = chainConfig.getContractAddress(chainId, 'router');
    const gasSettings = chainConfig.getGasSettings(chainId);
    const chainInfo = chainConfig.getChain(chainId);
    const publicClient = usePublicClient();
    const { writeContract } = useWriteContract();
    
    // LP Token ABI
    const lpTokenAbi = parseAbi([
        'function balanceOf(address account) external view returns (uint256)',
        'function totalSupply() external view returns (uint256)',
        'function token0() external view returns (address)',
        'function token1() external view returns (address)',
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
        'function decimals() external view returns (uint8)',
    ]);
    
    // Transaction receipt
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
        query: {
            enabled: !!txHash,
        },
    });

    // Handle transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash) {
            // Update transaction status in history
            if (finalAddress && chainId) {
                try {
                    updateSwapTransaction(txHash, 'completed', {
                        confirmedAt: new Date().toISOString(),
                    });
                } catch (error) {
                    console.error('Failed to update transaction status:', error);
                }
            }
            
            alert('Liquidity removed successfully!');
            setRemovePercentage(null);
            setTokensToReceive({ tokenA: '0', tokenB: '0' });
            setPriceImpact(0);
            setTxHash(null);
            setLoading(false);
            // Refresh LP balance
            fetchLpBalance();
        }
    }, [isConfirmed, txHash, finalAddress, chainId, fetchLpBalance]);

    // Fetch LP token balance and token pair
    const fetchLpBalance = useCallback(async () => {
        if (!finalIsConnected || !finalAddress || !publicClient || !chainId) {
            setLpTokenBalance('0');
            setTokenPair({ tokenA: null, tokenB: null });
            return;
        }

        try {
            // For now, we need to know the LP token address
            // In production, this would come from:
            // 1. User's LP positions list
            // 2. Pool selection
            // 3. Factory contract query
            // For this implementation, we'll try to detect from common pools or let user select
            
            // TODO: This should be replaced with actual LP token address selection
            // For now, we'll check if there's a way to get user's LP positions
            // This is a placeholder - in production, LP token address should come from user selection
            
            // If we have an LP token address, fetch balance and pair info
            if (lpTokenAddress) {
                const [balance, totalSupply, token0, token1, reserves] = await Promise.all([
                    publicClient.readContract({
                        address: lpTokenAddress,
                        abi: lpTokenAbi,
                        functionName: 'balanceOf',
                        args: [finalAddress],
                    }).catch(() => 0n),
                    publicClient.readContract({
                        address: lpTokenAddress,
                        abi: lpTokenAbi,
                        functionName: 'totalSupply',
                    }).catch(() => null),
                    publicClient.readContract({
                        address: lpTokenAddress,
                        abi: lpTokenAbi,
                        functionName: 'token0',
                    }).catch(() => null),
                    publicClient.readContract({
                        address: lpTokenAddress,
                        abi: lpTokenAbi,
                        functionName: 'token1',
                    }).catch(() => null),
                    publicClient.readContract({
                        address: lpTokenAddress,
                        abi: lpTokenAbi,
                        functionName: 'getReserves',
                    }).catch(() => null),
                ]);

                // Format balance
                const decimals = 18; // LP tokens typically have 18 decimals
                const balanceFormatted = formatUnits(balance || 0n, decimals);
                setLpTokenBalance(balanceFormatted);
                
                // Store pool data
                if (totalSupply) setPoolTotalSupply(totalSupply);
                if (reserves) {
                    setPoolReserves({
                        reserve0: reserves[0],
                        reserve1: reserves[1],
                    });
                }

                // Get token info (symbols, decimals)
                if (token0 && token1) {
                    // Fetch token info from chain config or token list
                    const tokenList = chainInfo?.tokens || [];
                    const tokenAInfo = tokenList.find(t => 
                        t.address?.toLowerCase() === token0.toLowerCase()
                    ) || { symbol: 'Token A', address: token0, decimals: 18 };
                    const tokenBInfo = tokenList.find(t => 
                        t.address?.toLowerCase() === token1.toLowerCase()
                    ) || { symbol: 'Token B', address: token1, decimals: 18 };

                    setTokenPair({
                        tokenA: tokenAInfo,
                        tokenB: tokenBInfo,
                    });
                }
            } else {
                // No LP token selected - show zero balance
                setLpTokenBalance('0');
                setTokenPair({ tokenA: null, tokenB: null });
            }
        } catch (error) {
            console.error('Error fetching LP balance:', error);
            setLpTokenBalance('0');
            setTokenPair({ tokenA: null, tokenB: null });
        }
    }, [finalIsConnected, finalAddress, publicClient, chainId, lpTokenAddress, chainInfo, lpTokenAbi]);

    useEffect(() => {
        fetchLpBalance();
    }, [fetchLpBalance]);

    const handlePercentageClick = useCallback(async (percentage) => {
        if (!lpTokenBalance || parseFloat(lpTokenBalance) <= 0) {
            alert('No LP tokens available');
            return;
        }

        setRemovePercentage(percentage);
        const lpAmount = parseFloat(lpTokenBalance) * percentage / 100;
        
        // Calculate tokens to receive based on LP amount and pool reserves
        if (poolReserves && poolTotalSupply && tokenPair.tokenA && tokenPair.tokenB) {
            try {
                const lpAmountWei = parseUnits(lpAmount.toFixed(18), 18);
                const totalSupply = poolTotalSupply;
                
                // Calculate proportional amounts
                // amountA = (lpAmount / totalSupply) * reserveA
                // amountB = (lpAmount / totalSupply) * reserveB
                const decimalsA = tokenPair.tokenA.decimals || 18;
                const decimalsB = tokenPair.tokenB.decimals || 18;
                
                // Determine which reserve corresponds to which token
                // This depends on token0/token1 order in the pool
                const reserveA = poolReserves.reserve0; // Simplified - should check token0/token1
                const reserveB = poolReserves.reserve1;
                
                const amountAWei = (lpAmountWei * reserveA) / totalSupply;
                const amountBWei = (lpAmountWei * reserveB) / totalSupply;
                
                const tokenAValue = formatUnits(amountAWei, decimalsA);
                const tokenBValue = formatUnits(amountBWei, decimalsB);
                
                setTokensToReceive({
                    tokenA: parseFloat(tokenAValue).toFixed(6),
                    tokenB: parseFloat(tokenBValue).toFixed(6),
                });
                
                // Calculate USD value using price oracle
                try {
                    const [priceA, priceB] = await Promise.all([
                        getTokenPrice(tokenPair.tokenA.symbol),
                        getTokenPrice(tokenPair.tokenB.symbol),
                    ]);
                    
                    const usdA = parseFloat(tokenAValue) * (priceA || 0);
                    const usdB = parseFloat(tokenBValue) * (priceB || 0);
                    setUsdValue(usdA + usdB);
                } catch (error) {
                    console.warn('Failed to fetch prices:', error);
                    // Fallback to mock prices
                    const mockPriceA = tokenPair.tokenA.symbol === 'BNB' ? 500 : tokenPair.tokenA.symbol === 'ETH' ? 3000 : 1;
                    const mockPriceB = tokenPair.tokenB.symbol === 'BNB' ? 500 : tokenPair.tokenB.symbol === 'ETH' ? 3000 : 1;
                    setUsdValue(parseFloat(tokenAValue) * mockPriceA + parseFloat(tokenBValue) * mockPriceB);
                }
                
                // Calculate price impact
                // Price impact = (lpAmount / totalSupply) * 100
                const impactPercent = (lpAmount / parseFloat(formatUnits(totalSupply, 18))) * 100;
                setPriceImpact(impactPercent);
            } catch (error) {
                console.error('Error calculating token amounts:', error);
                // Fallback to simple calculation
                const tokenAValue = (lpAmount * 0.5).toFixed(6);
                const tokenBValue = (lpAmount * 0.5).toFixed(6);
                setTokensToReceive({ tokenA: tokenAValue, tokenB: tokenBValue });
                setPriceImpact(percentage > 50 ? 10 : percentage > 25 ? 5 : 1);
            }
        } else {
            // Fallback if pool data not available
            const tokenAValue = (lpAmount * 0.5).toFixed(6);
            const tokenBValue = (lpAmount * 0.5).toFixed(6);
            setTokensToReceive({ tokenA: tokenAValue, tokenB: tokenBValue });
            setPriceImpact(percentage > 50 ? 10 : percentage > 25 ? 5 : 1);
        }
    }, [lpTokenBalance, poolReserves, poolTotalSupply, tokenPair]);

    const handleAmountChange = useCallback(async (value) => {
        if (/^\d*\.?\d*$/.test(value)) {
            const amount = parseFloat(value) || 0;
            if (amount > parseFloat(lpTokenBalance)) {
                alert(`Amount exceeds LP balance: ${lpTokenBalance}`);
                return;
            }
            const percentage = (amount / parseFloat(lpTokenBalance)) * 100;
            setRemovePercentage(percentage);
            
            // Calculate tokens to receive
            if (poolReserves && poolTotalSupply && tokenPair.tokenA && tokenPair.tokenB) {
                try {
                    const lpAmountWei = parseUnits(amount.toFixed(18), 18);
                    const decimalsA = tokenPair.tokenA.decimals || 18;
                    const decimalsB = tokenPair.tokenB.decimals || 18;
                    
                    const amountAWei = (lpAmountWei * poolReserves.reserve0) / poolTotalSupply;
                    const amountBWei = (lpAmountWei * poolReserves.reserve1) / poolTotalSupply;
                    
                    const tokenAValue = formatUnits(amountAWei, decimalsA);
                    const tokenBValue = formatUnits(amountBWei, decimalsB);
                    
                    setTokensToReceive({
                        tokenA: parseFloat(tokenAValue).toFixed(6),
                        tokenB: parseFloat(tokenBValue).toFixed(6),
                    });
                    
                    // Calculate price impact
                    const impactPercent = (amount / parseFloat(formatUnits(poolTotalSupply, 18))) * 100;
                    setPriceImpact(impactPercent);
                } catch (error) {
                    console.error('Error calculating amounts:', error);
                    setTokensToReceive({
                        tokenA: (amount * 0.5).toFixed(6),
                        tokenB: (amount * 0.5).toFixed(6),
                    });
                    setPriceImpact(percentage > 50 ? 10 : 1);
                }
            } else {
                setTokensToReceive({
                    tokenA: (amount * 0.5).toFixed(6),
                    tokenB: (amount * 0.5).toFixed(6),
                });
                setPriceImpact(percentage > 50 ? 10 : 1);
            }
        }
    }, [lpTokenBalance, poolReserves, poolTotalSupply, tokenPair]);

    const handleRemoveLiquidity = async () => {
        if (!finalIsConnected || !removePercentage || !lpTokenBalance) {
            return;
        }

        const lpAmount = parseFloat(lpTokenBalance) * removePercentage / 100;
        if (lpAmount <= 0) {
            alert('Invalid LP token amount');
            return;
        }

        // Confirm if high price impact
        if (priceImpact >= 3) {
            const confirmed = window.confirm(
                `⚠️ High price impact detected (${priceImpact.toFixed(2)}%). Removing this amount may result in significant slippage. Continue?`
            );
            if (!confirmed) return;
        }

        setLoading(true);
        try {
            if (!tokenPair.tokenA || !tokenPair.tokenB || !lpTokenAddress) {
                alert('Please select an LP token position to remove liquidity from');
                setLoading(false);
                return;
            }

            // Calculate minimum amounts with slippage
            const slippagePercent = parseFloat(slippage) / 100;
            const minTokenA = parseFloat(tokensToReceive.tokenA) * (1 - slippagePercent);
            const minTokenB = parseFloat(tokensToReceive.tokenB) * (1 - slippagePercent);

            // Prepare amounts in wei
            const decimalsA = tokenPair.tokenA.decimals || 18;
            const decimalsB = tokenPair.tokenB.decimals || 18;
            const lpAmountWei = parseUnits(lpAmount.toFixed(18), 18);
            const minTokenAWei = parseUnits(minTokenA.toFixed(decimalsA), decimalsA);
            const minTokenBWei = parseUnits(minTokenB.toFixed(decimalsB), decimalsB);

            // Prepare token addresses
            const tokenAAddress = tokenPair.tokenA.address;
            const tokenBAddress = tokenPair.tokenB.address;
            
            // Check if one of the tokens is native (ETH/BNB)
            const isNativeA = tokenAAddress === zeroAddress || 
                             tokenPair.tokenA.symbol === 'ETH' || 
                             tokenPair.tokenA.symbol === 'BNB';
            const isNativeB = tokenBAddress === zeroAddress || 
                             tokenPair.tokenB.symbol === 'ETH' || 
                             tokenPair.tokenB.symbol === 'BNB';

            // Router ABI - Standard Uniswap V2 style removeLiquidity
            const routerAbi = parseAbi([
                'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
                'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)',
            ]);

            // Calculate deadline (20 minutes from now)
            const deadline = Math.floor(Date.now() / 1000) + (20 * 60);

            console.log('Removing liquidity:', {
                lpTokenAddress,
                lpAmount: lpAmount.toFixed(6),
                percentage: removePercentage,
                tokensToReceive,
                minTokenA: minTokenA.toFixed(6),
                minTokenB: minTokenB.toFixed(6),
                isNativeA,
                isNativeB,
            });

            if (isNativeA || isNativeB) {
                // Remove liquidity with native token (ETH/BNB)
                const token = isNativeA ? tokenBAddress : tokenAAddress;
                const amountTokenMin = isNativeA ? minTokenBWei : minTokenAWei;
                const amountETHMin = isNativeA ? minTokenAWei : minTokenBWei;

                writeContract(
                    {
                        address: routerAddress,
                        abi: routerAbi,
                        functionName: 'removeLiquidityETH',
                        args: [token, lpAmountWei, amountTokenMin, amountETHMin, finalAddress, BigInt(deadline)],
                        gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                    },
                    {
                        onSuccess: (hash) => {
                            setTxHash(hash);
                            console.log('Remove liquidity transaction submitted:', hash);
                            
                            // Save to transaction history
                            if (finalAddress && chainId) {
                                try {
                                    saveSwapTransaction({
                                        txHash: hash,
                                        userAddress: finalAddress,
                                        chainId: chainId,
                                        type: 'removeLiquidity',
                                        tokenIn: 'LP',
                                        tokenOut: `${tokenPair.tokenA.symbol}/${tokenPair.tokenB.symbol}`,
                                        amountIn: lpAmount.toString(),
                                        amountOut: `${tokensToReceive.tokenA}/${tokensToReceive.tokenB}`,
                                        status: 'pending',
                                        timestamp: Date.now(),
                                    });
                                } catch (error) {
                                    console.error('Failed to save transaction:', error);
                                }
                            }
                        },
                        onError: (error) => {
                            console.error('Remove liquidity failed:', error);
                            alert('Failed to remove liquidity: ' + (error.message || 'Unknown error'));
                            setLoading(false);
                        },
                    }
                );
            } else {
                // Remove liquidity with two ERC20 tokens
                writeContract(
                    {
                        address: routerAddress,
                        abi: routerAbi,
                        functionName: 'removeLiquidity',
                        args: [
                            tokenAAddress,
                            tokenBAddress,
                            lpAmountWei,
                            minTokenAWei,
                            minTokenBWei,
                            finalAddress,
                            BigInt(deadline),
                        ],
                        gas: gasSettings?.gasLimit ? BigInt(gasSettings.gasLimit) : undefined,
                    },
                    {
                        onSuccess: (hash) => {
                            setTxHash(hash);
                            console.log('Remove liquidity transaction submitted:', hash);
                            
                            // Save to transaction history
                            if (finalAddress && chainId) {
                                try {
                                    saveSwapTransaction({
                                        txHash: hash,
                                        userAddress: finalAddress,
                                        chainId: chainId,
                                        type: 'removeLiquidity',
                                        tokenIn: 'LP',
                                        tokenOut: `${tokenPair.tokenA.symbol}/${tokenPair.tokenB.symbol}`,
                                        amountIn: lpAmount.toString(),
                                        amountOut: `${tokensToReceive.tokenA}/${tokensToReceive.tokenB}`,
                                        status: 'pending',
                                        timestamp: Date.now(),
                                    });
                                } catch (error) {
                                    console.error('Failed to save transaction:', error);
                                }
                            }
                        },
                        onError: (error) => {
                            console.error('Remove liquidity failed:', error);
                            alert('Failed to remove liquidity: ' + (error.message || 'Unknown error'));
                            setLoading(false);
                        },
                    }
                );
            }
        } catch (error) {
            console.error('Error removing liquidity:', error);
            alert('Failed to remove liquidity: ' + (error.message || 'Unknown error'));
            setLoading(false);
        }
    };

    return (
        <div className="liquidity-card">
            <div className="liquidity-card-header">
                <h2 className="liquidity-card-title">Remove Liquidity</h2>
            </div>

            <div className="liquidity-card-content">
                {/* LP Token Selection Note */}
                {!lpTokenAddress && (
                    <div className="liquidity-warning" style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255, 152, 0, 0.1)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '13px', color: '#FF9800', marginBottom: '8px' }}>
                            ⚠️ No LP Token Selected
                        </div>
                        <div style={{ fontSize: '12px', color: '#7A7A7A' }}>
                            To remove liquidity, please select an LP position from the "Positions" tab, or enter an LP token address below.
                        </div>
                        <input
                            type="text"
                            placeholder="Enter LP token address (0x...)"
                            value={lpTokenAddress || ''}
                            onChange={(e) => setLpTokenAddress(e.target.value)}
                            style={{
                                width: '100%',
                                marginTop: '8px',
                                padding: '8px',
                                borderRadius: '8px',
                                border: '1px solid #E9E9E9',
                                fontSize: '12px',
                            }}
                        />
                    </div>
                )}

                {/* LP Token Balance */}
                <div className="liquidity-token-section">
                    <div className="liquidity-token-label">LP Token Balance</div>
                    <div className="liquidity-lp-balance">
                        {lpTokenBalance} LP
                        {tokenPair.tokenA && tokenPair.tokenB && (
                            <div style={{ fontSize: '11px', color: '#7A7A7A', marginTop: '4px' }}>
                                {tokenPair.tokenA.symbol}/{tokenPair.tokenB.symbol}
                            </div>
                        )}
                    </div>
                </div>

                {/* Amount Input */}
                <div className="liquidity-token-section">
                    <div className="liquidity-token-label">Amount to Remove</div>
                    <div className="liquidity-amount-wrapper">
                        <input
                            type="text"
                            className="liquidity-amount-input"
                            placeholder="0.0"
                            value={removePercentage ? (parseFloat(lpTokenBalance) * removePercentage / 100).toFixed(6) : ''}
                            onChange={(e) => handleAmountChange(e.target.value)}
                        />
                    </div>
                </div>

                {/* Percentage Buttons */}
                <div className="liquidity-percentage-buttons">
                    <button 
                        className="liquidity-percentage-button"
                        onClick={() => handlePercentageClick(25)}
                    >
                        25%
                    </button>
                    <button 
                        className="liquidity-percentage-button"
                        onClick={() => handlePercentageClick(50)}
                    >
                        50%
                    </button>
                    <button 
                        className="liquidity-percentage-button"
                        onClick={() => handlePercentageClick(75)}
                    >
                        75%
                    </button>
                    <button 
                        className="liquidity-percentage-button"
                        onClick={() => handlePercentageClick(100)}
                    >
                        Max
                    </button>
                </div>

                {/* Tokens to Receive */}
                {removePercentage && (
                    <div className="liquidity-tokens-receive">
                        <div className="liquidity-tokens-receive-title">You will receive:</div>
                        <div className="liquidity-tokens-receive-item">
                            <span>{tokenPair.tokenA?.symbol || 'Token A'}:</span>
                            <span className="liquidity-tokens-receive-value">{tokensToReceive.tokenA}</span>
                        </div>
                        <div className="liquidity-tokens-receive-item">
                            <span>{tokenPair.tokenB?.symbol || 'Token B'}:</span>
                            <span className="liquidity-tokens-receive-value">{tokensToReceive.tokenB}</span>
                        </div>
                        {usdValue && (
                            <div className="liquidity-tokens-receive-item" style={{ marginTop: '4px', fontSize: '14px', color: '#7A7A7A' }}>
                                <span>Total Value:</span>
                                <span className="liquidity-tokens-receive-value">≈ ${usdValue.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Price Impact Warning */}
                {priceImpact > 0 && (
                    <div className="liquidity-warning" style={{
                        background: priceImpact >= 3 ? 'rgba(244, 67, 54, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                        color: priceImpact >= 3 ? '#F44336' : '#FF9800',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        marginTop: '8px'
                    }}>
                        ⚠️ Price Impact: {priceImpact.toFixed(2)}%
                        {priceImpact >= 3 && (
                            <div style={{ marginTop: '4px', fontSize: '11px' }}>
                                High price impact. Consider removing liquidity in smaller amounts.
                            </div>
                        )}
                    </div>
                )}

                {/* Remove Liquidity Button */}
                <div className="liquidity-button-container">
                    {finalIsConnected ? (
                        <>
                            <button
                                className="liquidity-button liquidity-button-primary"
                                onClick={handleRemoveLiquidity}
                                disabled={!removePercentage || loading || isConfirming}
                            >
                                {loading || isConfirming ? (isConfirming ? 'Confirming...' : 'Removing...') : 'Remove Liquidity'}
                            </button>
                            {txHash && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#7A7A7A', textAlign: 'center' }}>
                                    Transaction: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="liquidity-connect-message">
                            Connect your wallet to remove liquidity
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RemoveLiquidityCard;

