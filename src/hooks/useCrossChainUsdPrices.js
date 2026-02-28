import { useState, useEffect } from 'react';
import { getTokenPriceUsd, getTokenPriceUsdFromBackend } from '../services/quoteApi';

/**
 * Fetch USD prices for source and destination tokens on cross-chain page.
 * 1) Uses mangoServices quote API (WETH->USDC etc.).
 * 2) If 0, tries backend GET /api/v1/price?symbol=ETH (no in-browser CoinGecko = no CORS/429).
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
        if (inUsd === 0) inUsd = await getTokenPriceUsdFromBackend(tokenIn?.symbol);
        if (outUsd === 0) outUsd = await getTokenPriceUsdFromBackend(tokenOut?.symbol);
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
