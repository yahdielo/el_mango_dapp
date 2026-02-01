import React from 'react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import './css/SwapMobile.css';

const MobileSwapHeader = ({ onMenuClick, title = 'Swap' }) => {
    // Hooks must be called unconditionally at the top level
    const account = useAccount();
    const address = account?.address || null;
    const { open } = useAppKit();
    
    const formatAddress = (addr) => {
        if (!addr) return 'Connect';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };
    
    const getInitial = (addr) => {
        if (!addr) return 'C';
        return addr[0].toUpperCase();
    };

    const handleWalletClick = () => {
        if (address) {
            // If connected, could show disconnect or account menu
            // For now, just open the wallet modal to show account info
            open();
        } else {
            // If not connected, open wallet connection modal
            open();
        }
    };

    return (
        <div className="mobile-swap-header">
            {/* Row 1: Top bar */}
            <div className="mobile-swap-header-top">
                <div className="mobile-swap-wallet-address" onClick={handleWalletClick}>
                    <div className="mobile-swap-wallet-icon">
                        {address ? getInitial(address) : 'C'}
                    </div>
                    <span className="mobile-swap-wallet-text">
                        {address ? formatAddress(address) : 'Connect'}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: '4px' }}>
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
                <div className="mobile-swap-menu-icon" onClick={onMenuClick}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill="#FFFFFF"/>
                        <circle cx="8" cy="8" r="6" stroke="#000000" strokeWidth="1" fill="none"/>
                        <path d="M8 4V8L10 10" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
            {/* Row 2: Title */}
            <div className="mobile-swap-header-title">{title}</div>
        </div>
    );
};

export default MobileSwapHeader;

