import { useState, useCallback, useEffect, useRef } from 'react';
import { initiateSwap, getStatus } from '../services/bridgeApi';
import { initiateCrossChainViaBackend, isCrossChainViaBackendAvailable } from '../services/crossChainSwapApi';

const POLL_INTERVAL_MS = 4000;
const TERMINAL_STATUSES = ['completed', 'failed', 'expired', 'refunded', 'refund_pending'];

/**
 * Cross-chain swap: uses mangoServices POST /api/v1/swap/cross-chain when VITE_MANGO_SERVICES_URL is set
 * (so backend runs referral sync and reward scheduling); otherwise LayerSwap directly.
 * Status and deposit_actions are always polled from LayerSwap (by layerswapOrderId).
 */
export function useCrossChainSwap() {
  const [swapId, setSwapId] = useState(null);
  const [status, setStatus] = useState(null);
  const [depositActions, setDepositActions] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!swapId) {
      stopPolling();
      return;
    }

    const poll = async () => {
      try {
        const result = await getStatus(swapId);
        setStatus(result.status);
        if (result.depositActions?.length) {
          setDepositActions(result.depositActions);
        }
        if (TERMINAL_STATUSES.includes(result.status)) {
          stopPolling();
        }
      } catch (err) {
        setError(err?.message || 'Failed to fetch status');
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return stopPolling;
  }, [swapId, stopPolling]);

  const startSwap = useCallback(async (params) => {
    setError(null);
    setIsLoading(true);
    try {
      if (isCrossChainViaBackendAvailable()) {
        const result = await initiateCrossChainViaBackend({
          sourceChainId: params.sourceChainId,
          destChainId: params.destChainId,
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          recipient: params.recipient,
          referrer: params.referrer,
        });
        setSwapId(result.layerswapOrderId);
        setStatus(result.status || 'user_transfer_pending');
        setDepositActions([]);
        return { swapId: result.layerswapOrderId, depositActions: [] };
      }
      const result = await initiateSwap(params);
      setSwapId(result.swapId);
      setStatus('user_transfer_pending');
      setDepositActions(result.depositActions || []);
      return result;
    } catch (err) {
      setError(err?.message || 'Failed to initiate swap');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setSwapId(null);
    setStatus(null);
    setDepositActions([]);
    setError(null);
  }, [stopPolling]);

  return {
    startSwap,
    swapId,
    status,
    depositActions,
    error,
    isLoading,
    reset,
  };
}
