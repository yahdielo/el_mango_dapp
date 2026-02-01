import React from 'react';
import './css/SwapMobile.css';

const MobileTokenSelector = ({ token, onClick, balance, showMax = false, onMaxClick }) => {
    const getTokenIconColor = (symbol) => {
        const colors = {
            'BNB': '#F3BA2F',
            'ETH': '#627EEA',
            'MANGO': '#FFD700',
            'USDC': '#2775CA',
            'USDT': '#26A17B',
        };
        return colors[symbol?.toUpperCase()] || '#666666';
    };

    const getTokenIcon = (symbol) => {
        const sym = symbol?.toUpperCase();
        if (sym === 'MANGO') {
            return '🥭';
        }
        if (sym === 'BNB') {
            // Return diamond symbol for BNB (white diamond on yellow background)
            return '◆';
        }
        if (sym === 'ETH') {
            return 'Ξ';
        }
        return symbol?.charAt(0)?.toUpperCase() || 'S';
    };

    const isEmpty = !token || token.empty;
    const tokenSymbol = isEmpty ? null : (token?.symbol || null);
    const iconColor = isEmpty ? '#666666' : getTokenIconColor(tokenSymbol);
    const icon = getTokenIcon(tokenSymbol);

    return (
        <div className="mobile-swap-token-selector" onClick={onClick}>
            <div 
                className="mobile-swap-token-icon"
                style={{ 
                    backgroundColor: isEmpty ? '#666666' : iconColor,
                    color: isEmpty ? '#CCCCCC' : '#FFFFFF'
                }}
            >
                {icon}
            </div>
            {!isEmpty && tokenSymbol && (
                <>
                    <span className="mobile-swap-token-symbol">{tokenSymbol}</span>
                    <svg 
                        className="mobile-swap-token-arrow"
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none"
                    >
                        <path 
                            d="M4 6L8 10L12 6" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round"
                        />
                    </svg>
                </>
            )}
            {isEmpty && (
                <>
                    <span className="mobile-swap-token-symbol" style={{ color: '#999999' }}>Select</span>
                    <svg 
                        className="mobile-swap-token-arrow"
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none"
                    >
                        <path 
                            d="M4 6L8 10L12 6" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round"
                        />
                    </svg>
                </>
            )}
        </div>
    );
};

export default MobileTokenSelector;

