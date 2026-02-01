import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './css/SwapMobile.css';

const BottomNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { id: 'stake', icon: 'circle-dot', label: 'Stake', path: '/stake' },
        { id: 'portfolio', icon: 'diamonds', label: 'Portfolio', path: '/portfolio' },
        { id: 'swap', icon: 'swap-arrows', label: 'Swap', path: '/' },
        { id: 'liquidity', icon: 'bar-chart', label: 'Liquidity', path: '/liquidity' },
        { id: 'settings', icon: 'gear', label: 'Settings', path: '/settings' },
    ];

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    const getIcon = (iconType, isActive) => {
        switch (iconType) {
            case 'circle-dot':
                // Stake: White solid circle
                return (
                    <svg width={isActive ? "30" : "26"} height={isActive ? "30" : "26"} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#FFFFFF"/>
                    </svg>
                );
            case 'diamonds':
                // Portfolio: Four white circles in square formation touching each other, with black square at center
                return (
                    <svg width={isActive ? "30" : "26"} height={isActive ? "30" : "26"} viewBox="0 0 24 24" fill="none">
                        <circle cx="10" cy="10" r="4" fill="#FFFFFF"/>
                        <circle cx="14" cy="10" r="4" fill="#FFFFFF"/>
                        <circle cx="10" cy="14" r="4" fill="#FFFFFF"/>
                        <circle cx="14" cy="14" r="4" fill="#FFFFFF"/>
                        <rect x="11" y="11" width="2" height="2" fill="#000000"/>
                    </svg>
                );
            case 'swap-arrows':
                // Swap: White circle with subtle shadow, two thick diagonal black arrows
                // One from bottom-left to top-right, one from top-right to bottom-left
                return (
                    <svg width={isActive ? "30" : "26"} height={isActive ? "30" : "26"} viewBox="0 0 24 24" fill="none">
                        <defs>
                            <filter id="swapShadow">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
                                <feOffset dx="0" dy="1" result="offsetblur"/>
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.3"/>
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <circle cx="12" cy="12" r="10" fill="#FFFFFF" filter={isActive ? "url(#swapShadow)" : "none"}/>
                        {/* Arrow from bottom-left to top-right */}
                        <path d="M9 15L15 9M15 9L13.5 8.5M15 9L14.5 10.5" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        {/* Arrow from top-right to bottom-left */}
                        <path d="M15 9L9 15M9 15L10.5 15.5M9 15L9.5 13.5" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                );
            case 'bar-chart':
                // Liquidity: Three vertical bars - left medium, center tallest, right medium
                return (
                    <svg width={isActive ? "30" : "26"} height={isActive ? "30" : "26"} viewBox="0 0 24 24" fill="none">
                        <rect x="5" y="12" width="3" height="8" fill="#FFFFFF"/>
                        <rect x="10.5" y="8" width="3" height="12" fill="#FFFFFF"/>
                        <rect x="16" y="12" width="3" height="8" fill="#FFFFFF"/>
                    </svg>
                );
            case 'gear':
                // Settings: White circle with black circle inside (target/record button style)
                return (
                    <svg width={isActive ? "30" : "26"} height={isActive ? "30" : "26"} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#FFFFFF"/>
                        <circle cx="12" cy="12" r="5" fill="#000000"/>
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="mobile-swap-bottom-nav">
            {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                    <div
                        key={item.id}
                        className={`mobile-swap-nav-item ${active ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <div className="mobile-swap-nav-icon">
                            {getIcon(item.icon, active)}
                        </div>
                        <span className="mobile-swap-nav-label">{item.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default BottomNavigation;

