import React, { useState } from 'react';
import './css/SwapMobile.css';

const MobileTransactionDetails = ({ 
    fee, 
    feeToken, 
    rate, 
    rateToken, 
    rateUSD,
    feeBreakdown,
    priceImpact,
    slippageWarning
}) => {
    const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
    
    return (
        <div className="mobile-swap-transaction-details">
            {fee !== undefined && fee !== null && parseFloat(fee) > 0 && (
                <div className="mobile-swap-fee">
                    Fee: <span>{fee}</span> <span>{feeToken || ''}</span>
                    {feeBreakdown && feeBreakdown.discount && (
                        <span className="mobile-swap-fee-discount" style={{ color: '#4CAF50', fontSize: '12px', marginLeft: '8px' }}>
                            (Save {feeBreakdown.discount})
                        </span>
                    )}
                    {feeBreakdown && (
                        <button
                            onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#F26E01',
                                fontSize: '11px',
                                cursor: 'pointer',
                                marginLeft: '8px',
                                textDecoration: 'underline'
                            }}
                        >
                            {showFeeBreakdown ? 'Hide' : 'Details'}
                        </button>
                    )}
                </div>
            )}
            
            {showFeeBreakdown && feeBreakdown && (
                <div className="mobile-swap-fee-breakdown" style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: 'rgba(242, 110, 1, 0.1)',
                    borderRadius: '8px',
                    fontSize: '12px'
                }}>
                    <div style={{ marginBottom: '4px' }}>
                        <strong>Tier:</strong> {feeBreakdown.tier}
                        {feeBreakdown.multiplier < 1 && (
                            <span style={{ color: '#4CAF50', marginLeft: '8px' }}>
                                ({((1 - feeBreakdown.multiplier) * 100).toFixed(0)}% discount)
                            </span>
                        )}
                    </div>
                    <div style={{ marginBottom: '2px' }}>Graphics: {feeBreakdown.graphics}</div>
                    <div style={{ marginBottom: '2px' }}>Corporation: {feeBreakdown.corporation}</div>
                    <div>Referral: {feeBreakdown.referral}</div>
                </div>
            )}
            
            {priceImpact > 0 && (
                <div className="mobile-swap-price-impact" style={{
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
                            High price impact. Consider splitting your trade.
                        </div>
                    )}
                </div>
            )}
            
            {slippageWarning && slippageWarning.severity !== 'info' && (
                <div className="mobile-swap-slippage-warning" style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: slippageWarning.severity === 'danger' 
                        ? 'rgba(244, 67, 54, 0.1)' 
                        : 'rgba(255, 152, 0, 0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: slippageWarning.severity === 'danger' ? '#F44336' : '#FF9800'
                }}>
                    ⚠️ {slippageWarning.message}
                </div>
            )}
            
            {rate !== undefined && rate !== null && parseFloat(rate) > 0 && (
                <div className="mobile-swap-rate">
                    1 {rateToken || ''} = {rate} {rateUSD ? `(${rateUSD} USD)` : ''}
                </div>
            )}
        </div>
    );
};

export default MobileTransactionDetails;

