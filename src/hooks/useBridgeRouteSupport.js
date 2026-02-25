import { useState, useEffect } from 'react';
import { isRouteSupported } from '../services/bridgeApi';

/**
 * Check if cross-chain route is supported by bridge
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

    setLoading(true);
    isRouteSupported(sourceChainId, destChainId, tokenIn, tokenOut)
      .then(setIsSupported)
      .catch(() => setIsSupported(false))
      .finally(() => setLoading(false));
  }, [sourceChainId, destChainId, tokenIn?.symbol, tokenOut?.symbol]);

  return { isSupported, loading };
}
