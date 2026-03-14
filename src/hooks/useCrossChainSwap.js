import { useState, useCallback, useEffect, useRef } from 'react';
import { initiateSwap, getStatus } from '../services/bridgeApi';
import {
  initiateCrossChainViaBackend,
  isCrossChainViaBackendAvailable,
  getSwapStatusFromBackend,
  getDepositFromBackend,
} from '../services/crossChainSwapApi';

const POLL_INTERVAL_MS = 2000; // Poll every 2s so "Swap completed" updates soon after LayerSwap finishes
const TERMINAL_STATUSES = ['completed', 'failed', 'expired', 'refunded', 'refund_pending'];

function toRawEthereumAddress(addr) {
  if (!addr || typeof addr !== 'string') return '';
  const s = addr.trim();
  const m = s.match(/^eip155:\d+:((0x[a-fA-F0-9]{40}))$/);
  return m ? m[1] : s;
}

/**
 * Cross-chain swap: uses mangoServices POST /api/v1/swap/cross-chain when VITE_MANGO_SERVICES_URL is set.
 * When initiated via backend: always poll backend (swapId). Backend has LayerSwap API access; frontend does not.
 */
export function useCrossChainSwap() {
  const [swapId, setSwapId] = useState(null);
  const [status, setStatus] = useState(null);
  const [depositActions, setDepositActions] = useState([]);
  const [rangoTx, setRangoTx] = useState(null);
  const [provider, setProvider] = useState(null);
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
      try {
        const result = await getStatus(swapId);
        setStatus(result.status);
        setError(null); // Clear any previous error so UI reflects current state
        if (result.depositActions?.length) setDepositActions(result.depositActions);
        if (TERMINAL_STATUSES.includes(result.status)) stopPolling();
      } catch (err) {
        setError(err?.message || 'Failed to fetch status');
      }
    };

    const pollBackend = async () => {
      try {
        const result = await getSwapStatusFromBackend(swapId);
        setStatus(result.status);
        setError(null); // Clear any previous error so UI updates after deposit
        if (result.depositActions?.length) {
          const normalized = result.depositActions.map((a) => ({
            ...a,
            to_address: toRawEthereumAddress(a.to_address) || a.to_address,
          }));
          setDepositActions(normalized);
        } else if (result.status === 'user_transfer_pending') {
          // Fallback: fetch deposit from dedicated endpoint (e.g. Rango swap where status didn't include depositActions)
          try {
            const dep = await getDepositFromBackend(swapId);
            if (dep.depositActions?.length) {
              const normalized = dep.depositActions.map((a) => ({
                ...a,
                to_address: toRawEthereumAddress(a.to_address) || a.to_address,
              }));
              setDepositActions(normalized);
            }
          } catch {
            // ignore
          }
        }
        if (result.rangoTx != null) setRangoTx(result.rangoTx);
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
        setProvider(result.provider || null);
        // Build depositActions: use amountToDeposit (after fees) so LayerSwap order matches
        const depositAmount = result.amountToDeposit ?? params.amountIn;
        const rawDepositAddress = result.depositAddress ? toRawEthereumAddress(result.depositAddress) : null;
        const acts = result.depositActions?.length
          ? result.depositActions.map((a) => ({ ...a, to_address: toRawEthereumAddress(a.to_address) || a.to_address }))
          : rawDepositAddress
            ? [{ to_address: rawDepositAddress, amount: depositAmount, token: { symbol: params.tokenIn?.symbol || 'ETH' } }]
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
      setProvider(result.provider || null);
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
    setProvider(null);
    setError(null);
  }, [stopPolling]);

  return {
    startSwap,
    swapId,
    status,
    depositActions,
    rangoTx,
    provider,
    error,
    isLoading,
    reset,
  };
}
