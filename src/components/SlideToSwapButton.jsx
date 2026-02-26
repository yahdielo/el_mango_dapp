import { useState, useRef, useCallback, useEffect } from 'react';

const THRESHOLD = 0.9; // 90% to confirm

export default function SlideToSwapButton({ onSwap, onConnect, disabled, isPending, useClickOnly = false, connectLabel, swapLabel }) {
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const isConnectOnly = onConnect && !onSwap;
  const isDisabled = disabled || isPending;

  const reset = useCallback(() => {
    setProgress(0);
    setIsDragging(false);
  }, []);

  const getProgressFromEvent = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const p = Math.max(0, Math.min(1, x / rect.width));
    return p;
  }, []);

  const handleMove = useCallback(
    (clientX) => {
      if (!isDragging || isConnectOnly || isDisabled) return;
      const p = getProgressFromEvent(clientX);
      setProgress(p);
    },
    [isDragging, isConnectOnly, isDisabled, getProgressFromEvent]
  );

  const handleEnd = useCallback(
    (clientX) => {
      if (!isDragging) return;
      const p = getProgressFromEvent(clientX);
      if (p >= THRESHOLD && onSwap && !isDisabled) {
        onSwap();
      }
      reset();
    },
    [isDragging, onSwap, isDisabled, getProgressFromEvent, reset]
  );

  useEffect(() => {
    const onMouseMove = (e) => handleMove(e.clientX);
    const onMouseUp = (e) => {
      handleEnd(e.clientX);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    if (isDragging) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  useEffect(() => {
    if (!isDragging) return;
    const onTouchMove = (e) => {
      e.preventDefault();
      handleMove(e.touches[0]?.clientX ?? 0);
    };
    const onTouchEnd = (e) => {
      handleEnd(e.changedTouches?.[0]?.clientX ?? 0);
      document.removeEventListener('touchmove', onTouchMove, { passive: false });
      document.removeEventListener('touchend', onTouchEnd);
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  const handleClick = () => {
    if (isConnectOnly) {
      onConnect();
      return;
    }
    if (useClickOnly && onSwap && !isDisabled) {
      onSwap();
      return;
    }
  };

  const handlePointerDown = (e) => {
    if (isDisabled) return;
    if (isConnectOnly) return;
    if (useClickOnly) return;
    setIsDragging(true);
    handleMove(e.clientX ?? e.touches?.[0]?.clientX ?? 0);
  };

  return (
    <div className="relative h-[58px]" ref={containerRef}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        className="absolute inset-0 rounded-[20px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:ring-offset-2 focus:ring-offset-[#111111] disabled:opacity-70 disabled:cursor-not-allowed w-full overflow-hidden select-none touch-none min-h-[44px]"
        style={{ background: '#3CF902', border: '1px solid #FFF306' }}
        aria-label={isConnectOnly ? 'Connect wallet' : isPending ? 'In progress' : (swapLabel || 'Slide to swap')}
      >
        {/* Progress fill */}
        {!isConnectOnly && !useClickOnly && (
          <div
            className="absolute inset-y-0 left-0 rounded-l-[19px] transition-[width] duration-75 ease-out pointer-events-none"
            style={{
              width: `${progress * 100}%`,
              background: 'rgba(255, 243, 6, 0.5)',
            }}
          />
        )}

        {/* Draggable handle - follows cursor when sliding */}
        {!isConnectOnly && !useClickOnly && (
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-none"
            style={{
              left: `calc(${progress * 100}% - 34px)`,
              minWidth: 68,
            }}
          >
            <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
              <ellipse cx="33.5" cy="30" rx="25.5" ry="24" fill="#111111" />
              <path
                d="M24 16L44 30.5L24 45"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Static handle for Connect Wallet (no slide) */}
        {isConnectOnly && (
          <div className="absolute" style={{ left: '-4px', top: '-5px' }}>
            <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
              <ellipse cx="33.5" cy="30" rx="25.5" ry="24" fill="#111111" />
              <path
                d="M24 16L44 30.5L24 45"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        <span className="text-[20px] font-semibold flex items-center justify-center gap-2 relative z-10" style={{ color: '#111111' }}>
          {isPending && (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ color: '#111111' }}
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {isPending
            ? 'Confirming...'
            : isConnectOnly
              ? (connectLabel || 'Connect Wallet')
              : useClickOnly
                ? 'Swap'
                : (swapLabel || 'Slide To Swap')}
        </span>

        <div className="absolute" style={{ right: '44px', top: '15px' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M12.384 4.0824C12.458 4.0059 12.5466 3.94507 12.6445 3.90353C12.7425 3.86199 12.8478 3.84058 12.9542 3.84058C13.0605 3.84058 13.1659 3.86199 13.2638 3.90353C13.3617 3.94507 13.4503 4.0059 13.5243 4.0824L22.5915 13.3902C22.7502 13.5535 22.8389 13.7723 22.8389 14C22.8389 14.2277 22.7502 14.4464 22.5915 14.6097L13.5243 23.9148C13.4503 23.9913 13.3617 24.0521 13.2638 24.0937C13.1659 24.1352 13.0605 24.1566 12.9542 24.1566C12.8478 24.1566 12.7425 24.1352 12.6445 24.0937C12.5466 24.0521 12.458 23.9913 12.384 23.9148C12.2319 23.7586 12.1467 23.5491 12.1467 23.331C12.1467 23.1129 12.2319 22.9035 12.384 22.7472L20.9098 14L12.3868 5.24997C12.2346 5.09374 12.1495 4.88427 12.1495 4.66618C12.1495 4.4481 12.2346 4.23863 12.3868 4.0824M5.38677 4.0824C5.46072 4.0059 5.54931 3.94507 5.64725 3.90353C5.7452 3.86199 5.8505 3.84058 5.95689 3.84058C6.06328 3.84058 6.16859 3.86199 6.26653 3.90353C6.36448 3.94507 6.45306 4.0059 6.52701 4.0824L15.5942 13.3902C15.7529 13.5535 15.8417 13.7723 15.8417 14C15.8417 14.2277 15.7529 14.4464 15.5942 14.6097L6.52428 23.9148C6.45033 23.9913 6.36174 24.0521 6.2638 24.0937C6.16585 24.1352 6.06055 24.1566 5.95416 24.1566C5.84777 24.1566 5.74246 24.1352 5.64452 24.0937C5.54657 24.0521 5.45799 23.9913 5.38404 23.9148C5.23188 23.7586 5.14673 23.5491 5.14673 23.331C5.14673 23.1129 5.23188 22.9035 5.38404 22.7472L13.9098 14L5.38677 5.24997C5.23461 5.09374 5.14946 4.88427 5.14946 4.66618C5.14946 4.4481 5.23461 4.23863 5.38677 4.0824Z"
              fill="#175B02"
            />
          </svg>
        </div>
        <div className="absolute" style={{ right: '28px', top: '15px' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M12.384 4.0824C12.458 4.0059 12.5466 3.94507 12.6445 3.90353C12.7425 3.86199 12.8478 3.84058 12.9542 3.84058C13.0605 3.84058 13.1659 3.86199 13.2638 3.90353C13.3617 3.94507 13.4503 4.0059 13.5243 4.0824L22.5915 13.3902C22.7502 13.5535 22.8389 13.7723 22.8389 14C22.8389 14.2277 22.7502 14.4464 22.5915 14.6097L13.5243 23.9148C13.4503 23.9913 13.3617 24.0521 13.2638 24.0937C13.1659 24.1352 13.0605 24.1566 12.9542 24.1566C12.8478 24.1566 12.7425 24.1352 12.6445 24.0937C12.5466 24.0521 12.458 23.9913 12.384 23.9148C12.2319 23.7586 12.1467 23.5491 12.1467 23.331C12.1467 23.1129 12.2319 22.9035 12.384 22.7472L20.9098 14L12.3868 5.24997C12.2346 5.09374 12.1495 4.88427 12.1495 4.66618C12.1495 4.4481 12.2346 4.23863 12.3868 4.0824M5.38677 4.0824C5.46072 4.0059 5.54931 3.94507 5.64725 3.90353C5.7452 3.86199 5.8505 3.84058 5.95689 3.84058C6.06328 3.84058 6.16859 3.86199 6.26653 3.90353C6.36448 3.94507 6.45306 4.0059 6.52701 4.0824L15.5942 13.3902C15.7529 13.5535 15.8417 13.7723 15.8417 14C15.8417 14.2277 15.7529 14.4464 15.5942 14.6097L6.52428 23.9148C6.45033 23.9913 6.36174 24.0521 6.2638 24.0937C6.16585 24.1352 6.06055 24.1566 5.95416 24.1566C5.84777 24.1566 5.74246 24.1352 5.64452 24.0937C5.54657 24.0521 5.45799 23.9913 5.38404 23.9148C5.23188 23.7586 5.14673 23.5491 5.14673 23.331C5.14673 23.1129 5.23188 22.9035 5.38404 22.7472L13.9098 14L5.38677 5.24997C5.23461 5.09374 5.14946 4.88427 5.14946 4.66618C5.14946 4.4481 5.23461 4.23863 5.38677 4.0824Z"
              fill="black"
            />
          </svg>
        </div>
      </button>
    </div>
  );
}
