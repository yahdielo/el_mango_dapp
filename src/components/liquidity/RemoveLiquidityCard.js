import React, { useState, useEffect } from 'react';
import SlideToSwapButton from '../SlideToSwapButton';
import '../css/LiquidityMobile.css';

const RemoveLiquidityCard = ({ address, isConnected, chainId }) => {
    const [lpTokenBalance, setLpTokenBalance] = useState('0');
    const [removePercentage, setRemovePercentage] = useState(null);
    const [tokensToReceive, setTokensToReceive] = useState({ tokenA: '0', tokenB: '0' });
    const [priceImpact, setPriceImpact] = useState(null);
    const [loading, setLoading] = useState(false);

    // Mock LP token balance - replace with actual hook
    useEffect(() => {
        if (isConnected && address) {
            // TODO: Fetch actual LP token balance
            setLpTokenBalance('100.5');
        }
    }, [isConnected, address, chainId]);

    const handlePercentageClick = (percentage) => {
        setRemovePercentage(percentage);
        const amount = (parseFloat(lpTokenBalance) * percentage / 100).toFixed(6);
        // Mock calculation - replace with actual API call
        setTokensToReceive({
            tokenA: (parseFloat(amount) * 0.5).toFixed(6),
            tokenB: (parseFloat(amount) * 0.5).toFixed(6)
        });
        setPriceImpact(percentage > 50 ? 'High' : 'Low');
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
        if (!isConnected || !removePercentage || !lpTokenBalance) {
            return;
        }

        setLoading(true);
        try {
            // TODO: Implement actual liquidity removal logic
            console.log('Removing liquidity:', { removePercentage, lpTokenBalance });
            await new Promise(resolve => setTimeout(resolve, 2000));
            alert('Liquidity removed successfully!');
            setRemovePercentage(null);
            setTokensToReceive({ tokenA: '0', tokenB: '0' });
        } catch (error) {
            console.error('Error removing liquidity:', error);
            alert('Failed to remove liquidity: ' + error.message);
        } finally {
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
                            <span>Token A:</span>
                            <span className="liquidity-tokens-receive-value">{tokensToReceive.tokenA}</span>
                        </div>
                        <div className="liquidity-tokens-receive-item">
                            <span>Token B:</span>
                            <span className="liquidity-tokens-receive-value">{tokensToReceive.tokenB}</span>
                        </div>
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
                    {isConnected ? (
                        <button
                            className="liquidity-button liquidity-button-primary"
                            onClick={handleRemoveLiquidity}
                            disabled={!removePercentage || loading}
                        >
                            {loading ? 'Removing...' : 'Remove Liquidity'}
                        </button>
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

