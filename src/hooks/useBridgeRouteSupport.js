import { useState, useEffect } from 'react';
import { isRouteSupported } from '../services/bridgeApi';
import {
  isRouteSupportedViaBackend,
  isCrossChainViaBackendAvailable,
  getRoutesFromBackend,
} from '../services/crossChainSwapApi';
import { isLayerSwapVerifiedCrossAssetCorridor } from '../config/layerswapVerifiedCorridors';

const BRIDGE_PROVIDER = (import.meta.env.VITE_BRIDGE_PROVIDER || 'layerswap').toLowerCase();

/** Match CrossChainPage / bridge probe semantics for same-asset cross-chain. */
function sameAssetSymbolsForProbe(symIn, symOut) {
  const norm = (s) => {
    const x = String(s || '')
      .toUpperCase()
      .trim();
    if (x === 'WETH' || x === 'ETH') return 'ETH';
    if (x === 'WMATIC' || x === 'MATIC' || x === 'POL') return 'POL';
    if (x === 'WBNB' || x === 'BNB') return 'BNB';
    if (x === 'WAVAX' || x === 'AVAX') return 'AVAX';
    if (x === 'USDC.E' || x === 'USDCE') return 'USDC';
    return x;
  };
  const a = norm(symIn);
  const b = norm(symOut);
  return a && b && a === b;
}

/**
 * Check if cross-chain route is supported by bridge.
 * Prefer backend GET /api/v1/swap/routes when backend is configured, so the UI
 * matches the actual provider (Rango / auto / LayerSwap). Otherwise fall back to
 * LayerSwap /sources for route support.
 * @param {number} sourceChainId
 * @param {number} destChainId
 * @param {Object} tokenIn
 * @param {Object} tokenOut
 * @param {string} [amountIn] - optional: when provided, fetches a live quote and returns amountOut
 * @returns {{ isSupported: boolean|null, loading: boolean, amountOut: string|null }}
 */
export function useBridgeRouteSupport(sourceChainId, destChainId, tokenIn, tokenOut, amountIn) {
  const [isSupported, setIsSupported] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amountOut, setAmountOut] = useState(null);

  useEffect(() => {
    if (
      !sourceChainId ||
      !destChainId ||
      sourceChainId === destChainId ||
      !tokenIn?.symbol ||
      !tokenOut?.symbol
    ) {
      setIsSupported(null);
      setAmountOut(null);
      return;
    }

    const useBackend = isCrossChainViaBackendAvailable();

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        if (!useBackend) {
          const ls = await isRouteSupported(sourceChainId, destChainId, tokenIn, tokenOut);
          if (!cancelled) { setIsSupported(ls); setAmountOut(null); }
          return;
        }

        const { routes, amountOut: routeAmountOut } = await getRoutesFromBackend(
          sourceChainId, destChainId, tokenIn, tokenOut,
          amountIn && parseFloat(amountIn) > 0 ? amountIn : undefined,
        );
        const backendRes = Array.isArray(routes) && routes.length > 0;
        if (cancelled) return;

        // If mangoServices returned no routes (empty cache, proxy glitch, transient API) but the pair
        // is same-asset or doc-verified LayerSwap cross-asset, confirm with public LayerSwap /sources
        // so the UI matches LayerSwap execution (Base ETH→Ethereum ETH, etc.).
        if (
          !backendRes &&
          (BRIDGE_PROVIDER === 'layerswap' || BRIDGE_PROVIDER === 'auto') &&
          (sameAssetSymbolsForProbe(tokenIn?.symbol, tokenOut?.symbol) ||
            isLayerSwapVerifiedCrossAssetCorridor(
              sourceChainId,
              destChainId,
              tokenIn?.symbol,
              tokenOut?.symbol,
            ))
        ) {
          try {
            const ls = await isRouteSupported(sourceChainId, destChainId, tokenIn, tokenOut);
            if (!cancelled && ls) {
              setIsSupported(true);
              setAmountOut(null);
              return;
            }
          } catch {
            /* fall through to backendRes */
          }
        }

        if (!cancelled) {
          setIsSupported(backendRes);
          setAmountOut(routeAmountOut ? String(routeAmountOut) : null);
        }
      } catch {
        if (!cancelled) { setIsSupported(null); setAmountOut(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    sourceChainId,
    destChainId,
    tokenIn?.symbol,
    tokenOut?.symbol,
    tokenIn?.address,
    tokenOut?.address,
    tokenIn?.native,
    tokenOut?.native,
    amountIn,
  ]);

  return { isSupported, loading, amountOut };
}
