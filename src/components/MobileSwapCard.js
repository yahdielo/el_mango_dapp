import React from 'react';
import MobileTokenSelector from './MobileTokenSelector';
import './css/SwapMobile.css';

const MobileSwapCard = ({
    label,
    token,
    amount,
    usdValue,
    balance,
    onTokenClick,
    onAmountChange,
    onAmountBlur,
    placeholder,
    readOnly = false,
    showMax = false,
    onMaxClick,
    chainInfo,
    userAddress,
    isUnified = false
}) => {
    const formatBalance = (bal) => {
        if (!bal || parseFloat(bal) === 0) return '0.00e+0';
        const num = parseFloat(bal);
        if (num < 0.0001) return num.toExponential(2);
        return num.toFixed(2);
    };

    const formatAmount = (amt) => {
        if (!amt || amt === '0' || amt === '0.0') return '0';
        const num = parseFloat(amt);
        if (isNaN(num)) return '0';
        if (num < 0.0001) return num.toExponential(4);
        // For very large numbers, show full precision with commas
        if (num >= 1000000) {
            return num.toLocaleString('en-US', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 10,
                useGrouping: true
            });
        }
        // For smaller numbers, show up to 3 decimal places
        return num.toLocaleString('en-US', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 3 
        });
    };

    return (
        <div className="mobile-swap-card">
            <div className="mobile-swap-card-label">
                <span>{label}</span>
                {balance && (
                    <div className="mobile-swap-meta-right">
                        <span className="mobile-swap-mini-wallet">👜</span>
                        <span className="mobile-swap-balance-amt">{formatBalance(balance)}</span>
                        <span className="mobile-swap-balance-token">{token?.symbol || ''}</span>
                        {showMax && onMaxClick && label === "You Pay" && (
                            <button 
                                className="mobile-swap-max-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onMaxClick();
                                }}
                            >
                                Max
                            </button>
                        )}
                    </div>
                )}
            </div>
            <div className="mobile-swap-card-content">
                <MobileTokenSelector
                    token={token}
                    onClick={onTokenClick}
                    balance={balance}
                    showMax={showMax}
                    onMaxClick={onMaxClick}
                />
                <div className="mobile-swap-amount-section">
                    {readOnly ? (
                        <div className="mobile-swap-amount" style={{ color: '#000000', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: '1' }}>
                            {placeholder || formatAmount(amount) || '0'}
                        </div>
                    ) : (
                        <input
                            type="text"
                            className="mobile-swap-amount"
                            value={amount}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d*\.?\d*$/.test(value) || value === '') {
                                    onAmountChange(e);
                                }
                            }}
                            onBlur={onAmountBlur}
                            placeholder="0.0"
                            style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: '1' }}
                        />
                    )}
                    {usdValue !== undefined && usdValue !== null && usdValue > 0 && (
                        <div className="mobile-swap-usd-value">
                            ≈ {usdValue.toLocaleString('en-US', { 
                                style: 'currency', 
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileSwapCard;

