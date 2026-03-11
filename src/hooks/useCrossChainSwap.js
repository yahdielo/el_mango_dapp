import { useState, useCallback, useEffect, useRef } from 'react';
import { initiateSwap, getStatus } from '../services/bridgeApi';
import {
  initiateCrossChainViaBackend,
  isCrossChainViaBackendAvailable,
  getSwapStatusFromBackend,
} from '../services/crossChainSwapApi';

const POLL_INTERVAL_MS = 4000;
const TERMINAL_STATUSES = ['completed', 'failed', 'expired', 'refunded', 'refund_pending'];

/**
 * Cross-chain swap: uses mangoServices POST /api/v1/swap/cross-chain when VITE_MANGO_SERVICES_URL is set.
 * When initiated via backend: always poll backend (swapId). Backend has LayerSwap API access; frontend does not.
 */
export function useCrossChainSwap() {
  const [swapId, setSwapId] = useState(null);
  const [status, setStatus] = useState(null);
  const [depositActions, setDepositActions] = useState([]);
  const [rangoTx, setRangoTx] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollRef = useRef(null);
  const useBackendStatusRef = useRef(false);

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

    const pollLayerSwap = async () => {
      const result = await getStatus(swapId);
      setStatus(result.status);
      if (result.depositActions?.length) setDepositActions(result.depositActions);
      if (TERMINAL_STATUSES.includes(result.status)) stopPolling();
    };

    const pollBackend = async () => {
      try {
        const result = await getSwapStatusFromBackend(swapId);
        setStatus(result.status);
        if (result.depositActions?.length) setDepositActions(result.depositActions);
        if (TERMINAL_STATUSES.includes(result.status)) stopPolling();
      } catch (err) {
        setError(err?.message || 'Failed to fetch status');
      }
    };

    const poll = useBackendStatusRef.current ? pollBackend : pollLayerSwap;

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
        useBackendStatusRef.current = true; // Always poll backend when initiated via backend
        setSwapId(result.swapId);
        setStatus(result.status || 'user_transfer_pending');
        // Build depositActions from depositAddress so user gets "Send" button + wallet popup
        const acts = result.depositActions?.length
          ? result.depositActions
          : result.depositAddress
          ? [{ to_address: result.depositAddress, amount: params.amountIn, token: { symbol: params.tokenIn?.symbol || 'ETH' } }]
          : [];
        setDepositActions(acts);
        setRangoTx(result.rangoTx ?? null);
        return { swapId: result.swapId, depositActions: acts, rangoTx: result.rangoTx };
      }
      useBackendStatusRef.current = false;
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
    setRangoTx(null);
    setError(null);
  }, [stopPolling]);

  return {
    startSwap,
    swapId,
    status,
    depositActions,
    rangoTx,
    error,
    isLoading,
    reset,
  };
}
