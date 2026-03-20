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

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        if (!useBackend) {
          const ls = await isRouteSupported(sourceChainId, destChainId, tokenIn, tokenOut);
          if (!cancelled) setIsSupported(ls);
          return;
        }

        // Backend is preferred, but if it returns "false" due to an upstream/proxy issue,
        // we want to fall back to LayerSwap so the UI doesn't incorrectly say "not supported".
        const backendRes = await isRouteSupportedViaBackend(sourceChainId, destChainId, tokenIn, tokenOut);
        if (backendRes !== false) {
          if (!cancelled) setIsSupported(backendRes);
          return;
        }

        // Fallback: confirm with LayerSwap when backend says unsupported.
        const ls = await isRouteSupported(sourceChainId, destChainId, tokenIn, tokenOut);
        if (!cancelled) setIsSupported(ls);
      } catch {
        if (!cancelled) setIsSupported(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceChainId, destChainId, tokenIn?.symbol, tokenOut?.symbol]);

  return { isSupported, loading };
}
