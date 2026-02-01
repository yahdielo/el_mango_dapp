import React from 'react';
import '../css/LiquidityMobile.css';

const PriceRatioDisplay = ({ tokenA, tokenB, ratio }) => {
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
        </div>
    );
};

export default PriceRatioDisplay;

