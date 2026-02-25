import { useState, useCallback, useEffect, useRef } from 'react';
import { initiateSwap, getStatus } from '../services/bridgeApi';

const POLL_INTERVAL_MS = 4000;
const TERMINAL_STATUSES = ['completed', 'failed', 'expired', 'refunded', 'refund_pending'];

/**
 * Cross-chain swap flow via LayerSwap
 * @returns {{ startSwap: Function, status: string, swapId: string|null, depositActions: Array, error: string|null, isLoading: boolean, reset: Function }}
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

  const startSwap = useCallback(
    async (params) => {
      setError(null);
      setIsLoading(true);
      try {
        const result = await initiateSwap(params);
        setSwapId(result.swapId);
        setStatus('user_transfer_pending');
        setDepositActions(result.depositActions || []);
        if (result.depositUrl) {
          window.open(result.depositUrl, '_blank');
        }
        return result;
      } catch (err) {
        setError(err?.message || 'Failed to initiate swap');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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
