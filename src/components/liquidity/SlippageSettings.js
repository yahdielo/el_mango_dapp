import React from 'react';
import '../css/LiquidityMobile.css';

const SlippageSettings = ({ slippage, onSlippageChange }) => {
    const presetValues = ['0.1', '0.5', '1.0'];

    return (
        <div className="liquidity-slippage">
            <div className="liquidity-slippage-label">Slippage Tolerance</div>
            <div className="liquidity-slippage-controls">
                <div className="liquidity-slippage-presets">
                    {presetValues.map((value) => (
                        <button
                            key={value}
                            className={`liquidity-slippage-preset ${slippage === value ? 'active' : ''}`}
                            onClick={() => onSlippageChange(value)}
                        >
                            {value}%
                        </button>
                    ))}
                </div>
                <div className="liquidity-slippage-input-wrapper">
                    <input
                        type="text"
                        className="liquidity-slippage-input"
                        value={slippage}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 50) {
                                onSlippageChange(value);
                            }
                        }}
                        placeholder="Custom"
                    />
                    <span className="liquidity-slippage-suffix">%</span>
                </div>
            </div>
        </div>
    );
};

export default SlippageSettings;

