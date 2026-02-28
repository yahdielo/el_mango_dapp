import { useState, useEffect } from 'react';
import { getTokenPriceUsd, getTokenPriceUsdFallback } from '../services/quoteApi';

/**
 * Fetch USD prices for source and destination tokens on cross-chain page.
 * Uses mangoServices (api.mangoswap.io) quote API; falls back to CoinGecko when 0.
 */
export function useCrossChainUsdPrices({ isCrossChain, sourceChainId, destChainId, tokenIn, tokenOut }) {
  const [priceInUsd, setPriceInUsd] = useState(0);
  const [priceOutUsd, setPriceOutUsd] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isCrossChain || !tokenIn?.symbol || !tokenOut?.symbol) {
      setPriceInUsd(0);
      setPriceOutUsd(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        let inUsd = await getTokenPriceUsd({ chainId: sourceChainId, token: tokenIn });
        let outUsd = await getTokenPriceUsd({ chainId: destChainId, token: tokenOut });
        if (inUsd === 0) inUsd = await getTokenPriceUsdFallback(tokenIn?.symbol);
        if (outUsd === 0) outUsd = await getTokenPriceUsdFallback(tokenOut?.symbol);
        if (!cancelled) {
          setPriceInUsd(inUsd);
          setPriceOutUsd(outUsd);
        }
      } catch {
        if (!cancelled) {
          setPriceInUsd(0);
          setPriceOutUsd(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isCrossChain, sourceChainId, destChainId, tokenIn?.symbol, tokenOut?.symbol, tokenIn?.address, tokenOut?.address]);

  return { priceInUsd, priceOutUsd, loading };
}
