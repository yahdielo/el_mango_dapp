import { useState, useEffect, useRef } from 'react';
import { getQuote } from '../services/quoteApi';

const DEBOUNCE_MS = 300;

/**
 * @param {{ chainId: number, tokenIn: object, tokenOut: object, amountIn: string, skip?: boolean }}
 * @returns {{ amountOut: string, loading: boolean, error: string|null, estimated?: boolean, priceIn?: number, priceOut?: number }}
 */
export function useQuote({ chainId, tokenIn, tokenOut, amountIn, skip }) {
  const [amountOut, setAmountOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estimated, setEstimated] = useState(false);
  const [priceIn, setPriceIn] = useState(0);
  const [priceOut, setPriceOut] = useState(0);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const amt = amountIn?.trim?.() ?? '';
    if (skip || !amt || parseFloat(amt) <= 0 || !tokenIn?.symbol || !tokenOut?.symbol || !chainId) {
      setAmountOut('');
      setLoading(false);
      setError(null);
      setPriceIn(0);
      setPriceOut(0);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const id = ++requestIdRef.current;

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getQuote({
          chainId,
          tokenIn,
          tokenOut,
          amountIn: amt,
        });
        if (id === requestIdRef.current) {
          setAmountOut(result.amountOut ?? '');
          setEstimated(result.estimated ?? false);
          setPriceIn(result.priceIn ?? 0);
          setPriceOut(result.priceOut ?? 0);
        }
      } catch (err) {
        if (id === requestIdRef.current) {
          setError(err.message || 'Quote failed');
          setAmountOut('');
        }
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [chainId, tokenIn, tokenOut, amountIn, skip]);

  return { amountOut, loading, error, estimated, priceIn, priceOut };
}
