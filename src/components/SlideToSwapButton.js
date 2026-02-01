import React, { useState, useRef, useEffect } from 'react';
import './css/SwapMobile.css';

const SlideToSwapButton = ({ 
    onSwap, 
    disabled = false,
    loading = false,
    token0,
    token1,
    amount,
    isConnected = false
}) => {
    const [sliderProgress, setSliderProgress] = useState(0);
    const [isSliding, setIsSliding] = useState(false);
    const buttonRef = useRef(null);
    const startXRef = useRef(0);
    const currentXRef = useRef(0);

    const canSwap = isConnected && !disabled && !loading && token0 && token1 && amount && parseFloat(amount) > 0;

    const handleMouseDown = (e) => {
        if (!canSwap) return;
        setIsSliding(true);
        startXRef.current = e.clientX || e.touches?.[0]?.clientX;
        currentXRef.current = startXRef.current;
    };

    const handleMouseMove = (e) => {
        if (!isSliding || !canSwap) return;
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        if (!clientX) return;
        
        currentXRef.current = clientX;
        const buttonRect = buttonRef.current?.getBoundingClientRect();
        if (!buttonRect) return;

        const deltaX = currentXRef.current - startXRef.current;
        const buttonWidth = buttonRect.width;
        const progress = Math.max(0, Math.min(100, (deltaX / buttonWidth) * 100));
        
        setSliderProgress(progress);

        if (progress >= 95) {
            handleSwapComplete();
        }
    };

    const handleMouseUp = () => {
        if (!isSliding) return;
        
        if (sliderProgress >= 95) {
            handleSwapComplete();
        } else {
            // Reset if not completed
            setSliderProgress(0);
        }
        setIsSliding(false);
    };

    const handleSwapComplete = () => {
        setSliderProgress(100);
        setTimeout(() => {
            if (onSwap) {
                onSwap();
            }
            // Reset after swap
            setTimeout(() => {
                setSliderProgress(0);
            }, 500);
        }, 100);
    };

    useEffect(() => {
        if (isSliding) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleMouseMove);
            document.addEventListener('touchend', handleMouseUp);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleMouseMove);
                document.removeEventListener('touchend', handleMouseUp);
            };
        }
    }, [isSliding, handleMouseMove, handleMouseUp]);

    // Always show "Slide to Swap" text
    const buttonText = loading ? 'Processing...' : 'Slide to Swap';
    const isDisabled = !isConnected || !canSwap || loading;

    return (
        <div className="mobile-swap-button-container">
            <button
                ref={buttonRef}
                className={`mobile-swap-button ${isSliding ? 'sliding' : ''}`}
                disabled={isDisabled}
                onMouseDown={!isConnected ? undefined : handleMouseDown}
                onTouchStart={!isConnected ? undefined : handleMouseDown}
                style={{
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'grab'
                }}
            >
                <div className="mobile-swap-button-left-icon">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path 
                            d="M4.5 3L7.5 6L4.5 9" 
                            stroke="#FFFFFF" 
                            strokeWidth="2" 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <span 
                    className="mobile-swap-button-text"
                    style={{ 
                        color: '#000000',
                        opacity: 0.7
                    }}
                >
                    {buttonText}
                </span>
                <div className="mobile-swap-button-right-icons">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'rgba(14, 95, 0, 0.6)' }}>
                        <path d="M3 3L6 6L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'rgba(14, 95, 0, 0.6)' }}>
                        <path d="M3 3L6 6L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'rgba(14, 95, 0, 0.6)' }}>
                        <path d="M3 3L6 6L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div 
                    className="mobile-swap-button-slider"
                    style={{ width: `${sliderProgress}%` }}
                />
            </button>
        </div>
    );
};

export default SlideToSwapButton;

