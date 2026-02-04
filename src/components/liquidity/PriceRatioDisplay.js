import React from 'react';
import '../css/LiquidityMobile.css';

const PriceRatioDisplay = ({ tokenA, tokenB, ratio, priceImpact }) => {
    if (!tokenA || !tokenB || !ratio) return null;

    return (
        <div className="liquidity-price-ratio">
            <div className="liquidity-price-ratio-label">Price Ratio</div>
            <div className="liquidity-price-ratio-value">
                1 {tokenA.symbol} = {ratio.toFixed(6)} {tokenB.symbol}
            </div>
            <div className="liquidity-price-ratio-value">
                1 {tokenB.symbol} = {(1 / ratio).toFixed(6)} {tokenA.symbol}
            </div>
            {priceImpact && priceImpact > 0 && (
                <div className="liquidity-price-impact" style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: priceImpact >= 3 ? 'rgba(244, 67, 54, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: priceImpact >= 3 ? '#F44336' : '#FF9800'
                }}>
                    ⚠️ Price Impact: {priceImpact.toFixed(2)}%
                    {priceImpact >= 3 && (
                        <div style={{ marginTop: '4px', fontSize: '11px' }}>
                            High price impact. Consider splitting your liquidity provision.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PriceRatioDisplay;

