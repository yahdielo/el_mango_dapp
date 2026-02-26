import { useState, useRef, useCallback, useEffect } from 'react';

const THRESHOLD = 0.9; // 90% to confirm

export default function SlideToSwapButton({ onSwap, onConnect, disabled, isPending, useClickOnly = false, connectLabel, swapLabel, emptyStateLabel }) {
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const isConnectOnly = onConnect && !onSwap;
  const isEmptyState = Boolean(emptyStateLabel && !onSwap && !onConnect);
  const isDisabled = disabled || isPending || isEmptyState;

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
    if (isEmptyState) return;
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
    if (isEmptyState) return;
    if (isConnectOnly) return;
    if (useClickOnly) return;
    setIsDragging(true);
    handleMove(e.clientX ?? e.touches?.[0]?.clientX ?? 0);
  };

  const showSlideUI = !isConnectOnly && !useClickOnly && !isEmptyState;

  return (
    <div className="relative h-[56px]" ref={containerRef}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        className="absolute inset-0 rounded-2xl flex items-center justify-between pl-1 pr-4 gap-3 focus:outline-none focus:ring-2 focus:ring-[#3CF902] focus:ring-offset-2 focus:ring-offset-[#111111] disabled:opacity-60 disabled:cursor-not-allowed w-full overflow-hidden select-none touch-none min-h-[48px] shadow-lg transition-opacity"
        style={{
          background: 'linear-gradient(135deg, #3CF902 0%, #2dd102 100%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 4px 14px rgba(60, 249, 2, 0.25)',
        }}
        aria-label={isEmptyState ? emptyStateLabel : isConnectOnly ? 'Connect wallet' : isPending ? 'In progress' : (swapLabel || 'Slide to swap')}
      >
        {/* Progress fill */}
        {showSlideUI && (
          <div
            className="absolute inset-y-0 left-0 rounded-l-[15px] transition-[width] duration-75 ease-out pointer-events-none"
            style={{
              width: `${progress * 100}%`,
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          />
        )}

        {/* Handle - slides with progress or static on left */}
        <div
          className="absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-none"
          style={
            showSlideUI
              ? { left: `calc(8px + (100% - 56px) * ${progress})` }
              : { left: '8px' }
          }
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: '#111',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Center label */}
        <span className="relative z-10 flex-1 flex items-center justify-center gap-2 text-base font-bold min-w-0" style={{ color: '#111' }}>
          {isPending && (
            <svg className="animate-spin h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          <span className="truncate">
            {isPending
              ? 'Confirming...'
              : isEmptyState
                ? emptyStateLabel
                : isConnectOnly
                  ? (connectLabel || 'Connect Wallet')
                  : useClickOnly
                    ? 'Swap'
                    : (swapLabel || 'Slide to Continue')}
          </span>
        </span>

        {/* Single arrow hint on the right */}
        {showSlideUI && !isPending && (
          <div className="relative z-10 flex-shrink-0 flex items-center gap-0.5 text-[#111]" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </button>
    </div>
  );
}
