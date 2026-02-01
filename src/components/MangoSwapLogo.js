import React from 'react';
import './css/SwapMobile.css';

const MangoSwapLogo = () => {
    return (
        <div className="mango-swap-logo-container">
            <div className="mango-swap-logo-text">
                <span className="mango-letter">M</span>
                <span className="mango-letter">A</span>
                <span className="mango-letter">N</span>
                <span className="mango-letter">G</span>
                <div className="mango-fruit-o">
                    <svg width="60" height="60" viewBox="0 0 60 60" className="mango-svg">
                        <defs>
                            <linearGradient id="mangoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#FFD700" />
                                <stop offset="50%" stopColor="#FF8C00" />
                                <stop offset="100%" stopColor="#FF4500" />
                            </linearGradient>
                        </defs>
                        {/* Mango fruit body */}
                        <ellipse cx="30" cy="35" rx="20" ry="25" fill="url(#mangoGradient)" stroke="#3FF804" strokeWidth="3"/>
                        {/* Stem */}
                        <line x1="30" y1="8" x2="30" y2="12" stroke="#8B4513" strokeWidth="2" strokeLinecap="round"/>
                        {/* Leaf */}
                        <path d="M30 12 Q35 8 38 12 Q35 16 30 12" fill="#3FF804" stroke="#3FF804" strokeWidth="2"/>
                    </svg>
                </div>
            </div>
            <div className="mango-swap-banner">
                <span className="swap-text">SWAP</span>
            </div>
        </div>
    );
};

export default MangoSwapLogo;

