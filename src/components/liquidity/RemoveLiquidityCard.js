import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, parseAbi } from 'viem';
import chainConfig from '../../services/chainConfig';
import '../css/LiquidityMobile.css';

const RemoveLiquidityCard = ({ address, isConnected, chainId }) => {
    const { address: accountAddress, isConnected: accountConnected } = useAccount();
    const finalAddress = address || accountAddress;
    const finalIsConnected = isConnected || accountConnected;
    
    const [lpTokenBalance, setLpTokenBalance] = useState('0');
    const [removePercentage, setRemovePercentage] = useState(null);
    const [tokensToReceive, setTokensToReceive] = useState({ tokenA: '0', tokenB: '0' });
    const [priceImpact, setPriceImpact] = useState(null);
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [tokenPair, setTokenPair] = useState({ tokenA: null, tokenB: null });
    const [usdValue, setUsdValue] = useState(null);
    
    const routerAddress = chainConfig.getContractAddress(chainId, 'router');
    const gasSettings = chainConfig.getGasSettings(chainId);
    const { writeContract } = useWriteContract();
    
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
            alert('Liquidity removed successfully!');
            setRemovePercentage(null);
            setTokensToReceive({ tokenA: '0', tokenB: '0' });
            setPriceImpact(null);
            setTxHash(null);
            setLoading(false);
            // Refresh LP balance
            fetchLpBalance();
        }
    }, [isConfirmed, txHash]);

    // Fetch LP token balance
    const fetchLpBalance = async () => {
        if (!finalIsConnected || !finalAddress) {
            setLpTokenBalance('0');
            return;
        }

        try {
            // TODO: Fetch actual LP token balance from contract
            // This would involve:
            // 1. Getting LP token contract address for the pool
            // 2. Calling balanceOf(address) on the LP token contract
            // 3. Converting from wei to readable format
            
            // For now, use mock data with better structure
            // In production, replace with actual contract call
            await new Promise(resolve => setTimeout(resolve, 500));
            const mockBalance = '100.5';
            setLpTokenBalance(mockBalance);
            
            // Mock token pair - in production, fetch from pool contract
            setTokenPair({
                tokenA: { symbol: 'BNB', amount: '50.25' },
                tokenB: { symbol: 'MANGO', amount: '10000' }
            });
        } catch (error) {
            console.error('Error fetching LP balance:', error);
            setLpTokenBalance('0');
        }
    };

    useEffect(() => {
        fetchLpBalance();
    }, [finalIsConnected, finalAddress, chainId]);

    const handlePercentageClick = (percentage) => {
        if (!lpTokenBalance || parseFloat(lpTokenBalance) <= 0) {
            alert('No LP tokens available');
            return;
        }

        setRemovePercentage(percentage);
        const lpAmount = parseFloat(lpTokenBalance) * percentage / 100;
        
        // Calculate tokens to receive based on LP amount
        // In production, this would query the pool contract to get actual ratios
        // For now, use proportional calculation
        // TODO: Fetch actual token amounts from pool contract
        const totalLp = parseFloat(lpTokenBalance);
        const ratio = lpAmount / totalLp;
        
        // Mock calculation - in production, fetch from contract
        const tokenAValue = (lpAmount * 0.5).toFixed(6);
        const tokenBValue = (lpAmount * 0.5).toFixed(6);
        
        setTokensToReceive({
            tokenA: tokenAValue,
            tokenB: tokenBValue
        });
        
        // Calculate USD value (mock)
        const mockPriceA = tokenPair.tokenA?.symbol === 'BNB' ? 500 : tokenPair.tokenA?.symbol === 'ETH' ? 3000 : 1;
        const mockPriceB = tokenPair.tokenB?.symbol === 'BNB' ? 500 : tokenPair.tokenB?.symbol === 'ETH' ? 3000 : 1;
        const totalUsd = parseFloat(tokenAValue) * mockPriceA + parseFloat(tokenBValue) * mockPriceB;
        setUsdValue(totalUsd);
        
        // Calculate price impact (simplified)
        // High impact if removing > 50% of position
        setPriceImpact(percentage > 50 ? 'High' : percentage > 25 ? 'Medium' : 'Low');
    };

    const handleAmountChange = (value) => {
        if (/^\d*\.?\d*$/.test(value)) {
            const amount = parseFloat(value) || 0;
            const percentage = (amount / parseFloat(lpTokenBalance)) * 100;
            setRemovePercentage(percentage);
            // Mock calculation
            setTokensToReceive({
                tokenA: (amount * 0.5).toFixed(6),
                tokenB: (amount * 0.5).toFixed(6)
            });
            setPriceImpact(percentage > 50 ? 'High' : 'Low');
        }
    };

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
        if (priceImpact === 'High') {
            const confirmed = window.confirm(
                '⚠️ High price impact detected. Removing this amount may result in significant slippage. Continue?'
            );
            if (!confirmed) return;
        }

        setLoading(true);
        try {
            // Calculate minimum amounts with slippage
            const slippagePercent = 0.5 / 100; // Default 0.5% slippage
            const minTokenA = parseFloat(tokensToReceive.tokenA) * (1 - slippagePercent);
            const minTokenB = parseFloat(tokensToReceive.tokenB) * (1 - slippagePercent);

            console.log('Removing liquidity:', {
                lpAmount: lpAmount.toFixed(6),
                percentage: removePercentage,
                tokensToReceive,
                minTokenA: minTokenA.toFixed(6),
                minTokenB: minTokenB.toFixed(6)
            });

            // TODO: Implement actual contract interaction when router supports removeLiquidity
            // For now, simulate the transaction
            // In production, this would be:
            // const routerAbi = parseAbi(['function removeLiquidity(...)']);
            // writeContract({
            //     address: routerAddress,
            //     abi: routerAbi,
            //     functionName: 'removeLiquidity',
            //     args: [tokenA.address, tokenB.address, lpAmount, minTokenA, minTokenB, ...],
            // });

            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // In production, this would be set from the actual transaction hash
            const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            setTxHash(mockTxHash);
            
            // The useEffect will handle the success message when transaction is confirmed
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
                {/* LP Token Balance */}
                <div className="liquidity-token-section">
                    <div className="liquidity-token-label">LP Token Balance</div>
                    <div className="liquidity-lp-balance">
                        {lpTokenBalance} LP
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
                {priceImpact === 'High' && (
                    <div className="liquidity-warning">
                        ⚠️ High price impact. Consider removing liquidity in smaller amounts.
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

