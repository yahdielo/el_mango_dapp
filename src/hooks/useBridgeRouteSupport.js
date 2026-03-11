import { useState, useEffect } from 'react';
import { isRouteSupported } from '../services/bridgeApi';
import {
  isRouteSupportedViaBackend,
  isCrossChainViaBackendAvailable,
} from '../services/crossChainSwapApi';

/**
 * Check if cross-chain route is supported by bridge.
 * Prefer backend GET /api/v1/swap/routes when backend is configured, so the UI
 * matches the actual provider (Rango / auto / LayerSwap). Otherwise fall back to
 * LayerSwap /sources for route support.
 * @param {number} sourceChainId
 * @param {number} destChainId
 * @param {Object} tokenIn
 * @param {Object} tokenOut
 * @returns {{ isSupported: boolean|null, loading: boolean }}
 */
export function useBridgeRouteSupport(sourceChainId, destChainId, tokenIn, tokenOut) {
  const [isSupported, setIsSupported] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      !sourceChainId ||
      !destChainId ||
      sourceChainId === destChainId ||
      !tokenIn?.symbol ||
      !tokenOut?.symbol
    ) {
      setIsSupported(null);
      return;
    }

    const useBackend = isCrossChainViaBackendAvailable();
    const checkFn = useBackend ? isRouteSupportedViaBackend : isRouteSupported;

    setLoading(true);
    checkFn(sourceChainId, destChainId, tokenIn, tokenOut)
      .then(setIsSupported)
      .catch(() => setIsSupported(null))
      .finally(() => setLoading(false));
  }, [sourceChainId, destChainId, tokenIn?.symbol, tokenOut?.symbol]);

  return { isSupported, loading };
}
