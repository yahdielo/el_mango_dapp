import React from 'react';
import './css/SwapMobile.css';

const MobileTransactionDetails = ({ fee, feeToken, rate, rateToken, rateUSD }) => {
    return (
        <div className="mobile-swap-transaction-details">
            {fee !== undefined && fee !== null && parseFloat(fee) > 0 && (
                <div className="mobile-swap-fee">
                    Fee: <span>{fee}</span> <span>{feeToken || ''}</span>
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

